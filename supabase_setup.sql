-- ==============================================================================
-- PASS BOX LOG - UNIFIED SUPABASE SETUP SCRIPT (SATU KALI JALANKAN)
-- Jalankan script ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable Extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Hapus tabel lama jika ada sebelumnya (Clean Slate)
drop table if exists public.pass_box_logs cascade;
drop table if exists public.profiles cascade;
drop type if exists user_role cascade;

-- 3. Buat ENUM Role
create type user_role as enum ('admin', 'checker');

-- 4. Buat Tabel Profiles (Manajemen Akun & Role)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text not null,
  role user_role not null default 'checker',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Buat Tabel Pass Box Logs (Data Input Pass Box)
create table public.pass_box_logs (
  id bigint generated always as identity primary key,
  no_pro text not null,
  tanggal date not null default current_date,
  pass_box text not null,
  user_id uuid null,
  user_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Indexes untuk Performa Query, Sort & Filter
create index idx_pass_box_logs_tanggal on public.pass_box_logs(tanggal desc);
create index idx_pass_box_logs_no_pro on public.pass_box_logs(no_pro);
create index idx_pass_box_logs_user_id on public.pass_box_logs(user_id);
create index idx_pass_box_logs_created_at on public.pass_box_logs(created_at desc);

-- 7. Helper Function: Cek apakah user saat ini adalah admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- 8. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.pass_box_logs enable row level security;

-- Policies untuk PROFILES (Read & Manage):
create policy "Allow read profiles for authenticated and anon"
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

-- Policies untuk PASS_BOX_LOGS (CRUD):
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

-- 9. Trigger Otomatis Sinkronisasi saat ada User baru di Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', 'User'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'checker'),
    true
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10. Enable Supabase Realtime untuk Sinkronisasi Tabel Langsung
alter publication supabase_realtime add table public.pass_box_logs;

-- 11. Initial Seed Data (Sesuai Screenshot Sistem Nyata)
insert into public.profiles (id, username, full_name, role, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'cheker1', 'Cheker 1', 'checker', true),
  ('22222222-2222-2222-2222-222222222222', 'admin', 'Admin', 'admin', true)
on conflict (id) do nothing;

insert into public.pass_box_logs (no_pro, tanggal, pass_box, user_id, user_name, created_at)
values
  ('105999', current_date, 'pasbox 1. PM', '11111111-1111-1111-1111-111111111111', 'Cheker 1', now() - interval '20 minutes'),
  ('contoh1', current_date, '1 PM', '22222222-2222-2222-2222-222222222222', 'Admin', now() - interval '15 minutes'),
  ('1059555', current_date, 'asbox 1 PM fani', '11111111-1111-1111-1111-111111111111', 'Cheker 1', now() - interval '10 minutes'),
  ('Contoh', current_date, '1', '11111111-1111-1111-1111-111111111111', 'Cheker 1', now() - interval '5 minutes');
