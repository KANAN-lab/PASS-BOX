import React, { useState, useEffect } from 'react';
import type { PassBoxLog } from '../types';
import { X, Save } from 'lucide-react';

interface EditLogModalProps {
  log: PassBoxLog | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLog: { id: number; no_pro: string; tanggal: string; pass_box: string }) => Promise<void>;
}

export const EditLogModal: React.FC<EditLogModalProps> = ({ log, isOpen, onClose, onSave }) => {
  const [noPro, setNoPro] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [passBox, setPassBox] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (log) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-base font-semibold text-slate-800">Edit Data Pass Box</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              1. NO PRO
            </label>
            <input
              type="text"
              required
              value={noPro}
              onChange={(e) => setNoPro(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              2. TANGGAL
            </label>
            <input
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              3. PASS BOX
            </label>
            <textarea
              required
              rows={3}
              value={passBox}
              onChange={(e) => setPassBox(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition disabled:opacity-50 shadow-sm"
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
