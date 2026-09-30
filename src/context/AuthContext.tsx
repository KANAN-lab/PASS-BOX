import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSpv: boolean;
  canManageMasterData: boolean;
  showIdleWarning: boolean;
  idleRemainingSeconds: number;
  extendSession: () => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_LOCAL_USERS: Record<string, { profile: UserProfile; pass: string }> = {
  cheker1: {
    profile: {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'cheker1',
      full_name: 'Cheker 1',
      role: 'checker',
      is_active: true,
    },
    pass: 'checker123',
  },
  spv: {
    profile: {
      id: '33333333-3333-3333-3333-333333333333',
      username: 'spv',
      full_name: 'Supervisor',
      role: 'spv',
      is_active: true,
    },
    pass: 'spv123',
  },
  admin: {
    profile: {
      id: '22222222-2222-2222-2222-222222222222',
      username: 'admin',
      full_name: 'Admin',
      role: 'admin',
      is_active: true,
    },
    pass: 'admin123',
  },
};

// Konfigurasi Durasi Sesi & Idle Inactivity
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Menit batas waktu idle
const WARNING_WINDOW_MS = 2 * 60 * 1000; // 2 Menit countdown sebelum logout otomatis

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pass_box_current_user');
    const lastActiveStr = localStorage.getItem('pass_box_last_active');

    if (saved) {
      if (lastActiveStr) {
        const elapsed = Date.now() - Number(lastActiveStr);
        if (elapsed >= IDLE_TIMEOUT_MS) {
          localStorage.removeItem('pass_box_current_user');
          localStorage.removeItem('pass_box_last_active');
          localStorage.setItem(
            'pass_box_session_notice',
            'Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 15 menit. Silakan login kembali.'
          );
          return null;
        }
      }
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);
  const [idleRemainingSeconds, setIdleRemainingSeconds] = useState<number>(120);

  // Verifikasi dan sinkronisasi data profil dari Supabase
  const syncProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return;

      if (!data.is_active) {
        setUser(null);
        localStorage.removeItem('pass_box_current_user');
        localStorage.removeItem('pass_box_last_active');
        return;
      }

      setUser(data);
      localStorage.setItem('pass_box_current_user', JSON.stringify(data));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const checkActiveUser = async () => {
      setLoading(true);
      const saved = localStorage.getItem('pass_box_current_user');
      const lastActiveStr = localStorage.getItem('pass_box_last_active');

      if (saved) {
        if (lastActiveStr) {
          const elapsed = Date.now() - Number(lastActiveStr);
          if (elapsed >= IDLE_TIMEOUT_MS) {
            localStorage.removeItem('pass_box_current_user');
            localStorage.removeItem('pass_box_last_active');
            localStorage.setItem(
              'pass_box_session_notice',
              'Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 15 menit. Silakan login kembali.'
            );
            setUser(null);
            setLoading(false);
            return;
          }
        }

        try {
          const parsed = JSON.parse(saved);
          if (parsed?.id) {
            await syncProfile(parsed.id);
          }
        } catch {
          // Ignore
        }
      }
      setLoading(false);
    };

    checkActiveUser();
  }, []);

  // Manajemen Sesi Akun: Auto-logout jika idle >= 15 menit & Warning Modal pada 2 menit terakhir
  useEffect(() => {
    if (!user) {
      setShowIdleWarning(false);
      return;
    }

    if (!localStorage.getItem('pass_box_last_active')) {
      localStorage.setItem('pass_box_last_active', String(Date.now()));
    }

    let lastRecord = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle update agar tidak membebani performa
      if (now - lastRecord > 1500) {
        lastRecord = now;
        localStorage.setItem('pass_box_last_active', String(now));
        setShowIdleWarning(prev => (prev ? false : prev));
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    // Sinkronisasi antar-tab browser via StorageEvent
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pass_box_last_active' && e.newValue) {
        setShowIdleWarning(false);
      }
      if (e.key === 'pass_box_current_user' && !e.newValue) {
        setUser(null);
        setShowIdleWarning(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Timer pengecekan inaktivitas per 1 detik
    const timer = setInterval(() => {
      const lastActiveStr = localStorage.getItem('pass_box_last_active');
      const lastActive = lastActiveStr ? Number(lastActiveStr) : Date.now();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        // Batas 15 menit tercapai -> logout otomatis & simpan notifikasi
        localStorage.setItem(
          'pass_box_session_notice',
          'Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 15 menit. Silakan login kembali.'
        );
        setShowIdleWarning(false);
        setUser(null);
        localStorage.removeItem('pass_box_current_user');
        localStorage.removeItem('pass_box_last_active');
      } else if (elapsed >= IDLE_TIMEOUT_MS - WARNING_WINDOW_MS) {
        // 2 menit terakhir (menit 13-15): Aktifkan modal peringatan dengan countdown
        const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setIdleRemainingSeconds(remaining);
        setShowIdleWarning(true);
      } else {
        setShowIdleWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleActivity));
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(timer);
    };
  }, [user]);

  // Perpanjang sesi aktif (tombol Tetap Masuk)
  const extendSession = () => {
    const now = Date.now();
    localStorage.setItem('pass_box_last_active', String(now));
    setShowIdleWarning(false);
    setIdleRemainingSeconds(120);
  };

  // Login handler
  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    try {
      // 1. Coba verifikasi dengan PostgreSQL RPC di Supabase
      const { data, error } = await supabase.rpc('verify_user_login', {
        p_username: u,
        p_password: p,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        const loggedUser: UserProfile = data[0];
        setUser(loggedUser);
        localStorage.setItem('pass_box_current_user', JSON.stringify(loggedUser));
        localStorage.setItem('pass_box_last_active', String(Date.now()));
        localStorage.removeItem('pass_box_session_notice');
        setShowIdleWarning(false);
        setLoading(false);
        return { success: true };
      }

      // Deteksi jika fungsi RPC belum ada / 404 di PostgREST Supabase
      const isRpcMissing = error && (
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        error.message?.toLowerCase().includes('not find') ||
        error.message?.toLowerCase().includes('does not exist') ||
        String(error?.details || '').toLowerCase().includes('schema cache') ||
        String(error?.message || '').includes('404') ||
        (error as any)?.status === 404
      );

      // 2. Cek status akun di tabel profiles untuk memberikan informasi diagnosa yang akurat ke user
      try {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id, username, full_name, role, is_active, password_hash')
          .ilike('username', u)
          .maybeSingle();

        if (profileCheck) {
          // Kasus A: Akun ditemukan tetapi password_hash masih 'pending'
          if (profileCheck.password_hash === 'pending') {
            setLoading(false);
            return {
              success: false,
              error: `Akun "${profileCheck.username}" ditemukan, tetapi password masih berstatus PENDING (belum diaktifkan oleh sistem). Minta Administrator mereset password akun ini di menu Pengguna.`
            };
          }

          // Kasus B: Akun berstatus non-aktif
          if (!profileCheck.is_active) {
            setLoading(false);
            return {
              success: false,
              error: `Akun "${profileCheck.username}" saat ini berstatus NON-AKTIF. Silakan hubungi Administrator untuk mengaktifkannya kembali.`
            };
          }

          // Kasus C: Akun aktif & ada di database, tetapi RPC verify_user_login 404
          if (isRpcMissing) {
            setLoading(false);
            return {
              success: false,
              error: `Fungsi database "verify_user_login" belum diaktifkan di Supabase (Error 404). Akun "${profileCheck.username}" ada di database, namun RPC login belum dibuat di Supabase SQL Editor.`
            };
          }
        }
      } catch {
        // Lanjutkan jika pengecekan profil terkendala
      }

      // 3. Fallback akun lokal default (admin123 / spv123 / checker123)
      const localMatch = DEFAULT_LOCAL_USERS[u];
      if (localMatch && localMatch.pass === p) {
        setUser(localMatch.profile);
        localStorage.setItem('pass_box_current_user', JSON.stringify(localMatch.profile));
        localStorage.setItem('pass_box_last_active', String(Date.now()));
        localStorage.removeItem('pass_box_session_notice');
        setShowIdleWarning(false);
        setLoading(false);
        return { success: true };
      }

      // 4. Jika RPC missing dan bukan akun default
      if (isRpcMissing) {
        setLoading(false);
        return {
          success: false,
          error: `Error Supabase (404): Fungsi "verify_user_login" tidak ditemukan di database. Buka Supabase SQL Editor dan jalankan file "supabase_setup.sql" atau patch RPC.`
        };
      }

      // 5. Jika ada error spesifik lain dari Supabase
      if (error) {
        setLoading(false);
        return {
          success: false,
          error: `Gagal verifikasi dari server Supabase: ${error.message || 'Terjadi kesalahan sistem'}`
        };
      }

      setLoading(false);
      return { success: false, error: 'Username atau password yang Anda masukkan salah.' };
    } catch (err: any) {
      // Fallback lokal jika ada gangguan koneksi
      const localMatch = DEFAULT_LOCAL_USERS[u];
      if (localMatch && localMatch.pass === p) {
        setUser(localMatch.profile);
        localStorage.setItem('pass_box_current_user', JSON.stringify(localMatch.profile));
        localStorage.setItem('pass_box_last_active', String(Date.now()));
        localStorage.removeItem('pass_box_session_notice');
        setShowIdleWarning(false);
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: err.message || 'Gagal melakukan verifikasi akun ke server.' };
    }
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    setShowIdleWarning(false);
    localStorage.removeItem('pass_box_current_user');
    localStorage.removeItem('pass_box_last_active');
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await syncProfile(user.id);
    }
  };

  const isAdmin = user?.role === 'admin' && user?.is_active === true;
  const isSpv = user?.role === 'spv' && user?.is_active === true;
  // Otoritas mengubah master data secara eksklusif hanya dimiliki oleh Administrator
  const canManageMasterData = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isSpv,
        canManageMasterData,
        showIdleWarning,
        idleRemainingSeconds,
        extendSession,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
