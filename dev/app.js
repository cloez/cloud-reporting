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

// ── 세션 복원 — 새로고침 시 currentUserId/currentContractId 복원 ──
(function restoreSession() {
  try {
    const savedUserId = parseInt(localStorage.getItem('ccr_currentUserId') || '0', 10);
    if (savedUserId) {
      const u = USERS.find(x => x.id === savedUserId);
      if (u) Object.keys(u).forEach(k => CURRENT_USER[k] = u[k]);
    }
  } catch (err) {
    console.warn('세션 복원 실패:', err);
  }
})();

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

  // 감사 로그: 다운로드 이력 (조회 조건 포함 — 현재 필터/페이지 정보)
  const cond = buildExportCondition(gridKey, fileName, allData.length);
  logAudit(AUDIT_ACTIONS.EXPORT, `${fileName} 다운로드`, cond);
}

// 엑셀 다운로드 감사 로그 조건 조립 — 그리드별 현재 필터 상태 반영
function buildExportCondition(gridKey, fileName, rowCount) {
  let parts = [`파일명: ${fileName}.xlsx`, `건수: ${rowCount}`];
  if (gridKey === 'curColumns') {
    const category = document.getElementById('cur-category-filter')?.value || '전체';
    const search = document.getElementById('cur-search')?.value || '-';
    parts.push(`카테고리: ${category}`, `검색어: ${search}`);
  } else if (gridKey === 'users') {
    const role = document.getElementById('user-role-filter')?.value;
    const search = document.getElementById('user-search')?.value || '-';
    parts.push(`역할: ${role ? (ROLE_LABELS[role] || role) : '전체'}`, `검색어: ${search}`);
  } else if (gridKey === 'recentReports') {
    parts.push(`유형: ${reportFilters?.category || '전체'}`, `기간: ${reportFilters?.month || '전체'}`, `검색어: ${reportFilters?.search || '-'}`);
  }
  return parts.join(', ');
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

// ── 그리드 컨테이너를 사용자 리사이즈 가능하게 만들고 높이 상태 저장/복원 ──
// 각 그리드의 DOM 요소에 resize:vertical을 걸고 ResizeObserver로 변경된 높이를
// localStorage(`grid-height-<gridKey>`)에 저장한다. 다음 로딩 시 동일 키로 복원.
function makeGridResizable(gridKey) {
  const el = document.getElementById(gridIdMap[gridKey]);
  if (!el) return;

  // 그리드 + 바로 뒤의 페이지네이션 툴바를 하나의 래퍼로 묶어서
  // 리사이즈 핸들이 툴바 아래(카드 우하단)에 위치하도록 한다.
  const defaultHeight = el.style.height || getComputedStyle(el).height;
  const gridDefaultPx = parseFloat(defaultHeight) || 420;
  const saved = localStorage.getItem(`grid-height-${gridKey}`);

  // 래퍼 생성 (이미 감싸져 있지 않은 경우에만)
  let wrap = el.parentElement;
  if (!wrap || !wrap.classList.contains('grid-resize-wrap')) {
    wrap = document.createElement('div');
    wrap.className = 'grid-resize-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    // 바로 뒤에 있던 툴바(또는 툴바를 감싸는 컨테이너)도 래퍼 안으로 이동
    // 그리드 바로 다음 형제는 항상 페이지네이션 툴바 컨테이너이다.
    const toolbar = wrap.nextElementSibling;
    if (toolbar && (toolbar.classList.contains('grid-toolbar')
                 || /grid-toolbar$/.test(toolbar.id || ''))) {
      wrap.appendChild(toolbar);
    }
  }

  // 그리드는 flex 자식으로 늘어나도록 — 인라인 높이 제거
  el.style.height = '';
  el.style.resize = '';
  el.style.overflow = '';
  el.classList.remove('resizable-grid');
  el.classList.add('grid-resize-child');

  // 래퍼 높이 = 그리드 기본 높이 + 툴바 여유 (툴바 높이는 CSS min-height로 보장)
  const toolbarExtra = 56; // 페이지네이션 툴바 예상 높이
  const wrapDefault = Math.round(gridDefaultPx + toolbarExtra);
  const wrapHeight = saved ? Number(saved) : wrapDefault;
  wrap.style.height = wrapHeight + 'px';

  // ResizeObserver — 드래그가 멈춘 뒤 래퍼 높이를 저장 (디바운스)
  let saveTimer = null;
  let lastSavedH = saved ? Number(saved) : null;
  try {
    const ro = new ResizeObserver(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const h = Math.round(wrap.getBoundingClientRect().height);
        if (h > 0 && h !== lastSavedH) {
          localStorage.setItem(`grid-height-${gridKey}`, String(h));
          lastSavedH = h;
        }
      }, 250);
    });
    ro.observe(wrap);
  } catch (err) {
    console.warn('ResizeObserver 초기화 실패:', err);
  }
}

// ── AG Grid 생성 후 이벤트 바인딩 (페이지네이션 + 컬럼 상태 저장 + 리사이즈) ──
function bindGridPagination(gridKey) {
  const api = gridInstances[gridKey];
  if (!api) return;
  api.addEventListener('paginationChanged', () => updateToolbarPagination(gridKey));

  // 그리드 컨테이너 세로 리사이즈 가능 + 저장된 높이 복원
  makeGridResizable(gridKey);

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
  users: 'grid-users',
  auditLogs: 'grid-audit-logs',
  // v2 신규 화면 그리드 (DOM id == gridKey)
  'tenants-grid': 'tenants-grid',
  'aliases-grid': 'aliases-grid',
  'contracts-grid': 'contracts-grid',
  'scopes-grid': 'scopes-grid',
};

// ── 헤더 우클릭 컬럼 선택 메뉴 ──
// (구) 그리드별 개별 부착은 글로벌 위임으로 일원화됨 — 호환을 위해 함수는 보존(no-op)
function initColumnContextMenu(_gridKey) { /* no-op: initGlobalColumnContextMenu 사용 */ }

// 페이지에 단 한 번만 등록되는 위임형 우클릭 메뉴 — 모든 AG Grid 헤더에 자동 적용
// (신규 그리드 추가 시 별도 부착 불필요. gridIdMap에 등록만 되어 있으면 동작)
let __columnContextMenuInstalled = false;
function initGlobalColumnContextMenu() {
  if (__columnContextMenuInstalled) return;
  __columnContextMenuInstalled = true;
  document.addEventListener('contextmenu', (e) => {
    // AG Grid 헤더 영역 안에서만 동작
    const header = e.target && e.target.closest && e.target.closest('.ag-header');
    if (!header) return;
    // 가장 가까운 ID 보유 조상에서 그리드 DOM id 추출 (그리드 컨테이너 = id 보유 div)
    let domId = null;
    let cur = header.parentElement;
    while (cur) {
      if (cur.id) { domId = cur.id; break; }
      cur = cur.parentElement;
    }
    if (!domId) return;
    // domId → gridKey 역매핑 (gridIdMap), 없으면 domId 자체를 키로 시도
    let gridKey = null;
    for (const k of Object.keys(gridIdMap)) {
      if (gridIdMap[k] === domId) { gridKey = k; break; }
    }
    if (!gridKey && gridInstances[domId]) gridKey = domId;
    if (!gridKey || !gridInstances[gridKey]) return;
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

// ── AG Grid 공통 초기화 헬퍼 (v2 신규 화면 공용) ──
// gridKey: gridInstances[gridKey] 저장 키 (DOM id와 동일 사용 권장)
// columnDefs: AG Grid 컬럼 정의 배열
// rowData: 행 데이터 배열
// opts: {
//   defaultPageSize?: number,
//   autoSizeColumns?: boolean,
//   makeResizable?: boolean,   // true 시 makeGridResizable(gridKey) 자동 호출
//   syncToolbar?: boolean,     // true 시 페이징 변경/그리드 준비 시 updateToolbarPagination(gridKey) 자동 호출
// }
function initAGGrid(gridKey, columnDefs, rowData, opts) {
  const gridEl = document.getElementById(gridKey);
  if (!gridEl) return null;
  const options = Object.assign({
    defaultPageSize: 20,
    autoSizeColumns: false,
    makeResizable: false,
    syncToolbar: false,
  }, opts || {});
  try {
    // 기존 인스턴스 정리
    if (gridInstances[gridKey]) {
      try { gridInstances[gridKey].destroy(); } catch (e) {}
      delete gridInstances[gridKey];
    }
    const gridOptions = {
      columnDefs,
      rowData,
      domLayout: 'normal',
      headerHeight: 48,
      rowHeight: 44,
      suppressCellFocus: true,
      pagination: true,
      paginationPageSize: getSavedPageSize(gridKey, options.defaultPageSize),
      defaultColDef: { sortable: true, resizable: true, filter: true },
      // 선택 관련 옵션 전달 (체크박스 선택 등)
      ...(options.rowSelection ? { rowSelection: options.rowSelection } : {}),
      ...(options.onSelectionChanged ? { onSelectionChanged: options.onSelectionChanged } : {}),
    };
    // ── 공통 콜백 합성 (사용자 정의 콜백을 보존하면서 공통 동작 부착) ──
    const userOnGridReady = gridOptions.onGridReady;
    const userOnPaginationChanged = gridOptions.onPaginationChanged;

    gridOptions.onGridReady = (params) => {
      // (a) 페이징 동기화
      if (options.syncToolbar) {
        try { updateToolbarPagination(gridKey); } catch (e) {}
      }
      // (b) 저장된 컬럼 상태(이동/리사이즈/표시) 복원
      try {
        const saved = localStorage.getItem(`grid-col-${gridKey}`);
        if (saved && params.api && params.api.applyColumnState) {
          params.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
        }
      } catch (e) {}
      // (c) 헤더 우클릭 컬럼 표시/숨김 메뉴 부착 (전 그리드 공통)
      try { initColumnContextMenu(gridKey); } catch (e) {}
      if (typeof userOnGridReady === 'function') { try { userOnGridReady(params); } catch(e){} }
    };

    gridOptions.onPaginationChanged = (params) => {
      if (options.syncToolbar) {
        try { updateToolbarPagination(gridKey); } catch (e) {}
      }
      if (typeof userOnPaginationChanged === 'function') { try { userOnPaginationChanged(params); } catch(e){} }
    };

    // 컬럼 이동/리사이즈/표시 상태 저장 (영속화) — 우클릭 메뉴와 짝을 이뤄야 재방문 시 유지됨
    const saveColState = () => {
      const api = gridInstances[gridKey];
      if (!api) return;
      try {
        const colState = api.getColumnState();
        localStorage.setItem(`grid-col-${gridKey}`, JSON.stringify(colState));
      } catch (e) {}
    };
    gridOptions.onColumnMoved = saveColState;
    gridOptions.onColumnVisible = saveColState;
    gridOptions.onColumnResized = (e) => { if (e && e.finished) saveColState(); };

    gridInstances[gridKey] = agGrid.createGrid(gridEl, gridOptions);
    gridEl.__agGrid = gridInstances[gridKey]; // 직접 참조용 (체크박스 선택 등)
    // 카드 우하단 리사이즈 핸들 자동 부착 (.grid-resize-wrap으로 그리드+툴바 래핑)
    if (options.makeResizable) {
      // 그리드 DOM 렌더가 끝난 다음 프레임에 적용해야 다음 형제(toolbar) 이동이 안전
      setTimeout(() => { try { makeGridResizable(gridKey); } catch (e) {} }, 0);
    }
    return gridInstances[gridKey];
  } catch (err) {
    console.error('AG Grid 초기화 실패:', gridKey, err);
    gridEl.innerHTML = `<div class="error-state" style="padding:20px;">그리드 초기화 실패: ${err.message}</div>`;
    return null;
  }
}

// ── 역할 전환 (프로토타입 전용) — 5권한 대표 사용자 ──
function getRoleSwitchOptions() {
  // username 기준으로 안정적으로 조회 (USERS 인덱스 변동에 영향받지 않음)
  const pick = (uname, label) => {
    const u = USERS.find(x => x.username === uname);
    return u ? { user: u, label, desc: u.roles[0] } : null;
  };
  return [
    pick('sys-admin', '시스템 관리자'),
    pick('sys-ops1', '시스템 운영자'),
    pick('sh-admin', '테넌트 관리자 (신한카드)'),
    pick('sh-approver', '테넌트 승인자 (신한카드)'),
    pick('sh-user1', '테넌트 사용자 (신한카드)'),
  ].filter(Boolean);
}

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

  // 헤더
  const head = document.createElement('div');
  head.className = 'role-switch-head';
  head.textContent = '대표 5권한 빠른 전환';
  menu.appendChild(head);

  getRoleSwitchOptions().forEach(opt => {
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
      try { localStorage.setItem('ccr_currentUserId', String(opt.user.id)); } catch (e) {}
      // 인증 상태 보장 (역할 전환은 곧 로그인 갈음)
      isAuthenticated = true;
      try { localStorage.setItem('ccr_authenticated', 'true'); } catch (e) {}
      menu.remove();
      destroyAllGrids();
      // shell 강제 재초기화
      try {
        document.body.dataset.gnbVariant = '';
        document.body.dataset.tenantSlug = '';
        document.body.dataset.contractId = '';
      } catch (e) {}
      // 사용자별 기본 경로로 이동
      window.location.hash = defaultRouteFor(opt.user);
      showToast('info', `${opt.user.name} 님 (${getRoleLabel(opt.desc)})으로 전환했습니다`);
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

// ── 감사 로그 기록 헬퍼 ──
// 모든 사용자 활동(로그인/로그아웃/조회/다운로드/CRUD)을 AUDIT_LOGS에 기록
function logAudit(action, target, conditions = '') {
  try {
    const user = CURRENT_USER;
    const nextId = (AUDIT_LOGS[0]?.id || 0) + 1;
    AUDIT_LOGS.unshift({
      id: nextId,
      timestamp: new Date().toISOString(),
      username: user.username,
      name: user.name,
      role: user.roles[0],
      action,
      target,
      conditions: conditions || '',
      ipAddress: '10.0.0.1',
      userAgent: navigator.userAgent.slice(0, 120),
    });
  } catch (err) {
    console.warn('감사 로그 기록 실패:', err);
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

// ══════════════════════════════════════════
// v2 라우터 — 3트랙 해시 라우팅
//   - 시스템:   #/admin/login | #/admin/*
//   - 테넌트관리: #/t/{slug}/login | #/t/{slug}/admin/*
//   - 테넌트사용: #/t/{slug}/c/{contractId}/*
// ══════════════════════════════════════════

// 권한 매트릭스 — 경로별 허용 역할 (component-spec §1.1, feature-decomposition §3)
const ROUTE_PERMISSIONS = {
  // 시스템 트랙
  'admin-home':       ['ROLE_SYS_ADMIN', 'ROLE_SYS_OPS'],
  'admin-dashboard':  ['ROLE_SYS_ADMIN', 'ROLE_SYS_OPS'], // 조건 4 반영
  'admin-users':      ['ROLE_SYS_ADMIN'],
  'admin-tenants':    ['ROLE_SYS_OPS'],
  // 계약 관리 — 시스템 운영자 전용
  'admin-contracts':      ['ROLE_SYS_OPS', 'ROLE_SYS_ADMIN'],
  // 클라우드 계정 관리 — 시스템 운영자 전용
  'admin-cloud-accounts': ['ROLE_SYS_OPS', 'ROLE_SYS_ADMIN'],
  // CUR/운영 도구 — 시스템 운영자 전용 (ADMIN은 사용자/테넌트 관리에 집중)
  'admin-uploads':    ['ROLE_SYS_OPS'],
  'admin-aliases':    ['ROLE_SYS_OPS'],
  'admin-cur-cols':   ['ROLE_SYS_OPS'],
  'admin-audit':      ['ROLE_SYS_ADMIN'],
  // 테넌트 관리 트랙 — 계약 관리는 SYS_OPS가 편집, TENANT_ADMIN은 조회 전용
  'tenant-admin-home':      ['ROLE_TENANT_ADMIN'],
  'tenant-admin-users':     ['ROLE_TENANT_ADMIN'],
  'tenant-admin-contracts': ['ROLE_TENANT_ADMIN'],
  'tenant-admin-scopes':    ['ROLE_TENANT_ADMIN'],
  // 테넌트 사용자 트랙 (계약 컨텍스트) — SYS_OPS는 모든 테넌트 대시보드/리포트/구독 조회 가능
  'tenant-dashboard':   ['ROLE_TENANT_USER', 'ROLE_TENANT_ADMIN', 'ROLE_SYS_OPS'],
  'tenant-reports':     ['ROLE_TENANT_USER', 'ROLE_TENANT_ADMIN', 'ROLE_SYS_OPS'],
  'tenant-subscribers': ['ROLE_TENANT_ADMIN', 'ROLE_TENANT_USER', 'ROLE_SYS_OPS'],
  // 승인자
  'tenant-approvals':   ['ROLE_TENANT_APPROVER', 'ROLE_TENANT_ADMIN'],
};

// 현재 라우트 정보 (variant 결정 + 권한 체크용)
let currentRouteInfo = { kind: null, tenantSlug: null, contractId: null, hash: '' };

function navigate(hash) {
  window.location.hash = hash;
}

// 해시 파싱 → routeInfo
function parseRoute(hash) {
  // 기본 진입점 보정
  if (!hash || hash === '#' || hash === '#/') return { kind: 'admin-login', hash };

  // 테넌트 트랙
  let m;
  if ((m = hash.match(/^#\/t\/([^/]+)\/login$/))) {
    return { kind: 'tenant-login', tenantSlug: m[1], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/admin$/))) {
    return { kind: 'tenant-admin-home', tenantSlug: m[1], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/admin\/users$/))) {
    return { kind: 'tenant-admin-users', tenantSlug: m[1], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/admin\/contracts$/))) {
    return { kind: 'tenant-admin-contracts', tenantSlug: m[1], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/admin\/scopes$/))) {
    return { kind: 'tenant-admin-scopes', tenantSlug: m[1], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/approvals$/))) {
    return { kind: 'tenant-approvals', tenantSlug: m[1], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/c\/([^/]+)\/dashboard$/))) {
    return { kind: 'tenant-dashboard', tenantSlug: m[1], contractId: m[2], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/c\/([^/]+)\/reports$/))) {
    return { kind: 'tenant-reports', tenantSlug: m[1], contractId: m[2], hash };
  }
  if ((m = hash.match(/^#\/t\/([^/]+)\/c\/([^/]+)\/subscribers$/))) {
    return { kind: 'tenant-subscribers', tenantSlug: m[1], contractId: m[2], hash };
  }

  // 시스템 트랙
  if (hash === '#/admin/login') return { kind: 'admin-login', hash };
  if (hash === '#/admin') return { kind: 'admin-home', hash };
  if (hash === '#/admin/dashboard') return { kind: 'admin-dashboard', hash };
  if (hash === '#/admin/users') return { kind: 'admin-users', hash };
  if (hash === '#/admin/tenants') return { kind: 'admin-tenants', hash };
  if (hash === '#/admin/contracts') return { kind: 'admin-contracts', hash };
  if (hash === '#/admin/cloud-accounts') return { kind: 'admin-cloud-accounts', hash };
  if (hash === '#/admin/ops/uploads') return { kind: 'admin-uploads', hash };
  if (hash === '#/admin/ops/aliases') return { kind: 'admin-aliases', hash };
  if (hash === '#/admin/ops/cur-columns') return { kind: 'admin-cur-cols', hash };
  if (hash === '#/admin/audit-logs') return { kind: 'admin-audit', hash };

  // v1 호환 — 구 경로를 v2로 자동 보정 (TENANT_USER가 v1 경로 직접 입력 시)
  if (hash === '#/dashboard' || hash === '#/reports' || hash === '#/subscriptions') {
    return { kind: 'redirect-v1', from: hash, hash };
  }
  if (hash === '#/upload') return { kind: 'redirect-uploads', hash };
  if (hash === '#/settings/users') return { kind: 'redirect-users', hash };
  if (hash === '#/settings/cur-columns') return { kind: 'redirect-cur', hash };
  if (hash === '#/settings/audit-logs') return { kind: 'redirect-audit', hash };
  if (hash === '#/login') return { kind: 'admin-login', hash };

  return { kind: 'not-found', hash };
}

// variant 결정 (현재 사용자 + routeInfo)
function decideVariant(routeInfo, user) {
  if (!routeInfo) return 'system';
  if (routeInfo.kind && routeInfo.kind.startsWith('admin-')) return 'system';
  if (routeInfo.kind && routeInfo.kind.startsWith('tenant-admin')) return 'tenant-admin';
  if (routeInfo.kind === 'tenant-approvals') return 'tenant-admin';
  if (routeInfo.kind && routeInfo.kind.startsWith('tenant-')) return 'tenant-user';
  return 'system';
}

// 사용자가 routeInfo에 접근 가능한지 확인
function checkRouteAccess(routeInfo, user) {
  if (!user || !user.roles || !user.roles.length) return { ok: false, reason: 'NO_USER' };
  const role = user.roles[0];
  const permissions = ROUTE_PERMISSIONS[routeInfo.kind];
  if (!permissions) return { ok: true }; // 로그인 페이지 등은 무제한
  if (!permissions.includes(role)) return { ok: false, reason: 'NO_PERMISSION' };

  // 테넌트 격리 체크 — 테넌트 트랙은 사용자의 tenantSlug와 일치해야
  if (routeInfo.tenantSlug && user.tenantId) {
    const tenant = TENANTS.find(t => t.id === user.tenantId);
    if (!tenant || tenant.slug !== routeInfo.tenantSlug) {
      return { ok: false, reason: 'TENANT_MISMATCH' };
    }
  }
  // 시스템 사용자가 테넌트 경로 직접 진입하는 경우 차단 (단, SYS_OPS는 모든 테넌트 조회 허용)
  if (routeInfo.tenantSlug && !user.tenantId) {
    if (role !== 'ROLE_SYS_OPS') return { ok: false, reason: 'SYSTEM_USER_TENANT' };
  }
  // 테넌트 사용자가 시스템 경로 직접 진입하는 경우 차단
  if (!routeInfo.tenantSlug && routeInfo.kind && routeInfo.kind.startsWith('admin-') && user.tenantId) {
    return { ok: false, reason: 'TENANT_USER_SYSTEM' };
  }
  return { ok: true };
}

// 사용자별 기본 진입 경로 (역할 기반)
function defaultRouteFor(user) {
  if (!user || !user.roles || !user.roles.length) return '#/admin/login';
  const role = user.roles[0];
  if (role === 'ROLE_SYS_ADMIN') return '#/admin';
  if (role === 'ROLE_SYS_OPS') return '#/admin';
  if (!user.tenantId) return '#/admin/login';
  const tenant = TENANTS.find(t => t.id === user.tenantId);
  if (!tenant) return '#/admin/login';
  if (role === 'ROLE_TENANT_ADMIN') return `#/t/${tenant.slug}/admin`;
  if (role === 'ROLE_TENANT_APPROVER') return `#/t/${tenant.slug}/approvals`;
  if (role === 'ROLE_TENANT_USER') {
    // 권한이 있는 첫 SubAccount의 contract로 진입
    const scopes = TENANT_USER_SCOPES.filter(s => s.userId === user.id);
    let contractId = null;
    if (scopes.length) {
      const firstSub = CLOUD_SUB_ACCOUNTS.find(s => s.id === scopes[0].subAccountId);
      contractId = firstSub ? firstSub.contractId : null;
    }
    // 폴백: 테넌트 첫 ACTIVE 계약
    if (!contractId) {
      const firstContract = CONTRACTS.find(c => c.tenantId === user.tenantId && c.status === 'ACTIVE');
      contractId = firstContract ? firstContract.id : null;
    }
    if (contractId) {
      // localStorage 기반 마지막 선택 계약 우선
      const saved = parseInt(localStorage.getItem('ccr_currentContractId') || '0', 10);
      if (saved && CONTRACTS.find(c => c.id === saved && c.tenantId === user.tenantId)) {
        contractId = saved;
      }
      return `#/t/${tenant.slug}/c/${contractId}/dashboard`;
    }
  }
  return '#/admin/login';
}

// 라우트 → 렌더러 매핑
const ROUTE_RENDERERS = {
  // 로그인
  'admin-login': () => renderLoginPage('system'),
  'tenant-login': (info) => renderLoginPage('tenant', info.tenantSlug),
  // 시스템
  'admin-home': renderConsoleHome,
  'admin-dashboard': renderSystemDashboard,
  'admin-users': renderUserManagement,
  'admin-tenants': renderTenantsAdmin,
  'admin-contracts': renderContractsSystem,
  'admin-cloud-accounts': renderCloudAccountsSystem,
  'admin-uploads': renderUpload,
  'admin-aliases': renderColumnAliases,
  'admin-cur-cols': renderCurColumns,
  'admin-audit': renderAuditLogs,
  // 테넌트 관리
  'tenant-admin-home': renderTenantConsoleHome,
  'tenant-admin-users': renderUserManagement,
  'tenant-admin-contracts': renderContractsAdmin,
  'tenant-admin-scopes': renderScopesAdmin,
  // 테넌트 사용
  'tenant-dashboard': renderDashboard,
  'tenant-reports': renderReports,
  'tenant-subscribers': renderSubscriptions,
  // 승인자
  'tenant-approvals': renderApprovalsPlaceholder,
};

function handleRoute() {
  let hash = window.location.hash || '';
  const routeInfo = parseRoute(hash);
  currentRouteInfo = routeInfo;

  // v1 호환 리다이렉트
  if (routeInfo.kind === 'redirect-v1' || routeInfo.kind === 'redirect-uploads' ||
      routeInfo.kind === 'redirect-users' || routeInfo.kind === 'redirect-cur' ||
      routeInfo.kind === 'redirect-audit') {
    const target = defaultRouteFor(CURRENT_USER);
    if (target && target !== hash) { window.location.hash = target; return; }
  }

  // 미인증 처리
  if (!isAuthenticated) {
    // 로그인 페이지는 통과
    if (routeInfo.kind === 'admin-login' || routeInfo.kind === 'tenant-login') {
      // 로그인 페이지는 GNB 없이 단독 렌더
      const renderer = ROUTE_RENDERERS[routeInfo.kind];
      if (renderer) renderer(routeInfo);
      return;
    }
    // 그 외는 시스템 로그인으로 보냄
    window.location.hash = '#/admin/login';
    return;
  }

  // 인증된 상태에서 로그인 경로 접근 → 기본 진입
  if (routeInfo.kind === 'admin-login' || routeInfo.kind === 'tenant-login') {
    window.location.hash = defaultRouteFor(CURRENT_USER);
    return;
  }

  // 빈 hash → 사용자 기본 진입
  if (!hash || routeInfo.kind === 'not-found' && hash === '') {
    window.location.hash = defaultRouteFor(CURRENT_USER);
    return;
  }

  // 알 수 없는 경로 → 기본 진입
  if (routeInfo.kind === 'not-found') {
    window.location.hash = defaultRouteFor(CURRENT_USER);
    return;
  }

  // 권한 체크 (RoleGuard)
  const access = checkRouteAccess(routeInfo, CURRENT_USER);
  if (!access.ok) {
    renderAccessDenied(access.reason, routeInfo);
    return;
  }

  // 테넌트 사용자 트랙: contractId 검증 + localStorage 저장
  if (routeInfo.contractId && routeInfo.contractId !== 'all') {
    const cid = parseInt(routeInfo.contractId, 10);
    const contract = CONTRACTS.find(c => c.id === cid);
    if (!contract || (CURRENT_USER.tenantId && contract.tenantId !== CURRENT_USER.tenantId)) {
      renderAccessDenied('CONTRACT_MISMATCH', routeInfo);
      return;
    }
    try { localStorage.setItem('ccr_currentContractId', String(cid)); } catch (e) {}
    CURRENT_CONTEXT.contractId = cid;
  } else if (routeInfo.contractId === 'all') {
    CURRENT_CONTEXT.contractId = 'all';
  }

  // CURRENT_CONTEXT 업데이트 (variant + tenantSlug)
  CURRENT_CONTEXT.variant = decideVariant(routeInfo, CURRENT_USER);
  CURRENT_CONTEXT.tenantSlug = routeInfo.tenantSlug || null;
  CURRENT_CONTEXT.tenantId = routeInfo.tenantSlug
    ? (TENANTS.find(t => t.slug === routeInfo.tenantSlug)?.id || null)
    : null;

  // 앱 셸 (재)초기화 (로그인 → 앱 진입 또는 variant 전환)
  const needsShell = !document.getElementById('app-content') ||
                     document.body.dataset.gnbVariant !== CURRENT_CONTEXT.variant ||
                     document.body.dataset.tenantSlug !== (CURRENT_CONTEXT.tenantSlug || '') ||
                     document.body.dataset.contractId !== String(CURRENT_CONTEXT.contractId || '');
  if (needsShell) {
    initAppShell();
    document.body.dataset.gnbVariant = CURRENT_CONTEXT.variant;
    document.body.dataset.tenantSlug = CURRENT_CONTEXT.tenantSlug || '';
    document.body.dataset.contractId = String(CURRENT_CONTEXT.contractId || '');
  }

  const content = document.getElementById('app-content');
  const renderer = ROUTE_RENDERERS[routeInfo.kind];

  // 페이지 전환 시 기존 그리드 정리
  destroyAllGrids();

  // GNB 활성 메뉴 표시 (data-route 매칭)
  document.querySelectorAll('.gnb-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.route === hash);
  });
  document.querySelectorAll('.gnb-dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === hash);
  });
  document.querySelectorAll('.gnb-tab-group').forEach(group => {
    const hasActive = group.querySelector('.gnb-dropdown-item.active');
    const btn = group.querySelector('.gnb-tab');
    if (btn) btn.classList.toggle('active', !!hasActive);
  });
  closeDropdowns();

  if (renderer && content) {
    try {
      renderer(content, routeInfo);
    } catch (err) {
      console.error('렌더링 에러:', err);
      content.innerHTML = `<div class="error-state"><h2>화면을 불러오지 못했어요</h2><p>${err.message}</p></div>`;
    }
  }
}

// 접근 거부 화면
function renderAccessDenied(reason, routeInfo) {
  if (!document.getElementById('app-content')) initAppShell();
  const content = document.getElementById('app-content');
  if (!content) return;
  const reasonText = {
    NO_USER: '로그인이 필요합니다.',
    NO_PERMISSION: '이 화면에 접근할 권한이 없습니다.',
    TENANT_MISMATCH: '다른 테넌트 자원에 접근할 수 없습니다.',
    SYSTEM_USER_TENANT: '시스템 사용자는 테넌트 화면에 직접 접근할 수 없습니다.',
    TENANT_USER_SYSTEM: '테넌트 사용자는 시스템 화면에 접근할 수 없습니다.',
    CONTRACT_MISMATCH: '존재하지 않거나 권한이 없는 계약입니다.',
  }[reason] || '접근이 거부되었습니다.';
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">접근 권한이 없습니다</h1>
      <p class="page-desc">${reasonText}</p>
    </div>
    <div class="section-card">
      <p style="margin-bottom:16px;color:var(--sh-dark-secondary);">사유 코드: <code>${reason}</code> · 요청 경로: <code>${routeInfo.hash || '-'}</code></p>
      <button class="btn btn-primary" onclick="navigate(defaultRouteFor(CURRENT_USER))">홈으로 이동</button>
    </div>
  `;
  logAudit('접근 거부', `${reason}`, `요청 경로: ${routeInfo.hash}`);
}

// ── GNB 렌더링 ──
// ── GNB 3변형 디스패처 ──
// CURRENT_CONTEXT.variant 기반으로 system / tenant-admin / tenant-user 변형 선택
function renderGNB() {
  const variant = (CURRENT_CONTEXT && CURRENT_CONTEXT.variant) || 'system';
  if (variant === 'tenant-admin') return renderGnbTenantAdmin();
  if (variant === 'tenant-user') return renderGnbTenantUser();
  return renderGnbSystem();
}

// ── 공통: GNB 우측 사용자/액션 영역 ──
function renderGnbUserBlock(user) {
  const initials = (user && user.name) ? user.name.charAt(0) : '·';
  const roleLabel = getRoleLabel(user && user.roles && user.roles[0]);
  const dept = user && user.department || '';
  return `
    <button class="btn-role-switch" onclick="switchRole()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="m22 3.5-5 5"></path><path d="m17 3.5 5 5"></path></svg>
      역할 전환
    </button>
    <button class="gnb-icon-btn" title="알림">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
      <span class="gnb-badge"></span>
    </button>
    <div class="gnb-user" id="gnb-user-btn" onclick="toggleUserDropdown(event)">
      <div class="gnb-user-text">
        <span class="gnb-user-name">${user ? user.name + ' 님' : ''}</span>
        <span class="gnb-user-role">${roleLabel}</span>
      </div>
      <div class="gnb-avatar">${initials}</div>
      <div class="user-dropdown" id="user-dropdown" style="display:none;">
        <div class="user-dropdown-header">
          <div class="user-dropdown-name">${user ? user.name : ''}</div>
          <div class="user-dropdown-dept">${dept}</div>
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
  `;
}

// ── 테넌트 셀렉터 (SYS_OPS용 — 테넌트 전환) ──
function renderTenantSelector(currentSlug) {
  const placeholder = currentSlug ? '' : '<option value="" selected disabled>테넌트 선택</option>';
  const opts = TENANTS.map(t => `<option value="${t.slug}" ${t.slug === currentSlug ? 'selected' : ''}>${t.name}</option>`).join('');
  return `
    <div class="gnb-tenant-selector">
      <label class="gnb-contract-label">테넌트</label>
      <select onchange="onChangeTenant(event)" aria-label="테넌트 선택">
        ${placeholder}${opts}
      </select>
    </div>
  `;
}

function onChangeTenant(e) {
  const slug = e.target.value;
  const tenant = TENANTS.find(t => t.slug === slug);
  if (!tenant) return;
  // 해당 테넌트의 첫 ACTIVE 계약으로 이동
  const contract = CONTRACTS.find(c => c.tenantId === tenant.id && c.status === 'ACTIVE')
                || CONTRACTS.find(c => c.tenantId === tenant.id);
  if (!contract) { showToast('error', `${tenant.name}에 등록된 계약이 없습니다`); return; }
  try { localStorage.setItem('ccr_currentContractId', String(contract.id)); } catch (err) {}
  window.location.hash = `#/t/${slug}/c/${contract.id}/dashboard`;
}

// ── 컨트랙트 셀렉터 (테넌트 사용자 GNB 전용) ──
// localStorage에 ccr_currentContractId 저장. 변경 시 현재 화면을 새 contractId로 다시 로드.
function renderContractSelector() {
  const ctx = CURRENT_CONTEXT;
  if (!ctx.tenantId) return '';
  const contracts = CONTRACTS.filter(c => c.tenantId === ctx.tenantId);
  if (!contracts.length) return '';
  const slug = ctx.tenantSlug;
  const currentId = ctx.contractId;
  const opts = contracts.map(c => `<option value="${c.id}" ${String(c.id) === String(currentId) ? 'selected' : ''}>${c.code} · ${c.name} (${c.currency})</option>`).join('');
  // 다중 통화 배지 (연계 계약 통화 종류 > 1)
  const currencies = Array.from(new Set(contracts.map(c => c.currency)));
  const mixedBadge = currencies.length > 1
    ? `<span class="gnb-mixed-currency-badge" title="${currencies.join(', ')} 다중 통화 계약을 보유하고 있습니다">혼합 통화</span>`
    : '';
  return `
    <div class="gnb-contract-selector">
      <label class="gnb-contract-label">계약</label>
      <select onchange="onChangeContract(event, '${slug}')" aria-label="계약 선택">
        ${opts}
      </select>
      ${mixedBadge}
      ${renderMaskedSumIndicator()}
    </div>
  `;
}

// ── 마스킹 합계 인디케이터 (USER가 부분 권한일 때 노출) ──
function renderMaskedSumIndicator() {
  const user = CURRENT_USER;
  if (!user || !user.id) return '';
  const role = user.roles && user.roles[0];
  if (role !== 'ROLE_TENANT_USER') return '';
  const ctx = CURRENT_CONTEXT;
  if (!ctx.contractId) return '';
  const allSubs = CLOUD_SUB_ACCOUNTS.filter(s => s.contractId === Number(ctx.contractId));
  const userSubs = getUserScopeSubAccounts(user.id);
  const visible = allSubs.filter(s => userSubs.includes(s.id)).length;
  const total = allSubs.length;
  if (!total) return '';
  if (visible === total) return `<span class="gnb-masked-sum full" title="전체 SubAccount 권한 보유">전체 ${total}개 가시</span>`;
  return `<span class="gnb-masked-sum partial" title="일부 SubAccount는 권한 부족으로 마스킹됩니다">가시 ${visible} / 전체 ${total} (${total - visible}개 마스킹)</span>`;
}

function onChangeContract(e, slug) {
  const newId = e.target.value;
  try { localStorage.setItem('ccr_currentContractId', String(newId)); } catch (err) {}
  // 현재 화면 종류 유지하며 contractId만 교체 (dashboard/reports/subscribers)
  const hash = window.location.hash;
  const m = hash.match(/^#\/t\/[^/]+\/c\/[^/]+\/(.+)$/);
  const tail = (m && m[1]) || 'dashboard';
  window.location.hash = `#/t/${slug}/c/${newId}/${tail}`;
}

// ── 변형 1: 시스템 콘솔 GNB ──
function renderGnbSystem() {
  const user = CURRENT_USER;
  const role = user && user.roles && user.roles[0];
  const isAdmin = role === 'ROLE_SYS_ADMIN';
  const isOps = role === 'ROLE_SYS_OPS'; // 운영 도구(업로드/별칭/CUR 컬럼)는 OPS 전용
  return `
    <nav class="gnb gnb-system">
      <div class="gnb-row1">
        <div class="gnb-logo" onclick="navigate('#/admin')">
          <div class="gnb-logo-text">
            <span class="gnb-logo-main">CLOUD COST REPORTING</span>
          </div>
        </div>
        <div class="gnb-divider"></div>
        <span class="gnb-tenant-name" style="color:#fff;">시스템</span>
        <div class="gnb-spacer"></div>
        <div class="gnb-actions">${renderGnbUserBlock(user)}</div>
      </div>
      <div class="gnb-row2">
        <div class="gnb-tabs">
          <a class="gnb-tab" data-route="#/admin" onclick="navigate('#/admin');return false;" href="#/admin">홈</a>
          <a class="gnb-tab" data-route="#/admin/dashboard" onclick="navigate('#/admin/dashboard');return false;" href="#/admin/dashboard">대시보드</a>
          ${isOps ? `<a class="gnb-tab" data-route="#/admin/tenants" onclick="navigate('#/admin/tenants');return false;" href="#/admin/tenants">테넌트 관리</a>` : ''}
          ${isOps ? `<a class="gnb-tab" data-route="#/admin/contracts" onclick="navigate('#/admin/contracts');return false;" href="#/admin/contracts">계약 관리</a>` : ''}
          ${isOps ? `<a class="gnb-tab" data-route="#/admin/cloud-accounts" onclick="navigate('#/admin/cloud-accounts');return false;" href="#/admin/cloud-accounts">계정 관리</a>` : ''}
          ${isAdmin ? `<a class="gnb-tab" data-route="#/admin/users" onclick="navigate('#/admin/users');return false;" href="#/admin/users">사용자 관리</a>` : ''}
          ${isOps ? `<div class="gnb-tab-group">
            <button class="gnb-tab" onclick="toggleDropdown('menu-sys-ops')">운영 도구
              <svg class="gnb-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
            <div class="gnb-dropdown" id="menu-sys-ops">
              <div class="gnb-dropdown-inner">
                <a class="gnb-dropdown-item" data-route="#/admin/ops/uploads" onclick="navigate('#/admin/ops/uploads');return false;" href="#/admin/ops/uploads">업로드</a>
                <a class="gnb-dropdown-item" data-route="#/admin/ops/aliases" onclick="navigate('#/admin/ops/aliases');return false;" href="#/admin/ops/aliases">컬럼 별칭(Alias)</a>
                <a class="gnb-dropdown-item" data-route="#/admin/ops/cur-columns" onclick="navigate('#/admin/ops/cur-columns');return false;" href="#/admin/ops/cur-columns">CUR 컬럼 관리</a>
              </div>
            </div>
          </div>` : ''}
          ${isAdmin ? `<a class="gnb-tab" data-route="#/admin/audit-logs" onclick="navigate('#/admin/audit-logs');return false;" href="#/admin/audit-logs">감사 로그</a>` : ''}
        </div>
        ${isOps ? `<div class="gnb-row2-right">${renderTenantSelector(null)}</div>` : ''}
      </div>
    </nav>
  `;
}

// ── 변형 2: 테넌트 관리 GNB ──
function renderGnbTenantAdmin() {
  const user = CURRENT_USER;
  const ctx = CURRENT_CONTEXT;
  const slug = ctx.tenantSlug || (user && user.tenantId && (TENANTS.find(t => t.id === user.tenantId) || {}).slug);
  const tenant = TENANTS.find(t => t.slug === slug);
  const tenantName = tenant ? tenant.name : '조직';
  const isApprover = user && user.roles && user.roles[0] === 'ROLE_TENANT_APPROVER';
  return `
    <nav class="gnb gnb-tenant-admin">
      <div class="gnb-row1">
        <div class="gnb-logo" onclick="navigate('#/t/${slug}/admin')">
          <div class="gnb-logo-text">
            <span class="gnb-logo-main">CLOUD COST REPORTING</span>
          </div>
        </div>
        <div class="gnb-divider"></div>
        <span class="gnb-tenant-name">${tenantName}</span>
        <div class="gnb-spacer"></div>
        <div class="gnb-actions">${renderGnbUserBlock(user)}</div>
      </div>
      <div class="gnb-row2">
        <div class="gnb-tabs">
          ${!isApprover ? `<a class="gnb-tab" data-route="#/t/${slug}/admin" onclick="navigate('#/t/${slug}/admin');return false;" href="#/t/${slug}/admin">관리 홈</a>` : ''}
          ${!isApprover ? `<a class="gnb-tab" data-route="#/t/${slug}/admin/contracts" onclick="navigate('#/t/${slug}/admin/contracts');return false;" href="#/t/${slug}/admin/contracts">계약 관리</a>` : ''}
          ${!isApprover ? `<a class="gnb-tab" data-route="#/t/${slug}/admin/users" onclick="navigate('#/t/${slug}/admin/users');return false;" href="#/t/${slug}/admin/users">사용자 관리</a>` : ''}
          ${!isApprover ? `<a class="gnb-tab" data-route="#/t/${slug}/admin/scopes" onclick="navigate('#/t/${slug}/admin/scopes');return false;" href="#/t/${slug}/admin/scopes">권한 위임(Scope)</a>` : ''}
          <a class="gnb-tab" data-route="#/t/${slug}/approvals" onclick="navigate('#/t/${slug}/approvals');return false;" href="#/t/${slug}/approvals">승인함</a>
        </div>
      </div>
    </nav>
  `;
}

// ── 변형 3: 테넌트 사용자 GNB (계약 컨텍스트) ──
// 레이아웃: 1행=로고+테넌트명 | 사용자블록, 2행=탭메뉴(좌) | 계약셀렉터+마스킹(우)
function renderGnbTenantUser() {
  const user = CURRENT_USER;
  const ctx = CURRENT_CONTEXT;
  const slug = ctx.tenantSlug;
  const cid = ctx.contractId;
  const tenant = TENANTS.find(t => t.slug === slug);
  const tenantName = tenant ? tenant.name : '조직';
  const base = `#/t/${slug}/c/${cid}`;
  const isSysOps = user && user.roles && user.roles[0] === 'ROLE_SYS_OPS';
  return `
    <nav class="gnb gnb-tenant-user">
      <div class="gnb-row1">
        <div class="gnb-logo" onclick="navigate('${base}/dashboard')">
          <div class="gnb-logo-text">
            <span class="gnb-logo-main">CLOUD COST REPORTING</span>
          </div>
        </div>
        <div class="gnb-divider"></div>
        ${isSysOps ? renderTenantSelector(slug) : `<span class="gnb-tenant-name">${tenantName}</span>`}
        <div class="gnb-spacer"></div>
        <div class="gnb-actions">${renderGnbUserBlock(user)}</div>
      </div>
      <div class="gnb-row2">
        <div class="gnb-tabs">
          <a class="gnb-tab" data-route="${base}/dashboard" onclick="navigate('${base}/dashboard');return false;" href="${base}/dashboard">대시보드</a>
          <a class="gnb-tab" data-route="${base}/reports" onclick="navigate('${base}/reports');return false;" href="${base}/reports">리포트</a>
          <a class="gnb-tab" data-route="${base}/subscribers" onclick="navigate('${base}/subscribers');return false;" href="${base}/subscribers">구독 관리</a>
          ${isSysOps ? `<a class="gnb-tab" onclick="navigate('#/admin');return false;" href="#/admin" style="margin-left:auto;opacity:0.7;font-size:12px;">← 시스템 콘솔</a>` : ''}
        </div>
        <div class="gnb-row2-right">${renderContractSelector()}</div>
      </div>
    </nav>
  `;
}

// ── (구) renderGNB 본체는 v1 호환 보존 — 호출되지 않음 ──
function renderGnbLegacy() {
  const user = CURRENT_USER;
  const initials = user.name.charAt(0);
  const roleLabel = ROLE_LABELS[user.roles[0]] || user.roles[0];

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
              <button class="user-dropdown-item" onclick="navigate('#/settings/users');closeSettingsMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                사용자 관리
              </button>
              <button class="user-dropdown-item" onclick="navigate('#/settings/cur-columns');closeSettingsMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>
                CUR 컬럼 관리
              </button>
              <button class="user-dropdown-item" onclick="navigate('#/settings/audit-logs');closeSettingsMenu();">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg>
                감사 로그
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
                <a class="gnb-dropdown-item" data-route="#/settings/users" onclick="navigate('#/settings/users');return false;" href="#/settings/users">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  사용자 관리
                </a>
                <a class="gnb-dropdown-item" data-route="#/settings/cur-columns" onclick="navigate('#/settings/cur-columns');return false;" href="#/settings/cur-columns">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>
                  CUR 컬럼 관리
                </a>
                <a class="gnb-dropdown-item" data-route="#/settings/audit-logs" onclick="navigate('#/settings/audit-logs');return false;" href="#/settings/audit-logs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg>
                  감사 로그
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
// 신규 v2 화면 렌더러
// ══════════════════════════════════════════

// ── 시스템 콘솔 홈 (#/admin) ──
// 시스템 사용자 진입 첫 화면. 핵심 KPI + 빠른 진입 + 대기 작업 카드
function renderConsoleHome(el) {
  const user = CURRENT_USER;
  const role = user.roles[0];
  logAudit(AUDIT_ACTIONS.VIEW, '시스템 콘솔 홈 조회', `사용자: ${user.username}`);
  const tenantCount = TENANTS.length;
  const userCount = USERS.length;
  const contractCount = CONTRACTS.length;
  const activeContracts = CONTRACTS.filter(c => c.status === 'ACTIVE').length;
  const pwResetPending = USERS.filter(u => u.pwResetRequested).length;
  const errorBatches = UPLOAD_BATCHES.filter(b => b.status === 'ERROR').length;

  // 카드 노출 정책: 관리/현황은 ADMIN, 운영 작업은 OPS
  const cards = [
    { title: '테넌트', value: tenantCount, sub: `${TENANTS.filter(t => t.status === 'ACTIVE').length}개 활성`, hash: '#/admin/tenants', show: role === 'ROLE_SYS_ADMIN' },
    { title: '사용자', value: userCount, sub: `시스템 ${USERS.filter(u => !u.tenantId).length} · 테넌트 ${USERS.filter(u => u.tenantId).length}`, hash: '#/admin/users', show: role === 'ROLE_SYS_ADMIN' },
    { title: '계약', value: `${activeContracts}/${contractCount}`, sub: '활성 / 전체', hash: '#/admin/tenants', show: role === 'ROLE_SYS_ADMIN' },
    { title: '업로드 오류', value: errorBatches, sub: '확인 필요', hash: '#/admin/ops/uploads', show: role === 'ROLE_SYS_OPS' },
    { title: '비밀번호 초기화 요청', value: pwResetPending, sub: '대기 중', hash: '#/admin/users', show: role === 'ROLE_SYS_ADMIN' },
  ].filter(c => c.show);

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">시스템 콘솔 홈</h1>
      <p class="page-desc">${getRoleLabel(role)} · ${user.name} 님 환영합니다</p>
    </div>
    <div class="console-grid">
      ${cards.map(c => `
        <a class="console-card" href="${c.hash}" onclick="navigate('${c.hash}');return false;">
          <div class="console-card-title">${c.title}</div>
          <div class="console-card-value">${c.value}</div>
          <div class="console-card-sub">${c.sub}</div>
        </a>
      `).join('')}
    </div>
    <div class="section-card" style="margin-top:24px;">
      <h3 style="margin-top:0;">빠른 진입</h3>
      <div class="quick-links">
        <a class="btn btn-secondary" href="#/admin/dashboard" onclick="navigate('#/admin/dashboard');return false;">대시보드</a>
        ${role === 'ROLE_SYS_ADMIN' ? `<a class="btn btn-secondary" href="#/admin/tenants" onclick="navigate('#/admin/tenants');return false;">테넌트 관리</a>` : ''}
        ${role === 'ROLE_SYS_ADMIN' ? `<a class="btn btn-secondary" href="#/admin/users" onclick="navigate('#/admin/users');return false;">사용자 관리</a>` : ''}
        ${role === 'ROLE_SYS_OPS' ? `<a class="btn btn-secondary" href="#/admin/ops/uploads" onclick="navigate('#/admin/ops/uploads');return false;">업로드 처리</a>` : ''}
        ${role === 'ROLE_SYS_OPS' ? `<a class="btn btn-secondary" href="#/admin/ops/aliases" onclick="navigate('#/admin/ops/aliases');return false;">컬럼 별칭</a>` : ''}
        ${role === 'ROLE_SYS_OPS' ? `<a class="btn btn-secondary" href="#/admin/ops/cur-columns" onclick="navigate('#/admin/ops/cur-columns');return false;">CUR 컬럼</a>` : ''}
        ${role === 'ROLE_SYS_ADMIN' ? `<a class="btn btn-secondary" href="#/admin/audit-logs" onclick="navigate('#/admin/audit-logs');return false;">감사 로그</a>` : ''}
      </div>
    </div>
  `;
}

// ── 테넌트 콘솔 홈 (#/t/{slug}/admin) ──
function renderTenantConsoleHome(el) {
  const user = CURRENT_USER;
  const ctx = CURRENT_CONTEXT;
  const tenant = TENANTS.find(t => t.id === ctx.tenantId);
  if (!tenant) { el.innerHTML = '<div class="error-state">조직 정보를 찾을 수 없습니다.</div>'; return; }
  logAudit(AUDIT_ACTIONS.VIEW, '관리 홈 조회', `조직: ${tenant.slug}`);
  const tenantUsers = USERS.filter(u => u.tenantId === tenant.id);
  const tenantContracts = CONTRACTS.filter(c => c.tenantId === tenant.id);
  const activeContracts = tenantContracts.filter(c => c.status === 'ACTIVE');
  const subAccounts = CLOUD_SUB_ACCOUNTS.filter(s => s.tenantId === tenant.id);
  const pwResetPending = tenantUsers.filter(u => u.pwResetRequested).length;
  const slug = tenant.slug;

  const cards = [
    { title: '사용자', value: tenantUsers.length, sub: `활성 ${tenantUsers.filter(u => u.isActive).length}`, hash: `#/t/${slug}/admin/users` },
    { title: '계약', value: `${activeContracts.length}/${tenantContracts.length}`, sub: '활성 / 전체', hash: `#/t/${slug}/admin/contracts` },
    { title: 'SubAccount', value: subAccounts.length, sub: 'Linked Account', hash: `#/t/${slug}/admin/contracts` },
    { title: '권한 위임', value: TENANT_USER_SCOPES.filter(s => s.tenantId === tenant.id).length, sub: '범위 매핑', hash: `#/t/${slug}/admin/scopes` },
    { title: '비밀번호 초기화', value: pwResetPending, sub: '대기 중', hash: `#/t/${slug}/admin/users` },
  ];

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${tenant.name} 관리 홈</h1>
      <p class="page-desc">고객 ID: <code>${tenant.id}</code> · 유형: ${tenant.customerType}</p>
    </div>
    <div class="console-grid">
      ${cards.map(c => `
        <a class="console-card" href="${c.hash}" onclick="navigate('${c.hash}');return false;">
          <div class="console-card-title">${c.title}</div>
          <div class="console-card-value">${c.value}</div>
          <div class="console-card-sub">${c.sub}</div>
        </a>
      `).join('')}
    </div>
    <div class="section-card" style="margin-top:24px;">
      <h3 style="margin-top:0;">계약별 사용자 진입</h3>
      <p class="page-desc" style="margin-top:0;">사용자 화면을 계약 컨텍스트로 미리보기 합니다.</p>
      <div class="quick-links">
        ${activeContracts.map(c => `
          <a class="btn btn-secondary" href="#/t/${slug}/c/${c.id}/dashboard" onclick="navigate('#/t/${slug}/c/${c.id}/dashboard');return false;">${c.code} 대시보드</a>
        `).join('')}
      </div>
    </div>
  `;
}

// ── 시스템: 테넌트 관리 (#/admin/tenants) ──
function renderTenantsAdmin(el) {
  logAudit(AUDIT_ACTIONS.VIEW, '테넌트 관리 조회', `${TENANTS.length}건`);
  const rows = TENANTS.map(t => {
    const contracts = CONTRACTS.filter(c => c.tenantId === t.id);
    const users = USERS.filter(u => u.tenantId === t.id);
    return { ...t, contractCount: contracts.length, userCount: users.length };
  });
  // 카드 콘텐츠: [상단 정보바 + 등록 버튼] / [그리드] / [페이징·Excel 툴바]
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">테넌트 관리</h1>
      <p class="page-desc">전체 ${rows.length}개 테넌트 — 시스템 관리자 전용 화면입니다.</p>
    </div>
    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left">
          <span class="grid-info">전체 ${rows.length}건</span>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-primary btn-sm" onclick="openTenantModal('create')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            등록
          </button>
        </div>
      </div>
      <div id="tenants-grid" class="ag-theme-alpine" style="height:420px;width:100%;"></div>
      ${renderGridToolbar('tenants-grid', '테넌트_목록', rows.length, getSavedPageSize('tenants-grid', 20))}
    </div>
  `;
  // 고객 구분/상태 라벨 매핑 (코드 → 한국어)
  const CTYPE_LABEL = { CORP: '법인', INDIV: '개인', INTERNAL: '내부조직', GROUP: '그룹사' };
  const STATUS_LABEL = { ACTIVE: '활성', DORMANT: '휴면', SUSPENDED: '정지', TERMINATED: '해지' };
  const STATUS_VARIANT = { ACTIVE: 'success', DORMANT: 'pending', SUSPENDED: 'warning', TERMINATED: 'error' };
  const cols = [
    { headerName: '고객 ID', field: 'id', width: 130, pinned: 'left' },
    { headerName: 'Slug', field: 'slug', width: 140 },
    { headerName: '고객명', field: 'name', width: 160 },
    { headerName: '구분', field: 'customerType', width: 100, valueFormatter: (p) => CTYPE_LABEL[p.value] || p.value },
    { headerName: '상태', field: 'status', width: 90,
      cellRenderer: (p) => `<span class="status-badge ${STATUS_VARIANT[p.value] || 'pending'}">${STATUS_LABEL[p.value] || p.value}</span>` },
    { headerName: '대표자', field: 'representative', width: 100 },
    { headerName: '사업자번호', field: 'bizRegNo', width: 130 },
    { headerName: '업종', field: 'industry', width: 140 },
    { headerName: '계약', field: 'contractCount', width: 70, type: 'numericColumn' },
    { headerName: '사용자', field: 'userCount', width: 80, type: 'numericColumn' },
    { headerName: '대표 이메일', field: 'adminEmail', width: 220 },
    { headerName: '가입일', field: 'joinDate', width: 110 },
    { headerName: '해지일', field: 'terminateDate', width: 110, valueFormatter: (p) => p.value || '-' },
    { headerName: '관리', width: 160, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => `
        <button class="btn btn-sm btn-secondary" onclick="openTenantModal('edit','${p.data.id}')" style="font-size:11px;margin-right:4px;">수정</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTenant('${p.data.id}')" style="font-size:11px;">삭제</button>
      `
    },
  ];
  initAGGrid('tenants-grid', cols, rows, { defaultPageSize: 20, makeResizable: true, syncToolbar: true });
}

// ── 시스템 운영: 컬럼 별칭(Alias) 관리 (#/admin/ops/aliases) ──
// aliases-grid-v2: 체크박스 순서 고정 및 컬럼명 변경 — localStorage 캐시 키 버전업
const ALIAS_GRID_KEY = 'aliases-grid-v2';
function renderColumnAliases(el) {
  // 구버전 캐시 제거
  localStorage.removeItem('grid-col-aliases-grid');
  logAudit(AUDIT_ACTIONS.VIEW, '컬럼 별칭 조회', `${COLUMN_ALIASES.length}건`);
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">컬럼 별칭(Alias) 관리</h1>
      <p class="page-desc">업로드 파일의 컬럼 헤더를 읽어 CUR 컬럼 ID로 자동 매칭합니다 — 업로드 컬럼명과 CUR 컬럼 ID를 1:1로 등록하세요.</p>
    </div>

    <!-- 동작 안내 배너 -->
    <div style="display:flex;align-items:flex-start;gap:10px;background:#f0f5ff;border:1px solid #c7d9ff;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1a3a6b;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0046FF" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <strong>매칭 동작:</strong> 엑셀 업로드 시 파일의 <em>컬럼 헤더명</em>을 읽어 <strong>업로드 컬럼</strong> 항목과 비교 → 일치하면 해당 <strong>CUR 컬럼 ID</strong>로 자동 변환합니다.
        <span style="margin-left:8px;color:#555;">예) 업로드 파일의 "계정번호" 헤더 → <code style="background:#e8efff;padding:1px 5px;border-radius:3px;">account_id</code></span>
      </div>
    </div>

    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left" style="gap:10px;align-items:center;">
          <span class="grid-info" id="alias-count-label" style="font-size:13px;">전체 ${COLUMN_ALIASES.length}건</span>
          <button class="btn btn-sm" id="alias-bulk-delete-btn"
            style="display:none;background:#fff1f1;color:#d32f2f;border:1px solid #fca5a5;font-size:12px;padding:4px 10px;border-radius:5px;"
            onclick="bulkDeleteAliases()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px;vertical-align:-1px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            선택 항목 삭제
          </button>
        </div>
        <div class="cur-toolbar-right" style="gap:8px;align-items:center;">
          <button class="btn btn-sm btn-secondary" onclick="downloadAliasTemplate()"
            style="display:flex;align-items:center;gap:5px;font-size:12px;padding:5px 11px;"
            title="업로드용 엑셀 템플릿 다운로드">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            템플릿 다운로드
          </button>
          <label class="btn btn-sm btn-secondary"
            style="display:flex;align-items:center;gap:5px;cursor:pointer;margin:0;font-size:12px;padding:5px 11px;"
            title="엑셀 파일(.xlsx)로 일괄 등록">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            엑셀 업로드
            <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="uploadAliasExcel(this)" />
          </label>
          <div style="width:1px;height:22px;background:#e5e7eb;"></div>
          <button class="btn btn-primary btn-sm" onclick="openAliasModal('create')"
            style="display:flex;align-items:center;gap:5px;font-size:12px;padding:5px 12px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            개별 등록
          </button>
        </div>
      </div>
      <div id="${ALIAS_GRID_KEY}" class="ag-theme-alpine" style="height:460px;width:100%;"></div>
      ${renderGridToolbar(ALIAS_GRID_KEY, '컬럼별칭_목록', COLUMN_ALIASES.length, getSavedPageSize(ALIAS_GRID_KEY, 20))}
    </div>
  `;

  const cols = [
    // ① 체크박스 — 최우선 고정, colId로 식별
    {
      colId: '__chk__',
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 44, minWidth: 44, maxWidth: 44,
      pinned: 'left',
      sortable: false, filter: false, resizable: false,
      lockPosition: true, suppressMovable: true,
      headerClass: 'alias-chk-header',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    },
    { headerName: 'ID', field: 'id', width: 65, sortable: true, filter: true,
      cellStyle: { color: '#9ca3af', fontSize: '12px', textAlign: 'center' } },
    {
      headerName: 'CUR 컬럼 ID',
      field: 'standardColumn',
      width: 220,
      cellRenderer: (p) => `<code style="background:#f0f5ff;color:#0046FF;padding:2px 8px;border-radius:4px;font-size:12px;font-family:monospace;">${p.value}</code>`,
    },
    {
      headerName: '업로드 컬럼',
      field: 'sourceColumn',
      flex: 1, minWidth: 200,
      cellRenderer: (p) => `<span style="font-weight:500;">${p.value}</span>`,
    },
    { headerName: '부서 한정', field: 'department', width: 130,
      valueFormatter: (p) => p.value || '전체',
      cellStyle: (p) => p.value ? { color:'#374151' } : { color:'#9ca3af', fontStyle:'italic' },
    },
    { headerName: '활성', field: 'isActive', width: 85, sortable: true, filter: false,
      cellRenderer: (p) => p.value
        ? '<span class="status-badge success" style="font-size:11px;">활성</span>'
        : '<span class="status-badge pending" style="font-size:11px;">비활성</span>',
      cellStyle: { display:'flex', alignItems:'center', justifyContent:'center' },
    },
    { headerName: '관리', width: 140, sortable: false, filter: false, pinned: 'right',
      cellStyle: { display:'flex', alignItems:'center', gap:'4px' },
      cellRenderer: (p) => `
        <button class="btn btn-sm btn-secondary" onclick="openAliasModal('edit',${p.data.id})" style="font-size:11px;padding:3px 8px;">수정</button>
        <button class="btn btn-sm btn-danger"    onclick="deleteAlias(${p.data.id})"           style="font-size:11px;padding:3px 8px;">삭제</button>
      `,
    },
  ];

  initAGGrid(ALIAS_GRID_KEY, cols, COLUMN_ALIASES, {
    defaultPageSize: 20, makeResizable: true, syncToolbar: true,
    rowSelection: 'multiple',
    onSelectionChanged: (e) => {
      const selected = e.api.getSelectedRows();
      const btn = document.getElementById('alias-bulk-delete-btn');
      const lbl = document.getElementById('alias-count-label');
      if (btn) btn.style.display = selected.length > 0 ? '' : 'none';
      if (lbl) lbl.textContent = selected.length > 0
        ? `${selected.length}건 선택됨 / 전체 ${COLUMN_ALIASES.length}건`
        : `전체 ${COLUMN_ALIASES.length}건`;
    },
  });
}

// ── 컬럼 별칭: 일괄 삭제 ──
function bulkDeleteAliases() {
  const grid = document.getElementById('aliases-grid');
  if (!grid || !grid.__agGrid) return;
  const selected = grid.__agGrid.getSelectedRows();
  if (!selected.length) return;
  if (!confirm(`선택한 ${selected.length}건을 삭제하시겠어요?`)) return;
  const ids = new Set(selected.map(r => r.id));
  for (let i = COLUMN_ALIASES.length - 1; i >= 0; i--) {
    if (ids.has(COLUMN_ALIASES[i].id)) COLUMN_ALIASES.splice(i, 1);
  }
  logAudit(AUDIT_ACTIONS.DELETE, '컬럼 별칭 일괄 삭제', `${ids.size}건`);
  showToast('success', `${ids.size}건을 삭제했습니다`);
  rerenderCurrent();
}

// ── 컬럼 별칭: 템플릿 다운로드 ──
function downloadAliasTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('컬럼별칭');
  ws.columns = [
    { header: 'CUR 컬럼 ID', key: 'standardColumn', width: 30 },
    { header: '업로드 컬럼',  key: 'sourceColumn',   width: 30 },
    { header: '부서 한정',    key: 'department',     width: 20 },
    { header: '활성',         key: 'isActive',       width: 12 },
  ];
  // 헤더 스타일
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0046FF' } };
  // 예시 데이터 2행
  ws.addRow({ standardColumn: 'account_id',   sourceColumn: '계정번호', department: '',    isActive: 'TRUE' });
  ws.addRow({ standardColumn: 'cost_amount',  sourceColumn: '비용금액', department: '재무팀', isActive: 'TRUE' });
  // 안내 시트
  const ws2 = wb.addWorksheet('작성 안내');
  ws2.getCell('A1').value = '필드 설명';
  ws2.getCell('A1').font = { bold: true };
  [
    ['CUR 컬럼 ID', 'CUR 표준 컬럼명 (필수) — 예: account_id, cost_amount, usage_date'],
    ['업로드 컬럼', '업로드 파일의 컬럼 헤더명 (필수) — 예: 계정번호, 비용'],
    ['부서 한정',   '부서 한정 (선택) — 비워두면 전체 적용'],
    ['활성',        'TRUE 또는 FALSE (필수)'],
  ].forEach(([k, v], i) => {
    ws2.getCell(`A${i+2}`).value = k;
    ws2.getCell(`B${i+2}`).value = v;
    ws2.getCell(`A${i+2}`).font = { bold: true };
  });
  ws2.getColumn('A').width = 20;
  ws2.getColumn('B').width = 60;

  wb.xlsx.writeBuffer().then(buf => {
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), '컬럼별칭_업로드_템플릿.xlsx');
    showToast('success', '템플릿을 다운로드했습니다');
  });
}

// ── 컬럼 별칭: 엑셀 업로드 ──
function uploadAliasExcel(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = ''; // 재업로드 허용

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) { showToast('error', '데이터가 없습니다'); return; }

      // 신규 헤더명('CUR 컬럼 ID', '업로드 컬럼') 또는 구버전 키명(standardColumn, sourceColumn) 모두 허용
      const hasNewHeader = 'CUR 컬럼 ID' in rows[0] && '업로드 컬럼' in rows[0];
      const hasOldKey    = 'standardColumn' in rows[0] && 'sourceColumn' in rows[0];
      if (!hasNewHeader && !hasOldKey) {
        showToast('error', `필수 컬럼 누락: 'CUR 컬럼 ID', '업로드 컬럼'\n템플릿을 다운로드해서 사용해 주세요`);
        return;
      }

      let added = 0, skipped = 0;
      rows.forEach(row => {
        const standardColumn = String(hasNewHeader ? row['CUR 컬럼 ID'] : row.standardColumn || '').trim();
        const sourceColumn   = String(hasNewHeader ? row['업로드 컬럼'] : row.sourceColumn   || '').trim();
        const department     = String(hasNewHeader ? (row['부서 한정'] ?? '') : (row.department ?? '')).trim() || null;
        const isActiveRaw    = String(hasNewHeader ? (row['활성'] ?? 'TRUE') : (row.isActive ?? 'TRUE')).trim().toUpperCase();
        const isActive       = isActiveRaw !== 'FALSE';

        if (!standardColumn || !sourceColumn) { skipped++; return; }
        // 중복 체크
        if (COLUMN_ALIASES.some(a => a.standardColumn === standardColumn && a.sourceColumn === sourceColumn && (a.department || null) === department)) {
          skipped++; return;
        }
        const newId = (COLUMN_ALIASES.length ? Math.max(...COLUMN_ALIASES.map(a => a.id)) : 0) + 1;
        COLUMN_ALIASES.push({ id: newId, standardColumn, sourceColumn, department, isActive });
        added++;
      });

      logAudit(AUDIT_ACTIONS.CREATE, '컬럼 별칭 일괄 등록(Excel)', `추가:${added}건, 중복스킵:${skipped}건`);
      showToast('success', `${added}건 등록 완료${skipped ? ` (${skipped}건 중복 스킵)` : ''}`);
      rerenderCurrent();
    } catch (err) {
      showToast('error', `파일 파싱 오류: ${err.message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ══ 클라우드 계정 관련 공통 상수 ══
const CLOUD_PROVIDER_LABEL = { AWS: 'AWS', AZURE: 'Azure', GCP: 'GCP', NHN: 'NHN Cloud', OCI: 'Oracle Cloud', KT: 'KT Cloud', NBP: 'Naver Cloud' };
const PAYER_LEVEL_LABEL    = { AWS: 'Management Account', AZURE: 'Billing Account', GCP: 'Billing Account', NHN: 'Organization', OCI: 'Tenancy', KT: 'Account', NBP: 'Master Account' };
const LINKED_LEVEL_LABEL   = { AWS: 'Linked Account', AZURE: 'Subscription', GCP: 'Project', NHN: 'Project', OCI: 'Compartment', KT: 'Zone', NBP: 'Sub Account' };
const ACCT_STATUS_LABEL    = { ACTIVE: '활성', INACTIVE: '비활성', SUSPENDED: '정지', EXPIRED: '만료' };
const ACCT_STATUS_VARIANT  = { ACTIVE: 'success', INACTIVE: 'pending', SUSPENDED: 'warning', EXPIRED: 'error' };

// ── 시스템: 클라우드 계정 관리 (#/admin/cloud-accounts) — SYS_OPS/SYS_ADMIN 전용 ──
function renderCloudAccountsSystem(el) {
  const tab = window.__CLOUD_ACCT_TAB__ || 'payer';
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">클라우드 계정 관리</h1>
      <p class="page-desc">클라우드 제공사별 상위(Payer/Billing) 계정과 하위(Linked/Subscription/Project) 계정을 관리합니다.</p>
    </div>
    <div class="tab-nav" style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:16px;">
      <button class="tab-nav-btn${tab==='payer'?' active':''}" onclick="window.__CLOUD_ACCT_TAB__='payer';rerenderCurrent();"
        style="padding:8px 20px;border:none;background:none;font-size:14px;font-weight:600;cursor:pointer;border-bottom:${tab==='payer'?'2px solid #0046FF':'2px solid transparent'};color:${tab==='payer'?'#0046FF':'#6b7280'};margin-bottom:-2px;">
        상위 계정 <span style="font-size:12px;color:#888;">(${Object.keys(CLOUD_PROVIDER_LABEL).map(p=>PAYER_LEVEL_LABEL[p]).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')})</span>
      </button>
      <button class="tab-nav-btn${tab==='linked'?' active':''}" onclick="window.__CLOUD_ACCT_TAB__='linked';rerenderCurrent();"
        style="padding:8px 20px;border:none;background:none;font-size:14px;font-weight:600;cursor:pointer;border-bottom:${tab==='linked'?'2px solid #0046FF':'2px solid transparent'};color:${tab==='linked'?'#0046FF':'#6b7280'};margin-bottom:-2px;">
        하위 계정 <span style="font-size:12px;color:#888;">(${Object.keys(CLOUD_PROVIDER_LABEL).map(p=>LINKED_LEVEL_LABEL[p]).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')})</span>
      </button>
    </div>
    <div id="cloud-acct-content"></div>
  `;
  if (tab === 'payer') renderPayerAccountsTab();
  else renderLinkedAccountsTab();
}

function renderPayerAccountsTab() {
  const el = document.getElementById('cloud-acct-content');
  if (!el) return;

  const filterProvider = window.__PAYER_FILTER_PROVIDER__ || '';
  const filterTenant   = window.__PAYER_FILTER_TENANT__   || '';

  let rows = CLOUD_ACCOUNTS.map(a => {
    const contract = CONTRACTS.find(c => c.id === a.contractId);
    const tenant   = contract ? TENANTS.find(t => t.id === contract.tenantId) : null;
    const subCount = CLOUD_SUB_ACCOUNTS.filter(s => s.payerId === a.id).length;
    return { ...a, contractCode: contract ? contract.code : '-', tenantName: tenant ? tenant.name : '-', tenantId: tenant ? tenant.id : '', subCount };
  });
  if (filterProvider) rows = rows.filter(r => r.provider === filterProvider);
  if (filterTenant)   rows = rows.filter(r => r.tenantId === filterTenant);

  const providerOpts = Object.keys(CLOUD_PROVIDER_LABEL)
    .map(p => `<option value="${p}" ${p===filterProvider?'selected':''}>${CLOUD_PROVIDER_LABEL[p]}</option>`).join('');
  const tenantOpts = TENANTS.filter(t=>t.status==='ACTIVE')
    .map(t => `<option value="${t.id}" ${t.id===filterTenant?'selected':''}>${t.name}</option>`).join('');

  el.innerHTML = `
    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left" style="gap:8px;">
          <select class="form-select" style="width:140px;flex-shrink:0;height:32px;font-size:13px;" onchange="window.__PAYER_FILTER_PROVIDER__=this.value;rerenderCurrent();">
            <option value="" ${!filterProvider?'selected':''}>전체 제공사</option>
            ${providerOpts}
          </select>
          <select class="form-select" style="width:140px;flex-shrink:0;height:32px;font-size:13px;" onchange="window.__PAYER_FILTER_TENANT__=this.value;rerenderCurrent();">
            <option value="" ${!filterTenant?'selected':''}>전체 고객사</option>
            ${tenantOpts}
          </select>
          <span class="grid-info" style="white-space:nowrap;">전체 ${rows.length}건</span>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-primary btn-sm" onclick="openPayerModal('create','')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            상위 계정 등록
          </button>
        </div>
      </div>
      <div id="payer-grid" class="ag-theme-alpine" style="height:460px;width:100%;"></div>
      ${renderGridToolbar('payer-grid', '상위계정_목록', rows.length, getSavedPageSize('payer-grid', 20))}
    </div>
  `;
  const cols = [
    { headerName: '고객사', field: 'tenantName', width: 120, pinned: 'left' },
    { headerName: '계약 코드', field: 'contractCode', width: 130 },
    { headerName: '제공사', field: 'provider', width: 110,
      cellRenderer: (p) => `<span class="status-badge" style="background:#f0f4ff;color:#0046FF;">${CLOUD_PROVIDER_LABEL[p.value]||p.value}</span>` },
    { headerName: '계정 유형', field: 'provider', width: 160, valueFormatter: (p) => PAYER_LEVEL_LABEL[p.value] || p.value, colId: 'payerType' },
    { headerName: '계정 ID', field: 'payerAccountId', width: 180 },
    { headerName: '계정명', field: 'name', flex: 1, minWidth: 180 },
    { headerName: '상태', field: 'status', width: 90,
      cellRenderer: (p) => `<span class="status-badge ${ACCT_STATUS_VARIANT[p.value]||'pending'}">${ACCT_STATUS_LABEL[p.value]||p.value}</span>` },
    { headerName: '하위 계정', field: 'subCount', width: 90, type: 'numericColumn' },
    { headerName: '시작일', field: 'effectiveFrom', width: 100 },
    { headerName: '종료일', field: 'effectiveTo', width: 100, valueFormatter: (p) => p.value || '-' },
    { headerName: '설명', field: 'description', flex: 1, minWidth: 160 },
    { headerName: '관리', width: 160, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => `
        <button class="btn btn-sm btn-secondary" onclick="openPayerModal('edit',${p.data.id})" style="font-size:11px;margin-right:4px;">수정</button>
        <button class="btn btn-sm btn-danger" onclick="deletePayerAccount(${p.data.id})" style="font-size:11px;">삭제</button>
      `
    },
  ];
  initAGGrid('payer-grid', cols, rows, { defaultPageSize: 20, makeResizable: true, syncToolbar: true });
}

function renderLinkedAccountsTab() {
  const el = document.getElementById('cloud-acct-content');
  if (!el) return;

  const filterProvider = window.__LINKED_FILTER_PROVIDER__ || '';
  const filterPayer    = window.__LINKED_FILTER_PAYER__    || '';

  let rows = CLOUD_SUB_ACCOUNTS.map(s => {
    const payer    = CLOUD_ACCOUNTS.find(a => a.id === s.payerId);
    const contract = CONTRACTS.find(c => c.id === s.contractId);
    const tenant   = contract ? TENANTS.find(t => t.id === contract.tenantId) : null;
    return {
      ...s,
      payerName:    payer    ? payer.name    : '-',
      payerAcctId:  payer    ? payer.payerAccountId : '-',
      contractCode: contract ? contract.code : '-',
      tenantName:   tenant   ? tenant.name   : '-',
      linkedTypeLabel: LINKED_LEVEL_LABEL[s.provider] || s.provider,
    };
  });
  if (filterProvider) rows = rows.filter(r => r.provider === filterProvider);
  if (filterPayer)    rows = rows.filter(r => String(r.payerId) === filterPayer);

  const providerOpts = Object.keys(CLOUD_PROVIDER_LABEL)
    .map(p => `<option value="${p}" ${p===filterProvider?'selected':''}>${CLOUD_PROVIDER_LABEL[p]}</option>`).join('');
  const payerOpts = CLOUD_ACCOUNTS
    .map(a => `<option value="${a.id}" ${String(a.id)===filterPayer?'selected':''}>${a.name}</option>`).join('');

  el.innerHTML = `
    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left" style="gap:8px;">
          <select class="form-select" style="width:140px;flex-shrink:0;height:32px;font-size:13px;" onchange="window.__LINKED_FILTER_PROVIDER__=this.value;renderLinkedAccountsTab();">
            <option value="" ${!filterProvider?'selected':''}>전체 제공사</option>
            ${providerOpts}
          </select>
          <select class="form-select" style="width:180px;flex-shrink:0;height:32px;font-size:13px;" onchange="window.__LINKED_FILTER_PAYER__=this.value;renderLinkedAccountsTab();">
            <option value="" ${!filterPayer?'selected':''}>전체 상위 계정</option>
            ${payerOpts}
          </select>
          <span class="grid-info" style="white-space:nowrap;">전체 ${rows.length}건</span>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-primary btn-sm" onclick="openLinkedModal('create','')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            하위 계정 등록
          </button>
        </div>
      </div>
      <div id="linked-grid" class="ag-theme-alpine" style="height:460px;width:100%;"></div>
      ${renderGridToolbar('linked-grid', '하위계정_목록', rows.length, getSavedPageSize('linked-grid', 20))}
    </div>
  `;
  const cols = [
    { headerName: '고객사', field: 'tenantName', width: 110, pinned: 'left' },
    { headerName: '상위 계정', field: 'payerName', width: 160 },
    { headerName: '제공사', field: 'provider', width: 100,
      cellRenderer: (p) => `<span class="status-badge" style="background:#f0f4ff;color:#0046FF;">${CLOUD_PROVIDER_LABEL[p.value]||p.value}</span>` },
    { headerName: '계정 유형', field: 'linkedTypeLabel', width: 140 },
    { headerName: '계정 ID', field: 'accountId', width: 200 },
    { headerName: '계정명', field: 'name', flex: 1, minWidth: 160 },
    { headerName: '상태', field: 'status', width: 90,
      cellRenderer: (p) => `<span class="status-badge ${ACCT_STATUS_VARIANT[p.value]||'pending'}">${ACCT_STATUS_LABEL[p.value]||p.value}</span>` },
    { headerName: '용도', field: 'purpose', width: 90 },
    { headerName: '환경', field: 'env', width: 80 },
    { headerName: '태그', field: 'tags', width: 130, valueFormatter: (p) => p.value || '-' },
    { headerName: '설명', field: 'description', flex: 1, minWidth: 140, valueFormatter: (p) => p.value || '-' },
    { headerName: '관리', width: 160, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => `
        <button class="btn btn-sm btn-secondary" onclick="openLinkedModal('edit','${p.data.id}')" style="font-size:11px;margin-right:4px;">수정</button>
        <button class="btn btn-sm btn-danger" onclick="deleteLinkedAccount('${p.data.id}')" style="font-size:11px;">삭제</button>
      `
    },
  ];
  initAGGrid('linked-grid', cols, rows, { defaultPageSize: 20, makeResizable: true, syncToolbar: true });
}

// ── 상위 계정 CRUD 모달 ──
function openPayerModal(mode, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';

  let data = { id: null, contractId: '', payerAccountId: '', name: '', provider: 'AWS', status: 'ACTIVE', effectiveFrom: '', effectiveTo: '', description: '' };
  if (mode === 'edit') {
    const found = CLOUD_ACCOUNTS.find(a => a.id === id);
    if (found) data = { ...data, ...found };
  }

  const contractOpts = CONTRACTS.map(c => {
    const t = TENANTS.find(x => x.id === c.tenantId);
    return `<option value="${c.id}" ${c.id === data.contractId ? 'selected' : ''}>${c.code} (${t ? t.name : '-'})</option>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${mode==='create'?'상위 계정 등록':'상위 계정 수정'}
        <span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;">${data.provider ? (PAYER_LEVEL_LABEL[data.provider]||'') : ''}</span>
      </h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="form-section-title" style="font-size:13px;font-weight:600;color:#0046FF;margin:4px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">계정 정보</div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">클라우드 제공사 *</label>
        <select class="form-select" id="payer-f-provider">
          ${Object.keys(CLOUD_PROVIDER_LABEL).map(p=>`<option value="${p}" ${p===data.provider?'selected':''}>${CLOUD_PROVIDER_LABEL[p]} (${PAYER_LEVEL_LABEL[p]})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">계약 *</label>
        <select class="form-select" id="payer-f-contract">
          <option value="" disabled ${!data.contractId?'selected':''}>계약 선택</option>
          ${contractOpts}
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">계정 ID *
          <span style="font-size:11px;color:#888;font-weight:400;" id="payer-id-hint">
            (AWS: 12자리 숫자 / Azure: 청구계정ID / GCP: billing-XXXXXX / NHN: 조직ID)
          </span>
        </label>
        <input class="form-input" id="payer-f-accountId" value="${data.payerAccountId}" placeholder="예: 123456789012" ${mode==='edit'?'readonly style="background:#f5f5f5;"':''} />
      </div>
      <div class="form-group">
        <label class="form-label">계정명 *</label>
        <input class="form-input" id="payer-f-name" value="${data.name}" placeholder="예: MyCompany-Prod-Payer" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">상태 *</label>
        <select class="form-select" id="payer-f-status">
          ${Object.keys(ACCT_STATUS_LABEL).map(s=>`<option value="${s}" ${s===data.status?'selected':''}>${ACCT_STATUS_LABEL[s]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">시작일 *</label>
        <input class="form-input" id="payer-f-from" type="date" value="${data.effectiveFrom||''}" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">종료일 <span style="color:#888;font-size:11px;">(미정 시 비워둠)</span></label>
        <input class="form-input" id="payer-f-to" type="date" value="${data.effectiveTo||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">설명</label>
        <input class="form-input" id="payer-f-desc" value="${data.description||''}" placeholder="계정 용도 메모" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="savePayerAccount('${mode}',${data.id||'null'})">${mode==='create'?'등록':'저장'}</button>
    </div>
  `;
  overlay.classList.add('active');
  try { activateModalTrap(modal); } catch(e) {}
  setTimeout(() => document.getElementById('payer-f-name')?.focus(), 200);
}

function savePayerAccount(mode, id) {
  const provider    = document.getElementById('payer-f-provider').value;
  const contractId  = parseInt(document.getElementById('payer-f-contract').value, 10);
  const accountId   = document.getElementById('payer-f-accountId').value.trim();
  const name        = document.getElementById('payer-f-name').value.trim();
  const status      = document.getElementById('payer-f-status').value;
  const effectiveFrom = document.getElementById('payer-f-from').value;
  const effectiveTo   = document.getElementById('payer-f-to').value;
  const description   = document.getElementById('payer-f-desc').value.trim();

  if (!provider || !contractId || !accountId || !name || !effectiveFrom) {
    showToast('error', '필수 항목(제공사/계약/계정ID/계정명/시작일)을 모두 입력해 주세요'); return;
  }
  if (effectiveTo && effectiveTo < effectiveFrom) {
    showToast('error', '종료일이 시작일보다 빠를 수 없습니다'); return;
  }

  if (mode === 'create') {
    if (CLOUD_ACCOUNTS.some(a => a.payerAccountId === accountId)) {
      showToast('error', '이미 등록된 계정 ID입니다'); return;
    }
    const newId = Math.max(...CLOUD_ACCOUNTS.map(a => a.id), 0) + 1;
    CLOUD_ACCOUNTS.push({ id: newId, contractId, payerAccountId: accountId, name, provider, status, effectiveFrom, effectiveTo: effectiveTo || null, description });
    logAudit(AUDIT_ACTIONS.CREATE, '상위 계정 등록', `제공사:${provider}, ID:${accountId}, 계약:${contractId}`);
    showToast('success', `${name} 계정을 등록했습니다`);
  } else {
    const item = CLOUD_ACCOUNTS.find(a => a.id === id);
    if (item) {
      Object.assign(item, { contractId, name, status, effectiveFrom, effectiveTo: effectiveTo || null, description });
      logAudit(AUDIT_ACTIONS.UPDATE, '상위 계정 수정', `ID:${item.payerAccountId}, 상태:${status}`);
      showToast('success', `${name} 계정을 수정했습니다`);
    }
  }
  closeModal();
  rerenderCurrent();
}

function deletePayerAccount(id) {
  const item = CLOUD_ACCOUNTS.find(a => a.id === id);
  if (!item) return;
  const subCount = CLOUD_SUB_ACCOUNTS.filter(s => s.payerId === id).length;
  if (subCount > 0) {
    showToast('error', `삭제 불가: 연결된 하위 계정 ${subCount}건이 있습니다`); return;
  }
  if (!confirm(`${item.name} 상위 계정을 삭제하시겠어요?`)) return;
  CLOUD_ACCOUNTS.splice(CLOUD_ACCOUNTS.findIndex(a => a.id === id), 1);
  logAudit(AUDIT_ACTIONS.DELETE, '상위 계정 삭제', `ID:${item.payerAccountId}, 이름:${item.name}`);
  showToast('success', `${item.name} 계정을 삭제했습니다`);
  rerenderCurrent();
}

// ── 하위 계정 CRUD 모달 ──
function openLinkedModal(mode, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';

  let data = { id: null, payerId: '', contractId: '', provider: 'AWS', accountId: '', name: '', purpose: '', env: 'prod', status: 'ACTIVE', description: '', tags: '' };
  if (mode === 'edit') {
    const found = CLOUD_SUB_ACCOUNTS.find(s => s.id === id);
    if (found) data = { ...data, ...found };
  }

  const payerOpts = CLOUD_ACCOUNTS.map(a => {
    const c = CONTRACTS.find(x => x.id === a.contractId);
    const t = c ? TENANTS.find(x => x.id === c.tenantId) : null;
    return `<option value="${a.id}" ${a.id === data.payerId ? 'selected' : ''}>${a.name} [${CLOUD_PROVIDER_LABEL[a.provider]||a.provider}] (${t?t.name:'-'})</option>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${mode==='create'?'하위 계정 등록':'하위 계정 수정'}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="form-section-title" style="font-size:13px;font-weight:600;color:#0046FF;margin:4px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">계정 정보</div>
    <div class="cur-form-row">
      <div class="form-group" style="flex:2;">
        <label class="form-label">상위 계정 * <span style="font-size:11px;color:#888;">(제공사는 상위 계정에서 자동 결정)</span></label>
        <select class="form-select" id="linked-f-payer" onchange="onChangeLinkedPayer(this)">
          <option value="" disabled ${!data.payerId?'selected':''}>상위 계정 선택</option>
          ${payerOpts}
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">계정 ID * <span style="font-size:11px;color:#888;" id="linked-id-hint">(예: AWS Linked Account ID)</span></label>
        <input class="form-input" id="linked-f-accountId" value="${data.accountId}" placeholder="예: 210987654321" ${mode==='edit'?'readonly style="background:#f5f5f5;"':''} />
      </div>
      <div class="form-group">
        <label class="form-label">계정명 *</label>
        <input class="form-input" id="linked-f-name" value="${data.name}" placeholder="예: MyCompany-Dev-Linked" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">상태 *</label>
        <select class="form-select" id="linked-f-status">
          ${Object.keys(ACCT_STATUS_LABEL).map(s=>`<option value="${s}" ${s===data.status?'selected':''}>${ACCT_STATUS_LABEL[s]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">환경</label>
        <select class="form-select" id="linked-f-env">
          <option value="prod" ${data.env==='prod'?'selected':''}>운영(prod)</option>
          <option value="stg"  ${data.env==='stg' ?'selected':''}>스테이징(stg)</option>
          <option value="dev"  ${data.env==='dev' ?'selected':''}>개발(dev)</option>
          <option value="dr"   ${data.env==='dr'  ?'selected':''}>DR(dr)</option>
          <option value="test" ${data.env==='test'?'selected':''}>테스트(test)</option>
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">용도</label>
        <input class="form-input" id="linked-f-purpose" value="${data.purpose||''}" placeholder="예: was, rds, analytics" />
      </div>
      <div class="form-group">
        <label class="form-label">태그 <span style="font-size:11px;color:#888;">(key:value, 쉼표 구분)</span></label>
        <input class="form-input" id="linked-f-tags" value="${data.tags||''}" placeholder="예: env:prod,team:data" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group" style="flex:1;">
        <label class="form-label">설명</label>
        <input class="form-input" id="linked-f-desc" value="${data.description||''}" placeholder="계정 용도 메모" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveLinkedAccount('${mode}','${data.id||''}')">${mode==='create'?'등록':'저장'}</button>
    </div>
  `;
  overlay.classList.add('active');
  try { activateModalTrap(modal); } catch(e) {}
  // 상위 계정 선택 시 힌트 업데이트
  if (data.payerId) onChangeLinkedPayer({ value: String(data.payerId) });
  setTimeout(() => document.getElementById('linked-f-name')?.focus(), 200);
}

function onChangeLinkedPayer(sel) {
  const payerId = parseInt(sel.value, 10);
  const payer = CLOUD_ACCOUNTS.find(a => a.id === payerId);
  const hint = document.getElementById('linked-id-hint');
  if (hint && payer) {
    const ex = { AWS: '12자리 숫자 계정 ID', AZURE: 'Subscription UUID', GCP: '프로젝트 ID (my-project-123)', NHN: '프로젝트 ID', OCI: 'Compartment OCID', KT: 'Zone ID', NBP: 'Sub Account ID' };
    hint.textContent = `(${LINKED_LEVEL_LABEL[payer.provider]||''} — ${ex[payer.provider]||'계정 고유 ID'})`;
  }
}

function saveLinkedAccount(mode, id) {
  const payerId  = parseInt(document.getElementById('linked-f-payer').value, 10);
  const accountId = document.getElementById('linked-f-accountId').value.trim();
  const name     = document.getElementById('linked-f-name').value.trim();
  const status   = document.getElementById('linked-f-status').value;
  const env      = document.getElementById('linked-f-env').value;
  const purpose  = document.getElementById('linked-f-purpose').value.trim();
  const tags     = document.getElementById('linked-f-tags').value.trim();
  const description = document.getElementById('linked-f-desc').value.trim();

  if (!payerId || !accountId || !name) {
    showToast('error', '필수 항목(상위 계정/계정ID/계정명)을 모두 입력해 주세요'); return;
  }

  const payer = CLOUD_ACCOUNTS.find(a => a.id === payerId);
  if (!payer) { showToast('error', '상위 계정을 찾을 수 없습니다'); return; }
  const contract = CONTRACTS.find(c => c.id === payer.contractId);

  if (mode === 'create') {
    if (CLOUD_SUB_ACCOUNTS.some(s => s.accountId === accountId && s.payerId === payerId)) {
      showToast('error', '동일 상위 계정에 이미 등록된 계정 ID입니다'); return;
    }
    const maxNum = Math.max(...CLOUD_SUB_ACCOUNTS.map(s => s.numericId || 0), 0) + 1;
    const newId  = `csa-${String(maxNum).padStart(2,'0')}`;
    CLOUD_SUB_ACCOUNTS.push({
      id: newId, numericId: maxNum, payerId, contractId: payer.contractId,
      tenantId: contract ? contract.tenantId : null,
      provider: payer.provider, accountId, name, purpose, env, status, description, tags,
    });
    logAudit(AUDIT_ACTIONS.CREATE, '하위 계정 등록', `제공사:${payer.provider}, ID:${accountId}, 상위:${payer.name}`);
    showToast('success', `${name} 계정을 등록했습니다`);
  } else {
    const item = CLOUD_SUB_ACCOUNTS.find(s => s.id === id);
    if (item) {
      Object.assign(item, { payerId, contractId: payer.contractId, tenantId: contract ? contract.tenantId : null, name, status, env, purpose, tags, description });
      logAudit(AUDIT_ACTIONS.UPDATE, '하위 계정 수정', `ID:${item.accountId}, 상태:${status}`);
      showToast('success', `${name} 계정을 수정했습니다`);
    }
  }
  closeModal();
  if (document.getElementById('linked-grid')) renderLinkedAccountsTab();
  else rerenderCurrent();
}

function deleteLinkedAccount(id) {
  const item = CLOUD_SUB_ACCOUNTS.find(s => s.id === id);
  if (!item) return;
  if (!confirm(`${item.name} 하위 계정을 삭제하시겠어요?`)) return;
  CLOUD_SUB_ACCOUNTS.splice(CLOUD_SUB_ACCOUNTS.findIndex(s => s.id === id), 1);
  logAudit(AUDIT_ACTIONS.DELETE, '하위 계정 삭제', `ID:${item.accountId}, 이름:${item.name}`);
  showToast('success', `${item.name} 계정을 삭제했습니다`);
  renderLinkedAccountsTab();
}

// ── 시스템: 계약 관리 (#/admin/contracts) — SYS_OPS/SYS_ADMIN 전용 ──
function renderContractsSystem(el) {
  // 선택된 테넌트 필터 (드롭다운 or 전체)
  const selectedTenantId = window.__CONTRACT_FILTER_TENANT__ || '';
  const filteredContracts = selectedTenantId
    ? CONTRACTS.filter(c => c.tenantId === selectedTenantId)
    : CONTRACTS;
  const rows = filteredContracts.map(c => {
    const accounts = CLOUD_ACCOUNTS.filter(a => a.contractId === c.id);
    const subs = CLOUD_SUB_ACCOUNTS.filter(s => s.contractId === c.id);
    const tenant = TENANTS.find(t => t.id === c.tenantId);
    return { ...c, payerCount: accounts.length, subAccountCount: subs.length, tenantName: tenant ? tenant.name : '-' };
  });
  logAudit(AUDIT_ACTIONS.VIEW, '계약 관리 조회(시스템)', `테넌트 필터: ${selectedTenantId || '전체'} / ${rows.length}건`);

  const tenantOptions = TENANTS.filter(t => t.status === 'ACTIVE')
    .map(t => `<option value="${t.id}" ${t.id === selectedTenantId ? 'selected' : ''}>${t.name}</option>`)
    .join('');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">계약 관리</h1>
      <p class="page-desc">전체 ${rows.length}건의 계약 — 고객사별로 필터링하거나 신규 계약을 등록합니다.</p>
    </div>
    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left">
          <select class="form-select" style="width:180px;flex-shrink:0;height:32px;font-size:13px;" onchange="window.__CONTRACT_FILTER_TENANT__=this.value;rerenderCurrent();">
            <option value="" ${!selectedTenantId ? 'selected' : ''}>전체 고객사</option>
            ${tenantOptions}
          </select>
          <span class="grid-info" style="margin-left:8px;white-space:nowrap;">전체 ${rows.length}건</span>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-primary btn-sm" onclick="openContractModal('create','${selectedTenantId}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            등록
          </button>
        </div>
      </div>
      <div id="contracts-grid" class="ag-theme-alpine" style="height:480px;width:100%;"></div>
      ${renderGridToolbar('contracts-grid', '계약_목록', rows.length, getSavedPageSize('contracts-grid', 20))}
    </div>
  `;

  const TYPE_LABEL = { DIRECT: '직접계약', AGENT: '대행', MSP: 'MSP', RESELL: '리셀링', INTERNAL: '그룹내부정산' };
  const BILLING_LABEL = { MONTHLY: '월', QUARTERLY: '분기', SEMIANNUAL: '반기', YEARLY: '연' };
  const TAX_LABEL = { VAT_INCLUDED: '부가세 포함', VAT_EXCLUDED: '부가세 별도', TAX_FREE: '면세' };
  const PAY_LABEL = { POSTPAID: '후불', PREPAID: '선불', MONTH_END: '월말정산' };
  const STATUS_LABEL = { ACTIVE: '활성', EXPIRED: '만료', PENDING: '대기', SUSPENDED: '정지' };
  const STATUS_VARIANT = { ACTIVE: 'success', EXPIRED: 'error', PENDING: 'pending', SUSPENDED: 'warning' };

  const cols = [
    { headerName: '고객사', field: 'tenantName', width: 160, pinned: 'left' },
    { headerName: '계약 코드', field: 'code', width: 150 },
    { headerName: '계약명', field: 'name', flex: 1, minWidth: 200 },
    { headerName: '유형', field: 'type', width: 110, valueFormatter: (p) => TYPE_LABEL[p.value] || p.value || '-' },
    { headerName: '상태', field: 'status', width: 90, cellRenderer: (p) => `<span class="status-badge ${STATUS_VARIANT[p.value] || 'pending'}">${STATUS_LABEL[p.value] || p.value || '-'}</span>` },
    { headerName: '통화', field: 'currency', width: 80 },
    { headerName: '정산주기', field: 'billing', width: 90, valueFormatter: (p) => BILLING_LABEL[p.value] || p.value || '-' },
    { headerName: '세금', field: 'taxType', width: 120, valueFormatter: (p) => TAX_LABEL[p.value] || p.value || '-' },
    { headerName: '결제조건', field: 'paymentTerm', width: 100, valueFormatter: (p) => PAY_LABEL[p.value] || p.value || '-' },
    { headerName: '청구기준일', field: 'invoiceIssueDay', width: 100, type: 'numericColumn', valueFormatter: (p) => p.value ? `매월 ${p.value}일` : '-' },
    { headerName: '납부기한', field: 'paymentDueDays', width: 90, type: 'numericColumn', valueFormatter: (p) => (p.value || p.value === 0) ? `+${p.value}일` : '-' },
    { headerName: '시작일', field: 'effectiveFrom', width: 100 },
    { headerName: 'Payer', field: 'payerCount', width: 70, type: 'numericColumn' },
    { headerName: 'SubAcct', field: 'subAccountCount', width: 80, type: 'numericColumn' },
    { headerName: '관리', width: 150, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => `
        <button class="btn btn-sm btn-secondary" onclick="openContractModal('edit','${p.data.id}')" style="font-size:11px;margin-right:4px;">수정</button>
        <button class="btn btn-sm btn-danger" onclick="deleteContract('${p.data.id}')" style="font-size:11px;">삭제</button>
      `
    },
  ];
  initAGGrid('contracts-grid', cols, rows, { defaultPageSize: 20, makeResizable: true, syncToolbar: true });
}

// ── 테넌트 관리: 계약 조회 (#/t/{slug}/admin/contracts) — TENANT_ADMIN 읽기 전용 ──
function renderContractsAdmin(el) {
  const ctx = CURRENT_CONTEXT;
  const tenant = TENANTS.find(t => t.id === ctx.tenantId);
  if (!tenant) { el.innerHTML = '<div class="error-state">조직 정보를 찾을 수 없습니다.</div>'; return; }
  const contracts = CONTRACTS.filter(c => c.tenantId === tenant.id);
  logAudit(AUDIT_ACTIONS.VIEW, '계약 조회', `조직: ${tenant.slug} / ${contracts.length}건`);

  const rows = contracts.map(c => {
    const accounts = CLOUD_ACCOUNTS.filter(a => a.contractId === c.id);
    const subs = CLOUD_SUB_ACCOUNTS.filter(s => s.contractId === c.id);
    return { ...c, payerCount: accounts.length, subAccountCount: subs.length };
  });
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${tenant.name} · 계약</h1>
      <p class="page-desc">전체 ${rows.length}건의 계약 — 조회 전용입니다. 계약 등록·수정·삭제는 시스템 운영자에게 문의하세요.</p>
    </div>
    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left"><span class="grid-info">전체 ${rows.length}건</span></div>
      </div>
      <div id="contracts-grid" class="ag-theme-alpine" style="height:420px;width:100%;"></div>
      ${renderGridToolbar('contracts-grid', '계약_목록', rows.length, getSavedPageSize('contracts-grid', 20))}
    </div>
  `;
  const TYPE_LABEL = { DIRECT: '직접계약', AGENT: '대행', MSP: 'MSP', RESELL: '리셀링', INTERNAL: '그룹내부정산' };
  const BILLING_LABEL = { MONTHLY: '월', QUARTERLY: '분기', SEMIANNUAL: '반기', YEARLY: '연' };
  const TAX_LABEL = { VAT_INCLUDED: '부가세 포함', VAT_EXCLUDED: '부가세 별도', TAX_FREE: '면세' };
  const PAY_LABEL = { POSTPAID: '후불', PREPAID: '선불', MONTH_END: '월말정산' };
  const STATUS_LABEL = { ACTIVE: '활성', EXPIRED: '만료', PENDING: '대기', SUSPENDED: '정지' };
  const STATUS_VARIANT = { ACTIVE: 'success', EXPIRED: 'error', PENDING: 'pending', SUSPENDED: 'warning' };

  const cols = [
    { headerName: '계약 코드', field: 'code', width: 150, pinned: 'left' },
    { headerName: '계약명', field: 'name', flex: 1, minWidth: 220 },
    { headerName: '유형', field: 'type', width: 120, valueFormatter: (p) => TYPE_LABEL[p.value] || p.value || '-' },
    { headerName: '상태', field: 'status', width: 100, cellRenderer: (p) => `<span class="status-badge ${STATUS_VARIANT[p.value] || 'pending'}">${STATUS_LABEL[p.value] || p.value || '-'}</span>` },
    { headerName: '통화', field: 'currency', width: 80 },
    { headerName: '정산주기', field: 'billing', width: 100, valueFormatter: (p) => BILLING_LABEL[p.value] || p.value || '-' },
    { headerName: '세금', field: 'taxType', width: 120, valueFormatter: (p) => TAX_LABEL[p.value] || p.value || '-' },
    { headerName: '결제조건', field: 'paymentTerm', width: 110, valueFormatter: (p) => PAY_LABEL[p.value] || p.value || '-' },
    { headerName: '청구기준일', field: 'invoiceIssueDay', width: 110, type: 'numericColumn', valueFormatter: (p) => p.value ? `매월 ${p.value}일` : '-' },
    { headerName: '납부기한(일)', field: 'paymentDueDays', width: 120, type: 'numericColumn', valueFormatter: (p) => (p.value || p.value === 0) ? `+${p.value}일` : '-' },
    { headerName: '시작일', field: 'effectiveFrom', width: 110 },
    { headerName: '종료일', field: 'effectiveTo', width: 110, valueFormatter: (p) => p.value || '-' },
    { headerName: 'Payer', field: 'payerCount', width: 80, type: 'numericColumn' },
    { headerName: 'SubAcct', field: 'subAccountCount', width: 90, type: 'numericColumn' },
  ];
  initAGGrid('contracts-grid', cols, rows, { defaultPageSize: 20, makeResizable: true, syncToolbar: true });
}

// ── 테넌트 관리: 권한 위임(Scope) 관리 (#/t/{slug}/admin/scopes) ──
function renderScopesAdmin(el) {
  const ctx = CURRENT_CONTEXT;
  const tenant = TENANTS.find(t => t.id === ctx.tenantId);
  if (!tenant) { el.innerHTML = '<div class="error-state">조직 정보를 찾을 수 없습니다.</div>'; return; }
  // 사용자별 SubAccount 권한 매핑 — 사용자 행으로 집계
  const tenantUsers = USERS.filter(u => u.tenantId === tenant.id);
  const tenantSubs = CLOUD_SUB_ACCOUNTS.filter(s => s.tenantId === tenant.id);
  const rows = tenantUsers.map(u => {
    const scopes = TENANT_USER_SCOPES.filter(s => s.userId === u.id);
    const visibleSubs = scopes.length;
    const role = u.roles[0];
    const scopeType = (role === 'ROLE_TENANT_ADMIN' || role === 'ROLE_TENANT_APPROVER') ? 'FULL' : (visibleSubs ? 'PARTIAL' : 'NONE');
    return {
      userId: u.id,
      username: u.username,
      name: u.name,
      department: u.department || '-',
      role: getRoleLabel(role),
      visibleSubs,
      totalSubs: tenantSubs.length,
      scopeType,
    };
  });
  logAudit(AUDIT_ACTIONS.VIEW, '권한 위임 조회', `조직: ${tenant.slug} / ${rows.length}명`);
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${tenant.name} · 권한 위임(Scope)</h1>
      <p class="page-desc">사용자별 SubAccount 가시 범위 — 부분(PARTIAL) 사용자는 일부 SubAccount의 비용이 마스킹됩니다.</p>
    </div>
    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left">
          <span class="grid-info">전체 ${rows.length}명 / SubAccount ${tenantSubs.length}건</span>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-secondary btn-sm" onclick="bulkResetScopes('${tenant.id}')" title="모든 PARTIAL 사용자의 가시 범위를 초기화합니다">
            전체 초기화
          </button>
        </div>
      </div>
      <div id="scopes-grid" class="ag-theme-alpine" style="height:460px;width:100%;"></div>
      ${renderGridToolbar('scopes-grid', '권한위임_목록', rows.length, getSavedPageSize('scopes-grid', 20))}
    </div>
  `;
  const cols = [
    { headerName: '아이디', field: 'username', width: 140, pinned: 'left' },
    { headerName: '이름', field: 'name', width: 120 },
    { headerName: '부서', field: 'department', width: 160 },
    { headerName: '역할', field: 'role', width: 160 },
    { headerName: '가시 SubAccount', field: 'visibleSubs', width: 140, type: 'numericColumn' },
    { headerName: '전체 SubAccount', field: 'totalSubs', width: 140, type: 'numericColumn' },
    { headerName: '범위 유형', field: 'scopeType', width: 130, cellRenderer: (p) => {
      const cls = p.value === 'FULL' ? 'success' : p.value === 'PARTIAL' ? 'warning' : 'pending';
      return `<span class="status-badge ${cls}">${p.value}</span>`;
    } },
    { headerName: '관리', width: 130, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => `<button class="btn btn-sm btn-secondary" onclick="openScopeEditModal(${p.data.userId},'${tenant.id}')" style="font-size:11px;">권한 편집</button>`
    },
  ];
  initAGGrid('scopes-grid', cols, rows, { defaultPageSize: 20, makeResizable: true, syncToolbar: true });
}

// ── 승인자 인박스 자리 표시자 (#/t/{slug}/approvals) ──
function renderApprovalsPlaceholder(el) {
  const ctx = CURRENT_CONTEXT;
  const tenant = TENANTS.find(t => t.id === ctx.tenantId);
  const tenantName = tenant ? tenant.name : '조직';
  logAudit(AUDIT_ACTIONS.VIEW, '승인함 조회', `조직: ${tenant ? tenant.slug : '-'}`);
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${tenantName} · 승인함</h1>
      <p class="page-desc">승인자 전용 인박스 — 본 화면은 v3 단계에서 구현 예정입니다.</p>
    </div>
    <div class="section-card" style="text-align:center;padding:60px 20px;">
      <div style="font-size:48px;margin-bottom:16px;">📥</div>
      <h3 style="margin-top:0;">승인 대기 항목 없음</h3>
      <p style="color:var(--sh-dark-secondary);">결재(워크플로) 모듈 연동은 다음 단계에서 진행됩니다.<br/>현재는 라우팅·권한 체크·GNB 변형이 정상 동작하는지 확인하는 자리 표시자입니다.</p>
    </div>
  `;
}

// ══════════════════════════════════════════
// v2 신규 화면 CRUD 핸들러
// (테넌트 / 계약 / CUR 컬럼 별칭 / 권한 위임)
// 더미 데이터(in-memory) 직접 변경 — 백엔드 연동 전 UI 검증용
// 변경 후 handleRoute()로 현재 화면 리렌더 → 그리드/툴바 자동 갱신
// ══════════════════════════════════════════

// 화면 다시 그리기 (현재 hash 기준)
// 현재 컨텍스트에 맞는 역할 라벨 반환 — 테넌트 내부에서는 "테넌트" 접두사 생략
function getRoleLabel(role) {
  const v = CURRENT_CONTEXT && CURRENT_CONTEXT.variant;
  if (v === 'tenant-admin' || v === 'tenant-user') return ROLE_LABELS_SHORT[role] || role;
  return ROLE_LABELS[role] || role;
}

function rerenderCurrent() {
  try { handleRoute(); } catch (e) { console.error('rerender 실패', e); }
}

// ── 테넌트 CRUD ───────────────────────────
// 10자리 테넌트 ID 자동 생성: AD + 숫자6 + 영숫자2 (기존 시드와 동일 패턴)
//   숫자6: 현재 최대 일련번호 + 1, 영숫자2: 충돌 방지 랜덤
function generateTenantId() {
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // I,O 제외(가독성)
  const NUM = '0123456789';
  const pickRand = (src) => src[Math.floor(Math.random() * src.length)];
  // 기존 ID에서 숫자 6자리 부분의 최대값 + 1
  let maxSeq = 0;
  TENANTS.forEach(t => {
    const m = /^AD(\d{6})/.exec(t.id || '');
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  });
  const seq = String(maxSeq + 1).padStart(6, '0');
  // 충돌 회피
  for (let i = 0; i < 100; i++) {
    const tail = pickRand(ALPHA) + pickRand(ALPHA + NUM);
    const candidate = `AD${seq}${tail}`;
    if (!TENANTS.some(t => t.id === candidate)) return candidate;
  }
  return `AD${seq}ZZ`;
}

function openTenantModal(mode, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';
  // 신규 등록 시 ID 자동 생성, 수정 시 기존 데이터 로드
  let data = {
    id: '', slug: '', name: '',
    customerType: 'CORP', status: 'ACTIVE',
    bizRegNo: '', corpRegNo: '', representative: '',
    industry: '', businessType: '',
    joinDate: new Date().toISOString().slice(0, 10), terminateDate: '',
    adminEmail: '',
  };
  if (mode === 'create') {
    data.id = generateTenantId();
  } else if (mode === 'edit' && id) {
    const found = TENANTS.find(t => t.id === id);
    if (found) data = { ...data, ...found, terminateDate: found.terminateDate || '' };
  }

  // 등록 모드에서는 테넌트 관리자 1명 정보를 함께 입력 (필수)
  const isCreate = mode === 'create';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${isCreate ? '테넌트 등록' : '테넌트 수정'}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>

    <!-- ── 1. 고객(테넌트) 기본 ── -->
    <div class="form-section-title" style="font-size:13px;font-weight:600;color:#0046FF;margin:4px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">고객 정보</div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">고객 ID * <span style="color:#888;font-weight:400;font-size:11px;">(자동 생성·10자리)</span></label>
        <input class="form-input" id="tnt-f-id" value="${data.id}" readonly style="background:#f5f5f5;" />
      </div>
      <div class="form-group">
        <label class="form-label">Slug *</label>
        <input class="form-input" id="tnt-f-slug" value="${data.slug}" placeholder="예: shinhan-bank" ${!isCreate ? 'readonly style="background:#f5f5f5;"' : ''} />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">고객명 *</label>
        <input class="form-input" id="tnt-f-name" value="${data.name}" placeholder="예: 신한은행" />
      </div>
      <div class="form-group">
        <label class="form-label">고객 구분 *</label>
        <select class="form-select" id="tnt-f-type">
          <option value="CORP"     ${data.customerType === 'CORP' ? 'selected' : ''}>법인</option>
          <option value="INDIV"    ${data.customerType === 'INDIV' ? 'selected' : ''}>개인</option>
          <option value="INTERNAL" ${data.customerType === 'INTERNAL' ? 'selected' : ''}>내부조직</option>
          <option value="GROUP"    ${data.customerType === 'GROUP' ? 'selected' : ''}>그룹사</option>
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">사업자등록번호</label>
        <input class="form-input" id="tnt-f-biz" value="${data.bizRegNo}" placeholder="예: 123-45-67890" />
      </div>
      <div class="form-group">
        <label class="form-label">법인등록번호</label>
        <input class="form-input" id="tnt-f-corp" value="${data.corpRegNo}" placeholder="예: 110111-1234567" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">대표자명</label>
        <input class="form-input" id="tnt-f-rep" value="${data.representative}" placeholder="예: 홍길동" />
      </div>
      <div class="form-group">
        <label class="form-label">대표 이메일 *</label>
        <input class="form-input" id="tnt-f-email" value="${data.adminEmail}" placeholder="예: admin@shinhan-bank.com" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">업종</label>
        <input class="form-input" id="tnt-f-industry" value="${data.industry}" placeholder="예: 금융업" />
      </div>
      <div class="form-group">
        <label class="form-label">업태</label>
        <input class="form-input" id="tnt-f-bizType" value="${data.businessType}" placeholder="예: 신용카드업" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">고객 상태 *</label>
        <select class="form-select" id="tnt-f-status">
          <option value="ACTIVE"     ${data.status === 'ACTIVE' ? 'selected' : ''}>활성</option>
          <option value="DORMANT"    ${data.status === 'DORMANT' ? 'selected' : ''}>휴면</option>
          <option value="SUSPENDED"  ${data.status === 'SUSPENDED' ? 'selected' : ''}>정지</option>
          <option value="TERMINATED" ${data.status === 'TERMINATED' ? 'selected' : ''}>해지</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">가입일 *</label>
        <input class="form-input" type="date" id="tnt-f-joinDate" value="${data.joinDate}" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">해지일 <span style="color:#888;font-weight:400;font-size:11px;">(상태=해지 시 입력)</span></label>
        <input class="form-input" type="date" id="tnt-f-termDate" value="${data.terminateDate}" />
      </div>
      <div class="form-group"><!-- 좌우 정렬용 빈 칸 --></div>
    </div>

    ${(() => {
      // 수정 모드: 기존 테넌트 관리자 조회, 등록 모드: 빈 양식
      const adm = isCreate ? null : USERS.find(u => u.tenantId === data.id && u.roles.includes('ROLE_TENANT_ADMIN'));
      return `
    <!-- ── 2. 테넌트 관리자 (${isCreate ? '등록 시 1명 필수' : '수정'}) ── -->
    <div class="form-section-title" style="font-size:13px;font-weight:600;color:#0046FF;margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">테넌트 관리자 ${isCreate ? '<span style="color:#d32f2f;font-weight:600;">(필수 1명)</span>' : ''}</div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">사번/ID *</label>
        <input class="form-input" id="adm-f-username" value="${adm ? adm.username : ''}" placeholder="예: shc-admin" ${!isCreate ? 'readonly style="background:#f5f5f5;"' : ''} />
      </div>
      <div class="form-group">
        <label class="form-label">이름 *</label>
        <input class="form-input" id="adm-f-name" value="${adm ? adm.name : ''}" placeholder="예: 김신한" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">부서 *</label>
        <input class="form-input" id="adm-f-dept" value="${adm ? (adm.department || '') : ''}" placeholder="예: 클라우드운영팀" />
      </div>
      <div class="form-group">
        <label class="form-label">직책</label>
        <input class="form-input" id="adm-f-title" value="${adm ? (adm.title || '') : ''}" placeholder="예: 팀장" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">전화번호 *</label>
        <input class="form-input" id="adm-f-phone" value="${adm ? (adm.phone || '') : ''}" placeholder="예: 010-1234-5678" />
      </div>
      <div class="form-group">
        <label class="form-label">이메일 *</label>
        <input class="form-input" id="adm-f-email" value="${adm ? (adm.email || '') : ''}" placeholder="예: admin@shinhan-bank.com" />
      </div>
    </div>
    `;
    })()}

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveTenant('${mode}', '${data.id || ''}')">${isCreate ? '등록' : '저장'}</button>
    </div>
  `;
  overlay.classList.add('active');
  // 외부 클릭 차단 + Tab 포커스 트랩
  try { activateModalTrap(modal); } catch (e) {}
  setTimeout(() => document.getElementById(isCreate ? 'tnt-f-slug' : 'tnt-f-name')?.focus(), 200);
}

function saveTenant(mode, originalId) {
  // ── 고객 기본 ──
  const id = document.getElementById('tnt-f-id').value.trim();
  const slug = document.getElementById('tnt-f-slug').value.trim();
  const name = document.getElementById('tnt-f-name').value.trim();
  const customerType = document.getElementById('tnt-f-type').value;
  const bizRegNo = document.getElementById('tnt-f-biz').value.trim();
  const corpRegNo = document.getElementById('tnt-f-corp').value.trim();
  const representative = document.getElementById('tnt-f-rep').value.trim();
  const industry = document.getElementById('tnt-f-industry').value.trim();
  const businessType = document.getElementById('tnt-f-bizType').value.trim();
  const adminEmail = document.getElementById('tnt-f-email').value.trim();
  const status = document.getElementById('tnt-f-status').value;
  const joinDate = document.getElementById('tnt-f-joinDate').value;
  const terminateDate = document.getElementById('tnt-f-termDate').value || null;

  // 필수 검증 — 고객 기본
  if (!id || !slug || !name || !adminEmail || !joinDate) {
    showToast('error', '고객 정보의 필수 항목을 모두 입력해 주세요'); return;
  }
  if (mode === 'create' && !/^AD\d{6}[A-Z0-9]{2}$/.test(id)) {
    showToast('error', '테넌트 ID 형식이 올바르지 않습니다 (자동생성 실패)'); return;
  }
  if (status === 'TERMINATED' && !terminateDate) {
    showToast('error', '상태가 해지인 경우 해지일을 입력해 주세요'); return;
  }

  if (mode === 'create') {
    // ── 신규 등록: 테넌트 관리자 1명 정보 동시 검증 ──
    const admUser = document.getElementById('adm-f-username').value.trim();
    const admName = document.getElementById('adm-f-name').value.trim();
    const admDept = document.getElementById('adm-f-dept').value.trim();
    const admTitle = document.getElementById('adm-f-title').value.trim();
    const admPhone = document.getElementById('adm-f-phone').value.trim();
    const admEmail = document.getElementById('adm-f-email').value.trim();
    if (!admUser || !admName || !admDept || !admPhone || !admEmail) {
      showToast('error', '테넌트 관리자 정보(사번·이름·부서·전화·이메일)를 모두 입력해 주세요'); return;
    }
    // 중복 검사
    if (TENANTS.some(t => t.id === id)) { showToast('error', '이미 사용 중인 테넌트 ID입니다'); return; }
    if (TENANTS.some(t => t.slug === slug)) { showToast('error', '이미 사용 중인 Slug입니다'); return; }
    if (USERS.some(u => u.username === admUser)) { showToast('error', '이미 사용 중인 관리자 사번/ID입니다'); return; }

    // 테넌트 push
    TENANTS.push({
      id, slug, name, customerType, status,
      bizRegNo, corpRegNo, representative,
      industry, businessType,
      joinDate, terminateDate,
      adminEmail, createdAt: new Date().toISOString().substring(0, 19),
    });
    // 테넌트 관리자 USER push (ROLE_TENANT_ADMIN, 해당 테넌트 소속)
    const newUserId = USERS.length ? Math.max(...USERS.map(u => u.id)) + 1 : 1;
    USERS.push({
      id: newUserId,
      username: admUser, name: admName, phone: admPhone, email: admEmail,
      department: admDept, title: admTitle || null,
      roles: ['ROLE_TENANT_ADMIN'], tenantId: id,
      isActive: true,
      createdAt: new Date().toISOString().substring(0, 19),
      pwResetRequested: false,
    });
    logAudit(AUDIT_ACTIONS.CREATE, '테넌트 등록', `ID:${id}, Slug:${slug}, 이름:${name}, 관리자:${admUser}`);
    showToast('success', `${name} 테넌트와 관리자(${admName})를 등록했습니다`);
  } else {
    // ── 수정: 테넌트 관리자 정보도 함께 갱신 ──
    const admName = document.getElementById('adm-f-name')?.value.trim();
    const admDept = document.getElementById('adm-f-dept')?.value.trim();
    const admTitle = document.getElementById('adm-f-title')?.value.trim();
    const admPhone = document.getElementById('adm-f-phone')?.value.trim();
    const admEmail = document.getElementById('adm-f-email')?.value.trim();
    if (!admName || !admDept || !admPhone || !admEmail) {
      showToast('error', '테넌트 관리자 정보(이름·부서·전화·이메일)를 모두 입력해 주세요'); return;
    }
    const item = TENANTS.find(t => t.id === originalId);
    if (item) {
      Object.assign(item, {
        name, customerType, status,
        bizRegNo, corpRegNo, representative,
        industry, businessType,
        joinDate, terminateDate,
        adminEmail,
      });
      // 테넌트 관리자 USER 정보 갱신 (사번/ID는 키 — readonly)
      const admUser = USERS.find(u => u.tenantId === originalId && u.roles.includes('ROLE_TENANT_ADMIN'));
      if (admUser) {
        Object.assign(admUser, { name: admName, department: admDept, title: admTitle || null, phone: admPhone, email: admEmail });
      }
      logAudit(AUDIT_ACTIONS.UPDATE, '테넌트 수정', `ID:${item.id}, 이름:${name}, 상태:${status}`);
      showToast('success', `${name} 테넌트 정보를 수정했습니다`);
    }
  }
  closeModal();
  rerenderCurrent();
}

function deleteTenant(id) {
  const item = TENANTS.find(t => t.id === id);
  if (!item) return;
  // FK 가드: 계약·사용자가 있으면 삭제 차단
  const contractCount = CONTRACTS.filter(c => c.tenantId === id).length;
  const userCount = USERS.filter(u => u.tenantId === id).length;
  if (contractCount > 0 || userCount > 0) {
    showToast('error', `삭제 불가: 계약 ${contractCount}건, 사용자 ${userCount}명이 연결되어 있습니다`);
    return;
  }
  if (!confirm(`${item.name} 테넌트를 삭제하시겠어요?`)) return;
  const idx = TENANTS.findIndex(t => t.id === id);
  TENANTS.splice(idx, 1);
  logAudit(AUDIT_ACTIONS.DELETE, '테넌트 삭제', `ID:${id}, 이름:${item.name}`);
  showToast('success', `${item.name} 테넌트를 삭제했습니다`);
  rerenderCurrent();
}

// ── 계약 CRUD ───────────────────────────
function openContractModal(mode, idOrTenantId) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';

  // 현재 사용자 역할 — SYS_OPS/SYS_ADMIN만 편집 가능
  const curRole = (CURRENT_USER && CURRENT_USER.roles && CURRENT_USER.roles[0]) || '';
  const isSysOps = curRole === 'ROLE_SYS_OPS' || curRole === 'ROLE_SYS_ADMIN';

  // 기본값 — 신규 등록 시 합리적 디폴트 (월별/후불/부가세 별도/매월 5일/30일 납부)
  let data = {
    id: '', code: '', name: '', tenantId: '',
    type: 'DIRECT', currency: 'KRW', billing: 'MONTHLY', status: 'ACTIVE',
    effectiveFrom: '', effectiveTo: '',
    taxType: 'VAT_EXCLUDED', paymentTerm: 'POSTPAID',
    invoiceIssueDay: 5, paymentDueDays: 30,
  };
  if (mode === 'edit') {
    const found = CONTRACTS.find(c => c.id === idOrTenantId);
    if (found) data = { ...data, ...found, effectiveTo: found.effectiveTo || '' };
  } else {
    data.tenantId = idOrTenantId;
  }
  const tenant = TENANTS.find(t => t.id === data.tenantId);

  // SYS_OPS 신규 등록 시: 테넌트 선택 드롭다운 렌더링
  const tenantSelectorHtml = (isSysOps && mode === 'create') ? `
    <div class="cur-form-row">
      <div class="form-group" style="flex:1;">
        <label class="form-label">고객사(조직) *</label>
        <select class="form-select" id="ctr-f-tenant">
          <option value="" disabled ${!data.tenantId ? 'selected' : ''}>조직을 선택하세요</option>
          ${TENANTS.filter(t => t.status === 'ACTIVE').map(t =>
            `<option value="${t.id}" ${t.id === data.tenantId ? 'selected' : ''}>${t.name}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  ` : '';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${mode === 'create' ? '계약 등록' : '계약 수정'} ${tenant ? `<span style="font-size:13px;color:var(--sh-dark-secondary);font-weight:400;">— ${tenant.name}</span>` : ''}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>

    <!-- ── 1. 계약 식별 ── -->
    <div class="form-section-title" style="font-size:13px;font-weight:600;color:#0046FF;margin:4px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">계약 정보</div>
    ${tenantSelectorHtml}
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">계약 ID(코드) *</label>
        <input class="form-input" id="ctr-f-code" value="${data.code}" placeholder="예: SHC-2026-003" ${mode === 'edit' ? 'readonly style="background:#f5f5f5;"' : ''} />
      </div>
      <div class="form-group">
        <label class="form-label">계약명 *</label>
        <input class="form-input" id="ctr-f-name" value="${data.name}" placeholder="예: AWS 직계약 2026" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">계약 시작일 *</label>
        <input class="form-input" id="ctr-f-from" type="date" value="${data.effectiveFrom || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">계약 종료일 <span style="color:#888;font-weight:400;font-size:11px;">(미정 시 비워둠)</span></label>
        <input class="form-input" id="ctr-f-to" type="date" value="${data.effectiveTo || ''}" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">계약 상태 *</label>
        <select class="form-select" id="ctr-f-status">
          <option value="ACTIVE"  ${data.status === 'ACTIVE'  ? 'selected' : ''}>활성(ACTIVE)</option>
          <option value="DRAFT"   ${data.status === 'DRAFT'   ? 'selected' : ''}>초안(DRAFT)</option>
          <option value="EXPIRED" ${data.status === 'EXPIRED' ? 'selected' : ''}>만료(EXPIRED)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">계약 유형 *</label>
        <select class="form-select" id="ctr-f-type">
          <option value="DIRECT"   ${data.type === 'DIRECT'   ? 'selected' : ''}>직접계약</option>
          <option value="AGENT"    ${data.type === 'AGENT'    ? 'selected' : ''}>대행</option>
          <option value="MSP"      ${data.type === 'MSP'      ? 'selected' : ''}>MSP</option>
          <option value="RESELL"   ${data.type === 'RESELL'   ? 'selected' : ''}>리셀링</option>
          <option value="INTERNAL" ${data.type === 'INTERNAL' ? 'selected' : ''}>그룹내부정산</option>
        </select>
      </div>
    </div>

    <!-- ── 2. 과금/정산 ── -->
    <div class="form-section-title" style="font-size:13px;font-weight:600;color:#0046FF;margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">과금 · 정산 조건</div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">과금 통화 *</label>
        <select class="form-select" id="ctr-f-currency">
          <option value="KRW" ${data.currency === 'KRW' ? 'selected' : ''}>KRW (원)</option>
          <option value="USD" ${data.currency === 'USD' ? 'selected' : ''}>USD (달러)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">정산 주기 *</label>
        <select class="form-select" id="ctr-f-billing">
          <option value="MONTHLY"    ${data.billing === 'MONTHLY'    ? 'selected' : ''}>월</option>
          <option value="QUARTERLY"  ${data.billing === 'QUARTERLY'  ? 'selected' : ''}>분기</option>
          <option value="SEMIANNUAL" ${data.billing === 'SEMIANNUAL' ? 'selected' : ''}>반기</option>
          <option value="YEARLY"     ${data.billing === 'YEARLY'     ? 'selected' : ''}>연</option>
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">세금 적용 방식 *</label>
        <select class="form-select" id="ctr-f-tax">
          <option value="VAT_INCLUDED" ${data.taxType === 'VAT_INCLUDED' ? 'selected' : ''}>부가세 포함</option>
          <option value="VAT_EXCLUDED" ${data.taxType === 'VAT_EXCLUDED' ? 'selected' : ''}>부가세 별도</option>
          <option value="TAX_FREE"     ${data.taxType === 'TAX_FREE'     ? 'selected' : ''}>면세</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">결제 조건 *</label>
        <select class="form-select" id="ctr-f-pay">
          <option value="POSTPAID"  ${data.paymentTerm === 'POSTPAID'  ? 'selected' : ''}>후불</option>
          <option value="PREPAID"   ${data.paymentTerm === 'PREPAID'   ? 'selected' : ''}>선불</option>
          <option value="MONTH_END" ${data.paymentTerm === 'MONTH_END' ? 'selected' : ''}>월말정산</option>
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">청구서 발행 기준일 * <span style="color:#888;font-weight:400;font-size:11px;">(매월 1~28)</span></label>
        <input class="form-input" id="ctr-f-issueDay" type="number" min="1" max="28" value="${data.invoiceIssueDay}" />
      </div>
      <div class="form-group">
        <label class="form-label">납부 기한 * <span style="color:#888;font-weight:400;font-size:11px;">(청구일 기준 + N일)</span></label>
        <input class="form-input" id="ctr-f-dueDays" type="number" min="0" max="180" value="${data.paymentDueDays}" />
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveContract('${mode}', '${data.id || ''}', '${data.tenantId}')">${mode === 'create' ? '등록' : '저장'}</button>
    </div>
  `;
  overlay.classList.add('active');
  // 모달 활성 시 외부 클릭 차단 + Tab 포커스 트랩 부착
  try { activateModalTrap(modal); } catch (e) {}
  setTimeout(() => document.getElementById(mode === 'create' ? 'ctr-f-code' : 'ctr-f-name')?.focus(), 200);
}

function saveContract(mode, originalId, tenantId) {
  // SYS_OPS 신규 등록 시: 모달의 테넌트 선택 드롭다운 값을 우선 사용
  const tenantSelect = document.getElementById('ctr-f-tenant');
  if (tenantSelect) tenantId = tenantSelect.value;
  if (mode === 'create' && !tenantId) { showToast('error', '고객사(조직)를 선택해 주세요'); return; }

  const code = document.getElementById('ctr-f-code').value.trim();
  const name = document.getElementById('ctr-f-name').value.trim();
  const type = document.getElementById('ctr-f-type').value;
  const currency = document.getElementById('ctr-f-currency').value;
  const billing = document.getElementById('ctr-f-billing').value;
  const status = document.getElementById('ctr-f-status').value;
  const effectiveFrom = document.getElementById('ctr-f-from').value;
  const effectiveTo = document.getElementById('ctr-f-to').value;
  const taxType = document.getElementById('ctr-f-tax').value;
  const paymentTerm = document.getElementById('ctr-f-pay').value;
  const invoiceIssueDay = parseInt(document.getElementById('ctr-f-issueDay').value, 10);
  const paymentDueDays = parseInt(document.getElementById('ctr-f-dueDays').value, 10);

  // 필수/범위 검증
  if (!code || !name || !effectiveFrom) { showToast('error', '필수 항목(코드/이름/시작일)을 입력해 주세요'); return; }
  if (!Number.isInteger(invoiceIssueDay) || invoiceIssueDay < 1 || invoiceIssueDay > 28) {
    showToast('error', '청구서 발행 기준일은 1~28 사이의 정수여야 합니다'); return;
  }
  if (!Number.isInteger(paymentDueDays) || paymentDueDays < 0 || paymentDueDays > 180) {
    showToast('error', '납부 기한은 0~180일 사이의 정수여야 합니다'); return;
  }
  if (effectiveTo && effectiveTo < effectiveFrom) {
    showToast('error', '계약 종료일이 시작일보다 빠를 수 없습니다'); return;
  }

  if (mode === 'create') {
    if (CONTRACTS.some(c => c.code === code)) { showToast('error', '이미 사용 중인 계약 코드입니다'); return; }
    const newId = code; // 더미: code를 id로 사용 (기존 데이터 패턴과 일치)
    const tenantSlug = (TENANTS.find(t => t.id === tenantId) || {}).slug || '';
    CONTRACTS.push({
      id: newId, code, name, tenantId, tenantSlug,
      type, currency, billing, status, effectiveFrom, effectiveTo: effectiveTo || null,
      taxType, paymentTerm, invoiceIssueDay, paymentDueDays,
    });
    logAudit(AUDIT_ACTIONS.CREATE, '계약 등록', `코드:${code}, 테넌트:${tenantId}, 유형:${type}, 통화:${currency}, 정산:${billing}`);
    showToast('success', `${code} 계약을 등록했습니다`);
  } else {
    const item = CONTRACTS.find(c => c.id === originalId);
    if (item) {
      Object.assign(item, {
        name, type, currency, billing, status,
        effectiveFrom, effectiveTo: effectiveTo || null,
        taxType, paymentTerm, invoiceIssueDay, paymentDueDays,
      });
      logAudit(AUDIT_ACTIONS.UPDATE, '계약 수정', `코드:${item.code}, 상태:${status}, 유형:${type}`);
      showToast('success', `${item.code} 계약을 수정했습니다`);
    }
  }
  closeModal();
  rerenderCurrent();
}

function deleteContract(id) {
  const item = CONTRACTS.find(c => c.id === id);
  if (!item) return;
  // FK 가드: 계정 연결 시 삭제 차단
  const accountCount = CLOUD_ACCOUNTS.filter(a => a.contractId === id).length;
  if (accountCount > 0) {
    showToast('error', `삭제 불가: Payer 계정 ${accountCount}건이 연결되어 있습니다`);
    return;
  }
  if (!confirm(`${item.code} 계약을 삭제하시겠어요?`)) return;
  const idx = CONTRACTS.findIndex(c => c.id === id);
  CONTRACTS.splice(idx, 1);
  logAudit(AUDIT_ACTIONS.DELETE, '계약 삭제', `코드:${item.code}`);
  showToast('success', `${item.code} 계약을 삭제했습니다`);
  rerenderCurrent();
}

// ── CUR 컬럼 별칭 CRUD ───────────────────────────
function openAliasModal(mode, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';
  let data = { id: 0, standardColumn: '', sourceColumn: '', department: '', isActive: true };
  if (mode === 'edit' && id) {
    const found = COLUMN_ALIASES.find(a => a.id === id);
    if (found) data = { ...found };
  }
  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${mode === 'create' ? 'CUR 컬럼 별칭 등록' : 'CUR 컬럼 별칭 수정'}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">CUR 컬럼 ID *</label>
        <input class="form-input" id="alias-f-standard" value="${data.standardColumn}" placeholder="예: cost_amount" />
      </div>
      <div class="form-group">
        <label class="form-label">업로드 컬럼 *</label>
        <input class="form-input" id="alias-f-source" value="${data.sourceColumn}" placeholder="예: 비용금액" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">부서 한정 (비우면 전체)</label>
        <input class="form-input" id="alias-f-dept" value="${data.department || ''}" placeholder="예: 클라우드운영팀" />
      </div>
      <div class="form-group">
        <label class="form-label">활성</label>
        <select class="form-select" id="alias-f-active">
          <option value="true" ${data.isActive ? 'selected' : ''}>활성</option>
          <option value="false" ${!data.isActive ? 'selected' : ''}>비활성</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveAlias('${mode}', ${id || 0})">${mode === 'create' ? '등록' : '저장'}</button>
    </div>
  `;
  overlay.classList.add('active');
  try { activateModalTrap(modal); } catch (e) {}
  setTimeout(() => document.getElementById('alias-f-standard')?.focus(), 200);
}

function saveAlias(mode, id) {
  const standardColumn = document.getElementById('alias-f-standard').value.trim();
  const sourceColumn = document.getElementById('alias-f-source').value.trim();
  const department = document.getElementById('alias-f-dept').value.trim() || null;
  const isActive = document.getElementById('alias-f-active').value === 'true';
  if (!standardColumn || !sourceColumn) { showToast('error', 'CUR 컬럼 ID와 업로드 컬럼은 필수입니다'); return; }
  if (mode === 'create') {
    // 동일 (표준+소스+부서) 중복 차단
    if (COLUMN_ALIASES.some(a => a.standardColumn === standardColumn && a.sourceColumn === sourceColumn && (a.department || null) === department)) {
      showToast('error', '동일한 매핑이 이미 존재합니다'); return;
    }
    const newId = (COLUMN_ALIASES.length ? Math.max(...COLUMN_ALIASES.map(a => a.id)) : 0) + 1;
    COLUMN_ALIASES.push({ id: newId, standardColumn, sourceColumn, department, isActive });
    logAudit(AUDIT_ACTIONS.CREATE, '컬럼 별칭 등록', `표준:${standardColumn}, 소스:${sourceColumn}`);
    showToast('success', `별칭을 등록했습니다 (${standardColumn} ← ${sourceColumn})`);
  } else {
    const item = COLUMN_ALIASES.find(a => a.id === id);
    if (item) {
      Object.assign(item, { standardColumn, sourceColumn, department, isActive });
      logAudit(AUDIT_ACTIONS.UPDATE, '컬럼 별칭 수정', `ID:${id}, 표준:${standardColumn}`);
      showToast('success', '별칭을 수정했습니다');
    }
  }
  closeModal();
  rerenderCurrent();
}

function deleteAlias(id) {
  const item = COLUMN_ALIASES.find(a => a.id === id);
  if (!item) return;
  if (!confirm(`별칭을 삭제하시겠어요? (${item.standardColumn} ← ${item.sourceColumn})`)) return;
  const idx = COLUMN_ALIASES.findIndex(a => a.id === id);
  COLUMN_ALIASES.splice(idx, 1);
  logAudit(AUDIT_ACTIONS.DELETE, '컬럼 별칭 삭제', `ID:${id}, 표준:${item.standardColumn}`);
  showToast('success', '별칭을 삭제했습니다');
  rerenderCurrent();
}

// ── 권한 위임(Scope) — 사용자별 SubAccount 가시 범위 편집 ───────────────────────────
function openScopeEditModal(userId, tenantId) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  const user = USERS.find(u => u.id === userId);
  const tenant = TENANTS.find(t => t.id === tenantId);
  if (!user || !tenant) { showToast('error', '대상을 찾을 수 없습니다'); return; }
  const role = user.roles[0];
  const isAdminLike = role === 'ROLE_TENANT_ADMIN' || role === 'ROLE_TENANT_APPROVER';
  const tenantSubs = CLOUD_SUB_ACCOUNTS.filter(s => s.tenantId === tenantId);
  const currentScopes = TENANT_USER_SCOPES.filter(s => s.userId === userId).map(s => s.subAccountId);
  modal.className = 'modal cur-modal';
  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">권한 편집 — ${user.name} <span style="font-size:13px;color:var(--sh-dark-secondary);font-weight:400;">(${getRoleLabel(role)})</span></h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="color:var(--sh-dark-secondary);font-size:13px;margin:0 0 12px;">
      ${isAdminLike
        ? `${getRoleLabel(role)}는 항상 전체 SubAccount(FULL)를 볼 수 있어 편집이 비활성화됩니다.`
        : '체크한 SubAccount만 이 사용자에게 보입니다. 체크 해제 시 해당 SubAccount의 비용은 마스킹됩니다.'}
    </p>
    <div style="max-height:300px;overflow-y:auto;border:1px solid var(--sh-gray-border);border-radius:6px;padding:8px;">
      ${tenantSubs.map(s => `
        <label style="display:flex;align-items:center;padding:6px 8px;gap:8px;${isAdminLike ? 'opacity:0.5;' : ''}">
          <input type="checkbox" data-sub-id="${s.id}"
            ${currentScopes.includes(s.id) || isAdminLike ? 'checked' : ''}
            ${isAdminLike ? 'disabled' : ''} />
          <span style="flex:1;"><strong>${s.id}</strong> · ${s.name || ''}</span>
          <span style="font-size:12px;color:var(--sh-dark-secondary);">${s.contractId || '-'}</span>
        </label>
      `).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveScope(${userId},'${tenantId}')" ${isAdminLike ? 'disabled' : ''}>저장</button>
    </div>
  `;
  overlay.classList.add('active');
  try { activateModalTrap(modal); } catch (e) {}
}

function saveScope(userId, tenantId) {
  const checks = document.querySelectorAll('#modal-content input[type="checkbox"][data-sub-id]');
  const newSubIds = Array.from(checks).filter(c => c.checked).map(c => c.getAttribute('data-sub-id'));
  // 기존 사용자 scope 모두 제거 후 새로 삽입
  for (let i = TENANT_USER_SCOPES.length - 1; i >= 0; i--) {
    if (TENANT_USER_SCOPES[i].userId === userId) TENANT_USER_SCOPES.splice(i, 1);
  }
  const maxId = TENANT_USER_SCOPES.length ? Math.max(...TENANT_USER_SCOPES.map(s => s.id || 0)) : 0;
  newSubIds.forEach((subId, idx) => {
    TENANT_USER_SCOPES.push({ id: maxId + idx + 1, userId, tenantId, subAccountId: subId });
  });
  const user = USERS.find(u => u.id === userId);
  logAudit(AUDIT_ACTIONS.UPDATE, '권한 위임 변경', `대상:${user ? user.username : userId}, 가시 SubAccount:${newSubIds.length}건`);
  showToast('success', `${user ? user.name : '사용자'}의 가시 범위를 ${newSubIds.length}건으로 갱신했습니다`);
  closeModal();
  rerenderCurrent();
}

function bulkResetScopes(tenantId) {
  if (!confirm('모든 PARTIAL/NONE 사용자 권한을 초기화하시겠어요?\n(관리자/승인자는 영향 없음)')) return;
  const tenantUsers = USERS.filter(u => u.tenantId === tenantId);
  const targetUserIds = tenantUsers
    .filter(u => u.roles[0] === 'ROLE_TENANT_USER')
    .map(u => u.id);
  let removed = 0;
  for (let i = TENANT_USER_SCOPES.length - 1; i >= 0; i--) {
    if (targetUserIds.includes(TENANT_USER_SCOPES[i].userId)) {
      TENANT_USER_SCOPES.splice(i, 1);
      removed++;
    }
  }
  logAudit(AUDIT_ACTIONS.UPDATE, '권한 위임 일괄 초기화', `조직:${tenantId}, 제거된 매핑:${removed}건`);
  showToast('success', `${removed}건의 매핑을 초기화했습니다`);
  rerenderCurrent();
}

// ══════════════════════════════════════════
// 1. 대시보드
// ══════════════════════════════════════════
// ── 시스템 대시보드 (admin-dashboard) — 플랫폼 운영 현황 ──
function renderSystemDashboard(el) {
  const role = CURRENT_USER && CURRENT_USER.roles && CURRENT_USER.roles[0];
  const isSysAdmin = role === 'ROLE_SYS_ADMIN';
  const lastMonth = MONTHLY_COSTS[MONTHLY_COSTS.length - 1].yearMonth;
  const latestCost = MONTHLY_COSTS[MONTHLY_COSTS.length - 1].cost;
  const prevCost = MONTHLY_COSTS[MONTHLY_COSTS.length - 2].cost;
  const momChange = prevCost ? Math.round(((latestCost - prevCost) / prevCost) * 1000) / 10 : 0;
  const momDir = momChange > 0 ? 'up' : momChange < 0 ? 'down' : 'neutral';
  const momIcon = momDir === 'up' ? '▲' : momDir === 'down' ? '▼' : '—';

  // 테넌트 / 계약 / 클라우드 계정 집계
  const tenantActive = TENANTS.filter(t => t.status === 'ACTIVE').length;
  const tenantTotal = TENANTS.length;
  const contractActive = CONTRACTS.filter(c => c.status === 'ACTIVE').length;
  const contractTotal = CONTRACTS.length;
  const contractExpired = CONTRACTS.filter(c => c.status === 'EXPIRED').length;
  const contractDraft = CONTRACTS.filter(c => c.status === 'DRAFT').length;
  const payerActive = CLOUD_ACCOUNTS.filter(a => a.status === 'ACTIVE').length;
  const linkedActive = CLOUD_SUB_ACCOUNTS.filter(s => s.status !== 'EXPIRED' && s.status !== 'INACTIVE').length;

  // 업로드 — 최근 6개월 상태 분포
  const recentBatches = UPLOAD_BATCHES.slice(-6);
  const uploadOk = recentBatches.filter(b => b.status === 'COMPLETED').length;
  const uploadErr = recentBatches.filter(b => b.status === 'ERROR').length;
  const uploadRun = recentBatches.filter(b => b.status === 'PROCESSING' || b.status === 'PENDING').length;

  // 플랫폼 메타
  const curColCount = (typeof CUR_COLUMNS !== 'undefined') ? CUR_COLUMNS.length : 0;
  const aliasActive = COLUMN_ALIASES.filter(a => a.isActive).length;
  const aliasTotal = COLUMN_ALIASES.length;
  const userActive = USERS.filter(u => u.isActive !== false).length;
  const userTotal = USERS.length;
  const auditCount = (typeof AUDIT_LOGS !== 'undefined') ? AUDIT_LOGS.length : 0;

  logAudit(AUDIT_ACTIONS.VIEW, '시스템 대시보드 조회', `기준월: ${lastMonth}`);

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">시스템 대시보드</h1>
      <p class="page-desc">클라우드 비용 리포팅 플랫폼 운영 현황 · ${lastMonth} 기준</p>
    </div>

    <!-- KPI 카드 -->
    <div class="kpi-grid">
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('#/admin/tenants')">
        <div class="kpi-label"><span class="kpi-label-icon sub"></span>운영 테넌트</div>
        <div class="kpi-value">${tenantActive}<span style="font-size:18px;color:#6b7280;font-weight:500;"> / ${tenantTotal}</span></div>
        <div class="kpi-change neutral">활성 고객사</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('#/admin/contracts')">
        <div class="kpi-label"><span class="kpi-label-icon report"></span>계약 현황</div>
        <div class="kpi-value">${contractActive}<span style="font-size:18px;color:#6b7280;font-weight:500;"> / ${contractTotal}</span></div>
        <div class="kpi-change ${contractExpired > 0 ? 'down' : 'neutral'}">활성 · 만료 ${contractExpired} · 초안 ${contractDraft}</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('#/admin/cloud-accounts')">
        <div class="kpi-label"><span class="kpi-label-icon cost"></span>클라우드 계정</div>
        <div class="kpi-value">${payerActive}<span style="font-size:18px;color:#6b7280;font-weight:500;"> / ${linkedActive}</span></div>
        <div class="kpi-change neutral">상위(Payer) / 하위(Linked) 활성</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="navigate('#/admin/ops/uploads')">
        <div class="kpi-label"><span class="kpi-label-icon change"></span>최근 업로드 (6개월)</div>
        <div class="kpi-value" style="display:flex;align-items:baseline;gap:8px;">
          <span style="color:#059669;">${uploadOk}</span>
          <span style="font-size:18px;color:#9ca3af;font-weight:400;">·</span>
          <span style="color:#d97706;">${uploadRun}</span>
          <span style="font-size:18px;color:#9ca3af;font-weight:400;">·</span>
          <span style="color:#dc2626;">${uploadErr}</span>
        </div>
        <div class="kpi-change ${uploadErr > 0 ? 'down' : 'neutral'}">완료 · 진행 · 오류</div>
      </div>
    </div>

    <!-- 차트 1 (2열) -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-card-title">월별 전체 비용 추이 (최근 12개월)</div>
        <div class="chart-container" id="chart-sys-cost-trend"></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title">테넌트별 이번달 비중</div>
        <div class="chart-container" id="chart-sys-tenant-ratio"></div>
      </div>
    </div>

    <!-- 최근 업로드 내역 -->
    <div class="section-card" style="margin-top:20px;">
      <div class="section-card-header">
        <span class="section-card-title">최근 업로드 내역</span>
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/admin/ops/uploads')">업로드 관리</button>
      </div>
      <div style="padding:4px 0;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;color:#374151;">
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:1px solid #e5e7eb;">대상 월</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:1px solid #e5e7eb;">업로더</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">행 수</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;border-bottom:1px solid #e5e7eb;">상태</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:1px solid #e5e7eb;">업로드 시각</th>
            </tr>
          </thead>
          <tbody>
            ${UPLOAD_BATCHES.slice(-8).reverse().map(b => `
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-weight:500;">${b.yearMonthLabel}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${(b.uploadedBy && b.uploadedBy.name) || '—'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-variant-numeric:tabular-nums;">${b.totalRows ? b.totalRows.toLocaleString() : '—'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${renderUploadStatusBadge(b.status)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${String(b.createdAt).replace('T', ' ').slice(0, 16)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 클라우드 제공자 분포 / 플랫폼 메타 (2열) -->
    <div class="chart-grid" style="margin-top:20px;">
      <div class="chart-card">
        <div class="chart-card-title">클라우드 제공자 분포 (상위 계정)</div>
        <div class="chart-container" id="chart-sys-provider"></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title">플랫폼 메타정보</div>
        <div style="padding:8px 4px;display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;">
          ${renderMetaItem('CUR 컬럼', curColCount + '개', '#/admin/ops/cur-columns')}
          ${renderMetaItem('활성 별칭', `${aliasActive} / ${aliasTotal}개`, '#/admin/ops/aliases')}
          ${renderMetaItem('전체 사용자', `${userActive} / ${userTotal}명`, null)}
          ${renderMetaItem('감사 로그', auditCount.toLocaleString() + '건', isSysAdmin ? '#/admin/audit-logs' : null)}
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    try { initSysCostTrendChart(); } catch (e) { console.error(e); }
    try { initSysTenantRatioChart(); } catch (e) { console.error(e); }
    try { initSysProviderChart(); } catch (e) { console.error(e); }
  }, 50);
}

// ── 시스템 대시보드 헬퍼 ──
function renderUploadStatusBadge(status) {
  const map = {
    COMPLETED:  { label: '완료',   bg: '#d1fae5', fg: '#065f46' },
    PROCESSING: { label: '진행중', bg: '#fef3c7', fg: '#92400e' },
    PENDING:    { label: '대기',   bg: '#e0e7ff', fg: '#3730a3' },
    ERROR:      { label: '오류',   bg: '#fee2e2', fg: '#991b1b' },
  };
  const s = map[status] || { label: status || '—', bg: '#e5e7eb', fg: '#374151' };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${s.bg};color:${s.fg};font-weight:600;font-size:12px;">${s.label}</span>`;
}

function renderMetaItem(label, value, hash) {
  const clickable = hash ? 'cursor:pointer;' : '';
  const onclick = hash ? `onclick="navigate('${hash}')"` : '';
  return `
    <div ${onclick} style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafbfc;${clickable}display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#6b7280;font-size:12px;font-weight:500;">${label}</span>
      <span style="color:#111827;font-weight:700;font-size:14px;">${value}</span>
    </div>
  `;
}

function initSysCostTrendChart() {
  const chartEl = document.getElementById('chart-sys-cost-trend');
  if (!chartEl) return;
  const chart = echarts.init(chartEl);
  const recent12 = MONTHLY_COSTS.slice(-12);
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => `${params[0].name}<br/>${params[0].seriesName}: <b>${formatKRW(params[0].value)}</b>`,
    },
    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: recent12.map(d => d.yearMonth),
      axisLabel: { fontFamily: 'Pretendard', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontFamily: 'Pretendard', fontSize: 11, formatter: (v) => (v / 100000000).toFixed(1) + '억' },
    },
    series: [{
      name: '전체 월별 비용',
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

function initSysTenantRatioChart() {
  const chartEl = document.getElementById('chart-sys-tenant-ratio');
  if (!chartEl) return;
  const chart = echarts.init(chartEl);
  const latestCost = MONTHLY_COSTS[MONTHLY_COSTS.length - 1].cost;
  // 테넌트별 활성 하위계정 수 비율로 비용을 분배 (더미)
  const tenantCounts = TENANTS.map(t => ({
    name: t.name,
    count: CLOUD_SUB_ACCOUNTS.filter(s => s.tenantId === t.id && s.status !== 'EXPIRED' && s.status !== 'INACTIVE').length,
  }));
  const totalCount = tenantCounts.reduce((s, x) => s + x.count, 0) || 1;
  const data = tenantCounts.map((t, i) => ({
    name: t.name,
    value: Math.round(latestCost * (t.count / totalCount)),
    itemStyle: { color: shinhanPalette[i % shinhanPalette.length] },
  }));
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}<br/>추정 비용: <b>${formatKRW(p.value)}</b><br/>비중: ${p.percent}%`,
    },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontFamily: 'Pretendard', fontSize: 12 } },
    series: [{
      name: '테넌트별 비중',
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontFamily: 'Pretendard', fontSize: 11 },
      data,
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

function initSysProviderChart() {
  const chartEl = document.getElementById('chart-sys-provider');
  if (!chartEl) return;
  const chart = echarts.init(chartEl);
  const providerCount = {};
  CLOUD_ACCOUNTS.forEach(a => { providerCount[a.provider] = (providerCount[a.provider] || 0) + 1; });
  const labels = Object.keys(providerCount);
  const values = labels.map(k => providerCount[k]);
  const labelMap = (typeof CLOUD_PROVIDER_LABEL !== 'undefined') ? CLOUD_PROVIDER_LABEL : {};
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: labels.map(k => labelMap[k] || k),
      axisLabel: { fontFamily: 'Pretendard', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontFamily: 'Pretendard', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: values,
      barWidth: 28,
      itemStyle: {
        color: (p) => shinhanPalette[p.dataIndex % shinhanPalette.length],
        borderRadius: [4, 4, 0, 0],
      },
      label: { show: true, position: 'top', fontFamily: 'Pretendard', fontSize: 12, fontWeight: 600 },
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

function renderDashboard(el) {
  const kpi = DASHBOARD_KPI;
  const momDir = kpi.momChange > 0 ? 'up' : kpi.momChange < 0 ? 'down' : 'neutral';
  const momIcon = momDir === 'up' ? '▲' : momDir === 'down' ? '▼' : '—';
  const lastMonth = MONTHLY_COSTS[MONTHLY_COSTS.length - 1].yearMonth;

  // v2 컨텍스트 — 테넌트/계약 정보 표시
  const ctx = CURRENT_CONTEXT;
  const tenant = ctx.tenantId ? TENANTS.find(t => t.id === ctx.tenantId) : null;
  const contract = (ctx.contractId && ctx.contractId !== 'all') ? CONTRACTS.find(c => c.id === Number(ctx.contractId)) : null;
  const ctxLine = tenant && contract
    ? `${tenant.name} · ${contract.code} (${contract.currency}) · ${lastMonth} 기준`
    : tenant
      ? `${tenant.name} · ${lastMonth} 기준`
      : `${lastMonth} 기준 클라우드 비용 현황`;

  // 마스킹 시연: TENANT_USER가 부분 권한일 경우 KPI에 (마스킹) 보정 표시
  const isUser = CURRENT_USER && CURRENT_USER.roles && CURRENT_USER.roles[0] === 'ROLE_TENANT_USER';
  let visibleRatio = 1;
  if (isUser && contract) {
    const allSubs = CLOUD_SUB_ACCOUNTS.filter(s => s.contractId === contract.id);
    const userSubs = getUserScopeSubAccounts(CURRENT_USER.id);
    const visible = allSubs.filter(s => userSubs.includes(s.id)).length;
    if (allSubs.length) visibleRatio = visible / allSubs.length;
  }
  const maskedTotalCost = Math.round(kpi.totalCost * visibleRatio);
  const maskedPrevCost = Math.round(kpi.previousCost * visibleRatio);
  const maskedReportCount = visibleRatio < 1 ? Math.round(kpi.reportCount * visibleRatio) : kpi.reportCount;
  const maskedSubscriberCount = visibleRatio < 1 ? Math.round(kpi.subscriberCount * visibleRatio) : kpi.subscriberCount;
  const isMasked = visibleRatio < 1;

  logAudit(AUDIT_ACTIONS.VIEW, '대시보드 조회', `기준월: ${lastMonth} ${tenant ? '/ 테넌트:' + tenant.slug : ''} ${contract ? '/ 계약:' + contract.code : ''}${isMasked ? ' (가시 비율 ' + Math.round(visibleRatio*100) + '%)' : ''}`);

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">대시보드 ${tenant ? `<span class="page-title-badge">${tenant.name}</span>` : ''}</h1>
      <p class="page-desc">${ctxLine}${isMasked ? ' · <span style="color:var(--badge-warning-text);font-weight:600;">SubAccount 일부 마스킹 적용</span>' : ''}</p>
    </div>

    <!-- KPI 카드 -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon cost"></span>이번달 총 비용${isMasked ? ' (가시)' : ''}</div>
        <div class="kpi-value">${formatKRW(maskedTotalCost)}</div>
        <div class="kpi-change ${momDir}">${momIcon} 전월 대비 ${Math.abs(kpi.momChange)}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon change"></span>전월 대비 변동</div>
        <div class="kpi-value">${formatKRW(Math.abs(maskedTotalCost - maskedPrevCost))}</div>
        <div class="kpi-change ${momDir}">${momDir === 'up' ? '비용이 증가했어요' : '비용을 절감했어요'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon report"></span>생성된 리포트</div>
        <div class="kpi-value">${maskedReportCount}건</div>
        <div class="kpi-change neutral">최근 6개월 기준</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-label-icon sub"></span>활성 구독자</div>
        <div class="kpi-value">${maskedSubscriberCount}명</div>
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
  logAudit(AUDIT_ACTIONS.VIEW, '데이터 업로드 조회', `업로드 이력: ${UPLOAD_BATCHES.length}건`);

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
  logAudit(AUDIT_ACTIONS.VIEW, '리포트 라이브러리 조회', '유형: 전체, 기간: 전체');

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
  const cond = `유형: ${reportFilters.category || '전체'}, 기간: ${reportFilters.month || '전체'}, 검색어: ${reportFilters.search || '-'}`;
  logAudit(AUDIT_ACTIONS.VIEW, '리포트 라이브러리 조회', cond);
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
  try { activateModalTrap(modal); } catch (e) {}

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

// 리포트 템플릿별 데이터셋 추출
// 차트 유형에 따라 표시할 표 데이터와 헤더를 매핑
function getReportData(tpl, month) {
  if (tpl.chartType === 'line') {
    const recent = MONTHLY_COSTS.slice(-12);
    const rows = recent.map((d, i) => {
      const prev = i > 0 ? recent[i - 1].cost : d.cost;
      const delta = i > 0 ? ((d.cost - prev) / prev * 100) : 0;
      return [d.yearMonth, d.cost, `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`];
    });
    return { headers: ['대상 월', '비용(원)', '전월 대비'], rows, unit: 'KRW' };
  }
  if (tpl.chartType === 'bar' || tpl.chartType === 'pareto') {
    const top = SERVICE_COSTS.slice(0, 10);
    const total = top.reduce((s, d) => s + d.cost, 0);
    let cum = 0;
    const rows = top.map(d => {
      cum += d.cost;
      const ratio = (d.cost / total * 100).toFixed(1);
      const cumRatio = (cum / total * 100).toFixed(1);
      return tpl.chartType === 'pareto'
        ? [d.serviceName, d.cost, `${ratio}%`, `${cumRatio}%`]
        : [d.serviceName, d.cost, `${ratio}%`];
    });
    const headers = tpl.chartType === 'pareto'
      ? ['서비스', '비용(원)', '비중', '누적 비중']
      : ['서비스', '비용(원)', '비중'];
    return { headers, rows };
  }
  if (tpl.chartType === 'treemap') {
    const deptTags = TAG_COSTS.filter(t => t.tagName === 'department');
    const total = deptTags.reduce((s, d) => s + d.cost, 0);
    const rows = deptTags.map(d => [d.tagValue, d.cost, `${(d.cost / total * 100).toFixed(1)}%`]);
    return { headers: ['부서', '비용(원)', '비중'], rows };
  }
  // 기본 (차트 없는 리포트): 최근 3개월 계정별 비용
  const rows = ACCOUNT_COSTS.map(d => [d.accountName, d.cost]);
  return { headers: ['계정', '비용(원)'], rows };
}

// 리포트 다운로드 핸들러 — XLSX/PDF 분기
async function handleDownload(code) {
  const tpl = REPORT_TEMPLATES.find(t => t.code === code);
  if (!tpl) return;
  const month = document.getElementById('modal-month')?.value;
  const format = document.getElementById('modal-format')?.value;
  const data = getReportData(tpl, month);
  const fileBase = `${code}_${tpl.name}_${month}`;

  try {
    if (format === 'XLSX') {
      await exportReportToXlsx(tpl, month, data, fileBase);
    } else {
      await exportReportToPdf(tpl, month, data, fileBase);
    }
    showToast('success', `${fileBase}.${format.toLowerCase()} 파일을 다운로드했습니다`);
    const auditAction = format === 'PDF' ? AUDIT_ACTIONS.EXPORT_PDF : AUDIT_ACTIONS.EXPORT;
    logAudit(auditAction, `${tpl.name} 리포트 다운로드`,
      `코드: ${code}, 카테고리: ${tpl.category}, 대상 월: ${month}, 형식: ${format}, 파일명: ${fileBase}.${format.toLowerCase()}`);
  } catch (err) {
    console.error('리포트 다운로드 실패:', err);
    showToast('error', `다운로드 중 오류가 발생했습니다: ${err.message}`);
  }
}

// 리포트 XLSX 생성 — 제목/메타 블록 + 데이터 테이블 스타일링
async function exportReportToXlsx(tpl, month, data, fileBase) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('리포트');

  // 제목
  ws.mergeCells('A1', String.fromCharCode(64 + data.headers.length) + '1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${tpl.icon || ''} ${tpl.name}`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0046FF' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // 메타 정보 블록
  const meta = [
    ['코드', tpl.code],
    ['카테고리', tpl.category],
    ['대상 월', month],
    ['생성일시', formatDateTime(new Date().toISOString())],
    ['설명', tpl.description],
  ];
  let row = 3;
  meta.forEach(([k, v]) => {
    ws.getCell(`A${row}`).value = k;
    ws.getCell(`A${row}`).font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6FA' } };
    ws.getCell(`B${row}`).value = v;
    ws.getCell(`B${row}`).font = { name: 'Calibri', size: 11 };
    row++;
  });

  // 데이터 헤더
  const dataStartRow = row + 1;
  const headerRow = ws.getRow(dataStartRow);
  headerRow.values = data.headers;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  // 데이터 행
  data.rows.forEach(r => {
    const added = ws.addRow(r);
    added.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      // 숫자형 비용 컬럼: 천단위 구분
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    });
  });

  // 컬럼 너비 자동
  ws.columns.forEach((col, i) => {
    let max = (data.headers[i] || '').length;
    data.rows.forEach(r => {
      const len = String(r[i] ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max * 1.6 + 4, 40);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileBase}.xlsx`);
}

// 리포트 PDF 생성 — 히든 A4 영역에 렌더 → html2canvas → jsPDF (한글 유지)
async function exportReportToPdf(tpl, month, data, fileBase) {
  // 기존 인쇄 영역 정리
  const existed = document.getElementById('pdf-print-area');
  if (existed) existed.remove();

  const printArea = document.createElement('div');
  printArea.id = 'pdf-print-area';
  printArea.className = 'pdf-print-area';

  const chartImg = await capturePreviewChartDataUrl();
  const now = formatDateTime(new Date().toISOString());

  printArea.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-title">${tpl.icon || ''} ${tpl.name}</div>
      <div class="pdf-subtitle">${tpl.category} · 대상 월 ${month}</div>
    </div>
    <table class="pdf-meta">
      <tr><th>코드</th><td>${tpl.code}</td><th>카테고리</th><td>${tpl.category}</td></tr>
      <tr><th>대상 월</th><td>${month}</td><th>생성일시</th><td>${now}</td></tr>
      <tr><th>설명</th><td colspan="3">${tpl.description}</td></tr>
    </table>
    ${chartImg ? `<div class="pdf-chart"><img src="${chartImg}" alt="차트" /></div>` : ''}
    <div class="pdf-section-title">데이터</div>
    <table class="pdf-data">
      <thead>
        <tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.rows.map(r => `<tr>${r.map((v, i) => `<td style="text-align:${typeof v === 'number' ? 'right' : 'left'}">${typeof v === 'number' ? v.toLocaleString() : v}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    <div class="pdf-footer">Cloud Cost Reporting · ${now}</div>
  `;
  document.body.appendChild(printArea);

  const canvas = await html2canvas(printArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  // 페이지 분할 — 긴 리포트 대응
  let heightLeft = imgH;
  let position = margin;
  pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH, undefined, 'FAST');
  heightLeft -= (pageH - margin * 2);
  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH, undefined, 'FAST');
    heightLeft -= (pageH - margin * 2);
  }
  pdf.save(`${fileBase}.pdf`);

  printArea.remove();
}

// 모달 내 미리보기 차트를 PNG dataURL로 캡처 (없으면 null)
async function capturePreviewChartDataUrl() {
  const chartEl = document.getElementById('modal-preview-chart');
  if (!chartEl) return null;
  const chart = echarts.getInstanceByDom(chartEl);
  if (chart) return chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  return null;
}

function handleGenerate(code) {
  const month = document.getElementById('modal-month')?.value;
  showToast('info', `${code} 리포트를 ${month} 기준으로 생성합니다`);
}

// ── 모달 포커스 트랩 / 외부 클릭 차단 ──
// 정책: 모달 활성 시 (1) 오버레이 외부 클릭으로 닫히지 않고, (2) Tab/Shift+Tab 포커스가 모달 내부에서만 순환.
//       ESC 닫기는 그대로 유지(접근성). 모든 모달 open 함수는 마지막에 activateModalTrap(modal) 호출.
let __modalTrapHandler = null;
let __modalTrapTarget = null;
function getModalFocusables(modal) {
  if (!modal) return [];
  const sel = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
  return Array.from(modal.querySelectorAll(sel)).filter(el => el.offsetParent !== null || el === document.activeElement);
}
function activateModalTrap(modal) {
  // 기존 트랩이 있으면 먼저 해제(다른 모달이 연속 호출되는 경우)
  deactivateModalTrap();
  if (!modal) return;
  __modalTrapTarget = modal;
  __modalTrapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = getModalFocusables(modal);
    if (focusables.length === 0) { e.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    // 포커스가 모달 밖에 있으면 첫 요소로 강제 이동
    if (!modal.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', __modalTrapHandler, true);
}
function deactivateModalTrap() {
  if (__modalTrapHandler) {
    document.removeEventListener('keydown', __modalTrapHandler, true);
    __modalTrapHandler = null;
  }
  __modalTrapTarget = null;
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('active');
  // 모달 클래스 리셋 (비밀번호 모달 등 커스텀 클래스 제거)
  const modal = document.getElementById('modal-content');
  if (modal) modal.className = 'modal';
  // 포커스 트랩 해제
  deactivateModalTrap();
}

// ══════════════════════════════════════════
// 5. 구독 관리
// ══════════════════════════════════════════
let subscriberGrid = null;

function renderSubscriptions(el) {
  const activeCnt = SUBSCRIBERS.filter(s => s.isActive).length;
  logAudit(AUDIT_ACTIONS.VIEW, '구독 관리 조회', `활성 구독자: ${activeCnt}명, 발송 이력: ${SUBSCRIPTION_LOGS.length}건`);
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
  try { activateModalTrap(modal); } catch (e) {}
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
  closeUserDropdown(); // 사용자 드롭다운 닫기
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
  // 시스템 운영자 전용 (CUR 컬럼 관리는 시스템운영자 권한)
  const u = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || CURRENT_USER || {};
  const roles = u.roles || [];
  if (!roles.includes('ROLE_SYS_OPS')) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">접근 권한이 없습니다</div><div class="empty-state-hint">CUR 컬럼 관리는 시스템 운영자(ROLE_SYS_OPS)만 이용할 수 있습니다</div></div>`;
    return;
  }
  const activeCnt = CUR_COLUMNS.filter(c => !c.isDeleted).length;
  logAudit(AUDIT_ACTIONS.VIEW, 'CUR 컬럼 관리 조회', `카테고리: 전체, 활성 컬럼: ${activeCnt}개`);

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
  logAudit(AUDIT_ACTIONS.VIEW, 'CUR 컬럼 관리 조회', `카테고리: ${category || '전체'}, 검색어: ${search || '-'}, 삭제 포함: ${curShowDeleted ? '예' : '아니오'}`);

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
  const dataTypes = ['string', 'double', 'timestamp', 'map <string, string>', 'map <string, double>'];

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
          ${dataTypes.map(t => {
            const escaped = t.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<option value="${escaped}" ${data.dataType === t ? 'selected' : ''}>${escaped}</option>`;
          }).join('')}
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
  try { activateModalTrap(modal); } catch (e) {}
  setTimeout(() => document.getElementById('cur-f-columnName')?.focus(), 200);
}

// CUR 컬럼 저장
function saveCurColumn(mode, id) {
  const category = document.getElementById('cur-f-category').value;
  const columnName = document.getElementById('cur-f-columnName').value.trim();
  const columnKoName = document.getElementById('cur-f-columnKoName').value.trim();
  const description = document.getElementById('cur-f-description').value.trim();
  const dataType = document.getElementById('cur-f-dataType').value.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
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
    logAudit(AUDIT_ACTIONS.CREATE, 'CUR 컬럼 등록', `컬럼명: ${columnName}, 카테고리: ${category}`);
    showToast('success', `${columnKoName} 컬럼을 추가했습니다`);
  } else {
    const item = CUR_COLUMNS.find(c => c.id === id);
    if (item) {
      Object.assign(item, { columnCategory: category, columnName, columnKoName, description, dataType, nullability, properties });
      logAudit(AUDIT_ACTIONS.UPDATE, 'CUR 컬럼 수정', `ID: ${id}, 컬럼명: ${columnName}`);
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
    logAudit(AUDIT_ACTIONS.DELETE, 'CUR 컬럼 삭제', `ID: ${id}, 컬럼명: ${item.columnName}`);
    showToast('success', `${item.columnKoName} 컬럼을 삭제했습니다`);
    filterCurGrid();
  }
}

// 복원
function restoreCurColumn(id) {
  const item = CUR_COLUMNS.find(c => c.id === id);
  if (!item) return;
  item.isDeleted = false;
  logAudit(AUDIT_ACTIONS.RESTORE, 'CUR 컬럼 복원', `ID: ${id}, 컬럼명: ${item.columnName}`);
  showToast('success', `${item.columnKoName} 컬럼을 복원했습니다`);
  filterCurGrid();
}

// ══════════════════════════════════════════
// 7. 환경설정 — 사용자 관리
// ══════════════════════════════════════════

function renderUserManagement(el) {
  // v2: SYS_ADMIN(시스템 사용자) 또는 TENANT_ADMIN(자기 테넌트 사용자)만 접근
  const u = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || CURRENT_USER || {};
  const roles = u.roles || [];
  if (!roles.includes('ROLE_SYS_ADMIN') && !roles.includes('ROLE_TENANT_ADMIN')) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">접근 권한이 없습니다</div><div class="empty-state-hint">사용자 관리는 관리자만 이용할 수 있습니다</div></div>`;
    return;
  }

  // 컨텍스트별 사용자 필터 — 권한 분리 정책
  //   시스템 트랙(tenant=null) → 시스템 사용자(tenantId === null)만 노출
  //   테넌트 트랙(tenant=X)    → 해당 테넌트 사용자만 노출
  // 시스템 관리자는 테넌트 사용자에 손댈 수 없고, 테넌트 관리자는 시스템 사용자에 손댈 수 없음
  const ctx = CURRENT_CONTEXT;
  const tenant = ctx.tenantId ? TENANTS.find(t => t.id === ctx.tenantId) : null;
  const scopeKind = tenant ? 'TENANT' : 'GLOBAL';
  const filteredUsers = tenant
    ? USERS.filter(u => u.tenantId === tenant.id)
    : USERS.filter(u => !u.tenantId);
  // 전역 캐시(필터/그리드용/모달용)
  window.__USER_MGMT_SCOPE__ = { tenant, users: filteredUsers, scopeKind };

  // 비밀번호 초기화 요청 건수 (스코프 내)
  const resetCount = filteredUsers.filter(u => u.pwResetRequested).length;
  logAudit(AUDIT_ACTIONS.VIEW, '사용자 관리 조회', `활성: ${filteredUsers.filter(u => u.isActive).length}명, 비번 초기화 요청: ${resetCount}건${tenant ? ' / 조직:' + tenant.slug : ''}`);

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">사용자 관리 ${tenant ? `<span class="page-title-badge">${tenant.name}</span>` : '<span class="page-title-badge">시스템</span>'}</h1>
      <p class="page-desc">${tenant ? `${tenant.name} 소속 사용자(${filteredUsers.length}명)를 관리합니다.` : `시스템 사용자(${filteredUsers.length}명)를 관리합니다. (시스템 관리자 전용)`}</p>
    </div>

    ${resetCount > 0 ? `
    <div class="section-card" style="border-left:3px solid var(--color-warning);margin-bottom:var(--spacing-md);">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">⚠</span>
        <div>
          <strong>비밀번호 초기화 요청 ${resetCount}건</strong>
          <div style="font-size:12px;color:var(--sh-dark-secondary);margin-top:2px;">사용자가 로그인 화면에서 요청한 건입니다. 승인 시 비밀번호가 아이디와 동일하게 초기화됩니다.</div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section-card">
      <div class="cur-toolbar">
        <div class="cur-toolbar-left">
          <select class="cur-filter-select" id="user-role-filter" onchange="filterUserGrid()">
            <option value="">전체 역할</option>
            ${ROLES.map(r => `<option value="${r.name}">${r.label}</option>`).join('')}
          </select>
          <input class="cur-search-input" id="user-search" type="text" placeholder="이름, 아이디, 부서 검색..." oninput="filterUserGrid()" />
          <label class="cur-toggle-deleted">
            <input type="checkbox" id="user-show-inactive" onchange="filterUserGrid();" />
            비활성 포함
          </label>
        </div>
        <div class="cur-toolbar-right">
          <button class="btn btn-primary btn-sm" onclick="openUserModal('create')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
            등록
          </button>
        </div>
      </div>
      <div id="grid-users" class="ag-theme-alpine" style="width:100%;height:480px;"></div>
      <div id="user-grid-toolbar"></div>
    </div>
  `;

  initUserGrid();
}

function initUserGrid() {
  const columnDefs = [
    { headerName: 'ID', field: 'id', width: 60, hide: true },
    { headerName: '아이디(사번)', field: 'username', width: 120 },
    { headerName: '이름', field: 'name', width: 100 },
    { headerName: '역할', field: 'roles', width: 160,
      valueGetter: (p) => getRoleLabel(p.data.roles[0]),
      cellRenderer: (p) => {
        const role = p.data.roles[0];
        const colors = {
          ROLE_SYS_ADMIN: '#CF1322', ROLE_SYS_OPS: '#FA8C16',
          ROLE_TENANT_ADMIN: '#0046FF', ROLE_TENANT_APPROVER: '#722ED1', ROLE_TENANT_USER: '#00C07F',
          // v1 호환
          ROLE_ADMIN: '#FF4D4F', ROLE_APPROVER: '#0046FF', ROLE_USER: '#00C07F'
        };
        const color = colors[role] || '#4D4D4D';
        return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}15;color:${color};">${getRoleLabel(role)}</span>`;
      }
    },
    { headerName: '부서', field: 'department', width: 130 },
    { headerName: '전화번호', field: 'phone', width: 130 },
    { headerName: '이메일', field: 'email', flex: 1, minWidth: 180, tooltipField: 'email' },
    { headerName: '등록일', field: 'createdAt', width: 110,
      valueFormatter: (p) => p.value ? p.value.substring(0, 10).replace(/-/g, '.') : '-'
    },
    { headerName: '상태', field: 'isActive', width: 80,
      cellRenderer: (p) => {
        if (p.data.pwResetRequested) return `<span style="color:var(--color-warning);font-weight:600;">초기화 요청</span>`;
        return p.value ? '<span style="color:var(--color-success);font-weight:600;">활성</span>' : '<span style="color:var(--sh-dark-secondary);">비활성</span>';
      }
    },
    { headerName: '관리', width: 200, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (p) => {
        let btns = `<button class="btn btn-sm btn-secondary" onclick="openUserModal('edit',${p.data.id})" style="font-size:11px;margin-right:4px;">수정</button>`;
        if (p.data.pwResetRequested) {
          btns += `<button class="btn btn-sm btn-primary" onclick="approvePasswordReset(${p.data.id})" style="font-size:11px;margin-right:4px;">승인</button>`;
        } else {
          btns += `<button class="btn btn-sm btn-secondary" onclick="resetUserPassword(${p.data.id})" style="font-size:11px;margin-right:4px;">초기화</button>`;
        }
        btns += p.data.isActive
          ? `<button class="btn btn-sm btn-danger" onclick="toggleUserActive(${p.data.id})" style="font-size:11px;">비활성</button>`
          : `<button class="btn btn-sm btn-secondary" onclick="toggleUserActive(${p.data.id})" style="font-size:11px;">활성</button>`;
        return btns;
      }
    },
  ];

  // v2: 컨텍스트(테넌트) 적용 — window.__USER_MGMT_SCOPE__로부터 필터된 사용자만
  const scope = (window.__USER_MGMT_SCOPE__ && window.__USER_MGMT_SCOPE__.users) || USERS;
  const activeUsers = scope.filter(u => u.isActive);
  const gridOptions = {
    columnDefs,
    rowData: activeUsers,
    defaultColDef: { sortable: true, resizable: true, suppressMovable: false },
    pagination: true,
    paginationPageSize: getSavedPageSize('users', 10),
    rowHeight: 40,
    headerHeight: 42,
    tooltipShowDelay: 300,
    getRowClass: (p) => !p.data.isActive ? 'row-deleted' : '',
    onGridReady: (params) => {
      gridInstances['users'] = params.api;
      bindGridPagination('users');
      const toolbarEl = document.getElementById('user-grid-toolbar');
      if (toolbarEl) {
        toolbarEl.innerHTML = renderGridToolbar('users', '사용자목록', activeUsers.length, getSavedPageSize('users', 10));
      }
    },
  };

  const gridEl = document.getElementById('grid-users');
  if (gridEl) agGrid.createGrid(gridEl, gridOptions);
}

// 사용자 그리드 필터링
function filterUserGrid() {
  const api = gridInstances['users'];
  if (!api) return;
  const role = document.getElementById('user-role-filter')?.value || '';
  const search = (document.getElementById('user-search')?.value || '').toLowerCase();
  const showInactive = document.getElementById('user-show-inactive')?.checked || false;
  logAudit(AUDIT_ACTIONS.VIEW, '사용자 관리 조회', `역할: ${role ? (ROLE_LABELS[role] || role) : '전체'}, 검색어: ${search || '-'}, 비활성 포함: ${showInactive ? '예' : '아니오'}`);

  // v2: 컨텍스트 스코프 적용
  const scope = (window.__USER_MGMT_SCOPE__ && window.__USER_MGMT_SCOPE__.users) || USERS;
  const filtered = scope.filter(u => {
    if (!showInactive && !u.isActive) return false;
    if (role && !u.roles.includes(role)) return false;
    if (search) {
      return u.username.toLowerCase().includes(search)
        || u.name.toLowerCase().includes(search)
        || (u.department || '').toLowerCase().includes(search);
    }
    return true;
  });

  api.setGridOption('rowData', filtered);
  const toolbarEl = document.getElementById('user-grid-toolbar');
  if (toolbarEl) {
    toolbarEl.innerHTML = renderGridToolbar('users', '사용자목록', filtered.length, api.paginationGetPageSize());
  }
}

// 사용자 추가/수정 모달
function openUserModal(mode, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.className = 'modal cur-modal';

  // 컨텍스트(시스템 vs 테넌트) — 권한 분리 정책 반영
  const scope = window.__USER_MGMT_SCOPE__ || { tenant: null, scopeKind: 'GLOBAL' };
  const scopeKind = scope.scopeKind || (scope.tenant ? 'TENANT' : 'GLOBAL');
  const scopeTenant = scope.tenant || null;
  // 노출 가능한 역할만 필터 (시스템 트랙 → GLOBAL, 테넌트 트랙 → TENANT)
  const allowedRoles = ROLES.filter(r => r.scope === scopeKind);
  const defaultRole = allowedRoles[0] ? allowedRoles[0].name : 'ROLE_TENANT_USER';

  let data = { username: '', name: '', phone: '', email: '', department: '', roles: [defaultRole], tenantId: scopeTenant ? scopeTenant.id : null };
  if (mode === 'edit' && id) {
    const found = USERS.find(u => u.id === id);
    if (found) data = { ...found };
    // 방어적 검증: 컨텍스트와 다른 사용자 편집 시도 차단
    if (scopeKind === 'GLOBAL' && data.tenantId) {
      showToast('error', '시스템 관리자는 테넌트 사용자를 수정할 수 없습니다');
      return;
    }
    if (scopeKind === 'TENANT' && (!data.tenantId || (scopeTenant && data.tenantId !== scopeTenant.id))) {
      showToast('error', '다른 조직의 사용자는 수정할 수 없습니다');
      return;
    }
  }

  const title = mode === 'create'
    ? (scopeKind === 'GLOBAL' ? '시스템 사용자 등록' : `${scopeTenant.name} 사용자 등록`)
    : '사용자 수정';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">아이디(사번) *</label>
        <input class="form-input" id="user-f-username" value="${data.username}" placeholder="예: hong001" ${mode === 'edit' ? 'readonly style="background:#f5f5f5;"' : ''} />
      </div>
      <div class="form-group">
        <label class="form-label">역할 *</label>
        <select class="form-select" id="user-f-role">
          ${allowedRoles.map(r => `<option value="${r.name}" ${data.roles[0] === r.name ? 'selected' : ''}>${getRoleLabel(r.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">이름 *</label>
        <input class="form-input" id="user-f-name" value="${data.name}" placeholder="예: 홍길동" />
      </div>
      <div class="form-group">
        <label class="form-label">부서 *</label>
        <input class="form-input" id="user-f-department" value="${data.department}" placeholder="예: 클라우드운영팀" />
      </div>
    </div>
    <div class="cur-form-row">
      <div class="form-group">
        <label class="form-label">전화번호</label>
        <input class="form-input" id="user-f-phone" value="${data.phone}" placeholder="예: 010-1234-5678" />
      </div>
      <div class="form-group">
        <label class="form-label">이메일 *</label>
        <input class="form-input" id="user-f-email" value="${data.email}" placeholder="예: hong@shinhan-ds.com" />
      </div>
    </div>
    ${mode === 'create' ? '<div style="font-size:12px;color:var(--sh-dark-secondary);margin-top:4px;">초기 비밀번호는 아이디와 동일하게 설정됩니다.</div>' : ''}
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveUser('${mode}', ${id || 0})">${mode === 'create' ? '등록' : '저장'}</button>
    </div>
  `;

  overlay.classList.add('active');
  try { activateModalTrap(modal); } catch (e) {}
  setTimeout(() => document.getElementById(mode === 'create' ? 'user-f-username' : 'user-f-name')?.focus(), 200);
}

// 사용자 저장
function saveUser(mode, id) {
  const username = document.getElementById('user-f-username').value.trim();
  const name = document.getElementById('user-f-name').value.trim();
  const phone = document.getElementById('user-f-phone').value.trim();
  const email = document.getElementById('user-f-email').value.trim();
  const department = document.getElementById('user-f-department').value.trim();
  const role = document.getElementById('user-f-role').value;

  if (!username) { showToast('error', '아이디를 입력해 주세요'); return; }
  if (!name) { showToast('error', '이름을 입력해 주세요'); return; }
  if (!department) { showToast('error', '부서를 입력해 주세요'); return; }
  if (!email) { showToast('error', '이메일을 입력해 주세요'); return; }

  // ── 권한 분리 검증: 시스템↔테넌트 교차 등록/수정 차단 ──
  const scope = window.__USER_MGMT_SCOPE__ || { tenant: null, scopeKind: 'GLOBAL' };
  const scopeKind = scope.scopeKind || (scope.tenant ? 'TENANT' : 'GLOBAL');
  const scopeTenant = scope.tenant || null;
  const roleMeta = ROLES.find(r => r.name === role);
  if (!roleMeta) { showToast('error', '알 수 없는 역할입니다'); return; }
  if (roleMeta.scope !== scopeKind) {
    showToast('error',
      scopeKind === 'GLOBAL'
        ? '시스템 관리자는 테넌트 권한 사용자를 등록/수정할 수 없습니다'
        : '관리자는 시스템 권한 사용자를 등록/수정할 수 없습니다'
    );
    return;
  }
  // tenantId 결정 — 시스템(null) / 테넌트(현재 컨텍스트 테넌트)
  const targetTenantId = scopeKind === 'GLOBAL' ? null : (scopeTenant ? scopeTenant.id : null);

  if (mode === 'create') {
    // 아이디 중복 확인
    if (USERS.some(u => u.username === username)) {
      showToast('error', '이미 사용 중인 아이디입니다');
      return;
    }
    const newId = Math.max(...USERS.map(u => u.id)) + 1;
    USERS.push({
      id: newId, username, name, phone, email, department,
      roles: [role], tenantId: targetTenantId, isActive: true,
      createdAt: new Date().toISOString().substring(0, 19),
      pwResetRequested: false,
    });
    logAudit(AUDIT_ACTIONS.CREATE, '사용자 등록', `아이디: ${username}, 이름: ${name}, 역할: ${ROLE_LABELS[role] || role}, 소속: ${targetTenantId || '시스템'}`);
    showToast('success', `${name} 님을 등록했습니다. 초기 비밀번호는 아이디와 동일합니다.`);
  } else {
    const item = USERS.find(u => u.id === id);
    if (item) {
      // 추가 방어: 대상 사용자도 컨텍스트와 일치해야 함
      const itemKind = item.tenantId ? 'TENANT' : 'GLOBAL';
      if (itemKind !== scopeKind) {
        showToast('error', '다른 영역의 사용자는 수정할 수 없습니다');
        return;
      }
      Object.assign(item, { name, phone, email, department, roles: [role] });
      logAudit(AUDIT_ACTIONS.UPDATE, '사용자 수정', `아이디: ${item.username}, 역할: ${getRoleLabel(role)}`);
      showToast('success', `${name} 님의 정보를 수정했습니다`);
    }
  }

  closeModal();
  filterUserGrid();
}

// 사용자 활성/비활성 토글
function toggleUserActive(id) {
  const item = USERS.find(u => u.id === id);
  if (!item) return;
  const action = item.isActive ? '비활성화' : '활성화';
  if (confirm(`${item.name} 님을 ${action}하시겠어요?`)) {
    item.isActive = !item.isActive;
    logAudit(AUDIT_ACTIONS.UPDATE, '사용자 상태 변경', `아이디: ${item.username}, 변경: ${action}`);
    showToast('success', `${item.name} 님을 ${action}했습니다`);
    filterUserGrid();
  }
}

// 관리자 직접 비밀번호 초기화 (아이디와 동일)
function resetUserPassword(id) {
  const item = USERS.find(u => u.id === id);
  if (!item) return;
  if (confirm(`${item.name} 님의 비밀번호를 아이디(${item.username})와 동일하게 초기화하시겠어요?`)) {
    item.pwResetRequested = false;
    logAudit(AUDIT_ACTIONS.PASSWORD_CHANGE, '비밀번호 관리자 초기화', `대상 아이디: ${item.username}`);
    showToast('success', `${item.name} 님의 비밀번호를 초기화했습니다`);
    filterUserGrid();
  }
}

// 비밀번호 초기화 요청 승인
function approvePasswordReset(id) {
  const item = USERS.find(u => u.id === id);
  if (!item) return;
  if (confirm(`${item.name} 님의 비밀번호 초기화 요청을 승인하시겠어요?\n비밀번호가 아이디(${item.username})와 동일하게 초기화됩니다.`)) {
    item.pwResetRequested = false;
    logAudit(AUDIT_ACTIONS.PASSWORD_RESET_APPROVE, '비밀번호 초기화 승인', `대상 아이디: ${item.username}`);
    showToast('success', `${item.name} 님의 비밀번호 초기화를 승인했습니다`);
    // 화면 다시 렌더링 (요청 건수 배너 갱신)
    renderUserManagement(document.getElementById('app-content'));
  }
}

// ══════════════════════════════════════════
// 8. 환경설정 — 감사 로그
// ══════════════════════════════════════════
let auditGridApi = null;
let auditFilterState = { action: '', username: '', from: '', to: '', search: '' };

function renderAuditLogs(el) {
  // 시스템 관리자 전용 (감사 로그는 ROLE_SYS_ADMIN)
  const u = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || CURRENT_USER || {};
  const roles = u.roles || [];
  if (!roles.includes('ROLE_SYS_ADMIN')) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">접근 권한이 없습니다</div><div class="empty-state-hint">감사 로그는 시스템 관리자(ROLE_SYS_ADMIN)만 이용할 수 있습니다</div></div>`;
    return;
  }

  // 감사 로그 화면 자체 진입도 감사 로그에 기록
  logAudit(AUDIT_ACTIONS.VIEW, '감사 로그 조회', `전체 로그: ${AUDIT_LOGS.length}건`);

  const actions = Object.values(AUDIT_ACTIONS);
  const usernames = [...new Set(AUDIT_LOGS.map(l => l.username))].sort();

  // 기본 기간: 최근 7일
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().substring(0, 10);
  auditFilterState = { action: '', username: '', from: fmt(weekAgo), to: fmt(today), search: '' };

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">감사 로그</h1>
      <p class="page-desc">로그인부터 로그아웃까지 모든 사용자 활동을 추적합니다. 조회·다운로드 시 조회 조건이 함께 기록됩니다.</p>
    </div>

    <div class="section-card">
      <div class="audit-toolbar">
        <div class="audit-toolbar-left">
          <label class="audit-field">
            <span>기간</span>
            <input type="date" id="audit-from" value="${auditFilterState.from}" onchange="filterAuditGrid()" />
            <span>~</span>
            <input type="date" id="audit-to" value="${auditFilterState.to}" onchange="filterAuditGrid()" />
          </label>
          <select class="cur-filter-select" id="audit-action-filter" onchange="filterAuditGrid()">
            <option value="">전체 액션</option>
            ${actions.map(a => `<option value="${a}">${a}</option>`).join('')}
          </select>
          <select class="cur-filter-select" id="audit-user-filter" onchange="filterAuditGrid()">
            <option value="">전체 사용자</option>
            ${usernames.map(u => `<option value="${u}">${u}</option>`).join('')}
          </select>
          <input class="cur-search-input" id="audit-search" type="text" placeholder="대상·조건 검색..." oninput="filterAuditGrid()" />
        </div>
      </div>
      <div id="grid-audit-logs" class="ag-theme-alpine" style="width:100%;height:560px;"></div>
      <div id="audit-grid-toolbar"></div>
    </div>
  `;

  initAuditGrid();
}

function initAuditGrid() {
  const columnDefs = [
    { headerName: 'ID', field: 'id', width: 70 },
    { headerName: '일시', field: 'timestamp', width: 160,
      valueFormatter: (p) => p.value ? formatDateTime(p.value) : '-'
    },
    { headerName: '아이디', field: 'username', width: 120 },
    { headerName: '이름', field: 'name', width: 100 },
    { headerName: '역할', field: 'role', width: 110,
      valueFormatter: (p) => ROLE_LABELS[p.value] || p.value
    },
    { headerName: '액션', field: 'action', width: 130,
      cellRenderer: (p) => {
        const colorMap = {
          [AUDIT_ACTIONS.LOGIN]: '#00C07F',
          [AUDIT_ACTIONS.LOGIN_FAIL]: '#FF4D4F',
          [AUDIT_ACTIONS.LOGOUT]: '#999',
          [AUDIT_ACTIONS.VIEW]: '#0076FF',
          [AUDIT_ACTIONS.EXPORT]: '#002D85',
          [AUDIT_ACTIONS.EXPORT_PDF]: '#E64548',
          [AUDIT_ACTIONS.CREATE]: '#00865A',
          [AUDIT_ACTIONS.UPDATE]: '#FFB300',
          [AUDIT_ACTIONS.DELETE]: '#E64548',
          [AUDIT_ACTIONS.RESTORE]: '#4D8AFF',
          [AUDIT_ACTIONS.PASSWORD_CHANGE]: '#4D4D4D',
          [AUDIT_ACTIONS.PASSWORD_RESET_REQUEST]: '#FF9500',
          [AUDIT_ACTIONS.PASSWORD_RESET_APPROVE]: '#00865A',
        };
        const color = colorMap[p.value] || '#4D4D4D';
        return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}15;color:${color};">${p.value}</span>`;
      }
    },
    { headerName: '대상', field: 'target', width: 220, tooltipField: 'target' },
    { headerName: '조회 조건 / 상세', field: 'conditions', flex: 1, minWidth: 260, tooltipField: 'conditions',
      cellRenderer: (p) => p.value || '<span style="color:var(--sh-dark-tertiary);">-</span>'
    },
    { headerName: 'IP', field: 'ipAddress', width: 120 },
  ];

  const gridOptions = {
    columnDefs,
    rowData: filterAuditRows(),
    defaultColDef: { sortable: true, resizable: true, suppressMovable: false, wrapHeaderText: true, autoHeaderHeight: true },
    pagination: true,
    paginationPageSize: getSavedPageSize('auditLogs', 20),
    rowHeight: 40,
    headerHeight: 42,
    tooltipShowDelay: 300,
    onGridReady: (params) => {
      auditGridApi = params.api;
      gridInstances['auditLogs'] = params.api;
      bindGridPagination('auditLogs');
      const toolbarEl = document.getElementById('audit-grid-toolbar');
      if (toolbarEl) {
        const total = filterAuditRows().length;
        toolbarEl.innerHTML = renderGridToolbar('auditLogs', '감사로그', total, getSavedPageSize('auditLogs', 20));
      }
    },
  };

  const gridEl = document.getElementById('grid-audit-logs');
  if (gridEl) agGrid.createGrid(gridEl, gridOptions);
}

function filterAuditRows() {
  return AUDIT_LOGS.filter(log => {
    if (auditFilterState.action && log.action !== auditFilterState.action) return false;
    if (auditFilterState.username && log.username !== auditFilterState.username) return false;
    if (auditFilterState.from) {
      const fromTs = new Date(auditFilterState.from + 'T00:00:00').getTime();
      if (new Date(log.timestamp).getTime() < fromTs) return false;
    }
    if (auditFilterState.to) {
      const toTs = new Date(auditFilterState.to + 'T23:59:59').getTime();
      if (new Date(log.timestamp).getTime() > toTs) return false;
    }
    if (auditFilterState.search) {
      const q = auditFilterState.search.toLowerCase();
      return (log.target || '').toLowerCase().includes(q)
        || (log.conditions || '').toLowerCase().includes(q)
        || (log.name || '').toLowerCase().includes(q);
    }
    return true;
  });
}

function filterAuditGrid() {
  auditFilterState.action = document.getElementById('audit-action-filter')?.value || '';
  auditFilterState.username = document.getElementById('audit-user-filter')?.value || '';
  auditFilterState.from = document.getElementById('audit-from')?.value || '';
  auditFilterState.to = document.getElementById('audit-to')?.value || '';
  auditFilterState.search = document.getElementById('audit-search')?.value || '';

  if (!auditGridApi) return;
  const filtered = filterAuditRows();
  auditGridApi.setGridOption('rowData', filtered);

  const toolbarEl = document.getElementById('audit-grid-toolbar');
  if (toolbarEl) {
    toolbarEl.innerHTML = renderGridToolbar('auditLogs', '감사로그', filtered.length, auditGridApi.paginationGetPageSize());
  }
}

// ══════════════════════════════════════════
// 로그인 페이지
// ══════════════════════════════════════════
// 로그인 페이지 — variant: 'system' | 'tenant', tenantSlug?: string
function renderLoginPage(variant, tenantSlug) {
  variant = variant || 'system';
  const app = document.getElementById('app');
  // 컨텍스트 추출 — 테넌트 변형이면 해당 테넌트 정보 노출
  const tenant = tenantSlug ? TENANTS.find(t => t.slug === tenantSlug) : null;
  const lockBanner = lockedUntil ? `<div class="login-lock-banner" id="lock-banner">
    로그인 ${MAX_LOGIN_FAIL}회 실패로 계정이 잠겼습니다. <span id="lock-timer"></span> 후 다시 시도해 주세요.
  </div>` : '';

  // 컨텍스트 라벨 (시스템 / 테넌트별)
  //   배지 폭이 좁아 줄바꿈 발생 → 테넌트명만 노출 (UX 피드백 반영)
  const ctxBadge = variant === 'system'
    ? `<span class="login-ctx-badge sys">시스템 콘솔 로그인</span>`
    : tenant
      ? `<span class="login-ctx-badge tenant">${tenant.name}</span>`
      : `<span class="login-ctx-badge tenant">${tenantSlug || '테넌트 미지정'}</span>`;

  // 테스트 계정 가이드 — variant별 다른 추천
  const testAccounts = variant === 'system'
    ? [
        { id: 'sys-admin', label: '시스템 관리자' },
        { id: 'sys-ops1', label: '시스템 운영자' },
      ]
    : tenant
      ? USERS.filter(u => u.tenantId === tenant.id).slice(0, 3).map(u => ({ id: u.username, label: ROLE_LABELS_SHORT[u.roles[0]] || u.roles[0] }))
      : [];

  // 테넌트 진입 링크 (시스템 변형 화면에서 노출)
  const tenantLinks = variant === 'system'
    ? `<div class="login-tenant-links">
        <div class="login-tenant-links-title">테넌트 사용자라면 아래에서 선택하세요</div>
        <div class="login-tenant-links-row">
          ${TENANTS.map(t => `<a href="#/t/${t.slug}/login" class="login-tenant-link">${t.name}</a>`).join('')}
        </div>
      </div>`
    : `<div class="login-tenant-links">
        <a href="#/admin/login" class="login-tenant-link sys">시스템 콘솔 로그인으로 이동</a>
      </div>`;

  app.innerHTML = `
    <div class="login-wrapper login-variant-${variant}">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-main">CLOUD COST REPORTING</div>
          <div class="login-logo-sub">클라우드 비용 리포팅 자동화</div>
          <div class="login-ctx-row">${ctxBadge}</div>
        </div>
        ${lockBanner}
        <form id="login-form" onsubmit="handleLogin(event)">
          <input type="hidden" id="login-variant" value="${variant}" />
          <input type="hidden" id="login-tenant-slug" value="${tenantSlug || ''}" />
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
          <div class="login-pw-reset-link">
            <a href="#" onclick="event.preventDefault();openPwResetRequest();">비밀번호를 잊으셨나요?</a>
          </div>
        </form>
        ${tenantLinks}
        <div class="login-test-accounts">
          <div class="login-test-title">테스트 계정 (비밀번호: 아무 값)</div>
          <div class="login-test-list">
            ${testAccounts.map(a => `<span class="login-test-item"><b>${a.id}</b> ${a.label}</span>`).join('')}
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

  // 변형/테넌트 컨텍스트
  const variant = (document.getElementById('login-variant')?.value) || 'system';
  const tenantSlug = (document.getElementById('login-tenant-slug')?.value) || '';

  // 사용자 확인 (프로토타입: username만 확인)
  let found = USERS.find(u => u.username === username && u.isActive);
  // 변형 검증 — 시스템 로그인엔 SYS_*, 테넌트 로그인엔 TENANT_*만 허용
  if (found) {
    const role = found.roles[0];
    const isSysRole = role === 'ROLE_SYS_ADMIN' || role === 'ROLE_SYS_OPS';
    const isTenantRole = role === 'ROLE_TENANT_ADMIN' || role === 'ROLE_TENANT_APPROVER' || role === 'ROLE_TENANT_USER';
    if (variant === 'system' && !isSysRole) {
      pwError.textContent = '시스템 콘솔은 시스템 사용자만 로그인할 수 있습니다.';
      document.getElementById('login-id').classList.add('error');
      found = null;
    }
    if (variant === 'tenant' && (!isTenantRole || !tenantSlug)) {
      pwError.textContent = '이 조직의 사용자만 로그인할 수 있습니다.';
      document.getElementById('login-id').classList.add('error');
      found = null;
    }
    if (found && variant === 'tenant' && tenantSlug) {
      const tenant = TENANTS.find(t => t.slug === tenantSlug);
      if (!tenant || found.tenantId !== tenant.id) {
        pwError.textContent = '이 조직에 소속된 사용자가 아닙니다.';
        document.getElementById('login-id').classList.add('error');
        found = null;
      }
    }
  }
  if (!found) {
    loginFailCount++;
    // 감사 로그: 로그인 실패 — CURRENT_USER 임시 변경은 하지 않고 입력 ID만 기록
    AUDIT_LOGS.unshift({
      id: (AUDIT_LOGS[0]?.id || 0) + 1,
      timestamp: new Date().toISOString(),
      username: username || '-',
      name: '-',
      role: '-',
      action: AUDIT_ACTIONS.LOGIN_FAIL,
      target: '시스템 로그인',
      conditions: `시도 아이디: ${username}, 실패 횟수: ${loginFailCount}/${MAX_LOGIN_FAIL}`,
      ipAddress: '10.0.0.1',
      userAgent: navigator.userAgent.slice(0, 120),
    });
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
  try { localStorage.setItem('ccr_currentUserId', String(found.id)); } catch (e) {}
  logAudit(AUDIT_ACTIONS.LOGIN, variant === 'system' ? '시스템 로그인' : `테넌트 로그인 (${tenantSlug})`, `아이디: ${found.username}`);

  // 앱 진입 — 사용자별 기본 경로
  window.location.hash = defaultRouteFor(found);
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

// 로그인 화면 — 비밀번호 초기화 요청
function openPwResetRequest() {
  const username = document.getElementById('login-id')?.value.trim();
  if (!username) {
    showToast('error', '아이디를 먼저 입력해 주세요');
    document.getElementById('login-id')?.focus();
    return;
  }
  const found = USERS.find(u => u.username === username);
  if (!found) {
    showToast('error', '등록되지 않은 아이디입니다');
    return;
  }
  if (found.pwResetRequested) {
    showToast('info', '이미 초기화 요청이 접수되었습니다. 관리자 승인을 기다려 주세요.');
    return;
  }
  if (confirm(`${username} 계정의 비밀번호 초기화를 요청하시겠어요?\n관리자가 승인하면 비밀번호가 아이디와 동일하게 초기화됩니다.`)) {
    found.pwResetRequested = true;
    // 감사 로그 (비인증 상태이므로 사용자 정보는 요청자 아이디만 기록)
    AUDIT_LOGS.unshift({
      id: (AUDIT_LOGS[0]?.id || 0) + 1,
      timestamp: new Date().toISOString(),
      username: username,
      name: found.name,
      role: found.roles[0],
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
      target: '비밀번호 초기화 요청',
      conditions: `요청자 아이디: ${username}`,
      ipAddress: '10.0.0.1',
      userAgent: navigator.userAgent.slice(0, 120),
    });
    showToast('success', '비밀번호 초기화 요청이 접수되었습니다. 관리자 승인을 기다려 주세요.');
  }
}

// 로그아웃 — 변형별 로그인 화면으로 복귀
function handleLogout() {
  logAudit(AUDIT_ACTIONS.LOGOUT, '시스템 로그아웃', `아이디: ${CURRENT_USER.username}`);
  // 로그아웃 직전 컨텍스트로 복귀할 로그인 경로 결정
  let returnHash = '#/admin/login';
  try {
    const tenant = CURRENT_USER.tenantId ? TENANTS.find(t => t.id === CURRENT_USER.tenantId) : null;
    if (tenant) returnHash = `#/t/${tenant.slug}/login`;
  } catch (e) {}
  isAuthenticated = false;
  localStorage.removeItem('ccr_authenticated');
  localStorage.removeItem('ccr_currentUserId');
  // CURRENT_USER 비우기 (참조 그대로)
  Object.keys(CURRENT_USER).forEach(k => { CURRENT_USER[k] = (k === 'roles') ? [] : (typeof CURRENT_USER[k] === 'number' ? null : ''); });
  CURRENT_USER.id = null;
  closeUserDropdown && closeUserDropdown();
  destroyAllGrids();
  window.location.hash = returnHash;
}

// ══════════════════════════════════════════
// 사용자 드롭다운 메뉴
// ══════════════════════════════════════════
function toggleUserDropdown(e) {
  e.stopPropagation();
  closeSettingsMenu(); // 설정 드롭다운 닫기
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
  try { activateModalTrap(modal); } catch (e) {}
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
  logAudit(AUDIT_ACTIONS.PASSWORD_CHANGE, '비밀번호 변경', `아이디: ${CURRENT_USER.username}`);
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
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" id="modal-content"></div>
    </div>
    <div class="toast-container" id="toast-container"></div>
  `;
}

function initApp() {
  window.addEventListener('hashchange', handleRoute);
  // 전 그리드 공통: 헤더 우클릭 컬럼 표시/숨김 메뉴 (위임형 — 1회 등록으로 모든 그리드 자동 적용)
  try { initGlobalColumnContextMenu(); } catch (e) { console.error('컬럼 메뉴 초기화 실패', e); }
  handleRoute();
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// DOM 준비 후 실행
document.addEventListener('DOMContentLoaded', initApp);
