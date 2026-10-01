import React, { useState, useEffect, useMemo, useRef } from 'react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { PassBoxLog, KategoriPro, PassBoxMaster } from '../types';
import { StatCard } from './StatCard';
import { EditLogModal } from './EditLogModal';
import { exportLogsToExcel, formatDateIndo } from '../utils/excel';
import { downloadJSONBackup } from '../utils/backup';
import { 
  FileSpreadsheet, 
  FileJson,
  Search, 
  RotateCcw, 
  Save, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Calendar,
  Box,
  User,
  X,
  CheckCircle2,
  Tag
} from 'lucide-react';

export const DataTab: React.FC = () => {
  const { user, isAdmin, isSpv } = useAuth();

  // Logs state
  const [logs, setLogs] = useState<PassBoxLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Master Pass Box state
  const [availablePassBoxes, setAvailablePassBoxes] = useState<PassBoxMaster[]>([
    { id: 1, name: 'Pass Box 1', is_active: true },
    { id: 2, name: 'Pass Box 2', is_active: true },
  ]);

  // Form inputs
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [kategoriPro, setKategoriPro] = useState<KategoriPro | ''>(''); // Wajib pilih dulu
  const [noPro, setNoPro] = useState('');
  const [tanggal, setTanggal] = useState(todayStr);
  const [passBox, setPassBox] = useState(''); // Wajib pilih manual (tidak auto-choose)
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<'ALL' | 'RM' | 'PM'>('ALL');
  const [filterPassBox, setFilterPassBox] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit modal
  const [editingLog, setEditingLog] = useState<PassBoxLog | null>(null);

  // Deteksi duplikasi & validasi numerik real-time
  const duplicateWarning = useMemo(() => {
    const clean = noPro.trim();
    if (!clean) return null;
    if (!/^\d+$/.test(clean)) {
      return { type: 'invalid' as const, message: 'Nomor PRO harus berupa angka saja (numerik).' };
    }
    const found = logs.find(l => String(l.no_pro).trim() === clean);
    if (found) {
      return {
        type: 'duplicate' as const,
        message: `Nomor PRO ${clean} sudah pernah diinput pada ${formatDateIndo(found.tanggal)} (${found.pass_box}) oleh ${found.user_name || 'Checker'}.`,
      };
    }
    return null;
  }, [noPro, logs]);

  const noProInputRef = useRef<HTMLInputElement>(null);
  const dtContainerRef = useRef<HTMLDivElement | null>(null);
  const dtInstanceRef = useRef<any>(null);
  const logsRef = useRef<PassBoxLog[]>([]);
  const userRef = useRef(user);
  const isAdminRef = useRef(isAdmin);
  const isSpvRef = useRef(isSpv);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    userRef.current = user;
    isAdminRef.current = isAdmin;
    isSpvRef.current = isSpv;
  }, [user, isAdmin, isSpv]);

  // Aturan Hak Akses Modifikasi (Edit / Delete):
  // 1. Administrator: Akses penuh (bisa edit & hapus semua data)
  // 2. SPV: Read-Only (tidak bisa edit/hapus data siapa pun)
  // 3. Checker: Hanya bisa edit/hapus data hasil inputan miliknya sendiri
  const canUserModifyLog = (log: PassBoxLog): boolean => {
    const currentUser = userRef.current;
    if (!currentUser) return false;
    if (isAdminRef.current) return true;
    if (isSpvRef.current) return false;

    // Checker: Cek kecocokan ID pengguna atau Nama Pengguna (case-insensitive)
    const isOwnerById = Boolean(
      log.user_id && currentUser.id && String(log.user_id) === String(currentUser.id)
    );
    const isOwnerByName = Boolean(
      log.user_name &&
      ((currentUser.full_name && log.user_name.trim().toLowerCase() === currentUser.full_name.trim().toLowerCase()) ||
       (currentUser.username && log.user_name.trim().toLowerCase() === currentUser.username.trim().toLowerCase()))
    );

    return isOwnerById || isOwnerByName;
  };

  // Fetch active pass boxes
  const fetchPassBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from('pass_boxes')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        setAvailablePassBoxes(data);
        if (passBox && !data.some(p => p.name === passBox)) {
          setPassBox('');
        }
      } else {
        const local = localStorage.getItem('local_pass_boxes');
        if (local) {
          const parsed: PassBoxMaster[] = JSON.parse(local).filter((p: PassBoxMaster) => p.is_active);
          if (parsed.length > 0) {
            setAvailablePassBoxes(parsed);
            if (passBox && !parsed.some(p => p.name === passBox)) {
              setPassBox('');
            }
          }
        }
      }
    } catch {
      // fallback
    }
  };

  // Load initial logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pass_box_logs')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.warn('Supabase fetch notice:', error.message);
        setDbError(error.message);
        const local = localStorage.getItem('local_pass_box_logs');
        if (local) {
          setLogs(JSON.parse(local));
        } else {
          const initialMock: PassBoxLog[] = [
            { id: 4, kategori_pro: 'RM', no_pro: 'Contoh', tanggal: '2026-09-30', pass_box: 'Pass Box 1', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:19:00Z' },
            { id: 3, kategori_pro: 'PM', no_pro: '1059555', tanggal: '2026-09-30', pass_box: 'Pass Box 2', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:18:00Z' },
            { id: 2, kategori_pro: 'RM', no_pro: 'contoh1', tanggal: '2026-09-30', pass_box: 'Pass Box 1', user_id: '22222222-2222-2222-2222-222222222222', user_name: 'Admin', created_at: '2026-09-30T10:14:00Z' },
            { id: 1, kategori_pro: 'PM', no_pro: '105999', tanggal: '2026-09-30', pass_box: 'Pass Box 1', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:10:00Z' },
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
    fetchPassBoxes();

    // Supabase Realtime Subscriptions
    const logsChannel = supabase
      .channel('pass_box_realtime_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pass_box_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    const pbChannel = supabase
      .channel('pass_box_realtime_master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pass_boxes' }, () => {
        fetchPassBoxes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(pbChannel);
    };
  }, []);

  // Handle Form Submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!kategoriPro) {
      alert('PENTING: Wajib memilih tipe PRO (RM atau PM) terlebih dahulu.');
      return;
    }
    const cleanNoPro = noPro.trim();
    if (!cleanNoPro) {
      alert('PENTING: Wajib mengisi No PRO terlebih dahulu.');
      return;
    }
    if (!/^\d+$/.test(cleanNoPro)) {
      alert('PENTING: Nomor PRO harus berupa angka saja (numerik).');
      return;
    }
    if (!passBox.trim()) {
      alert('PENTING: Wajib memilih salah satu Pass Box terlebih dahulu.');
      return;
    }
    if (!tanggal) return;

    // 1. Cek duplikasi di state lokal terlebih dahulu
    const localMatch = logs.find(l => String(l.no_pro).trim() === cleanNoPro);
    if (localMatch) {
      alert(`PENTING: Nomor PRO ${cleanNoPro} SUDAH PERNAH DIINPUT!\n\nDetail Catatan:\n- Tanggal: ${formatDateIndo(localMatch.tanggal)}\n- Pilihan Pass Box: ${localMatch.pass_box}\n- Operator: ${localMatch.user_name || 'Tidak tercatat'}\n\nSatu nomor PRO tidak boleh diinput lebih dari satu kali.`);
      return;
    }

    setSubmitting(true);

    try {
      // 2. Cek duplikasi langsung ke Supabase (perlindungan multi-user / shift)
      const { data: dbMatch, error: checkError } = await supabase
        .from('pass_box_logs')
        .select('id, no_pro, tanggal, pass_box, user_name')
        .eq('no_pro', cleanNoPro)
        .limit(1);

      if (!checkError && dbMatch && dbMatch.length > 0) {
        const dup = dbMatch[0];
        alert(`PENTING: Nomor PRO ${cleanNoPro} SUDAH PERNAH DIINPUT DI DATABASE!\n\nDetail Catatan:\n- Tanggal: ${formatDateIndo(dup.tanggal)}\n- Pilihan Pass Box: ${dup.pass_box}\n- Operator: ${dup.user_name || 'Tidak tercatat'}\n\nSatu nomor PRO tidak boleh diinput lebih dari satu kali.`);
        setSubmitting(false);
        return;
      }

      const newEntry = {
        kategori_pro: kategoriPro,
        no_pro: cleanNoPro,
        tanggal,
        pass_box: passBox.trim(),
        user_id: user?.id || null,
        user_name: user?.full_name || user?.username || 'Checker',
      };

      const { data, error } = await supabase
        .from('pass_box_logs')
        .insert([newEntry])
        .select()
        .single();

      if (error) {
        const fallbackItem: PassBoxLog = {
          id: Date.now(),
          ...newEntry,
          user_id: user?.id || '11111111-1111-1111-1111-111111111111',
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
      setKategoriPro('');
      setPassBox('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setKategoriPro('');
    setNoPro('');
    setTanggal(todayStr);
    setPassBox('');
  };

  // Handle Edit Save
  const handleSaveEdit = async (updatedLog: { id: number; kategori_pro: KategoriPro; no_pro: string; tanggal: string; pass_box: string }) => {
    const targetLog = logs.find(l => l.id === updatedLog.id);
    if (targetLog && !canUserModifyLog(targetLog)) {
      alert('Akses ditolak: Anda hanya memiliki izin untuk mengubah data log yang Anda input sendiri.');
      return;
    }

    const cleanNoPro = updatedLog.no_pro.trim();
    if (!/^\d+$/.test(cleanNoPro)) {
      alert('PENTING: Nomor PRO harus berupa angka saja (numerik).');
      return;
    }

    // Cek duplikasi di state lokal
    const localMatch = logs.find(l => l.id !== updatedLog.id && String(l.no_pro).trim() === cleanNoPro);
    if (localMatch) {
      alert(`Nomor PRO ${cleanNoPro} sudah digunakan pada data lain (Tanggal: ${formatDateIndo(localMatch.tanggal)}, ${localMatch.pass_box}).`);
      return;
    }

    try {
      // Cek duplikasi di Supabase
      const { data: dbMatch, error: checkError } = await supabase
        .from('pass_box_logs')
        .select('id, no_pro, tanggal, pass_box, user_name')
        .eq('no_pro', cleanNoPro)
        .neq('id', updatedLog.id)
        .limit(1);

      if (!checkError && dbMatch && dbMatch.length > 0) {
        const dup = dbMatch[0];
        alert(`Nomor PRO ${cleanNoPro} sudah digunakan pada data lain di database (Tanggal: ${formatDateIndo(dup.tanggal)}, Operator: ${dup.user_name}).`);
        return;
      }

      const { error } = await supabase
        .from('pass_box_logs')
        .update({
          kategori_pro: updatedLog.kategori_pro,
          no_pro: cleanNoPro,
          tanggal: updatedLog.tanggal,
          pass_box: updatedLog.pass_box,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedLog.id);

      if (error) {
        const updated = logs.map(l => l.id === updatedLog.id ? { ...l, ...updatedLog, no_pro: cleanNoPro } : l);
        setLogs(updated);
        localStorage.setItem('local_pass_box_logs', JSON.stringify(updated));
      } else {
        setLogs(logs.map(l => l.id === updatedLog.id ? { ...l, ...updatedLog, no_pro: cleanNoPro } : l));
      }
    } catch (err: any) {
      alert('Gagal mengupdate log: ' + err.message);
    }
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    const targetLog = logs.find(l => l.id === id);
    if (targetLog && !canUserModifyLog(targetLog)) {
      alert('Akses ditolak: Anda hanya memiliki izin untuk menghapus data log yang Anda input sendiri.');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      const { error } = await supabase
        .from('pass_box_logs')
        .delete()
        .eq('id', id);

      if (error) {
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

      // Kategori filter
      if (filterKategori !== 'ALL') {
        const logKat = log.kategori_pro || (log.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM');
        if (logKat !== filterKategori) return false;
      }

      // Pass Box filter
      if (filterPassBox !== 'ALL' && log.pass_box !== filterPassBox) {
        return false;
      }

      // Date range filter
      if (startDate && log.tanggal < startDate) return false;
      if (endDate && log.tanggal > endDate) return false;

      return true;
    });
  }, [logs, searchQuery, filterKategori, filterPassBox, startDate, endDate]);

  // Delegated click handler untuk tombol aksi (Edit & Delete) di DataTables.js
  useEffect(() => {
    const containerEl = dtContainerRef.current;
    if (!containerEl) return;

    const handleActionClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('[data-dt-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-dt-action');
      const idStr = btn.getAttribute('data-id');
      if (!idStr) return;
      const targetLog = logsRef.current.find((l) => String(l.id) === String(idStr));
      if (!targetLog) return;

      if (!canUserModifyLog(targetLog)) {
        alert('Akses ditolak: Anda hanya dapat mengubah atau menghapus data log yang Anda input sendiri.');
        return;
      }

      if (action === 'edit') {
        setEditingLog(targetLog);
      } else if (action === 'delete') {
        handleDelete(targetLog.id);
      }
    };

    containerEl.addEventListener('click', handleActionClick);
    return () => {
      containerEl.removeEventListener('click', handleActionClick);
    };
  }, []);

  // Inisialisasi dan sinkronisasi DataTables.js di dalam container terisolasi (Uncontrolled DOM)
  useEffect(() => {
    if (loading || !dtContainerRef.current) return;

    if (!dtInstanceRef.current) {
      // Injeksi markup tabel secara murni di dalam container agar React Virtual DOM tidak konflik
      dtContainerRef.current.innerHTML = `
        <table class="display w-full text-left border-collapse text-xs" style="width: 100%">
          <thead>
            <tr class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th class="py-2.5 px-3 w-12 text-center" title="Nomor Baris">NO</th>
              <th class="py-2.5 px-3 w-20 text-center" title="Klik untuk mengurutkan Tipe">TIPE</th>
              <th class="py-2.5 px-3" title="Klik untuk mengurutkan No PRO">NO PRO</th>
              <th class="py-2.5 px-3" title="Klik untuk mengurutkan Tanggal">TANGGAL</th>
              <th class="py-2.5 px-3" title="Klik untuk mengurutkan Pass Box">PILIHAN PASS BOX</th>
              <th class="py-2.5 px-3" title="Klik untuk mengurutkan Checker">DIINPUT OLEH</th>
              <th class="py-2.5 px-3 text-center w-20" title="Aksi Baris">AKSI</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `;

      const tableEl = dtContainerRef.current.querySelector('table');
      if (!tableEl) return;

      dtInstanceRef.current = new DataTable(tableEl, {
        data: filteredLogs,
        columns: [
          {
            title: 'NO',
            data: null,
            className: 'text-center font-medium text-slate-500 w-12 dt-orderable-none',
            orderable: false,
            searchable: false,
            render: (_data: any, _type: string, _row: any, meta: any) => {
              return `<span class="text-slate-400 font-bold">${meta.row + 1}</span>`;
            },
          },
          {
            title: 'TIPE',
            data: 'kategori_pro',
            className: 'text-center w-20',
            orderable: true,
            render: (_data: any, type: string, row: PassBoxLog) => {
              const kat = row.kategori_pro || (row.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM');
              if (type === 'sort' || type === 'type') return kat;
              const badgeClass =
                kat === 'RM'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-indigo-100 text-indigo-800 border-indigo-200';
              return `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badgeClass}">${kat}</span>`;
            },
          },
          {
            title: 'NO PRO',
            data: 'no_pro',
            className: 'font-semibold text-slate-800 font-mono',
            orderable: true,
            render: (_data: any, type: string, row: PassBoxLog) => {
              if (type === 'sort' || type === 'type') return row.no_pro;
              return `<span class="font-mono font-bold text-slate-900">${row.no_pro}</span>`;
            },
          },
          {
            title: 'TANGGAL',
            data: 'tanggal',
            className: 'text-slate-600 whitespace-nowrap',
            orderable: true,
            render: (_data: any, type: string, row: PassBoxLog) => {
              if (type === 'sort' || type === 'type') return `${row.tanggal} ${row.created_at || ''}`;
              return formatDateIndo(row.tanggal);
            },
          },
          {
            title: 'PILIHAN PASS BOX',
            data: 'pass_box',
            orderable: true,
            render: (_data: any, type: string, row: PassBoxLog) => {
              if (type === 'sort' || type === 'type') return row.pass_box;
              return `<span class="inline-flex items-center space-x-1 font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded"><span>${row.pass_box}</span></span>`;
            },
          },
          {
            title: 'DIINPUT OLEH',
            data: 'user_name',
            className: 'text-slate-600 font-medium',
            orderable: true,
            render: (_data: any, type: string, row: PassBoxLog) => {
              if (type === 'sort' || type === 'type') return row.user_name || '';
              return `<span>${row.user_name || '-'}</span>`;
            },
          },
          {
            title: 'AKSI',
            data: null,
            className: 'text-center w-20 dt-orderable-none',
            orderable: false,
            searchable: false,
            render: (_data: any, _type: string, row: PassBoxLog) => {
              const canModify = canUserModifyLog(row);
              if (!canModify) return '<span class="text-slate-300 font-bold" title="Hanya pembuat data atau Admin yang dapat mengubah">-</span>';
              return `
                <div class="flex items-center justify-center space-x-1">
                  <button type="button" data-dt-action="edit" data-id="${row.id}" class="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded transition cursor-pointer" title="Edit Log">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button type="button" data-dt-action="delete" data-id="${row.id}" class="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer" title="Hapus Log">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              `;
            },
          },
        ],
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        ordering: true,
        orderMulti: true,
        order: [[3, 'desc']],
        language: {
          search: "Cari Data:",
          searchPlaceholder: "No PRO, Checker...",
          lengthMenu: "Tampilkan _MENU_ baris",
          info: "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
          infoEmpty: "Menampilkan 0 data",
          infoFiltered: "(disaring dari _MAX_ total data)",
          zeroRecords: "Tidak ada data yang cocok",
          emptyTable: "Belum ada catatan Pass Box",
          paginate: {
            first: "«",
            last: "»",
            next: "›",
            previous: "‹",
          },
        },
      });
    } else {
      try {
        dtInstanceRef.current.clear();
        dtInstanceRef.current.rows.add(filteredLogs);
        dtInstanceRef.current.draw(false);
      } catch (err) {
        console.warn('DataTable redraw notice:', err);
      }
    }
  }, [filteredLogs, loading, isAdmin, isSpv, user?.id, user?.full_name, user?.username]);

  useEffect(() => {
    return () => {
      if (dtInstanceRef.current) {
        try {
          dtInstanceRef.current.destroy();
        } catch (e) {
          console.warn('Error cleanup DataTable:', e);
        }
        dtInstanceRef.current = null;
      }
      if (dtContainerRef.current) {
        dtContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Alert if Supabase tables are pending */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-start space-x-2.5 text-amber-800 text-xs shadow-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] sm:text-xs">
            <span className="font-bold">Info Database:</span> Menjalankan mode offline lokal. Jalankan script <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold text-amber-900">supabase_setup.sql</code> di Supabase SQL Editor untuk sinkronisasi cloud.
          </div>
        </div>
      )}

      {/* Top Header Section: Title & Responsive Metric Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Input Data Pass Box
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Pilih Kategori PRO (RM / PM) · No Pro · Tanggal · Pilihan Pass Box
          </p>
        </div>

        {/* Metric Cards: 2 Columns on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <StatCard label="TOTAL DATA" value={totalCount} accentColor="bg-slate-800" className="sm:min-w-[130px]" />
          <StatCard label="TANGGAL HARI INI" value={todayCount} accentColor="bg-sky-500" className="sm:min-w-[130px]" />
        </div>
      </div>

      {/* Main Grid: Left Form (lg:col-span-4) & Right Data (lg:col-span-8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column: Form Input Data */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Form Pencatatan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Wajib pilih tipe PRO terlebih dahulu sebelum mengisi No Pro.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. TIPE PRO (WAJIB DIPILIH SEBELUM KETIK NO PRO) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. TIPE PRO (WAJIB DIPILIH)
                </label>
                {!kategoriPro && (
                  <span className="text-[10px] text-rose-700 font-extrabold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded animate-pulse">
                    Pilih Dulu
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKategoriPro('RM');
                    setTimeout(() => noProInputRef.current?.focus(), 80);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-2 border shadow-xs ${
                    kategoriPro === 'RM'
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/25'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <Tag className={`w-3.5 h-3.5 ${kategoriPro === 'RM' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>PRO RM (Raw Material)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setKategoriPro('PM');
                    setTimeout(() => noProInputRef.current?.focus(), 80);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-2 border shadow-xs ${
                    kategoriPro === 'PM'
                      ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500/25'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <Tag className={`w-3.5 h-3.5 ${kategoriPro === 'PM' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>PRO PM (Packaging Material)</span>
                </button>
              </div>
            </div>

            {/* 2. NO PRO (TERKUNCI SAMPAI TIPE PRO DIPILIH) */}
            <div>
              <div className="flex items-center justify-between mb-1 tracking-wider">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  2. NOMOR PRO (HANYA ANGKA)
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Numerik Saja</span>
              </div>
              <div className="relative flex items-center">
                {kategoriPro ? (
                  <div className={`absolute left-2.5 z-10 px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                    kategoriPro === 'RM' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}>
                    {kategoriPro}
                  </div>
                ) : null}

                <input
                  ref={noProInputRef}
                  type="text"
                  required
                  disabled={!kategoriPro}
                  placeholder={!kategoriPro ? '⚠️ Pilih tipe PRO (RM / PM) di atas terlebih dahulu...' : 'Contoh: 105999'}
                  value={noPro}
                  onChange={(e) => setNoPro(e.target.value.replace(/\D/g, ''))}
                  className={`w-full h-11 pr-3.5 text-sm border rounded-xl focus:outline-none transition font-mono ${
                    duplicateWarning?.type === 'duplicate'
                      ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                      : kategoriPro 
                        ? 'border-slate-300 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white placeholder:font-sans placeholder:text-slate-400' 
                        : 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed text-xs'
                  } ${kategoriPro ? 'pl-16' : 'pl-3.5'}`}
                />
              </div>

              {duplicateWarning && (
                <div className={`mt-1.5 flex items-start space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                  duplicateWarning.type === 'duplicate'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{duplicateWarning.message}</span>
                </div>
              )}
            </div>

            {/* 3. TANGGAL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
                3. TANGGAL
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full h-11 px-3.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition bg-white"
              />
            </div>

            {/* 4. PASS BOX (CHOOSE SELECTION DARI MASTER ADMIN) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <span>4. PILIHAN PASS BOX</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Pilih salah satu (Wajib)</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {availablePassBoxes.map((pb) => {
                  const isSelected = passBox === pb.name;

                  return (
                    <button
                      key={pb.id}
                      type="button"
                      onClick={() => setPassBox(pb.name)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 border shadow-xs ${
                        isSelected
                          ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20 font-extrabold'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Box className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                      <span>{pb.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || !kategoriPro || !noPro.trim() || !passBox.trim() || Boolean(duplicateWarning?.type === 'duplicate')}
                className="flex-1 h-11 flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>
                  {submitting 
                    ? 'Menyimpan...' 
                    : duplicateWarning?.type === 'duplicate' 
                      ? 'No PRO Sudah Ada' 
                      : 'Simpan Data'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="h-11 px-4 flex items-center justify-center space-x-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl transition text-sm"
                title="Reset input"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Daftar Data, Filters, Table/Cards */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
          {/* Top Header: Title & Export Excel */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Daftar Data Pass Box</h2>
              <span className="text-xs text-slate-500">{filteredLogs.length} baris tercatat</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => downloadJSONBackup(user?.full_name)}
                title="Unduh file backup database lengkap format JSON (mencakup semua data transaksi)"
                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-300 hover:border-sky-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
              >
                <FileJson className="w-4 h-4 text-sky-600" />
                <span className="hidden sm:inline">Backup JSON</span>
              </button>

              <button
                onClick={() => exportLogsToExcel(filteredLogs)}
                className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Kategori + Pass Box + Search + Date Range */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Filter Tipe PRO */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs gap-1">
                <button
                  onClick={() => setFilterKategori('ALL')}
                  className={`px-2.5 py-1 rounded font-semibold transition ${
                    filterKategori === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua PRO
                </button>
                <button
                  onClick={() => setFilterKategori('RM')}
                  className={`px-2.5 py-1 rounded font-semibold transition ${
                    filterKategori === 'RM' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  RM
                </button>
                <button
                  onClick={() => setFilterKategori('PM')}
                  className={`px-2.5 py-1 rounded font-semibold transition ${
                    filterKategori === 'PM' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-700'
                  }`}
                >
                  PM
                </button>
              </div>

              {/* Filter Pass Box Dropdown */}
              <select
                value={filterPassBox}
                onChange={(e) => setFilterPassBox(e.target.value)}
                className="h-8 text-xs border border-slate-300 rounded-lg px-2 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Semua Pass Box</option>
                {availablePassBoxes.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No Pro, Pass Box, atau penginput..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 h-8 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Rentang Tanggal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 bg-white border border-slate-300 rounded px-2 text-slate-700 text-[11px] focus:outline-none"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-7 bg-white border border-slate-300 rounded px-2 text-slate-700 text-[11px] focus:outline-none"
                />
              </div>

              {(startDate || endDate || filterKategori !== 'ALL' || filterPassBox !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => { 
                    setStartDate(''); 
                    setEndDate(''); 
                    setFilterKategori('ALL'); 
                    setFilterPassBox('ALL'); 
                    setSearchQuery('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-[11px] underline"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          </div>

          {/* 1. MOBILE VIEW: High-Density Industrial Card List (block md:hidden) */}
          <div className="block md:hidden space-y-2.5">
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {loading ? 'Memuat data...' : 'Tidak ada data yang sesuai filter.'}
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const canModify = canUserModifyLog(log);
                const kat = log.kategori_pro || (log.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM');

                return (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition space-y-2"
                  >
                    {/* Top Row: Index + Kategori Badge + No Pro + Date Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          kat === 'RM' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {kat}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm font-mono tracking-tight">
                          {log.no_pro}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDateIndo(log.tanggal)}</span>
                      </div>
                    </div>

                    {/* Middle: Pass Box Selection Pill */}
                    <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-800 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Box className="w-3.5 h-3.5 text-sky-600" />
                        <span className="font-bold text-slate-800">{log.pass_box}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Cleanroom transfer</span>
                    </div>

                    {/* Bottom: Submitter & Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Diinput oleh: <strong className="text-slate-700">{log.user_name}</strong></span>
                      </div>

                      {canModify ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setEditingLog(log)}
                            className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs font-bold px-1.5" title="Hanya pembuat data atau Admin yang dapat mengubah">-</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. DESKTOP VIEW: DataTables.js Interactive Grid */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
            {/* Table Sorting Tip Banner */}
            <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-slate-500 border-b border-slate-100 mb-2">
              <span className="flex items-center space-x-1.5">
                <span className="text-sky-600 font-bold">⇅ Fitur Sortir:</span>
                <span>Klik judul kolom (<strong>TIPE, NO PRO, TANGGAL, PILIHAN PASS BOX, DIINPUT OLEH</strong>) untuk mengurutkan data naik atau turun.</span>
              </span>
              <span className="text-slate-400 hidden sm:inline text-[10px]">
                Default: Tanggal Terbaru
              </span>
            </div>

            {loading && (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Memuat data log Pass Box...</span>
              </div>
            )}

            <div
              ref={dtContainerRef}
              className={`w-full overflow-x-auto ${loading ? 'hidden' : 'block'}`}
            />
          </div>
        </div>
      </div>

      {/* Edit Log Modal */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          isOpen={!!editingLog}
          availablePassBoxes={availablePassBoxes}
          existingLogs={logs}
          onClose={() => setEditingLog(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};
