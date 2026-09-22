-- PROPUESTA: ejecutar únicamente en el NUEVO proyecto Supabase financiero.
-- No aplicada por el agente. No ejecutar en la base de app-alquileres-3.0.
begin;
create table public.expenses (
  id uuid primary key,
  description text not null check (char_length(description) between 1 and 160),
  category text not null check (char_length(category) between 1 and 80),
  kind text not null check (kind in ('fijo', 'variable', 'varios')),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  currency text not null default 'ARS' check (currency = 'ARS'),
  incurred_on date not null,
  receipt_path text not null unique,
  receipt_name text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (incurred_on desc, id);
alter table public.expenses enable row level security;
revoke all on public.expenses from public, anon, authenticated;
grant select, insert on public.expenses to service_role;
-- Sin políticas para clientes: acceso exclusivo a través del servidor autenticado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expense-receipts', 'expense-receipts', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png']);
-- Sin políticas públicas de storage.objects. El servidor entrega URLs de 60 segundos.
commit;
