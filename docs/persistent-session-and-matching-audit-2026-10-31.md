# NODE Alpha 0.1 지속 로그인 및 자동매칭 호환성 감사

2026-10-31 · `feature/node-alpha-01-worker`. 기존 미커밋 변경 위에서 필요한 부분만 수정했다. 기존 DB/등록 문서/장비 카탈로그/회원 ID/복수 역할 정책을 보존했다. SQL 마이그레이션이나 매칭 엔진은 추가하지 않았다. 커밋·푸시·배포·병합하지 않았다.

## 지속 로그인

브라우저는 `node_session` 쿠키로 인증한다. `HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`이며 서버 DB의 30일 절대 만료를 함께 검사한다. 조회할 때 만료를 연장하지 않는다. DB에는 무작위 256비트 토큰의 SHA-256 해시만 저장한다. 로그인·회원가입마다 새 세션을 발급하고 브라우저용 응답에는 토큰을 포함하지 않는다. 기존 이메일/비밀번호와 Bearer API 응답 호환성은 유지한다.

화면은 시작할 때 항상 `/api/me`를 조회한다. localStorage 로그인 플래그나 토큰으로 인증하지 않으며 기존 sessionStorage 인증 키는 제거한다. 작업자 등록 화면도 쿠키로 서버 인증을 받는다. 기존 장비 초안 등 비인증 로컬 데이터는 보존했다. 과거 탭 토큰만 있는 사용자는 한 번 다시 로그인해야 한다.

로그아웃은 DB에서 현재 세션을 삭제하고 쿠키를 만료시킨다. 이미 만료되거나 없는 세션도 쿠키 정리가 가능하다. 인증 401 응답에서도 브라우저 쿠키를 정리한다. 로그아웃 전 쿠키 재사용은 401이다. 다른 기기의 별도 세션을 모두 폐기하는 기능은 이번 범위에 없다.

쓰기 요청은 JSON 형식을 요구하고 Origin 및 Fetch Metadata를 확인한다. 다른 Origin/교차 사이트 요청을 거부하며, 쿠키 기반 쓰기는 출처 정보 없는 요청도 거부한다. Bearer 호출 호환성은 유지하되 전달된 교차 출처 정보는 무시하지 않는다. 쿠키가 중복되거나 토큰 형식이 틀리면 인증하지 않는다.

운영에서는 `NODE_ENV=production` 또는 `SESSION_COOKIE_SECURE=true`로 Secure 쿠키를 사용해야 한다. HTTPS 프록시 뒤에서는 `PUBLIC_ORIGIN=https://실제호스트`를 설정한다. 현재 127.0.0.1 HTTP 미리보기는 Secure가 꺼진 로컬 개발 설정이다. 운영 HTTPS/프록시 실배포 검증을 했다는 뜻은 아니다.

## 검증과 한계

Node 22.23.4와 Postgres.app PostgreSQL 17.11을 사용했다. 서버 회귀는 기존 폐기용 `node_test_alpha_01_20261031`에서 실행했고, 미리보기 DB `node_alpha_01_local`에는 스키마 재설정이나 마이그레이션 재적용을 하지 않았다. 브라우저 검증은 무작위 합성 계정을 추가했으며 기존 계정/세션은 변경하지 않았다. 만료 검증은 새 합성 계정에만 과거 만료 세션을 만들었다.

- 서버 회귀 126/126 통과. 기존 8개 단위/mock 검사를 포함하므로 126개 모두 독립 실DB 시나리오라는 뜻은 아니다.
- 실제 Chrome 지속 프로필: 390/1440px에서 회원가입 → Chrome 전체 프로세스 종료 → 같은 디스크 프로필로 새 프로세스 실행 → 실제 `/api/me` 자동 로그인 통과. 브라우저 상태를 JSON으로 추출해 재주입하는 방식이 아니다.
- 같은 브라우저에서 검증용 서버(8049) 종료·재시작 → 새로고침 → 기존 DB 세션 인증 통과.
- HttpOnly·SameSite·지속 만료 속성, document.cookie 비노출, 웹 저장소 인증 토큰 미사용, 브라우저용 응답 토큰 비노출 확인.
- 교차 Origin 쓰기 403, 로그아웃 쿠키 삭제·DB 무효화·이전 쿠키 401, 실제 DB 만료 세션 자동 로그인 401 통과.
- 실제 8048 브라우저: 장비 능력/소유 분리 저장·수정·새로고침·재로그인 복원·업체/작업자 복수 역할 390/1440px 통과.
- 관련 기존 UI 회귀: registration-entry 320/390/1440px, worker-alpha 390/1440px 통과. 이 둘은 모의 API 검사이며 실DB 결과와 구분한다. 장비 단독 UI 전체 14개 스위트를 이번에 다시 실행하지는 않았다.
- `git diff --check` 및 변경된 서버/화면 스크립트 문법 검사를 수행했다.

최종 로그: [서버 회귀](persistent-session-verification-2026-10-31/server-regression.txt), [실브라우저 및 UI](persistent-session-verification-2026-10-31/browser-ui.txt), [첫 화면 최종 재검사](persistent-session-verification-2026-10-31/entry-final.txt). 운영 Secure 설정과 삭제 쿠키, 중복·위조 인증값 거부도 별도 확인했다.

실제 30일 대기, OS 강제 종료/충돌, 사용자 브라우저의 종료 시 쿠키 삭제 설정, 시크릿 모드, Safari/Firefox, PostgreSQL 프로세스 재시작, 운영 HTTPS는 미검증이다. Chrome의 정상 프로세스 종료·재실행은 검증했으며 사용자 개인 브라우저를 종료하지 않았다. 검증 프로필은 `/private/tmp/node-session-chrome-*`에만 남고 토큰 값은 보고서/로그에 기록하지 않았다.

## 자동매칭 호환성 감사

판정: **현 상태에서 양쪽 데이터를 바로 비교하는 자동매칭 구현은 준비되지 않았다.** 작업자 입력 원문은 보존되지만 업체 API와 공통 코드·단위·누락값 계약이 없다.

| 필드 | 작업자 등록/UI | 업체 구인/API·DB | 격차 및 다음 계약 |
|---|---|---|---|
| 장비 대·중·소 | 03-2 카탈로그 `major`, `middle`, `kind`를 JSON 문서에 보존 | `occupations`의 2단계 숫자 FK와 `occupation_id` | 공통 불변 장비 코드와 카탈로그 버전, 기존 occupation 대응표 필요. 표시 이름으로 자동 연결 금지 |
| 형태·현장규격 | `form`, `size`, 직접 입력·다중 규격별 레코드 | `job_lines` 및 현재 공고 API에 대응 입력 없음 | 업체 필요 형태·규격 필드 및 정확/범위/직접 입력 비교 규칙 필요. 현장 호칭을 공인 제원으로 추론하지 않음 |
| 실제 제원·옵션 | `specs`, `equipmentDetails`, `equipmentSpecStates`, `optionSelections`, cargo 등 원문/상태 저장 | `equipment`/`equipment_options` 기존 테이블은 있으나 Alpha JSON과 연결 안 됨. 현재 공고 API에는 필요 옵션 입력 없음 | 단위별 수치와 상태(값 있음/미기재 등), 필수/선호 구분, 옵션 코드 대응 필요. 미기재를 불충족·0으로 바꾸지 않음 |
| 능력·소유/자원유형 | `abilities`/`ownedEquipment` 분리, 자가기사/데모기사 | `worker`, `equipment_and_worker`, `equipment` | 역할과 자원유형은 일대일 대응 아님. 소유만으로 운전능력 추정 금지, 배정 가능 조합 계약 필요 |
| 지역 | `preferences.regions` 자유 문자열 배열 | `worksites.region_id` → `regions`, worker_regions 및 preference_regions 별도 | 지역 코드 매핑·상위지역 포함·전국/직접 입력 정책 필요. 현재 Alpha 저장은 이 관계 테이블로 투영되지 않음 |
| 일정/시간 | 명시적 `availableDates`, 시작/종료 HH:mm, 익일 종료 규칙 | `job_line_dates` 날짜·정원, `allow_partial`; preference_versions는 기간/요일 형태 | 명시 날짜 집합과 기간/요일의 의미가 다름. 업체 시간·시간대·야간 및 부분 수락 계약 필요 |
| 급여 | 최소 금액, day/month/hour | 현재 공고 API는 day만 허용. DB 조건 버전은 일급 | 동일 단위끼리 우선 비교. 월/시급의 임의 일급 환산 금지. 5만원 기본값은 기존 상수만 존재하며 적용 단위·방향·완화 단계 합의 필요 |
| 경력 | 장비별 `years` 문자열(빈 값 허용); 별도 전체 `experience_months` | `hiring_condition_versions.min_experience_months` 존재하지만 공고 입력 API에는 없음 | 장비별/전체 경력 분리 및 월수 변환 계약 필요. 빈 값은 무경력이 아님 |
| 우선순위 | 조건 순열과 능력 레코드 ID 순위 | 대응 공고 선호 입력/후보 평가 없음 | 필수 필터와 선호 점수 구분, 동일 점수 순서·설명 가능성 계약 필요 |
| 자격/면허 | 기존 03-3 원본 보존, Alpha 흐름에는 미노출 | 현재 공고 API에 필수 자격 입력 없음 | MVP 포함 여부 후속 결정. 본인 신고를 검증 완료로 취급하지 않음 |
| 버전/이력 | JSON 문서 version과 충돌 409 | 공고 버전 봉인/약정 스냅샷 존재, 004 선호·구인 조건 버전 존재 | Alpha 문서를 기존 버전 테이블로 연결하는 명시적 투영 없음. 후보 생성 시 양쪽 버전 고정 필요 |

서버 `validateRegistration`은 능력/소유 배열, 기본 장비 식별·형태·규격·경력 및 희망조건을 검증하지만 장비 카탈로그 소속·옵션 코드·제원 구조 전체를 검증하지 않는다. JSON 보존을 의미적 정규화 완료로 해석하면 안 된다. 현재 공고 API는 허용 필드 목록에 없는 장비·경력·시간 필드를 거부한다. DB에 관련 테이블이 있다는 사실만으로 제품 입력→매칭 연결이 된 것은 아니다.

### 자동매칭 MVP 후속 구현 순서 — 이번에는 구현하지 않음

1. 기존 합의 문서와 위 격차를 기준으로 공통 데이터 계약 확정: 장비 코드/카탈로그 버전, 지역 코드, 단위, 미기재 상태, 필수·선호, 자원 조합. 원문과 기존 ID는 보존한다.
2. 실제 기존 JSON/공고 데이터의 값 분포와 매핑 가능성 읽기 감사, 충돌·직접 입력·미지정 항목 별도 목록 작성. 자동 추정 없이 검토 경로 설계.
3. 추가형 DB 마이그레이션과 명시적 어댑터 설계: Alpha JSON→정규화 버전 스냅샷, 기존 004/007과 중복 진실 공급원 방지. 기존 예약·승인·지급 이력 재작성 금지. 롤백·이전 문서 무손실 테스트 선행.
4. 업체 입력/API에 MVP 필수 조건 추가, 서버 검증과 조회 복원 확인. 기존 화면·정책은 합의 범위에서만 변경.
5. 이후 별도 승인 범위에서 날짜·자원·장비·지역·급여·경력 필수 필터를 먼저 구현하고, 우선순위 기반 정렬과 제외 사유를 추가. 단위가 다른 급여나 직접 입력 미매핑을 임의 통과시키지 않음.
6. 실DB의 양쪽 입력→후보 설명→버전 변경/중복/동시 정원 검증. 추천 결과를 기존 상호 승인·확정 절차와 분리해 연결. 학습/새 부가기능은 MVP 이후 별도 결정.

## 이번 작업 파일과 실행

수정: `server/access.js`, `server/index.js`, `web/index.html`, `web/worker-registration.html`, `tests/ui/worker-postgres.test.cjs`, `tests/ui/worker-alpha.test.cjs`, `tests/ui/registration-entry.test.cjs`.
추가: `tests/ui/persistent-session.test.cjs`, 이 문서 및 검증 로그 폴더. 이 목록은 작업 시작 전부터 있던 다수 미커밋 파일 목록과 구분한다.

실DB 미리보기: http://127.0.0.1:8048/ · 장비작업자: http://127.0.0.1:8048/?entry=equipment#auth

8048만 새 코드로 재시작했고 8047은 유지했다. Postgres.app을 Running으로 유지한다. 재시작은 프로젝트에서 Node 22의 `node --env-file=.env.local server/index.js`. 테스트용 8049는 검사 후 종료한다.

회귀 실행은 `NODE_TEST_DATABASE=1`과 폐기용 DB URL로 `node scripts/test.mjs`. 브라우저 지속 검사는 `DATABASE_URL`을 위 미리보기 DB로 지정하고 `NODE_BROWSER_MODULE`에 Playwright 경로를 설정해 `node tests/ui/persistent-session.test.cjs`를 실행한다. 이 검사는 8049 포트를 사용하고 합성 계정·만료 세션을 추가하므로 미리보기 DB 외 다른 DB에서는 실행을 거부한다.
