# 장비 규격 정확 일치 정책 — 1단계

## 확인한 작업 상태
- 원격: https://github.com/wookher-afk/node-test.git
- 작업본: node-alpha-01, 브랜치 feature/node-alpha-01-worker
- HEAD: a286844 (Preserve approved 03-2 equipment registration and verification)
- 별도 node-test 작업본은 feature/node-03-2-equipment이며 자동매칭 모듈이 없다. 현재 자동매칭과 최근 등록 작업이 있는 node-alpha-01에서 수정했다.
- 기존 수정/미추적 파일이 다수 있다. 이 작업에서는 server/auto-matching.js와 tests/auto-matching.test.js에만 코드를 추가하고 이 보고서를 새로 작성했다. 앞의 두 파일은 작업 시작 시부터 미추적 파일이었다.

## 데이터와 기존 동작
현재 Alpha 문서는 worker_alpha_registrations.document의 abilities[]와 company_alpha_registrations.document의 lines[]를 비교한다. kind/form/size와 optionSelections를 사용한다. ownedEquipment를 운전능력으로 대체하지 않는다.
공통 ui/03-2/catalog.js에서 굴착기 미니 규격은 017과 020으로 분리되어 있다. 등록 검증은 카탈로그 문자열을 요구한다. 작업자는 빈 규격을 저장할 수 있지만 업체는 유효한 규격이 필수다. 직접 입력은 자동 동등성 판정 대상이 아니다.
기존 workAbility도 규격을 문자열로 정확 비교했다. 별칭 변환이나 호환 규격 표는 없으며 추가 표준화도 필요하지 않다. 숫자 변환, 접두어 제거, 단위 추정 없이 카탈로그 값을 유지한다.

## 변경
- 장비 모집에 checks.equipmentSpec 필수 검사를 추가했다. 양측 필수조건 선택 여부와 무관하게 적용한다.
- 같은 기종·형태·규격의 기록만 옵션과 경력 비교에 사용한다.
- 미니 017/020 불일치는 fail이며 매칭·추천 대상이 될 수 없다. 누락·직접 입력·유효하지 않은 등록도 매칭을 허용하지 않는다.
- 기술직종 모집에는 장비 규격 검사를 적용하지 않는다.
- 비교 API는 부적합 결과도 진단용으로 반환한다. matched=false와 not_matched 판정은 후보 통과를 의미하지 않는다. 별도 근접 추천 경로는 현재 없다.
- 가격 근접 추천, 일정 조합, 선착순 수락, UI/DB 변경은 구현하지 않았다.

## 검증
실행: node --test tests/auto-matching.test.js tests/required-match.test.js tests/worker-alpha.test.js tests/company-registration.test.js
결과: 44개 통과, 실패/건너뜀 0개. 자동매칭 15개 중 신규 테스트 4개.
신규 검증: 017/020 일치 및 양방향 불일치, 양측 누락/null/빈 값/임의 별칭/직접 입력, 여러 장비에서 옵션·경력 혼합 방지, API 부적합 결과 차단.
DB를 사용하는 전체 통합 테스트나 실제 로그인 HTTP 검증은 실행하지 않았다. 이번 검증은 순수 비교 및 모의 DB 요청 처리기 테스트다.
푸시·배포·병합하지 않았다.
