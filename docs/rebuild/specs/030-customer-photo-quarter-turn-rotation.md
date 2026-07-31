# 스펙 030 — 고객 사진 90° 단위 회전

상태: **READY FOR IMPLEMENTATION**

근거:

- 조사 커밋 `8734307`
- Founder 결정 정본 커밋 `cf1cfd2`
- `docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`
- `docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`

## 1. 목적과 범위

case/frame 고객 사진에 왼쪽·오른쪽 90° 회전을 제공한다. 회전은 활성 사진 슬롯별
normalized transform에 저장하고 render plan까지 전달한다. template art, 액자 aspect,
임의 각도, print/export 구현은 이번 범위가 아니다.

## 2. 확정 계약

- `NormalizedTransform`은 `{scale,x,y,rotationQuarterTurns}`이며 회전 값은 `0|1|2|3`만
  허용한다. 각 필드는 예외 경계 안에서 정확히 한 번 읽어 plain snapshot으로 만든다.
- invalid, non-finite, getter drift, throwing/revoked Proxy는 복구·clamp·기본값 생성 없이
  안전 실패한다.
- 회전 버튼은 현재 값을 modulo 4로 정확히 한 단계만 변경한다. 왼쪽은 `-1`, 오른쪽은
  `+1`이며 실제 버튼 이름은 `왼쪽으로 90°`, `오른쪽으로 90°`다.
- scale 1.0~5.0, normalized pan `[-1,1]`, 화면축 pan, 빈 공간 금지, D-9 초기화 행렬을
  그대로 유지한다. 초기화는 회전도 0으로 되돌린다.
- case는 활성 슬롯별로 독립 저장한다. frame은 단일 슬롯이다. 전역 회전 상태나 fallback을
  만들지 않는다.
- probe plan에도 회전을 전달한다. 90°/270°에서는 cover 입력 footprint의 width/height를
  바꾸어 `maxPan`을 계산하고, 기존 normalized pan을 새 `maxPan`에 재환산한다.
- `packages/render`의 `draw-image-cover`에 선택적
  `rotationQuarterTurns?: 0|1|2|3`만 추가한다. 생략 또는 0이면 기존 plan 결과와 픽셀
  실행 순서가 동일해야 한다. 신규 draw command는 만들지 않는다.
- executor는 기존 clip 안에서 회전 중심을 `zone 중심 + 현재 logical pan`으로 잡고
  `save → clip → translate(center) → rotate → drawImage(center-relative) → restore`를
  한 command 안에서 완결한다. 예외가 나도 restore 짝과 다음 command 격리를 보장한다.
- template art의 `draw-image-stretch`에는 회전 필드를 추가하지 않는다.
- EXIF를 직접 파싱하거나 신규 의존성을 추가하지 않는다. 브라우저 `<img>` decode와
  `naturalWidth/naturalHeight`를 합성 EXIF JPEG fixture로 실측하며, 실측하지 못한 브라우저와
  실기기는 NOT TESTED로 남긴다.

## 3. 오류 우선순위

1. slot/geometry/intrinsic/normalized transform snapshot 실패
2. transform scale/pan/rotation 유한성·범위 실패
3. 회전을 포함한 probe cover/`maxPan` 실패
4. 실제 plan adapter/build 실패
5. executor command snapshot/실행 실패

실패 시 preview를 차단하고 부분 plan, 이전 transform, 회전 0 fallback을 사용하지 않는다.
오류 payload에는 URL, imageRef, catalog 원문, slot ID, 예외 원문을 포함하지 않는다.

## 4. 구현 허용 파일

- `packages/render/src/plan/types.ts`
- `packages/render/src/plan/build.ts`
- `packages/render/src/plan/build.test.ts`
- `apps/mockup/src/canvas/executePreviewPlan.ts`
- `apps/mockup/src/canvas/executePreviewPlan.test.ts`
- `apps/mockup/src/canvas/productPlan.ts`
- `apps/mockup/src/canvas/productPlan.test.ts`
- `apps/mockup/src/preview/imageTransform.ts`
- `apps/mockup/src/preview/imageTransform.test.ts`
- `apps/mockup/src/preview/PreviewComposer.tsx`
- `apps/mockup/src/preview/PreviewComposer.test.tsx`
- `apps/mockup/src/preview/previewContracts.ts`
- `apps/mockup/src/preview/previewContracts.test.ts`
- `apps/mockup/src/canvas/surface.css` — 기존 편집 컨트롤과 같은 스타일에 필요한 최소 변경만
- `tests/e2e/mockup-preview.spec.ts`
- EXIF 실측에 필요한 저장소 내부 합성 fixture 1개 — 기존 test fixture 디렉터리를 재사용
- 스펙 030 handoff/review/live/CURRENT/Automation 문서

금지:

- `packages/render/src/geometry/**`
- `apps/mockup/src/canvas/localImageBinding.ts`
- `apps/mockup/src/canvas/templateArtBinding.ts`
- `packages/shared/src/catalog/images/placement.ts`
- `apps/admin/**`, 운영 HTML, Firebase/CORS/Rules/Hosting, POC
- `package.json`, `pnpm-lock.yaml`, 신규 의존성
- network/live/deploy, 운영 데이터·이미지 접근
- 알려진 스펙 018 PNG 2개

허용 파일 확장이 필요하면 구현을 멈추고 정확한 경로·이유·최소 확장안을 보고한다.

## 5. 필수 검증

Unit:

- 회전 좌/우 modulo 4, 초기화, scale/pan 불변
- `0|1|2|3` 외 값, non-finite, hostile getter/Proxy/revoked Proxy/drift 거부
- case 슬롯 독립성과 frame 단일 슬롯, 교체/삭제/실패/model/template/frame-size/kind의
  D-9 초기화 행렬에 회전 포함
- 0/180과 90/270 footprint, `maxPan` 축 교환, normalized 구도 보존, 빈 공간 0
- probe와 실제 plan 모두 회전 전달
- 회전 필드 생략/0의 기존 plan·executor 호환성
- executor translate/rotate/draw/restore 순서, 중심 좌표, 다음 command 격리
- template art 무회전

실제 Chromium E2E:

- case와 frame에서 좌/우 버튼의 실제 픽셀 footprint 변화
- case multi-zone 슬롯별 독립 회전
- 회전 후 drag/zoom, resize, 초기화에도 clip 빈 공간 0과 구도 보존
- 키보드로 회전 버튼 조작, 320px 스크롤 보존, 44px target
- console error 0, axe serious/critical 0, 고정 sleep 0
- 합성 EXIF JPEG의 decode 크기·실제 픽셀 방향을 기록

게이트:

- frozen install, lockfile diff 0, 신규 의존성 0
- format, lint, typecheck, unit, 독립 build, 전체 E2E, `git diff --check`
- bundle/CSS 증분, 포트 4183/4184, OS temp, 잔류 프로세스
- 고객 dist SHA-256 E2E 전후 동일, fixture 잔존 0
- 실제 변경 파일이 허용 목록과 일치

NOT TESTED로 남길 항목:

- iOS Safari, Android Chrome, 삼성 인터넷, 카카오 인앱의 실제 EXIF·조작성
- 실제 카메라 원본 orientation 1~8 전체
- 실제 print/export 출력물 회전
- 대용량 이미지 성능·메모리, 임의 각도

## 6. 완료 조건

제품 코드·테스트 커밋과 문서 커밋을 분리해 일반 fast-forward push한다. Claude push 뒤
HEAD=origin, ahead/behind 0/0에서 Codex가 독립 검증한다. Codex 승인 전에는 종료 문서를
작성하거나 다음 스펙을 시작하지 않는다.

### DONE (Claude Code, 2026-07-31) — READY_FOR_CODEX

코드/test 커밋 `fbbadeb`, 기준 계약 `2777010`. 인계
`docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`.

구현 요약: 슬롯별 `rotationQuarterTurns 0|1|2|3` + 좌/우 90° 버튼 + probe/실제 plan 모두 회전 전달 +
회전 footprint 기반 `maxPan` 재환산 + `draw-image-cover` 선택 필드(0이면 미emit → pre-030 plan과 바이트
동일) + executor 커맨드 내부 `save→clip→translate→rotate→drawImage→restore`(중심 = drawRect 중심).
scale 1.0~5.0·빈 공간 금지·normalized pan·D-9 초기화 행렬(회전 포함)·template art 고정 유지.
invalid/hostile/drift transform은 복구 없이 거부.

게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
**unit 989**(944→989) / build mockup JS 265.53 kB gzip 82.11, CSS 15.50/3.89, admin 무변경 /
**E2E 99 PASS**(91→99) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
고객 dist SHA-256 E2E 전후 동일·fixture 0 / network·live·deploy 0.

★ R-6 실측(저장소 최초): `Orientation=6` 합성 JPEG(40×20)이 Chromium에서 **20×40으로 decode**된다 →
브라우저가 EXIF를 **적용**하므로 직접 파싱은 이중 회전이 된다. 조사 보고서의 NOT VERIFIED는
**Chromium 한정 해소**, 타 엔진·실기기는 NOT TESTED 유지.

★ 판단 요청 1건: `apps/mockup/src/canvas/types.ts`(executor 포트)에 `translate`/`rotate`가 없고 §4 허용
목록 밖이라, 허용 파일을 확장하는 대신 **executor 내부 런타임 검사 + 회전 command가 있을 때만 요구 +
없으면 preflight fail-closed**로 구현했다. 공개 포트 타입이 실제 요구를 전부 기술하지 못하는 트레이드오프가
있으므로, `types.ts`를 허용 목록에 넣어 선택적 멤버로 선언하는 편이 낫다면 그 방향으로 보완한다.
상세는 인계 문서 §3.2.

NOT TESTED 유지: 실기기 4환경 EXIF·조작성, 카메라 원본 orientation 1~8, 실제 print/export 회전,
대용량 성능·메모리, 임의 각도, 실제 200% 확대.

스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다.

### CODEX_PASSED (2026-07-31)

Codex가 보완 라운드 1 코드 `603cd25`와 문서 `1aa3302`를 독립 재검증해 **승인**했다.

확인된 것:

- 공개 포트의 **선택적 rotation capability**, **fail-closed 계약**, **단일 타입 정본**
- frozen install, format·lint·typecheck, **unit 995/995**, mockup/admin build
- 실제 Chromium **E2E 99/99**, `git diff --check`, dist SHA-256 전후 동일
- lockfile·신규 의존성·금지 경로 diff **0**, 포트 4183/4184 **0**, OS temp **0**
- **Chromium 합성 EXIF `Orientation=6` 적용은 검증됨**(40×20 → 20×40 decode).
  그 밖의 엔진·실기기는 NOT TESTED로 유지한다.

구현 판정: 슬롯별 `rotationQuarterTurns 0|1|2|3`, 좌/우 90° 버튼, probe·실제 plan 모두 회전 전달,
회전 footprint 기반 `maxPan` 재환산, `draw-image-cover` 선택 필드(0이면 미emit → pre-030 plan과 바이트
동일), executor 커맨드 내부 `save→clip→translate→rotate→drawImage→restore`(중심 = drawRect 중심).
scale 1.0~5.0·빈 공간 금지·normalized pan·D-9 초기화 행렬(회전 포함)·template art 고정 유지.
invalid/hostile/drift transform은 복구 없이 거부. `packages/render/src/geometry` 무변경.

**NOT TESTED (종료 시점 유지)**:

- **잔류 프로세스 command-line 검사** — OS 권한 거부로 실행하지 못함
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)의 EXIF·조작성
- 실제 카메라 원본 **orientation 1~8 전 범위**
- **실제 print/export 출력물의 회전**(인쇄 경로는 아직 이 plan을 소비하지 않는다)
- 대용량 이미지 회전 **성능·메모리**
- 실제 **200% 브라우저 확대**
- 임의 각도(R-1·R-2로 제외)

스펙 030은 **DONE**이다. 다음 스펙은 Codex 지시 전까지 착수하지 않는다.
