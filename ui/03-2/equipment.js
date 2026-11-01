/* Named details and presentation states never reinterpret legacy positional specifications. */
window.NODE_EQUIPMENT = (()=>{
 const profiles=window.NODE_EQUIPMENT_PROFILES, $=id=>document.getElementById(id);
 const coreFields={
  loader:[[1],['capacityBasis','bucket']],bulldozer:[[0],['weightBasis']],
  'drilling-rig':[[0,1],['purpose','methods','body','devices']],
  'pile-driver':[[2],['methods','body','devices','energy','ram','torque']],
  trailer:[[],['registeredPayload','deckLength','deckWidth','deckHeight']],
  forklift:[[0,1,2],['power']],telehandler:[[0,1,2],['device']],
  crane:[[0,1,2],['radius']],
  'aerial-work-platform':[[0,1],['power','environment']],roller:[[0,1],['vibration']],
  'mixer-truck':[[],[]],'concrete-pump':[[1],['pressure','pipeDiameter']],
  generator:[[0,1],['rating']],compressor:[[],['flow','pressure','measurement']],
  other:[[],['description']],'skid-loader':[[0],[]],grader:[[0],[]],
  scraper:[[0,1,2],['bowl']], 'water-truck':[[],['effectiveCapacity','totalCapacity','registeredPayload']],
  'tow-truck':[[0,1,2],['recoveryReach','registeredPayload','deckLength','deckWidth']],
  'truck-tractor':[[],['axles','connection','grossCombination','fifthWheel']],
  'cargo-crane':[[0,1,2],['craneModel','loadChart']],
  'tower-crane':[[0,1,2],['bodyModel','installation','jib','installedHeight','support']],
  'sky-truck':[[0,1,2],['loadRadius']], 'ladder-truck':[[0,1,2],['distance']],
  'construction-lift':[[],['purpose','cageLoad']],
  'asphalt-paver':[[],['screed','baseWidth','hydraulicWidth','extendedWidth']],
  'road-mill':[[0,1],['drum']]
 };
 // These are documented product examples, not national field classes or verified vehicle values.
 const references={
  loader:[['HL955A · 버킷 2.8㎥','https://www.hyundai-ce.com/resources/KOR_HL955A_HL960A%2823.08%29_web.pdf'],['HL960A · 버킷 3.3㎥','https://www.hyundai-ce.com/resources/KOR_HL955A_HL960A%2823.08%29_web.pdf']],
  telehandler:[['MT420H · 2t / 4m','https://www.sunnyyk.co.kr/product_handler'],['MT625H · 2.5t / 6m','https://www.sunnyyk.co.kr/product_handler'],['MT930H · 3t / 9m','https://www.sunnyyk.co.kr/product_handler']],
  'construction-lift':[['GTL-1230SS · 적재하중 1.2t','https://kr.gl-enc.com/product/?bmode=view&idx=149910065']]
 };
 let container,primary,moved=[];
 const scope=()=>$('editor');
 function unmount(){for(const label of moved)$('specs').append(label);moved=[];primary?.remove();$('equipmentReferences')?.remove();container?.remove();primary=container=null;}
 function states(select){for(const [value,text] of [['','미입력'],['value','직접 입력'],['unknown','모름'],['na','해당 없음'],['pending','미정']])select.add(new Option(text,value));}
 function moveSpec(input,grid){if(!input)return;const label=input.parentElement;moved.push(label);grid.append(label);
  const state=document.createElement('select');state.dataset.specStatus=input.id;state.setAttribute('aria-label',label.firstChild.textContent+' 입력 상태');states(state);label.insertBefore(state,input);
  input.title='미입력·모름·해당 없음에서는 기존 숫자를 보관만 합니다. 숫자를 새로 입력하면 직접 입력으로 바뀝니다.';
  state.onchange=()=>{input.setCustomValidity('');input.disabled=!['','value'].includes(state.value);};input.addEventListener('input',()=>{state.value='value';});
 }
 function mount(id){
  unmount();const profile=profiles[id];if(!profile)return;
  primary=document.createElement('section');primary.id='equipmentPrimary';primary.setAttribute('aria-labelledby','equipmentPrimaryTitle');
  const h=document.createElement('h3');h.id='equipmentPrimaryTitle';h.textContent='현장 규격 · '+profile.core;
  const hint=document.createElement('p');hint.id='equipmentPrimaryHint';hint.className='hint';
  hint.textContent='형태에 맞는 규격을 직접 입력하거나 모름을 선택하세요. 상세 수치는 선택 사항이며, 별도 현장 호칭 없이도 등록할 수 있습니다. 숫자 0과 미입력은 구분합니다.';
  const grid=document.createElement('div');grid.className='grid';primary.append(h,hint,grid);$('optionalDetails').append(primary);
  const [indices,named]=coreFields[id]||[[],[]];for(const i of indices)moveSpec($('spec'+i),grid);
  if(id==='mixer-truck')for(const key of ['mixingTransportCapacity','drumTotalVolume'])moveSpec($('a_'+key),grid);
  if(id==='loader')$('spec1').placeholder='예: 2.8 · 장착 버킷의 실제 용량(㎥·루베), 기준은 옆에서 선택';
  if(references[id]){const box=document.createElement('details');box.className='equipmentReferences';box.id='equipmentReferences';const title=document.createElement('summary');title.textContent='제조사·국내 공급 모델 참고';box.append(title);
   const note=document.createElement('p');note.textContent='참고 예시이며 현재 장비의 제원으로 자동 입력하지 않습니다. 장착 구성·판본·실차를 확인하세요.'+(id==='telehandler'?' 최대 하중과 최대 높이가 동시에 성립한다는 뜻은 아닙니다.':'');box.append(note);
   for(const [text,url] of references[id]){const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener';box.append(a);}$('optionalDetails').append(box);
  }
  container=document.createElement('details');container.id='equipmentFields';
  const heading=document.createElement('summary');heading.textContent='추가 제원 · 근거 (선택)';const flow=document.createElement('p');flow.textContent=profile.flow;
  const info=document.createElement('p');info.className='hint';info.textContent='공법·장치에 맞는 항목만 입력하세요. 해당 없음·미정도 선택할 수 있으며 숨겨진 값은 삭제하지 않습니다.';
  const extra=document.createElement('div');extra.className='grid';container.append(heading,flow,info,extra);
  for(const f of profile.fields){
   const label=document.createElement('div');label.className='equipmentField';label.dataset.fieldKey=f.key;const caption=document.createElement('label');caption.htmlFor='equipment_'+f.key;caption.textContent=f.label;label.append(caption);
   const input=document.createElement('input');input.id='equipment_'+f.key;input.dataset.equipmentField=f.key;input.setAttribute('aria-label',f.label+' 직접 입력');input.placeholder='값과 단위 또는 기타 설명 직접 입력';
   const state=document.createElement('select');state.dataset.equipmentStatus=f.key;state.setAttribute('aria-label',f.label+' 입력 상태');states(state);
   state.onchange=()=>{input.disabled=!['','value'].includes(state.value);refresh(id);};input.oninput=()=>{state.value='value';};label.append(state,input);
   if(f.choices.length){const box=document.createElement('div');box.className='checks';for(const value of [...f.choices,'기타 직접 입력']){const l=document.createElement('label'),c=document.createElement('input');c.type=f.multi?'checkbox':'radio';c.name='equipment_'+f.key;c.value=value;c.dataset.equipmentChoice=f.key;l.append(c,document.createTextNode(value));box.append(l);c.onchange=()=>{state.value='value';input.disabled=false;refresh(id);};}label.append(box);}
   (named.includes(f.key)?grid:extra).append(label);
  }
  const evidence=document.createElement('details'),title=document.createElement('summary'),limit=document.createElement('p');title.textContent='근거와 확인 한계 · '+profile.grade+'등급';limit.textContent=profile.limit;evidence.append(title,limit);
  for(const [text,url]of profile.sources){const a=document.createElement('a');a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener';evidence.append(a,document.createElement('br'));}
  container.append(evidence);$('specDetails').after(container);refresh(id);
 }
 function refresh(id){if(!primary)return;const form=$('form').value;
  const labels=window.NODE_CATALOG.items.find(x=>x.id===id)?.sizesByForm;const candidates=labels?.[form]||labels?.['*']||[];
  if($('equipmentReferences'))$('equipmentReferences').hidden=(id==='loader'&&form!=='타이어식')||(id==='telehandler'&&form!=='고정식');
  $('size').required=false;$('custom').required=false;$('sizeTitle').textContent=candidates.length?'현장 호칭·참고 규격 (선택)':'현장 호칭 (선택)';
  $('equipmentPrimaryHint').textContent=(candidates.length?'참고 호칭과 실제 제원을 구분해 입력하세요. ':'고정 추천 급수 없이 아래 핵심 규격을 직접 입력하거나 모름을 선택하세요. ')+'상세 수치는 선택 사항이며 별도 현장 호칭 없이도 등록할 수 있습니다. 숫자 0·미입력·모름·해당 없음을 구분합니다.';
  const choices=key=>{const state=scope().querySelector(`[data-equipment-status="${key}"]`);return !state||!['','value'].includes(state.value)?[]:[...scope().querySelectorAll(`[data-equipment-choice="${key}"]:checked`)].map(x=>x.value);};
  const hide=(key,value)=>{const field=scope().querySelector(`[data-field-key="${key}"]`);if(field)field.hidden=value;};
  if(id==='tow-truck'){const recovery=form==='구난 · 언더리프트',deck=form==='적재식 셀프로더';for(const key of ['registeredPayload','deckLength','deckWidth'])hide(key,recovery);hide('recoveryReach',deck);for(const index of [0,1]){const label=$('spec'+index)?.parentElement;if(label)label.hidden=deck;}}
  if(id==='pile-driver'){const selectedMethods=choices('methods'),methods=selectedMethods.length?selectedMethods:[form],devices=choices('devices');const pressure=methods.length===1&&methods[0]==='압입';for(const key of ['energy','ram'])hide(key,pressure&&!devices.some(x=>/해머/.test(x)));hide('torque',pressure&&!devices.includes('오거'));}
  if(id==='tower-crane'){const uninstalled=choices('installation').includes('미설치');for(const key of ['installedHeight','support'])hide(key,uninstalled);}
 }
 function read(previous){if(!container)return previous;const result=structuredClone(previous||{});for(const input of scope().querySelectorAll('[data-equipment-field]')){const key=input.dataset.equipmentField;const old=result[key];result[key]={...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),status:scope().querySelector(`[data-equipment-status="${key}"]`).value,value:input.value,choices:[...new Set([...(Array.isArray(old?.choices)?old.choices.filter(v=>![...scope().querySelectorAll(`[data-equipment-choice="${key}"]`)].some(c=>c.value===v)):[]),...[...scope().querySelectorAll(`[data-equipment-choice="${key}"]:checked`)].map(x=>x.value)])]};}return result;}
 function readSpecStates(previous){const result=structuredClone(previous||{});if(primary)for(const state of primary.querySelectorAll('[data-spec-status]'))result[state.dataset.specStatus]=state.value;return result;}
 function restoreSpecStates(data){if(!primary)return;for(const state of primary.querySelectorAll('[data-spec-status]')){const input=$(state.dataset.specStatus),v=data?.[state.dataset.specStatus];if(typeof v==='string'){if(![...state.options].some(x=>x.value===v))state.add(new Option(v+' · 이전 입력',v));state.value=v;}else if(input.value!=='')state.value='value';input.disabled=!['','value'].includes(state.value);}}
 function restore(data){if(!container)return;for(const input of scope().querySelectorAll('[data-equipment-field]')){const key=input.dataset.equipmentField,v=data?.[key];if(!v||typeof v!=='object')continue;input.value=typeof v.value==='string'?v.value:'';const status=scope().querySelector(`[data-equipment-status="${key}"]`);if(typeof v.status==='string'&&![...status.options].some(x=>x.value===v.status))status.add(new Option(v.status+' · 이전 입력',v.status));status.value=v.status||'';input.disabled=!['','value'].includes(status.value);for(const c of scope().querySelectorAll(`[data-equipment-choice="${key}"]`))c.checked=Array.isArray(v.choices)&&v.choices.includes(c.value);}refresh($('kind').value);}
 const statusText=value=>({unknown:'모름',na:'해당 없음',pending:'미정'}[value]||'');
 function specText(value,states,key){if(states&&Object.hasOwn(states,key)){const state=states[key];if(state==='')return value?'미입력 (이전 값 보관)':'미입력';return statusText(state)||value;}return value;}
 function summary(id,data){return Object.entries(data||{}).map(([key,v])=>{if(!v||typeof v!=='object')return '';const label=profiles[id]?.fields.find(x=>x.key===key)?.label||key;const status=statusText(v.status);return v.status?label+': '+(status||[...(v.choices||[]),v.value].filter(x=>x!==''&&x!==undefined).join(', ')):'';}).filter(Boolean).join('\n');}
 return {mount,unmount,refresh,read,restore,readSpecStates,restoreSpecStates,statusText,specText,summary,profiles,coreFields};
})();
