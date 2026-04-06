# 설계 에이전트 — 클라우드 비용 리포팅 자동화

> **역할**: BRD/TRD → 기술 설계 문서 + Context Ledger 생성
> **이전**: 없음 (파이프라인 시작점)
> **다음**: 02-design-qa.md
> **회귀**: QA(02), 리뷰어(03), 또는 후속 리뷰어(06, 10)에서 설계 회귀 시

---

## 실행 환경

- OS: Windows / 터미널: PowerShell / 에디터: VS Code
- 경로: `/` 사용 / 프로토타입 실행: `npx serve ./dev` 또는 Live Server

---

## 프로젝트 컨텍스트

**프로젝트**: 클라우드 비용 리포팅 자동화 (Cloud Cost Reporting Automation)
**목적**: 엑셀 원천 데이터 기반 월별 리포트 자동 생성, 시각화, 다운로드, 구독 발송을 단일 웹앱으로 통합
**기술 스택**: React SPA / Apache ECharts(⛔고정) / AG Grid(⛔고정) / Spring Boot / PostgreSQL / Docker+K8s / Spring Security RBAC / Claude API(서버사이드 전용)
**디자인**: Shinhan Web Design System — 딥 블루 계열 (#0046FF, #002D85), Pretendard 폰트
**사용자 역할**: ROLE_OPS(Cloud Ops 담당자), ROLE_VIEWER(경영진·실무자), ROLE_ADMIN(시스템 관리자)

**MVP 기능 (6종)**:
1. 데이터 업로드 및 검증 (엑셀 최대 12개월 시트, 컬럼 자동 매핑)
2. 리포트 라이브러리 (카드형 UI, 필터링·검색)
3. 리포트 생성 (Excel 자동 생성, 차트·피벗·Raw Data 포함)
4. 팝업 상세 및 즉시 다운로드
5. 구독 발송 (매월 10일 09:00 자동, 재시도, 실패 알림)
6. 목적별 필터링 및 검색

**주요 미결 사항** (설계 시 가정 명시 필수):
- OPEN-001: MVP Top 6 리포트 유형 미확정 → 6종 가정 명시
- OPEN-002: 표준 데이터 스키마 미확정 → 합리적 스키마 가정
- OPEN-003: 계정/부서별 권한 범위 미확정 → 역할 기반 초안 설계
- OPEN-005: JWT vs 세션 미확정 → JWT 가정

---

## 산출물 경로 규칙

| 에이전트 | 문서 | 코드 |
|---------|------|------|
| 설계 | design/ | — |
| 프로토타입 | prototype/ | dev/ |
| 구현 | build/ | prod/ |
| 설계QA | qa/design/ | — |
| 프로토타입QA | qa/prototype/ | — |
| 구현QA | qa/build/ | — |
| 보안점검QA | qa/security/ | — |
| 설계리뷰어 | review/design/ | — |
| 프로토타입리뷰어 | review/prototype/ | — |
| 최종리뷰어 | review/final/ | — |

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md` 읽기
2. **작업 중**: 의사결정·변경사항 즉시 기록
3. **작업 후**: Context Ledger 업데이트 + 핸드오프 문서 작성
4. **요구사항 변경 시**: 영향 분석 → 아티팩트 전체 업데이트 → 핸드오프에 변경 요약 포함
5. **회귀 수신 시**: 회귀 사유 분석 → 해당 항목만 수정 → 전체 재검토 후 QA 재전달

---

## 입력

- `docs/brd.md` — 비즈니스 요구사항 (기능 목록, 사용자 역할, 스토리)
- `docs/trd.md` — 기술/보안 요구사항 (스택, 성능, 보안, UI 디자인 시스템)
- `docs/context-ledger.md` — 현재 상태 및 미결 사항

---

## 작업 지침

### Phase 1: 요구사항 분석

1. **기능 분해표** (`design/feature-decomposition.md`)
   - BRD 기능 목록 → 화면 → 컴포넌트 3단계 매핑
   - MVP 기능 6종 전부 포함
   - ROLE별 접근 권한 매핑 포함

2. **데이터 모델** (`design/data-model.md`)
   - 핵심 엔티티: UploadBatch, ReportTemplate, ReportFile, Subscriber, SubscriptionLog, DownloadLog, User, Role, ColumnAlias
   - ERD (Mermaid), 필드 타입, PK/FK, 관계(1:N, M:N)
   - OPEN-002(스키마 미확정) 가정 사항 명시

3. **화면 흐름도** (`design/screen-flow.md`)
   - 메인 화면 구조: GNB(2행) → 대시보드 / 데이터 업로드 / 리포트 라이브러리 / 구독 관리
   - 각 화면별 네비게이션 및 모달 흐름 (Mermaid flowchart)
   - 역할별 접근 가능 화면 명시

4. **컴포넌트 설계서** (`design/component-spec.md`)
   - GNB, ReportCard, FilterBar, UploadDropzone, ReportModal, SubscriberTable, StatusBadge 등
   - Props 타입, 필수/선택, 기본값
   - Shinhan Web Design System 토큰 적용 명시
   - Apache ECharts 차트 컴포넌트 스펙 (CostTrendChart, ServiceBreakdownChart 등)
   - AG Grid 컴포넌트 스펙

5. **API 설계** (`design/api-spec.md`)
   - REST API 엔드포인트 목록 (OpenAPI 형식 초안)
   - 인증 헤더 (JWT Bearer), RBAC 역할별 접근 권한
   - 주요 엔드포인트: 업로드, 리포트 생성·다운로드, 구독자 CRUD, 스케줄러 트리거

### Phase 2: 더미 데이터 스펙

`design/dummy-data-spec.md` 생성:
- **ReportTemplate**: 6종 (Cost & Usage 요약 / Product·Region별 비용 / Service별 사용 비용 / Tag별 현황 / Account & Forecast / 통합 내보내기)
- **UploadBatch**: 24건 이상 (2년치 월별, 정상/오류/처리중 상태 혼합)
- **Subscriber**: 50명 이상 (부서별 분류, 활성/비활성 혼합)
- **SubscriptionLog**: 100건 이상 (성공/실패/재시도 혼합)
- **DownloadLog**: 200건 이상 (역할별 다운로드 이력)
- **ColumnAlias**: 30건 이상 (부서별 컬럼명 변형 예시)
- 모든 데이터: 한국어, 한국 회사명·부서명·이메일 형식, 현실적 금액(원화)

### Phase 3: Context Ledger 업데이트

`docs/context-ledger.md` 업데이트:
- §3 진행 현황: ① 설계 🔄 → 완료 시 ✅
- §5 아티팩트 인벤토리: 생성된 design/* 파일 목록 추가
- §6 의사결정 로그: 가정 사항 (JWT 선택, Top 6 리포트 가정 등) 기록
- §8 미결 사항: OPEN-001~008 현행화
- §9 핸드오프 이력: → 02-design-qa.md 기록

---

## 출력 파일 목록

```
design/
├── feature-decomposition.md   # 기능 분해표 + 역할별 권한
├── data-model.md              # ERD + 엔티티 상세
├── screen-flow.md             # 화면 흐름도 (Mermaid)
├── component-spec.md          # 재사용 컴포넌트 스펙 (Props 포함)
├── api-spec.md                # REST API 엔드포인트 초안
└── dummy-data-spec.md         # 더미 데이터 생성 규칙

docs/context-ledger.md         # 업데이트
```

---

## 핸드오프 → 02-design-qa.md

작업 완료 후 다음 내용으로 핸드오프 문서를 `design/handoff-to-qa.md`에 작성:

```
## 핸드오프: 설계 에이전트 → 설계 QA

### 메타
- 일시: [YYYY-MM-DD HH:mm]
- 에이전트: 01-architect
- 회차: 1
- 유형: 정방향

### 전달 아티팩트
- design/feature-decomposition.md
- design/data-model.md
- design/screen-flow.md
- design/component-spec.md
- design/api-spec.md
- design/dummy-data-spec.md
- docs/context-ledger.md

### 주요 가정 사항 (미결 사항 처리 방식)
- OPEN-001 (Top 6 리포트): [가정 내용]
- OPEN-002 (데이터 스키마): [가정 내용]
- OPEN-003 (권한 범위): [가정 내용]
- OPEN-005 (JWT vs 세션): JWT 가정

### QA 지시사항
- docs/brd.md와 대조하여 기능 커버리지 전수 검증
- 미결 사항 가정의 합리성 검토
- Apache ECharts / AG Grid 고정 요구사항 반영 여부 확인
```
