/**
 * AI 意图识别准确率评测脚本
 *
 * 用法:
 *   cd backend
 *   npm run eval:intent
 *
 * 可选环境变量（写在 backend/.env）:
 *   HTTPS_PROXY=http://127.0.0.1:7897
 *   GEMINI_MODEL=gemini-2.5-flash
 *   EVAL_DELAY_MS=1500
 *   EVAL_USER_ID=demo
 */

// 必须最先加载，确保 Gemini SDK 的 fetch 走代理
import '../../../src/utils/setupProxy';

import fs from 'fs';
import path from 'path';
import { detectEmergency, detectLanguage } from '../../../src/utils/languageDetector';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  console.log(`已启用代理: ${proxyUrl}`);
} else {
  console.warn('未设置 HTTPS_PROXY / HTTP_PROXY，Node fetch 可能无法访问 Gemini');
}

type HealthChatFn = (message: string, userId: string) => Promise<{
  action?: { type?: string; data?: unknown };
}>;

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

interface EvalResult {
  id: string;
  input: string;
  expected: string;
  actual: string;
  pass: boolean;
  reason: string;
  latencyMs: number;
}

const EVAL_ROOT = path.resolve(__dirname, '..');
const CASES_PATH = path.resolve(
  EVAL_ROOT,
  process.env.EVAL_CASES_FILE || 'datasets/historical/intent-eval-cases.json'
);
const DELAY_MS = parseInt(process.env.EVAL_DELAY_MS || '1500', 10);
const EVAL_USER_ID = process.env.EVAL_USER_ID || 'intent-eval-user';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseActionData(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (typeof data === 'number') {
    return { value: data };
  }
  return data as Record<string, unknown>;
}

function validateFields(data: unknown, expected?: ExpectedFields): { ok: boolean; reason: string } {
  if (!expected) return { ok: true, reason: '无字段校验' };

  const parsed = parseActionData(data);

  if (expected.type && parsed.type !== expected.type) {
    return { ok: false, reason: `type 期望 ${expected.type}，实际 ${parsed.type ?? '缺失'}` };
  }

  if (expected.valueMin !== undefined || expected.valueMax !== undefined) {
    const value = Number(parsed.value);
    if (Number.isNaN(value)) {
      return { ok: false, reason: '缺少数值 value' };
    }
    if (expected.valueMin !== undefined && value < expected.valueMin) {
      return { ok: false, reason: `value ${value} < ${expected.valueMin}` };
    }
    if (expected.valueMax !== undefined && value > expected.valueMax) {
      return { ok: false, reason: `value ${value} > ${expected.valueMax}` };
    }
  }

  if (expected.scheduleTime && parsed.scheduleTime !== expected.scheduleTime) {
    return { ok: false, reason: `scheduleTime 期望 ${expected.scheduleTime}，实际 ${parsed.scheduleTime ?? '缺失'}` };
  }

  if (expected.scheduleType && parsed.scheduleType !== expected.scheduleType) {
    return { ok: false, reason: `scheduleType 期望 ${expected.scheduleType}，实际 ${parsed.scheduleType ?? '缺失'}` };
  }

  if (expected.days !== undefined && Number(parsed.days) !== expected.days) {
    return { ok: false, reason: `days 期望 ${expected.days}，实际 ${parsed.days ?? '缺失'}` };
  }

  return { ok: true, reason: '字段校验通过' };
}

async function evaluateCase(testCase: EvalCase, healthChat: HealthChatFn): Promise<EvalResult> {
  const start = Date.now();

  if (testCase.expectedIntent === 'emergency_alert') {
    const lang = detectLanguage(testCase.input);
    const isEmergency = detectEmergency(testCase.input, lang);
    const actual = isEmergency ? 'emergency_alert' : 'none';
    return {
      id: testCase.id,
      input: testCase.input,
      expected: testCase.expectedIntent,
      actual,
      pass: isEmergency,
      reason: isEmergency ? '规则引擎命中紧急关键词' : '未检测到紧急情况',
      latencyMs: Date.now() - start,
    };
  }

  try {
    const result = await healthChat(testCase.input, EVAL_USER_ID);
    const actual = result.action?.type || 'general_advice';
    const latencyMs = Date.now() - start;

    if (testCase.expectedIntent === 'general_advice') {
      const pass = !result.action?.type;
      return {
        id: testCase.id,
        input: testCase.input,
        expected: testCase.expectedIntent,
        actual,
        pass,
        reason: pass ? '未触发业务 Action（符合预期）' : `误触发 Action: ${actual}`,
        latencyMs,
      };
    }

    if (actual !== testCase.expectedIntent) {
      return {
        id: testCase.id,
        input: testCase.input,
        expected: testCase.expectedIntent,
        actual,
        pass: false,
        reason: `意图类型不匹配`,
        latencyMs,
      };
    }

    const fieldCheck = validateFields(result.action?.data, testCase.expectedFields);
    return {
      id: testCase.id,
      input: testCase.input,
      expected: testCase.expectedIntent,
      actual,
      pass: fieldCheck.ok,
      reason: fieldCheck.reason,
      latencyMs,
    };
  } catch (error: any) {
    return {
      id: testCase.id,
      input: testCase.input,
      expected: testCase.expectedIntent,
      actual: 'error',
      pass: false,
      reason: error?.message || String(error),
      latencyMs: Date.now() - start,
    };
  }
}

function printSummary(results: EvalResult[]) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const accuracy = ((passed / total) * 100).toFixed(1);

  const byCategory = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    const cat = r.id.split('-')[0];
    const stat = byCategory.get(cat) || { pass: 0, total: 0 };
    stat.total += 1;
    if (r.pass) stat.pass += 1;
    byCategory.set(cat, stat);
  }

  console.log('\n========== 评测结果 ==========');
  console.log(`总准确率: ${passed}/${total} = ${accuracy}%`);
  console.log(`平均延迟: ${Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / total)} ms`);

  console.log('\n分类准确率:');
  for (const [cat, stat] of byCategory) {
    const pct = ((stat.pass / stat.total) * 100).toFixed(0);
    console.log(`  ${cat}: ${stat.pass}/${stat.total} (${pct}%)`);
  }

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.log('\n未通过用例:');
    for (const f of failed) {
      console.log(`  [${f.id}] 期望=${f.expected} 实际=${f.actual}`);
      console.log(`         输入: ${f.input}`);
      console.log(`         原因: ${f.reason}`);
    }
  }

  console.log('\n简历可用表述示例:');
  console.log(`  「${total}条标准话术评测，端到端意图识别准确率 ${accuracy}%」`);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  未检测到 GEMINI_API_KEY，将使用 chatService 内置 fallback key');
  }

  const { ChatService } = await import('../../../src/services/ai/chatService');
  const healthChat = ChatService.healthChat.bind(ChatService);

  const cases: EvalCase[] = JSON.parse(fs.readFileSync(CASES_PATH, 'utf-8'));
  console.log(`开始评测 ${cases.length} 条用例（间隔 ${DELAY_MS}ms）...\n`);

  const results: EvalResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    process.stdout.write(`[${i + 1}/${cases.length}] ${testCase.id} ... `);

    const result = await evaluateCase(testCase, healthChat);
    results.push(result);

    console.log(result.pass ? '✓ PASS' : '✗ FAIL');
    if (i < cases.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  printSummary(results);

  const reportPath = path.resolve(
    EVAL_ROOT,
    process.env.EVAL_REPORT_FILE || 'results/legacy/intent-eval-report.json'
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\n详细报告已保存: ${reportPath}`);
}

main().catch((err) => {
  console.error('评测失败:', err);
  process.exit(1);
});
