import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import {
  ProjectItem,
  EducationLevel,
  isProjectReported,
  EDUCATION_LEVEL_NAMES,
  MINISTRY_POLICIES,
  NATIONAL_EDUCATION_OUTCOMES,
  BASIC_COMPETENCIES,
  CORE_COMPETENCIES,
  CHILD_DEVELOPMENTS,
  EARLY_CHILDHOOD_STANDARDS,
  BASIC_EDUCATION_STANDARDS,
} from '../types';
import { parseFlexiblePercentage, formatAutoDecimalPercentage } from '../utils/percentageHelper';
import { Alert } from './Alert';
import { SpinnerOverlay } from './Spinner';
import {
  Search,
  X,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  Plus,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface ReportingViewProps {
  onViewDetails?: (project: ProjectItem) => void;
  onEditFullProject?: (project: ProjectItem) => void;
  onOpenAddModal?: () => void;
}

export const ReportingView: React.FC<ReportingViewProps> = ({
  onViewDetails,
  onEditFullProject,
  onOpenAddModal,
}) => {
  const { currentUser, isAdmin: isUserAdmin } = useAuth();
  const {
    filteredProjects,
    selectedYear,
    setSelectedYear,
    availableYears,
    currentLevel,
    setCurrentLevel,
    updateProject,
    deleteMultipleProjects,
    deleteAllProjects,
    pullFromGoogleSheets,
    isPullingSheets,
  } = useProjectStore();

  const isAdmin = !!(isUserAdmin || currentUser?.role === 'admin');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selection mode for batch deleting
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  // Batch delete confirmation modal (replaces window.confirm)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Delete all confirmation modal
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback notification alert
  const [actionAlert, setActionAlert] = useState<{
    variant: 'default' | 'success' | 'warning' | 'error' | 'info';
    title?: string;
    message: string;
  } | null>(null);

  // Active reporting modal state
  const [activeProjectForReport, setActiveProjectForReport] = useState<ProjectItem | null>(null);
  const [resultQty, setResultQty] = useState<string>('0');
  const [resultDesc, setResultDesc] = useState<string>('');

  // Subdued Secondary fields
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [selectedBasicComp, setSelectedBasicComp] = useState<string[]>([]);
  const [selectedCoreComp, setSelectedCoreComp] = useState<string[]>([]);
  const [selectedChildDev, setSelectedChildDev] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Filter projects for selected academic year
  const yearProjects = useMemo(() => {
    return filteredProjects.filter((p) => p.academicYear === selectedYear);
  }, [filteredProjects, selectedYear]);

  // Check if project belongs to logged in user
  const isMyProject = (p: ProjectItem): boolean => {
    if (!currentUser) return false;
    const uName = (currentUser.name || '').trim().toLowerCase();
    const uEmail = (currentUser.email || '').trim().toLowerCase();
    const resp = (p.responsiblePerson || '').trim().toLowerCase();

    if (!resp || resp === '-' || resp === 'ผู้รับผิดชอบโครงการ') return false;
    if (uName && resp.includes(uName)) return true;
    if (uEmail && resp.includes(uEmail)) return true;
    const prefix = uEmail.split('@')[0];
    if (prefix && prefix.length > 2 && resp.includes(prefix)) return true;
    return false;
  };

  // SMART SORTING:
  // When logged-in user matches project's responsible person, those projects automatically float to the very top!
  const sortedAndFilteredProjects = useMemo(() => {
    let list = yearProjects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.responsiblePerson.toLowerCase().includes(q) ||
          p.strategy.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const aMine = isMyProject(a);
      const bMine = isMyProject(b);
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return 0;
    });
  }, [yearProjects, searchQuery, currentUser]);

  // Open reporting modal
  const handleOpenReportModal = (project: ProjectItem) => {
    if (isSelectMode) {
      toggleSelectProject(project.id);
      return;
    }

    setActiveProjectForReport(project);
    const existingQty = project.resultQuantityPercent !== undefined && project.resultQuantityPercent !== null
      ? String(project.resultQuantityPercent)
      : '0';
    setResultQty(existingQty);
    setResultDesc(project.resultQualityDesc || '');

    setSelectedPolicies(project.ministryPolicies || []);
    setSelectedOutcomes(project.nationalOutcomes || []);
    setSelectedBasicComp(project.basicCompetencies || []);
    setSelectedCoreComp(project.coreCompetencies || []);
    setSelectedChildDev(project.childDevelopment || []);

    setSaveSuccessNotice(null);
  };

  // Auto-decimal format handler on blur
  const handleQtyBlur = () => {
    if (resultQty.trim()) {
      setResultQty(formatAutoDecimalPercentage(resultQty));
    }
  };

  // Save report
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectForReport) return;

    setIsSaving(true);
    try {
      const formattedQty = resultQty.trim() ? formatAutoDecimalPercentage(resultQty) : '0';
      const numericVal = parseFlexiblePercentage(formattedQty, 0);

      // Auto update status if reached 100%
      let updatedStatus = activeProjectForReport.status;
      if (numericVal >= 100 && activeProjectForReport.status === '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)') {
        updatedStatus = '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว';
      }

      await updateProject(
        activeProjectForReport.id,
        {
          resultQuantityPercent: formattedQty,
          resultQualityDesc: resultDesc.trim(),
          ministryPolicies: selectedPolicies,
          nationalOutcomes: selectedOutcomes,
          basicCompetencies: selectedBasicComp,
          coreCompetencies: selectedCoreComp,
          childDevelopment: selectedChildDev,
          status: updatedStatus,
        },
        `รายงานผลสัมฤทธิ์: ปริมาณ ${formattedQty}%`
      );

      setSaveSuccessNotice('บันทึกการรายงานผลสำเร็จ');
      setActionAlert({
        variant: 'success',
        title: 'บันทึกการรายงานผลสำเร็จ',
        message: `บันทึกข้อมูลโครงการ "${activeProjectForReport.name}" เรียบร้อยแล้ว`,
      });
      setTimeout(() => {
        setActiveProjectForReport(null);
        setSaveSuccessNotice(null);
      }, 600);
    } catch (err: any) {
      console.error(err);
      setActionAlert({
        variant: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึก',
        message: err?.message || 'ไม่สามารถบันทึกรายงานผลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle selection for bulk deletion
  const toggleSelectProject = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProjectIds.size === sortedAndFilteredProjects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(sortedAndFilteredProjects.map((p) => p.id)));
    }
  };

  // Open in-app confirmation modal (no window.confirm, works 100% in iFrame)
  const handleOpenBatchDeleteConfirm = () => {
    if (selectedProjectIds.size === 0) return;
    setIsBatchDeleteModalOpen(true);
  };

  // Execute batch delete with spinner overlay and alert
  const handleConfirmBatchDelete = async () => {
    if (selectedProjectIds.size === 0) return;
    const count = selectedProjectIds.size;

    setIsDeleting(true);
    try {
      await deleteMultipleProjects(Array.from(selectedProjectIds));
      setSelectedProjectIds(new Set());
      setIsSelectMode(false);
      setIsBatchDeleteModalOpen(false);

      setActionAlert({
        variant: 'success',
        title: 'ลบโครงการสำเร็จ',
        message: `ลบโครงการที่เลือกจำนวน ${count} โครงการออกจากระบบและ Google Sheets เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      console.error(err);
      setActionAlert({
        variant: 'error',
        title: 'เกิดข้อผิดพลาดในการลบ',
        message: err?.message || 'ไม่สามารถลบโครงการที่เลือกได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteDeleteAllYear = async () => {
    setIsDeleting(true);
    try {
      await deleteAllProjects(selectedYear, currentLevel || undefined);
      setIsDeleteAllModalOpen(false);
      setActionAlert({
        variant: 'success',
        title: 'ลบโครงการทั้งหมดสำเร็จ',
        message: `ลบโครงการทั้งหมดในปีการศึกษา ${selectedYear} เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      console.error(err);
      setActionAlert({
        variant: 'error',
        title: 'เกิดข้อผิดพลาดในการลบโครงการทั้งหมด',
        message: err?.message || 'ไม่สามารถลบโครงการทั้งหมดได้',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 selection:bg-[#0066CC] selection:text-white">
      {/* Feedback Notification Alert */}
      <AnimatePresence>
        {actionAlert && (
          <div className="mb-6">
            <Alert
              variant={actionAlert.variant}
              title={actionAlert.title}
              onClose={() => setActionAlert(null)}
            >
              {actionAlert.message}
            </Alert>
          </div>
        )}
      </AnimatePresence>

      {/* Top Filter & Controls: Academic Year as a DROPDOWN LIST, Search, Sync, and Admin Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        {/* Left: Dropdown list for Academic Year */}
        <div className="flex items-center gap-3">
          <div className="relative inline-flex items-center">
            <span className="text-xs font-semibold text-[#86868B] mr-2">ปีการศึกษา:</span>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEE] font-bold text-xs sm:text-sm text-[#1D1D1F] border border-transparent focus:border-[#0066CC] focus:outline-hidden transition cursor-pointer"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    ปีการศึกษา {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#86868B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right: Search + Action Buttons (Google Sync & Admin Batch Deletes) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-none sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาโครงการ..."
              className="w-full px-3.5 py-2 pl-9 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEE] focus:bg-white text-xs font-medium text-[#1D1D1F] placeholder-[#86868B] border border-transparent focus:border-[#0066CC] focus:outline-hidden transition"
            />
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={() => pullFromGoogleSheets()}
            disabled={isPullingSheets}
            className="px-3.5 py-2 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEE] text-xs font-semibold text-[#1D1D1F] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="ดึงข้อมูลล่าสุดจาก Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0066CC] ${isPullingSheets ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">ซิงก์ข้อมูล</span>
          </button>

          {/* Admin Tools: Multi-select & Delete All */}
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedProjectIds(new Set());
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelectMode
                    ? 'bg-[#1D1D1F] text-white'
                    : 'bg-[#F5F5F7] hover:bg-[#EBEBEE] text-[#1D1D1F]'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{isSelectMode ? 'ยกเลิกการเลือก' : 'เลือกหลายโครงการ'}</span>
              </button>

              <button
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                title="ลบโครงการทั้งหมดในปีนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ลบโครงการทั้งหมด</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Multi-select Action Bar */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-3xl bg-[#F5F5F7] flex flex-wrap items-center justify-between gap-4 text-xs font-medium"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F] font-semibold cursor-pointer"
              >
                {selectedProjectIds.size === sortedAndFilteredProjects.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#0066CC]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#86868B]" />
                )}
                <span>
                  {selectedProjectIds.size === sortedAndFilteredProjects.length
                    ? 'ยกเลิกเลือกทั้งหมด'
                    : 'เลือกทั้งหมด'}
                </span>
              </button>
              <span className="text-[#86868B]">
                เลือกแล้ว <strong className="text-[#1D1D1F]">{selectedProjectIds.size}</strong> โครงการ
              </span>
            </div>

            {selectedProjectIds.size > 0 && (
              <button
                type="button"
                onClick={handleOpenBatchDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบที่เลือก ({selectedProjectIds.size} โครงการ)</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Grid: Clean Ongoing Projects Ready for Reporting */}
      {sortedAndFilteredProjects.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-[#F5F5F7]">
          <p className="text-sm font-medium text-[#86868B]">ไม่พบรายการโครงการในปีการศึกษา {selectedYear}</p>
          {isAdmin && onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 px-5 py-2.5 rounded-full bg-[#0066CC] text-white text-xs font-semibold cursor-pointer"
            >
              เพิ่มโครงการใหม่
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {sortedAndFilteredProjects.map((project, idx) => {
            const isMine = isMyProject(project);
            const isReported = isProjectReported(project);
            const isSelected = selectedProjectIds.has(project.id);

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(0.2, idx * 0.02), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => handleOpenReportModal(project)}
                className={`relative rounded-3xl p-6 sm:p-7 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[175px] ${
                  isSelected
                    ? 'ring-2 ring-[#0066CC] bg-[#EBF5FF]'
                    : isMine
                    ? 'bg-[#F5F5F7] border border-[#0066CC]/25 shadow-[0_8px_25px_-5px_rgba(0,102,204,0.08)]'
                    : 'bg-[#F5F5F7] hover:bg-[#EBEBEE] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.06)]'
                }`}
              >
                {/* Selection Checkbox */}
                {isSelectMode && (
                  <div
                    className="absolute top-5 right-5 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectProject(project.id);
                    }}
                  >
                    <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E5EA] flex items-center justify-center cursor-pointer shadow-xs">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#0066CC]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#86868B]" />
                      )}
                    </div>
                  </div>
                )}

                {/* Top: Prioritized Tag or Level */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {isMine ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0066CC]/10 text-[#0066CC] font-bold text-[11px] tracking-tight">
                      <Sparkles className="w-3 h-3" />
                      <span>โครงการที่คุณรับผิดชอบ</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#86868B]">
                      {EDUCATION_LEVEL_NAMES[project.level] || project.level}
                    </span>
                  )}

                  {/* Status indicator */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      isReported
                        ? 'bg-[#34C759]/10 text-[#34C759]'
                        : 'bg-[#86868B]/10 text-[#86868B]'
                    }`}
                  >
                    {isReported ? `${project.resultQuantityPercent}% รายงานแล้ว` : 'รอรายงานผล'}
                  </span>
                </div>

                {/* Center: Bold Project Title */}
                <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] leading-snug tracking-tight mb-4 line-clamp-3">
                  {project.name}
                </h3>

                {/* Bottom: Responsible Person */}
                <div className="flex items-center justify-between pt-3 border-t border-black/[0.04] text-xs">
                  <span className="text-[#86868B] truncate max-w-[200px]">
                    {project.responsiblePerson || 'ไม่ระบุผู้รับผิดชอบ'}
                  </span>
                  <span className="text-[11px] font-semibold text-[#0066CC]">
                    รายงานผล &rarr;
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Sleek Popup Modal Dedicated to Data Entry */}
      <AnimatePresence>
        {activeProjectForReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProjectForReport(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-slate-100 z-10 my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Spinner Overlay when saving report with faint backdrop */}
              <SpinnerOverlay
                isLoading={isSaving}
                type="dotted-round"
                size="xxl"
                message="กำลังบันทึกผลการดำเนินโครงการ..."
                subMessage="ระบบกำลังอัปเดตข้อมูลและบันทึกสู่ Google Sheets"
              />

              {/* Close Button */}
              <button
                onClick={() => setActiveProjectForReport(null)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#F5F5F7] hover:bg-[#EBEBEE] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Minimalist Header */}
              <div className="mb-6 pr-8">
                <span className="text-xs font-semibold text-[#0066CC] uppercase tracking-wider block mb-1">
                  รายงานผลการดำเนินโครงการ
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F] tracking-tight leading-snug">
                  {activeProjectForReport.name}
                </h3>
                <p className="text-xs text-[#86868B] mt-1">
                  ผู้รับผิดชอบ: {activeProjectForReport.responsiblePerson} &bull; ปี {activeProjectForReport.academicYear}
                </p>
              </div>

              {/* Form Body: Visual Hierarchy */}
              <form onSubmit={handleSaveReport} className="space-y-5">
                {saveSuccessNotice && (
                  <Alert
                    variant="success"
                    title="บันทึกข้อมูลเรียบร้อยแล้ว"
                  >
                    {saveSuccessNotice}
                  </Alert>
                )}

                {/* 1. Absolute Top & Most Prominent: ผลสำเร็จ ปริมาณ (ร้อยละ) * */}
                <div className="p-6 rounded-3xl bg-[#F5F5F7] border border-[#E5E5EA]/60">
                  <label className="block text-xs font-bold text-[#1D1D1F] uppercase tracking-wider mb-2">
                    ผลสำเร็จ ปริมาณ (ร้อยละ) *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={resultQty}
                      onChange={(e) => setResultQty(e.target.value)}
                      onBlur={handleQtyBlur}
                      placeholder="0.00"
                      className="w-full text-4xl sm:text-5xl font-black text-[#1D1D1F] tracking-tight bg-transparent border-none focus:outline-hidden pr-12 tabular-nums"
                      required
                      autoFocus
                    />
                    <span className="absolute right-2 text-3xl font-black text-[#86868B] select-none">
                      %
                    </span>
                  </div>
                </div>

                {/* 2. Absolute Top & Most Prominent: ผลสำเร็จ คุณภาพ (อธิบาย) * */}
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1F] uppercase tracking-wider mb-2">
                    ผลสำเร็จ คุณภาพ (อธิบาย) *
                  </label>
                  <textarea
                    rows={4}
                    value={resultDesc}
                    onChange={(e) => setResultDesc(e.target.value)}
                    placeholder="อธิบายรายละเอียดผลการดำเนินโครงการเชิงคุณภาพ..."
                    className="w-full p-4 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEE] focus:bg-white text-sm text-[#1D1D1F] leading-relaxed border border-transparent focus:border-[#0066CC] focus:outline-hidden transition resize-none placeholder-[#86868B]"
                    required
                  />
                </div>

                {/* 3. Subdued Secondary Fields (มาตรฐาน, จุดเน้น, ผลลัพธ์ชาติ, สมรรถนะ) */}
                <div className="pt-2 border-t border-[#E5E5EA]/60 space-y-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">
                    ข้อมูลมาตรฐานและสมรรถนะที่เกี่ยวข้อง
                  </div>

                  {/* มาตรฐานที่นโยบาย จุดเน้น กระทรวงฯ */}
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">
                      นโยบายและจุดเน้นกระทรวงศึกษาธิการ:
                    </label>
                    <select
                      value={selectedPolicies[0] || MINISTRY_POLICIES[0]}
                      onChange={(e) => setSelectedPolicies([e.target.value])}
                      className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] text-xs"
                    >
                      {MINISTRY_POLICIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ผลลัพธ์ที่พึงประสงค์ของมาตรฐานการศึกษาชาติ */}
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">
                      ผลลัพธ์ที่พึงประสงค์ของมาตรฐานการศึกษาชาติ:
                    </label>
                    <select
                      value={selectedOutcomes[0] || NATIONAL_EDUCATION_OUTCOMES[0]}
                      onChange={(e) => setSelectedOutcomes([e.target.value])}
                      className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] text-xs"
                    >
                      {NATIONAL_EDUCATION_OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* สมรรถนะหลักหรือพัฒนาการเด็ก */}
                  {activeProjectForReport.level === 'basic_education' ? (
                    <div>
                      <label className="font-semibold text-[#1D1D1F] block mb-1">
                        สมรรถนะหลัก:
                      </label>
                      <select
                        value={selectedCoreComp[0] || CORE_COMPETENCIES[0]}
                        onChange={(e) => setSelectedCoreComp([e.target.value])}
                        className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] text-xs"
                      >
                        {CORE_COMPETENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="font-semibold text-[#1D1D1F] block mb-1">
                        พัฒนาการเด็ก:
                      </label>
                      <select
                        value={selectedChildDev[0] || CHILD_DEVELOPMENTS[0]}
                        onChange={(e) => setSelectedChildDev([e.target.value])}
                        className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] text-xs"
                      >
                        {CHILD_DEVELOPMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 4. Single Vibrant Apple System Blue Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-2xl bg-[#0066CC] hover:bg-[#0055B3] text-white font-semibold text-base tracking-tight shadow-[0_8px_25px_-6px_rgba(0,102,204,0.4)] transition cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {isSaving ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>บันทึกการรายงานผล</span>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Batch Delete Multiple Projects */}
      <AnimatePresence>
        {isBatchDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setIsBatchDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-left overflow-hidden"
            >
              <SpinnerOverlay
                isLoading={isDeleting}
                type="dotted-round"
                size="xxl"
                message={`กำลังลบโครงการที่เลือก ${selectedProjectIds.size} รายการ...`}
                subMessage="ระบบกำลังลบข้อมูลอย่างถาวรและอัปเดต Google Sheets"
              />

              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
                    ยืนยันการลบโครงการที่เลือก?
                  </h3>
                  <p className="text-xs text-[#86868B]">
                    จำนวนทั้งหมด <strong className="text-rose-600 font-bold">{selectedProjectIds.size}</strong> รายการ
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <Alert
                  variant="warning"
                  title="คำเตือนการลบข้อมูล"
                >
                  โครงการที่เลือกจำนวน {selectedProjectIds.size} รายการจะถูกลบออกจากระบบและ Google Sheets อย่างถาวร และไม่สามารถกู้คืนได้
                </Alert>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEE] text-[#1D1D1F] font-semibold text-xs cursor-pointer transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchDelete}
                  disabled={isDeleting || selectedProjectIds.size === 0}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-rose-600/25 transition disabled:opacity-50"
                  id="btn-confirm-batch-delete-projects"
                >
                  {isDeleting ? 'กำลังลบ...' : `ยืนยันลบ (${selectedProjectIds.size} รายการ)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Delete All */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteAllModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-center overflow-hidden"
            >
              <SpinnerOverlay
                isLoading={isDeleting}
                type="dotted-round"
                size="xxl"
                message="กำลังลบโครงการทั้งหมด..."
                subMessage="กรุณารอสักครู่"
              />

              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">
                ยืนยันการลบโครงการทั้งหมด?
              </h3>
              <p className="text-xs text-[#86868B] mb-6 leading-relaxed">
                การดำเนินการนี้จะลบโครงการทั้งหมดในปีการศึกษา {selectedYear} ({yearProjects.length} โครงการ) ออกจากระบบ
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteAllYear}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบทั้งหมด'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
