import {createClient} from '@supabase/supabase-js';
import {romeDate,isClosed,score,validWeights,groupWeights} from './domain.js';
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
 if(name==='leaderboard'){const sums=Object.entries(demo.predictions).filter(([day])=>day.slice(0,7)===mo.slice(0,7)&&demo.menus[day]&&(demo.closed||isClosed(new Date(),day))).reduce((n,[day,v])=>n+score(v.choices,demo.menus[day],args.gid?groupWeights:undefined).total,0);return demo.user?[{id:demo.user.id,nickname:demo.user.nickname,points:sums,place:1}]:[];}
 if(name==='revealed_predictions')return closed&&p?[{nickname:demo.user.nickname,choices:p.choices}]:[];
 if(!demo.user)fail('AUTH_REQUIRED');
 if(name==='submit_prediction'){if(closed)fail('CLOSED');if(!validate(args.c,true))fail('INVALID_CHOICES');if(p?.locked)fail('LOCKED');if(p?.revision===1)fail('EDIT_USED');if((p?.revision??-1)!==args.expected_revision)fail('REVISION_CONFLICT');demo.predictions[d]={choices:args.c,revision:p?1:0,locked:false,day:d,user_id:demo.user.id};}
 if(name==='contribute'){if(!p)fail('PREDICT_FIRST');if(!validate(args.m,false))fail('INCOMPLETE_MENU');p.locked=true;demo.menus[d]??=args.m;demo.contributions.push({id:crypto.randomUUID(),day:d,author:demo.user.nickname,menu:args.m,created_at:new Date().toISOString()});}
 if(name==='set_nickname'){demo.user.nickname=args.n;}
 if(name==='create_group'){const id=crypto.randomUUID();demo.groups.push({id,name:args.n,private:args.priv,owner:demo.user.id,member:true,invite:crypto.randomUUID(),members:[{id:demo.user.id,nickname:demo.user.nickname}],rules:[{month:d.slice(0,7)+'-01',weights:groupWeights}]});persist();return id;}
 if(name==='manage_group'){const g=demo.groups.find(g=>g.id===args.gid);if(args.w&&!validWeights(args.w))fail('INVALID_WEIGHTS');if(args.n)g.name=args.n;if(args.rotate)g.invite=crypto.randomUUID();if(args.w)g.rules=[{month:d.slice(0,7)+'-01',weights:args.w}];}
 if(name==='join_group')fail('GROUP_DENIED');persist();return null;
}
export async function photoUpload(file,requestId){if(!client)throw new Error('Le foto reali richiedono Supabase / Real photos require Supabase');const {data,error}=await client.functions.invoke('upload-photo',{body:await (async()=>{const f=new FormData();f.set('file',file);f.set('request_id',requestId);return f;})()});if(error)throw error;return data;}
export async function photoUrl(path){const {data,error}=await client.storage.from('menu-photos').createSignedUrl(path,60);if(error)throw error;return data.signedUrl;}
