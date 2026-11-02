# NODE 04-1 — Alpha 모집항목 → 정식 공고

기준: `backup/node-alpha-20261102` / `9438f4ace5a9987fd3dbb02fdfcb3caad4c10d89`.
사용자가 기존 테이블 확장 마이그레이션 파일 작성까지 승인했다. 운영정책 원문과 기존 DB는 변경하지 않았다.

## 저장 경로

Alpha 업체 등록 화면의 기존 저장 기능은 그대로다. 추가된 ‘저장한 모집조건으로 정식 공고 등록’에서 같은 업체의 기존 활성 현장을 선택한다. 현장 이름·주소가 저장된 Alpha 현장과 다르면 저장을 차단하며 현장을 새로 만들거나 덮어쓰지 않는다.

각 모집항목의 정식 DB 직종, 지급조건(당일/익일/지정일), 부분 일정 허용 여부와 공개 범위를 명시적으로 선택한다. 직종 대응과 지급조건 원문과의 일치를 사용자가 확인해야 한다. 직종 이름이나 자유문 지급조건을 코드가 추정하지 않는다. 복수 직종 그룹은 한 모집항목으로 유지하고 각 인원이 모든 직종을 수행해야 한다는 원문을 보존한다.

기존 `POST /api/worksites/:id/job-posts`에 다음 형식으로 요청한다. 새 공고 저장 서비스/테이블은 없다.

```json
{
  "visibility": "private",
  "alpha": {
    "organization_id": "12",
    "version": 3,
    "choices": [{
      "line_id": "alpha-line-id",
      "occupation_id": "45",
      "occupation_confirmed": true,
      "payment": {"mode": "next_day"},
      "payment_confirmed": true,
      "allow_partial": false
    }]
  }
}
```

원문 문서는 요청에서 받지 않고 인증된 현장 소속 업체의 `company_alpha_registrations`에서 읽는다. 현재 저장 버전 불일치는 409다. 기존 세션·owner/manager·현장 권한 재검사, 공통 트랜잭션, 잠금, 공고 입력 검증, 지급 약속 버전 봉인과 감사 트리거를 재사용한다. `GET /api/worksites/:id/job-post-options`는 같은 관리자 권한으로 존재하는 직종 ID/이름만 제공한다.

## 기존 테이블 확장과 대응

| 원문 | 정식 공고에 저장되는 내용 |
|---|---|
| 일급 정수 원 | `job_lines.daily_pay_krw`, 조건 버전의 `amount_krw` |
| 모집인원 | 모든 명시 작업일의 `capacity` |
| 날짜 목록/기간 | `job_line_dates`, 조건 버전 날짜 (양 끝·윤일 포함) |
| 사용자 확인 지급조건 | 기존 `payment_mode`, `specified_due_date`, 날짜별 `payment_due_date` |
| 명시적으로 선택한 직종·모집 유형 | 기존 `occupation_id`, `resource_mode` |
| 규격·옵션·경력·근무시간·지역·필수조건·지급 원문·기타 조건·복수 직종 | `job_lines.alpha_conditions`와 `job_post_version_lines.alpha_conditions`에 모집항목 전체를 동일하게 저장 |
| 원문 문서·등록 버전 | 기존 `job_post_versions.alpha_source`에 불변 스냅샷 보존 |

`010_alpha_job_posts.sql`은 기존 4개 테이블에 nullable 컬럼과 봉인 검사를 추가한다. 별도 저장 체계, 기존 행의 조건 추정/역채움, 기존 행 UPDATE는 없다. 기존 봉인·append-only·감사 이력을 유지한다. 반환값은 기존 공고 ID/버전/지급 약속 버전에 Alpha 원본 버전과 모집항목 조건을 추가한다. 업체 연락처를 포함한 원문 전체는 API로 반환하지 않는다.

동일 업체의 동일 Alpha 저장 버전은 공고 한 개로 연결한다. 공통 잠금과 DB UNIQUE 제약으로 동시 요청/응답 유실 후 재시도도 중복 생성하지 않는다. 같은 입력 재시도는 기존 공고를 200으로 반환하며, 다른 현장·선택값·공개 범위로 재요청하면 409다. 공고 등록 실패는 공고·항목·날짜·조건 버전·감사 이력을 모두 롤백한다. Alpha 저장 버전이 바뀌어도 기존 공고를 자동 수정하거나 삭제하지 않는다.

## 차단 및 범위

- 월급, 상시 모집, 선택형(either) 모집, 누락/중복된 항목 확인, 없는 직종 ID, 잘못된 지급일, 미확인 지급/직종 대응, 알 수 없는 추가 필드는 구체적인 오류로 공고 저장을 차단한다. Alpha 자체 등록은 유지한다.
- 자유문 지급조건이 당일·익일·지정일로 정확히 표현되지 않으면 등록하지 않아야 한다. ‘매월 10일’ 등을 단일 날짜로 자동 해석하지 않는다.
- 직종 대응은 사용자의 명시적 선택이며 공식 카탈로그 대응표가 확정된 것으로 표시하지 않는다. 부분 일정 허용 여부도 기본값을 추정하지 않는다.
- 지원/추천 엔진/양측 승인 변경, 공고 수정·마감, 운영 배포는 범위 밖이다. 조건 보존은 후속 추천/승인 기능이 그 조건을 이미 소비·집행한다는 뜻이 아니다.

## 마이그레이션·권한 적용

기존/운영 DB에는 010을 적용하지 않았다. 배포 시 009 다음 010이 필요하다. 별도 공고 런타임 역할을 쓰면 기존 권한 외에 `company_alpha_registrations` SELECT, occupations.name SELECT, job_posts의 원본 연결 컬럼 INSERT, job_lines.alpha_conditions INSERT, job_post_versions.alpha_source INSERT가 필요하다. 기존 버전 테이블의 전체 INSERT/SELECT 권한은 신규 컬럼에도 적용된다. 실제 운영 역할은 추정하거나 수정하지 않았다. 테스트 전용 역할 준비 함수만 갱신했다.

## 검증

설치 없이 기존 Node v26.13.0/PostgreSQL과 기존 Chrome/Playwright를 사용했다. 프로젝트 권장 Node 22에서의 재검증은 수행하지 않았다.

- 단위/기존 Alpha 검증: `node --test tests/alpha-job-post-input.test.js tests/company-registration.test.js` — **12/12**.
- 새 임시 DB에만 001~010 적용 후 신규 HTTP·SQL·모바일 브라우저 및 기존 공고/Alpha 등록 회귀: `node scripts/verify-alpha-job-posts.mjs` — **29/29**.
- 실제 정식 테이블·봉인 버전에 금액/인원/날짜/규격/옵션/필수조건이 동일하게 저장됨을 확인.
- 동시 이중 요청, 같은 요청 재시도, 변경 조건 충돌, 무권한/타업체/오래된 버전, 미지원 조건 차단, 날짜 버전 INSERT 강제 오류 후 전체 롤백 및 재시도 확인.
- 390px 브라우저에서 현장/조건 선택→정식 저장→재시도→기존 Alpha 등록 재저장 확인. 브라우저 오류 없음.
- 종료 시 새 임시 DB와 세 역할을 삭제했고 기존 DB/역할 메타데이터 전후 일치 확인. 기존 DB 데이터에 쓰기/마이그레이션은 하지 않았다.
- `git diff --check` 및 변경 JavaScript 구문 검사 통과. 전체 테스트·병합·배포는 하지 않았다.

실행 시 기존 관리자 연결은 `DATABASE_URL` 또는 `NODE_04_1_ADMIN_ENV`로 전달한다. 브라우저 모듈을 재설치하지 않고 `NODE_BROWSER_MODULE`로 기존 모듈 경로를 지정할 수 있다. 이 검증 스크립트는 기존 DB 초기화 명령을 호출하지 않는다.
