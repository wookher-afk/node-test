// Real Chrome process exits and launches again with the same isolated disk profile.
const {chromium}=require(process.env.NODE_BROWSER_MODULE||'playwright');
const {Pool}=require('pg');
const {spawn}=require('node:child_process');
const {mkdtempSync}=require('node:fs');
const {createHash,randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8049';
const db=new Pool({connectionString:process.env.DATABASE_URL});
let server,context;
async function start(){server=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'8049'},stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('server startup');}
async function stop(){const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;}
(async()=>{assert.equal(new URL(process.env.DATABASE_URL).pathname,'/node_alpha_01_local');await start();
for(const width of [390,1440]){
 const profile=mkdtempSync('/private/tmp/node-session-chrome-');
 async function open(){context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width,height:900}});return context.pages()[0];}
 let p=await open();await p.goto(base+'/?entry=worker');await p.click('#registerTab');await p.fill('#name','지속로그인 검증');await p.fill('#email','persist-'+randomBytes(8).toString('hex')+'@example.com');await p.fill('#password',randomBytes(20).toString('hex'));
 const response=p.waitForResponse(r=>r.url().endsWith('/api/register'));await p.click('#authSubmit');const registered=await response;const registration=await registered.json();assert.equal(registration.token,undefined);await p.waitForURL('**/register/worker');
 const cookie=(await context.cookies()).find(c=>c.name==='node_session');assert(cookie.httpOnly);assert.equal(cookie.sameSite,'Strict');assert(cookie.expires>Date.now()/1000+29*86400);
 assert.equal(await p.evaluate(()=>document.cookie.includes('node_session')),false);assert.equal(await p.evaluate(()=>sessionStorage.getItem('node_auth_token')),null);assert.equal(await p.evaluate(()=>localStorage.getItem('node_auth_token')),null);
 await context.close();p=await open();await p.goto(base);await p.locator('#dashboard').waitFor({state:'visible'});console.log('PASS Chrome full process close/relaunch and real DB authentication '+width);
 await stop();await start();await p.reload();await p.locator('#dashboard').waitFor({state:'visible'});console.log('PASS server restart with existing browser cookie '+width);
 const stolenOrigin=await fetch(base+'/api/me/companies',{method:'POST',headers:{Origin:'https://evil.example',Cookie:'node_session='+cookie.value,'Content-Type':'application/json'},body:JSON.stringify({name:'차단 업체'})});assert.equal(stolenOrigin.status,403);
 await p.goto(base+'/#profile');await p.click('#logout');await p.locator('#welcome').waitFor({state:'visible'});
 assert.equal((await fetch(base+'/api/me',{headers:{Cookie:'node_session='+cookie.value}})).status,401);assert(!(await context.cookies()).some(c=>c.name==='node_session'));console.log('PASS CSRF rejection, logout deletion and replay rejection '+width);
 // Expire only this synthetic account's session, leaving existing sessions intact.
 const hash=createHash('sha256').update(cookie.value).digest('hex');
 const account=registration.account.id;
 const synthetic=randomBytes(32).toString('hex');await db.query("INSERT INTO account_sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()-interval '1 second')",[account,createHash('sha256').update(synthetic).digest('hex')]);
 await context.addCookies([{...cookie,value:synthetic}]);await p.reload();await p.locator('#welcome').waitFor({state:'visible'});assert.equal((await fetch(base+'/api/me',{headers:{Cookie:'node_session='+synthetic}})).status,401);console.log('PASS real DB expired session rejects auto login '+width);
 await context.close();context=null;
}
} )().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(context)await context.close();if(server)await stop();await db.end();});
