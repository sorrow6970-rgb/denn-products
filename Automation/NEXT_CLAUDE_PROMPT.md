# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-admin-write-c5-emulator-contract` (**계약 문서 작성 완료 · 구현 미착수**)
다음 주체: **Codex** — 스펙 037 계약 검토

**Founder G-1~G-5(`dc5666d`)와 Codex 구조 결정 Z-1~Z-8을 입력으로 스펙 037 구현 계약을 작성했다.**
**문서 전용이며 구현은 시작하지 않았다.**

- 계약: **`docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`**
- 핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
- 결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`
- 근거 조사: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`

> **★ 이 계약은 실제 저장 구현도 admin UI 연결도 승인하지 않는다.**
> **Codex 검토 → Founder의 구현 착수 별도 승인** 전에는 코드를 쓰지 않는다.

## 1. 계약 골자 (Z-1 ~ Z-8)

| Z | 확정 |
| --- | --- |
| **Z-1** | UID 제한은 **`rebuild-admin-state/**` + `/rebuildAdminState/head`에만**. **`op()` 무변경**(바꾸면 레거시 발행·자산 업로드까지 잠긴다). 실제 UID **UNCONFIRMED · 추측 금지**, emulator는 **합성 UID** |
| **Z-2** | `rebuild-admin-state/objects/{operationId}.json` — **별도 최상위 경로**(OR 우회 구조적 차단), UUID **1회 생성**(재시도해도 재생성 안 함), 경로에 revision·문구·id·시간 **금지**, **`resource == null` create-only**, update/delete 금지 |
| **Z-3** | `/rebuildAdminState/head` 단일 문서, 허용 키 **3개**, 최초 **revision 1**, 이후 transaction에서 **`expectedBase` 일치 시 정확히 +1**, `firestore.rules` **이중 강제**, **Rules가 객체 실존을 증명한다고 주장하지 않음** |
| **Z-4** | `@denn/firebase/admin-write`, **루트 배럴 무변경**, SDK는 **admin 전용 lazy 경계 안**, **UI 연결 제외**, **단일 in-flight**, **앱 자동 retry·merge 0**, ⚠️ **SDK 내부 재시도로 "요청 1회" 미주장**, **오류 8코드**(CONFLICT·OUTCOME_UNKNOWN = `retryable:false`) |
| **Z-5** | head 없음 → legacy **revision 0** 기준 / head 있음 → **그 객체만**, 없거나 invalid면 **fail-closed(legacy fallback 0)**. `expectedBase` 고정, **자동 재채택·병합 0**, **commit 성공 후에만** 기준 갱신 |
| **Z-6** | **로컬 emulator만**, **`demo-` 프로젝트 강제**, 기본 게이트와 **분리**(`*.emulator.test.ts` + `pnpm test:emulator`), **실제 Rules로 7개 시나리오**, 설치·다운로드·포트 강제 해제 **STOP** |
| **Z-7** | **tombstone·자동 merge 없음.** 문서 전체 CAS, 충돌 시 전체 거부. **L-4는 별도 후속 스펙** |
| **Z-8** | **배포 0.** 실제 UID + orphan 정책 + emulator PASS 전 운영 쓰기 미개방. **legacy 저장을 먼저 닫지 않는다.** cutover는 별도 승인·별도 스펙 |

## 2. ★ Emulator 사전 확인 결과 (읽기 전용 · 설치/다운로드/실행 0)

| 항목 | 결과 |
| --- | --- |
| Java | **사용 가능** `openjdk 21.0.11 LTS` |
| firebase-tools | **사용 가능** 전역 **15.22.4** · **저장소 의존성 아님** → **lockfile 변경 불필요** |
| emulator binary | **캐시됨** — Firestore `v1.21.0.jar` · Storage rules runtime `v1.1.3.jar` · UI `v1.15.0` |
| Auth emulator binary | 별도 jar **없음** — 내장 추정이나 **UNCONFIRMED**. **첫 실행에서 다운로드 시도 시 즉시 STOP** |
| 포트 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free** |

## 3. ★★ 계약이 못 박은 두 위험

- **R-1** **Rules 배포가 운영자의 유일한 저장 경로를 닫는다.** `denn-admin.html:740`이 지금
  유일한 저장 경로다(스펙 035). 이번엔 Rules를 **수정도 배포도 하지 않았고** UID 정본 전 배포가
  차단이므로 **현재는 안전**하다. 위험은 배포 시점이며 **Z-8이 STOP으로 고정**했다.
- **R-2** **emulator가 실제 프로젝트 id로 뜰 수 있다** — `.firebaserc`의 default가
  **실제 운영 프로젝트 `denn-products`**. → **`demo-` 접두 프로젝트 강제** +
  **emulator host 미설정 시 시작 거부** + **`.firebaserc` 수정 금지**.

## 4. Codex가 확인할 것

- Z-1~Z-8이 계약에 **정확히** 반영됐는지, **초과 확장이 없는지**
- **`op()` 무변경**·**루트 배럴 무변경**·**UI 연결 제외**가 명시됐는지
- 오류 8코드와 **`retryable:false` 분류**가 맞는지
- **fake가 서버 원자성을 증명하지 않는다**는 경계가 명시됐는지
- emulator 계약의 **허용 파일 목록**과 **STOP 조건**이 충분한지
- 실제 UID를 **추측하거나 예시로 기록하지 않았는지**
- 변경이 **허용 문서 6개**로 한정됐는지
- 그 뒤 **스펙 037 계약 승인 여부 판단**

## 5. 계속 금지

- **구현 착수** — Codex 승인 + Founder의 구현 착수 승인 전에는 코드·테스트·CSS 0.
- **`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `package.json`·lockfile·`pnpm-workspace.yaml` 수정** — 계약이 허용 파일로 열거했으나
  **구현 단계에서만**이다.
- **Rules 배포 · Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행.**
- **실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network · emulator 실행.**
- **저장 버튼·admin UI 연결**(이번 구현 단위 범위 밖).
- **tombstone·자동 merge·orphan 삭제·클라이언트 delete 권한.**
- 신규 의존성 · force push · merge · rebase · `reset --hard` · broad delete ·
  새 자동화나 반복 작업.

## 6. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 7. NOT TESTED / UNCONFIRMED

실제 Firebase 프로젝트 동작 전부(Rules 실제 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절 · 실기기·다중 기기 동시 편집 ·
**Auth emulator binary 가용성** · 운영 규모 payload(실제 `admin/state.json` 크기·내용) ·
orphan 누적 실제 비용 · **L-4 삭제 부활**(범위 밖) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).
