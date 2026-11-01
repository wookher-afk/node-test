import {Pool} from 'pg';
import {createHash} from 'node:crypto';
import {writeFile,readFile} from 'node:fs/promises';
const p=new Pool({connectionString:'postgresql://heowook@127.0.0.1:5432/node_alpha_01_local'});
const file='docs/company-groups-2026-11-01/before-db.json';
try{
 await p.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const tables=(await p.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);
 const snapshot={};
 for(const table of tables){const rows=(await p.query(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY 1`)).rows.map(x=>x.row);snapshot[table]=rows.map(row=>({id:JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k])=>['id','account_id','organization_id','role','token_hash','work_date','version','job_line_id','job_post_id','terms_id','worker_id','equipment_id','option_code','occupation_id','region_id'].includes(k)))),hash:createHash('sha256').update(JSON.stringify(row)).digest('hex')}));}
 await p.query('ROLLBACK');
 if(process.argv.includes('--before')){await writeFile(file,JSON.stringify(snapshot,null,2));console.log('Saved row hashes for '+tables.length+' existing tables');}
 else {const before=JSON.parse(await readFile(file,'utf8'));let n=0;for(const [t,rows] of Object.entries(before))for(const row of rows){if(!snapshot[t].some(x=>x.id===row.id&&x.hash===row.hash))throw Error('Existing row changed: '+t);n++;}console.log('PASS all '+n+' original rows in '+Object.keys(before).length+' tables preserved');}
}finally{await p.end();}
