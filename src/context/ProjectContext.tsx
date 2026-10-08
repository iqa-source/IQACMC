import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  EducationLevel,
  ProjectItem,
  ProjectAttachment,
  ProjectStatus,
  AuditLogEntry,
  GoogleSheetsConfig,
  AppView,
  BulkAddPayload,
  ParsedBulkProjectItem,
} from '../types';
import { INITIAL_PROJECTS } from '../mockData';
import { useAuth } from './AuthContext';
import {
  exportProjectsToExcel,
  exportProjectsToCSV,
  exportProjectsToJSON,
  syncProjectsToGoogleSheet,
  pullProjectsFromGoogleSheet,
  extractSpreadsheetId,
  parseCSV,
  parseRowsToProjects,
} from '../utils/googleSheetsSync';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  getGoogleAccessToken,
  createGoogleSpreadsheetAutomatically,
  syncToExistingGoogleSpreadsheet,
  fetchProjectsFromGoogleSpreadsheet,
  deleteGoogleSpreadsheet,
  CreateSpreadsheetResult,
  isGoogleSessionExpired as checkApiGoogleSessionExpired,
  auth,
} from '../services/googleSheetsApi';
import { User } from 'firebase/auth';

export interface SyncFeedbackResult {
  success: boolean;
  message: string;
  time: string;
}

interface ProjectContextType {
  currentLevel: EducationLevel | null;
  setCurrentLevel: (level: EducationLevel | null) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  isAdmin: boolean;
  loginAdmin: (username: string, password: string) => boolean;
  logoutAdmin: () => void;
  projects: ProjectItem[];
  filteredProjects: ProjectItem[];
  addProject: (data: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt' | 'attachments'>) => Promise<{ success: boolean; message?: string }>;
  bulkAddProjects: (payload: BulkAddPayload) => Promise<{ success: boolean; count: number; message?: string }>;
  updateProject: (id: string, data: Partial<ProjectItem>, auditNote?: string) => Promise<{ success: boolean; message?: string; syncResult?: SyncFeedbackResult }>;
  deleteProject: (id: string) => Promise<{ success: boolean; message?: string }>;
  deleteMultipleProjects: (ids: string[]) => Promise<{ success: boolean; count?: number; message?: string }>;
  deleteAllProjects: (academicYear?: number, level?: EducationLevel) => Promise<{ success: boolean; count?: number; message?: string }>;
  addAttachmentToProject: (
    projectId: string,
    file: File
  ) => Promise<{ success: boolean; message?: string; attachment?: ProjectAttachment; project?: ProjectItem }>;
  removeAttachmentFromProject: (
    projectId: string,
    attachmentId: string
  ) => Promise<{ success: boolean; message?: string; project?: ProjectItem }>;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  availableYears: number[];
  resetToGateway: () => void;
  // Google Sheets Online Database & Realtime Sync
  googleSheetsConfig: GoogleSheetsConfig;
  updateGoogleSheetsConfig: (cfg: Partial<GoogleSheetsConfig>) => void;
  syncToGoogleSheetsNow: () => Promise<{ success: boolean; message: string }>;
  isSyncingSheets: boolean;
  isPullingSheets: boolean;
  pullFromGoogleSheets: () => Promise<{ success: boolean; message: string; count?: number }>;
  lastAutoSyncResult: SyncFeedbackResult | null;
  refreshSharedProjects: () => Promise<void>;
  // Automatic Google Sheet creation & Direct API Sync
  googleUser: User | null;
  hasValidGoogleToken: boolean;
  connectGoogleAccount: () => Promise<{ user: User; accessToken: string } | null>;
  disconnectGoogleAccount: () => Promise<void>;
  reconnectGoogle: () => Promise<{ success: boolean; message: string }>;
  isGoogleSessionExpired: () => boolean;
  createGoogleSheetAuto: () => Promise<CreateSpreadsheetResult>;
  // Admin-only Offline Exports
  exportExcel: (level?: EducationLevel | 'all', year?: number | 'all') => void;
  exportCSV: (level?: EducationLevel | 'all', year?: number | 'all') => void;
  exportJSON: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_PROJECTS_KEY = 'cmc_project_tracking_data_v3';
const STORAGE_LEVEL_KEY = 'cmc_project_current_level';
const STORAGE_SHEETS_CONFIG_KEY = 'cmc_sheets_config_v2';
const STORAGE_DELETED_KEY = 'cmc_deleted_project_ids_v1';
const STORAGE_BOOTSTRAPPED_KEY = 'cmc_app_bootstrapped_v1';

// Helper to get set of deleted project IDs from local tombstone
const getStoredDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn('Failed to parse stored deleted IDs:', e);
  }
  return new Set<string>();
};

const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  spreadsheetUrl: '',
  spreadsheetId: '',
  webhookUrl: '',
  autoSync: true,
  syncStatus: 'idle',
};

// Helper to determine the latest academic year from a list of projects or default
const getLatestYear = (items: ProjectItem[]): number => {
  const validYears = items
    .map((p) => p.academicYear)
    .filter((y) => typeof y === 'number' && !isNaN(y) && y > 0);
  if (validYears.length > 0) {
    return Math.max(...validYears);
  }
  return 2569;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin: isAuthAdmin, logout, loginAdmin: authLoginAdmin } = useAuth();

  // Google Auth User for direct Sheets API access
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasValidGoogleToken, setHasValidGoogleToken] = useState<boolean>(() => !!getGoogleAccessToken());

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasValidGoogleToken(!!token);
      },
      () => {
        setGoogleUser(null);
        setHasValidGoogleToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Education level gateway state:
  // Starts as null so when entering/logging into the system, the user is required to select their level first on GatewayScreen
  const [currentLevel, setCurrentLevelState] = useState<EducationLevel | null>(null);

  // Default view: Starts at 'reporting' as requested
  const [currentView, setCurrentView] = useState<AppView>('reporting');
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);

  // Google Sheets configuration
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHEETS_CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load sheets config', e);
    }
    return DEFAULT_SHEETS_CONFIG;
  });

  // Projects state - initialized with tombstone protection
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const deletedIds = getStoredDeletedIds();
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: ProjectItem) => !deletedIds.has(p.id));
        }
      }
    } catch (e) {
      console.error('Failed to load stored projects:', e);
    }
    return INITIAL_PROJECTS.filter((p) => !deletedIds.has(p.id));
  });

  const isDeletingRef = useRef(false);
  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Selected academic year: Defaults to the latest year available
  const hasManuallySelectedYear = useRef(false);
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    return getLatestYear(projects);
  });

  const setSelectedYear = useCallback((year: number) => {
    hasManuallySelectedYear.current = true;
    setSelectedYearState(year);
  }, []);

  // Ensure selectedYear reflects the latest year if user hasn't explicitly chosen another year
  useEffect(() => {
    if (!hasManuallySelectedYear.current && projects.length > 0) {
      const latest = getLatestYear(projects);
      if (latest) {
        setSelectedYearState(latest);
      }
    }
  }, [projects]);

  const [lastAutoSyncResult, setLastAutoSyncResult] = useState<SyncFeedbackResult | null>(null);
  const [isPullingSheets, setIsPullingSheets] = useState<boolean>(false);

  // 1. Fetch shared Google Sheets configuration and projects on startup
  useEffect(() => {
    // Load shared sheets config from server
    fetch('/api/sheets/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.config) {
          setGoogleSheetsConfig((prev) => ({
            ...prev,
            spreadsheetId: data.config.spreadsheetId || prev.spreadsheetId,
            spreadsheetUrl: data.config.spreadsheetUrl || prev.spreadsheetUrl,
            webhookUrl: data.config.webhookUrl || prev.webhookUrl,
            lastSyncedAt: data.config.lastSyncedAt || prev.lastSyncedAt,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // 2. Real-time synchronizer: Fetch shared projects from server and poll periodically
  const refreshSharedProjects = useCallback(async () => {
    // If a deletion is currently in-progress, skip background poll to avoid race conditions
    if (isDeletingRef.current) return;

    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      const deletedIds = getStoredDeletedIds();

      if (data?.success && Array.isArray(data.projects)) {
        // Filter out any tombstoned project IDs
        const safeProjects = data.projects.filter(
          (p: ProjectItem) => !deletedIds.has(p.id)
        );

        if (safeProjects.length > 0) {
          setProjects(safeProjects);
          localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(safeProjects));
          localStorage.setItem(STORAGE_BOOTSTRAPPED_KEY, 'true');
        } else {
          // If server returned 0 active projects:
          const isBootstrapped = localStorage.getItem(STORAGE_BOOTSTRAPPED_KEY) === 'true';
          if (!isBootstrapped && projectsRef.current.length > 0) {
            // First-ever bootstrap only
            const toInit = projectsRef.current.filter((p) => !deletedIds.has(p.id));
            if (toInit.length > 0) {
              fetch('/api/projects/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projects: toInit }),
              }).catch(() => {});
            }
            localStorage.setItem(STORAGE_BOOTSTRAPPED_KEY, 'true');
          } else {
            // System already bootstrapped, 0 projects means empty list
            setProjects([]);
            localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify([]));
          }
        }
      }
    } catch (e) {
      // Offline or network lag - fallback to local storage
    }
  }, []);

  useEffect(() => {
    refreshSharedProjects();

    // Polling every 8 seconds for multi-user live updates
    const timer = setInterval(() => {
      refreshSharedProjects();
    }, 8000);

    // Also refresh on window focus
    const onWindowFocus = () => {
      refreshSharedProjects();
    };
    window.addEventListener('focus', onWindowFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [refreshSharedProjects]);

  // Persist projects to localStorage as local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to persist projects:', e);
    }
  }, [projects]);

  // Persist Google Sheets config
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHEETS_CONFIG_KEY, JSON.stringify(googleSheetsConfig));
    } catch (e) {
      console.error('Failed to persist sheets config:', e);
    }
  }, [googleSheetsConfig]);

  const updateGoogleSheetsConfig = (cfg: Partial<GoogleSheetsConfig>) => {
    setGoogleSheetsConfig((prev) => {
      const updated = {
        ...prev,
        ...cfg,
      };
      // Propagate shared sheet config to server so all other users have it immediately!
      fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const connectGoogleAccount = async () => {
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        setHasValidGoogleToken(true);
      }
      return res;
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return null;
      }
      console.warn('Connect Google notice:', err?.message || err);
      throw err;
    }
  };

  const disconnectGoogleAccount = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setHasValidGoogleToken(false);
  };

  const reconnectGoogle = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await connectGoogleAccount();
      if (res?.accessToken) {
        setHasValidGoogleToken(true);
        if (googleSheetsConfig.spreadsheetId) {
          await syncToGoogleSheetsNow();
        }
        return { success: true, message: 'เข้าสู่ระบบ Google สำเร็จและเชื่อมต่อข้อมูลเรียบร้อยแล้ว' };
      }
      return { success: false, message: 'การเข้าสู่ระบบ Google ถูกยกเลิก หรือหน้าต่างถูกปิด' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'ไม่สามารถเข้าสู่ระบบ Google ได้' };
    }
  };

  const isGoogleSessionExpired = (): boolean => {
    if (hasValidGoogleToken && getGoogleAccessToken()) return false;
    if (googleUser || auth.currentUser) return true;
    return checkApiGoogleSessionExpired();
  };

  /**
   * Automatically create Google Sheet, build tabs, style header, save projects,
   * migrate all data logging & sync targets to the new sheet, and delete the old spreadsheet!
   */
  const createGoogleSheetAuto = async (): Promise<CreateSpreadsheetResult> => {
    setIsSyncingSheets(true);
    setGoogleSheetsConfig((prev) => ({ ...prev, syncStatus: 'syncing' }));

    const oldSpreadsheetId = googleSheetsConfig.spreadsheetId;

    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const authRes = await connectGoogleAccount();
        if (!authRes?.accessToken) {
          setIsSyncingSheets(false);
          setGoogleSheetsConfig((prev) => ({
            ...prev,
            syncStatus: prev.spreadsheetId ? 'success' : 'idle',
            lastError: undefined,
          }));
          return {
            success: false,
            message: 'การเข้าสู่ระบบ Google ถูกยกเลิก หรือหน้าต่างถูกปิด',
          };
        }
        token = authRes.accessToken;
      }

      // 1. Create fresh spreadsheet with all worksheets and styling
      const result = await createGoogleSpreadsheetAutomatically(projects, token);
      if (result.success && result.spreadsheetId && result.spreadsheetUrl) {
        const now = new Date().toISOString();
        const updatedConfig: GoogleSheetsConfig = {
          ...googleSheetsConfig,
          spreadsheetId: result.spreadsheetId,
          spreadsheetUrl: result.spreadsheetUrl,
          lastSyncedAt: now,
          syncStatus: 'success',
          lastError: undefined,
        };

        // 2. Migrate data logging target to the new sheet immediately (Client State & Local Storage)
        setGoogleSheetsConfig(updatedConfig);
        localStorage.setItem(STORAGE_SHEETS_CONFIG_KEY, JSON.stringify(updatedConfig));
        localStorage.removeItem(STORAGE_DELETED_KEY); // Reset deleted tombstones

        // 3. Migrate data logging on server database so all users and APIs switch immediately
        await fetch('/api/sheets/switch-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetUrl: result.spreadsheetUrl,
            spreadsheetId: result.spreadsheetId,
            webhookUrl: googleSheetsConfig.webhookUrl,
            projects: projects,
          }),
        }).catch(() => {});

        await fetch('/api/sheets/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig),
        }).catch(() => {});

        // 4. Delete the old spreadsheet from Google Drive if one existed
        let oldDeleteMsg = '';
        if (oldSpreadsheetId && oldSpreadsheetId !== result.spreadsheetId) {
          try {
            const delRes = await deleteGoogleSpreadsheet(oldSpreadsheetId, token);
            if (delRes.success) {
              oldDeleteMsg = ' และได้ลบสเปรดชีตชุดเดิมออกจาก Google Drive เรียบร้อยแล้ว';
            } else {
              oldDeleteMsg = ` (สเปรดชีตเดิม: ${delRes.message})`;
            }
          } catch (delErr) {
            console.warn('Could not delete old spreadsheet:', delErr);
          }
        }

        result.message = `สร้างสเปรดชีตชุดใหม่สำเร็จ! ย้ายการบันทึกข้อมูลโครงการทั้งหมด (${projects.length} โครงการ) ไปลงที่สเปรดชีตใหม่เรียบร้อยแล้ว${oldDeleteMsg}`;
      } else {
        setGoogleSheetsConfig((prev) => ({
          ...prev,
          syncStatus: 'error',
          lastError: result.message,
        }));
      }

      setIsSyncingSheets(false);
      return result;
    } catch (err: any) {
      setIsSyncingSheets(false);
      const errMsg = err?.message || 'เกิดข้อผิดพลาดในการสร้าง Google Sheets';
      setGoogleSheetsConfig((prev) => ({
        ...prev,
        syncStatus: 'error',
        lastError: errMsg,
      }));
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  /**
   * Sync projects to Google Sheets now
   */
  const syncToGoogleSheetsNow = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncingSheets(true);
    setGoogleSheetsConfig((prev) => ({ ...prev, syncStatus: 'syncing' }));

    // Priority 1: Direct Google Sheets API if spreadsheetId is available and user already has an active token
    if (googleSheetsConfig.spreadsheetId) {
      const token = getGoogleAccessToken();
      if (token) {
        try {
          const directRes = await syncToExistingGoogleSpreadsheet(
            googleSheetsConfig.spreadsheetId,
            projects,
            token
          );
          const now = new Date().toISOString();
          if (directRes.success) {
            setGoogleSheetsConfig((prev) => ({
              ...prev,
              syncStatus: 'success',
              lastSyncedAt: now,
              lastError: undefined,
            }));
            setIsSyncingSheets(false);
            return directRes;
          } else if (directRes.isAuthError) {
            setHasValidGoogleToken(false);
          }
        } catch (err: any) {
          console.warn('Direct sheets sync notice:', err);
        }
      }
    }

    // Priority 2: Webhook URL if set (supports multi-user without individual Google login)
    if (googleSheetsConfig.webhookUrl) {
      const res = await syncProjectsToGoogleSheet(googleSheetsConfig.webhookUrl, projects);
      const now = new Date().toISOString();
      setGoogleSheetsConfig((prev) => ({
        ...prev,
        syncStatus: res.success ? 'success' : 'error',
        lastSyncedAt: res.success ? now : prev.lastSyncedAt,
        lastError: res.success ? undefined : res.message,
      }));
      setIsSyncingSheets(false);
      return res;
    }

    // Fallback: Data is securely stored in central system server and local cache
    setIsSyncingSheets(false);
    setGoogleSheetsConfig((prev) => ({
      ...prev,
      syncStatus: 'idle',
    }));
    return {
      success: true,
      message: 'บันทึกข้อมูลในระบบฐานข้อมูลกลางเรียบร้อยแล้ว',
    };
  };

  /**
   * Real-time automatic sync on project mutation
   */
  const dispatchAutoSync = useCallback(
    async (updatedProjects: ProjectItem[]): Promise<SyncFeedbackResult> => {
      const now = new Date().toISOString();
      if (!googleSheetsConfig.autoSync) {
        const res: SyncFeedbackResult = {
          success: true,
          message: 'บันทึกในระบบเรียบร้อย (Auto-sync ปิดอยู่)',
          time: now,
        };
        setLastAutoSyncResult(res);
        return res;
      }

      setGoogleSheetsConfig((prev) => ({ ...prev, syncStatus: 'syncing' }));

      // Priority 1: Direct Google Sheets API if spreadsheetId and token are available
      const token = getGoogleAccessToken();
      if (googleSheetsConfig.spreadsheetId && token) {
        try {
          const directRes = await syncToExistingGoogleSpreadsheet(
            googleSheetsConfig.spreadsheetId,
            updatedProjects,
            token
          );
          if (directRes.success) {
            setGoogleSheetsConfig((prev) => ({
              ...prev,
              lastSyncedAt: now,
              syncStatus: 'success',
              lastError: undefined,
            }));
            const syncRes: SyncFeedbackResult = {
              success: true,
              message: `ส่งข้อมูล ${updatedProjects.length} โครงการไปยัง Google Sheets เรียบร้อยแล้ว`,
              time: now,
            };
            setLastAutoSyncResult(syncRes);
            return syncRes;
          } else if (directRes.isAuthError) {
            setHasValidGoogleToken(false);
            // Fall through to try Webhook or graceful notice
          } else {
            setGoogleSheetsConfig((prev) => ({
              ...prev,
              syncStatus: 'error',
              lastError: directRes.message,
            }));
          }
        } catch (err: any) {
          console.warn('Direct sheets auto-sync notice:', err);
        }
      }

      // Priority 2: Webhook URL (supports multi-user without individual Google login)
      if (googleSheetsConfig.webhookUrl) {
        try {
          const hookRes = await syncProjectsToGoogleSheet(
            googleSheetsConfig.webhookUrl,
            updatedProjects
          );
          setGoogleSheetsConfig((prev) => ({
            ...prev,
            lastSyncedAt: hookRes.success ? now : prev.lastSyncedAt,
            syncStatus: hookRes.success ? 'success' : 'error',
            lastError: hookRes.success ? undefined : hookRes.message,
          }));
          const syncRes: SyncFeedbackResult = {
            success: hookRes.success,
            message: hookRes.success
              ? `ส่งข้อมูล ${updatedProjects.length} โครงการไปยัง Google Sheets เรียบร้อยแล้ว`
              : hookRes.message,
            time: now,
          };
          setLastAutoSyncResult(syncRes);
          return syncRes;
        } catch (err: any) {
          console.warn('Webhook auto-sync notice:', err);
        }
      }

      // Fallback: The data has already been safely saved to system memory and local/server DB
      let syncMsg = 'บันทึกในระบบเรียบร้อยแล้ว';
      if (googleSheetsConfig.spreadsheetId && !token) {
        syncMsg = 'บันทึกในระบบเรียบร้อยแล้ว (เซสชัน Google สิ้นสุดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้งเพื่ออัปเดตชีท)';
      }

      setGoogleSheetsConfig((prev) => ({
        ...prev,
        syncStatus: 'idle',
      }));

      const fallbackRes: SyncFeedbackResult = {
        success: true,
        message: syncMsg,
        time: now,
      };
      setLastAutoSyncResult(fallbackRes);
      return fallbackRes;
    },
    [googleSheetsConfig.autoSync, googleSheetsConfig.spreadsheetId, googleSheetsConfig.webhookUrl]
  );

  /**
   * Pull projects from Google Sheets (via Webhook GET, direct Sheets API, or public CSV proxy)
   */
  const pullFromGoogleSheets = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    count?: number;
  }> => {
    setIsPullingSheets(true);
    try {
      // Helper to process fetched projects with Google Sheets as primary authority
      const applyGoogleSheetsData = async (fetchedProjects: ProjectItem[], sourceName: string) => {
        if (!fetchedProjects || fetchedProjects.length === 0) return null;

        // 1. Google Sheets is authoritative: un-tombstone any project IDs fetched from Google Sheets
        const currentDeleted = getStoredDeletedIds();
        fetchedProjects.forEach((p) => {
          if (p.id) currentDeleted.delete(p.id);
        });
        localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));

        // 2. Merge preserving local attachments and audit logs, but taking all fields from Google Sheet
        const existingMap = new Map<string, ProjectItem>(projectsRef.current.map((p) => [p.id, p]));
        const mergedProjects = fetchedProjects.map((item) => {
          const prev = existingMap.get(item.id);
          return {
            ...item,
            attachments: prev?.attachments?.length ? prev.attachments : (item.attachments || []),
            auditLogs: prev?.auditLogs?.length ? prev.auditLogs : (item.auditLogs || []),
          };
        });

        // 3. Immediately set state & persist
        setProjects(mergedProjects);
        projectsRef.current = mergedProjects;
        localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(mergedProjects));
        localStorage.setItem(STORAGE_BOOTSTRAPPED_KEY, 'true');

        // 4. Update server database
        await fetch('/api/projects/init?force=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projects: mergedProjects }),
        }).catch(() => {});

        setIsPullingSheets(false);
        return {
          success: true,
          message: `ดึงข้อมูลจาก ${sourceName} สำเร็จ (${mergedProjects.length} โครงการ)`,
          count: mergedProjects.length,
        };
      };

      // 1. Webhook pull if configured
      if (googleSheetsConfig.webhookUrl) {
        const res = await pullProjectsFromGoogleSheet(googleSheetsConfig.webhookUrl);
        if (res.success && res.projects && res.projects.length > 0) {
          const applied = await applyGoogleSheetsData(res.projects, 'Google Sheets');
          if (applied) return applied;
        }
      }

      // 2. Direct Sheets API pull if spreadsheetId exists and user already has a valid token
      if (googleSheetsConfig.spreadsheetId) {
        const token = getGoogleAccessToken();

        if (token) {
          try {
            const res = await fetchProjectsFromGoogleSpreadsheet(
              googleSheetsConfig.spreadsheetId,
              token
            );
            if (res.success) {
              let fetchedProjects: ProjectItem[] = [];
              if (res.parsedProjects && res.parsedProjects.length > 0) {
                fetchedProjects = res.parsedProjects;
              } else if (res.rows && res.rows.length > 1) {
                fetchedProjects = parseRowsToProjects(res.rows);
              }

              if (fetchedProjects.length > 0) {
                const applied = await applyGoogleSheetsData(fetchedProjects, 'Google Sheets API');
                if (applied) return applied;
              }
            } else if (res.isAuthError) {
              setHasValidGoogleToken(false);
            }
          } catch (apiErr) {
            console.warn('Direct sheets API pull note:', apiErr);
          }
        }

        // 3. Fallback: Try server-side public CSV proxy
        try {
          const pubRes = await fetch(
            `/api/sheets/fetch-public?id=${encodeURIComponent(googleSheetsConfig.spreadsheetId)}`
          );
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            if (pubData.success && pubData.csv) {
              const rows = parseCSV(pubData.csv);
              if (rows.length > 1) {
                const fetchedProjects = parseRowsToProjects(rows);
                if (fetchedProjects.length > 0) {
                  const applied = await applyGoogleSheetsData(fetchedProjects, 'Google Sheets');
                  if (applied) return applied;
                }
              }
            }
          }
        } catch (pubErr) {
          console.warn('Public CSV pull note:', pubErr);
        }
      }

      // 4. Central database sync fallback (always succeeds with server & cached data)
      await refreshSharedProjects();
      setIsPullingSheets(false);
      return {
        success: true,
        message: `เชื่อมต่อและอัปเดตข้อมูลจากฐานข้อมูลกลางสำเร็จ (${projectsRef.current.length} โครงการ)`,
        count: projectsRef.current.length,
      };
    } catch (err: any) {
      setIsPullingSheets(false);
      return {
        success: false,
        message: err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets',
      };
    }
  }, [googleSheetsConfig.webhookUrl, googleSheetsConfig.spreadsheetId]);

  const setCurrentLevel = (level: EducationLevel | null) => {
    setCurrentLevelState(level);
    if (level) {
      localStorage.setItem(STORAGE_LEVEL_KEY, level);
      // Start immediately at reporting view when entering education level
      setCurrentView('reporting');
    } else {
      localStorage.removeItem(STORAGE_LEVEL_KEY);
    }
  };

  const resetToGateway = () => {
    setCurrentLevelState(null);
    localStorage.removeItem(STORAGE_LEVEL_KEY);
    setCurrentView('reporting');
    hasManuallySelectedYear.current = false;
    setSelectedYearState(getLatestYear(projectsRef.current));
  };

  const loginAdmin = (username: string, password: string): boolean => {
    return authLoginAdmin(username, password).success;
  };

  const logoutAdmin = () => {
    logout();
  };

  const filteredProjects = currentLevel
    ? projects.filter((p) => p.level === currentLevel)
    : projects;

  const availableYears = Array.from(
    new Set([
      ...projects
        .map((p) => p.academicYear)
        .filter((y) => typeof y === 'number' && !isNaN(y) && y > 0),
      2569,
      2568,
    ])
  ).sort((a, b) => b - a);

  const addProject = async (
    data: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt' | 'attachments'>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!isAuthAdmin) {
      return { success: false, message: 'คุณต้องเข้าสู่ระบบแอดมินก่อนเพิ่มโครงการ' };
    }

    const now = new Date().toISOString();
    const reporterName = currentUser?.name || 'ผู้ดูแลระบบ CMC';
    const reporterEmail = currentUser?.email || 'admin@cmc.ac.th';

    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: now,
      reportedBy: reporterName,
      reportedByEmail: reporterEmail,
      action: 'create',
      note: 'สร้างโครงการใหม่ในระบบ',
      resultQuantityPercent: data.resultQuantityPercent,
      status: data.status,
    };

    const newProject: ProjectItem = {
      ...data,
      id: `cmc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      attachments: [],
      createdAt: now,
      updatedAt: now,
      lastReportedAt: now,
      lastReportedBy: reporterName,
      lastReportedByEmail: reporterEmail,
      auditLogs: [auditEntry],
    };

    const updated = [newProject, ...projects];
    setProjects(updated);

    // Save to shared server API
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
    }).catch(() => {});

    await dispatchAutoSync(updated);
    return { success: true };
  };

  const bulkAddProjects = async ({
    academicYear,
    level,
    strategy,
    projectNamesText,
    parsedProjects,
  }: BulkAddPayload): Promise<{ success: boolean; count: number; message?: string }> => {
    if (!isAuthAdmin) {
      return { success: false, count: 0, message: 'คุณต้องเข้าสู่ระบบแอดมินก่อนเพิ่มโครงการ' };
    }

    const defaultStandard =
      level === 'early_childhood' ? 'มาตรฐานที่ 1 คุณภาพเด็ก' : 'มาตรฐานที่ 1 คุณภาพผู้เรียน';

    const now = new Date().toISOString();
    const reporterName = currentUser?.name || 'ผู้ดูแลระบบ CMC';
    const reporterEmail = currentUser?.email || 'admin@cmc.ac.th';

    let newProjects: ProjectItem[] = [];

    if (parsedProjects && parsedProjects.length > 0) {
      newProjects = parsedProjects.map((item, idx) => {
        const itemLevel = item.level || level;
        const itemDefaultStandard =
          itemLevel === 'early_childhood' ? 'มาตรฐานที่ 1 คุณภาพเด็ก' : 'มาตรฐานที่ 1 คุณภาพผู้เรียน';

        return {
          id: `cmc-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name.trim(),
          level: itemLevel,
          academicYear: item.academicYear || academicYear,
          strategy: item.strategy || strategy,
          targetQuantityPercent: item.targetQuantityPercent ?? 100,
          targetQualityDesc: item.targetQualityDesc || 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
          resultQuantityPercent: item.resultQuantityPercent ?? 0,
          resultQualityDesc: item.resultQualityDesc || 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน',
          standards: item.standards && item.standards.length > 0 ? item.standards : [itemDefaultStandard],
          ministryPolicies: ['2. การยกระดับคุณภาพการศึกษา'],
          nationalOutcomes: ['1. ผู้เรียนรู้ (Learner Person) เพื่อสร้างงานและคุณภาพชีวิตที่ดี'],
          responsiblePerson: item.responsiblePerson?.trim() || 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน',
          verifier: 'ฝ่ายนโยบายและแผนงาน',
          status: (item.status || '6. ยังไม่ดำเนินการ') as ProjectStatus,
          budget: item.budget || 0,
          attachments: [],
          createdAt: now,
          updatedAt: now,
          lastReportedAt: now,
          lastReportedBy: reporterName,
          lastReportedByEmail: reporterEmail,
          auditLogs: [
            {
              id: `audit-${Date.now()}-${idx}`,
              timestamp: now,
              reportedBy: reporterName,
              reportedByEmail: reporterEmail,
              action: 'create',
              note: 'สร้างโครงการผ่านระบบจัดเรียงและคัดแยกข้อมูลนำเข้าทีละมาก (Intelligent Bulk Import)',
              resultQuantityPercent: item.resultQuantityPercent ?? 0,
              status: (item.status || '6. ยังไม่ดำเนินการ') as ProjectStatus,
            },
          ],
        };
      });
    } else if (projectNamesText) {
      const lines = projectNamesText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        return { success: false, count: 0, message: 'กรุณาระบุชื่อโครงการอย่างน้อย 1 โครงการ' };
      }

      newProjects = lines.map((name, idx) => ({
        id: `cmc-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        name,
        level,
        academicYear,
        strategy,
        targetQuantityPercent: 100,
        targetQualityDesc: 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
        resultQuantityPercent: 0,
        resultQualityDesc: 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน',
        standards: [defaultStandard],
        ministryPolicies: ['2. การยกระดับคุณภาพการศึกษา'],
        nationalOutcomes: ['1. ผู้เรียนรู้ (Learner Person) เพื่อสร้างงานและคุณภาพชีวิตที่ดี'],
        responsiblePerson: 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน',
        verifier: 'ฝ่ายนโยบายและแผนงาน',
        status: '6. ยังไม่ดำเนินการ' as ProjectStatus,
        attachments: [],
        createdAt: now,
        updatedAt: now,
        lastReportedAt: now,
        lastReportedBy: reporterName,
        lastReportedByEmail: reporterEmail,
        auditLogs: [
          {
            id: `audit-${Date.now()}-${idx}`,
            timestamp: now,
            reportedBy: reporterName,
            reportedByEmail: reporterEmail,
            action: 'create',
            note: 'สร้างโครงการผ่านระบบเพิ่มข้อมูลทีละมาก (Bulk Add)',
            resultQuantityPercent: 0,
            status: '6. ยังไม่ดำเนินการ',
          },
        ],
      }));
    } else {
      return { success: false, count: 0, message: 'ไม่พบรายการโครงการที่พร้อมนำเข้า' };
    }

    const updated = [...newProjects, ...projects];
    setProjects(updated);

    // Save batch to server API
    fetch('/api/projects/init?force=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: updated }),
    }).catch(() => {});

    await dispatchAutoSync(updated);
    return { success: true, count: newProjects.length };
  };

  const updateProject = async (
    id: string,
    data: Partial<ProjectItem>,
    auditNote?: string
  ): Promise<{ success: boolean; message?: string; syncResult?: SyncFeedbackResult }> => {
    const now = new Date().toISOString();
    const reporterName = currentUser?.name || 'ผู้ใช้งานระบบ CMC';
    const reporterEmail = currentUser?.email || '-';

    let targetUpdatedProject: ProjectItem | null = null;

    const updated = projects.map((p) => {
      if (p.id === id) {
        const auditEntry: AuditLogEntry = {
          id: `audit-${Date.now()}`,
          timestamp: now,
          reportedBy: reporterName,
          reportedByEmail: reporterEmail,
          action: 'update_report',
          note: auditNote || 'บันทึกรายงานผล / อัปเดตข้อมูลโครงการ',
          resultQuantityPercent: data.resultQuantityPercent !== undefined ? data.resultQuantityPercent : p.resultQuantityPercent,
          status: data.status || p.status,
        };

        const existingLogs = Array.isArray(p.auditLogs) ? p.auditLogs : [];

        targetUpdatedProject = {
          ...p,
          ...data,
          updatedAt: now,
          lastReportedAt: now,
          lastReportedBy: reporterName,
          lastReportedByEmail: reporterEmail,
          auditLogs: [auditEntry, ...existingLogs],
        };
        return targetUpdatedProject;
      }
      return p;
    });

    setProjects(updated);

    // Send update to shared server API so other users see it immediately
    if (targetUpdatedProject) {
      fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetUpdatedProject),
      }).catch(() => {});
    }

    // Auto sync to Google Sheets (Webhook or Direct API)
    const syncRes = await dispatchAutoSync(updated);
    return { success: true, syncResult: syncRes };
  };

  const deleteProject = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (!isAuthAdmin) {
      return { success: false, message: 'คุณต้องเข้าสู่ระบบแอดมินก่อนลบโครงการ' };
    }

    isDeletingRef.current = true;
    try {
      // 1. Immediately record in client tombstone (localStorage)
      const currentDeleted = getStoredDeletedIds();
      currentDeleted.add(id);
      localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));

      // 2. Immediately update local state & cache
      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      projectsRef.current = updated;
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updated));
      localStorage.setItem(STORAGE_BOOTSTRAPPED_KEY, 'true');

      // 3. Delete on server API and await completion
      try {
        const deleteRes = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (deleteRes.ok) {
          const resData = await deleteRes.json();
          if (resData?.projects && Array.isArray(resData.projects)) {
            const confirmedSafe = resData.projects.filter(
              (p: ProjectItem) => !currentDeleted.has(p.id)
            );
            setProjects(confirmedSafe);
            projectsRef.current = confirmedSafe;
            localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(confirmedSafe));
          }
        }
      } catch (netErr) {
        console.warn('Server delete network warning:', netErr);
      }

      // 4. Auto sync to Google Sheets (Webhook or Direct API) with deleted project removed
      await dispatchAutoSync(updated);

      return { success: true, message: 'ลบโครงการเรียบร้อยแล้ว' };
    } finally {
      // Keep guard active briefly to prevent race condition with any in-flight background request
      setTimeout(() => {
        isDeletingRef.current = false;
      }, 1500);
    }
  };

  /**
   * Delete multiple selected projects at once
   */
  const deleteMultipleProjects = async (
    ids: string[]
  ): Promise<{ success: boolean; count?: number; message?: string }> => {
    if (!isAuthAdmin) {
      return { success: false, message: 'คุณต้องเข้าสู่ระบบแอดมินก่อนลบโครงการ' };
    }
    if (!ids || ids.length === 0) {
      return { success: false, message: 'ไม่ได้เลือกโครงการที่ต้องการลบ' };
    }

    isDeletingRef.current = true;
    try {
      const idsSet = new Set(ids);
      const currentDeleted = getStoredDeletedIds();
      ids.forEach((id) => currentDeleted.add(id));
      localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));

      const updated = projects.filter((p) => !idsSet.has(p.id));
      setProjects(updated);
      projectsRef.current = updated;
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updated));
      localStorage.setItem(STORAGE_BOOTSTRAPPED_KEY, 'true');

      // Call backend batch delete API
      try {
        await fetch('/api/projects/delete-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
      } catch (err) {
        console.warn('Batch delete server call error:', err);
      }

      await dispatchAutoSync(updated);
      return { success: true, count: ids.length, message: `ลบ ${ids.length} โครงการเรียบร้อยแล้ว` };
    } finally {
      setTimeout(() => {
        isDeletingRef.current = false;
      }, 1500);
    }
  };

  /**
   * Delete all projects by academic year and optional level
   */
  const deleteAllProjects = async (
    academicYear?: number,
    level?: EducationLevel
  ): Promise<{ success: boolean; count?: number; message?: string }> => {
    if (!isAuthAdmin) {
      return { success: false, message: 'คุณต้องเข้าสู่ระบบแอดมินก่อนลบโครงการ' };
    }

    isDeletingRef.current = true;
    try {
      const toDelete = projects.filter((p) => {
        if (academicYear !== undefined && academicYear !== null && p.academicYear !== academicYear) {
          return false;
        }
        if (level && p.level !== level) {
          return false;
        }
        return true;
      });

      if (toDelete.length === 0) {
        return { success: true, count: 0, message: 'ไม่พบโครงการในรอบปีนี้ที่สามารถลบได้' };
      }

      const idsToDelete = toDelete.map((p) => p.id);
      const idsSet = new Set(idsToDelete);

      const currentDeleted = getStoredDeletedIds();
      idsToDelete.forEach((id) => currentDeleted.add(id));
      localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));

      const updated = projects.filter((p) => !idsSet.has(p.id));
      setProjects(updated);
      projectsRef.current = updated;
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(updated));
      localStorage.setItem(STORAGE_BOOTSTRAPPED_KEY, 'true');

      // Call backend delete-all API
      try {
        await fetch('/api/projects/delete-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academicYear, level }),
        });
      } catch (err) {
        console.warn('Delete-all server call error:', err);
      }

      await dispatchAutoSync(updated);
      return {
        success: true,
        count: idsToDelete.length,
        message: `ลบโครงการทั้งหมดในรอบปีนี้เรียบร้อย (${idsToDelete.length} โครงการ)`,
      };
    } finally {
      setTimeout(() => {
        isDeletingRef.current = false;
      }, 1500);
    }
  };

  const addAttachmentToProject = async (
    projectId: string,
    file: File
  ): Promise<{ success: boolean; message?: string; attachment?: ProjectAttachment; project?: ProjectItem }> => {
    try {
      const reporterName = currentUser?.name || 'ผู้ใช้งานระบบ CMC';
      const reporterEmail = currentUser?.email || '-';

      // 1. Try uploading to backend server endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('reporterName', reporterName);
      formData.append('reporterEmail', reporterEmail);

      let updatedProj: ProjectItem | null = null;
      let newAttachment: ProjectAttachment | null = null;

      try {
        const uploadRes = await fetch(`/api/projects/${projectId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          if (resData.success && resData.project) {
            updatedProj = resData.project;
            newAttachment = resData.attachment;
          }
        }
      } catch (netErr) {
        console.warn('Backend upload failed, attempting local fallback:', netErr);
      }

      // If backend upload succeeded, update local state
      if (updatedProj) {
        const updated = projects.map((p) => (p.id === projectId ? updatedProj! : p));
        setProjects(updated);
        dispatchAutoSync(updated);
        return { success: true, attachment: newAttachment || undefined, project: updatedProj };
      }

      // 2. Fallback: local FileReader dataUrl for smaller files
      const fileId = `file-${Date.now()}`;
      let dataUrl: string | undefined = undefined;
      if (file.size <= 5 * 1024 * 1024) {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const now = new Date().toISOString();
      newAttachment = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: now,
        dataUrl,
      };

      const updated = projects.map((p) => {
        if (p.id === projectId) {
          const auditEntry: AuditLogEntry = {
            id: `audit-att-${Date.now()}`,
            timestamp: now,
            reportedBy: reporterName,
            reportedByEmail: reporterEmail,
            action: 'attach_file',
            note: `แนบไฟล์สรุป/หลักฐาน: ${file.name}`,
          };
          updatedProj = {
            ...p,
            attachments: [newAttachment!, ...(p.attachments || [])],
            updatedAt: now,
            lastReportedAt: now,
            lastReportedBy: reporterName,
            lastReportedByEmail: reporterEmail,
            auditLogs: [auditEntry, ...(p.auditLogs || [])],
          };
          return updatedProj;
        }
        return p;
      });

      setProjects(updated);
      dispatchAutoSync(updated);
      return { success: true, attachment: newAttachment, project: updatedProj || undefined };
    } catch (err: any) {
      console.error('File upload error:', err);
      return { success: false, message: err?.message || 'ไม่สามารถแนบไฟล์ได้ กรุณาลองใหม่อีกครั้ง' };
    }
  };

  const removeAttachmentFromProject = async (
    projectId: string,
    attachmentId: string
  ): Promise<{ success: boolean; message?: string; project?: ProjectItem }> => {
    const reporterName = currentUser?.name || 'ผู้ใช้งานระบบ CMC';
    const reporterEmail = currentUser?.email || '-';

    let updatedProj: ProjectItem | null = null;
    try {
      const res = await fetch(`/api/projects/${projectId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterName, reporterEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.project) {
          updatedProj = data.project;
        }
      }
    } catch (e) {
      console.warn('Server delete error, updating locally:', e);
    }

    if (updatedProj) {
      const updated = projects.map((p) => (p.id === projectId ? updatedProj! : p));
      setProjects(updated);
      dispatchAutoSync(updated);
      return { success: true, project: updatedProj };
    }

    const now = new Date().toISOString();
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        updatedProj = {
          ...p,
          attachments: (p.attachments || []).filter((a) => a.id !== attachmentId),
          updatedAt: now,
        };
        return updatedProj;
      }
      return p;
    });

    setProjects(updated);
    dispatchAutoSync(updated);
    return { success: true, project: updatedProj || undefined };
  };

  const getExportSubset = (level?: EducationLevel | 'all', year?: number | 'all'): ProjectItem[] => {
    return projects.filter((p) => {
      if (level && level !== 'all' && p.level !== level) return false;
      if (year && year !== 'all' && p.academicYear !== year) return false;
      return true;
    });
  };

  const exportExcel = (level?: EducationLevel | 'all', year?: number | 'all') => {
    if (!isAuthAdmin) {
      alert('สงวนสิทธิ์การดาวน์โหลดข้อมูลสำรองออฟไลน์เฉพาะ Admin เท่านั้น');
      return;
    }
    const subset = getExportSubset(level, year);
    const dateStr = new Date().toISOString().split('T')[0];
    exportProjectsToExcel(subset, `CMC_Projects_Export_${dateStr}.xls`);
  };

  const exportCSV = (level?: EducationLevel | 'all', year?: number | 'all') => {
    if (!isAuthAdmin) {
      alert('สงวนสิทธิ์การดาวน์โหลดข้อมูลสำรองออฟไลน์เฉพาะ Admin เท่านั้น');
      return;
    }
    const subset = getExportSubset(level, year);
    const dateStr = new Date().toISOString().split('T')[0];
    exportProjectsToCSV(subset, `CMC_Projects_Export_${dateStr}.csv`);
  };

  const exportJSON = () => {
    if (!isAuthAdmin) {
      alert('สงวนสิทธิ์การดาวน์โหลดข้อมูลสำรองออฟไลน์เฉพาะ Admin เท่านั้น');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    exportProjectsToJSON(projects, `CMC_Projects_Backup_${dateStr}.json`);
  };

  return (
    <ProjectContext.Provider
      value={{
        currentLevel,
        setCurrentLevel,
        selectedYear,
        setSelectedYear,
        isAdmin: isAuthAdmin,
        loginAdmin,
        logoutAdmin,
        projects,
        filteredProjects,
        addProject,
        bulkAddProjects,
        updateProject,
        deleteProject,
        deleteMultipleProjects,
        deleteAllProjects,
        addAttachmentToProject,
        removeAttachmentFromProject,
        currentView,
        setCurrentView,
        availableYears,
        resetToGateway,
        googleSheetsConfig,
        updateGoogleSheetsConfig,
        syncToGoogleSheetsNow,
        isSyncingSheets,
        isPullingSheets,
        pullFromGoogleSheets,
        lastAutoSyncResult,
        refreshSharedProjects,
        googleUser,
        hasValidGoogleToken,
        connectGoogleAccount,
        disconnectGoogleAccount,
        reconnectGoogle,
        isGoogleSessionExpired,
        createGoogleSheetAuto,
        exportExcel,
        exportCSV,
        exportJSON,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectStore = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectStore must be used within a ProjectProvider');
  }
  return context;
};
