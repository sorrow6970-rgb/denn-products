# 스펙 065 — space V2 local issuer evidence projector

상태: **READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI**

기준 HEAD: `dcd893c` (스펙 064 종료, CODEX_PASSED)

## 1. 목표

스펙 064는 `SpaceSceneV2`와 `FrameReplayEvidenceV1`의 strict parser, canonical encoder와 SHA-256
계약을 확정했다. 아직 catalog와 운영자 편집 상태에서 그 evidence를 만드는 issuer 경계는 없다.

이번 단위는 admin 앱 내부에 **호출되지 않는 local-only projector**를 추가한다. 이미 검증된 catalog
projection과 명시적인 발급 입력을 하나의 immutable V2 scene candidate로 조립하고, 첫 capability 밖
상태는 SHA-256 전에 fail-closed한다. UI, Firebase, token, encryption, upload, document create는 없다.

Founder GG-1=A~GG-6=A의 기존 결정만 사용한다. 새 제품 정책·Rules·운영 권한 결정은 만들지 않는다.

## 2. 구조 결정

### H-1 — 위치와 의존 방향

- 위치는 `apps/admin/src/space-v2/issue-candidate.ts`다.
- composition layer인 admin 앱이 기존 `@denn/shared` catalog projector와 `@denn/spaces` V2 계약을
  조합한다. `@denn/shared` 또는 `@denn/spaces`가 서로를 새로 의존하지 않는다.
- `apps/admin/package.json`에 기존 workspace package `@denn/spaces: workspace:*`만 추가하고 lockfile은
  admin importer의 최소 기계적 변경만 허용한다. 외부 dependency와 다운로드는 0이다.
- `App.tsx`와 모든 UI route에서 import/call하지 않는다. 기본 admin 앱 동작과 bundle은 그대로다.

### H-2 — 공개 입력

다음 의미의 readonly 입력을 받는다. 이름은 구현에서 더 명확하게 정할 수 있지만 의미를 넓히지 않는다.

```ts
interface SpaceV2FrameIssueCandidateInput {
  readonly catalog: CatalogDocumentV1;
  readonly selection: FramePreviewSelection;
  readonly frameOrientation: "portrait" | "landscape";
  readonly logicalWidth: number;
  readonly frameColor: string;
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
  };
  readonly proofAsset: FrameReplayEvidenceV1["proofAsset"];
}
```

- catalog geometry는 반드시 `projectFramePreviewGeometry(catalog, selection)` 결과만 사용한다. raw catalog
  field를 별도로 재해석하거나 fallback/default/clamp하지 않는다.
- `frameOrientation`, `logicalWidth`, `frameColor`, transform과 proof descriptor는 발급 호출자가 명시한다.
- proof bytes를 받거나 hash하지 않는다. `proofAsset.sha256`은 후속 asset-preparation 경계가 만든
  descriptor이며 이번 projector는 스펙 064 strict evidence validator로 형식만 재검증한다.
- token, password, email, UID, 고객 문구, URL/base64 원문, Firebase SDK object를 받지 않는다.

### H-3 — first capability fail-closed

아래 중 하나면 digest port 호출 전에 실패한다.

- catalog/selection projection 실패
- projected `textZones`가 비어 있지 않음
- projected `clockPreview`가 `null`이 아님
- `projectCatalogTemplateImage(... frame ...)`가 실제 template art를 `available`로 반환
- template image 결과가 `invalid-reference`여서 art 부재를 안전하게 증명할 수 없음
- orientation과 projected aspect 불일치
- logical width, color, transform, proof descriptor가 스펙 064 evidence 계약에 맞지 않음
- hostile/revoked/drifting getter 또는 Proxy로 안전 snapshot을 만들 수 없음

`generated-preview`와 `none`은 real template art가 없는 상태로만 취급할 수 있다. raw image value는 결과,
오류, 로그에 복사하지 않는다. text 값이 비어 있을 것이라고 추측해 text zone을 허용하지 않는다.

### H-4 — 성공 결과와 digest

- evidence는 `frame-logical-plan-v1`, caller의 explicit orientation/logical width/appearance/transform/proof,
  projected geometry, `templateArt:{kind:"none"}`, `textMode:"none"`, `clockMode:"off"`로 조립한다.
- `createFrameReplayEvidenceDigestV1(evidence, shaPort?)`를 정확히 한 번 호출한다.
- 성공 시 exact `SpaceSceneV2` candidate 하나를 반환한다. `roomCapability`는 `unsupported`다.
- 최종 candidate는 `readSpaceSceneV2`로 다시 검증된 detached 값이어야 한다. 입력 객체 참조를 결과에
  보존하지 않는다.
- 함수는 network, Firebase, crypto encryption, random UUID, Date, DOM, Canvas와 전역 상태를 사용하지
  않는다. SHA-256은 스펙 064 injected/default port만 사용한다.

### H-5 — 안전 오류

최소 오류 코드는 다음 의미를 분리한다.

- `SPACE_V2_ISSUE_INVALID_INPUT`
- `SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED`
- `SPACE_V2_ISSUE_UNSUPPORTED_CAPABILITY`
- `SPACE_V2_ISSUE_DIGEST_FAILED`

오류에는 raw catalog value, selection id, object path, digest, token, password, UID/email, customer text,
SDK message나 thrown object를 넣지 않는다. 모든 오류는 자동 retry/merge/fallback 정보를 만들지 않는다.

## 3. 허용 파일

제품·테스트:

- 신규 `apps/admin/src/space-v2/issue-candidate.ts`
- 신규 `apps/admin/src/space-v2/issue-candidate.test.ts`
- `apps/admin/package.json` — `@denn/spaces: workspace:*`만
- `pnpm-lock.yaml` — 위 workspace importer의 최소 변경만

문서:

- 이 스펙
- `docs/handoff/2026-08-21-spec-065-space-v2-local-issuer-projector-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

다른 파일이 필요하면 구현하지 말고 질문한다. 특히 `App.tsx`, CSS, Firebase/Rules/config, shared/spaces
제품 파일을 수정하지 않는다.

## 4. 필수 테스트

1. 합성 image-only single-rect catalog + explicit input이 exact V2 scene candidate를 만든다.
2. geometry 값은 raw catalog 재해석이 아니라 `projectFramePreviewGeometry` 결과와 일치한다.
3. text zone, clock, available template art, invalid art reference는 digest 호출 0으로 unsupported/failure다.
4. malformed catalog/selection, orientation mismatch, bad logical width/color/transform/proof는 digest 호출 0이다.
5. injected digest port는 성공에서 정확히 1회 호출되고 canonical evidence bytes를 받는다.
6. digest throw/reject/bad length는 raw message 없이 `SPACE_V2_ISSUE_DIGEST_FAILED`다.
7. hostile/revoked/drifting/circular input은 throw하지 않고 안전 실패하며 입력은 변형되지 않는다.
8. 결과는 detached돼 입력을 나중에 바꿔도 변하지 않는다.
9. token/password/UID/email/customer text/object path/digest/raw thrown message가 오류에 0이다.
10. V1과 스펙 064 reader/encoder/hash 회귀가 모두 통과한다.
11. `App.tsx` import/call 0, admin과 mockup bundle의 실행 동작 변화 0, network/Firebase/DOM/Canvas 호출 0.

## 5. 검증 명령과 게이트

- 신규 targeted unit
- `vitest run packages/spaces` 전체
- admin typecheck
- `node scripts/check.mjs`
- 전체 Chromium E2E **151/151 이상**; spec-018 PNG 보호 대상은 실행이 다시 써도 restore/checkout/stage/
  commit하지 않는다.
- 변경 전후 mockup customer entry name/bytes/SHA-256 동일
- admin entry도 unused module이 bundle에 들어오지 않아 변경 전후 name/bytes/SHA-256 동일
- `git diff --check`
- exact changed paths와 package/lockfile 변경이 허용 최소 범위인지 확인
- apps/admin의 허용 2개 신규 파일 외 앱 diff 0, Rules/firebase config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 test temp/debug 잔류 0

## 6. 계속 금지

- UI/UX, `App.tsx`, route, CSS, 시각 결과 생성
- token/UUID 생성, password encryption, link 발급
- Firebase adapter, Auth, Storage upload/read, Firestore create/reconciliation
- `storage.rules`, `firestore.rules`, `firebase.json`, `.firebaserc`, env/config
- 실제 Firebase/project/bucket/object/network/data/UID, emulator, deploy
- V1 migration/rewrite, viewer/open composition, asset bytes 검증
- client delete, orphan cleanup, published write, C6/backend
- 외부 dependency·다운로드·설치, 자동 retry/merge/fallback

## 7. STOP 조건

- existing projector 결과만으로 first capability를 안전하게 판정할 수 없음
- `@denn/spaces` 또는 `@denn/shared` 제품 파일 변경이 필요함
- 신규 external dependency/download가 필요함
- baseline gate가 변경 전부터 재현 가능하게 실패함
- 실제 network/Firebase/Rules/UI 또는 새 Founder 제품 결정이 필요함
- 허용 파일 밖 기존 Founder/user 변경과 충돌함

STOP이면 제품 코드를 더 수정하지 말고 근거, 재현 명령, 필요한 최소 결정을 live log와 QUESTIONS에
기록한다.

### QUESTIONS

없음. 이번 단위는 승인된 GG shape를 local composition에서 조립하는 최소 경계이며 운영 권한·UI·실제
발급 정책을 새로 결정하지 않는다.

