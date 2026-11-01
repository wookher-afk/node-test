const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
for(const width of [320,390,1440]){const context=await browser.newContext({viewport:{width,height:900}});await context.route('http://127.0.0.1:8046/**',route=>{const path=require('node:path');return route.fulfill({path:path.join(__dirname,'../..',new URL(route.request().url()).pathname.replace(/\/$/,'/index.html'))});});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:8046/ui/03-2/');await p.waitForFunction(()=>document.querySelector('#editor').dataset.stage);
const visible=async(id,value)=>assert.equal(await p.locator('#'+id).isVisible(),value,id);
await visible('major',true);for(const id of ['middle','kind','form','sizeField','optionsStage'])await visible(id,false);
const item=await p.evaluate(()=>window.NODE_CATALOG.items.find(x=>x.id==='excavator'));
await p.selectOption('#major',item.major);await visible('middle',true);await visible('kind',false);
await p.selectOption('#middle',item.middle);await visible('kind',true);await visible('sizeField',false);
await p.selectOption('#kind',item.id);await visible('form',true);await visible('optionsStage',false);
await p.selectOption('#form','미니');await visible('sizeField',true);await visible('optionsStage',false);
await p.locator('#sizeChecks input').first().check();await visible('optionsStage',true);
await p.locator('#sizeChecks input').nth(1).check();await p.locator('#optionalDetails > summary').click();await p.fill('#years','2');await p.click('#save');await p.reload();assert.equal(await p.locator('#sizeChecks input:checked').count(),2);await visible('optionsStage',true);
await p.click('#submit');assert.equal(await p.locator('.card').count(),2);
await p.locator('.card').first().getByText('수정',{exact:true}).click();await p.locator('#optionalDetails').evaluate(e=>e.open=true);await p.fill('#alias','수정 확인');await p.click('#submit');assert.match(await p.locator('.card').first().innerText(),/수정 확인/);
await p.locator('.card').last().getByText('삭제',{exact:true}).click();assert.equal(await p.locator('.card').count(),1);
await p.selectOption('#major',item.major);await p.selectOption('#middle',item.middle);await p.selectOption('#kind',item.id);await p.selectOption('#form','미니');await p.locator('#sizeChecks input').first().check();await p.selectOption('#form','타이어식 (W)');assert.equal(await p.locator('#sizeChecks input:checked').count(),0);
await p.selectOption('#major','');for(const id of ['middle','kind','form','sizeField','optionsStage'])await visible(id,false);for(const id of ['middle','kind','form','size'])assert.equal(await p.inputValue('#'+id),'');
if(width===320){for(const entry of await p.evaluate(()=>window.NODE_CATALOG.items)){
await p.selectOption('#major',entry.major);await p.selectOption('#middle',entry.middle);
const candidates=await p.locator('#kind option').evaluateAll(xs=>xs.map(x=>x.value).filter(Boolean));
assert.deepEqual(candidates,await p.evaluate(({major,middle})=>window.NODE_CATALOG.items.filter(x=>x.major===major&&x.middle===middle).map(x=>x.id),entry));
await p.selectOption('#kind',entry.id);await visible('sizeField',false);
for(const form of entry.forms){await p.selectOption('#form',form);await visible('sizeField',true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,entry.id+'/'+form);}
}console.log('PASS all 31 catalog kinds/forms/candidates at 320px');await p.selectOption('#major','');}
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await p.screenshot({path:'/private/tmp/node-progressive-'+width+'.png',fullPage:true});console.log('PASS progressive/reset/draft/batch/edit/delete/layout '+width);await context.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
