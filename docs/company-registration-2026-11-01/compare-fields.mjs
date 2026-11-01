import {Pool} from 'pg';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const p=new Pool({connectionString:'postgresql://heowook@127.0.0.1:5432/node_alpha_01_local'});
try{
 await p.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 for(const width of [390,1440]){
  const f=JSON.parse(await readFile(`docs/company-registration-2026-11-01/fixture-${width}.json`,'utf8'));
  const c=(await p.query('SELECT document,version FROM company_alpha_registrations WHERE organization_id=$1',[f.organizationId])).rows[0];
  const w=(await p.query('SELECT document FROM worker_alpha_registrations WHERE account_id=$1',[f.accountId])).rows[0].document;
  const l=c.document.lines[0],a=w.abilities[0],s=w.preferences;
  for(const key of ['kind','major','middle','form','size','optionSelections'])assert.deepEqual(l[key],a[key]);
  for(const key of ['regionCodes','regionCodeSystem','regions','startTime','endTime','availability','availableDates','payUnit','minimumPayWon'])assert.deepEqual(l.conditions[key],s[key]);
  assert.equal(Number(a.years)*12,l.minExperienceMonths);assert.equal(c.document.lines[1].conditions.payUnit,'month');assert.equal(c.document.lines[1].conditions.minimumPayWon,3500000);
  assert.equal(c.version,2);assert.equal(l.headcount,3);assert.equal(l.conditions.minimumPayWon,210000);
  console.log(`PASS real PostgreSQL ${width}: common catalog IDs/parents/form/size/options, region codes, Asia/Seoul overnight HH:mm, range/dates, integer won and same units, equipment-specific years→months. Monthly 3500000 won preserved; no day/month conversion.`);
 }
 await p.query('ROLLBACK');
}finally{await p.end();}
