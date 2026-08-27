# 스펙 080 Space V2 production customer viewer UI handoff

- 상태: `READY_FOR_CLAUDE / IMPLEMENTATION NOT STARTED / UI STAGE`
- 기준: `HEAD=origin=c9c0c3d`, ahead/behind `0/0`
- spec: `docs/rebuild/specs/080-space-v2-production-customer-viewer-ui.md`
- 선행: spec 078·079 `DONE / CODEX_PASSED`
- Founder 정본: LL-1~LL-6=A, MM-1~MM-6=A

## 다음 구현

Claude Code가 기존 `?space=` production route의 V1 의미를 보존하면서 V2 document dispatch, proof reader,
browser PNG decoder/drawable owner, replay controller와 React Canvas UI를 연결한다.

V2 성공은 실제 proof PNG를 `PreviewCanvasSurface`로 표시한다. V1은 스펙 063 안전 차단 UI를 그대로
유지한다. malformed V2는 V1으로 fallback하지 않고, 자동 retry·catalog/template/font fallback은 0이다.

디자인은 기존 Modern Studio light theme를 사용한다. proof가 유일한 주 시각 요소이며 새 이미지·토큰·
폰트·의존성·장식 모션은 없다. desktop/mobile 신규 screenshot과 targeted production-route Chromium,
axe/overflow/console/egress를 검증한다.

## 계속 닫힌 범위

actual Firebase/network/live/UID/data, Rules/CORS/Hosting deploy, admin issue UI, URL/clipboard, 운영 쓰기,
publish, orphan cleanup, package/lockfile/config 변경은 금지다. 전체 Chromium suite는 보호 PNG 부수효과로
NOT RUN이며 targeted production-route E2E만 실행한다.

전체 리빌드 진행도는 **81~84% 완료 / 16~19% 잔여**다. 문서 준비만으로 완료율을 올리지 않는다.
