import test from 'node:test';
import assert from 'node:assert/strict';
import {alphaJobPostInput} from '../server/alpha-job-post-input.js';
import {jobPostInput} from '../server/job-posts.js';
import {documentFixture} from './helpers/company-fixture.js';
const choice=(line_id='line-1')=>({line_id,occupation_id:'123',occupation_confirmed:true,payment:{mode:'next_day'},payment_confirmed:true,allow_partial:false});
const convert=(d=documentFixture(),choices=d.lines.map(l=>choice(l.id)))=>jobPostInput(alphaJobPostInput(d,choices,'private'));
test('exact money, capacity, inclusive dates, next-day promise and all equipment conditions survive without source mutation',()=>{
 const d=documentFixture(),before=structuredClone(d),r=convert(d),l=r.lines[0];assert.deepEqual(d,before);
 assert.equal(r.visibility,'private');assert.deepEqual(l.pay,{unit:'day',amount_krw:200000});assert.equal(l.dates.length,29);
 assert.deepEqual(l.dates[0],{work_date:'2026-11-02',capacity:2,payment_due_date:'2026-11-03'});
 assert.deepEqual(l.dates.at(-1),{work_date:'2026-11-30',capacity:2,payment_due_date:'2026-12-01'});
 assert.deepEqual(l.alpha_conditions,d.lines[0]);assert.equal(l.allow_partial,false);assert.equal(l.occupation_id,'123');
});
test('monthly, always, unknown fields and missing confirmations fail closed',()=>{
 for(const mutate of [d=>d.lines[0].conditions.payUnit='month',d=>d.lines[0].conditions.availability={mode:'always'},d=>d.lines[0].future='unknown',d=>d.lines[0].conditions.future='unknown',d=>d.company.future='unknown']){
  const d=documentFixture();mutate(d);assert.throws(()=>convert(d),{status:422});
 }
 for(const key of ['occupation_confirmed','payment_confirmed','allow_partial']){const c=choice();delete c[key];assert.throws(()=>convert(documentFixture(),[c]),{status:422});}
});
test('leap day and different per-line headcounts remain exact; fixed-date promise is not inferred from free text',()=>{
 const d=documentFixture();d.lines[0].conditions.availability={mode:'range',start:'2028-02-28',end:'2028-03-01'};
 d.lines.push({...structuredClone(d.lines[0]),id:'second',headcount:3});
 const choices=d.lines.map(l=>({...choice(l.id),payment:{mode:'date',due_date:'2028-03-10'}}));
 const r=convert(d,choices);assert.equal(r.lines.length,2);assert.equal(r.lines[1].dates[0].capacity,3);
 assert.deepEqual(r.lines[0].dates.map(x=>x.work_date),['2028-02-28','2028-02-29','2028-03-01']);
 assert.ok(r.lines.every(l=>l.dates.every(d=>d.payment_due_date==='2028-03-10')));
 assert.equal(r.lines[0].alpha_conditions.paymentTerms,'매월 10일 지급');
});
test('duplicates, missing lines and invalid payment dates cannot produce partial input',()=>{
 const d=documentFixture();d.lines.push({...structuredClone(d.lines[0]),id:'second'});
 assert.throws(()=>convert(d,[choice(),choice()]),{status:422});assert.throws(()=>convert(d,[choice()]),{status:422});
 assert.throws(()=>convert(documentFixture(),[{...choice(),payment:{mode:'date',due_date:'2028-02-30'}}]),{status:400});
});
test('technical all-per-person group is kept intact rather than multiplied by number of occupations',()=>{
 const d=documentFixture(),l=d.lines[0];for(const key of ['major','middle','kind','form','size','optionSelections'])delete l[key];
 Object.assign(l,{resourceMode:'technical_worker',occupationIds:['NODE-JO-0001','NODE-JO-0002'],occupationCatalogVersion:'draft-2026-11-01-1',occupationRequirement:'all_per_person'});
 const r=convert(d);assert.equal(r.lines.length,1);assert.equal(r.lines[0].dates[0].capacity,2);assert.deepEqual(r.lines[0].alpha_conditions.occupationIds,l.occupationIds);
});
