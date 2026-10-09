export const generalWeights={first:20,main:15,side:10,juice:10,bonus:15};
export const groupWeights={first:15,main:15,side:15,juice:10,bonus:15};
export function romeDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function isClosed(now=new Date(),day=romeDate(now)) {const date=romeDate(now);if(date!==day)return date>day;const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(now);return parts>='13:30:00';}
export function score(choices,menu,w=generalWeights){if(!menu)return null;let total=0,perfect=true,result={};for(const c of ['first','main','side','juice']){const hits=new Set(choices[c].filter(x=>menu[c].includes(x))).size;result[c]=hits*w[c];total+=result[c];perfect&&=hits===choices[c].length;}result.bonus=perfect?w.bonus:0;result.total=total+result.bonus;return result;}
export function validWeights(w){return ['first','main','side','juice','bonus'].every(k=>Number.isInteger(w[k])&&w[k]>=0)&&w.first+3*w.main+w.side+w.juice+w.bonus<=100;}
export function compact(n,lang){return n<1000?String(n):new Intl.NumberFormat(lang==='it'?'it-IT':'en-GB',{maximumFractionDigits:2}).format(n/1000)+'K';}
