import {requiredMatchUI} from './required-match-ui.js';
import {OCCUPATIONS,occupationById} from './occupations.js';
const $=id=>document.getElementById(id),selected=new Set();let version=0;
const required=requiredMatchUI({countTarget:document.querySelectorAll('#content h2')[1],fields:[{key:'workAbility',host:document.querySelector('#content h2'),name:'작업능력'}]});
async function api(path,method='GET',payload){
 const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Node-Session':'cookie'},...(payload?{body:JSON.stringify(payload)}:{})});
 const d=await r.json();if(!r.ok)throw Error(d.error||'요청 실패');return d;
}
function options(id,items){$(id).replaceChildren(...items.map(x=>new Option(x.name,x.id)));}
function current(){return OCCUPATIONS.items.filter(x=>x.middleId===$('occupationMiddle').value);}
function render(){
 $('occupationChoices').replaceChildren(...current().map(x=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=x.id;input.checked=selected.has(x.id);input.onchange=()=>{if(input.checked)selected.add(x.id);else selected.delete(x.id);summary();};label.append(input,document.createTextNode(x.name));return label;}));
 summary();
}
function summary(){
 $('count').textContent=selected.size+'개';$('clearAll').disabled=!selected.size;
 $('occupationSummary').replaceChildren(...[...selected].map(id=>{const b=document.createElement('button');b.type='button';const name=occupationById.get(id)?.name||id;b.textContent=name+' ×';b.setAttribute('aria-label',name+' 선택 해제');b.onclick=()=>{selected.delete(id);render();};return b;}));
}
function middle(){options('occupationMiddle',OCCUPATIONS.middles.filter(x=>x.majorId===$('occupationMajor').value));render();}
$('occupationMajor').onchange=middle;$('occupationMiddle').onchange=render;
$('selectMiddle').onclick=()=>{current().forEach(x=>selected.add(x.id));render();};
$('clearMiddle').onclick=()=>{current().forEach(x=>selected.delete(x.id));render();};
$('clearAll').onclick=()=>{selected.clear();render();};
$('content').onsubmit=async e=>{e.preventDefault();if(!selected.size){$('notice').textContent='직종을 하나 이상 선택하세요.';return;}$('save').disabled=true;
 try{const saved=await api('/api/me/technical-registration','PUT',{version,document:{requiredMatch:required.read(),workerType:'technical_worker',occupationCatalogVersion:OCCUPATIONS.version,occupationIds:[...selected]}});version=saved.version;$('notice').textContent='서버에 저장했습니다. 다시 로그인해도 복원됩니다.';}catch(e){$('notice').textContent=e.message;}finally{$('save').disabled=false;}
};
(async()=>{try{await api('/api/me');const saved=await api('/api/me/technical-registration');version=saved.version;required.restore(saved.requiredMatch||saved.document?.requiredMatch||[]);
 if(saved.document){if(saved.document.occupationCatalogVersion!==OCCUPATIONS.version)throw Error('저장된 분류 버전이 다릅니다. 분류 이관 확인이 필요합니다.');saved.document.occupationIds.forEach(id=>selected.add(id));}
 options('occupationMajor',OCCUPATIONS.majors);middle();$('draft').textContent=`검토용 분류 초안 · 대분류 ${OCCUPATIONS.majors.length}개 / 중분류 ${OCCUPATIONS.middles.length}개 / 소분류 ${OCCUPATIONS.items.length}개 · 추후 수정 가능`;
 $('content').hidden=false;$('notice').textContent=saved.document?'서버에 저장한 직종을 복원했습니다.':'수행 가능한 직종을 선택하세요.';
 }catch(e){$('notice').replaceChildren(document.createTextNode(e.message+' '));const a=document.createElement('a');a.href='/?entry=worker#auth';a.textContent='로그인 / 회원가입';$('notice').append(a);}})();
