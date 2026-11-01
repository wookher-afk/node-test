// UI uses 만원; API and persisted values always use integer KRW.
(function(root){
 function toWon(value){
  const s=String(value).trim();
  if(!/^\d+(?:\.\d{1,4})?$/.test(s))throw Error('급여는 만원 단위 숫자로 입력하세요. (소수점 최대 4자리)');
  const [whole,fraction='']=s.split('.');
  const won=Number(whole)*10000+Number(fraction.padEnd(4,'0'));
  if(!Number.isSafeInteger(won)||won<0)throw Error('급여 금액을 확인하세요.');
  return won;
 }
 function fromWon(won){
  if(!Number.isSafeInteger(Number(won))||Number(won)<0)throw Error('저장된 급여 금액을 확인하세요.');
  const n=Number(won),fraction=String(n%10000).padStart(4,'0').replace(/0+$/,'');
  return String(Math.floor(n/10000))+(fraction?'.'+fraction:'');
 }
 function display(value){try{return fromWon(toWon(value))+'만원';}catch{return '만원 단위 숫자를 입력하세요.';}}
 root.NODE_MONEY=Object.freeze({toWon,fromWon,display});
})(globalThis);
