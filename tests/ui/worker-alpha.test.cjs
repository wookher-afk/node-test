const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
(async()=>{require('node:fs').mkdirSync('/private/tmp/node-alpha-pg-verify',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
for(const width of [390,1440]){const context=await browser.newContext({viewport:{width,height:900}});let version=1;
let document={roles:['데모기사'],abilities:[{id:'a',kind:'excavator',mode:'ability',form:'휠',size:'03W',years:'3',specs:[]} ,{id:'b',kind:'excavator',mode:'ability',form:'휠',size:'06W',years:'2',specs:[]}],ownedEquipment:[],preferences:{regions:['서울','기존 미확인 지역'],minimumPayWon:250000,payUnit:'day',startTime:'08:15',endTime:'17:00',availableDates:['2026-11-02'],conditionPriority:['pay','region','hours','equipment'],equipmentPriority:['b','a']}};
let fail=false;const errors=[];
await context.route('http://127.0.0.1:8044/**',async route=>{const req=route.request(),url=new URL(req.url());
if(url.pathname==='/api/me')return route.fulfill({json:{account:{id:42}}});
if(url.pathname==='/api/me/worker-registration'){
 if(req.method()==='PUT'){if(fail)return route.fulfill({status:409,json:{error:'다른 화면에서 변경되었습니다.'}});const b=req.postDataJSON();assert.equal(b.version,version);document=b.document;version++;}
 return route.fulfill({json:{document,version}});
}
const file=url.pathname==='/worker-registration'?path.join(ROOT,'web/worker-registration.html'):path.join(ROOT,url.pathname);
return route.fulfill({path:fs.statSync(file).isDirectory()?path.join(file,'index.html'):file});});
await context.addInitScript(()=>{localStorage.setItem('node_03_2_a_v1','original untouched');localStorage.setItem('node_03_3_credentials_v1','credential original');});
const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8044/worker-registration');
await p.locator('#content').waitFor({state:'visible'});await p.waitForFunction(()=>document.getElementById('equipment').contentWindow.NODE_ALPHA_EXPORT);
assert.equal(await p.inputValue('#pay'),'25');assert.equal(await p.locator('#payDisplay').innerText(),'25만원');assert.match(await p.locator('#regions').innerText(),/기존 미확인 지역/);assert.equal(await p.locator('#start').getAttribute('data-value'),'08:15');
await p.click('#start');assert.deepEqual(await p.locator('#pickMinute option').allTextContents(),['00분','15분','30분']);await p.getByRole('button',{name:'선택 완료'}).click();
await p.selectOption('#province','11');await p.selectOption('#district','11110');await p.click('#addRegion');assert.equal(await p.locator('#regions button').count(),2);
await p.selectOption('#province','00');await p.click('#addRegion');assert.match(await p.locator('#regions').innerText(),/전국/);
await p.selectOption('#schedule','dates');await p.fill('#dateFrom','2026-11-03');await p.click('#addDate');assert.equal(await p.locator('#dates button').count(),2);await p.getByRole('button',{name:'2026-11-02 삭제',exact:true}).click();
assert.match(await p.locator('#equipmentPriority li').first().innerText(),/06W/);
await p.locator('#equipmentPriority li').first().getByText('아래로').click();await p.fill('#pay','30');await p.click('#save');await p.waitForFunction(()=>document.getElementById('notice').textContent.includes('서버에 저장했습니다'));
assert.equal(document.preferences.minimumPayWon,300000);assert.deepEqual(document.preferences.regionCodes,['00']);assert.deepEqual(document.preferences.legacyRegions,['기존 미확인 지역']);assert.equal(document.preferences.startTime,'08:15');assert.deepEqual(document.preferences.availability,{mode:'dates',dates:['2026-11-03']});assert.deepEqual(document.preferences.equipmentPriority,['a','b']);
await p.reload();await p.waitForFunction(()=>document.getElementById('equipment').contentWindow.NODE_ALPHA_EXPORT);assert.equal(await p.inputValue('#pay'),'30');
fail=true;await p.fill('#pay','32');await p.click('#save');await p.waitForFunction(()=>document.getElementById('notice').textContent.includes('다른 화면'));assert.equal(document.preferences.minimumPayWon,300000);assert.equal(await p.inputValue('#pay'),'32');
assert.equal(await p.evaluate(()=>localStorage.getItem('node_03_2_a_v1')),'original untouched');assert.equal(await p.evaluate(()=>localStorage.getItem('node_03_3_credentials_v1')),'credential original');
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
await p.screenshot({path:'/private/tmp/node-alpha-pg-verify/alpha-worker-'+width+'.png',fullPage:true});console.log('PASS Alpha restore/reorder/save/conflict/original-storage/layout '+width);await context.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
