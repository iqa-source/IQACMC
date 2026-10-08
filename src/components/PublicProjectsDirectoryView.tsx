import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import {
  ProjectItem,
  STATUS_COLORS,
  EDUCATION_LEVEL_NAMES,
  EducationLevel,
  ProjectStatus,
  PROJECT_STATUSES,
} from '../types';
import { parseFlexiblePercentage } from '../utils/percentageHelper';
import { ProjectDetailModal } from './ProjectDetailModal';
import {
  Calendar,
  Search,
  Filter,
  ArrowLeft,
  LogIn,
  Layers,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Award,
  Wallet,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  BarChart3,
  X,
} from 'lucide-react';

interface PublicProjectsDirectoryViewProps {
  onBackToHome: () => void;
  onOpenLogin: () => void;
}

export const PublicProjectsDirectoryView: React.FC<PublicProjectsDirectoryViewProps> = ({
  onBackToHome,
  onOpenLogin,
}) => {
  const { projects, availableYears } = useProjectStore();
  const { isAuthenticated } = useAuth();

  // Selected year filter: default to the latest/most recent year available or 'all'
  const sortedYears = useMemo(() => {
    const years = [...availableYears];
    // Also include any years present in projects
    projects.forEach((p) => {
      if (p.academicYear && !years.includes(p.academicYear)) {
        years.push(p.academicYear);
      }
    });
    return years.sort((a, b) => b - a);
  }, [availableYears, projects]);

  const defaultYear = sortedYears[0] ? sortedYears[0] : 2568;
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(defaultYear);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ProjectItem | null>(null);

  // Filter projects by year, level, status, search
  const filteredProjects = useMemo(() => {
    return projects.filter((item) => {
      // 1. Year filter
      if (selectedYear !== 'all' && item.academicYear !== selectedYear) {
        return false;
      }
      // 2. Level filter
      if (selectedLevel !== 'all' && item.level !== selectedLevel) {
        return false;
      }
      // 3. Status filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchPerson = (item.responsiblePerson || '').toLowerCase().includes(query);
        const matchStrategy = (item.strategy || '').toLowerCase().includes(query);
        const matchVerifier = (item.verifier || '').toLowerCase().includes(query);
        if (!matchName && !matchPerson && !matchStrategy && !matchVerifier) {
          return false;
        }
      }
      return true;
    });
  }, [projects, selectedYear, selectedLevel, selectedStatus, searchQuery]);

  // Statistics for current filtered / selected year
  const stats = useMemo(() => {
    const list = selectedYear === 'all' 
      ? projects 
      : projects.filter((p) => p.academicYear === selectedYear);

    const total = list.length;
    const completed = list.filter((p) =>
      p.status.includes('เสร็จสิ้น')
    ).length;
    const inProgress = list.filter((p) =>
      p.status.includes('อยู่ระหว่างดำเนินการ')
    ).length;
    const notStarted = list.filter((p) =>
      p.status.includes('ยังไม่ดำเนินการ')
    ).length;

    const totalBudget = list.reduce((sum, p) => sum + (p.budget || 0), 0);

    let progressSum = 0;
    let progressCount = 0;
    list.forEach((p) => {
      const val = parseFlexiblePercentage(p.resultQuantityPercent, -1);
      if (val >= 0) {
        progressSum += val;
        progressCount += 1;
      }
    });

    const avgProgress = progressCount > 0 ? (progressSum / progressCount).toFixed(1) : '0';

    return {
      total,
      completed,
      inProgress,
      notStarted,
      totalBudget,
      avgProgress,
    };
  }, [projects, selectedYear]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#3054ff] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-sm font-medium transition cursor-pointer"
              title="กลับสู่หน้าแรก"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>กลับหน้าหลัก</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
                  PRO Tracking CMC
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <FileText className="w-3 h-3" />
                  รายละเอียดโครงการ (Read-Only)
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                โรงเรียนเชียงใหม่คริสเตียน &bull; ค้นหาและดูข้อมูลโครงการรายปี
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isAuthenticated ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#3054ff] hover:bg-[#2040e0] text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบจัดการ</span>
              </button>
            ) : (
              <button
                onClick={onBackToHome}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
              >
                <span>เข้าสู่แดชบอร์ดโครงการ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Hero Banner with Academic Year Selector */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-lg border border-slate-800">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-medium backdrop-blur-md border border-white/10">
                <Calendar className="w-3.5 h-3.5" />
                <span>ดูโครงการแยกตามปีการศึกษา</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                รายละเอียดโครงการในแต่ละปี
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed" style={{ fontFamily: "'Sarabun', sans-serif" }}>
                ระบบเปิดสำหรับดูข้อมูล วัตถุประสงค์ ยุทธศาสตร์ งบประมาณ และความคืบหน้าของโครงการโรงเรียนเชียงใหม่คริสเตียน
              </p>
            </div>

            {/* Academic Year Selector Dropdown List */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-white/10 p-2.5 sm:px-4 sm:py-3 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner">
              <label htmlFor="academic-year-select" className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>ปีการศึกษา:</span>
              </label>
              <div className="relative min-w-[200px] w-full sm:w-auto">
                <select
                  id="academic-year-select"
                  value={selectedYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedYear(val === 'all' ? 'all' : Number(val));
                  }}
                  className="w-full appearance-none bg-white text-slate-900 font-bold text-xs sm:text-sm px-4 py-2.5 pr-10 rounded-xl shadow-md border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition"
                >
                  {sortedYears.map((year) => (
                    <option key={year} value={year} className="text-slate-900 font-semibold">
                      ปีการศึกษา {year}
                    </option>
                  ))}
                  <option value="all" className="text-slate-900 font-semibold">
                    ทุกปีการศึกษา (ทั้งหมด)
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                โครงการทั้งหมด
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {stats.total}{' '}
                <span className="text-xs font-normal text-slate-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-emerald-300 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                เสร็จสิ้นแล้ว
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                {stats.completed}{' '}
                <span className="text-xs font-normal text-slate-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-indigo-300 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                อยู่ระหว่างดำเนินการ
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-300">
                {stats.inProgress}{' '}
                <span className="text-xs font-normal text-slate-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
              <div className="text-xs font-medium text-amber-300 flex items-center gap-1.5 mb-1">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                งบประมาณรวม
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 truncate">
                {stats.totalBudget > 0 ? `฿${stats.totalBudget.toLocaleString()}` : 'ตามแผนงาน'}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อโครงการ, ผู้รับผิดชอบ, ยุทธศาสตร์..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder-slate-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Academic Year Dropdown List in Filter Bar */}
            <div className="relative min-w-[165px]">
              <select
                value={selectedYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedYear(val === 'all' ? 'all' : Number(val));
                }}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm font-semibold text-slate-800 px-3.5 py-2.5 pr-8 rounded-xl cursor-pointer transition"
              >
                {sortedYears.map((year) => (
                  <option key={year} value={year}>
                    ปีการศึกษา {year}
                  </option>
                ))}
                <option value="all">ทุกปีการศึกษา (ทั้งหมด)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Level Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedLevel('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedLevel === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทุกระดับชั้น
              </button>
              <button
                onClick={() => setSelectedLevel('basic_education')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedLevel === 'basic_education'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                การศึกษาขั้นพื้นฐาน
              </button>
              <button
                onClick={() => setSelectedLevel('early_childhood')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedLevel === 'early_childhood'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                การศึกษาปฐมวัย
              </button>
            </div>
          </div>

          {/* Status Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              สถานะ:
            </span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({projects.length})
            </button>
            {PROJECT_STATUSES.map((status) => {
              const count = projects.filter(
                (p) => (selectedYear === 'all' || p.academicYear === selectedYear) && p.status === status
              ).length;
              if (count === 0 && selectedStatus !== status) return null;
              const isSelected = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(isSelected ? 'all' : status)}
                  className={`px-2.5 py-1 rounded-lg transition truncate max-w-[200px] cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={status}
                >
                  {status.split('.')[1]?.trim() || status} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Project Results Header */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-1">
          <div>
            พบข้อมูลทั้งหมด{' '}
            <span className="font-bold text-slate-900">{filteredProjects.length}</span> รายการ
            {selectedYear !== 'all' && (
              <span> (ประจำปีการศึกษา {selectedYear})</span>
            )}
          </div>
          {(selectedYear !== 'all' || selectedLevel !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedYear(defaultYear);
                setSelectedLevel('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">ไม่พบโครงการตามเงื่อนไขที่เลือก</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                ลองปรับเปลี่ยนปีการศึกษา ระดับชั้น หรือคำค้นหาใหม่อีกครั้ง
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedYear('all');
                setSelectedLevel('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              แสดงโครงการทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const statusInfo = STATUS_COLORS[project.status] || {
                bg: 'bg-slate-100 text-slate-700',
                text: 'text-slate-700',
                border: 'border-slate-200',
              };
              const resultPct = parseFlexiblePercentage(project.resultQuantityPercent, 0);
              const targetPct = parseFlexiblePercentage(project.targetQuantityPercent, 100);

              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectForDetail(project)}
                  className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          ปี {project.academicYear}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                          {EDUCATION_LEVEL_NAMES[project.level]}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border truncate max-w-[170px] ${statusInfo.bg} ${statusInfo.border}`}
                        title={project.status}
                      >
                        {project.status.split('.')[1]?.trim() || project.status}
                      </span>
                    </div>

                    {/* Project Name */}
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                      {project.name}
                    </h3>

                    {/* Strategy info */}
                    <div className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">ยุทธศาสตร์: </span>
                      {project.strategy}
                    </div>

                    {/* Progress Bar & Targets */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">ผลสำเร็จ (ร้อยละ):</span>
                        <span className="font-bold text-slate-900">
                          {project.resultQuantityPercent !== undefined && project.resultQuantityPercent !== ''
                            ? `${project.resultQuantityPercent}%`
                            : 'ยังไม่ได้ระบุ'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            resultPct >= 80
                              ? 'bg-emerald-500'
                              : resultPct >= 50
                              ? 'bg-blue-500'
                              : resultPct > 0
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, resultPct))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>เป้าหมาย: {targetPct}%</span>
                        {project.budget !== undefined && project.budget > 0 && (
                          <span className="font-medium text-slate-600">
                            งบประมาณ: ฿{project.budget.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Card */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{project.responsiblePerson || 'ไม่ได้ระบุ'}</span>
                    </div>

                    <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                      ดูรายละเอียด
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-6 text-center text-xs text-slate-500">
        <p>
          ระบบจัดการและติดตามผลการดำเนินโครงการ โรงเรียนเชียงใหม่คริสเตียน (Chiang Mai Christian School)
        </p>
        <p className="mt-1 text-slate-400">
          PRO Tracking CMC &bull; โหมดสำหรับดูรายละเอียดโครงการในแต่ละปีการศึกษา
        </p>
      </footer>

      {/* Detail Modal for Full Project Inspection */}
      {selectedProjectForDetail && (
        <ProjectDetailModal
          project={selectedProjectForDetail}
          onClose={() => setSelectedProjectForDetail(null)}
        />
      )}
    </div>
  );
};
