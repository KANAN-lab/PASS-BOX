-- ==============================================================================
-- PASS BOX LOG - PATCH FIX LOGIN & PENDING PASSWORD (100% NON-DESTRUCTIVE)
-- ==============================================================================
-- File ini AMAN dijalankan pada database yang sudah berjalan.
-- TIDAK AKAN MENGHAPUS data atau tabel yang sudah ada!
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Pastikan Extension pgcrypto & uuid-ossp aktif
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Fungsi Login: verify_user_login (Fix 404 & Search Path)
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

-- 3. Fungsi Tambah Pengguna Baru Khusus Admin (Atomic Bcrypt, Tanpa Pending)
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

-- 4. Fungsi Reset Password oleh Admin
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
  if admin_user_id is not null then
    select exists (
      select 1 from public.profiles
      where id = admin_user_id and role = 'admin' and is_active = true
    ) into is_caller_admin;

    if not is_caller_admin then
      raise exception 'Akses ditolak: Hanya administrator yang berhak mereset password pengguna.';
    end if;
  end if;

  if length(trim(new_password)) < 6 then
    raise exception 'Password minimal harus 6 karakter.';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(trim(new_password), extensions.gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- 5. Fungsi Ganti Password Mandiri
create or replace function public.change_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  if length(trim(new_password)) < 6 then
    raise exception 'Password minimal harus 6 karakter.';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(trim(new_password), extensions.gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- 6. Hak Akses Eksekusi (Grant Execute)
grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;
grant execute on function public.admin_create_user(uuid, text, text, user_role, text) to anon, authenticated, service_role;
grant execute on function public.admin_reset_user_password(uuid, uuid, text) to anon, authenticated, service_role;
grant execute on function public.change_user_password(uuid, text) to anon, authenticated, service_role;

-- 7. PERBAIKI AKUN YANG SAAT INI BERSTATUS 'pending' (seperti candra & candra y)
-- Password diset ke default: passbox123 (terenkripsi Bcrypt)
update public.profiles
set password_hash = extensions.crypt('passbox123', extensions.gen_salt('bf')),
    is_active = true,
    updated_at = now()
where password_hash = 'pending' or password_hash is null;

-- 8. Muat Ulang Schema Cache Supabase PostgREST (Menghilangkan Error 404)
notify pgrst, 'reload schema';
