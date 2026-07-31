# 스펙 031 사전 조사 — 고객 텍스트 영역과 시계 오버레이의 실제 계약

작성: Claude Code, 2026-07-31 · 기준 커밋 `57d43b6` · **읽기 전용(구현 0)**
지시: `Automation/NEXT_CLAUDE_PROMPT.md`(스펙 031) · 선행: 스펙 019 §후속 순서의 `text/clock`

라인 번호는 모두 **현재 운영본**(`denn-mockup-tool.html` 16,139줄 / `denn-admin.html` 16,275줄)과
리빌드 소스 기준이다.

---

## 0. 한 줄 결론

**"텍스트"는 하나의 기능이 아니라 서로 다른 두 개의 모델이고, 시계는 미리보기에만 그려진다 —
다만 그것이 결함인지 의도인지는 이 저장소의 근거만으로 확정할 수 없다.**

- **액자** = 운영자가 좌표를 찍은 **키 기반 `textZones`**(`main`/`name`/`name2`/`date`/`sub`)에 고객이
  **값만** 입력한다. **인쇄에 반영된다.**
- **케이스** = 고객이 캔버스 위에서 **자유롭게 끌어 놓는 `textObjs`**다. 키도 zone도 없고 운영자 데이터와
  무관하다. **인쇄에 반영된다.**
- **시계**는 미리보기 경로에만 그려지고 **인쇄/export 경로에는 없다**(§3.5). 이것이 "미리보기≠인쇄"
  결함인지, 아니면 **완제품의 물리적 시계 하드웨어를 화면에서만 합성한 가이드**여서 인쇄에 없는 것이
  정상인지는 **`UNCONFIRMED`** 다(§3.5.1). **이 스펙의 첫 결정은 시계의 제품 의미다**(§10 F-4).
- 리빌드는 `textZones`·`clock`·`clockSettings`·`customFonts`를 **카탈로그에서 보존만 하고 투영하지
  않는다**. `packages/render` plan 어휘에 **텍스트 커맨드가 0개**다 → 이번에도 계약 확장이 전제다.

---

## 1. "텍스트"의 두 소유자 (CONFIRMED)

| # | 모델 | 위치 | 데이터 | 좌표 | 고객이 하는 일 | 인쇄 |
| --- | --- | --- | --- | --- | --- | --- |
| ① | **액자 `textZones`** | `mockup:1783-1815`(미리보기), `:11387-11402`+`:11427`(인쇄) | 운영자가 만든 zone 배열 + `defaultTexts` | zone의 `%` 좌표 | **값만 입력**(`f-main` 등 5개 input) | **O** |
| ② | **케이스 `textObjs`** | `mockup:1736-1737`, `:3038`, `:9732`(`drawTextObject`) | 고객 세션 전용 배열 | 고객이 **드래그**한 px 좌표 | 문구·글꼴·크기·색·위치 전부 | **O** |

**두 모델은 코드도 데이터도 공유하지 않는다.** ①은 `z.key`로 값을 찾고, ②는 `t.text`를 그대로 그린다.
스펙 031이 "고객 텍스트"를 하나로 묶으려면 이 분리가 첫 번째 결정이다(§10 F-1).

### 1.1 액자 텍스트 필드는 정확히 5개다

`['main','name','name2','date','sub']` — `mockup:15663`, `:15827`(공유 링크 복원),
`:11390`(`frameTextValues`), `admin:zeDefaultTexts`(`main`/`name`/`date`/`sub`만, **`name2` 없음**).

> ⚠️ **불일치(CONFIRMED)**: 고객 입력은 `name2`를 포함한 **5개**인데 운영자 `defaultTexts`는 **4개**다
> (`admin` `zeDefaultTexts`). `name2`는 기본값을 가질 수 없다.

---

## 2. `textZones` zone 하나의 실제 필드 (CONFIRMED)

`drawSimpleTextZone`(`mockup:11387-11402`)이 읽는 전부:

| 필드 | 기본값 | 의미 |
| --- | --- | --- |
| `key` | (필수) | `main`/`name`/… 값 조회 키 |
| `x`, `y` | `50`, `50` | **캔버스 대비 %** → `IX + x/100*IW` |
| `fontSize` | `6` | **폭 대비 %** → `max(10, fontSize/100*IW)` (**하한 10px**) |
| `align` | `'center'` | `left`/`center`/`right` |
| `boxW` | `100` | **폭 대비 %** — wrap 폭 |
| `letterSpacing` | `0` | `fSize*letterSpacing/100` px |
| `lineH` | `1.25` | 줄 높이 배수 |
| `rotation` | `0` | **도 단위 임의 각도** — `ctx.rotate(rotation*π/180)` |
| `font` | `'DM Sans'` | + `,sans-serif` 폴백 |
| `bold`, `italic` | `false` | 폰트 문자열에 조립 |
| `color` | `'#111'` (인쇄) / `'#FFF'` (`applyFrameTextStyle`) | **두 경로의 기본색이 다르다** |

zone은 admin `zeSerializableZones`(`admin:1962`)가 `_hit`만 제거하고 **나머지를 통째로 직렬화**한다
→ **스키마가 열려 있다**(운영자 UI가 넣는 아무 필드나 저장된다).

### 2.1 빈 값 처리가 경로마다 다르다 (CONFIRMED — 결함)

- `mockup:11388` (V365 인쇄): `if(text==null||text==='')return` → **`null`/`''`만** 스킵
- `mockup:9732` (V36 인쇄, 구버전): `if(!text||!z)return` → `'0'`도 falsy로 **스킵됨**
- `mockup:1786` (미리보기): `if(!txt)return` → 역시 `'0'` 스킵

→ **`"0"` 한 글자를 입력하면 일부 경로에서 사라진다.**

### 2.2 wrap·줄 수 제한이 경로마다 다르다 (CONFIRMED — 결함)

| 경로 | 줄바꿈 | 최대 줄 수 |
| --- | --- | --- |
| `frameWrapText`(`:1576`) | `\n` 분리 + 단어 wrap + **글자 단위 강제 분해** | **2** (`slice(0,2)`) |
| `frameTextLines`(`:1570`) | `\n`만 | **2** |
| V365 폴백(`:11400`) | `\n`만 | **3** (`slice(0,3)`) |
| V36 인쇄(`:9732`) | `frameWrapText` 있으면 wrap, 없으면 `\n` **2줄** | 2 |

→ **같은 문구가 미리보기 2줄 / 인쇄 3줄**이 될 수 있다. 리빌드는 **한 개의 wrap 계약**으로 통일해야 한다.

### 2.3 letter-spacing은 직접 구현이다

`frameMeasureTextSpacing`/`frameDrawTextSpacing`(`:1574-1575`)이 **글자 하나씩 `fillText`** 하며
정렬 보정을 직접 한다(`center`면 `x-w/2`, `right`면 `x-w`). Canvas의 `letterSpacing` 속성을 쓰지 않는다
→ 리빌드에서 `ctx.letterSpacing`(최신 브라우저)로 바꾸면 **줄 폭 계산이 달라져 wrap 결과가 바뀐다**.

### 2.4 색·그림자는 별도 오버라이드 레이어가 가로챈다

`applyFrameTextStyle`(`:1580`)은 `frameTextStyleOn && frameTextStyle[key].on`이면 zone의 `color`를
**무시**하고 오버라이드 색·그림자(`shadowColor`/`shadowBlur`/`shadowY`, `offsetX`는 항상 0)를 쓴다.
오버라이드가 없으면 기본색이 **`#FFF`** 다(zone `color`가 없을 때). 인쇄 폴백은 **`#111`** 이다(`:11395`).

→ **`applyFrameTextStyle`이 정의되지 않은 컨텍스트에서 인쇄하면 글자색이 흰↔검으로 뒤집힌다.**

### 2.5 clip은 없다

`drawSimpleTextZone`에 `clip()` 호출이 **없다**. `boxW`는 **wrap 폭일 뿐 잘라내지 않는다** →
긴 단어 하나는 강제 분해(`frameWrapText`)로 흡수되지만, **3줄 이상은 그냥 아래로 흘러넘친다**
(줄 수 제한이 유일한 방어).

### 2.6 레이어 순서 (CONFIRMED)

미리보기(`:1783-1815`) / 인쇄(`:11413-11443`) 모두:

```
배경 → 사진(zone clip) → 템플릿 아트 오버레이 → textZones → (시계: 미리보기만) → 흰 테두리
```

텍스트는 **아트 위**, **테두리 아래**다. `builtin`(비업로드) 액자는 textZones를 쓰지 않고
**하드코딩 좌표**(`:11434-11437`: `y = h*0.18/0.30/0.40/0.50`, `serif`/`sans-serif` 혼용)로 그린다.

---

## 3. 시계 (CONFIRMED)

### 3.1 데이터 원천은 3단 병합이다

`ADM.clockSettings` → `frameSizes[].clock` → `frameTemplates[].clock` 순으로 덮어쓴다
(`mockup:1775-1777`, `:2465-2470`, `:3042`). 필드는 `{x, y, size, customImg}`
(`packages/shared/src/catalog/read.ts:107`이 정확히 이 4개를 allowlist한다).

- `x`,`y`: **% 좌표**, 기본 `88`,`88`(우하단)
- `size`: **`min(IW,IH)` 대비 %**, 기본 `12`, 하한 `4px`
- `customImg`: 있으면 **이미지 시계**, 없으면 **텍스트 시계**

### 3.2 표시 여부

`opts.clock` 토글(`:1277` `togFrame`) + `clockVisible(curFSz, curFTpl)`(`:3042`, `:3131`).
템플릿 분류는 `isClockTemplate`(`:971-975`): **명시적 OFF만 일반액자**
(`clockEnabled===false` 또는 `clock===false`, 또는 빌더 생성 + `clock==null`).
**`clock` 필드가 아예 없으면 시계액자로 간주**한다 → 기본값이 "시계 있음"이다.

### 3.3 갱신은 1초 setInterval, 정리는 부실하다

```js
if(opts.clock) clockTmr = setInterval(renderFrame, 1000);
else clearInterval(clockTmr);            // mockup:1277
```

- **`clockTmr`을 덮어쓰기 전에 `clearInterval` 하지 않는다** → 토글을 껐다 켜면 타이머가 누적될 수 있다.
- 페이지 이탈·템플릿 전환 시 정리 훅이 없다(`:6825`, `:8224`에 방어적 `clearInterval`이 뒤늦게 추가됨).
- **1초마다 액자 전체를 다시 그린다** — 텍스트만 갱신하지 않는다.

### 3.4 시각은 로컬 시간, 포맷은 24시간 `HH:MM` 고정

`drawTextClock`(`:3199-3207`): `new Date().getHours()/getMinutes()` → `'0'+…`.slice(-2) →
`hh+':'+mm`. **초 없음, timezone·locale 미사용, AM/PM 없음.**
글꼴 `700 max(9, round(box*0.38))px DM Sans`, 색 `rgba(35,31,26,.92)`, `textAlign/Baseline = center/middle`.

### 3.5 인쇄/export 경로에 시계가 없다 (CONFIRMED — 사실만)

`renderFramePrintV365`(`:11404-11446`)와 구버전 `renderFramePrint`(`:9732` IIFE 내부) **모두
`drawClockLayer` 호출이 0회**다(본문 전 범위 확인). 미리보기 경로에만 존재한다
(`:1802`, `:1812`, `:2596`, `:2607`, `:3131`).

**이것은 관측된 사실이며, 그 자체로 결함이라는 판정이 아니다.** §3.5.1 참조.

### 3.5.1 ★ 시계의 제품 의미는 `UNCONFIRMED`

시계가 **인쇄되는 그래픽**인지, **완제품에 달린 물리적 시계 하드웨어를 화면에서만 합성한
가이드/미리보기**인지 이 저장소의 근거만으로는 **확정할 수 없다**. 양쪽 근거를 모두 남긴다.

**A. "물리적 하드웨어 미리보기"를 지지하는 근거**

| 근거 | 경로 |
| --- | --- |
| 운영자 빌더 섹션 제목이 **"⏰ 템플릿용 시계 가이드"** — "가이드"라고 명시 | `admin:335` |
| 안내문 **"템플릿 제작 시 시계를 미리 보면서 위치를 잡고"** — 시계를 **보면서 아트를 배치**한다는 뜻이라, 시계가 아트의 일부가 아니라 **회피 대상**으로 읽힌다 | `admin:342` |
| **`customImg`(시계 이미지 커스텀)** — 운영자가 올린 시계 **사진**을 합성한다. 실제 하드웨어의 사실적 미리보기로는 자연스럽지만, 인쇄 그래픽 원본으로는 부자연스럽다 | `admin:475`, `mockup:3211-3216` |
| **두 개의 독립적인 인쇄 구현**(V36 `:9732`, V365 `:11404`)이 **모두** 시계를 뺐다 — 한쪽만 빠졌다면 누락이지만, 독립 구현 2개가 일치하면 의도일 가능성이 높다 | `:9732`, `:11404-11446` |
| **주문 payload에 시계 상태가 없다**(`product:{frameSizeName, templateName, categoryName}`) → 주문 흐름이 시계를 **고객 선택 옵션으로 취급하지 않는다** | `:11445`, `:9732` |
| **"시계액자"가 템플릿 카테고리/상품군 이름**이다(전체·시계액자·일반액자 탭) → 시계 유무가 **제품 라인**의 속성으로 보인다 | `mockup:1107-1109`, `:971` |

**B. "인쇄되는 그래픽"을 지지하는 근거**

| 근거 | 경로 |
| --- | --- |
| 고객 UI 문구가 **"시계 표시 / 시계 추가"** — 고객이 자기 디자인에 **추가**하는 것처럼 읽힌다 | `mockup:434` |
| 고객이 **요소 리스트에서 시계 행을 삭제**할 수 있다(문구·이미지와 나란히) | `mockup:13277`, `:13290` |
| **`clockOn`이 `space-scene-v1` 공유 씬의 `design`에 저장**된다 → 고객이 승인한 **디자인 상태의 일부** | `mockup:15636`, 복원 `:15665` |
| 운영자가 **사이즈별·템플릿별로 위치·크기를 저장**한다(3단 병합) → 단순 가이드치고는 데이터가 정교하다 | `mockup:1775-1777` |
| 시계가 **고객 미리보기 캔버스에 직접 baked** 된다. 이 코드베이스에는 "미리보기 전용은 굽지 않고 DOM 오버레이로 분리"하는 **선례가 이미 있는데**(운영자 가이드 이미지), 시계는 그 패턴을 쓰지 않았다 | `docs/denn-v36.4-frame-template-tools-report.md:60`, `:70-78` |

**C. 확정 근거가 없는 것 (NOT FOUND)**

- 물리적 시계 하드웨어를 가리키는 어휘(**무브먼트·바늘·초침·분침·시침·타공·벽시계·무소음·건전지**)가
  두 운영본 HTML과 `docs/` 전체에서 **0건**이다.
- 제품 설명·주문서·가격표·포장/조립 안내처럼 "시계가 실물로 들어간다"를 확정할 산출물이 저장소에 없다.
- 반대로 "시계를 인쇄한다"고 적은 문서·주석도 **없다**.

> **판정: `UNCONFIRMED`.** 어느 쪽도 확정할 수 없으므로 이 보고서는 §3.5의 코드 사실만 주장하고,
> **"구조적 불일치"·"결함"·"인쇄에 포함 권장"이라는 판정을 하지 않는다.** Founder가 제품 의미를
> 확정해야 후속 계약이 정해진다(§10 F-4).

### 3.6 `drawClockLayer`는 최소 12번 재정의된다 (CONFIRMED — 함정)

`:1816`, `:2465`, `:2528`, `:2667`, `:2684`, `:2746`, `:2761`, `:2778`, `:2823`, `:2848`, `:3042`,
`:3181`, `:3210`. 마지막 정의만 살아 있으며 각 버전의 `cfg` 병합 순서·이미지 캐시·`clockVisible` 게이트가
**서로 다르다**. 레거시 동작을 "읽어서" 재현하려 하면 **어느 버전을 읽었는지에 따라 답이 달라진다**
→ 리빌드는 §3.1~3.4의 **관측된 최종 동작만** 계약으로 삼아야 한다.

---

## 4. 카탈로그 스키마: 보존은 되지만 투영은 0 (CONFIRMED)

`packages/shared/src/catalog/read.ts`:

- `frameTemplates` allowlist(`:85-100`)에 **`textZones`, `clock`, `clockEnabled`** 포함 → 경고 없이 보존
- `frameSizes` allowlist(`:82`)에 **`clock`** 포함
- `clockSettings` object allowlist(`:107`) = **`x`,`y`,`size`,`customImg`**
- 최상위 컬렉션(`:23-30`)에 **`customFonts`** 존재
- **`caseTemplates`·`customFonts`는 item allowlist가 없다**(`:45-46`) → **`id`만 검증되는 불투명 객체**
- **`defaultTexts`는 어느 allowlist에도 없다** → 보존되지만 "알려진 필드"가 아니다

`packages/shared/src/catalog/preview/project.ts`: `projectCasePreviewGeometry`(`:403`),
`projectFramePreviewGeometry`(`:417`) — **`textZones`·`clock` 문자열이 0회 등장한다.**

→ **투영 계층에 텍스트·시계 출력을 새로 만들어야 한다.** 카탈로그 원본을 그대로 넘기는 것은
스펙 025 §4 계층(원본은 투영 입력으로만 사용) 위반이다.

---

## 5. 소유권 경계 (CONFIRMED)

| 데이터 | 소유자 | 근거 |
| --- | --- | --- |
| `textZones`(좌표·글꼴·색·회전) | **운영자** | `admin:1728` `openZoneEditor`, `:1964` `saveZones`, `:7662` |
| `defaultTexts`(예시 문구) | **운영자** | `admin:1963` `zeDefaultTexts`, `:1964` |
| 액자 문구 **값** | **고객** | `mockup:11390` `frameTextValues` ← `f-main`/`f-name`/`f-name2`/`f-date`/`f-sub` |
| `frameTextStyle`(색·그림자 오버라이드) | **고객** | `mockup:1580-1590` — 고객 UI 토글 |
| 케이스 `textObjs` 전체 | **고객** | `mockup:1736`, 드래그 `dragIdx`/`dragOff`(`:982`) |
| `clockSettings`·`sz.clock`·`tpl.clock` | **운영자** | `mockup:1775-1777` |
| 시계 ON/OFF | **고객**(단, 템플릿이 허용할 때만) | `:1277` + `clockVisible` |

> ⚠️ `defaultTexts`는 **운영자가 쓴 예시 문구**(`'WEDDING'`, `'J & K'`, `'11 MAY 2025'` — `admin:1728`)다.
> 고객이 지우지 않으면 **운영자의 샘플 텍스트가 인쇄물에 들어간다**. 리빌드가 이 값을 초기값으로 쓸지는
> 제품 결정이다(§10 F-3).

---

## 6. lifecycle과 레이어 순서 (CONFIRMED)

- **케이스 multi-zone**: `textObjs`는 **zone에 속하지 않는다**. 캔버스 전역 좌표라 zone 전환·사진 교체와
  무관하게 그대로 남는다. `caseImgs[i]`/`caseImgTs[i]`(사진)와 완전히 분리된 lifecycle이다.
- **액자**: 값은 **DOM input에 산다**(`f-main` 등). 템플릿을 바꿔도 input은 유지되고, 새 템플릿의
  `textZones`에 그 키가 없으면 **값은 남아 있으나 그려지지 않는다**(조용한 소실).
- **필드 표시 게이팅**: `isFrameTextKeyAllowed`(`:10853`, `:10882`) — `textFields`/`textZones`에 없는 키의
  입력행을 숨긴다. 숨겨도 **값은 지워지지 않는다**.
- **모델/사이즈 전환**: 시계 설정은 `sz.clock`이 우선이라 사이즈를 바꾸면 시계 위치·크기가 바뀐다.
- **공유 링크**: `clockOn`(`:15636`)과 5개 텍스트 값(`:15663`, `:15827`)이 씬에 포함된다
  → **스펙 031이 텍스트 모델을 바꾸면 `?space=` 라운드트립 계약(CLAUDE.md §4-4)에 영향이 있다.**

---

## 7. 보안·개인정보 (CONFIRMED + 권고)

- 고객 문구는 **캔버스에만** 그려진다. 레거시에서 `console`·telemetry·URL 파라미터로 나가는 경로는
  발견되지 않았다(문구가 들어가는 곳은 `fillText`와 공유 씬 payload뿐).
- **길이·문자 제한이 어디에도 없다.** `maxlength` 속성 0건, 값 정규화 0건. 방어는 **wrap과 줄 수 제한
  뿐**이며 §2.2에 따라 경로마다 다르다.
- `String(text||'')` 외의 sanitize가 없다. Canvas 텍스트라 XSS 표면은 아니지만, **제어문자·RTL·이모지
  ZWJ 시퀀스**의 폭 계산은 `measureText`에 전적으로 의존한다.
- **리빌드 권고**: 스펙 026~030에서 확립한 규율을 그대로 적용한다 —
  ① 오류 payload에 **고객 원문·zone key·템플릿 id를 넣지 않는다**(스펙 030 §3과 동일),
  ② 값은 **예외 경계 안에서 정확히 한 번** 읽어 plain snapshot으로 만든다(hostile getter/Proxy/drift),
  ③ 길이 상한 초과·비문자열은 **거부**하고 잘라내지 않는다(clamp 복구 금지 — 029/030 규율),
  ④ 렌더 계층은 문자열을 **저장하지 않는다**(plan에만 담고 로그 0).

---

## 8. 필요한 plan/executor 어휘와 허용 파일 후보

### 8.1 현재 어휘로는 불가능하다 (CONFIRMED)

`packages/render/src/plan/types.ts`의 커맨드는 **4개뿐**이다:
`fill-rect`(`:143`), `draw-image-cover`(`:149`), `stroke-rect`(`:167`), `draw-image-stretch`(`:178`).
**텍스트 커맨드가 없다.** executor도 `fillText`/`measureText`/`font`를 전혀 노출하지 않는다
(`apps/mockup/src/canvas/types.ts`의 `PreviewCanvasContext`에 없음).

### 8.2 계약 확장이 필요한 지점

1. **plan 어휘**: `draw-text` 커맨드 신규(Codex 결정 C 항목). 최소 필드 후보 —
   `layerId`, `lines[]`(**wrap을 plan 생성 시점에 확정**), `origin`, `align`, `fontSpec`, `color`,
   `lineHeight`, `letterSpacing`, `rotationDegrees?`, `maxWidth`.
2. **★ 결정적 wrap의 딜레마**: wrap은 `measureText`가 필요하고 그건 **Canvas 컨텍스트**다. 그런데 plan은
   **순수·JSON-safe**(spec 020)여야 한다. 두 갈래뿐이다 —
   **(a)** plan에 **측정 포트를 주입**해 빌더가 줄을 확정한다(순수성 유지, 포트 1개 추가),
   **(b)** plan은 원문+`maxWidth`만 담고 **executor가 wrap**한다(plan이 결정적이지 않게 됨 → 스펙 020
   "결정적 plan" 계약 위반, 인쇄/미리보기 재현성 상실). **(a)를 권고한다** — §2.2의 레거시 결함이
   정확히 (b)에서 나왔다.
3. **executor**: `font`·`textAlign`·`textBaseline`·`fillText`(+ letter-spacing 구현 시 `measureText`)를
   **선택적 capability**로 선언한다 — 스펙 030 보완 라운드 1에서 확립한 패턴을 그대로 재사용하고,
   미지원 컨텍스트는 **preflight fail-closed**로 닫는다.
4. **폰트 로딩**: `document.fonts.ready`/`FontFace`가 필요하면 executor 밖(앱 계층)에서 처리하고,
   **폰트가 준비되지 않은 상태로 그리면 폭이 달라져 wrap이 깨진다** → plan 생성 전 게이트가 필요하다.
5. **시계**: **§8.4의 분기에 따른다** — 아래 참조.
6. **기존 계약 변경 불필요**: geometry(019)·image owner(026)·template art(028)·rotation(030)은
   **손댈 이유가 없다.** 텍스트는 zone/mat rect를 읽기만 한다.

### 8.4 ★ 시계의 구현 범위는 F-4에 종속된다 (분기)

시계의 제품 의미가 `UNCONFIRMED`(§3.5.1)이므로 **구현 범위를 지금 확정할 수 없다.**
아래 두 갈래는 **필요한 계약의 크기가 근본적으로 다르다.**

**ⓐ 물리적 하드웨어 미리보기로 확정되는 경우 — 훨씬 작다**

- 시계는 **print/export와 공유하는 결정적 plan에 넣지 않는다.** 인쇄 파일에 들어가지 않는 것이
  정상이므로 `draw-text` 커맨드도, 시각 확정도, plan 결정성 논의도 **전부 불필요**하다.
- 조사·구현 대상은 **preview overlay 계약**과 **timer lifecycle**뿐이다:
  ① 오버레이를 캔버스에 굽지 않고 **DOM 오버레이로 분리**할지(이 저장소에 선례가 있다 —
  운영자 가이드 이미지, `docs/denn-v36.4-frame-template-tools-report.md:60`),
  ② 1초 갱신이 실제로 필요한지(정지 시계로 충분한지),
  ③ **언마운트·템플릿 전환·토글 시 타이머가 정확히 하나만 살아 있는지**(레거시 누수 §3.3 미재현),
  ④ 미리보기 전용임을 고객에게 알리는 문구가 필요한지(F-4a).
- 이 경우 **`packages/render` 계약은 텍스트 때문에만** 바뀌고 시계 때문에는 바뀌지 않는다.

**ⓑ 인쇄 그래픽으로 확정되는 경우**

- §8.2의 `draw-text` 어휘를 그대로 쓰고, **시각을 plan 생성 시 확정**해 주입한다(§9.3).
- 이때만 "미리보기와 인쇄가 같은 plan을 소비한다"는 전제가 성립한다.

> **따라서 F-4가 확정되기 전에는 시계에 대해 "결정적 plan을 print/export와 공유한다"고 전제하지
> 않는다.** 텍스트(`textZones`) 쪽 계약은 이 분기와 무관하게 그대로 유효하다.

### 8.3 허용 파일 후보 (구현 스펙 승인 시)

- `packages/render/src/plan/types.ts`, `build.ts`(+ test) — 신규 커맨드와 측정 포트
- `packages/shared/src/catalog/preview/project.ts`(+ test) — textZones/clock 투영
- `packages/shared/src/catalog/types.ts` — 투영 결과 타입
- `apps/mockup/src/canvas/types.ts`, `executePreviewPlan.ts`(+ test) — 텍스트 capability
- `apps/mockup/src/canvas/productPlan.ts`(+ test) — 어댑터
- `apps/mockup/src/preview/PreviewComposer.tsx`, `previewContracts.ts`(+ test) — 입력 UI
- `apps/mockup/src/canvas/surface.css` — 입력 컨트롤 스타일 최소
- `tests/e2e/mockup-preview.spec.ts`

**금지 유지**: `packages/render/src/geometry/**`, `localImageBinding.ts`, `templateArtBinding.ts`,
`placement.ts`, `apps/admin/**`, 운영 HTML, manifest·lockfile·신규 의존성.

---

## 9. 검증 설계

### 9.1 framework-free unit

- wrap: `\n` 분리 · 단어 경계 · **긴 단어 강제 분해** · 줄 수 상한 · 빈 문자열 · **`"0"`** ·
  선행/후행 공백 · letter-spacing이 폭 계산에 반영되는지 (측정 포트는 **fake로 주입** → 브라우저 불필요)
- 값 검증: 비문자열·길이 초과·제어문자·hostile getter/Proxy/revoked Proxy → **거부**(clamp 0)
- zone 검증: `%` 범위·`fontSize` 하한·`rotation` 유한성·`align` 열거값 → 범위 밖은 **plan 미생성**
- 시계 포맷: `0시`→`00`, `9:5`→`09:05`, 23:59 경계 (**주입된 시각**으로만)
- 레이어 순서: 사진 → 아트 → 텍스트 → 시계 → 테두리

### 9.2 실제 Chromium E2E

- 문구 입력 → **실제 픽셀**에 글자색이 나타나는지(배경색과 다른 픽셀 존재)
- 긴 문구가 **줄바꿈**되고 상한을 넘지 않는지
- 회전 zone의 텍스트가 회전된 위치에 있는지
- 값 삭제 → 픽셀 원복
- 320px 오버플로 0, 44px 타깃, **axe serious/critical 0**, console 0
- **고정 sleep 0** — 스펙 030에서 쓴 `expect.poll` 패턴을 그대로 사용한다

### 9.3 ★ 시계는 반드시 fake clock으로 (flaky 금지)

`new Date()`를 직접 호출하면 **자정·분 경계에서 재현 불가**다. 두 층 모두 주입한다 —

- unit: 시각을 **인자로 받는 순수 함수**로 분리해 실제 시계를 쓰지 않는다.
- E2E: Playwright의 **`page.clock`**(고정 시각 설치 + 수동 진행)으로 `HH:MM` 전환을 결정적으로 만든다.
  `setInterval`이 실제로 1분 뒤 값을 바꾸는지, 그리고 **언마운트 시 타이머가 정리되는지**(§3.3의 레거시
  누수 미재현)를 같은 방법으로 고정한다.
- **실제 timezone·locale에 의존하는 단언은 금지**한다.

### 9.4 구조적으로 검증 불가

- 실기기 4환경의 IME(한글 조합 중 렌더), 소프트 키보드가 캔버스를 가리는 문제 → **육안 필요**
- 사용자 시스템에 설치되지 않은 글꼴의 실제 대체 결과
- 실제 인쇄물의 글자 크기·가독성

---

## 10. 결정 필요 항목

### 10.1 Founder 결정 (제품·UX·정책)

| ID | 질문 | Claude 권장 | 근거 |
| --- | --- | --- | --- |
| **F-1** | 케이스에도 텍스트를 제공하는가? 준다면 액자처럼 **키 기반 zone**인가, 레거시처럼 **자유 배치**인가 | **1차는 액자 zone 방식만**. 케이스 자유 배치는 별도 스펙 | 자유 배치는 드래그·선택·히트테스트·삭제 UI가 필요해 사실상 별개 기능이다(§1). 스펙 029가 사진 드래그를 이미 도입했으므로 충돌 검토도 필요 |
| **F-2** | 고객이 **색·그림자**를 바꿀 수 있게 하는가(레거시 `frameTextStyle`) | **1차 미지원**(운영자 zone의 색 고정) | 오버라이드가 zone 색을 가로채 §2.4의 흰↔검 뒤집힘을 만든 원인이다. 먼저 단일 소유자로 닫는다 |
| **F-3** | 운영자 `defaultTexts`를 고객 입력의 **초기값**으로 넣는가 | **넣지 않는다**(placeholder로만 표시) | 초기값으로 넣으면 `'WEDDING'`·`'J & K'` 같은 **운영자 샘플이 인쇄물에 들어간다**(§5) |
| **F-4** | **★ 먼저 결정: 시계의 제품 의미는 무엇인가** — ⓐ 완제품에 달린 **물리적 시계 하드웨어**를 화면에서만 합성한 미리보기/가이드인가, ⓑ **인쇄되는 그래픽**인가, ⓒ 템플릿에 따라 **둘 다** 가능한가 | **권장하지 않는다 — 근거 부족(`UNCONFIRMED`)** | §3.5.1에 A(하드웨어)·B(인쇄 그래픽) 근거를 모두 정리했고 확정 근거는 **NOT FOUND**다. AI가 임의 확정할 수 있는 항목이 아니다 |
| **F-4a** | F-4가 **ⓐ 물리적 하드웨어**로 확정되면 | print/export **미포함을 유지**하고 preview에서만 표시한다. 미리보기에 "실물 시계가 부착됩니다" 취지의 설명을 둘지 별도 결정 | 현재 동작이 곧 정답이 된다. 인쇄 계약 변경이 **불필요**해진다 |
| **F-4b** | F-4가 **ⓑ 인쇄 그래픽**으로 확정되면 | 포함 여부를 결정하고, 포함한다면 **F-5**를 이어서 결정 | 이때 비로소 "미리보기≠인쇄"가 해결해야 할 문제가 된다 |
| **F-5** | (F-4b일 때만) 인쇄에 넣는다면 시계가 가리키는 시각은? | **주문 시각 고정**(plan 생성 시점) 또는 운영자가 정한 고정 시각 | "현재 시각"은 인쇄 파일에서 의미가 없다. 시계 광고 관행은 10:10 고정 |
| **F-6** | 문구 **길이 상한**과 초과 시 동작 | zone별 상한을 두고 **초과 입력을 막는다**(잘라내기·말줄임 금지) | 조용한 잘림은 "본 것과 다른 인쇄물"을 만든다. 스펙 029/030의 "거부하되 복구하지 않는다" 규율과 일치 |
| **F-7** | 줄 수 상한(현재 2 또는 3으로 불일치) | **zone이 정하되 기본 2줄**, 초과는 F-6과 동일하게 입력 차단 | §2.2의 미리보기≠인쇄를 원천 제거 |
| **F-8** | `name2`에 기본값이 없는 문제 | 운영자 편집기에 **`name2` 추가**(admin 스펙) 또는 리빌드에서 5개 균일 처리 | §1.1 불일치 |

### 10.2 Codex 구조 결정 (수학·계약)

| ID | 결정 | Claude 권장 |
| --- | --- | --- |
| **C-1** | wrap을 **plan 생성 시점**에 확정할 것인가 | **확정한다.** 빌더에 **측정 포트**를 주입해 `lines[]`를 plan에 담는다(§8.2). plan의 결정성·JSON-safe 유지 |
| **C-2** | 텍스트 커맨드 형태 | `draw-text` 신규 커맨드 1개. `draw-image-*`와 대칭으로 **필드는 모두 확정값**(원문·maxWidth 미포함) |
| **C-3** | 폰트 스펙 표현 | `{family, sizePx, weight, italic}` **구조체**(문자열 조립 금지) — executor가 조립. 폴백 체인은 plan이 소유 |
| **C-4** | letter-spacing 구현 | **글자별 `fillText`(레거시 방식) 유지**. `ctx.letterSpacing`은 지원 편차 + 폭 계산 불일치(§2.3) |
| **C-5** | 회전 | zone의 **임의 각도(도)** 허용 — 사진(030)의 quarter-turn 제약은 cover/빈 공간 때문이었고 **텍스트에는 그 제약이 없다** |
| **C-6** | clip | `boxW`는 **wrap 폭이며 clip이 아니다**(레거시와 동일). 넘침은 F-6/F-7의 입력 차단으로 막는다 |
| **C-7** | 빈 값 | `undefined`/`''`만 "없음". **`"0"`은 유효한 문구**다(§2.1 결함 미재현) |
| **C-8** | 시계 표현 | **F-4에 종속되므로 지금 확정하지 않는다.** ⓑ 인쇄 그래픽이면 별도 커맨드 없이 `draw-text`로 표현하고 시각을 **plan 생성 시 확정**한다. ⓐ 물리적 하드웨어면 **plan에 넣지 않고** preview overlay로만 두어야 하며(§8.4), 그때는 결정적 plan 계약이 아예 적용되지 않는다 |
| **C-9** | executor capability | `font`/`textAlign`/`textBaseline`/`fillText`(+`measureText`)를 **선택적 capability**로 선언하고 미지원 시 **preflight fail-closed** — 스펙 030 보완 라운드 1 패턴 재사용 |
| **C-10** | 오류 우선순위 | 스펙 030 §3 순서를 유지하고 **텍스트 검증을 "transform 유한성·범위" 단계 뒤에** 편입. 실패 시 **plan 미생성** |
| **C-11** | 투영 | `projectFramePreviewGeometry`가 **정규화된 textZones/clock을 반환**하도록 확장(원본 카탈로그를 하위 계층에 넘기지 않는다 — 스펙 025 §4) |

---

## 11. 최소 구현 순서 (권장)

1. 투영: 카탈로그 → 정규화 textZones/clock (packages/shared, unit only)
2. plan 어휘 + 측정 포트 + wrap 확정 (packages/render, unit only)
3. executor 텍스트 capability + fail-closed (apps/mockup canvas, unit only)
4. 어댑터 연결 (productPlan)
5. 고객 입력 UI + 초기화 행렬 (PreviewComposer)
6. **시계 — F-4 확정 후에만.** ⓐ면 preview overlay + timer 정리만(§8.4), ⓑ면 고정 시각 주입 + plan 포함
7. E2E(fake clock 포함)

> 1~5(텍스트)는 F-4와 무관하게 진행할 수 있다. **6만 F-4에 막혀 있다.**

---

## 12. STOP 조건

1. `packages/render/src/geometry/**` 수정이 필요해질 때
2. 스펙 026 image owner / 028 template art / 030 rotation 계약을 바꿔야 할 때
3. 신규 의존성(폰트·텍스트 정형 라이브러리)이 필요할 때
4. `apps/admin/**` 또는 운영 HTML 수정이 필요할 때(`name2` 기본값 등 F-8)
5. wrap 결과가 플랫폼별로 갈려 결정적 plan을 만들 수 없을 때
6. 폰트 로딩 실패 시 폭이 달라져 미리보기≠인쇄가 재발할 때
7. 실제 network·Firebase·운영 데이터 접근이 필요해질 때
8. `?space=` 공유 씬 계약을 바꿔야 할 때(CLAUDE.md §4-4)
9. Founder 결정(F-1~F-8) 없이 UX를 확정해야 할 때
10. E2E가 실제 시계에 의존해 flaky해질 때
11. **F-4(시계의 제품 의미)가 확정되지 않은 채 시계 구현을 시작해야 할 때** — ⓐ/ⓑ에 따라 필요한 계약의
    크기가 근본적으로 다르다(§8.4)
12. 조사만으로 제품 의미를 확정할 수 없는 항목을 **AI가 추정으로 확정**해야 할 때

---

## 13. 이번 조사에서 하지 않은 것

- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` 변경 **0**
- 구현 스펙 작성 **0**(Codex 소유), 텍스트·시계 제품 코드 **0**
- watermark·실제 print/export 구현·원격 폰트 업로드·admin 구현·주문 흐름 **범위 밖**
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·이미지 접근 **0**
- 알려진 스펙 018 PNG 2개 **restore·stage·commit 하지 않음**

### UNCONFIRMED / NOT VERIFIED / NOT TESTED

- **`UNCONFIRMED` — 시계의 제품 의미**(물리적 하드웨어 미리보기 vs 인쇄 그래픽). 양쪽 근거를 §3.5.1에
  정리했고 확정 근거는 저장소에 **없다**. **Founder 결정 F-4 없이는 확정되지 않는다.**
- 레거시의 **실제 화면 동작**은 코드 근거로만 판정했다(운영본 실행 0). 특히 §3.6의 12중 재정의 중
  **런타임에 최종 승자가 무엇인지**는 실행으로 확인하지 않았다.
- `customFonts`의 실제 데이터 형태(스키마가 없어 불투명) — 운영 카탈로그 미열람
- 실기기 IME·소프트 키보드 동작, 폰트 대체 결과, 실제 인쇄물 가독성

---

## 14. 보완 라운드 1 (2026-07-31) — 시계의 제품 의미

Codex 지적: **§0·§3.5·§10 F-4/F-5가 "인쇄에 시계가 없다"는 코드 사실에서 곧바로 "구조적 불일치·결함"
판정과 "인쇄 포함" 권장을 도출했다.** 그러나 `admin:335-342`("템플릿용 시계 가이드", "템플릿 제작 시
시계를 미리 보면서 위치를 잡고")는 시계가 **완제품의 물리적 하드웨어**이고 화면에서만 합성하는
가이드일 가능성을 지지한다. **지적은 타당하다.**

보완한 것:

1. **추가 조사**를 수행해 양쪽 근거를 경로·라인과 함께 §3.5.1에 정리했다. 새로 찾은 근거 —
   **주문 payload에 시계 상태가 없다**(하드웨어 쪽 근거), **`clockOn`이 공유 씬 `design`에 저장된다**
   (그래픽 쪽 근거), **하드웨어 어휘가 저장소 전체에서 0건**(어느 쪽도 확정 불가).
2. 제품 의미를 **`UNCONFIRMED`** 로 명시하고 **"구조적 불일치"·"결함"·"인쇄 포함 권장"** 단정을
   §0·§3.5·§10에서 **제거**했다. §3.5는 이제 코드 사실만 주장한다.
3. **Founder 결정 순서를 재구성**했다: F-4(제품 의미) → F-4a(하드웨어면 현행 유지) /
   F-4b(그래픽이면 포함 여부) → F-5(그때만 시각 의미).
4. **구현 범위를 §8.4에서 분기**시켰다. 하드웨어로 확정되면 **결정적 plan 공유를 전제하지 않고**
   preview overlay 계약과 timer 정리만 다룬다. C-8도 F-4 종속으로 바꿨다. STOP 조건 2개를 추가했다.
5. **바꾸지 않은 것**: §1·§2(textZones 조사 전체), §4~§7, C-1~C-7·C-9~C-11, §9 검증 설계.
   텍스트 쪽 결론은 이 분기와 무관하게 그대로 유효하다.
