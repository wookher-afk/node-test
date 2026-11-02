// Publication uses saved Alpha data; editing/saving the existing form is separate.
const $=id=>document.getElementById(id);
let registration,organization,sites=[],busy=false;
const result=text=>{$('jobPostResult').textContent=text;};
async function api(path,method='GET',data){
 const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Node-Session':'cookie'},...(data?{body:JSON.stringify(data)}:{})});
 const body=await r.json();if(!r.ok)throw Error(body.error||'요청 실패');return body;
}
function select(label,options){
 const host=document.createElement('label'),input=document.createElement('select');host.textContent=label;
 input.append(new Option('선택하세요',''),...options.map(([text,value])=>new Option(text,value)));host.append(input);return {host,input};
}
function confirm(label){
 const host=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.style.width='auto';host.append(input,document.createTextNode(label));return {host,input};
}
function clear(){registration=null;organization=null;$('jobPostPanel').hidden=true;$('jobPostChoices').replaceChildren();result('');}
$('companyRegistration').addEventListener('input',e=>{if(!e.target.closest('#jobPostPanel'))clear();});
$('companyRegistration').addEventListener('change',e=>{if(!e.target.closest('#jobPostPanel'))clear();});
$('companyRegistration').addEventListener('submit',clear);
$('companySelect').addEventListener('change',clear);$('newCompany').addEventListener('click',clear);
$('prepareJobPost').onclick=async()=>{
 if(busy)return;
 try{
  clear();organization=$('companySelect').value;
  if(!organization)throw Error('업체 등록 정보를 먼저 저장하세요.');
  const data=await api(`/api/companies/${organization}/registration`);
  if(!data.document)throw Error('저장된 업체 등록정보가 없습니다.');
  registration=data;
  sites=(await api(`/api/companies/${organization}/worksites`)).worksites.filter(s=>s.is_active);
  $('jobPostSite').replaceChildren(new Option('현장을 선택하세요',''),...sites.map(s=>new Option(`${s.name} · ${s.address}`,s.id)));
  $('jobPostVisibility').value='';$('jobPostPanel').hidden=false;
  result('마지막으로 서버에 저장한 모집조건을 사용합니다. 화면에서 수정한 내용은 먼저 업체 등록 정보 저장을 눌러 주세요.');
 }catch(e){clear();result(e.message);}
};
$('jobPostSite').onchange=async()=>{
 $('jobPostChoices').replaceChildren();
 try{
  if(!registration||!$('jobPostSite').value)return;
  const site=sites.find(s=>s.id===$('jobPostSite').value);
  if(site.name!==registration.document.worksite.name||site.address!==registration.document.worksite.address)throw Error('Alpha에 저장한 현장명·주소와 같은 기존 현장을 선택하세요.');
  const {occupations}=await api(`/api/worksites/${site.id}/job-post-options`);
  for(const [index,line] of registration.document.lines.entries()){
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`모집항목 ${index+1} · ${line.headcount}명`;field.append(legend);field.dataset.lineId=line.id;
   const summary=document.createElement('p');summary.textContent=`${line.kind||line.occupationIds.join(', ')} ${line.form||''} ${line.size||''} · ${line.conditions.minimumPayWon}원/${line.conditions.payUnit} · 지급 원문: ${line.paymentTerms}`;field.append(summary);
   const occupation=select('정식 공고 직종 (원문 직종·규격·필수조건은 함께 보존)',occupations.map(o=>[o.name,o.id]));occupation.input.dataset.field='occupation_id';field.append(occupation.host);
   const occupationConfirmed=confirm('선택한 정식 직종이 이 모집항목에 대응함을 확인했습니다.');occupationConfirmed.input.dataset.field='occupation_confirmed';field.append(occupationConfirmed.host);
   const payment=select('원문과 일치하는 지급조건',[['당일','same_day'],['익일','next_day'],['날짜 지정','date']]);payment.input.dataset.field='payment_mode';field.append(payment.host);
   const dueLabel=document.createElement('label'),due=document.createElement('input');due.type='date';due.dataset.field='due_date';dueLabel.textContent='지정 지급일';dueLabel.append(due);dueLabel.hidden=true;payment.input.onchange=()=>{dueLabel.hidden=payment.input.value!=='date';};field.append(dueLabel);
   const paymentConfirmed=confirm('위 지급조건이 저장된 지급 원문과 일치합니다. 일치하는 선택지가 없으면 등록하지 않습니다.');paymentConfirmed.input.dataset.field='payment_confirmed';field.append(paymentConfirmed.host);
   const partial=select('부분 일정 지원 허용 여부',[['허용','true'],['불허','false']]);partial.input.dataset.field='allow_partial';field.append(partial.host);$('jobPostChoices').append(field);
  }
 }catch(e){$('jobPostChoices').replaceChildren();result(e.message);}
};
$('publishJobPost').onclick=async()=>{
 if(busy)return;
 try{
  if(!registration||!$('jobPostSite').value||!$('jobPostVisibility').value)throw Error('현장과 공개 범위를 선택하세요.');
  const choices=[...$('jobPostChoices').children].map(field=>{
   const value=key=>field.querySelector(`[data-field="${key}"]`);
   if(!value('occupation_id').value||!value('occupation_confirmed').checked||!value('payment_mode').value||!value('payment_confirmed').checked||!value('allow_partial').value)throw Error('각 모집항목의 직종·지급조건·부분 일정 허용 여부를 확인하세요.');
   const payment={mode:value('payment_mode').value};if(payment.mode==='date')payment.due_date=value('due_date').value;
   return {line_id:field.dataset.lineId,occupation_id:value('occupation_id').value,occupation_confirmed:true,payment,payment_confirmed:true,allow_partial:value('allow_partial').value==='true'};
  });
  if(choices.length!==registration.document.lines.length)throw Error('모든 모집항목을 확인하세요.');
  busy=true;$('publishJobPost').disabled=true;
  const response=await api(`/api/worksites/${$('jobPostSite').value}/job-posts`,'POST',{visibility:$('jobPostVisibility').value,alpha:{organization_id:organization,version:registration.version,choices}});
  result(`공고 ${response.job_post.id} · 조건 버전 ${response.job_post.version} · 지급 약속 버전 ${response.job_post.promise_version_id}${response.replayed?' (기존 등록 결과)':''}`);
 }catch(e){result(e.message);}finally{busy=false;$('publishJobPost').disabled=false;}
};
