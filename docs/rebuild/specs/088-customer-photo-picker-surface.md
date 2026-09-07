# 088 - 고객 사진 선택 표면 정리

## 목표 (WHY)

2026-09-07 사용자 정책 정정: UI도 Codex가 디자인 아이디어를 더해 직접 구현·검증한다.
Claude 전용 구현 제한을 해제하되 운영 권한·제품 정책 결정·보호 대상 경계는 유지한다.
spec-084 F-2 중 고객 composer의 영문 native 파일 선택 표시를 한국어 작업 표면으로 정리한다.
기준 HEAD `03cd5e6`. 상태: DONE / CODEX_PASSED / LOCAL_VERIFIED. 작성·구현·검증: Codex (동일 에이전트).

## 범위 (SCOPE)

- 고객 ImageSlot만 개선. 한 줄의 선택/교체 동작, 분리된 상태, 기존 삭제 동작을 유지한다.
- 기존 Modern Studio 토큰·글꼴·radius 사용. 디자인 변화 3/10, 모션 1/10, 밀도 4/10.
  고객 작업 UI이므로 랜딩용 효과·이미지 생성·새 라이브러리·새 dark theme는 도입하지 않는다.
- 운영자 F-2, F-4/F-7/F-8, route·공유 API·데이터·Canvas·저장·인증은 제외한다.
- 실제 Firebase/network/live/emulator/운영 데이터·UID·배포·삭제·발행 금지. 로컬 합성 검증만 한다.

## 대상 (WHERE)

제품/테스트 허용 파일:

- `apps/mockup/src/preview/PreviewComposer.tsx`
- `apps/mockup/src/browse/browse.css`
- `apps/mockup/src/preview/PreviewComposer.test.tsx`
- `tests/e2e/mockup-preview.spec.ts`

문서/증거 허용:

- 이 스펙, `docs/handoff/2026-09-07-spec-088-customer-photo-picker-handoff.md`
- STATE/NEXT/CURRENT/live log
- `docs/rebuild/results/spec-088/README.md`, `photo-picker-{320x568,390x844,1280x800}.png`
- 기존 canonical이 직접 재생성하는 spec-084 `composer-ready-{1280x800,390x844,844x390}.png`,
  spec-085 `composer-workbench-{1280x800,390x844,844x390}.png` 및 두 폴더 README의 정정 절.

보호: taste-v2/**, design/README.md, spec 038, spec-018 PNG 2장, render/plan/index.ts,
pnpm-workspace.yaml, AGENTS.md. 수정·restore·stage 금지. 기존 canonical의 spec-018 재생성은 기존
검증 경계 그대로 hash 차이만 보고하며 stage/restore하지 않는다. 그 밖의 PNG 변동은 임의 정합 금지.
기존 사용자 dirty 보존. packages/admin/Rules/config/package/lockfile 변경 0.

## 구현 지시 (WHAT / HOW)

1. 실제 native file input을 유지하되 선택 표면을 한국어 `사진 선택`으로 표시한다. ready에서는
   `사진 바꾸기`. native 영문/파일명은 opacity 0 input으로 시각적으로 숨기며 input은 선택 표면 전체를
   덮는다. display:none/visibility:hidden/aria-hidden input, 별도 중복 button, JS 강제 click은 금지.
2. 기존 label/id/testid, accept=image/* 유지. 상태를 aria-describedby로 연결하고 ready 여부는
   실제 state에서만 표시한다. label은 위, 조작은 아래. min target 44px, 명확한 focus-visible,
   320px overflow 0. 실패/로딩/취소는 선택 기능을 잠그지 않는다. 새 자동 애니메이션 0.
3. 선택 직후 input.value 초기화, 취소 시 이전 이미지 유지, 동일 파일 재선택, slot별 독립 소유,
   교체·삭제·unmount 정리 동작은 바꾸지 않는다. 원본 파일명/경로/blob URL 표시·로그 0.
4. 작은 상태 표시와 절제된 테두리/여백으로 기능 위계를 구분한다. 외형은 저장/업로드 성공을 암시하지
   않는다. 운영자 표면과 신규 공유 컴포넌트는 다음 단위로 남긴다.

## 검증 절차 (VERIFY)

- node_modules/.bin/vitest run apps/mockup/src/preview/PreviewComposer.test.tsx
- node scripts/check.mjs (format/lint/typecheck/unit/build), node scripts/e2e-run.mjs (canonical)
- SSR input 개수/이름/상태 연결, Chromium Enter/Space native chooser, 취소·같은 파일 재선택,
  failed→retry→ready→clear, slot 독립, 44px/focus/overflow/axe/console/no egress 검증.
- 기존 E2E 삭제/완화/skip/retry 추가 0. 신규 320/390/1280 screenshot은 실제 고객 route + 합성 catalog,
  기존 사진 생성 helper 사용. 고정 시각·캡처 전 animation 완료는 기존 증거 조건과 동일.
- PNG 직접 열어 확인하고 hash 기록. admin bundle/금지 경로 무변경 확인. 보호 파일 hash 비교,
  git diff --check, 포트 잔류 확인. 게이트 실패 시 in-scope 원인만 보완한다.
- 실제 기기/운영/OS 파일 대화상자 시각 검증은 NOT TESTED. 합성 chooser 이벤트는 실기기 검증이 아니다.

## 위험 (RISK)

투명 input의 focus indicator/접근 가능한 이름 누락과 작은 화면 줄바꿈이 주요 회귀 위험이다.
서버 업로드 의미를 추가하지 않는다. 디자인 변경으로 허용된 기존 composer PNG 6장은 갱신될 수 있다.
이 계약은 스펙 없는 구현을 막기 위해 코드 전에 작성했다. 자동화·새 의존성·권한 확대 없음.

### QUESTIONS

현재 범위에 추가 Founder 제품 결정 없음. 운영자 기본 화면/진단 정책/replay 크기는 선택하지 않는다.

### STOP REPORT (Codex, 2026-09-07)

이 절은 최초 실패 이력이다. 아래 재개·재검증 절이 현재 상태이며 최초 실패 원인을 삭제하거나 확정하지 않는다.

- 구현: 제품 2파일 + unit/E2E 2파일. 새 SSR unit 1건, E2E 4건. 한국어 overlay label, 실제 native input,
  label/description 연결, 선택/교체와 상태 표시. 기존 이미지 소유·onChange·clear 의미는 유지한다.
- targeted unit 61/61 PASS. 최초 check PASS(unit 2511/2511, 92파일, build 2개).
- 최초 canonical E2E: **217 passed / 10 failed / 0 skipped / 0 retry**, 5.7분. check와 병행 실행했다.
  7건은 이번 UI: 새 focus 검사 3건(programmatic focus는 keyboard modality가 아님) + 실제 input 높이
  42px인 기존 접근성 검사 4건. label min-height 46px(테두리 제외 44px), 실제 Tab/Shift+Tab으로 보완했다.
  이 수정 뒤 **check 재실행 PASS, unit 2511/2511**(56.46초). 최종 UI의 E2E는 아직 NOT VERIFIED다.
- 나머지 3건은 허용 범위 밖: scaffold admin mobile 30초 timeout; Space 잘못된 비밀번호 안내 5초
  대기 실패; spec087 mobile Canvas 5초 대기 실패. 원인을 현재 범위에서 확정하지 못했다.
  병렬 실행 부하가 원인이라고 단정하지 않는다. 기존 게이트의 flaky 여부도 미확정이다.
- `AUTO_REVIEW_LOOP.md`의 필수 게이트 원인 미확정 STOP에 따라 추가 E2E/코드 변경/commit/push/다음
  단위 진행 중단. 완성·CODEX_PASSED로 표시하지 않는다. 범위 밖 코드/test/timeout 수정 0.
- 실패 자료: `C:/Users/써드플~1/AppData/Local/Temp/denn-spec088-first-gate-10fdc7182ce54b31ac1bc44341e5a53f/`.
  원래 test-results도 남았다. Chromium 내부 debug.log는 같은 보존 폴더로 이동(삭제 아님).
- 기존 composer PNG 6장은 **보완 전** E2E 결과이며 최종 46px 변경의 증거가 아니다. spec088 신규
  PNG 3장은 focus 단언에서 실패해 생성되지 않았다. 시각 최종 승인도 NOT VERIFIED.
- 보호 20파일 hash 중 spec018 PNG 2장만 canonical 재생성으로 변경, 나머지 18개 동일. PNG는
  restore/stage/commit하지 않았다. 포트 4183/4184/4185/8080/9099/9199 LISTENING 0,
  staging `denn-e2e-KuUkxk` 제거 확인. Rules/config/package/lockfile 변경 0.
- 고객 build `index-qnJvLZZR.js` 342.37 kB/gzip 104.91, CSS 21.10 kB. admin entry
  `index-BWeRXD_J.js` 295.37 kB/gzip 91.55 및 CSS 파일명 동일. 기존 chunk-size 경고 유지.
- HEAD=origin 추적 ref `03cd5e6`, ahead/behind 0/0. 이번 stage/commit/push 0. 사용자 dirty 유지.
- 재개에 필요한 결정: **범위 밖 E2E 3건의 읽기 전용 원인 조사 + 보완된 UI 로컬 재검증 허용 여부**.
  원인 조사 없이 timeout/worker/skip/retry/테스트 기대값을 바꾸지 않는다. 운영 권한은 계속 금지다.

### 사용자 승인 재개·재검증 (Codex, 2026-09-07)

- 사용자가 읽기 전용 실패 조사와 최종 UI 재검증을 승인하고 시각 확인 방법을 요청했다.
  코드·테스트·config 수정 0. 기존 check 2511/2511 PASS를 유지하고 canonical만 단독 1회 실행했다.
- `node scripts/e2e-run.mjs`: exit 0, **227 passed / 0 failed / 0 skipped / 0 retry**, 46.3초.
  새 UI 4건, 이전 UI 관련 실패 7건, 범위 밖 시간 초과 3건 모두 이번 실행에서 통과했다.
  테스트 timeout/worker/skip/retry/기대값을 바꾸지 않았다. 별도 에이전트 독립 검수는 아니다.
- 읽기 전용 조사: Space 실패 snapshot은 두 경우 모두 `시안을 확인하는 중입니다…`였다.
  fixture `createV2Replay`는 syntheticPng·SHA-256 준비를 await한 뒤 fake opener를 생성하며,
  wrong-password는 fake opener에서 직접 실패를 반환한다. 이 테스트를 실제 PBKDF2 지연의 증거로
  해석하면 안 된다. admin은 30초 전체 timeout이며 당시 마지막 await 지점을 확정할 trace가 없다.
- 결론: **이번 단독 실행에서 3건 미재현**. 최초 병행 실행의 부하 가능성은 추론일 뿐 인과 증명 아님.
  첫 실패 자료에 단계별 timing/trace가 없어 정확한 원인은 UNCONFIRMED로 남긴다. 재발하지 않는다는
  보장이나 환경 문제 해결로 기록하지 않는다. 별도 인프라 수정/불필요한 반복 실행 없음.
- PNG: 신규 사진 선택 3장 + 기존 composer 6장이 최종 코드로 생성됐다. 신규 3장과 전체 데스크톱/
  모바일 화면을 직접 열어 확인했다. 320px에서 삭제 버튼은 다음 줄로 정상 배치되고 페이지 overflow 0.
  키보드 초점 검정 테두리, 한국어 선택/교체 상태, 44px 실제 입력 면적의 E2E도 PASS다.
- 신규 PNG SHA-256:
  - 320x568: `3D7840ECD5B5B520D725325C2BC2ABDF6D9DF5FB3C1D0A3FF665F18FB8AF8B7E`
  - 390x844: `7391EF15B330AEC9253D664ED530476C8B54AF53F638782AF09E735A4AAA8C78`
  - 1280x800: `2E864621E1B0AAB03285BC47C1C80E2DEC8581ABEDBFE20631E0B42E49586505`
- 포트 6개 LISTENING 0, staging `denn-e2e-00wvDX` 제거, 새 debug.log 없음. 보존한 첫 실패 자료는 유지.
  보호 20파일 중 spec018 PNG 두 장만 재생성됐으며 나머지 18개 hash 동일. restore/stage/commit 0.
  제품/테스트 변경은 이전 4파일 그대로, 이번 추가 변경은 문서·자동 생성 PNG뿐이다.
- 상태 READY_FOR_CODEX / LOCAL_VERIFIED. 시간 초과의 원인 미확정 한계를 포함해 종료 검수한다.
  이번 stage/commit/push 0. 운영전환·실제 Firebase/live·실기기·OS 대화상자 시각 검증은 NOT TESTED.
- 사용자는 results/spec-085의 최신 전체 데스크톱/모바일 캡처와 results/spec-088의 확대본을 열어
  육안 검수할 수 있다. 전체 이미지의 보라색 사진은 합성 테스트 자료다. 캡처는 클릭 가능한 실행 화면이
  아니며, 테스트 서버는 종료됐다. 운영 연결 없는 상시 조작 화면은 별도 로컬 합성 preview 준비가 필요하다.

### DONE (Codex, 2026-09-07)

- 최종 diff 4파일 및 기존 단언 보존, 신규 3 PNG/전체 화면, label·입력·state·onChange 경계를 검토했다.
  추가 결함 미발견. 직전 최종 check 2511/2511 및 사용자 승인 단독 canonical 227/227 PASS를 근거로
  CODEX_PASSED 판정한다. 별도 에이전트 독립 검수나 Founder의 시각 취향 승인을 주장하지 않는다.
- 최초 timeout 원인 UNCONFIRMED는 알려진 검증 한계로 그대로 남긴다. 이후 무재발 보장은 아니다.
  코드·테스트 완화나 최초 실패 삭제 없이 최신 검증을 승인한다.
- 제품·테스트 4파일 + 허용 PNG 9장 commit `f2f7f67`. 종료 문서는 별도 commit으로 묶는다.
  spec018 등 보호 대상은 미스테이지. 실제 Firebase/live/운영전환 NOT TESTED/보류 유지.
- 다음 후보는 F-2 운영자 시안 PNG 선택 표면이며 별도 스펙 계약 뒤 진행한다. 새 제품 정책 선택 없음.
