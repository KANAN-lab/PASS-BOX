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

## 4. Akun & Kredensial Default

Setelah script `supabase_setup.sql` dijalankan di Supabase SQL Editor, akun default berikut sudah siap digunakan untuk login:

| Role | Username / Email | Password Default | Hak Akses |
| :--- | :--- | :--- | :--- |
| **CHECKER** | `cheker1` *(cheker1@passbox.local)* | `checker123` | Input data log, lihat data, export Excel |
| **ADMINISTRATOR** | `admin` *(admin@passbox.local)* | `admin123` | Hak penuh: Tab Data, Rekap Per Checker, dan Manajemen Pengguna (Ubah Role & Status Akun) |

---

## 5. Fitur Keamanan & Otorisasi

- **Role Locking**: Pengguna biasa tidak memiliki akses untuk mengubah rolenya sendiri. Kolom role dilindungi oleh trigger PostgreSQL `protect_profile_role` dan fungsi database RPC `change_user_role`.
- **Manajemen Role**: Hanya Administrator terverifikasi yang dapat mempromosikan atau mendemosikan role pengguna di tab **Pengguna**.
- **Proteksi Self-Lockout**: Administrator tidak dapat menurunkan role akunnya sendiri agar sistem tidak terkunci.
- **Enkripsi**: Password disimpan dengan enkripsi `bcrypt` (`crypt` + `gen_salt`) pada schema `auth.users` Supabase.
- **RLS (Row Level Security)**: Data tabel dilindungi hak akses granular di tingkat database PostgreSQL.

