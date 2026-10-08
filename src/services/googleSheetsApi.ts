import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ProjectItem, AuditLogEntry, EDUCATION_LEVEL_NAMES } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Scopes for Google Sheets and Drive files
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Keys for persistent token caching
const STORAGE_ACCESS_TOKEN_KEY = 'cmc_google_access_token';
const STORAGE_ACCESS_TOKEN_EXPIRY = 'cmc_google_access_token_expiry';

function getStoredToken(): string | null {
  try {
    const token =
      sessionStorage.getItem(STORAGE_ACCESS_TOKEN_KEY) ||
      localStorage.getItem(STORAGE_ACCESS_TOKEN_KEY);
    const expiry =
      sessionStorage.getItem(STORAGE_ACCESS_TOKEN_EXPIRY) ||
      localStorage.getItem(STORAGE_ACCESS_TOKEN_EXPIRY);
    if (!token) return null;
    if (expiry) {
      if (Date.now() < Number(expiry)) {
        return token;
      } else {
        clearStoredToken();
        return null;
      }
    }
    // If no expiry recorded, do not trust stale token
    clearStoredToken();
    return null;
  } catch (e) {
    return null;
  }
}

function storeToken(token: string) {
  try {
    // Standard Google token is valid for 1 hour; reserve 50 minutes
    const expiry = Date.now() + 50 * 60 * 1000;
    sessionStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, token);
    sessionStorage.setItem(STORAGE_ACCESS_TOKEN_EXPIRY, String(expiry));
    sessionStorage.setItem('cmc_google_account_previously_connected', 'true');
    sessionStorage.removeItem('cmc_google_token_expired');
    localStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_ACCESS_TOKEN_EXPIRY, String(expiry));
    localStorage.setItem('cmc_google_account_previously_connected', 'true');
    localStorage.removeItem('cmc_google_token_expired');
  } catch (e) {}
}

export function clearStoredToken() {
  try {
    sessionStorage.removeItem(STORAGE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(STORAGE_ACCESS_TOKEN_KEY);
    // Mark as expired so the app knows a renewal is needed
    sessionStorage.setItem('cmc_google_token_expired', 'true');
    localStorage.setItem('cmc_google_token_expired', 'true');
  } catch (e) {}
}

// Flag and in-memory access token cache initialized with persistent storage
let isSigningIn = false;
let cachedAccessToken: string | null = getStoredToken();

/**
 * Initialize Google Auth State Listener
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = getGoogleAccessToken();
      if (activeToken) {
        if (onAuthSuccess) onAuthSuccess(user, activeToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Interactive Sign-in with Google to get OAuth token
 */
export const signInWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่พบ Access Token จากการเข้าสู่ระบบ Google');
    }

    cachedAccessToken = credential.accessToken;
    storeToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // When the user closes the popup or cancels, handle it gracefully as a normal cancellation
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้แล้วลองใหม่อีกครั้ง');
    }
    console.warn('Sign in with Google notice:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current cached access token (checking storage if variable empty, with expiration check)
 */
export const getGoogleAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = getStoredToken();
  }
  const expiry =
    sessionStorage.getItem(STORAGE_ACCESS_TOKEN_EXPIRY) ||
    localStorage.getItem(STORAGE_ACCESS_TOKEN_EXPIRY);
  if (cachedAccessToken && expiry && Date.now() >= Number(expiry)) {
    cachedAccessToken = null;
    clearStoredToken();
    return null;
  }
  return cachedAccessToken;
};

export const hasValidGoogleAccessToken = (): boolean => {
  return !!getGoogleAccessToken();
};

/**
 * Check whether a Google session existed previously but its token is now expired
 */
export const isGoogleSessionExpired = (): boolean => {
  if (hasValidGoogleAccessToken()) return false;
  try {
    const expiredFlag =
      sessionStorage.getItem('cmc_google_token_expired') === 'true' ||
      localStorage.getItem('cmc_google_token_expired') === 'true';
    const wasConnected =
      sessionStorage.getItem('cmc_google_account_previously_connected') === 'true' ||
      localStorage.getItem('cmc_google_account_previously_connected') === 'true';
    return expiredFlag || wasConnected;
  } catch (e) {
    return false;
  }
};

/**
 * Sign out Google Account and clear in-memory and persistent token
 */
export const signOutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  clearStoredToken();
  try {
    sessionStorage.removeItem('cmc_google_account_previously_connected');
    sessionStorage.removeItem('cmc_google_token_expired');
    localStorage.removeItem('cmc_google_account_previously_connected');
    localStorage.removeItem('cmc_google_token_expired');
  } catch (e) {}
};

export interface CreateSpreadsheetResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  message: string;
}

/**
 * Build table rows from projects
 */
const buildProjectRows = (projects: ProjectItem[]): any[][] => {
  const headers = [
    'รหัสโครงการ',
    'ปีการศึกษา',
    'ระดับการศึกษา',
    'ชื่อโครงการ',
    'ยุทธศาสตร์',
    'สถานะการดำเนินงาน',
    'เป้าหมายปริมาณ (%)',
    'เป้าหมายคุณภาพ',
    'ผลสำเร็จปริมาณ (%)',
    'ผลสำเร็จคุณภาพ',
    'หมายเหตุ / บันทึกของแอดมิน (Admin Audit Note)',
    'ผู้รับผิดชอบโครงการ',
    'ผู้ตรวจสอบความถูกต้อง',
    'มาตรฐานระดับการศึกษา',
    'นโยบายจุดเน้นกระทรวง',
    'ผลลัพธ์มาตรฐานชาติ',
    'สมรรถนะพื้นฐาน (ขั้นพื้นฐาน)',
    'สมรรถนะหลัก (ขั้นพื้นฐาน)',
    'พัฒนาการเด็ก (ปฐมวัย)',
    'วันที่รายงานล่าสุด (Timestamp)',
    'ผู้รายงานล่าสุด (Reported By)',
    'อีเมลผู้รายงาน (Reported By Email)',
  ];

  const rows = projects.map((p) => [
    p.id,
    p.academicYear,
    EDUCATION_LEVEL_NAMES[p.level] || p.level,
    p.name,
    p.strategy,
    p.status,
    p.targetQuantityPercent,
    p.targetQualityDesc || '',
    p.resultQuantityPercent,
    p.resultQualityDesc || '',
    p.adminAuditNote || '',
    p.responsiblePerson || '',
    p.verifier === 'อื่น ๆ' && p.customVerifier
      ? `${p.verifier} (${p.customVerifier})`
      : p.verifier || 'ฝ่ายนโยบายและแผนงาน',
    (p.standards || []).join('; '),
    (p.ministryPolicies || []).join('; '),
    (p.nationalOutcomes || []).join('; '),
    (p.basicCompetencies || []).join('; '),
    (p.coreCompetencies || []).join('; '),
    (p.childDevelopment || []).join('; '),
    p.lastReportedAt
      ? new Date(p.lastReportedAt).toLocaleString('th-TH')
      : new Date(p.updatedAt).toLocaleString('th-TH'),
    p.lastReportedBy || 'ผู้ดูแลระบบ CMC',
    p.lastReportedByEmail || '-',
  ]);

  return [headers, ...rows];
};

/**
 * Build audit logs rows
 */
const buildAuditRows = (projects: ProjectItem[]): any[][] => {
  const headers = [
    'วันที่และเวลา (Timestamp)',
    'รหัสโครงการ (Project ID)',
    'ชื่อโครงการ (Project Name)',
    'ผู้รายงานผล (Reported By)',
    'อีเมลผู้รายงาน (Reported By Email)',
    'กิจกรรม (Action)',
    'ผลสำเร็จปริมาณ (%)',
    'สถานะ (Status)',
    'บันทึก/หมายเหตุ (Note)',
  ];

  const auditRows: any[][] = [];
  projects.forEach((p) => {
    if (p.auditLogs && Array.isArray(p.auditLogs)) {
      p.auditLogs.forEach((log) => {
        auditRows.push([
          new Date(log.timestamp).toLocaleString('th-TH'),
          p.id,
          p.name,
          log.reportedBy || p.lastReportedBy || 'ผู้ดูแลระบบ CMC',
          log.reportedByEmail || p.lastReportedByEmail || '-',
          log.action === 'create'
            ? 'สร้างโครงการ'
            : log.action === 'attach_file'
            ? 'แนบไฟล์หลักฐาน'
            : 'บันทึกรายงานผลความก้าวหน้า',
          log.resultQuantityPercent !== undefined ? log.resultQuantityPercent : p.resultQuantityPercent,
          log.status || p.status,
          log.note || '',
        ]);
      });
    }
  });

  return [headers, ...auditRows];
};

/**
 * Build status summary rows
 */
const buildSummaryRows = (projects: ProjectItem[]): any[][] => {
  const headers = ['หมวดหมู่', 'รายการ', 'จำนวนโครงการ'];
  const total = projects.length;
  const inProgress = projects.filter((p) => p.status.includes('อยู่ระหว่างดำเนินการ')).length;
  const completed = projects.filter((p) => p.status.includes('เสร็จสิ้น') || p.status.includes('รายงานผลเสร็จสิ้น')).length;
  const notStarted = projects.filter((p) => p.status.includes('ยังไม่ดำเนินการ')).length;
  const earlyChildhood = projects.filter((p) => p.level === 'early_childhood').length;
  const basicEdu = projects.filter((p) => p.level === 'basic_education').length;

  return [
    headers,
    ['ภาพรวม', 'โครงการทั้งหมด', total],
    ['สถานะ', 'กำลังดำเนินการ', inProgress],
    ['สถานะ', 'ยังไม่ดำเนินการ', notStarted],
    ['สถานะ', 'เสร็จสิ้น / รายงานผลแล้ว', completed],
    ['ระดับการศึกษา', 'ระดับการศึกษาปฐมวัย', earlyChildhood],
    ['ระดับการศึกษา', 'ระดับการศึกษาขั้นพื้นฐาน', basicEdu],
    ['วันที่สร้าง/ปรับปรุงฐานข้อมูล', new Date().toLocaleString('th-TH'), ''],
  ];
};

/**
 * Automatically creates a Google Sheet, creates tabs, formats them, and populates data
 */
export const createGoogleSpreadsheetAutomatically = async (
  projects: ProjectItem[],
  tokenOverride?: string
): Promise<CreateSpreadsheetResult> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) {
    return {
      success: false,
      message: 'กรุณาเข้าสู่ระบบ Google เพื่อรับสิทธิ์ในการสร้างสเปรดชีต',
    };
  }

  try {
    const timestampStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const title = `CMC Project Tracking - ฐานข้อมูลโครงการ โรงเรียนเชียงใหม่คริสเตียน (${timestampStr})`;

    // 1. Create Spreadsheet with worksheets
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
          locale: 'th_TH',
          timeZone: 'Asia/Bangkok',
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: 'โครงการทั้งหมด',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
          {
            properties: {
              sheetId: 1,
              title: 'ประวัติการรายงานผล (Audit Log)',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
          {
            properties: {
              sheetId: 2,
              title: 'สรุปภาพรวมโครงการ',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `สร้างสเปรดชีตไม่สำเร็จ (${createRes.status})`);
    }

    const createdData = await createRes.json();
    const spreadsheetId: string = createdData.spreadsheetId;
    const spreadsheetUrl: string = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Populate values into worksheets
    const projectValues = buildProjectRows(projects);
    const auditValues = buildAuditRows(projects);
    const summaryValues = buildSummaryRows(projects);

    const writePromises = [
      // Write Projects
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'โครงการทั้งหมด'!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: "'โครงการทั้งหมด'!A1",
            majorDimension: 'ROWS',
            values: projectValues,
          }),
        }
      ),
      // Write Audit Logs
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการรายงานผล (Audit Log)'!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: "'ประวัติการรายงานผล (Audit Log)'!A1",
            majorDimension: 'ROWS',
            values: auditValues,
          }),
        }
      ),
      // Write Summary
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สรุปภาพรวมโครงการ'!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: "'สรุปภาพรวมโครงการ'!A1",
            majorDimension: 'ROWS',
            values: summaryValues,
          }),
        }
      ),
    ];

    await Promise.all(writePromises);

    // 3. Format header row styling (CMC Indigo #4f46e5: RGB 0.31, 0.27, 0.90, bold white text)
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // Header format for 'โครงการทั้งหมด' (sheetId: 0)
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: projectValues[0].length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.31, green: 0.27, blue: 0.90 },
                    textFormat: {
                      foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                      bold: true,
                      fontSize: 11,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
            // Header format for 'ประวัติการรายงานผล (Audit Log)' (sheetId: 1)
            {
              repeatCell: {
                range: {
                  sheetId: 1,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: auditValues[0].length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.31, green: 0.27, blue: 0.90 },
                    textFormat: {
                      foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                      bold: true,
                      fontSize: 11,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
            // Auto resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: projectValues[0].length,
                },
              },
            },
          ],
        }),
      });
    } catch (fmtErr) {
      console.warn('Formatting warning (non-fatal):', fmtErr);
    }

    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: `สร้างสเปรดชีต "${title}" พร้อมชีทและบันทึกข้อมูล ${projects.length} โครงการสำเร็จแล้ว!`,
    };
  } catch (err: any) {
    console.error('Error creating Google Spreadsheet:', err);
    return {
      success: false,
      message: err?.message || 'เกิดข้อผิดพลาดในการสร้างและบันทึก Google Sheets',
    };
  }
};

export interface SyncSpreadsheetResult {
  success: boolean;
  message: string;
  isAuthError?: boolean;
}

/**
 * Syncs updated projects to an existing Google Spreadsheet
 */
export const syncToExistingGoogleSpreadsheet = async (
  spreadsheetId: string,
  projects: ProjectItem[],
  tokenOverride?: string
): Promise<SyncSpreadsheetResult> => {
  const token = tokenOverride || getGoogleAccessToken();
  if (!token) {
    cachedAccessToken = null;
    clearStoredToken();
    return {
      success: false,
      message: 'การเชื่อมต่อกับ Google สิ้นสุดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง',
      isAuthError: true,
    };
  }

  try {
    const projectValues = buildProjectRows(projects);
    const auditValues = buildAuditRows(projects);
    const summaryValues = buildSummaryRows(projects);

    // 1. Clear old data from range and rewrite
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'โครงการทั้งหมด'!A1:Z${Math.max(500, projects.length + 50)}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    ).catch(() => {});

    // 2. Put updated data
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'โครงการทั้งหมด'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: "'โครงการทั้งหมด'!A1",
          majorDimension: 'ROWS',
          values: projectValues,
        }),
      }
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        clearStoredToken();
        return {
          success: false,
          message: 'การเชื่อมต่อกับ Google สิ้นสุดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง',
          isAuthError: true,
        };
      }
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `ไม่สามารถเขียนข้อมูลลงในชีทได้ (${res.status})`,
      };
    }

    // Write audit log
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการรายงานผล (Audit Log)'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: "'ประวัติการรายงานผล (Audit Log)'!A1",
          majorDimension: 'ROWS',
          values: auditValues,
        }),
      }
    ).catch((e) => console.warn('Audit log write note:', e?.message || e));

    // Write summary
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สรุปภาพรวมโครงการ'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: "'สรุปภาพรวมโครงการ'!A1",
          majorDimension: 'ROWS',
          values: summaryValues,
        }),
      }
    ).catch((e) => console.warn('Summary write note:', e?.message || e));

    return {
      success: true,
      message: `ซิงก์ข้อมูล ${projects.length} โครงการลงใน Google Sheets สำเร็จเรียบร้อยแล้ว`,
    };
  } catch (err: any) {
    console.warn('Sync notice:', err?.message || err);
    return {
      success: false,
      message: err?.message || 'ไม่สามารถซิงก์ข้อมูลไปยัง Google Sheets ได้',
    };
  }
};

/**
 * Fetch projects directly from existing Google Spreadsheet via Sheets API
 */
export const fetchProjectsFromGoogleSpreadsheet = async (
  spreadsheetId: string,
  tokenOverride?: string
): Promise<{
  success: boolean;
  rows?: any[][];
  parsedProjects?: any[];
  message: string;
  isAuthError?: boolean;
}> => {
  const token = tokenOverride || getGoogleAccessToken();
  if (!token) {
    cachedAccessToken = null;
    clearStoredToken();
    return {
      success: false,
      message: 'การเชื่อมต่อกับ Google สิ้นสุดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      isAuthError: true,
    };
  }

  try {
    // 1. Try checking RAW_DATABASE sheet first (if our automated backup exists)
    try {
      const rawRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'RAW_DATABASE'!B2`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        const jsonStr = rawData.values?.[0]?.[0];
        if (jsonStr && typeof jsonStr === 'string' && jsonStr.startsWith('[')) {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              success: true,
              parsedProjects: parsed,
              message: `ดึงข้อมูลจาก RAW_DATABASE สำเร็จ ${parsed.length} โครงการ`,
            };
          }
        }
      }
    } catch {}

    // 2. Fetch sheet tabs metadata to discover all sheet titles
    let targetSheetTitle = 'โครงการทั้งหมด';
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheetTitles: string[] = (meta.sheets || []).map(
          (s: any) => s.properties?.title
        );
        if (sheetTitles.includes('โครงการทั้งหมด')) {
          targetSheetTitle = 'โครงการทั้งหมด';
        } else if (sheetTitles.length > 0) {
          // Exclude summary or raw sheets if other sheets exist
          const preferred = sheetTitles.find(
            (t) => !t.includes('สรุป') && !t.includes('RAW')
          );
          targetSheetTitle = preferred || sheetTitles[0];
        }
      }
    } catch {}

    // 3. Fetch rows including headers (A1:Z1000)
    const encodedTitle = encodeURIComponent(targetSheetTitle);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedTitle}'!A1:Z1000`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        clearStoredToken();
        return {
          success: false,
          message: 'การเชื่อมต่อกับ Google สิ้นสุดอายุ หรือไม่มีสิทธิ์เข้าถึงชีทนี้',
          isAuthError: true,
        };
      }
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err?.error?.message || 'ไม่สามารถอ่านข้อมูลจาก Google Sheets ได้',
      };
    }

    const data = await res.json();
    const rows = data.values || [];
    return {
      success: true,
      rows: rows,
      message: `อ่านข้อมูลจากแผ่นงาน "${targetSheetTitle}" สำเร็จ ${rows.length} แถว`,
    };
  } catch (e: any) {
    console.warn('Fetch from Sheets notice:', e?.message || e);
    return {
      success: false,
      message: e?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets',
    };
  }
};

/**
 * Delete or trash an old Google Spreadsheet from Google Drive
 */
export const deleteGoogleSpreadsheet = async (
  spreadsheetIdOrUrl: string,
  tokenOverride?: string
): Promise<{ success: boolean; message: string }> => {
  const token = tokenOverride || getGoogleAccessToken();
  if (!token) {
    return { success: false, message: 'ไม่มี Access Token สำหรับลบสเปรดชีต' };
  }

  // Extract ID if URL is passed
  let fileId = spreadsheetIdOrUrl.trim();
  const match = fileId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    fileId = match[1];
  }

  if (!fileId) {
    return { success: false, message: 'ไม่พบ ID ของสเปรดชีต' };
  }

  try {
    // 1. First attempt: Direct delete via Drive API v3
    const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (delRes.ok || delRes.status === 204 || delRes.status === 404) {
      return { success: true, message: 'ลบสเปรดชีตชุดเดิมเรียบร้อยแล้ว' };
    }

    // 2. Second attempt: Trash the file via PATCH { trashed: true }
    const trashRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trashed: true }),
    });

    if (trashRes.ok) {
      return { success: true, message: 'ย้ายสเปรดชีตชุดเดิมไปยังถังขยะเรียบร้อยแล้ว' };
    }

    const errData = await trashRes.json().catch(() => ({}));
    return {
      success: false,
      message: errData?.error?.message || `ไม่สามารถลบสเปรดชีตเดิมได้ (HTTP ${trashRes.status})`,
    };
  } catch (err: any) {
    console.warn('Delete old spreadsheet warning:', err);
    return {
      success: false,
      message: err?.message || 'เกิดข้อผิดพลาดในการลบสเปรดชีตเดิม',
    };
  }
};

