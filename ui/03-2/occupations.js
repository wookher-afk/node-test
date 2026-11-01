// Shared provisional occupation IDs for company groups and worker registration.
export const OCCUPATIONS = {
  "version": "draft-2026-11-01-1",
  "status": "draft",
  "majors": [
    {
      "id": "NODE-JM-001",
      "name": "토공·기초"
    },
    {
      "id": "NODE-JM-002",
      "name": "배관·설비"
    },
    {
      "id": "NODE-JM-003",
      "name": "골조·콘크리트"
    },
    {
      "id": "NODE-JM-004",
      "name": "철골·금속·용접"
    },
    {
      "id": "NODE-JM-005",
      "name": "건축·마감"
    },
    {
      "id": "NODE-JM-006",
      "name": "전기·통신·소방"
    },
    {
      "id": "NODE-JM-007",
      "name": "도로·교량·터널"
    },
    {
      "id": "NODE-JM-008",
      "name": "조경·산림·환경"
    },
    {
      "id": "NODE-JM-009",
      "name": "플랜트·산업설비"
    },
    {
      "id": "NODE-JM-010",
      "name": "가설·양중·안전지원"
    },
    {
      "id": "NODE-JM-011",
      "name": "해체·보수·특수작업"
    },
    {
      "id": "NODE-JM-012",
      "name": "측량·품질·현장관리"
    },
    {
      "id": "NODE-JM-013",
      "name": "일반·현장지원"
    }
  ],
  "middles": [
    {
      "id": "NODE-JG-001",
      "majorId": "NODE-JM-001",
      "name": "토공·지반"
    },
    {
      "id": "NODE-JG-002",
      "majorId": "NODE-JM-001",
      "name": "특수기초·굴진"
    },
    {
      "id": "NODE-JG-003",
      "majorId": "NODE-JM-002",
      "name": "상하수도·관로"
    },
    {
      "id": "NODE-JG-004",
      "majorId": "NODE-JM-002",
      "name": "건축·기계설비"
    },
    {
      "id": "NODE-JG-005",
      "majorId": "NODE-JM-003",
      "name": "철근·거푸집"
    },
    {
      "id": "NODE-JG-006",
      "majorId": "NODE-JM-003",
      "name": "콘크리트·타설"
    },
    {
      "id": "NODE-JG-007",
      "majorId": "NODE-JM-004",
      "name": "철골·금속"
    },
    {
      "id": "NODE-JG-008",
      "majorId": "NODE-JM-004",
      "name": "용접"
    },
    {
      "id": "NODE-JG-009",
      "majorId": "NODE-JM-005",
      "name": "목공·내장"
    },
    {
      "id": "NODE-JG-010",
      "majorId": "NODE-JM-005",
      "name": "조적·석재·타일"
    },
    {
      "id": "NODE-JG-011",
      "majorId": "NODE-JM-005",
      "name": "미장·도장·방수"
    },
    {
      "id": "NODE-JG-012",
      "majorId": "NODE-JM-005",
      "name": "창호·유리·지붕"
    },
    {
      "id": "NODE-JG-013",
      "majorId": "NODE-JM-006",
      "name": "전기·배선"
    },
    {
      "id": "NODE-JG-014",
      "majorId": "NODE-JM-006",
      "name": "통신·정보통신"
    },
    {
      "id": "NODE-JG-015",
      "majorId": "NODE-JM-006",
      "name": "소방·계장·승강기"
    },
    {
      "id": "NODE-JG-016",
      "majorId": "NODE-JM-007",
      "name": "도로·포장"
    },
    {
      "id": "NODE-JG-017",
      "majorId": "NODE-JM-007",
      "name": "교량·터널"
    },
    {
      "id": "NODE-JG-018",
      "majorId": "NODE-JM-008",
      "name": "조경·산림"
    },
    {
      "id": "NODE-JG-019",
      "majorId": "NODE-JM-008",
      "name": "환경·폐기물"
    },
    {
      "id": "NODE-JG-020",
      "majorId": "NODE-JM-009",
      "name": "플랜트·기계설치"
    },
    {
      "id": "NODE-JG-021",
      "majorId": "NODE-JM-009",
      "name": "정비·시운전·검사"
    },
    {
      "id": "NODE-JG-022",
      "majorId": "NODE-JM-010",
      "name": "가설"
    },
    {
      "id": "NODE-JG-023",
      "majorId": "NODE-JM-010",
      "name": "양중·교통지원"
    },
    {
      "id": "NODE-JG-024",
      "majorId": "NODE-JM-011",
      "name": "해체·절단·보수"
    },
    {
      "id": "NODE-JG-025",
      "majorId": "NODE-JM-011",
      "name": "특수작업"
    },
    {
      "id": "NODE-JG-026",
      "majorId": "NODE-JM-012",
      "name": "측량·공간정보"
    },
    {
      "id": "NODE-JG-027",
      "majorId": "NODE-JM-012",
      "name": "품질·안전관리"
    },
    {
      "id": "NODE-JG-028",
      "majorId": "NODE-JM-012",
      "name": "현장·공사관리"
    },
    {
      "id": "NODE-JG-029",
      "majorId": "NODE-JM-013",
      "name": "일반·보조·운반"
    },
    {
      "id": "NODE-JG-030",
      "majorId": "NODE-JM-013",
      "name": "정리·청소·경비"
    },
    {
      "id": "NODE-JG-031",
      "majorId": "NODE-JM-013",
      "name": "자재관리"
    }
  ],
  "items": [
    {
      "id": "NODE-JO-0001",
      "middleId": "NODE-JG-001",
      "name": "토공 작업자",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0002",
      "middleId": "NODE-JG-001",
      "name": "지반개량공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0003",
      "middleId": "NODE-JG-001",
      "name": "흙막이공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0004",
      "middleId": "NODE-JG-001",
      "name": "흙막이 작업자",
      "source": "작"
    },
    {
      "id": "NODE-JO-0005",
      "middleId": "NODE-JG-001",
      "name": "파일공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0006",
      "middleId": "NODE-JG-001",
      "name": "기초공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0007",
      "middleId": "NODE-JG-002",
      "name": "지중연속벽공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0008",
      "middleId": "NODE-JG-002",
      "name": "수평시추공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0009",
      "middleId": "NODE-JG-002",
      "name": "비개착 추진공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0010",
      "middleId": "NODE-JG-002",
      "name": "잠함공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0011",
      "middleId": "NODE-JG-003",
      "name": "상수도 배관공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0012",
      "middleId": "NODE-JG-003",
      "name": "하수도 배관공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0013",
      "middleId": "NODE-JG-003",
      "name": "오수관 배관공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0014",
      "middleId": "NODE-JG-003",
      "name": "관로 배관공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0015",
      "middleId": "NODE-JG-003",
      "name": "관로 접합공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0016",
      "middleId": "NODE-JG-003",
      "name": "관로 보수공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0017",
      "middleId": "NODE-JG-003",
      "name": "누수탐사원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0018",
      "middleId": "NODE-JG-003",
      "name": "수도계량기 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0019",
      "middleId": "NODE-JG-003",
      "name": "맨홀 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0020",
      "middleId": "NODE-JG-003",
      "name": "배수공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0021",
      "middleId": "NODE-JG-004",
      "name": "기계설비 배관공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0022",
      "middleId": "NODE-JG-004",
      "name": "위생설비공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0023",
      "middleId": "NODE-JG-004",
      "name": "소방배관공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0024",
      "middleId": "NODE-JG-004",
      "name": "가스배관공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0025",
      "middleId": "NODE-JG-004",
      "name": "보온공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0026",
      "middleId": "NODE-JG-004",
      "name": "설비공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0027",
      "middleId": "NODE-JG-004",
      "name": "설비 기사",
      "source": "작"
    },
    {
      "id": "NODE-JO-0028",
      "middleId": "NODE-JG-004",
      "name": "펌프 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0029",
      "middleId": "NODE-JG-004",
      "name": "배관 설치공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0030",
      "middleId": "NODE-JG-004",
      "name": "배관 보조공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0031",
      "middleId": "NODE-JG-005",
      "name": "철근공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0032",
      "middleId": "NODE-JG-005",
      "name": "형틀목공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0033",
      "middleId": "NODE-JG-005",
      "name": "거푸집공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0034",
      "middleId": "NODE-JG-006",
      "name": "콘크리트공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0035",
      "middleId": "NODE-JG-006",
      "name": "콘크리트 타설공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0036",
      "middleId": "NODE-JG-006",
      "name": "타설공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0037",
      "middleId": "NODE-JG-006",
      "name": "콘크리트 펌프카 보조",
      "source": "업"
    },
    {
      "id": "NODE-JO-0038",
      "middleId": "NODE-JG-006",
      "name": "그라우팅공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0039",
      "middleId": "NODE-JG-007",
      "name": "철골공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0040",
      "middleId": "NODE-JG-007",
      "name": "강구조물 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0041",
      "middleId": "NODE-JG-007",
      "name": "제관공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0042",
      "middleId": "NODE-JG-007",
      "name": "금속공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0043",
      "middleId": "NODE-JG-007",
      "name": "판금공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0044",
      "middleId": "NODE-JG-007",
      "name": "금속재 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0045",
      "middleId": "NODE-JG-007",
      "name": "볼트 체결공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0046",
      "middleId": "NODE-JG-007",
      "name": "취부공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0047",
      "middleId": "NODE-JG-008",
      "name": "용접공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0048",
      "middleId": "NODE-JG-008",
      "name": "배관용접공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0049",
      "middleId": "NODE-JG-008",
      "name": "특수용접공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0050",
      "middleId": "NODE-JG-008",
      "name": "플랜트 용접공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0051",
      "middleId": "NODE-JG-009",
      "name": "건축목공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0052",
      "middleId": "NODE-JG-009",
      "name": "내장목공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0053",
      "middleId": "NODE-JG-009",
      "name": "경량철골공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0054",
      "middleId": "NODE-JG-009",
      "name": "석고보드공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0055",
      "middleId": "NODE-JG-009",
      "name": "실내인테리어공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0056",
      "middleId": "NODE-JG-009",
      "name": "인테리어 시공공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0057",
      "middleId": "NODE-JG-010",
      "name": "조적공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0058",
      "middleId": "NODE-JG-010",
      "name": "블록공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0059",
      "middleId": "NODE-JG-010",
      "name": "벽돌공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0060",
      "middleId": "NODE-JG-010",
      "name": "석공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0061",
      "middleId": "NODE-JG-010",
      "name": "타일공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0062",
      "middleId": "NODE-JG-011",
      "name": "미장공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0063",
      "middleId": "NODE-JG-011",
      "name": "도장공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0064",
      "middleId": "NODE-JG-011",
      "name": "도배공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0065",
      "middleId": "NODE-JG-011",
      "name": "방수공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0066",
      "middleId": "NODE-JG-011",
      "name": "단열공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0067",
      "middleId": "NODE-JG-011",
      "name": "바닥재 시공공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0068",
      "middleId": "NODE-JG-011",
      "name": "실리콘 시공공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0069",
      "middleId": "NODE-JG-012",
      "name": "금속창호공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0070",
      "middleId": "NODE-JG-012",
      "name": "샤시공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0071",
      "middleId": "NODE-JG-012",
      "name": "창호공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0072",
      "middleId": "NODE-JG-012",
      "name": "유리공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0073",
      "middleId": "NODE-JG-012",
      "name": "지붕공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0074",
      "middleId": "NODE-JG-013",
      "name": "전기공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0075",
      "middleId": "NODE-JG-013",
      "name": "내선전공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0076",
      "middleId": "NODE-JG-013",
      "name": "외선전공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0077",
      "middleId": "NODE-JG-013",
      "name": "배전공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0078",
      "middleId": "NODE-JG-013",
      "name": "송전공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0079",
      "middleId": "NODE-JG-013",
      "name": "전기설비 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0080",
      "middleId": "NODE-JG-013",
      "name": "배선공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0081",
      "middleId": "NODE-JG-013",
      "name": "전기 보조공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0082",
      "middleId": "NODE-JG-013",
      "name": "태양광 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0083",
      "middleId": "NODE-JG-014",
      "name": "통신공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0084",
      "middleId": "NODE-JG-014",
      "name": "정보통신 기사",
      "source": "작"
    },
    {
      "id": "NODE-JO-0085",
      "middleId": "NODE-JG-014",
      "name": "광케이블 포설공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0086",
      "middleId": "NODE-JG-014",
      "name": "통신선로공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0087",
      "middleId": "NODE-JG-014",
      "name": "CCTV 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0088",
      "middleId": "NODE-JG-015",
      "name": "소방전기공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0089",
      "middleId": "NODE-JG-015",
      "name": "소방설비공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0090",
      "middleId": "NODE-JG-015",
      "name": "계장공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0091",
      "middleId": "NODE-JG-015",
      "name": "산업계장공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0092",
      "middleId": "NODE-JG-015",
      "name": "승강기 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0093",
      "middleId": "NODE-JG-016",
      "name": "아스팔트 포장공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0094",
      "middleId": "NODE-JG-016",
      "name": "아스콘 포장공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0095",
      "middleId": "NODE-JG-016",
      "name": "도로시설물 설치공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0096",
      "middleId": "NODE-JG-016",
      "name": "차선도색공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0097",
      "middleId": "NODE-JG-016",
      "name": "교통안전시설공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0098",
      "middleId": "NODE-JG-016",
      "name": "가드레일 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0099",
      "middleId": "NODE-JG-017",
      "name": "교량공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0100",
      "middleId": "NODE-JG-017",
      "name": "교량 받침 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0101",
      "middleId": "NODE-JG-017",
      "name": "터널공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0102",
      "middleId": "NODE-JG-017",
      "name": "숏크리트공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0103",
      "middleId": "NODE-JG-017",
      "name": "록볼트공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0104",
      "middleId": "NODE-JG-017",
      "name": "터널 방수공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0105",
      "middleId": "NODE-JG-018",
      "name": "조경공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0106",
      "middleId": "NODE-JG-018",
      "name": "조경식재공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0107",
      "middleId": "NODE-JG-018",
      "name": "조경시설물공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0108",
      "middleId": "NODE-JG-018",
      "name": "수목관리공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0109",
      "middleId": "NODE-JG-018",
      "name": "벌목공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0110",
      "middleId": "NODE-JG-018",
      "name": "예초공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0111",
      "middleId": "NODE-JG-018",
      "name": "잔디시공공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0112",
      "middleId": "NODE-JG-018",
      "name": "석축공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0113",
      "middleId": "NODE-JG-018",
      "name": "옹벽공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0114",
      "middleId": "NODE-JG-019",
      "name": "환경정비공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0115",
      "middleId": "NODE-JG-019",
      "name": "폐기물 처리공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0116",
      "middleId": "NODE-JG-019",
      "name": "오염토 정화공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0117",
      "middleId": "NODE-JG-019",
      "name": "건설폐기물 분리공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0118",
      "middleId": "NODE-JG-020",
      "name": "플랜트 배관공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0119",
      "middleId": "NODE-JG-020",
      "name": "기계설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0120",
      "middleId": "NODE-JG-020",
      "name": "탱크 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0121",
      "middleId": "NODE-JG-020",
      "name": "보일러 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0122",
      "middleId": "NODE-JG-020",
      "name": "덕트공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0123",
      "middleId": "NODE-JG-020",
      "name": "공조냉동공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0124",
      "middleId": "NODE-JG-020",
      "name": "산업설비공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0125",
      "middleId": "NODE-JG-021",
      "name": "설비보전공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0126",
      "middleId": "NODE-JG-021",
      "name": "플랜트 정비공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0127",
      "middleId": "NODE-JG-021",
      "name": "시운전 기술자",
      "source": "업"
    },
    {
      "id": "NODE-JO-0128",
      "middleId": "NODE-JG-021",
      "name": "비파괴검사원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0129",
      "middleId": "NODE-JG-021",
      "name": "건설기계 정비사",
      "source": "업"
    },
    {
      "id": "NODE-JO-0130",
      "middleId": "NODE-JG-022",
      "name": "비계공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0131",
      "middleId": "NODE-JG-022",
      "name": "동바리공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0132",
      "middleId": "NODE-JG-022",
      "name": "동바리 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0133",
      "middleId": "NODE-JG-022",
      "name": "가설울타리 설치공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0134",
      "middleId": "NODE-JG-022",
      "name": "가설전기공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0135",
      "middleId": "NODE-JG-022",
      "name": "가설배관공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0136",
      "middleId": "NODE-JG-023",
      "name": "신호수",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0137",
      "middleId": "NODE-JG-023",
      "name": "줄걸이공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0138",
      "middleId": "NODE-JG-023",
      "name": "양중공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0139",
      "middleId": "NODE-JG-023",
      "name": "교통통제원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0140",
      "middleId": "NODE-JG-023",
      "name": "유도원",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0141",
      "middleId": "NODE-JG-024",
      "name": "해체공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0142",
      "middleId": "NODE-JG-024",
      "name": "철거공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0143",
      "middleId": "NODE-JG-024",
      "name": "코어천공공",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0144",
      "middleId": "NODE-JG-024",
      "name": "콘크리트 절단공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0145",
      "middleId": "NODE-JG-024",
      "name": "절단공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0146",
      "middleId": "NODE-JG-024",
      "name": "콘크리트 연마공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0147",
      "middleId": "NODE-JG-024",
      "name": "보수보강공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0148",
      "middleId": "NODE-JG-024",
      "name": "석면해체공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0149",
      "middleId": "NODE-JG-025",
      "name": "수중작업 잠수사",
      "source": "업"
    },
    {
      "id": "NODE-JO-0150",
      "middleId": "NODE-JG-025",
      "name": "암반발파공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0151",
      "middleId": "NODE-JG-025",
      "name": "화약취급공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0152",
      "middleId": "NODE-JG-025",
      "name": "로프접근 작업자",
      "source": "업"
    },
    {
      "id": "NODE-JO-0153",
      "middleId": "NODE-JG-026",
      "name": "측량공",
      "source": "업"
    },
    {
      "id": "NODE-JO-0154",
      "middleId": "NODE-JG-026",
      "name": "측량기사",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0155",
      "middleId": "NODE-JG-026",
      "name": "드론 측량사",
      "source": "업"
    },
    {
      "id": "NODE-JO-0156",
      "middleId": "NODE-JG-026",
      "name": "3D 스캐닝 기술자",
      "source": "업"
    },
    {
      "id": "NODE-JO-0157",
      "middleId": "NODE-JG-027",
      "name": "안전관리자",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0158",
      "middleId": "NODE-JG-027",
      "name": "안전감시단",
      "source": "업"
    },
    {
      "id": "NODE-JO-0159",
      "middleId": "NODE-JG-027",
      "name": "품질관리자",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0160",
      "middleId": "NODE-JG-027",
      "name": "품질시험원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0161",
      "middleId": "NODE-JG-028",
      "name": "현장소장",
      "source": "업"
    },
    {
      "id": "NODE-JO-0162",
      "middleId": "NODE-JG-028",
      "name": "공사관리자",
      "source": "업"
    },
    {
      "id": "NODE-JO-0163",
      "middleId": "NODE-JG-028",
      "name": "공무 담당자",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0164",
      "middleId": "NODE-JG-028",
      "name": "시공관리자",
      "source": "업"
    },
    {
      "id": "NODE-JO-0165",
      "middleId": "NODE-JG-028",
      "name": "건설사업관리 기술자",
      "source": "업"
    },
    {
      "id": "NODE-JO-0166",
      "middleId": "NODE-JG-028",
      "name": "현장 반장",
      "source": "업"
    },
    {
      "id": "NODE-JO-0167",
      "middleId": "NODE-JG-028",
      "name": "작업반장",
      "source": "업"
    },
    {
      "id": "NODE-JO-0168",
      "middleId": "NODE-JG-028",
      "name": "현장관리자",
      "source": "작"
    },
    {
      "id": "NODE-JO-0169",
      "middleId": "NODE-JG-028",
      "name": "현장 사무원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0170",
      "middleId": "NODE-JG-029",
      "name": "보통인부",
      "source": "업·작"
    },
    {
      "id": "NODE-JO-0171",
      "middleId": "NODE-JG-029",
      "name": "현장 보조공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0172",
      "middleId": "NODE-JG-029",
      "name": "자재 운반원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0173",
      "middleId": "NODE-JG-030",
      "name": "현장 정리원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0174",
      "middleId": "NODE-JG-030",
      "name": "현장 정리공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0175",
      "middleId": "NODE-JG-030",
      "name": "청소·정리공",
      "source": "작"
    },
    {
      "id": "NODE-JO-0176",
      "middleId": "NODE-JG-030",
      "name": "청소원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0177",
      "middleId": "NODE-JG-030",
      "name": "경비원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0178",
      "middleId": "NODE-JG-031",
      "name": "자재관리원",
      "source": "업"
    },
    {
      "id": "NODE-JO-0179",
      "middleId": "NODE-JG-031",
      "name": "자재관리공",
      "source": "작"
    }
  ]
};
export const occupationById = new Map(OCCUPATIONS.items.map(x => [x.id, x]));
