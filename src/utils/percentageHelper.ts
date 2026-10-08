/**
 * Percentage Parsing and Formatting Helpers
 * Supports free-form input including Thai prefixes, decimals (e.g. 88.86, 100.5, .75), percentages, Thai numerals, and spaces.
 * Examples: "88.86", "ร้อยละ 88.86", "จำนวนร้อยละ 88.86", "88.86%", "ร้อยละ 88.86%", "88,86", "ร้อยละ ๘๘.๘๖", etc.
 */

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

/**
 * Converts Thai numerals (๐-๙) to Arabic digits (0-9)
 */
export function convertThaiNumerals(str: string): string {
  return str.replace(/[๐-๙]/g, (ch) => {
    const idx = THAI_DIGITS.indexOf(ch);
    return idx >= 0 ? String(idx) : ch;
  });
}

/**
 * Intelligently extracts floating number percentage from any string or number input.
 * Handles Thai text, Thai numerals, symbols, spaces, commas, and decimals.
 * Not restricted to integers - preserves decimal precision.
 *
 * @param raw Input value (number, string, undefined, null)
 * @param defaultVal Default fallback number if nothing parsed
 * @returns Number (float, e.g. 88.86, 100.5)
 */
export function parseFlexiblePercentage(raw?: any, defaultVal = 0): number {
  if (typeof raw === 'number') {
    return isNaN(raw) ? defaultVal : raw;
  }
  if (raw === undefined || raw === null) {
    return defaultVal;
  }
  let str = String(raw).trim();
  if (!str) return defaultVal;

  // Convert Thai numerals to standard Arabic digits
  str = convertThaiNumerals(str);

  // Replace comma decimal with period (e.g. 88,86 -> 88.86)
  str = str.replace(/,/g, '.');

  // Match decimal and integer numbers with optional Thai percentage prefix or percentage sign
  // Supports patterns like:
  // "88.86", "ร้อยละ 88.86", "ร้อยละ88.86", "จำนวนร้อยละ 88.86", "88.86%", "ร้อยละ 88.86%",
  // "100.0", "100.50", ".85", "0.85", "ร้อยละ 100.00"
  const match = str.match(
    /(?:ร้อยละ|จำนวนร้อยละ|คิดเป็นร้อยละ|ไม่ต่ำกว่าร้อยละ|มากกว่าร้อยละ|เป้าหมาย|ผลสำเร็จ)?\s*(\d+(?:\.\d+)?|\.\d+)\s*%?/i
  );
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? defaultVal : val;
  }

  // Fallback: extract any decimal or integer number found anywhere in the string
  const numMatch = str.match(/(\d+(?:\.\d+)?|\.\d+)/);
  if (numMatch && numMatch[1]) {
    const val = parseFloat(numMatch[1]);
    return isNaN(val) ? defaultVal : val;
  }

  return defaultVal;
}

/**
 * Format value to standard string percentage, preserving decimals (e.g. "88.86%", "100%")
 */
export function formatPercentDisplay(val: any): string {
  const num = parseFlexiblePercentage(val, 0);
  return `${num}%`;
}

/**
 * Format value with Thai prefix, preserving decimals (e.g. "ร้อยละ 88.86%", "ร้อยละ 100%")
 */
export function formatThaiPercentDisplay(val: any): string {
  const num = parseFlexiblePercentage(val, 0);
  return `ร้อยละ ${num}%`;
}

/**
 * Auto-formats percentage to decimal representation (e.g. 85 -> "85.00", 88.86 -> "88.86", 100 -> "100.00")
 * Allows any number without restrictions and formats cleanly on blur or entry.
 */
export function formatAutoDecimalPercentage(raw?: any): string {
  if (raw === undefined || raw === null || String(raw).trim() === '') return '';
  const cleanStr = String(raw).trim().replace(/%/g, '');
  const num = parseFlexiblePercentage(cleanStr, NaN);
  if (isNaN(num)) return cleanStr;
  // If it's a valid number, format to at least 2 decimal places (e.g. 85 -> "85.00", 85.5 -> "85.50", 88.86 -> "88.86")
  return num.toFixed(2);
}
