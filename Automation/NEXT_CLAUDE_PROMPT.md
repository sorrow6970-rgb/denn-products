# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-036-closure-doc-verification`

**다음 작업: 라운드 3 문서 범위 확인 후 스펙 036 종료 판단.**
**제품 독립 재검증은 이미 통과했다 — 다시 요구하지 않는다.**

## 확정된 사실

- **제품 검증 커밋 `b7ee207`**(구현 `fd92fbc` + 라운드 1 보완) — Codex 독립 게이트 통과:
  frozen install · format/lint 각 **153 파일** · typecheck · **unit 1271/1271** +
  **invalid dynamic import warning 0** · build · **Chromium E2E 134/134** · `pnpm check` ·
  diff check·금지 경로 diff **0** · ports 4183/4184·E2E temp 잔여 **0**.
- **문서 커밋**: 라운드 2 `91acec0`(해시 기록 정정), 라운드 3(문서 위생).
  **`b7ee207` 이후 제품 코드 변경 0.**
- **고객 번들 불변식**(정본 표기 = 파일명 + 바이트 + 파일 해시):
  `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** ·
  `fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`.
  `f86d446dde121bce287b393f905a02208b106face54b0803033eb800437bbc09`는
  **`dist` 트리 집계 다이제스트**이며 파일 해시가 아니다.

## Codex가 확인할 것 (문서 범위)

- 라운드 3 변경이 **문서 5개(+스펙 종료 문구)** 로 한정됐는지
- `CURRENT.md` 상단 요약이 현재 사실과 일치하는지(단계·해시 표기·게이트 수치)
- `DENN_AUTOMATION_STATE.md`의 `verified_commit=b7ee207`·`active_unit`·커밋 구분이 맞는지
- live 로그와 스펙의 **과거 append 기록이 보존**됐는지
- 그 뒤 **스펙 036 종료 판단**

## 계속 금지

제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·`pnpm-workspace.yaml` 수정 ·
쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 · 실제 Firebase/network/live/emulator/운영 데이터 ·
Rules/Hosting/배포 · `packages/firebase/src/index.ts` 루트 배럴 수정 · 신규 의존성 ·
전체 테스트 반복 실행 · 다음 스펙 착수 · 새 자동화나 반복 작업.

## NOT VERIFIED / NOT TESTED

- `pnpm-workspace.yaml`의 `allowBuilds` — 수정·`approve-builds` 모두 하지 않았다. 새 클론
  frozen install 재발 여부는 확인되지 않았고, Codex 시도는 **registry EACCES로 중단**돼
  성공·실패로 단정하지 않는다. 수정은 **별도 Founder 승인 대상**.
- 운영자 계정 실재·로그인 · `storage.rules` 실제 배포·거부 · 실제 `admin/state.json` ·
  인증 만료·갱신 · 실제 Storage CORS·`getBytes` · 실기기 · 쓰기 원자성 ·
  실제 SDK 오류 코드 문자열(매핑은 합성 fake로만 검증).

알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않는다.
