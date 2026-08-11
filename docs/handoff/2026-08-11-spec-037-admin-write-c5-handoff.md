# 핸드오프 — 스펙 037 운영자 상태 쓰기 C5 계약 (2026-08-11)

작성: Claude Code · 기준 HEAD = origin = `dc5666d` · 브랜치 `rebuild/modern-studio`
계약: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5)
구조 결정: Codex **Z-1 ~ Z-8**
근거 조사: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`

> **문서 전용 라운드.** 제품 코드·`storage.rules`·`firestore.rules`·`firebase.json`·config·
> lockfile·`pnpm-workspace.yaml` 변경 **0**. 실제 Firebase/network/live/**emulator 실행**/운영 데이터 **0**.
> **구현 착수 0. 실제 저장 구현과 UI 연결은 이 계약이 승인하지 않는다.**

---

## 1. 한 줄 요약

**덮어쓰기를 없애는 방식으로 손실을 막는다** — Storage 객체는 **매번 새 불투명 경로에 한 번만 생성**되고,
**가변 지점은 Firestore head 문서 하나**뿐이며 그 이동만 **transaction CAS**로 보호한다.

## 2. 왜 이 구조인가

조사에서 확인된 사실이 설계를 강제했다.

- **Firebase Web SDK 공개 Storage API에 generation 기반 조건부 쓰기가 없다**
  (`@firebase/storage@0.14.4` dist 전량 grep 0건 · `generation` mapping `writable=false`).
- 따라서 **같은 경로를 두 운영자가 덮어쓰는 모델은 어떤 방법으로도 안전해지지 않는다.**
- **Rules로 고정 경로 CAS를 얻을 수 있다는 보장은 공식 문서에서 찾지 못했다**(C3 = NOT PROVEN).
- **Firestore lock만으로도 부족하다** — cross-service 원자성이 문서상 존재하지 않는다(C4 = FAIL).

> **★ C5가 안전한 이유는 cross-service 원자성이 아니다.**
> **불변 객체를 먼저 만들고 단일 가변 정본만 CAS로 옮기기 때문**이다.
> 간극에서 실패하면 **orphan + 명시적 충돌**이 되고, 남의 바이트를 덮는 일은 일어나지 않는다.

## 3. 계약의 골자 (Z-1 ~ Z-8)

| Z | 확정 내용 |
| --- | --- |
| **Z-1** | UID 제한은 **`rebuild-admin-state/**` 와 `/rebuildAdminState/head`에만**. **`op()` 본체는 건드리지 않는다**(건드리면 레거시 발행·자산 업로드까지 잠긴다). 실제 UID는 **UNCONFIRMED**, 커밋 금지, emulator는 **합성 UID** |
| **Z-2** | `rebuild-admin-state/objects/{operationId}.json` — **별도 최상위 경로**(OR 우회 구조적 차단), `operationId` = 저장 시작 시 1회 생성 **UUID**, 경로에 revision·문구·id·시간 **금지**, `resource == null` **create-only**, update/delete 금지 |
| **Z-3** | `/rebuildAdminState/head` **단일 문서**, 키 3개(`schemaVersion`/`revision`/`objectPath`)만. 최초 create는 `revision 1`, 이후는 transaction에서 `expectedBase` 일치 시 **정확히 +1**. `firestore.rules`가 **이중 강제**. **Rules가 객체 실존을 증명한다고 주장하지 않는다** |
| **Z-4** | `@denn/firebase/admin-write` 서브패스, **루트 배럴 무변경**, SDK는 **admin 전용 lazy 경계 안**, 주입 facade + 합성 fake, **저장 버튼·UI 연결 제외**, 단일 in-flight, **앱 자동 retry·merge 0**, ⚠️ **SDK 내부 재시도가 있으므로 "요청 1회"를 주장하지 않는다**, **오류 8코드** |
| **Z-5** | head 없음 → legacy를 **revision 0** 기준으로 읽기 / head 있음 → **그 객체만**, 없거나 invalid면 **fail-closed(legacy fallback 0)**. `expectedBase`는 **편집 시작 로드의 revision**으로 고정, 자동 재채택·자동 병합 0, **commit 성공 후에만** 로컬 기준 갱신 |
| **Z-6** | **로컬 emulator만**, `demo-` 프로젝트 강제, 기본 게이트와 **분리**(`*.emulator.test.ts` + `pnpm test:emulator`), **실제 Rules로 7개 시나리오**, 설치·다운로드·포트 강제 해제는 **STOP** |
| **Z-7** | **tombstone·자동 merge 도입 안 함.** 저장은 **문서 전체 CAS**, 충돌 시 전체 거부. **L-4는 별도 후속 스펙** |
| **Z-8** | **이번 스펙에서 배포 0.** 실제 UID + orphan 정책 + emulator PASS 전에는 운영 쓰기 미개방. **legacy 저장을 먼저 닫지 않는다.** cutover는 별도 승인·별도 스펙 |

## 4. ★ Emulator 사전 확인 결과 (읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

| 항목 | 결과 |
| --- | --- |
| Java | **사용 가능** — `openjdk 21.0.11 LTS` |
| firebase-tools | **사용 가능** — 전역 **15.22.4**, **저장소 의존성 아님** → lockfile 변경 불필요 |
| Firestore emulator jar | **캐시됨** `cloud-firestore-emulator-v1.21.0.jar` |
| Storage rules runtime jar | **캐시됨** `cloud-storage-rules-runtime-v1.1.3.jar` |
| Emulator UI | **캐시됨** `ui-v1.15.0` |
| Auth emulator binary | 별도 jar **없음** — 내장으로 보이나 **UNCONFIRMED** |
| 포트 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free** |

> **결론: 현재 환경은 emulator 검증을 새 설치 없이 시작할 수 있는 것으로 보인다.**
> 다만 **Auth emulator만 UNCONFIRMED**이며, 첫 실행에서 **다운로드를 시도하면 즉시 STOP**이다.

## 5. ★★ 가장 중요한 두 가지 위험

### R-1 — Rules 배포가 운영자의 유일한 저장 경로를 닫는다

`denn-admin.html:740` = `uploadDataUrl(dataUrl,'admin/state.json')`.
스펙 035 기준으로 **이것이 운영자가 상태를 저장하는 유일한 경로**다(리빌드 admin은 저장 불가).
G-1의 "legacy `admin/state.json` 읽기 전용 고정"을 배포하면 **이 저장이 서버에서 거부된다.**

**지금은 안전하다** — 이번 스펙에서 Rules를 **수정하지도 배포하지도 않았고**, UID 정본 전 배포가 차단이다.
**위험은 배포 시점에 발생하며, Z-8이 그 순서를 STOP 대상으로 못 박았다.**

### R-2 — emulator가 실제 프로젝트 id로 뜰 수 있다

`.firebaserc`의 `projects.default`가 **`denn-products`**, 즉 **실제 운영 프로젝트**다.
`--project`를 생략한 emulator 실행은 **그 id로 동작**하고, 설정이 어긋나면 클라이언트 SDK가
**실제 프로젝트로 나갈 수 있다.**

→ 계약은 **`demo-` 접두 프로젝트 id 명시를 강제**하고(예 `demo-denn-emulator`),
**emulator host 환경변수가 없으면 테스트 시작 자체를 거부**하도록 했다. `.firebaserc`는 **수정하지 않는다.**

## 6. 정직하게 남기는 경계

- **합성 fake는 호출 순서와 오류 매핑만 증명한다.** 서버 Rules의 원자성·거부 동작은 **emulator만** 보여 준다.
  두 층은 서로를 대체하지 못한다.
- **emulator는 실제 Firebase가 아니다.** 실제 Rules 배포·거부, 실제 네트워크 지연·단절, 실기기,
  운영 규모 payload는 이 스펙이 끝나도 **NOT TESTED**다.
- **Rules는 `objectPath`의 실제 객체 존재를 증명할 수 없다.** 문자열 형태만 검사한다.
  그 간극은 **읽기 fail-closed**(Z-5)가 흡수한다.
- **원자성은 L-4(삭제 부활)를 고치지 않는다.** 병합 의미론 문제이며 별도 스펙이 필요하다.
- **실제 운영자 UID는 여전히 UNCONFIRMED다.** 추측하지 않았고 예시 값을 실제처럼 적지 않았다.

## 7. 다음 단계

1. **Codex가 이 계약을 검토**한다.
2. 승인되면 **Founder가 구현 착수를 별도 승인**한다(현재 승인 범위는 계약 작성 + fake + emulator까지).
3. 구현 단위는 **port + Rules 목표 상태 + emulator 검증까지**이며 **UI 연결은 포함하지 않는다.**
4. 운영 쓰기 개방은 **실제 UID + orphan 정책 + emulator PASS**가 전부 확인된 뒤,
   **별도 cutover 스펙**에서 다룬다.

## 8. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

**force push · merge · rebase · `reset --hard` · broad delete 하지 않는다.**
