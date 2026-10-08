import {
  EducationLevel,
  ParsedBulkProjectItem,
  ProjectStatus,
  PROJECT_STATUSES,
  STRATEGIES,
} from '../types';
import { parseFlexiblePercentage } from './percentageHelper';

export type DetectedFormat =
  | 'tsv_excel'
  | 'csv'
  | 'key_value_blocks'
  | 'numbered_list'
  | 'pipe_delimited'
  | 'plain_lines';

export type SupportedField =
  | 'name'
  | 'responsiblePerson'
  | 'strategy'
  | 'budget'
  | 'targetQuantityPercent'
  | 'targetQualityDesc'
  | 'resultQuantityPercent'
  | 'resultQualityDesc'
  | 'standards'
  | 'status'
  | 'level'
  | 'academicYear'
  | 'ignore';

export const FIELD_LABELS: Record<SupportedField, string> = {
  name: 'ชื่อโครงการ (Name) *',
  responsiblePerson: 'ผู้รับผิดชอบ (Responsible)',
  strategy: 'ยุทธศาสตร์ (Strategy)',
  budget: 'งบประมาณ (Budget)',
  targetQuantityPercent: 'เป้าหมายเชิงปริมาณ % (Quantity Target %)',
  targetQualityDesc: 'เป้าหมายเชิงคุณภาพ (Quality Target Desc / %)',
  resultQuantityPercent: 'ผลการดำเนินงานเชิงปริมาณ % (Result %)',
  resultQualityDesc: 'ผลการดำเนินงานเชิงคุณภาพ (Quality Result Desc)',
  standards: 'มาตรฐานการศึกษา (Standards)',
  status: 'สถานะโครงการ (Status)',
  level: 'ระดับการศึกษา (Level)',
  academicYear: 'ปีการศึกษา (Year)',
  ignore: 'ข้าม / ไม่นำเข้า (Ignore)',
};

export interface ColumnMappingItem {
  colIndex: number;
  sampleValue: string;
  detectedField: SupportedField;
  headerText?: string;
}

export interface ExtractionStats {
  withQuantityPercent: number;
  avgQuantityPercent: number;
  withQualityDesc: number;
  withQualityPercentInText: number;
  withResultQuantity: number;
  withResultQuality: number;
  withBudget: number;
  totalBudget: number;
}

export interface ParseResult {
  formatDetected: DetectedFormat;
  totalLines: number;
  validProjects: ParsedBulkProjectItem[];
  warnings: string[];
  detectedColumns?: ColumnMappingItem[];
  rawRowsSample?: string[][];
  stats?: ExtractionStats;
}

/**
 * Match raw string to official CMC Strategy (1 through 6)
 */
export function matchStrategy(raw?: string): string {
  if (!raw) return STRATEGIES[0];
  const cleaned = raw.trim();

  // 1. Direct contains check
  for (const s of STRATEGIES) {
    if (s.toLowerCase().includes(cleaned.toLowerCase()) || cleaned.toLowerCase().includes(s.toLowerCase())) {
      return s;
    }
  }

  // 2. Numbered match (1 - 6)
  const numMatch = cleaned.match(/(?:ยุทธศาสตร์(?:ที่)?\s*|strategy\s*|ยุทธศาสตร์\s*ที่\s*|ที่\s*)([1-6])/i);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < STRATEGIES.length) {
      return STRATEGIES[idx];
    }
  }

  // 3. Keyword semantic heuristics
  if (/(คริสเตียน|คริสตจริยธรรม|จริยธรรม|คุณธรรม|ศรัทธา|จิตอาสา|อัตลักษณ์|นมัสการ|ศาสนา|โบสถ์)/i.test(cleaned)) {
    return STRATEGIES[0]; // ยุทธศาสตร์ 1
  }
  if (/(วิชาการ|ผลสัมฤทธิ์|หลักสูตร|การเรียนรู้|สมรรถนะ|STEM|วิทยาศาสตร์|คณิตศาสตร์|ภาษา|O-NET|ทักษะวิชาชีพ|สื่อการสอน|เทคโนโลยี|ศตวรรษที่)/i.test(cleaned)) {
    return STRATEGIES[1]; // ยุทธศาสตร์ 2
  }
  if (/(ครู|บุคลากร|ศักยภาพครู|อบรมครู|พัฒนาครู|วิชาชีพครู|การจัดการเรียนการสอน|PLC)/i.test(cleaned)) {
    return STRATEGIES[2]; // ยุทธศาสตร์ 3
  }
  if (/(บริหาร|จัดการ|สภาพแวดล้อม|อาคาร|ภูมิทัศน์|เทคโนโลยี|ดิจิทัล|ระบบสารสนเทศ|ความปลอดภัย|บริการ|ซ่อมบำรุง|ยานพาหนะ)/i.test(cleaned)) {
    return STRATEGIES[3]; // ยุทธศาสตร์ 4
  }
  if (/(เครือข่าย|ความร่วมมือ|แลกเปลี่ยน|วิชาการภายนอก|ต่างประเทศ|ชุมชน|มหาวิทยาลัย|ศิษย์เก่า|ผู้ปกครอง)/i.test(cleaned)) {
    return STRATEGIES[4]; // ยุทธศาสตร์ 5
  }
  if (/(ประกันคุณภาพ|ประเมินคุณภาพ|สมศ|SAR|มาตรฐาน|เกณฑ์)/i.test(cleaned)) {
    return STRATEGIES[5]; // ยุทธศาสตร์ 6
  }

  return STRATEGIES[0];
}

/**
 * Match raw string to EducationLevel
 */
export function matchEducationLevel(raw?: string, defaultLevel: EducationLevel = 'basic_education'): EducationLevel {
  if (!raw) return defaultLevel;
  const s = raw.toLowerCase();
  if (s.includes('ปฐมวัย') || s.includes('อนุบาล') || s.includes('early') || /อ\.\s*[1-3]/.test(s)) {
    return 'early_childhood';
  }
  if (s.includes('ขั้นพื้นฐาน') || s.includes('ประถม') || s.includes('มัธยม') || s.includes('basic') || /ป\.\s*[1-6]|ม\.\s*[1-6]/.test(s)) {
    return 'basic_education';
  }
  return defaultLevel;
}

/**
 * Match raw string to official CMC ProjectStatus
 */
export function matchStatus(raw?: string): ProjectStatus {
  if (!raw) return '6. ยังไม่ดำเนินการ';
  const cleaned = raw.trim();

  // Direct match
  for (const st of PROJECT_STATUSES) {
    if (st.includes(cleaned) || cleaned.includes(st)) {
      return st;
    }
  }

  // Numbered match (1 - 6)
  const numMatch = cleaned.match(/^([1-6])[\.\s]/);
  if (numMatch) {
    const num = numMatch[1];
    const found = PROJECT_STATUSES.find((s) => s.startsWith(`${num}.`));
    if (found) return found;
  }

  // Keywords heuristics
  if (/(ส่งเล่ม.*เรียบร้อย|เสร็จสิ้น.*ส่งเล่ม|ส่งรายงานเรียบร้อย|เสร็จสมบูรณ์|ผ่านการอนุมัติ|อนุมัติแล้ว)/i.test(cleaned)) {
    return '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว';
  }
  if (/(ค้างส่ง|ยังไม่ส่งเล่ม|เสร็จสิ้น.*ค้างส่ง|รอส่งเล่ม|จัดทำเล่มสรุป)/i.test(cleaned)) {
    return '2. ดำเนินการเสร็จสิ้น ค้างส่งเล่มสรุปโครงการ';
  }
  if (/(แก้ไขเล่ม|รอแก้ไข|ส่งกลับแก้ไข|ปรับปรุงเล่ม|ให้แก้ไข)/i.test(cleaned)) {
    return '3. รอแก้ไขเล่มโครงการ';
  }
  if (/(ยกเลิก|ยุบโครงการ|ระงับ|ยกเลิกโครงการ|ไม่อนุมัติ)/i.test(cleaned)) {
    return '4. ยกเลิกโครงการ';
  }
  if (/(ตลอดปี|ดำเนินการตลอด|ต่อเนื่องทั้งปี|ตลอดปีการศึกษา)/i.test(cleaned)) {
    return '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)';
  }
  if (/(กำลัง|ระหว่าง|ดำเนินการอยู่|อยู่ระหว่าง|กำลังดำเนินงาน)/i.test(cleaned)) {
    return '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)';
  }

  return '6. ยังไม่ดำเนินการ';
}

/**
 * Clean project name from prefixes, numbering, bullet points, and outer quotes
 */
export function cleanProjectName(name: string): string {
  let cleaned = (name || '').trim();
  // Strip outer quotes
  cleaned = cleaned.replace(/^["'“”‘’](.*)["'“”‘’]$/, '$1').trim();
  // Strip redundant leading numbers e.g. "1.", "1.1", "1)", "[1]", "ข้อ 1.", "ลำดับที่ 1.", "โครงการที่ 1:"
  cleaned = cleaned.replace(/^(?:(?:ลำดับที่?|โครงการที่?|ข้อที่?|รายการที่?)\s*)?\d+(?:\.\d+)*[\.\)\:\-\s]\s*/i, '');
  // Strip leading bullet symbols or dashes
  cleaned = cleaned.replace(/^[\-\•\*\–\—\–\>\s]+/, '');
  // Strip trailing spaces, semicolons, and commas
  cleaned = cleaned.replace(/[\;\,\s]+$/, '');
  return cleaned.trim();
}

/**
 * Clean responsible person name (strip roles, extra punctuation)
 */
export function cleanResponsiblePerson(name?: string, defaultVal = 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน'): string {
  if (!name) return defaultVal;
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^["'“”‘’](.*)["'“”‘’]$/, '$1').trim();
  cleaned = cleaned.replace(/^(?:ผู้รับผิดชอบ|ครูผู้รับผิดชอบ|ผู้จัดทำ|ครู|เจ้าของโครงการ|ฝ่ายงาน|กลุ่มสาระ)\s*[\:\-\s]\s*/i, '');
  cleaned = cleaned.replace(/[\;\,\s]+$/, '');
  return cleaned.trim() || defaultVal;
}

/**
 * Clean and parse budget numbers e.g. "15,000 บาท", "15000.-" -> 15000
 */
export function parseBudget(raw?: any): number {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const str = String(raw).replace(/,/g, '').replace(/บาท/g, '').replace(/\.\-/g, '').trim();
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

/**
 * Clean and parse pure percentage numbers e.g. "100%", "ร้อยละ 85", "88.86", "ร้อยละ 88.86"
 */
export function parsePercentage(raw?: any, defaultVal = 100): number {
  return parseFlexiblePercentage(raw, defaultVal);
}

/**
 * Deep Target Extraction:
 * Intelligently separates Quantity Target (%) and Quality Target Description
 * from any composite text, cell, or line.
 *
 * Examples handled:
 * - "ร้อยละ 85 ของนักเรียนมีผลสัมฤทธิ์ทางการเรียนผ่านเกณฑ์"
 *   -> quantity: 85, quality: "นักเรียนมีผลสัมฤทธิ์ทางการเรียนผ่านเกณฑ์"
 * - "เป้าหมายเชิงปริมาณ: ร้อยละ 80 เป้าหมายเชิงคุณภาพ: นักเรียนมีความรู้..."
 *   -> quantity: 80, quality: "นักเรียนมีความรู้..."
 * - "85%" -> quantity: 85, quality: undefined
 * - "นักเรียนทุกคนมีระเบียบวินัย" -> quantity: undefined, quality: "นักเรียนทุกคนมีระเบียบวินัย"
 */
export function extractTargetComponents(raw?: any): {
  quantityPercent?: number;
  qualityDesc?: string;
  hasExplicitQuantity: boolean;
  hasExplicitQuality: boolean;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { hasExplicitQuantity: false, hasExplicitQuality: false };
  }

  if (typeof raw === 'number') {
    return {
      quantityPercent: Math.min(100, Math.max(0, raw)),
      hasExplicitQuantity: true,
      hasExplicitQuality: false,
    };
  }

  const str = String(raw).trim();
  let quantityPercent: number | undefined = undefined;
  let qualityDesc: string | undefined = undefined;
  let hasExplicitQuantity = false;
  let hasExplicitQuality = false;

  const isQualityIndicator = (text: string) =>
    /(?:คุณภาพ|ผลสัมฤทธิ์|ผ่านเกณฑ์|ความพึงพอใจ|ทักษะ|ความรู้|บรรลุ|มาตรฐาน|สมรรถนะ|คุณลักษณะ|พฤติกรรม|พัฒนาการ|ระดับดี|เกณฑ์|CEFR)/i.test(text);

  // Pattern 1: Explicit labels "เป้าหมายเชิงปริมาณ: ... เป้าหมายเชิงคุณภาพ: ..." or "ปริมาณ: ... คุณภาพ: ..."
  const hasQuantityLabel = /(?:เป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมาย|ค่าเป้าหมายเชิงปริมาณ|เชิงปริมาณ|ปริมาณ)\s*[\:\-\s]/i.test(str);
  const hasQualityLabel = /(?:เป้าหมายเชิงคุณภาพ|ร้อยละของเป้าหมายเชิงคุณภาพ|ร้อยละเป้าหมายเชิงคุณภาพ|ค่าเป้าหมายเชิงคุณภาพ|เชิงคุณภาพ|เป้าหมายคุณภาพ|ตัวชี้วัดเชิงคุณภาพ|คุณภาพ|วัตถุประสงค์)\s*[\:\-\s]/i.test(str);

  if (hasQuantityLabel || hasQualityLabel) {
    if (hasQuantityLabel) {
      const qMatches = str.match(/(?:เป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมาย|ค่าเป้าหมายเชิงปริมาณ|เชิงปริมาณ|ปริมาณ)\s*[\:\-\s]*([^\n]+)/i);
      if (qMatches) {
        let qVal = qMatches[1].split(/(?:เป้าหมายเชิงคุณภาพ|ร้อยละของเป้าหมายเชิงคุณภาพ|ร้อยละเป้าหมายเชิงคุณภาพ|ค่าเป้าหมายเชิงคุณภาพ|เชิงคุณภาพ|เป้าหมายคุณภาพ|ตัวชี้วัดเชิงคุณภาพ|คุณภาพ|วัตถุประสงค์|ผลการดำเนินงาน|งบประมาณ)[\:\-\s]/i)[0].trim();
        qVal = qVal.replace(/[\,\|\;]+$/, '').trim();
        const parsedPct = parsePercentage(qVal, -1);
        if (parsedPct >= 0) {
          quantityPercent = parsedPct;
          hasExplicitQuantity = true;
        }
      }
    }

    if (hasQualityLabel) {
      const qualMatches = str.match(/(?:เป้าหมายเชิงคุณภาพ|ร้อยละของเป้าหมายเชิงคุณภาพ|ร้อยละเป้าหมายเชิงคุณภาพ|ค่าเป้าหมายเชิงคุณภาพ|เชิงคุณภาพ|เป้าหมายคุณภาพ|ตัวชี้วัดเชิงคุณภาพ|คุณภาพ|วัตถุประสงค์)\s*[\:\-\s]*([^\n]+)/i);
      if (qualMatches) {
        let desc = qualMatches[1].split(/(?:เป้าหมายเชิงปริมาณ|เชิงปริมาณ|ปริมาณ|ผลการดำเนินงาน|งบประมาณ|สถานะ|ยุทธศาสตร์)[\:\-\s]/i)[0].trim();
        desc = desc.replace(/[\,\|\;]+$/, '').trim();
        if (desc) {
          const pureNumPct = parsePercentage(desc, -1);
          if (pureNumPct >= 0 && (/^\d+(?:\.\d+)?%?$/.test(desc) || /^ร้อยละ\s*\d+(?:\.\d+)?%?$/.test(desc))) {
            qualityDesc = `ร้อยละ ${pureNumPct} ของกลุ่มเป้าหมายมีคุณภาพบรรลุตามเกณฑ์มาตรฐาน`;
          } else {
            qualityDesc = desc;
          }
          hasExplicitQuality = true;
        }
      }
    }
  }

  // Pattern 2: Two percentages in single composite line (e.g. "ร้อยละ 80 ของนักเรียนเข้าร่วม และร้อยละ 85 มีผลสัมฤทธิ์ระดับดีขึ้นไป" or "80% / 85%")
  if (quantityPercent === undefined || !qualityDesc) {
    const twoPercents = [...str.matchAll(/(?:(?:ร้อยละ|คิดเป็นร้อยละ)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*%)/gi)];
    if (twoPercents.length >= 2) {
      const p1 = parseFloat(twoPercents[0][1] || twoPercents[0][2]);
      const p2 = parseFloat(twoPercents[1][1] || twoPercents[1][2]);

      if (!isNaN(p1) && !isNaN(p2)) {
        if (quantityPercent === undefined) {
          quantityPercent = Math.min(100, Math.max(0, p1));
          hasExplicitQuantity = true;
        }

        if (!qualityDesc) {
          const p2Index = twoPercents[1].index ?? 0;
          let subStr = str.substring(p2Index).trim();
          subStr = subStr.replace(/^และ\s*/, '').replace(/^[\,\|\;\/\-\s]+/, '').trim();
          if (subStr.length > 5 && !/^\d+$/.test(subStr)) {
            qualityDesc = subStr;
          } else {
            qualityDesc = `ร้อยละ ${p2} ของกลุ่มเป้าหมายมีคุณภาพบรรลุตามเกณฑ์มาตรฐาน`;
          }
          hasExplicitQuality = true;
        }
      }
    }
  }

  // Pattern 3: Standard single percentage detection if quantity is still undefined
  if (quantityPercent === undefined) {
    const pctMatch =
      str.match(/(?:ร้อยละ|จำนวนร้อยละ|คิดเป็นร้อยละ|ไม่ต่ำกว่าร้อยละ|มากกว่าร้อยละ)\s*(\d+(?:\.\d+)?)/i) ||
      str.match(/(\d+(?:\.\d+)?)\s*%/);

    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        quantityPercent = val;
        hasExplicitQuantity = true;
      }
    }
  }

  // Pattern 4: Quality Description detection from meaningful text (maintains full text including percentage!)
  if (!qualityDesc) {
    let candidate = str;
    candidate = candidate.replace(/^(?:เป้าหมาย|ค่าเป้าหมาย|เป้าหมายเชิงปริมาณและเชิงคุณภาพ)\s*[\:\-\s]*/gi, '');

    if (candidate.length >= 5 && isQualityIndicator(candidate)) {
      qualityDesc = candidate;
      hasExplicitQuality = true;
    } else if (candidate.length >= 8 && !/^\d+(?:\.\d+)?%?$/.test(candidate) && !/^ร้อยละ\s*\d+$/.test(candidate)) {
      qualityDesc = candidate;
      hasExplicitQuality = true;
    }
  }

  return {
    quantityPercent,
    qualityDesc,
    hasExplicitQuantity,
    hasExplicitQuality,
  };
}

/**
 * Deep Result Extraction:
 * Intelligently separates Quantity Result (%) and Quality Result Description
 * from any composite text, cell, or line.
 */
export function extractResultComponents(raw?: any): {
  resultPercent?: number;
  resultQualityDesc?: string;
  hasExplicitQuantity: boolean;
  hasExplicitQuality: boolean;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { hasExplicitQuantity: false, hasExplicitQuality: false };
  }

  if (typeof raw === 'number') {
    return {
      resultPercent: Math.min(100, Math.max(0, raw)),
      hasExplicitQuantity: true,
      hasExplicitQuality: false,
    };
  }

  const str = String(raw).trim();
  let resultPercent: number | undefined = undefined;
  let resultQualityDesc: string | undefined = undefined;
  let hasExplicitQuantity = false;
  let hasExplicitQuality = false;

  // Labeled checks
  const hasQuantLabel = /(?:ผลการดำเนินงานเชิงปริมาณ|ผลเชิงปริมาณ|ผลสำเร็จเชิงปริมาณ|ร้อยละของผลการดำเนินงาน|ความก้าวหน้า|ผลสัมฤทธิ์)\s*[\:\-\s]/i.test(str);
  const hasQualLabel = /(?:ผลการดำเนินงานเชิงคุณภาพ|ผลเชิงคุณภาพ|รายงานผลเชิงคุณภาพ|สรุปผลเชิงคุณภาพ|ผลการดำเนินงาน|ผลการจัดกิจกรรม|รายงานผล|สรุปผล)\s*[\:\-\s]/i.test(str);

  if (hasQuantLabel || hasQualLabel) {
    if (hasQuantLabel) {
      const qMatches = str.match(/(?:ผลการดำเนินงานเชิงปริมาณ|ผลเชิงปริมาณ|ผลสำเร็จเชิงปริมาณ|ร้อยละของผลการดำเนินงาน|ความก้าวหน้า|ผลสัมฤทธิ์)\s*[\:\-\s]*([^\n]+)/i);
      if (qMatches) {
        let qVal = qMatches[1].split(/(?:ผลการดำเนินงานเชิงคุณภาพ|ผลเชิงคุณภาพ|รายงานผลเชิงคุณภาพ|สรุปผลเชิงคุณภาพ|ผลการดำเนินงาน|งบประมาณ)[\:\-\s]/i)[0].trim();
        const val = parsePercentage(qVal, -1);
        if (val >= 0) {
          resultPercent = val;
          hasExplicitQuantity = true;
        }
      }
    }

    if (hasQualLabel) {
      const qualMatches = str.match(/(?:ผลการดำเนินงานเชิงคุณภาพ|ผลเชิงคุณภาพ|รายงานผลเชิงคุณภาพ|สรุปผลเชิงคุณภาพ|ผลการดำเนินงาน|ผลการจัดกิจกรรม|รายงานผล|สรุปผล)\s*[\:\-\s]*([^\n]+)/i);
      if (qualMatches) {
        let desc = qualMatches[1].split(/(?:ผลการดำเนินงานเชิงปริมาณ|ผลเชิงปริมาณ|งบประมาณ|สถานะ|ยุทธศาสตร์)[\:\-\s]/i)[0].trim();
        desc = desc.replace(/[\,\|\;]+$/, '').trim();
        if (desc && desc.length > 2) {
          resultQualityDesc = desc;
          hasExplicitQuality = true;
        }
      }
    }
  }

  // Two percentages check e.g. "90% / 95%"
  if (resultPercent === undefined || !resultQualityDesc) {
    const twoPercents = [...str.matchAll(/(?:(?:ร้อยละ|คิดเป็นร้อยละ)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*%)/gi)];
    if (twoPercents.length >= 2) {
      const p1 = parseFloat(twoPercents[0][1] || twoPercents[0][2]);
      const p2 = parseFloat(twoPercents[1][1] || twoPercents[1][2]);
      if (!isNaN(p1) && !isNaN(p2)) {
        if (resultPercent === undefined) {
          resultPercent = Math.min(100, Math.max(0, p1));
          hasExplicitQuantity = true;
        }
        if (!resultQualityDesc) {
          const p2Index = twoPercents[1].index ?? 0;
          let subStr = str.substring(p2Index).trim();
          subStr = subStr.replace(/^และ\s*/, '').replace(/^[\,\|\;\/\-\s]+/, '').trim();
          if (subStr.length > 5 && !/^\d+$/.test(subStr)) {
            resultQualityDesc = subStr;
          } else {
            resultQualityDesc = `ผลสำเร็จร้อยละ ${p2} บรรลุตามเกณฑ์คุณภาพที่กำหนด`;
          }
          hasExplicitQuality = true;
        }
      }
    }
  }

  // Standalone percent
  if (resultPercent === undefined) {
    const pctMatch =
      str.match(/(?:ร้อยละ|จำนวนร้อยละ|คิดเป็นร้อยละ)\s*(\d+(?:\.\d+)?)/i) ||
      str.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        resultPercent = val;
        hasExplicitQuantity = true;
      }
    }
  }

  // Descriptive text
  if (!resultQualityDesc) {
    let candidate = str.replace(/^(?:ผลการดำเนินงาน|สรุปผล|รายงานผล)\s*[\:\-\s]*/gi, '').trim();
    if (candidate.length >= 5 && !/^\d+(?:\.\d+)?%?$/.test(candidate) && !/^ร้อยละ\s*\d+$/.test(candidate)) {
      resultQualityDesc = candidate;
      hasExplicitQuality = true;
    }
  }

  return {
    resultPercent,
    resultQualityDesc,
    hasExplicitQuantity,
    hasExplicitQuality,
  };
}

/**
 * Auto-detect column semantic role from column header text or sample cell values
 */
export function guessFieldFromHeaderOrSample(headerText = '', sampleVal = ''): SupportedField {
  const h = headerText.toLowerCase().trim();
  const s = sampleVal.toLowerCase().trim();

  // 1. Check for Project Name
  if (
    h.includes('ชื่อโครงการ') ||
    h.includes('ชื่อกิจกรรม') ||
    h.includes('ชื่อ') ||
    h.includes('โครงการ') ||
    h.includes('กิจกรรม') ||
    h === 'name' ||
    h === 'project' ||
    h === 'title' ||
    h.includes('แผนงาน')
  ) {
    if (!h.includes('ผู้รับผิดชอบ') && !h.includes('สถานะ') && !h.includes('เป้าหมาย')) {
      return 'name';
    }
  }

  // 2. Check for Standards
  if (h.includes('มาตรฐาน') || h.includes('standard')) {
    return 'standards';
  }

  // 3. Check for Responsible Person
  if (
    h.includes('ผู้รับผิดชอบ') ||
    h.includes('ครู') ||
    h.includes('ผู้รายงาน') ||
    h.includes('ผู้จัดทำ') ||
    h.includes('เจ้าของ') ||
    h.includes('owner') ||
    h.includes('responsible') ||
    h.includes('กลุ่มสาระ') ||
    h.includes('ฝ่าย')
  ) {
    return 'responsiblePerson';
  }

  // 4. Check for Strategy
  if (h.includes('ยุทธศาสตร์') || h.includes('strategy') || h.includes('พันธกิจ')) {
    return 'strategy';
  }

  // 5. Check for Budget
  if (h.includes('งบ') || h.includes('budget') || h.includes('ยอดเงิน') || h.includes('บาท')) {
    return 'budget';
  }

  // 6. Target Quality Description - MUST CHECK BEFORE Target Quantity!
  // Prevents "เป้าหมายเชิงคุณภาพ (ร้อยละ)" or "ร้อยละของเป้าหมายเชิงคุณภาพ" from being misclassified as quantity
  if (
    h.includes('เป้าหมายเชิงคุณภาพ') ||
    h.includes('เชิงคุณภาพ') ||
    h.includes('เป้าหมายคุณภาพ') ||
    h.includes('ตัวชี้วัดเชิงคุณภาพ') ||
    h.includes('ค่าเป้าหมายเชิงคุณภาพ') ||
    h.includes('ร้อยละของเป้าหมายเชิงคุณภาพ') ||
    h.includes('ร้อยละเป้าหมายเชิงคุณภาพ') ||
    h.includes('เกณฑ์คุณภาพ') ||
    h.includes('วัตถุประสงค์') ||
    h.includes('จุดประสงค์') ||
    h.includes('ตัวชี้วัดความสำเร็จ') ||
    h.includes('target quality') ||
    h.includes('qualitative target') ||
    h.includes('objective')
  ) {
    return 'targetQualityDesc';
  }

  // 7. Target Quantity (%) - Explicit Priority Match
  if (
    h.includes('เป้าหมายเชิงปริมาณ') ||
    h.includes('เชิงปริมาณ') ||
    h.includes('จำนวนร้อยละของเป้าหมาย') ||
    h.includes('ร้อยละของเป้าหมาย') ||
    h.includes('ร้อยละเป้าหมาย') ||
    h.includes('เป้าหมาย(ร้อยละ)') ||
    h.includes('เป้าหมาย (ร้อยละ)') ||
    h.includes('เป้าหมาย %') ||
    h.includes('เป้าหมาย (%)') ||
    h.includes('เป้าหมาย(%)') ||
    h.includes('เป้าหมายร้อยละ') ||
    h.includes('target%') ||
    h.includes('target %') ||
    h.includes('target quantity') ||
    h.includes('quantitative target') ||
    h.includes('ค่าเป้าหมายเชิงปริมาณ') ||
    (h.includes('เป้าหมาย') && (h.includes('ปริมาณ') || h.includes('%') || h.includes('ร้อยละ')))
  ) {
    return 'targetQuantityPercent';
  }

  // General "เป้าหมาย" or "target" without specifying quality or quantity:
  if (h === 'เป้าหมาย' || h === 'ค่าเป้าหมาย' || h === 'target' || h.includes('ตัวชี้วัด')) {
    if (s.length > 15 && !s.includes('%') && !s.includes('ร้อยละ')) {
      return 'targetQualityDesc';
    }
    return 'targetQuantityPercent';
  }

  // 8. Result Quality - MUST CHECK BEFORE Result Quantity!
  if (
    h.includes('ผลการดำเนินงานเชิงคุณภาพ') ||
    h.includes('ผลเชิงคุณภาพ') ||
    h.includes('รายงานผลเชิงคุณภาพ') ||
    h.includes('สรุปผลเชิงคุณภาพ') ||
    (h.includes('ผล') && h.includes('คุณภาพ')) ||
    h.includes('รายงานผล') ||
    h.includes('สรุปผล') ||
    h.includes('ผลการดำเนินงาน') ||
    h.includes('ผลการจัดกิจกรรม') ||
    h.includes('result quality')
  ) {
    return 'resultQualityDesc';
  }

  // 9. Result Quantity (%)
  if (
    h.includes('ผลการดำเนินงานเชิงปริมาณ') ||
    h.includes('ผลเชิงปริมาณ') ||
    h.includes('ผลสำเร็จเชิงปริมาณ') ||
    h.includes('ความก้าวหน้า') ||
    h.includes('ผลสัมฤทธิ์') ||
    h.includes('ผลดำเนินงาน(ร้อยละ)') ||
    h.includes('ผลการดำเนินงาน (ร้อยละ)') ||
    h.includes('result %') ||
    h.includes('result quantity') ||
    (h.includes('ผล') && (h.includes('ปริมาณ') || h.includes('%') || h.includes('ร้อยละ')))
  ) {
    return 'resultQuantityPercent';
  }

  // 10. Check for Status
  if (h.includes('สถานะ') || h.includes('status') || h.includes('การส่งเล่ม') || h.includes('ความคืบหน้า')) {
    return 'status';
  }

  // 11. Check for Level
  if (h.includes('ระดับ') || h.includes('level') || h.includes('ชั้น')) {
    return 'level';
  }

  // 12. Check for Academic Year
  if (h.includes('ปีการศึกษา') || h.includes('ปี') || h.includes('year')) {
    return 'academicYear';
  }

  // 13. Check for Row number / Index (Ignore)
  if (h.includes('ลำดับ') || h.includes('ที่') || h === 'no' || h === 'no.' || h === '#') {
    return 'ignore';
  }

  // Fallback heuristic based on sample value
  if (s) {
    if (s.startsWith('โครงการ') || s.startsWith('กิจกรรม')) return 'name';
    if (s.startsWith('ยุทธศาสตร์')) return 'strategy';
    if (s.includes('มาตรฐานที่') || s.includes('คุณภาพเด็ก') || s.includes('คุณภาพผู้เรียน')) return 'standards';
    if (/^(ครู|นาย|นาง|น\.ส\.|ดร\.|อ\.|ฝ่าย|มาสเตอร์)/.test(s)) return 'responsiblePerson';
    if (/^\d{1,3}%$/.test(s) || /^ร้อยละ\s*\d+/.test(s)) return 'targetQuantityPercent';
    if (s.includes('ส่งเล่ม') || s.includes('ดำเนินการ')) return 'status';
    if (/^\d+$/.test(s) && parseInt(s, 10) < 200) return 'ignore';
  }

  return 'ignore';
}

/**
 * Intelligent Multi-format Project Parser with Deep Extraction
 */
export function parsePastedProjects(
  rawText: string,
  defaults: {
    academicYear: number;
    level: EducationLevel;
    strategy: string;
    defaultResponsible?: string;
  },
  customColumnMap?: Record<number, SupportedField>
): ParseResult {
  const text = (rawText || '').trim();

  if (!text) {
    return {
      formatDetected: 'plain_lines',
      totalLines: 0,
      validProjects: [],
      warnings: [],
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Check for TSV (Excel / Google Sheets copy-paste)
  const tabLines = lines.filter((l) => l.includes('\t'));
  if (tabLines.length > 0 && tabLines.length >= lines.length * 0.35) {
    return parseTabularData(lines, '\t', 'tsv_excel', defaults, customColumnMap);
  }

  // 2. Check for CSV
  const commaLines = lines.filter((l) => l.includes(',') && !l.includes('\t'));
  if (commaLines.length > 0 && commaLines.length >= lines.length * 0.45) {
    return parseTabularData(lines, ',', 'csv', defaults, customColumnMap);
  }

  // 3. Check for Pipe-delimited (|)
  const pipeLines = lines.filter((l) => l.includes('|'));
  if (pipeLines.length > 0 && pipeLines.length >= lines.length * 0.4) {
    return parseTabularData(lines, '|', 'pipe_delimited', defaults, customColumnMap);
  }

  // 4. Check for Key-Value / Detailed Paragraph Blocks
  if (
    text.includes('ชื่อโครงการ:') ||
    text.includes('โครงการ:') ||
    text.includes('ผู้รับผิดชอบ:') ||
    text.includes('งบประมาณ:') ||
    text.includes('ยุทธศาสตร์:') ||
    text.includes('เป้าหมายเชิงปริมาณ:') ||
    text.includes('เป้าหมายเชิงคุณภาพ:') ||
    text.includes('ร้อยละของเป้าหมาย:')
  ) {
    return parseKeyValueBlocks(lines, defaults);
  }

  // 5. Parse as Numbered or Bulleted List with inline attributes
  return parseDelimitedLines(lines, defaults);
}

/**
 * Parse Tabular rows (TSV from Google Sheets / Excel, or CSV) with column auto-mapping
 * and deep target (quantity + quality) extraction.
 */
function parseTabularData(
  lines: string[],
  delimiter: string,
  format: DetectedFormat,
  defaults: { academicYear: number; level: EducationLevel; strategy: string; defaultResponsible?: string },
  customColumnMap?: Record<number, SupportedField>
): ParseResult {
  const warnings: string[] = [];
  const validProjects: ParsedBulkProjectItem[] = [];

  const splitRow = (rowStr: string): string[] => {
    if (delimiter === '\t') {
      return rowStr.split('\t').map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
    }
    if (delimiter === '|') {
      return rowStr.split('|').map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
    }
    // Simple CSV splitter handling quoted cells
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const cols: string[] = [];
    let match;
    while ((match = regex.exec(rowStr)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      cols.push(val.trim());
    }
    return cols.length > 0 ? cols : rowStr.split(',').map((c) => c.trim());
  };

  const parsedMatrix = lines.map(splitRow);
  if (parsedMatrix.length === 0) {
    return { formatDetected: format, totalLines: 0, validProjects: [], warnings: [] };
  }

  // Detect header row
  const firstRow = parsedMatrix[0];
  const isHeader = firstRow.some((col) => {
    const c = col.toLowerCase();
    return (
      c.includes('โครงการ') ||
      c.includes('ชื่อ') ||
      c.includes('ผู้รับผิดชอบ') ||
      c.includes('ยุทธศาสตร์') ||
      c.includes('งบ') ||
      c.includes('เป้าหมาย') ||
      c.includes('สถานะ') ||
      c.includes('ลำดับ') ||
      c.includes('เชิงปริมาณ') ||
      c.includes('เชิงคุณภาพ') ||
      c === 'name' ||
      c === 'project'
    );
  });

  const headerRow = isHeader ? firstRow : [];
  const startIndex = isHeader ? 1 : 0;
  const sampleDataRow = parsedMatrix[startIndex] || [];

  // Determine column mapping
  const numCols = Math.max(...parsedMatrix.map((r) => r.length));
  const detectedColumns: ColumnMappingItem[] = [];

  for (let c = 0; c < numCols; c++) {
    const headerTitle = headerRow[c] || `คอลัมน์ ${c + 1}`;
    const sampleVal = sampleDataRow[c] || '';
    const field =
      customColumnMap && customColumnMap[c] !== undefined
        ? customColumnMap[c]
        : guessFieldFromHeaderOrSample(headerTitle, sampleVal);

    detectedColumns.push({
      colIndex: c,
      sampleValue: sampleVal,
      detectedField: field,
      headerText: headerRow[c] || undefined,
    });
  }

  // If no column is mapped to 'name', fallback to the first text column with length > 2
  if (!detectedColumns.some((col) => col.detectedField === 'name')) {
    let bestNameCol = 0;
    for (let c = 0; c < numCols; c++) {
      const sampleVal = sampleDataRow[c] || '';
      if (sampleVal.length > 3 && !/^\d+$/.test(sampleVal)) {
        bestNameCol = c;
        break;
      }
    }
    if (detectedColumns[bestNameCol]) {
      detectedColumns[bestNameCol].detectedField = 'name';
    }
  }

  // Iterate over data rows
  for (let i = startIndex; i < parsedMatrix.length; i++) {
    const cols = parsedMatrix[i];
    if (cols.length === 0 || cols.every((c) => c === '')) continue;

    const rowData: Partial<ParsedBulkProjectItem> = {
      academicYear: defaults.academicYear,
      level: defaults.level,
      strategy: defaults.strategy,
      responsiblePerson: defaults.defaultResponsible || 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน',
      targetQuantityPercent: 100,
      targetQualityDesc: 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
      resultQuantityPercent: 0,
      resultQualityDesc: 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน',
      status: '6. ยังไม่ดำเนินการ',
      budget: 0,
    };

    detectedColumns.forEach(({ colIndex, detectedField }) => {
      const val = cols[colIndex] ? cols[colIndex].trim() : '';
      if (!val) return;

      switch (detectedField) {
        case 'name':
          rowData.name = cleanProjectName(val);
          break;
        case 'responsiblePerson':
          rowData.responsiblePerson = cleanResponsiblePerson(val, defaults.defaultResponsible);
          break;
        case 'strategy':
          rowData.strategy = matchStrategy(val);
          break;
        case 'budget':
          rowData.budget = parseBudget(val);
          break;
        case 'targetQuantityPercent': {
          // Deep extraction: Even if assigned to quantity %, check if cell also contains quality description!
          const extracted = extractTargetComponents(val);
          if (extracted.quantityPercent !== undefined) {
            rowData.targetQuantityPercent = extracted.quantityPercent;
          }
          if (extracted.qualityDesc && extracted.hasExplicitQuality) {
            // Also assign quality if not already set by a dedicated quality column
            if (!rowData.targetQualityDesc || rowData.targetQualityDesc === 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด') {
              rowData.targetQualityDesc = extracted.qualityDesc;
            }
          }
          break;
        }
        case 'targetQualityDesc': {
          const extracted = extractTargetComponents(val);
          if (extracted.qualityDesc) {
            rowData.targetQualityDesc = extracted.qualityDesc;
          } else {
            const purePct = parsePercentage(val, -1);
            if (purePct >= 0) {
              rowData.targetQualityDesc = `ร้อยละ ${purePct} ของกลุ่มเป้าหมายมีคุณภาพบรรลุตามเกณฑ์มาตรฐาน`;
            } else {
              rowData.targetQualityDesc = val;
            }
          }
          // If quantity was embedded in quality column, extract it too
          if (extracted.quantityPercent !== undefined && rowData.targetQuantityPercent === 100) {
            rowData.targetQuantityPercent = extracted.quantityPercent;
          }
          break;
        }
        case 'standards': {
          const matchedStds: string[] = [];
          const isEarly = (rowData.level || defaults.level) === 'early_childhood';
          if (val.includes('1') || val.includes('คุณภาพเด็ก') || val.includes('คุณภาพผู้เรียน')) {
            matchedStds.push(isEarly ? 'มาตรฐานที่ 1 คุณภาพเด็ก' : 'มาตรฐานที่ 1 คุณภาพผู้เรียน');
          }
          if (val.includes('2') || val.includes('บริหาร')) {
            matchedStds.push('มาตรฐานที่ 2 กระบวนการบริหารและการจัดการ');
          }
          if (val.includes('3') || val.includes('ประสบการณ์') || val.includes('จัดการเรียน')) {
            matchedStds.push(
              isEarly
                ? 'มาตรฐานที่ 3 การจัดประสบการณ์ที่เน้นเด็กเป็นสำคัญ'
                : 'มาตรฐานที่ 3 กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ'
            );
          }
          if (matchedStds.length > 0) {
            rowData.standards = matchedStds;
          }
          break;
        }
        case 'resultQuantityPercent': {
          const extracted = extractResultComponents(val);
          if (extracted.resultPercent !== undefined) {
            rowData.resultQuantityPercent = extracted.resultPercent;
          }
          if (extracted.resultQualityDesc && extracted.hasExplicitQuality) {
            if (!rowData.resultQualityDesc || rowData.resultQualityDesc.includes('อยู่ระหว่างเตรียมการ')) {
              rowData.resultQualityDesc = extracted.resultQualityDesc;
            }
          }
          break;
        }
        case 'resultQualityDesc': {
          const extracted = extractResultComponents(val);
          if (extracted.resultQualityDesc) {
            rowData.resultQualityDesc = extracted.resultQualityDesc;
          } else {
            rowData.resultQualityDesc = val;
          }
          if (extracted.resultPercent !== undefined) {
            rowData.resultQuantityPercent = extracted.resultPercent;
          }
          break;
        }
        case 'status':
          rowData.status = matchStatus(val);
          break;
        case 'level':
          rowData.level = matchEducationLevel(val, defaults.level);
          break;
        case 'academicYear': {
          const yrMatch = val.match(/(25\d{2})/);
          if (yrMatch) rowData.academicYear = parseInt(yrMatch[1], 10);
          break;
        }
        case 'ignore':
        default:
          break;
      }
    });

    if (rowData.name && rowData.name.length >= 2) {
      validProjects.push(finalizeParsedProject(rowData, defaults, `row-${i}`));
    }
  }

  const stats = calculateExtractionStats(validProjects);

  return {
    formatDetected: format,
    totalLines: lines.length,
    validProjects,
    warnings,
    detectedColumns,
    rawRowsSample: parsedMatrix.slice(0, 5),
    stats,
  };
}

/**
 * Parse Key-Value / Multi-line paragraph blocks with deep target detection
 * e.g.:
 * ชื่อโครงการ: โครงการค่ายส่งเสริมทักษะวิทยาศาสตร์
 * ผู้รับผิดชอบ: ครูศิริพร บุญยืน
 * ยุทธศาสตร์: ยุทธศาสตร์ที่ 2
 * งบประมาณ: 20000
 * เป้าหมายเชิงปริมาณ: ร้อยละ 90 ของนักเรียน
 * เป้าหมายเชิงคุณภาพ: นักเรียนมีความรู้ความเข้าใจด้านการอนุรักษ์ธรรมชาติ
 * ผลการดำเนินงาน: ร้อยละ 95 ดำเนินการเสร็จสมบูรณ์
 */
function parseKeyValueBlocks(
  lines: string[],
  defaults: { academicYear: number; level: EducationLevel; strategy: string; defaultResponsible?: string }
): ParseResult {
  const validProjects: ParsedBulkProjectItem[] = [];
  let current: Partial<ParsedBulkProjectItem> | null = null;
  let counter = 0;

  const pushCurrent = () => {
    if (current?.name && current.name.length >= 2) {
      validProjects.push(finalizeParsedProject(current, defaults, `kv-${counter++}`));
    }
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      pushCurrent();
      continue;
    }

    // Check for new project indicator
    const isNewProjectLine =
      /^(?:ชื่อโครงการ|โครงการ|กิจกรรม)\s*[\:\-\s]/i.test(trimmed) ||
      /^(?:ลำดับที่|โครงการที่|ข้อที่)?\s*\d+[\.\)\:\-]\s*(?:โครงการ|กิจกรรม)/i.test(trimmed);

    if (isNewProjectLine) {
      pushCurrent();
      const namePart = trimmed.replace(/^(?:ชื่อโครงการ|โครงการ|กิจกรรม)\s*[\:\-\s]*/i, '');
      current = { name: cleanProjectName(namePart) };
      continue;
    }

    if (!current) {
      // First line of a new block without explicit label
      if (trimmed.length > 3 && !trimmed.includes(':')) {
        current = { name: cleanProjectName(trimmed) };
        continue;
      }
      current = {};
    }

    // Field matching
    if (/(?:ผู้รับผิดชอบ|ครูผู้รับผิดชอบ|ผู้จัดทำ|ครู|เจ้าของโครงการ|กลุ่มสาระ|ฝ่ายงาน)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      current.responsiblePerson = cleanResponsiblePerson(val, defaults.defaultResponsible);
    } else if (/(?:ยุทธศาสตร์|แผนงาน|พันธกิจ)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      current.strategy = matchStrategy(val);
    } else if (/(?:งบประมาณ|งบ|ยอดเงิน)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      current.budget = parseBudget(val);
    } else if (/(?:เป้าหมายเชิงคุณภาพ|ร้อยละของเป้าหมายเชิงคุณภาพ|ร้อยละเป้าหมายเชิงคุณภาพ|ตัวชี้วัดเชิงคุณภาพ|เป้าหมายคุณภาพ|เชิงคุณภาพ|วัตถุประสงค์)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const extracted = extractTargetComponents(val);
      if (extracted.qualityDesc) {
        current.targetQualityDesc = extracted.qualityDesc;
      } else {
        const purePct = parsePercentage(val, -1);
        current.targetQualityDesc = purePct >= 0 ? `ร้อยละ ${purePct} ของกลุ่มเป้าหมายมีคุณภาพบรรลุตามเกณฑ์มาตรฐาน` : val;
      }
      if (extracted.quantityPercent !== undefined && current.targetQuantityPercent === undefined) {
        current.targetQuantityPercent = extracted.quantityPercent;
      }
    } else if (/(?:เป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมาย|เป้าหมาย\s*\(ร้อยละ\)|เชิงปริมาณ|ปริมาณ)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const extracted = extractTargetComponents(val);
      if (extracted.quantityPercent !== undefined) {
        current.targetQuantityPercent = extracted.quantityPercent;
      }
      if (extracted.qualityDesc && !current.targetQualityDesc) {
        current.targetQualityDesc = extracted.qualityDesc;
      }
    } else if (/^(?:เป้าหมาย|ค่าเป้าหมาย)\s*[\:\-\s]/i.test(trimmed)) {
      // Generic "เป้าหมาย: ..."
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const extracted = extractTargetComponents(val);
      if (extracted.quantityPercent !== undefined) {
        current.targetQuantityPercent = extracted.quantityPercent;
      }
      if (extracted.qualityDesc) {
        current.targetQualityDesc = extracted.qualityDesc;
      }
    } else if (/(?:ผลการดำเนินงานเชิงคุณภาพ|ผลเชิงคุณภาพ|รายงานผลเชิงคุณภาพ|สรุปผลเชิงคุณภาพ|ผลสำเร็จ)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const extracted = extractResultComponents(val);
      current.resultQualityDesc = extracted.resultQualityDesc || val;
      if (extracted.resultPercent !== undefined && current.resultQuantityPercent === undefined) {
        current.resultQuantityPercent = extracted.resultPercent;
      }
    } else if (/(?:ผลการดำเนินงานเชิงปริมาณ|ผลเชิงปริมาณ|ผลสำเร็จเชิงปริมาณ|ผลดำเนินงาน\s*\(ร้อยละ\)|ความก้าวหน้า)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const extracted = extractResultComponents(val);
      if (extracted.resultPercent !== undefined) {
        current.resultQuantityPercent = extracted.resultPercent;
      }
      if (extracted.resultQualityDesc && !current.resultQualityDesc) {
        current.resultQualityDesc = extracted.resultQualityDesc;
      }
    } else if (/^(?:ผลการดำเนินงาน|ผลการจัดกิจกรรม|ผลการปฏิบัติงาน|สรุปผล|รายงานผล)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const extracted = extractResultComponents(val);
      if (extracted.resultPercent !== undefined) {
        current.resultQuantityPercent = extracted.resultPercent;
      }
      if (extracted.resultQualityDesc) {
        current.resultQualityDesc = extracted.resultQualityDesc;
      }
    } else if (/(?:มาตรฐาน|มาตรฐานการศึกษา)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      const isEarly = (current.level || defaults.level) === 'early_childhood';
      const matchedStds: string[] = [];
      if (val.includes('1') || val.includes('คุณภาพเด็ก') || val.includes('คุณภาพผู้เรียน')) {
        matchedStds.push(isEarly ? 'มาตรฐานที่ 1 คุณภาพเด็ก' : 'มาตรฐานที่ 1 คุณภาพผู้เรียน');
      }
      if (val.includes('2') || val.includes('บริหาร')) {
        matchedStds.push('มาตรฐานที่ 2 กระบวนการบริหารและการจัดการ');
      }
      if (val.includes('3') || val.includes('ประสบการณ์') || val.includes('จัดการเรียน')) {
        matchedStds.push(
          isEarly
            ? 'มาตรฐานที่ 3 การจัดประสบการณ์ที่เน้นเด็กเป็นสำคัญ'
            : 'มาตรฐานที่ 3 กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ'
        );
      }
      if (matchedStds.length > 0) current.standards = matchedStds;
    } else if (/(?:สถานะ|การส่งเล่ม|สถานะโครงการ)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      current.status = matchStatus(val);
    } else if (/(?:ระดับการศึกษา|ระดับ)\s*[\:\-\s]/i.test(trimmed)) {
      const val = trimmed.split(/[\:\-]/).slice(1).join(':').trim();
      current.level = matchEducationLevel(val, defaults.level);
    } else if (/(?:ปีการศึกษา|ปี)\s*[\:\-\s]/i.test(trimmed)) {
      const yrMatch = trimmed.match(/(25\d{2})/);
      if (yrMatch) current.academicYear = parseInt(yrMatch[1], 10);
    }
  }

  pushCurrent();

  const stats = calculateExtractionStats(validProjects);

  return {
    formatDetected: 'key_value_blocks',
    totalLines: lines.length,
    validProjects,
    warnings: [],
    stats,
  };
}

/**
 * Parse Delimited or Numbered lines with inline deep attribute detection
 * e.g.
 * 1. โครงการส่งเสริมสุขภาวะ (ครูธนากร) [ยุทธศาสตร์ที่ 1] งบ 12,000 บาท เป้าหมายเชิงปริมาณ: ร้อยละ 85 เป้าหมายเชิงคุณภาพ: นักเรียนมีสุขภาพกายที่สมบูรณ์
 */
function parseDelimitedLines(
  lines: string[],
  defaults: { academicYear: number; level: EducationLevel; strategy: string; defaultResponsible?: string }
): ParseResult {
  const validProjects: ParsedBulkProjectItem[] = [];

  lines.forEach((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 2) return;

    let responsiblePerson = defaults.defaultResponsible || 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน';
    let strategy = defaults.strategy;
    let level = defaults.level;
    let targetPercent = 100;
    let targetQualityDesc = 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด';
    let resultPercent = 0;
    let resultQualityDesc = 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน';
    let budget = 0;
    let status: ProjectStatus = '6. ยังไม่ดำเนินการ';

    // 1. Extract Parentheses e.g. (ครูสมชาย) or (ยุทธศาสตร์ที่ 1) or (เป้าหมาย 90%)
    const parenMatches = cleanLine.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      parenMatches.forEach((match) => {
        const inside = match.substring(1, match.length - 1).trim();
        if (inside.includes('ยุทธศาสตร์')) {
          strategy = matchStrategy(inside);
        } else if (inside.includes('งบ') || inside.includes('บาท')) {
          budget = parseBudget(inside);
        } else if (inside.includes('%') || inside.includes('ร้อยละ') || inside.includes('เป้าหมาย')) {
          const extracted = extractTargetComponents(inside);
          if (extracted.quantityPercent !== undefined) targetPercent = extracted.quantityPercent;
          if (extracted.qualityDesc) targetQualityDesc = extracted.qualityDesc;
        } else if (inside.includes('ปฐมวัย') || inside.includes('พื้นฐาน')) {
          level = matchEducationLevel(inside, defaults.level);
        } else {
          responsiblePerson = cleanResponsiblePerson(inside, defaults.defaultResponsible);
        }
        cleanLine = cleanLine.replace(match, ' ');
      });
    }

    // 2. Extract Brackets e.g. [ยุทธศาสตร์ที่ 2] or [งบ 15,000] or [เป้าหมาย 85%]
    const bracketMatches = cleanLine.match(/\[([^\]]+)\]/g);
    if (bracketMatches) {
      bracketMatches.forEach((match) => {
        const inside = match.substring(1, match.length - 1).trim();
        if (inside.includes('ยุทธศาสตร์')) {
          strategy = matchStrategy(inside);
        } else if (inside.includes('งบ') || inside.includes('บาท')) {
          budget = parseBudget(inside);
        } else if (inside.includes('%') || inside.includes('ร้อยละ') || inside.includes('เป้าหมาย')) {
          const extracted = extractTargetComponents(inside);
          if (extracted.quantityPercent !== undefined) targetPercent = extracted.quantityPercent;
          if (extracted.qualityDesc) targetQualityDesc = extracted.qualityDesc;
        } else {
          responsiblePerson = cleanResponsiblePerson(inside, defaults.defaultResponsible);
        }
        cleanLine = cleanLine.replace(match, ' ');
      });
    }

    // 3. Extract Budget keywords e.g. "งบ 15,000 บาท"
    const budgetMatch = cleanLine.match(/(?:งบประมาณ|งบ)\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:บาท)?/);
    if (budgetMatch) {
      budget = parseBudget(budgetMatch[1]);
      cleanLine = cleanLine.replace(budgetMatch[0], ' ');
    }

    // 4. Extract Explicit Target Quality Description if present
    const qualDescMatch = cleanLine.match(/(?:เป้าหมายเชิงคุณภาพ|เชิงคุณภาพ|ตัวชี้วัดเชิงคุณภาพ)\s*[\:\-\s]*([^\,\;\|]+)/i);
    if (qualDescMatch) {
      const q = qualDescMatch[1].trim();
      if (q.length > 2) {
        targetQualityDesc = q;
        cleanLine = cleanLine.replace(qualDescMatch[0], ' ');
      }
    }

    // 5. Extract Explicit Target Quantity (%) if present
    const quantMatch = cleanLine.match(/(?:เป้าหมายเชิงปริมาณ|ร้อยละของเป้าหมาย|เชิงปริมาณ|เป้าหมาย)\s*[\:\-\s]*(?:ร้อยละ)?\s*(\d{1,3}(?:\.\d+)?)\s*%?/i);
    if (quantMatch) {
      targetPercent = parsePercentage(quantMatch[1], 100);
      cleanLine = cleanLine.replace(quantMatch[0], ' ');
    } else {
      // Freeform percent
      const freePct = cleanLine.match(/(?:ร้อยละ\s*(\d{1,3})|(\d{1,3})\s*%)/);
      if (freePct) {
        targetPercent = parsePercentage(freePct[1] || freePct[2], 100);
        cleanLine = cleanLine.replace(freePct[0], ' ');
      }
    }

    // 6. Extract Result attributes if present
    const resMatch = cleanLine.match(/(?:ผลการดำเนินงาน|ผลดำเนินงาน|ความก้าวหน้า)\s*[\:\-\s]*([^\,\;\|]+)/i);
    if (resMatch) {
      const extracted = extractResultComponents(resMatch[1]);
      if (extracted.resultPercent !== undefined) resultPercent = extracted.resultPercent;
      if (extracted.resultQualityDesc) resultQualityDesc = extracted.resultQualityDesc;
      cleanLine = cleanLine.replace(resMatch[0], ' ');
    }

    // 7. Extract Education level keywords
    if (cleanLine.includes('ปฐมวัย') || cleanLine.includes('อนุบาล')) {
      level = 'early_childhood';
    } else if (cleanLine.includes('ขั้นพื้นฐาน') || cleanLine.includes('ประถม') || cleanLine.includes('มัธยม')) {
      level = 'basic_education';
    }

    // 8. Extract Status keywords
    if (cleanLine.includes('ส่งเล่ม') || cleanLine.includes('เรียบร้อย')) {
      status = '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว';
    } else if (cleanLine.includes('ค้างส่ง')) {
      status = '2. ดำเนินการเสร็จสิ้น ค้างส่งเล่มสรุปโครงการ';
    } else if (cleanLine.includes('ตลอดปี')) {
      status = '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)';
    }

    const finalName = cleanProjectName(cleanLine);
    if (finalName && finalName.length >= 2) {
      validProjects.push({
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: finalName,
        responsiblePerson,
        strategy,
        level,
        academicYear: defaults.academicYear,
        targetQuantityPercent: targetPercent,
        targetQualityDesc,
        resultQuantityPercent: resultPercent,
        resultQualityDesc,
        status,
        budget,
      });
    }
  });

  const stats = calculateExtractionStats(validProjects);

  return {
    formatDetected: 'numbered_list',
    totalLines: lines.length,
    validProjects,
    warnings: [],
    stats,
  };
}

/**
 * Calculate detection metrics across parsed projects
 */
export function calculateExtractionStats(projects: ParsedBulkProjectItem[]): ExtractionStats {
  const defaultQualityPlaceholder = 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด';
  const defaultResultPlaceholder = 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน';

  const withQuantity = projects.filter(
    (p) => p.targetQuantityPercent !== undefined && parseFlexiblePercentage(p.targetQuantityPercent, 0) > 0
  );
  const avgQuantity =
    withQuantity.length > 0
      ? Math.round(
          (withQuantity.reduce((acc, p) => acc + parseFlexiblePercentage(p.targetQuantityPercent, 0), 0) /
            withQuantity.length) *
            10
        ) / 10
      : 0;

  return {
    withQuantityPercent: withQuantity.length,
    avgQuantityPercent: avgQuantity,
    withQualityDesc: projects.filter((p) => p.targetQualityDesc && p.targetQualityDesc.trim() !== defaultQualityPlaceholder).length,
    withQualityPercentInText: projects.filter((p) => p.targetQualityDesc && /(?:ร้อยละ|\d+%)/.test(p.targetQualityDesc)).length,
    withResultQuantity: projects.filter(
      (p) => p.resultQuantityPercent !== undefined && parseFlexiblePercentage(p.resultQuantityPercent, 0) > 0
    ).length,
    withResultQuality: projects.filter((p) => p.resultQualityDesc && p.resultQualityDesc.trim() !== defaultResultPlaceholder).length,
    withBudget: projects.filter((p) => (p.budget || 0) > 0).length,
    totalBudget: projects.reduce((acc, p) => acc + (p.budget || 0), 0),
  };
}

/**
 * Ensure all required fields exist on a parsed project
 */
function finalizeParsedProject(
  item: Partial<ParsedBulkProjectItem>,
  defaults: { academicYear: number; level: EducationLevel; strategy: string; defaultResponsible?: string },
  idPrefix: string
): ParsedBulkProjectItem {
  return {
    id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: item.name || 'โครงการไม่ระบุชื่อ',
    responsiblePerson:
      item.responsiblePerson?.trim() ||
      defaults.defaultResponsible?.trim() ||
      'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน',
    strategy: item.strategy || defaults.strategy,
    level: item.level || defaults.level,
    academicYear: item.academicYear || defaults.academicYear,
    targetQuantityPercent: item.targetQuantityPercent ?? 100,
    targetQualityDesc: item.targetQualityDesc || 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
    resultQuantityPercent: item.resultQuantityPercent ?? 0,
    resultQualityDesc: item.resultQualityDesc || 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน',
    status: item.status || '6. ยังไม่ดำเนินการ',
    budget: item.budget || 0,
  };
}
