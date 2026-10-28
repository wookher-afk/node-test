import {identifier,companyRole,manager,transaction} from './worksites.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function object(value,allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail(400,'허용된 JSON 항목을 입력하세요.');
}
function date(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01'||value>'9999-12-31')fail(400,'날짜는 YYYY-MM-DD 형식이어야 합니다.');
 const parsed=new Date(value+'T00:00:00.000Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)fail(400,'실제 존재하는 날짜를 입력하세요.');
 return value;
}
function nextDay(value){
 const d=new Date(value+'T00:00:00.000Z');d.setUTCDate(d.getUTCDate()+1);
 const result=d.toISOString().slice(0,10);return date(result);
}
function input(value){
 object(value,['visibility','lines']);
 const visibility=value.visibility===undefined?'public':value.visibility;
 if(!['public','targeted','private'].includes(visibility))fail(400,'공개 범위를 확인하세요.');
 if(!Array.isArray(value.lines)||!value.lines.length)fail(400,'모집 항목이 하나 이상 필요합니다.');
 return {visibility,lines:value.lines.map(line=>{
  object(line,['occupation_id','resource_mode','allow_partial','pay','payment','dates']);
  const occupation=identifier(line.occupation_id);
  if(!['worker','equipment_and_worker','equipment'].includes(line.resource_mode)||typeof line.allow_partial!=='boolean')fail(400,'모집 유형과 부분 일정 허용 여부를 확인하세요.');
  object(line.pay,['unit','amount_krw']);
  if(line.pay.unit!=='day')fail(400,'이번 API는 일당만 지원합니다. 다른 급여 단위는 변환하지 않습니다.');
  if(!Number.isSafeInteger(line.pay.amount_krw)||line.pay.amount_krw<0)fail(400,'일당 금액은 0 이상의 안전한 정수로 입력하세요.');
  object(line.payment,['mode','due_date']);
  const mode=line.payment.mode;
  if(!['same_day','next_day','date'].includes(mode))fail(400,'지급 조건은 당일·익일·날짜 지정 중 하나여야 합니다.');
  const due=mode==='date'?date(line.payment.due_date):null;
  if(mode!=='date'&&Object.hasOwn(line.payment,'due_date'))fail(400,'당일·익일 지급에는 별도 지급일을 입력하지 않습니다.');
  if(!Array.isArray(line.dates)||!line.dates.length)fail(400,'모집 항목별 작업일이 하나 이상 필요합니다.');
  const seen=new Set();
  const dates=line.dates.map(d=>{
   object(d,['work_date','capacity']);const workDate=date(d.work_date);
   if(seen.has(workDate))fail(400,'같은 모집 항목에 작업일을 중복 입력할 수 없습니다.');seen.add(workDate);
   if(!Number.isInteger(d.capacity)||d.capacity<1||d.capacity>2147483647)fail(400,'정원은 양의 정수여야 합니다.');
   return {work_date:workDate,capacity:d.capacity,payment_due_date:mode==='same_day'?workDate:mode==='next_day'?nextDay(workDate):due};
  }).sort((a,b)=>a.work_date.localeCompare(b.work_date));
  return {occupation_id:occupation,resource_mode:line.resource_mode,allow_partial:line.allow_partial,
   pay:{unit:'day',amount_krw:line.pay.amount_krw},payment:{mode,due_date:due},dates};
 })};
}
async function managedSite(client,siteId,user){
 const site=(await client.query('SELECT id,organization_id,region_id,name,address,location_notes,description,version,is_active FROM worksites WHERE id=$1',[siteId])).rows[0];
 if(!site)fail(404,'대상을 찾을 수 없습니다.');
 if(!manager(await companyRole(client,site.organization_id,user)))fail(403,'이번 내부 공고 API는 현재 업체 owner/manager만 사용할 수 있습니다.');
 return site;
}
async function readPost(client,postId,site){
 const post=(await client.query('SELECT id,worksite_id,visibility,status,created_at,version,created_by,updated_by,updated_at FROM job_posts WHERE id=$1',[postId])).rows[0];
 const revision=(await client.query('SELECT id,organization_id,worksite_snapshot,recorded_at FROM job_post_versions WHERE job_post_id=$1 AND version=$2 AND sealed_at IS NOT NULL',[postId,post.version])).rows[0];
 if(revision&&revision.organization_id!==site.organization_id)fail(409,'현장 소속이 변경된 공고는 기존 귀속 검토가 필요합니다.');
 const lines=(await client.query(`SELECT l.id,l.occupation_id,l.resource_mode,l.daily_pay_krw,l.allow_partial,
  v.payment_mode,v.specified_due_date::text FROM job_lines l LEFT JOIN job_post_version_lines v
  ON v.job_line_id=l.id AND v.post_version_id=$2 WHERE l.job_post_id=$1 ORDER BY l.id`,[postId,revision?.id??null])).rows;
 const dates=(await client.query(`SELECT d.job_line_id,d.work_date::text,d.capacity,v.payment_due_date::text,
  (SELECT count(*)::int FROM matches m JOIN match_terms t ON t.id=m.terms_id JOIN match_dates md ON md.terms_id=t.id
   WHERE t.job_line_id=d.job_line_id AND md.work_date=d.work_date AND m.status IN ('confirmed','completed')) AS confirmed_count
  FROM job_line_dates d JOIN job_lines l ON l.id=d.job_line_id LEFT JOIN job_post_version_dates v
  ON v.job_line_id=d.job_line_id AND v.work_date=d.work_date AND v.post_version_id=$2
  WHERE l.job_post_id=$1 ORDER BY d.job_line_id,d.work_date`,[postId,revision?.id??null])).rows;
 return {...post,worksite_snapshot:revision?.worksite_snapshot??null,promise_version_id:revision?.id??null,
  lines:lines.map(l=>({id:l.id,occupation_id:l.occupation_id,resource_mode:l.resource_mode,allow_partial:l.allow_partial,
   pay:{unit:'day',amount_krw:l.daily_pay_krw},payment:l.payment_mode?{mode:l.payment_mode,due_date:l.specified_due_date?String(l.specified_due_date):null}:null,
   dates:dates.filter(d=>d.job_line_id===l.id).map(d=>({work_date:d.work_date,capacity:d.capacity,confirmed_count:d.confirmed_count,
    remaining_count:Math.max(0,d.capacity-d.confirmed_count),payment_due_date:d.payment_due_date}))}))};
}
export async function jobPostRequest({pool,req,path,body}){
 const bySite=/^\/api\/worksites\/([^/]+)\/job-posts$/.exec(path),byId=/^\/api\/job-posts\/([^/]+)$/.exec(path);
 if(!(bySite&&['GET','POST'].includes(req.method))&&!(byId&&req.method==='GET'))return null;
 const id=identifier((bySite??byId)[1]),b=req.method==='POST'?input(await body(req)):null;
 return transaction(pool,req,async(client,user)=>{
  let siteId=id;
  if(byId){const post=(await client.query('SELECT worksite_id FROM job_posts WHERE id=$1',[id])).rows[0];if(!post)fail(404,'대상을 찾을 수 없습니다.');siteId=post.worksite_id;}
  const site=await managedSite(client,siteId,user);
  if(req.method==='GET'){
   if(byId)return {status:200,data:{job_post:await readPost(client,id,site)}};
   const posts=(await client.query('SELECT id FROM job_posts WHERE worksite_id=$1 ORDER BY id',[id])).rows;
   const result=[];for(const post of posts)result.push(await readPost(client,post.id,site));
   return {status:200,data:{job_posts:result}};
  }
  if(!site.is_active)fail(409,'비활성 현장의 신규 공고 등록 기준은 확인이 필요합니다. 기존 공고 조회는 유지됩니다.');
  for(const line of b.lines)if(!(await client.query('SELECT id FROM occupations WHERE id=$1',[line.occupation_id])).rowCount)fail(400,'등록된 직종 식별자가 아닙니다.');
  const post=(await client.query(`INSERT INTO job_posts(worksite_id,visibility,created_by,created_at,updated_by,updated_at)
   VALUES($1,$2,$3,clock_timestamp(),$3,clock_timestamp()) RETURNING id`,[id,b.visibility,user.id])).rows[0];
  const revision=(await client.query(`INSERT INTO job_post_versions(job_post_id,version,organization_id,worksite_id,worksite_snapshot,visibility,recorded_by)
   VALUES($1,1,$2,$3,$4,$5,$6) RETURNING id`,[post.id,site.organization_id,id,JSON.stringify(site),b.visibility,user.id])).rows[0];
  for(const line of b.lines){
   const saved=(await client.query(`INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw,allow_partial)
    VALUES($1,$2,$3,$4,$5) RETURNING id`,[post.id,line.occupation_id,line.resource_mode,line.pay.amount_krw,line.allow_partial])).rows[0];
   await client.query(`INSERT INTO job_post_version_lines(post_version_id,job_line_id,occupation_id,resource_mode,allow_partial,pay_unit,amount_krw,payment_mode,specified_due_date)
    VALUES($1,$2,$3,$4,$5,'day',$6,$7,$8)`,[revision.id,saved.id,line.occupation_id,line.resource_mode,line.allow_partial,line.pay.amount_krw,line.payment.mode,line.payment.due_date]);
   for(const d of line.dates){
    await client.query('INSERT INTO job_line_dates(job_line_id,work_date,capacity) VALUES($1,$2,$3)',[saved.id,d.work_date,d.capacity]);
    await client.query(`INSERT INTO job_post_version_dates(post_version_id,job_line_id,work_date,capacity,payment_due_date)
     VALUES($1,$2,$3,$4,$5)`,[revision.id,saved.id,d.work_date,d.capacity,d.payment_due_date]);
   }
  }
  await client.query('UPDATE job_post_versions SET sealed_at=clock_timestamp() WHERE id=$1',[revision.id]);
  return {status:201,data:{job_post:await readPost(client,post.id,site)}};
 });
}
