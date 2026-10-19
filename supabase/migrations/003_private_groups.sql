-- Private groups are the active product. Historical general ranking remains admin-only.
update public.groups set private=true;
alter table public.groups add constraint groups_private_only check(private);
create or replace function public.create_group(n text,priv boolean,request_id uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare g uuid; u uuid:=public.require_user(); old public.requests; payload jsonb:=jsonb_build_object('name',n,'private',priv);
begin
 if priv is distinct from true then raise exception 'PRIVATE_GROUPS_ONLY'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into old from public.requests r where r.user_id=u and r.request_id=create_group.request_id;
 if found then if old.operation<>'group' or old.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return (old.result->>'id')::uuid; end if;
 perform public.rate('group',10); insert into public.groups(owner,name,private) values(u,trim(n),true) returning id into g;
 insert into public.members values(g,u,public.today()); insert into public.rules values(g,public.month_of(public.today()),'{"first":15,"main":15,"side":15,"juice":10,"bonus":15}');
 if exists(select 1 from public.predictions where user_id=u and day=public.today()) then insert into public.competitions values(g,public.month_of(public.today()),'{"first":15,"main":15,"side":15,"juice":10,"bonus":15}'); end if;
 insert into public.requests values(u,request_id,'group',payload,jsonb_build_object('id',g),public.game_now()); return g;
end $$;

alter function public.leaderboard(date,uuid) rename to leaderboard_internal;
revoke all on function public.leaderboard_internal(date,uuid) from public,anon,authenticated;
create function public.leaderboard(mo date,gid uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_MFA_REQUIRED'; end if;
 return public.leaderboard_internal(mo,gid);
end $$;
alter function public.revealed_predictions(date,uuid) rename to revealed_predictions_internal;
revoke all on function public.revealed_predictions_internal(date,uuid) from public,anon,authenticated;
create function public.revealed_predictions(d date,gid uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_MFA_REQUIRED'; end if;
 return public.revealed_predictions_internal(d,gid);
end $$;

create table public.group_dishes(
 group_id uuid not null references public.groups on delete cascade,
 category text not null check(category in ('first','main','side','juice')),
 name text not null check(length(name) between 2 and 100),
 primary key(group_id,category,name)
);
create table public.group_menus(
 group_id uuid not null references public.groups on delete cascade,
 day date not null, menu jsonb not null, revision int not null default 0,
 updated_at timestamptz not null default now(),
 primary key(group_id,day)
);
alter table public.group_dishes enable row level security;
alter table public.group_menus enable row level security;
revoke all on public.group_dishes,public.group_menus from public,anon,authenticated;

create function public.group_menu(gid uuid,d date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 perform public.require_user();
 if not public.is_member(gid) then raise exception 'GROUP_DENIED'; end if;
 return jsonb_build_object('day',d,'entry',(select to_jsonb(m) from public.group_menus m where group_id=gid and day=d),
 'dishes',coalesce((select jsonb_agg(to_jsonb(c) order by category,name) from public.group_dishes c where group_id=gid),'[]'::jsonb));
end $$;

create function public.save_group_menu(gid uuid,d date,m jsonb,expected_revision int default -1) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=public.require_user(); previous public.group_menus; cat text; label text; result public.group_menus;
begin
 perform 1 from public.groups where id=gid and owner=u for update;
 if not found then raise exception 'GROUP_DENIED'; end if;
 if d is null or m is null or jsonb_typeof(m)<>'object' or (select count(*) from jsonb_object_keys(m))<>4 then raise exception 'INCOMPLETE_MENU'; end if;
 foreach cat in array array['first','main','side','juice'] loop
  if jsonb_typeof(m->cat) is distinct from 'array' then raise exception 'INCOMPLETE_MENU'; end if;
  if jsonb_array_length(m->cat) not between 1 and 60 then raise exception 'INCOMPLETE_MENU'; end if;
  if exists(select 1 from jsonb_array_elements(m->cat) x where jsonb_typeof(x)<>'string') then raise exception 'INVALID_CHOICES'; end if;
  if (select count(distinct lower(trim(x))) from jsonb_array_elements_text(m->cat) x)<>jsonb_array_length(m->cat) then raise exception 'INVALID_CHOICES'; end if;
  for label in select jsonb_array_elements_text(m->cat) loop
   if length(trim(label)) not between 2 and 100 or label~'[\n\r]' then raise exception 'INVALID_CHOICES'; end if;
  end loop;
 end loop;
 select * into previous from public.group_menus where group_id=gid and day=d for update;
 if coalesce(previous.revision,-1)<>expected_revision then raise exception 'REVISION_CONFLICT'; end if;
 perform public.rate('group_menu',60);
 insert into public.group_menus(group_id,day,menu,revision,updated_at) values(gid,d,m,0,public.game_now())
 on conflict(group_id,day) do update set menu=excluded.menu,revision=group_menus.revision+1,updated_at=excluded.updated_at returning * into result;
 foreach cat in array array['first','main','side','juice'] loop
  for label in select jsonb_array_elements_text(m->cat) loop
   insert into public.group_dishes values(gid,cat,trim(label)) on conflict do nothing;
  end loop;
 end loop;
 insert into public.audit(actor,action,entity,before_value,after_value) values(u,'group_menu',gid::text||'/'||d,to_jsonb(previous),to_jsonb(result));
 return to_jsonb(result);
end $$;
revoke all on function public.group_menu(uuid,date),public.save_group_menu(uuid,date,jsonb,int),public.create_group(text,boolean,uuid),public.leaderboard(date,uuid),public.revealed_predictions(date,uuid) from public,anon;
grant execute on function public.group_menu(uuid,date),public.save_group_menu(uuid,date,jsonb,int),public.create_group(text,boolean,uuid),public.leaderboard(date,uuid),public.revealed_predictions(date,uuid) to authenticated;
