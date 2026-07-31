# 스펙 033 로컬 액자 PNG export 인계

상태: **DONE**

- 계약: `docs/rebuild/specs/033-local-frame-png-export.md` (`4ee162e`)
- Founder E-4~E-6 결정: `b0f633c`
- 구현: `4246503`
- 구현 기록: `9e2d408`
- Codex 독립 검증: PASS

승인된 preview plan을 재빌드하지 않고 detached HTML canvas의 uniform transform으로 실행해
시험용 액자 PNG를 로컬로 내려받는다. 실패하거나 cm 비율과 logical aspect가 맞지 않으면 파일을
만들지 않는다. 업로드·주문 저장/전송·카카오·Firebase·network·deploy 경로는 없다.

최종 게이트는 frozen·format·lint·typecheck·build PASS, unit **1174/1174**, Chromium
**129/129**, diff check·forbidden diff·dist hash·ports·OS temp PASS다.

실제 인쇄물, 인쇄소 수용성, 다른 브라우저 엔진·실기기, 대용량 메모리·성능은 NOT TESTED다.
Founder가 오늘 작업을 종료했으므로 다음 스펙은 시작하지 않는다.
