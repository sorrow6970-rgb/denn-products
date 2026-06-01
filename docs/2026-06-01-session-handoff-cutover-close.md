# 2026-06-01 세션 핸드오프 — 룸 스키마 컷오버 종료

> 이전: docs/2026-05-31-session-handoff-cutover.md(2a까지). 이번 세션 = **2b 완료 + 컷오버 종료 결정.**

## 0. 복원 (사무실/다음 세션)
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -6      # 39ed9d1(iframe 평가)가 HEAD인지 확인
git status               # clean
```

## 1. 이번 세션 커밋 (전부 push 대상)
| 커밋 | 내용 |
|---|---|
| `2424886` | **2b**: 오염 `<bgId>`→`user:<bgId>` 마이그레이션 + **room-key tombstone**(`deletedRoomKeys`, `__adminPreset` 면제) + `default-room` 마커 클린업. 검증 PASS(2회 reload, stray 0). |
| `702a795` | scope 경계 감사 문서 — operator↔consumer 쓰기 경계 **airtight 확인**, 코드 변경 0. |
| `7ff0e92` | dead block 삭제 — 비활성 `denn-admin-guide-scale-sync` IIFE 117줄(4단계 청결 1건). 검증 PASS. |
| `39ed9d1` | 3단계 iframe 재검토 — **비권장 결론** 문서. |

## 2. 핵심 발견 (이번 세션)
- **union-merge 함정**: `mergeAdminStates`(L4458)가 `roomBackgroundSettings`를 키 합집합으로 머지 → **room 키 삭제가 다른 스토어에서 부활**. 단순 delete는 비durable. → `deletedRoomKeys` tombstone 신설(면제 규칙: `__adminPreset` 있는 값=진짜 운영자 디폴트는 보호). **룸 키 영구 삭제는 tombstone 필수.**
- **scope 경계 airtight**: 소비자 저장은 전부 `saveCurrentRoomKeyV48`→`scopedKeyV2`→user 키. 운영자 마커는 `markSavedAdminPreset` 단일. 과거 cross-scope writer는 dead code(제거함).

## 3. 종료 결정 + 보류 (3·4단계)
- **정확성(양방향 오염 차단) = 1/2a/2b로 완수 → 컷오버 기능 목표 달성.**
- **3단계(운영자 도구 별도 파일)·4단계(flat 쓰기 제거/분기 정리) = 보류.**
  - iframe 분리 = 비권장(opener 단절 + admin 분기 미제거로 4단계 unlock 못 함). docs/2026-06-01-phase3-iframe-assessment.md.
  - 진짜 분리 = **공유 렌더 모듈 추출**(`rmRender`/`sgDraw`/`RM`/`SG`/룸모달/설정 ~1500-2000줄 → 공용 .js). consumer 본체 큰 리팩터 → 시간·검증 예산 확보 시 재개.

## 4. 재개 시 latent 항목
- **operator 키 마커 비일관**: 운영자 *자동저장*은 operator 키를 마커 없이 씀(명시 "관리자 저장"만 마커). 마커는 6곳 신뢰/상속 판정서 소비(L3694/4634/4655/5113/8116/12901). **미래 migration REV 인상 시** 마커 없는 정상 운영자 키를 오염으로 오분류 위험. REV 올릴 때 반드시 고려.
- 비활성 ①(`uiSettings.roomInitialGuideScale`)는 아직 live default(`uiGuideScale` 7곳) — 제거하려면 그 의존부터.

## 5. 참조 문서
- 계약: docs/2026-05-31-room-settings-schema-contract.md (불변식 I1~I6, D1~D6)
- 2b 설계: docs/2026-06-01-cutover-phase2b-design.md
- scope 감사: docs/2026-06-01-scope-boundary-audit.md
- iframe 평가: docs/2026-06-01-phase3-iframe-assessment.md

## 6. 콘솔 도구 (2b)
`dennMigrate2bStatus()` / `dennMigrate2b()`(강제) / `dennRollbackMigrate2b()`(백업 복원+tombstone 클리어+비활성). 백업 키: `denn_room_premigrate2b_backup`.
