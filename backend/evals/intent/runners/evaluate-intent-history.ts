/**
 * Re-run the 170 previously used intent cases and persist a versioned report.
 * This is a historical regression set, not an independent estimate of production accuracy.
 */
import '../../../src/utils/setupProxy';

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { HealthQueryResult, ModelUsage } from '../../../src/services/ai/chatService';
import { clearPendingIntent } from '../../../src/utils/pendingIntentStore';

interface ExpectedFields {
  type?: string;
  valueMin?: number;
  valueMax?: number;
  scheduleTime?: string;
  scheduleType?: string;
  days?: number;
}

interface EvalCase {
  id: string;
  category: string;
  input: string;
  expectedIntent: string;
  expectedFields?: ExpectedFields;
  note?: string;
}

interface SourcedCase extends EvalCase {
  dataset: string;
}

interface EvalResult extends SourcedCase {
  actualIntent: string;
  actualFields: Record<string, unknown>;
  intentPass: boolean;
  fieldsPass: boolean | null;
  actionReady: boolean | null;
  casePass: boolean;
  reason: string;
  routingSource: string;
  requiresClarification: boolean;
  missingSlots: string[];
  confidence: number | null;
  riskLevel: string | null;
  latencyMs: number;
  modelUsage: ModelUsage | null;
  error?: string;
}

const DATASET_FILES = [
  'intent-eval-cases.json',
  'intent-eval-holdout-cases.json',
  'intent-eval-final-cases.json',
] as const;
const EXPECTED_TOTAL = 170;
const REPORT_SCHEMA_VERSION = 1;
const EVAL_ROOT = path.resolve(__dirname, '..');
const DATASET_DIR = path.join(EVAL_ROOT, 'datasets', 'historical');
const EVAL_USER_ID = process.env.EVAL_USER_ID || 'intent-history-regression-user';
const DELAY_MS = Number.parseInt(process.env.EVAL_HISTORY_DELAY_MS || '1500', 10);
const REPORT_DIR = path.join(EVAL_ROOT, 'results', 'intent-history-v1');
const EXECUTABLE_INTENTS = new Set(['record_glucose', 'create_reminder', 'generate_meal_plan', 'emergency_alert']);

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator ? round(numerator / denominator) : null;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return round(sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)], 3);
}

function sha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function git(command: string[]): string | null {
  try {
    return execFileSync('git', command, { cwd: path.resolve(__dirname, '../../../..'), encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function loadCases() {
  const sources = DATASET_FILES.map((file) => {
    const fullPath = path.join(DATASET_DIR, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const cases = JSON.parse(raw) as EvalCase[];
    return { file, count: cases.length, sha256: sha256(raw), cases };
  });
  const cases = sources.flatMap((source) => source.cases.map((item) => ({ ...item, dataset: source.file })));
  if (cases.length !== EXPECTED_TOTAL) {
    throw new Error(`Historical fixture count changed: expected ${EXPECTED_TOTAL}, received ${cases.length}`);
  }
  const uniqueIds = new Set(cases.map((item) => item.id));
  if (uniqueIds.size !== cases.length) throw new Error('Historical fixtures contain duplicate case IDs');
  return { sources, cases };
}

function parseActionData(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === 'number') return { value: data };
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof data === 'object' ? data as Record<string, unknown> : {};
}

function validateFields(actual: Record<string, unknown>, expected?: ExpectedFields): { pass: boolean | null; reason: string } {
  if (!expected) return { pass: null, reason: 'no_expected_fields' };
  if (expected.type && actual.type !== expected.type) return { pass: false, reason: `type:${String(actual.type)}!=${expected.type}` };
  if (expected.scheduleTime && actual.scheduleTime !== expected.scheduleTime) return { pass: false, reason: `scheduleTime:${String(actual.scheduleTime)}!=${expected.scheduleTime}` };
  if (expected.scheduleType && actual.scheduleType !== expected.scheduleType) return { pass: false, reason: `scheduleType:${String(actual.scheduleType)}!=${expected.scheduleType}` };
  if (expected.days !== undefined && Number(actual.days) !== expected.days) return { pass: false, reason: `days:${String(actual.days)}!=${expected.days}` };
  if (expected.valueMin !== undefined || expected.valueMax !== undefined) {
    const value = Number(actual.value);
    if (!Number.isFinite(value)) return { pass: false, reason: 'value:missing' };
    if (expected.valueMin !== undefined && value < expected.valueMin) return { pass: false, reason: `value:${value}<${expected.valueMin}` };
    if (expected.valueMax !== undefined && value > expected.valueMax) return { pass: false, reason: `value:${value}>${expected.valueMax}` };
  }
  return { pass: true, reason: 'fields_match' };
}

function normalizeActualIntent(result: HealthQueryResult): string {
  return result.intent || result.action?.type || 'general_advice';
}

async function evaluateCase(item: SourcedCase, healthChat: (message: string, userId: string) => Promise<HealthQueryResult>): Promise<EvalResult> {
  clearPendingIntent(EVAL_USER_ID);
  const start = performance.now();
  try {
    const response = await healthChat(item.input, EVAL_USER_ID);
    const latencyMs = round(performance.now() - start, 3);
    const actualIntent = normalizeActualIntent(response);
    const actualFields = parseActionData(response.action?.data);
    const intentPass = actualIntent === item.expectedIntent;
    const fieldCheck = validateFields(actualFields, item.expectedFields);
    const expectsAction = EXECUTABLE_INTENTS.has(item.expectedIntent);
    const actionReady = expectsAction ? response.action?.type === item.expectedIntent : null;
    const casePass = intentPass && fieldCheck.pass !== false && actionReady !== false;
    const reasons = [
      intentPass ? 'intent_match' : `intent:${actualIntent}!=${item.expectedIntent}`,
      fieldCheck.reason,
      actionReady === false ? 'action_not_ready' : null,
      response.requiresClarification ? `clarification:${(response.missingSlots || []).join(',')}` : null,
    ].filter(Boolean);
    const risk = response.risk as { level?: string } | undefined;
    return {
      ...item,
      actualIntent,
      actualFields,
      intentPass,
      fieldsPass: fieldCheck.pass,
      actionReady,
      casePass,
      reason: reasons.join(';'),
      routingSource: response.routingSource || 'unknown',
      requiresClarification: response.requiresClarification === true,
      missingSlots: response.missingSlots || [],
      confidence: typeof response.confidence === 'number' ? response.confidence : null,
      riskLevel: risk?.level || null,
      latencyMs,
      modelUsage: response.modelUsage || null,
    };
  } catch (error) {
    const latencyMs = round(performance.now() - start, 3);
    return {
      ...item,
      actualIntent: 'error',
      actualFields: {},
      intentPass: false,
      fieldsPass: item.expectedFields ? false : null,
      actionReady: EXECUTABLE_INTENTS.has(item.expectedIntent) ? false : null,
      casePass: false,
      reason: 'evaluation_error',
      routingSource: 'error',
      requiresClarification: false,
      missingSlots: [],
      confidence: null,
      riskLevel: null,
      latencyMs,
      modelUsage: (error as Error & { modelUsage?: ModelUsage }).modelUsage || null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function aggregateCounts(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function aggregateLatency(results: EvalResult[]) {
  const values = results.map((item) => item.latencyMs);
  return {
    averageMs: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 3) : null,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    p99Ms: percentile(values, 0.99),
    maxMs: values.length ? round(Math.max(...values), 3) : null,
    over8SecondsCount: values.filter((value) => value > 8000).length,
  };
}

function aggregateQuality(results: EvalResult[]) {
  const labels = [...new Set(results.flatMap((item) => [item.expectedIntent, item.actualIntent]))].sort();
  const perIntent = Object.fromEntries(labels.map((label) => {
    const tp = results.filter((item) => item.expectedIntent === label && item.actualIntent === label).length;
    const fp = results.filter((item) => item.expectedIntent !== label && item.actualIntent === label).length;
    const fn = results.filter((item) => item.expectedIntent === label && item.actualIntent !== label).length;
    const precision = rate(tp, tp + fp) ?? 0;
    const recall = rate(tp, tp + fn) ?? 0;
    return [label, {
      support: results.filter((item) => item.expectedIntent === label).length,
      tp, fp, fn, precision, recall,
      f1: precision + recall ? round((2 * precision * recall) / (precision + recall)) : 0,
    }];
  }));
  const expectedFieldCases = results.filter((item) => item.expectedFields);
  const expectedActionCases = results.filter((item) => EXECUTABLE_INTENTS.has(item.expectedIntent));
  const emergencyCases = results.filter((item) => item.expectedIntent === 'emergency_alert');
  const nonEmergencyCases = results.filter((item) => item.expectedIntent !== 'emergency_alert');
  const macroLabels = [...new Set(results.map((item) => item.expectedIntent))];
  return {
    total: results.length,
    overallRegressionPassed: results.filter((item) => item.casePass).length,
    overallRegressionPassRate: rate(results.filter((item) => item.casePass).length, results.length),
    intentPassed: results.filter((item) => item.intentPass).length,
    intentAccuracy: rate(results.filter((item) => item.intentPass).length, results.length),
    macroF1: round(macroLabels.reduce((sum, label) => sum + perIntent[label].f1, 0) / macroLabels.length),
    fieldCases: expectedFieldCases.length,
    fieldsPassed: expectedFieldCases.filter((item) => item.fieldsPass).length,
    fieldReadyRate: rate(expectedFieldCases.filter((item) => item.fieldsPass).length, expectedFieldCases.length),
    executableCases: expectedActionCases.length,
    actionsReady: expectedActionCases.filter((item) => item.actionReady).length,
    actionReadyRate: rate(expectedActionCases.filter((item) => item.actionReady).length, expectedActionCases.length),
    clarificationCount: results.filter((item) => item.requiresClarification).length,
    clarificationRate: rate(results.filter((item) => item.requiresClarification).length, results.length),
    emergencyRecall: rate(emergencyCases.filter((item) => item.actualIntent === 'emergency_alert').length, emergencyCases.length),
    emergencyFalsePositiveCount: nonEmergencyCases.filter((item) => item.actualIntent === 'emergency_alert').length,
    emergencyFalsePositiveRate: rate(nonEmergencyCases.filter((item) => item.actualIntent === 'emergency_alert').length, nonEmergencyCases.length),
    perIntent,
    confusionMatrix: Object.fromEntries(labels.map((expected) => [expected, aggregateCounts(results.filter((item) => item.expectedIntent === expected).map((item) => item.actualIntent))])),
  };
}

function aggregateModelUsage(results: EvalResult[]) {
  const usages = results.map((item) => item.modelUsage).filter((item): item is ModelUsage => Boolean(item));
  const total = usages.reduce((sum, usage) => ({
    calls: sum.calls + usage.calls,
    responsesWithUsageMetadata: sum.responsesWithUsageMetadata + usage.responsesWithUsageMetadata,
    promptTokens: sum.promptTokens + usage.promptTokens,
    completionTokens: sum.completionTokens + usage.completionTokens,
    totalTokens: sum.totalTokens + usage.totalTokens,
    repairCalls: sum.repairCalls + usage.repairCalls,
  }), { calls: 0, responsesWithUsageMetadata: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, repairCalls: 0 });
  const invoked = results.filter((item) => (item.modelUsage?.calls || 0) > 0);
  return {
    provider: 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    casesInvoked: invoked.length,
    caseInvocationRate: rate(invoked.length, results.length),
    ...total,
    usageMetadataCoverage: rate(total.responsesWithUsageMetadata, total.calls),
    averageTokensPerInvokedCase: invoked.length ? round(total.totalTokens / invoked.length, 3) : null,
    otherApiReportedTokens: Math.max(0, total.totalTokens - total.promptTokens - total.completionTokens),
    fallbackAfterInvocationCount: invoked.filter((item) => item.routingSource === 'fallback').length,
  };
}

function aggregateFailureBreakdown(results: EvalResult[]) {
  const failed = results.filter((item) => !item.casePass);
  return {
    total: failed.length,
    intentMismatchCount: failed.filter((item) => !item.intentPass).length,
    clarificationBlockedCount: failed.filter((item) => item.requiresClarification).length,
    fieldMismatchWithReadyActionCount: failed.filter((item) => item.actionReady === true && item.fieldsPass === false).length,
    evaluationErrorCount: failed.filter((item) => Boolean(item.error)).length,
    note: 'Counts are diagnostic slices and are not guaranteed to be mutually exclusive. Review fixture labels before tuning rules.',
  };
}

function aggregateBy<T>(results: EvalResult[], selector: (item: EvalResult) => string, mapper: (items: EvalResult[]) => T): Record<string, T> {
  const groups = new Map<string, EvalResult[]>();
  for (const item of results) groups.set(selector(item), [...(groups.get(selector(item)) || []), item]);
  return Object.fromEntries([...groups.entries()].map(([key, items]) => [key, mapper(items)]));
}

function percentage(value: number | null): string {
  return value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;
}

function createMarkdown(report: any): string {
  const q = report.summary.quality;
  const m = report.summary.modelUsage;
  const l = report.summary.latency;
  const rows = Object.entries(report.summary.byDataset).map(([dataset, stats]: [string, any]) =>
    `| ${dataset} | ${stats.total} | ${percentage(stats.intentAccuracy)} | ${percentage(stats.overallRegressionPassRate)} | ${percentage(stats.fieldReadyRate)} |`,
  ).join('\n');
  return `# Intent History Regression ${report.run.id}\n\n` +
    `This run replays previously used cases. It is suitable for regression tracking, not an independent production-accuracy claim.\n\n` +
    `## Quality\n\n` +
    `| Cases | Intent accuracy | Overall pass | Macro-F1 | Field ready | Action ready | Emergency recall | Emergency FPR |\n` +
    `| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n` +
    `| ${q.total} | ${percentage(q.intentAccuracy)} | ${percentage(q.overallRegressionPassRate)} | ${q.macroF1.toFixed(4)} | ${percentage(q.fieldReadyRate)} | ${percentage(q.actionReadyRate)} | ${percentage(q.emergencyRecall)} | ${percentage(q.emergencyFalsePositiveRate)} |\n\n` +
    `## Routing and cost\n\n` +
    `- Route sources: ${JSON.stringify(report.summary.routing.sourceCounts)}\n` +
    `- Clarifications: ${q.clarificationCount}/${q.total} (${percentage(q.clarificationRate)})\n` +
    `- Failed cases: ${report.summary.failureBreakdown.total} (${report.summary.failureBreakdown.intentMismatchCount} intent mismatch, ${report.summary.failureBreakdown.clarificationBlockedCount} clarification-blocked, ${report.summary.failureBreakdown.fieldMismatchWithReadyActionCount} ready-action field mismatch)\n` +
    `- Gemini: ${m.casesInvoked} cases, ${m.calls} calls, ${m.repairCalls} repair calls\n` +
    `- Tokens: ${m.promptTokens} input, ${m.completionTokens} output, ${m.otherApiReportedTokens} other API-reported, ${m.totalTokens} total; metadata coverage ${percentage(m.usageMetadataCoverage)}\n` +
    `- Latency: avg ${l.averageMs} ms, P50 ${l.p50Ms} ms, P95 ${l.p95Ms} ms, P99 ${l.p99Ms} ms, max ${l.maxMs} ms\n\n` +
    `## Dataset slices\n\n` +
    `| Dataset | Cases | Intent accuracy | Overall pass | Field ready |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n` +
    `## Voice metrics\n\n` +
    `Not measured: these 170 fixtures contain text only. CER/WER, transcription latency, entity exact match, and end-to-end voice accuracy require a labelled audio set.\n\n` +
    `Failures and all per-case routing/token/latency records are in the matching JSON report.\n`;
}

async function main() {
  if (!process.env.GEMINI_API_KEY && process.env.EVAL_ALLOW_NO_GEMINI !== 'true') {
    throw new Error('GEMINI_API_KEY is required for a comparable 170-case run. Set EVAL_ALLOW_NO_GEMINI=true only for an offline diagnostic run.');
  }
  const { sources, cases } = loadCases();
  const { ChatService } = await import('../../../src/services/ai/chatService');
  const healthChat = ChatService.healthChat.bind(ChatService);
  const startedAt = new Date();
  const runId = startedAt.toISOString().replace(/[:.]/g, '-');
  const results: EvalResult[] = [];
  console.log(`Running ${cases.length} historical regression cases...`);
  for (let index = 0; index < cases.length; index += 1) {
    const result = await evaluateCase(cases[index], healthChat);
    results.push(result);
    console.log(`[${index + 1}/${cases.length}] ${result.id}: ${result.casePass ? 'PASS' : 'FAIL'} (${result.routingSource}, ${result.latencyMs} ms)`);
    if ((result.modelUsage?.calls || 0) > 0 && index < cases.length - 1 && DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
  clearPendingIntent(EVAL_USER_ID);
  const finishedAt = new Date();
  const quality = aggregateQuality(results);
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    run: {
      id: runId,
      evaluationRole: 'historical_regression_not_independent_holdout',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      gitCommit: git(['rev-parse', 'HEAD']),
      gitDirty: Boolean(git(['status', '--porcelain'])),
      nodeVersion: process.version,
      platform: process.platform,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      delayAfterGeminiCallMs: DELAY_MS,
    },
    dataset: {
      expectedTotal: EXPECTED_TOTAL,
      actualTotal: cases.length,
      combinedSha256: sha256(sources.map((source) => `${source.file}:${source.sha256}`).join('\n')),
      sources: sources.map(({ file, count, sha256: digest }) => ({ file, count, sha256: digest })),
    },
    metricDefinitions: {
      intentAccuracy: 'Exact expected-intent match, independent of field extraction and execution readiness.',
      overallRegressionPassRate: 'Intent matches, declared expected fields match, and executable intents produce a ready action.',
      fieldReadyRate: 'Expected-field cases whose declared fields match the produced action data.',
      actionReadyRate: 'Executable-intent cases that return the expected executable action without unresolved clarification.',
      emergencyRecall: 'Expected emergency cases routed to emergency_alert.',
      emergencyFalsePositiveRate: 'Non-emergency cases incorrectly routed to emergency_alert.',
      latency: 'Wall-clock ChatService.healthChat latency, including rule, database-context, and Gemini work where applicable.',
      modelTokens: 'Counts reported by the Gemini API. Total may exceed prompt plus completion; the difference is stored as otherApiReportedTokens.',
    },
    summary: {
      quality,
      latency: aggregateLatency(results),
      latencyByRoute: aggregateBy(results, (item) => item.routingSource, aggregateLatency),
      routing: {
        sourceCounts: aggregateCounts(results.map((item) => item.routingSource)),
        ruleFastPathRate: rate(results.filter((item) => item.routingSource === 'rule').length, results.length),
        llmResultRate: rate(results.filter((item) => item.routingSource === 'llm').length, results.length),
        fallbackRate: rate(results.filter((item) => item.routingSource === 'fallback').length, results.length),
      },
      modelUsage: aggregateModelUsage(results),
      failureBreakdown: aggregateFailureBreakdown(results),
      byDataset: aggregateBy(results, (item) => item.dataset, aggregateQuality),
      byExpectedIntent: aggregateBy(results, (item) => item.expectedIntent, (items) => ({ ...aggregateQuality(items), latency: aggregateLatency(items) })),
      voiceMetrics: {
        status: 'not_measured',
        reason: 'The historical fixtures are text-only and contain no labelled audio.',
        transcriptionSuccessRate: null,
        p95TranscriptionLatencyMs: null,
        chineseCer: null,
        englishWer: null,
        entityExactMatchRate: null,
        endToEndVoiceIntentAccuracy: null,
        emergencyRecall: null,
        providerCostPerAudioMinute: null,
      },
      failures: results.filter((item) => !item.casePass).map((item) => item.id),
    },
    results,
  };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = createMarkdown(report);
  const jsonPath = path.join(REPORT_DIR, `${runId}.json`);
  const mdPath = path.join(REPORT_DIR, `${runId}.md`);
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(mdPath, markdown);
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), json);
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.md'), markdown);
  fs.appendFileSync(path.join(REPORT_DIR, 'history.jsonl'), `${JSON.stringify({
    run: report.run,
    dataset: report.dataset,
    quality: report.summary.quality,
    latency: report.summary.latency,
    routing: report.summary.routing,
    modelUsage: report.summary.modelUsage,
    failureBreakdown: report.summary.failureBreakdown,
  })}\n`);
  console.log(`Report: ${jsonPath}`);
  console.log(`Intent accuracy: ${percentage(quality.intentAccuracy)}; overall regression pass: ${percentage(quality.overallRegressionPassRate)}`);
  if (process.env.EVAL_FAIL_ON_REGRESSION === 'true' && quality.overallRegressionPassed !== quality.total) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
