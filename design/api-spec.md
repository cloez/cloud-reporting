# API 설계서 — 클라우드 비용 리포팅 자동화

> **버전**: v1.0  
> **작성일**: 2026-04-06  
> **작성자**: 01-architect  
> **근거 문서**: docs/brd.md, docs/trd.md, design/data-model.md  
> **형식**: OpenAPI 3.0 초안 (구현 시 Spring Boot + springdoc-openapi 자동 생성)

---

## 1. 공통 사항

### 1.1 Base URL

```
개발: http://localhost:8080/api/v1
운영: https://{domain}/api/v1
Swagger UI: /swagger-ui
```

### 1.2 인증 (OPEN-005 가정: JWT)

```
Authorization: Bearer {JWT_TOKEN}
```

- JWT 발급: `/api/v1/auth/login`
- 토큰 갱신: `/api/v1/auth/refresh`
- 만료 시간: Access 30분, Refresh 7일
- Spring Security + RBAC 기반 역할 검증

### 1.3 공통 응답 형식

```json
// 성공
{
  "success": true,
  "data": { ... },
  "message": null
}

// 목록 (페이지네이션)
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
  },
  "message": null
}

// 오류
{
  "success": false,
  "data": null,
  "message": "안내 메시지",
  "errorCode": "ERR_001"
}
```

### 1.4 공통 오류 코드

| HTTP 상태 | 코드 | 설명 |
|----------|------|------|
| 400 | BAD_REQUEST | 요청 데이터 형식 오류 |
| 401 | UNAUTHORIZED | 인증 필요 또는 토큰 만료 |
| 403 | FORBIDDEN | 권한 부족 |
| 404 | NOT_FOUND | 리소스 없음 |
| 409 | CONFLICT | 중복 데이터 |
| 413 | PAYLOAD_TOO_LARGE | 파일 크기 초과 |
| 500 | INTERNAL_ERROR | 서버 오류 |

---

## 2. 인증 API

### POST `/auth/login`

로그인 및 JWT 토큰 발급.

| 구분 | 내용 |
|------|------|
| 접근 | 공개 (인증 불필요) |
| Request Body | `{ "username": "string", "password": "string" }` |
| Response 200 | `{ "accessToken": "string", "refreshToken": "string", "expiresIn": 1800, "user": UserInfo }` |
| Response 401 | 인증 실패 |

### POST `/auth/refresh`

Access 토큰 갱신.

| 구분 | 내용 |
|------|------|
| 접근 | 인증 필요 (Refresh Token) |
| Request Body | `{ "refreshToken": "string" }` |
| Response 200 | `{ "accessToken": "string", "expiresIn": 1800 }` |
| Response 401 | Refresh 토큰 만료 |

### POST `/auth/logout`

로그아웃 (토큰 무효화).

| 구분 | 내용 |
|------|------|
| 접근 | 인증 필요 |
| Response 200 | `{ "success": true }` |

---

## 3. 데이터 업로드 API

### POST `/uploads`

엑셀 파일 업로드 (비동기 처리 시작).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Content-Type | multipart/form-data |
| Request | `file: MultipartFile` (엑셀 파일, 최대 100MB) |
| Response 202 | `{ "batchId": 1, "status": "PROCESSING", "message": "파일 처리를 시작합니다" }` |
| Response 413 | 파일 크기 초과 |

### GET `/uploads`

업로드 배치 목록 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Query | `page`, `size`, `status` (선택), `sort` (선택) |
| Response 200 | 페이지네이션된 UploadBatch 목록 |

### GET `/uploads/{batchId}`

업로드 배치 상세 조회 (시트 목록 포함).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Response 200 | UploadBatch + sheets[] + validationResults |

### GET `/uploads/{batchId}/status`

업로드 처리 상태 폴링.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Response 200 | `{ "batchId": 1, "status": "PROCESSING", "progress": 75, "currentSheet": "2026-03" }` |

### PUT `/uploads/{batchId}/mappings`

컬럼 매핑 수동 수정.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Request Body | `{ "mappings": [ { "sourceColumn": "string", "standardColumn": "string" } ] }` |
| Response 200 | 수정된 매핑 결과 |

### POST `/uploads/{batchId}/confirm`

업로드 확정 (검증 완료 후).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Response 200 | `{ "batchId": 1, "status": "COMPLETED" }` |

---

## 4. 리포트 템플릿 API

### GET `/templates`

리포트 템플릿 목록 조회 (역할별 필터링 적용).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Query | `category` (선택), `search` (선택) |
| Response 200 | ReportTemplate[] (역할별 접근 가능 목록만) |

### GET `/templates/{templateId}`

리포트 템플릿 상세 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Response 200 | ReportTemplate (설정, 차트 규칙 포함) |

---

## 5. 리포트 파일 API

### POST `/reports/generate`

리포트 생성 요청 (비동기).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Request Body | `{ "templateId": 1, "targetYearMonth": 202603, "format": "XLSX" }` |
| Response 202 | `{ "reportFileId": 1, "status": "GENERATING", "message": "리포트를 생성하고 있어요" }` |
| Response 404 | 해당 연월에 COST_DATA가 없는 경우 |

> **DQA-002 반영**: `batchId` 제거 — Aggregation Engine이 `targetYearMonth` 기준으로 **COST_DATA** 테이블에서 직접 집계. 배치 종속성 제거.

### GET `/reports`

생성된 리포트 파일 목록 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Query | `templateId` (선택), `yearMonth` (선택), `status` (선택), `page`, `size` |
| Response 200 | 페이지네이션된 ReportFile 목록 (역할별 필터) |

### GET `/reports/{reportFileId}`

리포트 파일 상세 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Response 200 | ReportFile 상세 (메타데이터) |

### GET `/reports/{reportFileId}/status`

리포트 생성 상태 폴링.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS |
| Response 200 | `{ "reportFileId": 1, "status": "GENERATING", "progress": 60 }` |

### GET `/reports/{reportFileId}/download`

리포트 파일 다운로드.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER (소속부서), ROLE_ADMIN |
| Response 200 | 파일 스트림 (Content-Disposition: attachment) |
| Response 404 | 파일 미존재 또는 생성 중 |

### GET `/reports/{reportFileId}/preview`

리포트 미리보기 데이터 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER (소속부서), ROLE_ADMIN |
| Response 200 | `{ "chartData": {...}, "gridData": [...], "summary": {...} }` |

---

## 6. 구독 관리 API

### GET `/subscribers`

구독자 목록 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS (조회), ROLE_ADMIN (CRUD) |
| Query | `department` (선택), `isActive` (선택), `page`, `size` |
| Response 200 | 페이지네이션된 Subscriber 목록 |

### POST `/subscribers`

구독자 등록.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Request Body | `{ "name": "string", "email": "string", "department": "string", "accountScope": "string", "isActive": true }` |
| Response 201 | 생성된 Subscriber |
| Response 409 | 이메일 중복 |

### PUT `/subscribers/{subscriberId}`

구독자 수정.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Request Body | SubscriberForm (부분 수정 지원) |
| Response 200 | 수정된 Subscriber |

### DELETE `/subscribers/{subscriberId}`

구독자 삭제 (논리 삭제 — isActive=false).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Response 200 | `{ "success": true }` |

### GET `/subscriptions/logs`

구독 발송 이력 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_ADMIN |
| Query | `subscriberId` (선택), `status` (선택), `from`, `to`, `page`, `size` |
| Response 200 | 페이지네이션된 SubscriptionLog 목록 |

### GET `/subscriptions/schedule`

다음 발송 예정 정보 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_ADMIN |
| Response 200 | `{ "nextSchedule": "2026.05.11", "subscriberCount": 42, "lastResult": "success" }` |

### POST `/subscriptions/trigger`

수동 발송 트리거 (즉시 발송).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_ADMIN |
| Request Body | `{ "targetYearMonth": 202603, "templateIds": [1,2,3] }` |
| Response 202 | `{ "message": "발송을 시작합니다", "jobId": "uuid" }` |
| Response 404 | 해당 ���월��� COST_DATA가 없는 경우 |

> **DQA-002 해소**: 배치 선택 로직 — `batchId`를 직접 전달하지 않음. 서버 내부에서 `targetYearMonth`에 해당하는 **COST_DATA**를 직접 집계하여 리포트를 생성. COST_DATA 도입으로 특정 배치 종속성 제거. 자동 발송(매월 10일)도 동일한 COST_DATA 기반 집계 수행.

---

## 7. 대시보드 API

### GET `/dashboard/summary`

대시보드 KPI 요약 데이터.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Response 200 | 아래 참조 |

```json
{
  "totalCost": 125000000,
  "costChangeRate": -3.2,
  "reportCount": 24,
  "subscriberCount": 42,
  "latestBatchDate": "2026.03.15",
  "nextSchedule": "2026.04.10"
}
```

> ROLE_VIEWER: 소속 부서 데이터만 집계

### GET `/dashboard/cost-trend`

월별 비용 추이 데이터 (ECharts용).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Query | `months` (조회 개월 수, 기본 12) |
| Response 200 | CostTrendData[] |

### GET `/dashboard/service-top`

서비스 Top N 비용 데이터 (ECharts용).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Query | `topN` (기본 5), `yearMonth` (선택) |
| Response 200 | ServiceCostData[] |

### GET `/dashboard/recent-reports`

최근 생성 리포트 목록 (5건).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_VIEWER, ROLE_ADMIN |
| Response 200 | ReportFile[] (최근 5건) |

---

## 8. 컬럼 별칭 API

### GET `/column-aliases`

컬럼 별칭 사전 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_OPS, ROLE_ADMIN |
| Query | `department` (선택), `standardColumn` (선택) |
| Response 200 | ColumnAlias[] |

### POST `/column-aliases`

컬럼 별칭 등록.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Request Body | `{ "sourceColumn": "string", "standardColumn": "string", "department": "string" }` |
| Response 201 | 생성된 ColumnAlias |

### PUT `/column-aliases/{aliasId}`

컬럼 별칭 수정.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Response 200 | 수정된 ColumnAlias |

### DELETE `/column-aliases/{aliasId}`

컬럼 별칭 삭제.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Response 200 | `{ "success": true }` |

---

## 9. 사용자 관리 API

### GET `/admin/users`

사용자 목록 조회.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Query | `department` (선택), `role` (선택), `isActive` (선택), `page`, `size` |
| Response 200 | 페이지네이션된 User 목록 |

### POST `/admin/users`

사용자 등록.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Request Body | `{ "username": "string", "password": "string", "name": "string", "email": "string", "department": "string", "roleIds": [1] }` |
| Response 201 | 생성된 User |

### PUT `/admin/users/{userId}`

사용자 정보 수정 (역할·부서 변경 포함).

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Response 200 | 수정된 User |

### PATCH `/admin/users/{userId}/deactivate`

사용자 비활성화.

| 구분 | 내용 |
|------|------|
| 접근 | ROLE_ADMIN |
| Response 200 | `{ "success": true }` |

### POST `/auth/change-password` — DQA-008 신규

비밀번호 변경.

| 구분 | 내용 |
|------|------|
| 접근 | 인증 필요 (본인) |
| Request Body | `{ "currentPassword": "string", "newPassword": "string" }` |
| Response 200 | `{ "success": true, "message": "비밀번호가 변경되었어요" }` |
| Response 400 | 현재 비밀번호 불일치 또는 신규 비밀번호 정책 미충족 |

---

## 10. 엔드포인트 요약

| 메서드 | 경로 | 설명 | 접근 역할 |
|--------|------|------|----------|
| POST | /auth/login | 로그인 | 공개 |
| POST | /auth/refresh | 토큰 갱신 | 인증 |
| POST | /auth/logout | 로그아웃 | 인증 |
| POST | /uploads | 파일 업로드 | OPS |
| GET | /uploads | 업로드 목록 | OPS |
| GET | /uploads/{id} | 업로드 상세 | OPS |
| GET | /uploads/{id}/status | 업로드 상태 | OPS |
| PUT | /uploads/{id}/mappings | 매핑 수정 | OPS |
| POST | /uploads/{id}/confirm | 업로드 확정 | OPS |
| GET | /templates | 템플릿 목록 | OPS, VIEWER, ADMIN |
| GET | /templates/{id} | 템플릿 상세 | OPS, VIEWER, ADMIN |
| POST | /reports/generate | 리포트 생성 | OPS |
| GET | /reports | 리포트 목록 | OPS, VIEWER, ADMIN |
| GET | /reports/{id} | 리포트 상세 | OPS, VIEWER, ADMIN |
| GET | /reports/{id}/status | 생성 상태 | OPS |
| GET | /reports/{id}/download | 다운로드 | OPS, VIEWER, ADMIN |
| GET | /reports/{id}/preview | 미리보기 | OPS, VIEWER, ADMIN |
| GET | /subscribers | 구독자 목록 | OPS, ADMIN |
| POST | /subscribers | 구독자 등록 | ADMIN |
| PUT | /subscribers/{id} | 구독자 수정 | ADMIN |
| DELETE | /subscribers/{id} | 구독자 삭제 | ADMIN |
| GET | /subscriptions/logs | 발송 이력 | OPS, ADMIN |
| GET | /subscriptions/schedule | 발송 예정 | OPS, ADMIN |
| POST | /subscriptions/trigger | 수동 발송 | OPS, ADMIN |
| GET | /dashboard/summary | KPI 요약 | OPS, VIEWER, ADMIN |
| GET | /dashboard/cost-trend | 비용 추이 | OPS, VIEWER, ADMIN |
| GET | /dashboard/service-top | 서비스 Top N | OPS, VIEWER, ADMIN |
| GET | /dashboard/recent-reports | 최근 리포트 | OPS, VIEWER, ADMIN |
| GET | /column-aliases | 별칭 목록 | OPS, ADMIN |
| POST | /column-aliases | 별칭 등록 | ADMIN |
| PUT | /column-aliases/{id} | 별칭 수정 | ADMIN |
| DELETE | /column-aliases/{id} | 별칭 삭제 | ADMIN |
| GET | /admin/users | 사용자 목록 | ADMIN |
| POST | /admin/users | 사용자 등록 | ADMIN |
| PUT | /admin/users/{id} | 사용자 수정 | ADMIN |
| PATCH | /admin/users/{id}/deactivate | 사용자 비활성화 | ADMIN |
| POST | /auth/change-password | 비밀번호 변경 | 인증 (본인) |

**총 36개 엔드포인트** (DQA-008 비밀번호 변경 추가)

---

*본 문서는 OpenAPI 3.0 초안이며, 구현 시 Spring Boot + springdoc-openapi로 자동 생성됩니다.*  
*Swagger UI 경로: `/swagger-ui` (TRD §5.2 요구사항)*
