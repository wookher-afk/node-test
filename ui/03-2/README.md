# NODE 03-2 개발 검토

기준: develop/node-0.1-foundation @ 411ee87288791c613ee85623f7157029505f854b
작업 브랜치: feature/node-03-2-equipment

## 실행

저장소 폴더에서 `python3 -m http.server 8032 --bind 127.0.0.1` 실행 후
http://127.0.0.1:8032/ui/03-2/ 접속. 서버를 종료하려면 실행한 터미널에서 Ctrl+C.
서버·DB·배포 설정 변경 없이 동작하는 별도 03-2 페이지이다.

## 구현

자가기사·데모기사 동시 선택, 운전 가능/보유 장비 분리, 대·중·소분류,
장비별 제원 입력, 제조사·모델, 운전능력·경력, 복수 등록, 목록·수정·삭제,
localStorage 자동 임시저장·복원(작성 중 입력 포함).
저장 키는 node_03_2_v1이며 기존 node_worker_v05 데이터에 접근하지 않는다.
삭제·등록 구분 전환 시 확인. 출력은 textContent로 처리한다.

## 미완료와 근거

- 사용자 언급 보고서의 첨부 원문이 현재 대화/작업 폴더에서 제공되지 않았다.
- catalog.js의 장비 종류·숫자 목록은 기존 node_worker_signup_0_5.html E_TYPES/E_SIZES 재사용.
- 분류와 제원 필드 구성은 UI 초안이며 보고서에서 확인한 사실이 아니다.
- 기존 코드의 소형/중형/대형 공통 폴백은 확정 규격으로 승격하지 않았다.
- 형태·옵션은 원문 확보 전 직접 입력만 가능. 보고서 기반 선택 UI는 미완료.
- 현장 규격은 legacy-unverified 또는 사용자 입력으로 표시. 검증 완료 사례는 아직 없음.
- 보고서 확보 후 장비 전체 범위·분류·형태·규격·제원·옵션과 페이지별 출처 대조 필요.
- 이전/다음은 저장 후 이동 검토만 제공한다. 실제 다른 가입 단계 이동은 미연결.
- 실제 회원가입·서버 저장·자동매칭 미연결. 실기기 iPhone 검증은 미실시.

## 검증

Playwright와 Chrome으로 tests/ui/03-2.test.cjs 실행.
예: NODE_BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' NODE_BROWSER_MODULE='<playwright 설치 경로>' node tests/ui/03-2.test.cjs
동시 역할, 연동 분류, 제원, 운전/보유 등록, 수정/삭제, 목록·작성 중 복원,
입력 HTML 비실행, 단계 이동 검토, 1440/390px 가로 넘침 확인 통과.
app.js/catalog.js 문법 검사 통과. 기존 백엔드는 변경하지 않았으며 DB 테스트는 미실행.
