import React from 'react';
import { motion } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { AuditLogEntry, ProjectItem } from '../types';
import { ArrowLeft } from 'lucide-react';

interface FlattenedUpdateItem {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  reportedBy: string;
  reportedByEmail?: string;
  action: string;
  note?: string;
  resultQuantityPercent?: number | string;
  status?: string;
}

export const LatestUpdatesView: React.FC = () => {
  const { filteredProjects, setCurrentView, currentLevel } = useProjectStore();

  // Aggregate all updates / audit logs from projects
  const updates: FlattenedUpdateItem[] = [];

  filteredProjects.forEach((proj) => {
    if (Array.isArray(proj.auditLogs) && proj.auditLogs.length > 0) {
      proj.auditLogs.forEach((log) => {
        updates.push({
          id: log.id || `${proj.id}-${log.timestamp}`,
          projectId: proj.id,
          projectName: proj.name,
          timestamp: log.timestamp,
          reportedBy: log.reportedBy,
          reportedByEmail: log.reportedByEmail,
          action: log.action,
          note: log.note,
          resultQuantityPercent: log.resultQuantityPercent,
          status: log.status,
        });
      });
    } else if (proj.updatedAt) {
      // Fallback if no explicit audit logs
      updates.push({
        id: `update-${proj.id}`,
        projectId: proj.id,
        projectName: proj.name,
        timestamp: proj.lastReportedAt || proj.updatedAt,
        reportedBy: proj.lastReportedBy || proj.responsiblePerson || 'ผู้รับผิดชอบโครงการ',
        reportedByEmail: proj.lastReportedByEmail,
        action: 'update_report',
        note: proj.resultQualityDesc || 'อัปเดตผลการดำเนินโครงการ',
        resultQuantityPercent: proj.resultQuantityPercent,
        status: proj.status,
      });
    }
  });

  // Sort descending by timestamp
  updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatUpdateDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 sm:py-12 px-4 selection:bg-[#0066CC] selection:text-white">
      {/* Editorial Header */}
      <div className="mb-12">
        <button
          onClick={() => setCurrentView('reporting')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับไปยังหน้ารายงานผล</span>
        </button>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1D1D1F]">
          อัปเดตล่าสุด
        </h1>
        <p className="text-sm text-[#86868B] mt-1.5 font-normal">
          ลำดับเหตุการณ์การรายงานผลและบันทึกความก้าวหน้าโครงการตามเวลาจริง
        </p>
      </div>

      {/* Sleek Vertical Timeline Section */}
      {updates.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-[#F5F5F7]">
          <p className="text-sm font-medium text-[#86868B]">ยังไม่มีบันทึกการอัปเดตล่าสุดในขณะนี้</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8">
          {/* Faint 1px vertical line */}
          <div className="absolute left-[11px] sm:left-[15px] top-3 bottom-3 w-[1px] bg-[#E5E5EA]" />

          <div className="space-y-10 sm:space-y-12">
            {updates.slice(0, 40).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                {/* Thin minimal geometric hollow dot */}
                <div className="absolute -left-[18px] sm:-left-[22px] top-1.5 w-3 h-3 rounded-full border-2 border-[#0066CC] bg-white group-hover:scale-125 transition-transform" />

                {/* Date in subtle lighter gray */}
                <div className="text-xs font-medium text-[#86868B] tracking-tight mb-1">
                  {formatUpdateDate(item.timestamp)}
                </div>

                {/* Project title in bold modern font */}
                <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] leading-snug tracking-tight">
                  {item.projectName}
                </h3>

                {/* Update description in dark charcoal */}
                <div className="mt-2 text-sm text-[#1D1D1F] leading-relaxed font-normal">
                  {item.note || 'อัปเดตข้อมูลโครงการเรียบร้อยแล้ว'}
                </div>

                {/* Meta details: Reporter & Result Percentage tag */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-[#86868B]">
                    โดย: <span className="text-[#1D1D1F] font-semibold">{item.reportedBy}</span>
                  </span>

                  {item.resultQuantityPercent !== undefined && item.resultQuantityPercent !== null && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#0066CC] font-semibold text-[11px]">
                      ผลสัมฤทธิ์: {item.resultQuantityPercent}%
                    </span>
                  )}

                  {item.status && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] font-medium text-[11px]">
                      {item.status.split('.')[1] || item.status}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
