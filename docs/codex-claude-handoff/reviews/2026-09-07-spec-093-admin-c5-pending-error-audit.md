# Spec 093 — C5 진행·오류 합성 감사 결과

2026-09-07, 기준 HEAD=origin `cca5a16`, rebuild/modern-studio.
**AUDIT DONE / CODEX_PASSED / LOCAL_VERIFIED / UI FINDING 1**. 같은 Codex 구현·검토이며 독립 검수 아님.
제품 UI 전체 PASS나 실제 서버 보장을 뜻하지 않는다.
시험 전용fixture/test/합성증거22파일 `1e322c1`, 별도 종료8문서(092전송영수증포함).
092명시전송승인은cca5a16까지성공했으며093새payload의push는아직시도하지않고범위승인대기다.

## 실행과 근거

- [093 계약](../../rebuild/specs/093-admin-c5-pending-error-audit.md),
  [test-only fixture](../../../apps/admin/src/e2e/admin-write-fixture.tsx),
  [신규 E2E](../../../tests/e2e/admin-write-pending-error.spec.ts).
- [18PNG·provenance·SHA 목록](../../rebuild/results/spec-093/README.md),
  [원시 측정](../../rebuild/results/spec-093/measurements.json).
- `node scripts/check.mjs` exit0: format/lint/7개 package·app typecheck/unit/build PASS,
  unit94파일2517/2517(2.79초). 기존500kB chunk 경고만 유지.
- `node scripts/e2e-run.mjs` 한 번, exit0, **267 passed / failed0 / skipped0 / retry0 (50.2초)**.
  기존246+6상태×3viewport18+late2+manifest1=267. 재실행/timeout/worker/허용차 변경0.
- opt-in `?audit=spec093`만 추가 진단/응답 제어를 노출한다. 실제 SDK/Auth 요청이 아니라 기존
  composition의 주입 포트와 observer를 사용하는 합성이다. 기본URL에는 확장 controls0·factory0 확인.
  새 production route/config/API/제품 UI·controller 변경0.

## 시각 판정 —18개 모두 직접 열어 확인

등급은 전부 PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE. 실제 editor Card의 내부 padding/border와
안내/controls 포함, 제목/auth/진단 bbox와 비중첩. 외부 shadow 전체의 픽셀 재현은 보장하지 않는다.

| 상태 | 320x568: PNG/시각 판정 | 390x844: PNG/시각 판정 | 1280x800: PNG/시각 판정 |
|---|---|---|---|
| loading |288×523 / PASS|358×470 / PASS|560×450 / PASS|
| saving |288×523 / PASS|358×470 / PASS|560×450 / PASS|
| load-error |288×523 / PASS|358×470 / PASS|560×450 / PASS|
| upload-failed |288×571 / PASS|358×494 / PASS|560×450 / PASS|
| head-failed |288×571 / FINDING F-9|358×494 / FINDING F-9|560×450 / FINDING F-9|
| auth-blocked |288×524 / PASS|358×470 / PASS|560×449 / PASS|

18개 모두 글자 누락/겹침/가로 잘림은 발견하지 못했다.320px 긴 안내의 어절 줄바꿈과 세로 버튼 흐름은
전체 문구가 보이며 정상 스크롤과 구분한다.571px 카드가568px viewport보다 길다는 이유만으로 결함으로 세지 않는다.
auth 만료는baseline null로 돌아가지만 기존 치수 텍스트22/30은 비활성input에 남는다.
이는 현존 local UI 상태 관찰이며, 이번 계약은 텍스트 삭제 정책을 도입하지 않는다.

### F-9 — P2: head 실패의 복구 안내가 재저장 가능 상태와 구별되지 않음

확인 사실: FramePrintSizeEditor의 save-error 문구는 항상
“저장하지 못했습니다. 상태를 확인한 뒤 명시적으로 다시 시도하세요.”다.
session-controller derive는 WRITE_UPLOAD_FAILED에서만 canSave=true, WRITE_HEAD_FAILED에서는 false다.
따라서head-failed3개 화면에는 같은 재시도 문구·잠긴 저장 버튼·활성 불러오기만 보인다.
E2E는 이 상태에서 불러오기→폐기확인→명시 폐기/reload만 성공하는 현재 계약을 검증했다.

해석: 사용자가 어느 버튼으로 복구해야 하는지 모호할 수 있어 P2 문구 finding으로 분류한다.
실제 사용자 혼동 발생률은 NOT TESTED다. 동작 오류/데이터 손실/서버 CAS 실패로 주장하지 않는다.
후속 후보는 **기존 canSave 분기에 맞춘 save-error 안내 두 종류 분리**다. 권한·retry/merge·controller
의미는 바꾸지 않는 작은 UI 문구 단위로, 별도094 계약 선행 후 진행한다.093 제품 수정0.

## 수치와 복구

- enabled controls: (0+0+1+2+1+0)×3=12개, disabled (5+5+4+3+4+5)×3=78개 별도 측정.
  enabled44px 미만0. Tab은12제품controls를 DOM순서대로 방문했고 focus-visible/표시·중앙가림검사 PASS.
  활성controls가0인 상태는 제품Tab0이 정상이다. 최대60순환에 fixture/auth를 별도 분류했다.
- document/Card overflow0, axe serious/critical0, console error/warning/pageerror0, 외부 요청 시도0.
  합성CID/오류코드/원시URL/fixture진단의 제품text/ARIA/data누출0. 데이터/실제UID를 읽지 않았다.
- 검사 전후 load/save/완료/revision/pending동일, 자동재시도0(관찰 구간). load-release→rev3,
  save-release→rev4, load-error명시reload2→rev3, upload-error명시save2/base3→rev4,
  head-error명시discard/reload2→rev3/save1. 각각3viewport로 확인, pending모두false로 종료.
- late load/save2건: auth 만료 후 보류 응답을 실제 resolve·완료counter1 확인. fake save의원격rev4여도
  UI는auth-blocked/revision none 유지. 실제 원격이아니며 늦은 성공을 실패로 추측하는 증거가 아니다.
- 실기기/스크린리더 실낭독/실제인증/서버CAS/브라우저종료/재로그인·운영쓰기/배포 NOT TESTED.

## 변경·보호와 한계

신규test1+기존fixture1+신규결과20(18PNG/JSON/README)+계약/보고서/handoff/상태7=29파일,
추가092handoff 전송 영수증1=30파일. 이전 roadmap/spec091handoff2는 이번미수정·커밋제외.
기존결과·보호80파일 중79동일, spec018 desktop1개만 알려진 canonical재생성으로hash변경.
보호20중19동일; PNG2 모두runner가재생성하나 mobile은같은hash다. 복원/stage/commit0.
092의 PNG15/README/JSON도byte동일. 실제제품/기존test/config/Rules/package/lockfile/.gitignore 변경0.
측정JSON은*.json무시규칙때문에계약상허용된정확한합성파일1개만add-f로추적했다.다른JSON추가0.

보호desktop 시작 `91572C5C544242785733F9EF82714D54667E4C2DD1362820C14C56531671F361`,
최종 `D6D12495B5264B002803A4EA48AA66162362B16A6C730B02BC577DECC1B97DAE`.
보호mobile 시작=최종 `1103D366D28B33D07411CB34942FFBDC32E8C82F44AC00324BAAD1C4EAB84374`.
고객entry SHA `2E70F01BA9DC341D10B158587BB30EE8075A2EDE7E66B716BC67903432B2B28E`,
운영자entry SHA `D868510748C60622888FE7E2D6C1B88E119700FD94F74B1D183D7065E6311D30` 모두092불변.
고객342.26kB/gzip104.86,운영자294.73kB/gzip91.36. `git diff --check` PASS.
ports4183/4184/4185/8080/9099/9199 listener0,이번staging denn-e2e-6nwSYx 부재확인. 타프로세스kill0.

전체85~88%는 기존 관리추정,잔여100-88=12~100-85=15% 유지. 이번국소감사로수치를높이지 않는다.
전체실측률/최종잔여스펙수/종료일 확인불가. 룸/가이드/주문·카카오/전체catalog/운영전환 미완범위를
이 감사로 완료처리하지 않는다. 자동화·실제Firebase·운영연결·배포는계속0.

## F-9 후속 해소 — spec094 / 2026-09-07

[094 검수](2026-09-07-spec-094-admin-c5-recovery-guidance.md), 코드·증거38257ef.
기존canSave=true이면 `변경 저장`, false이면 `편집 기준 불러오기`를 안내한다. 버튼 권한/복구동작 변경0.
check2526/2526·canonical267 tests exit0, 변경6PNG직접확인으로 제한된 문구 finding F-9를 해소했다.
위093시각표는1e322c1의수정전판정이다.현재upload/head실패6PNG·측정·README는094로갱신됐으며
나머지12PNG는byte동일.실사용자이해도/운영복구는여전히NOT TESTED,전체UI/운영승인으로확대하지않는다.
