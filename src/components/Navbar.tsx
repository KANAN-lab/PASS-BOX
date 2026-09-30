import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart2, Users, LogOut, Database, ShieldCheck, User } from 'lucide-react';

interface NavbarProps {
  activeTab: 'data' | 'rekap' | 'pengguna';
  setActiveTab: (tab: 'data' | 'rekap' | 'pengguna') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="bg-[#0f172a] text-white shadow-md select-none sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Brand + Nav tabs */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center p-1 shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
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

        {/* Right: Verified User Profile & Logout */}
        <div className="flex items-center space-x-4">
          {/* User Profile Info (Read-only, secured by Supabase Auth) */}
          <div className="flex items-center space-x-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              {isAdmin ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <User className="w-4 h-4 text-sky-400" />}
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-white leading-tight">
                {user?.full_name || user?.username || 'Pengguna'}
              </div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                <span className={isAdmin ? 'text-emerald-400' : 'text-sky-400'}>
                  {user?.role || 'CHECKER'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/80" />

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-rose-300 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700"
            title="Keluar dari sesi"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
