# Retired UUID schema

이 폴더의 UUID 기반 실험 스키마와 SQL은 `database/003_unified_matching.sql`로 통합했습니다.
새 설치와 변경은 **`database/`만** 사용합니다. 삭제된 파일의 원본은 Git 이력에 보존됩니다.

이전 UUID DB의 데이터가 자동 이전되는 것은 아닙니다. 실제 UUID 매칭 데이터가 있다면
별도 복제본에서 계정/업체 ID 대응표와 이력 이전을 설계해야 합니다.
현재 업그레이드는 기존 숫자 ID 계정·작업자·업체·로그인 세션을 그대로 보존합니다.
자세한 절차: [database/README.md](../database/README.md).
