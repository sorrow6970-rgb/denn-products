# 117 — PNG 합성 기능 관찰 검수

전송 완료: 코드bfd1e55/3c13334·문서2662e40/9839f2c,기존origin 일반push 성공.
HEAD=origin9839f2c·ahead/behind0/0,보호22+debug.log23 SHA전후동일·예상밖dirty0 확인.
이번은문서전송작업으로제품코드추가변경/시험재실행0. check3313/E2E9는직전구현검증실측이다.
최종기록1회전송후Git확인으로마치며PG-1은미선택. 아래BLOCKED는승인전이력이다.

최신 전송 승인: 사용자 `응 승인 다음 루틴진행해`로 직전 특정한 코드2커밋/문서11개와
기존GitHub목적지의 일반전송 승인 해소. 아래전송BLOCKED는과거이력,PG-1은미선택으로유지한다.

2026-09-09 / CODEX_PASSED(동일Codex자체검수,비연결범위). 코드3c13334.
[계약](../../rebuild/specs/117-background-png-capability-probe.md).

전송상태BLOCKED:권한검사가문서2커밋+push를실행전거절했다. 코드2커밋은로컬에있으며
문서11개는미커밋/staged0. 내부문서를기존GitHub원격에전송할구체승인부재가사유다.
검증PASS를push완료로표기하지않는다. 동일명령분할/간접실행으로우회0.

## 최종 실측

check3313=3295+probe15+selector3 PASS(format/lint339,7typecheck,112unit파일,2build).
targeted38=15+23 PASS. 새E2E9 PASS,기존fixture영향회귀Firefox82/Chromium82 PASS,
WebKit68PASS/기존PNG14FAIL. 시간2.0m/11.7s/30.3s,exit0/0/1. 새회귀실패0.
원래116지원게이트는NOT MET이며117의not-proven분류PASS와구별한다.
runtimeimport소비자는격리fixture/unit2군데만. 보호22SHA·고객JS/CSS/adminJS3SHA시작값과동일.
관련프로세스/포트0,이번staging6부재확인,diff--check PASS. 정확117코드7파일커밋3c13334.
기존116코드3파일은별도bfd1e55. 공유selector는스펙별변경만나누어커밋후최종check재통과했다.

## PG-1 — 다음 입력 표시 정책, 미결정

현재104/109는profile부재/tag부재를orientation1이나표시허가로승격하지않는다.
117은고정합성패턴만알고있어서사용자사진의위아래를증명하지못한다.

- A(권장): 방향metadata가없다는것이확인된허용subset파일에한해저장된픽셀방향을표시기준으로정한다.
  임의자동회전은하지않고,손상/해석불가/충돌/다른미검증metadata는계속거부한다.
  PNG eXIf의현재픽셀에대한유효성을확인하지못하면계속거부한다.
- B: 방향metadata부재파일도계속거부한다. 실제사진허용범위는별도확인될때까지늘리지않는다.

A는사진의자연스러운위아래를자동판별한다는보증이아니다. 108의recognizedExif부재만으로
모든방향metadata부재를입증했다고보면안된다. 후속계약에서허용metadata subset과
같은bytes결속/기기예산/decoder선택을명시해야한다. PG-1만으로실제파일조회·제품연결·운영을열지않는다.
아직Founder선택없음. 질문은대화에제시했고,답변전에새허용정책/다음제품코드작성0.

## 경계 검토

- 실제사진/외부URL/사전evidence입력을받지않는다. 두고정PNG와18합성case만내부에서만든다.
- factory/import에I/O없음,run의Promise를microtask시작전에캐시해동일owner재진입중복실행을막는다.
- 하나씩decode→치수/픽셀검사→close/canvas0후다음. pending dispose는늦은close후종료.
- 모든결과decodeAllowed:false. synthetic-match도실제파일의metadata의미검증이나사진허가아님.
- WebKit분기는E2E의실측기대값에만있고구현에는UA/engine분기없다. 116실패를대체하지않는다.
- 현재export소비자는격리fixture와unit뿐이다. 제품entry/기본UI/104~115의계약은변경하지않는다.

## 초기 실측

targeted38=probe15+selector23 PASS. 고정18bytes연결SHA와직전release후다음decode순서를unit으로고정.
초기check3312=3295+probe14+selector3 PASS;추가byte/순서unit1반영뒤전체check는재실행한다.
새E2E:Firefox3/3(8.9s),WebKit3/3(2.1s),Chromium3/3(1.2s),각exit0.
정상은decode/close18,dispose전0,진행중dispose는decode/close1·다음0;FileReader/URL/외부요청0.
E2E통과는not-proven분류와해제를포함한117동작검증이지116의PNG14개방향일치가아니다.
기존fixture영향회귀82×3은순차검증중이다. 전체고객canonicalE2E는보호PNG때문에실행하지않는다.

## 다음 미해결 제품 경계

117probe는필요한환경증거하나일뿐이다. 실제사진의허용metadata subset/의미판정·JPEG와PNG의
입력별안전조건·기기메모리예산·100/109/114연결은후속정확계약이필요하다. 미검증사진거부유지.
동일Codex자체검수이며독립리뷰라고부르지않는다. 신규의존성/실제서비스/배포/자동화0.
