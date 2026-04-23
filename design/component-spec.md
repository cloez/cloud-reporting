# 컴포넌트 설계서 — 클라우드 비용 리포팅 자동화

> **버전**: v3.0 (DQA-v2-006 반영 — GNB §1.1 3변형·5권한 매트릭스로 재작성)
> **작성일**: 2026-04-16
> **작성자**: 01-architect
> **근거 문서**: docs/trd.md (§2 디자인 시스템), design/feature-decomposition.md v2.0, design/screen-flow.md v3.0, qa/design/design-qa-report.md v3.0

---

## 0-v3.0. DQA-v2-006 반영

GNB는 더 이상 단일 컴포넌트가 아니라 3변형 **variant**로 구성된다. §1.1 참조. 메뉴 매트릭스는 v1.x의 3권한(OPS/VIEWER/ADMIN) 표기가 아닌 v2.0 5권한(SYS_ADMIN/SYS_OPS/TENANT_ADMIN/TENANT_APPROVER/TENANT_USER)로 확정.

---

## 0. v2.0 신규 컴포넌트 요약

| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| RoleGuard | 라우터 wrapper | 역할 기반 화면 접근 제어, 부족 시 403 |
| TenantContextProvider | 앱 root | URL slug → tenantId 해석, JWT 갱신 |
| ContractSelector | GNB 2행 | 계약 셀렉터 (전체 옵션 + 검색 + 마지막 선택 영속) |
| MixedCurrencyBadge | 대시보드 | "전체" 모드 혼합 통화 경고 |
| MaskedSumIndicator | 차트/KPI | 전체 합계 vs 가시 합계 차이 표기 |
| TenantTable / TenantFormModal | `/admin/tenants` | 테넌트 CRUD |
| SlugInput | TenantFormModal | 영문 슬러그 자동생성 + 즉시 수정 + 패턴/중복 검증 |
| TenantStatusBadge | 전역 | ACTIVE/DORMANT/TERMINATED/SUSPENDED |
| ContractTable / ContractFormModal | `/t/{slug}/admin/contracts` | 계약 CRUD (13속성) |
| CloudAccountTree | 계약 상세 | Payer→SubAccount 트리 편집 |
| TenantPayerSelector | `/admin/ops/uploads` | 테넌트→Payer 선택 (자동매칭+수동) |
| PayerMatchResult | CUR 업로드 | 매칭 성공/미등록 표시 |
| ImpactedContractList | CUR 업로드 | 영향받는 계약 목록 |
| ScopeMatrix | `/t/{slug}/admin/scopes` | 사용자×SubAccount 권한 매트릭스 |
| ScopeBulkAssign | 권한 위임 | 계약/Payer 단위 일괄 부여·회수 |
| AuditLogTable / AuditLogFilterBar | `/admin/audit`, `/t/{slug}/admin/audit` | 감사로그 조회·필터·CSV |
| ApprovalInbox | `/t/{slug}/approvals` | 빈 placeholder ("향후 제공" 안내) |

---

## 1. 공통 레이아웃 컴포넌트

### 1.1 GNB (GlobalNavBar) — v3.0: 3변형 + 5권한 메뉴 매트릭스

경로·역할에 따라 3가지 변형으로 렌더링하는 상단 고정 네비게이션. Props의 `variant`로 스타일과 메뉴 세트를 전환한다.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| variant | 'system' \| 'tenant-admin' \| 'tenant-user' | ✅ | - | GNB 변형 — URL 기반 자동 결정 권장 |
| currentPath | string | ✅ | - | 현재 활성 경로 |
| user | UserInfo | ✅ | - | 로그인 사용자 정보 (roles 다중 가능) |
| tenant | TenantInfo \| null | ⚠ | null | tenant-* 변형에서 필수 (system에서는 null) |
| contract | ContractInfo \| null | ⚠ | null | tenant-user 변형에서 필수, 'all' 가능 |
| availableContracts | ContractInfo[] | ⚠ | [] | tenant-user 변형의 ContractSelector 옵션 |
| onContractChange | (contractId: number \| 'all') => void | ⚠ | - | tenant-user 변형에서 필수 |
| onMenuSearch | (query: string) => void | ❌ | - | 메뉴 검색 콜백 |
| onNotificationClick | () => void | ❌ | - | 알림 아이콘 클릭 |

```typescript
type Role = 'ROLE_SYS_ADMIN' | 'ROLE_SYS_OPS' | 'ROLE_TENANT_ADMIN' | 'ROLE_TENANT_APPROVER' | 'ROLE_TENANT_USER';

interface UserInfo {
  userId: number;
  name: string;
  roles: Role[];          // 다중 역할 가능 (통상 1개)
  email: string;
  department?: string;    // 테넌트 사용자만
  avatarUrl?: string;
}

interface TenantInfo {
  id: string;             // CHAR(10)
  slug: string;           // URL용
  customerName: string;   // GNB 표시명
}

interface ContractInfo {
  id: number | 'all';
  code: string;           // 예: SHC-2026-001
  name: string;           // 계약명
  currency: 'KRW' | 'USD';
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}
```

**변형별 레이아웃**:

| variant | 배경/로고 | 1행 좌측 | 1행 우측 | 2행 메뉴 |
|---------|----------|----------|---------|---------|
| `system` | 딥블루(#002D85), "시스템 콘솔" | 로고 + 역할 뱃지 | 알림 \| 사용자명 \| 로그아웃 | SYS 전용 메뉴 |
| `tenant-admin` | 화이트, 테넌트명 "{customerName} · 관리" | 로고 + Tenant | 알림 \| 사용자 | TENANT_ADMIN 메뉴 |
| `tenant-user` | 화이트, Tenant + ContractSelector | 로고 + Tenant + Selector | 알림 \| 사용자 | TENANT_USER 메뉴 |

**스타일 토큰** (공통):
- 1행: 높이 56px, 하단 보더 `--sh-gray-border`
- 2행: 높이 48px, 배경 `--sh-white`
- 활성 탭: `--sh-blue-primary` 텍스트 + 2px 하단 보더
- 비활성 탭: `--sh-dark-secondary` 텍스트
- 전체: `position: sticky; top: 0; z-index: 100`
- `system` 변형: 1행 배경 `--sh-blue-deep`(#002D85), 텍스트 `--sh-white`

**역할별 메뉴 매트릭스** (v2.0 5권한):

| 메뉴 | 경로 | variant | SYS_ADMIN | SYS_OPS | T_ADMIN | T_APPROVER | T_USER |
|------|------|---------|-----------|---------|---------|-----------|--------|
| 시스템 대시보드 | `/admin/dashboard` | system | ✅ | ✅ | - | - | - |
| 테넌트 관리 | `/admin/tenants` | system | ✅ | ❌ | - | - | - |
| 시스템 사용자 | `/admin/users` | system | ✅ | ❌ | - | - | - |
| 전역 감사로그 | `/admin/audit-logs` | system | ✅ | ❌ | - | - | - |
| CUR 업로드 | `/admin/ops/uploads` | system | ✅ | ✅ | - | - | - |
| 컬럼 별칭(공통) | `/admin/ops/aliases` | system | ✅ | ✅ | - | - | - |
| 테넌트 홈 | `/t/{slug}/admin` | tenant-admin | - | - | ✅ | ❌ | ❌ |
| 계약 관리 | `/t/{slug}/admin/contracts` | tenant-admin | - | - | ✅ | ❌ | ❌ |
| Cloud Account | `/t/{slug}/admin/cloud-accounts` | tenant-admin | - | - | ✅ | ❌ | ❌ |
| 테넌트 사용자 | `/t/{slug}/admin/users` | tenant-admin | - | - | ✅ | ❌ | ❌ |
| 권한 위임(Scope) | `/t/{slug}/admin/scopes` | tenant-admin | - | - | ✅ | ❌ | ❌ |
| 테넌트 감사로그 | `/t/{slug}/admin/audit-logs` | tenant-admin | - | - | ✅ | ❌ | ❌ |
| 계약 대시보드 | `/t/{slug}/c/{id}/dashboard` | tenant-user | - | - | ✅ | ✅ | ✅ |
| 리포트 라이브러리 | `/t/{slug}/c/{id}/reports` | tenant-user | - | - | ✅ | ✅ | ✅ |
| 구독 관리 | `/t/{slug}/c/{id}/subscribers` | tenant-user | - | - | ✅ | ❌ | ⚠ (조회만) |
| 승인함 | `/t/{slug}/approvals` | tenant-user | - | - | ❌ | ✅ | ❌ |

> `-`: 해당 variant에 메뉴 없음 / `❌`: 메뉴 숨김 / `⚠`: 조건부 (상세는 `RoleGuard` 내부 로직)
> SYS_ADMIN이 테넌트 컨텍스트에 진입하려면 별도의 impersonation 플로우 필요 (MVP 범위 외).

---

### 1.2 StatusBadge

pill형 상태 배지. 색상 + 텍스트로 상태 표시 (접근성 — 아이콘 병행).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| status | 'success' \| 'warning' \| 'error' \| 'info' \| 'pending' | ✅ | - | 상태 유형 |
| label | string | ✅ | - | 표시 텍스트 |
| size | 'sm' \| 'md' | ❌ | 'md' | 크기 |

**스타일 매핑**:

| status | 배경 | 텍스트 | 용례 |
|--------|------|--------|------|
| success | `--badge-success-bg` | `--badge-success-text` | 생성 완료, 발송 성공 |
| warning | `--badge-warning-bg` | `--badge-warning-text` | 처리중, 경고 |
| error | `--badge-error-bg` | `--badge-error-text` | 오류, 발송 실패 |
| info | rgba(0,118,255,0.1) | `--color-info` | 정보, 대기 |
| pending | #F0F0F0 | `--sh-dark-secondary` | 대기 중 |

- border-radius: `--radius-lg` (12px, pill형)
- font-size: sm=`--font-size-small`, md=`--font-size-base`

---

### 1.3 ConfirmDialog

확인/취소 다이얼로그.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| isOpen | boolean | ✅ | - | 표시 여부 |
| title | string | ✅ | - | 제목 |
| message | string | ✅ | - | 안내 문구 |
| confirmLabel | string | ❌ | '확인' | 확인 버튼 텍스트 |
| cancelLabel | string | ❌ | '취소' | 취소 버튼 텍스트 |
| variant | 'default' \| 'danger' | ❌ | 'default' | 확인 버튼 스타일 |
| onConfirm | () => void | ✅ | - | 확인 콜백 |
| onCancel | () => void | ✅ | - | 취소 콜백 |

**스타일**: 모달 — 12px radius, 32px padding, 반투명 블랙 오버레이

---

### 1.4 Toast

알림 메시지 컴포넌트.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| type | 'success' \| 'warning' \| 'error' \| 'info' | ✅ | - | 알림 유형 |
| message | string | ✅ | - | 알림 내용 |
| duration | number | ❌ | 3000 | 자동 사라짐 시간 (ms) |
| onClose | () => void | ❌ | - | 닫기 콜백 |

---

### 1.5 LoadingSpinner

비동기 처리 로딩 표시.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| size | 'sm' \| 'md' \| 'lg' | ❌ | 'md' | 크기 |
| message | string | ❌ | - | 로딩 메시지 |
| overlay | boolean | ❌ | false | 전체 화면 오버레이 여부 |

---

## 2. 데이터 업로드 컴포넌트

### 2.1 UploadDropzone

파일 드래그 앤 드롭 영역.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| accept | string | ❌ | '.xlsx,.xls' | 허용 파일 형식 |
| maxSize | number | ❌ | 104857600 | 최대 파일 크기 (bytes, 기본 100MB) |
| onFileSelect | (file: File) => void | ✅ | - | 파일 선택 콜백 |
| isUploading | boolean | ❌ | false | 업로드 중 상태 |
| disabled | boolean | ❌ | false | 비활성화 |

**스타일**:
- 기본: 점선 보더(`--sh-gray-border`), 라운드 `--radius-md`
- 호버/드래그: 점선 보더 `--sh-blue-primary`, 배경 rgba(0,70,255,0.02)
- 아이콘 + "파일을 여기에 놓거나 선택해 주세요" 문구

### 2.2 UploadProgressBar

업로드 진행률 표시.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| progress | number | ✅ | - | 진행률 (0~100) |
| status | 'uploading' \| 'parsing' \| 'validating' \| 'completed' \| 'error' | ✅ | - | 처리 단계 |
| filename | string | ✅ | - | 파일명 |

### 2.3 SheetPreviewTable

업로드된 시트 목록 미리보기 (AG Grid).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| sheets | UploadSheet[] | ✅ | - | 시트 목록 |
| onSheetSelect | (sheetId: number) => void | ❌ | - | 시트 선택 콜백 |

```typescript
interface UploadSheet {
  id: number;
  sheetName: string;    // 시트명
  yearMonth: number;    // 대상 연월
  rowCount: number;     // 행 수
  status: 'VALID' | 'WARNING' | 'ERROR';
}
```

### 2.4 ColumnMappingPanel

컬럼 자동 매핑 결과 표시 + 수동 수정.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| mappings | ColumnMapping[] | ✅ | - | 매핑 결과 |
| standardColumns | string[] | ✅ | - | 표준 컬럼 목록 |
| onMappingChange | (index: number, target: string) => void | ❌ | - | 매핑 수정 콜백 |

```typescript
interface ColumnMapping {
  sourceColumn: string;     // 원천 컬럼명
  mappedColumn: string;     // 매핑된 표준 컬럼명
  confidence: number;       // 매핑 신뢰도 (0~1)
  isAutoMapped: boolean;    // 자동 매핑 여부
}
```

### 2.5 ValidationResultList

검증 결과 오류/경고 목록.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| results | ValidationResult[] | ✅ | - | 검증 결과 목록 |
| onItemClick | (result: ValidationResult) => void | ❌ | - | 항목 클릭 |

```typescript
interface ValidationResult {
  severity: 'error' | 'warning' | 'info';
  sheet: string;        // 시트명
  row?: number;         // 행 번호
  column?: string;      // 컬럼명
  message: string;      // 안내 메시지
}
```

---

## 3. 리포트 라이브러리 컴포넌트

### 3.1 FilterBar

통합 필터 바 (검색 + 드롭다운 조합).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| filters | FilterState | ✅ | - | 현재 필터 상태 |
| onFilterChange | (filters: FilterState) => void | ✅ | - | 필터 변경 콜백 |
| onReset | () => void | ❌ | - | 필터 초기화 |

```typescript
interface FilterState {
  search: string;           // 키워드 검색
  type: string | null;      // 리포트 유형
  period: string | null;    // 주기 (monthly, quarterly)
  department: string | null; // 부서
}
```

**스타일**: 흰색 배경, `--radius-md`, 검색창 + 드롭다운 가로 배치

### 3.2 ReportCard

개별 리포트 카드.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| template | ReportTemplate | ✅ | - | 리포트 템플릿 정보 |
| latestFile | ReportFileSummary \| null | ❌ | null | 최신 생성 파일 요약 |
| onClick | () => void | ✅ | - | 카드 클릭 콜백 |

```typescript
interface ReportTemplate {
  id: number;
  code: string;         // R01~R06
  name: string;         // 리포트명
  description: string;  // 설명
  category: string;     // 유형
  chartType: string;    // 차트 유형
}

interface ReportFileSummary {
  id: number;
  targetYearMonth: number;
  status: string;
  generatedAt: string;
}
```

**스타일**:
- 흰색 배경, `--radius-md` (8px), 1px 보더 `--sh-gray-border`
- padding: `--spacing-lg` (24px)
- 그림자: `--shadow-soft`
- 호버: `--shadow-medium` + 보더 `--sh-blue-secondary`

### 3.3 ReportCardGrid

카드 그리드 레이아웃.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| children | ReactNode | ✅ | - | ReportCard 목록 |
| columns | number | ❌ | 3 | 열 수 |

**스타일**: CSS Grid, gap: `--spacing-lg`, 반응형 (1400px↑: 3열, 900px↑: 2열, 이하: 1열)

---

## 3-b. 리포트 생성 컴포넌트 — DQA-004 신규

### 3-b.1 ReportGenerateForm

리포트 생성 옵션 설정 폼.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| templates | ReportTemplate[] | ✅ | - | 선택 가능 템플릿 목록 |
| selectedTemplateId | number \| null | ❌ | null | 선택된 템플릿 ID |
| availableMonths | number[] | ✅ | - | 선택 가능 연월 (COST_DATA 존재 연월) |
| selectedMonth | number \| null | ❌ | null | 선택된 연월 |
| format | 'XLSX' \| 'PDF' | ❌ | 'XLSX' | 출력 형식 |
| onGenerate | (options: GenerateOptions) => void | ✅ | - | 생성 요청 콜백 |
| isGenerating | boolean | ❌ | false | 생성 중 상태 |

```typescript
interface GenerateOptions {
  templateId: number;
  targetYearMonth: number;
  format: 'XLSX' | 'PDF';
}
```

**스타일**: 카드 내부, 드롭다운 + 버튼 가로 배치, Primary 버튼 "생성"

### 3-b.2 GenerationProgressIndicator

리포트 생성 진행 상태 표시.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| status | 'idle' \| 'generating' \| 'completed' \| 'error' | ✅ | - | 생성 상태 |
| progress | number | ❌ | 0 | 진행률 (0~100) |
| reportName | string | ❌ | - | 생성 중인 리포트명 |
| onRetry | () => void | ❌ | - | 오류 시 재시도 콜백 |
| onDownload | () => void | ❌ | - | 완료 시 다운로드 콜백 |

**상태별 표시**:

| status | 표시 | 스타일 |
|--------|------|--------|
| idle | 숨김 | - |
| generating | 프로그레스 바 + "리포트를 생성하고 있어요" | `--color-info` |
| completed | 체크 아이콘 + "생성 완료" + 다운로드 버튼 | `--color-success` |
| error | 경고 아이콘 + "다시 시도해 주세요" + 재시도 버튼 | `--color-error` |

---

## 4. 리포트 상세 모달 컴포넌트

### 4.1 ReportDetailModal

리포트 상세 팝업 (모달).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| isOpen | boolean | ✅ | - | 표시 여부 |
| template | ReportTemplate | ✅ | - | 리포트 템플릿 |
| onClose | () => void | ✅ | - | 닫기 콜백 |
| onDownload | (yearMonth: number, format: string) => void | ✅ | - | 다운로드 콜백 |
| onGenerate | (yearMonth: number) => void | ✅ | - | 리포트 생성 콜백 |

**스타일**: `--radius-lg` (12px), padding 32px, 반투명 블랙 오버레이, 최대 너비 900px

### 4.2 MonthSelector

대상 월 선택 드롭다운.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| value | number | ✅ | - | 선택된 연월 (YYYYMM) |
| options | number[] | ✅ | - | 선택 가능 연월 목록 |
| onChange | (yearMonth: number) => void | ✅ | - | 변경 콜백 |

### 4.3 FormatSelector

내보내기 형식 선택.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| value | 'XLSX' \| 'PDF' | ✅ | - | 선택된 형식 |
| onChange | (format: string) => void | ✅ | - | 변경 콜백 |

### 4.4 DownloadButton

다운로드 실행 버튼.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| onClick | () => void | ✅ | - | 클릭 콜백 |
| isLoading | boolean | ❌ | false | 로딩 상태 |
| disabled | boolean | ❌ | false | 비활성화 |
| label | string | ❌ | '다운로드' | 버튼 텍스트 |

**스타일**: Primary 버튼 — `--sh-blue-primary` 배경, 흰색 텍스트, `--radius-sm`

---

## 5. 구독 관리 컴포넌트

### 5.1 SubscriberTable

구독자 목록 (AG Grid).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| subscribers | Subscriber[] | ✅ | - | 구독자 목록 |
| canEdit | boolean | ❌ | false | CRUD 허용 여부 (ADMIN만) |
| onAdd | () => void | ❌ | - | 등록 클릭 |
| onEdit | (id: number) => void | ❌ | - | 수정 클릭 |
| onDelete | (id: number) => void | ❌ | - | 삭제 클릭 |

**AG Grid 컬럼 정의**:

| 필드 | 헤더 | 너비 | 정렬 | 필터 |
|------|------|------|------|------|
| name | 수신자명 | 150px | left | text |
| email | 이메일 | 250px | left | text |
| department | 부서 | 150px | left | set |
| isActive | 상태 | 100px | center | set |
| actions | 관리 | 120px | center | - |

**AG Grid Shinhan 테마 적용** (TRD §2.7):
```css
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

### 5.2 SubscriberFormModal

구독자 등록/수정 폼 모달.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| isOpen | boolean | ✅ | - | 표시 여부 |
| mode | 'create' \| 'edit' | ✅ | - | 등록/수정 모드 |
| initialData | Subscriber \| null | ❌ | null | 수정 시 초기 데이터 |
| onSave | (data: SubscriberForm) => void | ✅ | - | 저장 콜백 |
| onCancel | () => void | ✅ | - | 취소 콜백 |

```typescript
interface SubscriberForm {
  name: string;
  email: string;
  department: string;
  accountScope: string | null;
  isActive: boolean;
}
```

### 5.3 SubscriptionLogTable

발송 이력 테이블 (AG Grid).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| logs | SubscriptionLog[] | ✅ | - | 발송 이력 목록 |
| dateRange | [Date, Date] | ❌ | - | 날짜 범위 필터 |

### 5.4 ScheduleStatusCard

다음 발송 예정일 및 상태 카드.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| nextSchedule | string | ✅ | - | 다음 발송 예정일 (YYYY.MM.DD) |
| subscriberCount | number | ✅ | - | 활성 구독자 수 |
| lastResult | 'success' \| 'partial' \| 'failed' \| null | ❌ | null | 최근 발송 결과 |

---

## 6. ECharts 차트 컴포넌트

> ⛔ **필수**: Apache ECharts 사용 — 임의 변경 금지

### 6.1 CostTrendChart

월별 비용 추이 차트 (Line).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| data | CostTrendData[] | ✅ | - | 월별 비용 데이터 |
| showForecast | boolean | ❌ | false | 예측선 표시 여부 |
| height | number | ❌ | 400 | 차트 높이 (px) |

```typescript
interface CostTrendData {
  yearMonth: string;    // "2026-01" 형식
  actualCost: number;   // 실제 비용 (원)
  forecastCost?: number; // 예측 비용 (원)
}
```

**ECharts 설정**:
- 실선: `{ type: 'solid', color: '#0046FF' }` (실제)
- 점선: `{ type: 'dashed', color: '#4D4D4D' }` (예측)
- 팔레트: `['#0046FF', '#0076FF', '#002D85', '#4D8AFF', '#99B8FF']`
- 금액: 세 자리 쉼표 + '원' (tooltip)

### 6.2 ServiceBreakdownChart

서비스별 비용 분포 차트 (Bar + 파레토 복합).

> **원본 FR-03-02**: 막대(구성비) + 라인(추이) + **파레토** 차트

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| data | ServiceCostData[] | ✅ | - | 서비스별 비용 |
| chartMode | 'bar' \| 'pareto' | ❌ | 'pareto' | 차트 모드 |
| showPareto | boolean | ❌ | true | 파레토 누적선 표시 |
| topN | number | ❌ | 5 | 상위 N개 표시 |
| height | number | ❌ | 400 | 차트 높이 |

```typescript
interface ServiceCostData {
  serviceName: string;  // 서비스명
  cost: number;         // 비용 (원)
  ratio: number;        // 비율 (0~1)
  cumulativeRatio?: number; // 누적 비율 (파레토용, 0~1)
}
```

**파레토 모드 ECharts 설정**:
- X축: 서비스명 (비용 내림차순 정렬)
- Y축 좌측: 막대 — 개별 비용 (구성비)
- Y축 우측: 라인 — 누적 비율 (0~100%)
- 80% 기준선: `markLine` 점선 표시 (파레토 원칙)

```javascript
// 파레토 차트 series 구성
const paretoSeries = [
  {
    type: 'bar',
    name: '비용',
    data: sortedCosts,
    itemStyle: { color: '#0046FF' },
    yAxisIndex: 0
  },
  {
    type: 'line',
    name: '누적 비율',
    data: cumulativeRatios,
    itemStyle: { color: '#FF4D4F' },
    yAxisIndex: 1,
    markLine: {
      data: [{ yAxis: 80, name: '80%' }],
      lineStyle: { type: 'dashed', color: '#FFB300' }
    }
  }
];
```

### 6.3 ProductRegionParetoChart

Product·Region별 복합 차트 (막대 + 라인 + 파레토).

> **원본 FR-03-02**: 월별 Product 비용 추이(Top 5), 복합 차트(막대+라인+파레토) 자동 생성

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| data | ProductRegionData[] | ✅ | - | Product·Region별 비용 |
| viewMode | 'product' \| 'region' | ❌ | 'product' | 뷰 모드 전환 |
| showTrend | boolean | ❌ | true | 월별 추이 라인 표시 |
| showPareto | boolean | ❌ | true | 파레토 누적선 표시 |
| topN | number | ❌ | 5 | 상위 N개 표시 |
| height | number | ❌ | 400 | 차트 높이 |

```typescript
interface ProductRegionData {
  name: string;           // Product명 또는 Region명
  cost: number;           // 비용 (원)
  ratio: number;          // 비율 (0~1)
  cumulativeRatio: number; // 누적 비율 (파레토용)
  trend?: {               // 월별 추이 (선택)
    yearMonth: string;
    cost: number;
  }[];
}
```

**ECharts 구성**: 3중 복합 차트
- 막대: 항목별 비용 (구성비, 내림차순)
- 라인 1: 월별 추이 (보조 시계열)
- 라인 2: 누적 비율 (파레토, 우측 Y축)

### 6.4 RegionCostChart

리전별 비용 분포 차트 (Stacked Bar).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| data | RegionCostData[] | ✅ | - | 리전별 비용 |
| height | number | ❌ | 400 | 차트 높이 |

```typescript
interface RegionCostData {
  region: string;
  services: { name: string; cost: number }[];
}
```

### 6.5 TagTreemapChart

태그별 비용 Treemap 차트.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| data | TagCostData[] | ✅ | - | 태그별 비용 |
| height | number | ❌ | 400 | 차트 높이 |

```typescript
interface TagCostData {
  tagName: string;
  tagValue: string;
  cost: number;
}
```

### ECharts 공통 설정

```javascript
// 모든 차트에 공통 적용
const echartsGlobalConfig = {
  color: ['#0046FF', '#0076FF', '#002D85', '#4D8AFF', '#99B8FF'],
  textStyle: {
    fontFamily: "'Pretendard', sans-serif",
    fontSize: 14,
    color: '#1A1A1A'
  },
  tooltip: {
    trigger: 'axis',
    // 금액 포맷: 1,234,567원
    valueFormatter: (value) => `${value.toLocaleString('ko-KR')}원`
  },
  grid: {
    left: 60,
    right: 20,
    top: 40,
    bottom: 40
  }
};
```

---

## 7. AG Grid 공통 설정

> ⛔ **필수**: AG Grid 사용 — 임의 변경 금지

### 공통 Grid Props

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| rowData | any[] | ✅ | - | 행 데이터 |
| columnDefs | ColDef[] | ✅ | - | 컬럼 정의 |
| pagination | boolean | ❌ | true | 페이지네이션 |
| pageSize | number | ❌ | 20 | 페이지당 행 수 |
| enableVirtualScroll | boolean | ❌ | true | 가상 스크롤 (대용량) |

### Shinhan 테마 오버라이드 (TRD §2.7)

```css
.ag-theme-alpine {
  --ag-header-background-color: #F4F7FC;
  --ag-header-foreground-color: #1A1A1A;
  --ag-font-family: 'Pretendard', sans-serif;
  --ag-font-size: 14px;
  --ag-row-hover-color: rgba(0, 70, 255, 0.02);
  --ag-border-color: #E1E6F0;
  --ag-cell-horizontal-padding: 16px;
}
```

---

## 8. 버튼 컴포넌트

### Button

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| variant | 'primary' \| 'secondary' \| 'text' \| 'danger' | ❌ | 'primary' | 스타일 변형 |
| size | 'sm' \| 'md' \| 'lg' | ❌ | 'md' | 크기 |
| label | string | ✅ | - | 버튼 텍스트 (명사형 4자 이내) |
| onClick | () => void | ✅ | - | 클릭 콜백 |
| disabled | boolean | ❌ | false | 비활성화 |
| isLoading | boolean | ❌ | false | 로딩 상태 |
| icon | ReactNode | ❌ | - | 아이콘 (선택) |

**스타일 변형**:

| variant | 배경 | 텍스트 | 보더 |
|---------|------|--------|------|
| primary | `--sh-blue-primary` | 흰색 | 없음 |
| secondary | 흰색 | `--sh-blue-primary` | `--sh-blue-primary` |
| text | 투명 | `--sh-blue-primary` | 없음 |
| danger | `--color-error` | 흰색 | 없음 |

- border-radius: `--radius-sm` (4px)
- UX Writing: 버튼 텍스트는 **명사형 4글자 이내**, '~하기' 남용 금지

---

## 9. 보조 공통 컴포넌트 — DQA-006~007 신규

### 9.1 UploadHistoryTable

과거 업로드 이력 테이블 (AG Grid).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| batches | UploadBatch[] | ✅ | - | 업로드 배치 목록 |
| onBatchSelect | (batchId: number) => void | ❌ | - | 배치 선택 콜백 |

### 9.2 EmptyState

검색 결과 없음 / 데이터 없음 안내.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| icon | ReactNode | ❌ | 기본 아이콘 | 표시 아이콘 |
| title | string | ✅ | - | 안내 제목 |
| description | string | ❌ | - | 안내 설명 |
| actionLabel | string | ❌ | - | 액션 버튼 텍스트 |
| onAction | () => void | ❌ | - | 액션 버튼 클릭 |

### 9.3 Pagination

AG Grid 외부 페이지네이션 (독립 사용 시).

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| currentPage | number | ✅ | - | 현재 페이지 (0-based) |
| totalPages | number | ✅ | - | 전체 페이지 수 |
| onPageChange | (page: number) => void | ✅ | - | 페이지 변경 콜백 |
| size | 'sm' \| 'md' | ❌ | 'md' | 크기 |

### 9.4 Breadcrumb

현재 위치 표시.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| items | BreadcrumbItem[] | ✅ | - | 경로 항목 |

```typescript
interface BreadcrumbItem {
  label: string;
  path?: string;  // 마지막 항목은 path 없음 (현재 위치)
}
```

### 9.5 FilterBar 하위 컴포넌트 — DQA-007

FilterBar 내부 구성 요소. FilterBar가 이들을 조합하여 렌더링.

| 컴포넌트 | Props | 설명 |
|---------|-------|------|
| TypeFilter | `value: string \| null`, `options: string[]`, `onChange` | 리포트 유형 드롭다운 |
| PeriodFilter | `value: string \| null`, `options: string[]`, `onChange` | 주기 드롭다운 |
| DepartmentFilter | `value: string \| null`, `options: string[]`, `onChange` | 부서 드롭다운 |
| SearchInput | `value: string`, `onChange`, `placeholder: string` | 키워드 검색 (debounce 300ms) |
| ActiveFilterChips | `filters: FilterState`, `onRemove: (key: string) => void` | 적용 중인 필터 칩 + 개별 제거 |

> 모든 드롭다운은 Shinhan 디자인 토큰 적용: `--radius-sm`, `--sh-gray-border` 보더, `--font-size-base`

---

## 10. 상태 관리 전략 — DQA-009 신규

### 전역 상태 (React Context)

| Context | 관리 데이터 | 용도 |
|---------|-----------|------|
| AuthContext | JWT 토큰, 사용자 정보 (UserInfo), 역할 | 인증/인가, GNB 메뉴 필터링, RBAC |
| ToastContext | 알림 메시지 큐 | 전역 Toast 표시 |

### 로컬 상태 (useState / useReducer)

| 화면 | 로컬 상태 | 관리 방식 |
|------|----------|----------|
| 데이터 업로드 | 파일 선택, 업로드 진행률, 매핑 결과, 검증 결과 | useState |
| 리포트 라이브러리 | 필터 상태, 카드 목록, 선택된 카드 | useState |
| 리포트 상세 모달 | 모달 open/close, 선택 월, 형식, 생성 상태 | useState |
| 구독 관리 | 구독자 목록, 폼 모달 상태, 발송 이력 | useState |

### 서버 상태 (비동기 데이터)

| 구분 | 전략 | 비고 |
|------|------|------|
| API 호출 | `fetch` + custom hooks (useApi) | React Query 등 라이브러리는 구현 단계에서 결정 |
| 캐싱 | 대시보드 KPI — 5분 캐시, 리포트 목록 — 요청 시 갱신 | stale-while-revalidate 패턴 권장 |
| 폴링 | 업로드 상태, 리포트 생성 상태 — 3초 간격 폴링 | `GET /uploads/{id}/status`, `GET /reports/{id}/status` |

---

## 11. v2.0 신규 컴포넌트 상세

### 11.1 RoleGuard
```typescript
interface RoleGuardProps {
  allow: Role[];                 // ['ROLE_TENANT_ADMIN', ...]
  scope?: 'GLOBAL' | 'TENANT';   // 라우트 스코프
  children: ReactNode;
  fallback?: ReactNode;          // 기본: <Forbidden />
}
```
JWT의 roles[] + 현재 URL slug ↔ tenantId 일치 검사. 불일치 시 403.

### 11.2 TenantContextProvider (Context API)
```typescript
interface TenantContext {
  tenantId: string | null;       // URL slug에서 해석, SYS_*는 null
  tenantSlug: string | null;
  tenantName: string | null;
  primaryRole: Role;
  contracts: ContractSummary[];  // 권한 보유 계약 목록
  currentContractId: number | 'all' | null;
  setCurrentContract: (id: number | 'all') => void;  // localStorage 저장
}
```

### 11.3 ContractSelector
```typescript
interface ContractSelectorProps {
  contracts: ContractSummary[];
  current: number | 'all';
  onChange: (id: number | 'all') => void;
  showAllOption?: boolean;       // 권한 보유 계약 ≥2일 때만 표시
  searchable?: boolean;          // 10건 초과 시 자동 활성
}
```
- 단일 계약 사용자는 셀렉터 비활성(고정 라벨).
- "전체" 선택 시 URL을 `/c/all/...`로 변경.

### 11.4 SlugInput
```typescript
interface SlugInputProps {
  value: string;
  customerName: string;          // 자동생성 시드
  onChange: (slug: string) => void;
  onValidate: (slug: string) => Promise<{ ok: boolean; reason?: string }>;
}
```
- 마운트 시 customerName 변경되면 자동 재생성 (사용자가 수정한 적 없을 때만).
- 입력 시 `^[a-z][a-z0-9-]{1,63}$` 즉시 검증, debounce 500ms로 중복 검증.

### 11.5 TenantFormModal
```typescript
interface TenantFormProps {
  initialValue?: Tenant;          // 수정 모드
  onSubmit: (data: TenantInput) => Promise<void>;
  onCancel: () => void;
}
interface TenantInput {
  customerName: string;
  customerType: 'CORP'|'PERSONAL'|'INTERNAL'|'GROUP';
  bizRegNo?: string; corpRegNo?: string;
  ceoName?: string; industry?: string;
  status: 'ACTIVE'|'DORMANT'|'TERMINATED'|'SUSPENDED';
  joinedAt: string; terminatedAt?: string;
  slug: string;                   // SlugInput으로 자동/수정
  admin: { name: string; dept: string; title: string; phone: string; email: string };
}
```

### 11.6 ContractFormModal
13개 속성 폼. 정산주기·세금적용방식·결제조건·계약유형은 RadioGroup, 위약금/할인/크레딧은 TextArea, SLA는 Switch.

### 11.7 CloudAccountTree
```typescript
interface CloudAccountTreeProps {
  contractId: number;
  cloudAccounts: CloudAccountWithSubs[];
  editable: boolean;              // TENANT_ADMIN: true
  onAddPayer: () => void;
  onAddSubAccount: (cloudAccountId: number) => void;
  onEdit: (node) => void;
}
```
계약 상세 화면에서 Payer→SubAccount 트리, 노드별 effective_from/to 표시.

### 11.8 TenantPayerSelector (SYS_OPS 업로드용)
```typescript
interface TenantPayerSelectorProps {
  detectedPayerId?: string;       // 파일명/메타에서 추출
  onSelect: (cloudAccountId: number) => void;
}
```
탐지된 Payer가 있으면 자동 선택, 없거나 미등록이면 검색 가능 드롭다운으로 fallback.

### 11.9 ScopeMatrix
```typescript
interface ScopeMatrixProps {
  users: TenantUser[];
  subAccounts: SubAccountGrouped[];   // 계약별 그룹핑
  scopes: TenantUserScope[];
  onToggle: (userId: number, subAccountId: number, can: ScopePerm) => void;
}
```
행=사용자, 열=SubAccount(상위 계약/Payer 헤더 그룹). 셀에 can_view/can_subscribe 체크박스.

### 11.10 MixedCurrencyBadge
"전체" 컨텍스트에서 다중 통화 합산 시 "혼합 통화 — KRW 환산 기준 2026-04-15" 노란색 배지.

### 11.11 MaskedSumIndicator
"전체 합계 1.2억원 / 가시 합계 8천만원 (35% 마스킹됨)" 형태 보조 텍스트, 클릭 시 권한 없는 SubAccount 개수 안내 toast.

### 11.12 AuditLogTable
AG Grid 기반. 컬럼: 시각/사용자/액션/대상/IP/상세(확장). 가상스크롤, CSV 내보내기 버튼.

### 11.13 ApprovalInbox (placeholder)
"승인 기능은 향후 제공됩니다 (티켓 시스템 연계 예정)" EmptyState. APPROVAL_REQUEST 테이블에 데이터가 있으면 목록 표시 가능하도록 구조만 마련.

---

*본 문서는 TRD v1.1, QA 회귀(DQA-001~009), 원본 CLOUD-REQ-001, REG-002(OPEN-009~017) 기반으로 작성되었습니다.*
