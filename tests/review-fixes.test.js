import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {pool,one} from './helpers/database.js';
import {fixture,match,approve,confirm,cancel} from './helpers/matching.js';
after(()=>pool.end());
async function setup(){const f=await fixture(),a=await match(f);await approve(f,a);await confirm(a);return {f,a};}
async function admin(){const id=(await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;await pool.query("INSERT INTO account_roles VALUES($1,'admin')",[id]);return id;}
async function record(f,a){return (await one("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date) VALUES($1,'check_in',now(),'party_report',$2,'worker','2030-06-10') RETURNING id",[a.m,f.w])).id;}
async function review(f,a){await pool.query("UPDATE matches SET status='completed' WHERE id=$1",[a.m]);return (await one("INSERT INTO transaction_reviews(match_id,reviewer_party,author_id,version,would_work_again) VALUES($1,'worker',$2,1,'yes') RETURNING id",[a.m,f.w])).id;}
async function openCase(client,kind,id,who){return (await client.query(`INSERT INTO record_cases(${kind==='activity'?'activity_id':'review_id'},raised_by,case_type,reason_code) VALUES($1,$2,'correction','inaccurate') RETURNING id`,[id,who])).rows[0].id;}
async function decide(client,c,who,outcome,time=null){await client.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version,decided_at) VALUES($1,$2,$3,'review-fix-v1',coalesce($4::timestamptz,clock_timestamp()))",[c,who,outcome,time]);}
function replacement(client,kind,f,a,id,c){return kind==='activity'
 ?client.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date,supersedes_id,correction_case_id) VALUES($1,'check_in',now(),'party_report',$2,'worker','2030-06-10',$3,$4)",[a.m,f.w,id,c])
 :client.query("INSERT INTO transaction_reviews(match_id,reviewer_party,author_id,version,would_work_again,supersedes_id,correction_case_id) VALUES($1,'worker',$2,2,'no',$3,$4)",[a.m,f.w,id,c]);}
const state=(kind,id)=>one(`SELECT ${kind==='activity'?'evidence_state':'review_state'} AS state FROM ${kind==='activity'?'effective_activity_records':'effective_transaction_reviews'} WHERE id=$1`,[id]);

for(const move of ['site_organization','post_worksite','line_post'])test(`P1 historical ownership, access and rehire survive ${move} change`,async()=>{
 const {f,a}=await setup();await pool.query("UPDATE matches SET status='completed' WHERE id=$1",[a.m]);
 const originalCoverage=await one("SELECT * FROM trust_evidence_coverage WHERE subject_type='company' AND subject_id=$1",[f.org]);
 const other=await fixture({worker:f.w});
 if(move==='site_organization')await pool.query('UPDATE worksites SET organization_id=$1 WHERE id=(SELECT worksite_id FROM job_posts WHERE id=$2)',[other.org,f.post]);
 if(move==='post_worksite')await pool.query('UPDATE job_posts SET worksite_id=(SELECT worksite_id FROM job_posts WHERE id=$1) WHERE id=$2',[other.post,f.post]);
 if(move==='line_post')await pool.query('UPDATE job_lines SET job_post_id=$1 WHERE id=$2',[other.post,f.line]);
 assert.equal((await one('SELECT organization_id FROM match_term_parties WHERE terms_id=$1',[a.t])).organization_id,f.org);
 assert.equal((await one("SELECT node_is_match_party($1,'company',$2) AS allowed",[a.t,f.manager])).allowed,true);
 assert.equal((await one("SELECT node_is_match_party($1,'company',$2) AS allowed",[a.t,other.manager])).allowed,false);
 const observation=await record(f,a);
 await assert.rejects(pool.query("INSERT INTO activity_confirmations(activity_id,confirmed_by,confirming_party) VALUES($1,$2,'company')",[observation,other.manager]),/Independent counterparty/);
 await pool.query("INSERT INTO activity_confirmations(activity_id,confirmed_by,confirming_party) VALUES($1,$2,'company')",[observation,f.manager]);
 // Newly added evidence remains attributed to the original company, not the buyer.
 assert.equal((await one("SELECT observed_transactions FROM trust_evidence_coverage WHERE subject_type='company' AND subject_id=$1",[other.org])).observed_transactions,'0');
 assert.equal((await one("SELECT observed_transactions FROM trust_evidence_coverage WHERE subject_type='company' AND subject_id=$1",[f.org])).observed_transactions,originalCoverage.observed_transactions);
 const newCompanyMatch=await match(other,{days:['2030-06-11']});await approve(other,newCompanyMatch);await confirm(newCompanyMatch);
 assert.equal((await one("SELECT count(*)::int AS n FROM activity_records WHERE match_id=$1 AND kind='rehired'",[newCompanyMatch.m])).n,0,'new site owner must not inherit old-company work');
 // A different current site genuinely owned by the original company still rehires.
 const same=await fixture({worker:f.w,owner:f.manager});
 await pool.query('UPDATE worksites SET organization_id=$1 WHERE id=(SELECT worksite_id FROM job_posts WHERE id=$2)',[f.org,same.post]);
 await pool.query("INSERT INTO job_line_dates VALUES($1,'2030-06-12',1)",[same.line]);
 const returning=await match(same,{days:['2030-06-12']});await approve(same,returning);await confirm(returning);
 assert.equal((await one("SELECT related_match_id FROM activity_records WHERE match_id=$1 AND kind='rehired'",[returning.m])).related_match_id,a.m);
 await assert.rejects(pool.query('UPDATE match_term_parties SET organization_id=$1 WHERE terms_id=$2',[other.org,a.t]),/immutable/);
});

test('P1 pending approvals and cancellation keep the original company after a site transfer',async()=>{
 const f=await fixture(),a=await match(f),other=await fixture();
 await pool.query('UPDATE worksites SET organization_id=$1 WHERE id=(SELECT worksite_id FROM job_posts WHERE id=$2)',[other.org,f.post]);
 await assert.rejects(pool.query("SELECT node_approve_match($1,$2,'company',$3)",[a.m,a.t,other.manager]),/not authorized/);
 await approve(f,a);await confirm(a);
 await assert.rejects(cancel(a,other.manager),/not authorized/);await cancel(a,f.manager);
});

for(const kind of ['activity','review'])test(`P2 ${kind}: revoked correction approval cannot be replayed; dismissal retains void`,async()=>{
 const {f,a}=await setup(),who=await admin();const id=kind==='activity'?await record(f,a):await review(f,a);
 const approved=await openCase(pool,kind,id,f.w);await decide(pool,approved,who,'correction_allowed','2099-01-01');
 const revoked=await openCase(pool,kind,id,f.w);await decide(pool,revoked,who,'record_voided','2000-01-01');
 assert.equal((await state(kind,id)).state,'voided','server decision order overrides supplied wall clock');
 await assert.rejects(replacement(pool,kind,f,a,id,approved),/approved correction/);
 const appeal=await openCase(pool,kind,id,f.w);assert.equal((await state(kind,id)).state,'disputed');
 await decide(pool,appeal,who,'dismissed');assert.equal((await state(kind,id)).state,'voided');
 await assert.rejects(replacement(pool,kind,f,a,id,approved),/approved correction/);
 const fresh=await openCase(pool,kind,id,f.w);await decide(pool,fresh,who,'correction_allowed');
 await assert.rejects(replacement(pool,kind,f,a,id,approved),/approved correction/);
 await replacement(pool,kind,f,a,id,fresh);assert.equal((await state(kind,id)).state,'superseded');
});

async function waitForLock(pid){for(let i=0;i<100;i++){const r=await one('SELECT wait_event FROM pg_stat_activity WHERE pid=$1',[pid]);if(r?.wait_event==='advisory')return;await new Promise(r=>setTimeout(r,10));}assert.fail('second PostgreSQL session never contended on the record lock');}
for(const kind of ['activity','review'])for(const first of ['revocation','replacement'])test(`P2 ${kind}: concurrent ${first} serializes with the other operation`,async()=>{
 const {f,a}=await setup(),who=await admin(),id=kind==='activity'?await record(f,a):await review(f,a);
 const approved=await openCase(pool,kind,id,f.w);await decide(pool,approved,who,'correction_allowed');
 const c1=await pool.connect(),c2=await pool.connect();
 try {
   await c1.query('BEGIN');await c2.query('BEGIN');await c1.query("SET LOCAL lock_timeout='5s'");await c2.query("SET LOCAL lock_timeout='5s'");
   if(first==='revocation') {const c=await openCase(c1,kind,id,f.w);await decide(c1,c,who,'record_voided');}
   else await replacement(c1,kind,f,a,id,approved);
   const pid=(await c2.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   const pending=(first==='revocation'?replacement(c2,kind,f,a,id,approved):(async()=>{const c=await openCase(c2,kind,id,f.w);await decide(c2,c,who,'record_voided');})()).then(()=>null,e=>e);
   await waitForLock(pid);await c1.query('COMMIT');const error=await pending;
   if(first==='revocation') {assert.match(error?.message||'',/approved correction/);await c2.query('ROLLBACK');assert.equal((await state(kind,id)).state,'voided');}
   else {assert.equal(error,null);await c2.query('COMMIT');assert.equal((await state(kind,id)).state,'superseded');}
 } finally {await c1.query('ROLLBACK');await c2.query('ROLLBACK');c1.release();c2.release();}
});

test('P2 stale-snapshot isolation is rejected for record writes',async()=>{
 const {f,a}=await setup(),id=await record(f,a);const c=await pool.connect();
 try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await assert.rejects(openCase(c,'activity',id,f.w),/READ COMMITTED/);}finally{await c.query('ROLLBACK');c.release();}
});

async function snapshots(f){
 const p=(await one("INSERT INTO worker_preference_versions(worker_id,recorded_by,version,pay_unit,created_at) VALUES($1,$1,1,'day','2000-01-01') RETURNING *",[f.w]));
 const occ=(await one('SELECT occupation_id FROM job_lines WHERE id=$1',[f.line])).occupation_id;
 const h=(await one("INSERT INTO hiring_condition_versions(job_line_id,version,recorded_by,occupation_id,daily_pay_krw,resource_mode,allow_partial,created_at) VALUES($1,1,$2,$3,250000,'worker',true,'2000-01-01') RETURNING *",[f.line,f.manager,occ]));
 await pool.query("UPDATE worker_preference_versions SET sealed_at='2000-01-01' WHERE id=$1",[p.id]);await pool.query("UPDATE hiring_condition_versions SET sealed_at='2000-01-01' WHERE id=$1",[h.id]);return {p,h};
}
for(const part of ['preference','condition'])test(`P2 ${part} created after exposure/cutoff cannot be used by an older recommendation`,async()=>{
 const f=await fixture();const exposure=(await one('SELECT clock_timestamp()::text AS t')).t;
 const {p,h}=await snapshots(f);
 assert.ok(new Date(p.created_at).getUTCFullYear()>2000);assert.ok(new Date(h.created_at).getUTCFullYear()>2000);
 const values=[f.w,f.line,part==='preference'?p.id:null,part==='condition'?h.id:null];
 const sql="INSERT INTO recommendation_impressions(direction,viewer_id,worker_id,job_line_id,preference_id,condition_id,position,policy_version,shown_at,feature_cutoff_at) VALUES('jobs_for_worker',$1,$1,$2,$3,$4,1,'rules-review-v1',$5,$6)";
 await assert.rejects(pool.query(sql,[...values,exposure,null]),/not available/);
 const now=(await one('SELECT clock_timestamp()::text AS t')).t;
 await assert.rejects(pool.query(sql,[...values,now,exposure]),/not available/);
 await pool.query(sql,[...values,now,null]);
});

test('P2 snapshot sealed after exposure is also unavailable, even when created earlier',async()=>{
 const f=await fixture();const p=(await one("INSERT INTO worker_preference_versions(worker_id,recorded_by,version,pay_unit) VALUES($1,$1,1,'day') RETURNING id",[f.w])).id;
 const shown=(await one('SELECT clock_timestamp()::text AS t')).t;
 await pool.query('UPDATE worker_preference_versions SET sealed_at=clock_timestamp() WHERE id=$1',[p]);
 await assert.rejects(pool.query("INSERT INTO recommendation_impressions(direction,viewer_id,worker_id,job_line_id,preference_id,position,policy_version,shown_at) VALUES('jobs_for_worker',$1,$1,$2,$3,1,'v1',$4)",[f.w,f.line,p,shown]),/not available/);
});

test('least privilege: PUBLIC cannot execute NODE helpers or create schema objects',async()=>{
 const functions=await pool.query("SELECT p.oid::regprocedure::text AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='public' AND (p.proname LIKE 'node_%' OR p.proname LIKE 'protect_confirmed_%') AND a.grantee=0 AND a.privilege_type='EXECUTE'");
 assert.deepEqual(functions.rows,[]);
 const c=await pool.connect();
 try {
   await c.query('BEGIN');await c.query('CREATE ROLE node_review_probe NOLOGIN');await c.query('GRANT USAGE ON SCHEMA public TO node_review_probe');await c.query('SET LOCAL ROLE node_review_probe');
   await assert.rejects(c.query('SELECT node_term_organization(1)'),/permission denied/);
 } finally {await c.query('ROLLBACK');c.release();}
 const schema=await one("SELECT count(*)::int AS n FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE'");assert.equal(schema.n,0);
});
