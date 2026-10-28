import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {Pool} from 'pg';
import {pool,one,runtimeDatabaseUrl} from './helpers/database.js';
import {testDatabaseUrl} from '../scripts/lib/test-database.mjs';
import {digest} from '../server/access.js';
import http from 'node:http';
const siteUrl=testDatabaseUrl({...process.env,DATABASE_URL:process.env.TEST_WORKSITE_DATABASE_URL});
const siteRuntime=new Pool({connectionString:siteUrl});
const port=Number(process.env.PORT||3000)+2,base='http://127.0.0.1:'+port;
let child,exitPromise,logs='';
const perms=(patch={})=>({view:true,edit:false,deactivate:false,confirm_work:false,...patch});
async function api(path,method='GET',data,token=''){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 return {status:response.status,data:await response.json()};
}
before(async()=>{
 child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),WORKSITE_DATABASE_URL:siteUrl,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 exitPromise=once(child,'exit');child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 let ready=false;for(let i=0;i<60;i++){
  try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(ready,logs);
});
after(async()=>{try{if(child&&child.exitCode===null)child.kill('SIGTERM');await exitPromise;}finally{await Promise.all([pool.end(),siteRuntime.end()]);}});
async function actor(){
 const result=await api('/api/register','POST',{email:`site-${crypto.randomUUID()}@example.com`,password:'site-test-password',name:'가상 담당자'});
 assert.equal(result.status,201,JSON.stringify(result.data));return {id:result.data.account.id,token:result.data.token};
}
async function fixture(){
 const owner=await actor(),manager=await actor(),staff=await actor(),staff2=await actor(),outsider=await actor();
 const company=await api('/api/me/companies','POST',{name:'가상 현장 업체'},owner.token);assert.equal(company.status,201);
 assert.equal((await api('/api/me/companies','POST',{name:'별도 소속 업체'},outsider.token)).status,201);
 const org=company.data.id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'manager'),($1,$3,'staff'),($1,$4,'staff')",[org,manager.id,staff.id,staff2.id]);
 return {owner,manager,staff,staff2,outsider,org};
}
async function create(f,who=f.owner,patch={}){
 return api(`/api/companies/${f.org}/worksites`,'POST',{name:'가상 현장',address:'가상시 테스트로 100',...patch},who.token);
}
async function site(f,patch={}){const r=await create(f,f.owner,patch);assert.equal(r.status,201,JSON.stringify(r.data));return r.data.worksite;}
async function grant(f,s,who,permissions=perms(),by=f.owner){
 const r=await api(`/api/worksites/${s.id}/assignments/${who.id}`,'PUT',{version:s.version,permissions},by.token);
 assert.equal(r.status,200,JSON.stringify(r.data));return r.data.worksite;
}
async function state(){
 const tables=['accounts','account_sessions','organizations','organization_memberships','worksites','worksite_assignments','worksite_events','job_posts','job_lines','job_line_dates','match_terms','match_dates','match_approvals','match_term_parties','matches','match_events','resource_reservations','activity_records','activity_confirmations','payment_obligations','payment_claims','receipt_confirmations'];
 const result={};for(const table of tables)result[table]=(await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY 1`)).rows;
 return result;
}
async function denied(path,method,data,who,status){
 const before=await state(),result=await api(path,method,data,who?.token);
 assert.equal(result.status,status,JSON.stringify(result.data));assert.deepEqual(await state(),before);
}

for(const role of ['owner','manager'])test(`${role} can register a worksite with server-owned author and time`,async()=>{
 const f=await fixture(),r=await create(f,f[role]);assert.equal(r.status,201,JSON.stringify(r.data));
 assert.equal(r.data.worksite.organization_id,f.org);assert.equal(r.data.worksite.created_by,f[role].id);
 assert.ok(r.data.worksite.created_at);assert.equal(r.data.worksite.version,1);
 const event=await one('SELECT * FROM worksite_events WHERE worksite_id=$1 ORDER BY id LIMIT 1',[r.data.worksite.id]);
 assert.equal(event.actor_id,f[role].id);assert.equal(event.event_type,'created');
});
test('staff, nonmembers and forged company/actor/role inputs cannot register for another organization',async()=>{
 const f=await fixture();
 await denied(`/api/companies/${f.org}/worksites`,'POST',{name:'현장',address:'주소'},f.staff,403);
 await denied(`/api/companies/${f.org}/worksites`,'POST',{name:'현장',address:'주소'},f.outsider,404);
 for(const extra of [{organization_id:'1'},{role:'owner'},{created_by:f.owner.id},{account_id:f.owner.id}]){
  await denied(`/api/companies/${f.org}/worksites`,'POST',{name:'현장',address:'주소',...extra},f.owner,400);
 }
});
test('all worksite routes reject missing, unknown, expired and revoked sessions without writes',async()=>{
 const f=await fixture(),s=await site(f),expired=await actor(),revoked=await actor();
 await pool.query("UPDATE account_sessions SET expires_at=now()-interval '1 second' WHERE account_id=$1",[expired.id]);
 await pool.query('DELETE FROM account_sessions WHERE token_hash=$1',[digest(revoked.token)]);
 const routes=[['GET',`/api/companies/${f.org}/worksites`],['POST',`/api/companies/${f.org}/worksites`],['GET',`/api/worksites/${s.id}`],['PATCH',`/api/worksites/${s.id}`],['POST',`/api/worksites/${s.id}/deactivate`],['GET',`/api/worksites/${s.id}/assignments`],['PUT',`/api/worksites/${s.id}/assignments/${f.staff.id}`],['DELETE',`/api/worksites/${s.id}/assignments/${f.staff.id}`]];
 for(const who of [null,{token:digest(crypto.randomUUID())},expired,revoked])for(const [method,path] of routes)await denied(path,method,method==='GET'?undefined:{version:1},who,401);
});
test('manager lists organization sites; staff lists only explicitly assigned sites and no personal contacts',async()=>{
 const f=await fixture(),a=await site(f),b=await site(f,{name:'다른 담당 현장',address:'가상시 다른로 200'});
 await grant(f,a,f.staff);
 const own=await api(`/api/companies/${f.org}/worksites`,'GET',undefined,f.manager.token);
 assert.equal(own.status,200);assert.deepEqual(own.data.worksites.map(s=>s.id),[a.id,b.id]);
 const assigned=await api(`/api/companies/${f.org}/worksites`,'GET',undefined,f.staff.token);
 assert.deepEqual(assigned.data.worksites.map(s=>s.id),[a.id]);
 const detail=await api(`/api/worksites/${a.id}`,'GET',undefined,f.staff.token);assert.equal(detail.status,200);
 assert.equal('email' in detail.data.worksite,false);assert.equal('phone' in detail.data.worksite,false);
 await denied(`/api/worksites/${b.id}`,'GET',undefined,f.staff,404);
 await denied(`/api/companies/${f.org}/worksites`,'GET',undefined,f.outsider,404);
 await denied(`/api/worksites/${a.id}`,'GET',undefined,f.outsider,404);
});
test('multiple assignees, independent work-confirmation flags and explicit revocation preserve history',async()=>{
 const f=await fixture();let s=await site(f);
 s=await grant(f,s,f.staff,perms({confirm_work:true}));s=await grant(f,s,f.staff2,perms({edit:true}),f.manager);
 const list=await api(`/api/worksites/${s.id}/assignments`,'GET',undefined,f.owner.token);
 assert.equal(list.data.assignments.length,2);assert.ok(list.data.assignments.every(a=>a.effective));
 assert.equal(list.data.assignments.find(a=>a.account_id===f.staff.id).can_edit,false);
 await denied(`/api/worksites/${s.id}`,'PATCH',{version:s.version,name:'무단 수정'},f.staff,403);
 await denied(`/api/worksites/${s.id}/assignments/${f.staff.id}`,'PUT',{version:s.version,permissions:perms({edit:true})},f.staff2,403);
 const revoke=await api(`/api/worksites/${s.id}/assignments/${f.staff.id}`,'DELETE',{version:s.version},f.manager.token);
 assert.equal(revoke.status,200);await denied(`/api/worksites/${s.id}`,'GET',undefined,f.staff,404);
 assert.equal((await api(`/api/worksites/${s.id}`,'GET',undefined,f.staff2.token)).status,200);
 assert.equal((await one('SELECT active FROM worksite_assignments WHERE worksite_id=$1 AND account_id=$2',[s.id,f.staff.id])).active,false);
 assert.ok((await pool.query("SELECT 1 FROM worksite_events WHERE worksite_id=$1 AND event_type='assignment_revoked'",[s.id])).rowCount);
});
test('membership removal blocks access immediately and rejoining does not revive old worksite grants',async()=>{
 const f=await fixture();let s=await site(f);s=await grant(f,s,f.staff,perms({edit:true}));
 await pool.query('DELETE FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[f.org,f.staff.id]);
 await denied(`/api/worksites/${s.id}`,'GET',undefined,f.staff,404);
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'staff')",[f.org,f.staff.id]);
 await denied(`/api/worksites/${s.id}`,'GET',undefined,f.staff,404);
 assert.ok((await pool.query("SELECT 1 FROM worksite_events WHERE worksite_id=$1 AND event_type='membership_removed'",[s.id])).rowCount);
 s=await grant(f,s,f.staff);assert.equal((await api(`/api/worksites/${s.id}`,'GET',undefined,f.staff.token)).status,200);
});
test('only current members may be assigned and invalid permission payloads leave no partial changes',async()=>{
 const f=await fixture(),s=await site(f);
 for(const target of [f.outsider.id,'9223372036854775807'])await denied(`/api/worksites/${s.id}/assignments/${target}`,'PUT',{version:s.version,permissions:perms()},f.owner,400);
 for(const permissions of [null,[],{},perms({view:false,edit:true}),perms({edit:'true'}),{...perms(),manage:true}])await denied(`/api/worksites/${s.id}/assignments/${f.staff.id}`,'PUT',{version:s.version,permissions},f.owner,400);
});
test('edit and deactivation are separate delegated permissions; managers keep management access',async()=>{
 const f=await fixture();let s=await site(f);s=await grant(f,s,f.staff,perms({edit:true}));
 let r=await api(`/api/worksites/${s.id}`,'PATCH',{version:s.version,name:'수정 현장'},f.staff.token);assert.equal(r.status,200);s=r.data.worksite;
 await denied(`/api/worksites/${s.id}/deactivate`,'POST',{version:s.version},f.staff,403);
 s=await grant(f,s,f.staff,perms({deactivate:true}));
 await denied(`/api/worksites/${s.id}`,'PATCH',{version:s.version,name:'수정 불가'},f.staff,403);
 r=await api(`/api/worksites/${s.id}/deactivate`,'POST',{version:s.version},f.staff.token);assert.equal(r.status,200);assert.equal(r.data.worksite.is_active,false);
 assert.equal((await api(`/api/worksites/${s.id}`,'GET',undefined,f.owner.token)).status,200);
});
test('deactivation preserves existing jobs, matches, payments and historical company attribution',async()=>{
 const f=await fixture(),s=await site(f);
 const cat=(await one("INSERT INTO occupation_categories(name) VALUES($1) RETURNING id",[crypto.randomUUID()])).id;
 const occ=(await one("INSERT INTO occupations(category_id,name) VALUES($1,'가상 직종') RETURNING id",[cat])).id;
 const post=(await one('INSERT INTO job_posts(worksite_id) VALUES($1) RETURNING id',[s.id])).id;
 await pool.query('INSERT INTO job_posts(worksite_id) VALUES($1)',[s.id]);
 const line=(await one("INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw) VALUES($1,$2,'worker',250000) RETURNING id",[post,occ])).id;
 await pool.query("INSERT INTO job_line_dates VALUES($1,'2030-09-01',1)",[line]);
 await pool.query('INSERT INTO worker_profiles(account_id) VALUES($1)',[f.staff.id]);
 const terms=(await one("INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash) VALUES($1,$2,1,'{}','site-preservation') RETURNING id",[line,f.staff.id])).id;
 await pool.query("INSERT INTO match_dates VALUES($1,'2030-09-01')",[terms]);
 const match=(await one('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[terms])).id;
 await pool.query("SELECT node_approve_match($1,$2,'worker',$3)",[match,terms,f.staff.id]);
 await pool.query("SELECT node_approve_match($1,$2,'company',$3)",[match,terms,f.owner.id]);
 await pool.query('SELECT node_confirm_match($1)',[match]);
 const record=(await one("INSERT INTO activity_records(match_id,kind,occurred_at,source,reported_by,reporting_party,work_date) VALUES($1,'work_completion',now(),'party_report',$2,'worker','2030-09-01') RETURNING id",[match,f.staff.id])).id;
 await pool.query("INSERT INTO activity_confirmations(activity_id,confirmed_by,confirming_party) VALUES($1,$2,'company')",[record,f.owner.id]);
 const obligation=(await one("INSERT INTO payment_obligations(match_id,amount_krw,due_date,payer_organization_id) VALUES($1,250000,'2030-09-02',$2) RETURNING id",[match,f.org])).id;
 const claim=(await one('INSERT INTO payment_claims(obligation_id,amount_krw) VALUES($1,250000) RETURNING id',[obligation])).id;
 await pool.query('INSERT INTO receipt_confirmations(claim_id,confirmed_by) VALUES($1,$2)',[claim,f.staff.id]);
 const before=await state();
 const r=await api(`/api/worksites/${s.id}/deactivate`,'POST',{version:s.version},f.owner.token);assert.equal(r.status,200);
 const after=await state();
 for(const key of ['job_posts','job_lines','job_line_dates','match_terms','match_dates','match_approvals','match_term_parties','matches','match_events','resource_reservations','activity_records','activity_confirmations','payment_obligations','payment_claims','receipt_confirmations'])assert.deepEqual(after[key],before[key]);
 assert.equal((await api(`/api/worksites/${s.id}`,'GET',undefined,f.owner.token)).data.worksite.is_active,false);
 await denied(`/api/worksites/${s.id}/deactivate`,'POST',{version:r.data.worksite.version},f.owner,409);
 await assert.rejects(pool.query('DELETE FROM worksites WHERE id=$1',[s.id]),/Deactivate/);
 assert.equal((await pool.query('SELECT id FROM occupations WHERE id=$1',[occ])).rowCount,1);
});
test('worksite inputs validate strings, optional fields, region and immutable server fields',async()=>{
 const f=await fixture();
 for(const patch of [{name:null},{name:[]},{name:{}},{name:false},{name:1},{name:''},{name:' '},{name:'가'.repeat(121)},{address:null},{address:[]},{address:''},{address:'가'.repeat(501)},{address:'a\u0000b'},{description:1},{location_notes:'가'.repeat(1001)},{region_id:1},{region_id:'9223372036854775807'}])await denied(`/api/companies/${f.org}/worksites`,'POST',{name:'현장',address:'주소',...patch},f.owner,400);
 const r=await create(f,f.owner,{name:' 현장 ',address:' 주소 ',description:null,location_notes:''});assert.equal(r.status,201);assert.equal(r.data.worksite.name,'현장');assert.equal(r.data.worksite.address,'주소');
 const s=r.data.worksite;
 for(const patch of [{organization_id:'1'},{id:'1'},{is_active:false},{created_by:f.staff.id},{version:'1'},{name:''},{address:false}])await denied(`/api/worksites/${s.id}`,'PATCH',{version:s.version,...patch},f.owner,400);
});
test('missing and malformed worksite/company IDs have consistent errors without data changes',async()=>{
 const f=await fixture();
 for(const id of ['null','false','0','-1','1.5','%5B1%5D','9223372036854775808']){
  await denied(`/api/worksites/${id}`,'GET',undefined,f.owner,400);
  await denied(`/api/companies/${id}/worksites`,'GET',undefined,f.owner,400);
 }
 await denied('/api/worksites/9223372036854775807','GET',undefined,f.owner,404);
 await denied('/api/companies/9223372036854775807/worksites','GET',undefined,f.owner,404);
});
test('similar names or addresses warn without blocking and never reveal another company',async()=>{
 const f=await fixture();await site(f,{name:'가상-현장',address:'가상주소 100'});
 const r=await create(f,f.owner,{name:'가상 현장',address:'완전히 다른 주소'});assert.equal(r.status,201);assert.equal(r.data.warnings[0].code,'similar_worksite');
 const otherCompany=await api('/api/me/companies','POST',{name:'다른 업체'},f.outsider.token);
 const isolated=await api(`/api/companies/${otherCompany.data.id}/worksites`,'POST',{name:'가상 현장',address:'가상주소 100'},f.outsider.token);
 assert.equal(isolated.status,201);assert.deepEqual(isolated.data.warnings,[]);
});
test('optimistic version check admits one concurrent edit and rolls back the losing edit',async()=>{
 const f=await fixture(),s=await site(f);
 const results=await Promise.all(['첫 변경','둘째 변경'].map(name=>api(`/api/worksites/${s.id}`,'PATCH',{version:s.version,name},f.owner.token)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const current=(await api(`/api/worksites/${s.id}`,'GET',undefined,f.owner.token)).data.worksite;
 assert.equal(current.version,2);assert.equal(current.name,results.find(r=>r.status===200).data.worksite.name);
 assert.equal((await one("SELECT count(*)::int AS count FROM worksite_events WHERE worksite_id=$1 AND event_type='updated'",[s.id])).count,1);
});
test('an audit write failure rolls back the complete worksite creation',async()=>{
 const f=await fixture();
 await pool.query("ALTER TABLE worksite_events ADD CONSTRAINT worksite_test_failure CHECK(after_data->>'name'<>'강제 실패 현장') NOT VALID");
 try{
  const before=await state(),r=await create(f,f.owner,{name:'강제 실패 현장'});
  assert.equal(r.status,500);assert.deepEqual(await state(),before);
 }finally{await pool.query('ALTER TABLE worksite_events DROP CONSTRAINT worksite_test_failure');}
});
test('a concurrent membership revocation orders before a waiting edit and prevents the write',async()=>{
 const f=await fixture();let s=await site(f);s=await grant(f,s,f.staff,perms({edit:true}));
 const c=await pool.connect();let pending;
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(710031,1)');
  await c.query('DELETE FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[f.org,f.staff.id]);
  pending=api(`/api/worksites/${s.id}`,'PATCH',{version:s.version,name:'회수 후 무단 수정'},f.staff.token);
  let waiting=false;
  for(let i=0;i<100;i++){
   if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE application_name='node-worksites-api' AND wait_event='advisory'")).rowCount){waiting=true;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.ok(waiting,'the HTTP write must actually wait behind the revocation lock');
  await c.query('COMMIT');
  assert.equal((await pending).status,404);
  assert.equal((await one('SELECT name FROM worksites WHERE id=$1',[s.id])).name,s.name);
 }finally{await c.query('ROLLBACK');c.release();if(pending)await pending;}
});
test('legacy sites remain readable with unknown address/time; explicit editing fills only supplied data',async()=>{
 const f=await fixture(),old=(await one("INSERT INTO worksites(organization_id,name) VALUES($1,'기존 현장') RETURNING id",[f.org])).id;
 let r=await api(`/api/worksites/${old}`,'GET',undefined,f.owner.token);assert.equal(r.status,200);assert.equal(r.data.worksite.address,null);assert.equal(r.data.worksite.created_at,null);
 r=await api(`/api/worksites/${old}`,'PATCH',{version:1,address:'확인 후 입력한 주소'},f.owner.token);assert.equal(r.status,200);assert.equal(r.data.worksite.created_at,null);assert.equal(r.data.worksite.address,'확인 후 입력한 주소');
});
test('audit history is immutable and a transfer revokes grants without altering historical party snapshots',async()=>{
 const f=await fixture();let s=await site(f);s=await grant(f,s,f.staff);
 const otherOrg=(await one("INSERT INTO organizations(name) VALUES('가상 이관 업체') RETURNING id")).id;
 const before=(await pool.query('SELECT * FROM match_term_parties ORDER BY terms_id')).rows;
 await pool.query('UPDATE worksites SET organization_id=$1 WHERE id=$2',[otherOrg,s.id]);
 await denied(`/api/worksites/${s.id}`,'GET',undefined,f.staff,404);
 assert.equal((await one('SELECT active FROM worksite_assignments WHERE worksite_id=$1',[s.id])).active,false);
 assert.deepEqual((await pool.query('SELECT * FROM match_term_parties ORDER BY terms_id')).rows,before);
 await assert.rejects(pool.query('DELETE FROM worksite_events WHERE worksite_id=$1',[s.id]),/immutable/);
});
test('dedicated site role has no onboarding, matching, payment or direct history-write privileges',async()=>{
 for(const sql of ['SELECT password_hash FROM accounts','INSERT INTO organizations(name) VALUES(\'금지 업체\')','SELECT * FROM job_posts','SELECT * FROM matches','SELECT * FROM payment_obligations','INSERT INTO worksite_events(worksite_id,event_type) VALUES(1,\'created\')','DELETE FROM worksites','ALTER TABLE worksites ADD COLUMN forbidden int'])await assert.rejects(siteRuntime.query(sql),/permission denied|must be owner/);
});
test('separate site connection cannot select a different host, database or connection options',()=>{
 const primary='postgresql://node:local_test_only@127.0.0.1:5432/node_test';
 for(const patch of [{hostname:'localhost'},{pathname:'/node_test_other'},{search:'?sslmode=disable'}]){
  const other=new URL(primary);Object.assign(other,patch);
  const result=spawnSync(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:primary,WORKSITE_DATABASE_URL:other.href},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/same database/);
 }
});

async function partialRequest(path,method,data,token){
 const payload=Buffer.from(JSON.stringify(data)),cut=Math.floor(payload.length/2);
 let request;
 const response=new Promise((resolve,reject)=>{
  request=http.request(new URL(path,base),{method,headers:{'Content-Type':'application/json','Content-Length':payload.length,Authorization:'Bearer '+token}},res=>{
   let raw='';res.on('data',chunk=>raw+=chunk);res.on('error',reject);
   res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(raw)});}catch(error){reject(error);}});
  });
  request.on('error',reject);
 });
 response.catch(()=>{});
 await new Promise((resolve,reject)=>request.write(payload.subarray(0,cut),error=>error?reject(error):resolve()));
 return {response,finish:()=>request.end(payload.subarray(cut)),abort:()=>request.destroy()};
}
async function completesBeforeRelease(promise){
 let timer;
 try{return await Promise.race([promise.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),3000);})]);}
 finally{clearTimeout(timer);}
}
test('BUG-01: slow request bodies on every mutating route do not block another company reads or writes',async()=>{
 const f=await fixture(),other=await fixture();let s=await site(f);let otherSite=await site(other);
 const routes=[
  ['POST',`/api/companies/${f.org}/worksites`,()=>({name:'지연 등록 현장',address:'가상 주소'})],
  ['PATCH',`/api/worksites/${s.id}`,()=>({version:s.version,name:'지연 수정 현장'})],
  ['PUT',`/api/worksites/${s.id}/assignments/${f.staff.id}`,()=>({version:s.version,permissions:perms()})],
  ['DELETE',`/api/worksites/${s.id}/assignments/${f.staff.id}`,()=>({version:s.version})],
  ['POST',`/api/worksites/${s.id}/deactivate`,()=>({version:s.version})]
 ];
 for(const [method,path,data] of routes){
  const slow=await partialRequest(path,method,data(),f.owner.token);let pending,completed;
  try{
   pending=Promise.all([
    api(`/api/worksites/${otherSite.id}`,'GET',undefined,other.owner.token),
    api(`/api/worksites/${otherSite.id}`,'PATCH',{version:otherSite.version,name:'다른 업체 정상 수정'},other.owner.token)
   ]);
   completed=await completesBeforeRelease(pending);
  }finally{slow.finish();}
  const results=await pending,slowResult=await slow.response;
  assert.equal(completed,true,`${method} ${path}: another company must finish while the body is still incomplete`);
  assert.deepEqual(results.map(r=>r.status),[200,200]);
  assert.equal(slowResult.status,method==='POST'&&path.includes('/companies/')?201:200);
  otherSite=results[1].data.worksite;
  s=(await api(`/api/worksites/${s.id}`,'GET',undefined,f.owner.token)).data.worksite;
 }
});
test('BUG-01: basic body errors on every mutating route are rejected before waiting for a DB lock',async()=>{
 const f=await fixture(),s=await site(f),c=await pool.connect();let pending,completed;
 const before=await state();
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(710031,1)');
  pending=Promise.all([
   api(`/api/companies/${f.org}/worksites`,'POST',{name:[],address:'주소'},f.owner.token),
   api(`/api/worksites/${s.id}`,'PATCH',{version:1,name:false},f.owner.token),
   api(`/api/worksites/${s.id}/deactivate`,'POST',{version:'1'},f.owner.token),
   api(`/api/worksites/${s.id}/assignments/${f.staff.id}`,'PUT',{version:1,permissions:{}},f.owner.token),
   api(`/api/worksites/${s.id}/assignments/${f.staff.id}`,'DELETE',{version:null},f.owner.token)
  ]);
  completed=await completesBeforeRelease(pending);
 }finally{await c.query('ROLLBACK');c.release();}
 const results=await pending;
 assert.equal(completed,true,'basic input validation must not wait behind the shared lock');
 assert.deepEqual(results.map(r=>r.status),[400,400,400,400,400]);
 assert.deepEqual(await state(),before);
});
for(const method of ['GET','PATCH'])test(`BUG-02: ${method} rejects a session that expires while actually waiting for the shared lock`,async()=>{
 const f=await fixture(),s=await site(f),c=await pool.connect();let pending,before;
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(710031,1)');
  await pool.query("UPDATE account_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE token_hash=$1",[digest(f.owner.token)]);
  before=await state();
  pending=api(`/api/worksites/${s.id}`,method,method==='GET'?undefined:{version:s.version,name:'만료 후 금지 수정'},f.owner.token);
  let waiting=false;
  for(let i=0;i<100;i++){
   if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE application_name='node-worksites-api' AND wait_event='advisory'")).rowCount){waiting=true;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.ok(waiting,'request must start its transaction and wait before expiry');
  assert.equal((await one('SELECT clock_timestamp()<expires_at AS valid FROM account_sessions WHERE token_hash=$1',[digest(f.owner.token)])).valid,true);
  let expired=false;
  for(let i=0;i<300;i++){
   if((await one('SELECT clock_timestamp()>expires_at AS expired FROM account_sessions WHERE token_hash=$1',[digest(f.owner.token)])).expired){expired=true;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.ok(expired,'database wall clock must pass session expiry before releasing the lock');
  await c.query('COMMIT');
 }finally{await c.query('ROLLBACK');c.release();if(pending)await pending;}
 const result=await pending;
 assert.equal(result.status,401);assert.deepEqual(result.data,{error:'로그인이 필요합니다.'});
 assert.deepEqual(await state(),before);
});
