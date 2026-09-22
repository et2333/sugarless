import fs from 'node:fs';
import path from 'node:path';
import { assessEmergency } from '../../../src/utils/riskDetector';
import { classifyRuleIntent } from '../../../src/utils/intentRouter';

interface Case { id: string; input: string; expectedIntent: string; expectedFields?: Record<string, unknown> }
interface Result extends Case { actualIntent: string; intentPass: boolean; fieldsPass: boolean; latencyMs: number }

const evalRoot = path.resolve(__dirname, '..');
const casesPath = path.join(evalRoot, 'datasets', 'frozen-v1', 'cases.json');
const cases: Case[] = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

function evaluate(item: Case): Result {
  const start = performance.now();
  const risk = assessEmergency(item.input);
  const candidate = risk.isEmergency ? null : classifyRuleIntent(item.input);
  const actualIntent = risk.isEmergency ? 'emergency_alert' : candidate?.intent || 'general_advice';
  const slots = candidate?.slots || {};
  const fieldsPass = Object.entries(item.expectedFields || {}).every(([key, value]) => slots[key] === value);
  return { ...item, actualIntent, intentPass: actualIntent === item.expectedIntent, fieldsPass, latencyMs: performance.now() - start };
}

const results = cases.map(evaluate);
const labels = [...new Set(cases.map((item) => item.expectedIntent))];
const perIntent = Object.fromEntries(labels.map((label) => {
  const tp = results.filter((r) => r.expectedIntent === label && r.actualIntent === label).length;
  const fp = results.filter((r) => r.expectedIntent !== label && r.actualIntent === label).length;
  const fn = results.filter((r) => r.expectedIntent === label && r.actualIntent !== label).length;
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const f1 = (2 * precision * recall) / Math.max(Number.EPSILON, precision + recall);
  return [label, { tp, fp, fn, precision, recall, f1 }];
}));

const intentPassed = results.filter((r) => r.intentPass).length;
const actionable = results.filter((r) => r.expectedFields && Object.keys(r.expectedFields).length > 0);
const fieldsPassed = actionable.filter((r) => r.intentPass && r.fieldsPass).length;
const emergency = perIntent.emergency_alert;
const nonEmergency = results.filter((r) => r.expectedIntent !== 'emergency_alert');
const emergencyFalsePositives = nonEmergency.filter((r) => r.actualIntent === 'emergency_alert').length;
const summary = {
  dataset: path.basename(casesPath),
  generatedAt: new Date().toISOString(),
  total: results.length,
  intentAccuracy: intentPassed / results.length,
  macroF1: labels.reduce((sum, label) => sum + perIntent[label].f1, 0) / labels.length,
  fieldReadyRate: fieldsPassed / Math.max(1, actionable.length),
  emergencyRecall: emergency.recall,
  emergencyFalsePositiveRate: emergencyFalsePositives / Math.max(1, nonEmergency.length),
  averageLatencyMs: results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length,
  perIntent,
  failures: results.filter((result) => !result.intentPass || !result.fieldsPass),
};

console.log(JSON.stringify(summary, null, 2));
const reportPath = path.join(evalRoot, 'results', 'frozen-v1', 'report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({ summary, results }, null, 2));
if (summary.failures.length) process.exitCode = 1;
