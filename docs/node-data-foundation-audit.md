# NODE 공통 데이터 설계 — 1차 감사 (2026-10-26)

상태: **기존 요구사항 분석 완료 / 실제 DB 구축 전 / 테스트 미실행**.

## 확인한 기준
- `docs/requirements-node-0.1.md` (브랜치 `develop/node-0.1-foundation`)
- 기존 `main`의 웹 시제품 8개: 서버 연동 없는 브라우저 저장형
- 기존 기준서의 DB-001~014, EQUIP-001~009, LOG-001~006, JOB-002~021 및 미확정 아이디어
- 벤치마킹 후보: 검색·예약, 교대근무·증빙, 협의·거래, 운송 매칭

## 우선 확정할 공통 엔터티와 관계
1. `accounts` — 개인 계정 식별자. 연락처·인증정보는 공개 코드/테스트 데이터와 분리
2. `account_roles`, `organizations`, `organization_memberships`, `permissions`, `permission_audit` — 복수 역할/업체 소속
3. `occupation_categories`, `occupations`, `qualification_types` — 확장 가능한 대/소분류 직종
4. `regions`, `worker_regions`, `worksites` — 전국 계층 지역, 복수 희망지역, 현장
5. `worker_profiles`, `qualifications`, `document_metadata` — 경력·자격·서류 메타데이터
6. `equipment`, `equipment_capabilities`, `equipment_relationships`, `equipment_events` — 장비/옵션/소유·운영·기사/정비 이력
7. `job_posts`, `job_lines`, `job_line_dates`, `applications`, `offers` — 현장별 복수 직종·날짜별 정원·양방향 제안
8. `availability_rules`, `calendar_events`, `resource_reservations` — 개인/장비/차량 일정과 확정 예약
9. `match_terms_versions`, `match_approvals`, `matches`, `match_cancellations` — 변경 불가능한 조건 버전별 양측 승인
10. `work_attendance`, `work_evidence`, `completion_confirmations`, `corrections` — 출퇴근/증빙/양측 완료
11. `transport_vehicles`, `transport_requests`, `transport_assignments`, `transport_handoffs`, `transport_incidents` — 운송 적재·예약·인수·인계
12. `payment_obligations`, `payment_claims`, `receipt_confirmations`, `payment_disputes` — 지급 등록과 수령 확인 분리
13. `reviews`, `trust_snapshots`, `reports`, `appeals`, `audit_events` — 원본 기반 신뢰, 신고·소명, 감사 추적
14. `notifications`, `notification_preferences`, `saved_searches` — 긴급구인·일정·자격 만료 알림

## 데이터 무결성 필수 규칙
- 동일한 조건 버전의 업체/작업자 승인이 모두 있어야 매칭 확정.
- 작업자·장비·운송차량은 확정된 시간 구간이 중복 예약되지 않도록 DB 트랜잭션에서 검사.
- 모집 정원은 날짜·직종별 확정 매칭 수를 기준으로 계산하며, 동시 확정 경쟁을 원자적으로 처리.
- 일정이 비어 있다는 이유만으로 작업 가능으로 판정하지 않음.
- 작업 완료는 양측 독립 확인; 지급은 지급자 등록과 수령자 확인이 별개.
- 신고·미응답·이의신청 사실만으로 자동 신뢰도 감점하지 않음.
- 계약/승인/지급/취소/수정은 원본 이력을 삭제하지 않고 감사 이벤트로 보존.
- 민감한 서류 원본은 공개 저장소나 일반 프로필 테이블에 넣지 않음.

## 구현 순서 및 완료 기준
- **DB-BASE-01**: SQL 스키마 + 마이그레이션 + 외래키/유일성 제약 + 샘플 *가상* 데이터 + 자동 테스트
- **AUTH-01**: 계정/역할/업체 권한 API와 실제 DB 연동
- **JOB-01**: 복수 모집/날짜별 정원/지원 및 제안 API
- **MATCH-01**: 조건 버전·양측 승인·예약 충돌 방지
- 이후 일정, 장비, 운송, 출퇴근, 지급, 신뢰 기능을 같은 DB/API에 순차 연결

## 아직 결정하거나 검증해야 할 사항
- DBMS 및 호스팅 선정(권장 후보: PostgreSQL). 현재 운영 DB는 없음.
- 개인정보 보호, 본인확인·소셜 로그인 공급자 및 비용·법률 요건.
- 세부 지급/취소/전자계약 정책은 기존 기준서에서 미확정.
- 실제 SQL 파일 경로와 기존 CI 구성을 저장소 전체 트리 기준으로 재확인해야 함. 추측 경로에서는 찾지 못했음.
- 현재 문서는 **설계 감사**이며, 데이터베이스 구축이나 API 구현 완료를 의미하지 않음.
