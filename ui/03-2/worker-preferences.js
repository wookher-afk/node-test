import './money.js';
import {REGIONS} from './regions.js';
const $=id=>document.getElementById(id);
const catalog=[{code:'00',name:'전국'},...REGIONS];
export function preferencesUI(){
 let selected=[],legacy=[],dates=[];
 const option=(v,t)=>new Option(t,v);
 const setTime=(id,v)=>{$(id).dataset.value=v;$(id).textContent=v;};
 const render=()=>{for(const [id,values,remove] of [['regions',[...selected.map(c=>({value:c,label:catalog.find(r=>r.code===c).name})),...legacy.map(c=>({value:c,label:c+' (기존 입력)'}))],v=>{selected=selected.filter(c=>c!==v);legacy=legacy.filter(c=>c!==v);}],['dates',dates.map(c=>({value:c,label:c})),v=>dates=dates.filter(c=>c!==v)]]){$(id).replaceChildren();values.forEach(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.label+' ×';b.setAttribute('aria-label',x.label+' 삭제');b.onclick=()=>{remove(x.value);render();};$(id).append(b);});}};
 $('province').append(...catalog.filter(x=>x.code.length===2).map(x=>option(x.code,x.name)));
 function districts(){const code=$('province').value;$('district').replaceChildren(option(code,code==='00'?'전국': '전체'));$('district').append(...REGIONS.filter(x=>x.code.length===5&&x.code.startsWith(code)).map(x=>option(x.code,x.name.split(' ').slice(1).join(' '))));$('district').disabled=code==='00';}
 $('province').onchange=districts;districts();
 $('addRegion').onclick=()=>{const c=$('district').value;if(c==='00')selected=['00'];else if(!selected.includes('00')&&!selected.some(x=>x===c||c.startsWith(x))){selected=selected.filter(x=>!x.startsWith(c));selected.push(c);}render();};
 $('pay').oninput=()=>{$('payDisplay').textContent=$('pay').value?NODE_MONEY.display($('pay').value):'만원 단위로 입력하세요.';};
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','timeTitle');dialog.innerHTML='<form method="dialog"><h2 id="timeTitle">시간 선택</h2><div class="pair"><label>시<select id="pickHour"></select></label><label>분<select id="pickMinute"></select></label></div><small>기본 30분 간격 · 기존 분 단위 시간도 유지됩니다.</small><div class="pair"><button value="cancel">취소</button><button value="apply">선택 완료</button></div></form>';document.body.append(dialog);
 for(let i=0;i<24;i++)$('pickHour').add(option(String(i).padStart(2,'0'),String(i).padStart(2,'0')+'시'));
 let timeTarget;
 for(const id of ['start','end'])$(id).onclick=()=>{timeTarget=id;const [h,m]=$(id).dataset.value.split(':');$('timeTitle').textContent=id==='start'?'희망 출근시간':'희망 퇴근시간';$('pickHour').value=h;$('pickMinute').replaceChildren(...[...new Set(['00','30',m])].sort().map(v=>option(v,v+'분')));$('pickMinute').value=m;dialog.returnValue='';dialog.showModal();};
 dialog.addEventListener('close',()=>{if(dialog.returnValue==='apply')setTime(timeTarget,$('pickHour').value+':'+$('pickMinute').value);$(timeTarget)?.focus();});
 function schedule(){const mode=$('schedule').value;$('dateFields').hidden=mode==='always';$('dateToLabel').hidden=mode!=='range';$('addDate').hidden=mode!=='dates';$('dates').hidden=mode!=='dates';$('dateFrom').required=mode==='range';$('dateTo').required=mode==='range';}
 $('schedule').onchange=schedule;schedule();
 $('addDate').onclick=()=>{const v=$('dateFrom').value;if(!v){$('dateFrom').showPicker?.();return;}if(!dates.includes(v)&&dates.length<366)dates.push(v);dates.sort();render();};
 return {
 read(){if(!selected.length&&!legacy.length)throw Error('희망 지역을 추가하세요.');if(selected.length+legacy.length>30)throw Error('희망 지역은 30개까지 선택하세요.');const mode=$('schedule').value;let availability={mode};if(mode==='dates'){if(!dates.length)throw Error('가능 날짜를 추가하세요.');availability={mode,dates:[...dates]};}if(mode==='range'){const start=$('dateFrom').value,end=$('dateTo').value;if(!start||!end||start>end)throw Error('가능 기간의 시작일과 종료일을 확인하세요.');availability={mode,start,end};}return {regions:[...selected.map(c=>catalog.find(r=>r.code===c).name),...legacy],regionCodes:[...selected],regionCodeSystem:'kr-lawd-2026-10-01',legacyRegions:[...legacy],minimumPayWon:NODE_MONEY.toWon($('pay').value),payUnit:$('unit').value,startTime:$('start').dataset.value,endTime:$('end').dataset.value,availableDates:mode==='dates'?[...dates]:[],availability};},
 restore(p){selected=[];legacy=[...(p.legacyRegions||[])];if(p.regionCodes)selected=p.regionCodes.filter(c=>catalog.some(r=>r.code===c));else for(const name of p.regions||[]){const aliases={서울:'11',경기:'41',부산:'26',대구:'27',인천:'28',광주:'29',대전:'30',울산:'31',세종:'36',강원:'51',충북:'43',충남:'44',전북:'52',전남:'46',경북:'47',경남:'48',제주:'50'};const c=catalog.find(r=>r.name===name)?.code||aliases[name];if(c&&catalog.some(r=>r.code===c))selected.push(c);else legacy.push(name);}selected=[...new Set(selected)];legacy=[...new Set(legacy)];$('pay').value=NODE_MONEY.fromWon(p.minimumPayWon);$('pay').oninput();$('unit').value=p.payUnit;setTime('start',p.startTime);setTime('end',p.endTime);const a=p.availability||{mode:p.availableDates?.length?'dates':'always',dates:p.availableDates};$('schedule').value=a.mode;dates=[...(a.dates||[])];if(a.mode==='range'){$('dateFrom').value=a.start;$('dateTo').value=a.end;}schedule();render();}
 };
}
