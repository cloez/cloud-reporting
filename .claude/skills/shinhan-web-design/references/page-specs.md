# Shinhan — 페이지별 구성 명세

각 페이지의 레이아웃, 구성 요소, 데이터 구조를 정의한다.

---

## Dashboard

### 목적
실시간 비용 현황 및 주요 인사이트 요약 제공

### 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  [KPI 카드 4개 — 1행 4열 그리드, gap: 16px]          │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│   │당월최대│ │예상청구│ │절감가능│ │최근청구│              │
│   │비용   │ │비용   │ │비용   │ │금액   │              │
│   └──────┘ └──────┘ └──────┘ └──────┘              │
├─────────────────────────┬───────────────────────────┤
│  비용 추이 바 차트       │  서비스별 비중 도넛 차트    │
│  (6개월, #0046FF 단색)   │  (파란 계열 그라데이션)     │
├─────────────────────────┴───────────────────────────┤
│  최근 이상 비용 발생 테이블                           │
│  컬럼: Service/Alias | Provider | Level | Account | Status │
└─────────────────────────────────────────────────────┘
```

### KPI 카드 구성

각 카드는 다음 요소를 포함한다:

```
┌─────────────────────┐
│ 🟢 레이블 텍스트     │  ← 아이콘(시맨틱 컬러) + 레이블(12px, secondary)
│                     │
│ $12,450             │  ← 금액 수치 (22~28px, bold, dark-primary)
│                     │
│ ▲ 12.5% vs 전월     │  ← 서브 텍스트 (증감률 or 링크)
└─────────────────────┘
```

- 아이콘 배경: 각 카드별 시맨틱 컬러 계열 (green/red/blue 등)
- 레이블: `font-size: 12px`, `color: var(--sh-dark-secondary)`
- 금액: `font-size: 22~28px`, `font-weight: 700`
- 서브 텍스트: 증가(green) / 감소(red) 색상 표시
- 예산 초과 시: 경고 아이콘 또는 붉은 서브 텍스트

### KPI 카드 그리드

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md); /* 16px */
}
```

### 차트 규칙

- 바 차트 색상: `#0046FF` (단색)
- 도넛 차트: 파란 계열 5색 (`#0046FF`, `#0076FF`, `#002D85`, `#4D8AFF`, `#99B8FF`)
- 차트 라이브러리: React → Recharts, HTML → Chart.js
- 차트 영역은 카드 컴포넌트 안에 배치

### 이상 비용 테이블

| 컬럼 | 내용 |
|------|------|
| Service/Alias | 서비스명 (텍스트) |
| Provider | 클라우드 제공자 (AWS/Azure/GCP) |
| Level | 위험도 배지 (High=error, Medium=warning) |
| Account ID | 계정 식별자 |
| Status | 상태 텍스트 또는 아이콘 |

---

## Anomaly Detection (이상 비용 탐지)

### 목적
AI 기반 비용 이상 탐지 결과 시각화

### 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  페이지 타이틀                [탐지 설정] [학습 재실행] │
├──────────────────────────┬───────────────────────────┤
│  트렌드 라인 차트          │  탐지 요약 카드            │
│  ├─ 예측 비용 (점선)       │  ├─ 탐지 항목: 3건        │
│  └─ 실제 비용 (실선)       │  │  (28px+, bold, red)    │
│     ↳ 이상 구간: 붉은 배경  │  ├─ 탐지 금액: $425.18   │
│                           │  └─ 안내 텍스트(info 색상)  │
├──────────────────────────┴───────────────────────────┤
│  이상 탐지 결과 테이블                                 │
│  컬럼: 탐지 유형 | 탐지 명칭 | 분석 기간 | 탐지 내용 | 위험도 │
└──────────────────────────────────────────────────────┘
```

### 트렌드 차트 규칙

- 실제 비용 선: `stroke: var(--sh-blue-primary)`, 실선, `strokeWidth: 2`
- 예측 비용 선: `stroke: var(--sh-dark-secondary)`, 점선 (`strokeDasharray: "5 5"`)
- 이상 구간: `fill: rgba(255, 77, 79, 0.1)` 영역으로 배경 강조
- X축: 날짜, Y축: 비용($)

### 탐지 요약 카드 수치

- 탐지 건수: `font-size: 28px+`, `font-weight: 700`, `color: var(--color-error)`
- 금액: `font-size: 22px`, `font-weight: 700`, `color: var(--sh-dark-primary)`
- 안내 텍스트: `color: var(--color-info)`, `font-size: 14px`

### 위험도 배지 규칙

| 위험도 | 배지 클래스 | 시각적 표현 |
|--------|-----------|-----------|
| High | `.badge-error` | 적색 배경 + 적색 텍스트 |
| Medium | `.badge-warning` | 황색 배경 + 황색 텍스트 |
| Low | 기본/회색 | 연회색 배경 + 회색 텍스트 |

### 상단 액션 버튼

- "탐지 설정" → Secondary 버튼 (아이콘 + 텍스트)
- "학습 재실행" → Primary 버튼 (아이콘 + 텍스트)

---

## Asset Management 테이블 뷰

### 목적
클라우드 리소스 인벤토리 조회 및 최적화 액션 제공

### 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  AWS EC2  (Total 150)                  [🔍 검색]      │
├──────────────────────────────────────────────────────┤
│  ═══════════════ 2px #0046FF 파란 보더 ═══════════════ │
│  Account Name(ID) │ Service Group │ Name │ Region │   │
│  Type │ Instance ID │ Optimization │ Status │ Tags    │
│  ─────────────────────────────────────────────────── │
│  데이터 행 (48px 높이, 셀 세로 구분선, hover #EFF6FF)   │
│  ...                                                  │
├──────────────────────────────────────────────────────┤
│  [🟢 Excel]        [Page Size ▾] [1~10 of 150] [◁▷]  │
└──────────────────────────────────────────────────────┘
```

### 테이블 타이틀 패턴

```
AWS EC2 · Total 150
```

- 타이틀: `font-size: var(--font-size-h3)`, `font-weight: 700`
- "Total 150": `font-size: 12px`, `color: var(--sh-dark-secondary)`, pill 형태 (`background: #F1F5F9`, `border-radius: 12px`, `padding: 2px 8px`)

### 테이블 스타일 (AG Grid)

테이블은 카드 컴포넌트 안에 배치되며, AG Grid 스타일을 따른다:

- 헤더 상단: `border-top: 2px solid #0046FF` (파란 라인)
- 헤더 배경: `#FFFFFF` (흰색)
- 헤더 셀: `font-weight: 700`, `font-size: 13px`, `color: #1E293B`, 가운데 정렬
- 헤더 셀 사이: 세로 구분선 (`::after` pseudo-element, `height: 50%`, `background: #E2E8F0`)
- 행 높이: `48px`
- 행 보더: `1px solid #F1F5F9`
- 셀: `font-size: 13px`, `color: #475569`, 기본 가운데 정렬
- 셀 세로 구분선: `1px solid #F1F5F9`
- 행 hover/선택: `background-color: #EFF6FF`

### 특수 컬럼 처리

| 컬럼 | 스타일 |
|------|--------|
| Account Name (ID) | 좌측 정렬 (`.text-left`) |
| Service Group | 가운데 정렬, `color: var(--sh-dark-secondary)` |
| Name | 좌측 정렬, `font-weight: 700`, `color: var(--sh-dark-primary)` |
| Region | 가운데 정렬 |
| Type | 가운데 정렬 |
| Instance ID | 좌측 정렬, 모노스페이스 폰트, `font-size: 12px` |
| Optimization | 가운데 정렬, `Downsize` 액션 배지 (오렌지 — `bg: #FFF7ED`, `color: #EA580C`, `border: 1px solid #FDBA74`), 없으면 `-` |
| Status | 가운데 정렬, 아이콘(✓ 녹색 `#00C07F` / ⊘ 회색 `#94A3B8`) |
| Tags | pill 태그 (`background: #F0F0F0`, `border-radius: 12px`, `padding: 2px 8px`, `font-size: 11px`) |

### 하단 툴바

```css
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 var(--spacing-md);
  border-top: 1px solid var(--sh-gray-border);
  background: var(--sh-white);
}
```

- 좌측: Excel 내보내기 버튼 (녹색 `#107C41` 보더+텍스트, 흰색 배경, 아이콘+텍스트)
- 우측: Page Size 선택 (10/20/50/100 드롭다운) + "1 to 10 of 150" 텍스트 + 페이지네이션 (|< < Page 1 of 15 > >|)

### 검색 입력창

- placeholder: "Search by name or ID..."
- 스타일: `border: 1px solid var(--sh-gray-border)`, `border-radius: var(--radius-sm)`, `padding: 8px 12px`

---

## RTM (Requirements Traceability Matrix)

### 목적
요구사항과 SPA 구현 컴포넌트 간 연결 추적

### 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  페이지 타이틀 + 설명                                 │
├──────────────────────────────────────────────────────┤
│  [검색 입력창] [필터 드롭다운]         [Total: 15/15]  │
├──────────────────────────────────────────────────────┤
│  RTM 데이터 테이블                                    │
│  컬럼: ID | Depth 1 | Depth 2 | 요구사항 명세         │
│        | 중요도(배지) | 연결 화면(Link) | 상태          │
├──────────────────────────────────────────────────────┤
│  [Excel 버튼]        [Page Size] [페이지네이션]        │
├──────────────────────────────────────────────────────┤
│  💡 RTM 활용 가이드 안내 박스                          │
│  배경: var(--sh-gray-background) 또는 연한 파란색       │
└──────────────────────────────────────────────────────┘
```

### 상태 표시 규칙

- `Implemented` → 녹색 점(●) + 텍스트, `color: var(--color-success)`
- `In Progress` → 파란 점(●) + 텍스트, `color: var(--sh-blue-primary)`
- `Not Started` → 회색 점(●) + 텍스트, `color: var(--sh-dark-secondary)`

### 연결 화면(Link) 컬럼

- 파란 텍스트 (`color: var(--sh-blue-primary)`)
- 외부 링크 아이콘(↗) 포함
- hover 시 underline

### RTM 활용 가이드 박스

```css
.guide-box {
  background: var(--sh-gray-background);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}
```

- 좌측: 정보 아이콘 (💡 또는 lucide info 아이콘)
- 우측: 안내 문구 텍스트

---

## 내비게이션 구조 (사이드바 + 헤더)

### 개요

상단 GNB 2행 구조를 사용하지 않는다. 모든 내비게이션은 **좌측 사이드바(260px)** + **상단 헤더(64px)** CSS Grid로 처리한다.

### 사이드바

```
┌──────────────┐
│ SHINHAN      │
│      │
│ WIREFRAME SPA│
├──────────────┤
│ Dashboard    │
│ Asset Mgmt ▾ │
│  └ 서브메뉴   │
│ Cost Mgmt  ▾ │
│  └ 서브메뉴   │
│ Governance ▾ │
│  └ 서브메뉴   │
│ RTM          │
└──────────────┘
```

- 너비: 260px, 배경: `var(--sh-blue-deep)` (#002D85)
- 로고: 상단 배치, 흰색 텍스트
- 메뉴 항목: 수직 나열, 비활성 시 반투명 흰색, 활성 시 밝은 흰색 + 배경
- 서브메뉴: 들여쓰기(padding-left 44px), 13px 폰트

### 헤더

```
┌──────────────────────────────────────────────────────────┐
│ [🔍 메뉴, 계정 검색...]                  🔔  ⚙  박동근 님  │
│                                        STANDARD USER     │
└──────────────────────────────────────────────────────────┘
```

- 높이: 64px, 배경: 흰색, 하단 보더
- 검색창: placeholder "메뉴, 계정 검색...", 돋보기 아이콘 좌측
- 우측: 알림 아이콘 + 설정 아이콘 + "박동근 님" + 권한 텍스트 + 아바타

### Cost Management 서브메뉴 (사이드바)

```
│ 📊 Cost Management ▾  │
│    Cost Summary        │
│    Cost Analysis       │
│    Anomaly Detection   │ ← 활성 시 밝은 흰색 + font-weight 600
│    청구 내역            │
│    Budgets & Alarms    │
│    Discounts & Credits │
│    Cost Reports        │
```

### Governance 서브메뉴 (사이드바)

```
│ 🛡 Governance ▾       │
│    Gov Summary         │ ← 활성 시 밝은 흰색 + font-weight 600
│    Compliance Check    │
│    Policy Management   │
│    Compliance Logs     │
│    Efficiency Index    │
```

### 페이지별 컨텍스트 표시

페이지 진입 시 헤더 영역 또는 콘텐츠 영역 최상단에 다음을 표시:
- 프로젝트 선택: "OpsNow Demo" + 서비스 드롭다운 (예: "Cost Summary ▾")
- 우측: "공지사항" | "사용자 가이드" | 사용자 이름 링크

이 컨텍스트 바는 헤더와 별도이며, 콘텐츠 영역 최상단에 위치한다.

---

## 공통 인터랙션 규칙

### 전환 효과
- 버튼 hover: `transition: all 0.2s`
- 모달 표시/숨김: `opacity` + `transform` 애니메이션 권장

### 빈 상태 (Empty State)
- 테이블 데이터 없을 시: 중앙 정렬 안내 텍스트 + 아이콘
- 예: "데이터가 없습니다" + 빈 상자 아이콘

### 로딩 상태
- 차트/테이블 로딩 시: Skeleton UI 또는 스피너 사용
- Skeleton: 연한 회색 배경 + 펄스 애니메이션

### 반응형
- 기본 데스크탑 기준: `min-width: 1280px`
- 모바일/태블릿은 별도 처리 (현재 명세 범위 외)
