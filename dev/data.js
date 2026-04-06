/**
 * 더미 데이터 — dummy-data-spec.md 기반
 * 신한DS 형식, 한국어, KRW 통화
 */

// ── 역할 ──
const ROLES = [
  { id: 1, name: 'ROLE_OPS', description: 'Cloud Ops 담당자' },
  { id: 2, name: 'ROLE_VIEWER', description: '경영진·실무자' },
  { id: 3, name: 'ROLE_ADMIN', description: '시스템 관리자' },
];

// ── 사용자 (10명) ──
const USERS = [
  { id: 1, username: 'admin', name: '관리자', email: 'admin@shinhan-ds.com', department: '시스템운영팀', roles: ['ROLE_ADMIN'], isActive: true },
  { id: 2, username: 'kimops', name: '김운영', email: 'kimops@shinhan-ds.com', department: '클라우드운영팀', roles: ['ROLE_OPS'], isActive: true },
  { id: 3, username: 'leeops', name: '이관리', email: 'leeops@shinhan-ds.com', department: '클라우드운영팀', roles: ['ROLE_OPS'], isActive: true },
  { id: 4, username: 'parkview', name: '박경영', email: 'parkview@shinhan-ds.com', department: '경영기획실', roles: ['ROLE_VIEWER'], isActive: true },
  { id: 5, username: 'choiview', name: '최재무', email: 'choiview@shinhan-ds.com', department: '재무팀', roles: ['ROLE_VIEWER'], isActive: true },
  { id: 6, username: 'jungview', name: '정인프라', email: 'jungview@shinhan-ds.com', department: '인프라팀', roles: ['ROLE_VIEWER'], isActive: true },
  { id: 7, username: 'kangview', name: '강개발', email: 'kangview@shinhan-ds.com', department: '개발1팀', roles: ['ROLE_VIEWER'], isActive: true },
  { id: 8, username: 'yoonview', name: '윤데이터', email: 'yoonview@shinhan-ds.com', department: '데이터팀', roles: ['ROLE_VIEWER'], isActive: true },
  { id: 9, username: 'hwangview', name: '황보안', email: 'hwangview@shinhan-ds.com', department: '인프라팀', roles: ['ROLE_VIEWER'], isActive: false },
  { id: 10, username: 'sonadmin', name: '손관리', email: 'sonadmin@shinhan-ds.com', department: '시스템운영팀', roles: ['ROLE_ADMIN'], isActive: true },
];

// ── 현재 로그인 사용자 (프로토타입용) ──
const CURRENT_USER = USERS[1]; // kimops — ROLE_OPS

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
