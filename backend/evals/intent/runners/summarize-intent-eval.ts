/**
 * Summarize an existing intent evaluation report without calling the model.
 *
 * Usage:
 *   npm run eval:intent:summarize
 */

import fs from 'fs';
import path from 'path';

interface EvalResult {
  id: string;
  expected: string;
  actual: string;
  pass: boolean;
  latencyMs: number;
}

interface ClassMetrics {
  label: string;
  support: number;
  predicted: number;
  truePositive: number;
  precision: number;
  recall: number;
  f1: number;
}

const reportFile = process.env.EVAL_REPORT_FILE || 'intent-eval-report.json';
const summaryPrefix = process.env.EVAL_SUMMARY_PREFIX || 'intent-eval-summary';
const EVAL_ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(EVAL_ROOT, 'results', 'legacy');
const REPORT_PATH = path.resolve(RESULTS_DIR, reportFile);
const CASES_PATH = path.resolve(
  EVAL_ROOT,
  process.env.EVAL_CASES_FILE || 'datasets/historical/intent-eval-cases.json'
);
const SUMMARY_JSON_PATH = path.join(RESULTS_DIR, `${summaryPrefix}.json`);
const SUMMARY_MD_PATH = path.join(RESULTS_DIR, `${summaryPrefix}.md`);

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round((numerator / denominator) * 100);
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function parseResults(raw: string): EvalResult[] {
  // The historical report contains mojibake in free-text fields. Extract only
  // stable ASCII fields so the existing measurements remain usable.
  const objectPattern = /\{[\s\S]*?"id"\s*:\s*"([^"]+)"[\s\S]*?"expected"\s*:\s*"([^"]+)"[\s\S]*?"actual"\s*:\s*"([^"]+)"[\s\S]*?"pass"\s*:\s*(true|false)[\s\S]*?"latencyMs"\s*:\s*(\d+)[\s\S]*?\}/g;
  const results: EvalResult[] = [];

  for (const match of raw.matchAll(objectPattern)) {
    results.push({
      id: match[1],
      expected: match[2],
      actual: match[3],
      pass: match[4] === 'true',
      latencyMs: Number(match[5]),
    });
  }

  if (results.length === 0) {
    throw new Error(`No evaluation results found in ${REPORT_PATH}`);
  }

  return results;
}

function parseFieldValidatedCaseIds(raw: string): Set<string> {
  const ids = new Set<string>();
  const caseStarts = [...raw.matchAll(/(?:^|\n)\s*\{\s*\n\s*"id"\s*:\s*"([^"]+)"/g)];

  for (let index = 0; index < caseStarts.length; index += 1) {
    const start = caseStarts[index].index ?? 0;
    const end = caseStarts[index + 1]?.index ?? raw.length;
    if (/"expectedFields"\s*:/.test(raw.slice(start, end))) {
      ids.add(caseStarts[index][1]);
    }
  }

  return ids;
}

function calculateClassMetrics(results: EvalResult[]): ClassMetrics[] {
  const labels = [...new Set(results.flatMap((result) => [result.expected, result.actual]))]
    .filter((label) => label !== 'error' && label !== 'none')
    .sort();

  return labels.map((label) => {
    const support = results.filter((result) => result.expected === label).length;
    const predicted = results.filter((result) => result.actual === label).length;
    const truePositive = results.filter(
      (result) => result.expected === label && result.actual === label,
    ).length;
    const precision = predicted === 0 ? 0 : truePositive / predicted;
    const recall = support === 0 ? 0 : truePositive / support;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    return {
      label,
      support,
      predicted,
      truePositive,
      precision: round(precision * 100),
      recall: round(recall * 100),
      f1: round(f1 * 100),
    };
  });
}

function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const raw = fs.readFileSync(REPORT_PATH, 'utf8');
  const casesRaw = fs.readFileSync(CASES_PATH, 'utf8');
  const results = parseResults(raw);
  const fieldValidatedCaseIds = parseFieldValidatedCaseIds(casesRaw);
  const total = results.length;
  const passed = results.filter((result) => result.pass).length;
  const intentCorrect = results.filter((result) => result.expected === result.actual).length;
  const failed = total - passed;
  const intentFailures = results.filter((result) => result.expected !== result.actual);
  const fieldValidationFailures = results.filter(
    (result) => !result.pass && result.expected === result.actual,
  );
  const executionErrors = results.filter((result) => result.actual === 'error');
  const fieldEvaluated = results.filter((result) => fieldValidatedCaseIds.has(result.id));
  const fieldReady = fieldEvaluated.filter((result) => result.pass).length;
  const emergencyResults = results.filter((result) => result.expected === 'emergency_alert');
  const emergencyRecalled = emergencyResults.filter(
    (result) => result.actual === 'emergency_alert',
  ).length;
  const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
  const latencyTotal = latencies.reduce((sum, latency) => sum + latency, 0);
  const overEightSeconds = latencies.filter((latency) => latency > 8000).length;
  const classMetrics = calculateClassMetrics(results);

  const summary = {
    source: path.basename(REPORT_PATH),
    generatedAt: new Date().toISOString(),
    sampleCount: total,
    overall: {
      passed,
      failed,
      endToEndPassRatePct: percentage(passed, total),
      intentCorrect,
      intentAccuracyPct: percentage(intentCorrect, total),
    },
    fieldValidation: {
      evaluated: fieldEvaluated.length,
      ready: fieldReady,
      readyRatePct: percentage(fieldReady, fieldEvaluated.length),
      note: 'Uses the existing case-level field validation result; it is not a per-field micro-average.',
    },
    emergency: {
      support: emergencyResults.length,
      recalled: emergencyRecalled,
      recallPct: percentage(emergencyRecalled, emergencyResults.length),
    },
    latencyMs: {
      average: round(latencyTotal / total),
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      maximum: latencies[latencies.length - 1],
      overEightSeconds,
      overEightSecondsRatePct: percentage(overEightSeconds, total),
    },
    failureTaxonomy: {
      intentMismatch: intentFailures.length,
      fieldValidation: fieldValidationFailures.length,
      executionError: executionErrors.length,
      failedCaseIds: results.filter((result) => !result.pass).map((result) => result.id),
    },
    byIntent: classMetrics,
  };

  const metricRows = classMetrics
    .map((metric) => `| ${metric.label} | ${metric.support} | ${metric.predicted} | ${metric.precision}% | ${metric.recall}% | ${metric.f1}% |`)
    .join('\n');

  const markdown = `# Intent Evaluation Summary

Generated from the existing \`${path.basename(REPORT_PATH)}\`; no model calls were made.

## Headline Metrics

| Metric | Result |
| --- | ---: |
| Samples | ${total} |
| End-to-end pass rate | ${passed}/${total} (${summary.overall.endToEndPassRatePct}%) |
| Intent accuracy | ${intentCorrect}/${total} (${summary.overall.intentAccuracyPct}%) |
| Field-ready case rate | ${fieldReady}/${fieldEvaluated.length} (${summary.fieldValidation.readyRatePct}%) |
| Emergency recall | ${emergencyRecalled}/${emergencyResults.length} (${summary.emergency.recallPct}%) |

## Latency

| Average | P50 | P95 | P99 | Maximum | > 8s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| ${summary.latencyMs.average} ms | ${summary.latencyMs.p50} ms | ${summary.latencyMs.p95} ms | ${summary.latencyMs.p99} ms | ${summary.latencyMs.maximum} ms | ${overEightSeconds}/${total} (${summary.latencyMs.overEightSecondsRatePct}%) |

## Per-intent Metrics

| Intent | Support | Predicted | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
${metricRows}

## Failure Taxonomy

| Failure type | Count |
| --- | ---: |
| Intent mismatch | ${summary.failureTaxonomy.intentMismatch} |
| Field validation | ${summary.failureTaxonomy.fieldValidation} |
| Execution error | ${summary.failureTaxonomy.executionError} |

Failed cases: ${summary.failureTaxonomy.failedCaseIds.map((id) => `\`${id}\``).join(', ')}

> Field-ready rate covers only cases that declare \`expectedFields\` in the test set. It uses the original case-level validation outcome; the stored report does not contain enough detail to calculate a per-field micro-average without rerunning evaluation.
`;

  fs.writeFileSync(SUMMARY_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(SUMMARY_MD_PATH, markdown);

  console.log(markdown);
  console.log(`JSON summary: ${SUMMARY_JSON_PATH}`);
  console.log(`Markdown summary: ${SUMMARY_MD_PATH}`);
}

main();
