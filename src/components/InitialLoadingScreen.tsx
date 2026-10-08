import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SchoolLogo } from './SchoolLogo';

interface InitialLoadingScreenProps {
  onComplete: () => void;
  durationSeconds?: number;
}

export const InitialLoadingScreen: React.FC<InitialLoadingScreenProps> = ({
  onComplete,
  durationSeconds = 3,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const durationMs = durationSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(onComplete, 250);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [durationSeconds, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
      className="fixed inset-0 z-50 bg-[#FFFFFF] flex flex-col items-center justify-center p-6 select-none"
    >
      <div className="flex flex-col items-center max-w-sm w-full mx-auto text-center">
        {/* Blinking & Pulsing School Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Ambient Glow Pulse */}
          <motion.div
            animate={{
              opacity: [0.25, 0.75, 0.25],
              scale: [0.92, 1.15, 0.92],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
              ease: 'easeInOut',
            }}
            className="absolute -inset-3 rounded-full bg-blue-500/20 blur-xl pointer-events-none"
          />

          {/* Pulsing & Blinking Logo Container */}
          <motion.div
            animate={{
              opacity: [0.45, 1, 0.45],
              scale: [0.96, 1.04, 0.96],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
              ease: 'easeInOut',
            }}
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-3.5 shadow-[0_12px_32px_-8px_rgba(0,102,204,0.18)] border border-slate-200/90 flex items-center justify-center"
          >
            <SchoolLogo
              size="xl"
              showBorder={false}
              blinking={true}
              className="w-full h-full object-contain"
            />
          </motion.div>
        </div>

        {/* School Name & System Title */}
        <motion.div
          animate={{
            opacity: [0.75, 1, 0.75],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.6,
            ease: 'easeInOut',
          }}
          className="mb-6 space-y-1"
        >
          <h2 className="text-lg sm:text-xl font-extrabold text-[#1D1D1F] tracking-tight">
            โรงเรียนเชียงใหม่คริสเตียน
          </h2>
          <p className="text-xs sm:text-sm text-[#86868B] font-medium tracking-tight">
            ระบบติดตามผลการดำเนินโครงการ (CMC Project Tracking)
          </p>
        </motion.div>

        {/* Thin Elegant Apple System Blue Progress Bar */}
        <div className="w-56 sm:w-64 h-1 bg-[#F5F5F7] rounded-full overflow-hidden mx-auto mb-3">
          <motion.div
            className="h-full bg-[#0066CC] rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>

        {/* Progress Percentage */}
        <div className="flex items-center justify-between w-56 sm:w-64 text-[11px] text-[#86868B] font-medium">
          <span>กำลังเตรียมระบบ...</span>
          <span className="tabular-nums font-semibold text-[#1D1D1F]">{progress}%</span>
        </div>

        {/* Quick Skip button */}
        <button
          onClick={onComplete}
          className="mt-6 text-xs text-[#86868B] hover:text-[#1D1D1F] transition cursor-pointer"
        >
          ข้าม
        </button>
      </div>
    </motion.div>
  );
};
