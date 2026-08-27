# Space V2 proof reader adapter Founder decisions — 2026-08-26

## 승인

Founder가 이 대화에서 다음을 명시 승인했다.

- **MM-1=A** — customer V1 document reader가 소유하는 `denn-space-viewer` named Firebase app을 exact
  config match로 재사용한다. admin `[DEFAULT]` app과 별도 named app을 만들지 않는다.
- **MM-2=A** — 새 package subpath를 만들지 않고 기존 `@denn/firebase/space-read`에 V2 proof reader
  이름과 타입을 명시 export한다. root `@denn/firebase` barrel은 변경하지 않는다.
- **MM-3=A** — exact V2 object path 검사 뒤 `getMetadata()`로 fullPath/contentType/size를 확인하고,
  `getBytes(ref,maxBytes)`로 bounded bytes를 읽은 뒤 metadata size와 실제 bytes 길이를 대조한다. 제품
  자동 retry는 0이다.
- **MM-4=A** — metadata와 bytes 전체에 단일 20초 wall-clock budget을 적용한다. timeout 뒤 늦은 read
  결과는 무시하며 SDK request abort 또는 물리 network 요청 정확히 1회를 주장하지 않는다.
- **MM-5=A** — 기존 `storage.emulator.rules`, `firebase.emulator.json`, `demo-denn-emulator`를 재사용해
  approved synthetic seed와 unauthenticated public metadata/bytes read를 opt-in 검증한다. Rules와 emulator
  JSON 본문은 변경하지 않는다.
- **MM-6=A** — package adapter/test와 `vitest.emulator.config.ts` include 1건만 제품 범위로 허용한다.
  `apps/**`와 production import/UI는 0이며 customer bundle hash를 유지한다. 전체 Chromium E2E는 이번
  package-only 단위에서 NOT RUN 예외로 두고 PASS라고 주장하지 않는다.

## 승인 범위의 의미

이 결정은 스펙 079 package-only 구현과 local unit/emulator 검증만 승인한다. 실제 Firebase project,
bucket, live network, CORS 변경·확인, Rules/Hosting deploy, actual UID, customer production route/UI,
admin issuer, URL/clipboard, publish, orphan delete/cleanup은 승인하지 않는다.

스펙 079 통과 후 browser PNG decoder와 customer V2 production composition/UI는 별도 스펙이다. 실제
UI/UX 구현은 Founder의 기존 지시대로 Claude Code가 담당한다.
