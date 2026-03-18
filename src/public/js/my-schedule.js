document.addEventListener('DOMContentLoaded', function () {
  const days = ['day-8', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-7'];
  const scheduleData = window.scheduleData || [];
  let currentWeekStart = getMonday(new Date());

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay() || 7;
    if (day !== 1) date.setDate(date.getDate() - day + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function formatDate(d) {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  function toMinutes(time) {
    const [h, m] = String(time || '00:00').split(':').map(Number);
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
      return new Date(Number(pureDate[1]), Number(pureDate[2]) - 1, Number(pureDate[3]));
    }

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
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

    if (recurrenceType === 'daily') return true;
    if (recurrenceType === 'weekly') return diffDays % 7 === 0;
    if (recurrenceType === 'monthly') return dayDate.getDate() === startDate.getDate();
    return isSameDate(startDate, dayDate);
  }

  function getTaskOccurrencesInCurrentWeek(item) {
    const startDate = parseTaskDate(item?.taskID?.deadline);
    if (!startDate) return [];

    const recurrenceType = normalizeRecurrenceType(item?.taskID?.recurrence_type);
    const out = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      if (shouldRenderOnDay(startDate, recurrenceType, dayDate)) out.push(dayDate);
    }
    return out;
  }

  function clearTasks() {
    document.querySelectorAll('.task').forEach((e) => e.remove());
  }

  function renderTask(item, occurrenceDate) {
    const task = item.taskID;
    if (!task) return;

    const date = occurrenceDate ? new Date(occurrenceDate) : parseTaskDate(task.deadline);
    if (!date) return;
    const dayId = days[date.getDay()];
    const col = document.getElementById(dayId);
    if (!col) return;

    const startMin = toMinutes(task.dateStart);
    const endMin = toMinutes(task.dateEnd || task.dateStart);
    const top = startMin - (8 * 60);
    const height = Math.max(20, endMin - startMin);
    const status = String(item.status || '').toLowerCase();
    const colorClass = status === 'completed' ? 'task-completed' : (status === 'late' ? 'task-late' : 'task-default');

    const lane = getLaneForTask(col, startMin, endMin);
    const laneOffset = 8;

    const el = document.createElement('div');
    el.className = `task ${colorClass}`;
    el.style.top = `${top}px`;
    el.style.height = `${height}px`;
    el.style.left = `${6 + lane * laneOffset}px`;
    el.style.right = `${6 + lane * laneOffset}px`;
    if (height < 36) el.classList.add('task--compact');
    el.classList.add('task--clickable');
    el.dataset.title = task.name_task || 'Task';
    el.dataset.time = `${task.dateStart || '--:--'} - ${task.dateEnd || '--:--'}`;
    el.dataset.desc = String(task.description_task || '').trim();
    el.dataset.startMin = startMin;
    el.dataset.endMin = endMin;
    el.dataset.lane = lane;
    el.innerHTML = `
      <div class="task-title">${task.name_task || 'Task'}</div>
      <div class="task-time">${task.dateStart || '--:--'} - ${task.dateEnd || '--:--'}</div>
      <div class="task-desc">${task.description_task || ''}</div>
    `;
    el.title = `${task.name_task || 'Task'}\n${task.dateStart || '--:--'} - ${task.dateEnd || '--:--'}`;

    col.appendChild(el);
  }

  function renderWeekHeader() {
    const weekLabelEl = document.getElementById('weekLabel');
    if (!weekLabelEl) return;

    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    weekLabelEl.innerText = `${formatDate(start)} - ${formatDate(end)}`;

    const headers = document.querySelectorAll('.calendar-header > div');
    const names = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll('.day-col').forEach((c) => c.classList.remove('today'));
    headers.forEach((h) => h.classList.remove('today'));

    for (let i = 1; i <= 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i - 1);
      d.setHours(0, 0, 0, 0);
      if (headers[i]) {
        headers[i].innerHTML = `<div class="day-name">${names[i - 1]}</div><div class="day-date">${d.getDate()}/${d.getMonth() + 1}</div>`;

        if (d.getTime() === today.getTime()) {
          headers[i].classList.add('today');
          const dayEl = document.getElementById(days[d.getDay()]);
          if (dayEl) dayEl.classList.add('today');
        }
      }
    }
  }

  function renderSchedule() {
    clearTasks();
    scheduleData.forEach((item) => {
      const occurrences = getTaskOccurrencesInCurrentWeek(item);
      occurrences.forEach((d) => renderTask(item, d));
    });
  }

  window.prevWeek = function () {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderWeekHeader();
    renderSchedule();
  }

  window.nextWeek = function () {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderWeekHeader();
    renderSchedule();
  }

  renderWeekHeader();
  renderSchedule();

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
    if (!popover) return;
    lastTaskEl = target;
    const title = target.dataset.title || 'Task';
    const time = target.dataset.time || '';
    const desc = target.dataset.desc || '';
    if (popoverTitle) popoverTitle.textContent = title;
    if (popoverTime) popoverTime.textContent = time;
    if (popoverDesc) popoverDesc.textContent = desc || 'No description.';

    popover.hidden = false;

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

  document.addEventListener('click', (event) => {
    const taskEl = event.target.closest('.task');
    if (!taskEl) {
      hidePopover();
      return;
    }
    showPopover(taskEl);
  });

  if (popoverDetail) {
    popoverDetail.addEventListener('click', () => {
      if (!lastTaskEl || !detailModal) return;
      if (detailTitle) detailTitle.textContent = lastTaskEl.dataset.title || 'Task';
      if (detailTime) detailTime.textContent = lastTaskEl.dataset.time || '';
      if (detailDesc) detailDesc.textContent = lastTaskEl.dataset.desc || 'No description.';
      detailModal.show();
    });
  }

  if (popoverClose) popoverClose.addEventListener('click', hidePopover);
  window.addEventListener('scroll', hidePopover, { passive: true });
  window.addEventListener('resize', hidePopover);
});
