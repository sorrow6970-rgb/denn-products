# Codex ↔ Claude Code 작업 전달 규칙

이 폴더는 사용자, Codex, Claude Code 사이의 작업 지시와 검증 결과를 전달하기 위한 공간이다.

## 역할

- 사용자: 우선순위와 제품 의사결정, 실제 기기 검증
- Codex: 읽기 전용 분석, 원인 진단, 작업 방향과 완료 조건 작성, 구현 결과 검증
- Claude Code: 코드 수정, 테스트, 커밋, 푸시, 미리보기 및 운영 배포

Codex는 사용자가 별도로 명시하지 않는 한 애플리케이션 코드, 설정, 배포 상태, 운영 데이터를 변경하지 않는다. 이 전달 폴더의 문서 작성·갱신만 예외로 허용된다.

## Claude Code가 작업 전에 읽을 순서

1. 이 `README.md`
2. `CURRENT.md`
3. `instructions/`에서 `CURRENT.md`가 가리키는 작업지시서
4. 필요할 때 `reviews/`의 최신 검증서
5. `decisions/`의 확정 결정서

## 디렉터리 용도

- `instructions/`: Codex가 작성한 구현 지시서
- `reviews/`: Claude Code 커밋에 대한 Codex 검증 결과
- `decisions/`: 사용자와 합의해 확정한 구조적 결정

확정 결정서 중 모바일 UI를 다루는 작업은 `decisions/2026-07-21-mobile-responsive-contract.md`를 필수로 적용한다.
데이터 모델·저장·마이그레이션 작업은 `decisions/2026-07-21-data-compatibility-and-migration.md`를 필수로 적용한다.
배포·Preview·운영 전환 작업은 `decisions/2026-07-21-deployment-cutover-and-rollback.md`를 필수로 적용한다.
인증·고객 데이터·업로드·Firebase Rules 작업은 `decisions/2026-07-21-security-and-privacy.md`를 필수로 적용한다.
모든 코드 병합·Preview·배포 작업은 `decisions/2026-07-21-quality-gates.md`를 필수로 적용한다.
오류 처리·로그·운영 진단 작업은 `decisions/2026-07-21-error-logging-observability.md`를 필수로 적용한다.
번들·이미지·Canvas·저장소·성능 작업은 `decisions/2026-07-21-performance-and-resource-budgets.md`를 필수로 적용한다.
모든 UI·Canvas 조작·폼 작업은 `decisions/2026-07-21-accessibility.md`를 필수로 적용한다.
스캐폴드·패키지 설치·업데이트 작업은 `decisions/2026-07-21-dependency-and-technology-policy.md`를 필수로 적용한다.
PC 변경·세션 종료·작업 재개에는 `decisions/2026-07-21-cross-device-handoff-and-resume.md`를 필수로 적용한다. 사용자가 “이어가자”라고 하면 구현 전에 재개 점검부터 수행한다.

## 작업 원칙

1. 한 작업은 한 가지 목적만 다룬다.
2. 기존 운영본에는 데이터 손실, 보안, 서비스 차단 문제 외의 대규모 정리를 하지 않는다.
3. 원인이 증명되지 않은 보정 패치를 추가하지 않는다.
4. 변경 전 롤백 기준과 데이터 호환 조건을 확인한다.
5. Claude Code는 작업 완료 후 커밋 해시, 변경 요약, 수행한 테스트, 남은 위험을 사용자에게 보고한다.
6. Codex의 검증 판정은 `승인 가능`, `수정 후 재검증`, `재설계 필요` 중 하나로 기록한다.

## 파일 작성 규칙

- 작업지시서: `instructions/YYYY-MM-DD-NNN-short-title.md`
- 검증서: `reviews/YYYY-MM-DD-<commit-short-hash>.md`
- 결정서: `decisions/YYYY-MM-DD-short-title.md`
- 현재 작업 포인터: `CURRENT.md`

문서가 코드보다 우선한다는 의미는 아니다. 실제 저장소 상태와 커밋 diff가 문서와 다르면 Claude Code는 작업을 중단하고 사용자에게 차이를 보고해야 한다.
