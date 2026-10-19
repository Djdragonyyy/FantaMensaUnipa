import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
test('All migrations: legacy evidence stays private across authenticated and anonymous accounts',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('test.aal',true),'aal1'))$$;grant usage on schema auth to anon,authenticated;grant execute on all functions in schema auth to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select on storage.objects to authenticated;`);
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into auth.users values('${a}'),('${b}');insert into public.days(day,status,menu) values('2026-01-01','resolved','{"private":"legacy-menu"}');insert into public.contributions(user_id,day,photo,photo_state) values('${a}','2026-01-01','private-a.jpg','ready'),('${b}','2026-01-01','private-b.jpg','ready');insert into storage.objects(bucket_id,name) values('menu-photos','private-a.jpg'),('menu-photos','private-b.jpg');`);
 const as=async(uid,aal='aal1',role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false),set_config('test.aal',$2,false)",[uid,aal]);await db.exec('set role '+role);};
 const snapshot=async()=>{const {rows}=await db.query("select public.snapshot('2026-01-01') s");return rows[0].s;};
 await as(a);assert.equal((await snapshot()).contributions.length,1);assert.equal((await snapshot()).contributions[0].photo,'private-a.jpg');assert.equal((await snapshot()).menu,null);
 assert.deepEqual((await db.query('select name from storage.objects')).rows,[{name:'private-a.jpg'}]);
 await assert.rejects(db.query("select public.snapshot_internal('2026-01-01')"),/permission denied/);
 await as(b);assert.deepEqual((await db.query('select name from storage.objects')).rows,[{name:'private-b.jpg'}]);
 await as('','aal1','anon');assert.deepEqual((await snapshot()).contributions,[]);assert.equal((await snapshot()).profile,null);assert.equal((await snapshot()).menu,null);
 await db.exec('reset role');await db.query('insert into public.admins(user_id) values($1)',[a]);await as(a,'aal1');assert.equal((await snapshot()).contributions.length,1);
 await as(a,'aal2');assert.equal((await snapshot()).contributions.length,2);assert.equal((await snapshot()).menu.private,'legacy-menu');assert.equal((await db.query('select * from storage.objects')).rows.length,2);
 }finally{await db.close();}
});
test('Frontend makes no Google Fonts requests and public access defaults to closed',()=>{
 assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(readFileSync('src/style.css','utf8')+readFileSync('public/_headers','utf8')));
 assert.match(readFileSync('.env.example','utf8'),/VITE_PUBLIC_ACCESS_ENABLED=false/);
 assert.match(readFileSync('src/main.js','utf8'),/configured&&!publicAccessEnabled/);
 assert.match(readFileSync('public/privacy.html','utf8'),/Alberto Fiocco/);
});
