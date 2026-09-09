# PG-1 — 방향 메타데이터 부재 시 표시 기준

전송 승인(2026-09-09): 사용자 `승인할게`로 118 코드d543d8d+문서8개 및 최종기록의 기존GitHub
rebuild/modern-studio 일반 commit/push를 승인했다. 아래 PG-1 제품 방향을 추가 확대하지 않는다.

2026-09-09 / Founder 선택: **A**. 최신 대화 `응 A안으로`를 기록한다.
[117 검토의 PG-1](../reviews/2026-09-09-spec-117-background-png-capability-review.md)이 질문의 기준이다.

## 승인된 방향과 유지되는 제한

- 방향 metadata 부재가 확인된 파일은 **저장된 픽셀 방향**을 표시 기준으로 삼는다.
- 사진의 현실 세계 위쪽을 추측하거나 부재를 명시적 Exif Orientation=1로 바꾸지 않는다.
- 손상·충돌·검증 불가 metadata는 계속 거부한다. Exif 프로필 부재와 모든 관련 metadata 부재는 다르다.
- PNG eXIf가 현재 픽셀을 설명하는지 불확실하면 자동 허가하지 않는다.
- 실제 사진 조회, 운영/UI 연결, 업로드, Firebase, 배포, 신규 설치 승인이 아니다.
- RG-3의 정적 JPEG/PNG·20,000,000 bytes·40,000,000 pixels 및 검증 불가 거부를 유지한다.

## Codex 후속 구조 — 제품 지원 범위와 구분

[118 계약](../../rebuild/specs/118-background-metadata-absence-contract.md)은 비연결 순수 검사기다.
첫 증명 부분집합 `core-only-v1`은 PNG critical 4종만, JPEG는 기존104 coding marker만 포함한다.
APP0/JFIF·ICC·투명도 등 정상 metadata도 이 검사기에서는 미지원이다. 모두 위험하거나 방향 정보를
갖는다는 주장이 아니며, JPEG/PNG 제품 지원을 이 부분집합으로 영구 축소하는 결정도 아니다.
지원 비율은 UNCONFIRMED. metadata 삭제·정규화로 검사기를 통과시키지 않는다.

검사 성공도 `decodeAllowed:false`다. 향후 동일 byte/Blob owner 결속·native decode·표시 검증이
필요하다. 108/109의 PARTIAL 계약과 116의 WebKit PNG 14 실패는 이 결정으로 해소되지 않는다.

공식 근거: [PNG Third Edition §5.4, §11.2, §11.3.4.5](https://www.w3.org/TR/2025/REC-png-3-20250624/),
확인2026-09-09. critical/ancillary 구별 및 eXIf 의미의 주의점을 확인했다. `core-only-v1`의
보수적 제외 규칙은 DENN 구조 선택이며 W3C가 모든 ancillary를 위험하다고 규정한 것은 아니다.
