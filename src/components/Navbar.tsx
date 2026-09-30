import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Box, BarChart2, Users, LogOut, Database, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'data' | 'rekap' | 'pengguna';
  setActiveTab: (tab: 'data' | 'rekap' | 'pengguna') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, logout, switchUserRole } = useAuth();

  return (
    <header className="bg-[#0f172a] text-white shadow-md select-none sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Brand + Nav tabs */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-inner">
              <Box className="w-5 h-5 text-sky-400" />
            </div>
            <span className="font-bold text-lg tracking-wide text-white">Pass Box Log</span>
          </div>

          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                activeTab === 'data'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Data</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('rekap')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    activeTab === 'rekap'
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Rekap</span>
                </button>

                <button
                  onClick={() => setActiveTab('pengguna')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    activeTab === 'pengguna'
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Pengguna</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right: User Pill + Role Switcher Demo + Logout */}
        <div className="flex items-center space-x-4">
          {/* Quick role switcher for testing between Checker & Admin */}
          <div className="hidden sm:flex items-center bg-slate-800/70 border border-slate-700/60 rounded px-1.5 py-0.5 text-xs text-slate-300">
            <span className="mr-1.5 text-slate-400 text-[11px]">Role:</span>
            <button
              onClick={() => switchUserRole('checker')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition ${
                !isAdmin ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Checker
            </button>
            <button
              onClick={() => switchUserRole('admin')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition ml-1 ${
                isAdmin ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin
            </button>
          </div>

          {/* User Profile Pill */}
          <div className="text-right">
            <div className="text-sm font-semibold text-white leading-tight">
              {user?.full_name || 'Pengguna'}
            </div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-end space-x-1">
              {isAdmin && <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />}
              <span>{user?.role || 'CHECKER'}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/80" />

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center space-x-1.5 text-sm text-slate-300 hover:text-rose-300 transition-colors py-1 px-2 rounded hover:bg-slate-800"
            title="Keluar dari sesi"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-medium">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
