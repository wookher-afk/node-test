// Audit evidence only. Writes are confined to the newly created disposable DB.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {Pool} from 'pg';
import {testDatabaseUrl} from '../../scripts/lib/test-database.mjs';
const url=testDatabaseUrl();
assert.equal(new URL(url).pathname,'/node_test_classification_20261031_audit');
const {chromium}=createRequire(import.meta.url)(process.env.NODE_BROWSER_MODULE);
const pool=new Pool({connectionString:url}),base='http://127.0.0.1:8051';
const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:url,PORT:'8051'},stdio:['ignore','pipe','pipe']});
let logs='',browser;child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
const pass=x=>console.log('PASS REAL '+x);
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:950}}),p=await context.newPage();p.on('dialog',d=>d.accept());
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/?entry=worker#auth');await p.click('#registerTab');await p.fill('#name','분류 감사 합성 계정');await p.fill('#email',`classification-${crypto.randomUUID()}@example.com`);await p.fill('#password','audit-password-123');await p.click('#authSubmit');await p.waitForURL('**/register/worker');
 async function api(path,method='GET',body){return p.evaluate(async({path,method,body})=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Node-Session':'cookie'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};},{path,method,body});}
 const me=await api('/api/me'),account=me.data.account.id;
 await p.goto(base+'/worker-registration');await p.waitForFunction(()=>document.querySelector('#equipment').contentWindow.NODE_ALPHA_EXPORT);
 const f=p.frames().find(x=>x.url().includes('/ui/03-2/'));
 await f.check('#roles input[value="데모기사"]');await f.click('#addAbility');
 async function choose(){await f.selectOption('#major','토공·기초');await f.selectOption('#middle','굴착');await f.selectOption('#kind','excavator');await f.selectOption('#form','타이어식 (W)');await f.locator('#sizeChecks input[value="06W"]').check();if(!await f.locator('#optionalDetails').evaluate(x=>x.open))await f.locator('#optionalDetails > summary').click();await f.fill('#years','3');await f.fill('#alias','감사 별칭 140W');await f.locator('#optionChecks input[value="브레이커"]').check();await f.locator('#optionChecks input[value="집게"]').check();}
 await choose();
 await f.selectOption('#middle','적재');assert.equal(await f.inputValue('#kind'),'');assert.equal(await f.inputValue('#form'),'');assert.equal(await f.locator('#sizeChecks input:checked').count(),0);assert.equal(await f.locator('#optionChecks input:checked').count(),0);assert.equal(await f.inputValue('#alias'),'');
 await choose();await f.selectOption('#major','운반·차량');assert.equal(await f.inputValue('#middle'),'');assert.equal(await f.inputValue('#kind'),'');assert.equal(await f.locator('#optionChecks input:checked').count(),0);
 await choose();await f.selectOption('#form','미니');assert.equal(await f.locator('#sizeChecks input:checked').count(),0);assert.equal(await f.locator('#optionChecks input:checked').count(),0);
 await choose();await f.click('#submit');
 const exported=await f.evaluate(()=>window.NODE_ALPHA_EXPORT());assert.equal(exported.records.length,1);const record=exported.records[0];assert.equal(record.kind,'excavator');assert.equal(record.size,'06W');assert.deepEqual(record.optionSelections,['브레이커','집게']);assert.equal(record.alias,'감사 별칭 140W');
 pass(`UI parent/form reset and multiple options ${width}px`);
 await p.fill('#regions','서울, 경기 수원시');await p.fill('#pay','250000');await p.fill('#dates','2030-11-01, 2030-11-02');await p.click('#save');await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('서버에 저장했습니다'));
 let saved=await api('/api/me/worker-registration');assert.equal(saved.status,200);assert.deepEqual(saved.data.document.abilities,[record]);
 const db=(await pool.query('SELECT document FROM worker_alpha_registrations WHERE account_id=$1',[account])).rows[0].document;assert.deepEqual(db,saved.data.document);
 await p.reload();await p.waitForFunction(()=>document.querySelector('#equipment').contentWindow.NODE_ALPHA_EXPORT);assert.deepEqual(await p.locator('#equipment').evaluate(x=>x.contentWindow.NODE_ALPHA_EXPORT().records),[record]);
 pass(`UI -> HTTP -> PostgreSQL JSONB -> GET -> UI identical record/options/alias ${width}px`);
 // Demonstrate current validation gap without altering any pre-existing document.
 const malformed=structuredClone(db);Object.assign(malformed.abilities[0],{major:'운반·차량',middle:'하역',kind:'invented-kind',size:'invented-size',optionSelections:['invented-option'],years:''});
 const accepted=await api('/api/me/worker-registration','PUT',{version:saved.data.version,document:malformed});assert.equal(accepted.status,200);assert.deepEqual((await pool.query('SELECT document FROM worker_alpha_registrations WHERE account_id=$1',[account])).rows[0].document,malformed);
 pass('reproduced missing catalog validation: unknown kind/parents/size/options accepted and persisted');
 saved=await api('/api/me/worker-registration','PUT',{version:accepted.data.version,document:db});assert.equal(saved.status,200);
 const org=(await api('/api/me/companies','POST',{name:'공통 분류 감사 업체'})).data.id;
 const region=(await pool.query("INSERT INTO regions(name,code) VALUES('감사 서울',$1) RETURNING id",['audit-'+crypto.randomUUID()])).rows[0].id;
 const siteResult=await api(`/api/companies/${org}/worksites`,'POST',{name:'감사 현장',address:'합성 주소',region_id:region});assert.equal(siteResult.status,201);const site=siteResult.data.worksite;
 const category=(await pool.query("INSERT INTO occupation_categories(name) VALUES($1) RETURNING id",['audit-'+crypto.randomUUID()])).rows[0].id;
 const occ=(await pool.query("INSERT INTO occupations(category_id,name) VALUES($1,'굴착기') RETURNING id",[category])).rows[0].id;
 const payload={lines:[{occupation_id:occ,resource_mode:'worker',allow_partial:true,pay:{unit:'day',amount_krw:250000},payment:{mode:'same_day'},dates:[{work_date:'2030-11-01',capacity:1}]}]};
 const create=()=>api(`/api/worksites/${site.id}/job-posts`,'POST',payload);
 let result=await create();assert.equal(result.status,201);const post=result.data.job_post;
 result=await api(`/api/job-posts/${post.id}`);assert.equal(result.status,200);assert.equal(result.data.job_post.lines[0].occupation_id,occ);
 const line=(await pool.query('SELECT occupation_id,daily_pay_krw FROM job_lines WHERE id=$1',[post.lines[0].id])).rows[0];assert.equal(line.occupation_id,occ);assert.equal(line.daily_pay_krw,'250000');
 pass('company real POST/GET -> occupation FK + day pay + dates; synthetic occupation is NOT an automatic catalog mapping');
 for(const [field,value] of [['kind','excavator'],['size','06W'],['optionSelections',['브레이커','집게']],['min_experience_months',36],['startTime','08:00']]){payload.lines[0][field]=value;assert.equal((await create()).status,400);delete payload.lines[0][field];pass(`company rejects unsupported field ${field}`);}
 for(const unit of ['hour','month']){payload.lines[0].pay.unit=unit;assert.equal((await create()).status,400);pass(`company rejects pay unit ${unit}`);}payload.lines[0].pay.unit='day';
 payload.lines[0].occupation_id='excavator';assert.equal((await create()).status,400);payload.lines[0].occupation_id=occ;pass('company rejects catalog string ID as occupation_id');
 const badRegion=await api(`/api/companies/${org}/worksites`,'POST',{name:'문자열 지역',address:'합성 주소',region_id:'서울'});assert.equal(badRegion.status,400);pass('company region string rejected; worker region strings preserved without FK mapping');
 const before=(await pool.query('SELECT count(*)::int AS n FROM worker_preference_versions WHERE worker_id=$1',[account])).rows[0].n;assert.equal(before,0);pass('Alpha document save creates no worker_preference_versions projection');
 await p.goto(base+'/?entry=company#profile');await p.locator('#companyForm').waitFor({state:'visible'});assert.equal(await p.locator('#kind,#major,#middle,iframe').count(),0);pass('company profile has company-name form, no equipment/worksite/job editor');
 assert.deepEqual(errors,[]);await context.close();
 }
}finally{if(browser)await browser.close();if(child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}await pool.end();}
