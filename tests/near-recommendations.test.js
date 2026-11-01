import test from 'node:test';
import assert from 'node:assert/strict';
import {documentFixture} from './helpers/company-fixture.js';
import {recommendRegistration,recommendWorkers} from '../server/near-recommendations.js';
import {autoMatchingRequest} from '../server/auto-matching.js';
function fixture(){
 const company=documentFixture();Object.assign(company.lines[0],{form:'미니',size:'017',minExperienceMonths:0,requiredMatch:[]});
 const worker={roles:['데모기사'],abilities:[{id:'a',mode:'ability',kind:'excavator',form:'미니',size:'017',years:'3',optionSelections:[...company.lines[0].optionSelections]}],ownedEquipment:[],requiredMatch:['region','hours','pay'],preferences:{...structuredClone(company.lines[0].conditions),conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}};
 return {company,worker};
}
const run=f=>{for(const p of [f.worker?.preferences,f.company.lines[0].conditions])if(p?.availability)p.availableDates=p.availability.mode==='dates'?p.availability.dates:[];return recommendRegistration(f.worker,f.company,'line-1');};
test('full candidate is read only; exact match retains its original meaning',()=>{
 const f=fixture(),before=structuredClone(f),r=run(f);assert.equal(r.eligible,true);assert.equal(r.tier,'full');assert.equal(r.exactMatch.matched,true);assert.equal(r.schedule.coveredDays,29);assert.deepEqual(f,before);
});
test('daily price shortfall is recommended with both amounts and signed difference',()=>{
 const f=fixture();f.worker.preferences.minimumPayWon=220000;const r=run(f);
 assert.equal(r.eligible,true);assert.equal(r.tier,'near');assert.equal(r.exactMatch.matched,false);
 assert.deepEqual(r.price,{payUnit:'day',companyOfferWon:200000,workerRequestedWon:220000,differenceWon:20000,absoluteDifferenceWon:20000,shortfallWon:20000});
 f.worker.preferences.minimumPayWon=180000;assert.equal(run(f).price.differenceWon,-20000);assert.equal(run(f).tier,'full');
});
test('partial inclusive dates expose covered and missing periods, without changing exact match',()=>{
 const f=fixture();f.worker.preferences.availability={mode:'range',start:'2026-11-05',end:'2026-11-17'};const r=run(f);
 assert.equal(r.eligible,true);assert.equal(r.exactMatch.matched,false);assert.equal(r.schedule.coveredDays,13);assert.equal(r.schedule.uncoveredDays,16);assert.equal(r.schedule.coverageRatio,13/29);
 assert.deepEqual(r.schedule.coveredPeriods,[{start:'2026-11-05',end:'2026-11-17'}]);assert.deepEqual(r.schedule.uncoveredPeriods,[{start:'2026-11-02',end:'2026-11-04'},{start:'2026-11-18',end:'2026-11-30'}]);
});
test('dates/range/always and legacy dates compute exact inclusive intersection',()=>{
 for(const wm of ['dates','range','always','legacy'])for(const cm of ['dates','range','legacy']){
  const f=fixture(),p=f.worker.preferences,q=f.company.lines[0].conditions;
  p.availability=wm==='always'?{mode:wm}:wm==='range'?{mode:wm,start:'2026-11-03',end:'2026-11-04'}:{mode:'dates',dates:['2026-11-04','2026-11-03']};
  q.availability=cm==='range'?{mode:cm,start:'2026-11-02',end:'2026-11-04'}:{mode:'dates',dates:['2026-11-04','2026-11-02','2026-11-03']};
  if(wm==='legacy'){delete p.availability;p.availableDates=['2026-11-03','2026-11-04'];}
  if(cm==='legacy'){delete q.availability;q.availableDates=['2026-11-02','2026-11-03','2026-11-04'];}
  const r=run(f);assert.equal(r.eligible,true,`${wm}/${cm}`);assert.equal(r.schedule.coveredDays,wm==='always'?3:2);
 }
});
test('sparse dates preserve holes and leap day; one overlapping boundary day counts',()=>{
 const f=fixture();f.company.lines[0].conditions.availability={mode:'range',start:'2028-02-28',end:'2028-03-02'};f.worker.preferences.availability={mode:'dates',dates:['2028-02-29','2028-03-02']};
 let r=run(f);assert.equal(r.schedule.coveredDays,2);assert.equal(r.schedule.requestedDays,4);assert.equal(r.schedule.uncoveredPeriods.length,2);
 f.worker.preferences.availability={mode:'range',start:'2028-03-02',end:'2028-03-05'};r=run(f);assert.equal(r.schedule.coveredDays,1);
});
test('disjoint, unspecified and invalid schedules fail closed',()=>{
 for(const a of [{mode:'range',start:'2026-12-01',end:'2026-12-02'},{mode:'range',start:'2026-02-30',end:'2026-11-30'},{mode:'dates',dates:[]}]){
  const f=fixture();f.worker.preferences.availability=a;assert.equal(run(f).eligible,false);
 }
 const f=fixture();f.company.lines[0].conditions.availability={mode:'always'};assert.equal(run(f).eligible,false);
});
test('specification mismatch/missing excludes even with relaxed selections and higher pay',()=>{
 for(const size of ['020','',null,undefined,'17','017 ','직접 입력']){
  const f=fixture();f.worker.requiredMatch=[];f.company.lines[0].requiredMatch=[];f.worker.abilities[0].size=size;f.company.lines[0].conditions.minimumPayWon=900000;assert.equal(run(f).eligible,false,String(size));
 }
});
test('existing required gates, options, experience and unsupported units stay mandatory',()=>{
 for(const mutate of [f=>f.worker.abilities[0].optionSelections=[],f=>f.company.lines[0].minExperienceMonths=100,f=>{f.worker.preferences.regionCodes=['26'];f.worker.preferences.regions=['부산광역시'];},f=>f.worker.preferences.startTime='21:00',f=>f.company.lines[0].requiredMatch.push('paymentTerms'),f=>f.worker.preferences.payUnit='hour',f=>delete f.worker.requiredMatch,f=>f.company.lines[0].resourceMode='equipment_with_operator']){
  const f=fixture();mutate(f);assert.equal(run(f).eligible,false);
 }
 for(const w of [null,{}, {roles:[]}])assert.equal(recommendRegistration(w,fixture().company,'line-1').eligible,false);
});
test('ranking prioritizes full duration over exact pay, then coverage and price',()=>{
 const f=fixture(),worker=(id,pay,end)=>{const document=structuredClone(f.worker);document.preferences.minimumPayWon=pay;document.preferences.availability.end=end;return {accountId:id,version:1,document};};
 const workers=[worker('9',200000,'2026-11-30'),worker('20',220000,'2026-11-30'),worker('3',200000,'2026-11-17'),worker('4',230000,'2026-11-16')];
 const r=recommendWorkers(f.company,workers);assert.deepEqual(r.map(x=>x.workerAccountId),['9','20','3','4']);assert.deepEqual(r.map(x=>x.priorityGroup),['priority:0','priority:1','priority:2','priority:3']);assert.deepEqual(r.map(x=>x.position),[1,2,3,4]);assert.deepEqual(recommendWorkers(f.company,[...workers].reverse()),r);
});
test('numeric account ID ties are deterministic beyond safe integer, separately per line',()=>{
 const f=fixture(),workers=['9007199254740993','10','2','9007199254740992'].map(accountId=>({accountId,version:1,document:f.worker}));
 f.company.lines.push({...structuredClone(f.company.lines[0]),id:'line-2'});
 const r=recommendWorkers(f.company,workers);assert.deepEqual(r.slice(0,4).map(x=>x.workerAccountId),['2','10','9007199254740992','9007199254740993']);assert.equal(r[4].position,1);
});
test('recommendation endpoint authorizes membership, reads only, excludes rejected workers and private data',async()=>{
 const f=fixture(),bad=structuredClone(f.worker);bad.abilities[0].size='020';const calls=[];
 const pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[{company:f.company,version:2,workers:[{accountId:'1',version:3,document:f.worker},{accountId:'2',version:1,document:bad}]}]};}};
 const request={pool,req:{method:'GET'},path:'/api/companies/8/recommendations',user:{id:'9'}};
 const r=await autoMatchingRequest(request);assert.equal(r.status,200);assert.equal(r.data.temporaryPolicy,false);assert.equal(r.data.readOnly,true);assert.equal(r.data.results.length,1);assert.equal(r.data.results[0].workerVersion,3);assert.deepEqual(calls[0].args,['8','9']);assert.match(calls[0].sql,/EXISTS.*organization_memberships/s);assert.doesNotMatch(calls[0].sql,/\b(INSERT|UPDATE|DELETE)\b/);assert.doesNotMatch(JSON.stringify(r),/contactName|phone|preferences/);
 assert.equal((await autoMatchingRequest({...request,pool:{query:async()=>({rows:[]})}})).status,404);
 assert.equal((await autoMatchingRequest({...request,req:{method:'POST'}})).status,405);assert.equal(calls.length,1);
});
test('optional preferences remain optional, but cannot enter the all-conditions-full tier',()=>{
 const f=fixture();f.worker.requiredMatch=[];f.worker.preferences.startTime='21:00';const r=run(f);assert.equal(r.eligible,true);assert.equal(r.tier,'near');assert.equal(r.exactMatch.matched,true);assert.ok(r.differences.some(x=>x.key==='hours'));
});
test('technical worker recommendations retain all-occupations and experience gates',()=>{
 const f=fixture(),line=f.company.lines[0];for(const k of ['major','middle','kind','form','size','optionSelections'])delete line[k];
 Object.assign(line,{resourceMode:'technical_worker',occupationCatalogVersion:'draft-2026-11-01-1',occupationRequirement:'all_per_person',occupationIds:['NODE-JO-0001','NODE-JO-0011']});
 f.worker.technicalRegistration={workerType:'technical_worker',occupationCatalogVersion:line.occupationCatalogVersion,occupationIds:[...line.occupationIds]};
 f.worker.preferences.minimumPayWon++;assert.equal(run(f).eligible,true);
 line.minExperienceMonths=1;assert.equal(run(f).eligible,false);line.minExperienceMonths=0;f.worker.technicalRegistration.occupationIds.pop();assert.equal(run(f).eligible,false);
});
test('simultaneous price and schedule gaps have no fixed cutoff; all missing days are explicit',()=>{
 const f=fixture();f.worker.preferences.minimumPayWon=100000000;f.worker.preferences.availability={mode:'range',start:'2026-11-30',end:'2026-11-30'};
 const r=run(f);assert.equal(r.eligible,true);assert.equal(r.schedule.coveredDays,1);assert.equal(r.schedule.uncoveredDays,28);assert.equal(r.price.shortfallWon,99800000);assert.deepEqual(r.schedule.uncoveredPeriods,[{start:'2026-11-02',end:'2026-11-29'}]);
});
test('unknown pay units and missing schedules exclude even when neither side selected them',()=>{
 for(const mutate of [f=>f.worker.preferences.payUnit='hour',f=>{delete f.worker.preferences.availability;f.worker.preferences.availableDates=[];},f=>f.company.lines[0].conditions.availability={mode:'always'}]){
  const f=fixture();f.worker.requiredMatch=[];f.company.lines[0].requiredMatch=[];mutate(f);assert.equal(run(f).eligible,false);
 }
});

test('technical-only malformed preferences fail closed without throwing',()=>{
 const f=fixture(),line=f.company.lines[0];for(const k of ['major','middle','kind','form','size','optionSelections'])delete line[k];
 Object.assign(line,{resourceMode:'technical_worker',occupationCatalogVersion:'draft-2026-11-01-1',occupationRequirement:'all_per_person',occupationIds:['NODE-JO-0001']});
 f.worker.roles=[];f.worker.technicalRegistration={workerType:'technical_worker',occupationCatalogVersion:line.occupationCatalogVersion,occupationIds:[...line.occupationIds]};
 assert.equal(run(f).eligible,true);
 f.worker.preferences.minimumPayWon='200000';assert.equal(run(f).eligible,false);f.worker.preferences.minimumPayWon=200000;
 f.worker.preferences.availability={mode:'range',start:'garbage',end:'2026-11-30'};assert.equal(run(f).eligible,false);
});

test('company explicit pay and schedule requirements are never relaxed',()=>{
 for(const [key,mutate] of [['pay',f=>f.worker.preferences.minimumPayWon=220000],['schedule',f=>f.worker.preferences.availability.end='2026-11-17']]){
  const f=fixture();mutate(f);assert.equal(run(f).eligible,true);
  f.company.lines[0].requiredMatch=[key];const r=run(f);assert.equal(r.eligible,false);assert.ok(r.blockedBy.includes(key));
 }
});
test('equal coverage uses absolute gap in both directions, then numeric ID; longer coverage wins any price gap',()=>{
 const f=fixture();const workers=[['1',200000,'2026-11-16'],['20',210000,'2026-11-17'],['3',190000,'2026-11-17'],['4',220000,'2026-11-17'],['99',100000000,'2026-11-18']].map(([accountId,pay,end])=>{
  const document=structuredClone(f.worker);document.preferences.minimumPayWon=pay;document.preferences.availability.end=end;return {accountId,version:1,document};
 });
 const r=recommendWorkers(f.company,workers);assert.deepEqual(r.map(x=>x.workerAccountId),['99','3','20','4','1']);assert.deepEqual(r.map(x=>x.priorityGroup),['priority:0','priority:1','priority:1','priority:2','priority:3']);assert.deepEqual(recommendWorkers(f.company,workers.reverse()),r);
});
test('coverage priority ignores tier and uses actual sparse requested days across month/year boundaries',()=>{
 const f=fixture();f.company.lines[0].conditions.availability={mode:'dates',dates:['2026-12-31','2027-01-01','2027-01-03']};
 f.worker.preferences.availability={mode:'range',start:'2026-12-31',end:'2027-01-03'};
 const r=run(f);assert.equal(r.schedule.requestedDays,3);assert.equal(r.schedule.coveredDays,3);assert.equal(r.schedule.coverageRatio,1);
});

test('company region, hours and unsupported required terms remain mandatory without worker selections',()=>{
 for(const [key,mutate] of [['region',f=>{f.worker.preferences.regionCodes=['26'];f.worker.preferences.regions=['부산광역시'];}],['hours',f=>f.worker.preferences.startTime='21:00'],['paymentTerms',()=>{}]]){
  const f=fixture();f.worker.requiredMatch=[];f.company.lines[0].requiredMatch=[key];mutate(f);
  const r=run(f);assert.equal(r.eligible,false);assert.ok(r.blockedBy.includes(key));
 }
});
