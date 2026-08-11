# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` (보완 라운드 1 적용 완료)
active_unit: `spec-037-candidate-admin-write-atomicity-investigation` (읽기 전용 조사)
fix_round: 1 / max 3

**스펙 036은 DONE이다.** 스펙 037 **후보** "운영자 저장 원자성·충돌 방지 계약" 조사 초판(`768eecf`)에
Codex가 **CORRECTION_REQUIRED**를 냈고, 지적 5건을 **문서 전용**으로 정정했다.
**제품 구현도 계약 확정도 하지 않았다.**

> **★ 아직 `FOUNDER_DECISION_REQUIRED`로 넘기지 않는다.**
> **이 정정이 Codex 검수를 통과한 뒤에만 Founder G-1~G-5 결정을 요청한다.**

보고서: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`

## 1. 보완 라운드 1에서 정정한 5건

| # | 초판의 결함 | 정정 |
| --- | --- | --- |
| **1** | Storage Rules에 "객체가 없을 때만 생성"하는 문서화된 방법이 **없다/UNCONFIRMED**라고 적음 | **틀렸다.** 공식 Rules 참조가 불변성 강제 예로 **`allow write: if resource == null;`** 을 명시한다. 주장 **삭제**, 근거로 §5.1 기록. `rules-conditions`의 `resource` 정의("the file that **currently exists** at the request path")로 **교차 확인**. §4.1에서 참조 페이지 취득 기록도 정정 |
| **2** | "콘텐츠 업로드와 revision metadata는 **반드시** 별개 요청"이라 단정 | **틀렸다.** `uploadBytes(ref, file, metadata)`의 custom metadata는 **같은 업로드 동작**에 실린다(`index.esm.js:1807-1821` multipart body 첫 파트 / `:1865-1876` resumable 세션 시작 body). **`updateMetadata()`를 따로 부를 때만** PATCH가 별개. **단 CAS는 생기지 않으므로 "조건부 덮어쓰기 없음" 결론은 유지** |
| **3** | 원자성을 UNCONFIRMED라 하면서 "둘 다 통과한다"고 단정(자기모순) | 단정·결정적 타임라인 **삭제**. 남긴 사실 = **"고정 경로 `rev+1` 검사가 CAS처럼 동작한다는 보장을 공식 문서에서 찾지 못했다"**. **C3 = `NOT PROVEN / UNCONFIRMED`**. `resource == null` 불변성과 고정 경로 CAS를 **별개 문제**로 분리 |
| **4** | C5가 **이중 트랜잭션**이라 모순(예약이 head를 바꾸면 커밋 실패, 안 바꾸면 같은 N 중복 예약) | **A~H 단일 트랜잭션 후보**로 재분석(§6.4). **확정하지 않는다** |
| **5** | C6을 "PASS"로 표기 | **메커니즘 VERIFIED**(412 보장) / **DENN end-to-end 구조 NOT DESIGNED·NOT VERIFIED**로 분리 |

## 2. 정정 후 결론

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 확인되지 않았다.**
- **기존 client-only + 현재 Rules로 E3-strong이 보장된다는 근거는 없다.**
- **따라서 F-E에 따라 쓰기 구현은 계속 차단한다.**
- **C5와 C6은 추가 권한이 필요한 후보이며 아직 Founder 선택이나 Codex 구조 승인을 받지 않았다.**
- **조사 정정 후에만 Founder G-1~G-5 결정을 요청한다.**

## 3. Codex가 확인할 것 (문서 범위)

- 정정 5건이 **보고서·상태 문서에 정확히 반영**됐는지
- **삭제되어야 할 단정**이 남아 있지 않은지 — "Rules는 동시 요청을 직렬화하지 않는다",
  "둘 다 반드시 통과한다", "반드시 별개 요청", "객체 부재 판정 수단 없음", "C6 PASS"
- **C3 판정이 FAIL이 아니라 `NOT PROVEN / UNCONFIRMED`** 인지, 그럼에도 **차단 유지** 결론인지
- **C5가 A~H 단일 트랜잭션**이고 **PASS·승인 구조로 확정되지 않았는지**,
  cross-service 원자성이 아니라 **immutable-first + 단일 가변 head** 가 안전 근거로 적혔는지
- 변경이 **허용 문서 5개**로 한정됐는지, 과거 라이브 로그가 **보존**됐는지
- 그 뒤 **보완 라운드 1 승인 여부 판단**

## 4. 계속 금지

제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·`pnpm-workspace.yaml` 수정 ·
`storage.rules`/`firestore.rules`/`firebase.json` 수정 ·
쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 **구현** ·
실제 Firebase/network/live/emulator/운영 데이터 접근 · Rules/Hosting/배포 ·
`packages/firebase/src/index.ts` 루트 배럴 수정 · 신규 의존성 ·
force push·merge·rebase·`reset --hard` · 새 자동화나 반복 작업 ·
**스펙 037 구현 계약·제품 코드 작성** · 다음 구현 스펙 자동 착수 ·
**Founder G-1~G-5 결정 요청**(Codex 승인 전).

## 5. Codex 구조 결정 후보 (Founder 결정 후에만 의미가 있다)

**Y-1** revision 형식(**generation은 단조 증가가 아니라 카운터로 못 쓴다**) ·
**Y-2** 격리 경로 — **★ 정정 반영**: C5는 revision 번호가 아니라 **operation id / content-addressed id
기반 고유 경로**를 요구한다. 단일 고정 경로를 고르면 C5가 아니라 C3(미확인) 쪽이 된다 ·
**Y-3** write port 경계(⚠️ **SDK 내부 자동 재시도**로 "retry 0"이 port만으로 보장되지 않는다) ·
**Y-4** 충돌 오류 코드(`retryable: false` + 재읽기 유도) ·
**Y-5** 합성 fake 범위(호출 순서·충돌 분기는 재현 가능, **서버 원자성·Rules 거부는 증명 불가**) ·
**Y-6** L-4 삭제 부활 tombstone(**원자성으로 해결되지 않는다**) · **Y-7** orphan 식별·보존·정리 ·
**Y-8** C3를 실제로 확인할지(실제 동시 요청 실험 = 별도 승인) 아니면 포기하고 C5/C6으로 갈지.

## 6. Founder 결정 후보 (지금 요청하지 않는다)

**G-1** `storage.rules` 변경(C5의 `resource == null` 강제 포함) · **G-2** Firestore +
`firestore.rules` 변경(현재 catch-all이 새 컬렉션을 전부 거부) · **G-3** backend/Cloud Function ·
**G-4** 비용·orphan 보존·정리 정책 · **G-5** C5 / C6 / "쓰기를 계속 열지 않는다" 택일.

## 7. UNCONFIRMED / NOT VERIFIED

- **UNCONFIRMED**: 고정 경로 `rev+1`의 CAS 보장 · 덮어쓰기 `create`에서 `resource`가 채워지는지 ·
  `/v0` 표면의 precondition 수용 여부.
- **해소됨**: "Storage Rules에 객체 부재 판정 수단이 있는지" → **`resource == null`로 해소**.
- **NOT VERIFIED**: C5·C6의 실제 동시성 동작 · `resource == null` 규칙의 실제 배포·거부 · 실제 412 ·
  브라우저 종료·네트워크 단절·인증 만료·중복 탭 실거동 · 실제 `admin/state.json` 내용 · L-1~L-4 재현 ·
  운영자 계정 실재·로그인 · 실기기 · Firestore 청크 번들 실측 ·
  `firebase.google.com/docs/reference/**` 본문(이 세션 WebFetch 미취득, 근거는 Codex 인용 + 교차 확인) ·
  `pnpm-workspace.yaml`의 `allowBuilds`(이전 단위에서 이월, 미해결).

알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않았다.
