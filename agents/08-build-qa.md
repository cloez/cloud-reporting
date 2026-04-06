# 구현 QA — 클라우드 비용 리포팅 자동화

> **역할**: 프로덕션 코드 품질 + 프로토타입 일치도 + 프로토타입-프로덕션 일관성 검증
> **이전**: 07-builder.md (사용자 컨펌 완료 후)
> **다음**: 09-security-qa.md (정상) / 07-builder.md (즉시 회귀)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell
- 프로덕션 실행: `docker-compose up` (prod/)
- 프로토타입 실행: `npx serve ./dev`

## 프로젝트 컨텍스트

**기술 스택**: React SPA / Apache ECharts(고정) / AG Grid(고정) / Spring Boot / PostgreSQL / Docker / JWT
**보안**: Spring Security RBAC, Claude API 서버사이드 전용, JWT 토큰
**디자인**: Shinhan Web Design System (전체 토큰 적용)

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md` 읽기 → §4-b(수정 추적), §8(미결 사항) 확인
2. **작업 후**: Context Ledger §3·§9 업데이트

---

## 입력

- `prod/*` (프로덕션 코드)
- `dev/*` (프로토타입 코드 — 동기화 확인용)
- `build/*` (api-spec, deploy-config, changelog)
- `design/*`, `prototype/*`
- `docs/context-ledger.md` (§4-b 수정 추적 테이블)

---

## 검토 수행 절차

### Phase 1: 문서 정독

`docs/context-ledger.md` §4-b, §8 확인 → 빌더가 처리한 수정 요청 및 미결 사항 파악.

### Phase 2: 기능 구현 완성도 검증

BRD MVP 6개 기능 × 프로덕션 구현 전수 확인:

| # | 기능 | 검증 항목 |
|---|------|---------|
| 1 | 데이터 업로드·검증 | API 엔드포인트, 비동기 처리, 컬럼 매핑, 오류 응답 |
| 2 | 리포트 라이브러리 | 카드 목록 API, 필터링·검색 쿼리, 역할 기반 접근 |
| 3 | 리포트 생성(Excel) | Excel 생성 API, 차트·피벗 포함, Raw Data 시트 |
| 4 | 팝업 상세·다운로드 | 다운로드 API, 권한 검증, 파일 전송 |
| 5 | 구독 발송 | 스케줄러 (매월 10일 09:00), 재시도, 실패 알림 |
| 6 | 필터링·검색 | 유형/주기/부서 필터, 키워드 검색 |

### Phase 3: 프로토타입-프로덕션 일관성 검증 ⭐

`dev/` vs `prod/frontend/src/` 비교:
- GNB 구조 (2행, sticky) 동일 여부
- 카드·버튼·배지·모달 컴포넌트 스타일 동일 여부
- 탭 메뉴 구성 동일 여부
- §4-b의 디자인 변경 항목이 dev/에도 반영되었는지

### Phase 4: 코드 품질 검증

**프론트엔드 (prod/frontend)**:
- [ ] Apache ECharts shinhanPalette 적용
- [ ] AG Grid `.ag-theme-alpine` Shinhan 오버라이드
- [ ] Pretendard 폰트 `@import`
- [ ] `:root` Shinhan 토큰 전체 정의
- [ ] `innerHTML` 직접 사용 없음 (React 기본 이스케이프)
- [ ] Claude API 호출 코드 없음 (서버사이드 전용 확인)
- [ ] UX Writing 규칙 준수 (버튼 명사형, '실패' 금지, 날짜·금액 형식)

**백엔드 (prod/backend)**:
- [ ] 모든 API 입력값 `@Valid` 검증
- [ ] JPA/Prepared Statement 사용, 동적 쿼리 없음
- [ ] Claude API Key 환경변수 처리, 소스코드 하드코딩 없음
- [ ] 에러 응답에 스택 트레이스 없음
- [ ] RBAC: ROLE_OPS / ROLE_VIEWER / ROLE_ADMIN 엔드포인트별 적용
- [ ] Subscription Scheduler cron 표현식 확인 (매월 10일 09:00)
- [ ] OpenAPI(/swagger-ui) 설정 존재

**Docker**:
- [ ] `docker-compose.yml` React + Spring Boot + PostgreSQL 3개 서비스
- [ ] `.env.example` 환경변수 목록 (API Key 포함)
- [ ] 포트 충돌 없음

### Phase 5: 사용자 수정 요청 반영 검증

§4-b 테이블 기준 전수 확인:
- `기능/데이터 변경` 항목: 코드 수정 + 문서 반영 완료 여부
- 디자인 변경 항목: dev/ 동기화 완료 여부
- §8 등록 항목: 미결 사항으로 정상 관리 여부

### Phase 6: 이슈 집계 및 회귀 판단

| 심각도 | 기준 |
|--------|------|
| 🔴 Critical | MVP 기능 미구현, Claude API 클라이언트 노출, RBAC 미적용 |
| 🟠 High | API 오류 응답 미처리, 스케줄러 오동작, 프로토타입 불일치 |
| 🟡 Major | 코드 품질 미비, OpenAPI 설정 누락 |
| 🟢 Minor | 개선 권고 |

**회귀 판단**:
| 조건 | 행선지 |
|------|--------|
| Critical 1건+ 또는 High 3건+ | → 07-builder.md |
| 그 외 | → 09-security-qa.md |

---

## 출력: `qa/build/build-qa-report.md`

```markdown
# 구현 QA 보고서 — 클라우드 비용 리포팅 자동화

> **검토자**: 08-build-qa / **검토일**: [YYYY-MM-DD]
> **판정**: [PASS / FAIL]

## 1. 기능 구현 완성도 [표]
## 2. 프로토타입-프로덕션 일관성 [표]
## 3. 코드 품질 체크리스트 [FE/BE/Docker]
## 4. 사용자 수정 요청 반영 [§4-b 기준 표]
## 5. 발견 이슈 [표]
## 6. 집계 및 판정
```

---

## 핸드오프

### → 09-security-qa.md
```
## 핸드오프: 구현 QA → 보안 점검 QA
QA 요약: Critical [N] / High [N] / Major [N] / Minor [N]
전달: prod/*, dev/*, qa/build/*, docs/context-ledger.md
```

### → 07-builder.md (즉시 회귀)
```
## 핸드오프: 구현 QA → 빌더 (회귀)
회귀 사유: [요약]
수정 지시: [이슈 ID, 위치, 조치 방안]
디자인 변경 시 dev/ 동기화 필수
```
