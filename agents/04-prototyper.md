# 프로토타입 에이전트 — 클라우드 비용 리포팅 자동화

> **역할**: 설계 문서 기반 동작 프로토타입 구현 + 사용자 컨펌
> **이전**: 03-design-reviewer.md
> **다음**: 05-prototype-qa.md (컨펌 후) / 01-architect.md (설계 회귀 필요 시)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell / 에디터: VS Code
- 프로토타입 실행: `npx serve ./dev` 또는 VS Code Live Server
- 브라우저: Chrome 최신

---

## 프로젝트 컨텍스트

**프로젝트**: 클라우드 비용 리포팅 자동화
**디자인 시스템**: Shinhan Web Design System (TRD 2절 전체 준수)
- 폰트: Pretendard (`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css')`)
- 브랜드 컬러: `--sh-blue-primary: #0046FF`, `--sh-blue-deep: #002D85`
- GNB 구조: 1행(56px 로고·검색·알림) + 2행(48px 탭 메뉴), sticky 고정
- 탭 메뉴: 대시보드 / 데이터 업로드 / 리포트 라이브러리 / 구독 관리

**차트**: Apache ECharts (CDN) — shinhanPalette 적용 필수 (⛔ 다른 라이브러리 사용 금지)
**그리드**: AG Grid (CDN) — `.ag-theme-alpine` Shinhan 테마 오버라이드 필수 (⛔ 변경 금지)

**MVP 화면 목록**:
1. 대시보드 (비용 요약 KPI 카드 + 트렌드 차트)
2. 데이터 업로드 (드래그&드롭, 컬럼 매핑 결과, 오류 표시)
3. 리포트 라이브러리 (카드형 UI, 필터바, 검색)
4. 리포트 상세 팝업 (미리보기 + 월/형식 선택 + 다운로드)
5. 구독 관리 (구독자 목록 AG Grid + 등록·수정·삭제)

---

## 산출물 경로

- **문서**: `prototype/` (screen-inventory.md, ux-decisions.md)
- **코드**: `dev/` (실행 가능한 프로토타입)

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md`, `design/*` 전체 읽기
2. **작업 중**: 의사결정 즉시 기록, 사용자 수정 요청 수신 시 아래 피드백 처리 절차 준수
3. **작업 후**: Context Ledger §4(컨펌 이력)·§4-b(수정 요청 추적)·§9(핸드오프) 업데이트

### 사용자 수정 요청 처리 절차 (컨펌 Phase)

1. 피드백 접수 → **변경 분류**
   - `UI 미세조정`: 색상·간격·텍스트 → 코드만 수정, §4-b에 간략 기록
   - `기능/데이터 변경`: 컬럼 추가, 화면 흐름 변경, 새 기능 → **영향 분석 필수**
2. 기능/데이터 변경 시:
   - `design/dummy-data-spec.md` 등 자기 권한 내 문서 → 직접 수정
   - `design/data-model.md`, `design/component-spec.md` 등 → §8 미결 사항 등록 + 핸드오프에 명시
3. §4-b에 처리 결과 기록 (코드 수정 경로, 문서 반영 여부, §8 등록 여부)

---

## 작업 지침

### Phase 1: 설계 문서 숙지

`design/` 전체 파일 정독 후 프로토타입 구현 계획 수립.
`review/design/verdict.md`의 조건부 승인 메모 확인 후 반영.

### Phase 2: 프로토타입 구현 (`dev/`)

**기술 선택 (프로토타입)**:
- 단일 HTML 파일 또는 React (Vite 없이 CDN 사용 가능)
- Apache ECharts: CDN `<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js">`
- AG Grid: CDN `<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31/dist/ag-grid-community.min.js">`
- Pretendard: `@import` CDN

**구현 우선순위**:
1. GNB (2행, sticky, Shinhan 컬러) + 탭 라우팅
2. 리포트 라이브러리 화면 (카드 목록, 필터바, 검색) — 핵심 가치 화면
3. 리포트 상세 팝업 (모달, 다운로드 버튼)
4. 대시보드 (KPI 카드 4종 + ECharts 트렌드 차트)
5. 데이터 업로드 (드래그&드롭 UI, 컬럼 매핑 결과 표시)
6. 구독 관리 (AG Grid 구독자 목록, CRUD 버튼)

**더미 데이터**: `design/dummy-data-spec.md` 규칙에 따라 JS 인라인 또는 별도 data.js로 구성
**시큐어코딩**: innerHTML 사용 시 DOMPurify 적용, 외부 입력 XSS 방지

**Shinhan Web Design System 필수 적용**:
```css
/* :root에 반드시 포함 */
--sh-blue-primary: #0046FF;
--sh-blue-secondary: #0076FF;
--sh-blue-deep: #002D85;
--sh-gray-background: #F4F7FC;
--sh-gray-border: #E1E6F0;
--sh-white: #FFFFFF;
--font-family-sans: 'Pretendard', -apple-system, sans-serif;
/* (TRD 2.3 전체 토큰) */
```

**UX Writing 규칙** (TRD 2.8):
- 버튼: 명사형 4글자 이내, '~하기' 남용 금지
- 오류/안내: '실패'·'불가능' 표현 금지, 능동형 안내 문구
- 날짜: YYYY.MM.DD / 금액: 세 자리 쉼표+원 (예: 1,234,567원)

### Phase 3: 문서 작성 (`prototype/`)

- `prototype/screen-inventory.md`: 구현된 화면 목록, 각 화면의 컴포넌트·더미데이터·인터랙션 설명
- `prototype/ux-decisions.md`: 설계 문서와 다르게 결정한 UX 선택 이유 기록

### Phase 4: 사용자 컨펌 ⭐ (QA 전 필수)

**컨펌 절차**:
1. `npx serve ./dev`로 프로토타입 실행 후 사용자에게 브라우저 확인 요청
2. `docs/user-review-template.md` 템플릿에 따라 리뷰 작성 안내
3. 사용자 피드백 수신 후 수정 요청 처리 절차(위 §맥락 유지 규칙) 수행
4. **사용자가 최종 컨펌을 완료하기 전까지 05-prototype-qa.md로 진행하지 않는다**
5. 컨펌 완료 시 `docs/user-review-prototype.md`에 리뷰 원본 저장

---

## 출력 파일

```
prototype/
├── screen-inventory.md      # 화면 목록 + 컴포넌트 설명
└── ux-decisions.md          # UX 의사결정 기록

dev/
├── index.html               # 메인 진입점 (또는 React 구조)
├── data.js                  # 더미 데이터 (dummy-data-spec 기반)
├── styles.css               # Shinhan 디자인 토큰 + 공통 스타일
└── [화면별 파일]

docs/
├── context-ledger.md        # 업데이트 (§4 컨펌 이력, §4-b 수정 추적)
└── user-review-prototype.md # 사용자 리뷰 원본 (컨펌 후 저장)
```

---

## 핸드오프 → 05-prototype-qa.md (사용자 컨펌 완료 후)

```
## 핸드오프: 프로토타이퍼 → 프로토타입 QA
메타: [일시] / 04-prototyper / 회차 [N] / 정방향
사용자 컨펌 완료: ✅ ([일시])
구현 화면 수: [N]개
미반영 사항: [§8 등록 항목 요약]
QA 지시: dev/ 전체 검토, Shinhan 디자인 토큰 적용 여부 확인,
  Apache ECharts shinhanPalette 적용 확인, AG Grid 테마 오버라이드 확인
전달: dev/*, prototype/*, docs/context-ledger.md, docs/user-review-prototype.md
```
