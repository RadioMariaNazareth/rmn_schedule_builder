/**
 * Radio Maria Nazareth - UI Controller & View Renderer
 * واجهة المستخدم وعروض جدول راديو مريم الناصرة
 */

class RMNUIController {
  constructor() {
    this.toastContainer = null;
    this.scheduleSubView = 'weekly'; // 'weekly' | 'daily'
    this.scheduleSelection = null;
    this.pendingSlotCount = 1;
    this.draggedScheduleBlock = null;
    this.clipboardBlock = null;
    this.hoveredBlock = null;
    this.hoveredSlotInfo = null;
    this.selectedBlock = null;
    this._showingAllProgramsInModal = false;
    this.colorPickerPage = 0;
    this.colorPickerEditingId = null;
    this.savedCalendarScrollTop = null;
    this.savedCalendarScrollLeft = null;
    this.savedWindowScrollY = null;
    this.savedWindowScrollX = null;
    this.compareState = null;
  }

  captureCurrentScroll() {
    const scrollEl = document.querySelector('.calendar-scroll-area');
    if (scrollEl) {
      this.savedCalendarScrollTop = scrollEl.scrollTop;
      this.savedCalendarScrollLeft = scrollEl.scrollLeft;
    }
    this.savedWindowScrollY = window.scrollY;
    this.savedWindowScrollX = window.scrollX;
  }

  restoreCurrentScroll() {
    const scrollEl = document.querySelector('.calendar-scroll-area');
    if (scrollEl && this.savedCalendarScrollTop !== null) {
      scrollEl.scrollTop = this.savedCalendarScrollTop;
      scrollEl.scrollLeft = this.savedCalendarScrollLeft;
    }
    if (typeof this.savedWindowScrollY === 'number') {
      window.scrollTo(this.savedWindowScrollX, this.savedWindowScrollY);
    }
  }

  init() {
    this.setupToastContainer();
    this.refreshAll();
  }

  refreshAll() {
    this.captureCurrentScroll();
    this.renderActiveView();
    this.updateUndoRedoButtons();
    this.restoreCurrentScroll();
  }

  switchView(viewName) {
    window.rmnState.currentView = viewName;

    // Update navigation buttons active state
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      const v = btn.getAttribute('data-view');
      if (v === viewName) {
        btn.classList.add('bg-blue-800', 'text-white', 'shadow-sm');
        btn.classList.remove('text-slate-200', 'hover:bg-blue-900/50');
      } else {
        btn.classList.remove('bg-blue-800', 'text-white', 'shadow-sm');
        btn.classList.add('text-slate-200', 'hover:bg-blue-900/50');
      }
    });

    this.renderActiveView();
  }

  setScheduleSubView(subView) {
    this.scheduleSubView = subView;
    const weeklyBtn = document.getElementById('subViewWeeklyBtn');
    const dailyBtn = document.getElementById('subViewDailyBtn');
    const weeklyControls = document.getElementById('weeklyControlsGroup');
    const dailyControls = document.getElementById('dailyControlsGroup');

    if (subView === 'weekly') {
      weeklyBtn?.classList.add('bg-blue-700', 'text-white', 'shadow-xs');
      weeklyBtn?.classList.remove('text-slate-700', 'hover:bg-slate-200');
      dailyBtn?.classList.remove('bg-blue-700', 'text-white', 'shadow-xs');
      dailyBtn?.classList.add('text-slate-700', 'hover:bg-slate-200');

      weeklyControls?.classList.remove('hidden');
      dailyControls?.classList.add('hidden');
    } else {
      dailyBtn?.classList.add('bg-blue-700', 'text-white', 'shadow-xs');
      dailyBtn?.classList.remove('text-slate-700', 'hover:bg-slate-200');
      weeklyBtn?.classList.remove('bg-blue-700', 'text-white', 'shadow-xs');
      weeklyBtn?.classList.add('text-slate-700', 'hover:bg-slate-200');

      dailyControls?.classList.remove('hidden');
      dailyControls?.classList.add('flex');
      weeklyControls?.classList.remove('hidden');
    }

    this.renderScheduleContent();
  }

  renderActiveView() {
    document.getElementById('actionBar')?.classList.toggle('hidden', window.rmnState.currentView !== 'schedule');
    // Hide all view wrappers first
    document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));

    switch (window.rmnState.currentView) {
      case 'schedule':
        document.getElementById('scheduleViewPanel')?.classList.remove('hidden');
        this.renderScheduleView();
        break;
      case 'library':
        document.getElementById('libraryViewPanel')?.classList.remove('hidden');
        this.renderLibraryView();
        break;
      case 'analytics':
        document.getElementById('analyticsViewPanel')?.classList.remove('hidden');
        this.renderAnalyticsView();
        break;
      case 'settings':
        document.getElementById('settingsViewPanel')?.classList.remove('hidden');
        this.renderSettingsView();
        break;
      default:
        document.getElementById('scheduleViewPanel')?.classList.remove('hidden');
        this.renderScheduleView();
    }
  }

  // --- 1. UNIFIED SCHEDULE VIEW ---
  renderScheduleView() {
    const activeSchedule = document.getElementById('activeScheduleName');
    if (activeSchedule) {
      activeSchedule.textContent = window.rmnState.activeScheduleName;
      activeSchedule.title = `اسم الجدول النشط: ${window.rmnState.activeScheduleName}`;
    }
    const printSchedule = document.getElementById('printScheduleName');
    if (printSchedule) {
      printSchedule.textContent = window.rmnState.activeScheduleName;
    }
    this.setScheduleSubView(this.scheduleSubView);
  }

  renderScheduleContent() {
    const container = document.getElementById('scheduleMainContent');
    if (!container) return;

    if (this.scheduleSubView === 'weekly') {
      this.renderWeeklyContent(container);
    } else {
      this.renderDailyContent(container);
    }
  }

  // --- WEEKLY CONTENT (SMART BLOCKS OR 5-MIN DETAILED) ---
  renderWeeklyContent(container) {
    this.renderTimelineGrid(container, RMN_DAYS);
  }

  renderWeeklyBlocks(container) {
    let html = `<div class="grid grid-cols-7 gap-3 min-w-[1050px] overflow-x-auto pb-4">`;

    RMN_DAYS.forEach(day => {
      const blocks = window.rmnState.getDayBlocks(day.id);
      const isSelectedDay = day.id === window.rmnState.selectedDay;

      html += `
        <div class="flex flex-col bg-slate-100/70 rounded-2xl p-2.5 border ${isSelectedDay ? 'border-blue-400 shadow-sm' : 'border-slate-200'}">
          <!-- Day Header -->
          <div class="flex items-center justify-between p-2 mb-2 bg-white rounded-xl shadow-2xs border border-slate-200/80 sticky-day-header">
            <div>
              <h3 class="font-extrabold text-slate-800 text-sm">${day.nameAr}</h3>
              <span class="text-[11px] text-slate-500">${day.nameEn}</span>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="window.rmnUI.openCloneDayModal('${day.id}')" title="نسخ هذا اليوم لأيام أخرى" class="p-1 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">📋</button>
              <button onclick="window.rmnUI.clearDayConfirm('${day.id}')" title="تفريغ هذا اليوم" class="p-1 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold">🗑️</button>
            </div>
          </div>

          <!-- Day Blocks Timeline -->
          <div class="flex flex-col gap-1.5 flex-1">
      `;

      blocks.forEach(block => {
        const time = window.rmnState.formatTimeRange(block.startSlot, block.count);
        const prog = block.programId ? window.rmnState.getProgram(block.programId) : null;
        const cat = prog ? window.rmnState.getCategory(prog.categoryId) : null;

        if (prog) {
          html += `
            <div 
              class="slot-cell p-2.5 rounded-xl text-white shadow-2xs flex flex-col justify-between border border-white/10"
              style="background-color: ${prog.color}; min-height: ${Math.max(54, Math.min(180, block.count * 8))}px;"
              onclick="window.rmnUI.handleSlotClick('${day.id}', ${block.startSlot}, ${block.count})"
              title="${time.label} | ${prog.title}"
            >
              <div>
                <div class="flex items-center justify-between text-[11px] text-white/90 font-medium mb-1">
                  <span>${time.startStr} - ${time.endStr}</span>
                </div>
                <h4 class="font-extrabold text-xs leading-snug line-clamp-2">${prog.title}</h4>
              </div>
            </div>
          `;
        } else {
          html += `
            <div 
              class="slot-cell p-2 rounded-xl bg-white hover:bg-amber-50/70 border border-dashed border-amber-300 text-slate-500 flex flex-col justify-center items-center text-center cursor-pointer transition"
              style="min-height: ${Math.max(38, Math.min(100, block.count * 6))}px;"
              onclick="window.rmnUI.handleSlotClick('${day.id}', ${block.startSlot}, ${block.count})"
              title="فترة شاغرة: ${time.label}"
            >
              <div class="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                <span>⚠️</span> <span>${time.startStr} - ${time.endStr}</span>
              </div>
              <span class="text-[11px] text-slate-500 font-bold mt-0.5">+ تعيين برنامج (${time.durationLabel})</span>
            </div>
          `;
        }
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  renderWeeklyDetailedSlots(container) {
    let html = `
      <div class="min-w-[1100px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div class="grid grid-cols-8 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 sticky-day-header p-2">
          <div class="text-center py-1">الساعة</div>
          ${RMN_DAYS.map(d => `<div class="text-center py-1">${d.nameAr}</div>`).join('')}
        </div>
        <div class="divide-y divide-slate-100 max-h-[750px] overflow-y-auto">
    `;

    for (let h = 0; h < 24; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      html += `
        <div class="grid grid-cols-8 text-xs hover:bg-slate-50/80 items-stretch">
          <div class="p-2 bg-slate-50 font-bold text-slate-600 flex flex-col items-center justify-center border-l border-slate-200 sticky-time-col">
            <span>${hourStr}</span>
          </div>
      `;

      RMN_DAYS.forEach(day => {
        const startSlot = h * 12;
        html += `<div class="p-1 border-l border-slate-100 grid grid-cols-6 gap-0.5">`;
        for (let m = 0; m < 12; m++) {
          const slotIdx = startSlot + m;
          const slot = window.rmnState.schedule[day.id][slotIdx];
          const prog = slot && slot.programId ? window.rmnState.getProgram(slot.programId) : null;
          const slotTime = window.rmnState.slotToTime(slotIdx);

          html += `
            <div 
              class="slot-cell h-8 rounded text-[9px] flex items-center justify-center font-bold text-white transition overflow-hidden p-0.5"
              style="background-color: ${prog ? prog.color : '#e2e8f0'}; color: ${prog ? '#ffffff' : '#64748b'};"
              onclick="window.rmnUI.handleSlotClick('${day.id}', ${slotIdx}, 1)"
              title="${day.nameAr} ${slotTime} | ${prog ? prog.title : 'فترة فارغة'}"
            >
              ${m * 5}
            </div>
          `;
        }
        html += `</div>`;
      });

      html += `</div>`;
    }

    html += `
        </div>
      </div>
    `;
    container.innerHTML = html;
  }

  renderTimelineGrid(container, days) {
    const existingScrollEl = container.querySelector('.calendar-scroll-area');
    let targetScrollTop = this.savedCalendarScrollTop;
    let targetScrollLeft = this.savedCalendarScrollLeft;

    if (existingScrollEl) {
      targetScrollTop = existingScrollEl.scrollTop;
      targetScrollLeft = existingScrollEl.scrollLeft;
    }

    const zoomMinutes = window.rmnState.timeZoomMinutes || 15;

    // Zoom configurations for row heights (24 hours)
    // 5 -> 12 slots/hr (192px), 10 -> 6 slots/hr (120px), 15 -> 4 slots/hr (96px), 30 -> 2 slots/hr (72px), 60 -> 1 slot/hr (60px)
    const hourHeights = {
      5: 192,
      10: 120,
      15: 96,
      30: 72,
      60: 60
    };
    const hourHeight = hourHeights[zoomMinutes] || 96;
    const totalDayHeight = 24 * hourHeight;
    const totalSlots = window.rmnState.totalSlotsPerDay; // 288 slots

    // Calculate slots per hour dynamically based on zoomMinutes:
    // 5 min  -> 12 slots/hour (step = 1 base slot of 5 min)
    // 10 min -> 6 slots/hour  (step = 2 base slots of 5 min)
    // 15 min -> 4 slots/hour  (step = 3 base slots of 5 min)
    // 30 min -> 2 slots/hour  (step = 6 base slots of 5 min)
    // 60 min -> 1 slot/hour   (step = 12 base slots of 5 min)
    const slotsPerHour = Math.max(1, Math.round(60 / zoomMinutes));
    const slotStep = Math.max(1, Math.round(zoomMinutes / 5));
    const slotHeight = hourHeight / slotsPerHour;

    // Default to 07:00 AM ONLY on very first page load
    if (targetScrollTop === null || targetScrollTop === undefined) {
      targetScrollTop = Math.max(0, 7 * hourHeight - 12);
    }
    if (targetScrollLeft === null || targetScrollLeft === undefined) {
      targetScrollLeft = 0;
    }

    const now = new Date();
    const jsDayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayId = jsDayMap[now.getDay()];

    const timeColWidth = '46px';
    const dayColMinWidth = days.length === 1 ? '320px' : '170px';
    const columnTemplate = days.map(() => `${timeColWidth} minmax(${dayColMinWidth}, 1fr)`).join(' ');

    // Generate Time Gutter Column with slots and minutes matching zoomMinutes
    let timeColumnHtml = '<div class="calendar-time-gutter">';
    for (let h = 0; h < 24; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      for (let s = 0; s < slotsPerHour; s++) {
        const minute = s * zoomMinutes;
        const timeStr = `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const isHour = (s === 0);
        const label = isHour ? hourStr : `:${String(minute).padStart(2, '0')}`;
        timeColumnHtml += `
          <div class="calendar-time-slot-row ${isHour ? 'is-hour-start' : ''}" style="height: ${slotHeight}px;" title="${timeStr}">
            <span class="calendar-time-slot-text">${label}</span>
          </div>
        `;
      }
    }
    timeColumnHtml += '</div>';

    let html = `
      <div class="calendar-wrapper shadow-xs" data-days-count="${days.length}" data-zoom="${zoomMinutes}">
        <!-- 1. Google Calendar Sticky Day Header Row -->
        <div class="calendar-header-row">
          <div class="calendar-day-headers-grid" style="grid-template-columns: ${columnTemplate};">
            ${days.map(day => {
              const isToday = day.id === todayId;
              return `
                <div class="calendar-time-gutter-header" title="الوقت">
                  <span class="text-xs">⏱️</span>
                </div>
                <div class="calendar-day-header-cell ${isToday ? 'is-today' : ''}">
                  <div class="flex items-center gap-1.5 justify-between w-full px-1.5">
                    <div class="flex items-center gap-1.5 truncate">
                      <span class="day-title font-black text-sm text-slate-800">${day.nameAr}</span>
                      <span class="text-[11px] text-slate-400 font-semibold hidden sm:inline">(${day.nameEn})</span>
                      ${isToday ? '<span class="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">اليوم</span>' : ''}
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <button onclick="window.rmnUI.openCloneDayModal('${day.id}')" title="نسخ جدول ${day.nameAr}" class="p-1 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold transition">📋</button>
                      <button onclick="window.rmnUI.clearDayConfirm('${day.id}')" title="تفريغ جدول ${day.nameAr}" class="p-1 hover:bg-red-100 text-red-600 rounded-md text-xs font-bold transition">🗑️</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. Google Calendar Scrollable Grid Body -->
        <div class="calendar-scroll-area">
          <div class="calendar-body-flex" style="height: ${totalDayHeight}px;">
            
            <!-- Day Columns Grid: paired with a time column for every single day -->
            <div class="calendar-columns-grid" style="grid-template-columns: ${columnTemplate};">
              ${days.map(day => {
                const blocks = window.rmnState.getDayBlocks(day.id);

                // Hourly background subdivider lines (dynamic based on slotsPerHour)
                let subdividersHtml = '';
                for (let s = 1; s < slotsPerHour; s++) {
                  const topPercent = (s / slotsPerHour) * 100;
                  subdividersHtml += `<div class="calendar-hour-subdivider" style="top: ${topPercent}%;"></div>`;
                }

                let gridLinesHtml = '';
                for (let h = 0; h < 24; h++) {
                  gridLinesHtml += `
                    <div class="calendar-hour-cell" style="height: ${hourHeight}px;">
                      ${subdividersHtml}
                    </div>
                  `;
                }

                // Interactive empty slots matching selected granularity
                let emptySlotsHtml = '';
                for (let h = 0; h < 24; h++) {
                  for (let s = 0; s < slotsPerHour; s++) {
                    const startSlot = h * 12 + s * slotStep;
                    const top = (startSlot / totalSlots) * totalDayHeight;
                    const timeStr = window.rmnState.slotToTime(startSlot);
                    emptySlotsHtml += `
                      <div class="calendar-empty-slot"
                        data-day="${day.id}"
                        data-slot="${startSlot}"
                        style="top: ${top}px; height: ${slotHeight}px;"
                        title="${day.nameAr} ${timeStr} | انقر لجدولة برنامج (${zoomMinutes} دقيقة)"
                        onmouseenter="window.rmnUI.setHoveredSlot('${day.id}', ${startSlot}, ${slotStep})"
                        onmouseleave="window.rmnUI.clearHoveredSlot()"
                        onclick="window.rmnUI.handleSlotClick('${day.id}', ${startSlot}, ${slotStep})"
                        ondragover="window.rmnUI.allowProgramDrop(event)"
                        ondragleave="window.rmnUI.clearProgramDropTarget(event)"
                        ondrop="window.rmnUI.copyProgramDrop(event, '${day.id}', ${startSlot})"
                      ></div>
                    `;
                  }
                }

                // Google Calendar Event Divs: ONLY THE NAME (no start-end time, no presenter, no duration)
                const eventCardsHtml = blocks.filter(b => b.programId).map(block => {
                  const program = window.rmnState.getProgram(block.programId);
                  if (!program) return '';
                  const time = window.rmnState.formatTimeRange(block.startSlot, block.count);
                  const top = (block.startSlot / totalSlots) * totalDayHeight;
                  const height = Math.max(26, ((block.count / totalSlots) * totalDayHeight) - 2);

                  return `
                    <div 
                      class="calendar-event-div"
                      draggable="true"
                      data-day="${day.id}"
                      data-start-slot="${block.startSlot}"
                      style="top: ${top}px; height: ${height}px; background-color: ${program.color};"
                      onmouseenter="window.rmnUI.setHoveredBlock('${day.id}', ${block.startSlot}, ${block.count})"
                      onmouseleave="window.rmnUI.clearHoveredBlock()"
                      ondragstart="window.rmnUI.startProgramDrag(event, '${day.id}', ${block.startSlot})"
                      onclick="window.rmnUI.editProgramAtSlot('${day.id}', ${block.startSlot})"
                      title="${program.title} (${time.startStr} - ${time.endStr})"
                    >
                      <!-- Quick Hover Action Buttons -->
                      <div class="event-hover-actions">
                        <span class="event-action-icon" title="تعديل البرنامج" onclick="event.stopPropagation(); window.rmnUI.editProgramAtSlot('${day.id}', ${block.startSlot})">✏️</span>
                        <span class="event-action-icon" title="نسخ البرنامج (Ctrl+C)" onclick="event.stopPropagation(); window.rmnUI.copyBlockToClipboard('${day.id}', ${block.startSlot})">📋</span>
                        <span class="event-action-icon" title="حذف من الجدول فوراً (Delete)" onclick="event.stopPropagation(); window.rmnUI.clearSlotRangeConfirm('${day.id}', ${block.startSlot}, ${block.count})">✕</span>
                      </div>

                      <!-- ONLY THE NAME OF THE PROGRAM -->
                      <div class="event-title-text font-black">${program.title}</div>
                    </div>
                  `;
                }).join('');

                return `
                  ${timeColumnHtml}
                  <div 
                    class="calendar-day-column" 
                    data-day="${day.id}"
                    ondragover="window.rmnUI.allowProgramDrop(event)"
                    ondragleave="window.rmnUI.clearProgramDropTarget(event)"
                    ondrop="window.rmnUI.dropProgramOnDayColumn(event, '${day.id}', ${totalDayHeight})"
                  >
                    ${gridLinesHtml}
                    ${emptySlotsHtml}
                    ${eventCardsHtml}
                  </div>
                `;
              }).join('')}
            </div>

          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    const scrollEl = container.querySelector('.calendar-scroll-area');
    if (scrollEl) {
      scrollEl.scrollTop = targetScrollTop;
      scrollEl.scrollLeft = targetScrollLeft;
      this.savedCalendarScrollTop = targetScrollTop;
      this.savedCalendarScrollLeft = targetScrollLeft;

      scrollEl.addEventListener('scroll', () => {
        this.savedCalendarScrollTop = scrollEl.scrollTop;
        this.savedCalendarScrollLeft = scrollEl.scrollLeft;
      }, { passive: true });
    }
    this.restoreCurrentScroll();
  }

  scrollTimelineHorizontally(direction) {
    const scrollArea = document.querySelector('.calendar-scroll-area');
    if (scrollArea) scrollArea.scrollBy({ left: direction * 520, behavior: 'smooth' });
  }

  editProgramAtSlot(dayId, slotIndex) {
    const block = window.rmnState.getDayBlocks(dayId).find(item => (
      slotIndex >= item.startSlot && slotIndex < item.startSlot + item.count
    ));
    if (block) this.openSlotAssignmentModal(dayId, block.startSlot, block.count);
  }

  startProgramDrag(event, dayId, blockStartSlot) {
    const block = window.rmnState.getDayBlocks(dayId).find(item => item.startSlot === blockStartSlot);
    if (!block?.programId) return;
    this.captureCurrentScroll();
    this.draggedScheduleBlock = { dayId, ...block };
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('text/plain', JSON.stringify(this.draggedScheduleBlock));
  }

  allowProgramDrop(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = event.ctrlKey ? 'copy' : 'move';
    const target = event.currentTarget;
    if (target) target.classList.add('calendar-drop-zone-active');
  }

  clearProgramDropTarget(event) {
    const target = event.currentTarget;
    if (target) target.classList.remove('calendar-drop-zone-active');
  }

  copyProgramDrop(event, targetDayId, targetStartSlot) {
    event.preventDefault();
    event.stopPropagation();
    document.querySelectorAll('.calendar-drop-zone-active').forEach(el => el.classList.remove('calendar-drop-zone-active'));
    
    // Capture current scroll positions so page does not jump
    this.captureCurrentScroll();

    let block = this.draggedScheduleBlock;
    if (!block) {
      try { block = JSON.parse(event.dataTransfer.getData('text/plain')); } catch { return; }
    }
    if (!block?.programId || targetStartSlot + block.count > window.rmnState.totalSlotsPerDay) return;
    
    const copyMode = event.ctrlKey;
    if (!copyMode && block.dayId === targetDayId && targetStartSlot === block.startSlot) return;

    if (copyMode) {
      window.rmnState.setSlotRange(targetDayId, targetStartSlot, block.count, block.programId, block.note || '', block.isLive, block.isRepeat);
    } else {
      window.rmnState.pushHistory();
      for (let slot = block.startSlot; slot < block.startSlot + block.count; slot++) {
        window.rmnState.schedule[block.dayId][slot] = { slotIndex: slot, programId: null, note: '', isLive: false, isRepeat: false };
      }
      for (let slot = targetStartSlot; slot < targetStartSlot + block.count; slot++) {
        window.rmnState.schedule[targetDayId][slot] = { slotIndex: slot, programId: block.programId, note: block.note || '', isLive: Boolean(block.isLive), isRepeat: Boolean(block.isRepeat) };
      }
      window.rmnState.saveSchedule();
    }
    this.draggedScheduleBlock = null;
    this.refreshAll();
    this.restoreCurrentScroll();
    this.showToast(copyMode ? 'تم نسخ البرنامج إلى الموعد الجديد.' : 'تم نقل البرنامج إلى الموعد الجديد.', 'success');
  }

  dropProgramOnDayColumn(event, targetDayId, totalDayHeight) {
    event.preventDefault();
    document.querySelectorAll('.calendar-drop-zone-active').forEach(el => el.classList.remove('calendar-drop-zone-active'));
    this.captureCurrentScroll();
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height - 1, event.clientY - rect.top));
    const targetMinute = (y / totalDayHeight) * 1440;
    // Snap to 5-minute slot
    const targetStartSlot = Math.floor(targetMinute / 5);
    this.copyProgramDrop(event, targetDayId, targetStartSlot);
  }



  // --- DAILY CONTENT (SIMPLIFIED & DRAGGABLE) ---
  renderDailyContent(container) {
    const dayId = window.rmnState.selectedDay;

    // Day tabs
    const tabsContainer = document.getElementById('dailyDayTabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = RMN_DAYS.map(day => {
        const isSelected = day.id === dayId;
        return `
          <button 
            onclick="window.rmnUI.switchDailyDay('${day.id}')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${isSelected ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
          >
            <span>${day.nameAr}</span>
            <span class="text-[10px] opacity-75 font-normal">(${day.nameEn})</span>
          </button>
        `;
      }).join('');
    }

    const selectedDay = RMN_DAYS.find(day => day.id === dayId) || RMN_DAYS[0];
    this.renderTimelineGrid(container, [selectedDay]);
  }

  switchDailyDay(dayId) {
    window.rmnState.selectedDay = dayId;
    this.renderScheduleContent();
  }

  clearSlotRangeConfirm(dayId, startSlot, count) {
    window.rmnState.setSlotRange(dayId, startSlot, count, null);
    this.refreshAll();
    this.showToast('تم حذف البرنامج بنجاح (تراجع: Ctrl+Z)', 'info');
  }

  setHoveredSlot(dayId, slotIndex, count = 1) {
    this.hoveredSlotInfo = { dayId, slotIndex, count };
    this.hoveredBlock = null;
  }

  clearHoveredSlot() {
    this.hoveredSlotInfo = null;
  }

  setHoveredBlock(dayId, startSlot, count) {
    this.hoveredBlock = { dayId, startSlot, count };
    this.hoveredSlotInfo = { dayId, slotIndex: startSlot, count };
  }

  clearHoveredBlock() {
    this.hoveredBlock = null;
  }

  copyBlockToClipboard(dayId, startSlot) {
    const block = window.rmnState.getDayBlocks(dayId).find(b => b.startSlot === startSlot);
    if (!block || !block.programId) return;
    const prog = window.rmnState.getProgram(block.programId);
    this.clipboardBlock = {
      programId: block.programId,
      count: block.count,
      note: block.note || '',
      isLive: Boolean(block.isLive),
      isRepeat: Boolean(block.isRepeat)
    };
    this.showToast(`تم نسخ برنامج "${prog ? prog.title : ''}" إلى الحافظة! الصق في أي وقت بالضغط على Ctrl+V 📋`, 'info');
  }

  pasteClipboardBlock(targetDayId, targetStartSlot) {
    if (!this.clipboardBlock || !this.clipboardBlock.programId) {
      this.showToast('لا يوجد برنامج منسوخ في الحافظة. انسخ برنامجاً أولاً (Ctrl+C أو 📋)', 'info');
      return false;
    }
    const dayId = targetDayId || this.hoveredSlotInfo?.dayId || this.selectedBlock?.dayId || window.rmnState.selectedDay || 'sun';
    let slot = typeof targetStartSlot === 'number' 
      ? targetStartSlot 
      : (typeof this.hoveredSlotInfo?.slotIndex === 'number' ? this.hoveredSlotInfo.slotIndex : (typeof this.selectedBlock?.startSlot === 'number' ? this.selectedBlock.startSlot : 0));

    const block = this.clipboardBlock;
    if (slot + block.count > window.rmnState.totalSlotsPerDay) {
      slot = Math.max(0, window.rmnState.totalSlotsPerDay - block.count);
    }

    window.rmnState.setSlotRange(dayId, slot, block.count, block.programId, block.note || '', block.isLive, block.isRepeat);
    this.refreshAll();
    const prog = window.rmnState.getProgram(block.programId);
    this.showToast(`تم لصق برنامج "${prog ? prog.title : ''}" بنجاح! 📋`, 'success');
    return true;
  }

  // --- 2. LIBRARY VIEW (SEARCH ONLY + ADD BUTTON, NO CATEGORY FILTERS) ---
  renderLibraryView() {
    const listContainer = document.getElementById('programsListContainer');
    if (!listContainer) return;

    const query = (window.rmnState.searchQuery || '').toLowerCase().trim();

    // Filter ONLY by query (category filters removed as requested!)
    const filtered = window.rmnState.programs.filter(p => {
      return !query || 
        p.title.toLowerCase().includes(query) ||
        (p.presenter && p.presenter.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <div class="text-3xl mb-2">🔍</div>
          <h3 class="text-base font-bold text-slate-800 mb-1">لا توجد برامج مطابقة لكلمات البحث</h3>
          <p class="text-xs text-slate-500">جرب كتابة اسم برنامج آخر</p>
        </div>
      `;
      return;
    }

    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">';
    filtered.forEach(prog => {
      html += `
        <div class="program-library-card" style="--program-color: ${prog.color}">
          <span class="program-library-color" aria-hidden="true"></span>
          <h4 class="font-black text-slate-900 text-sm leading-snug truncate">${prog.title}</h4>
          <button
            onclick="window.rmnUI.openEditProgramModal('${prog.id}')"
            class="program-library-edit"
            title="تعديل البرنامج"
            aria-label="تعديل ${prog.title}"
          >✏️</button>
        </div>
      `;
    });
    html += '</div>';
    listContainer.innerHTML = html;
  }

  // --- 3. ANALYTICS VIEW ---
  renderAnalyticsView() {
    const container = document.getElementById('analyticsContainer');
    if (!container) return;

    const stats = window.rmnState.getStatistics();

    container.innerHTML = `
      <div class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span class="text-xs text-slate-500 font-semibold block mb-1">إجمالي خانات الأسبوع (5 دقائق)</span>
            <div class="text-2xl font-black text-slate-900">${stats.totalSlots.toLocaleString()} خانة</div>
            <span class="text-[11px] text-blue-600 font-bold mt-1 block">168 ساعة بث متواصلة</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span class="text-xs text-slate-500 font-semibold block mb-1">الخانات المجدولة (المملوءة)</span>
            <div class="text-2xl font-black text-emerald-600">${stats.filledSlots.toLocaleString()} خانة</div>
            <span class="text-[11px] text-emerald-700 font-bold mt-1 block">نسبة تغطية: ${stats.fillPercentage}%</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span class="text-xs text-slate-500 font-semibold block mb-1">الخانات الشاغرة (فارغة)</span>
            <div class="text-2xl font-black ${stats.emptySlots > 0 ? 'text-amber-500' : 'text-slate-400'}">${stats.emptySlots.toLocaleString()} خانة</div>
            <span class="text-[11px] text-slate-500 font-bold mt-1 block">${stats.emptySlots > 0 ? '⚠️ فترات شاغرة بحاجة لملء' : 'جدول مكتمل تماماً! ✨'}</span>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span class="text-xs text-slate-500 font-semibold block mb-1">عدد البرامج في المكتبة</span>
            <div class="text-2xl font-black text-indigo-600">${window.rmnState.programs.length} برنامج</div>
            <span class="text-[11px] text-indigo-700 font-bold mt-1 block">موزعة بألوان فريدة لمنع التكرار</span>
          </div>
        </div>

        ${stats.emptySlots > 0 ? `
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">⚠️</span>
              <div>
                <h4 class="font-extrabold text-amber-900 text-sm">تنبيه: يوجد ${stats.emptySlots} خانة فارغة في جدول الأسبوع!</h4>
                <p class="text-xs text-amber-800">لتجنب الصمت على الهواء، يمكنك تعبئة كافة الفجوات بنقرة واحدة بباقة ترانيم وفواصل المحطة.</p>
              </div>
            </div>
            <button onclick="window.rmnUI.openFillGapsModal()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition">
              🪄 تعبئة كافة الفجوات تلقائياً
            </button>
          </div>
        ` : ''}

        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <h3 class="font-extrabold text-slate-900 text-base mb-4">توزيع المحتوى الإذاعي حسب التصنيفات خلال الأسبوع</h3>
          <div class="space-y-3">
            ${stats.categoryStats.map(c => `
              <div>
                <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${c.color}"></span>
                    <span>${c.name}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-slate-500 font-normal">${c.hours} ساعة</span>
                    <span class="font-black text-slate-900">${c.percentage}%</span>
                  </div>
                </div>
                <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" style="width: ${c.percentage}%; background-color: ${c.color};"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // --- SLOT CLICK HANDLER ---
  handleSlotClick(dayId, slotIndex, count = 1) {
    this.openSlotAssignmentModal(dayId, slotIndex, count);
  }

  // --- MODALS ---
  // --- MODALS ---
  openSlotAssignmentModal(dayId, startSlot, defaultCount = 1) {
    this.pendingSlotCount = defaultCount;
    this._showingAllProgramsInModal = false;
    const dayObj = RMN_DAYS.find(d => d.id === dayId) || RMN_DAYS[0];
    const currentSlot = window.rmnState.schedule[dayId][startSlot];
    const currentProg = currentSlot && currentSlot.programId ? window.rmnState.getProgram(currentSlot.programId) : null;
    const isEditing = Boolean(currentProg);
    const time = window.rmnState.formatTimeRange(startSlot, defaultCount);

    const initialHour = time.startStr.slice(0, 2);
    const initialMinute = time.startStr.slice(3, 5);
    const initialDuration = currentProg 
      ? Number(currentProg.defaultDuration || defaultCount * window.rmnState.slotMinutes) 
      : Number(defaultCount * window.rmnState.slotMinutes);

    // If editing a show on the table, show only programs having the exact same duration
    let eligiblePrograms = window.rmnState.programs;
    if (isEditing) {
      const matchDuration = Number(initialDuration);
      const filtered = window.rmnState.programs.filter(p => Number(p.defaultDuration) === matchDuration);
      eligiblePrograms = filtered.length > 0 ? filtered : window.rmnState.programs;
    }

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">📅</span>
              <div>
                <h3 class="font-extrabold text-slate-800 text-base">${isEditing ? 'تعديل موعد البرنامج' : 'جدولة برنامج على الأثير'}</h3>
                <span class="text-xs text-slate-500">${dayObj.nameAr} - ابتداءً من ${time.startStr}</span>
              </div>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-bold text-slate-700">اختر البرنامج من مكتبة راديو مريم:</label>
                ${isEditing ? `
                  <button type="button" id="modalToggleProgramsBtn" onclick="window.rmnUI.toggleAllModalPrograms()" class="text-[11px] text-blue-700 hover:text-blue-900 font-bold hover:underline transition">
                    عرض جميع البرامج
                  </button>
                ` : ''}
              </div>
              <input id="modalProgramSelect" autofocus list="programSuggestions" value="${currentProg ? currentProg.title : ''}" placeholder="اكتب اسم البرنامج أو اختر من الاقتراحات" autocomplete="off" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500">
              <datalist id="programSuggestions">
                ${eligiblePrograms.map(p => `<option value="${p.title}">${p.title} (${p.defaultDuration || 30} دقيقة${p.presenter ? ' - ' + p.presenter : ''})</option>`).join('')}
              </datalist>
              <div id="modalProgramFilterInfo" class="mt-1.5 text-[11px]">
                ${isEditing ? `
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <span>⏱️</span>
                      <span>تم حصر الاقتراحات على البرامج بمدة <strong>${initialDuration} دقيقة</strong> (${eligiblePrograms.length} برنامج مطابِق).</span>
                    </div>
                    ${eligiblePrograms.length <= 15 ? `
                      <div id="modalQuickPickPills" class="flex flex-wrap gap-1 pt-1">
                        ${eligiblePrograms.map(p => `
                          <button type="button" onclick="window.rmnUI.onModalProgramSelected('${p.id}')" class="px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${p.id === currentProg?.id ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}">
                            ${p.title}
                          </button>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <p class="text-[11px] text-slate-500 mt-1.5">ابدأ بالكتابة للبحث في مكتبة البرامج.</p>
                `}
              </div>
            </div>

            <!-- وقت البدء: HH : MM (2 input limit numbers from 00-23 and 00-60 for min) -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label class="block text-xs font-black text-slate-800 mb-2">وقت البدء:</label>
              <div class="flex items-center gap-2.5 justify-start" dir="ltr">
                
                <!-- Hour input (HH: 00 - 23) -->
                <div class="flex flex-col items-center">
                  <input 
                    id="modalStartHourInput" 
                    type="text" 
                    inputmode="numeric" 
                    pattern="[0-9]*" 
                    maxlength="2" 
                    value="${initialHour}" 
                    placeholder="HH" 
                    autocomplete="off"
                    aria-label="ساعة البدء من 00 إلى 23" 
                    class="w-16 h-12 text-center bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-lg font-black text-slate-900 font-mono tracking-widest transition outline-none"
                  >
                  <span class="text-[10px] font-bold text-slate-400 mt-1 select-none">00 - 23</span>
                </div>

                <span class="text-2xl font-black text-slate-400 pb-4 select-none">:</span>

                <!-- Minute input (MM: 00 - 60) -->
                <div class="flex flex-col items-center">
                  <input 
                    id="modalStartMinuteInput" 
                    type="text" 
                    inputmode="numeric" 
                    pattern="[0-9]*" 
                    maxlength="2" 
                    value="${initialMinute}" 
                    placeholder="MM" 
                    autocomplete="off"
                    aria-label="دقيقة البدء من 00 إلى 60" 
                    class="w-16 h-12 text-center bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-lg font-black text-slate-900 font-mono tracking-widest transition outline-none"
                  >
                  <span class="text-[10px] font-bold text-slate-400 mt-1 select-none">00 - 60</span>
                </div>

                <!-- Preview and Duration helper -->
                <div class="mr-auto pl-2 flex flex-col justify-center text-right" dir="rtl">
                  <span class="text-[11px] text-slate-500 font-bold">نهاية البث المتوقعة:</span>
                  <span id="modalEndTimePreview" class="text-xs font-black text-blue-700 font-mono">${time.endStr}</span>
                </div>

              </div>
              <p class="text-[11px] text-slate-500 mt-2 font-medium">الساعة محددة برقمين من 00 إلى 23، والدقائق برقمين من 00 إلى 60 (يتم ضبطها تلقائياً لأقرب خانة بث 5 دقائق).</p>
            </div>

            <!-- Duration input -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">المدة (بالدقائق):</label>
              <input 
                type="number" 
                id="modalSlotDurationInput" 
                min="5" 
                max="360" 
                step="5" 
                value="${initialDuration}" 
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
              >
            </div>

            <div class="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
              <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" id="modalIsLive" ${currentSlot?.isLive ? 'checked' : ''} class="rounded text-red-600">
                <span class="live-dot"></span> بث مباشر
              </label>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" id="modalIsRepeat" ${currentSlot?.isRepeat ? 'checked' : ''} class="rounded text-blue-600">
                <span class="repeat-flag">↻</span> إعادة
              </label>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ملاحظة خاصة بالبث (اختياري):</label>
              <input type="text" id="modalSlotNote" value="${currentSlot ? currentSlot.note || '' : ''}" placeholder="مثال: تسجيل مسبق، بث مباشر مع هاتف، إلخ" class="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800">
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              ${currentProg ? `
                <button type="button" onclick="window.rmnUI.clearSlotFromModal('${dayId}', ${startSlot})" class="text-xs text-red-600 hover:underline font-bold">
                  🗑️ تفريغ هذه الفترة
                </button>
              ` : ''}
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.rmnUI.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition">
                إلغاء
              </button>
              <button type="button" onclick="window.rmnUI.saveSlotAssignment('${dayId}', ${startSlot})" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow transition">
                حفظ الجدولة
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachTimeInputListeners(dayId, startSlot);

    // Place cursor directly into the program name field for immediate typing without mouse
    setTimeout(() => {
      const progInput = document.getElementById('modalProgramSelect');
      if (progInput) {
        progInput.focus();
        progInput.select();
        progInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            window.rmnUI.saveSlotAssignment(dayId, startSlot);
          }
        });
      }
    }, 50);
  }

  attachTimeInputListeners(dayId, startSlot) {
    const hourInput = document.getElementById('modalStartHourInput');
    const minuteInput = document.getElementById('modalStartMinuteInput');
    const durationInput = document.getElementById('modalSlotDurationInput');
    const previewEl = document.getElementById('modalEndTimePreview');

    const updatePreview = () => {
      if (!hourInput || !minuteInput || !previewEl) return;
      let h = parseInt(hourInput.value, 10);
      let m = parseInt(minuteInput.value, 10);
      if (isNaN(h)) h = 0;
      if (isNaN(m)) m = 0;
      if (h > 23) h = 23;
      if (m > 60) m = 60;
      
      const dur = parseInt(durationInput?.value, 10) || 30;
      const totalMins = h * 60 + m + dur;
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      previewEl.textContent = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    // Hour Input Logic: limits 00-23, 2 numbers limit, auto-advance to minute
    hourInput?.addEventListener('input', () => {
      let val = hourInput.value.replace(/\D/g, '').slice(0, 2);
      if (val.length > 0) {
        let num = parseInt(val, 10);
        if (num > 23) val = '23';
      }
      hourInput.value = val;
      if (val.length === 2) {
        minuteInput?.focus();
        minuteInput?.select();
      }
      updatePreview();
    });

    hourInput?.addEventListener('blur', () => {
      let val = hourInput.value.replace(/\D/g, '');
      if (val.length === 1) val = '0' + val;
      if (val.length === 0) val = '00';
      if (parseInt(val, 10) > 23) val = '23';
      hourInput.value = val;
      updatePreview();
    });

    hourInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveSlotAssignment(dayId, startSlot);
      } else if (e.key === ':' || e.key === 'ArrowRight') {
        e.preventDefault();
        minuteInput?.focus();
        minuteInput?.select();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let num = (parseInt(hourInput.value || '0', 10) + 1) % 24;
        hourInput.value = String(num).padStart(2, '0');
        updatePreview();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let num = (parseInt(hourInput.value || '0', 10) - 1 + 24) % 24;
        hourInput.value = String(num).padStart(2, '0');
        updatePreview();
      }
    });

    // Minute Input Logic: limits 00-60, 2 numbers limit, backspace navigation
    minuteInput?.addEventListener('input', () => {
      let val = minuteInput.value.replace(/\D/g, '').slice(0, 2);
      if (val.length > 0) {
        let num = parseInt(val, 10);
        if (num > 60) val = '60';
      }
      minuteInput.value = val;
      updatePreview();
    });

    minuteInput?.addEventListener('blur', () => {
      let val = minuteInput.value.replace(/\D/g, '');
      if (val.length === 1) val = '0' + val;
      if (val.length === 0) val = '00';
      if (parseInt(val, 10) > 60) val = '60';
      minuteInput.value = val;
      updatePreview();
    });

    minuteInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveSlotAssignment(dayId, startSlot);
      } else if (e.key === 'Backspace' && (minuteInput.value === '' || minuteInput.selectionStart === 0)) {
        hourInput?.focus();
      } else if (e.key === 'ArrowLeft' && minuteInput.selectionStart === 0) {
        hourInput?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let num = Math.min(60, parseInt(minuteInput.value || '0', 10) + 5);
        minuteInput.value = String(num).padStart(2, '0');
        updatePreview();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let num = Math.max(0, parseInt(minuteInput.value || '0', 10) - 5);
        minuteInput.value = String(num).padStart(2, '0');
        updatePreview();
      }
    });

    // When program selection changes, auto-populate program's default duration
    const progSelect = document.getElementById('modalProgramSelect');
    progSelect?.addEventListener('input', () => {
      const prog = window.rmnState.programs.find(p => p.title === progSelect.value.trim());
      if (prog) {
        if (durationInput) durationInput.value = prog.defaultDuration;
        updatePreview();
      }
    });

    durationInput?.addEventListener('input', () => {
      updatePreview();
      const newDur = parseInt(durationInput.value, 10);
      if (!isNaN(newDur) && newDur > 0) {
        this.updateModalSuggestionsByDuration(newDur);
      }
    });
  }

  toggleAllModalPrograms() {
    const datalist = document.getElementById('programSuggestions');
    const infoEl = document.getElementById('modalProgramFilterInfo');
    const toggleBtn = document.getElementById('modalToggleProgramsBtn');
    if (!datalist) return;

    if (this._showingAllProgramsInModal) {
      const durationInput = document.getElementById('modalSlotDurationInput');
      const dur = parseInt(durationInput?.value, 10) || 30;
      this.updateModalSuggestionsByDuration(dur);
      this._showingAllProgramsInModal = false;
      if (toggleBtn) toggleBtn.textContent = 'عرض جميع البرامج';
    } else {
      datalist.innerHTML = window.rmnState.programs.map(p => `<option value="${p.title}">${p.title} (${p.defaultDuration || 30} دقيقة${p.presenter ? ' - ' + p.presenter : ''})</option>`).join('');
      this._showingAllProgramsInModal = true;
      if (infoEl) {
        infoEl.innerHTML = `<span class="text-slate-500 font-bold">يتم الآن عرض جميع البرامج في المكتبة (${window.rmnState.programs.length} برنامج).</span>`;
      }
      if (toggleBtn) toggleBtn.textContent = 'حصر حسب مدة البرنامج';
    }
  }

  updateModalSuggestionsByDuration(durationMin) {
    const datalist = document.getElementById('programSuggestions');
    const infoEl = document.getElementById('modalProgramFilterInfo');
    const toggleBtn = document.getElementById('modalToggleProgramsBtn');
    if (!datalist) return;

    const dur = Number(durationMin);
    const matching = window.rmnState.programs.filter(p => Number(p.defaultDuration) === dur);
    const list = matching.length > 0 ? matching : window.rmnState.programs;

    datalist.innerHTML = list.map(p => `<option value="${p.title}">${p.title} (${p.defaultDuration || 30} دقيقة${p.presenter ? ' - ' + p.presenter : ''})</option>`).join('');
    this._showingAllProgramsInModal = false;

    if (infoEl) {
      if (matching.length > 0) {
        infoEl.innerHTML = `
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <span>⏱️</span>
              <span>تم حصر الاقتراحات على البرامج بمدة <strong>${dur} دقيقة</strong> (${matching.length} برنامج مطابِق).</span>
            </div>
            ${matching.length <= 15 ? `
              <div id="modalQuickPickPills" class="flex flex-wrap gap-1 pt-1">
                ${matching.map(p => `
                  <button type="button" onclick="window.rmnUI.onModalProgramSelected('${p.id}')" class="px-2 py-0.5 rounded-md text-[11px] font-bold border transition bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300">
                    ${p.title}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        infoEl.innerHTML = `<span class="text-slate-500 font-bold">لا توجد برامج بمدة ${dur} دقيقة في المكتبة. يتم عرض جميع البرامج.</span>`;
      }
    }
    if (toggleBtn) toggleBtn.textContent = 'عرض جميع البرامج';
  }

  onModalProgramSelected(progId) {
    const prog = window.rmnState.getProgram(progId);
    if (!prog) return;
    const input = document.getElementById('modalProgramSelect');
    if (input) input.value = prog.title;
    const durationInput = document.getElementById('modalSlotDurationInput');
    if (durationInput && prog.defaultDuration) durationInput.value = prog.defaultDuration;

    // Update active highlight on pills
    const pills = document.querySelectorAll('#modalQuickPickPills button');
    pills.forEach(b => {
      if (b.textContent.trim() === prog.title.trim()) {
        b.className = 'px-2 py-0.5 rounded-md text-[11px] font-bold border transition bg-blue-600 text-white border-blue-600 shadow-xs';
      } else {
        b.className = 'px-2 py-0.5 rounded-md text-[11px] font-bold border transition bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300';
      }
    });

    // Update time preview
    const hourInput = document.getElementById('modalStartHourInput');
    const minuteInput = document.getElementById('modalStartMinuteInput');
    const previewEl = document.getElementById('modalEndTimePreview');
    if (hourInput && minuteInput && previewEl) {
      let h = parseInt(hourInput.value, 10) || 0;
      let m = parseInt(minuteInput.value, 10) || 0;
      let dur = parseInt(durationInput ? durationInput.value : prog.defaultDuration, 10) || 30;
      let totalMins = h * 60 + m + dur;
      let endH = Math.floor(totalMins / 60) % 24;
      let endM = totalMins % 60;
      previewEl.textContent = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }
  }

  saveSlotAssignment(dayId, startSlot) {
    const hourInput = document.getElementById('modalStartHourInput');
    const minuteInput = document.getElementById('modalStartMinuteInput');
    let h = parseInt(hourInput?.value?.trim() || '0', 10);
    let m = parseInt(minuteInput?.value?.trim() || '0', 10);

    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 60) m = 60;

    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const typedStartSlot = window.rmnState.timeToSlot(timeStr);
    if (typedStartSlot === null) {
      this.showToast('أدخل وقتاً صحيحاً: الساعة 00–23 والدقائق 00–60', 'error');
      return;
    }
    startSlot = typedStartSlot;

    const progId = this.getProgramIdFromInput('modalProgramSelect');
    if (document.getElementById('modalProgramSelect')?.value.trim() && !progId) {
      this.showToast('اختر برنامجاً من الاقتراحات أو أضفه أولاً إلى المكتبة.', 'error');
      return;
    }

    const durationVal = parseInt(document.getElementById('modalSlotDurationInput')?.value, 10);
    const selectedProgram = progId ? window.rmnState.getProgram(progId) : null;
    const durationMin = !isNaN(durationVal) && durationVal > 0 
      ? durationVal 
      : (selectedProgram ? selectedProgram.defaultDuration : (this.pendingSlotCount * window.rmnState.slotMinutes));

    const slotsCount = Math.max(1, Math.round(durationMin / window.rmnState.slotMinutes));
    const note = document.getElementById('modalSlotNote')?.value || '';
    const isLive = Boolean(document.getElementById('modalIsLive')?.checked);
    const isRepeat = Boolean(document.getElementById('modalIsRepeat')?.checked);

    if (isLive && isRepeat) {
      this.showToast('اختر حالة واحدة فقط: بث مباشر أو إعادة.', 'error');
      return;
    }

    window.rmnState.setSlotRangeForDays([dayId], startSlot, slotsCount, progId, note, isLive, isRepeat);

    this.closeModal();
    this.refreshAll();
    this.showToast('تم حفظ الجدولة بنجاح!', 'success');
  }

  clearSlotFromModal(dayId, startSlot) {
    window.rmnState.clearBlock(dayId, startSlot);
    this.closeModal();
    this.refreshAll();
    this.showToast('تم تفريغ الفترة بنجاح', 'info');
  }


  // Clone Day Modal
  openCloneDayModal(sourceDayId) {
    const sourceDay = RMN_DAYS.find(d => d.id === sourceDayId) || RMN_DAYS[0];
    const modalContainer = document.getElementById('modalContainer');

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-extrabold text-slate-800 text-base">نسخ جدول يوم (${sourceDay.nameAr}) كامل</h3>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            حدد الأيام التي ترغب بنسخ جدول (${sourceDay.nameAr}) إليها بالكامل (288 خانة):
          </p>

          <div class="space-y-2">
            ${RMN_DAYS.filter(d => d.id !== sourceDayId).map(d => `
              <label class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-blue-50/50 cursor-pointer">
                <span class="text-sm font-bold text-slate-800">${d.nameAr} (${d.nameEn})</span>
                <input type="checkbox" name="targetCloneDay" value="${d.id}" class="w-4 h-4 rounded text-blue-600">
              </label>
            `).join('')}
          </div>

          <div class="flex items-center justify-between pt-2">
            <button type="button" onclick="window.rmnUI.selectAllCloneDays(true)" class="text-xs text-blue-600 font-bold hover:underline">
              تحديد كل الأيام المتبقية
            </button>
            <div class="flex items-center gap-2">
              <button onclick="window.rmnUI.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold">إلغاء</button>
              <button onclick="window.rmnUI.executeCloneDay('${sourceDayId}')" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow">تنفيذ النسخ</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  selectAllCloneDays(checked) {
    document.querySelectorAll('input[name="targetCloneDay"]').forEach(cb => cb.checked = checked);
  }

  executeCloneDay(sourceDayId) {
    const targets = Array.from(document.querySelectorAll('input[name="targetCloneDay"]:checked')).map(cb => cb.value);
    if (targets.length === 0) {
      this.showToast('يرجى اختيار يوم واحد على الأقل للنسخ إليه', 'error');
      return;
    }
    window.rmnAutofill.cloneDay(sourceDayId, targets);
    this.closeModal();
    this.refreshAll();
  }

  // Fill Gaps Modal
  openFillGapsModal() {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-extrabold text-slate-800 text-base">🪄 التعبئة التلقائية للفترات الشاغرة</h3>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">نطاق التعبئة:</label>
            <select id="gapScopeSelect" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800">
              <option value="all">كافة أيام الأسبوع (الاثنين إلى الأحد)</option>
              ${RMN_DAYS.map(d => `<option value="${d.id}">يوم ${d.nameAr} فقط</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">اختر برنامج لملء الفراغات به:</label>
            <select id="gapFillerProgSelect" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800">
              ${window.rmnState.programs.map(p => `
                <option value="${p.id}" ${p.id === 'prog-marian-hymns' ? 'selected' : ''}>
                  ${p.title}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onclick="window.rmnUI.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold">إلغاء</button>
            <button onclick="window.rmnUI.executeFillGaps()" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow">بدء التعبئة</button>
          </div>
        </div>
      </div>
    `;
  }

  executeFillGaps() {
    const scope = document.getElementById('gapScopeSelect').value;
    const progId = document.getElementById('gapFillerProgSelect').value;
    window.rmnAutofill.fillEmptyGaps(scope, progId);
    this.closeModal();
    this.refreshAll();
  }

  // Insert Program at Free Time Modal (e.g. 13:05)
  openInsertArbitraryTimeModal(dayId, defaultTimeStr = '13:05') {
    const dayObj = RMN_DAYS.find(d => d.id === dayId) || RMN_DAYS[0];
    const modalContainer = document.getElementById('modalContainer');

    const [defH, defM] = defaultTimeStr.split(':').map(Number);

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in">
          <!-- Header -->
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm">⏱️</span>
              <div>
                <h3 class="font-extrabold text-slate-800 text-base">إدراج برنامج في أي توقيت حر</h3>
                <span class="text-xs text-slate-500">يوم ${dayObj.nameAr} - يمكنك البدء من أي دقيقة (مثل 13:05)</span>
              </div>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4">
            <!-- وقت البدء: HH : MM (2 input limit numbers from 00-23 and 00-60 for min) -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label class="block text-xs font-black text-slate-800 mb-2">وقت البدء:</label>
              <div class="flex items-center gap-2.5 justify-start" dir="ltr">
                <div class="flex flex-col items-center">
                  <input 
                    id="arbHourInput" 
                    type="text" 
                    inputmode="numeric" 
                    pattern="[0-9]*" 
                    maxlength="2" 
                    value="${String(defH).padStart(2, '0')}" 
                    placeholder="HH" 
                    autocomplete="off"
                    aria-label="ساعة البدء من 00 إلى 23" 
                    class="w-16 h-12 text-center bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-lg font-black text-slate-900 font-mono tracking-widest transition outline-none"
                  >
                  <span class="text-[10px] font-bold text-slate-400 mt-1 select-none">00 - 23</span>
                </div>

                <span class="text-2xl font-black text-slate-400 pb-4 select-none">:</span>

                <div class="flex flex-col items-center">
                  <input 
                    id="arbMinuteInput" 
                    type="text" 
                    inputmode="numeric" 
                    pattern="[0-9]*" 
                    maxlength="2" 
                    value="${String(defM).padStart(2, '0')}" 
                    placeholder="MM" 
                    autocomplete="off"
                    aria-label="دقيقة البدء من 00 إلى 60" 
                    class="w-16 h-12 text-center bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-lg font-black text-slate-900 font-mono tracking-widest transition outline-none"
                  >
                  <span class="text-[10px] font-bold text-slate-400 mt-1 select-none">00 - 60</span>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 mt-2">أدخل رقمين للساعة (00-23) ورقمين للدقائق (00-60).</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">اختر البرنامج من المكتبة:</label>
              <input id="arbProgramSelect" list="arbitraryProgramSuggestions" placeholder="اكتب اسم البرنامج أو اختر من الاقتراحات" autocomplete="off" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500">
              <datalist id="arbitraryProgramSuggestions">
                ${window.rmnState.programs.map(p => `<option value="${p.title}"></option>`).join('')}
              </datalist>
              <p class="text-[11px] text-slate-500 mt-1.5">ابدأ بالكتابة للبحث في مكتبة البرامج.</p>
            </div>

            <div class="pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold text-slate-700 mb-1.5">تكرار في نفس التوقيت عبر الأيام:</label>
              <div class="flex flex-wrap gap-1.5">
                ${RMN_DAYS.map(d => `
                  <label class="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs cursor-pointer hover:bg-slate-100">
                    <input type="checkbox" name="arbRepeatDay" value="${d.id}" ${d.id === dayId ? 'checked' : ''} class="rounded text-blue-600">
                    <span>${d.nameAr}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button onclick="window.rmnUI.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold">إلغاء</button>
            <button onclick="window.rmnUI.executeInsertArbitraryTime('${dayId}')" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow">إدراج البرنامج الآن</button>
          </div>
        </div>
      </div>
    `;

    const hourInput = document.getElementById('arbHourInput');
    const minuteInput = document.getElementById('arbMinuteInput');

    hourInput?.addEventListener('input', () => {
      let val = hourInput.value.replace(/\D/g, '').slice(0, 2);
      if (val.length > 0 && parseInt(val, 10) > 23) val = '23';
      hourInput.value = val;
      if (val.length === 2) {
        minuteInput?.focus();
        minuteInput?.select();
      }
    });

    hourInput?.addEventListener('blur', () => {
      let val = hourInput.value.replace(/\D/g, '');
      if (val.length === 1) val = '0' + val;
      if (val.length === 0) val = '00';
      if (parseInt(val, 10) > 23) val = '23';
      hourInput.value = val;
    });

    minuteInput?.addEventListener('input', () => {
      let val = minuteInput.value.replace(/\D/g, '').slice(0, 2);
      if (val.length > 0 && parseInt(val, 10) > 60) val = '60';
      minuteInput.value = val;
    });

    minuteInput?.addEventListener('blur', () => {
      let val = minuteInput.value.replace(/\D/g, '');
      if (val.length === 1) val = '0' + val;
      if (val.length === 0) val = '00';
      if (parseInt(val, 10) > 60) val = '60';
      minuteInput.value = val;
    });
  }

  getProgramIdFromInput(inputId) {
    const value = document.getElementById(inputId)?.value.trim();
    if (!value) return null;
    return window.rmnState.programs.find(program => program.title === value)?.id || null;
  }

  bindProgramSuggestionInput(inputId, onProgramFound) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      const program = window.rmnState.programs.find(item => item.title === input.value.trim());
      if (program) onProgramFound(program);
    });
  }

  executeInsertArbitraryTime(dayId) {
    let hour = parseInt(document.getElementById('arbHourInput')?.value?.trim() || '0', 10);
    let minute = parseInt(document.getElementById('arbMinuteInput')?.value?.trim() || '0', 10);
    if (isNaN(hour) || hour < 0) hour = 0;
    if (hour > 23) hour = 23;
    if (isNaN(minute) || minute < 0) minute = 0;
    if (minute > 60) minute = 60;

    const progId = this.getProgramIdFromInput('arbProgramSelect');
    if (!progId) {
      this.showToast('اختر برنامجاً من الاقتراحات أو أضفه أولاً إلى المكتبة.', 'error');
      return;
    }
    const durationMin = window.rmnState.getProgram(progId).defaultDuration;

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const checkedDays = Array.from(document.querySelectorAll('input[name="arbRepeatDay"]:checked')).map(cb => cb.value);

    const startSlot = window.rmnState.timeToSlot(timeStr);
    if (startSlot === null) {
      this.showToast('أدخل وقتاً صحيحاً: الساعة 00–23 والدقائق 00–60', 'error');
      return;
    }
    const slotCount = Math.max(1, Math.round(durationMin / window.rmnState.slotMinutes));
    window.rmnState.setSlotRangeForDays(checkedDays.length ? checkedDays : [dayId], startSlot, slotCount, progId);

    const prog = window.rmnState.getProgram(progId);
    this.closeModal();
    this.refreshAll();
    this.showToast(`تم إدراج برنامج "${prog ? prog.title : ''}" ابتداءً من ${timeStr} بنجاح!`, 'success');
  }

  // --- PROGRAM ADD / EDIT MODAL (WITH 50 COLORS & DUPLICATE PREVENTION) ---
  openAddProgramModal() {
    this.renderProgramFormModal(null);
  }

  openEditProgramModal(progId) {
    const prog = window.rmnState.getProgram(progId);
    if (!prog) return;
    this.renderProgramFormModal(prog);
  }

  renderProgramFormModal(existingProg) {
    const isEdit = !!existingProg;
    const modalContainer = document.getElementById('modalContainer');

    const selectedColor = isEdit ? existingProg.color.toLowerCase() : window.rmnState.getAvailableColor().toLowerCase();
    const usedColorsMap = window.rmnState.getUsedColorsMap();

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in max-h-[92vh] overflow-y-auto" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 class="font-extrabold text-slate-800 text-base">${isEdit ? 'تعديل بيانات برنامج' : 'إضافة برنامج جديد للمكتبة'}</h3>
              <p class="text-xs text-slate-500">اختر من بين 50 لوناً مميزاً لمنع تكرار الألوان</p>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">عنوان البرنامج: *</label>
              <input type="text" id="progTitleInput" value="${isEdit ? existingProg.title : ''}" placeholder="مثال: ينابيع الخلاص" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">التصنيف الإذاعي:</label>
                <select id="progCategorySelect" class="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800">
                  ${window.rmnState.getAllCategories().map(c => `
                    <option value="${c.id}" ${isEdit && existingProg.categoryId === c.id ? 'selected' : ''}>${c.name}</option>
                  `).join('')}
                  <option value="__add_category__">＋ إضافة تصنيف جديد</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">المدة القياسية (بالدقائق):</label>
                <input type="number" id="progDurationInput" step="5" min="5" max="360" value="${isEdit ? existingProg.defaultDuration : 30}" class="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">المقدّم أو المسؤول:</label>
              <select id="progPresenterInput" class="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800">
                ${window.rmnState.getPresenters().filter(p => p && p !== 'Radio Maria Rome').map(presenter => `<option value="${presenter}" ${isEdit && existingProg.presenter === presenter ? 'selected' : ''}>${presenter}</option>`).join('')}
                <option value="__add_presenter__">＋ إضافة مقدّم جديد</option>
              </select>
            </div>

            <!-- 90 Color Swatches Grid -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-xs font-bold text-slate-800">
                  🎨 اختر لوناً فريداً من باليت الـ 90 لوناً:
                </label>
                <span id="selectedColorBadge" class="text-xs font-mono font-bold px-2 py-0.5 rounded text-white" style="background-color: ${selectedColor}">
                  ${selectedColor}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mb-3">الألوان المقفلة 🔒 مستخدمة لبرامج أخرى. كل صفحة تعرض 30 لوناً.</p>

              <div class="grid grid-cols-10 gap-2" id="colorSwatchesContainer"></div>
              <div class="flex items-center justify-between mt-3">
                <button type="button" onclick="window.rmnUI.changeColorPickerPage(-1)" id="colorPagePrevBtn" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200">→ السابق</button>
                <span id="colorPageLabel" class="text-xs font-bold text-slate-500"></span>
                <button type="button" onclick="window.rmnUI.changeColorPickerPage(1)" id="colorPageNextBtn" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200">التالي ←</button>
              </div>
              <input type="hidden" id="selectedProgramColorInput" value="${selectedColor}">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">نبذة عن البرنامج:</label>
              <textarea id="progDescInput" rows="2" placeholder="وصف محتوى البرنامج وأهدافه..." class="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800">${isEdit ? (existingProg.description || '') : ''}</textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onclick="window.rmnUI.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold">إلغاء</button>
            <button onclick="window.rmnUI.saveProgramForm('${isEdit ? existingProg.id : ''}')" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow">حفظ البرنامج</button>
          </div>
        </div>
      </div>
    `;

    this.colorPickerEditingId = isEdit ? existingProg.id : null;
    this.colorPickerPage = Math.floor(Math.max(0, RMN_50_COLORS.findIndex(color => color.toLowerCase() === selectedColor)) / 30);
    this.renderColorPickerPage();

    const categorySelect = document.getElementById('progCategorySelect');
    categorySelect?.addEventListener('change', () => {
      if (categorySelect.value !== '__add_category__') return;
      const category = window.rmnState.addCustomCategory(prompt('اسم التصنيف الجديد:'));
      if (!category) { categorySelect.value = isEdit ? existingProg.categoryId : 'spiritual'; return; }
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.insertBefore(option, categorySelect.lastElementChild);
      categorySelect.value = category.id;
    });

    const presenterSelect = document.getElementById('progPresenterInput');
    presenterSelect?.addEventListener('change', async () => {
      if (presenterSelect.value !== '__add_presenter__') return;
      const inputVal = prompt('اسم المقدّم أو المسؤول الجديد:');
      if (!inputVal || !inputVal.trim()) {
        presenterSelect.value = isEdit ? existingProg.presenter : (window.rmnState.getPresenters()[0] || '');
        return;
      }
      const presenter = await window.rmnState.addPresenter(inputVal.trim());
      if (!presenter) {
        presenterSelect.value = isEdit ? existingProg.presenter : (window.rmnState.getPresenters()[0] || '');
        return;
      }
      let option = Array.from(presenterSelect.options).find(opt => opt.value === presenter);
      if (!option) {
        option = document.createElement('option');
        option.value = presenter;
        option.textContent = presenter;
        presenterSelect.insertBefore(option, presenterSelect.lastElementChild);
      }
      presenterSelect.value = presenter;
    });

    modalContainer.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.saveProgramForm(isEdit ? existingProg.id : '');
      }
    }));
  }

  selectSwatchColor(color, isTaken, takenByTitle) {
    if (isTaken) {
      this.showToast(`هذا اللون مخصص لبرنامج "${takenByTitle}". يرجى اختيار لون شاغر.`, 'warning');
      return;
    }

    const input = document.getElementById('selectedProgramColorInput');
    const badge = document.getElementById('selectedColorBadge');
    if (input) input.value = color;
    if (badge) {
      badge.textContent = color;
      badge.style.backgroundColor = color;
    }

    document.querySelectorAll('.color-swatch-item').forEach(item => {
      const c = item.getAttribute('data-color');
      if (c.toLowerCase() === color.toLowerCase()) {
        item.classList.add('selected');
        item.innerHTML = '<span class="text-white font-black text-xs">✓</span>';
      } else {
        item.classList.remove('selected');
        const taken = item.getAttribute('data-taken') === 'true';
        item.innerHTML = taken ? '<span class="text-white/80 text-[10px]">🔒</span>' : '';
      }
    });
  }

  renderColorPickerPage() {
    const container = document.getElementById('colorSwatchesContainer');
    if (!container) return;
    const colorsPerPage = 30;
    const pageCount = Math.ceil(RMN_50_COLORS.length / colorsPerPage);
    this.colorPickerPage = Math.max(0, Math.min(this.colorPickerPage, pageCount - 1));
    const start = this.colorPickerPage * colorsPerPage;
    const selectedColor = document.getElementById('selectedProgramColorInput')?.value.toLowerCase();
    const usedColors = window.rmnState.getUsedColorsMap();
    container.innerHTML = RMN_50_COLORS.slice(start, start + colorsPerPage).map(color => {
      const cLower = color.toLowerCase();
      const takenBy = usedColors[cLower];
      const isTaken = takenBy && takenBy.id !== this.colorPickerEditingId;
      const isCurrent = cLower === selectedColor;
      const title = isTaken ? takenBy.title.replace(/'/g, "\\'") : '';
      return `<div class="color-swatch-item ${isTaken ? 'taken' : ''} ${isCurrent ? 'selected' : ''}" style="background-color: ${color}" data-color="${color}" data-taken="${isTaken}" onclick="window.rmnUI.selectSwatchColor('${color}', ${Boolean(isTaken)}, '${title}')" title="${isTaken ? `محجوز لبرنامج: ${takenBy.title}` : `اختر هذا اللون (${color})`}">${isCurrent ? '<span class="text-white font-black text-xs">✓</span>' : (isTaken ? '<span class="text-white/80 text-[10px]">🔒</span>' : '')}</div>`;
    }).join('');
    document.getElementById('colorPageLabel').textContent = `صفحة ${this.colorPickerPage + 1} من ${pageCount}`;
    document.getElementById('colorPagePrevBtn').disabled = this.colorPickerPage === 0;
    document.getElementById('colorPageNextBtn').disabled = this.colorPickerPage === pageCount - 1;
  }

  changeColorPickerPage(direction) {
    this.colorPickerPage += direction;
    this.renderColorPickerPage();
  }

  async saveProgramForm(existingId) {
    const title = document.getElementById('progTitleInput').value.trim();
    if (!title) {
      this.showToast('يرجى إدخال عنوان البرنامج', 'error');
      return;
    }

    const categoryId = document.getElementById('progCategorySelect').value;
    const defaultDuration = parseInt(document.getElementById('progDurationInput').value, 10) || 30;
    const presenter = document.getElementById('progPresenterInput').value.trim();
    if (presenter && presenter !== '__add_presenter__') {
      await window.rmnState.addPresenter(presenter);
    }
    const color = document.getElementById('selectedProgramColorInput').value || window.rmnState.getAvailableColor(existingId);
    const description = document.getElementById('progDescInput').value.trim();

    if (existingId) {
      window.rmnState.updateProgram(existingId, {
        title,
        categoryId,
        defaultDuration,
        presenter,
        color,
        description
      });
      this.showToast('تم تحديث البرنامج بنجاح', 'success');
    } else {
      const newProgram = window.rmnState.addProgram({
        title,
        categoryId,
        defaultDuration,
        presenter,
        color,
        description
      });
      if (!newProgram) {
        this.showToast('تم استخدام الألوان الخمسين جميعها. احذف برنامجاً أو عدّل برنامجاً قائماً أولاً.', 'error');
        return;
      }
      this.showToast('تمت إضافة البرنامج الجديد بنجاح', 'success');
    }

    this.closeModal();
    this.refreshAll();
  }

  deleteProgramConfirm(progId) {
    const prog = window.rmnState.getProgram(progId);
    if (!prog) return;
    if (confirm(`هل أنت متأكد من حذف برنامج "${prog.title}" من المكتبة والجدول؟`)) {
      window.rmnState.deleteProgram(progId);
      this.showToast('تم حذف البرنامج بنجاح', 'info');
      this.refreshAll();
    }
  }

  clearDayConfirm(dayId) {
    const dayObj = RMN_DAYS.find(d => d.id === dayId);
    if (confirm(`هل أنت متأكد من تفريغ كافة خانات يوم ${dayObj?.nameAr}؟`)) {
      window.rmnState.clearDay(dayId);
      this.showToast(`تم تفريغ يوم ${dayObj?.nameAr}`, 'info');
      this.refreshAll();
    }
  }

  clearWeekConfirm() {
    if (confirm('تحذير: هل أنت متأكد من تفريغ جدول الأسبوع كاملاً؟')) {
      window.rmnState.clearWeek();
      this.showToast('تم تفريغ الجدول الأسبوعي', 'info');
      this.refreshAll();
    }
  }

  closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.innerHTML = '';
  }

  // --- SHARE / EXPORT MODAL (EXCEL, PDF, CSV, PRINT) ---
  openShareModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="text-xl">📤</span>
              <h3 class="font-extrabold text-slate-800 text-base">مشاركة وتصدير جدول البث</h3>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>

          <p class="text-xs text-slate-500">اختر الصيغة التي ترغب بمشاركة أو تصدير جدول البث بها:</p>

          <div class="space-y-2.5">
            <!-- 1. Excel -->
            <button 
              type="button" 
              onclick="window.rmnExport.exportToExcel(); window.rmnUI.closeModal();" 
              class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center gap-3.5 text-right group cursor-pointer"
            >
              <div class="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                📊
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 text-sm group-hover:text-emerald-800">تصدير Excel (.xls)</div>
                <div class="text-[11px] text-slate-500">ملف إكسل منسّق وداعم للغة العربية بالكامل</div>
              </div>
              <span class="text-slate-400 group-hover:text-emerald-600 text-xs font-bold">تصدير ←</span>
            </button>

            <!-- 2. PDF -->
            <button 
              type="button" 
              onclick="window.rmnExport.exportToPDF(); window.rmnUI.closeModal();" 
              class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition flex items-center gap-3.5 text-right group cursor-pointer"
            >
              <div class="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                📄
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 text-sm group-hover:text-red-800">تصدير PDF (مستند للطباعة)</div>
                <div class="text-[11px] text-slate-500">حفظ جدول البث كملف PDF رسمي للاستوديو</div>
              </div>
              <span class="text-slate-400 group-hover:text-red-600 text-xs font-bold">حفظ ←</span>
            </button>

            <!-- 3. CSV -->
            <button 
              type="button" 
              onclick="window.rmnExport.exportToCSV(); window.rmnUI.closeModal();" 
              class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition flex items-center gap-3.5 text-right group cursor-pointer"
            >
              <div class="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                📁
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 text-sm group-hover:text-blue-800">تصدير CSV (بيانات مجدولة)</div>
                <div class="text-[11px] text-slate-500">ملف نصي CSV بترميز UTF-8 متوافق مع البرامج</div>
              </div>
              <span class="text-slate-400 group-hover:text-blue-600 text-xs font-bold">تنزيل ←</span>
            </button>

            <!-- 4. Print -->
            <button 
              type="button" 
              onclick="window.rmnExport.printSchedule(); window.rmnUI.closeModal();" 
              class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition flex items-center gap-3.5 text-right group cursor-pointer"
            >
              <div class="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                🖨️
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 text-sm group-hover:text-amber-900">طباعة الجدول (Print)</div>
                <div class="text-[11px] text-slate-500">طباعة فورية لورقة البث للاستوديو وغرفة التحكم</div>
              </div>
              <span class="text-slate-400 group-hover:text-amber-700 text-xs font-bold">طباعة ←</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // --- TEMPLATES MODAL (READ STRICTLY FROM CLOUD - ZERO DEFAULT TABLES) ---
  openTemplatesModal() {
    const modalContainer = document.getElementById('modalContainer');
    const templates = window.rmnAutofill.customTemplates || [];

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="text-xl">📚</span>
              <h3 class="font-extrabold text-slate-800 text-base">الجداول المحفوظة (سحابياً)</h3>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>

          <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            ${templates.length === 0 ? `
              <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <span class="text-3xl block mb-2">📭</span>
                <p class="text-sm font-bold text-slate-700">لا توجد جداول محفوظة في قاعدة البيانات حتى الآن</p>
                <p class="text-xs text-slate-400 mt-1">يمكنك حفظ جدول الأسبوع الحالي أدناه ليكون قالباً محفوظاً في السحابة</p>
              </div>
            ` : templates.map(tpl => `
              <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 class="font-extrabold text-slate-900 text-sm">${tpl.name}</h4>
                  <p class="text-xs text-slate-500">${tpl.description || ''}</p>
                </div>
                <div class="flex items-center gap-1.5">
                  <button onclick="window.rmnUI.applyTemplate('${tpl.id}')" class="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow cursor-pointer">
                    استخدام الجدول
                  </button>
                  ${tpl.scheduleData ? `<button onclick="window.rmnUI.duplicateTemplate('${tpl.id}')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs cursor-pointer" title="نسخ الجدول باسم جديد">⧉</button>` : ''}
                  <button onclick="window.rmnUI.deleteTemplateConfirm('${tpl.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs cursor-pointer" title="حذف الجدول">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="pt-4 border-t border-slate-200">
            <h4 class="text-xs font-extrabold text-slate-800 mb-2">حفظ جدول الأسبوع الحالي باسم لاستخدامه لاحقاً:</h4>
            <div class="flex items-center gap-2">
              <input type="text" id="newTemplateNameInput" placeholder="مثال: جدول عيد الميلاد 2026" class="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500">
              <button onclick="window.rmnUI.saveNewTemplate()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer">
                حفظ سحابياً
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  applyTemplate(templateId) {
    if (confirm('سيتم استبدال الجدول الحالي بالقالب المحدد. هل تود المتابعة؟')) {
      window.rmnAutofill.loadTemplate(templateId);
      this.closeModal();
      this.refreshAll();
    }
  }

  deleteTemplateConfirm(templateId) {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      window.rmnAutofill.deleteTemplate(templateId);
      this.openTemplatesModal();
    }
  }

  saveNewTemplate() {
    const name = document.getElementById('newTemplateNameInput').value.trim();
    if (!name) {
      this.showToast('يرجى كتابة اسم للقالب', 'error');
      return;
    }
    window.rmnAutofill.saveWeekAsTemplate(name, 'قالب مخصص لأسبوع إذاعي');
    this.openTemplatesModal();
  }

  duplicateTemplate(templateId) {
    const source = window.rmnAutofill.customTemplates.find(template => template.id === templateId);
    const name = prompt(`اسم النسخة الجديدة من "${source?.name || 'الجدول'}":`, `${source?.name || 'جدول'} - نسخة`);
    if (!name?.trim()) return;
    if (window.rmnAutofill.duplicateTemplate(templateId, name)) {
      this.showToast(`تم حفظ النسخة باسم "${name.trim()}".`, 'success');
      this.openTemplatesModal();
    }
  }

  // --- UNDO / REDO ---
  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoActionBtn');
    const redoBtn = document.getElementById('redoActionBtn');
    if (undoBtn) {
      undoBtn.disabled = window.rmnState.historyStack.length === 0;
      undoBtn.style.opacity = undoBtn.disabled ? '0.4' : '1';
    }
    if (redoBtn) {
      redoBtn.disabled = window.rmnState.redoStack.length === 0;
      redoBtn.style.opacity = redoBtn.disabled ? '0.4' : '1';
    }
  }

  handleUndo() {
    if (window.rmnState.undo()) {
      this.showToast('تم التراجع عن الإجراء الأخير', 'info');
      this.refreshAll();
    }
  }

  handleRedo() {
    if (window.rmnState.redo()) {
      this.showToast('تمت إعادة الإجراء', 'info');
      this.refreshAll();
    }
  }

  // --- TOAST NOTIFICATIONS ---
  setupToastContainer() {
    if (!document.getElementById('toastWrapper')) {
      const wrapper = document.createElement('div');
      wrapper.id = 'toastWrapper';
      wrapper.className = 'fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(wrapper);
    }
    this.toastContainer = document.getElementById('toastWrapper');
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) this.setupToastContainer();

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-slate-900 text-white',
      warning: 'bg-amber-500 text-slate-950'
    };

    toast.className = `${bgColors[type] || bgColors.info} px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 pointer-events-auto transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-3`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ️'}</span>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // =========================================================================
  // --- 4. SETTINGS VIEW (PRESENTERS & CATEGORIES MANAGEMENT) ---
  // =========================================================================
  setSettingsSubTab(subTab) {
    this.settingsSubTab = subTab;
    this.renderSettingsView();
  }

  handlePresenterSearch(query) {
    this.presenterSearchQuery = query;
    const container = document.getElementById('presentersGridContainer');
    if (container) {
      const presenters = window.rmnState.getPresenters();
      const programs = window.rmnState.programs || [];
      const filterQuery = (query || '').toLowerCase().trim();
      const filtered = presenters.filter(p => !filterQuery || p.toLowerCase().includes(filterQuery));
      container.innerHTML = this.renderPresentersCardsHTML(filtered, programs);
    }
  }

  // --- SETTINGS VIEW (3 ACTION BUTTONS: PRESENTERS, CATEGORIES, SCHEDULE COMPARE) ---
  renderSettingsView() {
    const container = document.getElementById('settingsContainer');
    if (!container) return;

    const presenters = window.rmnState.getPresenters();
    const categories = window.rmnState.getAllCategories();
    const availableSchedulesCount = 1 + (window.rmnAutofill?.customTemplates?.length || 0);

    container.innerHTML = `
      <div class="max-w-6xl mx-auto py-12 px-4 space-y-10 animate-in fade-in">
        <!-- Settings Header -->
        <div class="text-center space-y-2.5">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-900/10 text-blue-900 text-3xl shadow-2xs">
            ⚙️
          </div>
          <h2 class="text-2xl font-black text-slate-800">الإعدادات</h2>
          <p class="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            إدارة وتعديل بيانات المذيعين ومقدمي البرامج، تصنيفات المحطة، ومقارنة الجداول الإذاعية مع مزامنة سحابية مباشرة
          </p>
        </div>

        <!-- 3 Large Management Action Buttons (No Table On Page) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <!-- Button 1: Presenters -->
          <button 
            type="button"
            onclick="window.rmnUI.openPresentersManagementModal()"
            class="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-blue-600 hover:shadow-xl transition-all text-right group flex flex-col justify-between gap-6 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <div class="flex items-start justify-between">
              <div class="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-2xs">
                🎤
              </div>
              <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                ${presenters.length} مُقدّم
              </span>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                المذيعون ومقدمو البرامج
              </h3>
              <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                إضافة مذيعين ومقدمين جدد، تعديل الأسماء، أو حذفهم مع تحديث تلقائي لقاعدة البيانات السحابية
              </p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-blue-700">
              <span>إدارة وتعديل المذيعين</span>
              <span class="text-base group-hover:translate-x-[-4px] transition-transform">←</span>
            </div>
          </button>

          <!-- Button 2: Categories -->
          <button 
            type="button"
            onclick="window.rmnUI.openCategoriesManagementModal()"
            class="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-indigo-600 hover:shadow-xl transition-all text-right group flex flex-col justify-between gap-6 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <div class="flex items-start justify-between">
              <div class="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-2xs">
                🏷️
              </div>
              <span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                ${categories.length} تصنيفات
              </span>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-800 group-hover:text-indigo-700 transition-colors">
                تصنيفات البرامج
              </h3>
              <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                إضافة وتعديل تصنيفات البرامج الإذاعية، وتغيير ألوان التمييز وحذف التصنيفات
              </p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-indigo-700">
              <span>إدارة وتعديل التصنيفات</span>
              <span class="text-base group-hover:translate-x-[-4px] transition-transform">←</span>
            </div>
          </button>

          <!-- Button 3: Schedule Comparison -->
          <button 
            type="button"
            onclick="window.rmnUI.openScheduleCompareModal()"
            class="p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-amber-500 hover:shadow-xl transition-all text-right group flex flex-col justify-between gap-6 cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-100"
          >
            <div class="flex items-start justify-between">
              <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-2xs">
                ⚖️
              </div>
              <span class="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-300">
                ${availableSchedulesCount} جداول متاحة
              </span>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-800 group-hover:text-amber-700 transition-colors">
                مقارنة جدولين إذاعيين
              </h3>
              <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                مقارنة جدولين جنباً إلى جنب مع إبراز الفروقات والتعديلات بدقة باللون الأصفر في كلا الجدولين
              </p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-700">
              <span>فتح شاشة المقارنة</span>
              <span class="text-base group-hover:translate-x-[-4px] transition-transform">←</span>
            </div>
          </button>
        </div>
      </div>
    `;
  }

  // --- PRESENTERS MANAGEMENT MODAL ---
  openPresentersManagementModal(searchFilter = '') {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;

    const presenters = window.rmnState.getPresenters();
    const programs = window.rmnState.programs || [];
    const filterQuery = (searchFilter || '').toLowerCase().trim();
    const filtered = presenters.filter(p => !filterQuery || p.toLowerCase().includes(filterQuery));

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in max-h-[90vh] flex flex-col modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🎤</span>
              <div>
                <h3 class="font-extrabold text-slate-800 text-base">إدارة المذيعين ومقدمي البرامج</h3>
                <p class="text-xs text-slate-500">إجمالي ${presenters.length} مقدّم مسجّل في قاعدة البيانات</p>
              </div>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>

          <!-- Controls: Search & Add -->
          <div class="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div class="flex-1 min-w-[200px] relative">
              <input 
                type="text" 
                id="presenterModalSearchInput"
                placeholder="ابحث عن مذيع..." 
                value="${searchFilter}"
                oninput="window.rmnUI.openPresentersManagementModal(this.value)"
                class="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
              <span class="absolute right-3 top-2 text-slate-400 text-xs">🔍</span>
            </div>
            <button 
              type="button" 
              onclick="window.rmnUI.openAddPresenterModal()"
              class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span> إضافة مقدّم جديد
            </button>
          </div>

          <!-- Scrollable List of Presenters -->
          <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
            ${filtered.length === 0 ? `
              <div class="py-12 text-center text-slate-400">
                <span class="text-3xl block mb-2">🔍</span>
                <p class="text-xs font-bold">لم يتم العثور على أي مقدّم برامج مطابق</p>
              </div>
            ` : filtered.map(name => {
              const progCount = programs.filter(p => p.presenter && p.presenter.toLowerCase() === name.toLowerCase()).length;
              const safeName = name.replace(/'/g, "\\'");
              return `
                <div class="p-3 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                      🎤
                    </div>
                    <div class="min-w-0">
                      <h4 class="font-bold text-slate-800 text-sm truncate">${name}</h4>
                      <span class="text-[11px] text-slate-500 font-semibold">
                        ${progCount} ${progCount === 1 ? 'برنامج مرتبط' : 'برامج مرتبطة'}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button 
                      type="button"
                      onclick="window.rmnUI.openEditPresenterModal('${safeName}')"
                      class="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>✏️</span> تعديل
                    </button>
                    <button 
                      type="button"
                      onclick="window.rmnUI.confirmDeletePresenter('${safeName}', ${progCount})"
                      class="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>🗑️</span> حذف
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Footer -->
          <div class="pt-3 border-t border-slate-200 flex items-center justify-end shrink-0">
            <button onclick="window.rmnUI.closeModal()" class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">
              إغلاق
            </button>
          </div>

        </div>
      </div>
    `;

    if (searchFilter) {
      setTimeout(() => {
        const inp = document.getElementById('presenterModalSearchInput');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      }, 10);
    }
  }

  // --- CATEGORIES MANAGEMENT MODAL ---
  openCategoriesManagementModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;

    const categories = window.rmnState.getAllCategories();
    const programs = window.rmnState.programs || [];

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in max-h-[90vh] flex flex-col modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🏷️</span>
              <div>
                <h3 class="font-extrabold text-slate-800 text-base">إدارة تصنيفات البرامج</h3>
                <p class="text-xs text-slate-500">إجمالي ${categories.length} تصنيفات مسجلة في قاعدة البيانات</p>
              </div>
            </div>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>

          <!-- Action: Add Category -->
          <div class="flex items-center justify-between shrink-0">
            <span class="text-xs font-bold text-slate-500">تصنيفات البرامج وتحديد ألوان الهوية:</span>
            <button 
              type="button" 
              onclick="window.rmnUI.openAddCategoryModal()"
              class="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span> إضافة تصنيف جديد
            </button>
          </div>

          <!-- Scrollable List of Categories -->
          <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
            ${categories.map(cat => {
              const progCount = programs.filter(p => p.categoryId === cat.id).length;
              const color = cat.color || '#1d4ed8';
              const safeName = cat.name.replace(/'/g, "\\'");
              return `
                <div class="p-3 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-white shadow-2xs" style="background-color: ${color}">
                      🏷️
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <h4 class="font-bold text-slate-800 text-sm truncate">${cat.name}</h4>
                        <span class="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block" style="background-color: ${color}"></span>
                      </div>
                      <span class="text-[11px] text-slate-500 font-semibold">
                        ${progCount} ${progCount === 1 ? 'برنامج مرتبط' : 'برامج مرتبطة'}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button 
                      type="button"
                      onclick="window.rmnUI.openEditCategoryModal('${cat.id}')"
                      class="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>✏️</span> تعديل
                    </button>
                    <button 
                      type="button"
                      onclick="window.rmnUI.confirmDeleteCategory('${cat.id}', '${safeName}', ${progCount})"
                      class="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>🗑️</span> حذف
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Footer -->
          <div class="pt-3 border-t border-slate-200 flex items-center justify-end shrink-0">
            <button onclick="window.rmnUI.closeModal()" class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">
              إغلاق
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // --- PRESENTER CRUD MODALS ---
  openAddPresenterModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-extrabold text-slate-800 text-base">➕ إضافة مقدّم برامج جديد</h3>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">اسم المقدّم أو المسؤول: *</label>
            <input type="text" id="newPresenterNameInput" placeholder="مثال: الأب يوحنا المعمدان" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onclick="window.rmnUI.openPresentersManagementModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">إلغاء</button>
            <button onclick="window.rmnUI.saveNewPresenter()" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow cursor-pointer">حفظ في السحابة</button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('newPresenterNameInput')?.focus(), 50);
  }

  async saveNewPresenter() {
    const name = document.getElementById('newPresenterNameInput')?.value.trim();
    if (!name) {
      this.showToast('يرجى إدخال اسم المقدّم', 'error');
      return;
    }
    await window.rmnState.addPresenter(name);
    this.renderSettingsView();
    this.openPresentersManagementModal();
    this.showToast(`تمت إضافة المقدّم "${name}" بنجاح`, 'success');
  }

  openEditPresenterModal(oldName) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;
    const safeOldName = oldName.replace(/"/g, '&quot;');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-extrabold text-slate-800 text-base">✏️ تعديل اسم المقدّم</h3>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">الاسم المعدل: *</label>
            <input type="text" id="editPresenterNameInput" value="${safeOldName}" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500">
            <p class="text-[11px] text-slate-500 mt-1.5">سيتم تحديث الاسم تلقائياً في كافة البرامج المرتبطة به.</p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onclick="window.rmnUI.openPresentersManagementModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">إلغاء</button>
            <button onclick="window.rmnUI.saveEditedPresenter('${oldName.replace(/'/g, "\\'")}')" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow cursor-pointer">تحديث وحفظ</button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('editPresenterNameInput')?.focus(), 50);
  }

  async saveEditedPresenter(oldName) {
    const newName = document.getElementById('editPresenterNameInput')?.value.trim();
    if (!newName) {
      this.showToast('يرجى إدخال اسم المقدّم', 'error');
      return;
    }
    if (newName === oldName) {
      this.openPresentersManagementModal();
      return;
    }
    await window.rmnState.updatePresenter(oldName, newName);
    this.renderSettingsView();
    this.openPresentersManagementModal();
    this.showToast(`تم تحديث اسم المذيع إلى "${newName}" بنجاح`, 'success');
  }

  async confirmDeletePresenter(name, progCount) {
    const msg = progCount > 0 
      ? `هل أنت متأكد من حذف المقدّم "${name}"؟ هناك ${progCount} برامج مرتبطة به.`
      : `هل أنت متأكد من حذف المقدّم "${name}" من قاعدة البيانات؟`;
    if (!confirm(msg)) return;

    await window.rmnState.deletePresenter(name);
    this.renderSettingsView();
    this.openPresentersManagementModal();
    this.showToast(`تم حذف المقدّم "${name}" بنجاح`, 'info');
  }

  // --- CATEGORY CRUD MODALS ---
  openAddCategoryModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-extrabold text-slate-800 text-base">➕ إضافة تصنيف برامجي جديد</h3>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف: *</label>
            <input type="text" id="newCategoryNameInput" placeholder="مثال: تعليم مسيحي أو قديسون" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">لون تمييز التصنيف:</label>
            <div class="flex items-center gap-3">
              <input type="color" id="newCategoryColorInput" value="#1d4ed8" class="w-12 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5">
              <span class="text-xs text-slate-500">اختر لوناً مميزاً لتصنيف البرامج</span>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onclick="window.rmnUI.openCategoriesManagementModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">إلغاء</button>
            <button onclick="window.rmnUI.saveNewCategory()" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow cursor-pointer">حفظ التصنيف</button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('newCategoryNameInput')?.focus(), 50);
  }

  async saveNewCategory() {
    const name = document.getElementById('newCategoryNameInput')?.value.trim();
    const color = document.getElementById('newCategoryColorInput')?.value || '#1d4ed8';
    if (!name) {
      this.showToast('يرجى إدخال اسم التصنيف', 'error');
      return;
    }
    await window.rmnState.addCategory(name, color);
    this.renderSettingsView();
    this.openCategoriesManagementModal();
    this.showToast(`تمت إضافة التصنيف "${name}" بنجاح`, 'success');
  }

  openEditCategoryModal(catId) {
    const cat = window.rmnState.getCategory(catId);
    if (!cat) return;
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;
    const safeName = cat.name.replace(/"/g, '&quot;');
    const color = cat.color || '#1d4ed8';

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-extrabold text-slate-800 text-base">✏️ تعديل التصنيف</h3>
            <button onclick="window.rmnUI.closeModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف: *</label>
            <input type="text" id="editCategoryNameInput" value="${safeName}" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">لون تمييز التصنيف:</label>
            <div class="flex items-center gap-3">
              <input type="color" id="editCategoryColorInput" value="${color}" class="w-12 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5">
              <span class="text-xs text-slate-500">تغيير لون التصنيف</span>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button onclick="window.rmnUI.openCategoriesManagementModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">إلغاء</button>
            <button onclick="window.rmnUI.saveEditedCategory('${catId}')" class="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow cursor-pointer">تحديث التصنيف</button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('editCategoryNameInput')?.focus(), 50);
  }

  async saveEditedCategory(catId) {
    const name = document.getElementById('editCategoryNameInput')?.value.trim();
    const color = document.getElementById('editCategoryColorInput')?.value || '#1d4ed8';
    if (!name) {
      this.showToast('يرجى إدخال اسم التصنيف', 'error');
      return;
    }
    await window.rmnState.updateCategory(catId, { name, color });
    this.renderSettingsView();
    this.openCategoriesManagementModal();
    this.showToast(`تم تحديث التصنيف بنجاح`, 'success');
  }

  async confirmDeleteCategory(catId, catName, progCount) {
    const msg = progCount > 0 
      ? `هل أنت متأكد من حذف التصنيف "${catName}"؟ البرامج المرتبطة به (${progCount} برامج) ستتحول تلقائياً لتصنيف افتراضي.`
      : `هل أنت متأكد من حذف التصنيف "${catName}"؟`;
    if (!confirm(msg)) return;

    await window.rmnState.deleteCategory(catId);
    this.renderSettingsView();
    this.openCategoriesManagementModal();
    this.showToast(`تم حذف التصنيف "${catName}" بنجاح`, 'info');
  }

  // =========================================================================
  // --- SCHEDULE COMPARISON SYSTEM (TABLE 1 LEFT | TABLE 2 RIGHT | GREYSCALE & YELLOW DIFFS) ---
  // =========================================================================

  getAvailableSchedulesForCompare() {
    const list = [];
    
    // 1. Current Active Schedule
    const activeName = window.rmnState.activeScheduleName || 'الجدول النشط حالياً';
    list.push({
      id: 'active_schedule',
      name: `الجدول الحالي (${activeName})`,
      shortName: activeName,
      scheduleData: window.rmnState.schedule,
      badge: 'النشط حالياً'
    });

    // 2. Saved Templates from Database/Cloud
    const templates = window.rmnAutofill?.customTemplates || [];
    templates.forEach(t => {
      list.push({
        id: t.id,
        name: `قالب محفوظ: ${t.name}`,
        shortName: t.name,
        scheduleData: t.scheduleData,
        badge: 'محفوظ سحابياً',
        created: t.created
      });
    });

    // 3. Radio Maria Standard Blueprint
    list.push({
      id: 'standard_blueprint',
      name: 'جدول البث الإذاعي القياسي (Radio Maria Blueprint)',
      shortName: 'الجدول القياسي',
      scheduleData: window.rmnState.applyDefaultBlueprint(window.rmnState.createEmptyWeeklySchedule()),
      badge: 'المرجعي القياسي'
    });

    // 4. Blank Schedule
    list.push({
      id: 'empty_schedule',
      name: 'جدول فارغ بالكامل (Blank)',
      shortName: 'فارغ',
      scheduleData: window.rmnState.createEmptyWeeklySchedule(),
      badge: 'فارغ'
    });

    return list;
  }

  getScheduleDataById(id) {
    if (!id || id === 'active_schedule') return window.rmnState.schedule;
    if (id === 'standard_blueprint') return window.rmnState.applyDefaultBlueprint(window.rmnState.createEmptyWeeklySchedule());
    if (id === 'empty_schedule') return window.rmnState.createEmptyWeeklySchedule();
    const tpl = window.rmnAutofill?.customTemplates?.find(t => t.id === id);
    return tpl?.scheduleData ? tpl.scheduleData : window.rmnState.schedule;
  }

  getScheduleNameById(id) {
    if (!id || id === 'active_schedule') return window.rmnState.activeScheduleName || 'الجدول الحالي';
    if (id === 'standard_blueprint') return 'الجدول القياسي';
    if (id === 'empty_schedule') return 'جدول فارغ';
    const tpl = window.rmnAutofill?.customTemplates?.find(t => t.id === id);
    return tpl ? tpl.name : id;
  }

  computeScheduleDiff(sched1, sched2) {
    const result = {
      totalSlots: 0,
      diffSlots: 0,
      sameSlots: 0,
      dayStats: {},
      diffEvents: []
    };

    if (!sched1 || !sched2) return result;

    RMN_DAYS.forEach(day => {
      const slots1 = sched1[day.id] || [];
      const slots2 = sched2[day.id] || [];
      let dayDiffCount = 0;
      const dayDiffRanges = [];
      let currentRange = null;

      for (let slotIdx = 0; slotIdx < 288; slotIdx++) {
        result.totalSlots++;
        const s1 = slots1[slotIdx] || null;
        const s2 = slots2[slotIdx] || null;

        const p1 = s1?.programId || null;
        const p2 = s2?.programId || null;
        const live1 = Boolean(s1?.isLive);
        const live2 = Boolean(s2?.isLive);
        const rep1 = Boolean(s1?.isRepeat);
        const rep2 = Boolean(s2?.isRepeat);
        const note1 = (s1?.note || '').trim();
        const note2 = (s2?.note || '').trim();

        const isSlotDiff = (p1 !== p2) || (live1 !== live2) || (rep1 !== rep2) || (note1 !== note2);

        if (isSlotDiff) {
          result.diffSlots++;
          dayDiffCount++;

          if (!currentRange) {
            currentRange = {
              dayId: day.id,
              dayNameAr: day.nameAr,
              startSlot: slotIdx,
              count: 1,
              p1, p2,
              live1, live2,
              rep1, rep2,
              note1, note2
            };
          } else {
            if (currentRange.p1 === p1 && currentRange.p2 === p2 && currentRange.live1 === live1 && currentRange.live2 === live2) {
              currentRange.count++;
            } else {
              dayDiffRanges.push(currentRange);
              currentRange = {
                dayId: day.id,
                dayNameAr: day.nameAr,
                startSlot: slotIdx,
                count: 1,
                p1, p2,
                live1, live2,
                rep1, rep2,
                note1, note2
              };
            }
          }
        } else {
          result.sameSlots++;
          if (currentRange) {
            dayDiffRanges.push(currentRange);
            currentRange = null;
          }
        }
      }
      if (currentRange) {
        dayDiffRanges.push(currentRange);
      }

      result.dayStats[day.id] = {
        diffSlots: dayDiffCount,
        diffCount: dayDiffRanges.length,
        diffRanges: dayDiffRanges
      };
      result.diffEvents.push(...dayDiffRanges);
    });

    return result;
  }

  isSlotRangeDiff(sched1, sched2, dayId, startSlot, count) {
    if (!sched1 || !sched2 || !sched1[dayId] || !sched2[dayId]) return false;
    const end = Math.min(288, startSlot + count);
    for (let i = startSlot; i < end; i++) {
      const s1 = sched1[dayId][i];
      const s2 = sched2[dayId][i];
      if ((s1?.programId || null) !== (s2?.programId || null)) return true;
      if (Boolean(s1?.isLive) !== Boolean(s2?.isLive)) return true;
      if (Boolean(s1?.isRepeat) !== Boolean(s2?.isRepeat)) return true;
      if ((s1?.note || '').trim() !== (s2?.note || '').trim()) return true;
    }
    return false;
  }

  getScheduleBlocksFromData(sched, dayId) {
    const slots = sched[dayId] || [];
    const blocks = [];
    let currentBlock = null;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!currentBlock) {
        currentBlock = {
          startSlot: i,
          count: 1,
          programId: slot?.programId || null,
          note: slot?.note || '',
          isLive: Boolean(slot?.isLive),
          isRepeat: Boolean(slot?.isRepeat)
        };
      } else {
        const sameProg = currentBlock.programId === (slot?.programId || null);
        const sameNote = (currentBlock.note || '') === (slot?.note || '');
        const sameLive = Boolean(currentBlock.isLive) === Boolean(slot?.isLive);
        const sameRepeat = Boolean(currentBlock.isRepeat) === Boolean(slot?.isRepeat);

        if (sameProg && sameNote && sameLive && sameRepeat) {
          currentBlock.count++;
        } else {
          blocks.push(currentBlock);
          currentBlock = {
            startSlot: i,
            count: 1,
            programId: slot?.programId || null,
            note: slot?.note || '',
            isLive: Boolean(slot?.isLive),
            isRepeat: Boolean(slot?.isRepeat)
          };
        }
      }
    }
    if (currentBlock) blocks.push(currentBlock);
    return blocks;
  }

  openScheduleCompareModal() {
    const available = this.getAvailableSchedulesForCompare();
    if (!this.compareState) {
      this.compareState = {
        schedule1Id: 'active_schedule',
        schedule2Id: available.find(s => s.id !== 'active_schedule')?.id || 'standard_blueprint',
        selectedDay: 'sun',
        subView: 'visual',
        filterDiffOnly: false
      };
    } else {
      if (!available.some(s => s.id === this.compareState.schedule1Id)) {
        this.compareState.schedule1Id = 'active_schedule';
      }
      if (!available.some(s => s.id === this.compareState.schedule2Id)) {
        this.compareState.schedule2Id = available.find(s => s.id !== this.compareState.schedule1Id)?.id || 'standard_blueprint';
      }
    }

    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 modal-backdrop" onclick="if (event.target === this) window.rmnUI.closeModal()">
        <div class="bg-white rounded-3xl w-full max-w-[1440px] h-[95vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in modal-content" data-modal-card="true" onclick="event.stopPropagation()">
          <div id="compareModalRoot" class="flex flex-col h-full overflow-hidden">
            <!-- Dynamic comparison content -->
          </div>
        </div>
      </div>
    `;

    this.renderScheduleCompareModalContent();
  }

  setCompareSchedule(which, scheduleId) {
    if (!this.compareState) return;
    this.compareState[which] = scheduleId;
    this.renderScheduleCompareModalContent();
  }

  swapCompareSchedules() {
    if (!this.compareState) return;
    const temp = this.compareState.schedule1Id;
    this.compareState.schedule1Id = this.compareState.schedule2Id;
    this.compareState.schedule2Id = temp;
    this.renderScheduleCompareModalContent();
  }

  setCompareDay(dayId) {
    if (!this.compareState) return;
    this.compareState.selectedDay = dayId;
    this.renderScheduleCompareModalContent();
  }

  setCompareSubView(viewType) {
    if (!this.compareState) return;
    this.compareState.subView = viewType;
    this.renderScheduleCompareModalContent();
  }

  toggleCompareDiffOnly() {
    if (!this.compareState) return;
    this.compareState.filterDiffOnly = !this.compareState.filterDiffOnly;
    this.renderScheduleCompareModalContent();
  }

  renderScheduleCompareModalContent() {
    const root = document.getElementById('compareModalRoot');
    if (!root) return;

    const available = this.getAvailableSchedulesForCompare();
    const sched1 = this.getScheduleDataById(this.compareState.schedule1Id);
    const sched2 = this.getScheduleDataById(this.compareState.schedule2Id);
    const name1 = this.getScheduleNameById(this.compareState.schedule1Id);
    const name2 = this.getScheduleNameById(this.compareState.schedule2Id);
    const diffResult = this.computeScheduleDiff(sched1, sched2);

    const matchPercent = diffResult.totalSlots > 0 
      ? (((diffResult.totalSlots - diffResult.diffSlots) / diffResult.totalSlots) * 100).toFixed(1) 
      : 100;

    const totalDiffHours = (diffResult.diffSlots * 5 / 60).toFixed(1);

    // Days to show
    const daysToShow = this.compareState.selectedDay === 'all' 
      ? RMN_DAYS 
      : RMN_DAYS.filter(d => d.id === this.compareState.selectedDay);

    root.innerHTML = `
      <!-- 1. Header Bar -->
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shadow-2xs">
            ⚖️
          </div>
          <div>
            <h2 class="text-lg font-black text-slate-800">مقارنة وتحليل الفروقات بين جدولين (Schedule Diff Checker)</h2>
            <p class="text-xs text-slate-500">
              مقارنة دقيقة جنباً إلى جنب: 
              <strong class="text-blue-700">الجدول 1 (على اليسار)</strong> 
              مقابل 
              <strong class="text-emerald-700">الجدول 2 (على اليمين)</strong> 
              مع إبراز الفروقات والتغييرات باللون الأصفر وتظليل المتطابق بالرمادي
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.rmnUI.printCompareReport()" 
            class="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <span>🖨️</span> طباعة التقرير
          </button>
          <button 
            type="button" 
            onclick="window.rmnUI.closeModal()" 
            class="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-base font-bold flex items-center justify-center cursor-pointer transition"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 2. Controls & Selectors Bar -->
      <div class="px-6 py-3.5 bg-white border-b border-slate-200 space-y-3 shrink-0">
        <!-- Schedules Dropdowns & Swap -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <!-- Left Table 1 Picker -->
          <div class="flex-1 min-w-[280px]">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>الجدول 1 (معروض على اليسار Left):</span>
              </label>
              <span class="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">الطرف الأول</span>
            </div>
            <select 
              id="compareSchedSelect1" 
              onchange="window.rmnUI.setCompareSchedule('schedule1Id', this.value)" 
              class="w-full p-2 bg-blue-50/50 hover:bg-blue-50 border-2 border-blue-200 focus:border-blue-600 rounded-xl text-xs font-bold text-slate-800 transition outline-none cursor-pointer"
            >
              ${available.map(s => `
                <option value="${s.id}" ${s.id === this.compareState.schedule1Id ? 'selected' : ''}>
                  ${s.name}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Swap Button -->
          <div class="pt-5">
            <button 
              type="button" 
              onclick="window.rmnUI.swapCompareSchedules()" 
              title="تبديل موقع الجدولين (يمين ↔ يسار)" 
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300 font-black text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span>⇄</span>
              <span>تبديل</span>
            </button>
          </div>

          <!-- Right Table 2 Picker -->
          <div class="flex-1 min-w-[280px]">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>الجدول 2 (معروض على اليمين Right):</span>
              </label>
              <span class="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">الطرف الثاني</span>
            </div>
            <select 
              id="compareSchedSelect2" 
              onchange="window.rmnUI.setCompareSchedule('schedule2Id', this.value)" 
              class="w-full p-2 bg-emerald-50/50 hover:bg-emerald-50 border-2 border-emerald-200 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-800 transition outline-none cursor-pointer"
            >
              ${available.map(s => `
                <option value="${s.id}" ${s.id === this.compareState.schedule2Id ? 'selected' : ''}>
                  ${s.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Days Filter & Views Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <!-- Day Tabs -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            <button 
              type="button" 
              onclick="window.rmnUI.setCompareDay('all')" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${this.compareState.selectedDay === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
            >
              <span>🗓️ كل الأيام</span>
              ${diffResult.diffEvents.length > 0 ? `
                <span class="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">${diffResult.diffEvents.length} ⚠️</span>
              ` : `
                <span class="text-[10px] text-emerald-400 font-bold">✓</span>
              `}
            </button>

            ${RMN_DAYS.map(d => {
              const count = diffResult.dayStats[d.id]?.diffCount || 0;
              const isSelected = this.compareState.selectedDay === d.id;
              return `
                <button 
                  type="button" 
                  onclick="window.rmnUI.setCompareDay('${d.id}')" 
                  class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${isSelected ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <span>${d.nameAr}</span>
                  ${count > 0 ? `
                    <span class="px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-amber-300 text-amber-950 font-black' : 'bg-amber-200 text-amber-900 font-bold'} text-[10px]">
                      ${count} ⚠️
                    </span>
                  ` : `
                    <span class="text-[10px] text-slate-400">✓</span>
                  `}
                </button>
              `;
            }).join('')}
          </div>

          <!-- View Mode & Diff-Only Filter -->
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input 
                type="checkbox" 
                ${this.compareState.filterDiffOnly ? 'checked' : ''} 
                onchange="window.rmnUI.toggleCompareDiffOnly()" 
                class="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              >
              <span>عرض الفروقات فقط ⚡</span>
            </label>

            <div class="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
              <button 
                type="button" 
                onclick="window.rmnUI.setCompareSubView('visual')" 
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${this.compareState.subView === 'visual' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}"
              >
                📊 المخطط الزمني (جنباً لجنب)
              </button>
              <button 
                type="button" 
                onclick="window.rmnUI.setCompareSubView('table')" 
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${this.compareState.subView === 'table' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}"
              >
                📋 جدول الفروقات (${diffResult.diffEvents.length})
              </button>
            </div>
          </div>
        </div>

        <!-- Metrics Strip -->
        <div class="flex flex-wrap items-center justify-between px-4 py-2 rounded-xl text-xs font-bold ${diffResult.diffSlots === 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-300'}">
          <div class="flex items-center gap-2">
            <span>${diffResult.diffSlots === 0 ? '✅' : '⚡'}</span>
            ${diffResult.diffSlots === 0 ? `
              <span>الجدولان متطابقان بنسبة <strong>100%</strong> عبر جميع أيام الأسبوع وخانات البث (لا توجد أي فروقات).</span>
            ` : `
              <span>تم رصد <strong>${diffResult.diffEvents.length}</strong> اختلاف (${totalDiffHours} ساعة بث) بين الجدولين — الفروقات مميزة باللون <strong>الأصفر</strong> والبرامج المتطابقة بالرمادي (Greyscale).</span>
            `}
          </div>

          <div class="flex items-center gap-4 text-[11px]">
            <span>نسبة التطابق: <strong>${matchPercent}%</strong></span>
            <span>الخانات المتطابقة: <strong>${diffResult.sameSlots}</strong></span>
            <span>الخانات المعدلة: <strong>${diffResult.diffSlots}</strong></span>
          </div>
        </div>
      </div>

      <!-- 3. Main Compare Content Area -->
      <div id="compareScrollArea" class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
        ${this.compareState.subView === 'visual' 
          ? this.renderCompareVisualView(daysToShow, sched1, sched2, name1, name2) 
          : this.renderCompareTableView(diffResult.diffEvents, name1, name2)}
      </div>
    `;
  }

  renderCompareVisualView(daysList, sched1, sched2, name1, name2) {
    const totalDayHeight = 1440; // 60px per hour
    const totalSlots = 288;
    const filterDiff = this.compareState.filterDiffOnly;

    return daysList.map(day => {
      const blocks1 = this.getScheduleBlocksFromData(sched1, day.id);
      const blocks2 = this.getScheduleBlocksFromData(sched2, day.id);

      const isDayDiff = this.isSlotRangeDiff(sched1, sched2, day.id, 0, 288);
      if (filterDiff && !isDayDiff) {
        return `
          <div class="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 font-bold mb-4 shadow-2xs">
            ✨ يوم (${day.nameAr}): الجدولان متطابقان بالكامل دون أي فروقات (تم إخفاؤه لتفعيل خيار "عرض الفروقات فقط").
          </div>
        `;
      }

      // Generate Table 1 Cards (Left)
      const table1CardsHtml = blocks1.map(block => {
        const isDiff = this.isSlotRangeDiff(sched1, sched2, day.id, block.startSlot, block.count);
        if (filterDiff && !isDiff) return '';

        const prog = block.programId ? window.rmnState.getProgram(block.programId) : null;
        const time = window.rmnState.formatTimeRange(block.startSlot, block.count);
        const top = (block.startSlot / totalSlots) * totalDayHeight;
        const height = Math.max(26, ((block.count / totalSlots) * totalDayHeight) - 2);

        const oppBlock = blocks2.find(b => b.startSlot <= block.startSlot && (b.startSlot + b.count) > block.startSlot);
        const oppProg = oppBlock?.programId ? window.rmnState.getProgram(oppBlock.programId) : null;
        const oppTitle = oppProg ? oppProg.title : 'فترة شاغرة';

        return `
          <div 
            class="${isDiff ? 'compare-block-diff' : 'compare-block-same'} absolute inset-x-2 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden transition-all text-right select-none"
            style="top: ${top}px; height: ${height}px;"
            dir="rtl"
            title="الجدول 1: ${prog ? prog.title : 'فترة شاغرة'} | المقابل في الجدول 2: ${oppTitle}"
          >
            <div class="flex items-start justify-between gap-1">
              <div class="event-title-text text-xs leading-tight font-black truncate">
                ${prog ? prog.title : 'فترة شاغرة (بدون برنامج)'}
              </div>
              ${isDiff ? `
                <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-black shadow-2xs">
                  ⚠️ تعديل
                </span>
              ` : ''}
            </div>

            <div class="flex items-center justify-between text-[10px] font-bold ${isDiff ? 'text-amber-950' : 'text-slate-500'}">
              <span>${time.startStr} - ${time.endStr} (${block.count * 5} دقيقة)</span>
              ${prog?.presenter ? `<span class="truncate max-w-[130px] opacity-90">${prog.presenter}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Generate Table 2 Cards (Right)
      const table2CardsHtml = blocks2.map(block => {
        const isDiff = this.isSlotRangeDiff(sched1, sched2, day.id, block.startSlot, block.count);
        if (filterDiff && !isDiff) return '';

        const prog = block.programId ? window.rmnState.getProgram(block.programId) : null;
        const time = window.rmnState.formatTimeRange(block.startSlot, block.count);
        const top = (block.startSlot / totalSlots) * totalDayHeight;
        const height = Math.max(26, ((block.count / totalSlots) * totalDayHeight) - 2);

        const oppBlock = blocks1.find(b => b.startSlot <= block.startSlot && (b.startSlot + b.count) > block.startSlot);
        const oppProg = oppBlock?.programId ? window.rmnState.getProgram(oppBlock.programId) : null;
        const oppTitle = oppProg ? oppProg.title : 'فترة شاغرة';

        return `
          <div 
            class="${isDiff ? 'compare-block-diff' : 'compare-block-same'} absolute inset-x-2 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden transition-all text-right select-none"
            style="top: ${top}px; height: ${height}px;"
            dir="rtl"
            title="الجدول 2: ${prog ? prog.title : 'فترة شاغرة'} | المقابل في الجدول 1: ${oppTitle}"
          >
            <div class="flex items-start justify-between gap-1">
              <div class="event-title-text text-xs leading-tight font-black truncate">
                ${prog ? prog.title : 'فترة شاغرة (بدون برنامج)'}
              </div>
              ${isDiff ? `
                <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-black shadow-2xs">
                  ⚠️ تعديل
                </span>
              ` : ''}
            </div>

            <div class="flex items-center justify-between text-[10px] font-bold ${isDiff ? 'text-amber-950' : 'text-slate-500'}">
              <span>${time.startStr} - ${time.endStr} (${block.count * 5} دقيقة)</span>
              ${prog?.presenter ? `<span class="truncate max-w-[130px] opacity-90">${prog.presenter}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Central Time Axis (24 Hours)
      const timeAxisHtml = new Array(24).fill(0).map((_, h) => {
        const top = h * 60;
        const timeLabel = `${String(h).padStart(2, '0')}:00`;
        return `
          <div 
            class="absolute inset-x-0 flex items-center justify-center border-b border-slate-200 text-[11px] font-mono font-black text-slate-500 select-none bg-slate-50/70"
            style="top: ${top}px; height: 60px;"
          >
            ${timeLabel}
          </div>
        `;
      }).join('');

      // Background grid lines spanning the height
      const gridLinesHtml = new Array(24).fill(0).map((_, h) => {
        const top = h * 60;
        return `
          <div class="absolute inset-x-0 border-b border-slate-100 pointer-events-none" style="top: ${top}px; height: 60px;"></div>
        `;
      }).join('');

      return `
        <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <!-- Day Banner -->
          <div class="bg-slate-100/90 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base font-black text-slate-800">📅 ${day.nameAr} (${day.nameEn})</span>
            </div>
            <div>
              ${isDayDiff ? `
                <span class="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                  ⚠️ يحتوي على تعديلات واختلافات
                </span>
              ` : `
                <span class="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                  ✅ متطابق 100%
                </span>
              `}
            </div>
          </div>

          <!-- Sticky Column Titles Bar (Table 1 Left | Time Center | Table 2 Right) in LTR -->
          <div class="grid grid-cols-[1fr_80px_1fr] bg-slate-100 border-b border-slate-200 py-2.5 px-4 sticky top-0 z-20 text-xs font-black" dir="ltr">
            <!-- Left: Table 1 -->
            <div class="flex items-center justify-between text-blue-900 pl-2">
              <span class="flex items-center gap-1.5 font-black">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>الجدول 1 (يسار): ${name1}</span>
              </span>
              <span class="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                ${blocks1.length} برنامج
              </span>
            </div>

            <!-- Center: Time Column -->
            <div class="text-center text-slate-500 font-black">
              التوقيت
            </div>

            <!-- Right: Table 2 -->
            <div class="flex items-center justify-between text-emerald-900 pr-2">
              <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                ${blocks2.length} برنامج
              </span>
              <span class="flex items-center gap-1.5 font-black">
                <span>الجدول 2 (يمين): ${name2}</span>
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              </span>
            </div>
          </div>

          <!-- Timeline Comparison Grid Container (dir="ltr") -->
          <div class="relative grid grid-cols-[1fr_80px_1fr] bg-white" style="height: ${totalDayHeight}px;" dir="ltr">
            <!-- Left Column: Table 1 (Left side) -->
            <div class="relative h-full border-r border-slate-200">
              ${gridLinesHtml}
              ${table1CardsHtml}
            </div>

            <!-- Center Column: Shared Synchronized Time Axis -->
            <div class="relative h-full border-r border-slate-200">
              ${timeAxisHtml}
            </div>

            <!-- Right Column: Table 2 (Right side) -->
            <div class="relative h-full">
              ${gridLinesHtml}
              ${table2CardsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCompareTableView(diffEvents, name1, name2) {
    if (!diffEvents || diffEvents.length === 0) {
      return `
        <div class="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
          <div class="text-4xl">🎉</div>
          <h3 class="text-base font-black text-slate-800">الجدولان متطابقان تماماً عبر جميع أيام الأسبوع!</h3>
          <p class="text-xs text-slate-500">لا توجد أي فروقات في البرامج، الأوقات، الملاحظات، أو حالات البث بين "${name1}" و "${name2}".</p>
        </div>
      `;
    }

    return `
      <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 class="font-extrabold text-slate-800 text-sm">
            حصر جميع الاختلافات والتعديلات بين الجدولين (${diffEvents.length} اختلاف)
          </h3>
          <span class="text-xs text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full font-bold">
            مظللة بالأصفر
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
              <tr>
                <th class="p-3">#</th>
                <th class="p-3">اليوم</th>
                <th class="p-3">التوقيت والمدة</th>
                <th class="p-3 text-blue-900">الجدول 1 (اليسار): ${name1}</th>
                <th class="p-3 text-emerald-900">الجدول 2 (اليمين): ${name2}</th>
                <th class="p-3">طبيعة التعديل</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${diffEvents.map((evt, idx) => {
                const prog1 = evt.p1 ? window.rmnState.getProgram(evt.p1) : null;
                const prog2 = evt.p2 ? window.rmnState.getProgram(evt.p2) : null;
                const time = window.rmnState.formatTimeRange(evt.startSlot, evt.count);

                let diffBadge = '';
                if (evt.p1 && !evt.p2) {
                  diffBadge = '<span class="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold border border-red-200">✕ شاغر في جدول 2</span>';
                } else if (!evt.p1 && evt.p2) {
                  diffBadge = '<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">➕ مضاف في جدول 2</span>';
                } else if (evt.p1 !== evt.p2) {
                  diffBadge = '<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black border border-amber-300">⚠️ تغيير برنامج</span>';
                } else {
                  diffBadge = '<span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">🔄 تعديل تفاصيل البث</span>';
                }

                return `
                  <tr class="hover:bg-amber-50/50 transition">
                    <td class="p-3 text-slate-400 font-mono font-bold">${idx + 1}</td>
                    <td class="p-3 font-bold text-slate-800">${evt.dayNameAr}</td>
                    <td class="p-3 font-mono font-bold text-slate-700">${time.startStr} - ${time.endStr} (${evt.count * 5} د)</td>
                    <td class="p-3 bg-blue-50/30">
                      ${prog1 ? `
                        <div class="font-bold text-slate-900">${prog1.title}</div>
                        <div class="text-[10px] text-slate-500">${prog1.presenter || ''} ${evt.live1 ? '• بث مباشر' : ''} ${evt.rep1 ? '• إعادة' : ''}</div>
                      ` : `
                        <span class="text-slate-400 italic">فترة شاغرة</span>
                      `}
                    </td>
                    <td class="p-3 bg-emerald-50/30">
                      ${prog2 ? `
                        <div class="font-bold text-slate-900">${prog2.title}</div>
                        <div class="text-[10px] text-slate-500">${prog2.presenter || ''} ${evt.live2 ? '• بث مباشر' : ''} ${evt.rep2 ? '• إعادة' : ''}</div>
                      ` : `
                        <span class="text-slate-400 italic">فترة شاغرة</span>
                      `}
                    </td>
                    <td class="p-3">${diffBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  printCompareReport() {
    const sched1 = this.getScheduleDataById(this.compareState.schedule1Id);
    const sched2 = this.getScheduleDataById(this.compareState.schedule2Id);
    const name1 = this.getScheduleNameById(this.compareState.schedule1Id);
    const name2 = this.getScheduleNameById(this.compareState.schedule2Id);
    const diffResult = this.computeScheduleDiff(sched1, sched2);
    const matchPercent = diffResult.totalSlots > 0 ? (((diffResult.totalSlots - diffResult.diffSlots) / diffResult.totalSlots) * 100).toFixed(1) : 100;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير مقارنة الجداول الإذاعية - راديو مريم الناصرة</title>
        <style>
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; padding: 24px; color: #1e293b; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 900; color: #0a192f; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .stats { display: flex; gap: 16px; background: #fef08a; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: bold; margin-bottom: 20px; border: 1px solid #eab308; color: #713f12; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
          th { background: #f1f5f9; font-weight: 900; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge-change { background: #fde047; font-weight: bold; padding: 2px 6px; border-radius: 4px; color: #713f12; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">تقرير مقارنة الجداول الإذاعية - راديو مريم الناصرة</h1>
          <div class="subtitle">الجدول 1: <strong>${name1}</strong> | الجدول 2: <strong>${name2}</strong> — تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>

        <div class="stats">
          <span>إجمالي الاختلافات: ${diffResult.diffEvents.length} اختلاف (${(diffResult.diffSlots * 5 / 60).toFixed(1)} ساعة بث)</span>
          <span>نسبة التطابق: ${matchPercent}%</span>
          <span>الخانات المتطابقة: ${diffResult.sameSlots}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اليوم</th>
              <th>التوقيت</th>
              <th>الجدول 1: ${name1}</th>
              <th>الجدول 2: ${name2}</th>
              <th>طبيعة التعديل</th>
            </tr>
          </thead>
          <tbody>
            ${diffResult.diffEvents.map((evt, idx) => {
              const p1 = evt.p1 ? window.rmnState.getProgram(evt.p1)?.title : 'شاغر';
              const p2 = evt.p2 ? window.rmnState.getProgram(evt.p2)?.title : 'شاغر';
              const time = window.rmnState.formatTimeRange(evt.startSlot, evt.count);
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${evt.dayNameAr}</td>
                  <td>${time.startStr} - ${time.endStr} (${evt.count * 5} د)</td>
                  <td><strong>${p1}</strong></td>
                  <td><strong>${p2}</strong></td>
                  <td><span class="badge-change">تعديل</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  }
}

window.rmnUI = new RMNUIController();
