import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type SpinnerType = 'default' | 'dotted' | 'dotted-round';
export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface SpinnerProps {
  type?: SpinnerType;
  size?: SpinnerSize;
  className?: string;
  color?: string; // Optional custom Tailwind color class or hex
  label?: string;
}

const sizeDimensions: Record<SpinnerSize, { px: number; rem: string; className: string }> = {
  sm: { px: 16, rem: '1rem', className: 'w-4 h-4' },
  md: { px: 24, rem: '1.5rem', className: 'w-6 h-6' },
  lg: { px: 32, rem: '2rem', className: 'w-8 h-8' },
  xl: { px: 40, rem: '2.5rem', className: 'w-10 h-10' },
  xxl: { px: 48, rem: '3rem', className: 'w-12 h-12' }, // xxl: 48px (3rem) as requested
};

export const Spinner: React.FC<SpinnerProps> = ({
  type = 'default',
  size = 'md',
  className = '',
  color = 'text-[#0066CC]',
  label,
}) => {
  const currentSize = sizeDimensions[size] || sizeDimensions.md;

  const renderSpinnerGraphic = () => {
    switch (type) {
      case 'dotted': {
        // Dotted: 3 pulsing dots sequence
        const dotSizes: Record<SpinnerSize, string> = {
          sm: 'w-1.5 h-1.5',
          md: 'w-2 h-2',
          lg: 'w-2.5 h-2.5',
          xl: 'w-3 h-3',
          xxl: 'w-3.5 h-3.5',
        };
        const dotClass = dotSizes[size];

        return (
          <div className={`flex items-center justify-center gap-1.5 ${className}`}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={`rounded-full bg-current ${dotClass} ${color}`}
                animate={{
                  scale: [0.7, 1.25, 0.7],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.18,
                }}
              />
            ))}
          </div>
        );
      }

      case 'dotted-round': {
        // Dotted-round: 8 circular arranged dots (Apple iOS activity indicator style)
        const count = 8;
        const radius = currentSize.px / 2 - 5;
        const center = currentSize.px / 2;
        const dotRadius = Math.max(1.8, currentSize.px * 0.08);

        return (
          <svg
            className={`animate-spin ${currentSize.className} ${color} ${className}`}
            viewBox={`0 0 ${currentSize.px} ${currentSize.px}`}
            fill="currentColor"
            style={{ animationDuration: '1s', animationTimingFunction: 'steps(8, end)' }}
          >
            {Array.from({ length: count }).map((_, index) => {
              const angle = (index * 2 * Math.PI) / count;
              const cx = center + radius * Math.cos(angle);
              const cy = center + radius * Math.sin(angle);
              const opacity = (index + 1) / count;
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={dotRadius}
                  opacity={opacity}
                />
              );
            })}
          </svg>
        );
      }

      case 'default':
      default: {
        // Default: Smooth Apple-inspired conic arc spinner
        const strokeWidth = size === 'xxl' ? 3.5 : size === 'xl' ? 3 : 2.5;
        const radius = (currentSize.px - strokeWidth * 2) / 2;
        const circumference = 2 * Math.PI * radius;

        return (
          <svg
            className={`animate-spin ${currentSize.className} ${color} ${className}`}
            viewBox={`0 0 ${currentSize.px} ${currentSize.px}`}
            fill="none"
          >
            {/* Background track circle */}
            <circle
              cx={currentSize.px / 2}
              cy={currentSize.px / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="opacity-15"
            />
            {/* Moving foreground arc */}
            <circle
              cx={currentSize.px / 2}
              cy={currentSize.px / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.72}
              strokeLinecap="round"
              className="opacity-90"
            />
          </svg>
        );
      }
    }
  };

  return (
    <div className="inline-flex flex-col items-center justify-center gap-2" role="status">
      {renderSpinnerGraphic()}
      {label && (
        <span className="text-xs font-semibold text-slate-600 tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
};

export interface SpinnerOverlayProps {
  isLoading: boolean;
  type?: SpinnerType;
  size?: SpinnerSize;
  message?: string;
  subMessage?: string;
  className?: string;
  color?: string;
  fullScreen?: boolean;
}

export const SpinnerOverlay: React.FC<SpinnerOverlayProps> = ({
  isLoading,
  type = 'default',
  size = 'xxl', // Default size xxl: 48px (3rem)
  message,
  subMessage,
  className = '',
  color = 'text-[#0066CC]',
  fullScreen = false,
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`${
            fullScreen ? 'fixed' : 'absolute'
          } inset-0 z-50 flex flex-col items-center justify-center p-6 bg-white/75 backdrop-blur-xs rounded-[inherit] transition-all ${className}`}
        >
          <div className="flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-white/90 shadow-xl border border-slate-200/80 max-w-sm w-full mx-auto animate-in zoom-in-95 duration-200">
            <Spinner type={type} size={size} color={color} />
            {message && (
              <p className="mt-4 text-sm font-bold text-slate-900 tracking-tight">
                {message}
              </p>
            )}
            {subMessage && (
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {subMessage}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
