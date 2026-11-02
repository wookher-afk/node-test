import {validateCompanyRegistration} from './company-registration.js';
import {identifier} from './worksites.js';
const fail=message=>{throw Object.assign(new Error(message),{status:422});};
function fields(value,allowed,path){
 if(!value||typeof value!=='object'||Array.isArray(value))fail(`${path}: 객체가 필요합니다.`);
 const unknown=Object.keys(value).filter(k=>!allowed.includes(k));
 if(unknown.length)fail(`${path}: 대응되지 않는 필드 ${unknown.join(', ')}. 공고를 저장하지 않았습니다.`);
}
export function alphaJobPostInput(document,choices,visibility){
 const source=structuredClone(document);
 validateCompanyRegistration(structuredClone(source));
 fields(source,['catalogVersion','company','worksite','lines'],'Alpha');
 fields(source.company,['name','contactName','phone','address','businessNumber','fields'],'company');
 fields(source.worksite,['name','address','qualifications','baseAddress','detailAddress','postcode','food','lodging'],'worksite');
 if(!Array.isArray(choices)||choices.length!==source.lines.length)fail('모든 모집항목의 직종·지급조건·부분 일정 허용 여부를 확인하세요.');
 const ids=new Set();
 for(const choice of choices){
  fields(choice,['line_id','occupation_id','payment','payment_confirmed','occupation_confirmed','allow_partial'],'choices');
  if(ids.has(choice.line_id)||!source.lines.some(l=>l.id===choice.line_id))fail('모집항목 확인 정보가 중복되거나 일치하지 않습니다.');
  ids.add(choice.line_id);identifier(choice.occupation_id);
  if(choice.payment_confirmed!==true||choice.occupation_confirmed!==true||typeof choice.allow_partial!=='boolean')fail('원문 지급조건과의 일치 및 부분 일정 허용 여부를 명시적으로 확인하세요.');
 }
 const lines=source.lines.map((line,index)=>{
  const path=`lines[${index}]`;
  fields(line,['id','major','middle','kind','form','formDetail','size','custom','optionSelections','resourceMode','minExperienceMonths','paymentTerms','headcount','conditions','requiredMatch','difficulty','paymentMethod','taxTerms','otherTerms','occupationIds','occupationCatalogVersion','occupationRequirement'],path);
  fields(line.conditions,['regions','regionCodes','regionCodeSystem','legacyRegions','minimumPayWon','payUnit','startTime','endTime','availableDates','availability'],`${path}.conditions`);
  if(line.conditions.payUnit!=='day')fail(`${path}.conditions.payUnit: 기존 공고는 일급만 지원합니다. 월급은 환산하지 않습니다.`);
  const a=line.conditions.availability||{mode:'dates',dates:line.conditions.availableDates};
  fields(a,['mode','start','end','dates'],`${path}.conditions.availability`);
  if(a.mode==='always')fail(`${path}.conditions.availability: 상시 모집은 실제 작업일을 지정한 뒤 공고로 등록하세요.`);
  const dates=[];
  if(a.mode==='dates')dates.push(...a.dates);
  else for(let d=Date.parse(a.start+'T00:00:00Z'),end=Date.parse(a.end+'T00:00:00Z');d<=end;d+=86400000)dates.push(new Date(d).toISOString().slice(0,10));
  const resource_mode={worker:'worker',technical_worker:'worker',equipment_with_operator:'equipment_and_worker'}[line.resourceMode];
  if(!resource_mode)fail(`${path}.resourceMode: 선택형 모집은 단일 유형으로 임의 변환하지 않습니다.`);
  const choice=choices.find(c=>c.line_id===line.id);
  return {occupation_id:choice.occupation_id,resource_mode,allow_partial:choice.allow_partial,
   pay:{unit:'day',amount_krw:line.conditions.minimumPayWon},payment:choice.payment,
   dates:dates.map(work_date=>({work_date,capacity:line.headcount})),alpha_conditions:structuredClone(line)};
 });
 return {visibility,lines};
}
