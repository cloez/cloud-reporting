# 더미 데이터 스펙 — 클라우드 비용 리포팅 자동화

> **버전**: v1.0  
> **작성일**: 2026-04-06  
> **작성자**: 01-architect  
> **용도**: 프로토타입 및 테스트용 더미 데이터 생성 규칙

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

## 3. User & Role (10건)

### Role (3건)

| id | name | description |
|----|------|-------------|
| 1 | ROLE_OPS | Cloud Ops 담당자 |
| 2 | ROLE_VIEWER | 경영진·실무자 |
| 3 | ROLE_ADMIN | 시스템 관리자 |

### User (10건)

| id | username | name | department | role | isActive |
|----|----------|------|------------|------|----------|
| 1 | admin | 관리자 | IT운영팀 | ADMIN | ✅ |
| 2 | kimops | 김영수 | 클라우드운영팀 | OPS | ✅ |
| 3 | leeops | 이지현 | 클라우드운영팀 | OPS | ✅ |
| 4 | parkview | 박서연 | 경영기획실 | VIEWER | ✅ |
| 5 | choiview | 최민준 | 재무팀 | VIEWER | ✅ |
| 6 | jungview | 정수현 | 인프라팀 | VIEWER | ✅ |
| 7 | kangview | 강도윤 | 개발1팀 | VIEWER | ✅ |
| 8 | yoonview | 윤채원 | 개발2팀 | VIEWER | ✅ |
| 9 | hwangview | 황지우 | 데이터팀 | VIEWER | ❌ |
| 10 | sonadmin | 손하늘 | IT운영팀 | ADMIN | ✅ |

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

## 5. Subscriber (50건+)

### 생성 규칙

- **부서 분포**: 경영기획실 8명, 재무팀 10명, 클라우드운영팀 5명, 인프라팀 8명, 개발1팀 7명, 개발2팀 6명, 데이터팀 6명
- **활성/비활성**: 활성 42명, 비활성 8명 (퇴사·부서이동)
- **계정 범위**: 전체(null) 15명, 특정 계정 35명
- **이메일 형식**: `{성}{이름영문}@shinhan-ds.com`

### 샘플 데이터 (발췌)

| id | name | email | department | accountScope | isActive |
|----|------|-------|------------|-------------|----------|
| 1 | 김태호 | kimth@shinhan-ds.com | 경영기획실 | null (전체) | ✅ |
| 2 | 이수진 | leesj@shinhan-ds.com | 재무팀 | ACC-FINANCE-01 | ✅ |
| 3 | 박준혁 | parkjh@shinhan-ds.com | 인프라팀 | ACC-INFRA-01 | ✅ |
| ... | ... | ... | ... | ... | ... |
| 45 | 정유나 | jungyn@shinhan-ds.com | 개발1팀 | ACC-DEV-01 | ✅ |
| 48 | 한승우 | hansw@shinhan-ds.com | 데이터팀 | ACC-DATA-01 | ❌ |
| 50 | 조민서 | choms@shinhan-ds.com | 경영기획실 | null (전체) | ❌ |

### 부서별 계정 범위 매핑

| department | accountScope 패턴 |
|------------|------------------|
| 경영기획실 | null (전체 열람) |
| 재무팀 | ACC-FINANCE-01, ACC-FINANCE-02 |
| 클라우드운영팀 | null (전체 열람) |
| 인프라팀 | ACC-INFRA-01, ACC-INFRA-02 |
| 개발1팀 | ACC-DEV-01 |
| 개발2팀 | ACC-DEV-02 |
| 데이터팀 | ACC-DATA-01 |

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

## 7. DownloadLog (200건+)

### 생성 규칙

- **기간**: 2024년 5월 ~ 2026년 3월
- **역할 분포**: OPS 80건, VIEWER 100건, ADMIN 20건
- **리포트 분포**: R01(요약) 60건, R02~R05 각 25건, R06(통합) 40건
- **시간대 분포**: 09:00~12:00 (40%), 13:00~18:00 (50%), 기타 (10%)
- **IP**: 내부망 192.168.x.x 패턴

### 샘플 데이터 (발췌)

| id | reportFileId | downloadedBy | ipAddress | downloadedAt |
|----|-------------|-------------|-----------|-------------|
| 1 | 1 | 2 | 192.168.1.101 | 2024.05.12 10:23 |
| 2 | 1 | 4 | 192.168.1.205 | 2024.05.12 14:15 |
| ... | ... | ... | ... | ... |
| 150 | 18 | 5 | 192.168.2.88 | 2025.11.15 09:45 |
| 200 | 22 | 2 | 192.168.1.101 | 2026.03.14 11:30 |

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

## 10. 데이터 생성 우선순위

| 순위 | 데이터 | 필요 시점 | 건수 |
|------|--------|----------|------|
| 1 | ReportTemplate | 프로토타입 즉시 | 6건 |
| 2 | User & Role | 프로토타입 즉시 | 10건 + 3건 |
| 3 | UploadBatch + Sheet | 프로토타입 즉시 | 24건+ |
| **4** | **COST_DATA** | **프로토타입 즉시 (대시보드·리포트)** | **8,000건+** |
| 5 | Subscriber | 구독 관리 화면 | 50건+ |
| 6 | SubscriptionLog | 구독 관리 화면 | 100건+ |
| 7 | DownloadLog | Phase 2 (Audit) | 200건+ |
| 8 | ColumnAlias | 업로드 검증 | 32건 |
| 9 | 원천 엑셀 데이터 | 업로드 테스트 | 24개월분 |

---

*본 문서는 프로토타입 및 QA 테스트용 더미 데이터 생성 규칙입니다. 모든 데이터는 가상이며 실제 기업·개인 정보와 무관합니다.*
