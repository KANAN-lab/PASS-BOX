# Pass Box Log Dashboard (Vercel + Supabase)

Sistem pencatatan log Pass Box operasional RMPM / Cleanroom berbasis **React + TypeScript + Tailwind CSS** dengan backend **Supabase** dan deployment **Vercel**.

---

## 1. Setup Supabase (Satu Kali Langkah)

Script setup database sudah disatukan dalam satu file: [`supabase_setup.sql`](./supabase_setup.sql).

**Langkah:**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) project Anda (`https://bvltkgeqnxkrukxwgdlk.supabase.co`).
2. Masuk ke menu **SQL Editor** di sidebar kiri.
3. Klik **New query**.
4. Copy seluruh isi file [`supabase_setup.sql`](./supabase_setup.sql) dan paste ke editor.
5. Klik **Run** (atau tekan `Ctrl + Enter`).
6. Selesai! Tabel `profiles`, `pass_box_logs`, trigger auth, realtime, dan data awal demo langsung aktif.

---

## 2. Menjalankan di Komputer Lokal

```bash
# Install dependencies
npm install

# Jalankan server development
npm run dev
```

Aplikasi akan berjalan di: `http://localhost:5173`

---

## 3. Deployment ke Vercel

### Opsi A: Lewat GitHub / Vercel Web Dashboard (Rekomendasi)
1. Push project ini ke repository GitHub/GitLab Anda.
2. Buka [vercel.com](https://vercel.com) -> Klik **Add New Project** -> Pilih repo ini.
3. Pada bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`: `https://bvltkgeqnxkrukxwgdlk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_dj11m-qOa4iP0xhtwPVJVg_fsY1AgCj`
4. Klik **Deploy**.

### Opsi B: Lewat Vercel CLI
```bash
npx vercel
```
Ikuti instruksi di terminal. Konfigurasi routing SPA otomatis ditangani oleh file [`vercel.json`](./vercel.json).

---

## 4. Fitur Utama

- **Tab Data (Checker & Admin)**:
  - Form input cepat: No Pro, Tanggal, Pass Box (shortcut `Enter` untuk simpan).
  - Indikator metrik realtime: `TOTAL DATA` dan `TANGGAL HARI INI`.
  - Multi-search filter (No Pro, Pass Box, Penginput) dan Date range filter.
  - Tombol **Export Excel** format `.xlsx` (menggunakan SheetJS).
  - Edit & Hapus data dengan modal konfirmasi.
- **Tab Rekap (Admin Only)**:
  - Rekap total entri per checker dengan progress bar visual distribusi kontribusi.
  - Filter cepat periode: `Hari ini`, `7 hari`, `30 hari`, `Semua`, atau rentang tanggal kustom.
  - Ringkasan total periode, hari aktif, dan waktu input terakhir.
- **Tab Pengguna (Admin Only)**:
  - Manajemen akun staf (Checker dan Administrator).
  - Tambah pengguna baru & toggle status aktif/nonaktif.
- **Role Switcher Cepat**:
  - Terdapat toggle instan `Checker` / `Admin` di navbar atas untuk kemudahan testing operasional.
