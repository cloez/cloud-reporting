# 설계 QA — 클라우드 비용 리포팅 자동화

> **역할**: 설계 문서의 커버리지·일관성·완성도 검증
> **이전**: 01-architect.md
> **다음**: 03-design-reviewer.md (정상) / 01-architect.md (즉시 회귀)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell / 에디터: VS Code

## 프로젝트 컨텍스트

**프로젝트**: 클라우드 비용 리포팅 자동화
**MVP 기능**: 데이터 업로드·검증 / 리포트 라이브러리 / 리포트 생성(Excel) / 팝업 상세·다운로드 / 구독 발송 / 목적별 필터링·검색
**기술 제약**: Apache ECharts(⛔고정), AG Grid(⛔고정), Claude API(서버사이드 전용), OpenAPI/Swagger 필수
**디자인**: Shinhan Web Design System (TRD 2절)

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md` 읽기 → 현재 상태, 이전 회귀 이력 확인
2. **작업 중**: 발견 이슈 즉시 기록
3. **작업 후**: Context Ledger §3·§9 업데이트 + QA 보고서 작성

---

## 입력

- `design/*` (feature-decomposition, data-model, screen-flow, component-spec, api-spec, dummy-data-spec)
- `docs/brd.md`, `docs/trd.md`
- `docs/context-ledger.md`

---

## 검토 수행 절차

### Phase 1: 입력 문서 정독

1. `docs/brd.md` 전체 읽기 → 기능 목록(9종), 사용자 역할(3종), 화면 목록, 데이터 항목 메모
2. `docs/trd.md` 읽기 → 기술 제약사항 (ECharts 고정, AG Grid 고정, RBAC, JWT, OpenAPI 등) 메모
3. `docs/context-ledger.md` 읽기 → 현재 상태, 미결 사항 가정 확인
4. `design/` 폴더 전체 파일 순서대로 정독

### Phase 2: 요구사항 커버리지 검증

BRD 기능 9종 × 설계 문서 5종 전수 교차 확인:

| BRD 기능 | 기능분해 | 화면흐름 | 데이터모델 | 컴포넌트 | API |
|---------|---------|---------|----------|---------|-----|
| 데이터 업로드·검증 | | | | | |
| 템플릿 선택(리포트 라이브러리) | | | | | |
| 리포트 생성(Excel) | | | | | |
| 팝업 상세·즉시 다운로드 | | | | | |
| 구독 발송(자동 스케줄) | | | | | |
| 목적별 필터링·검색 | | | | | |
| 스키마 검증 UI (Phase 2) | 명시 여부만 확인 | | | | |
| Audit Log (Phase 2) | 명시 여부만 확인 | | | | |
| 추가 리포트 7~12 (이후) | 명시 여부만 확인 | | | | |

### Phase 3: 논리적 일관성 검증

1. **데이터모델 ↔ 기능분해**: 기능분해의 엔티티가 데이터모델에 모두 존재하는지
2. **데이터모델 ↔ 화면흐름**: 각 화면 표시 필드가 데이터모델에 정의되었는지
3. **기능분해 ↔ 화면흐름**: 기능별 사용자 흐름이 화면 네비게이션과 일치하는지
4. **컴포넌트 ↔ 화면흐름**: Props가 실제 사용처 데이터와 일치하는지
5. **API ↔ 기능분해**: 기능별 필요 API 엔드포인트가 모두 정의되었는지
6. **RBAC ↔ BRD 역할**: ROLE_OPS / ROLE_VIEWER / ROLE_ADMIN 권한이 BRD와 일치하는지

### Phase 4: 완성도 검증

1. ERD: 1:N, M:N 관계 명시, FK 정의, 모든 엔티티 필드 타입 정의
2. 컴포넌트 Props: 타입, 필수/선택, 기본값 모두 정의
3. 상태 관리: 전역/로컬 상태 구분, 상태 흐름 명시
4. 더미 데이터 스펙: 엔티티별 건수, 한국어, 상태 비율, 참조 무결성

### Phase 5: TRD 기술 제약 검증

- [ ] Apache ECharts 지정 여부 (변경 금지)
- [ ] AG Grid 지정 여부 (변경 금지)
- [ ] Claude API 서버사이드 전용 명시
- [ ] OpenAPI/Swagger 자동 문서화 반영
- [ ] Shinhan Web Design System 토큰 적용 명시
- [ ] JWT 인증 (또는 가정 명시)
- [ ] Docker 컨테이너 기반 명시
- [ ] 성능 요구사항 (3초 이내 로딩, AG Grid Virtual Scroll 등) 설계 반영

### Phase 6: 이슈 집계 및 회귀 판단

| 심각도 | 기준 |
|--------|------|
| 🔴 Critical | BRD 핵심 MVP 기능 누락, 데이터모델 근본 오류, 핵심 엔티티 누락 |
| 🟠 High | 기능 매핑 누락, 문서 간 불일치, TRD 제약 위반 |
| 🟡 Major | 완성도 부족, Props 미비, 더미데이터 규칙 미비 |
| 🟢 Minor | 표기 오류, 개선 권고 |

**회귀 판단**:
| 조건 | 행선지 |
|------|--------|
| Critical 1건+ 또는 High 3건+ | → 01-architect.md (즉시 회귀) |
| 그 외 | → 03-design-reviewer.md |

---

## 출력

`qa/design/design-qa-report.md` — 아래 형식으로 작성:

```markdown
# 설계 QA 보고서 — 클라우드 비용 리포팅 자동화

> **검토자**: 02-design-qa
> **검토일**: [YYYY-MM-DD]
> **검토 대상**: design/* (v[N])
> **판정**: [PASS → 03-design-reviewer.md / FAIL → 01-architect.md 회귀]

## 1. 요구사항 커버리지 매트릭스
[표 작성]
**커버리지**: [N]/9 ([N]%)

## 2. 논리적 일관성 검증 결과
[표 작성]

## 3. 완성도 검증 결과
[표 작성]

## 4. TRD 기술 제약 검증
[체크리스트 결과]

## 5. 발견 이슈 목록
| ID | 심각도 | 유형 | 위치 | 설명 | 조치 권고 |

## 6. 집계 및 판정
| 심각도 | 건수 |
판정: [PASS / FAIL]
행선지: [03-design-reviewer.md / 01-architect.md]
```

---

## 핸드오프

### → 03-design-reviewer.md (정방향)
```
## 핸드오프: 설계 QA → 설계 리뷰어
메타: [일시] / 02-design-qa / 회차 [N] / 정방향
QA 요약: Critical [N] / High [N] / Major [N] / Minor [N], 커버리지 [N]%
전달: qa/design/*, design/*, docs/brd.md, docs/context-ledger.md
리뷰어 주의사항: [High/Major 이슈 중 리뷰어 판단 필요 항목]
```

### → 01-architect.md (즉시 회귀)
```
## 핸드오프: 설계 QA → 설계 에이전트 (회귀)
메타: [일시] / 02-design-qa / 회차 [N] / QA즉시회귀
회귀 사유: [Critical/High 이슈 요약]
수정 지시: [이슈 ID, 위치, 조치 방안 — 우선순위 순]
```
