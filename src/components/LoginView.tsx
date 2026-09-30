import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, AlertCircle, Clock } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionNotice, setSessionNotice] = useState<string>(() => {
    const notice = localStorage.getItem('pass_box_session_notice');
    if (notice) {
      localStorage.removeItem('pass_box_session_notice');
      return notice;
    }
    return '';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');
    setSessionNotice('');

    const res = await login(username.trim(), password);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal. Silakan periksa kembali akun Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100 animate-fadeIn">
        {/* App Logo & Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm p-2">
            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pass Box Log</h1>
          <p className="text-xs text-slate-500 mt-1">Sistem Otentikasi dan Monitoring Pass Box RMPM</p>
        </div>

        {/* Session Timeout Notice Alert */}
        {sessionNotice && !errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-300 flex items-start space-x-2.5 shadow-sm leading-relaxed animate-fadeIn">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-amber-950 block mb-0.5">Sesi Berakhir Otomatis:</span>
              <span className="text-amber-800 font-medium block">{sessionNotice}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-start space-x-2.5 shadow-sm leading-relaxed animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-rose-900 block mb-0.5">Informasi Login:</span>
              <span className="text-rose-700 font-medium block whitespace-pre-line">{errorMsg}</span>
            </div>
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
                placeholder="Masukkan username atau email..."
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

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Akses sistem dilindungi otorisasi terenkripsi. Hubungi Administrator jika lupa password.
          </p>
        </div>
      </div>
    </div>
  );
};
