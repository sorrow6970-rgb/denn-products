# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` (스펙 029 보완 라운드 1 제출 · 재검증 대기)

# 스펙 029 보완 라운드 1 완료 · Codex 재검증 대기 (다음 기능 착수 금지)

Codex 지적 **2건 모두 유효**였고 지정된 파일 안에서만 보완해 코드/문서를 **분리 커밋**해 push했다.

- 코드/test: **`110511e`** (기준 `197527c`, 최초 구현 `95fcf92`)
- 문서: 이 커밋 — 스펙 029 §보완 라운드 1, handoff §8, live log, `CURRENT.md`, Automation 2개

## 루프·정지 보고 규칙 (유지)

- 진행할 수 없거나 loop가 중단되면 멈춘 이유, 확인 근거와 마지막 Git 상태, 자동 해결 가능 여부,
  권장 다음 단계, 그대로 붙여넣을 수 있는 재개 프롬프트를 한 번 보고한다.
- 상태·HEAD·ahead/behind·dirty 경로·감시 문서 fingerprint가 30분 동안 변하지 않으면 loop를 일시정지하고
  같은 다섯 항목을 한 번 보고한다. 동일 원인으로 반복 알림하지 않는다.
- 개별 스펙 DONE만으로 전체 DENN loop를 종료하지 않는다.
- 폴링 주기 tier: 5분 = `WAITING_FOR_CLAUDE`·`CORRECTION_REQUIRED`·`READY_FOR_COMMIT`,
  15분 = `READY_FOR_CODEX`·`COMMITTED`·`WAITING_FOR_NEXT_SPEC`.

## 보완 내용 (재검증 대상)

1. **릴리즈 flush** — `end(pointerId, "pointerup")`이 대기 중인 최신 transform을 버려, 릴리즈 직전 `move`가
   animation frame을 기다리는 중이면 사진이 **손을 놓은 위치보다 한 프레임 뒤**에 남았다.
   이제 `pointerup`만 **정확히 1회 flush**한 뒤 종료하고, `pointercancel`·`lostpointercapture`·
   selection abort·unmount/dispose는 **pending을 폐기**한다. flush는 state 정리와 frame 취소 **후에**
   실행되므로 늦은 rAF는 commit 0이고, **이중 commit도 다음 세션 pending 소비도 없다**.
   `cancelFrame`은 frame 유무와 무관하게 **항상 pending을 비운다**.
2. **capture 실패** — `setPointerCapture`가 throw하면 **capture 없는 drag가 계속**됐다(포인터가 요소를
   벗어나면 move/up이 도달하지 않아 세션이 반쯤 열린 채 남는다). 이제 방금 시작한 세션을 **즉시 abort**하고
   `dragSlotRef.current`를 비운다.

**유지된 계약**: normalized 저장 · plan 직전 환산 · `maxPan=0` 고정 · 1.1 승산 · 0.02/0.10 키보드 스텝 ·
단일 `원래대로` · generation 가드 · rAF 1회 병합 · 터치 drag·핀치 미지원 · `touch-action` 선언 0 ·
초기화 행렬 · 스펙 026 owner와 `packages/**` 무변경.

**신규 회귀 테스트**: `pointerup` flush 1회 / 이미 실행된 frame 중복 commit 0 / move 없는 `pointerup`
commit 0 / flush가 다음 세션에 누출·소비되지 않음 / 다른 pointerId의 stale end flush 0 /
throwing subscriber 후에도 세션 종료·재사용 / abort·dispose 폐기 /
**실제 Chromium**: capture 거부 시 픽셀 불변 + 원복 후 정상 drag.

## 게이트 실측 (Claude, 보완 라운드 1)

- frozen install exit 0, **lockfile diff 0**, 신규 의존성 0
- format · lint · typecheck PASS
- **unit 944**(938 → 944) / **e2e 91 PASS**(90 → 91) · exit 0
- build PASS — mockup JS **263.19 → 263.31 kB**(gzip **81.56 → 81.60**), **CSS 무변경**, admin 무변경
- `git diff --check` clean / 포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0
- dist **SHA-256 E2E 전후 동일**, fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 변경 파일: `imageTransform.ts`(+ test) · `PreviewComposer.tsx` · `tests/e2e/mockup-preview.spec.ts`
  (허용 목록 안). CSS·설정·manifest·lockfile·`packages/**` 무변경

## NOT TESTED (유지)

2손가락 핀치(미구현 + Playwright 구동 불가) · 터치 drag(1차 미지원) · 실기기 4환경 ·
실제 200% 브라우저 확대 · print/export pan 재현 · 대용량 사진 성능·EXIF · 운영 카탈로그·이미지.

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 스펙 018 PNG 2개와 **Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`** 외 변경이 없는지 확인.
3. Codex가 `CODEX_PASSED` / 새 `CORRECTION_REQUIRED`(fix_round 2) / 다음 지시를 기록했는지 본다.
   - 새 `CORRECTION_REQUIRED` → 지정 파일 범위만 보완, 코드/문서 분리 커밋(최대 3회).
   - `CODEX_PASSED` → 종료 문서만 처리.
4. 변화가 없으면 **어떤 파일도 수정·commit·push하지 않고** 조용히 대기한다.

## 금지 (계속 유지)

- 다음 기능·다음 스펙(030 등) 착수, 확정된 D-1~D-9 값 변경·확장
- 터치 drag·핀치 구현, 전역 `touch-action:none`, 무조건 `preventDefault`
- 스펙 026 owner의 리터럴 transform 변경, `packages/**` 변경
- 핀치·실기기·200% 확대를 "검증됨"으로 기록하는 것
- 신규 의존성, Firebase/network/live/deploy, 운영 데이터·이미지 접근
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup,
  사용자·Codex 소유 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
