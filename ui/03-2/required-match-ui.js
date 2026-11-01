import {validateRequiredMatch,WORKER_REQUIRED_KEYS} from './required-match.js';
// Only new controls are styled. Existing labels, inputs, grids and ordering stay intact.
export function requiredMatchUI({fields,countTarget,allowed=WORKER_REQUIRED_KEYS,scopeLabel='필수 일치'}){
 let selected=[],controls=[];
 const count=document.createElement('span');count.className='required-match-count';count.setAttribute('role','status');count.setAttribute('aria-label',scopeLabel+' 선택 수');countTarget.append(count);
 const render=()=>{count.textContent=` 필수 일치 ${selected.length}/3`;for(const {input} of controls){input.checked=selected.includes(input.value);input.disabled=!input.checked&&selected.length>=3;}};
 for(const {key,host,name} of fields){
  const title=[...host.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
  if(!title)throw Error('필수 조건 제목이 없습니다: '+key);
  const original=host.querySelector('input,select,button');if(host.tagName==='LABEL'&&original?.id)host.htmlFor=original.id;
  const control=document.createElement('span');control.className='required-match-control';
  const input=document.createElement('input');input.type='checkbox';input.value=key;input.dataset.requiredMatch=key;input.setAttribute('aria-label',name+' 필수 일치');
  control.title=name+' 필수 일치';control.append(input);title.before(control);
  input.addEventListener('change',()=>{selected=input.checked?[...selected,key]:selected.filter(k=>k!==key);selected=validateRequiredMatch(selected,allowed);render();});
  control.addEventListener('click',e=>{if(e.target!==input){e.preventDefault();e.stopPropagation();if(!input.disabled)input.click();}});
  controls.push({host,control,input,title});
 }
 render();
 return {read:()=>[...selected],restore(value=[]){selected=validateRequiredMatch(value,allowed);render();}};
}
