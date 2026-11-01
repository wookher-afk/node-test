import {readFile} from 'node:fs/promises';
import http from 'node:http';
import {randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {Pool} from 'pg';
import {digest,requireSession,listOwnCompanies,sessionToken,sessionCookie} from './access.js';
import {worksiteRequest} from './worksites.js';
import {companyRegistrationRequest} from './company-registration.js';
import {workerRegistrationRequest} from './worker-registration.js';
import {autoMatchingRequest} from './auto-matching.js';
import {jobPostRequest} from './job-posts.js';

const scrypt=promisify(scryptCallback);
const pool=new Pool({connectionString:process.env.DATABASE_URL});
for(const key of ['WORKSITE_DATABASE_URL','JOB_POST_DATABASE_URL'])if(process.env[key]){
 const primary=new URL(process.env.DATABASE_URL),other=new URL(process.env[key]);
 if(['hostname','port','pathname','search'].some(field=>primary[field]!==other[field]))throw Error('Service and account connections must use the same database');
}
const worksitePool=process.env.WORKSITE_DATABASE_URL?new Pool({connectionString:process.env.WORKSITE_DATABASE_URL,application_name:'node-worksites-api'}):pool;
const jobPostPool=process.env.JOB_POST_DATABASE_URL?new Pool({connectionString:process.env.JOB_POST_DATABASE_URL,application_name:'node-job-posts-api'}):pool;
const port=Number(process.env.PORT||3000);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const hashPassword=async p=>{const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(p,salt,64)).toString('hex');};
const verifyPassword=async(p,h)=>{if(!h||!h.includes(':'))return false;const [salt,stored]=h.split(':');const candidate=await scrypt(p,salt,64);const original=Buffer.from(stored,'hex');return candidate.length===original.length&&timingSafeEqual(candidate,original);};
async function body(req){
let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>((req.url==='/api/me/worker-registration'||/^\/api\/companies\/\d+\/registration$/.test(req.url))?262144:32768))throw Object.assign(new Error('Request too large'),{status:413});}
let parsed;try{parsed=JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
if(parsed===null||typeof parsed!=='object'||Array.isArray(parsed))throw Object.assign(new Error('JSON object required'),{status:400});
return parsed;
}
async function loginToken(client,id){const token=randomBytes(32).toString('hex');await client.query("INSERT INTO account_sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')",[id,digest(token)]);return token;}
const server=http.createServer(async(req,res)=>{
try{
const path=new URL(req.url,'http://localhost').pathname;
// Cookies are ambient credentials: reject cross-origin writes, including login CSRF.
if(path.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(req.method)){
 const origin=req.headers.origin;
 const expected=(process.env.PUBLIC_ORIGIN||`${req.socket.encrypted?'https':'http'}://${req.headers.host}`);
 if((origin&&origin!==expected)||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'다른 사이트의 요청은 허용하지 않습니다.'});
 if((req.headers.cookie||req.headers['x-node-session']==='cookie')&&!origin&&req.headers['sec-fetch-site']!=='same-origin')return json(res,403,{error:'요청 출처를 확인할 수 없습니다.'});
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(res,415,{error:'JSON 요청이 필요합니다.'});
}
if(req.method==='POST'&&path==='/api/logout'){
 const token=sessionToken(req);if(token)await pool.query('DELETE FROM account_sessions WHERE token_hash=$1',[digest(token)]);
 sessionCookie(res);return json(res,200,{ok:true});
}
if(req.method==='GET'&&(path==='/'||path==='/index.html')){const html=await readFile(new URL('../web/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(html);return;}
if(req.method==='GET'&&['/register/worker','/register/technical'].includes(path)){
 const file=path==='/register/worker'?'worker-entry.html':'technical-registration.html';
 const content=await readFile(new URL('../web/'+file,import.meta.url));
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);return;
}
if(req.method==='GET'&&(path==='/company-registration'||path==='/worker-registration'||path.startsWith('/ui/03-2/')||path.startsWith('/ui/03-3/'))){
 const relative=path==='/company-registration'?'../web/company-registration.html':path==='/worker-registration'?'../web/worker-registration.html':'..'+path+(path.endsWith('/')?'index.html':'');
 if(!/^\/ui\/03-[23]\/[a-zA-Z0-9_.-]*$/.test(path)&&path!=='/worker-registration'&&path!=='/company-registration')return json(res,404,{error:'없는 파일'});
 const file=new URL(relative,import.meta.url);const content=await readFile(file);
 const type=file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':'text/html';
 res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);return;
}
if(req.method==='GET'&&path==='/api/health')return json(res,200,{ok:true});
if(req.method==='POST'&&path==='/api/register'){
const b=await body(req);
if(typeof b.email!=='string'||typeof b.password!=='string'||typeof b.name!=='string')return json(res,400,{error:'이메일, 이름, 비밀번호는 문자열이어야 합니다.'});
const email=b.email.trim().toLowerCase(),password=b.password,name=b.name.trim();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||name.length<2||name.length>80)return json(res,400,{error:'이메일, 이름(2~80자), 비밀번호(10자 이상)를 확인하세요.'});
const client=await pool.connect();try{await client.query('BEGIN');const a=await client.query('INSERT INTO accounts(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,email,display_name',[email,await hashPassword(password),name]);const id=a.rows[0].id;const token=await loginToken(client,id);await client.query('COMMIT');sessionCookie(res,token);return json(res,201,{account:a.rows[0],...(req.headers['x-node-session']==='cookie'?{}:{token})});}catch(e){await client.query('ROLLBACK');if(e.code==='23505')return json(res,409,{error:'이미 가입된 이메일입니다.'});throw e;}finally{client.release();}
}
if(req.method==='POST'&&path==='/api/login'){
const b=await body(req);
if(typeof b.email!=='string'||typeof b.password!=='string')return json(res,400,{error:'이메일과 비밀번호는 문자열이어야 합니다.'});
const email=b.email.trim().toLowerCase(),password=b.password;
const {rows}=await pool.query('SELECT id,email,display_name,password_hash FROM accounts WHERE lower(email)=$1',[email]);
if(!rows.length||!await verifyPassword(password,rows[0].password_hash))return json(res,401,{error:'이메일 또는 비밀번호가 올바르지 않습니다.'});
const token=await loginToken(pool,rows[0].id);sessionCookie(res,token);return json(res,200,{account:{id:rows[0].id,email:rows[0].email,display_name:rows[0].display_name},...(req.headers['x-node-session']==='cookie'?{}:{token})});
}
if(path.startsWith('/api/')){
const user=await requireSession(pool,req);
const autoMatchResponse=await autoMatchingRequest({pool,req,path,user});
if(autoMatchResponse)return json(res,autoMatchResponse.status,autoMatchResponse.data);
const companyRegistrationResponse=await companyRegistrationRequest({pool,req,path,body,user});
if(companyRegistrationResponse)return json(res,companyRegistrationResponse.status,companyRegistrationResponse.data);
const registrationResponse=await workerRegistrationRequest({pool,req,path,body,user});
if(registrationResponse)return json(res,registrationResponse.status,registrationResponse.data);
const jobResponse=await jobPostRequest({pool:jobPostPool,req,path,body});
if(jobResponse)return json(res,jobResponse.status,jobResponse.data);
const siteResponse=await worksiteRequest({pool:worksitePool,req,path,body});
if(siteResponse)return json(res,siteResponse.status,siteResponse.data);
if(req.method==='GET'&&path==='/api/me'){
const roles=await pool.query('SELECT role FROM account_roles WHERE account_id=$1',[user.id]);
const profile=await pool.query('SELECT experience_months FROM worker_profiles WHERE account_id=$1',[user.id]);
const companies=await listOwnCompanies(pool,user);
return json(res,200,{account:user,roles:roles.rows.map(r=>r.role),worker:profile.rows[0]||null,companies});
}
if(req.method==='PUT'&&path==='/api/me/worker'){
const b=await body(req),value=b.experience_months;
// Keep decimal integer strings compatible with existing callers, without
// coercing null, booleans, blank strings, arrays or objects into zero.
const months=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value.trim()):NaN;
if(!Number.isInteger(months)||months<0||months>900)return json(res,400,{error:'경력 개월 수를 확인하세요.'});
const c=await pool.connect();try{await c.query('BEGIN');await c.query("INSERT INTO account_roles(account_id,role) VALUES($1,'worker') ON CONFLICT DO NOTHING",[user.id]);await c.query('INSERT INTO worker_profiles(account_id,experience_months) VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET experience_months=EXCLUDED.experience_months',[user.id,months]);await c.query('COMMIT');return json(res,200,{experience_months:months});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
if(req.method==='POST'&&path==='/api/me/companies'){
const b=await body(req);
if(typeof b.name!=='string')return json(res,400,{error:'업체명은 문자열이어야 합니다.'});
const name=b.name.trim();if(name.length<2||name.length>120)return json(res,400,{error:'업체명은 2~120자여야 합니다.'});
const c=await pool.connect();try{await c.query('BEGIN');const {rows}=await c.query('INSERT INTO organizations(name) VALUES($1) RETURNING id,name',[name]);await c.query('INSERT INTO organization_memberships(organization_id,account_id,role) VALUES($1,$2,$3)',[rows[0].id,user.id,'owner']);await c.query("INSERT INTO account_roles(account_id,role) VALUES($1,'company') ON CONFLICT DO NOTHING",[user.id]);await c.query('COMMIT');return json(res,201,rows[0]);}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

}
return json(res,404,{error:'요청한 기능이 없습니다.'});
}catch(e){if(e.status===401&&!req.headers.authorization&&req.headers.cookie)sessionCookie(res);console.error(e);return json(res,e.status||500,{error:e.status?e.message:'서버 오류'});}
});
server.listen(port,()=>console.log('NODE API listening on '+port));
