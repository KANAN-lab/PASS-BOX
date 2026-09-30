import * as XLSX from 'xlsx';
import type { PassBoxLog } from '../types';

export function exportLogsToExcel(logs: PassBoxLog[], filenamePrefix = 'Pass_Box_Log') {
  // Format logs into tabular rows
  const rows = logs.map((log, index) => ({
    'NO': index + 1,
    'NO PRO': log.no_pro,
    'TANGGAL': formatDateIndo(log.tanggal),
    'PASS BOX': log.pass_box,
    'DIINPUT OLEH': log.user_name,
    'WAKTU INPUT': formatDateTimeIndo(log.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // NO
    { wch: 20 }, // NO PRO
    { wch: 15 }, // TANGGAL
    { wch: 30 }, // PASS BOX
    { wch: 20 }, // DIINPUT OLEH
    { wch: 20 }, // WAKTU INPUT
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pass Box');

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
