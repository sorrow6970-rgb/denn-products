# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` (스펙 029 사전 조사 제출)

# 스펙 029 사전 조사 완료 · Codex 검토 대기 (구현 착수 금지)

읽기 전용 조사 범위만 수행해 문서 전용 커밋으로 push했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`(10항목).

## 루프·정지 보고 규칙 (유지)

- 진행할 수 없거나 Claude loop가 중단되면 사용자에게 멈춘 이유, 근거, 자동 해결 가능 여부,
  권장안과 정확한 재개 프롬프트를 한 번 보고한다.
- 상태·HEAD·dirty 경로·문서 fingerprint가 30분 동안 전혀 변하지 않으면 loop를 일시정지하고
  같은 다섯 항목을 보고한다.
- 동일 원인으로 반복 알림하지 않는다.
- 개별 스펙 DONE만으로 전체 DENN loop를 종료하지 않는다.
- 폴링 주기는 상태 tier를 따른다: 5분 = `WAITING_FOR_CLAUDE`·`CORRECTION_REQUIRED`·`READY_FOR_COMMIT`,
  15분 = `READY_FOR_CODEX`·`COMMITTED`·`WAITING_FOR_NEXT_SPEC`.

## 제출 내용 요약

- **재사용 확정**: `computeCoverDrawRect`(cover + pan clamp, 입력 무변형, `appliedTransform`·`maxPan` 반환),
  `clientPointToLogical`(logical px, DPR 무관), plan/adapter의 zone별 `transform`
  → **`packages/render` 무변경으로 시작 가능**
- **차단 계약 2건**
  - D-1 `transform.x/y`의 단위·기준 공간: 액자 logical canvas가 `resolveFrameLogicalWidth`
    (`max(1,round(min(content,500)))`) + `ResizeObserver`로 **resize마다 변한다** → logical px 저장은
    "창 크기 바꾸면 구도 이동"을 구조적으로 만든다(case는 `modelLogicalSize` 고정이라 무해).
  - D-8 transform 소유자: 스펙 026 owner의 `transform`이 **리터럴 타입 `{scale:1,x:0,y:0}`**
    → owner를 편집 주체로 둘 수 없다(권장: composer가 slot별 소유).
- **레거시 결함(재현 금지)**: 인쇄 pan 배율 frame 하드코딩 `dim.w/500`(미리보기 폭은 `prevMaxW`), zoom 범위
  두 축 불일치(휠·핀치 0.3~5 vs 슬라이더·버튼 30~500%), multi-zone 슬라이더 표시값·터치 시작 오프셋 오류,
  pointer capture 부재.
- **모바일 제약**: `surface.css`에 `touch-action` 선언 0, wrapper `overflow-x:auto` + `tabIndex=0`,
  캔버스는 축소하지 않음 → 무조건 `preventDefault`는 가로·세로 스크롤을 둘 다 죽인다.
- **검증 한계**: 2손가락 핀치는 **Playwright로 구동 불가**(단일 탭만) → 구조적 NOT TESTED.
  현재 `playwright.config.ts`는 chromium desktop 1개 프로젝트(`hasTouch` 없음).
- **결정 필요 9건** D-1~D-9. 그중 **Founder 5건** = 활성 zone UX(D-2) / scale 범위·단위 통일(D-3) /
  초기화 버튼 구성(D-5, 레거시 "맞춤"="초기화" 중복) / 핀치 지원 여부(D-6, 200% 확대 제스처 충돌) /
  클립 안 빈 공간 허용 여부(D-7). 나머지 4건(D-1·D-4·D-8·D-9)은 Codex 계약 결정.
- 최소 구현 순서, 허용 파일 후보, STOP 9조건도 보고서에 기록했다.

## 이번 커밋의 검증

- 변경 파일이 문서 범위와 정확히 일치(보고서 1 + `CURRENT.md` + live log + Automation 2)
- `git diff --check` PASS
- 제품 코드·테스트·설정·CSS·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 일반 fast-forward push, push 후 HEAD=origin·ahead/behind 0/0
- 스펙 018 PNG 2개 외 working tree 변경 0(그 2개는 restore·checkout·stage·commit 하지 않음)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 아래 PNG 2개 외 변경이 없는지 확인.
3. Codex가 조사 보고서를 검토해 **구현 스펙 / 추가 조사 지시 / D-1~D-9 결정 결과**를 기록했는지 본다.
4. 새 지시가 없으면 **어떤 파일도 수정·commit·push하지 않고** 조용히 대기한다(반복 보고 금지).

## 금지 (계속 유지)

- pointer/pan/zoom **구현 착수**(스펙과 D-1·D-8 결정 전)
- 스펙 029 구현 문서를 Claude가 작성하는 것(구현 스펙은 Codex 소유)
- 스펙 026 owner의 `transform` 리터럴 타입 변경, `packages/render` 기하 계약 변경
- 핀치를 "검증됨"으로 기록하는 것(합성 TouchEvent는 PASS 근거 아님)
- 신규 의존성(제스처 라이브러리 등), Firebase/network/live/deploy, 운영 데이터·이미지 접근
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup, 사용자 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
