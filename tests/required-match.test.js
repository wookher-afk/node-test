import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRequiredMatch,WORKER_REQUIRED_KEYS,COMPANY_REQUIRED_KEYS,REQUIRED_MATCH_POLICY} from '../ui/03-2/required-match.js';
import {validateRegistration,validateTechnicalRegistration,validateWorkerRequiredMatch} from '../server/worker-registration.js';
import {validateCompanyRegistration} from '../server/company-registration.js';
import {documentFixture} from './helpers/company-fixture.js';
import {OCCUPATIONS} from '../ui/03-2/occupations.js';
const worker=()=>({roles:['데모기사','자가기사'],abilities:[{id:'a',mode:'ability',kind:'excavator',form:'타이어식 (W)',size:'06W',years:'3'}],ownedEquipment:[{id:'o',mode:'owned',kind:'excavator',form:'타이어식 (W)',size:'06W',years:'3'}],preferences:{...documentFixture().lines[0].conditions,conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}});
test('required conditions permit zero through three and reject malformed, unknown, duplicate, legal and fourth keys',()=>{
 for(let n=0;n<=3;n++)assert.deepEqual(validateRequiredMatch(WORKER_REQUIRED_KEYS.slice(0,n),WORKER_REQUIRED_KEYS),WORKER_REQUIRED_KEYS.slice(0,n));
 for(const v of [null,{},'pay',['pay','pay'],['unknown'],['legalLicense'],WORKER_REQUIRED_KEYS.slice(0,4),[1]])assert.throws(()=>validateRequiredMatch(v,COMPANY_REQUIRED_KEYS),{status:400});
});
test('worker preferences and separate ability/ownership round trip with required conditions without touching legacy payloads',()=>{
 const d=worker();assert.deepEqual(validateRegistration(d),d);d.requiredMatch=['workAbility','pay','region'];assert.deepEqual(validateRegistration(d),d);validateWorkerRequiredMatch(d);
});
test('each company recruitment group has independent 0-3 limits and common workAbility key',()=>{
 const d=documentFixture();d.lines[0].requiredMatch=['workAbility','pay','region'];d.lines.push({...structuredClone(d.lines[0]),id:'b',requiredMatch:['hours','schedule','experience']});assert.deepEqual(validateCompanyRegistration(structuredClone(d)),d);
 d.lines[1].requiredMatch.push('pay');assert.throws(()=>validateCompanyRegistration(d),{status:400});
});
test('optional free-text required conditions cannot refer to blank conditions',()=>{
 for(const k of ['difficulty','otherTerms']){const d=documentFixture();d.lines[0].requiredMatch=[k];assert.throws(()=>validateCompanyRegistration(d),{status:400});d.lines[0][k]='조건';assert.equal(validateCompanyRegistration(d).lines[0][k],'조건');}
});
test('179 occupations still count as one workAbility condition with all-per-person semantics',()=>{
 const d={workerType:'technical_worker',occupationCatalogVersion:OCCUPATIONS.version,occupationIds:OCCUPATIONS.items.map(x=>x.id),requiredMatch:['workAbility']};assert.deepEqual(validateTechnicalRegistration(d),d);validateWorkerRequiredMatch({technicalRegistration:d,requiredMatch:d.requiredMatch});
 const c=documentFixture(),l=c.lines[0];for(const k of ['major','middle','kind','form','size','optionSelections'])delete l[k];Object.assign(l,{resourceMode:'technical_worker',occupationCatalogVersion:d.occupationCatalogVersion,occupationIds:d.occupationIds,occupationRequirement:'all_per_person',requiredMatch:['workAbility','pay','schedule']});assert.equal(validateCompanyRegistration(c).lines[0].requiredMatch.length,3);
});
test('shared worker criteria require registered source values and legal gates are independent policy, not implemented matching',()=>{
 assert.throws(()=>validateWorkerRequiredMatch({requiredMatch:['region']}),{status:400});assert.throws(()=>validateWorkerRequiredMatch({requiredMatch:['workAbility']}),{status:400});assert.equal(REQUIRED_MATCH_POLICY.requiredSides,'both');assert.equal(REQUIRED_MATCH_POLICY.legalRequirements,'independent_mandatory_gate');assert.equal(REQUIRED_MATCH_POLICY.engineImplemented,false);
});
