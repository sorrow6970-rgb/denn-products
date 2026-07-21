# 현재 상태

상태: **001 POC 구현·로컬 자동검증 완료 — 실기기 검증 및 Codex 재검증 대기**

## 현재 결론

- 기존 운영 HTML과 Hosting 경로는 그대로 유지한다(무변경 확인).
- 신규 리빌드는 별도 디렉터리에 추가한다. POC = `poc/platform-compatibility/`(삭제 가능).
- Modern Studio(B) 디자인 방향은 확정됐다.
- 기술 스택은 아직 후보이며 전체 스캐폴드 승인이 나지 않았다.
- 001 POC가 구현되고 로컬 자동검증을 통과했다.
- **Tailwind v4/v3.4는 실기기 CSS.supports 근거 부족으로 결정 보류.**

## 브랜치/기준

- 작업 브랜치: **`rebuild/modern-studio`** (HEAD는 아래 커밋). main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.
- production 비교 기준 태그: `prod-baseline-20260721`.

## 001 POC — 완료(로컬)

- 정확 버전(npm registry): React 19.2.7 / react-dom 19.2.7 / Vite 8.1.5 / @vitejs/plugin-react 6.0.3 / TypeScript 7.0.2 / tailwindcss·@tailwindcss/vite 4.3.3 / vitest 4.1.10 / @playwright/test 1.61.1 / @axe-core/playwright 4.12.1 / @types/react 19.2.17 / @types/react-dom 19.2.3. 라이선스 전부 MIT/Apache(axe MPL, devDep).
- 패키지 매니저: npm(`npm ci` frozen). pnpm 미설치라 POC는 npm 사용(README에 근거).
- 자동검증 PASS: `npm ci` / `tsc --noEmit`(strict) / `vitest`(10/10) / `vite build`(JS gzip 65.5KB·CSS 3.3KB) / `playwright`(viewport 10/10).
- ★ 명암비 발견: 흰색/테라코타 `#C0614A` = **4.16:1**(일반텍스트 AA 미달, AA-large/UI 통과). 토큰 미변경, 대안 계산 제안(`#B85A44` 4.58:1 등) — spec §3.
- 접근성: scrollable-region-focusable 해결. color-contrast는 토큰 발견사항으로 기록(하드페일 제외).

## 실기기 검증 — 대기 (NOT TESTED)

- iPhone Safari / Android Chrome / Samsung Internet / 카카오 인앱 = **전부 NOT TESTED**.
- LAN 접근: `npm run preview -- --host` → `http://192.168.0.31:4173`(같은 Wi-Fi, 방화벽 승인 필요, 인터넷 비공개).
- 체크리스트·기록표: `poc/platform-compatibility/results/device-matrix.md`.

## 다음 작업 (한 가지)

**사용자 실기기 검증** → `device-matrix.md` 채우기 → 그 근거로 Tailwind v4/v3.4 결정 → Codex POC 재검증.

## 시작 조건

- 사용자가 실기기(특히 카카오 인앱)에서 POC 접속·14항목 확인·결과 전달.
- LAN 접근 불가 시: 임시 HTTPS 채널 필요성·안전조치 보고 후 사용자 승인(임의 외부배포 금지).

## Claude Code 금지 (유지)

- 기존 HTML 이동·삭제·수정 / Firebase 연결 / 운영 데이터 접근·쓰기 / 전체 앱·모노레포 스캐폴드 / Preview·production 배포 / 근거 없는 Tailwind 버전 확정 / force push·reset --hard·clean·자동 merge.

## 검증 요청 형식

```text
검증 요청
커밋: <hash>
목적: <변경 목적>
변경 파일: <목록>
실행한 검사: <명령과 결과>
미검증: <항목>
남은 위험: <위험>
롤백: <방법>
```
