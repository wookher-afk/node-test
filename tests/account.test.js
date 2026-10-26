import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:3000';
async function request(path,method='GET',data,token){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 return {status:response.status,data:await response.json()};
}
test('signup, login, worker and company profile persist after re-login',async()=>{
 const child=spawn(process.execPath,['server/index.js'],{env:process.env,stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await request('/api/health');if(r.status===200){ready=true;break;}}catch{}await delay(250);}
 assert.ok(ready,'server did not start: '+logs);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/NODE/);
 const email='node-'+randomUUID()+'@example.com',password='secure-test-password-123';
 const created=await request('/api/register','POST',{email,password,name:'테스트 작업자'});assert.equal(created.status,201,JSON.stringify(created.data));
 assert.ok(created.data.token);
 const duplicate=await request('/api/register','POST',{email,password,name:'테스트 작업자'});assert.equal(duplicate.status,409);
 const invalid=await request('/api/login','POST',{email,password:'wrong-password'});assert.equal(invalid.status,401);
 const worker=await request('/api/me/worker','PUT',{experience_months:84},created.data.token);assert.equal(worker.status,200);
 const company=await request('/api/me/companies','POST',{name:'노드 테스트 건설'},created.data.token);assert.equal(company.status,201);
 const before=await request('/api/me','GET',undefined,created.data.token);
 assert.equal(before.data.worker.experience_months,84);assert.equal(before.data.companies.length,1);
 assert.deepEqual(before.data.roles.sort(),['company','worker']);
 const logout=await request('/api/logout','POST',{},created.data.token);assert.equal(logout.status,200);
 const revoked=await request('/api/me','GET',undefined,created.data.token);assert.equal(revoked.status,401);
 const relogin=await request('/api/login','POST',{email,password});assert.equal(relogin.status,200);
 const after=await request('/api/me','GET',undefined,relogin.data.token);
 assert.equal(after.data.worker.experience_months,84);assert.equal(after.data.companies[0].name,'노드 테스트 건설');
 }finally{child.kill('SIGTERM');}
});
