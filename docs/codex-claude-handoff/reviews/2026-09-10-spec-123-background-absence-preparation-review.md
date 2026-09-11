# 123 준비 컨트롤러 연결 계약 검토

123 전송 완료: code641b13c/docs67cf184 일반push,HEAD=origin67cf184·0/0 확인.
최종 기록1회 전송 뒤 Git확인. 123 DONE/CODEX_PASSED 유지,다음합성native계약검토는별도단위.

## 최신 — 2026-09-11 구현 자체검수 CODEX_PASSED

코드641b13c. 아래9월10일 계약검토는 이력이며 현재 구현 판정은 이 절이다. 동일 Codex 검수,독립검수 아님.
정확 신규port/test2 외 기존100/119/121/112,UI,Rules,config,package/lockfile 변경0.

- [새port](../../../apps/mockup/src/room-placement/background-absence-preparation-port.ts):
  work.start 예약 뒤lazy file getter 안lookup,identity 불일치는file 이전차단. 각 getter뒤종료체크,
  finally snapshot 제거. cancel 선등록→재진입dispose 기록→task 반환뒤cancel로 callback 재등록을 막는다.
  complete 이전종료처리,callback 예외에lease해제,fail에는인자0. 기존121 치수-onlylease와blocked 유지.
- [새시험](../../../apps/mockup/src/room-placement/background-absence-preparation-port.test.ts):
  신규63. actual100+119+121+112에 합성reader/decoder만 주입. BUSY lookup0,late해제,
  controller.clear lookup중read1가능/port.dispose read0,공동dispose,port단독종료한계,
  기존100cap1,000,000 초과거부,source/identity/복사정보 경계 검증.
- targeted209/209,check unit3528/3528(기존3465+신규63),116파일,
  format/lint351·typecheck7·build2 PASS. Chromium회귀46+12=58 PASS.
  초기시험수집getter오류 및string index타입오류2건은 신규시험 안에서 수정 후전체check PASS.
- 새portnative는 NOT TESTED. 회귀58은 기존115/122 등 경로이며 새123native 증명이 아니다.
  일반사진·UI·운영·배포 권한 추가0. 기존116 PNG14불일치는 미해결.
- 보호/사용자23 SHA불변,예상밖변경0,diff--check PASS,자기temp2부재,포트4183/4184/4185 listen0.

기본 빌드 SHA-256 (시작값=검증후값):

| 파일 | SHA-256 |
|---|---|
| mockup `index-jnlo-lEH.js` | FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A |
| mockup `index-DEnCZ-27.css` | 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81 |
| admin `index-C5iqMAWP.js` | B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 |

기본 앱에123이연결되지않은상태를유지했다. 위해시/시험은실사진방향·메모리상한·운영안전증명이아니다.

## 2026-09-10 계약검토 이력

2026-09-10 / HEAD=origin7e7a42d / 동일 Codex 자체검토,독립검수 아님.
판정: **CONTRACT_REVIEW_PASSED / IMPLEMENTATION_NOT_STARTED / NOT TESTED**.
[123 계약](../../rebuild/specs/123-background-absence-preparation-port.md).

## 코드 근거와 계약에서 해소한 조건

| 근거 (7e7a42d 기준) | 확인된 사실 / 새 계약의 처리 |
|---|---|
| [121 start](../../../apps/mockup/src/room-placement/background-absence-decode.ts#L51) | admission 예약은119 factory보다 먼저다. private lazy request의file getter 안에서lookup하면예약전파일조회없이연결가능 |
| [119 캡처](../../../apps/mockup/src/room-placement/background-file.ts#L145) | file→budget→maxEdge 읽기.123이슬롯안에서한번캡처한plain snapshot으로전달,기존121확장불필요 |
| [121 lease](../../../apps/mockup/src/room-placement/background-absence-decode.ts#L89) | frozen치수/release만1회인계.114일반producer로옮기며물리작업슬롯을중복생성할필요없음 |
| [100 run](../../../apps/mockup/src/room-placement/preparation.ts#L260) | frame capture/source gate가background start보다선행.기존100을unit에서직접주입해순서검증가능 |
| [100 start handle](../../../apps/mockup/src/room-placement/preparation.ts#L315) | handle은start 반환후에야포착.lookup내controller.clear는read0보장대상이아님을명시 |
| [100 dispose](../../../apps/mockup/src/room-placement/preparation.ts#L384) |100 frame/session과새port work는별도소유.공동폐기순서고정,port만dispose해전체종료됐다고주장금지 |
| [100 치수](../../../apps/mockup/src/room-placement/preparation.ts#L89) |기존1,000,000상한.121의파일예산과동일한제한이아니며넘으면기존100이거부·해제 |

링크의라인은검토기준커밋의위치다. 위내용은구현정적해석이며새123을실행해증명한것이아니다.

핵심결정: 별도123 port,신뢰된identity→request 동기조회,예약안단일snapshot,종료추적선등록,
치수-only단발인계,양쪽공동dispose. 일관된identity매핑은공급자책임이며같은참조만으로악성공급자를인증하지않는다.
기존114코드를무조건복사하면start중dispose와콜백추적의순서를새요구에맞게보장하기어렵다.
새port에서는cancel상태를start전에만들고,반환뒤종료를재확인하는검증을필수로고정했다.
기존114결함을재현했다고주장하거나그코드를수정하지않는다.

## 권한·검증 구분

이번에는문서7만작성. 제품·Rules·config·test·package/lockfile 변경0,시험실행0,외부조회0.
기존121·122 PASS는과거실측으로만유지. 새통합/native/실사진/실기기/운영 NOT TESTED.
123의새Founder선택은없고,구현범위는신규port/test2개로계약에고정했다.
commit/push/stage는이번검토에서수행하지않는다. 중요권한확대없는후속구현은기존루틴범위에서진행가능하나
이번요청을구현실행으로확대하지않는다.

## 문서 변경 검증

문서7개만신규변경,기존보호·사용자23개 SHA-256 모두동일,예상밖변경0.
git diff --check PASS,staged0,HEAD=origin7e7a42d·ahead/behind0/0.
예정된신규port/test2개는실제파일부재확인. 이는구현미착수확인이지unit/native PASS가아니다.
