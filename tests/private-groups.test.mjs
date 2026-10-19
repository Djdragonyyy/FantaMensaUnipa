import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
const menu={first:['Lasagne al pistacchio'],main:['Pollo arrosto','Tofu speziato'],side:['Broccoli'],juice:['Arancia']};
test('Private groups migration: owner menus, isolation and admin-only WIP ranking',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('test.aal',true),'aal1'))$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 await db.exec(readFileSync('supabase/migrations/001_game.sql','utf8'));
 await db.exec(`insert into auth.users values('${a}'),('${b}'),('${c}');insert into public.groups(owner,name,private) values('${a}','Legacy public group',false);`);
 await db.exec(readFileSync('supabase/migrations/003_private_groups.sql','utf8'));
 const as=async(uid=a,aal='aal1')=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false),set_config('test.aal',$2,false)",[uid,aal]);await db.exec('set role authenticated');};
 const rpc=async(name,args=[])=>{const {rows}=await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args);return rows[0].result;};
 let gid,other,invite;
 await t.test('Existing public groups become private; new public groups and ID-based joins rejected',async()=>{
  assert.equal((await db.query('select private from public.groups')).rows[0].private,true);
  await as();await assert.rejects(rpc('create_group',['Public',false,randomUUID()]),/PRIVATE_GROUPS_ONLY/);
  const id=randomUUID();gid=await rpc('create_group',['Friends',true,id]);assert.equal(await rpc('create_group',['Friends',true,id]),gid);
  other=await rpc('create_group',['Other group',true,randomUUID()]);invite=(await rpc('list_groups')).find(g=>g.id===gid).invite;
  await as(b);assert.deepEqual(await rpc('list_groups'),[]);await assert.rejects(rpc('join_group',[gid,null]),/GROUP_DENIED/);await rpc('join_group',[null,invite]);
 });
 await t.test('Only creator writes; custom dishes scoped to one group and editable after cutoff',async()=>{
  await assert.rejects(rpc('save_group_menu',[gid,'2026-01-01',JSON.stringify(menu),-1]),/GROUP_DENIED/);
  await as();const first=await rpc('save_group_menu',[gid,'2026-01-01',JSON.stringify(menu),-1]);assert.equal(first.revision,0);
  assert.equal((await rpc('group_menu',[gid,'2026-01-01'])).dishes.length,5);
  assert.deepEqual((await rpc('group_menu',[other,'2026-01-01'])).dishes,[]);
  const updated=await rpc('save_group_menu',[gid,'2026-01-01',JSON.stringify({...menu,side:['Carote']}),0]);assert.equal(updated.revision,1);
  await assert.rejects(rpc('save_group_menu',[gid,'2026-01-01',JSON.stringify(menu),0]),/REVISION_CONFLICT/);
  await as(b);assert.equal((await rpc('group_menu',[gid,'2026-01-01'])).entry.menu.side[0],'Carote');
 });
 await t.test('Nonmembers and removed members cannot read menus; direct table access denied',async()=>{
  await as(c);await assert.rejects(rpc('group_menu',[gid,'2026-01-01']),/GROUP_DENIED/);
  for(const table of ['group_dishes','group_menus'])await assert.rejects(db.query(`select * from public.${table}`),/permission denied/);
  await as();await rpc('manage_group',[gid,null,false,b,null]);await as(b);await assert.rejects(rpc('group_menu',[gid,'2026-01-01']),/GROUP_DENIED/);
 });
 await t.test('Reject malformed, duplicate and incomplete menus without partial writes',async()=>{
  await as();for(const invalid of [{...menu,first:[]},{...menu,side:['Carote',' carote ']},{...menu,first:[42]},{...menu,juice:['x']},{...menu,main:['x'.repeat(101)]},{...menu,side:['a\nb']}])await assert.rejects(rpc('save_group_menu',[gid,'2026-01-02',JSON.stringify(invalid),-1]),/INCOMPLETE_MENU|INVALID_CHOICES/);
  assert.equal((await rpc('group_menu',[gid,'2026-01-02'])).entry,null);
 });
 await t.test('Ranking requires admin plus MFA, including bypass attempts on old internals',async()=>{
  await as();await assert.rejects(rpc('leaderboard',['2026-01-01',null]),/ADMIN_MFA_REQUIRED/);
  await assert.rejects(rpc('revealed_predictions',['2026-01-01',null]),/ADMIN_MFA_REQUIRED/);
  for(const name of ['leaderboard_internal','revealed_predictions_internal'])await assert.rejects(rpc(name,['2026-01-01',null]),/permission denied/);
  await db.exec('reset role');await db.query('insert into public.admins(user_id) values($1)',[a]);await as();await assert.rejects(rpc('leaderboard',['2026-01-01',null]),/ADMIN_MFA_REQUIRED/);
  await as(a,'aal2');assert.ok(Array.isArray(await rpc('leaderboard',['2026-01-01',null])));
  assert.equal((await rpc('admin_data')).audit.filter(x=>x.action==='group_menu').length,2);
 });
 }finally{await db.close();}
});
