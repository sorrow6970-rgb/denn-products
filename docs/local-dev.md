# 로컬 개발 서버 가이드

## 왜 필요한가

Windows에서 `file://` origin은 **모든 로컬 HTML 파일이 단일 localStorage 풀(약 5–10MB)을 공유**합니다.
다른 로컬 HTML(다운로드한 페이지, 옛 백업, 캐시 등)이 풀을 점유하면, DENN 데이터가 100KB 수준이어도 `localStorage.setItem` 이 `QuotaExceededError`로 실패합니다.

`http://localhost:<port>` origin은 **별도 storage 영역**을 가지므로 다른 로컬 HTML의 영향을 받지 않습니다.

---

## 매번 작업 시작 (1줄)

**바탕화면의 "DENN 작업" 바로가기 더블클릭.**

자동 동작:
1. 포트 8000/8080/5500 중 이미 서버 떠있는지 확인 → 있으면 그걸로 브라우저만 열기
2. 없으면 `start-dev.ps1`을 새 PowerShell 창("DENN Dev Server")에서 실행
3. 서버 응답 대기 (최대 5초)
4. 기본 브라우저로 `http://localhost:<port>/denn-admin.html` 자동 열기

---

## 바탕화면 바로가기 만드는 법 (1회)

1. 탐색기에서 `C:\repo\denn-products\start-denn.bat` 위치 열기
2. **우클릭 → 보내기 → 바탕 화면 (바로 가기 만들기)**
3. 바탕화면의 새 바로가기를 **우클릭 → 이름 바꾸기 → `DENN 작업`** 으로 변경
4. (선택) 우클릭 → 속성 → 아이콘 변경으로 원하는 아이콘 지정

이후 매번 바탕화면의 "DENN 작업" 더블클릭 한 번으로 어드민 즉시 진입.

---

## 사용법 (수동 / 고급)

### `start-denn.bat` (권장 — 더블클릭)
- 한 번에 서버 + 브라우저 자동
- 기존 서버 살아있으면 새로 안 띄움

### `start-dev.ps1` (서버만)
프로젝트 루트(`C:\repo\denn-products`)에서:

```powershell
.\start-dev.ps1
```

또는 어디서나 한 줄:
```powershell
& "C:\repo\denn-products\start-dev.ps1"
```

스크립트가 자동으로 수행:
1. 포트 충돌 검사 (`8000` → `8080` → `5500` 순서)
2. node가 있으면 `npx --yes serve`, 없으면 `python -m http.server` 실행
3. 접속 URL 출력

### 접속
- 어드민: `http://localhost:<port>/denn-admin.html`
- 목업 (고객): `http://localhost:<port>/denn-mockup-tool.html`

### 정지
- 터미널에서 `Ctrl+C` (또는 "DENN Dev Server" 창 닫기)

---

## 데이터 이전 (file:// → localhost) — **첫 실행 시 1회 필수**

`file://`와 `http://localhost`는 서로 다른 origin이라 localStorage / IndexedDB가 **자동 공유되지 않습니다.** 기존 데이터는 다음 절차로 옮깁니다.

### A. 어드민 데이터(S 객체 — frameTemplates, frameSizes 등)

1. **기존 `file://` 어드민에서 백업 추출**
   - Chrome/Edge에서 `file:///C:/repo/denn-products/denn-admin.html` 열기 (직접 더블클릭한 경로)
   - 좌측 사이드바 "데이터 보호" 패널 → **"현재 데이터 다운로드"** 클릭
   - 또는 콘솔에서: `dennDownloadCurrentDataV35()`
   - `DENN-current-data-YYYY-MM-DD-...json` 파일 저장

2. **localhost 어드민에서 가져오기**
   - `.\start-dev.ps1` 실행 → `http://localhost:8000/denn-admin.html` 접속
   - (시안 가져오기 UI가 있다면) JSON 파일 선택
   - 또는 콘솔에서:
     ```js
     // 파일 내용을 텍스트로 복사한 뒤
     S = JSON.parse(`{...JSON 그대로 붙여넣기...}`);
     await persistState();
     renderDash(); updateStats();
     ```

### B. 자동 파일 백업 폴더 핸들
- File System Access API 핸들은 origin 단위로 IndexedDB에 저장됩니다.
- localhost origin에서 "데이터 보호" 패널 → **"백업 폴더 선택"** 다시 지정해야 합니다.
- 기존 file:// 측의 핸들은 자동 폐기됩니다.

### C. Firebase Storage 템플릿 이미지
- **이전 불필요.** Storage URL은 origin 무관 + CORS 헤더가 `origin: ["*"]` 로 설정되어 있어 localhost origin에서도 그대로 로드됩니다.
- A 단계에서 가져온 S 객체 안의 `t.dataUrl`, `t.sourceDataUrl` 등이 이미 Firebase URL이라면 그대로 작동.

### D. Firebase Anonymous Auth
- 익명 인증은 origin 무관, Firebase Console의 "승인된 도메인"에 `localhost`가 기본 포함되어 있습니다.
- 추가 설정 불필요.

### E. 이전 후 확인
```js
// 콘솔에서
console.log('templates:', S.frameTemplates.length);
console.log('sizes:', S.frameSizes.length);
console.log('storage bytes:', (localStorage.getItem('denn_admin')||'').length);
// 1MB 이하 (B안 마이그 완료 상태) + 템플릿 개수 일치 확인
```

---

## 트러블슈팅

### `start-denn.bat` 더블클릭 후 PowerShell 창이 안 뜸
- Windows Defender / 보안 소프트웨어가 `.bat` 실행 차단했을 가능성. 우클릭 → "관리자 권한으로 실행" 또는 보안 설정에서 예외 추가.
- 또는 `start-dev.ps1` 위치가 변경됐을 가능성 (이동/삭제). `start-denn.bat`가 같은 폴더의 `start-dev.ps1`를 찾음.

### `[ERROR] Server did not come up within 5 seconds`
- "DENN Dev Server" PowerShell 창에 에러 표시됨. 다음 중 하나일 가능성:
  - **node/python 둘 다 없음**: 아래 "Neither node nor python is installed" 참고
  - **포트 충돌**: 다른 dev 서버 실행 중. 아래 포트 점유 트러블슈팅 참고
  - **첫 실행 npx 다운로드 지연**: 5초 초과해서 false alarm. 잠시 후 브라우저에서 직접 `http://localhost:8000/denn-admin.html` 열어보기.

### 브라우저가 자동으로 안 열림
- 기본 브라우저 설정 문제. 수동으로 `http://localhost:8000/denn-admin.html` 입력.
- bat 출력에 `Opening browser: http://...` 라인이 보였다면 명령은 실행됐고 OS가 처리 못 한 경우.

### "Ports 8000/8080/5500 all in use"
- 다른 dev 서버가 점유 중. 점유 PID 확인:
  ```powershell
  netstat -ano | findstr :8000
  ```
- 정리:
  ```powershell
  Stop-Process -Id <PID> -Force
  ```

### "Neither node nor python is installed"
- **Python (가장 빠른 설치)**: Microsoft Store → "Python 3.x" 검색 → 설치 (1-2분)
- **Node**: https://nodejs.org → LTS 설치 (5분)
- 설치 후 새 PowerShell 창에서 `.\start-denn.bat` 또는 `.\start-dev.ps1` 재실행

### `npx --yes serve` 첫 실행이 느림
- 최초 1회만 `serve` 패키지를 npm 캐시로 다운로드 (수 초). 이후 캐시 사용으로 즉시 시작.
- `start-denn.bat`의 5초 wait를 초과할 수 있음. ERROR 메시지 떠도 잠시 후 브라우저에서 직접 열어보면 됨.

### file:// 로 실수로 어드민을 열어버린 경우 (사고 방지)
- 증상: 브라우저 주소창이 `file:///C:/repo/denn-products/denn-admin.html` 로 시작
- 결과: 다른 로컬 HTML과 localStorage 풀(~5MB) 공유 → QuotaExceededError 재발
- 대처: 즉시 그 탭 닫고 `start-denn.bat`로 localhost 진입. 데이터 손실은 없음 (IndexedDB는 origin별로 분리).
- **예방: 바탕화면 바로가기만 사용하고, 직접 HTML 파일을 더블클릭하지 말 것.** 탐색기에서 우클릭 → "연결 프로그램" 으로도 file:// 가 됨 → 주의.

### 로그가 안 보이거나 한글이 깨짐
- `start-denn.bat`과 `start-dev.ps1` 모두 ASCII-only (Korean Windows CP949 안전). 한글이 깨지는 건 docs/콘솔이 아닌 스크립트 출력 자체. 정상.

### CORS 오류 (localhost → Firebase Storage)
- Firebase Storage CORS가 `origin: ["*"]` 인 한 localhost도 허용됩니다.
- 미적용 의심 시 `firebase-setup.md §3` 재확인. Cloud Shell에서:
  ```bash
  gsutil cors get gs://denn-products.firebasestorage.app
  ```

### 새로고침해도 데이터가 안 보임
- 위 "데이터 이전 (file:// → localhost)" 절차 (A 단계)를 안 했을 가능성. 새 origin은 처음에 빈 storage 상태.

---

## 운영 권장

- **항상 localhost에서 작업** — 모든 storage 이슈 회피
- 파일 백업 폴더는 localhost origin에서 **다시 지정**
- 가족/팀원과 공유 시 같은 절차 안내
- file:// 어드민은 **백업 추출 용도로만** 사용하고 그 외엔 닫아둘 것
