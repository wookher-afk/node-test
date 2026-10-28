import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {pool,one,runtimeDatabaseUrl} from './helpers/database.js';
import {provisionTestRuntime} from '../scripts/lib/test-runtime-role.mjs';
const runtime=new Pool({connectionString:runtimeDatabaseUrl()});
const port=Number(process.env.PORT||3000)+1,base='http://127.0.0.1:'+port;
let child,exitPromise,token,accountId;
async function request(path,method='GET',payload,auth=token,raw=false){
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(payload!==undefined?{body:raw?payload:JSON.stringify(payload)}:{})});
 return {status:res.status,data:await res.json()};
}
async function onboardingState(){
 const out={};for(const table of ['accounts','account_roles','worker_profiles','organizations','organization_memberships','account_sessions'])out[table]=(await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY 1`)).rows;
 return out;
}
before(async()=>{
 child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),PORT:String(port)},stdio:['ignore','pipe','pipe']});
 exitPromise=once(child,'exit');
 let ready=false;for(let i=0;i<60;i++){if(child.exitCode!==null)break;try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'restricted-role HTTP server must start');
 const signup=await request('/api/register','POST',{email:'stabilization-'+crypto.randomUUID()+'@example.com',password:'safe-local-test-password',name:'검증 작업자'},'');
 assert.equal(signup.status,201);token=signup.data.token;accountId=signup.data.account.id;
 assert.equal((await request('/api/me/worker','PUT',{experience_months:84})).status,200);
});
after(async()=>{try{if(child&&child.exitCode===null)child.kill('SIGTERM');if(exitPromise)await exitPromise;}finally{await Promise.all([runtime.end(),pool.end()]);}});

test('runtime identity is a real login with no administrative flags, membership or object ownership',async()=>{
 const row=(await runtime.query("SELECT current_user AS name,r.* FROM pg_roles r WHERE rolname=current_user")).rows[0];
 assert.match(row.name,/^node_auth_runtime_[a-f0-9]{16}$/);
 assert.equal(row.rolcanlogin,true);
 for(const flag of ['rolsuper','rolcreatedb','rolcreaterole','rolinherit','rolreplication','rolbypassrls'])assert.equal(row[flag],false,flag);
 assert.equal((await runtime.query('SELECT count(*)::int AS n FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)')).rows[0].n,0);
 assert.equal((await runtime.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)")).rows[0].n,0);
});

test('runtime can save and re-read worker and company data, without access to unused columns',async()=>{
 const company=await request('/api/me/companies','POST',{name:'제한 권한 업체'});assert.equal(company.status,201);
 const me=await request('/api/me');assert.equal(me.status,200);assert.equal(me.data.worker.experience_months,84);assert.ok(me.data.companies.some(c=>c.id===company.data.id));
 await assert.rejects(runtime.query('SELECT created_at FROM accounts LIMIT 1'),/permission denied/);
});

test('runtime cannot change schema, create temp objects, assume the owner or bypass restricted functions',async()=>{
 const owner=(await one('SELECT current_user AS name')).name;
 const queries=[
  'CREATE TABLE public.runtime_forbidden(id int)',
  'CREATE TEMP TABLE runtime_forbidden(id int)',
  'CREATE SCHEMA runtime_forbidden',
  'ALTER TABLE accounts ADD COLUMN runtime_forbidden int',
  'ALTER TABLE account_roles DISABLE ROW LEVEL SECURITY',
  'CREATE ROLE runtime_forbidden',
  'ALTER ROLE CURRENT_USER SUPERUSER',
  'SET ROLE "'+owner.replaceAll('"','""')+'"',
  'SELECT node_confirm_match(1)',
  'SELECT node_term_organization(1)',
  "SELECT nextval(pg_get_serial_sequence('accounts','id'))"
 ];
 for(const sql of queries)await assert.rejects(runtime.query(sql),/permission denied|must be owner|superuser/);
});

test('runtime cannot read/write matching, payment, trust or moderation data',async()=>{
 const before=await onboardingState();
 for(const table of ['worksites','job_posts','matches','match_terms','match_term_parties','match_events','payment_obligations','payment_claims','activity_records','transaction_reviews','record_cases','case_decisions','case_decision_order']) {
  await assert.rejects(runtime.query('SELECT * FROM '+table+' LIMIT 1'),/permission denied/);
  await assert.rejects(runtime.query('DELETE FROM '+table),/permission denied/);
 }
 await assert.rejects(runtime.query('UPDATE accounts SET display_name=$1 WHERE id=$2',['改変',accountId]),/permission denied/);
 await assert.rejects(runtime.query('DELETE FROM organizations'),/permission denied/);
 await assert.rejects(runtime.query('TRUNCATE accounts'),/permission denied/);
 assert.deepEqual(await onboardingState(),before);
});

test('runtime cannot grant admin/transporter or extra membership roles through onboarding tables',async()=>{
 const before=await onboardingState();
 await assert.rejects(runtime.query("INSERT INTO account_roles VALUES($1,'admin')",[accountId]),/row-level security/);
 await assert.rejects(runtime.query("INSERT INTO account_roles VALUES($1,'transporter')",[accountId]),/row-level security/);
 const org=(await one("SELECT organization_id FROM organization_memberships WHERE account_id=$1 LIMIT 1",[accountId])).organization_id;
 await assert.rejects(runtime.query("INSERT INTO organization_memberships VALUES($1,$2,'manager')",[org,accountId]),/row-level security/);
 assert.deepEqual(await onboardingState(),before);
});

for(const payload of [null,false,0,'not-an-object',[]])test('object APIs reject top-level '+JSON.stringify(payload)+' with HTTP 400 and no stored changes',async()=>{
 const before=await onboardingState();
 for(const [path,method] of [['/api/register','POST'],['/api/login','POST'],['/api/me/worker','PUT'],['/api/me/companies','POST']]){
  const result=await request(path,method,payload);assert.equal(result.status,400,path);assert.ok(result.data.error);
 }
 assert.deepEqual(await onboardingState(),before);
});

test('malformed JSON is HTTP 400 and does not modify the existing profile',async()=>{
 const before=await onboardingState();assert.equal((await request('/api/me/worker','PUT','{"experience_months":',token,true)).status,400);assert.deepEqual(await onboardingState(),before);
});

for(const [path,fields] of [
 ['/api/register',['email','password','name']],
 ['/api/login',['email','password']],
 ['/api/me/companies',['name']]
])for(const field of fields)test(`${path}: ${field} rejects non-string inputs without changing stored data`,async()=>{
 const email=(await request('/api/me')).data.account.email;
 const valid={email,password:'safe-local-test-password',name:'검증 업체'};
 for(const value of [undefined,null,[],[valid[field]],{},0,1234567890,false,true]){
  const before=await onboardingState();
  const result=await request(path,'POST',{...valid,[field]:value});
  assert.equal(result.status,400,`${field}: ${JSON.stringify(value)}`);
  assert.deepEqual(await onboardingState(),before,'invalid input must not create accounts, sessions or company memberships');
 }
});

test('normal strings retain normalization, length boundaries and exact password contents',async()=>{
 for(const length of [2,80]){
  const email=`strings-${crypto.randomUUID()}@example.com`,password=' 12345678 ';
  const created=await request('/api/register','POST',{email:' '+email.toUpperCase()+' ',password,name:' '+'가'.repeat(length)+' '},'');
  assert.equal(created.status,201);assert.equal(created.data.account.email,email);
  assert.equal(created.data.account.display_name,'가'.repeat(length));
  const loggedIn=await request('/api/login','POST',{email:' '+email.toUpperCase()+' ',password},'');
  assert.equal(loggedIn.status,200);assert.equal(loggedIn.data.account.id,created.data.account.id);
  assert.equal((await request('/api/login','POST',{email,password:password.trim()},'')).status,401);
  assert.equal((await request('/api/register','POST',{email,password,name:'정상 이름'},'')).status,409);
 }
 for(const length of [2,120]){
  const name='나'.repeat(length),company=await request('/api/me/companies','POST',{name:' '+name+' '});
  assert.equal(company.status,201);assert.equal(company.data.name,name);
  assert.ok((await request('/api/me')).data.companies.some(c=>c.id===company.data.id&&c.name===name));
 }
});

test('invalid string contents retain existing validation and leave stored data unchanged',async()=>{
 const valid={email:`strings-${crypto.randomUUID()}@example.com`,password:'valid-password-123',name:'정상 이름'};
 for(const patch of [{email:''},{email:'bad-email'},{password:''},{password:'123456789'},{name:' '},{name:'가'},{name:'가'.repeat(81)}]){
  const before=await onboardingState();
  assert.equal((await request('/api/register','POST',{...valid,...patch},'')).status,400);
  assert.deepEqual(await onboardingState(),before);
 }
 for(const name of ['', ' ', '가', '가'.repeat(121)]){
  const before=await onboardingState();
  assert.equal((await request('/api/me/companies','POST',{name})).status,400);
  assert.deepEqual(await onboardingState(),before);
 }
 const email=(await request('/api/me')).data.account.email;
 for(const payload of [{email:'',password:''},{email:'bad-email',password:'valid-password-123'},{email,password:''}]){
  const before=await onboardingState();
  assert.equal((await request('/api/login','POST',payload,'')).status,401);
  assert.deepEqual(await onboardingState(),before);
 }
});

test('invalid experience values are rejected without silently overwriting 84 months',async()=>{
 for(const value of [null,'','   ',false,true,[],[0],{},'false','84x',-1,901,1.5,'1.5']){
  const result=await request('/api/me/worker','PUT',{experience_months:value});assert.equal(result.status,400,JSON.stringify(value));
  assert.equal((await request('/api/me')).data.worker.experience_months,84);
 }
 assert.equal((await request('/api/me/worker','PUT',{})).status,400);
 assert.equal((await request('/api/me')).data.worker.experience_months,84);
});

test('explicit numeric zero and compatible decimal integer strings still save correctly',async()=>{
 for(const [input,expected] of [[0,0],['0',0],['84',84],[900,900],[84,84]]){
  const result=await request('/api/me/worker','PUT',{experience_months:input});assert.equal(result.status,200);assert.equal(result.data.experience_months,expected);
  assert.equal((await request('/api/me')).data.worker.experience_months,expected);
 }
});

test('unknown caller cannot update worker/company data even when JSON is valid',async()=>{
 const before=await onboardingState();
 assert.equal((await request('/api/me/worker','PUT',{experience_months:0},'')).status,401);
 assert.equal((await request('/api/me/companies','POST',{name:'unauthorized'},'')).status,401);
 assert.deepEqual(await onboardingState(),before);
});

async function companyCaller(){
 const created=await request('/api/register','POST',{email:`company-access-${crypto.randomUUID()}@example.com`,password:'company-access-password',name:'권한 검증 계정'},'');
 assert.equal(created.status,201);
 return {id:created.data.account.id,token:created.data.token};
}

test('company APIs consistently reject missing, invalid, expired and revoked sessions without writes',async()=>{
 const expired=await companyCaller(),revoked=await companyCaller();
 await pool.query("UPDATE account_sessions SET expires_at=now()-interval '1 second' WHERE account_id=$1",[expired.id]);
 await pool.query('DELETE FROM account_sessions WHERE token_hash=$1',[createHash('sha256').update(revoked.token).digest('hex')]);
 const unknown=createHash('sha256').update(crypto.randomUUID()).digest('hex');
 for(const auth of ['', 'invalid-token', unknown, expired.token, revoked.token]){
  const before=await onboardingState();
  for(const [path,method,payload] of [['/api/me','GET',undefined],['/api/me/companies','POST',{name:'권한 없는 등록'}]]){
   const result=await request(path,method,payload,auth);
   assert.equal(result.status,401);assert.deepEqual(result.data,{error:'로그인이 필요합니다.'});
  }
  assert.deepEqual(await onboardingState(),before);
 }
});

for(const role of ['owner','manager','staff'])test(`own company membership summary remains available for ${role} only within their memberships`,async()=>{
 const caller=await companyCaller(),other=await companyCaller();
 const mine=await request('/api/me/companies','POST',{name:'본인 소속 업체'},caller.token);
 const theirs=await request('/api/me/companies','POST',{name:'다른 계정 업체'},other.token);
 assert.equal(mine.status,201);assert.equal(theirs.status,201);
 await pool.query('UPDATE organization_memberships SET role=$1 WHERE organization_id=$2 AND account_id=$3',[role,mine.data.id,caller.id]);
 const before=await onboardingState(),me=await request('/api/me','GET',undefined,caller.token);
 assert.equal(me.status,200);assert.equal(me.data.account.id,caller.id);
 assert.deepEqual(me.data.companies,[{id:mine.data.id,name:mine.data.name,role}]);
 assert.deepEqual(await onboardingState(),before);
});

test('an account without memberships can read its empty summary and create its own new company',async()=>{
 const caller=await companyCaller();
 const before=await onboardingState(),me=await request('/api/me','GET',undefined,caller.token);
 assert.equal(me.status,200);assert.deepEqual(me.data.companies,[]);
 assert.deepEqual(await onboardingState(),before);
 const created=await request('/api/me/companies','POST',{name:'첫 업체'},caller.token);
 assert.equal(created.status,201);
 assert.deepEqual((await request('/api/me','GET',undefined,caller.token)).data.companies,[{...created.data,role:'owner'}]);
});

test('membership changes and removal are reflected on the next request without re-login',async()=>{
 const caller=await companyCaller();
 const created=await request('/api/me/companies','POST',{name:'소속 변경 업체'},caller.token);
 assert.equal(created.status,201);
 for(const role of ['manager','staff']){
  await pool.query('UPDATE organization_memberships SET role=$1 WHERE organization_id=$2 AND account_id=$3',[role,created.data.id,caller.id]);
  const before=await onboardingState();
  assert.equal((await request('/api/me','GET',undefined,caller.token)).data.companies[0].role,role);
  assert.deepEqual(await onboardingState(),before);
 }
 await pool.query('DELETE FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[created.data.id,caller.id]);
 const before=await onboardingState();
 assert.deepEqual((await request('/api/me','GET',undefined,caller.token)).data.companies,[]);
 assert.deepEqual(await onboardingState(),before);
});

test('company and account identifiers supplied in queries cannot select another membership summary',async()=>{
 const caller=await companyCaller(),other=await companyCaller();
 const mine=await request('/api/me/companies','POST',{name:'조회 대상 본인 업체'},caller.token);
 const theirs=await request('/api/me/companies','POST',{name:'비공개 다른 업체'},other.token);
 assert.equal(mine.status,201);assert.equal(theirs.status,201);
 // /api/me does not accept a target organization ID. These extra query values
 // must never become selectors; no company-by-ID endpoint is introduced here.
 for(const value of [theirs.data.id,'9223372036854775807',null,[],{},false,1.5]){
  const query=new URLSearchParams({organization_id:JSON.stringify(value),company_id:JSON.stringify(value),account_id:other.id,role:'owner'});
  const before=await onboardingState(),me=await request('/api/me?'+query,'GET',undefined,caller.token);
  assert.equal(me.status,200);assert.equal(me.data.account.id,caller.id);
  assert.deepEqual(me.data.companies,[{...mine.data,role:'owner'}]);
  assert.deepEqual(await onboardingState(),before);
 }
});

test('new company ownership comes from the session, ignoring forged company, account and role fields',async()=>{
 const caller=await companyCaller(),other=await companyCaller();
 const theirs=await request('/api/me/companies','POST',{name:'보존할 다른 업체'},other.token);
 assert.equal(theirs.status,201);
 const existingCompanies=await pool.query('SELECT * FROM organizations ORDER BY id');
 const existingMemberships=await pool.query('SELECT * FROM organization_memberships ORDER BY organization_id,account_id');
 const created=await request('/api/me/companies','POST',{name:'본인 신규 업체',id:theirs.data.id,organization_id:theirs.data.id,company_id:theirs.data.id,account_id:other.id,owner_account_id:other.id,role:'manager'},caller.token);
 assert.equal(created.status,201);assert.notEqual(created.data.id,theirs.data.id);
 assert.deepEqual((await request('/api/me','GET',undefined,caller.token)).data.companies,[{...created.data,role:'owner'}]);
 assert.deepEqual((await request('/api/me','GET',undefined,other.token)).data.companies,[{...theirs.data,role:'owner'}]);
 assert.deepEqual((await pool.query('SELECT * FROM organizations WHERE id<>$1 ORDER BY id',[created.data.id])).rows,existingCompanies.rows);
 assert.deepEqual((await pool.query('SELECT * FROM organization_memberships WHERE organization_id<>$1 ORDER BY organization_id,account_id',[created.data.id])).rows,existingMemberships.rows);
});

test('local role launcher refuses remote/production URLs and missing acknowledgement before connecting',()=>{
 for(const patch of [
  {DATABASE_URL:'postgresql://example:example@production.example.com/node_test',NODE_TEST_DATABASE:'1'},
  {DATABASE_URL:'postgresql://example:example@127.0.0.1/production',NODE_TEST_DATABASE:'1'},
  {NODE_TEST_DATABASE:''}
 ]){
  const result=spawnSync(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,...patch},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/local disposable node_test/);
 }
});


test('provisioning refuses an already configured schema without creating another role or changing policies',async()=>{
 async function metadata(){return {
  roles:(await pool.query("SELECT rolname FROM pg_roles WHERE rolname LIKE 'node_auth_runtime_%' ORDER BY rolname")).rows,
  policies:(await pool.query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows
 };}
 const before=await metadata();await assert.rejects(provisionTestRuntime(pool),/without existing onboarding policies/);assert.deepEqual(await metadata(),before);
});
