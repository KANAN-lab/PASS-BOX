import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, UserRole, PassBoxMaster } from '../types';
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
  X,
  Box,
  Plus,
  Trash2,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  downloadJSONBackup, 
  downloadExcelBackup, 
  parseBackupFile, 
  executeRestoreLogs, 
  type RestorePreview 
} from '../utils/backup';
import { showToast, showWarningAlert, showErrorAlert, showConfirmDialog } from '../utils/swal';

export const PenggunaTab: React.FC = () => {
  const { user: currentUser, isAdmin, isSpv, canManageMasterData } = useAuth();
  
  // Sub-tab: 'users' vs 'pass_boxes' vs 'backup'
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'pass_boxes' | 'backup'>('users');

  // Users state
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

  // Pass Box Master State
  const [passBoxes, setPassBoxes] = useState<PassBoxMaster[]>([
    { id: 1, name: 'Pass Box 1', is_active: true },
    { id: 2, name: 'Pass Box 2', is_active: true },
  ]);
  const [newPassBoxName, setNewPassBoxName] = useState('');
  const [savingPassBox, setSavingPassBox] = useState(false);

  // Action status
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Backup & Restore State
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatusText, setRestoreStatusText] = useState('');
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleDownloadJsonBackup = async () => {
    setDownloadingJson(true);
    try {
      const res = await downloadJSONBackup(currentUser?.full_name);
      if (res.success) {
        setSuccessMsg(`File backup JSON (${res.count} baris log) berhasil diunduh.`);
        showToast('Backup JSON berhasil diunduh!', 'success');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        showErrorAlert('Gagal Mengunduh Backup', res.error || 'Terjadi kesalahan sistem');
      }
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleDownloadExcelBackup = async () => {
    setDownloadingExcel(true);
    try {
      const res = await downloadExcelBackup();
      if (res.success) {
        setSuccessMsg(`File backup Excel (${res.count} baris log) berhasil diunduh.`);
        showToast('Backup Excel berhasil diunduh!', 'success');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        showErrorAlert('Gagal Mengunduh Backup Excel', res.error || 'Terjadi kesalahan sistem');
      }
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreResult(null);
    const preview = await parseBackupFile(file);
    setRestorePreview(preview);
    e.target.value = ''; // Reset input agar bisa pilih file yang sama jika perlu
  };

  const handleExecuteRestore = async () => {
    if (!restorePreview || !restorePreview.isValid) return;

    const confirmed = await showConfirmDialog(
      'Konfirmasi Pemulihan Data',
      `Sistem akan memasukkan <b>${restorePreview.logsCount} data transaksi</b> ke database Supabase.<br/><br/>Lanjutkan proses pemulihan?`,
      'Ya, Pulihkan Data',
      true
    );
    if (!confirmed) return;

    setRestoreLoading(true);
    setRestoreProgress(5);
    setRestoreStatusText('Memulai proses pemulihan data...');
    setRestoreResult(null);

    try {
      const result = await executeRestoreLogs(
        restorePreview.rawPayload.logs,
        restorePreview.rawPayload.pass_boxes,
        (progress, text) => {
          setRestoreProgress(progress);
          setRestoreStatusText(text);
        }
      );

      if (result.success) {
        setRestoreResult({
          success: true,
          message: `Berhasil memulihkan ${result.restoredCount} baris data log transaksi ke database Supabase!`,
        });
        setRestorePreview(null);
      } else {
        setRestoreResult({
          success: false,
          message: `Gagal memulihkan data: ${result.error || 'Terjadi kesalahan sistem'}`,
        });
      }
    } catch (err: any) {
      setRestoreResult({
        success: false,
        message: `Terjadi error: ${err.message}`,
      });
    } finally {
      setRestoreLoading(false);
    }
  };

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

  const fetchPassBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from('pass_boxes')
        .select('*')
        .order('id', { ascending: true });

      if (error || !data || data.length === 0) {
        const local = localStorage.getItem('local_pass_boxes');
        if (local) {
          setPassBoxes(JSON.parse(local));
        } else {
          const initPB: PassBoxMaster[] = [
            { id: 1, name: 'Pass Box 1', is_active: true },
            { id: 2, name: 'Pass Box 2', is_active: true },
          ];
          setPassBoxes(initPB);
          localStorage.setItem('local_pass_boxes', JSON.stringify(initPB));
        }
      } else {
        setPassBoxes(data);
        localStorage.setItem('local_pass_boxes', JSON.stringify(data));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPassBoxes();
  }, []);

  // 1. Ubah Role Pengguna Menggunakan Secure Database RPC
  const handleChangeRole = async (targetUserId: string, targetName: string, newRole: UserRole) => {
    if (!isAdmin) {
      showWarningAlert('Akses Ditolak', 'Hanya Administrator yang berhak mengubah role akun pengguna.');
      return;
    }

    if (targetUserId === currentUser?.id) {
      showWarningAlert('Perhatian', 'Anda tidak dapat mengubah role akun Anda sendiri.');
      return;
    }

    const confirmed = await showConfirmDialog(
      'Ubah Role Pengguna',
      `Apakah Anda yakin ingin mengubah role akun <b>"${targetName}"</b> menjadi <b>${newRole.toUpperCase()}</b>?`,
      'Ya, Ubah Role'
    );
    if (!confirmed) return;

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
      showToast(`Role ${targetName} diubah ke ${newRole.toUpperCase()}`, 'success');
      setSuccessMsg(`Role ${targetName} berhasil diubah menjadi ${newRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      showErrorAlert('Gagal Mengubah Role', err.message || 'Izin ditolak');
    } finally {
      setUpdatingId(null);
    }
  };

  // 2. Toggle Status Aktif/Nonaktif User
  const handleToggleStatus = async (targetUserId: string, currentStatus: boolean, targetName: string) => {
    if (!isAdmin) {
      showWarningAlert('Akses Ditolak', 'Hanya Administrator yang berhak mengubah status akun pengguna.');
      return;
    }

    if (targetUserId === currentUser?.id) {
      showWarningAlert('Perhatian', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
      return;
    }

    const newStatus = !currentStatus;
    const actionText = newStatus ? 'mengaktifkan' : 'menonaktifkan';
    const confirmed = await showConfirmDialog(
      'Konfirmasi Status Akun',
      `Apakah Anda yakin ingin <b>${actionText}</b> akun <b>"${targetName}"</b>?`,
      newStatus ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan',
      !newStatus
    );
    if (!confirmed) return;

    setUpdatingId(targetUserId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (error) throw error;

      setUsers(users.map(u => u.id === targetUserId ? { ...u, is_active: newStatus } : u));
      showToast(`Akun ${targetName} berhasil ${actionText}`, 'info');
      setSuccessMsg(`Status akun ${targetName} berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      showErrorAlert('Gagal Mengubah Status', err.message || 'Izin ditolak');
    } finally {
      setUpdatingId(null);
    }
  };

  // 3. Admin Reset Password Pengguna Lain
  const handleOpenResetModal = (user: UserProfile) => {
    if (!isAdmin) {
      showWarningAlert('Akses Ditolak', 'Hanya Administrator yang berhak mereset password pengguna.');
      return;
    }

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
      const { error } = await supabase.rpc('admin_reset_user_password', {
        admin_user_id: currentUser?.id,
        target_user_id: resetModalUser.id,
        new_password: newPassword.trim(),
      });

      if (error) {
        const { error: fallbackErr } = await supabase.rpc('change_user_password', {
          target_user_id: resetModalUser.id,
          new_password: newPassword.trim(),
        });
        if (fallbackErr) {
          throw new Error(
            `Gagal mereset password di database: ${fallbackErr.message || error.message}. Pastikan script SQL sudah dijalankan di Supabase.`
          );
        }
      }

      setUsers(users.map(u => u.id === resetModalUser.id ? { ...u, password_hash: 'active' } : u));
      setSuccessMsg(`Password akun "${resetModalUser.full_name}" (@${resetModalUser.username}) berhasil direset & diaktifkan.`);
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

      // 1. Coba panggil RPC atomic admin_create_user (enkripsi Bcrypt langsung, tanpa pending)
      const { data: createdData, error: rpcErr } = await supabase.rpc('admin_create_user', {
        admin_user_id: currentUser?.id,
        p_username: cleanUsername,
        p_full_name: fullName.trim(),
        p_role: role,
        p_password: passToUse,
      });

      if (!rpcErr && createdData) {
        const addedUser: UserProfile = {
          id: createdData.id,
          username: createdData.username,
          full_name: createdData.full_name,
          role: createdData.role,
          is_active: createdData.is_active,
          password_hash: 'active',
        };
        setUsers(prev => [...prev.filter(u => u.id !== addedUser.id), addedUser]);
        setShowAddModal(false);
        setUsername('');
        setFullName('');
        setPassword('');
        setRole('checker');
        setSuccessMsg(`Pengguna "${cleanUsername}" berhasil ditambahkan dengan password aktif.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        return;
      }

      // 2. Fallback jika RPC admin_create_user belum ada di database Supabase
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

      if (profileErr) {
        throw profileErr;
      }

      // Jalankan enkripsi password melalui RPC
      const { error: resetErr } = await supabase.rpc('admin_reset_user_password', {
        admin_user_id: currentUser?.id,
        target_user_id: newId,
        new_password: passToUse,
      });

      if (resetErr) {
        const { error: changeErr } = await supabase.rpc('change_user_password', {
          target_user_id: newId,
          new_password: passToUse,
        });

        if (changeErr) {
          throw new Error(
            `Pengguna berhasil dibuat, namun enkripsi password di database gagal (RPC Error: ${changeErr.message}). Password berstatus pending. Silakan jalankan update SQL di Supabase.`
          );
        }
      }

      newProfile.password_hash = 'active';
      setUsers(prev => [...prev.filter(u => u.id !== newId), newProfile]);
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

  // 5. Konfigurasi Master Pass Box Handlers
  const handleAddPassBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMasterData) {
      showWarningAlert('Akses Ditolak', 'Akun SPV tidak memiliki wewenang mengubah Master Data Pass Box.');
      return;
    }

    if (!newPassBoxName.trim()) return;

    const trimmed = newPassBoxName.trim();
    if (passBoxes.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      showWarningAlert('Perhatian', 'Nama Pass Box ini sudah terdaftar.');
      return;
    }

    setSavingPassBox(true);
    try {
      const { data, error } = await supabase
        .from('pass_boxes')
        .insert([{ name: trimmed, is_active: true }])
        .select()
        .single();

      if (error) {
        console.warn('Notice from Supabase pass_boxes:', error.message);
      }

      const newPB: PassBoxMaster = data || {
        id: Date.now(),
        name: trimmed,
        is_active: true,
      };

      const updated = [...passBoxes, newPB];
      setPassBoxes(updated);
      localStorage.setItem('local_pass_boxes', JSON.stringify(updated));
      setNewPassBoxName('');
      showToast(`Master "${trimmed}" berhasil ditambahkan!`, 'success');
      setSuccessMsg(`Master "${trimmed}" berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      showErrorAlert('Gagal Menambah Pass Box', err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSavingPassBox(false);
    }
  };

  const handleTogglePassBoxStatus = async (pb: PassBoxMaster) => {
    if (!canManageMasterData) {
      showWarningAlert('Akses Ditolak', 'Akun SPV tidak memiliki wewenang mengubah Master Data Pass Box.');
      return;
    }

    const updatedStatus = !pb.is_active;
    try {
      await supabase
        .from('pass_boxes')
        .update({ is_active: updatedStatus })
        .eq('id', pb.id);

      const updated = passBoxes.map(p => p.id === pb.id ? { ...p, is_active: updatedStatus } : p);
      setPassBoxes(updated);
      localStorage.setItem('local_pass_boxes', JSON.stringify(updated));
      showToast(`"${pb.name}" ${updatedStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
      setSuccessMsg(`Status "${pb.name}" diubah menjadi ${updatedStatus ? 'Aktif' : 'Nonaktif'}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      showErrorAlert('Gagal Update Pass Box', err.message || 'Terjadi kesalahan sistem');
    }
  };

  const handleDeletePassBox = async (pb: PassBoxMaster) => {
    if (!canManageMasterData) {
      showWarningAlert('Akses Ditolak', 'Akun SPV tidak memiliki wewenang menghapus Master Data Pass Box.');
      return;
    }

    if (pb.name === 'Pass Box 1' || pb.name === 'Pass Box 2') {
      showWarningAlert('Perhatian', 'Pass Box default sistem tidak dapat dihapus. Anda dapat menonaktifkannya jika tidak digunakan.');
      return;
    }

    const confirmed = await showConfirmDialog(
      'Hapus Pilihan Pass Box',
      `Apakah Anda yakin ingin menghapus <b>"${pb.name}"</b> dari master pilihan?`,
      'Ya, Hapus',
      true
    );
    if (!confirmed) return;

    try {
      await supabase
        .from('pass_boxes')
        .delete()
        .eq('id', pb.id);

      const updated = passBoxes.filter(p => p.id !== pb.id);
      setPassBoxes(updated);
      localStorage.setItem('local_pass_boxes', JSON.stringify(updated));
      showToast(`"${pb.name}" berhasil dihapus`, 'info');
      setSuccessMsg(`"${pb.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      showErrorAlert('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem');
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

      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            <span>{isAdmin ? 'Panel Administrator & Konfigurasi' : 'Panel Supervisi & Konfigurasi'}</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {isAdmin 
              ? 'Kelola otorisasi akun pengguna dan atur master pilihan Pass Box cleanroom.' 
              : 'Tinjauan tim pengguna dan status master Pass Box cleanroom (Mode Supervisi).'}
          </p>
        </div>

        {/* Sub-Tab Pill Switcher */}
        <div className="flex flex-wrap items-center bg-slate-200/80 p-1 rounded-xl gap-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kelola Pengguna ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pass_boxes')}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'pass_boxes'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Master Pass Box ({passBoxes.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('backup')}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'backup'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup & Pemulihan</span>
          </button>
        </div>
      </div>

      {/* SPV Notification Banner */}
      {isSpv && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-3 rounded-xl flex items-center space-x-2.5 shadow-xs">
          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Mode Supervisi (Read-Only Master Data):</span> Anda masuk dengan akun <strong>SPV</strong>. Sesuai kebijakan otorisasi, SPV memiliki akses pengawasan & pelaporan data, namun <strong>tidak memiliki otoritas mengubah Master Data Pass Box</strong> atau mengubah konfigurasi pengguna seperti Administrator.
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 1: KELOLA PENGGUNA (activeSubTab === 'users') */}
      {/* ==================================================== */}
      {activeSubTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, username, atau role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 h-10 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                title="Segarkan daftar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pengguna</span>
                </button>
              )}
            </div>
          </div>

          {/* 1. Mobile Cards List */}
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

                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {u.password_hash === 'pending' && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ⚠️ Pass Pending
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-2 rounded-lg text-xs">
                      <span className="font-medium text-slate-600">Role Otorisasi:</span>
                      {(!isAdmin || isCurrent) ? (
                        <span className={`font-bold uppercase flex items-center px-2 py-0.5 rounded text-[10px] ${
                          u.role === 'admin'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : u.role === 'spv'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          <Shield className="w-3 h-3 mr-1 text-slate-500" />
                          {u.role === 'admin' ? 'ADMIN' : u.role === 'spv' ? 'SPV' : 'CHECKER'} {isCurrent ? '(Anda)' : '(Terkunci)'}
                        </span>
                      ) : (
                        <select
                          disabled={isProcessing}
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, u.full_name, e.target.value as UserRole)}
                          className={`font-bold px-2 py-1 rounded-md border focus:outline-none transition ${
                            u.role === 'admin'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : u.role === 'spv'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-sky-50 border-sky-200 text-sky-700'
                          }`}
                        >
                          <option value="checker">CHECKER</option>
                          <option value="spv">SPV / SUPERVISOR</option>
                          <option value="admin">ADMINISTRATOR</option>
                        </select>
                      )}
                    </div>

                    {isAdmin ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenResetModal(u)}
                          className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold border transition ${
                            u.password_hash === 'pending'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 ring-2 ring-amber-400/40 font-bold'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>{u.password_hash === 'pending' ? 'Aktifkan Pass' : 'Reset Pass'}</span>
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
                            <span>{isProcessing ? 'Proses...' : u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-center text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-slate-200/60 font-medium">
                            Akun Aktif
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-400 text-center italic">
                        Pengelolaan akun khusus Administrator
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table */}
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
                          {(!isAdmin || isCurrent) ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              u.role === 'admin'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : u.role === 'spv'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}>
                              <Shield className="w-3 h-3 mr-1 text-slate-500" />
                              {u.role === 'admin' ? 'ADMINISTRATOR' : u.role === 'spv' ? 'SPV / SUPERVISOR' : 'CHECKER'}
                              {isCurrent && <span className="ml-1 text-[9px] text-slate-500 font-normal">(Anda)</span>}
                            </span>
                          ) : (
                            <select
                              disabled={isProcessing}
                              value={u.role}
                              onChange={(e) => handleChangeRole(u.id, u.full_name, e.target.value as UserRole)}
                              className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none transition ${
                                u.role === 'admin'
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : u.role === 'spv'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-sky-50 border-sky-200 text-sky-700'
                              } disabled:opacity-50 cursor-pointer`}
                            >
                              <option value="checker">CHECKER</option>
                              <option value="spv">SPV / SUPERVISOR</option>
                              <option value="admin">ADMINISTRATOR</option>
                            </select>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
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
                            {u.password_hash === 'pending' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse" title="Password belum aktif. Klik tombol Aktifkan Pass.">
                                ⚠️ Pass Pending
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isAdmin ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenResetModal(u)}
                                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                                  u.password_hash === 'pending'
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-400 ring-1 ring-amber-400 font-bold'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                              >
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>{u.password_hash === 'pending' ? 'Aktifkan Pass' : 'Reset Pass'}</span>
                              </button>

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
                                  <span>{isProcessing ? '...' : u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] px-2">Akun Aktif</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Khusus Admin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 2: MASTER PASS BOX (activeSubTab === 'pass_boxes') */}
      {/* ==================================================== */}
      {activeSubTab === 'pass_boxes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-2">
              <Box className="w-4 h-4 text-sky-600" />
              <span>Konfigurasi Pilihan Pass Box (OOP Selection)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar Pass Box di bawah ini akan otomatis muncul sebagai pilihan pada form Input Data.
            </p>
          </div>

          {/* Form Tambah Pass Box (Khusus Admin) / Notice Read-Only (SPV) */}
          {canManageMasterData ? (
            <form onSubmit={handleAddPassBox} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="relative flex-1">
                <Box className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pass Box 3, Pass Box Sampling..."
                  value={newPassBoxName}
                  onChange={(e) => setNewPassBoxName(e.target.value)}
                  className="w-full pl-9 pr-3.5 h-10 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={savingPassBox}
                className="h-10 px-4 flex items-center justify-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-xs shadow-sm transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{savingPassBox ? 'Menyimpan...' : 'Tambah Pass Box'}</span>
              </button>
            </form>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3.5 text-xs text-amber-900 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Akses Read-Only Master Data:</span>
                <span>Akun dengan role SPV tidak memiliki wewenang untuk menambah, mengubah status, atau menghapus Master Data Pass Box. Konfigurasi ini hanya dapat dilakukan oleh Administrator.</span>
              </div>
            </div>
          )}

          {/* List of Pass Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {passBoxes.map((pb) => {
              const isDefault = pb.name === 'Pass Box 1' || pb.name === 'Pass Box 2';

              return (
                <div
                  key={pb.id}
                  className={`border rounded-xl p-4 transition space-y-3 ${
                    pb.is_active ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        pb.is_active ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">{pb.name}</span>
                        {isDefault && (
                          <span className="text-[10px] text-slate-400 font-medium">Bawaan Sistem</span>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pb.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {pb.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {canManageMasterData ? (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => handleTogglePassBoxStatus(pb)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                          pb.is_active
                            ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        <span>{pb.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>

                      {!isDefault && (
                        <button
                          onClick={() => handleDeletePassBox(pb)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus master ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Status Pilihan</span>
                      <span className="font-medium text-slate-500 italic">Read-Only</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 3: BACKUP & PEMULIHAN (activeSubTab === 'backup') */}
      {/* ==================================================== */}
      {activeSubTab === 'backup' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Information & Alert Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-emerald-950">
                  Pusat Backup & Pemulihan Data Mandiri (Disaster Recovery)
                </h3>
                <p className="text-xs text-emerald-800/90 mt-0.5 max-w-2xl leading-relaxed">
                  Dirancang khusus untuk mengamankan data operasional pada <strong>Supabase Free Tier</strong> (yang tidak memiliki auto-backup rollback bawaan server). Simpan cadangan snapshot berkala atau pulihkan data kapan saja jika terjadi kendala.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-emerald-100/80 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold self-stretch sm:self-auto justify-center">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              <span>Proteksi Data Aktif</span>
            </div>
          </div>

          {/* Result Alert Message */}
          {restoreResult && (
            <div
              className={`p-4 rounded-xl border flex items-start space-x-3 shadow-xs animate-fadeIn ${
                restoreResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {restoreResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm mb-0.5">
                  {restoreResult.success ? 'Pemulihan Berhasil!' : 'Pemulihan Gagal!'}
                </div>
                <div>{restoreResult.message}</div>
              </div>
              <button
                onClick={() => setRestoreResult(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Grid: 2 Utama (Unduh Backup vs Pulihkan Data) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Panel 1: Unduh Backup Data */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-800">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">1. Unduh Cadangan Data (Backup Snapshot)</h4>
                    <span className="text-[11px] text-slate-500">Ambil salinan seluruh riwayat log transaksi & master data</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Disarankan melakukan backup setiap akhir shift kerja atau minimal 1 minggu sekali. File hasil backup dapat disimpan di komputer lokal atau cloud drive perusahaan.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {/* Tombol Backup JSON */}
                <button
                  onClick={handleDownloadJsonBackup}
                  disabled={downloadingJson || downloadingExcel}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 rounded-xl transition group text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-sky-900">
                        Unduh Snapshot Database (.JSON)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Format standar untuk fitur pemulihan (restore) instan
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-600 group-hover:underline flex items-center space-x-1">
                    {downloadingJson ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                    ) : (
                      <span>Download</span>
                    )}
                  </span>
                </button>

                {/* Tombol Backup Excel */}
                <button
                  onClick={handleDownloadExcelBackup}
                  disabled={downloadingJson || downloadingExcel}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 rounded-xl transition group text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        Unduh Arsip Lengkap (.XLSX Excel)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tabel spreadsheet lengkap (Log, Master, dan Ringkasan)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 group-hover:underline flex items-center space-x-1">
                    {downloadingExcel ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <span>Download</span>
                    )}
                  </span>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-500 flex items-center space-x-2">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Kedua format mencakup seluruh data transaksi tanpa terpotong filter aktif.</span>
              </div>
            </div>

            {/* Panel 2: Pulihkan Data dari File Backup */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-800">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">2. Pulihkan Data dari File Cadangan (Restore)</h4>
                    <span className="text-[11px] text-slate-500">Masukkan kembali data dari file backup JSON yang pernah diunduh</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Gunakan fitur ini jika database sempat terhapus atau perlu sinkronisasi data dari snapshot cadangan sebelumnya.
                </p>
              </div>

              {/* Upload Input Area */}
              <div className="space-y-3">
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={restoreLoading}
                    className="hidden"
                  />
                  <FileJson className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition mb-2" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                    Pilih File Backup (.JSON)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Klik di sini untuk mengunggah file cadangan
                  </span>
                </label>

                {/* Preview Box jika file dipilih */}
                {restorePreview && (
                  <div className="border border-slate-200 rounded-xl bg-slate-50 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">File Backup Terverifikasi</span>
                      </div>
                      <button
                        onClick={() => setRestorePreview(null)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 block">Total Data Log:</span>
                        <strong className="text-slate-800 text-xs">{restorePreview.logsCount} Baris</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Rentang Tanggal:</span>
                        <strong className="text-slate-800 text-xs">
                          {restorePreview.dateRange?.earliest} s/d {restorePreview.dateRange?.latest}
                        </strong>
                      </div>
                    </div>

                    {/* Progress Bar saat Restore */}
                    {restoreLoading && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>{restoreStatusText}</span>
                          <span className="font-bold">{restoreProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2 transition-all duration-300 rounded-full"
                            style={{ width: `${restoreProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tombol Eksekusi Restore */}
                    {!restoreLoading && (
                      <button
                        onClick={handleExecuteRestore}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-sm transition flex items-center justify-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Mulai Pemulihan {restorePreview.logsCount} Data Log</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Proses pemulihan tidak akan menghapus data yang sudah ada, melainkan menambahkan record dari file backup ke database.
                </span>
              </div>
            </div>
          </div>

          {/* Panel 3: Panduan Keamanan & Pencegahan Free Tier */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-sky-600" />
              <span>Panduan Keamanan Database (Supabase Free Tier)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1.5">
                <strong className="text-slate-800 font-bold block">1. Script Setup Sudah Diamankan</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  File <code className="text-sky-700 font-mono">supabase_setup.sql</code> kini telah dibuat 100% non-destructive (perintah <code className="text-rose-600 font-mono">DROP TABLE</code> telah dinonaktifkan). Script aman jika tanpa sengaja dijalankan ulang.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1.5">
                <strong className="text-slate-800 font-bold block">2. Rutinitas Backup Mingguan</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Karena Free Tier tidak memiliki automated point-in-time recovery, biasakan mengklik tombol <strong>Unduh Snapshot JSON</strong> setiap akhir pekan untuk menyimpan arsip fisik.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1.5">
                <strong className="text-slate-800 font-bold block">3. Export Manual dari Supabase</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Anda juga dapat sewaktu-waktu membuka Dashboard Supabase &gt; <strong>Table Editor</strong> &gt; pilih tabel &gt; klik <strong>Export to CSV</strong> sebagai backup cadangan langsung dari server.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <option value="spv">SPV / Supervisor (Monitoring & Supervisi - Tanpa Otoritas Master Data)</option>
                  <option value="admin">Administrator (Full Access & Konfigurasi Master Data)</option>
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
