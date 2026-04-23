# UX Decisions — 프로토타입 의사결정 기록

> **작성**: 04-prototyper / 2026-04-06
> **v1 보강**: 04-prototyper / 2026-04-12 (감사로그 + 다운로드 + GNB jitter + 그리드 리사이즈)
> **v2 보강 라운드**: 04-prototyper / 2026-04-16 (3-track 라우팅 + 5-role + 멀티테넌트 + 로그인 + 마스킹)

---

## 설계 대비 변경/결정 사항

### UXD-001: 해시 라우팅 채택

- **설계**: React SPA (screen-flow.md)
- **프로토타입**: Vanilla JS + 해시 라우팅 (`#/dashboard`, `#/upload` 등)
- **사유**: 프로토타입 단계에서 빌드 도구 없이 `npx serve`로 즉시 실행 가능하도록 경량 구현. 프로덕션(07-builder)에서 React SPA로 전환 예정.
- **영향**: 없음 — 화면 구조와 컴포넌트는 동일하게 구현

### UXD-002: 단일 HTML 진입점 + JS 분리

- **설계**: React 컴포넌트 트리
- **프로토타입**: `index.html` (셸) + `data.js` (더미) + `app.js` (전체 로직) + `styles.css`
- **사유**: CDN 기반 프로토타입에서 파일 수를 최소화하여 관리 용이성 확보
- **영향**: 프로덕션에서 컴포넌트 단위 파일 분리 필요

### UXD-003: 로그인 화면 미구현 ~~(v2 보강에서 무효화)~~

- ~~**설계**: `/login` 화면 포함 (screen-flow.md)~~
- ~~**프로토타입**: 미구현 — `CURRENT_USER = kimops (ROLE_OPS)`로 하드코딩~~
- **상태**: **OBSOLETE (2026-04-16)** — UXD-013 (로그인 3분할)에 의해 대체됨. v2 보강 라운드에서 시스템·테넌트 양 트랙 로그인 화면을 모두 구현하고 5-role 모델에 맞춘 빠른 테스트 계정을 제공함

### UXD-004: 관리자(Users) 탭 미포함 ~~(v2 보강에서 무효화)~~

- ~~**설계**: ROLE_ADMIN 전용 `/admin/users` 화면~~
- ~~**프로토타입**: GNB 탭에서 제외 (현재 사용자가 ROLE_OPS이므로)~~
- **상태**: **OBSOLETE (2026-04-16)** — UXD-008 (5-role) + UXD-009 (3-track)로 대체. 시스템 콘솔(`#/admin/*`) GNB와 테넌트 관리자 콘솔(`#/t/{slug}/admin/*`) GNB가 분리되며, 각 트랙별 관리 화면을 구현함

### UXD-005: 업로드 시뮬레이션

- **설계**: 실제 파일 파싱 + 서버 통신
- **프로토타입**: 파일 선택 후 시뮬레이션 (progress bar 애니메이션 → 고정 매핑 결과 표시)
- **사유**: 백엔드 없이 UI 플로우만 검증
- **영향**: 프로덕션에서 실제 API 연동 필요

### UXD-006: 리포트 다운로드 토스트 대체

- **설계**: 실제 파일 다운로드 (GET /reports/{id}/download)
- **프로토타입**: 토스트 알림으로 대체 ("다운로드 시작")
- **사유**: 실제 파일 생성 불가
- **영향**: 프로덕션에서 Blob 다운로드 구현

### UXD-007: 구독자 CRUD 비영속

- **설계**: API를 통한 영속적 CRUD
- **프로토타입**: 등록/수정/삭제 시 토스트만 표시, 실제 데이터 미변경
- **사유**: 서버 없이 UI 인터랙션만 검증
- **영향**: 프로덕션에서 API 연동 + 상태 관리

### UXD-008: DQA-010 batch_id nullable 반영

- **설계 리뷰**: REPORT_FILE.batch_id를 nullable FK로 처리 (조건부 승인 사항)
- **프로토타입**: 더미 데이터에서 batch_id 필드 미포함 (yearMonth 기반 조회)
- **사유**: 프로토타입에서는 COST_DATA 기반 월별 조회만 시뮬레이션
- **영향**: 프로덕션 DB 스키마에서 `batch_id BIGINT NULL REFERENCES upload_batch(id)` 적용 필요

---

## v1 보강 라운드 결정 사항 (2026-04-12)

### UXD-009: 감사로그 전 화면 적용 (조회 조건 포함)

- **트리거**: 사용자 리뷰 FB-001 — "조회·다운로드 행위가 감사 추적되는지 명확하지 않음"
- **결정**: `logAudit(action, resourceType, resourceId, detail)` 헬퍼를 모든 화면에 삽입
  - LIST_VIEW / DETAIL_VIEW / DOWNLOAD / FILTER_CHANGE / CREATE / UPDATE / DELETE
  - 조회 조건(yearMonth, accountId, range 등)을 detail JSON에 포함
- **사유**: KISA·금감원 감사 가이드 + TRD 보안 요건 충족. 프로토타입 단계에서 감사로그 데이터 모델을 시각화하여 백엔드 설계 입력값 제공
- **MVP 승격**: 감사로그를 BRD 후순위 → MVP 핵심 기능으로 격상 (NEW-AUDIT-01~06)
- **영향**: 프로덕션에서 `audit_log` 테이블 + AOP 기반 자동 기록기 구현 필요

### UXD-010: 이미지 기반 PDF 생성 (한글 보존)

- **트리거**: jsPDF 직접 텍스트 출력 시 한글 깨짐 + 폰트 임베딩 부담
- **결정**: html2canvas로 화면 캡처 → jsPDF의 `addImage()`로 PDF 페이지 생성
  - 멀티페이지: 캡처 높이가 A4를 초과하면 자동 분할
- **사유**: 한글 폰트 라이선스/CDN 부담 회피, 차트·표·KPI를 그대로 보존하여 보고용 품질 확보
- **트레이드오프**: 텍스트 검색 불가 (이미지 PDF). 검색 가능한 PDF가 필요하면 프로덕션에서 iText + Pretendard 임베딩으로 전환 (TRD OPEN-007)
- **영향**: 프로덕션 PDF 라이브러리 결정에 영향 — iText vs html-to-pdf vs Apache PDFBox

### UXD-011: 카드 단위 그리드 리사이즈 + localStorage 영속화

- **트리거**: AG Grid의 행 수가 화면마다 달라 카드 높이를 사용자가 조절하고 싶다는 피드백 (FB-003)
- **결정**:
  - `.grid-resize-wrap` div로 [툴바 + 그리드]를 래핑하고 `resize: vertical` 적용
  - ResizeObserver로 높이 변경 감지 → `ccr_gridHeight_{key}` localStorage에 저장
  - 페이지 재방문 시 저장된 높이 복원
- **핸들 위치**: 카드 우측 하단 모서리에 정확히 배치 (margin offset -24px + padding 24px 기법)
- **핸들 패턴**: 정확히 3줄 대각선 (10px × 10px 영역 내 30-40%, 55-65%, 80-90%)
- **사유**: 한 화면에 그리드가 여러 개 있어도 각각 독립적으로 높이 기억. 카드 코너에 시각적으로 부착되어 직관적
- **영향**: 프로덕션에서 컴포넌트화 (`<ResizableGridCard>`)

### UXD-012: GNB 스크롤 점프 방지 (scrollbar-gutter)

- **트리거**: GNB sticky 적용 시 스크롤바 등장/소멸로 인한 1~2px 가로 jitter
- **결정**: `body { scrollbar-gutter: stable; overflow-y: scroll; }` 조합
- **사유**: 스크롤바 영역을 항상 예약하여 콘텐츠 폭 변동 차단. 모던 브라우저 호환
- **영향**: 모든 페이지에서 일관된 레이아웃 보장

---

## v2 보강 라운드 결정 사항 (2026-04-16)

### UXD-013: 3-track 라우팅 구조 채택

- **트리거**: 핸드오프 v1.0 (ecstatic-montalcini) — 시스템 운영자 / 테넌트 관리자 / 테넌트 사용자가 동일 콘솔을 공유할 경우 권한·범위·전환 흐름이 모호
- **결정**: 해시 라우팅을 3개 트랙으로 분리
  - **시스템 트랙**: `#/admin/*` — 전체 테넌트·계약·계정 운영
  - **테넌트 관리자 트랙**: `#/t/{slug}/admin/*` — 단일 테넌트의 계약·사용자·정책 관리
  - **테넌트 사용자 트랙**: `#/t/{slug}/c/{contractId}/*` — 계약 단위 비용·리포트 소비
- **사유**: URL만으로 사용자가 현재 어느 권한·어느 테넌트·어느 계약 컨텍스트에 있는지 식별 가능. 백엔드 컨트롤러 분리(@RequestMapping 분기)도 자연스러움
- **영향**: 프로덕션 React Router 구조 + Spring 컨트롤러 패키지 분리 (`controller.system.*`, `controller.tenant.admin.*`, `controller.tenant.user.*`)

### UXD-014: 5-role RBAC 모델 채택

- **트리거**: 기존 3-role(ROLE_OPS / ROLE_VIEWER / ROLE_ADMIN)이 멀티테넌트 + 결재 분리 요건을 표현하지 못함
- **결정**: 5개 역할로 확장
  | 역할 | 트랙 |
  |------|------|
  | `ROLE_SYS_ADMIN` | 시스템 |
  | `ROLE_SYS_OPS` | 시스템 |
  | `ROLE_TENANT_ADMIN` | 테넌트 관리자 |
  | `ROLE_TENANT_APPROVER` | 테넌트 관리자 (결재) |
  | `ROLE_TENANT_USER` | 테넌트 사용자 |
- **사유**: 결재(approver)와 단순 관리(admin) 분리, 시스템 운영(ops)과 시스템 관리(admin) 분리, 사용자 자체는 read-only 유지
- **Mock RoleGuard**: 프로토타입에서는 진입 차단 + 토스트로 검증, 정확한 reason code(`TENANT_USER_SYSTEM`, `SYSTEM_USER_TENANT`)는 일부 미구현 (OPEN-019)
- **영향**: 프로덕션 Spring Security `@PreAuthorize("hasRole('XXX')")` 매핑 + JWT claims 확장

### UXD-015: GNB 3-variant 시각 차별화

- **트리거**: 동일 GNB 컴포넌트로는 사용자가 현재 트랙(시스템/테넌트관리자/테넌트사용자)을 한눈에 식별 불가
- **결정**: 트랙별 GNB 색상 코드
  | 트랙 | 배경 | 의미 |
  |------|------|------|
  | 시스템 | `#0B1A3A` (다크 네이비) | 강한 권한·전체 책임 |
  | 테넌트 관리자 | 보라 그라디언트 (`#5E2BFF → #7B5CFF`) | 테넌트 단위 관리 |
  | 테넌트 사용자 | 흰색 + Shinhan #0046FF 액센트 | 일반 소비형 콘솔 |
- **사유**: 색상만으로 트랙 식별 가능하여 잘못된 트랙에서 작업하는 실수 예방. 색상 대비(WCAG AA) 충족
- **영향**: 프로덕션에서 `<TrackHeader variant="system | tenant-admin | tenant-user">` 컴포넌트화

### UXD-016: ContractSelector + localStorage 컨텍스트 보존

- **트리거**: 한 사용자가 여러 계약(SHC-2026-001/002 등)을 관리할 때, 화면 이동마다 계약을 다시 선택해야 하면 UX 저하
- **결정**:
  - 테넌트 사용자 트랙 GNB에 `<ContractSelector>` 드롭다운 배치
  - 선택값을 `ccr_currentContractId` localStorage에 저장
  - 페이지 재방문 / 새로고침 시 복원
  - 통화 혼합 시 `<MixedCurrencyBadge>` 표시 (KRW + USD)
- **사유**: 계약 컨텍스트는 거의 모든 화면(대시보드·리포트·업로드)에서 필요한 핵심 필터. 한 번 선택하면 세션 동안 유지되어야 자연스러움
- **영향**: 프로덕션에서 React Context API + 백엔드 `X-Contract-Id` 헤더 또는 URL path param

### UXD-017: SubAccount 기반 마스킹 시각화

- **트리거**: 핸드오프 v1.0 — 사용자가 자신이 볼 수 있는 SubAccount만 비용을 보지만, "전체 중 몇 %를 보고 있는지" 표현이 없으면 의사결정 왜곡
- **결정**:
  - `TENANT_USER_SCOPES`로 사용자별 가시 SubAccount 정의
  - KPI 카드에 `<MaskedSumIndicator visible={N} total={M}>` 표시
  - 가시 SubAccount의 비용만 합산하되, 전체 대비 비율을 뱃지로 노출 (예: "12 of 24 sub-accounts visible")
- **사유**: 사용자가 부분 데이터를 보고 있다는 사실을 명시 → 잘못된 트렌드 해석 방지
- **영향**: 프로덕션에서 백엔드 응답에 `visibleSubAccountCount`·`totalSubAccountCount`·`maskingRatio` 필드 추가

### UXD-018: 로그인 3분할 화면 + 빠른 테스트 계정

- **트리거**: 5-role × 3-tenant 조합 검증을 위해 로그인 시 역할/테넌트 컨텍스트 명시 필요
- **결정**:
  - `#/login` (시스템 로그인) + `#/t/{slug}/login` (테넌트 로그인) 2개 경로
  - 테넌트 로그인 화면은 좌측에 테넌트 브랜딩(슬러그 + 이름), 우측에 입력 폼
  - 프로토타입에서는 빠른 테스트 계정 카드 노출 (sys-admin / shinhan-card-admin / shinhan-life-user 등)
- **사유**: 5-role 검증을 클릭 한 번으로 수행. 테넌트별 로그인 URL을 별도로 둠으로써 SSO/IdP 연동 분리도 자연스러움
- **영향**: 프로덕션에서 테넌트 슬러그별 로그인 페이지 + IdP 라우팅 (OIDC issuer 분기)

### UXD-019: v2 신규 화면 표준 그리드 카드 패턴

- **트리거**: 테넌트 관리/계약 관리/CUR 컬럼 별칭/권한 위임 4개 v2 신규 화면이 단순 표 렌더링만으로 노출되어, v1에서 확립된 그리드 카드(엑셀/페이지네이션/리사이즈/CRUD) 표준에서 벗어남
- **결정**: 모든 관리형 그리드는 다음 5요소를 의무 포함
  1. `.section-card` 래퍼 + `.cur-toolbar`(좌: 그리드 정보 / 우: 등록·일괄작업 버튼)
  2. AG Grid 본체 (`initAGGrid` 헬퍼 사용)
  3. 그리드 하단 `renderGridToolbar(gridKey, fileName, totalCount, pageSize)` — Excel 내보내기 + 페이지 사이즈 셀렉터 + 1~N of M 인디케이터 + |< < > >| 네비게이션
  4. `makeGridResizable(gridKey)` — 우측 하단 리사이즈 핸들(3줄, 카드 모서리에 플러시), 높이는 localStorage `grid-height-{key}`로 영속화
  5. 우측 고정(pinned-right) "관리" 컬럼 — 수정/삭제(또는 권한 편집) 버튼
- **CRUD 모달 패턴**: `openXxxModal(mode, idOrCtx)` + `saveXxx(mode, id)` + `deleteXxx(id)` 3종 함수, FK 가드(테넌트 삭제 시 계약/사용자 존재하면 차단, 계약 삭제 시 클라우드 계정 존재하면 차단)
- **사유**: 화면별로 그리드 동작이 일관되지 않으면 사용자가 매번 학습 비용을 치름. v1·v2 그리드가 동일 클래스(`.grid-toolbar`)를 공유하여 스타일 일관성도 자동 확보
- **영향**: 프로덕션에서 React `<DataGridCard>` 공통 컴포넌트로 추출 (props: `gridKey`, `columns`, `rows`, `toolbarActions[]`, `onCreate`, `onEdit`, `onDelete`, `resizable`)

### UXD-020: 시스템↔테넌트 사용자 영역 격리 정책

- **트리거**: 사용자 관리 화면에서 시스템 관리자가 테넌트 사용자를 임의로 수정/삭제할 수 있고, 그 반대도 가능하면 권한 분리가 무력화됨
- **결정**: 4-layer 방어
  1. **Route guard** — `ROUTE_PERMISSIONS`에서 admin-users는 SYS_ADMIN만, tenant-admin-users는 TENANT_ADMIN만 허용
  2. **Page filter** — `renderUserManagement()`에서 `scopeKind`(GLOBAL/TENANT)에 따라 USERS 배열을 `tenantId === null` 또는 `tenantId === scopeTenant.id`로 필터링하여 노출
  3. **Modal options** — `openUserModal()`이 `ROLES.scope === scopeKind`인 역할만 select에 노출(시스템 컨텍스트=SYS_*, 테넌트 컨텍스트=TENANT_*), 모달 제목도 컨텍스트별로 분리(`시스템 사용자 등록` vs `{테넌트명} 사용자 등록`), edit 모드 진입 시 대상 사용자의 tenantId가 컨텍스트와 다르면 토스트로 차단
  4. **Save validation** — `saveUser()`에서 (a) 선택된 역할의 `roleMeta.scope`가 컨텍스트와 일치해야 하며, (b) 수정 모드의 경우 대상 사용자 자체의 `itemKind`도 컨텍스트와 일치해야 통과. 옵션 주입 등 클라이언트 우회 시도도 데이터 변경 차단
- **데이터 모델 활용**: `ROLES[*].scope` 필드(`'GLOBAL' | 'TENANT'`)를 단일 진실원으로 사용 — 하드코딩 if-chain 회피
- **사유**: 사용자 관리는 권한 상승 공격의 핵심 표적이므로 단일 가드만으로는 부족. UI/페이지/모달/저장 4단계 방어로 우회 경로 차단
- **영향**: 프로덕션 Spring Security에서 (1) `@PreAuthorize`로 메서드 가드, (2) Service 계층에서 대상 user.tenantId vs 호출자 tenantId 검증, (3) Repository 쿼리에서 tenant 스코프 강제 주입

### UXD-021: 운영 도구 / CUR 컬럼 관리 ROLE_SYS_OPS 전용 정책

- **트리거**: CUR 컬럼 사전, 업로드 모니터링, 컬럼 별칭 등 데이터 파이프라인 운영 도구가 시스템 관리자에게도 노출되어 있어, 관리(권한·테넌트)와 운영(데이터·파이프라인)의 책임 구분이 흐려짐
- **결정**:
  - **운영 도구 = ROLE_SYS_OPS 전용**: `admin-uploads`, `admin-aliases`, `admin-cur-cols` 모두 `ROUTE_PERMISSIONS`에서 SYS_OPS만 허용
  - **GNB**: `renderGnbSystem`에서 운영 도구 dropdown(업로드/Alias/CUR 컬럼 관리) 전체를 `${isOps ? `<group>...</group>` : ''}` 조건부 렌더
  - **콘솔 홈**: 시스템 콘솔 카드에서 "테넌트/사용자/계약/비밀번호 초기화"는 SYS_ADMIN, "업로드 오류"는 SYS_OPS로 분리. Quick links도 동일 분리
  - **감사 로그 = SYS_ADMIN 전용** (운영자가 자기 활동 은폐 못 하도록)
  - **레거시 ROLE_ADMIN 정정**: `renderCurColumns` / `renderAuditLogs` / `renderUserManagement`에 남아있던 v1 시절 `ROLE_ADMIN` 체크를 v2 5-role(SYS_OPS / SYS_ADMIN)로 일괄 정정
- **사유**: SoD(Segregation of Duties) 원칙. 시스템 관리자(테넌트·사용자·계약 등록·삭제 권한)가 동시에 데이터 파이프라인을 만지면 단일 계정이 비용 데이터 위·변조 + 감사 로그 삭제까지 가능. 권한 책임을 강제 분리
- **영향**: 프로덕션에서 `@PreAuthorize("hasRole('SYS_OPS')")` (CUR/업로드/Alias 컨트롤러), `@PreAuthorize("hasRole('SYS_ADMIN')")` (테넌트/사용자/감사 컨트롤러)로 명확히 분리

### UXD-022: 테넌트/계약 엔티티 표준 속성 모델

- **트리거**: 사용자 피드백 — 테넌트는 단순 slug/name이 아니라 실제 고객 엔티티(법인·개인·내부조직·그룹사 구분, 사업자번호, 상태 라이프사이클), 계약은 단순 코드가 아니라 과금·정산 조건(통화·주기·세금·결제·기준일·기한)을 포함해야 함
- **결정**:
  - **테넌트 엔티티(13속성)**: 고객ID(자동생성 `AD\d{6}[A-Z0-9]{2}`, 영숫자 I/O 제외), slug, 고객명, 고객구분(CORP/INDIV/INTERNAL/GROUP), 사업자등록번호, 법인등록번호, 대표자명, 업종, 업태, 고객상태(ACTIVE/DORMANT/SUSPENDED/TERMINATED), 가입일, 해지일, 관리자 이메일
  - **테넌트 등록 시 관리자 1명 필수**: 등록 트랜잭션에서 ROLE_TENANT_ADMIN USERS 행 자동 생성 + tenantId 자동 연결, username 유일성 검증
  - **계약 엔티티(12속성 신규/확장)**: 계약유형 5종(DIRECT/AGENT/MSP/RESELL/INTERNAL), 정산주기 4종(MONTHLY/QUARTERLY/SEMIANNUAL/YEARLY), 세금적용 3종(VAT_INCLUDED/VAT_EXCLUDED/TAX_FREE), 결제조건 3종(POSTPAID/PREPAID/MONTH_END), 청구서 발행 기준일(1~28), 납부기한(0~180일), 통화(KRW/USD)
  - **모달 2섹션 분리**: "계약 정보"(코드/명/기간/상태/유형) ↔ "과금·정산 조건"(통화/주기/세금/결제/기준일/기한) — 시각적·인지적 그룹화
  - **저장 검증**: 기준일 1~28(월말 28일 안전), 기한 0~180일, 종료일 ≥ 시작일
- **사유**: 더미 데이터 단계에서부터 백엔드 스키마 후보를 가시화 → 다음 라운드 data-model 회귀 시 컬럼명·enum 충돌 비용 최소화. 라벨 매핑(KOR)은 그리드 valueFormatter에서만 처리(데이터는 enum 그대로) — i18n 분리
- **영향**: 다음 설계 회귀 시 TENANT/CONTRACT 엔티티 컬럼·enum·CHECK 제약(invoiceIssueDay BETWEEN 1 AND 28, paymentDueDays BETWEEN 0 AND 180) 정식화 필요

### UXD-023: 모달 외부 클릭 차단 + Tab 포커스 트랩 표준

- **트리거**: 사용자 피드백 — "팝업이 떠 있을 때는 팝업창 외부 클릭으로 팝업창이 닫히지 않도록, 포커스는 팝업창 안에서만 움직여야 한다"
- **결정**:
  - **외부 클릭 차단**: `<div class="modal-overlay">`에서 `onclick` 속성을 완전 제거(이전: `onclick="if(event.target===this)closeModal()"`). 오버레이는 시각적 배경 + 스크롤 락 역할만
  - **Tab 포커스 트랩**: `activateModalTrap(modal)` 헬퍼 — `keydown`(capture phase)에 등록하여 (1) 포커스가 모달 밖이면 첫 요소로 강제 이동, (2) 마지막 요소에서 Tab → 첫 요소, (3) 첫 요소에서 Shift+Tab → 마지막 요소. focusable selector: `input/select/textarea/button/a[href]/[tabindex]`(disabled, hidden 제외)
  - **ESC 닫기는 유지**: 접근성(WAI-ARIA) — ESC는 "사용자 의도 명시"로 간주. 외부 클릭은 "오작동 가능성"이 높아 차단
  - **공통 의무**: 모든 `open*Modal()` 함수는 `overlay.classList.add('active')` 직후 `try { activateModalTrap(modal); } catch (e) {}` 호출 — try/catch로 헬퍼 미정의 환경 안전
  - **closeModal에서 정리**: `deactivateModalTrap()`로 keydown 핸들러 해제 — 메모리 누수 방지
  - **현재 적용 모달(9종)**: Tenant / Contract / Alias / Scope / ReportPreview / Subscriber / CurColumn / User / PasswordChange
- **사유**: (1) 긴 폼 입력 중 실수 클릭으로 입력 데이터가 사라지는 사고 방지(특히 테넌트 19필드/계약 12필드 같은 대형 폼), (2) 키보드 사용자가 모달 밖 GNB·그리드로 포커스가 새는 것 차단(WAI-ARIA 모달 다이얼로그 권고)
- **영향**: 향후 추가되는 모든 모달은 이 패턴 강제. 프로덕션 React에서는 `<Dialog>` 컴포넌트(Headless UI / Radix / shadcn) 채용 시 동일 동작이 기본 제공 — 자체 구현 시 본 결정의 5조건 체크리스트로 검수

---

## UX Writing 적용 내역

| 원칙 | 적용 사례 |
|------|---------|
| 버튼 4글자 이내 | "다운로드", "등록", "수정", "삭제", "초기화", "취소", "저장" |
| 능동형 안내 | "엑셀 파일을 드래그하거나 클릭하여 선택" (× "파일이 필요합니다") |
| 날짜 형식 | YYYY.MM.DD (예: 2026.03.10) |
| 금액 형식 | 세 자리 쉼표 + 원 (예: 152,000,000원) |
| 오류 메시지 | "cost_amount 값 'N/A'는 숫자가 아닙니다" (× "형식 오류 발생") |

---

## Shinhan Design System 적용 확인

| 항목 | 적용 |
|------|------|
| 브랜드 컬러 (#0046FF, #002D85) | ✅ CSS 변수 전체 적용 |
| Pretendard 폰트 | ✅ CDN @import |
| GNB 2행 구조 (56px + 48px) | ✅ sticky 고정 |
| ECharts shinhanPalette | ✅ 7색 팔레트 적용 |
| AG Grid alpine 테마 오버라이드 | ✅ --ag-* CSS 변수 |
| 상태 뱃지 색상 체계 | ✅ success/warning/error/info/pending |
| 반응형 브레이크포인트 | ✅ 1100px, 700px |
