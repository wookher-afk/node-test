import {requireSession} from './access.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const fields='id,organization_id,region_id,name,address,location_notes,description,is_active,created_by,created_at,updated_by,updated_at,version';
const permissions=['view','edit','deactivate','confirm_work'];
export function identifier(value){
 if(typeof value!=='string'||! /^(?:[1-9][0-9]*)$/.test(value)||BigInt(value)>9223372036854775807n)fail(400,'식별자는 양의 정수 문자열이어야 합니다.');
 return value;
}
function objectFields(value,allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail(400,'허용되지 않은 입력 항목입니다.');
}
function text(value,max,required=false){
 if(!required&&value===null)return null;
 if(typeof value!=='string'||value.length>max||value.includes('\u0000')||(required&&!value.trim()))fail(400,'문자열 입력값과 길이를 확인하세요.');
 return value.trim()||null;
}
function expectedVersion(value){if(!Number.isInteger(value)||value<1||value>2147483647)fail(400,'현재 version을 정수로 입력하세요.');return value;}
async function companyRole(client,company,user){
 const {rows}=await client.query('SELECT role FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[company,user.id]);
 if(!rows.length)fail(404,'대상을 찾을 수 없습니다.');
 return rows[0].role;
}
function manager(role){return role==='owner'||role==='manager';}
async function siteAccess(client,id,user,action='view'){
 const result=await client.query(`SELECT ${fields} FROM worksites WHERE id=$1`,[id]);
 if(!result.rows.length)fail(404,'대상을 찾을 수 없습니다.');
 const site=result.rows[0],role=await companyRole(client,site.organization_id,user);
 if(manager(role))return site;
 const assignment=(await client.query('SELECT * FROM worksite_assignments WHERE worksite_id=$1 AND account_id=$2 AND organization_id=$3 AND active',[id,user.id,site.organization_id])).rows[0];
 if(!assignment?.can_view)fail(404,'대상을 찾을 수 없습니다.');
 if(action==='manage'||!assignment['can_'+action])fail(403,'해당 현장 업무 권한이 없습니다.');
 return site;
}
async function transaction(pool,req,operation){
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
  await client.query('SELECT pg_advisory_xact_lock(710031,1)');
  // Recheck the real session after the shared lock, on the same database as the
  // membership and worksite rows. Do not retain authorization across requests.
  const user=await requireSession(client,req);
  await client.query("SELECT set_config('node.worksite_actor',$1,true)",[user.id]);
  const result=await operation(client,user);
  await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function duplicates(client,company,name,address){
 // Deterministic advisory warning, not an identity/duplicate verdict. Only the
 // registering organization's rows are considered; no cross-company leakage.
 const {rows}=await client.query(`SELECT count(*)::int AS count FROM worksites WHERE organization_id=$1 AND
  (regexp_replace(lower(name),'[[:space:][:punct:]]','','g')=regexp_replace(lower($2::text),'[[:space:][:punct:]]','','g')
   OR regexp_replace(lower(address),'[[:space:][:punct:]]','','g')=regexp_replace(lower($3::text),'[[:space:][:punct:]]','','g'))`,[company,name,address]);
 return rows[0].count?[{code:'similar_worksite',message:'같은 업체에 이름 또는 주소가 유사한 현장이 있습니다. 등록 내용을 확인하세요.',count:rows[0].count}]:[];
}
async function region(client,value){
 if(value===null)return null;
 const id=identifier(value);
 if(!(await client.query('SELECT id FROM regions WHERE id=$1',[id])).rowCount)fail(400,'등록된 지역 식별자가 아닙니다.');
 return id;
}
function conflict(site,version){if(site.version!==expectedVersion(version))fail(409,'현장 정보가 변경되었습니다. 다시 조회하세요.');}

// Returns null for unrelated routes. No jobs, matches or transaction records are
// selected or changed by these APIs. IDs are strings to preserve bigint precision.
export async function worksiteRequest({pool,req,path,body}){
 let route=/^\/api\/companies\/([^/]+)\/worksites$/.exec(path);
 if(route&&['GET','POST'].includes(req.method)){
  const company=identifier(route[1]);
  return transaction(pool,req,async(client,user)=>{
   const role=await companyRole(client,company,user);
   if(req.method==='GET'){
    const {rows}=await client.query(`SELECT ${fields} FROM worksites s WHERE organization_id=$1 AND
     ($3::boolean OR EXISTS(SELECT 1 FROM worksite_assignments a WHERE a.worksite_id=s.id AND a.account_id=$2 AND a.organization_id=s.organization_id AND a.active AND a.can_view)) ORDER BY id`,[company,user.id,manager(role)]);
    return {status:200,data:{worksites:rows}};
   }
   if(!manager(role))fail(403,'현장 등록 권한이 없습니다.');
   const b=await body(req);objectFields(b,['name','address','location_notes','description','region_id']);
   const name=text(b.name,120,true),address=text(b.address,500,true);
   const notes=b.location_notes===undefined?null:text(b.location_notes,1000),description=b.description===undefined?null:text(b.description,3000);
   const regionId=b.region_id===undefined?null:await region(client,b.region_id);
   const warnings=await duplicates(client,company,name,address);
   const {rows}=await client.query(`INSERT INTO worksites(organization_id,region_id,name,address,location_notes,description,created_by,created_at,updated_by,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,clock_timestamp(),$7,clock_timestamp()) RETURNING ${fields}`,[company,regionId,name,address,notes,description,user.id]);
   return {status:201,data:{worksite:rows[0],warnings}};
  });
 }
 route=/^\/api\/worksites\/([^/]+)(?:\/(deactivate|assignments)(?:\/([^/]+))?)?$/.exec(path);
 if(!route)return null;
 const [,rawId,section,rawAccount]=route;
 const supported=(!section&&['GET','PATCH'].includes(req.method))||(section==='deactivate'&&!rawAccount&&req.method==='POST')||
  (section==='assignments'&&((!rawAccount&&req.method==='GET')||(rawAccount&&['PUT','DELETE'].includes(req.method))));
 if(!supported)return null;
 const id=identifier(rawId),account=rawAccount?identifier(rawAccount):null;
 return transaction(pool,req,async(client,user)=>{
  const action=section==='assignments'?'manage':section==='deactivate'?'deactivate':req.method==='PATCH'?'edit':'view';
  const site=await siteAccess(client,id,user,action);
  if(req.method==='GET'){
   if(section==='assignments'){
    const {rows}=await client.query(`SELECT a.account_id,a.can_view,a.can_edit,a.can_deactivate,a.can_confirm_work,a.active,a.updated_at,
     (a.active AND a.organization_id=$2 AND EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=$2 AND m.account_id=a.account_id)) AS effective
     FROM worksite_assignments a WHERE a.worksite_id=$1 ORDER BY a.account_id`,[id,site.organization_id]);
    return {status:200,data:{version:site.version,assignments:rows}};
   }
   return {status:200,data:{worksite:site}};
  }
  const b=await body(req);
  objectFields(b,section==='assignments'&&req.method==='PUT'?['version','permissions']:!section?['version','name','address','location_notes','description','region_id']:['version']);
  conflict(site,b.version);
  if(section==='assignments'){
   if(req.method==='PUT'){
    objectFields(b.permissions,permissions);
    if(permissions.some(p=>typeof b.permissions[p]!=='boolean')||!b.permissions.view)fail(400,'현장 조회와 각 업무 권한을 불리언으로 명시하세요.');
    if(!(await client.query('SELECT 1 FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[site.organization_id,account])).rowCount)fail(400,'현재 업체 소속인 담당자만 지정할 수 있습니다.');
    await client.query(`INSERT INTO worksite_assignments(worksite_id,organization_id,account_id,can_view,can_edit,can_deactivate,can_confirm_work,created_by,updated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) ON CONFLICT(worksite_id,account_id) DO UPDATE SET
     organization_id=EXCLUDED.organization_id,can_view=EXCLUDED.can_view,can_edit=EXCLUDED.can_edit,can_deactivate=EXCLUDED.can_deactivate,
     can_confirm_work=EXCLUDED.can_confirm_work,active=true,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()`,
     [id,site.organization_id,account,...permissions.map(p=>b.permissions[p]),user.id]);
   }else{
    if(!(await client.query('UPDATE worksite_assignments SET active=false,updated_by=$3,updated_at=clock_timestamp() WHERE worksite_id=$1 AND account_id=$2 AND active',[id,account,user.id])).rowCount)fail(404,'유효한 현장 담당자를 찾을 수 없습니다.');
   }
   const updated=await client.query(`UPDATE worksites SET version=version+1,updated_by=$2,updated_at=clock_timestamp() WHERE id=$1 RETURNING ${fields}`,[id,user.id]);
   return {status:200,data:{worksite:updated.rows[0]}};
  }
  if(section==='deactivate'){
   if(!site.is_active)fail(409,'이미 비활성화된 현장입니다.');
   const {rows}=await client.query(`UPDATE worksites SET is_active=false,version=version+1,updated_by=$2,updated_at=clock_timestamp() WHERE id=$1 RETURNING ${fields}`,[id,user.id]);
   return {status:200,data:{worksite:rows[0]}};
  }
  const updates=[],values=[id];
  for(const [key,max] of [['name',120],['address',500],['location_notes',1000],['description',3000]])if(Object.hasOwn(b,key)){
   values.push(text(b[key],max,key==='name'||key==='address'));updates.push(`${key}=$${values.length}`);
  }
  if(Object.hasOwn(b,'region_id')){values.push(await region(client,b.region_id));updates.push(`region_id=$${values.length}`);}
  if(!updates.length)fail(400,'수정할 항목이 없습니다.');
  values.push(user.id);
  const {rows}=await client.query(`UPDATE worksites SET ${updates.join(',')},version=version+1,updated_by=$${values.length},updated_at=clock_timestamp() WHERE id=$1 RETURNING ${fields}`,values);
  return {status:200,data:{worksite:rows[0]}};
 });
}
