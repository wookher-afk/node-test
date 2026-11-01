import {validateRegistration,validateTechnicalRegistration} from './worker-registration.js';
import {validateCompanyRegistration} from './company-registration.js';
import {validateRequiredMatch,WORKER_REQUIRED_KEYS} from '../ui/03-2/required-match.js';

const result=(status,reason)=>({status,reason});
const unknown=reason=>result('unknown',reason);
const compare=(ok,reason)=>result(ok?'pass':'fail',reason);
function schedule(p){
 const a=p.availability||{mode:'dates',dates:p.availableDates};
 if(a.mode==='always')return a;
 if(a.mode==='dates'&&a.dates?.length)return a;
 if(a.mode==='range'&&a.start&&a.end)return a;
 return null;
}
function scheduleCheck(w,c){
 const a=schedule(w),b=schedule(c);
 if(!a||!b)return unknown('일정 자료 부족');
 if(b.mode==='always')return unknown('업체의 실제 작업일 미지정');
 if(a.mode==='always')return compare(true,'항상 가능');
 const contains=d=>a.mode==='dates'?a.dates.includes(d):a.start<=d&&d<=a.end;
 if(b.mode==='dates')return compare(b.dates.every(contains),'업체 지정일 전체 포함');
 if(a.mode==='range')return compare(a.start<=b.start&&a.end>=b.end,'업체 기간 전체 포함');
 // Avoid generating an unbounded date range; explicit dates must cover every day.
 const days=(Date.parse(b.end)-Date.parse(b.start))/86400000+1;
 return compare(days<=a.dates.length&&a.dates.filter(d=>d>=b.start&&d<=b.end).length===days,'업체 기간 전체 포함');
}

/** Pure read-only comparison. Passing preferences never asserts legal eligibility. */
export function compareRegistration(worker,company,lineId){
 const checks={};
 try{
  const w=structuredClone(worker),c=structuredClone(company);
  validateCompanyRegistration(c);
  if(w.requiredMatch!==undefined)validateRequiredMatch(w.requiredMatch,WORKER_REQUIRED_KEYS);
  if(w.roles?.length)validateRegistration(w);
  if(w.technicalRegistration)validateTechnicalRegistration(w.technicalRegistration);
  if(!w.roles?.length&&!w.technicalRegistration)throw Error('작업자 등록 없음');
  const line=c.lines.find(l=>l.id===lineId);
  if(!line)throw Error('모집항목 없음');
  const required=[...new Set([...(w.requiredMatch||[]),...(line.requiredMatch||[])])];
  checks.requiredSelection=w.requiredMatch===undefined||line.requiredMatch===undefined?unknown('양측 필수조건 선택 자료 없음'):compare(true,'양측 필수조건 합집합 적용');
  let abilities=[];
  if(line.resourceMode==='technical_worker'){
   const t=w.technicalRegistration;
   checks.workAbility=t?compare(t.occupationCatalogVersion===line.occupationCatalogVersion&&line.occupationIds.every(id=>t.occupationIds.includes(id)),'한 사람이 요구 직종 전부 보유'):compare(false,'등록 직종 없음');
   checks.experience=line.minExperienceMonths===0?compare(true,'최소 경력 0개월'):unknown('직종별 경력 미저장');
  }else{
   // Catalog values are canonical identifiers: never infer size compatibility.
   // Keep this gate independent of optional preferences and future ranking rules.
   const sameEquipment=(w.abilities||[]).filter(a=>a.kind===line.kind&&a.form===line.form);
   const exactSpecs=sameEquipment.filter(a=>a.size&&a.size===line.size&&a.form!=='직접 입력'&&a.size!=='직접 입력');
   checks.equipmentSpec=line.form==='직접 입력'||line.size==='직접 입력'?unknown('직접 입력 규격의 동등성 판정 미지원'):exactSpecs.length?compare(true,'기종·형태·규격 정확 일치'):sameEquipment.some(a=>!a.size)?unknown('장비 규격 미입력'):compare(false,'정확히 일치하는 장비 규격 없음: 매칭·추천 제외');
   abilities=exactSpecs.filter(a=>line.optionSelections.every(o=>a.optionSelections?.includes(o)));
   checks.workAbility=['직접 입력'].includes(line.form)||line.size==='직접 입력'?unknown('직접 입력 장비는 자동 동등성 판정 미지원'):compare(abilities.length>0,'기종·형태·규격·요구 옵션 일치');
   checks.experience=line.minExperienceMonths===0?compare(true,'최소 경력 0개월'):abilities.length&&abilities.some(a=>a.years!==''&&Number(a.years)*12>=line.minExperienceMonths)?compare(true,'일치 장비의 등록 경력'):abilities.some(a=>a.years==='')?unknown('해당 장비 경력 미입력'):compare(false,'해당 장비 경력 부족');
  }
  checks.resourceMode=['worker','technical_worker'].includes(line.resourceMode)?compare(true,'인력 모집'):unknown('장비 동반·선택형 모집은 미지원');
  const p=w.preferences,q=line.conditions;
  checks.pay=!p?unknown('희망 급여 없음'):p.payUnit!==q.payUnit?unknown('급여 단위 환산 미지원'):compare(q.minimumPayWon>=p.minimumPayWon,'같은 단위의 정수 원 비교');
  checks.hours=!p?unknown('희망 시간 없음'):compare(p.startTime===q.startTime&&p.endTime===q.endTime,'시작·종료 시각 정확 일치');
  checks.region=!p||p.regionCodeSystem!==q.regionCodeSystem||!p.regionCodes?.length||!q.regionCodes?.length||p.legacyRegions?.length||q.legacyRegions?.length?unknown('공통 지역코드 부족 또는 기존 자유입력 지역'):compare(q.regionCodes.every(code=>p.regionCodes.some(parent=>parent==='00'||code.startsWith(parent))),'업체 지역 전체를 작업자 희망 지역이 포함');
  checks.schedule=p?scheduleCheck(p,q):unknown('가능 일정 없음');
  for(const key of required)if(!checks[key])checks[key]=unknown('상대측 수락 자료·비교 규칙 미지원');
  // Legal qualification verification is deferred beyond the automatic matching MVP.
  // Work dates are mandatory regardless of either side's selected preferences.
  const gates=['requiredSelection','resourceMode','workAbility','experience','schedule',...(checks.equipmentSpec?['equipmentSpec']:[]),...required];
  const conditionStatus=gates.some(k=>checks[k].status==='fail')?'fail':gates.some(k=>checks[k].status==='unknown')?'unknown':'pass';
  return {status:conditionStatus==='pass'?'matched':conditionStatus==='fail'?'not_matched':'indeterminate',matched:conditionStatus==='pass',conditionStatus,required,checks};
 }catch{
  return {status:'indeterminate',matched:false,conditionStatus:'unknown',checks:{registration:unknown('등록 자료 누락 또는 현재 계약과 불일치')}};
 }
}

export async function autoMatchingRequest({pool,req,path,user}){
 const m=/^\/api\/companies\/([1-9]\d*)\/(auto-matches|recommendations|combination-recommendations)$/.exec(path);
 if(!m)return null;
 if(req.method!=='GET')return {status:405,data:{error:'조회만 지원합니다.'}};
 // One snapshot, membership checked in SQL. Never expose another company's results.
 const {rows}=await pool.query(`SELECT c.document AS company,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('accountId',w.account_id::text,'document',w.document,'version',w.version)) FROM ${m[2]==='combination-recommendations'?'(SELECT account_id,document,version FROM worker_alpha_registrations LIMIT 1001)':'worker_alpha_registrations'} w),'[]'::jsonb) AS workers,
   c.version FROM company_alpha_registrations c
   WHERE c.organization_id=$1 AND EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=c.organization_id AND m.account_id=$2)`,[m[1],user.id]);
 if(!rows.length)return {status:404,data:{error:'접근 가능한 업체 등록정보가 없습니다.'}};
 const {company,workers,version}=rows[0];
 if(m[2]==='combination-recommendations'){
  const {recommendCombinations,COMBINATION_POLICY,COMBINATION_LIMITS}=await import('./combination-recommendations.js');
  return {status:200,data:{companyVersion:version,readOnly:true,policy:COMBINATION_POLICY,limits:COMBINATION_LIMITS,...recommendCombinations(company,workers)}};
 }
 if(m[2]==='recommendations'){
  const {recommendWorkers,RECOMMENDATION_POLICY}=await import('./near-recommendations.js');
  return {status:200,data:{companyVersion:version,readOnly:true,policy:RECOMMENDATION_POLICY,temporaryPolicy:false,results:recommendWorkers(company,workers)}};
 }
 return {status:200,data:{companyVersion:version,readOnly:true,results:(company.lines||[]).flatMap(line=>workers.map(w=>({lineId:line.id,workerAccountId:w.accountId,workerVersion:w.version,...compareRegistration(w.document,company,line.id)})))}};
}
