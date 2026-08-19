# 스펙 051 후보 — space Firestore read adapter 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK**

확인일: **2026-08-19**

## 조사 범위와 결론

실제 Firebase/project/token/document에는 요청하지 않고 저장소, 설치된 Firebase Web SDK 12.17.1 타입과
Firebase 공식 문서만 읽었다. `spaces/{token}` 단일 문서를 읽어 스펙 050 open port에 넘기는 adapter는
기술적으로 구성 가능하지만, 기존 링크 호환에 영향을 주는 Q-1~Q-3 결정 전에는 구현하지 않는다.

## 확인된 현재 계약

- `firestore.rules`는 `spaces/{token}`의 `read`를 `if true`로 허용하고 create만 허용하며 update/delete를
  금지한다. 따라서 read 자체에 Anonymous Auth는 필요하지 않다. 실제 배포 Rules 상태는 NOT TESTED다.
- 레거시는 named app `denn-space-viewer`를 만들고 optional anonymous sign-in 후
  `getDoc(doc(db, 'spaces', token))`을 호출한다(`denn-mockup-tool.html:15467-15591`).
- 자동 token은 12 random bytes의 24자리 lowercase hex지만 `opts.token`은 검증 없이 허용했다.
  따라서 실제 기존 token이 모두 24-hex라는 주장은 **UNCONFIRMED**다.
- 설치 SDK 12.17.1의 공개 API에는 `doc`, `getDoc`, `getDocFromServer`, `getFirestore`가 있다.
- Web Firestore 기본 local cache는 memory이며 persistent cache는 명시적으로 켜야 한다. 이번 후보는
  persistent cache를 켜지 않는다.

## 공식 근거

1. [Get data with Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/get-data) —
   `doc` + `getDoc` 단일 문서 읽기와 `exists()`로 부재 판정. 2026-08-19 확인.
2. [Firebase JavaScript Firestore API](https://firebase.google.com/docs/reference/js/firestore_) —
   `getDoc`은 최신 데이터를 시도하지만 offline에서는 cache 반환 또는 실패 가능,
   `getDocFromServer`는 server 전용. 2026-08-19 확인.
3. [Access data offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline) —
   Web persistence는 기본 disabled, 명시 설정이 없으면 memory cache. 2026-08-19 확인.
4. [Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas) — document ID는 valid UTF-8,
   1,500 bytes 이하, `/` 금지, `.`/`..` 단독 금지, `__.*__` 금지. 2026-08-19 확인.
5. [Firebase App JavaScript API](https://firebase.google.com/docs/reference/js/app) — named app 초기화와
   `getApps()`/`getApp(name)`, 동일 이름·다른 config 오류. 2026-08-19 확인.

## 구조 후보

- 새 공개 표면 후보: `@denn/firebase/space-read` 서브패스. root barrel에는 re-export하지 않는다.
- facade는 fixed collection `spaces`와 validated document ID만 받아 `exists/data`를 반환한다.
- SDK는 factory 내부 dynamic import로만 로드하며 import만으로 app/network 0을 유지한다.
- port는 single in-flight read, 앱 자동 retry 0, raw SDK error/token/document/password 0인 safe error를 사용한다.
- 앱 timeout 후보는 legacy와 같은 20초다. timeout 뒤 SDK Promise가 늦게 완료될 수 있으므로 결과는 폐기하고
  UI/state를 늦게 변경하지 않는다. SDK 내부 네트워크 재시도 횟수는 단정하지 않는다.
- 실제 `?space=` parsing, password UI, scene 적용과 이미지 fetch는 별도 스펙이다.

## Founder 결정

### Q-1 — token 허용 범위

- **A (권장): Firestore 공식 document ID 제약을 만족하는 단일 segment를 UTF-8 byte 기준으로 허용.**
  기존 사용자 지정 token 호환을 최대화한다. token은 오류·로그/UI에 echo하지 않는다.
- B: 24자리 lowercase hex만 허용. 새 token에는 단순하지만 기존 사용자 지정 링크를 깨뜨릴 가능성이
  있어 실제 token 전수 근거 없이는 권장하지 않는다.

### Q-2 — 읽기 source

- **A (권장): `getDoc` + 기본 memory cache, persistent cache 활성화 0.** 문서는 update/delete 불변이라
  이미 읽은 존재 문서의 stale mutation 위험이 없고 legacy 동작과 같다. offline/cache 여부 자체는 성공
  payload에 노출하지 않는다.
- B: `getDocFromServer` server-only. cache fallback을 금지하지만 offline에서는 반드시 실패한다.

### Q-3 — Firebase app 소유와 구현 범위

- **A (권장): legacy 이름 `denn-space-viewer`의 named app을 재사용하고 config mismatch는 fail-closed.**
  read에는 Auth를 생성·로그인하지 않는다. `@denn/firebase/space-read` package export, injected facade/unit,
  SDK facade mock unit까지만 다음 local-only 구현에 허용한다.
- B: default app 재사용. customer page에서 단순하지만 향후 auth/service 소유권과 legacy 격리 의미가 달라진다.

## 계속 금지

실제 Firebase/network/project/token/document, live/emulator, Rules/config 변경·배포, anonymous auth 활성화,
write/create/update/delete, route/UI/scene 적용, 이미지 fetch/upload, 신규 의존성, package/lockfile 버전 변경.
