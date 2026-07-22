# 2026-07-22 · 스펙 006 프런트엔드 기술 스택 최종 검토 (읽기 전용 근거 보고)

> 성격: **읽기 전용 근거 보고서.** 설치·스캐폴드·package.json/lockfile 변경 없음. 후보를 확정으로 선행 기록하지 않는다.
> 근거: npm registry metadata(`npm view`, 2026-07-22 조회) + Tailwind 공식 문서. 블로그·검색요약·Wikipedia 미사용.
> 스펙 `docs/rebuild/specs/006-frontend-stack-finalization.md`. 결정서 `docs/codex-claude-handoff/decisions/2026-07-22-tailwind-v4-adoption.md`.

## 0. 조사 방법·범위

- 각 패키지의 `version`(dist-tag latest), `engines`, `license`, `peerDependencies`를 `npm view`로 읽기 전용 조회.
- POC 고정 버전 출처: `poc/platform-compatibility/package.json`.
- 미확인 항목은 **NOT VERIFIED**로 표기. 정확 패치는 스캐폴드 직전 재확인(Tailwind 결정서 버전 정책).

## 1. 패키지 버전·호환성 표

| 항목 | POC 버전 | 현재 후보(latest) | Node 요구(latest) | peer 요점 | 라이선스 | 권고 |
|---|---|---|---|---|---|---|
| react | 19.2.7 | 19.2.8 | (엔진 제약 사실상 없음) | — | MIT | POC 검증값 유지 또는 19.2.8 패치, 스캐폴드 직전 확정 |
| react-dom | 19.2.7 | 19.2.8 | — | react `^19.2.8` | MIT | react와 동일 버전 페어 |
| @types/react | 19.2.17 | 19.2.17 | — | — | MIT | 유지 |
| @types/react-dom | 19.2.3 | 19.2.3 | — | @types/react `^19.2.0` | MIT | 유지 |
| typescript | 7.0.2 | 7.0.2 | >=16.20.0 | — | Apache-2.0 | 유지(단, 생태계 호환 §5 주의) |
| vite | 8.1.5 | 8.1.5 | `^20.19.0 \|\| >=22.12.0` | — | MIT | 유지 |
| @vitejs/plugin-react | 6.0.3 | 6.0.4 | `^20.19.0 \|\| >=22.12.0` | vite `^8.0.0`, (babel/rolldown peer는 optional) | MIT | 6.0.4 패치 |
| tailwindcss | 4.3.3 | 4.3.3 | — | — | MIT | 유지(v4 결정) |
| @tailwindcss/vite | 4.3.3 | 4.3.3 | — | vite `^5.2 \|\| ^6 \|\| ^7 \|\| ^8` | MIT | 유지 |
| vitest | 4.1.10 | 4.1.10 | `^20 \|\| ^22 \|\| >=24` | vite `^6\|^7\|^8`, DOM env·@types/node optional | MIT | 유지 |
| @playwright/test | 1.61.1 | 1.61.1 | >=18 | — | Apache-2.0 | 유지 |
| playwright-core | (전이) | 1.61.1 | >=18 | — | Apache-2.0 | @playwright/test와 동일 |
| @axe-core/playwright | 4.12.1 | 4.12.1 | — | playwright-core `>=1.0.0` | **MPL-2.0** | 유지(devDep, §6) |

### 도입 보류(선택) 후보 — 참고용
| 항목 | latest | Node 요구 | peer 요점 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| react-router | 8.2.0 | **>=22.22.0** | react/react-dom `>=19.2.7` | MIT | v8은 Node 22.22 floor. v7 최신 7.18.1은 Node>=20 |
| react-router (v7) | 7.18.1 | >=20.0.0 | — | MIT | Node floor 낮음. 세대 선택은 §10 |
| zustand | 5.0.14 | >=12.20.0 | react `>=18`(immer/use-sync-external-store optional) | MIT | 필요 시 |
| @radix-ui/react-* (예: react-dialog) | 1.1.20 | — | react `^19.0`, react-dom `^19.0` | MIT | shadcn/ui 기반 primitive |
| clsx | 2.1.1 | >=6 | — | MIT | shadcn util |
| tailwind-merge | 3.6.0 | — | — | MIT | shadcn util |
| class-variance-authority | 0.7.1 | — | — | Apache-2.0 | shadcn util |
| eslint | 10.7.0 | `^20.19 \|\| ^22.13 \|\| >=24` | jiti `*` | MIT | §5 TS7 이슈 |
| typescript-eslint | 8.65.0 | `^18.18 \|\| ^20.9 \|\| >=21.1` | eslint `^8.57\|^9\|^10`, **typescript `>=4.8.4 <6.1.0`** | MIT | **TS 7.0.2 미지원** §5 |
| @biomejs/biome | 2.5.5 | >=14.21.3 | — | MIT OR Apache-2.0 | lint+format 통합, typescript-eslint 비의존(대안) |
| prettier | 3.9.6 | >=14 | — | MIT | formatter |
| @vitest/coverage-v8 | 4.1.10 | — | vitest `4.1.10` | MIT | 커버리지 필요 시 |
| jsdom | 29.1.1 | `^20.19 \|\| ^22.13 \|\| >=24` | — | MIT | vitest DOM env(택1) |
| happy-dom | 20.11.0 | >=20.0.0 | — | MIT | vitest DOM env(택1) |
| @types/node | 26.1.1 | — | — | MIT | 선택 Node major에 맞춰 핀 |
| pnpm | 11.15.1 | **>=22.13** | — | MIT | 패키지 매니저 §4 |

## 2. POC 버전 ↔ 후보 버전 차이·업그레이드 위험

- 차이 있는 항목: react/react-dom(19.2.7→19.2.8, 패치), @vitejs/plugin-react(6.0.3→6.0.4, 패치). 나머지는 **POC 고정값 = 현재 latest**로 동일.
- 위험: 세 항목 모두 **patch 단계** 차이 → 회귀 위험 낮음. 스캐폴드 직전 정확 패치를 lockfile에 고정하고 typecheck/unit/build/e2e 재실행으로 확인 권고(결정서 버전 정책 준수).
- major 변경은 없음(전부 동일 세대 유지).

## 3. Node·pnpm 고정안 (권고)

- **기본 권고 = Node 24 LTS.** 근거: 2026-07-22 기준 **현재 LTS 라인**, **지원 기간 2028년 4월까지**, 기존 **POC가 Node 24.18.0에서 통과**, Vite/Vitest/pnpm 후보 요구사항 충족. Node 정확 patch는 **스캐폴드 직전 공식 배포본으로 재확인**.
  - 공식 근거: `https://nodejs.org/en/about/previous-releases` · `https://nodejs.org/en/blog/migrations/v22-to-v24`
- **Node 22는 호환 가능한 대안으로만 기록**(기본안 아님). 하한 22.13, react-router v8 채택 시 22.22.
- **참고 — 결합 Node 하한:** vite/plugin-react `>=20.19|22.12`, vitest `>=20|22|24`, pnpm 11 `>=22.13` → 최소 세트 하한 22.13. Node 24 LTS는 이 모두를 충족.
- **@types/node:** **Node 24 major에 맞춰 고정**(`@types/node@24`). latest 26은 dev 최신값일 뿐, 선택 Node major에 종속.
- **pnpm — 패키지 관리자(앱 dependency/devDependency 아님):**
  - **Corepack**으로 활성화한다.
  - `package.json`의 **`packageManager` 필드에 정확 버전을 고정**한다(예: pnpm 11.15.1 또는 스캐폴드 시점 최신 11.x).
  - **단일 `pnpm-lock.yaml`**만 사용하고 npm/yarn lockfile을 혼재하지 않는다. 설치는 `pnpm install --frozen-lockfile`. (POC는 npm 사용 — 스캐폴드부터 pnpm 단일화.)

## 4. peer dependency·호환성 요점

- react-dom→react, @types/react-dom→@types/react, @axe-core/playwright→playwright-core, @tailwindcss/vite→vite(^8 포함), vitest→vite(^8 포함): **모두 현재 후보 세트와 정합**.
- **@vitejs/plugin-react 6.0.4 optional peer = VERIFIED** (npm registry metadata, 2026-07-22 재조회 원문):

```
peerDependencies = {
  '@rolldown/plugin-babel': '^0.1.7 || ^0.2.0',
  'babel-plugin-react-compiler': '^1.0.0',
  vite: '^8.0.0'
}
peerDependenciesMeta = {
  '@rolldown/plugin-babel': { optional: true },
  'babel-plugin-react-compiler': { optional: true }
}
engines = { node: '^20.19.0 || >=22.12.0' }
```

  → 필수 peer는 **`vite ^8.0.0`뿐**. `@rolldown/plugin-babel`·`babel-plugin-react-compiler`는 `optional: true`이므로 **React Compiler 미사용 시 설치 불필요**(실제 제약 아님, VERIFIED).
- **충돌 1건(핵심): typescript-eslint 8.65.0 peer `typescript >=4.8.4 <6.1.0` → TS 7.0.2 미지원.** §5.

## 5. ★ 생태계 호환 리스크 — TypeScript 7 + 타입 인지 린트

- typescript dist-tags: `latest=7.0.2`, `rc=7.0.1-rc`, `beta=6.0.0-beta`, `next=7.1.0-dev`. 안정 latest는 **7.0.2**.
- **typescript-eslint(현 8.65.0)는 TS 7.0.2를 peer로 지원하지 않음**(<6.1.0). 즉 TS7 + 타입 인지 ESLint 조합은 현재 **비호환**.
- 영향: 빌드·트랜스파일(vite/vitest)은 TS7과 무관하게 동작(타입체크는 `tsc --noEmit`이 담당, POC에서 통과). 그러나 **타입 인지 ESLint 규칙**은 현재 붙지 않음.
- 선택지(사용자·Codex 결정): (a) 린트를 **Biome 2.5.5**로(typescript-eslint 비의존, TS 버전 독립) (b) ESLint를 **타입 비인지(non-type-aware)** 규칙으로만 운영 + 타입 오류는 `tsc`가 담당 (c) 타입 인지 린트가 필수면 TS를 typescript-eslint 지원 범위로 낮춤(세대 정책과 상충 → 별도 결정). → **추가 POC 필요 항목**.

## 6. 라이선스

- 전부 **permissive**: MIT 다수, Apache-2.0(typescript, @playwright/test, playwright-core, class-variance-authority), MIT OR Apache(biome), **MPL-2.0(@axe-core/playwright, devDependency)**.
- MPL-2.0은 파일 단위 카피레프트로 devDep(테스트 전용, 배포 번들 미포함)이면 통상 허용. 배포물에 소스 포함 없음 → 위험 낮음. 최종 판단은 사용자.

## 7. 최소 필수 패키지 (전체 스캐폴드 1차 설치)

앱 셸 + 빌드 + 스타일 + 단위/e2e 테스트에 필요한 최소:

- 런타임: `react`, `react-dom`
- 빌드/타입: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`
- 스타일(v4): `tailwindcss`, `@tailwindcss/vite`
- 단위 테스트: `vitest` (DOM 필요 테스트가 있으면 `jsdom` 또는 `happy-dom` 택1 — POC는 DOM 목으로 jsdom 미사용)
- e2e/접근성: `@playwright/test`, `@axe-core/playwright` (playwright-core는 전이)
- 타입 도구: `@types/node@24`(Node 24 major에 맞춤)
- **패키지 관리자 = pnpm** — 앱 dependency/devDependency로 설치하지 않는다. **Corepack 활성화 + `package.json` `packageManager` 필드에 정확 버전 고정 + 단일 `pnpm-lock.yaml`**.

## 8. 도입 보류(선택) 패키지 — 필요 시점에 개별 도입

- 라우팅: `react-router` (앱에 실제 라우트 생길 때. 세대·Node floor는 §10)
- 상태관리: `zustand` (전역 공유 상태가 실제로 필요할 때. 초기엔 로컬 상태/Context로 충분한지 먼저 판단)
- UI primitive: `@radix-ui/react-*` + shadcn 유틸(`clsx`, `tailwind-merge`, `class-variance-authority`) — shadcn/ui는 의존성이 아니라 **소유 코드 생성기**(컴포넌트를 repo로 복사). 도입 범위는 컴포넌트별.
- 린트/포맷: `@biomejs/biome`(대안) 또는 `eslint`(+`typescript-eslint` — §5 제약) + `prettier`
- 커버리지: `@vitest/coverage-v8`

## 9. 확정 가능 항목 (근거 충분)

- **세대·핵심 스택:** React 19 + react-dom 19, TypeScript 7 세대, Vite 8 + @vitejs/plugin-react 6, **Tailwind v4 + @tailwindcss/vite**(결정서 확정), Vitest 4, Playwright 1.61 + @axe-core/playwright 4.12.
- 이들은 POC에서 typecheck/unit 34/34/build/e2e 11/11·axe serious 0으로 검증됐고 peer·라이선스 정합. **정확 patch는 스캐폴드 직전 재확인 후 lockfile 고정**(결정서 정책).
- **패키지 매니저 = pnpm 단일 + 단일 pnpm-lock.yaml + frozen install.**

## 10. 권고안 및 남은 사용자 결정

### 현재 권고(기본안)
- **Node 24 LTS** — 현재 LTS 라인, 지원 2028-04까지, POC 24.18.0 통과. exact patch는 스캐폴드 직전 공식 배포본 확인. (@types/node@24)
- **Tailwind v4** — 결정서 확정.
- **pnpm 단일 lockfile** — Corepack + `packageManager` 필드 고정.
- **Router** — 실제 라우트가 생기는 스펙까지 **설치 보류**.
- **Zustand** — 전역 상태 필요성이 확인될 때까지 **보류**(초기엔 로컬 상태/Context).
- **Radix/shadcn** — **컴포넌트별 도입**(소유 코드 생성).
- **React/@vitejs/plugin-react patch 상향**(19.2.7→19.2.8, 6.0.3→6.0.4) — 스캐폴드 직전 exact metadata 확인 후 **작은 검증과 함께 적용**.
- **TS7 린트 전략** — 추가 **소형 POC 필요**(§5·§11).

### 남은 사용자 결정(명시 승인 필요)
- 위 권고안 승인 여부(특히 Node 24 기본안, TS7 린트 소형 POC 진행).
- 라우팅 세대(v8 Node 22.22 vs v7 Node 20)는 라우트 스펙 시점에 Node 정책과 함께 확정.

## 11. 추가 POC 필요 항목

- **TS7 + 린트 조합(§5):** typescript-eslint 비호환 하에서 (a) Biome, (b) 타입 비인지 ESLint + tsc, (c) TS 세대 조정 중 무엇을 채택할지 소형 POC로 확인.
- **pnpm workspace 필요성:** 단일 패키지로 시작 가능한지 vs 초기부터 workspace 분리(코어/앱). 최소 workspace POC로 판단(스펙 006 검토 대상 항목).
- **vitest DOM 환경:** 실제 테스트가 jsdom/happy-dom 중 무엇을 요구하는지(POC는 미사용) — 필요 시 택1 검증.

## 12. 예상 초기 품질 명령 / 롤백

- 초기 품질 게이트(스캐폴드 후): `pnpm install --frozen-lockfile` · `pnpm typecheck`(tsc --noEmit) · `pnpm test:unit`(vitest run) · `pnpm build`(vite build) · `pnpm test:e2e`(playwright) · (린트 확정 시) `pnpm lint`.
- Node/pnpm 고정 파일 제안: `.nvmrc`(Node major) + `engines.node` + `packageManager`(pnpm) + Corepack.
- **스캐폴드 롤백:** 스캐폴드는 별도 후속 스펙에서 신규 디렉터리에만 생성 → 롤백 = 해당 커밋 `git revert`/디렉터리 제거. 기존 운영본·POC·Firebase 무관.

## 검증 절차 결과 (스펙 006 체크리스트)

- [x] 모든 버전이 공식 metadata와 일치(`npm view`, 2026-07-22)
- [x] Node 요구·peer 충돌 식별(핵심 1건 = typescript-eslint↔TS7, §5)
- [x] 라이선스 기록(전부 permissive, axe MPL devDep)
- [x] POC 검증값과 차이 설명(§2, 전부 patch 단계)
- [x] Tailwind v4 결정 준수(v3.4 미포함)
- [x] 기술별 필요성·대안·도입 시점 구분(§7/§8)
- [x] 미확인 항목 표기(Node exact patch·TS7 린트 조합은 스캐폴드 전 재확인/POC). @vitejs/plugin-react optional peer는 §4에서 metadata 원문으로 **VERIFIED** 확정.
- [x] 저장소 코드·설정·lockfile 무변경(§13)

## 13. 저장소 무변경 확인

- 이 작업은 **읽기 전용 조회**만 수행. `npm view`(registry 메타데이터 조회)로 설치·다운로드 없음.
- **package.json·lockfile 생성/수정 없음**, `node_modules` 변경 없음, `apps/`·`packages/`·workspace 생성 없음, Firebase·앱 코드·PNG·운영본 무변경.
- 산출물은 이 보고서(docs)뿐.
