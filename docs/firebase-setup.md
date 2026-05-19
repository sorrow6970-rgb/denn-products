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
    // 모든 경로 공통: 누구나 읽기 가능 (고객 화면에서도 봐야 함), 인증된 사용자만 쓰기
    // templates/ guides/ mockups/ editor-overlays/ 등 모두 적용.
    // 향후 신규 경로 추가 시 rule 수정 불필요.
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**적용 범위:**
- `templates/` — 액자 템플릿 합성 이미지 (B v1)
- `templates/{id}-source.png`, `-builder.png`, `-original.png` — 원본/빌더 PNG (B v1)
- `guides/` — 가이드 배경 (B v2)
- `mockups/` — frameMockup / caseMockup (B v2)
- `editor-overlays/{tplId}/` — 어드민 ZE 작업 가이드 이미지 (B v3)

**보안 메모:**
- `read: if true` 는 이미지가 공개 URL로 노출 가능함을 의미합니다 (고객 화면에서 직접 로드해야 하므로).
- `write: if request.auth != null` 은 익명 로그인 포함 어떤 인증된 사용자든 업로드 가능. 어드민 자체에 비번 잠금이 있으므로 충분합니다.
- 추후 강화 시: 어드민 전용 이메일 로그인으로 바꾸고 `write: if request.auth.token.email == '...'` 같은 식으로 제한.

---

## 3. Storage CORS 설정 (필수 — 캔버스 합성/인쇄용)

캔버스에 Firebase Storage 이미지를 그리고 그것을 다시 PNG로 export하려면 CORS 헤더가 **필수**입니다.  
미설정 시 캔버스가 tainted되어 `toDataURL()`이 실패하고 **인쇄파일이 0×0px / 0KB**로 나옵니다 (고객 주문 차단).

코드 측은 이미 Firebase Storage URL에 `crossOrigin='anonymous'`를 자동 부여하도록 패치되어 있습니다 (`denn-cors-fix-image-src-setter` IIFE). 그 anonymous 요청이 통과되려면 버킷이 CORS 응답 헤더를 내보내야 합니다.

### 단계

1. **Google Cloud Console 진입**
   - https://console.cloud.google.com 접속
   - 우상단에서 프로젝트가 `denn-products`인지 확인

2. **Cloud Shell 열기**
   - 우상단 `>_` (터미널) 아이콘 클릭
   - 권한 승인 → 셸 프롬프트 대기

3. **cors.json 파일 생성**
   ```bash
   cat > cors.json <<'EOF'
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```

4. **버킷에 적용**
   ```bash
   gsutil cors set cors.json gs://denn-products.firebasestorage.app
   ```

5. **확인**
   ```bash
   gsutil cors get gs://denn-products.firebasestorage.app
   ```
   출력에 위 JSON이 그대로 보이면 성공.

### 보안 메모
- `origin: ["*"]` 은 모든 도메인에서 GET 가능. 템플릿 이미지는 어차피 공개 URL이므로 충분.
- 더 엄격히 하려면 `["https://your-domain.com", "file://"]` 등 명시 가능. 단, `file://` 로 어드민을 열 때도 동작해야 한다면 `*` 권장.
- `maxAgeSeconds: 3600` 은 preflight 캐시 1시간. 짧게 가져가서 정책 변경 반영을 빠르게.

### 적용 후 검증
- 어드민 새로고침 (Ctrl+Shift+R)
- 콘솔에서:
  ```js
  const t = S.frameTemplates.find(t => t.storagePath);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 100; c.height = 100;
    c.getContext('2d').drawImage(img, 0, 0, 100, 100);
    try { console.log('CORS ok, toDataURL length:', c.toDataURL().length); }
    catch(e) { console.error('still tainted:', e.message); }
  };
  img.onerror = e => console.error('load failed', e);
  img.src = t.dataUrl;
  ```
  `CORS ok` 로그가 보이면 성공.
- 새 액자 시안 1개 생성 → 인쇄/저장 → 정상 PNG 출력 확인.

### 실패 시
| 증상 | 원인 후보 |
|---|---|
| `crossOrigin: anonymous` 인데 onerror | CORS 미적용. `gsutil cors get`으로 재확인. 적용 직후라면 5분 대기 후 재시도. |
| `still tainted` 에러 | 다른 tainted source 존재. 캔버스 합성 경로의 모든 `img.src` 검증. |
| `[cors-fix]` 콘솔 로그 없음 | 패치 IIFE 미실행. 브라우저 새로고침 강제 (Ctrl+Shift+R). |

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
