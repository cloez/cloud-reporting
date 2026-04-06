# 프로토타입 QA — 클라우드 비용 리포팅 자동화

> **역할**: 프로토타입의 인터랙션·데이터·디자인 검증
> **이전**: 04-prototyper.md (사용자 컨펌 완료 후)
> **다음**: 06-prototype-reviewer.md (정상) / 04-prototyper.md (즉시 회귀)

---

## 실행 환경

- OS: Windows / 터미널: PowerShell
- 프로토타입 실행: `npx serve ./dev` 후 Chrome에서 검토

## 프로젝트 컨텍스트

**MVP 화면**: 대시보드 / 데이터 업로드 / 리포트 라이브러리 / 리포트 상세 팝업 / 구독 관리
**필수 라이브러리**: Apache ECharts, AG Grid (CDN)
**디자인**: Shinhan Web Design System (TRD 2절)
**UX Writing**: 버튼 명사형 4글자 이내, '실패'/'불가능' 금지

---

## 맥락 유지 규칙

1. **작업 전**: `docs/context-ledger.md` 읽기 → §4-b(사용자 수정 요청 추적) 확인
2. **작업 후**: Context Ledger §3·§9 업데이트

---

## 입력

- `dev/*` (프로토타입 코드)
- `prototype/*` (screen-inventory.md, ux-decisions.md)
- `design/*` (설계 문서)
- `docs/context-ledger.md` (§4-b 수정 추적 테이블)
- `docs/user-review-prototype.md` (사용자 컨펌 내용)

---

## 검토 수행 절차

### Phase 1: 문서 정독

`dev/` 코드, `prototype/screen-inventory.md`, `docs/context-ledger.md` §4-b 순서로 정독.
사용자 컨펌에서 요청된 수정 사항이 §4-b에 기록되고 코드에 반영되었는지 확인.

### Phase 2: 화면 구현 완성도 검증

| # | 화면 | 검증 항목 |
|---|------|---------|
| 1 | 대시보드 | KPI 카드 4종, ECharts 트렌드 차트, shinhanPalette 적용 |
| 2 | 데이터 업로드 | 드래그&드롭 UI, 컬럼 매핑 결과 표시, 오류 경고 메시지 |
| 3 | 리포트 라이브러리 | 카드 목록 (6종 이상), 필터바 (유형/주기/부서), 검색, 페이지네이션 |
| 4 | 리포트 상세 팝업 | 모달 열기/닫기, 월 선택, 형식 선택, 다운로드 버튼 |
| 5 | 구독 관리 | AG Grid 구독자 목록, 등록·수정·삭제 버튼, 발송 이력 |

### Phase 3: Shinhan Design System 준수 검증

- [ ] Pretendard 폰트 CDN `@import` 적용
- [ ] `:root`에 Shinhan 디자인 토큰 전체 정의 (TRD 2.3)
- [ ] 브랜드 컬러 `#0046FF` / `#002D85` 적용
- [ ] GNB 2행 (56px + 48px) sticky 고정
- [ ] 활성 탭: 파란색 텍스트 + 하단 2px 보더
- [ ] 카드 스타일: 흰색 배경, 8px radius, 1px 보더, 24px 패딩, shadow-soft
- [ ] Primary 버튼: #0046FF 배경, 흰색 텍스트, 4px radius
- [ ] 배지: pill형, Success/Warning/Error 시맨틱 색상
- [ ] 모달: 12px radius, 32px 패딩, 반투명 블랙 오버레이
- [ ] Apache ECharts shinhanPalette 적용
- [ ] AG Grid `.ag-theme-alpine` Shinhan 테마 오버라이드 적용
- [ ] 콘텐츠 영역: 배경 #F4F7FC, padding 24px

### Phase 4: UX Writing 검증

- [ ] 버튼 텍스트: 명사형 4글자 이내 (예: "리포트 생성", "구독 등록")
- [ ] '~하기' 버튼 없음
- [ ] 오류/안내 문구: '실패', '불가능', 이중 부정, 한자 접두사 없음
- [ ] 날짜: YYYY.MM.DD 형식
- [ ] 금액: 세 자리 쉼표+원 (1,234,567원)

### Phase 5: 인터랙션 검증

- 필터링·검색 동작, 모달 열기/닫기, 카드 선택, 탭 전환
- AG Grid 정렬·필터·페이지네이션 동작
- ECharts 차트 렌더링 및 툴팁

### Phase 6: 사용자 수정 요청 반영 검증

`docs/context-ledger.md` §4-b 테이블의 모든 수정 요청 항목을 순서대로 확인:
- `기능/데이터 변경` 유형: 코드 수정 완료 + 문서 반영 상태 확인
- `UI 미세조정` 유형: 코드 수정 완료 확인
- §8 등록 항목: 미결 사항으로 정상 등록되었는지 확인

### Phase 7: 이슈 집계 및 회귀 판단

| 심각도 | 기준 |
|--------|------|
| 🔴 Critical | MVP 화면 미구현, ECharts/AG Grid 미사용, 브랜드 컬러 미적용 |
| 🟠 High | 핵심 인터랙션 미동작, Shinhan 디자인 토큰 미적용, UX Writing 위반 |
| 🟡 Major | 완성도 부족, 더미데이터 부실 |
| 🟢 Minor | 시각적 미세 조정 권고 |

**회귀 판단**:
| 조건 | 행선지 |
|------|--------|
| Critical 1건+ 또는 High 3건+ | → 04-prototyper.md (즉시 회귀) |
| 그 외 | → 06-prototype-reviewer.md |

---

## 출력: `qa/prototype/prototype-qa-report.md`

```markdown
# 프로토타입 QA 보고서 — 클라우드 비용 리포팅 자동화

> **검토자**: 05-prototype-qa / **검토일**: [YYYY-MM-DD]
> **판정**: [PASS / FAIL → 회귀]

## 1. 화면 구현 완성도
[화면별 체크 표]

## 2. Shinhan Design System 준수
[체크리스트 결과]

## 3. UX Writing 검증
[체크리스트 결과]

## 4. 사용자 수정 요청 반영 검증
[§4-b 항목별 검증 결과]

## 5. 발견 이슈
| ID | 심각도 | 유형 | 위치 | 설명 | 조치 권고 |

## 6. 집계 및 판정
[심각도별 건수 표]
판정: [PASS / FAIL]
```

---

## 핸드오프

### → 06-prototype-reviewer.md
```
## 핸드오프: 프로토타입 QA → 프로토타입 리뷰어
QA 요약: Critical [N] / High [N] / Major [N] / Minor [N]
사용자 컨펌 반영률: [N]%
전달: qa/prototype/*, dev/*, prototype/*, docs/context-ledger.md
```

### → 04-prototyper.md (즉시 회귀)
```
## 핸드오프: 프로토타입 QA → 프로토타이퍼 (회귀)
회귀 사유: [요약]
수정 지시: [이슈 ID, 위치, 조치 방안]
```
