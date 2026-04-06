# 설계 QA 보고서 — 클라우드 비용 리포팅 자동화

> **검토자**: 02-design-qa  
> **검토일**: 2026-04-06 (재검토 — 회차 2)  
> **검토 대상**: design/* (v1.1~v1.2, QA 회귀 반영본)  
> **판정**: ✅ PASS → 03-design-reviewer.md

---

## 0. 회귀 이력

| 회차 | 판정 | 사유 |
|------|------|------|
| 1 | ❌ FAIL | Critical 1 / High 2 / Major 2 / Minor 4 (총 9건) |
| **2 (본건)** | **✅ PASS** | **이전 9건 전수 해소, 신규 Critical·High 없음** |

---

## 1. 요구사항 커버리지 매트릭스

| BRD 기능 | 기능분해 | 화면흐름 | 데이터모델 | 컴포넌트 | API |
|---------|---------|---------|----------|---------|-----|
| 데이터 업로드·검증 | ✅ F01 | ✅ §3.3 | ✅ BATCH+SHEET+COST_DATA | ✅ §2 (5개) | ✅ §3 (6개) |
| 템플릿 선택 (리포트 라이브러리) | ✅ F02 | ✅ §3.4 | ✅ REPORT_TEMPLATE | ✅ §3 (3개) | ✅ §4 (2개) |
| 리포트 생성 (Excel) | ✅ F03 | ✅ §3.4 모달 | ✅ REPORT_FILE+COST_DATA | ✅ §3-b+§6 (6개) | ✅ §5 (6개) |
| 팝업 상세·즉시 다운로드 | ✅ F04 | ✅ §3.4 | ✅ DOWNLOAD_LOG | ✅ §4 (4개) | ✅ §5 |
| 구독 발송 (자동 스케줄) | ✅ F05 | ✅ §3.5 | ✅ SUBSCRIBER+SUB_LOG | ✅ §5 (5개) | ✅ §6 (7개) |
| 목적별 필터링·검색 | ✅ F06 | ✅ §3.4 | ✅ 쿼리 기반 | ✅ §9.5 (5개) | ✅ 쿼리 파라미터 |
| 스키마 검증 UI (Phase 2) | ✅ §6 명시 | — | — | — | — |
| Audit Log (Phase 2) | ✅ §6 명시 | — | ✅ DOWNLOAD_LOG | — | — |
| 추가 리포트 7~12 (이후) | ✅ §6 명시 | — | — | — | — |

**커버리지**: MVP 6/6 (100%), Phase 2/이후 명시: 4/4 (100%)

---

## 2. 논리적 일관성 검증 결과

| 검증 항목 | 결과 | 비고 |
|----------|------|------|
| 데이터모델 ↔ 기능분해 | ✅ | COST_DATA 추가로 Aggregation Engine 데이터 원천 해소 |
| 데이터모델 ↔ 화면흐름 | ✅ | 대시보드 KPI·추이·Top N 모두 COST_DATA 기반 집계 가능 |
| 기능분해 ↔ 화면흐름 | ✅ | F00 대시보드 기능 분해 추가, 화면흐름과 일관 |
| 컴포넌트 ↔ 화면흐름 | ✅ | ReportGenerateForm, GenerationProgressIndicator Props 정의 완료 |
| API ↔ 기능분해 | ✅ | COST_DATA 기반 집계로 배치 종속성 제거, trigger/generate 일관 |
| RBAC ↔ BRD 역할 | ✅ | 3개 역할 × 화면/기능 일관, VIEWER 부서 필터 COST_DATA.tag_department 기반 |

---

## 3. 완성도 검증 결과

| 검증 항목 | 결과 | 비고 |
|----------|------|------|
| ERD: 관계 명시 | ✅ | 13개 엔티티, 1:N·M:N 관계 명확, COST_DATA 1:N 추가 |
| ERD: 필드 타입 | ✅ | 전체 필드 타입·제약 조건 정의 |
| 컴포넌트 Props | ✅ | 주요·공통·하위 컴포넌트 전수 정의 (§1~§9) |
| 상태 관리 | ✅ | 전역(AuthContext, ToastContext) / 로컬(useState) / 서버(캐싱·폴링) 구분 명시 |
| 더미 데이터 스펙 | ✅ | 9종 엔티티 (COST_DATA 8,000건+ 추가), 참조 무결성 |
| 인덱스 설계 | ✅ | 13개 인덱스 (COST_DATA 5개 추가) |
| NFR 추적 | ✅ | NFR-01~06 설계 반영 위치 명시, NFR-05 모니터링 상세 |
| 원본 FR ID 추적성 | ✅ | FR-01~05, NFR-01~06 → 설계 커버리지 전수 매핑 (§7) |

---

## 4. TRD 기술 제약 검증

- [x] Apache ECharts 지정 — §6에 6개 차트 컴포넌트 (CostTrend, ServiceBreakdown+파레토, ProductRegionPareto, Region, TagTreemap + 공통 설정)
- [x] AG Grid 지정 — §7에 공통 Props + Shinhan 테마 오버라이드
- [x] Claude API 서버사이드 전용 — API에 프론트엔드 호출 경로 없음
- [x] OpenAPI/Swagger 자동 문서화 — `/swagger-ui` 경로 + springdoc-openapi 명시
- [x] Shinhan Web Design System 토큰 — 전체 컴포넌트 CSS 변수 토큰 적용
- [x] JWT 인증 가정 명시 — Access 30분 + Refresh 7일 (OPEN-005)
- [x] Docker 컨테이너 기반 — Context Ledger에 명시
- [x] 성능 요구사항 — AG Grid Virtual Scroll, 비동기 처리, 3초 폴링

---

## 5. 이전 QA 이슈 해소 상태

| ID | 심각도 | 설명 | 해소 | 반영 위치 |
|----|--------|------|------|----------|
| DQA-001 | 🔴 Critical | COST_DATA 엔티티 누락 | ✅ | data-model §2.6, ERD, 인덱스 5개, dummy-data §9 |
| DQA-002 | 🟠 High | 구독 발송 배치 선택 로직 미정의 | ✅ | api-spec §5 batchId 제거, §6 COST_DATA 기반 집계 명시 |
| DQA-003 | 🟠 High | 대시보드 기능 분해 누락 | ✅ | feature-decomposition F00 추가, KPI 산출·필터 로직 포함 |
| DQA-004 | 🟡 Major | ReportGenerateForm, GenerationProgressIndicator Props 미정의 | ✅ | component-spec §3-b (2개 컴포넌트 상세 정의) |
| DQA-005 | 🟡 Major | Phase 2/이후 기능 명시 부족 | ✅ | feature-decomposition §6 (4개 기능 Phase 구분 명시) |
| DQA-006 | 🟢 Minor | 보조 공통 컴포넌트 Props 미정의 | ✅ | component-spec §9.1~§9.4 |
| DQA-007 | 🟢 Minor | FilterBar 하위 컴포넌트 Props 미정의 | ✅ | component-spec §9.5 (5개 하위 컴포넌트) |
| DQA-008 | 🟢 Minor | 비밀번호 변경 API 누락 | ✅ | api-spec §9 POST /auth/change-password (총 36개) |
| DQA-009 | 🟢 Minor | 상태 관리 전략 미기술 | ✅ | component-spec §10 (전역/로컬/서버 상태 구분) |

**9건 전수 해소 완료**

---

## 6. 신규 발견 이슈

| ID | 심각도 | 유형 | 위치 | 설명 | 조치 권고 |
|----|--------|------|------|------|----------|
| DQA-010 | 🟡 Major | 데이터모델 ↔ API 불일치 | data-model §2.8 ↔ api-spec §5 | REPORT_FILE.batch_id가 FK NOT NULL로 유지되나, POST /reports/generate에서 batchId가 제거되어 COST_DATA 기반 집계로 전환됨. 여러 배치에서 온 COST_DATA로 리포트 생성 시 batch_id 결정 로직이 불명확. | 1) batch_id를 nullable로 변경 (COST_DATA 기반 생성 시 null 허용), 또는 2) "해당 yearMonth의 최신 COMPLETED 배치 자동 선택" 로직을 api-spec에 명문화 |
| DQA-011 | 🟢 Minor | 문서 표기 | feature-decomposition.md | §7이 두 개 ("비기능 요구사항 추적"과 "원본 FR ID → 설계 커버리지 요약") — 섹션 번호 중복 | §7, §8로 분리 |
| DQA-012 | 🟢 Minor | 문서 표기 | data-model.md | §2.7이 두 개 (REPORT_TEMPLATE과 TEMPLATE_ROLE_ACCESS) — 엔티티 번호 중복 | §2.7, §2.8로 재정렬 (이후 번호 시프트) |
| DQA-013 | 🟢 Minor | 문서 표기 | dummy-data-spec.md | §10이 두 개 ("원천 데이터 샘플"과 "데이터 생성 우선순위") — 섹션 번호 중복 | §10, §11로 분리 |

---

## 7. 집계 및 판정

| 심각도 | 1차 (해소) | 신규 | 최종 잔여 |
|--------|-----------|------|----------|
| 🔴 Critical | 1 → 0 | 0 | **0** |
| 🟠 High | 2 → 0 | 0 | **0** |
| 🟡 Major | 2 → 0 | 1 | **1** |
| 🟢 Minor | 4 → 0 | 3 | **3** |
| **합계** | **9 → 0** | **4** | **4** |

### 판정: ✅ **PASS**

**근거**: Critical 0건, High 0건 — 회귀 조건 미충족 (Critical 1건+ 또는 High 3건+ 시 회귀)

**행선지**: → **03-design-reviewer.md**

**리뷰어 주의사항**:
- DQA-010 (Major): REPORT_FILE.batch_id nullable 전환 또는 자동 선택 로직 명문화 필요 — 리뷰어 판단 요청
- DQA-011~013 (Minor): 섹션 번호 중복 — 구현 전 정리 권고

---

## 핸드오프: 설계 QA → 설계 리뷰어

```
## 핸드오프: 설계 QA → 설계 리뷰어
메타: 2026-04-06 / 02-design-qa / 회차 2 / 정방향
QA 요약: Critical 0 / High 0 / Major 1 / Minor 3, 커버리지 100%
전달: qa/design/design-qa-report.md, design/*, docs/brd.md, docs/context-ledger.md
리뷰어 주의사항:
  - DQA-010: REPORT_FILE.batch_id ↔ API batchId 제거 간 불일치 — nullable 전환 또는 자동 선택 로직 명문화 판단 필요
  - 원본 FR ID 추적성(§7)·파레토 차트(FR-03-02)·NFR-05 모니터링 — 초회 QA 이후 추가 반영된 항목이므로 리뷰어 확인 필요
  - DQA-011~013: 섹션 번호 중복 3건 — 구현 전 정리 권고
```
