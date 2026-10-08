import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Process-level crash guards to ensure the server remains resilient
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Health check endpoint for Cloud Run and uptime checks
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data directory:', e);
  }
}

// Ensure uploads directory exists for project attachments (PDF, Word, Excel, PPT, images)
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create uploads directory:', e);
  }
}

// Serve uploaded files statically
app.use('/api/uploads', express.static(UPLOADS_DIR));

// Configure multer for disk storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseRaw = path.basename(file.originalname, ext);
      let safeBase = baseRaw.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
      if (!safeBase) safeBase = 'file';
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${uniqueSuffix}-${safeBase}${ext}`);
    },
  }),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB max
});

const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SHEETS_CONFIG_FILE = path.join(DATA_DIR, 'sheets-config.json');
const DELETED_IDS_FILE = path.join(DATA_DIR, 'deleted-project-ids.json');

// Helper to read JSON file
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`Failed to read ${filePath}:`, e);
  }
  return fallback;
}

// Helper to write JSON file
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Failed to write ${filePath}:`, e);
  }
}

// Initial default config
const DEFAULT_CONFIG = {
  spreadsheetId: '',
  spreadsheetUrl: '',
  webhookUrl: '',
  autoSync: true,
  syncStatus: 'idle',
  lastSyncedAt: undefined as string | undefined,
  lastError: undefined as string | undefined,
};

// In-memory cache synced with files
let deletedProjectIds = new Set<string>(readJsonFile<string[]>(DELETED_IDS_FILE, []));
let sharedProjects: any[] = readJsonFile<any[]>(PROJECTS_FILE, []).filter(
  (p) => !deletedProjectIds.has(p.id)
);
let sharedSheetsConfig = readJsonFile(SHEETS_CONFIG_FILE, DEFAULT_CONFIG);

/**
 * Server-side helper to sync projects to Google Apps Script Webhook
 */
async function syncToWebhook(webhookUrl: string, projects: any[]): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Webhook URL ไม่ถูกต้อง' };
  }

  try {
    const payload = {
      action: 'sync_all',
      timestamp: new Date().toISOString(),
      school: 'โรงเรียนเชียงใหม่คริสเตียน',
      projects,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      sharedSheetsConfig.lastSyncedAt = new Date().toISOString();
      sharedSheetsConfig.syncStatus = 'success';
      sharedSheetsConfig.lastError = undefined;
      writeJsonFile(SHEETS_CONFIG_FILE, sharedSheetsConfig);
      return { success: true, message: 'ส่งข้อมูลไปยัง Google Sheets สำเร็จ' };
    } else {
      const errText = await response.text().catch(() => '');
      throw new Error(`Google Webhook ตอบกลับด้วยรหัส: ${response.status} ${errText}`);
    }
  } catch (err: any) {
    console.warn('Server webhook sync error:', err.message);
    sharedSheetsConfig.syncStatus = 'error';
    sharedSheetsConfig.lastError = err.message;
    writeJsonFile(SHEETS_CONFIG_FILE, sharedSheetsConfig);
    return { success: false, message: err.message };
  }
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET shared projects
app.get('/api/projects', (req, res) => {
  // Always filter out deleted projects
  const activeProjects = sharedProjects.filter((p) => !deletedProjectIds.has(p.id));
  res.json({
    success: true,
    projects: activeProjects,
    count: activeProjects.length,
  });
});

// POST seed or replace projects
app.post('/api/projects/init', (req, res) => {
  const { projects } = req.body;
  if (Array.isArray(projects)) {
    // Only accept projects that have not been explicitly deleted
    const filtered = projects.filter((p) => !deletedProjectIds.has(p.id));
    if (sharedProjects.length === 0 || req.query.force === 'true') {
      sharedProjects = filtered;
      writeJsonFile(PROJECTS_FILE, sharedProjects);
    }
  }
  const activeProjects = sharedProjects.filter((p) => !deletedProjectIds.has(p.id));
  res.json({ success: true, count: activeProjects.length, projects: activeProjects });
});

// POST create project
app.post('/api/projects', async (req, res) => {
  try {
    const newProject = req.body;
    if (!newProject || !newProject.name) {
      return res.status(400).json({ success: false, message: 'ข้อมูลโครงการไม่ถูกต้อง' });
    }

    // If project was previously marked as deleted, un-tombstone it
    if (deletedProjectIds.has(newProject.id)) {
      deletedProjectIds.delete(newProject.id);
      writeJsonFile(DELETED_IDS_FILE, Array.from(deletedProjectIds));
    }

    sharedProjects = [newProject, ...sharedProjects.filter((p) => p.id !== newProject.id)];
    writeJsonFile(PROJECTS_FILE, sharedProjects);

    // Auto sync to webhook if configured
    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({ success: true, project: newProject, syncResult });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If this project was deleted, do not resurrect it
    if (deletedProjectIds.has(id)) {
      return res.status(404).json({ success: false, message: 'โครงการนี้ถูกลบออกจากระบบแล้ว' });
    }

    let found = false;
    sharedProjects = sharedProjects.map((p) => {
      if (p.id === id) {
        found = true;
        return { ...p, ...updateData };
      }
      return p;
    });

    if (!found) {
      // If not in server memory yet, prepend it
      sharedProjects = [updateData, ...sharedProjects];
    }

    writeJsonFile(PROJECTS_FILE, sharedProjects);

    // Auto sync to webhook if configured
    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({
      success: true,
      message: 'บันทึกข้อมูลเรียบร้อย',
      syncResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST bulk add
app.post('/api/projects/bulk', async (req, res) => {
  try {
    const { newProjects } = req.body;
    if (!Array.isArray(newProjects)) {
      return res.status(400).json({ success: false, message: 'Invalid projects array' });
    }

    // Filter and un-tombstone if re-adding
    for (const proj of newProjects) {
      if (proj.id && deletedProjectIds.has(proj.id)) {
        deletedProjectIds.delete(proj.id);
      }
    }
    writeJsonFile(DELETED_IDS_FILE, Array.from(deletedProjectIds));

    sharedProjects = [...newProjects, ...sharedProjects];
    writeJsonFile(PROJECTS_FILE, sharedProjects);

    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({ success: true, count: newProjects.length, syncResult });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Mark as tombstoned to prevent resurrection
    deletedProjectIds.add(id);
    writeJsonFile(DELETED_IDS_FILE, Array.from(deletedProjectIds));

    // 2. Remove from shared projects
    sharedProjects = sharedProjects.filter((p) => p.id !== id);
    writeJsonFile(PROJECTS_FILE, sharedProjects);

    // 3. Auto sync to webhook if configured
    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({
      success: true,
      message: 'ลบโครงการเรียบร้อยแล้ว',
      deletedId: id,
      projects: sharedProjects,
      count: sharedProjects.length,
      syncResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST batch delete projects
app.post('/api/projects/delete-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสโครงการที่ต้องการลบ' });
    }

    const idsSet = new Set<string>(ids);
    ids.forEach((id) => deletedProjectIds.add(id));
    writeJsonFile(DELETED_IDS_FILE, Array.from(deletedProjectIds));

    sharedProjects = sharedProjects.filter((p) => !idsSet.has(p.id));
    writeJsonFile(PROJECTS_FILE, sharedProjects);

    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({
      success: true,
      message: `ลบสำเร็จ ${ids.length} โครงการ`,
      deletedCount: ids.length,
      projects: sharedProjects,
      count: sharedProjects.length,
      syncResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST delete all projects by academic year and optional level
app.post('/api/projects/delete-all', async (req, res) => {
  try {
    const { academicYear, level } = req.body;

    const toDelete = sharedProjects.filter((p) => {
      if (academicYear !== undefined && academicYear !== null && p.academicYear !== Number(academicYear)) {
        return false;
      }
      if (level && p.level !== level) {
        return false;
      }
      return true;
    });

    const deletedIdsList = toDelete.map((p) => p.id);
    deletedIdsList.forEach((id) => deletedProjectIds.add(id));
    writeJsonFile(DELETED_IDS_FILE, Array.from(deletedProjectIds));

    const deletedIdsSet = new Set(deletedIdsList);
    sharedProjects = sharedProjects.filter((p) => !deletedIdsSet.has(p.id));
    writeJsonFile(PROJECTS_FILE, sharedProjects);

    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({
      success: true,
      message: `ลบโครงการทั้งหมดในรอบปีนี้เรียบร้อย (${deletedIdsList.length} โครงการ)`,
      deletedCount: deletedIdsList.length,
      projects: sharedProjects,
      count: sharedProjects.length,
      syncResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST upload attachment for a project (PDF, Word, Excel, PowerPoint, Image, etc.)
app.post('/api/projects/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    let originalName = file.originalname;
    try {
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (decoded && !decoded.includes('\ufffd')) {
        originalName = decoded;
      }
    } catch (e) {}

    const now = new Date().toISOString();
    const reporterName = req.body.reporterName || 'ผู้ใช้งานระบบ CMC';
    const reporterEmail = req.body.reporterEmail || '-';

    const newAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: originalName,
      size: file.size,
      type: file.mimetype || 'application/octet-stream',
      uploadedAt: now,
      url: `/api/uploads/${file.filename}`,
    };

    let targetProject: any = null;
    sharedProjects = sharedProjects.map((p) => {
      if (p.id === id) {
        const auditEntry = {
          id: `audit-att-${Date.now()}`,
          timestamp: now,
          reportedBy: reporterName,
          reportedByEmail: reporterEmail,
          action: 'attach_file',
          note: `แนบไฟล์ส่งเล่มสรุป/หลักฐาน: ${originalName}`,
        };
        const currentAtts = Array.isArray(p.attachments) ? p.attachments : [];
        const currentLogs = Array.isArray(p.auditLogs) ? p.auditLogs : [];
        targetProject = {
          ...p,
          attachments: [newAttachment, ...currentAtts],
          updatedAt: now,
          lastReportedAt: now,
          lastReportedBy: reporterName,
          lastReportedByEmail: reporterEmail,
          auditLogs: [auditEntry, ...currentLogs],
        };
        return targetProject;
      }
      return p;
    });

    if (!targetProject) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    writeJsonFile(PROJECTS_FILE, sharedProjects);

    // Auto sync to webhook if configured
    let syncResult = null;
    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncResult = await syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects);
    }

    res.json({
      success: true,
      attachment: newAttachment,
      project: targetProject,
      syncResult,
    });
  } catch (error: any) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
  }
});

// DELETE attachment from project
app.delete('/api/projects/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const now = new Date().toISOString();
    const reporterName = req.body?.reporterName || 'ผู้ใช้งานระบบ CMC';
    const reporterEmail = req.body?.reporterEmail || '-';

    let targetProject: any = null;
    let removedFileName = '';

    sharedProjects = sharedProjects.map((p) => {
      if (p.id === id) {
        const currentAtts = Array.isArray(p.attachments) ? p.attachments : [];
        const removed = currentAtts.find((a: any) => a.id === attachmentId);
        if (removed) {
          removedFileName = removed.name;
          if (removed.url && removed.url.startsWith('/api/uploads/')) {
            const diskFileName = path.basename(removed.url);
            const diskPath = path.join(UPLOADS_DIR, diskFileName);
            if (fs.existsSync(diskPath)) {
              try {
                fs.unlinkSync(diskPath);
              } catch (e) {}
            }
          }
        }

        const auditEntry = {
          id: `audit-attdel-${Date.now()}`,
          timestamp: now,
          reportedBy: reporterName,
          reportedByEmail: reporterEmail,
          action: 'update_report',
          note: `ลบไฟล์แนบ: ${removedFileName || attachmentId}`,
        };

        targetProject = {
          ...p,
          attachments: currentAtts.filter((a: any) => a.id !== attachmentId),
          updatedAt: now,
          auditLogs: [auditEntry, ...(Array.isArray(p.auditLogs) ? p.auditLogs : [])],
        };
        return targetProject;
      }
      return p;
    });

    if (!targetProject) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงการ' });
    }

    writeJsonFile(PROJECTS_FILE, sharedProjects);

    if (sharedSheetsConfig.autoSync && sharedSheetsConfig.webhookUrl) {
      syncToWebhook(sharedSheetsConfig.webhookUrl, sharedProjects).catch(() => {});
    }

    res.json({ success: true, project: targetProject });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET shared Google Sheets configuration
app.get('/api/sheets/config', (req, res) => {
  res.json({
    success: true,
    config: sharedSheetsConfig,
  });
});

// POST update shared Google Sheets configuration
app.post('/api/sheets/config', (req, res) => {
  const updates = req.body;
  sharedSheetsConfig = {
    ...sharedSheetsConfig,
    ...updates,
  };
  writeJsonFile(SHEETS_CONFIG_FILE, sharedSheetsConfig);
  res.json({
    success: true,
    config: sharedSheetsConfig,
  });
});

// POST manual trigger sync to Google Sheets
app.post('/api/sheets/sync', async (req, res) => {
  const { webhookUrl, projects } = req.body;
  const targetUrl = webhookUrl || sharedSheetsConfig.webhookUrl;
  const targetProjects = Array.isArray(projects) ? projects : sharedProjects;

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      message: 'ยังไม่ได้ระบุ Webhook URL สำหรับ Google Sheets',
    });
  }

  const result = await syncToWebhook(targetUrl, targetProjects);
  res.json(result);
});

// GET pull data from Google Apps Script Web App
app.get('/api/sheets/pull', async (req, res) => {
  const webhookUrl = req.query.url as string || sharedSheetsConfig.webhookUrl;
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return res.status(400).json({
      success: false,
      message: 'ยังไม่ได้ตั้งค่า Webhook URL',
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Google Web App HTTP error ${response.status}`);
    }

    const data: any = await response.json();
    if (Array.isArray(data?.projects)) {
      sharedProjects = data.projects;
      writeJsonFile(PROJECTS_FILE, sharedProjects);
      return res.json({
        success: true,
        projects: sharedProjects,
        count: sharedProjects.length,
        message: `ดึงข้อมูลสำเร็จ ${sharedProjects.length} โครงการ`,
      });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `ไม่สามารถดึงข้อมูลจาก Google Sheets ได้: ${error.message}`,
    });
  }
});

// POST switch database from a new Google Sheet link
app.post('/api/sheets/switch-database', (req, res) => {
  try {
    const { spreadsheetUrl, spreadsheetId, webhookUrl, projects } = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ success: false, message: 'Invalid projects array' });
    }

    // 1. Reset deleted IDs tombstone
    deletedProjectIds.clear();
    writeJsonFile(DELETED_IDS_FILE, []);

    // 2. Completely replace system projects with new sheet's data
    sharedProjects = projects;
    writeJsonFile(PROJECTS_FILE, sharedProjects);

    // 3. Update active Google Sheets configuration
    sharedSheetsConfig = {
      ...sharedSheetsConfig,
      spreadsheetUrl: spreadsheetUrl || sharedSheetsConfig.spreadsheetUrl,
      spreadsheetId: spreadsheetId || sharedSheetsConfig.spreadsheetId,
      webhookUrl: webhookUrl !== undefined ? webhookUrl : sharedSheetsConfig.webhookUrl,
      lastSyncedAt: new Date().toISOString(),
    };
    writeJsonFile(SHEETS_CONFIG_FILE, sharedSheetsConfig);

    res.json({
      success: true,
      message: `เปลี่ยนฐานข้อมูลสำเร็จ นำเข้าข้อมูลทั้งหมด ${projects.length} โครงการเรียบร้อยแล้ว`,
      count: projects.length,
      config: sharedSheetsConfig,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET fetch public CSV export from Google Sheets (CORS proxy)
app.get('/api/sheets/fetch-public', async (req, res) => {
  const spreadsheetId = req.query.id as string;
  if (!spreadsheetId) {
    return res.status(400).json({ success: false, message: 'Missing spreadsheet id' });
  }

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Google responded with HTTP ${response.status}`);
    }
    const csvText = await response.text();
    res.json({ success: true, csv: csvText });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `ไม่สามารถดึงข้อมูลสาธารณะจาก Google Sheets ได้: ${error.message}`,
    });
  }
});

// ================= VITE / STATIC SERVING =================
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(indexHtmlPath);

  // Only run purely static production serving if explicitly in production AND dist exists.
  // In development (or if dist hasn't been built yet), mount Vite middleware to serve on the fly.
  const isProduction = process.env.NODE_ENV === 'production' && hasDist;

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted successfully');
    } catch (viteError) {
      console.error('Failed to initialize Vite middleware:', viteError);
      if (hasDist) {
        console.log('Falling back to static dist');
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api')) return next();
          res.sendFile(indexHtmlPath, (err) => {
            if (err) next(err);
          });
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath, (err) => {
          if (err) next(err);
        });
      } else {
        res.status(503).send('Application build in progress or not found. Please refresh shortly.');
      }
    });
  }

  function bindPort(port: number) {
    try {
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`CMC Project Tracking Server running on http://0.0.0.0:${port}`);
      });
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${port} is already in use (e.g., active reverse proxy), skipping.`);
        } else {
          console.error(`Error on port ${port}:`, err);
        }
      });
      return server;
    } catch (e) {
      console.warn(`Failed to bind port ${port}:`, e);
    }
  }

  // Bind target PORT (such as 8080 in Cloud Run)
  bindPort(PORT);

  // Also bind 3000 if target PORT is different (supports local reverse proxies and dev environments)
  if (PORT !== 3000) {
    bindPort(3000);
  }
}

startServer();
