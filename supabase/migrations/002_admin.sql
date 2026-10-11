-- Owner space, payment traceability, data retention.

alter table public.bookings add column if not exists deposit_payment_intent text;
alter table public.bookings add column if not exists balance_payment_intent text;
alter table public.bookings add column if not exists refunded_cents int not null default 0;
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings add column if not exists cancel_reason text;
alter table public.external_blocks add column if not exists note text;

-- failed owner logins, for rate limiting
create table if not exists public.admin_attempts (
  id bigserial primary key,
  ip text,
  at timestamptz not null default now()
);
alter table public.admin_attempts enable row level security;

-- retention promised in the privacy policy: IP 30 days, unpaid requests 30 days
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'retention';
select cron.schedule('retention', '30 3 * * *', $$
  update public.bookings set client_ip = null where client_ip is not null and created_at < now() - interval '30 days';
  delete from public.bookings where status in ('pending', 'expired') and created_at < now() - interval '30 days';
  delete from public.admin_attempts where at < now() - interval '1 day';
$$);
