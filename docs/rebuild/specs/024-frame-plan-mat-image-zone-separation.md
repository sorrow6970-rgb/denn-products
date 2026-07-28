# 024 — 액자 render-plan mat·image zone 분리

## 목표 (WHY)

스펙 020의 액자 plan이 mat 영역과 사용자 사진 영역을 하나의 `imageZone`으로 함께
사용하는 구조를 바로잡는다.

레거시 액자 preview는 frame band 안쪽 전체에 mat를 칠한 뒤, 일반 builtin `full`
템플릿의 사진은 다시 `P=8`만큼 inset된 영역에 그린다. 현재 계약으로 다음 앱
어댑터를 만들면 mat ring이 사라지거나 사진 영역이 8px 커지는 잘못된 plan만 만들 수
있다. 따라서 실제 상품 plan 조립 전에 `FramePlanInput`에 `matRect`와 `imageZone`을
분리하고 실제 Canvas 픽셀로 두 영역의 차이를 고정한다.

근거:

- `denn-mockup-tool.html:3120-3130`
- `packages/render/src/plan/types.ts:70-83`
- `packages/render/src/plan/build.ts:240-285`
- `packages/render/src/plan/build.test.ts:333-349`
- `docs/rebuild/specs/020-deterministic-render-plan.md`
- `docs/rebuild/specs/021-canvas-plan-executor.md`
- `docs/rebuild/specs/022-react-canvas-surface-lifecycle.md`
- `docs/rebuild/specs/023-catalog-preview-geometry-projection.md`

## 범위 (SCOPE)

### 포함

- `FramePlanInput`에 필수 `matRect` 추가
- frame body·mat·image의 서로 다른 rect 사용
- logical canvas 안의 `frameRect`, 그 안의 `matRect`, 그 안의 `imageZone` 포함관계 검증
- finite 계산 overflow 차단
- malformed runtime 입력 throw 방지
- 기존 plan/executor/surface 회귀 검증
- 실제 Chromium 픽셀로 frame band·mat ring·image 영역 구분

### 제외(하지 않을 것)

- 스펙 023 geometry→plan 앱 어댑터 구현
- 고객 탐색 UI나 Canvas surface 연결
- 실제 `P=8` 값을 앱 입력에 자동 적용
- uploaded transparent template의 `P=0` 판정
- 케이스/액자 색상 선택 UI
- 사용자 이미지 upload/load·binding 생성·URL·CORS
- `@denn/shared` projection 계약 변경
- inner border 4-band·alpha mat outline·frame shadow·grain·gradient
- 원형·라운드·multi-zone·text/clock/template overlay
- pointer/touch/wheel/pinch·회전
- print/PNG/export·저장·주문
- Firebase SDK/Auth/write/Rules/CORS/Hosting 변경·배포
- 운영 HTML·관리자 앱·POC·디자인 PNG 변경
- 실제 네트워크·live test·실기기 검증

## 대상 (WHERE)

주 구현 대상:

- `packages/render/src/plan/types.ts`
- `packages/render/src/plan/build.ts`
- `packages/render/src/plan/build.test.ts`
- 필요한 plan export 주석
- `apps/mockup`의 Canvas E2E fixture와 해당 E2E test

허용되는 앱 변경은 테스트 전용 Canvas fixture뿐이다. 고객 `App.tsx`, `BrowseFlow`,
catalog controller, production Canvas surface API·CSS는 변경하지 않는다.

변경 금지:

- `packages/shared/**`
- `packages/firebase/**`
- `packages/ui/**`
- `packages/spaces/**`
- `apps/admin/**`
- 고객 mockup UI
- 운영 HTML, Firebase 설정·Rules, `poc/**`, 디자인 PNG

신규 외부 의존성은 추가하지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 계약 정정

`FramePlanInput`을 다음 의미로 정정한다.

```ts
interface FramePlanInput {
  readonly kind: "frame";
  readonly logicalCanvas: Size;
  readonly frameRect: Rect;
  readonly matRect: Rect;
  readonly imageZone: Rect;
  readonly frameColor: HexColor;
  readonly matColor: HexColor;
  readonly image: ImageIntrinsicSize;
  readonly transform: ImageTransform;
  readonly imageRef: string;
  readonly innerBorder?: StrokeSpec;
}
```

- `frameRect`: frame body가 차지하는 전체 사각형
- `matRect`: frame band 안쪽의 mat 채움 사각형
- `imageZone`: mat 안에서 사용자 사진이 clip·cover되는 사각형

`matRect`는 필수다. `matRect ?? imageZone` 같은 호환 fallback을 만들지 않는다.
현재 production 앱 caller가 없고 기존 fixture/test만 있으므로 모든 caller를
명시적으로 수정한다.

### 2. command 매핑

frame command 순서는 유지한다.

1. `frame:body` — `frameRect`
2. `frame:mat` — `matRect`
3. `frame:user-image` — clip=`imageZone`, cover draw rect도 `imageZone` 기준
4. 선택적 `frame:inner-border`

`innerBorder`는 기존 계약을 유지하며 rect는 기존처럼 `imageZone`을 사용한다. 이것은
레거시 4-band fill과 동등하다는 뜻이 아니며, 상품 앱 어댑터는 후속 결정 전
`innerBorder`를 공급하지 않는다.

executor 명령 vocabulary와 실행 순서는 변경하지 않는다.

### 3. 포함관계

성공 plan은 다음 exact containment를 만족해야 한다.

```text
logicalCanvas rect contains frameRect
frameRect contains matRect
matRect contains imageZone
```

- origin은 finite여야 한다.
- width/height는 finite positive여야 한다.
- `x + width`, `y + height`가 overflow로 non-finite이면 `NON_FINITE_RESULT`.
- finite지만 바깥으로 벗어나면 `INVALID_ZONE`.
- epsilon/tolerance·clamp·abs·round를 넣지 않는다.
- rect를 자동 축소·이동하지 않는다.
- edge가 정확히 같은 것은 포함으로 허용한다.
- `frameRect`가 logical canvas와 반드시 같은 크기일 필요는 없지만 밖으로 나갈 수 없다.

### 4. runtime 안전

- `matRect`의 null·undefined·primitive·부분 객체는 `INVALID_ZONE`.
- hostile getter, Proxy get/has trap, revoked Proxy가 밖으로 throw하지 않는다.
- rect 값을 한 번 읽어 plain normalized snapshot으로 복사하거나 동등하게 getter
  drift를 차단한다.
- 검증 뒤 command 생성이 caller object를 다시 읽지 않게 한다.
- failure payload에 rect 값·imageRef·URL·token·원문 예외를 넣지 않는다.
- 기존 `RenderPlanResult` error code 집합을 확장하지 않는다.
- 케이스 plan 계약·정렬·geometry는 변경하지 않는다.

### 5. 문서 정합성

스펙 020의 `FramePlanInput` 현재 계약과 DONE 하단에 스펙 024 정정을 append한다.
과거 승인 기록·게이트 수치는 보존한다. CURRENT와 신규 handoff도 갱신한다.

### 6. Unit 검증

최소 다음을 고정한다.

- body=`frameRect`, mat=`matRect`, image clip=`imageZone`
- 세 rect가 서로 다른 정상 입력
- 동일 edge containment 허용
- frameRect가 canvas 밖이면 `INVALID_ZONE`
- matRect가 frameRect 밖이면 `INVALID_ZONE`
- imageZone이 matRect 밖이면 `INVALID_ZONE`
- 각 rect의 좌·상·우·하 방향 이탈
- x+width/y+height overflow → `NON_FINITE_RESULT`
- `matRect` null·missing·primitive·partial
- frame/mat/image rect hostile getter·Proxy·revoked Proxy
- getter drift에도 한 snapshot만 사용
- 실패 시 partial plan 성공 없음
- 입력 deep-freeze 비변형·동일 입력 결정성
- plan의 모든 number finite
- 실패 직렬화에 imageRef·rect 원문·URL·base64·token 없음
- 기존 frame layer 순서와 case plan 전체 무회귀

### 7. 실제 Chromium E2E

기존 OS-temp Canvas fixture에서만 합성 frame plan을 사용한다. 서로 다른 합성 색으로:

- frame band 픽셀 = frame body 색
- mat ring 픽셀 = mat 색
- imageZone 내부 픽셀 = 합성 drawable 색
- imageZone 바깥·matRect 안쪽 픽셀은 mat 색
- clip 밖 drawable 색 번짐 0
- console error 0·axe serious/critical 0·고정 sleep 0

`getImageData`는 기존처럼 테스트 측 `page.evaluate`에서만 사용한다. production source에
추가하지 않는다. 고객 `/`에 fixture·debug link·query branch를 추가하지 않는다.

### 8. E2E·산출물 안전

- 스펙 021 exact-handle in-process preview 소유·teardown 유지
- 스펙 022 OS temp `denn-e2e-*` staging 유지
- 고객 mockup/admin dist에 fixture를 append하지 않는다.
- E2E 전후 고객 dist 파일 목록·SHA-256 동일
- 정상·실패 종료 후 temp staging 잔여 0
- 포트 4183/4184 free·저장소 실행 소속 잔류 0
- 포트/PID kill·taskkill·SIGKILL·Stop-Process·globalTeardown sweep 추가 금지

## 검증 절차 (VERIFY)

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] install 전후 `pnpm-lock.yaml` diff 0
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test:unit`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] `git diff --check`
- [ ] E2E reporter summary·명령 exit 0
- [ ] 종료 후 포트 4183/4184 free·저장소 실행 소속 잔류 0
- [ ] OS temp `denn-e2e-*` 신규 잔여 0
- [ ] 고객 mockup/admin dist 파일 목록·SHA-256 E2E 전후 동일·fixture 0
- [ ] E2E가 추적 PNG를 재생성하면 시각 변경 없는 파일은 복원·미커밋
- [ ] 운영 HTML·Firebase 설정/Rules·shared·다른 패키지·고객 UI·POC·PNG 무변경
- [ ] 실제 network/live test/deploy 0
- [ ] 코드/test와 문서/handoff 커밋 분리
- [ ] push 후 HEAD=origin, ahead/behind 0/0, working tree clean

검증 보고에는 다음을 명시한다.

- 정정된 `FramePlanInput`
- frame body/mat/image의 실제 command rect
- containment 구현·오류 우선순위
- getter drift 차단 방식과 hostile runtime test
- 실제 Chromium 대표 픽셀 위치와 기대 색
- 고객 dist·OS temp·포트·프로세스 종료 결과
- 최종 unit/e2e 수와 bundle/CSS gzip 수치
- 실제 상품 adapter·운영 이미지·실기기 NOT TESTED

## 완료 정의 (DONE)

- `FramePlanInput`이 `frameRect`, `matRect`, `imageZone`을 서로 다른 필수 영역으로
  표현한다.
- `frame:mat`은 `matRect`, 사진 clip은 `imageZone`을 사용한다.
- logical canvas→frame→mat→image containment가 fail-closed로 검증된다.
- malformed·hostile runtime 입력이 throw나 partial plan을 만들지 않는다.
- 실제 Chromium 픽셀에서 frame band·mat ring·image가 구분된다.
- executor·surface·case plan과 기존 전체 게이트가 회귀하지 않는다.
- 고객 UI·shared projection·Firebase·운영본·배포는 변경되지 않는다.
- 이 완료를 실제 상품 Canvas 연결 완료로 기록하지 않는다.

## 위험 (RISK)

- 이 스펙은 표현 능력만 바로잡으며 실제 앱이 `P=8` 또는 uploaded `P=0`을 선택하지
  않는다.
- 다음 adapter가 `matRect`와 `imageZone`을 같은 rect로 전달하면 타입은 만족해도
  레거시 builtin `full`과 시각적으로 다르다. 다음 스펙에서 template variant별 inset을
  반드시 결정해야 한다.
- exact containment는 부동소수 계산이 경계를 미세하게 넘는 입력을 거부한다.
- 실제 운영 이미지·CORS-clean·실기기 동작은 합성 픽셀 E2E로 증명되지 않는다.
- `firebase.json`의 `hosting.public: "."` 위험은 그대로이며 Hosting 격리 전 배포 금지다.

### QUESTIONS

없음. 현재 plan 계약으로 mat와 `P=8` 사진 영역을 동시에 표현할 수 없다는 코드·레거시
근거가 확정되어, 이번 스펙은 두 rect를 분리하는 최소 선행 정정으로 한정한다.
