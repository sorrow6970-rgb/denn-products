# 스펙 073 — space V2 persistence boundary 읽기 전용 조사

상태: **READY_FOR_CLAUDE / DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI**

## 1. 목표

스펙 072의 local issue bundle을 immutable Storage object와 immutable Firestore `spaces/{token}`로
저장하기 전에 필요한 계약·Rules·결과 미확정·reconciliation 경계를 읽기 전용으로 조사한다.

이번 단위는 구현 계약 확정이나 제품 구현이 아니다. 실제 Firebase 요청, emulator 실행, Rules/config
변경과 UI 연결을 하지 않는다.

## 2. 반드시 읽을 정본

- `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`
- `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`
- `docs/rebuild/specs/068-space-v2-local-issue-preparation-orchestrator.md`
- `docs/rebuild/specs/071-space-v2-local-issue-identity-pair.md`
- `docs/rebuild/specs/072-space-v2-local-issue-bundle-orchestrator.md`
- `docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`
- `docs/codex-claude-handoff/decisions/2026-08-21-space-v2-issue-identity-decisions.md`
- G-4 orphan 결정·조사 문서
- `storage.rules`, `firestore.rules`, `firebase.json`, `firebase.emulator.json`
- `packages/firebase/src/admin-write/**`, `packages/firebase/src/space-read/**`
- `apps/admin/src/space-v2/**`
- 설치된 Firebase SDK 관련 공개 타입·소스(읽기 전용)

## 3. 조사 질문

1. 현재 `storage.rules`에서 `rebuild-space-assets/objects/{assetId}.png`의 create/read/update/delete가
   각각 허용되는지, GG-4 목표와 무엇이 다른가.
2. 현재 `firestore.rules`의 `spaces/{token}` create가 GG-5의 approved operator UID·V2 exact outer
   keys·create-only 목표를 충족하는가. V1 create 호환을 깨지 않고 V2만 구분할 수 있는가.
3. Firebase Web SDK 공개 API로 `bundle copy → immutable asset upload → immutable spaces/{token}
   create`를 구성할 때 exact 호출·오류 경계는 무엇인가.
4. upload 명확 실패·결과 미확정·성공 뒤 Firestore 실패/거부/결과 미확정·브라우저 종료에서 asset와
   document가 어떤 상태로 남는가.
5. unique create-only path의 upload outcome을 read-only metadata/bytes로, Firestore create outcome을
   exact token/document read-back으로 판정할 수 있는가. 근거가 부족하면 `UNCONFIRMED`로 남긴다.
6. 결과 미확정에서 자동 retry·같은 경로 재업로드·새 token 발급이 왜 안전하거나 위험한지 구분한다.
7. proof asset orphan과 아직 늦게 성공할 수 있는 미판정 object를 구분할 수 있는가. 기존 G-4 정책과
   충돌하지 않는가.
8. 기존 admin-write C5 port를 재사용할 수 있는 부분과 admin state 전용이라 재사용하면 안 되는
   부분을 구분한다.
9. 필요한 최소 Rules/config/emulator/product/test 파일 후보, error code 후보, synthetic fake와 emulator
   검증표를 제시한다.
10. 다음 구현 전에 Founder가 승인해야 할 항목을 최소 질문으로 분리한다.

## 4. 필수 실패표

다음을 `PASS / FAIL / UNCONFIRMED / NOT TESTED`로 분류한다.

- upload 명확 성공 → Firestore create 성공
- upload 명확 실패
- upload 결과 미확정, object 부재 또는 exact object 존재 관측
- upload 성공 → Firestore create 명확 거부/실패
- upload 성공 → Firestore create 결과 미확정, 문서 부재/일치/불일치 관측
- 브라우저 종료·인증 만료·중복 탭
- 같은 token 또는 assetId 재사용 시도
- asset만 존재하는 orphan과 document만 존재하는 broken reference

시간 경과만으로 미판정 상태가 안전한 orphan으로 바뀐다고 단정하지 않는다.

## 5. 산출물과 허용 파일

- 신규 보고서: `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md`
- 추가 허용 문서: 이 스펙, 관련 handoff, STATE/NEXT/CURRENT/live log.

제품 코드, test, Rules, Firebase config, package/lockfile와 보호 대상은 수정하지 않는다. 문서만 일반
fast-forward commit/push한다.

## 6. 계속 금지

- 실제 Firebase/project/bucket/object/Firestore/network/live 데이터 접근
- emulator 실행, upload/write/read-back/delete, Rules/Hosting 배포
- 실제 UID 추측·기록, 운영 쓰기, URL 발급, UI 연결
- 제품 코드/test/Rules/config/package/lockfile 변경
- orphan 삭제·자동 정리, C6/backend 구현
- 자동화·반복 작업과 다음 구현 스펙 자동 시작

## 7. 종료 상태

- 조사 문서 push 후 `READY_FOR_CODEX`.
- 구현 가능성을 승인된 것처럼 기록하지 않는다.
- Rules 변경, emulator 구현 또는 persistence adapter가 필요하면 Founder 결정 질문을 분리한다.
- 전체 리빌드 진행도는 조사만으로 올리지 않는다.

### QUESTIONS

없음. 이번 단위는 읽기 전용 조사와 Founder 선택지 작성까지만 수행한다.

### DONE (Claude)

상태: **INVESTIGATION DONE / READY_FOR_CODEX / DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI**
(2026-08-24)

- Codex 문서 8개 → 문서 commit `c5f8384`. 조사 보고서·상태 문서는 그 다음 문서 commit. 둘 다 일반
  fast-forward push. **제품 commit 없음**(문서 전용 단위).
- §5 허용 범위 준수: 신규 보고서
  `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md` +
  이 스펙 + handoff + STATE/NEXT/CURRENT/live log. 그 외 변경 **0**.
- §6 계속 금지 준수: 실제 Firebase/project/bucket/object/Firestore/network/live 접근 **0**,
  emulator 실행 **0**, upload/write/read-back/delete **0**, Rules/Hosting 배포 **0**, 실제 UID
  추측·기록 **0**, URL 발급 **0**, UI 연결 **0**, 제품 코드/test/Rules/config/package/lockfile
  변경 **0**, orphan 삭제·자동 정리 **0**, C6/backend **0**, 자동화·반복 작업 **0**,
  다음 구현 스펙 시작 **0**.
- 이 단위에서 실행한 것은 저장소 안 파일 읽기와 `node_modules` 안 **설치된 SDK 타입/소스 읽기**뿐이다.

§2 필독 정본 확인: 037 · 064 · 068 · 071 · 072, 2026-08-20 replay evidence 결정,
2026-08-21 issue identity 결정, 2026-08-11 G-4 orphan 보존 결정(+ atomicity 결정),
`storage.rules` · `firestore.rules` · `firebase.json` · `firebase.emulator.json` + emulator 사본 2개,
`packages/firebase/src/admin-write/**` · `space-read/**`, `apps/admin/src/space-v2/**`,
설치 SDK(`@firebase/storage` 0.14.4 · `@firebase/firestore` 4.17.0) 공개 타입/소스.

§3 조사 질문 10개 전부 응답(보고서 §2). 요약:

1. `rebuild-space-assets/objects/**`는 `storage.rules`에 match **부재** → CRUD 전부 기본 거부.
   GG-4 목표 중 update/delete만 우연히 일치, create/read는 신설 필요.
2. `spaces/{token}` create는 `if true` → GG-5의 UID·exact keys **둘 다 FAIL**, 불변성만 PASS.
   레거시가 항상 `schema:'space-v1'`을 쓰므로 V1 무손상 V2 분기는 근거상 가능.
3. 공개 API는 전부 존재. ★ write outcome 판정에는 `getDoc`이 아니라 **`getDocFromServer`** 필요.
   `storage/unauthorized`는 "권한 없음"과 "이미 존재"를 구분하지 못한다.
4. upload-first 5개 종착 상태 + 브라우저 종료·인증 만료·중복 탭 정리.
5. 고유 create-only 경로 + size/`md5Hash`, exact outer 대조로 판정 가능하나 **UNCONFIRMED**.
6. 미확정에서 자동 retry·같은 경로 재업로드·같은 token 재create·새 token 발급 **모두 부적합**.
   안전한 것은 읽기 전용 판정 1회뿐.
7. ★ V2는 asset↔document 연결이 **암호문 안**이라 Rules가 참조 관계를 물을 수 없다 →
   **G-4 구조 A SDC′ 이식 불가**, orphan/미판정 구분 불가. 삭제 보류가 유일한 기본값이며 평문 REC
   우회는 토큰 비밀성과 충돌한다. 기존 G-4 정책(D-2=O-3)과는 충돌하지 않는다.
8. admin-write 재사용 가능 항목 10개 / 재사용 불가 항목 8개를 분리.
9. 파일 후보 5단계, error code 후보 8개, fake 검증표 10행, emulator 검증표 13행 제시(구현 0).
10. Founder 결정 질문 **JJ-1~JJ-7** 분리.

§4 필수 실패표: 20행을 PASS/FAIL/UNCONFIRMED/NOT TESTED로 분류(보고서 §3). 요구된 8개 상황을 모두
포함하며 **시간 경과만으로 미판정이 안전한 orphan이 된다고 단정하지 않았다**. asset-only orphan과
document-only broken reference는 둘 다 **FAIL**(현재 계약에서 사후 식별 불가)로 기록했다.

§7 종료 조건 준수: 조사 문서 push 후 `READY_FOR_CODEX`. 구현 가능성을 승인된 것처럼 기록하지
않았고, Rules 변경·emulator·persistence adapter가 필요한 지점은 전부 Founder 결정 질문으로 분리했다.
**전체 리빌드 진행도는 조사만으로 올리지 않았다 — 78~81% 완료 / 19~22% 잔여, 변동 없음.**

