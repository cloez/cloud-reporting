# 더미 데이터 스펙 — 클라우드 비용 리포팅 자동화

> **버전**: v3.0 (DQA-v2-007/013/011 반영 — §3 5권한 교체, §5/§7 tenant/contract 태깅, §10 번호 중복 해소)
> **작성일**: 2026-04-16
> **작성자**: 01-architect
> **용도**: 프로토타입 및 테스트용 더미 데이터 생성 규칙

---

## 0. v2.0 신규 더미 데이터

### 0.1 Tenant (3건)

| id | slug | customer_name | customer_type | status | admin_email |
|----|------|---------------|---------------|--------|-------------|
| AD000001K3 | shinhan-card | 신한카드 | CORP | ACTIVE | admin@shinhancard.com |
| AD000002L9 | shinhan-life | 신한라이프 | CORP | ACTIVE | admin@shinhanlife.com |
| AD000003M2 | shinhan-internal | 신한DS 내부 | INTERNAL | ACTIVE | admin@shinhands.com |

### 0.2 Contract (6건, 테넌트당 평균 2개)

| code | tenant | name | type | currency | billing | status |
|------|--------|------|------|----------|---------|--------|
| SHC-2026-001 | shinhan-card | AWS 운영 환경 직계약 | DIRECT | KRW | MONTHLY | ACTIVE |
| SHC-2026-002 | shinhan-card | AWS 분석 환경 MSP | MSP | KRW | MONTHLY | ACTIVE |
| SHL-2026-001 | shinhan-life | AWS 통합 운영 | DIRECT | USD | MONTHLY | ACTIVE |
| SHL-2025-007 | shinhan-life | AWS 신계약전용 (만료) | DIRECT | KRW | MONTHLY | EXPIRED |
| SDS-2026-001 | shinhan-internal | 그룹 내부정산 | INTERNAL | KRW | QUARTERLY | ACTIVE |
| SDS-2026-002 | shinhan-internal | 사내 개발환경 | INTERNAL | KRW | MONTHLY | DRAFT |

### 0.3 CloudAccount (Payer, 8건)

각 계약별 1~2개 Payer. provider=AWS 고정.

| contract | payer_account_id (12자리) | name | effective_from | effective_to |
|----------|---------------------------|------|----------------|--------------|
| SHC-2026-001 | 100000000001 | SHC-PROD-Payer | 2026-01-01 | NULL |
| SHC-2026-002 | 100000000002 | SHC-ANALYTICS-Payer | 2026-01-01 | NULL |
| SHL-2026-001 | 200000000001 | SHL-Main-Payer | 2026-01-01 | NULL |
| SHL-2025-007 | 200000000099 | SHL-Legacy-Payer | 2025-01-01 | 2025-12-31 |
| SDS-2026-001 | 300000000001 | SDS-Group-Payer | 2026-01-01 | NULL |
| SDS-2026-002 | 300000000002 | SDS-Dev-Payer | 2026-01-01 | NULL |
| SHC-2026-001 | 100000000003 | SHC-DR-Payer | 2026-03-01 | NULL |
| SHL-2026-001 | 200000000002 | SHL-Sub-Payer | 2026-02-01 | NULL |

### 0.4 CloudSubAccount (Linked, 24건)

각 Payer당 평균 3개 Linked Account. 명명 규칙: `{tenantSlug}-{purpose}-{env}` (예: `shinhan-card-was-prod`).

### 0.5 TenantUserScope (60건)

테넌트별 사용자별 SubAccount 권한. 일부 사용자는 한 계약 전체, 일부는 일부 SubAccount만 (마스킹 시나리오 검증용).

### 0.6 User (테넌트 사용자 24건 + 시스템 사용자 4건)

- SYS_ADMIN: `sysadmin@shinhands.com` (1명)
- SYS_OPS: `sysops1`, `sysops2`, `sysops3` (3명)
- 테넌트별: TENANT_ADMIN 1명 + TENANT_APPROVER 1명 + TENANT_USER 6명 (×3 = 24명)

### 0.7 ApprovalRequest (5건, placeholder)

PENDING 3건 + APPROVED 1건 + REJECTED 1건 (UI placeholder 검증용)

### 0.8 AuditLog (300건+)

LOGIN(100), UPLOAD(40), GENERATE_REPORT(60), DOWNLOAD(60), USER_CREATE(20), CONTRACT_UPDATE(20). tenantId 분포 균등.

### 0.9 COST_DATA 변경

기존 200~500행 × 24개월에 `tenant_id`, `contract_id`, `sub_account_id` 필드 추가. SubAccount별로 행 분배.

---

---

## 1. 공통 규칙

- **언어**: 모든 텍스트 한국어
- **회사명·부서명**: 한국 기업 형식
- **이메일**: `{영문이름}@shinhan-ds.com` 형식
- **금액**: 원화(KRW), 세 자리 쉼표 표기 (예: 1,234,567원)
- **날짜**: YYYY.MM.DD 형식 (표시용), YYYY-MM-DD (데이터용)
- **상태 분포**: 정상/오류/처리중 혼합하여 현실적 시나리오 재현

---

## 2. ReportTemplate (6건)

MVP Top 6 리포트 템플릿 (OPEN-001 가정).

| code | name | category | chartType | 설명 |
|------|------|----------|-----------|------|
| R01 | Cost & Usage 요약 | summary | line+bar | 월별 총 비용, 전월 대비 증감률, 서비스 Top N |
| R02 | Product·Region별 비용 | detail | stacked_bar | 제품군·리전별 비용 분포 |
| R03 | Service별 사용 비용 | detail | horizontal_bar | 개별 서비스 비용 상세 및 순위 |
| R04 | Tag별 현황 | detail | treemap+line | 태그 기준 비용 분류 및 추이 |
| R05 | Account & Forecast | summary | line | 계정별 비용 + 예측선 |
| R06 | 통합 내보내기 | export | table | 전체 데이터 집계 + Raw Data |

---

## 3. User & Role (시스템 4 + 테넌트 24 = **28건**) — v3.0 DQA-v2-007 반영

### Role (5건) — v2.0 5권한

| id | name | scope | description |
|----|------|-------|-------------|
| 1 | ROLE_SYS_ADMIN | GLOBAL | 시스템 관리자 — 테넌트 CRUD, 시스템 사용자, 전역 감사 |
| 2 | ROLE_SYS_OPS | GLOBAL | 시스템 이용자 — CUR 업로드·매핑·컬럼 별칭 (테넌트 CRUD 불가) |
| 3 | ROLE_TENANT_ADMIN | TENANT | 테넌트 관리자 — 계약·사용자·권한·테넌트 감사 |
| 4 | ROLE_TENANT_APPROVER | TENANT | 테넌트 승인자 — 향후 티켓 승인 placeholder |
| 5 | ROLE_TENANT_USER | TENANT | 테넌트 이용자 — 권한받은 SubAccount 범위 조회·리포트·구독 |

### System Users (4건 — tenant_id = NULL)

| id | username | name | roles | isActive | 비고 |
|----|----------|------|-------|----------|------|
| 1 | sys-admin | 시스템관리자 | ROLE_SYS_ADMIN | ✅ | 초기 슈퍼어드민 |
| 2 | sys-admin2 | 박동근 | ROLE_SYS_ADMIN | ✅ | 백업 관리자 |
| 3 | sys-ops1 | 김영수 | ROLE_SYS_OPS | ✅ | CUR 업로드 담당 |
| 4 | sys-ops2 | 이지현 | ROLE_SYS_OPS | ✅ | CUR 업로드 담당 |

### Tenant Users (24건 — 3 테넌트 × 평균 8명) — tenant_id = §0.1의 각 테넌트

| id | tenant | username | name | dept | title | roles | isActive |
|----|--------|----------|------|------|-------|-------|----------|
| 5 | shinhan-card (AD000001K3) | sh-admin | 박서연 | IT전략팀 | 부장 | TENANT_ADMIN | ✅ |
| 6 | shinhan-card | sh-approver | 김민호 | 재무팀 | 차장 | TENANT_APPROVER | ✅ |
| 7 | shinhan-card | sh-user1 | 정수현 | 인프라팀 | 대리 | TENANT_USER | ✅ |
| 8 | shinhan-card | sh-user2 | 강도윤 | 개발1팀 | 과장 | TENANT_USER | ✅ |
| 9 | shinhan-card | sh-user3 | 윤채원 | 개발2팀 | 대리 | TENANT_USER | ✅ |
| 10 | shinhan-card | sh-user4 | 황지우 | 데이터팀 | 사원 | TENANT_USER | ❌ |
| 11 | shinhan-card | sh-user5 | 손하늘 | 경영기획실 | 과장 | TENANT_USER | ✅ |
| 12 | shinhan-card | sh-user6 | 조은지 | 보안팀 | 대리 | TENANT_USER | ✅ |
| 13 | shinhan-life (AD000002L9) | sl-admin | 최민준 | IT운영팀 | 부장 | TENANT_ADMIN | ✅ |
| 14 | shinhan-life | sl-approver | 한지호 | 경영관리팀 | 차장 | TENANT_APPROVER | ✅ |
| 15 | shinhan-life | sl-user1 | 이수연 | 인프라팀 | 과장 | TENANT_USER | ✅ |
| 16 | shinhan-life | sl-user2 | 장유진 | 개발팀 | 대리 | TENANT_USER | ✅ |
| 17 | shinhan-life | sl-user3 | 박지성 | 운영팀 | 과장 | TENANT_USER | ✅ |
| 18 | shinhan-life | sl-user4 | 송다은 | 재무팀 | 사원 | TENANT_USER | ✅ |
| 19 | shinhan-life | sl-user5 | 김나래 | 보안팀 | 대리 | TENANT_USER | ✅ |
| 20 | shinhan-life | sl-user6 | 이한결 | 데이터팀 | 과장 | TENANT_USER | ✅ |
| 21 | shinhan-internal (AD000003M2) | ds-admin | 김도훈 | Cloud운영팀 | 팀장 | TENANT_ADMIN | ✅ |
| 22 | shinhan-internal | ds-admin2 | 이서연 | Cloud운영팀 | 과장 | TENANT_ADMIN | ✅ |
| 23 | shinhan-internal | ds-approver | 오승현 | 경영기획팀 | 차장 | TENANT_APPROVER | ✅ |
| 24 | shinhan-internal | ds-user1 | 배성민 | Dev팀 | 대리 | TENANT_USER | ✅ |
| 25 | shinhan-internal | ds-user2 | 신유리 | Dev팀 | 과장 | TENANT_USER | ✅ |
| 26 | shinhan-internal | ds-user3 | 류호진 | Data팀 | 대리 | TENANT_USER | ✅ |
| 27 | shinhan-internal | ds-user4 | 문아영 | Data팀 | 사원 | TENANT_USER | ✅ |
| 28 | shinhan-internal | ds-user5 | 임주원 | Sec팀 | 과장 | TENANT_USER | ✅ |

> **UK**: (tenant_id, username), (tenant_id, email) — 테넌트 간 동일 username/email 공존 허용
> **TENANT_USER_SCOPE**: §0.5의 60건 권한 부여 규칙과 일치 — ADMIN/APPROVER는 일반적으로 전 SubAccount, USER는 부서에 해당하는 SubAccount만.

---

## 4. UploadBatch (24건+)

2024년 4월 ~ 2026년 3월 (2년치 월별 업로드).

### 생성 규칙

- **기간**: 202404 ~ 202603 (24개월)
- **상태 분포**: COMPLETED 20건, ERROR 2건, PROCESSING 1건, PENDING 1건
- **업로드 담당**: kimops(id:2) 16건, leeops(id:3) 8건
- **시트 수**: 대부분 1건 (단일 월), 2건 이상 (분기 합산 업로드) 포함
- **오류 케이스**: 컬럼 누락, 데이터 타입 불일치

### 샘플 데이터 (발췌)

| id | uploadedBy | filename | status | sheetCount | yearMonth | uploadedAt |
|----|-----------|----------|--------|------------|-----------|------------|
| 1 | 2 | 클라우드비용_202404.xlsx | COMPLETED | 1 | 202404 | 2024.04.12 |
| 2 | 2 | 클라우드비용_202405.xlsx | COMPLETED | 1 | 202405 | 2024.05.11 |
| ... | ... | ... | ... | ... | ... | ... |
| 15 | 3 | 클라우드비용_202506.xlsx | ERROR | 1 | 202506 | 2025.06.13 |
| 22 | 2 | 클라우드비용_202601_Q4합산.xlsx | COMPLETED | 3 | 202601 | 2026.01.14 |
| 23 | 3 | 클라우드비용_202602.xlsx | PROCESSING | 1 | 202602 | 2026.02.12 |
| 24 | 2 | 클라우드비용_202603.xlsx | PENDING | 1 | 202603 | 2026.03.11 |

### 오류 케이스

| batchId | errorMessage |
|---------|-------------|
| 15 | 필수 컬럼 'service_name'을 찾을 수 없어요. 컬럼명을 확인해 주세요. |
| 19 | 'cost_amount' 컬럼에 숫자가 아닌 값이 포함되어 있어요. (행 145, 237) |

---

## 5. Subscriber (60건+) — v3.0 DQA-v2-013 반영

### 생성 규칙

- **테넌트 분포**: shinhan-card 24명, shinhan-life 22명, shinhan-internal 14명
- **계약 분포**: 각 테넌트의 Contract 6건에 평균 10명씩 분산 (UK=(tenant_id, contract_id, email))
- **활성/비활성**: 활성 50명, 비활성 10명
- **계정 범위**: account_scope NULL = 계약 전체 구독, 아니면 JSON 배열로 SubAccount ID 나열
- **관리자**: managed_by는 해당 테넌트의 TENANT_ADMIN 사용자 ID

### 샘플 데이터 (발췌)

| id | tenant_id | contract_id | name | email | dept | account_scope | isActive |
|----|-----------|-------------|------|-------|------|--------------|----------|
| 1 | AD000001K3 | SHC-2026-001 | 김태호 | kimth@shcard.co.kr | 경영기획실 | null (계약전체) | ✅ |
| 2 | AD000001K3 | SHC-2026-001 | 이수진 | leesj@shcard.co.kr | 재무팀 | `["csa-12","csa-13"]` | ✅ |
| 3 | AD000001K3 | SHC-2026-002 | 박준혁 | parkjh@shcard.co.kr | 인프라팀 | `["csa-18"]` | ✅ |
| 25 | AD000002L9 | SHL-2026-001 | 박민정 | parkmj@shinhanlife.co.kr | 경영관리팀 | null | ✅ |
| 47 | AD000003M2 | SDS-2026-001 | 정유나 | jungyn@shinhan-internal.co.kr | Dev팀 | `["csa-45"]` | ✅ |
| 55 | AD000003M2 | SDS-2026-002 | 한승우 | hansw@shinhan-internal.co.kr | Data팀 | `["csa-50"]` | ❌ |
| 60 | AD000001K3 | SHC-2026-003 | 조민서 | choms@shcard.co.kr | 경영기획실 | null | ❌ |

### 테넌트·계약·부서별 범위 매핑 규칙

| 부서 유형 | account_scope 패턴 |
|----------|------------------|
| 경영기획실 / 경영관리팀 | null (계약 전체 열람) |
| 재무팀 | 해당 테넌트의 재무 관련 SubAccount (JSON 배열) |
| 운영·Cloud운영팀 | null (계약 전체) |
| 인프라·운영팀 | 인프라 SubAccount |
| 개발팀 | 개발 Prod/Dev SubAccount 1~2건 |
| 데이터팀 | 분석 SubAccount |

> **UK 검증**: (AD000001K3, SHC-2026-001, kimth@shcard.co.kr)와 (AD000002L9, SHL-2026-001, kimth@shinhanlife.co.kr)는 공존 가능.

---

## 6. SubscriptionLog (100건+)

### 생성 규칙

- **기간**: 2024년 5월 ~ 2026년 3월 (23회 발송)
- **발송일**: 매월 10일 09:00 (주말 시 익영업일 순연)
- **상태 분포**: SENT 85건, FAILED 8건, RETRYING 5건, PENDING 2건
- **재시도**: FAILED 건 중 retryCount 1~3 혼합
- **실패 사유**: 이메일 주소 오류, 메일 서버 타임아웃, 첨부 파일 크기 초과

### 샘플 데이터 (발췌)

| id | subscriberId | reportFileId | status | retryCount | scheduledAt | sentAt |
|----|-------------|-------------|--------|------------|-------------|--------|
| 1 | 1 | 1 | SENT | 0 | 2024.05.10 09:00 | 2024.05.10 09:02 |
| 2 | 2 | 1 | SENT | 0 | 2024.05.10 09:00 | 2024.05.10 09:02 |
| ... | ... | ... | ... | ... | ... | ... |
| 45 | 12 | 8 | FAILED | 3 | 2024.12.10 09:00 | null |
| 67 | 5 | 14 | RETRYING | 1 | 2025.07.10 09:00 | null |
| 99 | 1 | 22 | PENDING | 0 | 2026.04.10 09:00 | null |
| 100 | 2 | 22 | PENDING | 0 | 2026.04.10 09:00 | null |

### 실패 사유 샘플

| errorMessage |
|-------------|
| 수신자 이메일 주소가 유효하지 않아요. 이메일을 확인해 주세요. |
| 메일 서버 응답 시간이 초과되었어요. 잠시 후 다시 시도합니다. |
| 첨부 파일 크기가 제한을 초과했어요. (25MB 초과) |

---

## 7. DownloadLog (250건+) — v3.0 DQA-v2-013 반영

### 생성 규칙

- **기간**: 2024년 5월 ~ 2026년 3월
- **tenant_id 분포**: 3개 테넌트에 120 / 90 / 40건 비율 (규모 반영)
- **역할 분포 (v2.0 5권한)**: TENANT_ADMIN 60건, TENANT_APPROVER 20건, TENANT_USER 150건, SYS_ADMIN 15건, SYS_OPS 5건
- **리포트 분포**: R01(요약) 80건, R02~R05 각 30건, R06(통합) 50건
- **시간대 분포**: 09:00~12:00 (40%), 13:00~18:00 (50%), 기타 (10%)
- **IP**: 내부망 192.168.x.x / 10.x.x.x 패턴

### 샘플 데이터 (발췌)

| id | tenant_id | report_file_id | downloaded_by | ip_address | downloaded_at |
|----|-----------|---------------|--------------|-----------|-------------|
| 1 | AD000001K3 | 1 | 5 (sh-admin) | 192.168.1.101 | 2024.05.12 10:23 |
| 2 | AD000001K3 | 1 | 7 (sh-user1) | 192.168.1.205 | 2024.05.12 14:15 |
| 12 | AD000002L9 | 8 | 13 (sl-admin) | 10.10.2.33 | 2024.10.15 11:02 |
| 150 | AD000001K3 | 18 | 8 (sh-user2) | 192.168.2.88 | 2025.11.15 09:45 |
| 200 | AD000003M2 | 22 | 21 (ds-admin) | 10.20.3.17 | 2026.02.14 11:30 |
| 245 | NULL | 22 | 3 (sys-ops1) | 10.30.1.5 | 2026.03.14 16:10 |

> **주의**: SYS_* 사용자의 다운로드는 tenant_id가 해당 리포트의 테넌트 값으로 채워짐(감사 명확성). `downloaded_by`의 user가 tenant_id NULL이어도, 이 로그의 tenant_id는 대상 리포트의 테넌트.
> `ID 245`처럼 SYS_OPS가 특정 테넌트 리포트 다운로드 시에도 tenant_id가 해당 테넌트로 기록되고 AUDIT_LOG에도 동시 기록.

---

## 8. ColumnAlias (30건+)

### 생성 규칙

- **부서별 변형**: 동일한 표준 컬럼에 대해 부서마다 다른 명칭 사용
- **공통 별칭**: department = null (전사 공통)
- **분포**: 공통 10건, 부서별 20건+

### 샘플 데이터

| id | sourceColumn | standardColumn | department |
|----|-------------|---------------|------------|
| 1 | 계정ID | account_id | null |
| 2 | Account ID | account_id | null |
| 3 | 계정번호 | account_id | 재무팀 |
| 4 | Acct No | account_id | 인프라팀 |
| 5 | 서비스 | service_name | null |
| 6 | Service | service_name | null |
| 7 | 서비스명 | service_name | 클라우드운영팀 |
| 8 | 상품명 | service_name | 재무팀 |
| 9 | 리전 | region | null |
| 10 | Region | region | null |
| 11 | 지역 | region | 재무팀 |
| 12 | 사용일자 | usage_date | null |
| 13 | Usage Date | usage_date | null |
| 14 | 일자 | usage_date | 인프라팀 |
| 15 | 비용 | cost_amount | null |
| 16 | Cost | cost_amount | null |
| 17 | 금액 | cost_amount | 재무팀 |
| 18 | 사용금액 | cost_amount | 클라우드운영팀 |
| 19 | Amount | cost_amount | 인프라팀 |
| 20 | 통화 | currency | null |
| 21 | Currency | currency | null |
| 22 | 프로젝트 | tag_project | null |
| 23 | Project | tag_project | null |
| 24 | 프로젝트명 | tag_project | 개발1팀 |
| 25 | 부서태그 | tag_department | null |
| 26 | Department Tag | tag_department | null |
| 27 | 부서 | tag_department | 재무팀 |
| 28 | 환경 | tag_environment | null |
| 29 | Environment | tag_environment | null |
| 30 | 환경구분 | tag_environment | 인프라팀 |
| 31 | 비고 | description | null |
| 32 | Note | description | null |

---

## 9. COST_DATA (8,000건+) — DQA-001 신규

> 업로드 후 파싱된 비용 레코드. 대시보드 KPI·리포트 집계의 데이터 원천.

### 생성 규칙

- **기간**: 202404 ~ 202603 (24개월)
- **월별 행 수**: 200~500행 → 총 약 8,000~12,000행
- **계정 분포**: 7개 계정, 계정별 비중 상이
- **서비스 분포**: 15개 서비스, EC2(35%) > RDS(20%) > S3(12%) > EKS(10%) > 기타
- **태그 분포**: tag_project 10종, tag_department 7종, tag_environment 3종(prod/dev/staging)
- **비용 추세**: 월 2~5% 증가, 계절 변동 포함

### 샘플 데이터 (발췌)

| id | sheetId | accountId | serviceName | region | usageDate | costAmount | tagDepartment | yearMonth |
|----|---------|-----------|-------------|--------|-----------|------------|---------------|-----------|
| 1 | 1 | ACC-FINANCE-01 | EC2 | ap-northeast-2 | 2024.04.01 | 1,450,000 | 재무팀 | 202404 |
| 2 | 1 | ACC-INFRA-01 | RDS | ap-northeast-2 | 2024.04.01 | 820,000 | 인프라팀 | 202404 |
| 3 | 1 | ACC-DEV-01 | S3 | us-east-1 | 2024.04.02 | 350,000 | 개발1팀 | 202404 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
| 8500 | 24 | ACC-DATA-01 | Lambda | ap-northeast-2 | 2026.03.28 | 125,000 | 데이터팀 | 202603 |

---

## 10. 원천 데이터 샘플 (엑셀 시트)

프로토타입용 엑셀 데이터 생성 규칙.

### 데이터 범위

| 항목 | 값 |
|------|------|
| 계정 수 | 7개 (ACC-FINANCE-01, ACC-FINANCE-02, ACC-INFRA-01, ACC-INFRA-02, ACC-DEV-01, ACC-DEV-02, ACC-DATA-01) |
| 서비스 수 | 15개 (EC2, S3, RDS, Lambda, CloudFront, EKS, ElastiCache, DynamoDB, SQS, SNS, Route53, CloudWatch, EBS, VPC, IAM) |
| 리전 수 | 4개 (ap-northeast-2, ap-northeast-1, us-east-1, eu-west-1) |
| 월별 행 수 | 200~500행 |
| 비용 범위 | 10,000원 ~ 50,000,000원 (서비스별 편차) |

### 비용 분포 (월별 총액 기준)

| 서비스 | 비중 | 월 평균 비용 |
|--------|------|------------|
| EC2 | 35% | 43,750,000원 |
| RDS | 20% | 25,000,000원 |
| S3 | 12% | 15,000,000원 |
| EKS | 10% | 12,500,000원 |
| CloudFront | 8% | 10,000,000원 |
| Lambda | 5% | 6,250,000원 |
| 기타 (9종) | 10% | 12,500,000원 |
| **합계** | **100%** | **125,000,000원** |

### 추이 패턴

- **전체 추세**: 월 2~5% 증가 (클라우드 확장)
- **계절 변동**: 11~1월 트래픽 증가 (연말 이벤트), 3~4월 소폭 감소
- **이상 패턴**: 2025년 8월 EC2 비용 급증 (+40%, 신규 프로젝트), 2025년 12월 S3 비용 급감 (-30%, 정리)

---

## 11. 데이터 생성 우선순위 — v3.0 DQA-v2-011 반영 (§10 번호 중복 해소)

| 순위 | 데이터 | 필요 시점 | 건수 |
|------|--------|----------|------|
| 1 | Tenant / Contract / CloudAccount / SubAccount | 프로토타입 즉시 | 3 / 6 / 8 / 24 |
| 2 | Role (5권한) + User (28) | 프로토타입 즉시 | 5 + 28 |
| 3 | TenantUserScope | 프로토타입 즉시 | 60 |
| 4 | ReportTemplate | 프로토타입 즉시 | 6건 |
| 5 | UploadBatch + Sheet | 프로토타입 즉시 | 24건+ |
| **6** | **COST_DATA (tenant/contract/sub 태깅)** | **프로토타입 즉시** | **8,000건+** |
| 7 | Subscriber | 구독 관리 화면 | 60건+ |
| 8 | SubscriptionLog | 구독 관리 화면 | 100건+ |
| 9 | DownloadLog | Phase 2 (Audit) | 250건+ |
| 10 | ColumnAlias (공통/테넌트) | 업로드 검증 | 32건 |
| 11 | AuditLog | 감사 화면 | 300건+ |
| 12 | ApprovalRequest (placeholder) | 승인함 화면 | 5건 |
| 13 | 원천 엑셀 데이터 | 업로드 테스트 | 24개월분 |

---

*본 문서는 프로토타입 및 QA 테스트용 더미 데이터 생성 규칙입니다. 모든 데이터는 가상이며 실제 기업·개인 정보와 무관합니다.*
*v3.0: DQA-v2-007/013/011 반영 — §3 5권한·28사용자로 교체, §5 Subscriber에 tenant_id/contract_id, §7 DownloadLog 5권한 분포, §11 번호 중복 해소.*
