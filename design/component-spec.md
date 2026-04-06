# 컴포넌트 설계서 — 클라우드 비용 리포팅 자동화

> **버전**: v1.1 (파레토 차트 컴포넌트 추가, 원본 FR-03-02 반영)  
> **작성일**: 2026-04-06  
> **작성자**: 01-architect  
> **근거 문서**: docs/trd.md (§2 디자인 시스템), design/feature-decomposition.md, 원본 CLOUD-REQ-001 §4.3/§7.1

---

## 1. 공통 레이아웃 컴포넌트

### 1.1 GNB (GlobalNavBar)

2행 구조의 상단 고정 네비게이션 바.

| Props | 타입 | 필수 | 기본값 | 설명 |
|-------|------|------|--------|------|
| currentPath | string | ✅ | - | 현재 활성 경로 |
| user | UserInfo | ✅ | - | 로그인 사용자 정보 |
| onMenuSearch | (query: string) => void | ❌ | - | 메뉴 검색 콜백 |
| onNotificationClick | () => void | ❌ | - | 알림 아이콘 클릭 |
| onSettingsClick | () => void | ❌ | - | 설정 아이콘 클릭 |

```typescript
interface UserInfo {
  name: string;         // 사용자명
  role: string;         // ROLE_OPS | ROLE_VIEWER | ROLE_ADMIN
  department: string;   // 소속 부서
  avatarUrl?: string;   // 프로필 이미지
}
```

**스타일 토큰**:
- 1행: 높이 56px, 배경 `--sh-white`, 하단 보더 `--sh-gray-border`
- 2행: 높이 48px, 배경 `--sh-white`
- 활성 탭: `--sh-blue-primary` 텍스트 + 2px 하단 보더
- 비활성 탭: `--sh-dark-secondary` 텍스트
- 전체: `position: sticky; top: 0; z-index: 100`

**메뉴 항목** (역할별 표시):

| 메뉴 | 경로 | OPS | VIEWER | ADMIN |
|------|------|-----|--------|-------|
| 대시보드 | /dashboard | ✅ | ✅ | ✅ |
| 데이터 업로드 | /upload | ✅ | ❌ | ❌ |
| 리포트 라이브러리 | /reports | ✅ | ✅ | ✅ |
| 구독 관리 | /subscriptions | ✅ | ❌ | ✅ |
| 사용자 관리 | /admin/users | ❌ | ❌ | ✅ |

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

*본 문서는 TRD v1.1, QA 회귀(DQA-001~009), 원본 CLOUD-REQ-001 기반으로 작성되었습니다.*
