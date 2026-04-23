# 기능 분해표 — 클라우드 비용 리포팅 자동화

> **버전**: v3.0 (DQA-v2-012 반영 — F00 5권한화, NFR-06 참조 정리, §7 번호 중복 해소)
> **작성일**: 2026-04-16
> **작성자**: 01-architect
> **근거 문서**: docs/brd.md, docs/trd.md, OPEN-009~017, design/data-model.md v3.0, qa/design/design-qa-report.md v3.0

---

## 0. v2.0 변경 요약

| 항목 | v1.1 → v2.0 |
|------|------------|
| 권한 모델 | 3개 (OPS/VIEWER/ADMIN) → **5개** (SYS_ADMIN/SYS_OPS/TENANT_ADMIN/TENANT_APPROVER/TENANT_USER) |
| 화면 추가 | +시스템 콘솔(`/admin/*`), +테넌트 콘솔(`/t/{slug}/admin/*`), +로그인 분리, +승인함(placeholder) |
| 라우팅 | `/dashboard` 등 단일 → **`/t/{slug}/...` 테넌트 컨텍스트 + `/admin/...` 시스템 콘솔** |
| 조회 단위 | 부서 필터 → **계약(Contract) 컨텍스트** (`/t/{slug}/c/{contractId}/...`) + "전체" 가상 컨텍스트 |
| 업로드 단위 | 파일 자유 | **Payer Account(CLOUD_ACCOUNT) 단위 매핑 필수** — 사전 등록된 Payer만 업로드 가능 |
| MVP 범위 | 다중 클라우드 모호 | **AWS only**, Azure/GCP는 모델만 확장 가능 (OPEN-013) |
| CUR 수집 | 수동 업로드만 | **수동 업로드 (MVP) → AWS S3 직접 다운로드 (향후, OPEN-014)** |

---

## 1. MVP 기능 → 화면 → 컴포넌트 3단계 매핑

### F00. 대시보드 — v3.0: 5권한 + 계약 컨텍스트로 재작성 (DQA-v2-012)

> **v1 DQA-003**: API 4개 엔드포인트와 화면흐름 §3.2에 정의된 대시보드가 기능 분해에 누락 → 복원.
> **v3.0 갱신**: ROLE_OPS/VIEWER/ADMIN 3권한 표기를 v2.0 5권한으로 교체, 경로를 `/t/{slug}/c/{contractId}/dashboard`로 확정.

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| — | 계약 대시보드 (`/t/{slug}/c/{contractId}/dashboard`) | KpiCardGroup | KPI 카드 4종 (이번달 비용, 전월 대비, 리포트 수, 구독자 수) |
| — | | CostTrendChart | 월별 비용 추이 차트 (ECharts — line, 12개월) |
| — | | ServiceTopChart | 서비스 Top 5 비용 차트 (ECharts — bar) |
| — | | RecentReportList | 최근 생성 리포트 목록 (5건, AG Grid) |
| — | | MaskedSumIndicator | 가시 합계 vs 전체 합계 마스킹 비율 표시 |
| — | | MixedCurrencyBadge | `contractId=all`일 때 통화 혼합 경고 |

**비즈니스 규칙** (v3.0):
- **데이터 원천**: COST_DATA 테이블 기반 집계, `(tenant_id, contract_id, year_month)` 복합 인덱스 사용
- **KPI 산출**: 최근 월 총 비용, 전월 대비 증감률(%), 생성 리포트 수, 활성 구독자 수 — 모두 **계약 단위**
- **계약 전환**: GNB의 ContractSelector로 전환 시 URL `{contractId}` 변경 + 재조회 (다중 계약 권한 보유자)
- **권한별 집계 범위**:
  - ROLE_TENANT_ADMIN / TENANT_APPROVER: 계약 내 전체 SubAccount
  - ROLE_TENANT_USER: `TENANT_USER_SCOPE.can_view = true`인 SubAccount만 합산, 나머지는 MaskedSumIndicator로 마스킹 비율 표시
  - ROLE_SYS_ADMIN / SYS_OPS: 시스템 대시보드(`/admin/dashboard`)에서 전 테넌트 KPI 요약 (본 F00과 별도 지표)
- **"전체" 가상 컨텍스트**: `contractId=all` 선택 시 권한 보유 모든 계약 합산 + MixedCurrencyBadge (KRW·USD 혼재 시)
- **대시보드 API**: `/t/{slug}/c/{contractId}/dashboard/{summary|cost-trend|service-top|recent-reports}` (api-spec §9-C)

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

### F07. 테넌트 관리 (SYS_ADMIN) — v2.0 신규 `FR-07-01~04`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-07-01 | 테넌트 관리 (`/admin/tenants`) | TenantTable | 테넌트 목록 (AG Grid — 고객명, 슬러그, 상태, 가입일) |
| FR-07-02 | | TenantFormModal | 테넌트 등록/수정 폼 (고객정보 + 관리자정보 + 슬러그 자동생성·수정) |
| FR-07-03 | | TenantStatusBadge | ACTIVE/DORMANT/TERMINATED/SUSPENDED |
| FR-07-04 | | TenantDetailDrawer | 테넌트 상세 (계약 수, 사용자 수, 최근 활동) |

**비즈니스 규칙**:
- 테넌트 ID 10자리 자동생성 (data-model §7.1)
- 슬러그 자동생성(고객명 음역 → kebab-case) + 등록 화면에서 즉시 수정 가능, 패턴/중복 검증
- 상태 전환: 활성 ↔ 휴면 ↔ 정지 ↔ 해지 (해지는 되돌릴 수 없음, 확인 다이얼로그 필수)
- 등록 시 테넌트 관리자 1명 자동 생성 (이름·부서·직책·전화·이메일·초기 비밀번호)

---

### F08. 계약 관리 (TENANT_ADMIN) — v2.0 신규 `FR-08-01~05`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-08-01 | 계약 목록 (`/t/{slug}/admin/contracts`) | ContractTable | 계약 목록 (AG Grid — 코드, 명, 기간, 상태, 통화) |
| FR-08-02 | 계약 등록 (모달) | ContractFormModal | 13개 속성 입력 폼 (계약유형/통화/정산주기/세금/결제/SLA 등) |
| FR-08-03 | 계약 상세 (`/t/{slug}/admin/contracts/:id`) | ContractDetailHeader | 계약 메타 + 상태 |
| FR-08-03 | | CloudAccountTree | CloudAccount(Payer) → SubAccount 트리 (편집 가능) |
| FR-08-04 | | CloudAccountFormModal | Payer 등록 (provider=AWS, payerAccountId, effectiveFrom/To) |
| FR-08-05 | | SubAccountFormModal | Linked Account 등록 |

**비즈니스 규칙**:
- 계약 코드 자동생성 (`{slug}-{YYYY}-{SEQ}`), 수정 가능
- Payer 등록 전 업로드 시도 시 SYS_OPS에게 "미등록 Payer" 차단 메시지
- Payer 시간 경계: 같은 Payer가 다른 계약으로 이전 시 effective_to 종료 후 새 행
- SubAccount 비활성화 시 신규 업로드 데이터는 "기타" 버킷, 기존 데이터는 보존

---

### F09. 사용자-서브계정 권한 위임 (TENANT_ADMIN) — v2.0 신규 `FR-09-01~02`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-09-01 | 권한 매트릭스 (`/t/{slug}/admin/scopes`) | ScopeMatrix | 사용자(행) × SubAccount(열) 체크박스 매트릭스 |
| FR-09-02 | | ScopeBulkAssign | 계약/Payer 단위로 일괄 권한 부여·회수 |

**비즈니스 규칙**:
- 권한 변경은 즉시 적용, 변경 내역은 AuditLog에 기록
- 사용자에게 권한 보유 SubAccount가 0개면 로그인 후 "권한 없음" 화면 표시

---

### F10. 감사로그 조회 — v2.0 신규 `FR-10-01~03`

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-10-01 | 전역 감사로그 (`/admin/audit`) | AuditLogTable (전역) | SYS_ADMIN 전용, 모든 테넌트 + 시스템 작업 |
| FR-10-02 | 테넌트 감사로그 (`/t/{slug}/admin/audit`) | AuditLogTable (테넌트) | TENANT_ADMIN 전용, 자기 테넌트만 |
| FR-10-03 | 공통 | AuditLogFilterBar | 기간/액션/사용자/대상 필터 + CSV 내보내기 |

**비즈니스 규칙**:
- 보존 기간: MVP 1년 (NFR-05 모니터링 연계)
- SYS_OPS의 모든 데이터 접근(조회 포함)은 자동 기록

---

### F11. CUR 업로드 — Payer 단위 (SYS_OPS) — v2.0 변경 `FR-01-01~05` 확장

기존 F01의 SYS_OPS 화면 버전. 파일 드롭 시 파일명/메타에서 Payer ID 자동 추출 → 사전 등록된 CloudAccount와 매칭.

| 원본 ID | 화면 | 컴포넌트 | 설명 |
|---------|------|---------|------|
| FR-01-01 | CUR 업로드 (`/admin/ops/uploads`) | TenantPayerSelector | 테넌트 → CloudAccount(Payer) 선택 (자동 매칭 우선, 수동 선택 fallback) |
| FR-01-01 | | UploadDropzone | 파일 드롭 |
| — | | PayerMatchResult | 매칭 결과 (성공/미등록 차단 + 안내) |
| FR-01-04 | | ImpactedContractList | "이 업로드는 계약 A, B에 반영됩니다" 안내 |
| FR-01-04 | | UploadConfirmButton | 영향받은 TENANT_ADMIN에게 알림 발송 트리거 |

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

## 3. 역할별 접근 권한 매핑 (v2.0 — 5권한)

### 3.1 권한 매트릭스

| 화면/기능 | SYS_ADMIN | SYS_OPS | TENANT_ADMIN | TENANT_APPROVER | TENANT_USER |
|----------|-----------|---------|--------------|-----------------|-------------|
| **시스템 콘솔 `/admin`** | | | | | |
| 시스템 대시보드 (`/admin/dashboard`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 테넌트 관리 (`/admin/tenants`) — 생성/수정/상태 | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| 시스템 사용자 관리 (`/admin/users`) | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| 전역 감사로그 (`/admin/audit`) | ✅ 전체 | ❌ | ❌ | ❌ | ❌ |
| CUR 업로드 (`/admin/ops/uploads`) | ❌ | ✅ 전 테넌트 | ❌ | ❌ | ❌ |
| 컬럼 매핑/스키마 (`/admin/ops/aliases`) | ❌ | ✅ | ❌ | ❌ | ❌ |
| 환경설정 (`/admin/settings`) | ✅ | ❌ (명시적 차단) | ❌ | ❌ | ❌ |
| **테넌트 콘솔 `/t/{slug}/admin`** | | | | | |
| 테넌트 대시보드 (`/t/{slug}/admin`) | ❌ | ❌ | ✅ | ❌ | ❌ |
| 테넌트 사용자 관리 (`/t/{slug}/admin/users`) | ❌ | ❌ | ✅ CRUD | ❌ | ❌ |
| 계약 관리 (`/t/{slug}/admin/contracts`) | ❌ | ❌ | ✅ CRUD | ❌ | ❌ |
| 사용자-서브계정 권한 위임 (`/t/{slug}/admin/scopes`) | ❌ | ❌ | ✅ | ❌ | ❌ |
| 테넌트 감사로그 (`/t/{slug}/admin/audit`) | ❌ | ❌ | ✅ 자기 테넌트 | ❌ | ❌ |
| **테넌트 사용자 화면 `/t/{slug}/c/{contractId}`** | | | | | |
| 대시보드 | ❌ | ❌ | ✅ 전 계약 | ✅ 전 계약 | ✅ 권한 계약 |
| 리포트 라이브러리 | ❌ | ❌ | ✅ 전 계약 | ✅ 전 계약 | ✅ 권한 계약 |
| 리포트 생성 | ❌ | ❌ | ✅ | ❌ | ❌ |
| 리포트 다운로드 | ❌ | ❌ | ✅ | ✅ | ✅ (권한 SubAccount만) |
| 구독 관리 | ❌ | ❌ | ✅ CRUD | ❌ | ✅ 자기 등록만 |
| 승인함 (`/t/{slug}/approvals`) — placeholder | ❌ | ❌ | ❌ | ✅ (빈 화면) | ❌ |
| **공통** | | | | | |
| Swagger UI (`/swagger-ui`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| 비밀번호 변경 | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.2 데이터 격리 규칙 (RLS — data-model §6)

| 역할 | tenant_id 필터 | SubAccount 필터 |
|------|----------------|-----------------|
| SYS_ADMIN | bypass | bypass |
| SYS_OPS | bypass (감사로그 의무 기록) | bypass |
| TENANT_ADMIN | 자기 tenant_id 강제 | bypass (테넌트 내 전체) |
| TENANT_APPROVER | 자기 tenant_id 강제 | bypass (테넌트 내 전체) |
| TENANT_USER | 자기 tenant_id 강제 | TENANT_USER_SCOPE.can_view 행만 |

### 3.3 로그아웃·세션 만료 리다이렉트 규칙

| 진입 경로 | 로그아웃/세션만료 후 리다이렉트 |
|-----------|--------------------------------|
| `/admin/*` | `/admin/login` |
| `/t/{slug}/*` | `/t/{slug}/login` (테넌트별 로그인 화면) |
| 직접 URL 접근 (미인증) | 위와 동일 규칙 적용, 슬러그 없으면 `/login` |

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

## 5. 화면 목록 요약 (v2.0)

### 5.1 시스템 콘솔
| 경로 | 화면명 | MVP | 접근 역할 |
|------|--------|-----|----------|
| `/admin/login` | 시스템 콘솔 로그인 | ✅ | 공개 |
| `/admin/dashboard` | 시스템 대시보드 (테넌트 수, 업로드 현황) | ✅ | SYS_ADMIN |
| `/admin/tenants` | 테넌트 관리 (등록·수정·상태) | ✅ | SYS_ADMIN |
| `/admin/tenants/:id` | 테넌트 상세 | ✅ | SYS_ADMIN |
| `/admin/users` | 시스템 사용자 관리 (SYS_ADMIN/SYS_OPS 계정) | ✅ | SYS_ADMIN |
| `/admin/audit` | 전역 감사로그 | ✅ | SYS_ADMIN |
| `/admin/ops/uploads` | CUR 업로드 (테넌트·Payer 선택 후 업로드) | ✅ | SYS_OPS |
| `/admin/ops/aliases` | 컬럼 별칭 사전 관리 | ✅ | SYS_OPS |

### 5.2 테넌트 콘솔 (테넌트 관리자)
| 경로 | 화면명 | MVP | 접근 역할 |
|------|--------|-----|----------|
| `/t/{slug}/login` | 테넌트 로그인 | ✅ | 공개 |
| `/t/{slug}/admin` | 테넌트 관리자 대시보드 | ✅ | TENANT_ADMIN |
| `/t/{slug}/admin/users` | 테넌트 사용자 관리 (CRUD + 역할 부여) | ✅ | TENANT_ADMIN |
| `/t/{slug}/admin/contracts` | 계약 관리 (등록·수정·CloudAccount 매핑) | ✅ | TENANT_ADMIN |
| `/t/{slug}/admin/contracts/:id` | 계약 상세 (CloudAccount·SubAccount 트리) | ✅ | TENANT_ADMIN |
| `/t/{slug}/admin/scopes` | 사용자-서브계정 권한 위임 매트릭스 | ✅ | TENANT_ADMIN |
| `/t/{slug}/admin/audit` | 테넌트 감사로그 | ✅ | TENANT_ADMIN |

### 5.3 테넌트 사용자 화면 (계약 컨텍스트)
| 경로 | 화면명 | MVP | 접근 역할 |
|------|--------|-----|----------|
| `/t/{slug}/c/{contractId}/dashboard` | 계약별 대시보드 | ✅ | TENANT_* |
| `/t/{slug}/c/all/dashboard` | 전체(권한 보유 계약 합산) 대시보드 | ✅ | TENANT_* |
| `/t/{slug}/c/{contractId}/reports` | 리포트 라이브러리 | ✅ | TENANT_* |
| `/t/{slug}/c/{contractId}/reports/:id` (모달) | 리포트 상세 | ✅ | TENANT_* |
| `/t/{slug}/c/{contractId}/subscriptions` | 구독 관리 | ✅ | TENANT_ADMIN(CRUD), TENANT_USER(자기 것) |
| `/t/{slug}/approvals` | 승인함 (placeholder, 빈 화면) | ✅ | TENANT_APPROVER |

> **계약 셀렉터**: GNB 2행에 위치, "전체" 옵션 상단 고정, 마지막 선택 `localStorage`에 영속.
> **혼합 통화 경고**: "전체" 모드에서 KRW/USD 혼재 시 배지 + 환산 기준일 표시.

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

> 원본 정의서(CLOUD-REQ-001 v1.0) §5 기반. v3.0: NFR-06 참조 수정 (DQA-v2-012).

| NFR ID | 분류 | 설계 반영 위치 | 반영 상태 |
|--------|------|-------------|----------|
| NFR-01 | 성능 | api-spec §9-A CUR 업로드(비동기 202), component-spec §2.2(UploadProgressBar) | ✅ 반영 |
| NFR-02 | 보안 | api-spec §1.2(JWT RBAC + RLS), data-model §2.11(DownloadLog), §6(RLS 정책) | ✅ 반영 |
| NFR-03 | 호환성 | F03 비즈니스 규칙(OpenXML 준수) | ✅ 반영 |
| NFR-04 | 확장성 | F02 비즈니스 규칙(Library 방식), data-model §2.7(ReportTemplate) | ✅ 반영 |
| NFR-05 | 모니터링 | **신규 — 아래 상세** | ✅ 반영 |
| NFR-06 | 접근 권한 | §3 역할별 접근 권한 매트릭스(5권한), data-model §2.2(ROLE 5권한) + §6(RLS) + 애플리케이션 상수 `RoleTemplateMatrix` (TEMPLATE_ROLE_ACCESS는 v3.0에서 폐기) | ✅ 반영 |

### NFR-05: 모니터링 요구사항 상세

| 항목 | 설명 | 구현 방향 |
|------|------|----------|
| 시스템 성능 모니터링 | API 응답 시간, DB 쿼리 성능, JVM 메트릭 수집 | Spring Boot Actuator + Micrometer |
| 장애 알림 | 서비스 다운, 업로드 파이프라인 장애, 구독 발송 실패 알림 | Alert Rule 설정 (임계치 기반) |
| 로그 수집 | 애플리케이션 로그 중앙 집중화, 구조화된 JSON 로그 | SLF4J + Logback (JSON format) |
| 운영 안정성 | 헬스체크 엔드포인트, K8s liveness/readiness probe | `/actuator/health` |

---

## 8. 원본 FR ID → 설계 커버리지 요약 (v3.0: §7 번호 중복 해소)

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
