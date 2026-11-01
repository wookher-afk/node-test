# 장비 규격 정확 일치 — 실제 PostgreSQL 통합 검증

2026-11-01, 작업본 `/Users/heowook/Documents/ChatGPT/Node/node-alpha-01`.
브랜치 `feature/node-alpha-01-worker`, HEAD `a2868444e317bb441576586b0f28e61be20b7562`.

## 결과

Postgres.app PostgreSQL 17.11, Node.js 22.23.4에서 실제 HTTP 서버와 PostgreSQL을 사용해 통과했다. 모의 DB나 모의 HTTP 응답은 사용하지 않았다. HTTP 서버는 기존 보조 도구로 생성한 임시 제한 DB 역할을 사용했다. 테스트 관리자 연결은 임시 DB 준비와 저장 결과 직접 확인에만 사용했다.

실제 경로: `/api/register` → `/api/me/companies` → 작업자 `/api/me/worker-registration` 및 업체 `/api/companies/:id/registration` PUT → 두 등록 테이블의 JSONB·버전 직접 조회 → 같은 등록 API의 GET → `/api/companies/:id/auto-matches` GET → `server/auto-matching.js` 판정.

| 업체 규격 | 작업자 규격 | 결과 |
|---|---|---|
| 미니 017 | 미니 017 | `matched=true`, equipmentSpec `pass` |
| 미니 020 | 미니 020 | `matched=true`, equipmentSpec `pass` |
| 미니 017 | 미니 020 | `matched=false`, `not_matched`, equipmentSpec `fail` |
| 미니 020 | 미니 017 | `matched=false`, `not_matched`, equipmentSpec `fail` |
| 미니 017 | 빈 문자열 | 저장·조회 가능하나 `matched=false`, `not_matched`, equipmentSpec `unknown` |
| 기존 유효 업체 | 작업자 규격 필드 생략 또는 null | 등록 API 400, 기존 저장 문서·버전 보존, 기존 빈 규격은 계속 매칭 불가 |
| 업체 규격 필드 생략·null·빈 문자열 | 기존 작업자 | 등록 API 400, 기존 저장 문서·버전 보존, 기존 빈 규격 작업자는 계속 매칭 불가 |

양측 선택 필수조건은 빈 배열로 두어도 규격 필수 검사가 적용됨을 확인했다. 유효한 5개 저장 사례에서 동일 기종·형태·옵션, 급여, 지역, 시간, 전체 작업일 포함 조건 및 경력 게이트가 충족됨을 확인했다. 각 저장 결과는 DB 원문 및 조회 응답과 일치했다. 매칭 GET 전후 등록 문서와 버전도 일치했다.

## 실행 개수

- 기존 전체 DB 실행기 `scripts/test.mjs`: **152/152**, 실패·건너뜀 0. 신규 설치·마이그레이션 보존/롤백 및 임시 권한 정리 검사도 통과. 단위·모의 검사도 포함하므로 152개 모두를 별개 실DB 시나리오로 해석하지 않는다.
- 이전 단계 명령 `node --test tests/auto-matching.test.js tests/required-match.test.js tests/worker-alpha.test.js tests/company-registration.test.js`: **44/44**, 실패·건너뜀 0. 위 실행과 일부 중복되므로 단순 합산하지 않는다.
- 신규 `tests/equipment-spec.integration.test.js`: **10개 사례 모두 통과**, Node TAP 집계 **11/11**(상위 테스트 1개 포함), 실패·건너뜀 0.
- 신규 테스트 및 서버 구문 검사, `git diff --check`: 통과.

로그: [기존 DB 회귀](equipment-spec-db-2026-11-01/existing-db-suite.txt), [기존 44개](equipment-spec-db-2026-11-01/existing-44.txt), [신규 실제 DB 검사](equipment-spec-db-2026-11-01/equipment-spec-integration.txt).

## 원본 보존 방법과 확인

기존 `.env.local`은 읽기만 했으며 파일·접속 설정을 변경하지 않았다. 최초 제한 환경 연결은 EPERM이었고, 승인된 로컬 연결 실행으로 확인했다. PostgreSQL 설치·재시작·인증 설정 변경은 하지 않았다.

이번에만 생성한 `node_test_spec_20261101_1793540328249` DB를 `template0`에서 만들었다. 기존 파괴적 회귀 실행기는 이 새 DB만 대상으로 실행했다. 기존 미리보기 DB `node_alpha_01_local` 및 다른 기존 테스트 DB에는 DDL/DML을 실행하지 않았다. 임시 DB와 임시 역할은 종료 시 제거했다.

실행 전후 모든 기존 비템플릿 DB를 `pg_dump`로 읽어 전체 덤프(스키마·데이터·시퀀스·권한 포함)의 SHA-256을 비교했다. 매번 무작위로 생성되는 dump의 `\restrict`/`\unrestrict` 식별자 줄만 제외했다. 원본 데이터 덤프 자체는 보고서에 저장하지 않았다. 기존 DB 목록·DB ACL, 역할 속성·역할별 설정, `pg_db_role_setting`도 전후 비교하여 모두 일치했다. 이 검사는 서버 전체의 모든 설정 파일을 비교하는 검사는 아니며, 이번 실행에서는 설정 변경 명령을 사용하지 않았다.

작업본 파일은 테스트 실행 직전 SHA-256 목록과 종료 후 목록을 비교했고, 기존 파일 변경은 0개였다(이 검증에서 추가한 테스트 파일도 실행 중 변경되지 않음). 기존 미커밋 변경을 초기화·덮어쓰기하지 않았고 브랜치와 HEAD를 유지했다.

근거: [전 상태](equipment-spec-db-2026-11-01/preservation-before.json), [후 상태](equipment-spec-db-2026-11-01/preservation-after.json), [비교 결과](equipment-spec-db-2026-11-01/result.json). `originalDatabasesUnchanged=true`, `existingFilesChanged=[]`.

## 이번 요청으로 추가한 파일

- `tests/equipment-spec.integration.test.js`: 실제 API·DB 경로 검증. 기존 기본 실행기는 변경하지 않았으며, 격리 DB에 001~009와 임시 runtime 역할을 준비한 뒤 별도 실행했다.
- 이 보고서.
- `docs/equipment-spec-db-2026-11-01/`: 로그 3개, 전후 보존 증거 JSON 2개, 결과 JSON 1개.

제품·매칭 코드와 기존 테스트 파일은 수정하지 않았다. 가격 근접 추천·일정 조합·선착순 수락은 구현하지 않았으며, 커밋·GitHub 푸시·배포·병합도 하지 않았다.
