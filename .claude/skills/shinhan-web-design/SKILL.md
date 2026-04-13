---
name: shinhan-web-design
description: |
  Shinhan 웹 애플리케이션의 디자인 시스템과 UX Writing 가이드라인을 적용하여 UI를 생성하는 스킬.
  신한디에스 브랜드 아이덴티티(딥 블루 계열)에 맞는 금융 대시보드, 테이블, 카드, 차트, 모달 등의 
  컴포넌트와 페이지를 만들 때 반드시 이 스킬을 사용한다.
  UI 내 모든 텍스트(버튼, 메시지, 레이블, 안내문구 등)는 신한 쏠(SOL) UX Writing 가이드라인의
  보이스앤톤, 라이팅 원칙, 콘텐츠 유형별 글쓰기 규칙을 따른다.

  다음 상황에서 이 스킬을 트리거한다:
  - 사용자가 "신한", "Shinhan", "Shinhan" 등을 언급하며 UI/웹 페이지/컴포넌트를 요청할 때
  - Shinhan 프로젝트의 대시보드, 테이블 뷰, 이상 탐지, RTM 등 페이지를 만들 때
  - 신한 브랜드 컬러(#0046FF, #002D85)를 사용한 금융 UI를 만들 때
  - 기존 Shinhan 컴포넌트(KPI 카드, 배지, 필터 바 등)를 수정하거나 새로 만들 때
  - 사용자가 "신한 스타일", "빌링 디자인", "Shinhan 디자인 시스템" 등을 언급할 때
  - Shinhan 관련 React 컴포넌트, HTML 페이지, 프론트엔드 코드를 작성할 때
  - 사용자가 "UX 라이팅", "보이스앤톤", "버튼 문구", "메시지 문구", "안내 문구" 등 UI 텍스트를 요청할 때
  
  이 스킬을 사용하지 않는 경우:
  - 신한/Shinhan과 무관한 일반 웹 디자인 요청 (frontend-design 스킬 사용)
  - 백엔드 API, 데이터베이스 등 UI와 무관한 작업
---

# Shinhan Web Design Skill

Shinhan 웹 애플리케이션의 공식 디자인 시스템에 따라 UI를 생성한다.
금융 데이터의 명확성, 신한 브랜드 신뢰감, 적절한 정보 밀도, 일관된 컴포넌트 언어를 핵심 원칙으로 삼는다.

## 디자인 원칙

모든 UI 생성 시 다음 5가지 원칙을 준수한다:

1. **명확성** — 금융 데이터를 빠르게 파악할 수 있도록 정보 위계를 명확히 유지
2. **신뢰감** — 신한디에스 딥 블루 계열 브랜드 컬러를 일관되게 적용
3. **밀도** — 대량 데이터를 효율적으로 표시하되 가독성 유지
4. **일관성** — 동일한 컴포넌트 언어와 인터랙션 패턴 사용
5. **접근성** — 상태 정보는 색상 + 텍스트 + 아이콘을 함께 사용

## 사전 준비

UI 코드를 작성하기 전에 반드시 `references/design-tokens.md` 파일을 읽어 CSS 변수, 컬러, 타이포그래피, 스페이싱 등 디자인 토큰을 확인한다.

```
view /mnt/skills/user/shinhan-web-design/references/design-tokens.md
```

페이지 단위 레이아웃을 만들 때는 추가로 `references/page-specs.md`를 읽어 페이지별 구성 명세를 확인한다.

```
view /mnt/skills/user/shinhan-web-design/references/page-specs.md
```

UI에 표시되는 모든 텍스트(버튼, 메시지, 레이블, 안내문구 등)를 작성할 때는 반드시 `references/ux-writing.md`를 읽어 보이스앤톤, 라이팅 원칙, 콘텐츠 유형별 글쓰기 규칙을 확인한다.

```
view /mnt/skills/user/shinhan-web-design/references/ux-writing.md
```

## 구현 규칙

### 폰트

Pretendard를 1순위로 지정한다. 400(Regular)~700(Bold) 웨이트를 사용한다.

```css
font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

Pretendard CDN 로드가 필요한 경우:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" />
```

React/HTML 아티팩트에서는 위 `<link>` 태그를 포함하여 Pretendard 폰트를 로드한다.

### 로고

사이드바 상단에 "SHINHAN" 텍스트 로고를 표시한다.

```
텍스트: "SHINHAN"
서브텍스트: "WIREFRAME SPA" (선택)
```

- 사이드바 상단에 배치
- 메인 텍스트: `font-weight: 700`, `font-size: 18px`, `color: var(--sh-white)`
- 서브 텍스트: `font-size: 10px`, `color: rgba(255,255,255,0.7)`, `letter-spacing: 1px`
- 클릭 시 Dashboard 페이지로 이동

### CSS 변수

모든 색상, 간격, 그림자, 반지름 값은 CSS 변수로 정의한다. 하드코딩하지 않는다.
CSS 변수 전체 목록은 `references/design-tokens.md`에 있다.

### 레이아웃 구조

앱 전체 구조는 **좌측 사이드바(260px) + 상단 헤더(64px) + 콘텐츠** CSS Grid 레이아웃을 사용한다:
- 사이드바: 고정 260px, 배경 `--sh-blue-deep`, 흰색 텍스트, 메인 메뉴 배치
- 헤더: 고정 64px, 흰색 배경, 하단 1px 보더, 검색창 + 유틸리티 아이콘(알림, 설정) + 사용자 정보
- 콘텐츠: 나머지 공간, 패딩 24px, max-width 1400px, 배경 `--sh-gray-background`

자세한 사이드바/헤더 명세는 아래 **내비게이션** 섹션을 참조한다.

### 컴포넌트 생성 패턴

**카드**: 흰색 배경, 8px 둥근 모서리, 1px 보더(#E1E6F0), 24px 패딩, soft 그림자
**버튼**: Primary(#0046FF 배경/흰색 텍스트), Secondary(흰색 배경/#0046FF 텍스트+보더), font-weight 500
**배지**: pill 형태(12px radius), Success(연녹색), Warning(연황색), Error(연적색), font-weight 600
**테이블**: AG Grid 스타일 — 헤더 상단 2px 파란 보더, 흰색 헤더 배경, 셀 세로 구분선, hover 시 #EFF6FF 배경, 셀 기본 가운데 정렬
**탭**: 하단 보더 스타일, 활성 탭은 #0046FF 색상 + 2px 하단 보더, font-weight 600
**필터 바**: 흰색 배경, 8px radius, 검색창 + 드롭다운 조합
**모달**: 12px radius, 32px 패딩, 반투명 블랙 오버레이

### React 아티팩트 작성 시

- Tailwind 유틸리티 클래스 대신 인라인 스타일 또는 `<style>` 태그에 CSS 변수를 정의하여 사용
- Pretendard 폰트 CDN 링크를 포함하거나, 시스템 폰트 스택으로 대체
- Recharts를 차트 라이브러리로 사용 (import 가능)
- lucide-react 아이콘 사용 가능
- 단일 파일로 모든 코드를 포함 (CSS + JSX)
- 컬러는 반드시 디자인 토큰 값을 사용

### HTML 아티팩트 작성 시

- `<style>` 태그 안에 `:root` CSS 변수를 정의
- 외부 스크립트는 cdnjs.cloudflare.com에서 import
- Chart.js 또는 인라인 SVG로 차트 구현

### UX Writing 규칙

UI에 표시되는 모든 텍스트는 `references/ux-writing.md`의 보이스앤톤 및 라이팅 원칙을 따른다. 핵심 요약:

- **보이스**: 경쾌하고 즐거운(Cheerful), 꾸밈없이 명료한(Straightforward), 고객 혜택 강조(Beneficial)
- **톤**: 친근한(Friendly), 쉽고 간결한(Clear), 유익한(Informative), 배려하는(Caring)
- **서술어**: 안내/유의사항은 '하십시오체', 헤드메시지/카피/요청은 '해요체'
- **버튼**: 명사형 4글자 이내, [확인]/[취소]/[다음에]에 '~하기' 금지
- **금지 표현**: '실패', '불가능', 이중 부정, 한자 접두사(기/미/비/불), 지시어(본/당사/하단), 시스템 언어
- **권장 표현**: 고객 주체 능동형, '~해주세요' 요청, 구체적 해결책 제시

## 내비게이션 (사이드바 + 헤더)

앱 내비게이션은 **좌측 사이드바** + **상단 헤더**로 구성된다. 기존 GNB 2행 구조는 사용하지 않는다.

### 전체 구조

```
┌──────────┬──────────────────────────────────────────────────┐
│          │ 헤더: [🔍 메뉴, 계정 검색...]       🔔  ⚙  박동근 님 │
│ SHINHAN  │                                    STANDARD USER  │
│  ├──────────────────────────────────────────────────┤
│          │                                                   │
│ Dashboard│  콘텐츠 영역                                      │
│ Asset ▾  │                                                   │
│ Cost  ▾  │                                                   │
│ Gov   ▾  │                                                   │
│ RTM      │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### 사이드바

- 너비: `260px`, 배경: `var(--sh-blue-deep)` (#002D85), 텍스트: `var(--sh-white)`
- 패딩: `var(--spacing-md)` (16px)
- 상단에 로고 배치, 아래에 메뉴 항목 수직 나열
- `display: flex; flex-direction: column; overflow-y: auto`

### 사이드바 메뉴 항목

메뉴 항목은 다음 5개로 구성:

| 메뉴 | 서브메뉴 |
|------|---------|
| Dashboard | — |
| Asset Management | 서브메뉴 항목들 |
| Cost Management | Cost Summary, Cost Analysis, Anomaly Detection, 청구 내역, Budgets & Alarms, Discounts & Credits, Cost Reports |
| Governance | Gov Summary, Compliance Check, Policy Management, Compliance Logs, Efficiency Index |
| RTM | — |

```css
.sidebar-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  text-decoration: none;
}

.sidebar-menu-item:hover {
  color: var(--sh-white);
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-menu-item.active {
  color: var(--sh-white);
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
}

/* 서브메뉴 */
.sidebar-submenu-item {
  padding: 8px 16px 8px 44px;  /* 들여쓰기 */
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
}
.sidebar-submenu-item.active {
  color: var(--sh-white);
  font-weight: 600;
}
```

### 헤더

- 높이: `64px`, 배경: `var(--sh-white)`, 하단 보더: `1px solid var(--sh-gray-border)`
- 좌우 패딩: `var(--spacing-lg)` (24px)
- `display: flex; align-items: center; justify-content: space-between`

```css
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
```

### 헤더 내 유틸리티 영역

- **좌측/중앙**: 검색창 — placeholder "메뉴, 계정 검색...", `width: 320px`
- **우측**: 알림 아이콘(🔔) + 설정 아이콘(⚙) + 사용자 이름/권한 + 아바타

```css
.header-utility {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-utility-icon {
  font-size: 20px;
  color: var(--sh-dark-secondary);
  cursor: pointer;
}
.header-utility-icon:hover {
  color: var(--sh-dark-primary);
}

.header-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-base);
  color: var(--sh-dark-primary);
}

.header-user-role {
  font-size: var(--font-size-small);
  color: var(--sh-dark-secondary);
}
```

## 페이지 유형별 가이드

| 페이지 | 핵심 구성 요소 | 참조 |
|--------|---------------|------|
| Dashboard | KPI 카드 4개(1행 4열) + 바 차트 + 도넛 차트 + 이상 비용 테이블 | `references/page-specs.md` §Dashboard |
| Anomaly Detection | 트렌드 차트 + 탐지 요약 카드 + 결과 테이블 | `references/page-specs.md` §Anomaly |
| Asset Management | 검색 + AG Grid 스타일 데이터 테이블(파란 상단 보더, 셀 구분선) + 하단 툴바(Excel/페이지네이션) | `references/page-specs.md` §Asset |
| RTM | 필터 바 + 요구사항 추적 테이블 + 활용 가이드 박스 | `references/page-specs.md` §RTM |

## 체크리스트

UI 코드를 완성한 후 다음을 점검한다:

- [ ] CSS 변수가 `:root`에 정의되어 있는가?
- [ ] Pretendard 폰트가 CDN 링크 또는 시스템 폰트 스택으로 포함되어 있는가?
- [ ] Pretendard 폰트가 `font-family`에 지정되어 있는가?
- [ ] 브랜드 컬러(#0046FF, #002D85)가 올바르게 사용되었는가?
- [ ] 사이드바(260px, #002D85) + 헤더(64px) 그리드 레이아웃이 적용되어 있는가?
- [ ] 사이드바 상단에 "SHINHAN" 텍스트 로고가 흰색으로 표시되는가?
- [ ] 사이드바 활성 메뉴에 `font-weight: 600` + 밝은 배경이 적용되어 있는가?
- [ ] 테이블 헤더 상단에 `2px solid #0046FF` 파란 보더 라인이 있는가?
- [ ] 테이블 헤더 배경이 흰색(#FFFFFF)이며, 셀 사이에 세로 구분선이 있는가?
- [ ] 테이블 행 hover 시 #EFF6FF 배경이 적용되는가?
- [ ] 테이블 하단 툴바에 Excel 버튼(녹색 #107C41) + 페이지네이션이 있는가?
- [ ] 배지 색상이 시맨틱 컬러 규칙(Success/Warning/Error)을 따르는가?
- [ ] 카드에 soft 그림자와 8px radius가 적용되어 있는가?
- [ ] 버튼이 Primary/Secondary 패턴을 따르며, font-weight 500인가?
- [ ] 스페이싱이 4/8/16/24/32px 토큰 체계를 따르는가?
- [ ] 버튼 텍스트가 명사형 4글자 이내이며 '~하기' 남용이 없는가?
- [ ] 오류/안내 메시지에 '실패', '불가능', 시스템 언어가 없는가?
- [ ] 안내 문구가 고객 관점의 능동 표현이며, 해결책을 포함하는가?
- [ ] 서술어 톤앤매너가 콘텐츠 유형(안내/요청/마케팅)에 맞는가?
- [ ] 날짜(YYYY.MM.DD), 시간(HH:MM), 금액(세 자리 쉼표+원) 표기가 통일되어 있는가?
