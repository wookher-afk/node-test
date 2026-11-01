// Run only against the dedicated disposable preview: original DB is never touched.
const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const assert=require('node:assert/strict'),{randomBytes}=require('node:crypto');
const {Pool}=require('pg');
const base=process.env.NODE_EQUIPMENT_REAL_BASE,db=process.env.DATABASE_URL;
if(base!=='http://127.0.0.1:8054'||new URL(db).pathname!=='/node_test_equipment_count_20261101')throw Error('Dedicated disposable preview required');
(async()=>{const pool=new Pool({connectionString:db}),b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{for(const width of [390,1440]){
const c=await b.newContext({viewport:{width,height:900}}),p=await c.newPage();await p.goto(base+'/');
const api=(path,method='GET',body)=>p.evaluate(async({path,method,body})=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Node-Session':'cookie'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};},{path,method,body});
const email='equipment-count-'+randomBytes(8).toString('hex')+'@example.com',password=randomBytes(24).toString('hex');assert.equal((await api('/api/register','POST',{email,password,name:'장비건수 회귀검증'})).status,201);
async function load(){await p.goto(base+'/worker-registration');await p.waitForFunction(()=>document.querySelector('#equipment').contentWindow.NODE_ALPHA_EXPORT);return p.frames().find(f=>f.url().includes('/ui/03-2/'));}
let f=await load();await f.check('#roles input[value="데모기사"]');await f.click('#addAbility');await f.selectOption('#major','토공·기초');await f.selectOption('#middle','굴착');await f.selectOption('#kind','excavator');await f.selectOption('#form','미니');await f.locator('#sizeChecks input').first().check();await f.click('#submit');
assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건/);assert.equal((await api('/api/me/worker-registration')).data.document,null);
f=await load();assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건/);
await p.selectOption('#province','11');await p.click('#addRegion');await p.fill('#pay','20');await p.click('#save');await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('서버에 저장했습니다'));
const result=(await api('/api/me/worker-registration')).data;assert.equal(result.document.abilities.length,1);const row=(await pool.query('SELECT document,version FROM worker_alpha_registrations r JOIN accounts a ON a.id=r.account_id WHERE a.email=$1',[email])).rows[0];assert.deepEqual(row.document.abilities,result.document.abilities);assert.equal(row.version,result.version);
await api('/api/logout','POST',{});assert.equal((await api('/api/me')).status,401);assert.equal((await api('/api/login','POST',{email,password})).status,200);
f=await load();assert.match(await f.locator('#equipmentCount').innerText(),/운전 가능 장비 1건/);assert.equal(await f.locator('#list article').count(),1);
await p.screenshot({path:`docs/equipment-count-2026-11-01/postgres-${width}.png`,fullPage:true});console.log('PASS real UI -> local draft -> reload -> PUT -> DB -> GET -> logout/login -> count '+width);await c.close();}
}finally{await b.close();await pool.end()}})().catch(e=>{console.error(e);process.exitCode=1});
