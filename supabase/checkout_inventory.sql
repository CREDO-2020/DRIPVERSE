-- DRIPVERSE checkout inventory reservation hardening.
-- Run this script in the Supabase SQL Editor when deploying the checkout database changes.

alter table public.orders
  add column if not exists inventory_reserved boolean not null default false,
  add column if not exists inventory_released_at timestamptz;

create or replace function public.create_order_from_cart(p_shipping_address jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_subtotal integer;
  v_shipping integer;
  v_total integer;
  v_item record;
  v_updated_rows integer;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order.';
  end if;

  if p_shipping_address is null
     or coalesce(trim(p_shipping_address ->> 'full_name'), '') = ''
     or coalesce(trim(p_shipping_address ->> 'phone'), '') = ''
     or coalesce(trim(p_shipping_address ->> 'district'), '') = ''
     or coalesce(trim(p_shipping_address ->> 'address'), '') = '' then
    raise exception 'Please provide your name, phone, district, and delivery address.';
  end if;

  if exists (
    select 1
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = v_user_id
      and (p.is_active = false or p.stock_quantity < ci.quantity)
  ) then
    raise exception 'One or more items are unavailable or no longer have enough stock.';
  end if;

  select coalesce(sum(p.price_rwf * ci.quantity), 0)::integer
  into v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = v_user_id and p.is_active = true;

  if v_subtotal <= 0 then
    raise exception 'Your shopping bag is empty.';
  end if;

  -- Reserve stock atomically in stable product-id order. If any item fails,
  -- the exception rolls back every stock update in this transaction.
  for v_item in
    select ci.product_id, ci.quantity
    from public.cart_items ci
    where ci.user_id = v_user_id
    order by ci.product_id
  loop
    update public.products p
    set stock_quantity = p.stock_quantity - v_item.quantity,
        updated_at = now()
    where p.id = v_item.product_id
      and p.is_active = true
      and p.stock_quantity >= v_item.quantity;

    get diagnostics v_updated_rows = row_count;
    if v_updated_rows <> 1 then
      raise exception 'Stock changed while checking out. Please review your bag and try again.';
    end if;
  end loop;

  v_shipping := case when v_subtotal >= 150000 then 0 else 3000 end;
  v_total := v_subtotal + v_shipping;

  insert into public.orders (
    user_id, status, currency, subtotal_rwf, shipping_rwf, total_rwf,
    shipping_address, inventory_reserved
  )
  values (
    v_user_id, 'pending', 'RWF', v_subtotal, v_shipping, v_total,
    p_shipping_address, true
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price_rwf, quantity)
  select v_order_id, p.id, p.name, p.price_rwf, ci.quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = v_user_id and p.is_active = true;

  delete from public.cart_items where user_id = v_user_id;
  return v_order_id;
end;
$function$;

create or replace function public.release_reserved_inventory_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.status is distinct from new.status
     and new.status = 'cancelled'
     and new.inventory_reserved = true
     and new.inventory_released_at is null then
    update public.products p
    set stock_quantity = p.stock_quantity + oi.quantity,
        updated_at = now()
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;

    update public.orders
    set inventory_released_at = now()
    where id = new.id
      and inventory_released_at is null;
  end if;
  return new;
end;
$function$;

create or replace function public.prevent_cancelled_order_reopening()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be reopened. Create a new order instead.';
  end if;
  return new;
end;
$function$;

drop trigger if exists orders_release_inventory_on_cancel on public.orders;
create trigger orders_release_inventory_on_cancel
after update of status on public.orders
for each row execute function public.release_reserved_inventory_on_cancel();

drop trigger if exists orders_prevent_cancelled_reopening on public.orders;
create trigger orders_prevent_cancelled_reopening
before update of status on public.orders
for each row execute function public.prevent_cancelled_order_reopening();

revoke all on function public.create_order_from_cart(jsonb) from public, anon;
grant execute on function public.create_order_from_cart(jsonb) to authenticated;
revoke all on function public.release_reserved_inventory_on_cancel() from public, anon, authenticated;
revoke all on function public.prevent_cancelled_order_reopening() from public, anon, authenticated;

-- This function is intended to run only as the auth.users insert trigger.
-- Trigger execution does not require callers to have direct RPC permission.
revoke all on function public.handle_new_user() from public, anon, authenticated;
