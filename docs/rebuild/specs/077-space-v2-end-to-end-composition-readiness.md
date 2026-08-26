# 077 — Space V2 end-to-end composition readiness

## 상태

`DOCUMENT_ONLY / FOUNDER_DECISION_REQUIRED / PRODUCT IMPLEMENTATION NOT STARTED`

## 목표 (WHY)

Space V2 발급 UI를 만들기 전에 customer V2 viewer와 admin issue session의 실제 연결 공백을 확인하고,
열리지 않는 링크나 replay metadata/proof PNG 불일치를 만들지 않는 구현 순서를 결정한다.

조사 정본:
`docs/codex-claude-handoff/reviews/2026-08-26-space-v2-end-to-end-composition-readiness.md`.

## 범위 (SCOPE)

- 포함: local source audit, viewer/issuer readiness, 안전한 순서 후보, Founder LL-1~LL-6 선택지.
- 제외: 제품 코드, UI/CSS, tests, Rules/config, package/lockfile, network/emulator/deploy.

## 확인 결과

1. spec 064~076의 V2 schema, local issue bundle, write port, target Rules와 SDK adapter는 존재한다.
2. admin production route에는 issue bundle 입력 8개를 하나의 frozen draft로 소유하는 composition이 없다.
3. customer production route는 V1 `createSpaceOpenPort()`만 사용하며 V2 document/scene을 열지 않는다.
4. 따라서 admin issue UI를 먼저 활성화하면 저장은 성공하나 customer가 열 수 없는 V2 link를 만들 수 있다.
5. 권장 순서는 customer V2 non-UI open/replay → customer UI → admin frozen issue session → admin UI다.

## Founder 결정

아직 선택되지 않았다. 정확한 선택지와 근거는 조사 정본 §6을 따른다.

- LL-1: customer viewer 선행 여부
- LL-2: proof PNG를 동일 frozen draft/render plan에서만 만들지 여부
- LL-3: C5 baseline catalog snapshot 고정 여부
- LL-4: 기존 admin default app/Auth 재사용 + lazy writer 여부
- LL-5: confirmed link와 password 분리 UX
- LL-6: 첫 구현 단위를 non-UI viewer 계약으로 제한할지 여부

## 결정 후 권장 첫 구현 범위 후보

LL-1=A, LL-6=A일 때만 다음 구현 스펙을 새로 작성한다.

- V1 의미를 바꾸지 않는 V2 document dispatcher/open port
- V2 decrypt → strict scene read → evidence digest verify
- proof asset fetch/read port와 exact byteLength/SHA-256/intrinsic dimensions 검증
- validated evidence만 받는 frame replay plan projector
- missing/mismatch/decode/network failure의 safe code와 raw 정보 비노출
- injected fake 기반 unit. 실제 Firebase/network와 UI/CSS는 0

이 문서는 위 구현을 승인하지 않는다. Founder 결정 후 별도 실행 스펙과 Claude Code 프롬프트가 필요하다.

## 계속 금지

- admin/customer UI 구현과 App route 연결
- actual UID, live Firebase/network/data, Rules/Hosting deploy
- orphan delete/cleanup, auto retry, publish, V1 rewrite/migration
- 신규 dependency와 package/lockfile/config 변경
- 보호 대상 변경·복원·stage·commit

## 검증

- local source와 spec 043, 064~076의 계약을 대조했다.
- `apps/mockup/src/**` production 경로에 V2 reader/open 사용이 없음을 검색했다.
- `apps/admin/src/**` production 경로에 V2 issue bundle/write port 연결이 없음을 검색했다.
- 문서 전용이므로 unit/E2E/emulator는 실행하지 않았다.

### QUESTIONS

Founder의 LL-1~LL-6 선택을 기다린다. 결정 전 Claude Code 실행 지시문은 없다.
