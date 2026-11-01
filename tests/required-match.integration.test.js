import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {runtimeDatabaseUrl,pool} from './helpers/database.js';
import {documentFixture} from './helpers/company-fixture.js';
after(()=>pool.end());
test('real DB required conditions save, edit, clear, relogin, group scope, shared profile, stale/error rollback and legacy preservation',async()=>{
 const base='http://127.0.0.1:3102';let logs='';const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:'3102'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 const api=async(path,method='GET',body,token)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{let ready=false;for(let i=0;i<60;i++){try{if((await api('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert(ready,logs);
 const email='required-'+Date.now()+'@example.com',password='test-required-match-123';let a=await api('/api/register','POST',{email,password,name:'필수조건 검증'});assert.equal(a.status,201);let token=a.data.token;
 const wp='/api/me/worker-registration',tp='/api/me/technical-registration';const condition=documentFixture().lines[0].conditions;
 const worker={roles:['자가기사','데모기사'],abilities:[{id:'a',mode:'ability',kind:'excavator',form:'타이어식 (W)',size:'06W',years:'3'}],ownedEquipment:[{id:'o',mode:'owned',kind:'excavator',form:'타이어식 (W)',size:'06W',years:'3'}],preferences:{...condition,conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['a']},requiredMatch:['pay','region','hours']};
 assert.equal((await api(wp,'PUT',{version:0,document:worker},token)).status,200);
 const tech={workerType:'technical_worker',occupationCatalogVersion:'draft-2026-11-01-1',occupationIds:['NODE-JO-0001','NODE-JO-0011'],requiredMatch:['pay','region','workAbility']};
 assert.equal((await api(tp,'PUT',{version:1,document:tech},token)).status,200);assert.deepEqual((await api(wp,'GET',null,token)).data.document.requiredMatch,tech.requiredMatch);
 const before=(await api(wp,'GET',null,token)).data;assert.deepEqual(before.document.ownedEquipment,worker.ownedEquipment);
 for(const requiredMatch of [['workAbility','pay','region','schedule'],['pay','pay'],['license'],null]){assert.equal((await api(tp,'PUT',{version:2,document:{...tech,requiredMatch}},token)).status,400);assert.deepEqual((await api(wp,'GET',null,token)).data,before);}
 assert.equal((await api(tp,'PUT',{version:1,document:tech},token)).status,409);
 // Old clients omitting the new field must not erase the shared selection.
 const legacy={...worker};delete legacy.requiredMatch;assert.equal((await api(wp,'PUT',{version:2,document:legacy},token)).status,200);assert.deepEqual((await api(tp,'GET',null,token)).data.document,tech);
 const cleared={...tech,requiredMatch:[]};assert.equal((await api(tp,'PUT',{version:3,document:cleared},token)).status,200);assert.deepEqual((await api(wp,'GET',null,token)).data.document.requiredMatch,[]);
 const org=await api('/api/me/companies','POST',{name:'필수 그룹 검증'},token);const cp=`/api/companies/${org.data.id}/registration`,company=documentFixture();company.worksite.qualifications='기존 자격자료 보존';company.lines[0].requiredMatch=['pay','region','workAbility'];company.lines.push({...structuredClone(company.lines[0]),id:'second',requiredMatch:['experience','hours','schedule']});assert.equal((await api(cp,'PUT',{version:0,document:company},token)).status,200);
 const invalid=structuredClone(company);invalid.lines[0].requiredMatch.push('hours');assert.equal((await api(cp,'PUT',{version:1,document:invalid},token)).status,400);assert.deepEqual((await api(cp,'GET',null,token)).data.document,company);
 company.lines[0].requiredMatch=[];company.lines[1].headcount=4;assert.equal((await api(cp,'PUT',{version:1,document:company},token)).status,200);
 await api('/api/logout','POST',{},token);assert.equal((await api(wp,'GET',null,token)).status,401);a=await api('/api/login','POST',{email,password});token=a.data.token;
 assert.deepEqual((await api(tp,'GET',null,token)).data.document,cleared);assert.deepEqual((await api(cp,'GET',null,token)).data.document,company);assert.deepEqual((await api(wp,'GET',null,token)).data.document,{...legacy,requiredMatch:[]});
 // A technical-only profile cannot invent absent pay or region criteria.
 const second=await api('/api/register','POST',{email:'other-'+email,password,name:'기술작업자'});assert.equal((await api(tp,'PUT',{version:0,document:tech},second.data.token)).status,400);assert.equal((await api(tp,'PUT',{version:0,document:{...tech,requiredMatch:['workAbility']}},second.data.token)).status,200);assert.equal((await api(cp,'GET',null,second.data.token)).status,404);
 }finally{if(child.exitCode===null&&child.signalCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}}
});
