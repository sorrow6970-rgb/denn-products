# NEXT CLAUDE PROMPT

상태: `FOUNDER_DECISION_REQUIRED`
active_unit: `spec-037-candidate-admin-write-atomicity-investigation` (읽기 전용 조사, **완료**)

**스펙 036은 DONE이다.** 그 다음 단위로 지시된 **"운영자 저장 원자성·충돌 방지 계약 읽기 전용 조사"**
를 수행해 보고서를 push했다. **제품 구현도 계약 확정도 하지 않았다.**
다음 단위는 자동으로 시작하지 않는다. **Founder가 §2를 결정해야 진행할 수 있다.**

보고서: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`

## 1. 확정된 사실 (이 조사가 확인한 것)

- **Firebase Web SDK 12.17.1(`@firebase/storage@0.14.4`)의 공개 Storage 쓰기 API에
  조건부 쓰기(generation/metageneration precondition)가 존재하지 않는다.**
  `uploadBytes`/`uploadBytesResumable`/`uploadString`/`updateMetadata` 인자는 `ref`/`data`/`metadata` 뿐.
  dist 전량 grep에서 `ifGenerationMatch`·`ifMetagenerationMatch`·`precondition`·`etag` **0건**.
- `generation`/`metageneration`은 **`FullMetadata` 읽기 필드**이고, 내부 mapping이 `writable=false`라
  **요청 body에 실릴 수 없다**(`index.esm.js:1413-1414`, `:1505-1515`).
- 클라이언트는 **`firebasestorage.googleapis.com/v0`** 로 가고, `ifGenerationMatch`가 문서화된 곳은
  **`storage.googleapis.com` GCS JSON API**다. 두 표면은 다르다.
- **Storage Rules만으로 strong atomicity는 안 된다** — Rules는 요청별 술어라 같은 base의 동시 제출을
  둘 다 통과시킨다. `create`="file contents", `update`="pre-existing file **metadata**",
  `request.resource`는 **generation/metageneration/etag 제외**.
- **Firestore lock만으로도 안 된다** — cross-service 원자성이 공식 문서에 없다.
- **열린 길은 C5(Firestore head + immutable 객체) / C6(backend + GCS JSON API) 둘뿐이며,
  둘 다 아직 승인되지 않은 권한을 요구한다.**
- **결론 분류 = "현재 근거로는 보장 불가능" → 쓰기 구현을 열지 않는다. F-E는 해제되지 않았다.**

## 2. Founder가 결정해야 하는 것 (승인된 적 없음)

| # | 항목 |
| --- | --- |
| **G-1** | `storage.rules` 변경 승인 여부 |
| **G-2** | Firestore 사용 + `firestore.rules` 변경 승인 여부 (현재 catch-all이 새 컬렉션을 전부 거부) |
| **G-3** | backend / Cloud Function 승인 여부 (저장소에 함수 기반 **전무**) |
| **G-4** | 운영 비용·복구 정책 (Firestore 과금, revision 객체 누적, **orphan 정리 주체·주기**) |
| **★ G-5** | **C5(Firestore) / C6(backend) / "쓰기를 계속 열지 않는다" 중 택일** |

`G-5`에서 "열지 않는다"를 고르면 운영자는 계속 레거시 admin에서 저장한다(스펙 035가 남긴 현 상태).
**그것도 정당한 선택지다.**

## 3. Codex 구조 결정 후보 (Founder 결정 후에만 의미가 있다)

**Y-1** revision 형식(**generation은 단조 증가가 아니라 카운터로 못 쓴다**) ·
**Y-2** 격리 경로 — **경로 형태와 원자성 전략을 함께 정해야 한다**(단일 고정 경로면 C5 불성립) ·
**Y-3** write port 경계(⚠️ **SDK 내부 자동 재시도** 때문에 "retry 0"이 port만으로 보장되지 않는다) ·
**Y-4** 충돌 오류 코드(`retryable: false` + 재읽기 유도가 자연스럽다) ·
**Y-5** 합성 fake 검증 범위(**동시성 재현은 가능, 서버 원자성 증명은 불가**) ·
**Y-6** L-4 삭제 부활 tombstone(**원자성으로 해결되지 않는다**) · **Y-7** orphan 식별·정리 규칙.

## 4. 계속 금지

제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·`pnpm-workspace.yaml` 수정 ·
`storage.rules`/`firestore.rules`/`firebase.json` 수정 ·
쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 **구현** ·
실제 Firebase/network/live/emulator/운영 데이터 접근 · Rules/Hosting/배포 ·
`packages/firebase/src/index.ts` 루트 배럴 수정 · 신규 의존성 ·
force push·merge·rebase·`reset --hard` · 새 자동화나 반복 작업 · 다음 구현 스펙 자동 착수.

## 5. UNCONFIRMED / NOT VERIFIED

- **UNCONFIRMED**: Rules 평가와 object write의 원자성 · 덮어쓰기 `create`에서 `resource`가 채워지는지 ·
  Storage Rules의 "객체 부재" 판정 수단 · `/v0` 표면의 precondition 수용 여부 ·
  `docs/reference/js/storage*`·`docs/reference/security/storage` 본문(JS 렌더링, 미취득 — 설치된
  `storage-public.d.ts`로 대체).
- **NOT VERIFIED**: C5·C6의 실제 동시성 동작 · 실제 412 · Rules 실제 배포·거부 ·
  실제 `admin/state.json` 내용 · L-1~L-4 재현 · 운영자 계정 실재·로그인 · 인증 만료·갱신 · 실기기 ·
  Firestore 청크의 실제 번들 영향 · `pnpm-workspace.yaml`의 `allowBuilds`(이전 단위에서 이월, 미해결).

알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않았다.
