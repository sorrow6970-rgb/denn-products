# 현재 상태

> 작업 운영 규칙(2026-08-26 최신 사용자 지시): Founder 승인 범위의 스펙 074~076은 Codex가 직접
> 구현하고 검증했다. 이 승인은 실제 UID·UI·network/live·deploy·delete로 확장하지 않는다.
> 이후 단위는 별도 지시 전까지 수동 교대 규칙을 유지한다.
>
> 이전 운영 규칙(2026-08-21): **임시 Codex 단독 구현 루프를 중단하고 수동 교대 인수인계로
> 복원했다.** Claude Code 구현·검증과 live log 기록 → Codex 독립 검수·재검증 → Codex 다음
> 스펙/프롬프트 작성 → Claude Code가 읽고 작업하는 순서만 사용한다. Codex는 제품 코드를 직접
> 수정하지 않으며 새 자동화나 반복 작업을 만들지 않는다.
> Codex는 각 검수 종료 때 `Automation/NEXT_CLAUDE_PROMPT.md` 상단에 Claude Code에 그대로 전달할
> 완성된 다음 실행 지시문도 함께 남긴다.
> 또한 모든 live log 확인·검수·handoff 보고에는 전체 리빌드 진행률과 잔여율, 그 산정 근거를 반드시
> 포함한다. 최종 스펙 분모가 없으므로 스펙 번호를 완료율로 오해하지 않는다.
>
> 새 단위는 사용자의 수동 지시와 Codex 스펙이 있을 때만 시작한다.
>
> 이전 규칙 요약: **자동 검수 루프는 삭제됐고 수동 인수인계만 사용한다.**
> 새 자동화나 반복 작업을 만들지 않는다. 각 단위는 Founder의 명시적 지시로 시작하고,
> 끝나면 `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + `Automation/DENN_AUTOMATION_STATE.md` +
> `Automation/NEXT_CLAUDE_PROMPT.md` + 이 문서를 실제 상태와 일치시킨다.
> 계약 불명확·범위 확대·신규 의존성·운영 데이터/secret·실제 network/live·
> Firebase/Rules/CORS/Hosting/배포·운영본 변경·Git divergence/force·비재현/flaky·
> 잔류 프로세스가 발생하면 진행하지 않고 보고한다.
> (`AUTO_REVIEW_LOOP.md`는 과거 이력 문서이며 더 이상 운영 규칙이 아니다.)

상태: **`READY_FOR_CLAUDE` - Founder MM-1=A ~ MM-6=A 승인, 스펙 079 실행 계약 준비 완료.**

Founder가 이 대화에서 MM-1=A ~ MM-6=A를 승인했다. 결정 정본은
`docs/codex-claude-handoff/decisions/2026-08-26-space-v2-proof-reader-adapter-decisions.md`다.

다음 Claude Code 단위는 `docs/rebuild/specs/079-space-v2-proof-reader-adapter.md`다. 기존
`denn-space-viewer` named app과 `@denn/firebase/space-read`를 재사용하는 package-only proof reader를
구현한다. exact V2 path → metadata fullPath/contentType/size → bounded bytes → metadata/bytes length
일치와 단일 20초 budget을 unit 및 `demo-denn-emulator`에서 검증한다.

`apps/**`, production route/UI/CSS/browser decoder, Rules/emulator JSON, package/lockfile/root barrel은 범위
밖이다. 전체 Chromium E2E는 MM-6=A에 따라 NOT RUN이며 PASS라고 주장하지 않는다. actual Firebase/
network/live/CORS/deploy/actual UID/orphan cleanup도 계속 금지다.

제품 구현은 아직 시작하지 않았다. next transition은 `CLAUDE_SPEC_079_IMPLEMENTATION`. 실제 UI/UX는
proof reader 통과 후 별도 Claude Code composition 스펙에서 시작한다.

전체 진행도는 **81~84% 완료 / 16~19% 잔여 — 변동 없음**이다.

> 스펙 079 조사 상태:

`HEAD=origin=b28b9c1`, ahead/behind 0/0에서 설치 Firebase Web SDK 12.17.1의 공개 타입과 공식 문서,
기존 `denn-space-viewer` named app ownership, 스펙 075 Rules와 스펙 078 proof port를 대조했다.

공개 `getBytes(ref,maxDownloadSizeBytes?)`는 ArrayBuffer만 반환하며 object의 실제 `contentType`/`size`는
별도 `getMetadata(ref)`로 읽어야 한다. 따라서 권장 protocol은 exact V2 asset path 검사 → metadata
fullPath/MIME/size 선검사 → bounded bytes → metadata size와 bytes length 일치다. 목표 Rules는 같은
경로의 update/delete를 금지하지만 live 배포 상태는 NOT TESTED다.

조사 당시 Founder **MM-1~MM-6**은 미결정이었고 권장값은 모두 A였다. 기존 `@denn/firebase/space-read`와
`denn-space-viewer` app 재사용, metadata-first read, 20초 전체 budget, `demo-denn-emulator` opt-in,
package-only 범위와 full-E2E NOT RUN 예외다. 결정 전 Claude Code 실행 지시와 제품 구현은 없다.

현재 단위는 UI 단계가 아니다. proof reader adapter 통과 뒤 browser PNG decoder와 production customer
V2 composition/UI를 별도 스펙으로 열며, 실제 UI/UX 구현은 사용자 지침대로 Claude Code가 담당한다.
actual Firebase/network/live/CORS/deploy, actual UID, admin issue UI, orphan cleanup은 계속 금지다.

위 결정으로 현재 해소됐으며 전체 진행도는 **81~84% 완료 / 16~19% 잔여 — 변동 없음**이다.

> 스펙 078 종료 상태:

Codex 재검수 기준 `HEAD=origin=6742f3f`, ahead/behind 0/0이다. correction code/test commit `bed9106`을
스펙 029·030 normalized-pan 계약과 스펙 078 exact replay 계약에 대조했고 추가 결함은 0이다. probe와
final plan의 geometry/scale/rotation이 같고, rotated maxPan은 builder가 낸 clip/draw rect에서 유도되며
normalized x/y는 기존 검증 함수로만 logical px로 환산된다.

독립 재실행 PASS: targeted **29/29**, 전체 check(unit **2153/2153** 포함), 고객 entry exact
filename/size/SHA-256, correction 범위 diff, 허용 8개 경로, 검사 포트 잔류 0. 전체 Chromium E2E와
emulator는 계약대로 NOT RUN이다.

최종 판정 `CODEX_PASSED / DONE / LOCAL_VERIFIED / NO_UI / NO_NETWORK`. 실제 Firebase/network/live/deploy,
production route, React/UI/CSS, Firebase proof reader adapter, admin issuer와 URL/clipboard 연결은 0이다.
active unit은 없고 next transition은 `NEXT_MANUAL_SPEC_SELECTION`; 다음 스펙과 자동화를 시작하지 않는다.

전체 진행도는 **81~84% 완료 / 16~19% 잔여**다.

> 스펙 078 보완 라운드 1 제출 상태:

Founder가 exact replay test에서 확인된 구현 결함에 대해 `replay-controller.ts` 한 파일의 최소 범위
확장을 승인했다. 보완 시작 기준은 `HEAD=origin=85e92da`, ahead/behind 0/0이고 코드/test commit은
`bed9106`이다.

V2 evidence의 `x/y`는 `normalized-max-pan-v1`인데 기존 controller가 logical px처럼 직접 전달해 exact
fixture에서 기대 draw origin `(-995,-65)` 대신 `(-650.5,-99.75)`가 나왔다. 수정은 기존 스펙 029/030
primitive를 재사용한 zero-pan probe plan → rotated maxPan → `toLogicalTransform()` → final plan이다.
geometry 공식 복제, 새 API·의존성·production import는 0이다.

PASS: exact plan/detachment 포함 targeted **29/29**, spaces/mockup typecheck, 전체 check(unit
**2153/2153** 포함), 고객 entry exact filename/size/SHA-256, `git diff --check`, 허용 diff, 검사 포트 잔류
0. 첫 전체 check는 formatter 1건에서 중단됐고 형식만 고친 뒤 재실행해 PASS했다.

전체 Chromium E2E·emulator는 NOT RUN이며 실제 Firebase/network/live/deploy/UI 연결 0이다. 상태
`READY_FOR_CODEX`, fix_round 1/3, next transition `CODEX_RE_REVIEW`; 다음 스펙 자동 시작 0.

전체 진행도는 **81~84% 완료 / 16~19% 잔여**로 유지한다.

> 스펙 078 Codex 최초 검수 상태:

검수 기준 `HEAD=origin=0f63af4`, ahead/behind 0/0이다. 독립 targeted **28/28**, 전체 check(unit
**2152/2152** 포함), 고객 entry exact hash, `git diff --check`, commit 허용 경로와 검사 포트 잔류 0은
PASS했다.

남은 결함은 검증 공백 1건이다. `apps/mockup/src/space-v2/replay-controller.test.ts`의 success test가
canvas 크기·layer 순서·imageRef만 단언해 스펙 078 §VERIFY 8의 rect/color/transform/quarter-turn exact
vector를 증명하지 못한다. 해당 테스트 하나와 spec078 handoff 문서만 보완하며, 실제 결함이 드러나지
않으면 production 코드는 수정하지 않는다. success plan detachment도 같은 보완에서 고정한다.

상태 `CORRECTION_REQUIRED`, fix_round 1/3, next transition `CLAUDE_CORRECTION`. 전체 Chromium E2E와
emulator는 NOT RUN이고 실제 Firebase/network/live/deploy/UI 연결 0이다. 다음 스펙 자동 시작 0.

전체 진행도는 **81~84% 완료 / 16~19% 잔여**로 유지한다.

> 스펙 078 최초 구현 제출 상태:

기준 `HEAD=origin=6cc39eb`, ahead/behind 0/0에서 스펙 078을 구현했다. `@denn/spaces` 별도 V2 opener는
exact document → password → decrypt → strict scene → evidence digest 순서를 지킨다. production에 아직
import되지 않는 mockup V2 replay controller는 injected proof reader/SHA/decoder로 content type,
byteLength, proof SHA-256와 intrinsic dimensions를 확인한 뒤 closed evidence frame plan을 만든다.

PASS: targeted **28/28**, spaces/mockup typecheck, 전체 check(format/lint/전체 typecheck/unit
**2152/2152**/두 앱 build), 고객 entry 322,018 bytes 및 SHA-256
`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`, `git diff --check`, forbidden diff,
검사 포트 잔류 0.

전체 Chromium E2E와 emulator는 계약대로 NOT RUN이며 PASS가 아니다. actual Firebase/network/live/deploy,
production route, React/UI/CSS, Firebase asset adapter, admin issuer와 orphan cleanup은 0이다. 상태
`READY_FOR_CODEX`, next transition `CODEX_REVIEW`; 다음 스펙 자동 시작 0.

전체 진행도는 **81~84% 완료 / 16~19% 잔여**로 추정한다.

> 스펙 078 승인·착수 전 상태:

Founder가 2026-08-26 이 대화에서
**`LL-1=A, LL-2=A, LL-3=A, LL-4=A, LL-5=A, LL-6=A`**를 승인했다. 결정 정본은
`docs/codex-claude-handoff/decisions/2026-08-26-space-v2-composition-readiness-decisions.md`다.

다음 Claude Code 단위는 `docs/rebuild/specs/078-space-v2-local-viewer-replay-pipeline.md`다. V1과 분리된
V2 opener가 decrypt/strict scene/evidence digest를 검증하고, production에 import하지 않는 mockup V2
replay controller가 injected proof reader/PNG decoder로 byteLength/SHA-256/intrinsic dimensions를 확인한
뒤 closed evidence frame plan을 만든다.

`App.tsx`, 기존 V1 controller/password gate, React/UI/CSS, Firebase asset SDK/network, admin issuer는
범위 밖이다. 실제 UI/UX는 사용자 지시에 따라 후속 Claude Code 스펙에서 수행한다. 제품 구현은 아직
시작하지 않았으며 next transition은 `CLAUDE_SPEC_078_IMPLEMENTATION`이다.

전체 진행도는 **80~83% 완료 / 17~20% 잔여**로 유지한다.

> 스펙 077 readiness 조사 상태:

기준 `HEAD=origin=4ef385b`, ahead/behind 0/0에서 스펙 077 문서 조사를 시작했다. local source audit로
다음을 확인했다.

- customer production `SpaceRoute`는 V1 `createSpaceOpenPort()`만 사용하며 V2 document/scene을 열지 않는다.
- admin production UI에는 V2 issue bundle의 catalog·selection·orientation·logical width·color·transform·
  proof PNG·password를 하나의 frozen draft로 소유하는 composition이 없다.
- 따라서 admin issue UI 선행 활성화는 저장되지만 customer가 열 수 없는 link를 만들 수 있다.

권장 순서는 customer V2 non-UI open/integrity/replay → customer UI → admin frozen issue session → admin
UI다. 실제 UI/UX는 사용자 지시에 따라 Claude Code가 담당한다. LL-1~LL-6 결정 전에는 제품 구현을
시작하지 않는 상태였으며 현재는 위 승인과 스펙 078로 해소됐다. 조사 정본은
`docs/codex-claude-handoff/reviews/2026-08-26-space-v2-end-to-end-composition-readiness.md`다.

이번 단위는 문서 전용이다. unit/E2E/emulator/network 실행 0, 제품·Rules·config/package/lockfile 변경
0이다. 전체 진행도는 **80~83% 완료 / 17~20% 잔여**로 유지한다.

> 스펙 076 종료 상태:

기준 `HEAD=origin=530c7bc`, ahead/behind 0/0에서 스펙 076을 시작했다. default Firebase app/Auth를
재사용하는 dynamic-import V2 SDK facade를 구현했고 non-demo emulator 선거부, config mismatch
fail-closed, uploadBytes/setDoc/getDocFromServer mapping을 단위와 local emulator에서 검증했다.

PASS: targeted **40/40**, Firebase typecheck, 전체 check(unit **2124/2124** 포함), default emulator
**22/22**, cutover 전용 config **4/4**, `git diff --check`, forbidden diff, 보호 hash, 포트 잔류 0.
최초 cutover 일반 config 오실행 1회는 1/4 실패했고 전용 config 재실행으로 4/4 PASS했다. 제품
코드·Rules 수정 없이 원인을 확정했다.

전체 Chromium E2E는 Founder `KK-6=A`에 따라 **NOT RUN**이며 full-E2E PASS가 아니다. 실제 UID,
Firebase/network/live/deploy, UI/URL, orphan delete/cleanup은 미구현·NOT TESTED·금지다. 다음 transition은
`CLAUDE_ADMIN_UI_COMPOSITION_CONTRACT_REVIEW`다. 실제 UI/UX는 사용자 지침에 따라 Claude Code가 담당한다.

전체 리빌드 진행도는 **80~83% 완료 / 17~20% 잔여**로 추정한다. 이는 roadmap 작업축 기반 관리
추정이며 최종 스펙 번호를 분모로 계산한 값이 아니다.

> 스펙 075 종료 상태:

기준 `HEAD=origin=b2dc2ca`, ahead/behind 0/0. 스펙 075는 V2 PNG create-only/public-read Storage
Rules, V2 exact envelope 승인 UID create와 spaces list 거부 Firestore Rules, 합성 UID 전용 emulator
사본과 opt-in test를 구현했다. 배포 대상 Rules의 UID placeholder는 유지했다.

PASS: targeted **75/75**, 전체 check(unit **2114/2114** 포함), default `demo-denn-emulator`
**20/20**, 별도 cutover **4/4**, `git diff --check`, UID-only Rules 동등성, forbidden diff, 검사 포트
잔류 0. 전체 Chromium E2E는 보호 대상 PNG 재작성 때문에 **NOT RUN**이다. 스펙 074 예외를 자동
재사용하지 않았고 Founder가 2026-08-26 스펙 075 별도 예외 종료를 승인했다. 다음 transition은
`NEXT_MANUAL_SPEC_SELECTION`이다.

실제 UID·Firebase/network/live·deploy, SDK adapter, apps/UI, URL, orphan 삭제/정리는 미구현·NOT
TESTED·금지다. 전체 리빌드 진행도는 **79~82% 완료 / 18~21% 잔여**로 추정한다. 이는 roadmap
작업축 기반 관리 추정이며 최종 스펙 수를 분모로 계산한 값이 아니다.

> 스펙 074 종료 상태:

Founder가 2026-08-26 이 대화에서 **`스펙 074 E2E 예외 종료 승인`**을 명시했다. 따라서 보호 PNG
재작성 부수효과로 전체 Chromium E2E를 실행하지 않았다는 사실을 유지하면서 스펙 074를 종료한다.
동시에 `JJ-1=A, JJ-2=A, JJ-3=A, JJ-4=B, JJ-5=A, JJ-6=A`를 승인했다. 다음 단위는 local Rules와
`demo-denn-emulator` 검증이며 실제 UID·live deploy·UI·orphan 삭제는 여전히 금지다.

기준 `HEAD=origin=507eeb0`, ahead/behind 0/0에서 새 스펙
`docs/rebuild/specs/074-space-v2-local-write-port.md`를 작성하고 `@denn/firebase/space-write` local port와
synthetic fake를 구현했다. 범위는 upload → document create 순서, upload/create 결과 미확정의 안전
오류와 server-only read 1회 reconciliation, cache/pending snapshot 거부, single-flight, 안전 오류
envelope다. 실제 Firebase SDK adapter, Rules, emulator, UI, URL, delete/retry는 없다.

PASS: targeted **30/30**, Firebase typecheck, 전체 format/lint/typecheck/unit **2114/2114**/build,
`git diff --check`, 고객 entry SHA-256
`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`, 검사 포트 잔류 0.
전체 Chromium E2E는 기존 suite가 보호 대상 spec-018 PNG를 다시 쓰는 부수효과 때문에 **NOT RUN**이며
우회하지 않았다. Founder가 이 예외 종료를 승인했다. 다음 transition은
`SPEC_075_SPACE_V2_RULES_EMULATOR_CONTRACT`이고 UI는 시작하지 않는다.

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다. local persistence seam은 한
단계 전진했으나 Rules·adapter·UI·production 축이 남아 있어 추정 범위를 바꿀 근거가 없다.

> 스펙 073 종료 상태:

Codex는 `HEAD=origin=c8234a9`, ahead/behind 0/0에서 라운드 4 문서를 최종 재검수했다. 변경은 허용 문서
6개뿐이고 `git diff --check` PASS, staged 0이었다. Firebase 공식 *Use conditions in Firebase Cloud
Storage Security Rules*의 Resource Evaluation과 보고서 §1.4·§Q7.1.1·§4·JJ-5가 일치한다.

`resource.metadata`와 write 평가의 `request.resource` metadata 검사는 **공식 지원**으로, V2 전용
Rules/runtime은 **미작성·NOT TESTED**로 분리됐다. 목표 public-read 시 recId 관측, GG-4 미승인 확장,
exact-key/format·assetId 교차검사 설계 필요, 연쇄 경로 보간 `UNCONFIRMED`, 실제 IAM/live
`NOT TESTED`, 확정 orphan 미증명과 O-3 삭제 보류도 유지된다.

최종 판정은 **`DOCUMENT_REVIEW_PASSED / CODEX_PASSED / DONE`**이다. 제품 코드/test/Rules/config/
package/lockfile 변경과 emulator/live 실행은 0이다. 오늘 세션은 종료하며 JJ-1~JJ-7은 선택하지 않는다.
다음 작업 자동 시작 없음, 다음 transition은 `FOUNDER_JJ_1_JJ_7_DECISION`이다.

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다.

> 라운드 4 제출 당시 기록:

보완 직전 관측 기준 `HEAD=origin=a6ad189`(Founder 라운드 4 예외 승인 commit), ahead/behind 0/0.
승인문이 적은 `dc6fe11`은 그 직전 commit이고 그 위에 승인 commit `a6ad189`가 얹혀 있다 — 기준선은
정합하며 라운드 4는 `a6ad189`에서 출발했다.

Codex 최종 재검수의 **근거 정정 1건만** 반영했다. Storage Rules의 object metadata 표면
(`resource.metadata` / write 평가의 `request.resource` metadata 검사)을 `UNCONFIRMED` → **공식
지원(`OFFICIALLY SUPPORTED`, 정적 근거 확인)** 으로 재분류하고, 조사 보고서에 **§1.4 「공식 문서
인용」**을 신설해 근거를 고정했다. **폐기한 것은 딱 둘** — *"저장소 선례 0건이므로 공식 지원도
`UNCONFIRMED`"*, *"(c1)만 Rules 표면 근거 등급을 확보했다"* 는 비교다. ⇒ (c2)에 남는 차이는
**목표 public-read 시 recId 공개**와 **GG-4 미승인 schema/Rules 확장** 둘, 그리고 **(c2)에만 붙는
exact key/format·assetId 교차검사 설계 요건**이다.

**유지된 경계:** V2 전용 Rules 미작성, emulator/runtime `NOT TESTED`, 실제 Firebase/IAM/live
`NOT TESTED`, **(c1)·(c2) 모두 확정 orphan 미증명과 O-3 삭제 보류**. 허용 문서 6개만 수정했고 제품
코드/test/Rules/config/package/lockfile, `apps/**`, `packages/**`, 보호 대상 변경은 **0**,
실제 Firebase/network/emulator/deploy/UID/URL/UI도 **0**이다. 이 세션은 network 접근이 금지되어
**공식 문서 URL을 직접 fetch하지 않았다** — 인용은 Codex 재검수가 제시한 것이며 보고서 §1.4에 그
사실을 명시했다.

**내용 commit 1개**만 남기고 self-hash bookkeeping commit은 추가하지 않았다. 다음 transition은
`CODEX_RE_REVIEW`다. 제품 코드/test/Rules/config/package/lockfile, emulator/live, JJ-1~JJ-7 선택과
다음 구현 스펙은 계속 금지이며 시작하지 않았다.

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다. 라운드 4는 근거 등급 하나를
바로잡은 문서 정정이며 제품 작업축 완료량을 늘리지 않는다.

> Founder 라운드 4 예외 승인 기록:

Founder는 이 대화에서 **`스펙 073 문서 보완 라운드 4 예외 승인`**을 명시했다. 승인 기록 직전 기준은
`HEAD=origin=dc6fe11`, ahead/behind 0/0이었다. 이번 예외는 아래 Storage Rules metadata 근거 등급
정정과 관련 문서 동기화 한 번만 허용했다.

> 예외 승인 전 Codex STOP 기록:

검수 기준 `HEAD=origin=9707233`, ahead/behind 0/0이다. 라운드 3의 변경 범위(허용 문서 6개),
access-call 산술, metadata-only update 차단, 현재 default-deny와 목표 public-read 구분은 수용한다.

남은 결함은 한 가지다. 조사 보고서는 Storage Rules의 `request.resource.metadata` /
`resource.metadata` 지원을 `UNCONFIRMED`로 남겼지만, Firebase 공식 **Use conditions in Firebase Cloud
Storage Security Rules**의 Resource Evaluation은 `resource.metadata`를 developer-specified custom
metadata map으로 명시하고 write에서 `request.resource`로 새 metadata를 검사할 수 있다고 명시한다:
https://firebase.google.com/docs/storage/security/rules-conditions . 따라서 (c2)의 Rules metadata 표면
자체는 **공식 지원**으로 정정해야 한다.

V2 전용 Rules 미작성, exact-key/format 설계 필요, emulator/runtime `NOT TESTED`, 목표 public-read 시
recId 관측, GG-4 미승인 schema/Rules 확장, 실제 IAM/live `NOT TESTED`, 확정 orphan 미증명과 삭제 보류는
유지된다. `fix_round` 3/3을 모두 사용했으므로 Founder가 라운드 4 예외를 승인하기 전에는 Claude Code
보완, JJ-1~JJ-7 선택, 제품 구현, Rules/emulator, 다음 스펙을 시작하지 않는다.

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다. 이번 검수는 문서 근거 등급을
바로잡는 일이며 제품 작업축 완료량을 늘리지 않는다.

> 라운드 3 제출 당시 기록:

보완 직전 관측 HEAD=origin `6b3bcfc`(라운드 2 내용 commit), ahead/behind 0/0에서 Codex 라운드 3의
**세 정정만 최소 반영**했다. 라운드 2에서 통과한 내용은 되돌리지 않았다. 허용 문서 6개(조사 보고서 ·
spec073 · STATE · NEXT · CURRENT · live log)만 수정했고 제품 코드/test/`storage.rules`/
`firestore.rules`/Firebase config/package/lockfile, `apps/**`, `packages/**`, 보호 대상 변경은 **0**,
실제 Firebase/network/**emulator**/deploy/UID/URL/UI도 **0**이다. **내용 commit 1개**만 남기고
self-hash bookkeeping commit은 추가하지 않았다.

**보완 1 — access-call 산술 (보고서 §Q7.1.1a 신설).** `firestore.get()`이 반환한 **같은 문서의 필드를
다시 읽는 것은 새로운 document access가 아니다** — `data.assetId`와 `data.token`은 같은 결과 객체의
필드다. 평가별로 다시 계산하니 **(c1)·(c2) 모두 create 1회 / delete 2회**이고 **(c2)의 assetId 교차
확인은 무료**다. 라운드 2의 *"교차 확인 때문에 한도 초과"* 와 *"(c2)가 access-call 면에서 더 비싸다"* 를
**폐기**했다. **연쇄 경로 보간 지원은 계속 `UNCONFIRMED`**이며, 그 전제는 두 후보 공통이다 —
미지원이면 delete 판정이 (c1)·(c2) 모두 불성립하고, create 게이팅(각 1회)은 연쇄를 쓰지 않아 무관하다.

**보완 2 — metadata update 계약 공백 주장 폐기.** `updateMetadata()`는 업로드와 별개인 Storage
**update 요청**이고 Storage Rules의 `update`는 metadata-only update도 포함하므로, GG-4 목표가 이미
`update`/`delete`를 `false`로 두는 이상 **목표 `allow update: if false`가 `updateMetadata()`를
차단한다.** 유지: V2 목표 Rules는 **미작성 · `NOT TESTED`**이고 향후 match에 `allow update: if false`를
**명시해서 써야 한다**. 이 저장소 emulator 게이트는 재업로드·`deleteObject` 거부만 검증했고
`updateMetadata` 자체는 검증하지 않았으므로 그 지점을 `NOT TESTED`로 기록했다.

**보완 3 — public metadata 근거 수준 정밀화.** *"경로를 아는 누구나 읽을 수 있다"* 는 **현재형 진술을
폐기**했다. **현재는 관측할 수 없다** — 해당 경로가 **default deny**다. 설치 타입
`FullMetadata extends UploadMetadata`(`storage-public.d.ts:56`)가 증명하는 것은 권한 있는
`getMetadata()` 결과에 `customMetadata`가 포함된다는 사실이며, 정확한 진술은 **GG-4 목표 public-read
Rules가 구현되면 경로를 아는 client가 metadata를 읽을 수 있다는 설계 귀결**이다. 실제 V2 Rules와
runtime은 **`NOT TESTED`**. 안전 결론(recId를 secret으로 설계하지 않는다 · token을 `customMetadata`에
넣지 않는다)은 그대로 유지했다.

**(c2) 재평가.** 라운드 2가 붙였던 "명백히 더 비싸다"의 근거 두 개가 모두 폐기됐다. **남는 실제
차이는 비용이 아니라 셋** — ① Rules metadata 표면 `UNCONFIRMED`(저장소 선례 0건) ② 목표 public-read가
구현되면 recId가 **공개 식별자** ③ **GG-4 미승인 schema/Rules 확장**. **두 후보 모두 확정 orphan을
증명하지 못한다**는 결론은 그대로다.

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여로 변동 없다**. 라운드 3은 후보 비교를 **정확하게**
만들었을 뿐 어느 후보도 전진시키지 않았고, **작업축 6의 잔여 난이도는 줄지 않았다**.

다음은 Codex 재검수다. `fix_round`는 **3/3으로 최대 보완 횟수에 도달**했다. Founder JJ-1~JJ-7 선택,
제품 구현, Rules 변경, emulator 실행, 다음 스펙과 자동화·반복 작업은 시작하지 않았다.

> 라운드 2 제출 당시 기록:

보완 직전 관측 HEAD=origin `2dd97c4`, ahead/behind 0/0에서 Codex 재검수 세 묶음을 문서에 반영했다.
허용 문서 6개(조사 보고서 · spec073 · STATE · NEXT · CURRENT · live log)만 수정했고 제품 코드/test/
`storage.rules`/`firestore.rules`/Firebase config/package/lockfile, `apps/**`, `packages/**`, 보호
대상 변경은 **0**이다. 실제 Firebase/network/**emulator**/deploy/UID/URL/UI도 모두 0이다.

**보완 1 — cross-service read primitive 근거 등급.** 라운드 1이 이 primitive를 `UNCONFIRMED`로 남긴
분류가 **틀렸다.** 보고서 §Q7.1.0에서 네 층위로 분리했다 — ① Storage Rules `firestore.get()/exists()`
**공식 지원**(G-4 §4 공식 문서 인용) · ② client `read:false` 문서를 조회해 create를 게이팅하는
primitive **local emulator VERIFIED**(`storage.emulator.rules:40-45` · `firestore.emulator.rules:71-86`
· `cutover-rules.emulator.test.ts:83-96` · G-4 §12 **13/13 PASS**) · ③ V2 전용 mapping Rules
**미작성 · NOT TESTED** · ④ 실제 Firebase/IAM/live **NOT TESTED**. "우회(bypass)" 표현도 폐기하고
**Firestore client read 권한**과 **Storage Rules service-side cross-product 평가**가 주체도 평가
경로도 다른 별개 축임을 명시했다. ②는 `.json` admin-state 경로 검증이고 이번 세션에서 재실행하지
않았다.

**보완 2 — privileged plaintext surface.** 라운드 1의 *"버킷 객체 자체와 같은 신뢰 수준이므로 새로운
노출 경로는 아니다"* 단정을 **폐기**했다. private mapping은 **현재 어디에도 평문으로 존재하지 않는
관계의 사본**을 만들고, 거기에 **Firebase console · Admin SDK · service account · IAM**이라는 별도
접근 표면이 따라붙는다. bucket 접근 주체와 같은 principal/role 집합인지는 **`UNCONFIRMED`**(IAM 구성
미열람). 이것만으로 후보를 금지하지도 승인하지도 않고 **Founder 보안 tradeoff**로 남겼다.

**보완 3 — REC ID 후보 완결성.** 라운드 1의 *"opaque recId는 성립하지 않는다"* 확정을 **폐기**했다.
Storage Rules wildcard가 잡는 값은 bare UUID가 아니라 **세그먼트 전체 `"<uuid>.png"`**다. §Q7.1.1에서
**(c1) transform-0**(REC doc id = 세그먼트 그대로, admin-state G-4 §8.2와 같은 패턴, 문자열 변환 0,
조회 패턴 자체는 VERIFIED → **성립한다**)과 **(c2) 독립 opaque recId + `customMetadata` pointer**
(설치 SDK 근거로 같은 `uploadBytes` 호출에 포함 가능하나 Rules metadata 표면 `UNCONFIRMED`,
access-call 예산 초과 위험, **public-read라 `getMetadata()`로 공개 관측** → recId를 비밀로 둘 수 없고
token 삽입 금지, `updateMetadata` 차단 계약 공백, **GG-4 미승인 schema 확장**)로 나눴다.
두 후보 모두 **확정 orphan을 증명하지 못한다.**

**보완 4 — commit 자기참조 추적 중단.** 라운드 1까지 만들던 "자기 해시 pin" bookkeeping
commit(`534c26f`, `2dd97c4`)을 **더 만들지 않는다. commit은 자기 자신의 해시를 내용에 담을 수 없다** —
그 한계를 숨기지 않고, 상태 문서에는 **push 후 HEAD=origin·ahead/behind 0/0 검증 사실**과 **라운드 2
내용 commit**을 구분해 적으며 해시 정본은 git 이력과 세션 보고에 둔다.

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여로 변동 없다**. 라운드 2에서 primitive 하나가
`UNCONFIRMED` → **VERIFIED**로 올라갔지만 이는 **이미 검증돼 있던 사실의 오분류를 바로잡은 것**이지
새 검증이 아니므로 진행도 근거가 되지 않는다.

위 내용은 라운드 2 제출 당시 기록이다. 그 뒤 Codex 재검수가 (c2)의 access-call 산술·metadata
update 의미·public metadata 근거 수준 세 가지를 지적했고, 상단의 **라운드 3 수행 결과**가 현재
상태다. Founder 선택과 제품 구현은 여전히 시작하지 않았다.

> 라운드 1 제출 당시 기록:

기준 HEAD=origin `534c26f`에서 Codex `CORRECTION_REQUIRED` 세 묶음을 문서에
반영했다. 허용 문서 6개(조사 보고서 · spec073 · STATE · NEXT · CURRENT · live log)만 수정했고
제품 코드/test/`storage.rules`/`firestore.rules`/Firebase config/package/lockfile, `apps/**`,
`packages/**`, 보호 대상 변경은 **0**이다. 실제 Firebase/project/bucket/Firestore/network/live 접근,
emulator 실행, upload/write/read-back/delete/deploy, UID 추측, URL 발급, UI 연결도 모두 0이다.

**보완 1 — private mapping 후보.** 초판의 *"asset↔token 매핑을 평문으로 두면 토큰 비밀성 모델이
반드시 깨진다"* 단정을 **폐기**했다. 그 문장은 매핑이 클라이언트에게 읽히는 경우에만 참이다.
보고서에 §Q7.1을 신설해 client-denied write-once mapping 후보(V2-2′)를 키·필드 후보 3종, 승인 UID
create-only, get/list 거부, 순차 commit vs 같은 transaction+`getAfter()`, crash·미확정·늦은 성공,
Storage Rules 문서 접근 한도 2·quota·default DB·IAM으로 나눠 분석했다. ★ **결정적 한계: 이 후보만으로는
확정 orphan을 증명하지 못한다** — admin-state SDC′를 성립시킨 `head.revision` 같은 단조값이 V2에는
없어 `spaces/{token}` create는 언제 도착해도 성공한다. 승인된 outer 암호문 결론과 O-3 삭제 보류는
그대로 유지된다. UNCONFIRMED 2건(Rules `get()/exists()`의 read 거부 우회 공식 인용 미취득, 연쇄 경로
보간 지원 미확인)을 남겼다.

**보완 2 — `getDoc` 근거·용어.** 설치 `@firebase/firestore` 4.17.0 `dist/index.d.ts:2582-2595` ·
`:1386-1413` 원문을 인용해 근거를 고정했다. server-only reconciliation에 `getDocFromServer`가
필요하다는 결론은 유지하되, *"SDK가 로컬 timeout으로 실패 처리"* 라는 표현은 폐기했다 — 원문상
`setDoc`의 Promise에는 **SDK 자체 timeout이 없고**, 정확한 경계는 **앱이 bounded timeout으로 포기해도
원 Promise와 pending write가 남아 연결 회복 시 서버에 기록된다**는 것이다. API 근거와 실제
emulator/runtime 시나리오 `NOT TESTED`를 분리하고 정확한 설치 소스 경로를 근거 목록에 명시했다.

**보완 3 — 판정 축 분리.** 실패표를 판정 축 A(**[현재 Rules]** / **[목표 후보 Rules]**)와 축
B(**정적 / 설계 / 실행**)로 나눠 §3.1·§3.2·§3.3으로 재구성했다. 같은 assetId 거부를 아직 없는 목표
create-only rule의 PASS로 기록하던 것을 고쳤고(현재는 규칙 부재로 default deny), `spaces`의 `allow
read`가 get/list를 포함한다는 것은 `UNCONFIRMED`가 아니라 **Rules 문언에서 읽은 정적 사실 + 실행
NOT TESTED**로 분리했다. 실행 칸은 전 행 예외 없이 `NOT TESTED`임을 명시했다.

**보완 4 — 기록 기준.** `f1f5d20`은 조사 기록 commit, `534c26f`은 hash-pin 후속 commit,
`63a1dec`이 이번 보완 라운드 1 commit이다. 현재 HEAD=origin `63a1dec`, ahead/behind 0/0.
보고서 머리에 초판 대비 변경 4가지를 요약했다.

JJ-5 선택지도 과장 없이 고쳤다 — B(V2-2′)와 C(backend) **어느 쪽도 지금은 확정 orphan을 증명하지
못하며 어떤 선택도 삭제 승인이 아니다**. 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여로 변동
없다**. 이번 라운드는 문서 정정이라 제품 작업축 완료량을 늘리지 않으며, 오히려 §Q7.1이 매핑을
도입해도 확정 orphan은 여전히 증명되지 않음을 밝혔으므로 **작업축 6의 잔여 난이도는 줄지 않았다.**

위 내용은 라운드 1 제출 당시 기록이다. 그 뒤 Codex 재검수가 세 가지 문서 결함을 지적했고,
상단의 **라운드 2 수행 결과**가 현재 상태다. Founder 선택과 제품 구현은 여전히 시작하지 않았다.

> 이전 상태: **`CORRECTION_REQUIRED` - 스펙 073 문서 보완 라운드 1 대기.**

## 스펙 072 구현 기록

Codex 계약 문서 6개를 문서 commit `96422f8`로, 구현을 `34cca25`로 각각 일반 fast-forward push했다.
HEAD=origin `34cca25`, ahead/behind 0/0이다.

제품 변경은 허용 신규 2파일(`apps/admin/src/space-v2/issue-bundle.ts`와 같은 이름의 unit)뿐이고
기존 spec064~071 제품 파일, package/lockfile/CSS/Firebase/Rules/config/UI diff는 0이다. 실측 순서는
top-level snapshot -> UUID assetId #1 -> UUID token #2 -> SHA #1/#2/#3 -> encrypt #1이며, identity
실패는 `SPACE_V2_BUNDLE_IDENTITY_FAILED`로 preparation/SHA/encryption 0, preparation 실패는
`SPACE_V2_BUNDLE_PREPARATION_FAILED`로 UUID 재생성·retry·upload/create 0이다.

게이트: targeted 58/58, space-v2+spaces 513/513, admin typecheck, `node scripts/check.mjs`
PASS(unit 2084/2084), 전체 Chromium 151/151, 고객 `A9360EFF…E55E8159` 322,018 bytes /
admin `B6E90475…A1F1DC` 226,201 bytes / admin CSS 9,146 bytes, production bundle 신규 식별자 0,
`git diff --check` PASS, 포트/temp/staged 잔류 0. mutation 5종 전부 검출됐다.

Storage upload, Firestore create/reconciliation, URL 발급, 실제 Firebase/Rules/network/emulator/deploy와
viewer/admin UI는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다. 전체 리빌드 진행도는
**78~81% 완료 / 19~22% 잔여**(직전 77~80%에서 +1%p)다. 근거는 local 발급 준비 사슬이 identity까지
포함해 하나의 handle로 닫힌 것이며, 작업축 6·7이 불변이라 상승폭을 1%p로 제한했다.

다음은 Codex 독립 검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 072 계약 준비 완료.**

## 스펙 071 종료 기록

HEAD=origin `0d4aac4`, ahead/behind 0/0에서 구현 `eb3df01`을 독립 검토했다. 기준 `3e0a91a` 이후
제품 diff는 허용 신규 `issue-identity-pair.ts`와 unit 2개뿐이다. method one-read와 receiver 보존,
assetId→token 순서, 0/1/2회 호출 예산, child 오류 비노출, collision fail-closed와 retry 0을 대조했고
추가 결함은 없다.

독립 게이트: targeted 29/29, space-v2+spaces 455/455, `node scripts/check.mjs` PASS(unit 2026/2026),
전체 Chromium 151/151, 고객 `A9360EFF…E55E8159` / admin `B6E90475…A1F1DC`, admin CSS 9,146 bytes,
production bundle 신규 식별자 0, `git diff --check`, 포트/temp/staged 잔류 0. 최종 판정은
**`CODEX_PASSED / DONE`**이다.

스펙 068 preparation 조합, Storage upload, Firestore create/reconciliation, 실제 Firebase/Rules/
network/emulator/deploy와 UI는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다. 전체 리빌드 진행도는
**77~80% 완료 / 20~23% 잔여**를 유지한다. 오늘은 다음 스펙을 시작하지 않는다.

> 이전 상태: **`READY_FOR_CODEX` - 스펙 071 구현·검증 완료, Codex 독립 검수 대기.**

## 스펙 071 구현 기록

계약·HH-1 결정 문서 commit `92540b4`, 구현 commit `eb3df01`. 제품 변경은 허용 2개 신규 파일
(`apps/admin/src/space-v2/issue-identity-pair.ts`와 unit)뿐이고 기존 064~070 제품 파일,
package/lockfile/CSS/config/Rules/`App.tsx`/UI diff는 0이다.

Founder HH-1=A에 따라 proof `assetId`와 public link token을 독립 UUID 두 개로 준비한다. original
`randomUUID`를 첫 호출 전에 한 번만 읽어 callable 검증하고, receiver를 보존하는 adapter로 스펙 069
candidate를 assetId→token 순서로 두 번 호출한다. malformed port면 source 호출 0, 첫 값 실패면 1회,
둘째 값 실패나 collision이면 2회에서 멈추며 세 번째 호출과 자동 retry는 0이다. 두 값이 같으면
`SPACE_V2_IDENTITY_COLLISION`으로 fail-closed하고, 하위 token 오류 code는 밖으로 전달하지 않는다.

★ 범위 한계: UUID v4 형식과 두 값의 차이는 난수 품질·collision freedom의 증명이 아니다.

게이트: targeted 29/29, space-v2+spaces 455/455, admin typecheck, `node scripts/check.mjs` PASS
(unit 2026/2026), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp 잔류 0. admin/고객 entry와
admin CSS 9,146 bytes는 기준과 동일하고 두 bundle에 spec 071 식별자는 0건이다.

전체 리빌드 진행도는 **77~80% 진행 / 20~23% 잔여**다(직전 76~79%에서 +1%p). 근거는 작업축 5에서
issue identity 준비가 닫힌 것이고, 스펙 068 준비 사슬과의 조합·upload·Firestore create·viewer는 여전히
계약상 금지라 상승폭을 제한했으며 작업축 6·7은 불변이다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 071 계약이 준비됐다.**

Founder는 token과 proof `assetId`를 독립 UUID 두 개로 만드는 `HH-1=A`를 승인했다. 결정 정본은
`docs/codex-claude-handoff/decisions/2026-08-21-space-v2-issue-identity-decisions.md`, 구현 계약은
`docs/rebuild/specs/071-space-v2-local-issue-identity-pair.md`, handoff는
`docs/handoff/2026-08-21-spec-071-space-v2-local-issue-identity-pair-handoff.md`다.

스펙 071은 기존 UUID port를 순서대로 두 번 사용해 assetId와 token을 각각 한 번 생성한다. 첫 실패는
두 번째 호출 0, 두 번째 실패는 총 2회에서 중단하며, 두 값이 같으면 명시 collision으로 닫고 자동
retry하지 않는다. 허용 제품 파일은 신규 `issue-identity-pair.ts`와 unit뿐이다. 기존 spec064~070
제품 파일, 스펙 068 preparation 조합, upload, Firestore create, 실제 Firebase/Rules/network/emulator/
deploy와 UI는 계약상 계속 닫혀 있다.

전체 리빌드 진행도는 **76~79% 진행 / 21~24% 잔여로 변동 없다**. HH-1 결정과 계약만 준비됐고
제품 작업축 완료량은 아직 증가하지 않았다. 다음 transition은 `CLAUDE_IMPLEMENTATION`이다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` - 스펙 070은 CODEX_PASSED, token↔assetId `HH-1` 결정을 기다렸다.**

## 스펙 070 종료 기록

스펙 070 계약 문서 commit `53d115c`, 구현 commit `ff3c59a`, 검수 기준 HEAD=origin `3e0a91a`다. 제품 변경은 허용 2개 신규
파일(`apps/admin/src/space-v2/issue-uuid-adapter.ts`와 unit)뿐이고 기존 064~069 제품 파일,
package/lockfile/CSS/config/Rules/`App.tsx`/UI diff는 0이다.

`createSpaceV2IssueUuidPort(source?)`는 표준 `Crypto.randomUUID()` capability 하나만 쓴다. method를
factory 호출당 한 번만 읽어 callable 검증하고 원 source receiver로 호출하며, 생략 시
`globalThis.crypto`를 쓰되 명시 source는 malformed여도 global로 대체하지 않는다. malformed source
7종은 `SPACE_V2_UUID_SOURCE_UNAVAILABLE`이고 global randomness 호출 0이다. adapter는 형식 검증·throw
매핑·호출 횟수·retry를 하지 않으며 그 책임은 스펙 069 candidate가 그대로 갖는다.

★ 범위 한계: Web Crypto를 source로 고른 것은 난수 품질·충돌 부재의 증명이 아니다. 통합 테스트는 실제
값 한 건이 strict 형식을 통과함만 확인하고 분포·entropy를 추정하지 않는다.

Codex 독립 게이트: targeted 21/21, space-v2+spaces 426/426, `node scripts/check.mjs` PASS
(unit 1997/1997), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp 잔류 0. admin/고객 entry와
admin CSS 9,146 bytes는 기준과 동일하고 두 bundle에 spec 070 식별자는 0건이다. 추가 결함 0,
최종 판정은 **`CODEX_PASSED / DONE`**이다.

후속 `HH-1=A` 승인으로 public link token과 proof object `assetId`는 독립 UUID 두 개로 확정됐다.
구현은 별도 스펙 071 범위에서만 진행한다.

전체 리빌드 진행도는 **76~79% 진행 / 21~24% 잔여로 변동 없다**. source adapter는 확정됐지만
token↔assetId 관계·issue bundle·upload·Firestore create는 그대로 닫혀 있고 작업축 6·7도 불변이다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 070 계약이 준비됐다.**

스펙 069 계약 문서 commit `361b1d3`, 구현 commit `e5261a2`, 검수 기준 HEAD=origin `020402c`다. 제품 변경은 허용
2개 신규 파일(`apps/admin/src/space-v2/issue-token-candidate.ts`와 unit)뿐이고 기존 064~068 제품
파일, package/lockfile/CSS/config/Rules/`App.tsx`/UI diff는 0이다.

주입 UUID port의 `randomUUID`를 한 번만 읽어 callable 검증하고 원 receiver로 최대 한 번 호출한다.
성공은 lowercase RFC 4122 UUID v4 형식만이며 trim/lowercase repair, retry, global random fallback은
0이다. 오류는 `INVALID_PORT`/`GENERATION_FAILED`/`INVALID_OUTPUT` 3개이고 실패 결과는 `{ok, code}`
뿐이다. ★ 범위 한계: 형식 검증일 뿐 난수 품질과 충돌 부재는 증명하지 않는다(후속 adapter 계약).

Codex 독립 게이트: targeted 41/41, space-v2+spaces 405/405, `node scripts/check.mjs` PASS
(unit 1976/1976), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp 잔류 0. admin/고객 entry와
admin CSS 9,146 bytes는 기준과 동일하고 두 bundle에 spec 069 식별자는 0건이다. 추가 결함 0,
최종 판정은 **`CODEX_PASSED / DONE`**이다.

다음 정본은 `docs/rebuild/specs/070-space-v2-local-web-crypto-uuid-adapter.md`, handoff는
`docs/handoff/2026-08-21-spec-070-space-v2-local-web-crypto-uuid-adapter-handoff.md`다. 표준
`Crypto.randomUUID()` source를 spec 069 port에 맞추는 local adapter만 만든다. 허용 제품 파일은 신규
admin local module/unit 2개뿐이다. token↔assetId 관계, issue bundle, upload, Firestore create,
Firebase/Rules/network와 UI는 계속 닫혀 있다.

전체 리빌드 진행도는 **76~79% 진행 / 21~24% 잔여로 변동 없다**. 스펙 069 통과로 형식 경계를
확정했고 스펙 070은 계약만 준비됐다. token↔assetId 관계·issue 조합·upload·Firestore create와
작업축 6·7은 그대로다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 069 계약이 준비됐다.**

스펙 068 계약 commit `160eca0`, 구현 commit `31ee0d7`, 검수 기준 HEAD=origin `215af5b`다. 제품 변경은 허용 2개 신규 파일
(`apps/admin/src/space-v2/issue-preparation.ts`와 unit)뿐이고 기존 065·066·067 제품 파일,
package/lockfile/CSS/config/Rules/`App.tsx`/UI diff는 0이다.

세 경계를 한 흐름으로 묶는다: proof(SHA #1) → scene(SHA #2) → document(verify SHA #3 + encrypt #1).
모든 caller 입력(9개 exact key, selection/transform snapshot, password, `readLegacyCatalog` detach,
PNG bytes 복사)과 두 port method 읽기가 첫 await 전에 끝나고, receiver 보존 always-defined adapter를
세 하위 단계가 공유해 global Web Crypto fallback을 닫는다. 단계별 실패는 이후 호출을 0으로 막고,
성공 handle은 descriptor/upload bytes/document의 fresh copy 3종만 제공한다(plaintext scene·password·
token 없음).

Codex 독립 게이트: targeted 59/59, space-v2+spaces 364/364, `node scripts/check.mjs` PASS
(unit 1935/1935), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp 잔류 0. admin/고객 entry와
admin CSS 9,146 bytes는 기준과 동일하고 두 bundle에 spec 068 식별자는 0건이다. 추가 결함 0,
최종 판정은 **`CODEX_PASSED / DONE`**이다.

다음 정본은 `docs/rebuild/specs/069-space-v2-local-issue-token-candidate.md`, handoff는
`docs/handoff/2026-08-21-spec-069-space-v2-local-issue-token-candidate-handoff.md`다. Founder `GG-1=A`의
새 UUID token을 필수 주입 port의 단일 호출과 lowercase UUID v4 검증으로만 분리한다. 허용 제품 파일은
신규 admin local module/unit 2개뿐이다. token↔assetId 관계, 스펙 068 조합, upload, Firestore create,
Firebase/Rules/network와 UI는 계속 닫혀 있다.

전체 리빌드 진행도는 **76~79% 진행 / 21~24% 잔여로 변동 없다**. 스펙 068 통과로 local 준비 사슬을
확정했고 스펙 069는 계약만 준비됐다. 실제 token 발급 조합·upload·Firestore create·viewer와 작업축
6·7은 그대로다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 068 계약이 준비됐다.**

스펙 067 보완 `db61c7d`는 HEAD=origin `c8f54cf`에서 Codex 독립 재검수를 통과했다. 단일 71/71,
확대 305/305, unit 1876/1876, Chromium 151/151과 check/bundle/diff/포트/temp가 모두 PASS했고 이전
일시 timeout은 재발하지 않았다. C-1 해소, 추가 결함 0, 최종 **CODEX_PASSED / DONE**이다.

다음 정본은 `docs/rebuild/specs/068-space-v2-local-issue-preparation-orchestrator.md`, handoff는
`docs/handoff/2026-08-21-spec-068-space-v2-local-issue-preparation-orchestrator-handoff.md`다. 기존
065 scene, 066 proof bytes, 067 encryption 경계를 한 first-await snapshot 흐름으로 조합한다. 허용 제품
파일은 신규 admin module/unit 2개뿐이며 token/UUID, upload, Firestore create, Firebase/network/UI는 0이다.

전체 리빌드 진행도는 **74~77% 완료 / 23~26% 잔여**다. 스펙 067 통과로 local encrypted-document
chain이 닫힌 것을 반영했고, 스펙 068은 계약만 준비돼 추가 상승은 없다.

> 이전 상태: **`DONE / CODEX_PASSED` - 스펙 067 local document encryption candidate.**

보완 commit `db61c7d`. 허용 제품 파일 2개(`document-encryption-candidate.ts`와 해당 unit)만 변경했고
호출 순서·오류 4개·금지 경계는 그대로다.

C-1은 `undefined` SHA port가 `verifyFrameReplayEvidenceDigestV1`의 default Web Crypto port를 여는
문제였다. 이제 두 port의 method를 각자 첫 await 전에 한 번씩만 읽어 callable인지 검증하고, SHA는
항상-defined adapter로 감싸 default가 활성화될 수 없게 했다. 두 호출 모두 원 port의 `this`를
보존하고, crypto도 snapshot한 callable만 1회 호출해 method getter drift를 막는다. invalid SHA port는
EVIDENCE_NOT_VERIFIED, invalid crypto port는 ENCRYPT_FAILED다.

재검증: targeted 71/71, space-v2 180/180, space-v2+spaces 305/305, admin typecheck,
`node scripts/check.mjs` PASS(unit 1876/1876), 전체 Chromium 151/151, bundle identity 불변,
`git diff --check` PASS, 포트/temp 잔류 0. malformed SHA port 7종에서 global `crypto.subtle.digest`
0회와 encryption 0회를 회귀로 고정했다.

전체 리빌드 진행도는 **74~77% 진행 / 23~26% 잔여로 변동 없다**. 이번 보완은 스펙 067 범위 안의 결함
수정이고 새 제품 능력을 열지 않았으며 작업축 6·7도 불변이다.

> 이전 상태: **`CORRECTION_REQUIRED` - 스펙 067 보완 라운드 1 지시.**

candidate `35b7ffd`의 unit 1859/1859, 전체 check, Chromium 151/151과 bundle/diff/포트/temp는 독립
PASS했다. 그러나 런타임 `sha256 === undefined`가 기존 verifier의 default Web Crypto port를 활성화해
필수 주입/global crypto 0 계약을 우회한다.

Claude는 허용 제품 파일 2개 안에서 SHA/crypto method를 첫 await 전에 각 1회 snapshot·검증하고,
always-defined SHA adapter로 default fallback을 닫아야 한다. malformed port, revoked/throwing getter,
method getter one-read와 global digest 0 회귀가 필요하다. 상세는 spec 067 CODEX REVIEW 절과 NEXT다.

스펙 067은 아직 DONE / CODEX_PASSED가 아니다. 전체 진행도는 검수 통과 전 정본인
**72~75% 완료 / 25~28% 잔여**를 유지한다.

> 이전 상태: **`READY_FOR_CODEX` - 스펙 067 최초 구현 완료.**

계약 commit `2107a72`, 구현 commit `35b7ffd`. 제품 변경은 허용 2개 신규 파일
(`apps/admin/src/space-v2/document-encryption-candidate.ts`와 같은 디렉터리 unit)뿐이고
package/lockfile/CSS/Rules/config/`App.tsx`/UI 변경은 0이다.

`readSpaceSceneV2`는 digest 형식만 보므로 암호화 전에 `verifyFrameReplayEvidenceDigestV1`로
evidence↔digest 실제 일치를 검증하고, 통과한 detached scene만 `encryptJson`에 1회 넘긴다. 결과는
`{schema:"space-v2", enc}`로 감싸 `readSpaceDocumentV2`로 재검증한 detached 값이다. SHA-256 1회,
encryptJson 1회, decryptJson 0회, retry 0. PBKDF2/AES-GCM 계약과 password 정책은 기존 것을 그대로
재사용했다.

게이트: targeted 54/54, space-v2+spaces 288/288, admin typecheck, `node scripts/check.mjs` PASS
(unit 1859/1859), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp 잔류 0. admin/고객 entry와
admin CSS 9,146 bytes는 기준과 동일하고 두 bundle에 spec 067 식별자는 0건이다. 실제 `createSpaceCrypto`
로컬 roundtrip도 원 scene과 동일하게 복호화된다(network/Firebase 0).

전체 리빌드 진행도는 **74~77% 진행 / 23~26% 잔여**다(직전 72~75%에서 약 +2%p). 근거는 작업축 5의
V2 암호화 문서 조립이 닫혀 scene→evidence→proof descriptor→암호화 outer까지 로컬 사슬이 이어진
것이며, token 발급·upload·Firestore create·viewer와 작업축 6·7은 그대로라 상단은 77%를 넘기지 않았다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 067 계약이 준비됐다.**

스펙 066은 HEAD=origin `e4bcce9`에서 Codex 독립 검수를 통과해 **DONE / CODEX_PASSED**다. 독립 게이트는
space-v2+spaces 234/234, unit 1805/1805, Chromium 151/151, admin typecheck/build/diff/bundle identity와
포트/temp 잔류 0 모두 PASS다. full PNG decode와 실제 upload/Firebase/token/document create/viewer/UI는
계속 NOT TESTED / 금지다.

다음 정본은 `docs/rebuild/specs/067-space-v2-local-document-encryption-candidate.md`, handoff는
`docs/handoff/2026-08-21-spec-067-space-v2-local-document-encryption-candidate-handoff.md`다. strict
`SpaceSceneV2` detached snapshot의 evidence digest를 기존 verifier와 주입 SHA-256 port로 확인한 뒤
`SpaceCryptoPort`로 한 번 암호화하고 exact `SpaceDocumentV2` outer를 다시 검증하는 local-only 비-UI
단위다. 허용 제품 파일은 신규 admin module/unit 2개뿐이다. token/UUID, upload, Firestore create,
Firebase/Rules/config/network와 UI/viewer는 열지 않는다.

전체 리빌드 진행도는 **72~75% 완료 / 25~28% 잔여**다. 이전 Claude 기록의 72~76%는 상단 유지라는
근거와 모순돼 75% 상단으로 정정했다. 스펙 067은 계약만 준비돼 추가 진척을 계산하지 않는다.

> 이전 상태: **`DONE / CODEX_PASSED` - 스펙 066 local proof asset preparation.**

상태: **`READY_FOR_CODEX` - 스펙 066 local proof asset preparation 구현·검증이 완료됐다.**

계약 commit `1ede90c`, 구현 commit `9fee315`. 제품 변경은 허용 2개 신규 파일
(`apps/admin/src/space-v2/proof-asset-candidate.ts`와 같은 디렉터리 unit)뿐이고 package/lockfile/
Rules/config/`App.tsx`/UI 변경은 0이다.

caller PNG bytes를 await 전에 한 번 복사해 UUID v4 경로·IHDR intrinsic dimensions·SHA-256 descriptor를
같은 snapshot에서 만들고, digest port에는 별도 복사본을 넘기며 `copyUploadBytes()`는 매번 새 복사본을
돌려준다. ★ 범위 한계: full PNG decode/CRC/IDAT/IEND/browser decode는 NOT TESTED이며 성공의 의미는
PNG-header candidate다.

게이트: targeted 55/55, space-v2+spaces 234/234, admin typecheck, `node scripts/check.mjs` PASS
(unit 1805/1805), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp 잔류 0. admin/고객 entry와
admin CSS 9,146 bytes는 기준과 동일하고 두 bundle에 spec 066 식별자는 0건이다.

전체 리빌드 진행도는 **72~76% 진행 / 24~28% 잔여**로, 이전 70~75%에서 하단 경계만 올랐다. 근거는
작업축 5의 byte-identity 하위 작업이 닫힌 것이고, upload/Firestore create/viewer와 작업축 6·7은
그대로라 상단은 유지했다.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 066 계약이 준비됐다.**

정본 `docs/rebuild/specs/066-space-v2-local-proof-asset-preparation.md`, handoff
`docs/handoff/2026-08-21-spec-066-space-v2-local-proof-asset-preparation-handoff.md`. 기준 HEAD=origin
`3681cb9`, ahead/behind 0/0이다.

이번 단위는 PNG bytes를 한 번 복사해 approved UUID path, PNG signature/IHDR dimensions, SHA-256
descriptor와 later-upload용 fresh copies를 같은 local snapshot에 묶는다. 신규 admin non-UI module/unit
두 파일만 허용한다. App/UI/CSS/package/lockfile/Firebase/Rules/config와 실제 network/upload/token/
encryption/document create/viewer/deploy는 금지다.

전체 리빌드 진행도는 **70~75% / 잔여 25~30% 유지**다. 스펙 066은 아직 계약 준비만 완료됐으므로
7개 제품 작업축 상태는 변하지 않았다. Claude 구현·검증 후 `READY_FOR_CODEX`에서 독립 검수를 받는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` - 스펙 065는 DONE / CODEX_PASSED다.**

Claude Code는 2026-08-21에 이 HOLD를 확인하고 **구현하지 않았다**(제품 diff 0, 자동화 생성 0).
재확인 결과: HEAD=origin ahead/behind 0/0, targeted+spaces 179/179, `node scripts/check.mjs` PASS
(unit 1750/1750), admin entry `index-D0XOQpRL.js` 226,201 bytes / customer entry `index-6js4DafP.js`
322,018 bytes / admin CSS `index-DJ_z3tK1.css` 9,146 bytes 모두 스펙 065 종료 기준과 일치했다.
전체 Chromium E2E는 제품 diff가 0이라 재실행하지 않았다.

전체 리빌드 진행도는 **70~75% 진행 / 25~30% 잔여로 변동 없다**. 근거: 이번 턴에 제품 단위가
구현되지 않아 7개 작업축의 상태가 바뀌지 않았고, 수치를 올릴 새 근거가 없다.

전체 리빌드 진행도는 **약 70~75% 진행 / 25~30% 잔여**로 추정한다. 이는 최종 스펙 개수 기반의
정확한 산술값이 아니라 production cutover까지의 7개 작업축 기준 관리 추정치다. 기반·catalog·고객
core·admin local은 크게 진행됐고, space V2 발급/viewer, Claude 담당 최종 UI/UX·시각/실기기/preview,
실제 UID·Rules/Firebase와 production cutover가 주요 잔여다.

Codex는 HEAD=origin `7255012`에서 보완 commit `ec7610e`를 독립 검토했다. 허용 제품 diff 3개와
C-1~C-3 구현은 계약에 정확히 일치하고 추가 결함은 없다. targeted+spaces **179/179**, admin/ui
typecheck, `node scripts/check.mjs` PASS(unit **1750/1750**), 전체 Chromium **151/151**,
`git diff --check dcd893c..HEAD` PASS를 재현했다.

admin entry `index-D0XOQpRL.js` 226,201 bytes / SHA-256 `B6E90475…B3A1F1DC`, customer entry
`index-6js4DafP.js` 322,018 bytes / SHA-256 `A9360EFF…E55E8159`는 기준과 같다. admin CSS 실측은
`index-DJ_z3tK1.css` **9,146 bytes**이고 `.transform`/`.italic`/rotate·skew property scaffold는 0건이다.
이전 9,144 표기는 계수 오류로 정정한다.

실제 Firebase/network/UID/Rules/emulator/deploy와 token/encryption/upload/document create,
issuer/viewer/UI 연결은 계속 NOT IMPLEMENTED / NOT TESTED / 금지다. 활성 구현 스펙은 없으며 다음
수동 지시와 Codex 스펙 전에는 시작하지 않는다.

> 이전 상태: **`READY_FOR_CODEX` - 스펙 065 보완 라운드 1(C-1~C-3)이 완료됐다.**

보완 commit `ec7610e`. 허용 제품 파일 3개(`issue-candidate.ts`, 같은 디렉터리 unit,
`packages/ui/src/theme.css`)만 변경했고 admin package/lockfile 추가 diff는 0이다.

- C-1 `readLegacyCatalog`로 catalog를 1회 detach하고 geometry·art projector가 그 document만 쓴다.
  drifting art getter 회귀 2건을 추가했고 raw getter read는 1회다.
- C-2 `theme.css`에 spec 021 선례와 같은 좁은 `@source not` 1줄을 추가해 admin entry
  `index-D0XOQpRL.js` 226,201 bytes / SHA-256 `B6E90475…B3A1F1DC`와 admin CSS 9,146 bytes를 복원했다.
  `.transform`/`.italic`/transform property scaffold는 0건이고 mockup bundle은 불변이다.
- C-3 handoff EOF blank line 제거로 `git diff --check dcd893c..기록 HEAD`가 PASS한다.

재검증: targeted 54/54, `vitest run packages/spaces` 125/125, `node scripts/check.mjs` PASS
(unit 1750/1750), 전체 Chromium 151/151, 포트/temp 잔류 0. 이전 라운드의 DEVIATION은 해소됐고 게이트
문구는 약화하지 않았다. 다음은 Codex 독립 재검수다.

> 이전 상태: **`CORRECTION_REQUIRED` - 스펙 065 보완 라운드 1 지시.**

Codex는 HEAD=origin `4c6ebf4`에서 candidate `5fc89d2`를 독립 검토했다. 허용 제품 diff 4개는 정확했고
targeted **177/177**, admin typecheck, `node scripts/check.mjs` PASS(unit **1748/1748**), 전체 Chromium
**151/151**, 고객 entry 기준 불변을 재현했다. 그러나 다음 3건 때문에 아직 CODEX_PASSED가 아니다.

1. raw catalog가 geometry와 art projector 사이에서 재독돼 drifting getter가 서로 다른 상태를 만들 수
   있다. canonical `readLegacyCatalog` 1회 detached document를 양쪽이 공유해야 한다.
2. Tailwind가 비-UI `apps/admin/src/space-v2`를 scan해 admin production CSS/hash를 변경했다. 저장소의
   spec 021 선례대로 `packages/ui/src/theme.css`에 이 디렉터리만 exact `@source not` 처리해 bundle
   identity를 복원한다. 게이트를 약화하거나 문자열을 난독화하지 않는다.
3. `git diff --check dcd893c..4c6ebf4`가 spec 065 handoff의 EOF blank line 1건을 보고한다.

허용 보완 제품 파일은 issue candidate 코드/unit과 `packages/ui/src/theme.css`의 narrow source exclusion
뿐이다. 상세는 spec 065 CODEX REVIEW와 NEXT가 정본이다. 상태 `CORRECTION_REQUIRED`, fix round 1,
다음 transition `CLAUDE_CORRECTION`이다.

> 이전 상태: **`READY_FOR_CODEX` - 스펙 065 local issuer projector 구현·검증이 완료됐다.**

계약 commit `e9e0c6d`, 구현 commit `5fc89d2`. 제품 변경은 정본 §3의 허용 4개 파일뿐이다: 신규
`apps/admin/src/space-v2/issue-candidate.ts`, 신규 `issue-candidate.test.ts`, admin package.json의
`@denn/spaces` 한 줄, lockfile의 admin importer 3줄. `App.tsx`/UI/CSS/Firebase/Rules/config와
shared·spaces 제품 파일은 무변경이다.

게이트: targeted unit 52/52, `vitest run packages/spaces` 125/125, admin typecheck,
`node scripts/check.mjs` PASS(unit 1748/1748), 전체 Chromium 151/151, `git diff --check` PASS, 포트/temp
잔류 0. 고객 entry `index-6js4DafP.js` 322,018 bytes와 기준 SHA-256은 불변이다.

★ DEVIATION: 정본 §5의 admin entry hash 불변 게이트만 충족하지 못했다. admin entry JS는
byte-identical(226,201)이고 유일한 차이는 상호 파일명 참조이며 admin JS에 이번 module 코드는 0건이다.
원인은 Tailwind v4 소스 스캔이 evidence 계약 필드명 `transform`(+fixture `italic`)을 utility로 만들어
admin CSS가 9,146 → 9,821 bytes가 된 것이고, 허용 파일 안에서는 제거할 수 없다. 게이트 문구 정정
또는 별도 스펙 중 무엇을 택할지는 Codex 판단으로 남겼다. 상세는 live log와 정본 DONE 절.

> 이전 상태: **`READY_FOR_CLAUDE` - 스펙 065 local issuer evidence projector 계약이 준비됐다.**

정본 `docs/rebuild/specs/065-space-v2-local-issuer-projector.md`, handoff
`docs/handoff/2026-08-21-spec-065-space-v2-local-issuer-projector-handoff.md`. 기준 HEAD=origin
`dcd893c`, ahead/behind 0/0이다.

이번 단위는 existing catalog frame projection과 explicit orientation/logical width/appearance/transform/
proof descriptor를 스펙 064 strict evidence 및 V2 scene candidate로 조립하는 admin local-only 비-UI
경계다. text/clock/template art와 malformed input은 digest 전에 fail-closed한다.

허용 제품 변경은 신규 admin module/unit, admin의 기존 workspace `@denn/spaces` dependency와 lock
importer 최소 변경뿐이다. `App.tsx`, UI/CSS, Firebase/Rules/config, shared/spaces 제품 파일, 실제
network/UID/emulator/deploy, token/encryption/upload/Firestore create/viewer는 금지다.

Claude Code가 구현·검증하고 live log/STATE/NEXT/CURRENT를 `READY_FOR_CODEX`로 맞춘 뒤 Codex가 독립
검수한다. 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` - 스펙 064는 DONE / CODEX_PASSED이고 다음 제품 단위는
> 아직 선택·승인되지 않았다.**

Codex는 HEAD=origin `1f60bc5`에서 구현 commit `0c5d6fa`의 허용 제품 diff를 독립 검토했다. targeted
spaces **107/107**, spaces typecheck, `node scripts/check.mjs` PASS(unit **1696/1696**), 전체 Chromium
**151/151**, 고객 entry 기준 hash, `git diff --check`, 스펙 064 commit의 범위 밖 제품 diff 0,
포트/temp 잔류 0을 확인했다. 기존 보호 대상 Founder/user working-tree 변경은 건드리지 않았다.
추가 결함은 없어 스펙 064를 **CODEX_PASSED / DONE**으로 종료한다.

실제 Firebase/network/UID/Rules/emulator/deploy, issuer/viewer/UI, upload/document create와 V1 migration은
계속 **NOT IMPLEMENTED / NOT TESTED / 금지**다. GG-6은 첫 local-only 계약까지만 승인했으므로 다음
구현은 별도 수동 지시와 새 스펙 전까지 시작하지 않는다.

Claude Code는 2026-08-21에 `Automation/NEXT_CLAUDE_PROMPT.md`를 읽고 active_unit이 `none`임을
확인해 **구현하지 않았다**(제품 diff 0). 기록된 상태만 로컬에서 재확인했다: HEAD=origin `1f60bc5`,
ahead/behind 0/0, staged 0, `node scripts/check.mjs` PASS(unit 1696/1696),
`vitest run packages/spaces` 125/125, 고객 entry `index-6js4DafP.js` 322,018 bytes 및 기준 SHA-256
일치, `git diff --check` PASS. 전체 Chromium E2E는 제품 diff가 0이라 재실행하지 않았다.
보호 대상 spec-018 PNG와 기존 Founder/user working-tree 변경은 건드리지 않았다.

> 이전 상태: **`READY_FOR_CODEX` - 스펙 064 첫 local-only V2 replay evidence 구현·검증이 완료됐다.**

정본 `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`, Founder 결정
`docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`, handoff
`docs/handoff/2026-08-20-spec-064-space-v2-replay-evidence-investigation-handoff.md`.

V2 exactness에는 orientation 외에 발급 시 canonical logical width, effective frame geometry, selected
appearance, proof intrinsic/bytes identity와 renderer contract version이 필요하다. 전체 catalog hash는 실제
plan 영향 범위보다 넓고 unrelated 변경으로 link를 깨므로 closed `FrameReplayEvidenceV1` snapshot +
versioned canonical SHA-256이 권장 후보다. SHA-256은 운영자 서명이나 backend attestation이 아니다.

현재 `proofs/**`는 overwrite/delete 가능하고 `/spaces/{token}` create는 V2 operator 제한이 없다.
Founder는 향후 새 UUID PNG create-only/public-read asset path와 V2 approved-UID Firestore create 방향을
승인했지만, 이는 Rules/UID/Firebase adapter 구현·검증·배포 승인이 아니다. upload와 document create 사이
cross-service atomicity도 없으므로 upload-first 실패 시 orphan, document 결과 unknown reconciliation을
별도 계약해야 한다.

Founder가 **GG-1=A~GG-6=A**를 승인했다. 첫 V2 capability는 image-only single-rect frame으로 좁히고
text/font/template-art/clock/room/gallery를 지원한 척하지 않는다. exact nested keys와 ranges,
`rebuild-space-assets/objects/{lowercase UUID v4}.png`, fixed-position canonical evidence tuple을 정본에
고정했다. SHA-256은 signature/attestation이 아니다.

허용된 `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts`에 strict V2 reader, detached evidence encoder,
injected/local Web Crypto SHA-256 safe create/verify와 unit을 구현했다. 기존 V1 read/open/constants는
무변경이다. structure read 자체는 crypto/network/viewer pipeline을 시작하지 않는다.

구현·계약 commit은 **`0c5d6fa`**다.

targeted **107/107**, 전체 check PASS(unit **1696/1696**), Chromium **151/151**이다. 자체 검수에서
module-scope `TextEncoder`가 미사용 V2 코드를 고객 bundle에 남기는 12-byte drift를 발견해 호출 내부로
옮겼다. 최종 고객 entry는 `index-6js4DafP.js`, 322,018 bytes, SHA-256
`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 기준과 동일하다.

실제 Firebase/network/UID/upload/write/deploy는 0이다. 다음 transition은 `CODEX_REVIEW`다. Rules,
Firebase adapter, issuer/viewer/UI, V1 migration, orphan delete/cleanup은 계속 금지다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` - 스펙 063 V1 안전 차단 viewer UI/UX가 DONE / CODEX_PASSED로 종료됐다.**

정본 `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md`, handoff
`docs/handoff/2026-08-20-spec-063-space-v1-safe-viewer-ui-handoff.md`.

스펙 062 이후 기존 `?space=` 링크는 비밀번호 통과 뒤 `시안을 표시할 수 없습니다.` 한 줄만 보여줬고,
그것도 catalog·proof·font·Canvas plan을 모두 시도한 뒤였다. Founder FF-5=A에 따라 Claude가 UI/UX를
담당해 두 가지를 고쳤다.

`SpacePostAuthFrameView`가 catalog load·proof owner·Image decode·font load·Canvas plan보다 **먼저**
V1 replay 자격을 판정한다. blocked면 그 뒤 단계가 하나도 시작되지 않는다. 인증 전에는 기존처럼
viewer UI와 요청이 0이고, 인증 후 V1에서도 catalog/proof/art 요청 0·Canvas 0·retry 0·자동
fallback/merge/migration 0이다.

구조는 wrapper/child 분리다. wrapper는 `useMemo` 하나만 무조건 호출하고 분기는 자식 컴포넌트 선택이라
조건부 hook 호출이 없다. `SpaceExactFrameComposition`은 module-private라 gate를 우회하는 seam이 없고,
proven 경로의 owner/readiness/font lifecycle 계약은 그대로다. hostile `imgT` accessor는 예외가 아니라
blocked로 떨어진다.

안전 안내는 Modern Studio 토큰만 쓴다. 오류코드·URL·token·비밀번호·ID·SDK 문구 0, Canvas·이미지
placeholder 0, 재시도 버튼 0, 카카오/외부 링크 0. `section[aria-labelledby]` + `h2` + 본문
`role="alert"`, 자동 포커스 이동 없음, 320px 가로 overflow 0.

targeted unit 15/15, 전체 `node scripts/check.mjs` PASS(unit 1627/1627), 전체 Chromium E2E
**151 passed / 0 failed**(변경 전 baseline 실측 3 failed / 145 passed), console error/warning 0,
axe serious/critical 0, 실제 외부 egress 0, package/lockfile/Rules/firebase config diff 0, 포트 잔류 0. 고객 entry `index-6js4DafP.js`
322,018 bytes, SHA-256 `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.

**Founder Q1 = A.** `tests/e2e/space-frame-view.spec.ts` 2건은 기준 커밋 `e9dbb9e`에서 이미 실패
상태였다(스펙 062가 `composeSpaceFramePlan()`을 fail-closed로 바꾼 결과이며, 스펙 062는 FF-5=A 범위
밖이라 E2E를 실행하지도 수정하지도 않았다). Founder가 이 spec 파일만 허용 추가하기로 결정해 안전
차단 기대값으로 갱신했다. fixture `apps/mockup/src/e2e/space-frame-fixture.tsx`는 변경 0이며, 그
계측으로 주입된 catalog reader·readiness factory·font environment 호출 0을 직접 검증한다 —
production route가 할 수 없는 검증이다. 도달 불가해진 canvas 단계 단언의 대체 coverage는 스펙
§7.2에 명시했다.

전체 E2E 실행은 `tests/e2e/mockup-browse.spec.ts` 때문에 보호 대상
`docs/rebuild/results/spec-018/*.png` 2개를 무조건 다시 쓴다. stage/commit/restore하지 않고 working
tree에 그대로 뒀다.

Codex는 구현 HEAD `a28e27a`의 코드·테스트·계약 diff를 독립 검토했고 추가 결함을 찾지 못했다.
targeted unit **15/15**, `node scripts/check.mjs` PASS(unit **1627/1627**), 변경 범위 Chromium E2E
**8/8**, `git diff --check`를 독립 재현했다. Claude의 전체 Chromium **151/151** 결과와 고객 entry
파일명·322,018 bytes·SHA-256도 대조 일치했다. 두 spec-063 시각 결과를 직접 확인했고 안전 차단 화면의
계층·문구·모바일 wrapping에 결함을 찾지 못했다. 포트와 검수 temp 잔류는 0이다.

실제 V2 schema/fingerprint/issuer, admin orientation UI, V1 migration/재발급/same-token rewrite, 실제
Firebase/network/운영 데이터/pixel parity/write/publish/deploy/cutover는 NOT TESTED/NOT IMPLEMENTED
또는 금지다. 스펙 063은 **DONE / CODEX_PASSED**이며 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` - 스펙 062 V1 방향·사진 transform 재현 차단이 완료됐다.**

V1 scene은 `frameImgT`는 저장하지만 portrait/landscape mode와 capture logical canvas/zone/image basis,
catalog revision을 저장하지 않는다. legacy x/y는 absolute logical px이고 current x/y는 maxPan 기준
normalized 값이다. `rot=0`도 portrait와 unrotated landscape를 구분하지 못한다.

따라서 현재 identity-looking transform 성공은 전체 frame exact replay를 증명하지 않는다. Founder는
**FF-1=A~FF-5=A**를 승인했다: V1 exact replay fail-closed, heuristic 변환 0, future version 분리,
자동 migration 0, 첫 correction은 pure classifier/plan gate/unit만 수행한다.

구현 `a09278a`. V1 classifier가 malformed/unsupported/orientation-unconfirmed를 분리하고 frame plan은
catalog/width/proof/template-art/text-measure/Canvas plan 접근 전에 fail-closed한다. targeted 59/59, 전체
non-network check PASS(unit 1612/1612), production build PASS. 고객 entry `index-Df973d19.js` 320,713 bytes,
SHA-256 `4389D6D60367314FF80FC0793E1085C6646DAD946FA23CA2A3911013331A2453`.

browser/E2E 실행·수정은 FF-5 범위 밖이라 0이다. 스펙 061의 V1 Canvas 성공 E2E 기대는 현재 정책과
양립하지 않으며 다음 Claude UI/UX 인계에서 안전 오류 기대값으로 변경해야 한다. V2 발급 화면,
partial replay 안내와 orientation 선택·표시는 실제 UI/UX 단계이므로 Codex는 구현하지 않는다. 실제
V2 schema/fingerprint, Firebase/network/운영 scene/pixel parity/deploy는 NOT TESTED/NOT IMPLEMENTED다.
다음 작업은 Claude 수동 인계이며 자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` - 스펙 061 production frame route 연결이 완료됐다.**

Founder EE-1=A~EE-5=A에 따라 production `SpaceRoute`의 ready seam에 `SpacePostAuthFrameView`와
production `publicCatalogReader`를 연결했다. production default controller를 유지하고 root에는 합성 검증용
controller factory 하나만 추가했다.

non-production fixture는 production root/default reader/browser Image owner를 사용한다. Playwright가 모든
HTTPS를 정규식 catch-all로 intercept하고 exact catalog/proof만 합성 응답해 실제 외부 egress를 0으로
유지했다. pre-auth 요청 0, ready Canvas 1, invalid catalog fail-closed, unmount 뒤 late proof 차단과 비밀
비노출을 검증했다.

자체 검수에서 문자열 glob catch-all이 의도대로 동작하지 않아 신규 E2E 3개가 실패한 사실을 발견했고
정규식으로 교정했다. 구현 `cf13a2a`. 전체 check PASS(unit 1609/1609), Chromium 148/148. 고객 entry
`index-CVr4hkHb.js` 322,548 bytes, SHA-256
`E70626F22B181C3BC5DBCE4F5B6B644E3AC026B814ECFAE3AC8D1738D9384334`.

실제 Firebase/project/config/network/CORS/운영 object, 실제 모바일·운영 폰트 시각 정확도,
room/gallery/clock/non-neutral transform, 편집·인쇄·주문·발행·write/delete/deploy/cutover는
NOT TESTED/NOT IMPLEMENTED 또는 금지다. 다음 단위는 자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` - 스펙 060 post-auth frame view가 완료됐다.**

Founder DD-1=A~DD-5=A에 따라 ready-only scene seam, injectable post-auth view, source-bound readiness owner,
measured content width와 conditional exact-font gate를 구현했다. catalog→asset→owner→width→font→plan의 현재
성공이 모두 증명된 경우에만 Canvas를 mount한다.

자체 검수에서 StrictMode가 state initializer를 두 번 호출할 때 effect 밖 첫 owner가 유실될 수 있는 결함을
발견했다. inert initializer + effect setup 소유 controller로 보완했고 development React fixture의 실제
setup→cleanup→setup 및 추가 unmount/remount에서 exact dispose와 subscription 잔류 0을 검증했다.

구현 `6670fb3`, 보완 `98f4430`. `pnpm check` PASS(unit 1608/1608), Chromium 145/145 PASS. 고객 entry
`index-DhJYvhRi.js` 304,713 bytes, SHA-256
`C724A8941A5935A685B624EB3DF4A7081EEB8778E83C92BCB8CF7073D3C6B758`.

production `App.tsx` 연결, 실제 Firebase/network/CORS/운영 object, 실제 다양한 폰트·viewport 시각 검증,
편집·인쇄·주문·발행·write/delete/deploy는 NOT TESTED/NOT IMPLEMENTED 또는 금지다. 다음 단위는 자동
시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 059 frame asset request projector가 완료됐다.**

Founder CC-1=A~CC-5=A에 따라 첫 구현 범위인 pure projector/unit만 구현했다. detached catalog snapshot,
exact scene reference, proof trust, art placement/projection/public-image trust를 all-or-nothing으로 적용한다.
hostile getter는 snapshot에서 1회만 읽고 실패 결과에는 source/비밀 원문이 없다. 구현 `3c5b3ed`.

targeted 11/11, 전체 check unit 1602/1602, Chromium 143/143 PASS. 고객 entry
`index-Det4NToI.js` SHA-256 `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`
전후 동일. 실제 network/React/layout/font/Image/Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 단위는 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 059 post-auth view composition 조사가 완료됐다.**

space route는 인증 성공 뒤에도 public catalog를 load하지 않아 frame plan 입력이 없다. readiness adapter에
전달할 proof/art source를 exact references, placement, image projection, Firebase public-image trust로 한 번에
결정하는 pure projector도 필요하다.

권장 결정은 CC-1=A(post-auth catalog만), CC-2=A(pure asset projector), CC-3=A(measured width),
CC-4=A(exact font gate/plan-ready Canvas), CC-5=A(첫 구현 projector/unit만)다. 정본은
`docs/rebuild/specs/059-space-post-auth-view-composition-investigation.md`다. Founder가 모두 A로 승인했다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 058 source-bound readiness adapter가 완료됐다.**

Founder BB-1=A~BB-5=A에 따라 adapter가 raw proof/art owner를 독점 소유한다. exact source, current ready,
owner-specific ref, intrinsic size와 live binding을 모두 요구하고 replacement/clear 전에 source와 직전 ref를
무효화한다. composite bindings와 subscriber/hostile factory 격리를 검증했다. 구현 `f30bc8a`.

targeted 8/8, 전체 check unit 1591/1591, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Image/network/
CORS/React/post-auth catalog/layout/font/Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 post-auth view composition의 catalog/load/layout/font/Canvas 경계 조사이며 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 058 source-bound readiness adapter 조사가 완료됐다.**

기존 proof/template-art owner의 ready state는 source identity를 노출하지 않으므로 현재 scene과의 exact
연계를 스스로 증명하지 못한다. 안전한 adapter는 owner를 독점 소유하고 exact source, current ready state,
exact binding 존재를 모두 확인해야 한다. source-first replacement/clear/dispose와 combined subscription/
bindings가 필요하다.

권장 결정은 BB-1=A(framework-free adapter), BB-2=A(raw owner 독점), BB-3=A(source+ready+binding),
BB-4=A(source-first lifecycle/composite), BB-5=A(local fake unit만)다. 정본은
`docs/rebuild/specs/058-space-source-bound-readiness-investigation.md`다. 결정 전 구현하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 057 view-only frame plan composition이 완료됐다.**

Founder AA-1=A~AA-6=A에 따라 pure composer를 구현했다. exact proof URL trust, neutral transform,
source-bound proof/art readiness, geometry, clock/layout/text 조건을 순서대로 검증하며 stale/untrusted/not-ready
실패는 부분 plan 없이 닫는다. 성공도 `replayComplete:false`다. 구현 `ad0a647`.

targeted 18/18, 전체 check unit 1583/1583, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 owner adapter,
Firebase/network/Image/font/Canvas/React/UI/clock/room/gallery/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 source-bound readiness adapter/hook composition 경계 조사이며 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 057 view-only frame plan composition 조사가 완료됐다.**

scene reference, neutral proof transform, proof owner, geometry와 product plan은 준비돼 있다. 첫 순수 합성은
caller 제공 logical width와 nonempty text용 measure port, proof/art ready binding을 요구한다. template art는
none 또는 externally ready stretch만 허용하고 unsupported/missing은 whole-plan fail-closed한다.

clock는 frame plan 밖이므로 `clockOn === false`만 plan-ready로 본다. room/gallery도 미지원이므로 성공도
`replayComplete:false`다. 권장 결정은 AA-1=A(pure composer), AA-2=A(trust 순서+whole-plan fail-closed),
AA-3=A(width/measure 주입), AA-4=A(clock false만), AA-5=A(art none/ready stretch만)다. 정본은
`docs/rebuild/specs/057-space-view-only-frame-plan-investigation.md`다. 결정 전 구현하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 056 proof image owner가 완료됐다.**

Founder V-1=A~V-5=A에 따라 dedicated framework-free owner를 구현했다. owner 내부 trust 재검증,
CORS-before-src, one-active generation, safe ready intrinsic/binding, replacement/clear/dispose late-result 차단을
injected fake로 검증했다. 구현 `8d93f98`.

targeted 13/13, 전체 check unit 1565/1565, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Firebase/
network/Image decode/CORS, React hook, plan/UI/renderer/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2-C view-only frame plan composition 경계 조사이며 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 056 remote proof image owner 경계 조사가 완료됐다.**

current plan/executor는 URL이 아닌 decoded drawable binding과 intrinsic size를 요구한다. template-art owner
패턴은 검증됐지만 proof trust 재검증과 전용 ready snapshot이 없으므로 dedicated framework-free owner가
필요하다.

권장 결정은 V-1=A(dedicated owner), V-2=A(owner 내부 trust), V-3=A(CORS/one assignment/no retry),
V-4=A(one-active generation), V-5=A(controller/fake unit만)다. 정본은
`docs/rebuild/specs/056-space-proof-image-owner-investigation.md`다.

V-1~V-5는 모두 A로 승인되어 dedicated local owner 구현이 완료됐다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 055 V2-A proof image 경계가 완료됐다.**

Founder T-1=A~T-5=A에 따라 exact HTTPS host/bucket, canonical once-encoded `proofs/` object와 constrained
media query를 검증한다. exact neutral legacy transform만 current identity로 투영하고 non-neutral은
unsupported로 닫는다. 구현 `82d89ce`.

targeted 38/38, 전체 check unit 1552/1552, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Firebase/
network/object/image decode/CORS, image owner, plan/UI/renderer/room/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2-B remote proof image owner 경계 조사이며 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 055 proof image·view-only plan 경계 조사가 완료됐다.**

기존 image trust는 known bucket까지만 검사해 `proofs/` object prefix/query를 증명하지 않는다. current
plan은 URL이 아니라 CORS-first load 뒤 synthetic imageRef/intrinsic size를 요구하며, neutral 외 legacy
transform은 current normalized transform으로 변환할 근거가 없다.

권장 결정은 T-1=A(exact proof prefix), T-2=A(constrained media query), T-3=A(neutral-only),
T-4=A(V2-A pure unit만), T-5=A(별도 view-only composition)다. 정본은
`docs/rebuild/specs/055-space-proof-image-view-plan-investigation.md`다.

T-1~T-5는 모두 A로 승인되어 V2-A local-only 구현이 완료됐다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 054 V1 scene reference validator가 완료됐다.**

Founder S-1=A/S-2=A/S-3=A/S-4=A/S-5=A에 따라 `CatalogDocumentV1 + SpaceSceneV1`의 frame 참조를
local-only로 재검증한다. exact template/visible size/compatibility, exact ID/fill 단일 solid color,
필수 HTTPS photo 후보만 통과한다. fallback·자동 선택·raw ID/URL/text 출력은 0이다.

transform은 `validated-unapplied`, room/gallery는 `unsupported`, `replayComplete:false`로 유지한다.
targeted 19/19, 전체 check unit 1514/1514, Chromium 143/143 PASS. 고객 entry/hash 동일. 구현 `62aa9d8`.

실제 Firebase/network/image fetch/proof prefix trust/UI/renderer/room/deploy는 NOT TESTED/NOT IMPLEMENTED다.
다음 후보는 V2 proof URL trust + view-only frame plan 경계 조사이며 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 054 space scene application 경계 조사가 완료됐다.**

scene은 frame-only이며 tpl/size/color를 catalog와 대조하는 API가 없다. legacy imgT x/y는 Canvas px,
현재 transform은 normalized maxPan 비율이고 capture 크기가 payload에 없어 정확 변환은 UNCONFIRMED다.
proof URL은 `proofs/` 전용 trust가 필요하고 room/gallery renderer는 없다.

권장 결정은 S-1=A(V1 순수 참조 검증기), S-2=A(frame-only 필수 exact 참조),
S-3=A(exact ID/fill의 canonical solid만), S-4=A(transform 미적용),
S-5=A(room/gallery unsupported)다. 정본은
`docs/rebuild/specs/054-space-scene-application-boundary-investigation.md`다.

S-1~S-5는 모두 A로 승인되어 V1 local-only 구현이 완료됐다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 053 production space composition이 완료됐다.**

Founder R-1=A/R-2=A/R-3=A/R-4=A에 따라 space 독점 mode, exact-true complete config,
explicit-submit lazy named Firebase facade, password UI와 StrictMode lifecycle을 구현했다. no-space만 기존
browse를 mount하며 invalid/disabled config는 SDK init/request 0으로 fail-closed한다.

targeted 32/32, 전체 check unit 1495/1495, Chromium 143/143 PASS. 고객 entry
`index-Det4NToI.js` 304,634 bytes, SHA-256
`A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`. 구현 커밋 `5e4be63`.

scene은 검증된 ready snapshot까지만 도달한다. 실제 Firebase/project/config/token/document/network/deploy와
preview/image/room scene 적용은 NOT TESTED/금지다. 다음 후보는 catalog 참조 검증 + view-only scene
application 경계 조사이며 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 053 production space composition 조사가 완료됐다.**

현재 App은 space query 분기 없이 catalog를 즉시 load한다. 스펙 052 controller와 read/open port는 준비됐지만
React UI, env config, lazy production factory, scene application port는 없다. decrypt scene의 ID/URL/opaque
room 설정은 catalog/CORS/renderer와 아직 대조되지 않았다.

권장 결정은 R-1=A(space 독점/invalid fail-closed), R-2=A(exact-true complete config + submit lazy init),
R-3=A(password gate와 ready snapshot까지만), R-4=A(후속 catalog 검증 + view-only scene port)다.
정본은 `docs/rebuild/specs/053-space-production-composition-investigation.md`다.

결정 전 제품 구현 0. 실제 Firebase/project/token/document/network/config/deploy/scene 적용은 금지다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 052 space link/open controller가 완료됐다.**

순수 `?space=` parser와 injected Firestore reader + spaces open port controller를 구현했다. 비밀번호 오류
재시도는 암호문을 메모리에서 재사용하고 network retry만 재조회한다. duplicate submit, detach/late result,
safe error를 고정했다. targeted 17/17, 직접 `node scripts/check.mjs` unit 1479/1479,
Chromium 141/141, 고객 hash 동일, 포트/temp/debug 잔류 0. 구현 커밋 `49f51fb`.

`pnpm check` wrapper는 PATH pnpm 11.19의 dependency-status install 시도로 실행되지 않았다. Corepack 고정
pnpm 11.15.1 frozen install은 기존 build script 미승인 때문에 exit 1이었지만 resolved/reused 161,
downloaded 0으로 node_modules는 복구됐다. build 승인·workspace 설정 변경은 하지 않았고 동일 정본
check entrypoint를 직접 실행해 전체 게이트를 통과했다.

실제 Firebase/project/token/document/network/route UI/scene application/deploy는 NOT TESTED다. 다음 후보는
production 연결 전 password UI composition, Firebase config/factory, scene 적용 경계 조사이며 다음 스펙은
자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 051 space Firestore read adapter가 완료됐다.**

Founder Q-1=A/Q-2=A/Q-3=A 승인에 따라 `@denn/firebase/space-read` 서브패스에 공식 document-ID
validator, injected port와 named-app SDK facade를 구현했다. targeted 30/30, `pnpm check` unit 1462/1462,
Chromium 141/141, 고객 hash 동일, 포트/temp 잔류 0. 구현 커밋 `eb7bb2b`.

실제 Firebase/project/token/document/network/route/UI는 NOT TESTED다. 다음 후보는 local-only query parsing과
reader/open 합성 controller이며 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 051 space Firestore read adapter 조사가 완료됐다.**

실제 Firebase/network 없이 현재 Rules, legacy, 설치 SDK 12.17.1과 Firebase 공식 문서를 확인했다.
기술 구현은 가능하지만 custom token 호환, cache source, named app 소유를 먼저 결정해야 한다.
권장값은 **Q-1=A/Q-2=A/Q-3=A**다. 조사 커밋 `cb97129`.

결정 전 adapter 코드/package export/Rules/config를 변경하지 않는다. 실제 project/token/document/emulator/
deploy는 NOT TESTED/금지다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 050 space local read pipeline이 완료됐다.**

document 검증 → password 검증 → decrypt → scene 검증 순서의 local-only 순수 open port를 구현했다.
단계별 실패 후 후속 호출 0과 safe error를 검증했다. targeted 54/54, `pnpm check` unit 1432/1432,
Chromium 141/141, 고객 hash 동일, 포트/temp/debug 잔류 0. 구현 커밋 `cee79c8`.

실제 Firebase/Firestore/token/link/network/route/UI는 NOT TESTED다. 다음 후보는 Firestore read adapter
계약 조사이며 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 049 space document·scene read가 완료됐다.**

`@denn/spaces`에 `space-v1` document와 `space-scene-v1` plaintext의 순수 reader를 구현했다.
known field만 detached snapshot으로 투영하며 malformed/hostile 입력은 안전 실패한다. targeted 44/44,
`pnpm check` unit 1422/1422, Chromium 141/141, 고객 hash 동일, 포트/temp 잔류 0. 구현 커밋 `3111837`.

실제 Firestore/token/link/network/scene UI는 NOT TESTED다. 다음 후보는 local-only 순수 read pipeline이며
다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 048 legacy space crypto envelope가 완료됐다.**

Founder 지시로 운영 전환을 보류했다. `@denn/spaces`에 legacy PBKDF2 120000/SHA-256 → AES-GCM-256,
salt 16 bytes, IV 12 bytes, standard base64 `{salt,iv,ct}` port를 구현했다. fixed vector와 hostile 입력을
검증했고 targeted 20/20, `pnpm check` unit 1396/1396, Chromium 141/141, 고객 hash 동일,
포트/temp 잔류 0. 구현 커밋 `283807a`.

실제 기존 Firestore 문서/`?space=` 링크/scene 적용은 NOT TESTED다. 다음 후보는 local-only document
shape와 scene validation/projection이며 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 047은 완료됐고 운영 상한·실제 UID 정본을 기다렸다.**

Founder L-1 canary 한정값/L-2=A/L-3=A에 따라 별도 synthetic transitional Rules, demo-only emulator
config, fail-closed cutover manifest를 구현했다. manifest 12/12, cutover emulator 4/4, `pnpm check`
unit 1378/1378, Chromium 141/141, 고객 hash 동일, 포트/temp 잔류 0. 구현 커밋 `b8f1ac4`.

실제 운영 Rules/config는 변경하지 않았다. 다음 입력은 일반 운영 객체/byte/저장 빈도 상한과 확인
주기·책임자, 실제 승인 운영자 UID 정본이다. 이 값 전에는 Firebase/network/deploy/write/legacy close를
열지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 046 단계적 cutover 계약의 L-1~L-3 결정을 기다렸다.**

Founder K-1=A/K-3=A를 확정했다. 목표 순서는 Firestore transitional → Storage transitional →
write-disabled app → 제한 canary → legacy close다. 각 서비스 배포를 원자적이라고 가정하지 않으며,
actual-write 후에는 Hosting만 legacy로 되돌리거나 legacy에 fallback/write-back하지 않는다.

실제 UID·비용/용량 상한·관찰 주체가 없어 운영 전환은 계속 차단된다. 남은 결정은 L-1 비용·관찰 계약,
L-2 dual-window legacy 접근, L-3 canary와 close 기준이다. 권장값은 모두 A다. 제품 코드·Rules/config/test/
package/lockfile 변경과 실제 Firebase/network/deploy/write는 0이다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 045 local Hosting 패키징은 완료됐고 K-1/K-3 결정을 기다렸다.**

K-2=A 방향으로 OS temp allowlist staging을 구현했다. 고객 build는 `/`, `/admin/` base의 admin build는
`/admin/`에 두고 legacy HTML 두 개만 추가한다. 실제 `firebase.json`은 수정하지 않고 temp candidate
config만 생성한다. targeted 18/18, `pnpm check` PASS(unit 1366/1366), Chromium 141/141,
고객 hash 동일, 포트 4183/4184/4185와 temp 잔류 0. 구현 커밋 `c896fbe`.

실제 Firebase/network/UID/Rules·Hosting 배포/운영 쓰기·발행·delete는 NOT TESTED/금지다.
K-1 비용·용량 상한과 K-3 actual cutover 전략은 아직 미결정이며 다음 구현은 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 044 admin write cutover 준비도 조사가 완료됐다.**

운영 write는 **NOT READY**다. 실제 UID 정본이 없고, G-4 D-2=O-3/D-3=N은 비용 상한을 정하지
않았으며, 현재 `firebase.json`은 `hosting.public: "."`라 Vite admin의 안전한 배포 artifact/route가
없다. 최종 Rules를 먼저 배포하면 legacy 저장이 닫혀 무저장 구간이 생기며, actual-write 뒤 Hosting만
rollback해도 rebuild head 변경은 legacy로 돌아가지 않는다.

권장 결정은 K-1=A(비용/용량 상한 전 차단 유지), K-2=A(local-only Hosting 패키징 스펙 045),
K-3=A(transitional Rules→app→legacy close 방향)다. 제품 코드·Rules/config/test 변경과 실제
Firebase/network/deploy/운영 쓰기는 0. Founder 결정 전 다음 구현을 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 043이
> `DONE / CODEX_PASSED / LOCAL_GATED / PRODUCTION_WRITE_DISABLED`로 종료됐다.**

Founder Y-2=A/Y-3=A/Y-4=A/Y-5=A에 따라 app composition root가 config 1회, auth port 1개와
legacy read port를 공유하고 write session을 별도 exact-true gate 뒤에 둔다. write-enabled composition은
auth-only card와 C5 editor를 표시하며, write facade/port는 첫 명시 baseline load 때만 생성된다.

합성 fixture도 실제 composition root를 사용해 factory load 전 0/후 1을 검증했다. targeted 52/52,
`pnpm check` PASS(unit 1363/1363), Chromium 139/139, 고객 JS hash 동일. 구현 커밋 `41e86e1`.
운영 write flag는 설정하지 않았고 실제 Firebase/emulator/UID/IAM/Rules 배포/운영 쓰기·발행·delete는
NOT TESTED/금지다. 다음 전이는 `NEXT_MANUAL_TASK`다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — 스펙 043 production 연결 전 composition 계약 조사가 완료됐다.**

Y-1=A에 따라 문서 전용으로 확인했다. 현재 read env factory는 auth/read port를 내부에 감춰 write
session과 같은 auth instance를 공유할 composition API가 없고, legacy-only read load와 C5 baseline
load를 그대로 함께 노출하면 의미가 다른 중복 동작이 된다. 실제 UID·Rules cutover 전 write만 닫는
별도 enable gate도 없다.

권장 결정은 **Y-2=A**(단일 composition/auth 권위), **Y-3=A**(production auth-only card),
**Y-4=A**(별도 exact-true write gate), **Y-5=A**(명시 load 시 rejection-safe lazy write 생성)다.
제품 코드·Rules/config/test/package/lockfile 변경과 실제 Firebase/network/emulator/배포/운영 쓰기는 0.
Founder 결정 전 구현과 `App.tsx` 연결을 시작하지 않는다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 042가
> `DONE / CODEX_PASSED / LOCAL_ONLY / FIXTURE_ONLY / NO_APP_WIRING`으로 종료됐다.**

Founder X-1=A/X-2=A/X-3=A에 따라 합성 auth/write fake와 실제 session controller/editor를 연결한
별도 Chromium fixture를 구현했다. production `App.tsx`·composition·Firebase adapter/network는 0이다.
명시적 load, 선택·prefill, invalid, exact-base save, conflict/outcome-unknown, discard reload를 검증했다.

`pnpm check` PASS(unit 1356/1356), Chromium 139/139(신규 5), 고객 JS hash 동일,
`git diff --check` PASS. 구현 커밋 `d0fb7c3`. 실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/
UI 연결/delete/발행은 NOT TESTED/금지이며 다음 전이는 `NEXT_MANUAL_TASK`다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 041이
> `DONE / CODEX_PASSED / LOCAL_ONLY / NO_APP_WIRING`으로 종료됐다.**

Founder V-1=A/V-2=A/V-3=A 및 W-1=A에 따라 stable ID immutable edit, 격리 React editor,
baseline provenance, same-port exact load precondition, legacy field 불변 검사와 승격 canonical payload
제거를 구현했다. legacy field 포함 size는 읽기 전용이다.

독립 보완으로 invalid partial 초안의 dirty 상태 오류를 수정했다. targeted 74/74, 전체 unit 1356/1356,
Chromium 134/134, 고객 JS hash 동일. 구현 커밋 `27e6ff4`. `App.tsx` 연결·실제 Firebase/emulator/
운영 쓰기·Rules/config/deploy는 0이며 계속 금지다. 다음 전이는 `NEXT_MANUAL_TASK`다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 040 write-session controller가
> `DONE / CODEX_PASSED / LOCAL_ONLY / NO_UI`로 종료됐다.**

현재 UI는 baseline catalog/revision을 보존하지 않고 print-size draft도 특정 frame size에 연결되지 않아
저장 버튼을 바로 추가할 수 없다. 권장안은 write-session controller를 먼저 분리하는 U-1=A,
dirty 재로드 명시 폐기 확인 U-2=A, 확정 upload 실패도 자동 retry 0인 U-3=A다.

변경 제품 범위는 `apps/admin/src/admin-write/session-controller.ts` + unit뿐이다. targeted 9/9,
독립 검수 결함 2건을 보완해 targeted 11/11, 전체 unit 1333/1333 PASS, 추가 결함 0이다.
Chromium 134/134와 고객 hash 동일도 유지한다. 실제 Firebase·UID·IAM·배포·UI 저장·delete·발행은
금지다. 구현·계약 커밋은 **`1160bc4`**다. 다음 전이는 `NEXT_MANUAL_TASK`다.

> 이전 상태: **`WAITING_FOR_NEXT_MANUAL_TASK` — 스펙 039 Structure A 식별 구조가
> `DONE / CODEX_PASSED / LOCAL_ONLY`로 종료됐다.**

REC은 upload 전 `/rebuildAdminStateObjects/{UUID.json}`에 write-once로 생성되고, head는 `recId`와
REC의 `claimedBase`를 검사한다. 로컬 게이트: targeted unit **51/51**, Firebase typecheck PASS,
`pnpm check` PASS(unit **1322/1322**), Chromium E2E **134/134**, demo emulator Rules **13/13**.

**실제 삭제·delete 권한·자동 정리·보존 스케줄·IAM 활성화·실제 UID·배포·UI 연결은 여전히 금지다.**
Codex 독립 검수 발견 결함은 0이다. 구현·종료 커밋 `7843e85`을 일반 fast-forward push했고
HEAD=origin, ahead/behind 0/0이다. 다음 전이는 `NEXT_MANUAL_TASK`이며 다음 스펙은 자동 시작하지 않는다.

> 이전 상태: **`FOUNDER_DECISION_REQUIRED` — G-4 보완 라운드 2 문서가 Codex 검수를 통과**했다
(`DOCUMENT_REVIEW_PASSED`, 2026-08-11, 기준 HEAD=origin=`eae9be4`).
**오늘 세션은 여기서 종료하며 다음 작업은 자동으로 시작하지 않는다.**
`completed_unit`은 **`spec-037-admin-write-c5-emulator` — DONE / CODEX_PASSED** 유지,
`next_transition = FOUNDER_G4_D1_D3_DECISION`.

> ### ★ Codex 최종 판정
>
> - **G-4 보완 라운드 2 문서 검수 통과** — **`getAfter()` 원자성 정정 · transaction 시간 제한 정정 ·
>   REC ID 매핑 정정**이 모두 반영됐다.
> - **구조 A와 B는 모두 "가능한 후보"로만 기록됐고 어느 것도 채택되지 않았다.**
> - **구조 A/B 및 REC·Rules 동작은 NOT TESTED다.**
> - **실제 삭제 · 자동 정리 · Rules 변경 · head 스키마 변경 · 클라이언트 delete 권한 ·
>   IAM 활성화 · 구현·배포 승인이 아니다.**
> - **현재 기본 정책은 계속 `O-3 삭제 보류`다.**
> - **다음 단계는 Founder의 D-1~D-3 결정이며 오늘은 결정하지 않는다.**
>
> ⚠️ **G-4 문서 6개는 여전히 미커밋·미스테이지**다. 커밋 여부는 별도 지시를 따른다.

> **이전 상태(참고)** — 보완 라운드 2를 적용했다. Codex 재검수 3건 중 **또 두 건이 내 사실 오류**였다.
정본 `decisions/2026-08-11-g4-orphan-retention-decisions.md`(신규).
**⚠️ 이 라운드의 문서는 지시에 따라 `commit`·`push`·`stage`하지 않았다** — 워킹 트리에 미커밋으로 남아
**Codex 검수 대기**다. **제품 코드·Rules·config·test·`package.json`·lockfile 변경 0**,
**실제 객체 조회·나열·삭제 0**, 실제 Firebase·network·live·운영 데이터·실제 UID 접근 0,
배포·운영 쓰기·UI 연결·발행·자동 정리·C6·L-4 구현 0, 자동화 0.
**다음 = Codex 재검수(수정된 안전성 증명을 먼저 검수) → 그 뒤에 Founder에게 D-1~D-3.**
그 전에는 구현 계약도 구현도 시작하지 않는다. **변경 문서는 6개다.**

> ### ★★ 보완 라운드 2 — 정정한 3건
>
> 1. **★ `getAfter()` 누락으로 원자성 설명이 틀렸다.** 라운드 1의 **"형제 쓰기를 볼 수 없다"** ·
>    **"REC과 head를 같은 transaction으로 묶을 수 없다"** 는 **폐기**한다. 공식 문서:
>    *"`getAfter()` … access the state of a document **after a transaction or batch of writes
>    completes but before the transaction or batch commits**."* → **구조 B가 가능하다.**
>    A(순차)/B(원자 동반)를 8항목으로 재비교했다. **★ 역전**: B는 crash 시 **REC이 안 남아
>    업로드된 객체를 SDC′로 영원히 판정할 수 없고**, A는 REC이 남아 **실패 산물까지 회수 가능**하며
>    **Storage create 단계 stray 차단**도 된다. 대신 B는 **원자성 서버 강제 + 계약 변경 최소**.
>    **어느 쪽도 채택하지 않았고 둘 다 NOT TESTED.**
>    **★ 한도 분리**: **Storage Rules → Firestore 문서 2개**, **Firestore Rules single 10 / multi·
>    transaction·batch 20**.
> 2. **★ transaction 시간 제한 서술을 정정했다.** *"공식 총 deadline이 없다"* 는 **부정확했다** —
>    공식 문서가 **lock deadline 20초 · 최대 270초 · idle 60초 · 유한 재시도 · 요청 10 MiB**를 명시한다.
>    **★ 단 분리한다**: **개별 transaction의 공식 제한은 확정**, **탭 정지·JS 정지·SDK backoff·
>    Storage 업로드 재시도(10분)를 포함한 `save()` 호출 전체의 벽시계 상한은 UNCONFIRMED.**
>    **"공식 제한이 없다"(틀림) ≠ "호출 전체 절대 상한을 증명 못 했다"(사실).**
>    ⚠️ **이 정정만으로 시간 기반 삭제를 안전하다고 승인하지 않는다.**
> 3. **★ REC 문서 ID ↔ Storage `objectId` 매핑을 실행 가능하게 확정했다.**
>    `objectId`의 실제 값은 **`"<uuid>.json"`** 인데 REC은 확장자 없는 `{operationId}`였다 →
>    **같은 문서를 못 가리켰다.** 확정: **REC 문서 ID = `objectId` 세그먼트 그대로** ·
>    Storage Rules는 **변환 없이 직접 보간** · **head는 `objectPath` 대신 `recId`**(3키 유지) ·
>    경로 합성은 **클라이언트가** · `recId`는 **정규식으로만** 검증.
>    **⇒ 문자열 파싱·연결 0.** Rules의 `+` 연결·`split`은 **지원 미확인(UNCONFIRMED)이라 쓰지 않았다.**
>    ⚠️ **스펙 037 계약 변경**이다.
>
> ### 라운드 1에서 정정했던 3건 (유지)
>
> 1. **★ "Storage Rules는 Firestore를 읽을 수 없다"는 서술을 폐기했다.**
>    공식 문서(`firebase.google.com/docs/storage/security/rules-conditions`, 2026-08-11 확인)가
>    **`firestore.get()` / `firestore.exists()`** 를 명시한다.
>    **공식 제약 4개**: **기본 Firestore DB만** · **★ 평가당 문서 접근 최대 2개** ·
>    **Firestore quota/billing 포함** · **두 제품 연결 IAM 활성화 필요**.
>    → **"강제 주체는 사람 또는 backend뿐"** 결론도 **폐기**하고 **O-4(Storage Rules 서버 강제)** 신설.
>    ⚠️ **클라이언트 delete 권한 승인도 구현 승인도 아니다.**
> 2. **★★ SDC 증명의 objectPath 재사용 결함을 고쳤다.**
>    `firestore.rules:57-60`은 **직전 값과만 다르면 통과**하므로 **A → B → A가 막히지 않는다** —
>    초판의 "되돌아갈 수 없다"는 **성립하지 않는다.**
>    **★ 더 깊은 문제**: `storage.rules` create가 **`resource == null`** 이라
>    **삭제하는 순간 그 경로가 다시 생성 가능해진다** — **삭제가 불변성 자체를 깬다.**
>    → **재설계**: `operationId`를 **키로 하는 write-once 소비 기록 REC**을 **업로드 전에** 만들고,
>    head 규칙이 **`firestore.get(REC).claimedBase == resource.data.revision`** 을 요구한다.
>    `claimedBase`가 불변이라 **한 경로는 정확히 한 번의 전이에서만 head가 될 수 있다**(재사용 불가).
>    **SDC′ = `head.revision > REC.claimedBase + 1`**, **Firestore 접근 정확히 2개 = 한도와 동일**.
>    **★ 이 하나가 P1 보호·P2 식별·P3 보호·실패 산물 회수를 다 덮어 시간 창이 불필요해진다.**
>    ~~**원자성**: 같은 transaction의 다중 문서로는 묶을 수 없다~~ ⚠️ **라운드 2가 폐기** —
>    `getAfter()`로 **묶을 수 있다**(구조 B). **순서 강제(구조 A)** 도 여전히 유효하며
>    실패 산물 회수 범위가 더 넓다.
>    **M-1·M-2는 둘 다 불충분** — M-1은 직전 1개만 비교, M-2는 키가 revision이라 **경로 역조회 불가**.
> 3. **변경 문서 개수 5 → 6 정정**(handoff 포함).
>
> **유지되는 판정**: "head 미참조" 단독·"오래됐다" 단독 모두 **불충분**이며,
> **REC이 없는 현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ 삭제 보류(O-3)가 기본값.**

> ### ★★ Founder 방향 (과장 없이)
>
> **과거 정상 저장본을 영구 버전 이력으로 보존할 필요는 없다** · **안전하게 식별할 수 있을 때**
> 삭제 후보로 본다 · **현재 사용 중이거나 저장 성공 여부가 미확정인 객체를 삭제해도 된다는 뜻은 아니다** ·
> **실제 삭제·자동 정리 구현·Rules 변경·백엔드 구현·배포 승인이 아니다.**
> → **확정된 것은 "과거 정상 저장본에 영구 보존 요구가 없다" 하나뿐**이고, 삭제 여부·시점·주체·주기는
> **D-1~D-3으로 남았다.** 선행 G-4의 **delete 권한·자동 정리·운영 쓰기 개방 미승인**은 그대로다.
>
> ### ★★ 핵심 발견 — 지금은 세 집단을 구분할 수 없다
>
> **P1 현재 사용 중**(`X === head.objectPath`, 구분 가능) · **P2 과거 정상 저장본** ·
> **P3 미확정·늦게 성공 가능** — **P2와 P3이 Storage에서 똑같이 생겼다.**
> 가르는 정보(**"한 번이라도 head였는가"**)가 **어디에도 기록돼 있지 않다**:
> head는 **정확히 3키**(`constants.ts:33` · `head.ts:74-77` · `firestore.rules`의 `hasOnly`+`hasAll`),
> 구현에 **나열도 삭제도 없고**(`facade.ts`에 부재, `index.ts:7`이 명시),
> `storage.rules`는 `allow update: if false` · `allow delete: if false`.
> **P2는 실패가 아니라 성공의 부산물**이다 — update가 `objectPath` 교체를 강제하므로
> **저장이 성공할 때마다 직전 객체가 참조에서 떨어진다.**
>
> ### 안전 삭제 조건 (SDC) — 4조건 AND
>
> **SDC-1** `X !== head.objectPath`(필요조건일 뿐) · **SDC-2** *"revision R에서 head였다"* 는
> **durable 기록** · **SDC-3** `현재 head.revision > R` · **SDC-4** 판정 순서.
> **증명 논리**: X가 R의 head였다면 그 commit은 **이미 성공**했으므로 P3이 아니고,
> CAS가 `head.revision === expectedBase`를 요구하는데 revision은 **정확히 +1로 단조 증가**하므로
> **head는 X로 되돌아갈 수 없다.** → **SDC-2만 오늘 존재하지 않는다.**
>
> ### 검증 결과
>
> - **"head가 현재 가리키지 않는다" 단독 = 안전하지 않다.** SDC-1뿐이라 **P2/P3을 구분 못 한다.**
>   P3을 지우면 늦게 성공한 transaction의 경로가 비고 `loadBaseline`이 **fail-closed**되어
>   **운영자가 상태를 아예 못 읽는다**(legacy fallback 없음 — 의도된 설계).
> - **"오래됐다" 단독 = 저장소 근거로 증명 불가.** upload는 **10분** 재시도 상한이 문서화돼 있으나
>   (`@firebase/storage` `index.esm.js:37`·`:43`) **commit의 늦은 성공에는 상한이 없다**
>   (`maxAttempts` 기본 5는 **시도 횟수**, `@firebase/firestore` `index.d.ts:3083`).
>   **⇒ 시간 창은 안전 증명이 아니라 Founder가 감수하는 리스크 수용이다.**
>
> ### 최소 구조와 결정적 제약
>
> **M-1** head에 **직전 objectPath**를 함께 기록(4번째 키) → 한 번에 하나의 P2 증명 ·
> **M-2** **같은 transaction 안에서** append-only 이력 기록 → 완전한 체인
> (**둘 다 Firestore라 다중 문서 원자성이 성립** — cross-service 원자성이 아니다) ·
> **M-3** 객체 `customMetadata` = **불충분**(업로드 시점엔 commit 결과를 모른다).
>
> ⚠️ **다음 문단은 폐기됐다(보완 라운드 1 교정 1)** — Storage Rules는 **`firestore.get()`/
> `firestore.exists()`로 기본 Firestore DB를 읽을 수 있다.** 원문은 이력으로만 남긴다.
> ~~**Storage Rules는 Firestore를 읽을 수 없어 SDC를 강제할 수 없다.** 클라이언트에 delete를 주면
> 서버가 "정말 밀려났는가"를 검증할 수단이 없어 SDC가 클라이언트 선의에만 의존한다.
> ⇒ 강제 가능한 주체는 (i) 사람이 판단하는 out-of-band 삭제, (ii) 양쪽을 읽는 backend뿐이다.~~
>
> ### 선택지와 남은 결정
>
> **O-1 운영자 수동**(Rules 변경 0, 그러나 사람이 P3을 오인해도 서버가 안 막는다) ·
> **O-2 backend/Admin SDK**(**G-3 재개** · SDC를 강제할 수 있는 유일한 자동 경로지만 **규칙이 틀리면
> 자동으로 손해**) · **O-3 보류**(위험 0, 비용 단조 증가, **현재 상태**).
> **남은 Founder 결정 3개**: **D-1 완료 판정 방식**(SDC 증명 / 시간 창=리스크 수용 / 혼합) ·
> **D-2 정리 주체**(없음 / 운영자 수동 / backend=G-3 재개) · **D-3 보존 개수·주기**.
>
> **UNCONFIRMED / NOT TESTED**: 실제 `admin/state.json` 크기·내용 · 리빌드 payload 크기 ·
> **저장 빈도 미결정**(⚠️ 레거시 **3초 디바운스**가 객체 수를 지배할 값) · bucket 객체 수·용량·
> location·class·lifecycle · GCS 요금 · **늦은 commit 지연 상한** ·
> **Storage prefix 나열의 Rules 허용 여부**(emulator로 확인 가능하나 미실행).

> **이전 상태(참고)** — ★★ 스펙 037은 Codex 독립 재검증을 통과해 **DONE**이다
(2026-08-11, `CODEX_PASSED`). 제품 검증 커밋 **`ead06ab`**(구현 `d83aee9` + 보완 라운드 1),
기록 `91a7813`. 계약 `9805c26` · 권한 `4f2ab0b` + 범위 검토 `f8590e4`(A-12·A-13 확장 포함).

> ### ★★ Codex 독립 검증 결과 — `CODEX_PASSED`
>
> | 항목 | 결과 |
> | --- | --- |
> | HEAD=origin | `91a7813`, ahead/behind **0/0** |
> | 변경 범위 | **허용 4파일뿐** — `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` · 신규 `sdk-facade.test.ts` |
> | `pnpm install --offline --frozen-lockfile` | **PASS**, **lockfile diff 0** |
> | format / lint / typecheck / unit / build | **PASS** |
> | unit | **1318/1318** |
> | Chromium E2E | **134/134** |
> | **고객 번들 SHA-256** | **`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`** |
> | **local `demo-denn-emulator` Rules 게이트** | **10/10 PASS** |
> | ports 4183/4184/8080/9099/9199 | 잔류 **0** |
> | `git diff --check` | **PASS** · 추가 결함 **없음** |
>
> ### 닫힌 것 — 로컬 비-UI 구현·검증까지
>
> `@denn/firebase/admin-write` port(**불변 객체 생성 + 단일 Firestore head CAS + 결과 불명 시
> bounded reconciliation**) · **두 오류 표면**(`save`는 8개 `WRITE_*`, `loadBaseline`은 스펙 036
> read 오류 + `REBUILD_BASELINE_INVALID`) · `storage.rules`/`firestore.rules` **목표 상태**
> (placeholder UID) · emulator 전용 config와 Rules 사본 · opt-in fake/emulator 검증.
>
> ### ★ 여전히 NOT TESTED이자 금지
>
> **실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network**(NOT TESTED) ·
> **실제 운영자 UID**(UNCONFIRMED — 배포 대상 Rules에 **placeholder가 남아 현 상태로 배포 불가**) ·
> **Rules·Hosting 배포**(금지. ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
> **배포 순서 자체가 STOP 대상**이고 cutover는 별도 스펙·별도 승인) ·
> **운영 쓰기 활성화**(전제 3개 중 **emulator PASS 하나만 충족**) ·
> **`apps/**`와 모든 UI 연결·저장 버튼** · **발행** · **legacy 공유 쓰기** ·
> **orphan 삭제·자동 정리** · **tombstone·자동 merge·L-4** ·
> 실제 네트워크 지연·단절 · 실기기·다중 기기 · 운영 규모 payload · orphan 누적 실제 비용 ·
> `pnpm-workspace.yaml`의 `allowBuilds`(이월).
>
> ### 증명 경계 (유지)
>
> **합성 fake는 서버 Rules의 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
> callback 재실행과 commit outcome unknown은 **fake 전용**이며 emulator 증명이라 주장하지 않는다.
> **emulator는 실제 Firebase가 아니다.**

> ### ★★ 보완 라운드 1 — Codex 지적 3건 (`ead06ab`)
>
> **변경 파일 4개(전부 허용 목록)**: `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` ·
> **`sdk-facade.test.ts`(신규)**. **Rules·emulator config·`apps/**`·`admin-read/**`·manifest·
> lockfile·`firebase.json`·`.firebaserc`·`vitest*.config.ts`·`scripts/check.mjs`·`.gitignore` 무변경.**
>
> 1. **★ payload를 쓰기 전에 정본으로 런타임 검증.** `save()`가 **`expectedBase` 검증 뒤,
>    UUID·업로드 전에** `request.catalog`를 **기존 `readLegacyCatalog` 정본**으로 검증한다.
>    invalid이면 **`WRITE_INVALID_INPUT`** 이고 **UUID·Storage·Firestore 호출 0**,
>    업로드는 **검증된 `CatalogDocumentV1`을 직렬화**한다.
>    **이유**: `CatalogDocumentV1`은 **컴파일 타임 주장일 뿐**이고 이 객체는 **불변**이라
>    읽을 수 없는 payload를 올리면 **head에 영구히 앉는다**. 검증 결과를 직렬화하므로
>    **hostile getter가 나중에 바이트를 바꿔치기할 수 없다**.
>    테스트: invalid `schemaVersion`·circular → **호출 0**, 업로드 JSON이 **검증된 V1 wrapper**로 round-trip.
> 2. **★ Firebase app 소유권 명시.** 어댑터가 **스펙 036이 이미 소유한 기본 app을 재사용**한다.
>    **중복 `initializeApp` 0**, **`appName` 옵션 제거** — named app은 **자기 auth 상태를 따로 들어서**
>    운영자가 로그인한 적 없는 세션으로 쓰기가 나갈 수 있고, **그 분리 자체가 버그**다.
>    기존 app config가 **키 단위로 하나라도 다르면 fail-closed**. **`admin-read/**` 무수정.**
> 3. **★ emulator 옵션은 `demo-` 프로젝트에서만.** `config.projectId`의 `demo-` 접두를
>    **SDK 초기화 전에**(dynamic import보다도 앞) 검사하고, non-demo면
>    **`initializeApp`·Auth·Firestore·Storage 호출 0**으로 거부한다.
>    **emulator 배선을 실제 프로젝트 id에 물리는 것이 로컬 실행이 운영에 닿을 수 있는 유일한 실수**다.
>
> ### 게이트 실측 (`ead06ab`)
>
> `pnpm check` **PASS** · **unit 1318/1318**(1305 → **+13**) · **Chromium E2E 134/134** ·
> **고객 번들 byte-identical**(`index-W_cZpbdf.js` · **287,741 bytes** ·
> `fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`) ·
> **emulator 게이트 실제 Rules로 10/10 PASS**(분리 실행, **다운로드·설치·포트 강제 해제 0**) ·
> `git diff --check` **PASS** · **forbidden diff 0** · ports 전후 free.
>
> ⚠️ **Rules는 이번 라운드에 아예 손대지 않았고** 여전히 **UNCONFIRMED placeholder**라 배포 불가다.

> ### ★★ 게이트 실측 (구현 `d83aee9`)
>
> | 게이트 | 결과 |
> | --- | --- |
> | frozen install | **PASS**, **lockfile diff 0**(신규 의존성 0) |
> | `pnpm check` | **PASS**(format·lint·typecheck·unit·build) |
> | unit | **1305/1305** (기준 1271 → **+34**) |
> | Chromium E2E | **134/134** (무회귀) |
> | **고객 번들** | **★ byte-identical** — `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** · `fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685` |
> | 고객 번들 유출 문자열 | `admin-write`·`rebuildAdminState`·`firebase/firestore` **0건** |
> | **emulator 게이트** | **★ 실제 Rules로 10/10 PASS** (기본 게이트와 분리 실행) |
> | `git diff --check` · ports | **PASS** · 4183/4184·8080/9099/9199 전후 **free** |
>
> ### 구현된 것
>
> `packages/firebase/src/admin-write/**`(신규 9파일) · `./admin-write` 서브패스 export ·
> `storage.rules`/`firestore.rules` **목표 상태**(placeholder UID, **배포 0**) ·
> `firebase.emulator.json` + emulator rules 사본 2개 · `vitest.config.ts`/`vitest.emulator.config.ts`/
> `package.json` · **A-12 `.gitignore` 한 줄** · **A-13 `scripts/check.mjs` 파일명 1개**.
> **`firebase.json`·루트 배럴·`admin-read/**`·`apps/**`·`.firebaserc` 무변경.**
>
> **설계**: `save`는 **operationId를 호출당 1회** 발급하고(재시도·callback 재실행에서 재발급 0)
> 업로드 후 **`runTransaction`을 정확히 1회** 호출한다. **callback은 순수**라 SDK가 여러 번 돌려도
> 안전하다. **head 부재 = 논리 revision 0**이고 **`expectedBase === 0`일 때만** revision 1을 만든다.
> 결과 불명일 때만 **bounded read 1회**로 판정하고 **base 관측은 미판정**으로 남긴다
> (**timeout은 SDK transaction을 취소하지 않는다**). `loadBaseline`은 head 없으면
> **스펙 036 read port를 그대로 재사용**하고, head가 있으면 **그 객체만** 읽으며 **legacy fallback 0**.
>
> ### emulator에서 실제 Rules로 확인된 것 (E-1~E-8)
>
> 승인 UID만 가능 / **다른 UID·익명·미인증 거부**(Storage·Firestore 양쪽) /
> **동일 경로 재업로드·delete·비-JSON contentType 거부** /
> **head `get` 허용·타 identity 거부·`list` 거부** / **키 4개·잘못된 objectPath·최초 revision≠1·
> `+2`·동일 revision·`objectPath` 미교체 거부**, 정상 `+1`+경로 교체 통과, head delete 거부 /
> **두 writer 동시 commit → 정확히 하나만 성공하고 head는 정확히 +1**, **진 쪽 객체는 orphan,
> head 불변**. **다운로드·설치·포트 강제 해제·프로세스 종료 0.**
> ⚠️ 첫 실행 1건 실패는 **rule이 정상 동작한 결과**였다(Storage가 리셋되지 않아 setup 업로드가
> 덮어쓰기가 됐고 create-only가 거부). **테스트만 고쳤고 제품 코드는 바뀌지 않았다.**
>
> ### 경계 (정직하게)
>
> **합성 fake는 서버 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
> callback 재실행·commit outcome unknown은 **fake 전용**이며 emulator 증명이라 주장하지 않는다.
>
> ### 계속 닫혀 있는 것
>
> `apps/**`와 모든 UI 연결 · 저장 버튼 · **실제 UID** · 실제 Firebase/network/live/운영 데이터 ·
> **Rules·Hosting 배포** · 운영 쓰기 · 발행 · legacy 공유 쓰기 · orphan 삭제·자동 정리 ·
> tombstone·자동 merge · 신규 의존성·다운로드·설치.
> ⚠️ **Rules는 편집만 했고 배포하지 않았다** — 배포하면 `denn-admin.html:740`의 저장이 서버에서
> 거부되므로 **배포 순서 자체가 STOP 대상**이다.

> ### ★★ 승인 유효성 확정 + 구현 허용 범위 검토 (2026-08-11, 읽기 전용)
>
> **Founder가 `4f2ab0b`의 승인이 Claude Code에 직접 전달한 실제 승인임을 확인하고 유효한 승인으로
> 확정했다.** 이어서 **구현 허용 범위 검토**를 지시해 수행했다 — 저장소 파일 변경·emulator 실행·
> network 접근 **0**. 정본 §3.1~§3.3에 기록했다.
>
> **막힘 없이 열리는 항목(실측)**: `admin-write` 디렉터리·참조 **0건**(충돌 없음) ·
> `packages/firebase/tsconfig.json`의 `include:["src"]`가 **자동 typecheck** ·
> `biome.json`의 `packages/**/src/**`가 **자동 format/lint** ·
> `./admin-write` export는 **기존 `./admin-read`와 동일 패턴** ·
> `storage.rules`/`firestore.rules`와 emulator `*.rules` 사본은 **gitignore 무영향** ·
> **`vitest.config.ts` exclude는 필수**(기본 `include`의 `*.test.{ts,tsx}`가 `*.emulator.test.ts`도 매칭) ·
> **`connectAuthEmulator`·`connectFirestoreEmulator`·`connectStorageEmulator` 전부 설치된 SDK에 존재
> → 신규 의존성 0** · 도구(Java 21.0.11 · firebase-tools 15.22.4 · jar 캐시 · 포트 free) 이상 없음.
>
> **★★ 공백 2건 — Founder가 최소 범위 확장을 승인**:
> **① `firebase.emulator.json`이 조용히 gitignore된다** — `.gitignore:2`가 `*.json`이고 예외는
> `package.json`·`tsconfig*.json`·`biome.json`뿐(`git check-ignore -v`로 확인).
> `firebase.json`·`.firebaserc`가 멀쩡한 건 **이미 추적 중이라서**일 뿐이다. 그대로면 **config가
> 커밋되지 않아 다른 환경에서 emulator 게이트를 재현할 수 없다.** → **A-12: `.gitignore`에
> `!firebase.emulator.json` 한 줄 추가**(`git add -f`는 파일이 ignored로 남아 `git clean -X`에
> 지워지고 `.gitignore:7` 주석 의도와도 어긋난다).
> **② `vitest.emulator.config.ts`가 format/lint를 조용히 건너뛴다** —
> `scripts/check.mjs:22-30`의 `BIOME_TARGETS`와 `package.json`의 `format:check`/`lint`가 config를
> **명시 열거**하고 `biome.json`의 `"*.ts"`는 **경로 명시 때문에 무효**다. **실패가 아니라 스킵**이라
> 더 나쁘다. → **A-13: `scripts/check.mjs`의 `BIOME_TARGETS`에 파일명 1개 추가** + `package.json` 동일.
>
> **경계**: 두 확장 모두 **기계적·비제품 변경 각 한 줄**이며 **금지 항목은 하나도 열리지 않는다** —
> `apps/**` · 실제 UID · 실제 Firebase/network/live · Rules/Hosting 배포 · 운영 쓰기 · 발행 ·
> legacy 공유 쓰기 · orphan 삭제 · 신규 의존성·다운로드·설치 · `firebase.json` · 루트 배럴 ·
> `admin-read/**` · `.firebaserc` **그대로 금지**, **`pnpm-lock.yaml` diff 0** 유지.

> ### ★★ Founder 승인 (2026-08-11) — 계약 `9805c26` + 로컬 비-UI 구현 착수
>
> **승인된 것**: **admin-write port와 합성 fake** · **배포하지 않는 `storage.rules`/`firestore.rules`
> 목표 파일**(실제 UID는 **UNCONFIRMED placeholder만**, **편집만 허용·배포 금지**) ·
> **`firebase.emulator.json`과 emulator 전용 Rules 사본**(합성 UID만) ·
> **opt-in unit/emulator 테스트**(`vitest.config.ts`·`vitest.emulator.config.ts`·`package.json`) ·
> **기존 캐시 도구만 이용한 `demo-denn-emulator` 로컬 검증**까지.
>
> **승인되지 않은 것**: **`apps/**`와 모든 UI 연결**(저장 버튼·admin 화면·실제 고객/운영 경로) ·
> **실제 운영자 UID 추측·기록** · **실제 Firebase project·운영 bucket/data·live network** ·
> **Rules/Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행** ·
> **legacy `admin/state.json` 공유 쓰기** · **orphan 삭제·자동 정리·client delete 권한** ·
> **tombstone·자동 merge·L-4 해결** · **신규 의존성·도구/binary 다운로드·설치** ·
> **실제 프로젝트 id 또는 `.firebaserc` 사용** · **자동화·반복 작업 생성**.
>
> ### ★ 구현 시 유일한 허용 파일 (승인 범위 = 계약 §10, 일치 확인함)
>
> `packages/firebase/src/admin-write/**` · `packages/firebase/package.json`(`./admin-write` export) ·
> `storage.rules` · `firestore.rules`(**둘 다 placeholder UID · 배포 금지**) ·
> `firebase.emulator.json` · emulator 전용 rules 사본 · `vitest.config.ts` ·
> `vitest.emulator.config.ts` · `package.json`(`test:emulator`) · `**/*.emulator.test.ts`와
> 관련 unit/fake · 스펙 037 handoff/CURRENT/live/STATE/NEXT.
> **여전히 금지**: **`firebase.json`** · **루트 배럴** · **`packages/firebase/src/admin-read/**`** ·
> **`apps/**`** · `packages/render/**` · `packages/shared/**` · `.firebaserc` · 실제 `.env` · legacy HTML.
> **★ `pnpm-lock.yaml` diff 0** — 신규 의존성 미승인이므로 `--frozen-lockfile`이 통과해야 하고,
> 변경이 필요해지면 **STOP**이다.
>
> ### ★ emulator 실행 경계
>
> **기존 캐시 도구만**(Java `21.0.11 LTS` · firebase-tools 전역 `15.22.4` ·
> Firestore `v1.21.0.jar` · Storage rules runtime `v1.1.3.jar` · UI `v1.15.0`).
> **`--config firebase.emulator.json` + `--project demo-denn-emulator` 둘 다** 명시하고,
> **host 환경변수가 없거나 `demo-` 접두가 아니면 시작 전에 실패**한다. **`.firebaserc` 사용·수정 0.**
> **다운로드·설치·신규 의존성·포트 강제 해제·타 프로세스 종료가 필요하면 STOP.**
> ⚠️ **Auth emulator binary는 UNCONFIRMED** — **첫 실행에서 다운로드 시도 시 즉시 STOP.**
>
> ### 다음 순서 (NEXT §3)
>
> **1단계(이 커밋) 승인 기록 완료 → 2단계 Codex 확인 → 3단계 Claude 비-UI 구현 별도 commit/push →
> 4단계 Codex 전체 게이트 검증(frozen·format/lint/typecheck·unit·build·Chromium E2E·diff·
> forbidden·고객 dist hash·ports/temp) → 5단계 기본 게이트와 분리한 local emulator 게이트 명시 실행.**
>
> ### 이 승인으로도 열리지 않는 것
>
> **운영 쓰기 개방**(실제 UID + orphan 정책 + emulator PASS 후 **별도 cutover 스펙·별도 승인**) ·
> **Rules 배포**(실제 UID 정본 전 차단 — ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서
> 거부되므로 **배포 순서 자체가 STOP 대상**) · **C6**(G-3 보류) · **L-4 해결**(별도 스펙).

> 아래 Codex 최종 계약 검토와 `보완 라운드 3` 기록은 `9805c26` 완료 이력이다.
> **Codex 판정 = `CONTRACT_PASSED`**(HEAD=origin=`2f0ca7d`, `git diff --check` PASS,
> 허용 문서 범위만 변경, 제품/Rules/config/test diff 0, emulator/Firebase/network/live 실행 0).

> ### ★★ 보완 라운드 3 — 정정한 2건
>
> 1. **★ `loadBaseline`과 `save`의 오류 표면 분리(계약 §5.4·§5.6·§6.1).**
>    라운드 2는 **읽기 작업에 `WRITE_UPLOAD_FAILED`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`을 반환**하고
>    **persisted object invalid를 "head transaction 실패"와 합쳤다** — **공개 API 의미가 틀리다.**
>    정정: **`save`만** `SafeAdminWriteError` + **8개 `WRITE_*`**.
>    **`loadBaseline`은 스펙 036의 `SafeAdminReadError` 의미를 재사용**하고
>    **head 문서 자체의 허용 키/`revision`/`objectPath`/`schemaVersion` 위반만**
>    신규 **`REBUILD_BASELINE_INVALID`** 하나로 구분한다.
>    head 없음의 legacy read 실패, head 있음의 참조 객체 없음·JSON/catalog invalid는
>    **기존 read 오류를 그대로 보존**한다. **read timeout/network 실패는 상태를 바꾸지 않으므로
>    upload outcome unknown으로 부르지 않는다.**
>    **`WRITE_HEAD_FAILED`는 save의 head transaction이 명확히 실패한 경우로 다시 좁혔다.**
>    **확인**: `SafeAdminReadError`는 **`@denn/firebase/admin-read` 배럴이 이미 export한다.**
>    순환이 문제면 **내부 relative type import 허용**하되 **공개 의미 동일**,
>    **`import type`은 컴파일 시 지워져 런타임·번들 영향 0**. **`admin-read/**` 무수정 유지.**
> 2. **★★ timeout 뒤 base 관측은 commit 미반영의 증거가 아니다(§6.6).**
>    **timeout은 SDK transaction을 취소하지 않는다** — reconciliation read 순간에 base여도
>    **원 transaction이 나중에 서버에서 성공할 수 있다.**
>    **이 잘못된 분기는 Codex의 라운드 2 지시에도 포함됐던 오류이며 최종 계약에서 바로잡았다.**
>    정정: 명확히 reject된 경우는 **reconciliation에 들어오지 않는다**. 들어온 경우 —
>    `base+1` **AND** `objectPath`가 이번 것 → **성공 확정** / `base+1` **AND** 다른 `objectPath`
>    → **다른 writer 승리 확정 `WRITE_CONFLICT`**(head가 더 이상 `expectedBase`가 아니라 우리
>    late commit은 CAS에서 이길 수 없다), 객체는 **orphan** / **여전히 논리적 base → 미판정
>    `WRITE_COMMIT_OUTCOME_UNKNOWN`, orphan이라 부르지 않는다** / `base+1` 초과 → **판정 불가** /
>    reconciliation read 실패·timeout → **판정 불가**.
>    **자동 재업로드·transaction 재호출·삭제·추측 계속 0**, **bounded read 최대 1회 유지**,
>    **늦은 결과가 반환값을 뒤집지 않는다는 규칙과 원 transaction이 서버에서 늦게 성공할 수 있다는
>    사실을 동시에 명시**했다 — 앱은 자기 반환값을 바꾸지 않을 뿐이고 **서버의 진실은 다음
>    `loadBaseline`이 알려 준다.**
>
> **라운드 2에서 열어 둔 질문은 해소됐다** — `WRITE_HEAD_FAILED`의 의미를 넓히던 절충을
> **교정 1이 폐기**했다. **오류 표면 분리가 옳은 답**이고 **9번째 `WRITE_*` 코드는 만들지 않았다.**
>
> **신규 위험**: **R-14** 읽기 실패를 "upload 오류"로 보고 · **R-15** timeout 뒤 base 관측을
> "미반영 확정"으로 오판해 **서버에서 나중에 성공한 commit을 실패로 보고하고 운영자가 같은 payload를
> 다시 보내게 만듦**.
>
> **승인 경계(§16)**: **이번 라운드는 계약 문서 보완만 승인.** push 후 **`READY_FOR_CODEX`,
> `fix_round: 3`**. **Codex 최종 계약 검토 전 port/Rules/config/test 구현 0.**
> **실제 제품 UI · live Firebase · Rules 배포 · 운영 쓰기 계속 금지.**
> **★ G-5의 fake·emulator 허용과 결정 문서 §2의 "제품 구현 착수" 금지 사이 경계는 추측하지 않는다 —
> Codex 최종 검토 후 Founder 확인 대상.**

> 아래 `보완 라운드 2` 기록은 `d5789db`의 완료 이력이며,
> 위 Codex 라운드 3 판정이 현재 상태를 supersede한다.

> ### ★★ 보완 라운드 2 — 정정한 4건
>
> 1. **★ 최초 head 생성도 `expectedBase === 0`을 강제한다(계약 §4.3).**
>    라운드 1은 "head 없으면 무조건 revision 1 create"였다 — **`expectedBase`가 5인 편집 세션이
>    head가 사라진 상황에서 revision 1을 만들어 이력을 조용히 밀어낼 수 있었다**(G-2 위반).
>    정정: **head 없음 = 논리적 revision `0`** · **`expectedBase === 0`일 때만 create** ·
>    아니면 **`WRITE_CONFLICT`**(head 불변) · **`expectedBase`는 0 이상 safe integer**만 허용하고
>    위반은 **upload 전 `WRITE_INVALID_INPUT`**(Storage 호출 0회) · **persisted `revision`은
>    1 이상 safe integer이고 `+1`이 여전히 safe integer**여야 하며 아니면 **fail-closed**(§5.7).
>    **Firestore Rules의 create `revision == 1` / update 정확히 `+1`은 유지**하고
>    **`expectedBase`는 클라이언트 transaction 계약에서 검사**한다(Rules는 요청자의 base를 모른다).
> 2. **★ 공개 타입 블록을 저장소 실제 타입으로 완결(§5.6).**
>    블록이 **`CatalogDocumentV1`을 직접** 쓰고 **alias·동의어 0**, `Result`는 **import 표면까지 명시**,
>    **`AdminWriteErrorCode`(8 union)·`AdminWriteErrorCategory`·`SafeAdminWriteError` 고정**,
>    **정본 매핑 표는 §5.4 한 곳**, **`SafeAdminWriteError`에는 `correlationId` 외 raw message·
>    email·UID·token·object bytes·`objectPath`·`operationId` 없음**,
>    `AdminStateRevision` 런타임 범위는 §5.7과 일치.
> 3. **★ 결과 불명 재조회를 port 내부로 옮겼다(§6.6).**
>    라운드 1은 **호출자에게 head 재조회를 요구했지만 `operationId`가 내부라 수행 불가능**했다.
>    정정: **`save` 내부가 자신의 `operationId`로 read-only reconciliation** 수행 —
>    **write retry가 아니며 재업로드 0 · transaction 재호출 0 · bounded read 최대 1회 ·
>    callback 안에서 하지 않는다**. 판정 3분기: `revision === expectedBase + 1` **그리고**
>    `objectPath`가 우리 것 → **성공** / **논리적 base에 머무름** → **미반영 확정
>    `WRITE_HEAD_FAILED`**(객체는 orphan, 자동 재전송·삭제 0) / **그 밖 전부**(다른 writer가 head를
>    옮김, `base+1`인데 `objectPath` 불일치, reconciliation read 실패·timeout) →
>    **`WRITE_COMMIT_OUTCOME_UNKNOWN` 유지**. **오류에 `operationId`·object path 비노출**,
>    **`loadBaseline`은 reconciliation API가 아니다**.
> 4. **★ fake와 emulator의 증명 책임 분리(§7.5).**
>    **(A) emulator + 실제 Rules** = E-1~E-8(identity 4종, Storage create-only·update/delete 거부,
>    head `get` 허용·거부, `list` 거부, 키/경로/revision Rules, **두 writer CAS**, **orphan 시 head 불변**).
>    **(B) 주입 fake** = F-1~F-10(**callback 다회 실행**, **upload 반복 0**, 앱 `runTransaction` 1회,
>    **upload/commit outcome unknown**, **bounded reconciliation**, 늦은 성공 폐기, 오류 매핑·비노출,
>    §5.7 범위, §4.3 최초 create 분기, baseline 분기).
>    **★ callback 재실행과 commit outcome unknown을 emulator에서 결정적·비파괴적으로 유발할 seam이
>    없으므로 fake 전용으로 재분류하고 emulator 증명이라고 주장하지 않는다.**
>    **(C) 재현 금지**: network 차단·프로세스 종료·포트 강제 해제·emulator kill·실제 Firebase.
>    **(D) 양방향 경계**: fake는 Rules 원자성을, emulator는 앱 오류 분기 전체를 증명하지 않는다.
>
> ### ★ Codex가 확인해 줘야 할 판단 1건
>
> 교정 2가 **"8코드만 허용"** 을 요구하는데 8코드는 `save` 기준이라 **`loadBaseline`의
> "persisted head 또는 그 객체가 계약 위반으로 사용 불가"** 에 맞는 이름이 없다.
> **9번째 코드를 만들지 않고 `WRITE_HEAD_FAILED`의 의미를 확장**했다(둘 다 확정 실패,
> `retryable:false`로 성질 동일). **이름이 `HEAD`인데 참조 객체까지 포함하는 점은 의도적 절충**이며
> 다른 이름을 원하면 **계약만 고치면 된다**. 계약 §0.1·§5.4에 기록했다.
>
> **신규 위험**: **R-11** head 부재에서 revision 1을 만들어 이력을 밀어냄 ·
> **R-12** 호출자가 수행할 수 없는 복구 절차 요구 · **R-13** fake 전용을 "실제 Rules 검증"으로 오인.
>
> **승인 상태(§16 문구 통일)**: **이번 라운드에서 구현 착수를 승인하지 않는다.**
> push 후 **`READY_FOR_CODEX`**, **Codex 라운드 2 재검토 전 구현 0**, **통과 후에도 실제 제품
> UI 연결·live Firebase·Rules 배포·운영 쓰기 계속 금지**. **port/Rules/config/test 구현 착수 여부는
> 추측하지 않고** G-5 허용 범위와 결정 문서 §2 금지를 **구분해 기록만** 했다 — 판정은 Codex 몫.

> 아래 `보완 라운드 1` 기록은 `41b54b9`의 완료 이력이며,
> 위 Codex 라운드 2 판정이 현재 상태를 supersede한다.

> ### ★ 보완 라운드 1 — 정정한 5건
>
> 1. **★ Firestore head read 권한 누락 → 계약 §4.4 전면 재작성.**
>    **`allow get: if approvedOperator() && docId == 'head'`**(baseline load가 성립한다) ·
>    **`allow list: if false`** · create는 **`revision == 1`만** · update는
>    **`revision` 정확히 +1 AND `objectPath`가 이전 값과 달라야** 함 · **허용 키 정확히 3개** ·
>    **`objectPath`는 `rebuild-admin-state/objects/{UUID}.json` 형태만** · **delete 금지** ·
>    **다른 `rebuildAdminState` 문서 전부 거부** · **`spaces/{token}`·catch-all 무변경**.
> 2. **★ emulator Rules 선택을 별도 config로 고정 → §7.3.**
>    **`firebase.json`은 구현 단계에서도 수정하지 않는다.** 신규 **`firebase.emulator.json`** 이
>    **emulator 전용 Rules 사본과 포트만** 참조하고, 실행은 **`--config firebase.emulator.json`
>    + `--project demo-denn-emulator`** 를 **둘 다** 포함한다. emulator 사본에는 **합성 UID만**,
>    배포 대상 Rules에는 **UNCONFIRMED placeholder만**, 둘의 **UID 상수 외 diff 0을 unit test로 고정**.
>    `.firebaserc` 무변경. **허용 파일에서 `firebase.json` 제거 · `firebase.emulator.json` 추가.**
> 3. **★ 결과 불명과 orphan 의미 정정 → §6.5(결과 상태 5행 표).**
>    초판은 **결과 불명을 orphan으로 단정**해 **commit이 실제로 성공했을 가능성과 모순**됐다.
>    정정: upload 결과 불명 + transaction 미시작 → **객체는 없거나 orphan일 수 있고 head 불변** /
>    upload 성공 + transaction 명확히 실패 → **orphan, head 불변** /
>    **transaction 결과 불명 → head에 연결됐을 수도, orphan일 수도 있다(미판정)**.
>    **추측 금지 — head를 다시 읽어 `objectPath`와 `revision`으로만 판정**한다
>    (§4.4가 update마다 `objectPath` 교체를 강제하므로 성립).
>    **`WRITE_COMMIT_OUTCOME_UNKNOWN` `retryable:false`** · **reload 전 동일 payload 재전송
>    자동·수동 모두 금지** · **`WRITE_HEAD_FAILED`도 `retryable:false`로 변경** ·
>    **"head commit만 재개" API 미도입** · **명확한 upload 실패만 `WRITE_UPLOAD_FAILED`**,
>    서버 반영 불명확은 **`WRITE_UPLOAD_OUTCOME_UNKNOWN`**.
> 4. **★ transaction callback 재실행 계약 → §5.5 신설.**
>    **앱은 `runTransaction`을 정확히 1회 호출**하되 **SDK는 callback을 여러 번 실행할 수 있다**.
>    **callback 안에서 `transaction.get/set` 외 부작용 전면 금지**(UUID 생성·Storage upload·로그·
>    UI 변경·로컬 revision 변경). **`operationId`와 `expectedBase`는 transaction 호출 전에 고정**,
>    **재실행마다 head를 다시 읽되 `expectedBase`를 자동 변경하지 않으며** 불일치는 `WRITE_CONFLICT`.
>    **upload는 transaction 밖 선행이라 재실행으로 반복되지 않는다.**
>    **callback 내부 재실행 ≠ 앱 수준 retry.**
> 5. **★ 공개 port 타입 고정 → §5.6.** `AdminStateRevision` ·
>    `AdminStateBaselineValue{catalog,revision,source}` ·
>    `AdminStateSaveRequest{correlationId,expectedBase,catalog}` ·
>    `AdminStateSaveValue{revision,objectPath}` · `AdminStateWritePort{loadBaseline,save}`.
>    **`operationId`는 port 내부 생성**(외부 입력 아님) · head 없음에서만
>    **legacy + revision 0 + `source:"legacy"`** · head 있으면 **rebuild 객체만** ·
>    불일치는 **fail-closed(legacy fallback 0)** · **성공 반환 revision만** 새 baseline으로 채택 ·
>    **각각 단일 in-flight** · **`admin-read/**` 무수정** · **중복 검증 규칙 금지**.
>
> **★ 구현 전 확인 필요 — `Catalog` 타입**: 교정 5의 블록이 쓰는 `Catalog`는
> **저장소에 존재하지 않는 이름**이다. 실제 export는 **`CatalogDocumentV1`**
> (`packages/shared/src/catalog/types.ts`; 스펙 036 `AdminStateLoadValue.document`가 그 타입).
> 계약은 `Catalog`를 **`CatalogDocumentV1`에 바인딩**하고 **동의어·새 타입을 만들지 않는다**고 명시했다.
> `Result`는 `packages/shared/src/index.ts:19`의 기존 타입.
>
> **emulator 시나리오 7 → 12개**: **#8 승인 UID head `get` 성공** · **#9 다른 UID·익명·미인증 거부** ·
> **#10 head `list` 거부** · **#11 callback 재실행 시 upload 반복 0** ·
> **#12 commit outcome unknown은 재조회로 판정**. synthetic Auth 계정은 **emulator 내부 전용**.
> **신규 위험**: **R-9** callback 재실행이 upload를 반복/부작용 · **R-10** baseline load가 head를
> 읽지 못해 기능 불성립.

> 아래 `스펙 037 계약 골자`와 Codex 검수 기록은 `c654023` 초판 이력이며 **삭제하지 않는다.**

> ### ★★ 스펙 037 계약 골자 — C5 (불변 객체 + 단일 Firestore head)
>
> **덮어쓰기를 없애는 방식으로 손실을 막는다.** 조사가 확인했듯 **Web SDK 공개 Storage API에
> generation 조건부 쓰기가 없어** 같은 경로를 두 운영자가 덮어쓰는 모델은 안전해질 수 없다.
> 그래서 **객체는 매번 새 불투명 경로에 한 번만 생성**되고, **가변 지점은 Firestore head 하나**뿐이며
> 그 이동만 **transaction CAS**로 보호한다.
> **★ 안전 근거는 cross-service 원자성이 아니라 "불변 객체 우선 + 단일 가변 정본"이다.**
> 간극에서 실패하면 **orphan + 명시적 충돌**이 되고 남의 바이트를 덮지 않는다.
>
> - **Z-1** UID 제한은 **`rebuild-admin-state/**`와 `/rebuildAdminState/head`에만**.
>   **`op()` 본체 무변경** — 바꾸면 `published/`·`templates/`·`placeholders/`·`guides/`·`mockups/`·
>   `editor-overlays/` write까지 우발적으로 잠긴다(`storage.rules:18-21`·`:35-40`).
>   실제 UID는 **UNCONFIRMED**이고 **추측·예시 기록 금지**, emulator는 **합성 UID**.
> - **Z-2** `rebuild-admin-state/objects/{operationId}.json` — **별도 최상위 경로**라 **OR 우회가
>   구조적으로 발생하지 않는다**. UUID는 저장 시작 시 **1회 생성**(재시도해도 재생성 안 함).
>   경로에 **revision·문구·catalog id·이메일·UID·시간·파일명 금지**. content-addressed 미사용.
>   `application/json` · 20 MiB 미만 · **`resource == null` create-only**, update/delete 금지.
> - **Z-3** `/rebuildAdminState/head` **단일 문서**, 허용 키 **3개**(`schemaVersion`=1 /
>   `revision`≥1 정수 / `objectPath`). 최초 create **revision 1**, 이후 transaction에서
>   **`expectedBase` 일치 시에만 정확히 +1**. `firestore.rules`가 **경로·UID·키·revision 규칙을
>   이중 강제**. **★ Rules가 Storage 객체의 실제 존재를 증명한다고 주장하지 않는다.**
> - **Z-4** `@denn/firebase/admin-write` 서브패스, **루트 배럴 무변경**, SDK·Firestore는
>   **admin 전용 lazy 경계 안**, 기본 상태에서 **adapter 생성·네트워크 0**, **저장 버튼·UI 연결 제외**,
>   **단일 in-flight**, **앱 자동 retry·merge 0**.
>   ⚠️ **SDK 내부 재시도가 있으므로 "네트워크 요청 정확히 1회"를 주장하지 않는다** —
>   대신 `operationId` 고정 + `resource == null`이 **두 번째 쓰기를 서버에서 거부**한다.
>   **오류 8코드**, **CONFLICT·OUTCOME_UNKNOWN은 `retryable:false` + 재읽기 후 명시적 재시도만**.
> - **Z-5** head 없음 → legacy를 **revision 0** 기준으로 / head 있음 → **그 객체만**,
>   **없거나 invalid면 fail-closed(legacy 조용한 fallback 0)**.
>   `expectedBase`는 **편집 시작 로드의 revision** 고정, **자동 재채택·병합 0**,
>   **commit 성공 후에만** 기준 갱신. commit 결과 불명은 **추측 금지**.
> - **Z-6** **로컬 emulator만**, **`demo-` 접두 프로젝트 강제**, 기본 게이트와 **분리**
>   (`*.emulator.test.ts` + `vitest.emulator.config.ts` + `pnpm test:emulator` — `*.live.test.ts` 선례),
>   **실제 Rules로 7개 시나리오**. 설치·다운로드·신규 의존성·포트 강제 해제·프로세스 종료는 **STOP**.
>   **fake는 호출 순서·오류 매핑만 증명하고 서버 Rules 원자성을 증명하지 않는다.**
> - **Z-7** **tombstone·자동 merge 없음.** 문서 전체 CAS, 충돌 시 전체 거부. **L-4는 별도 후속 스펙.**
> - **Z-8** **배포 0.** 실제 UID + orphan 정책 + emulator PASS 전 운영 쓰기 미개방.
>   **legacy 저장을 먼저 닫지 않는다.** cutover는 별도 승인·별도 스펙.
>
> ### ★ Emulator 사전 확인 (읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)
>
> **Java `openjdk 21.0.11 LTS` 사용 가능** · **firebase-tools 전역 `15.22.4`**
> (**저장소 의존성 아님** → lockfile 변경 불필요) · **emulator binary 캐시됨**
> (Firestore `v1.21.0.jar` · Storage rules runtime `v1.1.3.jar` · UI `v1.15.0`) ·
> **포트 4000·4400·4500·8080·9099·9199·4183·4184 전부 free**.
> ⚠️ **Auth emulator 별도 jar 없음** — 내장 추정이나 **UNCONFIRMED**,
> **첫 실행에서 다운로드 시도 시 즉시 STOP**.
>
> ### ★★ 계약이 못 박은 두 위험
>
> - **R-1 Rules 배포가 운영자의 유일한 저장 경로를 닫는다** — `denn-admin.html:740`이 지금 유일한
>   저장 경로다(스펙 035). **이번엔 Rules를 수정도 배포도 하지 않았고** UID 정본 전 배포가 차단이라
>   **현재는 안전**하다. 위험은 배포 시점이며 **Z-8이 순서를 STOP으로 고정**했다.
> - **R-2 emulator가 실제 프로젝트 id로 뜰 수 있다** — `.firebaserc`의 `projects.default`가
>   **실제 운영 프로젝트 `denn-products`** 다. → **`demo-` 접두 프로젝트 강제** +
>   **emulator host 미설정 시 시작 거부** + **`.firebaserc` 수정 금지**.
>
> **NOT TESTED / UNCONFIRMED**: 실제 Firebase 프로젝트 동작 전부 · **실제 운영자 UID·계정 실재** ·
> 실제 네트워크 지연·단절 · 실기기·다중 기기 · **Auth emulator binary 가용성** · 운영 규모 payload ·
> orphan 누적 실제 비용 · **L-4 삭제 부활**(범위 밖) · `pnpm-workspace.yaml`의 `allowBuilds`.

> **이전 상태(참고)** — Founder가 2026-08-11에 **G-1~G-5를 승인**했고, 그 라운드는 승인을
**문서에만** 기록했다(기준 `3b4ebda`). 정본
`decisions/2026-08-11-admin-write-atomicity-decisions.md`(승인 원문 수록).
**제품 코드·`storage.rules`·`firestore.rules`·`firebase.json`·config·manifest·`package.json`·
lockfile·`pnpm-workspace.yaml` diff 0**, 신규 의존성 0, 실제 Firebase·network·live·emulator·
운영 데이터 접근 0, upload/write/publish/deploy 0, 자동화 생성 0, **스펙 037 구현 계약·제품 코드 작성 0**.
**다음 = Codex가 구조 결정 Z-1~Z-8을 검토하고 스펙 037 구현 계약을 작성한다.** 그 전에 구현 착수 0.**

> ### ★★ Founder G-1~G-5 확정 (2026-08-11)
>
> - **G-1 `storage.rules` 최소 변경 승인.** 기존 `admin/{p=**}` **광범위 write 유지 안 함** ·
>   legacy `admin/state.json` **읽기 전용 고정** · **rebuild 전용 경로만 생성** 가능하며
>   **`resource == null`로 덮어쓰기·삭제를 서버에서 차단** · **겹치는 match의 OR 우회 방지를 위해
>   상위 admin write도 함께 좁힘** · 쓰기 권한은 **승인된 기존 운영자 UID 한정**(단순 non-anon 전체 아님) ·
>   **실제 UID 정본 제공 전 live Rules 배포 차단**.
> - **G-2 Firestore 사용 + `firestore.rules` 최소 변경 승인**(C5 검증용).
>   **rebuild 전용 head 문서 1개만 가변 정본** · head 변경은 **transaction 안에서
>   `expectedBase == 현재 head`일 때만** · **`spaces/{token}` 등 기존 Firestore 계약 무변경** ·
>   **Firestore SDK는 admin 전용 lazy 경계 밖으로 노출 금지**.
> - **G-3 C6(Cloud Function/backend/Admin SDK) 미승인 — 예비 대안으로 보류.**
> - **G-4 orphan = head가 참조하지 않는 불변 객체.** 초기 구현에서 **클라이언트 delete 권한·자동 정리
>   불허** · **보존 기간·비용 한도·정리 주체가 별도 승인되기 전 실제 운영 쓰기 미활성화**.
> - **★ G-5 스펙 037 다음 구현 계약 후보 = C5**(고유 불변 Storage 객체 + 단일 Firestore head
>   transaction). **C3 고정 경로 CAS·C4 lease/lock 사용 안 함.** C6은 C5가 안전하게 성립하지 않을 때 재검토.
>   **허용 범위 = 구현 계약 작성 + 합성 fake + 로컬 Firebase Emulator 검증까지.**
>   emulator에서 **동시 저장 · timeout · 늦은 성공 · 브라우저 종료 상당 실패 · 인증 만료 · 중복 탭 ·
>   orphan 발생 · head 불변**을 검증한다. **emulator 검증 통과 전 운영 쓰기 미개방.**
>
> **승인되지 않은 것**: 실제 Firebase 프로젝트·운영 bucket·운영 데이터·**live network** ·
> **Rules 배포**(UID 정본 전 차단) · **Hosting 배포** · **`published/state.json` 발행** ·
> **C6 구현** · **클라이언트 delete·orphan 자동 정리** · **실제 운영 쓰기 활성화**(G-4 + G-5 양쪽 전제) ·
> 신규/다중 계정·역할 권한 · 레거시 `admin/state.json` 공유 쓰기 · legacy cm 되쓰기·마이그레이션 ·
> **제품 구현 착수**.
>
> ### ★ 계약이 반드시 다뤄야 할 결과 (결정이 아니라 확인된 사실)
>
> 1. **★★ G-1을 배포하면 레거시 운영자 저장 경로가 닫힌다.** `denn-admin.html:740`의
>    `uploadDataUrl(dataUrl,'admin/state.json')`이 **현재 운영자의 유일한 저장 경로**다
>    (스펙 035: 리빌드 admin은 저장 불가). **지금 깨지지는 않는다** — UID 정본 전 배포가 차단이고
>    이번에 `storage.rules`를 수정하지 않았다. 위험은 **배포 시점**에 발생한다 → **Z-8 배포 순서**.
> 2. **★ UID 한정의 적용 범위가 열려 있다.** `storage.rules:18-21`의 `op()`는 `admin/`뿐 아니라
>    `published/`·`templates/`·`placeholders/`·`guides/`·`mockups/`·`editor-overlays/` write에도
>    쓰인다(`:35-40`). 전역 적용 시 레거시 발행(`denn-admin.html:14946`)·자산 업로드까지 묶인다 → **Z-1**.
> 3. **★ OR 우회 차단은 `admin/` match 자체를 좁혀야 한다.** 파일 머리말(`:5-7`)이 이미 경고하듯
>    현재 `match /admin/{p=**}` write(`:25-28`)가 하위를 전부 덮어 `resource == null`을 무력화한다 → **Z-2**.
> 4. **★ Emulator 검증은 설정 변경을 수반한다.** `firebase.json`에 **`emulators` 블록이 없고**
>    저장소에 `firebase-tools` 의존성이 없다. G-5 범위로 읽히지만 **이번엔 아무것도 수정하지 않았다** → **Z-6**.
> 5. **L-4(삭제 부활)는 C5로 해소되지 않는다** — 병합 의미론 문제, tombstone 별도 계약 → **Z-7**.
>
> ### Codex 구조 결정 Z-1~Z-8 (미결)
>
> **Z-1** UID 적용 범위 · **Z-2** rebuild 경로 위치·형태(**revision 번호를 경로에 쓰지 않는다**만 확정) ·
> **Z-3** head 문서 위치·스키마 · **Z-4** write port·오류 코드(⚠️ **SDK 내부 재시도**로 "retry 0"이
> port만으로 보장 안 됨) · **Z-5** `expectedBase` 캡처 시점 · **Z-6** emulator 검증 범위·허용 파일 ·
> **Z-7** L-4 tombstone · **Z-8** 배포 순서.
>
> ### ★ 신규 보호 대상
>
> **`docs/rebuild/design/taste-v2/`는 Founder 소유의 별도 작업이다 — 수정·삭제·stage·commit 금지.**
> 같은 작업으로 보이는 `docs/rebuild/design/README.md`(수정됨)와
> `docs/rebuild/specs/038-page-design-prototype.md`(untracked)도 **손대지 않았다.**
> 기존 보호 대상(spec-018 PNG 2개 + `packages/render/src/plan/index.ts`)도 유지한다.
> **force push · merge · rebase · `reset --hard` · broad delete 하지 않는다.**
>
> **신규 UNCONFIRMED**: 실제 운영자 **UID**(저장소에 없다) · **Emulator에서의 C5 거동**(7개 시나리오
> 전부 미실행) · **`resource == null` 규칙의 실제 거부 동작**.
> **추적 종료**: 고정 경로 `rev+1`의 CAS 보장 — **C3를 사용하지 않기로 했으므로** 더 추적하지 않는다.

> **이전 상태(참고)** — 스펙 037 후보 조사의
**보완 라운드 1(CORRECTION_REQUIRED)** 을 문서 전용으로 완료했다(2026-08-11, 기준 `9c57201`).
보고서 `reviews/2026-08-11-admin-write-atomicity-investigation.md`. 제품 코드·테스트·config·
manifest·`package.json`·lockfile·`pnpm-workspace.yaml`·`storage.rules`·`firestore.rules`·
`firebase.json` diff 0, 신규 의존성 0, 실제 Firebase·network·live·emulator·운영 데이터 접근 0,
upload/write/publish/deploy 0, 자동화 생성 0, 스펙 037 계약·제품 코드 작성 0.**
**★ 아직 `FOUNDER_DECISION_REQUIRED`로 넘기지 않는다 — 이 정정이 Codex 검수를 통과한 뒤에만
Founder G-1~G-5 결정을 요청한다.**

> ### ★★ 정정 후 결론 — **F-E는 해제되지 않았다. 쓰기 구현을 계속 차단한다.**
>
> - **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 확인되지 않았다.**
> - **기존 client-only + 현재 Rules로 E3-strong이 보장된다는 근거는 없다.**
> - **따라서 F-E에 따라 쓰기 구현은 계속 차단한다.**
> - **C5와 C6은 추가 권한이 필요한 후보이며 아직 Founder 선택이나 Codex 구조 승인을 받지 않았다.**
>
> ### 보완 라운드 1에서 정정한 5건 (초판 `768eecf`의 결함)
>
> 1. **★ Storage Rules의 객체 부재 판정 — 초판이 틀렸다.** 공식 Rules 참조는 불변성 강제 예로
>    **`allow write: if resource == null;`** 을 명시한다
>    (`firebase.google.com/docs/reference/security/storage/`). 초판의 **"객체 부재 판정 수단 없음 /
>    UNCONFIRMED"** 주장을 **삭제**하고, **기존 객체가 없을 때 `resource`가 null이라는 근거**와
>    **불변 객체 경로에 적용 가능한 규칙**임을 기록했다(§5.1).
>    교차 확인: `storage/security/rules-conditions`가 `resource`를
>    **"the file that *currently exists* at the request path"** 로 정의한다.
>    ⚠️ 참조 페이지 본문은 이 세션 WebFetch로 **여전히 미취득**(JS 렌더링) — **인용 출처는 Codex 검수**이며
>    §4.1이 그 사실과 교차 확인 근거를 함께 기록한다. **미취득은 도구 한계이지 문서 부재의 증거가 아니다.**
> 2. **★ 업로드와 metadata가 반드시 별개 요청이라는 단정 — 틀렸다.**
>    `uploadBytes(ref, file, metadata)`의 custom metadata는 **같은 업로드 동작에 실린다**
>    (`index.esm.js:1807-1821` multipart body 첫 파트 / `:1865-1876` resumable 세션 시작 body).
>    **`updateMetadata()`를 따로 호출한 경우에만** PATCH가 별개다.
>    **단 업로드에 metadata를 실어도 서버 generation precondition/CAS가 생기지 않으므로,
>    공개 API에 조건부 덮어쓰기가 없다는 결론은 유지된다.**
> 3. **★ Rules 동시성 단정 제거(자기모순 해소).** "Rules는 동시 요청을 직렬화하지 않는다 /
>    둘 다 통과한다"는 단정과 결정적 타임라인을 **삭제**했다. 남긴 사실은
>    **"공식 문서에서 고정 경로 `rev+1` 검사가 compare-and-set처럼 동작한다는 보장을 찾지 못했다"** 뿐이다.
>    **C3 판정 = FAIL → `NOT PROVEN / UNCONFIRMED`.** 정책 결론은
>    **확인되지 않은 방식으로 쓰기를 열 수 없으므로 차단 유지**다.
>    **`resource == null` 불변성 규칙과 고정 경로 revision CAS는 별개 문제**로 분리했다(§5).
> 4. **★ C5 이중 트랜잭션 모순 수정.** 초판의 "예약 → 업로드 → 커밋"은 모순이었다(예약이 head를 바꾸면
>    커밋의 `head==base`가 실패하고, 아무것도 기록하지 않으면 두 writer가 **같은 N을 예약**한다).
>    **A~H 단일 트랜잭션 후보**로 재분석했다(§6.4): **A** operation id / content-addressed id 기반
>    **고유 경로**(revision 번호를 경로에 쓰지 않는다) · **B** Storage Rules `resource == null`로
>    **덮어쓰기 서버 금지** · **C** 업로드 성공 뒤 **Firestore 트랜잭션 하나만** ·
>    **D** `expectedBase` vs 현재 head 비교 · **E** 불일치 시 **자동 재채택 없이 명시적 충돌 중단** ·
>    **F** 일치 시에만 `head = {revision: expectedBase+1, objectPath, 안전 metadata}` ·
>    **G** 한 명만 head 이동, 나머지는 **orphan** · **H** orphan 정책은 **Founder 결정 유지**.
>    **명시**: Firestore 트랜잭션 원자성은 **Firestore 문서 안의 read/write에만** 적용되고
>    **Storage 업로드는 트랜잭션에 포함되지 않는다.** 이 설계가 안전할 수 있는 이유는
>    **cross-service 원자성 때문이 아니라 immutable 객체를 먼저 만들고 Firestore head만을 단일 가변
>    정본으로 삼기 때문**이다. 실제 동시성·Rules 배포·브라우저 종료는 **NOT VERIFIED**이며
>    **C5를 PASS나 승인된 구조로 확정하지 않는다.**
> 5. **★ C6 판정 정밀화.** **GCS `ifGenerationMatch` 메커니즘 자체는 VERIFIED**(실패 시 **412** 보장).
>    그러나 **DENN Cloud Function/backend의 인증·권한·payload 제한·timeout·재시도·배포·운영 설계가
>    존재하지 않으므로 "C6 전체 PASS"라고 부르지 않는다** →
>    **"메커니즘 후보 VERIFIED / DENN end-to-end 구조 NOT DESIGNED·NOT VERIFIED"**.
>
> ### 변하지 않은 SDK 실측 근거
>
> `@firebase/storage@0.14.4`의 쓰기 4종 인자는 `ref`/`data`/`metadata`뿐이고 dist 전량 grep에서
> `ifGenerationMatch`·`ifMetagenerationMatch`·`precondition`·`etag` **0건**.
> `generation`/`metageneration` mapping은 `writable=false`(`:1413-1414`)이고
> `toResourceString`(`:1505-1515`)이 writable만 직렬화하므로 **요청 body에 실릴 수 없다**.
> 업로드 urlParams는 `{ name }`뿐(`:1825`·`:1866`), `updateMetadata` PATCH에 `If-Match` 없음.
> 클라이언트 endpoint는 `firebasestorage.googleapis.com/v0`(`:27`·`:571-577`)로
> `ifGenerationMatch`가 문서화된 `storage.googleapis.com` **GCS JSON API와 다른 표면**이다.
> **★ 원자성은 L-4(삭제 부활)를 고치지 않는다** — 병합 의미론 문제이고 tombstone 계약이 따로 필요하다.
>
> **Codex 후보(미결)**: Y-1 revision 형식(**generation은 단조 증가가 아니다**) ·
> **Y-2 격리 경로 — ★ 정정 반영**: C5는 revision 번호가 아니라 **operation id / content-addressed id
> 기반 고유 경로**를 요구하며, 단일 고정 경로를 고르면 C5가 아니라 C3(미확인) 쪽이 된다 ·
> Y-3 port 경계(⚠️ **SDK 내부 재시도**로 "retry 0"이 port만으로 보장되지 않는다) ·
> Y-4 충돌 오류 코드 · Y-5 합성 fake 범위(호출 순서·충돌 분기 재현 가능, **서버 원자성·Rules 거부
> 증명 불가**) · Y-6 L-4 tombstone · Y-7 orphan 식별·보존·정리 · Y-8 C3를 실제로 확인할지 포기할지.
> **Founder 후보(지금 요청하지 않는다)**: G-1 `storage.rules` 변경 · G-2 Firestore +
> `firestore.rules` 변경 · G-3 backend/Cloud Function · G-4 비용·orphan 정책 ·
> G-5 C5 / C6 / "쓰기를 계속 열지 않는다" 택일.
> **UNCONFIRMED**: 고정 경로 `rev+1`의 CAS 보장 · 덮어쓰기 `create`에서 `resource`가 채워지는지 ·
> `/v0`의 precondition 수용 여부. **해소됨**: "객체 부재 판정 수단" → `resource == null`.
> **NOT VERIFIED**: C5·C6의 실제 동시성 동작 · `resource == null` 규칙의 실제 배포·거부 · 실제 412 ·
> 브라우저 종료·네트워크 단절·인증 만료·중복 탭 실거동 · 실제 `admin/state.json` · L-1~L-4 재현 ·
> Firestore 번들 실측 · `docs/reference/**` 본문(이 세션 미취득).

> **이전 상태(참고)** — `WAITING_FOR_NEXT_SPEC`. 스펙 036은 Codex 독립 재검증과 종료 문서 확인을
모두 통과해 DONE이다(2026-08-10, 종료 문서 `a0543fb`).

- **제품 검증 커밋 = `b7ee207`** (구현 `fd92fbc` + CORRECTION_REQUIRED 라운드 1 보완).
  Codex 독립 게이트: frozen install PASS · format/lint 각 **153 파일** PASS · typecheck PASS ·
  **unit 1271/1271** + **invalid dynamic import warning 0** · build PASS ·
  **Chromium E2E 134/134** · `pnpm check` PASS · diff check·금지 경로 diff **0** ·
  ports 4183/4184·E2E temp 잔여 **0**.
- **문서 라운드**: 라운드 2 `91acec0`(해시 기록 정정), 라운드 3(이 항목, 문서 위생).
  **제품 코드 변경은 `b7ee207`이 마지막이다.**

**스펙 036 내용**: 운영자 Email/Password Auth + 비익명 세션 관찰/복원 + 고정 `admin/state.json`
읽기 + `readLegacyCatalog` 검증 + **메모리 전용**. 쓰기·발행·업로드·revision·충돌·tombstone·
마이그레이션은 **0**(F-B·F-D·F-E). **`firebase@12.17.1`** 정확 고정, admin 기능은
**`@denn/firebase/admin-read` 서브패스 전용**, **루트 배럴 무변경**, SDK는 **동적 import**라
admin 번들에서 Firebase는 lazy 청크로 분리된다. 기본 **비활성**: 플래그가 정확히 `"true"`가
아니거나 공개 config 5개 중 하나라도 비면 `initializeApp`·observer·Storage **0회**.

**라운드 1에서 고친 4가지**: ① Firebase 초기화·observer 오류 **fail-closed**
(`onAuthStateChanged(listener, onError)`, SDK error callback 전달, lazy facade의 factory rejection
라우팅 → unhandled rejection 0 · raw error 비노출 · `initializing` 영구 고정 제거 ·
rejection 전 unsubscribe 시 callback 0회) · ② **30,000 ms timeout 공개 계약 고정**(공개 옵션에서
`timeoutMs` 제거, seam은 내부 전용) · ③ **로그아웃 동시성 차단**(새 상태·문구 0, observer 단일
권위 유지) · ④ **Vite invalid dynamic import 경고 제거**.

**★ 고객 번들 불변식 (정본 기록 방식 = 파일명 + 바이트 수 + 파일 해시)**

- **파일**: `apps/mockup/dist/assets/index-W_cZpbdf.js`
- **크기**: **287,741 bytes**
- **SHA-256**: **`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`**
- `f86d446dde121bce287b393f905a02208b106face54b0803033eb800437bbc09`는
  **`dist` 트리 집계 다이제스트**(`find … | xargs sha256sum | sha256sum`)다. 파일 해시가 아니므로
  **"고객 dist SHA-256"으로 부르지 않는다.**
- 재현: Codex 4건(독립 build 2회 · E2E 전후 · 기준 계약 커밋 `765dfb4` archive 재빌드 ·
  Firebase/admin-read/고객 유출 문자열 0건) + Claude 1건(두 측정 방식 모두 재현).
  → **"기준과 현재 고객 JS byte-identical" PASS.**

⚠️ **`pnpm-workspace.yaml`의 `allowBuilds`**: 수정하지 않았고 `pnpm approve-builds`도 실행하지
않았다. `node_modules` 없는 새 클론에서의 frozen install 재발 여부는 **NOT VERIFIED**이며,
Codex의 새 클론 시도는 **registry EACCES로 중단**돼 성공·실패로 단정하지 않는다.
수정은 **별도 Founder 승인 대상**이다.
**NOT TESTED**: 운영자 계정 실재·로그인 · Rules 실제 배포·거부 · 실제 `admin/state.json` ·
인증 만료·갱신 · 실제 Storage CORS·`getBytes` · 실기기 · 쓰기 원자성 · 실제 SDK 오류 코드 문자열.

> live 로그와 스펙 036의 과거 append 기록은 **그대로 보존**한다. 이 상단 요약만 현재 사실에 맞춘다.

> **이전 상태(참고)** — 스펙 036 계약 작성(`77b5b47`) + 1차 보완(`9fb1456`) + 2차 타입·비동기 보완.
계약 `docs/rebuild/specs/036-admin-auth-private-state-read.md` — **운영자 Email/Password 인증 +
비익명 세션 관찰/복원 + 고정 `admin/state.json` 읽기 + `readLegacyCatalog` 검증 + 메모리 전용**.
저장·쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션은 **전부 제외**(F-B·F-D·F-E).
핵심 경계: **`firebase@12.17.1` 정확 고정**(2026-08-04 최신 공식 릴리스, **존재 VERIFIED**;
구현 단계에서만 추가) · admin 기능은
**서브패스 `@denn/firebase/admin-read` 전용**이고 **루트 배럴 수정 금지** ·
**고객 번들에 Firebase SDK 0**(번들 문자열 + dist SHA-256으로 검증) · 기본 **비활성**이며
`VITE_DENN_ADMIN_FIREBASE_ENABLED=true` + 완전한 config일 때만 초기화(아니면 `UNCONFIGURED`,
SDK·observer·Storage **0회**) · **안전 오류 코드 15개 확정** · 미인증/익명에서 Storage **0회** ·
자동 retry·polling **0** · **단일 in-flight** · password 저장·로그 0 ·
`browserLocalPersistence` 실패는 **fail-closed**.
⚠️ **계정 1개는 운영 정책이며 `storage.rules`는 UID/email allowlist를 강제하지 않는다**(Rules 변경 미승인).
**★ 2026-08-10 계약 정확성 보완**(제품 결정 변화 0): ① SDK 고정 `12.16.0` → **`12.17.1`**,
**버전 존재 VERIFIED**(호환성만 UNCONFIRMED) · ② 활성화 판정을 **플래그 정확 비교 + 공개 config
5개 전부 비어 있지 않은 문자열**로 고정하고 **`packages/firebase`는 `import.meta.env`를 읽지 않고
주입만 받는다**를 명시 · ③ 공개 타입을 **유효한 TypeScript로 완전 정의**(`Result<T,E>` 인자 생략 제거,
`SafeAdminReadError` 등 5종, **`correlationId`는 호출자 주입**) · ④ **안전 오류 15개 매핑 표**
(invalid credential 계열은 계정 존재 추론 방지를 위해 **하나로 통합**, `NETWORK_TIMEOUT`은
**SDK code가 아니라 앱 wrapper 상태**) · ⑤ **20 MiB = 20,971,519 bytes의 클라이언트 `getBytes`
안전 상한이며 서버 read 보장이 아니다**(`storage.rules:14`가 read에 `request.resource.size`를
쓰지 말라고 명시, `:26`은 크기 조건 없는 `allow read: if op();`).
**UNCONFIRMED**: `firebase@12.17.1`의 실제 설치·빌드 호환성 · 운영자 계정 실재 ·
Rules 실제 배포·거부 동작 · 실제 `admin/state.json` 내용.
**★ 2차 보완 — 타입·비동기 경계**(제품 결정 변화 0): ⑥ `OperatorAuthState`의 `error` 코드를
**`OperatorAuthErrorCode`로 축소**(catalog/storage 코드가 인증 상태에 타입상 못 들어옴) ·
⑦ **observer가 인증 상태의 유일한 권위** — `OperatorAuthActionValue`에서 `state` 제거, action
Promise는 **SDK 완료만** 의미하고 **완료 순서를 가정하지 않으며** UI가 상태를 덮어쓰지 않는다 ·
⑧ **`ADMIN_STATE_READ_TIMEOUT_MS = 30_000`** 확정, **`getBytes` 읽기에만 적용**하고
**Auth action·observer에는 걸지 않는다**(늦은 성공이 실제 세션을 바꿔 반환값과 갈라지므로).
**실제 SDK 취소는 주장하지 않고** 늦은 결과 폐기만 보장, 자동 retry 0 ·
⑨ **비노출 검증 경계 정정** — 성공 값에는 검증된 문서가 들어가므로 **합법적 카탈로그 `data:` URL
제거는 요구하지 않고**, raw error·실패 원문·UI/로그를 각각 분리해 고정했다(성공 값은 **메모리 전용**,
스펙 035 UI·localStorage·IndexedDB·주문·upload·publish와 **연결 금지**).
**다음 = Codex가 최종 계약을 검토**하고, 이어서 **Founder가 구현 착수를 별도 승인**해야 한다.
그 전에는 코드·SDK 추가 0.

> **이전 상태(참고)** — `READY_FOR_CODEX` · F-A~F-E Founder 결정 확정(2026-08-10, 기준 `8ea0c30`).
정본 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(승인 원문 수록).
**F-A** Auth 도입, **1단계 = Auth + `admin/state.json` 읽기, 쓰기 0**, 기존 비익명 계정 1개,
**`firebase` SDK 신규 의존성 승인**(신규/다중 계정·역할·**Rules 변경은 미승인**) ·
**F-B** 발행 제외, 쓰기를 열더라도 admin 저장만, 저장 UI에 **"발행되지 않음" 표시 필수** ·
**F-C** `admin/state.json`은 **읽기만 공유**, 향후 쓰기는 **격리된 rebuild 전용 경로**(경로는 Codex 계약) ·
**F-D** 정규화 결과 **메모리 전용**, **저장 payload 미포함**, 되쓰기·삭제·마이그레이션 금지 ·
**F-E** **E3-strong** — last-writer-wins 불허, 원자적 precondition·잠금 가능성 **조사·검증 전까지
쓰기 구현 차단**.
**아직 승인되지 않은 것**: 제품 구현 자체 · 실제 Firebase/network/live/emulator/운영 데이터 ·
Rules/Hosting/배포 · 발행 · 레거시 공유 쓰기 · cm 마이그레이션 · **쓰기 구현 전반**.
**UNCONFIRMED**: 운영자 계정의 실제 존재·접근 가능 여부 · Rules 실제 배포/거부 동작 ·
Web SDK의 Storage 원자적 precondition 지원 · Firestore 잠금·Rules 변경 필요 여부.
**다음 = Codex가 "Auth + `admin/state.json` 읽기 전용 구현 계약"을 작성**한다(구현 착수 아님).

> **이전 상태(참고)** — 스펙 034·035 DONE (2026-08-10). 운영자 cm 입력 최소 범위가 코드로 닫혔다.
Founder 승인 O-1~O-8 + 구조 결정 N-1~N-10 = `decisions/2026-08-10-operator-cm-input-decisions.md`
(계약 `d3bed91`). **034**(`ff7a49a`) legacy `wcm`/`hcm` 읽기 정규화·충돌 fail-closed,
**035**(`e9e2af6`) 운영자 cm 로컬 입력·검증 UI. 게이트: frozen·format·lint·typecheck·
unit **1213/1213**·build·Chromium E2E **131/131**·dist hash E2E 전후 동일·ports/temp 0.
**Auth·Firebase 쓰기·발행·실제 network·deploy는 계속 0**이며 O-8로 미뤄졌다.
Codex 독립 재검수도 frozen·format·lint·typecheck·unit **1213/1213**·build·Chromium **131/131**·
check·diff·forbidden 범위·ports/temp PASS로 완료됐다. 고객 bundle byte hash는 shared 배럴 export의
모듈 순서 영향으로 달라졌지만 authoring 코드·문구는 bundle에 0건이고 `apps/mockup/**` diff 0 및
고객 회귀 E2E 전량 PASS라 비기능 변화로 승인했다. 다음 = **FOUNDER_DECISION_REQUIRED** —
Founder F-A~F-E(admin Auth·쓰기·충돌·발행)가 여전히 미결이다.

> **★ F-A~F-E 선택지 조사(2026-08-10, 읽기 전용, 기준 `267ea72`)**: 보고서
> `reviews/2026-08-10-admin-auth-write-founder-decision-options.md`.
> **문서 전용 — 제품 코드·테스트·설정·lockfile·의존성 diff 0, 실제 Firebase·network·live·
> emulator·Rules·deploy 0.** 각 항목을 근거(정확한 경로/라인)·대안·위험·최소 안전 권장안·
> 미룰 경우 차단되는 작업으로 정리했다.
> **★★ 다섯 항목 전부 미결이며, 보고서 §8의 승인 프롬프트는 예시일 뿐 Founder가 말한 적이 없다.**
> 권장안(A2+계정 1개 / B1 저장만 / 읽기만 공유 / D1 메모리 전용 유지)은 **Claude의 권장이지
> 결정이 아니다**.
> **★ 2026-08-10 문서 정확성 보완(`CORRECTION_REQUIRED` 판정, 초판 `24d0c04`)** — 제품 결정 변화 0:
> ① "저장소 전역 grep 0건"은 **틀렸다**. 0건은 **리빌드 `apps/**`·`packages/**` 한정**이고
> **레거시 `denn-admin.html`·`denn-mockup-tool.html`에는 Auth/write 코드가 존재한다**
> (인증 심볼 7건/4건, `uploadString` `:14782`·`:14838`·`:15475`·`:15560`).
> ② `storage.rules`는 **파일이 의도하는 정책만 확인**됐고 **실제 배포 여부·거부 동작은 UNCONFIRMED**다.
> ③ **F-E 모순 제거** — E2는 **원자적 precondition이 아니며 잔류 last-writer-wins 손실 가능성이
> 남는다**. 선택지를 **E2-best-effort**(경합 창·잔류 손실 명시적 수용) / **E3-strong**(손실 불허,
> 원자적 precondition·잠금 지원 가능성 조사·검증 전까지 **쓰기 구현 차단**, Rules·Firestore 잠금은
> 별도 승인)으로 **택일 분리**했다. "손실 불허 + E2 승인" 문장은 삭제했다.
> ④ **단계 관계 명시** — **1단계 = Auth + `admin/state.json` 읽기, 쓰기 0**.
> `B1 저장만`은 **향후 쓰기 단계의 정책 권장안이지 현재 구현 허가가 아니고**,
> **쓰기 계약은 Founder의 쓰기 단계 착수 승인 전에는 작성하지 않는다**.
> **★ 새 발견 X-7**: F-D에서 되쓰기를 허용하면 스펙 034 N-4의 `CONFLICTING_PRINT_SIZE`가
> **자기 발등을 찍는다** — 리빌드가 canonical만 갱신하고 legacy `wcm`을 남기면 다음 read부터
> **카탈로그 전체가 fatal로 안 읽힌다**. 레거시 `confirmEditSz`(`denn-admin.html:1668-1685`)는
> cm을 저장하지 않아 한 번 어긋나면 **스스로 맞춰지지 않는다**. 저장 스펙은
> **쓰기 payload에서 승격 필드를 제외**하는 계약을 반드시 포함해야 한다.
> **NOT VERIFIED**: 실제 `admin/state.json`·`published/state.json` 내용, L-1~L-4 재현,
> 실제 Rules 거부 동작, Console 계정 상태, Web SDK의 Storage precondition 지원 여부,
> 인쇄소 요구(P-4a 유지).

> **★★ 스펙 034 DONE(2026-08-10, `ff7a49a`, 기록 `5097179`)**: 레거시 `wcm`/`hcm`을 **읽는 순간
> 메모리에서** canonical로 정규화한다(N-1: 정규화는 `readLegacyCatalog` 안, `projectFramePrintPhysicalSize`
> **무변경**). canonical이 **없을 때만** 승격(O-3), 공존하며 **다르면 fatal `CONFLICTING_PRINT_SIZE`**
> (O-4, 허용오차 0 — `21.000001`도 실패). 승격은 **`cloneJsonSafe` 결과에만** 쓰므로 입력은 안 바뀐다(O-5).
> **canonical 검증이 먼저**이고 실패 시 legacy를 보지 않는다(N-3). 승격 불가(반쪽·타입·범위 밖)는
> **warning `LEGACY_PRINT_SIZE_IGNORED`이지 fatal이 아니다**(N-5) — 인쇄는 계속 차단되지만 쓰레기 값
> 하나가 고객 카탈로그 전체를 못 읽게 만들지는 않는다. `wcm`/`hcm`은 인정 필드가 되어 `UNKNOWN_FIELD`에서
> 빠지고 값은 문서에 그대로 남는다. **다른 6쌍의 cm 이름 후보와 이름·`sub` 파싱은 계속 금지**(P-2).
> unit +19, E2E 129/129.

> **★★ 스펙 035 DONE(2026-08-10, `e9e2af6`, 기록 `0bc2aa8`)**: **리빌드 최초의 운영자 기능**.
> `evaluateOperatorPrintSizeInput(widthText, heightText)`가 후보 카탈로그를 만들어
> **`readLegacyCatalog` + `projectFramePrintPhysicalSize`를 실제로 실행**해 판정한다(N-7) —
> `> 0`·`<= 500`·all-or-nothing 규칙이 UI에 **복사되지 않는다**. 표기 검사는 `/^\d+(\.\d+)?$/`
> 하나이고 **`parseFloat`를 쓰지 않는다**(N-8: 레거시 `parseFloat(...)||1`이 `"abc"`를 **1 cm**로
> 저장했고 1 cm는 유효 범위라 뒤에서 잡을 수 없었다). **prefill 0**(레거시 `21` 날조 재현 금지),
> **`sub` 무관**(O-6), **저장·전송·클립보드·다운로드 0**(O-1). admin 카드에 **클릭 가능한 요소가 0개**이고
> 새로고침하면 값이 사라지는 것을 E2E가 확인한다. unit +20, E2E +2(131/131).
> **⚠️ 보고**: 고객 `dist` JS 해시가 바뀌었다(`49cae2d3…`→`f86d446d…`, −28 byte) — 배럴 추가로
> **minifier 식별자 배치가 밀린 것**이고, authoring 코드 문자열은 고객 번들에 **0건**(tree-shaken).
> E2E **전후** 해시 동일이라는 본래 불변식은 유지된다.
> **남는 것**: 운영자는 값을 **저장할 수 없다**(확인 후 레거시 admin에 직접 입력) — O-1·O-2의 결과이고
> 저장 경로·revision·충돌·발행은 **O-8의 별도 Founder 결정**이다. 실기기 확인 없음.

---

## 스펙 033 이전 기록 (그대로 보존)

> **스펙 033 DONE(2026-07-31)**: 구현 `4246503`, 기록 `9e2d408`. Codex 독립 게이트 frozen·format·
> lint·typecheck·unit 1174/1174·build·Chromium 129/129·diff·dist hash·ports·temp PASS.
> 승인 원문을 이 Codex 대화에서 재확인했다. Codex는 E-1/C-1을 동일 preview plan +
detached HTMLCanvasElement uniform transform으로 확정했고, E-2는 Chromium pixel E2E 판정,
E-3은 minLongSide/maxPixels 동시 충족 불가 시 fail-closed로 확정했다. 구현 계약:
`docs/rebuild/specs/033-local-frame-png-export.md`. 실제 upload/order/Firebase/network/deploy는
계속 금지다. Founder F-A~F-E(admin)는 독립·미결이다.**


> **★★ 스펙 033 구현(2026-07-31, `4246503`, 계약 `4ee162e`)**: 로컬 액자 PNG export.
> **C-1 = 후보 A 확정**(Codex) — 승인된 **plan 인스턴스를 그대로** detached canvas에 넘기고
> `setTransform(printScale,0,0,printScale,0,0)`을 **정확히 한 번** 적용한 뒤 **기존 executor**를 돌린다.
> plan 재빌드·인쇄 폭 재측정·prewrapped 입력·plan 좌표 scaling **0** → `draw-text`의 `lines`가 확정값이라
> **재wrap될 여지가 구조적으로 없고 P-6이 성립**한다. unit이 plan identity(`toBe`)와 JSON 불변을 고정.
> **순서**: 크기 → transform → executor → (**ok일 때만**) `toBlob` → URL → 다운로드.
> **P-3**: executor 실패·`blob===null`·taint throw 전부 **파일 0 · retry 0**.
> **URL**: 생성자가 revoke, 살아 있는 URL **최대 1개**(E2E: 3회 export → created 3 / revoked 2).
> **E-2는 실제 픽셀로 판정** — 비정수 배율·가로·letter-spacing·회전+확대에서 print를 preview 크기로
> 정규화해 **차이 픽셀 비율 ≤ 2%**(noise floor 24)를 확인. 결정성(PNG 2회 바이트 동일)도 확인.
> 게이트: unit **1174/1174**, Chromium E2E **129/129**, dist SHA-256 E2E 전후 동일, lockfile 0, ports/temp 0.
> **★ 보고된 관측 2가지**: ① **E-3 재검사는 현재 상수로 도달 불가능**(upscale ≤ 9MP, downscale 긴 변 ≥ 6000)
> — 가드는 유지하고 불가능성을 unit으로 고정했다. ② **★ 카탈로그 `aspect`와 cm 비율이 다르면 인쇄가
> 나오지 않는다** — 스펙 032가 불일치를 자동 수정하지 않기로 했으므로 **왜곡 대신 `NON_UNIFORM_SCALE`로
> 실패**한다 → **운영자 cm 입력 UI 스펙에서 처리 결정 필요**.
> **NOT TESTED**: 실제 인쇄물·인쇄소 수용성·실기기 `toBlob`·대용량 메모리/성능.

> **Founder E-4·E-5·E-6 확정(2026-07-31, 문서 전용)**: 정본
> `docs/codex-claude-handoff/decisions/2026-07-31-local-png-export-ui-decisions.md`.
> ⚠️ **절차 기록**: 조사 §9는 이 셋을 **"결정 필요"로만** 올렸고 **권장안이 없었다**(032의 P-1~P-6과 다름).
> Claude가 **확정 제약(P-5c·P-4a·`PREVIEW_MESSAGES`)에서 도출한 권장안을 명시하고 승인분으로 기록**했다 —
> **의도와 다르면 결정 문서만 정정**하면 된다(제품 코드 없음).
> **E-4 파일명** `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png` — **고객 문구·id·token 0**(파일명도
> 저장·전송이라 P-5c 적용), **사이즈 이름 대신 cm**(이름은 바뀌면 파일 추적이 깨지지만 cm은 물리적 사실이고
> 인쇄소가 실제로 쓰는 값 — P-2와 같은 방향), 레거시 epoch 대신 **읽을 수 있는 로컬 시각**.
> **E-5 UI** 미리보기 아래 **독립 영역** + **카카오 주문 CTA와 분리**(P-4a로 주문 전송이 차단인데 주문 버튼
> 옆이면 오해 — 레거시 V36은 다운로드·주문 저장·카카오를 한 흐름으로 묶었다), 버튼 `인쇄용 파일 내려받기`
> (**"주문" 금지**), 실패 문구에 **"다시 시도" 금지**(자동 retry 0), 비활성 사유 **고정 문구 +
> `aria-describedby`**(`disabled`만으론 스크린리더가 이유를 못 읽는다), 미리보기 사유는 **기존 문구 재사용**.
> **E-6** **수치 비노출** — `300dpi`·`3000`·`36M`·결과 픽셀 크기 전부 숨기고
> `인쇄 설정은 인쇄소 확인 전 임시값입니다.` 한 줄만. P-4a는 **"임시값 명시"**를 요구했지 **"수치 노출"**이
> 아니고, 수치는 인쇄소 확인 후 바뀔 예정이라 기억하면 혼란이 된다.
> **★ 이 승인만으로 구현 불가** — **E-1(=C-1)·E-2·E-3은 Codex 결정이며 미결**이다.

> **★★ 로컬 액자 PNG export 연결부 조사(2026-07-31, 읽기 전용, 지시 `aaf9268`)**: 보고서
> `docs/codex-claude-handoff/reviews/2026-07-31-local-frame-png-export-seam-investigation.md`.
> **문서 전용, 제품 코드 diff 0, 실제 network·업로드·주문 전송·배포 0.**
> **① ★★ export가 `logicalWidth`를 바꾸면 P-6이 깨진다** — frame plan의 논리 폭은 **측정 CSS 폭**에서
> 나오고(`resolveFrameLogicalWidth`, 상한 `FRAME_MAX_LOGICAL_WIDTH=500`) 폰트 크기·wrap 폭이 **전부 그
> 폭의 %**다. 재빌드 = **재측정 → 재wrap** → 줄바꿈이 달라질 수 있다.
> **줄바꿈 동일성의 구조적 보장 = plan 고정 + transform만 걸기**.
> **② ★ 그 패턴은 이미 있다** — `surface.ts:151`이 매 draw마다 `setTransform(dpr,0,0,dpr,0,0)` 후
> **같은 plan을 같은 executor로** 실행한다. 인쇄는 `dpr` 자리에 `printScale`. 레거시도
> `drawImageT(..., dim.w/500)`로 같은 일을 했고 **그 500이 `FRAME_MAX_LOGICAL_WIDTH`와 같은 수**다.
> **③ ★ `surface.ts` 재사용은 불가** — 관측 CSS 크기가 `plan.logicalCanvas`와 **0.5px 이내**여야 하고
> 아니면 `failed`(`:110-117`). **인쇄 때문에 이 불변식을 완화하면 미리보기 보호가 약해진다.**
> **④ ★ 붙일 seam이 아직 없다** — `plan`·`imageBindings`가 `PreviewComposer` 내부 지역값이고
> 리빌드 전체에 `toBlob`·다운로드 **0건**. 단 **`plan !== null` 자체가 art·사진·폰트 준비 완료의 증명**이라
> export가 별도 판정을 만들면 **두 번째 진실 원천**이 된다.
> **taint**: 사진=object URL, 아트 `data:`=안전, `firebase-download-image`만 `crossOrigin` **src 이전 설정**
> + **anonymous 실패 재시도 안 함**(재시도했다면 tainted → 인쇄 0×0). 그래도 `toBlob`은 감싸야 한다.
> **`toBlob` 순서**: executor `ok` 확인 → ok일 때만 `toBlob`, 실패는 **파일 0개**
> (레거시는 아트 빠진 PNG를 주문까지 보냈다 = P-3 위반). **object URL은 생성한 쪽이 해제, 살아 있는 URL ≤1**
> (레거시 800ms 타이머는 탭 종료 시 누수).
> **provisional**: `dpi 300 / minLongSide 3000 / maxPixels 36M / fallbackLongSide 3508`
> (`denn-mockup-tool.html:11242-11248`). **★`fallbackLongSide` 분기는 재현 금지**(cm 없으면 미생성 = P-2).
> 함정 = **min 업스케일과 maxPixels 다운스케일이 서로 싸울 수 있고 레거시는 재검사하지 않는다**.
> **hard boundary**: 업로드·주문 payload·IndexedDB 주문 저장·카카오 열기·고객 문구 텍스트 저장/전송 전부
> 경로 밖(레거시 V36 `:9732`는 이 넷을 한 함수에 묶었다). ⚠️ 레거시엔 `framePrintSize`가 **두 개**이고
> **주문 버튼에 연결된 V36은 cm을 전혀 안 본다**(하드코딩 3000) — **NOT VERIFIED**.
> **STOP Codex**: **★E-1 C-1 확정**(조사는 근거만 모으고 **고르지 않았다**) · E-2 픽셀 위험 사전 측정 ·
> E-3 minLongSide↔maxPixels 충돌 처리. **STOP Founder**: E-4 파일명 규칙 · E-5 UI 문구 · E-6 임시 상수 노출.
> **NOT VERIFIED**: 비정수 배율·자간 품질·clip 반픽셀(측정 안 함), 실기기 `toBlob`, 대용량 성능.

> **★★ admin 쓰기 경계 조사(2026-07-31, 읽기 전용, 지시 `802a486`)**: 보고서
> `docs/codex-claude-handoff/reviews/2026-07-31-admin-write-boundary-investigation.md`.
> **문서 전용, 제품 코드 diff 0, 실제 Firebase·network·live·emulator 실행 0.**
> **① 인증 경계는 이미 확정** — `storage.rules`의 `op()`가 `admin/`을 **non-anonymous만 read+write**로
> 잠갔다(20 MiB cap). 리빌드는 재현이 아니라 **만족**시키면 된다. ⚠️ 레거시 `dennCloudSaveAdminV`의
> **미인증 조용한 return**은 계승 금지.
> **⚠️ 2026-08-10 정정으로 superseded**: "이미 확정"은 과한 표현이다. 확인된 것은 **저장소의
> `storage.rules` 파일이 의도하는 정책**이며, **실제 운영 Firebase 배포 여부와 거부 동작은
> UNCONFIRMED**다.
> **② ★ 실제 network 없이 검증할 선례가 있다** — `public-catalog/reader.ts`의 **주입 transport(`FetchLike`)
> + 100% 합성 fake + `*.live.test.ts` 기본 게이트 제외**(`vitest.config.ts:17`). write port도 같은 형태면 된다.
> **③ ★★ 레거시 admin 동기화 = 사실상 last-writer-wins** — `__cloudRev = Date.now()`는 **벽시계**이고
> upload 전 **원격 rev 재확인이 없다**. 손실 경로 **L-1** 시계 역전 / **L-2** 디바운스(3초) 내 겹침 /
> **L-3** rev 동일 시 분기 고착 / **L-4 `frameSizes`에 tombstone이 없어 삭제가 부활**한다.
> **L-4는 cm UI와 직접 충돌** — 지운 사이즈가 되살아나면 **cm 없는 인쇄 불가 사이즈가 돌아온다**.
> **④ ★ publish는 별개의 두 번째 쓰기** — `dennPublishState`가 localStorage의 `roomBackgroundSettings`로
> 덮어쓰고 base64를 내용해시 경로로 외부화해 발행한다 → **발행본 ≠ `admin/state.json`**, 순서도 무관하고
> **"발행 안 된 변경"을 알리는 장치가 없다**.
> **`wcm`/`hcm` 정규화안**(canonical 없을 때만 승격, 둘 다 있고 다르면 fail-closed)은 legacy pair가
> **운영자 명시 입력 필드**라 **P-2와 충돌하지 않는다**. 남는 문제: **W-1** `parseFloat||1`로 무효 입력이
> **1 cm** 저장 · **W-2** `aspect` 불일치를 그대로 승격 · **W-3** snapshot 되쓰기 여부 →
> **정규화 시점 재검증 필수 + `aspect` 불일치는 진단**. `sub`는 **독립 유지가 안전**(인쇄 무영향).
> **STOP Founder**: F-A Auth 도입 · F-B 쓰기 범위 · **★F-C 레거시와 `admin/state.json` 공유/격리** ·
> F-D 정규화 되쓰기 · F-E 손실 시나리오 허용 여부. **STOP Codex**: X-1 revision 모델 · X-2 병합 vs
> fail-closed · X-3 tombstone · X-4 write port·경로 allowlist · X-5 검증 재적용 · **X-6 STOP 4(A/B/C) 미답**.
> **NOT VERIFIED**: L-1~L-4 재현, 실제 state.json 내용, 실제 rules 거부 동작, 레거시 UI 실행.

> **★ 운영자 cm 입력 UI 조사(2026-07-31, 읽기 전용)**: 보고서
> `docs/codex-claude-handoff/reviews/2026-07-31-operator-cm-input-ui-investigation.md`. **문서 전용, 제품 코드 diff 0.**
> **① 리빌드 admin에 아무것도 없다** — `apps/admin/src`는 스펙 011 프리미티브 데모 셸 **3파일 79줄**,
> 카탈로그·저장·인증 0. 리빌드 전체 **쓰기 경로 0건**(`FIREBASE_NOT_IMPLEMENTED`), 읽기는
> `published/state.json` 하나뿐이고 `admin/state.json`은 **읽지도 쓰지도 않는다**.
> → 이 스펙의 실제 크기는 "입력란 두 개"가 아니라 **최초의 운영자 기능 + 최초의 쓰기 경로**다.
> **② ★★ 레거시에 이미 `wcm`/`hcm`이 있다** — `denn-admin.html:1698`이 저장하고
> `denn-mockup-tool.html:11302`가 **1순위**로 읽는다. 스펙 032가 고른 `printWidthCm`/`printHeightCm`은
> 레거시 후보 **6순위**라 하위호환은 안전하지만, **운영자가 실제 값을 넣어온 필드는 `wcm`/`hcm`**이라
> 지금 리빌드는 `UNKNOWN_FIELD`로 흘리고 projection이 **`null`(=인쇄 불가)**을 낸다 → **마이그레이션 결정 필요**.
> **③ 레거시 사이즈 "수정"이 cm을 저장하지 않는다** — `confirmEditSz`가 `aspect`만 갱신하고 `wcm`/`hcm`
> 대입이 없어 **조용한 불일치**가 생기고, `editSz`는 `sub` 파싱과 **`wcm=21` 날조 기본값**으로 폼을 채운다.
> 스펙 032의 NOT TESTED "aspect↔cm 불일치"의 **실제 발생 메커니즘**이며 **재현 금지 대상**이다.
> **STOP**: 1 admin 인증·쓰기·발행 도입 여부(Founder, **Firebase 표면 = 자동 진행 금지**) ·
> 2 `wcm`/`hcm` 처리(Founder+Codex) · 3 `sub` 파생 여부(Founder) · 4 저장 경로 A/B/C(Codex) ·
> 5 레거시 편집 동작 재현 금지 명시(Codex).
> **NOT VERIFIED**: 실제 발행 카탈로그의 `wcm`/`hcm` 건수(실제 network 금지), 레거시 admin UI 실행 확인.

> **스펙 032 DONE(2026-07-31, Codex 승인 `315356a`)**: 최종 게이트 frozen·format·lint·typecheck·build PASS,
> unit **1109/1109**, Chromium E2E **116/116**, diff check·forbidden diff·ports 4183/4184·OS temp PASS.
> 기능 코드·테스트 추가 수정 **0**, 종료 문서만 별도 커밋.
> 인계: `docs/handoff/2026-07-31-spec-032-print-physical-size-handoff.md`.
> **다음 = 운영자 cm 입력 UI 읽기 전용 조사**(`apps/admin/**`은 조사 대상이지 수정 대상이 아니다).
> **NOT TESTED**: 실제 발행 카탈로그의 cm 필드(아직 없음 — 전부 합성 fixture) · `aspect`↔cm 비율 불일치 진단.

> **스펙 032 구현(2026-07-31, `c10e7a6`)**: 정본 계약
> `docs/rebuild/specs/032-frame-print-physical-size-catalog.md`(`2a0cfd3`).
> **이번 단위는 순수 카탈로그 계약이다** — 실제 print/export·PNG 생성·주문 payload·운영자 입력 UI는 전부 후속 스펙.
> `frameSizes[].printWidthCm`·`printHeightCm`은 **함께 있거나 함께 없어야** 하고 각각 finite·`> 0`·`<= 500`이며,
> 위반은 **없는/틀린 쪽 path의 `INVALID_NUMBER`로 fail-closed**한다. 둘 다 없는 기존 카탈로그는 **그대로 읽힌다**.
> `projectFramePrintPhysicalSize(document, frameSizeId)`는 **`{widthCm,heightCm}` 또는 `null`만** 반환하고
> 이름·`sub`·label·id·`aspect`·논리 `w`/`h` 중 **어느 것도 cm로 쓰지 않는다**(P-2의 코드 구현).
> 게이트: frozen(lockfile 0)·format·lint·typecheck PASS, unit **1109/1109**, build PASS,
> Chromium E2E **116/116**, 고객 dist SHA-256 E2E 전후 동일, ports/temp 0.
> `apps/**`·`packages/render/**`·의존성 변경 **0**.

> **스펙 032 결정 확정(2026-07-31)**: 정본
> `docs/codex-claude-handoff/decisions/2026-07-31-spec-032-print-export-decisions.md`,
> **결정 정본 커밋 `0443137`**(Founder가 이 커밋을 정본으로 명시 인정, 2026-07-31 재확인).
> 승인 문장(원문): `스펙 032 Founder 권장안 P-1·P-2·P-3·P-4a·P-5·P-6을 일괄 승인하고 자동화를 계속 진행해.`
> ⚠️ **절차 기록**: Codex의 마지막 지시는 "보완된 질문을 **Codex가 승인하기 전 확정하지 않는다**"였으나
> Founder가 순서를 **명시적으로 앞당겨** 결정했다(CLAUDE.md §7상 최신 Founder 결정이 최상위).
> **조사 보고서에 대한 Codex 재검토는 여전히 미완**이며, 전제가 틀렸다고 밝혀지면 해당 항목은 다시 연다.
> **P-1**: **액자 인쇄만**, **케이스는 별도 스펙**(케이스는 V36 구경로 + `textObjs`로 텍스트 모델이 다르다).
> **P-2**: 물리 치수는 **카탈로그 명시 필드에서만** — **이름 텍스트 파싱 금지**(사이즈 이름을 바꾸면
> 인쇄 해상도가 바뀌는 동작은 제품 사고). 전제로 **V1 allowlist에 cm 필드가 없어 스키마 확장 +
> admin 입력 UI가 별도 스펙**으로 필요하고, **치수가 없으면 인쇄를 만들지 않는다**(추측 금지).
> **P-3**: 경고가 있으면 **인쇄 파일을 만들지 않는다(fail-closed)** — 미리보기(026·028·031)와 동일 규율.
> **부분 파일·아트 누락 파일 0**. 레거시는 아트가 빠진 PNG를 그대로 주문까지 보냈다(조사 §5).
> **P-4a**: `300dpi`·`3000`·`36M`·`3508`을 **명시적 임시값**으로 구현·검증하되
> **★ 인쇄소 확인 전까지 실제 업로드·주문 전송·배포를 차단**한다(로컬 다운로드·E2E는 허용).
> 함께 미확인: **색공간/ICC · 재단 여백 · 파일 형식 · 최대 크기**(저장소 근거 0).
> **P-5**: **P-5a 색·사진 transform 담는다** / **P-5b 시계 유무 담는다**(실물 시계 부착 여부는
> **운영자가 알아야 할 제품 구성**인데 지금 주문서에 없다) / **P-5c 고객 문구 원문은 텍스트로
> 저장·전송하지 않는다** — 이미 **PNG에 픽셀로 포함**되어 추가 저장이 불필요하고, 텍스트 저장·전송은
> **별도 개인정보 승인**이 필요해 범위 밖이다(스펙 031의 "오류 payload에 원문 미포함" 규율을 확장).
> **P-6**: **미리보기와 인쇄의 줄바꿈은 반드시 동일**하다. 이는 §8.1 후보 선택에 **제약만** 걸고
> **A/B/C 중 무엇을 택할지는 정하지 않는다**(Codex C-1).
> **불변식**: 케이스 인쇄 코드 0 · 치수 추측 0(없으면 미생성) · 경고 있으면 인쇄 파일 부존재 ·
> 수치는 임시값이고 **출력은 차단** · 고객 문구 텍스트 저장·전송 0 · 줄바꿈 동일 ·
> 019/026/028/029/030/031 계약 무변경이며 **시계는 인쇄에 없다**(F-4).
> **여전히 미결정**: **C-1 후보 A/B/C** · cm 필드 이름·단위·검증과 admin UI(별도 스펙) ·
> **인쇄소 요구 전체**(외부 확인) · 케이스 인쇄 · C-2~C-8 · 인쇄 배율의 자간 품질과 대용량 성능
> (**NOT VERIFIED**) · **조사 보고서 Codex 재검토**.
> 이 라운드도 **문서 전용**(제품 코드·테스트·CSS·설정·lockfile diff 0, 신규 의존성 0,
> network·live·deploy 0)이며 **구현 스펙은 Codex가 작성**한다.


> **스펙 032 조사 보완 라운드 1(2026-07-31, 기준 `5a42b29`)**: Codex 지적 **3건 모두 유효**.
> **★ ① `lines` 재사용 경로가 현재 API에 없다** — 최초 §8.1이 "인쇄 폭 재생성 + 미리보기 `lines` 재사용,
> **추가 계약 불필요**"라고 단정했으나 **사실이 아니다**: `FrameTextZoneInput`(`plan/types.ts:145-167`)에
> **`lines` 입력이 없고**, 빌더는 값이 있으면 **항상 `measureText`로 다시 wrap**한다
> (`build.ts:771-779`). `lines`는 **`draw-text` command의 출력**으로만 존재한다.
> → 단정을 **제거**하고 §8.1을 **후보 A/B/C 비교**로 재작성했다. 각 후보가 **줄바꿈·회전·pan·레이어 순서**
> 네 불변식을 **어떻게** 보장하는지 표로 명시했다.
> **A(승인된 plan 그대로 + 앱 소유 context 변환)**: executor 헤더가 **"transform은 caller의 몫,
> 이 executor는 논리 좌표로만 그린다"** 고 못 박았고(`executePreviewPlan.ts:10-11`),
> **`surface.ts:7-8`이 이미 `setTransform(effectiveDpr)` 후 같은 plan을 실행**한다 →
> **DPR 2 미리보기가 곧 그 패턴의 검증된 사례**다. 빌더 계약 변경 **0**.
> **B(명시적 prewrapped 입력)**: 줄바꿈은 전달값으로 보장하고 좌표는 인쇄 폭에서 재계산하지만,
> 텍스트 command 생성 경로가 **둘**이 되고 전달된 `lines`의 **일치 검증 계약**이 새로 필요하다.
> **C(순수 plan scaling)**: 곱셈만 하므로 구조적으로 동일하지만 **좌표의 두 번째 진실 원천**이 생기고
> 필드가 추가될 때마다 같이 고쳐야 한다 — 레거시 `dim.w/500` 결함의 형태라 **비권장**.
> → 선택은 **Codex C-1**이며, **인쇄 배율에서의 자간·품질은 NOT VERIFIED**로 남겼다.
> **② P-5 분리** — 색·사진 transform(**비개인**) / 시계 유무(**비개인 제품 구성**) /
> **고객 문구 원문(개인정보 가능성 높음)** 을 나누고 각각 **① PNG 포함 ② 로컬 IndexedDB 저장
> ③ 주문 전송 ④ 보존 기간**을 구분한 표로 다시 썼다. **최소안 P-5c: 고객 문구는 이미 PNG에 픽셀로
> 들어가 있으므로 텍스트로 저장·전송하지 않는다** — 별도 개인정보 정책 승인 없이는 스펙 032 범위에서
> 제외한다(스펙 031의 "오류 payload에 원문 미포함" 규율을 저장·전송까지 확장). 비개인 항목만 담기를 권장.
> **③ P-4 출처** — `300dpi`·`minLong 3000`·`maxPixels 36M`·`3508`은 **레거시 관측값일 뿐 인쇄소 요구로
> 확인된 바 없다**. **P-4a(임시값으로 구현하되 실제 업로드·주문 전송·배포는 인쇄소 확인 전까지 차단)** 와
> **P-4b(확인 전 구현 보류)** 로 갈랐고, 함께 받아야 할 미확인 항목(**색공간/ICC·재단 여백·파일 형식·
> 최대 크기**, 저장소 근거 **0**)도 기록했다. **STOP 조건 12·13 추가**.
> **바꾸지 않은 것**: §1~§7 레거시 조사 결과(두 세대 공존 · 해상도 산식 차이 · 물리 치수 추측 ·
> 경고가 주문을 막지 않음 · 회전 무시 · 시계 제외 정상 · CORS · 주문 결합), §10 최소 구현 순서, C-2~C-8.
> 이 라운드도 **문서 전용**(제품 코드·테스트·CSS·설정·lockfile diff 0, 신규 의존성 0, network·live·deploy 0).
> **Founder P-1~P-6은 Codex가 보완된 질문을 승인하기 전에는 확정하지 않는다.**


> **운영 규칙 갱신(2026-07-31, Founder 지시)**: 개별 스펙이 `DONE`이어도 **멈추지 않고 다음 권장 스펙의
> 읽기 전용 조사로 자동 전환**한다. **구현은 조사 승인과 필요한 Founder 결정 뒤에만** 시작하며,
> 자동화는 **전체 리빌드 DONE 또는 Founder의 명시적 중단**에서만 멈춘다. 다음 스펙은 임의 선택이 아니라
> **스펙 019 §506의 후속 순서**(deterministic renderer → image/CORS → pointer → text/clock → print)를
> 근거로 삼는다.

> 스펙 032 사전 조사 완료(읽기 전용, 2026-07-31, 기준 HEAD `b763174`): 보고서
> `docs/codex-claude-handoff/reviews/2026-07-31-print-export-investigation.md`(12항목).
> **한 줄: 인쇄 경로는 두 세대가 공존하고, 리빌드에는 인쇄 코드가 0줄이다.**
> **★ 케이스는 V36 구경로, 액자만 V365** — `patchedRender`가 `type==='case'`면 **옛 구현으로 되돌린다**
> (`mockup:11453-11455`). 두 경로는 **해상도 산식도 텍스트 처리도 다르다**(케이스는 `textObjs`,
> 액자는 `textZones`).
> **해상도**: 액자는 실물 cm → **300dpi**(`minLongSide 3000`·`maxPixels 36,000,000`·
> `fallbackLongSide 3508`), 케이스는 **cm·dpi 없이** `scale=min(5,max(3,3000/max(W,H)))`.
> 케이스 payload의 `dpi:300`은 **계산에 쓰이지 않는 상수 표기**다.
> **★ 액자의 물리 치수를 추측한다**(`frameCm :11298-11317`): 필드 8종 → **이름 텍스트 파싱**
> (`sub·sizeText·label·name·id·key`) → 하드코딩 표. **사이즈 이름을 바꾸면 인쇄 해상도가 바뀔 수 있고**,
> 후보에 `w/h`가 있어 **논리 px를 cm로 해석**할 위험도 있다. 카탈로그 V1 `frameSizes` allowlist
> (`read.ts:82`)에는 **cm 필드가 아예 없다**.
> **★★ 경고가 주문을 막지 않는다**: 템플릿 아트 로드 실패는 `warnings` 문자열만 남기고 **아트가 빠진
> PNG를 그대로 반환**해 IndexedDB 저장·다운로드·카카오까지 진행된다(`:11423-11425`). 미리보기는
> 스펙 028에서 **fail-closed**로 바꿨으므로 **인쇄도 같은 규율을 적용할지가 결정 항목**이다(P-3).
> **스펙 029~031 중 인쇄 반영은 텍스트뿐**이다 — **회전(030)은 무시**되고 **시계(031 F-4) 제외는 정상**.
> pan 배율의 **frame 하드코딩 `dim.w/500`** 은 `prevMaxW` 변경 시 미리보기≠인쇄를 만들지만
> **리빌드는 normalized pan이라 무관**하다. CORS는 026/028 계약 재사용으로 충분하다.
> **주문 payload는 이름 3개뿐** — 색·문구 값·pan/zoom·회전·시계 상태가 없어 운영자는 PNG로만 파악한다.
> **★ 핵심 논점**: 인쇄는 **새 렌더러가 아니라 같은 plan을 인쇄 해상도로 다시 만드는 것**이다.
> **인쇄 폭으로 plan 재생성 + 미리보기 `lines` 재사용**을 권고한다 — 좌표 정확성(재생성)과 줄바꿈
> 동일성(lines 재사용)을 **동시에** 얻고, 스펙 031이 이미 `lines`를 plan에 담아 **추가 계약이 필요 없다**.
> 배율만 곱하는 방식은 레거시 `dim.w/500` 문제를 재생산하므로 금지한다.
> **결정 필요**: Founder 6건(P-1 케이스 인쇄 포함 여부 · **P-2 물리 치수 출처(이름 파싱 금지)** ·
> **P-3 경고 시 인쇄 생성 여부** · P-4 DPI·최대 픽셀 · P-5 주문 payload 확장과 개인정보 ·
> P-6 줄바꿈 일치) + Codex 8건(C-1~C-8). 최소 구현 순서와 STOP 11조건도 기록했다.
> **코드·테스트·CSS·설정·PNG·lockfile 변경 0**, 신규 의존성 0, 실제 network·live·Firebase·CORS·deploy 0.
> **NOT VERIFIED**: 레거시 인쇄 **미실행**(코드 근거만) · `CONFIG`의 300dpi·3000·36M·3508의 **출처와
> 인쇄소 요구** · `knownCm` 표 내용과 운영 카탈로그 실제 필드 · 운영 bucket CORS 실패 · 대용량 성능.
> 구현 스펙은 작성하지 않았고 인쇄 제품 코드도 만들지 않았다.


> 스펙 031 종료(2026-07-31): Codex가 보완 라운드 1 코드 **`88b64e6`** 와 문서 **`b7d46d3`** 를 독립
> 재검증해 **승인**했고, Claude Code가 종료 문서만 처리했다(상태 `CODEX_PASSED` → `COMMITTED`,
> **문서 전용 커밋** · 기능 코드 변경 **0** — `git diff 88b64e6..HEAD -- apps packages tests` = **0줄**).
> 정본 `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`(§CODEX_PASSED),
> 인계 `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`(§9).
> **Codex 독립 게이트 PASS**: **unit 1088/1088** / 실제 Chromium **E2E 116/116** /
> frozen install·format·lint·typecheck·build·`git diff --check` / 포트 4183·4184·OS temp 잔류 **0** /
> lockfile·manifest diff 0 · 신규 의존성 0. Claude 재실측(같은 트리)도 `check` PASS·unit 1088로 일치.
> **확정 계약(최종)**: 액자 `textZones` **다섯 키만**(닫힌 범위 검증, 중복·미지원 키 거부,
> `maxChars` 기본 **80**·`maxLines` 기본 **2**, 초과는 **입력 차단**이지 자르기가 아님, `"0"`은 유효) /
> `defaultTexts`는 **placeholder 전용**·`name2`엔 없음 / **wrap은 주입 측정 포트로 빌더에서 한 번 확정**해
> `draw-text`가 **이미 wrap된 lines + 폭**만 담고 미리보기와 향후 print가 **같은 lines**를 소비 /
> **요청 폰트 미가용 시 텍스트 plan fail-closed**(대체 측정 없음) / executor 텍스트 capability는
> **선택적**이고 없으면 **preflight fail-closed**, letter-spacing은 **glyph별 `fillText`** /
> **시계는 하드웨어**(F-4) — **mat rect 기준** percent의 DOM 오버레이(`pointer-events:none`·`aria-hidden`),
> **plan·인쇄·주문에 없음**, custom image **timer 0**, 텍스트는 **분 경계 60초**, **활성 timer ≤1** +
> generation 가드, **선언된 사진이 실패하면 텍스트로 대체하지 않고 숨김**.
> `packages/render/src/geometry`·image owner·template art·placement **무변경**.
> **NOT TESTED 유지**: **잔류 프로세스 command-line 검사** · 실기기 4환경 **IME·폰트·오버레이** ·
> **system font 대체** · 실제 **인쇄물 가독성** · **실제 print/export의 텍스트 출력**(인쇄 경로는 아직 이
> plan을 소비하지 않는다) · **실제 물리 시계와 오버레이 위치의 일치 여부** ·
> case 텍스트 · admin `name2` · 고객 style(모두 Founder 결정으로 범위 밖).
> 최초 라운드의 판단 2건(배럴 확장 대신 **구조적 타입** · 입력 거부의 **빌더 시험 빌드**)은 **명시 지시
> 없이 승인으로 수용**된 것으로 기록했다.
> ⚠️ 이 종료는 **합성 fixture에서 문구를 입력하고 시계 자리를 표시한 단계**이며 실기기·인쇄/export·주문·
> 배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
> **다음 스펙·사전조사·신규 기능은 착수하지 않는다.**


> **스펙 031 보완 라운드 1(2026-07-31, 기준 `78acdf6`, 코드 커밋 `88b64e6`)**: Codex 지적 **3건 모두 유효**.
> **① 시계 percent의 기준이 mat rect였다** — 전체 박스에 적용해 **band가 클수록 위치가 틀렸다**.
> 정본 §2.7·레거시 `IX+x/100*IW`·`min(IW,IH)*size/100`의 `IX/IY/IW/IH`는 **mat**이다. → band를
> **plan 어댑터와 동일한 `max(1, round(width*borderPercent/100))`** 로 구해 **mat 기준 중심**과
> **`min(matW,matH)` 기준 한 변**을 캔버스 대비 CSS percent로 환산하는 **순수 함수 `resolveClockCss`** 로
> 분리했다. 오버레이와 **그려지는 mat이 같은 반올림**을 쓰므로 어긋날 수 없다. unit이 mat 안 중심·
> **band≠0에서 naive percent가 틀림**·portrait/landscape **짧은 변**·스케일 불변·못 쓰는 캔버스 `null`을
> 고정하고, E2E가 렌더 값이 **naive `80%`가 아님**과 resize 이동 **<0.5%p**를 확인한다.
> ⚠️ resize에서 **bit-identical이 아닌 것은 의도** — band가 width마다 반올림되고 **그려지는 mat도 똑같이**
> 반올림된다(차이 ≈0.09%p).
> **② 선언된 시계 사진의 실패가 텍스트로 대체됐다** — 특정 하드웨어 자리에 **일반 디지털 시계**를 보여주면
> 제품을 잘못 표현한다. → `declared`와 resolved `src`를 **분리**하고, resolve 실패나 **`<img>` load 실패**면
> **오버레이를 숨긴다**. 텍스트 `HH:MM`은 **사진이 애초에 선언되지 않았을 때만**. 실패 source를 기억해
> **재시도 루프 0**, source·오류 원문 노출 0, 사진·텍스트 plan **유지**.
> **③ 요청 폰트의 가용성을 확인하지 않았다** — `fonts.ready`는 "로딩 끝"이지 **"그 family 로드됨"이 아니다**.
> 대체 폰트로 재고 real family로 그리면 wrap이 달라진다(레거시 미리보기≠인쇄 그 자체). → **측정 전에**
> 값이 있는 각 zone의 **정확한 shorthand**로 `document.fonts.check(...)`를 확인하고, **FontFaceSet 부재·
> check 부재·throw·false**면 텍스트 plan을 **fail-closed**한다(대체 측정 없음). 텍스트 없는 액자는 그대로
> 동작하고 **입력창은 게이트와 무관**해 고객은 언제든 타이핑할 수 있다.
> 게이트 재실측: frozen exit 0 · lockfile·manifest diff **0** · 신규 의존성 0 / format·lint·typecheck /
> **unit 1088**(1081→1088) / **E2E 116 PASS**(114→116) exit 0 / `git diff --check` clean / 포트 free /
> OS temp 0 / dist **SHA-256 E2E 전후 동일** / network·live·deploy **0**.
> **번들**: mockup JS 280.33 → **281.69 kB**(gzip 86.99), CSS 17.82 → **17.85**, admin 무변경.
> 변경 파일은 허용 5개이고 `surface.css`는 **변경 불필요**였다. 회전·텍스트 wrap·오류 우선순위·F-1~F-8은
> **전부 무변경**이다. 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는
> **손대지 않았다**.


> 스펙 031 구현·자체검증 완료(로컬, 2026-07-31, 기준 계약 `3927420`·결정 `e3dc2b1`, 코드 커밋 `78095f8`):
> 정본 `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`(§DONE), 인계
> `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`. **고객이 처음으로 문구를 넣는다.**
> **텍스트**: 투영이 **다섯 키만** 허용하고 모든 스타일을 닫힌 범위로 검증한다(중복·미지원 키·범위 밖은
> **전체 투영 실패**, clamp 0). 캡은 `maxChars` 기본 **80 UTF-16 code unit**(HTML `maxLength`와 단위 일치),
> `maxLines` 기본 **2**. `defaultTexts`는 **placeholder 전용**이고 **`name2`에는 없어서** 운영자 샘플
> (`'WEDDING'`)이 고객 값·인쇄물에 들어갈 경로가 **구조적으로 없다**(F-3).
> **★ wrap은 주입된 동기 측정 포트로 빌더에서 한 번 확정**한다 → plan은 순수·JSON-safe이고 미리보기와
> 향후 print/export가 **같은 lines**를 소비한다. 순서는 **명시 개행 → 단어 경계 → code-point 강제 분해**,
> letter-spacing은 **인접 glyph 사이에만**. 측정 throw/non-finite/negative는 **fail-closed**이고
> **`document.fonts` 정착 전에는 plan을 만들지 않는다**(fallback으로 재고 real family로 그리면 레거시의
> 미리보기≠인쇄가 그대로 재현된다).
> **`draw-text`** 커맨드는 **이미 wrap된 lines + 측정 폭**만 담고 고객 원문(라인 외)·zone key·카탈로그/
> 템플릿 id·측정 포트를 **담지 않으며** `layerId`는 **위치 기반**(`frame:text:0`)이다. 순서는
> **사진 → 아트 → 텍스트 → inner border**.
> **★ 입력 거부는 "빌더 시험 빌드"** 로 구현했다 — wrap을 아는 것은 빌더뿐이라 composer가 재구현하면
> **둘이 어긋난다**. plan 인자를 ref에 보관했다가 후보 값으로 **실제 빌더를 한 번 더 호출**하고 실패하면
> **직전 승인 값을 유지**한다(자르기·말줄임·부분 plan·이전 값 fallback **0**, `"0"`은 유효한 값).
> **executor**: `font`·`textAlign`·`textBaseline`·`fillText`·`measureText`를 **공개 포트의 선택적
> capability**로 선언하고 내부 타입을 `Required<Pick<…>>`로 **파생**했다(030 패턴 그대로). 텍스트 없는
> plan은 기존 컨텍스트에서 그대로 실행되고, 텍스트 plan은 capability가 없으면 **preflight fail-closed
> (Canvas 연산 0)**. letter-spacing은 **glyph별 `fillText`** 이고 `ctx.letterSpacing`은 쓰지 않는다.
> **★★ 시계 = 하드웨어(F-4)**: 신규 `apps/mockup/src/preview/clockOverlay.ts`가 framework-free로
> **시계·스케줄러를 주입**받는다. **`pointer-events:none`·`aria-hidden` DOM 오버레이**이고 percent 위치라
> **resize에도 유지**되며 **plan·인쇄·주문에 들어갈 경로가 없다**. **custom image는 timer 0개**,
> 텍스트 `HH:MM`은 초가 없으므로 **1초 interval 금지 → 분 경계 후 60초**, **활성 timer 최대 1개** +
> **generation 가드**(toggle·템플릿 전환·unmount·StrictMode 재마운트에서 취소). 잘못된 placement나 못 쓰는
> 이미지는 **오버레이만 숨긴다** — 시계는 인쇄 데이터가 아니라 사진·텍스트 plan을 오염시키면 안 된다.
> **★ 허용 파일 준수 판단**: 배럴(`plan/index.ts`·`preview/index.ts`)이 §4 밖이라 **확장 대신 구조적 타입**
> (`Parameters<typeof buildPreviewRenderPlan>` 등)으로 새 타입을 참조했다. **`tsc` 강도는 named import와
> 동일**하고 배럴 content diff는 **0**이다. 배럴 확장이 더 낫다면 최소 확장으로 보완한다(인계 §3).
> **검증**: unit **1081**(995→1081, 신규 86) / 실제 Chromium **E2E 114**(99→114, 신규 15) —
> 입력→픽셀·삭제→사라짐·**`"0"` 렌더** / 정의된 키만 노출 / **길이 캡이 자르지 않고 차단** /
> **wrap 초과 시 직전 값 유지 + 캔버스 정상** / `defaultTexts`는 값이 되지 않음 / 텍스트가 사진 **위** /
> 회전 zone / **고객 색·그림자 UI 0** / 320px 라벨·포커스·44px·axe 0·console 0 /
> 시계가 **캔버스 밖 DOM 오버레이**·`HH:MM` 초 없음·opt-out 숨김·**resize percent 유지**·**잔류 timer 0**.
> 게이트: frozen exit 0·**lockfile·manifest diff 0**·신규 의존성 0 / format·lint·typecheck /
> `git diff --check` clean / 포트 4183·4184 free · OS temp 0 / dist **SHA-256 E2E 전후 동일·fixture 0** /
> 네트워크·live·Firebase·CORS·deploy **0**. **번들**: mockup JS **265.52 → 280.33 kB**(gzip 82.10 → 86.52),
> CSS **15.50 → 17.82**(gzip 3.89 → 4.30), admin 무변경.
> **NOT TESTED**: 실기기 4환경 IME·폰트·오버레이 · system font 대체 · 실제 인쇄물 가독성 ·
> case 텍스트(F-1 범위 밖) · admin `name2`(F-8 별도 스펙) · 고객 style(F-2) · **실제 print/export의 텍스트
> 출력**(인쇄 경로는 아직 이 plan을 소비하지 않는다) · **실제 물리 시계와 오버레이 위치의 일치 여부**.
> ⚠️ 이 완료는 **합성 fixture에서 문구를 입력하고 시계 자리를 표시한 단계**이며 실기기·인쇄/export·주문·
> 배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.


> **스펙 031 결정 확정(2026-07-31)**: 정본
> `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`.
> Codex가 보완 조사 `7636367`을 **승인**하고 `FOUNDER_DECISION_REQUIRED`로 전이한 뒤 Founder가 결정했다.
> **★★ F-4 = 시계는 "완제품의 물리적 시계 하드웨어 미리보기"다.** 조사 §3.5.1의 `UNCONFIRMED`가
> Founder 권한으로 확정됐다. 이 결정이 즉시 확정하는 것 —
> **① 인쇄/export에 시계를 넣지 않는다. 현행 동작이 곧 정답이고, 레거시 인쇄 경로가 시계를 빼 온 것은
> 결함이 아니라 의도였다.** ② "미리보기≠인쇄"는 **문제가 아니다**(보완 라운드 1의 철회가 최종 확정).
> ③ **F-5(인쇄 시각의 의미)는 불필요**해졌다. ④ **`packages/render`는 시계 때문에 바뀌지 않는다** —
> 텍스트 때문에만 확장한다. ⑤ 시계는 **plan에 담기지 않으며** print/export와 공유할 **결정적 plan을
> 전제하지 않는다**. → 운영자 빌더가 그것을 **"⏰ 템플릿용 시계 가이드"**(`admin:335`)라 부르고
> **"시계를 미리 보면서 위치를 잡고"**(`admin:342`) 안내한 것이 **문자 그대로의 의미**였다.
> **시계 구현 범위(조사 §8.4 ⓐ)**: preview overlay 계약 + timer lifecycle **뿐**이다 —
> ① DOM 오버레이 분리 여부(이 저장소에 선례 있음) ② 1초 갱신이 실제로 필요한지 ③ **타이머가 정확히
> 하나만 살아 있는지**(언마운트·템플릿 전환·토글·StrictMode, 레거시 누수 미재현) ④ 실물 부착 안내 문구.
> **Founder 텍스트 묶음 일괄 승인**: F-1 **1차는 액자 `textZones`만**(케이스 자유 배치는 별도 스펙) /
> F-2 고객 색·그림자 **1차 미지원**(운영자 zone 스타일이 **단일 정본**) / F-3 `defaultTexts`는
> **placeholder로만**(운영자 샘플 `'WEDDING'`이 인쇄물에 들어가지 않게) / F-6 zone별 **길이 상한 + 초과
> 입력 차단**(**자르기·말줄임·자동복구 없음**) / F-7 zone별 **줄 수 상한, 기본 2줄**(레거시 2 vs 3
> divergence 원천 제거) / F-8 다섯 키 **균일 처리**하되 **`name2` 기본값은 만들지 않음**(admin 확장은 별도).
> **불변식**: 시계는 인쇄물에 없다 · 시계는 plan에 없다 · **텍스트는 plan에 담겨 미리보기=인쇄** ·
> 케이스 텍스트는 범위 밖 · 텍스트 스타일 소유자는 운영자 하나 · 운영자 샘플이 고객 값이 되지 않는다 ·
> 초과는 **입력 차단**이지 잘라내기가 아니다 · 019/026/028/030 계약 **무변경**.
> **여전히 미결정**: 케이스 텍스트(별도 스펙) · admin `name2`(별도 스펙) · 고객 색/그림자 향후 도입 ·
> 시계 오버레이의 DOM 분리 여부와 1초 갱신 필요성(**Codex 계약**) · 상한의 구체 값과 저장 위치
> (**Codex 계약**) · C-1~C-7·C-9~C-11(**Codex 확정**) · 실기기 IME·폰트 대체·인쇄물 가독성(**NOT TESTED**).
> 이 라운드도 **문서 전용**(제품 코드·테스트·CSS·설정·lockfile diff 0, 신규 의존성 0,
> network·live·deploy 0)이며 **구현 스펙은 Codex가 작성**한다.


> **스펙 031 조사 보완 라운드 1(2026-07-31, 기준 `33323dd`)**: Codex 지적 **유효**.
> 조사가 "인쇄에 시계가 없다"는 **코드 사실**에서 곧바로 **"구조적 불일치·결함"** 판정과 **"인쇄 포함"**
> 권장을 도출했으나, `admin:335`("⏰ **템플릿용 시계 가이드**")와 `admin:342`("템플릿 제작 시 시계를
> **미리 보면서 위치를 잡고**")는 시계가 **완제품의 물리적 시계 하드웨어**이고 화면에서만 합성하는
> 가이드일 가능성을 지지한다.
> **→ 제품 의미를 `UNCONFIRMED`로 정정하고 단정을 제거했다.** 보고서 §3.5.1에 양쪽 근거를 라인과 함께
> 정리했다. **A(하드웨어)**: "가이드"라는 명시적 표현 · 시계를 보면서 아트를 배치한다는 안내(=회피 대상) ·
> 운영자가 올리는 **시계 사진**(`customImg`) · **독립 구현 2개**(V36 `:9732`, V365 `:11404`)가 **모두**
> 시계를 뺌(한쪽만이면 누락, 둘 다면 의도) · **주문 payload에 시계 상태가 없음**(옵션으로 취급 안 함) ·
> **"시계액자"가 상품군 이름**. **B(인쇄 그래픽)**: 고객 문구 "시계 **추가**" · 고객이 **요소 리스트에서
> 삭제 가능** · **`clockOn`이 `space-scene-v1`의 `design`에 저장**(승인한 디자인의 일부) · 사이즈별·템플릿별
> 정교한 3단 위치 데이터 · 이 코드베이스에 **"미리보기 전용은 굽지 않고 DOM 오버레이로 분리"하는 선례가
> 있는데도**(운영자 가이드 이미지) 시계는 캔버스에 baked.
> **C(확정 근거 NOT FOUND)**: 하드웨어 어휘(무브먼트·바늘·초침·타공·벽시계·건전지)가 두 운영본 HTML과
> `docs/` 전체에서 **0건**이고, "시계를 인쇄한다"고 적은 문서·주석도 **없다**.
> **Founder 결정 순서 재구성**: **F-4 제품 의미** → F-4a(하드웨어면 **print 미포함 유지**, preview 전용) /
> F-4b(그래픽이면 포함 여부) → F-5(F-4b일 때만 시각 의미).
> **구현 범위도 분기**(§8.4): 하드웨어로 확정되면 **print/export와 공유할 결정적 plan을 전제하지 않고**
> preview overlay 계약과 **timer 정리**만 다룬다 → `packages/render`는 텍스트 때문에만 바뀐다.
> C-8도 F-4 종속으로 바꾸고 STOP 조건 2개(11·12)를 추가했다. 최소 구현 순서에서 **1~5(텍스트)는 F-4와
> 무관하게 진행 가능**하고 **6(시계)만 막혀 있다**.
> **바꾸지 않은 것**: §1·§2 textZones 조사 전체, §4~§7, C-1~C-7·C-9~C-11, §9 검증 설계.
> 이 라운드도 **문서 전용**(제품 코드·테스트·CSS·설정·lockfile diff 0, 신규 의존성 0, network·live·deploy 0).

> 스펙 031 사전 조사 완료(읽기 전용, 2026-07-31, 기준 HEAD `57d43b6`): 보고서
> `docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`(13항목).
> **한 줄: "텍스트"는 하나의 기능이 아니라 서로 다른 두 모델이고, 시계는 미리보기에만 그려진다 —
> 다만 그것이 결함인지 의도인지는 이 저장소의 근거만으로 확정할 수 없다(보완 라운드 1).**
> ① **액자 `textZones`** — 운영자가 좌표·글꼴·색을 찍고(`admin:1728` `openZoneEditor`, `:1964` `saveZones`)
> 고객은 **값만** 입력한다(`f-main`/`name`/`name2`/`date`/`sub` 5개, `mockup:11390`). **인쇄 반영 O**.
> ② **케이스 `textObjs`** — 고객이 캔버스에서 **자유롭게 드래그**하는 객체(`:1736`·`:3038`), zone도 key도 없다.
> **두 모델은 코드도 데이터도 공유하지 않는다.**
> **zone 필드 전수**(`:11387-11402`): `key/x/y/fontSize/align/boxW/letterSpacing/lineH/rotation/font/bold/
> italic/color` — 좌표·크기는 **캔버스 %**, `rotation`은 **임의 각도**, `boxW`는 **wrap 폭이지 clip이 아니다**.
> 레이어 순서는 **사진 → 아트 → 텍스트 → 시계 → 흰 테두리**.
> **★ 레거시 결함 3건(재현 금지)**: 빈 값 판정이 경로마다 달라 **`"0"` 한 글자가 사라진다**(`:11388` vs `:9732`) /
> 줄 수 상한이 **미리보기 2줄 · V365 인쇄 3줄**로 어긋난다 / `applyFrameTextStyle` 유무에 따라 기본 글자색이
> **`#111`↔`#FFF`로 뒤집힌다**.
> **★★ 인쇄/export 경로에 시계가 없다**(`renderFramePrintV365 :11404-11446`에 `drawClockLayer` **0회**,
> 구버전 `:9732`도 동일) — **이것은 관측된 코드 사실이며 결함 판정이 아니다**(보완 라운드 1로 정정).
> **시계 계약**: `ADM.clockSettings` → `frameSizes[].clock` → `frameTemplates[].clock` **3단 병합**,
> `{x,y,size,customImg}`(기본 88/88/12%), **로컬 시간 24h `HH:MM` 고정**(초·timezone·locale 없음),
> `setInterval(renderFrame,1000)`으로 **1초마다 액자 전체 재렌더**, **타이머 정리 부실**(덮어쓰기 전
> `clearInterval` 없음), `drawClockLayer`는 **12중 재정의**(`:1816`~`:3210`)라 "읽어서 재현"이 불가능하다.
> `clock` 필드가 **없으면 시계액자로 간주**된다(`isClockTemplate :971`).
> **리빌드 현황**: 카탈로그 V1은 `textZones`·`clock`·`clockEnabled`·`clockSettings`·`customFonts`를
> **보존만 하고 투영은 0**이며(`project.ts`에 해당 문자열 0회), `packages/render` plan 커맨드는
> `fill-rect`·`draw-image-cover`·`stroke-rect`·`draw-image-stretch` **4개뿐 — 텍스트 어휘가 없다**.
> **★ 핵심 딜레마**: wrap은 `measureText`(Canvas)가 필요한데 plan은 **순수·JSON-safe**여야 한다 →
> **빌더에 측정 포트를 주입해 `lines[]`를 plan에 확정**할 것을 권고한다. 레거시의 미리보기≠인쇄가 정확히
> 반대 선택(executor가 wrap)에서 나왔다. **시계는 별도 커맨드가 필요 없다** — `draw-text`로 표현하되
> **시각을 plan 생성 시 확정**해야 plan이 결정적이다.
> **결정 필요**: Founder 8건(F-1 케이스 텍스트 방식 · F-2 고객 색/그림자 · F-3 `defaultTexts` 초기값 여부
> (**운영자 샘플 `'WEDDING'`이 인쇄물에 들어갈 위험**) · **F-4 시계의 제품 의미(하드웨어 vs 그래픽)** ·
> F-4a/F-4b 분기 · F-5 인쇄 시각의 의미(F-4b일 때만) ·
> F-6 길이 상한 · F-7 줄 수 상한 · F-8 `name2` 기본값 부재) + Codex 11건(C-1~C-11).
> **검증 설계**: fake 측정 포트 unit · 실제 Chromium 픽셀 E2E · **Playwright `page.clock` 고정 시각**
> (실제 시간·timezone 의존 단언 **금지**, 고정 sleep 0) · 최소 구현 순서 · 허용 파일 후보 · STOP 12조건.
> **코드·테스트·CSS·설정·PNG·lockfile 변경 0**, 신규 의존성 0, 실제 network·live·Firebase·CORS·deploy 0.
> **NOT VERIFIED**: 레거시 실제 실행 0(코드 근거만) · `drawClockLayer` 12중 재정의의 런타임 최종 승자 ·
> `customFonts` 실제 데이터 형태 · 실기기 IME·소프트 키보드·폰트 대체·인쇄물 가독성.
> 구현 스펙은 작성하지 않았고 다음 기능도 착수하지 않는다.


> 스펙 030 종료(2026-07-31): Codex가 보완 라운드 1 코드 **`603cd25`** 와 문서 **`1aa3302`** 를 독립 재검증해
> **승인**했고, Claude Code가 종료 문서만 처리했다(상태 `CODEX_PASSED` → `COMMITTED`, **문서 전용 커밋** ·
> 기능 코드 변경 **0** — `git diff 603cd25..HEAD -- apps packages tests` = **0줄**).
> 정본 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`(§CODEX_PASSED),
> 인계 `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`(§10).
> **Codex가 확인한 것**: 공개 포트의 **선택적 rotation capability**·**fail-closed 계약**·**단일 타입 정본**.
> **Codex 독립 게이트 PASS**: frozen install / format·lint·typecheck / **unit 995/995** /
> mockup·admin build / 실제 Chromium **E2E 99/99** / `git diff --check` / **dist SHA-256 전후 동일** /
> lockfile·신규 의존성·금지 경로 diff 0 / 포트 4183·4184 0 / OS temp 0. Claude 재실측도 `check` PASS로 일치.
> **★ 판단 요청 ② 회신**: **"Chromium 합성 EXIF `Orientation=6` 적용은 검증됨, 그 밖의 엔진·실기기는
> NOT TESTED 유지"** → 40×20 JPEG + `Orientation=6` → **20×40 decode** 실측이 **검증된 사실로 확정**됐다.
> **R-6("EXIF 직접 파싱 금지")이 옳았다** — 우리가 또 적용하면 이중 회전이다. 조사 보고서는 Codex 소유이자
> 허용 파일 밖이라 **수정하지 않았다**.
> **확정 계약(최종)**: 슬롯별 `rotationQuarterTurns` **`0|1|2|3`**(전역 회전 상태·전역 폴백 **0**) /
> 좌·우 90° 버튼 1회 = **정확히 한 단계**(modulo 4) / **scale·normalized pan 불변** → 구도 유지,
> `원래대로`는 **회전까지** 초기화 / 90°·270°는 **cover에 넘기는 intrinsic w/h 스왑**으로 회전 footprint를 얻어
> **`packages/render/src/geometry` 무변경**·029 `maxPan` 공식 그대로 / **probe plan에도 회전 포함** /
> `draw-image-cover`의 **선택적 필드**, 0이면 **미emit → pre-030 plan과 바이트 동일**, 신규 command 0,
> **아트 무회전** / executor는 회전 시에만 커맨드 내부 `save→clip→translate→rotate→drawImage→restore`,
> 중심 = **drawRect 중심**(구도 점프 0), 실패해도 restore 1회 보장 / 공개 포트가 `translate?`/`rotate?`를
> **선택적 capability로 선언**하고 **없으면 preflight fail-closed**(Canvas 연산 0) /
> invalid·hostile·drift transform은 **복구 없이 거부**.
> **NOT TESTED 유지**: **잔류 프로세스 command-line 검사(OS 권한 거부)** · 실기기 4환경 EXIF·조작성 ·
> 실제 카메라 원본 **orientation 1~8** · **실제 print/export 회전**(인쇄 경로는 아직 이 plan을 소비하지 않는다) ·
> 대용량 이미지 성능·메모리 · 실제 **200% 확대** · 임의 각도(R-1·R-2로 제외).
> ⚠️ 이 종료는 **합성 fixture에서 회전 버튼으로 사진을 돌린 단계**이며 실기기·인쇄/export·주문·배포 완료가
> 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
> **다음 스펙·사전조사·신규 기능은 착수하지 않는다.**


> 스펙 030 보완 라운드 1 완료(로컬, 2026-07-31, 기준 `e4a9133`, 코드 커밋 `603cd25`): Codex 독립 검증에서
> **기능 게이트는 전부 PASS**(unit 989/989 · E2E 99/99 · dist SHA 동일 · lockfile·금지 경로 diff 0)였고,
> 인계 §3.2의 **판단 요청이 "공개 포트에 선언하라"로 확정**되어 `apps/mockup/src/canvas/types.ts`가
> 허용 목록에 **최소 확장**됐다. **지적은 유효했다**: executor가 회전 command에서 `translate`/`rotate`를
> 요구하는데 공개 `PreviewCanvasContext`가 둘을 **선언하지 않아**, 타입을 정확히 구현한 소비자가
> **컴파일을 통과한 뒤 회전 plan에서만 실패**할 수 있었다(compile-time 계약 ≠ runtime 요구).
> **보완**: ① 두 메서드를 **선택적 capability로 공개 포트에 선언**했고 **선택성 자체가 계약**이다 —
> 없는 컨텍스트는 unrotated plan을 **그대로** 실행하고 회전 plan만 둘 다 요구한다 ② **fail-closed 계약을
> 공개 포트에 문서화**했다(하나라도 없으면 preflight `INVALID_EXECUTOR_INPUT` + **Canvas 연산 0** —
> 회전 안 된 사진은 폴백이 아니라 잘못된 제품) ③ **단일 정본화**: `RotationCapableCanvasContext`를
> 공개 타입에서 `Required<Pick<…>>`로 **파생**하고 executor의 중복 interface를 **삭제**했으며
> `ROTATION_METHODS`를 `keyof PreviewCanvasContext`로 검사해 **메서드명이 바뀌면 컴파일이 깨지도록** 했다.
> **신규 테스트 6**(전부 공개 타입만으로 선언된 컨텍스트로 외부에서 고정): capability 없는 컨텍스트의
> unrotated 3커맨드 실행 + transform 시도 **0** / 명시적 회전 `0`도 동일 / 회전 1·2·3 전부 **fail-closed +
> Canvas 연산 0** / **절반의 capability는 capability가 아니다**(`translate`만·`rotate`만·함수 아닌 값 전부 실패) /
> 실제 `CanvasRenderingContext2D`가 포트와 파생 타입에 **모두 assignable**(컴파일 타임 고정).
> **회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9는 전부 무변경**이고 E2E 99개가 그대로 PASS다.
> 게이트 재실측: frozen exit 0 · lockfile·manifest diff **0** · 신규 의존성 0 / format·lint·typecheck /
> **unit 995**(989→995) / **E2E 99 PASS** exit 0 / `git diff --check` clean / 포트 4183·4184 free /
> OS temp 0 / dist **SHA-256 E2E 전후 동일** / network·live·deploy **0**.
> **번들**: mockup JS 265.53 → **265.52 kB**(gzip 82.11 → **82.10**), CSS·admin **무변경**.
> ⚠️ **판단 요청 ②(R-6 실측)는 아직 미회신**: `Orientation=6` 합성 JPEG(40×20)이 Chromium에서
> **20×40으로 decode**된다는 실측을 조사 보고서 §7의 `NOT VERIFIED` **해소(Chromium 한정)** 로 반영할지
> Codex 판정이 필요하다. 보고서는 Codex 소유라 Claude가 수정하지 않았다.
> NOT TESTED 목록은 그대로 유지된다(실기기 EXIF·조작성, orientation 1~8, 실제 print/export 회전,
> 대용량 성능, 임의 각도). **다음 스펙은 착수하지 않는다.**


> 스펙 030 구현·자체검증 완료(로컬, 2026-07-31, 기준 계약 `2777010`·결정 `cf1cfd2`, 코드 커밋 `fbbadeb`):
> 정본 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`(§DONE), 인계
> `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`. **고객이 처음으로 사진을 회전한다.**
> **상태 모델**: `NormalizedTransform`에 `rotationQuarterTurns` **`0|1|2|3`** 추가 — composer가 **슬롯별**로
> 소유하고 **전역 회전 상태·전역 폴백 0**(레거시 `T.rot ?? state.rot`가 케이스 사진까지 돌리던 결함 미재현).
> `4`·`-1`·`1.5`·`90`·`"1"`·`NaN`·drift/throwing getter는 **복구 없이 거부**(modulo wrap·clamp·기본값 생성 0).
> 버튼 1회 = **정확히 한 단계**(왼쪽 `-1`/오른쪽 `+1`), 이름은 `왼쪽으로 90°`·`오른쪽으로 90°`.
> **scale·normalized pan 불변** → 회전해도 고객이 만든 **구도가 유지**되고, `원래대로`는 **회전까지** 0으로 되돌린다.
> **★ geometry 무변경으로 회전 footprint 확보**: 90°/270°일 때 **cover에 넘기는 intrinsic w/h를 스왑**해
> `drawRect`가 이미 **회전된 화면 실루엣**이 되게 했다 → 029 `maxPan = |drawSize-clipSize|/2`가 **수정 없이**
> 성립하고 `packages/render/src/geometry` **diff 0**.
> **plan 어휘**: `draw-image-cover`에 **선택적 `rotationQuarterTurns`** 만 추가하고 **0이면 필드 자체를 emit하지
> 않아** pre-030 plan과 **바이트 동일**하다(신규 draw command 0). `draw-image-stretch` 무변경 = **아트는 회전 안 함**(R-5).
> **executor**: 회전 시에만 **한 command 안에서** `save→clip→translate→rotate→drawImage→restore`, 중심은
> **drawRect 중심(= zone 중심 + 현재 pan)** 이라 구도 점프 0. 실패해도 restore **1회 보장** → 다음 command 격리.
> **probe plan에도 회전 포함**(C-7) — 없으면 회전 전 `maxPan`으로 clamp돼 구도가 틀어진다.
> **★ 판단 요청 1건**: executor 포트 `apps/mockup/src/canvas/types.ts`에 `translate`/`rotate`가 없고 스펙 §4
> **허용 목록 밖**이라, 허용 파일을 임의 확장하지 않고 **executor 내부 런타임 검사 + 회전 command가 있을 때만
> 요구 + 없으면 preflight `INVALID_EXECUTOR_INPUT` fail-closed**로 구현했다(회전을 무시한 채 그리지 않는다).
> 트레이드오프 = 공개 포트 타입이 실제 요구를 전부 기술하지 못함 → `types.ts`를 허용 목록에 넣어 선택적 멤버로
> 선언하는 편이 낫다면 그 방향으로 보완한다. 상세 인계 §3.2.
> **★★ R-6 실측(이 저장소 최초)**: `Orientation=6`을 스플라이싱한 합성 JPEG(**40×20**)이 Chromium에서
> **20×40으로 decode**된다(untagged baseline은 40×20) → **브라우저가 EXIF를 적용**한다. 우리가 또 적용하면
> **이중 회전**이므로 **R-6이 옳았다**. 조사 보고서의 `NOT VERIFIED`는 **Chromium 한정 해소**, 타 엔진·실기기는
> NOT TESTED 유지. EXIF 라이브러리 **0**, 바이너리 fixture **0**(바이트 스플라이싱).
> **검증**: unit **989**(944→989, 신규 45) / **실제 Chromium E2E 99**(91→99, 신규 8) — 우회전 시 분할 경계가
> **가로→세로**(오른쪽이 TOP)·좌우 역연산·4회 원위치·**슬롯별 독립 회전**·`원래대로` 동시 초기화·회전 후
> drag·zoom·**resize**에도 빈 공간 **0**·회전 버튼 **키보드(Enter·Space)**+44px+axe serious/critical **0**+
> console **0**·320px 오버플로 **0**·EXIF 실측.
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / `git diff --check` clean /
> 포트 4183·4184 free · OS temp 0 / dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·Firebase·CORS·
> deploy **0**. **번들**: mockup JS **263.31 → 265.53 kB**(gzip **81.60 → 82.11**), CSS **15.47 → 15.50**
> (gzip 3.88 → 3.89), admin 무변경. `surface.css`는 기존 편집 컨트롤 스타일 재사용으로 **무변경**.
> **NOT TESTED**: 실기기 4환경 EXIF·조작성, 카메라 원본 orientation **1~8 전 범위**, **실제 print/export 회전**
> (인쇄 경로는 아직 이 plan을 소비하지 않는다), 대용량 이미지 성능·메모리, **임의 각도**(R-1·R-2로 제외),
> 실제 200% 확대.
> ⚠️ 이 완료는 **합성 fixture에서 회전 버튼으로 사진을 돌린 단계**이며 실기기·인쇄/export·주문·배포 완료가
> 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지. **다음 스펙은 착수하지 않는다.**


> 스펙 030 결정 확정(2026-07-31): 정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`.
> 승인 문장(원문): `스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인하고 자동화 재개.`
> **Founder 승인**: R-1 고객 사진 회전은 **90° 배수만**(`왼쪽 90°`/`오른쪽 90°` 버튼) / R-2 **임의 각도 미도입**
> → 029의 `scale` **1.0~5.0**·**클립 안 빈 공간 금지** 계약 **그대로 유지** / R-3 액자 **가로/세로 aspect 전환은
> 별도 기능**으로 분리, **이번 스펙 제외** / R-4 **case multi-zone도 활성 슬롯별 독립 회전** / R-5 **template art는
> 고정**, 사용자 사진만 회전 / R-6 **EXIF 직접 파싱 금지**(브라우저 `<img>` decode 의존 + **합성 EXIF fixture 실측**).
> **Codex 계약(C-1~C-9)**: C-1 `rot`은 029 normalized transform의 **네 번째 필드**(`{scale,x,y,rot}`)·**전역 상태
> 금지**(composer 슬롯별 소유 → D-9 초기화 행렬 자동 상속) / C-2 저장 값은 **`0|1|2|3`**, 그 밖은 **복구 없이 거부** /
> C-3 pan은 **화면축 유지**, `maxPan`은 **회전 footprint**로 재계산(normalized 유지 + 재환산) / C-4 회전 중심은
> **zone 중심 + 현재 pan**(구도 점프 0) / C-5 `draw-image-cover`에 **선택적 `rotationQuarterTurns`**(신규 커맨드 없음) /
> C-6 executor는 한 커맨드 안에서 **`save→translate→rotate→drawImage→restore`**, "no transform" 문구는
> "커맨드 내부에서만·restore 짝" 으로 정정 / C-7 **probe plan에도 회전 포함**(회전이 `maxPan`을 바꾸므로) /
> C-8 **회전은 plan에 기록** → 향후 print/export가 같은 plan을 소비해 자동 일치("UI만 회전" 금지) /
> C-9 회전 검증은 **transform 유한성·범위 단계**에 편입, 실패 시 **plan 미생성**(부분 plan 금지).
> **불변식**: quarter turn 밖 값은 존재하지 않음(거부) · 회전은 **슬롯별**(전역 폴백 금지 = 레거시 케이스 오염 재현 금지) ·
> **D-3 하한 1.0·D-7 빈 공간 금지 불변** · 회전은 plan에 담겨 미리보기=인쇄 · **아트는 회전하지 않음** ·
> 액자 aspect 전환은 범위 밖 · EXIF 직접 파싱 0.
> **여전히 미결정·미검증**: 액자 가로/세로 전환 기능 자체(별도 스펙) · `packages/render` 계약 변경의 정확한 범위·문구
> (**"packages 무변경" 경계를 처음 깨는 일**) · 브라우저 `<img>` EXIF 실제 적용(**NOT VERIFIED**, 합성 fixture 실측 전) ·
> 실기기 4환경 회전 UI 조작성 · print/export 실제 회전 재현(현 인쇄 경로는 회전 무시) · 임의 각도 향후 도입 ·
> 대용량 사진 회전 성능. 이 라운드도 **문서 전용**(제품 코드·테스트·CSS·설정·manifest·lockfile diff 0, 신규 의존성 0,
> network·live·Firebase·CORS·Rules/Hosting·deploy 0)이며 **구현 스펙은 Codex가 작성**한다.

> 스펙 030 사전 조사 완료(읽기 전용, 2026-07-30, 기준 HEAD `8d20b6d`): 보고서
> `docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`(15항목).
> **한 줄: 레거시에 "사진 회전" 기능은 없다.** 회전이라는 이름이 붙은 것은 **네 개의 다른 소유자**다 —
> ① 액자 가로/세로 ±90(`DENN_FRAME_ORIENTATION_V64` `:7180-7352`, **유일하게 고객 사진 픽셀을 돌림**)
> ② 룸 목업 기울기(`:2130`, 벽면 각도 보정, 액자 목업 전체) ③ 워터마크 기울기(admin `wm-rotation`)
> ④ 텍스트 존 회전(`z.rotation`, **인쇄에도 반영되는 유일한 회전**). 기기 방향 전환·회전 전체화면
> (`:2311` 등)은 **룸 표시 셸 로직**으로 사진 transform과 무관하다.
> **①은 미완 상태다(레거시가 스스로 기록, `:15015-15029`)**: `sz.aspect=1/base` transpose를
> `normFrameRatio`(`:2659`, `max(w,h)/min(w,h)`)가 즉시 되돌려 **캔버스 비율은 항상 portrait**이고, 보이는
> 결과는 "이미지만 압축되며 회전"이며 캔버스 통째 CSS 회전은 **비활성(no-op)**(스케일러가 transform을
> 3회 재설정 + `cPos`가 회전을 몰라 드래그 좌표 어긋남). 게다가 회전 경로(`:7345-7348`)는 **pan clamp를
> 잃고**, `T.rot ?? state.rot` **전역 폴백** 때문에 **액자를 가로로 두면 케이스 사진까지 회전**한다.
> **인쇄는 회전을 무시**한다(`drawImageT` `:9732`·`:11371`에 rotate·swap 없음) → 미리보기≠인쇄.
> **EXIF는 레거시·리빌드 모두 직접 처리 0**(grep 0건). 리빌드는 `<img>`+`naturalWidth` 경로라 최신 엔진의
> 기본 EXIF 적용에 의존하며 **이 저장소에서 실측된 적 없다(NOT VERIFIED)**.
> **★ 계약 충돌(핵심)**: **임의 각도를 허용하면 스펙 029 Founder 확정값이 깨진다** — 45°에서 cover 최소
> 배율이 √2라 `scale` 하한 **1.0(D-3)** 과 **빈 공간 금지(D-7)** 를 동시에 만족할 수 없다.
> **90° 배수만** 허용하면 019 cover(입력 w/h swap 재사용)와 029 normalized pan이 **그대로** 살아 있다.
> **또한 회전은 `packages/render` 계약 변경이 전제**다: `draw-image-cover`에 rotation 필드가 없고
> `draw-image-stretch`는 "no rotation", executor 헤더는 **"no setTransform/scale/rotate/translate"**
> 를 못 박았다 → 지금까지 지켜 온 "packages 무변경" 경계를 처음 깨는 일이다.
> **결정 필요**: Founder 6건(R-1 각도 집합 · R-2 D-3/D-7 재해석 · R-3 액자 가로/세로 도입 여부(분리 권장) ·
> R-4 case 회전 · R-5 아트 템플릿에서의 회전 · R-6 EXIF 직접 정규화 여부(**하지 않기 권장**)) +
> Codex 9건(C-1 `rot`을 normalized transform의 4번째 필드로 · C-2 `{0,90,180,270}` 거부형 정규화 ·
> C-3 pan은 화면축·`maxPan`은 회전 footprint · C-4 zone 중심+pan 회전 · C-5 `draw-image-cover`에 선택적
> quarter-turn · C-6 커맨드 내부 save/rotate/restore · C-7 probe plan에 `rot` 포함 ·
> C-8 **회전은 plan에 담아** print와 자동 일치 · C-9 실패 시 plan 미생성).
> 최소 구현 순서·허용 파일 후보·검증 설계(EXIF 합성 JPEG 바이트 스플라이싱 포함)·지원 불가·근거 부족·
> STOP 10조건도 기록했다. **코드·테스트·CSS·설정·PNG·lockfile 변경 0**, 신규 의존성 0,
> 실제 network·live·Firebase·CORS·deploy 0. 구현 스펙은 작성하지 않았고 다음 기능도 착수하지 않는다.

> 스펙 029 종료(2026-07-30): Codex가 보완 라운드 1 코드 **`110511e`** 와 문서 **`0512c8d`** 를 독립 재검증해
> **승인 가능**으로 판정했고, Claude Code가 종료 문서만 처리했다(상태 `CODEX_PASSED` → `COMMITTED`,
> 문서 전용 커밋·기능 코드 변경 0). 정본 `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`(§CODEX_PASSED),
> 인계 `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`(§9).
> **Codex가 확인한 것**: `pointerup`이 pending transform을 **정확히 1회 flush**하고 `pointercancel`·
> `lostpointercapture`·abort·dispose는 **폐기**하며, **stale callback·다음 세션 오염 0**이고
> `setPointerCapture` 실패 시 **즉시 abort**한다.
> **Codex 독립 게이트 PASS**: frozen install·lockfile diff 0·신규 의존성 0 / format·lint·typecheck /
> **unit 944/944** / build(mockup JS **263.31 kB**·gzip **81.60**, CSS **15.47/3.88**, admin 무변경) /
> **E2E 91/91 PASS**·정상 exit / `git diff --check` / 포트 4183·4184 listener 0 / OS temp `denn-e2e-*` 0 /
> HEAD=origin=`0512c8d`·0/0. Claude 실측치와 **일치**(dist SHA-256 E2E 전후 동일·fixture 0·저장소 프로세스 0 추가 확인).
> **확정 계약(최종)**: 슬롯별 `scale` 1.0~5.0 + 축별 normalized pan `[-1,1]`·**plan 직전 환산**·`maxPan=0` 고정 /
> `maxPan`은 **probe plan**에서 읽어 어댑터 rect 공식 비복제(둘 중 하나 실패 시 plan 미생성) / 잘못된 입력은
> **거부**(clamp 복구·기본값 생성 0, hostile getter/Proxy throw 0) / Pointer Events + capture, **`pointerup`
> 1회 flush**·나머지 종료 폐기·generation 가드·rAF 1회 병합·**capture 실패 시 즉시 abort** /
> 슬라이더 100~500%·버튼·휠 `*1.1`·`/1.1`(휠은 scale 변화 시에만 preventDefault)·화살표 0.02·Shift 0.10·
> 단일 `원래대로`·슬롯 카드 선택 + `편집 중`·사진 미준비 시 전부 disabled / **터치 drag·핀치 미지원 +
> `touch-action` 선언 0**(기존 스크롤·브라우저 확대 보존) / 초기화 행렬(이미지 교체·삭제는 그 슬롯만,
> model·template·frame-size·kind는 전체, **색상·활성 슬롯 전환은 유지**) / 스펙 026 owner와 `packages/**` 무변경.
> **NOT TESTED 유지**: 2손가락 핀치(미구현 + Playwright 구동 불가) · 터치 drag · 실기기 4환경 ·
> 실제 200% 브라우저 확대 · print/export pan 재현(레거시 frame 하드코딩 `dim.w/500`은 별도 스펙) ·
> 대용량 이미지 실기기 성능 · EXIF · 운영 카탈로그·이미지. 실제 network·live·Firebase·CORS·deploy **0**.
> ⚠️ 이 종료는 **합성 fixture에서 마우스·휠·슬라이더·버튼·키보드로 구도를 조절한 단계**이며 터치·실기기·
> 인쇄/export·주문·배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
> **다음 스펙(030 등)·사전조사·신규 기능은 착수하지 않는다.**

> 스펙 029 보완 라운드 1 완료(로컬 검증, 2026-07-30, 기준 `197527c`, 코드 커밋 `110511e`): Codex 지적
> **2건 모두 유효**였다. **① 릴리즈 flush** — `end(…, "pointerup")`이 **대기 중인 최신 transform을 버려**
> 릴리즈 직전 `move`가 rAF를 기다리는 중이면 사진이 **손을 놓은 위치보다 한 프레임 뒤**에 남았다 →
> 이제 `pointerup`만 **정확히 1회 flush** 후 종료하고 `pointercancel`·`lostpointercapture`·selection abort·
> unmount/dispose는 **pending을 폐기**한다. flush는 state 정리·frame 취소 **후에** 실행되므로 늦은 rAF는
> commit 0, 이중 commit 0, **다음 세션 pending 소비 0**이며 `cancelFrame`은 frame 유무와 무관하게 항상
> pending을 비운다. **② capture 실패** — `setPointerCapture`가 throw하면 **capture 없는 drag가 계속**돼
> 포인터가 요소를 벗어나면 세션이 반쯤 열린 채 남았다 → throw 시 방금 시작한 세션을 **즉시 abort**하고
> `dragSlotRef`를 비운다. **유지된 계약**: normalized 저장·plan 직전 환산·`maxPan=0` 고정·1.1 승산·
> 0.02/0.10 스텝·단일 `원래대로`·generation 가드·rAF 1회 병합·터치 drag·핀치 미지원·`touch-action` 선언 0·
> 초기화 행렬·스펙 026 owner와 `packages/**` 무변경. **신규 회귀**: flush 1회 / 이미 실행된 frame 중복 0 /
> move 없는 up commit 0 / 다음 세션 누출 0 / stale end flush 0 / throwing subscriber 후 재사용 /
> abort·dispose 폐기 / **실제 Chromium** capture 거부 시 픽셀 불변 + 원복 후 정상 drag.
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 944**(938→944) /
> **e2e 91 PASS**(90→91)·exit 0 / `git diff --check` clean / 포트 4183·4184 free·OS temp 0·저장소 소속
> 프로세스 0 / dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0.
> **번들**: mockup JS **263.19 → 263.31 kB**(gzip **81.56 → 81.60**), **CSS 무변경**, admin 무변경.
> NOT TESTED 목록은 그대로 유지된다(핀치·터치 drag·실기기·200% 확대·print/export pan·대용량 성능).

> 스펙 029 구현·자체검증 완료(로컬, 2026-07-30, 기준 조사 `2ded576`·결정 `7701c7a`, 코드 커밋 `95fcf92`):
> 정본 `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`, 인계
> `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`. **고객이 처음으로 사진 구도를 조절한다.**
> **상태 모델**: composer가 슬롯별 `{scale, x, y}`를 소유하고 `scale`은 무차원 **1.0~5.0**, `x/y`는 축별
> `maxPan` 대비 **[-1,1]** normalized이며 **plan 직전에만** logical px로 환산한다(`maxPan=0` 축은 0 고정,
> resize는 normalized 유지 후 재환산). 신규 `apps/mockup/src/preview/imageTransform.ts`는 framework-free이고
> **범위 밖·비유한·hostile getter/Proxy trap/revoked Proxy를 거부**하며 **clamp 복구·기본값 생성을 하지 않는다**.
> 스펙 026 owner의 리터럴 transform과 `packages/**`는 **무변경**(재사용만).
> **어댑터 공식 비복제**: `maxPan`을 얻으려 zone/mat rect 공식을 복사하지 않고 **pan 0 probe plan**의
> `draw-image-cover`(`clipRect`/`drawRect`)에서 축별 값을 읽은 뒤 실제 plan을 만든다 — 두 단계 중 하나라도
> 실패하면 **plan을 만들지 않는다**(부분 plan·이전 transform 재사용 0).
> **입력**: mouse/pen Pointer Events + `setPointerCapture`, 시작 snapshot 기준 **절대 delta**, rAF **1회 병합**,
> `pointerup`·`pointercancel`·`lostpointercapture`·선택 변경·unmount 종료 + **generation 가드**,
> 슬라이더 100~500%·버튼·휠 **`*1.1`/`/1.1`**, 화살표 **0.02**/Shift **0.10**, 단일 **`원래대로`**.
> **핀치·터치 drag는 1차 미구현**이고 **전역 `touch-action:none`·무조건 `preventDefault`를 추가하지 않았다**
> (E2E가 body·area·canvas 모두 `auto`임을 실측) → 기존 스크롤·브라우저 확대 제스처 보존. 휠은 **scale이
> 실제로 바뀔 때만** 기본 동작을 막는다. **초기화 행렬**: 이미지 교체·삭제·실패는 그 슬롯만, model·template·
> frame-size·kind 변경은 전체, **색상 변경·활성 슬롯 전환은 유지**. case는 **슬롯 카드 선택 + `편집 중` 표시**
> (캔버스 히트테스트 0), frame은 단일 슬롯, 사진이 ready가 아니면 컨트롤 전부 `disabled`.
> **⚠️ 구현 중 결함 발견·수정**: **stale animation frame이 다음 세션의 pending 값을 소비**해 재-grab 직후 첫
> move가 사라졌다 → stale frame은 `pending`을 건드리지 않고 return(신규 unit이 고정).
> **검증**: unit **938**(893→938, 신규 45) / **실제 Chromium E2E 90**(85→90, 신규 5) — drag로 반쪽 경계
> **y=50→70**·빈 공간 0·다른 존 불변·`maxPan.x=0` 축 불변·캔버스 밖 `pointerup` 후 불변 / 버튼·휠·슬라이더·
> 키보드·`원래대로` / 슬롯 전환에도 두 구도 유지·교체 시 그 슬롯만 초기화 / 액자 **1280→360 resize 후 같은
> 비율 지점 색 동일** / 320px 오버플로 0·`touch-action` 전부 `auto`·44px·axe 0·console 0.
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / exit 0 /
> `git diff --check` clean / 포트 4183·4184 free · OS temp·저장소 소속 프로세스 0 / dist **SHA-256 E2E 전후
> 동일·fixture 0** / 네트워크·live·Firebase·CORS·deploy **0**. **번들**: mockup JS **254.06 → 263.19 kB**
> (gzip **78.90 → 81.56**), CSS **13.80 → 15.47**(gzip **3.53 → 3.88**), admin 무변경.
> **NOT TESTED**: 2손가락 핀치(미구현 + Playwright 구동 불가), 터치 drag, 실기기 4환경, 실제 200% 확대,
> print/export pan 재현, 대용량 사진 성능·EXIF, 운영 카탈로그·이미지.
> ⚠️ 이 완료는 **합성 fixture에서 마우스·휠·슬라이더·버튼·키보드로 구도를 조절한 단계**이며 터치·실기기·
> 인쇄·주문·배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.

> 스펙 029 결정 확정(2026-07-30): 정본 `docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`.
> **Founder 승인**: D-2 case multi-zone은 **슬롯 카드 선택 + 활성 슬롯 표시**(캔버스 히트테스트 없음) /
> D-3 scale **1.0~5.0 단일 범위**·내부 무차원·**표시만 %**·휠·버튼 **승산** / D-5 **단일 `원래대로` 버튼** /
> D-6 **1차 핀치 미지원**(슬라이더·버튼·휠·키보드·마우스 drag) / D-7 **클립 안 빈 공간 금지**(최소 scale 1.0 +
> cover clamp 유지). **Codex 계약**: D-1 편집 상태 = `scale` + 축별 **normalized pan `x/y ∈ [-1,1]`**
> (현재 scale의 축별 `maxPan` 대비, `maxPan=0`이면 0)이고 **plan 생성 시에만** logical px로 환산 /
> D-4 키보드 normalized **0.02**·Shift **0.10** / D-8 **composer가 slot별 transform 소유**, 스펙 026 owner
> **무변경** / D-9 이미지 교체·삭제·model·template·frame-size 변경 시 **초기화**, 색상 변경·활성 slot 전환은 **유지**.
> **불변식**: 편집 상태에 logical px pan 미저장 · scale<1.0 부재(cover 항상 유지) · 핀치 제스처 미가로채기
> (브라우저 200% 확대 보존) · `packages/render`·스펙 026 owner 무변경 · 형상 변경만 초기화.
> **여전히 미결정·미검증**: 실기기 4환경 스크롤·제스처 충돌(육안 필요), 실제 200% 확대, `touch-action` 범위와
> 스크롤 양보 게이트 세부, 인쇄/export pan 재현(레거시 frame 하드코딩 `dim.w/500`), 핀치 향후 도입,
> 대용량 사진 드래그 성능. 이 라운드도 **문서 전용**(제품 코드·테스트·CSS·설정·lockfile diff 0, 신규 의존성 0,
> network·live·Firebase·CORS·deploy 0)이며 **구현 스펙은 Codex가 작성**한다.

> 스펙 029 사전 조사 완료(읽기 전용, 2026-07-30, 기준 HEAD `d21531c`): 보고서
> `docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`(10항목).
> **한 줄: 기하는 이미 준비돼 있고, 막힌 것은 두 계약이다.** `computeCoverDrawRect`가 cover·drawScale·
> **pan clamp**를 계산해 `appliedTransform`/`maxPan`을 돌려주고(입력을 변형하지 않음), `clientPointToLogical`이
> logical px 기준으로 포인터를 변환하며, plan/adapter는 이미 zone별 `transform`을 받는다 → **`packages/render`
> 무변경으로 시작 가능**. 결정이 필요한 것은 ⓐ **pan 단위·기준 공간** — 액자 logical canvas는
> `resolveFrameLogicalWidth`(`max(1,round(min(content,500)))`)와 `ResizeObserver`로 **resize마다 바뀌므로**
> logical px 저장은 "창 크기 바꾸면 사진이 움직임"을 구조적으로 만든다(case는 `modelLogicalSize` 고정이라
> 무해 → 같은 단위를 쓰면 한쪽이 반드시 틀림) ⓑ **transform 소유자** — 스펙 026 owner의 `transform`이
> **리터럴 타입 `{scale:1,x:0,y:0}`** 이라 owner를 편집 주체로 둘 수 없음(권장: composer가 slot별 소유).
> **레거시 실측**: pan은 `drawImgT`(`:1543-1556`)가 **렌더 중 T를 직접 clamp**(maxPan=|drawSize-zone|/2, abs라
> **줌아웃 시 클립 안 빈 공간 허용**), 인쇄 경로(`:11371`)는 **clamp 없이 pan×해상도배율** — case는
> `dim.w/model.w`로 일치하지만 **frame은 하드코딩 `dim.w/500`** 이라 `ADM.uiCustom.prevMaxW` 변경 시
> 미리보기와 인쇄가 어긋난다. zoom은 휠 ±0.08·핀치 승산(0.3~5)과 슬라이더/±25%p(30~500%)가 **불일치**하고,
> multi-zone에서 **슬라이더 표시값·터치 시작 오프셋이 `caseImgT`를 봐서 틀린다**(`:1455`,`:1470`,`:1482`) →
> 재현 대상이 아니라 회피 대상. 이벤트는 **pointer capture 없음**(캔버스 밖 나가면 끊김), case는 팬 중
> `preventDefault`로 스크롤을 죽이고, **frame은 미리보기가 스크롤 컨테이너보다 크면 팬/핀치를 포기하고
> 네이티브 스크롤에 양보**(`frameScaleOverflowV`, preventDefault 前 게이트).
> **모바일 제약(리빌드)**: `surface.css`에 `touch-action` 선언이 **0**이고 wrapper는 `overflow-x:auto`+
> `tabIndex=0`, 캔버스는 축소하지 않으므로 무조건 preventDefault는 가로·세로 스크롤을 둘 다 죽인다.
> **핀치는 Playwright로 구동 불가(단일 탭만 제공) → 구조적 NOT TESTED**, 합성 TouchEvent는 PASS 근거 아님.
> **차단 결정 9건**: D-1 pan 단위(계약) · D-2 활성 zone UX(**Founder**) · D-3 scale 범위·단위 통일(**Founder**) ·
> D-4 키보드 이동 단위 · D-5 초기화 버튼 구성(**Founder**, 레거시 "맞춤"="초기화" 중복) · D-6 핀치 지원 여부
> (**Founder**, 200% 확대 제스처 충돌) · D-7 클립 빈 공간 허용(**Founder**) · D-8 transform 소유자 ·
> D-9 선택/템플릿 변경 시 초기화 여부. 최소 구현 순서·허용 파일 후보·STOP 조건도 기록했다.
> **코드·테스트·설정·CSS·PNG·lockfile 변경 0**, 신규 의존성 0, 실제 network·live·Firebase·CORS·deploy 0.
> 구현 스펙은 작성하지 않았고 다음 기능도 착수하지 않는다.

> 스펙 028 종료(2026-07-30): Codex가 보완 코드 **`d4fb99b`** 를 독립 재검증해 **승인 가능**으로 판정했고,
> Claude Code가 종료 문서만 처리했다(상태 `CODEX_PASSED` → `COMMITTED`, 문서 전용 커밋·기능 코드 변경 0).
> 정본 `docs/rebuild/specs/028-template-art-stretch-cors-owner.md`(§CODEX_PASSED), 인계
> `docs/handoff/2026-07-29-spec-028-template-art-handoff.md`(§11).
> **Codex가 확인한 것**: ⓐ `templateArtBinding`의 source `kind`/`src`가 **예외 경계 안에서 각 1회** 읽힌
> snapshot만 검증·`crossOrigin`/`src` 대입·binding에 쓰이고 hostile getter·Proxy trap·revoked Proxy가
> **throw 없이** 안전 실패 / ⓑ placement의 source 체인·legacy-builder marker가 **각 1회** snapshot되어
> **첫 snapshot이 legacy crop이면 getter drift가 `stretch`로 fail-open시키는 경로가 없음** / 변경 범위는
> 허용된 source·test 4개 + lint 의미 보존 1줄로 한정. **유지 계약**: crossOrigin-before-src · data URL 예외 ·
> 재시도 0 · generation guard · cache 0 · 기존 none/stretch/unsupported 결과와 오류 우선순위 · 원문·필드명·ID 미노출.
> **Codex 독립 게이트 PASS**: frozen install·lockfile diff 0 / format·lint·typecheck / **unit 893/893** /
> build(mockup JS **254.06 kB**·gzip **78.90**, CSS 13.80/3.53; admin 193.53/61.09, 8.54/2.64) /
> **E2E 85/85 PASS·exit 0** / `git diff --check` / 포트 4183·4184 listener 0 / OS temp `denn-e2e-*` 0 ·
> 저장소 소속 node·esbuild 0 / 고객 dist fixture 0 / HEAD=origin=`baa0d78`·0/0.
> Claude 재실측도 동일 수치(unit 893, e2e 85 PASS exit 0 19.5초, build 동일, diff clean, 포트 free, temp 0).
> **NOT TESTED/NOT VERIFIED 유지**: 운영 bucket CORS·ACAO 부재 시 실제 브라우저 실패, 운영 이미지·카탈로그,
> 실기기 4환경·실제 200% 확대, print/export taint, 대용량 아트 성능, 썸네일(non-CORS)↔owner(anonymous)
> 동일 URL 캐시 오염. 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**.
> ⚠️ 이 종료는 **합성 fixture에서 CORS-clean 아트를 fail-closed로 합성한 단계**이며 운영 CORS·print/export·
> 주문·배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
> **다음 스펙(029 등)·사전조사·신규 기능은 착수하지 않고 Codex의 최종 commit hash 확인을 기다린다.**

> 세션 종료(2026-07-29): Founder 지시로 마감하고 **Claude Code의 5분 자동 루프를 종료**했다(cron job 취소).
> 인계 정본은 `docs/handoff/2026-07-29-session-end-handoff.md`.
> **스펙 028은 `DONE`도 `CODEX_PASSED`도 아니다** — Codex가 `cebcaad`를 검토해 fail-closed/snapshot 결함 2건을
> `CORRECTION_REQUIRED(1/3)`로 지적했고, Claude가 그 2건을 `d4fb99b`(코드) + `b18b652`(문서)로 보완·push했으나
> **그에 대한 Codex 재검증은 실행되지 않은 채 세션이 끝났다**. 구현 후보 = `f7b3f61` → `d4fb99b`.
> **다음 세션 보완 2건**: ⓐ `templateArtBinding`의 source 필드를 **예외 경계 안에서 각 1회** 읽어 snapshot으로만
> 사용(getter throw·Proxy trap·revoked Proxy는 안전 실패, drift 무효, crossOrigin-before-src·data 예외·재시도 0·
> generation guard·cache 0 무변경) ⓑ `placement`의 source 체인·legacy-builder marker를 **각 1회** 읽어 전체 snapshot으로
> 판정하고 **첫 snapshot이 legacy crop이면 drift가 근거를 지워도 `stretch`로 fail-open하지 않음**(원문·필드명·ID 미노출,
> 기존 결과·오류 우선순위 무변경). **PASS(이번 세션 실측)**: frozen exit 0·lockfile diff 0 / format·lint·typecheck /
> **unit 893** / build(mockup **254.06 kB**·gzip **78.90**, CSS **13.80/3.53** 무변경, admin 무변경) / **e2e 85 PASS·exit 0** /
> `git diff --check` clean / 포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 고객 dist **SHA-256 E2E 전후 동일·fixture 0**.
> **NOT TESTED**: **Codex 재검증**, 운영 bucket CORS, ACAO 부재 시 실제 실패(Playwright가 fulfill 응답에 ACAO를 자동
> 부여함을 실측 → 시뮬레이션 불가), 운영 이미지·카탈로그, 실기기 4환경, 실제 200% 확대, print/export taint, 대용량 성능.
> **NOT VERIFIED**: 썸네일(non-CORS)↔owner(anonymous) 동일 URL의 캐시 오염 가능성.
> 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, **다음 스펙 미착수**.
> 재개 시 HEAD=origin=`b18b652`·0/0 확인 후 위 2건 범위에서만 진행한다.

> 스펙 028 보완 라운드 1 완료(로컬 검증, 2026-07-29, 기준 `cebcaad`, 코드 커밋 `d4fb99b`): Codex 지적 **2건 모두 유효**였다.
> **① art source 1회 snapshot** — `templateArtBinding`이 `source.kind`/`src`를 **예외 경계 밖에서** 읽어 hostile
> getter·Proxy trap·revoked Proxy가 `load()` 밖으로 throw할 수 있었고, drift가 검증값과 실제 `crossOrigin`/`src`
> 대입값을 가를 수 있었다 → `readSourceOnce()`가 **경계 안에서 각 1회** 읽어 plain snapshot을 만들고 이후 전부
> snapshot만 사용한다(hostile 입력은 element 생성 없이 `INVALID_INPUT`). **② placement 전체 1회 snapshot** —
> source 체인·legacy-builder marker를 helper마다 재읽어 **첫 읽기가 legacy crop이어도 drift가 근거를 지우면
> `stretch`로 fail-open**할 수 있었다 → `readTemplateOnce()`가 `generatedDetailPreview`·legacy source 5필드·`type`·
> `builtBy`·`exportVersion`·`overlayScope`·`frameBaked`를 **각 1회** 읽어 boolean snapshot으로 판정하므로
> **첫 snapshot이 legacy crop이면 결과가 유지**된다. **유지된 계약**: crossOrigin-before-src·data URL 예외·재시도 0·
> generation guard·cache 0·기존 none/stretch/unsupported 결과와 오류 우선순위·Result에 source/필드명/ID 미추가.
> 선택적 lint 정리 1줄(`noUselessTernary`, 의미 변경 0)도 반영했다. **신규 회귀 테스트 17건**(필드별 read count,
> drifting kind/src, drifting source/marker의 legacy crop 유지, throwing getter·Proxy trap·revoked Proxy).
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 893**(876→893) /
> build(mockup JS **254.06 kB**·gzip **78.90**, CSS **13.80/3.53 무변경**, admin 무변경) / **e2e 85 PASS·exit 0·16.4초** /
> check PASS / `git diff --check` clean / 포트 4183·4184 free·잔류 0 / OS temp 0 / 고객 dist **SHA-256 E2E 전후
> 동일·fixture 0** / 네트워크·live·deploy 0. **PNG 2개는 이번에도 미복원·미커밋**(working tree dirty).

> 스펙 028 구현·자동검증 완료(로컬, 2026-07-29, 기준 HEAD `7a2b2cd`, 코드 커밋 `f7b3f61`): 정본
> `docs/rebuild/specs/028-template-art-stretch-cors-owner.md`, 인계
> `docs/handoff/2026-07-29-spec-028-template-art-handoff.md`. Founder 결정 = **아트 실패 시 미리보기 차단**.
> **신규 command** `draw-image-stretch`(5-인자 `drawImage`로 destRect 채움, **source-crop·9-인자·opacity·rotation 0**,
> destRect는 logical canvas에 완전 포함, 오류 code 무확장). **layer 순서**: case = body→사진→`case:template-art`→guides,
> frame = body→mat→사진→`frame:template-art`→inner border, destRect는 case=canvas 전체·frame=matRect.
> **placement projection**(`@denn/shared`)이 `none`/`stretch(case-canvas|frame-mat)`/`unsupported(legacy-builder-crop|
> invalid-template)`만 반환하고 **source 문자열·field·ID를 노출하지 않으며** hostile 입력에 throw 0 —
> **legacy builder crop variant는 근사하지 않고 거부**한다. **아트 owner**: trust boundary 통과분만 입력받아
> **remote는 `crossOrigin="anonymous"`를 `src`보다 먼저** 설정(`data:`는 미설정), `template-art-<generation>` key,
> generation stale 차단, **cache 0**, **crossOrigin 없는 재시도 0**, `src`는 closure·drawable 안에만.
> **fail-closed**: trust 실패·unsupported·loading·decode 실패·binding 누락이면 **Canvas 0** + 고정 문구,
> 아트가 **원래 없는** builtin/no-source/generated-preview는 기존 preview 유지. **실제 Chromium E2E 7건**:
> `data:` 아트 캔버스 전체 stretch(사진 위, 투명부로 사진 비침, network 0) / 신뢰 URL 아트 **anonymous 1회**·mat rect
> stretch·**`getImageData` 성공(CORS-clean)** / 실패 시 Canvas 0·안내·**재시도 0** / legacy crop **요청 전 차단** /
> builtin 기존 preview 유지 / 선택 변경 후 늦은 아트 오염 0 / URL·token·base64·source kind·code 누출 0(스펙 018이
> 허용한 썸네일 `img[src]`만 예외). **⚠️ 한계(정직 기록)**: Playwright `route.fulfill`이 응답에 ACAO를 자동으로 붙여
> **"ACAO 없음" 시나리오를 재현할 수 없음**(실측) → **"ACAO 없음 ⇒ 로드 실패"는 NOT TESTED**, 검증된 것은
> **실패 시 fail-closed·재시도 0**. 썸네일(non-CORS)→owner(anonymous) 요청 순서에서의 캐시 오염 가능성은 **NOT VERIFIED**.
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 876**(802→876, 신규 74) /
> **e2e 85 PASS**(78→85, 신규 7)·exit 0 16.2초 / check PASS / `git diff --check` clean / 포트 4183·4184 free /
> OS temp 0 / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0. **번들**: mockup JS
> **248.29 → 253.92 kB**(gzip **77.55 → 78.82**, 원인 = 아트 owner+placement+stretch 실행 경로), **CSS 무변경**,
> admin 무변경. **무변경**: `packages/firebase`(재사용만)·admin·운영 HTML·Firebase 설정/Rules/CORS·POC·PNG·
> manifest·lockfile. **NOT TESTED**: 운영 bucket CORS·운영 아트·실기기·실제 200% 확대·print/export taint·대용량 성능.
> ⚠️ 이 완료는 **합성 fixture에서 CORS-clean 아트를 fail-closed로 합성한 단계**이며 운영 CORS·print/export·주문·배포
> 완료가 아니다.

> 스펙 028 사전 조사 완료(읽기 전용, 2026-07-29, 기준 HEAD `beb16ea`): 보고서
> `docs/codex-claude-handoff/reviews/2026-07-29-template-art-canvas-cors-investigation.md`(12항목).
> **한 줄: 템플릿 아트는 "이미지를 하나 더 그리는 일"이 아니다** — 레거시는 아트를 **stretch**로 그리고(케이스=캔버스 전체
> `:1679`, 액자=mat rect `:3094`), 일부 uploaded 액자는 **아트 픽셀을 읽어 crop rect를 추정**하며(`detectLegacyInnerRect`
> `:3076-3091`), 그 픽셀 읽기는 **CORS-clean이 아니면 SecurityError**다. **현재 render-plan 어휘에는 stretch도
> source-crop도 없어**(`draw-image-cover`는 cover 의미, 실행기는 9-인자 오버로드를 의도적으로 배제) `draw-image-cover`
> 재사용은 **의미적으로 안전하지 않다**. **재사용 가능 확정**: 스펙 018 projection(`sourceKind`/`generatedDetailPreview`
> 게이트)과 `@denn/firebase` trust boundary는 순수·네트워크 0이라 **그대로 재사용**하면 된다. **CORS**: `crossOrigin`은
> `src` 대입 **전에** 설정해야 하고(레거시는 prototype setter 패치 `:11638-11662`), ACAO가 없으면 **로드 자체가 실패**하며,
> taint는 **픽셀을 읽는 순간(인쇄/export)** 에만 드러난다 — 현재 executor는 픽셀을 읽지 않으므로 preview만으로는 조용히
> 통과한다. 레거시의 **"crossOrigin 없이 재시도"(`:12138`)는 tainted canvas → 인쇄 0×0 위험이라 복제 금지**.
> **실패 정책이 레거시에서 불일치**: 액자는 아트만 생략하고 계속(`:3133`), 케이스는 `onerror` 핸들러 부재로 카메라·가이드까지
> 렌더가 멈춘다(`:1679`). **합성 fixture만으로 검증 가능한 경계**(ACAO 유무 라우트로 성공/실패·taint 대조군)와
> **NOT VERIFIED**(운영 버킷 CORS 실제 설정·token 수명·아트 분포·legacy crop 템플릿 실재 여부)를 분리했다.
> **결정 필요 5건**: D-1 stretch command 도입(계약) · D-2 legacy crop 템플릿 지원/거부(계약) · D-3 아트 로드 실패
> 정책(생략/차단/placeholder, **Founder**) · D-4 아트 캐시 키·수명(소스 문자열 보존 경계) · D-5 버킷 CORS 미설정 시 처리
> (**Founder**, 설정 변경은 승인 사항). 최소 구현 순서·허용 파일 후보·STOP 조건도 제안했다(1단계 = `packages/render`
> 어휘 결정, 그 전에는 앱 작업 불가). **코드·설정·테스트·PNG·lockfile 변경 0, 실제 Firebase GET·이미지 다운로드·live·
> CORS 변경·Rules/Hosting·deploy 0.** 구현 스펙은 작성하지 않았고 다음 기능도 착수하지 않는다.

> Codex 최종 승인(2026-07-29): 스펙 027 = **승인 가능**(승인 기준 HEAD `06d9700`, 보완 코드 `6fb8630`,
> 기준선 `075ee01`, fix_round 1). 독립 재검증 = canonical frame fill dedup·source order 첫 유효 이름 보존 PASS /
> format·lint·typecheck PASS / **unit 802/802** / build(**mockup JS/CSS gzip 77.55 / 3.53 kB**,
> **admin 61.09 / 2.64 kB**) / **E2E 78/78 PASS·exit 0** / 고객 `/`의 **실제 case·frame Canvas 픽셀·키보드 전용·
> 320px/desktop·axe·누출 0** PASS / 포트 4183·4184 free · OS temp `denn-e2e-*` 0 · `git diff --check` PASS /
> HEAD=origin·0/0. **승인된 것**: 선택 완료 후 **명시적 `미리보기 만들기` 단계**, 색 자동 선택 0(case 레거시 solid 8색·
> transparent 제외, frame은 정확한 `#RRGGBB` solid만·grain 제외·canonical 값 dedup), 모든 필수 이미지가 ready일 때만
> plan(zone별 독립 owner, 공유 fallback 0), frame width `max(1, round(min(content, 500)))`+resize 재계산,
> 선택 변경 시 composer 닫힘·owner dispose, raw 카탈로그는 projection 입력으로만 사용, 실패는 code·ID 없이 고정 문구.
> **NOT TESTED(유지)**: 실제 기기·실제 200% 확대·운영 이미지·대용량 사진 메모리/성능·EXIF 회전.
> **미착수(유지)**: template art·Firebase image CORS-clean 합성·pointer/pan/zoom·회전·text/clock/watermark·
> print/export·저장·주문·카카오·Firebase SDK/Auth/Rules/CORS/Hosting·deploy. `hosting.public:"."` →
> **Hosting 격리 전 배포 금지** 유지. ⚠️ 이 종료는 **로컬 사진 기반 첫 고객 preview 연결**이며 상품 미리보기 기능
> 전체의 완성이 아니다. **PNG**: Codex E2E 재생성분 2개는 미복원·미커밋(working tree dirty·커밋된 PNG 0).
> **다음 스펙은 지시 대기.**

> 스펙 027 보완 라운드 1 완료(로컬 검증, 2026-07-29, 기준 `075ee01` + Codex 지적 `f5c0039`, 코드 커밋 `6fb8630`):
> **지적(재현 확인)** = `frameColors`의 서로 다른 항목이 같은 canonical fill(`#1a1a1a`/`#1A1A1A`)을 가지면
> swatch의 React key·`data-testid`가 중복되고 값 비교 때문에 **여러 버튼이 동시에 `aria-pressed=true`** 가 될 수 있었다.
> **수정** = `readFrameColorOptions`가 canonical uppercase 값 기준으로 **결정적 dedup**(source order의 **첫 유효 항목과
> 이름 보존**, 이후 중복 미표시, **유효 항목만 색 선점**이라 앞선 `grain`·형식 오류가 뒤 solid를 가리지 않음).
> 자동 선택 0·raw id/object/diagnostic 미노출·property 1회 읽기·hostile getter throw 0 **유지**.
> 신규 테스트 5건(대소문자 2개→1, 같은 색 3개→1, 서로 다른 색 순서 유지, 무효 항목 미선점, markup swatch 1개·pressed 0).
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 802**(797→802) /
> build(mockup JS **248.29 kB**·gzip **77.55**, CSS **13.80**·**3.53**, admin 무변경) / **e2e 78 PASS·exit 0·16.9초** /
> check PASS / `git diff --check` clean / 포트 4183·4184 **free**·잔류 0 / OS temp `denn-e2e-*` 0 / 고객 dist
> **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0. **이전 라운드의 "E2E 2.1~3.5분" 의문 해소**:
> 동일한 78건 스위트가 이번에 **16.9초**로 끝나 그 지연이 **호스트 부하**였고 앱 회귀가 아니었음이 실측됐다.
> **PNG**: Codex E2E 재생성분 2개는 이번에도 미복원·미커밋(working tree dirty·커밋된 PNG 0).

> 스펙 027 구현·자동검증 완료(로컬, 2026-07-29, 기준 HEAD `835eaaa`, 코드 커밋 `175a363`): 정본
> `docs/rebuild/specs/027-customer-preview-composer-connection.md`, 인계
> `docs/handoff/2026-07-29-spec-027-customer-preview-handoff.md`. **고객 화면에서 스펙 023 projection →
> 025 adapter → 026 local image binding → 022 Canvas surface를 처음 연결했다**(로컬 사진 + 결정적 solid 색까지).
> **UX 계약**: 선택 완료만으로 Canvas를 만들지 않고 `미리보기 만들기` 버튼만 렌더(열기 전 색·파일 UI·Canvas 0),
> 색 자동 선택 **0**(초기 `null`), case는 레거시 solid **8색**·`transparent` 제외, frame은 정확한 `#RRGGBB` +
> 이름 있는 solid만·**`grain` 제외**·지원 색 0이면 안내만, 필수 이미지가 **모두 ready**일 때만 plan(loading/failed/
> clear/unmount 시 plan·Canvas 즉시 제거), frame width = **`max(1, round(min(content, 500)))`**(측정 전·0·NaN·
> Infinity면 대기, resize 시 재계산), case는 `modelLogicalSize` + scroll wrapper 유지(CSS transform 축소 0),
> 선택 변경 시 composer 닫힘 + owner dispose. raw `CatalogDocumentV1`은 **projection 입력으로만** 사용하고 Canvas
> props로 넘기지 않으며 실패는 code·index·ID 없이 고정 문구로 닫는다. `packages/**`·executor·surface·adapter **무변경**.
> **⚠️ 구현 중 결함 발견·수정**: 스펙 026 owner가 각자 `user-image-1`부터 번호를 매겨 **zone 2개에서 ref 충돌**
> (첫 zone 사진이 두 zone에 그려짐, E2E가 검출) → plan/lookup을 slot namespace `<slotId>.<ownerRef>` +
> `withImageRefPrefix`로 수정(스펙 020 문법 유지, unit이 충돌 시나리오 고정). **실제 Chromium E2E 9건(고객 `/`)**:
> case 전체 흐름(픽셀 (75,50)=사진A / (225,50)=사진B / (150,150)=body, CSS 300×200)·교체/같은 파일 재선택/clear에서
> 부분 미리보기 0·선택 변경 시 닫힘·frame(미지원 색 미표시·사전선택 0·`width ≤ 500`·`height=round(width×1.4)`·
> 프레임/mat/사진 3구역)·좁은 뷰포트 width 축소와 overflow 0·파일명/`blob:`/`base64`/색 ID/실패 code 누출 **0**·
> 키보드 전용·320×568/1280×800 axe 0·console 0·실제 network 0. **게이트**: frozen exit 0·**lockfile diff 0**·
> 신규 의존성 0 / format·lint·typecheck / **unit 797**(755→797, 신규 42) / **e2e 78 PASS**(69→78, 신규 9)·exit 0 /
> check PASS / `git diff --check` clean / OS temp `denn-e2e-*` 0 / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** /
> 포트 4183·4184 실행 직후 TIME_WAIT 2건 → 재확인 **free**·잔류 프로세스 0. **번들(원인 기록)**: 미리보기가 처음
> 고객 번들에 포함돼 mockup JS **217.69 → 248.23 kB**(gzip **68.40 → 77.53**), CSS **11.32 → 13.80**(gzip
> **3.16 → 3.53**); admin **무변경**. **E2E 소요**: 20초대 → **2.1~3.5분**(두 번 모두 78/78·exit 0), 개별 시간
> 변동이 커 호스트 부하로 보이나 **원인 확정 NOT VERIFIED**. **NOT TESTED**: 실기기 4환경·실제 200% 확대·운영
> 카탈로그 분포·운영 이미지·대용량 사진 메모리/성능·EXIF 회전·선명도. **PNG**: Codex E2E 재생성분 2개는
> **미복원·미커밋**(working tree dirty·커밋된 PNG 0). ⚠️ 이 완료는 **로컬 사진 기반 첫 고객 preview 연결**이며
> 템플릿 아트·운영 이미지 CORS-clean·pointer/pan/zoom·print/export·저장·주문·Firebase·배포 완료가 아니다.

> Codex 최종 승인(2026-07-29): 스펙 026 = **승인 가능**(승인 기준 HEAD `69db696`, 보완 코드 `25c421b`,
> 기준선 `449b027`, fix_round 1). 독립 검증 = diff/허용 파일·format·lint·typecheck PASS / **unit 755/755** /
> build PASS(**mockup JS/CSS gzip 68.40 / 3.16 kB**, **admin 61.09 / 2.64 kB**) / **E2E 69/69 PASS·reporter
> exit 0** / **실제 Chromium에서 hook owner의 StrictMode mount→cleanup→remount·owner unmount·in-flight 중
> unmount·반복 remount PASS** / 포트 4183·4184 free · OS temp `denn-e2e-*` 잔여 0 · `git diff --check` PASS /
> HEAD=origin `69db696`·0/0. **승인된 계약**: framework-free `createLocalImageBindingController`가 private blob
> URL·decode·`imageRef → drawable` binding·generation·cleanup을 단독 소유하고, 공개 snapshot은 합성
> `user-image-<n>`·intrinsic size·고정 `{scale:1,x:0,y:0}`뿐이며 URL·Blob·파일명·MIME·예외·drawable을 노출하지
> 않는다. URL은 decode 완료 후 **모든 종료 경로에서 정확히 1회** revoke되고, 늦은 완료는 최신 snapshot·binding을
> 바꾸지 못하며, unmount 경로에는 state update가 없다. **NOT TESTED(유지)**: 실제 기기, 운영 이미지, 대용량 사진
> 메모리·성능, EXIF 회전. **미착수(유지)**: 고객 production 화면 mount, case/frame 색 선택·팔레트, frame logical
> width 정책, 멀티 zone 사진 공유, template art·Firebase 이미지 합성, pointer/pan/zoom, text/clock/watermark,
> print/export·저장·주문, Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live, deploy. ⚠️ **이 종료는 로컬
> 사용자 이미지 owner 완료이며 상품 미리보기·고객 Canvas 연결 완료가 아니다.** `hosting.public:"."` → **Hosting
> 격리 전 배포 금지** 유지. **PNG**: Codex 독립 E2E가 재생성한 `spec-018` 스크린샷 2개는 restore·checkout·stage·
> commit **하지 않았다** → working tree dirty·커밋된 PNG 0·픽셀 동일성 **NOT VERIFIED**. **다음 스펙은 지시 대기.**

> 스펙 026 보완 라운드 1 완료(로컬 검증, 2026-07-29, 기준 `449b027` + Codex 문서 커밋 `73e4e2b`, 코드 커밋 `25c421b`):
> Codex 지적 3건을 허용 파일(`useLocalImageBinding.ts`·`.test.ts`·`canvas-fixture.tsx`·`canvas-surface.spec.ts`)
> 안에서만 보완했다. **지적 1(실제 mount 검증 부재)**: fixture에서 hook을 소유한 컴포넌트를 분리해
> `fx-owner-off`/`fx-owner-on`으로 **owner 자체를 mount/unmount**하고, 실제 Chromium E2E **4건**을 추가했다 —
> ① StrictMode mount→cleanup→remount 후에도 live controller(선택→`ready`→사진 픽셀) ② owner unmount 시
> **outstanding object URL 0·중복 0**, 재마운트 시 상태 `idle`(새 controller)·**stale 사진 0** ③ in-flight 중
> unmount에서 outstanding 0으로 수렴·늦은 `onload`가 되살리지 못함 ④ 3회 cycle에서 **created 3 / revoked 3 /
> duplicates 0**. 전 케이스 console **error 0·warning 0**(테스트 측 `getImageData` 반복이 유발하는 Chromium
> `willReadFrequently` 권고만 사유를 남기고 제외). URL 계측은 **테스트 측 `addInitScript`** 로만 수행해 production
> 모듈에 관측 훅을 추가하지 않았다. **지적 2(cleanup 내 `setController`)**: controller를 소유 레코드
> `{controller, disposed}`로 감싸 **cleanup은 dispose+플래그만** 하고 교체 controller는 **다음 mount의 effect 본문**에서
> 발행하도록 수정 → **실제 unmount 경로에 state update 0**. **지적 3(문서)**: PNG 복원의 "Founder 승인"·
> "checkout/restore 승인" 주장과, surface-only unmount를 hook owner 검증으로 쓴 서술을 **철회·정정**했다.
> 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 755**(변동 없음 —
> 이번 보완은 실제 브라우저 검증) / build(mockup 217.69·gzip **68.40** / CSS 11.32·**3.16**, md5 `a9b44036…`
> **byte-identical**; admin 무변경) / **e2e 69 PASS**(65→69)·exit 0 자체 종료 20초 / check PASS /
> `git diff --check` clean / 포트 4183·4184 free·잔류 0 / OS temp `denn-e2e-*` 0 / 고객 dist **SHA-256 E2E 전후
> 동일·fixture 0** / 네트워크·live·deploy 0. **PNG**: Codex 독립 E2E가 재생성한 `spec-018` 스크린샷은
> **restore·checkout·stage·commit 모두 하지 않았다** — 그 때문에 working tree는 dirty하며 커밋된 PNG는 **0**이다.
> 픽셀 동일성은 **NOT VERIFIED**. **NOT TESTED 유지**: 실기기 4환경 blob URL·decode, 대용량 사진 메모리·성능,
> EXIF 회전, 선명도, 운영 이미지. ⚠️ 여전히 **로컬 이미지 owner 완료이며 상품 미리보기·Canvas 연결 완료가 아니다**
> (고객 화면 mount 0).

> 스펙 026 구현·자동검증 완료(로컬, 2026-07-29, 기준 HEAD `377d350`, 코드 커밋 `ae798d5`): 정본
> `docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`, 인계
> `docs/handoff/2026-07-29-spec-026-local-image-binding-handoff.md`.
> **공개 API**: `createLocalImageBindingController(options?) → {getSnapshot, subscribe, load, clear, dispose, bindings}`,
> 상태 `idle|loading|ready|failed`, code 4종(`INVALID_INPUT|DECODE_FAILED|INVALID_DIMENSIONS|DISPOSED`),
> 얇은 wrapper `useLocalImageBinding()`(useSyncExternalStore + unmount dispose + StrictMode 재마운트 시 새 controller).
> `bindings`는 스펙 021 `PreviewImageBindings`를 그대로 만족하고 **기존 surface·executor·adapter API는 무변경**.
> **decode**: `Blob` → private blob URL → `HTMLImageElement.onload/onerror`(data URL·`createImageBitmap` 미사용),
> URL은 closure 밖으로 나가지 않고 **decode 완료 후** revoke하며 drawable binding은 유지, 성공·실패·교체·clear·dispose
> **모든 경로에서 정확히 1회** revoke. **정보 경계**: 공개 snapshot은 합성 `user-image-<n>`·intrinsic size·고정
> `{scale:1,x:0,y:0}`뿐이고 blob URL·Blob·파일명·MIME·예외·drawable 0. **세대**: load마다 generation 증가 →
> 늦은 성공/실패가 snapshot·binding을 못 바꾸고, 새 load 시작 즉시 이전 binding 제거. dispose 후 load는 throw 없이
> `DISPOSED`. import·생성 시 browser API 접근 **0**(node unit이 `Image` 미정의 상태에서 증명), hostile port·
> throwing listener에서 **throw 0**. **실제 Chromium E2E 7건 추가**(합성 PNG를 `node:zlib`로 생성해 `setInputFiles`
> 주입 → 실제 decode → 클립 안 사진색/밖 body색, `input.value` 비움 후 동일 파일 재선택, 빠른 A→B 교체 최신만 draw,
> clear·unmount·remount stale 0·console error 0, `blob:`·파일명·`base64`가 text/ARIA/data/storage/location/console에 0,
> 320×568·desktop overflow 0·라벨 연결 input·axe 0, localhost 외 request 0). 고객 `/`에는 canvas·fixture 링크에 더해
> **`input[type=file]`도 0**. 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck /
> **unit 755**(716→755, 신규 39) / build(mockup 217.69·gzip **68.40** / CSS 11.32·**3.16** md5 `a9b44036…`
> **byte-identical**, admin 193.53·61.09 / 8.54·2.64 무변경) / **e2e 65 PASS**(58→65)·exit 0 자체 종료 23초 /
> check PASS / `git diff --check` clean / 포트 4183·4184 free·잔류 0 / OS temp `denn-e2e-*` 0 / 고객 dist
> **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0. **무변경**: `packages/**` 전체·`apps/admin`·고객
> `App.tsx`·`BrowseFlow`·`TemplateThumbnail`·catalog controller·**production Canvas surface 전체**·운영 HTML·
> Firebase 설정/Rules·POC·`package.json`·`pnpm-lock.yaml` = diff 0. **NOT TESTED**: 실기기 4환경 blob URL·decode,
> 대용량 사진 메모리·성능, EXIF 회전, 선명도, 운영 이미지. ⚠️ **재생성된 추적 PNG 2개**
> (`spec-018/browse-desktop-1280x800.png` 50,814→50,801 B, `browse-mobile-390x844.png` 49,683→49,455 B)는
> 런북 규칙에 따라 **복원·폐기하지 않고 그대로 두었고 커밋도 하지 않았다** — 복원 여부는 **Founder 결정**이며 픽셀
> 동일성은 **NOT VERIFIED**. ⚠️ **이 완료는 로컬 이미지 owner 완료이며 상품 미리보기·고객 Canvas 연결 완료가 아니다**
> (고객 화면 mount 0). 색·frame logical width·멀티 zone 공유·template art·pointer·print·Firebase·배포는 후속.

> Codex 조사 검수 및 범위 결정(2026-07-29): 사전 조사 commit `4a76864`은 허용 문서
> 3개만 변경했고 근거 라인을 확인했다. 색 팔레트·frame logical width·축소 UX·template art·
> 멀티 zone 공유 등 Founder 결정은 후속으로 유지한다. 이 결정들과 독립적인 로컬 사용자
> 이미지의 private blob URL→HTMLImageElement decode→메모리 binding→교체/cleanup만
> `docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`로 확정했다. 고객 production
> 화면 mount·실제 network·Firebase·배포는 제외한다.

> 스펙 026 사전 조사 완료(읽기 전용, 2026-07-29, 기준 HEAD `377d350`): 보고서
> `docs/codex-claude-handoff/reviews/2026-07-29-customer-preview-connection-investigation.md`(표 12종).
> **한 줄: 기하·어댑터·surface는 준비됐고, 색·사용자 사진·frame 논리 width·image binding 소유자·마운트 지점이 비어 있다.**
> **실측**: 고객 production 코드가 `PreviewCanvasSurface`·`buildCase/FrameProductPlan`·`projectCase/FramePreviewGeometry`를
> **한 번도 import 하지 않으며**(`App.tsx:1-8`, `BrowseFlow.tsx:6-31`) 선택 완료 화면은 텍스트 요약뿐이다(`BrowseFlow.tsx:312-351`).
> **부족분 6종** = case 색 / frame 색 선택 단계(카탈로그에 `frameColors`는 있으나 selector·projection 없음,
> `catalog/types.ts:57`·`catalog/read.ts:83`) / frame `logicalWidth`(레거시 `prevMaxW‖500`은 운영자 UI 설정이고 스펙 025가 기본값 금지) /
> `UserImageState` 3필드 / `imageBindings` 소유자(`canvas/types.ts:43-45` 포트만 존재) / 마운트 지점.
> **레거시 생명주기 확정**: 파일·드롭 → `FileReader.readAsDataURL` → `new Image()` → `onload`에서 `caseImgs[i]`/`caseImg`/`frameImg`에
> **HTMLImageElement** 저장 + transform `{scale:1,x:0,y:0}` 초기화(`:1283`,`:1374-1391`), 리셋은 `input.value=''` 포함(`:1408`),
> **revoke·abort·캐시 해제 없음**. `createObjectURL`은 다운로드 전용(`:11256`), `createImageBitmap`·`.decode()`·`OffscreenCanvas`는 **0회**.
> cover 수식은 스펙 019와 동일하나 레거시는 클램프 값을 입력 객체에 되쓴다(`:1551`). **CORS**: 사용자 사진은 same-origin이라 요구 없음,
> 템플릿 아트를 Canvas에 올리면 필수이며 레거시의 "crossOrigin 없이 재시도"(`:12138`)는 tainted canvas 위험이라 복제 금지.
> **색**: case는 카탈로그에 없고 전역 초기값 `#1A1A1A`(`:977`)·HTML 첫 스와치 선택·`transparent` 패턴 분기(`:1686`),
> frame은 `FC[0]` 자동 선택(`:1042`,`:1046`)+`grain` 난수 텍스처(`:1765`) → 스펙 025 제약과 충돌.
> **크기**: case `modelLogicalSize`는 레거시 backing과 동일해 직결 가능하나, 액자는 논리 width가 없고 레거시는 CSS `transform: scale` 래퍼를 써
> 스펙 022 불변식(`surface.ts:26-27`)과 충돌할 수 있다(첫 draw의 `getBoundingClientRect` 폴백이 스케일 값을 반환, `usePreviewCanvasSurface.ts:36-39`).
> **`FOUNDER_DECISION_REQUIRED` 9건**(case 팔레트 정본·`transparent`·`grain`·색 미선택 UX·frame `logicalWidth` 정책·축소 vs 스크롤·
> 템플릿 아트 포함 여부·이미지 표현 방식(data/blob/ImageBitmap)·멀티 zone 사진 공유 허용 여부)과 **근거만으로 확정 가능한 9건**을 분리했다.
> 스펙 026 최소 범위·허용 파일 후보·unit/E2E 검증·제외 범위도 제안했다(transform은 고정값, pointer/회전/텍스트/인쇄/주문 제외).
> **NOT VERIFIED**: 운영 `frameColors` 분포·`prevMaxW` 실제값·멀티 zone 비중·`?space=` 페이로드. **NOT TESTED**: 실제 이미지 load/decode·
> 브라우저 파일 선택·CORS-clean·실기기·선명도. **코드·설정·테스트·PNG·lockfile 무변경, 실제 GET·live·deploy 0.**
> 이 조사는 스펙 026을 작성하지 않으며 다음 구현은 착수하지 않는다.

> 다음 전이(2026-07-29): Founder가 보호형 루프 계속 진행을 승인했다. Claude Code는
> `Automation/NEXT_CLAUDE_PROMPT.md`의 읽기 전용 사전 조사만 수행한다. 앱·패키지·테스트·
> 설정·PNG·실제 네트워크는 변경하지 않는다. 조사 push 후 Codex가 근거를 검수하고 구현
> 스펙 026을 별도로 확정한다.

> Codex 최종 승인(2026-07-29): 스펙 025 보완 라운드 1의 case builder 전체 1회
> normalized snapshot, `zoneImages.get` property 단일 읽기, `sourceIndex` non-negative integer
> 계약과 drift 테스트를 독립 검증했다. frozen PASS / format·lint·typecheck PASS /
> **unit 716** / build mockup JS·CSS gzip **68.40·3.16 kB**, admin **61.09·2.64 kB** /
> **E2E 58/58 PASS·exit 0** / check PASS / 포트·temp clean. 검증 중 재생성된 추적 PNG
> 1개는 Founder의 정확한 파일 승인 후 HEAD 승인본으로 복원했다. 실제 사용자 이미지
> load·binding·CORS-clean·운영 이미지·실기기·선명도는 **NOT TESTED**다. 이 승인은 순수
> adapter 계약의 완료이며 상품 미리보기·고객 Canvas 연결 완료가 아니다. 다음 기능은
> 시작하지 않고 `FOUNDER_DECISION_REQUIRED`에서 스펙 026 결정을 기다린다.

> 스펙 025 보완 라운드 1 완료(로컬 검증, 2026-07-29, 기준 HEAD `bfcf8d7`): Codex 1차 재검증 차단 2건을 `AUTO_REVIEW_LOOP.md`에 따라 자동 구현·검증·분리 커밋·fast-forward push했다. **보완 ①(`packages/render/src/plan/build.ts`)**: `buildCase`가 검증한 값을 다시 읽던 경로를 제거 — 이전 read count `bodyColor` 2·`zones` 2·`zone.id` 4·`zone.imageRef` 2·`zone.order` 4·`zone.guide` 2·rect `units` 3/`x,y,width,height` 각 2·stroke `color` 2/`width` 3·`input.kind` 3·frame `innerBorder` 2 → **전부 1회**. 신규 `readCaseZoneOnce`가 zone 하나의 사용 필드를 정확히 1회 읽어 plain normalized snapshot(`{id,imageRef,rect,image,transform,guide?,index,key}`)을 만들고 **검증·정렬·command 생성은 snapshot만** 읽는다(caller 재조회 0). **읽기·검증 순서 무변경** → 오류 code·우선순위·layer ID·정렬·guide 순서·frame 계약·executor 어휘 그대로, 호환 fallback·deprecated overload 0, hostile getter·Proxy trap·revoked Proxy **throw 0** 유지 → **검증되지 않은 두 번째 getter 값이 성공 plan에 들어갈 수 없다**. **보완 ②(`apps/mockup/src/canvas/productPlan.ts`)**: `zoneImages.get`을 `typeof` 검사와 `bind`에서 두 번 읽던 것을 **1회 읽기**로 바꿔 **검증한 그 함수만** bind·호출 — `get` read count **1**, lookup 호출 **zone당 1회**(추가 map entry 조회 0), `get` 접근/호출 예외 모두 `INVALID_ADAPTER_INPUT`(throw 0), 실제 `Map`/`ReadonlyMap` 호환 유지. **추가 안전**: geometry zone `sourceIndex`는 **0-based non-negative integer만**(음수·소수·NaN·±Infinity·비숫자·누락 → `INVALID_ADAPTER_INPUT`, 정상 index는 비연속 `7`까지 유지, 실패 payload는 안전한 숫자 index뿐), geometry `percentRect` 4필드도 각 1회 읽기. **회귀 고정**: 신규 unit **44건**(render 26·adapter 18)이 read count·drift·throw-on-second-read·`get` 단일 읽기·`sourceIndex`를 명시 단언하며, **수정 전 소스에서는 그중 20건이 실패**하고 수정 후 전부 통과한다. 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 716**(672→716) / build(mockup 217.69·gzip **68.40** / CSS 11.32·**3.16** `index-D9dnc5BM.css` 동일, admin 193.53·61.09 / 8.54·2.64 무변경) / **e2e 58 PASS**(신규 E2E 0)·reporter 요약·exit 0 자체 종료 19초 / check PASS / `git diff --check` clean / 포트 4183·4184 free·저장소 소속 잔류 0 / **OS temp `denn-e2e-*` 잔여 0** / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 스펙018 PNG 복원·미커밋 / 네트워크·live·deploy 0. **무변경**: `packages/shared|firebase|ui|spaces`·`apps/admin`·고객 `App.tsx`·`BrowseFlow`·catalog controller·**production Canvas surface 전체**·frame builder 동작·executor·운영 HTML·Firebase 설정/Rules·POC·PNG·`package.json`·`pnpm-lock.yaml` = diff 0 — **변경 파일 4개뿐**. **NOT TESTED 유지**: 실제 사용자 이미지 load·binding·CORS-clean·운영 이미지·실기기. ⚠️ 이 라운드도 **순수 adapter 보완**이며 상품 미리보기·고객 Canvas 연결 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지**. 코드 커밋 `6682e04`/문서 분리, 핸드오프 `docs/2026-07-28-spec-025-product-plan-adapter-handoff.md` §9, 스펙 025 하단에 보완 DONE append(최초 구현 기록·과거 수치 무수정). **다음 기능 착수 금지 — Codex 재검증 대기.**

> Codex 스펙 025 1차 재검증(2026-07-28): 전체 게이트(frozen·format·lint·typecheck·unit **672**·build·E2E **58**·check)는 통과했으나 **수정 후 재검증**. 차단 2건 = ① case render-plan builder가 `bodyColor`·`zones`와 zone의 `id/imageRef/order/guide`를 검증 후 다시 읽어 hostile/drifting getter의 두 번째 값이 plan에 들어갈 수 있음 ② product adapter가 `zoneImages.get` property를 검사와 bind에서 두 번 읽음. 모든 해당 값을 정확히 1회 읽은 plain normalized snapshot만 사용하고 getter-drift·`get` drift 테스트를 추가해야 한다. 이 보완은 현재 스펙 범위 안이므로 `AUTO_REVIEW_LOOP.md`에 따라 자동 구현·검증·분리 커밋·fast-forward push 후 Codex 재검수한다. 신규 API 의미·의존성·고객 UI/Canvas·Firebase·배포가 필요하면 STOP한다.

> 스펙 025 구현·자동검증 완료(로컬, 2026-07-28): 3계층 분리 — shared=중립 geometry / **apps/mockup 순수 어댑터** / render=카탈로그 무관 검증. **계약 정정 ①**: `CaseImageZone`이 **필수 `image`·`transform`을 소유**하고 `CasePlanInput.image`·`defaultTransform`은 **제거**(호환 fallback·deprecated overload·`zone.image ?? input.image` 0, 기존 caller 전부 명시 수정: plan/executor 테스트 fixture). zone 정렬·layer id·command 순서·guide·오류 code 집합·frame 계약·executor 어휘 무변경(누락 시 `image`→`INVALID_ZONE`, `transform`→`INVALID_TRANSFORM`). **핵심 검증=zone별 독립 intrinsic**: 같은 크기 zone에 `100×100`(scale 1)/`400×100`(scale 2)를 주면 clip은 같고 draw rect는 **310×310 vs 2480×620**으로 갈림. **계약 정정 ②**: `FramePreviewGeometry.contentInsetPx: 0|8` 추가 — `type==="uploaded"` && design source ⇒ **0**, 그 밖 지원 variant(builtin `full`, source 없는 uploaded) ⇒ **8 logical px**; 존재 판정은 스펙 018 체인을 내부 predicate `hasCatalogTemplateDesignSource`(공개 surface 미포함, `generatedDetailPreview` 게이트+5필드 순서, non-empty string만)로 재사용하고 **반환은 숫자뿐**(source 문자열·필드명·URL 종류·token·중간 boolean 0, `SECRETMARKER`/`data:`/`base64`/필드명 부재 테스트). 레거시 `P = uploadedTransparentTpl ? 0 : 8`는 **0 분기 도달 불가**라 복제하지 않음. **어댑터**(framework-free 순수 동기): `buildCaseProductPlan({geometry,bodyColor,zoneImages})`·`buildFrameProductPlan({geometry,frameColor,logicalWidth,userImage})` → `{ok:true,plan}|{ok:false,code,zoneSourceIndex?}`(code 9종), 성공 시 **중간 입력이 아니라 `buildPreviewRenderPlan` 통과 `PreviewRenderPlan`** 반환, `CatalogDocumentV1`·raw template·drawable·`imageBindings`·URL **미수신**, zone key=`case-zone-<sourceIndex>`·**추가 map entry 무시**. **frame 실계산**: `W=400,aspect=1.4` → `H=560`, `pct=5` → `B=20`, `frameRect={0,0,400,560}`·`matRect={20,20,360,520}`·`imageZone(P=8)={28,28,344,504}`·`imageZone(P=0)=matRect`, `pct=0.01`→`round(0.04)=0`→**1 clamp**; epsilon·clamp·abs·추가 반올림·자동 이동 0, `innerBorder` 미공급. **안전**: 색은 정확한 `#RRGGBB`만(uppercase canonical, missing≠invalid, 첫 색·웜 토프·`#1A1A1A`·기본 width `500` **전부 없음**), zone 이미지 누락 시 **전체 실패**(+`zoneSourceIndex`, 조용한 skip·부분 plan·shape 근사 0), `imageRef`는 스펙 020 문법 그대로(URL 형태 거부), 모든 값 **1회 읽기 plain snapshot**(getter drift 시 첫 스냅샷 사용)·`map.get` throw도 `INVALID_ADAPTER_INPUT`, hostile getter·Proxy trap·revoked Proxy·null/primitive/array에 **throw 0**, 유한 overflow는 성공 0, 실패 payload는 **안전 code+선택적 index뿐**(plan code·예외·색 원문·이름·ID·imageRef·URL·token 0). 오류 우선순위=입력 snapshot→appearance→logical width→이미지 상태→rect→builder. **디렉터리 편차 보고**: 스펙 제안 `src/plan/`은 Tailwind source scan이 **고객 CSS에 `.transform`·`.uppercase`(+0.69 kB)** 를 유입시킴을 실측(필드명 `transform` 회피 불가)했고 `packages/ui` 변경이 금지돼, 이미 scan 제외된 framework-free **`apps/mockup/src/canvas/`** 에 배치(Canvas 의존 코드 0) → 고객 번들 **byte-identical**. 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 672**(604→672, 어댑터 57·shared 10 등) / build(mockup 217.69·gzip **68.40** / CSS 11.32·**3.16**, md5 `a9b44036…` **byte-identical**, admin 193.53·61.09 / 8.54·2.64 무변경) / **e2e 58 PASS**(신규 E2E 0)·exit 0 자체 종료 19초 / check PASS / `git diff --check` clean / 포트 4183·4184 free·잔류 0·**OS temp `denn-e2e-*` 잔여 0** / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 스펙018 PNG 복원·미커밋. **무변경**: 고객 `App.tsx`·`BrowseFlow`·catalog controller·**production Canvas surface 전체**·`packages/firebase|ui|spaces`·admin·운영 HTML·Firebase 설정/Rules·POC·PNG·`package.json`·`pnpm-lock.yaml`(diff 0), 네트워크·live·deploy 0. **NOT TESTED: 실제 사용자 이미지 load·binding·CORS-clean·운영 이미지·실기기·선명도.** ⚠️ **이 완료는 순수 adapter 완료이며 상품 미리보기·Canvas 연결 완료가 아니다** — 고객 화면 연결·색 선택 UI·파일 선택/업로드·케이스 `modelLogicalSize`↔CSS logical size 정책은 후속. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지. 코드 커밋 `4a23f22`/문서 분리, 핸드오프 `docs/2026-07-28-spec-025-product-plan-adapter-handoff.md`, DONE는 스펙 하단, 스펙 020·023 문서에 현재 계약 정정 append(과거 승인 기록·수치 보존).

> Codex 스펙 025 확정(2026-07-28): `docs/rebuild/specs/025-product-render-plan-adapter.md`. 사전 조사 Q1~Q4를 확정했다. **shared projection이 raw source 문자열 없이 `FramePreviewGeometry.contentInsetPx: 0|8`을 판정**(uploaded+design source=0, builtin full/source 없는 uploaded=8), frame logical width는 호출자 필수 양의 정수이며 `H=round(W×aspect)`, `B=max(1,round(W×border%/100))`; case body/frame 색은 명시적 `#RRGGBB`만 받고 첫 색·웜 토프·`500` 기본값을 금지; case zone 이미지 하나라도 없으면 전체 실패한다. 추가 확인된 계약 결함도 함께 정정한다: 기존 `CasePlanInput.image` 공통 크기는 레거시 zone별 독립 이미지와 충돌하므로 **각 `CaseImageZone`이 필수 `image`·`transform`을 소유**하고 공통 image/defaultTransform fallback은 제거한다. `apps/mockup`에 framework-free `buildCaseProductPlan`/`buildFrameProductPlan`을 구현해 geometry+명시적 외형+사용자 이미지 상태를 `buildPreviewRenderPlan` 통과 plan으로 만든다. 고객 React UI·실제 Canvas 연결·파일 load/binding/CORS·Firebase·운영본·배포는 제외하며, 완료는 상품 미리보기 완성이 아니다. 실제 운영 variant·이미지·실기기는 NOT TESTED, `hosting.public:"."`은 격리 전 배포 금지 유지.

> 스펙 025 사전 조사 완료(읽기 전용, 2026-07-28): 스펙 023 geometry + 호출자 색상·사용자 이미지 → 스펙 020/024 `CasePlanInput`/`FramePlanInput` 결합 어댑터 계약 근거를 파일·라인으로 확정. 보고서 `docs/codex-claude-handoff/reviews/2026-07-28-product-render-plan-adapter-investigation.md`(표 13종). **핵심 확정**: 프레임 사진 inset은 두 값뿐 — **uploaded+design source ⇒ `imageZone == matRect`(inset 0)**, **그 밖 지원 variant(builtin `full`, source 없는 uploaded) ⇒ mat에서 사방 8 logical px**; 레거시 `P = uploadedTransparentTpl ? 0 : 8`(`:3130`)은 **도달 불가 분기**(uploaded+source는 `:3133`에서 `return`)이므로 **`P`가 쓰일 때 값은 항상 8**이고 inset 0은 uploaded 경로가 mat rect(`IX,IY,IW,IH`)를 그대로 쓰기 때문. **`P=8`은 비율이 아니라 고정 logical px**(`:3130`). 프레임 논리크기 레거시 공식 = `customPrev=prevMaxW‖500`·`maxW=max(260,customPrev)`·`maxH=max(320,round(customPrev*1.04))`·`ph=pw*aspect`·`if(ph>maxH){ph=maxH;pw=ph/aspect}`·`round` (`:3119`)이며 **canvas CSS 크기 = 논리 크기**로 설정되어 스펙 022 불변식과 이미 일치. `B=max(1,round(W*pct/100))`·`matRect={B,B,W-2B,H-2B}`(`:3120-3122`). **케이스 이미지 상태는 zone별 독립** — `img=caseImgs[i]‖caseImg`(`:1662`), `T=caseImgTs[i]‖(i===0?caseImgT:{scale:1,x:0,y:0})`(`:1665`), 업로드 시 transform 초기화(`:1380-1382`), **이미지 없는 zone은 레거시가 조용히 skip**(`:1663`)하나 스펙 020은 zone별 `imageRef` 필수 → **명시적 실패 권고**. `realTemplateSrc=templateSourceForDesign`(`:3025`,`:3029`) 체인은 스펙 018과 동일하며, **inset 판정에는 문자열이 아니라 존재 여부 boolean만 필요**(민감정보 경계 유지). **권고 계층**: shared=중립 geometry(+variant boolean 후보) / **apps/mockup 순수 어댑터**=geometry+명시적 외형+이미지 상태+논리 width → plan 입력 → `buildPreviewRenderPlan` / render=카탈로그 무관 검증. 어댑터는 **drawable·binding map을 받지 않는다**(surface가 `plan`/`imageBindings` 별개 prop). 공개 API 초안=`buildCaseProductPlan`/`buildFrameProductPlan`(kind별 분리 권고). **차단 QUESTIONS**: Q1 `contentInsetPx` 판정 위치(projection 확장 vs 어댑터 입력) · Q2 논리 width 소유·반올림 규칙(**`500` 기본값 금지**) · Q3 색 공급 방식(hex 입력 vs `frameColorId` lookup, 첫 색 자동선택 금지) · Q4 zone 이미지 누락 정책. NOT VERIFIED: `designCanvasTemplate` 중복 정의(`:3026` vs `:7120-7123`, 의미 상이)·운영 분포·`prevMaxW` 실제값. **구현·코드·설정·테스트 무변경, 실제 GET·live·deploy 0.**

> Codex 최종 승인(2026-07-28): 스펙 024 = **승인 가능**(기준 HEAD `a21b5c2`). 최종 게이트 = frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 604**(568→604, 신규 36) / build(mockup JS gzip **68.40KB**·CSS **3.16**(byte-identical) · admin **61.09KB**·2.64 무변경) / **e2e 58 PASS**(57→58)·reporter 요약·exit 0 자체 종료 / 포트 4183·4184 free·잔류 0·**OS temp `denn-e2e-*` 잔여 0** / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / check PASS / `git diff --check` clean. **확정 계약**: `FramePlanInput`이 `frameRect`·**`matRect`(필수)**·`imageZone`을 서로 다른 영역으로 표현, command rect = body→`frameRect` / **mat→`matRect`** / image→clip·cover `imageZone` / 선택적 inner-border→`imageZone`; **`logicalCanvas ⊇ frameRect ⊇ matRect ⊇ imageZone` fail-closed**(경계 공유 허용·tolerance/clamp/자동 보정 0·far-edge overflow → `NON_FINITE_RESULT` 우선); rect/size/transform **1회 읽기 snapshot**으로 getter drift 차단; hostile getter·Proxy trap·revoked Proxy는 **throw 없이 `INVALID_ZONE`**(error code 무확장); 실패 payload `{ok,code}`뿐; executor 어휘·순서·**케이스 plan 계약 무변경**; 스펙 020 문서에 현재 계약 정정 append(과거 승인 기록·수치 보존). **실제 Chromium 픽셀**로 frame band·mat 영역·사진 3구역 구분·clip 밖 번짐 0·console 0·axe 0 확인, `getImageData`는 테스트 측 전용. **무변경**: shared/firebase/ui/spaces·admin·고객 UI·**production Canvas surface 전체**·운영 HTML·Firebase·Rules·POC·PNG(허용 변경은 테스트 harness와 E2E test뿐). **유지되는 사실: ①실제 상품 adapter 미구현**(표현 능력 정정이며 상품 Canvas 연결 완료 아님) **②builtin `full` `P=8` / uploaded transparent `P=0` 판정 = 다음 adapter 스펙의 필수 결정** **③운영 이미지·CORS-clean·실기기 NOT TESTED** **④`hosting.public:"."` → Hosting 격리 전 배포 금지.** **다음 스펙은 Codex 지시 대기.**

> 스펙 024 구현·자동검증 완료(로컬, 2026-07-28): `FramePlanInput`에 **필수 `matRect`** 추가(`matRect ?? imageZone` fallback 0, 기존 fixture/test caller 전부 명시 수정). command rect = `frame:body`=`frameRect` · **`frame:mat`=`matRect`**(이전 `imageZone`) · `frame:user-image`=clip·cover `imageZone` · 선택적 `frame:inner-border`=`imageZone`(레거시 4-band와 동등 아님, 상품 어댑터는 공급 금지). executor 어휘·순서·layer id·**케이스 plan 계약 무변경**. **containment fail-closed**: `logicalCanvas ⊇ frameRect ⊇ matRect ⊇ imageZone`, 경계 공유 허용·`frameRect<canvas` 허용, **far-edge overflow → `NON_FINITE_RESULT`(containment보다 먼저)**, 유한하지만 바깥 → `INVALID_ZONE`, **epsilon·clamp·abs·round·자동 축소/이동 0**. **getter drift 차단**: rect/size/transform을 **1회만 읽어 plain snapshot**으로 복사하고 command 생성은 snapshot만 사용(caller 재읽기 0); reader와 public 진입점에 예외 경계를 둬 **hostile getter·Proxy get/has trap·revoked Proxy가 throw 없이 `INVALID_ZONE`** — ⚠️ **이전 프레임 경로는 실제로 throw했고 이번에 발견·수정**(error code 집합 무확장, 예외 객체 미저장). 실패 payload는 `{ok,code}`뿐(rect 값·imageRef·URL·token 0). **실제 Chromium 픽셀 신규 E2E 1건**: `frameRect 0,0,300,200 ⊃ matRect 20,20,260,160 ⊃ imageZone 60,50,180,100`(frame `#663300`/mat `#FFFF00`/drawable `#00FF00`) → (5,5)·(5,100)·(295,195)=frame / (30,30)·(270,170)·(55,100)·(150,45)=mat(사진 zone 바로 밖) / (150,100)·(62,52)·(238,148)=drawable, clip 밖 번짐 0·console error 0·axe 0·고정 sleep 0. **harness는 builder를 import하지 않는다** — Tailwind source scan이 harness 단어를 utility 후보로 읽어 builder import가 고객 CSS에 **+2.3 kB**(`.transform`·`.ring`)를 유입시켰고(실측), `packages/ui` 변경이 금지돼 **frame plan을 literal로 작성 + builder↔literal 동일성 unit test**로 고정 → 고객 번들 **byte-identical**. 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 604**(568→604, 신규 36) / build(mockup 217.69·gzip **68.40** / CSS 11.32·**3.16** = byte-identical, admin 무변경) / **e2e 58 PASS**(57→58)·exit 0 자체 종료 / check PASS / `git diff --check` clean / 포트 free·잔류 0·**OS temp staging 잔여 0**·고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 스펙018 PNG 복원·미커밋. **무변경**: `packages/shared|firebase|ui|spaces`·admin·고객 UI·**production Canvas surface 전체**·운영 HTML·Firebase·Rules·POC·PNG(diff 0) — 허용된 앱 변경은 테스트 harness와 E2E test뿐. **NOT TESTED: 실제 상품 adapter·운영 이미지·CORS-clean·실기기.** **후속 필수 결정: builtin `full`의 `P=8` inset과 uploaded transparent `P=0` 판정**(어댑터가 `matRect`=`imageZone`으로 넘기면 타입은 통과하나 레거시와 시각적으로 다름). 스펙 020 문서 하단에 현재 계약 정정 append(과거 승인 기록·수치 보존). 핸드오프 `docs/2026-07-28-spec-024-frame-mat-image-zone-handoff.md`, DONE는 스펙 하단.

> Codex 스펙 024 확정(2026-07-28): 현재 `FramePlanInput.imageZone` 하나가 mat 채움과 사진 clip을 함께 담당해 레거시의 mat 영역 `(IX,IY,IW,IH)`과 builtin `full` 사진 영역 `P=8` inset을 동시에 표현할 수 없는 계약 결함을 먼저 정정한다. 필수 `matRect`를 추가하고 command를 body=`frameRect`, mat=`matRect`, image clip=`imageZone`으로 분리한다. logical canvas→frame→mat→image exact containment·overflow·hostile getter 안전을 unit으로 고정하고, OS-temp Canvas fixture의 실제 Chromium 픽셀로 frame band·mat ring·image 영역을 구분한다. 실제 geometry→plan 앱 어댑터·P=8/P=0 선택·색상 UI·이미지 load/CORS·고객 Canvas 연결은 후속이며, shared/Firebase/운영본·배포는 변경하지 않는다.

> Codex 최종 승인(2026-07-28): 스펙 023 = **승인 가능**(기준 HEAD `d1e2327`). 최종 게이트 = frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 568/568**(472→568, preview 96) / build(mockup JS gzip **68.40KB**·CSS 3.16 / admin **61.09KB**·2.64 = 스펙 022와 동일) / **e2e 57/57 PASS**(신규 E2E 0)·reporter 요약·exit 0 자체 종료 / 포트 4183·4184 free·잔류 0·**OS temp `denn-e2e-*` 잔여 0** / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / check PASS / `git diff --check` clean. **확정 계약**: `@denn/shared` 순수 render 비의존 geometry projection(`projectCasePreviewGeometry`→`{modelLogicalSize, zones[{id,sourceIndex,percentRect}]}`, `projectFramePreviewGeometry`→`{aspect,borderPercentOfWidth,matColor}`, 오류 8종·diagnostic 5종은 code+collection+sourceIndex만), zone 공급원 우선순위와 **명시적 빈 배열의 fallthrough 없는 실패**, 원본 index 기반 `case-zone-<i>`, 액자 **단일 full-mat 사각형만 지원**, mat 색 별칭·canonical 대문자·`#FFFFFF` fallback, hostile 입력 throw 0·원문 미echo·결정성·입력 비변형. **QUESTIONS 결정(Codex)**: ①퍼센트 **정확 비교 유지**(tolerance 미도입) ②zone `type` 빈 문자열의 **사각 취급 유지** ③`frameThickness` `null`은 **invalid로 실패 유지** ④실패 Result에 **`sourceIndex` 미추가** ⑤builtin `full`의 **`P=8` inset은 후속 plan 조립 스펙의 필수 결정 항목으로 유지**. **NOT TESTED(유지): 실제 published catalog 변형 분포·운영 데이터·Canvas 연결·실제 픽셀·CORS-clean·실기기**(합성 fixture만). **미착수(유지): 색 선택·사용자 이미지·CSS logical size·`PreviewRenderPlan` 조립·표현 불가 shape의 render 어휘 확장·pointer·회전·text/clock·print/export·저장·주문·Firebase·배포** — **projection 완료 ≠ 상품 미리보기 완료**. ⚠️ **후속 필수: `hosting.public:"."` 저장소 전체 노출 → Hosting 격리 전 배포 금지.** **다음 스펙은 Codex 지시 대기.**

> 스펙 023 구현·자동검증 완료(로컬, 2026-07-28): `packages/shared/src/catalog/preview/`에 **순수 geometry projection**. 공개 API=`projectCasePreviewGeometry(document,{modelId,templateId})`→`{modelLogicalSize,zones[{id,sourceIndex,percentRect}]}` / `projectFramePreviewGeometry(document,{frameSizeId,templateId})`→`{aspect,borderPercentOfWidth,matColor}`, 둘 다 `{ok:true,value,diagnostics}|{ok:false,code,diagnostics}`. **error 8종**(`INVALID_INPUT|INVALID_COLLECTION|ITEM_NOT_FOUND|AMBIGUOUS_ITEM|INVALID_ITEM|INVALID_GEOMETRY|UNSUPPORTED_ZONE_SHAPE|UNSUPPORTED_FRAME_TEMPLATE`)·**diagnostic 5종**(`LEGACY_ZONES_ALIAS|PHOTO_SLOT_FALLBACK|INVALID_MAT_COLOR|INNER_BORDER_OMITTED|ALPHA_OUTLINE_OMITTED`, code+collection+sourceIndex만). **Q1~Q14 반영**: 케이스/액자 색은 API에 없음(첫 색 자동 선택 0)·케이스는 모델 w/h만·액자는 aspect만·zone id는 **원본 index `case-zone-<i>`**·원형/라운드·multi-zone은 **근사 없이 실패**·inner border/alpha outline은 output 제외+diagnostic·thickness는 size별→top-level까지만이고 **`5.5` 하드코딩 없음**(둘 다 없으면 실패)·`prevMaxW` 미사용. **케이스**: zone 공급원 `photoZones`→`zones`(alias diag)→단일 `photoSlot`(diag), **명시적 빈 배열은 fallthrough 없이 실패**, zone은 유한 x/y·양수 w/h·**정확한 0..100 경계**(clamp 0)·`type` 부재/`""`/`"rect"`만 사각. **액자**: aspect 유한 양수 필수(레거시 `‖1` 미복제), template은 **단일 full-mat 사각형만**(uploaded zone 없음/단일 `0,0,100,100`, builtin `full`; `duo·trio·text_only·top_text`·미지 id/type → 실패, `circle` → shape 실패), mat 색은 플래그 3별칭+색 4별칭+**정확한 `#RRGGBB`**·canonical 대문자·그 외 `#FFFFFF`(원문 미보존+diag). **안전**: hostile getter·Proxy trap·revoked Proxy·malformed document/selection에 **throw 0**, ID 정확 일치·blank 거부·**원문 미echo**, JSON-safe·결정적·deep-freeze 입력 비변형, 성공·실패 직렬화에 이름/ID/categoryId/URL/base64/token/path **0**. 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 568**(472→568, 신규 96) / build 수치 전부 동일 / **e2e 57 PASS**(신규 E2E 0)·exit 0·포트 free·잔류 0·**OS temp staging 잔여 0**·고객 dist **SHA-256 E2E 전후 동일·fixture 0** / check PASS / `git diff --check` clean / 스펙018 PNG 복원·미커밋. **무변경**: `apps/**`·`packages/render|firebase|ui|spaces`·운영 HTML·Firebase 설정/Rules·POC·PNG(diff 0), 네트워크·live·deploy 0. **NOT TESTED: 실제 published catalog 변형 분포·운영 데이터·Canvas 연결·실제 픽셀·CORS-clean·실기기.** **QUESTIONS 5건 보고(구현 안 함)**: 퍼센트 경계 부동소수 tolerance·builtin `full`의 `P=8` inset·zone `type` `""` 취급·`frameThickness` `null` 판정·실패 Result의 index 노출. **projection 완료 ≠ 상품 미리보기 완료**(색·이미지·CSS logical size·plan 조립은 후속). 핸드오프 `docs/2026-07-28-spec-023-catalog-preview-projection-handoff.md`, DONE는 스펙 하단.

> Codex 스펙 023 확정(2026-07-28): `@denn/shared`에 **render 비의존 순수 카탈로그 preview geometry projection**을 구현한다. 케이스는 `models[].w/h`+지원 가능한 사각 `photoZones|zones|photoSlot`, 액자는 `aspect`+size별→top-level thickness+mat 색만 반환한다. zone ID는 원본 0-based source index 기반 `case-zone-<index>`로 결정적으로 합성한다. 케이스 body color·액자 색·사용자 이미지·CSS logical size·plan 조립은 후속 호출자 책임이며 기본값으로 만들지 않는다. circle/cornerR·unknown shape·frame multi-zone은 사각/단일 근사 없이 실패, inner-border 4-band·alpha outline은 이번 output에서 제외한다. 레거시 하드 fallback `5.5`와 aspect `1`은 라이브러리 기본값으로 채택하지 않는다. 앱·Canvas·render·Firebase·실제 네트워크·배포는 변경하지 않는다.

> 스펙 023 사전 조사 완료(읽기 전용, 2026-07-28): 선택 상태(ID)+`CatalogDocumentV1` → 스펙 020 `PreviewRenderPlan` 입력 투영의 레거시 계약을 파일·라인으로 확정. 보고서 `docs/codex-claude-handoff/reviews/2026-07-28-catalog-render-plan-projection-investigation.md`(표 11종). **한 줄: 기하는 카탈로그에서 나오고 색·사용자 이미지는 카탈로그에 없다.** CONFIRMED = 케이스 `models[].w/h`(=레거시 canvas backing), `photoZones`={x,y,w,h,type,cornerR,label} **모델 w/h 대비 퍼센트**(`id`·`order` 없음), `photoSlot` 단일 fallback·`zones`↔`photoZones` 별칭, 액자 `aspect`(없으면 1)·thickness `sz.frameThickness→admin.frameThickness→5.5`·`IX=B,IY=B,IW=W-2B,IH=H-2B`·body=`frameColors[].fill`(미선택 시 레거시는 `FC[0]`)·mat=`frameTemplateBg`(플래그 3별칭·색 4별칭·`#RRGGBB` 검증, 실패 시 `#fff`)·inner border=`whiteBorderColor‖#fff`+min(IW,IH) 대비 %. **차단 QUESTIONS**: Q1 케이스 bodyColor는 카탈로그에 없음(레거시 HTML 팔레트·기본 `#1A1A1A`), Q2 액자 색 선택 단계 부재, Q3 `logicalCanvas` 정의(model px vs 스펙 022 CSS 불변식), Q4 zone `id` 합성 규칙(스펙 020 필수인데 카탈로그에 없음). NOT DECIDED = 원형/라운드 zone(사각 근사 금지)·inner border 4-band vs stroke·alpha 색(`rgba(0,0,0,.06)`)·액자 multi-zone·thickness fallback·template 미선택 경로. NOT VERIFIED = 케이스 zone 검증 계층 부재(caseTemplates opaque)·사이즈별 frameThickness·`photoSlot`만 있는 템플릿 분포·`uiCustom.prevMaxW` 출처. **권고 계층 = `@denn/shared` 순수 projection(render 비의존 중립 geometry 반환) + `apps/mockup` 얇은 어댑터**(shared→render 의존 금지 유지), 공개 API 초안 포함. 사용자 이미지(`imageRef`/intrinsic/transform)는 **호출자 입력**이며 `imageRef`는 URL·base64·token이 아닌 메모리 binding 키 유지, 템플릿 이미지와 역할 혼합 금지. **구현·코드·설정·테스트 무변경, 실제 GET·live·deploy 0.**

> Codex 최종 승인(2026-07-28): 스펙 022 = **승인 가능**(기준 HEAD `b8020c0`). 독립 재검증 = `check` PASS / **unit 472/472** / build PASS(mockup JS gzip **68.40KB**·admin **61.09KB**) / **E2E 57/57 PASS** + reporter summary + 명령 exit 0 / staging = **OS temp 아래 실행별 `denn-e2e-*` 절대경로** / 고객 mockup·admin dist **E2E 전후 SHA-256 목록 동일** / 신규 temp staging 잔여 **0** / 포트 4183·4184 free / PNG 복원 후 clean / HEAD=origin·**0/0**. **승인된 핵심**: ①`PreviewCanvasSurface`+framework-free surface engine ②**preview 전용 DPR cap=2**(room 4·print DPI·관리자 전파 0) ③**CSS size↔`plan.logicalCanvas` 축당 0.5px 불변식**(위반 시 executor 미실행·안전 실패) ④**조건부 backing 대입→`setTransform(dpr)`→executor** 순서 고정 ⑤**React 19 callback-ref cleanup**으로 ResizeObserver/rAF 단독 소유 ⑥StrictMode·stale callback·0-size·resize burst 안전 ⑦실제 Chromium **fill/stroke/clip-image 픽셀 검증** ⑧상품 plan projection·운영 이미지 **미착수** ⑨E2E fixture는 **저장소·Firebase public 밖 OS temp에서만** 빌드·서빙 ⑩스펙 021 **exact-handle preview teardown 유지**. **NOT TESTED(유지): 실제 운영 이미지·CORS-clean·실기기 4환경·선명도·성능·회전.** **미착수(유지): pointer·회전·text/clock/watermark·print/export·저장·주문** — **surface 완료는 상품 미리보기 완료가 아니다**(선택→plan projection·색 결정은 후속 스펙). ⚠️ **후속 필수 항목: `firebase.json` `hosting.public:"."`로 인한 저장소 전체 노출 위험 → Hosting 격리를 별도 스펙으로 반드시 처리**(스펙 022는 Firebase 설정·Rules 무변경). **다음 스펙은 Codex 지시 대기.**

> 스펙 022 재검증 보완 2(2026-07-28, Codex 차단 2차): **결함 확인 — `.e2e-staging/`은 `apps/mockup/dist` 밖이었지만 Firebase Hosting public 밖이 아니었다.** `firebase.json` `hosting.public="."`(저장소 전체)·ignore에 staging 없음·`.firebaseignore` 없음·firebase-tools는 `**/*`를 `dot:true`로 glob → **gitignore는 배포 제외 근거가 아니며** 저장소 내 staging은 **배포 후보**였다. 이전 문서의 "staging은 배포 소스 아님/firebase.json은 앱 dist 발행"은 **거짓**이었고 세 문서에서 정정했다. **수정**: `scripts/e2e-run.mjs`가 **`mkdtemp(os.tmpdir(),"denn-e2e-")`**로 실행별 staging을 만들고 mockup·admin·fixture 빌드와 Playwright에 **정확한 절대경로**를 전달(`DENN_E2E_FIXTURE_OUT_DIR`/`DENN_E2E_STAGING`), `test:e2e`=`node scripts/e2e-run.mjs`. **fail-closed**: fixture config는 env 필수 + **OS temp 밖 거부**(`dist` 폴백 불가), preview 모듈은 **서빙 디렉터리 미보관**(spec의 절대 outDir 필수, 없으면 기동 전 거부), `tests/global-setup.ts`는 전달받은 경로만 preview하며 **스펙 021 exact-handle 소유·teardown·포트 사전 거부·close 경로 무변경**. **cleanup은 이번 실행이 만든 디렉터리 하나만**(가드 `isDisposableStagingPath`: OS temp 바로 아래+`denn-e2e-` 접두사만, temp root·상위·중첩·모든 repo 경로 거부) — **broad delete·포트/PID kill·taskkill·sweep 0**, 새 서버·포트 0, **Firebase 설정·Rules 무변경**. **재검증**: clean 고객 build 목록+**SHA-256** 기록 → `test:e2e` **57 PASS·summary·exit 0**(staging=`…\AppData\Local\Temp\denn-e2e-XXXXXX`, **repo 밖·OS temp**)·포트 free·잔류 0 → 고객 dist **IDENTICAL** → **저장소 내 fixture/staging 빌드 산출물 0건** → **실패 경로(exit 1)** 후에도 IDENTICAL·0건·**temp 잔여 0건** → 재빌드 해시 재현. frozen exit 0·**lockfile diff 0**/format·lint·typecheck/**unit 472**(468→472)/build 동일/check PASS/`git diff --check` clean/PNG 복원·미커밋. **정확한 경계**: 저장소에 남는 fixture 관련 파일은 **소스 2개뿐**(`e2e-canvas-fixture.html`, `src/e2e/canvas-fixture.tsx` — `index.html`/`main.tsx`와 같은 범주, 빌드 산출물 아님). ⚠️ **남은 사실(이전부터·이번 스펙 금지 범위): `hosting.public="."`이라 `apps/**`·`packages/**`·`tests/**`·`scripts/**`·`node_modules/**` 등 저장소 소스 전체가 이미 배포 후보** — 좁히려면 `firebase.json` 변경이 필요해 **Codex 결정 항목으로 남김**. **production Canvas surface API·UI 무변경**(`apps/mockup/src/canvas/**` diff 0). 코드 커밋 `d24e836`/문서 분리.

> 스펙 022 재검증 보완(2026-07-28, Codex 차단 1건): **결함 확인 — `test:e2e`가 fixture를 `apps/mockup/dist`에 append**(`outDir:"dist"`, `emptyOutDir:false`)했고, 따라서 이전 보고의 **"운영 산출물에 harness 미포함"은 거짓**이었다(`build→test:e2e→deploy` 시 배포 혼입 위험, 고객 `/` 링크 부재만으로는 직접 URL 접근을 못 막음). **수정=E2E 산출물 전량 staging 격리**: fixture outDir → `../../.e2e-staging/mockup`, `test:e2e`가 **서빙할 것을 전부 staging에 직접 빌드**(mockup·admin `--outDir ../../.e2e-staging/* --emptyOutDir` → fixture append → playwright), `scripts/e2e-preview.mjs`의 `PREVIEW_APPS`가 앱별 `{root,outDir}`로 `preview()`에 `build.outDir`을 넘겨 **staging을 서빙**. **스펙 021 exact-handle 소유·teardown·포트 사전 거부·close 경로 무변경**(서빙 디렉터리만 변경), 새 서버·포트 0, **broad delete·포트/PID kill·globalTeardown sweep 0**(고객 dist에 쓰지 않으므로 사후 정리 자체가 불필요). `.e2e-staging/` gitignored(⚠️ **정정: `hosting.public:"."`이라 저장소 내부는 배포 후보였음 — 아래 보완 2에서 OS temp로 이전**). **재검증**: clean 고객 build 파일목록+SHA256 기록 → `test:e2e` **57 PASS·summary·exit 0**·포트 free·잔류 0 → 고객 dist **IDENTICAL·fixture 0건** → **실패 경로 1회(exit 1)** 후에도 **IDENTICAL·0건** → **self-contained**(두 dist 삭제 상태에서 `test:e2e`만으로 57/57 PASS, 실행 후에도 dist 미생성) → 재빌드 시 해시 정확 재현. frozen exit 0·**lockfile diff 0** / format·lint·typecheck / **unit 468**(467→468) / build 수치 동일(mockup 217.69·68.40 / 11.32·3.16, admin 무변경) / check PASS / `git diff --check` clean / 스펙018 PNG 복원·미커밋. **production Canvas surface API·UI 무변경**(`apps/mockup/src/canvas/**` diff 0), 변경 파일=`.gitignore`·`package.json`·`scripts/e2e-preview.{mjs,test.mjs}`·`vite.e2e-fixture.config.ts`. 코드 커밋 `1f0791d`/문서 분리. **NOT TESTED 유지: 실제 운영 이미지·CORS-clean·실기기 4환경.**

> 스펙 022 구현·자동검증 완료(로컬, 2026-07-28): `apps/mockup`에 **surface-only** Canvas 계층. 공개 API=`PreviewCanvasSurface({plan, imageBindings, accessibleName, className})`·`usePreviewCanvasSurface`·framework-free 엔진 `createPreviewSurface`·상수 `PREVIEW_DPR_CAP=2`/`LOGICAL_SIZE_TOLERANCE_PX=0.5`, 상태는 `waiting-for-size|ready|failed` 3종(code·index·예외 미저장). **Q1~Q4는 스펙대로 surface-only로 해결**: 상품 plan projection·body-only 상품 plan·합성 drawable의 고객 UI 노출·스펙 020 계약 변경 **전부 없음**, 케이스/액자 색과 `photoZones`도 손대지 않음(고객 화면은 surface를 import조차 하지 않음). **적용 순서**: 관측 content-box CSS 크기 → **`|css − plan.logicalCanvas| ≤ 0.5px` 불변식 위반 시 executor 미실행·안전 실패** → `computeBackingStoreSize({cssSize, deviceDpr, dprCap:2})` → **backing 변경 시에만 대입** → **매 draw `setTransform(dpr,…)`** → executor. canvas CSS 크기를 `plan.logicalCanvas`로 지정해 불변식이 구조적으로 성립하고, 축소 대신 wrapper가 스크롤(페이지 overflow 0). **DPR 상수는 `surface.ts`에 export**, 고객 preview 전용(room 4·print DPI·관리자 전파 0), unit 1/2/3.5→1/2/2 + E2E `deviceScaleFactor 3`→backing 600×400로 고정. **생명주기**: React 19 callback ref+cleanup **하나**가 element·RO 1개·rAF 1개 소유(별도 effect 재생성 0, ref identity 고정), resize burst→rAF 1개+draw 시 재측정(마지막 유효 크기), `dispose()`가 disconnect+cancel+이후 콜백 무력화, StrictMode에서 active owner 1개, draw는 항상 최신 snapshot을 읽어 **stale plan 덮어쓰기 0**, `devicePixelRatio`는 draw 시점에만 읽음. **안전 실패**: null context·getContext/`setTransform` throw·backing 실패·executor 실패 → throw 없이 `failed`(자동 retry 0), 0/음수/NaN/Infinity → `waiting-for-size` 후 유효 resize로 복구. **접근성**: canvas `role="img"`+`aria-label`(공백 이름이면 canvas 미렌더), `role="status"` 1개(성공/대기는 VisuallyHidden), 스크롤 wrapper 키보드 도달(axe 대응). **E2E harness**: `e2e-canvas-fixture.html`+`src/e2e/canvas-fixture.tsx`를 **별도 빌드**(`vite.e2e-fixture.config.ts`, `emptyOutDir:false`)로 dist에 append하고 `test:e2e`가 실행 — 고객 빌드 두 번째 input 방식은 Rollup 공유 청크 분리로 고객 자산이 바뀌어 **채택하지 않음**(별도 빌드에서 고객 번들 **byte-identical**, CSS md5 `a9b44036…`), `pnpm build`·`check`는 fixture 미생성(⚠️ 정정: 당시 `test:e2e`는 고객 dist를 오염시켰음 — 위 보완 참조), **새 서버·포트 0·스펙 021 globalSetup exact-handle 구조 무변경**, fixture는 합성 hex+**in-memory same-origin drawable**만 사용. **실제 Chromium 검증(신규 8)**: fill/stroke/**clip+draw-image-cover** 픽셀(클립 밖은 body 색 유지로 clip 증명)·dsf 1·3 backing·새 logical size rerender·0-size→복구·unmount/remount console error 0·320px/desktop overflow 0·accessible name·axe serious/critical 0·**고정 sleep 0**, **고객 `/`에 canvas·fixture 경로 0** 확인. `getImageData`는 **테스트 측 evaluate 안에서만**(production 금지 스캔 unit으로 고정). 게이트: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 467**(434→467) / build(**mockup 217.69·gzip 68.40 / CSS 11.32·3.16 = 스펙 021과 byte-identical**, admin 무변경) / **e2e 57 PASS**(49→57)·reporter 요약·**exit 0 자체 종료**·포트 free·잔류 0 / check PASS / `git diff --check` clean. `packages/**`(ui 포함)·admin·기존 mockup UI·운영 HTML·Firebase·Rules·POC·PNG 무변경(재생성 스펙018 PNG 복원), 네트워크·live·deploy 0. **NOT TESTED: 실제 운영 이미지·CORS-clean·실기기 4환경·선명도/성능/회전.** pointer·회전·text/clock·print·저장·주문 미착수. **surface 완료 ≠ 상품 미리보기 완료**(선택→plan projection은 후속). 핸드오프 `docs/2026-07-28-spec-022-react-canvas-surface-handoff.md`, DONE는 스펙 하단.

> Codex 스펙 022 확정(2026-07-28): 사전 조사 Q1~Q4를 surface-only 범위로 해소했다. **제품 plan projection은 이번 범위 밖**이며 body-only·합성 상품 미리보기·스펙 020 계약 확장을 하지 않는다. surface는 완성된 `PreviewRenderPlan`+메모리 binding을 입력받고 합성 plan/drawable은 자동검증 fixture에서만 사용한다. **고객 preview DPR 상한은 2**로 명시적으로 고정(실기기 통과 POC 근거, room/print/admin 정책에는 전파 안 함). 케이스 `#1A1A1A`와 액자 색 선택은 후속으로 유지한다. 필수 불변식=`canvas CSS size == plan.logicalCanvas`(축당 0.5 CSS px 허용), backing은 관측 CSS size×effective DPR, backing 조건부 대입→`setTransform(dpr)`→스펙 021 executor 순서. React 19 callback-ref cleanup으로 Canvas/ResizeObserver/rAF 소유권을 묶고 StrictMode·stale callback·0-size·resize burst를 검증한다. 제품 `/`에 test-only query/debug UI를 노출하지 않고 기존 서버/포트·스펙 021 exact-handle E2E 종료 구조를 유지한 실제 Chromium Canvas 픽셀 검증을 추가한다. 실제 운영 이미지·CORS-clean·pointer·회전·text/clock·print·저장/주문·Firebase·실기기·배포는 제외한다.

> 스펙 022 사전 조사 완료(읽기 전용, 2026-07-28): 실제 `<canvas>`+`CanvasRenderingContext2D`+React 생명주기+DPR backing 연결 전 근거를 파일·라인으로 확정. 보고서 `docs/codex-claude-handoff/reviews/2026-07-28-react-canvas-lifecycle-investigation.md`(표 10종). **확정(CONFIRMED)**: 선택 완료 시 확보되는 값은 **id 5개뿐**(`selection.ts:21-27`, 완료 판정 `BrowseFlow.tsx:320`), 검증된 원본은 `ready.document`에만 있고 index(표시용)와 document(원본)가 prop으로 분리(`App.tsx:19-20,35`) → Canvas 계층도 **스펙 018 projection 패턴**(id로 조회·최소 값만 반환, 원본 미반환)으로 raw catalog/URL/token 미노출 가능(`images/project.ts:71-92`). 액자 geometry 레거시 공식 재확인: `pw=max(260,prevMaxW‖500)`·`ph=pw*aspect`(`:3119`), `B=max(1,round(W*thickPct/100))`·**`IX=B,IY=B,IW=W-2B,IH=H-2B`**(`:3120-3122`), body=`fc.fill` 전체 채움(`:3124`), mat=`tplBg`‖`#fff`(`:3127-3128`), 외곽선 `rgba(0,0,0,.06)`/1.5(`:3129`), 콘텐츠 inset `P=8`(`:3130`); 케이스 backing=`model.w×model.h`(`:1047`), body 색=UI 상태 `caseColor` 기본 `#1A1A1A`(`:977`)·**라운드+그림자**(`:1691`), zone=퍼센트 `photoZones`+원형/라운드 clip(`:1660-1668`). CSS/logical/backing/DPR 책임 5단계와 불변식 **`plan.logicalCanvas == cssSize`**(그래야 executor의 논리 `clearRect`가 backing 전체를 덮음), 실행 순서 backing 조건부 대입→`getContext`→`setTransform(dpr)`→executor 정리. executor는 `setTransform/scale/rotate/translate`를 호출하지 않으므로 앱의 transform이 유지됨(스펙 021 포트). E2E는 **기존 route interception 방식**(`mockup-catalog.spec.ts:26-42`)+테스트측 `deviceScaleFactor`로 실제 Canvas 검증 가능 → **새 서버/포트 불필요, 스펙 021 globalSetup exact-handle 구조 무변경**, 제품 UI에 test-only route/query 불필요. **차단 QUESTIONS(임의 결정 안 함)**: **Q1** 스펙 020 `FramePlanInput`은 `imageRef/image/transform/imageZone` **전부 필수**(`build.ts:244-246`)라 **이미지 없이는 액자 plan 자체가 불가**, 케이스도 `zones:[]`여도 `image` 필수(`build.ts:159`) → (a) 케이스 body-only 제한 (b) **합성 in-memory drawable** 바인딩 (c) 스펙 020 계약 확장 중 택일; **Q2** `dprCap` 필수·기본값 없음(`backing.ts:20-21`), POC 2 vs 레거시 룸 4(주석 3 모순) → 값 확정 또는 required prop 고정 필요(앱 하드코딩 금지); **Q3** 케이스 `bodyColor` 카탈로그 근거 없음; **Q4** 액자 색 선택 단계·selector 부재(`frameColors[].fill`은 존재). 기타 NOT DECIDED/NOT VERIFIED: mat 알파 stroke vs `#RRGGBB` 전용, `logicalCanvas` 정의(model px vs CSS px), executor 실패 시 UI/접근성, ref callback(React 19 cleanup 지원 확인) vs effect, orientation listener 필요성, 케이스 `photoZones` 스키마 미모델링(`read.ts:64-65`), 사이즈별 `frameThickness`(`read.ts:82`에 없음), ResizeObserver 실기기 지원, `canvas.width` 대입의 context 초기화. **권장 최소 범위**=Canvas surface+생명주기(StrictMode 안전·RO+rAF 코얼레싱·0-size/fractional·조건부 backing 대입)+executor 호출+실패 시 안전 메시지+Chromium E2E; 이미지/CORS·pointer·회전·text/clock·print·저장/주문·Firebase·실기기·배포는 후속 유지. **구현·코드·설정·테스트 무변경, 실제 GET·live·deploy 0.**

> Codex 최종 승인(2026-07-28): 스펙 021 = **승인 가능**(기준 HEAD `3b540cf`). 독립 재검증 = `check` PASS / **unit 434/434** / build PASS(mockup JS gzip **68.40KB**·admin **61.09KB**) / **E2E 49/49 PASS + 최종 reporter 요약 + 명령 자체 exit 0** / 포트 4183·4184 free / HEAD=origin·0/0 / 재생성 PNG 복원 후 clean. **확정 executor 계약**: `executePreviewRenderPlan({context, plan, imageBindings})`가 스펙 020 명령 3종을 원래 순서로 실행(outer save→clear 1회→명령→outer restore, image는 save→beginPath→rect→clip→drawImage→restore), `imageRef`는 **메모리 binding lookup key 전용**(URL 해석·fetch·Image 0), preflight 후 **plain normalized snapshot**(값 1회 읽기·layerId/imageRef 미복사·drawable identity)만 실행이 읽어 hostile getter/Proxy/revoked/drift에도 **throw 0**·preflight 실패 시 Canvas 호출·style 대입 0, Result는 식별정보 없는 `{ok,code,commandIndex?}`·restore 실패를 성공으로 보고 안 함·console 0. **확정 E2E 종료 구조**: webServer 자식 프로세스 제거 → **globalSetup이 Vite preview 2개를 in-process exact handle로 소유**·teardown callback에서 그 handle만 close·기존 서버는 `127.0.0.1`/`::1` connect-only probe로 사전 거부·부분 시작 실패 시 생성된 handle만 정리·`closeAllConnections`/`closeIdleConnections` 후 close·**timeout/실패를 exit 0으로 숨기지 않고 throw**·**포트/PID kill·taskkill·SIGKILL·Stop-Process·globalTeardown sweep 없음**. **확정 Tailwind 경계**: `theme.css`의 `@source not "…/apps/mockup/src/canvas/**/*"`로 비-UI executor 제외(mockup CSS 11.32KB/gzip 3.16 = 스펙 020 baseline, admin 8.54/2.64 무변경). **NOT VERIFIED: SIGINT 경로(Windows 콘솔 제어 이벤트 제약)** — 서버가 러너 프로세스 내부라 orphan은 구조적으로 불가능하다는 논거만 존재. **NOT TESTED(후속): 실제 브라우저 Canvas 픽셀·이미지 load·CORS-clean·DPR·실기기.** `<canvas>` 생성·React 화면 연결·staging commit·pointer/zoom·회전·text/clock/template art·print/export·주문·Firebase·배포 = 미착수(executor는 앱 mount 미연결·번들 미포함). **후속 순서 = 실제 Canvas element/context + React lifecycle → image binding load/CORS-clean → pointer → text/clock → print. 다음 스펙은 Codex 지시 대기.**

> 스펙 021 재검증 보완 3(2026-07-28, **E2E 종료 결정성 2차**): Codex가 `c204b60`에서 보고한 2번째 형태(49 PASS 후 100초+ 미종료, **포트 LISTENING 0인데 Node 4개 잔존**, 해당 PID 종료 후 exit 1). **수정 전 재현 시도**(동일 비TTY 실행+`DEBUG=pw:webserver`) 3회 → 전부 exit 0/19초/49 PASS, `Terminating→Terminated` 0.58초 = **자연 재현 실패**(오탐으로 단정 안 함). **구조적 설명(vite 8.1.5 소스)**: `preview()`가 **host 리스너를 스스로 등록**(`process.once("SIGTERM")` + `CI!=="true"`이면 **`process.stdin.on("end")`**)하고 콜백은 `await server.close()` 후 `process.exit()`, close 경로는 **자기가 추적한 소켓만** destroy → 자식 런처에서 **stdin EOF로 close 시작 시 포트는 즉시 해제되지만 `close()`가 미해결이면 `process.exit()`에 도달 못해 프로세스가 살아 상속 파이프를 계속 쥠** = **Codex가 본 상태 그대로**(재현은 못 했으므로 "증거와 일관된 최유력 설명"으로 기록). **Codex의 "부모 대기 순환" 가설은 실측으로 정정**: `cmd /c`가 자식을 기다리고 런처는 부모 소멸 시에만 종료 → 조건이 독립이라 **교착은 아니지만**, wrapper 생존 중에는 부모-소멸 가드가 **무력**해 내부 close 정지를 해결하지 못함. **수정(Codex 권장안)**: `webServer` **완전 제거** → `tests/global-setup.ts`가 Vite `preview()`로 **서버 2개를 러너 프로세스 안에 직접 생성**하고 **teardown 콜백에서 그 두 handle만 close**(자식 프로세스·wrapper·상속 파이프 **0**; 실행 중 실측 **4183·4184 모두 러너 PID 소유**). **종료 결정성**: close 전 `closeAllConnections()`+`closeIdleConnections()`, `close()`는 **타임아웃 한정**, **실패/타임아웃은 throw로 보고**(exit 0 은폐 0, handle별 전부 시도 후 집계), `preview()`가 추가한 **SIGTERM/stdin 리스너만 차집합 제거**(러너 중간 사망 방지, 기존 리스너 보존). **"기존 서버 거부" 계약 정정**: `strictPort`만으로는 부족(**와일드카드 0.0.0.0 바인드 낡은 서버는 vite의 localhost=::1 바인드와 충돌하지 않아 그대로 통과 — 실측**) → 시작 전 **`127.0.0.1`·`::1` connect-only 프로브**로 응답 시 **거부**(검증: 1초 만에 exit 1, 서버 기동 0). **포트/PID 기반 kill 0·taskkill/SIGKILL/Stop-Process 0·globalTeardown 포트 sweep 0·타 프로세스 종료 0.** **수정 후 검증**: 연속 3회 **exit 0**(21/21/22초)·**49/49 PASS + 최종 reporter 요약 출력**·포트 free·잔류 0 / **실패 경로 1회**(임시 실패 spec, 커밋 없음) **exit 1·2초 내 종료**·정확히 두 handle만 close·잔류 0 / **SIGINT은 Windows 콘솔 제어 이벤트 제약으로 미검증**(단 서버가 러너 내부라 러너가 죽으면 함께 사라져 orphan 구조적 불가). 임의 sleep 0(전부 lifecycle/handle 기반). **테스트 unit 431→434**(런처 11→14: 화이트리스트·strictPort 전달·부분 기동 실패 시 시작분만 close+원본 오류 재throw·host 리스너 차집합 제거·close 전 연결 정리·**멈춘 close 타임아웃 보고**·집계 메시지·빈 목록 no-op·포트 프로브 3상태·두 루프백 거부). **회귀 0**: executor API·snapshot·Result·Tailwind `@source`·UI/CSS 무변경, build 수치 동일(mockup 11.32/3.16·68.40, admin 8.54/2.64·61.09), frozen exit 0·lockfile diff 0·신규 의존성 0·check PASS·`git diff --check` clean. 변경=`scripts/e2e-preview.mjs`(재작성)·`scripts/e2e-preview.test.mjs`(재작성)·`playwright.config.ts`(webServer→globalSetup)·`tests/global-setup.ts`(신규); 운영본·Firebase·Rules·POC·admin·PNG 무변경(재생성 스펙018 PNG 복원), 네트워크·live·deploy 0. **불확실성: Codex 실행의 정확한 트리거는 로그가 없어 확정 불가** — 확인된 것은 자식 프로세스 webServer는 상속 파이프로 종료를 막을 수 있다는 구조적 사실과, 새 구조엔 자식 프로세스가 없고 close가 타임아웃·보고로 한정된다는 점. 코드 커밋 `fe86954`/문서 분리.

> 스펙 021 재검증 보완 2(2026-07-28, **E2E 종료 결정성**): **조사 먼저(코드 무수정)** — standalone `test:e2e` 3회 반복 전부 스스로 exit 0(18/19/19초)·49 PASS·실행 후 4183/4184 free·잔류 0 → **자연 재현 안 됨**(Codex 재현을 오탐으로 단정하지 않음). **실측 소유 관계**: 포트 소유자=`node …vite/bin/vite.js preview apps/mockup --port 4183` → 부모=`cmd.exe /d /s /c "vite preview …"`(**Playwright가 소유한 PID**) → 부모=`playwright cli.js test`. **근본 원인(playwright-core 1.61.1 소스 확인)**: webServer는 항상 `shell:true`로 spawn(소유 PID=wrapper)+win32는 `detached:false`(프로세스 그룹 없음), `attemptToGracefullyClose`가 **win32에서 즉시 throw**(`Graceful shutdown is not supported on Windows`)→우리 `gracefulShutdown`은 **win32 no-op**·항상 `taskkill /pid <wrapper> /T /F` 폴백, 그 kill은 **`processClosed`면 skip**, teardown은 wrapper의 `close`(=상속 stdout/stderr 파이프 닫힘) 대기 → **살아남은 자손이 파이프를 쥐면 teardown 무한 대기+포트 LISTENING**(기존 config 주석 "SIGTERM→5s force-kill"은 Windows 실제와 불일치, 정정). **결정적 재현**: 실행 중 **wrapper cmd.exe만** `/F` 종료(자손 유지)→49 전부 PASS 후 **124초 미종료**·4183/4184 둘 다 LISTENING(고아 vite node)→기록한 **정확한 PID 2개**만 종료하자 즉시 `49 passed (2.1m)`+exit 0 = **Codex 보고와 동일 형태**. **수정**: `scripts/e2e-preview.mjs` — **Vite 기존 Node API `preview()`**(루트 devDependency, **신규 의존성 0**)로 preview를 **in-process** 기동, webServer command=`node scripts/e2e-preview.mjs <mockup|admin> <port>` → **wrapper가 spawn한 node 자신이 포트 소유자**(고아가 될 자손 없음) + 자기 수명 가드(**SIGTERM/SIGINT/SIGHUP/SIGBREAK·stdin EOF·부모 PID 소멸**→자기가 띄운 서버만 close 후 exit 0), 앱 화이트리스트+포트 검증. **포트 기반 kill 0·globalTeardown 0·broad taskkill/SIGKILL/Stop-Process 0·타 프로세스 종료 0·`reuseExistingServer:false` 유지**, `gracefulShutdown`은 POSIX용으로 유지(win32 no-op 명시). **수정 후 검증**: (a) 고아 가드 직접 증명 — wrapper만 죽이면 **856ms 후 자기 종료·포트 해제**(수정 전 무한 생존), (b) **standalone 3회 연속 전부 스스로 exit 0**(20/18/19초)·**49 passed**·포트 free·잔류 0(고정 sleep 0, 수동 종료 0). **테스트 고정 +11**(`scripts/e2e-preview.test.mjs`: 인자 화이트리스트·shutdown 멱등·close 실패에도 exit 0·4 시그널·stdin EOF·부모 소멸 시에만 종료·dispose·import만으로 서버 기동 0) + `vitest.config.ts` include에 `scripts/**/*.test.mjs`. **회귀 0**: executor API·snapshot·Result 무변경, Tailwind `@source` 유지(mockup CSS 11.32/3.16·admin 8.54/2.64), UI/CSS 무변경. 게이트: frozen exit 0·lockfile diff 0 / format·lint·typecheck / **unit 431** / build / **e2e 49 PASS** / check PASS / `git diff --check` clean. 변경=`scripts/e2e-preview.mjs`·`scripts/e2e-preview.test.mjs`(신규 2)+`playwright.config.ts`·`vitest.config.ts`; 운영본·Firebase·Rules·POC·admin·PNG 무변경(재생성 스펙018 PNG 복원), 네트워크·live·deploy 0. **불확실성: Codex 실행에서 wrapper 링크가 끊긴 계기는 로그가 없어 확정 불가** — 확인된 것은 그 상태가 발생하면 무한 대기+포트 잔존이 필연이고, 수정 후에는 인위적으로 만들어도 856ms 내 자기 종료된다는 것. POSIX는 detached 그룹+실제 SIGTERM 경로라 이 실패 형태가 아니며 런처도 정상 동작. 코드 커밋 `014211c`/문서 분리.

> 스펙 021 재검증 보완(2026-07-28, Codex 지적 2건): **[1] hostile getter/Proxy에서도 public executor throw 0** — preflight의 모든 property 읽기를 try/catch 안으로 옮기고 2단계 분리(`readExecutorSurface`=args/context/bindings 읽기→`INVALID_EXECUTOR_INPUT`, `normalizePlan`=plan/command 읽기→`INVALID_PLAN`). throwing accessor·Proxy `get`/`has` trap·revoked Proxy 전부 안전 분류, preflight 실패 시 Canvas 호출 0·style 대입 0 유지. `bindings.get`은 **1회 캡처 pre-bound**(재읽기 0). **plain normalized snapshot 채택**: 검증값을 각각 **정확히 1회** 읽어 새 plain object로 복사(logicalCanvas + draw에 필요한 필드만, drawable은 identity, **layerId·imageRef는 복사 안 함**) → 실행은 snapshot만 읽어 **getter drift 불가**(clearRect·rect·color·command 수 모두 첫 읽기 값 고정). Canvas 실행은 기존 `attempt()` 경계 유지, setter writability mutation 시험 0, 정상 순서·restore 우선순위·Result API 무변경. **추가 hostile 테스트 12건**(context method/lineWidth getter·get/has trap·args container getter·`bindings.get` getter·plan kind/logicalCanvas/commands getter·commands element getter·command type/layerId/rect/color/imageRef/clipRect/drawRect getter·rect 필드 getter·revoked Proxy 3종·getter drift 2종; throwing `fillStyle`/`strokeStyle` getter는 `ok:true`로 "style 값 미읽음" 증명) → canvas unit 36→48. **[2] Tailwind v4 CSS drift 제거** — 실측 원인=자동 source 탐지가 **비-UI executor·test 파일의 식별자/주석까지 class 후보로 스캔**(canvas 디렉터리 제외 대조 빌드로 확정), 실제 추가분은 **`.block`·`.transform`+transform `@property` scaffolding**(**정정: `.visible`/`.fixed`/`.hidden`은 스펙 020 baseline에 이미 존재, drift 아님**). 수정=Tailwind root `packages/ui/src/theme.css`에 **`@source not "../../../apps/mockup/src/canvas/**/*";` 1줄**(경로=CSS 파일 기준 상대, 영향=그 비-UI 디렉터리 하나뿐; 앱 JSX·browse·@denn/ui는 계속 스캔, safelist/blocklist·`source(none)`·문자열 개명 0). 결과 mockup CSS **11.99→11.32 KB / gzip 3.35→3.16 KB = 스펙 020 baseline과 byte-identical**(md5 `a9b44036cb2e5910b23c147aa578696c`), admin CSS 8.54/2.64 무변경, JS gzip 68.40/61.09 무변경. 재검증 게이트: frozen exit 0·lockfile 추가 diff 0 / format·lint·typecheck / **unit 420**(408→420) / build 독립 / **e2e 49 PASS·exit 0**(새 Canvas E2E 0, 320/1280 포함 matrix·overflow·axe·console 회귀 0) / check PASS / `git diff --check` clean / 포트 4183·4184 0·잔류 프로세스 0. 변경=`executePreviewPlan.ts`·`.test.ts`+`theme.css`(Tailwind 범위 1줄, 예외 보고); `types.ts`·기존 mockup UI·catalog·browse·admin·다른 패키지·운영 HTML·Firebase 설정/Rules·POC·결과 PNG 무변경(e2e 재생성 PNG 2개 커밋 없이 복원), 네트워크·live·deploy 0. **미검증 유지: recording fake·Proxy 검증은 실제 브라우저 Canvas 픽셀 검증 아님 — 실제 clip/drawImage·CORS-clean·이미지 load·DPR·실기기 NOT TESTED, `<canvas>`/React 연결·staging·pointer·회전·text/clock·print 미착수.** 코드 커밋 `71c0bd8`/문서 분리.

> 스펙 021 구현·자동검증 완료(로컬, 2026-07-28): `apps/mockup/src/canvas/`에 React 비의존 Canvas plan executor `executePreviewRenderPlan({context, plan, imageBindings})`(`types.ts`+`executePreviewPlan.ts`). context와 **이미 decode된 메모리 drawable은 호출자가 주입** — executor는 `<canvas>` 생성·`getContext`·`Image`/`ImageBitmap`·fetch·URL/base64/storagePath 해석·crossOrigin·`setTransform/scale/rotate/translate`·`getImageData/toBlob/toDataURL`·console 출력 **전부 0**. port=`PreviewCanvasContext`(9 method+`fillStyle/strokeStyle/lineWidth`), 실제 `CanvasRenderingContext2D` 구조적 만족을 **컴파일 타임 단정**으로 고정. `imageRef`는 **lookup key 전용**(ref당 1회 조회·동일 identity 재사용·누락 오류에 key 미포함, `ReadonlyMap`도 구조적 호환). **preflight가 draw 전 전량 검증**(context surface·plan kind/logicalCanvas/commands·command별 type/layerId/rect finite&>0/`#RRGGBB`/stroke width/imageRef·binding 존재·비nullish) → 실패 시 **Canvas 호출 0·style 대입 0·부분 실행 0**. 실행=outer save→`clearRect(0,0,W,H)` **1회**(command count 미포함)→plan 순서 그대로(재정렬·병합 0)→outer restore 1회 시도, image command는 `save→beginPath→rect→clip→drawImage→restore` 고정(0.5 보정·clamp·9인자 overload·smoothing·composite 0). 오류 `INVALID_EXECUTOR_INPUT|INVALID_PLAN|MISSING_IMAGE_BINDING|CANVAS_OPERATION_FAILED|CANVAS_RESTORE_FAILED`+`commandIndex?`만(**layerId/imageRef/URL/token/원본 message·stack 0**, 직렬화 키 `ok/code/commandIndex`뿐), **throw 0**, 우선순위 outer restore>inner restore>operation, restore 실패는 성공으로 보고 안 함. **스펙 미명시 2건 판단(Codex 확인 요청)**: (1) preflight는 읽기만(대입 없이 writability 증명 불가 → throw하는 setter는 실행 중 `CANVAS_OPERATION_FAILED`), (2) binding 조회가 throw하면 draw 전 `INVALID_EXECUTOR_INPUT`+commandIndex. 게이트: frozen exit 0·lockfile diff=mockup importer `@denn/render` link 3줄만·신규 외부 의존성 0 / format·lint·typecheck / **unit 408**(canvas recording-fake 36 신규) / build 독립(**mockup gzip 68.40KB·admin 61.09KB 무변경** — mount 미연결로 번들 미포함) / **e2e 49 PASS·exit 0**(기존 회귀만, **새 Canvas E2E 0**) / check PASS / `git diff --check` clean / 포트 4183·4184 0·잔류 Vite/esbuild 0. `packages/**`·기존 mockup React UI·catalog·browse·`apps/admin/**`·운영 HTML·Firebase 설정/Rules·`poc/**`·결과 PNG 무변경(e2e 재생성 스펙018 PNG는 커밋 없이 복원), 네트워크·live·deploy 0. **미검증(NOT TESTED): recording fake 통과는 실제 브라우저 Canvas 픽셀 검증이 아님 — 실제 clip/drawImage·CORS-clean·이미지 load·선명도·DPR·실기기 미검증. `<canvas>`/React 연결·staging commit·pointer·회전·text/clock·print·주문 미착수, executor는 앱 mount에서 호출되지 않음.** 코드/test(`54d23f8`)와 문서 커밋 분리. 핸드오프 `docs/2026-07-28-spec-021-canvas-plan-executor-handoff.md`, DONE는 스펙 하단.

> 스펙 021 지시(2026-07-28): 스펙 020 plan의 `fill-rect`·`draw-image-cover`·`stroke-rect`를 실행하는 React 비의존 executor를 `apps/mockup` 계층에 추가한다. 실제 context와 이미 준비된 drawable binding은 호출자가 주입하며, executor는 preflight 후 outer save→clear→명령 실행→restore, image 명령은 inner save→clip→drawImage→restore를 지킨다. malformed 입력·binding 누락·Canvas operation/restore 실패는 식별정보 없는 Result로 반환하고 밖으로 throw하지 않는다. recording fake unit으로 순서·preflight·예외·restore 균형을 고정한다. **제외:** 실제 Canvas 생성/React 화면 연결·URL/image load·CORS·DPR·pointer·회전·text/clock·print·Firebase·배포. 구현 정본: `docs/rebuild/specs/021-canvas-plan-executor.md`.

> Codex 최종 승인(2026-07-27): 스펙 020 = **승인 가능**(기준 HEAD `07657fb`). 결정적·JSON-safe preview render-plan(`buildPreviewRenderPlan`), 케이스·액자 입력·layer 순서 분리, 스펙 019 geometry 재사용, malformed runtime 입력 throw 방지, `zone.order` NaN/±Infinity 차단, restricted synthetic identifier 문법(`^[A-Za-z0-9][A-Za-z0-9._-]*$`·1..128) 확정. **식별자 문법은 semantic secret detector 아님**(허용 문자만의 token/secret/unpadded base64 판별 불가) — caller는 imageRef에 URL/base64/token/secret 전달 금지, executor는 imageRef를 URL이 아닌 메모리 신뢰 binding-map lookup key로만 사용, builder는 source URL/token/storagePath/raw catalog 미생성·미복사. 최종 게이트 **unit 372 / e2e 49 PASS·exit 0 / check PASS**, 금지어(§G) 0. **미검증(후속): 실제 Canvas·CORS-clean·이미지 load·pointer·회전·text/clock·print·DPR cap·실기기·배포 미착수(plan으로 증명 불가).** 후속 순서=Canvas executor→image/CORS→pointer→text/clock→print. **다음 스펙은 Codex 지시 대기.**

> 스펙 020 구현·자동검증 완료(로컬, 2026-07-27): `@denn/render`에 `buildPreviewRenderPlan(input)` — 순수·결정적·JSON-safe preview render **plan**(Canvas executor 아님, `packages/render/src/plan/*`; geometry export·placeholder API 유지, `RENDER_NOT_IMPLEMENTED` 문구만 정정). 입력 `CasePlanInput|FramePlanInput`(kind 태그, optional flag 병합 없음). command=`fill-rect`/`draw-image-cover`(clipRect=save→clip→drawImage→restore 대표)/`stroke-rect`. 순서: 케이스 `case:body`→정렬 zone `case:user-image:<id>`→(guide) `case:guide:<id>`; 액자 `frame:body`→`frame:mat`→`frame:user-image`→(innerBorder) `frame:inner-border`. 정렬=order 오름차순(미지정=index)·동률 index, 가짜 template/camera/magsafe/text/clock command 0. 배치=스펙 019 `computeCoverDrawRect(clampPan:true)`·percent=`percentRectToLogical`(transform 병합·변경 0, zone→default fallback, case zone별 독립·frame 비회전 단일). 안전: 색상 `#RRGGBB`만(`INVALID_COLOR`), 제한된 합성 식별자(zone.id+imageRef 공통 문법 `^[A-Za-z0-9][A-Za-z0-9._-]*$`·길이 1..128; URL 형태·공백(trim 안 함)·control char·일반 **padded** base64 차단, **secret detector 아님**(허용 문자만으로 구성된 token/secret/unpadded base64 여부는 판별 불가)→`INVALID_ID`), **builder는 source URL/token/storagePath·raw catalog를 새로 생성·복사하지 않음**(현 fixture 검사); plan은 caller의 합성 imageRef만 담음(caller가 URL/token/base64/secret을 imageRef에 넣지 않아야 하고, executor는 이를 URL이 아닌 메모리 신뢰 image binding map의 lookup key로만 사용), JSON-safe·성공 plan 전 number finite(`NON_FINITE_RESULT` 안전망), 결정성(Date/random/global 0). 런타임 malformed 입력(null/undefined/primitive/부분 객체)도 nested shape 검사로 **throw 없이** `INVALID_*` 반환, `zone.order`는 유한 필수(NaN/±Infinity→`INVALID_ZONE`). 오류 `INVALID_KIND/ID/COLOR/ZONE/TRANSFORM`·`GEOMETRY_ERROR(causeCode)`·`NON_FINITE_RESULT`(throw 없음, 중복/빈 id 치명적, geometry 실패 숨김 0). 게이트: frozen diff 0·신규 의존성 0 / format·lint·typecheck / **unit 372**(plan 75 신규) / build / **e2e 49 PASS·exit 0**(기존 회귀만, 새 Canvas E2E 없음) / check PASS / `git diff --check` clean. **금지어(§G) 0**(plan source 런타임 참조 0, 매치는 주석/타입doc; 외부 import=`../geometry`뿐). `apps/**`·shared·firebase·ui·spaces·운영 HTML·Firebase 설정/Rules·POC·PNG 무변경, deploy 0. 코드/test와 문서 커밋 분리. 핸드오프 `docs/2026-07-27-spec-020-deterministic-render-plan-handoff.md`, DONE는 스펙 하단. **미검증(NOT TESTED): 실제 Canvas 픽셀·CORS-clean·선명도·실기기 — plan으로 증명 불가(후속). Canvas executor·이미지/CORS·pointer·회전·text/clock·print·DPR cap 미착수.**

> 스펙 020 지시(2026-07-27): `@denn/render`에 실제 Canvas를 호출하지 않는 순수 `buildPreviewRenderPlan` 계약을 추가한다. 케이스·액자 입력 union을 분리하고, 스펙 019 geometry를 재사용해 최소 `fill-rect`·`draw-image-cover`·`stroke-rect` 명령을 stable 순서로 생성한다. plan은 JSON-safe·결정적이며 실제 URL/base64/token/storagePath/catalog raw object를 포함하지 않는다. 케이스 zone별 transform과 비회전 액자 단일 transform을 구분한다. **제외:** Canvas executor/DOM/React 앱 연결·이미지 load/CORS·pointer·text/clock·print·DPR 정책·Firebase·배포. 구현 정본: `docs/rebuild/specs/020-deterministic-render-plan.md`.

> Codex 최종 승인(2026-07-27): 스펙 019 = **승인 가능**(기준 HEAD `d52e5fb`). 5개 공개 함수로 6개 geometry 계약, 유한입력 overflow→`NON_FINITE_RESULT` 차단, **성공 Result에 NaN/Infinity 미포함 계약 고정**, 함수별 극단값 테스트 5건. 최종 게이트 **unit 297 / e2e 49 PASS·exit 0 / check PASS**, 금지 의존성(§H) 0. 케이스+비회전 액자 cover 코어만 공유, `dprCap` 필수·제품 정책 미확정. **미검증 유지: 실제 Canvas·CORS-clean·인쇄·실기기 = NOT TESTED, DPR cap·주문차단·zoom 앵커·print DPI = NOT DECIDED.** 운영본·Firebase·앱·POC·PNG·배포 무변경. 후속 순서=deterministic renderer→image/CORS→pointer→text/clock→print. **다음 스펙은 Codex 지시 대기.**

> 스펙 019 구현·자동검증 완료(로컬, 2026-07-27, Codex 재검증 보완 반영): `@denn/render`에 **5개 공개 함수로 6개 geometry 계약**(`packages/render/src/geometry/*`, pan clamp는 `computeCoverDrawRect` 내부 계약; 기존 placeholder API 유지). `computeCoverDrawRect`(cover `baseScale=max(zone/img)`+레거시 abs pan clamp, `clampPan:false`=pan 그대로), `percentRectToLogical`, `clientPointToLogical`(backing·DPR 미사용, 명시 `logicalSize`), `resolveOrientedAspect`(landscape=1/portrait, aspect=H/W), `computeBackingStoreSize`(`max(1,round(css*min(dpr,cap)))`, **dprCap 필수·기본값 없음**). 오류 `GeometryResult{ok,code}`(code 6종, throw 없음, NaN/Infinity 입력·≤0 거부, **유한입력 overflow 계산결과→`NON_FINITE_RESULT`**, **성공 Result에 NaN/Infinity 절대 없음**, 입력 비변형, payload에 이미지·URL·token 0). 케이스+비회전 액자 cover 코어만 공유(회전·multi-zone·pointer·layer plan·print 미구현). **DPR cap 2/4·print DPI·zoom 0.3~5 = 제품 정책 미확정(입력 사례로만 검증).** 게이트: frozen diff 0·신규 의존성 0 / format·lint·typecheck / **unit 297**(geometry 60 신규) / build / **e2e 49 PASS·exit 0**(스펙 015~018 회귀만, **새 Canvas E2E 없음**) / check PASS / `git diff --check` clean. **금지 의존성(§H) 0**(geometry source에 document/window/Canvas/getContext/drawImage/setTransform/devicePixelRatio/ResizeObserver/Image/fetch/firebase 런타임 참조 0; render 외부 import=`type Result`뿐). 운영 HTML·`apps/**`·shared·firebase·ui·spaces·Firebase 설정/Rules·POC·PNG 무변경, deploy 0. 코드/test와 문서 커밋 분리. 핸드오프 `docs/2026-07-27-spec-019-canvas-geometry-contract-handoff.md`, DONE는 스펙 하단. **미검증(NOT TESTED): 실제 Canvas 선명도·합성·CORS-clean·인쇄 정확도·실기기 — 순수 geometry로 증명 불가(후속). 앱·Canvas UI·pointer·image/CORS·print 미착수.**

> 스펙 019 사전 조사 완료(읽기 전용, 2026-07-27): 케이스·액자 Canvas 편집기 연결 전 레거시 렌더 좌표계·비율·DPR·이미지 배치·템플릿 합성·CORS-clean·인쇄 출력 계약을 파일·라인으로 확정. 보고서 `docs/codex-claude-handoff/reviews/2026-07-27-canvas-render-contract-investigation.md`(표 10종). 핵심(직접 spot-verify): cover-fit `baseSc=max(w/iw,h/ih)`·중심 앵커·pan clamp는 `drawImgT`(preview)에서만(케이스=액자 공유, `1543/1545/1550`), 인쇄 `drawImageT`는 clamp 없고 pan에 scale 곱(`11377`). backing 정책 상이: 케이스=`model.w/h`(DPR 0, `1047`)·액자 preview=논리 ~500px(DPR 0, HiDPI `DENN_FRAME_PREVIEW_HIDPI_V361` 정의되나 **미호출** `10456`)·룸만 DPR-aware(clamp [1,4] `4037`). 인쇄=preview와 독립 재렌더, 물리 `cm/2.54*300 DPI`(minLong 3000/maxPixels 36M `11318-11340`). CORS-clean=전역 monkey-patch가 `crossOrigin='anonymous'`를 src보다 **먼저**·firebasestorage URL에만(`needsCors` `11646`, patch `11655`), taint=`getImageData/toBlob` try/catch. **인쇄 실패→preview-only 주문 저장(하드 차단 아님, `11164`) → legacy-analysis §7 "주문 차단"과 상충(NOT DECIDED).** 리빌드 정본 DPR=POC `useCanvasDpr`(clamp [1,2]·`setTransform(dpr)`·ResizeObserver). 책임 분리: geometry/layer-plan/print-px=`@denn/render`(순수·React/Firebase/DOM 0), catalog view=`@denn/shared`, Canvas-clean 신뢰 source+CORS=`@denn/firebase`, Canvas DOM/DPR/pointer/lifecycle=`apps/mockup`. 스펙 019 권장 최소=순수 geometry(@denn/render)+얇은 DPR backing adapter까지(정적 preview·pointer 제외); 후속 순서=geometry→deterministic renderer→image/CORS→pointer→text/clock→print. **NOT DECIDED: DPR 상한(2 vs 4)·주문차단 계약·zoom 앵커(중심 vs pointer). NOT VERIFIED: 실제 bucket CORS 헤더·실제 인쇄 파일·실기기(실제 GET 금지).** **구현·Canvas·실제 Firebase GET·배포 미착수.** 코드·설정·테스트·lockfile·운영본·PNG 무변경.

> Codex 최종 승인(2026-07-27): 스펙 018 = **승인 가능**(기준 HEAD `80e20c7`). 게이트 최종 **unit 237 / e2e 49 PASS·exit 0 / check PASS / mockup JS gzip 68.40KB·admin 61.09KB**. image projection은 browse selector와 분리(스펙 016 output에 image/base64/path 0), Firebase Storage host/bucket 신뢰 경계로 표시 전 차단, keyed `ThumbnailImage`+boolean-only failure state, 고정 sleep 0·controlled route gate, URL/token 허용 위치=props/closure·`img[src]`만, storagePath fallback·Canvas·crossOrigin 없음. **유지(NOT TESTED/미실행): 실제 운영 이미지·실기기 4환경·200% 확대·Canvas CORS-clean = NOT TESTED, 실제 Firebase GET·이미지 다운로드·live test·배포 미실행.** 이 승인은 합성 이미지 자동검증 단계 종료이며 출시 완료가 아니다. **다음 스펙은 Codex 지시 대기.**

> 스펙 018 구현·자동검증 완료(로컬, 2026-07-27): 스펙 017 텍스트 탐색 카드에 **표시 전용 썸네일** 추가. **@denn/shared 순수 image projection**(`projectCatalogTemplateImage`)을 browse selector와 분리(스펙 016 output 이미지 필드 0): 우선순위 frame `dataUrl→sourceDataUrl→builderArtDataUrl→artDataUrl→originalDataUrl`·case `dataUrl`만, `generatedDetailPreview` 게이트, `data:`/`https:` 분류, storagePath 비소스·dual=dataUrl 계열만, 원본 문자열 1개 반환(원본 template/clone 0). **read.ts 보완**: https-in-dataUrl(마이그레이션 다운로드 URL)을 `INVALID_DATA_URL` 대신 dataUrl 계열로 인정·집계(스펙 012 무회귀). **@denn/firebase 신뢰 경계**(`resolvePublicImageSource`, no SDK/네트워크): data-image 통과, https는 host `firebasestorage.googleapis.com`+bucket path+userinfo 없음만 통과, token은 성공 src에만. **apps/mockup TemplateThumbnail**: `<img loading=lazy decoding=async alt="">`(projection→신뢰 경계), unavailable/onError→중립 placeholder(aspect box=layout shift 0). **stale onError 하드닝(Codex 재검증 2회)**: keyed child `<ThumbnailImage key={src} src={src}/>`가 **`useState<boolean>` 하나만** 사용 → **URL/token은 props/closure·실제 `img[src]`에만, React state·오류·로그·data/ARIA/storage 저장 0**(문자열 `failedSrc`·`isThumbnailFailed` 제거). source 변경 시 새 child/boolean, detached 노드 error 접근 불가·동일 실패 loop 0·unmount clean. E2E 고정 sleep 0(route 카운터+`expect.poll`+controlled gate). crossOrigin/Canvas/object URL/storagePath→URL 0. 문자열은 `img[src]`+resolver 메모리에만. 게이트: frozen exit 0·lockfile diff 0·신규 의존성 0/format·lint·typecheck/**unit 237**/build(mockup gzip **68.40KB**·admin 61.09 무변경)/**e2e 49 PASS·exit 0**(스펙 012/015/016/017 무회귀)/check PASS/`git diff --check` clean. E2E(합성+route만): data/routed-fb(hit1)/비신뢰 차단(외부 0)/none/preview/fail placeholder·token marker는 `img[src]`에만(text/aria/data/console/storage/location 0)·admin 0, 이미지 viewport matrix 6개 overflow0·44px·box in-frame·axe0·console0. 시각근거 `docs/rebuild/results/spec-018/browse-{mobile-390x844,desktop-1280x800}.png`(합성만). **실제 4환경·200% 확대·실제 운영 이미지·Canvas CORS-clean = NOT TESTED, 실제 Firebase GET·이미지 다운로드·`test:live:*` 미실행.** 스펙 017 스크린샷·운영 HTML·Firebase 설정/Rules·admin·POC·디자인 PNG hash UNCHANGED, Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0. 코드/test와 문서 커밋 분리. 핸드오프 `docs/2026-07-27-spec-018-catalog-image-thumbnail-handoff.md`, DONE는 스펙 하단. 이 DONE은 합성 이미지 자동검증 단계이며 출시 완료 아님.

> 스펙 018 사전 조사 완료(읽기 전용, 2026-07-27): 고객 탐색 썸네일 추가 전 레거시 이미지 참조 계약을 파일·라인으로 고정. 보고서 `docs/codex-claude-handoff/reviews/2026-07-27-catalog-image-contract-investigation.md`. 핵심: 소비자앱(`denn-mockup-tool.html`)은 `storagePath`로 URL을 만들지 않고(전수 grep 1회=카운트) 전적으로 `dataUrl`에 의존, 마이그레이션이 `getDownloadURL` https URL을 `dataUrl`에 덮어씀(`admin:15098`), 우선 체인 `dataUrl→sourceDataUrl→builderArtDataUrl→artDataUrl→originalDataUrl`+`generatedDetailPreview` 게이트(`mockup:3025/11001`), 케이스=단일 `dataUrl`·액자=동일 체인 공유(썸네일=인쇄), `crossOrigin`은 firebasestorage URL에만 조건부(Canvas 오염 방지용, 단순 썸네일 표시엔 불필요). **현행 read(스펙012)는 `dataUrl`=https URL을 `INVALID_DATA_URL`로 경고하는 모델 갭(`read.ts:346`)** → 후속 보완 필요. dual 런타임 우선순위·Storage 실패 fallback은 근거 없어 NOT DECIDED, published 실데이터 URL/base64 비율은 NOT VERIFIED(실제 GET 금지). 책임 분리안=분류·우선순위 `@denn/shared`(순수, selector output에 base64 미포함) / URL·CORS `@denn/firebase` / DOM·lazy·onerror `apps/mockup`. **구현·Canvas·실제 Firebase GET·배포 미착수.** 코드·설정·테스트·lockfile·운영본 무변경.

> Codex 최종 승인(2026-07-27): 스펙 017 = **승인 가능**(기준 HEAD `711bb3e`). 게이트 최종 **unit 202 / e2e 34 / check PASS**. 키보드 전용 케이스·액자 전체 흐름 Enter+Space+focus-visible 완료 검증, 저장소 소속 preview/Vite/esbuild 잔류 0·포트 4183/4184 LISTENING 0·Playwright exit 0, `globalTeardown`/포트 기반 강제 종료 없이 webServer `gracefulShutdown{SIGTERM,5s}`만 유지. **유지(NOT TESTED/미착수): 실제 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 4환경과 실제 200% 확대 = NOT TESTED, 실제 Firebase GET·Canvas·이미지·저장·주문·배포 미착수.** 이 승인은 **자동검증 단계 종료**이며 실기기 검증 전 출시 완료가 아니다. **다음 스펙은 Codex 지시 대기.**

> 스펙 017 구현·자동검증 완료(로컬, 2026-07-27): `apps/mockup`에 스펙 015 ready document → 스펙 016 browse selector 기반 **단계형 탐색 UI**(케이스=모델→카테고리→템플릿 / 액자=사이즈→카테고리→호환 템플릿). 순수 selection reducer(ID만 저장·React/IO 0·selector만): 유형변경=전체초기화 / 케이스 모델변경=category·template 유지 / 액자 사이즈변경=category=all·template=null / category변경=template=null / 무효·disabled ID=no-op(동일 참조) / 같은 값=안정 no-op(토글 아님) / catalog 교체=사라진 선택 정리·**첫 항목 자동선택 없음**. 모델→템플릿 직접 필터 **미구현(근거 없음)**. 옵션은 전부 스펙 016 공개 selector로만(React 컴포넌트 raw `document.data` 필터 0), `buildCatalogBrowseIndex`는 ready에서만 `useMemo`로 document identity당 1회. 빈 모델/사이즈/템플릿 안전 안내(가짜 기본값 0)·0개 카테고리 disabled+"(0)"·진단은 **code/path 없는 일반 안내만**. 완료 시 selector label로 텍스트 요약(`role=status`)·가짜 CTA/주문/저장 0. `@denn/ui`+웜 토프 토큰만(새 색상 리터럴 0·흰색-on-accent 0), 선택 상태=체크+"선택됨"+`aria-pressed`+굵기, 모바일 단일 열·44×44·label wrap·페이지 수평 overflow 0. 게이트: frozen diff 0(의존성 manifest 무변경·신규 의존성 0)/format·lint·typecheck/**unit 202**(스펙 016 184 + reducer 18 신규)/build 독립(mockup JS gzip **67.66KB**=64.40+3.26, 예산 내)/**e2e 34 PASS·exit 0**(admin 2+스펙015+스펙017, 015 무회귀; 키보드 전용 케이스·액자 흐름 Enter/Space+focus-visible 완료 검증)/check PASS. **E2E 잔류 프로세스 조사**: before/after PID/PPID/CommandLine 차집합 결과 저장소 소속 `vite`/`esbuild` 잔류 0·포트 4183/4184 LISTENING 0·Playwright exit 0(이전 "잔류 node"는 하네스 런타임+별개 저장소 `custom-o` 혼입이었음). 실제 잔류 0이라 포트 강제 종료 안전망은 근거 없음 → **추가하지 않음**. webServer `gracefulShutdown{SIGTERM,5s}`만 유지(globalTeardown/port-kill 없음). 재생성 스크린샷은 시각변경 없어 미커밋. **viewport matrix 10개**(320×568·360×800·390×844·844×390·430×932·932×390·768×1024·1024×768·1280×800·1440×900) 전부 overflow 0·44×44·axe serious/critical 0·console 0. DOM에 raw document·이미지·path·diagnostic code·합성 secret marker 0, 정확 catalog URL만(hit 1/unexpected 0)·route miss 즉시실패·admin endpoint 0. 시각 근거 `docs/rebuild/results/spec-017/browse-{mobile-390x844,desktop-1280x800}.png`(합성만). **실제 iPhone/Android/Samsung/카카오·실제 200% 확대·실제 Firebase GET·`test:live:*` = NOT TESTED/미실행. 이 DONE은 자동검증 단계 완료이며 실기기 검증 전 출시 완료 아님.** 운영 HTML·Firebase 설정/Rules·`poc/**`·디자인 PNG·`apps/admin/**` hash UNCHANGED, Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0, Router/Zustand/새 라이브러리 0. 코드/test와 문서 커밋 분리. 핸드오프 `docs/2026-07-27-spec-017-mobile-catalog-browse-ui-handoff.md`, DONE는 스펙 하단.

> 스펙 017(2026-07-27): `docs/rebuild/specs/017-mobile-catalog-browse-ui.md`. 스펙 015 ready document와 스펙 016 selector를 `apps/mockup`에 연결한다. 제품 유형을 먼저 고르고 케이스는 모델→카테고리→템플릿, 액자는 사이즈→카테고리→템플릿으로 진행한다. 모델→템플릿 직접 관계는 근거가 없어 필터하지 않는다. 순수 ID reducer로 상위 선택 변경 시 하위 선택을 명시적으로 reset하고, 빈 collection/filter와 browse diagnostics는 가짜 기본값 없이 안전 안내한다. 모바일 320px부터 desktop·landscape의 overflow/44px/keyboard/focus/axe를 합성 route E2E로 검증한다. 실제 4환경·200% 확대는 NOT TESTED로 남긴다. 이미지·Canvas·업로드·저장·주문·Router/Zustand·실제 GET·Firebase/배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 016 = **승인 가능**(기준 HEAD `d7fc334`). `@denn/shared` 순수 browse selector(`buildCatalogBrowseIndex`+6 selectors) 확립. 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 184**(browse 67) / build 독립 / e2e 11(스펙 015 무회귀) / check PASS. **유지: 고객 탐색용 모델·카테고리·사이즈·템플릿 selector 계약 완료, `categoryId` 정확 일치, 레거시 size alias·전체 사이즈 sentinel 전부 반영, reserved/orphan/unknown은 안전 진단으로 보존, raw item·unknown·이미지·base64는 output에 없음, built-in 템플릿 미생성, 모델→템플릿 직접 관계·가격·노출 우선순위 미확정, 합성 fixture만 검증, 앱 UI 연결·Canvas·실제 네트워크·Firebase·배포 미착수.** **다음 스펙·기능 미착수(대기).**

> 스펙 016 구현 완료(로컬, 2026-07-23): `@denn/shared`에 순수 browse selector(`buildCatalogBrowseIndex` + `selectModels/CaseCategories/CaseTemplates/FrameCategories/FrameSizes/FrameTemplates`). 검증된 `CatalogDocumentV1`에서 고객 탐색 view만 추출(IO/React/Firebase/전역상태 0). `categoryId` 정확 일치, virtual `all`(case+frame)·`builtin`(frame), reserved id 충돌→`RESERVED_CATEGORY_ID`(중복 탭 없음). frame-size key 레거시 전 별칭(single 7·array 4·nested 5, `String(v).trim().toLowerCase()`·scalar string/finite number만) + all flag/sentinel/no-key→all·매칭→restricted·명시무매칭→unmatched+`UNKNOWN_SIZE_REFERENCE`. `hideInMockup===true` 제외(진단 아님), hidden/unknown size 질의→빈 결과. type builtin/uploaded/other(other=진단+전체에만), orphan categoryId→`ORPHAN_CATEGORY_REFERENCE`(전체 유지), id/name 무효→option 제외+`INVALID_DISPLAY_FIELD`. output=최소 readonly view(원본/unknown/image/base64/path 미복제), 진단 code/collection/sourceIndex만·결정적·중복 제거. 원본 순서·입력 불변(deep-freeze)·멱등(deep-equal), JSON 딥클론/ base64 순회 없음, built-in 템플릿 미생성. 게이트: frozen diff 0(shared package.json 무변경)/format·lint·typecheck/**unit 184**(browse 67 신규: 표 기반 key·sentinel·진단·all/restricted/unmatched·leak 0)/build 독립/**e2e 11**(스펙 015 무회귀)/check PASS. `@denn/shared` React/Firebase/`@denn/*` 의존 0, IO 0, 앱 import/call 0, 실제 GET·`test:live:*` 미실행. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**두 앱 소스 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, 신규 의존성 0. 코드/test 커밋과 문서 커밋 분리. 핸드오프 `docs/2026-07-23-spec-016-catalog-browse-selectors-handoff.md`, DONE는 스펙 하단. **유지: built-in 템플릿 공급원·모델→템플릿 직접 관계·가격·정렬 우선순위는 근거 없어 미구현(후속 스펙), 합성 fixture만.**

> 스펙 016(2026-07-23): `docs/rebuild/specs/016-catalog-browse-selector-contract.md`. 스펙 015가 메모리에 보유한 Catalog V1에서 고객 탐색용 최소 view를 만드는 순수 selector 계약이다. case/frame `categoryId` 정확 관계, frame size의 레거시 단일·배열·nested 별칭과 전체 사이즈 sentinel, hidden size, all/restricted/unmatched를 중앙화한다. reserved category·orphan relation·unknown type/size는 조용히 삭제하지 않고 값/path 없는 안전 진단으로 남긴다. 원본 순서·불변·멱등을 지키며 raw item·unknown·이미지/base64를 output에 복제하지 않는다. 앱 import/call·UI·실제 Firebase GET·live 명령·Firebase/배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 015 = **승인 가능**(기준 HEAD `6951685`). `apps/mockup` mount 시 스펙 013 공개 reader로 카탈로그 1회 read하는 최소 연결 셸(loading/ready/error/수동 retry). 재검증 보완(검증 2건: StrictMode+실제 reader 병합 통합 테스트·고정 sleep 제거) 반영. 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 117** / build 독립(mockup JS gzip 64.40KB) / **e2e 11**(admin 2+mockup 9) / check PASS. **유지: loading/ready/error/수동 retry 흐름 완료, StrictMode `start()→detach()→start()`에서 underlying fetch 1회(첫 caller REQUEST_ABORTED·두 번째 caller OK·최종 ready), 자동 retry/polling/persistent cache 없음, 성공 document는 메모리에만, 상품 탐색·Canvas·이미지·선택·저장·주문 미착수, 실제 endpoint 재요청 없음, Firebase SDK/Auth/write·Rules/CORS·Hosting·배포 무변경.** **다음 스펙·기능 미착수(대기).**

> 스펙 015 재검증 보완(2026-07-23, 검증 2건·**production 코드 무변경**): (1) StrictMode 생명주기 + **실제 reader** 병합 통합 테스트 추가(`strictmode-reader-integration.test.ts`, framework-free): `createPublicCatalogReader({fetch:controlledFakeFetch})`를 `PublicCatalogController`에 주입, `start()→detach()→start()`를 첫 shared fetch pending 중 실행 → gate resolve → **underlying fetch 1회**·최종 ready·첫 caller signal aborted+결과 `REQUEST_ABORTED`·두 번째 caller `OK`·stale 미덮음(timer-free microtask flush). (2) `mockup-catalog.spec.ts` 고정 sleep 제거(setTimeout 200/150 → 테스트 제어 gate: 진입→loading→gate resolve→ready), Playwright 초기 요청 테스트명 `production initial mount request is exactly once`로 정정. 재검증: frozen diff 0(의존성 무변경)/format·lint·typecheck/**unit 117**(통합 1 신규, 3회 안정)/build 독립/**e2e 11**(admin 2+mockup 9)/check PASS. production 코드/API/UI/오류매핑/reader 계약 무변경, 실제 Firebase GET·`test:live:*` 미실행, 신규 의존성 0. 코드/test 커밋과 문서 커밋 분리.

> 스펙 015 구현 완료(로컬, 2026-07-23): `apps/mockup`을 스펙 013 공개 reader로 mount 시 카탈로그 1회 읽는 최소 연결 셸로 전환. 모듈 단위 reader **singleton**(import 시 네트워크 0), framework-free `PublicCatalogController`(generation·per-load AbortController·stale/detach guard·자체 REQUEST_ABORTED 비치명)+`useSyncExternalStore` hook. **StrictMode mount→cleanup→mount에도 reader in-flight 병합으로 underlying fetch 정확히 1회**(E2E hit count 고정). retryable 오류만 수동 재시도(클릭당 새 fetch 1회, 중복 무시), 자동 retry/polling/cache 0. code→안전 한국어 메시지(코드/status/URL/path 미노출), 성공 document는 메모리에만(DOM/console/storage 직렬화 0). UI=@denn/ui Card/Button/Badge만(loading role=status·ready+warning Badge·error role=alert+retry Button), 프리미티브 데모 제거. 게이트: frozen diff 0(mockup importer에 `@denn/firebase` link만, 신규 패키지 0)/format·lint·typecheck/**unit 116**(controller 9 신규)/build 독립(mockup JS gzip 64.40KB, 250KB 예산 내)/**e2e 12**(admin 2+mockup 10, route interception+합성 fixture만·실제 network 0). E2E: 지연→ready·StrictMode 1요청·500→retry→200(2요청)·invalid JSON/catalog retry 버튼 없음·320/1280 overflow 0/axe 0/console 0·admin endpoint 0·셸 무변경. `*.live.test.ts`·`test:live:*` 미실행. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**admin 앱 소스 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, Router/Zustand/data-fetching lib 0, 신규 의존성 0. 코드/test 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-015-mockup-catalog-connection-handoff.md`, DONE는 스펙 하단. **유지: 실제 endpoint 재요청 없음(스펙 014 결과 유지), offline은 실패 UI 정상(기본 카탈로그로 숨기지 않음), 상품 탐색 화면 아님(후속 스펙).**

> 스펙 015(2026-07-23): `docs/rebuild/specs/015-mockup-public-catalog-connection.md`. `apps/mockup`이 mount될 때 스펙 013 reader로 공개 카탈로그를 읽는 첫 제품 연결이다. production reader singleton+in-flight 병합으로 React StrictMode에서도 초기 underlying fetch 1회를 보장하고, generation/abort로 stale·unmount 경합을 차단한다. UI는 접근 가능한 loading/ready/error와 retryable 오류의 수동 재시도만 제공한다. 자동검증은 fake reader와 Playwright route interception만 사용하며 실제 GET·live 명령은 0이다. 상품/템플릿 UI·Canvas·이미지·선택·저장·주문·Router/Zustand·cache·Firebase SDK/Auth/write·Rules/CORS·Hosting·배포는 제외한다.

> 스펙 015(2026-07-23): `docs/rebuild/specs/015-mockup-public-catalog-connection.md`. `apps/mockup`이 mount될 때 스펙 013 reader로 공개 카탈로그를 읽는 첫 제품 연결이다. production reader singleton+in-flight 병합으로 React StrictMode에서도 초기 underlying fetch 1회를 보장하고, generation/abort로 stale·unmount 경합을 차단한다. UI는 접근 가능한 loading/ready/error와 retryable 오류의 수동 재시도만 제공한다. 자동검증은 fake reader와 Playwright route interception만 사용하며 실제 GET·live 명령은 0이다. 상품/템플릿 UI·Canvas·이미지·선택·저장·주문·Router/Zustand·cache·Firebase SDK/Auth/write·Rules/CORS·Hosting·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 014 = **승인 가능**(기준 HEAD `7c5d04a`). 스펙 013 고정 공개 reader를 opt-in으로 실제 검증(**Node 1 + Browser 1 = GET 2회**, 둘 다 성공: Node source:network·스펙 012 통과, Browser CORS 미차단·HTTP 200·byteLength 192419≈188 KiB≤5 MiB·JSON parse OK). 순수 sanitizer가 안전 집계만(이름/ID/token/URL/base64/path/원문 0, issue는 code별 개수), live는 `*.live.test.ts` 기본 제외+별도 Playwright config·opt-in 없으면 요청 전 실패. 기본 게이트 network-free: frozen diff 0/format·lint·typecheck/**unit 107**/build 독립/e2e 4/check PASS. repo·임시경로 산출물 0(`test-results/.last-run.json`=status만·gitignored), 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·앱 소스 hash UNCHANGED, Firebase SDK/Auth/write/Rules/CORS·deploy 0, 신규 의존성 0. 도구·결과 문서 커밋 분리. 보고서 `reviews/2026-07-23-live-public-catalog-read-report.md`. **유지: 실행 시점 스냅샷·장기 가용성/offline 미검증, 총 GET 2회, 앱 연결·Firebase 변경·배포 미착수, 운영 카탈로그 원문·식별값 저장소에 없음.** **다음 스펙·앱 연결 미착수(대기).**

> 스펙 014 구현·실행 완료(로컬, 2026-07-23): 스펙 013 고정 공개 reader를 opt-in으로 실제 검증. **실제 GET = Node 1 + Browser 1 = 2회**(예산 준수), 둘 다 **성공**. Node: success/OK, `source:"network"`, 스펙 012 통과. Browser: success/OK, corsBlocked false, HTTP 200, responseType `cors`, byteLength **192419**(≈188 KiB ≤5 MiB), jsonParseOk true, elapsedMs 4227. 순수 sanitizer(`safe-summary.ts`)가 counts/codes/status/byte/elapsed/존재 boolean만 남기고 이름/ID/token/URL/base64/path/원문 0(issue는 code별 개수, path 제거). live는 `*.live.test.ts`(기본 Vitest 제외)+별도 Playwright config, opt-in(`DENN_LIVE_PUBLIC_CATALOG_READ=1`) 없으면 요청 전 실패(위장 없음). 기본 게이트 network-free: frozen diff 0(deps 무변경)/format·lint·typecheck/**unit 107**(sanitizer 11 신규, live 제외)/build 독립/**e2e 4/4**/check PASS. repo·임시경로에 response/json/tmp/log/HAR/trace/video/screenshot 0(`test-results/.last-run.json`=status만·gitignored), 포트 free. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**앱 소스 전부 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·deploy 0, 신규 의존성 0. 도구/테스트 커밋과 결과 문서 커밋 분리. 보고서 `reviews/2026-07-23-live-public-catalog-read-report.md`(§6 허용 필드만), 핸드오프 `docs/2026-07-23-spec-014-live-public-catalog-handoff.md`. **유지: 실행 시점 스냅샷(장기 가용성·offline 미보장), 실패해도 5 MiB·timeout·Rules·CORS 임의 변경 금지, 앱 연결·Firebase 변경·배포 없음.**

> 스펙 014(2026-07-23): `docs/rebuild/specs/014-live-public-catalog-read-validation.md`. 스펙 013의 고정 공개 `published/state.json` reader를 실제 환경에서 격리 검증한다. 기본 게이트는 network-free로 유지하고 명시적 opt-in에서만 Node adapter 1회와 로컬 browser CORS 1회(총 2회 이하)를 수행한다. 원문·이름·ID·URL·이미지 경로·base64·token은 저장/출력/커밋하지 않고 byte·elapsed·status·collection/issue code 개수 등 안전 집계만 문서화한다. 실패 시 5 MiB·timeout·Rules·CORS를 즉시 바꾸지 않고 safe code만 보고한다. 앱 연결·Firebase SDK/Auth/write·Rules/CORS·Hosting·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 013 = **승인 가능**(기준 HEAD `ed553b2`). `@denn/firebase` `createPublicCatalogReader` read-only 공개 카탈로그 REST adapter 확립. 재검증 보완 2라운드 반영(1라운드: 구현; 2라운드: transport-독립 timeout 상태머신·endpoint 고정·correlationId 공백 거부). 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 96**(firebase 35) / build 독립 / e2e 4 / check PASS. Firebase SDK·신규 의존성 0, `@denn/firebase`→`@denn/shared` 방향 유지, 앱 import/call 0, 실제 network/브라우저 저장소 0, 운영본·Firebase·Rules·`poc/**`·PNG 무변경, deploy 0. **유지: fake fetch만 검증(실제 CORS·캐시 header·지연 미검증, 실제 published/state.json 미요청), 5 MiB 초기 안전 상한, persistent cache·retry·offline fallback 없음, Firebase SDK·Auth·write·Rules·앱 연결·배포 무변경.** **다음 스펙·앱 연결 미착수(대기).**

> 스펙 013 재검증 보완(2026-07-23, HEAD `03f5eeb`→`d99c046`): Codex "수정 후 재검증" 2건+소형 1건. (1) **timeout을 transport 협조와 무관하게 강제** — `runFetch`를 단일 상태머신(`settle` 1회)으로 재작성, timeout timer vs work 파이프라인 경쟁. transport나 `response.text()`가 signal 무시·pending이어도 `timeoutMs`에 반드시 `NETWORK_TIMEOUT` settle, `controller.abort()`는 정리 힌트. 늦은 resolve/reject no-op(덮어쓰지 않음)+`doWork` 내부 catch로 unhandled rejection 없음, in-flight 정리→다음 load 새 fetch. (2) **endpoint 고정** — `PublicCatalogReaderOptions.location` 제거, 항상 `PUBLIC_CATALOG_LOCATION`, `buildPublicCatalogUrl()` 인자 없는 고정 builder, 호출자 URL 주입 불가. (3) **correlationId 공백 거부** — `""`+공백만(`"   "`)도 `trim`으로 요청 전 `INVALID_REQUEST`(원본 echo, 정상값 무변경). 재검증: frozen diff 0 / format·lint·typecheck / **unit 96**(firebase 35) / build 독립 / e2e 4. firebase tsconfig `types:["node"]` 추가(unhandledRejection 관측). Firebase SDK·신규 의존성 0, 앱 0 usage, 운영본·Rules·POC·PNG **UNCHANGED**, deploy 0. 코드 `d99c046`/문서 커밋 분리.

> 스펙 013 구현 완료(로컬, 2026-07-23): `@denn/firebase`에 `createPublicCatalogReader` read-only REST adapter. 고정 공개 `published/state.json` 결정적 media URL(`encodeURIComponent`→`%2F`·`?alt=media`·cache-buster 없음, 근거 mockup L848). 주입 `FetchLike`(GET·no-store·auth/body 없음·body 1회), import 시 네트워크 미접촉(미주입 시 load 시점 global fetch lazy, 없으면 `INVALID_REQUEST`). 내부 AbortController timeout(기본 10s) + caller signal, **옵션 A** 취소 격리(한 caller abort는 그 caller만 `REQUEST_ABORTED`, 공유 fetch 유지→타 caller 정상). 동시 fetch 1회 병합·settle 후 새 fetch·늦은 완료 미덮음, timer/listener 정리. 5 MiB: Content-Length 사전검사 + `TextEncoder` UTF-8 byte 재검사(string.length 아님). 안전 오류 계약(category/code/retryable/correlationId + httpStatus/스펙012 issue code·path만, body/base64/token/URL 미노출), retry/cache/stale 없음. 성공은 스펙 012 `readLegacyCatalog` 통과분만, warning은 report로 전달. 게이트 전부 통과: frozen diff 0(firebase package.json 무변경) / format·lint·typecheck / **unit 91**(firebase 30 신규) / build 독립(JS gzip ≈61.09KB) / e2e 4(앱 무변경). **Firebase SDK·신규 의존성 0**, `@denn/firebase`→`@denn/shared` 방향 유지, 앱 import/call 0, 실제 network/브라우저 저장소 0. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0(Rules/deploy=NOT APPLICABLE). 코드/test 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-013-public-catalog-adapter-handoff.md`, DONE는 스펙 하단.

> 스펙 013(2026-07-23): `docs/rebuild/specs/013-public-catalog-read-adapter.md`. `@denn/firebase`에 고정 공개 Storage 객체 `published/state.json` read-only REST adapter를 만든다. 주입 fake fetch로 URL·timeout/abort·5MiB·HTTP/JSON/Catalog V1 오류·민감정보 비노출·동시 요청 병합을 검증한다. 실제 네트워크·Firebase SDK·앱 연결·cache/retry·쓰기·Rules·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 012 = **승인 가능**(기준 HEAD `a6fd990`). `@denn/shared` legacy 카탈로그 단일 read boundary(`readLegacyCatalog`/`isCatalogDocumentV1`) 확립. 재검증 보완 2라운드 반영(1차 4건: guard 강화·nested-unknown extensions·non-finite 거부·전체 이미지 순회; 2차 2건: deep V1 guard(read 재사용)·storagePath trimStart scheme·joinPath leading-dot). 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 61**(catalog 35) / build 독립 / e2e 4 / check PASS. shared React/Firebase/`@denn/*` 의존 0·IO 0·앱 파서 0·신규 의존성 0, 운영본·Firebase·`poc/**`·PNG 무변경, deploy 0. **유지: 합성 fixture만 검증(실제 ~35MB `backup.json` 미검증), Catalog V1은 내부 읽기 모델(write/cutover 승인 아님), flat roomBackgroundSettings는 보존만(변환 안 함).** **다음 스펙·기능 구현 미착수(대기).**

> 스펙 012 2차 재검증 보완(2026-07-23, HEAD `b85810a`→`fba378b`): Codex "수정 후 재검증"(3건 승인·2건 보완). (1) `isCatalogDocumentV1`가 3키 shell + **`readLegacyCatalog(input).ok` 재사용**으로 deep contract 검사 → `{schemaVersion:1,migratedFrom:"legacy-v0",data:{models:"invalid"}}` 등 read가 fatal로 보는 V1은 guard도 false, 규칙 단일 출처(순환 없음). (2) storagePath scheme 검사 시 **검사값만 `trimStart`**(원본 보존) → `" https://"`·`"\tjavascript:"`도 `UNSAFE_STORAGE_PATH`. (3) `joinPath` helper로 leading-dot 방지 → 루트 storagePath 오류 path=`"storagePath"`(no dot). 재검증: frozen diff 0 / format·lint·typecheck / **unit 61**(catalog 35) / build 독립 / e2e 4. shared React/Firebase/@denn/* 의존 0, IO 0, 앱 파서 0, 신규 의존성 0. 운영본·POC·PNG·Firebase **UNCHANGED**, deploy 0. 코드 `fba378b`/문서 커밋 분리.

> 스펙 012 재검증 보완(2026-07-23, HEAD `32eab2e`→`aae7187`): Codex "수정 후 재검증" 4건. (1) `isCatalogDocumentV1` 얕은 guard 강화(정확히 3키 {schemaVersion:1, migratedFrom:"legacy-v0", plain-object data}만 true). (2) nested unknown 보존·경고 + 명시적 타입 계약 — known 객체/아이템(DEF L846-856 근거)의 추가 필드를 nested `unknownPaths`+`UNKNOWN_FIELD`로 보고하고 `report.extensions`(`CatalogExtensions`=path→JsonValue)로 노출, 근거 없는 컬렉션·깊은 중첩은 opaque. (3) `cloneJsonSafe`가 NaN/±Infinity를 어디서든(unknown/extensions 포함) `NON_FINITE_NUMBER`로 거부. (4) 카탈로그 전체 재귀 순회로 모든 `dataUrl`/`storagePath` 집계(watermark·중첩 editorOverlayImages 포함), `storagePath`의 **모든 URL scheme**(`javascript:`뿐 아니라 `https:` 등) `UNSAFE_STORAGE_PATH` 거부. 재검증: frozen diff 0 / format·lint·typecheck / **unit 57**(catalog 31) / build 독립(JS gzip ≈61.09KB) / e2e 4. shared React/Firebase/@denn/* 의존 0, IO 0, 앱 파서 0, 신규 의존성 0. 운영본·POC·PNG·Firebase **UNCHANGED**, deploy 0. 코드 `aae7187`/문서 커밋 분리. 주의: URL scheme storagePath는 이제 fatal(별도 스펙).

> 스펙 012 구현 완료(로컬, 2026-07-23): `@denn/shared`에 `readLegacyCatalog`/`isCatalogDocumentV1` 단일 read boundary. legacy-v0 `S`/`ADM`(또는 V1 wrapper)를 `CatalogDocumentV1` 내부 읽기 모델로 검증·정규화. JSON-safe 딥클론(함수·비평범객체·순환 거부, **원본 비변형**), unknown top-level 제자리 보존+`unknownPaths`, flat `roomBackgroundSettings`·`__opRev/__cloudRev/__publishedAt`·`dataUrl/storagePath/dual` 보존. 근거 있는 필드만 모델링(DEF L846 + legacy-analysis §4), zone/clock/mockup 내부는 opaque, unknown `frameTemplate.type`은 경고+보존. 오류 `{code,path}`만(원문·base64·토큰 없음), warning/fatal 구분, `UNSUPPORTED_SCHEMA_VERSION`·`MALFORMED_V1` 거부. 게이트 전부 통과: frozen diff 0(shared package.json 무변경) / format·lint·typecheck / **unit 50**(catalog 24 신규: 결정성·deep-freeze 불변성·legacy→V1 재입력 동등·unknown 보존·이미지 count·오류 code/path) / build 독립(JS gzip ≈61.09KB) / e2e 4(앱 무변경). **신규 스키마 라이브러리(Zod) 미설치**, React/Firebase/다른 `@denn/*` 의존 0, IO 0, 앱 파서 사용 0, 합성 fixture만(PII·실제 base64 없음). 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0. 코드/fixture/test 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-012-legacy-catalog-read-handoff.md`, DONE는 스펙 하단.

> 스펙 012(2026-07-23): `docs/rebuild/specs/012-legacy-catalog-read-contract.md`. 운영 데이터·Firebase·앱에 연결하지 않고 `@denn/shared`에서 legacy-v0 `S`/`ADM`을 `CatalogDocumentV1` 내부 읽기 모델로 검증·정규화한다. unknown/extensions·flat room 설정·리비전·dataUrl/storagePath를 보존하고 오류 code/path·통계·원본 불변·결정성·V1 재입력을 합성 fixture로 검증한다. 실제 백업·개인정보·운영 write·자동 마이그레이션·Canvas·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 011 = **승인 가능**(기준 HEAD `9c17dc9`). 프리미티브 6종(Button/Card/Badge/Chip/TextField/VisuallyHidden) + 웜 토프 토큰 계약 확립. 게이트 최종: frozen diff 0 / format·lint·typecheck / unit **26** / build 독립 / e2e **4** / **oxc·esbuild 경고 0**. 재검증 보완 2건(vitest ignored esbuild 옵션 제거·Chip disabled 계약 완성) 반영 완료. 경계 상대 침투 0·순환 0, 신규 설치(Firebase SDK/Router/Zustand/Radix/shadcn) 0, 배포 0, 운영본·Firebase·POC·PNG 무변경. **유지: 실기기 4환경은 이번 완료 조건 아니었음, 브라우저 200% 육안 재확인 미수행.** **다음 스펙·기능 구현 미착수(대기).**

> 스펙 011 재검증 보완(2026-07-23, HEAD `9baec46`→`611707d`): Codex "수정 후 재검증" 2건 최소 보완. (1) `vitest.config.ts`의 ignored `esbuild.jsx` 제거 → Vite 8 **oxc/esbuild 충돌 경고 0**(oxc가 .tsx를 automatic JSX로 기본 처리, 새 변환기/의존성 없음). (2) Chip disabled 계약 완성 → `.denn-chip:disabled`(cursor:not-allowed+dim) + hover에 `:not(:disabled)`, 정적 테스트에 native disabled 전달 검증, 두 앱 데모에 disabled Chip 1개씩 + e2e에서 존재·disabled·44px 검증. 재검증: frozen diff 0 / format·lint·typecheck / unit **26/26**(경고 0) / build 독립(JS gzip ≈61.09KB) / e2e **4/4**. 운영본·POC·PNG·Firebase 무변경, 배포 0. 코드 커밋 `611707d` / 문서 커밋 분리.

> 스펙 011 구현 완료(로컬, 2026-07-23): `@denn/ui`에 Button/Card/Badge/Chip/TextField/VisuallyHidden 6종 + 웜 토프 토큰 계약 완성. 게이트 전부 통과: frozen install diff 0 / format·lint·typecheck 0 / unit **25/25**(토큰↔CSS 드리프트 가드 + 컴포넌트 ARIA 계약) / build 독립(mockup·admin JS gzip ≈61.07/61.08KB, CSS 2.62KB) / e2e **4/4**(키보드 focus-visible·44px 터치·320/1280 overflow 0·axe serious/critical 0·console 0). React 의미 계약은 저장소 기존 `react-dom/server` renderToStaticMarkup으로 검증(**jsdom/happy-dom/RTL 미도입**), @denn/ui react/react-dom peer+dev는 기존 lockfile 버전이라 **신규 다운로드 0**. 토큰 드리프트는 이름·값 명시 검증(전체 스냅샷 아님). axe: muted가 페이지 bg(#F4F4F5) 위 4.39 미달 → 식별 문단을 흰 Card로 이동해 해소(토큰 무변경). 운영 HTML·`firebase.json`·`.firebaserc`·Rules 2종·`poc/**`·디자인 PNG **hash UNCHANGED**, Firebase SDK/Router/Zustand/Radix/shadcn 신규 설치 0, **deploy 미실행**. 코드/설정 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-011-ui-primitives-handoff.md`, DONE는 스펙 하단.

> 스펙 011(2026-07-23): `docs/rebuild/specs/011-ui-foundation-primitives.md`. `@denn/ui`의 웜 토프 토큰 계약과 Button/Card/Badge/Chip/TextField/VisuallyHidden 최소 프리미티브를 고정한다. 두 앱의 스캐폴드 셸에서 패키지 소비·모바일 44px 터치·focus-visible·ARIA·320px overflow·axe를 검증한다. 제품 기능·최종 레이아웃·Canvas·Firebase·Router/Zustand·Radix/shadcn·배포는 제외한다.

> Codex 최종 승인(2026-07-22): 스펙 010 = **승인 가능**(기준 HEAD `1d30a2c`). 모노레포 구조·품질 게이트 타당, @denn/spaces v1-only 계약 정정 완료. frozen diff 0/format·lint·typecheck 0/unit 6/6/build 독립(gzip 60.16KB)/e2e 4/4/경계(상대 침투 0·순환 0)/release-age allowlist 불필요/운영 HTML·firebase.json·.firebaserc·Rules 6 hash UNCHANGED·POC 무변경·Router/Zustand/shadcn/Firebase SDK 미설치·deploy 미실행 확인. **다음 스펙·기능 구현은 미착수(대기).**

> 스펙 010 구현 완료(로컬, 2026-07-22): 루트 pnpm workspace + `apps/mockup`·`apps/admin` + `packages/shared|firebase|spaces|render|ui`(2 apps + 5 packages). react/react-dom 19.2.7·plugin-react 6.0.3(aged patch)·TS 7.0.2·Vite 8.1.5·Tailwind v4·Biome 2.5.5·Node 24. release-age allowlist **불필요**(aged patch로 frozen EXIT 0). 게이트 전부 통과: frozen diff 0 / format·lint·typecheck 0 / unit 4/4 / build 독립(mockup·admin JS gzip 60.16KB, 예산 내) / e2e 4/4(overflow 0·console 0·axe serious 0·교차앱 격리). 경계 `workspace:*`+export(상대 침투 0·순환 0), 각 패키지 placeholder(미구현 명시). **운영 HTML·firebase.json·.firebaserc·Rules hash 전부 UNCHANGED**, POC 무변경, Router/Zustand/shadcn/Firebase SDK 미설치, **deploy 미실행**. `.gitignore` 정상화(설정 JSON `add -f` 불필요, 데이터 백업 무시 유지). 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-monorepo-scaffold-report.md`, 핸드오프 `docs/2026-07-22-spec-010-monorepo-scaffold-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 009 = **승인 가능**(기준 HEAD `1f3e67d`). 확정: Node 24 LTS major(engines `">=24 <25"`+`.nvmrc`=24) · pnpm 11.15.1+Corepack+단일 lockfile · TS 7.0.2 · **Biome 2.5.5(lint+format,`--error-on-warnings`)+`tsc --noEmit` 채택** · typescript-eslint TS7 미지원 미도입 · 최소 pnpm workspace 채택 · minimumReleaseAgeExclude Biome 9항목 유지 · minimumReleaseAge=0 안 함 · 장기 release-age 정책 NOT DECIDED · 스캐폴드 시 allowlist 재검증. **스펙 006 미확정 2건(TS7 린트·최소 workspace) 해소.** 실제 루트 apps/packages/workspace는 스펙 010에서만 생성.

> 스펙 009 구현 완료(로컬, 2026-07-22): 격리 POC `poc/toolchain-workspace/`. Corepack로 pnpm 11.15.1 실행(전역 설치·PATH 변경 없음). **채택 권고: Biome 2.5.5(lint+format, --error-on-warnings) + tsc 7.0.2 --noEmit + 최소 pnpm workspace.** typescript-eslint↔TS7 = 재현된 비호환(peer `<6.1.0`)으로 미설치(force 없음). 정상 게이트 typecheck/lint/format/test 전부 PASS, fixture 3종(lint/format/type) 정상 실패, `workspace:*`+export 경계(상대 침투 0), 단일 lockfile frozen 재현. Node 24 LTS major 고정(engines `">=24 <25"` + `.nvmrc`=24). **release-age: pnpm config=undefined이나 pnpm11 기본 정책 실제 작동 → Biome 2.5.5 allowlist(minimumReleaseAgeExclude 9항목) 유지 시 frozen EXIT 0/제거 시 EXIT 1; release-age 기간·장기 공급망 정책 NOT DECIDED, minimumReleaseAge=0 비활성화 안 함.** 설정 json은 루트 `.gitignore` `*.json` 때문에 `git add -f`. 루트 apps/packages/lockfile·운영본·Firebase·기존 POC·디자인 무변경. 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-ts7-lint-pnpm-workspace-poc-report.md`, 핸드오프 `docs/2026-07-22-spec-009-toolchain-poc-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 008 웜 토프 실기기 표시 = **승인 가능**(기준 HEAD `4df8181`). 4환경×12항목 PASS·영상 관측과 직접 확인 근거 구분·device-matrix 41줄 append-only·001~007 보존·코드/CSS/토큰/테스트/PNG/운영/Firebase/Rules 무변경·영상 저장소 미추가·preview 종료 확인. 주의: 실기기 "오류 없음"은 화면 오류 관측 카드 기준(네이티브 콘솔 원격 디버깅 아님), 데스크톱 자동검증 콘솔 0과 혼동 금지.

> 스펙 008(2026-07-22): 웜 토프 실기기 표시 = iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 **4환경 12항목 전부 PASS**(FAIL 없음). 증거=영상 `screen shot/KakaoTalk_20260722_153026136.mp4`(저장소 미추가)에서 카카오·Samsung 관측 + 사용자 추가 직접 확인, iPhone·Android는 사용자 직접 확인. Samsung·카카오 수동 회전·핀치/200% 확대 정상, 카카오 orientation lock 강제 실패→정상 fallback. 상세 기기·OS·브라우저 버전 = 미기록(추정 안 함). 코드·CSS·토큰·테스트·PNG·운영본·Firebase 무변경, preview 종료. 기록=`device-matrix.md` 스펙 008 별도 섹션(001~007 무변경). 핸드오프 `docs/2026-07-22-spec-008-warm-taupe-device-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 007 웜 토프 마이그레이션 = **승인 가능**(기준 HEAD `95c8445`). 토큰 중앙화·양 계층 일치·accent-ink `#191A1D`·명암비 정합·color-contrast 포괄 제외 없음·이전 리터럴 잔존 0·002/003/fullscreen 회귀 없음·운영/Firebase/001~006 무변경 확인. 자동검증 단계 완료, 새 팔레트 실기기 색상 = NOT TESTED(스펙 008에서 검증).

> 스펙 007 구현 완료(로컬, 2026-07-22): POC 토큰을 웜 토프 `#9F887A`/`#BAA598`/`#EEE8E1`(accent-ink `#191A1D`·kakao 유지)로 중앙 계층에서 교체. 흰색/accent 3.35(미달)→accent-ink 5.20(AA), accent-soft 위 텍스트=ink(14.31). 이전 팔레트 리터럴 실행 코드 잔존 0. 자동검증 typecheck 0 / unit 34 / build(JS gzip 66.47KB) / e2e 11(color-contrast serious/critical 0), 002 확대·003 Canvas·fullscreen 회귀 없음. 코드↔핸드오프 커밋 분리, 디자인 PNG·운영본·001~006 결과는 code 커밋 미포함. 핸드오프 `docs/2026-07-22-spec-007-warm-taupe-handoff.md`. 실기기 표시는 별도 후속 검증.

> 최신 디자인 결정(2026-07-22): Modern Studio(B) 포인트색은 **웜 토프 `#9F887A` / `#BAA598` / `#EEE8E1`**, accent-ink `#191A1D`, 카카오 `#FEE500`으로 최종 확정. 결정서 `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md`, 구현 계약 `docs/rebuild/specs/007-warm-taupe-palette-migration.md`. 이전 카라멜 앰버 스펙 004·005는 당시 검증 이력으로 보존하며 현재 팔레트 기준으로 사용하지 않는다. TS7 린트·최소 pnpm workspace POC는 스펙 007 이후로 순서를 조정한다.

> Codex 최종 승인(2026-07-22): 스펙 006 기술 스택 조사·정정 = **승인 가능**. 승인 기준: Node 24 LTS 기본 · pnpm(Corepack+packageManager+단일 lockfile) · React19/Vite8/TS7/Tailwind v4 기본 후보 · Vitest4/Playwright/axe 검증도구 · Router·Zustand 미도입(요구 시) · Radix/shadcn 컴포넌트별 · 정확 patch는 스캐폴드 직전 lockfile 고정. **미확정=TS7 린트 조합·최소 pnpm workspace 구조(소형 POC).**

> 스펙 006(2026-07-22): 읽기 전용 근거 보고 `docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md`. npm registry metadata + Tailwind 공식 문서 근거. 설치·스캐폴드·package.json/lockfile 무변경. 핵심: 스택 세대(React19/TS7/Vite8/Tailwind v4/Vitest4/Playwright1.61)는 확정 가능·전부 patch 차이. **리스크=typescript-eslint(≤6.0)↔TS 7.0.2 비호환 → 린트 전략 소형 POC 필요**. 권고: **Node 24 LTS**(POC가 24.18.0 통과, 지원 2028-04까지)·Tailwind v4·pnpm 단일 lockfile(Corepack `packageManager` 고정). @vitejs/plugin-react optional peer는 metadata상 optional=true로 **VERIFIED**. 남은 결정=라우팅/상태/UI 도입 시점·TS7 린트 전략.

> 스펙 005(2026-07-22): 새 팔레트 실기기 표시 = iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 **4환경 12항목 전부 PASS**(사용자 직접 확인, 육안). 스크린샷 = 카카오 인앱만 사용자 1장 제공(Codex 채팅 첨부 `codex-clipboard-a8e46ce7-1893-4cb7-817a-2b5875c08b73.png`, 저장소 미추가)·나머지 3환경 없음, 상세 버전 미기록, CSS.supports 기존과 동일. 코드·CSS·토큰·PNG 무변경, preview 종료. 기록=`device-matrix.md` 스펙 005 별도 섹션(001·002·003 무변경). 핸드오프 `docs/2026-07-22-spec-005-device-validation-handoff.md`.

> Codex 최종 재검증(2026-07-22): 스펙 004 팔레트 전환·accent-ink `#191A1D`·디자인 접근성 규격·POC 코드/CSS·명암비 테스트·color-contrast 포함 자동검증·002/003 자동 회귀 = **승인 가능**. 승인 기준 HEAD `7406460`.
> 스펙 004 자동검증 단계 완료. 새 팔레트 실기기 색상은 이후 **스펙 005에서 4환경 PASS·Codex 승인**으로 해소됨. **Tailwind v4 채택 확정**(결정서 2026-07-22). PNG·전체 스캐폴드·Firebase·배포는 계속 대기.

> 기본 배율 1~14: iPhone Safari·Samsung Internet·카카오 인앱 = 전체 **PASS**(Android Chrome NOT TESTED). 자동검증 Codex 승인 기준 HEAD `f4dae95`.
> **확대(200%/핀치) 접근성 게이트:** 최초 4환경 공통 FAIL을 발견했으나 스펙 002 수정·재검증으로 해소.
> **스펙 002 구현 완료(로컬):** 순수 `computeViewportLayout(scale>1.01→isZoomed, keyboardInset=0)`로 확대/키보드 구분 → `.page[data-zoomed]`로 확대 시 `.bottomnav` fixed→흐름 전환 + `.content` 120px 예약여백 정상화 + 키보드 inset 오인 제거. 색상·sheet·역스케일 미변경. 자동검증 typecheck 0 / unit 30 / build(JS gzip 66.44KB) / e2e 11 통과.
> **스펙 002 실기기 완료:** iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 확대 재검증 전부 **PASS**. 접근성 확대 FAIL 해소.
> 색상 결정: **카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA`, accent-ink `#191A1D` 확정**. PNG 재생성은 별도 후속 스펙으로 분리한다.
> **스펙 004 구현 완료(로컬):** 디자인 기준 문서 + 001 POC 코드·CSS·명암비 테스트를 카라멜 앰버로 전환. accent 위 텍스트=accent-ink(5.41:1), accent-soft/흰색 위 텍스트=ink. `#B0894E`는 흰색과 양방향 3.21:1이라 채움·보더 전용. e2e color-contrast **포괄 제외 제거**(serious/critical 0 강제). 자동검증 typecheck 0 / unit 31 / build(JS gzip 66.47KB) / e2e 11 통과. 카카오·확대(002)·Canvas(003) 로직 무변경. 핸드오프 `docs/2026-07-22-spec-004-palette-handoff.md`. 새 팔레트 실기기 색상은 NOT TESTED로 분리.
> **스펙 003 실기기 완료:** 4환경 세로↔가로 Canvas `3:4`·DPR 재검증 전부 **PASS**. 카카오 가로 FAIL 해소. Android Chrome 전체 1~14는 여전히 일부 미검증이지만 확대·Canvas 게이트는 PASS 근거 확보.

## 현재 결론

- 기존 운영 HTML과 Hosting 경로는 그대로 유지한다(무변경 확인).
- 신규 리빌드는 별도 디렉터리에 추가한다. POC = `poc/platform-compatibility/`(삭제 가능).
- Modern Studio(B) 디자인 방향은 확정됐다.
- 기술 스택은 스펙 006에서 읽기 전용 검토했고, 전체 스캐폴드 승인은 아직 나지 않았다.
- 001 POC가 구현되고 로컬 자동검증을 통과했다.
- **Tailwind v4 채택 확정**(4환경 기능 근거 확보, 결정서 2026-07-22). v3.4 병행 설치 금지.

## 브랜치/기준

- 작업 브랜치: **`rebuild/modern-studio`** (HEAD는 아래 커밋). main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.
- production 비교 기준 태그: `prod-baseline-20260721`.

## 001 POC — 완료(로컬)

- 정확 버전(npm registry): React 19.2.7 / react-dom 19.2.7 / Vite 8.1.5 / @vitejs/plugin-react 6.0.3 / TypeScript 7.0.2 / tailwindcss·@tailwindcss/vite 4.3.3 / vitest 4.1.10 / @playwright/test 1.61.1 / @axe-core/playwright 4.12.1 / @types/react 19.2.17 / @types/react-dom 19.2.3. 라이선스 전부 MIT/Apache(axe MPL, devDep).
- 패키지 매니저: npm(`npm ci` frozen). pnpm 미설치라 POC는 npm 사용(README에 근거).
- 자동검증 PASS: `npm ci` / `tsc --noEmit`(strict) / `vitest`(10/10) / `vite build`(JS gzip 65.5KB·CSS 3.3KB) / `playwright`(viewport 10/10).
- ★ 명암비 발견: 흰색/테라코타 `#C0614A` = **4.16:1**(일반텍스트 AA 미달, AA-large/UI 통과). 토큰 미변경, 대안 계산 제안(`#B85A44` 4.58:1 등) — spec §3.
- 접근성: scrollable-region-focusable 해결. color-contrast는 토큰 발견사항으로 기록(하드페일 제외).

### Codex 1차 판정 "수정 후 재검증" — 3건 보완 완료 (POC 범위 내)
1. **orientation lock 실제 시도**: `fullscreen.ts`에 순수 `orientationLockPlan(supported, inFullscreen)` + 컨트롤러가 상태 'active'(전체화면 확인) 후에만 `screen.orientation.lock('landscape')` 시도. 미지원/거부/실패는 비치명적으로 결과만 관측(`OrientationLockResult`), 화면(섹션 E)에 표시. 종료(settling)·detach 시 unlock. 단일 권위·추가 timer 없음. 유닛 3건 추가(총 13/13).
2. **LAN 주소 고정 제거**: device-matrix에서 특정 IP를 기준으로 기록하지 않고 `http://<현재-PC-LAN-IP>:4173` + 현재 IP 확인 안내(예시 IP는 예시로만 명시).
3. **NOT TESTED 명확화**: 14항목·메타 표 바로 위에 "빈 셀=NOT TESTED, 실제 결과 전 PASS/FAIL 금지" 규칙 명시.
- 재검증: typecheck/unit(13)/build(JS gzip 66.1KB)/e2e(10/10) 전부 통과. 운영파일 무변경.

### Codex 2차 판정 "수정 후 재검증" — orientation lock 비동기 종료 경합 1건 보완
- 문제: `so.lock('landscape')` await 중 FS 종료·detach 시, 늦은 성공이 stale하게 `locked`/결과 `locked`를 복원 + 종료 후 결과가 `locked`에서 안 풀림.
- 수정(`fullscreen.ts`): (1) 세대 토큰 `lockGen`(모든 시도 시작 시 ++, 종료·detach 시 ++로 무효화). (2) 순수 `isLockStillValid({attemptGen,currentGen,detached,state,inFullscreen})`로 Promise 완료 시 재확인 — 유효할 때만 `locked` 기록. (3) 늦은 성공(무효)은 `releaseOrientation()`으로 안전 unlock. (4) 종료(settling) 시 결과 `locked→idle` 초기화. (5) `detached` 플래그로 detach 후 `setLockResult`/`dispatch` 통지 차단. 단일 권위·단일 rAF 유지, 임의 timer 없음. 경합 유닛 5건 추가(총 18/18).
- 재검증: typecheck/unit(18)/build(JS gzip 66.25KB)/e2e(10/10) 통과. 운영파일 무변경. **실기기 lock 동작은 NOT TESTED 유지.**

### Codex 3차 판정 "수정 후 재검증" — React StrictMode 재attach 생명주기 1건 보완
- 문제: StrictMode(dev)가 effect를 attach→detach→attach로 재실행. `detach()`가 `detached=true`로 두는데 `attach()`가 복구 안 해, 재attach 후 `dispatch`/`setLockResult`가 계속 조기 return → FS 관측·lock 처리 비활성.
- 수정(`fullscreen.ts` attach): (1) 재attach 시 `detached=false` 복구. (2) `lockGen++`로 새 세션 시작(이전 세대 in-flight lock은 `isLockStillValid`로 계속 무효 — 세대 분리 유지). (3) 단일 attach 정책: 기존 handler 제거 후 등록. (4) 각 detach는 자기 handler만 제거(클로저 캡처). 임의 timer 없음.
- 테스트: `tests/unit/fullscreen-controller.test.ts`(DOM 목, attach→detach→attach 재활성·단일 listener·중복 attach 3건) + `tests/e2e/fullscreen.spec.ts`(FS 버튼 클릭 → 상태처리/정상 fallback 관측, 실제 FS 성공 강제 안 함).
- 재검증: typecheck/unit(**21/21**, 3파일)/build(JS gzip 66.27KB)/e2e(**11**: viewport 10 + fullscreen 1) 통과. 운영파일 무변경. **실기기 NOT TESTED 유지.**

## 실기기 검증 — 완료(3환경) / Android Chrome 대기

- **완료(2026-07-21, 사용자 수행 · Codex가 device-matrix 기록):**
  - iPhone Safari = 1~14 **PASS**. `fullscreenEnabled=false`·`orientation.lock=false`지만 정상 fallback. CSS.supports 전부 지원.
  - Samsung Internet = 1~14 **PASS**. 전부 정상. CSS.supports 전부 지원.
  - 카카오 인앱 웹뷰 = 1~14 **PASS**. Fullscreen 진입 성공(state=active), orientation lock 실패했으나 정상 fallback, 물리 가로 회전 시 가로 레이아웃 정상. CSS.supports 전부 지원.
- **대기: Android Chrome = NOT TESTED**(추정으로 PASS 금지).
- 증거: `KakaoTalk_20260721_210031114.png`, `_210414899.jpg`, `_210414899_01.jpg`, `_210705947.jpg`.
- 상세 기록: `poc/platform-compatibility/results/device-matrix.md`.
- LAN 접근(재현): `npm run preview -- --host` → `http://<이-PC-LAN-IP>:4173`(같은 Wi-Fi, 방화벽 승인 필요, 인터넷 비공개).

## 다음 작업

1. **스펙 010 Codex 재검증** — 스캐폴드 구조·경계·운영본 hash 무변경·배포 미실행 판정.
2. 이후 기능 구현 스펙 순차 진행(각각 별도 스펙): @denn/ui 컴포넌트 확장 · @denn/render Canvas · @denn/firebase SDK 연결 · @denn/spaces 암호화 · 카탈로그/주문/시안 기능 · Hosting public 격리·cutover·배포.
- **주의:** Hosting `public: "."` 상태이므로 배포 격리 전에는 어떤 Firebase deploy도 하지 않는다.

## 시작 조건

- (Android Chrome 검증 시) 사용자가 해당 기기에서 POC 접속·14항목 확인·결과 전달.
- LAN 접근 불가 시: 임시 HTTPS 채널 필요성·안전조치 보고 후 사용자 승인(임의 외부배포 금지).

## Claude Code 금지 (유지)

- 기존 HTML 이동·삭제·수정 / Firebase 연결 / 운영 데이터 접근·쓰기 / 전체 앱·모노레포 스캐폴드 / Preview·production 배포 / Tailwind v3.4 병행 설치·무근거 버전 변경 / force push·reset --hard·clean·자동 merge.

## 검증 요청 형식

```text
검증 요청
커밋: <hash>
목적: <변경 목적>
변경 파일: <목록>
실행한 검사: <명령과 결과>
미검증: <항목>
남은 위험: <위험>
롤백: <방법>
```
> **다음 작업 READY (2026-07-27):** 스펙 019 `docs/rebuild/specs/019-canvas-geometry-contract.md`. `@denn/render`에 DOM/Canvas/React/Firebase/IO 없는 순수 geometry 계약만 구현한다: cover draw rect·레거시 pan clamp·percent zone→logical rect·client→logical point·portrait/landscape aspect·CSS size+DPR/cap→backing size. 레거시 `abs` clamp를 호환 수학으로 유지하고 입력은 변경하지 않는다. DPR cap은 필수 입력으로 받아 2/4 중 제품 정책을 확정하지 않는다. 앱 Canvas/hook·pointer·회전 draw·layer plan·이미지/CORS·text/clock·print/export·주문은 모두 제외한다. 기존 스펙 015~018 E2E는 회귀만 확인하며 새 Canvas E2E로 꾸미지 않는다.
