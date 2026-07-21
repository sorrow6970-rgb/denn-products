# 문서 정리 후속 보고 검증

검증일: 2026-07-21

판정: **수정 후 승인 가능**

## 확인된 사실

- `HEAD = origin/main = 623a929`
- `df856db`는 `623a929`의 조상
- `df856db..623a929` 사이에는 보고된 8개 커밋이 존재
- `df856db`의 mockup에는 `FSVER='714o'`가 존재하고 `dennApplyRoomScrollV`는 없음
- `df856db`의 admin에는 `denn_admin_pre_cloud_` 정리와 `dennSweepTemplates`가 존재
- HEAD에는 `dennApplyRoomScrollV`와 `FSVER='s37'`가 존재
- 분석 부산물 2개가 복원돼 추적 파일 수정은 0건
- 애플리케이션 HTML과 Firebase 설정은 이번 정리에서 변경되지 않음

Claude Code가 production에서 측정한 마커 조합은 `df856db`와 일치한다. 다만 장기 감사 근거를 위해 실제 조회 URL·시각·응답 해시 또는 마커 캡처를 기준선 기록에 남기는 것이 좋다.

## 수정해야 할 사항

### 1. 롤백 CLI 명령

설치된 Firebase CLI 명령 목록 코드에서는 `hosting:rollback` 명령을 확인할 수 없고 `remoteconfig:rollback`만 존재한다. 따라서 다음 문구를 제거한다.

```text
firebase hosting:rollback
```

Hosting 롤백은 Firebase Console의 이전 릴리스 롤백을 1순위로 사용하거나, 별도 깨끗한 작업 디렉터리에서 기준선 태그의 Hosting 파일과 설정을 검증한 뒤 재배포한다.

현재 작업 디렉터리에서 `git checkout <tag>` 후 배포하는 절차는 미추적 리빌드 문서와 사용자 작업을 혼동할 수 있으므로 운영 runbook으로 사용하지 않는다.

### 2. 리빌드 브랜치 분기점

`rebuild/modern-studio`를 `df856db`에서 직접 분기하는 안은 비권장이다. 그러면 이후 8개 커밋과 통합된 리빌드 규칙 문서가 브랜치에 자연스럽게 포함되지 않는다.

권장 순서:

1. production 기준 태그 `prod-baseline-20260721`은 `df856db`를 가리킴
2. 통합 문서를 현재 HEAD 계열에서 문서 전용 커밋으로 생성
3. `main` 기록은 reset·rewrite하지 않음
4. `rebuild/modern-studio`는 문서 전용 커밋에서 분기
5. 레거시 비교는 태그 `prod-baseline-20260721`의 파일을 읽기 전용 기준으로 사용

production 기준과 개발 브랜치 분기점은 같을 필요가 없다.

## 사용자 결정 권고

### 결정 1 — 기준선 태그

**승인 권고:** `prod-baseline-20260721` → `df856db`

조건: 태그 설명에 production 마커, 확인 URL·시각, HEAD와 8커밋 차이를 기록한다.

### 결정 2 — 미배포 8커밋

**(a) 선택 권고:** Git의 `main`은 그대로 유지하고 production은 `df856db` 배포본으로 유지한다.

- `main` reset 금지
- 리빌드 착수 직전에 레거시 운영본을 다시 패치·배포하지 않음
- 썸네일 수정만 단독 배포하려면 별도 긴급 스펙·Preview·사용자 승인을 요구
- 현재는 리빌드 기준선 확립을 우선

### 결정 3 — 리빌드 브랜치

브랜치 이름 `rebuild/modern-studio`는 승인 가능하다. **분기점은 `df856db`가 아니라 통합 문서 커밋**으로 수정한다.

### 결정 4 — 기술 스택 검증

공식 버전·브라우저·번들·라이선스 검증을 다음 단계로 진행하는 안을 승인 권고한다. 아직 설치·스캐폴드는 하지 않는다.

## 다음 Claude Code 작업

사용자 승인 후 다음만 수행한다.

1. 통합 문서 변경을 하나의 문서 전용 커밋으로 커밋·푸시
2. `df856db`에 annotated production 기준 태그 생성·푸시
3. `rebuild/modern-studio`를 문서 전용 커밋에서 생성·푸시
4. 롤백 문서에서 존재하지 않는 CLI 명령 제거
5. 공식 기술 스택 버전 조사 결과 제출

패키지 설치·스캐폴드·기존 HTML 수정·Firebase 변경·배포는 아직 금지한다.
