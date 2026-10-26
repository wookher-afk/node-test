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
 for(const name of ['001_foundation.sql','002_accounts.sql','003_unified_matching.sql','004_work_records_and_matching_data.sql','005_review_integrity_fixes.sql']) {
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
 // Keep existing decisions as historical data and verify their authority after upgrade.
 const oldActivity=(await pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date) VALUES($1,'check_in',now(),'party_report',$2,'worker','2030-06-10') RETURNING id",[legacyMatch.m,legacy.w])).rows[0].id;
 const oldAdmin=(await pool.query('INSERT INTO accounts DEFAULT VALUES RETURNING id')).rows[0].id;
 await pool.query("INSERT INTO account_roles VALUES($1,'admin')",[oldAdmin]);
 const oldApproval=(await pool.query("INSERT INTO record_cases(activity_id,raised_by,case_type,reason_code) VALUES($1,$2,'correction','inaccurate') RETURNING id",[oldActivity,legacy.w])).rows[0].id;
 await pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'correction_allowed','legacy-v1')",[oldApproval,oldAdmin]);
 const oldRevocation=(await pool.query("INSERT INTO record_cases(activity_id,raised_by,case_type,reason_code) VALUES($1,$2,'dispute','inaccurate') RETURNING id",[oldActivity,legacy.w])).rows[0].id;
 await pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'record_voided','legacy-v2')",[oldRevocation,oldAdmin]);
 // A non-empty legacy DB requires operator-reviewed attribution, never inference.
 const fifth=await readFile('database/005_review_integrity_fixes.sql','utf8');
 const failedFifth=await pool.connect();
 try {
   await assert.rejects(failedFifth.query(fifth),/Reviewed historical organization mapping/);
   await failedFifth.query('ROLLBACK');
   assert.equal((await failedFifth.query("SELECT to_regclass('public.match_term_parties') AS name")).rows[0].name,null);
 } finally {failedFifth.release();}
 // These fixtures were created above under our control, so their original owner
 // is known. A real deployment must review independent evidence for EVERY term.
 await pool.query(`CREATE TABLE node_reviewed_match_parties(
   terms_id bigint PRIMARY KEY REFERENCES match_terms(id),
   organization_id bigint NOT NULL REFERENCES organizations(id),
   review_reference text NOT NULL)`);
 await pool.query('INSERT INTO node_reviewed_match_parties VALUES($1,$2,$3)',[legacyMatch.t,legacy.org,'test-reviewed-origin']);
 const missingOrder=await pool.connect();
 try {await assert.rejects(missingOrder.query(fifth),/Reviewed historical decision order/);await missingOrder.query('ROLLBACK');}finally{missingOrder.release();}
 await pool.query(`CREATE TABLE node_reviewed_case_decisions(
   case_id bigint PRIMARY KEY REFERENCES case_decisions(case_id),
   decision_order bigint NOT NULL UNIQUE CHECK(decision_order>0),
   review_reference text NOT NULL)`);
 await pool.query('INSERT INTO node_reviewed_case_decisions VALUES($1,1,$3),($2,2,$3)',[oldApproval,oldRevocation,'test-reviewed-decisions']);

 // Deliberately move the current site before migration: only the reviewed mapping
 // can retain the actual historical company. Do not derive it from the new parent.
 const replacementOrg=(await pool.query("INSERT INTO organizations(name) VALUES('이전 받은 업체') RETURNING id")).rows[0].id;
 await pool.query('UPDATE worksites SET organization_id=$1 WHERE id=(SELECT worksite_id FROM job_posts WHERE id=$2)',[replacementOrg,legacy.post]);
 async function fullState(){
   const names=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
   const state={};for(const {tablename} of names)state[tablename]=(await pool.query(`SELECT to_jsonb(t) AS row FROM "${tablename}" t ORDER BY 1`)).rows;
   state.functions=(await pool.query("SELECT p.oid::regprocedure::text AS signature,pg_get_functiondef(p.oid) AS definition,p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'node_%' OR p.proname LIKE 'protect_confirmed_%') ORDER BY 1")).rows;
   state.security={
     schema:(await pool.query("SELECT nspacl::text FROM pg_namespace WHERE nspname='public'")).rows,
     defaults:(await pool.query("SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl ORDER BY 1,2,3")).rows
   };
   return state;
 }
 const beforeFifth=await fullState();
 const badChronology=await pool.connect();
 try {
   await badChronology.query('BEGIN');
   const p=(await badChronology.query("INSERT INTO worker_preference_versions(worker_id,recorded_by,version,pay_unit) VALUES($1,$1,1,'day') RETURNING id",[legacy.w])).rows[0].id;
   await badChronology.query('UPDATE worker_preference_versions SET sealed_at=clock_timestamp() WHERE id=$1',[p]);
   await badChronology.query("INSERT INTO recommendation_impressions(direction,viewer_id,worker_id,job_line_id,preference_id,position,policy_version,shown_at) VALUES('jobs_for_worker',$1,$1,$2,$3,1,'legacy','2000-01-01')",[legacy.w,legacy.line,p]);
   await assert.rejects(badChronology.query(fifth),/Existing recommendation chronology/);
   await badChronology.query('ROLLBACK');
 } finally {await badChronology.query('ROLLBACK');badChronology.release();}
 assert.deepEqual(await fullState(),beforeFifth,'005 must not silently rewrite invalid historical recommendations');

 const lateFailure=await pool.connect();
 try {
   await assert.rejects(lateFailure.query(fifth.replace('COMMIT;','SELECT 1/0;\nCOMMIT;')),/division by zero/);
   await lateFailure.query('ROLLBACK');
 } finally {lateFailure.release();}
 assert.deepEqual(await fullState(),beforeFifth,'005 must roll back snapshots, functions, views and ACL changes');
 await pool.query(fifth);
 // Original values, rows and IDs must remain byte-for-byte identical.
 const afterFifth=await fullState();
 for(const [name,rows] of Object.entries(beforeFifth))if(!['functions','security'].includes(name))assert.deepEqual(afterFifth[name],rows,`005 preserves ${name}`);
 assert.equal((await pool.query('SELECT organization_id FROM match_term_parties WHERE terms_id=$1',[legacyMatch.t])).rows[0].organization_id,legacy.org);
 assert.equal((await pool.query("SELECT node_is_match_party($1,'company',$2) AS allowed",[legacyMatch.t,legacy.manager])).rows[0].allowed,true);
 assert.equal((await pool.query('SELECT node_valid_record_correction($1,$2,NULL) AS valid',[oldApproval,oldActivity])).rows[0].valid,false);
 console.log('PASS: 005 reviewed historical attribution, all original rows preserved and late-failure rollback');


} finally {await pool.end();}
const result=spawnSync(process.execPath,['--test','--test-concurrency=1','tests/account.test.js','tests/matching.test.js','tests/records.test.js','tests/review-fixes.test.js'],{stdio:'inherit',env:process.env});
process.exit(result.status??1);
