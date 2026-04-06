# 클라우드 비용 리포팅 자동화 구축 - 기술/보안 요구사항 문서 (TRD)

> **버전**: v1.1  
> **작성일**: 2026-04-06  
> **연관 문서**: 클라우드비용리포팅자동화-BRD.md  
> **플랫폼**: 웹 애플리케이션 (React SPA)  
> **상태**: 초안

---

## 1. 기술 스택

| 구분 | 선택 기술 | 비고 |
|------|----------|------|
| 프론트엔드 | **React SPA** | 단일 페이지 애플리케이션 |
| 차트 | **Apache ECharts** | ⛔ 임의 변경 금지 |
| 그리드/테이블 | **AG Grid** | ⛔ 임의 변경 금지 |
| 백엔드 | **Spring Boot** (컨테이너 기반) + REST API | OpenAPI(Swagger) 자동 문서화 필수 |
| 데이터베이스 | **PostgreSQL** | |
| 컨테이너 | **Docker** (로컬/CI 환경) | 배포는 Kubernetes/컨테이너 오케스트레이션 전제 |
| 인증/인가 | **Spring Security + RBAC** | 역할 기반 접근 제어 + 승인 권한 플래그 |
| AI 분석 | **Claude API (Anthropic)** | 견적 문서 분석 및 데이터 추출용 |
| PDF 생성 | 서버사이드 PDF 렌더링 | 매출 견적 A4 출력용 (예: iText, JasperReports 등) |
| 폰트 | **Pretendard** | 한국어 UI 1순위, 미설치 시 시스템 sans-serif 폴백 |

---

## 2. UI 디자인 시스템 (Shinhan Web Design 적용)

### 2.1 디자인 원칙

본 프로젝트는 **Shinhan Web Design System**을 기준으로 구현한다. 모든 UI 컴포넌트, 색상, 타이포그래피, 스페이싱은 아래 토큰 체계를 따르며 임의 변경하지 않는다.

| 원칙 | 내용 |
|------|------|
| 명확성 | 클라우드 비용 데이터를 빠르게 파악할 수 있도록 정보 위계 명확히 유지 |
| 신뢰감 | 신한디에스 딥 블루 계열 브랜드 컬러 일관 적용 |
| 밀도 | 대량 비용 데이터 효율 표시, 가독성 유지 |
| 일관성 | 동일한 컴포넌트 언어와 인터랙션 패턴 사용 |
| 접근성 | 상태 정보는 색상 + 텍스트 + 아이콘 병행 사용 |

### 2.2 폰트

프로젝트 지정 폰트는 **Pretendard**이며, 미설치 시 시스템 sans-serif로 폴백한다.

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

:root {
  --font-family-sans: 'Pretendard', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

> **참고**: Shinhan 디자인 시스템의 기본 폰트는 OneShinhan이나, 본 프로젝트 기술 스펙에 따라 **Pretendard**를 1순위로 지정한다.

### 2.3 브랜드 컬러 토큰

```css
:root {
  /* ── Brand Colors ── */
  --sh-blue-primary:    #0046FF;   /* 주요 액션, 활성 탭, 링크 */
  --sh-blue-secondary:  #0076FF;   /* Hover 상태, 보조 강조 */
  --sh-blue-deep:       #002D85;   /* 헤더 강조 영역 */
  --sh-dark-primary:    #1A1A1A;   /* 기본 텍스트 */
  --sh-dark-secondary:  #4D4D4D;   /* 보조 텍스트, 캡션 */
  --sh-gray-background: #F4F7FC;   /* 페이지 배경, 테이블 헤더 */
  --sh-gray-border:     #E1E6F0;   /* 테두리, 구분선 */
  --sh-white:           #FFFFFF;   /* 카드·헤더 배경 */

  /* ── Semantic Colors ── */
  --color-success: #00C07F;
  --color-warning: #FFB300;
  --color-error:   #FF4D4F;
  --color-info:    #0076FF;

  /* ── Badge Backgrounds ── */
  --badge-success-bg:   #E6F9F2;
  --badge-success-text: #00C07F;
  --badge-warning-bg:   #FFF7E6;
  --badge-warning-text: #FFB300;
  --badge-error-bg:     #FFF1F0;
  --badge-error-text:   #FF4D4F;

  /* ── Typography ── */
  --font-size-h1:    28px;
  --font-size-h2:    22px;
  --font-size-h3:    18px;
  --font-size-large: 16px;
  --font-size-base:  14px;
  --font-size-small: 12px;

  /* ── Spacing ── */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* ── Border Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* ── Shadows ── */
  --shadow-soft:   0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  --shadow-medium: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
}
```

### 2.4 레이아웃 구조

앱 전체는 **상단 GNB(2행) + 콘텐츠** 수직 구조로 구성한다. 사이드바 없음.

```
┌──────────────────────────────────────────────────────────────────┐
│ 1행(56px): CLOUD COST REPORTING   [🔍 메뉴 검색...]   🔔 ⚙ 사용자 │
├──────────────────────────────────────────────────────────────────┤
│ 2행(48px): 대시보드 | 데이터 업로드 | 리포트 라이브러리 | 구독 관리  │
└──────────────────────────────────────────────────────────────────┘
│ 콘텐츠 영역 (배경: #F4F7FC, padding: 24px, max-width: 1400px)    │
```

- GNB는 `position: sticky; top: 0; z-index: 100`으로 고정
- 콘텐츠 영역은 `flex: 1; overflow-y: auto`

### 2.5 핵심 컴포넌트 스펙

| 컴포넌트 | 스펙 |
|---------|------|
| 카드 | 흰색 배경, 8px radius, 1px 보더(#E1E6F0), 24px 패딩, `--shadow-soft` |
| 버튼 Primary | #0046FF 배경, 흰색 텍스트, 4px radius |
| 버튼 Secondary | 흰색 배경, #0046FF 텍스트+보더 |
| 배지 | pill형(12px radius), Success/Warning/Error 시맨틱 색상 |
| 테이블 헤더 | 배경 #F4F7FC, 16px 셀 패딩, bold |
| 탭 | 하단 보더 스타일, 활성 탭 #0046FF + 2px 하단 보더 |
| 모달 | 12px radius, 32px 패딩, 반투명 블랙 오버레이 |
| 필터 바 | 흰색 배경, 8px radius, 검색창+드롭다운 조합 |

### 2.6 Apache ECharts 차트 컬러 가이드

차트 라이브러리는 **Apache ECharts**를 사용하며, 아래 Shinhan 브랜드 컬러 팔레트를 적용한다.

```javascript
// ECharts 공통 컬러 팔레트
const shinhanPalette = [
  '#0046FF',  // 주요 시리즈
  '#0076FF',  // 보조 시리즈
  '#002D85',  // 3번째 시리즈
  '#4D8AFF',  // 4번째 시리즈
  '#99B8FF',  // 5번째 시리즈
];

// 이상 구간 강조색
const anomalyHighlight = 'rgba(255, 77, 79, 0.1)';

// 예측선 스타일
const forecastLineStyle = { type: 'dashed', color: '#4D4D4D' };
const actualLineStyle   = { type: 'solid',  color: '#0046FF' };
```

### 2.7 AG Grid 스타일 가이드

```css
/* AG Grid Shinhan 테마 오버라이드 */
.ag-theme-alpine {
  --ag-header-background-color: var(--sh-gray-background);
  --ag-header-foreground-color: var(--sh-dark-primary);
  --ag-font-family: var(--font-family-sans);
  --ag-font-size: var(--font-size-base);
  --ag-row-hover-color: rgba(0, 70, 255, 0.02);
  --ag-border-color: var(--sh-gray-border);
  --ag-cell-horizontal-padding: var(--spacing-md);
}
```

### 2.8 UX Writing 규칙

UI에 표시되는 모든 텍스트는 Shinhan SOL UX Writing 가이드라인을 준수한다.

| 항목 | 규칙 |
|------|------|
| 보이스 | 경쾌하고 명료함(Cheerful & Straightforward), 고객 혜택 강조 |
| 버튼 | 명사형 4글자 이내, '~하기' 남용 금지 |
| 금지 표현 | '실패', '불가능', 이중 부정, 한자 접두사(기/미/비/불), 시스템 언어 |
| 안내 문구 | 고객 주체 능동형, 구체적 해결책 포함 |
| 날짜 | YYYY.MM.DD |
| 금액 | 세 자리 쉼표 + 원 (예: 1,234,567원) |

---

## 3. 성능 요구사항

### 3.1 처리량 및 규모

- 예상 동시 사용자 수: Cloud Ops 담당자 소수 + 열람 사용자 다수 (부서별 실무자·경영진)
- 최대 데이터 처리량: 1회 업로드 시 최대 12개월(12 Sheet) 원천 엑셀 대용량 처리
- 데이터 보존 기간: 운영팀 협의 후 확정 (최소 수년치 이력 보존 권장)

### 3.2 응답 속도 기준

| 화면 / 기능 | 목표 응답 시간 | 비고 |
|------------|--------------|------|
| 일반 페이지 로딩 | 3초 이내 | |
| 리포트 카드 목록 조회 | 3초 이내 | |
| AG Grid 대용량 데이터 렌더링 | 2초 이내 | 가상 스크롤(Virtual Scroll) 활용 |
| 대용량 엑셀 업로드·파싱 | 비동기 처리, 타임아웃 없음 | 처리 상태 알림 UI 필수 제공 |
| 리포트 생성 (Excel 산출) | 비동기 처리 | 완료 시 다운로드 활성화 |
| 즉시 다운로드 | 5초 이내 | |
| Claude API 문서 분석 | 30초 이내 | 스트리밍 응답 권장 |

### 3.3 가용성

- 목표 가동률: 99% 이상
- Kubernetes 기반 자동 재시작 및 롤링 업데이트로 무중단 배포
- 점검 가능 시간대: 운영팀 협의 후 결정

---

## 4. 보안 요구사항

### 4.1 인증 및 인가

- 인증 방식: Spring Security 기반 인증 (JWT 토큰 또는 세션, 확정 필요)
- 역할 기반 접근 제어(RBAC): Spring Security + 역할/승인 권한 플래그
- 역할 예시: `ROLE_OPS` (Cloud Ops 담당자), `ROLE_VIEWER` (실무자·경영진), `ROLE_ADMIN` (시스템 관리자)
- 승인 권한 플래그: 특정 기능(리포트 발송 승인 등)에 별도 플래그 적용
- 다중 인증(MFA): 기업 보안 정책에 따라 결정

### 4.2 데이터 보호

- 민감 데이터 항목: 클라우드 비용 원천 데이터 (기업 재무 정보), 구독자 이메일
- 암호화: 전송 시 HTTPS 필수, PostgreSQL 저장 데이터 암호화 적용
- 파일 접근: 생성된 리포트 파일은 권한을 가진 사용자만 다운로드 가능
- API Key 보안: Claude API Key는 서버사이드에서만 관리, 클라이언트 노출 금지

### 4.3 규정 준수

| 규정 | 적용 여부 | 주요 요건 |
|------|----------|----------|
| 개인정보보호법 | 해당 (구독자 이메일) | 수집 목적 명시, 보존 기간 관리 |
| 내부 보안 정책 | 해당 | 보안팀과 접근 권한 정책 사전 협의 필요 |
| 기타 업종 규정 | 미정 | Cloud Ops·보안팀 검토 |

### 4.4 접근 제어

- 역할별 접근 권한 매핑: BRD 섹션 3 참고
- 계정/부서별 템플릿 열람 권한 범위: **보안팀·Cloud Ops 협의 후 확정** (미결 사항)
- 감사 로그(Audit Log): 다운로드 이력 기록 및 구독 발송 이력 기록
- OpenAPI(Swagger) 문서: 내부망 접근만 허용, 운영 환경에서는 인증 필수

---

## 5. 배포 및 운영 환경

### 5.1 컨테이너 & 오케스트레이션

- 로컬/CI 환경: **Docker** (Docker Compose로 전체 스택 로컬 실행 지원)
- 운영 배포: **Kubernetes** (컨테이너 오케스트레이션 전제)
- Spring Boot 애플리케이션은 컨테이너 이미지로 빌드·배포

```
[로컬] docker-compose up  →  React + Spring Boot + PostgreSQL
[운영] Kubernetes Pod 배포  →  Rolling Update, Auto-scaling
```

### 5.2 웹 애플리케이션

- 지원 브라우저: Chrome 최신, Edge 최신, Safari 최신
- 반응형 디자인: 최소한의 Mobile 열람 지원 (주 사용 환경은 Desktop)
- SEO 요구사항: 불필요 (내부 엔터프라이즈 시스템)
- API 문서화: OpenAPI(Swagger) 자동 생성, `/swagger-ui` 경로로 접근

### 5.3 CI/CD

- CI/CD 파이프라인: GitHub Actions 또는 내부 CI 도구 (확정 필요)
- 빌드 아티팩트: Docker 이미지 → Container Registry 푸시 → K8s 배포

---

## 6. 외부 연동 및 통합

| 서비스 / 시스템 | 연동 방식 | 인증 방법 | 비고 |
|---------------|----------|----------|------|
| Claude API (Anthropic) | REST API | API Key (서버사이드 관리) | 견적 문서 분석 및 데이터 추출, 클라이언트 노출 금지 |
| 이메일 발송 서비스 | REST API / SDK | API Key / OAuth | 구독 자동 발송, 재시도 처리 |
| PostgreSQL | JDBC (Spring Data JPA) | DB 계정/비밀번호 | 리포트 설정·구독·이력·권한 데이터 |
| DS Payer (미래) | REST API (예상) | 미정 | 수동 업로드 대체, MVP 이후 |

---

## 7. 데이터 아키텍처 (기술 관점)

### 7.1 데이터 저장 방식

| 데이터 유형 | 저장소 | 백업 주기 |
|------------|--------|----------|
| 원본 엑셀 파일 | 파일 스토리지 (S3 또는 로컬 볼륨) | 수명주기 정책 적용 |
| 생성된 리포트 파일 | 파일 스토리지 | 수명주기 정책 적용 |
| 리포트 설정·템플릿 메타데이터 | PostgreSQL | 매일 |
| 구독자 리스트·발송 이력 | PostgreSQL | 매일 |
| 사용자 권한 데이터 | PostgreSQL | 매일 |

### 7.2 핵심 처리 모듈 (Spring Boot 백엔드)

| 모듈명 | 역할 |
|--------|------|
| Multi-Tab Excel Parser | 최대 12개월 시트 스트리밍 파싱, 대용량 비동기 처리 |
| Schema Mapper | 컬럼 Alias 사전 적용, 유효성 검사 규칙 실행 |
| Aggregation Engine | 다차원(Tag/Region/Account) 집계, Rank·추이·증감률 계산 |
| Excel Template Engine | 서식·차트·피벗 자동 생성, Raw Data 시트 병합, OpenXML 준수 |
| PDF Generator | 서버사이드 PDF 렌더링 (iText 또는 JasperReports), A4 매출 견적 출력 |
| Claude API Integration | 견적 문서 분석 및 데이터 추출 (서버사이드 호출 전용) |
| Subscription Scheduler | 매월 10일 자동 트리거, 재시도 및 실패 처리, 주말·공휴일 순연 |
| Audit & RBAC | 다운로드 이력 기록, Spring Security 역할 기반 접근 제어 |

### 7.3 데이터 마이그레이션

- 기존 데이터 이전 필요 여부: 없음 (신규 구축)
- 기존 수작업 엑셀 이력 데이터의 시스템 적재 여부: 운영팀 협의 후 결정

---

## 8. 기술 제약사항 및 의존성

- **차트 라이브러리 고정**: Apache ECharts — 임의 변경 금지
- **그리드 라이브러리 고정**: AG Grid — 임의 변경 금지
- **AI API 서버사이드 전용**: Claude API Key는 Spring Boot 서버에서만 호출, 프론트엔드 직접 호출 금지
- **Excel 호환성**: OpenXML 표준 준수 필수, Windows·Mac·Mobile 뷰어 호환성 테스트, 폰트·서식 최소화
- **대용량 업로드**: 타임아웃 없는 비동기 처리 구조 필수 (12개월 데이터 동시 처리)
- **API 문서화**: OpenAPI(Swagger) 자동 문서화 필수 — 수동 작성 금지
- **컨테이너 필수**: 모든 실행 환경은 Docker 이미지 기반

---

## 9. 프론트엔드 구현 체크리스트

UI 코드 완성 후 다음 항목을 점검한다:

- [ ] Pretendard 폰트가 CSS `@import`로 로드되어 있는가?
- [ ] CSS 변수(`:root`)에 Shinhan 디자인 토큰이 정의되어 있는가?
- [ ] 브랜드 컬러(#0046FF, #002D85)가 올바르게 적용되어 있는가?
- [ ] GNB 2행(로고 바 + 메뉴 바)이 상단에 sticky 고정되어 있는가?
- [ ] 활성 탭에 파란색 텍스트 + 하단 2px 보더가 적용되어 있는가?
- [ ] Apache ECharts 팔레트에 Shinhan 컬러가 적용되어 있는가?
- [ ] AG Grid에 Shinhan 테마 오버라이드가 적용되어 있는가?
- [ ] 배지 색상이 Success/Warning/Error 시맨틱 규칙을 따르는가?
- [ ] 버튼 텍스트가 명사형 4글자 이내이며 '~하기' 남용이 없는가?
- [ ] 오류/안내 메시지에 '실패', '불가능', 시스템 언어가 없는가?
- [ ] 날짜(YYYY.MM.DD), 금액(세 자리 쉼표+원) 표기가 통일되어 있는가?
- [ ] Claude API 호출이 서버사이드(Spring Boot)에서만 이루어지는가?
- [ ] Swagger UI가 `/swagger-ui` 경로로 접근 가능한가?

---

## 10. 미결 기술 사항 (Open Questions)

| # | 질문 | 영향 범위 | 확인 기한 |
|---|------|----------|----------|
| 1 | 표준 데이터 스키마 (필수 컬럼·데이터 타입) 확정 | Schema Mapper, Aggregation Engine | Apr W1 |
| 2 | 이메일 발송 서비스 최종 선정 | Subscription Scheduler, 외부 연동 | Apr W1 |
| 3 | 구독 발송 휴일 순연 로직 (익영업일 기준) | Scheduler 로직 | Apr W1 |
| 4 | Spring Security 인증 방식 확정 (JWT vs 세션) | 인증/인가 전체 | Apr W1 |
| 5 | 파일 스토리지 선택 (S3 vs 로컬 볼륨 vs GCS) | 업로드·리포트 저장 | Apr W2 |
| 6 | PDF 렌더링 라이브러리 확정 (iText vs JasperReports) | PDF Generator 모듈 | Apr W2 |
| 7 | CI/CD 파이프라인 방식 확정 | 배포 환경 | M2 (Apr W1) |
| 8 | 데이터 보존 기간 정책 (스토리지 수명주기) | 스토리지, Audit Log | Apr W2 |

---

*본 문서는 요구사항 정의서(CLOUD-REQ-001 v1.0)를 기반으로 Shinhan Web Design System 및 확정된 기술 스펙(v1.1)을 반영하여 작성된 기술/보안 요구사항 문서입니다.*  
*비즈니스 목적 및 기능 요구사항은 BRD 문서를 참고하세요.*
