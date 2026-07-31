# 조사 — 운영자 cm 입력 UI (스펙 032 §후속 순서 2)

작성: Claude Code, 2026-07-31 · **읽기 전용 조사. 제품 코드·테스트·CSS·설정 변경 0.**
기준: HEAD=origin=`8a4ed09` (스펙 032 DONE `315356a` 이후 종료 문서)
선행: 계약 `2a0cfd3`, 구현 `c10e7a6`, 결정 정본 `0443137`

---

## 0. 세 줄 요약

1. **★ 리빌드 admin에는 아직 아무것도 없다.** `apps/admin/src/App.tsx`는 스펙 011의 **UI 프리미티브
   데모 셸**이고, 카탈로그도 저장도 인증도 없다. "cm 입력란 두 개 추가"가 아니라 **리빌드 최초의
   운영자 기능 + 최초의 쓰기 경로**를 만드는 일이다.
2. **★★ 레거시에는 이미 명시적 cm 필드 `wcm`/`hcm`이 있다.** 스펙 032가 채택한
   `printWidthCm`/`printHeightCm`과 **다른 이름**이며, 레거시 소비자 코드는 `wcm`/`hcm`을
   **1순위**로 읽는다. 지금 리빌드가 그 값을 만나면 `UNKNOWN_FIELD` 경고로 흘리고
   `projectFramePrintPhysicalSize`는 **`null`(=인쇄 불가)** 을 낸다. **마이그레이션 결정이 필요하다.**
3. **★ 레거시 사이즈 "수정"은 cm을 저장하지 않는다.** `confirmEditSz`가 `aspect`만 갱신하고
   `wcm`/`hcm`은 그대로 둔다 → **aspect와 cm이 조용히 어긋난다**. 스펙 032가 NOT TESTED로 남긴
   "aspect↔cm 비율 불일치"를 **실제로 만들어내는 메커니즘**이 레거시에 존재한다.

---

## 1. 리빌드 admin의 현재 상태 (근거)

`apps/admin/src/App.tsx:1-63` 전문이 **프리미티브 쇼케이스**다. 파일 주석이 직접 말한다:

> `// Primitive showcase shell only (spec 011): renders @denn/ui primitives to verify the`
> `// package boundary and real render. No product features, no click side effects`
> `// (the view chips toggle local UI state only — no save / network / navigation).`

`apps/admin/src` 전체가 **3개 파일 79줄**(`App.tsx`, `main.tsx`, `env.d.ts`)이다.
`apps/admin/package.json` 의존성은 `@denn/shared`, `@denn/ui`, `react`, `react-dom`뿐이다 —
`@denn/firebase`조차 없다.

### 1.1 리빌드에는 쓰기 경로가 0이다

`packages`·`apps` 전체에서 `uploadString|uploadBytes|setDoc|updateDoc|putFile|writeFile` **0건**.

`packages/firebase/src/index.ts`가 경계를 명시한다:

> `// NO Firebase SDK, NO Auth/Firestore/Storage write, NO env vars, NO firebase config here.`
> `FIREBASE_NOT_IMPLEMENTED = "firebase SDK/auth/write wiring is implemented in a later spec …"`

읽기도 **`published/state.json` 한 곳뿐**이다(`public-catalog/location.ts:11-14`). 운영자가 쓰는
`admin/state.json`은 리빌드가 **읽지도 쓰지도 않는다**.

### 1.2 그래서 "cm 입력 UI"의 실제 크기

cm 입력란을 만들어도 **저장할 곳이 없다**. 최소한 다음이 함께 필요하다.

| 필요한 것 | 현재 | CLAUDE.md §4 제약 |
| --- | --- | --- |
| 운영자 인증(Email/Password, **비익명**) | 없음 | 제약 6 — 규칙이 `sign_in_provider != 'anonymous'` |
| `admin/state.json` 읽기 | 없음 | 제약 2 — `admin/` **비공개** |
| `admin/state.json` 쓰기 | 없음 | 제약 2 · 5 — `__opRev`/`__cloudRev` 리비전 규율 |
| 카탈로그 편집 화면 | 없음 (데모 셸) | — |
| 발행(`published/state.json`) | 없음 | 제약 2 — 운영자-write |

이 중 **어느 것도 스펙 032가 다루지 않았다.** 인증·쓰기는 Firebase 표면이라
**CLAUDE.md §1.3의 자동 진행 금지 항목**에 걸린다.

**→ STOP 1 (아래 §6).**

---

## 2. ★★ 레거시에 이미 있는 cm 필드 — `wcm` / `hcm`

### 2.1 운영자가 실제로 쓰는 필드

`denn-admin.html:1698`, 커스텀 사이즈 **추가**:

```js
S.frameSizes.push({id:'sz'+Date.now(), name:name, sub:autoSub, aspect:w/h,
                   wcm:w, hcm:h, custom:true, clock:clk, frameThickness:thick});
```

입력 필드 id는 **`s-wcm` / `s-hcm`** 이고, `sub`는 값이 없으면 `w+'×'+h+' cm'`로 **자동 생성**된다
(`:1697`). 즉 **레거시 운영자 UI는 이미 cm을 명시적으로 입력받아 저장한다.**

### 2.2 소비자가 실제로 읽는 순서

`denn-mockup-tool.html:11299-11316`:

```js
var pairs=[
  [sz.wcm,sz.hcm],            // ← 1순위, 레거시 admin이 쓰는 필드
  [sz.wCm,sz.hCm],
  [sz.widthCm,sz.heightCm],
  [sz.cmW,sz.cmH],
  [sz.printWcm,sz.printHcm],
  [sz.printWidthCm,sz.printHeightCm],   // ← 6순위, 스펙 032가 채택한 이름
  [sz.w,sz.h],                          // ← P-2가 금지한 논리 px 오염 경로
  [sz.width,sz.height]
];
… var txt=[sz.sub,sz.sizeText,sz.label,sz.name,sz.id,sz.key].join(' ');
return cmFromText(txt)||knownCm(sz);    // ← P-2가 금지한 이름 파싱 + 하드코딩 표
```

룸 목업 쪽(`denn-mockup-tool.html:4410`)은 아예 **`pick.wcm`/`pick.hcm`만** 본다.

**정리**: `printWidthCm`/`printHeightCm`은 레거시 후보에 **포함돼 있어 하위호환은 안전**하지만,
**운영자가 실제로 값을 넣어온 필드는 `wcm`/`hcm`** 이다.

### 2.3 지금 리빌드가 `wcm`/`hcm`을 만나면

`packages/shared/src/catalog/read.ts`의 `frameSizes` allowlist는
`id, name, sub, aspect, custom, clock, printWidthCm, printHeightCm`이다.
`wcm`/`hcm`은 여기 없으므로 `recordUnknown`(`read.ts:190-194`)으로 간다 →
**`UNKNOWN_FIELD` 경고 + `extensions`에 값 보존 + 카탈로그는 정상 read**.

그리고 `projectFramePrintPhysicalSize`는 `printWidthCm`/`printHeightCm`만 보므로 **`null`**을 낸다.
P-2·P-3에 따라 **`null` = 인쇄 미생성**이다.

> **결과**: 발행 카탈로그에 `wcm`/`hcm`이 들어 있다면, 운영자가 **이미 정확한 실물 치수를 입력해
> 두었는데도 리빌드는 인쇄를 만들지 않는다.** 이는 fail-closed로서 안전하지만, 운영자에게는
> "예전엔 되던 게 안 된다"로 보인다.

**NOT VERIFIED**: 실제 `published/state.json`에 `wcm`/`hcm`이 몇 개나 들어 있는지는 **확인하지
않았다**(실제 network 금지). 6개 **기본 사이즈**(`denn-admin.html:852`)에는 `wcm`/`hcm`이 **없고**
`sub:'21×29.7 cm'` 텍스트만 있다 — 즉 **기본 사이즈는 전부 `null`이 확실**하고, 커스텀 사이즈만
값을 가진다.

**→ STOP 2 (아래 §6).**

---

## 3. ★ 레거시 사이즈 "수정"이 cm을 저장하지 않는다

`denn-admin.html:1668-1681`, `confirmEditSz`:

```js
sz.name=v('s-name')||sz.name;
sz.sub =v('s-sub') ||sz.sub;
var w=parseFloat(v('s-wcm'))||1, h=parseFloat(v('s-hcm'))||1;
sz.aspect=w/h;                 // ← aspect만 갱신
… // sz.wcm / sz.hcm 대입이 없다
```

`addSz`는 `wcm`/`hcm`을 쓰는데 **`confirmEditSz`는 쓰지 않는다.** 결과:

- **기본 사이즈를 수정하면** cm은 여전히 없고 `aspect`만 바뀐다 → 리빌드에서 영원히 `null`
- **커스텀 사이즈를 수정하면** `aspect`는 새 값, `wcm`/`hcm`은 **옛 값** → **조용한 불일치**

게다가 폼을 채우는 `editSz`(`:1645-1653`)는 저장값이 없으면 **`sub` 문자열을 정규식으로 파싱**하고,
그것도 없으면 **`wcm=21, hcm=21*aspect`를 만들어 넣는다**:

```js
var subMatch=sz.sub&&sz.sub.match(/([\d.]+)[×x]([\d.]+)/);
if(subMatch){wcm=parseFloat(subMatch[1]); hcm=parseFloat(subMatch[2]);}
else if(sz.aspect){wcm=21; hcm=(21*sz.aspect).toFixed(1);}
```

운영자가 이 **날조된 기본값**을 그대로 두고 "수정 완료"를 누르면 → `aspect`만 그 값으로 덮이고
cm은 저장되지 않는다. **A4가 아닌 사이즈에 21cm 폭이 전파되는 경로**다.

이것이 스펙 032가 NOT TESTED로 남긴 **"`aspect`와 cm 비율 불일치"** 의 실제 발생 원인이다.
새 UI는 이 동작을 **재현하면 안 된다**.

---

## 4. 새 UI가 만족시켜야 하는 계약 (스펙 032 기준)

`packages/shared/src/catalog/read.ts`의 `validatePrintSizeCm`이 이미 고정한 것:

| 규칙 | UI가 해야 할 일 |
| --- | --- |
| **all-or-nothing** | 한쪽만 채운 상태로 **저장을 막아야 한다**. 통과시키면 카탈로그 read가 **fatal**이 되어 카탈로그 전체가 못 읽힌다 |
| finite · `> 0` · `<= 500` | 입력 단계에서 거부. clamp·반올림 금지(read가 clamp하지 않는다) |
| 둘 다 없음 = 유효 | "미입력"은 오류가 아니라 **"아직 인쇄 불가"** 로 보여야 한다 |
| 이름·`sub`·`aspect`·`w`/`h` 추론 0 | **자동 채움(prefill) 금지.** 레거시 `editSz`의 `sub` 파싱·`21` 기본값을 재현하면 P-2 위반 |

### 4.1 ★ 한쪽만 입력한 중간 상태가 제일 위험하다

read는 half-declared를 **fatal**로 본다(`INVALID_NUMBER`). 즉 운영자가 폭만 입력하고 저장하면
**그 카탈로그는 통째로 읽히지 않는다** — 목업툴 전체가 죽는다.

따라서 UI는 **"저장 전 검증"이 아니라 "저장 자체를 차단"** 해야 하고, 이는 스펙 031에서
**빌더 시험 빌드**로 입력을 거부한 것과 같은 규율이다. 재구현하지 말고 **`readLegacyCatalog`를
후보 문서에 실제로 돌려보는 방식**이 후보다(§5 A안).

### 4.2 `sub`와의 관계

레거시는 `sub`를 **자동 생성**했다(`w+'×'+h+' cm'`). 새 UI에서 cm과 `sub`가 **각각 편집 가능하면
둘이 어긋난다** — 그리고 P-2에 따라 `sub`는 인쇄에 **영향이 없으므로**, 어긋나도 아무도 모른다.
`sub`를 cm에서 파생시킬지, 완전히 분리할지는 **제품 결정**이다.

**→ STOP 3 (아래 §6).**

---

## 5. 저장 경로 후보 (읽기 전용 비교, 선택하지 않음)

| | A. 검증만 (쓰기 없음) | B. 로컬 전용 초안 | C. 실제 `admin/state.json` 쓰기 |
| --- | --- | --- | --- |
| 범위 | 후보 문서를 `readLegacyCatalog`로 시험 read해 **판정만** | 브라우저 로컬(IndexedDB/LS)에 초안 저장 | Firebase Auth + Storage write |
| 새 표면 | 없음 (기존 `@denn/shared`) | 로컬 persistence 계층 | **인증 + 쓰기 + 리비전 + 발행** |
| CLAUDE.md §1.3 자동 진행 | 가능 | 가능 | **금지** (Firebase/Rules) |
| 실효성 | 운영자가 값을 **남길 수 없다** | 기기 밖으로 안 나감 | 실제 운영 반영 |
| 위험 | 낮음 | 중간 (제약 5 `__opRev` 규율과 충돌 가능) | 높음 (제약 2·3·6 전부 관여) |

**Claude는 고르지 않는다.** 다만 A는 **범위가 작고 되돌리기 쉬우며**, B/C가 어떤 형태가 되든
"저장 전에 계약을 실제로 통과시킨다"는 부분은 **재사용된다** — 즉 A는 B/C의 **부분집합**이다.

---

## 6. STOP — 결정이 필요한 것

| # | 항목 | 누가 |
| --- | --- | --- |
| **STOP 1** | 리빌드 admin에 **인증·쓰기·발행**을 이번에 도입할지, 아니면 **쓰기 없는 검증 단위**로 쪼갤지. 도입한다면 Firebase 표면이라 **자동 진행 금지**이고 별도 승인이 필요하다 | **Founder** |
| **STOP 2** | 기존 `wcm`/`hcm`을 **어떻게 다룰지**: ① `printWidthCm`/`printHeightCm`으로 **마이그레이션**, ② `wcm`/`hcm`도 **read가 인정**, ③ **무시**하고 운영자가 재입력. ②는 P-2의 "명시 필드"에 부합하지만 **필드가 둘이 되고** 불일치 시 우선순위 문제가 생긴다 | **Founder + Codex** |
| **STOP 3** | `sub` 텍스트를 cm에서 **파생**시킬지, **독립 편집**으로 둘지 (어긋나도 인쇄에는 영향 없음) | **Founder** |
| **STOP 4** | 저장 경로 A/B/C 택일 (§5) | **Codex** |
| **STOP 5** | 레거시 `confirmEditSz`의 cm 미저장·`21` 기본값 prefill을 **명시적으로 재현 금지**한다고 스펙에 남길지 | **Codex** |

---

## 7. 조사 범위와 한계

- **읽기 전용**이다. 파일 수정 0, 실행한 명령은 read/grep/git 조회뿐이다.
- **NOT VERIFIED**: 실제 `published/state.json`·`admin/state.json`의 내용(실제 network 금지).
  `wcm`/`hcm`이 실제로 몇 건 존재하는지 모른다.
- **NOT VERIFIED**: 레거시 admin의 사이즈 편집 UI를 **실행해 보지 않았다**. 근거는 전부 소스다.
- 스펙 032에서 확정된 P-1·P-2·P-3·P-4a·P-5·P-6과 선행 스펙 029/030/031 확정분은 **뒤집지 않았다.**
- **C-1(인쇄 좌표 방법 A/B/C)** 은 이 조사의 대상이 아니며 여전히 **Codex 결정**이다.
- **조사 보고서(스펙 032 print/export)에 대한 Codex 재검토는 여전히 미완**이다. 그 재검토에서
  전제가 뒤집히면 P-2의 필드 결정도 다시 열리고, 그러면 §2·§6 STOP 2도 다시 열린다.
