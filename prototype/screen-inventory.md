# Screen Inventory — 프로토타입 화면 목록 (v2.0)

> **작성**: 04-prototyper
> **최종 수정**: 2026-04-16 (v2 보강 완료)
> **프로토타입 경로**: `dev/`
> **실행 방법**: `npx serve ./dev -p 3030` → http://localhost:3030
> **기본 진입**: 미인증 시 `#/admin/login`로 자동 리다이렉트

---

## 0. 라우팅 트랙 (3-track)

설계 v3.0의 멀티테넌트·5권한 모델에 맞춰 화면을 3개 트랙으로 분리.

| 트랙 | URL 베이스 | GNB variant | 대상 역할 |
|------|-----------|-------------|----------|
| 시스템 | `#/admin/*` | `system` (어두운 톤) | SYS_ADMIN, SYS_OPS |
| 테넌트 관리 | `#/t/{slug}/admin/*` | `tenant-admin` (보라 그라데이션) | TENANT_ADMIN |
| 테넌트 사용자 | `#/t/{slug}/c/{contractId}/*` | `tenant-user` (화이트) | TENANT_USER, TENANT_APPROVER |

`{slug}`: `shinhan-card`, `shinhan-life`, `shinhan-internal` 중 하나
`{contractId}`: 1~6 (CONTRACTS.id)

---

## 구현 화면 요약 (v2.0 — 17개 + GNB 3변형)

### 시스템 트랙 (`#/admin/*`)
| # | 화면 | 해시 라우트 | 권한 | 상태 |
|---|------|-----------|------|------|
| S01 | 시스템 로그인 | `#/admin/login` | (비인증) | ✅ NEW |
| S02 | 시스템 콘솔 홈 | `#/admin` | SYS_ADMIN, SYS_OPS | ✅ NEW |
| S03 | 시스템 대시보드 | `#/admin/dashboard` | SYS_ADMIN, SYS_OPS | ✅ |
| S04 | 시스템 사용자 관리 | `#/admin/users` | SYS_ADMIN | ✅ |
| S05 | 테넌트 관리 | `#/admin/tenants` | SYS_ADMIN | ✅ NEW |
| S06 | CUR 업로드 | `#/admin/ops/uploads` | SYS_OPS | ✅ |
| S07 | 컬럼 별칭(매핑) 관리 | `#/admin/ops/aliases` | SYS_OPS | ✅ |
| S08 | CUR 컬럼 사전 | `#/admin/ops/cur-columns` | SYS_OPS | ✅ |
| S09 | 시스템 감사 로그 | `#/admin/audit-logs` | SYS_ADMIN | ✅ (v1 보강 유지) |

### 테넌트 관리 트랙 (`#/t/{slug}/admin/*`)
| # | 화면 | 해시 라우트 | 권한 | 상태 |
|---|------|-----------|------|------|
| TA01 | 테넌트 로그인 | `#/t/{slug}/login` | (비인증) | ✅ NEW |
| TA02 | 테넌트 콘솔 홈 | `#/t/{slug}/admin` | TENANT_ADMIN | ✅ NEW |
| TA03 | 계약 관리 | `#/t/{slug}/admin/contracts` | TENANT_ADMIN | ✅ NEW |
| TA04 | 테넌트 사용자 관리 | `#/t/{slug}/admin/users` | TENANT_ADMIN | ✅ |
| TA05 | 권한 위임(Scope) | `#/t/{slug}/admin/scopes` | TENANT_ADMIN | ✅ NEW |
| TA06 | 승인함 placeholder | `#/t/{slug}/approvals` | TENANT_APPROVER | ✅ NEW |

### 테넌트 사용자 트랙 (`#/t/{slug}/c/{contractId}/*`)
| # | 화면 | 해시 라우트 | 권한 | 상태 |
|---|------|-----------|------|------|
| TU01 | 대시보드 | `#/t/{slug}/c/{contractId}/dashboard` | TENANT_USER, TENANT_ADMIN | ✅ |
| TU02 | 리포트 라이브러리 | `#/t/{slug}/c/{contractId}/reports` | TENANT_USER, TENANT_ADMIN | ✅ |
| TU03 | 리포트 상세 모달 | (모달) | TENANT_USER, TENANT_ADMIN | ✅ |
| TU04 | 구독 관리 | `#/t/{slug}/c/{contractId}/subscribers` | TENANT_ADMIN, TENANT_USER | ✅ (조건 3 반영) |

### 공통 컴포넌트
| 컴포넌트 | 위치 | 비고 |
|---------|------|------|
| GNB (3변형) | 상단 | `gnb-system` / `gnb-tenant-admin` / `gnb-tenant-user` |
| 역할 전환 드롭다운 | GNB 우측 | 5권한별 대표 사용자 빠른 전환 |
| ContractSelector | tenant-user GNB | localStorage(`ccr_currentContractId`) 영속 |
| MixedCurrencyBadge | ContractSelector 우측 | 테넌트 내 KRW+USD 공존 시 노출 |
| MaskedSumIndicator | tenant-user GNB | "가시 N / 전체 M (k개 마스킹)" |
| 그리드 카드 리사이즈 핸들 | 모든 그리드 카드 우하단 | localStorage(`grid-height-{key}`) 영속 |

---

## 1. GNB 3변형 (Variant)

### 1.1 GNB system (시스템 트랙)
- **배경**: `#0B1A3A` (딥 네이비)
- **텍스트**: 흰색
- **로고 옆 배지**: "시스템" (반투명 흰색)
- **메뉴**: 홈 / 대시보드 / 테넌트 관리 / 사용자 관리 / 운영 도구(드롭다운: CUR 업로드, 컬럼 별칭, CUR 컬럼) / 감사 로그

### 1.2 GNB tenant-admin (테넌트 관리 트랙)
- **배경**: `linear-gradient(180deg, #FFFFFF 0%, #F4F0FF 100%)` (보라 그라데이션)
- **로고 옆 배지**: `{테넌트명} · 관리` (보라 `#722ED1`)
- **메뉴**: 관리 홈 / 계약 관리 / 사용자 관리 / 권한 위임(Scope) / 승인함

### 1.3 GNB tenant-user (테넌트 사용자 트랙)
- **배경**: `#FFFFFF`
- **로고 옆 배지**: `{테넌트명}` (브랜드 블루)
- **ContractSelector**: 활성 계약 드롭다운 (예: `SHC-2026-001 · AWS 운영 환경 직계약 (KRW)`)
- **MixedCurrencyBadge**: 테넌트가 다중 통화 계약을 보유한 경우 "혼합 통화" 라벨
- **MaskedSumIndicator**: TenantUserScope 기반 가시 SubAccount 비율 표시
- **메뉴**: 대시보드 / 리포트 / 구독 관리

---

## 2. 시스템 트랙 화면 상세

### S01. 시스템 로그인 (`#/admin/login`)
- 풀스크린 로그인 카드 (상단 4px 딥 네이비 보더)
- "시스템 콘솔 로그인" 컨텍스트 배지
- 테스트 계정 빠른 진입: `sys-admin`, `sys-ops1`
- 하단에 "테넌트 사용자라면" 신한카드/신한라이프/신한DS 내부 링크
- 비밀번호 검증 없음 (프로토타입). 시스템 사용자가 아니면 "시스템 콘솔은 시스템 사용자만 로그인할 수 있습니다" 거부

### S02. 시스템 콘솔 홈 (`#/admin`)
- KPI 카드 5종: 테넌트(3), 사용자(28), 계약(4/6), 업로드 오류(2), 비밀번호 초기화 요청(1)
- 빠른 진입 버튼: 대시보드 / 업로드 처리 / 컬럼 별칭 / CUR 컬럼 / 감사 로그

### S03. 시스템 대시보드 (`#/admin/dashboard`)
- 전 테넌트 KPI 요약 + 월별 비용 추이(테넌트 컬러 분리) + 서비스 TOP 5
- 조건 4 반영: SYS_OPS도 접근 가능

### S04. 시스템 사용자 관리 (`#/admin/users`)
- 시스템 사용자(SYS_ADMIN/SYS_OPS) 4명 그리드, 등록/수정/비활성/비밀번호 초기화

### S05. 테넌트 관리 (`#/admin/tenants`)
- 테넌트 3건(신한카드/신한라이프/신한DS 내부) 그리드 — id, slug, customer_type, status, admin_email, 계약 수, 사용자 수

### S06. CUR 업로드 (`#/admin/ops/uploads`)
- v1 업로드 화면 이식 (Dropzone + Progress + 컬럼 매핑 + 검증 결과 + 업로드 이력 그리드)

### S07. 컬럼 별칭 관리 (`#/admin/ops/aliases`)
- v1 컬럼 별칭 그리드 이식

### S08. CUR 컬럼 사전 (`#/admin/ops/cur-columns`)
- v1 CUR 컬럼 사전 그리드 이식

### S09. 시스템 감사 로그 (`#/admin/audit-logs`) — v1 보강 유지
- AUDIT_ACTIONS: LOGIN, LOGIN_FAIL, LOGOUT, VIEW, EXPORT, EXPORT_PDF, CREATE, UPDATE, DELETE, RESTORE, PASSWORD_*
- 모든 화면 조회와 다운로드는 조회 조건과 함께 자동 기록

---

## 3. 테넌트 관리 트랙 화면 상세

### TA01. 테넌트 로그인 (`#/t/{slug}/login`)
- 상단 4px 브랜드 블루 보더, 테넌트명 컨텍스트 배지
- 테넌트별 테스트 계정 빠른 진입 버튼
- 다른 테넌트의 사용자 로그인 시도 시 "선택한 테넌트의 사용자만 로그인할 수 있습니다" 거부

### TA02. 테넌트 콘솔 홈 (`#/t/{slug}/admin`)
- 헤더: `{테넌트명} 관리 홈` + 메타("테넌트 ID: {id} · 유형: {customer_type}")
- KPI 카드 5종: 사용자, 계약 활성/전체, SubAccount, 권한 위임, 비밀번호 초기화 요청
- "계약별 사용자 진입" 빠른 링크 (계약별 대시보드 미리보기)

### TA03. 계약 관리 (`#/t/{slug}/admin/contracts`)
- 계약 그리드 (테넌트 소속 계약만): code, name, type(DIRECT/MSP/INTERNAL), currency, billing, status, effective_from~to

### TA04. 테넌트 사용자 관리 (`#/t/{slug}/admin/users`)
- 해당 테넌트 8명만 표시 (RLS 시뮬레이션)
- 역할: TENANT_ADMIN / TENANT_APPROVER / TENANT_USER

### TA05. 권한 위임 — Scope (`#/t/{slug}/admin/scopes`)
- TenantUserScope 그리드: user × subAccount 매핑 (테넌트별 ~40건)
- USER 사용자에게 어느 SubAccount를 노출할지 결정

### TA06. 승인함 placeholder (`#/t/{slug}/approvals`)
- 빈 상태 화면 ("📥 승인 대기 항목 없음")
- 안내: "결재(워크플로) 모듈 연동은 다음 단계에서 진행됩니다."

---

## 4. 테넌트 사용자 트랙 화면 상세

### TU01. 대시보드 (`#/t/{slug}/c/{contractId}/dashboard`)
- KPI 카드 4종 (이번 달 총 비용, 전월 대비 변동, 생성된 리포트, 활성 구독자)
- 차트: 월별 비용 추이(line) + 서비스별 비용 TOP 5(horizontal bar)
- 마스킹 시나리오 적용 시:
  - 헤더에 "SubAccount 일부 마스킹 적용" 경고 라벨
  - KPI 금액은 가시 SubAccount 비율로 비례 축소 (예: visibleRatio=0.667)
  - GNB 마스킹 인디케이터 동시 표시

### TU02. 리포트 라이브러리 (`#/t/{slug}/c/{contractId}/reports`)
- 6개 템플릿 카드 (R01~R06)
- 필터바: 유형 / 기간 / 검색

### TU03. 리포트 상세 모달
- 헤더 + 메타 + 차트 미리보기 + 다운로드(XLSX/PDF) + 생성 이력
- 다운로드는 ExcelJS / jsPDF + html2canvas 사용 (v1 보강 유지, 한글 보존)
- 다운로드 시 감사 로그(EXPORT/EXPORT_PDF)에 조회 조건 포함

### TU04. 구독 관리 (`#/t/{slug}/c/{contractId}/subscribers`)
- 스케줄 상태 카드 + 구독자 그리드 + 발송 이력 그리드
- 등록/수정/삭제 모달

---

## 5. 인증·권한 모델 (Mock)

### 5.1 5권한
| Role | scope | 진입 트랙 |
|------|-------|---------|
| ROLE_SYS_ADMIN | GLOBAL | system |
| ROLE_SYS_OPS | GLOBAL | system (대시보드 ✅, 사용자/테넌트 ❌) |
| ROLE_TENANT_ADMIN | TENANT | tenant-admin |
| ROLE_TENANT_APPROVER | TENANT | tenant-admin (승인함만 본문 노출) |
| ROLE_TENANT_USER | TENANT | tenant-user |

### 5.2 RoleGuard
- 진입 시 URL 분석 → variant 결정 → 사용자 role/tenantId/scope와 매칭
- 실패 시 "접근 권한이 없습니다" 화면 (사유 코드 노출)

### 5.3 localStorage 키
| 키 | 용도 |
|----|------|
| `ccr_authenticated` | "true" 시 로그인 유지 |
| `ccr_currentUserId` | 현재 사용자 id |
| `ccr_currentTenantSlug` | 마지막 테넌트 슬러그 (재진입용) |
| `ccr_currentContractId` | 마지막 선택 계약 id |
| `grid-height-{gridKey}` | 그리드 카드 세로 높이 |
| `grid-col-{gridKey}` | 그리드 컬럼 상태 |
| `grid-page-size-{gridKey}` | 페이지 크기 |

---

## 6. 더미 데이터 요약 (v2.0)

| 데이터 | 건수 | 출처 |
|-------|------|------|
| TENANTS | 3 | dummy-data §0.1 (정본 통일) |
| CONTRACTS | 6 | §0.2 (SHC/SHL/SDS 접두사) |
| CLOUD_ACCOUNTS (Payer) | 8 | §0.3 |
| CLOUD_SUB_ACCOUNTS (Linked) | 24 | §0.4 |
| TENANT_USER_SCOPES | 117 | §0.5 — 마스킹 시나리오 검증용 |
| USERS | 28 (시스템 4 + 테넌트 24) | §3 |
| ROLES | 5 | §3 |
| SUBSCRIBERS | 50 | §5 (⚠️ contractCode 미매핑 — OPEN-018) |
| AUDIT_LOGS | 30+ (런타임 누적) | §0.8 + 사용자 활동 |
| 리포트 템플릿 | R01~R06 (6개) | §2 |
| 업로드 배치 | 24개월 | §4 |
| 월별 비용 | 24개월 | §10 |

### FK 무결성 (시드 직후 검증)
- USER → TENANT: 0 orphan ✅
- CONTRACT → TENANT: 0 orphan ✅
- CLOUD_ACCOUNT → CONTRACT: 0 orphan ✅
- CLOUD_SUB_ACCOUNT → CLOUD_ACCOUNT: 0 orphan ✅
- TENANT_USER_SCOPE → USER: 0 orphan ✅
- SUBSCRIBER → CONTRACT: ⚠️ 50 orphan (다음 라운드 보강)

---

## 7. 기술 스택

| 항목 | 사용 |
|------|------|
| 구조 | Vanilla JS + 해시 라우팅 (3트랙 SPA) |
| 차트 | Apache ECharts v5 (CDN) — shinhanPalette |
| 그리드 | AG Grid Community v31 (CDN) — alpine + Shinhan 오버라이드 |
| Excel | ExcelJS v4.4 + FileSaver v2.0 |
| PDF | jsPDF v2.5 + html2canvas v1.4 (한글 이미지 변환) |
| 디자인 | Shinhan Web Design System (CSS 변수 토큰) |
| 폰트 | Pretendard (CDN @import) |

---

## 8. v2.0 사용자 컨펌 시 확인 시나리오 (9건)

1. [ ] 시스템 로그인 → SYS_ADMIN(`sys-admin`) 선택 → `#/admin/dashboard` 접근 확인
2. [ ] 시스템 로그인 → SYS_OPS(`sys-ops1`) 선택 → `#/admin/dashboard` 접근 확인 (조건 4)
3. [ ] SYS_OPS → `#/admin/ops/uploads` CUR 업로드 화면 확인
4. [ ] 테넌트 로그인 → 신한카드 TENANT_ADMIN(`sh-admin`) → `#/t/shinhan-card/admin/contracts` 접근
5. [ ] TENANT_USER(`sh-user1`) → 계약 선택 → `#/t/shinhan-card/c/1/dashboard` 확인
6. [ ] ContractSelector에서 계약 변경 시 URL 반영 + 새로고침 후 localStorage 복원
7. [ ] 구독 관리 URL이 `/subscribers`인지 확인 (조건 3)
8. [ ] 마스킹 시나리오: TENANT_USER가 일부 SubAccount만 권한 → "가시 N / 전체 M" + KPI 비례 축소
9. [ ] TENANT_APPROVER(`sh-approver`) 로그인 시 승인함 placeholder

### 승인 조건 이행 상태
- [x] 조건 1 (필수): dummy-data §0.1 정본으로 통일 완료 (`AD000001K3` 등)
- [x] 조건 2 (필수): ContractCode 접두사 `SHC/SHL/SDS` 통일 완료
- [x] 조건 3 (권장): 화면 베이스 경로 `/subscribers` 통일 완료
- [x] 조건 4 (권장): SYS_OPS 시스템 대시보드 ✅ 확정 완료
- [ ] 조건 5 (선택): Minor 3건은 구현 단계에서 해소 예정
