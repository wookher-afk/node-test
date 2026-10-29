/* 기존 장비 목록 재사용. 분류·제원 항목은 UI 초안이며 보고서 확인 사례가 아님. */
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
 ['aerial-work-platform','고소작업차','인양·고소','고소',['최대 작업높이 (m)','작업대 허용하중 (kg)']],
 ['roller','롤러','도로·콘크리트','다짐',['운전중량 (t)','다짐 폭 (mm)']],
 ['mixer-truck','믹서트럭','도로·콘크리트','콘크리트',['드럼 용량 (㎥)']],
 ['concrete-pump','펌프카','도로·콘크리트','콘크리트',['붐 길이 (m)','최대 토출량 (㎥/h)']],
 ['generator','발전기','동력·지원','발전',['정격출력 (kW)','정격용량 (kVA)']],
 ['compressor','콤프레서','동력·지원','압축공기',['토출량 (㎥/min)','사용 압력 (bar)']],
 ['other','기타','기타','직접 등록',['실제 제원 (단위 포함)']]
 ];
 // 영구 ID는 분류나 배열 순서와 무관합니다. 기존 숫자 ID 대응은 변경하지 않습니다.
 const legacyIds = ['excavator','loader','bulldozer','drilling-rig','pile-driver','dump-truck','cargo-truck','trailer','forklift','crane','aerial-work-platform','roller','mixer-truck','concrete-pump','generator','compressor','other'];
 const legacyIdMap = Object.freeze(Object.fromEntries(legacyIds.map((id,i)=>[String(i),id])));
 function migrateEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const kind = legacyIdMap[String(entry.kind)] ?? entry.kind;
  const item = items.find(item=>item.id===kind);
  return {...entry,kind,...(item ? {major:item.major,middle:item.middle} : {})};
 }
 const items = rows.map(([id,name,major,middle,specs,sizes=[]])=>({id,name,major,middle,specs,sizes:sizes.map(label=>({label,status:'legacy-unverified',source:'node_worker_signup_0_5.html · E_SIZES'})),forms:['직접 입력'],options:[],status:'report-pending'}));
 return {version:2, legacyIdMap, migrateEntry, reportStatus:'missing', items};
})();
