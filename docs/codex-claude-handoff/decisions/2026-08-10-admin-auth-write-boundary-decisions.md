# 결정 (정본) — admin Auth·저장·경로·정규화·충돌 (F-A ~ F-E)

승인: **Founder, 2026-08-10** · 기준 커밋 `8ea0c30` · 브랜치 `rebuild/modern-studio`
근거 조사: `reviews/2026-08-10-admin-auth-write-founder-decision-options.md`
(및 `reviews/2026-07-31-admin-write-boundary-investigation.md`)

> **이 문서가 F-A~F-E의 정본이다.** 조사 보고서 §8의 승인 프롬프트는 **예시였고 superseded**된다.
> 이 문서는 **결정 기록만** 담는다 — 제품 구현·구조 계약을 확정하지 않는다.
> 이번 문서화 라운드에서 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 변경은 **0**이며,
> **`firebase` SDK도 아직 추가하지 않았다**(추가 자체는 승인됐으나 실행 시점은 구현 단계다).

---

## 0. 승인 원문 (Founder, 2026-08-10)

> Founder로서 F-A~F-E를 다음과 같이 승인한다.
>
> **1. F-A**
> - 운영자 Auth를 도입한다.
> - 첫 구현 단계는 Auth + admin/state.json 읽기까지만 허용하며 쓰기는 0이다.
> - 실제로 존재하고 접근 가능한 기존 비익명 운영자 계정 1개만 사용한다.
> - 저장소에서는 계정 존재 여부를 확인할 수 없으므로, 계정 이용 가능 여부는 UNCONFIRMED로 기록한다.
> - firebase 모듈러 SDK 신규 의존성 추가를 승인한다.
> - 신규 계정 생성, 다중 계정, 역할 권한, Rules 변경은 승인하지 않는다.
>
> **2. F-B**
> - published/state.json 발행은 제외한다.
> - 향후 쓰기를 별도로 열 경우에도 우선 admin 상태 저장만 허용한다.
> - 고객 공개 발행은 별도 Founder 승인과 별도 스펙으로 분리한다.
> - 저장 UI에는 "발행되지 않음" 상태 표시를 필수로 한다.
>
> **3. F-C**
> - admin/state.json은 읽기만 공유한다.
> - 향후 쓰기는 레거시 운영 파일과 격리된 rebuild 전용 경로를 사용한다.
> - 정확한 격리 경로는 Codex 구조 계약에서 정한다.
> - 레거시 admin/state.json 공유 쓰기는 별도 승인 없이는 금지한다.
>
> **4. F-D**
> - legacy wcm/hcm 정규화 결과는 메모리 전용으로 유지한다.
> - canonical 승격 결과를 저장 payload에 포함하지 않는다.
> - legacy wcm/hcm 되쓰기·삭제·마이그레이션은 별도 스펙과 별도 승인 없이는 금지한다.
>
> **5. F-E**
> - E3-strong을 선택한다.
> - last-writer-wins 데이터 손실을 허용하지 않는다.
> - 실제 원자적 precondition 또는 잠금 가능성을 별도 조사·검증하기 전까지 쓰기 구현을 차단한다.
> - Firebase Web SDK 지원 여부, Firestore 잠금 필요 여부, Rules 변경 필요 여부는 UNCONFIRMED로 유지한다.
> - Rules 변경이나 Firestore 잠금 도입은 별도 Founder 승인 대상으로 둔다.
>
> **6. 단계별 승인**
> - 현재 승인된 다음 단계는 Auth + admin/state.json 읽기 계약 작성뿐이다.
> - 제품 구현은 아직 승인하지 않는다.
> - 실제 Firebase/network/live/emulator/운영 데이터 접근도 아직 승인하지 않는다.
> - Codex가 구현 계약과 허용 파일, 합성 fake 검증 범위를 작성한 뒤 다시 검토한다.

---

## 1. 결정 요약

| # | 결정 | 상태 |
| --- | --- | --- |
| **F-A** | 운영자 Auth **도입**. 1단계는 **Auth + `admin/state.json` 읽기**, **쓰기 0**. 기존 비익명 운영자 계정 **1개만**. `firebase` 모듈러 SDK **신규 의존성 승인**. | **확정** |
| **F-B** | `published/state.json` **발행 제외**. 쓰기를 열더라도 **admin 상태 저장만**. 고객 공개 발행은 **별도 승인 + 별도 스펙**. 저장 UI에 **"발행되지 않음" 표시 필수**. | **확정** |
| **F-C** | `admin/state.json`은 **읽기만 공유**. 향후 쓰기는 **레거시와 격리된 rebuild 전용 경로**. 정확한 경로는 **Codex 구조 계약**에서. 레거시 파일 **공유 쓰기 금지**. | **확정** |
| **F-D** | 정규화 결과 **메모리 전용 유지**. **저장 payload에 승격 결과 미포함**. 되쓰기·삭제·마이그레이션 **금지**(별도 스펙+승인 필요). | **확정** |
| **F-E** | **E3-strong**. last-writer-wins 손실 **불허**. 원자적 precondition·잠금 가능성을 **별도 조사·검증하기 전까지 쓰기 구현 차단**. | **확정** |

## 2. 승인되지 **않은** 것 (명시적 금지)

- **제품 구현 자체** — 이번에 승인된 것은 **계약 작성**까지다.
- 실제 **Firebase / network / live / emulator / 운영 데이터 접근**.
- **Rules 변경**(`storage.rules`·`firestore.rules`), Hosting 설정, **배포**.
- **신규 계정 생성 · 다중 계정 · 역할 권한**.
- `published/state.json` **발행**.
- 레거시 `admin/state.json`에 대한 **공유 쓰기**.
- legacy `wcm`/`hcm` **되쓰기 · 삭제 · 마이그레이션**.
- **쓰기 구현 전반** — F-E E3-strong에 의해 **원자성 조사·검증 완료 전까지 차단**.

## 3. UNCONFIRMED (승인문이 명시적으로 그렇게 기록하라고 정한 것 포함)

- **운영자 계정의 실제 존재·접근 가능 여부** — 저장소에서 확인할 수 없다(Founder 지시로 UNCONFIRMED 기록).
- **`storage.rules`·`firestore.rules`의 실제 운영 배포 여부와 실제 거부 동작** — 파일 내용만 확인했다.
- **Firebase Web SDK가 Storage 쓰기에 원자적 precondition을 제공하는지.**
- **Firestore 잠금 도입 필요 여부**와 그에 따른 **Rules 변경 필요 여부.**
- 실제 `admin/state.json`·`published/state.json`의 내용·크기, 손실 시나리오 L-1~L-4의 실제 재현.

## 4. 다음 단계 — Codex가 작성할 것

**작업명: "Auth + `admin/state.json` 읽기 전용 구현 계약 작성"** (구현 착수 아님)

계약이 반드시 확정해야 하는 것:

1. **허용 파일 목록**과 금지 범위(`apps/mockup/**`·`packages/render/**` 무변경 등).
2. **AuthPort 형태** — 비익명 판정, 세션 복원, **실패 시 조용한 no-op 금지**
   (레거시 `denn-admin.html:733`·`:735`의 침묵은 계승 금지, `:14810-14817`의 throw 규율은 계승 후보).
3. **읽기 port 형태와 경로 allowlist** — 이 단계에서 허용되는 원격 객체는 `admin/state.json` **읽기뿐**.
4. **합성 fake 검증 범위** — `packages/firebase/src/public-catalog/reader.ts:1-3`의 주입 transport 선례와
   `vitest.config.ts:17`의 `*.live.test.ts` 기본 게이트 제외를 그대로 따른다. **실제 network 0.**
5. **`firebase` SDK 추가 방식**(정확 버전 고정, lockfile 변경 범위) — 추가는 승인됐으나
   **구현 단계에서** 수행한다.
6. **NOT TESTED 경계** — 실제 Rules 거부, 실제 토큰/세션 만료, 실기기.

계약에 **포함하면 안 되는 것**: 쓰기 port·저장 UI·발행·revision/충돌 해소·tombstone·마이그레이션.
(F-E E3-strong에 의해 쓰기는 조사·검증 전까지 차단이고, F-B·F-C·F-D가 각각 별도 승인 대상이다.)

## 5. 이 결정으로 열리는/닫히는 후속

| 항목 | 상태 |
| --- | --- |
| Auth + `admin/state.json` 읽기 계약 | **열림** (Codex 작성 대상) |
| 쓰기 port·저장 UI | **차단** — F-E 원자성 조사·검증 + Founder 별도 승인 필요 |
| 원자적 precondition/잠금 **조사** | 별도 단위로 필요(Rules 변경·Firestore 잠금은 **별도 승인**) |
| 발행(`published/state.json`) | **차단** — 별도 승인 + 별도 스펙 |
| legacy cm 마이그레이션 | **차단** — 별도 스펙 + 별도 승인 |
| X-7(쓰기 payload에서 승격 필드 제외) | **F-D로 정책 확정**, 구현 형태는 쓰기 계약에서 |
