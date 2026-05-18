# Firebase Storage 연동 — Console 설정 가이드

작성일: 2026-05-18  
Step 1 (SDK init + 헬퍼)이 코드에 들어갔습니다. 사용하려면 Firebase Console에서 아래 두 가지를 설정해야 합니다.

---

## 1. Anonymous Authentication 활성화

1. Firebase Console (https://console.firebase.google.com) → 프로젝트 `denn-products` 진입
2. 좌측 메뉴 **Build → Authentication** 클릭
3. **Sign-in method** 탭
4. **Anonymous** 클릭 → **사용 설정(Enable)** 토글 ON → 저장

이 단계 없이는 익명 로그인이 실패해서 Storage 업로드도 거부됩니다.

---

## 2. Storage Security Rules 적용

1. Firebase Console → **Build → Storage** 진입
2. (처음이라면 **시작하기** 버튼으로 버킷 생성. 기본 설정으로 진행)
3. **Rules** 탭 클릭
4. 아래 규칙으로 교체하고 **게시(Publish)**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 템플릿 이미지: 누구나 읽기 가능 (고객 화면에서도 봐야 함), 인증된 사용자만 쓰기
    match /templates/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**보안 메모:**
- `read: if true` 는 템플릿 이미지가 공개 URL로 노출 가능함을 의미합니다 (고객 화면에서 직접 로드해야 하므로).
- `write: if request.auth != null` 은 익명 로그인 포함 어떤 인증된 사용자든 업로드 가능. 어드민 자체에 비번 잠금이 있으므로 충분합니다.
- 추후 강화 시: 어드민 전용 이메일 로그인으로 바꾸고 `write: if request.auth.token.email == '...'` 같은 식으로 제한.

---

## 3. (선택) Storage CORS 설정

브라우저에서 캔버스로 이미지를 다시 합성/조작하는 경우 CORS 헤더가 필요할 수 있습니다.  
기본 Firebase Storage는 GET에 대해 CORS를 허용하지 않습니다.

**필요해지면** Cloud Shell에서:

```bash
echo '[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://denn-products.firebasestorage.app
```

지금은 `<img>` 태그로만 로드(에디터 미리보기 등)하므로 필수 아닙니다.

---

## 4. 테스트 (Console 활성화 후)

1. 어드민 페이지 새로고침 (Ctrl+Shift+R)
2. 개발자도구 콘솔에서:

```js
// 준비 상태 확인
dennFirebase.isReady()
// → true 가 나와야 정상 (false면 익명 로그인 실패, Step 1 다시 확인)

// 작은 더미 이미지 업로드 테스트
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const r = await dennFirebase.uploadDataUrl(tinyPng, 'templates/test/' + Date.now() + '.png');
console.log(r);
// → {url: "https://firebasestorage.googleapis.com/...", path: "templates/test/..."} 가 나와야 성공
```

`url`이 정상 발급되면 Step 2(fbExport 자동 연동)로 진행 가능합니다.

---

## 5. Step 2 미리보기 (코드 미적용)

Step 1 확인이 끝나면 fbExport 4개 경로(L1269, L2160, L2330, L3974)에 자동 업로드 wrap 추가 예정:
- 합성 PNG 생성 → 로컬에 dataUrl 임시 저장
- 백그라운드 Firebase Storage 업로드
- 성공 시 `t.dataUrl` 을 Storage URL로 교체 + `t.storagePath` 저장 (삭제용)
- 실패 시 dataUrl 그대로 두고 localStorage 유지 (graceful degrade)

이 방식으로:
- 신규 템플릿: localStorage 부담 거의 없음 (URL만 저장)
- 기존 800x1200 dataUrl 템플릿: 그대로 동작. 재저장 시 Storage로 이전.
- Firebase 미설정 환경: 기존처럼 localStorage로 작동.
