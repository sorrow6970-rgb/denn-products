# NEXT CLAUDE PROMPT

상태: `SESSION_ENDED_AWAITING_MANUAL_RESUME`
자동 5분 루프: **종료됨**
스펙 028: **미완 — 승인·종료 아님**

# 다음 세션 작업: 스펙 028 보완 2건의 재검증/보완만

이번 세션은 Founder 지시로 마감됐다. 스펙 028은 Codex correction review 도중 종료됐으며
`DONE`/`CODEX_PASSED`가 아니다. 다음 세션에서 다룰 범위는 **아래 2건뿐**이다.

두 보완은 커밋 `d4fb99b`로 이미 구현·push된 상태이고, 남은 것은 **Codex 재검증**과 그 결과에 따른
추가 보완이다. 재검증이 불충분하다고 판정하면 정확히 이 2건을 다시 다룬다.

## a. `apps/mockup/src/canvas/templateArtBinding.ts` (+ `templateArtBinding.test.ts`)

source 필드의 **예외 경계 내 단일 normalized snapshot**.

- `source.kind` / `source.src`를 예외 경계 안에서 각각 정확히 1회 읽어 plain snapshot으로 복사
- 검증, `crossOrigin`/`src` 설정, load 결과 처리는 그 snapshot만 사용
- getter throw · Proxy get trap · revoked Proxy가 public call 밖으로 throw하지 않고 기존 안전 실패로 닫힘
- getter drift가 두 번째 읽기로 결과를 바꾸지 못함
- URL·token·base64·원본 예외 객체를 state/error/log/DOM에 저장하거나 노출하지 않음
- crossOrigin-before-src, data URL 예외, 재시도 0, generation stale guard, cache 0 계약 무변경

## b. `packages/shared/src/catalog/images/placement.ts` (+ `placement.test.ts`)

판정 필드의 **전체 단일 snapshot 및 getter drift fail-open 차단**.

- source 체인과 legacy-builder marker 필드를 각각 정확히 1회 읽어 snapshot으로 복사
- `hasDesignSource`·builder 판정·legacy crop 판정·최종 결과가 caller/template을 재읽지 않음
- 첫 snapshot이 legacy crop variant면 이후 drift가 근거를 지워도 `stretch`로 fail-open하지 않고
  `unsupported: legacy-builder-crop` 유지
- 관련 getter throw · Proxy trap · revoked Proxy는 throw 0의 안전 결과로 닫힘
- Result/diagnostic에 source 문자열·필드명·template ID 미추가
- 기존 안정 입력의 none/stretch/unsupported 결과와 오류 우선순위 무변경

## 재개 전 확인

1. `git fetch --all --prune` → HEAD = origin = `b18b652`, ahead/behind 0/0
2. working tree에 아래 PNG 2개 외 변경이 없는지 확인
3. `docs/handoff/2026-07-29-session-end-handoff.md`와 `docs/codex-claude-handoff/CURRENT.md` 정독
4. Codex 재검증 결과가 push돼 있으면 그 지시를 따른다. 없으면 파일을 수정하지 말고 상태만 보고한다.

## 금지 (다음 세션에서도 유지)

- 스펙 028을 `DONE`/`CODEX_PASSED`로 기록하는 것
- 위 2건 밖의 새 기능·정책 변경·의존성 추가·다음 스펙(029 등) 착수
- legacy builder crop 지원, builtin multi-zone, text/clock, pointer, print/export, 저장·주문
- Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live test, 운영 이미지 다운로드, deploy
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
