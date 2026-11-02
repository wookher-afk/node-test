import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {pool,runtimeDatabaseUrl} from './helpers/database.js';
import {documentFixture} from './helpers/company-fixture.js';
const base='http://127.0.0.1:3194';let child,exited,logs='';
const api=async(path,method='GET',data,token)=>{
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,data:await r.json()};
};
before(async()=>{
 child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:runtimeDatabaseUrl(),WORKSITE_DATABASE_URL:process.env.TEST_WORKSITE_DATABASE_URL,JOB_POST_DATABASE_URL:process.env.TEST_JOB_POST_DATABASE_URL,PORT:'3194'},stdio:['ignore','pipe','pipe']});exited=once(child,'exit');child.stderr.on('data',d=>logs+=d);
 for(let i=0;i<60;i++){try{if((await api('/api/health')).status===200)return;}catch{}await new Promise(r=>setTimeout(r,100));}assert.fail(logs);
});
after(async()=>{if(child&&child.exitCode===null)child.kill();if(exited)await exited;await pool.end();});
async function actor(){const r=await api('/api/register','POST',{email:`alpha-post-${crypto.randomUUID()}@example.com`,password:'alpha-post-password',name:'공고 담당자'});assert.equal(r.status,201);return r.data;}
async function fixture(){
 const owner=await actor(),staff=await actor(),outsider=await actor();
 const org=(await api('/api/me/companies','POST',{name:'연결 업체'},owner.token)).data.id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'staff')",[org,staff.account.id]);
 const document=documentFixture();document.lines[0].paymentTerms='작업 다음 날 지급';
 document.lines[0].requiredMatch=['workAbility','schedule','pay'];
 const source=await api(`/api/companies/${org}/registration`,'PUT',{version:0,document},owner.token);assert.equal(source.status,200);
 const site=await api(`/api/companies/${org}/worksites`,'POST',{name:document.worksite.name,address:document.worksite.address},owner.token);assert.equal(site.status,201);
 const category=(await pool.query('INSERT INTO occupation_categories(name) VALUES($1) RETURNING id',[crypto.randomUUID()])).rows[0].id;
 const occupation=(await pool.query("INSERT INTO occupations(category_id,name) VALUES($1,'굴착기 기사') RETURNING id",[category])).rows[0].id;
 const payload={visibility:'private',alpha:{organization_id:org,version:1,choices:[{line_id:'line-1',occupation_id:occupation,occupation_confirmed:true,payment:{mode:'next_day'},payment_confirmed:true,allow_partial:false}]}};
 return {owner,staff,outsider,org,site:site.data.worksite,document,occupation,payload};
}
const path=f=>`/api/worksites/${f.site.id}/job-posts`;
const publish=(f,data=f.payload,token=f.owner.token)=>api(path(f),'POST',data,token);
async function state(){const result={};for(const t of ['job_posts','job_lines','job_line_dates','job_post_versions','job_post_version_lines','job_post_version_dates','job_post_events','company_alpha_registrations'])result[t]=(await pool.query(`SELECT to_jsonb(t) AS row FROM ${t} t ORDER BY 1`)).rows;return result;}
test('real saved Alpha -> existing POST -> immutable version preserves all original conditions and promises',async()=>{
 const f=await fixture(),r=await publish(f);assert.equal(r.status,201,JSON.stringify(r.data));const p=r.data.job_post,l=p.lines[0];
 assert.equal(p.version,1);assert.equal(p.alpha_registration_version,1);assert.ok(p.promise_version_id);assert.equal(l.occupation_id,f.occupation);
 assert.equal(l.pay.amount_krw,'200000');assert.equal(l.allow_partial,false);assert.equal(l.dates.length,29);
 assert.ok(l.dates.every(d=>d.capacity===2));assert.equal(l.dates[0].payment_due_date,'2026-11-03');assert.equal(l.dates.at(-1).payment_due_date,'2026-12-01');
 assert.deepEqual(l.alpha_conditions,f.document.lines[0]);
 const revision=(await pool.query('SELECT alpha_source FROM job_post_versions WHERE id=$1',[p.promise_version_id])).rows[0];assert.deepEqual(revision.alpha_source.document,f.document);
 const current=(await pool.query('SELECT alpha_conditions FROM job_lines WHERE id=$1',[l.id])).rows[0];assert.deepEqual(current.alpha_conditions,f.document.lines[0]);
 const events=await pool.query('SELECT event_type FROM job_post_events WHERE job_post_id=$1',[p.id]);assert.deepEqual(events.rows.map(x=>x.event_type).sort(),['created','version_sealed']);
 const c=await pool.connect();try{await c.query('BEGIN');await assert.rejects(c.query('UPDATE job_post_version_lines SET alpha_conditions=$1 WHERE job_line_id=$2',['{}',l.id]),/append only/);await c.query('ROLLBACK');}finally{c.release();}
 assert.deepEqual((await api(`/api/companies/${f.org}/registration`,'GET',undefined,f.owner.token)).data.document,f.document);
});
test('concurrent double submission and network retry return one original post; changed confirmations conflict',async()=>{
 const f=await fixture(),responses=await Promise.all([publish(f),publish(f)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
 const ids=responses.map(r=>r.data.job_post.id);assert.equal(ids[0],ids[1]);const before=await state();assert.equal((await publish(f)).data.job_post.id,ids[0]);assert.deepEqual(await state(),before);
 const changed=structuredClone(f.payload);changed.alpha.choices[0].allow_partial=true;assert.equal((await publish(f,changed)).status,409);assert.deepEqual(await state(),before);
});
test('roles, cross-organization site, stale versions, missing mappings, unknown fields and unsupported pay never save posts',async()=>{
 const f=await fixture();
 for(const [data,token,status] of [[f.payload,undefined,401],[f.payload,f.staff.token,403],[f.payload,f.outsider.token,404]]){const before=await state();const r=await api(path(f),'POST',data,token);assert.equal(r.status,status,JSON.stringify(r.data));assert.deepEqual(await state(),before);}
 for(const mutate of [d=>d.alpha.version=2,d=>d.alpha.organization_id='9223372036854775807',d=>d.alpha.choices=[],d=>d.alpha.choices[0].payment_confirmed=false,d=>d.alpha.choices[0].occupation_id='9223372036854775807']){
  const data=structuredClone(f.payload);mutate(data);const before=await state();assert.ok([400,403,409,422].includes((await publish(f,data)).status));assert.deepEqual(await state(),before);
 }
 for(const mutate of [d=>d.lines[0].futureCondition='keep',d=>d.lines[0].conditions.payUnit='month',d=>d.lines[0].conditions.availability={mode:'always'}]){
  const d=structuredClone(f.document);mutate(d);await pool.query('UPDATE company_alpha_registrations SET document=$2 WHERE organization_id=$1',[f.org,JSON.stringify(d)]);
  const before=await state(),r=await publish(f);assert.equal(r.status,422,JSON.stringify(r.data));assert.deepEqual(await state(),before);
 }
});
test('injected failure after inserting post, lines and dates rolls back history and retry succeeds once',async()=>{
 const f=await fixture();await pool.query("CREATE FUNCTION node_test_alpha_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected alpha failure'; END $$; CREATE TRIGGER node_test_alpha_fail BEFORE INSERT ON job_post_version_dates FOR EACH ROW EXECUTE FUNCTION node_test_alpha_fail()");
 try{const before=await state();assert.equal((await publish(f)).status,500);assert.deepEqual(await state(),before);}finally{await pool.query('DROP TRIGGER node_test_alpha_fail ON job_post_version_dates; DROP FUNCTION node_test_alpha_fail()');}
 assert.equal((await publish(f)).status,201);assert.equal((await publish(f)).status,200);
});

test('Alpha browser selects existing site, confirms conditions, posts once and keeps original registration usable',async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.NODE_BROWSER_MODULE||'playwright');
 const browser=await chromium.launch({headless:true,executablePath:process.env.NODE_BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const f=await fixture(),context=await browser.newContext({viewport:{width:390,height:900}});
  await context.addCookies([{name:'node_session',value:f.owner.token,url:base}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/company-registration');await page.locator('#content').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#companyName').value==='검증 업체');
  await page.locator('[data-step="2"]').click();await page.locator('#prepareJobPost').click();await page.locator('#jobPostPanel').waitFor({state:'visible'});
  await page.locator('#jobPostSite').selectOption(f.site.id);await page.locator('[data-field="occupation_id"]').waitFor();
  await page.locator('#jobPostVisibility').selectOption('private');await page.locator('[data-field="occupation_id"]').selectOption(f.occupation);
  await page.locator('[data-field="occupation_confirmed"]').check();await page.locator('[data-field="payment_mode"]').selectOption('next_day');await page.locator('[data-field="payment_confirmed"]').check();await page.locator('[data-field="allow_partial"]').selectOption('false');
  await page.locator('#publishJobPost').click();await page.waitForFunction(()=>document.querySelector('#jobPostResult').textContent.includes('지급 약속 버전'));
  const first=await page.locator('#jobPostResult').innerText();await page.locator('#publishJobPost').click();await page.waitForFunction(()=>document.querySelector('#jobPostResult').textContent.includes('기존 등록 결과'));
  assert.ok((await page.locator('#jobPostResult').innerText()).startsWith(first));assert.deepEqual(errors,[]);
  await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('서버에 저장했습니다'));
  const stored=await api(`/api/companies/${f.org}/registration`,'GET',undefined,f.owner.token);assert.equal(stored.data.version,2);assert.deepEqual(stored.data.document.lines,f.document.lines);
 }finally{await browser.close();}
});
