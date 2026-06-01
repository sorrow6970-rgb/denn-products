# 3단계 iframe 분리 접근 — 재검토 평가 (결론: 비권장)

> 작성: 2026-06-01. 3단계(운영자 도구 별도 파일)를 **전체 복제 대신 iframe**으로 가볍게 할 수 있는지 재검토.
> 결론 = **iframe 래퍼는 비용 > 실익. 비권장.** 진짜 분리는 공유 모듈 추출뿐(별도 큰 작업).

---

## 1. 구상
`denn-room-default-tool.html` = 얇은 셸 + `<iframe src="denn-mockup-tool.html?adminRoomSetup=<key>&roomOnly=1">`.
denn-admin.html이 기존 `window.open(mockup?adminRoomSetup=...)` 대신 이 래퍼를 연다.

## 2. 작동하는 부분
- `roomOnly=1`만으로 부트 클래스 토글(L15: `adminRoomSetup||roomOnly`) → header/tabbar/page 숨김, 룸 모달만 표시.
- localStorage `denn_admin` + IDB `denn_shared_db`는 **동일 출처 → iframe과 자동 공유**(데이터 흐름 유지).

## 3. 함정
### 함정 1 — `window.opener` 체인 단절 (기술)
- `markSavedAdminPreset`(L4699~4704)이 저장 결과를 `window.opener`(denn-admin 탭)의 `S.roomBackgroundSettings`/`persistState`/`renderGuideBgs`에 동기화.
- iframe은 `window.open` 산물이 아니라 **`window.opener===null`** → 이 즉시 반영이 깨짐.
- 우회: iframe → `window.parent`(래퍼) → 래퍼의 `window.opener`(denn-admin) **postMessage 2단 릴레이**를 신설해야 함. 복잡도·회귀면 증가.

### 함정 2 — 실익 없음 (구조)
- iframe 안에서 **mockup-tool 전체(모든 `?adminRoomSetup` 분기 포함)가 그대로 실행**. consumer 파일에서 admin 코드가 **제거되지 않음**.
- 따라서 4단계 알맹이(구 flat 쓰기 제거 / adminRoomSetup 20+곳 분기 제거 / pause·Storage 가로채기 정리)를 **전혀 열어주지 못함**.
- 현재도 denn-admin이 mockup-tool을 `?adminRoomSetup`으로 새 탭에서 엶 → iframe 래퍼는 **새 탭을 임베드로 바꾸는 포장 변경**일 뿐. opener까지 깨면서 얻는 게 없음.

## 4. 진짜 분리의 유일 경로
- **공유 렌더 모듈 추출**: `rmRender`/`sgDraw`/`RM`/`SG`/룸모달 DOM/설정 로드·저장/이벤트(~1500-2000줄)를 `denn-room-render.js`로 빼서 consumer와 신규 operator 파일이 공유 import.
- 그래야 operator 파일이 operator 키만 생산 + consumer 파일에서 admin 분기 제거(4단계) 가능.
- 비용: **현재 정상 동작하는 consumer 목업툴 본체를 건드리는 큰 리팩터**(회귀 위험·검증 부담 큼). 앞서 보류한 옵션.

## 5. 권고
- **iframe 래퍼 비권장**(비용 > 실익, opener 릴레이 신설 + 4단계 unlock 못 함).
- 컷오버 **정확성 목표(양방향 오염 차단)는 1/2a/2b로 이미 달성**. 3·4단계는 격리/청결 목적.
- 선택지:
  1. **모듈 추출에 착수**(큰 리팩터, 충분한 시간/검증 예산 확보 시) — 4단계까지 진짜로 여는 유일 경로.
  2. **현행 유지**(같은 파일 `?adminRoomSetup` 모드 + 2a/2b scope 분리) — 오염은 막혀 있으니 기능적으로 충분. 3·4단계는 보류.
- 참조: docs/2026-05-31-room-settings-schema-contract.md(D3), docs/2026-06-01-scope-boundary-audit.md.
