-- NEXORA AI DRAMA direct payments v1
-- Run this migration in the Supabase SQL editor before deploying payment functions.
create table if not exists public.nx_coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.nx_coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta bigint not null,
  reason text not null,
  reference_id text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.nx_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null,
  coins bigint not null check (coins > 0),
  amount_centavos bigint not null check (amount_centavos > 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  provider text not null default 'paymongo',
  checkout_session_id text unique,
  provider_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists nx_payment_orders_user_created_idx on public.nx_payment_orders(user_id,created_at desc);
alter table public.nx_coin_wallets enable row level security;
alter table public.nx_coin_ledger enable row level security;
alter table public.nx_payment_orders enable row level security;
-- Users may read only their own wallet/ledger/order records. No client writes.
drop policy if exists nx_wallet_read_own on public.nx_coin_wallets;
create policy nx_wallet_read_own on public.nx_coin_wallets for select to authenticated using (auth.uid() = user_id);
drop policy if exists nx_ledger_read_own on public.nx_coin_ledger;
create policy nx_ledger_read_own on public.nx_coin_ledger for select to authenticated using (auth.uid() = user_id);
drop policy if exists nx_orders_read_own on public.nx_payment_orders;
create policy nx_orders_read_own on public.nx_payment_orders for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.nx_coin_wallets from anon, authenticated;
revoke insert, update, delete on public.nx_coin_ledger from anon, authenticated;
revoke insert, update, delete on public.nx_payment_orders from anon, authenticated;

-- Service-role-only RPC. Credits coins once per unique payment reference.
create or replace function public.nx_credit_paid_order(p_order_id uuid, p_session_id text, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.nx_payment_orders%rowtype;
  v_ref text;
begin
  select * into v_order from public.nx_payment_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status = 'paid' then return false; end if;
  if v_order.status <> 'pending' then raise exception 'order_not_pending'; end if;
  update public.nx_payment_orders
    set status='paid', checkout_session_id=coalesce(checkout_session_id,p_session_id),
        provider_payment_id=coalesce(provider_payment_id,p_payment_id), paid_at=now()
    where id=p_order_id;
  insert into public.nx_coin_wallets(user_id,balance)
    values (v_order.user_id, v_order.coins)
    on conflict (user_id) do update set balance=public.nx_coin_wallets.balance+excluded.balance, updated_at=now();
  v_ref := 'paymongo:' || coalesce(p_payment_id,p_session_id,p_order_id::text);
  insert into public.nx_coin_ledger(user_id,delta,reason,reference_id)
    values(v_order.user_id,v_order.coins,'coin_purchase',v_ref)
    on conflict(reference_id) do nothing;
  return true;
end;
$$;
revoke all on function public.nx_credit_paid_order(uuid,text,text) from public, anon, authenticated;
grant execute on function public.nx_credit_paid_order(uuid,text,text) to service_role;
