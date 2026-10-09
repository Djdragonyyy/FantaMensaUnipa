insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('menu-photos','menu-photos',false,1048576,array['image/jpeg']) on conflict(id) do update set public=false,file_size_limit=1048576,allowed_mime_types=array['image/jpeg'];
create function public.can_read_photo(path text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.contributions c where c.photo=path and c.photo_state='ready' and public.closed(c.day))
$$;
revoke all on function public.can_read_photo(text) from public,anon;
grant execute on function public.can_read_photo(text) to authenticated;
create policy photo_read on storage.objects for select to authenticated using(bucket_id='menu-photos' and public.can_read_photo(name));
-- No client INSERT/UPDATE/DELETE policies: even a fake JPEG must go through Edge validation.
create function public.expired_photos() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',photo)),'[]') from (select id,photo from public.contributions where photo is not null and photo_state<>'expired' and (created_at<now()-interval '30 days' or (photo_state='pending' and created_at<now()-interval '1 day')) order by created_at limit 100) x
$$;
create function public.expire_photo(cid uuid) returns void language sql security definer set search_path=pg_catalog,public as $$ update public.contributions set photo_state='expired' where id=cid $$;
revoke all on function public.expired_photos(),public.expire_photo(uuid) from public,anon,authenticated;
grant execute on function public.expired_photos(),public.expire_photo(uuid) to service_role;
