// Creates a new local disposable database. Never resets an existing database.
import {Pool} from 'pg';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
try{process.loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
const original=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(original.hostname));
const admin=new Pool({connectionString:original.href});
const name=`node_test_near_${Date.now()}`;
const temporary=new URL(original);temporary.pathname='/'+name;
const env={...process.env,DATABASE_URL:temporary.href,NODE_TEST_DATABASE:'1'};
const state=async()=>({databases:(await admin.query('SELECT datname,datacl::text FROM pg_database ORDER BY datname')).rows,roles:(await admin.query('SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolcanlogin,rolconfig FROM pg_roles ORDER BY rolname')).rows});
const before=await state();let db,runtime,created=false;
async function run(args,log,extra={}){
 const child=spawn(process.execPath,args,{env:{...env,...extra},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});await writeFile(`docs/near-priority-2026-11-01/${log}`,output);assert.equal(code,0,`See ${log}`);
}
try{
 await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created=true;
 await run(['scripts/test.mjs'],'existing-db-suite.txt');
 db=new Pool({connectionString:temporary.href});process.env.DATABASE_URL=temporary.href;process.env.NODE_TEST_DATABASE='1';
 const {provisionTestRuntime}=await import('./lib/test-runtime-role.mjs');runtime=await provisionTestRuntime(db);
 await run(['--test','--test-concurrency=1','tests/equipment-spec.integration.test.js','tests/near-recommendations.integration.test.js'],'integration.txt',{TEST_RUNTIME_DATABASE_URL:runtime.url});
}finally{
 try{if(runtime)await runtime.dispose();}finally{
  if(db)await db.end();
  if(created)await admin.query(`DROP DATABASE "${name}"`);
  const after=await state();await writeFile('docs/near-priority-2026-11-01/db-preservation.json',JSON.stringify({temporaryDatabase:name,before,after,metadataUnchanged:JSON.stringify(before)===JSON.stringify(after)},null,2));
  await admin.end();assert.deepEqual(after,before);
 }
}
console.log('PASS: regression, real API recommendations, temporary database/roles removed; existing database/role metadata unchanged');
