import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {pool,one} from './helpers/database.js';
after(()=>pool.end());
let serial=0;
async function fixture({capacity=1,partial=true,mode='worker',worker,owner}={}) {
 const w=worker || (await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 await pool.query('INSERT INTO worker_profiles(account_id) VALUES($1) ON CONFLICT DO NOTHING',[w]);
 const manager=owner || (await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 const org=(await one("INSERT INTO organizations(name) VALUES('가상 업체') RETURNING id")).id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'owner')",[org,manager]);
 const category=(await one('INSERT INTO occupation_categories(name) VALUES($1) RETURNING id',['test-'+(++serial)])).id;
 const occ=(await one("INSERT INTO occupations(category_id,name) VALUES($1,'가상 직종') RETURNING id",[category])).id;
 const site=(await one("INSERT INTO worksites(organization_id,name) VALUES($1,'가상 현장') RETURNING id",[org])).id;
 const post=(await one('INSERT INTO job_posts(worksite_id) VALUES($1) RETURNING id',[site])).id;
 const line=(await one('INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw,allow_partial) VALUES($1,$2,$3,250000,$4) RETURNING id',[post,occ,mode,partial])).id;
 await pool.query("INSERT INTO job_line_dates VALUES($1,'2030-06-10',$2),($1,'2030-06-11',$2)",[line,capacity]);
 return {w,manager,org,line,post};
}
async function match(f,{worker=f.w,version=1,days=['2030-06-10'],equipment=null}={}) {
 const t=(await one('INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash,equipment_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[f.line,worker,version,JSON.stringify({pay:250000}),`v${version}`,equipment])).id;
 for(const day of days)await pool.query('INSERT INTO match_dates VALUES($1,$2)',[t,day]);
 const m=(await one('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[t])).id;
 return {m,t,worker};
}
async function approve(f,a){await pool.query("SELECT node_approve_match($1,$2,'worker',$3)",[a.m,a.t,a.worker]);await pool.query("SELECT node_approve_match($1,$2,'company',$3)",[a.m,a.t,f.manager]);}
const confirm=a=>pool.query('SELECT node_confirm_match($1)',[a.m]);
const cancel=(a,actor)=>pool.query("SELECT node_cancel_match($1,$2,'가상 취소')",[a.m,actor]);

test('bilateral approval, authorization, atomic reservations, cancellation history and capacity recovery',async()=>{
 const f=await fixture();const a=await match(f);const outsider=(await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 await assert.rejects(pool.query("SELECT node_approve_match($1,$2,'worker',$3)",[a.m,a.t,outsider]),/not authorized/);
 await pool.query("SELECT node_approve_match($1,$2,'worker',$3)",[a.m,a.t,f.w]);
 await assert.rejects(confirm(a),/Both authorized parties/);
 await pool.query("SELECT node_approve_match($1,$2,'company',$3)",[a.m,a.t,f.manager]);
 await confirm(a);
 assert.equal((await one("SELECT count(*)::int AS n FROM resource_reservations WHERE match_id=$1 AND status='confirmed'",[a.m])).n,1);
 await assert.rejects(cancel(a,outsider),/not authorized/);
 await assert.rejects(pool.query("UPDATE job_line_dates SET capacity=0 WHERE job_line_id=$1",[f.line]),/invalidate|check constraint/);
 await assert.rejects(pool.query('DELETE FROM resource_reservations WHERE match_id=$1',[a.m]),/immutable/);
 await cancel(a,f.manager);
 assert.equal((await one("SELECT count(*)::int AS n FROM resource_reservations WHERE match_id=$1 AND status='released'",[a.m])).n,1);
 assert.equal((await one("SELECT count(*)::int AS n FROM match_events WHERE match_id=$1 AND event_type='cancelled' AND actor_id=$2",[a.m,f.manager])).n,1);
 const b=await match(f,{version:2});await approve(f,b);await confirm(b);
 await assert.rejects(pool.query('DELETE FROM matches WHERE id=$1',[a.m]),/history/);
});

test('approvals freeze both contents and dates; new versions require new approvals',async()=>{
 const f=await fixture();const a=await match(f);await approve(f,a);
 await assert.rejects(pool.query("UPDATE match_terms SET terms='{}' WHERE id=$1",[a.t]),/immutable/);
 await assert.rejects(pool.query("UPDATE match_dates SET work_date='2030-06-11' WHERE terms_id=$1",[a.t]),/immutable/);
 await assert.rejects(pool.query('DELETE FROM match_approvals WHERE terms_id=$1',[a.t]),/append only/);
 const b=await match(f,{version:2});
 await assert.rejects(confirm(a),/Outdated/);
 await assert.rejects(confirm(b),/Both authorized parties/);
 await approve(f,b);await confirm(b);
});

test('direct confirmed insertion, terms reassignment and closed posts cannot bypass guards',async()=>{
 const f=await fixture();const a=await match(f);
 await assert.rejects(pool.query("INSERT INTO matches(terms_id,status) VALUES($1,'confirmed')",[a.t]),/must be pending/);
 await approve(f,a);await pool.query("UPDATE job_posts SET status='closed' WHERE id=$1",[f.post]);
 await assert.rejects(confirm(a),/not open/);
 await pool.query("UPDATE job_posts SET status='open' WHERE id=$1",[f.post]);await confirm(a);
 const b=await match(f,{version:2});
 await assert.rejects(pool.query('UPDATE matches SET terms_id=$1 WHERE id=$2',[b.t,a.m]),/identity/);
});

test('revoked company authority and ordinary staff cannot approve or cancel',async()=>{
 const f=await fixture();const a=await match(f);await approve(f,a);
 await pool.query("UPDATE organization_memberships SET role='staff' WHERE organization_id=$1 AND account_id=$2",[f.org,f.manager]);
 await assert.rejects(confirm(a),/Both authorized/);
 await assert.rejects(cancel(a,f.manager),/not authorized/);
});

test('partial dates policy and missing offered dates are enforced',async()=>{
 const f=await fixture({partial:false});const a=await match(f);await approve(f,a);
 await assert.rejects(confirm(a),/Partial dates/);
 const b=await match(f,{version:2,days:['2030-06-10','2030-06-11','2030-06-12']});await approve(f,b);
 await assert.rejects(confirm(b),/Date not offered/);
 const c=await match(f,{version:3,days:['2030-06-10','2030-06-11']});await approve(f,c);await confirm(c);
});

test('external calendars block confirmation and reservations block conflicting calendar writes',async()=>{
 const f=await fixture();const a=await match(f);await approve(f,a);
 const event=(await one("INSERT INTO calendar_events(account_id,period,type) VALUES($1,node_work_period('2030-06-10'),'leave') RETURNING id",[f.w])).id;
 await assert.rejects(confirm(a),/calendar/);
 assert.equal((await one('SELECT count(*)::int AS n FROM resource_reservations WHERE match_id=$1',[a.m])).n,0);
 await pool.query('DELETE FROM calendar_events WHERE id=$1',[event]);await confirm(a);
 await assert.rejects(pool.query("INSERT INTO calendar_events(account_id,period,type) VALUES($1,node_work_period('2030-06-10'),'external_work')",[f.w]),/conflicts/);
});

test('equipment and worker are reserved together; conflict rolls back all writes',async()=>{
 const f=await fixture({mode:'equipment_and_worker'});
 const equipment=(await one("INSERT INTO equipment(owner_account_id,kind) VALUES($1,'가상 장비') RETURNING id",[f.w])).id;
 const a=await match(f,{equipment});await approve(f,a);
 const booking=(await one("INSERT INTO resource_reservations(equipment_id,period) VALUES($1,node_work_period('2030-06-10')) RETURNING id",[equipment])).id;
 await assert.rejects(confirm(a),/no_equipment_overlap/);
 assert.equal((await one('SELECT count(*)::int AS n FROM resource_reservations WHERE match_id=$1',[a.m])).n,0);
 assert.equal((await one('SELECT status FROM matches WHERE id=$1',[a.m])).status,'pending');
 await pool.query('DELETE FROM resource_reservations WHERE id=$1',[booking]);await confirm(a);
 assert.equal((await one('SELECT count(*)::int AS n FROM resource_reservations WHERE match_id=$1',[a.m])).n,2);
});

// Force one connection to hold the write lock while the other attempts to confirm.
// This tests actual independent PostgreSQL sessions, not sequential promises.
async function race(a,b) {
 const c1=await pool.connect(),c2=await pool.connect();
 try {
   await c1.query('BEGIN');await c2.query('BEGIN');
   await c1.query("SET LOCAL lock_timeout='5s'");await c2.query("SET LOCAL lock_timeout='5s'");
   await c1.query('SELECT node_confirm_match($1)',[a.m]);
   const pid=(await c2.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   const second=c2.query('SELECT node_confirm_match($1)',[b.m]).then(()=>null,e=>e);
   let blocked=false;
   for(let i=0;i<100;i++) {
     const row=await one("SELECT wait_event FROM pg_stat_activity WHERE pid=$1",[pid]);
     if(row?.wait_event==='advisory'){blocked=true;break;}
     await new Promise(r=>setTimeout(r,10));
   }
   assert.ok(blocked,'second session must contend on the matching lock');
   await c1.query('COMMIT');
   const error=await second;
   assert.ok(error,'second overlapping confirmation must fail');
   await c2.query('ROLLBACK');return error;
 } finally {await c1.query('ROLLBACK');await c2.query('ROLLBACK');c1.release();c2.release();}
}
test('two concurrent confirmations for the final slot yield exactly one winner',async()=>{
 const f=await fixture();const a=await match(f);
 const w=(await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 await pool.query('INSERT INTO worker_profiles(account_id) VALUES($1)',[w]);
 const b=await match(f,{worker:w});await approve(f,a);await approve(f,b);
 assert.match((await race(a,b)).message,/capacity exceeded/);
 assert.equal((await one("SELECT count(*)::int AS n FROM matches WHERE id=ANY($1::bigint[]) AND status='confirmed'",[[a.m,b.m]])).n,1);
});
test('concurrent confirmations at different sites cannot double-book a worker',async()=>{
 const f=await fixture(),g=await fixture({worker:f.w});const a=await match(f),b=await match(g);
 await approve(f,a);await approve(g,b);
 assert.match((await race(a,b)).message,/no_worker_overlap/);
});
test('completed work continues to occupy capacity and retains reservations',async()=>{
 const f=await fixture();const a=await match(f);await approve(f,a);await confirm(a);
 await pool.query("UPDATE matches SET status='completed' WHERE id=$1",[a.m]);
 const w=(await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;await pool.query('INSERT INTO worker_profiles(account_id) VALUES($1)',[w]);
 const b=await match(f,{worker:w});await approve(f,b);await assert.rejects(confirm(b),/capacity exceeded/);
 await assert.rejects(cancel(a,f.w),/cannot be cancelled/);
});

test('approved dates cannot be reassigned into a confirmed version',async()=>{
 const f=await fixture(),g=await fixture();const a=await match(f),b=await match(g,{days:['2030-06-11']});
 await approve(f,a);await confirm(a);
 await assert.rejects(pool.query('UPDATE match_dates SET terms_id=$1 WHERE terms_id=$2',[a.t,b.t]),/immutable/);
});

test('test database safety guard rejects remote addresses and missing acknowledgement',async()=>{
 const {spawnSync}=await import('node:child_process');
 for(const patch of [
   {DATABASE_URL:'postgresql://example:example@production.example.com/node_test',NODE_TEST_DATABASE:'1'},
   {DATABASE_URL:'postgresql://example:example@127.0.0.1/production',NODE_TEST_DATABASE:'1'},
   {NODE_TEST_DATABASE:''}
 ]) {
   const result=spawnSync(process.execPath,['--input-type=module','-e',"import './tests/helpers/database.js'"],{env:{...process.env,...patch},encoding:'utf8'});
   assert.notEqual(result.status,0);assert.match(result.stderr,/local disposable node_test/);
 }
});
