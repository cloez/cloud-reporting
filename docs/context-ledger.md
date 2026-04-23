# Context Ledger — 클라우드 비용 리포팅 자동화

> **최종 업데이트**: 2026-04-16 by 04-prototyper (v2.2 — 엔티티/모달 표준화 라운드)
> **현재 단계**: ④ 프로토타입 v2.2 보강 완료 → 사용자 컨펌 대기
> **파이프라인 상태**: 정상
>
> **참조 문서**:
> - `review/design/handoff-to-prototyper.md` — 설계 v3.0 → 프로토타이퍼 핸드오프 (조건 1~5)
> - `prototype/handoff-to-architect.md` — 사용자 피드백 라운드 산출(이전 라운드)
>
> **이번 라운드 주요 변경 (v2 보강 P-01~P-10)**:
> 1. 3트랙 해시 라우팅 도입 (`#/admin/*`, `#/t/{slug}/admin/*`, `#/t/{slug}/c/{contractId}/*`)
> 2. 5권한 모델 적용 (SYS_ADMIN / SYS_OPS / TENANT_ADMIN / TENANT_APPROVER / TENANT_USER)
> 3. 3분할 로그인 화면 (시스템 / 테넌트별)
> 4. GNB 3변형 (system 어두운 톤 / tenant-admin 보라 그라데이션 / tenant-user 화이트)
> 5. 시스템·테넌트 콘솔 홈 신규 화면 2종
> 6. ContractSelector + 혼합 통화 배지 + 마스킹 합계 인디케이터
> 7. Mock 사용자 28명(시스템 4 + 테넌트 24) — Tenant ID 정본(AD000001K3 / AD000002L9 / AD000003M2) 적용
> 8. RoleGuard — 5권한×경로 이중 검증 (Mock)
> 9. SubAccount 기반 마스킹 데모 (TenantUserScope 117건)
> 10. TENANT_APPROVER 승인함 placeholder
>
> **이전 라운드(2026-04-15)에서 누적된 변경(v1 보강)도 모두 보존**:
> - 시스템 감사 로그 화면(`#/admin/audit-logs`)
> - 리포트 XLSX/PDF 다운로드 (ExcelJS + jsPDF + html2canvas)
> - GNB 지터 방지(`scrollbar-gutter: stable`)
> - 그리드 카드 세로 리사이즈 + localStorage 영속화 + 카드 우하단 모서리 핸들(3줄)

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
| ① 설계 | ✅ | Architect | 2026-04-06 | 2026-04-16 | v1.2 → v3.0 — 멀티테넌트·5권한·3트랙·계약/계정 계층 도입 |
| ② 설계 QA | ✅ | Design QA | 2026-04-06 | 2026-04-16 | v4.0 PASS — DQA-v3-001~007 정리 |
| ③ 설계 리뷰 | ✅ | Design Reviewer | 2026-04-06 | 2026-04-16 | v2.0 조건부 승인 — 5건 (조건 1·2 필수 / 조건 3·4 권장 / 조건 5 선택) |
| ④ 프로토타입 v1 | ✅ | Prototyper | 2026-04-06 | 2026-04-06 | 5개 화면 + GNB + 모달 |
| ④-a v1 사용자 컨펌 | ✅ | (사용자) | 2026-04-06 | 2026-04-15 | 추가 요구 누적 → 감사 로그·다운로드·리사이즈 등 v1 보강 |
| ④ 프로토타입 v2 보강 | ✅ | Prototyper | 2026-04-16 | 2026-04-16 | P-01~P-10 — 3트랙·5권한·로그인 3분할·콘솔 홈·마스킹 데모 |
| ④-a v2 사용자 컨펌 | 🔄 | (사용자) | 2026-04-16 | | 브라우저 확인 후 피드백 대기 |
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
| 7 | ④-a 사용자 컨펌 → ① 설계 | 🔙 설계회귀 (REG-002) | 사용자 요구로 멀티테넌트·5권한·계약/계정 계층·`/t/{slug}` 라우팅 도입 → v2.0 설계 착수 |
| 8 | ① 설계 v2.0 → ② QA → ③ 리뷰 | 회귀 → 조건부 승인 | v2.0 add-on 회귀 패턴 → v3.0 회귀 → v4.0 QA PASS → 조건부 승인(조건 5건) |
| 9 | ④ 프로토타입 v2 보강 (현재) | 정방향 | P-01~P-10 구현, 28명 시드, FK 무결성 0 orphan(엔티티 5/6), 사용자 컨펌 대기 |

---

## 4. 사용자 컨펌 이력

| 회차 | 단계 | 일시 | 피드백 요약 | 리뷰 원본 | 결과 |
|------|------|------|-----------|----------|------|
| 1 | ④-a v1 | 2026-04-06 ~ 04-15 | 멀티테넌트·5권한 도입(REG-002), 감사 로그·다운로드 MVP 승격 | 누적 채팅 요청 | 설계회귀 + v1 보강 |
| 2 | ④-a v2 | 2026-04-16 | (대기) | — | — |

## 4-b. 사용자 수정 요청 추적

| ID | 단계 | 피드백 원문 | 변경 유형 | 영향 아티팩트 | 코드 수정 | 문서 반영 | §8 등록 | 상태 |
|----|------|-----------|----------|-------------|----------|----------|--------|------|
| FB-001 | ④-a v1 | "시스템 감사 로그 화면이 필요해…" | 신규 화면+MVP 승격 | dev/*, design/dummy-data, BRD | ✅ | ✅ | NEW-AUDIT-01~06 | 완료 |
| FB-002 | ④-a v1 | "다운로드 기능(excel, pdf) 프로토타입 구현해 줘" | 신규 기능 | dev/index.html, app.js | ✅ | ✅ | OPEN-007 해소 필요 | 완료 |
| FB-003 | ④-a v1 | "GNB 영역은 절대 따라 움직이지 않았으면" | UX 미세조정 | dev/styles.css | ✅ | ✅ | — | 완료 |
| FB-004 | ④-a v1 | "테이블이 포함된 카드의 세로 크기는 사용자가 조정할 수 있도록" | UX 표준 | dev/app.js, styles.css | ✅ | ✅ | — | 완료 |
| FB-005 | ④-a v1 | "리사이즈 핸들 위치/줄 수 조정" | UX 미세조정 | dev/styles.css | ✅ | ✅ | — | 완료 |
| FB-006 | ④-a v2 | "이전 에이전트의 작업 이어받아 미구현 화면 프로토타입 작성" | 대형 보강 (P-01~P-10) | dev/* 전체 | ✅ | ✅ | — | 완료 |

---

## 5. 아티팩트 인벤토리

| 아티팩트 | 경로 | 버전 | 최종 수정 | 수정일 |
|---------|------|------|----------|--------|
| BRD | docs/brd.md | v1.1 | 01-architect | 2026-04-06 |
| TRD | docs/trd.md | v1.1 | 스캐폴더 | 2026-04-06 |
| Context Ledger | docs/context-ledger.md | v0.6 | 04-prototyper | 2026-04-16 |
| 기능 분해표 | design/feature-decomposition.md | v3.0 | 01-architect | 2026-04-16 |
| 데이터 모델 | design/data-model.md | v3.0 | 01-architect | 2026-04-16 |
| 화면 흐름도 | design/screen-flow.md | v3.0 | 01-architect | 2026-04-16 |
| 컴포넌트 설계서 | design/component-spec.md | v3.0 | 01-architect | 2026-04-16 |
| API 설계서 | design/api-spec.md | v3.0 | 01-architect | 2026-04-16 |
| 더미 데이터 스펙 | design/dummy-data-spec.md | v3.1 | 04-prototyper (조건 1·2 정본 통일 반영) | 2026-04-16 |
| 핸드오프 문서 (설계→QA) | design/handoff-to-qa.md | v3.0 | 01-architect | 2026-04-16 |
| 설계 QA 보고서 v4 | qa/design/design-qa-report-v4.md | v4.0 PASS | 02-design-qa | 2026-04-16 |
| 설계 리뷰 판정 v2 | review/design/verdict-v2.md | v2.0 조건부 승인 | 03-design-reviewer | 2026-04-16 |
| 설계 리뷰 피드백 v2 | review/design/feedback-v2.md | v2.0 | 03-design-reviewer | 2026-04-16 |
| 설계→프로토타이퍼 핸드오프 | review/design/handoff-to-prototyper.md | v1.0 | 03-design-reviewer | 2026-04-16 |
| 프로토타입 화면 목록 | prototype/screen-inventory.md | v2.0 | 04-prototyper | 2026-04-16 |
| 프로토타입 UX 결정 | prototype/ux-decisions.md | v2.0 | 04-prototyper | 2026-04-16 |
| 프로토타이퍼→아키텍트 핸드오프(v1 보강) | prototype/handoff-to-architect.md | v1.0 | 04-prototyper | 2026-04-15 |
| 프로토타입 HTML | dev/index.html | v2.0 | 04-prototyper | 2026-04-16 |
| 프로토타입 스타일 | dev/styles.css | v2.0 | 04-prototyper | 2026-04-16 |
| 프로토타입 앱 로직 | dev/app.js | v2.0 (~3700 라인) | 04-prototyper | 2026-04-16 |
| 프로토타입 더미 데이터 | dev/data.js | v2.0 (28명+멀티테넌트) | 04-prototyper | 2026-04-16 |

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
| CH-009 | 2026-04-15 | v1 보강(사용자 피드백 라운드): 시스템 감사 로그 화면 + 로깅 패턴, 리포트 XLSX/PDF 다운로드, GNB 지터 방지, 그리드 카드 리사이즈+영속화, 핸들 위치/줄 수 조정 | 04-prototyper (사용자 피드백 FB-001~005) | dev/*, prototype/handoff-to-architect.md | 완료 |
| CH-010 | 2026-04-16 | 설계회귀 REG-002 → v3.0 회귀: 멀티테넌트(TENANT 엔티티) + 5권한 + 계약/계정 계층 + 3트랙 라우팅(`/admin/*`, `/t/{slug}/admin/*`, `/t/{slug}/c/{contractId}/*`) + GNB 3변형 도입 | 01-architect | design/* (전 7종 v3.0), data-model 19엔티티 | 완료 |
| CH-011 | 2026-04-16 | v2.0 설계 QA → v4.0 PASS, v2.0 리뷰 조건부 승인(조건 5건) | 02-design-qa, 03-design-reviewer | qa/design/design-qa-report-v4.md, review/design/verdict-v2.md, feedback-v2.md, handoff-to-prototyper.md | 완료 |
| CH-012 | 2026-04-16 | v2 보강 P-01~P-10 구현(사용자 피드백 FB-006): 3트랙 라우터, 5권한 RoleGuard, 3분할 로그인, GNB 3변형, 시스템·테넌트 콘솔 홈, ContractSelector, 마스킹 합계 인디케이터, 28명 시드, 117 scope, 승인함 placeholder | 04-prototyper | dev/* 전부, design/dummy-data-spec(v3.1) | 완료 |
| CH-013 | 2026-04-16 | 조건 1·2 정본화: dummy-data-spec §3/§5/§7/§11 Tenant ID(AD000001K3 / AD000002L9 / AD000003M2)·Contract 접두사(SHC/SHL/SDS) 일괄 통일 | 04-prototyper | design/dummy-data-spec.md(v3.1) | 완료 |
| CH-014 | 2026-04-16 | UX 결정 문서 v2 보강: UXD-009~012(v1 보강) + UXD-013~018(v2 보강) 신설, UXD-003·004를 OBSOLETE 처리하고 대체 결정 매핑 | 04-prototyper | prototype/ux-decisions.md(v2.0) | 완료 |
| CH-015 | 2026-04-16 | v2 신규 화면 4종(테넌트 관리/계약 관리/CUR 컬럼 별칭/권한 위임) 표준 그리드 카드 패턴 적용 — Excel 익스포트 + 페이지네이션 + 리사이즈 핸들 + CRUD 모달(등록/수정/삭제) + FK 가드(테넌트→계약/사용자, 계약→클라우드계정) 일괄 구현 | 04-prototyper (사용자 피드백) | dev/app.js (renderTenantsAdmin/renderContractsAdmin/renderColumnAliases/renderScopesAdmin + openTenantModal/openContractModal/openAliasModal/openScopeEditModal 외 CRUD 일체), dev/styles.css(.grid-toolbar 좌우 24px 패딩) | 완료 |
| CH-016 | 2026-04-16 | 권한 정책 정리 — (1) CUR 컬럼 관리/업로드/컬럼 별칭을 ROLE_SYS_OPS 전용으로 이전(ROUTE_PERMISSIONS + GNB 운영 도구 dropdown + 콘솔 홈 카드 분리), (2) 사용자 관리에서 시스템↔테넌트 사용자 격리(scope=GLOBAL은 tenantId=null 사용자만, scope=TENANT는 자기 테넌트 사용자만 노출, openUserModal/saveUser 양쪽에서 ROLES.scope 기반 방어 검증), (3) 레거시 ROLE_ADMIN 체크(renderCurColumns/renderAuditLogs/renderUserManagement)를 v2 5-role(SYS_OPS/SYS_ADMIN)로 정정 | 04-prototyper (사용자 피드백) | dev/app.js (ROUTE_PERMISSIONS, renderGnbSystem, renderConsoleHome, renderUserManagement, openUserModal, saveUser, renderCurColumns, renderAuditLogs) | 완료 |
| CH-017 | 2026-04-16 | 테넌트 엔티티 확장 — 13 고객정보 필드(고객ID 자동생성 AD\d{6}[A-Z0-9]{2}, 고객명, slug, 고객구분 4종 CORP/INDIV/INTERNAL/GROUP, 사업자등록번호, 법인등록번호, 대표자명, 업종/업태, 고객상태 4종 ACTIVE/DORMANT/SUSPENDED/TERMINATED, 가입일, 해지일, 관리자 이메일) + 테넌트관리자 1명 등록 필수(아이디/이름/부서/직책/전화/이메일) — 등록 시 USERS에 ROLE_TENANT_ADMIN 자동 생성·tenantId 연결, 테넌트 그리드 14개 컬럼 노출, 로그인 컨텍스트 배지 단축(테넌트명만) | 04-prototyper (사용자 피드백) | dev/app.js (generateTenantId/openTenantModal/saveTenant/renderTenantsAdmin, 로그인 배지), dev/data.js (TENANTS 3건 신규 필드 보강) | 완료 |
| CH-018 | 2026-04-16 | 계약 엔티티 확장 — 계약유형 5종(DIRECT/AGENT/MSP/RESELL/INTERNAL), 정산주기 4종(MONTHLY/QUARTERLY/SEMIANNUAL/YEARLY), 세금적용방식 3종(VAT_INCLUDED/VAT_EXCLUDED/TAX_FREE), 결제조건 3종(POSTPAID/PREPAID/MONTH_END), 청구서 발행 기준일(1~28), 납부기한(0~180일) 신설. 계약 모달 2섹션 분리(계약 정보 / 과금·정산 조건) + 범위·종료일 검증, 계약 그리드에 8개 신규 컬럼 노출(라벨화) | 04-prototyper (사용자 피드백) | dev/app.js (openContractModal/saveContract/renderContractsAdmin), dev/data.js (CONTRACTS 6건 신규 필드 보강) | 완료 |
| CH-019 | 2026-04-16 | 모달 상호작용 표준 강화 — (1) 모달 오버레이 외부 클릭 차단(modal-overlay onclick 제거), (2) Tab/Shift+Tab 포커스 트랩(activateModalTrap/deactivateModalTrap, 모달 내부 focusable 순환), (3) ESC 닫기는 유지(접근성), (4) 9개 모달 open 함수 전부 적용(Tenant/Contract/Alias/Scope/ReportPreview/Subscriber/CurColumn/User/PasswordChange) — closeModal에서 트랩 정리. 공통 정책으로 향후 모든 모달은 overlay.classList.add('active') 직후 activateModalTrap(modal) 호출 의무 | 04-prototyper (사용자 피드백) | dev/app.js (closeModal/activateModalTrap, initAppShell modal-overlay, 9개 open*Modal 함수) | 완료 |

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
| OPEN-009~017 | (멀티테넌트·5권한 도입 관련) — handoff-to-prototyper §8.1 참조 | 사용자 피드백(REG-002) | 전체 | 높음 | 사용자 컨펌됨 | v3.0 설계에 반영 |
| NEW-AUDIT-01 | audit_logs 테이블 스키마/인덱스 정식화 | FB-001 | 보안/운영 | 높음 | 미결 | 프로토타입 필드 기준 (action/target/conditions/ip/UA) |
| NEW-AUDIT-02 | 감사 로그 보관 기간/파기 정책 | FB-001 | 보안 | 높음 | 미결 | 미정 |
| NEW-AUDIT-03 | 감사 로그 조회 API 권한 (SYS_ADMIN 전용) | FB-001 | 권한 | 중간 | 미결 | 프로토타입 가정 |
| NEW-AUDIT-04 | 감사 로그 검색/필터 요건 (날짜·액션·사용자) | FB-001 | UX | 중간 | 미결 | 프로토타입 1차 반영 |
| NEW-AUDIT-05 | 감사 로그 익스포트 자체도 로그를 남기는가 | FB-001 | 운영 | 낮음 | 미결 | 프로토타입: 남긴다 |
| NEW-AUDIT-06 | 개인정보(IP/UA/검색어) 마스킹 범위 | FB-001 | 보안 | 중간 | 미결 | 미정 |
| NEW-EXP-01 | PDF 차트 임베드 방식 (이미지 vs 서버 렌더) | FB-002 | 다운로드 | 중간 | 미결 | 프로토타입: html2canvas 이미지 |
| NEW-EXP-02 | XLSX 스타일 표준 템플릿화 | FB-002 | 다운로드 | 중간 | 미결 | 프로토타입 초안 |
| NEW-EXP-03 | 다운로드 동기 vs 비동기(대용량) | FB-002 | 성능 | 중간 | 미결 | 프로토타입: 동기 |
| OPEN-018 | SUBSCRIBERS 엔티티의 멀티테넌트 이식 (contractId/tenantId 필드) | FB-006 v2 보강 | 데이터 모델 | 중간 | 미결 | 프로토타입: v1 스키마 잔존 — 다음 라운드 |
| OPEN-019 | RoleGuard 거부 사유 코드 정밀화 (NO_PERMISSION → SYSTEM_USER_TENANT 등 세분화) | FB-006 v2 보강 | UX/오류 안내 | 낮음 | 미결 | 프로토타입: 차단 동작은 정확하나 사유 라벨 보강 필요 |

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
| 2026-04-15 | 04-prototyper | 01-architect (이전 라운드 핸드오프) | v1 보강 결과 인계 | prototype/handoff-to-architect.md | 감사 로그 MVP 승격, 다운로드 라이브러리 결정, GNB·그리드 UX 표준화 등 6항목 역반영 요청 |
| 2026-04-16 | 03-design-reviewer | 04-prototyper | 정방향 (조건부 승인) | review/design/handoff-to-prototyper.md, design/* v3.0 | P-01~P-10 작업 범위 + 조건 1·2 시드 전 필수 해소 + 조건 3·4 권장 + 조건 5 선택 |
| 2026-04-16 | 04-prototyper | (사용자) | 컨펌 요청 | dev/* v2.0, prototype/* v2.0 | v2 보강 완료(3트랙·5권한·로그인 3분할·콘솔 홈·마스킹 데모·28명 시드), 브라우저 확인 후 피드백 요청 |
| 2026-04-16 | 04-prototyper | (사용자) | 컨펌 요청 (v2.1 추가 보강) | dev/* v2.1 | CH-015·CH-016 적용: v2 신규 화면 4종 표준 그리드 카드(Excel/페이징/리사이즈/CRUD) + 권한 정책 정리(CUR=SYS_OPS, 사용자 관리 시스템↔테넌트 격리, 레거시 ROLE_ADMIN 정정), 브라우저 재확인 요청 |
| 2026-04-16 | 04-prototyper | (사용자) | 컨펌 요청 (v2.2 엔티티/모달 표준화) | dev/* v2.2 | CH-017~019 적용: 테넌트 13필드 + 관리자 1명 강제, 계약 12필드(유형 5/정산 4/세금 3/결제 3 + 기준일/기한), 모달 외부 클릭 차단·Tab 포커스 트랩(9개 모달 일괄), 브라우저 재확인 요청 |

---

## 10. 설계 회귀 이력

| ID | 일시 | 발생 에이전트 | 사유 | 영향 | 재작업 대상 |
|----|------|-------------|------|------|-----------|
| REG-001 | 2026-04-06 | 02-design-qa | Critical: COST_DATA 엔티티 누락 — 파싱된 비용 데이터 저장 테이블 없어 리포트 생성·대시보드 집계 불가 | data-model, feature-decomposition, api-spec, dummy-data-spec, component-spec | DQA-001~005 (5개 이슈) |
| REG-002 | 2026-04-13 | (사용자) | 멀티테넌트·5권한·계약/계정 계층·`/t/{slug}` 라우팅 도입 — v1 단일 테넌트로는 신한 그룹사 다수 운영 불가 | design/* 7종 전수, dev/* 전수 | v3.0 회귀(11개 신규 엔티티, 19개 총 엔티티) |

---

## 11. 보안 점검 이력

| 회차 | 일시 | 취약(C/H/M/m) | 라이선스 이슈 | 결과 |
|------|------|---------------|-------------|------|
