# Shinhan — 디자인 토큰 참조

이 파일은 Shinhan UI 구현 시 사용하는 모든 CSS 변수와 디자인 토큰을 정의한다.
코드 작성 시 이 값들을 그대로 사용한다.

---

## 폰트

Pretendard를 1순위로 지정한다. 다양한 웨이트(400~700)를 사용할 수 있다.

Pretendard는 시스템 폰트 스택에 포함하여 별도 `@font-face` 없이 사용 가능하다.
필요 시 CDN으로 로드한다:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" />
```

- 700(Bold): 페이지 타이틀, 섹션 제목, 테이블 헤더, 활성 탭, KPI 수치
- 600(SemiBold): 카드 타이틀, 강조 텍스트, 배지
- 500(Medium): 버튼 레이블
- 400(Regular): 기본 본문, 보조 텍스트, 캡션

---

## 로고

GNB(사이드바 또는 헤더) 좌측에 텍스트 로고를 표시한다.

```
메인: "SHINHAN"
서브: "WIREFRAME SPA"
```

```css
.gnb-logo-main {
  font-family: var(--font-family-sans);
  font-size: 18px;
  font-weight: 700;
  color: var(--sh-white);        /* 사이드바 배치 시 흰색 */
  letter-spacing: 0.5px;
}

.gnb-logo-sub {
  font-family: var(--font-family-sans);
  font-size: 10px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);  /* 사이드바 배치 시 반투명 흰색 */
  letter-spacing: 1px;
}
```

- 사이드바 상단에 배치
- 메인 + 서브 텍스트를 수직 스택(flex-direction: column)으로 구성
- 클릭 시 Dashboard 페이지로 이동

---

## CSS 변수 전체 정의

아래 코드를 `:root`에 삽입한다:

```css
:root {
  /* ── Brand Colors ── */
  --sh-blue-primary:    #0046FF;   /* 주요 액션, 활성 탭, 링크 */
  --sh-blue-secondary:  #0076FF;   /* Hover 상태, 보조 강조 */
  --sh-blue-deep:       #002D85;   /* 사이드바 배경, 헤더 로고 영역 */
  --sh-dark-primary:    #1A1A1A;   /* 기본 텍스트 */
  --sh-dark-secondary:  #4D4D4D;   /* 보조 텍스트, 캡션 */
  --sh-gray-background: #F4F7FC;   /* 페이지 배경, 테이블 헤더 */
  --sh-gray-border:     #E1E6F0;   /* 테두리, 구분선 */
  --sh-white:           #FFFFFF;   /* 카드·헤더·사이드바 메뉴 배경 */

  /* ── Semantic Colors ── */
  --color-success: #00C07F;        /* 정상 상태, 성공 배지 */
  --color-warning: #FFB300;        /* 경고 상태, Warning 배지 */
  --color-error:   #FF4D4F;        /* 오류 상태, 이상 탐지 강조 */
  --color-info:    #0076FF;        /* 정보성 메시지 */

  /* ── Badge Backgrounds (반투명) ── */
  --badge-success-bg: #E6F9F2;
  --badge-success-text: #00C07F;
  --badge-warning-bg: #FFF7E6;
  --badge-warning-text: #FFB300;
  --badge-error-bg:   #FFF1F0;
  --badge-error-text:  #FF4D4F;

  /* ── Typography ── */
  --font-family-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-size-h1:     28px;       /* 페이지 타이틀 */
  --font-size-h2:     22px;       /* 섹션 타이틀 */
  --font-size-h3:     18px;       /* 카드 타이틀 */
  --font-size-large:  16px;       /* 강조 수치 (KPI 등) */
  --font-size-base:   14px;       /* 기본 본문, 테이블 셀 */
  --font-size-small:  12px;       /* 배지, 캡션, 보조 레이블 */

  /* ── Spacing ── */
  --spacing-xs: 4px;              /* 배지 패딩 등 미세 간격 */
  --spacing-sm: 8px;              /* 버튼 상하 패딩, 아이콘 갭 */
  --spacing-md: 16px;             /* 카드 내부 섹션 간격, 테이블 셀 패딩 */
  --spacing-lg: 24px;             /* 카드 패딩, 헤더 좌우 패딩, 섹션 하단 마진 */
  --spacing-xl: 32px;             /* 섹션 간 큰 간격, 모달 패딩 */

  /* ── Border Radius ── */
  --radius-sm: 4px;               /* 버튼, 작은 UI 요소 */
  --radius-md: 8px;               /* 카드, 필터 바 */
  --radius-lg: 12px;              /* 모달, 배지(pill) */

  /* ── Shadows ── */
  --shadow-soft:   0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  --shadow-medium: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
}
```

---

## 컬러 사용 규칙

### 브랜드 컬러 매핑

| 상황 | 사용할 변수 |
|------|-----------|
| 기본 CTA 버튼 배경 | `--sh-blue-primary` |
| 버튼 hover | `--sh-blue-secondary` |
| 사이드바 배경 | `--sh-blue-deep` |
| 기본 텍스트 | `--sh-dark-primary` |
| 보조 텍스트/캡션 | `--sh-dark-secondary` |
| 페이지 배경 | `--sh-gray-background` |
| 보더/구분선 | `--sh-gray-border` |
| 카드/헤더 배경 | `--sh-white` |

### 배지 컬러 매핑

| 상태 | 배경 변수 | 텍스트 변수 | 사용 예시 |
|------|----------|-----------|----------|
| Success / Active / 정상 | `--badge-success-bg` | `--badge-success-text` | Active, Implemented, Low |
| Warning / Medium | `--badge-warning-bg` | `--badge-warning-text` | Warning, Medium |
| Error / High / 이상 | `--badge-error-bg` | `--badge-error-text` | High, Error, Critical |

### 차트 컬러

- 바 차트 기본: `--sh-blue-primary` (#0046FF) 단색
- 도넛 차트: 파란 계열 그라데이션 (#0046FF → #0076FF → #002D85 → #4D8AFF → #99B8FF)
- 이상 구간 강조: `rgba(255, 77, 79, 0.1)` 배경 오버레이
- 트렌드 예측선: 점선(dashed), `--sh-dark-secondary` 색상
- 트렌드 실측선: 실선(solid), `--sh-blue-primary` 색상

---

## 타이포그래피 규칙

### 폰트 웨이트 매핑 (Pretendard)

Pretendard는 400(Regular)~700(Bold) 웨이트를 사용한다.

| 용도 | 웨이트 값 |
|------|----------|
| 페이지 타이틀(h1), 섹션 제목, KPI 수치 | `700` (Bold) |
| 카드 타이틀, 테이블 헤더, 활성 탭, 배지 | `600` (SemiBold) |
| 버튼 레이블 | `500` (Medium) |
| 기본 본문 | `400` (Regular) |

### 라인 높이

- 기본: `line-height: 1.5`

---

## 스페이싱 가이드

| 위치 | 적용할 토큰 |
|------|-----------|
| 배지 내부 패딩 | `2px 8px` (고정) |
| 버튼 패딩 | `--spacing-sm` (8px) 상하, `--spacing-lg` (24px) 좌우 |
| 카드 내부 패딩 | `--spacing-lg` (24px) |
| 카드 타이틀 하단 간격 | `--spacing-md` (16px) |
| 테이블 셀 패딩 | `--spacing-md` (16px) |
| 섹션 간 간격 | `--spacing-lg` (24px) ~ `--spacing-xl` (32px) |
| 모달 내부 패딩 | `--spacing-xl` (32px) |
| KPI 카드 그리드 gap | `--spacing-md` (16px) |

---

## 그림자 & 보더 사용처

| 요소 | 그림자 | 보더 |
|------|--------|------|
| 카드 | `--shadow-soft` | `1px solid var(--sh-gray-border)` |
| 모달 | `--shadow-medium` | 없음 |
| 드롭다운 | `--shadow-medium` | `1px solid var(--sh-gray-border)` |
| 사이드바 | 없음 | 없음 (배경색으로 구분) |
| 헤더 | 없음 | `border-bottom: 1px solid var(--sh-gray-border)` |
| 테이블 래퍼 | `--shadow-soft` | `1px solid var(--sh-gray-border)` |
| 테이블 헤더 (thead) | 없음 | `border-top: 2px solid var(--sh-blue-primary)`, `border-bottom: 1px solid #E2E8F0` |
| 테이블 헤더 셀 (th) | 없음 | 셀 간 세로 구분선 (`::after`, `1px #E2E8F0`) |
| 테이블 행 | 없음 | `border-bottom: 1px solid #F1F5F9` |
| 테이블 셀 (td) | 없음 | 셀 간 세로 구분선 (`::after`, `1px #F1F5F9`) |

---

## z-index 계층

| 요소 | z-index |
|------|---------|
| 헤더 | `100` |
| 드롭다운 메뉴 | `200` |
| 모달 오버레이 | `1000` |

---

## 컴포넌트 CSS 스니펫

### 카드

```css
.card {
  background-color: var(--sh-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--sh-gray-border);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-soft);
}

.card-title {
  font-size: var(--font-size-h3);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--sh-dark-primary);
}
```

### 버튼

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-family-sans);
  border: 1px solid transparent;
}

.btn-primary {
  background-color: var(--sh-blue-primary);
  color: var(--sh-white);
  border: none;
}
.btn-primary:hover {
  background-color: var(--sh-blue-secondary);
}

.btn-secondary {
  background-color: var(--sh-white);
  color: var(--sh-blue-primary);
  border: 1px solid var(--sh-blue-primary);
}
.btn-secondary:hover {
  background-color: var(--sh-gray-background);
}
```

### 배지

```css
.badge {
  padding: 2px 8px;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-small);
  font-weight: 600;
  display: inline-block;
}

.badge-success {
  background-color: var(--badge-success-bg);
  color: var(--badge-success-text);
}

.badge-warning {
  background-color: var(--badge-warning-bg);
  color: var(--badge-warning-text);
}

.badge-error {
  background-color: var(--badge-error-bg);
  color: var(--badge-error-text);
}
```

### 테이블 (AG Grid 스타일)

데이터 테이블은 AG Grid 스타일을 따른다. 헤더 상단에 파란 보더 라인, 흰색 헤더 배경, 셀 세로 구분선이 특징이다.

```css
/* 테이블 래퍼 — 카드 안에 배치 */
.table-container {
  width: 100%;
  overflow-x: auto;
  background: var(--sh-white);
  border: 1px solid var(--sh-gray-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

/* ── 헤더 ── */
thead {
  border-top: 2px solid var(--sh-blue-primary);  /* 상단 파란 라인 */
}

th {
  background-color: var(--sh-white);             /* 흰색 배경 */
  padding: 0 12px;
  height: 48px;
  font-weight: 700;
  font-size: 13px;
  text-align: center;                            /* 기본 가운데 정렬 */
  color: #1E293B;
  border-bottom: 1px solid #E2E8F0;
  position: relative;
  white-space: nowrap;
}

/* 헤더 셀 세로 구분선 */
th::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background-color: #E2E8F0;
}
th:last-child::after {
  display: none;
}

/* 헤더 좌측 정렬이 필요한 컬럼 */
th.text-left {
  text-align: left;
}

/* ── 바디 행 ── */
td {
  padding: 0 12px;
  height: 48px;
  font-size: 13px;
  color: #475569;
  border-bottom: 1px solid #F1F5F9;
  text-align: center;                            /* 기본 가운데 정렬 */
  position: relative;
  vertical-align: middle;
}

/* 셀 세로 구분선 */
td::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background-color: #F1F5F9;
}
td:last-child::after {
  display: none;
}

/* 좌측 정렬 셀 */
td.text-left {
  text-align: left;
}

/* 강조 셀 (Name 등) */
td.cell-bold {
  font-weight: 700;
  color: var(--sh-dark-primary);
}

/* 모노스페이스 셀 (Instance ID 등) */
td.cell-mono {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
}

/* 보조 텍스트 셀 (Service Group 등) */
td.cell-secondary {
  color: var(--sh-dark-secondary);
}

/* 행 hover */
tr:hover {
  background-color: #EFF6FF;
}

/* 행 선택 */
tr.selected {
  background-color: #EFF6FF;
}

/* 짝수/홀수 행 (선택적) */
tr:nth-child(even) {
  background-color: var(--sh-white);
}
tr:nth-child(odd) {
  background-color: var(--sh-white);
}
```

### 테이블 특수 컬럼

```css
/* Optimization — 액션 배지 버튼 */
.optimize-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #FFF7ED;
  color: #EA580C;
  border: 1px solid #FDBA74;
  cursor: pointer;
}

/* Status — 아이콘 (✓ 녹색, ✗ 회색, ⊘ 회색) */
.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
}
.status-icon.success {
  color: var(--color-success);
}
.status-icon.inactive {
  color: #94A3B8;
}

/* Tags — pill 태그 */
.tag-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  background-color: #F0F0F0;
  color: var(--sh-dark-secondary);
  margin-right: 4px;
  white-space: nowrap;
}
```

### 테이블 하단 툴바

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

/* Excel 내보내기 버튼 — 녹색 스타일 */
.btn-excel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #107C41;
  background: var(--sh-white);
  border: 1px solid #107C41;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-soft);
}
.btn-excel:hover {
  background-color: #F0FDF4;
}

/* 페이지네이션 영역 */
.table-pagination {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--sh-dark-secondary);
}

.table-pagination .page-info {
  font-weight: 700;
  color: var(--sh-dark-primary);
}

.table-pagination .page-size-select {
  border: 1px solid var(--sh-gray-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 12px;
  color: var(--sh-dark-primary);
}

.table-pagination .page-btn {
  padding: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: #94A3B8;
}
.table-pagination .page-btn:hover {
  background-color: var(--sh-gray-background);
  color: var(--sh-blue-primary);
}
```

### 탭

```css
.tabs {
  display: flex;
  border-bottom: 1px solid var(--sh-gray-border);
  margin-bottom: var(--spacing-lg);
}

.tab-item {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: var(--font-size-base);
  color: var(--sh-dark-secondary);
  transition: all 0.2s;
}

.tab-item.active {
  color: var(--sh-blue-primary);
  border-bottom-color: var(--sh-blue-primary);
  font-weight: 600;
}
```

### 필터 바

```css
.filter-bar {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--sh-white);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  align-items: center;
}
```

### 모달

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--sh-white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  width: 600px;
  max-width: 90%;
  box-shadow: var(--shadow-medium);
}
```

### 앱 레이아웃

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  color: var(--sh-dark-primary);
  background-color: var(--sh-gray-background);
  line-height: 1.5;
}

#app {
  display: grid;
  grid-template-areas:
    "sidebar header"
    "sidebar content";
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr;
  min-height: 100vh;
}

/* ── 사이드바 ── */
.sidebar {
  grid-area: sidebar;
  background-color: var(--sh-blue-deep);
  color: var(--sh-white);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* ── 헤더 ── */
.header {
  grid-area: header;
  background-color: var(--sh-white);
  border-bottom: 1px solid var(--sh-gray-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  z-index: 100;
}

/* ── 콘텐츠 ── */
.content {
  grid-area: content;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 4열 그리드 (KPI 카드 등) */
.grid-cols-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.section {
  margin-bottom: var(--spacing-xl);
}
```
