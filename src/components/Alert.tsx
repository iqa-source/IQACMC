import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  X,
} from 'lucide-react';

export type AlertVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string;
    iconColor: string;
    titleColor: string;
    bodyColor: string;
    defaultIcon: React.ReactNode;
    badgeBg: string;
  }
> = {
  default: {
    container: 'bg-slate-50 border-slate-200 text-slate-800 shadow-2xs',
    iconColor: 'text-slate-600',
    titleColor: 'text-slate-900',
    bodyColor: 'text-slate-600',
    defaultIcon: <Bell className="w-5 h-5 text-slate-600" />,
    badgeBg: 'bg-slate-200/60 text-slate-700',
  },
  success: {
    container: 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-2xs',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-950',
    bodyColor: 'text-emerald-800',
    defaultIcon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  warning: {
    container: 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-2xs',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-950',
    bodyColor: 'text-amber-800',
    defaultIcon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  error: {
    container: 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-2xs',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-950',
    bodyColor: 'text-rose-800',
    defaultIcon: <AlertCircle className="w-5 h-5 text-rose-600" />,
    badgeBg: 'bg-rose-100 text-rose-800',
  },
  info: {
    container: 'bg-sky-50/90 border-sky-200 text-sky-950 shadow-2xs',
    iconColor: 'text-sky-600',
    titleColor: 'text-sky-950',
    bodyColor: 'text-sky-800',
    defaultIcon: <Info className="w-5 h-5 text-[#0066CC]" />,
    badgeBg: 'bg-sky-100 text-sky-800',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  title,
  children,
  onClose,
  className = '',
  icon,
  action,
}) => {
  const current = variantStyles[variant] || variantStyles.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="alert"
      className={`relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${current.container} ${className}`}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        {icon ?? current.defaultIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`text-sm font-bold tracking-tight mb-0.5 ${current.titleColor}`}>
            {title}
          </h4>
        )}
        {children && (
          <div className={`text-xs sm:text-sm font-medium leading-relaxed ${current.bodyColor}`}>
            {children}
          </div>
        )}
        {action && (
          <div className="mt-2.5 flex items-center gap-2">
            {action}
          </div>
        )}
      </div>

      {/* Optional Dismiss Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดการแจ้งเตือน"
          className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-black/5 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};
