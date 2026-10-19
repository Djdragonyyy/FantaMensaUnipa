export const eventIds=['plates','permesso','sgomberare','trays','cheese'];
// Integer hundredths: no floating-point odds in stored rules.
export const defaultEventOdds={plates:250,permesso:150,sgomberare:300,trays:200,cheese:180};
export function validEventPicks(picks){return picks&&Object.keys(picks).length===5&&eventIds.every(k=>typeof picks[k]==='boolean')&&eventIds.some(k=>picks[k]);}
export function validEventOdds(odds){return odds&&Object.keys(odds).length===5&&eventIds.every(k=>Number.isInteger(odds[k])&&odds[k]>=100&&odds[k]<=1000&&odds[k]%10===0);}
export function eventPoints(picks,odds,results,cheese){
 if(!results||typeof cheese!=='boolean')return null;
 const detail=Object.fromEntries(eventIds.map(k=>[k,picks[k]&&(k==='cheese'?cheese:results[k])?odds[k]/10:0]));
 return {...detail,total:Object.values(detail).reduce((a,b)=>a+b,0)};
}
