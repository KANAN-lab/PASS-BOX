import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { PassBoxLog, CheckerSummary } from '../types';
import { StatCard } from './StatCard';
import { exportLogsToExcel, formatDateIndo, formatDateTimeIndo } from '../utils/excel';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  PieChart as PieIcon, 
  UserCheck, 
  RefreshCw,
  Clock,
  Zap
} from 'lucide-react';
import Chart, { type ChartOptions } from 'chart.js/auto';

type PresetFilter = 'today' | '7days' | '30days' | 'all';

export const RekapTab: React.FC = () => {
  const [logs, setLogs] = useState<PassBoxLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Preset filter state
  const [preset, setPreset] = useState<PresetFilter>('30days');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Canvas refs for Chart.js
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const donutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hourlyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const trendChartInstance = useRef<Chart | null>(null);
  const donutChartInstance = useRef<Chart | null>(null);
  const hourlyChartInstance = useRef<Chart | null>(null);

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

  // Checker summaries
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

  // Daily statistics for Trend Chart
  const dailyStats = useMemo(() => {
    const countsByDate = new Map<string, number>();

    const sorted = [...filteredLogs].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    sorted.forEach(l => {
      countsByDate.set(l.tanggal, (countsByDate.get(l.tanggal) || 0) + 1);
    });

    const labels: string[] = [];
    const counts: number[] = [];

    countsByDate.forEach((cnt, date) => {
      labels.push(formatDateIndo(date));
      counts.push(cnt);
    });

    return { labels, counts, totalDays: countsByDate.size };
  }, [filteredLogs]);

  // Hourly & Shift Statistics for Jam Sibuk
  const hourlyStats = useMemo(() => {
    const hours = new Array(24).fill(0);
    const shifts = { shift1: 0, shift2: 0, shift3: 0 };

    filteredLogs.forEach(l => {
      try {
        const d = new Date(l.created_at);
        const h = d.getHours();
        if (h >= 0 && h < 24) {
          hours[h] += 1;
        }
        if (h >= 7 && h < 15) {
          shifts.shift1 += 1;
        } else if (h >= 15 && h < 23) {
          shifts.shift2 += 1;
        } else {
          shifts.shift3 += 1;
        }
      } catch {
        // ignore
      }
    });

    const maxVal = Math.max(...hours, 0);
    const peakHour = maxVal > 0 ? hours.indexOf(maxVal) : -1;
    const peakHourStr = peakHour >= 0
      ? `${String(peakHour).padStart(2, '0')}:00 - ${String(peakHour + 1).padStart(2, '0')}:00`
      : 'Belum ada data';

    return {
      hours,
      shifts,
      maxVal,
      peakHour,
      peakHourStr,
    };
  }, [filteredLogs]);

  // Executive Metrics
  const totalVolume = filteredLogs.length;
  const activeCheckers = summaries.length;
  const topChecker = summaries[0]?.checker_name || '-';
  const avgPerDay = dailyStats.totalDays > 0 ? (totalVolume / dailyStats.totalDays).toFixed(1) : '0';

  // 1. Initialize & Update Chart.js Trend Line
  useEffect(() => {
    if (!trendCanvasRef.current) return;

    if (trendChartInstance.current) {
      trendChartInstance.current.destroy();
    }

    const ctx = trendCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = dailyStats.labels.length > 0 ? dailyStats.labels : ['Belum ada data'];
    const dataPoints = dailyStats.counts.length > 0 ? dailyStats.counts : [0];

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(2, 132, 199, 0.22)');
    gradient.addColorStop(1, 'rgba(2, 132, 199, 0.01)');

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (item) => `Total: ${item.formattedValue} input pass box`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 10 },
            color: '#64748b',
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...dataPoints, 5) + 1,
          ticks: {
            stepSize: 1,
            font: { size: 10 },
            color: '#64748b',
          },
          grid: {
            color: '#f1f5f9',
          },
        },
      },
    };

    trendChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Transaksi Pass Box',
            data: dataPoints,
            borderColor: '#0284c7',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointBackgroundColor: '#0284c7',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options,
    });

    return () => {
      trendChartInstance.current?.destroy();
    };
  }, [dailyStats]);

  // 2. Initialize & Update Chart.js Donut (Checker distribution)
  useEffect(() => {
    if (!donutCanvasRef.current) return;

    if (donutChartInstance.current) {
      donutChartInstance.current.destroy();
    }

    const ctx = donutCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = summaries.map(s => s.checker_name);
    const dataPoints = summaries.map(s => s.total_input);

    const palette = [
      '#0284c7', // Sky
      '#4f46e5', // Indigo
      '#0d9488', // Teal
      '#ea580c', // Orange
      '#8b5cf6', // Violet
      '#10b981', // Emerald
      '#64748b', // Slate
    ];

    donutChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Belum ada data'],
        datasets: [
          {
            data: dataPoints.length > 0 ? dataPoints : [1],
            backgroundColor: dataPoints.length > 0 ? palette.slice(0, labels.length) : ['#e2e8f0'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
              padding: 12,
              color: '#334155',
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (item) => {
                if (dataPoints.length === 0) return ' Tidak ada data';
                const count = item.parsed;
                const pct = totalVolume > 0 ? ((count / totalVolume) * 100).toFixed(1) : 0;
                return ` ${item.label}: ${count} input (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      donutChartInstance.current?.destroy();
    };
  }, [summaries, totalVolume]);

  // 3. Initialize & Update Chart.js Hourly Bar Chart (Jam Sibuk)
  useEffect(() => {
    if (!hourlyCanvasRef.current) return;

    if (hourlyChartInstance.current) {
      hourlyChartInstance.current.destroy();
    }

    const ctx = hourlyCanvasRef.current.getContext('2d');
    if (!ctx) return;

    // Tampilkan jam operasional aktif (06:00 s/d 22:00)
    const hoursToDisplay = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const labels = hoursToDisplay.map(h => `${String(h).padStart(2, '0')}:00`);
    const dataPoints = hoursToDisplay.map(h => hourlyStats.hours[h]);
    
    // Highlight jam puncak dengan warna amber emas
    const bgColors = hoursToDisplay.map(h => 
      h === hourlyStats.peakHour && hourlyStats.hours[h] > 0 ? '#f59e0b' : '#0284c7'
    );

    hourlyChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Transaksi Pass Box',
            data: dataPoints,
            backgroundColor: bgColors,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items) => `Rentang Pukul ${items[0].label}`,
              label: (item) => {
                const hourNum = hoursToDisplay[item.dataIndex];
                const isPeak = hourNum === hourlyStats.peakHour;
                return ` Volume: ${item.formattedValue} transaksi${isPeak ? ' (★ JAM SIBUK / PEAK)' : ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10 },
              color: '#64748b',
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(...dataPoints, 4) + 1,
            ticks: {
              stepSize: 1,
              font: { size: 10 },
              color: '#64748b',
            },
            grid: {
              color: '#f1f5f9',
            },
          },
        },
      },
    });

    return () => {
      hourlyChartInstance.current?.destroy();
    };
  }, [hourlyStats]);

  const activePeriodText = startDate && endDate
    ? `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`
    : startDate
    ? `Mulai ${formatDateIndo(startDate)}`
    : endDate
    ? `Hingga ${formatDateIndo(endDate)}`
    : 'Semua Waktu';

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Header: Title & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            <span>Rekapitulasi & Analitik Pass Box</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Analisis tren pergerakan cleanroom pass box, kontribusi checker, dan laporan eksekutif.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            title="Segarkan data rekap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => exportLogsToExcel(filteredLogs, 'Laporan_Eksekutif_Pass_Box')}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel Profesional</span>
          </button>
        </div>
      </div>

      {/* Filter Control Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Quick Presets */}
        <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['today', '7days', '30days', 'all'] as PresetFilter[]).map((p) => {
            const labels: Record<PresetFilter, string> = {
              today: 'Hari ini',
              '7days': '7 Hari',
              '30days': '30 Hari',
              all: 'Semua',
            };

            return (
              <button
                key={p}
                onClick={() => handleSelectPreset(p)}
                className={`py-1.5 px-3 rounded-md text-[11px] sm:text-xs font-semibold text-center transition ${
                  preset === p
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center space-x-2">
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPreset('all');
                setStartDate(e.target.value);
              }}
              className="h-8 bg-white border border-slate-300 rounded px-2 text-slate-700 focus:outline-none text-[11px]"
              title="Tanggal Awal"
            />
            <span className="hidden sm:inline text-slate-400 font-medium text-[11px] px-1">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset('all');
                setEndDate(e.target.value);
              }}
              className="h-8 bg-white border border-slate-300 rounded px-2 text-slate-700 focus:outline-none text-[11px]"
              title="Tanggal Akhir"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setPreset('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-slate-400 hover:text-slate-600 text-[11px] underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard 
          label="TOTAL VOLUME PERIODE" 
          value={totalVolume} 
          accentColor="bg-sky-600" 
        />
        <StatCard 
          label="CHECKER AKTIF" 
          value={activeCheckers} 
          accentColor="bg-indigo-600" 
        />
        <StatCard 
          label="TOP CHECKER" 
          value={topChecker} 
          accentColor="bg-amber-500" 
        />
        <StatCard 
          label="RATA-RATA / HARI" 
          value={`${avgPerDay} /hr`} 
          accentColor="bg-teal-600" 
        />
      </div>

      {/* Analytical Charts Grid: Left Trend Line (lg:col-span-8), Right Donut (lg:col-span-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Left: Trend Aktivitas Harian */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <span>Tren Aktivitas Harian</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Periode: <strong className="text-slate-700">{activePeriodText}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                {dailyStats.totalDays} Hari Aktif
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full relative">
            <canvas ref={trendCanvasRef} />
          </div>
        </div>

        {/* Right: Distribusi Proporsi Checker */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-1.5">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              <span>Proporsi Kontribusi Checker</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Porsi input masing-masing checker
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full relative flex items-center justify-center">
            <canvas ref={donutCanvasRef} />
          </div>
        </div>
      </div>

      {/* NEW: Analisis Jam Sibuk & Beban Shift Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header with Peak Hour Highlight Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Analisis Jam Sibuk & Beban Shift (Cleanroom Traffic)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi frekuensi perpindahan material melalui pass box per jam kerja
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Jam Paling Sibuk: {hourlyStats.peakHourStr} ({hourlyStats.maxVal} Transaksi)</span>
            </div>
          </div>
        </div>

        {/* 3 Shift Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Shift 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Shift 1 (Pagi)</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded">
                07:00 - 15:00
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-slate-900">{hourlyStats.shifts.shift1}</span>
              <span className="text-xs text-slate-500">transaksi</span>
              <span className="text-xs font-bold text-sky-600 ml-auto">
                {totalVolume > 0 ? ((hourlyStats.shifts.shift1 / totalVolume) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-sky-600 h-full rounded-full" 
                style={{ width: `${totalVolume > 0 ? (hourlyStats.shifts.shift1 / totalVolume) * 100 : 0}%` }} 
              />
            </div>
          </div>

          {/* Shift 2 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Shift 2 (Sore)</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded">
                15:00 - 23:00
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-slate-900">{hourlyStats.shifts.shift2}</span>
              <span className="text-xs text-slate-500">transaksi</span>
              <span className="text-xs font-bold text-indigo-600 ml-auto">
                {totalVolume > 0 ? ((hourlyStats.shifts.shift2 / totalVolume) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full" 
                style={{ width: `${totalVolume > 0 ? (hourlyStats.shifts.shift2 / totalVolume) * 100 : 0}%` }} 
              />
            </div>
          </div>

          {/* Shift 3 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Shift 3 (Malam)</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                23:00 - 07:00
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-slate-900">{hourlyStats.shifts.shift3}</span>
              <span className="text-xs text-slate-500">transaksi</span>
              <span className="text-xs font-bold text-purple-600 ml-auto">
                {totalVolume > 0 ? ((hourlyStats.shifts.shift3 / totalVolume) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-purple-600 h-full rounded-full" 
                style={{ width: `${totalVolume > 0 ? (hourlyStats.shifts.shift3 / totalVolume) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Hourly Histogram Chart */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Histogram Frekuensi Per Jam (06:00 - 22:00)</span>
            <div className="flex items-center space-x-3 text-[11px] text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-sky-600 inline-block" />
                <span>Volume Jam Normal</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                <span className="font-bold text-amber-700">Jam Puncak (Peak)</span>
              </span>
            </div>
          </div>
          <div className="h-52 sm:h-60 w-full relative">
            <canvas ref={hourlyCanvasRef} />
          </div>
        </div>
      </div>

      {/* Checker Leaderboard & Details */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <span>Rincian Kinerja Checker</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Urutan berdasarkan volume input dokumen selama periode terpilih
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {summaries.length} Checker
          </span>
        </div>

        {/* 1. Mobile Cards (block md:hidden) */}
        <div className="block md:hidden space-y-3">
          {summaries.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
              {loading ? 'Menghitung rekap...' : 'Tidak ada catatan input pada rentang tanggal ini.'}
            </div>
          ) : (
            summaries.map((s, idx) => {
              const pct = totalVolume > 0 ? ((s.total_input / totalVolume) * 100).toFixed(1) : '0';

              return (
                <div key={s.checker_name} className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        idx === 0 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : idx === 1 
                          ? 'bg-slate-200 text-slate-800' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {s.checker_name}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sky-700 text-base">
                        {s.total_input}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">kali</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Porsi Kontribusi: {pct}%</span>
                      <span>{s.hari_aktif} hari aktif</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                    <span>Input Terakhir:</span>
                    <strong className="text-slate-700">{formatDateTimeIndo(s.input_terakhir)}</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">RANK</th>
                <th className="py-3 px-4">NAMA CHECKER</th>
                <th className="py-3 px-4 text-center">TOTAL INPUT</th>
                <th className="py-3 px-4 text-center">HARI AKTIF</th>
                <th className="py-3 px-4 w-44">KONTRIBUSI</th>
                <th className="py-3 px-4">INPUT TERAKHIR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {loading ? 'Menghitung rekap...' : 'Tidak ada catatan input pada rentang tanggal ini.'}
                  </td>
                </tr>
              ) : (
                summaries.map((s, idx) => {
                  const pct = totalVolume > 0 ? ((s.total_input / totalVolume) * 100).toFixed(1) : '0';

                  return (
                    <tr key={s.checker_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                          idx === 0 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : idx === 1 
                            ? 'bg-slate-200 text-slate-800' 
                            : idx === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {s.checker_name}
                      </td>

                      <td className="py-3 px-4 text-center font-extrabold text-sky-700 text-sm">
                        {s.total_input}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-600">
                        {s.hari_aktif} hari
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-sky-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 w-11 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {formatDateTimeIndo(s.input_terakhir)}
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
  );
};
