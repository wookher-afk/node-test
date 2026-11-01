import {Pool} from 'pg';import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try{await pool.query('BEGIN READ ONLY');assert.equal((await pool.query('select current_database() name')).rows[0].name,'node_alpha_01_local');
const old=JSON.parse(fs.readFileSync('docs/common-classification-verification-2026-10-31/preview-readonly.json.txt','utf8').split('\n').slice(1).join('\n')).tables.worker_alpha_registrations;
const original=(await pool.query('SELECT to_jsonb(t) AS row FROM (SELECT * FROM worker_alpha_registrations ORDER BY account_id LIMIT $1) t ORDER BY 1',[old.count])).rows;
assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),old.sha256);console.log('PASS all '+old.count+' preexisting registration documents/version/timestamps identical to prior audit snapshot');
const rows=(await pool.query("SELECT document,version FROM worker_alpha_registrations WHERE document->'preferences'->>'regionCodeSystem'='kr-lawd-2026-10-01'")).rows;
const monthly=rows.filter(r=>r.document.preferences.payUnit==='month');assert(monthly.length>=2);
for(const r of monthly){const p=r.document.preferences;assert.deepEqual(p.regionCodes,['11110','41']);assert.equal(p.minimumPayWon,3500000);assert.equal(p.startTime,'09:30');assert.deepEqual(p.availability,{mode:'range',start:'2026-11-03',end:'2026-12-15'});assert([2,3].includes(r.version));}
console.log('PASS real PostgreSQL monthly 350만원=3500000원, region/time/schedule and edit version for '+monthly.length+' synthetic documents');await pool.query('ROLLBACK');}finally{await pool.end();}
