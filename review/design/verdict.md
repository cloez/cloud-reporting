# 설계 리뷰 판정 — 클라우드 비용 리포팅 자동화

> **리뷰어**: 03-design-reviewer  
> **리뷰일**: 2026-04-06  
> **리뷰 대상**: design/* (v1.1~v1.2), qa/design/* (v2.0)  
> **판정**: 조건부 승인  
> **행선지**: 04-prototyper.md

---

## 1. QA 보고서 검토 결과

### 1.1 QA 결과 vs 리뷰어 재평가 요약

| 구분 | QA 판정 | 리뷰어 재평가 |
|------|---------|-------------|
| Critical | 0건 | 0건 — 동의 |
| High | 0건 | 0건 — 동의 |
| Major | 1건 (DQA-010) | 1건 — 동의 (심각도 적정) |
| Minor | 3건 (DQA-011~013) | 3건 — 동의 |
| 커버리지 | MVP 6/6 (100%) | 100% — 확인 완료 |
| QA 판정 | ✅ PASS | ✅ 적정 판정 |

### 1.2 QA 이슈 재평가 상세

| ID | QA 심각도 | 리뷰어 재평가 | 프로토타입 차단 | 비고 |
|----|----------|-------------|--------------|------|
| DQA-010 | 🟡 Major | 🟡 Major — 적정 | ❌ 비차단 | REPORT_FILE.batch_id ↔ API batchId 제거 불일치. 프로토타입에서 `batch_id`를 nullable로 처리하면 진행 가능 |
| DQA-011 | 🟢 Minor | 🟢 Minor — 적정 | ❌ 비차단 | feature-decomposition §7 번호 중복 — 문서 정리 수준 |
| DQA-012 | 🟢 Minor | 🟢 Minor — 적정 | ❌ 비차단 | data-model §2.7 번호 중복 — 문서 정리 수준 |
| DQA-013 | 🟢 Minor | 🟢 Minor — 적정 | ❌ 비차단 | dummy-data-spec §10 번호 중복 — 문서 정리 수준 |

### 1.3 이전 QA 이슈(9건) 해소 확인

리뷰어가 직접 확인한 결과, DQA-001~009 전수 해소가 설계 문서에 올바르게 반영되었음을 확인합니다:

- **DQA-001** (Critical: COST_DATA 누락): `data-model.md` §2.6에 COST_DATA 엔티티 추가, 인덱스 5개, dummy-data §9에 8,000건+ 스펙 — ✅ 해소
- **DQA-002** (High: 배치 선택 로직): `api-spec.md` §5 batchId 제거, COST_DATA 기반 집계로 전환 — ✅ 해소
- **DQA-003** (High: 대시보드 기능 분해): `feature-decomposition.md` F00 추가, KPI·API 4개 — ✅ 해소
- **DQA-004~009**: 컴포넌트 Props, Phase 2 명시, API 추가, 상태 관리 등 — ✅ 전수 해소

---

## 2. 리뷰어 독립 평가

| # | 평가 항목 | 결과 | 비고 |
|---|----------|------|------|
| R-1 | 프로토타입 실현 가능성 | ✅ 충분 | 6개 설계 문서가 컴포넌트 Props, API 요청/응답, 데이터 모델, 화면 흐름을 충분히 정의. 프로토타이퍼가 해석 없이 구현 가능한 수준. DQA-010(batch_id) 1건만 명확화 필요 |
| R-2 | 사용자 시나리오 완결성 (US-001~005) | ✅ 전수 지원 | 아래 상세 참조 |
| R-3 | 확장 위험도 | ✅ 낮음 | Library 패턴, COST_DATA 독립 집계, StorageService 추상화 등 구조적 재작업 최소화 설계 |
| R-4 | 더미 데이터 충분성 | ✅ 충분 | 9종 엔티티, COST_DATA 8,000건+, 24개월 시계열, 오류·재시도 케이스 포함. 현실적 테스트 가능 |
| R-5 | 미결 사항 가정 합리성 | ✅ 합리적 | OPEN-001~008 모두 추상화 레이어 또는 합리적 기본값으로 가정. 확정 시 구조적 재작업 최소화 |

### R-2 상세: 사용자 스토리 커버리지

| US | 스토리 | 설계 커버리지 | 판정 |
|----|--------|------------|------|
| US-001 | OPS: 엑셀 업로드 → 자동 오류 알림 | F01(UploadDropzone → ColumnMappingPanel → ValidationResultList), API §3(6개), COST_DATA 저장 | ✅ |
| US-002 | OPS: 카드 선택 → 즉시 다운로드 | F02(ReportCardGrid) → F04(ReportDetailModal → DownloadButton), API §4~5 | ✅ |
| US-003 | 경영진: 매월 10일 자동 이메일 수신 | F05(ScheduleStatusCard, SubscriptionLog), API §6(trigger/logs/schedule), 휴일 순연 | ✅ |
| US-004 | 실무자: 소속 부서 리포트만 열람 | RBAC(ROLE_VIEWER → tag_department 필터), TEMPLATE_ROLE_ACCESS, 대시보드·리포트 부서 필터 | ✅ |
| US-005 | 관리자: 구독자 등록·수정·삭제 | F05(SubscriberTable CRUD + SubscriberFormModal), API §6(CRUD /subscribers) | ✅ |

### R-3 상세: 확장 위험 분석

| 관점 | 평가 | 근거 |
|------|------|------|
| 리포트 유형 추가 | 낮음 | Library 패턴 + REPORT_TEMPLATE 설정 기반 — 신규 리포트는 DB 레코드 추가로 확장 |
| 스토리지 변경 | 낮음 | OPEN-006 추상화 레이어 명시 — S3/GCS 전환 시 구현체만 교체 |
| 인증 방식 변경 | 낮음 | JWT 가정이나 Spring Security 기반 — 세션 전환 시 토큰 관련 코드만 수정 |
| 이메일 서비스 변경 | 낮음 | JavaMailSender 추상화 — SES/SendGrid 전환 시 구현체만 교체 |
| COST_DATA 스키마 변경 | 중간 | OPEN-002 확정 시 14개 컬럼 변경 가능. 단, 비정규화(year_month)와 인덱스 설계가 잘 되어 있어 영향 범위 제한적 |

### R-5 상세: 미결 사항 가정 평가

| OPEN ID | 가정 | 합리성 | 확정 시 재작업 범위 |
|---------|------|--------|-----------------|
| OPEN-001 | R01~R06 가정 | ✅ | REPORT_TEMPLATE 레코드 수정 — 최소 |
| OPEN-002 | 14개 컬럼 | ✅ | COST_DATA 컬럼 추가/삭제 — 중간 (마이그레이션 필요) |
| OPEN-003 | VIEWER 소속부서 제한 | ✅ | tag_department 필터 로직 수정 — 최소 |
| OPEN-004 | 익영업일 순연 | ✅ | 스케줄러 로직 수정 — 최소 |
| OPEN-005 | JWT | ✅ | Spring Security 설정 변경 — 중간 |
| OPEN-006 | 로컬 볼륨 + 추상화 | ✅ | 구현체 교체 — 최소 |
| OPEN-007 | iText | ✅ | PDF 생성 구현체 교체 — 최소 |
| OPEN-008 | JavaMailSender | ✅ | 발송 구현체 교체 — 최소 |

---

## 3. 리뷰어 추가 발견 이슈

| ID | 심각도 | 유형 | 위치 | 설명 | 프로토타입 차단 | 조치 권고 |
|----|--------|------|------|------|--------------|----------|
| REV-001 | 🟢 Minor | ERD 표기 | data-model.md §1 ERD | COLUMN_ALIAS → REPORT_TEMPLATE 관계가 `\|\|--\|\|`(1:1 필수)로 표기되어 있으나, template_id는 nullable(FK NULL)이므로 `\|o--o\|`(선택적)이 정확함 | ❌ 비차단 | ERD 관계선 수정 |
| REV-002 | 🟢 Minor | 일관성 | api-spec.md §5 ↔ data-model.md §2.8 | DQA-010과 동일 맥락 — POST /reports/generate에서 batchId 없이 COST_DATA 기반 집계인데, REPORT_FILE.batch_id가 FK NOT NULL. 리뷰어 권고: **batch_id를 nullable로 변경**하고, 프로토타입에서는 "해당 yearMonth의 최신 COMPLETED 배치"를 자동 할당 | ❌ 비차단 | 프로토타이퍼가 batch_id nullable로 처리 |

> **참고**: REV-002는 DQA-010의 구체적 해결 방향을 명시한 것임. 신규 이슈가 아닌 DQA-010에 대한 리뷰어 판단.

---

## 4. 종합 판정

**판정**: 🟡 **조건부 승인**

**사유**: Critical 0건, High 0건, 커버리지 100%로 승인 기준을 충족합니다. 다만 DQA-010(Major — REPORT_FILE.batch_id 불일치)은 프로토타입 구현 시 데이터 모델과 API 간 혼선을 유발할 수 있으므로, 프로토타이퍼가 아래 조건을 인지하고 진행할 것을 권고합니다.

**조건**:
1. **DQA-010 해소**: REPORT_FILE.batch_id를 nullable로 변경. COST_DATA 기반 생성 시 batch_id = null 허용. 단일 배치 기반 생성 시에는 해당 배치 ID 할당
2. **DQA-011~013 정리**: 섹션 번호 중복 3건은 구현 전 정리 (프로토타이퍼 또는 설계자)
3. **REV-001**: ERD COLUMN_ALIAS 관계선 표기 수정 (선택 사항)

---

*본 판정은 설계 문서 v1.1~v1.2, QA 보고서 v2.0, BRD v1.1, Context Ledger v0.3 기반으로 수행되었습니다.*
