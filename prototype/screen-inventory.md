# Screen Inventory — 프로토타입 화면 목록

> **작성**: 04-prototyper / 2026-04-06
> **프로토타입 경로**: `dev/`
> **실행 방법**: `npx serve ./dev` → http://localhost:3000

---

## 구현 화면 요약

| # | 화면 | 해시 라우트 | 상태 | 주요 컴포넌트 |
|---|------|-----------|------|-------------|
| 1 | 대시보드 | `#/dashboard` | ✅ | KPI 카드 4종, CostTrendChart, ServiceTopChart, RecentReportGrid |
| 2 | 데이터 업로드 | `#/upload` | ✅ | UploadDropzone, ProgressBar, ColumnMappingPanel, ValidationResult, UploadHistoryGrid |
| 3 | 리포트 라이브러리 | `#/reports` | ✅ | FilterBar, ReportCardGrid(3열), 카테고리/기간/검색 필터 |
| 4 | 리포트 상세 팝업 | 모달 | ✅ | ReportDetailModal, MonthSelector, FormatSelector, PreviewChart, 생성이력 |
| 5 | 구독 관리 | `#/subscriptions` | ✅ | ScheduleStatusCard, SubscriberGrid(AG Grid), SubscriptionLogGrid, SubscriberFormModal |
| G | GNB (공통) | — | ✅ | 2행 구조(56px+48px), 로고, 검색, 알림, 설정, 사용자 프로필, 탭 네비게이션 |

---

## 1. GNB (Global Navigation Bar)

- **1행** (56px): 로고 "CLOUD COST REPORTING" + 메뉴 검색 + 알림(뱃지) + 설정 + 사용자 프로필
- **2행** (48px): 탭 메뉴 — 대시보드 | 데이터 업로드 | 리포트 라이브러리 | 구독 관리
- **sticky** 고정, z-index: 100
- 현재 탭 하단 3px 인디케이터 (--sh-blue-primary)
- 해시 라우팅으로 탭 전환

---

## 2. 대시보드 (`#/dashboard`)

### KPI 카드 (4종)
| 카드 | 데이터 | 아이콘 |
|------|-------|-------|
| 이번 달 총 비용 | MONTHLY_COSTS 마지막 값, KRW 포맷 | 💰 |
| 전월 대비 변동 | 차이 금액 + 증감 방향 | 📊 |
| 생성된 리포트 | REPORT_FILES COMPLETED 건수 | 📋 |
| 활성 구독자 | SUBSCRIBERS isActive 합계 | 👥 |

### 차트
- **월별 비용 추이**: ECharts line, 12개월, smooth, 그라데이션 area, #0046FF
- **서비스별 비용 TOP 5**: ECharts 가로 bar, shinhanPalette 색상, 금액 라벨

### 최근 생성 리포트
- AG Grid, 5건, 열: 리포트명/대상 월/형식/크기/생성일/상태

---

## 3. 데이터 업로드 (`#/upload`)

### 인터랙션 플로우
1. **Dropzone**: 드래그&드롭 또는 클릭, .xlsx/.xls 파일만 허용
2. **Progress**: 업로드→파싱→매핑→검증 단계 표시 (시뮬레이션)
3. **컬럼 매핑**: 10개 컬럼 자동 매핑 결과, 신뢰도(%), 자동/수동 뱃지
4. **검증 결과**: info/warning/error 분류, 건수 + 상세 메시지
5. **업로드 확정**: 토스트로 완료 알림

### 업로드 이력
- AG Grid, UPLOAD_BATCHES 역순, 열: 대상 월/업로드자/시트 수/행 수/상태/오류 내용/업로드 일시
- 페이지네이션 10건/페이지

---

## 4. 리포트 라이브러리 (`#/reports`)

### 필터바
- 유형(category) 셀렉트: 전체/비용분석/비용배분/예측/내보내기
- 기간(month) 셀렉트: 최근 12개월
- 검색 입력: 리포트명/설명 실시간 필터
- 초기화 버튼

### 카드 그리드
- 3열 반응형 (1100px→2열, 700px→1열)
- 카드 구성: 아이콘 + 코드(R01~R06) + 이름 + 설명 + 카테고리 + 최신 파일 상태
- hover: 그림자 증가 + 2px 상승 + 파란 테두리
- 클릭 → ReportDetailModal 오픈

### 빈 상태
- 검색 결과 없을 때 안내 메시지

---

## 5. 리포트 상세 팝업 (모달)

### 구조
- 헤더: 아이콘 + 리포트명 + 닫기(✕)
- 정보 영역: 코드, 카테고리, 차트 유형, 설명
- 액션 영역: 대상 월 셀렉트 + 형식 셀렉트(XLSX/PDF) + 다운로드 + 새로 생성
- 미리보기: 차트 유형별 ECharts 렌더링
  - line → 비용 추이 라인차트
  - bar → 서비스별 바차트
  - pareto → 파레토 (바+누적라인+80% 기준선)
  - treemap → 부서별 트리맵
  - null → Export 전용 안내
- 생성 이력 테이블 (최근 5건)

### 닫기
- ✕ 버튼 / ESC 키 / 오버레이 클릭

---

## 6. 구독 관리 (`#/subscriptions`)

### 스케줄 상태 카드
- 다음 발송일 (2026.04.10) / 활성 구독자 수 / 최근 발송 결과 / 수동 발송 버튼

### 구독자 목록 (AG Grid)
- 열: 이름/이메일/부서/수신 범위/상태/관리(수정·삭제)
- 페이지네이션 10건, 정렬·필터 지원
- 등록 버튼 → SubscriberFormModal
- 수정 → 기존 데이터 프리필
- 삭제 → confirm 확인 → 비활성화

### 발송 이력 (AG Grid)
- 열: 대상 월/수신자/이메일/부서/상태/재시도/오류 내용/발송 일시
- 상태별 색상 뱃지 (발송 완료/실패/재시도 중/대기)

---

## 더미 데이터 요약

| 데이터 | 건수 | 출처 |
|-------|------|------|
| 사용자 | 10명 | dummy-data-spec §4 |
| 리포트 템플릿 | R01~R06 (6개) | dummy-data-spec §2 |
| 업로드 배치 | 24개월 (2024.04~2026.03) | dummy-data-spec §5 |
| 월별 비용 | 24개월 (1.18억 기반 성장) | dummy-data-spec §10 |
| 서비스별 비용 | 10개 서비스 | dummy-data-spec §10 |
| 리포트 파일 | 6템플릿×6개월 = 36건 | 생성 |
| 구독자 | 50명 (42활성, 8비활성) | dummy-data-spec §6 |
| 발송 로그 | ~80건 (8개월) | dummy-data-spec §7 |

---

## 기술 스택

| 항목 | 사용 |
|------|------|
| 구조 | Vanilla JS + 해시 라우팅 (SPA) |
| 차트 | Apache ECharts v5 (CDN) — shinhanPalette 적용 |
| 그리드 | AG Grid Community v31 (CDN) — alpine 테마 + Shinhan 오버라이드 |
| 디자인 | Shinhan Web Design System (CSS 변수 토큰) |
| 폰트 | Pretendard (CDN @import) |
