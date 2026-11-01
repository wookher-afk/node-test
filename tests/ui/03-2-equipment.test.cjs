const optionalControls=require('./optional-control.cjs');
const chooseSize=require('./size-control.cjs');
const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../ui/03-2'),KEY='node_03_2_a_v1',OLD='node_03_2_v1';
const results=[];let browser;
(async()=>{browser=await chromium.launch({headless:true,executablePath:process.env.NODE_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
async function setup(data={},fault){const context=await browser.newContext({acceptDownloads:true});await context.route('http://127.0.0.1:18032/**',route=>{const name=new URL(route.request().url()).pathname.replace('/ui/03-2/','')||'index.html';const file=path.join(ROOT,name);if(!file.startsWith(ROOT)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});return route.fulfill({path:file});});
await context.addInitScript(({data,fault})=>{if(!sessionStorage.seeded){for(const [k,v]of Object.entries(data))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));sessionStorage.seeded='1';}if(fault){const get=Storage.prototype.getItem,set=Storage.prototype.setItem;window.__originalStorageGet=(key)=>get.call(localStorage,key);let wrote=false;Storage.prototype.getItem=function(k){if(this===localStorage&&(fault==='read'||fault==='readback'&&wrote))throw Error('simulated read failure');return get.call(this,k);};Storage.prototype.setItem=function(k,v){if(this===localStorage){if(['write','quota'].includes(fault))throw new DOMException('simulated quota','QuotaExceededError');wrote=true;}return set.call(this,k,v);};}}, {data,fault});
const page=await context.newPage();optionalControls(page);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});page.on('dialog',d=>d.accept());await page.goto('http://127.0.0.1:18032/ui/03-2/');await openOptional(page);const close=context.close.bind(context);context.close=async()=>{await close();assert.deepEqual(errors,[]);};return {page,context,errors};}
const rec=(kind,extra={})=>({id:'test',kind,mode:'ability',form:'직접 입력',formDetail:'시험 형태',size:'직접 입력',custom:'시험 호칭',years:'2',specs:[],...extra});
const root=(records=[],draft=null,extra={})=>({version:2,roles:['자가기사','데모기사'],records,draft,...extra});
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function openOptional(p){for(const id of ['optionalDetails','specDetails','equipmentFields','equipmentReferences','cargoReference'])if(await p.locator('#'+id).count()&&await p.locator('#'+id).isVisible()&&!await p.locator('#'+id).evaluate(x=>x.open))await p.locator('#'+id+' > summary').click();}
async function select(p,kind){await p.fill('#search',kind); // select by stable catalog ID using visible category controls
const item=await p.evaluate(id=>window.NODE_CATALOG.items.find(x=>x.id===id),kind);await p.selectOption('#major',item.major);await p.selectOption('#middle',item.middle);await p.selectOption('#kind',kind);await openOptional(p);}
async function basic(p,kind='loader'){await select(p,kind);await p.selectOption('#form',kind==='loader'?'타이어식':'직접 입력');if(kind!=='loader'){await p.fill('#formDetail','시험 형태');await chooseSize(p,'직접 입력');await p.fill('#custom','시험 호칭');}await p.fill('#years','3');await openOptional(p);}
async function test(id,fn){if(process.env.TEST_ONLY&&id!==process.env.TEST_ONLY)return;try{await fn();results.push({id,status:'통과'});console.log(id+' PASS');}catch(e){results.push({id,status:'실패',reason:e.stack});console.error(id+' FAIL '+e.message);}}

await test('all28',async()=>{const {page:p,context:c}=await setup();const profiles=await p.evaluate(()=>window.NODE_EQUIPMENT.profiles);assert.equal(Object.keys(profiles).length,28);assert.deepEqual(Object.values(profiles).reduce((a,v)=>(a[v.grade]=(a[v.grade]||0)+1,a),{}),{B:16,C:10,A:2});
for(const [id,profile]of Object.entries(profiles)){
 await basic(p,id);if(id==='other')await p.fill('#actualName','시험 기타');
 assert.equal(await p.locator('#equipmentFields').count(),1);
 for(const width of [390,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 for(const form of await p.locator('#form option').evaluateAll(xs=>xs.map(x=>x.value).filter(Boolean))){await p.selectOption('#form',form);assert.equal(await p.locator('#equipmentFields').count(),1);}
 await p.selectOption('#form','직접 입력');await p.fill('#formDetail','기타 형태');await chooseSize(p,'직접 입력');await p.fill('#custom','직접 호칭');
 for(const [i,f] of profile.fields.entries()){const status=['value','unknown','na','pending',''][i%5];await p.selectOption('[data-equipment-status="'+f.key+'"]',status);if(status==='value')await p.fill('#equipment_'+f.key,'0');if(f.multi){await p.locator('[data-equipment-choice="'+f.key+'"]').nth(0).check();await p.locator('[data-equipment-choice="'+f.key+'"]').nth(1).check();}}
 await p.fill('#spec0','12');await p.click('#save');const before=(await read(p)).draft;await p.reload();assert.deepEqual((await read(p)).draft.equipmentDetails,before.equipmentDetails);
 await p.click('#submit');assert.equal((await read(p)).records.at(-1).kind,id);await p.locator('.card').last().getByText('수정',{exact:true}).click();await openOptional(p);await p.fill('#alias','수정 확인');await p.click('#submit');const r=(await read(p)).records.at(-1);assert.deepEqual(r.equipmentDetails,before.equipmentDetails);assert.equal(r.specs[0],'12');assert.equal(r.alias,'수정 확인');await p.reload();assert.deepEqual((await read(p)).records.at(-1).equipmentDetails,before.equipmentDetails);await p.locator('.card').last().getByText('삭제',{exact:true}).click();assert.equal((await read(p)).records.length,0);
 await p.click('#addOwned');await basic(p,id);if(id==='other')await p.fill('#actualName','보유 기타');assert.equal(await p.evaluate(()=>document.querySelector('#maker').required),false);await p.fill('#maker','시험 제조사');await p.fill('#model','시험 모델');await p.click('#submit');assert.equal((await read(p)).records.at(-1).mode,'owned');await p.locator('.card').last().getByText('삭제',{exact:true}).click();await p.click('#addAbility');
 console.log(id+' lifecycle PASS');
}
for(const id of ['drilling-rig','tow-truck','tower-crane']){await basic(p,id);for(const width of [390,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/private/tmp/equipment-'+id+'-'+width+'.png',fullPage:true});}}
await c.close();});
await test('field-specifications31',async()=>{
 const {page:p,context:c}=await setup();const items=await p.evaluate(()=>window.NODE_CATALOG.items);assert.equal(items.length,31);
 const frozen=['excavator','dump-truck','cargo-truck'];
 for(const item of items){
  await select(p,item.id);
  for(const form of item.forms){
   await p.selectOption('#form',form);
   if(frozen.includes(item.id)){assert.equal(await p.locator('#equipmentPrimary').count(),0);continue;}
   assert.equal(await p.locator('#equipmentPrimary').count(),1);
   assert.match(await p.locator('#equipmentPrimaryTitle').innerText(),/현장 규격/);
   assert.ok(await p.locator('#equipmentPrimary input:not([type=radio]):not([type=checkbox])').count()>0);
   assert.equal(await p.locator('#size').evaluate(x=>x.required),false);
   assert.equal(await p.locator('#custom').evaluate(x=>x.required),false);
   for(const width of [390,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  }
 }
 await select(p,'loader');await p.selectOption('#form','타이어식');await openOptional(p);
 assert.equal(await p.locator('#equipmentPrimary #spec1').count(),1);assert.equal(await p.locator('#equipmentPrimary #equipment_capacityBasis').count(),1);
 assert.match(await p.locator('#equipmentReferences').innerText(),/2\.8㎥/);assert.match(await p.locator('#equipmentReferences').innerText(),/3\.3㎥/);
 assert.equal(await p.inputValue('#spec1'),'');assert.equal(await p.inputValue('#model'),'');assert.equal(await p.inputValue('#size'),'');
 await p.fill('#spec0','12');await p.fill('#spec1','2.8');await p.selectOption('[data-spec-status="spec1"]','unknown');await p.fill('#years','3');await p.click('#submit');
 let r=(await read(p)).records.at(-1);assert.equal(r.specs[0],'12');assert.equal(r.specs[1],'2.8');assert.equal(r.equipmentSpecStates.spec1,'unknown');assert.equal(r.size,'');
 assert.match(await p.locator('.card').last().innerText(),/버킷 용량.*모름/);
 await p.reload();await p.locator('.card').last().getByText('수정',{exact:true}).click();await openOptional(p);assert.equal(await p.inputValue('#spec1'),'2.8');assert.equal(await p.locator('#spec1').isDisabled(),true);
 await p.selectOption('[data-spec-status="spec1"]','value');await p.fill('#spec1','0');await chooseSize(p,'직접 입력');await p.click('#submit');r=(await read(p)).records.at(-1);assert.equal(r.specs[1],'0');assert.equal(r.equipmentSpecStates.spec1,'value');
 await select(p,'telehandler');await p.selectOption('#form','고정식');await p.fill('#spec0','2.5');await p.fill('#spec1','6');await p.fill('#years','3');await p.click('#submit');assert.equal((await read(p)).records.at(-1).kind,'telehandler');
 await select(p,'tow-truck');await p.selectOption('#form','복합 (구난·적재)');await p.fill('#spec0','旧 견인');await p.fill('#equipment_deckLength','8m');await p.selectOption('#form','구난 · 언더리프트');assert.equal(await p.locator('#equipment_deckLength').isVisible(),false);await p.selectOption('#form','적재식 셀프로더');assert.equal(await p.locator('#spec0').isVisible(),false);assert.equal(await p.inputValue('#spec0'),'旧 견인');assert.equal(await p.inputValue('#equipment_deckLength'),'8m');
 await select(p,'pile-driver');await p.selectOption('#form','항타');await p.fill('#equipment_energy','10kJ');await p.selectOption('#form','압입');assert.equal(await p.locator('#equipment_energy').isVisible(),false);await p.selectOption('#form','항타');assert.equal(await p.inputValue('#equipment_energy'),'10kJ');
 await select(p,'tower-crane');await p.selectOption('#form',await p.locator('#form option').evaluateAll(xs=>xs.find(x=>x.value).value));await openOptional(p);await p.fill('#equipment_installedHeight','30m');await p.locator('[data-equipment-choice="installation"][value="미설치"]').check();assert.equal(await p.locator('#equipment_installedHeight').isVisible(),false);await p.reload();assert.equal(await p.inputValue('#equipment_installedHeight'),'30m');assert.equal(await p.locator('#equipment_installedHeight').isVisible(),false);
 await select(p,'loader');await p.selectOption('#form','궤도식');assert.equal(await p.locator('#equipmentReferences').isVisible(),false);await p.selectOption('#form','타이어식');for(const width of [390,1440]){await p.setViewportSize({width,height:1000});await p.screenshot({path:'/private/tmp/equipment-loader-fixed-'+width+'.png',fullPage:true});}
 await c.close();
});

await test('lossless',async()=>{const r=rec('water-truck',{specs:['0','모름','해당 없음','초과1','초과2'],optionSelections:['사라진 옵션'],equipmentDetails:{totalCapacity:{status:'value',value:'0',extra:'원문'},unrecognized:{raw:3}},foreign:{a:1}});const nested={...r,equipmentDrafts:{'water-truck':r,unknown:rec('unknown')}};const old=JSON.stringify(root([r],nested));const {page:p,context:c}=await setup({[OLD]:old});await p.click('#save');await p.reload();const st=await read(p);assert.deepEqual(st.records[0],{...r,major:'운반·차량',middle:'운반'});assert.deepEqual(st.draft.specs,r.specs);assert.deepEqual(st.draft.equipmentDetails.unrecognized,r.equipmentDetails.unrecognized);assert.equal(st.draft.equipmentDetails.totalCapacity.extra,'원문');assert.deepEqual(st.draft.equipmentDrafts['water-truck'],{...r,major:'운반·차량',middle:'운반'});assert.equal(await p.evaluate(k=>localStorage.getItem(k),OLD),old);await p.click('#submit');const saved=(await read(p)).records.at(-1);assert.deepEqual(saved.specs,r.specs);assert.deepEqual(saved.foreign,r.foreign);assert.deepEqual(saved.optionSelections,r.optionSelections);await c.close();});
await test('visual',async()=>{const {page:p,context:c}=await setup();for(const width of [390,1440]){await p.setViewportSize({width,height:1000});await basic(p,'tower-crane');await p.locator('#equipmentFields').scrollIntoViewIfNeeded();await p.screenshot({path:'/private/tmp/equipment-viewport-'+width+'.png'});}await c.close();});
fs.writeFileSync('/private/tmp/node-03-2-equipment-results.json',JSON.stringify(results,null,2));await browser.close();if(results.some(r=>r.status!=='통과'))process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
