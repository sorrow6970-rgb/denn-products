# spec089 운영자 PNG 선택 표면 — 로컬 시각 증거

2026-09-07, `tests/e2e/admin-space-v2-issue.spec.ts`의 spec089 테스트가 생성했다.
제품 commit `f95cb29`, 최종 canonical 230/230 PASS. route는 로컬
`http://localhost:4184/e2e-space-v2-issue-fixture.html`; 합성 catalog·8x4 PNG·fake writer를 사용한다.
**PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE**, 운영자 기본 route/운영 발급 검증이 아니다.

| PNG | viewport | 상태 | SHA-256 |
|---|---|---|---|
| `png-picker-320x568.png` | 320x568 | ready, 다른 파일 교체 뒤, 키보드 초점 | `6E08B27A4642960F3FD2FB4AC19FD7F2DB64CC0C020C0D31970761B11CB2A036` |
| `png-picker-390x844.png` | 390x844 | 위와 동일 | `013400ADA0C39714C2CA4A2A2E8EC06FEA9A09D8C0A7195F696AB75AFBCB7BFA` |
| `png-picker-1280x800.png` | 1280x800 | 위와 동일 | `094FAC7430D8C52C75FAB1724F9109A401DDFCEA308A7FDD0F0D3C2B450AEB31` |

캡처는 first fieldset을 사용해 선택 표면의 바깥 focus outline도 포함한다. 파일명에 적힌 수치는
viewport이며 잘라낸 PNG의 실제 크기와 다르다. 실제 PNG 안에는 시안 구성 컨트롤이 보인다.
취소는 no-file change/cancel 이벤트 상당 검증이며 OS 대화상자 화면을 캡처한 것이 아니다.
발급/저장 호출 0. 새 문구의 `선택됨`은 로컬 이미지 준비 상태이며 업로드/발급 성공 표시가 아니다.

전체 frozen panel은 spec084의 운영자 발급 캡처 두 장을 참조한다. spec083의 전체 페이지 두 장에는
제품 밖 fixture 제목·진단·테스트 조작부도 포함된다. 그 부분을 운영자 제품 화면으로 평가하지 않는다.
실제 route/UID/Firebase/live/실기기/OS chooser 시각 검증은 NOT TESTED. 테스트 서버는 종료됐다.
