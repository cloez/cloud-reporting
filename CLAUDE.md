# CLAUDE.md — 클라우드 비용 리포팅 자동화

> Claude Code가 이 프로젝트를 열 때 가장 먼저 읽는 파일입니다.
> 모든 에이전트는 작업 전 반드시 이 파일과 `docs/context-ledger.md`를 읽으세요.

---

## 프로젝트 개요

**프로젝트명**: 클라우드 비용 리포팅 자동화 (Cloud Cost Reporting Automation)
**목적**: 매월 수작업으로 생성하던 클라우드 비용 리포트를 웹 애플리케이션으로 완전 자동화
**GO LIVE**: 2026-05-15
**문서 위치**: `docs/brd.md` (비즈니스), `docs/trd.md` (기술/보안)

---

## 에이전트 파이프라인

```
[요구사항] → ① 설계 → ② 설계QA → ③ 설계리뷰
→ ④ 프로토타입(사용자컨펌) → ⑤ 프로토타입QA → ⑥ 프로토타입리뷰
→ ⑦ 구현(사용자컨펌) → ⑧ 구현QA → ⑨ 보안점검QA → ⑩ 최종리뷰 → [완료]
```

### 에이전트 실행 방법

Claude Code에서 새 대화를 열고 다음 명령으로 에이전트를 시작합니다:

```
agents/01-architect.md 파일을 읽고 지시에 따라 설계를 시작하세요.
```

각 에이전트 완료 후 다음 에이전트로 핸드오프:
```
agents/02-design-qa.md 파일을 읽고 설계 QA를 수행하세요.
```

### 사용자 컨펌 (④ 프로토타입, ⑦ 구현)

프로토타입/프로덕션 완성 후 **반드시 사용자 확인을 받은 뒤** QA로 진행합니다.

1. 에이전트가 실행 명령을 알려줍니다 (`npx serve ./dev` 또는 `docker-compose up`)
2. 브라우저에서 직접 확인 후 `docs/user-review-template.md`로 피드백 작성
3. 컨펌 완료 후 에이전트에게 전달 → 다음 단계 진행

---

## 폴더 구조

```
cloud-cost-reporting/
├── .claude/
│   └── settings.local.json
├── agents/                     ← 10개 에이전트 프롬프트
│   ├── 01-architect.md         설계
│   ├── 02-design-qa.md         설계 QA
│   ├── 03-design-reviewer.md   설계 리뷰어
│   ├── 04-prototyper.md        프로토타입 + 사용자컨펌
│   ├── 05-prototype-qa.md      프로토타입 QA
│   ├── 06-prototype-reviewer.md 프로토타입 리뷰어
│   ├── 07-builder.md           구현 + 사용자컨펌
│   ├── 08-build-qa.md          구현 QA
│   ├── 09-security-qa.md       보안점검 QA (KISA 49개)
│   └── 10-final-reviewer.md    최종 리뷰어
│
├── docs/                       ← 프로젝트 문서 (삭제 금지)
│   ├── brd.md                  비즈니스 요구사항
│   ├── trd.md                  기술/보안 요구사항
│   ├── context-ledger.md       ★ 단일 진실 원천 — 모든 에이전트 필독
│   ├── user-review-template.md 사용자 리뷰 양식
│   ├── user-review-prototype.md (프로토타입 컨펌 후 생성)
│   └── user-review-build.md    (구현 컨펌 후 생성)
│
├── design/                     ← ① 설계 산출물
├── prototype/                  ← ④ 프로토타입 문서
├── dev/                        ← ④ 프로토타입 실행 코드
├── build/                      ← ⑦ 구현 문서
├── prod/                       ← ⑦ 프로덕션 실행 코드
│
├── qa/
│   ├── design/                 ← ② 설계 QA 보고서
│   ├── prototype/              ← ⑤ 프로토타입 QA 보고서
│   ├── build/                  ← ⑧ 구현 QA 보고서
│   └── security/               ← ⑨ 보안점검 QA 보고서 (KISA 49개)
│
└── review/
    ├── design/                 ← ③ 설계 리뷰어 판정
    ├── prototype/              ← ⑥ 프로토타입 리뷰어 판정
    └── final/                  ← ⑩ 최종 리뷰어 판정
```

---

## 핵심 기술 제약 (절대 변경 금지)

| 항목 | 내용 |
|------|------|
| 차트 라이브러리 | **Apache ECharts** — 임의 변경 금지 |
| 그리드 라이브러리 | **AG Grid** — 임의 변경 금지 |
| AI API | **Claude API** — 서버사이드(Spring Boot)에서만 호출, 프론트엔드 직접 호출 금지 |
| 디자인 시스템 | **Shinhan Web Design System** (TRD 2절 전체) |
| 폰트 | **Pretendard** (CDN @import) |
| API 문서화 | **OpenAPI(Swagger)** 자동 생성 필수, `/swagger-ui` 경로 |
| 컨테이너 | **Docker** 기반 (docker-compose.yml 필수) |

---

## 기술 스택 요약

| 구분 | 선택 |
|------|------|
| 프론트엔드 | React SPA |
| 백엔드 | Spring Boot + REST API |
| DB | PostgreSQL |
| 인증 | Spring Security + JWT + RBAC |
| 컨테이너 | Docker + Docker Compose (로컬), K8s (운영) |

---

## 사용자 역할

| 역할 | Spring Security Role |
|------|---------------------|
| Cloud Ops 담당자 | `ROLE_OPS` |
| 경영진·실무자 | `ROLE_VIEWER` |
| 시스템 관리자 | `ROLE_ADMIN` |

---

## Context Ledger 규칙

- `docs/context-ledger.md`는 **단일 진실 원천**입니다
- 모든 에이전트는 작업 전 반드시 읽고, 작업 후 반드시 업데이트합니다
- **삭제 금지** — append only 원칙
- 충돌 시 최신 내용 우선

---

## QA 회귀 기준

| QA | 즉시 회귀 조건 |
|----|--------------|
| ② 설계 QA | Critical 1건+ 또는 High 3건+ |
| ⑤ 프로토타입 QA | Critical 1건+ 또는 High 3건+ |
| ⑧ 구현 QA | Critical 1건+ 또는 High 3건+ |
| ⑨ 보안점검 QA | Critical 1건+ 또는 High 2건+ |

---

## 주요 미결 사항 (OPEN)

| ID | 내용 | 현재 가정 |
|----|------|---------|
| OPEN-001 | MVP Top 6 리포트 유형 선정 | 설계 에이전트가 가정 명시 |
| OPEN-002 | 표준 데이터 스키마 확정 | 설계 에이전트가 합리적 가정 |
| OPEN-003 | 계정/부서별 권한 범위 | 역할 기반 초안으로 진행 |
| OPEN-005 | JWT vs 세션 | JWT 가정 |
| OPEN-006 | 파일 스토리지 | 로컬 볼륨 가정 (추상화 레이어) |
| OPEN-007 | PDF 라이브러리 | iText 가정 |
| OPEN-008 | 이메일 서비스 | JavaMailSender 추상화 |
