# 132 실제 Composer source 계약 검토

2026-09-11 / e0f69e7=origin·0/0.131595cb6a/e0f69e7 DONE.
현재 FP-1=A/FP-2 유효 / LOCAL_SUPPLY_DIAGNOSTIC_COMPLETED(동일 Codex),132 S-11~S-12.
132 현재 CONTRACT_REVIEW_IN_PROGRESS: debug.log기존추가분보존예외승인. 아래 STOP은 과거 이력.

PreviewComposer·PreviewSection·BrowseFlow·130 hooks/owner·131hook·102capture를 대조했다.
source 등록기만 붙이면 충분하지 않다. passive photo report,art 요청/ready 불일치,폰트환경 변경,
state updater 부작용 및 부모 pending 선택의 시간차가 남는다.132spec QUESTIONS에 기술 항목3개 고정.
현재 일반 구조 검토는 사용자 루틴으로 계속하며 Founder 재승인 대기로 넘기지 않는다.
새 제품/권한 판단이 생기면 별도 분리한다. API/기능을 추정하여 구현하지 않는다.
코드 후보13/문서7,아직 확정 전. 제품코드0/새unit·native NOT TESTED.
131최종 check3732/targeted133/native64는131 결과로만 보존한다.

## 재개 검토 — a85da9f 기준

031:33/54–55/216–218과 PreviewComposer:420–438의 font 존재 가정을 대조했다.
W3C CSS Font Loading §3.3은 없는 family에도 check=true인 경우를 명시한다.
공식 URL/문서 버전·확인일과 진단 행렬은132spec 마지막 절이 정본이다.
빈 페이지3엔진×2check=6 true,각 fontFaceSet.size0/요청0. 실제 폰트 목록 조사0.
tracked/일반검색 font파일0,운영·ignored자산·실제기기 상태 UNCONFIRMED.
폰트stamp/ready만으로family증명을 위조하거나text를 빼서132를 통과시키지 않는다.
FP-1=A(권장:관리형폰트 공급계약) 또는B(명시적대체허용)는 제품방향,아직미선택.
131FAIL 소급판정 아님;131합성 source 검증 범위와 별개의 기존계약 가정 결함이다.
제품변경0/전체check·regression 재실행0. 문서7만 보완,보호23SHA불변,stage/commit/push0.

## FP-1=A 공급 문서 보완 검수

최신 `응 보완해`는 직전 권장A와 문서보완의 직접승인.결정 정본1+기존7=정확문서8.
132 S-1~S-7 검수: 출처/사용권/byte hash/face/style/coverage/재현근거를 분리,
check=true/loaded/cmap를 전체문자·glyph 재현 증명으로 확대하지 않음,
폰트차용 수명/옛cleanup/자동대체0/기존031·print·Space무수정과 자산취득 전STOP 명시.
현재자산 UNSELECTED/NOT PROVIDED,실제license/coverage/신규구현시험NOT TESTED 유지.
이전반례진단을 다시 실행하거나132제품게이트 PASS로 계산하지 않았다.
문서정합성 자체검토 통과,전체132 구현 검토와입력/부모기술항목은 미완.
일반 Git전송은 기존지속승인 범위의문서8만.보호/실제font/운영정보는 전송하지 않는다.

## 공개 후보·사용권 문서 자체검토 — 2026-09-11

공식 근거의 제목/URL/확인일은132 S-8~S-9에 명시했다. DM Sans와 Noto Sans KR을 자동 대체
관계로 만들지 않았고, metadata source commit을 배포 pin/hash로 오인하지 않았다.
Noto의 RFN Source,DM header의 RFN 미선언,출력물과 font 재배포 조건을 구분했다.
latin/korean subset 표기는 실제 glyph·shaping 검증이 아니다. normal-only 후보에 synthetic italic0.
가변 원본3파일의 byte/face/버전/크기/성능 UNPINNED 또는 NOT PROVIDED/NOT TESTED 유지.
문서 조사 자체검토 PASS는 실제 공급·제품 게이트 PASS가 아니다. 신규 unit/E2E/build 실행0.
FP-2는 로컬 후보 취득의 별도 권한이며 제품 family/UI 승인 아님. STOP으로 문서8 unstaged 보존,
stage/commit/push/폰트binary 접근0. 기존 FP-1=A는 재질문하지 않는다.

## FP-2 로컬 공급 검증 자체검토

승인범위3원본+고지,고정배포SHA·정확경로·진단절차S-11을취득전기록했다.
원본5 size/Gitblob 일치,SHA256과고지본문결속 확인.제한적sfnt/checksum/name/axes/cmap3검사.
로컬probe 소스·결과는Git제외이며제품용parser/정규test로승격하지않았다.
기설치native3엔진×3=9진단은로드/유한양수폭/비어있지않은paint/ownface해제/page요청0만증명.
브라우저별폭차이,기본instance/문자지원차이를기록하고pixel/shaping/제품재현PASS로확대0.
처음newPage실패는일반실행9완료와함께보존,내부원인은미확정. browser stderr경고별도기록.
설치/font변환/실제앱·OS목록·운영접근0.131기존check3732/native64를재실행하거나새PASS로계산0.
다음은동일문서에서전체132계약검토.제품등록·새의존성·배포권한은FP-2에포함되지않는다.

최종검수 STOP:보호debug.log에SharedImage3줄363bytes추가,이전1075byte prefix SHA기준동일.
자동추가는최초native시각과일치한다.보호게이트23/23불변이아닌22/23으로FAIL.
직접편집·복원·stage0,기준hash갱신0.추가로그보존예외는사용자지시후에만처리한다.
기본번들3불변/diffcheck PASS,fetch로e4df5c9=origin0/0.문서8미전송이며전체완료판정0.

보호STOP해소:직전질문에대한사용자승인으로debug.log1438bytes/정확SHA보존·Git제외처리.
현재값동일/다른22기준불변재확인,직접로그수정/복원/전송0.새보호변경일괄허가는아니다.
132 S-14/결정정본에승인이력추가하고문서전송·기술검토재개.제품132완료판정은하지않는다.

입력/부모추가검토:132 S-15에event→pending→commit후보와RAF이전구멍을기록했다.
imageTransform.move는void이며commit callback은RAF뒤이므로기존후보13만확정할수없다.
catalog retry는error전용으로ready실시간갱신을만들어주장하지않았다.상위snapshot/currentness연결은미구현.
자간0뿐인폰트진단을공유executor의글자별측정재현으로확대하지않았다.
문서검토의근거·한계구분PASS,전체132 구현계약은검토중.추가제품파일변경0/신규시험0.

## S-16~S-18 구조 문서 검수 — 2026-09-11

current0cfd577의controller/drag/hook/실제전달경로를대조했다.구조설계부분문서검토PASS(동일Codex).
drag는phase만이아닌불변snapshot identity와revision,callercommit을결속한다.상태교체→통지→
재진입생존검사→RAF순서,취소settlement/lateRAF/통지throw를명시했고,기존정상pointerupflush는유지한다.
catalog는getState.ready만검사하지않는다:detach active=false와같은document의재수신을구분하는
readReadyIdentity를제안했고기존network/retry정책은늘리지않는다.깊은불변성증명주장0.
child-first layout에서부모rebase전source차단및후속commit등록,standaloneconsumer의guard부재차단을명시했다.
원13+추가9=구조22파일,PreviewSection/selection/131hook무수정.전체폰트/print범위는별도로미확정이다.
공식React useSyncExternalStore와W3C FontFace descriptor를대조했다.문서API정의와실제native효과를구분한다.
구조구현·unit/native·모든weight/axis·제품재현은NOT TESTED.이번browser/다운로드/제품수정0.

## S-19~S-23 폰트 결속 설계 문서 검수 — 2026-09-11

판정: DOCUMENT_REVIEW_PASSED(동일 Codex). 전체132 구현 계약 통과/제품 CODEX_PASSED는 아니다.
기준05d0971에서 실제 Composer measure/trial/final,PreviewCanvasSurface/hook/surface,
102 frame-snapshot,print exporter,Space V1 frame-plan/preflight와 V2 PNG 표시를 읽었다.

- 측정 전 runtime geometry projection을 선택하고 원본 catalog/최종 plan 후치환0을 명시했다.
  공유 executor에 새 family resolver를 추가하는 대안은 이번 미채택이다.
- plan-bound 차용은 동일 plan 검사/owner retire/물리적 해제/예외·재진입을 분리한다.
  preview의 passive 갱신을 그대로 증명으로 삼지 않고,같은 commit의 plan/binding snapshot이 필요하다.
- print는 원래 클릭 plan을 보존한다. 일반 문구 편집과 font 무효화를 구분하며,toBlob 이후 무효 결과의
  download를 차단하는 보완이 필요하다.102는 기존 execute 주입과 source gate를 재사용한다.
- 발견 사항: build.ts:measureWithSpacing의 문장 전체 폭과 executor의 code-point 폭 합산은 다른 알고리즘이다.
  S-21에서 spacing !=0만 개별 합산하는 최소 보완과 합성 AV 반례를 고정했다. 실제 폰트 오차 실측 주장0.
  공개 port/plan 스키마/보호 index.ts를 바꾸지 않지만 shared builder 회귀는 필수다.
- Space V1 fail-closed/V2 PNG를 관리형 font 때문에 새로 열지 않는다. 원래13+구조9+font13=후보35,
  이번 실제 변경은 문서8이다. 예상 파일과 현재 수정 허용을 구분했다.
- W3C Font Loading3·Fonts4와 WHATWG Canvas 본문을 확인했다. API/descriptor의 존재를 설치된
  엔진의 axis/shape/pixel 검증으로 확대하지 않았다.출처/확인일/Working Draft 상태는 S-22에 기록했다.

남은 게이트: context profile/native 지원·실효 axes·coverage/cluster,전체35파일 통합 계약과 정확 명령,
제품 자산 적용 권한. 다음 SPEC132_CONSOLIDATED_CONTRACT_REVIEW; 일반 기술 사항 재승인 질문0.
이번 신규 browser/제품 unit/E2E/build 실행0.131 check3732/native64와 공급 진단9는 기존 결과만 유지한다.
