// Deliberately no production migration command. This runner resets ONLY an
// explicitly acknowledged local disposable database, then launches Node tests.
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {scryptSync,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pool} from '../tests/helpers/database.js';
import {fixture,match,approve,confirm,cancel} from '../tests/helpers/matching.js';
try {
 // Also verify a completely fresh install, without pre-existing account rows.
 await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 for(const name of ['001_foundation.sql','002_accounts.sql','003_unified_matching.sql','004_work_records_and_matching_data.sql']) {
   await pool.query(await readFile('database/'+name,'utf8'));
 }
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM accounts")).rows[0].n,0);
 console.log('PASS: fresh database installation');
 await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 await pool.query(await readFile('database/001_foundation.sql','utf8'));
 // Preserve the original baseline regression on its original schema.
 const smoke=(await readFile('database/001_smoke_test.sql','utf8')).replace(/^\\set.*$/mg,'');
 await pool.query(smoke);
 await pool.query(await readFile('database/002_accounts.sql','utf8'));
 const hash='migration-salt:'+scryptSync('migration-password-123','migration-salt',64).toString('hex');
 const account=(await pool.query("INSERT INTO accounts(email,password_hash,display_name) VALUES('migration@example.com',$1,'보존 작업자') RETURNING id",[hash])).rows[0].id;
 await pool.query("INSERT INTO account_roles VALUES($1,'worker'),($1,'company')",[account]);
 await pool.query('INSERT INTO worker_profiles VALUES($1,84)',[account]);
 const org=(await pool.query("INSERT INTO organizations(name) VALUES('보존 업체') RETURNING id")).rows[0].id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'owner')",[org,account]);
 await pool.query("INSERT INTO account_sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",[account,createHash('sha256').update('a'.repeat(64)).digest('hex')]);
 const tables=['accounts','account_roles','worker_profiles','organizations','organization_memberships','account_sessions'];
 async function snapshot(){const out={};for(const t of tables)out[t]=(await pool.query(`SELECT * FROM ${t} ORDER BY 1,2`)).rows;return out;}
 const before=await snapshot();
 const migration=await readFile('database/003_unified_matching.sql','utf8');
 // Refuse unknown historical matching data, and roll the entire migration back.
 const c=await pool.connect();
 try {
   await c.query('CREATE TABLE users(id uuid)');
   await assert.rejects(c.query(migration),/Legacy UUID schema/);
   await c.query('ROLLBACK');
   await c.query('DROP TABLE users');
   assert.equal((await c.query("SELECT to_regclass('public.match_events') AS name")).rows[0].name,null);
 } finally {c.release();}
 // Existing pending matching data is preserved when preflight refuses upgrade.
 await pool.query(`
   WITH cat AS (INSERT INTO occupation_categories(name) VALUES('preflight') RETURNING id),
   occ AS (INSERT INTO occupations(category_id,name) SELECT id,'test' FROM cat RETURNING id),
   site AS (INSERT INTO worksites(organization_id,name) VALUES(${org},'preflight') RETURNING id),
   post AS (INSERT INTO job_posts(worksite_id) SELECT id FROM site RETURNING id),
   line AS (INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw)
     SELECT post.id,occ.id,'worker',1 FROM post,occ RETURNING id),
   terms AS (INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash)
     SELECT id,${account},1,'{}','preflight' FROM line RETURNING id)
   INSERT INTO matches(terms_id) SELECT id FROM terms`);
 const preflight=await pool.connect();
 try {
   await assert.rejects(preflight.query(migration),/Existing matching records/);
   await preflight.query('ROLLBACK');
   assert.equal((await preflight.query('SELECT count(*)::int AS n FROM matches')).rows[0].n,1);
   assert.equal((await preflight.query("SELECT to_regclass('public.match_events') AS name")).rows[0].name,null);
   for(const t of ['matches','match_terms','job_lines','job_posts','worksites','occupations','occupation_categories']) await preflight.query(`DELETE FROM ${t}`);
 } finally {preflight.release();}
 // Simulate a DDL failure halfway through 003, after new objects were created.
 const failedDdl=await pool.connect();
 try {
   await failedDdl.query('CREATE FUNCTION node_work_period(date) RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$');
   await assert.rejects(failedDdl.query(migration),/already exists/);
   await failedDdl.query('ROLLBACK');
   assert.equal((await failedDdl.query("SELECT to_regclass('public.match_events') AS name")).rows[0].name,null);
   assert.equal((await failedDdl.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='cancelled_by'")).rows[0].n,0);
   assert.equal((await failedDdl.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='matches'::regclass AND tgname='check_match_confirmation'")).rows[0].n,1);
   await failedDdl.query('DROP FUNCTION node_work_period(date)');
 } finally {failedDdl.release();}
 await pool.query(migration);
 assert.deepEqual(await snapshot(),before,'upgrade must preserve existing account/profile/company/session rows byte for byte');
 assert.equal((await pool.query("SELECT to_regclass('public.users') AS name")).rows[0].name,null);
 console.log('PASS: original SQL smoke + additive migration + existing data preservation + failed-migration rollback');
 // Upgrade 004 with actual pre-existing 003 transactions; preserve every original row.
 const legacy=await fixture(),legacyMatch=await match(legacy);
 await approve(legacy,legacyMatch);await confirm(legacyMatch);await cancel(legacyMatch,legacy.w);
 const oldObligation=(await pool.query("INSERT INTO payment_obligations(match_id,amount_krw,due_date,payer_organization_id) VALUES($1,250000,'2030-06-15',$2) RETURNING id",[legacyMatch.m,legacy.org])).rows[0].id;
 const oldClaim=(await pool.query('INSERT INTO payment_claims(obligation_id,amount_krw) VALUES($1,100000) RETURNING id',[oldObligation])).rows[0].id;
 await pool.query('INSERT INTO receipt_confirmations(claim_id,confirmed_by) VALUES($1,$2)',[oldClaim,legacy.w]);

 const oldTables=[...tables,'matches','match_terms','match_dates','match_approvals','match_events',
   'resource_reservations','applications','payment_obligations','payment_claims','receipt_confirmations'];
 async function originalRows(){const out={};for(const t of oldTables)out[t]=(await pool.query(`SELECT * FROM ${t} ORDER BY 1,2`)).rows;return out;}
 const original=await originalRows();
 const fourth=await readFile('database/004_work_records_and_matching_data.sql','utf8');
 const failedFourth=await pool.connect();
 try {
   await failedFourth.query('CREATE VIEW trust_evidence_coverage AS SELECT 1 AS stub');
   await assert.rejects(failedFourth.query(fourth),/already exists/);
   await failedFourth.query('ROLLBACK');
   assert.equal((await failedFourth.query("SELECT to_regclass('public.activity_records') AS name")).rows[0].name,null);
   await failedFourth.query('DROP VIEW trust_evidence_coverage');
 } finally {failedFourth.release();}
 assert.deepEqual(await originalRows(),original,'004 failure must roll back triggers and backfills');
 await pool.query(fourth);
 assert.deepEqual(await originalRows(),original,'004 must preserve existing membership, matching and payment data');
 const captured=(await pool.query('SELECT r.occurred_at=e.created_at AS exact FROM activity_records r JOIN match_events e ON e.id=r.source_match_event_id WHERE r.match_id=$1',[legacyMatch.m])).rows;
 assert.equal(captured.length,2);assert.ok(captured.every(r=>r.exact));
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM activity_records WHERE kind IN ('check_in','payment_receipt')")).rows[0].n,0,'never invent historical attendance or payment');
 console.log('PASS: 004 preserves existing transactions and backfills only exact lifecycle events');

} finally {await pool.end();}
const result=spawnSync(process.execPath,['--test','--test-concurrency=1','tests/account.test.js','tests/matching.test.js','tests/records.test.js'],{stdio:'inherit',env:process.env});
process.exit(result.status??1);
