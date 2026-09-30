import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

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

  // Fungsi untuk memuat profil terbaru dari database
  const loadProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.warn('Gagal membaca profil dari Supabase:', error?.message);
        return null;
      }

      // Jika akun tidak aktif, tolak akses
      if (!data.is_active) {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('pass_box_current_user');
        return null;
      }

      setUser(data);
      localStorage.setItem('pass_box_current_user', JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // 1. Cek sesi aktif awal
    const initAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          // Jika tidak ada session auth aktif, hapus state
          setUser(null);
          localStorage.removeItem('pass_box_current_user');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Pasang Listener Perubahan Auth Supabase Realtime
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('pass_box_current_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login dengan username atau email & password
  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const cleanedInput = usernameOrEmail.trim();
      const email = cleanedInput.includes('@')
        ? cleanedInput
        : `${cleanedInput.toLowerCase()}@passbox.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: 'Username atau password salah: ' + error.message };
      }

      if (data.user) {
        const profile = await loadProfile(data.user.id);
        if (!profile) {
          return { success: false, error: 'Profil akun tidak ditemukan atau akun telah dinonaktifkan oleh Administrator.' };
        }
        return { success: true };
      }

      return { success: false, error: 'Gagal melakukan otorisasi login.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan sistem saat login.' };
    } finally {
      setLoading(false);
    }
  };

  // Logout sesi
  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    } finally {
      setUser(null);
      localStorage.removeItem('pass_box_current_user');
      setLoading(false);
    }
  };

  // Refresh profil saat role diubah oleh admin
  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id);
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
