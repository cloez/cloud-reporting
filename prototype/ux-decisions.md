# UX Decisions — 프로토타입 의사결정 기록

> **작성**: 04-prototyper / 2026-04-06

---

## 설계 대비 변경/결정 사항

### UXD-001: 해시 라우팅 채택

- **설계**: React SPA (screen-flow.md)
- **프로토타입**: Vanilla JS + 해시 라우팅 (`#/dashboard`, `#/upload` 등)
- **사유**: 프로토타입 단계에서 빌드 도구 없이 `npx serve`로 즉시 실행 가능하도록 경량 구현. 프로덕션(07-builder)에서 React SPA로 전환 예정.
- **영향**: 없음 — 화면 구조와 컴포넌트는 동일하게 구현

### UXD-002: 단일 HTML 진입점 + JS 분리

- **설계**: React 컴포넌트 트리
- **프로토타입**: `index.html` (셸) + `data.js` (더미) + `app.js` (전체 로직) + `styles.css`
- **사유**: CDN 기반 프로토타입에서 파일 수를 최소화하여 관리 용이성 확보
- **영향**: 프로덕션에서 컴포넌트 단위 파일 분리 필요

### UXD-003: 로그인 화면 미구현

- **설계**: `/login` 화면 포함 (screen-flow.md)
- **프로토타입**: 미구현 — `CURRENT_USER = kimops (ROLE_OPS)`로 하드코딩
- **사유**: 프로토타입 목적이 UI/UX 검증이므로, 인증 플로우는 프로덕션에서 구현
- **영향**: 없음 — RBAC 기반 접근 제어는 프로덕션에서 Spring Security로 구현

### UXD-004: 관리자(Users) 탭 미포함

- **설계**: ROLE_ADMIN 전용 `/admin/users` 화면
- **프로토타입**: GNB 탭에서 제외 (현재 사용자가 ROLE_OPS이므로)
- **사유**: MVP 핵심 화면 5개에 집중, 관리자 화면은 ROLE_ADMIN 전용이므로 프로토타입 범위 외
- **영향**: 프로덕션에서 ROLE_ADMIN 로그인 시 탭 동적 표시

### UXD-005: 업로드 시뮬레이션

- **설계**: 실제 파일 파싱 + 서버 통신
- **프로토타입**: 파일 선택 후 시뮬레이션 (progress bar 애니메이션 → 고정 매핑 결과 표시)
- **사유**: 백엔드 없이 UI 플로우만 검증
- **영향**: 프로덕션에서 실제 API 연동 필요

### UXD-006: 리포트 다운로드 토스트 대체

- **설계**: 실제 파일 다운로드 (GET /reports/{id}/download)
- **프로토타입**: 토스트 알림으로 대체 ("다운로드 시작")
- **사유**: 실제 파일 생성 불가
- **영향**: 프로덕션에서 Blob 다운로드 구현

### UXD-007: 구독자 CRUD 비영속

- **설계**: API를 통한 영속적 CRUD
- **프로토타입**: 등록/수정/삭제 시 토스트만 표시, 실제 데이터 미변경
- **사유**: 서버 없이 UI 인터랙션만 검증
- **영향**: 프로덕션에서 API 연동 + 상태 관리

### UXD-008: DQA-010 batch_id nullable 반영

- **설계 리뷰**: REPORT_FILE.batch_id를 nullable FK로 처리 (조건부 승인 사항)
- **프로토타입**: 더미 데이터에서 batch_id 필드 미포함 (yearMonth 기반 조회)
- **사유**: 프로토타입에서는 COST_DATA 기반 월별 조회만 시뮬레이션
- **영향**: 프로덕션 DB 스키마에서 `batch_id BIGINT NULL REFERENCES upload_batch(id)` 적용 필요

---

## UX Writing 적용 내역

| 원칙 | 적용 사례 |
|------|---------|
| 버튼 4글자 이내 | "다운로드", "등록", "수정", "삭제", "초기화", "취소", "저장" |
| 능동형 안내 | "엑셀 파일을 드래그하거나 클릭하여 선택" (× "파일이 필요합니다") |
| 날짜 형식 | YYYY.MM.DD (예: 2026.03.10) |
| 금액 형식 | 세 자리 쉼표 + 원 (예: 152,000,000원) |
| 오류 메시지 | "cost_amount 값 'N/A'는 숫자가 아닙니다" (× "형식 오류 발생") |

---

## Shinhan Design System 적용 확인

| 항목 | 적용 |
|------|------|
| 브랜드 컬러 (#0046FF, #002D85) | ✅ CSS 변수 전체 적용 |
| Pretendard 폰트 | ✅ CDN @import |
| GNB 2행 구조 (56px + 48px) | ✅ sticky 고정 |
| ECharts shinhanPalette | ✅ 7색 팔레트 적용 |
| AG Grid alpine 테마 오버라이드 | ✅ --ag-* CSS 변수 |
| 상태 뱃지 색상 체계 | ✅ success/warning/error/info/pending |
| 반응형 브레이크포인트 | ✅ 1100px, 700px |
