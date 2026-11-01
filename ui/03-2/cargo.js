/* 승인된 두 조사보고서 §4 제조사 사양만 사용. 숫자는 실차 입력으로 복사하지 않는다. */
window.NODE_CARGO=(()=>{
 const $=id=>document.getElementById(id), rows=[];
 const sources={K1:'https://www.kia.com/content/dam/kwp/kr/ko/vehicles/pdf/catalog/catalog_bongo3.pdf',H1:'https://www.hyundai.com/ccontents/carmng/CP00000003/mighty-2025-06-spec.pdf',H3:'https://www.hyundai.com/ccontents/carmng/CP00000304/pavise-2026-05-price.pdf',H4:'https://www.hyundai.com/ccontents/carmng/CP00000006/truck-price-2026-05.pdf',H5:'https://www.hyundai.com/ccontents/carmng/CP00000006/xcient-2026-05-spec.pdf',T1:'https://www.tata-daewoo.com/html/_file/TATADAEWOO%20뉴%20카다로그_구쎈_36P_저용량.pdf',T2:'https://www.tata-daewoo.com/html/_file/TATADAEWOO%20뉴%20카다로그_맥쎈%20카고_36P_저용량.pdf'};
 const add=(ton,length,width,model,l,w,source)=>rows.push({ton:ton+'톤',length,width,model,l,w,source});
 for(const [length,caps]of [['장축',[2810,2535,1870]],['초장축',[3110,2860,2185]]])caps.forEach((l,i)=>add(1,length,'','봉고Ⅲ LPG 2026.09.01 '+(length==='장축'?'4WD ':'2WD ')+['표준캡','킹캡','더블캡'][i],l,1630,'K1'));
 [3400,3135].forEach((l,i)=>add(1.2,'초장축','','봉고Ⅲ LPG 2026.09.01 2WD '+['표준캡','킹캡'][i],l,1650,'K1'));
 [4340,3340].forEach((l,i)=>add(2.5,'장축','','마이티 2025.06 '+(i?'더블캡':'일반캡/슈퍼캡 고상·저상'),l,1960,'H1'));
 add(3.5,'장축','일반폭','마이티 2025.06 일반캡/슈퍼캡',4850,2060,'H1');
 for(const [length,l]of [['장축',4850],['초장축',5500]])add(3.5,length,'광폭','마이티 2025.06 슈퍼캡',l,2280,'H1');
 for(const [length,l,code]of [['장축',5425,'JC3C4'],['초장축',6300,'JC4C4']])add(5,length,'','구쎈 DL06 NOV24 '+code+' 적재함 선택사양',l,null,'T1');
 const pav=[['장축',5300,2280],['초장축',6250,2280],['초장축플러스7.0',7000,2280],['극초장축7.4',7400,2350],['극초장축플러스7.6',7600,2350],['극초장축플러스8.3',8300,2350]];
 for(const ton of [5.5,8.5])for(const [length,l,w]of pav.slice(0,ton===8.5?5:6))add(ton,length,'','파비스 4×2 2026.05.07 기본 적재함',l,w,'H3');
 for(const [length,l]of [['극초장축플러스8.3',8300],['극초장축플러스8.9',8900]])add(8,length,'','파비스 4×2 2026.05.07 기본 적재함',l,2350,'H3');
 for(const [length,l]of pav.slice(3,5))add(8,length,'','파비스 6×2 2026.05',l,2350,'H4');
 for(const [length,l,code]of [['장축',7600,'JL7CL'],['초장축',9100,'JL8CL'],['극초장축',10100,'JL9CL']])add(11,length,'','맥쎈 C9 6×4저상 NOV24 12.5/11t 선택 '+code,l,null,'T2');
 add(14,'초장축','','엑시언트 6×4 고상 2026.05',9800,2340,'H5');add(25,'초장축','','엑시언트 10×4 2026.05 완성 카고',10100,2340,'H5');add(25,'장축','','맥쎈 10×4 Pusher NOV24 적재함 선택사양',10100,null,'T2');add(22,'초장축','','2027엑시언트 8×4 후3축 2026.05판',10100,null,'H4');
 let box,legacyEmpty=new Set();
 function init(){if(box)return;box=document.createElement('div');box.id='cargoSteps';box.className='full';box.hidden=true;
 for(const [id,title,select]of [['cargoLength','적재함 길이 구분',true],['cargoLengthOther','길이 구분 직접 입력',false],['cargoWidth','폭 구분',true],['cargoWidthOther','폭 구분 직접 입력',false],['cargoLengthMm','실제 유효 길이 (mm · 선택)',false],['cargoWidthMm','실제 유효 폭 (mm · 선택)',false]]){const label=document.createElement('label');label.textContent=title;const input=document.createElement(select?'select':'input');input.id=id;if(!select)input.maxLength=120;label.append(input);box.append(label);}
 const ref=document.createElement('details');ref.id='cargoReference';$('cargoOptional').append(ref);$('customLabel').after(box);
 for(const id of ['cargoLengthMm','cargoWidthMm'])$('cargoOptional').prepend($(id).parentElement);
 for(const id of ['cargoLength','cargoWidth'])$(id).onchange=()=>{legacyEmpty.delete(id);refresh();};
 for(const id of ['cargoLengthMm','cargoWidthMm']){$(id).inputMode='decimal';$(id).placeholder='mm 단위의 숫자만 입력 · 예: 5490';const state=document.createElement('select');state.id=id+'State';state.setAttribute('aria-label',$(id).parentElement.firstChild.textContent+' 입력 상태');for(const [value,text]of [['','미입력'],['value','직접 입력'],['unknown','모름'],['na','해당 없음']])state.add(new Option(text,value));$(id).before(state);state.onchange=()=>{$(id).setCustomValidity('');$(id).disabled=!['','value'].includes(state.value);};$(id).oninput=()=>{state.value='value';};}
 }
 const keys=['cargoLength','cargoLengthOther','cargoWidth','cargoWidthOther','cargoLengthMm','cargoWidthMm'];
 function options(id,values,old){$(id).replaceChildren(new Option(legacyEmpty.has(id)?'미입력 · 이전 응답 미확인':'미입력',''),new Option('모름','unknown'),new Option('해당 없음','na'),...values.map(v=>new Option(v,v)),new Option('기타 직접 입력','직접 입력'));if(old&&!values.includes(old)&&!['직접 입력','unknown','na'].includes(old))$(id).add(new Option(old+' · 이전 입력',old));$(id).value=old||'';}
 function refresh(change){init();box.hidden=$('kind').value!=='cargo-truck';$('cargoOptional').hidden=box.hidden;if(box.hidden)return;const candidates=rows.filter(r=>r.ton===$('size').value);const oldL=$('cargoLength').value,oldW=$('cargoWidth').value;
 // 기존 입력을 유지하되 이전 조합으로 명시한다. 톤급 변경으로 실차 숫자를 삭제하지 않는다.
 options('cargoLength',[...new Set(candidates.map(r=>r.length))],oldL);
 const lengths=candidates.filter(r=>r.length===$('cargoLength').value);
 options('cargoWidth',[...new Set(lengths.map(r=>r.width).filter(Boolean))],oldW);
 $('cargoLengthOther').parentElement.hidden=$('cargoLength').value!=='직접 입력';$('cargoWidthOther').parentElement.hidden=$('cargoWidth').value!=='직접 입력';
 const ref=$('cargoReference');ref.replaceChildren();const title=document.createElement('summary');title.textContent='제조사 참고 예시 (선택)';const note=document.createElement('p');note.textContent='제조사 참고 예시 · 실차 미확인. 톤급·호칭으로 실제 치수를 자동 입력하지 않습니다. 평판·특장 변경 차량은 유효 데크를 별도 확인하세요.';ref.append(title,note);
 const matches=lengths.filter(r=>!$('cargoWidth').value||r.width===$('cargoWidth').value);
 if(!matches.length){const p=document.createElement('p');p.textContent='이 조합의 제조사 근거 미확인. 기타 직접 입력 또는 모름으로 기록하세요.';ref.append(p);}
 for(const r of matches){const p=document.createElement('p'),a=document.createElement('a');a.href=sources[r.source];a.target='_blank';a.rel='noopener';a.textContent=r.model;p.append(a,document.createTextNode(`: 길이 ${r.l} mm / 폭 ${r.w??'미확인'}${r.w?' mm':''} · 제조사 참고`));ref.append(p);}
 }
 function read(previous){return {...(previous&&typeof previous==='object'?previous:{}),stateRevision:1,legacyEmpty:[...legacyEmpty],dimensionStates:{...(previous?.dimensionStates||{}),...Object.fromEntries(['cargoLengthMm','cargoWidthMm'].map(k=>[k,$(k+'State').value]))},...Object.fromEntries(keys.map(k=>[k,$(k).value]))};}
 function restore(value){init();legacyEmpty=new Set(value?.legacyEmpty||(!value?.stateRevision?['cargoLength','cargoWidth'].filter(k=>value&&Object.hasOwn(value,k)&&value[k]===''):[]));keys.forEach(k=>{if($(k).tagName==='SELECT')options(k,[],typeof value?.[k]==='string'?value[k]:'');else $(k).value=typeof value?.[k]==='string'?value[k]:'';});for(const k of ['cargoLengthMm','cargoWidthMm']){const state=$(k+'State'),s=value?.dimensionStates?.[k];if(typeof s==='string'&&![...state.options].some(x=>x.value===s))state.add(new Option(s+' · 이전 입력',s));state.value=s??($(k).value?'value':'');$(k).disabled=!['','value'].includes(state.value);}refresh();}
 function summary(v){if(!v)return '';const text=k=>v[k]==='직접 입력'?v[k+'Other']:({unknown:'모름',na:'해당 없음'}[v[k]]||v[k]||(v.legacyEmpty?.includes(k)||!v.stateRevision?'이전 미확인 (응답 구분 전)':'미입력'));return ['적재함 길이 구분: '+text('cargoLength'),'폭 구분: '+text('cargoWidth'),...['cargoLengthMm','cargoWidthMm'].map((k,i)=>{const value=window.NODE_EQUIPMENT.specText(v[k],v.dimensionStates,k);return value&&'사용자 입력 유효 '+(i?'폭':'길이')+' (mm): '+value;})].filter(Boolean).join(' / ');}
 return {refresh,read,restore,summary,rows};
})();
