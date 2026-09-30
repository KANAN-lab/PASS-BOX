import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, className = '' }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-w-[140px] text-left transition hover:shadow ${className}`}>
      <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900 tracking-tight">
        {value}
      </div>
    </div>
  );
};
