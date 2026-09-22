const fullWidthOffset = 0xfee0;

const chineseDigitMap: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

export function parseChineseNumber(raw: string): number | null {
  if (/^\d+$/.test(raw)) return Number(raw);
  if (raw === '十') return 10;
  if (raw.startsWith('十')) return 10 + (chineseDigitMap[raw[1]] ?? 0);
  if (raw.endsWith('十')) return (chineseDigitMap[raw[0]] ?? 0) * 10;
  if (raw.includes('十')) {
    const [tens, ones] = raw.split('十');
    return (chineseDigitMap[tens] ?? 0) * 10 + (chineseDigitMap[ones] ?? 0);
  }
  return chineseDigitMap[raw] ?? null;
}

/** Normalize typography and measurement aliases without changing user meaning. */
export function normalizeUserInput(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[！？，。；：]/g, (char) => ({
      '！': '!',
      '？': '?',
      '，': ',',
      '。': '.',
      '；': ';',
      '：': ':',
    }[char] || char))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - fullWidthOffset))
    .replace(/毫摩尔\s*\/?\s*升/gi, 'mmol/L')
    .replace(/毫克\s*\/?\s*分升/gi, 'mg/dL')
    .replace(/mmol\s*\/\s*l/gi, 'mmol/L')
    .replace(/mg\s*\/\s*dl/gi, 'mg/dL')
    .replace(/\s+/g, ' ')
    .trim();
}

