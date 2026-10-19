-- Virtual fantasy points only. Odds are hundredths and frozen per group/day.
create table public.group_event_rules(group_id uuid primary key references public.groups on delete cascade,odds jsonb not null,revision int not null default 0);
create table public.group_event_days(group_id uuid references public.groups on delete cascade,day date,odds jsonb not null,events jsonb,cheese jsonb,revision int not null default -1,primary key(group_id,day));
create table public.group_event_tickets(group_id uuid,day date,user_id uuid references public.profiles,picks jsonb not null,revision int not null default 0,created_at timestamptz not null default now(),primary key(group_id,day,user_id),foreign key(group_id,day) references public.group_event_days on delete cascade);
alter table public.group_event_rules enable row level security;
alter table public.group_event_days enable row level security;
alter table public.group_event_tickets enable row level security;
revoke all on public.group_event_rules,public.group_event_days,public.group_event_tickets from public,anon,authenticated;

create function public.event_default_odds() returns jsonb language sql immutable as $$select '{"plates":250,"permesso":150,"sgomberare":300,"trays":200,"cheese":180}'::jsonb$$;
create function public.valid_event_odds(o jsonb) returns boolean language plpgsql immutable as $$
declare k text;v numeric;begin
 if o is null or jsonb_typeof(o)<>'object' or (select count(*) from jsonb_object_keys(o))<>5 then return false;end if;
 foreach k in array array['plates','permesso','sgomberare','trays','cheese'] loop
  if jsonb_typeof(o->k) is distinct from 'number' then return false;end if;v:=(o->>k)::numeric;
  if v<100 or v>1000 or mod(v,10)<>0 then return false;end if;
 end loop;return true;
end $$;
create function public.event_score(p jsonb,o jsonb,e jsonb,c boolean) returns jsonb language plpgsql immutable as $$
declare k text;v int;total int:=0;detail jsonb:='{}';begin
 if e is null or c is null then return null;end if;
 foreach k in array array['plates','permesso','sgomberare','trays','cheese'] loop
  v:=case when (p->>k)::boolean and (case when k='cheese' then c else (e->>k)::boolean end) then (o->>k)::int/10 else 0 end;
  detail:=detail||jsonb_build_object(k,v);total:=total+v;
 end loop;return detail||jsonb_build_object('total',total);
end $$;
create function public.set_event_odds(gid uuid,o jsonb,expected_revision int default -1) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare old public.group_event_rules;begin
 perform 1 from public.groups where id=gid and owner=public.require_user() for update;if not found then raise exception 'GROUP_DENIED';end if;
 if not public.valid_event_odds(o) then raise exception 'INVALID_ODDS';end if;
 select * into old from public.group_event_rules where group_id=gid;
 if coalesce(old.revision,-1)<>expected_revision then raise exception 'REVISION_CONFLICT';end if;
 insert into public.group_event_rules values(gid,o,0) on conflict(group_id) do update set odds=excluded.odds,revision=group_event_rules.revision+1;
 insert into public.audit(actor,action,entity,before_value,after_value) values(auth.uid(),'event_odds',gid::text,to_jsonb(old),o);
end $$;
create function public.submit_event_ticket(gid uuid,d date,p jsonb,expected_revision int default -1) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare u uuid:=public.require_user();k text;old public.group_event_tickets;begin
 perform 1 from public.groups where id=gid for update;
 if not public.is_member(gid) then raise exception 'GROUP_DENIED';end if;
 if d is distinct from public.today() or public.closed(d) then raise exception 'CLOSED';end if;
 if p is null or jsonb_typeof(p)<>'object' or (select count(*) from jsonb_object_keys(p))<>5 then raise exception 'INVALID_EVENTS';end if;
 foreach k in array array['plates','permesso','sgomberare','trays','cheese'] loop
  if jsonb_typeof(p->k) is distinct from 'boolean' then raise exception 'INVALID_EVENTS';end if;
 end loop;
 if not exists(select 1 from jsonb_each(p) v where v.value='true') then raise exception 'INVALID_EVENTS';end if;
 select * into old from public.group_event_tickets where group_id=gid and day=d and user_id=u;
 if coalesce(old.revision,-1)<>expected_revision then raise exception 'REVISION_CONFLICT';end if;
 if old.revision>=1 then raise exception 'EDIT_USED';end if;
 perform public.rate('event_ticket',30);
 insert into public.group_event_days(group_id,day,odds) values(gid,d,coalesce((select odds from public.group_event_rules where group_id=gid),public.event_default_odds())) on conflict do nothing;
 insert into public.group_event_tickets(group_id,day,user_id,picks) values(gid,d,u,p) on conflict(group_id,day,user_id) do update set picks=excluded.picks,revision=group_event_tickets.revision+1;
end $$;
create function public.save_event_results(gid uuid,d date,e jsonb,c jsonb,expected_revision int default -1) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare k text;old public.group_event_days;begin
 perform 1 from public.groups where id=gid and owner=public.require_user() for update;if not found then raise exception 'GROUP_DENIED';end if;
 if d is null or not public.closed(d) then raise exception 'RESULTS_AFTER_CLOSE';end if;
 select * into old from public.group_event_days where group_id=gid and day=d;
 if not found then raise exception 'NO_EVENT_TICKETS';end if;
 if old.revision<>expected_revision then raise exception 'REVISION_CONFLICT';end if;
 if e is null or jsonb_typeof(e)<>'object' or (select count(*) from jsonb_object_keys(e))<>4 then raise exception 'INVALID_EVENTS';end if;
 foreach k in array array['plates','permesso','sgomberare','trays'] loop
  if jsonb_typeof(e->k) is distinct from 'boolean' then raise exception 'INVALID_EVENTS';end if;
 end loop;
 if c is null or jsonb_typeof(c)<>'object' then raise exception 'INVALID_EVENTS';end if;
 if (select count(*) from jsonb_object_keys(c))<>(select count(*) from public.group_event_tickets where group_id=gid and day=d) or exists(select 1 from public.group_event_tickets where group_id=gid and day=d and jsonb_typeof(c->user_id::text) is distinct from 'boolean') then raise exception 'INVALID_EVENTS';end if;
 perform public.rate('event_results',60);
 update public.group_event_days set events=e,cheese=c,revision=revision+1 where group_id=gid and day=d;
 insert into public.audit(actor,action,entity,before_value,after_value) values(auth.uid(),'event_results',gid::text||'/'||d,to_jsonb(old),jsonb_build_object('events',e,'cheese',c));
end $$;
create function public.group_event_state(gid uuid,d date) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare dy public.group_event_days;r public.group_event_rules;t public.group_event_tickets;owner boolean;cl boolean;begin
 perform public.require_user();if not public.is_member(gid) then raise exception 'GROUP_DENIED';end if;
 select g.owner=auth.uid() into owner from public.groups g where id=gid;cl:=public.closed(d);
 select * into dy from public.group_event_days where group_id=gid and day=d;
 select * into r from public.group_event_rules where group_id=gid;
 select * into t from public.group_event_tickets where group_id=gid and day=d and user_id=auth.uid();
 return jsonb_build_object('day',d,'closed',cl,'today',public.today(),'odds',coalesce(dy.odds,r.odds,public.event_default_odds()),'frozen',dy.group_id is not null,
 'next_odds',coalesce(r.odds,public.event_default_odds()),'rules_revision',coalesce(r.revision,-1),'ticket',case when t.user_id is null then null else to_jsonb(t) end,
 'events',case when cl then dy.events else null end,'cheese',case when cl then (dy.cheese->>auth.uid()::text)::boolean else null end,
 'score',case when cl and t.user_id is not null then public.event_score(t.picks,dy.odds,dy.events,(dy.cheese->>auth.uid()::text)::boolean) else null end,
 'result_revision',coalesce(dy.revision,-1),'players',case when owner and cl then coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'nickname',pr.nickname,'cheese',(dy.cheese->>pr.id::text)::boolean)) from public.group_event_tickets gt join public.profiles pr on pr.id=gt.user_id where gt.group_id=gid and gt.day=d),'[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function public.event_default_odds(),public.valid_event_odds(jsonb),public.event_score(jsonb,jsonb,jsonb,boolean),public.set_event_odds(uuid,jsonb,int),public.submit_event_ticket(uuid,date,jsonb,int),public.save_event_results(uuid,date,jsonb,jsonb,int),public.group_event_state(uuid,date) from public,anon,authenticated;
grant execute on function public.set_event_odds(uuid,jsonb,int),public.submit_event_ticket(uuid,date,jsonb,int),public.save_event_results(uuid,date,jsonb,jsonb,int),public.group_event_state(uuid,date) to authenticated;
