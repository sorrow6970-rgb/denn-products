# spec 088 - 고객 사진 선택 UI 증거

## 후속 증거 갱신: spec091 (2026-09-07)

사용자가 PNG3+이 README의 증거 범위 추가를 승인했다. 최종 canonical230/230 PASS(51.1초)에서
재생성한 영역3장을 직접 확인했다. picker 코드/동작/테스트는 변경하지 않았다. F-7 성공 호환 배지
제거를 적용한 제품에서 캡처했으며 최초 실패 실행과 이번 영역 PNG3의 SHA가 동일하다.
spec091 최초 Space timeout은 이번 미재현이며 원인은 UNCONFIRMED. 아래227/227는 spec088 이력이다.

| viewport | 현재 SHA-256 |
|---|---|
| 320x568 | 03BA60B261685A07D6BF8BECB6F21203C6F7875F277A3C37A997D4223538F6BC |
| 390x844 | 889A068CF9A3E191936ECA8FD000DA796E8B59ABE369BBD4346FDE313099146C |
| 1280x800 | 15F14274DC37A6E5E2F311B60AA1B199CB1A2A4CE7226790872C9F9D9431BF9E |

**현재 상태: GENERATED / LOCAL_VERIFIED (2026-09-07).** 사용자 승인 후 canonical E2E를 단독 실행해
227/227 PASS했다. 아래 3장은 최종 46px 선택 표면(실제 input 44px 이상)을 캡처했고 직접 열어 확인했다.
최초 미생성/실패 기록은 스펙 088 STOP REPORT에 보존한다.

생성: `tests/e2e/mockup-preview.spec.ts`의 spec 088 테스트. 실제 로컬 고객 route
`http://localhost:4183/` + 합성 catalog/단색 PNG. PRODUCT_ROUTE 등급이며 파일 선택 영역만 캡처한다.
숫자는 브라우저 viewport이며 PNG 자체 크기는 영역 캡처 크기다. OS 대화상자 캡처가 아니다.

| 파일 | viewport | 상태 |
|---|---|---|
| `photo-picker-320x568.png` | 320x568 | 사진 1 선택됨, 사진 2 미선택 |
| `photo-picker-390x844.png` | 390x844 | 위와 동일 |
| `photo-picker-1280x800.png` | 1280x800 | 위와 동일 |

Enter/Space chooser 이벤트와 동일 파일 재선택 뒤 캡처한다. 취소는 빈 files/change 및 cancel 이벤트로
모델링하며 실제 OS 대화상자 취소 검증과 구분한다. 기존 ready/clear/실패 재선택 테스트를 함께 실행한다.
실제 사진·파일명·Firebase·외부 네트워크·실기기·운영 전환은 NOT TESTED/범위 밖이다.

## 사용자가 확인하는 방법

위 PNG를 클릭해 사진 선택 영역을 확대해서 본다. 320px에서는 삭제 버튼이 다음 줄에 배치된다.
버튼의 검정 테두리는 키보드 초점 표시다. 전체 배치는 ../spec-085/의 최신 데스크톱/모바일 workbench
PNG를 본다. 그 화면의 보라색 사진은 합성 자료이며 고객용 장식이 아니다. 두 종류 모두 정적 캡처이고
클릭 가능한 실행 페이지가 아니다. 운영 데이터를 읽을 수 있는 기본 dev URL을 대체 링크로 제공하지 않는다.
