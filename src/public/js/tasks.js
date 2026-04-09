document.addEventListener('DOMContentLoaded', function () {
  const filterPriority = document.getElementById('filterPriority');
  const unassignedList = document.getElementById('unassignedList');
  const assignedList = document.getElementById('assignedList');
  const unassignedCount = document.getElementById('unassignedCount');
  const assignedCount = document.getElementById('assignedCount');
  const btnAdd = document.getElementById('btn-add');
  const taskForm = document.getElementById('taskForm');
  const createDateStart = document.getElementById('createDateStart');
  const createDateEnd = document.getElementById('createDateEnd');
  const createDeadline = document.getElementById('createDeadline');
  const suggestedEmployees = document.getElementById('suggestedEmployees');
  const suggestedHint = document.getElementById('suggestedHint');

  if (!filterPriority || !unassignedList || !assignedList) return;

  const taskModalEl = document.getElementById('taskModal');
  const editModalEl = document.getElementById('taskEditModal');
  const deleteModalEl = document.getElementById('deleteConfirmModal');
  const assignModalEl = document.getElementById('assignTaskModal');
  const unassignModalEl = document.getElementById('unassignModal');
  const commentsModalEl = document.getElementById('commentsModal');
  const commentsList = document.getElementById('commentsList');
  const commentForm = document.getElementById('commentForm');

  const taskModal = taskModalEl ? new bootstrap.Modal(taskModalEl) : null;
  const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
  const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;
  const assignModal = assignModalEl ? new bootstrap.Modal(assignModalEl) : null;
  const unassignModal = unassignModalEl ? new bootstrap.Modal(unassignModalEl) : null;
  const commentsModal = commentsModalEl ? new bootstrap.Modal(commentsModalEl) : null;

  const actionForm = document.getElementById('actionForm');
  const users = window.usersData || [];
  const rawTasks = window.tasksData || [];
  const rawData = window.assignmentsData || [];

  const recurrenceLabel = {
    none: 'No recurrence',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapeAttr = (value) => escapeHtml(value);

  const safePriority = (value) => {
    const parsed = Number.parseInt(value, 10);
    return parsed >= 1 && parsed <= 5 ? parsed : 3;
  };

  const toMinuteOfDay = (timeValue) => {
    const [h, m] = String(timeValue || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
  };

  let currentAssignTaskId = '';
  let currentUnassignTaskId = '';
  let currentCommentTaskId = '';
  let currentUnassignDistributionId = '';
  let currentAssignedEmployeeIds = [];
  let currentRemainingSlots = 0;
  let lastSuggestions = [];

  const normalizeTask = (task) => {
    const required = Number.parseInt(task.required_people, 10);
    const assigned = Number.parseInt(task.assigned_people_count, 10);
    const recurrence = String(task.recurrence_type || 'none').toLowerCase();

    return {
      ...task,
      required_people: Number.isFinite(required) && required > 0 ? required : 1,
      assigned_people_count: Number.isFinite(assigned) && assigned >= 0 ? assigned : 0,
      recurrence_type: recurrenceLabel[recurrence] ? recurrence : 'none',
    };
  };

  let tasks = rawTasks.map(normalizeTask);

  const assignmentRows = rawData
    .filter((row) => row && row.taskID && row.employeeID)
    .map((row) => ({
      distributionId: String(row._id),
      taskId: String(row.taskID._id),
      employeeId: String(row.employeeID._id),
      employeeName: row.employeeID.name || 'No name',
      employeeAvatar: row.employeeID.avatar || '/img/default-avatar.webp',
      taskName: row.taskID.name_task || 'No name',
      dateStart: row.taskID.dateStart || '--:--',
      dateEnd: row.taskID.dateEnd || '--:--',
      deadline: row.taskID.deadline ? String(row.taskID.deadline).slice(0, 10) : '--',
      priority: Number.parseInt(row.taskID.priority, 10) || 3,
    }));

  const countByTask = {};
  for (const row of assignmentRows) {
    countByTask[row.taskId] = (countByTask[row.taskId] || 0) + 1;
  }

  tasks = tasks.map((task) => {
    const taskId = String(task._id);
    const actualAssigned = countByTask[taskId] || 0;
    return {
      ...task,
      assigned_people_count: actualAssigned,
    };
  });

  const refreshedTaskMap = new Map(tasks.map((task) => [String(task._id), task]));

  function fillAssignEmployeeSelect() {
    const select = document.getElementById('assignEmployeeSelect');
    if (!select) return;
    const filterPosition = document.getElementById('filterPosition').value;
    select.innerHTML = '';
    select.classList.remove('is-invalid');

    const availableUsers = users.filter((user) => {
      if (filterPosition !== 'all' && user.position !== filterPosition) {
        return false;
      }
      return !currentAssignedEmployeeIds.includes(String(user._id));
    });

    for (const user of availableUsers) {
      const option = document.createElement('option');
      option.value = String(user._id);
      option.textContent = `${user.name} - ${user.position}`;
      select.appendChild(option);
    }
  }

  function renderSuggestedEmployees(items) {
    const filterPositionEl = document.getElementById('filterPosition');
    if (!filterPositionEl || !suggestedEmployees) return;
    const filterPosition = filterPositionEl.value;
    suggestedEmployees.innerHTML = '';

    const filtered = (items || []).filter((item) => {
      if (currentAssignedEmployeeIds.includes(String(item.id))) {
        return false;
      }
      if (filterPosition !== 'all' && item.position !== filterPosition) {
        return false;
      }
      return true;
    });

    if (!filtered.length) {
      suggestedEmployees.innerHTML = '<span class="small text-muted">No suggestions available.</span>';
      if (suggestedHint) suggestedHint.textContent = '';
      return;
    }

    if (suggestedHint) suggestedHint.textContent = 'Top 3 by light workload';

    for (const item of filtered) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-primary btn-sm';
      btn.textContent = `${item.name} (${item.tasksThisWeek} tasks, ${item.hoursWorked}h)`;
      btn.dataset.employeeId = String(item.id);
      btn.addEventListener('click', () => {
        const select = document.getElementById('assignEmployeeSelect');
        if (select) {
          select.value = String(item.id);
          select.dispatchEvent(new Event('change'));
        }
      });
      suggestedEmployees.appendChild(btn);
    }
  }

  async function loadSuggestedEmployees(taskId) {
    if (!suggestedEmployees) return;
    suggestedEmployees.innerHTML = '<span class="small text-muted">Loading suggestions...</span>';
    if (suggestedHint) suggestedHint.textContent = '';

    try {
      const response = await fetch(`/tasks/${taskId}/suggestions`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const payload = await response.json();
      lastSuggestions = Array.isArray(payload.items) ? payload.items : [];
      renderSuggestedEmployees(lastSuggestions);
    } catch (error) {
      lastSuggestions = [];
      suggestedEmployees.innerHTML = '<span class="small text-muted">No suggestions available.</span>';
    }
  }

  function renderNeedAssignTask(task) {
    const taskId = String(task._id);
    const remain = Math.max(task.required_people - task.assigned_people_count, 0);
    const deadlineText = task.deadline ? String(task.deadline).slice(0, 10) : '--';
    const recurrenceText = recurrenceLabel[task.recurrence_type] || recurrenceLabel.none;
    const priorityValue = safePriority(task.priority);

    const safeTaskId = escapeAttr(taskId);
    const safeTaskName = escapeHtml(task.name_task || 'No name');
    const safeTaskDescription = escapeHtml(task.description_task || 'No description');
    const safeDateStart = escapeHtml(task.dateStart || '--:--');
    const safeDateEnd = escapeHtml(task.dateEnd || '--:--');
    const safeDeadline = escapeHtml(deadlineText);
    const safeRecurrence = escapeHtml(recurrenceText);
    const safeEstimatedHours = escapeHtml(task.estimated_total_hours || 0);
    const safeAssigned = escapeHtml(task.assigned_people_count || 0);
    const safeRequired = escapeHtml(task.required_people || 1);
    const safeRemain = escapeHtml(remain);

    return `
      <div class="list-group-item border-0 bg-transparent px-0 mb-2 task-item">
        <div class="card task-card">
          <div class="priority-accent p-${priorityValue}"></div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h6 class="mb-1">${safeTaskName}</h6>
                <div class="small-muted">${safeDateStart} - ${safeDateEnd} | ${safeEstimatedHours}h</div>
                <div class="small-muted">Deadline: ${safeDeadline}</div>
                <div class="small-muted">Recurrence: ${safeRecurrence}</div>
                <div class="small-muted">Assigned: ${safeAssigned}/${safeRequired} people</div>
                <div class="small-muted">Remaining: ${safeRemain} people</div>
              </div>
              <div class="task-right text-end d-flex align-items-center gap-2">
                <div class="task-time">
                  <div class="fw-semibold">${safeDateStart} - ${safeDateEnd}</div>
                  <div class="small-muted">${safeEstimatedHours} hours</div>
                </div>
                <div class="task-actions">
                  <button class="task-action-btn btn-comments-task"
                    data-id="${safeTaskId}"
                    data-name="${escapeAttr(task.name_task || '')}"
                    title="Discussions">
                    <i class="bi bi-chat-dots-fill text-primary"></i>
                  </button>
                  <button class="task-action-btn btn-edit-task"
                    data-id="${safeTaskId}"
                    data-name="${escapeAttr(task.name_task || '')}"
                    data-description="${escapeAttr(task.description_task || '')}"
                    data-priority="${priorityValue}"
                    data-deadline="${escapeAttr(deadlineText)}"
                    data-start="${escapeAttr(task.dateStart || '')}"
                    data-end="${escapeAttr(task.dateEnd || '')}"
                    data-recurrence="${escapeAttr(task.recurrence_type || 'none')}"
                    data-required="${escapeAttr(task.required_people || 1)}"
                    title="Edit task">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="task-action-btn btn-delete btn-delete-task" data-id="${safeTaskId}" data-name="${escapeAttr(task.name_task || '')}" title="Delete task">
                    <i class="bi bi-trash"></i>
                  </button>
                  ${remain > 0 ? `
                    <button class="task-action-btn btn-assign-task"
                      data-id="${safeTaskId}"
                      data-name="${escapeAttr(task.name_task || '')}"
                      data-start="${escapeAttr(task.dateStart || '')}"
                      data-end="${escapeAttr(task.dateEnd || '')}"
                      data-deadline="${escapeAttr(deadlineText)}"
                      data-required="${escapeAttr(task.required_people || 1)}"
                      data-assigned="${escapeAttr(task.assigned_people_count || 0)}"
                      title="Assign task">
                      <i class="bi bi-person-plus"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
            <div class="task-desc mt-2">${safeTaskDescription}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAssignedRow(row) {
    const task = refreshedTaskMap.get(row.taskId);
    const assigned = task ? task.assigned_people_count : 0;
    const required = task ? task.required_people : 1;
    const recurrence = task ? (recurrenceLabel[task.recurrence_type] || recurrenceLabel.none) : recurrenceLabel.none;
    const deadlineText = task && task.deadline ? String(task.deadline).slice(0, 10) : row.deadline;
    const priorityValue = safePriority(row.priority);

    const safeTaskId = escapeAttr(row.taskId);
    const safeDistributionId = escapeAttr(row.distributionId);
    const safeTaskName = escapeHtml(row.taskName || 'No name');
    const safeDateStart = escapeHtml(row.dateStart || '--:--');
    const safeDateEnd = escapeHtml(row.dateEnd || '--:--');
    const safeDeadline = escapeHtml(deadlineText || '--');
    const safeRecurrence = escapeHtml(recurrence);
    const safeAssigned = escapeHtml(assigned);
    const safeRequired = escapeHtml(required);
    const safeEmployeeName = escapeHtml(row.employeeName || 'No name');
    const safeEmployeeAvatar = escapeAttr(row.employeeAvatar || '/img/default-avatar.webp');

    return `
      <div class="list-group-item border-0 bg-transparent px-0 mb-2 task-item">
        <div class="card task-card">
          <div class="priority-accent p-${priorityValue}"></div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h6 class="mb-1">${safeTaskName}</h6>
                <div class="small-muted">Deadline: ${safeDeadline}</div>
                <div class="small-muted">Recurrence: ${safeRecurrence}</div>
                <div class="small-muted">Assignment progress: ${safeAssigned}/${safeRequired} people</div>
                <div class="d-flex align-items-center gap-2 text-muted small mt-1">
                  <img src="${safeEmployeeAvatar}" class="rounded-circle" width="22" height="22">
                  <span>${safeEmployeeName}</span>
                </div>
              </div>
              <div class="task-right text-end d-flex align-items-center gap-2">
                <div class="task-time">
                  <div class="fw-semibold">${safeDateStart} - ${safeDateEnd}</div>
                </div>
                <div class="task-actions">
                  <button class="task-action-btn btn-comments-task"
                    data-id="${safeTaskId}"
                    data-name="${escapeAttr(task ? (task.name_task || '') : (row.taskName || ''))}"
                    title="Discussions">
                    <i class="bi bi-chat-dots-fill text-primary"></i>
                  </button>
                  <button class="task-action-btn btn-edit-task"
                    data-id="${safeTaskId}"
                    data-name="${escapeAttr(task ? (task.name_task || '') : (row.taskName || ''))}"
                    data-description="${escapeAttr(task ? (task.description_task || '') : '')}"
                    data-priority="${escapeAttr(task ? (task.priority || 3) : priorityValue)}"
                    data-deadline="${escapeAttr(deadlineText || '')}"
                    data-start="${escapeAttr(task ? (task.dateStart || '') : (row.dateStart || ''))}"
                    data-end="${escapeAttr(task ? (task.dateEnd || '') : (row.dateEnd || ''))}"
                    data-recurrence="${escapeAttr(task ? (task.recurrence_type || 'none') : 'none')}"
                    data-required="${escapeAttr(task ? (task.required_people || 1) : 1)}"
                    title="Edit task">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="task-action-btn btn-delete btn-delete-task" data-id="${safeTaskId}" data-name="${escapeAttr(row.taskName || '')}" title="Delete task">
                    <i class="bi bi-trash"></i>
                  </button>
                  <button class="task-action-btn btn-unassign btn-unassign-task"
                    data-task-id="${safeTaskId}"
                    data-distribution-id="${safeDistributionId}"
                    data-user-name="${escapeAttr(row.employeeName || '')}"
                    title="Unassign">
                    <i class="bi bi-person-dash"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="task-desc mt-2">${escapeHtml(task ? (task.description_task || '') : '') || 'No description'}</div>
          </div>
        </div>
      </div>
    `;
  }

  function bindDynamicActions() {
    document.querySelectorAll('.task-card').forEach((card) => {
      card.addEventListener('click', function () {
        this.classList.toggle('open');
      });
    });

    document.querySelectorAll('.btn-edit-task').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (editModal) {
          document.getElementById('editNameTask').value = this.dataset.name || '';
          document.getElementById('editDescriptionTask').value = this.dataset.description || '';
          document.getElementById('editPriority').value = this.dataset.priority || '3';
          document.getElementById('editDeadline').value = this.dataset.deadline || '';
          document.getElementById('editDateStart').value = this.dataset.start || '';
          document.getElementById('editDateEnd').value = this.dataset.end || '';
          document.getElementById('editRecurrenceType').value = this.dataset.recurrence || 'none';
          document.getElementById('editRequiredPeople').value = this.dataset.required || '1';
          const editForm = document.getElementById('taskEditForm');
          if (editForm) editForm.action = `/tasks/${this.dataset.id}?_method=PUT`;
          editModal.show();
        }
      });
    });

    document.querySelectorAll('.btn-delete-task').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (deleteModal) {
          document.getElementById('deleteTaskName').textContent = this.dataset.name || '';
          if (actionForm) actionForm.action = `/tasks/${this.dataset.id}?_method=DELETE`;
          deleteModal.show();
        }
      });
    });

    document.querySelectorAll('.btn-assign-task').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (assignModal) {
          currentAssignTaskId = this.dataset.id;
          const required = Number.parseInt(this.dataset.required, 10) || 1;
          const assigned = Number.parseInt(this.dataset.assigned, 10) || 0;
          currentRemainingSlots = Math.max(required - assigned, 0);

          currentAssignedEmployeeIds = assignmentRows
            .filter((row) => row.taskId === currentAssignTaskId)
            .map((row) => row.employeeId);

          document.getElementById('assignTaskName').textContent = this.dataset.name || '';
          document.getElementById('assignTaskInfo').textContent =
            `${this.dataset.start || '--:--'} - ${this.dataset.end || '--:--'} | Deadline: ${this.dataset.deadline || '--'}`;
          document.getElementById('assignTaskSlots').textContent =
            `Required ${required} people, assigned ${assigned}, available ${currentRemainingSlots}`;

          fillAssignEmployeeSelect();
          loadSuggestedEmployees(currentAssignTaskId);
          assignModal.show();
        }
      });
    });

    document.querySelectorAll('.btn-unassign-task').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (unassignModal) {
          currentUnassignTaskId = this.dataset.taskId;
          currentUnassignDistributionId = this.dataset.distributionId;
          document.getElementById('unassignUserName').textContent = this.dataset.userName || '';
          unassignModal.show();
        }
      });
    });

    document.querySelectorAll('.btn-comments-task').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (commentsModal) {
          currentCommentTaskId = this.dataset.id;
          document.getElementById('commentTaskName').textContent = this.dataset.name || 'Task Discussions';
          commentsModal.show();
          loadComments(currentCommentTaskId);
        }
      });
    });
  }

  const renderCommentItem = (item) => {
    const avatar = item.userID?.avatar || '/img/default-avatar.webp';
    const name = item.userID?.name || 'Unknown';
    const time = new Date(item.createdAt).toLocaleString('vi-VN');
    const content = escapeHtml(item.content);
    return `
      <div class="d-flex flex-row p-3 rounded bg-white border border-light shadow-sm w-100 mb-2">
        <img src="${escapeAttr(avatar)}" width="40" height="40" class="rounded-circle me-3 mt-1 shadow-sm">
        <div class="w-100">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-bold text-dark">${escapeHtml(name)}</span>
            <small class="text-muted"><i class="bi bi-clock"></i> ${time}</small>
          </div>
          <p class="mb-0 text-dark" style="white-space: pre-wrap; font-size: 0.95rem;">${content}</p>
        </div>
      </div>
    `;
  };

  async function loadComments(taskId) {
    if (!commentsList) return;
    commentsList.innerHTML = '<div class="text-center text-muted small mt-4"><div class="spinner-border spinner-border-sm me-2"></div>Loading comments...</div>';
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json();
      if (!data.ok) throw new Error();
      if (!data.items || data.items.length === 0) {
        commentsList.innerHTML = '<div class="text-center text-muted small mt-4">No comments yet. Start the discussion!</div>';
        return;
      }
      commentsList.innerHTML = data.items.map(renderCommentItem).join('');
      setTimeout(() => {
        commentsList.scrollTop = commentsList.scrollHeight;
      }, 100);
    } catch (e) {
      commentsList.innerHTML = '<div class="text-center text-danger small mt-4">Failed to load comments</div>';
    }
  }

  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentCommentTaskId) return;
      const contentInput = document.getElementById('commentContent');
      const content = contentInput.value.trim();
      if (!content) return;
      
      const btnSend = document.getElementById('btnSendComment');
      if (btnSend) {
          btnSend.disabled = true;
          btnSend.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      }

      try {
        const res = await fetch(`/api/tasks/${currentCommentTaskId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.ok && data.item) {
          contentInput.value = '';
          if (commentsList.innerHTML.includes('No comments yet')) {
            commentsList.innerHTML = '';
          }
          commentsList.insertAdjacentHTML('beforeend', renderCommentItem(data.item));
          commentsList.scrollTop = commentsList.scrollHeight;
        } else {
          alert(data.message || 'Failed to post comment');
        }
      } catch (err) {
        alert('An error occurred. Please try again.');
      } finally {
        if (btnSend) {
            btnSend.disabled = false;
            btnSend.innerHTML = '<i class="bi bi-send-fill me-1"></i> Send';
        }
      }
    });
  }

  function render() {
    unassignedList.innerHTML = '';
    assignedList.innerHTML = '';

    const priorityFilter = filterPriority.value;

    const needTasks = tasks
      .filter((task) => task.assigned_people_count < task.required_people)
      .filter((task) => {
        if (priorityFilter !== 'all' && String(task.priority) !== priorityFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    const assignedRows = assignmentRows
      .filter((row) => {
        if (priorityFilter !== 'all' && String(row.priority) !== priorityFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return String(a.taskName).localeCompare(String(b.taskName));
      });

    unassignedCount.textContent = String(needTasks.length);
    assignedCount.textContent = String(assignedRows.length);

    if (needTasks.length === 0) {
      unassignedList.innerHTML = '<div class="alert alert-light border mb-0">No tasks in this column.</div>';
    } else {
      for (const task of needTasks) {
        unassignedList.insertAdjacentHTML('beforeend', renderNeedAssignTask(task));
      }
    }

    if (assignedRows.length === 0) {
      assignedList.innerHTML = '<div class="alert alert-light border mb-0">No task assignments yet.</div>';
    } else {
      for (const row of assignedRows) {
        assignedList.insertAdjacentHTML('beforeend', renderAssignedRow(row));
      }
    }

    bindDynamicActions();
  }

  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = function () {
      if (actionForm) actionForm.submit();
    };
  }

  const confirmAssignBtn = document.getElementById('confirmAssignBtn');
  if (confirmAssignBtn) {
    confirmAssignBtn.onclick = function () {
      const select = document.getElementById('assignEmployeeSelect');
      if (!currentAssignTaskId || currentRemainingSlots <= 0) {
        return;
      }
      if (!select || !select.value) {
        if (select) {
          select.classList.add('is-invalid');
          select.focus();
        }
        return;
      }
      if (actionForm) {
        actionForm.action = `/tasks/${currentAssignTaskId}/${select.value}`;
        actionForm.submit();
      }
    };
  }

  const confirmUnassignBtn = document.getElementById('confirmUnassignBtn');
  if (confirmUnassignBtn) {
    confirmUnassignBtn.onclick = function () {
      if (!currentUnassignTaskId || !currentUnassignDistributionId) {
        return;
      }
      if (actionForm) {
        actionForm.action = `/tasks/${currentUnassignTaskId}/${currentUnassignDistributionId}?_method=DELETE`;
        actionForm.submit();
      }
    };
  }

  const filterPositionEl = document.getElementById('filterPosition');
  if (filterPositionEl) {
    filterPositionEl.onchange = function () {
      fillAssignEmployeeSelect();
      renderSuggestedEmployees(lastSuggestions);
    };
  }

  const assignEmployeeSelect = document.getElementById('assignEmployeeSelect');
  if (assignEmployeeSelect) {
    assignEmployeeSelect.onchange = function () {
      this.classList.remove('is-invalid');
    };
  }

  if (createDeadline) {
    const now = new Date();
    const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    createDeadline.min = localToday;
    if (!createDeadline.value) {
      createDeadline.value = localToday;
    }
  }

  if (taskForm) {
    taskForm.addEventListener('submit', function (e) {
      const startValue = createDateStart ? createDateStart.value : '';
      const endValue = createDateEnd ? createDateEnd.value : '';
      const deadlineValue = createDeadline ? createDeadline.value : '';

      if (!startValue || !endValue || !deadlineValue) {
        return;
      }

      const startMinutes = toMinuteOfDay(startValue);
      const endMinutes = toMinuteOfDay(endValue);

      if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
        e.preventDefault();
        alert('End time must be greater than start time.');
        return;
      }

      if (createDeadline && createDeadline.min && deadlineValue < createDeadline.min) {
        e.preventDefault();
        alert('Deadline must be today or later.');
      }
    });
  }

  if (btnAdd) {
    btnAdd.onclick = () => taskModal && taskModal.show();
  }
  if (filterPriority) {
    filterPriority.onchange = render;
  }

  render();
});
