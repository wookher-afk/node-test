/* 조사 보고서 기반 검토 목록. 호칭·적산 참고값은 실물 제원이나 모델과 자동 대응하지 않습니다. */
window.NODE_CATALOG = (() => {
 const rows = [
 ['excavator','굴착기','토공·기초','굴착',['운전중량 (t)','버킷 용량 (㎥)'],['미니','017','020','035','055','080','140','200','300','380','480']],
 ['loader','로더','토공·기초','적재',['운전중량 (t)','버킷 용량 (㎥)']],
 ['bulldozer','불도저','토공·기초','정지',['운전중량 (t)','정격출력 (kW)']],
 ['drilling-rig','천공기','토공·기초','천공',['천공 직경 (mm)','천공 깊이 (m)']],
 ['pile-driver','항타기','토공·기초','항타',['장비 중량 (t)','작업 높이 (m)']],
 ['dump-truck','덤프트럭','운반·차량','운반',['최대 적재량 (t)','적재함 용량 (㎥)'],['2.5톤','5톤','15톤','25톤']],
 ['cargo-truck','카고트럭','운반·차량','운반',['최대 적재량 (t)','적재함 길이 (m)'],['1톤','2.5톤','5톤','11톤','25톤']],
 ['trailer','트레일러','운반·차량','운반',['최대 적재량 (t)','적재함 길이 (m)']],
 ['forklift','지게차','운반·차량','하역',['정격 하중 (t)','최대 인상높이 (m)'],['2.5톤','3톤','5톤','7톤','10톤 이상']],
 ['telehandler','텔레핸들러','운반·차량','하역',['정격 하중 (t)','최대 인상높이 (m)','최대 전방 도달거리 (m)']],
 ['crane','크레인','인양·고소','인양',['최대 인양능력 (t)','작업 반경 (m)','붐 길이 (m)']],
 ['aerial-work-platform','고소작업대(자주식)','인양·고소','고소',['최대 작업높이 (m)','작업대 허용하중 (kg)']],
 ['roller','롤러','도로·콘크리트','다짐',['운전중량 (t)','다짐 폭 (mm)']],
 ['mixer-truck','믹서트럭','도로·콘크리트','콘크리트',['이전 드럼 용량 입력 (㎥ · 의미 확인 필요)']],
 ['concrete-pump','펌프카','도로·콘크리트','콘크리트',['붐 길이 (m)','최대 토출량 (㎥/h)']],
 ['generator','발전기','동력·지원','발전',['정격출력 (kW)','정격용량 (kVA)']],
 ['compressor','콤프레서','동력·지원','압축공기',['토출량 (㎥/min)','사용 압력 (bar)']],
 ['other','기타','기타','직접 등록',['실제 제원 (단위 포함)']]
 ];

 rows.push(
 ['skid-loader','스키드로더','토공·기초','적재',['정격적재용량 ROC (kg)','운전중량 (t)','전폭 (mm)','보조유압 유량 (L/min)']],
 ['grader','그레이더','토공·기초','정지',['블레이드 폭 (m)','운전중량 (t)']],
 ['scraper','스크레이퍼','토공·기초','정지',['보울 평적용량 (㎥)','보울 산적용량 (㎥)','정격적재중량 (t)']],
 ['water-truck','살수차','운반·차량','운반',['탱크 용량 (L)','펌프 유량 (L/min)','압력 (bar)']],
 ['tow-truck','견인차','운반·차량','운반',['견인능력 (t)','인양능력 (t)','윈치 능력 (t)']],
 ['truck-tractor','트랙터 · 트레일러 견인차','운반·차량','운반',['허용 견인중량 (t)']],
 ['cargo-crane','카고크레인','인양·고소','인양',['차대 적재중량 (t)','정격하중 (t)','작업 반경 (m)','붐 길이 (m)']],
 ['tower-crane','타워크레인','인양·고소','인양',['최대 인양능력 (t)','지브 길이 (m)','끝단 하중 (t)','설치높이 (m)']],
 ['sky-truck','스카이차(차량탑재형)','인양·고소','고소',['최대 작업높이 (m)','작업반경 (m)','작업하중 (kg)','차대 호칭']],
 ['ladder-truck','사다리차','인양·고소','고소',['작업높이 (m)','운반카 하중 (kg)','설치각도 (도)']],
 ['construction-lift','건설용 리프트','인양·고소','승강',['정격하중 (kg)','케이지 치수 (m)','속도 (m/min)','설치높이 (m)']],
 ['asphalt-paver','아스팔트 피니셔','도로·콘크리트','포장',['최소 포설폭 (m)','최대 포설폭 (m)','포설두께 (mm)','처리능력 (t/h)']],
 ['road-mill','도로절삭기','도로·콘크리트','포장',['장착 드럼 절삭폭 (m)','최대 절삭깊이 (mm)','비트 간격 (mm)']]
 );
 const profiles = {
 excavator:[['미니','궤도식 (LC)','타이어식 (W)','대형 굴착기','스파이더 굴착기'],['브레이커','집게','회전링크','틸트로테이터','오거'],['포크레인','굴삭기','백호','06W']],
 loader:[['타이어식','궤도식'],['일반 버킷','암석 버킷','경량물 버킷','하이리프트','포크','퀵커플러','계량장치'],['휠로더','페이로더','페이로다']],
 'skid-loader':[['바퀴식 스키드스티어','궤도식 소형 트랙로더'],['버킷','브러시','포크','브레이커','오거','절삭장치','고유량 유압'],['바브캣','밥캣','소형 트랙로더']],
 bulldozer:[['무한궤도식','타이어식'],['LGP','리퍼','윈치','정지 제어장치'],['도저']],
 grader:[['모터그레이더'],['리퍼','스캐리파이어','전륜구동','자동 정지 제어','블레이드 연장'],['모터그레이더']],
 scraper:[['자주식','피견인식'],['엘리베이팅','오픈보울','푸시풀 장치'],[]],
 'drilling-rig':[['톱해머','DTH','회전식'],['집진','습식 분진 억제','로드 취급장치','깊이·각도 표시','원격조작'],['드릴']],
 'pile-driver':[['항타','항발','천공·매입','압입'],['드롭해머','유압해머','진동해머','오거','케이싱 장치','보조 윈치'],['항타항발기','항발기']],
 'dump-truck':[['후방 배출','측방 배출'],['자동덮개'],['덤프']],
 'cargo-truck':[['일반 적재함','평판'],['가변축','셀프로더','램프'],['카고']],
 trailer:[['로우베드·저상','평판','기타'],['조향','슬라이드·확장','램프'],['추레라']],
 'tow-truck':[['구난 · 언더리프트','적재식 셀프로더','복합 (구난·적재)'],['견인 돌리','윈치'],['구난차','렉카']],
 'truck-tractor':[['트랙터'],[],['트레일러 견인차']],
 'water-truck':[['차량 탑재형'],['전방 살수','후방 살수','측면 살수','방수포','고압세척'],[]],
 crane:[['트럭','러프터레인 (RT)','올터레인 (AT)','크롤러'],['카운터웨이트','보조윈치','지브','후크'],['기중기','하이드로']],
 'cargo-crane':[['직진 붐','굴절 붐'],['윈치','무선조종','아웃트리거'],[]],
 'tower-crane':[['수평지브','러핑','셀프이렉팅'],['벽체지지','원격조종'],['타워']],
 forklift:[['카운터밸런스','리치'],['사이드시프트','포크 포지셔너','회전 장치','클램프','연장포크'],[]],
 telehandler:[['고정식','회전식','모름'],['포크','버킷','지지대'],[]],
 'aerial-work-platform':[['시저','굴절붐','직진붐','수직마스트'],['전동','엔진','4WD','비마킹 타이어','확장데크','아웃트리거'],['고소작업대','렌탈','고소작업차']],
 'sky-truck':[['직진 붐','굴절 붐'],['탑승함 확장','탑승함 회전','무선조종'],['스카이','고소작업차']],
 'ladder-truck':[['차량 탑재형'],['운반카 확장','무선조종'],[]],
 'construction-lift':[['단 케이지','복 케이지'],['램프','인버터'],['건설용 승강기','리프트']],
 roller:[['머캐덤·정적 3륜','탠덤·탄뎀','싱글드럼','타이어','콤비','보행식','트렌치·패드풋'],['진동','살수','평활 드럼','패드풋 드럼','다짐관리','원격조종'],['진동롤러','타이어롤러','콤비롤러','탄뎀롤러']],
 'mixer-truck':[['차량 탑재형'],['슈트','세척·급수'],['레미콘','믹서']],
 'concrete-pump':[['붐형','라인형'],['붐','배관'],['콘크리트 펌프차']],
 'asphalt-paver':[['바퀴식','크롤러식'],['스크리드 확장','가열장치','다짐장치','자동 레벨·경사 제어'],['피니셔','아스팔트 포설기']],
 'road-mill':[['자주식','부착식'],['미세절삭 드럼','컨베이어','레벨 제어','집진','살수'],['노면절삭기']],
 generator:[['이동식','고정식'],['방음','연료탱크','병렬운전','자동절체','분전·케이블'],[]],
 compressor:[['엔진 이동식','전동식'],['애프터쿨러','드라이어','필터','방음','트레일러'],['공기압축기','콤프레샤','콤프레셔']],
 other:[[],[],[]]
 };
 const referenceSource='research-report.md';
 const referenceSizes={
 excavator:{'미니':['008','010','015','017','020','025','030','035'],'궤도식 (LC)':['02LC','03LC','04LC','06LC','08LC','10LC'],'타이어식 (W)':['03W','06W','08W'],'대형 굴착기':['300','300LC','320','360','380','380LC','420','460','460LC']},
 bulldozer:{'무한궤도식':['7t','10t','12t','19t','32t'],'타이어식':['15t','28t','33t']},
 'cargo-truck':{'*':['1톤','1.2톤','1.4톤','2.5톤','3.5톤','5톤','5.5톤','8톤','8.5톤','11톤','14톤','15톤','18톤','22톤','25톤']},
 'dump-truck':{'*':['1톤','2.5톤','3.5톤','5톤','8톤','15톤','25톤']},
 'concrete-pump':{'붐형':['붐 21m','붐 28m','붐 32m','붐 36m','붐 41m','붐 43m','붐 47m','붐 52m']},
 loader:{},
 grader:{'모터그레이더':['블레이드 폭 3.6m · 적산 참고']},
 crane:{'러프터레인 (RT)':['13톤','16톤','25톤','50톤','70톤','80톤','100톤'],'올터레인 (AT)':['100톤','130톤','150톤','200톤','250톤','300톤']},
 forklift:{'*':['2.5톤','3톤','6톤','7톤','8톤','9톤']},
 'cargo-crane':{'*':['5톤','11톤','15톤','18톤']},
 roller:{'콤비':['2.5톤 콤비','3.5톤 콤비']},
 'mixer-truck':{'차량 탑재형':['혼합·운반 용량 6㎥']}
 };
 const extraSpecs={loader:['운전중량 (t)','버킷 용량 (㎥)'],forklift:['정격 하중 (t)','최대 인상높이 (m)','하중중심거리 (mm)','동력 (디젤/LPG/전동 등)'],roller:['운전중량 (t)','다짐 폭 (mm)','밸러스트 조건','기진력 (kN)'],'pile-driver':['장비 중량 (t)','작업 높이 (m)','리더 길이 (m)','적용 말뚝 직경 (mm)','오거 토크 (kN·m)','해머 사양'],generator:['정격출력 (kW)','정격용량 (kVA)','정격 종류','전압 (V)','주파수 (Hz)','상수·역률']};
 // 영구 ID는 분류나 배열 순서와 무관합니다. 기존 숫자 ID 대응은 변경하지 않습니다.
 const legacyIds = ['excavator','loader','bulldozer','drilling-rig','pile-driver','dump-truck','cargo-truck','trailer','forklift','crane','aerial-work-platform','roller','mixer-truck','concrete-pump','generator','compressor','other'];
 const legacyIdMap = Object.freeze(Object.fromEntries(legacyIds.map((id,i)=>[String(i),id])));
 function migrateEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const kind = Object.hasOwn(legacyIdMap,String(entry.kind)) ? legacyIdMap[String(entry.kind)] : entry.kind;
  const item = items.find(item=>item.id===kind);
  return {...entry,kind,...(item ? {major:item.major,middle:item.middle} : {})};
 }
 const items = rows.map(([id,name,major,middle,specs])=>({id,name,major,middle,specs:extraSpecs[id]||specs,forms:[...profiles[id][0],'직접 입력'],options:profiles[id][1],aliases:profiles[id][2],sizesByForm:referenceSizes[id]||{},source:id==='cargo-truck'?'cargo-evidence.md':id==='excavator'?'excavator-field-sizes.md':['bulldozer','concrete-pump'].includes(id)?'research-standardization.md':referenceSource}));
 // 표시용 근거는 저장된 호칭 원문을 변경하지 않습니다.
 const evidenceRules = [
  {kind:'forklift',text:'국내 호칭·제조사 모델 사례 / 높이별 잔존하중 별도 확인',section:'references'},
  {kind:'cargo-crane',text:'국내 일부 배차 호칭 / 크레인 인양능력과 별개',section:'references'},
  {kind:'cargo-truck',text:'현장 톤급·제조사 사양 참고 / 실차 치수 별도 확인',section:'limits'},
  {kind:'dump-truck',test:v=>referenceSizes['dump-truck']['*'].includes(v),text:'사용자 확정·현장 통용 톤급',section:'limits'},
  {kind:'loader',test:v=>['3루베 이하','4루베 이하','6루베 이하','6루베 이상'].includes(v),text:'이전 구간·원문 재검증 필요',section:'loader'},
  {kind:'mixer-truck',text:'국내 제조사 제품 사례·적산 참고 / 실물 확인 필요',section:'mixer'},
  {kind:'concrete-pump',text:'적산 참고·수치 정의 확인 필요',section:'pump'},
  {kind:'bulldozer',text:'적산 참고',section:'references'},
  {kind:'grader',text:'적산 참고',section:'references'},
  {kind:'crane',text:'국내 임대사 일부 호칭·전국 표준 아님',section:'references'},
  {kind:'roller',form:'콤비',text:'잠정 호칭·국내 원문 재확인 필요',section:'references'},
  {kind:'excavator',text:'사용자 제공 초안·통용성 추가 검증 전',section:'excavator'}
 ];
 function evidence(kind,form,value){
  if(!value||value==='직접 입력')return '사용자 입력·미검증';
  return evidenceRules.find(r=>r.kind===kind&&(!r.form||r.form===form)&&(!r.test||r.test(value)))?.text||'참고 호칭·실물 제원 별도·미검증';
 }
 function evidenceLink(kind){if(kind==='cargo-truck')return 'cargo-evidence.md';return 'a-evidence.html#'+(evidenceRules.find(r=>r.kind===kind)?.section||'limits');}
 const aSpecFields={'mixer-truck':{mixingTransportCapacity:'혼합·운반 용량 (㎥)',drumTotalVolume:'드럼 총용적 (㎥)'},'concrete-pump':{verticalReach:'수직도달높이 (m)',horizontalReach:'수평도달거리 (m)'}};
 return {evidence,evidenceLink,aSpecFields,version:2, legacyIdMap, migrateEntry, reportStatus:'available', items};
})();
