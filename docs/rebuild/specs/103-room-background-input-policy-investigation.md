# 103 — 룸 배경 사진 입력정책·디코딩 전 예산 경계 조사

2026-09-08. 기준 cc0bc4c / rebuild/modern-studio, origin 추적 ref와0/0.
DOCUMENT DONE / DOCUMENT_REVIEW_PASSED(동일 Codex). 사용자 `다음 작업 이어할까?`로 NEXT의 수동 재개 조사를 수행했다.
제품 구현 계약이 아니라 저장소 근거 조사·정책 선택지 작성이다.

최신: 이후 사용자 `승인하고 계약 검증 해줘`로 [RG-3=A 승인](../../codex-claude-handoff/decisions/2026-09-08-rg3-room-background-input-policy-decisions.md).
[104 계약](104-room-background-input-preflight-contract.md) 작성·검토 완료, 구현 미착수.
아래 조사 당시7문서/미채택 기록은 이력이며 현재 누적 변경은 승인/104를 포함한11문서다.

## 목표 (WHY)

102의 독립 frame snapshot 다음에 필요한 배경 입력 형식·방향·예산과 검사 순서를 좁힌다.
026의 decode 성공을 파일 검증으로, 102의 합성 할당 예산을 사용자용 기본값으로 오인하지 않는다.
[101 경계 조사](../../codex-claude-handoff/reviews/2026-09-07-spec-101-room-browser-adapter-boundary-investigation.md),
[RG-2](../../codex-claude-handoff/decisions/2026-09-07-rg2-local-room-preparation-decisions.md),
[102 완료](102-room-frame-snapshot-contract.md)가 선행 근거다.

## 범위 (SCOPE / WHERE)

허용 문서 정확7개:

- docs/rebuild/specs/103-room-background-input-policy-investigation.md
- docs/codex-claude-handoff/reviews/2026-09-08-spec-103-room-background-input-policy-investigation.md
- docs/handoff/2026-09-08-spec-103-room-background-input-policy-handoff.md
- Automation/DENN_AUTOMATION_STATE.md
- Automation/NEXT_CLAUDE_PROMPT.md
- docs/codex-claude-handoff/CURRENT.md
- docs/live/CLAUDE_LIVE_PATCH_LOG.md

실제 사진/File/Image/URL/Canvas 생성·브라우저·emulator·unit/build/E2E 실행0.
apps/packages/tests/Rules/config/manifest/lockfile/기존증거 수정0. 실제 Firebase/UID/운영data/
서비스 요청/배포/발행/삭제/설치/예약 자동화0. 공식 API/파일 형식의 외부 문서 확인이 필요하면
로컬 소스 사실과 분리하고, 이번 저장소 조사에서 검증하지 않은 동작은 UNCONFIRMED로 남긴다.
보호 taste-v2/**·design/README·038·spec018PNG2·render/plan·AGENTS·pnpm-workspace 및
별도091handoff/roadmap 등 시작dirty22는 수정·복원·stage·commit0. 이번에는 PNG 재생성도0.

## 조사 지시 (WHAT / HOW)

1. 026 owner의 입력 검사·URL/Image 시작·크기 확인·취소 순서를 현재 코드와 대조한다.
2. 기존 PNG/EXIF 관련 검사와 테스트를 찾아 이미지 전체 안전 검증/룸 지원정책과 구분한다.
3. 형식·애니메이션·방향, 압축 byte·헤더 읽기·decoded dimensions·snapshot/output·동시보유량을 분리한다.
4. decode 전/후 검사로 각각 막을 수 있는 실패를 표로 남긴다. 미래 parser/adapter 후보는 구현 승인 아님.
5. 기본 수치·실제 기기 한계는 추정하지 않는다. 산술 예시를 쓰면 가정/식/제외 비용을 함께 적는다.
6. 최초 지원형식/초과 처리처럼 제품 의미가 필요한 선택은 최소 질문으로 좁혀 Founder에게 묻는다.
   그 전 후속 구현 계약·제품 구현·commit/push를 시작하지 않는다.

## 검증 (VERIFY)

근거 링크/라인 존재·산술 대조·git diff --check·변경7경로·시작dirty22 SHA256 불변을 검사한다.
제품/설정/시험/증거 추가diff0, staged0, HEAD cc0bc4c 유지. 테스트 숫자는102 과거 기록으로만 인용한다.
동일 Codex 문서 검토이며 독립 검수나 decoder PASS라고 표시하지 않는다.

## 위험 (RISK)

MIME·파일명·헤더의 치수 선언만으로 전체 파일/네이티브 decoder의 안전성을 증명할 수 없다.
이번에는 외부 표준/장치별 실제 메모리를 검증하지 않는다. 지원 형식 선택 전 parser/loader를 구현하면
자동 진행이 새로운 제품 선택을 대신하게 되므로 중단한다. 전체 실측 완료율은 확인할 수 없다.

### DONE (Codex)

026 owner/기존 PNG proof 후보/EXIF 시험과 상위 성능정책을 정적으로 대조했다.
[결과](../../codex-claude-handoff/reviews/2026-09-08-spec-103-room-background-input-policy-investigation.md).
101에 빠진20MB/40MP 정책을 보충하되 룸 기기 안전 예산이 증명됐다고 주장하지 않는다.
byte 단위·기본형식과 초과처리를 RG-3로 제안, 미채택. 제품/시험/브라우저 실행0.

### QUESTIONS

RG-3 CLOSED / A APPROVED: 첫 룸 배경을 정적 JPEG·PNG, 파일≤20,000,000 bytes·이미지≤40,000,000 pixels로
제한하고 미지원/초과/검증 불가를 명시 거부한다. 초과 원본 자동축소/자동 형식변환은 하지 않는다.
허용입력의 화면용 축소는 별도다. B는 추가형식/자동변환 요구부터 별도 조사한다.
Founder 답변 전 STOP 조건은 승인으로 해소됐다. 최신 요청은 계약 검증까지만이며 제품 구현/commit/push0.

문서 검증 실측: 신규3문서 링크/지정라인23/23, 시작dirty22/22 SHA256 동일, 정확 허용7문서만 변경, git diff --check PASS. 산술20,000,000/20,971,519/971,519 bytes와RGBA8 가정152.587890625 MiB 대조. HEAD=origin 추적cc0bc4c·0/0, staged0, commit/push0. 제품/시험/브라우저 실행0.
