import React, { useState } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../utils/googleSheetsSync';
import {
  FileSpreadsheet,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Code2,
  Sparkles,
  LogIn,
  LogOut,
  FolderSync,
  Layers,
  HelpCircle,
  Trash2,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ onClose }) => {
  const { isAdmin } = useAuth();
  const {
    projects,
    googleSheetsConfig,
    updateGoogleSheetsConfig,
    syncToGoogleSheetsNow,
    isSyncingSheets,
    isPullingSheets,
    pullFromGoogleSheets,
    googleUser,
    hasValidGoogleToken,
    connectGoogleAccount,
    disconnectGoogleAccount,
    reconnectGoogle,
    createGoogleSheetAuto,
  } = useProjectStore();

  const [sheetUrl, setSheetUrl] = useState(googleSheetsConfig.spreadsheetUrl || '');
  const [webhookUrl, setWebhookUrl] = useState(googleSheetsConfig.webhookUrl || '');
  const [autoSync, setAutoSync] = useState(googleSheetsConfig.autoSync ?? true);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCreatingAuto, setIsCreatingAuto] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [creationStep, setCreationStep] = useState<string>('');
  const [confirmCreateNewOpen, setConfirmCreateNewOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handlePromptCreateNewSheet = () => {
    if (googleSheetsConfig.spreadsheetUrl) {
      setConfirmCreateNewOpen(true);
    } else {
      handleAutoCreateSheet();
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setFeedback(null);
    try {
      const res = await reconnectGoogle();
      setFeedback({
        type: res.success ? 'success' : 'info',
        message: res.message,
      });
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.message || 'ไม่สามารถเข้าสู่ระบบ Google ได้',
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  // Auto create Google Sheet handler
  const handleAutoCreateSheet = async () => {
    setIsCreatingAuto(true);
    setCreationStep('กำลังเข้าถึงสิทธิ์ Google Sheets และสร้างไฟล์สเปรดชีต...');
    setFeedback(null);

    try {
      setCreationStep('กำลังสร้างแท็บชีท จัดรูปแบบหัวตารางสีชมพู และบันทึกข้อมูล...');
      const result = await createGoogleSheetAuto();

      if (result.success && result.spreadsheetUrl) {
        setSheetUrl(result.spreadsheetUrl);
        setFeedback({
          type: 'success',
          message: result.message,
        });
      } else {
        const isCancelled =
          result.message?.includes('ยกเลิก') || result.message?.includes('หน้าต่างถูกปิด');
        setFeedback({
          type: isCancelled ? 'info' : 'error',
          message:
            result.message || 'ไม่สามารถสร้างสเปรดชีตได้ กรุณาลองใหม่อีกครั้ง',
        });
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setFeedback({
          type: 'info',
          message: 'การเข้าสู่ระบบ Google ถูกยกเลิก ท่านสามารถกดเชื่อมต่อใหม่ได้ตลอดเวลา',
        });
      } else {
        setFeedback({
          type: 'error',
          message: err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google API',
        });
      }
    } finally {
      setIsCreatingAuto(false);
      setCreationStep('');
    }
  };

  // Manual sync with explicit user confirmation for mutating spreadsheet data
  const handleManualSync = async () => {
    // If direct Sheets API is in use and token is expired/missing, renew first
    if (googleSheetsConfig.spreadsheetId && !googleSheetsConfig.webhookUrl && !hasValidGoogleToken) {
      setFeedback({
        type: 'info',
        message: 'เซสชัน Google หมดอายุ กำลังเชื่อมต่อเข้าสู่ระบบ Google ใหม่อีกครั้ง...',
      });
      const reauth = await reconnectGoogle();
      if (!reauth.success) {
        setFeedback({
          type: 'error',
          message: reauth.message || 'การเข้าสู่ระบบ Google ถูกยกเลิก หรือหน้าต่างถูกปิด',
        });
        return;
      }
    }

    const isConfirmed = window.confirm(
      `คุณต้องการอัปเดตข้อมูลโครงการทั้งหมด (${projects.length} โครงการ) พร้อมประวัติ Audit Trail ลงใน Google Sheets ใช่หรือไม่? ข้อมูลในสเปรดชีตจะถูกปรับปรุงให้เป็นปัจจุบันที่สุด`
    );
    if (!isConfirmed) return;

    const res = await syncToGoogleSheetsNow();
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
  };

  const handlePullFromSheets = async () => {
    if (googleSheetsConfig.spreadsheetId && !googleSheetsConfig.webhookUrl && !hasValidGoogleToken) {
      setFeedback({
        type: 'info',
        message: 'เซสชัน Google หมดอายุ กำลังเชื่อมต่อเข้าสู่ระบบ Google ใหม่อีกครั้ง...',
      });
      const reauth = await reconnectGoogle();
      if (!reauth.success) {
        setFeedback({
          type: 'error',
          message: reauth.message || 'การเข้าสู่ระบบ Google ถูกยกเลิก หรือหน้าต่างถูกปิด',
        });
        return;
      }
    }

    setFeedback({
      type: 'info',
      message: 'กำลังดึงข้อมูลล่าสุดจาก Google Sheets...',
    });
    const res = await pullFromGoogleSheets();
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
  };

  const handleSaveManualUrls = async () => {
    const cleanWebhook = webhookUrl.trim();
    updateGoogleSheetsConfig({
      spreadsheetUrl: sheetUrl.trim(),
      webhookUrl: cleanWebhook,
      autoSync,
    });

    if (cleanWebhook) {
      setFeedback({
        type: 'info',
        message: 'กำลังทดสอบเชื่อมต่อและส่งข้อมูลโครงการไปยัง Webhook...',
      });
      const res = await syncToGoogleSheetsNow();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.success
          ? 'บันทึก Webhook URL และทดสอบส่งข้อมูลไปยัง Google Sheets สำเร็จเรียบร้อย! ระบบ Multi-User Real-Time พร้อมใช้งานแล้ว'
          : `บันทึก Webhook URL แล้ว แต่ทดสอบเชื่อมต่อไม่สำเร็จ: ${res.message}`,
      });
    } else {
      setFeedback({
        type: 'success',
        message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
      });
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-saas border border-slate-200/90 space-y-6 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          id="btn-close-google-sheets-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold mb-1 border border-indigo-200">
              <ShieldCheck className="w-3 h-3" />
              <span>ฐานข้อมูลออนไลน์ (Google Sheets Online Database)</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              ระบบฐานข้อมูล Google Sheets อัตโนมัติ
            </h3>
            <p className="text-xs text-slate-500">
              ระบบจะสร้างไฟล์ Google Spreadsheet พร้อมกำหนดโครงสร้างชีทและบันทึกข้อมูลให้แบบอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Alert Feedback */}
        {feedback && (
          <div
            className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-medium leading-relaxed ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedback.type === 'info'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : feedback.type === 'info' ? (
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <div className="flex-1">{feedback.message}</div>
          </div>
        )}

        {/* SECTION 1: Automated Google Sheet Creation (PRIMARY FEATURE) */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-indigo-200/80 shadow-saas space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>สร้างและเชื่อมต่อ Google Sheets แบบอัตโนมัติ (One-Click Auto Setup)</span>
            </div>
            {googleUser ? (
              hasValidGoogleToken ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[160px]">{googleUser.email}</span>
                  <button
                    onClick={disconnectGoogleAccount}
                    className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="ออกจากบัญชี Google"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    เซสชันหมดอายุ
                  </span>
                  <button
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>{isReconnecting ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบใหม่'}</span>
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs font-semibold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isReconnecting ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย Google'}</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            เมื่อคลิกปุ่มด้านล่าง เว็บจะดำเนินการขอสิทธิ์และสร้างไฟล์ Google Spreadsheet ลงในบัญชี Google ของท่านโดยตรง พร้อมสร้างแท็บ <strong>'โครงการทั้งหมด'</strong>, <strong>'ประวัติการรายงานผล (Audit Log)'</strong> และ <strong>'สรุปภาพรวมโครงการ'</strong> จัดรูปแบบหัวตาราง และบันทึกข้อมูลทุกโครงการลงในชีทให้ทันที
          </p>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>ต้องเชื่อมต่อด้วยอีเมลโรงเรียน <strong className="text-indigo-700 font-bold">@cmc.ac.th</strong> เท่านั้น (ห้ามใช้อีเมลส่วนตัว)</span>
          </div>

          {/* Creation Progress indicator */}
          {isCreatingAuto && (
            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{creationStep || 'กำลังดำเนินการสร้าง Google Sheets...'}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 w-3/4 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Action Button: Auto Create */}
          {!googleSheetsConfig.spreadsheetUrl ? (
            <button
              onClick={handleAutoCreateSheet}
              disabled={isCreatingAuto || isSyncingSheets}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-saas flex items-center justify-center gap-2.5 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              id="btn-auto-create-sheet"
            >
              {isCreatingAuto ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างสเปรดชีตและบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>สร้าง Google Sheets และบันทึกข้อมูลลงชีททันที</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Already Connected Banner */}
              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>เชื่อมต่อกับ Google Spreadsheet แล้ว</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-md">
                    {googleSheetsConfig.spreadsheetUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={googleSheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดสเปรดชีต</span>
                  </a>
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncingSheets || isCreatingAuto || isPullingSheets}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    title="ส่งข้อมูลโครงการทั้งหมดไปบันทึกที่ Google Sheets ทันที"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>ส่งไปชีทเดี๋ยวนี้</span>
                  </button>
                  <button
                    onClick={handlePullFromSheets}
                    disabled={isSyncingSheets || isCreatingAuto || isPullingSheets}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    title="ดึงข้อมูลล่าสุดจาก Google Sheets มาอัปเดตในระบบ"
                  >
                    <FolderSync className={`w-3.5 h-3.5 ${isPullingSheets ? 'animate-spin' : ''}`} />
                    <span>ดึงข้อมูลจากชีท</span>
                  </button>
                </div>
              </div>

              {!hasValidGoogleToken && !googleSheetsConfig.webhookUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>เซสชันการเชื่อมต่อกับ Google สิ้นสุดอายุ กรุณาต่ออายุเพื่อเปิดใช้การซิงก์ตรงอัตโนมัติ</span>
                  </div>
                  <button
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition shadow-2xs shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isReconnecting ? 'กำลังเชื่อมต่อ...' : 'ต่ออายุเซสชัน Google ทันที'}</span>
                  </button>
                </div>
              )}

              {/* Feature: Create fresh spreadsheet, migrate logging, delete old sheet */}
              <div className="pt-3 border-t border-slate-100 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>สร้างสเปรดชีตชุดใหม่ (ย้ายการลงข้อมูลและลบสเปรดชีตเดิม)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ระบบจะสร้าง Google Sheet ใหม่ ย้ายการลงข้อมูลโครงการทั้งหมด ({projects.length} โครงการ) ไปลงที่อันใหม่ และลบสเปรดชีตชุดเก่าออกจาก Google Drive
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePromptCreateNewSheet}
                  disabled={isCreatingAuto || isSyncingSheets}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-recreate-sheet-migrate"
                >
                  {isCreatingAuto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังดำเนินการ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>สร้างสเปรดชีตชุดใหม่</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Real-time Auto-Sync Configuration */}
        <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <FolderSync className="w-4 h-4 text-slate-600" />
              <span>การซิงก์ข้อมูลอัตโนมัติ (Real-time Auto-Sync)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => {
                  setAutoSync(e.target.checked);
                  updateGoogleSheetsConfig({ autoSync: e.target.checked });
                }}
                className="sr-only peer"
                id="toggle-realtime-autosync"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <p className="text-slate-500">
            เมื่อเปิดใช้งาน ระบบจะบันทึกและอัปเดตข้อมูลไปยัง Google Sheets โดยอัตโนมัติทุกครั้งที่มีการบันทึกรายงานผลความก้าวหน้า เพิ่ม หรือแก้ไขโครงการ
          </p>
          {googleSheetsConfig.lastSyncedAt && (
            <div className="text-[11px] text-slate-400">
              ซิงก์สำเร็จล่าสุดเมื่อ:{' '}
              <span className="font-semibold text-slate-600">
                {new Date(googleSheetsConfig.lastSyncedAt).toLocaleString('th-TH')}
              </span>
            </div>
          )}
        </div>

        {/* SECTION 3: Real-time Multi-User Sync with Apps Script Webhook */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCodeSnippet(!showCodeSnippet)}
              className="text-xs font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>วิธีตั้งค่าเพื่อให้ผู้อื่น/ครูทุกคนบันทึกข้อมูลเข้า Google Sheets แบบ Real-time</span>
              <span className="text-[10px] text-slate-400">({showCodeSnippet ? 'ซ่อน' : 'แสดงคำแนะนำ'})</span>
            </button>
          </div>

          {showCodeSnippet && (
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 text-xs">
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-slate-700 leading-relaxed space-y-1.5">
                <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ขั้นตอนง่ายๆ 4 สเต็ป เพื่อให้ครูทุกคนกรอกข้อมูลแล้วส่งเข้า Google Sheet ทันที:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-600">
                  <li>เปิดไฟล์ Google Sheet ของโรงเรียน แล้วไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
                  <li>ลบโค้ดเดิมออกทั้งหมด แล้วกดปุ่ม <strong>"คัดลอกโค้ด Apps Script"</strong> ด้านล่างไปวางแทนที่</li>
                  <li>กด <strong>การจัดสรรใช้งาน (Deploy) &gt; การจัดสรรใช้งานใหม่ (New deployment)</strong>
                    <ul className="list-disc pl-4 mt-0.5 text-slate-500">
                      <li>เลือกประเภท: <strong>เว็บแอป (Web app)</strong></li>
                      <li>ดำเนินการในฐานะ (Execute as): <strong>ฉัน (Me)</strong></li>
                      <li>ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong className="text-rose-600">ทุกคน (Anyone)</strong> *(สำคัญที่สุดเพื่อให้ครูทุกคนส่งข้อมูลได้โดยไม่ต้องขอสิทธิ์)*</li>
                    </ul>
                  </li>
                  <li>กด <strong>Deploy</strong> แล้วคัดลอก Web app URL ที่ลงท้ายด้วย <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-indigo-600 font-mono">/exec</code> มาวางในช่องด้านล่าง แล้วกด <strong>"บันทึกและเชื่อมต่อ Webhook"</strong></li>
                </ol>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Webhook URL จาก Google Apps Script (ลงท้ายด้วย /exec)
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleSaveManualUrls}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-[0.98] cursor-pointer"
                >
                  บันทึกและเชื่อมต่อ Webhook
                </button>
                <button
                  onClick={handleCopyScript}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{copiedCode ? '✓ คัดลอกโค้ดสคริปต์แล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* Confirmation Modal: Create New Spreadsheet & Delete Old */}
        {confirmCreateNewOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-saas-lg border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">ยืนยันการสร้างสเปรดชีตชุดใหม่</h4>
                  <p className="text-xs text-slate-500">ระบบจะย้ายข้อมูลและลบสเปรดชีตเดิม</p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-semibold">การดำเนินการนี้จะทำสิ่งต่อไปนี้โดยอัตโนมัติ:</p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-700">
                  <li>
                    สร้าง Google Spreadsheet ไฟล์ใหม่ใน Google Drive
                  </li>
                  <li>
                    ย้ายข้อมูลโครงการทั้งหมด ({projects.length} โครงการ) ไปลงที่สเปรดชีตใหม่
                  </li>
                  <li>
                    สลับเป้าหมายการลงข้อมูลและการซิงก์ของระบบทั้งหมดไปยังชีทใหม่ทันที
                  </li>
                  <li className="text-rose-700 font-semibold flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5 inline shrink-0" />
                    <span>ลบสเปรดชีตชุดเก่าออกจาก Google Drive ทันที</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCreateNewOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCreateNewOpen(false);
                    handleAutoCreateSheet();
                  }}
                  disabled={isCreatingAuto}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  id="btn-confirm-create-new-and-delete-old"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ยืนยันสร้างใหม่และลบชีทเดิม</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
