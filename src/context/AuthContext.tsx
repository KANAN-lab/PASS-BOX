import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginAs: (role: UserRole, name?: string) => void;
  logout: () => Promise<void>;
  switchUserRole: (role: UserRole) => void;
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  checker: {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'cheker1',
    full_name: 'Cheker 1',
    role: 'checker',
    is_active: true,
  },
  admin: {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'admin',
    full_name: 'Admin',
    role: 'admin',
    is_active: true,
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
        return DEFAULT_USERS.checker;
      }
    }
    return DEFAULT_USERS.checker; // Default login as Cheker 1 matching Screenshot 1
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check active Supabase session if any
    const checkSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
            localStorage.setItem('pass_box_current_user', JSON.stringify(profile));
          }
        }
      } catch {
        // Fallback to local user
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const loginAs = (role: UserRole, customName?: string) => {
    const base = DEFAULT_USERS[role];
    const newUser: UserProfile = {
      ...base,
      full_name: customName || base.full_name,
    };
    setUser(newUser);
    localStorage.setItem('pass_box_current_user', JSON.stringify(newUser));
  };

  const switchUserRole = (role: UserRole) => {
    loginAs(role);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setUser(null);
    localStorage.removeItem('pass_box_current_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, loginAs, logout, switchUserRole }}>
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
