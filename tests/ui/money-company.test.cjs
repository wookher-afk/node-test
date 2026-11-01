const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await context.route('http://127.0.0.1:8051/**',route=>{const u=new URL(route.request().url());return route.fulfill({path:path.join(root,u.pathname==='/'?'node_company_signup_0_5.html':u.pathname)});});
 await context.addInitScript(()=>localStorage.setItem('node_company_signup_test_v01',JSON.stringify({worker:{untouched:'보존'},company:{c_name:'기존 업체',c_positions:[{job:'굴착기 기사',count:'1',pay:'200001',payUnit:'월급'}]}})));
 await p.goto('http://127.0.0.1:8051/');await p.click('#nextBtn');const pay=p.locator('[data-field="pay"]');
 assert.equal(await pay.inputValue(),'20.0001');assert.equal(await p.locator('[data-field="payUnit"]').inputValue(),'월급');
 await pay.fill('20만원');await p.getByRole('button',{name:'임시저장',exact:true}).click();assert.match(await p.locator('#status').innerText(),/급여는 만원/);assert.equal((await p.evaluate(()=>JSON.parse(localStorage.getItem('node_company_signup_test_v01')))).company.c_positions[0].pay,'200001');await pay.fill('20');assert.equal(await p.locator('.position-card output').innerText(),'20만원');await p.selectOption('[data-field="payUnit"]','일당');await p.getByRole('button',{name:'임시저장',exact:true}).click();
 let d=await p.evaluate(()=>JSON.parse(localStorage.getItem('node_company_signup_test_v01')));assert.equal(d.company.c_positions[0].pay,'200000');assert.equal(d.company.c_positions[0].payUnit,'일당');assert.equal(d.worker.untouched,'보존');
 await p.click('#backBtn');await p.click('#nextBtn');assert.equal(await pay.inputValue(),'20');
 await pay.fill('350');await p.selectOption('[data-field="payUnit"]','월급');await p.click('#nextBtn');await p.click('#nextBtn');assert.match(await p.locator('.summary').innerText(),/350만원 \(월급\)/);
 d=await p.evaluate(()=>JSON.parse(localStorage.getItem('node_company_signup_test_v01')));assert.equal(d.company.c_positions[0].pay,'3500000');assert.equal(d.company.c_positions[0].payUnit,'월급');
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await p.click('#backBtn');await p.click('#backBtn');await pay.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(root,'docs/worker-preferences-2026-11-01/company-'+width+'.png')});
 console.log('PASS company prototype old won restore/exact precision/20만원=200000원/day/month/draft/summary/layout '+width);await context.close();
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
