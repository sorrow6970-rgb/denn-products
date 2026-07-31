# 스펙 033 — 로컬 액자 PNG export

상태: `READY_FOR_CODEX` (구현 `4246503`, Codex 독립 검증 대기)

## 목적

스펙 032의 명시적 액자 실물 치수와 스펙 031까지 승인된 최신 preview plan을 사용해,
고객 브라우저에서 시험용 PNG를 로컬로 내려받는다. 이번 단위는 로컬 생성·다운로드·검증만
포함한다. 업로드, 주문 저장·전송, 카카오, Firebase, network, live, deploy 경로는 만들지 않는다.

## 확정 결정

- **E-1/C-1**: 승인된 preview plan 인스턴스를 그대로 사용한다. 앱이 소유한 detached
  `HTMLCanvasElement`의 `CanvasRenderingContext2D`에
  `setTransform(printScale, 0, 0, printScale, 0, 0)`을 적용한 뒤 기존 executor를 실행한다.
  plan 재빌드, 인쇄 폭 재측정, prewrapped 입력, plan 좌표 scaling은 금지한다.
- **E-2**: 비정수 배율, glyph 단위 자간, clip 반픽셀 위험은 구현 계약을 바꾸는 사전 추측으로
  해소하지 않는다. 실제 Chromium pixel E2E에서 preview와 export를 같은 크기로 정규화해 판정한다.
  불일치하면 통과시키지 않고 `CORRECTION_REQUIRED`로 돌린다.
- **E-3**: `minLongSide`와 `maxPixels`를 동시에 만족하지 못하면 크기를 조용히 타협하지 않고
  파일 생성 전 fail-closed한다.
- **E-4**: 파일명은
  `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`이다. 고객 문구·catalog id·token·사이즈
  이름은 넣지 않는다. cm 문자열 정규화와 로컬 시각 formatting은 순수 함수로 고정한다.
- **E-5**: 미리보기 아래 주문 CTA와 분리된 영역에 `인쇄용 파일 내려받기` 버튼을 둔다.
  cm 미입력·무효 시 `이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다.`를 표시하고
  `aria-describedby`로 비활성 버튼과 연결한다. plan 미준비는 기존 `PREVIEW_MESSAGES` 사유를
  재사용한다. 생성 실패는 `인쇄용 파일을 만들지 못했습니다.`이며 자동 retry와 “다시 시도” 문구는 없다.
- **E-6**: `인쇄 설정은 인쇄소 확인 전 임시값입니다.`를 항상 표시한다. 300dpi, 3000,
  36M, 결과 픽셀 크기는 고객 UI에 노출하지 않는다.

## 크기 계산 계약

- 입력은 스펙 032 projection의 finite 양수 `widthCm`·`heightCm`뿐이다. `null`·오류·이름·aspect
  fallback은 허용하지 않는다.
- provisional 상수는 한 순수 모듈에 둔다:
  `dpi=300`, `minLongSide=3000`, `maxPixels=36_000_000`.
- 최초 각 변은 `round(cm / 2.54 * dpi)`로 계산한다.
- 긴 변이 `minLongSide`보다 작으면 uniform upscale하고, 총 픽셀이 `maxPixels`를 넘으면 uniform
  downscale한다.
- 최종 정수 폭·높이가 finite 양수이고 두 제약을 동시에 만족하는지 다시 검사한다.
  둘 중 하나라도 만족하지 못하면 구조화된 안전 오류를 반환하고 canvas·blob·파일을 만들지 않는다.
- `fallbackLongSide=3508`과 레거시 하한 900은 재현하지 않는다.

## export 실행 계약

1. `plan !== null`, 유효한 physical size와 같은 render cycle의 `imageBindings`를 입력으로 받는다.
2. detached canvas의 backing width/height를 계산된 정수 픽셀로 설정한다.
3. `printScale = outputWidth / plan.logicalCanvas.width`이며,
   `outputHeight / plan.logicalCanvas.height`와 허용 오차 내 동일해야 한다. 아니면 fail-closed한다.
4. identity에서 시작해 uniform `setTransform`을 정확히 한 번 적용하고 기존 executor에 같은
   plan 인스턴스와 bindings를 전달한다.
5. executor가 `ok:false`면 `toBlob`을 호출하지 않는다.
6. executor 성공 뒤에만 `toBlob("image/png")`을 호출한다. 동기 throw, `blob === null`,
   taint는 파일 0개·retry 0으로 끝낸다.
7. 성공한 blob만 object URL로 내려받는다. 생성자가 revoke하며 살아 있는 URL은 최대 1개다.
   새 export와 unmount에서 이전 URL을 정리한다.
8. plan, bindings, 고객 입력을 변경하거나 고객 문구 원문을 별도 저장·전송하지 않는다.

## 허용 파일

- `apps/mockup/src/print/printSize.ts` (신규)
- `apps/mockup/src/print/printSize.test.ts` (신규)
- `apps/mockup/src/print/exportFramePng.ts` (신규)
- `apps/mockup/src/print/exportFramePng.test.ts` (신규)
- `apps/mockup/src/preview/PreviewComposer.tsx`
- `apps/mockup/src/preview/PreviewComposer.test.tsx`
- `apps/mockup/src/preview/previewContracts.ts`
- `apps/mockup/src/preview/previewContracts.test.ts`
- `apps/mockup/src/canvas/surface.css`
- `tests/e2e/mockup-preview.spec.ts`
- 이 spec과 관련 handoff/CURRENT/live/Automation 문서

## 금지 범위

- `packages/render/**`, `packages/shared/**`, `apps/admin/**`
- `apps/mockup/src/canvas/surface.ts`, image binding owner, placement, geometry
- 운영 HTML, manifest, lockfile, 신규 의존성
- upload/order payload/IndexedDB order/Kakao/Firebase/network/live/deploy
- 고객 문구 원문의 파일명·metadata·저장·전송

## 필수 테스트

- 순수 크기 계산: 정상 portrait/landscape/소수 cm, min upscale, maxPixels downscale,
  두 제약 충돌, null/0/음수/NaN/Infinity/극단 비율, 결정성·입력 비변형.
- export unit: 동일 plan 인스턴스, JSON 직렬화 전후 불변, uniform transform,
  크기 설정→transform→executor→toBlob 순서, executor 실패/toBlob null·throw 시 파일 0·retry 0.
- URL lifecycle: 성공 URL 최대 1개, 교체·unmount revoke, 실패 시 URL 0.
- UI: 정확한 문구, 독립 영역, cm/plan 사유와 `aria-describedby`, 중복 클릭 방지,
  오류 payload와 DOM에 코드·URL·원문 비노출.
- Chromium E2E: portrait/landscape, non-integer scale, 텍스트 자간, rotated/panned photo,
  clip 경계와 layer order를 포함해 정규화 픽셀 동일성 확인. 같은 고정 입력의 PNG byte가 두 번 동일해야 한다.
- P-3: art/image/font/plan 준비 실패에서 다운로드 파일 0, `toBlob` 0, retry 0.

## 게이트

- frozen install, lockfile diff 0
- format, lint(`--error-on-warnings`), typecheck, 전체 unit
- 독립 build, 전체 Chromium E2E
- `git diff --check`, forbidden diff 0
- 고객 dist SHA-256 비교, ports 4183/4184, OS temp staging, 안전한 범위의 잔류 프로세스 확인
- 실제 인쇄물·실기기·대용량 메모리/성능·인쇄소 수용성은 `NOT TESTED`로 명시한다.

## 종료 조건

모든 게이트 통과 후에도 결과는 **시험용 로컬 PNG**다. 인쇄소의 해상도·색공간/ICC·bleed·파일
형식·최대 크기 확인 전 upload/order/deploy는 계속 금지한다. 스펙 종료 문서는 별도 fast-forward
커밋으로 처리하고, 개별 DONE 뒤에는 다음 권장 읽기 전용 조사로 자동 전환한다.

---

### DONE (Claude) — 2026-07-31, 커밋 `4246503`

구현/테스트 커밋 `4246503`, 종료 문서는 별도 커밋. 기준 HEAD `4ee162e`.

#### 바꾼 파일 (허용 목록 안)

| 파일 | 내용 |
| --- | --- |
| `apps/mockup/src/print/printSize.ts` (신규) | provisional 상수 + cm→px + 파일명 (전부 순수) |
| `apps/mockup/src/print/printSize.test.ts` (신규) | 23 tests |
| `apps/mockup/src/print/exportFramePng.ts` (신규) | detached canvas + uniform transform + executor + `toBlob` + URL 수명 |
| `apps/mockup/src/print/exportFramePng.test.ts` (신규) | 28 tests (전부 fake port) |
| `apps/mockup/src/preview/PreviewComposer.tsx` | seam·버튼·비활성 사유·중복 클릭 방지·unmount 정리 |
| `apps/mockup/src/preview/PreviewComposer.test.tsx` | UI 9 tests |
| `apps/mockup/src/preview/previewContracts.ts` | `PRINT_MESSAGES` |
| `apps/mockup/src/preview/previewContracts.test.ts` | 문구 규율 5 tests |
| `apps/mockup/src/canvas/surface.css` | `.denn-print` 블록 |
| `tests/e2e/mockup-preview.spec.ts` | Chromium 13 tests |

#### 계약 구현 요지

- **E-1/C-1**: plan 인스턴스를 **그대로 전달**한다. 재빌드·재측정·prewrapped 입력·plan 좌표 scaling **0**.
  `draw-text`의 `lines`가 이미 확정값이라 **재wrap될 여지가 구조적으로 없다** → P-6이 성립한다.
  unit이 **plan identity(`toBe`)** 와 **JSON 직렬화 전후 불변**을 고정한다.
- **transform**: identity에서 `setTransform(s,0,0,s,0,0)`을 **정확히 한 번**. `a===d`, `b===c===e===f===0`을
  unit으로 고정. `outputHeight/logicalHeight`와 어긋나면 **`NON_UNIFORM_SCALE`로 fail-closed**.
- **순서**: 크기 지정 → setTransform → executor → (**ok일 때만**) `toBlob` → URL → 다운로드.
  호출 로그 순서를 unit으로 고정했다.
- **E-3**: 최종 정수에 대해 두 제약을 **재검사**한다.
- **P-3**: executor 실패·`blob === null`·`toBlob` throw(taint) 전부 **파일 0, retry 0**.
- **URL 수명**: 생성자가 revoke, 살아 있는 URL **최대 1개**, 교체·unmount·dispose에서 정리.
  E2E가 3회 export 후 **created 3 / revoked 2**를 확인한다.
- **E-4/E-5/E-6**: 파일명 `denn-frame-21x29.4cm-20260731-153042.png` 형태, 주문 CTA와 분리,
  `aria-describedby`, 수치 비노출(E2E가 print 영역 텍스트에 **숫자 0개**임을 확인).

#### ★ 보고할 관측 2가지

1. **E-3 재검사는 현재 상수로는 도달 불가능하다.** upscale 경로는 총 픽셀이 최대 `3000×3000 = 9MP`라
   36MP 천장을 넘을 수 없고, downscale 경로는 총 36MP라 긴 변이 최소 `sqrt(36M) = 6000`이라 3000 바닥을
   깰 수 없다. **가드는 유지**했다 — 상수가 바뀌면(바닥 상향·천장 하향) 그때 의미가 생기고, 그것이
   레거시가 재검사하지 않아 생긴 문제를 막는 지점이기 때문이다. 이 사실과 이유를 unit으로 고정했다.
2. **카탈로그 `aspect`와 cm 비율이 다르면 인쇄가 나오지 않는다.** 스펙 032는 이 불일치를 **자동
   수정하지 않고 진단 후보로만** 남겼으므로, export는 축별로 다른 배율을 적용해 **고객이 승인한 배치를
   왜곡하는 대신 `NON_UNIFORM_SCALE`로 실패**한다. E2E에 전용 테스트를 넣었다.
   → **운영자 cm 입력 UI 스펙에서 이 불일치를 어떻게 다룰지 결정이 필요하다.**

#### 검증 결과

| 게이트 | 결과 |
| --- | --- |
| frozen install | PASS (`Already up to date`) |
| lockfile diff | **0** |
| format / lint(`--error-on-warnings`) / typecheck | PASS |
| unit | **1174/1174 PASS** (032 시점 1109 → **+65**) |
| 독립 build | PASS |
| 전체 Chromium E2E | **129/129 PASS** (032 시점 116 → **+13**) |
| 고객 dist SHA-256 (E2E 전후) | **동일** `9273f59b…a1580b` |
| `git diff --check` | 클린 (CRLF 경고만) |
| forbidden diff | **0** |
| ports 4183/4184 LISTENING | **0** |
| OS temp `denn-e2e-*` | **0** |

#### NOT TESTED

- **실제 인쇄물과 인쇄소 수용성** (해상도·색공간/ICC·재단 여백·파일 형식·최대 크기)
- **실기기** `toBlob` 한계, **대용량 이미지 메모리·성능**
- 잔류 프로세스 command-line

**P-4a에 따라 업로드·주문 전송·배포는 계속 금지**다. 이 단위의 산출물은 **시험용 로컬 PNG**다.
