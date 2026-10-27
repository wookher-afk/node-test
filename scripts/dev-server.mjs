// Local-only launcher; refuses production/remote URLs before opening a connection.
import {Pool} from 'pg';
import {spawn} from 'node:child_process';
import {testDatabaseUrl} from './lib/test-database.mjs';
import {provisionTestRuntime} from './lib/test-runtime-role.mjs';
const pool=new Pool({connectionString:testDatabaseUrl()});
let runtime;
try {
 runtime=await provisionTestRuntime(pool);
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtime.url},stdio:'inherit'});
 const stop=()=>child.kill('SIGTERM');
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 const code=await new Promise((resolve,reject)=>{child.once('exit',code=>resolve(code??0));child.once('error',reject);});
 process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
 process.exitCode=code;
} finally {try{await runtime?.dispose();}finally{await pool.end();}}
