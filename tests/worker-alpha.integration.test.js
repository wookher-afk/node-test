import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {runtimeDatabaseUrl} from './helpers/database.js';
import {pool} from './helpers/database.js';
import {createHash} from 'node:crypto';
import {after} from 'node:test';
after(()=>pool.end());
const base='http://127.0.0.1:3098';
async function request(path,method='GET',payload,token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:r.status,data:await r.json()};}
test('worker registration persists through real logout/login, isolates accounts and rejects stale saves',async()=>{
let logs='';
function start(){const p=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:'3098'},stdio:['ignore','pipe','pipe']});p.stderr.on('data',d=>logs+=d);p.stdout.on('data',d=>logs+=d);return p;}
async function stop(p){if(p.exitCode!==null||p.signalCode!==null)return;const exited=new Promise(resolve=>p.once('exit',resolve));p.kill();await exited;}
let child=start();
try{
let ready=false;for(let i=0;i<60;i++){try{if((await request('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,logs);
assert.equal((await request('/api/me/worker-registration')).status,401);
const email='alpha-'+Date.now()+'@example.com',password='alpha-password-123';
const a=await request('/api/register','POST',{email,password,name:'알파 작업자'});assert.equal(a.status,201);
const b=await request('/api/register','POST',{email:'second-'+email,password,name:'별도 작업자'});assert.equal(b.status,201);
const document={roles:['데모기사'],abilities:[{id:'03',kind:'excavator',mode:'ability',form:'타이어식 (W)',size:'03W',years:'3'}],ownedEquipment:[],preferences:{regions:['서울'],minimumPayWon:250000,payUnit:'day',startTime:'08:00',endTime:'17:00',availableDates:['2026-11-02'],conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['03']}};
const saved=await request('/api/me/worker-registration','PUT',{document,version:0},a.data.token);assert.equal(saved.status,200);assert.equal(saved.data.version,1);
assert.equal((await request('/api/me/worker-registration','PUT',{document,version:0},a.data.token)).status,409);
assert.equal((await request('/api/me/worker-registration','GET',null,b.data.token)).data.document,null);
await request('/api/logout','POST',{},a.data.token);assert.equal((await request('/api/me/worker-registration','GET',null,a.data.token)).status,401);
const login=await request('/api/login','POST',{email,password});const restored=await request('/api/me/worker-registration','GET',null,login.data.token);assert.deepEqual(restored.data.document,document);
assert.equal(login.status,200);assert.equal(login.data.account.id,a.data.account.id);
const edited=structuredClone(document);edited.preferences.minimumPayWon=310000;edited.preferences.regions=['경기','서울'];
edited.ownedEquipment=[{id:'owned-03',kind:'excavator',mode:'owned',form:'타이어식 (W)',size:'03W',years:'3'}];
const changed=await request('/api/me/worker-registration','PUT',{document:edited,version:1},login.data.token);assert.equal(changed.status,200);assert.equal(changed.data.version,2);
const company=await request('/api/me/companies','POST',{name:'알파 공존 업체'},login.data.token);assert.equal(company.status,201);
await stop(child);child=start();
let reconnected=false;for(let i=0;i<60;i++){try{if((await request('/api/health')).status===200){reconnected=true;break;}}catch{}await delay(100);}assert.ok(reconnected,logs);
const me=await request('/api/me','GET',null,login.data.token);assert.equal(me.status,200);assert.equal(me.data.account.id,a.data.account.id);assert.deepEqual(me.data.roles.sort(),['company','worker']);assert.equal(me.data.companies[0].id,company.data.id);
assert.deepEqual((await request('/api/me/worker-registration','GET',null,login.data.token)).data.document,edited);
assert.equal((await request('/api/me','GET',null,'f'.repeat(64))).status,401);
await pool.query("UPDATE account_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[createHash('sha256').update(login.data.token).digest('hex')]);
assert.equal((await request('/api/me','GET',null,login.data.token)).status,401);
assert.equal((await request('/api/me/worker-registration','PUT',{document,version:2},login.data.token)).status,401);
const again=await request('/api/login','POST',{email,password});assert.equal(again.status,200);assert.equal(again.data.account.id,a.data.account.id);
assert.deepEqual((await request('/api/me/worker-registration','GET',null,again.data.token)).data.document,edited);
const tp='/api/me/technical-registration',tech={workerType:'technical_worker',occupationCatalogVersion:'draft-2026-11-01-1',occupationIds:Array.from({length:60},(_,i)=>'NODE-JO-'+String(i+1).padStart(4,'0'))};
assert.equal((await request(tp)).status,401);
assert.equal((await request(tp,'GET',null,b.data.token)).data.document,null);
assert.equal((await request(tp,'PUT',{document:tech,version:2},again.data.token)).status,200);
assert.deepEqual((await request('/api/me/worker-registration','GET',null,again.data.token)).data.document,edited);
assert.equal((await request(tp,'PUT',{document:tech,version:2},again.data.token)).status,409);
assert.equal((await request(tp,'PUT',{document:{...tech,occupationIds:['bad']},version:3},again.data.token)).status,400);
const tech2={...tech,occupationIds:tech.occupationIds.slice(1)};
assert.equal((await request(tp,'PUT',{document:tech2,version:3},again.data.token)).status,200);
assert.equal((await request('/api/me/worker-registration','PUT',{document:edited,version:4},again.data.token)).status,200);
await request('/api/logout','POST',{},again.data.token);
const login2=await request('/api/login','POST',{email,password});
assert.deepEqual((await request(tp,'GET',null,login2.data.token)).data,{document:tech2,version:5});
assert.deepEqual((await request('/api/me/worker-registration','GET',null,login2.data.token)).data.document,edited);
assert.equal((await request(tp,'GET',null,b.data.token)).data.document,null);
// Technical-only accounts can later register equipment without losing occupations.
assert.equal((await request(tp,'PUT',{document:tech,version:0},b.data.token)).status,200);
assert.deepEqual((await request('/api/me/worker-registration','GET',null,b.data.token)).data,{document:null,version:1});
assert.equal((await request('/api/me/worker-registration','PUT',{document,version:1},b.data.token)).status,200);
assert.deepEqual((await request(tp,'GET',null,b.data.token)).data,{document:tech,version:2});

}finally{await stop(child);}
});
