// Read-only calls to current validators. No engine, source mutation or DB writes.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {validateRegistration,validateTechnicalRegistration,validateWorkerRequiredMatch} from '../../server/worker-registration.js';
import {validateCompanyRegistration} from '../../server/company-registration.js';
import {documentFixture} from '../../tests/helpers/company-fixture.js';
import {OCCUPATIONS} from '../../ui/03-2/occupations.js';
import {REQUIRED_MATCH_POLICY} from '../../ui/03-2/required-match.js';
const rows=[];
const worker=()=>({roles:['자가기사','데모기사'],abilities:[{id:'a',mode:'ability',major:'토공·기초',middle:'굴착',kind:'excavator',form:'타이어식 (W)',size:'06W',years:'3',optionSelections:['브레이커']}],ownedEquipment:[],preferences:{...documentFixture().lines[0].conditions,conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}});
const probe=(id,input,fn)=>{let status='accepted',value,error;try{value=fn(input);}catch(e){status='rejected';error={status:e.status,message:e.message};}rows.push({id,status,...(error?{error}:{})});return {status,value};};
for(const [key,v] of [['kind','invalid-kind'],['major','wrong-parent'],['middle','wrong-middle'],['form','invalid-form'],['size','invalid-size'],['optionSelections',['invalid-option']],['optionSelections',['브레이커','브레이커']],['months','11'],['months','invalid-months']]){const d=worker();d.abilities[0][key]=v;probe('worker-'+key+'-'+JSON.stringify(v),d,validateRegistration);}
for(const [key,v] of [['kind','invalid-kind'],['major','wrong-parent'],['middle','wrong-middle'],['form','invalid-form'],['size','invalid-size'],['optionSelections',['invalid-option']],['optionSelections',['브레이커','브레이커']]]){const d=documentFixture();d.lines[0][key]=v;probe('company-'+key+'-'+JSON.stringify(v),d,validateCompanyRegistration);}
for(const key of ['pay','region','hours','schedule','workAbility']){const d={workerType:'technical_worker',occupationCatalogVersion:OCCUPATIONS.version,occupationIds:[OCCUPATIONS.items[0].id],requiredMatch:[key]};const r=probe('technical-shape-'+key,d,validateTechnicalRegistration);probe('technical-source-'+key,{technicalRegistration:r.value,requiredMatch:[key]},validateWorkerRequiredMatch);}
const tech={workerType:'technical_worker',occupationCatalogVersion:OCCUPATIONS.version,occupationIds:[OCCUPATIONS.items[0].id],preferences:worker().preferences,experienceMonths:120};const t=validateTechnicalRegistration(tech);rows.push({id:'technical-extra-preferences-experience',status:'accepted-but-omitted',returnedKeys:Object.keys(t)});
for(const key of ['difficulty','paymentTerms','paymentMethod','taxTerms','otherTerms','experience']){const d=documentFixture();d.lines[0].requiredMatch=[key];if(key==='difficulty')d.lines[0].difficulty='관로 작업';if(key==='otherTerms')d.lines[0].otherTerms='주휴 조건 협의';probe('company-required-'+key,d,validateCompanyRegistration);}
for(const [id,change] of [['zero-groups',d=>d.lines=[]],['duplicate-line-id',d=>d.lines.push(structuredClone(d.lines[0]))],['two-independent-groups',d=>{const l=structuredClone(d.lines[0]);l.id='second';l.headcount=3;d.lines.push(l);}]]){const d=documentFixture();change(d);probe(id,d,validateCompanyRegistration);}
for(const [id,change] of [['empty-abilities',d=>d.abilities=[]],['blank-experience',d=>d.abilities[0].years=''],['legacy-region-name',d=>{delete d.preferences.regionCodes;delete d.preferences.regionCodeSystem;delete d.preferences.legacyRegions;d.preferences.regions=['서울'];}],['worker-no-catalog-version',()=>{}],['duplicate-record-id',d=>d.abilities.push(structuredClone(d.abilities[0]))]]){const d=worker();change(d);probe(id,d,validateRegistration);}
const noKeys=documentFixture();delete noKeys.lines[0].requiredMatch;probe('company-required-omission',noKeys,validateCompanyRegistration);
rows.push({id:'policy-only',status:'declared',policy:REQUIRED_MATCH_POLICY});
assert.equal(rows.find(x=>x.id==='worker-kind-"invalid-kind"').status,'accepted');assert.equal(rows.find(x=>x.id==='company-kind-"invalid-kind"').status,'rejected');
writeFileSync(new URL('./contract-probes.json',import.meta.url),JSON.stringify(rows,null,2));for(const r of rows)console.log(r.id+': '+r.status);console.log('Observed '+rows.length+' current-contract cases; accepted invalid data are audit findings, not successful validation.');
