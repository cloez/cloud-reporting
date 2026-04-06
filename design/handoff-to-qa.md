# 핸드오프: 설계 에이전트 → 설계 QA

## 메타
- 일시: 2026-04-06
- 에이전트: 01-architect
- 회차: 1
- 유형: 정방향

## 전달 아티팩트

| 파일 | 내용 | 버전 |
|------|------|------|
| design/feature-decomposition.md | 기능 분해표 — MVP 6종 → 화면 → 컴포넌트 3단계 매핑 + RBAC 권한 | v1.0 |
| design/data-model.md | 데이터 모델 — 12개 엔티티 ERD(Mermaid) + 필드 상세 + OPEN-002 스키마 가정 | v1.0 |
| design/screen-flow.md | 화면 흐름도 — GNB 2행, 7개 화면, 모달 흐름 (Mermaid flowchart) | v1.0 |
| design/component-spec.md | 컴포넌트 설계서 — Props 타입, ECharts/AG Grid 스펙, Shinhan 토큰 | v1.0 |
| design/api-spec.md | API 설계서 — 35개 REST 엔드포인트, JWT Bearer, RBAC 역할별 접근 | v1.0 |
| design/dummy-data-spec.md | 더미 데이터 스펙 — 6종 템플릿, 50명+ 구독자, 한국어 데이터 | v1.0 |
| docs/context-ledger.md | Context Ledger 업데이트 — §3, §5, §6, §8, §9 갱신 | v0.2 |

## 주요 가정 사항 (미결 사항 처리 방식)

| ID | 미결 사항 | 설계 가정 | 근거 |
|----|----------|----------|------|
| OPEN-001 | Top 6 리포트 미확정 | R01 Cost&Usage 요약, R02 Product·Region별, R03 Service별, R04 Tag별, R05 Account&Forecast, R06 통합 내보내기 | BRD §4.2 리포트 생성 유형 목록 |
| OPEN-002 | 표준 데이터 스키마 | 14개 컬럼 (account_id, service_name, region, usage_date, cost_amount 등) | 클라우드 비용 공통 체계 |
| OPEN-003 | 권한 범위 | ROLE_VIEWER 소속부서 제한, ROLE_OPS 전체, ROLE_ADMIN 관리 전용 | BRD §3 역할 정의 |
| OPEN-004 | 휴일 순연 | 익영업일 자동 순연 | BRD §4.2 구독 발송 규칙 |
| OPEN-005 | JWT vs 세션 | JWT (Access 30분 + Refresh 7일) | CLAUDE.md 지정 |
| OPEN-006 | 파일 스토리지 | 로컬 볼륨 + 추상화 레이어 (S3 전환 용이) | MVP 단계 단순화 |
| OPEN-007 | PDF 라이브러리 | iText | TRD §1 예시 우선 |
| OPEN-008 | 이메일 서비스 | JavaMailSender 추상화 (외부 서비스 교체 용이) | 구현 유연성 |

## 설계 주요 수치

| 항목 | 수치 |
|------|------|
| MVP 기능 | 6종 |
| 화면 수 | 7개 (로그인 포함) |
| DB 엔티티 | 12개 |
| REST API | 35개 엔드포인트 |
| 컴포넌트 | 30+ (공통 7, 업로드 5, 라이브러리 3, 모달 4, 구독 4, 차트 4, 기타) |
| 더미 데이터 | 8종 (User 10, Template 6, Batch 24+, Subscriber 50+, SubLog 100+, DLLog 200+, Alias 32) |

## QA 지시사항

1. **기능 커버리지 전수 검증**: docs/brd.md의 MVP 6종 기능이 feature-decomposition.md에 빠짐없이 매핑되었는지 확인
2. **미결 사항 가정 합리성**: 8개 OPEN 항목의 가정이 BRD/TRD와 모순 없는지 검토
3. **기술 제약 반영 확인**:
   - Apache ECharts — component-spec.md §6 차트 컴포넌트 반영 여부
   - AG Grid — component-spec.md §7 그리드 설정 반영 여부
   - Shinhan Design System — 전체 컴포넌트 토큰 적용 여부
   - Claude API 서버사이드 전용 — api-spec.md에 프론트엔드 호출 경로 없음 확인
4. **데이터 모델 정합성**: ERD 관계가 API 설계 및 화면 흐름과 일관되는지 확인
5. **RBAC 일관성**: feature-decomposition §3 권한 매핑이 api-spec.md 접근 역할과 일치하는지 확인
6. **UX Writing 규칙**: 더미 데이터 오류 메시지가 TRD §2.8 규칙(금지 표현 없음, 능동형) 준수 여부

## 다음 단계

설계 QA(02-design-qa) 완료 후:
- Critical 0건 + High 3건 미만 → 설계 리뷰어(03-design-reviewer)로 진행
- Critical 1건+ 또는 High 3건+ → 설계 에이전트(01-architect) 회귀
