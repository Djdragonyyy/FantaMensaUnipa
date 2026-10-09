-- All writes go through narrowly granted, transactional RPCs. No client table writes.
revoke create on schema public from public;
create table public.profiles(id uuid primary key references auth.users on delete cascade, nickname text not null check(length(nickname) between 2 and 32), created_at timestamptz not null default now());
create table public.admins(user_id uuid primary key references public.profiles, created_at timestamptz not null default now());
create table public.dishes(id text primary key, category text not null check(category in ('first','main','side','juice')), it text not null, en text not null, aliases text[] not null default '{}', active boolean not null default true);
create table public.days(day date primary key, status text not null default 'pending' check(status in ('pending','resolved','void')), menu jsonb, author uuid references public.profiles, accepted_at timestamptz, discrepancy boolean not null default false);
create table public.predictions(user_id uuid references public.profiles on delete cascade, day date references public.days, choices jsonb not null, revision int not null default 0 check(revision between 0 and 1), locked boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(user_id,day));
create table public.contributions(id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles, day date references public.days, menu jsonb, photo text unique, photo_state text check(photo_state in ('pending','ready','expired')), created_at timestamptz not null default now());
create table public.groups(id uuid primary key default gen_random_uuid(), owner uuid not null references public.profiles, name text not null check(length(name) between 2 and 64), private boolean not null default true, invite text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''), created_at timestamptz not null default now());
create unique index on public.groups(invite);
create table public.members(group_id uuid references public.groups on delete cascade, user_id uuid references public.profiles on delete cascade, joined_on date not null default (now() at time zone 'Europe/Rome')::date, primary key(group_id,user_id));
create table public.membership_history(id bigint generated always as identity primary key, group_id uuid references public.groups on delete cascade, user_id uuid references public.profiles on delete cascade, joined_on date not null, left_on date not null);
create table public.rules(group_id uuid references public.groups on delete cascade, month date not null, weights jsonb not null, primary key(group_id,month));
create table public.competitions(group_id uuid references public.groups on delete cascade, month date not null, weights jsonb not null, primary key(group_id,month));
create table public.requests(user_id uuid references public.profiles, request_id uuid, operation text not null, payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(), primary key(user_id,request_id));
create table public.rate_limits(user_id uuid references public.profiles, action text, bucket timestamptz, count int not null, primary key(user_id,action,bucket));
create table public.audit(id bigint generated always as identity primary key, actor uuid references public.profiles, action text not null, entity text not null, before_value jsonb, after_value jsonb, at timestamptz not null default now());
create table public.reports(id uuid primary key default gen_random_uuid(), author uuid references public.profiles, day date, body text not null check(length(body) between 5 and 1000), resolved boolean not null default false, created_at timestamptz not null default now());

create function public.game_now() returns timestamptz language sql volatile as $$ select clock_timestamp() $$;
create function public.today() returns date language sql volatile as $$ select (public.game_now() at time zone 'Europe/Rome')::date $$;
create function public.closed(d date) returns boolean language sql volatile security definer set search_path=pg_catalog,public as $$ select public.game_now() >= ((d + time '13:30') at time zone 'Europe/Rome') $$;
create function public.month_of(d date) returns date language sql immutable as $$ select date_trunc('month',d)::date $$;
create function public.is_member(g uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select 1 from public.members where group_id=g and user_id=auth.uid()) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select 1 from public.admins where user_id=auth.uid()) and coalesce(auth.jwt()->>'aal','')='aal2' $$;
create function public.require_user() returns uuid language plpgsql stable security definer set search_path=pg_catalog,public as $$ begin if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if; return auth.uid(); end $$;
create function public.rate(a text, lim int) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare n int; begin insert into public.rate_limits values(public.require_user(),a,date_trunc('hour',public.game_now()),1) on conflict(user_id,action,bucket) do update set count=public.rate_limits.count+1 returning count into n; if n>lim then raise exception 'RATE_LIMIT'; end if; end $$;
create function public.validate_choices(c jsonb, prediction boolean) returns boolean language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare cat text; value text; n int; begin
 if c is null or jsonb_typeof(c)<>'object' or (select count(*) from jsonb_object_keys(c))<>4 then return false; end if;
 foreach cat in array array['first','main','side','juice'] loop
  if jsonb_typeof(c->cat) is distinct from 'array' then return false; end if;
  n:=jsonb_array_length(c->cat); if n<1 or n>60 then return false; end if;
  if prediction and n<>(case when cat='main' then 3 else 1 end) then return false; end if;
  if (select count(distinct x) from jsonb_array_elements_text(c->cat) x)<>n then return false; end if;
  for value in select jsonb_array_elements_text(c->cat) loop
   if cat='juice' and value not in ('pesca','pera') then return false; end if;
   if not exists(select 1 from public.dishes where id=value and category=cat and active) then return false; end if;
  end loop;
 end loop; return true;
end $$;
create function public.valid_weights(w jsonb) returns boolean language plpgsql immutable as $$
declare k text; total int:=0; v numeric; begin
 if w is null or jsonb_typeof(w)<>'object' or (select count(*) from jsonb_object_keys(w))<>5 then return false; end if;
 foreach k in array array['first','main','side','juice','bonus'] loop
  if jsonb_typeof(w->k) is distinct from 'number' then return false; end if; v:=(w->>k)::numeric; if v<0 or v>100 or trunc(v)<>v then return false; end if; total:=total+v*case when k='main' then 3 else 1 end;
 end loop; return total<=100;
end $$;
create function public.score(c jsonb,m jsonb,w jsonb default '{"first":20,"main":15,"side":10,"juice":10,"bonus":15}') returns jsonb language plpgsql immutable as $$
declare cat text; hits int; pts int; total int:=0; perfect boolean:=true; detail jsonb:='{}'; begin
 if m is null then return null; end if;
 foreach cat in array array['first','main','side','juice'] loop
  select count(distinct x) into hits from jsonb_array_elements_text(c->cat) x where m->cat ? x;
  pts:=hits*(w->>cat)::int; total:=total+pts; perfect:=perfect and hits=jsonb_array_length(c->cat); detail:=detail||jsonb_build_object(cat,pts);
 end loop; pts:=case when perfect then (w->>'bonus')::int else 0 end;
 return detail||jsonb_build_object('bonus',pts,'total',total+pts);
end $$;
create function public.on_signup() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$ begin insert into public.profiles(id,nickname) values(new.id,'Player-'||left(new.id::text,8)); return new; end $$;
create trigger signup after insert on auth.users for each row execute function public.on_signup();
create function public.set_nickname(n text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$ begin perform public.rate('profile',20); update public.profiles set nickname=trim(n) where id=public.require_user(); end $$;

create function public.submit_prediction(c jsonb, request_id uuid, expected_revision int default -1) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=public.require_user(); d date:=public.today(); p public.predictions; old public.requests; result jsonb; g public.groups; mo date:=public.month_of(d); payload jsonb:=jsonb_build_object('choices',c,'revision',expected_revision,'day',d); begin
 insert into public.days(day) values(d) on conflict do nothing;
 perform 1 from public.days where day=d for update;
 select * into old from public.requests r where r.user_id=u and r.request_id=submit_prediction.request_id;
 if found then if old.operation<>'predict' or old.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return old.result; end if;
 if public.closed(d) then raise exception 'CLOSED'; end if;
 if (select status from public.days where day=d)='void' then raise exception 'DAY_VOID'; end if;
 if not public.validate_choices(c,true) then raise exception 'INVALID_CHOICES'; end if;
 perform public.rate('predict',30);
 select * into p from public.predictions where user_id=u and day=d for update;
 if found then
  if p.locked then raise exception 'LOCKED'; end if;
  if p.revision<>expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if p.revision>=1 then raise exception 'EDIT_USED'; end if;
  update public.predictions set choices=c,revision=1,updated_at=public.game_now() where user_id=u and day=d returning * into p;
 else
  if expected_revision<>-1 then raise exception 'REVISION_CONFLICT'; end if;
  insert into public.predictions(user_id,day,choices) values(u,d,c) returning * into p;
 end if;
 for g in select gr.* from public.groups gr join public.members mb on mb.group_id=gr.id where mb.user_id=u order by gr.id for update of gr loop
  insert into public.competitions values(g.id,mo,(select weights from public.rules where group_id=g.id and month<=mo order by month desc limit 1)) on conflict do nothing;
 end loop;
 result:=to_jsonb(p); insert into public.requests values(u,request_id,'predict',payload,result,public.game_now()); return result;
end $$;

create function public.contribute(m jsonb, request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=public.require_user(); d date:=public.today(); dy public.days; old public.requests; cid uuid; result jsonb; payload jsonb:=jsonb_build_object('menu',m,'day',d); begin
 perform 1 from public.days where day=d for update;
 select * into old from public.requests r where r.user_id=u and r.request_id=contribute.request_id;
 if found then if old.operation<>'menu' or old.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return old.result; end if;
 if not exists(select 1 from public.predictions where user_id=u and day=d) then raise exception 'PREDICT_FIRST'; end if;
 if not public.validate_choices(m,false) then raise exception 'INCOMPLETE_MENU'; end if;
 select * into dy from public.days where day=d;
 if dy.status='void' then raise exception 'DAY_VOID'; end if;
 perform public.rate('contribute',10);
 update public.predictions set locked=true where user_id=u and day=d;
 insert into public.contributions(user_id,day,menu) values(u,d,m) returning id into cid;
 if dy.menu is null then update public.days set menu=m,author=u,accepted_at=public.game_now(),status='resolved' where day=d;
 elsif exists(select 1 from jsonb_object_keys(m) k where not ((m->k) @> (dy.menu->k) and (dy.menu->k) @> (m->k))) then update public.days set discrepancy=true where day=d; end if;
 result:=jsonb_build_object('id',cid,'accepted',dy.menu is null); insert into public.requests values(u,request_id,'menu',payload,result,public.game_now()); return result;
end $$;

-- Photo reservations immediately lock predictions. Only service role can finalize.
create function public.reserve_photo(request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=public.require_user(); d date:=public.today(); cid uuid; path text; old public.requests; result jsonb; begin
 perform 1 from public.days where day=d for update;
 select * into old from public.requests r where r.user_id=u and r.request_id=reserve_photo.request_id;
 if found then if old.operation<>'photo' then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return old.result; end if;
 if not exists(select 1 from public.predictions where user_id=u and day=d) then raise exception 'PREDICT_FIRST'; end if;
 if (select status from public.days where day=d)='void' then raise exception 'DAY_VOID'; end if;
 perform public.rate('photo',5);
 cid:=gen_random_uuid(); path:=d::text||'/'||cid::text||'.jpg';
 update public.predictions set locked=true where user_id=u and day=d;
 insert into public.contributions(id,user_id,day,photo,photo_state) values(cid,u,d,path,'pending');
 result:=jsonb_build_object('id',cid,'path',path); insert into public.requests values(u,request_id,'photo',jsonb_build_object('day',d),result,public.game_now()); return result;
end $$;
create function public.finalize_photo(cid uuid) returns void language sql security definer set search_path=pg_catalog,public as $$ update public.contributions set photo_state='ready' where id=cid and photo_state='pending' $$;
create function public.photo_attempt() returns void language plpgsql security definer set search_path=pg_catalog,public as $$ begin perform public.rate('photo_attempt',15); end $$;

create function public.create_group(n text, priv boolean, request_id uuid) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare g uuid; u uuid:=public.require_user(); old public.requests; payload jsonb:=jsonb_build_object('name',n,'private',priv); begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into old from public.requests r where r.user_id=u and r.request_id=create_group.request_id;
 if found then if old.operation<>'group' or old.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return (old.result->>'id')::uuid; end if;
 perform public.rate('group',10); insert into public.groups(owner,name,private) values(u,trim(n),priv) returning id into g;
 insert into public.members values(g,u,public.today()); insert into public.rules values(g,public.month_of(public.today()),'{"first":15,"main":15,"side":15,"juice":10,"bonus":15}');
 if exists(select 1 from public.predictions where user_id=u and day=public.today()) then insert into public.competitions values(g,public.month_of(public.today()),'{"first":15,"main":15,"side":15,"juice":10,"bonus":15}'); end if;
 insert into public.requests values(u,request_id,'group',payload,jsonb_build_object('id',g),public.game_now()); return g;
end $$;
create function public.join_group(gid uuid default null, token text default null) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare g public.groups; u uuid:=public.require_user(); mo date:=public.month_of(public.today()); begin
 perform public.rate('join',30);
 select * into g from public.groups where (not private and id=gid) or (join_group.token is not null and invite=join_group.token) for update;
 if not found then raise exception 'GROUP_DENIED'; end if;
 insert into public.members values(g.id,u,public.today()) on conflict do nothing;
 if exists(select 1 from public.predictions where user_id=u and day>=public.today() and public.month_of(day)=mo) then
 insert into public.competitions values(g.id,mo,(select weights from public.rules where group_id=g.id and month<=mo order by month desc limit 1)) on conflict do nothing; end if;
 return g.id;
end $$;
create function public.manage_group(gid uuid, n text default null, rotate boolean default false, remove_user uuid default null, w jsonb default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare g public.groups; mo date:=public.month_of(public.today()); effective date; begin
 select * into g from public.groups where id=gid and owner=public.require_user() for update; if not found then raise exception 'GROUP_DENIED'; end if;
 if n is not null then update public.groups set name=trim(n) where id=gid; end if;
 if rotate then update public.groups set invite=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') where id=gid; end if;
 if remove_user is not null and remove_user<>g.owner then
  insert into public.membership_history(group_id,user_id,joined_on,left_on) select group_id,user_id,joined_on,public.today() from public.members where group_id=gid and user_id=remove_user;
  delete from public.members where group_id=gid and user_id=remove_user;
 end if;
 if w is not null then
  if not public.valid_weights(w) then raise exception 'INVALID_WEIGHTS'; end if;
  effective:=case when exists(select 1 from public.competitions where group_id=gid and month=mo) then (mo+interval '1 month')::date else mo end;
  insert into public.rules values(gid,effective,w) on conflict(group_id,month) do update set weights=excluded.weights;
 end if;
 insert into public.audit(actor,action,entity,before_value,after_value) values(auth.uid(),'group',gid::text,to_jsonb(g),jsonb_build_object('name',n,'rotate',rotate,'removed',remove_user,'weights',w,'effective',effective));
 return jsonb_build_object('effective',effective);
end $$;

create function public.leaderboard(mo date, gid uuid default null) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb; w jsonb; begin
 perform public.require_user(); mo:=public.month_of(mo);
 if gid is not null and not exists(select 1 from public.groups where id=gid and (not private or public.is_member(gid))) then raise exception 'GROUP_DENIED'; end if;
 w:=coalesce((select weights from public.competitions where group_id=gid and month=mo),(select weights from public.rules where group_id=gid and month<=mo order by month desc limit 1));
 if gid is null then w:='{"first":20,"main":15,"side":10,"juice":10,"bonus":15}'; end if;
 with totals as (
  select pr.id,pr.nickname,coalesce(sum((public.score(p.choices,d.menu,w)->>'total')::int) filter(where public.closed(p.day) and d.status='resolved' and (gid is null or exists(select 1 from public.members where group_id=gid and user_id=pr.id and p.day>=joined_on) or exists(select 1 from public.membership_history where group_id=gid and user_id=pr.id and p.day>=joined_on and p.day<left_on))),0)::int points
  from public.profiles pr
  left join public.predictions p on p.user_id=pr.id and public.month_of(p.day)=mo left join public.days d on d.day=p.day
  where gid is null or exists(select 1 from public.members where group_id=gid and user_id=pr.id and joined_on<(mo+interval '1 month')::date) or exists(select 1 from public.membership_history where group_id=gid and user_id=pr.id and joined_on<(mo+interval '1 month')::date and left_on>mo) group by pr.id,pr.nickname
 ), ranked as (select *,rank() over(order by points desc) place from totals)
 select coalesce(jsonb_agg(to_jsonb(r) order by points desc,nickname,id),'[]') into result from ranked r; return result;
end $$;
create function public.revealed_predictions(d date, gid uuid default null) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$ begin
 perform public.require_user(); if not public.closed(d) then return '[]'; end if;
 if gid is not null and not exists(select 1 from public.groups where id=gid and (not private or public.is_member(gid))) then raise exception 'GROUP_DENIED'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('nickname',pr.nickname,'choices',p.choices)) from public.predictions p join public.profiles pr on pr.id=p.user_id where p.day=d and (gid is null or exists(select 1 from public.members where group_id=gid and user_id=p.user_id and joined_on<=d))),'[]');
end $$;
create function public.snapshot(d date default null) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid(); dy public.days; p public.predictions; cl boolean; begin
 d:=coalesce(d,public.today()); cl:=public.closed(d); select * into dy from public.days where day=d; select * into p from public.predictions where user_id=u and day=d;
 return jsonb_build_object('now',public.game_now(),'day',d,'closed',cl,'status',coalesce(dy.status,'pending'),'prediction',case when p.user_id is null then null else to_jsonb(p) end,
 'menu',case when cl then dy.menu else null end,'discrepancy',case when cl then dy.discrepancy else false end,
 'score',case when cl and dy.status='resolved' and p.user_id is not null then public.score(p.choices,dy.menu) else null end,
 'contributions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'author',pr.nickname,'created_at',c.created_at,'menu',c.menu,'photo',case when cl and photo_state='ready' then photo else null end,'photo_state',photo_state)) from public.contributions c join public.profiles pr on pr.id=c.user_id where c.day=d and (cl or c.user_id=u)),'[]'),
 'profile',(select to_jsonb(pr) from public.profiles pr where pr.id=u),'admin',public.is_admin(),
 'months',coalesce((select jsonb_agg(m order by m desc) from (select distinct public.month_of(day) m from public.predictions union select public.month_of(public.today())) x),'[]'));
end $$;
create function public.list_groups() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'private',g.private,'owner',g.owner,'member',public.is_member(g.id),'invite',case when g.owner=auth.uid() then g.invite else null end,'members',case when public.is_member(g.id) then (select jsonb_agg(jsonb_build_object('id',pr.id,'nickname',pr.nickname,'joined_on',m.joined_on)) from public.members m join public.profiles pr on pr.id=m.user_id where group_id=g.id) else '[]'::jsonb end,'rules',(select jsonb_agg(to_jsonb(r) order by month desc) from public.rules r where group_id=g.id),'competition',(select weights from public.competitions where group_id=g.id and month=public.month_of(public.today())))),'[]') from public.groups g where not private or public.is_member(g.id)
$$;
create function public.report_issue(d date, body text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$ begin perform public.rate('report',10); insert into public.reports(author,day,body) values(public.require_user(),d,body); end $$;

create function public.admin_day(d date, m jsonb default null, cancel boolean default false, reason text default null) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare old public.days; begin
 if not public.is_admin() then raise exception 'ADMIN_MFA_REQUIRED'; end if;
 if reason is null or length(reason)<5 then raise exception 'REASON_REQUIRED'; end if;
 insert into public.days(day) values(d) on conflict do nothing; select * into old from public.days where day=d for update;
 if not cancel and not public.validate_choices(m,false) then raise exception 'INCOMPLETE_MENU'; end if;
 update public.days set menu=case when cancel then null else m end,status=case when cancel then 'void' else 'resolved' end,discrepancy=false,author=auth.uid(),accepted_at=public.game_now() where day=d;
 insert into public.audit(actor,action,entity,before_value,after_value) values(auth.uid(),'day',d::text,to_jsonb(old),jsonb_build_object('menu',m,'cancel',cancel,'reason',reason));
end $$;
create function public.admin_dish(did text, cat text, name_it text, name_en text, alias_list text[], enabled boolean) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare old public.dishes; begin
 if not public.is_admin() then raise exception 'ADMIN_MFA_REQUIRED'; end if;
 if did !~ '^[a-z0-9_-]{2,60}$' or length(name_it) not between 2 and 100 or length(name_en) not between 2 and 100 then raise exception 'INVALID_DISH'; end if;
 select * into old from public.dishes where id=did;
 if old.id is not null and old.category<>cat then raise exception 'STABLE_CATEGORY'; end if;
 insert into public.dishes values(did,cat,name_it,name_en,alias_list,enabled) on conflict(id) do update set it=excluded.it,en=excluded.en,aliases=excluded.aliases,active=excluded.active;
 insert into public.audit(actor,action,entity,before_value,after_value) values(auth.uid(),'dish',did,to_jsonb(old),(select to_jsonb(x) from public.dishes x where id=did));
end $$;
create function public.admin_data() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$ begin if not public.is_admin() then raise exception 'ADMIN_MFA_REQUIRED'; end if; return jsonb_build_object('audit',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.audit order by at desc limit 100) x),'[]'),'reports',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.reports order by created_at desc limit 100) x),'[]')); end $$;
create function public.admin_report(rid uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$ begin if not public.is_admin() then raise exception 'ADMIN_MFA_REQUIRED'; end if; update public.reports set resolved=true where id=rid; insert into public.audit(actor,action,entity) values(auth.uid(),'report_resolved',rid::text); end $$;

-- Default deny for direct access (including views/query tricks), except catalog.
do $$ declare t text; begin foreach t in array array['profiles','admins','dishes','days','predictions','contributions','groups','members','membership_history','rules','competitions','requests','rate_limits','audit','reports'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); end loop; end $$;
grant select on public.dishes to anon,authenticated;
create policy catalog_read on public.dishes for select to anon,authenticated using(true);
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.snapshot(date) to anon,authenticated;
grant execute on function public.submit_prediction(jsonb,uuid,int),public.contribute(jsonb,uuid),public.reserve_photo(uuid),public.set_nickname(text),public.create_group(text,boolean,uuid),public.join_group(uuid,text),public.manage_group(uuid,text,boolean,uuid,jsonb),public.leaderboard(date,uuid),public.revealed_predictions(date,uuid),public.list_groups(),public.report_issue(date,text),public.admin_day(date,jsonb,boolean,text),public.admin_dish(text,text,text,text,text[],boolean),public.admin_data(),public.admin_report(uuid) to authenticated;
grant execute on function public.finalize_photo(uuid) to service_role;
grant execute on function public.photo_attempt() to authenticated;
grant execute on function public.closed(date) to authenticated;
