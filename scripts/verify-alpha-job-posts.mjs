// Minimal real HTTP/SQL verification. Creates and drops ONLY a fresh test DB.
import {Pool} from 'pg';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
if(process.env.NODE_04_1_ADMIN_ENV)process.loadEnvFile(process.env.NODE_04_1_ADMIN_ENV);
const original=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(original.hostname),'Local PostgreSQL only');
const admin=new Pool({connectionString:original.href});
const name=`node_test_alpha_posts_${Date.now()}_${randomBytes(3).toString('hex')}`;
const temporary=new URL(original);temporary.pathname='/'+name;
const metadata=async()=>({databases:(await admin.query('SELECT datname,datacl::text FROM pg_database ORDER BY datname')).rows,roles:(await admin.query('SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolcanlogin,rolconfig FROM pg_roles ORDER BY rolname')).rows});
let before,db,auth,site,job,created=false;
try{
 before=await metadata();await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created=true;
 db=new Pool({connectionString:temporary.href});process.env.DATABASE_URL=temporary.href;process.env.NODE_TEST_DATABASE='1';
 for(const file of ['001_foundation.sql','002_accounts.sql','003_unified_matching.sql','004_work_records_and_matching_data.sql','005_review_integrity_fixes.sql','006_worksite_management.sql','007_internal_job_posts.sql','008_worker_alpha_registration.sql','009_company_alpha_registration.sql','010_alpha_job_posts.sql'])await db.query(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 const {provisionTestRuntime}=await import('./lib/test-runtime-role.mjs');auth=await provisionTestRuntime(db);
 const {provisionWorksiteRuntime}=await import('./lib/test-worksite-role.mjs');site=await provisionWorksiteRuntime(db);
 const {provisionJobPostRuntime}=await import('./lib/test-job-post-role.mjs');job=await provisionJobPostRuntime(db);
 const child=spawn(process.execPath,['--test','--test-concurrency=1','tests/alpha-job-posts.integration.test.js','tests/job-posts.test.js','tests/company-registration.integration.test.js'],{env:{...process.env,TEST_RUNTIME_DATABASE_URL:auth.url,TEST_WORKSITE_DATABASE_URL:site.url,TEST_JOB_POST_DATABASE_URL:job.url},stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});assert.equal(code,0,'Targeted tests must pass');
}finally{
 try{if(job)await job.dispose();if(site)await site.dispose();if(auth)await auth.dispose();}finally{
  if(db)await db.end();if(created)await admin.query(`DROP DATABASE "${name}"`);
  try{if(before)assert.deepEqual(await metadata(),before,'Existing database/role metadata must remain unchanged');}finally{await admin.end();}
 }
}
console.log('PASS: temporary DB/roles removed; existing DB/role metadata unchanged');
