import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import {
  ProjectItem,
  STATUS_COLORS,
  PROJECT_STATUSES,
  ProjectStatus,
  EDUCATION_LEVEL_NAMES,
  isProjectReported,
} from '../types';
import { Alert } from './Alert';
import { SpinnerOverlay } from './Spinner';
import {
  ShieldCheck,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  FileCheck2,
  Eye,
  SlidersHorizontal,
  X,
  Save,
  Check,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
  MessageSquare,
  CheckSquare,
  Square,
} from 'lucide-react';

interface AdminPanelViewProps {
  onViewDetails: (project: ProjectItem) => void;
  onOpenAddModal: () => void;
  onOpenExportModal?: () => void;
  onOpenGoogleSheetsModal?: () => void;
}

type ReportingTab = 'all' | 'reported' | 'unreported';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  onViewDetails,
  onOpenAddModal,
  onOpenExportModal,
  onOpenGoogleSheetsModal,
}) => {
  const { isAdmin: isAuthAdmin, currentUser } = useAuth();
  const {
    currentLevel,
    projects,
    filteredProjects,
    availableYears,
    updateProject,
    setCurrentView,
    isSyncingSheets,
  } = useProjectStore();

  const isAdmin = !!(isAuthAdmin || currentUser?.role === 'admin');

  // Tab & Filters
  const [reportingTab, setReportingTab] = useState<ReportingTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Status Update Modal state (Single)
  const [projectForStatusUpdate, setProjectForStatusUpdate] = useState<ProjectItem | null>(null);
  const [newStatus, setNewStatus] = useState<ProjectStatus>('1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว');
  const [adminNote, setAdminNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Multi-select & Bulk Status Update state
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState<boolean>(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<ProjectStatus>('1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว');
  const [bulkAdminNote, setBulkAdminNote] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
  const [feedbackAlert, setFeedbackAlert] = useState<{
    variant: 'default' | 'success' | 'warning' | 'error' | 'info';
    title?: string;
    message: string;
  } | null>(null);

  // Guard for non-admin
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)
          </h2>
          <p className="text-sm text-slate-600">
            หน้าตรวจสอบโครงการสำหรับจัดการสถานะและตรวจสอบการรายงานผลโครงการ สามารถเข้าถึงได้เฉพาะผู้ดูแลระบบของโรงเรียนเท่านั้น
          </p>
          <div className="pt-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
            >
              กลับสู่หน้าหลักแดชบอร์ด
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Base list of projects for current education level
  const levelProjects = filteredProjects;

  // Calculate metrics
  const totalCount = levelProjects.length;
  const reportedCount = useMemo(() => {
    return levelProjects.filter((p) => isProjectReported(p)).length;
  }, [levelProjects]);
  const unreportedCount = totalCount - reportedCount;
  const completedCount = useMemo(() => {
    return levelProjects.filter(
      (p) => p.status === '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว'
    ).length;
  }, [levelProjects]);

  // Filtered dataset according to Tab and Filters
  const filteredList = useMemo(() => {
    return levelProjects.filter((p) => {
      // 1. Tab filter (reported vs unreported)
      const reported = isProjectReported(p);
      if (reportingTab === 'reported' && !reported) return false;
      if (reportingTab === 'unreported' && reported) return false;

      // 2. Year filter
      if (filterYear !== 'all' && p.academicYear !== parseInt(filterYear)) {
        return false;
      }

      // 3. Status filter
      if (filterStatus !== 'all' && p.status !== filterStatus) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesResp = p.responsiblePerson.toLowerCase().includes(q);
        const matchesStrat = p.strategy.toLowerCase().includes(q);
        if (!matchesName && !matchesResp && !matchesStrat) return false;
      }

      return true;
    }).sort((a, b) => {
      // Always show latest academic year first, then latest updated
      if ((b.academicYear || 0) !== (a.academicYear || 0)) {
        return (b.academicYear || 0) - (a.academicYear || 0);
      }
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [levelProjects, reportingTab, filterYear, filterStatus, searchQuery]);

  const handleOpenStatusModal = (project: ProjectItem) => {
    setProjectForStatusUpdate(project);
    setNewStatus(project.status);
    setAdminNote(project.adminAuditNote || '');
    setUpdateFeedback(null);
  };

  const handleSaveStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForStatusUpdate) return;

    setIsUpdatingStatus(true);
    setUpdateFeedback(null);

    const note = adminNote.trim() || `แอดมินอัปเดตสถานะเป็น: ${newStatus}`;

    const res = await updateProject(
      projectForStatusUpdate.id,
      {
        status: newStatus,
        adminAuditNote: note,
        adminAuditNoteUpdatedAt: new Date().toISOString(),
      },
      note
    );

    setIsUpdatingStatus(false);

    if (res.success) {
      setUpdateFeedback({
        type: 'success',
        message: `อัปเดตสถานะโครงการเป็น "${newStatus}" เรียบร้อยแล้ว`,
      });
      setTimeout(() => {
        setProjectForStatusUpdate(null);
        setUpdateFeedback(null);
      }, 1200);
    } else {
      setUpdateFeedback({
        type: 'error',
        message: res.message || 'ไม่สามารถอัปเดตสถานะโครงการได้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  };

  const handleResetFilters = () => {
    setReportingTab('all');
    setSearchQuery('');
    setFilterYear('all');
    setFilterStatus('all');
  };

  // Toggle single project selection
  const handleToggleSelectProject = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all or deselect all currently filtered projects
  const handleSelectAllFiltered = () => {
    if (selectedProjectIds.size === filteredList.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(filteredList.map((p) => p.id)));
    }
  };

  // Execute bulk status update
  const handleExecuteBulkStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectIds.size === 0) return;

    setIsBulkUpdating(true);
    const count = selectedProjectIds.size;
    const note = bulkAdminNote.trim() || `แอดมินอัปเดตสถานะโครงการเป็นกลุ่ม: ${bulkNewStatus}`;

    try {
      const ids = Array.from(selectedProjectIds);
      let successCount = 0;
      for (const id of ids) {
        const res = await updateProject(
          id,
          {
            status: bulkNewStatus,
            adminAuditNote: note,
            adminAuditNoteUpdatedAt: new Date().toISOString(),
          },
          note
        );
        if (res.success) successCount++;
      }

      setIsBulkUpdating(false);
      setIsBulkStatusModalOpen(false);
      setSelectedProjectIds(new Set());
      setIsSelectMode(false);
      setBulkAdminNote('');

      setFeedbackAlert({
        variant: 'success',
        title: 'อัปเดตสถานะกลุ่มสำเร็จ',
        message: `อัปเดตสถานะโครงการจำนวน ${successCount} จาก ${count} รายการ เป็น "${bulkNewStatus}" เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setIsBulkUpdating(false);
      setFeedbackAlert({
        variant: 'error',
        title: 'เกิดข้อผิดพลาดในการอัปเดตกลุ่ม',
        message: err?.message || 'ไม่สามารถอัปเดตสถานะโครงการกลุ่มได้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-6 sm:p-8 shadow-saas relative overflow-hidden">
        {/* Background accent decor */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ตรวจสอบโครงการ (Admin Console)</span>
              </span>
              {currentLevel && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-indigo-200 backdrop-blur-xs border border-white/10">
                  <span>{EDUCATION_LEVEL_NAMES[currentLevel]}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ตรวจสอบโครงการและติดตามการรายงานผล
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              ศูนย์ควบคุมและตรวจสอบความคืบหน้าของโครงการทั้งหมดในโรงเรียน คัดกรองโครงการที่รายงานผลแล้วหรือยังไม่รายงานผล พร้อมปรับเปลี่ยนสถานะและบันทึกหมายเหตุของแอดมิน (Admin Audit Note)
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedProjectIds(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm ${
                isSelectMode
                  ? 'bg-amber-400 text-slate-950 font-black shadow-amber-400/25 ring-2 ring-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-xs'
              }`}
              id="btn-admin-panel-toggle-multi-select"
              title="เลือกหลายโครงการเพื่ออัปเดตสถานะพร้อมกัน"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectMode ? 'ยกเลิกเลือกหลายโครงการ' : 'เลือกหลายโครงการ'}</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
              id="btn-admin-panel-add-project"
            >
              <span>+ เพิ่มโครงการใหม่</span>
            </button>
            {onOpenGoogleSheetsModal && (
              <button
                onClick={onOpenGoogleSheetsModal}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition active:scale-95 cursor-pointer backdrop-blur-xs"
                id="btn-admin-panel-sheets"
                title="จัดการฐานข้อมูล Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Google Sheets</span>
              </button>
            )}
            {onOpenExportModal && (
              <button
                onClick={onOpenExportModal}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition active:scale-95 cursor-pointer backdrop-blur-xs"
                id="btn-admin-panel-export"
                title="ส่งออกข้อมูลสำรอง"
              >
                <Download className="w-3.5 h-3.5 text-indigo-300" />
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Feedback Alert Banner */}
      <AnimatePresence>
        {feedbackAlert && (
          <Alert
            variant={feedbackAlert.variant}
            title={feedbackAlert.title}
            onClose={() => setFeedbackAlert(null)}
          >
            {feedbackAlert.message}
          </Alert>
        )}
      </AnimatePresence>

      {/* 2. Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div
          onClick={() => setReportingTab('all')}
          className={`p-5 rounded-2xl border transition duration-150 cursor-pointer shadow-xs ${
            reportingTab === 'all'
              ? 'bg-white border-slate-900 ring-2 ring-slate-900/10'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              โครงการทั้งหมด
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium">โครงการ</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>คลิกเพื่อดูโครงการทั้งหมด</span>
          </div>
        </div>

        {/* Card 2: Reported */}
        <div
          onClick={() => setReportingTab('reported')}
          className={`p-5 rounded-2xl border transition duration-150 cursor-pointer shadow-xs ${
            reportingTab === 'reported'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              รายงานผลแล้ว
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{reportedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">
              ({totalCount > 0 ? ((reportedCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">
            ครู/ผู้รับผิดชอบได้บันทึกรายงานแล้ว
          </div>
        </div>

        {/* Card 3: Unreported (Needs Attention) */}
        <div
          onClick={() => setReportingTab('unreported')}
          className={`p-5 rounded-2xl border transition duration-150 cursor-pointer shadow-xs ${
            reportingTab === 'unreported'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              ยังไม่รายงานผล
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{unreportedCount}</span>
            <span className="text-xs text-amber-600 font-medium">
              ({totalCount > 0 ? ((unreportedCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">
            ต้องติดตามให้ผู้รับผิดชอบบันทึกผล
          </div>
        </div>

        {/* Card 4: Completed Projects */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ส่งเล่มเรียบร้อย
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{completedCount}</span>
            <span className="text-xs text-slate-500 font-medium">โครงการ</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            สถานะดำเนินการเสร็จสิ้น ส่งเล่มแล้ว
          </div>
        </div>
      </div>

      {/* 3. Filter Section & Reporting Tabs */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Tier A: Segmented Tab Bar for Reporting Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl max-w-lg w-full sm:w-auto">
            {/* Tab: All */}
            <button
              type="button"
              onClick={() => setReportingTab('all')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                reportingTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="tab-admin-all-projects"
            >
              <span>โครงการทั้งหมด</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                reportingTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {totalCount}
              </span>
            </button>

            {/* Tab: Reported */}
            <button
              type="button"
              onClick={() => setReportingTab('reported')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                reportingTab === 'reported'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
              id="tab-admin-reported-projects"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>รายงานผลแล้ว</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                reportingTab === 'reported' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {reportedCount}
              </span>
            </button>

            {/* Tab: Not Yet Reported */}
            <button
              type="button"
              onClick={() => setReportingTab('unreported')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                reportingTab === 'unreported'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
              id="tab-admin-unreported-projects"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ยังไม่รายงานผล</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                reportingTab === 'unreported' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-900'
              }`}>
                {unreportedCount}
              </span>
            </button>
          </div>

          {/* Quick status summary badge */}
          <div className="text-xs text-slate-500 text-right">
            แสดง <strong className="text-slate-900 font-bold">{filteredList.length}</strong> จากทั้งหมด {totalCount} รายการ
          </div>
        </div>

        {/* Tier B: Search and Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Search box */}
          <div className="sm:col-span-6 lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อโครงการ, ผู้รับผิดชอบ, หรือยุทธศาสตร์..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              id="input-admin-search-projects"
            />
          </div>

          {/* Academic Year Filter */}
          <div className="sm:col-span-3 lg:col-span-3">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500 bg-white font-medium text-slate-700"
              id="select-admin-filter-year"
            >
              <option value="all">ปีการศึกษาทั้งหมด</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  ปีการศึกษา {year}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3 lg:col-span-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500 bg-white font-medium text-slate-700"
              id="select-admin-filter-status"
            >
              <option value="all">สถานะโครงการทั้งหมด</option>
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="sm:col-span-12 lg:col-span-1 flex items-center justify-end">
            {(searchQuery || filterYear !== 'all' || filterStatus !== 'all' || reportingTab !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="lg:hidden">ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-select Action Bar */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50/60 border border-indigo-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-950 font-bold hover:bg-indigo-50 shadow-2xs transition cursor-pointer"
              >
                {selectedProjectIds.size === filteredList.length && filteredList.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedProjectIds.size === filteredList.length && filteredList.length > 0
                    ? 'ยกเลิกเลือกทั้งหมด'
                    : 'เลือกทั้งหมด'}
                </span>
              </button>
              <div className="text-slate-700 font-medium">
                เลือกแล้ว <strong className="text-indigo-950 font-black text-sm">{selectedProjectIds.size}</strong> จาก {filteredList.length} โครงการ
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={selectedProjectIds.size === 0}
                onClick={() => setIsBulkStatusModalOpen(true)}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold transition shadow-md shadow-indigo-600/25 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                id="btn-admin-open-bulk-status-modal"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>อัปเดตสถานะที่เลือก ({selectedProjectIds.size} โครงการ)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectIds(new Set());
                  setIsSelectMode(false);
                }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-semibold border border-slate-200 transition cursor-pointer"
              >
                ปิดโหมดเลือก
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Projects Table & Cards */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-saas overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">ไม่พบโครงการที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              กรุณาลองเปลี่ยนคำค้นหา ปรับสถานะการรายงานผล หรือรีเซ็ตตัวกรองเพื่อดูโครงการอื่น ๆ
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {isSelectMode && (
                    <th className="py-3.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        title="เลือกทั้งหมด"
                        className="p-1 hover:bg-indigo-100/60 rounded-md transition cursor-pointer"
                      >
                        {selectedProjectIds.size === filteredList.length && filteredList.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[280px]">โครงการ / ปีการศึกษา</th>
                  <th className="py-3.5 px-4 min-w-[170px]">ผู้รับผิดชอบ</th>
                  <th className="py-3.5 px-4 min-w-[190px]">สถานะการรายงานผล</th>
                  <th className="py-3.5 px-4 min-w-[200px]">สถานะโครงการปัจจุบัน</th>
                  <th className="py-3.5 px-4 min-w-[170px] text-center bg-indigo-50/20 border-l border-slate-200">
                    การจัดการสถานะ (Action)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((project, idx) => {
                  const reported = isProjectReported(project);
                  const isSelected = selectedProjectIds.has(project.id);
                  const statusConfig = STATUS_COLORS[project.status] || {
                    bg: 'bg-slate-100 text-slate-700',
                    border: 'border-slate-200',
                  };

                  return (
                    <tr
                      key={project.id}
                      className={`transition group ${
                        isSelected
                          ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-200'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox column when in select mode */}
                      {isSelectMode && (
                        <td className="py-4 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectProject(project.id)}
                            className="p-1 hover:bg-indigo-100/60 rounded-md transition cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* 1. Index */}
                      <td className="py-4 px-4 text-center font-bold text-slate-400 group-hover:text-slate-700">
                        {idx + 1}
                      </td>

                      {/* 2. Project Name, Year, Strategy */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                              ปี {project.academicYear}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              {project.level === 'early_childhood' ? 'ปฐมวัย' : 'ขั้นพื้นฐาน'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onViewDetails(project)}
                            className="font-bold text-sm text-slate-900 hover:text-indigo-600 text-left transition leading-snug cursor-pointer line-clamp-2"
                            title="คลิกเพื่อดูรายละเอียดโครงการเต็ม"
                          >
                            {project.name}
                          </button>
                          <div className="text-[11px] text-slate-500 truncate max-w-sm">
                            {project.strategy}
                          </div>
                        </div>
                      </td>

                      {/* 3. Responsible Person */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 text-xs">
                            {project.responsiblePerson || 'ไม่ระบุ'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ตรวจโดย: {project.verifier || 'ฝ่ายนโยบายและแผนงาน'}
                          </div>
                        </div>
                      </td>

                      {/* 4. Reporting Status */}
                      <td className="py-4 px-4">
                        {reported ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>รายงานผลแล้ว</span>
                            </span>
                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                                <span>ความก้าวหน้า</span>
                                <span className="text-emerald-700 font-bold">{project.resultQuantityPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(0, project.resultQuantityPercent))}%` }}
                                />
                              </div>
                            </div>
                            {project.lastReportedAt && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(project.lastReportedAt).toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: '2-digit',
                                })}</span>
                                {project.lastReportedBy && (
                                  <span className="truncate max-w-[90px]">โดย {project.lastReportedBy}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>ยังไม่รายงานผล</span>
                            </span>
                            <div className="text-[10px] text-amber-700/80 font-medium">
                              รอผู้รับผิดชอบบันทึกข้อมูล
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Current Project Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${statusConfig.bg} ${statusConfig.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                            <span className="line-clamp-1">{project.status}</span>
                          </span>
                          {project.adminAuditNote && (
                            <div className="p-1.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-950 text-[11px] leading-tight flex items-start gap-1 max-w-xs shadow-2xs">
                              <MessageSquare className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="font-bold text-amber-900 block text-[10px]">บันทึกของแอดมิน:</span>
                                <span className="line-clamp-2 text-slate-700">{project.adminAuditNote}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Last Column: Action Button 'อัปเดตสถานะ' */}
                      <td className="py-4 px-4 text-center bg-indigo-50/20 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(project)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
                            id={`btn-update-status-${project.id}`}
                            title="กดเพื่อเปลี่ยนสถานะของโครงการนี้ทันที"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>อัปเดตสถานะ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewDetails(project)}
                            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
                            title="ดูรายละเอียดโครงการ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Admin Status Update Modal (เปลี่ยนสถานะโครงการทันที) */}
      {projectForStatusUpdate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => {
            if (!isUpdatingStatus) setProjectForStatusUpdate(null);
          }}
        >
          <div
            className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">
                    อัปเดตสถานะโครงการ (ตรวจสอบโครงการ)
                  </h2>
                  <p className="text-xs text-slate-300">
                    เปลี่ยนสถานะโครงการและบันทึกข้อความถึงผู้รายงานโครงการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setProjectForStatusUpdate(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStatusUpdate} className="p-6 space-y-5 text-xs">
              {/* Target Project Info Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                    ปีการศึกษา {projectForStatusUpdate.academicYear}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {projectForStatusUpdate.level === 'early_childhood' ? 'ระดับปฐมวัย' : 'ระดับการศึกษาขั้นพื้นฐาน'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {projectForStatusUpdate.name}
                </h3>
                <div className="text-slate-500 text-[11px]">
                  ผู้รับผิดชอบ: <strong className="text-slate-700 font-semibold">{projectForStatusUpdate.responsiblePerson || 'ไม่ระบุ'}</strong>
                </div>
              </div>

              {/* Status Selector Options */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  เลือกสถานะใหม่ที่ต้องการเปลี่ยน <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {PROJECT_STATUSES.map((st) => {
                    const isSelected = newStatus === st;
                    const isCurrent = projectForStatusUpdate.status === st;

                    return (
                      <label
                        key={st}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="project-status-radio"
                          value={st}
                          checked={isSelected}
                          onChange={() => setNewStatus(st)}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-xs ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                              {st}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                                สถานะปัจจุบัน
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Admin Audit Note */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  หมายเหตุ / บันทึกของแอดมิน (Admin Audit Note)
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="เช่น ตรวจสอบและอนุมัติเล่มรายงานเรียบร้อยแล้ว หรือ แจ้งแก้ไขรูปเล่มโครงการ"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 text-slate-900 text-xs"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  ข้อความนี้จะถูกบันทึกลง Google Sheets และระบบจะแสดงแจ้งเตือนให้ผู้รับผิดชอบโครงการเห็นทันที
                </p>
              </div>

              {/* Feedback Alert with semantic Alert component */}
              {updateFeedback && (
                <Alert
                  variant={updateFeedback.type === 'success' ? 'success' : 'error'}
                  title={updateFeedback.type === 'success' ? 'อัปเดตสำเร็จ' : 'เกิดข้อผิดพลาด'}
                >
                  {updateFeedback.message}
                </Alert>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => setProjectForStatusUpdate(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  id="btn-confirm-save-status"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกสถานะใหม่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Bulk Status Update (อัปเดตสถานะทีละหลายโครงการ) */}
      {isBulkStatusModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => !isBulkUpdating && setIsBulkStatusModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl w-full max-w-lg shadow-saas border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spinner Overlay with faint background during bulk status update */}
            <SpinnerOverlay
              isLoading={isBulkUpdating}
              type="dotted-round"
              size="xxl"
              message={`กำลังอัปเดตสถานะ ${selectedProjectIds.size} โครงการ...`}
              subMessage="ระบบกำลังบันทึกสถานะและซิงก์ข้อมูล กรุณารอสักครู่"
            />

            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-slate-950">
                    เลือก {selectedProjectIds.size} โครงการ
                  </span>
                  <h3 className="font-bold text-base text-white">
                    อัปเดตสถานะโครงการทีละหลายรายการ
                  </h3>
                </div>
                <p className="text-xs text-indigo-200">
                  ปรับเปลี่ยนสถานะโครงการที่เลือกทั้งหมดพร้อมกันในครั้งเดียว และบันทึกหมายเหตุของแอดมิน
                </p>
              </div>
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleExecuteBulkStatusUpdate} className="p-5 space-y-4 text-xs">
              {/* Selected items summary */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <span className="text-indigo-950 font-bold">
                  โครงการที่จะได้รับการอัปเดตสถานะ
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold text-[11px]">
                  {selectedProjectIds.size} โครงการ
                </span>
              </div>

              {/* Status Radio Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  เลือกสถานะใหม่สำหรับทุกโครงการที่เลือก <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {PROJECT_STATUSES.map((st) => {
                    const isSelected = bulkNewStatus === st;
                    return (
                      <label
                        key={st}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bulk-status-radio"
                          value={st}
                          checked={isSelected}
                          onChange={() => setBulkNewStatus(st)}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={`font-bold text-xs ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                          {st}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Admin Audit Note */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  หมายเหตุ / บันทึกของแอดมิน (Admin Audit Note)
                </label>
                <input
                  type="text"
                  value={bulkAdminNote}
                  onChange={(e) => setBulkAdminNote(e.target.value)}
                  placeholder="เช่น ตรวจสอบและปรับสถานะโครงการเป็นกลุ่มเรียบร้อยแล้ว"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 text-slate-900 text-xs"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  หมายเหตุนี้จะถูกบันทึกให้ทุกโครงการที่เลือก และซิงก์ลง Google Sheets ทันที
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => setIsBulkStatusModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isBulkUpdating || selectedProjectIds.size === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/25 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  id="btn-confirm-save-bulk-status"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ยืนยันอัปเดตสถานะ ({selectedProjectIds.size} โครงการ)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
