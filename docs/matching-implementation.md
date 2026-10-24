# NODE 0.1 — 실제 매칭 트랜잭션 (개발용)

기본 스키마: `db/001_foundation.sql` → `db/002_matching.sql`.

## 구현됨
- `node_approve_match(match_id, terms_id, 'worker'|'company', actor_id)`: 동일 최신 조건의 양측 승인 기록
- `node_confirm_match(match_id)`: 날짜별 정원 및 작업자 일정 중복을 **DB 트랜잭션에서 검사**한 뒤 확정
- `node_cancel_match(match_id, actor_id, reason)`: 취소 사유와 주체 기록, 정원 복구(취소된 매칭은 정원 집계에서 제외)
- `match_events`: 승인·확정·취소 이벤트 추적

## 사용 예 (개발용)
```sql
BEGIN;
SELECT node_approve_match(:match_id, :terms_id, 'worker', :worker_user_id);
SELECT node_approve_match(:match_id, :terms_id, 'company', :company_member_user_id);
SELECT node_confirm_match(:match_id);
COMMIT;
```
위 UUID들은 애플리케이션 서버가 **인증 후** 전달해야 합니다.

## 미구현 및 운영 금지 사항
- 인증된 요청자와 함수 인자 동일성 검증, 회사별 세부 권한, RLS/권한 철회
- 장비+기사 가용성, 외부 일정, 휴가, 수동 불가 일정 검사
- 회사 직접 제안 생성, 지원 신청 검증, 부분 지원 설정 검사
- 취소·변경·재승인 시 세부 권한 및 알림, 상태 변경 API
- 실 DB에서의 마이그레이션 실행 및 동시성/통합 테스트
- 회사 정원 변경/날짜 변경도 동일 잠금 규약을 사용하도록 강제해야 함
- 예약 중 날짜 변경/승인 무효화는 서버 API로 통제 필요

**이 SQL은 인증·권한이 완성되기 전까지 외부 사용자에게 직접 호출 권한을 주면 안 됩니다.**
