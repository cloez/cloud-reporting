# Context Ledger — 클라우드 비용 리포팅 자동화

> **최종 업데이트**: 2026-04-06 by 04-prototyper
> **현재 단계**: ④ 프로토타입 완료 → 사용자 컨펌 대기
> **파이프라인 상태**: 정상

---

## 1. 프로젝트 요약

- **프로젝트명**: 클라우드 비용 리포팅 자동화
- **설명**: 엑셀 원천 데이터 기반 월별 리포트 자동 생성, 시각화, 다운로드 및 이메일 구독 발송을 하나의 웹 애플리케이션으로 통합
- **목표**: 리포트 준비 시간 80% 단축, 수기 입력 오류 0건, 양식 100% 표준화, 구독 발송 정시 성공률 99% 이상
- **MVP 범위**: 데이터 업로드·검증, 리포트 라이브러리(Top 6), 리포트 생성(Excel), 팝업 상세·즉시 다운로드, 구독 발송, 목적별 필터링·검색
- **디자인 스킬**: Shinhan Web Design System (딥 블루 계열, #0046FF/#002D85)
- **실행 환경**: Windows / PowerShell / VS Code / Claude Code

## 2. 요구사항 원본

### BRD 요약

| 기능 | 우선순위 | MVP |
|------|---------|-----|
| 데이터 업로드 및 검증 | 높음 | ✅ |
| 템플릿 선택 (리포트 라이브러리) | 높음 | ✅ |
| 리포트 생성 (Excel 자동 생성) | 높음 | ✅ |
| 팝업 상세 및 즉시 다운로드 | 높음 | ✅ |
| 구독 발송 (매월 10일 자동) | 높음 | ✅ |
| 목적별 필터링 및 검색 | 중간 | ✅ |
| 스키마 검증 UI | 중간 | ❌ Phase 2 |
| 다운로드 이력 Audit Log | 중간 | ❌ Phase 2 |
| 추가 리포트 7~12번 | 낮음 | ❌ 이후 |

### TRD 요약

| 구분 | 내용 |
|------|------|
| 프론트엔드 | React SPA |
| 차트 | Apache ECharts (⛔ 변경 금지) |
| 그리드 | AG Grid (⛔ 변경 금지) |
| 백엔드 | Spring Boot + REST API (OpenAPI/Swagger 필수) |
| DB | PostgreSQL |
| 컨테이너 | Docker (로컬/CI), Kubernetes (운영) |
| 인증 | Spring Security + RBAC |
| AI | Claude API (서버사이드 전용) |
| 폰트 | Pretendard |
| 디자인 | Shinhan Web Design System |

### 사용자 역할

| 역할 | 권한 |
|------|------|
| Cloud Ops 담당자 (ROLE_OPS) | 데이터 업로드, 모든 템플릿 선택, 리포트 생성·다운로드, 구독 발송 |
| 경영진/실무자 (ROLE_VIEWER) | 권한 범위 내 리포트 열람·다운로드 |
| 시스템 관리자 (ROLE_ADMIN) | 권한·구독 관리 |

### BRD 미결 사항

| # | 내용 | 기한 |
|---|------|------|
| 1 | MVP 필수 Top 6 리포트 최종 선정 | Apr W1 |
| 2 | 표준 데이터 스키마 확정 | Apr W1 |
| 3 | 계정/부서별 템플릿 열람 권한 범위 | Apr W1 |
| 4 | 구독 발송일 휴일 시 익영업일 순연 여부 | Apr W1 |

---

## 3. 현재 상태

### 진행 현황

| 단계 | 상태 | 에이전트 | 시작 | 완료 | 비고 |
|------|------|---------|------|------|------|
| ① 설계 | ✅ | Architect | 2026-04-06 | 2026-04-06 | v1.2 — QA 회귀 9건 전수 반영 완료 |
| ② 설계 QA | ✅ | Design QA | 2026-04-06 | 2026-04-06 | 재QA PASS — Major 1 / Minor 3 (신규), 이전 9건 전수 해소 |
| ③ 설계 리뷰 | ✅ | Design Reviewer | 2026-04-06 | 2026-04-06 | 조건부 승인 — Major 1 (DQA-010 batch_id), Minor 4 |
| ④ 프로토타입 | ✅ | Prototyper | 2026-04-06 | 2026-04-06 | 5개 화면 + GNB + 모달 구현 완료 |
| ④-a 사용자 컨펌 | 🔄 | (사용자) | 2026-04-06 | | 브라우저 확인 후 피드백 대기 |
| ⑤ 프로토타입 QA | ⏳ | Prototype QA | | | |
| ⑥ 프로토타입 리뷰 | ⏳ | Prototype Reviewer | | | |
| ⑦ 구현 | ⏳ | Builder | | | |
| ⑦-a 사용자 컨펌 | ⏳ | (사용자) | | | |
| ⑧ 구현 QA | ⏳ | Build QA | | | |
| ⑨ 보안 점검 QA | ⏳ | Security QA | | | |
| ⑩ 최종 리뷰 | ⏳ | Final Reviewer | | | |

상태: ⏳대기 / 🔄진행중 / ✅완료 / ↩️회귀 / 🔙설계회귀

### 회차 이력

| 회차 | 경로 | 사유 | 결과 |
|------|------|------|------|
| — | — | 초기 스캐폴딩 | 설계 대기 |
| 1 | ① 설계 → ② 설계 QA | 정방향 | 설계 완료, QA 대기 |
| 2 | ② 설계 QA → ① 설계 | QA즉시회귀 | Critical 1건 (COST_DATA 엔티티 누락) — 01-architect 재작업 필요 |
| 3 | ① 설계 (회귀) → ② 설계 QA | 회귀 반영 완료 | DQA-001~009 전수 반영 + 원본 FR ID·파레토·NFR-05 반영 → 재QA 대기 |
| 4 | ② 설계 QA (재) → ③ 설계 리뷰 | 정방향 | 재QA PASS — 이전 9건 해소, 신규 Major 1 / Minor 3 |
| 5 | ③ 설계 리뷰 → ④ 프로토타입 | 정방향 (조건부 승인) | DQA-010 batch_id nullable 처리 조건, Minor 3건 정리 권고 |
| 6 | ④ 프로토타입 → ④-a 사용자 컨펌 | 정방향 | 5개 화면 구현 완료, 사용자 컨펌 대기 |

---

## 4. 사용자 컨펌 이력

| 회차 | 단계 | 일시 | 피드백 요약 | 리뷰 원본 | 결과 |
|------|------|------|-----------|----------|------|
| — | — | — | — | — | — |

## 4-b. 사용자 수정 요청 추적

| ID | 단계 | 피드백 원문 | 변경 유형 | 영향 아티팩트 | 코드 수정 | 문서 반영 | §8 등록 | 상태 |
|----|------|-----------|----------|-------------|----------|----------|--------|------|

---

## 5. 아티팩트 인벤토리

| 아티팩트 | 경로 | 버전 | 최종 수정 | 수정일 |
|---------|------|------|----------|--------|
| BRD | docs/brd.md | v1.1 | 01-architect | 2026-04-06 |
| TRD | docs/trd.md | v1.1 | 스캐폴더 | 2026-04-06 |
| Context Ledger | docs/context-ledger.md | v0.4 | 03-design-reviewer | 2026-04-06 |
| 기능 분해표 | design/feature-decomposition.md | v1.1 | 01-architect | 2026-04-06 |
| 데이터 모델 | design/data-model.md | v1.0 | 01-architect | 2026-04-06 |
| 화면 흐름도 | design/screen-flow.md | v1.0 | 01-architect | 2026-04-06 |
| 컴포넌트 설계서 | design/component-spec.md | v1.1 | 01-architect | 2026-04-06 |
| API 설계서 | design/api-spec.md | v1.0 | 01-architect | 2026-04-06 |
| 더미 데이터 스펙 | design/dummy-data-spec.md | v1.0 | 01-architect | 2026-04-06 |
| 핸드오프 문서 | design/handoff-to-qa.md | v1.0 | 01-architect | 2026-04-06 |
| 설계 QA 보고서 | qa/design/design-qa-report.md | v2.0 | 02-design-qa | 2026-04-06 |
| 설계 리뷰 판정 | review/design/verdict.md | v1.0 | 03-design-reviewer | 2026-04-06 |
| 설계 리뷰 피드백 | review/design/feedback.md | v1.0 | 03-design-reviewer | 2026-04-06 |
| 프로토타입 화면 목록 | prototype/screen-inventory.md | v1.0 | 04-prototyper | 2026-04-06 |
| 프로토타입 UX 결정 | prototype/ux-decisions.md | v1.0 | 04-prototyper | 2026-04-06 |
| 프로토타입 HTML | dev/index.html | v1.0 | 04-prototyper | 2026-04-06 |
| 프로토타입 스타일 | dev/styles.css | v1.0 | 04-prototyper | 2026-04-06 |
| 프로토타입 앱 로직 | dev/app.js | v1.0 | 04-prototyper | 2026-04-06 |
| 프로토타입 더미 데이터 | dev/data.js | v1.0 | 04-prototyper | 2026-04-06 |

---

## 6. 의사결정 로그

| 일시 | 에이전트 | 결정 | 근거 | 영향 |
|------|---------|------|------|------|
| 2026-04-06 | 스캐폴더 | Shinhan Web Design System 적용 | TRD 2.1 지정 | 전체 UI |
| 2026-04-06 | 스캐폴더 | Apache ECharts / AG Grid 고정 | TRD 8조 변경 금지 | 차트·그리드 |
| 2026-04-06 | 01-architect | MVP Top 6 리포트 가정 | BRD 4.2 리포트 유형 기반 | R01~R06 정의 |
| 2026-04-06 | 01-architect | JWT 인증 방식 가정 | OPEN-005 — JWT vs 세션 미확정 | 인증/인가 전체 |
| 2026-04-06 | 01-architect | 표준 스키마 14개 컬럼 가정 | OPEN-002 — 클라우드 비용 공통 컬럼 | 업로드·매핑·집계 |
| 2026-04-06 | 01-architect | ROLE_VIEWER 소속부서 접근 제한 | OPEN-003 — 역할 기반 초안 | 접근 제어, 메뉴 |
| 2026-04-06 | 01-architect | 휴일 시 익영업일 자동 순연 | OPEN-004 — BRD 기반 가정 | 스케줄러 |
| 2026-04-06 | 01-architect | 로컬 볼륨 + 추상화 레이어 | OPEN-006 — MVP 단계 | 파일 스토리지 |
| 2026-04-06 | 01-architect | iText PDF 라이브러리 | OPEN-007 — TRD 기반 | PDF Generator |
| 2026-04-06 | 01-architect | JavaMailSender 추상화 | OPEN-008 — 구현 유연성 | 이메일 발송 |
| 2026-04-06 | 04-prototyper | Vanilla JS + 해시 라우팅 채택 | 빌드 도구 없이 npx serve 즉시 실행 가능 | 프로토타입 구조 |
| 2026-04-06 | 04-prototyper | 로그인/관리자 화면 미구현 | 핵심 5개 화면 집중, ROLE_OPS 하드코딩 | 프로토타입 범위 |
| 2026-04-06 | 04-prototyper | DQA-010 batch_id nullable 반영 | 더미 데이터에서 batch_id 제외, yearMonth 기반 | 데이터 모델 |
| 2026-04-06 | 01-architect | 12개 엔티티 데이터 모델 | BRD/TRD 분석 결과 | DB 설계 전체 |
| 2026-04-06 | 01-architect | 35개 REST API 엔드포인트 | 기능 분해 + RBAC | 백엔드 전체 |
| 2026-04-06 | 01-architect | 원본 FR ID 체계 도입 (FR-01~05, NFR-01~06) | 원본 CLOUD-REQ-001 추적성 확보 | BRD, 기능분해표 |
| 2026-04-06 | 01-architect | 파레토 차트 컴포넌트 추가 (ProductRegionParetoChart) | FR-03-02 — 막대+라인+파레토 | 컴포넌트 설계서 |
| 2026-04-06 | 01-architect | NFR-05 모니터링 요구사항 반영 | 원본 §5 비기능 요구사항 | BRD, 기능분해표 |

---

## 7. 변경 이력

| ID | 일시 | 내용 | 출처 | 영향 아티팩트 | 상태 |
|----|------|------|------|-------------|------|
| CH-001 | 2026-04-06 | 프로젝트 초기 스캐폴딩 생성 | 스캐폴더 | 전체 | 완료 |
| CH-002 | 2026-04-06 | 설계 문서 6종 + 핸드오프 생성 | 01-architect | design/* | 완료 |
| CH-003 | 2026-04-06 | 설계 QA 수행 — FAIL 판정 (Critical 1건) | 02-design-qa | qa/design/* | 완료 |
| CH-004 | 2026-04-06 | 원본 요구사항정의서(CLOUD-REQ-001) 검토 후 3건 반영: ①FR ID 추적성, ②파레토 차트, ③NFR-05 | 01-architect (사용자 지시) | brd.md(v1.1), feature-decomposition.md(v1.1), component-spec.md(v1.1) | 완료 |
| CH-005 | 2026-04-06 | QA 회귀 DQA-001~009 전수 반영: COST_DATA 엔티티, 대시보드 기능분해, 배치선택로직, 컴포넌트Props, Phase2, 비밀번호API, 상태관리 | 01-architect (QA 회귀) | data-model(v1.2), feature-decomposition(v1.1), component-spec(v1.1), api-spec, dummy-data-spec | 완료 |
| CH-006 | 2026-04-06 | 설계 QA 재검토 — PASS 판정 (이전 9건 해소, 신규 Major 1 / Minor 3) | 02-design-qa | qa/design/design-qa-report.md(v2.0) | 완료 |
| CH-007 | 2026-04-06 | 설계 리뷰 — 조건부 승인 (DQA-010 batch_id nullable 조건, Minor 4건) | 03-design-reviewer | review/design/verdict.md, feedback.md | 완료 |
| CH-008 | 2026-04-06 | 프로토타입 구현 — 5개 화면(대시보드/업로드/리포트/리포트상세/구독관리) + GNB + 모달, Shinhan DS 적용, ECharts/AG Grid 적용 | 04-prototyper | dev/*, prototype/* | 완료 |

---

## 8. 미결 사항

| ID | 내용 | 제기자 | 영향 | 우선순위 | 상태 | 설계 가정 |
|----|------|-------|------|---------|------|----------|
| OPEN-001 | MVP 필수 Top 6 리포트 최종 선정 | BRD | 리포트 라이브러리, Sprint 1~2 | 높음 | 미결 | R01~R06 가정 (feature-decomposition §2) |
| OPEN-002 | 표준 데이터 스키마(필수 컬럼·타입) 확정 | BRD/TRD | Schema Mapper, Aggregation Engine | 높음 | 미결 | 14개 컬럼 가정 (data-model §3) |
| OPEN-003 | 계정/부서별 템플릿 열람 권한 범위 | BRD | 접근 제어, 메뉴 구조 | 높음 | 미결 | ROLE_VIEWER 소속부서 제한 |
| OPEN-004 | 구독 발송일 휴일 시 익영업일 순연 여부 | BRD | Subscription Scheduler | 높음 | 미결 | 익영업일 순연 가정 |
| OPEN-005 | Spring Security 인증 방식 (JWT vs 세션) | TRD | 인증/인가 전체 | 높음 | 미결 | JWT 가정 |
| OPEN-006 | 파일 스토리지 선택 (S3 vs 로컬 볼륨 vs GCS) | TRD | 업로드·리포트 저장 | 중간 | 미결 | 로컬 볼륨 + 추상화 |
| OPEN-007 | PDF 렌더링 라이브러리 (iText vs JasperReports) | TRD | PDF Generator | 중간 | 미결 | iText 가정 |
| OPEN-008 | 이메일 발송 서비스 최종 선정 | TRD | Subscription Scheduler | 높음 | 미결 | JavaMailSender 추상화 |

---

## 9. 핸드오프 이력

| 일시 | From | To | 유형 | 전달 | 지시 요약 |
|------|------|-----|------|------|----------|
| 2026-04-06 | 스캐폴더 | 01-architect | 초기 | docs/brd.md, docs/trd.md, docs/context-ledger.md | BRD/TRD 기반 설계 문서 + Context Ledger 초기화 시작 |
| 2026-04-06 | 01-architect | 02-design-qa | 정방향 | design/* 6종 + docs/context-ledger.md | 설계 QA 수행 요청 — 상세는 design/handoff-to-qa.md 참조 |
| 2026-04-06 | 02-design-qa | 01-architect | QA즉시회귀 | qa/design/design-qa-report.md | Critical 1건(COST_DATA 누락) + High 2건 — 상세는 QA 보고서 참조 |
| 2026-04-06 | 02-design-qa | 03-design-reviewer | 정방향 | qa/design/design-qa-report.md(v2.0) | 재QA PASS — Major 1(DQA-010 batch_id), Minor 3(번호 중복) |
| 2026-04-06 | 03-design-reviewer | 04-prototyper | 조건부 승인 | review/design/*, design/*, docs/brd.md, docs/context-ledger.md | 조건부 승인 — DQA-010 batch_id nullable 처리, 섹션 번호 정리, Shinhan Web Design System + ECharts + AG Grid 적용 |
| 2026-04-06 | 04-prototyper | (사용자) | 컨펌 요청 | dev/*, prototype/*, docs/context-ledger.md | 프로토타입 5개 화면 구현 완료, 브라우저 확인 후 피드백 요청 |

---

## 10. 설계 회귀 이력

| ID | 일시 | 발생 에이전트 | 사유 | 영향 | 재작업 대상 |
|----|------|-------------|------|------|-----------|
| REG-001 | 2026-04-06 | 02-design-qa | Critical: COST_DATA 엔티티 누락 — 파싱된 비용 데이터 저장 테이블 없어 리포트 생성·대시보드 집계 불가 | data-model, feature-decomposition, api-spec, dummy-data-spec, component-spec | DQA-001~005 (5개 이슈) |

---

## 11. 보안 점검 이력

| 회차 | 일시 | 취약(C/H/M/m) | 라이선스 이슈 | 결과 |
|------|------|---------------|-------------|------|
