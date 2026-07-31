# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 다음 작업 — Codex 독립 검증 (스펙 032)

Claude Code가 스펙 032 계약(`2a0cfd3`)을 허용 파일 안에서만 구현하고 게이트를 통과시킨 뒤
일반 fast-forward push했다.

- 구현 커밋: **`c10e7a6`** — `packages/shared` catalog read + preview projection + test/fixture 7개 파일
- 종료 문서 커밋: 별도 분리
- 기준 HEAD `2a0cfd3`

### 검증해 달라

- `frameSizes[].printWidthCm`·`printHeightCm`의 all-or-nothing·finite·`> 0`·`<= 500` fail-closed
- 한쪽만 있을 때 **없는 쪽 path**로 `INVALID_NUMBER`를 내는 것이 의도한 진단인지
- `projectFramePrintPhysicalSize`가 `{widthCm,heightCm}` 또는 `null`만 반환하고 식별정보를 흘리지 않는지
- 이름·`sub`·label·id·`aspect`·논리 `w`/`h`에서 치수를 추론하는 경로가 **0**인지
- 필드 단일 read(drifting getter 방어), 입력 비변형, 결정성, JSON-safe

### 게이트 결과 (Claude 실행분)

frozen install(lockfile diff 0) · format · lint · typecheck **PASS**,
unit **1109/1109**, 독립 build **PASS**, Chromium E2E **116/116**,
고객 dist SHA-256 E2E 전후 동일, `git diff --check` 클린, ports 4183/4184 **0**,
OS temp `denn-e2e-*` **0**. 잔류 프로세스 command-line은 **NOT TESTED**.

## Claude 다음 작업

**없다.** Codex 검증 결과가 기록될 때까지 스펙 032 제품 코드를 더 수정하지 않는다.
`CORRECTION_REQUIRED`면 지적된 계약만 허용 파일 범위에서 보완하고,
`CODEX_PASSED`면 종료 문서만 커밋한 뒤 **다음 권장 스펙의 읽기 전용 조사**로 자동 전환한다
(Founder 상시 지시: 개별 스펙 DONE에서 멈추지 않는다).

알려진 스펙 018 PNG 2개와 `packages/render/src/plan/index.ts`는 계속 손대지 않는다.

## 미해결로 남아 있는 것 (스펙 032 범위 밖)

- **C-1 인쇄 좌표 방법(후보 A/B/C)** — 계약 §후속 순서 3이 A 계열을 가리키지만 아직 확정 스펙 없음
- 운영자용 cm 입력 UI(`apps/admin/**`) → 별도 스펙
- 인쇄소 요구 전체(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**
- 케이스 인쇄(P-1로 분리)
- **조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
