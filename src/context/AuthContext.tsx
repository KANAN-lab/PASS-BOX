import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pass_box_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

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
      if (saved) {
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
        setLoading(false);
        return { success: true };
      }

      // 2. Fallback akun lokal default jika offline / RPC belum dijalankan
      const localMatch = DEFAULT_LOCAL_USERS[u];
      if (localMatch && localMatch.pass === p) {
        setUser(localMatch.profile);
        localStorage.setItem('pass_box_current_user', JSON.stringify(localMatch.profile));
        setLoading(false);
        return { success: true };
      }

      // 3. Jika RPC 404 / tidak ditemukan di Supabase
      if (error && (error.code === 'PGRST202' || error.message?.includes('not find') || String(error).includes('404'))) {
        setLoading(false);
        return { 
          success: false, 
          error: 'Fungsi database "verify_user_login" belum diaktifkan di Supabase (404). Silakan salin & jalankan seluruh isi file "supabase_setup.sql" di Supabase SQL Editor.' 
        };
      }

      setLoading(false);
      return { success: false, error: 'Username atau password salah.' };
    } catch (err: any) {
      // Fallback lokal jika ada gangguan koneksi
      const localMatch = DEFAULT_LOCAL_USERS[u];
      if (localMatch && localMatch.pass === p) {
        setUser(localMatch.profile);
        localStorage.setItem('pass_box_current_user', JSON.stringify(localMatch.profile));
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: err.message || 'Gagal melakukan verifikasi akun.' };
    }
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem('pass_box_current_user');
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await syncProfile(user.id);
    }
  };

  const isAdmin = user?.role === 'admin' && user?.is_active === true;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, refreshProfile }}>
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
