const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..'),KEY='node_03_2_a_v1',CREDENTIALS='node_03_3_credentials_v1';
const record={id:'navigation-test',kind:'loader',major:'토공·기초',middle:'적재',mode:'ability',form:'타이어식',years:'2',specs:[],future:{keep:true}};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.NODE_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const scenario of ['ready','continue','no-role','no-record','draft-cancel','draft-accept','storage-failure','corrupt']){
 const context=await browser.newContext();
 try{
 await context.route('http://127.0.0.1:8033/**',r=>{const file=path.join(ROOT,new URL(r.request().url()).pathname);return r.fulfill({path:fs.statSync(file).isDirectory()?path.join(file,'index.html'):file});});
 const seed={version:2,aRevision:1,roles:scenario==='no-role'?[]:['자가기사'],records:scenario==='no-record'?[]:[record],draft:null};
 if(scenario.startsWith('draft-'))seed.draft={...record,alias:'unsaved draft'};
 const raw=scenario==='corrupt'?'broken':JSON.stringify(seed),credentials='preserve original credential bytes';
 await context.addInitScript(({raw,credentials,KEY,CREDENTIALS})=>{if(!sessionStorage.seeded){localStorage.setItem(KEY,raw);localStorage.setItem(CREDENTIALS,credentials);localStorage.setItem('node_03_2_v1','legacy original');sessionStorage.seeded='1';}},{raw,credentials,KEY,CREDENTIALS});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8033/ui/03-2/');
 if(scenario==='storage-failure')await p.evaluate(()=>Storage.prototype.setItem=function(){throw Error('test write failure');});
 p.on('dialog',d=>scenario==='draft-cancel'?d.dismiss():d.accept());
 if(scenario==='continue')await p.evaluate(()=>document.querySelector('#afterSave').hidden=false);
 await p.click(scenario==='continue'?'#continueNext':'#next',scenario==='continue'?{force:true}:{});
 const moves=['ready','continue','draft-accept'].includes(scenario);
 if(moves){await p.waitForURL('http://127.0.0.1:8033/ui/03-3/');assert.match(await p.title(),/03-3/);}
 else{assert.equal(p.url(),'http://127.0.0.1:8033/ui/03-2/');if(scenario==='no-role'||scenario==='no-record')assert.match(await p.locator('#status').innerText(),/기사 유형.*장비/);}
 const saved=await p.evaluate(({KEY,CREDENTIALS})=>({equipment:localStorage.getItem(KEY),credentials:localStorage.getItem(CREDENTIALS),legacy:localStorage.getItem('node_03_2_v1')}),{KEY,CREDENTIALS});
 assert.equal(saved.credentials,credentials);assert.equal(saved.legacy,'legacy original');
 if(['corrupt','storage-failure','draft-cancel','no-role','no-record'].includes(scenario))assert.equal(saved.equipment,raw);
 else{assert.deepEqual(JSON.parse(saved.equipment).records,seed.records);if(scenario==='draft-accept')assert.equal(JSON.parse(saved.equipment).draft.alias,'unsaved draft');}
 assert.deepEqual(errors,[]);console.log('PASS navigation '+scenario);
 }finally{await context.close();}
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
