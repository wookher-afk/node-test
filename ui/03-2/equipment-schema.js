window.NODE_EQUIPMENT_PROFILES = {
  "loader": {
    "grade": "B",
    "flow": "타이어식/궤도식 → 버킷 용량 직접 입력 → 산적/평적/모름 → 장착 버킷",
    "limit": "3/4/6 이하 중복 구간은 A안에서 이미 제거. 재도입하지 않는다. 제조사 범위는 버킷 선택별 값이다.",
    "core": "장착 버킷 용량(㎥), 현장 ○루베급 원문",
    "sources": [
      [
        "현대 HL955A·HL960A 국내 카탈로그",
        "https://www.hyundai-ce.com/resources/KOR_HL955A_HL960A%2823.08%29_web.pdf"
      ],
      [
        "Volvo L120H 한국어 제품표",
        "https://www.volvoce.com/ko-kr/products/wheel-loaders/l120h/"
      ],
      [
        "전문가들 페이로더 분류",
        "https://specialists.kr/list/1/48?device=pc&page=2"
      ]
    ],
    "fields": [
      {
        "key": "capacityBasis",
        "label": "버킷 용량 기준",
        "choices": [
          "산적",
          "평적"
        ],
        "multi": false
      },
      {
        "key": "bucket",
        "label": "장착 버킷 설명",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "bulldozer": {
    "grade": "B",
    "flow": "무한궤도/타이어 → 모델 또는 호칭 → 실제 중량과 정의",
    "limit": "7/10/12/19/32t 등은 적산 참고로만 유지. D6는 6t가 아니다. 혜인 D6 표의 형식승인 23,530kg와 제작사 23,911kg가 다르다.",
    "core": "형태 + 모델/중량급 원문",
    "sources": [
      [
        "혜인 불도저 목록",
        "https://catmachine.haein.com/catmachine/product/list_3depth.php?part_idx=5"
      ],
      [
        "D6 LGP 형식승인·제작사 비교표",
        "https://catmachine.haein.com/catmachine/product/view.php?idx=28"
      ],
      [
        "광림 제품 분류",
        "https://www.kanglim.com/product/product?ca_id=01"
      ],
      [
        "2026 경비산출표, 인쇄 4쪽",
        "https://www.cak.or.kr/download.do?uuid=b25d1f7d-c15d-4900-9806-f5f2d26239cf.pdf"
      ]
    ],
    "fields": [
      {
        "key": "weightBasis",
        "label": "중량 정의",
        "choices": [
          "형식승인",
          "제작사",
          "실측"
        ],
        "multi": false
      },
      {
        "key": "blade",
        "label": "블레이드 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "drilling-rig": {
    "grade": "C",
    "flow": "암반/앵커/기초/기타 용도 → 톱해머/DTH/회전/기타 → 공경·깊이 → 본체/장치",
    "limit": "국내 제조사 제품군은 확인했으나 공법별 국내 공통 급수와 최신 수치표 대조 부족. 공법 분기를 기본으로 할지 Q1에서 결정.",
    "core": "공법 + 천공경(mm) + 깊이(m)",
    "sources": [
      [
        "수산세보틱스 공식 사이트",
        "https://soosancebotics.com/ko/main"
      ],
      [
        "현대에버다임 크롤러드릴 제품군",
        "https://hyundaieverdigm.com/business/bList.asp?cCode=1630024598"
      ]
    ],
    "fields": [
      {
        "key": "purpose",
        "label": "용도",
        "choices": [
          "암반",
          "앵커",
          "기초"
        ],
        "multi": false
      },
      {
        "key": "methods",
        "label": "공법 (복수)",
        "choices": [
          "톱해머",
          "DTH",
          "회전"
        ],
        "multi": true
      },
      {
        "key": "body",
        "label": "본체 모델",
        "choices": [],
        "multi": false
      },
      {
        "key": "devices",
        "label": "장착장치 (복수)",
        "choices": [
          "해머",
          "오거",
          "케이싱"
        ],
        "multi": true
      },
      {
        "key": "torque",
        "label": "토크 (kN·m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "thrust",
        "label": "추력 (kN)",
        "choices": [],
        "multi": false
      },
      {
        "key": "air",
        "label": "요구 공기량 (㎥/min)",
        "choices": [],
        "multi": false
      },
      {
        "key": "pressure",
        "label": "요구 압력 (bar)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "pile-driver": {
    "grade": "C",
    "flow": "항타/항발/천공매입/압입 → 본체 모델 → 리더 → 해머/오거/압입장치",
    "limit": "국내 보유 DH 모델과 제조사 구기종 목록은 교차 확인. 기종별 조건이 달라 단일 톤급 메뉴 불가. 공법별 구조는 Q1.",
    "core": "공법 + 본체/리더/장착장치",
    "sources": [
      [
        "청오기초건설 보유 장비",
        "https://www.cheongoh.net/blank-1"
      ],
      [
        "일본차량 구기종 공식 표",
        "https://www.n-sharyo.co.jp/business/kiden/PDF/PDF-downloads_old.htm"
      ],
      [
        "본체·해머·오거 조건을 구분하는 제조사 양식 목록",
        "https://antei.n-sharyo.co.jp/antei/SiryoDownload/SiryoDownload.aspx"
      ]
    ],
    "fields": [
      {
        "key": "methods",
        "label": "공법 (복수)",
        "choices": [
          "항타",
          "항발",
          "천공매입",
          "압입"
        ],
        "multi": true
      },
      {
        "key": "body",
        "label": "본체 모델",
        "choices": [],
        "multi": false
      },
      {
        "key": "devices",
        "label": "장치 (복수)",
        "choices": [
          "드롭해머",
          "유압해머",
          "진동해머",
          "오거",
          "압입장치"
        ],
        "multi": true
      },
      {
        "key": "leader",
        "label": "리더 길이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "energy",
        "label": "해머 에너지 (kJ)",
        "choices": [],
        "multi": false
      },
      {
        "key": "ram",
        "label": "램 중량 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "torque",
        "label": "오거 토크 (kN·m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "trailer": {
    "grade": "C",
    "flow": "저상/평판/기타 → 축수·구즈넥/확장 구성 → 적재량·길이·폭·지상고",
    "limit": "국내 판매 형태 확인, 제작사 승인 적재량과 데크 도면의 교차 근거 부족. 광고 상차능력을 등록량으로 쓰지 않는다. Q1/Q3.",
    "core": "데크 형식 + 등록 적재량/유효 데크",
    "sources": [
      [
        "골든트럭 저상·가변 트레일러 판매 목록",
        "https://grace131.cafe24.com/shop2/category/트레일러trailer/30/"
      ]
    ],
    "fields": [
      {
        "key": "axles",
        "label": "축수",
        "choices": [],
        "multi": false
      },
      {
        "key": "neck",
        "label": "구즈넥·확장 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "registeredPayload",
        "label": "등록 적재량 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "deckLength",
        "label": "유효 데크 길이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "deckWidth",
        "label": "유효 데크 폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "deckHeight",
        "label": "지상고 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "connection",
        "label": "연결조건",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "forklift": {
    "grade": "B",
    "flow": "카운터밸런스/리치/기타 → 톤급 → 디젤/LPG/전동/기타 → 인상높이",
    "limit": "2.5/3톤은 기존 국내 근거 후보. 6/7/8/9t는 현대 공식 B-X 모델표에서 확인한 제품 사례. 5/10톤 이상 등 기존 미사용 배열을 검증 완료 목록으로 복구하지 않는다. 수치 직접 입력을 항상 제공. 높이별 잔존하중 별도.",
    "core": "정격하중 톤급",
    "sources": [
      [
        "현대 25B-X 공식 제원",
        "https://www.hd-xitesolution.com/material_handling/palletTruckView/824"
      ],
      [
        "현대 B-X 카탈로그",
        "https://www.hd-xitesolution.com/attachments/OFD8kY1lN"
      ],
      [
        "탑로지스 직접 채용 공고",
        "https://m.saramin.co.kr/job-search/view?rec_idx=55323063"
      ],
      [
        "현대 60~90B-X 공식 모델표",
        "https://www.hd-xitesolution.com/attachments/UjzoC7RXgMYMxbKv"
      ]
    ],
    "fields": [
      {
        "key": "power",
        "label": "동력",
        "choices": [
          "디젤",
          "LPG",
          "전동"
        ],
        "multi": false
      },
      {
        "key": "mast",
        "label": "마스트 단수",
        "choices": [],
        "multi": false
      },
      {
        "key": "freeLift",
        "label": "자유인상 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "forkLength",
        "label": "포크 길이 (mm)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "telehandler": {
    "grade": "B",
    "flow": "고정식/회전식/모름 → 하중·높이 → 전방거리 → 장착장치",
    "limit": "YK MT420H/625H/930H 국내 공급 표기와 제조사 계열을 대조. 4m·2t/6m·2.5t/9m·3t는 모델 요약 사례로만 표시. 최대 하중과 최대 높이 동시 성립을 보장하지 않는다. MRT2570 요약 불일치는 채택 제외.",
    "core": "정격하중(t) + 최대 인상높이(m)",
    "sources": [
      [
        "YK건기 국내 핸들러 제품표",
        "https://www.sunnyyk.co.kr/product_handler"
      ],
      [
        "YK 공식 카탈로그 분류",
        "https://sunnyyk.co.kr/catalog"
      ],
      [
        "국내 거래 분류의 하이랜더 표기",
        "https://specialists.kr/list/1/48?device=pc&page=2"
      ]
    ],
    "fields": [
      {
        "key": "reach",
        "label": "최대 전방거리 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "supports",
        "label": "지지대 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "device",
        "label": "장착장치",
        "choices": [
          "포크",
          "버킷"
        ],
        "multi": false
      },
      {
        "key": "loadChart",
        "label": "하중표 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "crane": {
    "grade": "B",
    "flow": "트럭/RT/AT/크롤러 → 형태별 호칭 → 반경·붐·지브 → 하중표 구성",
    "limit": "RT 빠른 선택 권고:13/16/25/50/70/80/100톤. AT:100/130/150/200/250/300톤. 국내 임대사 공개 안내의 일부 후보이며 전국 표준 아님. 60/75 및 160/220는 재확인 전 새 메뉴 보류, 기존 저장값 보존. 트럭·크롤러 직접 입력. TADANO 하중은 반경·붐·본걸이 조건부.",
    "core": "형태별 현장 톤급",
    "sources": [
      [
        "국내 AT·RT 임대 선택지",
        "https://www.crane-solution.com/rental"
      ],
      [
        "탐진크레인 보유장비",
        "https://tamjincrane.com/equipment"
      ],
      [
        "TADANO GR-250N 공식 조건",
        "https://www.tadano.com/japan/products/rt/gr-250n/"
      ]
    ],
    "fields": [
      {
        "key": "radius",
        "label": "기준 반경 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "jib",
        "label": "지브 길이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "counterweight",
        "label": "평형추 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "supportWidth",
        "label": "지지폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "loadChart",
        "label": "하중표 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "aerial-work-platform": {
    "grade": "B",
    "flow": "시저/굴절붐/직진붐/수직마스트 → 전동/엔진/기타 → 작업높이 → 실내/실외",
    "limit": "국내 임대 분류와 Genie 공식 CE 표 교차. GS-1932는 실내 작업높이 7.64m, 실외 6.27m로 다르며 국내 실차 사양 보증 아님. 발판높이에 전역 +2m 계산 금지.",
    "core": "작업높이(m) + 형태",
    "sources": [
      [
        "에이원렌탈 장비 분류",
        "https://www.aonerental.co.kr/"
      ],
      [
        "Genie GS-1932 공식 2026 CE 사양",
        "https://www.genielift.com/docs/default-source/product-specifications/slab-scissor-lifts-%28ansi%29-or-electric-and-bi-energy-lifts-%28ce%29/en-in/2026/gs-1932-product-specifications-2026-ce.pdf?sfvrsn=cbc05a38_1"
      ]
    ],
    "fields": [
      {
        "key": "power",
        "label": "동력",
        "choices": [
          "전동",
          "엔진"
        ],
        "multi": false
      },
      {
        "key": "environment",
        "label": "사용 조건",
        "choices": [
          "실내",
          "실외",
          "실내외"
        ],
        "multi": false
      },
      {
        "key": "platformHeight",
        "label": "발판높이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "entryWidth",
        "label": "진입폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "entryHeight",
        "label": "진입높이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "roller": {
    "grade": "C",
    "flow": "머캐덤/탠덤/싱글드럼/타이어/콤비/보행식/기타 → 진동 여부 → 실제 중량 → 다짐폭",
    "limit": "SAKAI TW354 2,640kg/TW504 3,540kg 확인. 국내 2.5/3.5톤 콤비 호칭을 그 값으로 치환하지 않는다. 국내 호칭 원문 재확보 부족. 기존 잠정 메뉴 보존과 새 추천 제한 Q1.",
    "core": "구조별 운전중량(t)",
    "sources": [
      [
        "SAKAI TW354·TW504 공식 제원",
        "https://www.sakainet.co.jp/products/roller-pavement/tw354.html"
      ],
      [
        "기존 대광건설기계 링크",
        "https://www.daara.co.kr/sell/s_view.php?no=584944"
      ]
    ],
    "fields": [
      {
        "key": "vibration",
        "label": "진동 여부",
        "choices": [
          "있음",
          "없음"
        ],
        "multi": false
      },
      {
        "key": "ballast",
        "label": "밸러스트 조건",
        "choices": [],
        "multi": false
      },
      {
        "key": "frequency",
        "label": "주파수 (Hz)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "mixer-truck": {
    "grade": "A",
    "flow": "차량탑재 → 혼합·운반 6㎥ 또는 직접 입력 → 실제 작업용량 → 드럼 총용적(선택)",
    "limit": "국내 현대 공식 6㎥ 제품 사례. 6㎥만 존재한다는 뜻 아님. A안 두 용량 분리와 과거 드럼 원문 보존 그대로 유지.",
    "core": "혼합·운반 용량(㎥)",
    "sources": [
      [
        "현대 뉴파워트럭 카탈로그, 마지막 제원면",
        "https://www.hyundai.com/ccontents/carmng/CP00000005/new-power-truck-2026-05-catalog.pdf"
      ],
      [
        "2026 경비산출표",
        "https://www.cak.or.kr/download.do?uuid=b25d1f7d-c15d-4900-9806-f5f2d26239cf.pdf"
      ]
    ],
    "fields": [
      {
        "key": "capacityBasis",
        "label": "작업용량 확인 근거",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "concrete-pump": {
    "grade": "B",
    "flow": "붐형/라인형 → 붐형 기존 21/28/32/36/41/43/47/52m 참고 또는 직접 입력 → 수직/수평 별도; 라인형 → 토출량·압력",
    "limit": "ECP43CXM 공식 제품 존재와 적산표를 구별. 기존 m 호칭을 붐 길이 또는 수직높이로 확정하지 않는다. A안 라인형 숨김·보관 로직 유지.",
    "core": "붐형 현장 m급 / 라인형 유량·압력",
    "sources": [
      [
        "현대에버다임 ECP43CXM",
        "https://hyundaieverdigm.com/business/business_view.asp?pidx=473"
      ],
      [
        "2026 경비산출표, 인쇄 13~14쪽",
        "https://www.cak.or.kr/download.do?uuid=b25d1f7d-c15d-4900-9806-f5f2d26239cf.pdf"
      ]
    ],
    "fields": [
      {
        "key": "pressure",
        "label": "토출압력 (bar)",
        "choices": [],
        "multi": false
      },
      {
        "key": "pipeDiameter",
        "label": "배관경 (mm)",
        "choices": [],
        "multi": false
      },
      {
        "key": "pipe",
        "label": "배관 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "generator": {
    "grade": "B",
    "flow": "이동/고정 → kW 또는 kVA 원문 입력 → 상용/비상/기타/모름 → 전압·Hz·상수",
    "limit": "중부 JBG-40 비상 40kW/50kVA 확인. 임대 구간을 전국 공통 메뉴로 복사하지 않는다. 역률 미확인 kW↔kVA 자동환산 금지.",
    "core": "출력 + 정격 종류",
    "sources": [
      [
        "중부종합기계 국내 제원",
        "https://jungbuen.com/product/generator/soundproof.do"
      ],
      [
        "에버다임 공식 발전기 카탈로그(2020.08)",
        "https://hyundaieverdigm.com/EDFileUpload/Product/introcatal/Generator_set_eng.pdf"
      ],
      [
        "신명발전기 임대 분류",
        "https://smgenerator.com/"
      ],
      [
        "Denyo 공식 과거 DCA 카탈로그",
        "https://www.denyo.co.jp/dl/support/pdf/DCA.pdf"
      ]
    ],
    "fields": [
      {
        "key": "rating",
        "label": "정격 종류",
        "choices": [
          "상용",
          "비상"
        ],
        "multi": false
      },
      {
        "key": "voltage",
        "label": "전압 (V)",
        "choices": [],
        "multi": false
      },
      {
        "key": "frequency",
        "label": "주파수 (Hz)",
        "choices": [],
        "multi": false
      },
      {
        "key": "phases",
        "label": "상수",
        "choices": [],
        "multi": false
      },
      {
        "key": "powerFactor",
        "label": "역률",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "compressor": {
    "grade": "C",
    "flow": "엔진 이동/전동 → 토출량(㎥/min 또는 CFM) → 압력(bar/MPa) → 공기품질",
    "limit": "AIRMAN 공식 PDF 재접근 시간초과. 기존 390급과 11㎥/min 근거는 이전 조사 승계로만 표시. 국내 CFM 급수/접미사/압력 대응 부족. 265/390/750을 전국 공통 급수로 채택하지 않음. Q1.",
    "core": "토출량 + 기준 사용압력",
    "sources": [
      [
        "AIRMAN 일본 공식 PDS 표",
        "https://www.airman.co.jp/media/files/2203_SOGO_36P_no22.pdf"
      ],
      [
        "AIRMAN 공식 수출용 PDS 카탈로그",
        "https://www.airman.co.jp/media/files/_u/catalog_ch/pds_stage2_3_en.pdf"
      ],
      [
        "신명발전기 현장 장비 용어",
        "https://smgenerator.com/"
      ]
    ],
    "fields": [
      {
        "key": "flow",
        "label": "실제 토출량 (값·단위 ㎥/min 또는 CFM)",
        "choices": [],
        "multi": false
      },
      {
        "key": "pressure",
        "label": "기준 사용압력 (값·단위 bar/MPa)",
        "choices": [],
        "multi": false
      },
      {
        "key": "measurement",
        "label": "토출량 측정 기준 (FAD 等)",
        "choices": [],
        "multi": false
      },
      {
        "key": "airQuality",
        "label": "공기품질",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "other": {
    "grade": "B",
    "flow": "장비명 → 형태 직접 입력 → 규격 원문/단위 → 근거",
    "limit": "카탈로그상 미분류 경로이며 실물 1종이 아님. 외부 공통 규격의 검증 대상 아님. B는 입력 정책 판단. 자동 분류 승격하지 않는다.",
    "core": "실제 장비명 + 단위 있는 규격",
    "sources": [],
    "fields": [
      {
        "key": "description",
        "label": "규격 원문 (단위 포함)",
        "choices": [],
        "multi": false
      },
      {
        "key": "device",
        "label": "장치 설명",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "skid-loader": {
    "grade": "B",
    "flow": "바퀴식/궤도식 → ROC → 장치 → 유압 요구조건",
    "limit": "공식 한국어 Bobcat PDF는 이번 도구에서 형식 제한. 이전 조사 590kg 사례는 승계 참고이며 최신 국내 전체 메뉴로 쓰지 않음. ROC와 전도하중·운전중량 구분.",
    "core": "정격적재용량 ROC(kg)",
    "sources": [
      [
        "밥캣 S450 한국어 공식 자료",
        "https://assets.bobcat.com/products/korean_spec_2021/SPEC-S450.pdf"
      ],
      [
        "밥캣 한국어 로더 자료",
        "https://assets.bobcat.com/products/update2021/20210326Bobcat_LOADER.pdf"
      ],
      [
        "삼부자중기 직접 임대 안내",
        "https://busajg.co.kr/"
      ]
    ],
    "fields": [
      {
        "key": "hydraulicPressure",
        "label": "보조유압 압력 (bar)",
        "choices": [],
        "multi": false
      },
      {
        "key": "device",
        "label": "장착장치 설명",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "grader": {
    "grade": "A",
    "flow": "모터그레이더 → 실제 배토판 길이 → 연장 구성",
    "limit": "국내 공급 혜인 120GC 형식승인 4,287mm/제작사 4,300mm 재확인. 기존 3.6m는 적산 참고 유지. 새 전국 공통 급수 생성 없음.",
    "core": "표준 배토판 길이(m)",
    "sources": [
      [
        "혜인 120GC 국내 형식승인·제작사 비교표",
        "https://catmachine.haein.com/catmachine/product/view.php?idx=64"
      ],
      [
        "2026 경비산출표",
        "https://www.cak.or.kr/download.do?uuid=b25d1f7d-c15d-4900-9806-f5f2d26239cf.pdf"
      ]
    ],
    "fields": [
      {
        "key": "bladeLength",
        "label": "실제 배토판 길이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "extension",
        "label": "연장 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "scraper": {
    "grade": "C",
    "flow": "자주식/피견인식 → 오픈보울/엘리베이팅/기타 → 평적·산적 → 적재중량",
    "limit": "Cat 623 해외 제품은 확인되나 국내 현장 공급/임대 호칭과 모델 대조 부족. 해외 용량을 국내 급수로 쓰지 않는다. Q1.",
    "core": "보울 산적·평적 용량(㎥)",
    "sources": [
      [
        "Cat 623 공식 제원",
        "https://www.cat.com/en_US/products/new/equipment/wheel-tractor-scrapers/elevating-scrapers/125871.html"
      ]
    ],
    "fields": [
      {
        "key": "bowl",
        "label": "보울 방식",
        "choices": [
          "오픈보울",
          "엘리베이팅"
        ],
        "multi": false
      },
      {
        "key": "connection",
        "label": "피견인식 연결조건 (선택)",
        "choices": [],
        "multi": false
      },
      {
        "key": "cutWidth",
        "label": "절삭폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "water-truck": {
    "grade": "C",
    "flow": "차량탑재 → 탱크 용량 → 살수 방식 → 펌프",
    "limit": "국내 제작 사례 9,500L는 이전 검색 근거이며 이번 본문 접근 실패. 공식 승인 탱크·등록량 대조 부족. 차대 5톤에서 물 5,000L 생성 금지. Q1.",
    "core": "탱크 유효용량(L/kL)",
    "sources": [
      [
        "노아특장 제작 사례",
        "https://www.daara.co.kr/sell/s_view.php?lang=ko&no=1639983"
      ],
      [
        "국내 거래 분류의 살수차·물차",
        "https://specialists.kr/list/1/48?device=pc&page=2"
      ]
    ],
    "fields": [
      {
        "key": "totalCapacity",
        "label": "탱크 총용량 (L/kL)",
        "choices": [],
        "multi": false
      },
      {
        "key": "effectiveCapacity",
        "label": "탱크 유효용량 (L/kL)",
        "choices": [],
        "multi": false
      },
      {
        "key": "registeredPayload",
        "label": "등록 적재량 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "chassis",
        "label": "차대 호칭",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "tow-truck": {
    "grade": "C",
    "flow": "언더리프트/적재식 셀프로더/기타 → 구난:견인·인양·인출거리; 적재:등록량·데크 → 윈치",
    "limit": "라이트테크 장비 존재와 국내 판매 분류 확인. 제작사별 정량 하중표 부족. 견인/인양/윈치를 한 톤수로 합치지 않는다. Q1/Q3.",
    "core": "구난 능력 또는 적재식 운반능력",
    "sources": [
      [
        "라이트테크 직접 장비 안내",
        "https://www.lttech.kr/"
      ],
      [
        "국내 거래 분류",
        "https://specialists.kr/list/1/48?device=pc&page=2"
      ]
    ],
    "fields": [
      {
        "key": "recoveryReach",
        "label": "구난 인출거리 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "registeredPayload",
        "label": "적재식 등록 적재량 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "deckLength",
        "label": "데크 길이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "deckWidth",
        "label": "데크 폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "tow",
        "label": "견인능력 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "lift",
        "label": "인양능력 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "winch",
        "label": "윈치능력 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "truck-tractor": {
    "grade": "C",
    "flow": "도로용 헤드 → 축 구성 직접 입력 → 연결장치 → 연결총중량/제5륜 조건",
    "limit": "현대 공식 국내 라인업과 트랙터/트레일러 분리 확인. 모델별 연결조건 수치 전수 대조 부족. 피견인 적재량 복사 금지. Q1/Q3.",
    "core": "도로용 트랙터 모델 + 축 구성",
    "sources": [
      [
        "현대 국내 트랙터 라인업",
        "https://www.hyundai.com/kr/ko/c/products/truck/xcient"
      ],
      [
        "국내 트랙터 헤드 분류",
        "https://specialists.kr/list/1/48?device=pc&page=2"
      ],
      [
        "트랙터·트레일러를 분리한 직접 판매 메뉴",
        "https://grace131.cafe24.com/shop2/category/트레일러trailer/30/"
      ]
    ],
    "fields": [
      {
        "key": "axles",
        "label": "축 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "connection",
        "label": "연결규격",
        "choices": [],
        "multi": false
      },
      {
        "key": "grossCombination",
        "label": "허용 연결총중량 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "fifthWheel",
        "label": "제5륜 하중 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "power",
        "label": "출력 (kW)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "cargo-crane": {
    "grade": "B",
    "flow": "직진/굴절 → 차량·배차 호칭 5/11/15/18톤 또는 직접 → 크레인 모델 → 하중/반경",
    "limit": "충남크레인 호칭과 광림 공식 하중표 교차. KS1256G2 장착차량 5t 이상과 6,600kg/2m는 별개. 15,000kg·m를 15톤 하중으로 쓰지 않는다.",
    "core": "배차 톤 호칭 + 붐 방식",
    "sources": [
      [
        "광림 KS1256G2 공식 제원",
        "https://www.kanglim.com/product/details?ca_id=01&idx=49"
      ],
      [
        "광림 스틱·너클 구분",
        "https://www.kanglim.com/product/product?ca_id=01"
      ],
      [
        "충남크레인 5·11·15·18톤 보유 표기",
        "https://www.ptcrane1.co.kr/"
      ]
    ],
    "fields": [
      {
        "key": "craneModel",
        "label": "크레인 모델",
        "choices": [],
        "multi": false
      },
      {
        "key": "registeredPayload",
        "label": "등록 적재량 (t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "supportWidth",
        "label": "지지폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "loadChart",
        "label": "하중·반경 조건",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "tower-crane": {
    "grade": "C",
    "flow": "수평지브/러핑/셀프이렉팅 → 모델 → 지브/끝단하중 → 설치높이·지지",
    "limit": "국내 하이웍스 290HC/224HC-L/CTT561 목록 확인. 제조사별 하중표·구성 교차 미완. 모델 번호에서 지브/하중 추출 금지. 유인/무인 별도. Q1.",
    "core": "모델 + 지브 구성 + 하중",
    "sources": [
      [
        "하이웍스 국내 제원 목록",
        "https://www.highworks.co.kr/_mobile/sub05.html"
      ]
    ],
    "fields": [
      {
        "key": "bodyModel",
        "label": "본체 모델",
        "choices": [],
        "multi": false
      },
      {
        "key": "installation",
        "label": "현장 설치 상태",
        "choices": [
          "설치",
          "미설치",
          "미정"
        ],
        "multi": false
      },
      {
        "key": "jib",
        "label": "지브 구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "radius",
        "label": "하중 기준반경 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "freeHeight",
        "label": "자립높이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "installedHeight",
        "label": "현장 설치높이 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "support",
        "label": "현장 지지조건",
        "choices": [],
        "multi": false
      },
      {
        "key": "operation",
        "label": "운전 방식",
        "choices": [
          "유인",
          "무인"
        ],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "sky-truck": {
    "grade": "B",
    "flow": "직진/굴절 → 현장 높이급 직접 → 실제 높이 → 반경/하중",
    "limit": "국내 배차 호칭과 진우 JW450S 교차. 45m급/실제45.5m/차대5톤/하중400kg를 각각 분리. 반경22m/400kg와25m/100kg 조건 유지. 업체 요금 m를 보장높이로 쓰지 않음.",
    "core": "최대 작업높이(m)와 현장 m급 원문",
    "sources": [
      [
        "진우 JW450S 공식 제원",
        "https://jinwoosmc.com/product/jw450s.php"
      ],
      [
        "청구스카이 업체 차량·요금 호칭",
        "https://www.cheonggusky.com/"
      ]
    ],
    "fields": [
      {
        "key": "supportWidth",
        "label": "지지폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "loadRadius",
        "label": "하중·반경 조건",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "ladder-truck": {
    "grade": "B",
    "flow": "차량탑재 → 높이 직접 입력 → 운반카 하중 → 설치각도/이격거리",
    "limit": "진우 JWL250 25m/350kg와 현장 층수 호칭 구별. 9층을 고정25m로 환산하지 않는다. 소방용은 신규 세부 유형으로 확장하지 않음.",
    "core": "화물 운반용 작업높이(m)",
    "sources": [
      [
        "진우 JWL250 공식 제원",
        "https://jinwoosmc.com/product/jwl250.php"
      ],
      [
        "달인종합중기 직접 현장 사다리 표",
        "https://www.xn--ok0bu3g44v04a9tr88c.com/"
      ]
    ],
    "fields": [
      {
        "key": "distance",
        "label": "이격거리 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "chassis",
        "label": "차대 호칭",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "construction-lift": {
    "grade": "B",
    "flow": "인화물/화물/모름 → 단/복 케이지 → 케이지당 하중 → 치수·속도·설치높이",
    "limit": "국내 GL 공식 GTL-1230SS 1.2t/38m/min 재확인. 이전1.5/2t는 해당 GL 모델 연결 후보로 한정. 복 케이지 합계를 한 케이지 정격으로 쓰지 않음.",
    "core": "케이지당 정격하중(kg/t)",
    "sources": [
      [
        "GL GTL-1230SS",
        "https://kr.gl-enc.com/product/?bmode=view&idx=149910065"
      ],
      [
        "GL GTL-1535/70SS",
        "https://kr.gl-enc.com/product/?bmode=view&idx=149910062"
      ],
      [
        "GL GTL-2040/70SS",
        "https://kr.gl-enc.com/product/?bmode=view&idx=149910061"
      ],
      [
        "Alimak Scando 650 구성별 제품표",
        "https://alimak.com/temporary-products/alimak-scando-650/"
      ]
    ],
    "fields": [
      {
        "key": "purpose",
        "label": "용도",
        "choices": [
          "인화물",
          "화물"
        ],
        "multi": false
      },
      {
        "key": "cageLoad",
        "label": "케이지당 정격하중 (kg/t)",
        "choices": [],
        "multi": false
      },
      {
        "key": "power",
        "label": "전원",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "asphalt-paver": {
    "grade": "B",
    "flow": "바퀴/크롤러 → 스크리드 → 기본/유압확장/연장 폭 → 두께",
    "limit": "YK 국내 공급 분류와 VÖGELE 공식 제품 대조. 모델의 최대 가능폭을 실제 장착폭으로 복사하지 않는다. 3/6/9m를 공통 고정급으로 만들지 않음.",
    "core": "장착 스크리드 포설폭 범위(m)",
    "sources": [
      [
        "VÖGELE SUPER 1800-5 X 공식 자료",
        "https://www.wirtgen-group.com/binary/full/o337515v89_SUPER_18005_X_Brochure_ENGB.pdf"
      ],
      [
        "YK 국내 공급 장비 분류",
        "https://www.sunnyyk.co.kr/product_handler"
      ]
    ],
    "fields": [
      {
        "key": "screed",
        "label": "장착 스크리드",
        "choices": [],
        "multi": false
      },
      {
        "key": "baseWidth",
        "label": "기본 폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "hydraulicWidth",
        "label": "유압확장 폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "extendedWidth",
        "label": "연장 폭 (m)",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  },
  "road-mill": {
    "grade": "B",
    "flow": "자주식/부착식 → 드럼 폭 → 최대 깊이 → 비트간격",
    "limit": "YK W200fi 국내 공급 페이지와 WIRTGEN 공식 자료 교차. 동일 모델 교체 드럼이 있으므로 모델만으로 2m 저장 금지. 노면파쇄기는 검색 보조로 사용.",
    "core": "장착 드럼 절삭폭(m/mm)",
    "sources": [
      [
        "WIRTGEN W200Fi 공식 자료",
        "https://www.wirtgen-group.com/binary/full/o229549v77_W200Fi_Brochure_Datasheet_enGB.pdf"
      ],
      [
        "YK 국내 노면파쇄기 분류",
        "https://www.sunnyyk.co.kr/product_handler"
      ],
      [
        "YK W200fi 국내 공급 상세",
        "https://www.sunnyyk.co.kr/W200fi"
      ]
    ],
    "fields": [
      {
        "key": "drum",
        "label": "장착 드럼 모델·구성",
        "choices": [],
        "multi": false
      },
      {
        "key": "referenceModel",
        "label": "제조사·모델·판본 (참고 원문)",
        "choices": [],
        "multi": false
      },
      {
        "key": "sourceUrl",
        "label": "제원 근거 URL·문서 원문",
        "choices": [],
        "multi": false
      },
      {
        "key": "checkedDate",
        "label": "근거 확인일",
        "choices": [],
        "multi": false
      },
      {
        "key": "vehicleVerification",
        "label": "실차 확인 여부",
        "choices": [
          "미확인",
          "명판 확인",
          "실측 확인"
        ],
        "multi": false
      }
    ]
  }
};
