import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {pool,runtimeDatabaseUrl} from './helpers/database.js';
import {documentFixture} from './helpers/company-fixture.js';
after(()=>pool.end());

test('real PostgreSQL equipment spec: registration -> storage -> retrieval -> auto-match',async t=>{
 const port='3117',base=`http://127.0.0.1:${port}`;let logs='';
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:port},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 const api=async(path,method='GET',body,token)=>{
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
 };
 try{
  let ready=false;for(let i=0;i<60;i++){if(child.exitCode!==null)break;try{if((await api('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,logs);
  const a=await api('/api/register','POST',{email:`spec-${Date.now()}@example.com`,password:'spec-integration-123',name:'규격 통합검증'});
  assert.equal(a.status,201);const token=a.data.token,accountId=String(a.data.account.id);
  const org=await api('/api/me/companies','POST',{name:'규격 통합검증'},token);assert.equal(org.status,201);
  const cp=`/api/companies/${org.data.id}/registration`,wp='/api/me/worker-registration',mp=`/api/companies/${org.data.id}/auto-matches`;
  const company=documentFixture();Object.assign(company.lines[0],{form:'미니',size:'017',minExperienceMonths:0,requiredMatch:[]});
  const worker={roles:['데모기사'],abilities:[{id:'spec-a',mode:'ability',kind:'excavator',form:'미니',size:'017',years:'3',optionSelections:[...company.lines[0].optionSelections]}],ownedEquipment:[],requiredMatch:[],preferences:{...structuredClone(company.lines[0].conditions),conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['spec-a']}};
  let cv=0,wv=0;
  const rows=async()=>({worker:(await pool.query('SELECT document,version FROM worker_alpha_registrations WHERE account_id=$1',[accountId])).rows[0],company:(await pool.query('SELECT document,version FROM company_alpha_registrations WHERE organization_id=$1',[org.data.id])).rows[0]});
  for(const [wanted,available,expected] of [['017','017','matched'],['020','020','matched'],['017','020','not_matched'],['020','017','not_matched'],['017','','not_matched']]){
   await t.test(`company ${wanted} / worker ${available||'(empty)'} => ${expected}`,async()=>{
    company.lines[0].size=wanted;worker.abilities[0].size=available;
    const c=await api(cp,'PUT',{version:cv,document:company},token);assert.equal(c.status,200);cv=c.data.version;
    const w=await api(wp,'PUT',{version:wv,document:worker},token);assert.equal(w.status,200);wv=w.data.version;
    const saved=await rows();assert.deepEqual(saved,{worker:{document:worker,version:wv},company:{document:company,version:cv}});
    assert.deepEqual((await api(wp,'GET',null,token)).data.document,saved.worker.document);
    assert.deepEqual((await api(cp,'GET',null,token)).data.document,saved.company.document);
    const response=await api(mp,'GET',null,token);assert.equal(response.status,200);assert.equal(response.data.readOnly,true);
    const r=response.data.results.find(x=>x.lineId==='line-1'&&x.workerAccountId===accountId);assert.ok(r);assert.equal(r.status,expected);assert.equal(r.matched,expected==='matched');
    assert.equal(r.checks.equipmentSpec.status,available===''?'unknown':wanted===available?'pass':'fail');
    for(const key of ['requiredSelection','resourceMode','experience','schedule','pay','region','hours'])assert.equal(r.checks[key].status,'pass',key);
    assert.deepEqual(await rows(),saved,'matching GET must preserve registration documents and versions');
    console.log(JSON.stringify({wanted,available,status:r.status,matched:r.matched,equipmentSpec:r.checks.equipmentSpec.status}));
   });
  }
  for(const side of ['worker','company'])for(const value of [undefined,null,...(side==='company'?['']:[])]){
   await t.test(`${side} size ${value===undefined?'omitted':JSON.stringify(value)} => HTTP 400, DB unchanged`,async()=>{
    const before=await rows(),d=structuredClone(side==='worker'?worker:company),entry=side==='worker'?d.abilities[0]:d.lines[0];
    if(value===undefined)delete entry.size;else entry.size=value;
    assert.equal((await api(side==='worker'?wp:cp,'PUT',{version:side==='worker'?wv:cv,document:d},token)).status,400);
    assert.deepEqual(await rows(),before);
    const r=(await api(mp,'GET',null,token)).data.results.find(x=>x.lineId==='line-1'&&x.workerAccountId===accountId);
    assert.equal(r.matched,false,'rejected writes cannot turn the stored empty worker spec into a match');
   });
  }
 }finally{
  if(child.exitCode===null&&child.signalCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}
 }
});
