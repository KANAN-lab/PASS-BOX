import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DataTab } from './components/DataTab';
import { RekapTab } from './components/RekapTab';
import { PenggunaTab } from './components/PenggunaTab';
import { LoginView } from './components/LoginView';

const MainLayout: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'data' | 'rekap' | 'pengguna'>('data');

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col text-slate-800">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-12">
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'rekap' && isAdmin && <RekapTab />}
        {activeTab === 'pengguna' && isAdmin && <PenggunaTab />}
      </main>
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
