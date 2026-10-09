import {createClient} from '@supabase/supabase-js';
import {sanitizePhoto,MAX_INPUT} from './sanitize.mjs';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins=(Deno.env.get('ALLOWED_ORIGINS')||'http://127.0.0.1:5173').split(',');
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'',cors={'Access-Control-Allow-Origin':origins.includes(origin)?origin:'null','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors,status:204});
 if(req.method!=='POST'||!origins.includes(origin))return reply({error:'FORBIDDEN'},403);
 const authorization=req.headers.get('Authorization')||'';
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data,error}=await userClient.auth.getUser();if(error||!data.user)return reply({error:'AUTH_REQUIRED'},401);
 try{
  const {error:attemptError}=await userClient.rpc('photo_attempt');if(attemptError)throw attemptError;
  // Bound bytes while reading; Content-Length alone is not trusted.
  const chunks:Uint8Array[]=[],reader=req.body?.getReader();let size=0;if(!reader)throw new Error('PHOTO_INVALID');
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_INPUT+16384){await reader.cancel();throw new Error('PHOTO_INVALID');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('Content-Type')||''}}).formData();
  const file=form.get('file'),request_id=form.get('request_id');if(!(file instanceof File)||!['image/jpeg','image/png'].includes(file.type)||typeof request_id!=='string'||! /^[0-9a-f-]{36}$/i.test(request_id))throw new Error('PHOTO_INVALID');
  if(file.size>MAX_INPUT)throw new Error('PHOTO_INVALID');
  // Reserve before expensive decoding: rate limit and prediction lock are atomic.
  const {data:ticket,error:reserveError}=await userClient.rpc('reserve_photo',{request_id});if(reserveError)throw reserveError;
  const clean=sanitizePhoto(new Uint8Array(await file.arrayBuffer()));
  const service=createClient(url,key,{auth:{persistSession:false}});
  const {error:uploadError}=await service.storage.from('menu-photos').upload(ticket.path,clean,{contentType:'image/jpeg',upsert:false,cacheControl:'60'});
  if(uploadError&&uploadError.message!=='The resource already exists')throw new Error('UPLOAD_FAILED');
  const {error:finalError}=await service.rpc('finalize_photo',{cid:ticket.id});if(finalError)throw new Error('UPLOAD_FAILED');return reply({id:ticket.id});
 }catch(e){const message=e instanceof Error?e.message:'UPLOAD_FAILED';const safe=['PHOTO_INVALID','PREDICT_FIRST','RATE_LIMIT','DAY_VOID'].find(x=>message.includes(x))||'UPLOAD_FAILED';return reply({error:safe},400);}
});
