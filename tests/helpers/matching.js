import {pool,one} from './database.js';
const prefix='fixture-'+crypto.randomUUID();let serial=0;
export async function fixture({capacity=1,partial=true,mode='worker',worker,owner}={}) {
 const w=worker || (await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 await pool.query('INSERT INTO worker_profiles(account_id) VALUES($1) ON CONFLICT DO NOTHING',[w]);
 const manager=owner || (await one('INSERT INTO accounts DEFAULT VALUES RETURNING id')).id;
 const org=(await one("INSERT INTO organizations(name) VALUES('가상 업체') RETURNING id")).id;
 await pool.query("INSERT INTO organization_memberships VALUES($1,$2,'owner')",[org,manager]);
 const category=(await one('INSERT INTO occupation_categories(name) VALUES($1) RETURNING id',[prefix+'-'+(++serial)])).id;
 const occ=(await one("INSERT INTO occupations(category_id,name) VALUES($1,'가상 직종') RETURNING id",[category])).id;
 const site=(await one("INSERT INTO worksites(organization_id,name) VALUES($1,'가상 현장') RETURNING id",[org])).id;
 const post=(await one('INSERT INTO job_posts(worksite_id) VALUES($1) RETURNING id',[site])).id;
 const line=(await one('INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw,allow_partial) VALUES($1,$2,$3,250000,$4) RETURNING id',[post,occ,mode,partial])).id;
 await pool.query("INSERT INTO job_line_dates VALUES($1,'2030-06-10',$2),($1,'2030-06-11',$2)",[line,capacity]);
 return {w,manager,org,line,post};
}
export async function match(f,{worker=f.w,version=1,days=['2030-06-10'],equipment=null}={}) {
 const t=(await one('INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash,equipment_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[f.line,worker,version,JSON.stringify({pay:250000}),`v${version}`,equipment])).id;
 for(const day of days)await pool.query('INSERT INTO match_dates VALUES($1,$2)',[t,day]);
 const m=(await one('INSERT INTO matches(terms_id) VALUES($1) RETURNING id',[t])).id;
 return {m,t,worker};
}
export async function approve(f,a){await pool.query("SELECT node_approve_match($1,$2,'worker',$3)",[a.m,a.t,a.worker]);await pool.query("SELECT node_approve_match($1,$2,'company',$3)",[a.m,a.t,f.manager]);}
export const confirm=a=>pool.query('SELECT node_confirm_match($1)',[a.m]);
export const cancel=(a,actor)=>pool.query("SELECT node_cancel_match($1,$2,'가상 취소')",[a.m,actor]);

