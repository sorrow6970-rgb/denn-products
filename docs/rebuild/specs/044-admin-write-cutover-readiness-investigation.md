# 스펙 044 후보 — 운영자 C5 write cutover 준비도 조사

상태: **DONE / FOUNDER_K1_A_K2_A_K3_A / DOCUMENT_ONLY / NO_DEPLOY**

## 목표

스펙 043의 production-disabled composition 다음 단계로, 실제 운영 write flag·Rules·Hosting을 열기 전에
필수 선행조건과 안전한 단계 순서를 저장소 근거로 판정한다. 이 문서는 배포·실제 UID 입력·운영 데이터
접근 또는 운영 쓰기 승인이 아니다.

## 현재 충족된 조건

- C5 + Structure A 구현과 local `demo-denn-emulator` Rules gate 13/13은 CODEX_PASSED다.
- 단일 production composition/auth 권위와 exact-true write gate가 구현됐다.
- 기본 production build에서는 `VITE_DENN_ADMIN_WRITE_ENABLED`가 설정되지 않아 write controller/editor 0이다.
- legacy `admin/state.json` fallback read, rebuild head 우선 read, immutable object + REC + head transaction,
  conflict/outcome-unknown fail-closed 계약이 로컬에서 검증됐다.

## 운영 개방 차단점

### B-1 실제 UID 정본 없음

`storage.rules`와 `firestore.rules`는 모두
`UNCONFIRMED_OPERATOR_UID_REPLACE_BEFORE_DEPLOY` placeholder다. Founder G-1은 실제 UID 정본 제공 전 live
Rules 배포를 명시적으로 금지했다. 저장소에서 UID를 추측하거나 예시값으로 대체할 수 없다.

### B-2 G-4 비용 조건 미충족

Founder D-1=A/D-2=O-3/D-3=N은 식별 구조만 채택하고 실제 삭제·정리 주체·보존 개수·주기를 정하지
않았다. 이는 오삭제를 막지만, 저장 성공마다 이전 객체가 참조에서 떨어지고 객체+REC이 계속 누적되는
비용 상한을 정하지 않는다. G-4 원결정은 보존 기간·비용 한도·권한 있는 정리 주체가 별도 승인되기 전
실제 운영 쓰기를 열지 말라고 한다. 따라서 현재 O-3/N만으로 운영 개방 조건이 충족됐다고 기록할 수 없다.
실제 저장 빈도·payload 크기·bucket 사용량·요금은 NOT TESTED/UNCONFIRMED이며 추정하지 않는다.

### B-3 deploy-safe Hosting 경계 없음

현재 `firebase.json`의 `hosting.public`은 저장소 루트 `"."`이고 rewrite는 `/`를 legacy
`denn-mockup-tool.html`로 보낼 뿐이다. Vite admin `dist`를 별도 안전 target/route로 배포하는 계약이 없다.
이 상태에서 Hosting preview/production 배포를 승인하면 저장소의 의도하지 않은 파일 포함 여부와 legacy
경로 보존을 증명할 수 없다. 스펙 043은 composition만 연결했지 배포 패키징을 해결하지 않았다.

### B-4 최종 Rules 배포는 legacy save를 닫음

현재 목표 `storage.rules`는 `match /admin/{p=**} allow write: if false`다. 이를 live에 배포하면 legacy
`denn-admin.html`의 `admin/state.json` 저장은 즉시 거부된다. 새 admin route·write-enabled build·실제
Rules가 모두 준비되기 전에 배포하면 운영자가 아무 데도 저장할 수 없는 구간이 생긴다.

### B-5 Rules와 Hosting 전환은 하나의 원자적 commit이 아님

Storage Rules, Firestore Rules, Hosting release는 서로 다른 배포 표면이다. 저장소 문서나 현재 도구에서
세 제품의 cross-service atomic deployment 보장은 확인하지 못했다. 따라서 “한 번에 배포하면 중간 상태가
없다”고 가정하지 않는다. 각 중간 상태와 롤백을 별도로 설계해야 한다.

## 단계 후보 비교

### C-1 최종 Rules 선행

최종 Rules를 먼저 배포하고 이후 admin app을 배포한다. legacy save가 먼저 닫혀 **무저장 구간이 확정**되므로
기각 후보이며 Founder Z-8과 충돌한다.

### C-2 write-enabled app 선행 → 최종 Rules

새 app을 먼저 배포하면 Rules 전까지 새 저장은 실패하고 legacy 저장은 유지된다. 최종 Rules 이후에는
새 저장이 열리고 legacy가 닫힌다. 단 Storage/Firestore Rules의 배포 사이 중간 상태, 실제 route 전환,
브라우저가 어느 release를 실행하는지, rollback 시 새 head 이후 legacy로 돌아갈 데이터 의미가 남는다.
추가 transitional Rules 없이 가능한 최소 순서지만 아직 안전성이 완성되지 않았다.

### C-3 additive transitional Rules → app → 최종 legacy close

1. legacy write를 유지하면서 rebuild 경로만 추가하는 전환 Rules,
2. write-enabled admin route,
3. 제한 운영자 actual-write 검증,
4. 최종 Rules로 legacy write close 순서다.

무저장 구간은 피하지만 legacy와 rebuild 두 정본이 동시에 쓰일 수 있는 dual-write window가 생긴다.
운영자 한 명·명시적 전환 절차·구버전 UI 접근 차단/안내·rollback 의미를 별도 계약으로 고정해야 한다.
현재 G-1 목표 파일은 최종 상태이므로 transitional Rules 파일/배포는 별도 Founder 승인 대상이다.

## 롤백 경계

- 새 head가 한 번이라도 운영에서 전진한 뒤 legacy UI로 단순 복귀하면 rebuild 변경이 legacy
  `admin/state.json`에 반영되지 않는다. 이를 자동 역마이그레이션하거나 legacy에 되쓰는 계약은 없다.
- 따라서 “Hosting만 롤백”은 화면 복구일 뿐 데이터 정본 롤백이 아니다.
- actual-write 시작 전 롤백과 actual-write 이후 롤백을 분리해야 한다.
- actual-write 이후에는 write flag를 다시 끄고 rebuild head를 read-only로 보존한 채 Founder가 데이터
  처리 방향을 정해야 한다. 자동 legacy fallback/write-back은 금지한다.

## 권장 다음 결정

### K-1 — G-4 운영 비용 조건

- **A (권장):** 실제 운영 write는 계속 차단하고, 저장 빈도·평균/최대 payload·허용 월 비용 또는 객체/용량
  상한과 관찰 주체를 먼저 결정한다. 삭제는 O-3 그대로 유지할 수 있다.
- B: 상한 없는 영구 누적 비용을 Founder가 명시적으로 수용하고 O-3/N을 운영 조건 충족으로 간주한다.

### K-2 — 다음 구현 단위

- **A (권장):** 스펙 045로 deploy-safe Hosting/admin route 패키징을 로컬 전용으로 설계·구현한다.
  실제 Firebase preview/production 배포와 write flag 활성화는 0이다.
- B: 실제 UID 정본을 먼저 제공하고 Rules/cutover 계약으로 이동한다.

### K-3 — 최종 cutover 전략 방향

- **A (권장):** C-3 transitional Rules 방식. 무저장 구간을 피하되 dual-write window와 actual-write 이후
  rollback을 별도 배포 스펙에서 엄격히 제한한다.
- B: C-2 app 선행 방식. 배포 표면 사이 중간 상태 위험을 수용하고 transitional Rules를 만들지 않는다.

K-3은 방향 승인일 뿐 Rules 파일 작성·배포 승인이 아니다. 실제 UID가 없으면 어느 방식도 live로 실행하지
않는다.

## K-2=A일 때 스펙 045 최소 범위 후보

- Vite admin/customer build 산출물을 저장소 루트와 분리해 한 staging root에 조립하는 로컬 script/config
- `/` 고객 route와 명시 admin route, legacy 경로 보존 관계
- HTML no-cache와 정적 asset cache 정책
- fixture/test/docs/보호 대상이 배포 artifact에 포함되지 않는 allowlist 검증
- local static-server Chromium route 검증
- `firebase.json` 실제 변경은 별도 승인 여부를 스펙에서 명시하고, deploy 명령은 실행하지 않음

## 계속 금지

실제 UID 추측·기록, 실제 Firebase/project/bucket/운영 데이터/network, 객체 조회·나열·삭제, 실제 Rules·
Hosting preview/production 배포, 운영 write flag 설정, 운영 쓰기, legacy write close, 발행, C6/L-4,
orphan delete/자동 정리, 신규 의존성·다운로드, 보호 대상 변경.

## 결론

현재 운영 쓰기는 **NOT READY**다. emulator PASS와 composition 완료만으로 G-1/G-4/Hosting/cutover 조건을
대체할 수 없다. 권장값은 **K-1=A, K-2=A, K-3=A**이며 Founder 결정 전 스펙 045 구현을 시작하지 않는다.

## Founder 결정 (2026-08-18)

- K-1=A, K-2=A, K-3=A 승인.
- K-2 local-only 구현은 스펙 045에서 완료했다.
- K-1 수치·관찰 주체와 K-3 단계별 STOP/rollback 세부 계약은 스펙 046으로 이어간다.
- 이 결정으로 실제 UID·Rules/Hosting 배포·운영 write·legacy close가 승인된 것은 아니다.
