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
