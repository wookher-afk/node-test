import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {Pool} from 'pg';
import {pool,one,runtimeDatabaseUrl} from './helpers/database.js';
import {testDatabaseUrl} from '../scripts/lib/test-database.mjs';
import {digest} from '../server/access.js';
const jobUrl=testDatabaseUrl({...process.env,DATABASE_URL:process.env.TEST_JOB_POST_DATABASE_URL});
const jobRuntime=new Pool({connectionString:jobUrl});
const port=Number(process.env.PORT||3000)+3,base='http://127.0.0.1:'+port;
let child,exitPromise,logs='';
async function api(path,method='GET',data,token=''){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 return {status:response.status,data:await response.json()};
}
before(async()=>{
 child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),WORKSITE_DATABASE_URL:process.env.TEST_WORKSITE_DATABASE_URL,JOB_POST_DATABASE_URL:jobUrl,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 exitPromise=once(child,'exit');child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 let ready=false;for(let i=0;i<60;i++){
  try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(ready,logs);
});
after(async()=>{try{if(child&&child.exitCode===null)child.kill('SIGTERM');await exitPromise;}finally{await Promise.all([pool.end(),jobRuntime.end()]);}});
async function actor(){
 const r=await api('/api/register','POST',{email:`job-${crypto.randomUUID()}@example.com`,password:'job-test-password',name:'가상 공고 담당자'});
 assert.equal(r.status,201);return {id:r.data.account.id,token:r.data.token};
}
async function fixture(){
 const owner=await actor(),manager=await actor(),staff=await actor(),outsider=await actor();
 const org=(await api('/api/me/companies','POST',{name:'가상 공고 업체'},owner.token)).data.id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'manager'),($1,$3,'staff')",[org,manager.id,staff.id]);
 assert.equal((await api('/api/me/companies','POST',{name:'다른 소속 업체'},outsider.token)).status,201);
 const siteResult=await api(`/api/companies/${org}/worksites`,'POST',{name:'가상 공고 현장',address:'가상시 테스트로'},owner.token);
 assert.equal(siteResult.status,201);const site=siteResult.data.worksite;
 const category=(await one('INSERT INTO occupation_categories(name) VALUES($1) RETURNING id',[crypto.randomUUID()])).id;
 const occ=(await one("INSERT INTO occupations(category_id,name) VALUES($1,'가상 직종') RETURNING id",[category])).id;
 return {owner,manager,staff,outsider,org,site,occ};
}
function payload(f,mode='same_day'){
 return {visibility:'public',lines:[{occupation_id:f.occ,resource_mode:'worker',allow_partial:true,pay:{unit:'day',amount_krw:250000},
  payment:mode==='date'?{mode,due_date:'2030-12-15'}:{mode},dates:[{work_date:'2030-11-01',capacity:3},{work_date:'2030-11-02',capacity:2}]}]};
}
async function register(f,data=payload(f),who=f.owner){return api(`/api/worksites/${f.site.id}/job-posts`,'POST',data,who.token);}
async function created(f,data=payload(f)){const r=await register(f,data);assert.equal(r.status,201,JSON.stringify(r.data));return r.data.job_post;}
async function state(){
 const names=['accounts','account_sessions','organizations','organization_memberships','worksites','worksite_assignments','worksite_events','job_posts','job_lines','job_line_dates','job_post_versions','job_post_version_lines','job_post_version_dates','job_post_events','applications','match_terms','match_dates','match_approvals','matches','match_events','payment_obligations','payment_claims','activity_records'];
 const result={};for(const table of names)result[table]=(await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY 1`)).rows;return result;
}
async function denied(f,data,status=400,who=f.owner){const before=await state(),r=await register(f,data,who);assert.equal(r.status,status,JSON.stringify(r.data));assert.deepEqual(await state(),before);}
async function waitLocked(){
 for(let i=0;i<100;i++){
  if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE application_name='node-job-posts-api' AND wait_event='advisory'")).rowCount)return;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 assert.fail('request must actually wait for the shared lock');
}

for(const role of ['owner','manager'])test(`${role} registers multiple posts, lines and work dates with explicit promises`,async()=>{
 const f=await fixture(),data=payload(f);data.lines.push({...structuredClone(data.lines[0]),allow_partial:false,pay:{unit:'day',amount_krw:180000}});
 const before=await state();
 const first=await register(f,data,f[role]);assert.equal(first.status,201,JSON.stringify(first.data));
 const second=await register(f,payload(f),f[role]);assert.equal(second.status,201);assert.notEqual(first.data.job_post.id,second.data.job_post.id);
 const p=first.data.job_post;assert.equal(p.created_by,f[role].id);assert.equal(p.version,1);assert.equal(p.lines.length,2);
 assert.equal(p.lines[0].pay.amount_krw,'250000');assert.equal(p.lines[0].dates.length,2);
 assert.equal(p.worksite_snapshot.address,f.site.address);assert.ok(p.promise_version_id);
 const listed=await api(`/api/worksites/${f.site.id}/job-posts`,'GET',undefined,f[role].token);
 assert.equal(listed.status,200);assert.deepEqual(listed.data.job_posts.map(p=>p.id),[p.id,second.data.job_post.id]);
 assert.deepEqual((await api(`/api/job-posts/${p.id}`,'GET',undefined,f[role].token)).data.job_post,p);
 const after=await state();for(const name of ['applications','match_terms','matches','payment_obligations','payment_claims','activity_records'])assert.deepEqual(after[name],before[name]);
});
test('same-day, next-day and fixed-date promises are preserved for every work day including leap/year boundaries',async()=>{
 const f=await fixture();
 for(const mode of ['same_day','next_day','date']){
  const data=payload(f,mode);data.lines[0].dates=[{work_date:'2032-02-28',capacity:1},{work_date:'2032-02-29',capacity:1},{work_date:'2032-12-31',capacity:1}];
  if(mode==='date')data.lines[0].payment.due_date='2033-01-15';
  const p=await created(f,data),line=p.lines[0];
  assert.equal(line.payment.mode,mode);
  assert.deepEqual(line.dates.map(d=>d.payment_due_date),mode==='same_day'?['2032-02-28','2032-02-29','2032-12-31']:mode==='next_day'?['2032-02-29','2032-03-01','2033-01-01']:['2033-01-15','2033-01-15','2033-01-15']);
  assert.equal(line.payment.due_date,mode==='date'?'2033-01-15':null);
 }
});
test('visibility and resource-mode values are preserved internally without creating external exposure',async()=>{
 const f=await fixture();
 for(const [visibility,resource_mode] of [['public','worker'],['targeted','equipment_and_worker'],['private','equipment']]){
  const data=payload(f);data.visibility=visibility;data.lines[0].resource_mode=resource_mode;
  const p=await created(f,data);assert.equal(p.visibility,visibility);assert.equal(p.lines[0].resource_mode,resource_mode);
  const before=await state();assert.equal((await api(`/api/job-posts/${p.id}`)).status,401);assert.deepEqual(await state(),before);
 }
});
test('pay, payment, dates and input types are validated without storing partial recruitment data',async()=>{
 const f=await fixture(),base=payload(f);
 const cases=[null,[],{}, {...base,visibility:null},{...base,visibility:'unknown'},{...base,lines:[]},{...base,organization_id:f.org}];
 for(const patch of [{pay:null},{pay:{unit:'day'}},{pay:{unit:'month',amount_krw:250000}},{pay:{unit:'hour',amount_krw:250000}},{pay:{unit:'day',amount_krw:false}},{pay:{unit:'day',amount_krw:'250000'}},{pay:{unit:'day',amount_krw:-1}},{pay:{unit:'day',amount_krw:1.5}},{pay:{unit:'day',amount_krw:Number.MAX_SAFE_INTEGER+1}},
  {payment:null},{payment:{}},{payment:{mode:'date'}},{payment:{mode:'date',due_date:'2030-02-30'}},{payment:{mode:'same_day',due_date:'2030-11-01'}},{payment:{mode:'end_of_job'}},
  {dates:[]},{dates:[{work_date:'2030-02-30',capacity:1}]},{dates:[{work_date:'2030-11-01',capacity:0}]},{dates:[{work_date:'2030-11-01',capacity:true}]},{dates:[{work_date:'2030-11-01',capacity:2147483648}]},{dates:[{work_date:'2030-11-01',capacity:1},{work_date:'2030-11-01',capacity:2}]},
  {occupation_id:1},{occupation_id:'9223372036854775807'},{allow_partial:'true'},{resource_mode:'unknown'}])cases.push({...base,lines:[{...base.lines[0],...patch}]});
 for(const data of cases)await denied(f,data);
 const zero=payload(f);zero.lines[0].pay.amount_krw=0;assert.equal((await register(f,zero)).status,201,'retain the existing DB nonnegative money range without treating zero as negotiable');
});
test('cross-organization, role spoofing and delegated site permissions do not grant this internal API access',async()=>{
 const f=await fixture(),p=await created(f);
 await denied(f,payload(f),404,f.outsider);await denied(f,payload(f),403,f.staff);
 const grant=await api(`/api/worksites/${f.site.id}/assignments/${f.staff.id}`,'PUT',{version:1,permissions:{view:true,edit:true,deactivate:true,confirm_work:true}},f.owner.token);assert.equal(grant.status,200);
 await denied(f,payload(f),403,f.staff);
 for(const who of [f.outsider,f.staff])for(const path of [`/api/worksites/${f.site.id}/job-posts`,`/api/job-posts/${p.id}`]){
  const before=await state();assert.equal((await api(path,'GET',undefined,who.token)).status,who===f.outsider?404:403);assert.deepEqual(await state(),before);
 }
 for(const extra of [{created_by:f.owner.id},{role:'owner'},{worksite_id:f.site.id},{version:1}])await denied(f,{...payload(f),...extra});
});
test('all internal routes reject absent, expired, unknown and revoked sessions without writes',async()=>{
 const f=await fixture(),p=await created(f),expired=await actor(),revoked=await actor();
 await pool.query("UPDATE account_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE account_id=$1",[expired.id]);
 await pool.query('DELETE FROM account_sessions WHERE token_hash=$1',[digest(revoked.token)]);
 for(const token of ['',digest(crypto.randomUUID()),expired.token,revoked.token]){
  const before=await state();
  for(const [path,method,data] of [[`/api/worksites/${f.site.id}/job-posts`,'POST',payload(f)],[`/api/worksites/${f.site.id}/job-posts`,'GET',undefined],[`/api/job-posts/${p.id}`,'GET',undefined]])assert.equal((await api(path,method,data,token)).status,401);
  assert.deepEqual(await state(),before);
 }
});
test('a session expiring behind the real shared lock cannot register a post',async()=>{
 const f=await fixture(),c=await pool.connect();let pending,before;
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(710031,1)');
  await pool.query("UPDATE account_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE token_hash=$1",[digest(f.owner.token)]);
  before=await state();pending=register(f);await waitLocked();
  assert.equal((await one('SELECT clock_timestamp()<expires_at AS valid FROM account_sessions WHERE token_hash=$1',[digest(f.owner.token)])).valid,true);
  let expired=false;for(let i=0;i<300;i++){
   if((await one('SELECT clock_timestamp()>expires_at AS expired FROM account_sessions WHERE token_hash=$1',[digest(f.owner.token)])).expired){expired=true;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.ok(expired);await c.query('COMMIT');
 }finally{await c.query('ROLLBACK');c.release();if(pending)await pending;}
 assert.equal((await pending).status,401);assert.deepEqual(await state(),before);
});
for(const operation of ['remove','demote'])test(`current manager membership ${operation} wins before a waiting registration`,async()=>{
 const f=await fixture(),c=await pool.connect();let pending,before;
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(710031,1)');
  pending=register(f,payload(f),f.manager);await waitLocked();
  if(operation==='remove')await c.query('DELETE FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[f.org,f.manager.id]);
  else await c.query("UPDATE organization_memberships SET role='staff' WHERE organization_id=$1 AND account_id=$2",[f.org,f.manager.id]);
  await c.query('COMMIT');before=await state();
 }finally{await c.query('ROLLBACK');c.release();if(pending)await pending;}
 assert.equal((await pending).status,operation==='remove'?404:403);assert.deepEqual(await state(),before);
});
test('concurrent registrations create distinct complete posts with version one',async()=>{
 const f=await fixture();const results=await Promise.all([register(f),register(f,payload(f),f.manager)]);
 assert.deepEqual(results.map(r=>r.status),[201,201]);assert.notEqual(results[0].data.job_post.id,results[1].data.job_post.id);
 const listed=(await api(`/api/worksites/${f.site.id}/job-posts`,'GET',undefined,f.owner.token)).data.job_posts;
 assert.equal(listed.length,2);assert.ok(listed.every(p=>p.version===1&&p.promise_version_id&&p.lines[0].dates.length===2));
});
test('counts include confirmed and completed matches, exclude pending/cancelled, and expose no worker or payment details',async()=>{
 const f=await fixture(),p=await created(f),line=p.lines[0];
 async function match(days,status){
  const w=await actor();await pool.query('INSERT INTO worker_profiles(account_id) VALUES($1)',[w.id]);
  const t=(await one("INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash) VALUES($1,$2,1,'{}',$3) RETURNING id",[line.id,w.id,crypto.randomUUID()])).id;
  for(const d of days)await pool.query('INSERT INTO match_dates VALUES($1,$2)',[t,d]);
  const m=(await one('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[t])).id;
  if(status==='pending')return;
  await pool.query("SELECT node_approve_match($1,$2,'worker',$3)",[m,t,w.id]);await pool.query("SELECT node_approve_match($1,$2,'company',$3)",[m,t,f.owner.id]);await pool.query('SELECT node_confirm_match($1)',[m]);
  if(status==='completed')await pool.query("UPDATE matches SET status='completed' WHERE id=$1",[m]);
  if(status==='cancelled')await pool.query("SELECT node_cancel_match($1,$2,'가상 취소')",[m,w.id]);
 }
 await match(['2030-11-01','2030-11-02'],'confirmed');await match(['2030-11-01'],'completed');await match(['2030-11-01'],'cancelled');await match(['2030-11-01','2030-11-02'],'pending');
 const before=await state(),r=await api(`/api/job-posts/${p.id}`,'GET',undefined,f.owner.token);assert.equal(r.status,200);
 assert.deepEqual(r.data.job_post.lines[0].dates.map(d=>[d.confirmed_count,d.remaining_count]),[[2,1],[1,1]]);
 for(const forbidden of ['worker_id','password_hash','terms_hash','approved_by','payment_claims','paid_at','email'])assert.equal(JSON.stringify(r.data).includes('"'+forbidden+'"'),false);
 assert.deepEqual(await state(),before);
});
test('late payment snapshot failure rolls back posts, all lines, dates, versions and audit events',async()=>{
 const f=await fixture();await pool.query("ALTER TABLE job_post_version_dates ADD CONSTRAINT job_test_failure CHECK(work_date<>'2030-11-02') NOT VALID");
 try{const before=await state(),r=await register(f);assert.equal(r.status,500);assert.deepEqual(await state(),before);}
 finally{await pool.query('ALTER TABLE job_post_version_dates DROP CONSTRAINT job_test_failure');}
});
test('sealed conditions and payment promises remain immutable when site information changes',async()=>{
 const f=await fixture(),p=await created(f),before=(await pool.query('SELECT * FROM job_post_version_dates WHERE post_version_id=$1',[p.promise_version_id])).rows;
 const changed=await api(`/api/worksites/${f.site.id}`,'PATCH',{version:1,address:'변경된 가상 주소'},f.owner.token);assert.equal(changed.status,200);
 const r=await api(`/api/job-posts/${p.id}`,'GET',undefined,f.owner.token);assert.equal(r.data.job_post.worksite_snapshot.address,f.site.address);
 assert.deepEqual((await pool.query('SELECT * FROM job_post_version_dates WHERE post_version_id=$1',[p.promise_version_id])).rows,before);
 await assert.rejects(pool.query("UPDATE job_post_versions SET worksite_snapshot='{}' WHERE id=$1",[p.promise_version_id]),/sealed once|immutable/);
 await assert.rejects(pool.query('DELETE FROM job_post_version_lines WHERE post_version_id=$1',[p.promise_version_id]),/append only/);
 await assert.rejects(pool.query('INSERT INTO job_post_version_dates VALUES($1,$2,\'2030-11-03\',1,\'2030-11-03\')',[p.promise_version_id,p.lines[0].id]),/Sealed/);
 await assert.rejects(pool.query('DELETE FROM job_post_events WHERE job_post_id=$1',[p.id]),/immutable/);
});
for(const invalid of ['missing_lines','wrong_payment_date','unsealed_commit'])test(`DB version guards reject ${invalid} without replacing a prior promise`,async()=>{
 const f=await fixture(),p=await created(f),before=await state(),c=await pool.connect();
 try{
  await c.query('BEGIN');await c.query('UPDATE job_posts SET version=2 WHERE id=$1',[p.id]);
  const v=(await c.query(`INSERT INTO job_post_versions(job_post_id,version,organization_id,worksite_id,worksite_snapshot,visibility,recorded_by)
   SELECT job_post_id,2,organization_id,worksite_id,worksite_snapshot,visibility,recorded_by FROM job_post_versions WHERE id=$1 RETURNING id`,[p.promise_version_id])).rows[0].id;
  if(invalid==='wrong_payment_date'){
   await c.query(`INSERT INTO job_post_version_lines SELECT $1,job_line_id,occupation_id,resource_mode,allow_partial,pay_unit,amount_krw,payment_mode,specified_due_date FROM job_post_version_lines WHERE post_version_id=$2`,[v,p.promise_version_id]);
   await c.query(`INSERT INTO job_post_version_dates SELECT $1,job_line_id,work_date,capacity,payment_due_date+1 FROM job_post_version_dates WHERE post_version_id=$2`,[v,p.promise_version_id]);
  }
  if(invalid==='unsealed_commit')await assert.rejects(c.query('COMMIT'),/sealed before commit/);
  else await assert.rejects(c.query('UPDATE job_post_versions SET sealed_at=clock_timestamp() WHERE id=$1',[v]),/every current recruitment line|dates, capacities and payment/);
 }finally{await c.query('ROLLBACK');c.release();}
 assert.deepEqual(await state(),before);
});
test('legacy recruitment stays readable without fabricating payment terms or an original author',async()=>{
 const f=await fixture(),id=(await one('INSERT INTO job_posts(worksite_id) VALUES($1) RETURNING id',[f.site.id])).id;
 const line=(await one("INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw) VALUES($1,$2,'worker',170000) RETURNING id",[id,f.occ])).id;
 await pool.query("INSERT INTO job_line_dates VALUES($1,'2030-11-01',2)",[line]);
 const before=await state(),r=await api(`/api/job-posts/${id}`,'GET',undefined,f.owner.token);
 assert.equal(r.status,200);assert.equal(r.data.job_post.created_by,null);assert.equal(r.data.job_post.promise_version_id,null);
 assert.equal(r.data.job_post.lines[0].payment,null);assert.equal(r.data.job_post.lines[0].dates[0].payment_due_date,null);assert.deepEqual(await state(),before);
});
test('inactive sites keep existing internal posts readable while new registration is pending policy confirmation',async()=>{
 const f=await fixture(),p=await created(f);
 assert.equal((await api(`/api/worksites/${f.site.id}/deactivate`,'POST',{version:1},f.owner.token)).status,200);
 await denied(f,payload(f),409);
 assert.equal((await api(`/api/job-posts/${p.id}`,'GET',undefined,f.owner.token)).status,200);
 assert.equal((await api(`/api/worksites/${f.site.id}/job-posts`,'GET',undefined,f.owner.token)).data.job_posts.length,1);
});
test('the job role cannot change recruitment after registration or access personal/actual payment data',async()=>{
 for(const sql of ['SELECT password_hash FROM accounts','SELECT worker_id FROM match_terms','SELECT terms FROM match_terms','SELECT * FROM payment_obligations','SELECT * FROM applications','UPDATE job_posts SET status=\'closed\'','UPDATE job_lines SET daily_pay_krw=0','DELETE FROM job_posts','UPDATE worksites SET name=\'변조\'','INSERT INTO job_post_events(job_post_id,event_type,after_data) VALUES(1,\'created\',\'{}\')','CREATE TABLE forbidden_job_table(id int)'])await assert.rejects(jobRuntime.query(sql),/permission denied/);
});
test('slow registration body and malformed input do not hold or wait for the shared lock',async()=>{
 const f=await fixture(),other=await fixture(),p=await created(other),raw=Buffer.from(JSON.stringify(payload(f)));
 let request;const response=new Promise((resolve,reject)=>{
  request=http.request(new URL(`/api/worksites/${f.site.id}/job-posts`,base),{method:'POST',headers:{Authorization:'Bearer '+f.owner.token,'Content-Type':'application/json','Content-Length':raw.length}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(text)}));});request.on('error',reject);
 });response.catch(()=>{});
 await new Promise((resolve,reject)=>request.write(raw.subarray(0,10),error=>error?reject(error):resolve()));
 let timer,pending,completed;
 try{
  pending=Promise.all([api(`/api/job-posts/${p.id}`,'GET',undefined,other.owner.token),register(other)]);
  completed=await Promise.race([pending.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),3000);})]);
 }finally{clearTimeout(timer);request.end(raw.subarray(10));}
 assert.equal(completed,true);assert.deepEqual((await pending).map(r=>r.status),[200,201]);assert.equal((await response).status,201);
 const c=await pool.connect();let invalid,early;
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(710031,1)');invalid=register(f,{lines:[]});
  early=await Promise.race([invalid.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),3000);})]);
 }finally{clearTimeout(timer);await c.query('ROLLBACK');c.release();}
 assert.equal(early,true);assert.equal((await invalid).status,400);
});
test('invalid identifiers, nonexistent targets and a transferred snapshot never disclose another company history',async()=>{
 const f=await fixture(),p=await created(f);
 for(const id of ['0','-1','false','1.5','9223372036854775808'])assert.equal((await api(`/api/job-posts/${id}`,'GET',undefined,f.owner.token)).status,400);
 assert.equal((await api('/api/job-posts/9223372036854775807','GET',undefined,f.owner.token)).status,404);
 const org=(await one("INSERT INTO organizations(name) VALUES('가상 이관 업체') RETURNING id")).id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'owner')",[org,f.outsider.id]);
 await pool.query('UPDATE worksites SET organization_id=$1 WHERE id=$2',[org,f.site.id]);
 const before=await state();assert.equal((await api(`/api/job-posts/${p.id}`,'GET',undefined,f.outsider.token)).status,409);assert.deepEqual(await state(),before);
});
