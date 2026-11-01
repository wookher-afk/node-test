import {KEY,Store,blank,form,categories,catalog,name,today,validateForm,recommendations,legacyCandidates} from './model.js';
const $=id=>document.getElementById(id);
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const store=new Store(storage,navigator.locks);
let state=blank(),draft=null,dirty=false,pending=null,busy=false,categoryDrafts={};
let equipment=recommendations(storage);
function status(message){$('status').textContent=message;}
try{state=store.load();draft=structuredClone(state.draft);categoryDrafts=structuredClone(draft?.categoryDrafts||{});}catch{status('저장 원문을 복원할 수 없습니다. 손상·미지원 정보는 덮어쓰지 않습니다. 원문을 내보내 복구해 주세요.');}
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function button(text,action){const b=el('button',text);b.type='button';b.onclick=action;return b;}
function dateText(d){return d.state==='known'?d.value:d.state==='unknown'?'모름':d.state==='not-stated'?'만료일 기재 없음':'미응답';}
function summary(r){return `${categories[r.category]} · ${name(r)||'이름 미입력'}${r.category==='license'?'\n면허번호: '+(r.licenseNumber||'미입력 · 보완 필요'):''}\n종별·제한·과정: ${r.scopeText||'상세 미확인'}\n취득·이수일: ${dateText(r.acquiredDate)}\n만료일: ${dateText(r.expiryDate)}\n기관: ${r.issuer||'미입력'}\n${r.declarationSource==='legacy'||r.legacy?'이전 입력':'본인 신고'}·미확인\n${r.expiryDate.state==='known'&&r.expiryDate.value<today()?'입력한 만료일 지남 · 법적 유효 판정 아님':''}`;}
function readForm(){if(!draft)return;const r=draft.form;for(const k of ['category','catalogCode','customName','licenseNumber','scopeText','issuer'])r[k]=$(k).value;
 const value=$('acquiredValue').value;
 const acquired=value?{state:'known',value}:r.acquiredDate.state==='unknown'?{state:'unknown',value:''}:{state:'',value:''};
 if(r.acquiredDate.value&&r.acquiredDate.value!==acquired.value)r.previousDates={...r.previousDates,acquiredDate:structuredClone(state.records.find(x=>x.id===draft.editingId)?.acquiredDate||r.previousDates?.acquiredDate||r.acquiredDate)};
 r.acquiredDate=acquired;
 const next={state:$('expiryState').value,value:$('expiryState').value==='known'?$('expiryValue').value:''};if(r.expiryDate.value&&r.expiryDate.state!==next.state)r.previousDates={...r.previousDates,expiryDate:structuredClone(r.expiryDate)};r.expiryDate=next;
 const visible=equipment.records.map(r=>r.id);r.relatedEquipmentRecordIds=[...r.relatedEquipmentRecordIds.filter(id=>!visible.includes(id)),...Array.from($('equipmentLinks').querySelectorAll(':checked')).map(x=>x.value)];}
function catalogChoices(){const category=$('category').value;const items=catalog.filter(x=>x.category===category);$('catalogCode').replaceChildren(new Option('기타 직접 입력',''),...items.map(x=>new Option(x.name,x.code)));}
function refreshFields(){$('licenseNumberLabel').hidden=$('category').value!=='license';$('licenseNumber').required=$('category').value==='license';const item=catalog.find(x=>x.code===$('catalogCode').value);$('customName').hidden=!!item;$('source').replaceChildren();if(item){const a=el('a','공식 명칭 근거 보기');a.href=item.source;a.target='_blank';a.rel='noopener';$('source').append(a,el('span',' · 명칭 참고용이며 개인 자격·법적 적용 확인이 아닙니다.'));}$('expiryValue').hidden=$('expiryState').value!=='known';}
function dateOptions(id,placeholder,max,suffix,value,min=1,descending=false){const items=[];for(let n=min;n<=max;n++)items.push(n);if(descending)items.reverse();$(id).replaceChildren(new Option(placeholder,''),...items.map(n=>new Option(n+suffix,String(n))));$(id).value=value?String(Number(value)):'';}
function renderAcquired(value=''){
 const [year,month,day]=value.split('-'),[currentYear,currentMonth,currentDay]=today().split('-').map(Number);
 dateOptions('acquiredYear','연도',currentYear,'년',year,Math.min(1900,Number(year)||1900),true);
 const maxMonth=Number(year)===currentYear?currentMonth:12;
 dateOptions('acquiredMonth','월',maxMonth,'월',month);
 const maxDay=Number(year)===currentYear&&Number(month)===currentMonth?currentDay:new Date(Number(year)||2000,Number(month)||1,0).getDate();
 dateOptions('acquiredDay','일',maxDay,'일',day);
 $('acquiredValue').value=value;
}
for(const id of ['acquiredYear','acquiredMonth','acquiredDay'])$(id).onchange=()=>{
 const parts=['acquiredYear','acquiredMonth','acquiredDay'].map(id=>$(id).value);
 renderAcquired(parts.some(Boolean)?parts.map((p,i)=>p.padStart(i===0?4:2,'0')).join('-'):'');
 const selected=['acquiredYear','acquiredMonth','acquiredDay'].map(id=>$(id).value);
 $('acquiredValue').value=selected.some(Boolean)?selected.map((p,i)=>p.padStart(i===0?4:2,'0')).join('-'):'';
 readForm();dirty=true;
};
function equipmentName(rec){return rec.kind==='other'?(rec.actualName||'기타 · 명칭 확인 필요'):(window.NODE_CATALOG.items.find(x=>x.id===rec.kind)?.name||'미확인 장비 · '+rec.kind);}
function renderEditor(){ document.querySelector('main').classList.toggle('editing',!!draft);$('editor').hidden=!draft;if(!draft)return;const r=draft.form;$('category').value=r.category;catalogChoices();for(const k of ['catalogCode','customName','licenseNumber','scopeText','issuer'])$(k).value=r[k]??'';renderAcquired(r.acquiredDate.value);$('expiryState').value=r.expiryDate.state;$('expiryValue').value=r.expiryDate.value;
 $('equipmentLinks').replaceChildren();for(const rec of equipment.records){const l=el('label',equipmentName(rec)+' 운전 가능 기록'),i=document.createElement('input');i.type='checkbox';i.value=rec.id;i.checked=r.relatedEquipmentRecordIds.includes(rec.id);l.prepend(i);$('equipmentLinks').append(l);}if(r.relatedEquipmentRecordIds.some(id=>!equipment.records.some(x=>x.id===id)))$('equipmentLinks').append(el('p','연결 장비 변경됨 · 과거 연결은 유지합니다.'));
 $('editorTitle').textContent=draft.editingId?'등록 항목 수정':'새 항목 등록';$('progress').textContent=`입력 ${draft.step+1}/4 · 한 단계씩 확인하세요`;
 document.querySelectorAll('[data-step]').forEach(x=>x.hidden=Number(x.dataset.step)!==draft.step);$('stepBack').hidden=draft.step===0;$('stepNext').hidden=draft.step===3;$('saveEntry').hidden=draft.step!==3;$('entrySummary').textContent=summary(r);$('legacyRaw').hidden=!r.legacy;$('rawEntry').textContent=r.legacy?JSON.stringify(r.legacy.raw,null,2):'';refreshFields();}
function render(){renderRecommendations();const responses={unanswered:'미응답',registered:'등록 있음',later:'나중에 보완',none:'보유 항목 없음'};$('response').textContent=`${state.records.length?state.records.length+'건 등록됨':state.registrationResponse==='unanswered'?'아직 등록한 항목이 없습니다.':responses[state.registrationResponse]}`;$('list').replaceChildren();for(const r of state.records){const card=el('article','');card.className='card';const detail=el('details','');detail.append(el('summary','등록 내용 보기'),el('pre',summary(r)));card.append(el('h3',name(r)),el('p',(r.legacy?'이전 입력':'본인 신고')+'·미확인'+(r.expiryDate.state==='known'&&r.expiryDate.value<today()?' · 만료일 지남':'')),detail);if(r.category==='license'&&!r.licenseNumber?.trim())card.append(el('p','면허번호 입력 필요'));if(r.relatedEquipmentRecordIds.some(id=>!equipment.records.some(x=>x.id===id)))card.append(el('p','연결 장비 변경됨 · 자격 기록은 유지됩니다.'));const actions=el('div','');actions.className='actions';actions.append(button('수정',()=>start(r.category,r)),button('삭제',async()=>{if(draft){status('작성 중인 입력을 저장하거나 취소한 뒤 삭제해 주세요.');return;}if(!confirm(`‘${name(r)}’ 항목과 해당 03-3 원문을 삭제할까요? 이전 시안·장비 저장값은 유지합니다.`))return;const next=structuredClone(state);next.records=next.records.filter(x=>x.id!==r.id);if(!next.records.length)next.registrationResponse='unanswered';next.reviewed=false;await persist(next);}));card.append(actions);$('list').append(card);}renderEditor();}
async function persist(candidate){if(busy)return false;busy=true;document.querySelector('main').inert=true;try{state=await store.save(candidate);draft=structuredClone(state.draft);dirty=false;status('저장했습니다.');render();return true;}catch(e){status('저장되지 않았습니다. '+e.message);return false;}finally{busy=false;document.querySelector('main').inert=false;}}
function start(category,record=null,legacy=null,code=''){if(store.blocked){status('원문 복구가 필요합니다. 저장을 중지했습니다.');return;}if(draft){status('작성 중인 입력을 먼저 저장하거나 취소해 주세요.');$('editorTitle').focus();return false;}categoryDrafts={};draft={form:record?structuredClone(record):form(category),step:0,editingId:record?.id||null,baseRecordRevision:record?.revision||null};if(legacy){draft.form.customName=legacy.title.slice(0,100);draft.form.legacy=legacy.legacy;}draft.form.catalogCode=code||draft.form.catalogCode;dirty=true;renderEditor();$('editorTitle').focus();return true;}
function errorCheck(step){readForm();const error=validateForm(draft.form,step);if(!error)return false;draft.step=error.step;renderEditor();status(error.message);$(error.field==='acquiredState'?'acquiredYear':error.field).focus();return true;}
async function saveEntry(){if(!draft||errorCheck(3))return false;const r=structuredClone(draft.form),old=state.records.find(x=>x.id===draft.editingId);if(draft.editingId&&old?.revision!==draft.baseRecordRevision){status('수정 원본이 달라졌습니다. 입력을 내보내고 다시 불러오세요.');return false;}
 if(r.legacy&&state.imported.includes(r.legacy.fingerprint)&&!draft.editingId){status('이미 가져온 원문입니다. 반복 반영하지 않았습니다.');return false;}
 if(state.records.some(x=>x.id!==draft.editingId&&name(x)===name(r)&&x.category===r.category&&(r.category!=='education'||x.acquiredDate.value===r.acquiredDate.value&&x.issuer===r.issuer))&&!confirm('같은 이름의 등록 항목이 있습니다. 기존 목록을 수정할 수 있습니다. 별도 항목으로 저장할까요?'))return false;
 if(r.category==='license')r.licenseNumber=r.licenseNumber.trim();r.customName=r.catalogCode?'':r.customName.trim();r.scopeText=r.scopeText.trim();r.issuer=r.issuer.trim();r.id=old?.id||crypto.randomUUID();r.revision=(old?.revision||0)+1;r.verificationStatus='unverified';r.declarationSource=r.legacy?'legacy':'self';r.createdAt=old?.createdAt||new Date().toISOString();r.updatedAt=new Date().toISOString();const next=structuredClone(state);next.records=old?next.records.map(x=>x.id===r.id?r:x):[...next.records,r];next.draft=null;next.registrationResponse='registered';next.reviewed=false;if(r.legacy&&!next.imported.includes(r.legacy.fingerprint))next.imported.push(r.legacy.fingerprint);return persist(next);}
function snapshot(){readForm();if(draft)draft.categoryDrafts=structuredClone(categoryDrafts);return {...structuredClone(state),draft:structuredClone(draft),reviewed:false};}
async function perform(action,withDraft=true){let next=withDraft?snapshot():structuredClone(state);if(action==='later')next.registrationResponse='later';if(action==='none'){if(next.records.length){status('등록 목록이 있습니다. 보유 항목 없음으로 변경할 수 없습니다.');return false;}next.registrationResponse='none';}if(action==='complete'&&!next.records.length&&next.registrationResponse==='unanswered'){status('지금 등록하거나 ‘나중에 보완’ 또는 ‘보유 항목 없음’을 선택해 주세요.');return false;}if(action==='complete')next.reviewed=true;if(!await persist(next))return false;if(action==='equipment')location.href='../03-2/';if(action==='complete'){$('review').hidden=false;$('review').focus();}return true;}
function move(action){if(draft){pending=action;$('navigation').hidden=false;$('navigation').scrollIntoView({block:'center'});}else perform(action);}
$('entry').addEventListener('input',()=>{dirty=true;});$('entry').addEventListener('change',()=>{dirty=true;});
$('category').onchange=()=>{const next=$('category').value,old=draft.form.category;$('category').value=old;readForm();categoryDrafts[old]=structuredClone(draft.form);draft.form=categoryDrafts[next]||{...form(next),...(draft.form.legacy?{legacy:structuredClone(draft.form.legacy)}:{})};draft.step=0;renderEditor();};
$('catalogCode').onchange=refreshFields;$('expiryState').onchange=()=>{readForm();refreshFields();};
$('stepNext').onclick=()=>{if(errorCheck(draft.step))return;draft.step++;dirty=true;renderEditor();$('editorTitle').focus();};$('stepBack').onclick=()=>{readForm();draft.step--;dirty=true;renderEditor();$('editorTitle').focus();};
$('entry').onsubmit=e=>{e.preventDefault();saveEntry();};$('cancelEntry').onclick=async()=>{if(!confirm('작성 중인 초안만 삭제할까요? 등록 목록은 유지됩니다.'))return;const next=structuredClone(state);next.draft=null;if(await persist(next))categoryDrafts={};};
$('saveDraft').onclick=()=>persist(snapshot());for(const a of ['later','none','complete'])$(a).onclick=()=>move(a);$('equipmentBack').onclick=()=>move('equipment');
$('stay').onclick=()=>{$('navigation').hidden=true;pending=null;};$('draftAndMove').onclick=async()=>{if(await perform(pending)){$('navigation').hidden=true;pending=null;}};$('saveAndMove').onclick=async()=>{const action=pending;if(await saveEntry()&&await perform(action,false)){$('navigation').hidden=true;pending=null;}};
$('returnList').onclick=()=>{$('review').hidden=true;};$('largeText').onclick=()=>{const on=document.documentElement.classList.toggle('large-text');$('largeText').setAttribute('aria-pressed',String(on));$('largeText').textContent=on?'큰글씨 끄기':'큰글씨 켜기';};
for(const b of document.querySelectorAll('[data-add]'))b.onclick=()=>start(b.dataset.add);
function renderRecommendations(){
 $('suggestions').replaceChildren();$('recommendationReason').textContent=equipment.message+' 장비 운용·기사 유형·소유 여부로 면허 보유를 추정하지 않습니다. 기종·톤수별 법정 면허는 확인되지 않아 특정 면허를 추천하지 않습니다.';
 if(!equipment.records.length)$('suggestions').append(el('p','등록된 운전 가능 장비가 없습니다. 아래에서 면허·자격·교육을 직접 등록할 수 있습니다.'));
 const groups=new Map();for(const rec of equipment.records){const key=rec.kind==='other'?rec.kind+':'+(rec.actualName||rec.id):rec.kind;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(rec);}
 for(const group of groups.values()){const rec=group[0],ids=group.map(x=>x.id);
 const card=el('article','');card.className='equipment-card';card.dataset.equipmentId=rec.id;
 const linked=state.records.filter(r=>r.relatedEquipmentRecordIds.some(id=>ids.includes(id)));
 const licenses=linked.filter(r=>r.category==='license');
 card.append(el('h3',equipmentName(rec)),el('p',group.map(rec=>[rec.alias,rec.form,rec.size==='직접 입력'?rec.custom:rec.size].filter(x=>typeof x==='string'&&x).join(' · ')).join(', ')),el('p',licenses.length?'면허: 본인 신고·미확인':'면허 미등록'),el('p','관련 면허 확인 필요'));
 for(const r of linked)card.append(el('p',categories[r.category]+' · '+name(r)+' · '+(r.declarationSource==='legacy'?'이전 입력·미확인':'본인 신고·미확인')+(r.expiryDate.state==='known'&&r.expiryDate.value<today()?' · 입력 만료일 지남 · 확인 필요':'')));
 card.append(button(licenses.length?'면허 수정':'면허 등록',()=>{if(start('license',licenses[0])){draft.form.relatedEquipmentRecordIds=[...new Set([...draft.form.relatedEquipmentRecordIds,...ids])];renderEditor();}}));$('suggestions').append(card);
 }
}
function refreshEquipment(){readForm();equipment=recommendations(storage);render();}
window.addEventListener('pageshow',e=>{if(e.persisted)refreshEquipment();});
window.addEventListener('focus',refreshEquipment);
window.addEventListener('storage',e=>{if(e.key===null||['node_03_2_a_v1','node_03_2_v1'].includes(e.key))refreshEquipment();});
$('findLegacy').onclick=async()=>{try{const items=await legacyCandidates(storage);$('legacyList').replaceChildren();if(!items.length)$('legacyList').append(el('p','이전 면허 기록이 없습니다.'));for(const item of items){if(item.error){$('legacyList').append(el('p',item.error));continue;}const b=button(item.title+' · 이전 입력·유형 확인 필요',()=>start('other',null,item));b.disabled=state.imported.includes(item.legacy.fingerprint);if(b.disabled)b.textContent+=' · 이미 가져옴';$('legacyList').append(b);}}catch{status('이전 저장소에 접근할 수 없습니다. 원문은 변경하지 않았습니다.');}};
function download(value,filename){const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));const a=el('a','');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('exportMemory').onclick=()=>download(JSON.stringify(snapshot(),null,2),'node-03-3-current-input.json');$('exportRaw').onclick=()=>{try{download(storage.getItem(KEY)??'null','node-03-3-storage-original.json');}catch{status('저장 원문에 접근할 수 없습니다.');}};$('reload').onclick=()=>{if(confirm('저장되지 않은 화면 입력은 사라집니다. 먼저 현재 입력을 내보냈는지 확인하고 다시 불러올까요?')){dirty=false;location.reload();}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});window.addEventListener('storage',e=>{if(e.key===KEY)status('다른 탭에서 저장값이 변경됐습니다. 현재 입력을 내보내고 다시 불러오세요. 덮어쓰지 않습니다.');});render();if(state.reviewed)$('review').hidden=false;
