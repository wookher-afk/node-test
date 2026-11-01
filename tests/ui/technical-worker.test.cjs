const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const base='http://127.0.0.1:8048',out='docs/technical-worker-2026-11-01';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{for(const width of [390,1440]){
 const c=await browser.newContext({viewport:{width,height:900}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const email='technical-'+randomBytes(8).toString('hex')+'@example.com',password=randomBytes(20).toString('hex');
 const api=(path,method='GET',body)=>p.evaluate(async({path,method,body})=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Node-Session':'cookie'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};},{path,method,body});
 await p.goto(base+'/?entry=worker#auth');await p.click('#registerTab');await p.fill('#name','직종 검증 작업자');await p.fill('#email',email);await p.fill('#password',password);await p.click('#authSubmit');await p.waitForURL('**/register/worker');await p.getByRole('link',{name:'기술 및 일반작업자',exact:true}).click();await p.locator('#content').waitFor({state:'visible'});
 assert.equal(await p.locator('#occupationMajor option').count(),13);assert.match(await p.locator('#draft').innerText(),/초안.*31.*179/);
 await p.click('#save');assert.match(await p.locator('#notice').innerText(),/하나 이상/);
 const ids=new Set();for(let i=1;i<=7;i++){await p.selectOption('#occupationMajor','NODE-JM-'+String(i).padStart(3,'0'));const mids=await p.locator('#occupationMiddle option').evaluateAll(xs=>xs.map(x=>x.value));for(const mid of mids){await p.selectOption('#occupationMiddle',mid);await p.click('#selectMiddle');for(const id of await p.locator('#occupationChoices input').evaluateAll(xs=>xs.map(x=>x.value)))ids.add(id);}}
 assert(ids.size>60);assert.equal(await p.locator('#occupationSummary button').count(),ids.size);
 await p.click('#clearMiddle');for(const id of await p.locator('#occupationChoices input').evaluateAll(xs=>xs.map(x=>x.value)))ids.delete(id);
 const first=[...ids][0];await p.locator('#occupationSummary button').first().click();ids.delete(first);
 await p.selectOption('#occupationMajor','NODE-JM-001');await p.selectOption('#occupationMiddle','NODE-JG-001');assert.equal(await p.locator('#occupationChoices input').first().isChecked(),false);assert(await p.locator('#occupationChoices input').nth(1).isChecked());
 async function save(){const [r]=await Promise.all([p.waitForResponse(r=>r.url().endsWith('/api/me/technical-registration')&&r.request().method()==='PUT'),p.click('#save')]);assert.equal(r.status(),200,await r.text());}
 await save();const path='/api/me/technical-registration',saved=(await api(path)).data;assert.deepEqual(saved.document.occupationIds,[...ids]);assert.deepEqual((await api('/api/me')).data.roles,['worker']);
 await p.reload();await p.locator('#content').waitFor({state:'visible'});assert.equal(await p.locator('#occupationSummary button').count(),ids.size);
 await p.locator('#occupationChoices input').first().check();ids.add(first);await save();
 await p.screenshot({path:out+'/selected-'+width+'.png',fullPage:true});
 assert.equal((await api(path,'PUT',{version:1,document:saved.document})).status,409);
 assert.equal((await api(path,'PUT',{version:2,document:{...saved.document,occupationCatalogVersion:'final'}})).status,400);
 assert.equal((await api('/api/logout','POST',{})).status,200);assert.equal((await api(path)).status,401);
 await p.goto(base+'/?entry=worker#auth');await p.fill('#email',email);await p.fill('#password',password);await p.click('#authSubmit');await p.waitForURL(base+'/');await p.goto(base+'/register/technical');await p.locator('#content').waitFor({state:'visible'});assert.equal(await p.locator('#occupationSummary button').count(),ids.size);assert.deepEqual((await api(path)).data.document.occupationIds,[...ids]);
 await p.click('#clearAll');assert.equal(await p.locator('#occupationSummary button').count(),0);assert.equal(await p.locator('#occupationChoices input:checked').count(),0);await p.click('#selectMiddle');await save();assert.equal((await api(path)).data.document.occupationIds.length,6);
 await p.screenshot({path:out+'/edited-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS real PostgreSQL Chrome '+width+': 60+ cross-category selections, middle select/clear, individual/all clear, edit/save/reload/relogin, worker role, stale/version rejection, no overflow/errors');await c.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
