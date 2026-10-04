create type public.user_role as enum ('STUDENT','OWNER','ADMIN');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  role public.user_role not null default 'STUDENT',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone) on public.profiles to authenticated;

create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.email, 'STUDENT');
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();