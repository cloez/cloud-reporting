/**
 * 더미 데이터 — dummy-data-spec.md 기반
 * 신한DS 형식, 한국어, KRW 통화
 */

// ══════════════════════════════════════════
// v2 멀티테넌트 시드 — design v3.0 (dummy-data-spec §0.1~§0.5, §3)
// ══════════════════════════════════════════

// ── 테넌트 (3건) — §0.1 정본
//   고객 마스터 속성 확장 (사용자 피드백 반영):
//     customerType : CORP(법인) / INDIV(개인) / INTERNAL(내부조직) / GROUP(그룹사)
//     status       : ACTIVE(활성) / DORMANT(휴면) / TERMINATED(해지) / SUSPENDED(정지)
//   bizRegNo     : 사업자등록번호 (10자리, 하이픈 표기)
//   corpRegNo    : 법인등록번호 (13자리, 하이픈 표기)
//   representative : 대표자명
//   industry / businessType : 업종 / 업태
//   joinDate / terminateDate : 가입일 / 해지일 (해지 전이면 null)
const TENANTS = [
  {
    id: 'AD000001K3', slug: 'shinhan-card', name: '신한카드',
    customerType: 'CORP', status: 'ACTIVE',
    bizRegNo: '202-81-08953', corpRegNo: '110111-0481533',
    representative: '문동권',
    industry: '여신전문금융업', businessType: '신용카드업',
    joinDate: '2025-12-15', terminateDate: null,
    adminEmail: 'admin@shinhancard.com', createdAt: '2025-12-15T09:00:00',
  },
  {
    id: 'AD000002L9', slug: 'shinhan-life', name: '신한라이프',
    customerType: 'CORP', status: 'ACTIVE',
    bizRegNo: '108-81-15659', corpRegNo: '110111-0009482',
    representative: '이영종',
    industry: '보험업', businessType: '생명보험',
    joinDate: '2025-12-20', terminateDate: null,
    adminEmail: 'admin@shinhanlife.com', createdAt: '2025-12-20T09:00:00',
  },
  {
    id: 'AD000003M2', slug: 'shinhan-internal', name: '신한DS 내부',
    customerType: 'INTERNAL', status: 'ACTIVE',
    bizRegNo: '214-81-37934', corpRegNo: '110111-1234567',
    representative: '조경선',
    industry: '소프트웨어 개발 및 공급', businessType: '시스템 통합',
    joinDate: '2026-01-05', terminateDate: null,
    adminEmail: 'admin@shinhands.com', createdAt: '2026-01-05T09:00:00',
  },
];

// ── 계약 (6건) — §0.2 SHC/SHL/SDS 접두사
//   계약 마스터 속성 확장 (사용자 피드백 반영):
//     type            : DIRECT(직접계약) / AGENT(대행) / MSP(MSP) / RESELL(리셀링) / INTERNAL(그룹내부정산)
//     currency        : KRW / USD
//     billing         : MONTHLY(월) / QUARTERLY(분기) / SEMIANNUAL(반기) / YEARLY(연)
//     status          : ACTIVE / EXPIRED / DRAFT
//     taxType         : VAT_INCLUDED(부가세 포함) / VAT_EXCLUDED(별도) / TAX_FREE(면세)
//     paymentTerm     : POSTPAID(후불) / PREPAID(선불) / MONTH_END(월말정산)
//     invoiceIssueDay : 청구서 발행 기준일 (매월 1~28일 정수)
//     paymentDueDays  : 납부기한 (청구일 기준 + N일)
const CONTRACTS = [
  { id: 1, code: 'SHC-2026-001', tenantId: 'AD000001K3', tenantSlug: 'shinhan-card', name: 'AWS 운영 환경 직계약', type: 'DIRECT',   currency: 'KRW', billing: 'MONTHLY',    status: 'ACTIVE',  effectiveFrom: '2026-01-01', effectiveTo: null,
    taxType: 'VAT_EXCLUDED', paymentTerm: 'POSTPAID',  invoiceIssueDay: 5,  paymentDueDays: 30 },
  { id: 2, code: 'SHC-2026-002', tenantId: 'AD000001K3', tenantSlug: 'shinhan-card', name: 'AWS 분석 환경 MSP',   type: 'MSP',      currency: 'KRW', billing: 'MONTHLY',    status: 'ACTIVE',  effectiveFrom: '2026-01-01', effectiveTo: null,
    taxType: 'VAT_INCLUDED', paymentTerm: 'POSTPAID',  invoiceIssueDay: 10, paymentDueDays: 30 },
  { id: 3, code: 'SHL-2026-001', tenantId: 'AD000002L9', tenantSlug: 'shinhan-life', name: 'AWS 통합 운영',       type: 'DIRECT',   currency: 'USD', billing: 'MONTHLY',    status: 'ACTIVE',  effectiveFrom: '2026-01-01', effectiveTo: null,
    taxType: 'VAT_EXCLUDED', paymentTerm: 'POSTPAID',  invoiceIssueDay: 5,  paymentDueDays: 45 },
  { id: 4, code: 'SHL-2025-007', tenantId: 'AD000002L9', tenantSlug: 'shinhan-life', name: 'AWS 신계약전용 (만료)', type: 'AGENT',  currency: 'KRW', billing: 'MONTHLY',    status: 'EXPIRED', effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31',
    taxType: 'VAT_INCLUDED', paymentTerm: 'MONTH_END', invoiceIssueDay: 1,  paymentDueDays: 30 },
  { id: 5, code: 'SDS-2026-001', tenantId: 'AD000003M2', tenantSlug: 'shinhan-internal', name: '그룹 내부정산',     type: 'INTERNAL', currency: 'KRW', billing: 'QUARTERLY',  status: 'ACTIVE',  effectiveFrom: '2026-01-01', effectiveTo: null,
    taxType: 'TAX_FREE',     paymentTerm: 'MONTH_END', invoiceIssueDay: 1,  paymentDueDays: 60 },
  { id: 6, code: 'SDS-2026-002', tenantId: 'AD000003M2', tenantSlug: 'shinhan-internal', name: '사내 개발환경',     type: 'RESELL',   currency: 'KRW', billing: 'MONTHLY',    status: 'DRAFT',   effectiveFrom: '2026-02-01', effectiveTo: null,
    taxType: 'VAT_EXCLUDED', paymentTerm: 'PREPAID',   invoiceIssueDay: 25, paymentDueDays: 15 },
];

// ── Cloud Account (Payer, 8건) — §0.3 ──
// ── Cloud Accounts (Payer/Billing 레벨) ──
// provider별 상위 계정 명칭: AWS=Management Account, AZURE=Billing Account,
//   GCP=Billing Account, NHN=Organization, OCI=Tenancy, KT=Account, NBP=Master Account
let CLOUD_ACCOUNTS = [
  { id: 1, contractId: 1, payerAccountId: '100000000001', name: 'SHC-PROD-Payer',      provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-01-01', effectiveTo: null,         description: '신한카드 운영 환경 AWS Management Account' },
  { id: 2, contractId: 2, payerAccountId: '100000000002', name: 'SHC-ANALYTICS-Payer', provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-01-01', effectiveTo: null,         description: '신한카드 분석 환경 MSP 계약' },
  { id: 3, contractId: 3, payerAccountId: '200000000001', name: 'SHL-Main-Payer',       provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-01-01', effectiveTo: null,         description: '신한라이프 메인 AWS' },
  { id: 4, contractId: 4, payerAccountId: '200000000099', name: 'SHL-Legacy-Payer',     provider: 'AWS',   status: 'EXPIRED',  effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', description: '신한라이프 구형 계정 (만료)' },
  { id: 5, contractId: 5, payerAccountId: '300000000001', name: 'SDS-Group-Payer',      provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-01-01', effectiveTo: null,         description: '신한DS 그룹 내부정산' },
  { id: 6, contractId: 6, payerAccountId: '300000000002', name: 'SDS-Dev-Payer',        provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-02-01', effectiveTo: null,         description: '신한DS 사내 개발 환경' },
  { id: 7, contractId: 1, payerAccountId: '100000000003', name: 'SHC-DR-Payer',         provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-03-01', effectiveTo: null,         description: '신한카드 DR 리전 계정' },
  { id: 8, contractId: 3, payerAccountId: '200000000002', name: 'SHL-Sub-Payer',        provider: 'AWS',   status: 'ACTIVE',   effectiveFrom: '2026-02-01', effectiveTo: null,         description: '신한라이프 보조 계정' },
  { id: 9, contractId: 1, payerAccountId: 'shc-azure-ea-001',  name: 'SHC-Azure-EA',   provider: 'AZURE', status: 'ACTIVE',   effectiveFrom: '2026-01-01', effectiveTo: null,         description: '신한카드 Azure EA Billing Account' },
  { id: 10, contractId: 3, payerAccountId: 'shl-gcp-ba-001',   name: 'SHL-GCP-Billing', provider: 'GCP',   status: 'ACTIVE',   effectiveFrom: '2026-01-01', effectiveTo: null,         description: '신한라이프 GCP Billing Account' },
  { id: 11, contractId: 5, payerAccountId: 'sds-nhn-org-001',  name: 'SDS-NHN-Org',    provider: 'NHN',   status: 'ACTIVE',   effectiveFrom: '2026-03-01', effectiveTo: null,         description: '신한DS NHN Cloud Organization' },
];

// ── Cloud Sub-Accounts (Linked/Subscription/Project 레벨) ──
// provider별 하위 계정 명칭: AWS=Linked Account, AZURE=Subscription,
//   GCP=Project, NHN=Project, OCI=Compartment, KT=Zone, NBP=Sub Account
let CLOUD_SUB_ACCOUNTS = (() => {
  const purposes = ['was', 'rds', 'analytics', 'dev', 'data', 'sec'];
  const envs = ['prod', 'stg', 'dev'];
  const subs = [];
  let id = 1;
  // AWS 계정만 자동 생성 (id 1~8)
  CLOUD_ACCOUNTS.filter(p => p.provider === 'AWS').forEach((payer) => {
    const contract = CONTRACTS.find(c => c.id === payer.contractId);
    if (!contract) return;
    const tenantSlug = contract.tenantSlug.replace('shinhan-', 'sh-');
    for (let i = 0; i < 3; i++) {
      const purpose = purposes[(payer.id + i) % purposes.length];
      const env = envs[i % envs.length];
      subs.push({
        id: `csa-${String(id).padStart(2, '0')}`,
        numericId: id,
        payerId: payer.id,
        contractId: payer.contractId,
        tenantId: contract.tenantId,
        provider: payer.provider,
        accountId: `${payer.payerAccountId.slice(0, 9)}${String(id).padStart(3, '0')}`,
        name: `${tenantSlug}-${purpose}-${env}`,
        purpose,
        env,
        status: 'ACTIVE',
        description: '',
        tags: '',
      });
      id++;
    }
  });
  // Azure Subscription 샘플 (SHC Azure EA 하위)
  subs.push({ id: 'csa-25', numericId: 25, payerId: 9, contractId: 1, tenantId: 'AD000001K3', provider: 'AZURE', accountId: 'sub-shc-prod-001', name: 'SHC-Azure-Prod-Sub', purpose: 'prod', env: 'prod', status: 'ACTIVE', description: '운영 Subscription', tags: 'env:prod' });
  subs.push({ id: 'csa-26', numericId: 26, payerId: 9, contractId: 1, tenantId: 'AD000001K3', provider: 'AZURE', accountId: 'sub-shc-dev-001',  name: 'SHC-Azure-Dev-Sub',  purpose: 'dev',  env: 'dev',  status: 'ACTIVE', description: '개발 Subscription', tags: 'env:dev' });
  // GCP Project 샘플 (SHL GCP Billing 하위)
  subs.push({ id: 'csa-27', numericId: 27, payerId: 10, contractId: 3, tenantId: 'AD000002K3', provider: 'GCP', accountId: 'shl-gcp-proj-data', name: 'SHL-GCP-Data-Project', purpose: 'data', env: 'prod', status: 'ACTIVE', description: 'GCP 데이터 분석 프로젝트', tags: 'team:data' });
  // NHN Project 샘플 (SDS NHN 하위)
  subs.push({ id: 'csa-28', numericId: 28, payerId: 11, contractId: 5, tenantId: 'AD000003K3', provider: 'NHN', accountId: 'sds-nhn-proj-01', name: 'SDS-NHN-Dev-Project', purpose: 'dev', env: 'dev', status: 'ACTIVE', description: 'NHN 개발 프로젝트', tags: 'env:dev' });
  return subs;
})();

// ── 5권한 ROLES ──
const ROLES = [
  { id: 1, name: 'ROLE_SYS_ADMIN', label: '시스템 관리자', scope: 'GLOBAL' },
  { id: 2, name: 'ROLE_SYS_OPS', label: '시스템 운영자', scope: 'GLOBAL' },
  { id: 3, name: 'ROLE_TENANT_ADMIN', label: '테넌트 관리자', scope: 'TENANT' },
  { id: 4, name: 'ROLE_TENANT_APPROVER', label: '테넌트 승인자', scope: 'TENANT' },
  { id: 5, name: 'ROLE_TENANT_USER', label: '테넌트 사용자', scope: 'TENANT' },
];

// ── 역할 라벨 매핑 (5권한 + v1 호환) ──
const ROLE_LABELS = {
  ROLE_SYS_ADMIN: '시스템 관리자',
  ROLE_SYS_OPS: '시스템 운영자',
  ROLE_TENANT_ADMIN: '테넌트 관리자',
  ROLE_TENANT_APPROVER: '테넌트 승인자',
  ROLE_TENANT_USER: '테넌트 사용자',
  // v1 호환 (구 코드가 참조할 수 있음)
  ROLE_ADMIN: '시스템 관리자',
  ROLE_APPROVER: '승인자',
  ROLE_USER: '사용자',
  ROLE_OPS: '운영자',
  ROLE_VIEWER: '조회자',
};
// 테넌트 내부 화면용 — "테넌트" 접두사 제거 (사용자에게 자기가 테넌트인 건 자명)
const ROLE_LABELS_SHORT = {
  ...ROLE_LABELS,
  ROLE_TENANT_ADMIN: '관리자',
  ROLE_TENANT_APPROVER: '승인자',
  ROLE_TENANT_USER: '사용자',
};

// ── 사용자 (28명: 시스템 4 + 테넌트 24) — §3 정본 ──
const USERS = [
  // 시스템 사용자 4명 (tenantId = null)
  { id: 1, username: 'sys-admin', name: '시스템관리자', phone: '010-1000-0001', email: 'sysadmin@shinhands.com', department: '시스템운영팀', roles: ['ROLE_SYS_ADMIN'], tenantId: null, isActive: true, createdAt: '2025-12-01T09:00:00', pwResetRequested: false },
  { id: 2, username: 'sys-admin2', name: '박동근', phone: '010-1000-0002', email: 'parkdg@shinhands.com', department: '시스템운영팀', roles: ['ROLE_SYS_ADMIN'], tenantId: null, isActive: true, createdAt: '2025-12-01T09:00:00', pwResetRequested: false },
  { id: 3, username: 'sys-ops1', name: '김영수', phone: '010-1000-0003', email: 'kimys@shinhands.com', department: 'CUR운영팀', roles: ['ROLE_SYS_OPS'], tenantId: null, isActive: true, createdAt: '2025-12-10T09:00:00', pwResetRequested: false },
  { id: 4, username: 'sys-ops2', name: '이지현', phone: '010-1000-0004', email: 'leejh@shinhands.com', department: 'CUR운영팀', roles: ['ROLE_SYS_OPS'], tenantId: null, isActive: true, createdAt: '2025-12-10T09:00:00', pwResetRequested: false },
  // shinhan-card (AD000001K3) 8명
  { id: 5, username: 'sh-admin', name: '박서연', phone: '010-2001-0001', email: 'parksy@shcard.co.kr', department: 'IT전략팀', title: '부장', roles: ['ROLE_TENANT_ADMIN'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-05T09:00:00', pwResetRequested: false },
  { id: 6, username: 'sh-approver', name: '김민호', phone: '010-2001-0002', email: 'kimmh@shcard.co.kr', department: '재무팀', title: '차장', roles: ['ROLE_TENANT_APPROVER'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-08T09:00:00', pwResetRequested: false },
  { id: 7, username: 'sh-user1', name: '정수현', phone: '010-2001-0003', email: 'jungsh@shcard.co.kr', department: '인프라팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-10T09:00:00', pwResetRequested: false },
  { id: 8, username: 'sh-user2', name: '강도윤', phone: '010-2001-0004', email: 'kangdy@shcard.co.kr', department: '개발1팀', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-10T09:00:00', pwResetRequested: false },
  { id: 9, username: 'sh-user3', name: '윤채원', phone: '010-2001-0005', email: 'yooncw@shcard.co.kr', department: '개발2팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-12T09:00:00', pwResetRequested: false },
  { id: 10, username: 'sh-user4', name: '황지우', phone: '010-2001-0006', email: 'hwangjw@shcard.co.kr', department: '데이터팀', title: '사원', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000001K3', isActive: false, createdAt: '2026-01-15T09:00:00', pwResetRequested: false },
  { id: 11, username: 'sh-user5', name: '손하늘', phone: '010-2001-0007', email: 'sonhn@shcard.co.kr', department: '경영기획실', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-18T09:00:00', pwResetRequested: false },
  { id: 12, username: 'sh-user6', name: '조은지', phone: '010-2001-0008', email: 'choej@shcard.co.kr', department: '보안팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000001K3', isActive: true, createdAt: '2026-01-20T09:00:00', pwResetRequested: true },
  // shinhan-life (AD000002L9) 8명
  { id: 13, username: 'sl-admin', name: '최민준', phone: '010-3001-0001', email: 'choimj@shinhanlife.co.kr', department: 'IT운영팀', title: '부장', roles: ['ROLE_TENANT_ADMIN'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-06T09:00:00', pwResetRequested: false },
  { id: 14, username: 'sl-approver', name: '한지호', phone: '010-3001-0002', email: 'hanjh@shinhanlife.co.kr', department: '경영관리팀', title: '차장', roles: ['ROLE_TENANT_APPROVER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-08T09:00:00', pwResetRequested: false },
  { id: 15, username: 'sl-user1', name: '이수연', phone: '010-3001-0003', email: 'leesy@shinhanlife.co.kr', department: '인프라팀', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-10T09:00:00', pwResetRequested: false },
  { id: 16, username: 'sl-user2', name: '장유진', phone: '010-3001-0004', email: 'jangyj@shinhanlife.co.kr', department: '개발팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-10T09:00:00', pwResetRequested: false },
  { id: 17, username: 'sl-user3', name: '박지성', phone: '010-3001-0005', email: 'parkjs@shinhanlife.co.kr', department: '운영팀', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-12T09:00:00', pwResetRequested: false },
  { id: 18, username: 'sl-user4', name: '송다은', phone: '010-3001-0006', email: 'songde@shinhanlife.co.kr', department: '재무팀', title: '사원', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-15T09:00:00', pwResetRequested: false },
  { id: 19, username: 'sl-user5', name: '김나래', phone: '010-3001-0007', email: 'kimnr@shinhanlife.co.kr', department: '보안팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-18T09:00:00', pwResetRequested: false },
  { id: 20, username: 'sl-user6', name: '이한결', phone: '010-3001-0008', email: 'leehk@shinhanlife.co.kr', department: '데이터팀', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000002L9', isActive: true, createdAt: '2026-01-20T09:00:00', pwResetRequested: false },
  // shinhan-internal (AD000003M2) 8명
  { id: 21, username: 'ds-admin', name: '김도훈', phone: '010-4001-0001', email: 'kimdh@shinhan-internal.co.kr', department: 'Cloud운영팀', title: '팀장', roles: ['ROLE_TENANT_ADMIN'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-06T09:00:00', pwResetRequested: false },
  { id: 22, username: 'ds-admin2', name: '이서연', phone: '010-4001-0002', email: 'leesy2@shinhan-internal.co.kr', department: 'Cloud운영팀', title: '과장', roles: ['ROLE_TENANT_ADMIN'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-08T09:00:00', pwResetRequested: false },
  { id: 23, username: 'ds-approver', name: '오승현', phone: '010-4001-0003', email: 'ohsh@shinhan-internal.co.kr', department: '경영기획팀', title: '차장', roles: ['ROLE_TENANT_APPROVER'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-10T09:00:00', pwResetRequested: false },
  { id: 24, username: 'ds-user1', name: '배성민', phone: '010-4001-0004', email: 'baesm@shinhan-internal.co.kr', department: 'Dev팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-12T09:00:00', pwResetRequested: false },
  { id: 25, username: 'ds-user2', name: '신유리', phone: '010-4001-0005', email: 'shinyr@shinhan-internal.co.kr', department: 'Dev팀', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-12T09:00:00', pwResetRequested: false },
  { id: 26, username: 'ds-user3', name: '류호진', phone: '010-4001-0006', email: 'ryuhj@shinhan-internal.co.kr', department: 'Data팀', title: '대리', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-15T09:00:00', pwResetRequested: false },
  { id: 27, username: 'ds-user4', name: '문아영', phone: '010-4001-0007', email: 'moonay@shinhan-internal.co.kr', department: 'Data팀', title: '사원', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-18T09:00:00', pwResetRequested: false },
  { id: 28, username: 'ds-user5', name: '임주원', phone: '010-4001-0008', email: 'limjw@shinhan-internal.co.kr', department: 'Sec팀', title: '과장', roles: ['ROLE_TENANT_USER'], tenantId: 'AD000003M2', isActive: true, createdAt: '2026-01-20T09:00:00', pwResetRequested: false },
];

// ── TENANT_USER_SCOPE — TENANT_USER가 가진 SubAccount 권한 (마스킹 시나리오용) ──
// 규칙: ADMIN/APPROVER는 전체 SubAccount, USER는 부서/직무에 따라 일부만
const TENANT_USER_SCOPES = (() => {
  const scopes = [];
  let id = 1;
  USERS.forEach(u => {
    if (!u.tenantId) return; // 시스템 사용자 제외
    const tenantSubs = CLOUD_SUB_ACCOUNTS.filter(s => s.tenantId === u.tenantId);
    const role = u.roles[0];
    if (role === 'ROLE_TENANT_ADMIN' || role === 'ROLE_TENANT_APPROVER') {
      // 전체 SubAccount 권한
      tenantSubs.forEach(s => {
        scopes.push({ id: id++, userId: u.id, tenantId: u.tenantId, subAccountId: s.id, scopeType: 'FULL' });
      });
    } else if (role === 'ROLE_TENANT_USER') {
      // 사용자 ID 기반 결정적 일부 SubAccount 부여 (마스킹 시연 위해 약 50%)
      const half = Math.max(1, Math.floor(tenantSubs.length / 2));
      const start = (u.id % tenantSubs.length);
      for (let i = 0; i < half; i++) {
        const sub = tenantSubs[(start + i) % tenantSubs.length];
        if (sub) scopes.push({ id: id++, userId: u.id, tenantId: u.tenantId, subAccountId: sub.id, scopeType: 'PARTIAL' });
      }
    }
  });
  return scopes;
})();

// ── 현재 로그인 사용자 (프로토타입용 — 빈 객체로 초기화 후 로그인 시 채움) ──
const CURRENT_USER = { id: null, username: '', name: '', roles: [], tenantId: null, department: '', phone: '', email: '' };

// ── 현재 컨텍스트 (라우팅으로 결정되는 테넌트/계약 컨텍스트) ──
// variant: 'system' | 'tenant-admin' | 'tenant-user'
// contractId: number | 'all' (전체 가상 컨텍스트)
const CURRENT_CONTEXT = { variant: 'system', tenantId: null, tenantSlug: null, contractId: null };

// ── 사용자 → tenant/scope 헬퍼 ──
function getUserTenant(user) {
  if (!user || !user.tenantId) return null;
  return TENANTS.find(t => t.id === user.tenantId);
}

function getUserScopeSubAccounts(userId) {
  return TENANT_USER_SCOPES.filter(s => s.userId === userId).map(s => s.subAccountId);
}

function getContractsByTenant(tenantId) {
  return CONTRACTS.filter(c => c.tenantId === tenantId);
}

function getSubAccountsByContract(contractId) {
  return CLOUD_SUB_ACCOUNTS.filter(s => s.contractId === contractId);
}

// ── 리포트 템플릿 (R01~R06) ──
const REPORT_TEMPLATES = [
  { id: 1, code: 'R01', name: '비용 및 사용량 요약', description: '월별 전체 클라우드 비용과 사용량을 요약하여 제공합니다.', category: '비용분석', chartType: 'line', icon: '📊', isActive: true, sortOrder: 1, roles: ['ROLE_OPS', 'ROLE_VIEWER', 'ROLE_ADMIN'] },
  { id: 2, code: 'R02', name: '제품·리전 파레토 분석', description: '제품 및 리전별 비용 파레토 분석으로 상위 비용 요인을 파악합니다.', category: '비용분석', chartType: 'pareto', icon: '📈', isActive: true, sortOrder: 2, roles: ['ROLE_OPS', 'ROLE_ADMIN'] },
  { id: 3, code: 'R03', name: '서비스별 비용 분석', description: '서비스별 비용 분포와 파레토 분석을 제공합니다.', category: '비용분석', chartType: 'bar', icon: '📉', isActive: true, sortOrder: 3, roles: ['ROLE_OPS', 'ROLE_VIEWER', 'ROLE_ADMIN'] },
  { id: 4, code: 'R04', name: '태그 기반 비용 분석', description: '부서·환경별 태그를 기준으로 비용을 트리맵 형태로 시각화합니다.', category: '비용배분', chartType: 'treemap', icon: '🏷️', isActive: true, sortOrder: 4, roles: ['ROLE_OPS', 'ROLE_ADMIN'] },
  { id: 5, code: 'R05', name: '계정별 비용 및 예측', description: '계정별 실제 비용과 향후 예측치를 비교 분석합니다.', category: '예측', chartType: 'line', icon: '🔮', isActive: true, sortOrder: 5, roles: ['ROLE_OPS', 'ROLE_ADMIN'] },
  { id: 6, code: 'R06', name: '종합 Export', description: '전체 비용 데이터를 Excel/PDF로 일괄 내보내기합니다.', category: '내보내기', chartType: null, icon: '📥', isActive: true, sortOrder: 6, roles: ['ROLE_OPS', 'ROLE_ADMIN'] },
];

// ── 업로드 배치 (24개월) ──
const UPLOAD_BATCHES = (() => {
  const batches = [];
  const uploaders = [USERS[1], USERS[2]]; // kimops, leeops
  const statuses = [];
  // 24개월: 2024.04 ~ 2026.03
  for (let i = 0; i < 24; i++) {
    const year = 2024 + Math.floor((i + 3) / 12);
    const month = ((i + 3) % 12) + 1;
    const ym = `${year}${String(month).padStart(2, '0')}`;
    let status = 'COMPLETED';
    if (i === 22) status = 'PROCESSING';
    if (i === 23) status = 'PENDING';
    if (i === 10) status = 'ERROR';
    if (i === 17) status = 'ERROR';

    batches.push({
      id: i + 1,
      uploadedBy: uploaders[i < 16 ? 0 : 1],
      yearMonth: ym,
      yearMonthLabel: `${year}.${String(month).padStart(2, '0')}`,
      status,
      sheetCount: status === 'PENDING' ? 0 : Math.floor(Math.random() * 3) + 1,
      totalRows: status === 'COMPLETED' ? Math.floor(Math.random() * 300) + 200 : 0,
      errorMessage: status === 'ERROR' ? '컬럼 매핑 실패: account_id 컬럼 누락' : null,
      createdAt: `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(Math.random() * 5) + 5).padStart(2, '0')}T09:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}:00`,
    });
  }
  return batches;
})();

// ── 월별 비용 데이터 (대시보드용 집계) ──
const MONTHLY_COSTS = (() => {
  const data = [];
  let baseCost = 118000000; // 1.18억
  for (let i = 0; i < 24; i++) {
    const year = 2024 + Math.floor((i + 3) / 12);
    const month = ((i + 3) % 12) + 1;
    // 2~5% 성장 + 계절 변동
    const growth = 1 + (Math.random() * 0.03 + 0.02);
    const seasonal = month === 8 ? 1.15 : month === 12 ? 0.92 : 1.0; // 8월 급증, 12월 감소
    baseCost = Math.round(baseCost * growth * seasonal);
    data.push({
      yearMonth: `${year}.${String(month).padStart(2, '0')}`,
      cost: baseCost,
    });
  }
  return data;
})();

// ── 서비스별 비용 (대시보드 + 리포트용) ──
const SERVICE_COSTS = [
  { serviceName: 'Amazon EC2', cost: 53200000, ratio: 35.0 },
  { serviceName: 'Amazon RDS', cost: 30400000, ratio: 20.0 },
  { serviceName: 'Amazon S3', cost: 18240000, ratio: 12.0 },
  { serviceName: 'Amazon EKS', cost: 15200000, ratio: 10.0 },
  { serviceName: 'Amazon CloudFront', cost: 12160000, ratio: 8.0 },
  { serviceName: 'AWS Lambda', cost: 7600000, ratio: 5.0 },
  { serviceName: 'Amazon DynamoDB', cost: 4560000, ratio: 3.0 },
  { serviceName: 'Amazon ElastiCache', cost: 3040000, ratio: 2.0 },
  { serviceName: 'AWS WAF', cost: 2280000, ratio: 1.5 },
  { serviceName: '기타', cost: 5320000, ratio: 3.5 },
];

// ── 리전별 비용 ──
const REGION_COSTS = [
  { region: 'ap-northeast-2 (서울)', cost: 91200000, ratio: 60.0 },
  { region: 'ap-northeast-1 (도쿄)', cost: 22800000, ratio: 15.0 },
  { region: 'us-east-1 (버지니아)', cost: 15200000, ratio: 10.0 },
  { region: 'ap-southeast-1 (싱가포르)', cost: 11400000, ratio: 7.5 },
  { region: 'eu-west-1 (아일랜드)', cost: 7600000, ratio: 5.0 },
  { region: '기타', cost: 3800000, ratio: 2.5 },
];

// ── 태그별 비용 (트리맵용) ──
const TAG_COSTS = [
  { tagName: 'department', tagValue: '클라우드운영팀', cost: 45600000 },
  { tagName: 'department', tagValue: '개발1팀', cost: 30400000 },
  { tagName: 'department', tagValue: '개발2팀', cost: 22800000 },
  { tagName: 'department', tagValue: '데이터팀', cost: 19000000 },
  { tagName: 'department', tagValue: '인프라팀', cost: 15200000 },
  { tagName: 'department', tagValue: '재무팀', cost: 7600000 },
  { tagName: 'department', tagValue: '경영기획실', cost: 3800000 },
  { tagName: 'environment', tagValue: 'production', cost: 91200000 },
  { tagName: 'environment', tagValue: 'staging', cost: 30400000 },
  { tagName: 'environment', tagValue: 'development', cost: 22800000 },
];

// ── 계정별 비용 ──
const ACCOUNT_COSTS = [
  { accountId: '111111111111', accountName: 'SDS-Production', cost: 68400000, ratio: 45.0 },
  { accountId: '222222222222', accountName: 'SDS-Staging', cost: 22800000, ratio: 15.0 },
  { accountId: '333333333333', accountName: 'SDS-Development', cost: 19000000, ratio: 12.5 },
  { accountId: '444444444444', accountName: 'SDS-Data-Lake', cost: 15200000, ratio: 10.0 },
  { accountId: '555555555555', accountName: 'SDS-Security', cost: 11400000, ratio: 7.5 },
  { accountId: '666666666666', accountName: 'SDS-Network', cost: 7600000, ratio: 5.0 },
  { accountId: '777777777777', accountName: 'SDS-Sandbox', cost: 7600000, ratio: 5.0 },
];

// ── 리포트 파일 (생성된 리포트) ──
const REPORT_FILES = (() => {
  const files = [];
  let id = 1;
  const months = ['2025.10', '2025.11', '2025.12', '2026.01', '2026.02', '2026.03'];
  REPORT_TEMPLATES.forEach((tpl) => {
    months.forEach((m) => {
      const status = Math.random() > 0.05 ? 'COMPLETED' : 'ERROR';
      files.push({
        id: id++,
        templateId: tpl.id,
        templateCode: tpl.code,
        templateName: tpl.name,
        targetYearMonth: m,
        fileFormat: Math.random() > 0.3 ? 'XLSX' : 'PDF',
        fileSize: Math.floor(Math.random() * 500 + 100) * 1024,
        status,
        generatedBy: USERS[1].name,
        generatedAt: `${m.replace('.', '-')}-11T10:00:00`,
      });
    });
  });
  return files;
})();

// ── 구독자 (50명) ──
const SUBSCRIBERS = (() => {
  const depts = [
    { name: '경영기획실', count: 8 },
    { name: '재무팀', count: 10 },
    { name: '클라우드운영팀', count: 5 },
    { name: '인프라팀', count: 8 },
    { name: '개발1팀', count: 7 },
    { name: '개발2팀', count: 6 },
    { name: '데이터팀', count: 6 },
  ];
  const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전'];
  const firstNames = ['민준', '서연', '도윤', '서윤', '시우', '지우', '주원', '하은', '예준', '하린', '수호', '지아', '은우', '수아', '지호', '다은', '현우', '채원', '준서', '지윤'];
  const subs = [];
  let id = 1;
  depts.forEach((dept) => {
    for (let i = 0; i < dept.count; i++) {
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const name = ln + fn;
      const isActive = id <= 42;
      const accountScope = id <= 15 ? null : ACCOUNT_COSTS[Math.floor(Math.random() * ACCOUNT_COSTS.length)].accountName;
      subs.push({
        id: id++,
        name,
        email: `${ln.toLowerCase()}${fn.toLowerCase()}${id}@shinhan-ds.com`,
        department: dept.name,
        accountScope,
        accountScopeLabel: accountScope || '전사',
        isActive,
        managedBy: USERS[0].name,
      });
    }
  });
  return subs;
})();

// ── 구독 발송 로그 ──
const SUBSCRIPTION_LOGS = (() => {
  const logs = [];
  let id = 1;
  const months = [
    '2025.08', '2025.09', '2025.10', '2025.11', '2025.12',
    '2026.01', '2026.02', '2026.03',
  ];
  months.forEach((m) => {
    const count = Math.floor(Math.random() * 8) + 8;
    for (let i = 0; i < count; i++) {
      const sub = SUBSCRIBERS[Math.floor(Math.random() * 42)]; // 활성 구독자만
      let status = 'SENT';
      const r = Math.random();
      if (r > 0.92) status = 'FAILED';
      else if (r > 0.87) status = 'RETRYING';
      else if (r > 0.85) status = 'PENDING';
      logs.push({
        id: id++,
        subscriberName: sub.name,
        subscriberEmail: sub.email,
        department: sub.department,
        targetMonth: m,
        status,
        retryCount: status === 'RETRYING' ? Math.floor(Math.random() * 3) + 1 : status === 'FAILED' ? 3 : 0,
        errorMessage: status === 'FAILED' ? '이메일 전송 시간 초과 (SMTP timeout)' : status === 'RETRYING' ? '일시적 서버 오류, 재시도 예정' : null,
        scheduledAt: `${m.replace('.', '-')}-10T09:00:00`,
        sentAt: status === 'SENT' ? `${m.replace('.', '-')}-10T09:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}:00` : null,
      });
    }
  });
  return logs;
})();

// ── 컬럼 매핑 별칭 ──
const COLUMN_ALIASES = [
  { id: 1, sourceColumn: '계정ID', standardColumn: 'account_id', department: null, isActive: true },
  { id: 2, sourceColumn: '계정명', standardColumn: 'account_name', department: null, isActive: true },
  { id: 3, sourceColumn: '서비스명', standardColumn: 'service_name', department: null, isActive: true },
  { id: 4, sourceColumn: '리전', standardColumn: 'region', department: null, isActive: true },
  { id: 5, sourceColumn: '사용일자', standardColumn: 'usage_date', department: null, isActive: true },
  { id: 6, sourceColumn: '비용', standardColumn: 'cost_amount', department: null, isActive: true },
  { id: 7, sourceColumn: '통화', standardColumn: 'currency', department: null, isActive: true },
  { id: 8, sourceColumn: '계정번호', standardColumn: 'account_id', department: '재무팀', isActive: true },
  { id: 9, sourceColumn: '원가', standardColumn: 'cost_amount', department: '재무팀', isActive: true },
  { id: 10, sourceColumn: '사용량', standardColumn: 'usage_quantity', department: null, isActive: true },
  { id: 11, sourceColumn: '제품코드', standardColumn: 'product_code', department: null, isActive: true },
  { id: 12, sourceColumn: '부서태그', standardColumn: 'tag_department', department: null, isActive: true },
  { id: 13, sourceColumn: '환경태그', standardColumn: 'tag_environment', department: null, isActive: true },
  { id: 14, sourceColumn: '프로젝트태그', standardColumn: 'tag_project', department: null, isActive: true },
];

// ── 대시보드 KPI ──
const DASHBOARD_KPI = {
  totalCost: MONTHLY_COSTS[MONTHLY_COSTS.length - 1].cost,
  previousCost: MONTHLY_COSTS[MONTHLY_COSTS.length - 2].cost,
  get momChange() {
    return ((this.totalCost - this.previousCost) / this.previousCost * 100).toFixed(1);
  },
  reportCount: REPORT_FILES.filter(f => f.status === 'COMPLETED').length,
  subscriberCount: SUBSCRIBERS.filter(s => s.isActive).length,
  lastUploadStatus: UPLOAD_BATCHES[UPLOAD_BATCHES.length - 3].status, // 마지막 COMPLETED
};

// ── 포맷 헬퍼 ──
function formatKRW(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── 사용 가능 월 목록 (COST_DATA 존재하는 월) ──
const AVAILABLE_MONTHS = UPLOAD_BATCHES
  .filter(b => b.status === 'COMPLETED')
  .map(b => b.yearMonthLabel)
  .sort()
  .reverse();
// ── CUR 컬럼 사전 (AWS CUR2 기준 130건) ──
const CUR_COLUMNS = [
  { id: 1, columnCategory: 'bill', columnName: 'billBillType', columnKoName: '청구_청구유형', description: 'The type of bill that this report covers. Values include Anniversary, Purchase, and Refund.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 2, columnCategory: 'bill', columnName: 'billBillingEntity', columnKoName: '청구_청구엔터티', description: 'Helps identify whether invoices or transactions are for AWS Marketplace or other AWS services.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 3, columnCategory: 'bill', columnName: 'billBillingPeriodEndDate', columnKoName: '청구_청구기간종료일시', description: 'The end date of the billing period covered by this report, in UTC (`YYYY-MM-DDTHH:mm:ssZ`).', dataType: 'timestamp', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 4, columnCategory: 'bill', columnName: 'billBillingPeriodStartDate', columnKoName: '청구_청구기간시작일시', description: 'The start date of the billing period covered by this report, in UTC (`YYYY-MM-DDTHH:mm:ssZ`).', dataType: 'timestamp', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 5, columnCategory: 'bill', columnName: 'billInvoiceId', columnKoName: '청구_인보이스ID', description: 'The ID associated with a specific line item. Until the report is final, `InvoiceId` is blank.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 6, columnCategory: 'bill', columnName: 'billInvoicingEntity', columnKoName: '청구_인보이스발행엔터티', description: 'The AWS entity that issues the invoice.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 7, columnCategory: 'bill', columnName: 'billPayerAccountId', columnKoName: '청구_지불계정ID', description: 'The account ID of the paying account; for AWS Organizations, the management account ID.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 8, columnCategory: 'bill', columnName: 'billPayerAccountName', columnKoName: '청구_지불계정이름', description: 'The account name of the paying account; for AWS Organizations, the management account name.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 9, columnCategory: 'costCategory', columnName: 'costCategory', columnKoName: '비용카테고리_맵', description: 'A map column containing key-value pairs of cost categories and their values for a given line item. Keys can be queried individually with the dot operator.', dataType: 'map <string, string>', nullability: '', properties: 'Keys populated from cost category rules; dot-operator queryable.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 10, columnCategory: 'capacityReservation', columnName: 'capacityReservationCapacityReservationArn', columnKoName: '용량예약_용량예약용량예약ARN', description: 'The unique identifier (ARN) of the capacity reservation.', dataType: 'string', nullability: 'Nullable', properties: 'Added by: INCLUDE_CAPACITY_RESERVATION_DATA; not null when a charge is related to / or unused portion of / a capacity reservation; null otherwise.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 11, columnCategory: 'capacityReservation', columnName: 'capacityReservationCapacityReservationStatus', columnKoName: '용량예약_용량예약용량예약상태', description: 'Indicates whether the line item represents Reserved, Used, or Unused capacity reservation consumption.', dataType: 'string', nullability: 'Nullable', properties: 'Added by: INCLUDE_CAPACITY_RESERVATION_DATA; null when ARN is null; allowed values: Reserved, Used, Unused.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 12, columnCategory: 'capacityReservation', columnName: 'capacityReservationCapacityReservationType', columnKoName: '용량예약_용량예약용량예약유형', description: 'The type of capacity reservation purchased, currently ODCR or EC2 Capacity Blocks for ML.', dataType: 'string', nullability: 'Nullable', properties: 'Added by: INCLUDE_CAPACITY_RESERVATION_DATA; null when ARN is null; allowed values: ODCR, EC2 Capacity Blocks for ML.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 13, columnCategory: 'discount', columnName: 'discount', columnKoName: '할인_맵', description: 'A map column containing key-value pairs of discounts that apply to the line item. Keys can be queried individually with the dot operator.', dataType: 'map <string, double>', nullability: '', properties: 'Removed by: INCLUDE_MANUAL_DISCOUNT_COMPATIBILITY; values may be numeric/string depending on key.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 14, columnCategory: 'discount', columnName: 'discountBundledDiscount', columnKoName: '할인_할인번들할인', description: 'The bundled discount applied to the line item. A bundled discount provides free or discounted usage of a service or feature based on the usage of another service or feature.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 15, columnCategory: 'discount', columnName: 'discountTotalDiscount', columnKoName: '할인_할인총할인', description: 'The sum of all discount columns for the corresponding line item.', dataType: 'double', nullability: '', properties: 'Removed by: INCLUDE_MANUAL_DISCOUNT_COMPATIBILITY.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 16, columnCategory: 'identity', columnName: 'identityLineItemId', columnKoName: '식별_식별라인항목ID', description: 'Generated for each line item and unique within a given partition; not guaranteed to be unique across an entire delivery and not stable across different reports.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 17, columnCategory: 'identity', columnName: 'identityTimeInterval', columnKoName: '식별_식별시간구간', description: 'The time interval that the line item applies to, in UTC, formatted as `YYYY-MM-DDTHH:mm:ssZ/YYYY-MM-DDTHH:mm:ssZ`.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 18, columnCategory: 'lineItem', columnName: 'lineItemAvailabilityZone', columnKoName: '라인항목_라인항목가용가용영역', description: 'The Availability Zone that hosts this line item (for example, `us-east-1a`).', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 19, columnCategory: 'lineItem', columnName: 'lineItemBlendedCost', columnKoName: '라인항목_라인항목블렌디드비용', description: '`BlendedRate` multiplied by `UsageAmount`. Blank for discount line items.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 20, columnCategory: 'lineItem', columnName: 'lineItemBlendedRate', columnKoName: '라인항목_라인항목블렌디드요율', description: 'The average cost incurred for each SKU across an organization.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 21, columnCategory: 'lineItem', columnName: 'lineItemCurrencyCode', columnKoName: '라인항목_라인항목통화코드', description: 'The currency that this line item is shown in.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 22, columnCategory: 'lineItem', columnName: 'lineItemLegalEntity', columnKoName: '라인항목_라인항목법적엔터티', description: 'The seller of record of the product or service.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 23, columnCategory: 'lineItem', columnName: 'lineItemLineItemDescription', columnKoName: '라인항목_라인항목라인항목설명', description: 'The description of the line item type or usage incurred during the specific time period.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 24, columnCategory: 'lineItem', columnName: 'lineItemLineItemType', columnKoName: '라인항목_라인항목라인항목유형', description: 'The type of charge covered by the line item, such as Usage, DiscountedUsage, Fee, RIFee, Tax, Credit, SavingsPlanCoveredUsage, and others.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 25, columnCategory: 'lineItem', columnName: 'lineItemNetUnblendedCost', columnKoName: '라인항목_라인항목순비블렌디드비용', description: 'The actual after-discount cost paid for the line item; present only when the account has a discount in the billing period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 26, columnCategory: 'lineItem', columnName: 'lineItemNetUnblendedRate', columnKoName: '라인항목_라인항목순비블렌디드요율', description: 'The actual after-discount rate paid for the line item; present only when the account has a discount in the billing period.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 27, columnCategory: 'lineItem', columnName: 'lineItemNormalizationFactor', columnKoName: '라인항목_라인항목정규화계수', description: 'Normalization factor used for size-flexible RI calculations.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 28, columnCategory: 'lineItem', columnName: 'lineItemNormalizedUsageAmount', columnKoName: '라인항목_라인항목정규화사용량수량', description: 'Usage incurred in normalized units for size-flexible RIs (`UsageAmount * NormalizationFactor`).', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 29, columnCategory: 'lineItem', columnName: 'lineItemOperation', columnKoName: '라인항목_라인항목작업', description: 'The specific AWS operation covered by the line item, such as `RunInstances`.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 30, columnCategory: 'lineItem', columnName: 'lineItemProductCode', columnKoName: '라인항목_라인항목상품코드', description: 'The product code measured, such as AmazonEC2.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 31, columnCategory: 'lineItem', columnName: 'lineItemResourceId', columnKoName: '라인항목_라인항목리소스ID', description: 'If resource IDs are included, contains the provisioned resource ID; blank for usage not associated with an instantiated host and for discounts/credits/taxes.', dataType: 'string', nullability: '', properties: 'Added by: INCLUDE_RESOURCES.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 32, columnCategory: 'lineItem', columnName: 'lineItemTaxType', columnKoName: '라인항목_라인항목세금유형', description: 'The type of tax applied to this line item.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 33, columnCategory: 'lineItem', columnName: 'lineItemUnblendedCost', columnKoName: '라인항목_라인항목비블렌디드비용', description: '`UnblendedRate` multiplied by `UsageAmount`.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 34, columnCategory: 'lineItem', columnName: 'lineItemUnblendedRate', columnKoName: '라인항목_라인항목비블렌디드요율', description: 'The rate associated with an individual account\'s service usage.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 35, columnCategory: 'lineItem', columnName: 'lineItemUsageAccountId', columnKoName: '라인항목_라인항목사용량계정ID', description: 'The account ID of the account that used this line item.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 36, columnCategory: 'lineItem', columnName: 'lineItemUsageAccountName', columnKoName: '라인항목_라인항목사용량계정이름', description: 'The name of the account that used this line item. For organizations, this can be the management account or a member account.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 37, columnCategory: 'lineItem', columnName: 'lineItemUsageAmount', columnKoName: '라인항목_라인항목사용량수량', description: 'The amount of usage incurred during the specified time period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 38, columnCategory: 'lineItem', columnName: 'lineItemUsageEndDate', columnKoName: '라인항목_라인항목사용량종료일시', description: 'The end date and time for the corresponding line item in UTC, exclusive.', dataType: 'timestamp', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 39, columnCategory: 'lineItem', columnName: 'lineItemUsageStartDate', columnKoName: '라인항목_라인항목사용량시작일시', description: 'The start date and time for the line item in UTC, inclusive.', dataType: 'timestamp', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 40, columnCategory: 'lineItem', columnName: 'lineItemUsageType', columnKoName: '라인항목_라인항목사용량유형', description: 'The usage details of the line item.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 41, columnCategory: 'lineItem', columnName: 'lineItemUserIdentifier', columnKoName: '라인항목_라인항목사용자식별자', description: 'The IAM Identity Center identifier of a workforce user for user-based subscription and on-demand charges.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 42, columnCategory: 'pricing', columnName: 'pricingCurrency', columnKoName: '가격_가격통화', description: 'The currency that the pricing data is shown in.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 43, columnCategory: 'pricing', columnName: 'pricingLeaseContractLength', columnKoName: '가격_가격리스계약기간', description: 'The length of time that the RI is reserved for.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 44, columnCategory: 'pricing', columnName: 'pricingOfferingClass', columnKoName: '가격_가격오퍼유형클래스', description: 'The offering class of the Reserved Instance.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 45, columnCategory: 'pricing', columnName: 'pricingPublicOnDemandCost', columnKoName: '가격_가격공개온온디맨드비용', description: 'Total cost for the line item based on public On-Demand rates.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 46, columnCategory: 'pricing', columnName: 'pricingPublicOnDemandRate', columnKoName: '가격_가격공개온온디맨드요율', description: 'Public On-Demand rate for the line item usage.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 47, columnCategory: 'pricing', columnName: 'pricingPurchaseOption', columnKoName: '가격_가격구매옵션', description: 'How you chose to pay for this line item, such as All Upfront, Partial Upfront, or No Upfront.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 48, columnCategory: 'pricing', columnName: 'pricingRateCode', columnKoName: '가격_가격요율코드', description: 'A unique code for a product/offer/pricing-tier combination.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 49, columnCategory: 'pricing', columnName: 'pricingRateId', columnKoName: '가격_가격요율ID', description: 'The ID of the rate for a line item.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 50, columnCategory: 'pricing', columnName: 'pricingTerm', columnKoName: '가격_가격약정', description: 'Whether the usage is Reserved or On-Demand.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 51, columnCategory: 'pricing', columnName: 'pricingUnit', columnKoName: '가격_가격단위', description: 'The pricing unit AWS used to calculate usage cost.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 52, columnCategory: 'product', columnName: 'product', columnKoName: '상품_맵', description: 'A map column containing key-value pairs of multiple product attributes and their values. Keys can be queried individually with the dot operator.', dataType: 'map <string, string>', nullability: '', properties: 'Legacy CUR product columns not in the static schema appear here; dot-operator queryable.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 53, columnCategory: 'product', columnName: 'productComment', columnKoName: '상품_상품주석', description: 'A comment regarding the product.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 54, columnCategory: 'product', columnName: 'productFeeCode', columnKoName: '상품_상품수수료코드', description: 'The code that refers to the fee.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 55, columnCategory: 'product', columnName: 'productFeeDescription', columnKoName: '상품_상품수수료설명', description: 'The description for the product fee.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 56, columnCategory: 'product', columnName: 'productFromLocation', columnKoName: '상품_상품출발위치', description: 'Describes the location where the usage originated from.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 57, columnCategory: 'product', columnName: 'productFromLocationType', columnKoName: '상품_상품출발위치유형', description: 'Describes the location type where the usage originated from.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 58, columnCategory: 'product', columnName: 'productFromRegionCode', columnKoName: '상품_상품출발리전코드', description: 'Describes the source Region code for the AWS service.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 59, columnCategory: 'product', columnName: 'productInstanceSKU', columnKoName: '상품_상품instanceSKU', description: 'The SKU of the product instance.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 60, columnCategory: 'product', columnName: 'productInstanceFamily', columnKoName: '상품_상품인스턴스패밀리', description: 'Describes the Amazon EC2 instance family.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 61, columnCategory: 'product', columnName: 'productInstanceType', columnKoName: '상품_상품인스턴스유형', description: 'Describes the instance type, size, and family.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 62, columnCategory: 'product', columnName: 'productLocation', columnKoName: '상품_상품위치', description: 'Describes the Region that the resource or service resides in.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 63, columnCategory: 'product', columnName: 'productLocationType', columnKoName: '상품_상품위치유형', description: 'Describes the endpoint or location type of the task/service.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 64, columnCategory: 'product', columnName: 'productOperation', columnKoName: '상품_상품작업', description: 'Describes the specific AWS operation that this line item covers.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 65, columnCategory: 'product', columnName: 'productPricingUnit', columnKoName: '상품_상품가격단위', description: 'The smallest billing unit for an AWS service.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 66, columnCategory: 'product', columnName: 'productProductFamily', columnKoName: '상품_상품상품패밀리', description: 'The category for the type of product.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 67, columnCategory: 'product', columnName: 'productRegionCode', columnKoName: '상품_상품리전코드', description: 'Specifies the AWS Region where the service is available.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 68, columnCategory: 'product', columnName: 'productServicecode', columnKoName: '상품_상품서비스코드', description: 'Identifies the specific AWS service as a unique short abbreviation.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 69, columnCategory: 'product', columnName: 'productSku', columnKoName: '상품_상품SKU', description: 'A unique code for a product.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 70, columnCategory: 'product', columnName: 'productToLocation', columnKoName: '상품_상품도착위치', description: 'Describes the location usage destination.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 71, columnCategory: 'product', columnName: 'productToLocationType', columnKoName: '상품_상품도착위치유형', description: 'Describes the destination location type of the service usage.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 72, columnCategory: 'product', columnName: 'productToRegionCode', columnKoName: '상품_상품도착리전코드', description: 'Describes the destination/source Region code for the AWS service usage path.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 73, columnCategory: 'product', columnName: 'productUsagetype', columnKoName: '상품_상품사용유형', description: 'Describes the usage details of the line item.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 74, columnCategory: 'reservation', columnName: 'reservationAmortizedUpfrontCostForUsage', columnKoName: '예약_예약amortized선결제비용FOR사용량', description: 'Initial upfront payment for All/Partial Upfront RIs amortized for usage time.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 75, columnCategory: 'reservation', columnName: 'reservationAmortizedUpfrontFeeForBillingPeriod', columnKoName: '예약_예약amortized선결제수수료FOR청구기간', description: 'How much of the upfront fee for this reservation is costing you for the billing period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 76, columnCategory: 'reservation', columnName: 'reservationAvailabilityZone', columnKoName: '예약_예약가용가용영역', description: 'The Availability Zone of the resource associated with this line item.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 77, columnCategory: 'reservation', columnName: 'reservationEffectiveCost', columnKoName: '예약_예약유효비용', description: 'Sum of the upfront and hourly rate of the RI, averaged into an effective hourly rate.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 78, columnCategory: 'reservation', columnName: 'reservationEndTime', columnKoName: '예약_예약종료시간', description: 'The end date of the associated RI lease term.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 79, columnCategory: 'reservation', columnName: 'reservationModificationStatus', columnKoName: '예약_예약변경상태', description: 'Shows whether the RI lease was modified or unaltered.', dataType: 'string', nullability: '', properties: 'Possible values include Original, System, Manual, ManualWithData.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 80, columnCategory: 'reservation', columnName: 'reservationNetAmortizedUpfrontCostForUsage', columnKoName: '예약_예약순amortized선결제비용FOR사용량', description: 'Initial upfront payment for All/Partial Upfront RIs amortized for usage time after discounts, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 81, columnCategory: 'reservation', columnName: 'reservationNetAmortizedUpfrontFeeForBillingPeriod', columnKoName: '예약_예약순amortized선결제수수료FOR청구기간', description: 'Cost of the reservation\'s upfront fee for the billing period after discounts, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 82, columnCategory: 'reservation', columnName: 'reservationNetEffectiveCost', columnKoName: '예약_예약순유효비용', description: 'Effective hourly rate including upfront fee and hourly rate after discounts, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 83, columnCategory: 'reservation', columnName: 'reservationNetRecurringFeeForUsage', columnKoName: '예약_예약순recurring수수료FOR사용량', description: 'After-discount cost of the recurring usage fee, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 84, columnCategory: 'reservation', columnName: 'reservationNetUnusedAmortizedUpfrontFeeForBillingPeriod', columnKoName: '예약_예약순미사용amortized선결제수수료FOR청구기간', description: 'Net unused amortized upfront fee for the billing period, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 85, columnCategory: 'reservation', columnName: 'reservationNetUnusedRecurringFee', columnKoName: '예약_예약순미사용recurring수수료', description: 'Recurring fees associated with unused reservation hours after discounts, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 86, columnCategory: 'reservation', columnName: 'reservationNetUpfrontValue', columnKoName: '예약_예약순선결제값', description: 'Upfront value of the RI with discounts applied, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 87, columnCategory: 'reservation', columnName: 'reservationNormalizedUnitsPerReservation', columnKoName: '예약_예약정규화단위수PER예약', description: 'The number of normalized units for each instance of a reservation subscription.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 88, columnCategory: 'reservation', columnName: 'reservationNumberOfReservations', columnKoName: '예약_예약수량OFreservations', description: 'The number of reservations covered by this subscription.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 89, columnCategory: 'reservation', columnName: 'reservationRecurringFeeForUsage', columnKoName: '예약_예약recurring수수료FOR사용량', description: 'Recurring fee amortized for usage time for Partial Upfront and No Upfront RIs.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 90, columnCategory: 'reservation', columnName: 'reservationReservationARN', columnKoName: '예약_예약예약ARN', description: 'The ARN (RI Lease ID) of the RI that this line item benefited from.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 91, columnCategory: 'reservation', columnName: 'reservationStartTime', columnKoName: '예약_예약시작시간', description: 'The start date of the term of the associated Reserved Instance.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 92, columnCategory: 'reservation', columnName: 'reservationSubscriptionId', columnKoName: '예약_예약구독ID', description: 'A unique identifier that maps a line item with the associated offer.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 93, columnCategory: 'reservation', columnName: 'reservationTotalReservedNormalizedUnits', columnKoName: '예약_예약총예약정규화단위수', description: 'Total number of reserved normalized units for all instances for a reservation subscription.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 94, columnCategory: 'reservation', columnName: 'reservationTotalReservedUnits', columnKoName: '예약_예약총예약단위수', description: '`TotalReservedUnits` for Fee and RIFee line items.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 95, columnCategory: 'reservation', columnName: 'reservationUnitsPerReservation', columnKoName: '예약_예약단위수PER예약', description: '`UnitsPerReservation` for Fee and RIFee line items.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 96, columnCategory: 'reservation', columnName: 'reservationUnusedAmortizedUpfrontFeeForBillingPeriod', columnKoName: '예약_예약미사용amortized선결제수수료FOR청구기간', description: 'Amortized portion of the initial upfront fee for unused reservation capacity for the billing period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 97, columnCategory: 'reservation', columnName: 'reservationUnusedNormalizedUnitQuantity', columnKoName: '예약_예약미사용정규화단위수량', description: 'Number of unused normalized units for a size-flexible Regional RI during the billing period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 98, columnCategory: 'reservation', columnName: 'reservationUnusedQuantity', columnKoName: '예약_예약미사용수량', description: 'Number of RI hours not used during the billing period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 99, columnCategory: 'reservation', columnName: 'reservationUnusedRecurringFee', columnKoName: '예약_예약미사용recurring수수료', description: 'Recurring fees associated with unused reservation hours for Partial Upfront and No Upfront RIs.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 100, columnCategory: 'reservation', columnName: 'reservationUpfrontValue', columnKoName: '예약_예약선결제값', description: 'The upfront price paid for the Reserved Instance.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 101, columnCategory: 'resourceTags', columnName: 'resourceTags', columnKoName: '리소스타그_맵', description: 'A map column containing key-value pairs of resource tags and their values for a given line item.', dataType: 'map <string, string>', nullability: '', properties: 'Only enabled cost allocation tag keys appear; dot-operator queryable.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 102, columnCategory: 'savingsPlan', columnName: 'savingsPlanAmortizedUpfrontCommitmentForBillingPeriod', columnKoName: '세이빙플랜_세이빙플랜amortized선결제약정금액FOR청구기간', description: 'Amount of upfront fee a Savings Plan subscription is costing for the billing period.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 103, columnCategory: 'savingsPlan', columnName: 'savingsPlanEndTime', columnKoName: '세이빙플랜_세이빙플랜종료시간', description: 'The expiration date for the Savings Plan agreement.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 104, columnCategory: 'savingsPlan', columnName: 'savingsPlanInstanceTypeFamily', columnKoName: '세이빙플랜_세이빙플랜인스턴스유형패밀리', description: 'The instance family associated with the specified usage.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 105, columnCategory: 'savingsPlan', columnName: 'savingsPlanNetAmortizedUpfrontCommitmentForBillingPeriod', columnKoName: '세이빙플랜_세이빙플랜순amortized선결제약정금액FOR청구기간', description: 'Cost of a Savings Plan upfront fee for the billing period after discounts, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 106, columnCategory: 'savingsPlan', columnName: 'savingsPlanNetRecurringCommitmentForBillingPeriod', columnKoName: '세이빙플랜_세이빙플랜순recurring약정금액FOR청구기간', description: 'Net unblended cost of the Savings Plan fee, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 107, columnCategory: 'savingsPlan', columnName: 'savingsPlanNetSavingsPlanEffectiveCost', columnKoName: '세이빙플랜_세이빙플랜순세이빙플랜유효비용', description: 'Effective cost for Savings Plans after discounts, if applicable.', dataType: 'double', nullability: '', properties: 'Only when the account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 108, columnCategory: 'savingsPlan', columnName: 'savingsPlanOfferingType', columnKoName: '세이빙플랜_세이빙플랜오퍼유형유형', description: 'Describes the type of Savings Plan purchased.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 109, columnCategory: 'savingsPlan', columnName: 'savingsPlanPaymentOption', columnKoName: '세이빙플랜_세이빙플랜결제옵션', description: 'Payment option for the Savings Plan.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 110, columnCategory: 'savingsPlan', columnName: 'savingsPlanPurchaseTerm', columnKoName: '세이빙플랜_세이빙플랜구매약정', description: 'Duration or term of the Savings Plan.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 111, columnCategory: 'savingsPlan', columnName: 'savingsPlanRecurringCommitmentForBillingPeriod', columnKoName: '세이빙플랜_세이빙플랜recurring약정금액FOR청구기간', description: 'Monthly recurring fee for the Savings Plan subscription.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 112, columnCategory: 'savingsPlan', columnName: 'savingsPlanRegion', columnKoName: '세이빙플랜_세이빙플랜리전', description: 'The AWS Region that hosts the AWS services.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 113, columnCategory: 'savingsPlan', columnName: 'savingsPlanSavingsPlanARN', columnKoName: '세이빙플랜_세이빙플랜세이빙플랜ARN', description: 'The unique Savings Plan identifier.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 114, columnCategory: 'savingsPlan', columnName: 'savingsPlanSavingsPlanEffectiveCost', columnKoName: '세이빙플랜_세이빙플랜세이빙플랜유효비용', description: 'Proportion of the monthly Savings Plan commitment allocated to each usage line.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 115, columnCategory: 'savingsPlan', columnName: 'savingsPlanSavingsPlanRate', columnKoName: '세이빙플랜_세이빙플랜세이빙플랜요율', description: 'The Savings Plan rate for the usage.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 116, columnCategory: 'savingsPlan', columnName: 'savingsPlanStartTime', columnKoName: '세이빙플랜_세이빙플랜시작시간', description: 'The start date of the Savings Plan agreement.', dataType: 'string', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 117, columnCategory: 'savingsPlan', columnName: 'savingsPlanTotalCommitmentToDate', columnKoName: '세이빙플랜_세이빙플랜총약정금액도착일시', description: 'Total amortized upfront commitment and recurring commitment to date, for that hour.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 118, columnCategory: 'savingsPlan', columnName: 'savingsPlanUsedCommitment', columnKoName: '세이빙플랜_세이빙플랜used약정금액', description: 'Total dollar amount of the Savings Plan commitment used.', dataType: 'double', nullability: '', properties: '', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 119, columnCategory: 'splitLineItem', columnName: 'splitLineItemActualUsage', columnKoName: '분할라인항목_분할라인항목실사용사용량', description: 'Usage for vCPU, memory, or accelerator resources incurred for the specified period for the ECS task or Kubernetes pod.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 120, columnCategory: 'splitLineItem', columnName: 'splitLineItemNetSplitCost', columnKoName: '분할라인항목_분할라인항목순분할비용', description: 'Effective cost for ECS tasks or Kubernetes pods after all discounts.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA; only when account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 121, columnCategory: 'splitLineItem', columnName: 'splitLineItemNetUnusedCost', columnKoName: '분할라인항목_분할라인항목순미사용비용', description: 'Effective unused cost for ECS tasks or Kubernetes pods after all discounts.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA; only when account has a discount in the billing period.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 122, columnCategory: 'splitLineItem', columnName: 'splitLineItemParentResourceId', columnKoName: '분할라인항목_분할라인항목부모리소스ID', description: 'Resource ID of the parent EC2 instance associated with the ECS task or EKS pod.', dataType: 'string', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 123, columnCategory: 'splitLineItem', columnName: 'splitLineItemPublicOnDemandSplitCost', columnKoName: '분할라인항목_분할라인항목공개온온디맨드분할비용', description: 'Cost allocated to the ECS task or Kubernetes pod based on public On-Demand rates.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 124, columnCategory: 'splitLineItem', columnName: 'splitLineItemPublicOnDemandUnusedCost', columnKoName: '분할라인항목_분할라인항목공개온온디맨드미사용비용', description: 'Unused cost allocated to the ECS task or Kubernetes pod based on public On-Demand rates.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 125, columnCategory: 'splitLineItem', columnName: 'splitLineItemReservedUsage', columnKoName: '분할라인항목_분할라인항목예약사용량', description: 'Configured usage for vCPU, memory, or accelerator resources for the ECS task or Kubernetes pod.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 126, columnCategory: 'splitLineItem', columnName: 'splitLineItemSplitCost', columnKoName: '분할라인항목_분할라인항목분할비용', description: 'Allocated cost for vCPU or memory to the ECS task or Kubernetes pod, including amortized reservation or Savings Plans charges where applicable.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 127, columnCategory: 'splitLineItem', columnName: 'splitLineItemSplitUsage', columnKoName: '분할라인항목_분할라인항목분할사용량', description: 'Allocated usage for vCPU or memory to the ECS task or Kubernetes pod; max of reserved or actual usage.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 128, columnCategory: 'splitLineItem', columnName: 'splitLineItemSplitUsageRatio', columnKoName: '분할라인항목_분할라인항목분할사용량비율', description: 'Ratio of allocated resources to overall resources available on the parent EC2 instance.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 129, columnCategory: 'splitLineItem', columnName: 'splitLineItemUnusedCost', columnKoName: '분할라인항목_분할라인항목미사용비용', description: 'Unused cost allocated to the ECS task or Kubernetes pod, including amortized reservation or Savings Plans charges where applicable.', dataType: 'double', nullability: '', properties: 'Added by: INCLUDE_SPLIT_COST_ALLOCATION_DATA.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
  { id: 130, columnCategory: 'tags', columnName: 'tags', columnKoName: '태그_통합맵', description: 'A map column containing key-value pairs of all user, account, cost category, and resource tags and their values for a given line item.', dataType: 'map <string, string>', nullability: '', properties: 'Dot-operator queryable; selecting this can replace separate resource_tags and cost_category columns.', createdAt: '2026-04-13T09:00:00', isDeleted: false },
];

// ── 감사 로그 ──
// 액션 유형 상수
const AUDIT_ACTIONS = {
  LOGIN: '로그인',
  LOGIN_FAIL: '로그인 실패',
  LOGOUT: '로그아웃',
  VIEW: '조회',
  EXPORT: '엑셀 다운로드',
  EXPORT_PDF: 'PDF 다운로드',
  CREATE: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  RESTORE: '복원',
  PASSWORD_CHANGE: '비밀번호 변경',
  PASSWORD_RESET_REQUEST: '비밀번호 초기화 요청',
  PASSWORD_RESET_APPROVE: '비밀번호 초기화 승인',
};

// 초기 감사 로그 더미 (최근 활동 예시 30건)
const AUDIT_LOGS = (() => {
  const logs = [];
  const now = new Date('2026-04-14T09:00:00');
  const samples = [
    { action: AUDIT_ACTIONS.LOGIN, target: '시스템', conditions: '' },
    { action: AUDIT_ACTIONS.VIEW, target: '대시보드', conditions: '' },
    { action: AUDIT_ACTIONS.VIEW, target: '리포트 라이브러리 조회', conditions: '유형: 비용분석, 기간: 2025.11, 검색어: 파레토' },
    { action: AUDIT_ACTIONS.EXPORT, target: '리포트 라이브러리 다운로드', conditions: '유형: 비용분석, 기간: 2025.11, 파일명: 최근_리포트.xlsx' },
    { action: AUDIT_ACTIONS.VIEW, target: '구독 관리 조회', conditions: '활성 구독자: 42명' },
    { action: AUDIT_ACTIONS.VIEW, target: '업로드 이력 조회', conditions: '전체 건수: 15' },
    { action: AUDIT_ACTIONS.EXPORT, target: '구독자 목록 다운로드', conditions: '파일명: 구독자_목록.xlsx, 건수: 50' },
    { action: AUDIT_ACTIONS.VIEW, target: 'CUR 컬럼 관리 조회', conditions: '카테고리: lineItem, 검색어: cost' },
    { action: AUDIT_ACTIONS.CREATE, target: 'CUR 컬럼', conditions: '컬럼명: customField01' },
    { action: AUDIT_ACTIONS.UPDATE, target: '사용자', conditions: 'ID: parkapprove, 역할: ROLE_APPROVER' },
    { action: AUDIT_ACTIONS.PASSWORD_RESET_APPROVE, target: '비밀번호 초기화 승인', conditions: '대상: yoonview' },
    { action: AUDIT_ACTIONS.LOGOUT, target: '시스템', conditions: '' },
  ];
  const actors = [USERS[0], USERS[1], USERS[2], USERS[3]];
  for (let i = 0; i < 30; i++) {
    const s = samples[i % samples.length];
    const actor = actors[i % actors.length];
    const t = new Date(now.getTime() - i * 37 * 60 * 1000);
    logs.push({
      id: i + 1,
      timestamp: t.toISOString(),
      username: actor.username,
      name: actor.name,
      role: actor.roles[0],
      action: s.action,
      target: s.target,
      conditions: s.conditions,
      ipAddress: `10.0.${(i * 7) % 255}.${(i * 13) % 255}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
  }
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
})();
