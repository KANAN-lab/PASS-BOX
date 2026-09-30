import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  KeyRound,
  Lock,
  X
} from 'lucide-react';

export const PenggunaTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add User Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('checker');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('passbox123');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Action status
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Gagal memuat pengguna dari Supabase:', error.message);
      } else if (data) {
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. Ubah Role Pengguna Menggunakan Secure Database RPC
  const handleChangeRole = async (targetUserId: string, targetName: string, newRole: UserRole) => {
    if (targetUserId === currentUser?.id) {
      alert('Anda tidak dapat mengubah role akun Anda sendiri.');
      return;
    }

    const confirmMsg = `Ubah role "${targetName}" menjadi ${newRole.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(targetUserId);
    try {
      const { error } = await supabase.rpc('change_user_role', {
        admin_user_id: currentUser?.id,
        target_user_id: targetUserId,
        new_role: newRole,
      });

      if (error) {
        const { error: directErr } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', targetUserId);

        if (directErr) throw directErr;
      }

      setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
      setSuccessMsg(`Role ${targetName} berhasil diubah menjadi ${newRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Gagal mengubah role: ' + (err.message || 'Izin ditolak'));
    } finally {
      setUpdatingId(null);
    }
  };

  // 2. Toggle Status Aktif/Nonaktif
  const handleToggleStatus = async (targetUserId: string, currentStatus: boolean, targetName: string) => {
    if (targetUserId === currentUser?.id) {
      alert('Anda tidak dapat menonaktifkan akun Anda sendiri.');
      return;
    }

    const newStatus = !currentStatus;
    const actionText = newStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!window.confirm(`Apakah Anda yakin ingin ${actionText} akun "${targetName}"?`)) return;

    setUpdatingId(targetUserId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (error) throw error;

      setUsers(users.map(u => u.id === targetUserId ? { ...u, is_active: newStatus } : u));
      setSuccessMsg(`Status akun ${targetName} berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Gagal mengubah status: ' + (err.message || 'Izin ditolak'));
    } finally {
      setUpdatingId(null);
    }
  };

  // 3. Admin Reset Password Pengguna Lain
  const handleOpenResetModal = (user: UserProfile) => {
    setResetModalUser(user);
    setNewPassword('passbox123');
    setResetError('');
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    if (!newPassword || newPassword.trim().length < 6) {
      setResetError('Password minimal harus 6 karakter.');
      return;
    }

    setResetting(true);
    setResetError('');

    try {
      // Prioritaskan RPC admin_reset_user_password
      const { error } = await supabase.rpc('admin_reset_user_password', {
        admin_user_id: currentUser?.id,
        target_user_id: resetModalUser.id,
        new_password: newPassword.trim(),
      });

      if (error) {
        // Fallback ke change_user_password
        const { error: fallbackErr } = await supabase.rpc('change_user_password', {
          target_user_id: resetModalUser.id,
          new_password: newPassword.trim(),
        });
        if (fallbackErr) throw fallbackErr;
      }

      setSuccessMsg(`Password akun "${resetModalUser.full_name}" (@${resetModalUser.username}) berhasil direset.`);
      setResetModalUser(null);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset password pengguna.');
    } finally {
      setResetting(false);
    }
  };

  // 4. Tambah Pengguna Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) return;

    if (password && password.length < 6) {
      setErrorMsg('Password minimal harus 6 karakter.');
      return;
    }

    setCreating(true);
    setErrorMsg('');

    try {
      const cleanUsername = username.trim().toLowerCase();
      const passToUse = password.trim() || 'passbox123';
      const newId: string = crypto.randomUUID();

      const newProfile: UserProfile = {
        id: newId,
        username: cleanUsername,
        full_name: fullName.trim(),
        role,
        is_active: true,
      };

      const { error: profileErr } = await supabase
        .from('profiles')
        .insert([{
          ...newProfile,
          password_hash: 'pending'
        }]);

      if (profileErr && !profileErr.message.includes('password_hash')) {
        throw profileErr;
      }

      await supabase.rpc('change_user_password', {
        target_user_id: newId,
        new_password: passToUse,
      });

      setUsers([...users, newProfile]);
      setShowAddModal(false);
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('checker');
      setSuccessMsg(`Pengguna "${cleanUsername}" berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan pengguna');
    } finally {
      setCreating(false);
    }
  };

  // Filtered users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            <span>Manajemen Pengguna & Otorisasi</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Administrator dapat mengelola akun, mengatur otorisasi role, dan mereset password pengguna.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            title="Segarkan daftar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, username, atau role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 h-10 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* 1. Mobile Cards List (block md:hidden) */}
        <div className="block md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
              {loading ? 'Memuat data pengguna...' : 'Tidak ada data pengguna.'}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              const isProcessing = updatingId === u.id;

              return (
                <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
                  {/* Top: Name, Status & You Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                        <span>{u.full_name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">
                            (Anda)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">@{u.username}</span>
                    </div>

                    <span
                      className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </span>
                  </div>

                  {/* Role Selector */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-2 rounded-lg text-xs">
                    <span className="font-medium text-slate-600">Role Otorisasi:</span>
                    {isCurrent ? (
                      <span className="font-bold text-emerald-700 uppercase flex items-center">
                        <Shield className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        {u.role} (Terkunci)
                      </span>
                    ) : (
                      <select
                        disabled={isProcessing}
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, u.full_name, e.target.value as UserRole)}
                        className={`font-bold px-2 py-1 rounded-md border focus:outline-none transition ${
                          u.role === 'admin'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-sky-50 border-sky-200 text-sky-700'
                        }`}
                      >
                        <option value="checker">CHECKER</option>
                        <option value="admin">ADMINISTRATOR</option>
                      </select>
                    )}
                  </div>

                  {/* Action Buttons: Reset Password & Status Toggle */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenResetModal(u)}
                      className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
                      title="Reset password pengguna"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Reset Pass</span>
                    </button>

                    {!isCurrent ? (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleToggleStatus(u.id, u.is_active, u.full_name)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition disabled:opacity-50 text-center ${
                          u.is_active
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {isProcessing ? 'Proses...' : u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-slate-200/60 font-medium">
                        Akun Aktif
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Users Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">NAMA LENGKAP</th>
                <th className="py-3 px-4">USERNAME</th>
                <th className="py-3 px-4">ROLE (OTORISASI)</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-center w-56">AKSI AKUN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {loading ? 'Memuat data pengguna...' : 'Tidak ada data pengguna.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isProcessing = updatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                          <span>{u.full_name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold border border-sky-200">
                              (Anda)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono">
                        @{u.username}
                      </td>

                      <td className="py-3 px-4">
                        {isCurrent ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Shield className="w-3 h-3 mr-1 text-emerald-600" />
                            {u.role} (Terkunci)
                          </span>
                        ) : (
                          <select
                            disabled={isProcessing}
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, u.full_name, e.target.value as UserRole)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none transition ${
                              u.role === 'admin'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-sky-50 border-sky-200 text-sky-700'
                            } disabled:opacity-50 cursor-pointer`}
                          >
                            <option value="checker">CHECKER</option>
                            <option value="admin">ADMINISTRATOR</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 text-xs font-medium ${
                            u.is_active ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => handleOpenResetModal(u)}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
                            title="Reset password pengguna ini"
                          >
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Reset Pass</span>
                          </button>

                          {/* Toggle Status Button */}
                          {!isCurrent ? (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleToggleStatus(u.id, u.is_active, u.full_name)}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition disabled:opacity-50 ${
                                u.is_active
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {isProcessing ? '...' : u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] px-2">Akun Aktif</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Reset Password Pengguna</h3>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="p-6 space-y-4">
              {resetError && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-start space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* User Target Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="text-slate-500 font-medium">Pengguna yang direset:</div>
                <div className="font-extrabold text-slate-900 text-sm">{resetModalUser.full_name}</div>
                <div className="text-slate-600 font-mono text-[11px]">@{resetModalUser.username} · Role: {resetModalUser.role.toUpperCase()}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                  Password Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Minimal 6 karakter..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>Minimal 6 karakter</span>
                  <button
                    type="button"
                    onClick={() => setNewPassword('passbox' + Math.floor(100 + Math.random() * 900))}
                    className="text-sky-600 hover:text-sky-800 underline font-medium"
                  >
                    Generate Otomatis
                  </button>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-start space-x-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Password lama akan langsung ditimpa secara aman dengan enkripsi Bcrypt. Harap infokan password baru ini ke pengguna.</span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {resetting ? 'Mereset...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Tambah Pengguna Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-start space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: budi1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                  Role Otorisasi
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  <option value="checker">Checker (Hanya Input & Lihat Data)</option>
                  <option value="admin">Administrator (Full Access + Rekap & Manajemen Pengguna)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                  Password Akun
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter (default: passbox123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
                >
                  {creating ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
