import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {defaultEventOdds,eventPoints,validEventPicks,validEventOdds} from '../src/events.js';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
const picks={plates:true,permesso:true,sgomberare:true,trays:true,cheese:true};
const events={plates:true,permesso:false,sgomberare:true,trays:false};
test('Fantasy odds: integer points, personal cheese toggle, invalid inputs and pending results',()=>{
 assert.equal(eventPoints(picks,defaultEventOdds,events,true).total,73);
 assert.equal(eventPoints(picks,defaultEventOdds,events,false).total,55);
 assert.equal(eventPoints(picks,defaultEventOdds,null,false),null);
 assert.ok(validEventPicks(picks));assert.ok(!validEventPicks({...picks,cheese:'true'}));assert.ok(!validEventPicks(Object.fromEntries(Object.keys(picks).map(k=>[k,false]))));
 assert.ok(validEventOdds(defaultEventOdds));assert.ok(!validEventOdds({...defaultEventOdds,cheese:125}));assert.ok(!validEventOdds({...defaultEventOdds,trays:1001}));
});
test('Canteen events SQL: frozen odds, cutoff, privacy and owner settlement',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{"aal":"aal1"}'::jsonb$$;grant usage on schema auth to anon,authenticated;grant execute on all functions in schema auth to anon,authenticated;`);
 for(const file of ['001_game.sql','003_private_groups.sql','004_canteen_events.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`create or replace function public.game_now() returns timestamptz language sql stable as $$select current_setting('test.now')::timestamptz$$;insert into auth.users values('${a}'),('${b}'),('${c}');`);
 const clock=async now=>db.query("select set_config('test.now',$1,false)",[now]);
 const as=async uid=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[uid]);await db.exec('set role authenticated');};
 const rpc=async(name,args=[])=>{const {rows}=await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args);return rows[0].result;};
 const state=()=>rpc('group_event_state',[gid,'2026-10-19']);
 let gid,other;
 await clock('2026-10-19T10:00:00Z');await as(a);gid=await rpc('create_group',['Events',true,randomUUID()]);other=await rpc('create_group',['Other',true,randomUUID()]);const token=(await rpc('list_groups')).find(g=>g.id===gid).invite;await as(b);await rpc('join_group',[null,token]);
 await t.test('Only members read and play, only owner changes valid odds',async()=>{
  await as(c);await assert.rejects(state(),/GROUP_DENIED/);await assert.rejects(rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),-1]),/GROUP_DENIED/);
  await as(b);await assert.rejects(rpc('set_event_odds',[gid,JSON.stringify(defaultEventOdds),-1]),/GROUP_DENIED/);
  await as(a);await assert.rejects(rpc('set_event_odds',[gid,JSON.stringify({...defaultEventOdds,plates:125}),-1]),/INVALID_ODDS/);
  await rpc('set_event_odds',[gid,JSON.stringify(defaultEventOdds),-1]);assert.equal((await state()).rules_revision,0);
  await assert.rejects(rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify({...picks,extra:true}),-1]),/INVALID_EVENTS/);
  await assert.rejects(rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify({...picks,cheese:'true'}),-1]),/INVALID_EVENTS/);
 });
 await t.test('First entry freezes odds; personal choices private and one edit protected by revision',async()=>{
  await rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),-1]);
  await rpc('set_event_odds',[gid,JSON.stringify({...defaultEventOdds,plates:1000}),0]);const owner=await state();assert.equal(owner.odds.plates,250);assert.equal(owner.next_odds.plates,1000);assert.deepEqual(owner.players,[]);
  assert.equal((await rpc('group_event_state',[other,'2026-10-19'])).frozen,false);
  await as(b);assert.equal((await state()).ticket,null);await rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),-1]);
  await rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),0]);assert.equal((await state()).ticket.revision,1);await assert.rejects(rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),0]),/REVISION_CONFLICT/);await assert.rejects(rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),1]),/EDIT_USED/);
  await as(a);await assert.rejects(rpc('save_event_results',[gid,'2026-10-19',JSON.stringify(events),JSON.stringify({[a]:true,[b]:false}),-1]),/RESULTS_AFTER_CLOSE/);
 });
 await t.test('13:30 server cutoff, future/past entry rejection and private result confirmation',async()=>{
  await clock('2026-10-19T11:29:59Z');assert.equal((await state()).closed,false);await clock('2026-10-19T11:30:00Z');assert.equal((await state()).closed,true);
  await assert.rejects(rpc('submit_event_ticket',[gid,'2026-10-19',JSON.stringify(picks),0]),/CLOSED/);
  for(const date of ['2026-10-18','2026-10-20'])await assert.rejects(rpc('submit_event_ticket',[gid,date,JSON.stringify(picks),-1]),/CLOSED/);
  await as(b);assert.deepEqual((await state()).players,[]);await assert.rejects(rpc('save_event_results',[gid,'2026-10-19',JSON.stringify(events),JSON.stringify({[a]:true,[b]:false}),-1]),/GROUP_DENIED/);
  await as(a);assert.equal((await state()).players.length,2);
  await assert.rejects(rpc('save_event_results',[gid,'2026-10-19',JSON.stringify(events),JSON.stringify({[a]:true}),-1]),/INVALID_EVENTS/);
 });
 await t.test('Personal cheese scored separately; correction recalculates without accumulating points',async()=>{
  await rpc('save_event_results',[gid,'2026-10-19',JSON.stringify(events),JSON.stringify({[a]:true,[b]:false}),-1]);
  assert.equal((await state()).score.total,73);await as(b);assert.equal((await state()).score.total,55);assert.equal((await state()).cheese,false);
  await as(a);await rpc('save_event_results',[gid,'2026-10-19',JSON.stringify({...events,plates:false}),JSON.stringify({[a]:false,[b]:true}),0]);assert.equal((await state()).score.total,30);
  await assert.rejects(rpc('save_event_results',[gid,'2026-10-19',JSON.stringify(events),JSON.stringify({[a]:true,[b]:false}),0]),/REVISION_CONFLICT/);
  await as(b);assert.equal((await state()).score.total,48);
 });
 await t.test('No direct reads or writes, helpers inaccessible, removed member loses access',async()=>{
  for(const table of ['group_event_rules','group_event_days','group_event_tickets'])await assert.rejects(db.query(`select * from public.${table}`),/permission denied/);
  await assert.rejects(rpc('event_score',[JSON.stringify(picks),JSON.stringify(defaultEventOdds),JSON.stringify(events),true]),/permission denied/);
  await as(a);await rpc('manage_group',[gid,null,false,b,null]);await as(b);await assert.rejects(state(),/GROUP_DENIED/);
 });
 }finally{await db.close();}
});
