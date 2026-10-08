import { parseFlexiblePercentage } from './utils/percentageHelper';

export type EducationLevel = 'early_childhood' | 'basic_education';

export const EDUCATION_LEVEL_NAMES: Record<EducationLevel, string> = {
  early_childhood: 'ระดับการศึกษาปฐมวัย',
  basic_education: 'ระดับการศึกษาขั้นพื้นฐาน',
};

export const PROJECT_STATUSES = [
  '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว',
  '2. ดำเนินการเสร็จสิ้น ค้างส่งเล่มสรุปโครงการ',
  '3. รอแก้ไขเล่มโครงการ',
  '4. ยกเลิกโครงการ',
  '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
  '6. ยังไม่ดำเนินการ',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; border: string; chartColor: string }> = {
  '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว': {
    bg: 'bg-emerald-50 text-emerald-700',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    chartColor: '#10b981',
  },
  '2. ดำเนินการเสร็จสิ้น ค้างส่งเล่มสรุปโครงการ': {
    bg: 'bg-amber-50 text-amber-700',
    text: 'text-amber-700',
    border: 'border-amber-200',
    chartColor: '#f59e0b',
  },
  '3. รอแก้ไขเล่มโครงการ': {
    bg: 'bg-orange-50 text-orange-700',
    text: 'text-orange-700',
    border: 'border-orange-200',
    chartColor: '#f97316',
  },
  '4. ยกเลิกโครงการ': {
    bg: 'bg-rose-50 text-rose-700',
    text: 'text-rose-700',
    border: 'border-rose-200',
    chartColor: '#ef4444',
  },
  '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)': {
    bg: 'bg-indigo-50 text-indigo-700',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    chartColor: '#4f46e5',
  },
  '6. ยังไม่ดำเนินการ': {
    bg: 'bg-slate-100 text-slate-600',
    text: 'text-slate-600',
    border: 'border-slate-200',
    chartColor: '#94a3b8',
  },
};

export const STRATEGIES = [
  'ยุทธศาสตร์ ที่ 1 พัฒนาคุณภาพเด็กบนพื้นฐานของคริสตจริยธรรม',
  'ยุทธศาสตร์ ที่ 2 พัฒนาผลสัมฤทธิ์ทางการศึกษาตามหลักสูตรสถานศึกษา',
  'ยุทธศาสตร์ ที่ 3 พัฒนาและเพิ่มขีดความสามารถของครูและบุคลากร',
  'ยุทธศาสตร์ ที่ 4 เพิ่มประสิทธิภาพการบริหารจัดการที่เอื้อต่อคุณภาพการจัดการศึกษาและการเรียนรู้',
  'ยุทธศาสตร์ ที่ 5 สร้างเครือข่ายความร่วมมือทางวิชาการทั้งภายในประเทศและต่างประเทศ',
  'ยุทธศาสตร์ ที่ 6 พัฒนาระบบประกันคุณภาพภายในสถานศึกษาให้มีประสิทธิภาพและเกิดประสิทธิผล',
] as const;

export const EARLY_CHILDHOOD_STANDARDS = [
  'มาตรฐานที่ 1 คุณภาพเด็ก',
  'มาตรฐานที่ 2 กระบวนการบริหารและการจัดการ',
  'มาตรฐานที่ 3 การจัดประสบการณ์ที่เน้นเด็กเป็นสำคัญ',
] as const;

export const BASIC_EDUCATION_STANDARDS = [
  'มาตรฐานที่ 1 คุณภาพผู้เรียน',
  'มาตรฐานที่ 2 กระบวนการบริหารและการจัดการ',
  'มาตรฐานที่ 3 กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ',
] as const;

export const MINISTRY_POLICIES = [
  '1. การจัดการศึกษาเพื่อความปลอดภัย',
  '2. การยกระดับคุณภาพการศึกษา',
  '3. การสร้างโอกาส ความเสมอภาค และความเท่าเทียมทางการศึกษาทุกช่วงวัย',
  '4. การส่งเสริมสนับสนุนวิชาชีพครู บุคลากรทางการศึกษาและบุคลากรสังกัดกระทรวงศึกษาธิการ',
  '5. การพัฒนาระบบราชการและการบริการภาครัฐยุคดิจิทัล',
] as const;

export const NATIONAL_EDUCATION_OUTCOMES = [
  '1. ผู้เรียนรู้ (Learner Person) เพื่อสร้างงานและคุณภาพชีวิตที่ดี',
  '2. ผู้ร่วมสร้างสรรค์นวัตกรรม (Innovative Co-creator) เพื่อสังคมที่มั่นคง มั่งคั่ง และยั่งยืน',
  '3. พลเมืองที่เข้มแข็ง (Active Citizen) เพื่อสันติสุข',
] as const;

// สมรรถนะพื้นฐาน (เฉพาะระดับการศึกษาขั้นพื้นฐาน)
export const BASIC_COMPETENCIES = [
  'ด้านคณิตศาสตร์',
  'ด้านวิทยาศาสตร์',
  'ด้านภาษาไทย',
  'ด้านภาษาอังกฤษ',
  'ไม่มี',
] as const;

export type BasicCompetency = (typeof BASIC_COMPETENCIES)[number];

// สมรรถนะหลัก (เฉพาะระดับการศึกษาขั้นพื้นฐาน)
export const CORE_COMPETENCIES = [
  'การจัดการตนเอง',
  'การคิดขั้นสูงฯ',
  'การสื่อสาร',
  'การรวมพลังทำงานเป็นทีม',
  'การเป็นพลเมืองเข้มแข็ง',
  'การอยู่ร่วมกับธรรมชาติฯ',
  'การเป็นผู้ประกอบการฯ',
  'ไม่มี',
] as const;

export type CoreCompetency = (typeof CORE_COMPETENCIES)[number];

// พัฒนาการเด็ก (เฉพาะระดับการศึกษาปฐมวัย)
export const CHILD_DEVELOPMENTS = [
  'ด้านร่างกายฯ',
  'ด้านอารมณ์ฯ',
  'ด้านสังคมฯ',
  'ด้านสติปัญญา',
  'ครบทั้ง 4 ด้าน',
  'ไม่มี',
] as const;

export type ChildDevelopment = (typeof CHILD_DEVELOPMENTS)[number];

export const VERIFIER_OPTIONS = [
  'ฝ่ายวิชาการ',
  'ฝ่ายนโยบายและแผนงาน',
  'ฝ่ายประกันคุณภาพ',
  'อื่น ๆ',
] as const;

export interface ProjectAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url?: string;
  dataUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO String
  reportedBy: string; // ชื่อ-นามสกุล
  reportedByEmail: string; // อีเมลผู้รายงาน
  action: 'create' | 'update_report' | 'update_status' | 'attach_file';
  note?: string;
  resultQuantityPercent?: number | string;
  status?: ProjectStatus;
}

export interface ProjectItem {
  id: string;
  name: string;
  level: EducationLevel;
  academicYear: number;
  strategy: string;
  targetQuantityPercent: number | string;
  targetQualityDesc: string;
  resultQuantityPercent: number | string;
  resultQualityDesc: string;
  standards: string[];
  ministryPolicies: string[];
  nationalOutcomes: string[];
  basicCompetencies?: string[]; // สมรรถนะพื้นฐาน (ขั้นพื้นฐาน)
  coreCompetencies?: string[];  // สมรรถนะหลัก (ขั้นพื้นฐาน)
  childDevelopment?: string[];  // พัฒนาการเด็ก (ปฐมวัย)
  responsiblePerson: string;
  verifier: string;
  customVerifier?: string;
  status: ProjectStatus;
  budget?: number;
  attachments: ProjectAttachment[];
  createdAt: string;
  updatedAt: string;
  // Audit Trail fields
  lastReportedAt?: string;
  lastReportedBy?: string;
  lastReportedByEmail?: string;
  auditLogs?: AuditLogEntry[];
  // Admin Audit Note fields
  adminAuditNote?: string;
  adminAuditNoteUpdatedAt?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  loginAt: string;
}

export interface GoogleSheetsConfig {
  spreadsheetUrl: string;
  spreadsheetId?: string;
  webhookUrl?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
}

export type AppView = 'reporting' | 'latest_updates' | 'database_connect' | 'dashboard' | 'all_projects' | 'admin_panel';

/**
 * Utility to check if a project has been reported:
 * โครงการจะขึ้นรายงานผลแล้วจะต้องกรอก ผลสำเร็จ ปริมาณ (ร้อยละ) * และรายงานผลเชิงคุณภาพเท่านั้น
 * รองรับการกรอกร้อยละอย่างอิสระ เช่น 88.86, "ร้อยละ 88.86", "88.86%"
 */
export const isProjectReported = (project: ProjectItem): boolean => {
  // 1. ต้องกรอก ผลสำเร็จ ปริมาณ (ร้อยละ) > 0 (รองรับทั้งตัวเลข ทศนิยม และข้อความเช่น ร้อยละ 88.86)
  const qty = parseFlexiblePercentage(project.resultQuantityPercent, 0);
  const hasQuantity = typeof qty === 'number' && !isNaN(qty) && qty > 0;

  // 2. ต้องกรอก รายงานผลเชิงคุณภาพ (ต้องมีข้อความจริง ไม่ใช่ช่องว่างหรือข้อความตั้งต้น)
  const nonReportPlaceholders = [
    'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน',
    'ยังไม่มีการรายงานผลเชิงคุณภาพ',
    'ยังไม่ได้เริ่มการประสานงาน กำหนดเริ่มช่วงภาคเรียนที่ 2',
    'ยังไม่ได้เริ่มการประสานงานเนื่องจากติดขัดเรื่องตารางเวลาของสถาบันคู่สัญญา',
    'บรรจุในแผนปฏิบัติการประจำปีการศึกษา 2569',
    'โครงการตามแผนงานปี 2569 เตรียมเสนอขออนุมัติงบประมาณ',
  ];
  const trimmedQuality = (project.resultQualityDesc || '').trim();
  const hasQuality =
    trimmedQuality !== '' && !nonReportPlaceholders.includes(trimmedQuality);

  // จะต้องกรอกครบทั้ง 2 ส่วนเท่านั้นจึงจะถือว่ารายงานผลแล้ว
  return hasQuantity && hasQuality;
};

export interface ParsedBulkProjectItem {
  id?: string;
  name: string;
  level?: EducationLevel;
  academicYear?: number;
  strategy?: string;
  responsiblePerson?: string;
  targetQuantityPercent?: number | string;
  targetQualityDesc?: string;
  resultQuantityPercent?: number | string;
  resultQualityDesc?: string;
  standards?: string[];
  status?: ProjectStatus;
  budget?: number;
}

export interface BulkAddPayload {
  academicYear: number;
  level: EducationLevel;
  strategy: string;
  projectNamesText?: string;
  parsedProjects?: ParsedBulkProjectItem[];
}
