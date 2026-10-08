import React, { useState } from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  blinking?: boolean;
}

const SIZE_MAP = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9 sm:w-10 sm:h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14 sm:w-16 sm:h-16',
  xl: 'w-20 h-20',
};

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  size = 'sm',
  showBorder = true,
  blinking = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const sizeClasses = SIZE_MAP[size] || size;
  const blinkClass = blinking ? 'animate-pulse' : '';

  if (hasError) {
    // Elegant Vector Fallback if image fails to load
    return (
      <div
        className={`${sizeClasses} ${className} ${blinkClass} rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0 select-none`}
        title="โรงเรียนเชียงใหม่คริสเตียน"
      >
        <span className="text-xs sm:text-sm font-black tracking-wider">CMC</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} ${className} ${blinkClass} rounded-xl ${
        showBorder ? 'bg-white p-0.5 border border-slate-200/80 shadow-xs' : ''
      } flex items-center justify-center overflow-hidden shrink-0 select-none`}
      title="ตราโรงเรียนเชียงใหม่คริสเตียน"
    >
      <img
        src="/logo.png"
        alt="ตราโรงเรียนเชียงใหม่คริสเตียน"
        className="w-full h-full object-contain pointer-events-none"
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  );
};
