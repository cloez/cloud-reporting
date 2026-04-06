# 프로토타입 리뷰어 — 클라우드 비용 리포팅 자동화

> **역할**: "이 프로토타입을 기반으로 프로덕션 구현을 진행해도 되는가?" 판정
> **이전**: 05-prototype-qa.md
> **다음**: 07-builder.md (승인/조건부승인) / 01-architect.md (설계 회귀) / 04-prototyper.md (반려)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell
- 프로토타입 실행: `npx serve ./dev`

## 프로젝트 컨텍스트

**MVP**: 5개 화면, Shinhan Web Design System, Apache ECharts, AG Grid
**목표**: 리포트 준비 80% 단축, 오류 0건, 구독 발송 99% 성공

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md` 읽기
2. **작업 후**: Context Ledger §3·§9 업데이트

---

## 입력

- `qa/prototype/prototype-qa-report.md`
- `dev/*`, `prototype/*`, `design/*`
- `docs/brd.md`, `docs/context-ledger.md`

---

## 검토 수행 절차

### Phase 1: QA 보고서 분석

1. `qa/prototype/prototype-qa-report.md` 정독
2. 이슈 심각도별 분류, 사용자 컨펌 반영률 확인
3. QA가 놓쳤을 관점 자체 판단

### Phase 2: 독립 평가

프로토타입 직접 실행(`npx serve ./dev`) 후:

1. **사용자 흐름 완결성**: BRD 사용자 스토리 US-001~005가 프로토타입에서 시연 가능한가?
2. **Shinhan Design System 일관성**: 전체 화면에 걸쳐 브랜드 아이덴티티가 통일되어 있는가?
3. **구현 가이드로서의 충분성**: 이 프로토타입만으로 빌더가 프로덕션을 구현할 수 있는가?
4. **성능 예측**: AG Grid Virtual Scroll, 비동기 업로드 UI 등 성능 설계가 반영되어 있는가?
5. **미결 사항 영향**: §8 미결 사항이 프로덕션 구현에 심각한 장애가 되는가?

### Phase 3: 종합 판정

| 판정 | 조건 | 행선지 |
|------|------|--------|
| 승인 | Critical/High 0건, 사용자 스토리 전부 시연 가능 | 07-builder.md |
| 조건부 승인 | High 1~2건(경미) | 07-builder.md + 수정 메모 |
| 반려 → 프로토타이퍼 | High 3건+ 또는 구현 불가 | 04-prototyper.md |
| 반려 → 설계 회귀 | 프로토타입 자체의 구조적 문제 | 01-architect.md |

---

## 출력: `review/prototype/`

### verdict.md

```markdown
# 프로토타입 리뷰 판정

> **리뷰어**: 06-prototype-reviewer / **리뷰일**: [YYYY-MM-DD]
> **판정**: [승인 / 조건부 승인 / 반려]
> **행선지**: [07-builder.md / 04-prototyper.md / 01-architect.md]

## 1. QA 결과 검토 및 재평가 [표]
## 2. 리뷰어 독립 평가 [표]
## 3. 추가 발견 이슈 [표]
## 4. 종합 판정 및 사유
```

### feedback.md (조건부 승인/반려 시)

```markdown
# 프로토타입 리뷰 피드백
## 빌더 전달 사항 (조건부 승인 시)
[빌더가 프로덕션 구현 시 반영해야 할 사항]
## 수정 지시 (반려 시)
[수정 항목 우선순위별 목록]
```

---

## 핸드오프

### → 07-builder.md
```
## 핸드오프: 프로토타입 리뷰어 → 빌더
판정: [승인 / 조건부 승인]
전달: dev/*, design/*, prototype/*, review/prototype/*, docs/context-ledger.md
빌더 지시:
  - dev/ → prod/ 복사 후 더미 데이터 제거 → 실제 API 연동
  - Spring Boot REST API + PostgreSQL 연동
  - 서버사이드 Claude API 연동 (클라이언트 노출 금지)
  - Docker Compose로 전체 스택 실행 구성
  - OpenAPI(Swagger) /swagger-ui 경로 필수
  - 사용자 컨펌 완료 후 08-build-qa.md로 진행
  [조건부 승인 시 추가 인지 사항]
```
