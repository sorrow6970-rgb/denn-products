# 118 계약·구현 자체 검토

전송 승인 해소(2026-09-09): 사용자 `승인할게`로 코드d543d8d+문서8개와 최종기록을
기존GitHub/rebuild/modern-studio로 일반전송 승인. 아래 전송 STOP은 승인 전 이력이다.
시작1/0·staged0,보호23+번들3 SHA동일 확인. 검증 재실행이 아닌 전송 전 무변경 확인이다.

2026-09-09 / 기준8a10fe6. 동일 Codex; 독립 검수 아님.

## 계약 검토 — CONTRACT_REVIEW_PASSED

- PG-1=A는 부재 확인 시 저장 픽셀 기준 선택이며, 확인 불가까지 허용하는 결정이 아니다.
- 104는 envelope 검증,108은 APP1/eXIf 중심 부분 증거다. 다른 APP/COM/ancillary를 무시하므로
  108 `exifPresence:absent`를 새 허가값으로 변환하면 안 된다.
- 118은 정확 core-only 부분집합을 별도로 걷고 `decodeAllowed:false`를 유지한다.
- 원본byte view를 동기 재검사하며 외부 callback/await를 끼우지 않는다. blob owner 증명은 별도다.
- 기존 브라우저 지원 실패·제품 연결·metadata 해석을 우회하지 않는다. 코드 신규2+문서8로 제한.

근거: [118 계약](../../rebuild/specs/118-background-metadata-absence-contract.md),
[PG-1 결정](../decisions/2026-09-09-pg1-background-direction-absence-decisions.md),
`apps/mockup/src/room-placement/background-input.ts`, `background-container.ts`의 현재 구현.

## 구현 검증

코드 **d543d8d** / CODEX_PASSED (동일 Codex 자체 검수, 비연결 범위만).

- targeted127 = 신규45 + 기존108 회귀82, exit0. 전체unit3358 = 이전3313 + 신규45,113파일 PASS.
- `node scripts/check.mjs` exit0: format/lint341파일,7패키지/app typecheck,unit,2개 production build.
- 최초check는 새 테스트의 `new ArrayBuffer(32, options)` TS2554로 실패. 기존104/108 테스트와 같은
  `Reflect.construct`로 실제 resizable buffer를 생성하도록 수정했다. 설정/타입lib/의존성 변경0.
  이후 전체check 및targeted 재실행 PASS. 런타임 기대값 완화0.
- mockup entry345.36kB/gzip105.80kB,admin entry294.87kB/gzip91.38kB(빌드 출력 반올림값).
  기존555.25kB SDK chunk warning 유지; 이를 새 실패나 해결된 경고로 표기하지 않는다.
- 보호/별도dirty23 + 번들3 =26 SHA 전부 시작과 동일. 정확코드2/문서8,예상밖diff0,diff--check PASS.
- production import 검색0 및 고객JS/CSS/adminJS hash 동일. native/E2E 새실행0,포트/브라우저 기동0.
  이번 검증은 unit/check뿐이다. 기존116 232PASS/14FAIL,117 E2E9는 과거 실측으로 유지한다.

| 번들 | SHA-256 |
|---|---|
| mockup JS index-jnlo-lEH | FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A |
| mockup CSS index-DEnCZ-27 | 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81 |
| admin JS index-C5iqMAWP | B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 |

## 남은 경계

실사진/실기기/native 부분집합 decode/UI/운영은 NOT TESTED. decoded pixels와 결속하는 immutable
owner 계약이 다음 단계다. 이 결과 자체는 위조 방지 증표가 아니며 PG-1 승인만으로 Blob을 허가하지 않는다.
성공은 여전히 METADATA_ABSENCE_ONLY/decodeAllowed:false. 배포/업로드/metadata 제거/자동화0.

## 전송 STOP

문서8개 commit/push 명령이 실행 전 권한검사에서 거절됐다. 이전 승인과 다른 내부문서 payload의
GitHub 전송에 직접 승인 필요하다는 사유다. 코드d543d8d만 로컬,origin8a10fe6·1/0,staged0.
기존 https://github.com/sorrow6970-rgb/denn-products.git 의 rebuild/modern-studio로 코드2+문서8을
일반전송하고 같은문서의 결과를1회 기록할 승인 전 재시도/분할우회/다음구현0. PG-1=A는 유지.
