// Pure validation and storage boundary. No existing registration key is writable here.
export const KEY='node_03_3_credentials_v1';
export const categories={license:'면허',qualification:'국가기술자격',education:'교육',other:'기타 · 분류 확인 필요'};
const sourceLicense='https://www.gwanak.go.kr/site/gwanak/ex/civilManual/CivilManualFView.do?caIdx=CA00000485';
const sourceQ='https://www.q-net.or.kr/rcv001.do?gId=&gSite=Q&id=rcv00105';
const sourceTraining='https://www.yeonsu.go.kr/main/general/part/construction.asp';
export const catalog=[
 {code:'construction-license',category:'license',name:'건설기계조종사면허',source:sourceLicense},
 {code:'excavator-craftsman',category:'qualification',name:'굴착기운전기능사',kind:'excavator',source:'https://q-net.or.kr/crf005.do?examInstiCd=1&id=crf00505&jmCd=7862'},
 {code:'forklift-craftsman',category:'qualification',name:'지게차운전기능사',kind:'forklift',source:sourceQ},
 {code:'small-machine-training',category:'education',name:'소형건설기계 조종교육',source:sourceLicense},
 {code:'machine-safety-training',category:'education',name:'건설기계조종사 안전교육',source:sourceTraining}
];
export const blank=()=>({schemaVersion:1,revision:0,registrationResponse:'unanswered',records:[],draft:null,imported:[],reviewed:false});
export const form=category=>({category,catalogCode:'',customName:'',licenseNumber:'',scopeText:'',acquiredDate:{state:'',value:''},expiryDate:{state:'',value:''},issuer:'',relatedEquipmentRecordIds:[]});
export const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
export const name=r=>catalog.find(c=>c.code===r.catalogCode)?.name||r.customName;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function keys(x,allowed){if(!object(x)||Object.keys(x).some(k=>!allowed.includes(k)))throw Error('지원하지 않는 데이터 구조');}
function text(x,max=100){return typeof x==='string'&&x.length<=max;}
function dateShape(d,expiry=false){keys(d,['state','value']);if(!['','known','unknown',...(expiry?['not-stated']:[])].includes(d.state)||!text(d.value,10))throw Error('날짜 구조 확인 필요');}
function shape(r){keys(r,['category','catalogCode','customName','licenseNumber','scopeText','acquiredDate','expiryDate','issuer','relatedEquipmentRecordIds','id','revision','verificationStatus','declarationSource','createdAt','updatedAt','legacy','previousDates']);
 if(!Object.hasOwn(categories,r.category)||!text(r.catalogCode)||!text(r.customName)||!text(r.scopeText)||!text(r.issuer)||!Array.isArray(r.relatedEquipmentRecordIds)||r.relatedEquipmentRecordIds.some(x=>!text(x,200)))throw Error('항목 형식 확인 필요');
 if(r.licenseNumber!==undefined&&!text(r.licenseNumber))throw Error('면허번호 형식 확인 필요');
 if(r.catalogCode&&!catalog.some(c=>c.code===r.catalogCode&&c.category===r.category))throw Error('카탈로그 확인 필요');
 dateShape(r.acquiredDate);dateShape(r.expiryDate,true);for(const d of [r.acquiredDate,r.expiryDate])if(d.state!=='known'&&d.value!=='')throw Error('날짜 상태와 값 확인 필요');
 for(const key of ['createdAt','updatedAt'])if(r[key]!==undefined&&(!text(r[key],40)||Number.isNaN(Date.parse(r[key]))))throw Error('기록 시각 확인 필요');
 if(r.verificationStatus!==undefined&&r.verificationStatus!=='unverified')throw Error('검증 상태 확인 필요');
 if(r.declarationSource!==undefined&&!['self','legacy'].includes(r.declarationSource))throw Error('신고 출처 확인 필요');
 if(r.previousDates!==undefined){keys(r.previousDates,['acquiredDate','expiryDate']);for(const [k,v]of Object.entries(r.previousDates))dateShape(v,k==='expiryDate');}
 if(r.legacy!==undefined){keys(r.legacy,['fingerprint','sourceKey','sourceIndex','raw']);if(!text(r.legacy.fingerprint,200)||!text(r.legacy.sourceKey)||!Number.isInteger(r.legacy.sourceIndex)||!object(r.legacy.raw))throw Error('이관 정보 확인 필요');}
}
export function validateState(s){keys(s,['schemaVersion','revision','registrationResponse','records','draft','imported','reviewed','updatedAt']);
 if(s.schemaVersion!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!['unanswered','registered','later','none'].includes(s.registrationResponse)||!Array.isArray(s.records)||!Array.isArray(s.imported)||s.imported.some(x=>!text(x,200))||typeof s.reviewed!=='boolean')throw Error('저장 버전·형식 확인 필요');
 const ids=new Set();for(const r of s.records){shape(r);if(!text(r.id,200)||!r.id||ids.has(r.id)||!Number.isSafeInteger(r.revision)||r.revision<1||r.verificationStatus!=='unverified'||!['self','legacy'].includes(r.declarationSource)||validateForm(r,3,{requireLicenseNumber:false}))throw Error('등록 항목 확인 필요');ids.add(r.id);}
 if(s.registrationResponse==='registered'&&!s.records.length||s.registrationResponse==='none'&&s.records.length)throw Error('단계 응답 확인 필요');
 if(s.draft!==null){keys(s.draft,['form','step','editingId','baseRecordRevision','categoryDrafts']);shape(s.draft.form);if(s.draft.categoryDrafts!==undefined){keys(s.draft.categoryDrafts,Object.keys(categories));Object.values(s.draft.categoryDrafts).forEach(shape);}if(!Number.isInteger(s.draft.step)||s.draft.step<0||s.draft.step>3||!(s.draft.editingId===null||ids.has(s.draft.editingId))||!(s.draft.baseRecordRevision===null||Number.isSafeInteger(s.draft.baseRecordRevision)))throw Error('초안 확인 필요');}
 return s;
}
function realDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function validateForm(r,step=3,{requireLicenseNumber=true}={}){
 if(!Object.hasOwn(categories,r.category)||(!r.catalogCode&&!r.customName.trim())||r.customName.length>100||r.scopeText.length>100)return {step:0,field:'customName',message:'종류와 이름을 확인해 주세요. 직접 입력은 1~100자입니다.'};
 if(r.category==='other'&&r.catalogCode)return {step:0,field:'catalogCode',message:'기타는 직접 입력해 주세요.'};
 if(r.category==='license'&&requireLicenseNumber&&(typeof r.licenseNumber!=='string'||!r.licenseNumber.trim()||r.licenseNumber.length>100))return {step:0,field:'licenseNumber',message:'면허번호를 입력해 주세요.'};
 if(step<1)return null;
 if(!['known','unknown'].includes(r.acquiredDate.state)||r.acquiredDate.state==='known'&&(!realDate(r.acquiredDate.value)||r.acquiredDate.value>today()))return {step:1,field:'acquiredState',message:'취득일을 선택해 주세요. 미래 날짜는 등록할 수 없습니다.'};
 if(r.issuer.length>100)return {step:1,field:'issuer',message:'기관은 100자 이하로 입력해 주세요.'};
 if(step<2)return null;
 if(!['known','unknown','not-stated'].includes(r.expiryDate.state)||r.expiryDate.state==='known'&&!realDate(r.expiryDate.value))return {step:2,field:'expiryState',message:'만료일 상태와 날짜를 확인해 주세요.'};
 if(r.acquiredDate.state==='known'&&r.expiryDate.state==='known'&&r.expiryDate.value<r.acquiredDate.value)return {step:2,field:'expiryValue',message:'만료일은 취득·이수일보다 앞설 수 없습니다.'};
 return null;
}
export function recommendations(storage){try{const a=storage.getItem('node_03_2_a_v1'),raw=a===null?storage.getItem('node_03_2_v1'):a;if(raw===null)return {records:[],message:'운전 가능 장비가 없어도 직접 등록할 수 있습니다.'};const s=JSON.parse(raw);if(![1,2].includes(s.version)||s.aRevision!==undefined&&s.aRevision!==1||!Array.isArray(s.records))throw Error();return {records:s.records.filter(r=>r&&r.mode==='ability'&&typeof r.id==='string'&&typeof r.kind==='string').map(r=>({id:r.id,kind:r.kind,actualName:r.actualName,alias:r.alias,form:r.form,size:r.size,custom:r.custom})),message:'운전 가능 장비 기록만 관련 항목 찾기에 사용합니다. 추천은 보유·법정 적합성 판정이 아닙니다.'};}catch{return {records:[],message:'03-2 자료 확인이 필요합니다. 구키로 대체하지 않으며 직접 등록할 수 있습니다.'};}}
export class Store{
 constructor(storage,locks){this.storage=storage;this.locks=locks;this.raw=null;this.state=blank();this.blocked=false;}
 load(){try{this.raw=this.storage.getItem(KEY);this.state=this.raw===null?blank():validateState(JSON.parse(this.raw));}catch(e){this.blocked=true;throw e;}return structuredClone(this.state);}
 async save(candidate){if(this.blocked)throw Error('원문 복구가 필요해 저장을 중지했습니다.');if(!this.locks)throw Error('안전한 동시 저장을 지원하지 않는 브라우저입니다. 입력을 내보내 주세요.');
 return this.locks.request(KEY,{mode:'exclusive'},async()=>{if(this.storage.getItem(KEY)!==this.raw)throw Error('다른 탭에서 변경했습니다. 현재 입력을 내보낸 뒤 다시 불러오세요. 덮어쓰지 않았습니다.');const next=structuredClone(candidate);next.revision=this.state.revision+1;next.updatedAt=new Date().toISOString();validateState(next);for(const record of next.records){const old=this.state.records.find(x=>x.id===record.id);if(JSON.stringify(old)!==JSON.stringify(record)){const error=validateForm(record);if(error)throw Error(error.message);}}const raw=JSON.stringify(next);this.storage.setItem(KEY,raw);if(this.storage.getItem(KEY)!==raw){this.blocked=true;throw Error('저장 재확인 실패. 현재 입력과 원문을 내보내 주세요.');}this.raw=raw;this.state=next;return structuredClone(next);});}
}
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':object(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export async function legacyCandidates(storage){const candidates=[];for(const key of ['node_worker_v05','node_worker_v04','node_worker_v03']){const raw=storage.getItem(key);if(raw===null)continue;let s;try{s=JSON.parse(raw);if(!Array.isArray(s.licenses))throw Error();}catch{candidates.push({error:key+' 원문 형식 확인 필요 · 자동 대체하지 않습니다.'});continue;}const counts=new Map();for(const [index,item]of s.licenses.entries()){if(!object(item)||typeof item.title!=='string'){candidates.push({error:key+'의 항목 형식 확인 필요'});continue;}const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(item))))).map(x=>x.toString(16).padStart(2,'0')).join('');const n=counts.get(digest)||0;counts.set(digest,n+1);candidates.push({title:item.title,legacy:{fingerprint:digest+':'+n,sourceKey:key,sourceIndex:index,raw:structuredClone(item)}});}}return candidates;}
