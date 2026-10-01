import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { PassBoxLog, KategoriPro, PassBoxMaster } from '../types';
import { showToast, showWarningAlert, showErrorAlert, showConfirmDialog } from '../utils/swal';
import { 
  X, 
  Save, 
  Layers, 
  Tag, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  ClipboardPaste,
  Check,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface ParsedProItem {
  id: string; // ID unik internal untuk baris tabel
  no_pro: string;
  kategori_pro: KategoriPro | '';
  pass_box: string;
  isDuplicateInDb: boolean;
  isDuplicateInBatch: boolean;
  duplicateInfo?: {
    tanggal: string;
    pass_box: string;
    user_name: string;
  };
}

interface MassInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePassBoxes?: PassBoxMaster[];
  existingLogs?: PassBoxLog[];
  onSuccess: (newLogs: PassBoxLog[]) => void;
}

export const MassInputModal: React.FC<MassInputModalProps> = ({
  isOpen,
  onClose,
  availablePassBoxes = [
    { id: 1, name: 'Pass Box 1', is_active: true },
    { id: 2, name: 'Pass Box 2', is_active: true },
  ],
  existingLogs = [],
  onSuccess,
}) => {
  const { user } = useAuth();

  // Pengaturan Seragam (Mass Defaults) - WAJIB DIPILIH MANUAL, TIDAK OTOMATIS TERPILIH
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [defaultKategori, setDefaultKategori] = useState<KategoriPro | ''>('');
  const [defaultPassBox, setDefaultPassBox] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(todayStr);

  // Raw Text input & parsed items
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState<ParsedProItem[]>([]);
  const [checkingDb, setCheckingDb] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset saat modal dibuka: Wajib mulai dalam keadaan KOSONG (tanpa auto-select)
  useEffect(() => {
    if (isOpen) {
      setDefaultKategori('');
      setDefaultPassBox('');
      setTanggal(todayStr);
      setRawText('');
      setItems([]);
    }
  }, [isOpen, todayStr]);

  // Fungsi Parser Teks Paste
  const parseRawText = (text: string, kat: KategoriPro | '', pb: string) => {
    if (!text.trim()) {
      setItems([]);
      return;
    }

    // Split per baris (mendukung newline Windows \r\n dan Unix \n)
    const lines = text.split(/\r?\n/);
    const seenInBatch = new Set<string>();
    const newItems: ParsedProItem[] = [];

    lines.forEach((line, index) => {
      // Hilangkan spasi & non-breaking space
      const cleanLine = line.replace(/\u00A0/g, ' ').trim();
      if (!cleanLine) return; // Lewati baris kosong otomatis

      // Hanya ambil angka
      const digitsOnly = cleanLine.replace(/\D/g, '');
      if (!digitsOnly) return; // Lewati jika tidak ada angka

      const isDupBatch = seenInBatch.has(digitsOnly);
      seenInBatch.add(digitsOnly);

      // Cek duplikasi di state lokal existingLogs terlebih dahulu
      const localDup = existingLogs.find(l => String(l.no_pro).trim() === digitsOnly);

      newItems.push({
        id: `item-${index}-${digitsOnly}-${Math.random()}`,
        no_pro: digitsOnly,
        kategori_pro: kat,
        pass_box: pb,
        isDuplicateInDb: Boolean(localDup),
        isDuplicateInBatch: isDupBatch,
        duplicateInfo: localDup ? {
          tanggal: localDup.tanggal,
          pass_box: localDup.pass_box,
          user_name: localDup.user_name || 'Tidak tercatat',
        } : undefined,
      });
    });

    setItems(newItems);

    // Jalankan validasi batch ke Supabase di latar belakang
    if (newItems.length > 0) {
      checkDatabaseDuplicates(newItems);
    }
  };

  // Cek duplikasi massal langsung ke Supabase
  const checkDatabaseDuplicates = async (currentItems: ParsedProItem[]) => {
    const uniquePros = Array.from(new Set(currentItems.map(i => i.no_pro)));
    if (uniquePros.length === 0) return;

    setCheckingDb(true);
    try {
      const { data, error } = await supabase
        .from('pass_box_logs')
        .select('no_pro, tanggal, pass_box, user_name')
        .in('no_pro', uniquePros);

      if (!error && data) {
        const dbMap = new Map<string, { tanggal: string; pass_box: string; user_name: string }>();
        data.forEach(d => {
          dbMap.set(String(d.no_pro).trim(), {
            tanggal: d.tanggal,
            pass_box: d.pass_box,
            user_name: d.user_name || 'Tidak tercatat',
          });
        });

        // Perbarui status item
        setItems(prev => prev.map(item => {
          const dbInfo = dbMap.get(item.no_pro);
          if (dbInfo) {
            return {
              ...item,
              isDuplicateInDb: true,
              duplicateInfo: dbInfo,
            };
          }
          return item;
        }));
      }
    } catch (err) {
      console.warn('Gagal cek duplikasi batch ke Supabase:', err);
    } finally {
      setCheckingDb(false);
    }
  };

  // Event saat textarea berubah
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    parseRawText(val, defaultKategori, defaultPassBox);
  };

  // Handler saat memilih Default Kategori di header
  const handleSelectDefaultKategori = (kat: KategoriPro) => {
    setDefaultKategori(kat);
    // Jika sudah ada item yang belum punya kategori, isi otomatis dengan pilihan ini
    if (items.length > 0) {
      setItems(prev => prev.map(item => item.kategori_pro === '' ? { ...item, kategori_pro: kat } : item));
    }
  };

  // Handler saat memilih Default Pass Box di header
  const handleSelectDefaultPassBox = (pb: string) => {
    setDefaultPassBox(pb);
    // Jika sudah ada item yang belum punya pass box, isi otomatis dengan pilihan ini
    if (pb && items.length > 0) {
      setItems(prev => prev.map(item => item.pass_box === '' ? { ...item, pass_box: pb } : item));
    }
  };

  // Terapkan default seragam (Mass Action) ke seluruh baris yang ada
  const handleApplyDefaultToAll = () => {
    if (!defaultKategori && !defaultPassBox) {
      showWarningAlert('Pilih Default Terlebih Dahulu', 'Pilih Tipe PRO Default dan/atau Pass Box Default di atas terlebih dahulu.');
      return;
    }

    setItems(prev => prev.map(item => ({
      ...item,
      kategori_pro: defaultKategori || item.kategori_pro,
      pass_box: defaultPassBox || item.pass_box,
    })));
    showToast('Nilai default berhasil diterapkan ke seluruh baris.', 'info', 2500);
  };

  // Ubah Kategori Selektif per baris
  const handleUpdateItemKategori = (id: string, newKategori: KategoriPro) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, kategori_pro: newKategori } : item));
  };

  // Ubah Pass Box Selektif per baris
  const handleUpdateItemPassBox = (id: string, newPassBox: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, pass_box: newPassBox } : item));
  };

  // Hapus item dari daftar
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Bersihkan semua
  const handleClearAll = () => {
    setRawText('');
    setItems([]);
  };

  // Hitung metrik validasi
  const duplicateDbCount = useMemo(() => {
    return items.filter(i => i.isDuplicateInDb).length;
  }, [items]);

  const duplicateBatchCount = useMemo(() => {
    return items.filter(i => i.isDuplicateInBatch).length;
  }, [items]);

  // Jumlah baris yang belum memilih Kategori atau Pass Box
  const incompleteCount = useMemo(() => {
    return items.filter(i => !i.isDuplicateInDb && !i.isDuplicateInBatch && (!i.kategori_pro || !i.pass_box)).length;
  }, [items]);

  // Item yang 100% valid dan lengkap
  const validItems = useMemo(() => {
    return items.filter(i => 
      !i.isDuplicateInDb && 
      !i.isDuplicateInBatch && 
      Boolean(i.kategori_pro) && 
      Boolean(i.pass_box)
    );
  }, [items]);

  // Submit Mass Data ke Supabase
  const handleSaveMassData = async () => {
    if (items.length === 0) {
      showWarningAlert('Data Belum Ada', 'Tempel daftar nomor PRO terlebih dahulu.');
      return;
    }

    if (incompleteCount > 0) {
      showWarningAlert(
        'Pilihan Belum Lengkap',
        `Terdapat <b>${incompleteCount} baris nomor PRO</b> yang belum ditentukan Tipe PRO (RM/PM) atau Pass Box-nya.<br/><br/>Harap lengkapi pilihan di masing-masing baris, atau gunakan tombol <b>"Terapkan Default ke Semua Baris"</b> di atas.`
      );
      return;
    }

    if (validItems.length === 0) {
      showWarningAlert('Data Tidak Valid', 'Tidak ada data nomor PRO yang valid untuk disimpan.');
      return;
    }

    const confirmText = duplicateDbCount > 0 || duplicateBatchCount > 0
      ? `Dari total <b>${items.length}</b> baris, sebanyak <b>${validItems.length} data valid & lengkap</b> akan disimpan.<br/><br/><span class="text-rose-600 font-semibold">${duplicateDbCount + duplicateBatchCount} data duplikat akan otomatis dilewati.</span><br/><br/>Lanjutkan proses simpan massal?`
      : `Sistem akan menyimpan <b>${validItems.length} data log PRO</b> sekaligus ke database Supabase.<br/><br/>Lanjutkan?`;

    const confirmed = await showConfirmDialog(
      'Konfirmasi Simpan Massal',
      confirmText,
      `Ya, Simpan ${validItems.length} Data`
    );

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const recordsToInsert = validItems.map(item => ({
        kategori_pro: item.kategori_pro as KategoriPro,
        no_pro: item.no_pro,
        tanggal,
        pass_box: item.pass_box,
        user_id: user?.id || null,
        user_name: user?.full_name || user?.username || 'Checker',
      }));

      // Eksekusi insert batch ke Supabase
      const { data, error } = await supabase
        .from('pass_box_logs')
        .insert(recordsToInsert)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      const insertedLogs: PassBoxLog[] = data || recordsToInsert.map((r, idx) => ({
        id: Date.now() + idx,
        ...r,
        created_at: new Date().toISOString(),
      }));

      onSuccess(insertedLogs);
      showToast(`Berhasil menyimpan ${insertedLogs.length} data log PRO!`, 'success', 3500);
      handleClearAll();
      onClose();
    } catch (err: any) {
      showErrorAlert('Gagal Menyimpan Data Massal', err.message || 'Terjadi kesalahan sistem saat batch insert.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <span>Mass Input Data PRO</span>
                <span className="text-[11px] bg-sky-100 text-sky-800 border border-sky-200 font-bold px-2 py-0.5 rounded-full">
                  Copy-Paste Excel
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Pilih Tipe PRO dan Pass Box secara massal (seragam) atau selektif (per baris).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Section 1: Pengaturan Seragam / Mass Defaults */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 border-b border-slate-200/60 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. PENGATURAN DEFAULT (MASSAL)
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  — Tidak otomatis dipilih, wajib ditentukan manual
                </span>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyDefaultToAll}
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-100/80 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shadow-2xs"
                  title="Terapkan Kategori dan Pass Box default ke seluruh baris tabel di bawah"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Terapkan Default ke Semua Baris</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Default Kategori PRO (Tidak auto-pilih) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Tipe PRO Default
                  </label>
                  {!defaultKategori && (
                    <span className="text-[10px] text-rose-700 font-extrabold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded animate-pulse">
                      Wajib Pilih
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDefaultKategori('RM')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition border flex items-center justify-center space-x-1.5 ${
                      defaultKategori === 'RM'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>PRO RM</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDefaultKategori('PM')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition border flex items-center justify-center space-x-1.5 ${
                      defaultKategori === 'PM'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>PRO PM</span>
                  </button>
                </div>
              </div>

              {/* Default Pass Box (Tidak auto-pilih) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Pass Box Default
                  </label>
                  {!defaultPassBox && (
                    <span className="text-[10px] text-rose-700 font-extrabold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded animate-pulse">
                      Wajib Pilih
                    </span>
                  )}
                </div>
                <select
                  value={defaultPassBox}
                  onChange={(e) => handleSelectDefaultPassBox(e.target.value)}
                  className={`w-full h-8 text-xs font-bold border rounded-lg px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                    !defaultPassBox ? 'border-amber-300 bg-amber-50/20 text-amber-900' : 'border-slate-300'
                  }`}
                >
                  <option value="">-- Wajib Pilih Pass Box --</option>
                  {availablePassBoxes.map(pb => (
                    <option key={pb.id} value={pb.name}>
                      {pb.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Tanggal Dokumen
                  </label>
                </div>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full h-8 text-xs font-semibold border border-slate-300 rounded-lg px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Textarea Copy-Paste */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <ClipboardPaste className="w-3.5 h-3.5 text-sky-600" />
                <span>2. TEMPEL (PASTE) DAFTAR NOMOR PRO DARI EXCEL</span>
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Kosongkan Teks</span>
                </button>
              )}
            </div>

            <textarea
              rows={4}
              value={rawText}
              onChange={handleTextareaChange}
              placeholder={`Contoh tempel kolom Excel:\n10594813\n10594814\n10594815\n\n(Baris kosong otomatis diabaikan, spasi dibersihkan)`}
              className="w-full p-3 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white placeholder:font-sans placeholder:text-slate-400 leading-relaxed resize-y"
            />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <HelpCircle className="w-3 h-3 shrink-0" />
              <span>Salin satu kolom nomor PRO di Excel lalu tempel (Ctrl+V) ke kotak di atas. Pengaturan bisa massal atau selektif di tabel bawah.</span>
            </p>
          </div>

          {/* Section 3: Pratinjau & Kontrol Selektif */}
          {items.length > 0 && (
            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              {/* Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-700">
                    Total Terdeteksi: <span className="font-mono text-slate-900">{items.length}</span>
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Siap Simpan: <span className="font-mono">{validItems.length}</span></span>
                  </span>
                  {incompleteCount > 0 && (
                    <span className="font-bold text-amber-700 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Belum Lengkap: <span className="font-mono">{incompleteCount}</span></span>
                    </span>
                  )}
                  {duplicateDbCount > 0 && (
                    <span className="font-bold text-rose-700 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Duplikat di Database: <span className="font-mono">{duplicateDbCount}</span></span>
                    </span>
                  )}
                  {duplicateBatchCount > 0 && (
                    <span className="font-bold text-amber-700 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Kembar di List: <span className="font-mono">{duplicateBatchCount}</span></span>
                    </span>
                  )}
                </div>

                {checkingDb && (
                  <span className="text-[11px] text-sky-600 font-semibold animate-pulse">
                    Memeriksa duplikasi ke database...
                  </span>
                )}
              </div>

              {/* Table Preview Selektif */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">NO PRO</th>
                      <th className="py-2 px-3">TIPE PRO (SELEKTIF)</th>
                      <th className="py-2 px-3">PASS BOX (SELEKTIF)</th>
                      <th className="py-2 px-3">STATUS</th>
                      <th className="py-2 px-2 text-center w-12">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => {
                      const isDup = item.isDuplicateInDb || item.isDuplicateInBatch;
                      const isIncomplete = !item.kategori_pro || !item.pass_box;

                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isDup ? 'bg-rose-50/40' : isIncomplete ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {item.no_pro}
                          </td>
                          {/* Pilihan Selektif Kategori PRO per Baris */}
                          <td className="py-2 px-3">
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemKategori(item.id, 'RM')}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold border transition ${
                                  item.kategori_pro === 'RM'
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                RM
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemKategori(item.id, 'PM')}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold border transition ${
                                  item.kategori_pro === 'PM'
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                PM
                              </button>
                              {!item.kategori_pro && (
                                <span className="text-[10px] text-rose-600 font-bold ml-1">
                                  (Pilih)
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Pilihan Selektif Pass Box per Baris */}
                          <td className="py-2 px-3">
                            <select
                              value={item.pass_box}
                              onChange={(e) => handleUpdateItemPassBox(item.id, e.target.value)}
                              className={`h-6 text-[11px] font-semibold border rounded px-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                !item.pass_box ? 'border-amber-400 bg-amber-50/50 text-amber-800' : 'border-slate-300'
                              }`}
                            >
                              <option value="">-- Pilih Pass Box --</option>
                              {availablePassBoxes.map(pb => (
                                <option key={pb.id} value={pb.name}>
                                  {pb.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Status Validasi */}
                          <td className="py-2 px-3">
                            {item.isDuplicateInDb ? (
                              <span 
                                className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded"
                                title={`Pernah diinput pada: ${item.duplicateInfo?.tanggal || ''} (${item.duplicateInfo?.pass_box || ''}) oleh ${item.duplicateInfo?.user_name || ''}`}
                              >
                                Duplikat di DB ({item.duplicateInfo?.tanggal || 'Tercatat'})
                              </span>
                            ) : item.isDuplicateInBatch ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                Kembar di List
                              </span>
                            ) : !item.kategori_pro || !item.pass_box ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                Belum Lengkap ({!item.kategori_pro && !item.pass_box ? 'Tipe & Pass Box' : !item.kategori_pro ? 'Tipe PRO' : 'Pass Box'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <Check className="w-3 h-3 mr-0.5" />
                                Valid & Siap
                              </span>
                            )}
                          </td>
                          {/* Tombol Hapus Baris */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <div className="text-xs text-slate-500">
            {incompleteCount > 0 ? (
              <span className="text-amber-700 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Ada <b>{incompleteCount}</b> baris belum lengkap (pilih Tipe PRO / Pass Box).</span>
              </span>
            ) : validItems.length > 0 ? (
              <span className="text-emerald-700 font-semibold">
                Siap menyimpan <b>{validItems.length}</b> data log PRO lengkap.
              </span>
            ) : (
              <span>Tempel nomor PRO dan tentukan Tipe & Pass Box untuk memulai.</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveMassData}
              disabled={submitting || validItems.length === 0 || incompleteCount > 0}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl transition disabled:opacity-50 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>
                {submitting 
                  ? 'Menyimpan...' 
                  : incompleteCount > 0 
                    ? `Lengkapi Pilihan (${incompleteCount} Belum Lengkap)` 
                    : validItems.length > 0 
                      ? `Simpan ${validItems.length} Data PRO` 
                      : 'Simpan Semua Data'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
