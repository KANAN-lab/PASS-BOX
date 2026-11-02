import * as XLSX from 'xlsx';
import type { PassBoxLog } from '../types';

export type ShiftType = 'all' | 'shift1' | 'shift2' | 'shift3';

export interface ShiftConfig {
  id: ShiftType;
  label: string;
  timeRange: string;
  desc: string;
}

export const SHIFT_OPTIONS: Record<ShiftType, ShiftConfig> = {
  all: {
    id: 'all',
    label: 'Semua Shift',
    timeRange: '24 Jam Penuh',
    desc: 'Semua shift operasional (00.00 - 24.00 WIB)',
  },
  shift1: {
    id: 'shift1',
    label: 'Shift 1',
    timeRange: '07.00 - 15.00 WIB',
    desc: 'Shift Pagi (07.00 - 15.00 WIB)',
  },
  shift2: {
    id: 'shift2',
    label: 'Shift 2',
    timeRange: '15.00 - 23.00 WIB',
    desc: 'Shift Sore (15.00 - 23.00 WIB)',
  },
  shift3: {
    id: 'shift3',
    label: 'Shift 3',
    timeRange: '23.00 - 07.00 WIB',
    desc: 'Shift Malam (23.00 - 07.00 WIB)',
  },
};

/**
 * Menentukan shift operasional berdasarkan waktu created_at:
 * - Shift 1: 07.00 - 15.00 (07:00:00 - 14:59:59)
 * - Shift 2: 15.00 - 23.00 (15:00:00 - 22:59:59)
 * - Shift 3: 23.00 - 07.00 (23:00:00 - 06:59:59)
 */
export function getLogShift(dateTimeStr?: string): 'shift1' | 'shift2' | 'shift3' | null {
  if (!dateTimeStr) return null;
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return null;
    const h = d.getHours();
    if (h >= 7 && h < 15) {
      return 'shift1';
    } else if (h >= 15 && h < 23) {
      return 'shift2';
    } else {
      return 'shift3';
    }
  } catch {
    return null;
  }
}

/**
 * Memfilter log berdasarkan shift yang dipilih
 */
export function filterLogsByShift(logs: PassBoxLog[], shift: ShiftType): PassBoxLog[] {
  if (shift === 'all') return logs;
  return logs.filter((l) => getLogShift(l.created_at) === shift);
}

/**
 * Format nama tampilan shift untuk tabel
 */
export function getShiftDisplayName(shift: 'shift1' | 'shift2' | 'shift3' | null): string {
  if (shift === 'shift1') return 'Shift 1 (07.00-15.00)';
  if (shift === 'shift2') return 'Shift 2 (15.00-23.00)';
  if (shift === 'shift3') return 'Shift 3 (23.00-07.00)';
  return '-';
}

export function exportLogsToExcel(
  logs: PassBoxLog[], 
  filenamePrefix = 'Laporan_Pass_Box_Diamond',
  shift: ShiftType = 'all'
) {
  const targetLogs = filterLogsByShift(logs, shift);
  const shiftInfo = SHIFT_OPTIONS[shift] || SHIFT_OPTIONS.all;
  const workbook = XLSX.utils.book_new();
  const exportTimeStr = formatDateTimeIndo(new Date().toISOString());

  const shiftLabelText = shift === 'all' 
    ? 'Semua Shift (24 Jam)' 
    : `${shiftInfo.label} (${shiftInfo.timeRange})`;

  // ==========================================
  // SHEET 1: DATA DETAIL LOG PASS BOX
  // ==========================================
  const detailAoa: any[][] = [
    ['PT. DIAMOND COLD STORAGE'],
    ['LAPORAN OPERASIONAL PASS BOX LOG - DEPARTEMEN RMPM'],
    [`Filter Shift: ${shiftLabelText}  |  Tanggal Ekspor: ${exportTimeStr}  |  Total Data: ${targetLogs.length} Baris`],
    [], // Blank line
    ['NO', 'TIPE PRO', 'NO PRO', 'TANGGAL DOKUMEN', 'PILIHAN PASS BOX', 'DIINPUT OLEH', 'WAKTU INPUT SISTEM', 'SHIFT KERJA'],
  ];

  targetLogs.forEach((log, idx) => {
    const kat = log.kategori_pro || (log.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM');
    const logShift = getShiftDisplayName(getLogShift(log.created_at));
    detailAoa.push([
      idx + 1,
      kat,
      log.no_pro,
      formatDateIndo(log.tanggal),
      log.pass_box,
      log.user_name || 'Tidak tercatat',
      formatDateTimeIndo(log.created_at),
      logShift,
    ]);
  });

  detailAoa.push([]);
  detailAoa.push(['', '', 'TOTAL CATATAN DOKUMEN', targetLogs.length, '', '', '', '']);

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoa);

  wsDetail['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // TIPE PRO
    { wch: 22 }, // NO PRO
    { wch: 18 }, // TANGGAL DOKUMEN
    { wch: 25 }, // PILIHAN PASS BOX
    { wch: 24 }, // DIINPUT OLEH
    { wch: 22 }, // WAKTU SISTEM
    { wch: 24 }, // SHIFT KERJA
  ];

  wsDetail['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  XLSX.utils.book_append_sheet(workbook, wsDetail, 'Data Detail Pass Box');

  // ==========================================
  // SHEET 2: REKAPITULASI PER CHECKER
  // ==========================================
  const checkerMap = new Map<string, { total: number; dates: Set<string>; lastInput: string }>();
  targetLogs.forEach(l => {
    const name = l.user_name || 'Tanpa Nama';
    const entry = checkerMap.get(name) || { total: 0, dates: new Set<string>(), lastInput: l.created_at };
    entry.total += 1;
    entry.dates.add(l.tanggal);
    if (new Date(l.created_at) > new Date(entry.lastInput)) {
      entry.lastInput = l.created_at;
    }
    checkerMap.set(name, entry);
  });

  const rekapAoa: any[][] = [
    ['PT. DIAMOND COLD STORAGE'],
    ['REKAPITULASI AKTIVITAS CHECKER PASS BOX'],
    [`Filter Shift: ${shiftLabelText}  |  Total Dokumen: ${targetLogs.length}  |  Jumlah Checker Terdaftar: ${checkerMap.size}`],
    [],
    ['NO', 'NAMA OPERATOR / CHECKER', 'TOTAL INPUT (KALI)', 'HARI AKTIF', 'KONTRIBUSI (%)', 'INPUT TERAKHIR'],
  ];

  let checkerIdx = 1;
  const sortedCheckers = Array.from(checkerMap.entries()).sort((a, b) => b[1].total - a[1].total);

  sortedCheckers.forEach(([name, data]) => {
    const percent = targetLogs.length > 0 ? ((data.total / targetLogs.length) * 100).toFixed(1) + '%' : '0%';
    rekapAoa.push([
      checkerIdx++,
      name,
      data.total,
      data.dates.size,
      percent,
      formatDateTimeIndo(data.lastInput),
    ]);
  });

  rekapAoa.push([]);
  rekapAoa.push(['', 'TOTAL KESELURUHAN', targetLogs.length, '', '100%', '']);

  const wsRekap = XLSX.utils.aoa_to_sheet(rekapAoa);
  wsRekap['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
  ];
  wsRekap['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(workbook, wsRekap, 'Rekapitulasi Checker');

  // ==========================================
  // SHEET 3: STATISTIK TREN HARIAN
  // ==========================================
  const dailyMap = new Map<string, number>();
  targetLogs.forEach(l => {
    dailyMap.set(l.tanggal, (dailyMap.get(l.tanggal) || 0) + 1);
  });

  const dailyAoa: any[][] = [
    ['PT. DIAMOND COLD STORAGE'],
    ['STATISTIK TREN TRANSAKSI HARIAN PASS BOX'],
    [`Filter Shift: ${shiftLabelText}  |  Jumlah Hari Operasional Tercatat: ${dailyMap.size} Hari`],
    [],
    ['NO', 'TANGGAL', 'HARI', 'JUMLAH TRANSAKSI (LOG)', 'STATUS AKTIVITAS'],
  ];

  const sortedDates = Array.from(dailyMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  sortedDates.forEach(([dateStr, count], idx) => {
    let dayName = '-';
    try {
      const dateObj = new Date(dateStr + 'T00:00:00');
      dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dateObj);
    } catch {
      // fallback
    }

    const activityStatus = count >= 10 ? 'Sangat Padat' : count >= 5 ? 'Normal' : 'Rendah';

    dailyAoa.push([
      idx + 1,
      formatDateIndo(dateStr),
      dayName,
      count,
      activityStatus,
    ]);
  });

  const wsDaily = XLSX.utils.aoa_to_sheet(dailyAoa);
  wsDaily['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
  ];
  wsDaily['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(workbook, wsDaily, 'Tren Harian');

  // ==========================================
  // SHEET 4: ANALISIS JAM SIBUK & BEBAN SHIFT
  // ==========================================
  const hoursCount = new Array(24).fill(0);
  let shift1 = 0; // 07:00 - 15:00
  let shift2 = 0; // 15:00 - 23:00
  let shift3 = 0; // 23:00 - 07:00

  targetLogs.forEach(l => {
    try {
      const h = new Date(l.created_at).getHours();
      if (h >= 0 && h < 24) {
        hoursCount[h] += 1;
      }
      if (h >= 7 && h < 15) {
        shift1 += 1;
      } else if (h >= 15 && h < 23) {
        shift2 += 1;
      } else {
        shift3 += 1;
      }
    } catch {
      // ignore
    }
  });

  const maxVal = Math.max(...hoursCount, 0);
  const peakHourIdx = maxVal > 0 ? hoursCount.indexOf(maxVal) : -1;
  const peakHourDesc = peakHourIdx >= 0 
    ? `${String(peakHourIdx).padStart(2, '0')}:00 - ${String(peakHourIdx + 1).padStart(2, '0')}:00` 
    : '-';

  const hourlyAoa: any[][] = [
    ['PT. DIAMOND COLD STORAGE'],
    ['ANALISIS JAM SIBUK & DISTRIBUSI BEBAN SHIFT PASS BOX'],
    [`Filter Shift: ${shiftLabelText}  |  Jam Puncak Operasional Terdeteksi: Pukul ${peakHourDesc} (${maxVal} Transaksi)`],
    [],
    ['RINGKASAN DISTRIBUSI SHIFT KERJA'],
    ['NAMA SHIFT', 'RENTANG WAKTU', 'JUMLAH TRANSAKSI', 'PORSI VOLUME (%)'],
    ['Shift 1 (Pagi)', '07:00 - 15:00 WIB', shift1, targetLogs.length > 0 ? ((shift1 / targetLogs.length) * 100).toFixed(1) + '%' : '0%'],
    ['Shift 2 (Sore)', '15:00 - 23:00 WIB', shift2, targetLogs.length > 0 ? ((shift2 / targetLogs.length) * 100).toFixed(1) + '%' : '0%'],
    ['Shift 3 (Malam)', '23:00 - 07:00 WIB', shift3, targetLogs.length > 0 ? ((shift3 / targetLogs.length) * 100).toFixed(1) + '%' : '0%'],
    [],
    ['DETAIL DISTRIBUSI PER JAM (00:00 - 23:00)'],
    ['NO', 'RENTANG JAM', 'JUMLAH INPUT', 'PERSENTASE (%)', 'STATUS KEPADATAN'],
  ];

  hoursCount.forEach((cnt, h) => {
    const hourLabel = `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
    const pct = targetLogs.length > 0 ? ((cnt / targetLogs.length) * 100).toFixed(1) + '%' : '0%';
    const status = h === peakHourIdx && cnt > 0 
      ? '★ JAM PUNCAK (PEAK)' 
      : cnt >= 5 
      ? 'Padat' 
      : cnt > 0 
      ? 'Normal' 
      : 'Sepi / Tidak ada';

    hourlyAoa.push([
      h + 1,
      hourLabel,
      cnt,
      pct,
      status,
    ]);
  });

  const wsHourly = XLSX.utils.aoa_to_sheet(hourlyAoa);
  wsHourly['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
  ];
  wsHourly['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(workbook, wsHourly, 'Analisis Jam Sibuk');

  // Generate and download workbook file
  const shiftSuffix = shift === 'all' 
    ? 'Semua_Shift' 
    : shift === 'shift1' 
    ? 'Shift_1' 
    : shift === 'shift2' 
    ? 'Shift_2' 
    : 'Shift_3';
  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${shiftSuffix}_${todayStr}.xlsx`);

  return { success: true, count: targetLogs.length };
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateTimeIndo(dateTimeStr: string): string {
  if (!dateTimeStr) return '-';
  try {
    const d = new Date(dateTimeStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateTimeStr;
  }
}
