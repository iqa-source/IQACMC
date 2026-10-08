import React from 'react';
import { ProjectItem } from '../types';
import { Layers, Activity, Clock, CheckCircle2 } from 'lucide-react';

interface SummaryCardsProps {
  projects: ProjectItem[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ projects }) => {
  const total = projects.length;

  // โครงการที่กำลังดำเนินการ
  const inProgress = projects.filter(
    (p) => p.status === '5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)'
  ).length;

  // โครงการที่ยังไม่ได้ดำเนินการ
  const notStarted = projects.filter((p) => p.status === '6. ยังไม่ดำเนินการ').length;

  // โครงการที่ดำเนินการเสร็จสิ้น (ทั้งส่งเล่มแล้ว และค้างส่งเล่ม)
  const completed = projects.filter(
    (p) =>
      p.status === '1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว' ||
      p.status === '2. ดำเนินการเสร็จสิ้น ค้างส่งเล่มสรุปโครงการ'
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. ทั้งหมด */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-saas hover:border-indigo-300 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            จำนวนโครงการทั้งหมด
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{total}</span>
          <span className="text-xs text-slate-500 font-medium">โครงการ</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          ครอบคลุม 6 ยุทธศาสตร์หลักของโรงเรียน
        </div>
      </div>

      {/* 2. กำลังดำเนินการ */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-saas hover:border-indigo-300 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
            กำลังดำเนินการ
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-indigo-600 tracking-tight">{inProgress}</span>
          <span className="text-xs text-slate-500 font-medium">
            ({total > 0 ? ((inProgress / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          อยู่ระหว่างดำเนินการตลอดปีการศึกษา
        </div>
      </div>

      {/* 3. ยังไม่ได้ดำเนินการ */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-saas hover:border-slate-400 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
            ยังไม่ได้ดำเนินการ
          </span>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-700 tracking-tight">{notStarted}</span>
          <span className="text-xs text-slate-500 font-medium">
            ({total > 0 ? ((notStarted / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          รอเริ่มตามแผนปฏิทินปฏิบัติงาน
        </div>
      </div>

      {/* 4. ดำเนินการเสร็จสิ้น */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-saas hover:border-emerald-300 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">
            ดำเนินการเสร็จสิ้น
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-emerald-600 tracking-tight">{completed}</span>
          <span className="text-xs text-slate-500 font-medium">
            ({total > 0 ? ((completed / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          เสร็จสิ้นตามวัตถุประสงค์
        </div>
      </div>
    </div>
  );
};
