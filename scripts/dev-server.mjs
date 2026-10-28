// Local-only launcher; refuses production/remote URLs before opening a connection.
import {Pool} from 'pg';
import {spawn} from 'node:child_process';
import {testDatabaseUrl} from './lib/test-database.mjs';
import {provisionTestRuntime} from './lib/test-runtime-role.mjs';
import {provisionWorksiteRuntime} from './lib/test-worksite-role.mjs';
import {provisionJobPostRuntime} from './lib/test-job-post-role.mjs';
const pool=new Pool({connectionString:testDatabaseUrl()});
let runtime,worksiteRuntime,jobRuntime;
try {
 runtime=await provisionTestRuntime(pool);
 worksiteRuntime=await provisionWorksiteRuntime(pool);
 jobRuntime=await provisionJobPostRuntime(pool);
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtime.url,WORKSITE_DATABASE_URL:worksiteRuntime.url,JOB_POST_DATABASE_URL:jobRuntime.url},stdio:'inherit'});
 const stop=()=>child.kill('SIGTERM');
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 const code=await new Promise((resolve,reject)=>{child.once('exit',code=>resolve(code??0));child.once('error',reject);});
 process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
 process.exitCode=code;
} finally {try{await jobRuntime?.dispose();}finally{try{await worksiteRuntime?.dispose();}finally{try{await runtime?.dispose();}finally{await pool.end();}}}}
