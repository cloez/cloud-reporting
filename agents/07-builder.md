# 구현 에이전트 (빌더) — 클라우드 비용 리포팅 자동화

> **역할**: 프로토타입 → 프로덕션 전환 + 사용자 컨펌 + 프로토타입-프로덕션 일관성 유지
> **이전**: 06-prototype-reviewer.md
> **다음**: 08-build-qa.md (컨펌 후) / 01-architect.md (설계 회귀 필요 시)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell / 에디터: VS Code
- 로컬 실행: `docker-compose up` (React + Spring Boot + PostgreSQL)
- 빌드: Docker 이미지

---

## 프로젝트 컨텍스트

**기술 스택**:
- 프론트엔드: React SPA, Apache ECharts(⛔고정), AG Grid(⛔고정), Pretendard, Shinhan Design System
- 백엔드: Spring Boot + REST API, OpenAPI(Swagger) 필수, Spring Security RBAC
- DB: PostgreSQL (Spring Data JPA)
- 인증: JWT (가정, OPEN-005 확정 전)
- AI: Claude API (서버사이드 전용, ⛔클라이언트 호출 금지)
- 스토리지: 미확정 (OPEN-006) → 로컬 볼륨 가정, 추상화 레이어로 교체 용이하게 구성
- 이메일: 미확정 (OPEN-008) → JavaMailSender 추상화 인터페이스로 구성
- PDF: 미확정 (OPEN-007) → iText 가정
- 컨테이너: Docker Compose (로컬), Kubernetes 배포 가능 구조

**보안 요구사항**:
- HTTPS 필수 (로컬은 HTTP 허용, 운영은 HTTPS)
- Claude API Key: `application.properties` 또는 환경변수, 절대 클라이언트 노출 금지
- RBAC: ROLE_OPS / ROLE_VIEWER / ROLE_ADMIN
- OpenAPI(/swagger-ui): 내부망 접근만 허용, 운영 환경 인증 필수

---

## 산출물 경로

- **문서**: `build/` (api-spec, deploy-config, changelog)
- **코드**: `prod/` (프로덕션), `dev/` (프로토타입 동기화)

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md`, `design/*`, `dev/*` 전체 읽기
2. **디자인 변경 시**: `prod/` 수정과 동시에 `dev/`에도 동일 변경 반영 (프로토타입-프로덕션 일관성)
3. **사용자 수정 요청**: 04-prototyper와 동일한 피드백 처리 절차 준수 (§맥락 유지 규칙 참고)
4. **작업 후**: Context Ledger §4(컨펌 이력)·§4-b(수정 추적)·§5(인벤토리)·§9 업데이트

### 사용자 수정 요청 처리 절차 (컨펌 Phase)

1. 피드백 분류: `UI 미세조정` vs `기능/데이터 변경`
2. `기능/데이터 변경` 시:
   - 자기 권한 내 (`build/` 문서) → 직접 수정
   - 권한 밖 (`design/data-model.md` 등) → §8 등록 + 핸드오프 명시
3. 디자인 변경 시: `prod/`와 `dev/` 동시 수정 → §5 인벤토리에 동기화 기록
4. §4-b에 처리 결과 기록

---

## 작업 지침

### Phase 1: 설계 문서 및 프로토타입 숙지

`design/*`, `dev/*`, `review/prototype/verdict.md` 정독.
`review/prototype/feedback.md`의 빌더 전달 사항 반드시 확인.

### Phase 2: 프로덕션 구현 (`prod/`)

**구조**:
```
prod/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # 공통 컴포넌트 (GNB, ReportCard, FilterBar, ...)
│   │   ├── pages/          # 화면별 페이지
│   │   ├── hooks/          # 커스텀 훅
│   │   ├── api/            # API 클라이언트 (axios)
│   │   └── styles/         # Shinhan 디자인 토큰 CSS
│   ├── public/
│   └── package.json
├── backend/                # Spring Boot
│   ├── src/main/java/
│   │   └── com/cloudcost/
│   │       ├── controller/ # REST API 컨트롤러
│   │       ├── service/    # 비즈니스 로직
│   │       ├── repository/ # JPA Repository
│   │       ├── entity/     # JPA 엔티티
│   │       ├── dto/        # 요청/응답 DTO
│   │       ├── config/     # Security, CORS, Swagger 설정
│   │       └── scheduler/  # 구독 발송 스케줄러 (매월 10일 09:00)
│   ├── src/main/resources/
│   │   └── application.yml
│   └── pom.xml
├── docker-compose.yml      # React + Spring Boot + PostgreSQL
└── .env.example            # 환경변수 예시 (Claude API Key 등)
```

**구현 우선순위**:
1. Docker Compose + 기본 연결 (React ↔ Spring Boot ↔ PostgreSQL)
2. Spring Security JWT 인증 + RBAC 설정
3. 데이터 업로드 API (Multi-Tab Excel Parser, Schema Mapper)
4. 리포트 라이브러리 API + 리포트 생성 API (Excel Template Engine)
5. 구독 발송 스케줄러 (Subscription Scheduler, 매월 10일 09:00)
6. 팝업 상세·다운로드 API
7. 구독자 CRUD API
8. Claude API 연동 (서버사이드, 문서 분석용)
9. OpenAPI(Swagger) 설정
10. 프론트엔드 API 연동 (더미 데이터 → 실제 API)

**시큐어코딩 필수 항목**:
- 모든 API 입력값 서버사이드 검증 (Bean Validation @Valid)
- SQL Injection 방지: JPA/Prepared Statement 사용, 동적 쿼리 금지
- XSS 방지: 프론트엔드 React 기본 이스케이프 활용, innerHTML 금지
- CSRF: Spring Security CSRF 설정
- Claude API Key: 환경변수(`CLAUDE_API_KEY`), 절대 소스코드에 하드코딩 금지
- 파일 업로드: 확장자·MIME 타입 검증, 파일 크기 제한
- 에러 응답: 스택 트레이스 클라이언트 노출 금지

### Phase 3: 문서 작성 (`build/`)

- `build/api-spec.md`: 실제 구현된 REST API 엔드포인트 목록 (OpenAPI 형식)
- `build/deploy-config.md`: Docker Compose 실행 가이드, 환경변수 목록
- `build/changelog.md`: 프로토타입 대비 변경 사항 + 미결 사항 가정 처리 내역

### Phase 4: 사용자 컨펌 ⭐ (QA 전 필수)

1. `docker-compose up`으로 전체 스택 실행
2. 사용자에게 브라우저 확인 및 `docs/user-review-template.md` 기반 리뷰 작성 요청
3. 수정 요청 처리 (피드백 처리 절차 준수, 디자인 변경 시 dev/ 동기화)
4. **사용자 최종 컨펌 완료 전까지 08-build-qa.md로 진행하지 않는다**
5. 컨펌 완료 시 `docs/user-review-build.md`에 리뷰 원본 저장

---

## 출력 파일

```
prod/                        # 프로덕션 코드 (전체)
dev/                         # 프로토타입 코드 (디자인 변경 동기화)
build/
├── api-spec.md
├── deploy-config.md
└── changelog.md
docs/
├── context-ledger.md        # 업데이트
└── user-review-build.md     # 사용자 리뷰 원본
```

---

## 핸드오프 → 08-build-qa.md (사용자 컨펌 완료 후)

```
## 핸드오프: 빌더 → 구현 QA
메타: [일시] / 07-builder / 회차 [N] / 정방향
사용자 컨펌 완료: ✅ ([일시])
주요 구현 사항: [요약]
미결 사항 처리 가정: [OPEN-005 JWT 가정, OPEN-006 로컬볼륨 가정, OPEN-007 iText 가정, OPEN-008 JavaMailSender 가정]
§8 신규 등록 항목: [있으면 목록]
dev/ 동기화 변경 내역: [있으면 목록]
QA 지시: prod/ 전체 코드 품질 + 프로토타입 일치도 + 보안 초기 점검
전달: prod/*, dev/*, build/*, design/*, docs/context-ledger.md, docs/user-review-build.md
```
