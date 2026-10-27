import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
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
