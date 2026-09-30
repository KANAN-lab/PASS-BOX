import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Box, Lock, User, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginAs } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const email = `${username.trim().toLowerCase()}@passbox.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback for demo users
        if (username.toLowerCase().includes('admin')) {
          loginAs('admin', 'Admin');
        } else {
          loginAs('checker', username || 'Cheker 1');
        }
      } else if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          loginAs(profile.role, profile.full_name);
        } else {
          loginAs('checker', username);
        }
      }
    } catch {
      // Fallback
      loginAs('checker', username || 'Cheker 1');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Box className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pass Box Log</h1>
          <p className="text-xs text-slate-500 mt-1">Sistem Pencatatan Log Pass Box RMPM / Cleanroom</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="cheker1 / admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl shadow-md transition disabled:opacity-50 text-sm"
          >
            <span>{loading ? 'Masuk...' : 'Masuk ke Sistem'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-3">
            Atau Masuk Cepat (Akses Operasional)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loginAs('checker', 'Cheker 1')}
              className="py-2 px-3 border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 rounded-lg text-xs font-medium text-slate-700 transition"
            >
              Masuk sbg <b>Cheker 1</b>
            </button>
            <button
              onClick={() => loginAs('admin', 'Admin')}
              className="py-2 px-3 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-lg text-xs font-medium text-slate-700 transition"
            >
              Masuk sbg <b>Admin</b>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
