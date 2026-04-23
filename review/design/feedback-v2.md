# 설계 리뷰 피드백 (v2.0)

> **리뷰어**: 03-design-reviewer
> **리뷰일**: 2026-04-16 (회차 9)
> **판정**: 🟡 조건부 승인 → 04-prototyper.md
> **대응 문서**: review/design/verdict.md v2.0

---

## 1. 수정 필요 사항 (우선순위 순)

| 순위 | 이슈 ID | 심각도 | 위치 | 수정 내용 | 시점 |
|------|---------|--------|------|----------|------|
| 1 | DQA-v3-001 | 🟠 High | dummy-data-spec.md §3 / §5 / §7 / §11 | **Tenant ID/slug 통일** — §0.1 정본(`AD000001K3/shinhan-card`, `AD000002L9/shinhan-life`, `AD000003M2/shinhan-internal`)으로 통일. §3 User 테이블의 `AD00000AK7 (shinhan-card)` / `AD00001BL4 (shinhan-life)` / `AD00002CM1 (ds-internal)` 참조를 §0.1 값으로 일괄 치환. §5 Subscriber tenant_id, §7 DownloadLog tenant_id, §11 데이터 생성 우선순위의 Tenant 참조 동반 수정. slug `ds-internal` → `shinhan-internal` 통일 (§0.1 기준) | **프로토타입 시드 생성 전 필수** |
| 2 | DQA-v3-002 | 🟠 High | dummy-data-spec.md §5 | **ContractCode 접두사 통일** — §0.2 정본(`SHC / SHL / SDS`)으로 통일. §5 Subscriber 샘플 `SLF-2026-001` → `SHL-2026-001`, `DSC-2026-001` → `SDS-2026-001`, `DSC-2026-002` → `SDS-2026-002` 교체. Subscriber 60건 전수 재검토. §7.3 식별자 규칙("slug 약어 3~5자 대문자")과 자연 정합 | **프로토타입 시드 생성 전 필수** |
| 3 | DQA-v3-003 | 🟡 Major | feature-decomposition.md §5.3 / §9 권한 매트릭스 + screen-flow.md §3.5 / §4 다이어그램 | **화면 베이스 경로 `/subscribers`로 통일** — api-spec §9-C 정본(리소스 CRUD=`/subscribers`, 발송 이벤트=`/subscriptions/*`) 유지. feature-decomposition §5.3 FR-05-02 `(/subscriptions)` → `(/subscribers)`, §9 `/t/{slug}/c/{contractId}/subscriptions` → `/subscribers` (단 api-spec의 `/subscriptions/logs|schedule|trigger` 서브리소스는 그대로 유지). screen-flow §3.5 다이어그램의 `SUBS["/c/{contractId}/subscriptions"]` → `subscribers`, §4 다이어그램의 base 라벨도 동일 교체 | 프로토타입 착수와 병행 |
| 4 | DQA-v3-004 | 🟡 Major | feature-decomposition.md §3.1 권한 매트릭스 | **SYS_OPS 시스템 대시보드 ✅로 통일** — component-spec §1.1 GNB 매트릭스 정본 채택. feature-decomposition §3.1 "시스템 대시보드(/admin/dashboard) SYS_OPS ❌" → "✅"로 교체. 근거: ①§2 텍스트 "SYS_ADMIN / SYS_OPS 시스템 대시보드에서 전 테넌트 KPI 요약" 문장과 일관 ②SYS_OPS는 RLS bypass + AUDIT_LOG 의무 기록이 이미 설계됨 ③업로드 현황 추적 수단 필요 | 프로토타입 착수 전 설계자 판단 |
| 5 | DQA-v3-005 | 🟢 Minor | data-model.md §7.1 | **Tenant.id 예시 10자로 교체** — `ADKK00000AK7` (12자) → `AD000001K3` (10자). §2.3 CHAR(10) 선언 및 §7.1 자리별 합산(1+1+6+2=10)과 일치시킴 | 구현 전 |
| 6 | DQA-v3-006 | 🟢 Minor | api-spec.md §10.2 | **카테고리 합계 산술 정정** — 제목 "18개"이나 세부합계 7+4+2+5+4=22. `"CUR 업로드 ... 5 + 컬럼 별칭 4 = 5(+4)"` 혼합 표기를 풀어서 재기술. 권고: "CUR 업로드 5 / 컬럼 별칭 4"로 분리하고 카테고리 총합 22로 제목 정정, 또는 "≈ 22" 근사 표기 | 구현 전 |
| 7 | DQA-v3-007 | 🟢 Minor | design/handoff-to-qa.md DQA-v2-011 행 | **두 조치 분리 서술** — "§2.7 중복 섹션 자연 정리 (TEMPLATE_ROLE_ACCESS 삭제로 해소)" 와 "dummy-data §10→§11 번호 재정렬"을 별개 항목 또는 개별 불릿으로 분리. 가독성 향상 | 선택 |
| 8 | REV-v2-001 | 🟢 Minor | data-model.md §5 인덱스 | **v1 권한명 잔존 문구 교체** — `idx_cost_account_dept` 설명 "ROLE_VIEWER 부서 필터" → "TENANT_USER 부서 필터". 기능·SQL에는 영향 없음, 문구만 | 선택 |

---

## 2. 프로토타이퍼 전달 메모 (조건부 승인 이행 지침)

프로토타이퍼(04-prototyper.md)가 v2 보강 착수 시 반드시 인지해야 할 사항입니다.

### 2.1 시드 생성 선결 조건 (조건 1·2)

프로토타입 v2 보강의 시드 데이터 생성 **전**에 dummy-data-spec.md v3.0 수정이 완료되어야 합니다.

**작업 순서 권장**:
1. (설계자 협의 또는 프로토타이퍼 직접) dummy-data-spec §3/§5/§7/§11의 Tenant ID·slug를 §0.1로 통일 (조건 1)
2. dummy-data-spec §5 Subscriber ContractCode 접두사를 §0.2(SHC/SHL/SDS)로 통일 (조건 2)
3. dummy-data-spec 버전을 v3.1로 올리고 변경 이력 기록
4. 시드 JSON/JS 생성 시 수정된 정본 기준으로 작성
5. dev/data.js(또는 mock store)에 반영하며 Tenant PK·slug·ContractCode 참조 무결성 확인

**FK 오류 감지 테스트**:
시드 로드 직후 다음 SQL 쿼리(또는 동등한 Mock 검증)로 자기모순 없음 확인
```sql
-- 모든 User가 존재하는 Tenant를 참조하는가
SELECT u.* FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.tenant_id IS NOT NULL AND t.id IS NULL;
-- 모든 Subscriber가 존재하는 Contract를 참조하는가
SELECT s.* FROM subscribers s LEFT JOIN contracts c ON s.contract_id = c.id WHERE c.id IS NULL;
```
두 쿼리 모두 0건이어야 조건 1·2 이행 완료로 판정합니다.

### 2.2 v2 보강 체크리스트 재확인 (P-01 ~ P-10)

Context Ledger §3의 "프로토타입 v2 보강 체크리스트"가 v2 보강의 범위이며, 리뷰어는 이를 설계 v3.0과 일치하는 것으로 재검증했습니다. 우선순위별 착수:

- **높음 (P-01 ~ P-05)**: 라우팅 + 로그인 3분할 + GNB 3변형 + 콘솔 홈 + 계약 셀렉터
- **중간 (P-06 ~ P-08)**: 기존 5화면 경로·권한 이식 + Mock 사용자 28명 + RoleGuard 스텁
- **낮음 (P-09 ~ P-10)**: 마스킹 데모 + TENANT_APPROVER placeholder

**수용 기준 재확인**: `npx serve ./dev` 단일 명령으로 5권한 드롭다운 전환과 3변형 GNB가 관찰 가능해야 함.

### 2.3 설계 문서 업데이트 범위 (조건 3·4 — 프로토타이퍼 또는 설계자 결정)

조건 3(경로 통일) 조건 4(SYS_OPS 대시보드)는 설계 문서 자체 수정이 필요합니다. 프로토타이퍼는 두 경로 중 하나를 택일:

| 옵션 | 실행 주체 | 장점 | 단점 |
|------|---------|------|------|
| A. 프로토타이퍼 직접 | 04-prototyper | 리뷰어 결정 즉시 반영, 대기 시간 없음 | 설계 문서 편집 권한 행사 |
| B. 설계자(01-architect) 재호출 | 01-architect | 설계 정본 권위 유지 | 병목 가능 |

**리뷰어 권고**: 옵션 A. Minor 수정 범위이며 v3.0 설계 방향과 모순되지 않음. 프로토타이퍼가 수정 시 dummy-data·feature-decomposition 문서 최상단 변경 이력에 "v3.1 — DQA-v3-001~004 해소" 기록만 남기면 추적성 확보.

### 2.4 미결 사항(OPEN) 가정 유지

OPEN-001~008: v1 가정 그대로 유지 — 추상화 레이어 설계가 변경 흡수.
OPEN-009~017: 사용자 컨펌으로 확정 상태 — 프로토타입 v2 전반에 반영.

### 2.5 TRD 기술 제약 유지

- **차트**: Apache ECharts — 변경 금지 (현 dev/ 이미 적용)
- **그리드**: AG Grid — 변경 금지 (현 dev/ 이미 적용)
- **디자인**: Shinhan Web Design System + Pretendard — 유지
- **GNB variant**: component-spec §1.1의 TypeScript Props 시그니처를 Mock 구현 시에도 동일 타입명 사용 (향후 구현 단계 이관 용이)

---

## 3. 설계자 전달 메모 (선택 — 설계 문서 소수 정정)

다음 항목은 구현 전까지만 해소되면 되므로 프로토타이퍼 단계에서 병행해도 무방합니다.

| 항목 | 파일 | 설명 |
|------|------|------|
| DQA-v3-005 | data-model.md §7.1 | 예시 10자로 교체 |
| DQA-v3-006 | api-spec.md §10.2 | 합계 산술 정정 |
| DQA-v3-007 | handoff-to-qa.md | 조치 분리 서술 |
| REV-v2-001 | data-model.md §5 | ROLE_VIEWER → TENANT_USER |

---

## 4. 승인 조건 이행 체크리스트

프로토타이퍼가 ④-a 사용자 컨펌 요청 시 아래 체크리스트 이행 상태를 report해 주시기 바랍니다:

- [ ] 조건 1 (필수): dummy-data §0.1 정본으로 §3/§5/§7/§11 Tenant ID·slug 통일
- [ ] 조건 2 (필수): dummy-data §0.2 정본으로 §5 ContractCode 접두사 통일
- [ ] 조건 3 (권장): feature-decomposition·screen-flow 화면 베이스 경로 `/subscribers` 통일
- [ ] 조건 4 (권장): feature-decomposition §3.1 SYS_OPS 시스템 대시보드 ✅
- [ ] 조건 5 (선택): Minor 3건 + REV-v2-001 문서 정리

**필수(조건 1·2) 미이행 상태로 사용자 컨펌 요청 시 ⑤ 프로토타입 QA 단계에서 FK 오류로 재회귀 위험 큼 — 반드시 이행 후 진행 권고.**

---

*본 피드백은 review/design/verdict.md v2.0의 부속 문서이며, design/* v3.0 + qa/design/design-qa-report.md v4.0 전수 재검증 결과를 반영합니다.*
