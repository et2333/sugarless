/** 统一 Action 字段格式，兼容规则引擎与 LLM 输出 */
export function normalizeScheduleTime(raw: unknown, sourceMessage = ''): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  const ampm = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const minute = ampm[2] || '00';
    const meridiem = ampm[3].toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const hm = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    let hour = parseInt(hm[1], 10);
    const hasPmContext = /\bpm\b|tonight|evening|afternoon|下午|晚上|今晚/i.test(sourceMessage);
    const hasAmContext = /\bam\b|morning|早上|上午|清晨/i.test(sourceMessage);
    if (hasPmContext && hour >= 1 && hour <= 11) hour += 12;
    if (hasAmContext && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${hm[2]}`;
  }

  return raw.trim();
}

export function normalizeGlucoseType(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const key = raw.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const map: Record<string, string> = {
    post_lunch: 'post_prandial',
    post_dinner: 'post_prandial',
    post_meal: 'post_prandial',
    postprandial: 'post_prandial',
    pre_meal: 'fasting',
    before_meal: 'fasting',
    bedtime: 'random',
    空腹: 'fasting',
    空腹血糖: 'fasting',
    餐后: 'post_prandial',
    餐后2小时: 'post_prandial',
    随机: 'random',
    随机血糖: 'random',
  };
  return map[key] || raw;
}

export function normalizeActionData(
  type: string | undefined,
  data: unknown,
  sourceMessage = ''
): Record<string, unknown> | undefined {
  if (!data || typeof data !== 'object') return data as Record<string, unknown> | undefined;

  const parsed = { ...(data as Record<string, unknown>) };

  if (type === 'create_reminder' && parsed.scheduleTime) {
    parsed.scheduleTime = normalizeScheduleTime(String(parsed.scheduleTime), sourceMessage) ?? parsed.scheduleTime;
  }

  if (type === 'create_reminder' && parsed.scheduleType) {
    const st = String(parsed.scheduleType).toLowerCase();
    if (st === 'one-time' || st === 'one_time') parsed.scheduleType = 'once';
  }

  if (type === 'record_glucose' && parsed.type) {
    parsed.type = normalizeGlucoseType(String(parsed.type)) ?? parsed.type;
  }

  return parsed;
}
