import React from 'react';
import { Clock, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-amber-200 overflow-hidden animate-scaleUp">
        {/* Header Bar */}
        <div className="bg-amber-500 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">Peringatan Sesi Berakhir</h3>
              <p className="text-[11px] text-amber-100 font-medium">Deteksi Inaktivitas Pengguna</p>
            </div>
          </div>
          <span className="text-xs bg-amber-600/60 px-2 py-0.5 rounded font-mono font-bold border border-amber-400/40">
            Idle 15 Menit
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-slate-800">
              Apakah Anda masih menggunakan sistem?
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Tidak ada aktivitas terdeteksi selama lebih dari 13 menit. Demi perlindungan data operasional Pass Box, akun akan logout otomatis dalam:
            </p>
          </div>

          {/* Countdown Clock Display */}
          <div className="inline-flex items-center space-x-2 bg-slate-900 text-amber-400 font-mono text-2xl font-black px-5 py-2.5 rounded-xl border border-slate-800 shadow-md">
            <Clock className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{timeFormatted}</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Klik <strong>Tetap Masuk</strong> atau gerakkan kursor untuk memperpanjang sesi aktif Anda.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onLogout}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Keluar Sekarang</span>
            </button>

            <button
              onClick={onExtend}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs shadow-md transition"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Tetap Masuk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
