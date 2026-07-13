# 2026-07-13 세션 핸드오프 — 소비자 오픈 전 정리 (버그감사 + 배치1 수정)

> 소비자/관리자: **https://design.dennproducts.com** (루트 `/` → denn-mockup-tool.html)
> 배포: `cd C:\repo\denn-products && FIREPIT_VERSION=1 firebase deploy --only hosting --non-interactive`
> ★이번 세션 커밋은 **로컬만** — 아직 push/deploy 안 함(사용자 확인 후).

---

## 이번 세션 = 멀티에이전트 버그감사(B) → 배치1 수정 + 파일정리(A)

### 방법론
- **A(안전 정리)** = 직접 수행.
- **B(버그 감사)** = 멀티에이전트 워크플로우(`denn-prelaunch-bug-audit`, 10영역 병렬 감사 → 각 발견 적대적 검증). 읽기전용. 68 에이전트, 3.2M 토큰, ~16분.
- 결과 원본: `docs/2026-07-13-prelaunch-audit-findings.json` (검증 통과 34건 전체 상세: symptom/rootCause/evidence/repro/fixSketch/fixNote).

### 감사 통계
- 총 58건 발견 → CONFIRMED 23 + PLAUSIBLE 11 + REJECTED 22. keep 34.

---

## ✅ 완료 (로컬 커밋, push 대기)

| 커밋 | 내용 | 감사# |
|---|---|---|
| `4fcf3be` | 죽은 stage5 프로토타입 삭제 + firebase ignore 정리 | A |
| `1b7af9d` | **share `denn_admin_pre_share_*` 백업키 무한누적 → 쿼터폭탄 방지** (write 전 옛키 prune) | #2 high |
| `02d4829` | 죽은 레거시 비밀번호 폼 제거 (DEFAULT_PW ReferenceError) | #17 |
| `a25aa31` | 케이스/프레임 빌더 영역삭제 selIdx off-by-one 보정(null-safe) | #22+#23 |
| `80592cf` | admin 자동저장 콘솔 스팸 로그 `?debug=1` 게이트(보수적: URL덤프/warn 보존) | #21 |
| `74d99b9` | Phase C 유지보수 인터벌 영구폴링 → 유계 self-clear(60s/40틱, 2→1개 병합) | #20 |
| `8728d1e` | Phase C 틴트 렌더캐시 무한증가 누수 → 유계 LRU(12, 활성 dataUrl 보호) | #6 |

### 검증
- **정적 구문**: `node --check` 인라인 classic 스크립트 전량 통과(mockup 108, admin 122, 에러 0).
- **동작 검증 미완**: 브라우저 확장 미연결로 스모크 테스트 못 함. → **push/deploy 전에 실제 로드+share 플로우+빌더 영역삭제+색슬라이더 눈검증 권장.**

---

## ▶▶ 남은 백로그 (미수정 27건, 우선순위순) — 상세는 findings.json

### 배치 2 — 소비자 오작동/튐 (검증 필요)
- **#9 (med, MOCK L900)** share import `location.reload()`가 saveAdminToIdb IDB 프로미스에 게이트 → IDB 무응답 시 **영영 리로드 안 됨**. 수정=`Promise.race([save, timeout(~1500ms)])` 또는 finalize(replaceState/sessionStorage/reload) 무조건 실행. 단일정의(안전).
- **#7 (med, MOCK L10975)** 업로드/textZone 문구 비우면 defaultTexts로 되살아나 **삭제 불가**. 근본=textValues가 default공급+live편집 이중용도. 수정=템플릿선택 시 f-* 입력에 default 시드 후 빈값=의도삭제로. 3개 렌더바디 공통(L10970 textValues 하나 고치면 커버).
- **#8 (med, MOCK L2613)** resize 리스너 디바운스 없이 매 이벤트 renderFrame+renderCase 전체 재렌더 → 스크롤 중 프리뷰 튐.
- **#5 (med, MOCK L2309)** 전역 input 캡처가 비위치 슬라이더(밝기/그림자/햇빛)에도 `__userMoved=true` → 운영자 force 블록 전체 해제. (배치4 #1과 연관.)
- **#4 (med, MOCK L4198)** 가로 전체화면 액자드래그 시 landFs 통합핸들러+가이드드래그 핸들러 동시처리(이중렌더/좌표발산).
- **#12 (med, MOCK L2047)** 액자드래그/휠/햇빛이 블록로컬 레거시 rmRender(L2047) 호출 → V106/V107 커버핏·dpr·v33 래퍼체인 통째 우회. (지뢰밭 근접.)

### 배치 3 — 운영자 데이터/스키마 (admin, 신중)
- **#3 (high, ADMIN L2028)** `mergeAdminStateSafe`가 리비전 아닌 **배열개수 점수(guideBackgrounds*10000 지배)**로 primary 결정 → 가이드배경 많은 기기가 최신 스칼라(brand/watermark/frameThickness/roomBackgroundSettings) 덮어씀 + 되돌린값 재전파. 수정=리비전(__cloudRev/__opRev) 기반 병합.
- #10 denn_admin 쿼터초과 dennSetLocalStorageV351 무음 → 소비자 조정 미저장 무피드백.
- #11 resetAll이 saveAll 호출→초기화 직후 stale DOM 되써넣기.
- #18 클라우드 자동저장 read-before-write 없이 Date.now() rev 무조건 덮어씀(다탭 clobber).
- #19 importJSON DEF 백필 없이 S 통째 교체(스키마키 누락시 후속 null).
- #16 focus/storage 이벤트가 편집중 가이드배경 그리드 재렌더→입력끊김.

### 배치 4 — 지뢰밭 (단독 세션 필수)
- **#1 (high, MOCK L3475)** 소비자 실폰 세로 저장이 `.mobile` 아닌 스코프드 base에 기록 → 회전 왕복 시 운영자 `.mobile`이 소비자 세로조정(크기 등 비-image-anchor 필드) 덮어씀. 근본=**저장판정(dennIsMobileEditCtxV=viewAs) ≠ 읽기판정(dennMergeMobileV=isRoomPortrait) 비대칭**. ★함정=dennIsMobileEditCtxV가 isRoomPortrait/Mobile 호출하면 06-29/06-30 **무한 상호재귀(페이지 행)** 재발 — 금지. 대칭 대안=세로 소비자 저장을 .mobile로 라우팅 or 병합규칙 세션조정 인지형. 양방향 base-pollution 함께 봐야. [[project_mobile_pc_guide_settings_attempt]] 참조.

### PLAUSIBLE 11건 (저신뢰, 개별 재검토) — findings.json 참조
#24 배경업로드 실패 무음삼킴(발급완료 표시), #25 4+개 resize핸들러 미조율 relayout, #26 admin-mobile-preview dpr 미적용 블러, #27 __dennRotCentered 미리셋, #28 세로전환 lock 480ms 가로재진입 방해, #29 Phase C가 window.Image/drawImage 전역패치, #30 가이드배경 순서변경 시 id없는 배경 방별설정 뒤바뀜, #31 saveAll 무조건 성공토스트, #32 cloud load 6초만 대기 후 window.S 병합, #33 installFrameOnlyDragEvents sunPos 무가드 역참조, #34 templateFields 공유템플릿 객체 변형.

---

## ★교훈/주의 (이번 세션)
1. **읽기전용 감사→선별수정이 정답**: 16k줄 배포파일을 에이전트 병렬편집은 지뢰밭. 감사는 멀티에이전트, 수정은 사람이 함정노트 보며 하나씩+커밋.
2. **함정노트가 값짐**: 각 finding의 fixNote에 N중 래핑/보호본체/재귀금지가 적혀 있음. 수정 전 반드시 확인.
3. push/deploy 전 브라우저 눈검증 필수(이번엔 확장 미연결로 정적 구문검증만).
