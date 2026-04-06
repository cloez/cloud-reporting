# 화면 흐름도 — 클라우드 비용 리포팅 자동화

> **버전**: v1.0  
> **작성일**: 2026-04-06  
> **작성자**: 01-architect  
> **근거 문서**: docs/brd.md, docs/trd.md (§2.4 레이아웃 구조)

---

## 1. 전체 레이아웃 구조

```
┌──────────────────────────────────────────────────────────────────────┐
│ GNB 1행(56px): CLOUD COST REPORTING   [🔍 메뉴 검색...]   🔔 ⚙ 사용자 │
├──────────────────────────────────────────────────────────────────────┤
│ GNB 2행(48px): 대시보드 | 데이터 업로드 | 리포트 라이브러리 | 구독 관리    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  콘텐츠 영역 (배경: #F4F7FC, padding: 24px, max-width: 1400px)        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  각 화면별 컨텐츠                                            │     │
│  │                                                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

- GNB: `position: sticky; top: 0; z-index: 100`
- 콘텐츠: `flex: 1; overflow-y: auto`
- 사이드바 없음

---

## 2. 메인 네비게이션 흐름

```mermaid
flowchart TD
    LOGIN["/login\n로그인"] --> AUTH{인증 성공?}
    AUTH -->|성공| DASH["/dashboard\n대시보드"]
    AUTH -->|실패| LOGIN

    DASH --> UPLOAD["/upload\n데이터 업로드"]
    DASH --> REPORTS["/reports\n리포트 라이브러리"]
    DASH --> SUBS["/subscriptions\n구독 관리"]

    UPLOAD --> REPORTS
    REPORTS --> MODAL["리포트 상세 모달\n(ReportDetailModal)"]
    MODAL --> DOWNLOAD["즉시 다운로드\n(Excel/PDF)"]
    MODAL -->|닫기| REPORTS

    SUBS --> SUB_FORM["구독자 등록/수정 모달\n(SubscriberFormModal)"]
    SUB_FORM -->|저장/취소| SUBS

    DASH --> ADMIN["/admin/users\n사용자 관리\n(ADMIN 전용)"]

    style LOGIN fill:#F4F7FC,stroke:#E1E6F0
    style DASH fill:#0046FF,color:#FFF,stroke:#002D85
    style UPLOAD fill:#0076FF,color:#FFF,stroke:#002D85
    style REPORTS fill:#0076FF,color:#FFF,stroke:#002D85
    style SUBS fill:#0076FF,color:#FFF,stroke:#002D85
    style MODAL fill:#FFF,stroke:#0046FF,stroke-width:2px
    style DOWNLOAD fill:#00C07F,color:#FFF
    style ADMIN fill:#002D85,color:#FFF
```

---

## 3. 화면별 상세 흐름

### 3.1 로그인 (`/login`)

```mermaid
flowchart LR
    A["로그인 폼\n(username + password)"] --> B{JWT 발급}
    B -->|성공| C["대시보드 리다이렉트"]
    B -->|실패| D["오류 메시지 표시\n'아이디 또는 비밀번호를\n확인해 주세요'"]
    D --> A
```

- 공개 접근 — 인증 불필요
- JWT 토큰 → localStorage 저장
- 만료 시 자동 로그인 화면 리다이렉트

### 3.2 대시보드 (`/dashboard`)

```mermaid
flowchart TD
    DASH["대시보드"]
    DASH --> KPI["KPI 카드 영역\n총 비용 | 전월 대비 | 리포트 수 | 구독자 수"]
    DASH --> TREND["월별 비용 추이 차트\n(CostTrendChart — ECharts Line)"]
    DASH --> TOP["서비스 Top 5 차트\n(ServiceBreakdownChart — ECharts Bar)"]
    DASH --> RECENT["최근 리포트 목록\n(AG Grid — 5건)"]
    DASH --> STATUS["업로드 상태 요약\n(StatusBadge)"]

    RECENT -->|카드 선택| MODAL["리포트 상세 모달"]
    KPI -->|비용 클릭| REPORTS["/reports 이동"]
```

- 접근: OPS(전체), VIEWER(소속부서), ADMIN(전체)
- KPI 카드: 실시간 집계 데이터 표시
- VIEWER: 소속 부서 데이터만 필터링 표시

### 3.3 데이터 업로드 (`/upload`)

```mermaid
flowchart TD
    UP["데이터 업로드 화면"]
    UP --> DROP["UploadDropzone\n파일 드래그 앤 드롭"]
    DROP --> PROGRESS["UploadProgressBar\n업로드 진행률"]
    PROGRESS --> PARSE["시트 파싱\n(비동기 처리)"]
    PARSE --> PREVIEW["SheetPreviewTable\n시트 목록 + 미리보기"]
    PREVIEW --> MAP["ColumnMappingPanel\n컬럼 자동 매핑 결과"]
    MAP --> VALID{검증 결과}
    VALID -->|정상| CONFIRM["업로드 확정 버튼"]
    VALID -->|경고/오류| WARN["ValidationResultList\n오류·경고 목록"]
    WARN -->|수정 후 재시도| DROP
    CONFIRM --> DONE["업로드 완료\n→ 리포트 생성 안내"]
    DONE -->|리포트 생성| REPORTS["/reports 이동"]

    UP --> HISTORY["UploadHistoryTable\n과거 업로드 이력"]
```

- 접근: OPS만
- 비동기 처리 — 타임아웃 없음
- Alias 사전으로 컬럼 자동 인식

### 3.4 리포트 라이브러리 (`/reports`)

```mermaid
flowchart TD
    LIB["리포트 라이브러리"]
    LIB --> FILTER["FilterBar\n유형 | 주기 | 부서 | 검색"]
    FILTER --> GRID["ReportCardGrid\n카드 목록 표시"]
    GRID --> CARD["ReportCard 선택"]
    CARD --> MODAL["ReportDetailModal\n리포트 상세 팝업"]
    MODAL --> PREVIEW["미리보기\nAG Grid + ECharts"]
    MODAL --> CONFIG["MonthSelector + FormatSelector\n월·형식 설정"]
    CONFIG --> GEN{리포트 존재?}
    GEN -->|있음| DL["DownloadButton\n즉시 다운로드"]
    GEN -->|없음| CREATE["리포트 생성 요청\n(비동기)"]
    CREATE --> PROG["GenerationProgressIndicator"]
    PROG --> DL
    DL --> LOG["다운로드 이력 기록\n(서버 로그)"]
    MODAL -->|닫기 (X / ESC)| LIB

    FILTER --> EMPTY["EmptyState\n검색 결과가 없어요"]
```

- 접근: OPS(전체), VIEWER(소속부서), ADMIN(전체)
- 카드 → 모달 → 다운로드 팝업 내 완결

### 3.5 구독 관리 (`/subscriptions`)

```mermaid
flowchart TD
    SUB["구독 관리"]
    SUB --> SCHEDULE["ScheduleStatusCard\n다음 발송 예정일"]
    SUB --> TABLE["SubscriberTable\n구독자 목록 (AG Grid)"]
    TABLE -->|등록 버튼| ADD["SubscriberFormModal\n구독자 등록"]
    TABLE -->|행 선택 → 수정| EDIT["SubscriberFormModal\n구독자 수정"]
    TABLE -->|행 선택 → 삭제| DEL["ConfirmDialog\n삭제 확인"]
    ADD -->|저장| TABLE
    EDIT -->|저장| TABLE
    DEL -->|확인| TABLE

    SUB --> LOG["SubscriptionLogTable\n발송 이력"]
    LOG --> DETAIL["발송 상세\n상태: 성공/실패/재시도"]
```

- 접근: OPS(조회만), ADMIN(CRUD)
- 발송 이력: 날짜 필터, 상태 필터 지원

### 3.6 사용자 관리 (`/admin/users`)

```mermaid
flowchart TD
    ADMIN["사용자 관리"]
    ADMIN --> USERS["사용자 목록\n(AG Grid)"]
    USERS -->|등록| ADD["사용자 등록 폼"]
    USERS -->|수정| EDIT["사용자 수정 폼\n역할·부서 변경"]
    USERS -->|비활성화| DEACT["ConfirmDialog\n비활성화 확인"]
    ADD -->|저장| USERS
    EDIT -->|저장| USERS
```

- 접근: ADMIN만
- 사용자 삭제 대신 비활성화 (is_active = false)

---

## 4. 역할별 접근 가능 화면

```mermaid
flowchart LR
    subgraph ROLE_OPS["ROLE_OPS (Cloud Ops)"]
        O1[대시보드 — 전체]
        O2[데이터 업로드]
        O3[리포트 라이브러리 — 전체]
        O4[리포트 생성·다운로드]
        O5[구독 관리 — 조회]
    end

    subgraph ROLE_VIEWER["ROLE_VIEWER (경영진·실무자)"]
        V1[대시보드 — 소속부서]
        V2[리포트 라이브러리 — 소속부서]
        V3[리포트 다운로드 — 소속부서]
    end

    subgraph ROLE_ADMIN["ROLE_ADMIN (시스템 관리자)"]
        A1[대시보드 — 전체]
        A2[리포트 라이브러리 — 전체]
        A3[구독 관리 — CRUD]
        A4[사용자 관리]
    end
```

---

## 5. 모달 흐름 정리

| 모달 | 트리거 | 닫기 | 부모 화면 |
|------|--------|------|----------|
| ReportDetailModal | ReportCard 선택 | X 버튼 / ESC / 오버레이 | /reports |
| SubscriberFormModal | 등록/수정 버튼 | 저장 / 취소 | /subscriptions |
| ConfirmDialog | 삭제/비활성화 | 확인 / 취소 | 전체 |

---

## 6. 라우팅 정리

| 경로 | 화면 | 인증 | 역할 제한 |
|------|------|------|----------|
| `/login` | 로그인 | ❌ | - |
| `/dashboard` | 대시보드 | ✅ | OPS, VIEWER, ADMIN |
| `/upload` | 데이터 업로드 | ✅ | OPS |
| `/reports` | 리포트 라이브러리 | ✅ | OPS, VIEWER, ADMIN |
| `/subscriptions` | 구독 관리 | ✅ | OPS(조회), ADMIN(CRUD) |
| `/admin/users` | 사용자 관리 | ✅ | ADMIN |

- 미인증 접근 시 `/login`으로 리다이렉트
- 권한 부족 시 403 화면 표시

---

*본 문서는 TRD v1.1 §2.4 레이아웃 구조 및 BRD v1.0 기능 요구사항 기반으로 작성되었습니다.*
