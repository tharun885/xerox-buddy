create type public.service_category as enum ('PRINTING','COPYING','BINDING','FINISHING','PHOTO','PROMOTIONAL');
create type public.price_unit as enum ('PER_PAGE','PER_ITEM');
create type public.shop_status as enum ('OPEN','CLOSED');
create type public.order_status as enum ('CREATED','PAYMENT_PENDING','PAID','RECEIVED','PRINTING','READY','COLLECTED','CANCELLED','NEEDS_CLARIFICATION');
create type public.payment_status as enum ('PENDING','PAID','FAILED','REFUNDED');
create type public.color_mode as enum ('BW','COLOR');
create type public.sides_mode as enum ('SINGLE','DOUBLE');

create table public.shops (
  shop_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id),
  shop_name text not null,
  location text,
  status public.shop_status not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table public.services (
  service_id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(shop_id) on delete cascade,
  service_name text not null,
  category public.service_category not null,
  price numeric(10,2) not null check (price >= 0),
  price_unit public.price_unit not null default 'PER_ITEM',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, service_name)
);

create table public.orders (
  order_id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  student_id uuid not null references public.profiles(user_id),
  shop_id uuid not null references public.shops(shop_id),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  platform_fee numeric(10,2) not null default 0 check (platform_fee >= 0),
  payment_status public.payment_status not null default 'PENDING',
  order_status public.order_status not null default 'CREATED',
  order_note text check (char_length(order_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  item_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete cascade,
  service_id uuid references public.services(service_id) on delete set null,
  item_type text not null,
  file_name text not null,
  copies int not null default 1 check (copies between 1 and 500),
  color public.color_mode not null default 'BW',
  paper_size text not null default 'A4' check (paper_size in ('A4','A3')),
  sides public.sides_mode not null default 'SINGLE',
  page_range text not null default 'ALL' check (char_length(page_range) <= 100),
  finishing text[] not null default '{}',
  note text check (char_length(note) <= 300),
  price numeric(10,2) not null check (price >= 0)
);

create table public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id),
  user_id uuid not null references public.profiles(user_id),
  amount numeric(10,2) not null check (amount > 0),
  gateway text not null default 'razorpay',
  gateway_transaction_id text unique,
  status public.payment_status not null default 'PENDING',
  created_at timestamptz not null default now()
);

create index on public.services (shop_id);
create index on public.orders (student_id);
create index on public.orders (shop_id, order_status);
create index on public.order_items (order_id);
create index on public.payments (order_id);

-- helper functions (security definer so policies don't recurse)
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.user_id = (select auth.uid()) and p.role = 'ADMIN');
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function public.is_shop_owner(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shops s
                 where s.shop_id = p_shop_id and s.owner_id = (select auth.uid()));
$$;
revoke execute on function public.is_shop_owner(uuid) from public, anon;
grant execute on function public.is_shop_owner(uuid) to authenticated;

-- RLS
alter table public.shops enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

revoke all on public.shops, public.services, public.orders, public.order_items, public.payments from anon, authenticated;
grant select on public.shops, public.services, public.orders, public.order_items, public.payments to authenticated;
grant insert, update, delete on public.shops to authenticated;
grant insert, update, delete on public.services to authenticated;
grant update (order_status) on public.orders to authenticated;

-- shops
create policy "read shops" on public.shops for select to authenticated using (true);
create policy "admin manages shops" on public.shops for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- services
create policy "read services" on public.services for select to authenticated
  using (active or public.is_shop_owner(shop_id) or public.is_admin());
create policy "owner manages services" on public.services for all to authenticated
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- orders
create policy "student reads own orders" on public.orders for select to authenticated
  using (student_id = (select auth.uid()));
create policy "owner reads paid shop orders" on public.orders for select to authenticated
  using (public.is_shop_owner(shop_id) and payment_status = 'PAID');
create policy "admin reads orders" on public.orders for select to authenticated
  using (public.is_admin());
create policy "owner updates order status" on public.orders for update to authenticated
  using (public.is_shop_owner(shop_id) and payment_status = 'PAID'
         and order_status in ('PAID','RECEIVED','PRINTING','READY','NEEDS_CLARIFICATION'))
  with check (public.is_shop_owner(shop_id) and payment_status = 'PAID'
         and order_status in ('RECEIVED','PRINTING','READY','COLLECTED','NEEDS_CLARIFICATION'));

-- order_items (visibility follows the parent order's RLS)
create policy "read items of visible orders" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.order_id = order_items.order_id));

-- payments
create policy "student reads own payments" on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- profiles: admin sees all; owner sees students who have paid orders at their shop
create policy "admin reads profiles" on public.profiles for select to authenticated
  using (public.is_admin());
create policy "owner reads customer profiles" on public.profiles for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.student_id = profiles.user_id
                   and o.payment_status = 'PAID'
                   and public.is_shop_owner(o.shop_id)));

-- order status guard + updated_at
create function public.orders_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.order_status is distinct from old.order_status then
    if (old.order_status::text, new.order_status::text) not in (
      ('CREATED','PAYMENT_PENDING'),('PAYMENT_PENDING','PAID'),('PAID','RECEIVED'),
      ('RECEIVED','PRINTING'),('PRINTING','READY'),('READY','COLLECTED'),('READY','PRINTING'),
      ('RECEIVED','NEEDS_CLARIFICATION'),('PRINTING','NEEDS_CLARIFICATION'),
      ('NEEDS_CLARIFICATION','RECEIVED'),
      ('CREATED','CANCELLED'),('PAYMENT_PENDING','CANCELLED'),('PAID','CANCELLED'),
      ('RECEIVED','CANCELLED'),('NEEDS_CLARIFICATION','CANCELLED')
    ) then
      raise exception 'Invalid order status change: % -> %', old.order_status, new.order_status;
    end if;
  end if;
  return new;
end; $$;

create trigger orders_guard_trg before update on public.orders
  for each row execute function public.orders_guard();
