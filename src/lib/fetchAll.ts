import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Supabase/PostgREST membatasi respons maksimal 1000 baris per request
 * (setting "Max Rows"), dan query yang melebihi batas itu dipotong tanpa error.
 * Helper ini mengambil SEMUA baris dengan cara yang tetap ringan:
 *
 *  1. Request pertama membawa total baris (count: 'exact').
 *  2. Halaman sisanya diambil paralel dengan batas konkurensi kecil,
 *     sehingga jauh lebih cepat daripada loop berurutan tetapi tidak membebani server.
 *  3. Hasil digabung dan di-dedupe berdasarkan `id` (aman jika ada baris baru
 *     masuk saat pengambilan berlangsung).
 *
 * Syarat pemanggil:
 *  - Query WAJIB memakai urutan yang stabil dan unik (mis. `.order('id', ...)`),
 *    karena paginasi offset pada urutan non-unik bisa menggandakan / melewatkan baris.
 *  - Query pada halaman pertama WAJIB memakai `select('*', { count: 'exact' })`.
 */

export const PAGE_SIZE = 1000; // harus <= Max Rows di Supabase (default 1000)
const MAX_CONCURRENCY = 4;

type PageResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
  count?: number | null;
};

export type PageFetcher<T> = (from: number, to: number) => PromiseLike<PageResult<T>>;

export interface FetchAllOptions {
  /** Dipanggil setiap ada kemajuan: (jumlah terambil, total jika diketahui). */
  onProgress?: (loaded: number, total: number | null) => void;
  /** Pengaman: hentikan jika total melebihi angka ini (default 500.000 baris). */
  maxRows?: number;
}

export async function fetchAllRows<T extends { id?: number | string }>(
  fetchPage: PageFetcher<T>,
  options: FetchAllOptions = {}
): Promise<{ data: T[]; error: PostgrestError | null; total: number }> {
  const { onProgress, maxRows = 500_000 } = options;

  const first = await fetchPage(0, PAGE_SIZE - 1);
  if (first.error) return { data: [], error: first.error, total: 0 };

  const firstRows = first.data ?? [];
  const total = typeof first.count === 'number' ? first.count : null;
  onProgress?.(firstRows.length, total);

  // Semua data muat dalam satu halaman
  if (firstRows.length < PAGE_SIZE) {
    return { data: firstRows, error: null, total: firstRows.length };
  }

  const collected: T[] = [...firstRows];

  if (total !== null) {
    // Total diketahui: ambil halaman sisanya paralel (dibatasi)
    const cappedTotal = Math.min(total, maxRows);
    const offsets: number[] = [];
    for (let from = PAGE_SIZE; from < cappedTotal; from += PAGE_SIZE) offsets.push(from);

    const pages: T[][] = new Array(offsets.length);
    let cursor = 0;
    let failure: PostgrestError | null = null;

    const worker = async () => {
      while (!failure) {
        const i = cursor++;
        if (i >= offsets.length) return;
        const from = offsets[i];
        const res = await fetchPage(from, from + PAGE_SIZE - 1);
        if (res.error) {
          failure = res.error;
          return;
        }
        pages[i] = res.data ?? [];
        const loaded = collected.length + pages.reduce((n, p) => n + (p ? p.length : 0), 0);
        onProgress?.(loaded, total);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, offsets.length) }, worker)
    );

    if (failure) return { data: [], error: failure, total: 0 };
    for (const p of pages) if (p) collected.push(...p);
  } else {
    // Total tidak diketahui: lanjut berurutan sampai halaman terakhir
    for (let from = PAGE_SIZE; from < maxRows; from += PAGE_SIZE) {
      const res = await fetchPage(from, from + PAGE_SIZE - 1);
      if (res.error) return { data: [], error: res.error, total: 0 };
      const rows = res.data ?? [];
      collected.push(...rows);
      onProgress?.(collected.length, null);
      if (rows.length < PAGE_SIZE) break;
    }
  }

  // Dedupe berdasarkan id, urutan asli dipertahankan
  const seen = new Set<number | string>();
  const unique: T[] = [];
  for (const row of collected) {
    const key = row.id;
    if (key === undefined || key === null) {
      unique.push(row);
    } else if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }

  return { data: unique, error: null, total: unique.length };
}
