import * as XLSX from 'xlsx';
import type { PassBoxLog } from '../types';

export function exportLogsToExcel(logs: PassBoxLog[], filenamePrefix = 'Laporan_Pass_Box_Diamond') {
  const workbook = XLSX.utils.book_new();
  const exportTimeStr = formatDateTimeIndo(new Date().toISOString());

  // ==========================================
  // SHEET 1: DATA DETAIL LOG PASS BOX
  // ==========================================
  const detailAoa: any[][] = [
    ['PT DIAMOND FOOD INDONESIA TBK'],
    ['LAPORAN OPERASIONAL PASS BOX LOG - DEPARTEMEN RMPM'],
    [`Tanggal Ekspor: ${exportTimeStr}  |  Total Data: ${logs.length} Baris`],
    [], // Blank line
    ['NO', 'TIPE PRO', 'NO PRO', 'TANGGAL DOKUMEN', 'PILIHAN PASS BOX', 'DIINPUT OLEH', 'WAKTU INPUT SISTEM'],
  ];

  logs.forEach((log, idx) => {
    const kat = log.kategori_pro || (log.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM');
    detailAoa.push([
      idx + 1,
      kat,
      log.no_pro,
      formatDateIndo(log.tanggal),
      log.pass_box,
      log.user_name || 'Tidak tercatat',
      formatDateTimeIndo(log.created_at),
    ]);
  });

  detailAoa.push([]);
  detailAoa.push(['', '', 'TOTAL CATATAN DOKUMEN', logs.length, '', '', '']);

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoa);

  wsDetail['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // TIPE PRO
    { wch: 22 }, // NO PRO
    { wch: 18 }, // TANGGAL DOKUMEN
    { wch: 25 }, // PILIHAN PASS BOX
    { wch: 24 }, // DIINPUT OLEH
    { wch: 22 }, // WAKTU SISTEM
  ];

  wsDetail['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(workbook, wsDetail, 'Data Detail Pass Box');

  // ==========================================
  // SHEET 2: REKAPITULASI PER CHECKER
  // ==========================================
  const checkerMap = new Map<string, { total: number; dates: Set<string>; lastInput: string }>();
  logs.forEach(l => {
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
    ['PT DIAMOND FOOD INDONESIA TBK'],
    ['REKAPITULASI AKTIVITAS CHECKER PASS BOX'],
    [`Total Dokumen: ${logs.length}  |  Jumlah Checker Terdaftar: ${checkerMap.size}`],
    [],
    ['NO', 'NAMA OPERATOR / CHECKER', 'TOTAL INPUT (KALI)', 'HARI AKTIF', 'KONTRIBUSI (%)', 'INPUT TERAKHIR'],
  ];

  let checkerIdx = 1;
  const sortedCheckers = Array.from(checkerMap.entries()).sort((a, b) => b[1].total - a[1].total);

  sortedCheckers.forEach(([name, data]) => {
    const percent = logs.length > 0 ? ((data.total / logs.length) * 100).toFixed(1) + '%' : '0%';
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
  rekapAoa.push(['', 'TOTAL KESELURUHAN', logs.length, '', '100%', '']);

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
  logs.forEach(l => {
    dailyMap.set(l.tanggal, (dailyMap.get(l.tanggal) || 0) + 1);
  });

  const dailyAoa: any[][] = [
    ['PT DIAMOND FOOD INDONESIA TBK'],
    ['STATISTIK TREN TRANSAKSI HARIAN PASS BOX'],
    [`Jumlah Hari Operasional Tercatat: ${dailyMap.size} Hari`],
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

  logs.forEach(l => {
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
    ['PT DIAMOND FOOD INDONESIA TBK'],
    ['ANALISIS JAM SIBUK & DISTRIBUSI BEBAN SHIFT PASS BOX'],
    [`Jam Puncak Operasional Terdeteksi: Pukul ${peakHourDesc} (${maxVal} Transaksi)`],
    [],
    ['RINGKASAN DISTRIBUSI SHIFT KERJA'],
    ['NAMA SHIFT', 'RENTANG WAKTU', 'JUMLAH TRANSAKSI', 'PORSI VOLUME (%)'],
    ['Shift 1 (Pagi)', '07:00 - 15:00 WIB', shift1, logs.length > 0 ? ((shift1 / logs.length) * 100).toFixed(1) + '%' : '0%'],
    ['Shift 2 (Sore)', '15:00 - 23:00 WIB', shift2, logs.length > 0 ? ((shift2 / logs.length) * 100).toFixed(1) + '%' : '0%'],
    ['Shift 3 (Malam)', '23:00 - 07:00 WIB', shift3, logs.length > 0 ? ((shift3 / logs.length) * 100).toFixed(1) + '%' : '0%'],
    [],
    ['DETAIL DISTRIBUSI PER JAM (00:00 - 23:00)'],
    ['NO', 'RENTANG JAM', 'JUMLAH INPUT', 'PERSENTASE (%)', 'STATUS KEPADATAN'],
  ];

  hoursCount.forEach((cnt, h) => {
    const hourLabel = `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
    const pct = logs.length > 0 ? ((cnt / logs.length) * 100).toFixed(1) + '%' : '0%';
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
  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
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
