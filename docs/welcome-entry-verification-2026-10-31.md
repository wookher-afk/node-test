# NODE Alpha 0.1 첫 화면 및 진입 흐름

- 작업 브랜치: feature/node-alpha-01-worker
- 미리보기: http://127.0.0.1:8047/
- 이번 작업 파일: web/index.html, tests/ui/registration-entry.test.cjs, 본 문서.
- 기존 미커밋 파일과 구현을 보존. 서버 인증·역할 정책 및 등록 API 변경 없음. 푸시·배포·병합 없음.

## 동작

비로그인 첫 화면에는 NODE, 지정된 환영 문구, '해당 항목을 선택하세요.', 업체/작업자 선택만 표시한다. 선택 후 로그인/회원가입 화면을 제공한다. 업체 신규 가입은 기존 업체 정보 입력으로, 작업자 신규 가입은 장비작업자/기술 및 일반작업자 선택으로 이어진다. 기존 장비등록 로그인 복귀 URL (?entry=equipment)은 로그인 검증 후 장비등록으로 돌아간다.

메인에는 정보수정과 매칭확인 진입만 제공한다. 정보수정은 기존 계정·작업자·업체 양식을 열고 등록 분기로 연결한다. 매칭확인은 준비 중 문구를 표시한다. 한 계정의 두 역할을 그대로 표시하며 선택한 진입 역할로 계정 역할을 제한하거나 덮어쓰지 않는다.

기존 sessionStorage 토큰을 서버 /api/me에 제출하고 성공한 경우에만 메인을 표시한다. 401이면 토큰을 제거하고 비로그인 화면을 표시한다. 서버 오류에서는 로그인 성공을 표시하지 않으며 확인 실패를 알린다. 장기 토큰 보관·새 인증 체계는 추가하지 않았다.

## 검증

- registration-entry.test.cjs: 320/390/1440px 통과. 문구/노출 버튼/입력창 숨김/회원가입 분기/장비 복귀/유효 세션 복귀/401 만료/500 오류/복수 역할/가로 넘침/브라우저 오류 검사. 인증·세션 응답은 Playwright 모의 응답.
- 03-2-progressive.test.cjs: 320/390/1440px 통과, 31종 장비 후보 및 단계별 입력·초기화·임시저장·편집·삭제.
- 03-2-navigation.test.cjs: 8개 시나리오 통과, 등록 자료 및 기존 자격 자료 보존.
- 03-2-optional.test.cjs: 320/390/1440px 통과, 선택 항목·값·임시저장·편집·동적 필드.
- worker-alpha.test.cjs: 390/1440px 통과, 서버 모의 응답을 통한 복원·순서 변경·저장·충돌·기존 저장소 보존.
- worker-alpha.test.js: 8개 단위 검사 통과.
- git diff --check 통과.
- 실제 /api/me에 형식이 유효한 토큰으로 요청: HTTP 500, PostgreSQL localhost:5432 ECONNREFUSED. 실DB 로그인/세션 검증 및 DB 통합 검사는 미완료. /api/health 성공만으로 DB 연결을 판정하지 않음.

화면 캡처: /private/tmp/node-welcome-320.png, /private/tmp/node-welcome-390.png, /private/tmp/node-welcome-1440.png.
