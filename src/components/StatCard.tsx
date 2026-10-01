import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
  accentColor?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  className = '', 
  accentColor = 'bg-sky-500',
  badge 
}) => {
  return (
    <div className={`bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs text-left transition-all hover:shadow-xs hover:border-slate-300 relative overflow-hidden flex flex-col justify-between ${className}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase truncate">
          {label}
        </span>
        {badge && (
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            {badge}
          </span>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
        {value}
      </div>
    </div>
  );
};
