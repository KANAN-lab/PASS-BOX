import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { PassBoxLog, CheckerSummary } from '../types';
import { StatCard } from './StatCard';
import { formatDateTimeIndo } from '../utils/excel';
import { FileText, Clock, UserCheck } from 'lucide-react';

type PresetFilter = 'today' | '7days' | '30days' | 'all';

export const RekapTab: React.FC = () => {
  const [logs, setLogs] = useState<PassBoxLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Preset filter state
  const [preset, setPreset] = useState<PresetFilter>('today');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Load logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pass_box_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        const local = localStorage.getItem('local_pass_box_logs');
        if (local) {
          setLogs(JSON.parse(local));
        } else {
          setLogs([
            { id: 4, no_pro: 'Contoh', tanggal: '2026-09-30', pass_box: '1', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:19:00Z' },
            { id: 3, no_pro: '1059555', tanggal: '2026-09-30', pass_box: 'asbox 1 PM fani', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:18:00Z' },
            { id: 2, no_pro: 'contoh1', tanggal: '2026-09-30', pass_box: '1 PM', user_id: '22222222-2222-2222-2222-222222222222', user_name: 'Admin', created_at: '2026-09-30T10:14:00Z' },
            { id: 1, no_pro: '105999', tanggal: '2026-09-30', pass_box: 'pasbox 1. PM', user_id: '11111111-1111-1111-1111-111111111111', user_name: 'Cheker 1', created_at: '2026-09-30T10:10:00Z' },
          ]);
        }
      } else {
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSelectPreset = (selected: PresetFilter) => {
    setPreset(selected);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (selected === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (selected === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (selected === '30days') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (selected === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (startDate && log.tanggal < startDate) return false;
      if (endDate && log.tanggal > endDate) return false;
      return true;
    });
  }, [logs, startDate, endDate]);

  const summaries = useMemo(() => {
    const map = new Map<string, { total: number; dates: Set<string>; lastInput: string; userId: string }>();

    filteredLogs.forEach(log => {
      const name = log.user_name || 'Tanpa Nama';
      const existing = map.get(name) || {
        total: 0,
        dates: new Set<string>(),
        lastInput: log.created_at,
        userId: log.user_id,
      };

      existing.total += 1;
      existing.dates.add(log.tanggal);
      if (new Date(log.created_at) > new Date(existing.lastInput)) {
        existing.lastInput = log.created_at;
      }

      map.set(name, existing);
    });

    const result: CheckerSummary[] = [];
    map.forEach((val, checker_name) => {
      result.push({
        checker_name,
        user_id: val.userId,
        total_input: val.total,
        hari_aktif: val.dates.size,
        input_terakhir: val.lastInput,
      });
    });

    return result.sort((a, b) => b.total_input - a.total_input);
  }, [filteredLogs]);

  const maxTotal = useMemo(() => {
    if (summaries.length === 0) return 1;
    return Math.max(...summaries.map(s => s.total_input), 1);
  }, [summaries]);

  const activePeriodText = startDate && endDate
    ? `${startDate} s/d ${endDate}`
    : startDate
    ? `Mulai ${startDate}`
    : endDate
    ? `Hingga ${endDate}`
    : 'Semua Waktu';

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Header: Title & Stat Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Rekap Per Checker
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Jumlah input data berdasarkan tanggal pada kolom Tanggal.
          </p>
        </div>

        <div className="self-start sm:self-auto min-w-[140px]">
          <StatCard label="TOTAL PERIODE" value={filteredLogs.length} accentColor="bg-indigo-600" />
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3.5">
          {/* Preset Buttons Grid on Mobile */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handleSelectPreset('today')}
              className={`py-1.5 px-2.5 rounded-md text-[11px] sm:text-xs font-semibold text-center transition ${
                preset === 'today'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari ini
            </button>
            <button
              onClick={() => handleSelectPreset('7days')}
              className={`py-1.5 px-2.5 rounded-md text-[11px] sm:text-xs font-semibold text-center transition ${
                preset === '7days'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 hari
            </button>
            <button
              onClick={() => handleSelectPreset('30days')}
              className={`py-1.5 px-2.5 rounded-md text-[11px] sm:text-xs font-semibold text-center transition ${
                preset === '30days'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 hari
            </button>
            <button
              onClick={() => handleSelectPreset('all')}
              className={`py-1.5 px-2.5 rounded-md text-[11px] sm:text-xs font-semibold text-center transition ${
                preset === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('all');
              }}
              className="h-8 bg-white border border-slate-300 rounded px-2 text-slate-700 focus:outline-none text-[11px]"
            />
            <span className="hidden sm:inline text-slate-400 font-medium text-xs text-center">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('all');
              }}
              className="h-8 bg-white border border-slate-300 rounded px-2 text-slate-700 focus:outline-none text-[11px]"
            />
          </div>
        </div>

        {/* 1. Mobile Cards View (block md:hidden) */}
        <div className="block md:hidden space-y-2.5">
          {summaries.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
              {loading ? 'Memuat rekap data...' : 'Tidak ada aktivitas data pada periode ini.'}
            </div>
          ) : (
            summaries.map((item) => {
              const percent = Math.round((item.total_input / maxTotal) * 100);

              return (
                <div key={item.checker_name} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{item.checker_name}</span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 text-sky-600" />
                      <span>{item.hari_aktif} Hari Aktif</span>
                    </span>
                  </div>

                  {/* Progress Bar & Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium text-[11px]">Total Kontribusi</span>
                      <span className="font-bold text-sky-700">{item.total_input} input ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-sky-600 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  {/* Last Input */}
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Terakhir input: <strong className="text-slate-700 font-mono">{formatDateTimeIndo(item.input_terakhir)}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Table View (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-48">CHECKER</th>
                <th className="py-3 px-4 min-w-[280px]">TOTAL INPUT</th>
                <th className="py-3 px-4 text-center w-28">HARI AKTIF</th>
                <th className="py-3 px-4 w-44">INPUT TERAKHIR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    {loading ? 'Memuat rekap data...' : 'Tidak ada aktivitas data pada periode ini.'}
                  </td>
                </tr>
              ) : (
                summaries.map((item) => {
                  const percent = Math.round((item.total_input / maxTotal) * 100);

                  return (
                    <tr key={item.checker_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.checker_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-sky-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 min-w-[20px] text-right">
                            {item.total_input}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {item.hari_aktif}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {formatDateTimeIndo(item.input_terakhir)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="pt-2 flex items-center space-x-1.5 text-[11px] sm:text-xs text-slate-500">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Periode: {activePeriodText}</span>
        </div>
      </div>
    </div>
  );
};
