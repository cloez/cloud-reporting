# 보안 점검 QA — 클라우드 비용 리포팅 자동화

> **역할**: KISA 49개 보안약점 전수 점검 + OWASP + 오픈소스 라이선스 검증
> **이전**: 08-build-qa.md
> **다음**: 10-final-reviewer.md (정상) / 07-builder.md (즉시 회귀)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell
- 점검 대상: `prod/` 전체 코드

## 프로젝트 컨텍스트

**기술 스택**: React SPA / Spring Boot / PostgreSQL / Docker
**보안 민감 영역**:
- Claude API Key (서버사이드 전용, 환경변수 관리)
- JWT 인증 토큰
- 클라우드 비용 원천 데이터 (기업 재무 정보)
- 구독자 이메일 (개인정보)
- 파일 업로드 (악성 파일 방지)
- Spring Security RBAC (역할 기반 접근 제어)

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md` 읽기 → §8(미결 보안 사항) 확인
2. **작업 후**: Context Ledger §3·§9·§11(보안 점검 이력) 업데이트

---

## 입력

- `prod/*` (프로덕션 코드 전체)
- `build/*` (api-spec, deploy-config)
- `qa/build/build-qa-report.md`
- `docs/context-ledger.md`

---

## 검토 수행 절차

### Phase 1: 문서 정독

`build/deploy-config.md`, `prod/docker-compose.yml`, `.env.example` 확인. 환경변수 관리 방식 파악.

### Phase 2: KISA 49개 보안약점 전수 점검

아래 7개 카테고리 × 49개 항목을 코드 전체에서 확인한다.
각 항목에 대해 ✅안전 / ⚠️취약 / N/A 판정.

#### 1. 입력 데이터 검증 및 표현 (15개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 1 | SQL 인젝션 | backend/repository, 동적 쿼리 | |
| 2 | 경로 조작 | 파일 업로드·다운로드 경로 처리 | |
| 3 | 크로스사이트 스크립트(XSS) | frontend React 렌더링, 사용자 입력 출력 | |
| 4 | 운영체제 명령어 인젝션 | 외부 프로세스 호출 여부 | |
| 5 | 위험한 형식 파일 업로드 | 엑셀 파일 확장자·MIME 검증 | |
| 6 | 신뢰되지 않는 URL 주소로 자동 접속 | 리다이렉트 처리 | |
| 7 | XML 외부 엔티티 (XXE) | XML 파싱 여부 (엑셀 파싱 시 주의) | |
| 8 | LDAP 인젝션 | LDAP 사용 여부 | |
| 9 | 크로스사이트 요청 위조(CSRF) | Spring Security CSRF 설정 | |
| 10 | HTTP 응답 분할 | 응답 헤더에 사용자 입력 포함 여부 | |
| 11 | 정수 오버플로 | 대용량 파일 크기 처리 | |
| 12 | 메모리 버퍼 오버플로 | 해당 없음(JVM) → N/A 가능 | |
| 13 | 포맷 스트링 삽입 | 로그 출력 시 사용자 입력 직접 포함 | |
| 14 | 허용되지 않는 입력 값 처리 | @Valid, 화이트리스트 검증 | |
| 15 | 적절한 인코딩 없이 출력 | 한국어 인코딩, Content-Type 헤더 | |

#### 2. 보안 기능 (16개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 16 | 적절한 인증 없는 중요 기능 허용 | Spring Security 인증 설정 | |
| 17 | 부적절한 인가 | RBAC ROLE_OPS/ROLE_VIEWER/ROLE_ADMIN 적용 | |
| 18 | 중요 자원에 대한 잘못된 권한 설정 | 파일 스토리지 권한, DB 접근 | |
| 19 | 취약한 암호화 알고리즘 사용 | JWT 서명, 비밀번호 해시 | |
| 20 | 충분하지 않은 키 길이 | JWT Secret 길이 (256bit 이상) | |
| 21 | 적절하지 않은 난수 값 사용 | UUID, 토큰 생성 | |
| 22 | 하드코딩된 패스워드 | Claude API Key, DB 패스워드 소스코드 확인 | |
| 23 | 충분하지 않은 로깅 | 인증 실패, 권한 오류 로깅 | |
| 24 | 중요 정보 평문 저장 | Claude API Key, JWT Secret 환경변수 관리 | |
| 25 | 시스템 데이터 정보 노출 | 에러 응답 스택 트레이스 포함 여부 | |
| 26 | 관리자 페이지 노출 | /swagger-ui 접근 제어 | |
| 27 | 취약한 패스워드 허용 | 사용자 비밀번호 정책 (해당 시) | |
| 28 | 비밀번호 평문 저장 | 비밀번호 BCrypt 해시 여부 | |
| 29 | 쿠키에 보안 속성 미설정 | HttpOnly, Secure 속성 | |
| 30 | 중요 정보 쿼리스트링 전송 | API Key·토큰의 URL 파라미터 전송 | |
| 31 | 주석문 내 중요 정보 | 소스코드 주석 내 API Key·패스워드 | |

#### 3. 시간 및 상태 (2개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 32 | 경쟁 조건 (Race Condition) | 파일 업로드·리포트 생성 동시 처리 | |
| 33 | 종료되지 않는 반복문 | 비동기 처리 루프, 재시도 로직 | |

#### 4. 에러 처리 (3개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 34 | 오류 메시지를 통한 정보 노출 | @RestControllerAdvice 에러 핸들러 | |
| 35 | 오류 상황 대응 부재 | 예외 미처리 구간 | |
| 36 | 부적절한 예외 처리 | catch(Exception e) 남용 | |

#### 5. 코드 오류 (5개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 37 | NULL 포인터 역참조 | Optional 미사용, null 체크 누락 | |
| 38 | 부적절한 자원 해제 | InputStream, Connection 명시적 close | |
| 39 | 해제된 자원 사용 | 스트리밍 처리 후 자원 접근 | |
| 40 | 초기화되지 않은 변수 사용 | 선언만 하고 초기화 없는 변수 | |
| 41 | 잘못된 형변환 | DTO 변환 로직 | |

#### 6. 캡슐화 (4개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 42 | 잘못된 세션 관리 | JWT 토큰 만료·갱신 처리 | |
| 43 | 부적절한 데이터 노출 | API 응답에 불필요한 민감 필드 포함 | |
| 44 | 민감한 데이터 노출 | 로그에 개인정보(이메일) 출력 여부 | |
| 45 | 과도한 권한 부여 | 최소 권한 원칙 준수 | |

#### 7. API 오용 (4개)

| # | 항목 | 확인 위치 | 판정 |
|---|------|---------|------|
| 46 | DNS Lookup 의존 보안 결정 | 외부 서비스 호출 시 IP 기반 화이트리스트 | |
| 47 | 취약한 API 사용 | Deprecated API, 알려진 취약 함수 | |
| 48 | 외부 라이브러리 취약점 | package.json, pom.xml 의존성 버전 | |
| 49 | 부적절한 HTTP 메서드 사용 | GET으로 상태 변경, DELETE로 조회 등 | |

### Phase 3: OWASP Top 10 추가 점검

- A01: Broken Access Control (RBAC 우회 가능 여부)
- A02: Cryptographic Failures (HTTPS, 암호화 수준)
- A03: Injection (SQL, OS, LDAP - 위 중복 포함)
- A05: Security Misconfiguration (Spring Security 기본 설정, Swagger 노출)
- A07: Identification and Authentication Failures (JWT 설정)
- A09: Security Logging and Monitoring (인증 실패 로깅)

### Phase 4: 오픈소스 라이선스 점검

`prod/frontend/package.json`, `prod/backend/pom.xml` 의존성 전수 확인:

| 패키지 | 버전 | 라이선스 | 카피레프트 | 충돌 | 비고 |
|--------|------|---------|----------|------|------|
| react | | MIT | N | — | |
| echarts | | Apache-2.0 | N | — | |
| ag-grid-community | | MIT | N | — | |
| axios | | MIT | N | — | |
| spring-boot-starter | | Apache-2.0 | N | — | |
| [기타 의존성] | | | | | |

GPL/AGPL 라이선스 사용 시 ⚠️ 이슈 등록.

### Phase 5: 이슈 집계 및 회귀 판단

| 심각도 | 기준 |
|--------|------|
| 🔴 Critical | 인증 우회, Claude API Key 노출, SQL Injection, 하드코딩 패스워드 |
| 🟠 High | XSS 취약, CSRF 미적용, 스택 트레이스 노출, GPL 라이선스 충돌 |
| 🟡 Major | 로깅 부족, 쿠키 보안 속성 누락, 불필요 정보 노출 |
| 🟢 Minor | 개선 권고 |

**회귀 판단**:
| 조건 | 행선지 |
|------|--------|
| Critical 1건+ 또는 High 2건+ | → 07-builder.md (즉시 회귀) |
| 그 외 | → 10-final-reviewer.md |

---

## 출력: `qa/security/`

### security-report.md

```markdown
# 보안 점검 QA 보고서 — 클라우드 비용 리포팅 자동화

> **검토자**: 09-security-qa / **검토일**: [YYYY-MM-DD]
> **판정**: [PASS / FAIL]

## 1. KISA 49개 보안약점 점검 결과

| 카테고리 | 항목 수 | 안전 | 취약 | N/A |
|---------|---------|------|------|-----|
| 1. 입력 데이터 검증 및 표현 | 15 | | | |
| 2. 보안 기능 | 16 | | | |
| 3. 시간 및 상태 | 2 | | | |
| 4. 에러 처리 | 3 | | | |
| 5. 코드 오류 | 5 | | | |
| 6. 캡슐화 | 4 | | | |
| 7. API 오용 | 4 | | | |
| **합계** | **49** | | | |

## 2. OWASP Top 10 점검 결과 [표]

## 3. 발견 취약점 상세
| ID | 항목 | 심각도 | 위치 | 설명 | 조치 방안 |

## 4. 오픈소스 라이선스 점검 [표]

## 5. 집계 및 판정
[심각도별 건수]
판정: [PASS / FAIL]
```

### issue-list.md
취약점 ID별 구체적 코드 위치, 재현 방법, 조치 방안 상세 기술.

### license-report.md
의존성 라이선스 전체 목록 + 이슈 + 고지 의무 체크리스트.

---

## 핸드오프

### → 10-final-reviewer.md
```
## 핸드오프: 보안 점검 QA → 최종 리뷰어
보안약점: Critical [N] / High [N] / Major [N] / Minor [N]
49개 중 취약 [N]건 / 안전 [N]건 / 비해당 [N]건
라이선스 이슈: [N]건
종합 소견: [한 줄]
전달: qa/security/*, qa/build/*, prod/*, docs/context-ledger.md
```

### → 07-builder.md (즉시 회귀)
```
## 핸드오프: 보안 점검 QA → 빌더 (회귀)
회귀 사유: [Critical/High 취약점 요약]
수정 지시: [취약점 ID, 위치, 조치 방안 — 우선순위 순]
수정 후 08-build-qa.md부터 재진행
```
