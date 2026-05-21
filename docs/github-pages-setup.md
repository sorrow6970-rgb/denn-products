# GitHub Pages 모바일 테스트 설정 가이드

작성일: 2026-05-21
선행 문서: `docs/firebase-setup.md` (Firebase Auth + Storage CORS 기본 설정)

GitHub Pages로 mockup-tool / admin을 정적 호스팅해서 모바일에서 즉시 테스트 가능하게 만드는 절차.

---

## 1. GitHub Pages 활성화

1. GitHub 저장소 진입: `https://github.com/sorrow6970-rgb/denn-products`
2. **Settings** 탭 → 좌측 메뉴 **Pages**
3. **Source**: `Deploy from a branch`
4. **Branch**: `main` / `/ (root)` → **Save**
5. 1-3분 후 상단에 다음과 같이 표시:
   ```
   Your site is live at https://sorrow6970-rgb.github.io/denn-products/
   ```

활성화 후 push할 때마다 자동 재배포 (1-2분 지연).

---

## 2. 접속 URL

```
mockup-tool: https://sorrow6970-rgb.github.io/denn-products/denn-mockup-tool.html
admin:       https://sorrow6970-rgb.github.io/denn-products/denn-admin.html
```

모바일 접속 방법:
- 카톡으로 자신에게 URL 전송 → 휴대폰에서 클릭 → 외부 브라우저(Safari/Chrome) 자동 오픈
- 또는 QR 코드 생성 (`https://www.qrcode-monkey.com/` 등) → 폰 카메라로 스캔

---

## 3. Firebase 추가 설정 (필수)

### 3-1. Authorized Domains 추가

1. Firebase Console (`https://console.firebase.google.com`) → 프로젝트 `denn-products`
2. **Authentication** → **Settings** 탭 → **Authorized domains**
3. **Add domain** → `sorrow6970-rgb.github.io` 입력 → Save

**이거 안 하면**: GitHub Pages에서 익명 로그인 실패 → Firebase Storage 업로드/읽기 차단 → 시안 이미지 안 보임.

### 3-2. Storage CORS

`docs/firebase-setup.md §3`에서 `origin: ["*"]`로 설정된 상태면 추가 작업 없음.
모든 origin 허용이라 `sorrow6970-rgb.github.io`도 자동 포함.

### 3-3. 검증

GitHub Pages **어드민** 접속 후 콘솔 (mockup-tool에는 dennFirebase 자체가 없음 — §5 참고):
```js
// isReady()는 동기 boolean, ready()가 Promise. 헷갈리지 말 것.
dennFirebase?.ready().then(r => console.log('Firebase ready:', r));
```
`true` 출력이면 정상.

종합 진단:
```js
(async () => {
  const fb = window.dennFirebase;
  if (!fb) { console.error('dennFirebase 미정의 (mockup-tool에는 정상)'); return; }
  console.log('isReady 즉시:', fb.isReady());
  await fb.ready();
  console.log('인증 완료 후:', fb.isReady(), 'uid:', fb.auth?.currentUser?.uid);
})();
```

만약 `false` 또는 에러 → Authorized Domains 추가 누락 의심.

---

## 4. 모바일 이슈 검토

### 이미 처리됨 (코드 측면)

| 항목 | 상태 |
|---|---|
| viewport meta | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (L5) |
| 터치 이벤트 | `ontouchstart` / `ontouchmove` / `ontouchend` 핸들러 존재 (L1108-1116) |
| 반응형 CSS | `@media(max-width:860px)`, `@media(max-width:480px)` 분기 |
| 카카오 채널 link | 외부 URL (`pf.kakao.com`) — GitHub Pages 무관 |
| HTTPS | GitHub Pages는 기본 HTTPS — Firebase Storage CORS 호환 OK |

### 잠재 이슈 + 대응

| 이슈 | 영향 | 대응 |
|---|---|---|
| localStorage 5MB 한계 | 데이터 누적 시 quota 초과 | mockup-tool은 어드민과 분리된 localStorage origin (`github.io`). 시안은 Firebase Storage URL로 로드되므로 거의 영향 없음 |
| iOS Safari 메모리 | 큰 PNG 처리 시 탭 강제 종료 | 1273×1800 PNG가 한계선. 큰 시안 업로드 자제 |
| 모바일 캔버스 성능 | 슬라이더 jitter | 이번 세션 fix들 (canvas cache, scale lock, sync compose path)로 데스크탑 수준 매끄러움 확보 |
| 카카오톡 인앱 브라우저 | window.open() 차단 | `kakaoUrl` 클릭 시 외부 브라우저로 이동 (정상 동작) |
| 모바일 Chrome passive listener | 슬라이더와 페이지 스크롤 충돌 | 슬라이더 영역에 `touch-action: none` CSS 필요 시 추가 |

### 모바일 환경 확인 paste (휴대폰 콘솔에서)

```js
(()=>{const issues=[];if(!navigator.onLine)issues.push('오프라인');if(!window.indexedDB)issues.push('indexedDB 미지원');try{localStorage.setItem('__t','1');localStorage.removeItem('__t')}catch(e){issues.push('localStorage 차단')}console.log('UA:',navigator.userAgent);console.log('viewport:',innerWidth+'x'+innerHeight);console.log('devicePixelRatio:',devicePixelRatio);console.log('touch:',('ontouchstart' in window));console.log('issues:',issues.length?issues:'정상')})();
```

---

## 5. ⚠️ 데이터 source — localStorage origin 격리

**핵심 사실**: mockup-tool은 `localStorage.getItem('denn_admin')`에서 어드민 데이터(시안 목록 등)를 읽음. **localStorage는 origin별로 격리**되므로:

| Origin | localStorage |
|---|---|
| `file://` (file 직접 열기) | A |
| `http://localhost:8000` | B |
| `https://sorrow6970-rgb.github.io` | C |

→ 데스크탑에서 등록한 시안은 GitHub Pages mockup-tool에서 **안 보임**.

### 해결: GitHub Pages 어드민에서 시안 등록
1. `https://sorrow6970-rgb.github.io/denn-products/denn-admin.html` 접속
2. 시안 1-2개 새로 업로드 + 저장
3. Firebase 자동 마이그로 PNG는 Firebase Storage에 (Firebase 저장은 origin 공유)
4. 같은 origin mockup-tool 새로고침 → 시안 보임

### dennFirebase는 mockup-tool에 없음
- Firebase SDK + `dennFirebase` wrapper는 **denn-admin.html에만** 존재 (L13951-14002)
- mockup-tool은 `dennFirebase.isReady()` 호출 불가 (의도된 설계)
- 대신 mockup-tool은 시안의 Firebase Storage URL을 직접 image fetch (CORS 설정으로 가능)
- 모바일 mockup-tool에서 Firebase 검증은 admin 쪽에서 수행

## 6. 권장 워크플로우

1. **GitHub Pages 활성화 직후**: 데스크탑 Chrome으로 URL 접속 → 정상 작동 확인
2. **Firebase Authorized Domains 추가** + 검증
3. **모바일 1차 테스트**: 카톡으로 자신에게 URL 전송 → 모바일 접속
4. **시안 1개로 골드 tint + 그림자 슬라이더 조작** → 깜빡임/성능 확인
5. **저장 → 카톡 보내기** 흐름 → `pf.kakao.com` 채널로 이동 확인

---

## 7. 잠재 문제 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 페이지 로드 후 시안 이미지 안 나옴 | Firebase Authorized Domains 미추가 | §3-1 단계 확인 |
| 시안은 보이는데 색상 변경 후 캔버스가 흰색 | CORS 미설정 또는 새 도메인 차단 | `docs/firebase-setup.md §3` 확인. `gsutil cors get gs://denn-products.firebasestorage.app` |
| 모바일에서 슬라이더 반응 안 함 | touch-action CSS 충돌 | mockup-tool CSS에 `.slider { touch-action: none }` 추가 |
| `dennFirebase.isReady()` false | Anonymous Auth 비활성화 또는 도메인 미허용 | Firebase Console → Authentication → Sign-in method → Anonymous → ON |
| mockup-tool에서 `dennFirebase is not defined` | 의도된 동작 — mockup-tool에 Firebase SDK 없음 | §5 참고. admin에서만 Firebase 사용. mockup-tool은 Storage URL을 직접 image fetch |
| mockup-tool에 시안 안 보임 (FTPLS 빈 배열) | localStorage origin 격리로 어드민 데이터 없음 | §5의 "GitHub Pages 어드민에서 시안 등록" 절차 |
| 카톡 보내기 클릭 시 아무 반응 없음 | popup blocker 또는 카톡 인앱 브라우저 제한 | 외부 브라우저(Chrome/Safari)로 다시 열기 |

---

## 8. 자동 배포 흐름

- `git push origin main` → 1-2분 후 GitHub Pages 자동 재배포
- 변경 확인은 `Ctrl+Shift+R` (캐시 무시 새로고침)
- 배포 상태 확인: GitHub repo → **Actions** 탭 → "pages build and deployment" 워크플로우

---

## 9. 보안 메모

- GitHub Pages는 public repo만 가능 (private repo는 Pages 비활성화 필요)
- mockup-tool HTML 자체가 public이라 영향 없음
- Firebase API 키는 클라이언트 측 public 키라 노출 OK (Storage Rules + Auth로 실제 권한 제어)
- 어드민 비번은 클라이언트 측 잠금이라 GitHub Pages 직접 접근 시 admin도 접근 가능 — 별도 도메인이나 라우팅 차단 필요 시 추후 검토
