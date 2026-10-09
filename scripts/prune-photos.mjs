// Run on a trusted machine or scheduled CI. Never include these env vars in VITE_*.
import {createClient} from '@supabase/supabase-js';
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data,error}=await client.rpc('expired_photos');if(error)throw new Error('Could not list expired photos');
for(const item of data){const {error:removeError}=await client.storage.from('menu-photos').remove([item.path]);if(removeError)throw new Error('Storage removal failed');const {error:markError}=await client.rpc('expire_photo',{cid:item.id});if(markError)throw new Error('Expiry marking failed');}
console.log(`Expired ${data.length} photos (up to 100 per batch).`);
