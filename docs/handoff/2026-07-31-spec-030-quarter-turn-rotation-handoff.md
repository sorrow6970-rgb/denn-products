# 스펙 030 인계 — 고객 사진 90° 단위 회전

상태: **DONE — Codex 승인 후 종료 문서 처리 완료 (`COMMITTED`)** (2026-07-31, §10 참조)
코드/test 커밋: `fbbadeb` → 보완 `603cd25` / 기준: 계약 `2777010`, 결정 정본 `cf1cfd2`, 조사 `8734307`

> §3.2의 판단 요청은 **Codex가 "공개 포트에 선언하라"로 확정**했고 §9에서 보완했다. 그 절의 서술은
> 라운드 1 이전의 기록으로 남긴다.

## 1. 한 줄

고객이 사진을 **왼쪽/오른쪽 90°** 로 돌릴 수 있고, 그 회전은 **슬롯별로 저장되어 render plan까지** 전달된다.

## 2. 확정된 계약 (구현된 그대로)

- 편집 상태 `NormalizedTransform = {scale, x, y, rotationQuarterTurns}`. 회전은 **`0|1|2|3`**.
- **거부이며 복구가 아니다**: `4`·`-1`·`1.5`·`90`·`"1"`·`NaN`·drift getter·throwing getter는 모두 실패한다.
  modulo wrap도, clamp도, "회전 0" 기본값 생성도 없다.
- 버튼 1회 = **정확히 한 단계**(modulo 4). 왼쪽 `-1`, 오른쪽 `+1`. 이름은 `왼쪽으로 90°`, `오른쪽으로 90°`.
- **scale·normalized pan 불변**: 회전은 pan을 재는 `maxPan`만 바꾼다 → 고객이 만든 구도가 유지된다.
- `원래대로`는 **회전도 0으로** 되돌린다(D-9 초기화 행렬에 자동 편입).
- **슬롯별 독립**. 전역 회전 상태·전역 폴백 **없음**(레거시 `T.rot ?? state.rot` 결함 미재현).
- **probe plan에도 회전 포함**. 없으면 회전 전 `maxPan`으로 clamp되어 구도가 틀어진다.
- plan 어휘는 `draw-image-cover`의 **선택적 `rotationQuarterTurns`** 뿐. **0이면 필드 자체를 emit하지 않아**
  pre-030 plan과 **바이트 동일**하다. 신규 draw command 0, `draw-image-stretch` 무변경(**아트는 회전 안 함**).
- executor는 회전 시에만 **한 command 안에서** `save → clip → translate → rotate → drawImage → restore`.
  회전 중심은 **drawRect 중심(= zone 중심 + 현재 pan)** 이라 구도 점프가 없다.

## 3. 설계 판단 3가지 (Codex 검토 포인트)

### 3.1 geometry를 건드리지 않고 회전 footprint를 얻은 방법

`packages/render/src/geometry/**`는 §4 금지다. 그래서 `coverCommand`가 **90°/270°일 때 cover에 넘기는
intrinsic size의 w/h를 바꿔** 넣는다. 결과 `drawRect`는 **이미 회전된 화면상 실루엣**이고, 스펙 029의
`maxPan = |drawSize - clipSize| / 2`가 **수정 없이 그대로** 맞는다. geometry diff **0**.

### 3.2 ★ `types.ts`(executor 포트)를 건드리지 않은 이유 — Codex 판단 요청

`PreviewCanvasContext`(`apps/mockup/src/canvas/types.ts`)에는 `translate`/`rotate`가 **없고, 그 파일은 §4
허용 목록에 없다**. 허용 파일 확장을 요청하는 대신 **executor 안에서 런타임 검사**로 처리했다:

- **회전 command가 실제로 있을 때만** 두 메서드를 요구한다 → 기존 포트를 만족하는 컨텍스트는
  **모든 pre-030 plan을 그대로 실행**한다(기존 unit fake 포함, 회귀 0).
- 없으면 **preflight에서 `INVALID_EXECUTOR_INPUT`으로 fail-closed** → 회전을 무시한 채 그리지 않는다
  (사진이 안 돌아간 미리보기는 "잘못된 제품"이지 graceful degradation이 아니다).

**트레이드오프(그대로 보고)**: 공개 포트 타입이 executor의 실제 요구를 **전부 기술하지 않게 된다**.
포트를 정확히 구현한 소비자는 회전 plan에서 런타임 실패한다. `types.ts`를 허용 목록에 넣어
`translate`/`rotate`를 **선택적 멤버로 선언**하는 편이 계약상 더 정직하다. **Codex가 결정하면 그 방향으로
보완하겠다** — 지금은 허용 파일을 임의 확장하지 않는 쪽을 택했다.

### 3.3 EXIF fixture를 파일로 추가하지 않은 이유

§4는 "기존 test fixture 디렉터리 재사용"을 허용하지만 **이 저장소에는 fixture 디렉터리가 없다**
(`solidPng`/`splitPng`처럼 테스트가 바이트를 생성한다). 그 관례를 따라 **브라우저에서 baseline JPEG을
만들고 Node에서 APP1/Exif 세그먼트를 바이트 스플라이싱**했다. EXIF 라이브러리 0, 바이너리 파일 0.

## 4. ★ 새로 실측된 사실 (이 저장소 최초)

**Chromium은 EXIF orientation을 적용한다.** `40×20` JPEG에 `Orientation=6`을 스플라이싱하면
`naturalWidth/Height`가 **`20×40`으로 스왑되어** decode된다(untagged baseline은 `40×20`로 확인).

→ **R-6("직접 파싱하지 않는다")이 옳았다는 근거**다. 우리가 EXIF를 또 적용하면 **이중 회전**이 된다.
조사 보고서의 `NOT VERIFIED`는 **Chromium 한정으로 해소**되었고, 나머지 엔진·실기기는 여전히 NOT TESTED다.

## 5. 검증 결과

| 게이트 | 결과 |
| --- | --- |
| frozen install / lockfile diff / 신규 의존성 | exit 0 / **0** / **0** |
| format · lint · typecheck | PASS |
| unit | **989** (944 → 989, 신규 45) |
| build | mockup JS **265.53 kB** (gzip **82.11**), CSS **15.50** (gzip **3.89**) / admin **무변경** |
| E2E (실제 Chromium) | **99 PASS** (91 → 99, 신규 8), exit 0 |
| `git diff --check` | clean |
| 포트 4183·4184 listener | **0** |
| OS temp `denn-e2e-*` | **0** |
| 고객 dist SHA-256 (E2E 전/후) | **동일** · fixture 유출 **0** |
| 실제 network·live·Firebase·CORS·Rules/Hosting·deploy | **0** |

### 신규 unit (45)

modulo 4 좌/우 스텝·좌우 역연산·초기화가 회전까지 되돌림 / scale·pan·zoom이 회전을 **운반** /
`0|1|2|3` 외 전부 거부 + hostile·drift·revoked getter / 0·180 footprint 동일, 90·270 **스왑** /
회전 후에도 clip 완전 충전(D-7) / probe·실제 plan 모두 회전 전달 / 회전 생략·0의 **바이트 동일성** /
executor `translate/rotate/drawImage` 인자·중심·순서·다음 command 격리 / **fail-closed 컨텍스트** /
case 슬롯 독립 / **template art 무회전**.

### 신규 E2E (8, 실제 픽셀)

우회전 시 분할 경계가 **가로 → 세로**(오른쪽이 TOP) / 좌우 역연산·4회 원위치 / **슬롯별 독립 회전** /
`원래대로`가 회전+pan+scale 동시 초기화 / 회전 후 drag·zoom·**resize**에도 빈 공간 **0** /
회전 버튼 **키보드**(Enter·Space) 조작 + 44px + axe serious/critical **0** + console **0** /
320px 오버플로 **0** / **EXIF Orientation=6 실측**.

## 6. NOT TESTED (유지)

- iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱의 **실제 EXIF 동작과 조작성**
- 실제 카메라 원본 orientation **1~8 전 범위**
- **실제 print/export 출력물의 회전**(현재 인쇄 경로는 아직 이 plan을 소비하지 않는다)
- 대용량 이미지 회전 **성능·메모리**
- **임의 각도**(R-1·R-2로 제외)
- 실기기 4환경 육안, 실제 200% 브라우저 확대

## 7. 범위 밖 (건드리지 않음)

`packages/render/src/geometry/**` · `localImageBinding.ts` · `templateArtBinding.ts` ·
`placement.ts` · `apps/admin/**` · 운영 HTML · Firebase/Rules/CORS/Hosting · POC ·
`package.json` · `pnpm-lock.yaml` · `surface.css`(변경 불필요) · `previewContracts.test.ts`(라벨은
composer 테스트가 검증) · 알려진 스펙 018 PNG 2개(restore·stage·commit **하지 않음**).

## 8. 다음

Codex가 `fbbadeb`와 이 문서 커밋을 독립 검증한다. **§3.2의 `types.ts` 판단**과 §4의 EXIF 실측을 함께
검토해 달라. 승인 전까지 Claude는 종료 문서를 쓰거나 다음 스펙을 시작하지 않는다.

---

## 9. 보완 라운드 1 — executor 공개 포트 계약 (2026-07-31)

Codex 독립 검증 결과: 기능 게이트는 **전부 PASS**(unit 989/989, E2E 99/99, dist SHA 동일,
lockfile·금지 경로 diff 0)이고, **§3.2의 판단 요청이 "포트에 선언하라"로 확정**됐다.
`apps/mockup/src/canvas/types.ts`가 허용 목록에 **최소 확장**됐다. 코드/test 커밋 `603cd25`.

### 지적 (유효)

executor는 회전 command에서 `translate`/`rotate`를 요구하는데 공개 `PreviewCanvasContext`가 둘을
**선언하지 않았다** → 타입을 정확히 구현한 소비자가 **컴파일을 통과한 뒤 회전 plan에서만 실패**할 수 있다.
compile-time 계약과 runtime 요구의 불일치다.

### 보완

1. `PreviewCanvasContext`에 `translate?`/`rotate?`를 **선택적 capability로 선언**했다.
   **선택성 자체가 계약이다** — 없는 컨텍스트는 unrotated plan을 **그대로** 실행하고,
   `rotationQuarterTurns`가 0이 아닌 plan은 둘 다 요구한다.
2. **fail-closed 계약을 공개 포트에 문서화**했다: 하나라도 없으면 preflight에서
   `INVALID_EXECUTOR_INPUT`이고 **Canvas 연산 0**이다(회전 안 된 사진은 graceful degradation이 아니라
   잘못된 제품이므로 폴백으로 그리지 않는다).
3. **단일 정본화**: `RotationCapableCanvasContext = PreviewCanvasContext &
   Required<Pick<PreviewCanvasContext, "translate"|"rotate">>` 를 공개 타입에서 **파생**하고 executor의
   중복 interface를 **삭제**했다. `ROTATION_METHODS`는 `keyof PreviewCanvasContext`로 검사하므로
   메서드명이 바뀌면 **컴파일이 깨진다**(capability probe가 조용히 어긋나지 않는다).
4. **공개 타입만으로 선언된 컨텍스트**로 외부에서 계약을 고정하는 테스트를 추가했다.

### 신규 테스트 (6)

capability 없는 **공개 타입** 컨텍스트가 unrotated plan 3커맨드 실행 + transform 시도 **0** /
명시적 회전 `0`도 동일 / 회전 1·2·3 전부 **fail-closed + Canvas 연산 0** /
**절반의 capability는 capability가 아니다**(`translate`만·`rotate`만 있어도 fail-closed) /
함수 아닌 값도 capability 아님 / 실제 `CanvasRenderingContext2D`가 포트와 파생 타입에 **모두 assignable**
(컴파일 타임 고정 → DOM lib 시그니처와 포트가 벌어지면 `tsc`가 깨진다).

### 무변경 확인

회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9 **전부 무변경**. E2E 99개 그대로 PASS.

### 게이트 (재실측)

frozen exit 0 / lockfile·manifest diff **0** / 신규 의존성 0 / format·lint·typecheck /
**unit 995**(989→995) / build mockup JS **265.52 kB**(gzip **82.10**), CSS 15.50/3.89 무변경,
admin 무변경 / **E2E 99 PASS** exit 0 / `git diff --check` clean / 포트 4183·4184 free /
OS temp 0 / 고객 dist SHA-256 E2E 전후 **동일** / network·live·deploy **0**.

### 아직 미회신 (Codex 판정 대기)

**판단 요청 ②(R-6 실측)** 은 이번 회신에 판정이 없었다. `Orientation=6` 합성 JPEG(40×20)이 Chromium에서
**20×40으로 decode**된다는 §4 실측을 조사 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md` §7의 `NOT VERIFIED`
**해소(Chromium 한정)** 로 반영할지 판정해 달라. 보고서는 Codex 소유라 Claude가 수정하지 않았다.

---

## 10. 종료 (2026-07-31) — CODEX_PASSED → COMMITTED

Codex가 보완 라운드 1 코드 `603cd25`와 문서 `1aa3302`를 독립 재검증해 **승인**했고, Claude Code가
**종료 문서만** 하나의 문서 커밋으로 처리했다. 기능 코드·test·CSS·설정 변경 **0**
(`git diff 603cd25..HEAD -- apps packages tests` = **0줄**).

### Codex 독립 게이트 (승인 근거)

frozen install / format·lint·typecheck / **unit 995/995** / mockup·admin build /
실제 Chromium **E2E 99/99** / `git diff --check` / **dist SHA-256 전후 동일** /
lockfile·신규 의존성·금지 경로 diff **0** / 포트 4183·4184 **0** / OS temp **0**.
Claude 재실측(같은 트리)도 `check` PASS로 일치한다.

### ★ 판단 요청 ② 회신 (§9에서 미회신이던 항목)

**Codex 판정: "Chromium 합성 EXIF `Orientation=6` 적용은 검증됨. 그 밖의 엔진·실기기는 NOT TESTED 유지."**

→ §4의 실측(40×20 JPEG + `Orientation=6` → **20×40 decode**)이 **검증된 사실로 확정**됐다.
R-6("EXIF를 직접 파싱하지 않는다")은 옳았고, 우리가 또 적용하면 **이중 회전**이 된다.
조사 보고서 자체는 Codex 소유이고 이번 허용 파일에도 없으므로 **수정하지 않았다**.

### 최종 상태

- 승인 코드 `603cd25`(최초 구현 `fbbadeb`), 문서 `1aa3302`, 종료 문서 커밋은 이 라운드
- 커밋 파일(허용 목록과 정확히 일치): 정본 스펙(§CODEX_PASSED), 이 인계(§10),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 스펙 018 PNG 2개는 restore·checkout·stage·commit **하지 않았다**(working tree에 그 2개만 잔존)
- 다음 스펙·사전조사·기능 **미착수**

### NOT TESTED (종료 시점 유지)

- **잔류 프로세스 command-line 검사 — OS 권한 거부로 실행하지 못함**
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)의 EXIF·조작성
- 실제 카메라 원본 **orientation 1~8 전 범위**
- **실제 print/export 출력물의 회전**
- 대용량 이미지 회전 **성능·메모리**
- 실제 **200% 브라우저 확대**
- 임의 각도(R-1·R-2로 제외)

⚠️ 이 종료는 **합성 fixture에서 회전 버튼으로 사진을 돌린 단계**이며 실기기·인쇄/export·주문·배포
완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
