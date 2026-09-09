# 109 — 방향 검사 결과와 불변 Blob의 결속 계약

2026-09-09 / baseline `abdc191` / CONTRACT_REVIEW_PASSED(동일 Codex) / 구현 미착수.
사용자의 `응`은 NEXT의 소비자·허용판정 조사/계약 진행 지시다.

## 목표 (WHY)

108의 부분 검사 결과를 다른 파일과 섞지 않고, 검사한 바이트의 불변 사본과 함께 한 번만 인계한다.
방향정보 식별과 실제 픽셀 표시 허가는 구별한다. 이번 계약은 decoder를 만들거나 호출하지 않는다.

## 범위 (SCOPE / WHERE)

현재 문서 단계 허용7개:

- 이 파일
- `docs/codex-claude-handoff/reviews/2026-09-09-spec-109-background-evidence-owner-review.md`
- `docs/handoff/2026-09-09-spec-109-background-evidence-owner-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

계약 자체검토 후 **이 스펙의 비연결 구현 단계**에서만 여는 정확3파일:

- 수정 `apps/mockup/src/room-placement/background-file.ts`
- 수정 `apps/mockup/src/room-placement/background-file.test.ts` — 기존 API 회귀 단언만 추가, 기존 단언 완화0
- 신규 `apps/mockup/src/room-placement/background-evidence.test.ts`

104/107/108 parser,100/102,기존 fixture/E2E,제품 UI/import/barrel,설정/Rules/package/lock은 수정하지 않는다.
보호/별도dirty22는 byte hash 불변이며 stage/commit 제외. PNG 재생성 예외0.
실제사진·운영 서비스·Firebase·배포·업로드·삭제·설치·예약자동화0.

## 조사 결론과 구조 선택

[109 조사](../../codex-claude-handoff/reviews/2026-09-09-spec-109-background-evidence-owner-review.md)의 근거를 적용한다.
P2(기존 private 읽기 결과에서 검사하고 snapshot)로 정한다. P1(105 Blob을 소비자가 다시 읽기)은 채택하지 않는다.
이는 추가 읽기를 줄이는 Codex의 내부 구조 결정이며 새로운 허용 형식/방향/제품 정책 승인이 아니다.
105의 기존 API 의미를 바꾸지 않고, 같은 파일에 별도 factory를 추가한다. 사용자 주입 validator는 받지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 별도 진입점과 하위호환

새 함수 `createRoomBackgroundEvidenceJob(request: unknown, environment?: unknown)`.
입력 `{file, budget:{maxEdge}}`와 신뢰된 `{createReader}` 환경은105와 같다.
기존 `createRoomBackgroundFileJob`과 기존 결과/lease 타입·오류·호출순서 의미는 유지한다.
기존 경로는104만 호출하고108을 호출하지 않는다. 기존에104가 허용한 unknown APP1 입력을 새 정책으로 거부하면 회귀다.
새 경로만108을 호출한다.108이 내부에서104를 호출하므로 그 앞에104를 중복 호출하지 않는다.
공유 private 실행부에는 module 내부에서 고정한 모드만 넘긴다. caller의 mode/callback/사전 판정은 받거나 신뢰하지 않는다.
광범위 상태머신 리팩터0. public factory에서 request/file/budget/maxEdge/createReader getter를 각각1회만 캡처한다.

```ts
type BackgroundEvidence = Extract<BackgroundContainerResult, {ok: true}>;
type BackgroundEvidenceCode = BackgroundFileCode |
  Extract<BackgroundContainerResult, {ok: false}>['code'];
interface BackgroundEvidenceLease {
  take(): Readonly<{blob: Blob; evidence: BackgroundEvidence}> | null;
  release(): void;
}
type BackgroundEvidenceRunResult =
  | Readonly<{ok: false; code: BackgroundEvidenceCode}>
  | Readonly<{ok: true; lease: BackgroundEvidenceLease}>;
interface BackgroundEvidenceJob {
  run(): Promise<BackgroundEvidenceRunResult>;
  cancel(): void;
  dispose(): void;
}
// factory는 failure 또는 frozen {ok:true, job}. 위 코드는 TypeScript 계약 형태다.
```

run은 동일Promise/단발 읽기라는105 의미를 유지한다. 성공 결과에 별도의 blob/evidence 필드를 두지 않는다.
공개 증명서·hash·WeakMap 인증API는 만들지 않는다. 타입/동결은 악성 동일realm 코드에 대한 인증이 아니다.

### 2. 검사부터 snapshot까지의 순서

```text
size/brand/maxEdge → private FileReader 1회 → fixed ArrayBuffer 길이N 검사
 → 같은view로108 (내부104→profile→107)
 → 성공이면 같은view로 Blob snapshot 1회
 → frozen {blob,evidence}를 private 보유 → lease.take() 1회
```

검사~snapshot 사이 await/외부 callback·getter·reader 재조회0. 다른 원본을 다시 읽지 않는다.
105의 native brand·fixed/non-shared/non-resizable/non-detached ArrayBuffer·정확 길이N 검사를 먼저 유지한다.
Blob MIME은108이 식별한 format에서만 만든다. native size로 snapshot 길이N을 확인한다.
실패이면 Blob 생성/인계0,108 오류 그대로 전파. Blob 생성 실패는 기존 FILE_READ_FAILED로 반환한다.
상한은 RG-3의20,000,000bytes/40,000,000pixels와 필수maxEdge를 유지한다.
byte-copy는 snapshot1회뿐; view 생성은 복사가 아니다. parser가 원본을 보유/변경하지 않는108 계약을 전제로 한다.

### 3. 인계·취소·참조 수명

새 경로는 private joint record 하나를 보유한다. take 첫 호출은 그것을 반환하고 내부 참조를 먼저 제거한다.
take 반복은null. release/cancel/dispose가 먼저면 take는null이며 Blob/evidence 내부 참조를 함께 제거한다.
take 뒤에는 consumer 소유이며 취소/release가 이미 반환한 Blob을 회수한다는 주장은 금지한다.
cached Promise가 lease를 보유하더라도 release 뒤 별도 closure/local로 byte 참조가 남지 않도록 검토한다.
scalar metadata 반환과 내부 강한 참조 제거를 구별하며 GC 완료·프로세스 peak를 주장하지 않는다.
105의 terminal-first,동기 start 이벤트 보류,중복/late 무시,abort 최대1회,throw 정리,run 캐시를 그대로 적용한다.
새 경로도 cancel-before-run/진행중/ready후와dispose를 검증한다. 취소 후108/Blob 생성0.
단발 job이지 여러 인스턴스의 global admission은 아니다. decoder와 다중 작업 admission은 별도 계약 전0.
fake reader는 신뢰된 내부 시험 포트다. 거짓 bytes를 주는 악성 포트까지 입력 File과 같다고 보증하지 않는다.

### 4. 부분 증거와 사용 허가 분리

| 입력 상태 | 새 job 결과 후보 | 실제 decode/표시 |
| --- | --- | --- |
| JPEG/PNG profile 없음 |108과 일치하는 unavailable/null 증거+사본 | 금지, 부재를1로 채우지 않음 |
| 유효 profile에 tag 없음 |absent/null | 금지 |
| 명시 Orientation1..8 |present/해당값 | 금지, native 픽셀 검증 아님 |
| PNG eXIf 존재 |부분 구조 정보만 인계 | 금지, 오래된 metadata 의미 미확인 |
| unknown APP1/XMP·중복·순서·TIFF불량 |108 고정실패,사본0 | 금지 |
| 예산/읽기/취소 실패 |104/105 고정실패,사본0 | 금지 |

`profileValidation:'PARTIAL'`, `imageOrientation:'NOT_VERIFIED'`, `decodeAllowed:false`는 그대로다.
이번에는 새 허용판정 API도 만들지 않는다. 사진 표시가 전부 금지된 현 상태를 임의로 완화하지 않는다.
후속 native proof는8방향 비대칭 픽셀/표시치수·단일 회전 주체·허용 metadata subset·late bitmap 해제·admission을
검증한 별도 계약이 필요하다. `none`이나 가로세로 비교만으로 회전/반전 처리를 추정하지 않는다.
향후 소비자도 임의 `{blob,evidence}`를 인증된 허가로 받지 말고 내부 소유권 경로를 직접 묶어야 한다.

### 5. 명시 byte 표현 장부

N≤20,000,000. P2는 읽기 결과N+snapshotN=2N≤40,000,000bytes,104/108/107은view만 추가한다.
P1을 택했다면 소비자 재읽기N을 더해 세 표현 합3N≤60,000,000bytes가 된다.
이는 동시에 모두 살아있다는 단정도, 실제 peak 상한도 아니다. 원본/slice/native I/O/GC/픽셀/다중job은 제외다.
테스트에서 Blob.arrayBuffer()로 내용 비교하는 복사는 시험용이며 제품 경로에는 넣지 않는다.

## 검증 (VERIFY)

문서 단계: 로컬 링크, 허용7경로, 보호SHA22, diff--check, staged/Git 관계만 확인. 제품 시험 실행0.
구현 단계: 아래 unit/타입/check 및 hash를 실행한다. 기존83/108의82 등은 회귀군이며 새 PASS 수를 미리 정하지 않는다.

```text
node_modules/.bin/vitest.CMD run apps/mockup/src/room-placement/background-file.test.ts apps/mockup/src/room-placement/background-evidence.test.ts apps/mockup/src/room-placement/background-container.test.ts
node_modules/.bin/tsc.CMD --noEmit -p apps/mockup/tsconfig.json
node scripts/check.mjs
git diff --check
```

- 기존 factory API/타입 유지,104 호출1·108호출0; 새factory108호출1·내부104호출1.
- JPEG/PNG×II/MM×1..8,profile/tag부재,중복/unknown/invalid/예산실패의 동일 byte와 고정오류 확인.
- 실제108 사용+spy로 buffer identity/호출순서 확인. 검증 뒤 snapshot 전 외부call0을 source로도 점검.
- 원본 buffer 사후변경에도 인계 Blob bytes·evidence 일치. 다른 job과 혼합하지 않음, take1/release 우선/취소/late.
- get/reentrancy·invalid/native입력·read/size/snapshot 실패·같은Promise·take후 취소의 회수불가를 회귀 검증.
- default/import시 reader/URL/Image/Canvas/fetch/decode0. 제품 importer0.
- 시작 대비 customerJS/customerCSS/adminJS SHA 동일; 보호22/PNG 불변; 정확3code+7docs 외 신규diff0.

이번 구현 단계의 native browser/E2E는 **NOT TESTED**로 남긴다. 기존 canonical은 보호 PNG2를 무조건 쓰며
`scripts/e2e-run.mjs`는 CLI filter를 전달하지 않는다. 문서상 가짜 targeted 명령을 만들거나 canonical PASS로 대체0.
pure byte/owner 비연결 구현 검증만 끝내고, native 결속 시험은 보호출력 없는 별도 실행 계약에서 진행한다.
기존105 browser PASS는105 경로의 과거 증거일 뿐 새 경로의browser PASS가 아니다.

## 위험 / STOP

기존105 의미 회귀·shared state 참조잔류·중복검사·부분성공을허가로승격·예상 밖 번들/보호변경이면 STOP.
현재 범위에서 검증할 수 없는 browser/전체메모리/실제사진/운영/권한은 통과로 적지 않는다.
의존성/환경설치·새제품정책·스코프밖수정이 필요하면 다음 범위를 임의로 열지 않는다.

### QUESTIONS

이 비연결 P2 결속 계약에는 추가 Founder 선택이 없다. 기존 미검증 방향 거부 정책을 유지한다.
현재는 문서 단계이며 코드 착수 전 자체 계약 검수 결과를 남긴다. 독립 검수라고 부르지 않는다.

### DONE (Codex) — 계약 단계

P1/P2 비교와 공식 근거 확인, P2 별도factory/기존API보존/같은view검사·snapshot/쌍인계/오류·취소 계약 검토 완료.
추가 Founder 선택 없음. 다음은 위 정확3파일의 비연결 구현이며109 제품 DONE이 아니다.
문서7개만 검증·일반commit/push, 제품/시험/설정변경·실행0. 실제문서게이트 결과는 review/handoff에 기록한다.
## 구현 완료 — 2026-09-09

코드 `fecb8a4`, 정확3파일. 별도 evidence factory와 내부고정모드로 P2 검사→snapshot→쌍take1회 구현.
기존 factory/결과는104만 유지하고 unknown APP1 회귀를 추가검증했다.108은내부104 포함1회, snapshot1회.
PARTIAL/NOT_VERIFIED/decodeAllowed:false·cancel/late/참조정리 유지.같은 Codex 자체검토 CODEX_PASSED,독립검수아님.
검증: targeted259=기존owner84+신규evidence93+container82,전체unit3201=3107+94(93신규+1회귀).
format/lint324파일·7프로젝트typecheck·2앱build·diff--check PASS. 초기TS2554 합성resizable생성타입은
Reflect.construct로고쳤고 전체gate재통과.순서가뒤집힌patch는미적용후다시정확적용했다.
customerJS FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
customerCSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
adminJS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 모두기존동일.
보호SHA22/22불변. E2E/nativebrowser는계약상실행0·PNG재생성0.실제decode/회전/사진/운영NOT TESTED.
다음은보호PNG를쓰지않는opt-in native결속시험계약부터이며같은승인재질문없이루틴을이어간다.
