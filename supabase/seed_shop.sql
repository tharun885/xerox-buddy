insert into public.shops (owner_id, shop_name, location)
select user_id, 'Campus Xerox Shop', 'Campus'
from public.profiles
where role = 'OWNER' and email = 'tharunpujari.31@gmail.com'
  and not exists (select 1 from public.shops);

insert into public.services (shop_id, service_name, category, price, price_unit)
select s.shop_id, v.n, v.c::public.service_category, v.p, v.u::public.price_unit
from public.shops s
cross join (values
  ('B&W Printing A4',   'PRINTING', 2,  'PER_PAGE'),
  ('Color Printing A4', 'PRINTING', 10, 'PER_PAGE'),
  ('Lamination A4',     'FINISHING', 20, 'PER_ITEM'),
  ('Spiral Binding',    'BINDING',  40, 'PER_ITEM')
) as v(n, c, p, u)
on conflict do nothing;
