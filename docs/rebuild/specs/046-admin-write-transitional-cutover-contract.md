# 스펙 046 후보 — admin write 단계적 cutover·rollback 계약

상태: **FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_DEPLOY**

## 입력 결정

- Founder K-1=A: 비용·용량 상한과 관찰 주체 확정 전 운영 write 차단.
- Founder K-3=A: additive transitional Rules → app → 제한 검증 → legacy close 방향.
- 스펙 045: OS temp allowlist Hosting layout 로컬 검증 완료.

## 공식 근거 (확인일 2026-08-18)

- Firebase CLI는 `--only hosting`, `--only storage`, `--only firestore`처럼 서비스를 부분 배포할 수 있다.
  따라서 세 서비스가 하나의 원자적 release라는 근거가 없으며 각 중간 상태를 계약해야 한다.
  [Firebase CLI reference](https://firebase.google.com/docs/cli)
- Rules 배포는 immutable ruleset을 저장하고 서비스가 참조하는 release를 갱신한다.
  [Manage and deploy Firebase Security Rules](https://firebase.google.com/docs/rules/manage-deploy)
- 겹치는 Rules match는 OR로 평가되므로 더 구체적인 match로 상위 허용을 취소할 수 없다.
  [Firebase Security Rules](https://firebase.google.com/docs/rules)
- Hosting의 정적 콘텐츠는 CDN/브라우저 cache 영향을 받으며 HTML freshness는 명시적 cache header로
  관리해야 한다. [Manage cache behavior](https://firebase.google.com/docs/hosting/manage-cache)

공식 문서에서 Storage Rules·Firestore Rules·Hosting release 사이의 cross-service atomic deploy 보장은
확인하지 못했다. **UNCONFIRMED를 안전하다고 간주하지 않는다.**

## 목표 단계

| 단계 | Storage | Firestore | Hosting/admin | 운영 write | 실패 시 안전 상태 |
| --- | --- | --- | --- | --- | --- |
| P0 현재 | legacy write 허용 | 기존 spaces 계약 | legacy + rebuild write-disabled | legacy만 | 현행 유지 |
| P1 Firestore transitional | 현행 | rebuild REC/head 추가, 실제 UID 필수 | 현행 | legacy만 | 새 경로 사용 불가 |
| P2 Storage transitional | legacy 유지 + rebuild create-only | P1 | 현행 | legacy만 | rebuild UI가 없어 새 write 0 |
| P3 app disabled | P2 | P1 | 새 `/admin/`, write flag false | legacy만 | 새 UI에서도 write 0 |
| P4 제한 활성화 | P2 | P1 | 승인 UID용 write-enabled release | C5 canary만 | 실패 즉시 write-disabled release |
| P5 legacy close | final: `admin/**` write false | P1 | 검증된 app | C5만 | actual-write 이후 legacy fallback 금지 |

P1과 P2는 별도 서비스 배포다. 권장 순서는 Firestore 먼저, Storage 다음이다. 반대 순서에서 rebuild
Storage create가 실패하더라도 legacy write가 유지되어야 하지만, 그 실패 상태를 정상 운영으로 간주하지
않는다. P1~P5는 **목표 계약 후보일 뿐 배포 승인이 아니다.**

## 단계별 진입 조건

### P1 이전 STOP

- 실제 운영자 UID 정본 없음.
- 비용/용량 상한, 측정 항목, 관찰 주체, 초과 시 write 차단 주체가 미결정.
- transitional Rules 파일·emulator 회귀 범위가 별도 승인되지 않음.

### P4 이전 STOP

- P1/P2 Rules가 실제 UID로 emulator 재검증되지 않음.
- `/admin/` write-disabled release의 route/cache/auth-only 동작이 배포 후보에서 검증되지 않음.
- 구 legacy UI 접근 통제와 단일 운영자 canary 절차가 미결정.
- actual-write 성공 판정, head 확인, outcome-unknown 대응 담당자가 미결정.

### P5 이전 STOP

- canary의 object·REC·head 일치와 재로그인/새 탭 재읽기가 확인되지 않음.
- legacy와 rebuild 중 어느 쪽이 최신인지 모호한 쓰기가 한 건이라도 존재함.
- actual-write 이후 rollback 절차와 Founder 승인 없음.

## 롤백 계약

- **P4 actual-write 전:** write-disabled Hosting release로 복귀할 수 있다. legacy write는 유지된다.
- **P4 actual-write 후:** Hosting만 legacy 화면으로 되돌리지 않는다. write flag를 끄고 rebuild head/object/REC을
  read-only로 보존한다. legacy로 자동 fallback·write-back·merge하지 않는다.
- **P5 후:** legacy write를 다시 여는 것은 데이터 정본을 되돌리는 단순 rollback이 아니다. head 이후
  변경 처리 방식을 Founder가 별도로 결정하기 전 금지한다.
- 브라우저 cache 때문에 모든 탭이 즉시 같은 release를 실행한다고 단정하지 않는다. write 활성화와 legacy
  close 사이에는 구 탭 탐지/차단 계약이 필요하다.

## 남은 최소 Founder 결정

### L-1 — K-1 수치·관찰 계약

- **A (권장):** 실제 운영 샘플 없이 숫자를 추측하지 않고, 최초 canary 전 측정 가능한 객체 수·총 byte·
  저장 횟수 상한과 일일 확인 담당자를 Founder가 명시한다. 하나라도 없으면 P4 금지.
- B: 상한 없는 누적 비용을 명시적으로 수용한다(K-1=A를 변경하는 새 결정 필요).

### L-2 — dual-window 구 legacy 접근

- **A (권장):** P4는 승인 UID 한 명·새 `/admin/` 한 탭만 사용하고 legacy 저장은 운영 절차로 중지한다.
  서버가 구 탭을 강제로 식별한다는 주장은 하지 않는다.
- B: 별도 durable cutover marker와 Rules 강제를 후속 설계한다(스키마/Rules 확대 승인 필요).

### L-3 — canary와 legacy close 기준

- **A (권장):** 단일 저장 1건 → head/object/REC 일치 → 재로그인 및 새 탭 재읽기 → conflict/outcome-
  unknown 0 확인 후, 별도 Founder 승인으로 P5를 연다.
- B: 여러 운영자/여러 저장 canary(범위와 실패 복구를 별도 정의해야 함).

## 다음 허용 범위 후보

L-1~L-3 결정 후에도 첫 구현은 local-only다. 별도 transitional Storage/Firestore Rules 후보, emulator
전용 사본과 회귀 테스트, cutover manifest validator만 허용할 수 있다. 실제 UID 대신 명확한 합성 UID만
사용하며 실제 `firebase.json`·`.firebaserc`·운영 Rules 배포 파일·앱 write flag는 변경하지 않는다.

## 계속 금지

실제 UID 추측/기록, Firebase 프로젝트·bucket·운영 데이터 접근, Rules/Hosting 배포, 운영 write flag,
actual write, legacy close, 발행, delete/자동 정리, C6/L-4, 신규 의존성, 보호 대상 변경.

## 결론

K-1=A/K-3=A는 방향을 확정했지만 P1 진입 조건도 아직 충족하지 못했다. 현재 상태는
**FOUNDER_DECISION_REQUIRED**이며 L-1~L-3 결정 전 Rules 후보 구현을 시작하지 않는다.
