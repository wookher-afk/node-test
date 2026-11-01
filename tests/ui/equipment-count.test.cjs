// Local draft -> server request -> reload/count regression; no real account writes.
const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..'),out=path.join(ROOT,'docs/equipment-count-2026-11-01');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{for(const width of [390,1440]){
const c=await b.newContext({viewport:{width,height:900}});let saved=null,version=0,puts=0;const errors=[];
await c.route('http://127.0.0.1:8044/**',async r=>{const u=new URL(r.request().url());if(u.pathname==='/api/me')return r.fulfill({json:{account:{id:88001}}});if(u.pathname==='/api/me/worker-registration'){if(r.request().method()==='PUT'){const body=r.request().postDataJSON();assert.equal(body.version,version);saved=body.document;version++;puts++;}return r.fulfill({json:{document:saved,version}});}const f=path.join(ROOT,u.pathname==='/worker-registration'?'web/worker-registration.html':u.pathname);return r.fulfill({path:fs.statSync(f).isDirectory()?path.join(f,'index.html'):f});});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
async function load(){await p.goto('http://127.0.0.1:8044/worker-registration');await p.waitForFunction(()=>document.querySelector('#equipment').contentWindow.NODE_ALPHA_EXPORT);return p.frames().find(f=>f.url().includes('/ui/03-2/'));}
let f=await load();await f.check('#roles input[value="자가기사"]');await f.check('#roles input[value="데모기사"]');
async function add(owned){await f.click(owned?'#addOwned':'#addAbility');await f.selectOption('#major','토공·기초');await f.selectOption('#middle','굴착');await f.selectOption('#kind','excavator');await f.selectOption('#form','미니');await f.locator('#sizeChecks input').first().check();await f.click('#submit');}
await add(false);assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건/);assert.equal(puts,0);
await p.screenshot({path:path.join(out,`before-reload-${width}.png`),fullPage:true});
f=await load();assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건/,'unsent local equipment must survive entry');
await add(true);assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건 · 보유 장비 1건/);
await f.locator('#list article').first().getByRole('button',{name:'수정',exact:true}).click();await f.locator('#optionalDetails > summary').click();await f.fill('#years','7');await f.click('#submit');
await p.selectOption('#province','11');await p.click('#addRegion');await p.fill('#pay','20');await p.click('#save');await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('서버에 저장했습니다'));
assert.equal(saved.abilities.length,1);assert.equal(saved.ownedEquipment.length,1);assert.equal(saved.abilities[0].years,'7');assert.deepEqual(saved.roles,['자가기사','데모기사']);
f=await load();assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건 · 보유 장비 1건/);assert.equal(await f.locator('#list article').count(),2);
// A newer server document must win; preserve the old local original separately.
const raw=await p.evaluate(()=>localStorage.getItem('node_alpha_equipment_88001'));
saved.abilities[0].years='9';version++;
f=await load();assert.match(await f.locator('#list article').first().innerText(),/9년/);
assert(await p.evaluate(raw=>Object.keys(localStorage).filter(k=>k.startsWith('node_alpha_equipment_88001_backup_')).some(k=>localStorage.getItem(k)===raw),raw));
// A malformed cache must also be backed up without hiding valid server records.
await p.evaluate(()=>localStorage.setItem('node_alpha_equipment_88001','{invalid original'));
f=await load();assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건 · 보유 장비 1건/);
assert(await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('node_alpha_equipment_88001_backup_')).some(k=>localStorage.getItem(k)==='{invalid original')));

assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
await p.screenshot({path:path.join(out,`after-${width}.png`),fullPage:true});console.log('PASS draft/reload/count/roles/classification/edit/server-request/restore/layout '+width);await c.close();}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
