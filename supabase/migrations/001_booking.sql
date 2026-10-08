-- Réservations directes de la Résidence Les Cerfs.
-- Tout passe par les Edge Functions (clé service) : aucune table n'est lisible publiquement.

create extension if not exists btree_gist;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  checkin date not null,
  checkout date not null,
  adults int not null check (adults >= 1),
  children int not null default 0 check (children >= 0),
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  message text,
  total_cents int not null,
  deposit_cents int not null,
  balance_cents int not null,
  balance_due date,
  quote jsonb not null,
  hold_until timestamptz,               -- a pending booking blocks the dates until then
  client_ip text,
  stripe_session_id text unique,
  stripe_customer_id text,
  stripe_payment_method_id text,
  deposit_paid_at timestamptz,
  balance_status text not null default 'none'
    check (balance_status in ('none', 'scheduled', 'paid', 'failed')),
  balance_paid_at timestamptz,
  balance_error text,
  ical_uid text not null default (gen_random_uuid()::text || '@residence-les-cerfs'),
  constraint stay_dates check (checkout > checkin),
  -- two live bookings can never share a night, even if paid at the same second
  constraint no_double_booking exclude using gist (daterange(checkin, checkout) with &&)
    where (status in ('pending', 'confirmed'))
);

create index if not exists bookings_balance_due on public.bookings (balance_due)
  where status = 'confirmed' and balance_status = 'scheduled';

-- Nights blocked on other platforms (Airbnb…), refreshed from their iCal feed.
create table if not exists public.external_blocks (
  id bigserial primary key,
  source text not null,
  uid text,
  start_date date not null,
  end_date date not null,
  summary text,
  synced_at timestamptz not null default now()
);
create index if not exists external_blocks_range on public.external_blocks (source, start_date, end_date);

create table if not exists public.sync_state (
  source text primary key,
  last_sync timestamptz,
  last_error text,
  event_count int
);

alter table public.bookings enable row level security;
alter table public.external_blocks enable row level security;
alter table public.sync_state enable row level security;

-- Atomic replacement of one platform's blocks (no window where the calendar looks empty).
create or replace function public.replace_external_blocks(p_source text, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  delete from external_blocks where source = p_source;
  insert into external_blocks (source, uid, start_date, end_date, summary)
  select p_source, r->>'uid', (r->>'start')::date, (r->>'end')::date, r->>'summary'
  from jsonb_array_elements(p_rows) r;
  get diagnostics n = row_count;
  insert into sync_state (source, last_sync, last_error, event_count)
  values (p_source, now(), null, n)
  on conflict (source) do update set last_sync = now(), last_error = null, event_count = n;
  return n;
end $$;

revoke all on function public.replace_external_blocks(text, jsonb) from public, anon, authenticated;
