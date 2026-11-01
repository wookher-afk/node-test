import {WORKER_REQUIRED_KEYS,validateRequiredMatch} from '../ui/03-2/required-match.js';
import {OCCUPATIONS,occupationById} from '../ui/03-2/occupations.js';
import {REGIONS} from '../ui/03-2/regions.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isDeepStrictEqual} from 'node:util';
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../ui/03-2/catalog.js',import.meta.url),'utf8'),context);
const catalog=context.window.NODE_CATALOG;
const classificationKeys=['kind','major','middle','form','formDetail','size','custom','optionSelections'];
function validateEquipment(x,previous){
 // Preserve unchanged legacy classification verbatim; edits must use the current catalog.
 if(previous&&classificationKeys.every(key=>isDeepStrictEqual(x[key],previous[key])))return;
 const item=catalog.items.find(item=>item.id===x.kind);
 if(!item||!item.forms.includes(x.form)||['major','middle'].some(key=>x[key]!==undefined&&x[key]!==item[key]))fail('장비 분류·형태 조합을 확인하세요.');
 if(x.form==='직접 입력'&&!text(x.formDetail))fail('직접 입력한 형태를 확인하세요.');
 const sizes=item.sizesByForm[x.form]||item.sizesByForm['*']||[];
 if(x.size==='직접 입력'){if(!text(x.custom))fail('직접 입력한 현장규격을 확인하세요.');}
 else if(x.size!==''&&!sizes.includes(x.size))fail('장비 형태와 현장규격 조합을 확인하세요.');
 if(x.optionSelections!==undefined&&(!Array.isArray(x.optionSelections)||new Set(x.optionSelections).size!==x.optionSelections.length||x.optionSelections.some(option=>!item.options.includes(option))))fail('장비 옵션을 확인하세요.');
}

const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const text=(v,max=120)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export const MATCHING_DEFAULTS=Object.freeze({payDifferenceWon:50000});
export function validateRegistration(b,previous={}){
 if(!b||typeof b!=='object'||Array.isArray(b))fail('등록 정보를 확인하세요.');
 const {abilities,ownedEquipment,roles,preferences:p}=b;
 if(!Array.isArray(roles)||!roles.length||roles.length>2||new Set(roles).size!==roles.length||roles.some(x=>!['자가기사','데모기사'].includes(x)))fail('기사 유형을 확인하세요.');
 for(const [records,mode] of [[abilities,'ability'],[ownedEquipment,'owned']]){
  if(!Array.isArray(records)||records.length>150)fail('장비는 유형별 150개까지 등록할 수 있습니다.');
  const ids=new Set();
  for(const x of records){if(!x||x.mode!==mode||!text(x.id,100)||ids.has(x.id)||!text(x.kind)||!text(x.form)||typeof x.size!=='string'||x.size.length>120||typeof x.years!=='string'||!/^\d*$/.test(x.years)||Number(x.years)>80)fail('장비 종류·형태·규격·경력을 확인하세요.');ids.add(x.id);validateEquipment(x,(mode==='ability'?previous.abilities:previous.ownedEquipment)?.find(old=>old.id===x.id&&old.mode===mode));}
 }
 if(!abilities.length)fail('운전 가능한 장비를 하나 이상 등록하세요.');
 if(!p||!Array.isArray(p.regions)||!p.regions.length||p.regions.length>30||p.regions.some(x=>!text(x,80))||new Set(p.regions).size!==p.regions.length)fail('희망 지역을 확인하세요.');
 let regionFields={};
 if(p.regionCodes!==undefined){
  const catalog=[{code:'00',name:'전국'},...REGIONS],codes=p.regionCodes,legacy=p.legacyRegions||[];
  if(p.regionCodeSystem!=='kr-lawd-2026-10-01'||!Array.isArray(codes)||codes.length>30||new Set(codes).size!==codes.length||codes.some(c=>!catalog.some(r=>r.code===c))||!Array.isArray(legacy)||legacy.some(x=>!text(x,80))||new Set(legacy).size!==legacy.length||codes.length+legacy.length>30||!codes.length&&!legacy.length)fail('희망 지역 코드를 확인하세요.');
  if(codes.some(c=>codes.some(parent=>parent!==c&&(parent==='00'||c.startsWith(parent)))))fail('전체 지역과 하위 지역을 중복 선택할 수 없습니다.');
  const names=[...codes.map(c=>catalog.find(r=>r.code===c).name),...legacy];
  if(JSON.stringify(names)!==JSON.stringify(p.regions))fail('희망 지역 이름과 코드가 일치하지 않습니다.');
  regionFields={regionCodes:codes,regionCodeSystem:p.regionCodeSystem,legacyRegions:legacy};
 }
 if(!['day','month','hour'].includes(p.payUnit)||!Number.isSafeInteger(p.minimumPayWon)||p.minimumPayWon<=0||p.minimumPayWon>100000000)fail('급여와 단위를 확인하세요.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.startTime)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.endTime)||p.startTime===p.endTime)fail('근무시간을 확인하세요.');
 if(new Set([...abilities,...ownedEquipment].map(x=>x.id)).size!==abilities.length+ownedEquipment.length)fail('장비 식별자가 중복되었습니다.');
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 let scheduleFields={};
 const dates=values=>Array.isArray(values)&&values.length>0&&values.length<=366&&values.every(date)&&new Set(values).size===values.length;
 if(p.availability!==undefined){
  const a=p.availability;
  if(!a||!['always','dates','range'].includes(a.mode))fail('가능 일정을 확인하세요.');
  if(a.mode==='dates'&&!dates(a.dates))fail('가능 날짜를 확인하세요.');
  if(a.mode==='range'&&(!date(a.start)||!date(a.end)||a.start>a.end||a.start<'1900-01-01'||a.end>'2100-12-31'))fail('가능 기간을 확인하세요.');
  if(JSON.stringify(p.availableDates)!==JSON.stringify(a.mode==='dates'?a.dates:[]))fail('가능 일정과 날짜가 일치하지 않습니다.');
  scheduleFields={availability:a.mode==='always'?{mode:'always'}:a.mode==='dates'?{mode:'dates',dates:a.dates}:{mode:'range',start:a.start,end:a.end}};
 }else if(!dates(p.availableDates))fail('가능 일정을 중복 없이 입력하세요.');
 const permutation=(a,expected)=>Array.isArray(a)&&a.length===expected.length&&new Set(a).size===a.length&&a.every(x=>expected.includes(x));
 if(!permutation(p.conditionPriority,['pay','region','hours','equipment']))fail('조건 우선순위를 중복 없이 정하세요.');
 if(!permutation(p.equipmentPriority,abilities.map(x=>x.id)))fail('운전 가능 장비별 선호 순위를 확인하세요.');
 return {...(b.requiredMatch===undefined?{}:{requiredMatch:validateRequiredMatch(b.requiredMatch,WORKER_REQUIRED_KEYS)}),roles,abilities,ownedEquipment,preferences:{...regionFields,...scheduleFields,regions:p.regions,minimumPayWon:p.minimumPayWon,payUnit:p.payUnit,startTime:p.startTime,endTime:p.endTime,availableDates:p.availableDates,conditionPriority:p.conditionPriority,equipmentPriority:p.equipmentPriority}};
}
export function validateTechnicalRegistration(d){
 if(!d||typeof d!=='object'||Array.isArray(d)||d.workerType!=='technical_worker')fail('작업자 유형을 확인하세요.');
 if(d.occupationCatalogVersion!==OCCUPATIONS.version)fail('직종 분류 버전을 확인하세요.');
 const ids=d.occupationIds;
 if(!Array.isArray(ids)||!ids.length||ids.length>OCCUPATIONS.items.length||new Set(ids).size!==ids.length||ids.some(id=>!occupationById.has(id)))fail('직종을 중복 없이 하나 이상 선택하세요.');
 return {...(d.requiredMatch===undefined?{}:{requiredMatch:validateRequiredMatch(d.requiredMatch,WORKER_REQUIRED_KEYS)}),workerType:'technical_worker',occupationCatalogVersion:OCCUPATIONS.version,occupationIds:[...ids]};
}
export async function workerRegistrationRequest({pool,req,path,body,user}){
 const technical=path==='/api/me/technical-registration';
 if(!technical&&path!=='/api/me/worker-registration')return null;
 if(req.method==='GET'){
  const {rows}=await pool.query('SELECT document,version FROM worker_alpha_registrations WHERE account_id=$1',[user.id]);
  const row=rows[0];
  const document=registrationView(row?.document,technical);
  return {status:200,data:{document:document||null,version:row?.version||0,...(row?.document.requiredMatch===undefined?{}:{requiredMatch:row.document.requiredMatch})}};
 }
 if(req.method==='PUT'){
  const b=await body(req);
  if(!Number.isSafeInteger(b.version)||b.version<0)fail('저장 버전을 확인하세요.');
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   const previous=b.version===0?{}:(await c.query('SELECT document FROM worker_alpha_registrations WHERE account_id=$1 FOR UPDATE',[user.id])).rows[0]?.document||{};
   const document=technical?validateTechnicalRegistration(b.document):validateRegistration(b.document,previous);
   const {requiredMatch,...profile}=document;
   const merged=technical?{...previous,roles:previous.roles||[],abilities:previous.abilities||[],ownedEquipment:previous.ownedEquipment||[],technicalRegistration:profile}:{...previous,...profile};
   if(requiredMatch!==undefined)merged.requiredMatch=requiredMatch;
   validateWorkerRequiredMatch(merged);
   const {rows}=b.version===0
    ? await c.query('INSERT INTO worker_alpha_registrations(account_id,document) VALUES($1,$2::jsonb) ON CONFLICT(account_id) DO NOTHING RETURNING document,version',[user.id,JSON.stringify(merged)])
    : await c.query('UPDATE worker_alpha_registrations SET document=$2::jsonb,version=version+1,updated_at=now() WHERE account_id=$1 AND version=$3 RETURNING document,version',[user.id,JSON.stringify(merged),b.version]);
   if(!rows.length){await c.query('ROLLBACK');return {status:409,data:{error:'다른 화면에서 변경되었습니다. 새로고침 후 확인하세요.'}};}
   await c.query("INSERT INTO account_roles(account_id,role) VALUES($1,'worker') ON CONFLICT DO NOTHING",[user.id]);
   await c.query('COMMIT');return {status:200,data:{document:registrationView(merged,technical),version:rows[0].version}};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 return {status:405,data:{error:'지원하지 않는 요청입니다.'}};
}

function registrationView(d,technical){
 const profile=technical?d?.technicalRegistration:d?.roles?.length?Object.fromEntries(Object.entries(d).filter(([key])=>key!=='technicalRegistration')):null;
 return profile?{...profile,...(d.requiredMatch===undefined?{}:{requiredMatch:d.requiredMatch})}:null;
}
export function validateWorkerRequiredMatch(d){
 if(d.requiredMatch===undefined)return;
 for(const key of validateRequiredMatch(d.requiredMatch,WORKER_REQUIRED_KEYS)){
  if(key==='workAbility'){if(!d.abilities?.length&&!d.technicalRegistration?.occupationIds?.length)throw Object.assign(new Error('작업능력을 먼저 등록하세요.'),{status:400});}
  else if(!d.preferences)throw Object.assign(new Error('지역·급여·시간·일정은 장비작업자 희망조건을 먼저 등록하세요.'),{status:400});
 }
}
