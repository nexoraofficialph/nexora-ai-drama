-- Fix payment fulfillment validation and make payment-ID deduplication atomic.
-- Apply after 202611240001_direct_payments.sql.
drop function if exists public.nx_credit_paid_order(uuid,text,text);
create or replace function public.nx_credit_paid_order(
  p_order_id uuid,
  p_session_id text,
  p_payment_id text,
  p_amount bigint,
  p_currency text
) returns boolean
language plpgsql security definer set search_path=public
as $$
declare
  v_order public.nx_payment_orders%rowtype;
  v_ref text;
  v_ledger_id uuid;
begin
  if p_payment_id is null or p_session_id is null then raise exception 'payment_reference_required'; end if;
  select * into v_order from public.nx_payment_orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status='paid' then return false; end if;
  if v_order.status<>'pending' then raise exception 'order_not_pending'; end if;
  if p_currency<>'PHP' or p_amount<>v_order.amount_centavos then raise exception 'payment_amount_mismatch'; end if;
  v_ref := 'paymongo:' || p_payment_id;
  insert into public.nx_coin_ledger(user_id,delta,reason,reference_id)
    values(v_order.user_id,v_order.coins,'coin_purchase',v_ref)
    on conflict(reference_id) do nothing
    returning id into v_ledger_id;
  if v_ledger_id is null then return false; end if;
  insert into public.nx_coin_wallets(user_id,balance)
    values(v_order.user_id,v_order.coins)
    on conflict(user_id) do update
      set balance=public.nx_coin_wallets.balance+excluded.balance,updated_at=now();
  update public.nx_payment_orders set status='paid',
    checkout_session_id=coalesce(checkout_session_id,p_session_id),
    provider_payment_id=p_payment_id,paid_at=now()
    where id=p_order_id;
  return true;
end;
$$;
revoke all on function public.nx_credit_paid_order(uuid,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.nx_credit_paid_order(uuid,text,text,bigint,text) to service_role;
