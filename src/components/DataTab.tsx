import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { PassBoxLog } from '../types';
import { StatCard } from './StatCard';
import { EditLogModal } from './EditLogModal';
import { exportLogsToExcel, formatDateIndo } from '../utils/excel';
import { 
  FileSpreadsheet, 
  Search, 
  RotateCcw, 
  Save, 
  Pencil, 
  Trash2, 
  AlertCircle
} from 'lucide-react';

export const DataTab: React.FC = () => {
  const { user, isAdmin } = useAuth();

  // Logs state
  const [logs, setLogs] = useState<PassBoxLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Form inputs
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [noPro, setNoPro] = useState('');
  const [tanggal, setTanggal] = useState(todayStr);
  const [passBox, setPassBox] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit modal
  const [editingLog, setEditingLog] = useState<PassBoxLog | null>(null);

  const noProInputRef = useRef<HTMLInputElement>(null);

  // Load initial logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pass_box_logs')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        // Jika tabel belum dibuat di Supabase SQL Editor, gunakan local storage agar tidak crash
        console.warn('Supabase fetch notice:', error.message);
        setDbError(error.message);
        const local = localStorage.getItem('local_pass_box_logs');
        if (local) {
          setLogs(JSON.parse(local));
        } else {
          // Initial demo data matching screenshots
          const initialMock: PassBoxLog[] = [
            { id: 4, no_pro: 'Contoh', tanggal: '2026-09-30', pass_box: '1', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:19:00Z' },
            { id: 3, no_pro: '1059555', tanggal: '2026-09-30', pass_box: 'asbox 1 PM fani', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:18:00Z' },
            { id: 2, no_pro: 'contoh1', tanggal: '2026-09-30', pass_box: '1 PM', user_id: '22222222-2222-2222-2222-222222222222', user_name: 'Admin', created_at: '2026-09-30T10:14:00Z' },
            { id: 1, no_pro: '105999', tanggal: '2026-09-30', pass_box: 'pasbox 1. PM', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:10:00Z' },
          ];
          setLogs(initialMock);
          localStorage.setItem('local_pass_box_logs', JSON.stringify(initialMock));
        }
      } else if (data) {
        setDbError(null);
        setLogs(data);
      }
    } catch (err: any) {
      setDbError(err.message || 'Gagal memuat data dari Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('pass_box_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pass_box_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Form Submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noPro.trim() || !tanggal || !passBox.trim()) return;

    setSubmitting(true);
    const newEntry = {
      no_pro: noPro.trim(),
      tanggal,
      pass_box: passBox.trim(),
      user_id: user?.id || '11111111-1111-1111-1111-111111111111',
      user_name: user?.full_name || 'Cheker 1',
    };

    try {
      const { data, error } = await supabase
        .from('pass_box_logs')
        .insert([newEntry])
        .select()
        .single();

      if (error) {
        // Fallback local persistence if Supabase table is not yet migrated
        const fallbackItem: PassBoxLog = {
          id: Date.now(),
          ...newEntry,
          created_at: new Date().toISOString(),
        };
        const updated = [fallbackItem, ...logs];
        setLogs(updated);
        localStorage.setItem('local_pass_box_logs', JSON.stringify(updated));
      } else if (data) {
        setLogs([data, ...logs]);
      }

      // Reset form
      setNoPro('');
      setPassBox('');
      noProInputRef.current?.focus();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setNoPro('');
    setTanggal(todayStr);
    setPassBox('');
    noProInputRef.current?.focus();
  };

  // Handle Edit Save
  const handleSaveEdit = async (updatedLog: { id: number; no_pro: string; tanggal: string; pass_box: string }) => {
    try {
      const { error } = await supabase
        .from('pass_box_logs')
        .update({
          no_pro: updatedLog.no_pro,
          tanggal: updatedLog.tanggal,
          pass_box: updatedLog.pass_box,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedLog.id);

      if (error) {
        // Local fallback update
        const updated = logs.map(l => l.id === updatedLog.id ? { ...l, ...updatedLog } : l);
        setLogs(updated);
        localStorage.setItem('local_pass_box_logs', JSON.stringify(updated));
      } else {
        setLogs(logs.map(l => l.id === updatedLog.id ? { ...l, ...updatedLog } : l));
      }
    } catch (err: any) {
      alert('Gagal mengupdate log: ' + err.message);
    }
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      const { error } = await supabase
        .from('pass_box_logs')
        .delete()
        .eq('id', id);

      if (error) {
        // Local fallback delete
        const updated = logs.filter(l => l.id !== id);
        setLogs(updated);
        localStorage.setItem('local_pass_box_logs', JSON.stringify(updated));
      } else {
        setLogs(logs.filter(l => l.id !== id));
      }
    } catch (err: any) {
      alert('Gagal menghapus log: ' + err.message);
    }
  };

  // Metrics
  const totalCount = logs.length;
  const todayCount = logs.filter(l => l.tanggal === todayStr).length;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNoPro = log.no_pro.toLowerCase().includes(q);
        const matchPassBox = log.pass_box.toLowerCase().includes(q);
        const matchUser = log.user_name.toLowerCase().includes(q);
        if (!matchNoPro && !matchPassBox && !matchUser) return false;
      }

      // Date range filter
      if (startDate && log.tanggal < startDate) return false;
      if (endDate && log.tanggal > endDate) return false;

      return true;
    });
  }, [logs, searchQuery, startDate, endDate]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      {/* Alert if Supabase tables are pending */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-800 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Info Setup Database Supabase:</span> Tabel <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">pass_box_logs</code> belum terdeteksi di Supabase project Anda. Aplikasi saat ini menggunakan local cache offline agar tetap dapat digunakan langsung. Jalankan script <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold text-amber-900">supabase_setup.sql</code> di Supabase SQL Editor untuk mengaktifkan database cloud.
          </div>
        </div>
      )}

      {/* Header Top Section: Title & Subtitle + Top-Right Stat Cards */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Input Data Pass Box
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            No Pro · Tanggal · Pass Box
          </p>
        </div>

        {/* Top-Right Metrics */}
        <div className="flex items-center space-x-3">
          <StatCard label="TOTAL DATA" value={totalCount} />
          <StatCard label="TANGGAL HARI INI" value={todayCount} />
        </div>
      </div>

      {/* Main Grid: Left Form (1/3) & Right Table (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Data Form */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-800">Input Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi tiga kolom lalu tekan Simpan (Enter).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. NO PRO */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                1. NO PRO
              </label>
              <input
                ref={noProInputRef}
                type="text"
                required
                placeholder="Contoh: PRO-2026-0001"
                value={noPro}
                onChange={(e) => setNoPro(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition font-mono placeholder:font-sans placeholder:text-slate-400"
              />
            </div>

            {/* 2. TANGGAL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                2. TANGGAL
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* 3. PASS BOX */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                3. PASS BOX
              </label>
              <textarea
                required
                rows={3}
                placeholder="Nomor box/keterangan pass box..."
                value={passBox}
                onChange={(e) => setPassBox(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Menyimpan...' : 'Simpan Data'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center space-x-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium py-2.5 px-3.5 rounded-lg transition text-sm"
                title="Reset input"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Daftar Data & Filters */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Top row: Counter & Export Excel */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Daftar Data</h2>
              <span className="text-xs text-slate-500">{filteredLogs.length} baris</span>
            </div>

            <button
              onClick={() => exportLogsToExcel(filteredLogs)}
              className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>

          {/* Filter Bar: Search + Date Range */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari No Pro, Pass Box, atau penginput..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none"
                title="Tanggal Awal"
              />
              <span className="text-slate-400 font-medium text-[11px]">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none"
                title="Tanggal Akhir"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-slate-400 hover:text-slate-600 text-[10px] underline ml-1 px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">NO</th>
                  <th className="py-2.5 px-3">NO PRO</th>
                  <th className="py-2.5 px-3">TANGGAL</th>
                  <th className="py-2.5 px-3">PASS BOX</th>
                  <th className="py-2.5 px-3">DIINPUT OLEH</th>
                  <th className="py-2.5 px-3 text-center w-16">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {loading ? 'Memuat data...' : 'Tidak ada data yang sesuai filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const canModify = isAdmin || log.user_id === user?.id;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {log.no_pro}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {formatDateIndo(log.tanggal)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {log.pass_box}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {log.user_name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {canModify ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => setEditingLog(log)}
                                className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                                title="Edit baris"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Hapus baris"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
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
      </div>

      {/* Edit Modal */}
      <EditLogModal
        log={editingLog}
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
