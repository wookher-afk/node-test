# 기술 및 일반작업자 직종 등록 — 2026-11-01

검토 화면: http://127.0.0.1:8048/register/technical

## 구현

- 업체가 사용하는 `ui/03-2/occupations.js`를 직접 가져온다. 대분류 13개, 중분류 31개, 소분류 179개, 동일한 `NODE-JO` ID와 `draft-2026-11-01-1` 버전을 사용한다. 데이터 복제나 이름 기반 변환은 없다.
- 대분류 → 중분류 탐색, 소분류 체크박스 복수 선택, 현재 중분류 전체 선택/해제, 분류 이동 시 선택 유지, 선택 개수/목록 요약, 개별 해제 및 전체 해제를 제공한다. 직종마다 추가 버튼을 누를 필요가 없다.
- 화면에 검토용 초안 및 추후 수정 가능을 명시한다. 기술/일반 직종을 임의로 양분하거나 분류를 확정하지 않는다.
- 로그인하지 않은 경우 로그인/회원가입 링크를 제공한다. 계정의 정보수정 → 작업자 등록 정보수정 → 기술 및 일반작업자로 다시 접근할 수 있다.

## API / 저장 계약

`GET/PUT /api/me/technical-registration`은 로그인한 계정만 읽고 수정한다. 저장 성공 시 기존 계정 역할 `worker`를 부여한다. 작업자 유형은 기술 문서의 `workerType: technical_worker`로 기록한다.

```json
{"version":1,"document":{"workerType":"technical_worker","occupationCatalogVersion":"draft-2026-11-01-1","occupationIds":["NODE-JO-0001","NODE-JO-0011"]}}
```

기존 `worker_alpha_registrations.document.technicalRegistration`에 별도로 저장한다. 기술 등록만 있는 계정은 기존 테이블 제약을 만족하도록 빈 `roles/abilities/ownedEquipment` 배열을 보관한다. 장비 API는 이 경우 `document:null`과 실제 저장 버전을 반환하여 장비 등록을 새로 시작할 수 있다.

장비 API 수정은 기술 정보를, 기술 API 수정은 장비 정보 및 희망조건을 보존한다. 하나의 작업자 문서 버전을 공유하므로 다른 창에서 먼저 저장하면 409를 반환하고 새로고침을 안내한다. 클라이언트가 보내는 타 유형 정보를 병합하지 않고 DB에 있는 값을 보존한다. 직종 ID 존재 여부, 중복, 최소 1개/최대 전체 179개, 초안 버전, 작업자 유형, 저장 버전을 서버에서 검증한다.

DB 스키마 변경이나 기존 행 이관은 없다. 공통 분류 변경 시 ID 유지 및 명시적인 버전 이관 정책이 필요하며 이름으로 자동 변환하지 않는다. 실제 직종 기반 매칭 엔진 구현은 이번 범위에 포함하지 않는다. 업체의 `all_per_person` AND 조건에는 변경이 없다.

## 검증

- Node 22.23.4 / 실제 PostgreSQL / 제한된 런타임 역할: 전체 서버 회귀 **140/140 통과**, 실패 및 건너뜀 0. 기존 DB와 별도인 폐기용 `node_test_technical_20261101`에서 수행. [로그](technical-worker-2026-11-01/server-regression.txt)
- 서버 검증은 전체 179개 ID 수용, 잘못된 ID/중복/빈 선택/버전 거부, 기술 문서 60개 저장·수정·재로그인 복원, 타 계정 분리, 미인증 거부, 충돌 거부, 기술→장비 및 장비→기술 순서의 양방향 보존을 포함한다.
- 실제 로컬 DB와 Chrome 390/1440px: 60개 이상 분류 간 선택, 중분류 전체 선택/해제, 체크 상태 복원, 개별/전체 해제, 저장·수정·새로고침·로그아웃/재로그인 복원, 역할 부여 및 오류 거부 통과. 페이지 오류·가로 넘침 없음. [로그](technical-worker-2026-11-01/ui-real-db.txt)
- 기존 업체 그룹 AND 및 장비 모집 2종의 390/1440px 회귀 통과. [로그](technical-worker-2026-11-01/company-ui-regression.txt)
- 기존 장비작업자의 운전능력/소유장비/희망조건 저장·수정·재로그인 390/1440px 회귀 통과. [로그](technical-worker-2026-11-01/equipment-ui-regression.txt)
- 화면 이미지 직접 확인: [390px](technical-worker-2026-11-01/edited-390.png), [1440px](technical-worker-2026-11-01/edited-1440.png), [다수 선택 390px](technical-worker-2026-11-01/selected-390.png), [다수 선택 1440px](technical-worker-2026-11-01/selected-1440.png). 실제 모바일 기기 및 다른 브라우저는 검증하지 않았다.
- 작업자 유형 진입 경로와 로그인 상태 전환 320/390/1440px 회귀 통과. [로그](technical-worker-2026-11-01/entry-ui-regression.txt)
- 구문 검사 및 `git diff --check` 통과.

## 보존

작업 시작 시 로컬 DB 전체 테이블의 기존 행 해시를 읽기 전용으로 기록하고 작업 후 대조했다. **57개 테이블의 기존 259개 행 해시가 모두 일치했다.** 결과는 [DB 보존 로그](technical-worker-2026-11-01/db-preservation.txt)에 기록했다. 브라우저 테스트가 만든 합성 계정·등록·세션만 추가되며 기존 행은 변경하지 않는다.

기존 미커밋 소스 변경은 초기화하거나 되돌리지 않았다. 로컬 검증 서버를 변경 코드로 재시작했다. 커밋·푸시·배포·병합은 하지 않았다.
