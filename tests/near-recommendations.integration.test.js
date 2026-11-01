import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {pool,runtimeDatabaseUrl} from './helpers/database.js';
import {documentFixture} from './helpers/company-fixture.js';
after(()=>pool.end());
test('isolated PostgreSQL registration/storage/retrieval/recommendations',async t=>{
 let logs='';const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:'3118'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 const api=async(path,method='GET',body,token)=>{const r=await fetch('http://127.0.0.1:3118'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{
  let ready=false;for(let i=0;i<60;i++){try{if((await api('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,logs);
  const register=async suffix=>{const r=await api('/api/register','POST',{email:`near-${suffix}-${Date.now()}@example.com`,password:'near-test-password-123',name:'추천 검증'});assert.equal(r.status,201);return r.data;};
  const owner=await register('owner'),outsider=await register('outsider');
  const org=await api('/api/me/companies','POST',{name:'근접 추천 검증'},owner.token);assert.equal(org.status,201);
  const cp=`/api/companies/${org.data.id}/registration`,rp=`/api/companies/${org.data.id}/recommendations`,mp=`/api/companies/${org.data.id}/auto-matches`;
  const company=documentFixture();Object.assign(company.lines[0],{form:'미니',size:'017',minExperienceMonths:0,requiredMatch:[]});company.lines[0].conditions.minimumPayWon=550000;
  assert.equal((await api(cp,'PUT',{version:0,document:company},owner.token)).status,200);
  const candidates=[];
  for(const [label,size,pay,end,eligible] of [['A','017',550000,'2026-11-30',true],['B','017',570000,'2026-11-30',true],['C','017',550000,'2026-11-17',true],['D','020',550000,'2026-11-30',false],['empty','',550000,'2026-11-30',false],['disjoint','017',550000,'2026-12-02',false]]){
   await t.test(`register ${label} then read stored recommendation`,async()=>{
    const account=await register(label),document={roles:['데모기사'],abilities:[{id:'a',mode:'ability',kind:'excavator',form:'미니',size,years:'3',optionSelections:[...company.lines[0].optionSelections]}],ownedEquipment:[],requiredMatch:['region','hours','pay'],preferences:{...structuredClone(company.lines[0].conditions),conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']}};
    document.preferences.minimumPayWon=pay;document.preferences.availability.end=end;if(label==='disjoint')document.preferences.availability.start='2026-12-01';
    const saved=await api('/api/me/worker-registration','PUT',{version:0,document},account.token);assert.equal(saved.status,200);
    const db=(await pool.query('SELECT document,version FROM worker_alpha_registrations WHERE account_id=$1',[account.account.id])).rows[0];assert.deepEqual(db.document,document);assert.equal(db.version,1);
    assert.deepEqual((await api('/api/me/worker-registration','GET',null,account.token)).data.document,document);
    candidates.push({label,id:String(account.account.id),eligible});
   });
  }
  await t.test('rank, authorization, read-only storage and unchanged exact match',async()=>{
   const snapshot=async()=>(await pool.query('SELECT account_id,document,version FROM worker_alpha_registrations ORDER BY account_id')).rows,before=await snapshot();
   const r=await api(rp,'GET',null,owner.token);assert.equal(r.status,200);assert.equal(r.data.readOnly,true);
   const ours=r.data.results.filter(x=>candidates.some(c=>c.id===x.workerAccountId));assert.deepEqual(ours.map(x=>candidates.find(c=>c.id===x.workerAccountId).label),['A','B','C']);
   assert.deepEqual(ours.map(x=>x.priorityGroup),['priority:0','priority:1','priority:2']);assert.equal(ours[1].price.companyOfferWon,550000);assert.equal(ours[1].price.workerRequestedWon,570000);assert.equal(ours[1].price.differenceWon,20000);
   assert.equal(ours[2].schedule.coveredDays,16);assert.equal(ours[2].schedule.uncoveredDays,13);assert.deepEqual(ours[2].schedule.coveredPeriods,[{start:'2026-11-02',end:'2026-11-17'}]);
   const exact=await api(mp,'GET',null,owner.token);for(const c of candidates){const found=exact.data.results.find(x=>x.workerAccountId===c.id);assert.equal(found.matched,c.label==='A');}
   assert.equal((await api(rp,'GET',null,outsider.token)).status,404);assert.equal((await api(rp)).status,401);assert.equal((await api(rp,'POST',{},owner.token)).status,405);
   assert.deepEqual(await snapshot(),before);assert.deepEqual((await api(cp,'GET',null,owner.token)).data.document,company);
   console.log(JSON.stringify({example:ours},null,2));
  });
  await t.test('explicit company pay and schedule requirements exclude mismatches through API',async()=>{
   let version=1;
   for(const [requiredMatch,expected] of [[['pay'],['A','C']],[['schedule'],['A','B']],[['pay','schedule'],['A']]]){
    company.lines[0].requiredMatch=requiredMatch;
    assert.equal((await api(cp,'PUT',{version,document:company},owner.token)).status,200);version++;
    const r=await api(rp,'GET',null,owner.token);
    assert.deepEqual(r.data.results.filter(x=>candidates.some(c=>c.id===x.workerAccountId)).map(x=>candidates.find(c=>c.id===x.workerAccountId).label),expected);
   }
  });
 }finally{if(child.exitCode===null&&child.signalCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}}
});
