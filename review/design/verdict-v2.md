# 설계 리뷰 판정 — 클라우드 비용 리포팅 자동화 (v2.0)

> **리뷰어**: 03-design-reviewer
> **리뷰일**: 2026-04-16 (회차 9 — REG-002 멀티테넌트 회귀 사이클 종결 리뷰)
> **리뷰 대상**: design/* v3.0, qa/design/design-qa-report.md v4.0, docs/context-ledger.md, docs/brd.md v1.1
> **판정**: 🟡 **조건부 승인** (Conditionally Approved)
> **행선지**: → 04-prototyper.md (프로토타입 v2 보강, DQA-v2-010 P-01~P-10 체크리스트 기반)

---

## 0. 요약

| 항목 | 값 |
|------|-----|
| QA 판정 | ✅ PASS (Critical 0 / High 2 / Major 2 / Minor 3) |
| 리뷰어 재평가 | ✅ QA 판정 적정 — Critical 0 / High 2 / Major 2 / Minor 3 모두 심각도 동의 |
| 리뷰어 추가 이슈 | REV-v2-001 (Minor) 1건 — 영향 미미 |
| 설계 모델 결함 | **없음** (스키마·라우팅·권한·RLS 체계 자체는 건전) |
| 프로토타입 차단 이슈 | **0건** — 단, 승인 조건 2건 이행 전까지 시드 생성 보류 |
| 커버리지 | MVP 6/6 + v2 신규(F07~F11, 승인 placeholder) 5/5 = 100% |
| 이전 회차 해소율 | DQA-v2-001~015 전건 15/15 해소 (100%) |

**핵심 판단**: v3.0 설계는 멀티테넌트·5권한·계약 컨텍스트·RLS의 **구조적 뼈대는 완성**되었으며, 프로토타입 v2 보강(P-01~P-10)을 즉시 착수할 수 있습니다. 잔존 7건은 모두 **더미데이터 내부 예시 값 불일치** 또는 **문서 간 표기 편차**에 해당하며 설계 모델 자체를 재작업할 사유가 아닙니다. 다만 High 2건(DQA-v3-001/002)은 프로토타입 시드 생성 시점에 반드시 수정되어야 FK 오류를 막을 수 있어, 이를 **승인 조건**으로 포함하여 조건부 승인합니다.

---

## 1. QA 보고서 검토 결과

### 1.1 QA 판정 vs 리뷰어 재평가

| 구분 | QA 판정 | 리뷰어 재평가 | 비고 |
|------|---------|-------------|------|
| Critical | 0건 | 0건 — 동의 | DQA-v2-001(RLS 미구현) 해소 확인 |
| High | 2건 | 2건 — 동의 | DQA-v3-001/002 둘 다 실재 — §1.2 상세 |
| Major | 2건 | 2건 — 동의 | DQA-v3-003/004 문서 간 편차 실재 |
| Minor | 3건 | 3건 — 동의 | DQA-v3-005/006/007 모두 실재 |
| 커버리지 | 100% | 100% — 확인 | §3 재검증 |
| QA 판정 | ✅ PASS | ✅ 적정 | 사용자 임계치(Critical 0 + High ≤ 2) 충족 |

### 1.2 v3.0 신규 이슈 7건 리뷰어 재평가 상세

| ID | QA 심각도 | 리뷰어 검증 결과 | 재평가 | 프로토타입 차단 | 비고 |
|----|----------|---------------|--------|--------------|------|
| DQA-v3-001 | 🟠 High | **자기모순 실재 확인** — dummy-data §0.1이 테넌트 PK/slug로 `AD000001K3/shinhan-card · AD000002L9/shinhan-life · AD000003M2/shinhan-internal`을 선언하나, §3 User·§5 Subscriber·§7 DownloadLog는 동일 테넌트를 `AD00000AK7/shinhan-card · AD00001BL4/shinhan-life · AD00002CM1/ds-internal`로 참조 → `shinhan-internal ↔ ds-internal` 슬러그 충돌까지 동반. Tenant PK가 CHAR(10) 자동생성이므로 실제 DB 적재 시 FK(NOT NULL)가 깨짐 | 🟠 High — 적정 | ⚠️ **시드 생성 시 차단** | 설계 모델 자체는 건전 — 예시 값만 통일하면 해소 |
| DQA-v3-002 | 🟠 High | **접두사 충돌 실재 확인** — §0.2 Contract 테이블이 `SHC-2026 / SHL-2026 / SDS-2026`으로 코드 규칙을 선언하나 §5 Subscriber 샘플은 `SHC / SLF / DSC` 사용. §7.3 식별자 생성 규칙(slug 약어 대문자)에 따르면 §0.2가 정본 | 🟠 High — 적정 | ⚠️ **시드 생성 시 차단** | 한 쪽으로 통일 후 §5/§7/§11 샘플 일괄 교체 |
| DQA-v3-003 | 🟡 Major | **경로 표기 혼재 확인** — feature-decomposition §5.3(`/subscriptions`)·screen-flow §3.5·§4(`/subscribers` 표기와 `/subscriptions` 라벨 혼재)·api-spec §9-C(리소스는 `/subscribers`, 서브리소스는 `/subscriptions/*`). api-spec 쪽이 REST 관례상 정합 — `/subscribers`=엔티티 CRUD, `/subscriptions/*`=발송 이벤트 | 🟡 Major — 적정 | ❌ 비차단 | 화면 베이스 경로 `/subscribers`로 통일 권장 |
| DQA-v3-004 | 🟡 Major | **권한 매트릭스 엇갈림 확인** — component-spec §1.1 GNB 매트릭스: 시스템 대시보드 SYS_OPS ✅ / feature-decomposition §3.1 권한 매트릭스: SYS_OPS ❌. feature-decomposition §2 "ROLE_SYS_ADMIN / SYS_OPS: 시스템 대시보드에서 전 테넌트 KPI 요약" 문장은 ✅로 암시 → 정본은 "SYS_OPS ✅, 단 감사로그 의무 기록" 쪽이 자연스러움 | 🟡 Major — 적정 | ❌ 비차단 | 설계자 의도 확정 필요. 리뷰어 권고: "SYS_OPS = 업로드 KPI 조회 목적으로 시스템 대시보드 ✅" |
| DQA-v3-005 | 🟢 Minor | **예시 오기 확인** — data-model §7.1 예시 `ADKK00000AK7` (12자)이 §2.3 선언 "CHAR(10)" 및 §7.1 자리별 합산(1+1+6+2=10)과 충돌 | 🟢 Minor — 적정 | ❌ 비차단 | 예시를 `AD000001K3` 등 10자로 교체 |
| DQA-v3-006 | 🟢 Minor | **합계 오기 확인** — api-spec §10.2 제목 "18개"이나 세부합계 7+4+2+5+4=22개 (컬럼 별칭 4 포함 시 22, 제외 시 18). 세부표 표기 자체 불명확 | 🟢 Minor — 적정 | ❌ 비차단 | `(5+4)` 혼합 표기를 풀어서 재집계 |
| DQA-v3-007 | 🟢 Minor | **가독성 저하 확인** — handoff-to-qa.md DQA-v2-011 행이 두 조치(§2.7 중복 해소 + dummy §10→§11 재정렬)를 한 문장에 압축 | 🟢 Minor — 적정 | ❌ 비차단 | 두 조치 분리 서술 |

### 1.3 이전 회차(v3.0 FAIL) 15건 해소 확인

리뷰어가 직접 재검증한 결과, DQA-v2-001~015 전건이 v3.0에 올바르게 반영되었음을 확인합니다:

| DQA ID | 심각도 | 재검증 결과 | 확인 위치 |
|--------|--------|-----------|----------|
| DQA-v2-001 | 🔴 Critical | ✅ 해소 — data-model §2.4/§2.5/§2.8/§2.9/§2.10/§2.11/§2.12 본문에 `tenant_id CHAR(10)` 컬럼 실재, §6.3 RLS가 실컬럼 참조 | data-model.md §2.x + §6.3 |
| DQA-v2-002 | 🟠 High | ✅ 해소 — screen-flow §3.1~§3.6 전면 재작성, §4 5트랙 subgraph | screen-flow.md §3/§4 |
| DQA-v2-003 | 🟠 High | ✅ 해소 — api-spec §3에 v1 라우트 정의 0건, v1→v2 마이그레이션 맵만 잔존. Grep(`/uploads\b`, `/reports\b`) 확인 v1 단독 경로 제거됨 | api-spec.md §3/§9-A/B/C |
| DQA-v2-004 | 🟠 High | ✅ 해소 — data-model §2.7 TEMPLATE_ROLE_ACCESS 삭제, §4 관계도에서 M:N 제거, RoleTemplateMatrix 상수로 이관 | data-model.md §2.7/§4, feature-decomposition.md §3 |
| DQA-v2-005 | 🟠 High | ✅ 해소 — REPORT_FILE §2.8에서 `batch_id` 제거, `tenant_id`+`contract_id` 추가, UK `(tenant_id, contract_id, template_id, target_year_month)` | data-model.md §2.8 |
| DQA-v2-006 | 🟠 High | ✅ 해소 — component-spec §1.1 GNB `variant` 3변형 TypeScript Props + 5권한 메뉴 매트릭스 | component-spec.md §1.1 |
| DQA-v2-007 | 🟡 Major | ✅ 해소 — dummy-data §3 Role 5건·User 28명(시스템 4+테넌트 24) | dummy-data-spec.md §3 |
| DQA-v2-008 | 🟡 Major | ✅ 해소 — data-model §6.3-A에 `cloud_account/cloud_sub_account/cur_source` JOIN 기반 RLS SQL 3종 명문화. PostgreSQL 15+ 문법 | data-model.md §6.3-A |
| DQA-v2-009 | 🟡 Major | ✅ 해소 — ERD에서 UPLOAD_BATCH→REPORT_FILE 제거, CONTRACT→REPORT_FILE 유지 | data-model.md ERD, §4 |
| DQA-v2-010 | 🟡 Major | ✅ 해소 — Context Ledger §3에 프로토타입 v2 보강 체크리스트 P-01~P-10 예약 | docs/context-ledger.md §3 |
| DQA-v2-011~015 | 🟢 Minor | ✅ 해소 — 섹션 번호 중복 자연 해소, F00 v2 경로·5권한 교체, Subscriber tenant+contract 태깅, §10 카테고리별 집계표, handoff 회차 번호 정정 | 각 문서 |

**해소율 15/15 (100%)** — 이전 회차 Critical 1 / High 5 / Major 4 / Minor 5의 전량 해소가 실문서에서 확인됨. add-on 회귀 패턴이 완전히 정리되었습니다.

---

## 2. 리뷰어 독립 평가

| # | 평가 항목 | 결과 | 비고 |
|---|----------|------|------|
| R-1 | 프로토타입 실현 가능성 | ✅ 충분 | 6종 설계 문서가 컴포넌트 Props·API 경로·데이터 모델·화면 흐름을 해석 여지 없이 정의. GNB `variant` TypeScript 시그니처, `/t/{slug}/c/{contractId}/*` URL 트리, RLS 세션 변수 주입 규약이 모두 명시적 — 프로토타이퍼가 §3 dummy-data만 시드로 치환하면 즉시 구현 가능 |
| R-2 | 사용자 시나리오 완결성 | ✅ 전수 지원 | US-001~005 (원본) + 멀티테넌트 신규 시나리오(UT-1~5) 모두 커버 — §2.1 상세 참조 |
| R-3 | 확장 위험도 | ✅ 낮음 | RoleTemplateMatrix 상수화, CurSource 추상화, Payer/SubAccount 독립 엔티티, RLS JOIN 정책 — 모두 단일 포인트 변경 설계 |
| R-4 | 더미 데이터 충분성 | ⚠️ 조건부 충분 | 28사용자·60구독자·250다운로드·300감사·8,000+COST_DATA·24개월 시계열로 양적 충분. 단 §0.1↔§3·§0.2↔§5 자기모순 2건은 반드시 해소 필요 (DQA-v3-001/002) |
| R-5 | 미결 사항 가정 합리성 | ✅ 합리적 | OPEN-009~017 모두 사용자 컨펌으로 확정 상태. OPEN-001~008은 추상화 레이어 유지로 구조적 재작업 최소화 |
| R-6 | 멀티테넌트 격리 건전성 | ✅ 양호 | JWT claims → `SET LOCAL app.*` → RLS 정책의 3단계 격리가 모든 적용 대상 테이블에서 일관. SYS_OPS bypass + AUDIT_LOG 강제 기록으로 감사성 확보 |
| R-7 | REST 규약·OpenAPI 적합성 | ✅ 적합 | 3트랙(`/admin/*`, `/t/{slug}/admin/*`, `/t/{slug}/c/{contractId}/*`)이 역할·테넌트·계약 컨텍스트를 URL로 드러내 Swagger 자동 생성 시 권한 선언이 명확 |

### 2.1 R-2 상세: 사용자 스토리 커버리지

| US/UT | 스토리 | v3.0 설계 커버리지 | 판정 |
|-------|--------|------------------|------|
| US-001 | OPS: 엑셀 업로드 → 자동 오류 알림 | F11(Payer 단위 CUR 업로드) + UPLOAD_BATCH/SHEET + api-spec §9-A `/admin/ops/uploads/*` | ✅ |
| US-002 | OPS: 카드 선택 → 즉시 다운로드 | F02 ReportCardGrid → F04 ReportDetailModal → DOWNLOAD_LOG (tenant_id 보존) | ✅ |
| US-003 | 경영진: 매월 10일 자동 이메일 수신 | F05 ScheduleStatusCard + SUBSCRIBER (tenant+contract UK) + api-spec §9-C `/subscriptions/*` | ✅ |
| US-004 | 실무자: 권한 범위만 열람 | TENANT_USER_SCOPE (user, sub_account_id) + RLS + 부분 권한 마스킹 (§6.5) + MaskedSumIndicator 컴포넌트 | ✅ |
| US-005 | 관리자: 구독자 CRUD | F05 SubscriberTable (TENANT_ADMIN 권한) + api-spec §9-C CRUD | ✅ |
| UT-1 | 멀티테넌트: 테넌트 간 완전 격리 | RLS 정책 + JWT tenantId claim + URL slug 일치 검증 (api-spec §2.3) | ✅ |
| UT-2 | 멀티테넌트: 계약 단위 컨텍스트 | ContractSelector (GNB) + `/c/{contractId}` URL + localStorage 영속 | ✅ |
| UT-3 | 멀티테넌트: 서브계정 단위 마스킹 | TENANT_USER_SCOPE + RLS + MaskedSumIndicator (가시 합계/전체 합계 표기) | ✅ |
| UT-4 | 시스템: Payer 단위 CUR 업로드 | CloudAccount(Payer) + UPLOAD_BATCH.cloud_account_id + F11 | ✅ |
| UT-5 | 시스템: 전역 감사 | AUDIT_LOG + SYS_OPS bypass + RLS 의무 기록 | ✅ |

### 2.2 R-3 상세: 확장 위험 분석

| 관점 | 평가 | 근거 |
|------|------|------|
| 테넌트 추가 | 매우 낮음 | TENANT CRUD + tenant_id 컬럼 + RLS 정책이 모든 대상 테이블에 일관 적용 — 신규 테넌트는 DB 레코드 추가 + slug 등록만 필요 |
| 클라우드 프로바이더 확장 (Azure/GCP) | 낮음 | CLOUD_ACCOUNT.provider VARCHAR(10)로 확장 가능, CurSource 추상화 (sourceType enum) |
| 리포트 유형 추가 | 낮음 | REPORT_TEMPLATE 레코드 + RoleTemplateMatrix 상수 엔트리 추가 |
| 권한 모델 변경 | 중간 | 5권한이 Enum으로 코드·DB·JWT·RLS에 분산 — 추가 role 시 4곳 동시 수정. 다만 분산 지점은 명시적 |
| RLS 정책 추가 대상 | 낮음 | §6.3/§6.3-A의 직접 + JOIN 기반 2패턴이 참조 템플릿화되어 있음 |
| CUR 수집 방식 변경 (S3 Pull) | 낮음 | CurSource.sourceType enum 확장 + 구현체 교체 |

### 2.3 R-5 상세: 미결 사항 가정 평가

| OPEN ID | 가정 | 합리성 | 확정 시 재작업 범위 |
|---------|------|--------|-----------------|
| OPEN-001 | R01~R06 가정 | ✅ | REPORT_TEMPLATE 레코드 — 최소 |
| OPEN-002 | 14개 컬럼 | ✅ | COST_DATA 컬럼 변경 — 중간 |
| OPEN-003 | VIEWER→TENANT_USER 부서 필터 | ✅ | 이미 TENANT_USER_SCOPE로 더 세밀화됨 |
| OPEN-004 | 익영업일 순연 | ✅ | 스케줄러 로직 — 최소 |
| OPEN-005 | JWT (+ tenantId/tenantSlug/roles/userId claims) | ✅ | Spring Security 필터 — 중간 |
| OPEN-006 | 로컬 볼륨 + StorageService 추상화 | ✅ | 구현체 교체 — 최소 |
| OPEN-007 | iText | ✅ | 구현체 교체 — 최소 |
| OPEN-008 | JavaMailSender | ✅ | 구현체 교체 — 최소 |
| OPEN-009~017 | 멀티테넌트·5권한·라우팅·SubAccount 단위·AWS only·CUR 수동·SSO 미적용·계약 조회·승인자 placeholder | ✅ 전건 확정 | 사용자 컨펌 완료 — 재작업 없음 |

---

## 3. 리뷰어 추가 발견 이슈

| ID | 심각도 | 유형 | 위치 | 설명 | 프로토타입 차단 | 조치 권고 |
|----|--------|------|------|------|--------------|----------|
| REV-v2-001 | 🟢 Minor | 일관성 | data-model.md §5 인덱스 + feature-decomposition §3.1 설명 텍스트 | §5 인덱스 `idx_cost_account_dept` 설명이 "ROLE_VIEWER 부서 필터"로 v1 권한명 잔존 (다른 섹션은 모두 5권한으로 갱신됨). 기능·SQL에는 영향 없음 | ❌ 비차단 | "TENANT_USER 부서 필터"로 문구 교체 |

> **참고**: QA가 발견한 DQA-v3-001~007 외에 구조적 이슈 신규 발견은 없습니다. REV-v2-001은 텍스트 한 줄 수정 수준으로, 프로토타이퍼 또는 설계자가 병행 정리 가능합니다.

---

## 4. 종합 판정

### 4.1 판정: 🟡 **조건부 승인** (Conditionally Approved)

### 4.2 판정 근거

1. **Critical 0건 · High 2건** — 사용자 임계치(Critical 0 + High ≤ 2) 충족 → 승인 기준 통과
2. **설계 모델 결함 없음** — 스키마·라우팅·권한·RLS·GNB·API의 6종 구조가 v3.0에서 모두 일관성 있게 수렴. 이전 add-on 회귀 패턴(REG-003)이 완전히 해소됨
3. **잔존 7건은 표기·예시 값 수준** — High 2건도 모델 재작업이 아닌 더미데이터 예시 교체로 해결. 1~2시간 수정분
4. **프로토타입 즉시 착수 가능** — P-01~P-10 체크리스트가 Context Ledger §3에 명시되어 있고, 설계 문서가 해당 작업을 해석 여지 없이 정의

### 4.3 승인 조건 (프로토타이퍼/설계자에게 이행 요구)

**조건 1 (필수 — 프로토타입 시드 생성 전 해소)**: DQA-v3-001 Tenant ID/슬러그 통일
- dummy-data-spec §0.1의 값(`AD000001K3/shinhan-card`, `AD000002L9/shinhan-life`, `AD000003M2/shinhan-internal`)을 정본으로 채택
- §3 User 테이블의 `AD00000AK7/shinhan-card (ds-internal)` 참조를 §0.1 값으로 일괄 치환
- §5 Subscriber, §7 DownloadLog, §11 데이터 생성 우선순위표의 tenant_id 참조 동반 교체
- slug `ds-internal` → `shinhan-internal` 통일 (또는 §0.1을 `ds-internal`로 역방향 통일 — 택일 시 LinkedPayerRule 영향 점검)

**조건 2 (필수 — 프로토타입 시드 생성 전 해소)**: DQA-v3-002 ContractCode 접두사 통일
- 정본: §0.2의 `SHC / SHL / SDS` (§7.3 "slug 약어 3~5자 대문자" 규칙에도 부합)
- §5 Subscriber의 `SLF-2026-001` → `SHL-2026-001`, `DSC-2026-001/002` → `SDS-2026-001/002` 교체
- Subscriber 60건 전체·SubscriptionLog 참조 전수 검토

**조건 3 (권장 — 프로토타입 착수와 병행)**: DQA-v3-003 `subscriptions` vs `subscribers` 화면 경로 통일
- 리뷰어 권고: 화면 베이스 경로를 `/subscribers`로 확정 (api-spec §9-C가 정본)
- feature-decomposition §5.3 FR-05-02 라벨 `/subscriptions` → `/subscribers` 교체
- screen-flow §3.5 본문은 `/subscribers`이나 라벨만 혼재 — `/subscriptions`는 발송 이벤트 서브리소스로 한정
- screen-flow 다이어그램 `SUBS["/c/{contractId}/subscriptions"]` → `SUBS["/c/{contractId}/subscribers"]`, §4 다이어그램 `U4[/t/{slug}/c/{contractId}/subscribers]`는 유지

**조건 4 (권장 — 프로토타입 착수 전 설계자 판단)**: DQA-v3-004 SYS_OPS의 시스템 대시보드 접근 확정
- 리뷰어 권고: **SYS_OPS = 시스템 대시보드 ✅ (업로드 KPI 조회 목적)**
  - feature-decomposition §2의 "SYS_ADMIN / SYS_OPS: 시스템 대시보드에서 전 테넌트 KPI 요약" 문장과 일관
  - SYS_OPS는 RLS bypass이며 AUDIT_LOG 의무 기록이 이미 설계됨
  - 접근 불가 시 SYS_OPS가 자신의 업로드 현황 추적 수단 부재
- feature-decomposition §3.1 권한 매트릭스 표기를 ❌ → ✅로 교체 (component-spec §1.1과 일치)

**조건 5 (선택 — 구현 전 문서 정리)**: Minor 3건 + 리뷰어 REV-v2-001
- DQA-v3-005: data-model §7.1 예시 `ADKK00000AK7` → `AD000001K3` (10자)
- DQA-v3-006: api-spec §10.2 `5(+4)` 혼합 표기를 풀어서 재집계, 제목 숫자 일관 정정
- DQA-v3-007: handoff-to-qa.md DQA-v2-011 행을 두 조치(§2.7 중복 해소 + dummy §10→§11)로 분리 서술
- REV-v2-001: data-model §5 `idx_cost_account_dept` 설명 "ROLE_VIEWER" → "TENANT_USER"

### 4.4 행선지 및 차단/비차단 구분

| 단계 | 행선지 | 조건 이행 요구 | 비고 |
|------|-------|-------------|------|
| ④ 프로토타입 v2 보강 | 04-prototyper.md | **조건 1·2 선결** → 시드 생성 | 조건 3·4는 병행 가능 |
| ④-a 사용자 컨펌 | (사용자) | 조건 1·2 시드 반영 확인 | 조건 3·4는 이 시점까지 해소 권장 |
| ⑤ 프로토타입 QA | 05-prototype-qa.md | 조건 3·4 반영 결과 검증 | 조건 5는 구현 전까지 |

---

## 5. 리뷰어 확인 체크리스트 (QA 권고사항 재검증)

QA가 §8 "리뷰어 참고 사항"에서 요청한 회귀 위험 지점을 리뷰어가 직접 확인한 결과:

| 회귀 위험 지점 | 확인 결과 |
|-------------|---------|
| data-model §6.3-A JOIN 기반 RLS 정책 PostgreSQL 15+ 문법 | ✅ `current_setting('app.*')` + EXISTS JOIN 패턴 — 표준 문법 |
| component-spec §1.1 GNB `variant` TypeScript discriminated union | ✅ `'system' \| 'tenant-admin' \| 'tenant-user'` 리터럴 유니언 — 타입 안정성 확보 |
| api-spec v1 경로 정의 0건 | ✅ Grep 확인 — `/uploads`, `/reports`, `/dashboard`, `/admin/users` 단독 경로 정의 없음, 마이그레이션 맵에만 흔적 존재 |
| dev/* 프로토타입 상태 | ✅ v1 상태 유지 확인 — 본 리뷰 범위 외, ④-a 단계에서 P-01~P-10 체크리스트로 보강 예정 |

---

## 6. 다음 단계 핸드오프

```
## 핸드오프: 설계 리뷰어 → 프로토타이퍼
메타: 2026-04-16 / 03-design-reviewer / 회차 9 / 정방향 (조건부 승인)
판정: 🟡 조건부 승인 (Critical 0 / High 2 / Major 2 / Minor 3 + REV-v2-001 Minor 1)
승인 조건:
  - 조건 1 [필수 / 시드 생성 전]: DQA-v3-001 Tenant ID/슬러그 §0.1 값으로 통일
  - 조건 2 [필수 / 시드 생성 전]: DQA-v3-002 ContractCode 접두사 §0.2 값(SHC/SHL/SDS)으로 통일
  - 조건 3 [권장 / 프로토타입 병행]: DQA-v3-003 화면 베이스 경로 /subscribers로 통일
  - 조건 4 [권장 / 설계자 판단]: DQA-v3-004 SYS_OPS 시스템 대시보드 ✅ 확정
  - 조건 5 [선택 / 구현 전]: Minor 3건 + REV-v2-001 문서 정리
해소 이력:
  - DQA-v2-001~015 (Critical 1 / High 5 / Major 4 / Minor 5) 전건 해소 확인
  - REG-002 멀티테넌트 회귀 사이클 종결
전달: design/* v3.0, qa/design/design-qa-report.md v4.0, review/design/verdict.md v2.0, review/design/feedback.md v2.0, docs/context-ledger.md, docs/brd.md v1.1
프로토타이퍼 지시:
  - Context Ledger §3 프로토타입 v2 보강 체크리스트 P-01~P-10 기반으로 보강
  - 조건 1·2는 dummy-data 시드 생성 전 반드시 해소 (FK 오류 방지)
  - Shinhan Web Design System + ECharts + AG Grid 유지, GNB 3변형 Mock 전환 구현
  - TENANT_APPROVER placeholder, MixedCurrencyBadge, MaskedSumIndicator는 데모 스텁 수준 허용
다음 단계: ④-a 사용자 컨펌 (P-01~P-10 완료 후) → ⑤ 프로토타입 QA
```

---

*본 판정은 agents/03-design-reviewer.md의 Phase 1~4 지침에 따라 수행되었으며, design/* v3.0 6종 + handoff-to-qa.md v3.0 + qa/design/design-qa-report.md v4.0 + docs/context-ledger.md + docs/brd.md v1.1 전수 읽기를 기반으로 작성되었습니다.*
