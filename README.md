# NODE 0.1

건설 작업자·업체·장비 매칭 플랫폼. Node.js 22 / PostgreSQL 16.

- 설치: `nvm use` → `npm ci`
- 문법 확인: `npm run check`
- 독립 로컬 DB에서 회귀·통합 테스트: [database/README.md](database/README.md)
- 기준 스키마: `database/` (과거 UUID `db/` 설계는 통합됨)
- 요구사항: [docs/requirements-node-0.1.md](docs/requirements-node-0.1.md)

현재 회원·작업자 경력·업체 등록 API와 매칭 DB 기반이 있습니다.
구인·지원·매칭 공개 API는 후속 개발 대상입니다. 서버 시작 시 DB 변경은 실행하지 않습니다.

- 일의 기록 = 신뢰: [데이터 원칙과 정정·학습 동의 설계](docs/work-records-and-trust.md)

- 1차 안정화: [로컬 최소 권한 역할과 입력 검증](docs/stabilization-1.md)
