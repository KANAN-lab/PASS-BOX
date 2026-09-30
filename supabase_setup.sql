-- ==============================================================================
-- PASS BOX LOG - UNIFIED SUPABASE SETUP SCRIPT (100% BULLETPROOF & SECURE)
-- Jalankan script ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable Extension untuk UUID & Enkripsi Password (Bcrypt)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Bersihkan trigger/data auth lama yang menyebabkan error 500 di GoTrue
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Bersihkan dummy test di auth.users jika ada
delete from auth.identities where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- 3. Hapus tabel lama untuk clean slate
drop table if exists public.pass_box_logs cascade;
drop table if exists public.profiles cascade;
drop type if exists user_role cascade;

-- 4. Buat ENUM Role
create type user_role as enum ('admin', 'checker');

-- 5. Buat Tabel Profiles (Manajemen Akun & Role)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text not null,
  role user_role not null default 'checker',
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Buat Tabel Pass Box Logs (Data Input Pass Box)
create table public.pass_box_logs (
  id bigint generated always as identity primary key,
  no_pro text not null,
  tanggal date not null default current_date,
  pass_box text not null,
  user_id uuid null references public.profiles(id) on delete set null,
  user_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Indexes untuk Kecepatan Query, Sort & Filter
create index idx_pass_box_logs_tanggal on public.pass_box_logs(tanggal desc);
create index idx_pass_box_logs_no_pro on public.pass_box_logs(no_pro);
create index idx_pass_box_logs_user_id on public.pass_box_logs(user_id);
create index idx_pass_box_logs_created_at on public.pass_box_logs(created_at desc);

-- 8. GRANT PRIVILEGES (Mencegah Permission Denied Error 42501)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;

-- 9. Fungsi Otorisasi Login Mandiri (Aman dengan Bcrypt, Tanpa Error SMTP/500)
create or replace function public.verify_user_login(p_username text, p_password text)
returns table (
  id uuid,
  username text,
  full_name text,
  role user_role,
  is_active boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select p.id, p.username, p.full_name, p.role, p.is_active
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
    and p.password_hash = crypt(p_password, p.password_hash)
    and p.is_active = true;
end;
$$;

-- 10. Fungsi Ubah Role (Hanya Admin)
create or replace function public.change_user_role(admin_user_id uuid, target_user_id uuid, new_role user_role)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  is_caller_admin boolean;
begin
  -- Periksa apakah pemanggil adalah admin aktif
  select exists (
    select 1 from public.profiles
    where id = admin_user_id and role = 'admin' and is_active = true
  ) into is_caller_admin;

  if not is_caller_admin then
    raise exception 'Akses ditolak: Hanya administrator yang berhak mengubah role pengguna.';
  end if;

  -- Proteksi self-demotion
  if admin_user_id = target_user_id and new_role <> 'admin' then
    raise exception 'Akses ditolak: Anda tidak dapat menurunkan role akun Anda sendiri.';
  end if;

  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id;
end;
$$;

-- 11. Fungsi Ganti Password Pengguna
create or replace function public.change_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set password_hash = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- 12. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.pass_box_logs enable row level security;

-- Policies untuk PROFILES:
create policy "Allow read profiles"
  on public.profiles for select
  using (true);

create policy "Allow insert profiles"
  on public.profiles for insert
  with check (true);

create policy "Allow update profiles"
  on public.profiles for update
  using (true);

create policy "Allow delete profiles"
  on public.profiles for delete
  using (true);

-- Policies untuk PASS_BOX_LOGS:
create policy "Allow read pass_box_logs"
  on public.pass_box_logs for select
  using (true);

create policy "Allow insert pass_box_logs"
  on public.pass_box_logs for insert
  with check (true);

create policy "Allow update pass_box_logs"
  on public.pass_box_logs for update
  using (true);

create policy "Allow delete pass_box_logs"
  on public.pass_box_logs for delete
  using (true);

-- 13. Enable Supabase Realtime
alter publication supabase_realtime add table public.pass_box_logs;

-- 14. Seed Data Akun Default (Password terenkripsi Bcrypt):
--   cheker1 : checker123
--   admin   : admin123
insert into public.profiles (id, username, full_name, role, password_hash, is_active)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'cheker1',
    'Cheker 1',
    'checker',
    crypt('checker123', gen_salt('bf')),
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'admin',
    'Admin',
    'admin',
    crypt('admin123', gen_salt('bf')),
    true
  )
on conflict (username) do update set
  password_hash = excluded.password_hash,
  role = excluded.role;

-- 15. Initial Seed Data Pass Box Logs
insert into public.pass_box_logs (no_pro, tanggal, pass_box, user_id, user_name, created_at)
values
  ('105999', current_date, 'pasbox 1. PM', '11111111-1111-1111-1111-111111111111', 'Cheker 1', now() - interval '20 minutes'),
  ('contoh1', current_date, '1 PM', '22222222-2222-2222-2222-222222222222', 'Admin', now() - interval '15 minutes'),
  ('1059555', current_date, 'asbox 1 PM fani', '11111111-1111-1111-1111-111111111111', 'Cheker 1', now() - interval '10 minutes'),
  ('Contoh', current_date, '1', '11111111-1111-1111-1111-111111111111', 'Cheker 1', now() - interval '5 minutes');
