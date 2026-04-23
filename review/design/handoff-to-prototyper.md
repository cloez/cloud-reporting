# 핸드오프: 설계 리뷰어 → 프로토타이퍼 (회차 9)

> **일시**: 2026-04-16
> **From**: 03-design-reviewer (리뷰 v2.0 조건부 승인)
> **To**: 04-prototyper (프로토타입 v2 보강)
> **유형**: 정방향 (조건부 승인)
> **회차**: 9

이 문서 하나만 읽으면 프로토타이퍼가 **새 대화 세션에서도** 현재 상태·이행 조건·작업 범위를 완벽히 파악할 수 있도록 자급자족(self-contained) 형태로 작성되었습니다. 세부 사양은 각 참조 문서 링크를 따라 읽으세요.

---

## 0. TL;DR (90초 요약)

- **설계 v3.0 조건부 승인 통과**. 프로토타입 v2 보강 착수 가능.
- **현재 `dev/`는 v1 상태** (5개 화면, 단일 테넌트, 3권한). 멀티테넌트·5권한·계약 컨텍스트로 보강 필요.
- **작업 범위는 Context Ledger §3의 P-01~P-10 체크리스트**로 고정되어 있음.
- **반드시 먼저 처리할 2건 (조건 1·2)**: `design/dummy-data-spec.md`의 Tenant ID·슬러그(§0.1 ↔ §3) 및 ContractCode 접두사(§0.2 ↔ §5) 자기모순. **시드 생성 전 반드시 해소** — 미이행 시 FK 오류로 ⑤ QA에서 재회귀.
- **기술 제약 불변**: Shinhan Web Design System, Pretendard, Apache ECharts, AG Grid.
- **완료 기준**: `npx serve ./dev` 단일 명령에서 5권한 드롭다운 + GNB 3변형(`system` / `tenant-admin` / `tenant-user`)이 관찰 가능.
- **이후 단계**: 구현 → 사용자 컨펌 → ⑤ 프로토타입 QA.

---

## 1. 어디서 시작하는가 — 필수 읽기 목록

다음 문서를 **이 순서대로** 정독하십시오. 세션을 새로 열더라도 이 목록이면 충분합니다.

### 1.1 리뷰 산출물 (현재 단계 근거)
| # | 파일 | 읽는 이유 |
|---|------|---------|
| 1 | [review/design/verdict.md](../review/design/verdict.md) (v2.0) | 조건부 승인 판정 근거, 승인 조건 5건, 리뷰어 독립 평가 결과 |
| 2 | [review/design/feedback.md](../review/design/feedback.md) (v2.0) | 수정 항목 8건 표, 프로토타이퍼 전달 메모, FK 무결성 점검 쿼리 |

### 1.2 QA 보고서
| # | 파일 | 읽는 이유 |
|---|------|---------|
| 3 | [qa/design/design-qa-report.md](../qa/design/design-qa-report.md) (v4.0) | DQA-v3-001~007 원본 설명. 리뷰 판정과 1:1 대응 |

### 1.3 설계 문서 v3.0 (구현 바이블)
| # | 파일 | 읽는 이유 |
|---|------|---------|
| 4 | [design/feature-decomposition.md](../design/feature-decomposition.md) (v3.0) | F00~F11 기능, 권한 매트릭스, 경로 매핑 |
| 5 | [design/screen-flow.md](../design/screen-flow.md) (v3.0) | §3.1~§3.6 화면별 흐름, §4 5트랙 subgraph |
| 6 | [design/data-model.md](../design/data-model.md) (v3.0) | 19 엔티티, ERD, §6 RLS 정책 (프로토타입 Mock 구조 참조용) |
| 7 | [design/component-spec.md](../design/component-spec.md) (v3.0) | §1.1 GNB 3변형 Props, 컴포넌트 시그니처 |
| 8 | [design/api-spec.md](../design/api-spec.md) (v3.0) | §9-A/B/C 3트랙 라우팅 (프로토타입은 Mock이지만 URL은 정본) |
| 9 | [design/dummy-data-spec.md](../design/dummy-data-spec.md) (v3.0) | 시드 데이터 규칙 — **수정 대상** (조건 1·2) |
| 10 | [design/handoff-to-qa.md](../design/handoff-to-qa.md) (v3.0) | v3.0 변경 요약표 — 빠른 맥락 파악용 |

### 1.4 프로젝트 컨텍스트
| # | 파일 | 읽는 이유 |
|---|------|---------|
| 11 | [docs/context-ledger.md](../docs/context-ledger.md) (v0.5) | 전체 파이프라인 상태, §3 프로토타입 v2 보강 체크리스트(P-01~P-10), §8 OPEN-009~017 |
| 12 | [docs/brd.md](../docs/brd.md) (v1.1) | 비즈니스 요구사항 |
| 13 | [CLAUDE.md](../CLAUDE.md) | 프로젝트 규칙, 기술 제약 (변경 금지 항목) |
| 14 | [agents/04-prototyper.md](../agents/04-prototyper.md) | 에이전트 지침 (Phase 1~4, 컨펌 절차) |

### 1.5 현재 프로토타입 (v1 기준선)
| # | 파일 | 읽는 이유 |
|---|------|---------|
| 15 | [dev/index.html](../dev/index.html), [dev/app.js](../dev/app.js), [dev/styles.css](../dev/styles.css), [dev/data.js](../dev/data.js) | 기존 5화면 코드 — 경로·권한만 교체해 이식 |
| 16 | [prototype/screen-inventory.md](../prototype/screen-inventory.md), [prototype/ux-decisions.md](../prototype/ux-decisions.md) | 기존 UX 결정 이력 |

---

## 2. 현재 상태 스냅샷

### 2.1 파이프라인
```
[요구사항] → ① 설계 ✅ (v3.0) → ② 설계QA ✅ (v4.0 PASS)
→ ③ 설계리뷰 ✅ (v2.0 조건부 승인) ← 여기서 인계
→ ④ 프로토타입 ⏳ (v1 완료, v2 보강 착수 대기)  ← 당신의 작업
→ ④-a 사용자컨펌 ⏳ → ⑤ QA → ⑥ 리뷰 → ⑦ 구현 → ...
```

### 2.2 회귀 이력 (왜 v3.0까지 왔는가)
| 회차 | 사건 |
|------|------|
| 1~6 | v1 설계 → QA → 리뷰 → 프로토타입 (5화면 3권한 단일 테넌트) → 사용자 컨펌 단계 |
| 7 | 🔙 **REG-002 설계회귀**: 사용자 요구로 멀티테넌트·5권한·계약/계정 계층·`/t/{slug}` 라우팅 도입. v2.0 설계 착수 |
| 8~9 | v2.0 QA FAIL(add-on 회귀 패턴) → v3.0 회귀 → v4.0 QA PASS → 본 리뷰 조건부 승인 |

**시사점**: 당신은 v1 프로토타입을 "삭제 후 재작성"이 아니라 **v2 경로·5권한으로 이식**하는 작업을 수행. 기존 5화면 UI는 재사용 가능, GNB·라우팅·Mock 사용자만 교체.

### 2.3 설계 v3.0의 핵심 변경 (v1 대비)

| 영역 | v1 | v3.0 (현재) |
|------|-----|-----------|
| 테넌트 | 단일 | 멀티 (`TENANT` 엔티티, CHAR(10) PK, slug) |
| 권한 | 3개 (OPS / VIEWER / ADMIN) | **5개** (SYS_ADMIN / SYS_OPS / TENANT_ADMIN / TENANT_APPROVER / TENANT_USER) |
| 라우팅 | `/login`, `/dashboard`, `/upload`, `/reports`, `/subscriptions`, `/admin/users` | 3트랙: `/admin/*` (시스템) / `/t/{slug}/admin/*` (테넌트 관리) / `/t/{slug}/c/{contractId}/*` (테넌트 사용자) |
| 계층 | 사용자 → 리포트 | TENANT → CONTRACT → CLOUD_ACCOUNT(Payer) → CLOUD_SUB_ACCOUNT(Linked) → COST_DATA |
| 권한 최소 단위 | 부서(tag) | SubAccount (TENANT_USER_SCOPE) |
| GNB | 단일 | 3변형 (`variant: system / tenant-admin / tenant-user`) |
| 템플릿 가시성 | TEMPLATE_ROLE_ACCESS 엔티티 | `RoleTemplateMatrix` 코드 상수 |
| 격리 | 없음 | PostgreSQL RLS (`SET LOCAL app.tenant_id/role/user_id`) — 프로토타입은 Mock 필터 |

---

## 3. 승인 조건 (반드시 이행) ⚠️

아래 5건이 승인 조건입니다. **필수 2건**은 시드 생성 전 반드시 해소해야 하며, 미이행 시 ⑤ QA에서 FK 오류로 재회귀 위험이 큽니다.

### 조건 1 [필수·시드 생성 전] DQA-v3-001: Tenant ID / 슬러그 통일

**문제**: `design/dummy-data-spec.md` 내부에 자기모순이 있음.

| 위치 | 현재 값 |
|------|--------|
| §0.1 Tenant 테이블 (정본 후보) | `AD000001K3 / shinhan-card`, `AD000002L9 / shinhan-life`, `AD000003M2 / shinhan-internal` |
| §3 User 테이블 | `AD00000AK7 / shinhan-card`, `AD00001BL4 / shinhan-life`, `AD00002CM1 / ds-internal` |
| §5 Subscriber | `AD00000AK7`, `AD00001BL4`, `AD00002CM1` |
| §7 DownloadLog | 동일 |

**조치**: §0.1을 정본으로 채택 → §3/§5/§7/§11의 `tenant_id` 값을 `AD000001K3 / AD000002L9 / AD000003M2`으로 일괄 치환. 슬러그는 `shinhan-internal` 유지(`ds-internal` 폐기).

**영향 받는 곳**:
- `design/dummy-data-spec.md` §3/§5/§7/§11 직접 수정
- `dev/data.js` (Mock store) — 시드 생성 시 정본 값 사용

### 조건 2 [필수·시드 생성 전] DQA-v3-002: ContractCode 접두사 통일

**문제**: `design/dummy-data-spec.md` 내 Contract 접두사 충돌.

| 위치 | 현재 값 |
|------|--------|
| §0.2 Contract (정본) | `SHC-2026-001`, `SHL-2026-001`, `SDS-2026-001` |
| §5 Subscriber | `SHC-…`, `SLF-…`, `DSC-…` ← 후자 2개 충돌 |

**조치**: `SLF-` → `SHL-`, `DSC-` → `SDS-`로 교체. Subscriber 60건 전수 검토.

**근거**: `design/data-model.md` §7.3 "`{tenantSlug 약어 3-5자 대문자}-{YYYY}-{SEQ}`" 규칙상 §0.2가 정본.

### 조건 3 [권장·프로토타입 병행] DQA-v3-003: `/subscribers` 경로 통일

**문제**: 화면 베이스 경로 표기 혼재.

| 위치 | 현재 |
|------|------|
| `feature-decomposition.md` §5.3 FR-05-02 | `(/subscriptions)` |
| `screen-flow.md` §3.5 제목 | `/subscribers` (정본) |
| `screen-flow.md` §3.5 다이어그램 | `SUBS["/c/{contractId}/subscriptions"]` (혼재) |
| `api-spec.md` §9-C (정본) | `/subscribers` (CRUD) + `/subscriptions/*` (서브리소스 logs/schedule/trigger) |

**조치**:
- 화면 베이스 경로를 `/subscribers`로 통일
- `feature-decomposition.md` §5.3 라벨 `/subscriptions` → `/subscribers`
- `screen-flow.md` 다이어그램 `SUBS["/c/{contractId}/subscriptions"]` → `SUBS["/c/{contractId}/subscribers"]`
- 발송 이벤트 서브리소스 `/subscriptions/logs|schedule|trigger`는 유지

### 조건 4 [권장·설계자 판단] DQA-v3-004: SYS_OPS 시스템 대시보드 ✅

**문제**: 권한 매트릭스 엇갈림.

| 위치 | SYS_OPS 시스템 대시보드 |
|------|----------------------|
| `component-spec.md` §1.1 GNB 매트릭스 (정본) | ✅ |
| `feature-decomposition.md` §3.1 | ❌ |
| `feature-decomposition.md` §2 본문 | "SYS_ADMIN / SYS_OPS 시스템 대시보드에서 전 테넌트 KPI 요약" (✅ 암시) |

**조치**: `feature-decomposition.md` §3.1의 `SYS_OPS 시스템 대시보드 ❌` → `✅`로 교체.

**근거**:
1. §2 본문과 자연 정합
2. SYS_OPS는 RLS bypass + AUDIT_LOG 의무 기록이 이미 설계됨 — 접근 차단 필요 없음
3. SYS_OPS가 업로드 KPI를 볼 수단이 필요

### 조건 5 [선택·구현 전] Minor 3건 + REV-v2-001 문서 정리

| ID | 위치 | 수정 |
|----|------|------|
| DQA-v3-005 | `data-model.md` §7.1 | 예시 `ADKK00000AK7` (12자) → `AD000001K3` (10자) |
| DQA-v3-006 | `api-spec.md` §10.2 | 제목 "18개" ↔ 세부합 22 불일치. `5(+4)` 혼합 표기 풀어서 재집계 |
| DQA-v3-007 | `handoff-to-qa.md` DQA-v2-011 행 | 두 조치(§2.7 중복 해소 + §10→§11) 분리 서술 |
| REV-v2-001 | `data-model.md` §5 | `idx_cost_account_dept` 설명 `ROLE_VIEWER` → `TENANT_USER` |

### 3.6 이행 주체 권고

**리뷰어 권고는 옵션 A: 프로토타이퍼가 직접 dummy-data-spec 수정** (설계자 재호출 없이). 근거:
- Minor 편집 수준이며 v3.0 방향과 모순 없음
- 설계자 병목 회피
- 수정 시 해당 문서 최상단에 `v3.1 — DQA-v3-001~004 해소 (2026-04-16, 04-prototyper)` 이력만 남기면 추적성 확보

조건 1·2·5는 프로토타이퍼가 직접 수정 권장. 조건 3·4는 설계자에게 확인 메시지 후 본인 또는 설계자가 반영.

---

## 4. 작업 범위 — 프로토타입 v2 보강 체크리스트 (P-01 ~ P-10)

Context Ledger §3에서 확정된 체크리스트. **설계 v3.0과 1:1 매핑되어 있으므로 범위 확장 금지**.

| # | 범위 | 내용 | 우선순위 | 참조 |
|---|------|------|---------|------|
| P-01 | 라우팅 | 해시 라우터에 v2 경로 도입 — `/admin/login`, `/t/{slug}/login`, `/admin/*`, `/t/{slug}/admin/*`, `/t/{slug}/c/{contractId}/*` | **높음** | screen-flow §3.1~§3.6 |
| P-02 | 로그인 화면 | 3분할 로그인(시스템 / 테넌트 선택 → 로그인) 신규 추가 | **높음** | screen-flow §3.1 |
| P-03 | GNB 3변형 | `variant: system / tenant-admin / tenant-user` Mock 전환 로직 + ContractSelector + MixedCurrencyBadge + MaskedSumIndicator | **높음** | component-spec §1.1 |
| P-04 | 콘솔 홈 | 시스템 콘솔 홈(`/admin`) + 테넌트 콘솔 홈(`/t/{slug}/admin`) 신규 화면 2종 | **높음** | screen-flow §3.2 |
| P-05 | 계약 셀렉터 | GNB ContractSelector + "전체" 가상 컨텍스트 + localStorage 영속 | **높음** | OPEN-016 |
| P-06 | 기존 5화면 | 대시보드·업로드·리포트·구독·사용자관리를 v2 경로·5권한 반영으로 이식 | 중간 | dev/* 재활용 |
| P-07 | Mock 사용자 | dummy-data §3 반영 — 시스템 4 + 테넌트 24(3테넌트×8명) 시드. **조건 1 적용 후** | 중간 | dummy-data-spec §3 |
| P-08 | RoleGuard | 5권한 × 경로 이중 검증 로직 데모 스텁 (JWT 없이 Mock role 전환) | 중간 | screen-flow §4 |
| P-09 | 마스킹 데모 | TenantUserScope 기반 서브계정 단위 마스킹 + MaskedSumIndicator 시각화 | 낮음 | data-model §6.5 |
| P-10 | 승인자 placeholder | TENANT_APPROVER 빈 화면 placeholder | 낮음 | OPEN-017 |

### 4.1 수용 기준 (사용자 컨펌 시 체크 포인트)
- [ ] `npx serve ./dev` 단일 명령 실행
- [ ] 5권한 전환 드롭다운으로 SYS_ADMIN / SYS_OPS / TENANT_ADMIN / TENANT_APPROVER / TENANT_USER 시나리오 모두 관찰 가능
- [ ] GNB 3변형이 경로에 따라 자동 전환(`/admin` → system, `/t/{slug}/admin` → tenant-admin, `/t/{slug}/c/{id}` → tenant-user)
- [ ] ContractSelector에서 계약 선택 후 URL이 `/c/{contractId}`로 반영되고 새로고침 시 localStorage로 복원
- [ ] Mock 사용자 28명이 설계 v3.0 정본(§0.1 Tenant ID)과 일치
- [ ] 승인 조건 1·2가 반영되어 Mock FK 무결성 검증 통과 (§7.2 쿼리)

### 4.2 범위 외 (건드리지 말 것)
- ⛔ 실제 JWT/Spring Security 구현 — Mock role 전환만
- ⛔ 실제 PostgreSQL RLS — Mock 필터 함수로 시뮬레이션만
- ⛔ Azure/GCP 프로바이더 UI — AWS-only MVP (OPEN-013)
- ⛔ CUR S3 Pull — MANUAL_UPLOAD만 (OPEN-014)
- ⛔ 설계 범위 밖 신규 화면/기능 추가

---

## 5. 기술 제약 (변경 금지)

`CLAUDE.md` §핵심 기술 제약 재확인:

| 항목 | 내용 | 비고 |
|------|------|------|
| 차트 | **Apache ECharts** (CDN) | 임의 변경 금지. shinhanPalette 적용 필수 |
| 그리드 | **AG Grid** (CDN) | 임의 변경 금지. `.ag-theme-alpine` + Shinhan 오버라이드 |
| 디자인 | **Shinhan Web Design System** (TRD 2절) | `--sh-blue-primary: #0046FF` 등 CSS 토큰 |
| 폰트 | **Pretendard** (CDN @import) | |
| 색상 | `#0046FF` / `#0076FF` / `#002D85` 등 | TRD 2.3 전체 토큰 |
| UX Writing | 버튼 명사형 4글자 이내, '~하기' 남용 금지, 능동형 안내 (TRD 2.8) | |
| 통화 포맷 | `1,234,567원` (세 자리 쉼표) | |
| 날짜 포맷 | `YYYY.MM.DD` (표시), `YYYY-MM-DD` (데이터) | |
| 시큐어코딩 | `innerHTML` 사용 시 DOMPurify, 외부 입력 XSS 방지 | |

### 5.1 신규 컴포넌트 타입 시그니처 (component-spec §1.1 / §11)

```ts
// GNB 3변형
type GNBVariant = 'system' | 'tenant-admin' | 'tenant-user';
interface GNBProps {
  variant: GNBVariant;
  userInfo: UserInfo;
  // variant === 'tenant-user' 시 필요
  contractSelector?: ContractSelectorProps;
  mixedCurrencyBadge?: boolean;
  maskedSumIndicator?: { visible: number; total: number };
}

// 5권한
type Role = 'ROLE_SYS_ADMIN' | 'ROLE_SYS_OPS' | 'ROLE_TENANT_ADMIN' | 'ROLE_TENANT_APPROVER' | 'ROLE_TENANT_USER';
```

Vanilla JS 구현 시에도 변수명·속성명은 위 타입과 동일하게 유지 (향후 구현 단계 이관 용이).

---

## 6. 라우팅 규약 (screen-flow §3 / api-spec §9)

### 6.1 3트랙 URL

| 트랙 | 진입 URL | variant | 대상 역할 |
|------|---------|---------|---------|
| 시스템 | `/admin/login` → `/admin/*` | `system` | SYS_ADMIN, SYS_OPS |
| 테넌트 관리 | `/t/{slug}/login` → `/t/{slug}/admin/*` | `tenant-admin` | TENANT_ADMIN |
| 테넌트 사용자 | `/t/{slug}/login` → `/t/{slug}/c/{contractId}/*` | `tenant-user` | TENANT_USER, TENANT_APPROVER |

### 6.2 화면 ↔ 경로 매핑 (프로토타입 핵심 화면)

| 화면 | v2 경로 | 권한 |
|------|--------|------|
| 시스템 콘솔 홈 | `/admin` | SYS_ADMIN, SYS_OPS |
| 시스템 대시보드 | `/admin/dashboard` | SYS_ADMIN, **SYS_OPS** (조건 4 반영 후) |
| 시스템 사용자 관리 | `/admin/users` | SYS_ADMIN |
| CUR 업로드 (Payer) | `/admin/ops/uploads` | SYS_OPS |
| 컬럼 별칭 관리 | `/admin/ops/aliases` | SYS_OPS |
| 테넌트 콘솔 홈 | `/t/{slug}/admin` | TENANT_ADMIN |
| 테넌트 사용자 관리 | `/t/{slug}/admin/users` | TENANT_ADMIN |
| 계약 관리 | `/t/{slug}/admin/contracts` | TENANT_ADMIN |
| 권한 위임 | `/t/{slug}/admin/scopes` | TENANT_ADMIN |
| 대시보드 | `/t/{slug}/c/{contractId}/dashboard` | TENANT_USER, TENANT_ADMIN |
| 리포트 라이브러리 | `/t/{slug}/c/{contractId}/reports` | TENANT_USER, TENANT_ADMIN |
| 구독 관리 | `/t/{slug}/c/{contractId}/subscribers` (조건 3 반영 후) | TENANT_ADMIN, TENANT_USER |
| 승인함 placeholder | `/t/{slug}/approvals` | TENANT_APPROVER |

### 6.3 해시 라우팅 구현 힌트
기존 `dev/app.js`가 해시 라우터라면 `#/admin/dashboard`, `#/t/shinhan-card/c/1/dashboard` 형태로 이식. 진입 시 URL 분석 → `variant` 결정 → GNB render.

---

## 7. 시드 생성 가이드

### 7.1 Mock 사용자 28명 (dummy-data §3)

조건 1 반영 후:

```js
const tenants = [
  { id: 'AD000001K3', slug: 'shinhan-card', name: '신한카드' },
  { id: 'AD000002L9', slug: 'shinhan-life', name: '신한라이프' },
  { id: 'AD000003M2', slug: 'shinhan-internal', name: '신한DS 내부' },
];

const users = [
  // 시스템 사용자 4명 (tenantId = null)
  { id: 1, username: 'sys-admin',  role: 'ROLE_SYS_ADMIN', tenantId: null },
  { id: 2, username: 'sys-admin2', role: 'ROLE_SYS_ADMIN', tenantId: null },
  { id: 3, username: 'sys-ops1',   role: 'ROLE_SYS_OPS',   tenantId: null },
  { id: 4, username: 'sys-ops2',   role: 'ROLE_SYS_OPS',   tenantId: null },
  // 테넌트별 8명 × 3 = 24명 (tenantId = §0.1 정본)
  { id: 5, username: 'sh-admin',    role: 'ROLE_TENANT_ADMIN',    tenantId: 'AD000001K3' },
  // ... (28번까지)
];
```

### 7.2 FK 무결성 검증 (시드 로드 직후 실행)

Mock store에 대해 다음과 동등한 검증을 실행. 두 쿼리 모두 0건이어야 조건 1·2 이행 완료.

```js
// 모든 User가 존재하는 Tenant를 참조하는가
const orphanUsers = users.filter(u => u.tenantId && !tenants.find(t => t.id === u.tenantId));
console.assert(orphanUsers.length === 0, '조건 1 미이행: ', orphanUsers);

// 모든 Subscriber가 존재하는 Contract를 참조하는가
const orphanSubs = subscribers.filter(s => !contracts.find(c => c.code === s.contractCode));
console.assert(orphanSubs.length === 0, '조건 2 미이행: ', orphanSubs);
```

### 7.3 Role 전환 드롭다운 Mock

GNB 좌측에 역할 전환 드롭다운 추가. 선택 시 `localStorage.currentUserId` 저장 → `app.js`가 해당 user의 `role`·`tenantId`·`scope`를 기반으로 variant·권한 필터링.

---

## 8. 의사결정 시 참조

### 8.1 미결 사항 가정 (docs/context-ledger.md §8)
- **OPEN-009~017**: 사용자 컨펌으로 확정됨 — 프로토타입에 반영 필수
- **OPEN-001~008**: v1 가정 유지 — 추상화 레이어 설계가 변경 흡수

### 8.2 확정된 핵심 결정
- AWS-only MVP (provider=AWS 고정, 모델은 확장 가능)
- 조회 단위 = 계약 (URL `/c/{contractId}` + "전체" 가상 컨텍스트)
- 권한 최소 단위 = SubAccount (TENANT_USER_SCOPE)
- SSO 미적용, JWT LOCAL 기본
- CUR 수집 = 수동 업로드 (MVP)
- 승인자 기능 = placeholder (메뉴만)

### 8.3 사용자 피드백 처리 절차 (agents/04-prototyper.md §맥락 유지)
1. 피드백 접수 → 변경 분류
   - UI 미세조정 → 코드만, §4-b 간략 기록
   - 기능/데이터 변경 → **영향 분석 필수**
2. `design/dummy-data-spec.md` 등 프로토타이퍼 권한 내 문서는 직접 수정
3. `design/data-model.md`, `design/component-spec.md` 등 설계자 권한 문서는 §8 OPEN 등록 + 핸드오프 명시
4. `docs/context-ledger.md` §4-b에 처리 결과 기록

---

## 9. 산출물 (완료 기준)

### 9.1 코드 (`dev/`)
```
dev/
├── index.html          # 3트랙 라우팅 + 5화면 + 콘솔 홈 2종 + 로그인 3분할
├── app.js              # 라우터, RoleGuard, 변형 GNB 전환, localStorage
├── data.js             # §0.1 정본 기반 Tenant/Contract/User/SubAccount 시드
└── styles.css          # Shinhan DS 토큰 유지 + variant별 GNB 스타일
```

### 9.2 문서 (`prototype/`)
- `screen-inventory.md`: 구현 화면 목록 (기존 5 + 신규 로그인/콘솔 홈 2) 업데이트
- `ux-decisions.md`: v2 보강 시 UX 결정 기록 (GNB 변형 전환 애니메이션, ContractSelector 위치, 마스킹 시각화 방식 등)

### 9.3 Context Ledger 업데이트
- §3 진행 현황: ④ 프로토타입을 완료로 전환
- §4-b: 사용자 수정 요청 추적 (해당 시)
- §5 아티팩트 인벤토리: dev/* 버전 업데이트
- §9 핸드오프: → 05-prototype-qa 핸드오프 추가

### 9.4 사용자 리뷰 (`docs/user-review-prototype.md`)
사용자 컨펌 시점에 `docs/user-review-template.md` 기반으로 원본 저장.

---

## 10. 사용자 컨펌 요청 템플릿

v2 보강 완료 후 사용자에게 아래 형식으로 컨펌 요청:

```markdown
## 프로토타입 v2 보강 완료 — 사용자 컨펌 요청

**실행**: 프로젝트 루트에서 `npx serve ./dev` → 브라우저에서 열기

**확인 시나리오** (승인 조건 이행 확인):
1. [ ] 시스템 로그인 → SYS_ADMIN 선택 → `/admin/dashboard` 접근 확인
2. [ ] 시스템 로그인 → SYS_OPS 선택 → `/admin/dashboard` 접근 확인 (조건 4)
3. [ ] SYS_OPS → `/admin/ops/uploads` CUR 업로드 화면 확인
4. [ ] 테넌트 로그인 → shinhan-card(AD000001K3) TENANT_ADMIN → `/t/shinhan-card/admin/contracts` 접근 확인
5. [ ] TENANT_USER → 계약 선택 → `/t/shinhan-card/c/1/dashboard` 대시보드 확인
6. [ ] ContractSelector에서 계약 변경 시 URL 반영 + 새로고침 후 복원 확인
7. [ ] 구독 관리 URL이 `/subscribers`인지 확인 (조건 3)
8. [ ] 마스킹 시나리오: TENANT_USER가 일부 SubAccount만 권한 가진 경우 `가시 합계 vs 전체 합계` 표기 확인
9. [ ] TENANT_APPROVER 로그인 시 승인함 placeholder 화면 확인

**승인 조건 이행 상태**:
- [x] 조건 1 (필수): dummy-data §0.1 정본으로 통일 완료
- [x] 조건 2 (필수): ContractCode 접두사 SHC/SHL/SDS 통일 완료
- [x] 조건 3 (권장): 화면 베이스 경로 `/subscribers` 통일 완료
- [x] 조건 4 (권장): SYS_OPS 시스템 대시보드 ✅ 확정 완료
- [ ] 조건 5 (선택): Minor 3건은 구현 전까지 해소 예정

피드백은 `docs/user-review-template.md` 양식으로 작성 부탁드립니다.
```

---

## 11. 다음 단계 (⑤ 프로토타입 QA 핸드오프 초안)

사용자 컨펌 완료 후 아래 형식으로 ⑤ QA에 인계:

```
## 핸드오프: 프로토타이퍼 → 프로토타입 QA
메타: [일시] / 04-prototyper / 회차 10 / 정방향
사용자 컨펌 완료: ✅ ([일시])
구현 화면 수: [N]개 (기존 5 + 신규 로그인 3분할 + 시스템 콘솔 홈 + 테넌트 콘솔 홈 + 승인함 placeholder)
승인 조건 이행:
  - 조건 1 ✅ / 조건 2 ✅ / 조건 3 [✅/⚠️] / 조건 4 [✅/⚠️] / 조건 5 [완료/보류]
미반영 사항: [§8 OPEN 등록 항목 요약]
QA 지시:
  - dev/ 전체 검토
  - Shinhan 디자인 토큰 적용 여부 확인
  - Apache ECharts shinhanPalette 적용 확인
  - AG Grid 테마 오버라이드 확인
  - FK 무결성 (조건 1·2) 검증 — §7.2 쿼리 수행
  - 5권한 × 경로 이중 검증 로직 확인 (P-08)
  - GNB 3변형 전환 정확성 확인
전달: dev/*, prototype/*, docs/context-ledger.md, docs/user-review-prototype.md
```

---

## 12. 빠른 참조 (치트 시트)

| 질문 | 대답 |
|------|------|
| 어떤 문서부터 읽어야 하나? | §1의 15개 문서, 특히 verdict.md v2.0 + feedback.md v2.0 |
| 뭘 만들어야 하나? | `dev/` 내 P-01~P-10 체크리스트 10건 |
| 뭘 고쳐야 하나? | `design/dummy-data-spec.md` §3/§5/§7/§11 (조건 1·2 필수) |
| 차트 라이브러리? | Apache ECharts (⛔ 변경 금지) |
| 그리드 라이브러리? | AG Grid (⛔ 변경 금지) |
| 디자인 시스템? | Shinhan Web Design System (⛔ 변경 금지) |
| 권한 모델? | 5개 (SYS_ADMIN/SYS_OPS/TENANT_ADMIN/TENANT_APPROVER/TENANT_USER) |
| 라우팅? | 3트랙 (`/admin/*`, `/t/{slug}/admin/*`, `/t/{slug}/c/{contractId}/*`) |
| GNB? | 3변형 (`variant: system/tenant-admin/tenant-user`) |
| Mock 사용자 수? | 28명 (시스템 4 + 테넌트 24) |
| 완료 기준? | `npx serve ./dev` + 5권한 드롭다운 + 3변형 GNB + 사용자 컨펌 |
| 다음 에이전트? | 05-prototype-qa (사용자 컨펌 완료 후) |

---

*본 핸드오프는 review/design/verdict.md v2.0 + feedback.md v2.0의 요약 진입점 문서입니다. 상세 판정 근거는 원본 문서를 참조하십시오.*
*작성자: 03-design-reviewer / 2026-04-16*
