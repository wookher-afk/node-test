# NODE Alpha 0.1 — PostgreSQL 실제 연결·통합 검증

2026-10-31, MacBook Air M1, `feature/node-alpha-01-worker`.

## 결과

Postgres.app PostgreSQL **17.11** (`aarch64`), `127.0.0.1:5432`에 실제 연결했다. macOS/Postgres.app 연결 허용 전에는 제한 환경에서 EPERM, 별도 연결에서는 시간 초과였고, 사용자가 연결 허용 창에서 OK를 누른 뒤 정상 접속했다. 비밀번호를 요청하거나 변경하지 않았다.

공식 Node.js Mac ARM64 배포 파일을 임시 폴더에만 내려받아 공식 SHA-256과 일치함을 확인했다. **Node 22.23.4**에서 전체 서버 테스트 126/126, 단위·모델 17/17, 실제 브라우저 실DB 흐름 390·1440px 모두 통과했다. 시스템 Node/PATH 설정은 변경하지 않았다. 기존 UI 14개 스위트는 번들 Node 24.22.1 + 설치된 Chrome으로 모두 통과했다.

126개 실행 안에는 `worker-alpha.test.js`의 단위/mock 8개가 포함된다. 별도 17개 실행은 이 8개와 03-3 모델 9개이며 중복 합산하면 안 된다. 전체 서버 실행기가 실제 PostgreSQL로 마이그레이션·픽스처를 준비하며, HTTP 회귀 서버는 임시 제한 DB 역할로 접속한다. 126개 모두를 독립적인 실DB 시나리오라고 주장하지 않는다.

## 데이터와 환경 보존

접속 전 목록에는 `heowook`, `postgres`, `template0`, `template1`만 있었다. 이 DB들에는 DDL/데이터 쓰기나 초기화를 하지 않았다. 다음 DB는 이번 작업에서 새로 생성했다.

| DB | 용도·상태 |
|---|---|
| `node_alpha_01_local` | 계속 보존할 미리보기 전용 DB. 비어 있는 상태에서 001~008을 한 번 적용. 실제 브라우저가 만든 합성 검증 계정·장비·업체 데이터가 남아 있다. |
| `node_test_alpha_01_20261031` | 이번 작업만을 위해 만든 폐기 가능한 회귀 DB. 기존 실행기가 이 DB의 public 스키마만 재구성하여 전체 회귀를 수행. 기존 사용자 DB에는 실행하지 않음. |

`database/`가 유일한 현재 SQL 경로이며 `db/`는 폐기된 UUID 설계 안내다. 001~008 적용 체크섬은 [migration-sha256.txt](postgresql-verification-2026-10-31/migration-sha256.txt)에 있다. 기존 실행기는 일회성 마이그레이션을 자동 추적하지 않으므로 기존 DB에 재적용하지 않는다.

원래 `.env`는 없었고 `.env.example`의 샘플 접속값은 이번 Postgres.app 설정과 달랐다. 서버는 환경 파일을 자동으로 읽지 않는다. 실제 로컬 설정은 Git에서 제외되는 `.env.local`에만 작성했고 비밀번호·세션 토큰은 보고서나 로그에 기록하지 않았다. 미리보기는 로컬 관리자 연결을 쓰며, 전체 HTTP 회귀의 제한 역할 검증과 구분한다. 배포용 권한 구성을 새로 개발하지 않았다.

최종 `npm run check`, `git diff --check`, 8048 `/api/health` 모두 통과했다. 미리보기 DB 최종 조회에서 합성 계정 5개, 등록 문서 4개가 확인됐다(최초 중단된 브라우저 검사 계정도 삭제하지 않고 보존).

## 요청한 항목별 검증

| 항목 | 실제 PostgreSQL 결과 | 브라우저 결과 |
|---|---|---|
| 이메일+비밀번호 회원가입·로그인 | 통과, 비밀번호 해시·회원 ID·재로그인 확인 | 실제 화면에서 통과, 390·1440px |
| 로그아웃·토큰 폐기 | 통과, 이전 토큰 401 | 실제 로그아웃 API와 재로그인 통과 |
| 세션 유효성·가짜 토큰·만료 | 통과, DB 만료시각을 과거로 바꿔 401 및 쓰기 차단 확인 | 실제 로그인·새로고침·재로그인 통과 |
| 서버 재시작 후 자동 인증 | 통과, Node HTTP 서버 종료·재시작 후 동일 토큰으로 `/api/me` 및 등록 문서 복원 | 같은 탭 새로고침으로 서버 인증·복원 통과. 브라우저를 유지한 채 서버 재시작하는 단일 UI 시나리오는 별도로 실행하지 않음 |
| 03-2 운전능력·소유 장비 분리 | 통과, 별도 배열 저장·조회·수정 | 실제 장비 화면에서 각각 추가 후 실DB 저장·복원 통과 |
| 구직조건 저장·조회·수정 | 통과, 급여·지역 변경·버전 증가·충돌 거부 | 실제 급여 250000→310000 변경, 새로고침·재로그인 복원 통과 |
| 다른 계정 격리 | 통과 | HTTP 통합 검사로 검증 |
| 동일 계정의 업체/작업자 역할 공존 | 통과, 동일 회원 ID와 업체 소속 확인 | 실제 저장한 계정에 업체 생성 후 두 역할 확인 |
| 기존 데이터 업그레이드·실패 롤백 | 통과, 003~008 및 기존 계정·매칭·지급 이력 보존 검사 | 해당 없음 |

[Node 22 전체 서버 로그](postgresql-verification-2026-10-31/database-node22.txt), [실DB 브라우저 로그](postgresql-verification-2026-10-31/real-browser-node22.txt), [단위·모델 로그](postgresql-verification-2026-10-31/unit-node22.txt).

세션 만료는 실제 30일 대기 대신 검증용 DB의 해당 테스트 세션 만료시각만 조정했다. 브라우저를 완전히 닫은 뒤의 지속 자동 로그인은 현재 `sessionStorage` 정책상 보장하지 않으며 기능을 임의로 추가하지 않았다. PostgreSQL 프로세스 자체 재시작, Safari, 운영/원격 DB, 배포는 검증하지 않았다.

## 회귀 실패 원인과 수정

애플리케이션 화면·카탈로그·첫 화면·저장 구현은 이번 작업에서 바꾸지 않았다.

1. 선택입력 `optionalDetails`, 내부 실제 제원, 복구 도구가 접혀 있는데 과거 테스트가 바로 필드 조작·다운로드를 시도했다. `optional-control.cjs`로 상위 details를 실제 summary 클릭으로 연 뒤 조작하도록 했다. 초기 접힘 자체를 검증하는 optional/progressive 검사는 그대로 별도 실행했다.
2. 최근 progressive 검증 문서의 기준은 상위 분류/형태 변경 시 하위 입력을 초기화하는 것이다. 과거 테스트의 자동 재선택 기대값을 이 기준으로 맞추고, 기존 등록 행·이관 원문 보존은 계속 검사했다. 이전 문서의 형태별 자동 복원 기준과 최신 구현 사이 차이를 새 기능으로 해결하지 않았다.
3. 제조사·모델이 선택사항이 된 뒤에도 필수 입력/자동 trim을 기대하던 테스트를 수정했다. 필수 실제 장비명·형태 직접 입력 및 숫자 검증은 유지했다.
4. PostgreSQL DATE를 JS Date로 읽어 UTC 문자열로 바꾸면 한국 시간 자정이 전날 UTC가 되는 테스트 오류가 있었다. 지급일 스냅샷을 SQL `::text`로 비교하도록 바꿨다. DB 날짜·운영 코드는 변경하지 않았다.
5. 기존 `worker-alpha` 모의 UI 검사의 캡처 경로를 임시 출력으로 옮겨 기존 docs 캡처를 덮어쓰지 않도록 했다.

## 전체 UI 결과 — 실DB 검사와 구분

아래 14개 기존 스위트 모두 종료코드 0이다. 이들은 로컬 파일·브라우저 저장소·일부 모의 API 응답을 사용하며 실DB 통과의 근거로 대체하지 않는다.

`03-2`, `03-2-a`, `03-2-cargo`, `03-2-dump`, `03-2-equipment`(28종 생명주기·31종 제원·무손실·시각), `03-2-flow`, `03-2-multisize`, `03-2-navigation`, `03-2-optional`, `03-2-progressive`, `03-3`, `03-3-multisize`, `registration-entry`, `worker-alpha`.

[13개 연속 실행 결과](postgresql-verification-2026-10-31/ui-results.json), [별도 장비 전체 검사](postgresql-verification-2026-10-31/03-2-equipment.test.cjs.txt). 각 상세 로그도 같은 폴더에 보존했다. 최초 실패와 중간 진단 로그는 `/private/tmp/node-alpha-pg-verify`에 남기고, 문서 폴더에는 최종 결과만 복사했다.

실DB 브라우저 화면: [390px](postgresql-verification-2026-10-31/real-worker-390.png), [1440px](postgresql-verification-2026-10-31/real-worker-1440.png).

## 이번 작업에서 변경한 파일

- `database/README.md`: 008 적용 및 안전한 로컬 DB 구분 안내.
- `tests/records.test.js`: 날짜 비교 시간대 의존 제거.
- `tests/ui/optional-control.cjs`: 접힌 상위 선택입력/복구 도구를 여는 검사 보조 파일 추가.
- `tests/ui/03-2.test.cjs`, `03-2-a.test.cjs`, `03-2-cargo.test.cjs`, `03-2-dump.test.cjs`, `03-2-equipment.test.cjs`, `03-2-flow.test.cjs`, `03-2-multisize.test.cjs`: 최신 단계·접힘·초기화 기준에 맞춘 기존 회귀 절차 수정.
- `tests/ui/worker-alpha.test.cjs`: 기존 캡처 보호를 위한 출력 경로 수정.
- `tests/ui/worker-postgres.test.cjs`: 모의 응답 없는 실제 브라우저 통합 검사 추가. 실행하려면 명시적 `NODE_REAL_UI_URL=http://127.0.0.1:8048` 필요.
- `.env.local`: 로컬 접속 설정, Git 무시 확인.
- 이 보고서와 `docs/postgresql-verification-2026-10-31/`: 최종 로그·화면·SQL 체크섬.

작업 시작 전부터 있던 수정·미추적 파일(서버, 008 SQL, Alpha UI, 03-3, 기존 보고서 등)은 보존했다. 브랜치 전환·커밋·푸시·배포·병합은 하지 않았다. 신규 제품 기능은 추가하지 않았다.

## 로컬 미리보기·사용자 조치

- 새 실DB 미리보기: **http://127.0.0.1:8048/**
- 장비 작업자 진입: **http://127.0.0.1:8048/?entry=equipment#auth**
- 기존 8047 서버는 중단·교체하지 않았다. 주소/포트별 브라우저 저장소는 별개이므로 8047의 기존 임시 입력은 그대로 남고 8048에서 자동 표시되지 않는다.
- Postgres.app을 Running 상태로 유지하면 된다. 새 미리보기에서 본인 이메일로 새 계정을 만들어 사용 가능하다. 테스트용 비밀번호는 공유하지 않는다.
- 이번 서버는 Node 22.23.4로 실행 중이다. 중단 후 재시작할 때 프로젝트 폴더에서 Node 22의 `node --env-file=.env.local server/index.js`를 사용한다. 임시 검증용 실행 파일은 `/private/tmp/node-alpha-pg-verify/node-v22.23.4-darwin-arm64/bin/node`이며 macOS 임시 폴더 정리 시 사라질 수 있다. 전역 설치는 하지 않았다.
- `node_alpha_01_local`에는 `npm test`를 실행하지 않는다. 검증 데이터도 이번 작업에서는 삭제하지 않았다.
