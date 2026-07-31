# 스펙 032 — 액자 인쇄 물리 치수 카탈로그 계약

상태: `READY_FOR_CLAUDE`

## 목적

액자 인쇄 해상도가 사이즈 이름이나 논리 `w/h` 추측에 의존하지 않도록, 카탈로그 V1
`frameSizes[]`에 명시적인 실물 치수(cm)를 추가한다. 이번 단위는 순수 카탈로그 read/projection
계약만 구현한다. 운영자 입력 UI와 실제 print/export는 후속 분리 스펙이다.

## Founder·Codex 확정

- P-1 액자만 우선하며 케이스 인쇄는 별도다.
- P-2 이름·label·sub·id 파싱과 `w/h` 추측을 금지한다.
- 필드 이름은 `printWidthCm`·`printHeightCm`으로 고정한다.
- 두 필드는 함께 존재해야 하며 각각 finite, `> 0`, `<= 500`이어야 한다.
- 둘 중 하나만 있거나 범위 밖이면 catalog read를 `INVALID_NUMBER`로 fail-closed한다.
- 필드가 둘 다 없는 기존 카탈로그는 계속 읽을 수 있지만 인쇄 가능 치수 projection은 `null`이다.
- projection은 raw item이나 이름을 반환하지 않고 `{widthCm,heightCm}` 또는 `null`만 반환한다.
- 입력 비변형, JSON-safe, 결정성, hostile getter/Proxy 안전 실패와 원문 비노출 규율을 유지한다.

## 공개 계약

`@denn/shared`에 다음 최소 API를 추가한다.

```ts
interface FramePrintPhysicalSize {
  readonly widthCm: number;
  readonly heightCm: number;
}

function projectFramePrintPhysicalSize(
  document: CatalogDocumentV1,
  frameSizeId: string,
): ProjectionResult<FramePrintPhysicalSize | null>;
```

- ID 조회는 기존 preview projection의 안전한 lookup 규율을 재사용한다.
- 중복·누락·malformed ID는 기존 식별정보 없는 projection 오류 체계를 따른다.
- 이름·sub·label·key·aspect에서 치수를 추론하지 않는다.
- `aspect`와 cm 비율이 다르더라도 이번 단위에서 자동 수정하지 않고 진단 후보로만 남긴다.

## 허용 파일

- `packages/shared/src/catalog/read.ts`
- `packages/shared/src/catalog/read.test.ts`
- `packages/shared/src/catalog/types.ts`
- `packages/shared/src/catalog/fixtures/index.ts`
- `packages/shared/src/catalog/preview/types.ts`
- `packages/shared/src/catalog/preview/project.ts`
- `packages/shared/src/catalog/preview/project.test.ts`
- `packages/shared/src/catalog/preview/index.ts`
- 필요 시 `packages/shared/src/catalog/index.ts`, `packages/shared/src/index.ts`, 해당 export test
- 이 spec과 관련 handoff/CURRENT/live/Automation 문서

## 금지 범위

- `apps/admin/**`, `apps/mockup/**`, `packages/render/**`, Firebase/network/live/deploy
- 실제 print/export, PNG 생성, 주문 payload, 이름 파싱, fallback 치수
- lockfile·manifest·의존성 변경

## 검증

- frozen install과 lockfile diff 0
- format, lint, typecheck, unit, 독립 build, 전체 Chromium E2E
- 기존 카탈로그 무회귀와 신규 unit:
  - 정상 cm 쌍
  - 둘 다 없음 → `null`
  - 한쪽만 존재, 0, 음수, NaN/Infinity, 500 초과 → fail-closed
  - 이름에 `21x29.7cm`가 있어도 필드 없으면 `null`
  - `w/h`가 있어도 cm로 사용하지 않음
  - 입력 비변형·결정성·hostile getter/Proxy·오류 원문 비노출
- `git diff --check`, forbidden diff 0, ports 4183/4184, OS temp staging

## 후속 순서

1. 본 스펙 완료
2. 운영자용 cm 입력·검증·저장 UI 스펙
3. 액자 print/export 스펙: 승인된 preview plan + detached HTMLCanvasElement의 uniform transform
4. 인쇄소 요구 확인 전 실제 업로드·주문 전송·배포 차단

