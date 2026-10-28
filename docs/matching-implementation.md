# NODE 0.1 — 통합 매칭 기반

기존 UUID `db/` 실험은 bigint 회원 서비스 스키마로 통합했습니다.
현재 기준은 [database/README.md](../database/README.md)와
`database/001_foundation.sql` → `002_accounts.sql` → `003_unified_matching.sql`입니다.

승인·정원·일정·예약·취소 로직을 동일 DB에서 테스트합니다.
API에서 생성한 계정/업체 ID를 그대로 사용한 매칭 통합 테스트,
기존 회원 데이터 보존 업그레이드 테스트, 독립 PostgreSQL 세션 동시 확정 테스트가 있습니다.
실행은 `npm test`이며 명시적으로 허용한 로컬 일회용 DB만 초기화합니다.

구인/지원/매칭 API와 UI, 전체 요구사항 구현은 후속 작업입니다.
운영 Render/Neon 적용은 수행하지 않았습니다.

활동·평가·선호·추천 이력은 추가 마이그레이션 004와
[일의 기록 = 신뢰 설계](work-records-and-trust.md)를 따릅니다.
