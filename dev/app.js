/**
 * 클라우드 비용 리포팅 프로토타입 — 메인 애플리케이션
 * 해시 라우팅 + 5개 화면 + 모달
 */

// ── 인증 상태 ──
let isAuthenticated = localStorage.getItem('ccr_authenticated') === 'true';
const MAX_LOGIN_FAIL = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10분
let loginFailCount = 0;
let lockedUntil = null;
let lockTimer = null;

// ── ECharts 신한 팔레트 ──
// 차트 팔레트: 파란 계열 그라데이션 (design-tokens.md)
const shinhanPalette = ['#0046FF', '#0076FF', '#002D85', '#4D8AFF', '#99B8FF'];

// ── 그리드 인스턴스 저장소 (Excel 익스포트용) ──
const gridInstances = {};

// ── 모든 그리드 인스턴스 정리 ──
function destroyAllGrids() {
  Object.keys(gridInstances).forEach(key => {
    try { gridInstances[key].destroy(); } catch(e) {}
    delete gridInstances[key];
  });
}

// ── Excel 익스포트 (ExcelJS — 참조 사이트 동일 스타일) ──
// 헤더: bold, 배경 #E2E8F0, 가운데 정렬, thin 보더 4면
// 데이터: 수직 가운데, 상하 thin 보더
// 컬럼 너비: 내용 기반 자동
async function exportGridToExcel(gridKey, fileName) {
  const gridApi = gridInstances[gridKey];
  if (!gridApi) {
    showToast('error', '내보낼 데이터를 찾을 수 없습니다');
    return;
  }

  // 컬럼 정의 추출 (관리 컬럼 제외, 숨긴 컬럼 제외)
  const columnDefs = gridApi.getColumnDefs().filter(c => c.headerName !== '관리');
  const visibleCols = columnDefs.filter(c => {
    const col = gridApi.getColumn(c.field);
    return col && col.isVisible();
  });
  const headers = visibleCols.map(c => c.headerName);

  // 전체 데이터 추출 (페이징 무관)
  const allData = [];
  gridApi.forEachNode((node) => {
    const row = [];
    visibleCols.forEach(col => {
      let val = node.data[col.field];
      if (col.valueGetter) val = col.valueGetter({ data: node.data });
      if (col.valueFormatter) val = col.valueFormatter({ value: val, data: node.data });
      if (col.field === 'status' && typeof val === 'string') {
        const m = { COMPLETED: '완료', ERROR: '확인 필요', PROCESSING: '진행 중', PENDING: '대기', SENT: '발송 완료', FAILED: '확인 필요', RETRYING: '재시도 중' };
        val = m[val] || val;
      }
      if (col.field === 'isActive') val = val ? '활성' : '비활성';
      if (col.field === 'fileSize' && typeof val === 'number') val = formatFileSize(val);
      if (['createdAt','generatedAt','sentAt'].includes(col.field) && val && val !== '-') val = formatDateTime(val);
      if (col.field === 'uploadedBy' && val && typeof val === 'object') val = val.name;
      row.push(val != null ? val : '-');
    });
    allData.push(row);
  });

  // ExcelJS 워크북 생성
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  // 헤더 스타일 정의
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  const headerFont = { name: 'Calibri', size: 11, bold: true };
  const headerAlignment = { horizontal: 'center', vertical: 'middle' };
  const thinBorder = { style: 'thin' };
  const fullBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  const dataBorder = { top: thinBorder, bottom: thinBorder };
  const dataAlignment = { vertical: 'middle' };

  // 헤더 행 추가
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = headerAlignment;
    cell.border = fullBorder;
  });

  // 데이터 행 추가
  allData.forEach(rowData => {
    const row = ws.addRow(rowData);
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = dataAlignment;
      cell.border = dataBorder;
    });
  });

  // 컬럼 너비 자동 조절
  ws.columns.forEach((col, i) => {
    let maxLen = headers[i] ? headers[i].length : 5;
    allData.forEach(row => {
      const len = String(row[i] || '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen * 1.3 + 4, 50);
  });

  // Blob 생성 및 다운로드
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
  showToast('success', `${fileName}.xlsx를 다운로드했습니다`);
}

// ── 그리드 하단 커스텀 툴바 HTML 생성 (참조 사이트 동일 구조) ──
function renderGridToolbar(gridKey, fileName, totalCount, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return `
    <div class="grid-toolbar" id="toolbar-${gridKey}">
      <button class="btn-excel" onclick="exportGridToExcel('${gridKey}', '${fileName}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M8 13h2"></path><path d="M14 13h2"></path><path d="M8 17h2"></path><path d="M14 17h2"></path><path d="M10 8v10"></path><path d="M8 13v4"></path><path d="M14 13v4"></path></svg>
        Excel
      </button>
      <div class="grid-toolbar-right">
        <div class="page-size-area">
          <span>Page Size:</span>
          <select class="page-size-select" onchange="changeGridPageSize('${gridKey}', this.value)">
            <option value="10" ${pageSize===10?'selected':''}>10</option>
            <option value="20" ${pageSize===20?'selected':''}>20</option>
            <option value="50" ${pageSize===50?'selected':''}>50</option>
            <option value="100" ${pageSize===100?'selected':''}>100</option>
          </select>
        </div>
        <span class="page-info" id="page-info-${gridKey}">1 to ${Math.min(pageSize, totalCount)} of ${totalCount}</span>
        <div class="page-nav">
          <button class="page-btn" onclick="gridPageNav('${gridKey}','first')" title="First Page">|&lt;</button>
          <button class="page-btn" onclick="gridPageNav('${gridKey}','prev')" title="Previous Page">&lt;</button>
          <span class="page-current" id="page-current-${gridKey}">Page 1 of ${totalPages}</span>
          <button class="page-btn" onclick="gridPageNav('${gridKey}','next')" title="Next Page">&gt;</button>
          <button class="page-btn" onclick="gridPageNav('${gridKey}','last')" title="Last Page">&gt;|</button>
        </div>
      </div>
    </div>
  `;
}

// ── 그리드 페이지 네비게이션 ──
function gridPageNav(gridKey, action) {
  const api = gridInstances[gridKey];
  if (!api) return;
  switch (action) {
    case 'first': api.paginationGoToFirstPage(); break;
    case 'prev': api.paginationGoToPreviousPage(); break;
    case 'next': api.paginationGoToNextPage(); break;
    case 'last': api.paginationGoToLastPage(); break;
  }
  updateToolbarPagination(gridKey);
}

// ── 툴바 페이지 정보 업데이트 ──
function updateToolbarPagination(gridKey) {
  const api = gridInstances[gridKey];
  if (!api) return;
  const currentPage = api.paginationGetCurrentPage();
  const pageSize = api.paginationGetPageSize();
  const totalRows = api.paginationGetRowCount();
  const totalPages = api.paginationGetTotalPages();
  const from = currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, totalRows);

  const infoEl = document.getElementById(`page-info-${gridKey}`);
  const currentEl = document.getElementById(`page-current-${gridKey}`);
  if (infoEl) infoEl.textContent = `${from} to ${to} of ${totalRows}`;
  if (currentEl) currentEl.textContent = `Page ${currentPage + 1} of ${totalPages}`;
}

// ── AG Grid 생성 후 이벤트 바인딩 (페이지네이션 + 컬럼 상태 저장) ──
function bindGridPagination(gridKey) {
  const api = gridInstances[gridKey];
  if (!api) return;
  api.addEventListener('paginationChanged', () => updateToolbarPagination(gridKey));

  // 컬럼 이동/리사이즈 시 상태 저장
  const saveColState = () => {
    const colState = api.getColumnState();
    localStorage.setItem(`grid-col-${gridKey}`, JSON.stringify(colState));
  };
  api.addEventListener('columnMoved', saveColState);
  api.addEventListener('columnResized', (e) => { if (e.finished) saveColState(); });

  // 저장된 컬럼 상태 복원
  const saved = localStorage.getItem(`grid-col-${gridKey}`);
  if (saved) {
    try { api.applyColumnState({ state: JSON.parse(saved), applyOrder: true }); } catch(e) {}
  }

  // 컬럼 표시/숨김도 저장
  api.addEventListener('columnVisible', saveColState);

  // 헤더 우클릭 컬럼 선택 메뉴
  initColumnContextMenu(gridKey);
}

// ── 그리드 ID 매핑 ──
const gridIdMap = {
  recentReports: 'grid-recent-reports',
  uploadHistory: 'grid-upload-history',
  subscribers: 'grid-subscribers',
  subLogs: 'grid-sub-logs',
  curColumns: 'grid-cur-columns',
};

// ── 헤더 우클릭 컬럼 선택 메뉴 ──
function initColumnContextMenu(gridKey) {
  const api = gridInstances[gridKey];
  if (!api) return;

  const el = document.getElementById(gridIdMap[gridKey]);
  if (!el) return;

  const headerEl = el.querySelector('.ag-header');
  if (!headerEl) return;

  headerEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showColumnMenu(gridKey, e.clientX, e.clientY);
  });
}

function showColumnMenu(gridKey, x, y) {
  // 기존 메뉴 제거
  const existing = document.getElementById('col-context-menu');
  if (existing) existing.remove();

  const api = gridInstances[gridKey];
  if (!api) return;

  const allCols = api.getColumns();
  if (!allCols) return;

  const menu = document.createElement('div');
  menu.id = 'col-context-menu';
  menu.className = 'col-context-menu';

  // 제목
  const title = document.createElement('div');
  title.className = 'col-menu-title';
  title.textContent = '컬럼 표시';
  menu.appendChild(title);

  // 각 컬럼 체크박스
  allCols.forEach(col => {
    const colDef = col.getColDef();
    const colId = col.getColId();
    const label = colDef.headerName || colId;
    if (!label) return;

    const item = document.createElement('label');
    item.className = 'col-menu-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = col.isVisible();
    checkbox.addEventListener('change', () => {
      api.setColumnsVisible([colId], checkbox.checked);
      // 상태 저장
      const colState = api.getColumnState();
      localStorage.setItem(`grid-col-${gridKey}`, JSON.stringify(colState));
    });

    const text = document.createElement('span');
    text.textContent = label;

    item.appendChild(checkbox);
    item.appendChild(text);
    menu.appendChild(item);
  });

  // 전체 표시 버튼
  const resetBtn = document.createElement('button');
  resetBtn.className = 'col-menu-reset';
  resetBtn.textContent = '전체 표시';
  resetBtn.addEventListener('click', () => {
    const allColIds = allCols.map(c => c.getColId());
    api.setColumnsVisible(allColIds, true);
    localStorage.removeItem(`grid-col-${gridKey}`);
    menu.remove();
  });
  menu.appendChild(resetBtn);

  // 위치 조정
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';

  document.body.appendChild(menu);

  // 바깥 클릭 시 닫기
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('mousedown', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
}

// ── Page Size 저장/복원 ──
function getSavedPageSize(gridKey, defaultSize) {
  const saved = localStorage.getItem(`grid-pagesize-${gridKey}`);
  return saved ? Number(saved) : defaultSize;
}

// Page Size 변경 시 저장 추가
function changeGridPageSize(gridKey, newSize) {
  const api = gridInstances[gridKey];
  if (!api) return;
  api.paginationSetPageSize(Number(newSize));
  localStorage.setItem(`grid-pagesize-${gridKey}`, newSize);
  updateToolbarPagination(gridKey);
}

// ── 역할 전환 (프로토타입 전용) ──
const ROLE_SWITCH_OPTIONS = [
  { user: USERS[0], label: '시스템 관리자', desc: 'ADMIN' },
  { user: USERS[1], label: 'Cloud Ops 담당자', desc: 'OPS' },
  { user: USERS[3], label: '경영진·실무자', desc: 'VIEWER' },
];

function switchRole() {
  const existing = document.getElementById('role-switch-menu');
  if (existing) { existing.remove(); return; }

  const btn = document.querySelector('.btn-role-switch');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.id = 'role-switch-menu';
  menu.className = 'role-switch-menu';
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.right = (window.innerWidth - rect.right) + 'px';

  ROLE_SWITCH_OPTIONS.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'role-switch-item';
    const isCurrent = CURRENT_USER.username === opt.user.username;
    if (isCurrent) item.classList.add('active');

    item.innerHTML = `
      <strong>${opt.label}</strong>
      <span>(${opt.user.name})</span>
    `;
    item.addEventListener('click', () => {
      Object.keys(opt.user).forEach(k => { CURRENT_USER[k] = opt.user[k]; });
      menu.remove();
      destroyAllGrids();
      initAppShell();
      handleRoute();
      showToast('info', `${opt.user.name} 님 (${opt.desc})으로 전환했습니다`);
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  // 바깥 클릭 닫기
  setTimeout(() => {
    const close = (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', close);
      }
    };
    document.addEventListener('mousedown', close);
  }, 10);
}

// ── 드롭다운 메뉴 토글 ──
function toggleDropdown(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  closeDropdowns();
  if (!isOpen) {
    menu.classList.add('open');
    // 바깥 클릭 시 닫기
    setTimeout(() => {
      document.addEventListener('click', closeDropdownsHandler);
    }, 10);
  }
}

function closeDropdowns() {
  document.querySelectorAll('.gnb-dropdown.open').forEach(d => d.classList.remove('open'));
  document.removeEventListener('click', closeDropdownsHandler);
}

function closeDropdownsHandler(e) {
  if (!e.target.closest('.gnb-tab-group')) {
    closeDropdowns();
  }
}

// ── 토스트 ──
function showToast(type, message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── 라우터 ──
const routes = {
  '#/dashboard': renderDashboard,
  '#/upload': renderUpload,
  '#/reports': renderReports,
  '#/subscriptions': renderSubscriptions,
  '#/settings/cur-columns': renderCurColumns,
};

function navigate(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  const hash = window.location.hash || '#/dashboard';

  // 미인증 시 로그인 페이지로 이동
  if (!isAuthenticated) {
    if (hash !== '#/login') {
      window.location.hash = '#/login';
      return;
    }
    renderLoginPage();
    return;
  }

  // 인증 후 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (hash === '#/login') {
    window.location.hash = '#/dashboard';
    return;
  }

  // 앱 컨테이너가 없으면(로그인→앱 전환 시) 앱 초기화
  if (!document.getElementById('app-content')) {
    initAppShell();
  }

  const content = document.getElementById('app-content');
  const renderer = routes[hash] || renderDashboard;

  // 페이지 전환 시 기존 그리드 정리
  destroyAllGrids();

  // 탭 + 드롭다운 아이템 활성화
  document.querySelectorAll('.gnb-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.route === hash);
  });
  document.querySelectorAll('.gnb-dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === hash);
  });
  // 드롭다운 부모 탭도 활성화
  document.querySelectorAll('.gnb-tab-group').forEach(group => {
    const hasActive = group.querySelector('.gnb-dropdown-item.active');
    const btn = group.querySelector('.gnb-tab');
    if (btn) btn.classList.toggle('active', !!hasActive);
  });
  closeDropdowns();

  renderer(content);
}

// ── GNB 렌더링 ──
function renderGNB() {
  const user = CURRENT_USER;
  const initials = user.name.charAt(0);
  const roleLabels = { ROLE_OPS: 'Cloud Ops', ROLE_VIEWER: '조회 권한', ROLE_ADMIN: '관리자' };
  const roleLabel = roleLabels[user.roles[0]] || user.roles[0];

  return `
    <nav class="gnb">
      <div class="gnb-row1">
        <div class="gnb-logo" onclick="navigate('#/dashboard')">
          <div class="gnb-logo-text">
            <span class="gnb-logo-main">CLOUD COST REPORTING</span>
          </div>
        </div>
        <div class="gnb-divider"></div>
        <div class="gnb-search">
          <svg class="gnb-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          <input type="text" placeholder="메뉴, 계정 검색..." />
        </div>
        <div class="gnb-spacer"></div>
        <div class="gnb-actions">
          <button class="btn-role-switch" onclick="switchRole()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="m22 3.5-5 5"></path><path d="m17 3.5 5 5"></path></svg>
            역할 전환
          </button>
          <button class="gnb-icon-btn" title="알림">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
            <span class="gnb-badge"></span>
          </button>
          ${user.roles.includes('ROLE_ADMIN') ? `
          <div class="gnb-settings-wrap" id="gnb-settings-wrap">
            <button class="gnb-icon-btn" title="환경설정" onclick="toggleSettingsMenu(event)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <div class="settings-dropdown" id="settings-dropdown" style="display:none;">
              <button class="user-dropdown-item" onclick="navigate('#/settings/cur-columns');closeSettingsMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>
                CUR 컬럼 관리
              </button>
            </div>
          </div>
          ` : `
          <button class="gnb-icon-btn" title="설정">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          `}
          <div class="gnb-user" id="gnb-user-btn" onclick="toggleUserDropdown(event)">
            <div class="gnb-user-text">
              <span class="gnb-user-name">${user.name} 님</span>
              <span class="gnb-user-role">${roleLabel}</span>
            </div>
            <div class="gnb-avatar">${initials}</div>
            <div class="user-dropdown" id="user-dropdown" style="display:none;">
              <div class="user-dropdown-header">
                <div class="user-dropdown-name">${user.name}</div>
                <div class="user-dropdown-dept">${user.department}</div>
              </div>
              <button class="user-dropdown-item" onclick="event.stopPropagation();openPasswordModal();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                비밀번호 변경
              </button>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item" onclick="event.stopPropagation();handleLogout();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="gnb-row2">
        <div class="gnb-tabs">
          <!-- 대시보드 (단독) -->
          <a class="gnb-tab" data-route="#/dashboard" onclick="navigate('#/dashboard');return false;" href="#/dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
            대시보드
          </a>

          <!-- 데이터 관리 (드롭다운) -->
          <div class="gnb-tab-group">
            <button class="gnb-tab" data-route="#/upload" onclick="navigate('#/upload')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg>
              데이터 관리
              <svg class="gnb-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
            <div class="gnb-dropdown" id="menu-data">
              <div class="gnb-dropdown-inner">
                <a class="gnb-dropdown-item" data-route="#/upload" onclick="navigate('#/upload');return false;" href="#/upload">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg>
                  업로드
                </a>
              </div>
            </div>
          </div>

          <!-- 리포트 (드롭다운) -->
          <div class="gnb-tab-group">
            <button class="gnb-tab" data-route="#/reports" onclick="navigate('#/reports')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
              리포트
              <svg class="gnb-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
            <div class="gnb-dropdown" id="menu-report">
              <div class="gnb-dropdown-inner">
                <a class="gnb-dropdown-item" data-route="#/reports" onclick="navigate('#/reports');return false;" href="#/reports">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                  라이브러리
                </a>
              </div>
            </div>
          </div>

          <!-- 구독 관리 (단독) -->
          <a class="gnb-tab" data-route="#/subscriptions" onclick="navigate('#/subscriptions');return false;" href="#/subscriptions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
            구독 관리
          </a>

          ${user.roles.includes('ROLE_ADMIN') ? `
          <!-- 환경설정 (관리자 전용 드롭다운) -->
          <div class="gnb-tab-group">
            <button class="gnb-tab" data-route="#/settings/cur-columns" onclick="navigate('#/settings/cur-columns')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              환경설정
              <svg class="gnb-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
            <div class="gnb-dropdown" id="menu-settings">
              <div class="gnb-dropdown-inner">
                <a class="gnb-dropdown-item" data-route="#/settings/cur-columns" onclick="navigate('#/settings/cur-columns');return false;" href="#/settings/cur-columns">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>
                  CUR 컬럼 관리
                </a>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </nav>
  `;
}

// ══════════════════════════════════════════
// 1. 대시보드
// ══════════════════════════════════════════
function renderDashboard(el) {
  const kpi = DASHBOARD_KPI;
  const momDir = kpi.momChange > 0 ? 'up' : kpi.momChange < 0 ? 'down' : 'neutral';
  const momIcon = momDir === 'up' ? '▲' : momDir === 'down' ? '▼' : '—';
  const lastMonth = MONTHLY_COSTS[MONTHLY_COSTS.length - 1].yearMonth;

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">대시보드</h1>
      <p class="page-desc">${lastMonth} 기준 클라우드 비용 현황</p>
    </div>

    <!-- KPI 카드 -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon cost"></span>이번달 총 비용</div>
        <div class="kpi-value">${formatKRW(kpi.totalCost)}</div>
        <div class="kpi-change ${momDir}">${momIcon} 전월 대비 ${Math.abs(kpi.momChange)}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon change"></span>전월 대비 변동</div>
        <div class="kpi-value">${formatKRW(Math.abs(kpi.totalCost - kpi.previousCost))}</div>
        <div class="kpi-change ${momDir}">${momDir === 'up' ? '비용이 증가했어요' : '비용을 절감했어요'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon report"></span>생성된 리포트</div>
        <div class="kpi-value">${kpi.reportCount}건</div>
        <div class="kpi-change neutral">최근 6개월 기준</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon sub"></span>활성 구독자</div>
        <div class="kpi-value">${kpi.subscriberCount}명</div>
        <div class="kpi-change neutral">매월 10일 자동 발송</div>
      </div>
    </div>

    <!-- 차트 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-title">월별 비용 추이 (12개월)</div>
        <div class="chart-container" id="chart-cost-trend"></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title">서비스별 비용 TOP 5</div>
        <div class="chart-container" id="chart-service-top"></div>
      </div>
    </div>

    <!-- 최근 리포트 -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-card-title">최근 생성 리포트</span>
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/reports')">전체 보기</button>
      </div>
      <div class="grid-container">
        <div id="grid-recent-reports" class="ag-theme-alpine" style="height:260px;width:100%;"></div>
        ${renderGridToolbar('recentReports', '최근_리포트', 5, getSavedPageSize('recentReports', 10))}
      </div>
    </div>
  `;

  // ECharts — 비용 추이
  setTimeout(() => {
    initCostTrendChart();
    initServiceTopChart();
    initRecentReportsGrid();
  }, 50);
}

function initCostTrendChart() {
  const chartEl = document.getElementById('chart-cost-trend');
  if (!chartEl) return;
  const chart = echarts.init(chartEl);
  const recent12 = MONTHLY_COSTS.slice(-12);

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/>${p.seriesName}: <b>${formatKRW(p.value)}</b>`;
      },
    },
    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: recent12.map(d => d.yearMonth),
      axisLabel: { fontFamily: 'Pretendard', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontFamily: 'Pretendard',
        fontSize: 11,
        formatter: (v) => (v / 100000000).toFixed(1) + '억',
      },
    },
    series: [{
      name: '월별 비용',
      type: 'line',
      data: recent12.map(d => d.cost),
      smooth: true,
      lineStyle: { color: '#0046FF', width: 3 },
      itemStyle: { color: '#0046FF' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0,70,255,0.15)' },
          { offset: 1, color: 'rgba(0,70,255,0.01)' },
        ]),
      },
    }],
  });

  window.addEventListener('resize', () => chart.resize());
}

function initServiceTopChart() {
  const chartEl = document.getElementById('chart-service-top');
  if (!chartEl) return;
  const chart = echarts.init(chartEl);
  const top5 = SERVICE_COSTS.slice(0, 5);

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/>비용: <b>${formatKRW(p.value)}</b><br/>비중: ${top5.find(s => s.serviceName === p.name)?.ratio}%`;
      },
    },
    grid: { left: 140, right: 40, top: 20, bottom: 40 },
    xAxis: {
      type: 'value',
      axisLabel: {
        fontFamily: 'Pretendard',
        fontSize: 11,
        formatter: (v) => (v / 1000000).toFixed(0) + 'M',
      },
    },
    yAxis: {
      type: 'category',
      data: top5.map(d => d.serviceName).reverse(),
      axisLabel: { fontFamily: 'Pretendard', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: top5.map(d => d.cost).reverse(),
      barWidth: 24,
      itemStyle: {
        color: (params) => shinhanPalette[4 - params.dataIndex],
        borderRadius: [0, 4, 4, 0],
      },
      label: {
        show: true,
        position: 'right',
        fontFamily: 'Pretendard',
        fontSize: 11,
        formatter: (p) => formatKRW(p.value),
      },
    }],
  });

  window.addEventListener('resize', () => chart.resize());
}

function initRecentReportsGrid() {
  const gridEl = document.getElementById('grid-recent-reports');
  if (!gridEl) return;

  const recentFiles = REPORT_FILES
    .filter(f => f.status === 'COMPLETED')
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, 5);

  const gridOptions = {
    columnDefs: [
      { headerName: '리포트명', field: 'templateName', flex: 2 },
      { headerName: '대상 월', field: 'targetYearMonth', flex: 1 },
      { headerName: '형식', field: 'fileFormat', flex: 0.5 },
      { headerName: '크기', field: 'fileSize', flex: 0.7, valueFormatter: (p) => formatFileSize(p.value) },
      { headerName: '생성일', field: 'generatedAt', flex: 1, valueFormatter: (p) => formatDateTime(p.value) },
      {
        headerName: '상태', field: 'status', flex: 0.7,
        cellRenderer: (p) => `<span class="status-badge success">완료</span>`,
      },
    ],
    rowData: recentFiles,
    domLayout: 'normal',
    headerHeight: 48,
    rowHeight: 48,
    suppressCellFocus: true,
    pagination: true,
    paginationPageSize: getSavedPageSize('recentReports', 10),
    defaultColDef: { sortable: true, resizable: true },
  };

  gridInstances.recentReports = agGrid.createGrid(gridEl, gridOptions);
  bindGridPagination('recentReports');
}

// ══════════════════════════════════════════
// 2. 데이터 업로드
// ══════════════════════════════════════════
let uploadState = { step: 'dropzone' }; // dropzone | progress | mapping | result

function renderUpload(el) {
  uploadState = { step: 'dropzone' };

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">데이터 업로드</h1>
      <p class="page-desc">클라우드 비용 엑셀 파일을 업로드하여 데이터를 등록해 보세요</p>
    </div>

    <div id="upload-area"></div>

    <!-- 업로드 이력 -->
    <div class="section-card" style="margin-top:24px;">
      <div class="section-card-header">
        <span class="section-card-title">업로드 이력</span>
      </div>
      <div class="grid-container">
        <div id="grid-upload-history" class="ag-theme-alpine" style="height:400px;width:100%;"></div>
        ${renderGridToolbar('uploadHistory', '업로드_이력', UPLOAD_BATCHES.length, getSavedPageSize('uploadHistory', 10))}
      </div>
    </div>
  `;

  renderUploadStep();
  initUploadHistoryGrid();
}

function renderUploadStep() {
  const area = document.getElementById('upload-area');
  if (!area) return;

  if (uploadState.step === 'dropzone') {
    area.innerHTML = `
      <div class="upload-dropzone" id="dropzone"
           ondragover="event.preventDefault();this.classList.add('dragover')"
           ondragleave="this.classList.remove('dragover')"
           ondrop="handleFileDrop(event)"
           onclick="document.getElementById('file-input').click()">
        <div class="upload-dropzone-icon">📁</div>
        <div class="upload-dropzone-text">엑셀 파일을 드래그하거나 클릭해 주세요</div>
        <div class="upload-dropzone-hint">.xlsx, .xls 파일을 지원합니다 · 최대 100MB</div>
        <input type="file" id="file-input" accept=".xlsx,.xls" style="display:none" onchange="handleFileSelect(this.files)" />
      </div>
    `;
  } else if (uploadState.step === 'progress') {
    area.innerHTML = `
      <div class="section-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span>📄</span>
          <strong>${uploadState.fileName}</strong>
          <span class="status-badge info">업로드 중</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" id="upload-progress" style="width:0%"></div>
        </div>
        <div style="font-size:12px;color:var(--sh-dark-secondary);margin-top:4px;" id="upload-status-text">파일을 업로드하고 있습니다</div>
      </div>
    `;
    simulateUpload();
  } else if (uploadState.step === 'mapping') {
    area.innerHTML = `
      <div class="section-card">
        <div class="section-card-header">
          <span class="section-card-title">컬럼 매핑 결과</span>
          <span class="status-badge success">자동 매핑을 마쳤습니다</span>
        </div>
        <p style="font-size:13px;color:var(--sh-gray-text);margin-bottom:16px;">
          시트: <strong>2026년 3월 비용</strong> · 행: <strong>347건</strong> · 대상 월: <strong>2026.03</strong>
        </p>
        <table class="mapping-table">
          <thead>
            <tr>
              <th>원본 컬럼</th>
              <th>표준 컬럼</th>
              <th>신뢰도</th>
              <th>자동 매핑</th>
            </tr>
          </thead>
          <tbody>
            ${generateMappingRows()}
          </tbody>
        </table>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn btn-primary" onclick="uploadState.step='result';renderUploadStep();">확인</button>
          <button class="btn btn-secondary" onclick="uploadState.step='dropzone';renderUploadStep();">취소</button>
        </div>
      </div>
    `;
  } else if (uploadState.step === 'result') {
    area.innerHTML = `
      <div class="section-card">
        <div class="section-card-header">
          <span class="section-card-title">검증 결과</span>
          <span class="status-badge success">검증을 마쳤습니다</span>
        </div>
        <div class="validation-item info">
          <span>ℹ️</span>
          <div><strong>총 347건</strong> 데이터를 정상 확인했습니다.</div>
        </div>
        <div class="validation-item warning">
          <span>⚠️</span>
          <div><strong>3건</strong> tag_project 값이 비어있습니다. 선택 필드이므로 건너뛸 수 있습니다.</div>
        </div>
        <div class="validation-item error">
          <span>❌</span>
          <div><strong>1건</strong> 42행 cost_amount 값 "N/A"를 숫자로 변환할 수 없습니다. 수정해 주세요.</div>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn btn-primary" onclick="confirmUpload()">확정</button>
          <button class="btn btn-secondary" onclick="uploadState.step='dropzone';renderUploadStep();">취소</button>
        </div>
      </div>
    `;
  }
}

function generateMappingRows() {
  const mappings = [
    { source: '계정ID', standard: 'account_id', confidence: 95, auto: true },
    { source: '계정명', standard: 'account_name', confidence: 92, auto: true },
    { source: '서비스명', standard: 'service_name', confidence: 98, auto: true },
    { source: '리전', standard: 'region', confidence: 90, auto: true },
    { source: '사용일자', standard: 'usage_date', confidence: 88, auto: true },
    { source: '비용(원)', standard: 'cost_amount', confidence: 85, auto: true },
    { source: '통화', standard: 'currency', confidence: 97, auto: true },
    { source: '부서태그', standard: 'tag_department', confidence: 78, auto: true },
    { source: '환경태그', standard: 'tag_environment', confidence: 75, auto: true },
    { source: '프로젝트명', standard: 'tag_project', confidence: 60, auto: false },
  ];

  return mappings.map(m => {
    const confClass = m.confidence >= 85 ? 'high' : m.confidence >= 70 ? 'mid' : 'low';
    return `
      <tr>
        <td>${m.source}</td>
        <td><code style="background:var(--sh-gray-background);padding:2px 6px;border-radius:4px;font-size:12px;">${m.standard}</code></td>
        <td>
          <div class="mapping-confidence">
            <div class="confidence-bar"><div class="confidence-fill confidence-${confClass}" style="width:${m.confidence}%"></div></div>
            <span style="font-size:12px;color:var(--sh-gray-text);">${m.confidence}%</span>
          </div>
        </td>
        <td>${m.auto ? '<span class="status-badge success">자동</span>' : '<span class="status-badge warning">수동</span>'}</td>
      </tr>
    `;
  }).join('');
}

function handleFileDrop(e) {
  e.preventDefault();
  e.target.closest('.upload-dropzone')?.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) handleFileSelect(files);
}

function handleFileSelect(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  if (!file.name.match(/\.xlsx?$/i)) {
    showToast('error', '.xlsx 또는 .xls 파일만 업로드할 수 있습니다');
    return;
  }
  uploadState = { step: 'progress', fileName: file.name };
  renderUploadStep();
}

function simulateUpload() {
  let progress = 0;
  const bar = document.getElementById('upload-progress');
  const text = document.getElementById('upload-status-text');
  const steps = [
    { at: 30, msg: '파일을 분석하고 있습니다' },
    { at: 60, msg: '컬럼을 자동 매핑하고 있습니다' },
    { at: 90, msg: '데이터를 검증하고 있습니다' },
  ];

  const interval = setInterval(() => {
    progress += Math.random() * 8 + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => {
        uploadState.step = 'mapping';
        renderUploadStep();
      }, 500);
    }
    if (bar) bar.style.width = progress + '%';
    const step = steps.filter(s => progress >= s.at).pop();
    if (text && step) text.textContent = step.msg;
  }, 150);
}

function confirmUpload() {
  showToast('success', '데이터를 업로드했습니다');
  uploadState = { step: 'dropzone' };
  renderUploadStep();
}

function initUploadHistoryGrid() {
  const gridEl = document.getElementById('grid-upload-history');
  if (!gridEl) return;

  const statusMap = {
    COMPLETED: { label: '완료', cls: 'success' },
    ERROR: { label: '확인 필요', cls: 'error' },
    PROCESSING: { label: '진행 중', cls: 'info' },
    PENDING: { label: '대기', cls: 'pending' },
  };

  const gridOptions = {
    columnDefs: [
      { headerName: '대상 월', field: 'yearMonthLabel', flex: 0.8 },
      { headerName: '업로드자', field: 'uploadedBy', flex: 0.8, valueGetter: (p) => p.data.uploadedBy.name },
      { headerName: '시트 수', field: 'sheetCount', flex: 0.5, type: 'numericColumn' },
      { headerName: '행 수', field: 'totalRows', flex: 0.5, type: 'numericColumn', valueFormatter: (p) => p.value ? p.value.toLocaleString() + '건' : '-' },
      {
        headerName: '상태', field: 'status', flex: 0.7,
        cellRenderer: (p) => {
          const s = statusMap[p.value] || { label: p.value, cls: 'pending' };
          return `<span class="status-badge ${s.cls}">${s.label}</span>`;
        },
      },
      { headerName: '오류 내용', field: 'errorMessage', flex: 1.5, valueFormatter: (p) => p.value || '-' },
      { headerName: '업로드 일시', field: 'createdAt', flex: 1, valueFormatter: (p) => formatDateTime(p.value) },
    ],
    rowData: [...UPLOAD_BATCHES].reverse(),
    domLayout: 'normal',
    headerHeight: 48,
    rowHeight: 48,
    pagination: true,
    paginationPageSize: getSavedPageSize('uploadHistory', 10),
    suppressCellFocus: true,
    defaultColDef: { sortable: true, resizable: true },
  };

  gridInstances.uploadHistory = agGrid.createGrid(gridEl, gridOptions);
  bindGridPagination('uploadHistory');
}

// ══════════════════════════════════════════
// 3. 리포트 라이브러리
// ══════════════════════════════════════════
let reportFilters = { category: '', search: '', month: '' };

function renderReports(el) {
  reportFilters = { category: '', search: '', month: '' };

  const categories = [...new Set(REPORT_TEMPLATES.map(t => t.category))];
  const months = AVAILABLE_MONTHS.slice(0, 12);

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">리포트 라이브러리</h1>
      <p class="page-desc">비용 분석 리포트를 선택하고 생성해 보세요</p>
    </div>

    <div class="filter-bar">
      <select class="filter-select" id="filter-category" onchange="applyReportFilter()">
        <option value="">전체 유형</option>
        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select class="filter-select" id="filter-month" onchange="applyReportFilter()">
        <option value="">전체 기간</option>
        ${months.map(m => `<option value="${m}">${m}</option>`).join('')}
      </select>
      <div class="filter-search">
        <span class="filter-search-icon">🔍</span>
        <input type="text" class="filter-input" id="filter-search" placeholder="리포트명 검색" oninput="applyReportFilter()" />
      </div>
      <button class="filter-reset" onclick="resetReportFilter()">초기화</button>
    </div>

    <div class="report-card-grid" id="report-card-grid"></div>
  `;

  renderReportCards();
}

function applyReportFilter() {
  reportFilters.category = document.getElementById('filter-category')?.value || '';
  reportFilters.search = document.getElementById('filter-search')?.value || '';
  reportFilters.month = document.getElementById('filter-month')?.value || '';
  renderReportCards();
}

function resetReportFilter() {
  reportFilters = { category: '', search: '', month: '' };
  const catEl = document.getElementById('filter-category');
  const searchEl = document.getElementById('filter-search');
  const monthEl = document.getElementById('filter-month');
  if (catEl) catEl.value = '';
  if (searchEl) searchEl.value = '';
  if (monthEl) monthEl.value = '';
  renderReportCards();
}

function renderReportCards() {
  const grid = document.getElementById('report-card-grid');
  if (!grid) return;

  let templates = REPORT_TEMPLATES.filter(t => t.isActive);

  if (reportFilters.category) {
    templates = templates.filter(t => t.category === reportFilters.category);
  }
  if (reportFilters.search) {
    const q = reportFilters.search.toLowerCase();
    templates = templates.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }

  if (templates.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">검색 결과가 없어요</div>
        <div class="empty-state-hint">필터를 변경하거나 검색어를 수정해 보세요</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = templates.map(tpl => {
    const latestFile = REPORT_FILES
      .filter(f => f.templateId === tpl.id && f.status === 'COMPLETED')
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];

    return `
      <div class="report-card" onclick="openReportDetail(${tpl.id})">
        <div class="report-card-header">
          <span class="report-card-icon">${tpl.icon}</span>
          <div>
            <span class="report-card-code">${tpl.code}</span>
            <div class="report-card-name">${tpl.name}</div>
          </div>
        </div>
        <div class="report-card-desc">${tpl.description}</div>
        <div class="report-card-meta">
          <span class="report-card-category">${tpl.category}</span>
          <span class="report-card-latest">
            ${latestFile
              ? `<span class="status-badge success">최신</span> ${latestFile.targetYearMonth}`
              : '<span class="status-badge pending">미생성</span>'
            }
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════
// 4. 리포트 상세 모달
// ══════════════════════════════════════════
function openReportDetail(templateId) {
  const tpl = REPORT_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;

  const files = REPORT_FILES
    .filter(f => f.templateId === tpl.id && f.status === 'COMPLETED')
    .sort((a, b) => b.targetYearMonth.localeCompare(a.targetYearMonth));

  const months = AVAILABLE_MONTHS.slice(0, 6);
  const selectedMonth = months[0] || '';

  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');

  modal.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">${tpl.icon} ${tpl.name}</span>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="report-detail-info">
        <span class="report-detail-label">코드</span>
        <span class="report-detail-value">${tpl.code}</span>
        <span class="report-detail-label">카테고리</span>
        <span class="report-detail-value">${tpl.category}</span>
        <span class="report-detail-label">차트 유형</span>
        <span class="report-detail-value">${tpl.chartType || '해당 없음'}</span>
        <span class="report-detail-label">설명</span>
        <span class="report-detail-value">${tpl.description}</span>
      </div>

      <div class="report-detail-actions">
        <label>대상 월</label>
        <select id="modal-month">
          ${months.map(m => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <label>형식</label>
        <select id="modal-format">
          <option value="XLSX">XLSX</option>
          <option value="PDF">PDF</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="handleDownload('${tpl.code}')">다운로드</button>
        <button class="btn btn-secondary btn-sm" onclick="handleGenerate('${tpl.code}')">새로 생성</button>
      </div>

      <div class="section-card-title" style="margin-bottom:12px;">미리보기</div>
      <div class="report-detail-preview" id="modal-preview-chart"></div>

      ${files.length > 0 ? `
        <div class="section-card-title" style="margin:20px 0 12px;">생성 이력</div>
        <table class="mapping-table">
          <thead>
            <tr><th>대상 월</th><th>형식</th><th>크기</th><th>생성일</th><th>상태</th></tr>
          </thead>
          <tbody>
            ${files.slice(0, 5).map(f => `
              <tr>
                <td>${f.targetYearMonth}</td>
                <td>${f.fileFormat}</td>
                <td>${formatFileSize(f.fileSize)}</td>
                <td>${formatDateTime(f.generatedAt)}</td>
                <td><span class="status-badge success">완료</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;

  overlay.classList.add('active');

  // 미리보기 차트
  setTimeout(() => renderPreviewChart(tpl), 100);
}

function renderPreviewChart(tpl) {
  const chartEl = document.getElementById('modal-preview-chart');
  if (!chartEl) return;

  // 차트 유형별 미리보기
  if (tpl.chartType === 'line') {
    // 비용 추이 또는 예측
    const chart = echarts.init(chartEl);
    const recent6 = MONTHLY_COSTS.slice(-6);
    chart.setOption({
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}<br/>비용: <b>${formatKRW(p[0].value)}</b>` },
      grid: { left: 70, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: recent6.map(d => d.yearMonth), axisLabel: { fontFamily: 'Pretendard', fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { fontFamily: 'Pretendard', fontSize: 11, formatter: (v) => (v / 100000000).toFixed(1) + '억' } },
      series: [{
        type: 'line', data: recent6.map(d => d.cost), smooth: true,
        lineStyle: { color: '#0046FF', width: 2 }, itemStyle: { color: '#0046FF' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0,70,255,0.12)' }, { offset: 1, color: 'rgba(0,70,255,0)' }]) },
      }],
    });
  } else if (tpl.chartType === 'bar' || tpl.chartType === 'pareto') {
    // 서비스별 또는 파레토
    const chart = echarts.init(chartEl);
    const top5 = SERVICE_COSTS.slice(0, 5);
    const cumulative = [];
    let sum = 0;
    const total = top5.reduce((a, b) => a + b.cost, 0);
    top5.forEach(d => { sum += d.cost; cumulative.push(Math.round(sum / total * 100)); });

    const series = [{
      type: 'bar', data: top5.map(d => d.cost), barWidth: 30,
      itemStyle: { color: (p) => shinhanPalette[p.dataIndex], borderRadius: [4, 4, 0, 0] },
    }];

    if (tpl.chartType === 'pareto') {
      series.push({
        type: 'line', data: cumulative, yAxisIndex: 1, smooth: true,
        lineStyle: { color: '#FF4757', width: 2, type: 'dashed' }, itemStyle: { color: '#FF4757' },
        symbol: 'circle', symbolSize: 6,
      });
    }

    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 70, right: tpl.chartType === 'pareto' ? 50 : 20, top: 10, bottom: 40 },
      xAxis: { type: 'category', data: top5.map(d => d.serviceName), axisLabel: { fontFamily: 'Pretendard', fontSize: 10, rotate: 15 } },
      yAxis: [
        { type: 'value', axisLabel: { fontFamily: 'Pretendard', fontSize: 11, formatter: (v) => (v / 1000000).toFixed(0) + 'M' } },
        ...(tpl.chartType === 'pareto' ? [{ type: 'value', max: 100, axisLabel: { fontFamily: 'Pretendard', fontSize: 11, formatter: '{value}%' }, splitLine: { show: false } }] : []),
      ],
      series,
    });
  } else if (tpl.chartType === 'treemap') {
    // 태그 트리맵
    const chart = echarts.init(chartEl);
    const deptTags = TAG_COSTS.filter(t => t.tagName === 'department');
    chart.setOption({
      tooltip: { formatter: (p) => `${p.name}<br/>비용: <b>${formatKRW(p.value)}</b>` },
      series: [{
        type: 'treemap',
        data: deptTags.map((d, i) => ({ name: d.tagValue, value: d.cost, itemStyle: { color: shinhanPalette[i % shinhanPalette.length] } })),
        label: { fontFamily: 'Pretendard', fontSize: 12, formatter: '{b}\n{c}' },
        breadcrumb: { show: false },
      }],
    });
  } else {
    chartEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📥</div><div class="empty-state-text">이 리포트는 데이터 Export 전용입니다</div></div>`;
  }
}

function handleDownload(code) {
  const month = document.getElementById('modal-month')?.value;
  const format = document.getElementById('modal-format')?.value;
  showToast('success', `${code} 리포트를 다운로드합니다 (${month}, ${format})`);
}

function handleGenerate(code) {
  const month = document.getElementById('modal-month')?.value;
  showToast('info', `${code} 리포트를 ${month} 기준으로 생성합니다`);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('active');
  // 모달 클래스 리셋 (비밀번호 모달 등 커스텀 클래스 제거)
  const modal = document.getElementById('modal-content');
  if (modal) modal.className = 'modal';
}

// ══════════════════════════════════════════
// 5. 구독 관리
// ══════════════════════════════════════════
let subscriberGrid = null;

function renderSubscriptions(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">구독 관리</h1>
      <p class="page-desc">매월 자동 발송 구독자와 발송 이력을 관리해 보세요</p>
    </div>

    <!-- 스케줄 상태 카드 -->
    <div class="schedule-card">
      <div class="schedule-card-item">
        <div class="schedule-card-label">다음 발송일</div>
        <div class="schedule-card-value">2026.04.10</div>
      </div>
      <div class="schedule-card-divider"></div>
      <div class="schedule-card-item">
        <div class="schedule-card-label">활성 구독자</div>
        <div class="schedule-card-value">${SUBSCRIBERS.filter(s => s.isActive).length}명</div>
      </div>
      <div class="schedule-card-divider"></div>
      <div class="schedule-card-item">
        <div class="schedule-card-label">최근 발송 결과</div>
        <div class="schedule-card-value"><span class="status-badge success">정상 발송</span></div>
      </div>
      <div style="flex:1;"></div>
      <button class="btn btn-primary btn-sm" onclick="showToast('info','수동 발송을 곧 이용할 수 있어요')">수동 발송</button>
    </div>

    <!-- 구독자 목록 -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-card-title">구독자 목록</span>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="openSubscriberModal('create')">등록</button>
        </div>
      </div>
      <div class="grid-container">
        <div id="grid-subscribers" class="ag-theme-alpine" style="height:400px;width:100%;"></div>
        ${renderGridToolbar('subscribers', '구독자_목록', SUBSCRIBERS.length, getSavedPageSize('subscribers', 10))}
      </div>
    </div>

    <!-- 발송 로그 -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-card-title">발송 이력</span>
      </div>
      <div class="grid-container">
        <div id="grid-sub-logs" class="ag-theme-alpine" style="height:350px;width:100%;"></div>
        ${renderGridToolbar('subLogs', '발송_이력', SUBSCRIPTION_LOGS.length, getSavedPageSize('subLogs', 10))}
      </div>
    </div>
  `;

  setTimeout(() => {
    initSubscriberGrid();
    initSubscriptionLogGrid();
  }, 50);
}

function initSubscriberGrid() {
  const gridEl = document.getElementById('grid-subscribers');
  if (!gridEl) return;

  const gridOptions = {
    columnDefs: [
      { headerName: '이름', field: 'name', flex: 0.8 },
      { headerName: '이메일', field: 'email', flex: 1.5 },
      { headerName: '부서', field: 'department', flex: 0.8 },
      { headerName: '수신 범위', field: 'accountScopeLabel', flex: 1 },
      {
        headerName: '상태', field: 'isActive', flex: 0.6,
        cellRenderer: (p) => p.value
          ? '<span class="status-badge success">활성</span>'
          : '<span class="status-badge pending">비활성</span>',
      },
      {
        headerName: '관리', flex: 0.8, sortable: false, filter: false,
        cellRenderer: (p) => `
          <button class="btn btn-secondary btn-sm" style="margin-right:4px;" onclick="openSubscriberModal('edit',${p.data.id})">수정</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSubscriber(${p.data.id})">삭제</button>
        `,
      },
    ],
    rowData: SUBSCRIBERS,
    domLayout: 'normal',
    headerHeight: 48,
    rowHeight: 48,
    pagination: true,
    paginationPageSize: getSavedPageSize('subscribers', 10),
    suppressCellFocus: true,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
  };

  subscriberGrid = agGrid.createGrid(gridEl, gridOptions);
  gridInstances.subscribers = subscriberGrid;
  bindGridPagination('subscribers');
}

function initSubscriptionLogGrid() {
  const gridEl = document.getElementById('grid-sub-logs');
  if (!gridEl) return;

  const statusMap = {
    SENT: { label: '발송 완료', cls: 'success' },
    FAILED: { label: '확인 필요', cls: 'error' },
    RETRYING: { label: '재시도 중', cls: 'warning' },
    PENDING: { label: '대기', cls: 'pending' },
  };

  const gridOptions = {
    columnDefs: [
      { headerName: '대상 월', field: 'targetMonth', flex: 0.7 },
      { headerName: '수신자', field: 'subscriberName', flex: 0.7 },
      { headerName: '이메일', field: 'subscriberEmail', flex: 1.2 },
      { headerName: '부서', field: 'department', flex: 0.7 },
      {
        headerName: '상태', field: 'status', flex: 0.7,
        cellRenderer: (p) => {
          const s = statusMap[p.value] || { label: p.value, cls: 'pending' };
          return `<span class="status-badge ${s.cls}">${s.label}</span>`;
        },
      },
      { headerName: '재시도', field: 'retryCount', flex: 0.4, type: 'numericColumn' },
      { headerName: '오류 내용', field: 'errorMessage', flex: 1.2, valueFormatter: (p) => p.value || '-' },
      { headerName: '발송 일시', field: 'sentAt', flex: 0.9, valueFormatter: (p) => formatDateTime(p.value) },
    ],
    rowData: [...SUBSCRIPTION_LOGS].reverse(),
    domLayout: 'normal',
    headerHeight: 48,
    rowHeight: 48,
    pagination: true,
    paginationPageSize: getSavedPageSize('subLogs', 10),
    suppressCellFocus: true,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
  };

  gridInstances.subLogs = agGrid.createGrid(gridEl, gridOptions);
  bindGridPagination('subLogs');
}

// ── 구독자 모달 ──
function openSubscriberModal(mode, subscriberId) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');

  const sub = mode === 'edit' ? SUBSCRIBERS.find(s => s.id === subscriberId) : null;

  modal.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">${mode === 'create' ? '구독자 등록' : '구독자 수정'}</span>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-form-row">
        <div class="form-group">
          <label class="form-label">이름</label>
          <input type="text" class="form-input" id="sub-name" value="${sub?.name || ''}" placeholder="홍길동" />
        </div>
        <div class="form-group">
          <label class="form-label">이메일</label>
          <input type="email" class="form-input" id="sub-email" value="${sub?.email || ''}" placeholder="user@shinhan-ds.com" />
        </div>
      </div>
      <div class="modal-form-row">
        <div class="form-group">
          <label class="form-label">부서</label>
          <select class="form-select" id="sub-dept">
            <option value="">선택</option>
            ${['경영기획실', '재무팀', '클라우드운영팀', '인프라팀', '개발1팀', '개발2팀', '데이터팀'].map(d =>
              `<option value="${d}" ${sub?.department === d ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">수신 범위</label>
          <select class="form-select" id="sub-scope">
            <option value="">전사</option>
            ${ACCOUNT_COSTS.map(a =>
              `<option value="${a.accountName}" ${sub?.accountScope === a.accountName ? 'selected' : ''}>${a.accountName}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      ${mode === 'edit' ? `
        <div class="form-group">
          <label class="form-label">상태</label>
          <select class="form-select" id="sub-active">
            <option value="true" ${sub?.isActive ? 'selected' : ''}>활성</option>
            <option value="false" ${!sub?.isActive ? 'selected' : ''}>비활성</option>
          </select>
        </div>
      ` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveSubscriber('${mode}', ${subscriberId || 0})">${mode === 'create' ? '등록' : '저장'}</button>
    </div>
  `;

  overlay.classList.add('active');
}

function saveSubscriber(mode, id) {
  const name = document.getElementById('sub-name')?.value;
  const email = document.getElementById('sub-email')?.value;
  if (!name || !email) {
    showToast('warning', '이름과 이메일을 입력해 주세요');
    return;
  }
  closeModal();
  showToast('success', mode === 'create' ? '구독자를 등록했습니다' : '구독자 정보를 수정했습니다');
}

function deleteSubscriber(id) {
  if (confirm('이 구독자를 비활성화하시겠어요?')) {
    showToast('success', '구독자를 비활성화했습니다');
  }
}

// ══════════════════════════════════════════
// 6. 환경설정 — CUR 컬럼 관리
// ══════════════════════════════════════════

// 환경설정 드롭다운 토글
function toggleSettingsMenu(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('settings-dropdown');
  if (!dropdown) return;
  const isVisible = dropdown.style.display !== 'none';
  if (isVisible) {
    closeSettingsMenu();
  } else {
    dropdown.style.display = 'block';
    setTimeout(() => {
      document.addEventListener('click', closeSettingsMenuHandler);
    }, 10);
  }
}

function closeSettingsMenu() {
  const dropdown = document.getElementById('settings-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  document.removeEventListener('click', closeSettingsMenuHandler);
}

function closeSettingsMenuHandler(e) {
  if (!e.target.closest('#gnb-settings-wrap')) {
    closeSettingsMenu();
  }
}

// CUR 컬럼 관리 화면
let curGridApi = null;
let curShowDeleted = false;

function renderCurColumns(el) {
  // 관리자 권한 확인
  if (!CURRENT_USER.roles.includes('ROLE_ADMIN')) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">접근 권한이 없습니다</div><div class="empty-state-hint">관리자만 이용할 수 있습니다</div></div>`;
    return;
  }

  // 카테고리 목록 추출
  const categories = [...new Set(CUR_COLUMNS.map(c => c.columnCategory))];

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">CUR 컬럼 관리</h1>
      <p class="page-desc">AWS CUR2 컬럼 사전을 관리합니다. 컬럼의 추가·수정·삭제가 가능합니다.</p>
    </div>

    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left">
          <select class="cur-filter-select" id="cur-category-filter" onchange="filterCurGrid()">
            <option value="">전체 카테고리</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <input class="cur-search-input" id="cur-search" type="text" placeholder="컬럼명, 한글명, 설명 검색..." oninput="filterCurGrid()" />
          <label class="cur-toggle-deleted">
            <input type="checkbox" id="cur-show-deleted" onchange="curShowDeleted=this.checked;filterCurGrid();" />
            삭제 포함
          </label>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-primary btn-sm" onclick="openCurModal('create')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
            추가
          </button>
        </div>
      </div>
      <div id="grid-cur-columns" class="ag-theme-alpine" style="width:100%;height:520px;"></div>
      <div id="cur-grid-toolbar"></div>
    </div>
  `;

  initCurGrid();
}

function initCurGrid() {
  const columnDefs = [
    { headerName: 'ID', field: 'id', width: 60, hide: true },
    { headerName: '카테고리', field: 'columnCategory', width: 130,
      cellRenderer: (p) => {
        const colors = { bill:'#0046FF', costCategory:'#0076FF', capacityReservation:'#002D85', discount:'#FF4D4F', identity:'#00C07F', lineItem:'#FFB300', pricing:'#4D8AFF', product:'#99B8FF', reservation:'#E64548', resourceTags:'#00865A', savingsPlan:'#CF1322', splitLineItem:'#91CAFF', tags:'#4D4D4D' };
        const color = colors[p.value] || '#4D4D4D';
        return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}15;color:${color};">${p.value}</span>`;
      }
    },
    { headerName: '컬럼명', field: 'columnName', width: 280, tooltipField: 'columnName' },
    { headerName: '한글명', field: 'columnKoName', width: 200, tooltipField: 'columnKoName' },
    { headerName: '데이터 타입', field: 'dataType', width: 130 },
    { headerName: 'Nullable', field: 'nullability', width: 100,
      cellRenderer: (p) => p.value ? `<span style="color:var(--color-warning);font-weight:600;">${p.value}</span>` : '-'
    },
    { headerName: '설명', field: 'description', flex: 1, minWidth: 200, tooltipField: 'description' },
    { headerName: '등록일', field: 'createdAt', width: 110,
      valueFormatter: (p) => p.value ? p.value.substring(0, 10).replace(/-/g, '.') : '-'
    },
    { headerName: '삭제', field: 'isDeleted', width: 70, hide: true,
      cellRenderer: (p) => p.value ? '<span style="color:var(--color-error);">삭제</span>' : ''
    },
    { headerName: '관리', width: 120, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => {
        const isDeleted = p.data.isDeleted;
        if (isDeleted) {
          return `<button class="btn btn-sm btn-secondary" onclick="restoreCurColumn(${p.data.id})" style="font-size:11px;">복원</button>`;
        }
        return `<button class="btn btn-sm btn-secondary" onclick="openCurModal('edit',${p.data.id})" style="font-size:11px;margin-right:4px;">수정</button><button class="btn btn-sm btn-danger" onclick="deleteCurColumn(${p.data.id})" style="font-size:11px;">삭제</button>`;
      }
    },
  ];

  const gridOptions = {
    columnDefs,
    rowData: CUR_COLUMNS.filter(c => !c.isDeleted),
    defaultColDef: {
      sortable: true, resizable: true, suppressMovable: false,
      wrapHeaderText: true, autoHeaderHeight: true,
    },
    pagination: true,
    paginationPageSize: getSavedPageSize('curColumns', 20),
    rowHeight: 40,
    headerHeight: 42,
    tooltipShowDelay: 300,
    getRowClass: (p) => p.data.isDeleted ? 'row-deleted' : '',
    onGridReady: (params) => {
      curGridApi = params.api;
      gridInstances['curColumns'] = params.api;
      bindGridPagination('curColumns');
      // 툴바
      const toolbarEl = document.getElementById('cur-grid-toolbar');
      if (toolbarEl) {
        const total = CUR_COLUMNS.filter(c => !c.isDeleted).length;
        toolbarEl.innerHTML = renderGridToolbar('curColumns', 'CUR_컬럼사전', total, getSavedPageSize('curColumns', 20));
      }
    },
  };

  const gridEl = document.getElementById('grid-cur-columns');
  if (gridEl) {
    agGrid.createGrid(gridEl, gridOptions);
  }
}

// 필터링
function filterCurGrid() {
  if (!curGridApi) return;
  const category = document.getElementById('cur-category-filter')?.value || '';
  const search = (document.getElementById('cur-search')?.value || '').toLowerCase();

  let filtered = CUR_COLUMNS.filter(c => {
    if (!curShowDeleted && c.isDeleted) return false;
    if (category && c.columnCategory !== category) return false;
    if (search) {
      return c.columnName.toLowerCase().includes(search)
        || c.columnKoName.toLowerCase().includes(search)
        || c.description.toLowerCase().includes(search);
    }
    return true;
  });

  curGridApi.setGridOption('rowData', filtered);

  // 툴바 업데이트
  const toolbarEl = document.getElementById('cur-grid-toolbar');
  if (toolbarEl) {
    toolbarEl.innerHTML = renderGridToolbar('curColumns', 'CUR_컬럼사전', filtered.length, curGridApi.paginationGetPageSize());
  }
}

// CUR 컬럼 추가/수정 모달
function openCurModal(mode, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';

  let data = { columnCategory: '', columnName: '', columnKoName: '', description: '', dataType: 'string', nullability: '', properties: '' };
  if (mode === 'edit' && id) {
    const found = CUR_COLUMNS.find(c => c.id === id);
    if (found) data = { ...found };
  }

  const title = mode === 'create' ? '컬럼 추가' : '컬럼 수정';
  const categories = [...new Set(CUR_COLUMNS.map(c => c.columnCategory))];
  const dataTypes = ['string', 'String', 'double', 'timestamp', 'map <string, string>', 'map <string, double>'];

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">카테고리 *</label>
        <select class="form-select" id="cur-f-category">
          <option value="">선택</option>
          ${categories.map(c => `<option value="${c}" ${data.columnCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">데이터 타입 *</label>
        <select class="form-select" id="cur-f-dataType">
          ${dataTypes.map(t => `<option value="${t}" ${data.dataType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">컬럼명 (영문, camelCase) *</label>
      <input class="form-input" id="cur-f-columnName" value="${data.columnName}" placeholder="예: lineItemUsageAmount" />
    </div>
    <div class="form-group">
      <label class="form-label">한글명 *</label>
      <input class="form-input" id="cur-f-columnKoName" value="${data.columnKoName}" placeholder="예: 라인항목_사용량수량" />
    </div>
    <div class="form-group">
      <label class="form-label">설명</label>
      <textarea class="form-textarea" id="cur-f-description" placeholder="컬럼에 대한 상세 설명">${data.description}</textarea>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">Nullability</label>
        <input class="form-input" id="cur-f-nullability" value="${data.nullability}" placeholder="예: Nullable" />
      </div>
      <div class="form-group">
        <label class="form-label">속성</label>
        <input class="form-input" id="cur-f-properties" value="${data.properties}" placeholder="예: Added by: ..." />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveCurColumn('${mode}', ${id || 0})">${mode === 'create' ? '추가' : '저장'}</button>
    </div>
  `;

  overlay.classList.add('active');
  setTimeout(() => document.getElementById('cur-f-columnName')?.focus(), 200);
}

// CUR 컬럼 저장
function saveCurColumn(mode, id) {
  const category = document.getElementById('cur-f-category').value;
  const columnName = document.getElementById('cur-f-columnName').value.trim();
  const columnKoName = document.getElementById('cur-f-columnKoName').value.trim();
  const description = document.getElementById('cur-f-description').value.trim();
  const dataType = document.getElementById('cur-f-dataType').value;
  const nullability = document.getElementById('cur-f-nullability').value.trim();
  const properties = document.getElementById('cur-f-properties').value.trim();

  // 필수 필드 검증
  if (!category) { showToast('error', '카테고리를 선택해 주세요'); return; }
  if (!columnName) { showToast('error', '컬럼명을 입력해 주세요'); return; }
  if (!columnKoName) { showToast('error', '한글명을 입력해 주세요'); return; }

  if (mode === 'create') {
    const newId = Math.max(...CUR_COLUMNS.map(c => c.id)) + 1;
    CUR_COLUMNS.push({
      id: newId, columnCategory: category, columnName, columnKoName,
      description, dataType, nullability, properties,
      createdAt: new Date().toISOString().substring(0, 19),
      isDeleted: false,
    });
    showToast('success', `${columnKoName} 컬럼을 추가했습니다`);
  } else {
    const item = CUR_COLUMNS.find(c => c.id === id);
    if (item) {
      Object.assign(item, { columnCategory: category, columnName, columnKoName, description, dataType, nullability, properties });
      showToast('success', `${columnKoName} 컬럼을 수정했습니다`);
    }
  }

  closeModal();
  filterCurGrid();
}

// 소프트 삭제
function deleteCurColumn(id) {
  const item = CUR_COLUMNS.find(c => c.id === id);
  if (!item) return;
  if (confirm(`${item.columnKoName} 컬럼을 삭제하시겠어요?`)) {
    item.isDeleted = true;
    showToast('success', `${item.columnKoName} 컬럼을 삭제했습니다`);
    filterCurGrid();
  }
}

// 복원
function restoreCurColumn(id) {
  const item = CUR_COLUMNS.find(c => c.id === id);
  if (!item) return;
  item.isDeleted = false;
  showToast('success', `${item.columnKoName} 컬럼을 복원했습니다`);
  filterCurGrid();
}

// ══════════════════════════════════════════
// 로그인 페이지
// ══════════════════════════════════════════
function renderLoginPage() {
  const app = document.getElementById('app');
  const lockBanner = lockedUntil ? `<div class="login-lock-banner" id="lock-banner">
    로그인 ${MAX_LOGIN_FAIL}회 실패로 계정이 잠겼습니다. <span id="lock-timer"></span> 후 다시 시도해 주세요.
  </div>` : '';

  app.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-main">CLOUD COST REPORTING</div>
          <div class="login-logo-sub">클라우드 비용 리포팅 자동화</div>
        </div>
        ${lockBanner}
        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="login-form-group">
            <label class="login-label" for="login-id">아이디</label>
            <input class="login-input" id="login-id" type="text" placeholder="아이디를 입력해 주세요" autocomplete="username" />
            <div class="login-error-msg" id="login-id-error"></div>
          </div>
          <div class="login-form-group">
            <label class="login-label" for="login-pw">비밀번호</label>
            <div class="pw-input-wrapper">
              <input class="login-input" id="login-pw" type="password" placeholder="비밀번호를 입력해 주세요" autocomplete="current-password" />
              <button type="button" class="pw-toggle-btn" onclick="togglePasswordVisibility('login-pw', this)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
            <div class="login-error-msg" id="login-pw-error"></div>
          </div>
          <button type="submit" class="login-btn" id="login-btn" ${lockedUntil ? 'disabled' : ''}>로그인</button>
        </form>
        <div class="login-test-accounts">
          <div class="login-test-title">테스트 계정 (비밀번호: 아무 값)</div>
          <div class="login-test-list">
            <span class="login-test-item"><b>kimops</b> Cloud Ops</span>
            <span class="login-test-item"><b>admin</b> 관리자</span>
            <span class="login-test-item"><b>parkview</b> 경영진</span>
          </div>
        </div>
      </div>
    </div>
    <div class="toast-container" id="toast-container"></div>
  `;

  // 잠금 타이머 업데이트
  if (lockedUntil) startLockTimer();

  // 첫 번째 입력 필드에 포커스
  setTimeout(() => document.getElementById('login-id')?.focus(), 100);
}

// 로그인 처리
function handleLogin(e) {
  e.preventDefault();

  // 잠금 상태 확인
  if (lockedUntil && Date.now() < lockedUntil) return;

  const username = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-pw').value.trim();
  const idError = document.getElementById('login-id-error');
  const pwError = document.getElementById('login-pw-error');

  // 검증 초기화
  idError.textContent = '';
  pwError.textContent = '';
  document.getElementById('login-id').classList.remove('error');
  document.getElementById('login-pw').classList.remove('error');

  let hasError = false;
  if (!username) {
    idError.textContent = '아이디를 입력해 주세요.';
    document.getElementById('login-id').classList.add('error');
    hasError = true;
  }
  if (!password) {
    pwError.textContent = '비밀번호를 입력해 주세요.';
    document.getElementById('login-pw').classList.add('error');
    hasError = true;
  }
  if (hasError) return;

  // 사용자 확인 (프로토타입: username만 확인)
  const found = USERS.find(u => u.username === username && u.isActive);
  if (!found) {
    loginFailCount++;
    if (loginFailCount >= MAX_LOGIN_FAIL) {
      lockedUntil = Date.now() + LOCK_DURATION_MS;
      renderLoginPage();
      showToast('error', `로그인 ${MAX_LOGIN_FAIL}회 실패로 계정이 10분간 잠겼습니다`);
      return;
    }
    pwError.textContent = `아이디 또는 비밀번호가 올바르지 않습니다. (${loginFailCount}/${MAX_LOGIN_FAIL})`;
    document.getElementById('login-pw').classList.add('error');
    return;
  }

  // 로그인 성공
  loginFailCount = 0;
  lockedUntil = null;
  isAuthenticated = true;
  localStorage.setItem('ccr_authenticated', 'true');

  // 현재 사용자 전환
  Object.keys(found).forEach(k => { CURRENT_USER[k] = found[k]; });

  // 앱 진입
  window.location.hash = '#/dashboard';
}

// 잠금 타이머
function startLockTimer() {
  if (lockTimer) clearInterval(lockTimer);
  lockTimer = setInterval(() => {
    if (!lockedUntil || Date.now() >= lockedUntil) {
      lockedUntil = null;
      loginFailCount = 0;
      clearInterval(lockTimer);
      lockTimer = null;
      renderLoginPage();
      return;
    }
    const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    const timerEl = document.getElementById('lock-timer');
    if (timerEl) timerEl.textContent = `${min}분 ${sec}초`;
    const btn = document.getElementById('login-btn');
    if (btn) btn.disabled = true;
  }, 1000);
}

// 로그아웃
function handleLogout() {
  isAuthenticated = false;
  localStorage.removeItem('ccr_authenticated');
  closeUserDropdown();
  destroyAllGrids();
  window.location.hash = '#/login';
}

// ══════════════════════════════════════════
// 사용자 드롭다운 메뉴
// ══════════════════════════════════════════
function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('user-dropdown');
  if (!dropdown) return;

  const isVisible = dropdown.style.display !== 'none';
  if (isVisible) {
    closeUserDropdown();
  } else {
    dropdown.style.display = 'block';
    // 바깥 클릭으로 닫기
    setTimeout(() => {
      document.addEventListener('click', closeUserDropdownHandler);
    }, 10);
  }
}

function closeUserDropdown() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  document.removeEventListener('click', closeUserDropdownHandler);
}

function closeUserDropdownHandler(e) {
  if (!e.target.closest('#gnb-user-btn')) {
    closeUserDropdown();
  }
}

// ══════════════════════════════════════════
// 비밀번호 변경 모달
// ══════════════════════════════════════════
function openPasswordModal() {
  closeUserDropdown();
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.className = 'modal pw-modal';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">비밀번호 변경</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="pw-policy">
      <div class="pw-policy-title">비밀번호 정책</div>
      10자 이상 / 대문자·소문자·숫자·특수문자 각 1개 이상 포함<br/>
      동일 문자 3회 연속 사용 불가 / 아이디 포함 불가
    </div>
    <div class="form-group">
      <label class="form-label">현재 비밀번호</label>
      <div class="pw-input-wrapper">
        <input class="form-input" id="pw-current" type="password" placeholder="현재 비밀번호 입력" />
        <button type="button" class="pw-toggle-btn" onclick="togglePasswordVisibility('pw-current', this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
      <div class="login-error-msg" id="pw-current-error"></div>
    </div>
    <div class="form-group">
      <label class="form-label">새 비밀번호</label>
      <div class="pw-input-wrapper">
        <input class="form-input" id="pw-new" type="password" placeholder="새 비밀번호 입력" oninput="checkPasswordStrength()" />
        <button type="button" class="pw-toggle-btn" onclick="togglePasswordVisibility('pw-new', this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
      <div id="pw-strength-feedback"></div>
      <div class="login-error-msg" id="pw-new-error"></div>
    </div>
    <div class="form-group">
      <label class="form-label">새 비밀번호 확인</label>
      <div class="pw-input-wrapper">
        <input class="form-input" id="pw-confirm" type="password" placeholder="새 비밀번호 재입력" />
        <button type="button" class="pw-toggle-btn" onclick="togglePasswordVisibility('pw-confirm', this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
      <div class="login-error-msg" id="pw-confirm-error"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="handlePasswordChange()">변경</button>
    </div>
  `;

  overlay.classList.add('active');
  setTimeout(() => document.getElementById('pw-current')?.focus(), 200);
}

// 비밀번호 강도 검증
function validatePasswordPolicy(password) {
  const errors = [];
  if (password.length < 10) errors.push('10자 이상이어야 합니다.');
  if (!/[A-Z]/.test(password)) errors.push('대문자를 포함해야 합니다.');
  if (!/[a-z]/.test(password)) errors.push('소문자를 포함해야 합니다.');
  if (!/[0-9]/.test(password)) errors.push('숫자를 포함해야 합니다.');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('특수문자를 포함해야 합니다.');
  if (/(.)\1{2,}/.test(password)) errors.push('동일 문자를 3회 이상 연속 사용할 수 없습니다.');
  const loginId = CURRENT_USER.username || '';
  if (loginId && password.toLowerCase().includes(loginId.toLowerCase())) errors.push('아이디를 포함할 수 없습니다.');
  return errors;
}

// 실시간 비밀번호 강도 피드백
function checkPasswordStrength() {
  const pw = document.getElementById('pw-new')?.value || '';
  const feedbackEl = document.getElementById('pw-strength-feedback');
  if (!feedbackEl) return;

  if (!pw) {
    feedbackEl.innerHTML = '';
    return;
  }

  const errors = validatePasswordPolicy(pw);
  if (errors.length === 0) {
    feedbackEl.innerHTML = '<div class="pw-strength pass">비밀번호 정책을 충족합니다.</div>';
  } else {
    feedbackEl.innerHTML = errors.map(msg => `<div class="pw-strength fail">${msg}</div>`).join('');
  }
}

// 비밀번호 변경 처리
function handlePasswordChange() {
  const current = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;

  // 초기화
  ['pw-current-error', 'pw-new-error', 'pw-confirm-error'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  let hasError = false;

  if (!current) {
    document.getElementById('pw-current-error').textContent = '현재 비밀번호를 입력해 주세요.';
    hasError = true;
  }

  if (!newPw) {
    document.getElementById('pw-new-error').textContent = '새 비밀번호를 입력해 주세요.';
    hasError = true;
  } else {
    const pwErrors = validatePasswordPolicy(newPw);
    if (pwErrors.length > 0) {
      document.getElementById('pw-new-error').textContent = pwErrors[0];
      hasError = true;
    }
  }

  if (!confirm) {
    document.getElementById('pw-confirm-error').textContent = '새 비밀번호를 다시 입력해 주세요.';
    hasError = true;
  } else if (newPw && newPw !== confirm) {
    document.getElementById('pw-confirm-error').textContent = '새 비밀번호가 일치하지 않습니다.';
    hasError = true;
  }

  if (current && newPw && current === newPw) {
    document.getElementById('pw-new-error').textContent = '현재 비밀번호와 다른 비밀번호를 입력해 주세요.';
    hasError = true;
  }

  if (hasError) return;

  // 프로토타입: 성공 처리
  closeModal();
  showToast('success', '비밀번호가 변경되었습니다');
}

// 비밀번호 표시/숨김 토글
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  // 아이콘 교체
  btn.innerHTML = isPassword
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" x2="23" y1="1" y2="23"></line></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
}

// ══════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════

// 앱 셸 렌더링 (GNB + 콘텐츠 영역 + 모달 + 토스트)
function initAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderGNB()}
    <main class="content" id="app-content"></main>
    <div class="modal-overlay" id="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" id="modal-content"></div>
    </div>
    <div class="toast-container" id="toast-container"></div>
  `;
}

function initApp() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// DOM 준비 후 실행
document.addEventListener('DOMContentLoaded', initApp);
