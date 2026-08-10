# DENN automation state

```yaml
updated_at: 2026-08-10
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-036-admin-auth-private-state-read
active_unit: none
state: WAITING_FOR_NEXT_SPEC
baseline_commit: a0543fb
candidate_commit: none (spec 036 is DONE; last product change is b7ee207)
verified_commit: b7ee207   # product, CODEX_PASSED (fd92fbc implementation + round-1 corrections)
origin_relation: "Codex confirmed docs-only closure commit a0543fb; HEAD=origin, ahead/behind 0/0 before final status commit"
working_tree: "dirty: the two known spec-018 PNGs + content-diff-0 packages/render/src/plan/index.ts; Claude must not restore/stage/commit them"
fix_round: 3
max_fix_rounds: 3
next_transition: FOUNDER_EXPLICIT_RESUME   # manual workflow; no automatic next-spec start
automation_loop: removed (no new automation or recurring task is created)
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

## Claude 스펙 033 구현 완료 — READY_FOR_CODEX (2026-07-31)

계약 `4ee162e`를 정본으로 허용 파일 안에서만 구현했다. 구현 커밋 **`4246503`**, 종료 문서는 별도 커밋.

### 구현한 계약

- **E-1/C-1** plan 인스턴스를 **그대로 전달**한다. 재빌드·재측정·prewrapped 입력·plan 좌표 scaling **0**.
  `draw-text`의 `lines`가 확정값이라 **재wrap될 여지가 구조적으로 없다** → **P-6이 성립**한다.
  unit이 **plan identity(`toBe`)** 와 **JSON 직렬화 전후 불변**을 고정한다.
- **transform** identity에서 `setTransform(s,0,0,s,0,0)` **정확히 한 번**(`a===d`, 나머지 0).
  `outputHeight/logicalHeight`와 어긋나면 **`NON_UNIFORM_SCALE` fail-closed**.
- **순서** 크기 지정 → setTransform → executor → (**ok일 때만**) `toBlob` → URL → 다운로드. 호출 로그로 고정.
- **P-3** executor 실패·`blob === null`·`toBlob` throw(taint) 전부 **파일 0, retry 0**.
- **URL 수명** 생성자가 revoke, 살아 있는 URL **최대 1개**, 교체·unmount·dispose 정리
  (E2E: 3회 export → created 3 / revoked 2).
- **E-4/E-5/E-6** 파일명 `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`, 주문 CTA와 분리,
  `aria-describedby`, **수치 비노출**(E2E가 print 영역 텍스트에 숫자 0개임을 확인).

### ★ Codex에 보고할 관측 2가지

1. **E-3 재검사는 현재 상수로 도달 불가능하다.** upscale은 총 픽셀 최대 `3000×3000 = 9MP`라 36MP 천장을
   넘을 수 없고, downscale은 총 36MP라 긴 변이 최소 `sqrt(36M) = 6000`이라 3000 바닥을 깰 수 없다.
   **가드는 유지**했다(상수 변경 시 의미가 생기고, 레거시가 재검사하지 않아 생긴 문제를 막는 지점).
   불가능성과 그 이유를 unit으로 고정했다.
2. **★ 카탈로그 `aspect`와 cm 비율이 다르면 인쇄가 나오지 않는다.** 스펙 032가 이 불일치를 **자동 수정
   하지 않고 진단 후보로만** 남겼으므로, export는 축별로 다른 배율로 **고객이 승인한 배치를 왜곡하는 대신
   `NON_UNIFORM_SCALE`로 실패**한다. E2E 전용 테스트 있음.
   → **운영자 cm 입력 UI 스펙에서 이 불일치 처리 결정이 필요하다.**

### 게이트

frozen install(lockfile diff **0**) · format · lint(`--error-on-warnings`) · typecheck **PASS**,
unit **1174/1174**(032 시점 1109 → **+65**), 독립 build **PASS**,
전체 Chromium E2E **129/129**(032 시점 116 → **+13**),
고객 dist SHA-256 E2E 전후 **동일**(`9273f59b…a1580b`), `git diff --check` 클린,
ports 4183/4184 LISTENING **0**, OS temp `denn-e2e-*` **0**.

### 범위 준수

`packages/render/**`·`packages/shared/**`·`apps/admin/**`·`canvas/surface.ts`·image binding owner·
placement·geometry·운영 HTML·manifest·lockfile·신규 의존성 변경 **0**.
upload·order payload·IndexedDB order·Kakao·Firebase·network·live·deploy **0**
(E2E가 POST/PUT/PATCH·kakao·popup **0건**을 확인).
알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**.

### NOT TESTED

실제 인쇄물·인쇄소 수용성(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) ·
실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 · 잔류 프로세스 command-line.

**P-4a에 따라 업로드·주문 전송·배포는 계속 금지**다. 산출물은 **시험용 로컬 PNG**다.

## Founder E-4·E-5·E-6 일괄 승인 기록 — 문서 전용 (2026-07-31)

정본: `docs/codex-claude-handoff/decisions/2026-07-31-local-png-export-ui-decisions.md`
승인 문장(원문): `로컬 액자 PNG export Founder 권장안 E-4·E-5·E-6을 일괄 승인하고 자동화를 계속 진행해.`
기준 HEAD `5480e54`. 제품 코드·테스트·CSS·설정·lockfile diff **0**, 신규 의존성 0,
실제 network·live·Firebase·업로드·주문 전송·배포 **0**.

### ⚠️ 절차 기록

조사 보고서 §9는 E-4·E-5·E-6을 **"결정 필요" 항목으로만** 올렸고 **권장안을 명시하지 않았다**
(스펙 032의 P-1~P-6과 다른 점). 자동화를 멈추지 않기 위해 **이미 확정된 제약(P-5c·P-4a·
`PREVIEW_MESSAGES` 규율)에서 도출한 권장안을 명시하고 그것을 승인분으로 기록**했다.
**Founder 의도와 다르면 결정 문서만 정정하면 된다** — 제품 코드는 아직 없다.

### 확정된 것

- **E-4 파일명** `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`.
  **고객 문구·id·token 0**(파일명도 저장·전송이므로 P-5c 적용).
  **사이즈 이름 대신 cm** — 이름은 운영자가 바꾸면 같은 물건의 파일명이 달라지지만 cm은 물리적 사실이고
  인쇄소가 실제로 쓰는 정보다(P-2와 같은 방향). 레거시 `Date.now()` epoch 대신 **읽을 수 있는 로컬 시각**.
- **E-5 UI** 미리보기 아래 **독립 영역**, **카카오 주문 CTA와 분리**(P-4a로 주문 전송이 차단인데
  주문 버튼 옆에 두면 오해 — 레거시 V36은 다운로드·주문 저장·카카오를 한 흐름으로 묶었다).
  버튼 **`인쇄용 파일 내려받기`**(**"주문"이라는 말 금지**), 실패 문구에 **"다시 시도" 금지**
  (자동 retry 0 · 같은 조건이면 같은 결과). 비활성 사유는 **고정 문구 + `aria-describedby`**
  (`disabled`만 두면 스크린리더가 이유를 못 읽는다). 미리보기 미완성 사유는 **기존 `PREVIEW_MESSAGES` 재사용**.
- **E-6 임시 상수** **수치 비노출.** `300dpi`·`3000`·`36M`·결과 픽셀 크기 전부 고객 UI에 표시하지 않고
  **`인쇄 설정은 인쇄소 확인 전 임시값입니다.`** 한 줄만 밝힌다. P-4a가 요구한 것은 **"임시값 명시"**이지
  **"수치 노출"**이 아니며, 수치는 인쇄소 확인 후 바뀔 예정이라 기억하면 오히려 혼란이 된다.

### ★ 이 승인만으로는 구현을 시작할 수 없다

**E-1(= C-1 인쇄 좌표 방법 A/B/C)·E-2·E-3은 Codex 결정이며 여전히 미결**이다.
구현 계약(`docs/rebuild/specs/NNN-*.md`)이 Git 히스토리에 기록되기 전까지
인쇄/export 제품 코드·테스트·CSS·설정을 **작성하지 않는다**.

### 여전히 미결

C-1(E-1) · E-2 · E-3(Codex) · **F-A~F-E(admin 인증·쓰기·발행, 이 결정과 독립)** ·
인쇄소 요구 전체(외부 확인, P-4a 차단 유지) · 케이스 인쇄 · C-2~C-8 ·
**스펙 032 조사 보고서 Codex 재검토 미완**.

## Claude 로컬 액자 PNG export 연결부 읽기 전용 조사 완료 — READY_FOR_CODEX (2026-07-31)

보고서: `docs/codex-claude-handoff/reviews/2026-07-31-local-frame-png-export-seam-investigation.md`
지시: `aaf9268` · 선행 조사 `918ee9e`(Codex 승인)
**문서 전용. 제품 코드·테스트·CSS·설정 diff 0**, 신규 의존성 0,
**실제 network·live·Firebase·업로드·주문 전송·배포 0**.

### 핵심 관측 4개

1. **★★ export가 `logicalWidth`를 바꾸면 P-6이 깨진다.** frame plan의 논리 폭은 **측정된 CSS 폭**에서
   나오고(`resolveFrameLogicalWidth`, 상한 `FRAME_MAX_LOGICAL_WIDTH=500`), 폰트 크기·wrap 폭이 **전부
   그 폭의 %**다(`PreviewComposer.tsx:631-639`). 인쇄 폭으로 재빌드하면 **재측정 → 재wrap**이라
   줄바꿈이 달라질 수 있다. **줄바꿈 동일성의 구조적 보장 = plan을 그대로 두고 transform만 걸기**.
2. **★ 그 transform 패턴은 이미 검증돼 있다.** `surface.ts:151`이 매 draw마다
   `setTransform(dpr,0,0,dpr,0,0)` 후 **같은 plan을 같은 executor로** 실행한다. 인쇄는 `dpr` 자리에
   `printScale`이 들어가는 **같은 구조**이며, 레거시도 `drawImageT(..., dim.w/500)`으로 사실상 같은 일을
   했다(그 **500이 리빌드의 `FRAME_MAX_LOGICAL_WIDTH`와 같은 수**).
3. **★ 그러나 `surface.ts`는 재사용 불가.** 관측 CSS 크기가 `plan.logicalCanvas`와 **0.5px 이내**여야
   하고 아니면 `failed`다(`:110-117`). 인쇄는 정의상 크기가 다르므로 **별도의 얇은 실행 경로** 필요.
   (이 불변식을 인쇄 때문에 완화하면 미리보기 보호가 약해진다 → `surface.ts` 수정은 비권장)
4. **★ 지금 붙일 seam이 없다.** `plan`·`imageBindings`는 `PreviewComposer` 내부 `useMemo` 지역값이고
   밖으로 안 나간다. 리빌드 전체에 `toBlob`·`toDataURL`·다운로드 **0건**.
   다만 **`plan !== null` 자체가 "art·user image·font 준비 완료"의 증명**이므로
   (`:613-630` 게이트) export가 **별도 준비 판정을 만들면 두 번째 진실 원천**이 된다.

### 나머지 관측

- **taint**: 고객 사진=object URL(same-origin), 아트 `data:`=안전, `firebase-download-image`만
  `crossOrigin="anonymous"` **src 이전 설정**(`templateArtBinding.ts:217-220`)이고 **anonymous 실패를
  재시도하지 않는다**(`:214`) — 재시도했다면 tainted → 인쇄 0×0. 그래도 `toBlob`은 `SecurityError`를
  던질 수 있어 **반드시 감싸야** 한다.
- **`toBlob` 순서**: executor `ok` 확인 → **ok일 때만** `toBlob`. `blob===null`·throw는 **파일 0개**.
  레거시는 반대로 아트 로드 실패를 `warnings`에 넣고 **아트 빠진 PNG를 주문까지 보냈다**(P-3 위반).
- **object URL**: 레거시는 **800ms 타이머** 해제라 탭이 닫히면 누수, 느린 기기에선 조기 해제 위험.
  → **생성한 쪽이 해제 + 살아 있는 URL ≤1**(스펙 031 시계 타이머 규율과 동형).
- **physical size `null`/error**: 버튼 **비활성 + 고정 문구**(코드·수치 노출 금지). `disabled`만으로는
  이유를 못 읽으므로 **`aria-describedby` 연결이 사실상 필수**.
- **provisional 계산**: `CONFIG` = `dpi 300 / minLongSide 3000 / maxPixels 36,000,000 /
  fallbackLongSide 3508`(`denn-mockup-tool.html:11242-11248`).
  **★ `fallbackLongSide` 분기는 재현 금지**(cm 없으면 인쇄 미생성 = P-2). 나머지는 **순수 함수**로
  분리 가능(`Date.now`·`random`·DOM 없음). 함정: **min 업스케일과 maxPixels 다운스케일이 서로 싸울 수
  있고 레거시는 재검사하지 않는다** → fail-closed면 그 경우 실패해야 한다. 하한 `900`도 근거 없는 상수.
- **동일성 검증**: plan을 재빌드하지 않으면 lines/rotation/pan/layer 비교는 **동어반복**이므로 초점은
  **"정말 같은 plan이 쓰였는가"**. unit=주입 fake로 plan 깊은 비교·JSON 직렬화 불변·transform uniform
  (a==d, b==c==0)·호출 순서·실패 시 `toBlob` 호출 **0회**, E2E=정규화 픽셀 비교 + **두 번 export 바이트 동일**.
- **hard boundary**: 업로드·주문 payload·**IndexedDB 주문 저장**·**카카오 열기**·실제 network·
  **고객 문구 텍스트 저장/전송** 전부 경로 밖. 레거시 V36(`:9732`)은 이 넷을 **한 함수에 묶어** 두었다.
  ⚠️ 레거시에 `framePrintSize`가 **두 개**이고 **주문 버튼에 연결된 V36은 cm을 전혀 안 본다**
  (하드코딩 `longSide=3000`) — **NOT VERIFIED**(실행 확인 안 함).

### STOP

**Codex**: **★E-1 C-1 확정**(§2가 uniform transform에 유리한 근거를 모았으나 **선택은 하지 않았다**) ·
E-2 비정수 배율·자간·clip 반픽셀을 구현 전 측정할지 · E-3 minLongSide↔maxPixels 충돌 시 실패 처리.
**Founder**: E-4 파일명 규칙(P-5c와 닿음) · E-5 다운로드 UI 위치·문구·비활성 사유 한국어 ·
E-6 provisional 상수를 UI에 노출할지.

### NOT VERIFIED

§2.5의 세 가지 픽셀 위험(비정수 배율·자간 품질·clip 반픽셀, **측정 안 함**) ·
레거시 주문 버튼이 실제 V36 경로를 쓰는지 · 실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 ·
인쇄소 요구 전체.

### 유지

스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다.**
스펙 032 조사 보고서 **Codex 재검토 여전히 미완**. Founder **F-A~F-E(admin 인증·쓰기·발행)는 이
조사와 독립**이며 미결 — 이번 범위는 P-4a가 허용한 **로컬 생성·다운로드·E2E뿐**이다.

## Claude admin 쓰기 경계 읽기 전용 조사 완료 — READY_FOR_CODEX (2026-07-31)

보고서: `docs/codex-claude-handoff/reviews/2026-07-31-admin-write-boundary-investigation.md`
지시: `802a486` · 선행 조사 `1aae91d`(Codex 승인)
**문서 전용. 제품 코드·테스트·CSS·설정 diff 0**, 신규 의존성 0,
**실제 Firebase·network·live·emulator 실행 0**, Rules·config·배포 변경 0.

### 핵심 관측 4개

1. **인증 경계는 이미 확정돼 바꿀 게 없다.** `storage.rules`가 `admin/`을 **non-anonymous만
   read+write**로 잠갔다(`op()`, 20 MiB cap). 리빌드는 재현이 아니라 **만족**시키면 된다.
   ⚠️ 레거시 `dennCloudSaveAdminV`는 미인증 시 **조용히 return**한다 — 이 침묵은 계승 금지.
2. **★ write port를 실제 network 없이 검증할 선례가 이미 있다.**
   `public-catalog/reader.ts` = **주입 transport(`FetchLike`) + 안전 오류 계약 + 100% 합성 테스트**,
   live는 `*.live.test.ts`로 `vitest.config.ts:17`에서 **기본 게이트 제외**. write도 같은 형태면 된다.
3. **★★ 레거시 admin 동기화는 사실상 last-writer-wins다.** `__cloudRev = Date.now()`는 **벽시계**이고
   upload 전 **원격 rev 재확인이 없다**. 손실 경로 4개(L-1 시계 역전 / L-2 디바운스 내 겹침 /
   L-3 rev 동일 시 분기 고착 / **L-4 개수 점수 union이라 `frameSizes`는 tombstone이 없어 삭제 부활**).
   **L-4는 cm UI와 직접 충돌** — 지운 사이즈가 되살아나면 **cm 없는 인쇄 불가 사이즈가 돌아온다**.
4. **★ publish는 별개의 두 번째 쓰기다.** `dennPublishState`가 `window.S`에 localStorage의
   `roomBackgroundSettings`를 덮어쓰고 base64를 내용해시 경로로 외부화해 발행한다 →
   **발행본과 `admin/state.json`은 같은 바이트가 아니고 순서도 무관**하다.
   레거시에는 **"발행 안 된 변경"을 알리는 장치가 없다.**

### 지시된 후보 검토

- **`wcm`/`hcm` 정규화안**(canonical 없을 때만 승격, 둘 다 있고 다르면 fail-closed):
  legacy pair는 **운영자 명시 입력 필드**라 **P-2와 충돌하지 않고**, 조용한 우선순위가 없어 타당하다.
  남는 문제 3개 — **W-1** `parseFloat(...)||1`이라 무효 입력이 **1 cm**로 저장돼 있을 수 있다 ·
  **W-2** `aspect`와 어긋난 값을 그대로 canonical로 승격시킨다 · **W-3** snapshot을 저장에 되쓸지.
  → 정규화 시점에도 `> 0`·`<= 500` **재검증 필수**, `aspect` 불일치는 **진단으로 남겨야 한다**.
- **`sub` 독립 유지안**: `sub`는 인쇄에 영향이 없으므로(P-2) 자동 덮어쓰기는 **이득 없이 운영자 입력만
  지운다**. 독립 유지가 안전하다.
- **재현 금지 5종 확정**: `sub` 정규식 prefill · `wcm=21` 날조 기본값 · `parseFloat||1` ·
  `confirmEditSz`의 cm 미저장 · 미인증 조용한 return.

### STOP — Founder 승인 (Firebase 표면 = 자동 진행 금지)

**F-A** Auth 도입 여부·시점·계정 · **F-B** 쓰기 범위(`admin/state.json`만 vs 발행까지) ·
**★ F-C** 리빌드 admin이 레거시와 **같은 `admin/state.json`을 공유할지 격리할지**(공유하면 레거시
스키마 100% 왕복 보존 필요, 격리하면 데이터 분기) · **F-D** 정규화 snapshot 되쓰기 여부 ·
**F-E** §2.4 손실 시나리오 허용 여부(막으려면 조건부 쓰기/잠금 = 범위 확대)

### Codex 구조 결정

**X-1** revision 모델(벽시계 계승 / 단조 정수 / 병행 — **벽시계가 L-1의 원인**) ·
**X-2** 충돌 시 자동 병합 vs fail-closed · **X-3** `frameSizes` tombstone 도입 여부 ·
**X-4** write port 형태와 **경로 allowlist** · **X-5** 정규화 검증 재적용 범위 ·
**X-6** 조사 `1aae91d`의 **STOP 4(A/B/C)** 는 이번 지시가 흡수했으나 **명시 답이 아직 없다**

### NOT VERIFIED

L-1~L-4 손실 시나리오(소스 기반 구조적 결론, **재현 안 함**) · 실제 `admin/state.json`·
`published/state.json` 내용과 크기 · 실제 Storage rules 거부 동작 · 레거시 admin UI 실행 확인.

### 유지

스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다.**
스펙 032 조사 보고서 **Codex 재검토 여전히 미완**. `firebase.json`의 `hosting.public`은 여전히
`"."` 이라 **deploy 금지 상태 그대로**다.

## ⚠️ STATE yaml 헤더 정정 (2026-07-31, 문서 전용)

`1aae91d` 시점의 yaml 헤더가 **`state: CODEX_PASSED` · `next_transition: READY_FOR_COMMIT`** 로
남아 있었다. 이는 **이미 종료된 스펙 032**를 가리키는 값이고, 아래 서술 섹션·`NEXT_CLAUDE_PROMPT.md`
(`READY_FOR_CODEX`)와 **모순**됐다.

**원인**: Codex가 작업 트리의 STATE yaml을 `CODEX_PASSED`로 바꿔 둔 뒤에, Claude가 종료 문서를
쓰면서 **자기가 이전에 쓴 문자열**(`state: READY_FOR_CODEX …` → `COMMITTED` → …)을 기준으로 치환해
**두 줄만 조용히 no-op** 됐다. 같은 커밋의 다른 필드(`completed_unit`·`active_unit`·`verified_commit`·
`origin_relation`)는 전부 정상 반영됐고, **커밋된 서술 내용과 조사 보고서에는 오류가 없다.**

**정정**: yaml 헤더를 서술·NEXT와 일치하도록 `READY_FOR_CODEX` / `CODEX_VERIFYING`으로 맞췄다.
`working_tree`에 content diff 0인 `packages/render/src/plan/index.ts`도 함께 명시했다.

**교훈**: Codex와 공유하는 문서는 **치환 대상 문자열의 존재를 단언(assert)** 하고 바꾼다.
치환 실패를 조용히 넘기면 상태 기계가 **가짜 상태로 진행**할 수 있다.

**제품 코드·테스트 변경 0.** 스펙 032는 `8a4ed09`에서 이미 정상 종료(DONE)됐고 이 정정으로 바뀌지 않는다.

## Claude 운영자 cm 입력 UI 읽기 전용 조사 완료 — READY_FOR_CODEX (2026-07-31)

보고서: `docs/codex-claude-handoff/reviews/2026-07-31-operator-cm-input-ui-investigation.md`
**문서 전용. 제품 코드·테스트·CSS·설정 diff 0**, 신규 의존성 0, 실제 network/live/Firebase/deploy 0.

### 핵심 발견 3개

1. **★ 리빌드 admin에 아무것도 없다.** `apps/admin/src`는 **3파일 79줄**의 스펙 011 프리미티브
   데모 셸이고, 카탈로그·저장·인증이 전부 없다. 리빌드 전체에 **쓰기 경로 0건**이며
   `packages/firebase`는 `FIREBASE_NOT_IMPLEMENTED`로 경계를 명시한다. 읽기도
   `published/state.json` 하나뿐이고 `admin/state.json`은 **읽지도 쓰지도 않는다**.
   → "입력란 두 개"가 아니라 **최초의 운영자 기능 + 최초의 쓰기 경로**다.
2. **★★ 레거시에 이미 명시적 cm 필드 `wcm`/`hcm`이 있다**(`denn-admin.html:1698`이 저장,
   `denn-mockup-tool.html:11302`가 **1순위**로 읽음). 스펙 032가 고른
   `printWidthCm`/`printHeightCm`은 레거시 후보 **6순위**라 하위호환은 안전하지만,
   **운영자가 실제 값을 넣어온 필드는 `wcm`/`hcm`** 이다. 지금 리빌드는 이를 `UNKNOWN_FIELD`
   경고로 흘리고 projection이 **`null`(=인쇄 불가)** 을 낸다 → **마이그레이션 결정 필요**.
3. **★ 레거시 사이즈 "수정"이 cm을 저장하지 않는다.** `confirmEditSz`가 `aspect`만 갱신하고
   `wcm`/`hcm` 대입이 없다 → **aspect와 cm이 조용히 어긋난다**. `editSz`는 `sub` 정규식 파싱과
   **`wcm=21` 날조 기본값**으로 폼을 채운다. 스펙 032가 NOT TESTED로 남긴 "aspect↔cm 불일치"의
   **실제 발생 메커니즘**이며, 새 UI가 **재현하면 안 되는** 동작이다.

### STOP — 결정 필요 (저장소 쓰기 없이 보고만)

| # | 항목 | 누가 |
| --- | --- | --- |
| STOP 1 | admin에 **인증·쓰기·발행**을 이번에 도입할지, 쓰기 없는 검증 단위로 쪼갤지 (Firebase 표면 = 자동 진행 금지) | **Founder** |
| STOP 2 | 기존 `wcm`/`hcm` 처리: 마이그레이션 / read가 함께 인정 / 무시하고 재입력 | **Founder + Codex** |
| STOP 3 | `sub` 텍스트를 cm에서 파생할지 독립 편집할지 | **Founder** |
| STOP 4 | 저장 경로 후보 A(검증만) / B(로컬 초안) / C(실제 쓰기) 택일 | **Codex** |
| STOP 5 | 레거시 `confirmEditSz` 동작 재현 금지를 스펙에 명시할지 | **Codex** |

### NOT VERIFIED

실제 `published/state.json`·`admin/state.json` 내용(실제 network 금지) — `wcm`/`hcm`이 실제 몇 건인지
모른다. 레거시 admin UI를 **실행해 보지 않았다**(근거는 전부 소스).

### 유지

스펙 032 P-1~P-6과 선행 029/030/031 확정분 **무변경**. **C-1은 여전히 Codex 결정이며 고르지 않았다.**
스펙 032 조사 보고서에 대한 **Codex 재검토는 여전히 미완** — 전제가 뒤집히면 STOP 2도 다시 열린다.

## Claude 스펙 032 종료 — DONE / COMMITTED (2026-07-31)

Codex가 `315356a`를 독립 검증해 **CODEX_PASSED**했다. 기능 코드·테스트는 **추가 수정 0**이고
종료 문서만 별도 fast-forward 커밋으로 처리했다.

### Codex 최종 검증 결과

| 게이트 | 결과 |
| --- | --- |
| frozen install / format / lint / typecheck / build | PASS |
| unit | **1109/1109 PASS** |
| Chromium E2E | **116/116 PASS** |
| `git diff --check`, forbidden diff, ports 4183/4184, OS temp staging | PASS |

알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다.

### 종료된 계약

- `frameSizes[].printWidthCm`·`printHeightCm` — all-or-nothing, finite·`> 0`·`<= 500`,
  위반은 **없는/틀린 쪽 path의 `INVALID_NUMBER` fail-closed**. 둘 다 없는 기존 카탈로그는 무회귀
- `projectFramePrintPhysicalSize` → `{widthCm,heightCm}` 또는 `null`만. `null`은 "아직 인쇄 불가"이지
  "기본값을 쓰라"가 아니다
- 이름·`sub`·label·id·`aspect`·논리 `w`/`h` → cm 추론 경로 **0** (unit으로 고정)

### NOT TESTED

실제 발행 카탈로그의 cm 필드(아직 없음 — 전부 합성 fixture) · `aspect`↔cm 비율 불일치 진단 ·
잔류 프로세스 command-line

### 다음 — 읽기 전용 조사

계약 §후속 순서 2의 **운영자용 cm 입력·검증·저장 UI**(`apps/admin/**`) 조사로 자동 전환한다.
**제품 코드 변경 0**이며, 스펙과 Founder 결정이 나오기 전에는 구현하지 않는다.

**여전히 미결**: C-1 인쇄 좌표 방법(후보 A/B/C, Codex 결정) · 인쇄소 요구 전체(외부 확인) ·
케이스 인쇄(P-1 분리) · C-2~C-8 · **조사 보고서 자체에 대한 Codex 재검토 미완**.

## Claude 스펙 032 구현 완료 — READY_FOR_CODEX (2026-07-31)

`docs/rebuild/specs/032-frame-print-physical-size-catalog.md`(계약 `2a0cfd3`)를 정본으로
허용 파일 안에서만 구현했다. 구현 커밋 **`c10e7a6`**, 기준 HEAD `2a0cfd3`.

### 구현한 계약

1. **catalog read** — `frameSizes[].printWidthCm`·`printHeightCm`을 allowlist에 추가하고
   `validatePrintSizeCm`으로 검증한다. 두 필드는 **함께 있거나 함께 없어야** 하며 각각 finite,
   `> 0`, `<= 500`이다. 한쪽만 있으면 **없는 쪽 path**로 `INVALID_NUMBER`를 낸다(추측·보정 0).
   둘 다 없는 기존 카탈로그는 **그대로 읽힌다**(UNKNOWN_FIELD 경고도 없다).
2. **projection** — `projectFramePrintPhysicalSize(document, frameSizeId)`는 `{widthCm,heightCm}`
   또는 `null`만 반환한다. 기존 preview projection의 `lookupById`·`run`·`fail` 규율을 재사용해
   중복·누락·malformed id를 식별정보 없이 실패시킨다. 각 필드는 **정확히 한 번만 읽어** drifting
   getter가 검증된 값을 바꿀 수 없다.
3. **금지된 추론 0** — 이름·`sub`·label·id·`aspect`·논리 `w`/`h` 중 어느 것도 cm로 쓰지 않는다.
   `aspect`만 있고 한쪽 cm만 있는 입력은 **보완하지 않고 실패**한다.

### 게이트

- frozen install `Already up to date`, lockfile diff **0**
- format / lint(`--error-on-warnings`) / typecheck: **PASS**
- unit **1109/1109 PASS** (스펙 031 시점 1088 → **+21**)
- 독립 build: **PASS**
- 전체 Chromium E2E **116/116 PASS** (신규 E2E 없음 — 이번 단위는 순수 계약)
- 고객 dist SHA-256 E2E 전후 **동일**(`74427f72…c9644c`)
- `git diff --check` 클린(CRLF 경고만), ports 4183/4184 LISTENING **0**, OS temp `denn-e2e-*` **0**

### 범위 준수

- `apps/**`, `packages/render/**`, 실제 print/export, PNG 생성, 주문 payload, 이름 파싱,
  fallback 치수, lockfile·의존성: 변경 **0**
- Firebase/Rules/CORS/Hosting/deploy, 실제 network/live, 운영 데이터·secret: **0**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**

### NOT TESTED

- 실제 발행 카탈로그에 cm 필드를 넣은 사례(아직 존재하지 않는다 — 운영자 입력 UI는 후속 스펙)
- `aspect`와 cm 비율의 불일치 진단(계약상 이번 단위에서 자동 수정하지 않는다)
- 잔류 프로세스 command-line

## Codex 스펙 031 보완 라운드 1 재검증 — CODEX_PASSED (2026-07-31)

대상 `b7d46d3`을 독립 재검증했다.

- frozen install, format, lint, typecheck: PASS
- unit: 1088/1088 PASS
- 독립 build: PASS
- Chromium E2E: 116/116 PASS
- `git diff --check`, lockfile·금지 범위: PASS
- ports 4183/4184, OS temp staging 잔류: 0
- 잔류 프로세스 command-line: NOT TESTED

시계 mat 좌표, 선언된 custom image 실패 시 overlay 숨김, requested font availability fail-closed
세 계약이 보완됐다. Claude는 기능 코드를 더 수정하지 않고 스펙 031 종료 문서만 별도
fast-forward commit/push한다. 다음 스펙은 자동 시작하지 않는다.

## Codex 스펙 031 독립 검증 — CORRECTION_REQUIRED 라운드 1 (2026-07-31)

대상 코드 `78095f8`, 문서 `78acdf6`. frozen, format/lint/typecheck, unit 1081/1081,
build, Chromium E2E 114/114, diff check, lockfile·금지 경로 0, ports/temp를 통과했다.

승인 차단 결함:

1. clock `x/y/size` percent를 전체 canvas wrapper에 적용한다. 정본과 레거시는 frame band 안의
   **mat rect** 대비 percent라서 frame band가 있으면 실제 부착 위치가 어긋난다.
2. custom clock image source 해석 실패를 `HH:MM`으로 fallback한다. 명시된 물리 하드웨어 종류를
   바꾸는 잘못된 복구이며 resolve/load 실패 시 overlay만 숨겨야 한다.
3. `document.fonts.ready`만 기다리고 요청 family를 `FontFaceSet.check`로 확인하지 않으며,
   FontFaceSet 부재도 ready로 처리한다. system fallback 측정으로 wrap이 달라질 수 있다.

보완은 위 세 계약의 composer/clock/CSS/unit/E2E 및 관련 문서만 허용한다.

## Codex 스펙 031 구현 계약 작성 완료 (2026-07-31)

Founder 결정 정본 `e3dc2b1`을 입력으로
`docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`를 작성했다.

- C-1~C-7·C-9~C-11 승인, C-8은 시계를 plan 밖 DOM preview overlay로 확정
- `maxChars` 1..200/기본 80 UTF-16 code unit, `maxLines` 1..5/기본 2
- custom clock image timer 0, text fallback은 분 경계 + 60초 갱신
- 상태 `WAITING_FOR_CLAUDE`; Claude만 허용 범위에서 구현

## Codex 스펙 031 조사 보완 재검토 — 승인 및 Founder 결정 대기 (2026-07-31)

보완 커밋 `7636367`은 시계의 제품 의미를 `UNCONFIRMED`로 정확히 낮추고, 결함·인쇄 포함 권장 단정을
제거했으며, 하드웨어 미리보기와 인쇄 그래픽의 구현 범위를 분리했다. 허용 문서 5개만 변경했고
`git diff --check`를 통과했으며 HEAD=origin, ahead/behind 0/0이다. 제품 코드 변경은 0이다.

Codex는 C-1~C-7·C-9~C-11의 구조 방향을 조사 근거와 일치하는 것으로 승인한다. C-8 시계 표현은
Founder F-4에 종속한다. 구현 전 Founder가 F-1~F-4·F-6~F-8을 결정해야 하며,
F-5는 F-4가 인쇄 그래픽일 때만 필요하다.

## Codex 스펙 031 조사 검토 — CORRECTION_REQUIRED 라운드 1 (2026-07-31)

문서 전용 커밋 `33323dd`는 허용 파일과 일치하고 `git diff --check`를 통과했으며
HEAD=origin, ahead/behind 0/0이다. 제품 코드·테스트·설정·lockfile 변경은 0이다.

다만 보고서가 “인쇄/export에 시계가 없는 것”을 결함으로 확정하고 인쇄 포함을 권고한 근거는
불충분하다. 레거시 관리자 UI는 `denn-admin.html:335-342`에서 이를 **“템플릿용 시계 가이드”**라고
설명하고, `denn-admin.html:473-482`에서 **“시계 이미지 (커스텀)”**과
“미설정 시 텍스트형 시계”로 관리한다. 이는 인쇄 그래픽이 아니라 완제품의 물리적 시계
하드웨어/표시를 미리 보여주는 오버레이일 가능성이 있다.

현재 근거로 어느 의미가 맞는지 확인할 수 없으므로 결함 판정과 “인쇄 포함” 권장을 유지할 수 없다.
Claude는 제품 코드를 수정하지 않고 조사 보고서와 관련 상태 문서만 보완한다. 확정할 제품/운영 근거가
없으면 `UNCONFIRMED`로 낮추고 Founder에게 시계의 제품 의미부터 묻는다.

## 스펙 030 종료 확인 및 스펙 031 읽기 전용 조사 전이 (2026-07-31)

종료 문서 커밋 `57d43b6`이 `origin/rebuild/modern-studio`와 일치하고 ahead/behind 0/0이며,
working tree에는 원인이 확정된 스펙 018 PNG 두 개만 남아 있음을 확인했다. 스펙 030은 DONE이다.

다음 작업은 `docs/rebuild/specs/019-canvas-geometry-contract.md`에 기록된 후속 순서
`deterministic renderer → image/CORS → pointer → text/clock → print`에 따라
**스펙 031 고객 텍스트 영역·시계 오버레이 계약의 읽기 전용 사전 조사**로 정한다.
Claude는 제품 코드를 수정하지 않고 `Automation/NEXT_CLAUDE_PROMPT.md`의 문서 전용 범위만 조사해
fast-forward push한 뒤 `READY_FOR_CODEX`로 전환한다.

## 스펙 029 종료 확인 및 다음 조사 전이 (2026-07-30)

종료 문서 커밋 `8d20b6d`가 origin과 일치하고 ahead/behind 0/0이며 허용된 문서 파일만 포함함을 확인했다.
스펙 029는 DONE이다. 전체 리빌드 루프는 유지하고, 스펙 030 이미지 회전 계약을 구현 없이
읽기 전용으로 조사하도록 `WAITING_FOR_CLAUDE`로 전환한다.

## Codex 스펙 030 조사 검토 — Founder 결정 대기 (2026-07-30)

문서 커밋 `8734307`은 허용된 문서 5개만 변경했고 `git diff --check`를 통과했으며
HEAD=origin, ahead/behind 0/0이다. 제품 코드·테스트·CSS·manifest·lockfile 변경은 0이다.

Codex 계약은 다음으로 확정한다.

- C-1: composer의 슬롯별 normalized transform에 `rotationQuarterTurns`를 추가한다.
- C-2: 저장 값은 `0|1|2|3`; 다른 값은 복구 없이 거부한다.
- C-3: pan은 화면축이며 회전 footprint로 maxPan을 다시 계산한다.
- C-4: 회전 중심은 zone 중심 + 현재 pan이다.
- C-5: `draw-image-cover`의 선택적 `rotationQuarterTurns`로 plan 어휘를 확장한다.
- C-6: executor는 한 command 안에서 save→translate→rotate→draw→restore를 수행한다.
- C-7: probe plan에도 회전을 포함하고 normalized 값을 유지해 재환산한다.
- C-8: 회전을 plan에 기록해 향후 print/export가 같은 plan을 소비하게 한다.
- C-9: 기존 오류 우선순위에서 transform 유한성·범위 검증 단계에 회전 검증을 편입한다.

Founder 권장 결정은 R-1 90° 배수만, R-3 액자 aspect 전환 미도입·별도 기능,
R-4 case multi-zone에도 슬롯별 제공, R-5 template art와 독립적으로 사진 회전 허용,
R-6 EXIF 직접 파싱 금지·브라우저 decode 실측이다. R-2는 R-1 승인 시 불필요하다.

## Founder 스펙 030 권장안 승인 (2026-07-31)

Founder가 R-1·R-2·R-3·R-4·R-5·R-6을 일괄 승인하고 자동화 재개를 지시했다.

- 사진 회전은 90° 배수만 지원한다.
- 임의 각도는 도입하지 않고 스펙 029의 scale 1.0~5.0·빈 공간 금지를 유지한다.
- 액자 가로/세로 aspect 전환은 사진 회전과 분리하며 이번 스펙에서 제외한다.
- case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- template art는 고정하고 사용자 사진만 회전한다.
- EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode를 합성 fixture로 실측한다.

Claude가 결정 정본을 문서 전용으로 기록한 뒤 `READY_FOR_CODEX`로 전환한다. 구현은 아직 시작하지 않는다.

## Codex independent review result

Spec 028 at `cebcaad` is not yet approved. The independent `corepack pnpm check`
completed successfully (format, lint, typecheck, unit 876/876, build), and
`git diff --check 7a2b2cd..cebcaad` passed. Full E2E is intentionally deferred
until the correction below is applied.

Two fail-closed/snapshot defects require correction:

1. `apps/mockup/src/canvas/templateArtBinding.ts`
   reads `source.kind` and `source.src` outside an exception boundary. A hostile
   getter or Proxy can escape instead of producing the safe failed state.
2. `packages/shared/src/catalog/images/placement.ts`
   rereads source and legacy-builder marker fields across helper calls. Getter
   drift can make the first read indicate a legacy crop variant and a later read
   remove that evidence, incorrectly returning `stretch`.

These are normal correction items, not Founder decisions. Claude may modify only
the exact files and documentation listed in `Automation/NEXT_CLAUDE_PROMPT.md`.
The two known Spec 018 PNG changes remain excluded from every commit.

## 보완 라운드 1 결과 (Claude, 2026-07-29)

Codex 지적 2건을 지정된 파일 안에서만 보완해 push했다.

- `apps/mockup/src/canvas/templateArtBinding.ts` (+ test): source `kind`/`src`를 예외 경계 안에서
  각각 1회만 읽어 plain snapshot으로 복사하고, 검증·crossOrigin/src 대입·결과 처리에 snapshot만
  사용한다. hostile getter/Proxy trap/revoked Proxy는 element 생성 없이 기존 `INVALID_INPUT`으로 닫힌다.
- `packages/shared/src/catalog/images/placement.ts` (+ test): source 체인과 legacy-builder marker를
  각각 1회만 읽어 boolean snapshot으로 판정한다. 첫 snapshot이 legacy crop이면 이후 drift와 무관하게
  `unsupported: legacy-builder-crop`을 유지한다(fail-open 불가).
- `apps/mockup/src/preview/PreviewComposer.tsx`: 허용된 lint 정리 1줄(`noUselessTernary`)만.

계약 무변경: crossOrigin-before-src, data URL 예외, 재시도 0, generation stale guard, cache 0,
기존 none/stretch/unsupported 결과와 오류 우선순위, Result에 원문 미추가.

게이트: frozen exit 0 / lockfile diff 0 / format·lint·typecheck PASS / unit 893 (876 → 893) /
build mockup JS 254.06 kB gzip 78.90, CSS 13.80/3.53 무변경, admin 무변경 / e2e 85 PASS exit 0 /
check PASS / `git diff --check` clean / 포트 4183·4184 free / OS temp `denn-e2e-*` 0 /
고객 dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·deploy 0.

커밋: 코드/test `d4fb99b`, 문서(+ 이 상태 문서) 별도 커밋. 스펙 018 PNG 2개는 restore/checkout/
stage/commit하지 않았다.

## 세션 종료 (2026-07-29)

Founder 지시로 이번 세션을 마감하고 **Claude Code의 5분 자동 루프를 종료**했다(cron job 취소).

- 스펙 028은 **종료되지 않았다**. `DONE`도 `CODEX_PASSED`도 아니며, Codex correction review 도중
  세션이 끝났다.
- 구현 후보: `f7b3f61`(최초 구현) → `d4fb99b`(보완 라운드 1). Codex의 마지막 review 기준선은 `cebcaad`.
- 보완 2건(templateArtBinding source 단일 snapshot / placement 전체 단일 snapshot과 drift fail-open
  차단)은 `d4fb99b`로 구현·push됐고, **그에 대한 Codex 재검증은 실행되지 않았다**.
- HEAD = origin = `b18b652`, ahead/behind 0/0. working tree에는 Codex E2E가 재생성한 스펙 018 PNG
  2개만 남아 있으며 restore/checkout/stage/commit하지 않았다.
- 실제 network, live test, Firebase/CORS/Rules/Hosting, deploy: **0**.
- 다음 스펙은 착수하지 않았다.

재개는 `Automation/NEXT_CLAUDE_PROMPT.md`와
`docs/handoff/2026-07-29-session-end-handoff.md`를 읽고 **수동으로** 시작한다.

## Codex 독립 재검증 — 승인 가능 (2026-07-30)

Founder의 수동 재개 승인 후 보완 코드 `d4fb99b`를 독립 재검증했다.

- `templateArtBinding`: source `kind`/`src`를 예외 경계 안에서 각각 1회 읽어
  snapshot만 사용하며 hostile getter, Proxy trap, revoked Proxy는 안전 실패한다.
- catalog placement: source 체인과 legacy-builder marker를 각각 1회 읽은 snapshot으로만
  판정하며 getter drift가 `legacy-builder-crop`을 `stretch`로 fail-open시키지 않는다.
- 변경 범위는 허용된 source/test 4개와 lint 의미 보존 1줄로 한정되고 `git diff --check`
  를 통과했다.

독립 게이트:

- frozen install PASS, lockfile diff 0
- format, lint, typecheck PASS
- unit 893/893 PASS
- build PASS: mockup JS 254.06 kB / gzip 78.90 kB, CSS 13.80 / 3.53 kB;
  admin JS 193.53 / 61.09 kB, CSS 8.54 / 2.64 kB
- E2E 85/85 PASS, exit 0
- 포트 4183·4184 listener 0, OS temp `denn-e2e-*` 0, 저장소 소속 node/esbuild 0
- 고객 dist fixture 0
- HEAD=origin=`baa0d78`, ahead/behind 0/0
- working tree에는 알려진 스펙 018 PNG 2개와 이 로컬 Automation 전이 문서만 존재

NOT TESTED/NOT VERIFIED 유지:

- 운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패
- 운영 이미지·카탈로그, 실기기 4환경, 실제 200% 확대
- print/export taint, 대용량 아트 성능
- 썸네일(non-CORS)과 owner(anonymous)의 동일 URL 캐시 오염 가능성

스펙 028은 코드 기준 승인 가능하다. Claude Code는
`Automation/NEXT_CLAUDE_PROMPT.md`의 종료 문서 범위만 처리하고 다음 스펙을 시작하지 않는다.

## 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-30)

승인 판정에 따라 **종료 문서만** 하나의 문서 commit으로 처리하고 일반 fast-forward push했다.

- 승인 대상 보완 코드 `d4fb99b`, 문서 기준 HEAD `baa0d78`
- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/028-template-art-stretch-cors-owner.md`,
  `docs/handoff/2026-07-29-spec-028-template-art-handoff.md`,
  `docs/handoff/2026-07-29-session-end-handoff.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `docs/codex-claude-handoff/CURRENT.md`, `Automation/DENN_AUTOMATION_STATE.md`,
  `Automation/NEXT_CLAUDE_PROMPT.md`
- 기능 코드·테스트·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- Claude 재실측(같은 트리): frozen exit 0 · lockfile diff 0 / format·lint·typecheck /
  unit **893** / build 동일 수치 / e2e **85 PASS** exit 0 19.5초 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 → Codex 독립 게이트와 일치
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit **하지 않았다**(working tree에 그 2개만 잔존)
- 다음 스펙(029 등)·사전조사·기능 **미착수**

다음 전이: Codex가 이 문서 커밋의 최종 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 029 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`.

- 재사용 확정: `computeCoverDrawRect`(cover + pan clamp, 입력 무변형, `appliedTransform`·`maxPan`),
  `clientPointToLogical`(logical px, DPR 무관), plan/adapter의 zone별 `transform`
  → `packages/render` 무변경으로 시작 가능
- 차단 계약 2건: pan 단위·기준 공간(액자 logical canvas 가변), transform 소유자(스펙 026 owner의
  `transform`이 리터럴 `{scale:1,x:0,y:0}`)
- 레거시 결함(재현 금지): 인쇄 pan 배율의 frame 하드코딩 `dim.w/500`, zoom 두 축 범위 불일치,
  multi-zone 슬라이더 표시값·터치 시작 오프셋 오류, pointer capture 부재
- 검증 한계: 2손가락 핀치는 Playwright로 구동 불가 → 구조적 NOT TESTED
- 결정 필요 9건(D-1~D-9, Founder 5건) · 최소 구현 순서 · 허용 파일 후보 · STOP 9조건 기록
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (**문서 전용 커밋**)
- 제품 코드·테스트·설정·CSS·PNG·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·이미지 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- 구현 스펙 작성·pointer/pan/zoom 구현·다음 기능 착수 **없음**

다음 전이: Codex가 조사 보고서를 검토해 구현 스펙(또는 추가 조사 지시)을 작성한다. 그 전까지 Claude는
어떤 제품 코드도 만들지 않는다.

## Codex 조사 검토 — Founder 결정 대기 (2026-07-30)

문서 전용 커밋 `2ded576`은 허용 범위와 정확히 일치하고 `git diff --check`를 통과했다.
제품 코드·테스트·설정·CSS·manifest·lockfile 변경은 0이며 HEAD=origin, ahead/behind 0/0이다.

Codex 계약 결정:

- D-1: 편집 상태는 `scale`(무차원)과 축별 normalized pan `x/y ∈ [-1,1]`을 저장한다.
  `x/y`는 현재 scale에서 계산한 축별 `maxPan` 대비 비율이며 `maxPan=0`인 축은 0이다.
  plan 생성 시에만 현재 zone의 logical px로 환산한다.
- D-4: 키보드 이동은 축별 normalized pan 0.02/step, Shift는 0.10/step으로 한다.
- D-8: composer가 slot별 transform을 소유한다. 스펙 026 image owner는 drawable/ref/intrinsic만
  소유하고 기존 리터럴 transform 계약을 바꾸지 않는다.
- D-9: 이미지 교체·삭제, model/template/frame-size 변경 시 해당 transform을 초기화한다.
  색상 변경과 활성 slot 전환에서는 유지한다.

Founder 결정이 필요한 권장 묶음:

- D-2: case multi-zone은 슬롯 카드 선택 + 활성 슬롯 표시
- D-3: scale 단일 범위 1.0~5.0, 내부 무차원·표시만 %, 휠/버튼은 승산 방식
- D-5: 중복 없는 단일 `원래대로` 버튼
- D-6: 1차 핀치 미지원; 슬라이더·버튼·휠·키보드·마우스 drag 제공
- D-7: 빈 공간 금지; 최소 scale 1.0과 cover clamp 유지

위 다섯 항목은 제품 UX 결정이므로 승인 전 구현 스펙·제품 코드를 작성하지 않는다.

## Founder 결정 접수·기록 완료 (Claude Code, 2026-07-30)

Founder가 다음 문장을 그대로 승인했다: `스펙 029 Founder 권장안 D-2·D-3·D-5·D-6·D-7 일괄 승인.`
Codex는 저장소만 읽으므로 결정을 정본 문서로 남겼다:
`docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`.

승인된 값(요약): D-2 슬롯 카드 선택 + 활성 슬롯 표시 / D-3 scale **1.0~5.0** 단일 범위·내부 무차원·
표시만 %·휠·버튼 **승산** / D-5 단일 `원래대로` 버튼 / D-6 **1차 핀치 미지원**(슬라이더·버튼·휠·키보드·
마우스 drag) / D-7 **빈 공간 금지**(최소 scale 1.0 + cover clamp 유지). Codex 계약 D-1·D-4·D-8·D-9는
결정 문서 §2에 그대로 옮겨 함께 보존했다.

- 이 라운드 변경: **문서 전용**(결정 문서 1 신규 + `CURRENT.md` + live log + 이 문서 +
  `NEXT_CLAUDE_PROMPT.md`)
- 제품 코드·테스트·설정·CSS·PNG·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- pointer/pan/zoom 구현 **0**, 구현 스펙 작성 **0**(Codex 소유)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- `Automation/DENN_AUTOMATION_RUNBOOK.md`의 미커밋 변경은 **Codex 소유로 판단해 손대지 않았다**

다음 전이: Codex가 이 결정을 입력으로 **스펙 029 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.

## Codex 구현 계약 작성 완료 (2026-07-30)

Founder 승인과 결정 정본 `7701c7a`를 입력으로
`docs/rebuild/specs/029-pointer-pan-zoom-editing.md`를 작성했다.
상태를 `WAITING_FOR_CLAUDE`로 전환하며 Claude는 해당 스펙의 허용 파일과 게이트 안에서만 구현한다.

## Codex 독립 검증 — CORRECTION_REQUIRED (2026-07-30)

대상 `95fcf92` / 문서 `197527c`를 독립 확인했다.

- frozen install PASS, lockfile diff 0
- format·lint·typecheck PASS
- unit 938/938 PASS
- mockup/admin build PASS
- E2E 90/90 PASS, 정상 exit
- `git diff --check 7701c7a..197527c` PASS
- HEAD=origin=`197527c`, ahead/behind 0/0

다만 pointer 종료 계약에 실제 결함 2건이 있어 승인할 수 없다.

1. `createDragController.end()`가 pointerup 직전 rAF에 대기 중인 최신 transform을 취소한다.
   move와 pointerup이 같은 frame 안에 오면 사용자가 놓은 최종 위치가 사라지고 직전 렌더 위치로 되돌아간다.
   현재 unit test는 이 손실을 정상 동작으로 고정하고 있다. pointerup은 최신 pending 값을 정확히 한 번
   동기 commit한 뒤 종료해야 하며 pointercancel/lost/selection/unmount만 폐기해야 한다.
2. `setPointerCapture()` 예외를 무시한 채 drag session을 유지한다. capture 실패 후 포인터가 영역 밖에서
   놓이면 pointerup을 받지 못해 세션이 열린 채 남을 수 있다. capture 실패 시 즉시 해당 세션을 abort하고
   `dragSlotRef`를 비워 안전 실패해야 한다.

수정 허용 범위는 `apps/mockup/src/preview/imageTransform.ts`,
`apps/mockup/src/preview/imageTransform.test.ts`, `apps/mockup/src/preview/PreviewComposer.tsx`,
`apps/mockup/src/preview/PreviewComposer.test.tsx`와 관련 E2E/문서/Automation뿐이다.

## Codex 보완 라운드 1 재검증 — 승인 가능 (2026-07-30)

대상 코드 `110511e`, 문서 `0512c8d`를 독립 재검증했다.

- pointerup pending transform 정확히 1회 flush, cancel/lost/abort/dispose 폐기 확인
- stale callback·다음 세션 오염 0, capture 실패 즉시 abort 확인
- frozen install PASS, lockfile diff 0, 신규 의존성 0
- format·lint·typecheck PASS
- unit 944/944 PASS
- build PASS: mockup JS 263.31 kB/gzip 81.60, CSS 15.47/3.88; admin 무변경
- E2E 91/91 PASS, 정상 exit
- `git diff --check` PASS
- 포트 4183/4184 listener 0, OS temp `denn-e2e-*` 0
- HEAD=origin=`0512c8d`, ahead/behind 0/0
- working tree는 Codex 소유 RUNBOOK과 알려진 스펙 018 PNG 두 개만 남음

스펙 029는 코드 기준 승인 가능하다. Claude는 종료 문서만 처리하고 다음 스펙을 시작하지 않는다.

## 스펙 029 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

스펙 §4 허용 파일 안에서만 구현하고 코드/test와 문서를 분리 커밋했다.

- 코드/test 커밋 `95fcf92`, 기준 `7701c7a`(Founder 결정), 스펙 `029-pointer-pan-zoom-editing.md`
- 상태 모델: 슬롯별 `scale`(무차원 1.0~5.0) + 축별 normalized pan `[-1,1]`, plan 직전에만 logical 환산,
  `maxPan=0` 축 고정, resize는 normalized 유지 후 재환산
- `maxPan`은 pan 0 probe plan의 cover 명령에서 읽어 어댑터 rect 공식을 복제하지 않음(둘 중 하나라도
  실패하면 plan 미생성)
- Pointer Events + capture, 3종 종료 + selection/unmount, generation 가드, rAF 1회 병합,
  휠은 scale이 실제로 바뀔 때만 preventDefault, touch-action 선언 0(스크롤·브라우저 확대 보존)
- 슬롯 카드 선택 + `편집 중` 표시, 단일 `원래대로`, 화살표 0.02 / Shift 0.10,
  사진 미준비 슬롯은 컨트롤 전부 disabled
- 초기화: 이미지 교체·삭제·실패 → 그 슬롯만 / model·template·frame-size·kind → 전체 /
  색상 변경·활성 슬롯 전환 → 유지
- 발견·수정: stale animation frame이 다음 세션의 pending 값을 소비해 재-grab 첫 move가 누락되던 결함
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit 938 (893 → 938) / e2e 90 PASS (85 → 90) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·Firebase·CORS·deploy 0
- 번들: mockup JS 254.06 → 263.19 kB (gzip 78.90 → 81.56), CSS 13.80 → 15.47 (gzip 3.53 → 3.88),
  admin 무변경
- NOT TESTED: 2손가락 핀치(미구현·Playwright 구동 불가), 터치 drag(1차 미지원), 실기기 4환경,
  실제 200% 확대, print/export pan, 대용량 성능·EXIF
- `packages/**`·`apps/admin/**`·운영 HTML·Firebase 설정/Rules/CORS/Hosting·POC·manifest·lockfile 무변경,
  스펙 026 owner(`localImageBinding.ts`)와 `productPlan.ts`도 무수정
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`는 건드리지 않았다

다음 전이: Codex가 `95fcf92`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 029 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-30)

Codex 지적 2건은 모두 유효했고 지정된 파일 안에서만 보완해 push했다. 코드/test `110511e`, 문서 별도 커밋.

- 지적 1 (릴리즈 flush): `end(pointerId, "pointerup")`이 대기 중인 최신 transform을 버려, 릴리즈 직전
  move가 animation frame을 기다리는 중이면 사진이 손을 놓은 위치보다 한 프레임 뒤에 남았다.
  이제 `pointerup`만 정확히 1회 flush한 뒤 종료하고, `pointercancel`·`lostpointercapture`·selection
  abort·unmount/dispose는 pending을 폐기한다. flush는 state 정리와 frame 취소 후에 실행되므로 늦은 rAF는
  commit 0이고 이중 commit도 다음 세션 pending 소비도 없다. `cancelFrame`은 frame 유무와 무관하게 항상
  pending을 비운다.
- 지적 2 (capture 실패): `setPointerCapture`가 throw하면 capture 없는 drag가 계속됐다. 이제 방금 시작한
  세션을 즉시 abort하고 `dragSlotRef.current`를 비운다.
- 유지된 계약: normalized 저장, plan 직전 환산, `maxPan=0` 고정, 1.1 승산, 0.02/0.10 키보드 스텝,
  단일 `원래대로`, generation 가드, rAF 1회 병합, 터치 drag·핀치 미지원, `touch-action` 선언 0,
  초기화 행렬, 스펙 026 owner와 `packages/**` 무변경.
- 신규 회귀 테스트: flush 1회 / 이미 실행된 frame 중복 commit 0 / move 없는 pointerup commit 0 /
  다음 세션 누출·소비 0 / 다른 pointerId의 stale end flush 0 / throwing subscriber 후 세션 종료·재사용 /
  abort·dispose 폐기 / 실제 Chromium에서 capture 거부 시 픽셀 불변 + 원복 후 정상 drag.
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit 944 (938 → 944) / e2e 91 PASS (90 → 91) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·Firebase·CORS·deploy 0.
- 번들: mockup JS 263.19 → 263.31 kB (gzip 81.56 → 81.60), CSS 무변경, admin 무변경.
- 변경 파일: `apps/mockup/src/preview/imageTransform.ts`(+ test), `PreviewComposer.tsx`,
  `tests/e2e/mockup-preview.spec.ts` — 허용 목록 안. CSS·설정·manifest·lockfile·`packages/**` 무변경.
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다.

다음 전이: Codex가 `110511e`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 029 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-30)

Codex 승인(코드 `110511e`, 문서 `0512c8d`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`(§CODEX_PASSED),
  `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`(§9 + 상태 줄),
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `docs/codex-claude-handoff/CURRENT.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: unit **944/944**, E2E **91/91**, build mockup JS 263.31 kB / gzip 81.60,
  CSS 15.47 / 3.88, admin 무변경, 보완 2건(릴리즈 flush · capture 실패 즉시 abort),
  network/live/deploy **0**
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다
- NOT TESTED 유지: 2손가락 핀치(미구현·Playwright 구동 불가), 터치 drag, 실기기 4환경,
  실제 200% 브라우저 확대, print/export pan 재현, 대용량 이미지 실기기 성능·EXIF, 운영 카탈로그·이미지
- 다음 스펙(030 등)·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 030 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`(15항목).

- 회전 소유자 4개를 근거 라인과 함께 분리했다: 액자 가로/세로 ±90(사진 픽셀), 룸 tilt(액자 목업),
  워터마크 기울기, 텍스트 존 회전(인쇄 반영). 기기 방향 전환·회전 전체화면은 룸 표시 셸이며 사진과 무관.
- 액자 가로/세로는 레거시에서 미완이다: aspect transpose가 `normFrameRatio`로 되돌려지고 캔버스 CSS
  회전은 no-op이며, 회전 경로는 pan clamp를 잃고 전역 `state.rot` 폴백이 케이스 사진까지 회전시킨다.
- 인쇄 경로는 회전을 무시한다 → 미리보기와 인쇄가 어긋난다.
- EXIF는 레거시·리빌드 모두 직접 처리 0. 리빌드는 `<img>`+`naturalWidth`라 엔진 기본 동작에 의존하며
  이 저장소에서 실측된 적이 없다(NOT VERIFIED). 직접 파싱은 이중 회전·신규 의존성 때문에 비권장.
- 핵심 계약 충돌: 임의 각도는 스펙 029 Founder 확정값 D-3(scale 하한 1.0)·D-7(빈 공간 금지)와 수학적으로
  충돌한다(45°에서 cover 최소 배율 √2). 90° 배수면 019 cover와 029 normalized pan을 그대로 재사용한다.
- 회전은 `packages/render` 계약 변경이 전제다(plan에 rotation 필드 없음, executor는 transform 금지 명시).
- 결정 필요: Founder 6건(R-1 각도 집합, R-2 D-3/D-7 재해석, R-3 액자 가로/세로 분리 도입, R-4 case 회전,
  R-5 아트 템플릿 회전, R-6 EXIF 직접 정규화) + Codex 9건(C-1~C-9).
- 최소 구현 순서, 허용 파일 후보, unit/Chromium/실기기 검증 설계, 지원 불가·근거 부족, STOP 10조건 기록.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 R-1~R-6 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 회전 관련 제품 코드를 만들지 않는다.

## 스펙 030 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

`NEXT_CLAUDE_PROMPT.md`의 문서 전용 범위만 수행했다. 정본
`docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`(신규).

승인 문장(원문): `스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인하고 자동화 재개.`

기록한 Founder 결정:

- R-1: 고객 사진 회전은 90° 배수만 지원하고 `왼쪽 90°`/`오른쪽 90°` 버튼을 사용한다.
- R-2: 임의 각도를 도입하지 않아 스펙 029의 scale 1.0~5.0과 클립 안 빈 공간 금지를 유지한다.
- R-3: 액자 가로/세로 aspect 전환은 별도 기능이며 이번 스펙에서 제외한다.
- R-4: case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- R-5: template art는 고정하고 사용자 사진만 회전한다.
- R-6: EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode를 합성 EXIF fixture로 실측한다.

Codex 구조 계약 C-1~C-9는 조사 보고서와 이 문서의 기록 그대로 결정 문서 §2에 옮겨 보존했다.

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
  (`NEXT_CLAUDE_PROMPT.md`의 전이 지시 변경분 포함). 허용 파일 목록과 정확히 일치한다.
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 회전 관련 제품 코드 **0**, 구현 스펙 작성 **0**(Codex 소유), `packages/**` 무변경
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- `git diff --check` clean, 일반 fast-forward push, HEAD=origin, ahead/behind 0/0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다(working tree에 그 2개만 잔존)

다음 전이: Codex가 이 결정을 입력으로 **스펙 030 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.
그 전까지 Claude는 회전 관련 제품 코드를 만들지 않는다.

## Codex 결정 정본 검토 및 구현 계약 확정 (2026-07-31)

결정 정본 커밋 `cf1cfd2`는 허용된 문서 5개만 변경했고 `git diff --check`를 통과했다.
R-1~R-6과 C-1~C-9는 Founder 승인 및 조사 근거와 일치한다.

구현 정본은 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`다. 실효 상태를
`WAITING_FOR_CLAUDE`로 전환한다. Claude는 해당 스펙의 허용 파일·오류 우선순위·검증 계약
안에서만 구현하고, 제품 코드/test 커밋을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`로
전환한다.

## 스펙 030 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

스펙 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md` §4 허용 파일 안에서만 구현하고
코드/test와 문서를 분리 커밋했다. 코드/test `fbbadeb`, 기준 계약 `2777010`.

- 상태 모델: 슬롯별 `rotationQuarterTurns 0|1|2|3`, 전역 회전 상태 0, D-9 초기화 행렬에 회전 편입
- 잘못된 값(`4`·`-1`·`1.5`·`90`·`"1"`·`NaN`·drift/throwing getter)은 복구 없이 거부
- 90°/270°는 cover에 넘기는 intrinsic w/h를 스왑해 회전 footprint를 얻는다 → `packages/render/src/geometry`
  무변경, 029 `maxPan` 공식 그대로 성립
- `draw-image-cover`의 선택적 `rotationQuarterTurns`만 추가하고 0이면 미emit → pre-030 plan과 바이트 동일
- executor는 회전 시에만 커맨드 내부 save→clip→translate→rotate→drawImage→restore, 중심은 drawRect 중심
- probe plan에도 회전 포함, template art는 무회전
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **989**(944→989) / build mockup JS 265.53 kB gzip 82.11, CSS 15.50/3.89, admin 무변경 /
  E2E **99 PASS**(91→99) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일·fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- ★ R-6 실측(저장소 최초): `Orientation=6` 합성 JPEG(40×20)이 Chromium에서 20×40으로 decode된다 →
  브라우저가 EXIF를 적용하므로 직접 파싱은 이중 회전. 조사의 NOT VERIFIED는 Chromium 한정 해소
- ★ 판단 요청 1건: executor 포트 `apps/mockup/src/canvas/types.ts`가 §4 허용 목록 밖이라
  `translate`/`rotate`를 executor 런타임 검사로 요구하고 없으면 preflight fail-closed로 처리했다.
  허용 파일 확장이 더 낫다고 판단되면 그 방향으로 보완한다(인계 §3.2)
- 변경 파일 13개 전부 §4 허용 목록 안. `surface.css`·`previewContracts.test.ts`는 변경 불필요로 무변경
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 `fbbadeb`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## Codex 독립 검증 — CORRECTION_REQUIRED (2026-07-31, 라운드 1)

코드 `fbbadeb`, 문서 `e4a9133`의 독립 검증 결과:

- frozen install, format, lint, typecheck, unit **989/989**, mockup/admin build,
  Chromium E2E **99/99**, `git diff --check`, dist SHA-256 전후 동일: PASS
- lockfile·신규 의존성·금지 경로 diff 0, 포트 4183/4184 listener 0, OS temp 0
- 잔류 프로세스 command-line 열람은 OS 권한 거부로 **NOT TESTED**

보완 1건: `executePreviewPlan.ts`는 회전 command에서 `translate`/`rotate`를 요구하지만 공개
`PreviewCanvasContext`가 두 capability를 선언하지 않는다. 타입을 정확히 구현한 소비자가 컴파일을
통과한 뒤 회전 plan에서만 실패할 수 있으므로 `apps/mockup/src/canvas/types.ts`를 최소 허용 확장한다.
두 메서드를 선택적 capability로 선언하고, 미지원 context는 unrotated plan만 호환되며 rotated plan은
preflight fail-closed임을 문서와 테스트로 고정한다.

## 스펙 030 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 1건은 유효했고 지정된 파일 안에서만 보완해 push했다. 코드/test `603cd25`, 기준 `e4a9133`.

- 지적: executor가 회전 command에서 `translate`/`rotate`를 요구하는데 공개 `PreviewCanvasContext`가
  둘을 선언하지 않아, 타입을 정확히 구현한 소비자가 컴파일을 통과한 뒤 회전 plan에서만 실패할 수 있었다.
- 보완 1: 두 메서드를 **선택적 capability로 공개 포트에 선언**했다. 선택성 자체가 계약이며, 없는
  컨텍스트는 unrotated plan을 그대로 실행하고 회전 plan만 둘 다 요구한다.
- 보완 2: fail-closed 계약을 공개 포트에 문서화했다 — 하나라도 없으면 preflight
  `INVALID_EXECUTOR_INPUT`이고 Canvas 연산 0이다.
- 보완 3: `RotationCapableCanvasContext`를 공개 타입에서 `Required<Pick<…>>`로 파생하고 executor의
  중복 interface를 삭제했다. `ROTATION_METHODS`는 `keyof PreviewCanvasContext`로 검사하므로 메서드명이
  바뀌면 컴파일이 깨진다.
- 신규 테스트 6: 공개 타입만으로 선언된 capability-free 컨텍스트의 unrotated PASS(transform 시도 0),
  명시적 회전 0도 동일, 회전 1·2·3 전부 fail-closed(Canvas 연산 0), 절반의 capability도 실패,
  함수 아닌 값도 실패, 실제 `CanvasRenderingContext2D`의 컴파일 타임 assignability.
- 무변경: 회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9. E2E 99개 그대로 PASS.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **995**(989→995) / build mockup JS 265.52 kB gzip 82.10, CSS·admin 무변경 /
  E2E **99 PASS** exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 변경 파일: `apps/mockup/src/canvas/types.ts`, `executePreviewPlan.ts`, `executePreviewPlan.test.ts`
  — 허용 목록과 정확히 일치
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- ⚠️ 미회신: 판단 요청 ②(R-6 실측을 조사 보고서 §7 `NOT VERIFIED` 해소로 반영할지)는 이번 회신에
  판정이 없었다. 보고서는 Codex 소유라 Claude가 수정하지 않았다.

다음 전이: Codex가 `603cd25`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## Codex 보완 라운드 1 재검증 — CODEX_PASSED (2026-07-31)

코드 `603cd25`, 문서 `1aa3302`를 독립 재검증해 승인한다.

- 공개 포트의 선택적 rotation capability, fail-closed 계약, 단일 타입 정본 확인
- frozen install, format, lint, typecheck, unit **995/995**, mockup/admin build
- Chromium E2E **99/99**, `git diff --check`, dist SHA-256 전후 동일
- lockfile·신규 의존성·금지 경로 diff 0, 포트 4183/4184 0, OS temp 0
- Chromium 합성 EXIF Orientation=6 적용은 검증됨; 그 밖의 엔진·실기기는 NOT TESTED

스펙 030 기능·보완 검증을 통과했다. 다음은 Claude가 종료 문서만 별도 fast-forward push한다.

## 스펙 030 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-31)

Codex 승인(코드 `603cd25`, 문서 `1aa3302`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
  (§CODEX_PASSED), `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`(§10 + 상태 줄),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: unit **995/995**, E2E **99/99**, build mockup JS 265.52 kB / gzip 82.10,
  CSS 15.50 / 3.89, admin 무변경, 보완 1건(공개 포트 rotation capability 선언 · fail-closed 문서화 ·
  단일 타입 정본), network/live/deploy **0**
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 603cd25..HEAD -- apps packages tests` = 0줄), 신규 의존성 0
- Claude 재실측(같은 트리): `check` PASS(format·lint·typecheck·unit·build)
- ★ 판단 요청 ② 회신 반영: Chromium 합성 EXIF `Orientation=6` 적용은 **검증됨**으로 기록했고,
  그 밖의 엔진·실기기는 NOT TESTED로 유지했다. 조사 보고서는 Codex 소유·허용 파일 밖이라 수정하지 않았다
- NOT TESTED 유지: **잔류 프로세스 command-line 검사(OS 권한 거부)**, 실기기 4환경 EXIF·조작성,
  카메라 원본 orientation 1~8, 실제 print/export 회전, 대용량 성능·메모리, 실제 200% 확대, 임의 각도
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- 다음 스펙·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 031 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`(13항목, 지시 10항목 전부 포함).

- 텍스트 소유자 2개를 근거 라인과 함께 분리했다: 액자 **키 기반 `textZones`**(운영자가 좌표·글꼴,
  고객이 값만) vs 케이스 **자유 배치 `textObjs`**(고객이 드래그). 코드·데이터 공유 0.
- zone 필드 전수와 기본값, 레이어 순서(사진 → 아트 → 텍스트 → 시계 → 테두리)를 기록했다.
- 레거시 결함 3건(재현 금지): 빈 값 판정 불일치로 `"0"` 소실, 줄 수 상한 미리보기 2 / 인쇄 3,
  기본 글자색이 경로에 따라 `#111`↔`#FFF`로 뒤집힘.
- ★ 인쇄/export 경로에 **시계가 아예 없다** → 고객이 본 화면과 인쇄물이 구조적으로 다르다.
- 시계 계약: 3단 병합(`clockSettings` → `frameSizes.clock` → `frameTemplates.clock`), `{x,y,size,customImg}`,
  로컬 시간 24h `HH:MM` 고정, 1초 `setInterval`, 타이머 정리 부실, `drawClockLayer` 12중 재정의.
- 카탈로그 V1은 `textZones`·`clock`·`clockEnabled`·`clockSettings`·`customFonts`를 보존만 하고
  **투영은 0**이다. `packages/render` plan 커맨드는 4개뿐이고 **텍스트 어휘가 없다**.
- ★ 핵심 계약 딜레마: wrap은 `measureText`(Canvas)가 필요한데 plan은 순수·JSON-safe여야 한다 →
  **빌더에 측정 포트를 주입해 `lines[]`를 plan에 확정**할 것을 권고했다. 레거시 결함이 정확히 반대
  선택(executor가 wrap)에서 나왔다.
- 결정 필요: Founder 8건(F-1~F-8, 특히 **F-4 시계를 인쇄에 포함할지**)과 Codex 11건(C-1~C-11).
- 검증 설계(fake 측정 포트, Playwright `page.clock` 고정 시각, 실제 시간·timezone 의존 금지),
  최소 구현 순서, 허용 파일 후보, STOP 12조건을 기록했다.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- NOT VERIFIED: 레거시 실제 실행 0(코드 근거만), `drawClockLayer` 12중 재정의의 런타임 최종 승자,
  `customFonts` 실제 데이터 형태, 실기기 IME·폰트 대체·인쇄물 가독성.
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 F-1~F-8 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 텍스트·시계 관련 제품 코드를 만들지 않는다.

## 스펙 031 조사 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 1건은 **유효**했고 허용된 문서 안에서만 보완했다. 기준 `33323dd`, 문서 전용 커밋.

- 지적: 조사가 "인쇄에 시계가 없다"는 코드 사실에서 곧바로 "구조적 불일치·결함" 판정과 "인쇄 포함"
  권장을 도출했다. `admin:335`("템플릿용 시계 가이드")·`admin:342`("템플릿 제작 시 시계를 미리 보면서
  위치를 잡고")는 시계가 완제품의 물리적 하드웨어일 가능성을 지지한다.
- 추가 조사 결과를 보고서 §3.5.1에 양쪽 근거로 정리했다. 새로 찾은 근거: 주문 payload에 시계 상태가
  없다(하드웨어 쪽), `clockOn`이 `space-scene-v1`의 `design`에 저장된다(그래픽 쪽), 하드웨어 어휘
  (무브먼트·바늘·초침·타공·벽시계·건전지)가 두 운영본 HTML과 `docs/` 전체에서 0건이다(양쪽 다 불확정).
- **판정 `UNCONFIRMED`**: §0·§3.5·§10에서 "구조적 불일치"·"결함"·"인쇄 포함 권장" 단정을 제거했고,
  §3.5는 관측된 코드 사실만 주장한다.
- Founder 결정 순서를 재구성했다: F-4(제품 의미) → F-4a(하드웨어면 print 미포함 유지, preview 전용) /
  F-4b(그래픽이면 포함 여부) → F-5(F-4b일 때만 시각 의미).
- 구현 범위를 §8.4에서 분기했다. 하드웨어로 확정되면 print/export와 공유할 결정적 plan을 전제하지 않고
  preview overlay 계약과 timer 정리만 다룬다. C-8을 F-4 종속으로 바꾸고 STOP 조건 11·12를 추가했다.
- 바꾸지 않은 것: §1·§2 textZones 조사 전체, §4~§7, C-1~C-7·C-9~C-11, §9 검증 설계.
- 변경 파일: 보고서 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` — 허용 목록과 정확히 일치
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 보완된 보고서를 재검토한다. **F-4는 Founder 결정이 필요하며 Claude가 확정하지 않는다.**

## 스펙 031 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex가 보완 조사 `7636367`을 승인하고 `FOUNDER_DECISION_REQUIRED`로 전이한 뒤 Founder가 결정했다.
정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`(신규).

★ F-4: **시계는 "완제품의 물리적 시계 하드웨어 미리보기"다.** 조사 §3.5.1의 `UNCONFIRMED`가 확정됐다.

- print/export에 시계를 **포함하지 않는다**. 현행 동작이 곧 정답이며, 레거시 인쇄 경로가 시계를 빼 온 것은
  결함이 아니라 의도였다.
- "미리보기≠인쇄"는 문제가 아니다. F-5(인쇄 시각의 의미)는 **불필요**해졌다.
- `packages/render` 계약은 **시계 때문에 바뀌지 않는다**. 텍스트 때문에만 확장한다.
- 시계는 **plan에 담기지 않으며** print/export와 공유할 결정적 plan을 전제하지 않는다.
- 시계 구현 범위는 조사 §8.4 ⓐ 갈래 — **preview overlay 계약과 timer lifecycle뿐**이다
  (DOM 분리 여부 · 1초 갱신 필요성 · 타이머 정확히 1개 보장 · 실물 부착 안내 문구).

Founder 텍스트 묶음 일괄 승인:

- F-1: 1차는 액자 key 기반 `textZones`만. 케이스 자유 배치 텍스트는 별도 스펙.
- F-2: 고객 색·그림자 변경 1차 미지원. 운영자 zone 스타일이 단일 정본.
- F-3: 운영자 `defaultTexts`는 값으로 자동 입력하지 않고 placeholder로만 표시한다.
- F-6: zone별 길이 상한을 계약 필드로 두고 초과 입력을 차단한다. 자르기·말줄임·자동복구 없음.
- F-7: zone별 줄 수 상한, 기본 2줄로 통일한다.
- F-8: 다섯 키를 균일 처리하되 `name2` 기본값은 만들지 않는다. admin 편집기 확장은 별도 스펙.

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 텍스트·시계 제품 코드 **0**, 구현 스펙 작성 **0**(Codex 소유)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 이 결정을 입력으로 **스펙 031 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.

## 스펙 031 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

스펙 `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md` §4 허용 파일 안에서만 구현하고
코드/test와 문서를 분리 커밋했다. 코드/test `78095f8`, 기준 계약 `3927420`.

- 투영: 다섯 키 `textZones` 정규화(닫힌 범위, 중복·미지원 키 거부, `maxChars` 기본 80·`maxLines` 기본 2),
  `defaultTexts`는 placeholder 전용이며 `name2`에는 없다. `clockPreview`는 3단 병합.
- plan: `draw-text` 신규. 이미 wrap된 lines와 측정 폭만 담고 고객 원문·zone key·카탈로그/템플릿 id·
  측정 포트는 담지 않으며 `layerId`는 위치 기반이다.
- wrap은 주입된 동기 측정 포트로 빌더에서 한 번 확정한다. 측정 실패는 fail-closed이고 폰트 정착 전에는
  plan을 만들지 않는다.
- 입력 거부는 빌더 시험 빌드로 구현했다. composer가 wrap을 재구현하면 빌더와 어긋날 수 있으므로 plan
  인자를 보관했다가 후보 값으로 실제 빌더를 한 번 더 호출하고, 실패하면 직전 승인 값을 유지한다.
- executor: 텍스트 5개 멤버를 공개 포트의 선택적 capability로 선언하고 없으면 preflight fail-closed다.
  letter-spacing은 glyph별 `fillText`이며 `ctx.letterSpacing`을 쓰지 않는다.
- 시계: plan 밖 DOM 오버레이(`pointer-events:none`·`aria-hidden`·percent 위치). custom image timer 0,
  텍스트는 분 경계 후 60초, 활성 timer 최대 1개 + generation 가드. 실패는 오버레이만 숨긴다.
- ★ 허용 파일 준수: 배럴(`plan/index.ts`·`preview/index.ts`)이 §4 밖이라 확장 대신 구조적 타입으로 새
  타입을 참조했다. `tsc` 강도는 동일하고 배럴 content diff는 0이다. 배럴 확장이 낫다면 보완한다.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **1081**(995→1081) / build mockup JS 280.33 kB gzip 86.52, CSS 17.82/4.30, admin 무변경 /
  E2E **114 PASS**(99→114) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일·fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 변경 파일 18개 전부 §4 허용 목록 안(신규 `clockOverlay.ts`·`clockOverlay.test.ts` 포함)
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 `78095f8`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 031 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 3건은 모두 유효했고 허용 파일 5개 안에서만 보완해 push했다. 코드/test `88b64e6`,
기준 `78acdf6`. `surface.css`는 변경이 필요 없었다.

- 지적 1(시계 기준 rect): percent를 전체 박스에 적용해 band가 클수록 위치가 틀렸다. 정본 §2.7과
  레거시의 `IX/IY/IW/IH`는 mat rect다. → band를 plan 어댑터와 동일한
  `max(1, round(width*borderPercent/100))`으로 구해 mat 기준 중심과 `min(matW,matH)` 기준 한 변을
  캔버스 대비 CSS percent로 환산하는 순수 함수 `resolveClockCss`로 분리했다. 오버레이와 그려지는 mat이
  같은 반올림을 쓰므로 어긋날 수 없다. resize에서 bit-identical이 아닌 것은 의도이며 차이는 반올림
  크기(약 0.09%p)뿐이다.
- 지적 2(custom image 실패): `declared`와 resolved `src`를 분리했다. 선언됐는데 resolve 실패이거나
  `<img>` load 실패면 오버레이를 숨긴다. 텍스트 `HH:MM`은 사진이 애초에 선언되지 않았을 때만 쓴다.
  실패 source를 기억해 재시도 루프가 없고 source·오류 원문 노출 0이며 사진·텍스트 plan은 유지된다.
- 지적 3(폰트 가용성): 측정 전에 값이 있는 각 zone의 정확한 shorthand로 `document.fonts.check(...)`를
  확인하고, FontFaceSet 부재·check 부재·throw·false면 텍스트 plan을 fail-closed한다. 대체 측정은
  하지 않는다. 텍스트 없는 액자는 그대로 동작하고 입력창은 게이트와 무관하다.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **1088**(1081→1088) / build mockup JS 281.69 kB gzip 86.99, CSS 17.85, admin 무변경 /
  E2E **116 PASS**(114→116) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 무변경: 회전·텍스트 wrap·오류 우선순위·F-1~F-8, `packages/**`, `apps/mockup/src/canvas/**`
- 변경 파일: `PreviewComposer.tsx`(+test), `clockOverlay.ts`(+test), `tests/e2e/mockup-preview.spec.ts`
  — 허용 목록과 일치
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 restore·stage·commit
  하지 않았다

다음 전이: Codex가 `88b64e6`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 031 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-31)

Codex 승인(코드 `88b64e6`, 문서 `b7d46d3`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치):
  `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`(§CODEX_PASSED),
  `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`(§9 + 상태 줄),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: **unit 1088/1088**, 실제 Chromium **E2E 116/116**,
  frozen·format·lint·typecheck·build·`git diff --check` PASS, 포트 4183·4184·OS temp 잔류 0,
  lockfile·manifest diff 0, 신규 의존성 0, network·live·deploy 0
- **잔류 프로세스 command-line 검사는 NOT TESTED**로 유지했다
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 88b64e6..HEAD -- apps packages tests` = 0줄)
- Claude 재실측(같은 트리): `check` PASS(format·lint·typecheck·unit·build), unit 1088
- 판단 2건(배럴 확장 대신 구조적 타입 · 입력 거부의 빌더 시험 빌드)은 명시 지시 없이 승인으로 수용된
  것으로 기록했다
- NOT TESTED 유지: 잔류 프로세스 command-line, 실기기 4환경 IME·폰트·오버레이, system font 대체,
  실제 인쇄물 가독성, 실제 print/export 텍스트 출력, 실제 물리 시계와 오버레이 위치 일치,
  case 텍스트·admin `name2`·고객 style(범위 밖)
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 restore·checkout·stage·
  commit 하지 않았다
- 다음 스펙·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 032 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

**Founder 지시로 자동 전환**했다: 개별 스펙 DONE에서 멈추지 말고 다음 권장 스펙의 읽기 전용 조사를
수행하며, 자동화는 전체 리빌드 DONE 또는 Founder의 명시적 중단에서만 멈춘다. 구현은 조사 승인과
필요한 Founder 결정 뒤에만 시작한다.

다음 스펙은 임의 선택이 아니라 **스펙 019 §506이 명시한 후속 순서**
(deterministic renderer → image/CORS → pointer → text/clock → **print**)의 마지막 항목이다.
보고서 `docs/codex-claude-handoff/reviews/2026-07-31-print-export-investigation.md`(12항목).

- 인쇄 경로는 **두 세대 공존**: 케이스는 V36 구경로, 액자만 V365(`patchedRender`가 케이스를 되돌린다).
- 해상도 계약이 제품군마다 다르다: 액자는 실물 cm → 300dpi(min 3000 / max 36M / fallback 3508),
  케이스는 cm·dpi 없이 화면 논리 크기의 3~5배.
- ★ 액자의 물리 치수를 **필드 8종 → 이름 텍스트 파싱 → 하드코딩 표**로 추측한다. 사이즈 이름을 바꾸면
  인쇄 해상도가 바뀔 수 있고, 카탈로그 V1 `frameSizes` allowlist에 cm 필드가 없다.
- ★ **경고가 주문을 막지 않는다**: 템플릿 아트 실패 시 아트가 빠진 PNG를 그대로 반환해 저장·다운로드·
  카카오까지 진행된다. 미리보기는 스펙 028에서 fail-closed로 바꿨다.
- 스펙 029~031 중 인쇄 반영은 텍스트뿐이다. 회전(030)은 무시되고, 시계(031 F-4) 제외는 정상이다.
- 리빌드에는 인쇄 코드가 0줄이지만 재료(결정적 plan·executor·normalized pan·quarter turn·확정 lines)는
  모두 있다. 핵심은 새 렌더러가 아니라 **같은 plan을 인쇄 해상도로 다시 만드는 것**이다.
- 권고: **인쇄 폭으로 plan 재생성 + 미리보기 `lines` 재사용** → 좌표 정확성과 줄바꿈 동일성을 동시에.
- 결정 필요: Founder 6건(P-1~P-6, 특히 **P-2 물리 치수 출처**와 **P-3 경고 시 인쇄 생성 여부**) +
  Codex 8건(C-1~C-8). 최소 구현 순서와 STOP 11조건도 기록했다.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- NOT VERIFIED: 레거시 인쇄 미실행(코드 근거만), `CONFIG` 값들의 출처와 인쇄소 요구, `knownCm` 표와
  운영 카탈로그 실제 필드, 운영 CORS 실패, 대용량 성능.
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 P-1~P-6 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 인쇄 관련 제품 코드를 만들지 않는다.

## 스펙 032 조사 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 3건은 모두 유효했고 조사 문서와 상태 문서만 보완했다. 기준 `5a42b29`, 제품 코드 변경 0.

- 지적 1(가장 중요): C-1의 `lines` 재사용 경로가 **현재 API에 없다**. `FrameTextZoneInput`에 `lines`
  입력이 없고 빌더는 값이 있으면 항상 `measureText`로 재wrap하며, `lines`는 `draw-text` command의
  출력으로만 존재한다. "추가 계약 없이 가능"이라는 단정을 제거하고 §8.1을 후보 A/B/C 비교로 다시 썼다.
  각 후보가 줄바꿈·회전·pan·레이어 순서 네 불변식을 어떻게 보장하는지 표로 명시했다.
  새 근거: executor 헤더가 transform을 caller 몫으로 못 박았고 `surface.ts`가 이미 `setTransform(dpr)`
  후 같은 plan을 실행한다 → 후보 A가 가장 강하지만 인쇄 배율의 자간 품질은 NOT VERIFIED이며 선택은
  Codex C-1로 남겼다.
- 지적 2: P-5를 색·사진 transform / 시계 유무 / 고객 문구 원문으로 분리하고 각각 PNG 포함·로컬 저장·
  주문 전송·보존 기간을 구분했다. 최소안 P-5c는 고객 문구를 텍스트로 저장·전송하지 않는 것이며,
  별도 개인정보 정책 승인 없이는 스펙 032 범위에서 제외한다.
- 지적 3: P-4 수치가 레거시 관측값일 뿐 인쇄소 근거가 없음을 명시하고 P-4a(임시값 구현 + 실제 업로드·
  주문·배포 차단)와 P-4b(확인 전 구현 보류)로 갈랐다. STOP 조건 12·13을 추가했다.
- 바꾸지 않은 것: §1~§7 레거시 조사 결과, §10 최소 구현 순서, C-2~C-8
- 제품 코드·테스트·CSS·설정·manifest·lockfile diff 0, 신규 의존성 0, network·live·deploy 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

다음 전이: Codex가 보완된 보고서를 재검토한다. **Founder P-1~P-6은 Codex 승인 전 확정하지 않는다.**

## 스펙 032 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Founder가 `스펙 032 Founder 권장안 P-1·P-2·P-3·P-4a·P-5·P-6을 일괄 승인하고 자동화를 계속 진행해.`로
승인했다. 정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-032-print-export-decisions.md`(신규).

**결정 정본 커밋 `0443137`** — Founder가 이 커밋을 정본으로 명시적으로 인정했다(2026-07-31 재확인).
따라서 P-1·P-2·P-3·P-4a·P-5·P-6은 **확정**이며, Codex 구현 계약은 이 커밋을 입력으로 삼는다.

⚠️ 절차 기록: Codex의 마지막 지시는 "보완된 Founder 질문을 Codex가 승인하기 전 확정하지 않는다"였으나
Founder가 순서를 명시적으로 앞당겨 결정했다. **조사 보고서에 대한 Codex 재검토는 여전히 미완**이며,
재검토에서 질문의 전제가 틀렸다고 밝혀지면 해당 항목은 다시 열어야 한다.

- P-1: 액자 인쇄만 구현하고 케이스 인쇄는 별도 스펙으로 미룬다.
- P-2: 인쇄 물리 치수는 카탈로그 명시 필드에서만 얻고 이름 텍스트 파싱을 쓰지 않는다. 카탈로그 스키마
  확장과 admin 입력 UI는 별도 스펙이며, 치수가 없으면 인쇄를 만들지 않는다.
- P-3: 경고가 있으면 인쇄 파일을 만들지 않는다(fail-closed). 부분 파일·아트 누락 파일 0.
- P-4a: 레거시 수치를 명시적 임시값으로 구현·검증하되 **인쇄소 확인 전까지 실제 업로드·주문 전송·
  배포를 차단**한다. 로컬 다운로드와 E2E는 허용한다.
- P-5: 색·사진 transform과 시계 유무는 담고(P-5a·P-5b), **고객 문구 원문은 텍스트로 저장·전송하지
  않는다(P-5c)**. 문구는 이미 인쇄 PNG에 픽셀로 포함되며, 텍스트 저장·전송은 별도 개인정보 승인이
  필요해 이 스펙 범위가 아니다.
- P-6: 미리보기와 인쇄의 줄바꿈은 반드시 동일해야 한다. 이는 조사 §8.1 후보 선택에 제약만 걸고
  A/B/C 중 무엇을 택할지는 정하지 않는다(Codex C-1).

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
- 제품 코드·테스트·CSS·설정·manifest·lockfile diff **0**, 신규 의존성 0, 인쇄 제품 코드 **0**
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

다음 전이: Codex가 이 결정과 보완된 조사 보고서를 입력으로 **스펙 032 구현 계약**을 작성하면
`WAITING_FOR_CLAUDE`. 계약은 최소한 **C-1(후보 A/B/C 택일)** 과 허용 파일·게이트·NOT TESTED 경계를
확정해야 한다.


## F-A~F-E Founder 결정 선택지 조사 완료 — FOUNDER_DECISION_REQUIRED (Claude Code, 2026-08-10)

기준 HEAD = origin = `267ea72`(스펙 034·035 `CODEX_PASSED`), ahead/behind 0/0.
**읽기 전용 조사 + 문서 인수인계만 수행했다.** 제품 코드·테스트·설정·lockfile·의존성 diff **0**,
실제 Firebase·network·live·emulator·Rules·Hosting·deploy **0**.

정리 문서: `docs/codex-claude-handoff/reviews/2026-08-10-admin-auth-write-founder-decision-options.md`

- F-A 운영자 Auth 도입 시점·인증 방식·허용 계정 정책 (+ `firebase` SDK 신규 의존성 승인 필요)
- F-B `admin/state.json` 저장만 vs `published/state.json` 발행 포함
- F-C 레거시 운영 경로 공유 vs 리빌드 전용 격리
- F-D legacy `wcm`/`hcm` 정규화 결과 되쓰기 vs 메모리 전용
- F-E last-writer-wins 허용 vs revision precondition/잠금

**다섯 항목 모두 미결이다.** 조사 문서 §8의 승인 프롬프트는 **예시이며 Founder가 말한 적이 없다** —
승인으로 취급하지 않는다. 각 항목의 최소 안전 권장안(A2+계정 1개 / B1 / 읽기만 공유 / D1 유지 / E2)은
**Claude의 권장이지 결정이 아니다**.

Codex 다음 검토: 근거 라인 정확성, L-1~L-4 구조적 결론(재현 안 함 = UNCONFIRMED),
**X-7(신규)** 쓰기 payload에서 스펙 034 승격 필드 제외와 legacy pair 처리, X-1~X-6.

워킹트리 dirty 3개는 전부 알려진 보호 대상(spec-018 PNG 2개 + content diff 0인
`packages/render/src/plan/index.ts`)이며 stage·commit·복원하지 않았다.

다음 전이: **Founder가 F-A~F-E를 명시적으로 결정**해야 한다. 그 전에는 결정 문서 작성·구현·
Firebase 표면 접근을 시작하지 않는다. 자동화 루프는 삭제된 상태이며 새로 만들지 않는다.


## F-A~F-E 조사 문서 정확성 보완 — FOUNDER_DECISION_REQUIRED 유지 (Claude Code, 2026-08-10)

검토 기준 `24d0c04`, 판정 `CORRECTION_REQUIRED`. **문서 전용 보완이며 제품 결정 변화 0.**
제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**,
Firebase·network·live·emulator·Rules·Hosting·deploy 실행·변경 **0**.

고친 것 4가지:

1. **"저장소 전역 grep 0건" 주장 제거.** 0건은 **리빌드 `apps/**`·`packages/**` 한정**이고,
   레거시 `denn-admin.html`(인증 7건 + `uploadString` `:14782`·`:14838`)와
   `denn-mockup-tool.html`(인증 4건 + `uploadString` `:15475`·`:15560`)에는 **존재한다**.
2. **"인증 경계는 서버에 이미 확정" → "`storage.rules` 파일이 의도하는 정책은 확인".**
   실제 배포 여부와 거부 동작은 **UNCONFIRMED**로 유지.
3. **F-E 모순 제거.** E2는 원자적 precondition이 아니고 **잔류 last-writer-wins 손실 가능성이
   남는다**. **E2-best-effort**(경합 창·잔류 손실 수용) / **E3-strong**(손실 불허, 지원 가능성
   조사·검증 전까지 쓰기 구현 차단, Rules·잠금은 별도 승인)으로 **택일 분리**.
4. **단계 관계 명시.** 1단계 = Auth + `admin/state.json` **읽기**, 쓰기 0.
   `B1 저장만`은 향후 쓰기 단계의 정책 권장안이며 **현재 구현 허가가 아니다.**
   **쓰기 계약은 Founder의 쓰기 단계 착수 승인 전에는 작성하지 않는다.**

**Founder 승인은 여전히 0건이다.** 보고서 §8은 예시이며 7번 항목은 E2-best-effort / E3-strong 중
**Founder가 직접 골라야 하는 자리**다. 구현 계약·Codex 구조 결정 확정 **없음**.

워킹트리 dirty 3개는 알려진 보호 대상이며 restore·checkout·stage·commit 하지 않았다.
자동화 루프는 삭제된 상태이고 **새 자동화나 반복 작업을 만들지 않았다** — 이후는 수동 인수인계만 쓴다.

다음 전이: **Founder가 F-A~F-E를 명시적으로 결정**(F-E는 E2-best-effort / E3-strong 택일)해야 한다.


## F-A~F-E Founder 결정 정본 기록 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `8ea0c30`. **결정 정본**: `docs/codex-claude-handoff/decisions/2026-08-10-admin-auth-write-boundary-decisions.md`
(승인 원문 그대로 수록). 조사 보고서 §8의 예시 프롬프트는 **superseded**.

**Founder 승인 (2026-08-10, 실제 승인)**

- **F-A** 운영자 Auth 도입. **1단계 = Auth + `admin/state.json` 읽기, 쓰기 0.**
  기존 비익명 운영자 계정 **1개만**. **`firebase` 모듈러 SDK 신규 의존성 승인.**
  신규 계정·다중 계정·역할 권한·**Rules 변경은 승인하지 않음**.
  ⚠️ 계정의 실제 존재·접근 가능 여부는 저장소에서 확인 불가 → **UNCONFIRMED**로 기록.
- **F-B** `published/state.json` **발행 제외**. 쓰기를 열더라도 **admin 상태 저장만**.
  고객 공개 발행은 **별도 승인 + 별도 스펙**. 저장 UI에 **"발행되지 않음" 표시 필수**.
- **F-C** `admin/state.json`은 **읽기만 공유**. 향후 쓰기는 **레거시와 격리된 rebuild 전용 경로**.
  경로는 **Codex 구조 계약**에서 확정. **레거시 파일 공유 쓰기 금지**.
- **F-D** 정규화 결과 **메모리 전용 유지**, **저장 payload에 승격 결과 미포함**,
  되쓰기·삭제·마이그레이션 **금지**(별도 스펙 + 별도 승인).
- **F-E** **E3-strong** — last-writer-wins 손실 **불허**, 원자적 precondition·잠금 가능성을
  **별도 조사·검증하기 전까지 쓰기 구현 차단**. SDK 지원 여부·Firestore 잠금 필요 여부·
  Rules 변경 필요 여부는 **UNCONFIRMED** 유지, 도입은 **별도 승인 대상**.

**승인되지 않은 것**: 제품 구현 자체 · 실제 Firebase/network/live/emulator/운영 데이터 접근 ·
Rules/Hosting/배포 · 신규 계정·다중 계정·역할 · 발행 · 레거시 공유 쓰기 · cm 되쓰기/마이그레이션 ·
**쓰기 구현 전반**.

이번 라운드는 **문서 전용**이다. 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**,
**`firebase` SDK도 아직 추가하지 않았다**(추가는 승인됐고 실행은 구현 단계). 실제 Firebase·network·
live·emulator·Rules·Hosting·deploy **0**. 보호 대상 3개는 restore·checkout·stage·commit 하지 않았다.

다음 전이: **Codex가 "Auth + `admin/state.json` 읽기 전용 구현 계약"을 작성**한다
(허용 파일·AuthPort·읽기 port와 경로 allowlist·합성 fake 검증 범위·`firebase` SDK 추가 방식·
NOT TESTED 경계). 쓰기 port·저장 UI·발행·revision/충돌·tombstone·마이그레이션은 **계약에 넣지 않는다**.
계약 작성 후 Founder가 다시 검토하며, **구현 착수는 그 뒤 별도 승인**이다.
자동화 루프는 삭제된 상태이고 새 자동화·반복 작업을 만들지 않는다.


## 스펙 036 구현 계약 작성 완료 — FOUNDER_DECISION_REQUIRED (Claude Code, 2026-08-10)

기준 `6daf365`. 계약: `docs/rebuild/specs/036-admin-auth-private-state-read.md` (신규).
입력은 Founder 결정 정본 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`다.

**이번 라운드는 계약 문서 작성뿐이다.** 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**,
**`firebase` SDK 미추가**, 실제 Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.

계약이 고정한 것:

- **범위** Email/Password 인증 · 비익명 세션 관찰/복원 · 고정 `admin/state.json` 읽기 ·
  `readLegacyCatalog` 검증 · **메모리 전용**. 저장·쓰기·발행·업로드·revision·충돌·tombstone·
  마이그레이션 **전부 제외**.
- **경계** `firebase@12.16.0` 정확 고정(구현 단계에서만 추가) · admin 기능은 **서브패스
  `@denn/firebase/admin-read` 전용** · **루트 배럴 `packages/firebase/src/index.ts` 수정 금지** ·
  **고객 번들에 Firebase SDK 0** · `packages/shared`·`packages/render` 무수정.
- **활성화** 기본 비활성. `VITE_DENN_ADMIN_FIREBASE_ENABLED=true` + 완전한 공개 config가 모두
  있을 때만 초기화. 아니면 `UNCONFIGURED` 고정 상태 + SDK/observer/Storage **0회**.
  `.env`·실제 config **commit 금지**. live 테스트는 **작성도 실행도 금지**.
- **AuthPort** `User`/token/credential/raw error 비노출 · `onAuthStateChanged`로 초기 판정 ·
  익명은 authenticated 불인정 · 가입/재설정/다중계정 UI 0 · 이메일 하드코딩 0 ·
  password 저장·로그 0 및 종료·unmount 시 정리 · `browserLocalPersistence` 실패는 **fail-closed** ·
  **계정 1개는 운영 정책이며 Rules가 UID/email을 강제하지 않는다는 한계 명시**.
- **ReadPort** 경로 상수 고정(주입 불가) · 20 MiB 미만 · `getBytes` · 9단계 고정 순서 ·
  미인증/익명/초기화중 Storage **0회** · write/upload/delete/`getDownloadURL`/published **0** ·
  자동 retry 0 · stale을 fresh로 위장 금지 · **단일 in-flight 재사용** · 늦은 결과 무시 ·
  unmount 후 setState 0 · **안전 오류 코드 15개 확정**.
- **UI** 8상태 · 명시적 버튼 클릭에서만 read · 자동 read/retry/polling 0 · 성공 문구 1개 ·
  raw/경로/uid/email/SDK 원문 비표시 · 저장·발행·업로드·주문 버튼 0 ·
  스펙 035 카드와 **연결하지 않음** · `role=status`/`aria-live` 명시.
- **허용 파일** 9경로 + 문서(§7). `packages/firebase/src/index.ts` 금지,
  `apps/admin/vite.config.ts`·CSS 기본 금지(필요 시 STOP).
- **검증** 합성 fake 전용 unit(패키지·앱) + E2E(Firebase 요청 0, 고객 번들 문자열 0,
  고객 dist SHA-256 동일) + 게이트 순서 + STOP 조건 8개 + NOT TESTED 8개.

**UNCONFIRMED**: `firebase@12.16.0`의 실제 존재와 Node 24/Vite 8/TS 7 호환성(실제 network 금지) ·
운영자 계정 실재 여부 · Rules 실제 배포·거부 동작 · 실제 `admin/state.json` 내용.

**구현은 아직 승인되지 않았다.** Founder가 이 계약을 검토해 **구현 착수를 별도로 승인**해야 하며,
그 전에는 `packages/firebase`·`apps/admin` 코드와 `firebase` SDK 추가를 시작하지 않는다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화 루프는 삭제된 상태이고
새 자동화·반복 작업을 만들지 않았다.

다음 전이: **Founder의 계약 검토 + 구현 착수 승인**.


## 스펙 036 계약 정확성 보완 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `77b5b47`. **문서 전용 보완이며 제품 결정·구현 변화 0.**
계약: `docs/rebuild/specs/036-admin-auth-private-state-read.md`(개정 이력 블록 참조).
제품 코드·테스트·CSS·설정·manifest·package.json·lockfile·의존성 diff **0**,
**`firebase` SDK 미추가**, Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.

고친 것 5가지:

1. **SDK 버전** `firebase@12.16.0` → **`firebase@12.17.1` 정확 고정**(2026-08-04 최신 공식 릴리스,
   출처 firebase.google.com 릴리스 노트·web setup). **버전 존재는 VERIFIED**로 기록하고 초판의
   "존재 여부 UNCONFIRMED"는 제거했다. **Node 24 / Vite 8 / TS 7 / 현재 pnpm workspace와의
   실제 설치·빌드 호환성만 UNCONFIRMED**로 남으며 구현 단계 frozen install에서 처음 확인된다.
   **이번 라운드에 설치·lockfile 갱신은 하지 않았다.**
2. **config 완전성 판정** — 플래그는 **정확히 `VITE_DENN_ADMIN_FIREBASE_ENABLED === "true"`**,
   공개 config **5개**(`API_KEY`·`AUTH_DOMAIN`·`PROJECT_ID`·`STORAGE_BUCKET`·`APP_ID`)를
   **모두 비어 있지 않은 문자열**로 확보했을 때만 adapter 생성. 하나라도 누락·빈 문자열이면
   **`UNCONFIGURED` + `initializeApp`/Auth observer/Storage 0회**.
   **`packages/firebase`는 `import.meta.env`를 직접 읽지 않고 `apps/admin`이 만든 typed config만
   주입받는다.** 실제 값 하드코딩·`.env` commit 금지 유지.
3. **공개 타입을 유효한 TypeScript로 확정** — `Promise<Result>`처럼 타입 인자가 빠진 표현 제거.
   `packages/shared/src/index.ts:19`의 `Result<T, E>`를 **`E` 생략 없이** 사용하고
   `OperatorAuthErrorCode`·`AdminReadErrorCode`·`SafeAdminReadError`·`OperatorAuthActionResult`·
   `AdminStateLoadResult`를 완전 정의했다. **`correlationId`는 호출자(`apps/admin`)가 생성·주입**하며
   **sign-in/sign-out/load 세 시그니처 모두에 명시**하고 형식은 `/^[0-9a-f]{8,64}$/`(비식별 난수)다.
   Firebase `User`·credential·token·raw SDK error는 공개 타입에 **없다**.
4. **안전 오류 15개 매핑 표** 추가 — category / code / retryable / 발생 조건 /
   대응 SDK code·로컬 검증 단계. **invalid credential 계열은 계정 존재 추론을 막기 위해
   `INVALID_CREDENTIAL` 하나로 통합**, `auth/too-many-requests` → `AUTH_RATE_LIMITED`,
   `auth/network-request-failed` → `NETWORK_UNAVAILABLE`,
   `storage/object-not-found` → `ADMIN_STATE_NOT_FOUND`, `storage/unauthorized` → `ADMIN_STATE_FORBIDDEN`,
   `storage/download-size-exceeded` → `RESPONSE_TOO_LARGE`, 미등록 code는
   `UNEXPECTED_ADMIN_READ_ERROR`로 접는다. **`NETWORK_TIMEOUT`은 SDK code가 아니라 앱 wrapper
   타임아웃 상태**임을 근거와 함께 구분했다. raw code/message 비노출·자동 retry 0 유지.
5. **20 MiB 설명 정정** — `ADMIN_STATE_MAX_BYTES = 20 × 1024 × 1024 − 1 = **20,971,519 bytes**`.
   `storage.rules:14`의 경고(read 조건에 `request.resource.size` 금지)와 `:26`의
   `allow read: if op();`로 보아 **서버는 read 크기를 제한하지 않는다**. 이 값은 write-side
   `okSize()`(`:22`)와 숫자를 맞춘 **클라이언트 `getBytes` 안전 상한**이며 **서버 read 보장이 아니다**.

**구현은 여전히 시작하지 않았다.** 다음 전이: **Codex가 보완된 계약을 검토**한다.
검토 통과 후 Founder의 **구현 착수 승인**이 있어야 코드 작성과 `firebase` SDK 추가를 시작한다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았다.


## 스펙 036 계약 타입·비동기 경계 보완 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `9fb1456`. **문서 전용이며 제품 결정·범위 변화 0.** 계약:
`docs/rebuild/specs/036-admin-auth-private-state-read.md`(개정 이력 "2차 보완" 블록).
제품 코드·테스트·CSS·설정·manifest·`package.json`·lockfile·의존성 diff **0**,
**`firebase` SDK 미추가**, Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.

고친 것 4가지:

1. **`OperatorAuthState` 오류 타입 축소** — `error`의 코드가 `AdminReadErrorCode` → **`OperatorAuthErrorCode`**.
   `INVALID_CATALOG`·`ADMIN_STATE_*` 같은 catalog/storage 전용 코드가 **인증 observer 상태에
   타입상 들어올 수 없다**.
2. **observer가 인증 상태의 유일한 권위**(§4.3) — `OperatorAuthActionValue`에서 **`state` 필드 제거**,
   성공 값은 `correlationId`만. sign-in/sign-out Promise 성공은 **SDK action 완료**만 뜻하고
   `authenticated`/`signed-out` 확정은 **`onAuthStateChanged`만** 담당한다.
   **action 완료 순서와 observer 통지 순서를 가정하지 않으며**, UI는 action 결과로 인증 상태를
   덮어쓰지 않는다. 합성 테스트 3건(조기 전환 금지 / 늦은 action이 되돌리지 않음 / sign-out 동일)을
   §8에 추가했다.
3. **timeout 상수와 범위 확정**(§5.4) — "예: 10s" 제거,
   **`ADMIN_STATE_READ_TIMEOUT_MS = 30_000`** 고정. wrapper는 **`AdminStateReadPort`의 `getBytes`
   읽기에만** 적용하고 **`signInWithEmailPassword`·`signOut`·`onAuthStateChanged`에는 적용하지 않는다**
   (Auth action은 timeout 반환 후 SDK가 늦게 성공하면 **실제 세션이 바뀌어 반환값과 갈라진다**).
   `getBytes`는 읽기 전용이라 30초 초과 시 `NETWORK_TIMEOUT`을 반환하고 **늦은 완료를 폐기**하되,
   **실제 SDK 요청 취소를 지원한다고 주장하지 않는다**. 늦은 완료는 generation/`correlationId`로
   무시하고 UI·메모리 상태를 갱신하지 않으며 **자동 retry는 0**. fake timer 테스트
   (29,999 ms 미완료 / 30,000 ms timeout / timeout 후 늦은 성공 무시)를 §8에 고정했다.
4. **비노출 검증 문구 정정**(§8.1) — 성공 결과는 검증된 `CatalogDocumentV1`/`CatalogReadReport`를
   반환하므로 **정상 카탈로그의 합법적 `data:` URL·base64가 성공 값에 있을 수 있다.** 따라서
   ① SDK raw error의 가짜 token/email/uid/raw message는 `SafeAdminReadError`와
   `JSON.stringify(error)`에 **0건** ② invalid UTF-8/JSON/catalog 실패 시 **원문 bytes/JSON/base64가
   error에 0건** ③ **UI·console/log에는 성공·실패 모두 raw catalog/base64/경로/token/email/uid 0건**
   ④ 성공 값의 **합법적 카탈로그 data URL 제거는 요구하지 않음** ⑤ 성공 값에 **원문 bytes·원문 JSON
   문자열을 별도 보존하지 않음**으로 분리했다. 성공 값은 **메모리 전용**이며 스펙 035 UI·localStorage·
   IndexedDB·주문·upload·publish와 **연결하지 않는다**.

**구현은 시작하지 않았다.** 다음 전이: **Codex의 최종 계약 검토**, 그 뒤 Founder의 **구현 착수 승인**.
보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았다.


## 스펙 036 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-08-10)

Founder가 계약 `765dfb4`와 **구현 착수**를 승인했다. 구현 커밋 **`fd92fbc`**, 기준 `765dfb4`.
운영자 Email/Password Auth + 비익명 세션 관찰 + 고정 `admin/state.json` 읽기 +
`readLegacyCatalog` 검증 + **메모리 전용**. 쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 **0**.

- **의존성**: `firebase@12.17.1` 정확 고정(`packages/firebase/package.json` + `pnpm-lock.yaml`),
  `apps/admin`에 `@denn/firebase: workspace:*`. 승인 외 신규 의존성 **0**.
- **경계**: admin 기능은 **`@denn/firebase/admin-read` 서브패스 전용**,
  **`packages/firebase/src/index.ts` 무변경**, SDK는 **동적 import**로만 접근.
  → **고객 `dist` SHA-256 구현 전후 동일**(`f86d446d…7bbc09`), admin 번들에서 Firebase는 lazy 청크로 분리.
- **게이트**: frozen install PASS · format · lint · typecheck · **unit 1258/1258** ·
  독립 build · **Chromium E2E 134/134** · `pnpm check` PASS · `git diff --check` 클린 ·
  금지 diff 0 · ports 4183/4184 **0** · OS temp **0** · **실제 Firebase 요청 0건**.
- **⚠️ `pnpm-workspace.yaml`**: pnpm 11이 자동 추가한 `allowBuilds` 3줄을 Founder 지시로 제거했고
  제거 상태에서 frozen install은 exit 0이다(파일 = HEAD 동일, 커밋하지 않음).
  **NOT VERIFIED**: `node_modules` 없는 새 클론에서 첫 frozen install이 같은 오류를 낼 수 있다 —
  발생 시 `@firebase/util`·`protobufjs`를 `false`로 명시하는 것이 최소 해결책이며 **별도 승인 대상**이다.
- **NOT TESTED**: 운영자 계정 실재·로그인, `storage.rules` 실제 배포·거부, 실제 `admin/state.json`,
  인증 만료·갱신, 실제 Storage CORS·`getBytes`, 실기기, 쓰기 원자성, 실제 SDK 오류 코드 문자열.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았다.
다음 전이: **Codex 독립 검증**. 다음 스펙은 시작하지 않는다.


## 스펙 036 CORRECTION_REQUIRED 라운드 1 완료 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `e873049`, 보완 커밋 **`b7ee207`**(제품), 종료 문서는 별도 커밋. 지적된 **4개 결함만** 고쳤다.

1. **초기화·observer 오류 fail-closed** — `onAuthStateChanged(listener, onError)`로 오류 경계를
   계약에 추가, `sdk-facade`가 SDK error callback 전달, `createLazyFacade`가 factory rejection을
   같은 경로로 라우팅. `mapAuthError`를 거쳐 **안전 코드만** publish(`auth/network-request-failed`
   → `NETWORK_UNAVAILABLE`, 미등록 → `UNEXPECTED_ADMIN_READ_ERROR`).
   **unhandled rejection 0 · raw error 비노출 · `initializing` 영구 고정 제거 ·
   rejection 전 unsubscribe 시 callback 0회**를 unit으로 고정.
2. **timeout 공개 계약 고정** — 공개 옵션에서 `timeoutMs` 제거, 제품 경로는 항상
   `ADMIN_STATE_READ_TIMEOUT_MS`. seam은 `read-port.ts` 내부이며 `index.ts` 미노출.
   런타임 override 시도도 30,000 ms를 따르는 것을 unit으로 고정.
3. **로그아웃 동시성 차단** — 내부 `busy="signing-out"` 가드. 새 공개 상태·문구 **0**,
   진행 중 `canSignIn`/`canLoad` **false**, 중복 signOut 1회·진행 중 load/signIn 0회,
   observer 단일 권위 유지.
4. **Vite 경고 제거** — `vi.resetModules()` + 정적 `import("./index")`.
   **unit 실행에 invalid dynamic import warning 0건.**

게이트: frozen install exit 0 · format · lint · typecheck · **unit 1271/1271**(1258 → +13) ·
build · **Chromium E2E 134/134** · check · diff-check 클린 · **금지 경로 diff 0** ·
고객 dist SHA-256 **`f86d446d…7bbc09` 동일** · 실제 Firebase/network 요청 **0** ·
ports 4183/4184 **0** · OS temp **0**.

**`pnpm-workspace.yaml`은 이번에도 수정하지 않았고 `pnpm approve-builds`도 실행하지 않았다.**
새 클론 frozen install 재발 여부는 **NOT VERIFIED**이며, Codex의 새 클론 시도가 **registry EACCES로
중단**됐으므로 성공·실패 어느 쪽으로도 단정하지 않는다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았고
다음 스펙도 시작하지 않았다. 다음 전이: **Codex 독립 재검증**.


## 스펙 036 CORRECTION_REQUIRED 라운드 2 — 문서 전용 해시 기록 정정 (Claude Code, 2026-08-10)

기준 `1796a2d`. **제품 코드·테스트·CSS·config·manifest·lockfile·`pnpm-workspace.yaml` 변경 0.**
제품 보완 `b7ee207`의 4개 결함은 **Codex 독립 재검증 통과**(frozen install · format/lint 각 153 파일 ·
typecheck · unit **1271/1271** + invalid dynamic import warning **0** · build · Chromium **134/134** ·
check · diff·금지 diff 0 · ports/temp 0).

**★ 고객 JS 해시 기록 정정 — 두 값은 서로 다른 측정이며 둘 다 현재 재현된다.**

- **정본(파일 해시)**: `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** ·
  SHA-256 **`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`**
- 이전 기록 `f86d446dde121bce287b393f905a02208b106face54b0803033eb800437bbc09`는
  **`dist` 트리 집계 다이제스트**(`find … | xargs sha256sum | sha256sum`)이며 **JS 파일 해시가 아니다**.
  값은 지금도 재현되지만, 그것을 **"고객 dist SHA-256"이라고 부른 라벨이 틀렸다**.
  **과거 기록은 삭제·덮어쓰기 하지 않고** 스펙 036 라운드 2 절과 live 로그로 정정했다.
- 앞으로는 **파일명 + 바이트 수 + 파일 해시**를 함께 기록한다. 집계 다이제스트는 경로 문자열과
  정렬·셸 환경에 의존해 기계 간 비교에 부적합하다.
- 재현: Codex 4건(독립 build 2회 · E2E 전후 · `765dfb4` archive 재빌드 · 유출 문자열 0건) +
  Claude 1건(두 측정 방식 모두 재현). → **"기준과 현재 고객 JS byte-identical" PASS.**

이 라운드는 문서 전용이라 게이트를 재실행하지 않았다(직전 라운드 수치가 정본).
`pnpm-workspace.yaml`의 `allowBuilds`는 여전히 **NOT VERIFIED**이며 수정·`approve-builds` 모두 하지 않았다.
Codex의 새 클론 시도는 **registry EACCES로 중단**돼 성공·실패로 단정하지 않는다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업 0, 다음 스펙 미착수.
다음 전이: **Codex 확인 후 스펙 036 종료 판단**.


## 스펙 036 CORRECTION_REQUIRED 라운드 3 — 문서 위생 (Claude Code, 2026-08-10)

기준 `91acec0`. **문서 전용.** 제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·
`pnpm-workspace.yaml` 변경 **0**. 전체 테스트는 반복하지 않았다(제품 수치는 `b7ee207` 검증분이 정본).

**커밋 구분(중요)**

- **제품 검증 커밋 = `b7ee207`** — 구현 `fd92fbc` + 라운드 1 보완. **Codex 독립 검증 통과.**
- **문서 커밋** — 라운드 2 `91acec0`(해시 기록 정정), 라운드 3(이 항목).
  **`b7ee207` 이후 제품 코드 변경은 없다.**

**고친 불일치 4가지**

1. `verified_commit`이 **스펙 035 시절 값 `e9e2af6`** 으로 남아 있었다 → 실제 검증된 제품 커밋
   **`b7ee207`** 으로 정정.
2. `active_unit`이 `spec-036-codex-independent-verification`이었으나 제품 재검증은 이미 끝났다 →
   **`spec-036-closure-doc-verification`** 으로 정정.
3. `candidate_commit`에 제품/문서 커밋이 섞여 있었다 → 문서 라운드에는 제품 후보가 없음을 명시.
4. `CURRENT.md` 상단 정본 요약이 "다음 = Codex 독립 재검증"이라 말하고, 같은 블록에서
   `f86d446d…`를 다시 **"고객 dist SHA-256"** 이라 부르며, 게이트 수치도 **unit 1258**로
   낡아 있었다 → 종료 문서 확인 단계로, 정본 해시는 **파일명 + 287,741 bytes + `fc7660e5…`**,
   `f86d446d…`는 **dist 트리 집계 다이제스트**로만, 수치는 **unit 1271/1271 · E2E 134/134**로 정정.

live 로그와 스펙 036의 과거 append 기록은 **삭제·덮어쓰지 않았다**. `CURRENT.md` 상단 요약만
현재 사실로 재작성했다.

`pnpm-workspace.yaml`의 `allowBuilds`는 여전히 **NOT VERIFIED**(수정·`approve-builds` 모두 안 함,
Codex 새 클론 시도는 registry EACCES로 중단). 보호 대상 3개는 restore·checkout·stage·commit 하지
않았다. 자동화·반복 작업 0, 다음 스펙 미착수.

다음 전이: **Codex의 종료 문서 확인 → 스펙 036 종료 판단.**
