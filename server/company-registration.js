import {COMPANY_REQUIRED_KEYS,validateRequiredMatch} from '../ui/03-2/required-match.js';
import {OCCUPATIONS,occupationById} from '../ui/03-2/occupations.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {requireSession} from './access.js';
import {validateRegistration} from './worker-registration.js';
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../ui/03-2/catalog.js',import.meta.url),'utf8'),context);
const catalog=context.window.NODE_CATALOG;
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const text=(s,max=120)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
export function validateClassification(x){
 const item=catalog.items.find(i=>i.id===x.kind);
 if(!item||x.major!==item.major||x.middle!==item.middle||!item.forms.includes(x.form))fail('장비 분류·형태 조합을 확인하세요.');
 if(x.form==='직접 입력'&&!text(x.formDetail))fail('직접 입력한 형태를 확인하세요.');
 const sizes=item.sizesByForm[x.form]||item.sizesByForm['*']||[];
 if(x.size==='직접 입력'){if(!text(x.custom))fail('직접 입력한 현장규격을 확인하세요.');}
 else if(!sizes.includes(x.size))fail('장비 형태와 현장규격 조합을 확인하세요.');
 if(!Array.isArray(x.optionSelections)||new Set(x.optionSelections).size!==x.optionSelections.length||x.optionSelections.some(o=>!item.options.includes(o)))fail('장비 옵션을 확인하세요.');
 return x;
}
export function validateCompanyRegistration(d){
 if(!d||typeof d!=='object'||Array.isArray(d)||d.catalogVersion!==catalog.version)fail('등록 정보와 카탈로그 버전을 확인하세요.');
 if(!d.company||!text(d.company.name)||d.company.name.trim().length<2||!text(d.company.contactName,80)||!text(d.company.phone,40))fail('업체명·담당자·연락처를 확인하세요.');
 if(!d.worksite||!text(d.worksite.name)||!text(d.worksite.address,300))fail('현장명·주소를 확인하세요.');
 if(!Array.isArray(d.lines)||!d.lines.length||d.lines.length>50)fail('모집항목은 1~50개 등록하세요.');
 const optionalText=(value,max)=>value===undefined||(typeof value==='string'&&value.length<=max);
 for(const [value,max] of [[d.company.address,300],[d.company.businessNumber,40],[d.company.fields,500],[d.worksite.qualifications,500],[d.worksite.baseAddress,300],[d.worksite.detailAddress,120],[d.worksite.postcode,5]])if(!optionalText(value,max))fail('업체·현장 추가 정보를 확인하세요.');
 for(const key of ['food','lodging'])if(d.worksite[key]!==undefined&&!['제공','미제공','협의'].includes(d.worksite[key]))fail('식사·숙소 조건을 확인하세요.');
 if(d.worksite.baseAddress!==undefined&&(!text(d.worksite.baseAddress,300)||d.worksite.address!==[d.worksite.baseAddress,d.worksite.detailAddress?.trim()].filter(Boolean).join(' ')))fail('기본주소·상세주소를 확인하세요.');
 const ids=new Set();
 for(const line of d.lines){
  if(!line||!text(line.id,100)||ids.has(line.id))fail('모집항목 식별자를 확인하세요.');ids.add(line.id);
  if(line.requiredMatch!==undefined){validateRequiredMatch(line.requiredMatch,COMPANY_REQUIRED_KEYS);for(const key of ['difficulty','otherTerms'])if(line.requiredMatch.includes(key)&&!text(line[key],key==='difficulty'?500:1000))fail('필수 일치로 지정한 작업·계약 조건을 입력하세요.');}
  const technical=line.resourceMode==='technical_worker';
  if(technical){
   if(line.occupationCatalogVersion!==OCCUPATIONS.version||line.occupationRequirement!=='all_per_person'||!Array.isArray(line.occupationIds)||!line.occupationIds.length||line.occupationIds.length>OCCUPATIONS.items.length||new Set(line.occupationIds).size!==line.occupationIds.length||line.occupationIds.some(id=>!occupationById.has(id)))fail('임시 직종 코드·버전·그룹 조건을 확인하세요.');
   if(['major','middle','kind','form','formDetail','size','custom','optionSelections'].some(key=>line[key]!==undefined))fail('직종 그룹에 장비 분류를 함께 저장할 수 없습니다.');
  }else {validateClassification(line);if(['occupationIds','occupationCatalogVersion','occupationRequirement'].some(key=>line[key]!==undefined))fail('장비 모집에 직종 그룹을 함께 저장할 수 없습니다.');}
  if(!optionalText(line.difficulty,500)||!optionalText(line.otherTerms,1000)||line.paymentMethod!==undefined&&!['계좌이체','현금','협의'].includes(line.paymentMethod)||line.taxTerms!==undefined&&!['세금계산서 발행','원천징수','협의'].includes(line.taxTerms))fail('작업·지급·거래 조건을 확인하세요.');
  if(!Number.isInteger(line.headcount)||line.headcount<1||line.headcount>10000)fail('모집 인원을 확인하세요.');
  if(!Number.isInteger(line.minExperienceMonths)||line.minExperienceMonths<0||line.minExperienceMonths>960)fail('해당 장비 최소 경력(개월)을 확인하세요.');
  if(!text(line.paymentTerms,300)||!['technical_worker','worker','equipment_with_operator','either'].includes(line.resourceMode))fail('급여 지급조건·모집 유형을 확인하세요.');
  if(!line.conditions||!['day','month'].includes(line.conditions.payUnit))fail('일급 또는 월급을 선택하세요.');
  const ability=technical?{id:line.id,mode:'ability',kind:'excavator',form:'타이어식 (W)',size:'',years:''}:{...line,mode:'ability',years:''};
  // Use the worker contract for regions, dates, time and integer won validation.
  const p=validateRegistration({roles:['데모기사'],abilities:[ability],ownedEquipment:[],preferences:{...line.conditions,conditionPriority:['pay','region','hours','equipment'],equipmentPriority:[line.id]}}).preferences;
  delete p.conditionPriority;delete p.equipmentPriority;line.conditions=p;
 }
 return d;
}
export async function companyRegistrationRequest({pool,req,path,body,user}){
 const match=/^\/api\/companies\/([1-9]\d*)\/registration$/.exec(path);
 if(!match)return null;
 const organizationId=match[1];
 let b,document;
 if(req.method==='PUT'){b=await body(req);document=validateCompanyRegistration(b.document);if(!Number.isSafeInteger(b.version)||b.version<0)fail('저장 버전을 확인하세요.');}
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  // Resolve membership from the authenticated account, never browser supplied roles.
  const membership=await c.query("SELECT role FROM organization_memberships WHERE organization_id=$1 AND account_id=$2",[organizationId,user.id]);
  if(!membership.rows.length){await c.query('ROLLBACK');return {status:404,data:{error:'접근할 수 없는 업체입니다.'}};}
  if(req.method==='GET'){
   const {rows}=await c.query('SELECT document,version FROM company_alpha_registrations WHERE organization_id=$1',[organizationId]);
   await c.query('COMMIT');return {status:200,data:rows[0]||{document:null,version:0}};
  }
  if(req.method!=='PUT'){await c.query('ROLLBACK');return {status:405,data:{error:'지원하지 않는 요청입니다.'}};}
  if(membership.rows[0].role!=='owner'){await c.query('ROLLBACK');return {status:403,data:{error:'업체 대표만 등록 정보를 수정할 수 있습니다.'}};}
  await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[organizationId]);
  await requireSession(c,req);
  const current=await c.query('SELECT role FROM organization_memberships WHERE organization_id=$1 AND account_id=$2',[organizationId,user.id]);
  if(current.rows[0]?.role!=='owner'){await c.query('ROLLBACK');return {status:403,data:{error:'업체 수정 권한이 변경되었습니다.'}};}
  const {rows}=b.version===0
   ?await c.query('INSERT INTO company_alpha_registrations(organization_id,document) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING document,version',[organizationId,JSON.stringify(document)])
   :await c.query('UPDATE company_alpha_registrations SET document=$2::jsonb,version=version+1,updated_at=now() WHERE organization_id=$1 AND version=$3 RETURNING document,version',[organizationId,JSON.stringify(document),b.version]);
  if(!rows.length){await c.query('ROLLBACK');return {status:409,data:{error:'다른 화면에서 변경되었습니다. 새로고침 후 확인하세요.'}};}
  await c.query('UPDATE organizations SET name=$2 WHERE id=$1',[organizationId,document.company.name.trim()]);
  await c.query('COMMIT');return {status:200,data:rows[0]};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
