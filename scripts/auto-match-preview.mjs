// Local saved-data verification only. No schema changes, provisioning or writes.
import {Pool} from 'pg';
import {compareRegistration} from '../server/auto-matching.js';
const url=new URL(process.env.DATABASE_URL||'http://missing');
if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local PostgreSQL URL required');
const pool=new Pool({connectionString:url.href});
try{
 const c=await pool.connect();
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const workers=(await c.query('SELECT account_id::text AS id,document FROM worker_alpha_registrations')).rows;
  const companies=(await c.query('SELECT organization_id::text AS id,document FROM company_alpha_registrations')).rows;
  const results=[];
  for(const company of companies)for(const line of company.document.lines||[])for(const worker of workers){
   results.push({companyId:company.id,lineId:line.id,workerAccountId:worker.id,...compareRegistration(worker.document,company.document,line.id)});
  }
  const counts=key=>Object.fromEntries([...new Set(results.map(r=>r[key]))].map(value=>[value,results.filter(r=>r[key]===value).length]));
  console.log(JSON.stringify({readOnly:true,workers:workers.length,companies:companies.length,comparisons:results.length,statuses:counts('status'),conditions:counts('conditionStatus'),...(process.argv.includes('--details')?{results}:{})},null,2));
  await c.query('ROLLBACK');
 }finally{c.release();}
}finally{await pool.end();}
