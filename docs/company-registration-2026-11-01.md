# 업체 등록 기능 완성 · 검증 보고 — 2026-11-01

작업공간: `/Users/heowook/Documents/ChatGPT/Node/node-alpha-01`  
저장소: `wookher-afk/node-test` · 브랜치: `feature/node-alpha-01-worker`  
미리보기: http://127.0.0.1:8048/company-registration

## 구현 결과

업체 기본정보 → 현장정보 → 모집조건의 3단계 화면을 실DB 서비스에 추가했다. 기존 회원가입의 업체 분기와 정보수정 화면에서 진입한다. 업체가 여러 개이면 대표 권한이 있는 업체를 선택해 등록·수정한다. 기존 업체명만 등록된 업체도 등록 정보를 채울 수 있다.

- 기본정보: 업체명, 담당자, 연락처, 선택 사항인 업체 소재지·사업자등록번호·작업 분야.
- 현장정보: 현장명·주소, 필요 자격·장비 조건, 식사·숙소 제공 여부.
- 복수 모집: 기존 대/중/소분류 → 형태 → 현장규격 → 복수 옵션. `NODE_CATALOG.version=2`의 기존 31종 원천을 그대로 읽으며 새 분류표·직종 대응표를 만들지 않았다. 부모 변경 시 종속 선택을 초기화한다. 각 항목은 고유 ID를 유지한 채 수정·삭제할 수 있다.
- 모집조건: 기사/장비+기사/모두 가능, 장비별 최소 경력(개월), 작업 난이도·범위, 지역 코드, 상시/특정 날짜/기간, 출퇴근 시간과 익일 종료, 일급/월급, 지급일·지급조건, 지급 방식, 거래 조건, 기타 지급·계약 조건. **모집 인원은 각 항목의 마지막 입력이다.**
- 급여: 작업자와 동일한 `money.js`로 `20 → 20만원 → 200000원`, 월급 `350 → 3500000원`. 최대 소수점 4자리로 기존 원 단위 정밀도를 보존한다.
- 항목을 추가/수정 완료한 뒤 전체 서버 저장한다. 저장하지 않은 편집 중 항목이 있으면 전체 저장을 막는다. 등록된 항목이 있으면 입력기를 접어 모바일에서 목록·저장 버튼을 먼저 확인할 수 있다.

기존 업체 프로토타입과 브라우저 임시저장 키는 수정하거나 변환하지 않았다. 기존 작업자 화면·검증기·카탈로그·인증·세션 구현도 그대로 유지했다.

## API·DB 저장 경계

`GET /api/companies/:id/registration`은 `{document,version}`을 반환한다. 미등록 업체는 `{document:null,version:0}`이다. `PUT`은 같은 형태로 최초 등록과 이후 전체 수정을 처리한다. 기존 `POST /api/me/companies`로 업체를 생성하며 상세 저장과는 별도 요청이다.

009 마이그레이션은 업체 FK를 가진 `company_alpha_registrations` 하나만 추가한다. JSONB 문서에 `company`, `worksite`, `catalogVersion:2`, `lines[]`를 저장한다. `lines[].conditions`는 작업자와 같은 지역·시간·일정·원 단위 급여 계약이다. `minimumPayWon` 필드명은 공통 계약을 재사용한 것이며 **업체에서는 제시 급여**를 의미한다. 과거 `occupation_id`와 문자열 kind ID를 추정 연결하지 않는다.

업체 소속 계정만 조회할 수 있고 대표만 수정한다. 다른 계정의 업체는 404, 비대표 수정은 403, 미인증/만료 세션은 401이다. 본문 검증 후 업체 단위 잠금을 잡고 세션과 대표 권한을 재확인한다. 버전 조건부 쓰기로 충돌은 409이며 이전 문서를 보존한다. 업체명과 상세 문서는 같은 트랜잭션으로 수정한다. 분류 ID·부모·형태·현장규격·옵션의 소속, 중복 옵션·ID, 인원·경력·급여·지역·일정을 서버가 검사한다. 직접 입력 형태·규격은 별도 원문으로 받고 자동 동등성은 추정하지 않는다.

**저장 경계는 작업자 008과 같은 Alpha 등록 문서이다.** 기존 006 현장·007 내부 공고 API 및 과거 공고/거래/지급 약정은 보존하며 자동으로 이 문서에 가져오거나 이 문서를 해당 거래 테이블에 중복 투영하지 않는다. 기존 내부 공고 API의 일급 전용 계약도 유지한다. 이번 업체 화면의 일급·월급은 새 등록 API를 통해 실DB에 저장된다. 현재 미리보기에는 원래 현장/공고 행이 없어 과거 공고의 자동 연결을 검증했다고 주장하지 않는다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| 별도 PostgreSQL 서버 전체 회귀 | **135/135 통과**, 실패/건너뜀 0. 기존 131개 + 업체 단위 3개·실DB 통합 1개 |
| Chrome 390px·1440px → 실제 HTTP → 미리보기 PostgreSQL | 단계 이동·필수 입력, 분류 부모 변경 초기화, 복수 모집, 일급/월급, 20만원→200000원, 야간/기간/특정 날짜, 지급·거래 필드, 저장·수정·새로고침·로그아웃/재로그인 복원 통과 |
| 실DB 업체 통합 | 계정 격리·대표 권한·잘못된 분류 거부·충돌 후 이전 값 유지·역할 공존·서버 재시작 후 복원 통과 |
| 기존 작업자 실제 Chrome 회귀 | 390/1440px 능력·소유·지역·급여·일정 저장·수정·재로그인·복수 역할 통과 |
| 기존 진입 화면 회귀 | 320/390/1440px 첫 화면·회원가입 분기·세션 오류/만료·복수 역할 통과 |
| 기존 실DB 보존 | 작업 시작 시 **56개 테이블의 131개 기존 행 전체 해시 동일**. 새 합성 검증 계정·등록 문서만 추가 |
| 기존 파일 보존 | 시작 시 파일 SHA-256과 비교. 아래 명시한 기존 파일 6개만 이번 작업으로 수정; 나머지 기존 파일은 모두 동일 |
| 정적 확인·화면 확인 | 새 JS 구문 검사·`git diff --check`, Chrome 양쪽 폭 가로 넘침 없음·페이지 오류 없음, 캡처 시각 검토 |

서버 회귀는 `node_test_company_20261101`에만 초기화/마이그레이션을 실행했다. 미리보기 `node_alpha_01_local`에는 기존 데이터 스냅샷 후 **009만 한 번 추가 적용**했다. 8048 로컬 서버는 코드 반영을 위해 재시작했고 기존 세션·데이터는 유지했다. 미리보기는 기존과 같은 로컬 관리자 DB 연결이며, 별도 회귀에서는 제한된 런타임 역할로 HTTP를 검증했다. 운영 배포용 권한 설치는 하지 않았다.

처음 실DB 통합에서 membership `FOR SHARE`에 필요한 DB 권한이 없어 실패했다. 회원 테이블 권한을 늘리는 대신 업체 행 잠금과 잠금 이후 세션·소속 재확인으로 수정한 후 전체 회귀를 재실행했다. 테스트 항목을 다른 테스트 파일에서 가져오며 생긴 중복 실행도 fixture 분리로 제거했다. 위 135는 최종 중복 없는 테스트 수다.

### 양쪽 필드 비교

두 폭에서 만든 같은 합성 계정의 작업자·업체 등록 문서를 PostgreSQL에서 직접 읽어 비교했다. API 모의 응답을 사용하지 않았다.

| 비교 필드 | 실제 확인 | 해석의 한계 |
|---|---|---|
| 분류/규격/옵션 | `excavator`, 토공·기초/굴착, 타이어식 (W), `06W`, 브레이커+집게 일치 | `140W` 같은 별칭을 `06W`와 자동 동일 취급하지 않음 |
| 지역 | `kr-lawd-2026-10-01`, `11110`, 서울특별시 종로구 일치 | 전체/하위지역 포함 판단·미확인 과거 원문의 추론은 매칭 구현 대상 |
| 시간 | `22:00 → 06:00` 일치, Asia/Seoul 익일 종료 의미 | 현재 고정 한국 시간 계약; 타임존별 변환 엔진 없음 |
| 일정 | 기간 `2026-11-02~30` 및 특정 날짜의 YYYY-MM-DD 저장 확인 | 상시/기간/날짜의 실제 매칭 판정은 구현하지 않음 |
| 급여 | 같은 단위 정수 원 값 일치. 최초 200000원, 수정 210000원, 두 번째 월급 3500000원 | 일급↔월급 환산 없음 |
| 경력 | 해당 장비의 작업자 `years:'3'` ↔ 업체 `minExperienceMonths:36` | 전체 경력과 혼용 안 함. 작업자 미기재 경력은 0으로 추정하지 않음 |

이 검사는 비교 가능한 입력 계약의 왕복 확인이며 자동매칭 성공 검사가 아니다.

## 이번 변경 파일

기존 파일에 더한 변경:
- `web/index.html`: 상세 업체 등록 링크·업체 회원가입 후 진입.
- `server/index.js`: 업체 화면·API 연결 및 해당 본문 크기 제한.
- `scripts/lib/test-runtime-role.mjs`: 로컬 테스트 역할에 신규 문서 권한·업체명 수정 열 권한.
- `scripts/test.mjs`: 009 설치·신규 업체 테스트를 기존 회귀에 추가.
- `package.json`: 새 서버 모듈 구문 검사.
- `database/README.md`: 009 설명.

신규 제품 파일: `web/company-registration.html`, `ui/03-2/company-registration.js`, `server/company-registration.js`, `database/009_company_alpha_registration.sql`.

신규 검증 파일: `tests/company-registration.test.js`, `tests/company-registration.integration.test.js`, `tests/helpers/company-fixture.js`, `tests/ui/company-postgres.test.cjs`, 이 보고서와 [검증 증거 폴더](company-registration-2026-11-01/).

작업 시작 전부터 존재한 미커밋 변경은 유지했다. 작업자·업체 프로토타입, 카탈로그, 기존 API/테스트를 이번 신규 구현으로 덮어쓰지 않았다. 기존 작업자 실브라우저 스크립트를 재사용했고 해당 스크립트가 다시 생성한 기존 캡처들도 시작 시 해시와 동일함을 확인했다.

## 남은 제약

- 한 업체의 Alpha 문서는 현재 현장 하나와 그 현장의 복수 모집항목을 보관한다. 기존 다중 현장·내부 공고 시스템과의 자동 가져오기/투영은 별도 작업이다.
- 새 업체 생성과 상세 등록은 두 요청이다. 상세 저장이 실패하면 생성된 업체는 이름만 있는 상태로 남고 같은 업체를 선택해 재저장할 수 있다.
- 프로토타입 임시저장 및 과거 직종 FK를 자동 이관하지 않는다. 기존 카탈로그의 직접 입력·미확인 원문은 자동으로 동등한 규격으로 판단하지 않는다. 작업자의 과거 느슨한 분류 검증 계약을 이번 업체 범위에서 변경하지 않았다.
- 사업자번호 확인·연락처 본인 확인, 문서 첨부, 실제 지급 의무/지급 이력은 구현 범위 밖이다. 선택 정보와 지급조건을 등록·복원하는 기능이다.
- 실제 iOS/Android 기기·Safari/Firefox, 운영 환경은 미검증이다.

자동매칭 엔진·알림·수락 및 기타 부가기능, 원격 푸시·배포·병합·커밋은 수행하지 않았다.

## 증거와 재현

- [서버 회귀](company-registration-2026-11-01/server-regression.txt)
- [업체 Chrome 실DB 왕복](company-registration-2026-11-01/ui-real-db.txt)
- [작업자 Chrome 회귀](company-registration-2026-11-01/worker-ui-regression.txt)
- [첫 화면 회귀](company-registration-2026-11-01/entry-ui-regression.txt)
- [DB 필드 비교](company-registration-2026-11-01/field-comparison.txt)
- [기존 DB 보존](company-registration-2026-11-01/db-preservation.txt)
- [기존 파일 보존](company-registration-2026-11-01/file-preservation.json)
- [모바일 복원 화면](company-registration-2026-11-01/restored-390.png) · [데스크톱 복원 화면](company-registration-2026-11-01/restored-1440.png)

Node 22: `/private/tmp/node-alpha-pg-verify/node-v22.23.4-darwin-arm64/bin/node`. Playwright는 `NODE_BROWSER_MODULE`로 기존 로컬 모듈 경로를 지정했다.

```sh
# 이 명령은 반드시 별도 폐기용 DB에서만 실행한다.
NODE_TEST_DATABASE=1 DATABASE_URL=postgresql://heowook@127.0.0.1:5432/node_test_company_20261101 node scripts/test.mjs
NODE_BROWSER_MODULE=/Users/heowook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/ui/company-postgres.test.cjs
node docs/company-registration-2026-11-01/compare-fields.mjs
node docs/company-registration-2026-11-01/db-preservation.mjs
```
