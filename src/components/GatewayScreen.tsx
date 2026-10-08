import React from 'react';
import { motion } from 'motion/react';
import { useProjectStore } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { EducationLevel } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { ArrowRight, LogOut, Sparkles } from 'lucide-react';

export const GatewayScreen: React.FC = () => {
  const { setCurrentLevel, setCurrentView } = useProjectStore();
  const { currentUser, isAdmin, logout } = useAuth();

  const handleSelectLevel = (level: EducationLevel) => {
    setCurrentLevel(level);
    setCurrentView('reporting');
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1D1D1F] flex flex-col justify-between selection:bg-[#0066CC] selection:text-white">
      {/* Top Header */}
      <header className="w-full pt-8 px-6 sm:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] p-1.5 flex items-center justify-center shadow-2xs">
            <SchoolLogo size="xs" showBorder={false} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#1D1D1F] tracking-tight">
              โรงเรียนเชียงใหม่คริสเตียน
            </div>
            <div className="text-[11px] text-[#86868B]">
              CMC Project Tracking
            </div>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#86868B] hidden sm:inline">
              {currentUser.name} {isAdmin ? '(Admin)' : ''}
            </span>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content: Bento Grid Level Selection */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1D1D1F] mb-3">
            เลือกระดับการศึกษา
          </h2>
          <p className="text-sm sm:text-base text-[#86868B] font-normal">
            เลือกฝ่ายการศึกษาที่ต้องการติดตามและรายงานผลโครงการ
          </p>
        </motion.div>

        {/* Bento Grid: 2 Tiles with Light Silver #F5F5F7, Large Typography at Center */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl">
          {/* Tile 1: Early Childhood */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.015 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelectLevel('early_childhood')}
            className="group relative bg-[#F5F5F7] hover:bg-[#EBEBEE] rounded-3xl p-10 sm:p-12 transition-all duration-300 cursor-pointer shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center text-center min-h-[260px]"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0066CC] mb-3">
              อนุบาล 1 - 3
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight group-hover:text-[#0066CC] transition-colors">
              ระดับการศึกษาปฐมวัย
            </h3>

            <div className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-[#86868B] group-hover:text-[#0066CC] transition-colors">
              <span>เข้าสู่ข้อมูลปฐมวัย</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Tile 2: Basic Education */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.015 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelectLevel('basic_education')}
            className="group relative bg-[#F5F5F7] hover:bg-[#EBEBEE] rounded-3xl p-10 sm:p-12 transition-all duration-300 cursor-pointer shadow-[0_10px_25px_-5px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center text-center min-h-[260px]"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0066CC] mb-3">
              ประถม - มัธยมศึกษา
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight group-hover:text-[#0066CC] transition-colors">
              ระดับการศึกษาขั้นพื้นฐาน
            </h3>

            <div className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-[#86868B] group-hover:text-[#0066CC] transition-colors">
              <span>เข้าสู่ข้อมูลขั้นพื้นฐาน</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full py-8 text-center text-xs text-[#86868B]">
        Chiang Mai Christian School &bull; CMC Project Tracking
      </footer>
    </div>
  );
};
