const days = [
  "day-8",
  "day-2",
  "day-3",
  "day-4",
  "day-5",
  "day-6",
  "day-7"
];

let currentView = { type: 'all', employeeId: null };
let currentWeekStart = getMonday(new Date());

function clearTasks() {
  document.querySelectorAll('.task').forEach(e => e.remove());
}

function setActiveSidebar(type, employeeId = null) {
  document.querySelectorAll('.employee-item').forEach(item => item.classList.remove('active'));

  const activeId = type === 'employee' ? `user-${employeeId}` : 'employee-all';
  const activeItem = document.getElementById(activeId);
  if (activeItem) activeItem.classList.add('active');
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function hasOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function getLaneForTask(dayCol, startMin, endMin) {
  const lanes = [];
  dayCol.querySelectorAll('.task').forEach((el) => {
    const lane = Number(el.dataset.lane || 0);
    const s = Number(el.dataset.startMin || 0);
    const e = Number(el.dataset.endMin || 0);
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push([s, e]);
  });

  let laneIndex = 0;
  while (true) {
    const items = lanes[laneIndex] || [];
    const conflict = items.some(([s, e]) => hasOverlap(s, e, startMin, endMin));
    if (!conflict) return laneIndex;
    laneIndex += 1;
  }
}

function parseTaskDate(value) {
  if (!value) return null;

  const raw = String(value).trim();
  const pureDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDate) {
    const year = Number(pureDate[1]);
    const month = Number(pureDate[2]) - 1;
    const day = Number(pureDate[3]);
    return new Date(year, month, day);
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeRecurrenceType(value) {
  const t = String(value || 'none').toLowerCase();
  if (t === 'daily' || t === 'weekly' || t === 'monthly') return t;
  return 'none';
}

function shouldRenderOnDay(startDate, recurrenceType, dayDate) {
  if (!startDate || !dayDate) return false;
  if (dayDate < startDate) return false;

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((dayDate - startDate) / msPerDay);

  switch (recurrenceType) {
    case 'daily':
      return true;
    case 'weekly':
      return diffDays % 7 === 0;
    case 'monthly':
      return dayDate.getDate() === startDate.getDate();
    default:
      return isSameDate(startDate, dayDate);
  }
}

function getTaskOccurrencesInCurrentWeek(task) {
  const startDate = parseTaskDate(task?.taskID?.deadline);
  if (!startDate) return [];

  const recurrenceType = normalizeRecurrenceType(task?.taskID?.recurrence_type);
  const occurrences = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(currentWeekStart.getDate() + i);
    dayDate.setHours(0, 0, 0, 0);

    if (shouldRenderOnDay(startDate, recurrenceType, dayDate)) {
      occurrences.push(dayDate);
    }
  }

  return occurrences;
}

function renderTaskContent(el, task) {
  const h = el.offsetHeight;

  const name = task.taskID.name_task;
  const start = task.taskID.dateStart;
  const end = task.taskID.dateEnd;
  const desc = String(task.taskID.description_task || '').trim();
  const requiredPeople = Number(task?.taskID?.required_people || 1);
  const memberList = Array.isArray(task.employeeMembers) && task.employeeMembers.length
    ? task.employeeMembers
    : (task.employeeID ? [task.employeeID] : []);
  const firstMember = memberList[0] || {};
  const user = task.employeeID?.name || '';
  const avatar = firstMember.avatar || task.employeeID?.avatar || '/img/default-avatar.webp';
  const memberNames = memberList.map(m => m.name).filter(Boolean);
  const shouldShowMembersInAllBoard = currentView.type === 'all' && requiredPeople > 1;
  const memberText = memberNames.join(', ');
  const displayMemberText = memberNames.length > 3
    ? `${memberNames.slice(0, 3).join(', ')} +${memberNames.length - 3}`
    : memberText;

  el.title = shouldShowMembersInAllBoard
    ? `${name}\nMembers: ${memberText}\n${start} – ${end}`
    : `${name}\n${user}\n${start} – ${end}`;

  if (h < 18) {
    el.classList.add('task--dot');
    el.innerHTML = '';
    return;
  }

  if (h < 30) {
    el.classList.add('task--tiny');
    el.innerHTML = `
      <b>${name}</b>
      <div class="task-desc">${desc}</div>
    `;
    return;
  }

  if (h < 50) {
    el.innerHTML = `
      <b>${name}</b>
      <div class="task-time">${start} – ${end}</div>
      <div class="task-desc">${desc}</div>
      ${shouldShowMembersInAllBoard ? `<div class="task-time">Members: ${displayMemberText}</div>` : ''}
    `;
    return;
  }

  el.innerHTML = `
    <div class="task-header">
      <img src="${avatar}" class="task-avatar">
      <b>${name}</b>
    </div>
    <div class="task-time">${start} – ${end}</div>
      <div class="task-desc">${desc}</div>
    ${shouldShowMembersInAllBoard ? `<div class="task-time">Members: ${displayMemberText}</div>` : ''}
  `;
}

function renderTask(task, occurrenceDate = null) {
  const el = document.createElement('div');
  el.className = 'task';

  const startMin = toMinutes(task.taskID.dateStart);
  const endMin = toMinutes(task.taskID.dateEnd || task.taskID.dateStart);
  const top = startMin - 8 * 60;
  const height = endMin - startMin;
  el.style.top = top + 'px';
  el.style.height = height + 'px';
  if (height < 36) el.classList.add('task--compact');
  el.classList.add('task--clickable');
  el.dataset.title = task.taskID.name_task || 'Task';
  el.dataset.time = `${task.taskID.dateStart || '--:--'} - ${task.taskID.dateEnd || '--:--'}`;
  el.dataset.desc = String(task.taskID.description_task || '').trim();
  el.dataset.startMin = startMin;
  el.dataset.endMin = endMin;
  el.dataset.id = task.taskID._id;

  const date = occurrenceDate ? new Date(occurrenceDate) : parseTaskDate(task.taskID.deadline);
  if (!date) return;
  const thu = days[date.getDay()];
  const dayCol = document.getElementById(thu);
  if (!dayCol) return;

  const lane = getLaneForTask(dayCol, startMin, endMin);
  const laneOffset = 8;
  el.style.left = 6 + lane * laneOffset + 'px';
  el.style.right = 6 + lane * laneOffset + 'px';
  el.dataset.lane = lane;
  dayCol.appendChild(el);

  requestAnimationFrame(() => {
    renderTaskContent(el, task);
  });
}

function loadEmployee(nvId, shouldUpdateView = true) {
  if (shouldUpdateView) {
    currentView = { type: 'employee', employeeId: nvId };
  }

  setActiveSidebar('employee', nvId);
  clearTasks();
  const data = window.scheduleData || [];
  const dataFil = data.filter(item => item.employeeID._id == nvId);
  dataFil.forEach(item => {
    const occurrences = getTaskOccurrencesInCurrentWeek(item);
    occurrences.forEach(date => renderTask(item, date));
  });
}

function allBoardSchedule(shouldUpdateView = true) {
  if (shouldUpdateView) {
    currentView = { type: 'all', employeeId: null };
  }

  setActiveSidebar('all');
  clearTasks();

  const groupedByTask = new Map();
  const data = window.scheduleData || [];

  data.forEach(item => {
    const taskId = item?.taskID?._id ? String(item.taskID._id) : null;
    if (!taskId) return;

    if (!groupedByTask.has(taskId)) {
      groupedByTask.set(taskId, {
        ...item,
        employeeMembers: [],
      });
    }

    const group = groupedByTask.get(taskId);
    const memberId = item?.employeeID?._id ? String(item.employeeID._id) : null;
    const existed = memberId
      ? group.employeeMembers.some(m => String(m._id) === memberId)
      : false;

    if (item.employeeID && !existed) {
      group.employeeMembers.push({
        _id: item.employeeID._id,
        name: item.employeeID.name,
        avatar: item.employeeID.avatar,
      });
    }
  });

  groupedByTask.forEach(taskGroup => {
    const occurrences = getTaskOccurrencesInCurrentWeek(taskGroup);
    occurrences.forEach(date => renderTask(taskGroup, date));
  });
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;
  if (day !== 1) date.setDate(date.getDate() - day + 1);
  date.setHours(0,0,0,0);
  return date;
}

function renderWeekHeader() {
  const start = new Date(currentWeekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const weekLabelEl = document.getElementById('weekLabel');
  if (weekLabelEl) {
    weekLabelEl.innerText = `${formatDate(start)} – ${formatDate(end)}`;
  }

  const headers = document.querySelectorAll('.calendar-header > div');
  const daysVN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  for (let i = 1; i <= 7; i++) {
    if (headers[i]) {
      const d = new Date(start);
      d.setDate(start.getDate() + i - 1);
      headers[i].innerHTML = `<div class="day-name">${daysVN[i-1]}</div>
    <div class="day-date">${d.getDate()}/${d.getMonth()+1}</div>`;
    }
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  document.querySelectorAll('.day-col').forEach(c => c.classList.remove('today'));
  document.querySelectorAll('.calendar-header > div').forEach(h => h.classList.remove('today'));

  for (let i = 1; i <= 7; i++) {
    if (headers[i]) {
      const d = new Date(start);
      d.setDate(start.getDate() + i - 1);
      d.setHours(0,0,0,0);

      if (d.getTime() === today.getTime()) {
        headers[i].classList.add('today');
        const dayCol = document.getElementById(days[d.getDay()]);
        if (dayCol) dayCol.classList.add('today');
      }
    }
  }
}

function formatDate(d) {
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function prevWeek() {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  reloadCalendar();
}

function nextWeek() {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  reloadCalendar();
}

function reloadCalendar() {
  renderWeekHeader();
  if (currentView.type === 'employee' && currentView.employeeId) {
    loadEmployee(currentView.employeeId, false);
  } else {
    allBoardSchedule(false);
  }
}

// Global Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  renderWeekHeader();
  allBoardSchedule();

  const popover = document.getElementById('taskPopover');
  const popoverTitle = document.getElementById('taskPopoverTitle');
  const popoverTime = document.getElementById('taskPopoverTime');
  const popoverDesc = document.getElementById('taskPopoverDesc');
  const popoverClose = document.getElementById('taskPopoverClose');
  const popoverDetail = document.getElementById('taskPopoverDetail');
  
  const detailModalEl = document.getElementById('taskDetailModal');
  const detailTitle = document.getElementById('taskDetailTitle');
  const detailTime = document.getElementById('taskDetailTime');
  const detailDesc = document.getElementById('taskDetailDesc');
  const detailModal = (detailModalEl && typeof bootstrap !== 'undefined') ? new bootstrap.Modal(detailModalEl) : null;
  let lastTaskEl = null;

  function hidePopover() {
    if (popover) popover.hidden = true;
  }

  function showPopover(target) {
    lastTaskEl = target;
    if (popover) {
      popover.hidden = false;
      popoverTitle.textContent = target.dataset.title || 'Task';
      popoverTime.textContent = target.dataset.time || '';
      popoverDesc.textContent = target.dataset.desc || 'No description.';

      const rect = target.getBoundingClientRect();
      const margin = 12;
      let top = rect.top - popover.offsetHeight - margin;
      let left = rect.left;

      if (top < margin) {
        top = rect.bottom + margin;
      }
      if (left + popover.offsetWidth > window.innerWidth - margin) {
        left = window.innerWidth - popover.offsetWidth - margin;
      }
      if (left < margin) left = margin;

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }
  }

  document.addEventListener('click', (event) => {
    const taskEl = event.target.closest('.task');
    if (!taskEl) {
      hidePopover();
      return;
    }
    document.querySelectorAll('.task').forEach(t => t.classList.remove('active'));
    taskEl.classList.add('active');
    showPopover(taskEl);
  });

  if (popoverDetail) {
    popoverDetail.addEventListener('click', async () => {
      if (!lastTaskEl || !detailModal) return;
      detailTitle.textContent = lastTaskEl.dataset.title || 'Task';
      detailTime.textContent = lastTaskEl.dataset.time || '';
      detailDesc.textContent = lastTaskEl.dataset.desc || 'No description.';
      
      const commentsContainer = document.getElementById('taskDetailComments');
      if (commentsContainer) {
        commentsContainer.innerHTML = '<div class="text-muted small">Loading comments...</div>';
      }
      
      detailModal.show();
      
      const taskId = lastTaskEl.dataset.id;
      if (taskId && commentsContainer) {
        try {
          const res = await fetch(`/api/tasks/${taskId}/comments`);
          const data = await res.json();
          if (data && Array.isArray(data.items)) {
            if (data.items.length === 0) {
              commentsContainer.innerHTML = '<div class="text-muted small">No comments yet.</div>';
            } else {
              commentsContainer.innerHTML = data.items.map(c => `
                <div class="d-flex mb-2">
                  <img src="${c.userID?.avatar || '/img/default-avatar.webp'}" class="rounded-circle me-2" width="32" height="32" style="object-fit:cover">
                  <div class="bg-light p-2 rounded flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                      <strong class="small">${c.userID?.name || 'Unknown'}</strong>
                      <small class="text-muted" style="font-size:0.7rem">${new Date(c.createdAt).toLocaleString()}</small>
                    </div>
                    <div class="small mt-1">${c.content}</div>
                  </div>
                </div>
              `).join('');
            }
          } else {
            commentsContainer.innerHTML = '<div class="text-danger small">Failed to load data.</div>';
          }
        } catch (e) {
          commentsContainer.innerHTML = '<div class="text-danger small">Connection error.</div>';
        }
      }
    });
  }

  document.addEventListener('dblclick', (event) => {
    const taskEl = event.target.closest('.task');
    if (taskEl) {
      document.querySelectorAll('.task').forEach(t => t.classList.remove('active'));
      taskEl.classList.add('active');
      showPopover(taskEl);
      if(popoverDetail) popoverDetail.click();
    }
  });

  if (popoverClose) popoverClose.addEventListener('click', hidePopover);
  window.addEventListener('scroll', hidePopover, { passive: true });
  window.addEventListener('resize', hidePopover);
});
