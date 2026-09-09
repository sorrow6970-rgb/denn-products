# Spec110 — native 인계 자체검토

2026-09-09 / code67dadeb / CODEX_PASSED(동일 Codex 자체검토).
[계약](../../rebuild/specs/110-background-evidence-native-verification.md).

무인자runner는여전히전체test.정확opt-in만고정파일2개를선택하고잘못된인자는staging보다먼저거부한다.
사용자인자를shell에전달하지않는다.기존temp경계·preview소유권·strictPort·전체E2E단언은변경하지않았다.
fixture에서만새factory를사용한다.109제품코드0변경,고객/admin번들불변.

검증실측:

- selector unit14=기존cleanup4+신규selector10 PASS.
- node scripts/check.mjs PASS:format/lint325,7프로젝트typecheck,unit3211=3201+10,2앱build.
- node scripts/e2e-run.mjs --background-evidence-only:Chromium34/34,4.9초 PASS.
  새23=형식2×태그8+부재4+release/cancel/dispose3.기존105의11도함께PASS.
- nativeFileReader1·take1·내용전수비교·동일Promise·freeze·고정취소/해제·잘못된MIME무시확인.
  browser시험의EXIF값1..8은**태그읽기**증거다.8방향회전픽셀검증으로과장하지않는다.
- URL/Image/Canvas/bitmap0,외부요청0,console error/warning0.실제사진/Filepicker/압축decode0.
- 보호SHA22/22불변,PNG출력0,diff--check PASS.이번temp denn-e2e-hcVx1y 없음,관련포트listener0.
- customerJS FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
  customerCSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
  adminJS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 기존과동일.

설치여부읽기에서root `playwright` import는해석불가였다.정본config의실제직접의존성`@playwright/test`로
수정해기설치Chromium존재를확인했으며새설치/다운로드0.기존chunk500kB/globalignore경고는설정변경0.
전체E2E·WebKit·Firefox·실기기·native회전·메모리·룸UI·운영은NOT TESTED다.
