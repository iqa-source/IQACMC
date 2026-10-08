import React from 'react';
import {
  ProjectItem,
  STATUS_COLORS,
  EDUCATION_LEVEL_NAMES,
} from '../types';
import { parseFlexiblePercentage } from '../utils/percentageHelper';
import {
  X,
  Calendar,
  UserCheck,
  Target,
  Award,
  BookOpen,
  Clock,
  History,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ProjectDetailModalProps {
  project: ProjectItem;
  onClose: () => void;
  onEdit?: (project: ProjectItem) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  onEdit,
}) => {
  const statusInfo = STATUS_COLORS[project.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-saas border border-slate-200/90 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern SaaS Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 flex items-start justify-between gap-4 bg-slate-50/80">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                ปีการศึกษา {project.academicYear}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200">
                {EDUCATION_LEVEL_NAMES[project.level]}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${statusInfo.bg} ${statusInfo.border}`}
              >
                {project.status}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
              {project.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200 transition shrink-0 cursor-pointer"
            id="btn-close-project-detail"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Bento Grid style */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm text-slate-700 bg-slate-50/40">
          {/* Strategy Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
              ยุทธศาสตร์หลักของโรงเรียน
            </div>
            <div className="font-semibold text-slate-900 text-base leading-relaxed">
              {project.strategy}
            </div>
          </div>

          {/* Targets & Results (Progress comparison) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span>เป้าหมาย (Target)</span>
                </div>
                <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-200">
                  ร้อยละ {project.targetQuantityPercent}%
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px] leading-relaxed">
                {project.targetQualityDesc || 'ไม่ได้ระบุคำอธิบายเชิงคุณภาพ'}
              </p>
            </div>

            {/* Actual Result */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>ผลสำเร็จ (Actual Result)</span>
                </div>
                <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  ร้อยละ {project.resultQuantityPercent}%
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px] leading-relaxed">
                {project.resultQualityDesc || 'ยังไม่มีการรายงานผลเชิงคุณภาพ'}
              </p>
            </div>
          </div>

          {/* Progress Bar Visual */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">ความก้าวหน้าเปรียบเทียบเป้าหมาย</span>
              <span className="font-mono text-indigo-700 font-bold">
                {project.resultQuantityPercent}% / {project.targetQuantityPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, parseFlexiblePercentage(project.resultQuantityPercent, 0)))}%`,
                }}
              />
            </div>
          </div>

          {/* Admin Audit Note / Feedback for Users */}
          {project.adminAuditNote && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-950 text-xs sm:text-sm">
                  <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span>หมายเหตุ / บันทึกของแอดมิน (Admin Audit Note)</span>
                </div>
                {project.adminAuditNoteUpdatedAt && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    {new Date(project.adminAuditNoteUpdatedAt).toLocaleString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-white border border-amber-200/70 text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                {project.adminAuditNote}
              </div>
            </div>
          )}

          {/* Standards, Policies & Outcomes */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>มาตรฐานระดับการศึกษา ({EDUCATION_LEVEL_NAMES[project.level]})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.standards.map((std, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200"
                  >
                    {std}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                นโยบายจุดเน้นกระทรวงศึกษาธิการ
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.ministryPolicies && project.ministryPolicies.length > 0 ? (
                  project.ministryPolicies.map((pol, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      {pol}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">ไม่ได้ระบุนโยบาย</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                ผลลัพธ์ที่พึงประสงค์ของมาตรฐานการศึกษาชาติ
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.nationalOutcomes && project.nationalOutcomes.length > 0 ? (
                  project.nationalOutcomes.map((outc, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      {outc}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">ไม่ได้ระบุผลลัพธ์</span>
                )}
              </div>
            </div>
          </div>

          {/* Responsible & Verifier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">ผู้รับผิดชอบโครงการ</div>
                <div className="font-bold text-slate-900 text-sm">
                  {project.responsiblePerson || 'ไม่ระบุ'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200/80">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">ผู้ตรวจสอบความถูกต้อง</div>
                <div className="font-bold text-slate-900 text-sm">
                  {project.verifier === 'อื่น ๆ' && project.customVerifier
                    ? `${project.verifier} (${project.customVerifier})`
                    : project.verifier || 'ฝ่ายนโยบายและแผนงาน'}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <History className="w-4 h-4 text-indigo-600" />
                <span>การบันทึกประวัติ (Audit Trail)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                รหัสโครงการ: {project.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  <span>Timestamp (รายงานผลล่าสุด)</span>
                </div>
                <div className="font-bold text-slate-900 mt-1">
                  {project.lastReportedAt
                    ? new Date(project.lastReportedAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'ยังไม่มีประวัติการรายงานผล'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-slate-500 text-[11px] flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>Reported By (ชื่อผู้รายงาน)</span>
                </div>
                <div className="font-bold text-slate-900 mt-1">
                  {project.lastReportedBy || 'ผู้ดูแลระบบ CMC'}
                </div>
                {project.lastReportedByEmail && (
                  <div className="text-[10px] text-slate-400 truncate">
                    {project.lastReportedByEmail}
                  </div>
                )}
              </div>
            </div>

            {/* Audit Logs List */}
            {project.auditLogs && project.auditLogs.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  ประวัติการอัปเดตย้อนหลัง ({project.auditLogs.length} รายการ):
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                  {project.auditLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-slate-600"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">
                          {log.reportedBy}
                        </span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span>{log.note || 'อัปเดตข้อมูล'}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0">
                        {new Date(log.timestamp).toLocaleString('th-TH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            อัปเดตล่าสุด: {new Date(project.updatedAt).toLocaleString('th-TH')}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(project);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs text-xs sm:text-sm font-bold transition-all active:scale-[0.98] cursor-pointer"
              >
                บันทึกรายงานผล / แก้ไขข้อมูล
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
