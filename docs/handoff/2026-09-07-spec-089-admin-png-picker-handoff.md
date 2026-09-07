# spec089 운영자 PNG 선택 UI 완료 및 다음 제품 결정

상태: DONE / CODEX_PASSED / LOCAL_VERIFIED, 제품·test·PNG commit `f95cb29`.
계약: `docs/rebuild/specs/089-admin-png-picker-surface.md`. 동일 Codex가 작성·구현·검토했다.
선행 spec088 제품 `f2f7f67`, 문서 `0465f24` push 완료를 확인하고 시작했다.

## 결과

native input을 유지한 한국어 선택/교체·상태·focus·disabled 표면. 기존 onChange와 owner는 무변경이다.
고객 handler의 value 초기화를 운영자에 복사하지 않았다. 실제 선택 값은 native input에 남고, 새
화면 문구/오류/로그에 원본 파일명·경로를 표시하지 않는다. 서버 업로드나 발급 기능은 추가하지 않았다.

- targeted unit 22/22, 최종 check 2512/2512(92파일, unit 2.98초), format/lint/typecheck/build PASS.
- 최초 canonical 230/230(50.0초). 캡처 범위 보완 뒤 format 실패 1건을 formatter로 바로잡고,
  check 재실행 PASS → 최종 canonical 230/230(51.1초), retry/skip 0. 순차 실행했다.
- baseline 전/고정 후 disabled, native Enter/Space, 취소 상당/교체, 실패 후 선택, 44px/overflow0/
  axe0/console0/외부 egress0. 새 검사에서는 발급/쓰기 factory 호출 0. 기존 발급 실패/StrictMode 유지.
- source/test 4 + PNG 7 = 제품 commit 11파일. 종료 문서 8개는 별도 commit 대상.
  spec084 measurements.json 무변경. 새 PNG hash·출처는 results/spec-089/README.md.
- 고객 entry SHA-256 `879FBEF1482D3DBC0075C27C22A1D76FC7C4392C985FF5AD2FC2BFDC39EB1896` 동일.
  운영자 entry `D604F9BA069A1D97A3765288549C3860F2E279D2938A3B14052AC607CC1FC3AF`.
- 보호 20파일 중 19개 동일. spec018 desktop만 기존 canonical 재생성 hash 변화,
  `D0A0AA52… → FCB869CAF8B126357765CB49EBF47AC07DDAA9A0ACF324DFD0EC142C80DB7A74`.
  보호 대상 restore/stage/commit 0, 실제 network/emulator/deploy 0. 전체 diff check PASS.
- 포트 4183/4184/4185/8080/9099/9199 및 이번 staging 2개 잔류 0, 신규 debug.log 없음.
  실제 route/기기/UID/운영 검증 NOT TESTED. spec088 최초 timeout 원인 UNCONFIRMED 유지.

## 다음 경계 — 아직 채택되지 않은 Founder 선택지

**후속 확정(2026-09-07):** Founder가 질문지에서 F-4=A/F-7=A/F-8=A 승인.
정본 `docs/codex-claude-handoff/decisions/2026-09-07-ui-audit-f4-f7-f8-decisions.md`가 우선한다.
아래 표와 미결정 문구는 승인 전 이력이다. F-4/F-7은 각각 090/091, F-8은 기존 계약 유지로 종료한다.

근거: spec084 잔여 finding 요청(2026-09-03), 현재 `apps/admin/src/App.tsx:93` 이후,
`apps/mockup/src/App.tsx:121`, `apps/mockup/src/browse/BrowseFlow.tsx:101`,
spec084 감사의 F-8 정정. 사용자 연속 진행은 이 제품 결정을 대신하지 않는다.

| 항목 | A (검토 권장안, 승인 아님) | B | 범위/주의 |
|---|---|---|---|
| F-4 운영자 첫 화면 | 데모 버튼/보기/상시 오류를 걷어내고 운영 연결 전 준비 안내로 정리. 기존 로컬 도구·읽기 카드와 gate off 유지 | 현재 데모를 유지하고 진입 화면 개편 보류 | 새 dashboard 수치·운영 메뉴·gate 활성화 없음. 현재 root에 로컬 도구/읽기 카드도 있으므로 모든 영역이 빈 화면이라고 단정하지 않는다 |
| F-7 고객 호환 안내 | 성공한 이전 데이터 호환의 정보성 배지만 숨기고, 항목 누락 가능 안내와 로드 실패는 유지 | 호환 정보성 배지도 현재대로 표시 | 경고 데이터 수집/정규화·실패 검증을 끄지 않는다. 운영 catalog의 발생 빈도는 NOT TESTED |
| F-8 시안 표시 크기 | 발행 당시 logical size 충실 재현 계약 유지, 현재 감사 항목은 결정으로 종료 | 기기 폭에 맞춘 확대 방식을 별도 계약 조사 | B도 즉시 재렌더/스키마 변경 승인이 아니다. 320x480은 fixture 값이며 운영 화면 결함으로 일반화하지 않는다 |

세 항목 모두 NOT DECIDED. A는 Codex의 제안이며 Founder 승인으로 기록하지 않는다.
어떤 안을 택해도 운영전환·실제 Firebase/live·배포 금지는 유지한다. 새 구현 계약은 결정 이후 작성한다.

## 진행률과 다음 지시

기존 관리상 추정 **85~88% 완료 / 12~15% 잔여** 유지. 스펙 총수/가중치가 고정되지 않아
스펙 번호로 산출한 값이 아니다. 이번에는 F-2 운영자 표면을 닫았으며 운영전환·실기기 검증은 남아 있다.
모든 미완 기능이 F-4/F-7/F-8뿐이라는 뜻이 아니라, 현재 UI 감사에서 다음 선택이 필요한 항목들이다.

다음 지시: 이 handoff의 F-4/F-7/F-8에 대한 Founder 답변을 기록하고 선택된 항목만 별도 스펙으로
좁혀 작성·구현한다. 답변 전 추가 구현 없음. 자동화·백그라운드 반복 작업 없음.
