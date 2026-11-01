import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRegistration,workerRegistrationRequest,MATCHING_DEFAULTS} from '../server/worker-registration.js';
const fixture=()=>({roles:['데모기사'],abilities:[{id:'a',mode:'ability',kind:'excavator',form:'타이어식 (W)',size:'03W',years:'3',specs:['original']}],ownedEquipment:[{id:'o',mode:'owned',kind:'excavator',form:'타이어식 (W)',size:'06W',years:'0'}],preferences:{regions:['서울'],minimumPayWon:250000,payUnit:'day',startTime:'08:00',endTime:'17:00',availableDates:['2026-11-02'],conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}});
test('separates ability/ownership, preserves equipment detail, single engine default',()=>{const d=validateRegistration(fixture());assert.equal(d.abilities[0].size,'03W');assert.equal(d.ownedEquipment[0].size,'06W');assert.deepEqual(d.abilities[0].specs,['original']);assert.equal(MATCHING_DEFAULTS.payDifferenceWon,50000);});
test('rejects malformed pay, dates, priorities, ownership and duplicate identities',()=>{
 for(const change of [d=>d.preferences.minimumPayWon='250000',d=>d.preferences.availableDates=['2026-02-30'],d=>d.preferences.conditionPriority=['pay','pay','hours','equipment'],d=>d.preferences.equipmentPriority=['o'],d=>d.abilities[0].mode='owned',d=>d.ownedEquipment[0].id='a',d=>d.roles=[],d=>d.preferences.startTime='25:00']){const d=fixture();change(d);assert.throws(()=>validateRegistration(d),e=>e.status===400);}
});
test('allows existing empty size with actual equipment specs and overnight hours',()=>{const d=fixture();d.abilities[0].size='';d.preferences.startTime='22:00';d.preferences.endTime='06:00';assert.ok(validateRegistration(d));});
test('GET scopes lookup to authenticated account, not request payload',async()=>{let params;const result=await workerRegistrationRequest({pool:{query:async(q,p)=>{params=p;return {rows:[]};}},req:{method:'GET'},path:'/api/me/worker-registration',user:{id:42}});assert.deepEqual(params,[42]);assert.deepEqual(result.data,{document:null,version:0});});
test('PUT transaction uses session identity and rolls back stale writes',async()=>{for(const stale of [false,true]){const calls=[];const c={query:async(q,p)=>{calls.push({q,p});return {rows:q.includes('RETURNING document')&&!stale?[{document:fixture(),version:1}]:[]};},release(){}};const result=await workerRegistrationRequest({pool:{connect:async()=>c},req:{method:'PUT'},path:'/api/me/worker-registration',body:async()=>({version:0,document:fixture(),account_id:999}),user:{id:42}});assert.equal(result.status,stale?409:200);assert.equal(calls[1].p[0],42);assert.equal(calls.at(-1).q,stale?'ROLLBACK':'COMMIT');}});
test('PUT database failure rolls back and releases',async()=>{let released=false;const calls=[];const c={query:async q=>{calls.push(q);if(q.includes('INSERT INTO worker_alpha'))throw Error('offline');return {rows:[]};},release(){released=true;}};await assert.rejects(workerRegistrationRequest({pool:{connect:async()=>c},req:{method:'PUT'},path:'/api/me/worker-registration',body:async()=>({version:0,document:fixture()}),user:{id:42}}),/offline/);assert.equal(calls.at(-1),'ROLLBACK');assert.ok(released);});

test('existing version update uses expected version and account identity',async()=>{let bound;const c={query:async(q,p)=>{if(q.startsWith('UPDATE worker_alpha')){bound=p;return {rows:[{document:fixture(),version:3}]};}return {rows:[]};},release(){}};const result=await workerRegistrationRequest({pool:{connect:async()=>c},req:{method:'PUT'},path:'/api/me/worker-registration',body:async()=>({version:2,document:fixture()}),user:{id:42}});assert.equal(result.data.version,3);assert.equal(bound[0],42);assert.equal(bound[2],2);});

test('allows optional empty equipment experience and still rejects invalid numbers',()=>{const d=fixture();d.abilities[0].years='';assert.equal(validateRegistration(d).abilities[0].years,'');for(const years of ['-1','abc','81']){d.abilities[0].years=years;assert.throws(()=>validateRegistration(d));}});

test('coded preferences and all schedule modes preserve minute precision',()=>{
 for(const availability of [{mode:'always'},{mode:'dates',dates:['2026-11-02']},{mode:'range',start:'2026-11-02',end:'2027-12-31'}]){
 const d=fixture();Object.assign(d.preferences,{regions:['서울특별시 종로구'],regionCodes:['11110'],regionCodeSystem:'kr-lawd-2026-10-01',legacyRegions:[],availability,availableDates:availability.dates||[],startTime:'08:15'});
 assert.deepEqual(validateRegistration(d).preferences,d.preferences);
 }
});
test('rejects unknown, inconsistent, duplicate and overlapping region codes or invalid schedules',()=>{
 const make=()=>{const d=fixture();Object.assign(d.preferences,{regions:['서울특별시'],regionCodes:['11'],regionCodeSystem:'kr-lawd-2026-10-01',legacyRegions:[],availability:{mode:'always'},availableDates:[]});return d;};
 for(const change of [p=>p.regionCodes=['99999'],p=>p.regions=['경기도'],p=>{p.regionCodes=['11','11110'];p.regions=['서울특별시','서울특별시 종로구'];},p=>p.regionCodes=['11','11'],p=>p.availability={mode:'range',start:'2026-02-30',end:'2026-03-01'},p=>p.availability={mode:'range',start:'2026-12-31',end:'2026-01-01'},p=>p.availability={mode:'dates',dates:[]},p=>p.availableDates=['2026-11-02']]){const d=make();change(d.preferences);assert.throws(()=>validateRegistration(d),e=>e.status===400);}
});

import {validateTechnicalRegistration} from '../server/worker-registration.js';
import {OCCUPATIONS} from '../ui/03-2/occupations.js';
test('technical profile reuses all 179 draft IDs and rejects malformed catalogs and selections',()=>{
 assert.deepEqual([OCCUPATIONS.majors.length,OCCUPATIONS.middles.length,OCCUPATIONS.items.length],[13,31,179]);assert.equal(OCCUPATIONS.status,'draft');
 const d={workerType:'technical_worker',occupationCatalogVersion:OCCUPATIONS.version,occupationIds:OCCUPATIONS.items.map(x=>x.id)};
 assert.deepEqual(validateTechnicalRegistration(d),d);
 for(const patch of [{workerType:'데모기사'},{occupationCatalogVersion:'final'},{occupationIds:[]},{occupationIds:['invented']},{occupationIds:[d.occupationIds[0],d.occupationIds[0]]},{occupationIds:'NODE-JO-0001'}])assert.throws(()=>validateTechnicalRegistration({...d,...patch}),e=>e.status===400);
});


test('rejects unknown equipment kind, parents, form, size and malformed options in both lists',()=>{
 const patches=[{kind:'invalid-kind'},{major:'invalid-major'},{middle:'invalid-middle'},{form:'invalid-form'},{size:'invalid-size'},{form:'직접 입력',formDetail:''},{size:'직접 입력',custom:''},{optionSelections:['invalid-option']},{optionSelections:['집게','집게']},{optionSelections:'집게'},{optionSelections:null}];
 for(const list of ['abilities','ownedEquipment'])for(const patch of patches){
  const d=fixture();Object.assign(d[list][0],patch);assert.throws(()=>validateRegistration(d),{status:400},JSON.stringify({list,patch}));
 }
});
test('preserves custom unverified descriptions, omitted options and optional empty size verbatim',()=>{
 const d=fixture();Object.assign(d.abilities[0],{form:'직접 입력',formDetail:'이전 사용자 형태',size:'직접 입력',custom:'현장 호칭 원문',optionSelections:['집게'],options:'기타 옵션 원문',alias:'별칭 원문'});
 assert.deepEqual(validateRegistration(d),d);
});
test('legacy classification survives unchanged but cannot be copied to a new ID or edited to another invalid value',()=>{
 const previous=fixture();Object.assign(previous.abilities[0],{form:'구형 형태',size:'구형 현장 호칭',optionSelections:['구형 옵션']});
 const d=structuredClone(previous);d.preferences.minimumPayWon=300000;
 assert.deepEqual(validateRegistration(d,previous),d);
 for(const patch of [{id:'new'},{form:'다른 잘못된 형태'},{size:'다른 잘못된 호칭'},{optionSelections:['새 잘못된 옵션']}]){
  const changed=structuredClone(d);Object.assign(changed.abilities[0],patch);assert.throws(()=>validateRegistration(changed,previous),{status:400});
 }
 const corrected=structuredClone(d);Object.assign(corrected.abilities[0],{form:'타이어식 (W)',size:'03W',optionSelections:[]});assert.deepEqual(validateRegistration(corrected,previous),corrected);
});
test('PUT rejects invalid equipment before persistence and rolls back without changing saved document',async()=>{
 for(const list of ['abilities','ownedEquipment'])for(const patch of [{kind:'invalid-kind'},{form:'invalid-form'},{size:'invalid-size'},{optionSelections:['집게','집게']}]){
  const previous=fixture(),before=structuredClone(previous),calls=[];
  const c={query:async(q)=>{calls.push(q);if(q.startsWith('SELECT document'))return {rows:[{document:previous}]};return {rows:[]};},release(){calls.push('release');}};
  const d=fixture();Object.assign(d[list][0],patch);
  await assert.rejects(workerRegistrationRequest({pool:{connect:async()=>c},req:{method:'PUT'},path:'/api/me/worker-registration',body:async()=>({document:d,version:1}),user:{id:42}}),{status:400});
  assert.deepEqual(previous,before);assert.ok(!calls.some(q=>q.startsWith('UPDATE')||q.startsWith('INSERT')));assert.deepEqual(calls.slice(-2),['ROLLBACK','release']);
 }
});
test('PUT validates against locked stored legacy records and preserves their original classification',async()=>{
 const previous=fixture();Object.assign(previous.abilities[0],{form:'휠',size:'이전 직접 호칭',optionSelections:['이전 옵션']});
 const document=structuredClone(previous);document.preferences.minimumPayWon=300000;let persisted;
 const c={query:async(q,p)=>{if(q.startsWith('SELECT document')){assert.match(q,/FOR UPDATE/);return {rows:[{document:previous}]};}if(q.startsWith('UPDATE worker_alpha')){persisted=JSON.parse(p[1]);return {rows:[{document:persisted,version:2}]};}return {rows:[]};},release(){}};
 const result=await workerRegistrationRequest({pool:{connect:async()=>c},req:{method:'PUT'},path:'/api/me/worker-registration',body:async()=>({document,version:1}),user:{id:42}});
 assert.equal(result.status,200);assert.deepEqual(persisted,document);
});
