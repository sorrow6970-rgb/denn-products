# Spec094 — C5 실패 복구 안내 검수

2026-09-07. CODEX_PASSED / LOCAL_VERIFIED / F-9 RESOLVED. 동일 Codex 구현·검수이며 독립 검수가 아니다.
[계약](../../rebuild/specs/094-admin-c5-recovery-guidance.md),
[제품](../../../apps/admin/src/admin-write/FramePrintSizeEditor.tsx),
[단위](../../../apps/admin/src/admin-write/FramePrintSizeEditor.recovery-message.test.tsx),
[E2E](../../../tests/e2e/admin-write-pending-error.spec.ts).

## 변경과 안전성

save-error에서 기존 snapshot.canSave를 그대로 사용해 재저장 허용 시 `변경 저장`, 불가 시
`편집 기준 불러오기`를 안내한다. 버튼·권한·onClick·role/status·자동 retry/merge·controller/port 변경0.
신규 단위는 오류6종의 문구/버튼 상태, 기존3상태의 문구, 렌더 중 load/save/setDraft 호출0을 검증한다.
SSR이 서버 또는 복구 동작을 증명하지는 않는다. 기존 E2E 복구·late-auth 단언은 그대로이며 기대 문구2개만 변경.

## 검증 결과

- `node scripts/check.mjs` exit0: format/lint295파일,7개 package/app typecheck, unit95파일2526/2526(3.39초),build PASS.
  기존2517+신규9=2526. 새 의존성/설치0. 기존 chunk 크기 경고는 유지된다.
- `node scripts/e2e-run.mjs` canonical1회, 명령 exit0, 실행267 tests, `.last-run.json` passed/failedTests[] 확인.
  도구 출력이 잘려 앱의 해당 명령 실행 기록에서 완료/exit0/56,626ms를 재확인했다.
  56.626초는 빌드 포함 전체 명령 시간이며 Playwright 자체 소요시간/말미 상세 집계는 확인 불가.
  테스트를 다시 실행하거나 timeout/worker/retry를 변경하지 않았다. 설정상 retry0.
- [측정18건](../../rebuild/results/spec-093/measurements.json) 모두 measured PASS. 활성12/비활성78개 별도 집계.
  overflow/활성44px 미만/axe serious·critical/console error·warning·pageerror/외부요청 시도0.
  PNG18개와 측정SHA 불일치0. 실제 Firebase 요청 대신 localhost 합성 포트를 사용했다.
- 고객 `index-LpX-FRZg.js` SHA256 `2E70F01BA9DC341D10B158587BB30EE8075A2EDE7E66B716BC67903432B2B28E` 불변.
  운영자 `index-C5iqMAWP.js` SHA256 `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`.
  운영자 entry 변경은 문구 수정에 따른 것이다. build 크기는294.87kB/gzip91.38kB.
- ports4183/4184/4185/8080/9099/9199 listener0. 이번 staging `denn-e2e-eUpy5K` 부재.
  전역 Win32_Process 읽기는 권한 거절되어 재시도/우회하지 않았다. 다른 프로세스 종료0.
  실행 완료는 앱의 작업별 명령 기록, 잔류는 포트와 해당 staging 검사로 확인했다.

## 시각 — 변경6개 모두 직접 열람

제품 Card 합성 캡처이며 전체 운영 화면/실사용자 테스트가 아니다.
[현재 PNG 목록 및 SHA](../../rebuild/results/spec-093/README.md).

| 상태 | 320x568 | 390x844 | 1280x800 |
|---|---|---|---|
| upload-failed |288×571 PASS|358×494 PASS|560×450 PASS|
| head-failed |288×571 PASS|358×494 PASS|560×474 PASS|

문구가 실제 활성 버튼을 지칭한다. 320px에서 문장이 여러 줄이지만 누락·겹침·가로 잘림은 발견하지 못했다.
head 실패 desktop 높이450→474는 문구 한 줄 증가에 따른 흐름이며 오류로 판정하지 않았다.
좁은 화면의571px 카드는 세로 스크롤이 필요한 상태로, viewport568px 초과 자체를 가로 overflow로 세지 않는다.
head 실패의 재로드는 기존 초안 폐기 확인을 거친다. 이 안내가 자동 폐기/자동 재시도 권한을 부여하지 않는다.
실제 사용자 이해도·스크린리더 낭독·실기기·실인증/서버 CAS/운영 복구는 NOT TESTED.

## 범위·보호

기존 결과/보호100개 baseline 중90개 hash 동일. 변경10=허용6PNG+JSON+README8 및 canonical 예외 spec018PNG2.
093 나머지12PNG,092/084 포함 다른 기존 증거는 byte 동일. 보호20개 중18동일, PNG2만 재생성.
spec018 desktop `D6D12495B5264B002803A4EA48AA66162362B16A6C730B02BC577DECC1B97DAE`
→`BDB7EAD2E8F5A82746236D68474D215678823CF168D5141075B1D19E0A4C163D`.
spec018 mobile `1103D366D28B33D07411CB34942FFBDC32E8C82F44AC00324BAAD1C4EAB84374`
→`12DD3C80AF6884A22AC50F987111AA70C35595F5132D4D83B1D434421FF423B2`.
둘 다 restore/stage/commit0. README에094 이력 링크를 추가한 것은 동일 허용8개 안의 문서 변경이다.
코드/증거11=제품1+신규unit1+기존E2E1+증거8. 종료9=094계약/검수/handoff3+상태4+093검수/handoff2.
기존 roadmap/spec091handoff2, 보호/user dirty는 이번 변경·커밋에서 제외한다.
packages/Rules/config/package/lockfile/fixture/controller 새 diff0, `.gitignore` 변경0, diff--check PASS.

## 한계와 다음 경계

093 F-9는 이 제한된 문구 보완으로 해소. 운영 전환·실제 UID·삭제·발행·배포·자동화 승인/실행0.
전체85~88%는 기존 관리 추정 유지(실측 아님), 잔여100-88=12~100-85=15%. 최종 스펙 수/완료일 확인 불가.
룸/가이드/주문·카카오/전체 catalog·발행을 완료로 계산하지 않는다. 다음은 잔여 기능과 승인 경계의
읽기 전용 대조가 가능하며, 새 제품 의미나 첫 출시 범위 선택 전 다음 제품 구현을 확정하지 않는다.
