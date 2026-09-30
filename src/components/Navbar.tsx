import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart2, Users, LogOut, Database, ShieldCheck, Shield, User } from 'lucide-react';

interface NavbarProps {
  activeTab: 'data' | 'rekap' | 'pengguna';
  setActiveTab: (tab: 'data' | 'rekap' | 'pengguna') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, isSpv, logout } = useAuth();

  const canAccessManagement = isAdmin || isSpv;

  return (
    <header className="bg-[#0f172a] text-white shadow-md select-none sticky top-0 z-40">
      {/* Top Navbar Row */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Desktop Tabs */}
        <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center p-1 shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-wide text-white whitespace-nowrap">
              Pass Box Log
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'data'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data</span>
            </button>

            {canAccessManagement && (
              <>
                <button
                  onClick={() => setActiveTab('rekap')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'rekap'
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Rekap</span>
                </button>

                <button
                  onClick={() => setActiveTab('pengguna')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'pengguna'
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Pengguna</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right Section: User Pill & Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* User Profile Pill */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-2 sm:px-2.5 py-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
              {isAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : isSpv ? (
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-sky-400" />
              )}
            </div>
            <div className="text-left sm:text-right leading-none max-w-[110px] sm:max-w-none truncate">
              <div className="text-[11px] sm:text-xs font-bold text-white truncate">
                {user?.full_name || user?.username || 'Pengguna'}
              </div>
              <div className="text-[9px] font-bold tracking-wider uppercase">
                <span
                  className={
                    isAdmin
                      ? 'text-emerald-400'
                      : isSpv
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }
                >
                  {user?.role === 'admin'
                    ? 'ADMINISTRATOR'
                    : user?.role === 'spv'
                    ? 'SPV / SUPERVISOR'
                    : 'CHECKER'}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-slate-300 hover:text-rose-300 transition-colors p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-800 border border-slate-700/50"
            title="Keluar dari sesi"
          >
            <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-400" />
            <span className="hidden sm:inline text-xs font-semibold">Keluar</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="flex md:hidden bg-[#0b1324] border-t border-slate-800/80 px-2 py-1.5 gap-1.5 justify-around shadow-inner">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'data'
              ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Data</span>
        </button>

        {canAccessManagement && (
          <>
            <button
              onClick={() => setActiveTab('rekap')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'rekap'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Rekap</span>
            </button>

            <button
              onClick={() => setActiveTab('pengguna')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'pengguna'
                  ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pengguna</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
