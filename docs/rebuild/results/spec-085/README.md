# spec 085 — 고객 composer 결과 우선 작업대 시각 증거

스펙 084의 P1 finding **F-1**("고객 composer의 미리보기가 모든 컨트롤 아래에 있다")을 닫은 뒤의 화면이다.
모든 이미지는 **합성 데이터**이며 실제 Firebase/project/bucket/운영 데이터/네트워크는 **0**이다. 생성 주체는
`tests/e2e/mockup-preview.spec.ts`의 `spec 085 evidence` describe이고, 등급은 셋 다
**`PRODUCT_ROUTE`** — 빌드된 고객 entry(`index.html`)를 그대로 열고 카탈로그 JSON만 로컬에서 응답했다.

## 파일

| 파일 | 화면 / 상태 | viewport | 등급 | URL | 준비 절차 |
|---|---|---|---|---|---|
| `composer-workbench-1280x800.png` | composer · 데스크톱 작업대(왼쪽 sticky 미리보기 + 오른쪽 컨트롤) | 1280x800 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 카탈로그 URL을 합성 JSON으로 응답 → 액자 → 사이즈 하나 → 기본 액자 → 미리보기 만들기 → 블랙 → 합성 PNG 업로드 |
| `composer-workbench-390x844.png` | composer · 모바일 세로(미리보기가 컨트롤보다 먼저) | 390x844 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 위와 동일 |
| `composer-workbench-844x390.png` | composer · 모바일 가로(Canvas가 뷰포트 높이 예산 안) | 844x390 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 위와 동일 |

## F-1의 세 증상과 이 증거의 대응

| F-1 증상(스펙 084 실측) | 지금 |
|---|---|
| `390x844`에서 Canvas 상단이 page y≈1370px | 미리보기가 DOM·시각 모두 컨트롤보다 **먼저**다. 첫 화면에서 결과가 보인다. |
| `1280x800`에서 Canvas 상단이 page y≈1220px, 단일 컬럼이라 우측 여백이 빔 | `>=960px`에서 왼쪽 sticky 미리보기 + 오른쪽 컨트롤의 두 열 작업대. 조작과 결과를 동시에 본다. |
| `844x390`에서 Canvas 높이 683px > 뷰포트 | 높이 예산 `viewportHeight - 96`을 반영한 **logical plan**으로 다시 만든다(CSS 축소 아님). 이 뷰포트에서 Canvas는 294px 이하다. |

`844x390` PNG는 fullPage 캡처라 이미지 자체는 뷰포트보다 길다. 뷰포트 높이 대비 Canvas 크기는 PNG가 아니라
E2E `spec 085 workbench @ 844x390`의 단언이 증명한다(`Canvas height <= viewportHeight - 96`).

## 재현성

세 PNG는 같은 코드에서 다시 생성해도 SHA-256이 같다. 캡처 test에만 적용한 test-only 조건은 셋이며 모두
**같은 픽셀을 같은 방식으로 두 번 그리게** 할 뿐 비교를 느슨하게 하지 않는다. timeout·retry·skip·
screenshot tolerance는 쓰지 않는다.

| 조건 | 이유 |
|---|---|
| `page.clock.setFixedTime(2026-09-02T00:30:00Z)` + `timezoneId: Asia/Seoul` | 액자 미리보기의 시계는 실제 `Date.now()`를 읽는다(spec 031 §2.7). 고정하지 않으면 같은 화면이 촬영 시각마다 다른 PNG가 된다. `install`이 아니라 `setFixedTime`이라 타이머는 실제 시간으로 계속 돌고 제품 ticker 계약은 그대로다. |
| 캡처 직전 `document.getAnimations()` 전부 `finish()` | `transition-duration:0s`는 **이미 시작된** transition에는 적용되지 않는다(CSS Transitions). 준비 클릭이 남긴 색 transition이 촬영 시점에 보간 중이면 chip 색이 흔들린다. |
| `--disable-partial-raster` | 부분 raster는 compositor tile의 이전 픽셀을 재사용하므로 안티에일리어싱 가장자리가 tile 이력에 의존한다(스펙 084 보완 라운드 1 실측). |

## 이 폴더가 증명하지 않는 것

- 실제 기기 Safari/Android/카카오 인앱, 200% zoom, preview channel, 운영 데이터 — 전부 `NOT TESTED`다.
- 스펙 084의 다른 finding. **F-2**(영어 native 파일 선택 위젯)와 **F-7**(고객 화면의 마이그레이션 진단
  문구)은 이 단위의 범위 밖이며 화면에 그대로 남아 있다. Space·운영자 UI도 수정하지 않았다.
