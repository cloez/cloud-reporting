# 설계 QA 보고서 — 클라우드 비용 리포팅 자동화 (v4.0)

> **검토자**: 02-design-qa
> **검토일**: 2026-04-16 (v3.0 설계에 대한 회차 8 QA 재검증)
> **검토 대상**: design/* v3.0 (DQA-v2-001~015 전건 해소 반영본)
> **판정**: ✅ **PASS → 03-design-reviewer.md (정방향 진행)**
> **근거**: Critical 0건, High 2건 — 사용자 기준(Critical 0 + High ≤ 2) 충족

---

## 0. 회차 이력

| 회차 | 판정 | 사유 |
|------|------|------|
| 1 | ❌ FAIL | 초회 QA — Critical 1 / High 2 (COST_DATA 누락) |
| 2 | ✅ PASS | 재QA — v1.2 회귀 반영, Major 1 / Minor 3 잔여 |
| 3~6 | — | ③ 리뷰·④ 프로토타입 단계 |
| 7 | ❌ FAIL | v2.0(REG-002) QA — Critical 1 / High 5 / Major 4 / Minor 5 |
| **8 (본건)** | ✅ **PASS** | **v3.0 회귀 결과 — Critical 0 / High 2 / Major 2 / Minor 3** |

---

## 1. 이전 회차(v3.0 FAIL) 이슈 해소 매트릭스

| DQA ID | v3.0 판정 | v4.0 확인 결과 | 해소 여부 | 근거 파일·섹션 |
|--------|----------|---------------|----------|----------------|
| DQA-v2-001 (tenant_id 컬럼 누락, RLS 구현 불가) | 🔴 Critical | data-model §2.4~§2.12 각 엔티티 상세표에 `tenant_id CHAR(10)` 컬럼 + UK·인덱스 명시적 추가 확인. §6.3 RLS 정책이 실제 컬럼과 연결됨 | ✅ **해소** | data-model.md §2.4/§2.5/§2.8/§2.9/§2.10/§2.11/§2.12 |
| DQA-v2-002 (screen-flow v1 경로·3권한 잔재) | 🟠 High | §3.1 로그인 3분할 / §3.2 시스템콘솔 / §3.3 테넌트관리 / §3.4 업로드·리포트(계약컨텍스트) / §3.5 구독 / §3.6 사용자관리 전면 재작성. §4 5트랙 서브그래프로 교체 | ✅ **해소** | screen-flow.md §3·§4 |
| DQA-v2-003 (api-spec v1·v2 중복 정의) | 🟠 High | §3~§9가 v1→v2 마이그레이션 맵으로 전면 대체됨. v1 라우트 정의 0건, §9-A/B/C만 잔존. §10에 카테고리별 집계표 재작성 | ✅ **해소** | api-spec.md §3·§9·§10 |
| DQA-v2-004 (TEMPLATE_ROLE_ACCESS 폐기·잔존 모순) | 🟠 High | data-model §2.7에 엔티티 삭제·`RoleTemplateMatrix` 상수 선언만 유지. §4 관계도에서 M:N 제거. feature-decomposition §7 NFR-06 매핑도 코드 상수 기반으로 갱신 | ✅ **해소** | data-model.md §2.7/§4, feature-decomposition.md §7 |
| DQA-v2-005 (REPORT_FILE ERD ↔ §2.8 모순) | 🟠 High | §2.8 상세표에서 `batch_id` 제거, `tenant_id CHAR(10)` + `contract_id BIGINT` 추가. UK가 `(tenant_id, contract_id, template_id, target_year_month)`로 변경, ERD와 일치 | ✅ **해소** | data-model.md §2.8 |
| DQA-v2-006 (GNB 3변형 미반영) | 🟠 High | component-spec §1.1이 `variant: 'system'\|'tenant-admin'\|'tenant-user'` Props + 5권한 메뉴 매트릭스로 재작성. `UserInfo.role`도 5권한 타입 | ✅ **해소** | component-spec.md §1.1 |
| DQA-v2-007 (dummy-data Role/User v1 잔존) | 🟡 Major | §3 Role 5건·User 28명(SYS 4 + 테넌트 24)으로 교체. §0과 일관된 네임스페이스 | ✅ **해소** | dummy-data-spec.md §3 |
| DQA-v2-008 (CLOUD_ACCOUNT/SUB/CUR_SOURCE RLS 미정) | 🟡 Major | §6.3-A에 JOIN 기반 RLS 정책 SQL 3종(cloud_account / cloud_sub_account / cur_source) 명문화. PostgreSQL 15 호환 문법 | ✅ **해소** | data-model.md §6.3-A |
| DQA-v2-009 (REPORT_FILE 관계도 잔재) | 🟡 Major | ERD에서 UPLOAD_BATCH→REPORT_FILE 관계 제거, CONTRACT→REPORT_FILE 유지. §4 관계 요약도 일관 | ✅ **해소** | data-model.md §4 |
| DQA-v2-010 (프로토타입 v2 보강 범위 미기재) | 🟡 Major | Context Ledger §3에 프로토타입 v2 보강 체크리스트(P-01~P-10) 예약 기재 | ✅ **해소** | docs/context-ledger.md §3 |
| DQA-v2-011 (섹션 번호 중복) | 🟢 Minor | data-model §2.7 TEMPLATE_ROLE_ACCESS 삭제로 중복 자연 해소. dummy-data-spec §10→§11 재정렬 | ✅ **해소** | data-model.md §2.7, dummy-data-spec.md §11 |
| DQA-v2-012 (F00 v1 언어 잔존) | 🟢 Minor | feature-decomposition §1 F00 경로를 `/t/{slug}/c/{contractId}/dashboard`로, 역할을 5권한 매트릭스로 교체. §7 번호 중복 정리 | ✅ **해소** | feature-decomposition.md §1/§7/§8 |
| DQA-v2-013 (Subscriber·DownloadLog v1 모델) | 🟢 Minor | §5 Subscriber 샘플에 `tenant_id`/`contract_id` 추가, §7 DownloadLog 역할 분포 5권한으로 교체 | ✅ **해소** | dummy-data-spec.md §5/§7 |
| DQA-v2-014 (api-spec §10 요약 표 공백) | 🟢 Minor | §10을 시스템/테넌트관리/계약관리/테넌트사용자/승인/감사 카테고리별 집계표(~76개)로 재작성 | ✅ **해소** | api-spec.md §10 |
| DQA-v2-015 (handoff 회차 번호) | 🟢 Minor | "회차 7"로 정정, v3.0 종료 준비 로그 업데이트 | ✅ **해소** | design/handoff-to-qa.md §메타 |

**해소율**: **15/15 (100%)** — 이전 회차 지적 전건 해소 확인.

---

## 2. 요구사항 커버리지 매트릭스 (v3.0)

| BRD/REG 기능 | 기능분해 | 화면흐름 | 데이터모델 | 컴포넌트 | API |
|-------------|---------|---------|----------|---------|-----|
| 데이터 업로드·검증 | ✅ F01 | ✅ §3.4 계약컨텍스트 경로 | ✅ BATCH+SHEET+COST_DATA (tenant_id) | ✅ §2 | ✅ §9-C |
| 템플릿 선택 | ✅ F02 | ✅ §3.4 | ✅ REPORT_TEMPLATE + RoleTemplateMatrix | ✅ §3 | ✅ §9-C |
| 리포트 생성(Excel) | ✅ F03 | ✅ §3.4 | ✅ REPORT_FILE (tenant+contract 단위) | ✅ §3-b | ✅ §9-C |
| 팝업 상세·다운로드 | ✅ F04 | ✅ §3.4 | ✅ DOWNLOAD_LOG (tenant_id) | ✅ §4 | ✅ §9-C |
| 구독 발송 | ✅ F05 | ✅ §3.5 | ✅ SUBSCRIBER (tenant+contract) | ✅ §5 | ✅ §9-C |
| 목적별 필터링·검색 | ✅ F06 | ✅ | ✅ | ✅ §9.5 | ✅ |
| F07 테넌트관리 | ✅ | ✅ §3.2 | ✅ TENANT (CHAR10+슬러그+PayerOption) | ✅ §11.5 | ✅ §9-A |
| F08 계약관리 | ✅ | ✅ §3.3 | ✅ CONTRACT+CA+SUB+CUR | ✅ §11.6~11.7 | ✅ §9-B |
| F09 권한위임 | ✅ | ✅ §3.3 | ✅ TENANT_USER_SCOPE | ✅ §11.9 | ✅ §9-B |
| F10 감사로그 | ✅ | ✅ | ✅ AUDIT_LOG | ✅ §11.12 | ✅ §9-A/B |
| F11 CUR 업로드 Payer | ✅ | ✅ §3.4 | ✅ CLOUD_ACCOUNT (JOIN-RLS) | ✅ §11.8 | ✅ §9-A |
| 승인함 placeholder | ✅ | ✅ | ✅ APPROVAL_REQUEST | ✅ §11.13 | ✅ §9-C |

**커버리지**: MVP 6/6(100%) + v2 신규 5/5(100%) — 모든 기능 ID에 대해 6종 설계문서가 일관된 경로·역할·엔티티로 서술.

---

## 3. 논리적 일관성 검증 결과

| 검증 항목 | 결과 | 비고 |
|----------|------|------|
| 데이터모델 ↔ 기능분해 | ✅ | TENANT~AUDIT_LOG + CLOUD_ACCOUNT/SUB/CUR_SOURCE + SUBSCRIBER/CONTRACT 스키마가 F00~F11 기능 요구를 완전 지원 |
| 데이터모델 ↔ 화면흐름 | ✅ | 화면흐름 §3.1~§3.6이 v3.0 엔티티 구조(tenant_id, contract_id, sub_account_id)를 참조 |
| 기능분해 ↔ 화면흐름 | ⚠️ | §2 3트랙 흐름 + §3 세부흐름 모두 v3.0 경로로 일관. 단 `subscriptions` vs `subscribers` 표기 혼재 (DQA-v3-003 — Major) |
| 컴포넌트 ↔ 화면흐름 | ⚠️ | GNB 3변형·메뉴 매트릭스 일관. 단 SYS_OPS의 시스템 대시보드 접근 표기가 component-spec §1.1 ↔ feature-decomposition §3.1 간 엇갈림 (DQA-v3-004 — Major) |
| API ↔ 기능분해 | ✅ | §9-A/B/C가 F00~F11 전 기능에 1:1 매핑. v1 중복 정의 제거 확인 |
| RBAC ↔ BRD 역할 | ✅ | 5권한(SYS_ADMIN/SYS_OPS/TENANT_ADMIN/APPROVER/USER) 체계가 모든 문서에서 일관 사용 |
| RLS 세션 변수 ↔ 스키마 | ✅ | 모든 대상 테이블에 tenant_id 실재 + §6.3/6.3-A 정책 SQL 문법 검증 통과 |

---

## 4. 완성도 검증 결과

| 검증 항목 | 결과 | 비고 |
|----------|------|------|
| ERD: 관계·필드 타입 | ✅ | v3.0 ERD ↔ §2.x 상세 표 완전 일치 |
| 컴포넌트 Props | ✅ | §11 신규 13종 타입스크립트 인터페이스 정의 양호 + GNB 3변형 Props 스펙화 |
| 상태 관리 | ✅ | §10 유지 + `TenantContextProvider` 추가 |
| 더미 데이터 스펙 | ⚠️ | §3 5권한·28명 반영. 단 §0.1 Tenant ID 예시와 §3 User의 tenant_id 참조 간 불일치 (DQA-v3-001 — High) / §0.2 ContractCode ↔ §5 Subscriber 접두사 불일치 (DQA-v3-002 — High) |
| 인덱스 설계 | ✅ | tenant_id 프리픽스 인덱스 7종 + RLS 최적화 인덱스 추가 양호 |
| NFR 추적 | ✅ | §7 NFR-06이 "RoleTemplateMatrix 상수 참조"로 갱신 |
| 원본 FR ID 추적성 | ✅ | §8 매트릭스 완비 (§7 번호 중복 해소) |

---

## 5. TRD 기술 제약 검증

- [x] Apache ECharts / AG Grid 고정 유지
- [x] Claude API 서버사이드 전용
- [x] OpenAPI/Swagger 명시 (`/swagger-ui`)
- [x] Shinhan Web Design System / Pretendard 유지
- [x] JWT 인증 (tenantId/tenantSlug/roles[]/userId claims 확장)
- [x] Docker 기반 (docker-compose.yml)
- [x] **RLS 정책 세션 변수 주입 설계 (§6.2~§6.4) — 스키마 반영 완료로 구현 가능**
- [x] 성능 — v3 인덱스 확장 반영

---

## 6. 신규 발견 이슈 (v3.0 반영 결과물 대상)

| ID | 심각도 | 유형 | 위치 | 설명 | 조치 권고 |
|----|--------|------|------|------|----------|
| **DQA-v3-001** | 🟠 High | 더미데이터 내부 불일치 (Tenant ID/슬러그) | dummy-data-spec §0.1 ↔ §3 | §0.1 Tenant 테이블에 `AD000001K3 / AD000002L9 / AD000003M2` + `shinhan-card / shinhan-life / shinhan-internal` 슬러그로 선언. 그러나 §3 User 테이블은 동일 테넌트를 `AD00000AK7 / AD00001BL4 / AD00002CM1` + `ds-internal` 슬러그로 참조 → 동일 파일 내 자기모순. 프로토타입 시드 생성 시 FK 불일치 오류 발생 | §3 User의 tenant_id·슬러그 값을 §0.1과 동일하게 통일. 또는 §0.1을 §3 값으로 통일 (택일 후 `LinkedPayerRule` 예시 영향 점검) |
| **DQA-v3-002** | 🟠 High | 더미데이터 내부 불일치 (ContractCode 접두사) | dummy-data-spec §0.2 ↔ §5 | §0.2 Contract 테이블은 `SHC-2026 / SHL-2026 / SDS-2026` 코드. §5 Subscriber 샘플은 `SHC-… / SLF-… / DSC-…` 접두사 사용 → `SHL↔SLF` 및 `SDS↔DSC` 접두사 충돌 | 한 쪽 접두사로 통일 (권장: §0.2의 SHC/SHL/SDS). §5·§7·§11 샘플 전수 교체 |
| DQA-v3-003 | 🟡 Major | 경로 표기 혼재 (`subscriptions` vs `subscribers`) | feature-decomposition §5.3 ↔ screen-flow §3.5 / api-spec §9-C | F05 구독 기능의 베이스 경로가 `/t/{slug}/c/{contractId}/subscriptions`(feature-decomposition) 과 `/subscribers`(screen-flow·api-spec)로 엇갈림. 구현자 혼선 위험 | 한 쪽으로 통일 (권장: REST 리소스 관례상 `/subscribers`). feature-decomposition §5.3 수정 |
| DQA-v3-004 | 🟡 Major | 시스템 대시보드 권한 엇갈림 (SYS_OPS) | component-spec §1.1 GNB 매트릭스 ↔ feature-decomposition §3.1 권한 매트릭스 | component-spec §1.1은 SYS_OPS가 "시스템 대시보드 ✅"로 명시. 그러나 feature-decomposition §3.1(또는 F00 권한 매트릭스)은 SYS_OPS 시스템 대시보드를 "❌"로 표기 | 의도 확정: SYS_OPS가 업로드 KPI만 보는지 대시보드 전체를 보는지 설계 결정. 한 쪽 문서로 통일 |
| DQA-v3-005 | 🟢 Minor | Tenant.id 예시 형식 불일치 | data-model.md §7.1 | §7.1에 Tenant.id 예시로 `ADKK00000AK7` (12자) 기재. 그러나 §2.3에서 선언한 규칙은 "CHAR(10): Y1+M1+SEQ6+CHK2 Damm" | 예시를 10자 규칙에 맞게 교체 (예: `AD000001K3`) |
| DQA-v3-006 | 🟢 Minor | api-spec §10.2 카테고리 합계 오류 | api-spec.md §10.2 | 카테고리별 엔드포인트 합계 표기가 "7+4+2+5+4=18"로 적혀있으나 실제 합은 22. §10.5 전체 총합 ~76개와 연결되는 중간 집계 신뢰 저하 | 개별 카테고리 카운트 재검증 후 합계 수정. 또는 "~" 근사 표기를 일관 적용 |
| DQA-v3-007 | 🟢 Minor | handoff §2.7 번호 재정렬 설명 오기 | design/handoff-to-qa.md DQA-v2-011 행 | "§10→§11 번호 재정렬"이라 기재했으나 해소표 본문에서는 "§2.7 중복 섹션 자연 정리 (TEMPLATE_ROLE_ACCESS 삭제로 해소)"와 구분 없이 쓰여 가독성 저하 | 두 조치를 분리 서술하거나 각주 추가 |

---

## 7. 집계 및 판정

| 심각도 | v3.0 신규 (본 회차) | 이전 회차 잔여 | 합계 |
|--------|----------------------|----------------|------|
| 🔴 Critical | **0** | 0 | **0** |
| 🟠 High | **2** (DQA-v3-001, v3-002) | 0 | **2** |
| 🟡 Major | 2 (DQA-v3-003, v3-004) | 0 | 2 |
| 🟢 Minor | 3 (DQA-v3-005~007) | 0 | 3 |
| **합계** | **7** | **0** | **7** |

### 판정: ✅ **PASS — 03-design-reviewer.md 정방향 진행**

**근거**:
- Critical **0건**, High **2건** — 사용자 명시 기준(Critical 0 + High ≤ 2) 충족
- 이전 회차(v3.0) 전체 15건(Critical 1 / High 5 / Major 4 / Minor 5) 모두 해소
- v3.0 신규 이슈 7건은 모두 **내부 예시 값 불일치** 또는 **문서 간 표기 편차**로, 스키마·라우팅·권한 모델 자체의 결함은 없음
- RLS 구현 블로커 완전 해소(tenant_id 컬럼 실재 + JOIN 기반 정책 SQL 확보)

### 판정 세부 근거
1. **Critical 0건**: DQA-v2-001(RLS 미구현) 해소 확인 — data-model §2.4~§2.12 전건 tenant_id 실재, §6.3/6.3-A가 실스키마에 바인딩됨
2. **High 2건 ≤ 임계치**: 둘 다 더미데이터 내 예시 값 불일치(DQA-v3-001/002). 프로토타입 시드 생성 전 1회 수정으로 해결 가능한 범위. 설계 모델 자체에는 영향 없음
3. **Major 2건 / Minor 3건**: 경로 표기·권한 매트릭스 편차·숫자 오기. 리뷰 단계 조건부 승인으로 다음 단계에서 정리 가능

---

## 8. 리뷰어(03-design-reviewer) 참고 사항

본 PASS는 **조건부 승인 뉘앙스**로 전달됩니다. 리뷰 단계에서 다음 점을 추가 확인해 주시기 바랍니다.

### 리뷰 필수 확인 (High 2건)
1. **DQA-v3-001**: dummy-data-spec §0.1(Tenant) ↔ §3(User) Tenant ID/슬러그 일관성 — 프로토타입 ④-a 시드 생성 전 1회 정리 필요
2. **DQA-v3-002**: §0.2(Contract) ↔ §5(Subscriber) ContractCode 접두사 일관성 — 동일

### 리뷰 권장 확인 (Major 2건)
3. **DQA-v3-003**: 구독 경로 네이밍 `subscriptions` vs `subscribers` 설계 의도 확정
4. **DQA-v3-004**: SYS_OPS의 시스템 대시보드 접근 여부 확정 (운영/감사 목적 구분)

### 리뷰 선택 확인 (Minor 3건)
5. **DQA-v3-005**: Tenant.id 10자 규칙 예시 교체
6. **DQA-v3-006**: api-spec §10.2 카테고리 합계 산술 정정
7. **DQA-v3-007**: handoff 표기 명료화

### 회귀 위험 없음 확인 지점
- data-model §6.3-A의 PostgreSQL 15+ JOIN 기반 RLS 정책 문법
- component-spec §1.1 GNB `variant` Props의 TypeScript discriminated union 정확성
- api-spec v1 경로 정의 0건 (Grep: `/uploads\b`, `/reports\b`, `/dashboard\b` 등 v1 단일경로)

### 프로토타입(dev/*) 별도 이슈
- 현재 dev/*는 v1 상태 유지 (설계 v3.0 반영 전)
- Context Ledger §3의 프로토타입 v2 보강 체크리스트(P-01~P-10) 기반으로 ④-a 단계에서 반영 예정
- **본 QA 범위 외** — 리뷰 판정에 영향 없음

---

## 핸드오프: 설계 QA → 설계 리뷰어

```
## 핸드오프: 설계 QA → 설계 리뷰어
메타: 2026-04-16 / 02-design-qa / 회차 8 / QA 정방향 진행
판정: ✅ PASS (Critical 0 / High 2 / Major 2 / Minor 3)
해소 이력:
  - 이전 회차(v3.0 FAIL) 15건(Critical 1 / High 5 / Major 4 / Minor 5) 전건 해소
  - 해소율 100% — data-model/screen-flow/api-spec/component-spec/dummy-data-spec/feature-decomposition 6종 전체 일관성 확보
신규 이슈(v3.0 결과물 대상, 조건부 승인 뉘앙스):
  - High 2: DQA-v3-001 (dummy-data §0.1↔§3 Tenant ID 불일치), DQA-v3-002 (§0.2↔§5 ContractCode 접두사 불일치)
  - Major 2: DQA-v3-003 (subscriptions/subscribers 표기), DQA-v3-004 (SYS_OPS 시스템 대시보드 권한)
  - Minor 3: DQA-v3-005 (Tenant.id 예시), DQA-v3-006 (§10.2 합계 오기), DQA-v3-007 (handoff 표기)
리뷰 권고:
  - 판정: 조건부 승인 권장. 설계 모델 결함 없음, 내부 예시/표기 편차 위주
  - High 2건은 프로토타입 ④-a 시드 생성 전까지 반영 필요 (승인 조건에 포함 권장)
  - Major 2건은 리뷰어 판단으로 조건 또는 다음 단계 이월 가능
전달: qa/design/design-qa-report.md(v4.0), design/* v3.0, docs/context-ledger.md
다음 단계: review/design/design-review-report.md 작성 → 최종 승인/조건부 승인
```

---

*본 QA는 agents/02-design-qa.md 지침(Phase 1~6)에 따라 수행되었으며, design/* v3.0 6종 + handoff-to-qa.md v3.0 + docs/context-ledger.md를 기반으로 작성되었습니다. 판정 기준(Critical 0 + High ≤ 2 → PASS)은 사용자 명시 지침에 따른 것입니다.*
