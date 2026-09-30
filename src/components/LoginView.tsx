import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Box, Lock, User, ArrowRight, AlertCircle, Info } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');

    const res = await login(username.trim(), password);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal. Silakan periksa kembali akun Anda.');
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100 animate-fadeIn">
        {/* App Logo & Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Box className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pass Box Log</h1>
          <p className="text-xs text-slate-500 mt-1">Sistem Otentikasi dan Monitoring Pass Box RMPM</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
              Username atau Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: cheker1 atau admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold py-2.5 rounded-xl shadow-md transition disabled:opacity-50 text-sm"
          >
            <span>{loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Information Box: Default Credentials */}
        <div className="mt-8 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              <span>Akun Default Sistem:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickFill('cheker1', 'checker123')}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-sky-400 text-left transition hover:shadow-sm"
              >
                <div className="font-bold text-slate-800">Checker</div>
                <div className="text-slate-500">user: <code className="text-sky-700">cheker1</code></div>
                <div className="text-slate-500">pass: <code className="text-sky-700">checker123</code></div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-left transition hover:shadow-sm"
              >
                <div className="font-bold text-indigo-800">Administrator</div>
                <div className="text-slate-500">user: <code className="text-indigo-700">admin</code></div>
                <div className="text-slate-500">pass: <code className="text-indigo-700">admin123</code></div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Klik kotak di atas untuk mengisi form login otomatis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
