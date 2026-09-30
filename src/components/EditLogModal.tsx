import React, { useState, useEffect } from 'react';
import type { PassBoxLog, KategoriPro, PassBoxMaster } from '../types';
import { X, Save, Box } from 'lucide-react';

interface EditLogModalProps {
  log: PassBoxLog | null;
  isOpen: boolean;
  onClose: () => void;
  availablePassBoxes?: PassBoxMaster[];
  onSave: (updatedLog: { id: number; kategori_pro: KategoriPro; no_pro: string; tanggal: string; pass_box: string }) => Promise<void>;
}

export const EditLogModal: React.FC<EditLogModalProps> = ({ 
  log, 
  isOpen, 
  onClose, 
  availablePassBoxes = [
    { id: 1, name: 'Pass Box 1', is_active: true },
    { id: 2, name: 'Pass Box 2', is_active: true },
  ],
  onSave 
}) => {
  const [kategoriPro, setKategoriPro] = useState<KategoriPro>('RM');
  const [noPro, setNoPro] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [passBox, setPassBox] = useState('Pass Box 1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (log) {
      setKategoriPro(log.kategori_pro || 'RM');
      setNoPro(log.no_pro);
      setTanggal(log.tanggal);
      setPassBox(log.pass_box);
    }
  }, [log]);

  if (!isOpen || !log) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noPro.trim() || !tanggal || !passBox.trim()) return;

    setSaving(true);
    try {
      await onSave({
        id: log.id,
        kategori_pro: kategoriPro,
        no_pro: noPro.trim(),
        tanggal,
        pass_box: passBox.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-base font-bold text-slate-800">Edit Data Log Pass Box</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 1. Kategori PRO */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
              1. Tipe PRO
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKategoriPro('RM')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                  kategoriPro === 'RM'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                PRO RM
              </button>
              <button
                type="button"
                onClick={() => setKategoriPro('PM')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                  kategoriPro === 'PM'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                PRO PM
              </button>
            </div>
          </div>

          {/* 2. No Pro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
              2. NO PRO
            </label>
            <input
              type="text"
              required
              value={noPro}
              onChange={(e) => setNoPro(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
            />
          </div>

          {/* 3. Tanggal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
              3. TANGGAL
            </label>
            <input
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* 4. Pilihan Pass Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wider">
              4. Pilihan Pass Box
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availablePassBoxes.map((pb) => (
                <button
                  key={pb.id}
                  type="button"
                  onClick={() => setPassBox(pb.name)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                    passBox === pb.name
                      ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>{pb.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
