import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import {
  ProjectItem,
  STATUS_COLORS,
  PROJECT_STATUSES,
  EARLY_CHILDHOOD_STANDARDS,
  BASIC_EDUCATION_STANDARDS,
  EDUCATION_LEVEL_NAMES,
} from '../types';
import { parseFlexiblePercentage } from '../utils/percentageHelper';
import { Alert } from './Alert';
import { SpinnerOverlay } from './Spinner';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface AllProjectsViewProps {
  onViewDetails: (project: ProjectItem) => void;
  onOpenAddModal: () => void;
}

export const AllProjectsView: React.FC<AllProjectsViewProps> = ({
  onViewDetails,
}) => {
  const {
    currentLevel,
    filteredProjects,
    availableYears,
    deleteProject,
    isAdmin,
  } = useProjectStore();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStandard, setFilterStandard] = useState<string>('all');
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Available standards for current educational level
  const standardOptions =
    currentLevel === 'early_childhood'
      ? EARLY_CHILDHOOD_STANDARDS
      : BASIC_EDUCATION_STANDARDS;

  // Filtered dataset
  const filteredList = useMemo(() => {
    const list = filteredProjects.filter((p) => {
      // 1. Year filter
      if (filterYear !== 'all' && p.academicYear !== parseInt(filterYear, 10)) {
        return false;
      }

      // 2. Status filter
      if (filterStatus !== 'all' && p.status !== filterStatus) {
        return false;
      }

      // 3. Educational standard filter
      if (filterStandard !== 'all' && !p.standards.includes(filterStandard)) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesResp = p.responsiblePerson.toLowerCase().includes(query);
        const matchesStrat = p.strategy.toLowerCase().includes(query);
        if (!matchesName && !matchesResp && !matchesStrat) {
          return false;
        }
      }

      return true;
    });

    // แสดงปีการศึกษาล่าสุดก่อนเสมอ
    return [...list].sort((a, b) => {
      if ((b.academicYear || 0) !== (a.academicYear || 0)) {
        return (b.academicYear || 0) - (a.academicYear || 0);
      }
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [filteredProjects, filterYear, filterStatus, filterStandard, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterYear('all');
    setFilterStatus('all');
    setFilterStandard('all');
  };

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
      {/* Header Bento Card */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-saas flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold mb-2 border border-indigo-200/80">
            {currentLevel ? EDUCATION_LEVEL_NAMES[currentLevel] : ''}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            ระบบสืบค้นและดูโครงการทั้งหมด
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหาและกรองโครงการตามปีการศึกษา สถานะ และมาตรฐานระดับการศึกษา
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shrink-0">
          แสดง <span className="text-indigo-600 font-bold text-sm">{filteredList.length}</span> จากทั้งหมด{' '}
          <span className="font-bold">{filteredProjects.length}</span> โครงการ
        </div>
      </div>

      {/* Filter Control Bento Card */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-saas space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>ตัวกรองการค้นหาโครงการ</span>
          </div>
          {(filterYear !== 'all' ||
            filterStatus !== 'all' ||
            filterStandard !== 'all' ||
            searchQuery !== '') && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              ค้นหาโครงการ
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ชื่อโครงการ, ผู้รับผิดชอบ..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Filter Year */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>ค้นหาปีการศึกษา</span>
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-white font-medium cursor-pointer"
            >
              <option value="all">ทุกปีการศึกษา</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  ปีการศึกษา {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              สถานะโครงการ
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-white font-medium cursor-pointer"
            >
              <option value="all">ทุกสถานะ</option>
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Standards */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              มาตรฐานระดับการศึกษา
            </label>
            <select
              value={filterStandard}
              onChange={(e) => setFilterStandard(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-white font-medium cursor-pointer"
            >
              <option value="all">ทุกมาตรฐาน</option>
              {standardOptions.map((std) => (
                <option key={std} value={std}>
                  {std}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table Bento Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-saas overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">ลำดับ</th>
                <th className="py-3.5 px-4">ชื่อโครงการ / แนวทาง</th>
                <th className="py-3.5 px-3 text-center">ปีการศึกษา</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">มาตรฐานระดับการศึกษา</th>
                <th className="py-3.5 px-4 text-center">ความก้าวหน้า</th>
                <th className="py-3.5 px-4 text-center">สถานะโครงการ</th>
                <th className="py-3.5 px-4 text-center w-36">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    ไม่พบโครงการที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredList.map((proj, index) => {
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
                      <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                        {proj.academicYear}
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {proj.standards.map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
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
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            เป้า {proj.targetQuantityPercent}%
                          </span>
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

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 overflow-hidden animate-in zoom-in-95 duration-150">
            <SpinnerOverlay
              isLoading={isDeleting}
              type="dotted-round"
              size="xxl"
              message="กำลังลบโครงการ..."
              subMessage="ระบบกำลังอัปเดตข้อมูลและ Google Sheets"
            />

            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
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

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs text-slate-700 border border-slate-200">
              <strong className="text-slate-900">{projectToDelete.name}</strong>
              <div className="text-[11px] text-slate-500 mt-1">
                ปีการศึกษา {projectToDelete.academicYear} &bull; {projectToDelete.strategy}
              </div>
            </div>

            {deleteError && (
              <Alert
                variant="error"
                title="เกิดข้อผิดพลาดในการลบ"
              >
                {deleteError}
              </Alert>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => !isDeleting && setProjectToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer transition"
              >
                {isDeleting ? 'กำลังลบโครงการ...' : 'ยืนยันการลบโครงการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
