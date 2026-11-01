const optionalControls=require('./optional-control.cjs');
const chooseSize=require('./size-control.cjs');
const {chromium}=require(process.env.NODE_BROWSER_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true, ...(process.env.NODE_BROWSER_PATH?{executablePath:process.env.NODE_BROWSER_PATH}:{})});
 try {
 const page=await browser.newPage();optionalControls(page);
 if(process.env.NODE_UI_OFFLINE==='1')await page.route('http://127.0.0.1:8032/ui/03-2/**',route=>{const name=new URL(route.request().url()).pathname.split('/ui/03-2/')[1]||'index.html';const file=path.resolve(__dirname,'../../ui/03-2',name);return route.fulfill(fs.existsSync(file)?{path:file}:{status:404,body:'missing'});});if(process.env.NODE_UI_OFFLINE==='1')await page.route('http://127.0.0.1:8032/ui/03-3/**',route=>{const name=new URL(route.request().url()).pathname.split('/ui/03-3/')[1]||'index.html';return route.fulfill({path:path.resolve(__dirname,'../../ui/03-3',name)});});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(process.env.NODE_UI_URL||'http://127.0.0.1:8032/ui/03-2/');
 await page.locator('#roles input').nth(0).check();await page.locator('#roles input').nth(1).check();
 async function fill(mode,kind,major,middle){
 if(mode==='owned')await page.locator('#ownedTab').click();
 await page.selectOption('#major',major);await page.selectOption('#middle',middle);await page.selectOption('#kind',kind);
 await page.selectOption('#form','직접 입력');await page.fill('#formDetail','시험용 형태');await chooseSize(page,'직접 입력');await page.fill('#custom','시험 규격');
 if(!await page.locator('#optionalDetails').evaluate(x=>x.open))await page.locator('#optionalDetails > summary').click();
 if(!await page.locator('#specDetails').evaluate(x=>x.open))await page.locator('#specDetails > summary').click();await page.fill('#spec0','12');await page.fill('#years','5');
 if(mode==='owned'){await page.fill('#maker','시험 제조사');await page.fill('#model','시험 모델');}
 }
 assert.equal(await page.locator('#equipmentOverview #addAbility,#equipmentOverview #addOwned').count(),0);
 assert.equal(await page.locator('#editor + #addEquipmentActions #addAbility,#editor + #addEquipmentActions #addOwned').count(),2);
 // Discoverable add entry points, repeated equipment, both modes, edit/delete and reload.
 for(const mode of ['ability','owned']){
  for(let i=0;i<2;i++){
   await page.click(mode==='ability'?'#addAbility':'#addOwned');
   assert.equal(await page.inputValue('#kind'),'');
   await fill(mode,'loader','토공·기초','적재');await page.click('#submit');
  }
 }
 assert.equal(await page.locator('.card').count(),4);
 assert.match(await page.locator('#equipmentCount').innerText(),/운전 가능 장비 2건 · 보유 장비 2건/);
 for(const index of [0,2]){
  await page.locator('.card').nth(index).getByText('수정',{exact:true}).click();
  await page.fill('#years','9');await page.click('#submit');
  assert.match(await page.locator('.card').nth(index).innerText(),/9년/);
 }
 await page.reload();assert.equal(await page.locator('.card').count(),4);
 for(const index of [2,0])await page.locator('.card').nth(index).getByText('삭제',{exact:true}).click();
 await page.reload();assert.match(await page.locator('#equipmentCount').innerText(),/운전 가능 장비 1건 · 보유 장비 1건/);
 await page.click('#addAbility');await fill('ability','loader','토공·기초','적재');
 const beforeCancel=await page.inputValue('#kind');
 page.removeAllListeners('dialog');page.once('dialog',d=>d.dismiss());await page.click('#addOwned');
 assert.equal(await page.inputValue('#kind'),beforeCancel);assert.equal(await page.locator('.card').count(),2);
 page.on('dialog',d=>d.accept());
 await page.evaluate(()=>{localStorage.removeItem('node_03_2_v1');localStorage.removeItem('node_03_2_a_v1');});await page.reload();
 await page.locator('#roles input').nth(0).check();await page.locator('#roles input').nth(1).check();
 await fill('ability','loader','토공·기초','적재');await page.fill('#options','<img src=x onerror=alert(1)>');await page.click('#submit');
 await fill('owned','dump-truck','운반·차량','운반');await page.click('#submit');
 assert.equal(await page.locator('.card').count(),2);assert.equal(await page.locator('.card img').count(),0);
 await page.locator('.card').first().getByText('수정',{exact:true}).click();await page.fill('#years','8');await page.click('#submit');assert.match(await page.locator('.card').first().innerText(),/8년/);
 await page.reload();assert.equal(await page.locator('#roles input:checked').count(),2);assert.equal(await page.locator('.card').count(),2);
 await page.locator('.card').first().getByText('수정',{exact:true}).click();await page.fill('#alias','작성 중');await page.reload();assert.equal(await page.inputValue('#alias'),'작성 중');await page.click('#cancel');
 await page.locator('.card').last().getByText('삭제',{exact:true}).click();await page.reload();assert.equal(await page.locator('.card').count(),1);
 await page.click('#next');await page.waitForURL('**/03-3/');await page.goto(process.env.NODE_UI_URL||'http://127.0.0.1:8032/ui/03-2/');await page.click('#previous');assert.equal(await page.locator('#review').isVisible(),true);
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 // Equipment isolation, search, form linkage, options and required actual name.
 await page.click('#back');await page.click('#abilityTab');
 await page.fill('#search','바브캣');assert.match(await page.locator('#searchResults').innerText(),/스키드로더/);await page.locator('#searchResults button').first().click();
 await page.selectOption('#form','바퀴식 스키드스티어');await page.fill('#years','7');await page.fill('#alias','스키드 경력');await page.locator('#optionChecks input').first().check();
 await page.selectOption('#major','운반·차량');assert.equal(await page.inputValue('#years'),'');assert.equal(await page.inputValue('#alias'),'');assert.equal(await page.locator('#optionChecks input:checked').count(),0);
 await page.reload();await page.fill('#search','바브캣');await page.locator('#searchResults button').first().click();assert.equal(await page.inputValue('#years'),'');assert.equal(await page.inputValue('#alias'),'');assert.equal(await page.locator('#optionChecks input:checked').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('node_03_2_a_v1')).draft.equipmentDrafts['skid-loader'].years),'7');
 await page.reload();assert.equal(await page.inputValue('#years'),'');
 await page.selectOption('#major','기타');await page.selectOption('#middle','직접 등록');await page.selectOption('#kind','other');
 await page.selectOption('#form','직접 입력');await page.fill('#formDetail','시험');await chooseSize(page,'직접 입력');await page.fill('#custom','시험');await page.fill('#years','1');
 await page.click('#submit');assert.equal(await page.locator('.card').count(),1);await page.fill('#actualName','   ');await page.click('#submit');assert.equal(await page.locator('.card').count(),1);await page.fill('#actualName','특수 시험 장비');await page.click('#submit');assert.match(await page.locator('.card').last().innerText(),/특수 시험 장비/);
 assert.equal(await page.locator('#ability,#months').count(),0);assert.doesNotMatch(await page.locator('body').innerText(),/운전능력 상태|추가 경력/);
 await fill('owned','loader','토공·기초','적재');await page.selectOption('#form','타이어식');assert.doesNotMatch(await page.locator('#size').innerText(),/3루베/);await chooseSize(page,'직접 입력');await page.fill('#custom','이전 로더 호칭');await page.fill('#model','수동 모델');await page.selectOption('#form','궤도식');assert.equal(await page.inputValue('#size'),'');assert.equal(await page.inputValue('#custom'),'');assert.equal(await page.inputValue('#model'),'수동 모델');
 // Every legacy ID, both record modes, unknown IDs, and an in-progress forklift edit.
 const legacyNames=['굴착기','로더','불도저','천공기','항타기','덤프트럭','카고트럭','트레일러','지게차','크레인','고소작업대\\(자주식\\)','롤러','믹서트럭','펌프카','발전기','콤프레서','기타'];
 await page.evaluate(()=>{
  const records=Array.from({length:17},(_,i)=>({id:'old-'+i,kind:i%2?i:String(i),mode:i%2?'owned':'ability',major:i===8?'인양·고소':'old',middle:'인양',specs:['kept-'+i],alias:'alias-'+i,maker:'maker',model:'model',years:'2',months:'3'}));
  records.push({id:'unknown',kind:'99',mode:'ability',major:'unknown',middle:'unknown',specs:['unknown-kept']});
  localStorage.removeItem('node_03_2_a_v1');localStorage.setItem('node_03_2_v1',JSON.stringify({version:1,roles:['자가기사'],records,draft:{...records[8],editing:'old-8',form:'직접 입력',formDetail:'기존 형태',size:'직접 입력',custom:'기존 규격'}}));
 });
 await page.reload();
 for(let i=0;i<17;i++)assert.match(await page.locator('.card h3').nth(i).innerText(),new RegExp(legacyNames[i]));
 assert.match(await page.locator('.card h3').nth(17).innerText(),/미확인 장비/);
 assert.equal(await page.inputValue('#kind'),'forklift');assert.equal(await page.inputValue('#major'),'운반·차량');assert.equal(await page.inputValue('#middle'),'하역');
 assert.equal(await page.inputValue('#spec0'),'kept-8');assert.equal(await page.inputValue('#custom'),'기존 규격');
 const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('node_03_2_a_v1')));
 assert.equal(migrated.version,2);assert.equal(migrated.records[8].kind,'forklift');assert.equal(migrated.records[9].kind,'crane');assert.equal(migrated.records[16].kind,'other');assert.equal(migrated.records[17].kind,'99');
 for(let i=0;i<17;i++){
  assert.equal(migrated.records[i].id,'old-'+i);assert.deepEqual(migrated.records[i].specs,['kept-'+i]);assert.equal(migrated.records[i].alias,'alias-'+i);assert.equal(migrated.records[i].mode,i%2?'owned':'ability');
 }
 const stable=await page.evaluate(()=>{
  const c=window.NODE_CATALOG;const before=c.items.map(x=>c.migrateEntry({kind:x.id}).kind);c.items.reverse();
  const after=before.map(kind=>c.migrateEntry({kind}).kind);c.items.reverse();return {before,after,ids:c.items.map(x=>x.id)};
 });
 assert.deepEqual(stable.after,stable.before);assert.equal(new Set(stable.ids).size,stable.ids.length);
 await page.reload();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('node_03_2_a_v1'))),migrated);
 await page.click('#cancel');
 for(const mode of ['ability','owned']){
  if(mode==='ability')await page.click('#abilityTab');
  for(const kind of ['forklift','telehandler']){
   await fill(mode,kind,'운반·차량','하역');await page.click('#submit');
   assert.match(await page.locator('.card').last().innerText(),/운반·차량 → 하역/);
  }
 }
 await page.selectOption('#major','인양·고소');await page.selectOption('#middle','인양');
 assert.deepEqual(await page.locator('#kind option').evaluateAll(xs=>xs.map(x=>x.value)),['','crane','cargo-crane','tower-crane']);
 await page.reload();assert.equal(await page.locator('.card').count(),22);
 await page.evaluate(()=>{localStorage.removeItem('node_03_2_v1');localStorage.removeItem('node_03_2_a_v1');});await page.reload();await page.selectOption('#major','토공·기초');await page.selectOption('#middle','굴착');await page.selectOption('#kind','excavator');for(const [form,sizes] of Object.entries({'미니':['008','010','015','017','020','025','030','035'],'궤도식 (LC)':['02LC','03LC','04LC','06LC','08LC','10LC'],'타이어식 (W)':['03W','06W','08W'],'대형 굴착기':['300','300LC','320','360','380','380LC','420','460','460LC']})){
 await page.selectOption('#form',form);
 assert.deepEqual(await page.locator('#size option').evaluateAll(xs=>xs.map(x=>x.value)),['',...sizes,'직접 입력']);
 assert.deepEqual(await page.locator('#size option').evaluateAll(xs=>xs.map(x=>x.textContent)),['선택하세요',...sizes,'직접 입력']);
 }
 await page.selectOption('#form','타이어식 (W)');await chooseSize(page,'06W');assert.equal(await page.inputValue('#spec0'),'');
 await page.locator('#optionChecks input').nth(0).check();await page.locator('#optionChecks input').nth(1).check();await page.fill('#years','5');await page.reload();assert.equal(await page.locator('#optionChecks input:checked').count(),2);
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(350);await page.screenshot({path:'/private/tmp/node-03-2-'+viewport.width+'.png'});await page.locator('#optionsTitle').evaluate(el=>el.scrollIntoView({behavior:'instant'}));await page.waitForTimeout(350);await page.screenshot({path:'/private/tmp/node-03-2-options-'+viewport.width+'.png'});}
 assert.deepEqual(errors,[]);console.log('PASS: dual roles, dependent selections, ability/ownership, specs, options escaping, add/edit/delete, autosave/draft restore, navigation review, desktop/mobile overflow; loading categories in both modes; all 17 legacy IDs and unknown ID; draft migration and idempotent reload; no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
