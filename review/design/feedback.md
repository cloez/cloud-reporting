# 설계 리뷰 피드백

> **리뷰어**: 03-design-reviewer  
> **리뷰일**: 2026-04-06  
> **판정**: 조건부 승인 → 04-prototyper.md

---

## 수정 필요 사항 (우선순위 순)

| 순위 | 이슈 ID | 심각도 | 위치 | 수정 내용 |
|------|---------|--------|------|----------|
| 1 | DQA-010 / REV-002 | 🟡 Major | data-model.md §2.8 REPORT_FILE | `batch_id`를 `FK NULL`로 변경. COST_DATA 기반 리포트 생성 시 batch_id = null 허용. 단일 배치 기반 생성 시 해당 배치 ID 자동 할당. api-spec §5에 "yearMonth 기준 COST_DATA 직접 집계, batch_id는 optional" 명문화 |
| 2 | DQA-011 | 🟢 Minor | feature-decomposition.md | §7 중복 → "비기능 요구사항 추적"은 §7, "원본 FR ID → 설계 커버리지 요약"은 §8로 분리 |
| 3 | DQA-012 | 🟢 Minor | data-model.md | §2.7 중복 → REPORT_TEMPLATE은 §2.7, TEMPLATE_ROLE_ACCESS는 §2.8로 분리. 이후 엔티티 번호 시프트 (현 §2.8 REPORT_FILE → §2.9 등) |
| 4 | DQA-013 | 🟢 Minor | dummy-data-spec.md | §10 중복 → "원천 데이터 샘플"은 §10, "데이터 생성 우선순위"는 §11로 분리 |
| 5 | REV-001 | 🟢 Minor | data-model.md §1 ERD | COLUMN_ALIAS → REPORT_TEMPLATE 관계선을 `||--||`에서 `|o--o|`(선택적)로 수정 |

---

## 조건부 승인 시 프로토타이퍼 전달 메모

프로토타이퍼(04-prototyper.md)가 반드시 인지해야 할 사항입니다:

### 1. DQA-010: REPORT_FILE.batch_id 처리 방침

- **현재 상태**: data-model에서 `batch_id FK NOT NULL`이나, api-spec에서 `batchId`가 제거됨
- **프로토타이퍼 처리**: `batch_id`를 **nullable**로 구현
  - COST_DATA 기반 리포트 생성 시: `batch_id = null`
  - 향후 특정 배치 기반 생성이 필요할 경우: batch_id 할당
- **구현 단계(07-builder)에서 확정**: 최신 COMPLETED 배치 자동 선택 로직 또는 완전 null 허용

### 2. 섹션 번호 중복 3건 (DQA-011~013)

- 프로토타입 구현에는 영향 없으나, 문서 참조 시 혼동 방지를 위해 **프로토타입 착수 전 또는 병행하여** 섹션 번호 정리 권고
- 프로토타이퍼가 직접 수정하거나, 설계자에게 요청 가능

### 3. 원본 FR ID 추적성 확인

- QA 이후 추가 반영된 항목: 원본 FR ID 추적(§7), 파레토 차트(FR-03-02), NFR-05 모니터링
- 프로토타이퍼는 `feature-decomposition.md` §7(원본 FR ID → 설계 커버리지 요약) 테이블을 참조하여 커버리지 유지

### 4. 미결 사항(OPEN-001~008) 가정 유지

- 모든 가정은 리뷰어가 합리적으로 판단함
- 프로토타입은 가정 기반으로 진행하되, **추상화 레이어**(스토리지, 이메일, 인증)는 설계대로 유지
- 가정이 확정될 경우 구현 단계에서 반영

---

*본 피드백은 설계 리뷰 판정(review/design/verdict.md)의 부속 문서입니다.*
