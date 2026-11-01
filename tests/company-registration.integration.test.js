import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {pool,runtimeDatabaseUrl} from './helpers/database.js';
import {documentFixture} from './helpers/company-fixture.js';
after(()=>pool.end());
test('company real PostgreSQL CRUD, ownership, stale writes, restart and worker coexistence',async()=>{
 const base='http://127.0.0.1:3097';let logs='';
 let child;function start(){const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:'3097'},stdio:['ignore','pipe','pipe']});child.stderr.on('data',d=>logs+=d);return child;}child=start();
 const request=async(path,method='GET',payload,token)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:r.status,data:await r.json()};};
 try{
 let ready=false;for(let i=0;i<60;i++){try{if((await request('/api/health')).status===200){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,logs);
 const email='company-'+Date.now()+'@example.com',password='company-password-123';
 const a=await request('/api/register','POST',{email,password,name:'업체 대표'}),token=a.data.token;
 const other=await request('/api/register','POST',{email:'other-'+email,password,name:'다른 계정'});
 const company=await request('/api/me/companies','POST',{name:'기존 업체'},token),id=company.data.id,path=`/api/companies/${id}/registration`;
 assert.equal((await request(path)).status,401);assert.equal((await request(path,'GET',null,other.data.token)).status,404);
 assert.deepEqual((await request(path,'GET',null,token)).data,{document:null,version:0});
 const d=documentFixture();assert.equal((await request(path,'PUT',{version:0,document:d},token)).status,200);
 assert.equal((await request(path,'PUT',{version:0,document:d},token)).status,409);
 const invalid=structuredClone(d);invalid.lines[0].kind='invented';assert.equal((await request(path,'PUT',{version:1,document:invalid},token)).status,400);
 assert.deepEqual((await request(path,'GET',null,token)).data.document,d);
 d.lines.push({...structuredClone(d.lines[0]),id:'line-2'});d.lines[1].conditions.payUnit='month';d.lines[1].conditions.minimumPayWon=3500000;
 assert.equal((await request(path,'PUT',{version:1,document:d},token)).data.version,2);
 const row=(await pool.query('SELECT document,version FROM company_alpha_registrations WHERE organization_id=$1',[id])).rows[0];assert.deepEqual(row,{document:d,version:2});
 await request('/api/me/worker','PUT',{experience_months:36},token);assert.deepEqual((await request('/api/me','GET',null,token)).data.roles.sort(),['company','worker']);
 await request('/api/logout','POST',{},token);assert.equal((await request(path,'GET',null,token)).status,401);
 const login=await request('/api/login','POST',{email,password});assert.deepEqual((await request(path,'GET',null,login.data.token)).data,row);
 const stopped=new Promise(resolve=>child.once('exit',resolve));child.kill();await stopped;child=start();
 let restarted=false;for(let i=0;i<60;i++){try{if((await request('/api/health')).status===200){restarted=true;break;}}catch{}await delay(100);}assert.ok(restarted,logs);assert.deepEqual((await request(path,'GET',null,login.data.token)).data,row);
 // Membership, rather than caller supplied organization/account fields, controls writes.
 await pool.query("UPDATE organization_memberships SET role='manager' WHERE organization_id=$1 AND account_id=$2",[id,a.data.account.id]);
 assert.equal((await request(path,'PUT',{version:2,document:d},login.data.token)).status,403);
 }finally{const stopped=new Promise(resolve=>child.once('exit',resolve));child.kill();await stopped;}
});
