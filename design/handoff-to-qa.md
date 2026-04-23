# 핸드오프: 설계 에이전트 → 설계 QA (v3.0)

## 메타
- 일시: 2026-04-16
- 에이전트: 01-architect
- 회차: **7** (REG-002 회귀 · DQA-v2 반영 사이클)
- 유형: 🔁 설계 QA 재회귀 (DQA-v2-001~015 전건 해소 → 설계 v3.0)
- 이전 판정: qa/design/design-qa-report.md v3.0 — **FAIL** (Critical 1 / High 5 / Major 4 / Minor 5)

---

## v3.0 변경 요약 — DQA-v2 15건 해소표

| DQA ID | 심각도 | 반영 파일 | 반영 내용 |
|--------|-------|----------|-----------|
| DQA-v2-001 | Critical | data-model.md §2.4~§2.12 | 모든 엔티티 상세표에 `tenant_id CHAR(10)` 컬럼 + UK/인덱스 추가 (UPLOAD_BATCH, UPLOAD_SHEET, COST_DATA, REPORT_FILE, SUBSCRIBER, SUBSCRIPTION_LOG, DOWNLOAD_LOG, COLUMN_ALIAS) |
| DQA-v2-002 | High | screen-flow.md §3.1~§3.6, §4 | v1 경로·3권한을 v2.0 경로·5권한(SYS_ADMIN/SYS_OPS/TENANT_ADMIN/APPROVER/USER)으로 전면 교체 |
| DQA-v2-003 | High | api-spec.md §3~§9 | v1.0 라우트 정의 **전면 삭제**, §3에 v1→v2 마이그레이션 맵으로 대체 |
| DQA-v2-004 | High | data-model.md §2.7, §4 | TEMPLATE_ROLE_ACCESS 엔티티·관계·필드 **완전 제거**, 가시성은 상수 `RoleTemplateMatrix`로 이관 |
| DQA-v2-005 | High | data-model.md §2.8 | REPORT_FILE에서 `batch_id` 삭제, `tenant_id`/`contract_id` 추가 (COST_DATA 집계 기반으로 일관) |
| DQA-v2-006 | High | component-spec.md §1.1 | GNB를 `variant: 'system'|'tenant-admin'|'tenant-user'` 3변형 Props + 5권한 메뉴 매트릭스로 재작성 |
| DQA-v2-007 | Major | dummy-data-spec.md §3 | Role 3건→5건, User 10건→**28건**(시스템 4 + 테넌트 24) 교체 |
| DQA-v2-008 | Major | data-model.md §6.3-A | CLOUD_ACCOUNT / CLOUD_SUB_ACCOUNT / CUR_SOURCE의 JOIN 기반 RLS 정책 SQL 명문화 |
| DQA-v2-009 | Major | data-model.md §2.8 / ERD | REPORT_FILE 관계 재정비 (UPLOAD_BATCH→REPORT_FILE 제거, CONTRACT→REPORT_FILE 유지) |
| DQA-v2-010 | Major | docs/context-ledger.md | 프로토타입 v2 보강 범위를 레저에 ①-3 항목으로 예약 (아래 별도 섹션) |
| DQA-v2-011 | Minor | data-model.md §2.x, dummy-data-spec.md §11 | §2.7 중복 섹션 자연 정리 (TEMPLATE_ROLE_ACCESS 삭제로 해소), §10→§11 번호 재정렬 |
| DQA-v2-012 | Minor | feature-decomposition.md F00, §7 NFR-06, §7→§8 | F00 경로/5권한 교체, NFR-06 참조 갱신, §7 번호 중복 해소 |
| DQA-v2-013 | Minor | dummy-data-spec.md §5, §7 | Subscriber에 tenant_id/contract_id, DownloadLog 5권한 분포로 교체 |
| DQA-v2-014 | Minor | api-spec.md §10 | v1.0 36개 평면 리스트 → v2.0 카테고리별 집계표(~76개)로 재작성 |
| DQA-v2-015 | Minor | design/handoff-to-qa.md | 본 파일 v3.0 · 회차 **7**로 정정 |

---

## 전달 아티팩트 (모두 v3.0)

| 파일 | 이전 | 현재 | 주요 변경 |
|------|------|------|-----------|
| design/data-model.md | v2.0 | **v3.0** | §2.4~§2.12 tenant_id 컬럼 / §2.7 REPORT_TEMPLATE 재정렬 / §2.8 REPORT_FILE batch_id→tenant_id+contract_id / §6.3-A JOIN 기반 RLS |
| design/feature-decomposition.md | v2.0 | **v3.0** | F00 5권한·계약컨텍스트 / NFR-06 참조 갱신 / §7→§8 번호 해소 |
| design/screen-flow.md | v2.0 | **v3.0** | §3.1~§3.6 v2 경로·5권한 / §4 5트랙 subgraph / §5 모달 경로 갱신 |
| design/component-spec.md | v2.0 | **v3.0** | §1.1 GNB 3변형 Props + 5권한 메뉴 매트릭스 |
| design/api-spec.md | v2.0 | **v3.0** | §3~§9 v1 라우트 삭제·마이그레이션 맵으로 대체 / §10 카테고리별 집계표 재작성 |
| design/dummy-data-spec.md | v2.0 | **v3.0** | §3 5권한·28사용자 / §5 Subscriber tenant+contract / §7 DownloadLog 5권한 / §10→§11 |
| docs/context-ledger.md | 회차 7 진행중 | **회차 7 종료 준비** | DQA-v2-001~015 반영 로그 추가 |

---

## 핵심 설계 결정 — v3.0 시점 재확인

### 1) tenant_id 컬럼 위치 전략

| 테이블 유형 | tenant_id 보유 | 이유 |
|------------|--------------|------|
| 고빈도 집계 테이블 (COST_DATA, REPORT_FILE, DOWNLOAD_LOG, SUBSCRIBER, SUBSCRIPTION_LOG, COLUMN_ALIAS) | ✅ 직접 | WHERE tenant_id = ? 직접 필터, 인덱스 프리픽스 |
| 업로드 추적 (UPLOAD_BATCH, UPLOAD_SHEET) | ✅ 직접 (NULL 허용) | SYS_OPS가 업로드 시점엔 NULL, 매핑 완료 후 채움 |
| 카탈로그성 테이블 (CLOUD_ACCOUNT, CLOUD_SUB_ACCOUNT, CUR_SOURCE) | ❌ JOIN 기반 | 행 수 작음·이전 시 일관성 관리 부담 회피 |
| 이미 tenant 경유 (TENANT_USER_SCOPE, APPROVAL_REQUEST, AUDIT_LOG) | ✅ 직접 | 명시적 |

### 2) TEMPLATE_ROLE_ACCESS 폐기 → `RoleTemplateMatrix` 상수

```typescript
// 코드 상수 — 구현 단계에서 적용
const RoleTemplateMatrix: Record<Role, TemplateCode[]> = {
  ROLE_SYS_ADMIN: ['R01','R02','R03','R04','R05','R06'],
  ROLE_SYS_OPS: [],  // 리포트 조회 권한 없음
  ROLE_TENANT_ADMIN: ['R01','R02','R03','R04','R05','R06'],
  ROLE_TENANT_APPROVER: ['R01','R06'],
  ROLE_TENANT_USER: ['R01','R02','R03','R04','R05','R06'],
};
```

DB 행 없이 코드 수정만으로 정책 변경, 테넌트별 반복 저장 낭비 방지.

### 3) REPORT_FILE 집계 단위 명확화

- **이전**: `(template_id, batch_id, generated_by, target_year_month)` — 배치 종속
- **이후**: `(tenant_id, contract_id, template_id, target_year_month)` — 계약·연월 단위

한 연월이 여러 배치에 걸쳐있어도 계약 단위 단일 리포트로 집계 가능.

### 4) GNB 3변형 + 계약 컨텍스트

```
variant=system     → 배경 딥블루, 시스템 메뉴
variant=tenant-admin → 테넌트명, 관리 메뉴
variant=tenant-user  → 테넌트명 + ContractSelector + MixedCurrencyBadge + MaskedSumIndicator
```

URL 기반 자동 결정, 각 variant는 RoleGuard와 조합해 역할×경로 이중 검증.

---

## QA 재검증 요청 (v3.0 기준)

### 필수 확인
1. **tenant_id 적용 완결성** — data-model §2.4~§2.12 엔티티 상세표와 §6.1 RLS 적용 대상이 일치하는지
2. **TEMPLATE_ROLE_ACCESS 잔존 확인** — 전체 6개 설계문서·Context Ledger에 남은 참조 0건
3. **api-spec §3~§9 잔존 확인** — v1 경로 정의 삭제 + 마이그레이션 맵만 남음
4. **RLS JOIN SQL 구문 검증** — §6.3-A의 3개 정책이 PostgreSQL 15+에서 동작 가능한 형태인지
5. **GNB Props 계약** — component-spec §1.1의 `variant`별 필수/선택 Props 매트릭스가 screen-flow §1-A/B/C와 일치하는지
6. **dummy-data §3 UK** — tenant_id × username/email 복합 UK 검증 시나리오 커버

### 회귀 위험
- **v2.0 잔존 v1 표기**: `/uploads`, `/reports` 등 v1 경로가 예시 코드·주석에 남았을 가능성 — Grep으로 전수 검사 권장
- **프로토타입(dev/*)**: 여전히 v1 상태 — ④-a 프로토타입 v2 보강 단계에서 별도 처리 (아래 참조)

### 판정 재평가 기준 (권장)
- Critical 0건 + High ≤ 2건: **PASS**
- High 3건+ 또는 Critical 재발생: 즉시 재회귀

---

## 다음 단계

1. **② 설계 QA 재수행** → qa/design/design-qa-report.md v4.0 작성
2. PASS 시 **③ 설계 리뷰** → 최종 승인 또는 조건부 승인
3. **④-a 프로토타입 v2 보강** (DQA-v2-010 관련):
   - 기존 5개 화면(대시보드·업로드·리포트·구독·사용자 관리) 유지
   - 신규 화면 추가: 시스템 콘솔 홈 / 테넌트 콘솔 홈 / 계약 셀렉터 / 로그인 3분할
   - GNB 3변형 Mock 데이터 반영
   - 범위·우선순위는 Context Ledger §3의 프로토타입 v2 체크리스트 참조

핸드오프 v3.0 종료. ② 설계 QA로 재진입.
