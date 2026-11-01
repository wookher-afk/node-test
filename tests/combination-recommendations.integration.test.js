import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {pool,runtimeDatabaseUrl} from './helpers/database.js';
import {documentFixture} from './helpers/company-fixture.js';
after(()=>pool.end());
test('isolated PostgreSQL combination recommendation API',async t=>{
 let logs='';const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:'3119'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 const api=async(path,method='GET',body,token)=>{const r=await fetch('http://127.0.0.1:3119'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const candidates=[];
 try{
  let ready=false;for(let i=0;i<60;i++){try{if((await api('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,logs);
  const register=async suffix=>{const r=await api('/api/register','POST',{email:`combo-${suffix}-${Date.now()}@example.com`,password:'near-test-password-123',name:'추천 검증'});assert.equal(r.status,201);return r.data;};
  const owner=await register('owner'),outsider=await register('outsider');
  const org=await api('/api/me/companies','POST',{name:'근접 추천 검증'},owner.token);assert.equal(org.status,201);
  const cp=`/api/companies/${org.data.id}/registration`,rp=`/api/companies/${org.data.id}/recommendations`,mp=`/api/companies/${org.data.id}/auto-matches`;
  const company=documentFixture();Object.assign(company.lines[0],{form:'미니',size:'017',minExperienceMonths:0,requiredMatch:[],headcount:1});company.lines[0].conditions.minimumPayWon=550000;
  assert.equal((await api(cp,'PUT',{version:0,document:company},owner.token)).status,200);
  for(const [label,size,pay,end,eligible] of [['A','017',550000,'2026-11-17',true],['B','017',570000,'2026-11-30',true],['C','020',550000,'2026-11-17',true],['D','020',550000,'2026-11-30',false],['empty','',550000,'2026-11-30',false],['disjoint','017',550000,'2026-12-02',false]]){
   await t.test(`register ${label} then read stored recommendation`,async()=>{
    const account=await register(label),document={roles:['데모기사'],abilities:[{id:'a',mode:'ability',kind:'excavator',form:'미니',size,years:'3',optionSelections:[...company.lines[0].optionSelections]}],ownedEquipment:[],requiredMatch:['region','hours','pay'],preferences:{...structuredClone(company.lines[0].conditions),conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}};
    if(label==='B')document.preferences.availability.start='2026-11-14';document.preferences.minimumPayWon=pay;document.preferences.availability.end=end;if(label==='disjoint')document.preferences.availability.start='2026-12-01';
    const saved=await api('/api/me/worker-registration','PUT',{version:0,document},account.token);assert.equal(saved.status,200);
    const db=(await pool.query('SELECT document,version FROM worker_alpha_registrations WHERE account_id=$1',[account.account.id])).rows[0];assert.deepEqual(db.document,document);assert.equal(db.version,1);
    assert.deepEqual((await api('/api/me/worker-registration','GET',null,account.token)).data.document,document);
    candidates.push({label,id:String(account.account.id),eligible});
   });
  }
  await t.test('combination API splits overlaps, exposes price and gaps, and preserves stored data',async()=>{
   const snapshot=async()=>(await pool.query('SELECT account_id,document,version FROM worker_alpha_registrations ORDER BY account_id')).rows,before=await snapshot();
   const endpoint=`/api/companies/${org.data.id}/combination-recommendations`;
   let response=await api(endpoint,'GET',null,owner.token);assert.equal(response.status,200);
   let r=response.data.results[0];assert.equal(r.complete,true);assert.equal(r.coveredWorkerDays,29);assert.equal(r.workerCount,2);
   const a=r.assignments.find(x=>x.workerAccountId===candidates[0].id),b=r.assignments.find(x=>x.workerAccountId===candidates[1].id);
   assert.deepEqual(a.proposedPeriods,[{start:'2026-11-02',end:'2026-11-17'}]);
   assert.deepEqual(b.proposedPeriods,[{start:'2026-11-18',end:'2026-11-30'}]);assert.equal(b.price.differenceWon,20000);
   assert.equal((await api(endpoint,'GET',null,outsider.token)).status,404);assert.equal((await api(endpoint)).status,401);assert.equal((await api(endpoint,'POST',{},owner.token)).status,405);
   assert.doesNotMatch(JSON.stringify(response.data),/contactName|phone|preferences/);
   console.log(JSON.stringify({example:r},null,2));
   company.lines[0].headcount=2;assert.equal((await api(cp,'PUT',{version:1,document:company},owner.token)).status,200);
   r=(await api(endpoint,'GET',null,owner.token)).data.results[0];assert.equal(r.requiredWorkerDays,58);assert.equal(r.coveredWorkerDays,33);assert.equal(r.uncoveredWorkerDays,25);assert.equal(r.fullyStaffedDays,4);
   company.lines[0].requiredMatch=['schedule'];assert.equal((await api(cp,'PUT',{version:2,document:company},owner.token)).status,200);
   r=(await api(endpoint,'GET',null,owner.token)).data.results[0];assert.equal(r.coveredWorkerDays,0);
   assert.deepEqual(await snapshot(),before);
  });
 }finally{
  if(candidates.length)await pool.query('DELETE FROM worker_alpha_registrations WHERE account_id=ANY($1::bigint[])',[candidates.map(c=>c.id)]);
  if(child.exitCode===null&&child.signalCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}}
});
