import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {pool,one} from './helpers/database.js';
import {fixture,match,approve,confirm,cancel} from './helpers/matching.js';
after(()=>pool.end());
async function confirmed(f=undefined){f??=await fixture();const a=await match(f);await approve(f,a);await confirm(a);return {f,a};}
async function observation(f,a,kind='check_in'){
 return (await one("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date) VALUES($1,$2,'2030-06-10 08:00+09','party_report',$3,'worker','2030-06-10') RETURNING id",[a.m,kind,f.w])).id;
}
async function moderator(){const id=(await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;await pool.query("INSERT INTO account_roles VALUES($1,'admin')",[id]);return id;}

test('newcomers have no history and no trust score; preferences and impressions do not create trust evidence',async()=>{
 const f=await fixture();
 const row=await one("SELECT * FROM trust_evidence_coverage WHERE subject_type='worker' AND subject_id=$1",[f.w]);
 assert.equal(row.observed_transactions,'0');assert.equal(row.history_status,'no_history');assert.equal(row.trust_assessment_state,'not_assessed');
 assert.ok(!Object.keys(row).some(k=>k.includes('score')));
 assert.equal((await one("SELECT history_status FROM trust_evidence_coverage WHERE subject_type='company' AND subject_id=$1",[f.org])).history_status,'no_history');
 await pool.query("INSERT INTO recommendation_impressions(direction,viewer_id,worker_id,job_line_id,position,policy_version,shown_at) VALUES('jobs_for_worker',$1,$1,$2,1,'rules-v1',now())",[f.w,f.line]);
 assert.equal((await one("SELECT observation_count FROM trust_evidence_coverage WHERE subject_type='worker' AND subject_id=$1",[f.w])).observation_count,'0');
});

test('attendance stores report vs independent confirmation; identity, date and duplicate protections',async()=>{
 const {f,a}=await confirmed();const id=await observation(f,a);
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[id])).evidence_state,'reported');
 await assert.rejects(pool.query("INSERT INTO activity_confirmations VALUES($1,$2,'worker',now())",[id,f.w]),/Independent counterparty/);
 await pool.query("INSERT INTO activity_confirmations(activity_id,confirmed_by,confirming_party) VALUES($1,$2,'company')",[id,f.manager]);
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[id])).evidence_state,'confirmed');
 const outsider=(await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 await assert.rejects(observation({...f,w:outsider},a),/not the stated/);
 await assert.rejects(pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date) VALUES($1,'check_in',now(),'party_report',$2,'worker','2030-07-01')",[a.m,f.w]),/outside the match/);
 const key=crypto.randomUUID();
 const sql="INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date,request_id) VALUES($1,'check_out',now(),'party_report',$2,'worker','2030-06-10',$3)";
 await pool.query(sql,[a.m,f.w,key]);await assert.rejects(pool.query(sql,[a.m,f.w,key]),/unique constraint/);
 await assert.rejects(pool.query('UPDATE activity_records SET occurred_at=now() WHERE id=$1',[id]),/immutable/);
});

test('disputes and approved corrections retain originals and invalidate superseded evidence',async()=>{
 const {f,a}=await confirmed();const id=await observation(f,a);
 const dispute=(await one("INSERT INTO record_cases(activity_id,raised_by,case_type,reason_code) VALUES($1,$2,'correction','inaccurate') RETURNING id",[id,f.w])).id;
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[id])).evidence_state,'disputed');
 await assert.rejects(pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'correction_allowed','review-v1')",[dispute,f.manager]),/cannot moderate/);
 const admin=await moderator();
 await pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'correction_allowed','review-v1')",[dispute,admin]);
 const replacement=(await one("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date,supersedes_id,correction_case_id) VALUES($1,'check_in','2030-06-10 08:30+09','party_report',$2,'worker','2030-06-10',$3,$4) RETURNING id",[a.m,f.w,id,dispute])).id;
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[id])).evidence_state,'superseded');
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[replacement])).evidence_state,'reported');
 assert.equal((await one('SELECT count(*)::int AS n FROM activity_records WHERE id=ANY($1::bigint[])',[[id,replacement]])).n,2);
 await assert.rejects(pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date,supersedes_id,correction_case_id) VALUES($1,'check_in',now(),'party_report',$2,'worker','2030-06-10',$3,$4)",[a.m,f.w,replacement,dispute]),/approved correction/);
});

test('payment report, receipt, due-date history and delay inputs are independent facts',async()=>{
 const {f,a}=await confirmed();
 const obligation=(await one("INSERT INTO payment_obligations(match_id,amount_krw,due_date,payer_organization_id) VALUES($1,250000,'2030-06-15',$2) RETURNING id",[a.m,f.org])).id;
 const claim=(await one("INSERT INTO payment_claims(obligation_id,amount_krw,paid_at) VALUES($1,100000,'2030-06-17 12:00+09') RETURNING id",[obligation])).id;
 const report=(await one("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,payment_obligation_id,payment_claim_id,amount_krw) VALUES($1,'payment_report','2030-06-17 12:00+09','party_report',$2,'company',$3,$4,100000) RETURNING *",[a.m,f.manager,obligation,claim]));
 assert.equal(report.due_date_snapshot.toISOString().slice(0,10),'2030-06-15');
 assert.equal((await one("SELECT count(*)::int AS n FROM activity_records WHERE match_id=$1 AND kind='payment_receipt'",[a.m])).n,0);
 await assert.rejects(pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,payment_obligation_id,amount_krw) VALUES($1,'payment_receipt',now(),'party_report',$2,'company',$3,100000)",[a.m,f.manager,obligation]),/respective party/);
 await pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,payment_obligation_id,payment_claim_id,amount_krw) VALUES($1,'payment_receipt','2030-06-17 13:00+09','party_report',$2,'worker',$3,$4,100000)",[a.m,f.w,obligation,claim]);
 await pool.query("UPDATE payment_obligations SET due_date='2030-06-20' WHERE id=$1",[obligation]);
 assert.equal((await one('SELECT count(*)::int AS n FROM payment_due_date_history WHERE obligation_id=$1',[obligation])).n,2);
 assert.equal((await one('SELECT due_date_snapshot FROM activity_records WHERE id=$1',[report.id])).due_date_snapshot.toISOString().slice(0,10),'2030-06-15');
 const other=await confirmed();
 await assert.rejects(pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,payment_obligation_id,amount_krw) VALUES($1,'payment_receipt',now(),'party_report',$2,'worker',$3,100000)",[other.a.m,other.f.w,obligation]),/another match/);
});

test('mutual subjective reviews and willingness can be disputed and revised without affecting factual history',async()=>{
 const {f,a}=await confirmed();await pool.query("UPDATE matches SET status='completed' WHERE id=$1",[a.m]);
 const review=(await one("INSERT INTO transaction_reviews(match_id,reviewer_party,author_id,version,communication_rating,agreement_rating,would_work_again) VALUES($1,'worker',$2,1,3,4,'undecided') RETURNING id",[a.m,f.w])).id;
 await pool.query("INSERT INTO transaction_reviews(match_id,reviewer_party,author_id,version,would_work_again) VALUES($1,'company',$2,1,'yes')",[a.m,f.manager]);
 const before=await one("SELECT * FROM trust_evidence_coverage WHERE subject_type='worker' AND subject_id=$1",[f.w]);
 const dispute=(await one("INSERT INTO record_cases(review_id,raised_by,case_type,reason_code) VALUES($1,$2,'correction','inaccurate') RETURNING id",[review,f.w])).id;
 const admin=await moderator();await pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'correction_allowed','review-v1')",[dispute,admin]);
 await pool.query("INSERT INTO transaction_reviews(match_id,reviewer_party,author_id,version,would_work_again,supersedes_id,correction_case_id) VALUES($1,'worker',$2,2,'yes',$3,$4)",[a.m,f.w,review,dispute]);
 assert.equal((await one('SELECT review_state FROM effective_transaction_reviews WHERE id=$1',[review])).review_state,'superseded');
 assert.deepEqual(await one("SELECT * FROM trust_evidence_coverage WHERE subject_type='worker' AND subject_id=$1",[f.w]),before);
 await assert.rejects(pool.query('DELETE FROM transaction_reviews WHERE id=$1',[review]),/immutable/);
});

test('sealed multi-occupation and region preferences / hiring conditions preserve recommendation context',async()=>{
 const f=await fixture(),g=await fixture();
 const occ=(await one('SELECT occupation_id FROM job_lines WHERE id=$1',[f.line])).occupation_id;
 const region=(await one("INSERT INTO regions(name) VALUES('가상 시군구') RETURNING id")).id;
 const pref=(await one("INSERT INTO worker_preference_versions(worker_id,recorded_by,version,min_pay_krw,pay_unit,preferred_weekdays) VALUES($1,$1,1,200000,'day',ARRAY[1,2,3]::smallint[]) RETURNING id",[f.w])).id;
 await pool.query('INSERT INTO worker_preference_occupations VALUES($1,$2)',[pref,occ]);await pool.query('INSERT INTO worker_preference_regions VALUES($1,$2)',[pref,region]);
 const conditions=(await one("INSERT INTO hiring_condition_versions(job_line_id,version,recorded_by,occupation_id,region_id,daily_pay_krw,min_experience_months,resource_mode,allow_partial) VALUES($1,1,$2,$3,$4,250000,12,'worker',true) RETURNING id",[f.line,f.manager,occ,region])).id;
 await pool.query("INSERT INTO hiring_condition_dates VALUES($1,'2030-06-10',1)",[conditions]);
 const impression="INSERT INTO recommendation_impressions(direction,viewer_id,worker_id,job_line_id,preference_id,condition_id,position,policy_version,shown_at) VALUES('jobs_for_worker',$1,$1,$2,$3,$4,1,'rules-v1',now()) RETURNING id";
 await assert.rejects(pool.query(impression,[f.w,f.line,pref,conditions]),/sealed/);
 await pool.query('UPDATE worker_preference_versions SET sealed_at=clock_timestamp() WHERE id=$1',[pref]);await pool.query('UPDATE hiring_condition_versions SET sealed_at=clock_timestamp() WHERE id=$1',[conditions]);
 const shown=(await one(impression,[f.w,f.line,pref,conditions])).id;
 await assert.rejects(pool.query('INSERT INTO worker_preference_regions VALUES($1,$2)',[pref,region]),/Sealed snapshot/);
 await assert.rejects(pool.query('UPDATE worker_preference_versions SET min_pay_krw=1 WHERE id=$1',[pref]),/sealed once/);
 await assert.rejects(pool.query(impression,[g.w,f.line,pref,conditions]),/belong to worker/);
 await pool.query("INSERT INTO recommendation_outcomes(impression_id,worker_id,job_line_id,kind,actor_id,source,occurred_at) VALUES($1,$2,$3,'viewed',$2,'client',now())",[shown,f.w,f.line]);
 await pool.query("INSERT INTO recommendation_impressions(direction,viewer_id,worker_id,job_line_id,position,policy_version,shown_at) VALUES('workers_for_company',$1,$2,$3,1,'rules-v1',now())",[f.manager,f.w,f.line]);
 assert.equal((await one("SELECT history_status FROM trust_evidence_coverage WHERE subject_type='worker' AND subject_id=$1",[f.w])).history_status,'no_history');
});

test('supporting history captures application transitions, condition changes, matching and cancellations',async()=>{
 const f=await fixture();const a=await match(f);
 const application=(await one('INSERT INTO applications(job_line_id,worker_id) VALUES($1,$2) RETURNING id',[f.line,f.w])).id;
 await pool.query("UPDATE applications SET status='selected' WHERE id=$1",[application]);
 await pool.query("UPDATE applications SET status='rejected' WHERE id=$1",[application]);
 assert.deepEqual((await pool.query('SELECT kind FROM recommendation_outcomes WHERE application_id=$1 ORDER BY id',[application])).rows.map(r=>r.kind),['applied','selected','rejected']);
 const t=(await one("INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash) VALUES($1,$2,2,'{\"pay\":260000}','v2') RETURNING id",[f.line,f.w])).id;
 await pool.query("INSERT INTO match_dates VALUES($1,'2030-06-10')",[t]);
 const b={m:(await one('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[t])).id,t,worker:f.w};
 assert.equal((await one("SELECT previous_terms_id FROM activity_records WHERE match_id=$1 AND kind='conditions_change'",[b.m])).previous_terms_id,a.t);
 await approve(f,b);await confirm(b);await cancel(b,f.manager);
 assert.deepEqual((await pool.query('SELECT kind FROM recommendation_outcomes WHERE match_id=$1 ORDER BY id',[b.m])).rows.map(r=>r.kind),['matched','cancelled']);
 assert.equal((await one("SELECT count(*)::int AS n FROM activity_records WHERE match_id=$1 AND kind='match_cancelled'",[b.m])).n,1);
 assert.equal((await one("SELECT trust_assessment_state FROM trust_evidence_coverage WHERE subject_type='worker' AND subject_id=$1",[f.w])).trust_assessment_state,'not_assessed');
});

test('rehire links prior completed work without treating absent rehire as negative feedback',async()=>{
 const {f,a}=await confirmed();await pool.query("UPDATE matches SET status='completed' WHERE id=$1",[a.m]);
 const t=(await one("INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash) VALUES($1,$2,2,'{}','rehire') RETURNING id",[f.line,f.w])).id;
 await pool.query("INSERT INTO match_dates VALUES($1,'2030-06-11')",[t]);
 const b={m:(await one('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[t])).id,t,worker:f.w};
 await approve(f,b);await confirm(b);
 assert.equal((await one("SELECT related_match_id FROM activity_records WHERE match_id=$1 AND kind='rehired'",[b.m])).related_match_id,a.m);
});

test('learning permission is explicit, separately authorized and withdrawable; no default consent',async()=>{
 const f=await fixture();assert.equal((await one('SELECT count(*)::int AS n FROM current_learning_permissions WHERE account_id=$1',[f.w])).n,0);
 await pool.query("INSERT INTO learning_permission_events(account_id,recorded_by,allowed,policy_version) VALUES($1,$1,true,'consent-v1')",[f.w]);
 await pool.query("INSERT INTO learning_permission_events(account_id,recorded_by,allowed,policy_version) VALUES($1,$1,false,'consent-v1')",[f.w]);
 assert.equal((await one('SELECT allowed FROM current_learning_permissions WHERE account_id=$1',[f.w])).allowed,false);
 await assert.rejects(pool.query("INSERT INTO learning_permission_events(account_id,recorded_by,allowed,policy_version) VALUES($1,$2,true,'consent-v1')",[f.w,f.manager]),/requires subject/);
 await pool.query("INSERT INTO learning_permission_events(organization_id,recorded_by,allowed,policy_version) VALUES($1,$2,true,'consent-v1')",[f.org,f.manager]);
 assert.equal((await one('SELECT allowed FROM current_learning_permissions WHERE organization_id=$1',[f.org])).allowed,true);
});

test('reconsideration can restore a voided record without erasing the earlier decision',async()=>{
 const {f,a}=await confirmed();const id=await observation(f,a);const admin=await moderator();
 const first=(await one("INSERT INTO record_cases(activity_id,raised_by,case_type,reason_code) VALUES($1,$2,'dispute','inaccurate') RETURNING id",[id,f.manager])).id;
 await pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'record_voided','review-v1')",[first,admin]);
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[id])).evidence_state,'voided');
 const reconsideration=(await one("INSERT INTO record_cases(activity_id,raised_by,case_type,reason_code) VALUES($1,$2,'dispute','missing_context') RETURNING id",[id,f.w])).id;
 await pool.query("INSERT INTO case_decisions(case_id,decided_by,outcome,policy_version) VALUES($1,$2,'record_upheld','review-v2')",[reconsideration,admin]);
 assert.equal((await one('SELECT evidence_state FROM effective_activity_records WHERE id=$1',[id])).evidence_state,'confirmed');
 assert.equal((await one('SELECT count(*)::int AS n FROM case_decisions WHERE case_id=ANY($1::bigint[])',[[first,reconsideration]])).n,2);
});

test('system evidence cannot spoof the time or actor of its lifecycle source',async()=>{
 const {f,a}=await confirmed();
 const event=await one("SELECT * FROM match_events WHERE match_id=$1 AND event_type='confirmed'",[a.m]);
 await assert.rejects(pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reporting_party,source_match_event_id) VALUES($1,'match_confirmed','2001-01-01','system_event','system',$2)",[a.m,event.id]),/Lifecycle source/);
 await assert.rejects(pool.query("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,source_match_event_id) VALUES($1,'match_confirmed',$2,'system_event',$3,'system',$4)",[a.m,event.created_at,f.w,event.id]),/Lifecycle source/);
});
