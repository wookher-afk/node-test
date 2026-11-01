import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRegistration,autoMatchingRequest} from '../server/auto-matching.js';
import {documentFixture} from './helpers/company-fixture.js';
function fixture(){
 const company=documentFixture();company.lines[0].requiredMatch=['workAbility','pay','schedule'];
 const worker={roles:['데모기사'],abilities:[{...company.lines[0],id:'a',mode:'ability',years:'3'}],ownedEquipment:[],requiredMatch:['region','hours'],preferences:{...structuredClone(company.lines[0].conditions),conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}};
 return {worker,company};
}
const run=({worker,company})=>compareRegistration(worker,company,'line-1');
test('one virtual worker and recruitment match without mutation; legal verification is excluded from MVP',()=>{
 const f=fixture(),before=structuredClone(f),r=run(f);
 assert.equal(r.conditionStatus,'pass');assert.equal(r.status,'matched');assert.equal(r.matched,true);
 for(const key of ['pay','region','hours','schedule','workAbility','experience'])assert.equal(r.checks[key].status,'pass',key);
 assert.equal(Object.hasOwn(r.checks,'legalQualifications'),false);assert.deepEqual(f,before);
});
test('each side mandatory conditions and same-equipment experience block failures',()=>{
 for(const mutate of [f=>f.worker.preferences.minimumPayWon++,f=>f.worker.preferences.regionCodes=['26'],f=>f.worker.preferences.startTime='21:00',f=>f.worker.preferences.availability.end='2026-11-29',f=>f.worker.abilities[0].size='08W',f=>f.worker.abilities[0].years='2',f=>f.worker.abilities[0].optionSelections=[]]){
  const f=fixture();mutate(f);if(f.worker.preferences.regionCodes[0]==='26')f.worker.preferences.regions=['부산광역시'];
  const r=run(f);assert.equal(r.status,'not_matched');assert.equal(r.matched,false);
 }
});
test('unselected preference mismatch is shown but does not become a mandatory gate',()=>{
 const f=fixture();f.worker.requiredMatch=[];f.worker.preferences.startTime='21:00';
 assert.equal(run(f).checks.hours.status,'fail');assert.equal(run(f).conditionStatus,'pass');
});
test('disjoint work dates block matching regardless of schedule selection on either side',()=>{
 for(const workerSelected of [false,true])for(const companySelected of [false,true]){
  const f=fixture();f.worker.requiredMatch=workerSelected?['schedule']:[];f.company.lines[0].requiredMatch=companySelected?['schedule']:[];
  f.worker.preferences.availability={mode:'range',start:'2026-12-01',end:'2026-12-02'};
  const r=run(f);assert.equal(r.checks.schedule.status,'fail');assert.equal(r.status,'not_matched');assert.equal(r.matched,false);
 }
});
test('overlapping dates retain the existing requirement to cover every company work date',()=>{
 for(const mode of ['range','dates']){
  const f=fixture();f.worker.requiredMatch=[];f.company.lines[0].requiredMatch=[];
  f.worker.preferences.availability={mode:'range',start:'2026-11-01',end:'2026-11-03'};
  const q=f.company.lines[0].conditions;
  q.availability=mode==='range'?{mode,start:'2026-11-02',end:'2026-11-03'}:{mode,dates:['2026-11-02','2026-11-03']};
  q.availableDates=mode==='dates'?[...q.availability.dates]:[];
  assert.equal(run(f).matched,true);
  f.worker.preferences.availability.end='2026-11-02';
  assert.equal(run(f).checks.schedule.status,'fail');assert.equal(run(f).matched,false);
 }
});
test('unspecified, missing or invalid dates cannot confirm a match even when unselected',()=>{
 for(const mutate of [
  f=>{f.company.lines[0].conditions.availability={mode:'always'};},
  f=>{f.company.lines[0].conditions.availability={mode:'always'};f.worker.preferences.availability={mode:'always'};},
  f=>{delete f.worker.preferences.availability;f.worker.preferences.availableDates=[];},
  f=>{delete f.company.lines[0].conditions.availability;f.company.lines[0].conditions.availableDates=[];},
  f=>{f.worker.preferences.availability={mode:'range',start:'2026-02-30',end:'2026-11-30'};}
 ]){
  const f=fixture();f.worker.requiredMatch=[];f.company.lines[0].requiredMatch=[];mutate(f);
  const r=run(f);assert.equal(r.status,'indeterminate');assert.equal(r.conditionStatus,'unknown');assert.equal(r.matched,false);
 }
});
test('hours mismatch remains optional unless selected by either side',()=>{
 for(const side of ['neither','worker','company']){
  const f=fixture();f.worker.requiredMatch=side==='worker'?['hours']:[];f.company.lines[0].requiredMatch=side==='company'?['hours']:[];
  f.worker.preferences.startTime='21:00';const r=run(f);
  assert.equal(r.checks.schedule.status,'pass');assert.equal(r.checks.hours.status,'fail');assert.equal(r.matched,side==='neither');
 }
});
test('unsupported terms, unit conversion, missing selections, resource mode fail closed',()=>{
 for(const mutate of [f=>f.company.lines[0].requiredMatch=['paymentTerms'],f=>f.worker.preferences.payUnit='hour',f=>delete f.worker.requiredMatch,f=>f.company.lines[0].resourceMode='equipment_with_operator',f=>f.worker.preferences.legacyRegions=['옛 지역']]){
  const f=fixture();mutate(f);assert.equal(run(f).matched,false);assert.equal(run(f).conditionStatus,'unknown');
 }
});
test('missing/malformed documents cannot pass',()=>{
 for(const worker of [null,{}, {roles:[]}])assert.equal(compareRegistration(worker,documentFixture(),'line-1').conditionStatus,'unknown');
});
test('technical group requires every occupation per person; experience remains unknown',()=>{
 const f=fixture(),line=f.company.lines[0];
 for(const key of ['major','middle','kind','form','size','optionSelections'])delete line[key];
 Object.assign(line,{resourceMode:'technical_worker',occupationCatalogVersion:'draft-2026-11-01-1',occupationRequirement:'all_per_person',occupationIds:['NODE-JO-0001','NODE-JO-0011'],minExperienceMonths:0});
 f.worker.technicalRegistration={workerType:'technical_worker',occupationCatalogVersion:line.occupationCatalogVersion,occupationIds:[...line.occupationIds]};
 assert.equal(run(f).conditionStatus,'pass');assert.equal(run(f).matched,true);
 line.minExperienceMonths=1;assert.equal(run(f).checks.experience.status,'unknown');
 f.worker.technicalRegistration.occupationIds.pop();assert.equal(run(f).status,'not_matched');assert.equal(run(f).matched,false);
});
test('endpoint binds member and company, only reads, omits registration/private fields',async()=>{
 const f=fixture(),calls=[];
 const pool={async query(sql,args){calls.push({sql,args});return {rows:[{company:f.company,version:2,workers:[{accountId:'7',version:3,document:f.worker}]}]};}};
 const r=await autoMatchingRequest({pool,req:{method:'GET'},path:'/api/companies/8/auto-matches',user:{id:'9'}});
 assert.equal(r.status,200);assert.deepEqual(calls[0].args,['8','9']);assert.match(calls[0].sql,/EXISTS.*SELECT 1 FROM organization_memberships/s);assert.doesNotMatch(calls[0].sql,/\b(INSERT|UPDATE|DELETE)\b/);
 assert.equal(r.data.results.length,1);assert.equal(r.data.results[0].workerAccountId,'7');assert.equal(r.data.results[0].matched,true);assert.equal(JSON.stringify(r).includes('preferences'),false);
 assert.equal((await autoMatchingRequest({pool:{query:async()=>({rows:[]})},req:{method:'GET'},path:'/api/companies/8/auto-matches',user:{id:'10'}})).status,404);
 assert.equal((await autoMatchingRequest({pool,req:{method:'POST'},path:'/api/companies/8/auto-matches',user:{id:'9'}})).status,405);assert.equal(calls.length,1);
});

function miniFixture(){
 const f=fixture();
 Object.assign(f.company.lines[0],{form:'미니',size:'017',minExperienceMonths:0});
 Object.assign(f.worker.abilities[0],{form:'미니',size:'017'});
 f.worker.requiredMatch=[];f.company.lines[0].requiredMatch=[];
 return f;
}
test('equipment specification is mandatory: mini 017 and 020 never substitute in either direction',()=>{
 for(const [wanted,available] of [['017','017'],['020','020'],['017','020'],['020','017']]){
  const f=miniFixture();f.company.lines[0].size=wanted;f.worker.abilities[0].size=available;
  const r=run(f);assert.equal(r.checks.equipmentSpec.status,wanted===available?'pass':'fail');
  assert.equal(r.matched,wanted===available);assert.equal(r.status,wanted===available?'matched':'not_matched');
 }
});
test('missing, empty and noncanonical specifications never allow matching',()=>{
 for(const side of ['worker','company'])for(const value of [undefined,null,'','17','017 ','미니 17','직접 입력']){
  const f=miniFixture(),entry=side==='worker'?f.worker.abilities[0]:f.company.lines[0];
  if(value===undefined)delete entry.size;else entry.size=value;
  if(value==='직접 입력')entry.custom='017';
  assert.equal(run(f).matched,false,`${side}: ${value}`);
 }
});
test('only the exact equipment record supplies options and experience',()=>{
 const f=miniFixture(),a=f.worker.abilities[0];
 f.company.lines[0].minExperienceMonths=36;
 f.worker.abilities.push({...a,id:'other',size:'020',years:'10'});
 f.worker.preferences.equipmentPriority.push('other');
 a.years='1';assert.equal(run(f).matched,false);
 a.years='3';a.optionSelections=[];assert.equal(run(f).matched,false);
 a.optionSelections=[...f.company.lines[0].optionSelections];assert.equal(run(f).matched,true);
 a.size='';assert.equal(run(f).matched,false);
});
test('auto-match endpoint excludes mismatched mini specifications from eligible results',async()=>{
 const f=miniFixture();f.worker.abilities[0].size='020';
 const pool={query:async()=>({rows:[{company:f.company,version:1,workers:[{accountId:'7',version:1,document:f.worker}]}]})};
 const r=await autoMatchingRequest({pool,req:{method:'GET'},path:'/api/companies/8/auto-matches',user:{id:'9'}});
 assert.equal(r.data.results[0].status,'not_matched');
 assert.equal(r.data.results.filter(x=>x.matched).length,0);
 assert.equal(r.data.results[0].checks.equipmentSpec.status,'fail');
});
