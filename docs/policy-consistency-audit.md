# NODE 운영정책 230건 정합성 검토

작성일: 2026-10-28 (KST). 저장소: `wookher-afk/node-test`, 브랜치: `develop/node-0.1-foundation`.
검토 기준: `756d4e420d8533fdd662401a9f6d70dcf4b0221f`. 작업 시작 시 최신 HEAD와 일치하여 기준 이후 추가 변경은 없었다.
상태: **검토·권고 및 설계 준비 초안**. 기존 정책의 승인 상태와 별개이며 신규 정책·0.1 범위·구현·배포를 확정하지 않는다.

## 목적·범위·판정

230건의 번호·본문·참조와 후속 결정 이력을 대조해 현재 설계 기준을 정리한다. 정책·결정 이력 원문은 수정하지 않는다. 번호 검증은 자동 확인, 적용 관계·중복·모순 분류는 문서 대조에 의한 검토다. 전수 검토는 모든 가능한 운영 사례의 수학적 무모순 증명을 뜻하지 않는다.

**현재 미해결 충돌은 2개 묶음**이다: C01(산정 표본의 실질 적용 상충 1건), C02(0건 표시의 표현 규정 상충 1건). 같은 원인의 지표별 조항은 중복 집계하지 않았다. 나머지 C03~C16은 기존 정책만으로 채울 수 없는 운영 결정이며 충돌 건수에 더하지 않았다. 기존 5건·3건 충돌, 알림 채널·ID 미결을 현재 충돌로 다시 세지 않는다.

공통 데이터·권한·상태 설계는 착수 가능하다. 다만 전체 0.1 범위 확정·신뢰지표 공개·문서 외부 검증·실제 개인정보 수집 및 운영 개시는 사용자 결정과 후속 검증 전 완료 상태가 아니다. [기능 후보](node-0.1-feature-inventory.md), [이용 흐름](node-0.1-user-flows.md), [착수 조건](node-0.1-design-readiness.md)을 함께 사용한다.

## 검토 근거와 구현 상태의 경계

| 근거 문서 | 대조 내용 |
| --- | --- |
| [docs/NODE-CONSTITUTION.md](NODE-CONSTITUTION.md) | 상위 원칙·동의·일정·설계 추적 |
| [docs/operating-policies.md](operating-policies.md) | P 50건·SM 77건 원문 |
| [docs/b-policy-decisions.md](b-policy-decisions.md) | B1~B6 6건·B7-1~21 21건·B8-1~76 76건 |
| [docs/policy-decision-log.md](policy-decision-log.md) | 과거 결정·후속 해결·현재 미결 구분 |
| [docs/requirements-node-0.1.md](requirements-node-0.1.md) | 계정 DB-001~014, JOB, EQUIP, LOG, WRK, TRUST-DATA 및 아이디어 |
| [docs/work-records-and-trust.md](work-records-and-trust.md) | 기록·선호·적합도 분리, 개인정보·학습·정정 |
| [docs/matching-implementation.md](matching-implementation.md) | 통합 매칭 기반 및 API/UI 후속 표시 |
| [docs/node-data-foundation-audit.md](node-data-foundation-audit.md) | 과거 감사, 현재 구현 판정으로 재사용하지 않음 |
| [docs/pr-2-review-fixes.md](pr-2-review-fixes.md) | 과거 업체 귀속·정정 계보·운영 전 접근 조건 |
| [docs/stabilization-1.md](stabilization-1.md) | 기존 회원 개발/테스트 역할·미완성 다중 업체 격리 |
| [database/README.md](../database/README.md) | 계정·현장·매칭·장비 기반·운영 미적용 경계 |
| [db/README.md](../db/README.md) | 과거 UUID 실험 미사용 안내 |
| [README.md](../README.md) | 문서·실행 진입점 |

저장소 전체 파일 목록에서 별도 장비·운송·개인정보 전용 정책 문서는 없었다. 해당 범위는 요구사항의 EQUIP-001~009·LOG-001~006, 신뢰정보 문서, B8-64·72~74·SM-77로 대조했다. 현재 DB의 상세 구조와 운영 서비스는 실행·수정·접속하지 않았다. 회원 기본 가입/로그인/경력/업체 등록과 통합 DB 기반이 **문서상 존재**하나, 휴대전화·소셜 본인확인 전체, 세부 직원 권한, 매칭 API/UI, 자동추천·통계·알림·문서 제출·운송의 서비스 완성을 뜻하지 않는다. 문서의 과거 테스트 결과를 이번에 재실행한 결과로 표시하지 않는다.

## 번호·참조 검증 결과

| 항목 | 결과 |
| --- | --- |
| P-01~P-50 | 50건, 빠진 번호·중복 없음 |
| B1~B6 / B7-1~21 / B8-1~76 | 6+21+76=103건, 빠진 번호·중복 없음 |
| SM-01~SM-77 | 77건, 빠진 번호·중복 없음 |
| 전체 | 230개 고유 정책 번호. 헌법·요구사항·검토 식별자는 정책 수에서 제외 |
| 명시 정책 참조 | 정책 본문의 정확한 ID 대조에서 미등록 B14 참조 1종(B7-17) 발견: B01 |
| 분류·범위 표현 | B7·B8 같은 분류명은 개별 정책 누락으로 세지 않음. 축약 범위는 원문 확인 |
| 문서 경로 | 검토한 13개 Markdown의 상대 파일 링크 대상 누락 0건(저장소 목록 대조) |
| 이번 신규 4문서 | 정책 번호·내부 파일 참조를 별도 검증. 링크 유효성이 의미적 정합성을 보장하지는 않음 |

## 네 유형 분류 및 우선순위

아래 A01 등은 **감사 항목 식별자**이고 신규 정책 번호가 아니다. ‘설계 전’은 해당 기능의 불가역적 상세 설계 전에 처리하라는 권고다. 운영 결정의 승인은 사용자가, 법률·개인정보 검토의 결과 승인은 별도 권한자가 맡는다. D 항목은 승인된 정책 범위 내 기술 결정이며 임의 정책 확정이 아니다.

### A. 후속 정책으로 해결 완료

| 검토 | 관련 정책 | 과거 문제 | 해결 근거·현재 기준 | 영향 | 권고 후속 | 우선순위 |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | P-03·B8-30 | 감원 시 최근 확정부터 자동 취소하는 과거 규정 | 정원 변경과 별도 계약 취소 분리; 현행 P-03·B8-30 및 정정 이력 | 확정 계약 보호 | 현행 규칙을 설계에 사용 | 설계 전 |
| A02 | P-05·B4 | 차감권을 대체 작업자에게 직접 이전 | 업체 수수료 면제로 정리, 긴급 상위 노출 유지 | 취소 보상 | 수수료 금액만 C06으로 분리 | 설계 전 |
| A03 | P-07·12·B5·B7-1 | 실제 정시와 지연액 인정 통계 혼합 | 실제 정시/인정 반영 지표 분리, 인정 30일 철회 | 지급 신뢰 | 원본 날짜와 인정 이벤트 분리 | 설계 전 |
| A04 | P-15·16·B7-17 | 완료율을 확정 후 관계 업체만 공개 | 선정 전·자동 추천 후 확정 전 공개 명시 | 지원 전 판단 | 상세 근무·분쟁 비공개 유지 | 설계 전 |
| A05 | P-20·B8-3·SM-67 | 신규 순위 금지와 이용자 선택 정렬 | 직접 선택한 신뢰 정렬의 무기록 후순위 허용 | 기회 보호 | 기본 검색/자동매칭과 분리 | 설계 전 |
| A06 | P-08·23·B1·B8-57~59·61·62·66 | 신고 즉시 조치와 비중재·불이익 금지 | 당사자 간 임시 보호와 플랫폼 위반 판단으로 한정 | 신고 처리 | 제3자 활동·법적 귀책 판단과 구분 | 설계 전 |
| A07 | B8-59·67·SM-12 | 신고 중지 중 기한·자발적 정지 중첩 | 신고 때만 남은 응답시간 정지; 공고·현장 비연장 | 기한 계산 | 기존 공고 유효·정원 조건 유지 | 설계 전 |
| A08 | B8-68·69 | 반복 신고·이의신청 중 자동 차단 | 같은 사실 병합·유효 사유 유지, 이의만으로 재차단 안 함 | 관계별 보호 | 새 증거 위험 확인 요건 유지 | 설계 전 |
| A09 | B8-61·63·70·71 | 소명/이의 통지 기산 불명확 | 내부 공식 등록부터 기한 진행; 열람 별도 | 운영 기한 | 일정 알림 성공과 별도 흐름 | 설계 전 |
| A10 | B8-72~76 | 최초 탈퇴 후 조사 지속 결정 | 후속 사용자 결정으로 탈퇴 시 내부 사건 종결; 재가입 재개 안 함 | 계정·신고 | 재가입 제재·이의 세부는 C08 | 설계 전 |
| A11 | SM-01·04·11·14 | 자동 모드와 기본 요일·미설정 | 기본 요일 우선, 1개 이상 설정 후 활성화 | 일정 후보 | 활성화 후 전부 해제는 C10 | 설계 전 |
| A12 | SM-03·04·13·18 | 개별 제외와 반복 휴무 예외 | 개별 날짜 제외 우선 | 날짜 활성화 | 휴무 예외와 충돌 검사를 결합 | 설계 전 |
| A13 | SM-01·09·15 | 모드 전환 중 자동 재개 예약 | 선택 모드 전환 시 예약 취소·복원 안 함 | 수신 정지 | 정지 상태 연동 자체는 C10 | 설계 전 |
| A14 | SM-06·21·24·45·68 | 수락 시 휴무 예외와 계약 확정 | 수락 제안에만 예외, 날짜 유지, 미응답만 종료 | 수락·승인 | 계약 자동 확정으로 해석 금지 | 설계 전 |
| A15 | SM-16·70 | 처리·표시 시간대 미정 일부 | 일정·가능일·응답·해제는 KST, 최근 통계 KST 표시 | 시간 처리 | 다른 법정 기한으로 확대하지 않음 | 설계 전 |
| A16 | SM-23·28·29·34 | 통합 길이·단위 상충 | 업체·제안별 최초 변경부터 30분; 잔여 30분 이하 예외 | 일정 알림 | 같은 업체 다른 제안은 별개 | 설계 전 |
| A17 | SM-19·20·22·25·26·35 | 날짜 단위 공개와 날짜 비공개 | 단일/복수 날짜 모두 제안 전체 상태만 안내 | 개인정보 | 상세 날짜·개인 사유 비공개 | 설계 전 |
| A18 | SM-27·37~44 | 제한 해제 후 필요한 알림·기록 없음 | 모든 제한 해제·유효 미응답·상태 차이 또는 최초 안내 때 즉시 | 알림 재개 | 중지 기간 전체 재전송 안 함 | 설계 전 |
| A19 | SM-30~33·36·40~46·60 | 종료·발송 경합과 대기 알림 | 발송 확정 순서·미응답 종료 폐기·완료 비소급·불확실 이력 보존 | 알림 생애주기 | D03으로 기술화 | 설계 전 |
| A20 | SM-47~59·61~64 | 마지막 안내·채널·ID·버전 미결 | 성공 확인 갱신, 채널별 재시도/중복, 동일 내용만 기존 ID | 전달 신뢰 | 실제 기기 도달·열람 보장 아님 | 설계 전 |
| A21 | P-07~09·22·23·B5·SM-65·66·71~73 | 미응답·미확정 취소·정정 | 자동 귀책·정산 완료 없음, 증빙 분리·통계 재계산 | 기록 신뢰 | 수령 확인 알림 세부는 C13 | 설계 전 |
| A22 | P-39~50·SM-74~77 | 상태 혼합·연장 기산점·철회 후 범위 | 열람/권한 분리·기존 만료일부터 연장·최소 진위·목적 보존 | 문서·개인정보 | 검증 주체와 기간표는 C03·C09 | 설계 전 |

### B. 문서 정합성 문제

| 검토 | 관련 정책/문서 | 문제 | 영향·해결 이유 | 권고 처리 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| B01 | B7-17 | B14를 후속 검토 참조하나 등록 번호에 B14 없음 | 관계 종료 후 공개 기준 추적 불가 | B14를 현재 확정 정책으로 보지 말고 미결 C12로 연결; 원문 수정은 별도 승인 작업 | 설계 전 |
| B02 | SM-23·28·34 및 요구사항·신뢰정보 | 미확정/73·93건/B8-47 미확정 등 과거 상태가 현행처럼 보임 | 이미 해결된 사안의 재심의·누락 오해 | 이 감사의 현재 상태표를 진입점으로 사용; 과거 기록 삭제 안 함 | 설계 전 |
| B03 | SM-61~77 및 docs/work-records-and-trust.md | SM은 일정 분류로 시작했으나 지급·신뢰·문서까지 확장, 신뢰 문서 참조는 과거 상태 | 담당 영역·현행 근거 찾기 어려움 | 정책 번호 유지, 기능별 색인만 새로 제공 | 설계 중 |
| B04 | P-20·21·B7-5·16·20·SM-67 | 산정 불가/기록 없음 용어와 표본 부족 문구 혼재 | 상태와 표시 문구를 하나로 오인 | C01·C02 결정 후 상태 사전 작성; 현재는 원문 병기 | 지표 설계 전 |
| B05 | P-13·22·32·B8-6·SM-46 및 신뢰정보·DB 문서 | 확정 정책과 기반 구현·평가 테이블 예시가 같은 문서에 있음 | 별점·자동 점수·정정 운영 흐름 구현 완료 오해 | 기반 구조/정책 확정/미구현을 상태 열로 분리; 기존 표준과 테스트를 현재 재실행한 것으로 표시 안 함 | 설계 전 |
| B06 | B8-29·30·SM-30~33 | 문서마다 공고 마감·제안 취소·선정 철회·수락·계약 확정 용어 반복 | 취소 경로와 보상 적용 시점 혼동 | 상태 사전과 계약 확정 경계를 설계 초안에 명시 | 설계 전 |
| B07 | P-37·39·48·B8-21·SM-28 | 신뢰 보고서·제출 문서·신고 공식 통지·일정 알림의 유사 단어 | 30분 규칙을 모든 알림에 잘못 적용 | 유형별 알림 표 D03·기능 목록으로 분리 | 설계 중 |
| B08 | P-24~30·B7-8·13 | B 문서의 묶음 2~3 설명이 P-24~30을 근무일 단위로 일괄 지칭 | 계약 건수 집계와 일별 근무 혼동 | P-24는 계약 단위, P-26~30은 날짜별 기록으로 색인에서 구분; 원문 개정은 이번 범위 밖 | 설계 전 |

### C. 실제 정책 결정 필요

| 검토 | 관련 정책/요구사항 | 문제 | 영향·해결 이유 | 권고안(미확정) | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| C01 | SM-67·P-21·B7-5·16·20 | 실질 상충: 표본 부족이면 산정 불가 vs 산정 가능 1건부터 비율 표시 | 신뢰지표 공개·순위·필터가 달라짐 | 권고: 0건 산정 불가, 1건 이상 표시, 1~4건 기록 적음. 지표별 단위 유지. 사용자 승인 필요 | 지표 설계 전 |
| C02 | P-20·B8-1·2·B7-5·16·20·SM-67 | 표현 규정 상충: 같은 0건 지표에 산정 불가와 산정 기록 없음 지정 | 계정 상태/지표 상태/0% 구분이 흐려짐 | 아래 표시 사전 권고안을 승인받고 병합 문구 결정; 현재 자동 통일 금지 | 지표 설계 전 |
| C03 | P-36·38~44·50·SM-74~76 | 최소 진위정보는 확정됐으나 철회/만료 후 조회 주체·권한 기간 미정 | 철회 우회·확인번호 개인정보 노출 | 본인+기존 정당 권한 수신 담당자 최소 조회, 상세 금지, 공개 번호 조회 금지 권고. 퇴사·권한 상실 처리도 승인 필요 | 문서 기능 설계 전 |
| C04 | P-09~12·17·24·B7-1~20·SM-70 | 분쟁률 분모·동일 계약 여러 분쟁, 업체 이행률 기간 귀속 등 지표별 정의 일부 부족 | 사용자 비교 가능성과 잘못된 집계 | 완료/취소/지급/분쟁 각각 산정 상태·단위·귀속일 명세 승인; 이미 정한 B7 단위는 보존 | 지표 설계 전 |
| C05 | P-19·B8-3·4·6·18 | 내림차순/하한 필터가 낮을수록 좋은 취소율·분쟁률에도 동일한지, 유사 적합도 범위 미정 | 낮은 신뢰가 상위 추천되거나 신규 기회 변화 | 지표별 정렬 방향·필터 의미, 적합도/신뢰 보조 경계 승인 후 파라미터 기술화 | 검색·추천 설계 전 |
| C06 | P-03·05·B3·4 | 요금 부담자·표준 수수료 금액·권종 일반 유효기간·여러 혜택 사용 순서 미정 | 실청구·보상 비용·환급 처리 불가 | B3 보상권 1년·B4 비소멸 혜택은 유지; 요금표·혜택 원장 규칙을 사업 결정으로 승인 | 유료 운영 전 |
| C07 | P-08·14·B1·B8-60~66·ADM-001 | 플랫폼 위반 근거 검증·제재 수준/기간·담당 권한의 실운영 기준 미정 | 신고 판단의 일관성·권리 구제 | 조사 범위·소명/이의·제재표 승인; 법적 책임 최종 판단 금지 유지 | 신고 운영 전 |
| C08 | B8-63·69·72~76·SM-77 | 탈퇴 종결 사건 이의신청·진행 이의의 종결, 재가입 동일인 제재/직접 제외 승계, 계약 당사자 탈퇴 후 확인 경로 미정 | 재가입 우회·계약/지급 이행 확인 단절 | 내부 신고 종결과 외부 권리·기록 보존은 구분; 잔존 계약 처리·본인 연결·철회 신고 효력 별도 승인 | 탈퇴·신고 운영 전 |
| C09 | 헌법 제7·10조·B8-64·SM-66·77 | 기록 유형별 목적·법적 근거·보존기간, 예외 보존 종료·담당자 범위 미정 | 민감 증빙 수집·삭제·백업 운영 불가 | 기록 유형별 법률/개인정보 검토표 승인; B8-64 사건 종료 후 3년을 전체 기록으로 확장 금지 | 실데이터 수집 전 |
| C10 | SM-01·07~15·B8-14·15 | 활성화 후 근무요일 전부 해제·정지 중 모드 변경·일반 수신중지와 자동모드 정지의 관계 미정 | 원하지 않는 신규 제안 수신 | 예약 취소는 SM-15로 해결됨; 정지 상태 승계와 수신 중지 통합/분리를 별도 승인 | 일정 상세 설계 전 |
| C11 | JOB-008·DB-007·B8-31·44·SM-18·25 | 다일 제안 부분 수락/계약 변경·지난 선택일 복원·개인 일정 변경 알림 범위 미정 | 정원·일정·개인정보 노출 경계 | 부분 일정 허용 여부와 수락 날짜를 계약 버전에 고정하는 안 검토; 하루/반일 등 제품 범위 승인 | 다일·장비 일정 설계 전 |
| C12 | P-15·16·30·33·36·B7-17·19 | 관계 종료 후 신뢰 통계 열람 기간·선정 전 정당한 조회자·현장 세부 업무 권한 범위 미정 | 상세 거래/통계 권한 혼동·타 업체 접근 | 통계 조회/거래 당사자/제출 수신자/관리자 권한표 승인; 기술 집행은 D02 | 권한 상세 설계 전 |
| C13 | P-29·31·32·B5·SM-65 | 수령 확인 알림·정정 요청 미응답·반복 근무 재알림의 운영 빈도/요청 경로 미정 | 무기한 확인 대기·알림 피로·운영 문의 | 자동 완료는 금지 상태 유지; 빈도·지원 경로만 별도 결정. 근무 24/72시간은 재확정 불필요 | 근무·지급 운영 전 |
| C14 | B8-7·12·17·18·EQUIP-003·LOG-005 | 필수 자격 검증 수준·업체 제안한도 안전 상한·장비/운송 실제 확인 책임 상세 미정 | 자격 미달 매칭·과다 제안·장비 인수 위험 | 분야별 필수 조건/검증 주체와 발송량 운영 경계 승인; 추천 근거를 사용자에 제공 | 대상 직종·장비 설계 전 |
| C15 | DOC-001·DOC-002·WRK-001·JOB-001 | 일반 민감 서류·전자서명·교육 알림·유류별 단가 상세는 원래 아이디어 상태 | 미확정 기능을 확정 범위로 포함할 위험 | 별도 요구사항으로 논의할 후보, 본 근무이력 제출과 혼동 금지 | 해당 후보 채택 전 |
| C16 | 헌법 제16·17조·전체 정책·요구사항 | 첫 실제 이용 직종·지역·장비/운송 포함 범위·무료/유료 시작·핵심/후속 선택 미확정 | 0.1 규모·일정·사업 가정 확정 불가 | 기능 목록의 후보 분류를 사용자와 우선순위 결정. 확정 정책 자체는 폐기하지 않음 | 0.1 범위 확정 전 |

### D. 정책 변경 없이 기술 설계에서 처리 가능

| 검토 | 관련 정책/문서 | 설계 과제 | 영향·해결 이유 | 권고 처리 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| D01 | P-22~26·SM-73·요구사항 DB-009 | 계약·조건·당사자·날짜·사건 ID와 버전 연결 구조 | 중복·소속 변경 시 과거 귀속 오류 | 기존 불변 원장·조건/당사자 스냅샷 재사용, 변경 계보 명세 | 설계 시작 |
| D02 | P-30·33·36·42·43·DB-005 | 승인된 역할/현장/문서별 접근을 서버에서 집행 | 인자 ID 신뢰·교차 업체 조회 위험 | 세션 행위자·기능별 권한 검사·접근 로그·비소유자 역할 검증 계획 | 설계 시작 |
| D03 | B8-20·21·70·71·SM-23~64 | 알림 유형별 상태·기한·수신설정·ID/채널/버전·발송 경합 | 공식 통지와 일정 알림 혼동·역순 결과 | 발송 의도/성공확인/채널 이력 분리, 원자적 순서와 재검증 설계; 횟수·간격은 수치 미정 | 알림 설계 |
| D04 | SM-11~18·B8-41·67·SM-70 | KST 날짜·남은 응답시간·12개월 경계 계산 | 기기 시간대·월말·기간 끝 오차 | 정책상 정한 단위로 계산 예시·경계 테스트 명세 작성, 다른 법정 기한으로 확대 금지 | 시간 설계 |
| D05 | P-07·B5·6·B7-1~4 | 분할 지급·일치 금액·실제 날짜·인정/철회 이벤트 원장 | 부분 수령 중복·가상 정산 완료 | 신고/확인 독립 키·금액 대사·30일 인정철회 기록; 송금 기능 추가 안 함 | 지급 설계 |
| D06 | P-17·22~26·B7·SM-70·73 | 정의 승인된 지표의 기간별 재계산·스냅샷·중복방지 | 정정 반영 누락·과거 수치 덮어쓰기 | C01~05 승인 후 지표별 입력/제외/분모/귀속일 회귀 예시 | 지표 설계 |
| D07 | P-37~50·SM-74~76 | 고정 발급 문서·정정 표시·기간·원본·조회 이력 구조 | 원본 수정이 발급본문 자동 변경 | 원본/발급/제출/열람·권한 분리; C03 승인 전 외부 진위 접근 차단 설계 | 문서 설계 |
| D08 | P-26~35·SM-73 | 일별 양측 확인·일괄 처리·정정·재심 상태 | 한 날짜 이견이 전체 경력에 전파 | 건별 확인자·시각/부분 실패 명세, 시스템 오류와 상대 승인 분리 | 근무 설계 |
| D09 | B8-47~76·SM-12·27·39 | 여러 제한 사유·사건 병합·정지/종료 구분 | 일부 해제만으로 잘못 재개 | 관계별 활성 제한 집합·잔여시간 보존·종료 제안 불복구 명세 | 매칭·신고 설계 |
| D10 | database/README.md·pr-2-review-fixes.md | 기존 통합 기반과 정책의 차이·보호 제약·이전 계획 | 정책 등록을 DB 적용 완료로 오해 | 요구사항별 기반/API/UI/검증/운영 별도 추적; 복제본/귀속 대응표 검토, 이번 실행 안 함 | 구현 착수 전 |
| D11 | EQUIP-004·LOG-004·DB-009 | 작업자·장비·차량 독립 예약과 동일 승인 버전 | 동시 확정·자원 중복 | 현재 하루 단위 기반 보존, 범위 승인 후 자원별 예약·원자성 시나리오 | 장비·운송 설계 |
| D12 | 헌법 제19·20조·P-23·SM-77 | 정책 참조·요구사항 연결·검증 이력·삭제 전파 절차 | 원문과 파생 상태의 추적 단절 | 본 색인·정책별 확인표를 후속 작업 기준으로, 로그/백업 삭제 집행은 C09 승인 후 설계 | 설계 전반 |

## 우선 검토 1: 표본 기준 — 권고안, 미확정

사용자 제시안은 P-21·B7-5·16·20의 1건부터 실제 표시와 일치한다. 그러나 SM-67 제1항의 ‘부족’이 1~4건을 포함하는지 확정되지 않아 **C01을 자동 해결할 수 없다**. 5건을 비율 공개의 최소 기준으로 새로 설정하면 P-21에 반한다.

| 지표 | 확정된 집계·분모 성격 | 표본 수 단위 | 현재 확정 최소 표시 | 승인 필요한 점 |
| --- | --- | --- | --- | --- |
| 작업자·업체 귀책 취소율 | P-10·11: 귀책 취소 계약 / 전체 확정 매칭 계약 | 확정 매칭 계약 건수(P-24) | P-21: 1건부터 표시, 5건 미만 기록 적음 | 0건 문구 C02; 귀책 미정은 분자 제외(SM-71), 분모 임의 제외 금지 |
| 작업자 계약 완료율 | B7-8~14: 계약 기준, 비귀책·업체귀책·미확정·확인대기 등의 제외 구분 | 산정 가능한 계약 건수 | B7-16: 1건부터 표시, 5건 미만 기록 적음 | P-21의 확정 매칭 수와 산정 계약 수가 다를 때 두 수의 표시·표본 경고 관계 |
| 업체 계약 이행률 | B7-18: 정상 완료 분자/분모, 업체귀책 중도 종료는 분모만 | 산정 가능한 계약 건수 | B7-20: 1건부터 표시 | 기간 귀속 기준일 등 C04 |
| 실제·인정 반영 정시 지급률 | B7-1·2: 확인된 대상 금액 가중; 기일 전/수령 확인 대기 제외 | 비율은 금액, 소표본 안내는 양측 확인된 지급 회차(B7-5) | 회차 1건부터 표시, 5건 미만 기록 적음 | ‘금액’과 ‘회차 수’를 섞지 않음. 1계약 6회 지급도 계약 6건 아님 |
| 분쟁 발생률 | P-09·12·16: 발생·미해결 관리, 귀책과 구분 | 정확한 사건/계약 분자·분모는 미확정 | P-21의 일반 원칙만 있음 | C04에서 정의 승인 전 숫자 산식 창작 금지 |

권고: 지표별 산정 가능 기록 0건은 숫자 비율을 만들지 않고, 1건 이상이면 실제 값을 표시하며 1~4건에 ‘기록 적음’을 병기한다. 계정의 전체 매칭 수와 해당 지표의 산정 표본 수를 함께 설명한다. 필요한 확인·날짜·금액이 없어 계산 불가능한 상태와 계산 가능하지만 표본이 적은 상태를 분리한다. **이 문서는 권고안의 승인이 아니다.**

## 우선 검토 2: 표시 문구 — 상태 분리는 가능, 문구 일괄 교체는 승인 필요

| 문구 | 현재 근거·사용 조건 | 권고 표현 관계 | 확정 여부 |
| --- | --- | --- | --- |
| 거래 기록 없음 | P-20: 매칭 이력 없는 신규 회원 | 계정 이력 안내로 사용 | 기존 확정 |
| 산정 기록 없음 | B8-1·2·B7-5·16·20: 해당 지표·기간 산정 0건 | 숫자가 아닌 지표 설명. 전체 누적이 있어도 최근 0건 가능 | 기존 확정 문구 |
| 산정 불가 | P-20 및 SM-67: 지표 계산 불가 | 지표 상위 상태로 두고 ‘산정 기록 없음’을 사유로 병기하는 안 | 병기/대체 방식은 C02 승인 필요 |
| 기록 적음 | P-21·B7 표본 정책: 5건 미만 | 계산된 비율 옆 경고, 숫자 숨김 아님 | 1~4건과 0건의 경계는 C01·C02 승인 필요 |

원문을 바꾸지 않는 준비 작업은 ‘계정 이력 상태 / 지표 산정 가능 여부 / 표본 수 / 기간 / 표시 문구’를 분리한 상태 사전 초안까지다. 사용자 제시안처럼 0건을 ‘산정 불가’로 통일하는 방안과 ‘산정 불가(산정 기록 없음)’ 병기 방안을 비교해 승인받을 것을 권고한다. C02는 같은 0건 조건의 **표현 규정 상충 1건**으로만 집계하고 모든 지표마다 반복 집계하지 않는다.

## 우선 검토 3: 철회·만료 문서 진위 확인 — 권고안, 권한은 미확정

P-39·40·42·44와 SM-74~76은 본인 이력, 수신 담당자의 권한 제한, 상세 열람 중단, 최소 메타정보 진위 확인, 이력 보존을 지지한다. **누가 철회·만료 후에도 최소 정보를 볼 수 있는지는 확정되지 않았다.** 확인번호는 권한 그 자체라는 근거가 없다.

| 주체·상황 | 기존 확정 범위 | 권고안·추가 결정 |
| --- | --- | --- |
| 작업자 본인 | P-36·44: 본인 이력·제출/열람 이력 확인 | 본인 인증 후 발급·제출 상태 확인 권고. 탈퇴 후 경로는 C08 |
| 기존 정당한 수신 업체의 현행 담당자 | P-42: 현재 채용/인력관리 권한, 만료/철회 시 일반 열람 종료 | 이전 제출 관계+현재 담당 권한 검증 후 최소 진위만 허용 권고; 허용 기간 승인 필요 |
| 퇴사·권한 상실 담당자 | P-42·SM-74: 접근 종료 | 과거 수신 이력만으로 최소 조회까지 계속 허용하지 않는 안 권고; C03에서 명확화 |
| 확인번호만 가진 불특정 사람 | 공개 열람 권한 확정 근거 없음 | 번호만으로 조회하지 못하게 제한 권고. 번호 존재 추측·개인정보 유출 방지 |
| 모든 진위 요청 | SM-76: 요청·처리 이력 기록, 최소 발급·유효·정정 정보 | 상세 근무·비공개 개인정보 금지, 로그 보존기간은 C09에서 결정 |

철회·만료 후 진위정보 범위는 SM-76으로 해결됐으나 조회자 권한은 C03으로 남는다. 단일 ‘문서 열람 허용’ 권한을 재사용하면 상세 문서 접근을 다시 열 수 있어 분리 설계가 필요하다. 실제 근무의 법적 보증으로 표시하지 않는다.

## 중복은 삭제보다 적용 관계로 관리

| 묶음 | 성격 | 현재 처리 |
| --- | --- | --- |
| P-07·B5·SM-65 | 지급 신고/수령 확인·미응답 원칙 재확인 | 동일 사건을 3번 저장하는 뜻 아님 |
| P-08·23·B1·SM-66·71·72 | 거래 귀책과 플랫폼 관리 경계 | 운영 위반과 법적 책임 분리 |
| P-24·B7-8·SM-70 | 계약 단위/기간 구체화 | 일수·금액·회차를 계약 수로 통합 금지 |
| P-22·23·SM-73 | 정정/재계산 반복 | 하나의 정정 계보에 영향 지표 연결 |
| SM-06·21·24·68 | 제안 한정 휴무 예외 반복 | 후속 명시 해석으로 해결 A14 |
| SM-07~09·B8-14·15 | 수신 중지 일부 중첩 | 일반 중지/자동모드 정지 연동은 C10 |
| SM-30~33·36·40~46·60 | 종료 알림 폐기 구체화 | 미응답 단계 종료·발송 순서·기록 보존 구분 |
| P-39~50·SM-74~76 | 문서 상태/기간/최소 검증 구체화 | 일반 상세 접근과 최소 검증을 분리 |

정책의 반복 진술을 번호 중복 또는 정책 폐기 근거로 보지 않는다. 권고안을 승인된 정책처럼 ‘현재 기준’으로 표시하지 않는다. 초기 별점(P-13), 단일 종합 신뢰점수 금지(B7-21), GPS 제외(P-27), NODE의 대금 보관/송금 금지(P-07)를 기능 목록에서 역으로 신규 기능화하지 않는다.

## 230건별 전수 대조표

각 행은 해당 원문의 고정 기준 커밋 위치와 대조 항목을 연결한다. A=후속 기준 적용, B=표현/참조 보완 필요, C=사용자 결정, D=기술 설계. 연결된 C가 있다는 이유로 정책 전체를 미확정으로 바꾸지 않는다. ‘정합 검토’는 기능 구현·테스트 통과 표시가 아니다.

| 정책·원문 위치 | 제목 | 행별 검토 결과 | 대조 항목 |
| --- | --- | --- | --- |
| [P-01](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L8) | 급여조건 입력 | 본문·후속 결정·기능 의존 대조 완료 | A01·A02·C06 |
| [P-02](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L15) | 구인공고 지원 마감 | 본문·후속 결정·기능 의존 대조 완료 | A01·A02·C06 |
| [P-03](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L23) | 모집 인원 축소 및 업체 귀책 보상 | 본문·후속 결정·기능 의존 대조 완료 | A01·A02·C06 |
| [P-04](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L36) | 우천취소 | 본문·후속 결정·기능 의존 대조 완료 | A01·A02·C06 |
| [P-05](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L47) | 작업자 귀책 취소 및 업체 매칭 수수료 면제 | 본문·후속 결정·기능 의존 대조 완료 | A01·A02·C06 |
| [P-06](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L58) | 작업 완료 양방향 확인 | 본문·후속 결정·기능 의존 대조 완료 | A06·A21·D05·D08 |
| [P-07](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L65) | 지급 예정일과 양방향 정산 확인 연동 | 본문·후속 결정·기능 의존 대조 완료 | A06·A21·D05·D08 |
| [P-08](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L81) | 분쟁 비중재 원칙 | 본문·후속 결정·기능 의존 대조 완료 | A06·A21·D05·D08 |
| [P-09](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L91) | 분쟁 이력 관리 | 본문·후속 결정·기능 의존 대조 완료 | A06·A21·D05·D08 |
| [P-10](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L100) | 작업자 귀책 취소율 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-11](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L107) | 업체 귀책 취소율 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-12](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L114) | 객관적 신뢰정보 제공 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-13](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L121) | 별점 및 주관적 평가 미도입 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-14](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L127) | 낮은 신뢰도에 따른 자동 퇴출 금지 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-15](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L135) | 매칭 신청 전 신뢰정보 공개 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-16](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L144) | 신뢰정보 공개 범위 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-17](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L161) | 전체 누적 및 최근 12개월 통계 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-18](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L168) | 이용자 선택권 보장 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-19](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L175) | 신뢰정보 검색 필터 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-20](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L183) | 신규 회원의 신뢰정보 표시 정책 | C01/C02 표본·표시 경계 확인 | C01·C02·C04·C05·D06 |
| [P-21](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L192) | 신뢰정보의 최소 표본 기준 | C01 표본 적용 상충; 기존 원문 보존 | C01·C02·C04·C05·D06 |
| [P-22](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L199) | 신뢰정보 갱신 시점 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-23](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L208) | 신뢰정보 정정 정책 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-24](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L217) | 신뢰정보의 거래 중복 집계 방지 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·C05·D06 |
| [P-25](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L225) | 장기 계약의 중도 종료 처리 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-26](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L234) | 장기 계약의 근무일별 이행 기록 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-27](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L244) | 근무일별 출퇴근 시간 기록 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-28](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L253) | 근무 기록 입력 최소화 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-29](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L261) | 근무 기록 확인 요청 및 알림 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-30](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L270) | 근무 기록 확인의 책임과 권한 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-31](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L278) | 근무 확인 미응답 처리 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-32](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L286) | 확정 근무 기록의 사후 정정 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-33](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L296) | 근무 기록 확인 담당자 관리 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-34](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L304) | 근무 기록의 일괄 확인 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-35](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L312) | 근무 기록 확인 알림 통합 정책 | 본문·후속 결정·기능 의존 대조 완료 | A21·C13·D08 |
| [P-36](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L321) | 근무 기록의 열람 권한 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-37](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L329) | 근무 기록 다운로드 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-38](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L338) | 근무 기록의 제3자 제출 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-39](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L347) | 제출한 근무 이력의 진위 확인 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-40](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L355) | 근무 이력 제출 권한 철회 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-41](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L364) | 근무 이력 제출 문서의 유효기간 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-42](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L372) | 근무 이력 제출 대상의 접근 권한 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-43](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L380) | 근무 이력 제출 시 개인정보 선택 공개 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-44](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L388) | 근무 이력 제출 내역 관리 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-45](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L397) | 근무 이력 제출 알림 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-46](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L405) | 근무 이력의 재제출 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-47](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L414) | 근무 이력 제출 문서의 자동 갱신 방지 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-48](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L422) | 근무 이력 제출 문서의 열람 만료 알림 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-49](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L431) | 근무 이력 제출 문서의 열람 상태 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [P-50](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L440) | 근무 이력 제출 문서의 열람 권한 연장 정책 | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·C12·D07 |
| [SM-01](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L495) | 작업자 매칭 활성화 방식 및 모드 전환 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-02](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L504) | 자동 매칭 모드 적용 기간 (B안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-03](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L509) | 날짜별 매칭 제외 설정 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-04](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L516) | 반복 휴무일 설정 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-05](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L523) | 매칭 제안 수신 후 휴무일 변경 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-06](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L530) | 휴무일에 기존 매칭 제안 수락 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-07](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L536) | 자동 매칭 모드의 일시정지 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-08](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L543) | 일시정지 중 기존 미응답 제안 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-09](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L550) | 매칭 일시정지 자동 해제 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-10](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L556) | 매칭 재개 알림 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-11](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L565) | 자동 매칭 모드와 기본 근무 요일의 우선순위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-12](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L574) | 자발적 일시정지와 신고 중지가 겹칠 때 응답기한 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-13](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L585) | 날짜별 매칭 제외와 반복 휴무일 예외의 우선순위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-14](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L598) | 기본 근무 요일 설정 필수 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-15](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L602) | 매칭 모드 전환 시 자동 재개 예약 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-16](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L606) | 일정 및 자동 해제 시각의 시간대 기준 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-17](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L610) | 기본 근무 요일 변경 시 기존 제안 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-18](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L614) | 기본 근무 요일의 일시적 예외 설정 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A11·A12·A13·C10·C11·D04 |
| [SM-19](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L618) | 근무 가능 날짜 변경 시 업체 알림 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-20](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L622) | 변경 알림의 공개 범위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-21](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L626) | 비활성화 날짜의 기존 제안 수락 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-22](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L630) | 매칭 날짜 재활성화 시 업체 알림 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-23](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L634) | 날짜 변경 알림 중복 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-24](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L642) | 휴무일 기존 제안 수락 시 예외 적용 범위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-25](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L651) | 여러 날짜에 걸친 매칭 제안의 일정 변경 알림 (B안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-26](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L659) | 일정 변경에 따른 자동 알림의 적용 범위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-27](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L668) | 상대방 차단·신고 중지와 일정 변경 알림의 우선순위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-28](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L676) | 일정 변경 알림의 통합 시간 (B안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-29](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L686) | 알림 통합 중 제안 응답기한 도래 시 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A14·A16·A17·D03 |
| [SM-30](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L695) | 알림 통합 중 업체가 제안을 취소하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-31](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L703) | 알림 통합 중 작업자가 제안을 수락하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-32](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L711) | 알림 통합 중 작업자가 제안을 거절하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-33](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L719) | 알림 통합 중 작업자가 지원을 철회하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-34](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L731) | 일정 변경 알림의 통합 단위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-35](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L740) | 일정 변경 알림의 날짜 정보 공개 기준 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-36](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L749) | 알림 통합 종료와 제안 상태 변경이 동시에 발생하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-37](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L758) | 차단·신고 중지 해제 후 일정 변경 알림 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-38](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L767) | 차단·신고 중지 해제 후 알림 발송 시점 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-39](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L776) | 여러 중지 사유가 중복된 경우의 알림 재개 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-40](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L785) | 알림 제한 기간 중 제안이 만료되는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-41](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L793) | 알림 제한 해제 후 업체가 제안을 취소하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-42](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L802) | 알림 제한 해제 후 작업자가 제안을 수락하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-43](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L811) | 알림 제한 해제 후 작업자가 제안을 거절하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-44](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L824) | 이전 안내 상태가 없는 경우의 알림 기준 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-45](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L833) | 제안 수락과 계약 확정의 구분 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-46](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L843) | 알림 발송 직전 검사 이후 제안 상태가 변경되는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A18·A19·D03 |
| [SM-47](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L853) | 일정 변경 알림 발송 실패 시 재시도 기준 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-48](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L863) | 일정 변경 알림 재시도 시 중복 발송 방지 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-49](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L874) | 알림 발송 결과를 확인할 수 없는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-50](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L884) | 알림 발송 결과 확인 불가 상태의 장기 보류 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-51](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L895) | 발송 결과 확인 불가 상태에서 새로운 일정 변경이 발생하는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-52](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L906) | 이전 알림의 발송 성공이 뒤늦게 확인되는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-53](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L915) | 이전 알림의 발송 실패가 뒤늦게 확인되는 경우 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-54](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L929) | 마지막 안내 상태의 갱신 시점 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-55](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L939) | 복수 알림 채널에서 일부만 발송 성공한 경우 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-56](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L949) | 과거 Notification ID의 재사용 범위 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-57](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L959) | 알림 채널별 재시도 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-58](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L969) | 알림 상태 버전 관리 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-59](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L979) | 발송 결과 확인 불가 상태와 최신 상태 비교 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-60](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L989) | 제안 종료 후 대기 알림 처리 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-61](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1003) | 복수 채널 재시도 기준 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-62](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1012) | 일부 채널 성공 후 재시도 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-63](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1021) | 동일 상태 버전 중복 방지 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-64](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1030) | 채널 성공 인정 기준 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A20·D03 |
| [SM-65](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1039) | 대금 수령 확인 미응답 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A21·C09·C13·D05 |
| [SM-66](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1049) | 지급 분쟁의 증빙 관리 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A21·C09·C13·D05 |
| [SM-67](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1059) | 신뢰정보 산정 불가 (권고안 확정) | C01 표본 적용 상충; 기존 원문 보존 | C01·C02·C04 |
| [SM-68](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1068) | 휴무일 제안 수락의 효력 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A14·C11·D11 |
| [SM-69](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1076) | 일정 변경의 기존 계약 보호 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A14·C11·D11 |
| [SM-70](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1084) | 최근 12개월 통계 기준 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | C04·D06 |
| [SM-71](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1093) | 귀책 미확정 취소 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | C04·D06 |
| [SM-72](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1102) | 불가피한 취소 사유 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | C04·D06 |
| [SM-73](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1111) | 신뢰정보 정정과 통계 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | C04·D06 |
| [SM-74](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1120) | 근무 이력 제출 문서 상태 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·D07 |
| [SM-75](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1129) | 제출 문서의 권한 연장 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·D07 |
| [SM-76](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1139) | 제출 문서 철회 후 진위 확인 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·D07 |
| [SM-77](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/operating-policies.md#L1148) | 계약·정산 기록의 보존 원칙 (권고안 확정) | 본문·후속 결정·기능 의존 대조 완료 | A22·C03·C09·D07 |
| [B1](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L8) | 분쟁과 귀책 판정 | 본문·후속 결정·기능 의존 대조 완료 | A06·C07·C14 |
| [B2](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L15) | 우천 취소 | 본문·후속 결정·기능 의존 대조 완료 | A06·C07·C14 |
| [B3](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L20) | 업체 귀책 취소 시 작업자 보상 | 본문·후속 결정·기능 의존 대조 완료 | A02·C06 |
| [B4](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L27) | 작업자 귀책 취소 시 처리 | 본문·후속 결정·기능 의존 대조 완료 | A02·C06 |
| [B5](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L35) | 대금 지급 및 수령 확인 | 본문·후속 결정·기능 의존 대조 완료 | A03·C04·D05 |
| [B6](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L43) | 계약 지급 일정 | 본문·후속 결정·기능 의존 대조 완료 | A03·C04·D05 |
| [B7-1](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L50) | 정시 지급률 산식 | 본문·후속 결정·기능 의존 대조 완료 | A03·C01·C02·C04·D05·D06 |
| [B7-2](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L58) | 정시 지급률 산정 대상 | 본문·후속 결정·기능 의존 대조 완료 | A03·C01·C02·C04·D05·D06 |
| [B7-3](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L62) | 기일 경과 후 지급 미확인 | 본문·후속 결정·기능 의존 대조 완료 | A03·C01·C02·C04·D05·D06 |
| [B7-4](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L67) | 지급 통계 병행 표시 | 본문·후속 결정·기능 의존 대조 완료 | A03·C01·C02·C04·D05·D06 |
| [B7-5](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L81) | 정시 지급률 최소 표본 | C01/C02 표본·표시 경계 확인 | A03·C01·C02·C04·D05·D06 |
| [B7-6](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L85) | 정시 지급률 대표 기간 | 본문·후속 결정·기능 의존 대조 완료 | A03·C01·C02·C04·D05·D06 |
| [B7-7](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L88) | 지급률 기간 귀속 | 본문·후속 결정·기능 의존 대조 완료 | A03·C01·C02·C04·D05·D06 |
| [B7-8](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L92) | 작업자 계약 완료율 단위 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-9](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L96) | 비귀책 중도 종료 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-10](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L100) | 귀책 미확정 중도 종료 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-11](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L104) | 작업자 귀책 중도 종료 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-12](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L108) | 업체 귀책 중도 종료 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-13](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L112) | 계약 완료의 양측 확인 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-14](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L117) | 계약 완료 확인 불일치 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-15](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L124) | 작업자 계약 완료율 기간 | 본문·후속 결정·기능 의존 대조 완료 | C01·C02·C04·D06 |
| [B7-16](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L128) | 작업자 완료율 최소 표본 | C01/C02 표본·표시 경계 확인 | C01·C02·C04·D06 |
| [B7-17](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L132) | 작업자 완료율 공개 범위 | 본문·후속 결정·기능 의존 대조 완료 | A04·B01·C04·C12·D06·B01 |
| [B7-18](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L138) | 업체 계약 이행률 | 본문·후속 결정·기능 의존 대조 완료 | A04·B01·C04·C12·D06 |
| [B7-19](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L144) | 업체 이행률 공개 범위 | 본문·후속 결정·기능 의존 대조 완료 | A04·B01·C04·C12·D06 |
| [B7-20](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L148) | 업체 이행률 최소 표본 | C01/C02 표본·표시 경계 확인 | A04·B01·C04·C12·D06 |
| [B7-21](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L152) | 지표 독립성 | 본문·후속 결정·기능 의존 대조 완료 | A04·B01·C04·C12·D06 |
| [B8-1](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L157) | 기록 없음과 0% 구분 | C01/C02 표본·표시 경계 확인 | A05·C01·C02·C05 |
| [B8-2](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L161) | 최근 기록 없음 | C01/C02 표본·표시 경계 확인 | A05·C01·C02·C05 |
| [B8-3](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L165) | 수동 검색의 신뢰지표 정렬 | 본문·후속 결정·기능 의존 대조 완료 | A05·C01·C02·C05 |
| [B8-4](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L178) | 수동 검색 신뢰 필터 | 본문·후속 결정·기능 의존 대조 완료 | A05·C01·C02·C05 |
| [B8-5](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L182) | 수동 검색 필터 기본값 | 본문·후속 결정·기능 의존 대조 완료 | A05·C01·C02·C05 |
| [B8-6](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L186) | 자동매칭 우선 원칙 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-7](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L190) | 필수·협의 조건 구분 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-8](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L194) | 양측 자동매칭 조건 등록 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-9](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L198) | 조건 변경과 기존 제안 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-10](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L202) | 제안 유효기간 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-11](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L207) | 복수 후보 동시 제안 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-12](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L211) | 동시 발송 한도 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-13](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L215) | 미충원 자동 추가 발송 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-14](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L221) | 작업자 제안 수신 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-15](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L225) | 수신 중지 범위 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-16](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L229) | 동일 공고 중복 방지 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-17](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L233) | 협의 조건 불일치 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-18](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L237) | 자동매칭 우선순위 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-19](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L241) | 복수 수락과 일정 잠금 | 본문·후속 결정·기능 의존 대조 완료 | D03·D04·D11 |
| [B8-20](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L245) | 알림 유형 | 본문·후속 결정·기능 의존 대조 완료 | D03·D04·D11 |
| [B8-21](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L249) | 기한 임박 알림 | 본문·후속 결정·기능 의존 대조 완료 | D03·D04·D11 |
| [B8-22](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L253) | 응답기한 연장 | 본문·후속 결정·기능 의존 대조 완료 | D03·D04·D11 |
| [B8-23](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L258) | 작업자 거절 사유 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-24](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L264) | 매칭 조건 개선 제안 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-25](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L268) | 업체 후보 미선정 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-26](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L272) | 미선정 후 추가 매칭 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-27](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L276) | 후보 소진 시 지속 탐색 | 본문·후속 결정·기능 의존 대조 완료 | C05·C14·D09 |
| [B8-28](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L280) | 공고 일시 중지 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-29](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L284) | 공고 마감 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-30](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L288) | 모집 인원 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-31](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L293) | 작업 일정 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-32](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L297) | 급여 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-33](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L301) | 작업·장비 조건 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-34](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L307) | 작업 장소 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-35](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L311) | 복수 조건 통합 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-36](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L315) | 재동의 응답기한 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-37](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L320) | 재동의 요청 통합 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-38](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L324) | 재동의 거절 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-39](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L328) | 작업자 수락 철회 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-40](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L332) | 업체 선정 철회 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-41](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L336) | 확정 직전 재검증 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-42](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L340) | 확정 실패 보류 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-43](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L345) | 보류 중 타 제안 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-44](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L351) | 확정 계약 일정 변경 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-45](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L355) | 계약 취소 후 일정 복구 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-46](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L359) | 취소된 동일 작업 재매칭 | 본문·후속 결정·기능 의존 대조 완료 | A01·C11·D01·D09·D11 |
| [B8-47](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L374) | 특정 상대방 매칭 제외 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-48](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L381) | 업체 계정 전체 적용 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-49](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L387) | 검색 결과 숨김 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-50](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L394) | 진행 중인 지원·제안 종료 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-51](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L401) | 제외 해제 후 즉시 재매칭 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-52](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L407) | 유효기간 없음 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-53](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L412) | 설정·해제 이력 관리 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-54](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L419) | 사유 입력 불필요 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-55](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L425) | 제외 개수 제한 없음 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-56](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L431) | 후보 부족 안내 | 본문·후속 결정·기능 의존 대조 완료 | C08·C12·D09 |
| [B8-57](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L439) | 신고와 매칭 제외의 관계 (B안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-58](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L447) | 신고에 따른 매칭 차단 해제 기준 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-59](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L454) | 신고 접수 시 진행 중인 지원·제안 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-60](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L465) | 신고 처리 중 상대방에게 공개할 정보 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-61](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L471) | 피신고자의 소명 기한 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-62](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L478) | 신고 사건의 처리 기한 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-63](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L486) | 신고 처리 결과에 대한 이의신청 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-64](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L493) | 신고 사건의 증거자료 보관 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-65](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L500) | 신고 처리 결과의 공개 범위 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-66](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L506) | 허위 신고 및 반복적인 악의적 신고 처리 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A06·A07·A09·C07·C09·D09 |
| [B8-67](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L515) | 신고로 중지된 응답기한의 시간 계산 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A07·A08·A09·D04·D09 |
| [B8-68](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L522) | 동일 당사자 사이의 반복 신고와 매칭 중지 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A07·A08·A09·D04·D09 |
| [B8-69](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L529) | 이의신청 중 임시 매칭 보호조치 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A07·A08·A09·D04·D09 |
| [B8-70](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L536) | 신고 처리 결과의 통지 방법 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A07·A08·A09·D04·D09 |
| [B8-71](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L542) | 신고 관련 통지의 효력 발생 시점 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A07·A08·A09·D04·D09 |
| [B8-72](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L549) | 신고 처리 중 계정 탈퇴 요청 (A안, 후속 결정 반영) | 본문·후속 결정·기능 의존 대조 완료 | A10·C08·C09 |
| [B8-73](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L556) | 회원 탈퇴에 따른 신고 사건 종결 (사용자 직접 결정) | 본문·후속 결정·기능 의존 대조 완료 | A10·C08·C09 |
| [B8-74](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L564) | 신고 사건 종결 후 재가입 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A10·C08·C09 |
| [B8-75](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L571) | 신고 사건 종결 후 재가입 회원의 매칭 제한 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A10·C08·C09 |
| [B8-76](https://github.com/wookher-afk/node-test/blob/756d4e420d8533fdd662401a9f6d70dcf4b0221f/docs/b-policy-decisions.md#L578) | 신고 사건 종결 사유의 분류 (A안) | 본문·후속 결정·기능 의존 대조 완료 | A10·C08·C09 |

## 남은 작업

C01~C03의 우선 권고안 검토 후 관련 정책 정정은 별도 명시적 지시로 진행한다. 나머지 C는 기능 채택·설계 순서와 연결해 결정한다. D의 구조·검증 명세는 [설계 준비 보고서](node-0.1-design-readiness.md)의 게이트에 따라 작성할 수 있다. 이번 작업은 신규 4문서만 등록하며 기존 정책·결정 이력은 손대지 않는다.
