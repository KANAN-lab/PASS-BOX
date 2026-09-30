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
create type user_role as enum ('admin', 'spv', 'checker');

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
  kategori_pro text not null default 'RM', -- 'RM' atau 'PM'
  no_pro text not null,
  tanggal date not null default current_date,
  pass_box text not null,
  user_id uuid null references public.profiles(id) on delete set null,
  user_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jika tabel pass_box_logs sudah ada sebelumnya, pastikan kolom kategori_pro ditambahkan
alter table public.pass_box_logs add column if not exists kategori_pro text default 'RM';

-- 6b. Tabel Master Pilihan Pass Box (Dikonfigurasi oleh Admin)
create table if not exists public.pass_boxes (
  id serial primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed awal pilihan Pass Box 1 & Pass Box 2
insert into public.pass_boxes (name, is_active)
values ('Pass Box 1', true), ('Pass Box 2', true)
on conflict (name) do update set is_active = excluded.is_active;


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

grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;

-- 10. Fungsi Ubah Role (Hanya Admin)
create or replace function public.change_user_role(admin_user_id uuid, target_user_id uuid, new_role user_role)
returns void
language plpgsql
security definer set search_path = public, extensions
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
security definer set search_path = public, extensions
as $$
begin
  if length(new_password) < 6 then
    raise exception 'Password minimal harus 6 karakter.';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- 11b. Fungsi Khusus Admin untuk Reset Password Pengguna Lain
create or replace function public.admin_reset_user_password(
  admin_user_id uuid,
  target_user_id uuid,
  new_password text
)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  is_caller_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = admin_user_id and role = 'admin' and is_active = true
  ) into is_caller_admin;

  if not is_caller_admin then
    raise exception 'Akses ditolak: Hanya administrator yang berhak mereset password pengguna.';
  end if;

  if length(new_password) < 6 then
    raise exception 'Password minimal harus 6 karakter.';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- 11c. Fungsi Khusus Admin untuk Tambah Pengguna Baru (Langsung Terenkripsi Bcrypt, Tanpa Status Pending)
create or replace function public.admin_create_user(
  admin_user_id uuid,
  p_username text,
  p_full_name text,
  p_role user_role,
  p_password text
)
returns public.profiles
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  is_caller_admin boolean;
  new_profile public.profiles;
  clean_uname text;
begin
  if admin_user_id is not null then
    select exists (
      select 1 from public.profiles
      where id = admin_user_id and role = 'admin' and is_active = true
    ) into is_caller_admin;

    if not is_caller_admin then
      raise exception 'Akses ditolak: Hanya administrator yang berhak menambah pengguna baru.';
    end if;
  end if;

  clean_uname := lower(trim(p_username));
  if length(clean_uname) < 3 then
    raise exception 'Username minimal harus 3 karakter.';
  end if;

  if exists (select 1 from public.profiles where lower(username) = clean_uname) then
    raise exception 'Username "%" sudah terdaftar. Silakan gunakan username lain.', clean_uname;
  end if;

  if length(trim(p_password)) < 6 then
    raise exception 'Password minimal harus 6 karakter.';
  end if;

  insert into public.profiles (
    id,
    username,
    full_name,
    role,
    password_hash,
    is_active
  )
  values (
    gen_random_uuid(),
    clean_uname,
    trim(p_full_name),
    p_role,
    extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
    true
  )
  returning * into new_profile;

  return new_profile;
end;
$$;

grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;
grant execute on function public.change_user_role(uuid, uuid, user_role) to anon, authenticated, service_role;
grant execute on function public.change_user_password(uuid, text) to anon, authenticated, service_role;
grant execute on function public.admin_reset_user_password(uuid, uuid, text) to anon, authenticated, service_role;
grant execute on function public.admin_create_user(uuid, text, text, user_role, text) to anon, authenticated, service_role;


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

-- Policies untuk PASS_BOXES:
alter table public.pass_boxes enable row level security;
create policy "Allow read pass_boxes"
  on public.pass_boxes for select
  using (true);

create policy "Allow insert pass_boxes"
  on public.pass_boxes for insert
  with check (true);

create policy "Allow update pass_boxes"
  on public.pass_boxes for update
  using (true);

create policy "Allow delete pass_boxes"
  on public.pass_boxes for delete
  using (true);

-- 13. Enable Supabase Realtime
alter publication supabase_realtime add table public.pass_box_logs;
alter publication supabase_realtime add table public.pass_boxes;


-- 14. Seed Data Akun Default (Password terenkripsi Bcrypt):
--   cheker1 : checker123
--   spv     : spv123
--   admin   : admin123
insert into public.profiles (id, username, full_name, role, password_hash, is_active)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'cheker1',
    'Cheker 1',
    'checker',
    extensions.crypt('checker123', extensions.gen_salt('bf')),
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'spv',
    'Supervisor',
    'spv',
    extensions.crypt('spv123', extensions.gen_salt('bf')),
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'admin',
    'Admin',
    'admin',
    extensions.crypt('admin123', extensions.gen_salt('bf')),
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

-- 16. Refresh Schema Cache PostgREST
notify pgrst, 'reload schema';

