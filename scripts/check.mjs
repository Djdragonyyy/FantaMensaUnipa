import {readdirSync,statSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const walk=p=>readdirSync(p).flatMap(x=>statSync(`${p}/${x}`).isDirectory()?walk(`${p}/${x}`):[`${p}/${x}`]);
for(const f of [...walk('src'),...walk('scripts'),...walk('tests')].filter(x=>/\.(js|mjs)$/.test(x)))execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
const {messages}=await import('../src/i18n.js');
if(JSON.stringify(Object.keys(messages.it).sort())!==JSON.stringify(Object.keys(messages.en).sort()))throw new Error('Translation keys differ');
for(const f of [...walk('src'),...walk('public')])if(/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(readFileSync(f,'utf8')))throw new Error('Privileged credential reference in frontend');
console.log('Syntax, translation parity, frontend secret separation: OK');
