import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DataTab } from './components/DataTab';
import { RekapTab } from './components/RekapTab';
import { PenggunaTab } from './components/PenggunaTab';
import { LoginView } from './components/LoginView';

import { SessionTimeoutModal } from './components/SessionTimeoutModal';

const MainLayout: React.FC = () => {
  const { user, loading, isAdmin, isSpv, showIdleWarning, idleRemainingSeconds, extendSession, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'data' | 'rekap' | 'pengguna'>('data');

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        <div className="flex items-center space-x-2.5 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700/60 shadow-lg">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-300">Memverifikasi otorisasi akun...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col text-slate-800">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-12">
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'rekap' && (isAdmin || isSpv) && <RekapTab />}
        {activeTab === 'pengguna' && (isAdmin || isSpv) && <PenggunaTab />}
      </main>

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutModal
        isOpen={showIdleWarning}
        remainingSeconds={idleRemainingSeconds}
        onExtend={extendSession}
        onLogout={logout}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
