# spec 084 — local visual readiness evidence

로컬 Chromium에서 실제로 도달한 화면만 담는다. 모든 이미지는 **합성 데이터**이며 실제 Firebase/
project/bucket/운영 데이터/네트워크는 0이다. 생성 주체는 `tests/e2e/local-visual-readiness.spec.ts`이고
자동 측정 원본은 같은 폴더의 `measurements.json`이다. 판정과 finding은
`docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`에 있다.

## 증거 신뢰 등급

| 등급 | 이 폴더에서의 의미 |
|---|---|
| `PRODUCT_ROUTE` | 빌드된 제품 entry(`index.html`)를 그대로 열고 카탈로그 JSON만 로컬에서 응답했다. |
| `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | 제품 component를 합성 composition 안에서 렌더한 E2E fixture 페이지다. **제품 route가 아니다.** |
| `FIXTURE_CONTROL_ONLY` | harness 제목·진단값·상태 전환 버튼. 이 폴더에는 **한 장도 없다**(캡처에서 제외했다). |

fixture 페이지를 캡처할 때는 제품 영역만 locator screenshot으로 담거나(운영자 2건) 캡처 직전 harness
control을 페이지에서 숨겼다(고객 Space 3건). 제품 source의 DOM·문구·스타일은 바꾸지 않았다.

## 고객 앱

| 파일 | 화면 / 상태 | viewport | 등급 | URL | 준비 절차 |
|---|---|---|---|---|---|
| `browse-ready-1280x800.png` | browse · ready(액자 + 사이즈 하나 선택, 템플릿 카드 노출) | 1280x800 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 카탈로그 URL을 합성 JSON으로 응답 → 액자 → 사이즈 하나 |
| `browse-ready-390x844.png` | browse · ready | 390x844 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 위와 동일 |
| `composer-ready-1280x800.png` | composer · ready(실제 Canvas에 합성 사진 합성) | 1280x800 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 액자 → 사이즈 하나 → 기본 액자 → 미리보기 → 블랙 → 합성 PNG 업로드 |
| `composer-ready-390x844.png` | composer · ready | 390x844 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 위와 동일 |
| `composer-ready-844x390.png` | composer · ready(모바일 가로 상당) | 844x390 | `PRODUCT_ROUTE` | `http://localhost:4183/` | 위와 동일 |
| `space-v2-password-gate-390x844.png` | Space V2 · 비밀번호 입력 전 | 390x844 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…/e2e-space-production-route-fixture.html?mode=v2` | fixture V2 모드 진입, 인증하지 않음 |
| `space-v2-viewer-390x844.png` | Space V2 · 인증 후 저장된 시안 열람(실제 Canvas) | 390x844 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…?mode=v2` | 합성 비밀번호를 Enter로 제출 |
| `space-v2-viewer-1280x800.png` | Space V2 · 인증 후 열람 | 1280x800 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…?mode=v2` | 위와 동일 |
| `space-v1-blocked-390x844.png` | Space V1 · 인증 후 표시 거부 안내 | 390x844 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…/e2e-space-production-route-fixture.html` | 기본(V1) 모드로 진입 후 인증 |

## 운영자 앱

| 파일 | 화면 / 상태 | viewport | 등급 | URL | 준비 절차 |
|---|---|---|---|---|---|
| `operator-shell-default-off-1280x800.png` | admin root · 제품 기본값(모든 Firebase gate off) | 1280x800 | `PRODUCT_ROUTE` | `http://localhost:4184/` | 빌드된 admin entry를 env 없이 그대로 열기 |
| `operator-shell-default-off-390x844.png` | admin root · 제품 기본값 | 390x844 | `PRODUCT_ROUTE` | `http://localhost:4184/` | 위와 동일 |
| `operator-c5-editor-ready-clean-1280x800.png` | C5 인쇄 실물 치수 편집기 · ready-clean(A4 선택) | 1280x800 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…/e2e-admin-write-fixture.html` | 합성 기준본 로드 → A4 선택 · `frame-print-size-editor` 영역만 캡처 |
| `operator-c5-editor-ready-clean-390x844.png` | C5 편집기 · ready-clean | 390x844 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…/e2e-admin-write-fixture.html` | 위와 동일 |
| `operator-space-v2-issue-frozen-1280x800.png` | Space V2 발급 panel · 시안 고정 후 비밀번호 대기 | 1280x800 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…/e2e-space-v2-issue-fixture.html` | 기준본 로드 → A4/전체 사진/블랙 → 합성 PNG → 시안 고정 · `space-v2-issue-panel` 영역만 캡처 |
| `operator-space-v2-issue-frozen-390x844.png` | Space V2 발급 panel · 시안 고정 후 | 390x844 | `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | `…/e2e-space-v2-issue-fixture.html` | 위와 동일 |

## 캡처하지 않은 매트릭스 항목

| 항목 | 상태 | 이유 |
|---|---|---|
| 고객 Space V1/V2 · 제품 entry(`/?space=<token>`) | `NOT TESTED` | 제품 entry는 실제 Firestore 문서를 읽어야 도달한다. 실제 network는 이 단위에서 금지다. |
| 운영자 C5 편집기·발급 panel · 제품 entry(`/admin`) | `NOT TESTED` | 세 gate가 제품 기본값에서 off이고 실제 Firebase 값 주입은 금지다. |
| dirty/conflict/save-error 등 C5 쓰기 실패 상태 | `NOT TESTED` | 이번 캡처 범위에서 안전하게 도달하는 절차를 정하지 않았다. 후속 단위에서 정의한다. |
| 실기기 Safari/Android, preview channel, 실제 데이터 | `NOT TESTED` | 별도 승인 단위다. |

## `measurements.json`

캡처 18건(PNG 14장 + PNG 없이 320px 측정만 한 3건 + 320px composer 1건)의 원본 측정값이다. 각 항목에
overflow, viewport 밖 control, 44px 미만 target, native range 별도 기록, 키보드 walk(순서·focus 표시),
axe serious/critical, console error/warning, 외부 request, Canvas CSS 크기, 금지 문자열 노출 여부가 있다.
