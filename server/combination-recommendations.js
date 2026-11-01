import {recommendWorkers} from './near-recommendations.js';
const DAY=86400000;
const iso=n=>new Date(n*DAY).toISOString().slice(0,10);
export const COMBINATION_LIMITS=Object.freeze({days:366,workers:1000,lines:50,headcount:50,workUnits:2000000});
export const COMBINATION_POLICY=Object.freeze({version:'coverage-first-provisional-v1',temporaryTieBreaks:true,objective:'maximize-covered-worker-days',tieBreaks:['retain-current-workers','longest-remaining-contiguous-availability','existing-individual-rank'],confirmation:'업체와 배정된 각 작업자가 모두 수락해야 확정됩니다. 금액은 희망 조건이며 확정 거래가격이 아닙니다.',scope:'각 모집항목별 독립 대안입니다. 항목 간 동시 배정·예약을 보장하지 않습니다.'});
function requestedDays(conditions){
 const a=conditions?.availability||{mode:'dates',dates:conditions?.availableDates};
 const parse=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('invalid_schedule');return Date.parse(s)/DAY;};
 let days;
 if(a.mode==='range'){
  const start=parse(a.start),end=parse(a.end);
  if(end<start)throw Error('invalid_schedule');
  if(end-start+1>COMBINATION_LIMITS.days)throw Error('schedule_limit');
  days=Array.from({length:end-start+1},(_,i)=>start+i);
 }else if(a.mode==='dates'&&Array.isArray(a.dates)&&a.dates.length){
  if(a.dates.length>COMBINATION_LIMITS.days)throw Error('schedule_limit');
  days=[...new Set(a.dates.map(parse))].sort((x,y)=>x-y);
 }else throw Error('unspecified_schedule');
 return days;
}
function periods(days){const out=[];for(const d of days){const last=out.at(-1);if(last&&last.end===iso(d-1))last.end=iso(d);else out.push({start:iso(d),end:iso(d)});}return out;}
/** One deterministic coverage-maximal proposal per line; no reservation or acceptance writes.
 * With no cross-date capacity constraints, filling min(headcount, available unique people)
 * on each date attains the exact maximum worker-day coverage. Tie breaks are heuristics.
 */
export function recommendCombinations(company,workers){
 if(!Array.isArray(company?.lines)||!Array.isArray(workers))return {status:'invalid_input',results:[]};
 if(workers.length>COMBINATION_LIMITS.workers||company.lines.length>COMBINATION_LIMITS.lines)return {status:'input_limit',limits:COMBINATION_LIMITS,results:[]};
 // Conflicting versions of one identity are ambiguous: exclude all such rows.
 const counts=new Map();for(const w of workers)counts.set(String(w.accountId),(counts.get(String(w.accountId))||0)+1);
 const unique=workers.filter(w=>counts.get(String(w.accountId))===1&&/^[1-9]\d*$/.test(String(w.accountId)));
 let workUnits=0;
 const results=company.lines.map(line=>{
  const base={lineId:line.id,independentAlternative:true};let days;
  try{days=requestedDays(line.conditions);}catch(e){return {...base,status:e.message};}
  if(!Number.isSafeInteger(line.headcount)||line.headcount<1||line.headcount>COMBINATION_LIMITS.headcount)return {...base,status:'unsupported_headcount'};
  workUnits+=days.length*unique.length;
  if(workUnits>COMBINATION_LIMITS.workUnits)return {...base,status:'computation_limit'};
  const candidates=recommendWorkers({...company,lines:[line]},unique);
  const available=candidates.map(c=>new Set(days.filter(d=>c.schedule.coveredPeriods.some(p=>p.start<=iso(d)&&iso(d)<=p.end))));
  const runs=available.map(set=>{const lengths=new Map();for(let j=days.length-1;j>=0;j--){const d=days[j];if(set.has(d))lengths.set(d,1+(lengths.get(d+1)||0));}return lengths;});
  const allocations=candidates.map(()=>[]),daily=[];let previous=[];
  for(const d of days){
   const possible=candidates.map((_,i)=>i).filter(i=>available[i].has(d));
   const remaining=i=>runs[i].get(d);
   // Whole-period individuals retain priority, using the unchanged individual ordering.
   possible.sort((a,b)=>Number(available[b].size===days.length)-Number(available[a].size===days.length)||Number(previous.includes(b))-Number(previous.includes(a))||remaining(b)-remaining(a)||a-b);
   const selected=possible.slice(0,line.headcount);
   for(const i of selected)allocations[i].push(d);
   daily.push({date:iso(d),required:line.headcount,assigned:selected.length,missing:line.headcount-selected.length});previous=selected;
  }
  const assignments=candidates.flatMap((c,i)=>allocations[i].length?[{workerAccountId:c.workerAccountId,workerVersion:c.workerVersion,proposedPeriods:periods(allocations[i]),assignedDays:allocations[i].length,price:c.price}]:[]);
  const requiredWorkerDays=days.length*line.headcount,coveredWorkerDays=daily.reduce((n,d)=>n+d.assigned,0);
  return {...base,status:'proposed',requestedPeriods:periods(days),headcount:line.headcount,requestedDays:days.length,requiredWorkerDays,coveredWorkerDays,uncoveredWorkerDays:requiredWorkerDays-coveredWorkerDays,fullyStaffedDays:daily.filter(d=>!d.missing).length,complete:coveredWorkerDays===requiredWorkerDays,workerCount:assignments.length,assignments,gaps:daily.filter(d=>d.missing),dailyCoverage:daily,fullPeriodIndividualIds:candidates.filter(c=>c.schedule.uncoveredDays===0).map(c=>c.workerAccountId),optimalCoverage:true,secondaryOptimization:'heuristic-provisional',excludedDuplicateIds:[...counts].filter(([,n])=>n>1).map(([id])=>id)};
 });
 return {status:'ok',results};
}
