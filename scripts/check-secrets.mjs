import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const failures=[];
for(const file of files){
 if(!/\.(?:js|mjs|ts|json|ya?ml|md|html|css|toml|sql|txt|example)$/.test(file))continue;
 let source;try{source=readFileSync(file,'utf8');}catch{continue;}
 const privateKey=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source);
 const token=/\b(?:sb_secret_[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/.test(source);
 let privilegedJwt=false;
 for(const match of source.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
  try{if(JSON.parse(Buffer.from(match[1],'base64url').toString()).role==='service_role')privilegedJwt=true;}catch{/* Not a JWT. */}
 }
 if(privateKey||token||privilegedJwt)failures.push(file);
}
if(failures.length){console.error('Possible private credentials detected in: '+failures.join(', '));process.exitCode=1;}
else console.log('Tracked/source files: no recognized private key, GitHub token or privileged Supabase credential found.');
