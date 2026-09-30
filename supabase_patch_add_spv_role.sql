-- ==============================================================================
-- PASS BOX LOG - PATCH ADD SPV ROLE & DEFAULT SUPERVISOR ACCOUNT (NON-DESTRUCTIVE)
-- ==============================================================================
-- File ini 100% AMAN dijalankan pada database Supabase yang sedang berjalan.
-- TIDAK AKAN MENGHAPUS data atau tabel yang sudah ada!
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Pastikan Extension pgcrypto & uuid-ossp aktif
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Tambahkan nilai 'spv' ke dalam ENUM user_role jika belum ada
do $$
begin
  alter type user_role add value if not exists 'spv' after 'admin';
exception
  when duplicate_object then null;
end $$;

-- 3. Seed / Daftarkan Akun Default SPV (Password terenkripsi Bcrypt: spv123)
insert into public.profiles (
  id,
  username,
  full_name,
  role,
  password_hash,
  is_active,
  created_at,
  updated_at
)
values (
  '33333333-3333-3333-3333-333333333333',
  'spv',
  'Supervisor',
  'spv',
  extensions.crypt('spv123', extensions.gen_salt('bf')),
  true,
  now(),
  now()
)
on conflict (username) do update set
  role = 'spv',
  password_hash = extensions.crypt('spv123', extensions.gen_salt('bf')),
  is_active = true,
  updated_at = now();

-- 4. Pastikan Fungsi verify_user_login mengembalikan role dengan tipe user_role yang terupdate
create or replace function public.verify_user_login(p_username text, p_password text)
returns table (
  id uuid,
  username text,
  full_name text,
  role user_role,
  is_active boolean
)
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  return query
  select p.id, p.username, p.full_name, p.role, p.is_active
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
    and p.password_hash = extensions.crypt(p_password, p.password_hash)
    and p.is_active = true;
end;
$$;

-- 5. Berikan Hak Akses Eksekusi (Grant Execute)
grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;

-- 6. Muat Ulang Schema Cache Supabase PostgREST
notify pgrst, 'reload schema';
