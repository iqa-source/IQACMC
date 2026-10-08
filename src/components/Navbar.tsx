import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { EDUCATION_LEVEL_NAMES, EducationLevel } from '../types';
import { SchoolLogo } from './SchoolLogo';
import {
  FileCheck2,
  ChevronDown,
  Menu,
  Clock,
  Database,
  LayoutDashboard,
  TableProperties,
  UploadCloud,
  FileSpreadsheet,
  ShieldCheck,
  User,
  LogOut,
  X,
  Plus,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenBulkAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenGoogleSheetsModal: () => void;
  onOpenEditProfile: () => void;
  onOpenPublicCatalog?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenBulkAddModal,
  onOpenExportModal,
  onOpenGoogleSheetsModal,
  onOpenEditProfile,
  onOpenPublicCatalog,
}) => {
  const {
    currentLevel,
    setCurrentLevel,
    resetToGateway,
    currentView,
    setCurrentView,
  } = useProjectStore();

  const { currentUser, isAdmin, logout } = useAuth();
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);

  const levelMenuRef = useRef<HTMLDivElement>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (levelMenuRef.current && !levelMenuRef.current.contains(e.target as Node)) {
        setIsLevelMenuOpen(false);
      }
      if (mainMenuRef.current && !mainMenuRef.current.contains(e.target as Node)) {
        setIsMainMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[#E5E5EA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Brand Identity & Education Level Dropdown Button */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setCurrentView('reporting')}
              className="flex items-center gap-2.5 text-left group shrink-0 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <SchoolLogo size="xs" showBorder={false} />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-sm text-[#1D1D1F] tracking-tight leading-tight" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
                  PRO Tracking CMC
                </div>
                <div className="text-[11px] font-medium text-[#86868B]">
                  โรงเรียนเชียงใหม่คริสเตียน
                </div>
              </div>
            </button>

            {/* 1. ปุ่มระดับการศึกษา (Education Level Dropdown) */}
            {currentLevel && (
              <div className="relative" ref={levelMenuRef}>
                <button
                  onClick={() => setIsLevelMenuOpen(!isLevelMenuOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#EBEBEE] text-xs font-semibold text-[#1D1D1F] transition cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0066CC]" />
                  <span>{EDUCATION_LEVEL_NAMES[currentLevel]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#86868B] transition-transform ${isLevelMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isLevelMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E5E5EA] p-1.5 z-50 text-xs"
                    >
                      <button
                        onClick={() => {
                          setCurrentLevel('early_childhood');
                          setIsLevelMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl font-medium transition cursor-pointer flex items-center justify-between ${
                          currentLevel === 'early_childhood'
                            ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                            : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <span>ระดับการศึกษาปฐมวัย</span>
                        {currentLevel === 'early_childhood' && <span className="w-1.5 h-1.5 rounded-full bg-[#0066CC]" />}
                      </button>

                      <button
                        onClick={() => {
                          setCurrentLevel('basic_education');
                          setIsLevelMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl font-medium transition cursor-pointer flex items-center justify-between ${
                          currentLevel === 'basic_education'
                            ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                            : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <span>ระดับการศึกษาขั้นพื้นฐาน</span>
                        {currentLevel === 'basic_education' && <span className="w-1.5 h-1.5 rounded-full bg-[#0066CC]" />}
                      </button>

                      <div className="border-t border-[#E5E5EA] my-1" />

                      <button
                        onClick={() => {
                          setIsLevelMenuOpen(false);
                          resetToGateway();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                      >
                        กลับหน้าเลือกระดับการศึกษา
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right: ปุ่มรายงานผลเด่นมีสี + ปุ่ม Dropdown เมนูรวมทุกปุ่ม */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* 2. ปุ่มรายงานผล ให้เด่นมีสี (Prominent Apple System Blue) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('reporting')}
              className={`px-4 sm:px-5 py-2 rounded-full font-bold text-xs sm:text-sm tracking-tight transition cursor-pointer flex items-center gap-2 shadow-[0_4px_14px_-2px_rgba(0,102,204,0.35)] ${
                currentView === 'reporting'
                  ? 'bg-[#0066CC] text-white ring-2 ring-[#0066CC]/30'
                  : 'bg-[#0066CC] hover:bg-[#0055B3] text-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>รายงานผล</span>
            </motion.button>

            {/* 3. ปุ่ม Dropdown เมนู (นำทุกปุ่มไว้ตรงปุ่มเมนูนี้) */}
            <div className="relative" ref={mainMenuRef}>
              <button
                onClick={() => setIsMainMenuOpen(!isMainMenuOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer border ${
                  isMainMenuOpen
                    ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                    : 'bg-[#F5F5F7] hover:bg-[#EBEBEE] text-[#1D1D1F] border-transparent'
                }`}
                title="เมนูระบบ"
              >
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">เมนู</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMainMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Dropdown with All System Functions */}
              <AnimatePresence>
                {isMainMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-3xl shadow-[0_20px_45px_-10px_rgba(0,0,0,0.15)] border border-[#E5E5EA] p-3 z-50 text-xs"
                  >
                    {/* User Profile Bar inside dropdown */}
                    <div className="px-3 py-2.5 bg-[#F5F5F7] rounded-2xl mb-2 flex items-center justify-between">
                      <div className="truncate">
                        <div className="font-bold text-[#1D1D1F] text-xs truncate">
                          {currentUser?.name || 'ผู้ใช้งาน'}
                        </div>
                        <div className="text-[11px] text-[#86868B] truncate">
                          {isAdmin ? 'ผู้ดูแลระบบ (Admin)' : currentUser?.email}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsMainMenuOpen(false);
                          onOpenEditProfile();
                        }}
                        className="text-[11px] text-[#0066CC] font-semibold hover:underline shrink-0 ml-2"
                      >
                        แก้ไข
                      </button>
                    </div>

                    {/* Navigation Items Section */}
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setCurrentView('latest_updates');
                          setIsMainMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-2.5 ${
                          currentView === 'latest_updates'
                            ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                            : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-[#86868B]" />
                        <span>อัปเดตล่าสุด</span>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('database_connect');
                          setIsMainMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-2.5 ${
                          currentView === 'database_connect'
                            ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                            : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <Database className="w-4 h-4 text-[#86868B]" />
                        <span>ฐานข้อมูล Google Sheets</span>
                      </button>

                      {onOpenPublicCatalog && (
                        <button
                          onClick={() => {
                            setIsMainMenuOpen(false);
                            onOpenPublicCatalog();
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-2.5 text-[#1D1D1F] hover:bg-[#F5F5F7]"
                        >
                          <FileText className="w-4 h-4 text-[#86868B]" />
                          <span>รายละเอียดโครงการรายปี</span>
                        </button>
                      )}

                      {/* Admin Exclusives inside Menu */}
                      {isAdmin && (
                        <>
                          <div className="border-t border-[#E5E5EA] my-1.5" />
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                            ฟังก์ชันผู้ดูแลระบบ
                          </div>

                          <button
                            onClick={() => {
                              setIsMainMenuOpen(false);
                              onOpenAddModal();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium transition cursor-pointer flex items-center gap-2.5"
                          >
                            <Plus className="w-4 h-4 text-[#0066CC]" />
                            <span>เพิ่มโครงการใหม่</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsMainMenuOpen(false);
                              onOpenBulkAddModal();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium transition cursor-pointer flex items-center gap-2.5"
                          >
                            <UploadCloud className="w-4 h-4 text-[#0066CC]" />
                            <span>นำเข้าข้อมูลหลายรายการ (Smart Bulk)</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentView('dashboard');
                              setIsMainMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-2.5 ${
                              currentView === 'dashboard'
                                ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                                : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                            }`}
                          >
                            <LayoutDashboard className="w-4 h-4 text-[#86868B]" />
                            <span>ภาพรวมระบบ (Dashboard)</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentView('all_projects');
                              setIsMainMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-2.5 ${
                              currentView === 'all_projects'
                                ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                                : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                            }`}
                          >
                            <TableProperties className="w-4 h-4 text-[#86868B]" />
                            <span>ตารางโครงการทั้งหมด</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentView('admin_panel');
                              setIsMainMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl font-medium transition cursor-pointer flex items-center gap-2.5 ${
                              currentView === 'admin_panel'
                                ? 'bg-[#0066CC]/10 text-[#0066CC] font-bold'
                                : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4 text-[#86868B]" />
                            <span>แผงจัดการระบบ (Admin Panel)</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsMainMenuOpen(false);
                              onOpenExportModal();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium transition cursor-pointer flex items-center gap-2.5"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-[#86868B]" />
                            <span>ส่งออกไฟล์ออฟไลน์ (Excel / CSV)</span>
                          </button>
                        </>
                      )}

                      <div className="border-t border-[#E5E5EA] my-1.5" />

                      {/* Logout */}
                      <button
                        onClick={() => {
                          setIsMainMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold transition cursor-pointer flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
