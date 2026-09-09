# Spec107 — 구현·자체 검토

2026-09-09 / baseline1a35951 / 코드aa7ed09 / CODEX_PASSED / 동일 Codex 자체 검토, 독립 검수 아님.

[계약](../../rebuild/specs/107-tiff-orientation-tag-reader.md)의 정확 신규2파일 구현.
0th IFD의 Orientation 존재/부재·명시값만 frozen scalar로 반환한다.
native byte view/20Mbyte/256entry/table범위/정렬/중복/type/count/value 검사를 수행한다.
타 tag의 저장 영역 범위는 검사하지만 그 의미나 하위 IFD graph는 순회하지 않는다.
PARTIAL/imageOrientation NOT_VERIFIED/decodeAllowed:false가 성공에도 유지된다.
이는 JPEG/PNG profile 탐색·전체 metadata·pixel 방향·decode/100/102/UI 구현이 아니다.

## 실제 검증

- targeted `vitest run .../background-orientation.test.ts`:101/101 PASS.
- mockup typecheck 및 최종 `node scripts/check.mjs` PASS:
  format/lint321파일,7프로젝트typecheck,unit3025=이전2924+신규101,두앱build.
- 1~8×2endian16개,truncate26개 등 parameterized 합계101이다.101은 테스트 runner 출력 기준.
  freeze/원본불변/getter1회/nativebrand/공유·가변·분리buffer/import I/O0,경계/타입/부재/작업량 포함.
- 최초 TS2554는 테스트의 resizable ArrayBuffer 생성 구문을 Reflect.construct로 바꿔 해결.
  상태 문맥 불일치로 최초 patch 미적용·같은 오류 재출력 후 정확 patch 재적용, 최종전체검사 통과.
- 자체 검토에서 nextIFD의2byte count가0th영역에1byte 겹치는 경계를 보완하고 시험 추가.
- 테스트 설명의 독립 단어가 Tailwind에 잡혀 `.table{display:table}`21bytes가 추가됐다.
  generated CSS에서 이 규칙을 제외한 메모리상 hash가 baseline과 같은 것을 확인해 원인 분리.
  빌드결과를 직접 수정하지 않고 허용 test 설명을 directory로 바꾼 뒤 전체check 재통과했다.
  추가 I/O 검증 후 최종101/3025를 다시 확인했다. 잠깐의99/100/3024 결과를 최종 수치로 쓰지 않는다.

## 고객 영향·경계

최종 SHA256은105 완료 당시 baseline과 정확히 일치한다:
- customerJS345,362bytes `FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`
- customerCSS22,675bytes `6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81`
- adminJS294,873bytes `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`

제품 import 연결0, 기존제품코드/설정/Rules/lock 변경0. 보호/별도dirty22는 그대로 제외한다.
문서 로컬링크7/7,허용9/9(코드2+문서7),보호/별도dirty SHA22/22 동일,diff--check PASS.
포트4183/4184/4185/8080/9099/9199 listener0.코드커밋 뒤 문서7개만 후속커밋한다.
E2E는 계약상 실행0,105의Chromium292를 이번 검증으로 재사용하지 않는다. PNG재생성0.
native8방향/실제사진/기기메모리/전체metadata/P1·P2/디코더/UI연결은 NOT TESTED.
500kB 기존chunk경고·Git ignore 접근경고는 설정변경 없이 보존했다. 설치/운영/자동화0.

## 다음

다음 후보는 JPEG/PNG에서 bounded TIFF profile을 찾아 이107에 넘기는 순수 container 조사·계약이다.
104와 동일bytes의 double-read/외부getter/변경 가능성, 중복 APP1/eXIf/XMP/압축metadata/thumbnail 오인,
PNG 의미 미확인 상태 및 복사 장부를 명시한 뒤 구현한다. 새 제품 decode 허가는 아니다.
범위·불확실성에 제품 선택이 필요하면 STOP, 그렇지 않으면 사용자 루틴 승인대로 계속한다.
