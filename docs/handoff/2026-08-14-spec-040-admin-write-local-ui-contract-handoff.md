# 핸드오프 — 스펙 040 후보 운영자 쓰기 로컬 UI 연결 계약

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_UI**

## 결론

현재 UI에 저장 버튼을 바로 추가할 수 없다. spec 036 controller는 카탈로그/revision을 보존하지 않고,
spec 035 draft는 특정 frame size에 연결되지 않았다. C5는 전체 문서 CAS이므로 baseline과 revision을
보존하는 write-session 경계가 먼저 필요하다.

## 권장 결정

- U-1=A: write-session controller를 먼저 만들고 실제 필드 편집/UI 저장은 분리
- U-2=A: dirty 재로드는 앱 내부 명시 폐기 확인
- U-3=A: 확정 upload 실패도 자동 retry 없이 사용자 명시 재시도

## 유지되는 차단

실제 Firebase·UID·IAM·배포·운영 쓰기·UI 저장 버튼·발행·legacy write·delete·자동 정리·C6·L-4는
승인되지 않았다. 보호 대상과 Founder 디자인 작업은 별도다.

## 다음

Founder는 U-1=A/U-2=A/U-3=A를 승인했다. write-session controller와 unit만 구현했으며
targeted 9/9, 전체 unit 1331/1331, Chromium 134/134를 통과했다. 다음은 Codex 독립 검수다.

## Codex 검수

동일 auth 재통지의 초안 초기화와 hostile input rejection 2건을 발견·보완했다. 보완 targeted 11/11,
전체 unit 1333/1333 PASS. 추가 결함 0으로 `CODEX_PASSED`다.
