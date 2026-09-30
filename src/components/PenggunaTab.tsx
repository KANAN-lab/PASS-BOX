import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';
import { Users, UserPlus, Shield, CheckCircle2, XCircle } from 'lucide-react';

export const PenggunaTab: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Add User Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('checker');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback default users
        const local = localStorage.getItem('local_pass_box_users');
        if (local) {
          setUsers(JSON.parse(local));
        } else {
          const defaultList: UserProfile[] = [
            { id: '11111111-1111-1111-1111-111111111111', username: 'cheker1', full_name: 'Cheker 1', role: 'checker', is_active: true },
            { id: '22222222-2222-2222-2222-222222222222', username: 'admin', full_name: 'Admin', role: 'admin', is_active: true },
          ];
          setUsers(defaultList);
          localStorage.setItem('local_pass_box_users', JSON.stringify(defaultList));
        }
      } else {
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) return;

    setCreating(true);
    setErrorMsg('');

    try {
      // 1. Coba registrasi via Supabase Auth jika password disediakan
      let newId: string = crypto.randomUUID();
      if (password) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: `${username.trim().toLowerCase()}@passbox.local`,
          password,
          options: {
            data: {
              username: username.trim(),
              full_name: fullName.trim(),
              role,
            }
          }
        });

        if (authErr && !authErr.message.includes('already registered')) {
          console.warn('Supabase Auth error:', authErr.message);
        } else if (authData?.user) {
          newId = authData.user.id;
        }
      }

      // 2. Simpan profil
      const newProfile: UserProfile = {
        id: newId,
        username: username.trim(),
        full_name: fullName.trim(),
        role,
        is_active: true,
      };

      const { error: profileErr } = await supabase
        .from('profiles')
        .insert([newProfile]);

      if (profileErr) {
        // Fallback local persistence
        const updated = [...users, newProfile];
        setUsers(updated);
        localStorage.setItem('local_pass_box_users', JSON.stringify(updated));
      } else {
        setUsers([...users, newProfile]);
      }

      setShowAddModal(false);
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('checker');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan pengguna');
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', id);

      const updated = users.map(u => u.id === id ? { ...u, is_active: newStatus } : u);
      setUsers(updated);
      localStorage.setItem('local_pass_box_users', JSON.stringify(updated));
    } catch (err: any) {
      alert('Gagal merubah status: ' + err.message);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Kelola akun Checker dan Administrator untuk akses sistem Pass Box Log.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">NAMA LENGKAP</th>
                <th className="py-3 px-4">USERNAME</th>
                <th className="py-3 px-4">ROLE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {loading ? 'Memuat data pengguna...' : 'Belum ada data pengguna.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {u.full_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono">
                    @{u.username}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        u.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {u.role === 'admin' && <Shield className="w-2.5 h-2.5 mr-1" />}
                      {u.role}
                    </span>
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
                    <button
                      onClick={() => toggleUserStatus(u.id, u.is_active)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${
                        u.is_active
                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-800">Tambah Pengguna Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cheker 2 / Ahmad"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: cheker2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  <option value="checker">Checker (Hanya Input & Lihat Data)</option>
                  <option value="admin">Administrator (Full Access + Rekap & Pengguna)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Password (Opsional)
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
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
