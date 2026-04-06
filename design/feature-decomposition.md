# 기능 분해표 — 클라우드 비용 리포팅 자동화

> **버전**: v1.1 (원본 FR ID 추적성·파레토 차트·NFR-05 반영)  
> **작성일**: 2026-04-06  
> **작성자**: 01-architect  
> **근거 문서**: docs/brd.md, docs/trd.md, docs/요구사항정의서_클라우드비용리포팅자동화.pdf

---

## 1. MVP 기능 → 화면 → 컴포넌트 3단계 매핑

### F00. 대시보드 — DQA-003 신규

> **QA 회귀**: API 4개 엔드포인트, 화��흐름 §3.2에 5개 영역��� 정의��어 있으나 기능 분해에 누락되어 있었음.

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| — | 대시보드 (`/dashboard`) | KpiCardGroup | KPI 카드 4종 (총 비용, 전월 대비, 리포트 수, 구독자 수) |
| — | | CostTrendChart | 월별 비용 추이 차트 (ECharts — line, 12개월) |
| — | | ServiceTopChart | 서비스 Top 5 비용 차트 (ECharts — bar) |
| — | | RecentReportList | 최근 생성 리포트 목록 (5건, AG Grid) |
| — | | UploadStatusSummary | 최근 업로드 상태 요약 (StatusBadge) |

**비즈니스 규칙**:
- **데이터 원천**: COST_DATA 테이블 기반 집계 (DQA-001 해소)
- KPI 산��: 최근 월 총 비용, 전월 대비 증감률(%), 생성 리포트 수, 활성 구독자 수
- ROLE_OPS / ROLE_ADMIN: 전체 데이터 집계
- ROLE_VIEWER: **소속 부서(tag_department) 기준 필터링** 후 집계
- 대시보드 API: `/dashboard/summary`, `/dashboard/cost-trend`, `/dashboard/service-top`, `/dashboard/recent-reports`

---

### F01. 데이터 업로드 및 검증 `FR-01-01~05`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-01-01 | 데이터 업로드 (`/upload`) | UploadDropzone | 엑셀 파일 드래그 앤 드롭 / 파일 선택 영역 |
| FR-01-02 | | UploadProgressBar | 업로드 진행률 표시 (비동기, 스트리밍 파싱) |
| FR-01-01 | | SheetPreviewTable | 업로드된 시트 목록 및 미리보기 (AG Grid) |
| FR-01-03 | | ColumnMappingPanel | 컬럼 자동 매핑 결과 표시 + Alias 사전 + 수동 수정 |
| FR-01-04 | | ValidationResultList | 오류/경고/정상 항목 목록 (StatusBadge 포함) |
| — | | UploadHistoryTable | 과거 업로드 이력 조회 (AG Grid) |

**비즈니스 규칙**:
- 최대 12개월(12 Sheet) 엑셀 파일 동시 처리
- 컬럼 Alias 사전으로 부서별 컬럼명 자동 인식
- 비동기 처리 — 타임아웃 없음, 처리 상태 알림 필수

---

### F02. 리포트 라이브러리 (템플릿 선택) `FR-02-01~03`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-02-01 | 리포트 라이브러리 (`/reports`) | ReportCardGrid | 리포트 카드 그리드 레이아웃 (반응형) |
| FR-02-01 | | ReportCard | 개별 리포트 카드 (아이콘, 제목, 설명, 상태 배지) |
| FR-02-02 | | FilterBar | 유형·주기·부서 조건 필터링 + 검색 |
| — | | StatusBadge | 상태 표시 (생성완료/생성중/오류) |
| — | | EmptyState | 검색 결과 없음 안내 |

**비즈니스 규칙**:
- MVP Top 6 리포트 카드 표시 (OPEN-001 가정 — 아래 §2 참조)
- Library 방식 — 신규 리포트 지속 추가 가능 구조
- ROLE별 열람 가능 카드 필터링

---

### F03. 리포트 생성 `FR-03-01~06`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-03-05 | 리포트 생성 (모달 내) | ReportGenerateForm | 생성 옵션 설정 (월 선택, 형식 등) |
| FR-03-04 | | GenerationProgressIndicator | 생성 진행 상태 표시 (비동기) |
| FR-03-01 | | CostTrendChart | 월별 비용 추이 차트 (ECharts — line) |
| FR-03-02 | | ProductRegionParetoChart | Product·Region별 복합 차트 (ECharts — 막대+라인+**파레토**) |
| FR-03-02 | | ServiceBreakdownChart | 서비스별 비용 비율 차트 (ECharts — bar+**파레토**) |
| FR-03-04 | | PivotSummaryTable | 피벗 요약 테이블 (AG Grid) |

**비즈니스 규칙**:
- Excel 자동 생성: 서식·차트·피벗·Raw Data 시트 포함
- OpenXML 표준 준수, Windows·Mac·Mobile 호환
- 비동기 처리, 완료 시 다운로드 버튼 활성화

---

### F04. 팝업 상세 및 즉시 다운로드 `FR-04-01~04`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-04-01 | 리포트 상세 모달 (`ReportDetailModal`) | ReportDetailHeader | 리포트 제목, 유형, 생성일 |
| FR-04-02 | | ReportPreviewPanel | 데이터 미리보기 (AG Grid + ECharts) |
| FR-04-03 | | MonthSelector | 대상 월 선택 드롭다운 |
| FR-04-03 | | FormatSelector | 내보내기 형식 선택 (Excel, PDF) |
| FR-04-03 | | DownloadButton | 즉시 다운로드 실행 |
| FR-04-01 | | ModalOverlay | 반투명 블랙 오버레이 + 12px radius 모달 |

**비즈니스 규칙**:
- 카드 선택 → 모달 팝업 → 다운로드까지 팝업 내 완결
- 다운로드 이력 Audit Log 기록 (Phase 2 — MVP에서는 서버 로그만)

---

### F05. 구독 발송 `FR-05-01~04`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-05-02 | 구독 관리 (`/subscriptions`) | SubscriberTable | 구독자 목록 (AG Grid — CRUD) |
| FR-05-02 | | SubscriberFormModal | 구독자 등록/수정 폼 (이메일, 부서, 권한) |
| FR-05-04 | | SubscriptionLogTable | 발송 이력 조회 (성공/실패/재시도) |
| FR-05-01 | | ScheduleStatusCard | 다음 발송 예정일 및 상태 표시 |
| FR-05-04 | | StatusBadge | 발송 상태 (성공/실패/재시도/대기) |

**비즈니스 규칙**:
- 매월 10일 09:00 자동 발송
- 실패 시 자동 재시도, 최종 실패 시 관리자 알림
- 휴일 시 익영업일 자동 순연 (OPEN-004 가정)

---

### F06. 목적별 필터링 및 검색 `FR-02-02`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-02-02 | 리포트 라이브러리 내 (`/reports`) | FilterBar | 통합 필터 바 (검색창 + 드롭다운 조합) |
| FR-02-02 | | TypeFilter | 리포트 유형 필터 (드롭다운) |
| FR-02-02 | | PeriodFilter | 주기 필터 (월별/분기별) |
| FR-02-02 | | DepartmentFilter | 부서 필터 (드롭다운) |
| FR-02-02 | | SearchInput | 키워드 검색 입력 |
| — | | ActiveFilterChips | 적용 중인 필터 칩 표시 + 개별 제거 |

**비즈니스 규칙**:
- 12종 리포트 중 조건 조합 필터링
- 실시간 검색 (debounce 적용)
- 필터 초기화 기능 제공

---

## 2. OPEN-001 가정: MVP Top 6 리포트 유형

> ⚠️ **미결 사항**: 경영진·Cloud Ops 최종 확정 전까지 아래 6종을 가정합니다.

| # | 원본 ID | 리포트명 | 주요 내용 | 차트 유형 (ECharts) |
|---|---------|---------|----------|-------------------|
| R01 | FR-03-01 | Cost & Usage 요약 | 월별 총 비용, 전월 대비 증감률, 서비스 Top 5 | Line + Bar 복합 |
| R02 | FR-03-02 | Product·Region별 비용 | 제품군·리전별 비용 분포 | **막대(구성비) + 라인(추이) + 파레토** |
| R03 | FR-03-02 | Service별 사용 비용 | 개별 서비스 비용 상세 및 순위 | **막대(구성비) + 라인(추이) + 파레토** |
| R04 | — | Tag별 현황 | 태그 기준 비용 분류 및 추이 | Treemap + Line |
| R05 | FR-03-03 | Account & Forecast | 계정별 비용 + 예측선 (Forecast) | Line (실선 + 점선 예측) |
| R06 | — | 통합 내보내기 | 전체 데이터 집계 + Raw Data | 테이블 전용 (AG Grid) |

---

## 3. 역할별 접근 권한 매핑

| 화면/기능 | ROLE_OPS | ROLE_VIEWER | ROLE_ADMIN |
|----------|----------|-------------|------------|
| 대시보드 (`/dashboard`) | ✅ 전체 | ✅ 소속 부서 | ✅ 전체 |
| 데이터 업로드 (`/upload`) | ✅ | ❌ | ❌ |
| 리포트 라이브러리 (`/reports`) | ✅ 전체 | ✅ 소속 부서 | ✅ 전체 |
| 리포트 생성 | ✅ | ❌ | ❌ |
| 리포트 다운로드 | ✅ 전체 | ✅ 소속 부서 | ✅ 전체 |
| 구독 관리 (`/subscriptions`) | ✅ 조회 | ❌ | ✅ CRUD |
| 구독자 등록/수정/삭제 | ❌ | ❌ | ✅ |
| 구독 발송 트리거 | ✅ | ❌ | ✅ |
| 사용자/권한 관리 | ❌ | ❌ | ✅ |
| Swagger UI (`/swagger-ui`) | ✅ | ❌ | ✅ |

> **OPEN-003 가정**: ROLE_VIEWER는 소속 부서 데이터만 접근 가능. 부서-계정 매핑은 ROLE_ADMIN이 관리.

---

## 4. 공통 화면 컴포넌트

| 컴포넌트 | 사용 위치 | 설명 |
|---------|----------|------|
| GNB (GlobalNavBar) | 전체 | 2행 구조 — 1행: 로고+검색+사용자, 2행: 메뉴 탭 |
| StatusBadge | 전체 | pill형 배지 (Success/Warning/Error) |
| ConfirmDialog | 전체 | 확인/취소 다이얼로그 |
| Toast | 전체 | 알림 메시지 (성공/경고/오류) |
| LoadingSpinner | 전체 | 비동기 처리 로딩 표시 |
| Pagination | 테이블 화면 | AG Grid 페이지네이션 |
| Breadcrumb | 전체 (선택) | 현재 위치 표시 |

---

## 5. 화면 목록 요약

| 경로 | 화면명 | MVP | 접근 역할 |
|------|--------|-----|----------|
| `/dashboard` | 대시보드 | ✅ | OPS, VIEWER, ADMIN |
| `/upload` | 데이터 업로드 | ✅ | OPS |
| `/reports` | 리포트 라이브러리 | ✅ | OPS, VIEWER, ADMIN |
| `/reports/:id` (모달) | 리포트 상세 | ✅ | OPS, VIEWER, ADMIN |
| `/subscriptions` | 구독 관리 | ✅ | OPS(조회), ADMIN(CRUD) |
| `/admin/users` | 사용자 관리 | ✅ | ADMIN |
| `/login` | 로그인 | ✅ | 공개 |

---

## 6. Phase 2 / 향후 기능 — DQA-005 신규

> BRD §7.2에 정의된 비-MVP 기능의 Phase ���분 명시.

| 기능 | 원본 ID | Phase | 우선순위 | 비고 |
|------|---------|-------|---------|------|
| 스키마 검증 UI | FR-01-05 | Phase 2 | 중간 | 컬럼 매핑 현황 시각적 표시, 운영 안정화 후 추가 |
| 다운로드 이력 Audit Log 조회 | FR-04-04 | Phase 2 | 중간 | MVP에서 서버 로그만 기���, Phase 2에서 UI ���회 추가 |
| 추가 리포트 7~12번 (6종) | — | 이후 | 낮음 | 의사결정 완료 후 순차 추가, Library 구조로 확장 가능 |
| DS Payer 자동 ���동 | — | 이후 | 낮음 | DS Payer 환경 구축 이후 구현, 수동 업로드 대체 |

---

## 7. 비기능 요구사항 추적 (NFR)

> 원본 정의서(CLOUD-REQ-001 v1.0) §5 기반

| NFR ID | 분류 | 설계 반영 위치 | 반영 상태 |
|--------|------|-------------|----------|
| NFR-01 | 성능 | api-spec §3(업로드 비동기 202), component-spec §2.2(UploadProgressBar) | ✅ 반영 |
| NFR-02 | 보안 | api-spec §1.2(JWT RBAC), data-model §2.11(DownloadLog) | ✅ 반영 |
| NFR-03 | 호환성 | F03 비즈니스 규칙(OpenXML 준수) | ✅ 반영 |
| NFR-04 | 확장성 | F02 비즈니스 규칙(Library 방식), data-model §2.6(ReportTemplate) | ✅ 반영 |
| NFR-05 | 모니터링 | **신규 — 아래 상세** | ✅ 반영 |
| NFR-06 | 접근 권한 | §3 역할별 접근 권한, data-model §2.7(TemplateRoleAccess) | ✅ 반영 |

### NFR-05: 모니터링 요구사항 상세

| 항목 | 설명 | 구현 방향 |
|------|------|----------|
| 시스템 성능 모니터링 | API 응답 시간, DB 쿼리 성능, JVM 메트릭 수집 | Spring Boot Actuator + Micrometer |
| 장애 알림 | 서비스 다운, 업로드 파이프라인 장애, 구독 발송 실패 알림 | Alert Rule 설정 (임계치 기반) |
| 로그 수집 | 애플리케이션 로그 중앙 집중화, 구조화된 JSON 로그 | SLF4J + Logback (JSON format) |
| 운영 안정성 | 헬스체크 엔드포인트, K8s liveness/readiness probe | `/actuator/health` |

---

## 7. 원본 FR ID → 설계 커버리지 요약

| 원본 ID | 기능명 | 기능 분해 | 데이터 모델 | 화면 흐름 | 컴포넌트 | API |
|---------|--------|----------|-----------|----------|---------|-----|
| FR-01-01 | Excel 파일 업로드 | F01 ✅ | UploadBatch ✅ | §3.3 ✅ | UploadDropzone ✅ | POST /uploads ✅ |
| FR-01-02 | 대용량 파싱 엔진 | F01 ✅ | UploadSheet ✅ | §3.3 ✅ | UploadProgressBar ✅ | GET /uploads/{id}/status ✅ |
| FR-01-03 | 컬럼 자동 매핑 | F01 ✅ | ColumnAlias ✅ | §3.3 ✅ | ColumnMappingPanel ✅ | PUT /uploads/{id}/mappings ✅ |
| FR-01-04 | 데이터 정합성 체크 | F01 ✅ | UploadSheet.validation ✅ | §3.3 ✅ | ValidationResultList ✅ | GET /uploads/{id} ✅ |
| FR-01-05 | 스키마 검증 UI | Phase 2 | — | — | — | — |
| FR-02-01 | 리포트 라이브러리 | F02 ✅ | ReportTemplate ✅ | §3.4 ✅ | ReportCard ✅ | GET /templates ✅ |
| FR-02-02 | 목적별 필터링 | F06 ✅ | — | §3.4 ✅ | FilterBar ✅ | GET /templates (query) ✅ |
| FR-02-03 | 템플릿 확장성 | F02 ✅ | ReportTemplate ✅ | — | — | — |
| FR-03-01 | Cost & Usage 요약 | F03 ✅ | ReportFile ✅ | §3.4 ✅ | CostTrendChart ✅ | POST /reports/generate ✅ |
| FR-03-02 | Product/Region별+파레토 | F03 ✅ | ReportFile ✅ | §3.4 ✅ | ProductRegionParetoChart ✅ | POST /reports/generate ✅ |
| FR-03-03 | Account & Forecast | F03 ✅ | ReportFile ✅ | §3.4 ✅ | CostTrendChart ✅ | POST /reports/generate ✅ |
| FR-03-04 | 집계 엔진 | F03 ✅ | — (서버 로직) | — | PivotSummaryTable ✅ | — (서버 내부) |
| FR-03-05 | Excel 템플릿 엔진 | F03 ✅ | ReportFile ✅ | — | — (서버) | POST /reports/generate ✅ |
| FR-03-06 | 웹 차트 렌더링 | F03 ✅ | — | §3.4 ✅ | ECharts 컴포넌트 ✅ | GET /reports/{id}/preview ✅ |
| FR-04-01 | 카드 → 모달 팝업 | F04 ✅ | — | §3.4 ✅ | ReportDetailModal ✅ | — |
| FR-04-02 | 미리보기 | F04 ✅ | — | §3.4 ✅ | ReportPreviewPanel ✅ | GET /reports/{id}/preview ✅ |
| FR-04-03 | 즉시 다운로드 | F04 ✅ | DownloadLog ✅ | §3.4 ✅ | DownloadButton ✅ | GET /reports/{id}/download ✅ |
| FR-04-04 | 다운로드 이력 | Phase 2 | DownloadLog ✅ | — | — | — |
| FR-05-01 | 자동 발송 스케줄러 | F05 ✅ | SubscriptionLog ✅ | §3.5 ✅ | ScheduleStatusCard ✅ | GET /subscriptions/schedule ✅ |
| FR-05-02 | 구독자 리스트 관리 | F05 ✅ | Subscriber ✅ | §3.5 ✅ | SubscriberTable ✅ | CRUD /subscribers ✅ |
| FR-05-03 | 주말/공휴일 예외처리 | F05 ✅ | — (서버 로직) | — | — | — (서버 내부) |
| FR-05-04 | 재시도 및 실패 처리 | F05 ✅ | SubscriptionLog ✅ | §3.5 ✅ | StatusBadge ✅ | GET /subscriptions/logs ✅ |

---

*본 문서는 BRD v1.1, TRD v1.1, 원본 요구사항정의서(CLOUD-REQ-001 v1.0) 기반으로 작성되었습니다.*
