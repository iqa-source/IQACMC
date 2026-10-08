import React, { useState } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from './SchoolLogo';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Database,
  CloudCheck,
  UserCheck,
  Sparkles,
  AlertTriangle,
  Mail,
  XCircle,
} from 'lucide-react';

interface MandatoryGoogleSheetsModalProps {
  onClose: () => void;
}

export const MandatoryGoogleSheetsModal: React.FC<MandatoryGoogleSheetsModalProps> = ({
  onClose,
}) => {
  const {
    projects,
    googleSheetsConfig,
    pullFromGoogleSheets,
    refreshSharedProjects,
    reconnectGoogle,
    isGoogleSessionExpired,
  } = useProjectStore();

  const { currentUser, isAdmin } = useAuth();

  type UpdateStep = 'idle' | 'renewing_session' | 'updating_data' | 'entering';
  const [currentStep, setCurrentStep] = useState<UpdateStep>('idle');
  const [isUpdatingAndEntering, setIsUpdatingAndEntering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasSpreadsheet = !!googleSheetsConfig.spreadsheetUrl;
  const sessionExpired = isGoogleSessionExpired();

  const handleUpdateAndEnterSystem = async () => {
    setIsUpdatingAndEntering(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // ขั้นตอนที่ 1: หากอายุเซสชัน Google หมดอายุ ให้ต่ออายุเซสชัน Google ก่อน
      if (isGoogleSessionExpired()) {
        setCurrentStep('renewing_session');
        setSuccessMsg('เซสชัน Google หมดอายุ กำลังต่ออายุเซสชัน Google ก่อนดำเนินการ...');

        const renewResult = await reconnectGoogle();
        if (!renewResult.success) {
          setErrorMsg(
            renewResult.message ||
              'การต่ออายุเซสชัน Google ไม่สำเร็จ หรือหน้าต่างถูกปิด (สามารถกดลองใหม่อีกครั้ง หรือข้ามขั้นตอนด้านล่าง)'
          );
          setIsUpdatingAndEntering(false);
          setCurrentStep('idle');
          return;
        }

        setSuccessMsg('ต่ออายุเซสชัน Google สำเร็จเรียบร้อย! กำลังเริ่มอัปเดตข้อมูลโครงการล่าสุด...');
      }

      // ขั้นตอนที่ 2: อัปเดตข้อมูลโครงการล่าสุดจาก Google Sheets และฐานข้อมูลกลาง
      setCurrentStep('updating_data');
      setSuccessMsg('กำลังอัปเดตข้อมูลโครงการล่าสุดจาก Google Sheets และฐานข้อมูลกลาง...');
      await refreshSharedProjects();
      const pullRes = await pullFromGoogleSheets();

      const count = pullRes.count !== undefined ? pullRes.count : projects.length;

      // ขั้นตอนที่ 3: เข้าระบบตามลำดับ
      setCurrentStep('entering');
      setSuccessMsg(
        `อัปเดตข้อมูลโครงการล่าสุดเรียบร้อย (${count} โครงการ) กำลังนำท่านเข้าสู่ระบบ...`
      );

      // Brief delay for visual confirmation before entering system
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.warn('Update on entry notice:', err);
      // Fallback graceful entry with cached data
      setCurrentStep('entering');
      setSuccessMsg('กำลังนำท่านเข้าสู่ระบบติดตามโครงการ...');
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setIsUpdatingAndEntering(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      id="modal-mandatory-google-sheets"
    >
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#F9DFDF] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative Top Accent Bar */}
        <div className="h-2.5 bg-gradient-to-r from-[#F5AFAF] via-[#F9DFDF] to-emerald-400 w-full" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 bg-gradient-to-b from-[#FBEFEF] via-[#FCF8F8] to-white border-b border-[#F9DFDF] text-center relative">
          {/* Visual Badges */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <SchoolLogo size="md" className="shadow-md" />
            <div className="text-slate-300 font-light text-xl">+</div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-2 bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <CloudCheck className="w-4 h-4 text-emerald-600" />
            <span>ระบบเชื่อมต่อฐานข้อมูลอัตโนมัติ (Auto-Connect)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[#2D2424] leading-tight">
            อัปเดตข้อมูลโครงการล่าสุดก่อนเข้าใช้งาน
          </h2>
          <p className="text-sm sm:text-base text-[#573D3D] mt-1 max-w-md mx-auto">
            ระบบฐานข้อมูลกลาง CMC Project Tracking เชื่อมต่อ Google Sheets อัตโนมัติ
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Warning Banner: School Email Required for Connection */}
          <div className="rounded-2xl bg-[#FCF8F8] border-2 border-amber-300 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#2D2424] text-base sm:text-lg tracking-tight leading-tight">
                  ต้องใช้อีเมลโรงเรียน <span className="text-[#b84a62] font-black">@cmc.ac.th</span> เท่านั้น
                </h3>
              </div>
            </div>

            {/* Quick Visual Comparison Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ใช้ได้: <strong>...@cmc.ac.th</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold shadow-2xs">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>ห้ามใช้: <strong>อีเมลส่วนตัว (@gmail.com)</strong></span>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-600 leading-normal">
              เพื่อให้ระบบมีสิทธิ์เข้าถึงและอัปเดตฐานข้อมูลโครงการของโรงเรียนได้อย่างถูกต้อง
            </p>
          </div>

          {/* Status Card: Auto-Connected Central Database */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 border border-emerald-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>สถานะฐานข้อมูลกลาง (Google Sheets Database)</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                เชื่อมต่ออัตโนมัติสำเร็จ
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบเชื่อมต่อกับฐานข้อมูล Google Sheets กลางของโรงเรียนเชียงใหม่คริสเตียนเรียบร้อยแล้ว
              เมื่อทุกคนกรอกข้อมูลโครงการ รายงานผล หรือแนบหลักฐาน ข้อมูลจะถูกบันทึกและส่งเข้าสู่ฐานข้อมูลกลางโดยตรงโดยอัตโนมัติ
            </p>

            <div className="pt-2 border-t border-emerald-100/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">ผู้เข้าใช้งาน:</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {currentUser?.name || currentUser?.email || 'ผู้ใช้งานระบบ CMC'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">โครงการในระบบ:</span>
                  <span className="font-bold text-slate-800 block">
                    {projects.length} โครงการ
                  </span>
                </div>
              </div>
            </div>

            {/* View Spreadsheet link if configured (Admin only) */}
            {isAdmin && hasSpreadsheet && (
              <div className="pt-1 text-xs flex items-center justify-between text-slate-500">
                <span>ลิงก์สเปรดชีตกลาง:</span>
                <a
                  href={googleSheetsConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline truncate max-w-[240px]"
                >
                  <span className="truncate">เปิดดู Google Sheets กลาง</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Notice if Google session is expired */}
          {sessionExpired && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block mb-0.5">เซสชัน Google หมดอายุ:</strong>
                <span>
                  ระบบจะเปิดหน้าต่างเพื่อต่ออายุเซสชัน Google (กรุณาเลือกบัญชีอีเมลโรงเรียน @cmc.ac.th เท่านั้น) เพื่อดึงข้อมูลโครงการล่าสุด
                </span>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mandatory Action Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleUpdateAndEnterSystem}
              disabled={isUpdatingAndEntering}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#F5AFAF] hover:bg-[#e89d9d] text-[#2D2424] font-bold text-base shadow-sm border border-[#F9DFDF] flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-75"
              id="btn-modal-update-and-enter-system"
            >
              {isUpdatingAndEntering ? (
                <>
                  <RefreshCw className="w-5 h-5 text-white animate-spin shrink-0" />
                  <span>
                    {currentStep === 'renewing_session'
                      ? 'ขั้นตอนที่ 1/3: กำลังต่ออายุเซสชัน Google...'
                      : currentStep === 'updating_data'
                      ? 'ขั้นตอนที่ 2/3: กำลังอัปเดตข้อมูลโครงการล่าสุด...'
                      : 'ขั้นตอนที่ 3/3: กำลังเข้าสู่ระบบ...'}
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 shrink-0" />
                  <span>
                    {sessionExpired
                      ? 'ต่ออายุเซสชัน Google และเข้าสู่ระบบ'
                      : 'อัปเดตข้อมูลล่าสุดและเข้าสู่ระบบใช้งาน'}
                  </span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </>
              )}
            </button>

            {/* Offline Bypass (for rare offline situations) */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline transition"
                id="btn-modal-bypass-offline"
              >
                ข้ามขั้นตอนและเข้าสู่ระบบ (ใช้งานข้อมูลแคชในเครื่อง)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
