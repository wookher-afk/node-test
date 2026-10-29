const {chromium}=require(process.env.NODE_BROWSER_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true, ...(process.env.NODE_BROWSER_PATH?{executablePath:process.env.NODE_BROWSER_PATH}:{})});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(process.env.NODE_UI_URL||'http://127.0.0.1:8032/ui/03-2/');
 await page.locator('#roles input').nth(0).check();await page.locator('#roles input').nth(1).check();
 async function fill(mode,kind,major,middle){
 if(mode==='owned')await page.locator('#ownedTab').click();
 await page.selectOption('#major',major);await page.selectOption('#middle',middle);await page.selectOption('#kind',kind);
 await page.selectOption('#form','직접 입력');await page.fill('#formDetail','시험용 형태');await page.selectOption('#size','직접 입력');await page.fill('#custom','시험 규격');
 await page.fill('#spec0','12');await page.selectOption('#ability','독립 작업 가능');await page.fill('#years','5');await page.fill('#months','6');
 if(mode==='owned'){await page.fill('#maker','시험 제조사');await page.fill('#model','시험 모델');}
 }
 await fill('ability','1','토공·기초','적재');await page.fill('#options','<img src=x onerror=alert(1)>');await page.click('#submit');
 await fill('owned','5','운반·차량','운반');await page.click('#submit');
 assert.equal(await page.locator('.card').count(),2);assert.equal(await page.locator('.card img').count(),0);
 await page.locator('.card').first().getByText('수정',{exact:true}).click();await page.fill('#years','8');await page.click('#submit');assert.match(await page.locator('.card').first().innerText(),/8년 6개월/);
 await page.reload();assert.equal(await page.locator('#roles input:checked').count(),2);assert.equal(await page.locator('.card').count(),2);
 await page.locator('.card').first().getByText('수정',{exact:true}).click();await page.fill('#alias','작성 중');await page.reload();assert.equal(await page.inputValue('#alias'),'작성 중');await page.click('#cancel');
 await page.locator('.card').last().getByText('삭제',{exact:true}).click();await page.reload();assert.equal(await page.locator('.card').count(),1);
 await page.click('#next');assert.equal(await page.locator('#review').isVisible(),true);await page.click('#back');await page.click('#previous');assert.equal(await page.locator('#review').isVisible(),true);
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 assert.deepEqual(errors,[]);console.log('PASS: dual roles, dependent selections, ability/ownership, specs, options escaping, add/edit/delete, autosave/draft restore, navigation review, desktop/mobile overflow; no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
