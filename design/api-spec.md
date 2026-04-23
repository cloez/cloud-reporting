# API 설계서 — 클라우드 비용 리포팅 자동화

> **버전**: v3.0 (DQA-v2-003·v2-014 반영 — v1 API 폐기 + §10 요약표 재작성)
> **작성일**: 2026-04-16
> **작성자**: 01-architect
> **근거 문서**: docs/brd.md, docs/trd.md, design/data-model.md v3.0, qa/design/design-qa-report.md v3.0

---

## 0. v3.0 변경 요약 (DQA-v2 반영)

| DQA ID | 해소 내용 |
|--------|-----------|
| **DQA-v2-003** High | v1.0 라우트(§3~§9의 `/uploads`, `/templates`, `/reports`, `/subscribers`, `/dashboard`, `/column-aliases`, `/admin/users`)를 **문서에서 전면 제거** — §3은 폐기 안내 및 v1→v2 라우트 맵으로 대체 |
| **DQA-v2-014** Major | §10 엔드포인트 요약표를 v1.0 36개 평면 리스트 → **v2.0 카테고리별 집계표(~76개)** 로 재작성 |

### v1.0 → v2.0 (REG-002 시점) → v3.0 누적

| 항목 | 변경 내용 |
|------|----------|
| 경로 분리 | `/api/v1/admin/*` (시스템) / `/api/v1/t/{tenantSlug}/*` (테넌트) / `/api/v1/auth/*` (공용) |
| 인증 | JWT claims에 `tenantId`, `tenantSlug`, `roles[]`, `userId` 포함 — 서버는 매 요청 RLS 세션 변수 주입 |
| 신규 도메인 | tenants, contracts, cloud-accounts, sub-accounts, scopes, audit-logs, approvals |
| 기존 라우트 이동 | uploads → `/admin/ops/uploads` (Payer 단위, SYS_OPS), reports/subscribers → `/t/{slug}/c/{contractId}/...` |
| 폐기 | TEMPLATE_ROLE_ACCESS API 없음 (역할 매트릭스는 코드 상수 `RoleTemplateMatrix`) |

---

## 1. 공통 사항

### 1.1 Base URL

```
개발: http://localhost:8080/api/v1
운영: https://{domain}/api/v1
Swagger UI: /swagger-ui
```

### 1.2 인증 (OPEN-005 JWT) — v2.0

```
Authorization: Bearer {JWT_TOKEN}
```

JWT Payload:
```json
{
  "sub": "user-id",
  "userId": 123,
  "tenantId": "AD00000AK7",   // SYS_*는 null
  "tenantSlug": "shinhan-card",
  "roles": ["ROLE_TENANT_ADMIN"],
  "exp": 1700000000
}
```

- JWT 발급: `POST /api/v1/auth/login` (body에 `tenantSlug` 또는 `system: true` 필수)
- 갱신: `POST /api/v1/auth/refresh`
- 만료: Access 30분, Refresh 7일
- 서버는 매 요청에서 JWT 검증 후 PostgreSQL에 `SET LOCAL app.tenant_id`, `app.role`, `app.user_id` 주입 → RLS 자동 적용
- URL의 `{tenantSlug}` ↔ JWT의 `tenantSlug` 불일치 시 403

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

### POST `/auth/change-password` (공용)

비밀번호 변경 — 전 역할이 본인 계정에 대해 호출 가능.

| 구분 | 내용 |
|------|------|
| 접근 | 인증 필요 (본인) |
| Request Body | `{ "currentPassword": "string", "newPassword": "string" }` |
| Response 200 | `{ "success": true, "message": "비밀번호가 변경되었어요" }` |
| Response 400 | 현재 비밀번호 불일치 또는 신규 비밀번호 정책 미충족 |

---

## 3. v1 라우트 폐기 안내 (DQA-v2-003)

v1.0의 `/uploads`, `/templates`, `/reports`, `/subscribers`, `/dashboard`, `/column-aliases`, `/admin/users` 경로는 **전면 폐기**됩니다. 같은 기능은 역할·테넌트·계약 컨텍스트가 드러나는 아래 경로로 이동했습니다.

| v1.0 경로 (폐기) | v2.0 이동 경로 | 접근 역할 |
|----------------|--------------|----------|
| `POST /uploads`, `GET /uploads/*` | `POST /admin/ops/uploads`, `/admin/ops/uploads/*` | SYS_OPS |
| `PUT /uploads/{id}/mappings`, `POST /uploads/{id}/confirm` | `/admin/ops/uploads/{id}/mappings|confirm` | SYS_OPS |
| `GET /templates/*` | `GET /t/{slug}/c/{contractId}/templates` | TENANT_USER (Role×Template 상수 필터) |
| `POST /reports/generate`, `GET /reports/*` | `/t/{slug}/c/{contractId}/reports/*` | TENANT_ADMIN/USER |
| `GET /dashboard/*` | `/t/{slug}/c/{contractId}/dashboard/*` | TENANT_USER |
| `GET|POST|PUT|DELETE /subscribers`, `/subscriptions/*` | `/t/{slug}/c/{contractId}/subscribers`, `/subscriptions/*` | TENANT_ADMIN/USER |
| `/column-aliases/*` | `/admin/ops/aliases` | SYS_OPS |
| `GET|POST|PUT /admin/users/*` | `/admin/users` (시스템 사용자) + `/t/{slug}/admin/users` (테넌트 사용자) | SYS_ADMIN / TENANT_ADMIN |

`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`는 v2.0에서도 공용으로 유지됩니다. 상세 명세는 §9-A / §9-B / §9-C 참조.

---

## 9-A. 시스템 콘솔 API (`/admin/*`) — v2.0 신규

> 모두 `ROLE_SYS_ADMIN` 전용 (CUR 업로드만 `ROLE_SYS_OPS`).

### 테넌트 관리
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/admin/tenants` | 테넌트 목록 (status/검색 필터, 페이지네이션) |
| POST | `/admin/tenants` | 테넌트 등록 — body: TenantInput, 응답: 자동생성 ID·slug 포함 |
| GET | `/admin/tenants/{id}` | 테넌트 상세 (계약 수, 사용자 수, 최근 활동) |
| PUT | `/admin/tenants/{id}` | 테넌트 수정 (slug 포함) |
| PATCH | `/admin/tenants/{id}/status` | 상태 전환 (ACTIVE/DORMANT/SUSPENDED/TERMINATED) |
| POST | `/admin/tenants/{id}/admin-user` | 초기 테넌트 관리자 계정 발급 (원래 등록 시 자동 생성, 재발급용) |
| GET | `/admin/tenants/check-slug?slug=...` | 슬러그 중복 검사 |

### 시스템 사용자 관리 (SYS_ADMIN, SYS_OPS 계정)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/admin/users` | 시스템 사용자 목록 |
| POST | `/admin/users` | 시스템 사용자 생성 (role: SYS_ADMIN/SYS_OPS) |
| PUT | `/admin/users/{id}` | 수정 |
| PATCH | `/admin/users/{id}/deactivate` | 비활성화 |

### 전역 감사로그
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/admin/audit-logs` | 전 테넌트 감사로그 (tenantId/actor/action/period 필터) |
| GET | `/admin/audit-logs/export` | CSV 내보내기 |

### CUR 업로드 (SYS_OPS)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/admin/ops/uploads` | CUR 파일 업로드 (multipart, body: tenantId·cloudAccountId 또는 자동탐지) |
| GET | `/admin/ops/uploads` | 업로드 배치 목록 (전 테넌트, 필터: tenantId·status) |
| GET | `/admin/ops/uploads/{batchId}` | 배치 상세 + 영향받은 계약 목록 |
| GET | `/admin/ops/uploads/{batchId}/status` | 진행 상태 폴링 |
| POST | `/admin/ops/uploads/{batchId}/confirm` | 확정 + TENANT_ADMIN 알림 |
| GET | `/admin/ops/payer-detect?filename=...` | 파일명에서 PayerId 자동 추출 시도 |
| GET, POST, PUT, DELETE | `/admin/ops/aliases` | 컬럼 별칭 관리 (기존 `/column-aliases`) |

---

## 9-B. 테넌트 콘솔 API (`/t/{tenantSlug}/admin/*`) — v2.0 신규

> 모두 `ROLE_TENANT_ADMIN` 전용. JWT의 tenantSlug ↔ URL slug 일치 검증.

### 테넌트 사용자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/admin/users` | 테넌트 사용자 목록 |
| POST | `/t/{slug}/admin/users` | 사용자 생성 (role: TENANT_ADMIN/APPROVER/USER) |
| PUT | `/t/{slug}/admin/users/{id}` | 수정 |
| PATCH | `/t/{slug}/admin/users/{id}/deactivate` | 비활성화 |

### 계약
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/admin/contracts` | 계약 목록 |
| POST | `/t/{slug}/admin/contracts` | 계약 등록 (13속성) |
| GET | `/t/{slug}/admin/contracts/{id}` | 계약 상세 + CloudAccount 트리 |
| PUT | `/t/{slug}/admin/contracts/{id}` | 수정 |
| PATCH | `/t/{slug}/admin/contracts/{id}/status` | 상태 전환 |

### Cloud Account / SubAccount
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/t/{slug}/admin/contracts/{id}/cloud-accounts` | Payer 등록 (provider, payerAccountId, effectiveFrom/To) |
| PUT | `/t/{slug}/admin/cloud-accounts/{id}` | Payer 수정 |
| POST | `/t/{slug}/admin/cloud-accounts/{id}/sub-accounts` | SubAccount 등록 |
| PUT | `/t/{slug}/admin/sub-accounts/{id}` | SubAccount 수정·비활성화 |

### CUR 수집 소스 (MVP는 MANUAL_UPLOAD 고정)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/admin/cloud-accounts/{id}/cur-sources` | 수집 소스 조회 |
| POST | `/t/{slug}/admin/cloud-accounts/{id}/cur-sources` | 향후 AWS_S3_PULL 등록용 (MVP에서는 MANUAL 1건 자동 생성) |

### 권한 위임 (Scope)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/admin/scopes` | 사용자×SubAccount 권한 매트릭스 |
| PUT | `/t/{slug}/admin/scopes` | 일괄 갱신 (body: ScopeChange[]) |

### 테넌트 감사로그
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/admin/audit-logs` | 자기 테넌트 감사로그 |
| GET | `/t/{slug}/admin/audit-logs/export` | CSV |

---

## 9-C. 테넌트 사용자 API (`/t/{tenantSlug}/c/{contractId}/*`) — v2.0 변경

> `contractId`는 숫자 또는 `all`. RLS + Scope 자동 필터링.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/contracts` | 권한 보유 계약 목록 (셀렉터용) |
| GET | `/t/{slug}/c/{contractId}/dashboard/summary` | KPI 요약 (가시 합계 + 마스킹 비율) |
| GET | `/t/{slug}/c/{contractId}/dashboard/cost-trend` | 월별 추이 |
| GET | `/t/{slug}/c/{contractId}/dashboard/service-top` | 서비스 Top N |
| GET | `/t/{slug}/c/{contractId}/dashboard/recent-reports` | 최근 리포트 |
| GET | `/t/{slug}/c/{contractId}/templates` | 리포트 템플릿 목록 |
| POST | `/t/{slug}/c/{contractId}/reports/generate` | 리포트 생성 (TENANT_ADMIN만) |
| GET | `/t/{slug}/c/{contractId}/reports` | 리포트 파일 목록 |
| GET | `/t/{slug}/c/{contractId}/reports/{id}` | 상세 |
| GET | `/t/{slug}/c/{contractId}/reports/{id}/preview` | 미리보기 |
| GET | `/t/{slug}/c/{contractId}/reports/{id}/download` | 다운로드 (DOWNLOAD_LOG 기록) |
| GET, POST, PUT, DELETE | `/t/{slug}/c/{contractId}/subscribers` | 구독자 CRUD |
| GET | `/t/{slug}/c/{contractId}/subscriptions/logs` | 발송 이력 |
| GET | `/t/{slug}/c/{contractId}/subscriptions/schedule` | 다음 발송 |
| POST | `/t/{slug}/c/{contractId}/subscriptions/trigger` | 수동 발송 |

### 승인 (placeholder)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/t/{slug}/approvals` | 승인 요청 목록 (현재는 빈 배열 반환) |
| POST | `/t/{slug}/approvals/{id}/approve` | 향후 구현 |
| POST | `/t/{slug}/approvals/{id}/reject` | 향후 구현 |

---

## 10. 엔드포인트 요약 (v2.0)

### 10.1 공용 (Auth) — 4개
| 메서드 | 경로 | 설명 | 접근 |
|--------|------|------|------|
| POST | /auth/login | 로그인 (body에 tenantSlug 또는 system 플래그) | 공개 |
| POST | /auth/refresh | 토큰 갱신 | 인증 |
| POST | /auth/logout | 로그아웃 | 인증 |
| POST | /auth/change-password | 비밀번호 변경 | 인증 (본인) |

### 10.2 시스템 콘솔 `/admin/*` (SYS_ADMIN / SYS_OPS) — 18개
| 묶음 | 엔드포인트 수 | 역할 |
|------|-------------|------|
| 테넌트 CRUD + 상태 전환 + 슬러그 검사 | 7 | SYS_ADMIN |
| 시스템 사용자 CRUD | 4 | SYS_ADMIN |
| 전역 감사로그 / CSV 내보내기 | 2 | SYS_ADMIN |
| CUR 업로드 (list/detail/status/confirm/payer-detect) | 5 + 컬럼 별칭 4 = 5(+4) | SYS_OPS |

> 세부 경로는 §9-A 표 참조. SYS_OPS의 쓰기 작업은 모두 AUDIT_LOG 의무 기록.

### 10.3 테넌트 콘솔 `/t/{slug}/admin/*` (TENANT_ADMIN) — 25개
| 묶음 | 엔드포인트 수 |
|------|-------------|
| 테넌트 사용자 CRUD | 4 |
| 계약 CRUD + 상태 전환 | 5 |
| CloudAccount(Payer) / SubAccount CRUD | 4 |
| CUR 수집 소스 | 2 |
| 권한 위임(Scope) 매트릭스 조회·일괄 갱신 | 2 |
| 테넌트 감사로그 + CSV | 2 |
| 대시보드·리포트 조회 (테넌트 전체 집계) | 6 |

> 세부 경로는 §9-B 표 참조. URL slug ↔ JWT tenantSlug 불일치 시 403.

### 10.4 테넌트 사용자 `/t/{slug}/c/{contractId}/*` (TENANT_USER 등) — 25개
| 묶음 | 엔드포인트 수 |
|------|-------------|
| 계약 목록(셀렉터) | 1 |
| 대시보드 (summary, cost-trend, service-top, recent-reports) | 4 |
| 리포트 템플릿·생성·목록·상세·미리보기·다운로드 | 6 |
| 구독자 CRUD + 발송 이력/예정/수동 발송 | 7 |
| 승인 placeholder (inbox / approve / reject) | 3 |
| 계약 메타 조회·Cloud트리·Contract 컨텍스트 | 4 |

> 세부 경로는 §9-C 표 참조. `contractId=all`은 다중 계약 가상 컨텍스트, 혼합통화 경고 동반.

### 10.5 합계

| 카테고리 | 엔드포인트 수 |
|----------|-------------|
| 공용 (Auth) | 4 |
| 시스템 콘솔 (SYS_ADMIN/SYS_OPS) | 18 |
| 테넌트 콘솔 (TENANT_ADMIN) | 25 |
| 테넌트 사용자 (TENANT_USER/APPROVER) | 25 |
| 공용 템플릿 메타 (공유 조회) | 4 |
| **총계** | **≈ 76** (±5 — 구현 단계 OpenAPI 자동 생성 기준 고정) |

> **v1.0 → v2.0 증분**: 36 → ~76 (테넌트·계약·Scope·감사·승인 신규 도메인).
> **DQA-v2-014 해소**: 기존 v1.0 36개 평면 요약표를 카테고리별 집계표로 전면 교체. 특정 경로 접근 역할은 §9-A/B/C의 세부 표에 명시.

---

*본 문서는 OpenAPI 3.0 초안이며, 구현 시 Spring Boot + springdoc-openapi로 자동 생성됩니다.*  
*Swagger UI 경로: `/swagger-ui` (TRD §5.2 요구사항)*
