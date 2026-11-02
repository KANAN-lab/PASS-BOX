import React, { useState, useMemo, useEffect } from 'react';
import type { PassBoxLog } from '../types';
import { 
  exportLogsToExcel, 
  SHIFT_OPTIONS, 
  type ShiftType,
  getLogShift
} from '../utils/excel';
import { showToast } from '../utils/swal';
import { 
  X, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Sun,
  Sunset,
  Moon,
  Layers
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PassBoxLog[];
  filenamePrefix?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  logs,
  filenamePrefix = 'Laporan_Pass_Box_Diamond',
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>('all');

  // Reset pilihan ke 'all' saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSelectedShift('all');
    }
  }, [isOpen]);

  // Dukungan tombol Escape untuk menutup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Hitung jumlah data untuk masing-masing shift secara real-time
  const counts = useMemo(() => {
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;

    logs.forEach((log) => {
      const s = getLogShift(log.created_at);
      if (s === 'shift1') s1++;
      else if (s === 'shift2') s2++;
      else if (s === 'shift3') s3++;
    });

    return {
      all: logs.length,
      shift1: s1,
      shift2: s2,
      shift3: s3,
    };
  }, [logs]);

  if (!isOpen) return null;

  const currentCount = counts[selectedShift];

  const handleExport = () => {
    exportLogsToExcel(logs, filenamePrefix, selectedShift);
    showToast(
      `File Excel ${SHIFT_OPTIONS[selectedShift].label} berhasil diunduh (${currentCount} baris)`,
      'success'
    );
    onClose();
  };

  const shiftList: {
    id: ShiftType;
    label: string;
    hours: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'all',
      label: 'Semua Shift',
      hours: '24 Jam Penuh',
      desc: 'Mencakup seluruh waktu dan shift operasional',
      icon: <Layers className="w-4 h-4 text-slate-600" />,
    },
    {
      id: 'shift1',
      label: 'Shift 1',
      hours: '07.00 - 15.00 WIB',
      desc: 'Operasional Pagi (07.00 - 15.00)',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'shift2',
      label: 'Shift 2',
      hours: '15.00 - 23.00 WIB',
      desc: 'Operasional Sore (15.00 - 23.00)',
      icon: <Sunset className="w-4 h-4 text-orange-500" />,
    },
    {
      id: 'shift3',
      label: 'Shift 3',
      hours: '23.00 - 07.00 WIB',
      desc: 'Operasional Malam (23.00 - 07.00)',
      icon: <Moon className="w-4 h-4 text-indigo-500" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transition-all transform animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base font-bold text-slate-800">
                Ekspor ke Excel
              </h3>
              <p className="text-xs text-slate-500">
                Pilih filter shift kerja untuk dokumen Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider">
            Pilih Shift Data:
          </label>

          <div className="space-y-2">
            {shiftList.map((item) => {
              const isSelected = selectedShift === item.id;
              const count = counts[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedShift(item.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition text-left select-none ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setSelectedShift(item.id);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-slate-400">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-800">
                          {item.label}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          {item.icon}
                          {item.hours}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-2 shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : count > 0
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {count} Data
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {currentCount === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Tidak ada data pada <strong>{SHIFT_OPTIONS[selectedShift].label}</strong> pada filter saat ini.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Format: Excel (.xlsx)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel ({currentCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ExportModal;

