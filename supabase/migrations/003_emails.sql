-- File number shown to guests + log of every guest e-mail (never sent twice).

alter table public.bookings add column if not exists ref text;
create unique index if not exists bookings_ref on public.bookings (ref) where ref is not null;

create table if not exists public.email_log (
  id bigserial primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null,
  status text not null default 'sent' check (status in ('sent', 'skipped')),
  at timestamptz not null default now(),
  unique (booking_id, kind)
);
alter table public.email_log enable row level security;
