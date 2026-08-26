# Space V2 composition readiness Founder decisions — 2026-08-26

## 승인

Founder가 이 대화에서 다음을 명시 승인했다.

- **LL-1=A** — customer V2 open/replay를 먼저 완료하고 admin issue UI는 그 다음에 구현한다.
- **LL-2=A** — proof PNG는 동일 frozen issue draft와 versioned render plan에서 export한 bytes만 허용한다.
- **LL-3=A** — issue draft 시작 시 검증된 C5 baseline catalog snapshot을 고정하고 자동 reload/adopt하지 않는다.
- **LL-4=A** — admin issue composition은 기존 default Firebase app/Auth authority를 재사용하고 writer는
  명시 issue action 전까지 lazy-create한다. 별도 exact env gate는 default false다.
- **LL-5=A** — confirmed success 뒤 same-origin `?space=<token>`만 표시·명시 copy하며 password는 별도
  전달한다. password 저장·URL 포함·자동 clipboard 포함은 0이다.
- **LL-6=A** — 첫 구현 단위는 customer V2 open, proof fetch/integrity와 replay plan의 non-UI 계약 및
  injected fake로 제한한다. UI/CSS는 후속 Claude Code 스펙에서 수행한다.

## 이 승인으로 열리는 첫 범위

- V1을 변경하지 않는 별도 V2 document open port.
- V2 decrypt → strict scene read → evidence digest verify.
- injected proof-byte reader와 PNG decoder를 사용하는 byteLength/content type/SHA-256/intrinsic dimensions
  검증.
- validated closed evidence만으로 만드는 image-only frame replay plan.
- local synthetic unit과 전체 정적/check gate. production route import와 actual network는 0.

## 계속 금지

- `apps/mockup/src/App.tsx`, 현재 V1 controller/password gate와 production route 연결
- admin/customer UI·CSS·시각 디자인 구현. 실제 UI/UX는 사용자 지시에 따라 Claude Code가 후속 스펙에서 담당
- Firebase SDK asset reader, actual UID, actual Firebase/project/bucket/network/live/data, deploy
- Rules/config/package/lockfile 변경, 신규 dependency/download/install
- admin issuer composition, URL/clipboard, 운영 발급, orphan delete/cleanup, publish
- V1 rewrite/migration, text/template art/clock/room capability 확장

LL 승인은 위 첫 local-only 계약과 다음 Claude Code 실행 스펙 작성을 허용한다. production 연결이나 운영
쓰기를 승인하지 않는다.
