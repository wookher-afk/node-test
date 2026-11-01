# NODE Alpha 0.1 공통 분류표·매칭 필드 호환성 검증

검증일: 2026-10-31 (Asia/Seoul) · 브랜치: `feature/node-alpha-01-worker`

## 판정

**기존 분류표를 다시 만들 이유는 없다. 작업자의 기존 카탈로그 선택·초기화·저장 복원은 통과했다. 그러나 현재 업체 구인/현장 화면에는 같은 선택기가 아직 연결되지 않았고, 업체 API/DB도 작업자와 같은 장비 식별 계약을 사용하지 않는다. 양쪽 연결 전체는 통과로 판정할 수 없다.**

이는 서로 다른 장비 분류표 두 개가 발견됐다는 뜻이 아니다. 작업자용 기존 원천은 하나이며, 업체 쪽 입력 연결이 미완성이다. 기존 감사의 ‘공통 분류체계 정비’는 **기존 카탈로그 재사용과 저장 경로 연결**로 한정해야 한다. `06W=140W` 같은 별칭/실물 규격 동등성을 가정하거나 새 분류표를 만들지 않았다.

제품 코드·SQL·기존 테스트는 수정하지 않았다. 이번에 추가한 것은 이 보고서와 [검증 스크립트·로그](common-classification-verification-2026-10-31/)뿐이다.

## 실코드 경로

| 단계 | 작업자 | 업체 | 판정 |
|---|---|---|---|
| 화면 진입 | `web/worker-registration.html:4,36` → `/ui/03-2/?alpha=<account_id>` iframe | `web/index.html:14,32`의 `companyForm` → `/api/me/companies`, 업체명만 입력 | 업체 장비·현장·공고 편집 UI 없음 |
| 분류 원천 | `ui/03-2/index.html`이 `catalog.js`, `equipment-schema.js`, `equipment.js`, `cargo.js`, `app.js` 로드 | `web/`에서 같은 선택기를 사용하는 업체 흐름 없음 | 두 UI의 동일 원천 사용은 미충족 |
| 선택 | `app.js:18–20`의 major/middle/kind 필터, `sizeChoices`, `optionChecks` | 내부 구인 API는 `occupation_id` 입력 | 업체는 5단계 선택값을 받지 않음 |
| 내보내기 | `NODE_ALPHA_EXPORT()` → `records`를 ability/owned로 분리 | 현장 `region_id`, 공고 `lines[]` 별도 계약 | 능력/소유와 구인 자원유형은 별도 의미 |
| API | `PUT/GET /api/me/worker-registration`, `{version,document}` | `POST /api/companies/:id/worksites`, `POST /api/worksites/:id/job-posts`, `GET /api/job-posts/:id` | 장비 계약 연결 누락 |
| DB 쓰기 | `server/worker-registration.js:35–39` → `worker_alpha_registrations.document` JSONB | `server/worksites.js:104` → `worksites`; `server/job-posts.js:92–99` → `job_lines`, `job_post_version_lines`, `job_line_dates`, `job_post_version_dates` | JSONB와 FK 간 매핑 없음 |
| DB 읽기 | document 원문 반환 → 계정별 localStorage 초안 → iframe 복원 | `readPost()`가 occupation FK·일급·날짜 반환 | 업체 응답에 종류/형태/규격/옵션 없음 |

### 현재 실제 식별값

원천 `ui/03-2/catalog.js`에는 **31개 종류, 중복 없는 문자열 kind ID 31개**, `NODE_CATALOG.version=2`, 이전 숫자 인덱스용 `legacyIdMap`과 `migrateEntry()`가 있다. 이 이전 숫자는 `occupations.id`에 대한 대응표가 아니다.

| 개념 | 실제 작업자 저장값 예 | 안정성/제약 |
|---|---|---|
| 대분류 | `major: "토공·기초"` | 표시 문자열을 값으로 사용; 별도 코드 없음 |
| 중분류 | `middle: "굴착"` | 표시 문자열; 같은 중분류명도 부모와 함께 해석해야 함 |
| 소분류 | `kind: "excavator"` | 기존 문자열 ID 사용; 이번 실행에서 31개 유일성 확인 |
| 형태 | `form: "타이어식 (W)"` | 5단계 설명 외에 실제 입력/저장 경로에 존재하는 종속 선택 |
| 현장규격 | `size: "06W"`, 직접 입력이면 `size:"직접 입력", custom:<원문>` | 종류+형태에 종속된 문자열; 규격 하나당 record 하나 |
| 옵션 | `optionSelections:["브레이커","집게"]`, `options:<자유입력>` | 다중 선택 원문; 별도 불변 option ID 없음 |
| 레코드 ID | `abilities[].id` | 작업자 개별 능력/소유 레코드 식별자. 장비 분류 ID나 occupation FK가 아님 |
| 버전 | 카탈로그 `version:2`, 초안 `version:2,aRevision:1`, API 저장 `version` | 서로 다른 버전 의미. 저장 문서에 명시적인 catalogVersion 필드는 없음 |

업체의 `occupations`는 `id bigint → category_id bigint → occupation_categories`인 직종 2단계 테이블이다(`database/001_foundation.sql:8–9`). `job_lines.occupation_id`와 작업자 `kind` 사이 FK/대응표/서버 변환은 없다. 기존 `equipment.kind`, `equipment.grade`, `equipment_options.option_code` 테이블이 있다는 것만으로 Alpha JSON이 여기에 연결되는 것은 아니다.

### 초기화·다중 선택·별칭 검사

- **통과 — 실제 Chrome 390/1440px:** 굴착기/타이어식/06W/브레이커+집게를 선택한 뒤 중분류 변경 → 종류·형태·규격·옵션·별칭 초기화. 대분류 변경 → 중분류 이하 초기화. 형태 변경 → 규격·옵션 초기화.
- **통과 — 실제 Chrome → HTTP → PostgreSQL → HTTP → 새로고침:** `kind`, 부모 분류, 형태, `06W`, 옵션 두 개, 사용자 별칭, 경력 등 전체 장비 레코드가 깊은 비교로 일치했다. 별칭 `감사 별칭 140W`를 넣어도 `size:"06W"`는 그대로였다.
- **통과 — DB 미사용 UI 회귀:** 31종 전체 형태·규격 후보, 여러 규격을 개별 record로 저장, 수정 시 ID 유지, 형태 변경 초기화, 이전 원문·사라진 옵션 보존. 기존 카탈로그를 변경할 근거 없음.
- `catalog.js:40,74,101`에서 `06W`는 굴착기 검색 별칭이면서 타이어식의 규격 후보이다. 검색 별칭은 **종류 검색**용이며 `app.js:101`은 종류를 선택할 뿐 규격/모델을 확정하지 않는다. `140W`와의 자동 동등성 표는 없다.
- 기존 입력의 알려지지 않은 옵션/규격을 복원 시 ‘이전 입력’으로 보존하는 경로는 의도된 무손실 동작이다. 신규 잘못된 입력을 받는 서버 검증 공백과 구분해야 한다.

## 실DB 현황과 검증 범위

미리보기 `node_alpha_01_local`, PostgreSQL **17.11**에 읽기 전용 repeatable-read 트랜잭션으로 연결했다. 사용자 이메일·비밀번호·세션 토큰·등록 원문은 로그로 출력하지 않았다.

| 실DB 현황 | 건수 |
|---|---:|
| `worker_alpha_registrations` | 6문서 / 장비 레코드 12개 |
| 알려지지 않은 kind / 저장된 부모 불일치 | 0 / 0 |
| `worker_profiles` | 1 |
| `occupation_categories`, `occupations`, `regions` | 각 0 |
| `worksites`, `job_lines`, `job_line_dates` | 각 0 |
| `worker_preference_versions`, `worker_preference_occupations`, `worker_preference_regions`, `hiring_condition_versions` | 각 0 |
| `equipment`, `equipment_options` | 각 0 |

기존 데이터에서 서로 비교할 업체 공고가 없으므로 **기존 업체·작업자 간 동일 항목 매칭 성공을 주장하지 않는다.** 업체 계약 검증용 직종·지역은 새 폐기용 DB에서만 명시적으로 생성했다. 합성 직종명 ‘굴착기’를 넣었다고 카탈로그와 자동 대응된 것으로 취급하지 않았다.

새 DB `node_test_classification_20261031_audit`에만 기존 마이그레이션 001–008과 회귀 fixture를 적용했다. 기존 `node_test_alpha_01_20261031`과 미리보기 DB는 재설정하지 않았다. 추가 왕복 검증 서버는 8051이고 완료 후 종료했다. 기존 8047/8048 서버를 재시작·중단하지 않았다.

검증 전후 감사 대상 **14개 테이블의 모든 행 체크섬이 동일**하다. 시작 시 존재하던 **200개 파일의 SHA-256도 모두 동일**하다. 새 DB와 합성 검증 데이터는 재현을 위해 남겨 두었다.

## 문제 목록과 최소 수정안

### 1. 업체 분류 연결 누락 — P1

**정확한 경로:** 작업자 `abilities[].kind/form/size/optionSelections` → Alpha JSONB. 업체 `lines[].occupation_id` → `job_lines.occupation_id` 및 `job_post_version_lines.occupation_id`. 업체 UI는 업체명 등록까지만 존재.

**실제 재현:** 작업자 UI에서 `excavator / 타이어식 (W) / 06W / [브레이커,집게]` 저장은 200이며 DB·조회값 일치. 같은 데이터를 공고 `lines[0]`에 `kind`, `size`, `optionSelections` 중 하나라도 추가하면 **400**. `occupation_id:"excavator"` 역시 **400**이고, 새 DB에 만든 숫자 문자열 occupation FK만 정상 저장/조회됐다.

**최소안:** 기존 `NODE_CATALOG`와 종속 선택 컴포넌트를 업체 입력에서도 재사용한다. 기존 kind ID를 기준으로 업체 요구장비 필드를 추가하고, 직종 FK 유지가 필요하다면 명시적인 대응 관계만 연결한다. 기존 직종 ID를 배열 인덱스·이름 일치로 추정하지 않는다. 기존 record·직종·거래 이력은 재작성하지 않는다. 분류표 재설계는 불필요하다.

### 2. 작업자 서버의 카탈로그 소속 검증 공백 — P1

**정확한 경로:** `server/worker-registration.js:8–11`은 `kind/form` 비어 있지 않음, `size` 문자열, `years` 범위 등만 검사한다. `major/middle`, 종류-형태-규격 관계, 옵션 목록 소속은 검사하지 않는다. 배열을 원문으로 JSONB 저장한다.

**실제 재현:** 새 합성 계정에서 `kind:"invented-kind", major:"운반·차량", middle:"하역", size:"invented-size", optionSelections:["invented-option"], years:""`로 PUT → **200**, DB 원문 일치. 이후 이 합성 계정만 원래 정상 문서로 복구했다. 기존 문서는 변경하지 않았다.

**최소안:** 새 입력에 기존 카탈로그 소속/종속 관계 검증을 적용한다. 기존 알 수 없는 값·사라진 옵션은 원문 보존과 명시적 미확인 상태로 유지해 기존 수정·복원을 깨뜨리지 않도록 한다. 카탈로그 version 2를 활용하며 API 저장 version과 구분한다.

### 3. 지역 계약 불일치 — P1

**경로:** 작업자 `preferences.regions:string[]` → JSONB (`web/worker-registration.html:6,27`, validator:14). 업체 `worksites.region_id` → `regions.id` (`server/worksites.js:77–82,104`). 작업자 저장은 `worker_regions`/`worker_preference_regions`로 투영되지 않는다.

**재현:** 작업자 `['서울','경기 수원시']`는 그대로 저장. 업체 `region_id:'서울'`는 **400**; 합성 `regions.id` 숫자 문자열은 **201**. 미리보기의 실제 `regions`는 0건이다. `서울`/`서울특별시`, 경기 전체/수원시, 전국/직접 입력이 같은 비교 의미라는 계약은 없다.

**최소안:** 기존 지역 테이블/코드를 재사용하는 선택값 연결과 상위지역 포함 여부를 정한다. 원문 문자열을 보존하고 미매핑 상태를 둔다. 주소 문자열만으로 지역을 추정하지 않는다.

### 4. 일정은 날짜 일부 비교 가능, 시간 계약 누락 — P1

**경로:** 작업자 `preferences.availableDates[]`, `startTime`, `endTime` → JSONB. 업체 `lines[].dates[].work_date/capacity`, `allow_partial` → `job_line_dates` 및 버전 스냅샷. 공고 API에는 출퇴근 시간 필드가 없다.

**재현:** 작업자 `['2030-11-01','2030-11-02']`, 업체 `work_date:'2030-11-01'`는 각각 실DB 왕복 통과. 따라서 **명시 날짜는 같은 YYYY-MM-DD 의미로 교집합 비교 가능**하다. 업체 `startTime:'08:00'` 추가는 **400**. 작업자 22:00→06:00은 기존 validator가 허용하지만 저장되는 것은 시각 두 문자열이며, 업체 측 시간·익일 종료·시간대 비교 대상이 없다.

**최소안:** 현재 날짜 배열을 유지하고 업체 근무시간/익일 경계 및 시간대 계약만 추가한다. 부분 가능 일정과 업체 `allow_partial`의 해석을 명시한다. 별도 `worker_preference_versions.available_from/until/preferred_weekdays`는 기간/요일 표현이므로 Alpha 명시 날짜와 자동 동등 취급하지 않는다.

### 5. 급여는 같은 일급만 비교 가능 — P1

**경로:** 작업자 `preferences.minimumPayWon`, `payUnit ∈ day/month/hour` → JSONB. 업체 `lines[].pay.unit`은 `day`만 허용 (`server/job-posts.js:26–28`), `daily_pay_krw`와 공고 버전 `pay_unit:'day'`에 저장.

**재현:** 양쪽 250000원/day 저장 통과. 업체 pay.unit을 hour/month로 바꾸면 **400**. 작업자 UI와 validator는 세 단위를 제공한다(단위 허용은 실코드 확인; 이번 실브라우저 왕복 입력은 day). 공고 bigint 금액은 현재 GET에서 문자열 `"250000"`, 작업자 JSONB는 숫자 `250000`이므로 단순 엄격 동일 비교도 실패한다.

**최소안:** 비교용 내부 경계에서 정확한 금액 타입과 단위를 맞춘다. 우선 동일 day만 비교하고 month/hour는 명시적 비교 불가로 둔다. 월급·시급을 임의 일급으로 환산하지 않는다. 업체 0원 허용/작업자 최소 1원도 현재 제약 차이이므로 0원 의미를 별도로 확정한다.

### 6. 경력의 대상·단위 및 빈 값 표시 — P2

**경로:** 작업자 `abilities[].years`는 장비별 연수 문자열(빈 값 허용), 기존 `months` 원문 보존 경로가 있다. 별도 `/api/me/worker` → `worker_profiles.experience_months`는 전체 경력이다. 업체 `hiring_condition_versions.min_experience_months`는 DB에 있지만 현 공고 API 허용 필드에 없다.

**재현:** 작업자 `years:'3'` 실DB 왕복 통과. 업체 `min_experience_months:36` 추가 → **400**. `years:''`도 실DB에 저장 가능하다. `ui/03-2/app.js:67`은 `r.years||0`으로 렌더링하므로 미기재가 ‘0년’으로 보인다(표시 문제는 실코드 확인; 이번 합성 오류 문서는 UI 렌더링 전에 정상 복구).

**최소안:** 장비별 3년은 해당 장비 기준 36개월로만 해석하고 전체 경력과 구분한다. 빈 값은 unknown으로 유지하고 화면도 ‘미입력’으로 표시한다. 업체 최소 경력 입력/조회와 적용 대상을 연결한다. 기존 연·월 원문은 보존한다.

### 7. Alpha 문서와 기존 비교용 조건 테이블 연결 없음 — P2

작업자 저장은 Alpha JSONB와 worker 역할 추가만 수행한다. 신규 합성 작업자 저장 후 `worker_preference_versions` 건수는 0임을 실DB에서 확인했다. 업체 공고는 007 버전 테이블에 저장되며 004의 `hiring_condition_versions`로 자동 투영되지 않는다. 현재 문서만 보고 004 조건 테이블에 모든 값이 있다고 가정하면 안 된다.

**최소안:** 실제 비교 시 사용할 한 가지 입력/스냅샷 경계를 정한 뒤 필요한 명시적 어댑터만 만든다. 당장 전체 정규화 재작성이나 여러 테이블의 중복 갱신을 추가할 이유는 없다.

## 회귀·증거

| 실행 | 데이터 성격 | 최종 결과 |
|---|---|---|
| `scripts/test.mjs` | 새 실제 PostgreSQL DB, 001–008 설치/보존 검사 및 서버 테스트; worker 단위/mock 8개 포함 | **126/126**, 실패 0 |
| `real-roundtrip.mjs` | 실제 Chrome 390/1440px → 실제 HTTP → 새 실제 PostgreSQL; API 모의 응답 없음 | 종료코드 0, PASS 로그 30줄(폭별 반복·오류 재현 포함) |
| `tests/ui/03-2-multisize.test.cjs` | 로컬 자산 route 공급/브라우저 저장소; DB 없음 | 7개 시나리오 통과 |
| `tests/ui/03-2-flow.test.cjs` | 로컬 자산 route 공급/브라우저 저장소; DB 없음 | 8개 시나리오 통과 |
| `tests/ui/03-2-progressive.test.cjs` | 로컬 자산 route 공급/브라우저 저장소; DB 없음 | 31종 후보 검사 및 320/390/1440px, PASS 4줄 |
| `tests/ui/worker-alpha.test.cjs` | 모의 API | 390/1440px 통과 |
| 기존 파일/실DB 보존, `git diff --check` | 파일 SHA-256, 실DB 읽기 전용 체크섬 | 통과 |

‘30 PASS’는 독립된 30개 테스트 케이스 수나 호환성 문제 해결 건수가 아니다. 일부는 **현재 API의 누락/거부 동작을 재현하는 감사 assertion**이다. 서버 126개도 전부 실DB 시나리오라는 뜻이 아니다.

최초 왕복 검사에서 감사 코드에 불필요한 form 개수 기대값(5, 실제 3)이 있어 실패했다. 제품 문제와 무관한 해당 assertion만 제거하고 두 폭 전체를 재실행해 통과했다. [최초 실패 로그](common-classification-verification-2026-10-31/real-roundtrip-initial-harness-failure.txt)도 보존했다.

증거: [서버 회귀](common-classification-verification-2026-10-31/server-regression.txt), [실브라우저·DB 왕복](common-classification-verification-2026-10-31/real-roundtrip.txt), [미리보기 사전 스냅샷](common-classification-verification-2026-10-31/preview-readonly.json.txt), [사후 스냅샷](common-classification-verification-2026-10-31/preview-readonly-after.json.txt), [파일 보존](common-classification-verification-2026-10-31/file-preservation.json), [DB 보존](common-classification-verification-2026-10-31/db-preservation.txt).

## 다음 최소 개발 단계 — 이번에는 구현하지 않음

1. **기존 분류 원천 재사용:** 업체 입력을 현재 카탈로그·선택 로직에 연결하고 kind/형태/규격/옵션을 API·저장·조회까지 왕복시킨다. 필요한 직종 FK 연결만 명시적으로 추가한다.
2. **공통 경계 검증:** 신규 선택 소속 검증, 기존 미확인 원문 보존, 카탈로그 버전과 개별 문서 버전 구분을 정리한다. 기존 분류표 항목을 바꾸지 않는다.
3. **별도 조건 최소 연결:** 지역 코드, 명시 날짜와 근무시간, 동일 급여 단위, 장비별 최소 경력만 연결한다. 미기재/미매핑/다른 단위는 임의 추론하지 않는다.
4. **양쪽 동일 fixture 회귀:** 같은 기존 카탈로그 항목을 양쪽 UI에서 골라 저장·재조회 값의 의미가 같은지 실DB로 검증한다. 이 완료 전 자동매칭 엔진 구현 단계로 넘어가지 않는다.

이번 범위에 새 분류표, 매칭 엔진, 부가기능, 푸시·배포·병합·커밋은 없다. Safari/Firefox, 운영 환경, 기존 업체 공고의 무손실 연결(현재 미리보기에 0건)은 검증했다고 주장하지 않는다.

## 재현

프로젝트 루트에서 Node 22와 `pg`, Playwright/Chrome을 사용한다. 새 DB 전용 runner는 정확히 `/node_test_classification_20261031_audit`만 허용한다.

```sh
# 기존 미리보기는 읽기만 한다.
DATABASE_URL=postgresql://heowook@127.0.0.1:5432/node_alpha_01_local node docs/common-classification-verification-2026-10-31/preview-readonly.mjs

# 아래 두 명령은 새 폐기용 DB에만 실행. 첫 명령은 해당 DB 스키마를 초기화한다.
NODE_TEST_DATABASE=1 DATABASE_URL=postgresql://heowook@127.0.0.1:5432/node_test_classification_20261031_audit node scripts/test.mjs
NODE_TEST_DATABASE=1 DATABASE_URL=postgresql://heowook@127.0.0.1:5432/node_test_classification_20261031_audit NODE_BROWSER_MODULE=/absolute/path/to/playwright node docs/common-classification-verification-2026-10-31/real-roundtrip.mjs
```

이번 Node 실행 파일: `/private/tmp/node-alpha-pg-verify/node-v22.23.4-darwin-arm64/bin/node`.
이번 Playwright: `/Users/heowook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`.
