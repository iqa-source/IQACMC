import { ProjectItem, EDUCATION_LEVEL_NAMES } from '../types';
import { parseFlexiblePercentage } from './percentageHelper';

export const SHEET_COLUMNS = [
  'ลำดับ',
  'รหัสโครงการ',
  'ระดับการศึกษา',
  'ปีการศึกษา',
  'ยุทธศาสตร์',
  'ชื่อโครงการ / กิจกรรม',
  'เป้าหมายปริมาณ (%)',
  'เป้าหมายคุณภาพ',
  'ผลสำเร็จปริมาณ (%)',
  'ผลสำเร็จคุณภาพ',
  'หมายเหตุ / บันทึกของแอดมิน (Admin Audit Note)',
  'สถานะการดำเนินโครงการ',
  'มาตรฐานระดับการศึกษา',
  'นโยบายจุดเน้นกระทรวงฯ',
  'ผลลัพธ์มาตรฐานชาติ',
  'สมรรถนะพื้นฐาน (ขั้นพื้นฐาน)',
  'สมรรถนะหลัก (ขั้นพื้นฐาน)',
  'พัฒนาการเด็ก (ปฐมวัย)',
  'ผู้รับผิดชอบโครงการ',
  'ผู้ตรวจสอบความถูกต้อง',
  'วันที่รายงานผลล่าสุด (Timestamp)',
  'ผู้รายงานล่าสุด (Reported By)',
  'อีเมลผู้รายงาน',
  'อัปเดตระบบล่าสุด',
];

export function formatProjectsForSheet(projects: ProjectItem[]): (string | number)[][] {
  return projects.map((p, idx) => [
    idx + 1,
    p.id,
    EDUCATION_LEVEL_NAMES[p.level] || p.level,
    p.academicYear,
    p.strategy,
    p.name,
    p.targetQuantityPercent,
    p.targetQualityDesc || '',
    p.resultQuantityPercent,
    p.resultQualityDesc || '',
    p.adminAuditNote || '-',
    p.status,
    p.standards.join(', '),
    p.ministryPolicies.join(', '),
    p.nationalOutcomes.join(', '),
    (p.basicCompetencies || []).join(', '),
    (p.coreCompetencies || []).join(', '),
    (p.childDevelopment || []).join(', '),
    p.responsiblePerson || '',
    p.verifier === 'อื่น ๆ' ? p.customVerifier || 'อื่น ๆ' : p.verifier,
    p.lastReportedAt
      ? new Date(p.lastReportedAt).toLocaleString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-',
    p.lastReportedBy || '-',
    p.lastReportedByEmail || '-',
    new Date(p.updatedAt).toLocaleString('th-TH'),
  ]);
}

/**
 * Export projects to CSV file with UTF-8 BOM so Thai characters open cleanly in Excel
 */
export function exportProjectsToCSV(projects: ProjectItem[], filename: string) {
  const rows = formatProjectsForSheet(projects);
  const allRows = [SHEET_COLUMNS, ...rows];

  const csvContent = allRows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\r\n');

  // \uFEFF is UTF-8 Byte Order Mark for Microsoft Excel to recognize UTF-8 encoding
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export projects to HTML-based Excel file (.xls) with full formatting
 */
export function exportProjectsToExcel(projects: ProjectItem[], filename: string) {
  const rows = formatProjectsForSheet(projects);

  let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  table { border-collapse: collapse; font-family: Tahoma, Arial, sans-serif; }
  th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #4338ca; padding: 8px; }
  td { border: 1px solid #dddddd; padding: 6px; }
  .text-center { text-align: center; }
</style>
</head>
<body>
  <h2>รายงานโครงการ โรงเรียนเชียงใหม่คริสเตียน (CMC Project Tracking)</h2>
  <p>วันที่ส่งออกข้อมูล: ${new Date().toLocaleString('th-TH')}</p>
  <table>
    <thead>
      <tr>
        ${SHEET_COLUMNS.map((col) => `<th>${col}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${String(cell ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`)
              .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + tableHtml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.xls') ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export full JSON data backup
 */
export function exportProjectsToJSON(projects: ProjectItem[], filename: string) {
  const dataStr = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      school: 'โรงเรียนเชียงใหม่คริสเตียน',
      system: 'CMC Project Tracking',
      projectCount: projects.length,
      projects,
    },
    null,
    2
  );

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Real-time sync dispatcher to Google Sheets (via Apps Script Webhook or endpoint)
 */
export async function syncProjectsToGoogleSheet(
  webhookUrl: string,
  projects: ProjectItem[]
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      message: 'กรุณาระบุ URL ของ Google Apps Script Web App / Webhook ให้ถูกต้อง',
    };
  }

  try {
    const formattedData = formatProjectsForSheet(projects);
    const payload = {
      action: 'sync_all',
      timestamp: new Date().toISOString(),
      school: 'โรงเรียนเชียงใหม่คริสเตียน',
      headers: SHEET_COLUMNS,
      rows: formattedData,
      projects,
    };

    // First try backend proxy /api/sheets/sync (avoids CORS and verifies status)
    try {
      const serverRes = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, projects }),
      });
      if (serverRes.ok) {
        const result = await serverRes.json();
        if (result?.success) {
          return {
            success: true,
            message: `ซิงก์ข้อมูล ${projects.length} โครงการไปยัง Google Sheets เรียบร้อยแล้ว`,
          };
        }
      }
    } catch (serverErr) {
      // Fallback to direct client-side fetch if server endpoint is unavailable
    }

    // Direct client-side dispatch (using text/plain avoids CORS preflight issues with Google Apps Script)
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `ซิงก์ข้อมูล ${projects.length} โครงการไปยัง Google Sheets เรียบร้อยแล้ว`,
    };
  } catch (error: any) {
    console.error('Error syncing to Google Sheet webhook:', error);
    return {
      success: false,
      message: error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อไปยัง Google Sheets',
    };
  }
}

/**
 * Pull projects from Google Apps Script Web App via GET
 */
export async function pullProjectsFromGoogleSheet(
  webhookUrl: string
): Promise<{ success: boolean; projects?: ProjectItem[]; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ Webhook URL',
    };
  }

  try {
    // Try server pull first
    try {
      const serverRes = await fetch(`/api/sheets/pull?url=${encodeURIComponent(webhookUrl)}`);
      if (serverRes.ok) {
        const resData = await serverRes.json();
        if (resData.success && Array.isArray(resData.projects)) {
          return {
            success: true,
            projects: resData.projects,
            message: `ดึงข้อมูลล่าสุดสำเร็จ (${resData.projects.length} โครงการ)`,
          };
        }
      }
    } catch (e) {}

    // Direct fetch
    const response = await fetch(webhookUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data?.projects)) {
      return {
        success: true,
        projects: data.projects,
        message: `ดึงข้อมูลสำเร็จ (${data.projects.length} โครงการ)`,
      };
    }
    return {
      success: false,
      message: 'รูปแบบข้อมูลจาก Google Sheets ไม่ถูกต้อง',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถดึงข้อมูลจาก Google Sheets ได้: ${err.message}`,
    };
  }
}

/**
 * Ready-to-copy Google Apps Script code for Admin's Google Sheet (2-Way Real-time Sync)
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ======================================================================
// รหัส Google Apps Script สำหรับระบบติดตามโครงการ CMC Project Tracking
// โรงเรียนเชียงใหม่คริสเตียน (รองรับ Real-time 2-Way Sync & Multi-User)
// ======================================================================
// วิธีติดตั้งใน Google Sheets:
// 1. เปิด Google Sheet ที่ต้องการจัดเก็บข้อมูลโครงการ
// 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
// 3. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดนี้ลงไป จากนั้นกดปุ่ม "บันทึก" (Save 💾)
// 4. กดปุ่มสีน้ำเงิน "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้ใหม่" (New deployment)
// 5. คลิกไอคอนเฟือง (⚙️) ด้านซ้าย แล้วเลือก "เว็บแอป" (Web app)
//    - รายละเอียด: CMC Real-time Sync
//    - ดำเนินการในฐานะ (Execute as): ฉัน (Me - บัญชีของคุณ)
//    - ผู้มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)  <--- สำคัญมาก! เพื่อให้ครูทุกคนส่งข้อมูลได้
// 6. กด "ทำให้ใช้งานได้" (Deploy) และกด "ให้สิทธิ์เข้าถึง" (Authorize access)
// 7. คัดลอก "URL เว็บแอป" (Web app URL) นำมาวางในระบบ CMC Project Tracking
// ======================================================================

// 1. รับข้อมูลจากเว็บแอปลง Google Sheet (POST)
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "";
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // แท็บที่ 1: โครงการทั้งหมด
    var sheet = ss.getSheetByName("โครงการทั้งหมด") || ss.getSheetByName("CMC_Projects");
    if (!sheet) {
      sheet = ss.insertSheet("โครงการทั้งหมด");
    }
    
    sheet.clear();
    
    // ใส่ส่วนหัวคอลัมน์
    if (data.headers && data.headers.length > 0) {
      sheet.appendRow(data.headers);
      var headerRange = sheet.getRange(1, 1, 1, data.headers.length);
      headerRange.setBackground("#1e293b"); // Navy Slate
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setRowHeight(1, 36);
    }
    
    // ใส่ข้อมูลแถว
    if (data.rows && data.rows.length > 0) {
      sheet.getRange(2, 1, data.rows.length, data.rows[0].length).setValues(data.rows);
      sheet.getRange(2, 1, data.rows.length, data.rows[0].length).setVerticalAlignment("middle");
    }
    
    // จัดความกว้างคอลัมน์อัตโนมัติ
    sheet.autoResizeColumns(1, data.headers ? data.headers.length : 20);
    
    // แท็บที่ 2: บันทึกข้อมูล JSON ดิบเพื่อใช้ซิงก์กลับแบบ Real-time
    var backupSheet = ss.getSheetByName("RAW_DATABASE");
    if (!backupSheet) {
      backupSheet = ss.insertSheet("RAW_DATABASE");
    }
    backupSheet.clear();
    backupSheet.getRange(1, 1).setValue("LAST_UPDATED");
    backupSheet.getRange(1, 2).setValue(new Date().toISOString());
    backupSheet.getRange(2, 1).setValue("DATA_JSON");
    backupSheet.getRange(2, 2).setValue(JSON.stringify(data.projects || []));
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: data.rows ? data.rows.length : 0,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. ส่งข้อมูลล่าสุดให้เว็บแอปแบบ Real-time (GET)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupSheet = ss.getSheetByName("RAW_DATABASE");
    var projects = [];
    
    if (backupSheet) {
      var rawJson = backupSheet.getRange(2, 2).getValue();
      if (rawJson) {
        projects = JSON.parse(rawJson);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      projects: projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Extract Google Spreadsheet ID from any URL or raw ID
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  // Standard Google Sheets URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already a raw spreadsheet ID (usually 25-50 chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Parse CSV text from Google Sheets export into a 2D array of strings
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

/**
 * Robustly parses rows (headers + data rows) from Google Sheets into ProjectItem[]
 */
export function parseRowsToProjects(rows: any[][]): ProjectItem[] {
  if (!rows || rows.length < 2) return [];

  // Normalize header row
  const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());

  const findCol = (keywords: string[]) => {
    return headers.findIndex((h) =>
      keywords.some((kw) => h.includes(kw.toLowerCase()))
    );
  };

  const idCol = findCol(['รหัสโครงการ', 'project id', 'id']);
  const yearCol = findCol(['ปีการศึกษา', 'academic year', 'year']);
  const levelCol = findCol(['ระดับการศึกษา', 'level']);
  const nameCol = findCol(['ชื่อโครงการ', 'project name', 'name', 'กิจกรรม']);
  const strategyCol = findCol(['ยุทธศาสตร์', 'strategy']);
  const statusCol = findCol(['สถานะ', 'status']);
  const targetQtyCol = findCol(['เป้าหมายปริมาณ', 'target quantity']);
  const targetQualityCol = findCol(['เป้าหมายคุณภาพ', 'target quality']);
  const resultQtyCol = findCol(['ผลสำเร็จปริมาณ', 'result quantity', 'ความก้าวหน้า']);
  const resultQualityCol = findCol(['ผลสำเร็จคุณภาพ', 'result quality']);
  const adminNoteCol = findCol(['หมายเหตุแอดมิน', 'บันทึกของแอดมิน', 'บันทึกแอดมิน', 'admin note', 'admin audit note', 'หมายเหตุ / บันทึกของแอดมิน', 'หมายเหตุ/บันทึก']);
  const responsibleCol = findCol(['ผู้รับผิดชอบ', 'responsible']);
  const verifierCol = findCol(['ผู้ตรวจสอบ', 'verifier']);
  const standardsCol = findCol(['มาตรฐาน', 'standard']);
  const policiesCol = findCol(['นโยบาย', 'policy']);
  const outcomesCol = findCol(['ผลลัพธ์มาตรฐานชาติ', 'outcome']);
  const basicCompCol = findCol(['สมรรถนะพื้นฐาน']);
  const coreCompCol = findCol(['สมรรถนะหลัก']);
  const childDevCol = findCol(['พัฒนาการเด็ก']);
  const reportedAtCol = findCol(['วันที่รายงาน', 'timestamp']);
  const reportedByCol = findCol(['ผู้รายงานล่าสุด', 'reported by']);
  const reportedEmailCol = findCol(['อีเมลผู้รายงาน', 'email']);

  const projects: ProjectItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    const rawId = idCol >= 0 ? String(row[idCol] || '').trim() : '';

    if (!rawName && !rawId) continue;

    const name = rawName || `โครงการที่ ${i}`;
    const id = rawId || `cmc-sheet-${Date.now()}-${i}`;

    const rawLevel = levelCol >= 0 ? String(row[levelCol] || '').trim() : '';
    const level = rawLevel.includes('ปฐมวัย') || rawLevel === 'early_childhood'
      ? 'early_childhood'
      : 'basic_education';

    const rawYear = yearCol >= 0 ? parseInt(String(row[yearCol] || '2568').replace(/\D/g, ''), 10) : 2568;
    const academicYear = isNaN(rawYear) || rawYear < 2500 ? 2568 : rawYear;

    const strategy = strategyCol >= 0 && row[strategyCol]
      ? String(row[strategyCol]).trim()
      : 'ยุทธศาสตร์ ที่ 1 พัฒนาคุณภาพเด็กบนพื้นฐานของคริสตจริยธรรม';

    const rawStatus = statusCol >= 0 ? String(row[statusCol] || '').trim() : '';
    let status: any = '6. ยังไม่ดำเนินการ';
    if (rawStatus.includes('1.') || (rawStatus.includes('เสร็จสิ้น') && rawStatus.includes('เรียบร้อย'))) {
      status = '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว';
    } else if (rawStatus.includes('2.') || rawStatus.includes('ค้างส่ง')) {
      status = '2. ดำเนินการเสร็จสิ้น ค้างส่งเล่มสรุปโครงการ';
    } else if (rawStatus.includes('3.') || rawStatus.includes('รอแก้ไข')) {
      status = '3. รอแก้ไขเล่มโครงการ';
    } else if (rawStatus.includes('4.') || rawStatus.includes('ยกเลิก')) {
      status = '4. ยกเลิกโครงการ';
    } else if (rawStatus.includes('5.') || rawStatus.includes('อยู่ระหว่าง') || rawStatus.includes('ตลอดปี')) {
      status = '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)';
    } else {
      status = '6. ยังไม่ดำเนินการ';
    }

    const targetQuantityPercent = targetQtyCol >= 0
      ? parseFlexiblePercentage(row[targetQtyCol], 100)
      : 100;

    const targetQualityDesc = targetQualityCol >= 0 && row[targetQualityCol]
      ? String(row[targetQualityCol]).trim()
      : 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด';

    const resultQuantityPercent = resultQtyCol >= 0
      ? parseFlexiblePercentage(row[resultQtyCol], 0)
      : 0;

    const resultQualityDesc = resultQualityCol >= 0 && row[resultQualityCol]
      ? String(row[resultQualityCol]).trim()
      : '';

    const responsiblePerson = responsibleCol >= 0 && row[responsibleCol]
      ? String(row[responsibleCol]).trim()
      : 'ผู้รับผิดชอบโครงการ';

    const verifier = verifierCol >= 0 && row[verifierCol]
      ? String(row[verifierCol]).trim()
      : 'ฝ่ายนโยบายและแผนงาน';

    const parseList = (colIdx: number) => {
      if (colIdx < 0 || !row[colIdx]) return [];
      return String(row[colIdx])
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    };

    const standards = parseList(standardsCol);
    if (standards.length === 0) {
      standards.push(level === 'early_childhood' ? 'มาตรฐานที่ 1 คุณภาพเด็ก' : 'มาตรฐานที่ 1 คุณภาพผู้เรียน');
    }

    const ministryPolicies = parseList(policiesCol);
    if (ministryPolicies.length === 0) {
      ministryPolicies.push('2. การยกระดับคุณภาพการศึกษา');
    }

    const nationalOutcomes = parseList(outcomesCol);
    if (nationalOutcomes.length === 0) {
      nationalOutcomes.push('1. ผู้เรียนรู้ (Learner Person) เพื่อสร้างงานและคุณภาพชีวิตที่ดี');
    }

    const basicCompetencies = parseList(basicCompCol);
    const coreCompetencies = parseList(coreCompCol);
    const childDevelopment = parseList(childDevCol);

    const now = new Date().toISOString();
    const lastReportedAt = reportedAtCol >= 0 && row[reportedAtCol]
      ? String(row[reportedAtCol]).trim()
      : now;
    const lastReportedBy = reportedByCol >= 0 && row[reportedByCol]
      ? String(row[reportedByCol]).trim()
      : 'ผู้ดูแลระบบ CMC';
    const lastReportedByEmail = reportedEmailCol >= 0 && row[reportedEmailCol]
      ? String(row[reportedEmailCol]).trim()
      : '-';

    projects.push({
      id,
      name,
      level,
      academicYear,
      strategy,
      status,
      targetQuantityPercent,
      targetQualityDesc,
      resultQuantityPercent,
      resultQualityDesc,
      adminAuditNote:
        adminNoteCol >= 0 && row[adminNoteCol] ? String(row[adminNoteCol]).trim() : undefined,
      responsiblePerson,
      verifier,
      standards,
      ministryPolicies,
      nationalOutcomes,
      basicCompetencies,
      coreCompetencies,
      childDevelopment,
      attachments: [],
      createdAt: now,
      updatedAt: now,
      lastReportedAt,
      lastReportedBy,
      lastReportedByEmail,
      auditLogs: [
        {
          id: `audit-${Date.now()}-${i}`,
          timestamp: lastReportedAt,
          reportedBy: lastReportedBy,
          reportedByEmail: lastReportedByEmail,
          action: 'create',
          note: 'นำเข้าจากฐานข้อมูล Google Sheets',
          resultQuantityPercent,
          status,
        },
      ],
    });
  }

  return projects;
}

