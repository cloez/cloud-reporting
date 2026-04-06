# 클라우드 비용 리포팅 자동화

> BRD v1.0 + TRD v1.1 기반 바이브코딩 스캐폴드
> 생성일: 2026-04-06 | GO LIVE 목표: 2026-05-15

---

## 프로젝트 소개

Cloud Ops Team의 매월 수작업 클라우드 비용 리포트를 **웹 애플리케이션으로 완전 자동화**합니다.

**핵심 목표**:
- 리포트 준비 시간 **80% 단축**
- 수기 입력 오류 **0건**
- 구독 발송 정시 성공률 **99% 이상**

**MVP 기능 6종**: 데이터 업로드·검증 / 리포트 라이브러리 / Excel 자동 생성 / 즉시 다운로드 / 구독 발송 / 필터링·검색

---

## 시작하기

### 1. 사전 준비

- [Claude Code](https://claude.ai/code) 설치
- VS Code 설치
- Node.js 18+ (프로토타입 실행용)
- Docker Desktop (구현 단계)

### 2. 프로젝트 열기

```powershell
# 압축 해제 후 VS Code로 열기
code cloud-cost-reporting
```

### 3. Claude Code에서 에이전트 실행

새 Claude Code 대화를 열고:

```
CLAUDE.md와 agents/01-architect.md를 읽고 설계를 시작하세요.
```

---

## 에이전트 파이프라인

| 단계 | 에이전트 파일 | 역할 | 실행 명령 예시 |
|------|-------------|------|-------------|
| ① | `agents/01-architect.md` | 설계 문서 + Context Ledger 생성 | `01-architect.md를 읽고 설계를 시작하세요` |
| ② | `agents/02-design-qa.md` | 설계 검증 (커버리지·일관성·완성도) | `02-design-qa.md를 읽고 QA를 수행하세요` |
| ③ | `agents/03-design-reviewer.md` | 설계 승인 게이트 | `03-design-reviewer.md를 읽고 리뷰하세요` |
| ④ | `agents/04-prototyper.md` | 프로토타입 구현 + **사용자 컨펌** | `04-prototyper.md를 읽고 프로토타입을 만드세요` |
| ⑤ | `agents/05-prototype-qa.md` | 프로토타입 검증 | `05-prototype-qa.md를 읽고 QA를 수행하세요` |
| ⑥ | `agents/06-prototype-reviewer.md` | 프로토타입 확정 게이트 | `06-prototype-reviewer.md를 읽고 리뷰하세요` |
| ⑦ | `agents/07-builder.md` | 프로덕션 구현 + **사용자 컨펌** | `07-builder.md를 읽고 구현을 시작하세요` |
| ⑧ | `agents/08-build-qa.md` | 구현 품질 검증 | `08-build-qa.md를 읽고 QA를 수행하세요` |
| ⑨ | `agents/09-security-qa.md` | KISA 49개 보안점검 | `09-security-qa.md를 읽고 보안 점검하세요` |
| ⑩ | `agents/10-final-reviewer.md` | 배포 최종 승인 | `10-final-reviewer.md를 읽고 최종 리뷰하세요` |

### 사용자 컨펌 포인트

④ 프로토타입, ⑦ 구현 완료 후 **반드시 브라우저에서 직접 확인**하고 컨펌해야 다음 단계로 진행합니다.

- 리뷰 양식: `docs/user-review-template.md`
- 프로토타입 실행: `npx serve ./dev` → Chrome에서 확인
- 프로덕션 실행: `docker-compose up` → Chrome에서 확인

---

## 주요 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React SPA |
| 차트 | Apache ECharts (**변경 금지**) |
| 그리드 | AG Grid (**변경 금지**) |
| 백엔드 | Spring Boot + REST API |
| DB | PostgreSQL |
| 인증 | Spring Security + JWT + RBAC |
| AI | Claude API (서버사이드 전용) |
| 컨테이너 | Docker + Docker Compose |
| 디자인 | Shinhan Web Design System |
| 폰트 | Pretendard |

---

## 폴더 구조

```
cloud-cost-reporting/
├── CLAUDE.md                   ← Claude Code 프로젝트 메모리 (필독)
├── README.md
├── .claude/
├── agents/                     ← 10개 에이전트 프롬프트
├── docs/                       ← BRD, TRD, Context Ledger
├── design/                     ← ① 설계 산출물
├── prototype/                  ← ④ 프로토타입 문서
├── dev/                        ← ④ 프로토타입 코드 (npx serve ./dev)
├── build/                      ← ⑦ 구현 문서
├── prod/                       ← ⑦ 프로덕션 코드 (docker-compose up)
├── qa/
│   ├── design/                 ← ② QA 보고서
│   ├── prototype/              ← ⑤ QA 보고서
│   ├── build/                  ← ⑧ QA 보고서
│   └── security/               ← ⑨ KISA 49개 보안점검 보고서
└── review/
    ├── design/                 ← ③ 리뷰어 판정
    ├── prototype/              ← ⑥ 리뷰어 판정
    └── final/                  ← ⑩ 최종 판정
```

---

## 핵심 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| BRD | `docs/brd.md` | 비즈니스 요구사항 (기능, 사용자 역할, 성공 기준) |
| TRD | `docs/trd.md` | 기술/보안 요구사항 (스택, Shinhan 디자인 시스템, 보안) |
| Context Ledger | `docs/context-ledger.md` | **단일 진실 원천** — 파이프라인 전 이력 |
| 사용자 리뷰 양식 | `docs/user-review-template.md` | 사용자 컨펌 시 사용 |

---

## 미결 사항 (설계 시 가정 필요)

| # | 내용 | 기한 |
|---|------|------|
| OPEN-001 | MVP 필수 Top 6 리포트 최종 선정 | Apr W1 |
| OPEN-002 | 표준 데이터 스키마 확정 | Apr W1 |
| OPEN-003 | 계정/부서별 권한 범위 | Apr W1 |
| OPEN-005 | Spring Security 인증 방식 (JWT vs 세션) | Apr W1 |
| OPEN-006 | 파일 스토리지 선택 | Apr W2 |

> 설계 에이전트(①)가 미확정 항목을 **합리적으로 가정**하고 명시한 뒤 진행합니다.
> 실제 확정 시 Context Ledger를 통해 변경 사항을 추적합니다.

---

## 일정

| 마일스톤 | 목표 시점 |
|---------|----------|
| M2: 시스템 설계 & UI 시안 | 2026 Apr W1 |
| Sprint 1: 데이터 업로드 모듈 | 2026 Apr W2~W3 |
| Sprint 2 (M3 Alpha): 리포트 생성 | 2026 Apr W3~W4 |
| Sprint 3: 팝업 UI / 구독 발송 | 2026 May W1 |
| M4 Beta: 통합 테스트 & UAT | 2026 May W2 |
| **GO LIVE** | **2026-05-15** |
