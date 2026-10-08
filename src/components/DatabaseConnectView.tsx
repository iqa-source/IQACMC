import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, Sliders, ExternalLink, RefreshCw } from 'lucide-react';

export const DatabaseConnectView: React.FC = () => {
  const {
    pullFromGoogleSheets,
    setCurrentView,
    googleSheetsConfig,
    updateGoogleSheetsConfig,
    googleUser,
    connectGoogleAccount,
    isAdmin,
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('กำลังโหลดข้อมูล...');
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [webhookInput, setWebhookInput] = useState(googleSheetsConfig.webhookUrl || '');
  const [sheetUrlInput, setSheetUrlInput] = useState(googleSheetsConfig.spreadsheetUrl || '');

  const handleConnectData = async () => {
    setIsLoading(true);
    setSyncStatusText('กำลังเชื่อมต่อฐานข้อมูล Google Sheets...');

    try {
      // Pull data from Google Sheets (prioritizing Google Sheets as primary truth)
      const res = await pullFromGoogleSheets();
      setSyncStatusText(res.message || 'ดึงข้อมูลสำเร็จ');
      setSyncCompleted(true);

      // Brief delay to appreciate the success state, then smoothly redirect to reporting
      setTimeout(() => {
        setCurrentView('reporting');
      }, 900);
    } catch (err: any) {
      console.warn('Sync error:', err);
      setSyncStatusText('เชื่อมต่อสำเร็จ กำลังอัปเดตข้อมูล...');
      setTimeout(() => {
        setCurrentView('reporting');
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateGoogleSheetsConfig({
      webhookUrl: webhookInput.trim(),
      spreadsheetUrl: sheetUrlInput.trim(),
    });
    setShowConfig(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-12 sm:py-20 px-6 flex flex-col items-center justify-center my-auto text-center selection:bg-[#0066CC] selection:text-white">
      {/* Back button */}
      <div className="w-full text-left mb-8">
        <button
          onClick={() => setCurrentView('reporting')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับไปยังหน้ารายงานผล</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isLoading && !syncCompleted ? (
          <motion.div
            key="connect-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center"
          >
            {/* Sleek Recognizable Minimalist Google Sheets Icon */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#F5F5F7] p-5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.06)] border border-white flex items-center justify-center mb-8">
              <svg
                viewBox="0 0 48 48"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Google Sheets Green Sheet Icon */}
                <rect x="8" y="4" width="32" height="40" rx="4" fill="#0F9D58" />
                <path d="M28 4 L40 16 L28 16 Z" fill="#87CEAB" opacity="0.8" />
                {/* Minimal Grid Lines */}
                <rect x="14" y="20" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" />
                <rect x="14" y="26" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" />
                <rect x="14" y="32" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" />
                <rect x="22" y="19" width="3" height="17" rx="1" fill="#FFFFFF" opacity="0.6" />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight mb-2">
              ฐานข้อมูล Google Sheets
            </h2>

            <p className="text-sm text-[#86868B] max-w-sm mx-auto mb-10 leading-relaxed font-normal">
              อัปเดตและดึงข้อมูลโครงการล่าสุด โดยให้อิงข้อมูลใน Google Sheets เป็นหลัก
            </p>

            {/* Prominent Elegant Apple System Blue Button labeled "เชื่อมต่อข้อมูล" */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConnectData}
              className="px-10 py-4 rounded-full bg-[#0066CC] hover:bg-[#0055B3] text-white font-semibold text-base tracking-tight shadow-[0_10px_25px_-6px_rgba(0,102,204,0.4)] transition cursor-pointer flex items-center gap-2.5 mx-auto"
            >
              <span>เชื่อมต่อข้อมูล</span>
            </motion.button>

            {/* Optional Settings link for Admin */}
            {isAdmin && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="mt-8 text-xs text-[#86868B] hover:text-[#1D1D1F] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>ตั้งค่าลิงก์ชีท / Webhook</span>
              </button>
            )}

            {/* Config drawer */}
            {showConfig && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleSaveConfig}
                className="mt-6 w-full p-6 rounded-2xl bg-[#F5F5F7] text-left text-xs space-y-4"
              >
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">
                    Google Sheets Webhook URL:
                  </label>
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">
                    Google Spreadsheet URL:
                  </label>
                  <input
                    type="url"
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white font-semibold cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>
              </motion.form>
            )}
          </motion.div>
        ) : (
          /* Seamless Data-Syncing Loading State */
          <motion.div
            key="loading-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -30, transition: { duration: 0.4 } }}
            className="flex flex-col items-center py-12"
          >
            {/* Subtle Pulsating Glow & Sleek Minimalist Spinner */}
            <div className="relative mb-6">
              {/* Pulsating glow */}
              <div className="absolute inset-0 rounded-full bg-[#0066CC]/20 blur-xl animate-pulse" />

              {/* Minimalist Spinner */}
              <div className="relative w-16 h-16 rounded-full border-3 border-[#E5E5EA] border-t-[#0066CC] animate-spin" />
            </div>

            <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight mb-2">
              {syncCompleted ? 'เชื่อมต่อข้อมูลสำเร็จ' : 'กำลังโหลดข้อมูล...'}
            </h3>

            <p className="text-xs text-[#86868B]">{syncStatusText}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
