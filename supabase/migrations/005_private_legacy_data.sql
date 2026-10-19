-- The former general game must not reveal evidence to unrelated accounts.
create or replace function public.can_read_photo(path text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.contributions c where c.photo=path and c.photo_state='ready' and public.closed(c.day) and (c.user_id=auth.uid() or public.is_admin()))
$$;
alter function public.snapshot(date) rename to snapshot_internal;
revoke all on function public.snapshot_internal(date) from public,anon,authenticated;
create function public.snapshot(d date default null) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;u uuid:=auth.uid();actual_day date:=coalesce(d,public.today());begin
 if public.is_admin() then return public.snapshot_internal(d);end if;
 -- No global menu, ranking activity or evidence of other people in the private product.
 return jsonb_build_object('now',public.game_now(),'day',actual_day,'closed',public.closed(actual_day),'status','pending','menu',null,'score',null,'discrepancy',false,
 'prediction',(select to_jsonb(p) from public.predictions p where user_id=u and day=actual_day),
 'profile',(select to_jsonb(p) from public.profiles p where id=u),'admin',false,
 'months',jsonb_build_array(public.month_of(public.today())),
 'contributions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'author',p.nickname,'created_at',c.created_at,'menu',c.menu,'photo',case when public.closed(actual_day) and photo_state='ready' then photo else null end,'photo_state',photo_state)) from public.contributions c join public.profiles p on p.id=c.user_id where c.user_id=u and c.day=actual_day),'[]'::jsonb));
end $$;
revoke all on function public.snapshot(date) from public;
grant execute on function public.snapshot(date) to anon,authenticated;
