# Space V2 Rules·emulator Founder decisions — 2026-08-26

## 승인

Founder가 이 대화에서 다음을 명시 승인했다.

- **JJ-1=A** — `rebuild-space-assets/objects/{uuid}.png` 목표 match 신설. 공개 read, 승인 UID의
  create-only, update/delete 거부.
- **JJ-2=A** — `spaces/{token}`에서 `schema == 'space-v2'` create만 승인 UID와 exact outer keys로
  제한하고 V1 create 호환은 유지.
- **JJ-3=A** — `spaces` collection list 거부, token을 아는 get만 공개 유지.
- **JJ-4=B** — 실제 운영자 UID 제공 보류. 배포 대상 Rules에는 placeholder를 유지하고 live deploy를
  차단. emulator에서는 실제 UID와 구분되는 고정 합성 UID만 사용.
- **JJ-5=A** — V2 orphan 삭제 보류 유지. mapping/customMetadata/backend/delete 권한/정리 구현 0.
- **JJ-6=A** — 결과 미확정은 사람 판정. 앱 자동 재시도 0.

## 승인 범위

스펙 075 계약, 배포하지 않는 목표 `storage.rules`/`firestore.rules`, UID만 다른 emulator 사본,
기존 `firebase.emulator.json`과 `demo-denn-emulator`를 이용한 opt-in local 검증까지다.

실제 UID 추측·입력, 실제 Firebase/project/bucket/network, Rules/Hosting deploy, SDK adapter, UI/URL,
orphan 삭제·자동 정리, mapping·customMetadata, backend, publish는 승인하지 않는다.

## E2E 경계

Founder는 같은 지시에서 스펙 074의 전체 Chromium E2E 예외 종료를 승인했다. 이 결정은 스펙 075의
local Rules/emulator 검증을 생략한다는 뜻이 아니다. 스펙 075는 opt-in emulator 게이트가 필수다.

이후 Founder는 이 대화에서 **`스펙 075 E2E 예외 종료 승인`**을 별도로 명시했다. default emulator
20/20과 별도 cutover emulator 4/4를 포함한 local 게이트는 이미 통과했으며, 전체 Chromium E2E가
Rules를 검증하지 않으면서 보호 PNG를 재작성한다는 미실행 사유를 숨기지 않는 조건으로 스펙 075를
종료한다. 이는 full-E2E PASS, 실제 Firebase 검증, deploy 또는 다음 스펙 착수 승인이 아니다.
