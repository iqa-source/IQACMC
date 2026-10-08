import React, { useState } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import { SummaryCards } from './SummaryCards';
import { StatusPieChart } from './StatusPieChart';
import {
  ProjectItem,
  STATUS_COLORS,
  PROJECT_STATUSES,
  EDUCATION_LEVEL_NAMES,
  ProjectStatus,
} from '../types';
import { parseFlexiblePercentage } from '../utils/percentageHelper';
import {
  Search,
  Calendar,
  Eye,
  Trash2,
  Sparkles,
  ArrowRight,
  FileCheck2,
  Plus,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';

interface DashboardViewProps {
  onViewDetails: (project: ProjectItem) => void;
  onOpenAddModal: () => void;
  onOpenBulkAddModal: () => void;
  onOpenGoogleSheetsModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onViewDetails,
  onOpenAddModal,
  onOpenBulkAddModal,
  onOpenGoogleSheetsModal,
}) => {
  const {
    currentLevel,
    filteredProjects,
    selectedYear,
    setSelectedYear,
    availableYears,
    deleteProject,
    isAdmin,
    setCurrentView,
    googleSheetsConfig,
    isSyncingSheets,
    refreshSharedProjects,
    pullFromGoogleSheets,
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ProjectStatus | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const handleRefreshConnection = async () => {
    setIsRefreshing(true);
    setRefreshNotice(null);
    try {
      await refreshSharedProjects();
      if (googleSheetsConfig.webhookUrl) {
        await pullFromGoogleSheets();
      }
      setRefreshNotice('รีเฟรชการเชื่อมต่อและอัปเดตข้อมูลล่าสุดเรียบร้อยแล้ว');
      setTimeout(() => setRefreshNotice(null), 3500);
    } catch (err: any) {
      setRefreshNotice('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
      setTimeout(() => setRefreshNotice(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter projects for selected academic year
  const yearProjects = filteredProjects.filter(
    (p) => p.academicYear === selectedYear
  );

  // Apply search query and status slice filter
  const displayedProjects = yearProjects.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.responsiblePerson.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      !selectedStatusFilter || p.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteProject(projectToDelete.id);
      if (res.success) {
        setProjectToDelete(null);
      } else {
        setDeleteError(res.message || 'ไม่สามารถลบโครงการได้');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'เกิดข้อผิดพลาดในการลบโครงการ');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Unified Bento Header & Control Toolbar */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-saas">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/80">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentLevel ? EDUCATION_LEVEL_NAMES[currentLevel] : ''}</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ภาพรวมการดำเนินงานโครงการ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ระบบติดตามผลสัมฤทธิ์ วัตถุประสงค์ และการส่งรูปเล่มสรุปโครงการ · โรงเรียนเชียงใหม่คริสเตียน
            </p>
          </div>

          {/* Controls: Year Selector & Quick Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Academic Year Selector */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">ปีการศึกษา:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-bold text-indigo-600 focus:outline-hidden focus:border-indigo-500 shadow-2xs cursor-pointer"
                id="select-academic-year"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    พ.ศ. {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Link to Reporting - Prominent Tech Button */}
            <button
              onClick={() => setCurrentView('reporting')}
              className="flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer"
              id="btn-header-goto-reporting"
            >
              <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="tracking-wide">บันทึกรายงานผล</span>
            </button>

            {/* Quick Link to Admin Panel for Admin */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('admin_panel')}
                className="flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/15 transition-all active:scale-[0.98] cursor-pointer"
                id="btn-header-goto-admin-panel"
                title="เข้าสู่ระบบตรวจสอบโครงการเพื่อติดตามการรายงานผลและอัปเดตสถานะ"
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span className="tracking-wide">ตรวจสอบโครงการ</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Sheets Status Bar (Integrated Sub-bar) */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-bold text-slate-800">ฐานข้อมูล Google Sheets:</span>
              {googleSheetsConfig.spreadsheetUrl ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  เชื่อมต่อและบันทึกอัตโนมัติ
                </span>
              ) : (
                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {isAdmin ? 'ยังไม่ได้เชื่อมต่อสเปรดชีต' : 'เชื่อมต่อฐานข้อมูลระบบ'}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {googleSheetsConfig.lastSyncedAt
                  ? `(ซิงก์ล่าสุด: ${new Date(googleSheetsConfig.lastSyncedAt).toLocaleTimeString('th-TH')} น.)`
                  : ''}
              </span>
              {refreshNotice && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{refreshNotice}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* ADMIN ONLY: ในรายการปุ่มเปิดดูชีท และจัดการชีท */}
            {isAdmin ? (
              <>
                {googleSheetsConfig.spreadsheetUrl && (
                  <a
                    href={googleSheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition text-xs"
                    id="btn-dashboard-open-sheet-admin"
                    title="เปิดดู Google Sheet ในแท็บใหม่"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>เปิดดูชีท</span>
                  </a>
                )}
                {onOpenGoogleSheetsModal && (
                  <button
                    onClick={onOpenGoogleSheetsModal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition text-xs cursor-pointer"
                    id="btn-dashboard-manage-sheets"
                    title="จัดการโครงสร้างชีทและการเชื่อมต่อ"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>{googleSheetsConfig.spreadsheetUrl ? 'จัดการชีท' : 'สร้างชีทอัตโนมัติ'}</span>
                  </button>
                )}
                <button
                  onClick={handleRefreshConnection}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  id="btn-admin-refresh-connection"
                  title="รีเฟรชการเชื่อมต่อข้อมูลกับ Google Sheets และเซิร์ฟเวอร์"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>{isRefreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleRefreshConnection}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                id="btn-user-refresh-connection"
                title="รีเฟรชการเชื่อมต่อข้อมูลโครงการล่าสุด"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isRefreshing ? 'กำลังรีเฟรชข้อมูล...' : 'รีเฟรชการเชื่อมต่อข้อมูล'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Summary Metric Cards */}
      <SummaryCards projects={yearProjects} />

      {/* 3. Interactive Chart & Status Breakdown */}
      <StatusPieChart
        projects={yearProjects}
        selectedStatus={selectedStatusFilter}
        onSelectStatus={setSelectedStatusFilter}
      />

      {/* 4. Projects Table with Quick Filter Chips */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-saas space-y-4">
        {/* Table Toolbar Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              ตารางรายละเอียดโครงการ ประจำปีการศึกษา {selectedYear}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดง {displayedProjects.length} จากทั้งหมด {yearProjects.length} โครงการ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อโครงการ, ผู้รับผิดชอบ..."
                className="pl-9 pr-3.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 w-52 sm:w-64 bg-slate-50/50"
              />
            </div>

            {/* View all projects button */}
            <button
              onClick={() => setCurrentView('all_projects')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer"
              id="btn-view-all-projects-from-dashboard"
            >
              <span>คลังโครงการทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs border-b border-slate-100 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0 whitespace-nowrap">
            กรองสถานะ:
          </span>
          <button
            onClick={() => setSelectedStatusFilter(null)}
            className={`px-3 py-1 rounded-lg font-semibold shrink-0 whitespace-nowrap transition cursor-pointer ${
              selectedStatusFilter === null
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({yearProjects.length})
          </button>
          {PROJECT_STATUSES.map((st) => {
            const count = yearProjects.filter((p) => p.status === st).length;
            if (count === 0 && selectedStatusFilter !== st) return null;
            const isSelected = selectedStatusFilter === st;

            return (
              <button
                key={st}
                onClick={() =>
                  setSelectedStatusFilter(isSelected ? null : st)
                }
                className={`px-3 py-1 rounded-lg font-semibold shrink-0 whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <span>{st.split('.')[1]?.trim() || st}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table of Projects */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">ลำดับ</th>
                <th className="py-3.5 px-4">ชื่อโครงการ / แนวทาง</th>
                <th className="py-3.5 px-4 hidden md:table-cell">ยุทธศาสตร์</th>
                <th className="py-3.5 px-4 text-center">ความก้าวหน้า</th>
                <th className="py-3.5 px-4 text-center">สถานะโครงการ</th>
                <th className="py-3.5 px-4 text-center w-36">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลโครงการตามเงื่อนไขที่กำหนด
                  </td>
                </tr>
              ) : (
                displayedProjects.map((proj, index) => {
                  const statusInfo = STATUS_COLORS[proj.status];

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-slate-50/80 transition duration-150"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="max-w-md line-clamp-2">{proj.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          ผู้รับผิดชอบ: {proj.responsiblePerson || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 max-w-xs">
                        <div className="line-clamp-1">{proj.strategy}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center min-w-[70px]">
                          <span className="font-bold text-slate-800">
                            {proj.resultQuantityPercent}%
                          </span>
                          <div className="w-14 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, parseFlexiblePercentage(proj.resultQuantityPercent, 0)))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.border}`}
                        >
                          {proj.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewDetails(proj)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition cursor-pointer"
                            title="ดูรายละเอียดโครงการ"
                            id={`btn-view-detail-${proj.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูรายละเอียด</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => setProjectToDelete(proj)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="ลบโครงการ (แอดมิน)"
                              id={`btn-delete-${proj.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Quick Action banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-saas flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-white text-base">
            ต้องการรายงานผลความก้าวหน้าโครงการ?
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            คุณครูและผู้รับผิดชอบโครงการสามารถเข้าบันทึกผลสำเร็จเชิงปริมาณและคุณภาพได้ทันที
          </p>
        </div>
        <button
          onClick={() => setCurrentView('reporting')}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <FileCheck2 className="w-4 h-4" />
          <span className="tracking-wide">ไปที่หน้ารายงานผลการดำเนินโครงการ</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  ยืนยันการลบโครงการ
                </h3>
                <p className="text-xs text-slate-500">
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-700 border border-slate-200">
              <strong>{projectToDelete.name}</strong>
              <div className="text-[11px] text-slate-400 mt-1">
                ปีการศึกษา {projectToDelete.academicYear} | {projectToDelete.strategy}
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => !isDeleting && setProjectToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? 'กำลังลบโครงการ...' : 'ยืนยันการลบโครงการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
