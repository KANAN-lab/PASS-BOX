import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, className = '', accentColor = 'bg-sky-500' }) => {
  return (
    <div className={`bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-sm text-left transition hover:border-slate-300 relative overflow-hidden ${className}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />
      <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase truncate">
        {label}
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
        {value}
      </div>
    </div>
  );
};
