# DENN 디자인 시스템 — 방향 확정: **Modern Studio (무드 B)**

> 확정: 2026-07-21. 리빌드의 모든 신규 UI는 이 토큰/규격을 기준으로 만든다.
> 시안 이미지: 이 폴더의 `*-B.png` (데스크톱 목업툴 / 모바일 / 어드민 / 시안공간).

## 방향 요약
깨끗한 화이트 베이스 + 뉴트럴 그레이 구조 + **테라코타 포인트 1색** + 부드러운 라운드 카드/그림자.
미니멀·세련되면서 따뜻함이 있는 "모던 스튜디오" 톤. 정보 많은 어드민·에디터에 강하고, 카카오 옐로와 충돌 없음.

## 컬러 토큰

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg` | `#F4F4F5` | 앱 바탕(뉴트럴) |
| `--surface` | `#FFFFFF` | 카드·패널·바 표면 |
| `--panel` | `#F7F7F8` | 옅은 내부 패널/썸네일 바탕 |
| `--ink` | `#191A1D` | 기본 텍스트/제목 |
| `--muted` | `#71717A` | 보조 텍스트·아이콘 |
| `--line` | `#EAEAED` | 보더·구분선 |
| `--accent` | `#C0614A` | **포인트(테라코타)** — 주요 버튼, 활성 상태, 강조 |
| `--accent-2` | `#D8846F` | 그라데이션/호버용 밝은 테라코타 |
| `--accent-ink` | `#FFFFFF` | accent 위 텍스트 |
| `--accent-soft` | `#F6E6E1` | accent 배경 틴트(활성 칩/태그/뱃지) |
| `--kakao` | `#FEE500` / 텍스트 `#191600` | 카카오 주문 버튼(**브랜드 고정, 변경 금지**) |
| 성공 | `#5BA35B` / 배경 `#E4EFE4` | 정상·확정 상태 |

## 타이포그래피
- 본문/제목 공통: **DM Sans** + 한글 **Nanum Gothic** (`font-family: 'DM Sans','Nanum Gothic',sans-serif`)
- 큰 숫자/디스플레이(스탯 값 등)도 DM Sans (세리프 안 씀 — 그게 무드 A와의 차이점)
- 웨이트: 본문 400/500, 강조·버튼·제목 600, 스탯/헤드라인 700
- 스케일(px): caption 11.5 · body 13.5–14.5 · subtitle 16 · title 19 · h2 30–34(디스플레이)
- 라벨(섹션 헤더): 11–11.5px, `letter-spacing .10em`, `text-transform:uppercase`, muted

## 형태 · 깊이
- 라운드: `--radius: 12px`(버튼·인풋·칩), `--radius-lg: 18px`(카드·패널), 스와치/필터칩 `10px`
- 그림자: soft `0 10px 26px -18px rgba(20,20,25,.30)`, elevated `0 20px 50px -28px rgba(20,20,25,.45)`
- 보더: 1px `--line`. 활성 요소는 `--accent` 보더 + 얇은 링.

## 컴포넌트 규격
- **Button / primary**: bg `--accent`, text 흰색, radius 12, padding 11×16, weight 600, 아이콘+라벨 gap 8.
- **Button / ghost**: bg surface, 1px line 보더, text ink.
- **Button / kakao**: bg `#FEE500`, text `#191600`, weight 700. (주문 CTA 전용)
- **Chip(사이즈 등)**: radius 10, 1px line; 활성 = accent bg + 흰 텍스트.
- **Swatch(색상)**: 34×34, radius 10; 활성 = accent 보더 + 2px 링.
- **Card / Pane**: surface, 1px line, radius 18; 헤더 13.5px 700 + 우측 muted 액션.
- **Input**: 1px line, radius 12, padding 11×13, placeholder muted.
- **Nav item(어드민)**: radius 12, muted → 활성 시 `--accent-soft` bg + accent text/icon.
- **Stat tile**: surface 카드, 라벨(muted+아이콘) → 큰 값(700) → 델타(muted).
- **Table**: th는 uppercase muted 11px, 행 구분 1px line, 상태는 pill(신규=accent-soft/accent, 확정=성공색).
- **Tag/Badge**: `--accent-soft` bg + accent text, radius 999, 11px 700, 아이콘 gap 6.
- **Bottom sheet(모바일)**: surface, 상단 radius 26, 그래버 44×5 line, 상단 필터 칩 가로 스크롤, 하단 CTA 카카오.

## 구현 매핑 (권장 스택 기준)

CSS 변수를 root에 깔고 Tailwind는 그 변수를 참조:

```css
:root{
  --bg:#F4F4F5; --surface:#fff; --panel:#F7F7F8;
  --ink:#191A1D; --muted:#71717A; --line:#EAEAED;
  --accent:#C0614A; --accent-2:#D8846F; --accent-ink:#fff; --accent-soft:#F6E6E1;
  --radius:12px; --radius-lg:18px;
  --shadow:0 20px 50px -28px rgb(20 20 25 / .45);
  --shadow-soft:0 10px 26px -18px rgb(20 20 25 / .30);
}
```

```js
// tailwind.config — theme.extend
colors:{
  bg:'var(--bg)', surface:'var(--surface)', panel:'var(--panel)',
  ink:'var(--ink)', muted:'var(--muted)', line:'var(--line)',
  accent:{DEFAULT:'var(--accent)', 2:'var(--accent-2)', soft:'var(--accent-soft)', ink:'var(--accent-ink)'},
  kakao:'#FEE500',
},
borderRadius:{ DEFAULT:'var(--radius)', lg:'var(--radius-lg)' },
boxShadow:{ soft:'var(--shadow-soft)', card:'var(--shadow)' },
fontFamily:{ sans:['DM Sans','Nanum Gothic','sans-serif'] },
```

> shadcn/ui 사용 시 위 변수를 그 테마 변수(--primary 등)에 연결. `--primary = --accent`.

## 다크 모드
이번 확정 범위 아님(라이트 우선). 필요 시 후속 스펙에서 뉴트럴 반전 + accent 유지로 추가.

## 참고 시안 (이 폴더)
- `1-mockup-desktop-B.png` — 고객 목업툴(데스크톱): 좌측 카테고리 레일 · 중앙 프리뷰 · 우측 컨트롤 패널 · '내 공간' 카드
- `2-mockup-mobile-B.png` — 모바일 바텀시트
- `3-admin-B.png` — 어드민 대시보드(사이드바 · 스탯 타일 · 주문 테이블 · 시안공간 목록)
- `4-space-B.png` — `?space` 비공개 시안(룸 씬 재현 + 주문 확정)

시안은 감성용 플레이스홀더 사진 기준이며, 실제 사진/템플릿 적용 시 최종 룩은 더 살아난다.
