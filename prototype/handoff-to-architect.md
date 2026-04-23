# 아키텍트 핸드오프 — 프로토타입 사용자 컨펌 피드백 반영분

> **작성일**: 2026-04-15
> **작성자**: 04-prototyper (사용자 피드백 반영 라운드)
> **대상**: 01-architect
> **목적**: 프로토타입(`dev/`) 컨펌 과정에서 추가된 기능/정책/UX 결정을 설계 산출물(`design/`, BRD/TRD)에 역반영해야 함

---

## 1. 개요

프로토타입 사용자 컨펌 라운드에서 아래 6가지 변경이 누적되었다. 기능/보안/정책에 영향을 주는 항목이 포함되어 있어, 아키텍트가 BRD·TRD·아키텍처·권한 매트릭스에 역반영해야 한다.

| # | 변경 항목 | 영향 영역 | 설계 반영 필요 |
|---|-----------|-----------|----------------|
| 1 | 시스템 감사 로그(Audit Log) 화면 신설 | 보안/운영, 권한, 스키마, API | ✅ 필수 |
| 2 | 리포트 다운로드(XLSX / PDF) 기능 확정 | BRD MVP 범위, 라이브러리 선정, 서버 생성 파이프라인 | ✅ 필수 |
| 3 | GNB 레이아웃 지터(Jitter) 방지 정책 | 디자인 시스템 / 프론트 공통 CSS | ⚠️ 가이드 문서 반영 |
| 4 | 그리드 카드 세로 리사이즈 + 상태 영속화 | UX 표준, 그리드 공통 동작 | ⚠️ 가이드 문서 반영 |
| 5 | 리사이즈 핸들 위치(카드 우하단 모서리, 3줄) | UI 규격 | ⚠️ 가이드 문서 반영 |
| 6 | `data.js` 더미 데이터 확장(AUDIT_LOGS 30건, AUDIT_ACTIONS) | 데이터 스키마 초안 | ✅ 스키마 확정 필요 |

---

## 2. 상세 변경 사항

### 2.1 시스템 감사 로그(Audit Log) — ★ 가장 큰 변경

#### 요구사항 (사용자 원문)

> 1. 시스템 관리자가 조회할 수 있어. 로그인부터 로그아웃까지 사용자의 모든 활동을 추적할 수 있고, 감사에 사용할 수 있어야 해.
> 2. 모든 화면 조회 시에 조회 이력이 남아야 해. 조회 이력은 조회 결과를 알 수 있도록 **조회 조건을 포함**하여 남겨야 해.
>    예) `리포트 라이브러리 조회 | 유형: 비용분석, 기간: 2025.11, 검색어: 파레토`
> 3. 엑셀 다운로드도 이력을 남겨야 해. 마찬가지로 조회 조건을 포함해야 해.

#### 프로토타입 구현 요약

- 라우트: `#/settings/audit-logs` (ROLE_ADMIN 전용)
- GNB: 환경설정 > 감사 로그 메뉴 추가
- 액션 분류 (`AUDIT_ACTIONS` 상수):
  - `LOGIN`, `LOGIN_FAIL`, `LOGOUT`
  - `VIEW` (모든 화면 조회)
  - `EXPORT` (엑셀 다운로드), `EXPORT_PDF` (PDF 다운로드)
  - `CREATE`, `UPDATE`, `DELETE`, `RESTORE`
  - `PASSWORD_CHANGE`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_APPROVE`
- 기록 포맷: `action | target | conditions` — 조회 조건은 쿼리 파라미터/필터를 문자열화하여 저장
- 모든 `render*()` 함수와 `applyFilter*()`, `exportGridToExcel()`, `handleDownload()` 진입 지점에 `logAudit(...)` 호출 삽입
- 로그인/로그아웃/비밀번호 변경·초기화 요청·승인 등 보안 이벤트도 동일 테이블에 기록

#### 아키텍트가 확정해야 할 사항

| ID | 항목 | 현재 가정 |
|----|------|-----------|
| NEW-AUDIT-01 | 감사 로그 테이블 스키마 (id, user_id, action, target, conditions, ip, user_agent, created_at) | 프로토타입 필드 기준 초안 |
| NEW-AUDIT-02 | 감사 로그 보관 기간 / 파기 정책 | 미정 — TRD 보안 요건 필요 |
| NEW-AUDIT-03 | 감사 로그 조회 API 권한 (ROLE_ADMIN 전용) | 프로토타입 가정과 동일 |
| NEW-AUDIT-04 | 감사 로그 검색/필터 요건 (날짜 범위, 액션, 사용자) | 프로토타입에 1차 반영 |
| NEW-AUDIT-05 | 감사 로그 엑셀 익스포트 자체도 감사 로그를 남기는가 | 프로토타입: 남긴다 |
| NEW-AUDIT-06 | 개인정보(IP/UA/검색어) 마스킹 범위 | 미정 |

#### BRD 영향

- 기존 BRD에 **`다운로드 이력 Audit Log — Phase 2`** 로 표시되어 있었으나, 본 라운드에서 **MVP 범위로 승격** 되었음. BRD 표 갱신 필요.

#### TRD 영향

- 보안 요건(KISA 49개) 중 접근/변경/인증 로그 관련 항목에 "감사 로그 화면 + 보관 정책" 명시 필요.
- 로깅 라이브러리(예: Logback MDC + DB 인서트) 아키텍처 결정 필요.

---

### 2.2 리포트 다운로드 (XLSX / PDF)

#### 요구사항

> 다운로드 기능(excel, pdf)의 프로토타입을 구현해 줘.

#### 프로토타입 구현 요약

- 라이브러리 (프로토타입 한정 — 서버 구현은 TRD 따름):
  - XLSX: **ExcelJS** + **FileSaver** (스타일 포함)
  - PDF: **jsPDF UMD** + **html2canvas** (한글 폰트 이슈 회피를 위해 이미지 기반 변환)
- 파이프라인:
  1. `getReportData(tpl, month)` — 템플릿/월 기준 데이터셋 생성
  2. `exportReportToXlsx(...)` — 타이틀·메타·테이블을 포함한 워크북 작성
  3. `exportReportToPdf(...)` — 오프스크린 `#pdf-print-area`에 렌더 → html2canvas → 멀티페이지 jsPDF
  4. `capturePreviewChartDataUrl()` — ECharts `getDataURL()`로 차트 PNG 임베드
  5. `handleDownload(code)` — 포맷 분기 + 감사 로그(EXPORT / EXPORT_PDF) 기록

#### 아키텍트가 결정해야 할 사항

| ID | 항목 | 현재 가정(프로토타입) | 본 구현 결정 |
|----|------|-----------------------|--------------|
| OPEN-007 | 서버 PDF 라이브러리 | iText 가정 | 확정 필요 — 한글 폰트 임베드 정책 포함 |
| NEW-EXP-01 | 차트를 PDF에 포함하는 방식 | 이미지(base64 PNG) | 서버에서도 동일 접근(headless chrome) vs 서버 차트 엔진 |
| NEW-EXP-02 | XLSX 스타일 가이드(브랜드 컬러/헤더) | 프로토타입 초안 | 디자인 시스템에 맞춰 표준 템플릿화 |
| NEW-EXP-03 | 다운로드는 동기 vs 비동기(대용량) | 프로토타입: 동기 | 리포트 크기별 분기 정책 필요 |

---

### 2.3 GNB 지터(Jitter) 방지

#### 요구사항

> 메뉴를 이동할 때마다 미세하게 화면이 움직이는데 GNB 영역은 절대 따라 움직이지 않았으면 좋겠어.

#### 구현

- `html { scrollbar-gutter: stable; overflow-y: scroll; }` — 스크롤바 영역을 항상 예약하여 페이지 전환 시 가로 위치 이동 0.
- 영향: 모든 화면에 전역 적용.

#### 설계 반영

- 디자인 시스템 가이드에 **"스크롤바 거터 안정화 규칙"** 추가 필요.
- 접근성(AX) 검토 시 회귀 포인트로 관리.

---

### 2.4 그리드 카드 세로 리사이즈 + 상태 영속화

#### 요구사항

> 테이블이 포함된 카드의 세로 크기는 사용자가 조정할 수 있도록 해 주고, 페이지 로딩이 될 때 유지 해 줘.

#### 구현

- `makeGridResizable(gridKey)` 공통 함수
  - 그리드 DOM과 바로 뒤 페이지네이션 툴바를 **`.grid-resize-wrap`** 으로 런타임에 감싸서 함께 리사이즈
  - `resize: vertical`은 래퍼에, 그리드는 `flex: 1; min-height: 0`
  - ResizeObserver로 높이 변경 디바운스 저장: `localStorage["grid-height-<gridKey>"]`
  - 페이지 재진입 시 저장 높이 복원
- 적용 그리드: `users`, `curColumns`, `auditLogs`, `subscribers`, `subLogs`, `recentReports`, `uploadHistory`

#### 설계 반영

- **그리드 공통 UX 표준**으로 격상 — 디자인 시스템 문서에 "그리드 카드는 사용자 리사이즈 가능하며 상태를 영속화한다" 명시 필요.
- 서버/클라이언트 중 어디에 저장할지 결정 필요: 프로토타입은 `localStorage`, 프로덕션은 사용자 설정 API 여부.

---

### 2.5 리사이즈 핸들 위치(카드 우하단 모서리, 3줄)

#### 요구사항

> 표시 위치가 좋지 않아. (스크린샷) 위치를 바꿔줘. 다만 동작은 지금과 같이 목록이 보이는 칸이 줄면 돼. 그리고 빗금도 2~3줄 정도만 표시되면 좋겠어.
> (후속) 핸들을 우측 하단 모서리에 완전히 붙혀줘. 그리고 줄은 딱 3줄만 표시해 줘.

#### 구현

- `.grid-resize-wrap`에 `margin-right: -24px; margin-bottom: -24px; padding-right: 24px; padding-bottom: 24px;`를 부여해 카드 패딩(24px)을 상쇄 → 핸들이 **카드 모서리에 완전히 플러시(flush)**
- `.grid-resize-wrap::after` — 우하단 모서리에 **정확히 3줄** 대각선 힌트(30-40%, 55-65%, 80-90%)
- 동작은 기존과 동일(그리드 영역만 축소, 툴바 48px는 고정)

#### 설계 반영

- 리사이즈 핸들 규격(위치/라인 수/컬러)을 디자인 시스템 가이드에 표준화.

---

### 2.6 더미 데이터 확장

- `data.js` 에 `AUDIT_ACTIONS`, `AUDIT_LOGS[30]` 추가
- `gridIdMap`에 `auditLogs: 'grid-audit-logs'` 매핑

#### 설계 반영

- `docs/design/data-schema.md` (혹은 TRD 스키마 절) 에 `audit_logs` 엔티티 공식 반영.

---

## 3. 변경된 파일 목록 (프로토타입 `dev/`)

| 파일 | 주요 변경 |
|------|-----------|
| `dev/index.html` | jspdf, html2canvas CDN 스크립트 추가 |
| `dev/data.js` | `AUDIT_ACTIONS`, `AUDIT_LOGS` 신설 |
| `dev/app.js` | `logAudit`, `renderAuditLogs`, `initAuditGrid`, `filterAuditGrid`, `getReportData`, `exportReportToXlsx`, `exportReportToPdf`, `capturePreviewChartDataUrl`, `handleDownload`, `makeGridResizable`, `bindGridPagination` 등 |
| `dev/styles.css` | `html { scrollbar-gutter: stable }`, `.audit-*` toolbar, `.pdf-print-area`, `.grid-resize-wrap` / `::after` |
| `.claude/launch.json` | 프로토타입 서버 포트 3030 설정 |

---

## 4. 아키텍트 작업 체크리스트

### 필수 (MVP 범위 확정)

- [ ] BRD: "다운로드 이력 Audit Log"를 **MVP 승격**으로 이동 + 감사 로그 화면 추가 명시
- [ ] BRD: 사용자 역할 권한표에 감사 로그 조회(ROLE_ADMIN) 추가
- [ ] TRD: `audit_logs` 엔티티 스키마, 보관 기간, 인덱스, 마스킹 정책 명시
- [ ] TRD: XLSX/PDF 서버 구현 라이브러리 및 한글 폰트 임베드 정책 확정 (`OPEN-007` 해소)
- [ ] Design 산출물: 감사 로그 화면 와이어/스토리 + API 명세(OpenAPI) 추가
- [ ] 권한 매트릭스: Audit Log R/W, Excel/PDF Download, 설정 저장(서버 영속화 시) 반영

### 가이드 문서 반영

- [ ] 디자인 시스템 가이드: 스크롤바 거터 안정화 규칙
- [ ] 디자인 시스템 가이드: 그리드 카드 리사이즈 표준(동작/핸들/라인 수/영속화)
- [ ] UX 결정 문서(`ux-decisions.md`) 업데이트

### 보안 QA 사전 준비

- [ ] KISA 49개 체크 중 접근/변경/인증 로그 관련 항목에 본 감사 로그 스펙 매핑
- [ ] PDF/XLSX 다운로드가 개인정보/민감정보를 포함할 경우 마스킹 룰 재검토

---

## 5. 열린 질문 (아키텍트 결정 필요)

| ID | 질문 | 프로토타입 임시 결정 |
|----|------|----------------------|
| Q1 | 감사 로그는 별도 DB 스키마/테이블스페이스에 격리할 것인가? | 동일 DB, 단일 테이블 가정 |
| Q2 | 감사 로그는 쓰기 전용(append only)을 DB 제약으로 강제하는가? | 프로토타입 메모리에만 존재 |
| Q3 | 사용자 그리드 높이 등 UX 설정은 서버 저장인가 클라이언트 저장인가? | `localStorage` |
| Q4 | 다운로드 파일은 서버에서 생성 후 다운로드 링크 반환인가, 스트리밍인가? | 프로토타입은 클라이언트 즉시 생성 |
| Q5 | PDF 내 차트 이미지는 서버에서 headless 렌더하는가, 서버 차트 엔진인가? | 프로토타입은 브라우저 ECharts |

---

## 6. 핸드오프 후 다음 단계(권장)

1. 아키텍트가 본 문서를 `design/`에 반영(설계 v1.3) → `docs/context-ledger.md` 업데이트
2. 설계 QA(②) 재수행 — 감사 로그 스키마/권한/보관 정책 집중
3. 프로토타입 컨펌 재개 → 프로토타입 QA(⑤) 진입

---

*끝.*
