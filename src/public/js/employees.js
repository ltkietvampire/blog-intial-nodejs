document.addEventListener('DOMContentLoaded', function () {
  const STATUS_LABELS = {
    'status-active': 'Active',
    'status-busy': 'Busy',
    'status-off': 'Off',
  };
  const ROLE_LABELS = {
    employee: 'Employee',
    manager: 'Manager',
  };

  const rows = Array.from(document.querySelectorAll('.employee-row'));
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const positionFilter = document.getElementById('positionFilter');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const showingText = document.getElementById('showingText');
  const emptyFilterRow = document.getElementById('emptyFilterRow');
  const selectAllEmployees = document.getElementById('selectAllEmployees');
  const rowCheckboxes = Array.from(document.querySelectorAll('.row-checkbox'));
  const selectedCountText = document.getElementById('selectedCountText');
  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const bulkStatusSelect = document.getElementById('bulkStatusSelect');
  const btnApplyBulkStatus = document.getElementById('btnApplyBulkStatus');
  const btnBulkDelete = document.getElementById('btnBulkDelete');
  const formBulkDelete = document.getElementById('formBulkDelete');
  const formBulkStatus = document.getElementById('formBulkStatus');
  const bulkStatusHidden = document.getElementById('bulkStatusHidden');

  const summaryTotal = document.getElementById('summaryTotal');
  const summaryActive = document.getElementById('summaryActive');
  const summaryBusy = document.getElementById('summaryBusy');
  const summaryOff = document.getElementById('summaryOff');

  let deleteId = '';

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function toStatusLabel(status) {
    return STATUS_LABELS[status] || status || 'Unknown';
  }

  function toRoleLabel(role) {
    const normalized = normalizeText(role);
    return ROLE_LABELS[normalized] || 'Employee';
  }

  function setupStatusLabels() {
    document.querySelectorAll('.status-pill').forEach((el) => {
      const status = el.dataset.status || '';
      el.textContent = toStatusLabel(status);
    });
  }

  function populatePositionFilter() {
    if (!positionFilter) return;
    const unique = new Set();
    rows.forEach((row) => {
      const value = String(row.dataset.position || '').trim();
      if (value) {
        unique.add(value);
      }
    });

    Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .forEach((position) => {
        const opt = document.createElement('option');
        opt.value = position;
        opt.textContent = position;
        positionFilter.appendChild(opt);
      });
  }

  function updateSummary() {
    if (!summaryTotal) return;
    const total = rows.length;
    const active = rows.filter((row) => row.dataset.status === 'status-active').length;
    const busy = rows.filter((row) => row.dataset.status === 'status-busy').length;
    const off = rows.filter((row) => row.dataset.status === 'status-off').length;

    summaryTotal.textContent = total;
    summaryActive.textContent = active;
    summaryBusy.textContent = busy;
    summaryOff.textContent = off;
  }

  function getVisibleRows() {
    return rows.filter((row) => row.style.display !== 'none');
  }

  function getCheckedIds() {
    return rowCheckboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => String(checkbox.dataset.id || '').trim())
      .filter(Boolean);
  }

  function updateSelectAllState() {
    if (!selectAllEmployees) return;

    const visibleCheckboxes = getVisibleRows()
      .map((row) => row.querySelector('.row-checkbox'))
      .filter(Boolean);

    if (!visibleCheckboxes.length) {
      selectAllEmployees.checked = false;
      selectAllEmployees.indeterminate = false;
      return;
    }

    const checkedVisible = visibleCheckboxes.filter((checkbox) => checkbox.checked).length;
    selectAllEmployees.checked = checkedVisible > 0 && checkedVisible === visibleCheckboxes.length;
    selectAllEmployees.indeterminate = checkedVisible > 0 && checkedVisible < visibleCheckboxes.length;
  }

  function updateBulkControls() {
    const selectedCount = getCheckedIds().length;
    if (bulkActionsBar) {
      if (selectedCount > 0) {
        bulkActionsBar.classList.remove('d-none');
        bulkActionsBar.classList.add('d-flex');
      } else {
        bulkActionsBar.classList.remove('d-flex');
        bulkActionsBar.classList.add('d-none');
      }
    }
    if (selectedCountText) {
      selectedCountText.textContent = `${selectedCount} selected`;
    }

    if (btnBulkDelete) {
      btnBulkDelete.disabled = selectedCount < 1;
    }
    if (btnApplyBulkStatus) {
      const hasStatus = Boolean(String(bulkStatusSelect?.value || '').trim());
      btnApplyBulkStatus.disabled = selectedCount < 1 || !hasStatus;
    }
  }

  function fillFormIds(form, ids) {
    const oldInputs = form.querySelectorAll('input[name="ids"]');
    oldInputs.forEach((node) => node.remove());

    ids.forEach((id) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'ids';
      input.value = id;
      form.appendChild(input);
    });
  }

  function applyFilters() {
    if (!searchInput || !statusFilter || !positionFilter) return;
    const query = normalizeText(searchInput.value);
    const status = statusFilter.value;
    const position = positionFilter.value;

    let visible = 0;

    rows.forEach((row) => {
      const rowText = normalizeText(
        `${row.dataset.name} ${row.dataset.email} ${row.dataset.phone} ${row.dataset.position}`
      );
      const matchSearch = !query || rowText.includes(query);
      const matchStatus = status === 'all' || row.dataset.status === status;
      const matchPosition = position === 'all' || row.dataset.position === position;
      const pass = matchSearch && matchStatus && matchPosition;

      row.style.display = pass ? '' : 'none';
      if (pass) visible += 1;
    });

    if (showingText) {
      showingText.textContent = `Showing ${visible} of ${rows.length} members`;
    }
    if (emptyFilterRow) {
      emptyFilterRow.style.display = rows.length > 0 && visible === 0 ? '' : 'none';
    }

    updateSelectAllState();
    updateBulkControls();
  }

  function setupEditModal() {
    const modalEl = document.getElementById('editEmployeeModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;
    const editModal = new bootstrap.Modal(modalEl);

    document.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', function () {
        const id = this.dataset.id;
        document.getElementById('editName').value = this.dataset.name || '';
        document.getElementById('editEmail').value = this.dataset.email || '';
        document.getElementById('editSDT').value = this.dataset.sdt || '';
        document.getElementById('editRole').value = normalizeText(this.dataset.role) || 'employee';
        document.getElementById('editPosition').value = this.dataset.position || '';
        document.getElementById('editHourlyRate').value = this.dataset.hourlyrate || '0';
        document.getElementById('editMaxTime').value = this.dataset.maxtime || '8';
        document.getElementById('editTrangThai').value = this.dataset.trangthai || 'status-active';

        const form = document.getElementById('editEmployeeForm');
        if (form) form.action = `/employee/${id}?_method=PUT`;

        editModal.show();
      });
    });
  }

  function setupViewProfileModal() {
    const viewModalEl = document.getElementById('viewEmployeeModal');
    if (!viewModalEl || typeof bootstrap === 'undefined') return;

    const viewModal = new bootstrap.Modal(viewModalEl);
    const profileCover = document.getElementById('profileCover');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileStatus = document.getElementById('profileStatus');
    const profileId = document.getElementById('profileId');
    const profilePhone = document.getElementById('profilePhone');
    const profileRole = document.getElementById('profileRole');
    const profilePosition = document.getElementById('profilePosition');
    const profileHourlyRate = document.getElementById('profileHourlyRate');
    const profileMaxTime = document.getElementById('profileMaxTime');
    const profileTotalHours = document.getElementById('profileTotalHours');
    const profileState = document.getElementById('profileState');
    const profileIntroduce = document.getElementById('profileIntroduce');
    const profileCreatedAt = document.getElementById('profileCreatedAt');
    const profileUpdatedAt = document.getElementById('profileUpdatedAt');

    function safeText(value, fallback = '--') {
      const text = String(value || '').trim();
      return text || fallback;
    }

    function formatDateTime(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '--';
      return date.toLocaleString('vi-VN');
    }

    function setStatus(statusRaw) {
      const normalized = String(statusRaw || '').trim();
      if (profileStatus) {
        profileStatus.className = `status-pill ${normalized || 'status-active'}`;
        profileStatus.textContent = toStatusLabel(normalized);
      }
    }

    document.querySelectorAll('.btn-view-profile').forEach((btn) => {
      btn.addEventListener('click', function () {
        const avatar = safeText(this.dataset.avatar, '/img/default-avatar.webp');
        const cover = safeText(this.dataset.cover, '/img/default-avatar.webp');

        if (profileAvatar) {
          profileAvatar.src = avatar;
          profileAvatar.onerror = function () {
            this.src = '/img/default-avatar.webp';
          };
        }
        if (profileCover) {
          profileCover.style.backgroundImage = `url('${cover}')`;
        }

        if (profileName) profileName.textContent = safeText(this.dataset.name);
        if (profileEmail) profileEmail.textContent = safeText(this.dataset.email);
        if (profileId) profileId.textContent = safeText(this.dataset.id);
        if (profilePhone) profilePhone.textContent = safeText(this.dataset.sdt);
        if (profileRole) profileRole.textContent = toRoleLabel(this.dataset.role);
        if (profilePosition) profilePosition.textContent = safeText(this.dataset.position);
        if (profileHourlyRate) profileHourlyRate.textContent = safeText(this.dataset.hourlyrate, '0');
        if (profileMaxTime) profileMaxTime.textContent = `${safeText(this.dataset.maxtime, '0')}h/day`;
        if (profileTotalHours) profileTotalHours.textContent = `${safeText(this.dataset.totalworkinghours, '0')}h`;
        if (profileState) profileState.textContent = safeText(this.dataset.state);
        if (profileIntroduce) profileIntroduce.textContent = safeText(this.dataset.introduce);
        if (profileCreatedAt) profileCreatedAt.textContent = formatDateTime(this.dataset.createdat);
        if (profileUpdatedAt) profileUpdatedAt.textContent = formatDateTime(this.dataset.updatedat);
        setStatus(this.dataset.trangthai);

        viewModal.show();
      });
    });
  }

  function setupBulkActions() {
    if (selectAllEmployees) {
      selectAllEmployees.addEventListener('change', function () {
        const visibleCheckboxes = getVisibleRows()
          .map((row) => row.querySelector('.row-checkbox'))
          .filter(Boolean);

        visibleCheckboxes.forEach((checkbox) => {
          checkbox.checked = selectAllEmployees.checked;
        });

        updateSelectAllState();
        updateBulkControls();
      });
    }

    rowCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', function () {
        updateSelectAllState();
        updateBulkControls();
      });
    });

    if (bulkStatusSelect) {
      bulkStatusSelect.addEventListener('change', updateBulkControls);
    }

    if (btnApplyBulkStatus) {
      btnApplyBulkStatus.addEventListener('click', function () {
        const ids = getCheckedIds();
        const statusValue = String(bulkStatusSelect?.value || '').trim();
        if (!ids.length || !statusValue || !formBulkStatus || !bulkStatusHidden) {
          return;
        }

        bulkStatusHidden.value = statusValue;
        fillFormIds(formBulkStatus, ids);
        formBulkStatus.submit();
      });
    }

    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', function () {
        const ids = getCheckedIds();
        if (!ids.length || !formBulkDelete) {
          return;
        }

        const ok = window.confirm(`Delete ${ids.length} selected employee(s)?`);
        if (!ok) return;

        fillFormIds(formBulkDelete, ids);
        formBulkDelete.submit();
      });
    }
  }

  function setupDeleteModal() {
    const deleteModal = document.getElementById('deleteEmployeeModal');
    const deleteBtn = document.getElementById('btn-delete-confirm');
    const formDelete = document.getElementById('formDelete');

    if (!deleteModal || !deleteBtn || !formDelete) return;

    deleteModal.addEventListener('show.bs.modal', function (event) {
      const trigger = event.relatedTarget;
      deleteId = trigger ? trigger.getAttribute('data-id') || '' : '';
    });

    deleteBtn.addEventListener('click', function () {
      if (!deleteId) return;
      formDelete.action = `/employee/${deleteId}?_method=DELETE`;
      formDelete.submit();
    });
  }

  setupStatusLabels();
  populatePositionFilter();
  updateSummary();
  applyFilters();
  setupBulkActions();
  setupViewProfileModal();
  setupEditModal();
  setupDeleteModal();
  updateSelectAllState();
  updateBulkControls();

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (positionFilter) positionFilter.addEventListener('change', applyFilters);
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      searchInput.value = '';
      statusFilter.value = 'all';
      positionFilter.value = 'all';
      applyFilters();
    });
  }
});
