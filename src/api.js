import {eventIds,defaultEventOdds,validEventPicks,validEventOdds,eventPoints} from './events.js';
import {createClient} from '@supabase/supabase-js';
import {romeDate,score,validWeights,groupWeights} from './domain.js';
export const configured=!!import.meta.env.VITE_SUPABASE_URL&&!import.meta.env.VITE_SUPABASE_URL.includes('YOUR-')&&!!import.meta.env.VITE_SUPABASE_ANON_KEY;
export const client=configured?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}}):null;
const sample=[['pasta-pomodoro','first','Pasta al pomodoro','Pasta with tomato sauce',['pasta al sugo']],['pasta-pesto','first','Pasta al pesto','Pasta with pesto',[]],['pasta-norma','first','Pasta alla Norma','Pasta alla Norma',[]],['riso-verdure','first','Riso con verdure','Rice with vegetables',[]],['pasta-legumi','first','Pasta e legumi','Pasta and pulses',[]],['pollo-arrosto','main','Pollo arrosto','Roast chicken',['pollo al forno']],['cotoletta','main','Cotoletta di pollo','Breaded chicken cutlet',[]],['pesce-forno','main','Pesce al forno','Baked fish',[]],['frittata','main','Frittata','Omelette',[]],['polpette','main','Polpette al sugo','Meatballs in tomato sauce',[]],['legumi','main','Legumi in umido','Stewed pulses',[]],['formaggio','main','Formaggio','Cheese',[]],['patate','side','Patate al forno','Roast potatoes',[]],['insalata','side','Insalata mista','Mixed salad',[]],['carote','side','Carote lesse','Boiled carrots',[]],['spinaci','side','Spinaci all’olio','Spinach with olive oil',[]],['zucchine','side','Zucchine saltate','Sautéed courgettes',[]],['pesca','juice','Pesca','Peach',[]],['pera','juice','Pera','Pear',[]]].map(([id,category,it,en,aliases])=>({id,category,it,en,aliases,active:true}));
let demo=JSON.parse(localStorage.getItem('fm-demo')||'{"user":null,"predictions":{},"menus":{},"groups":[],"contributions":[]}');
function persist(){localStorage.setItem('fm-demo',JSON.stringify(demo));}
export function demoLogin(){demo.user={id:'demo-player',nickname:'MensaLover'};persist();}
export function demoReset(){localStorage.removeItem('fm-demo');location.reload();}
export function demoClose(){demo.closed=true;persist();}
export async function session(){if(client){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?.user||null;}return demo.user;}
export async function catalog(){if(!client)return sample;const {data,error}=await client.from('dishes').select('*').order('it');if(error)throw error;return data;}
export async function rpc(name,args={}){
 if(client){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
 const d=romeDate(),p=demo.predictions[d],closed=!!demo.closed,mo=args.mo||d.slice(0,7)+'-01';
 const fail=x=>{throw new Error(x);};
 const validate=(c,pred)=>c&&['first','main','side','juice'].every(k=>Array.isArray(c[k])&&c[k].length>0&&new Set(c[k]).size===c[k].length&&(!pred||c[k].length===(k==='main'?3:1))&&c[k].every(id=>sample.some(x=>x.id===id&&x.category===k)));
 if(name==='snapshot'){const day=args.d||d,pr=demo.predictions[day],cl=day<d||closed,m=demo.menus[day];return {day,now:new Date().toISOString(),closed:cl,status:m?'resolved':'pending',prediction:pr||null,menu:cl?m:null,score:cl&&pr&&m?score(pr.choices,m):null,profile:demo.user,admin:false,months:[d.slice(0,7)+'-01'],contributions:demo.contributions.filter(x=>x.day===day),discrepancy:false};}
 if(name==='list_groups')return demo.groups;
 if(name==='leaderboard'||name==='revealed_predictions')fail('ADMIN_MFA_REQUIRED');
 if(!demo.user)fail('AUTH_REQUIRED');
 if(name==='submit_prediction'){if(closed)fail('CLOSED');if(!validate(args.c,true))fail('INVALID_CHOICES');if(p?.locked)fail('LOCKED');if(p?.revision===1)fail('EDIT_USED');if((p?.revision??-1)!==args.expected_revision)fail('REVISION_CONFLICT');demo.predictions[d]={choices:args.c,revision:p?1:0,locked:false,day:d,user_id:demo.user.id};}
 if(name==='contribute'){if(!p)fail('PREDICT_FIRST');if(!validate(args.m,false))fail('INCOMPLETE_MENU');p.locked=true;demo.menus[d]??=args.m;demo.contributions.push({id:crypto.randomUUID(),day:d,author:demo.user.nickname,menu:args.m,created_at:new Date().toISOString()});}
 if(name==='set_nickname'){demo.user.nickname=args.n;}
 if(name==='create_group'){if(!args.priv)fail('PRIVATE_GROUPS_ONLY');const id=crypto.randomUUID();demo.groups.push({id,name:args.n,private:true,owner:demo.user.id,member:true,invite:crypto.randomUUID(),members:[{id:demo.user.id,nickname:demo.user.nickname}],rules:[{month:d.slice(0,7)+'-01',weights:groupWeights}]});persist();return id;}
 if(['group_event_state','set_event_odds','submit_event_ticket','save_event_results'].includes(name)){
 const g=demo.groups.find(g=>g.id===args.gid&&g.members.some(m=>m.id===demo.user?.id));if(!g)fail('GROUP_DENIED');
 const owner=g.owner===demo.user.id;g.eventDays??={};const dy=g.eventDays[args.d],cl=closed||args.d<d;
 if(name==='group_event_state'){
 const ticket=dy?.tickets[demo.user.id]||null;
 return {day:args.d,today:d,closed:cl,odds:dy?.odds||g.eventOdds||defaultEventOdds,frozen:!!dy,next_odds:g.eventOdds||defaultEventOdds,rules_revision:g.eventRulesRevision??-1,ticket,events:cl?dy?.events||null:null,cheese:cl?(dy?.cheese?.[demo.user.id]??null):null,score:cl&&ticket?eventPoints(ticket.picks,dy.odds,dy.events,dy.cheese?.[demo.user.id]):null,result_revision:dy?.revision??-1,players:owner&&cl?Object.keys(dy?.tickets||{}).map(id=>({id,nickname:g.members.find(m=>m.id===id)?.nickname||'Player',cheese:dy?.cheese?.[id]??null})):[]};
 }
 if(name==='set_event_odds'){if(!owner)fail('GROUP_DENIED');if(!validEventOdds(args.o))fail('INVALID_ODDS');if((g.eventRulesRevision??-1)!==args.expected_revision)fail('REVISION_CONFLICT');g.eventOdds=args.o;g.eventRulesRevision=args.expected_revision+1;}
 if(name==='submit_event_ticket'){
 if(args.d!==d||cl)fail('CLOSED');if(!validEventPicks(args.p))fail('INVALID_EVENTS');const ticket=dy?.tickets[demo.user.id];if((ticket?.revision??-1)!==args.expected_revision)fail('REVISION_CONFLICT');if(ticket?.revision===1)fail('EDIT_USED');
 g.eventDays[args.d]??={odds:{...(g.eventOdds||defaultEventOdds)},tickets:{},revision:-1};g.eventDays[args.d].tickets[demo.user.id]={picks:args.p,revision:args.expected_revision+1};
 }
 if(name==='save_event_results'){
 if(!owner)fail('GROUP_DENIED');if(!cl)fail('RESULTS_AFTER_CLOSE');if(!dy)fail('NO_EVENT_TICKETS');if(dy.revision!==args.expected_revision)fail('REVISION_CONFLICT');
 if(!args.e||Object.keys(args.e).length!==4||!eventIds.filter(k=>k!=='cheese').every(k=>typeof args.e[k]==='boolean')||!args.c||Object.keys(args.c).length!==Object.keys(dy.tickets).length||!Object.keys(dy.tickets).every(id=>typeof args.c[id]==='boolean'))fail('INVALID_EVENTS');dy.events=args.e;dy.cheese=args.c;dy.revision++;
 }persist();return null;
 }
 if(name==='group_menu'||name==='save_group_menu'){

 const g=demo.groups.find(g=>g.id===args.gid&&g.members.some(m=>m.id===demo.user?.id));if(!g)fail('GROUP_DENIED');
 g.menus??={};g.dishes??=[];
 if(name==='group_menu')return {day:args.d,entry:g.menus[args.d]||null,dishes:g.dishes};
 if(g.owner!==demo.user.id)fail('GROUP_DENIED');
 if((g.menus[args.d]?.revision??-1)!==args.expected_revision)fail('REVISION_CONFLICT');
 if(!args.m||Object.keys(args.m).length!==4||!['first','main','side','juice'].every(c=>Array.isArray(args.m[c])&&args.m[c].length>0&&args.m[c].length<=60&&args.m[c].every(x=>typeof x==='string'&&x.trim().length>=2&&x.length<=100&&!/[\r\n]/.test(x))&&new Set(args.m[c].map(x=>x.trim().toLowerCase())).size===args.m[c].length))fail('INCOMPLETE_MENU');
 g.menus[args.d]={day:args.d,group_id:g.id,menu:args.m,revision:args.expected_revision+1,updated_at:new Date().toISOString()};
 for(const [category,labels] of Object.entries(args.m))for(const name of labels)if(!g.dishes.some(x=>x.category===category&&x.name===name))g.dishes.push({category,name});persist();return g.menus[args.d];
 }
 if(name==='manage_group'){
 const g=demo.groups.find(g=>g.id===args.gid);if(args.w&&!validWeights(args.w))fail('INVALID_WEIGHTS');if(args.n)g.name=args.n;if(args.rotate)g.invite=crypto.randomUUID();if(args.w)g.rules=[{month:d.slice(0,7)+'-01',weights:args.w}];}
 if(name==='join_group')fail('GROUP_DENIED');persist();return null;
}
export async function photoUpload(file,requestId){if(!client)throw new Error('Le foto reali richiedono Supabase / Real photos require Supabase');const {data,error}=await client.functions.invoke('upload-photo',{body:await (async()=>{const f=new FormData();f.set('file',file);f.set('request_id',requestId);return f;})()});if(error)throw error;return data;}
export async function photoUrl(path){const {data,error}=await client.storage.from('menu-photos').createSignedUrl(path,60);if(error)throw error;return data.signedUrl;}
