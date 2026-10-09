export const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function matchMenu(text,catalog){
 const choices={first:[],main:[],side:[],juice:[]},unmatched=[];
 let category=null;
 const headings={first:/^(primi|primo|first courses?)\b/,main:/^(secondi|secondo|main courses?)\b/,side:/^(contorni|contorno|sides?)\b/,juice:/^(succhi|succo|bevande|juice|drinks?)\b/};
 for(const raw of String(text).slice(0,12000).split(/\r?\n/).filter(x=>x.trim())){
  const line=normalize(raw);
  const heading=Object.entries(headings).find(([,pattern])=>pattern.test(line));
  if(heading)category=heading[0];
  if(/\b(non disponibile|non disponibili|esaurito|esauriti|unavailable|sold out)\b/.test(line)){unmatched.push(raw);continue;}
  const found=catalog.filter(d=>d.active&&(!category||d.category===category)).filter(d=>[d.it,d.en,...(d.aliases||[])].some(alias=>{const a=normalize(alias);return a.length>=4&&(` ${line} `).includes(` ${a} `);}));
  // Short fruit names only match standalone entries or an explicit juice heading.
  const accepted=found.filter(d=>d.category!=='juice'||category==='juice'||[d.it,d.en,...(d.aliases||[])].some(a=>normalize(a)===line)||/\b(succo|juice)\b/.test(line));
  for(const d of accepted)if(!choices[d.category].includes(d.id))choices[d.category].push(d.id);
  if(!accepted.length&&!/^(menu|mensa|unipa|primi|primo|secondi|secondo|contorni|contorno|succhi|succo|bevande|first courses?|main courses?|sides?|juice|drinks?)( del giorno)?$/.test(line)&&!/^\d[\d\s]*$/.test(line))unmatched.push(raw);
 }
 return {choices,unmatched};
}
