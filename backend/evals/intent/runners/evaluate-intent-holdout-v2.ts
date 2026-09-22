/**
 * One-shot scorer for the frozen 300-case v2 holdout.
 * Do not run this script while tuning. Build/validation is a separate command.
 */
import '../../../src/utils/setupProxy';

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { HealthQueryResult, ModelUsage } from '../../../src/services/ai/chatService';
import { clearPendingIntent } from '../../../src/utils/pendingIntentStore';

type Language = 'zh' | 'en';
type ExpectedMode = 'execute' | 'clarify' | 'respond' | 'emergency';

interface HoldoutCase {
  id: string;
  category: string;
  language: Language;
  input: string;
  expectedIntent: string;
  expectedMode: ExpectedMode;
  expectedFields?: Record<string, unknown>;
  expectedMissingSlots?: string[];
  safetySlice?: string;
}

interface Manifest {
  datasetVersion: string;
  status: string;
  total: number;
  sha256: string;
  validation: { scored: boolean };
  firstScoredRun?: {
    id: string;
    report: string;
    overallPassRate: number;
    intentAccuracy: number;
    modeAccuracy: number;
  };
}

interface CaseResult extends HoldoutCase {
  actualIntent: string;
  actualMode: ExpectedMode | 'unknown';
  actualFields: Record<string, unknown>;
  actualMissingSlots: string[];
  routingSource: string;
  intentPass: boolean;
  modePass: boolean;
  fieldsPass: boolean | null;
  missingSlotsPass: boolean | null;
  casePass: boolean;
  reason: string[];
  latencyMs: number;
  modelUsage: ModelUsage | null;
  confidence: number | null;
  riskLevel: string | null;
  error?: string;
}

const DATASET_VERSION = process.env.EVAL_HOLDOUT_DATASET_VERSION || 'intent-holdout-v2-300';
const EVAL_ROOT = path.resolve(__dirname, '..');
const DATASET_FILE = process.env.EVAL_HOLDOUT_DATASET_FILE || 'holdout-v2/cases.json';
const MANIFEST_FILE = process.env.EVAL_HOLDOUT_MANIFEST_FILE || 'holdout-v2/manifest.json';
const DATASET_PATH = path.join(EVAL_ROOT, 'datasets', DATASET_FILE);
const MANIFEST_PATH = path.join(EVAL_ROOT, 'datasets', MANIFEST_FILE);
const REPORT_LABEL = process.env.EVAL_HOLDOUT_REPORT_LABEL || 'intent-holdout-v2-300';
if (!/^[a-z0-9-]+$/.test(REPORT_LABEL)) throw new Error(`Invalid report label: ${REPORT_LABEL}`);
const REPORT_DIR = path.join(EVAL_ROOT, 'results', REPORT_LABEL);
const EVAL_USER_ID = process.env.EVAL_USER_ID || 'intent-holdout-v2-eval-user';
const DELAY_MS = Number.parseInt(process.env.EVAL_HOLDOUT_DELAY_MS || '1500', 10);
const SCHEMA_VERSION = 1;

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator ? round(numerator / denominator) : null;
}

function sha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return round(sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)], 3);
}

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: path.resolve(__dirname, '../../../..'), encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function listFilesRecursively(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursively(fullPath) : [fullPath];
  });
}

function implementationHash(): { sha256: string; files: number } {
  const backendRoot = path.resolve(__dirname, '../../..');
  const files = [
    ...listFilesRecursively(path.join(backendRoot, 'src')).filter((file) => file.endsWith('.ts')),
    path.join(backendRoot, 'package.json'),
    path.resolve(backendRoot, '../package-lock.json'),
  ].filter((file) => fs.existsSync(file)).sort();
  const digest = crypto.createHash('sha256');
  for (const file of files) {
    digest.update(path.relative(backendRoot, file).replace(/\\/g, '/'));
    digest.update('\0');
    digest.update(fs.readFileSync(file));
    digest.update('\0');
  }
  return { sha256: digest.digest('hex'), files: files.length };
}

function loadFrozenDataset(): { cases: HoldoutCase[]; manifest: Manifest; raw: string } {
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  const cases = JSON.parse(raw) as HoldoutCase[];
  if (manifest.datasetVersion !== DATASET_VERSION) throw new Error(`Unexpected dataset version: ${manifest.datasetVersion}`);
  const firstRunReady = manifest.status === 'frozen_unscored' && manifest.validation.scored === false;
  const intentionalRerun = manifest.status === 'scored_first_run_complete' && process.env.EVAL_ALLOW_HOLDOUT_RERUN === 'true';
  if (!firstRunReady && !intentionalRerun) throw new Error(`The v2 holdout cannot be scored from manifest state: ${manifest.status}`);
  if (cases.length !== 300 || manifest.total !== cases.length) throw new Error(`Expected 300 cases, received ${cases.length}`);
  const actualHash = sha256(raw);
  if (actualHash !== manifest.sha256) throw new Error(`Dataset hash mismatch: expected ${manifest.sha256}, received ${actualHash}`);
  if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error('Duplicate case IDs');
  return { cases, manifest, raw };
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

function comparable(value: unknown): unknown {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (Array.isArray(value)) return value.map(comparable);
  return value;
}

function fieldsMatch(actual: Record<string, unknown>, expected?: Record<string, unknown>): { pass: boolean | null; mismatches: string[] } {
  if (!expected) return { pass: null, mismatches: [] };
  const mismatches = Object.entries(expected).flatMap(([key, expectedValue]) => {
    const actualValue = actual[key];
    if (typeof expectedValue === 'number') {
      return typeof actualValue === 'number' && Math.abs(actualValue - expectedValue) < 1e-9
        ? [] : [`field:${key}:${String(actualValue)}!=${expectedValue}`];
    }
    return JSON.stringify(comparable(actualValue)) === JSON.stringify(comparable(expectedValue))
      ? [] : [`field:${key}:${String(actualValue)}!=${String(expectedValue)}`];
  });
  return { pass: mismatches.length === 0, mismatches };
}

function slotsMatch(actual: string[], expected?: string[]): boolean | null {
  if (!expected) return null;
  const normalize = (values: string[]) => [...new Set(values)].sort();
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}

function actualMode(response: HealthQueryResult): ExpectedMode | 'unknown' {
  if (response.routingSource === 'emergency' && response.action?.type === 'emergency_alert') return 'emergency';
  if (response.requiresClarification === true && !response.action) return 'clarify';
  if (response.action && response.action.type !== 'emergency_alert') return 'execute';
  if ((response.intent || 'general_advice') === 'general_advice' && !response.action) return 'respond';
  return 'unknown';
}

async function evaluateCase(item: HoldoutCase, healthChat: (message: string, userId: string) => Promise<HealthQueryResult>): Promise<CaseResult> {
  clearPendingIntent(EVAL_USER_ID);
  const started = performance.now();
  try {
    const response = await healthChat(item.input, EVAL_USER_ID);
    const latencyMs = round(performance.now() - started, 3);
    const actualIntent = response.intent || response.action?.type || 'general_advice';
    const mode = actualMode(response);
    const actualFields = parseActionData(response.action?.data);
    const fieldCheck = fieldsMatch(actualFields, item.expectedFields);
    const missingSlotsPass = slotsMatch(response.missingSlots || [], item.expectedMissingSlots);
    const intentPass = actualIntent === item.expectedIntent;
    const modePass = mode === item.expectedMode;
    const casePass = intentPass && modePass && fieldCheck.pass !== false && missingSlotsPass !== false;
    const risk = response.risk as { level?: string } | undefined;
    return {
      ...item,
      actualIntent,
      actualMode: mode,
      actualFields,
      actualMissingSlots: response.missingSlots || [],
      routingSource: response.routingSource || 'unknown',
      intentPass,
      modePass,
      fieldsPass: fieldCheck.pass,
      missingSlotsPass,
      casePass,
      reason: [
        ...(intentPass ? [] : [`intent:${actualIntent}!=${item.expectedIntent}`]),
        ...(modePass ? [] : [`mode:${mode}!=${item.expectedMode}`]),
        ...fieldCheck.mismatches,
        ...(missingSlotsPass === false ? [`missingSlots:${(response.missingSlots || []).join(',')}!=${(item.expectedMissingSlots || []).join(',')}`] : []),
      ],
      latencyMs,
      modelUsage: response.modelUsage || null,
      confidence: typeof response.confidence === 'number' ? response.confidence : null,
      riskLevel: risk?.level || null,
    };
  } catch (error) {
    return {
      ...item,
      actualIntent: 'error',
      actualMode: 'unknown',
      actualFields: {},
      actualMissingSlots: [],
      routingSource: 'error',
      intentPass: false,
      modePass: false,
      fieldsPass: item.expectedFields ? false : null,
      missingSlotsPass: item.expectedMissingSlots ? false : null,
      casePass: false,
      reason: ['evaluation_error'],
      latencyMs: round(performance.now() - started, 3),
      modelUsage: (error as Error & { modelUsage?: ModelUsage }).modelUsage || null,
      confidence: null,
      riskLevel: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function counts(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function latency(results: CaseResult[]) {
  const values = results.map((item) => item.latencyMs);
  return {
    averageMs: round(values.reduce((sum, value) => sum + value, 0) / values.length, 3),
    p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95), p99Ms: percentile(values, 0.99),
    maxMs: round(Math.max(...values), 3), over8SecondsCount: values.filter((value) => value > 8000).length,
  };
}

function quality(results: CaseResult[]) {
  const labels = [...new Set(results.flatMap((item) => [item.expectedIntent, item.actualIntent]))].sort();
  const expectedLabels = [...new Set(results.map((item) => item.expectedIntent))];
  const perIntent = Object.fromEntries(labels.map((label) => {
    const tp = results.filter((item) => item.expectedIntent === label && item.actualIntent === label).length;
    const fp = results.filter((item) => item.expectedIntent !== label && item.actualIntent === label).length;
    const fn = results.filter((item) => item.expectedIntent === label && item.actualIntent !== label).length;
    const precision = rate(tp, tp + fp) || 0;
    const recall = rate(tp, tp + fn) || 0;
    return [label, { support: results.filter((item) => item.expectedIntent === label).length, tp, fp, fn, precision, recall, f1: precision + recall ? round(2 * precision * recall / (precision + recall)) : 0 }];
  }));
  const expectedClarify = results.filter((item) => item.expectedMode === 'clarify');
  const actualClarify = results.filter((item) => item.actualMode === 'clarify');
  const clarificationTp = results.filter((item) => item.expectedMode === 'clarify' && item.actualMode === 'clarify').length;
  const emergency = results.filter((item) => item.expectedMode === 'emergency');
  const nonEmergency = results.filter((item) => item.expectedMode !== 'emergency');
  const safetyNegatives = results.filter((item) => item.safetySlice === 'emergency_knowledge_negative');
  const fieldCases = results.filter((item) => item.expectedFields);
  return {
    total: results.length,
    passed: results.filter((item) => item.casePass).length,
    overallPassRate: rate(results.filter((item) => item.casePass).length, results.length),
    intentAccuracy: rate(results.filter((item) => item.intentPass).length, results.length),
    modeAccuracy: rate(results.filter((item) => item.modePass).length, results.length),
    macroF1: round(expectedLabels.reduce((sum, label) => sum + perIntent[label].f1, 0) / expectedLabels.length),
    fieldAccuracy: rate(fieldCases.filter((item) => item.fieldsPass).length, fieldCases.length),
    clarificationPrecision: rate(clarificationTp, actualClarify.length),
    clarificationRecall: rate(clarificationTp, expectedClarify.length),
    missingSlotsAccuracy: rate(expectedClarify.filter((item) => item.missingSlotsPass).length, expectedClarify.length),
    emergencyRecall: rate(emergency.filter((item) => item.actualMode === 'emergency').length, emergency.length),
    emergencyFalsePositiveRate: rate(nonEmergency.filter((item) => item.actualMode === 'emergency').length, nonEmergency.length),
    emergencyKnowledgeFalsePositiveRate: rate(safetyNegatives.filter((item) => item.actualMode === 'emergency').length, safetyNegatives.length),
    perIntent,
    perExpectedMode: Object.fromEntries([...new Set(results.map((item) => item.expectedMode))].sort().map((mode) => {
      const slice = results.filter((item) => item.expectedMode === mode);
      return [mode, { total: slice.length, passed: slice.filter((item) => item.casePass).length, passRate: rate(slice.filter((item) => item.casePass).length, slice.length) }];
    })),
    confusionMatrix: Object.fromEntries(expectedLabels.map((expected) => [expected, counts(results.filter((item) => item.expectedIntent === expected).map((item) => item.actualIntent))])),
  };
}

function modelUsage(results: CaseResult[]) {
  const usages = results.map((item) => item.modelUsage).filter((item): item is ModelUsage => Boolean(item));
  const totals = usages.reduce((sum, usage) => ({
    calls: sum.calls + usage.calls,
    responsesWithUsageMetadata: sum.responsesWithUsageMetadata + usage.responsesWithUsageMetadata,
    promptTokens: sum.promptTokens + usage.promptTokens,
    completionTokens: sum.completionTokens + usage.completionTokens,
    totalTokens: sum.totalTokens + usage.totalTokens,
    repairCalls: sum.repairCalls + usage.repairCalls,
  }), { calls: 0, responsesWithUsageMetadata: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, repairCalls: 0 });
  const invokedCases = results.filter((item) => (item.modelUsage?.calls || 0) > 0);
  return {
    provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', casesInvoked: invokedCases.length,
    caseInvocationRate: rate(invokedCases.length, results.length), ...totals,
    usageMetadataCoverage: rate(totals.responsesWithUsageMetadata, totals.calls),
    otherApiReportedTokens: Math.max(0, totals.totalTokens - totals.promptTokens - totals.completionTokens),
    averageTokensPerInvokedCase: invokedCases.length ? round(totals.totalTokens / invokedCases.length, 3) : null,
    fallbackAfterInvocationCount: invokedCases.filter((item) => item.routingSource === 'fallback').length,
  };
}

function group<T>(results: CaseResult[], key: (item: CaseResult) => string, aggregate: (items: CaseResult[]) => T): Record<string, T> {
  const grouped = new Map<string, CaseResult[]>();
  for (const item of results) grouped.set(key(item), [...(grouped.get(key(item)) || []), item]);
  return Object.fromEntries([...grouped.entries()].map(([name, items]) => [name, aggregate(items)]));
}

function pct(value: number | null): string {
  return value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;
}

function pp(value: number): string {
  const points = value * 100;
  return `${points >= 0 ? '+' : ''}${points.toFixed(2)} pp`;
}

function comparisonToFirstRun(manifest: Manifest, current: ReturnType<typeof quality>) {
  if (!manifest.firstScoredRun) return null;
  const firstReportPath = path.join(EVAL_ROOT, manifest.firstScoredRun.report);
  const firstReport = JSON.parse(fs.readFileSync(firstReportPath, 'utf8')) as {
    summary: { quality: ReturnType<typeof quality> };
  };
  const baseline = firstReport.summary.quality;
  return {
    baselineRunId: manifest.firstScoredRun.id,
    baselineReport: manifest.firstScoredRun.report,
    note: 'The same consumed v2 dataset is reused for post-fix regression only; this is not a new independent holdout.',
    baseline: {
      overallPassRate: baseline.overallPassRate,
      intentAccuracy: baseline.intentAccuracy,
      modeAccuracy: baseline.modeAccuracy,
      fieldAccuracy: baseline.fieldAccuracy,
      emergencyRecall: baseline.emergencyRecall,
      emergencyFalsePositiveRate: baseline.emergencyFalsePositiveRate,
      emergencyKnowledgeFalsePositiveRate: baseline.emergencyKnowledgeFalsePositiveRate,
    },
    current: {
      overallPassRate: current.overallPassRate,
      intentAccuracy: current.intentAccuracy,
      modeAccuracy: current.modeAccuracy,
      fieldAccuracy: current.fieldAccuracy,
      emergencyRecall: current.emergencyRecall,
      emergencyFalsePositiveRate: current.emergencyFalsePositiveRate,
      emergencyKnowledgeFalsePositiveRate: current.emergencyKnowledgeFalsePositiveRate,
    },
    delta: {
      overallPassRate: (current.overallPassRate || 0) - (baseline.overallPassRate || 0),
      intentAccuracy: (current.intentAccuracy || 0) - (baseline.intentAccuracy || 0),
      modeAccuracy: (current.modeAccuracy || 0) - (baseline.modeAccuracy || 0),
      fieldAccuracy: (current.fieldAccuracy || 0) - (baseline.fieldAccuracy || 0),
      emergencyRecall: (current.emergencyRecall || 0) - (baseline.emergencyRecall || 0),
      emergencyFalsePositiveRate: (current.emergencyFalsePositiveRate || 0) - (baseline.emergencyFalsePositiveRate || 0),
      emergencyKnowledgeFalsePositiveRate: (current.emergencyKnowledgeFalsePositiveRate || 0) - (baseline.emergencyKnowledgeFalsePositiveRate || 0),
    },
  };
}

function markdown(report: any): string {
  const q = report.summary.quality;
  const l = report.summary.latency;
  const m = report.summary.modelUsage;
  const comparison = report.comparisonToFirstRun;
  const comparisonSection = comparison ?
    `## Comparison with the first scored run\n\n` +
    `This is a post-fix regression on the consumed v2 dataset, not a new independent holdout.\n\n` +
    `| Metric | First run | Post-fix | Delta |\n| --- | ---: | ---: | ---: |\n` +
    `| Overall pass | ${pct(comparison.baseline.overallPassRate)} | ${pct(comparison.current.overallPassRate)} | ${pp(comparison.delta.overallPassRate)} |\n` +
    `| Intent accuracy | ${pct(comparison.baseline.intentAccuracy)} | ${pct(comparison.current.intentAccuracy)} | ${pp(comparison.delta.intentAccuracy)} |\n` +
    `| Mode accuracy | ${pct(comparison.baseline.modeAccuracy)} | ${pct(comparison.current.modeAccuracy)} | ${pp(comparison.delta.modeAccuracy)} |\n` +
    `| Field accuracy | ${pct(comparison.baseline.fieldAccuracy)} | ${pct(comparison.current.fieldAccuracy)} | ${pp(comparison.delta.fieldAccuracy)} |\n` +
    `| Emergency recall | ${pct(comparison.baseline.emergencyRecall)} | ${pct(comparison.current.emergencyRecall)} | ${pp(comparison.delta.emergencyRecall)} |\n` +
    `| Emergency FPR | ${pct(comparison.baseline.emergencyFalsePositiveRate)} | ${pct(comparison.current.emergencyFalsePositiveRate)} | ${pp(comparison.delta.emergencyFalsePositiveRate)} |\n` +
    `| Emergency-knowledge FPR | ${pct(comparison.baseline.emergencyKnowledgeFalsePositiveRate)} | ${pct(comparison.current.emergencyKnowledgeFalsePositiveRate)} | ${pp(comparison.delta.emergencyKnowledgeFalsePositiveRate)} |\n\n`
    : '';
  return `# ${REPORT_LABEL} — ${report.run.id}\n\n` +
    `Frozen dataset: \`${report.dataset.sha256}\`\n\n` +
    comparisonSection +
    `| Cases | Overall pass | Intent accuracy | Mode accuracy | Macro-F1 | Field accuracy |\n` +
    `| ---: | ---: | ---: | ---: | ---: | ---: |\n` +
    `| ${q.total} | ${pct(q.overallPassRate)} | ${pct(q.intentAccuracy)} | ${pct(q.modeAccuracy)} | ${q.macroF1.toFixed(4)} | ${pct(q.fieldAccuracy)} |\n\n` +
    `## Safety and clarification\n\n` +
    `- Emergency recall: ${pct(q.emergencyRecall)}\n- Emergency false-positive rate: ${pct(q.emergencyFalsePositiveRate)}\n` +
    `- Emergency-knowledge false-positive rate: ${pct(q.emergencyKnowledgeFalsePositiveRate)}\n` +
    `- Clarification precision / recall: ${pct(q.clarificationPrecision)} / ${pct(q.clarificationRecall)}\n` +
    `- Missing-slot accuracy: ${pct(q.missingSlotsAccuracy)}\n\n` +
    `## Routing, latency, and tokens\n\n` +
    `- Route sources: ${JSON.stringify(report.summary.routing.sourceCounts)}\n` +
    `- Latency: average ${l.averageMs} ms; P50 ${l.p50Ms} ms; P95 ${l.p95Ms} ms; P99 ${l.p99Ms} ms; max ${l.maxMs} ms\n` +
    `- Gemini: ${m.casesInvoked} cases, ${m.calls} calls, ${m.repairCalls} repair calls\n` +
    `- Tokens: ${m.promptTokens} input, ${m.completionTokens} output, ${m.otherApiReportedTokens} other API-reported, ${m.totalTokens} total\n\n` +
    `Failures and all per-case observations are stored in the matching JSON report.\n`;
}

async function main() {
  if (!process.env.GEMINI_API_KEY && process.env.EVAL_ALLOW_NO_GEMINI !== 'true') {
    throw new Error('GEMINI_API_KEY is required for the official holdout run');
  }
  if (fs.existsSync(REPORT_DIR)) {
    const scoredReports = fs.readdirSync(REPORT_DIR).filter((file) => /^\d{4}-.*\.json$/.test(file));
    if (scoredReports.length && process.env.EVAL_ALLOW_HOLDOUT_RERUN !== 'true') {
      throw new Error(`Holdout already has ${scoredReports.length} scored run(s). Set EVAL_ALLOW_HOLDOUT_RERUN=true only for an explicitly labelled rerun.`);
    }
  }
  const { cases, manifest } = loadFrozenDataset();
  const sourceHash = implementationHash();
  const scorerSha256 = sha256(fs.readFileSync(__filename));
  const { ChatService } = await import('../../../src/services/ai/chatService');
  const healthChat = ChatService.healthChat.bind(ChatService);
  const startedAt = new Date();
  const runId = startedAt.toISOString().replace(/[:.]/g, '-');
  const results: CaseResult[] = [];
  console.log(`Scoring frozen holdout ${manifest.datasetVersion}: ${cases.length} cases`);
  for (let index = 0; index < cases.length; index += 1) {
    const result = await evaluateCase(cases[index], healthChat);
    results.push(result);
    console.log(`[${index + 1}/${cases.length}] ${result.id}: ${result.casePass ? 'PASS' : 'FAIL'} (${result.actualMode}, ${result.routingSource}, ${result.latencyMs} ms)`);
    if ((result.modelUsage?.calls || 0) > 0 && index < cases.length - 1 && DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
  clearPendingIntent(EVAL_USER_ID);
  const finishedAt = new Date();
  const qualitySummary = quality(results);
  const comparison = process.env.EVAL_ALLOW_HOLDOUT_RERUN === 'true'
    ? comparisonToFirstRun(manifest, qualitySummary)
    : null;
  const report = {
    schemaVersion: SCHEMA_VERSION,
    run: {
      id: runId,
      kind: process.env.EVAL_RUN_KIND || (process.env.EVAL_ALLOW_HOLDOUT_RERUN === 'true' ? 'rerun' : 'first_scored_run'),
      evaluationRole: process.env.EVAL_ALLOW_HOLDOUT_RERUN === 'true'
        ? 'post_fix_regression_not_independent_holdout'
        : 'independent_holdout_first_scored_run',
      startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), durationMs: finishedAt.getTime() - startedAt.getTime(),
      gitCommit: git(['rev-parse', 'HEAD']), gitDirty: Boolean(git(['status', '--porcelain'])),
      implementationSha256: sourceHash.sha256, implementationFileCount: sourceHash.files,
      scorerSha256,
      nodeVersion: process.version, platform: process.platform, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', delayAfterGeminiCallMs: DELAY_MS,
    },
    dataset: { version: manifest.datasetVersion, sha256: manifest.sha256, total: cases.length },
    comparisonToFirstRun: comparison,
    metricDefinitions: {
      intentAccuracy: 'Exact expected-intent match regardless of response behavior.',
      modeAccuracy: 'Exact execute/clarify/respond/emergency behavior match.',
      overallPassRate: 'Intent, mode, declared fields, and expected missing-slot set all match.',
      clarificationPrecisionRecall: 'Clarify is treated as a first-class expected behavior, not as an automatic failure.',
    },
    summary: {
      quality: qualitySummary,
      latency: latency(results),
      latencyByRoute: group(results, (item) => item.routingSource, latency),
      routing: { sourceCounts: counts(results.map((item) => item.routingSource)) },
      modelUsage: modelUsage(results),
      byLanguage: group(results, (item) => item.language, quality),
      byExpectedIntent: group(results, (item) => item.expectedIntent, quality),
      byExpectedMode: group(results, (item) => item.expectedMode, quality),
      voiceMetrics: { status: 'not_measured', reason: 'The v2 holdout is text-only.' },
      failures: results.filter((item) => !item.casePass).map((item) => item.id),
    },
    results,
  };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const md = markdown(report);
  fs.writeFileSync(path.join(REPORT_DIR, `${runId}.json`), json);
  fs.writeFileSync(path.join(REPORT_DIR, `${runId}.md`), md);
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), json);
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.md'), md);
  fs.appendFileSync(path.join(REPORT_DIR, 'history.jsonl'), `${JSON.stringify({ run: report.run, dataset: report.dataset, quality: qualitySummary, latency: report.summary.latency, routing: report.summary.routing, modelUsage: report.summary.modelUsage })}\n`);
  if (report.run.kind === 'first_scored_run') {
    const scoredManifest = {
      ...manifest,
      status: 'scored_first_run_complete',
      validation: { ...manifest.validation, scored: true },
      firstScoredRun: {
        id: runId,
        finishedAt: finishedAt.toISOString(),
        report: `results/${REPORT_LABEL}/${runId}.json`,
        reportSha256: sha256(json),
        implementationSha256: sourceHash.sha256,
        scorerSha256,
        overallPassRate: qualitySummary.overallPassRate,
        intentAccuracy: qualitySummary.intentAccuracy,
        modeAccuracy: qualitySummary.modeAccuracy,
      },
    };
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(scoredManifest, null, 2)}\n`);
  }
  console.log(`Scored report: ${path.join(REPORT_DIR, `${runId}.json`)}`);
  console.log(`Overall pass: ${pct(qualitySummary.overallPassRate)}; intent accuracy: ${pct(qualitySummary.intentAccuracy)}; mode accuracy: ${pct(qualitySummary.modeAccuracy)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
