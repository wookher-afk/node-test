import test, {after} from 'node:test';
import {pool,testDatabaseUrl,runtimeDatabaseUrl} from './helpers/database.js';
testDatabaseUrl();
after(()=>pool.end());
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:'+ (process.env.PORT||3000);
async function request(path,method='GET',data,token){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 return {status:response.status,data:await response.json()};
}
test('signup, login, worker and company profile persist after re-login',async()=>{
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl()},stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await request('/api/health');if(r.status===200){ready=true;break;}}catch{}await delay(250);}
 assert.ok(ready,'server did not start: '+logs);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/NODE/);
 const preserved=await request('/api/login','POST',{email:'migration@example.com',password:'migration-password-123'});
 assert.equal(preserved.status,200);
 const preservedMe=await request('/api/me','GET',undefined,preserved.data.token);
 assert.equal(preservedMe.data.worker.experience_months,84);
 assert.equal(preservedMe.data.companies[0].name,'보존 업체');
 assert.equal((await request('/api/me','GET',undefined,'a'.repeat(64))).status,200,'pre-upgrade session survives');
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
 // Use the SAME bigint account/company IDs created by the real HTTP onboarding.
 const c=await pool.connect();
 try {
  await c.query('BEGIN');
  const site=(await c.query("INSERT INTO worksites(organization_id,name) VALUES($1,'API 연동 현장') RETURNING id",[company.data.id])).rows[0].id;
  const cat=(await c.query("INSERT INTO occupation_categories(name) VALUES('API 연동') RETURNING id")).rows[0].id;
  const occ=(await c.query("INSERT INTO occupations(category_id,name) VALUES($1,'가상 기사') RETURNING id",[cat])).rows[0].id;
  const post=(await c.query('INSERT INTO job_posts(worksite_id) VALUES($1) RETURNING id',[site])).rows[0].id;
  const line=(await c.query("INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw) VALUES($1,$2,'worker',250000) RETURNING id",[post,occ])).rows[0].id;
  await c.query("INSERT INTO job_line_dates VALUES($1,'2030-01-10',1)",[line]);
  const terms=(await c.query("INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash) VALUES($1,$2,1,'{}','api-test') RETURNING id",[line,preserved.data.account.id])).rows[0].id;
  await c.query("INSERT INTO match_dates VALUES($1,'2030-01-10')",[terms]);
  const match=(await c.query('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[terms])).rows[0].id;
  await c.query("SELECT node_approve_match($1,$2,'worker',$3)",[match,terms,preserved.data.account.id]);
  await c.query("SELECT node_approve_match($1,$2,'company',$3)",[match,terms,created.data.account.id]);
  await c.query('SELECT node_confirm_match($1)',[match]);
  assert.equal((await c.query("SELECT count(*)::int AS n FROM resource_reservations WHERE match_id=$1 AND status='confirmed'",[match])).rows[0].n,1);
  await c.query("SELECT node_cancel_match($1,$2,'통합 테스트')",[match,preserved.data.account.id]);
  await c.query('ROLLBACK');
 } finally {await c.query('ROLLBACK');c.release();}

 const logout=await request('/api/logout','POST',{},created.data.token);assert.equal(logout.status,200);
 const revoked=await request('/api/me','GET',undefined,created.data.token);assert.equal(revoked.status,401);
 const relogin=await request('/api/login','POST',{email,password});assert.equal(relogin.status,200);
 const after=await request('/api/me','GET',undefined,relogin.data.token);
 assert.equal(after.data.worker.experience_months,84);assert.equal(after.data.companies[0].name,'노드 테스트 건설');
 }finally{child.kill('SIGTERM');}
});
