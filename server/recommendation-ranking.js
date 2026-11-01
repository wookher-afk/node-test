// Confirmed policy: coverage first, absolute pay difference second, ID last.
export const RECOMMENDATION_POLICY='schedule-first-price-gap-v1';
const idCompare=(a,b)=>a.workerAccountId.length-b.workerAccountId.length||(a.workerAccountId<b.workerAccountId?-1:a.workerAccountId>b.workerAccountId?1:0);
// Called per recruitment line, so requestedDays is shared across candidates.
const comparePriority=(a,b)=>b.schedule.coveredDays-a.schedule.coveredDays||a.price.absoluteDifferenceWon-b.price.absoluteDifferenceWon;
export function rankRecommendations(candidates){
 const sorted=[...candidates].sort((a,b)=>comparePriority(a,b)||idCompare(a,b));
 let group=-1;
 return sorted.map((candidate,index)=>{
  if(index===0||comparePriority(sorted[index-1],candidate)!==0)group++;
  return {...candidate,priorityGroup:`priority:${group}`,position:index+1};
 });
}
