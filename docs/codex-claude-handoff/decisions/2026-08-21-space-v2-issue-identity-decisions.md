# space V2 issue identity Founder decision

- 결정일: 2026-08-21
- 기준 HEAD=origin: `3e0a91a`
- 관련 스펙: 068~071
- 상태: **HH-1=A APPROVED / LOCAL-ONLY NEXT CONTRACT / NO NETWORK / NO UI**

## HH-1=A — token과 proof asset identity

Founder는 public link token과 proof object `assetId`를 서로 독립된 UUID 두 개로 만들도록 승인했다.

- 한 issue identity 작업에서 Web Crypto source를 통해 `assetId`와 token을 각각 정확히 한 번 생성한다.
- 둘은 모두 lowercase RFC 4122 UUID v4 형식을 통과해야 한다.
- 둘이 같으면 collision으로 fail-closed하며 자동 재생성·retry하지 않는다.
- token을 asset path에서 파생하거나 assetId를 token으로 재사용하지 않는다.
- proof object 목표 경로는 기존 승인대로
  `rebuild-space-assets/objects/{assetId}.png`이며 token은 `spaces/{token}` identity 후보다.

이 결정은 local identity pair 계약만 연다. 스펙 068 preparation과의 조합, Storage upload,
Firestore create/read-back/reconciliation, URL 발급, Rules/config 변경, 실제 UID/project/network,
emulator/deploy, admin/customer UI는 승인하지 않는다.

## 안전 의미

- 독립 호출은 link token과 object path identity의 직접 결합을 피한다.
- UUID v4 형식과 서로 다름은 난수 품질이나 전역 충돌 부재를 증명하지 않는다.
- collision은 확률을 근거로 무시하지 않고 명시 오류로 닫는다.
- 자동 retry가 없으므로 한 호출의 random source 사용량은 성공·collision 모두 최대 2회다.
