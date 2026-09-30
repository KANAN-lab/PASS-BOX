import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import type { PassBoxLog, PassBoxMaster, UserProfile } from '../types';
import { formatDateIndo, formatDateTimeIndo } from './excel';

export interface BackupPayload {
  version: string;
  app_name: string;
  exported_at: string;
  exported_by?: string;
  total_logs: number;
  total_pass_boxes: number;
  total_users: number;
  logs: PassBoxLog[];
  pass_boxes: PassBoxMaster[];
  users: Partial<UserProfile>[];
}

export interface RestorePreview {
  isValid: boolean;
  message?: string;
  exportedAt?: string;
  logsCount: number;
  passBoxesCount: number;
  dateRange?: {
    earliest: string;
    latest: string;
  };
  sampleLogs: Array<{
    no_pro: string;
    tanggal: string;
    pass_box: string;
    user_name: string;
  }>;
  rawPayload: BackupPayload;
}

/**
 * Mengambil seluruh data dari Supabase dan mengunduhnya sebagai file JSON
 */
export async function downloadJSONBackup(currentUserName?: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // 1. Fetch seluruh logs transaksi
    const { data: logsData, error: logsError } = await supabase
      .from('pass_box_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (logsError) throw new Error(`Gagal membaca data logs: ${logsError.message}`);

    // 2. Fetch master pass box
    const { data: boxesData, error: boxesError } = await supabase
      .from('pass_boxes')
      .select('*')
      .order('id', { ascending: true });

    if (boxesError) throw new Error(`Gagal membaca master pass box: ${boxesError.message}`);

    // 3. Fetch data user (hanya informasi profil publik, tanpa password hash)
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, is_active, created_at')
      .order('username', { ascending: true });

    if (usersError) throw new Error(`Gagal membaca profil pengguna: ${usersError.message}`);

    const logs = (logsData || []) as PassBoxLog[];
    const passBoxes = (boxesData || []) as PassBoxMaster[];
    const users = (usersData || []) as Partial<UserProfile>[];

    const payload: BackupPayload = {
      version: '1.0.0',
      app_name: 'Pass Box Log - Diamond Cold Storage',
      exported_at: new Date().toISOString(),
      exported_by: currentUserName || 'System Admin',
      total_logs: logs.length,
      total_pass_boxes: passBoxes.length,
      total_users: users.length,
      logs,
      pass_boxes: passBoxes,
      users,
    };

    // Buat Blob dan download
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);
    const timeStamp = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    link.href = url;
    link.download = `Backup_PassBox_Log_${dateStamp}_${timeStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: logs.length };
  } catch (err: any) {
    console.error('Error saat membuat JSON backup:', err);
    return { success: false, count: 0, error: err?.message || 'Terjadi kesalahan tidak terduga' };
  }
}

/**
 * Mengambil seluruh data dari Supabase dan mengunduhnya sebagai file Excel (.xlsx) komprehensif
 */
export async function downloadExcelBackup(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: logsData, error: logsError } = await supabase
      .from('pass_box_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (logsError) throw new Error(`Gagal membaca data logs: ${logsError.message}`);

    const { data: boxesData, error: boxesError } = await supabase
      .from('pass_boxes')
      .select('*')
      .order('id', { ascending: true });

    if (boxesError) throw new Error(`Gagal membaca master pass box: ${boxesError.message}`);

    const logs = (logsData || []) as PassBoxLog[];
    const passBoxes = (boxesData || []) as PassBoxMaster[];

    const workbook = XLSX.utils.book_new();
    const exportTimeStr = formatDateTimeIndo(new Date().toISOString());

    // SHEET 1: DATA LOG TRANSAKSI
    const logsAoa: any[][] = [
      ['PT. DIAMOND COLD STORAGE - DEPARTEMEN RMPM'],
      ['DATABASE BACKUP LENGKAP: PASS BOX LOG OPERASIONAL'],
      [`Waktu Ekspor: ${exportTimeStr}  |  Total Baris: ${logs.length}`],
      [],
      ['ID LOG', 'TIPE PRO', 'NO PRO', 'TANGGAL DOKUMEN', 'PILIHAN PASS BOX', 'NAMA USER / CHECKER', 'USER ID', 'WAKTU INPUT SISTEM'],
    ];

    logs.forEach((l) => {
      const kat = l.kategori_pro || (l.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM');
      logsAoa.push([
        l.id,
        kat,
        l.no_pro,
        l.tanggal,
        l.pass_box,
        l.user_name || '-',
        l.user_id || '-',
        l.created_at,
      ]);
    });

    const wsLogs = XLSX.utils.aoa_to_sheet(logsAoa);
    wsLogs['!cols'] = [
      { wch: 10 }, // ID
      { wch: 12 }, // TIPE
      { wch: 22 }, // NO PRO
      { wch: 18 }, // TANGGAL
      { wch: 25 }, // PASS BOX
      { wch: 24 }, // CHECKER
      { wch: 38 }, // USER ID
      { wch: 26 }, // CREATED AT
    ];
    XLSX.utils.book_append_sheet(workbook, wsLogs, 'Data Log Transaksi');

    // SHEET 2: MASTER PASS BOX
    const boxesAoa: any[][] = [
      ['MASTER PILIHAN PASS BOX'],
      [],
      ['ID', 'NAMA PASS BOX', 'STATUS AKTIF', 'TANGGAL DIBUAT'],
    ];
    passBoxes.forEach((b) => {
      boxesAoa.push([b.id, b.name, b.is_active ? 'AKTIF' : 'NON-AKTIF', b.created_at || '-']);
    });
    const wsBoxes = XLSX.utils.aoa_to_sheet(boxesAoa);
    wsBoxes['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, wsBoxes, 'Master Pass Box');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Backup_PassBox_Lengkap_${todayStr}.xlsx`);

    return { success: true, count: logs.length };
  } catch (err: any) {
    console.error('Error saat membuat Excel backup:', err);
    return { success: false, count: 0, error: err?.message || 'Terjadi kesalahan tidak terduga' };
  }
}

/**
 * Melakukan parsing dan validasi file JSON backup
 */
export async function parseBackupFile(file: File): Promise<RestorePreview> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          return resolve({ isValid: false, message: 'File kosong atau tidak terbaca', logsCount: 0, passBoxesCount: 0, sampleLogs: [], rawPayload: {} as any });
        }

        const data = JSON.parse(text);

        // Validasi: bisa berupa BackupPayload lengkap atau array PassBoxLog
        let logs: PassBoxLog[] = [];
        let passBoxes: PassBoxMaster[] = [];

        if (Array.isArray(data)) {
          // File berupa array logs murni
          logs = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.logs)) {
          logs = data.logs;
          if (Array.isArray(data.pass_boxes)) {
            passBoxes = data.pass_boxes;
          }
        } else {
          return resolve({
            isValid: false,
            message: 'Format file tidak sesuai standar backup Pass Box Log (properti "logs" tidak ditemukan)',
            logsCount: 0,
            passBoxesCount: 0,
            sampleLogs: [],
            rawPayload: {} as any,
          });
        }

        if (logs.length === 0) {
          return resolve({
            isValid: false,
            message: 'File valid namun tidak memiliki catatan data log transaksi (0 baris)',
            logsCount: 0,
            passBoxesCount: passBoxes.length,
            sampleLogs: [],
            rawPayload: data,
          });
        }

        // Hitung statistik
        const validDates = logs.map((l) => l.tanggal).filter(Boolean).sort();
        const earliest = validDates[0] ? formatDateIndo(validDates[0]) : '-';
        const latest = validDates[validDates.length - 1] ? formatDateIndo(validDates[validDates.length - 1]) : '-';

        const sample = logs.slice(0, 5).map((l) => ({
          no_pro: String(l.no_pro || '-'),
          tanggal: String(l.tanggal || '-'),
          pass_box: String(l.pass_box || '-'),
          user_name: String(l.user_name || '-'),
        }));

        resolve({
          isValid: true,
          exportedAt: data.exported_at ? formatDateTimeIndo(data.exported_at) : undefined,
          logsCount: logs.length,
          passBoxesCount: passBoxes.length,
          dateRange: { earliest, latest },
          sampleLogs: sample,
          rawPayload: {
            version: data.version || '1.0.0',
            app_name: data.app_name || 'Pass Box Log',
            exported_at: data.exported_at || new Date().toISOString(),
            total_logs: logs.length,
            total_pass_boxes: passBoxes.length,
            total_users: 0,
            logs,
            pass_boxes: passBoxes,
            users: [],
          },
        });
      } catch (err: any) {
        resolve({
          isValid: false,
          message: `Gagal membaca format JSON: ${err?.message || 'File rusak atau bukan file JSON'}`,
          logsCount: 0,
          passBoxesCount: 0,
          sampleLogs: [],
          rawPayload: {} as any,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        isValid: false,
        message: 'Gagal membuka file dari perangkat lokal',
        logsCount: 0,
        passBoxesCount: 0,
        sampleLogs: [],
        rawPayload: {} as any,
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Memasukkan data log dari backup ke Supabase dalam batch chunks
 */
export async function executeRestoreLogs(
  logs: PassBoxLog[],
  passBoxes?: PassBoxMaster[],
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<{ success: boolean; restoredCount: number; error?: string }> {
  try {
    if (!logs || logs.length === 0) {
      return { success: true, restoredCount: 0 };
    }

    // 1. Pulihkan Master Pass Box jika ada
    if (passBoxes && passBoxes.length > 0) {
      if (onProgress) onProgress(10, 'Memulihkan master pilihan pass box...');
      for (const box of passBoxes) {
        if (!box.name) continue;
        await supabase
          .from('pass_boxes')
          .upsert({ name: box.name, is_active: box.is_active ?? true }, { onConflict: 'name' });
      }
    }

    // 2. Siapkan data logs untuk insert (hilangkan id auto-increment jika perlu atau gunakan upsert)
    // Untuk menjaga integritas data tanpa konflik ID sequence, siapkan record bersih
    const recordsToInsert = logs.map((l) => ({
      kategori_pro: l.kategori_pro || (l.pass_box.toLowerCase().includes('pm') ? 'PM' : 'RM'),
      no_pro: String(l.no_pro).trim(),
      tanggal: l.tanggal,
      pass_box: l.pass_box,
      user_id: l.user_id || null,
      user_name: l.user_name || 'Tidak tercatat',
      created_at: l.created_at || new Date().toISOString(),
      updated_at: l.updated_at || l.created_at || new Date().toISOString(),
    }));

    // 3. Batch processing (50 baris per batch agar aman dari payload limit)
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);
    let restoredCount = 0;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = start + BATCH_SIZE;
      const chunk = recordsToInsert.slice(start, end);

      const percent = Math.min(95, Math.round(15 + ((i + 1) / totalBatches) * 80));
      if (onProgress) {
        onProgress(percent, `Mengirim batch ${i + 1} dari ${totalBatches} (${start + 1} - ${Math.min(end, recordsToInsert.length)} data)...`);
      }

      const { error: insertError } = await supabase.from('pass_box_logs').insert(chunk);

      if (insertError) {
        throw new Error(`Gagal pada batch ${i + 1}: ${insertError.message}`);
      }

      restoredCount += chunk.length;
    }

    if (onProgress) onProgress(100, 'Pemulihan selesai dengan sukses!');
    return { success: true, restoredCount };
  } catch (err: any) {
    console.error('Error saat memulihkan data:', err);
    return { success: false, restoredCount: 0, error: err?.message || 'Terjadi kegagalan pemulihan data' };
  }
}
