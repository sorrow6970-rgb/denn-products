# 현재 상태

상태: **첫 구현 스펙 작성 완료 — 사용자 승인 및 Claude Code 착수 대기**

## 현재 결론

- 기존 운영 HTML과 Hosting 경로는 그대로 유지한다.
- 신규 리빌드는 별도 디렉터리에 추가한다.
- Modern Studio(B) 디자인 방향은 확정됐다.
- 세부 디자인 규격은 접근성·반응형 보완을 적용한다.
- 기술 스택은 아직 후보이며 전체 스캐폴드 승인이 나지 않았다.
- 첫 스펙 `docs/rebuild/specs/001-platform-compatibility-poc.md`가 발행됐다.
- `001`은 전체 앱이 아닌 삭제 가능한 플랫폼 호환성 POC다.

## 현재 선행 작업

완료:

- production 기준선 태그 `prod-baseline-20260721` → `df856db`
- docs-only 커밋 `805b61d`
- 리빌드 브랜치 `rebuild/modern-studio` → `805b61d`

다음:

1. 사용자가 `001-platform-compatibility-poc.md` 실행 승인
2. Claude Code가 POC만 구현하고 결과 제출
3. 실제 기기 검증
4. POC 결과를 바탕으로 기술 스택 최종 확정

기존 `instructions/2026-07-21-001-freeze-and-baseline.md`는 준비 이력이며 현재 구현 스펙이 아니다.

## Claude Code 금지

- 기존 HTML 이동·삭제
- POC 범위를 벗어난 패키지 설치
- 전체 앱 스캐폴드와 제품 기능 구현
- Firebase·운영 데이터 변경
- Preview·production 배포

위 작업은 현재 스펙과 사용자 승인이 나온 뒤 수행한다.

## 검증 요청 형식

```text
검증 요청
커밋: <hash 또는 문서-only 미커밋>
목적: <변경 목적>
변경 파일: <목록>
실행한 검사: <명령과 결과>
미검증: <항목>
남은 위험: <위험>
롤백: <방법>
```
