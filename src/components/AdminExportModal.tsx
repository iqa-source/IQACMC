import React, { useState } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { EducationLevel, EDUCATION_LEVEL_NAMES } from '../types';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Database,
  X,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AdminExportModalProps {
  onClose: () => void;
}

export const AdminExportModal: React.FC<AdminExportModalProps> = ({ onClose }) => {
  const { isAdmin } = useAuth();
  const { projects, availableYears, exportExcel, exportCSV, exportJSON } = useProjectStore();

  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Guard: Admin only
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">
            สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)
          </h3>
          <p className="text-xs text-slate-500">
            ฟังก์ชันการสำรองข้อมูล (Offline Download) อนุญาตให้ใช้งานได้เฉพาะบัญชี Admin เท่านั้น
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // Count items matching current export filter
  const targetProjects = projects.filter((p) => {
    if (selectedLevel !== 'all' && p.level !== selectedLevel) return false;
    if (selectedYear !== 'all' && p.academicYear !== parseInt(selectedYear)) return false;
    return true;
  });

  const handleExportExcel = () => {
    const yr = selectedYear === 'all' ? 'all' : parseInt(selectedYear);
    exportExcel(selectedLevel, yr);
    setExportSuccessMsg('ดาวน์โหลดไฟล์ Excel (.xls) สำเร็จเรียบร้อย');
    setTimeout(() => setExportSuccessMsg(null), 3500);
  };

  const handleExportCSV = () => {
    const yr = selectedYear === 'all' ? 'all' : parseInt(selectedYear);
    exportCSV(selectedLevel, yr);
    setExportSuccessMsg('ดาวน์โหลดไฟล์ CSV (รองรับภาษาไทย) สำเร็จเรียบร้อย');
    setTimeout(() => setExportSuccessMsg(null), 3500);
  };

  const handleExportJSON = () => {
    exportJSON();
    setExportSuccessMsg('ดาวน์โหลดไฟล์สำรองฐานข้อมูล JSON สำเร็จเรียบร้อย');
    setTimeout(() => setExportSuccessMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-saas border border-slate-200/90 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200/80 shadow-xs">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold mb-1 border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>สิทธิ์เฉพาะแอดมิน (Admin Feature)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              การสำรองข้อมูล (Offline Download)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              ดาวน์โหลดข้อมูลโครงการทั้งหมดออกมาเป็นไฟล์ออฟไลน์สำหรับนำไปใช้งานต่อ
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {exportSuccessMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* Export Scope Selectors */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="font-bold text-slate-700">ขอบเขตข้อมูลที่ต้องการดาวน์โหลด:</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Level */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">
                ระดับการศึกษา
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as EducationLevel | 'all')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">ทุกระดับการศึกษา (ทั้งหมด)</option>
                <option value="early_childhood">
                  {EDUCATION_LEVEL_NAMES.early_childhood}
                </option>
                <option value="basic_education">
                  {EDUCATION_LEVEL_NAMES.basic_education}
                </option>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">
                ปีการศึกษา
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">ทุกปีการศึกษา</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr.toString()}>
                    ปีการศึกษา {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-indigo-700 font-semibold flex items-center justify-between">
            <span>จำนวนข้อมูลโครงการที่เลือก:</span>
            <span className="text-sm font-bold text-indigo-950">{targetProjects.length} โครงการ</span>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700">เลือกรูปแบบไฟล์ที่ต้องการ:</div>

          {/* Option 1: Excel */}
          <button
            onClick={handleExportExcel}
            className="w-full p-4 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 flex items-center justify-between group transition shadow-xs text-left cursor-pointer"
            id="btn-export-excel"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  ดาวน์โหลดเป็นไฟล์ Excel (.xls)
                </div>
                <div className="text-[11px] text-slate-500">
                  มีหัวตารางพร้อมจัดคอลัมน์และตารางข้อมูลครบถ้วน
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
          </button>

          {/* Option 2: CSV */}
          <button
            onClick={handleExportCSV}
            className="w-full p-4 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 flex items-center justify-between group transition shadow-xs text-left cursor-pointer"
            id="btn-export-csv"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  ดาวน์โหลดเป็นไฟล์ CSV (.csv)
                </div>
                <div className="text-[11px] text-slate-500">
                  รองรับภาษาไทย UTF-8 BOM สำหรับเปิดในโปรแกรมสเปรดชีตทั่วไป
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
          </button>

          {/* Option 3: Full JSON */}
          <button
            onClick={handleExportJSON}
            className="w-full p-4 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 flex items-center justify-between group transition shadow-xs text-left cursor-pointer"
            id="btn-export-json"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  สำรองฐานข้อมูลเต็มรูปแบบ (JSON Backup)
                </div>
                <div className="text-[11px] text-slate-500">
                  ไฟล์โครงสร้างข้อมูลดิบพร้อมประวัติการรายงานผล (Audit Trail)
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
