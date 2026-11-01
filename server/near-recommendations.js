import {compareRegistration} from './auto-matching.js';
import {rankRecommendations,RECOMMENDATION_POLICY} from './recommendation-ranking.js';
const DAY=86400000;
const day=d=>Date.parse(d)/DAY;
const date=n=>new Date(n*DAY).toISOString().slice(0,10);
function intervals(p){
 const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const a=p.availability||{mode:'dates',dates:p.availableDates};
 if(a.mode==='always')return null;
 if(a.mode==='range'){if(!valid(a.start)||!valid(a.end)||a.start>a.end)throw Error('Invalid range');return [[day(a.start),day(a.end)]];}
 if(a.mode!=='dates'||!Array.isArray(a.dates)||!a.dates.length||!a.dates.every(valid))throw Error('Invalid dates');
 const days=[...new Set(a.dates.map(day))].sort((a,b)=>a-b),out=[];
 for(const d of days){const last=out.at(-1);if(last&&last[1]+1===d)last[1]=d;else out.push([d,d]);}
 return out;
}
function coverage(p,q){
 const requested=intervals(q);if(!requested?.length)return null;
 const available=intervals(p),covered=[],missing=[];
 for(const [start,end] of requested){
  let cursor=start;
  for(const [a,b] of available||[[start,end]]){
   const lo=Math.max(start,a),hi=Math.min(end,b);if(lo>hi)continue;
   if(cursor<lo)missing.push([cursor,lo-1]);covered.push([lo,hi]);cursor=hi+1;
  }
  if(cursor<=end)missing.push([cursor,end]);
 }
 const count=r=>r.reduce((n,[a,b])=>n+b-a+1,0),format=r=>r.map(([a,b])=>({start:date(a),end:date(b)}));
 const requestedDays=count(requested),coveredDays=count(covered);
 return {requestedDays,coveredDays,uncoveredDays:requestedDays-coveredDays,coverageRatio:coveredDays/requestedDays,requestedPeriods:format(requested),coveredPeriods:format(covered),uncoveredPeriods:format(missing)};
}
/** Recommendation only. Never changes or reinterprets the exact-match result. */
export function recommendRegistration(worker,company,lineId){
 const exactMatch=compareRegistration(worker,company,lineId),{checks,required=[]}=exactMatch;
 // Company-selected requirements remain hard gates, including pay and schedule.
 const gates=[...new Set(['requiredSelection','resourceMode','workAbility','experience',...(checks.equipmentSpec?['equipmentSpec']:[]),...required.filter(k=>!['pay','schedule'].includes(k)),...(company?.lines?.find(l=>l.id===lineId)?.requiredMatch||[])])];
 const blockedBy=gates.filter(k=>checks[k]?.status!=='pass');
 // Invalid registrations must never reach date arithmetic. Unknown pay/schedule
 // cannot be relaxed: conversion, unspecified company dates, and missing data fail closed.
 for(const key of ['registration','pay','schedule'])if(checks[key]?.status==='unknown')blockedBy.push(key);
 if(blockedBy.length)return {eligible:false,blockedBy,exactMatch};
 const q=company.lines.find(l=>l.id===lineId).conditions,p=worker.preferences;
 if(!p||p.payUnit!==q.payUnit||!Number.isSafeInteger(p.minimumPayWon)||p.minimumPayWon<=0||p.minimumPayWon>100000000)return {eligible:false,blockedBy:['pay'],exactMatch};
 let schedule;
 try{schedule=coverage(p,q);}catch{return {eligible:false,blockedBy:['schedule'],exactMatch};}
 if(!schedule?.coveredDays)return {eligible:false,blockedBy:['schedule'],exactMatch};
 const differenceWon=p.minimumPayWon-q.minimumPayWon;
 const price={payUnit:q.payUnit,companyOfferWon:q.minimumPayWon,workerRequestedWon:p.minimumPayWon,differenceWon,absoluteDifferenceWon:Math.abs(differenceWon),shortfallWon:Math.max(0,differenceWon)};
 const differences=Object.entries(checks).filter(([,v])=>v.status!=='pass').map(([key,value])=>({key,...value}));
 return {eligible:true,tier:exactMatch.matched&&differences.length===0?'full':'near',exactMatch,price,schedule,differences};
}
export function recommendWorkers(company,workers){
 return (company.lines||[]).flatMap(line=>rankRecommendations(workers.map(w=>({lineId:line.id,workerAccountId:String(w.accountId),workerVersion:w.version,...recommendRegistration(w.document,company,line.id)})).filter(r=>r.eligible)));
}
export {RECOMMENDATION_POLICY};
