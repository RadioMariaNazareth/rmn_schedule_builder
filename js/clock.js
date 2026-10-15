/**
 * Radio Maria Nazareth - 60-Minute Broadcast Clock Wheel Component
 * ساعة البث الإذاعي الدائرية (60 دقيقة) - لتقسيم الساعة إلى 12 خانة من 5 دقائق
 */

class RMNBroadcastClock {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedWedgeIndex = null;
    this.currentDayId = window.rmnState.selectedDay || 'mon';
    this.currentHour = window.rmnState.selectedHour || 8;
  }

  setDayAndHour(dayId, hour) {
    this.currentDayId = dayId;
    this.currentHour = Math.max(0, Math.min(23, hour));
    this.render();
  }

  render() {
    if (!this.container) return;

    const startSlot = this.currentHour * 12;
    const daySchedule = window.rmnState.schedule[this.currentDayId] || [];
    const dayObj = RMN_DAYS.find(d => d.id === this.currentDayId) || RMN_DAYS[0];

    const hourSlots = [];
    for (let i = 0; i < 12; i++) {
      const slotIndex = startSlot + i;
      const slot = daySchedule[slotIndex] || { slotIndex, programId: null };
      const prog = slot.programId ? window.rmnState.getProgram(slot.programId) : null;
      hourSlots.push({
        slotIndex,
        minuteStart: i * 5,
        minuteEnd: (i + 1) * 5,
        timeRangeStr: `${String(this.currentHour).padStart(2, '0')}:${String(i * 5).padStart(2, '0')} - ${String(this.currentHour).padStart(2, '0')}:${String((i + 1) * 5).padStart(2, '0')}`,
        slot,
        program: prog
      });
    }

    // SVG parameters
    const size = 440;
    const center = size / 2;
    const outerRadius = 190;
    const innerRadius = 80;

    // Build SVG Wedges
    const wedgesSvg = hourSlots.map((item, idx) => {
      // 12 wedges of 30 degrees each
      // Clock starts at top: 0 degrees = -90 in standard trig
      const startAngle = (idx * 30 - 90) * (Math.PI / 180);
      const endAngle = ((idx + 1) * 30 - 90) * (Math.PI / 180);

      const x1 = center + outerRadius * Math.cos(startAngle);
      const y1 = center + outerRadius * Math.sin(startAngle);
      const x2 = center + outerRadius * Math.cos(endAngle);
      const y2 = center + outerRadius * Math.sin(endAngle);

      const x3 = center + innerRadius * Math.cos(endAngle);
      const y3 = center + innerRadius * Math.sin(endAngle);
      const x4 = center + innerRadius * Math.cos(startAngle);
      const y4 = center + innerRadius * Math.sin(startAngle);

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');

      // Color
      const fillColor = item.program ? item.program.color : '#e2e8f0';
      const isSelected = this.selectedWedgeIndex === idx;

      // Text label position (mid angle)
      const midAngle = ((idx + 0.5) * 30 - 90) * (Math.PI / 180);
      const labelRadius = (outerRadius + innerRadius) / 2;
      const tx = center + labelRadius * Math.cos(midAngle);
      const ty = center + labelRadius * Math.sin(midAngle);

      // Minute mark outer position
      const tickAngle = (idx * 30 - 90) * (Math.PI / 180);
      const markRadius = outerRadius + 14;
      const mx = center + markRadius * Math.cos(tickAngle);
      const my = center + markRadius * Math.sin(tickAngle);
      const minText = String(idx * 5).padStart(2, '0');

      return `
        <g class="clock-wedge-group" data-wedge-index="${idx}" data-slot-index="${item.slotIndex}">
          <path 
            d="${pathData}" 
            fill="${fillColor}" 
            stroke="#ffffff" 
            stroke-width="2" 
            class="clock-wedge ${isSelected ? 'active-wedge' : ''}"
          />
          <text 
            x="${tx}" 
            y="${ty}" 
            fill="#ffffff" 
            font-size="11" 
            font-weight="bold" 
            text-anchor="middle" 
            dominant-baseline="central"
            style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);"
          >
            ${item.program ? (item.program.title.length > 8 ? item.program.title.slice(0, 8) + '..' : item.program.title) : 'فارغ'}
          </text>
          <text 
            x="${mx}" 
            y="${my}" 
            fill="#64748b" 
            font-size="11" 
            font-weight="600" 
            text-anchor="middle" 
            dominant-baseline="central"
          >
            ${minText}
          </text>
        </g>
      `;
    }).join('');

    // Check if this hour is current on-air hour
    const now = new Date();
    const isToday = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()] === this.currentDayId);
    const isThisHour = isToday && (now.getHours() === this.currentHour);

    let handSvg = '';
    if (isThisHour) {
      const minute = now.getMinutes() + now.getSeconds() / 60;
      const handAngle = (minute * 6 - 90) * (Math.PI / 180);
      const hx = center + (outerRadius + 5) * Math.cos(handAngle);
      const hy = center + (outerRadius + 5) * Math.sin(handAngle);
      handSvg = `
        <line x1="${center}" y1="${center}" x2="${hx}" y2="${hy}" stroke="#dc2626" stroke-width="3" stroke-linecap="round" />
        <circle cx="${hx}" cy="${hy}" r="5" fill="#dc2626" />
      `;
    }

    const currentHourStr = `${String(this.currentHour).padStart(2, '0')}:00`;
    const nextHourStr = `${String((this.currentHour + 1) % 24).padStart(2, '0')}:00`;

    // Active selected wedge detail
    const selectedItem = this.selectedWedgeIndex !== null ? hourSlots[this.selectedWedgeIndex] : null;

    this.container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
        <!-- Header Controls -->
        <div class="w-full flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-blue-50 text-blue-700 rounded-xl text-xl font-bold">⏱️</span>
            <div>
              <h2 class="text-xl font-black text-slate-800">ساعة البث الإذاعي (Radio Clock)</h2>
              <p class="text-xs text-slate-500">تقسيم ساعة البث إلى 12 خانة (كل خانة 5 دقائق) - معيار هندسة البث الإذاعي</p>
            </div>
          </div>

          <!-- Day & Hour Navigation -->
          <div class="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <select id="clockDaySelect" class="bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500">
              ${RMN_DAYS.map(d => `<option value="${d.id}" ${d.id === this.currentDayId ? 'selected' : ''}>${d.nameAr}</option>`).join('')}
            </select>

            <div class="flex items-center gap-1">
              <button id="clockPrevHourBtn" title="الساعة السابقة" class="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-700 border border-slate-300 font-bold">◀</button>
              <select id="clockHourSelect" class="bg-white border border-slate-300 text-slate-800 text-sm font-bold rounded-lg px-2 py-1.5">
                ${Array.from({ length: 24 }).map((_, h) => `
                  <option value="${h}" ${h === this.currentHour ? 'selected' : ''}>
                    ${String(h).padStart(2, '0')}:00 - ${String((h + 1) % 24).padStart(2, '0')}:00
                  </option>
                `).join('')}
              </select>
              <button id="clockNextHourBtn" title="الساعة التالية" class="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-700 border border-slate-300 font-bold">▶</button>
            </div>
          </div>
        </div>

        <!-- Clock Wheel Graphic + Side Inspector -->
        <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <!-- SVG Wheel -->
          <div class="lg:col-span-7 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 ${size} ${size}" class="w-full max-w-[420px] filter drop-shadow-sm">
              <!-- Center Hub -->
              <circle cx="${center}" cy="${center}" r="${innerRadius - 4}" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
              
              <!-- Clock Wedges -->
              ${wedgesSvg}

              <!-- Live Hand (if current) -->
              ${handSvg}

              <!-- Center Hub Content -->
              <g style="pointer-events: none;">
                <circle cx="${center}" cy="${center}" r="12" fill="#1e3a8a" />
                <text x="${center}" y="${center - 22}" fill="#64748b" font-size="11" font-weight="600" text-anchor="middle">${dayObj.nameAr}</text>
                <text x="${center}" y="${center + 2}" fill="#0f172a" font-size="15" font-weight="800" text-anchor="middle">${currentHourStr}</text>
                <text x="${center}" y="${center + 22}" fill="#64748b" font-size="10" text-anchor="middle">إلى ${nextHourStr}</text>
              </g>
            </svg>
            
            <p class="text-xs text-slate-500 mt-2 text-center">💡 انقر على أي جزء من الساعة (5 دقائق) لتعديله أو تعيين برنامج له</p>
          </div>

          <!-- Wedge Details and Quick Actions -->
          <div class="lg:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-200">
            ${selectedItem ? `
              <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  ⏰ ${selectedItem.timeRangeStr}
                </span>
                <span class="text-xs text-slate-500">خانة رقم ${selectedItem.slotIndex + 1} من 288</span>
              </div>

              <div class="mt-4 p-4 rounded-xl ${selectedItem.program ? 'bg-white shadow-sm border border-slate-200' : 'bg-amber-50 border border-amber-200'}">
                <div class="text-xs text-slate-500 mb-1">البرنامج المجدول:</div>
                <div class="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span class="w-3.5 h-3.5 rounded-full inline-block" style="background-color: ${selectedItem.program ? selectedItem.program.color : '#cbd5e1'}"></span>
                  ${selectedItem.program ? selectedItem.program.title : 'فترة فارغة (بدون برنامج)'}
                </div>
                ${selectedItem.program ? `
                  <div class="text-xs text-slate-600 mt-2 flex flex-col gap-1">
                    <span>👤 <strong>المقدّم:</strong> ${selectedItem.program.presenter || 'غير محدد'}</span>
                    <span>🏷️ <strong>التصنيف:</strong> ${window.rmnState.getCategory(selectedItem.program.categoryId).name}</span>
                  </div>
                ` : ''}
              </div>

              <div class="mt-5 flex flex-col gap-2">
                <button id="assignProgToWedgeBtn" class="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2">
                  <span>➕</span> تعيين أو تغيير برنامج هذه الخانة
                </button>
                <button id="fillHourWithProgBtn" class="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl font-semibold text-xs border border-indigo-200 transition">
                  🔁 ملء الساعة كاملة (60 دقيقة) بهذا البرنامج
                </button>
                ${selectedItem.program ? `
                  <button id="clearWedgeBtn" class="w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold text-xs border border-red-200 transition">
                    🗑️ تفريغ هذه الخانة (5 دقائق)
                  </button>
                ` : ''}
              </div>
            ` : `
              <div class="text-center py-10">
                <div class="text-4xl mb-3">👈</div>
                <h3 class="text-base font-bold text-slate-700 mb-1">حدد أي خانة في الساعة</h3>
                <p class="text-xs text-slate-500 leading-relaxed">اضغط على أي جزء من أجزاء الساعة الـ 12 لعرض تفاصيله، تخصيص البرنامج، أو التكرار.</p>
              </div>
            `}

            <!-- Hour Fast Actions -->
            <div class="mt-6 pt-4 border-t border-slate-200">
              <h4 class="text-xs font-bold text-slate-700 mb-2">أدوات ذكية للساعة:</h4>
              <div class="grid grid-cols-2 gap-2">
                <button id="copyHourToAllDaysBtn" class="p-2 text-xs bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-medium">
                  📋 نسخ الساعة لكافة الأيام
                </button>
                <button id="clearCurrentHourBtn" class="p-2 text-xs bg-white hover:bg-red-50 text-red-600 rounded-lg border border-slate-300 font-medium">
                  🧹 تفريغ هذه الساعة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    // Select Day dropdown
    const daySelect = document.getElementById('clockDaySelect');
    if (daySelect) {
      daySelect.addEventListener('change', (e) => {
        this.currentDayId = e.target.value;
        window.rmnState.selectedDay = this.currentDayId;
        this.selectedWedgeIndex = null;
        this.render();
      });
    }

    // Select Hour dropdown
    const hourSelect = document.getElementById('clockHourSelect');
    if (hourSelect) {
      hourSelect.addEventListener('change', (e) => {
        this.currentHour = parseInt(e.target.value, 10);
        window.rmnState.selectedHour = this.currentHour;
        this.selectedWedgeIndex = null;
        this.render();
      });
    }

    // Prev / Next hour buttons
    const prevBtn = document.getElementById('clockPrevHourBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentHour = (this.currentHour - 1 + 24) % 24;
        window.rmnState.selectedHour = this.currentHour;
        this.selectedWedgeIndex = null;
        this.render();
      });
    }

    const nextBtn = document.getElementById('clockNextHourBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentHour = (this.currentHour + 1) % 24;
        window.rmnState.selectedHour = this.currentHour;
        this.selectedWedgeIndex = null;
        this.render();
      });
    }

    // Wedges click
    this.container.querySelectorAll('.clock-wedge-group').forEach(group => {
      group.addEventListener('click', () => {
        const wedgeIdx = parseInt(group.getAttribute('data-wedge-index'), 10);
        this.selectedWedgeIndex = wedgeIdx;
        this.render();
      });
    });

    // Assign program button
    const assignBtn = document.getElementById('assignProgToWedgeBtn');
    if (assignBtn && this.selectedWedgeIndex !== null) {
      assignBtn.addEventListener('click', () => {
        const slotIdx = this.currentHour * 12 + this.selectedWedgeIndex;
        window.rmnUI.openSlotAssignmentModal(this.currentDayId, slotIdx, 1);
      });
    }

    // Fill whole hour with active/selected program
    const fillHourBtn = document.getElementById('fillHourWithProgBtn');
    if (fillHourBtn && this.selectedWedgeIndex !== null) {
      fillHourBtn.addEventListener('click', () => {
        const slotIdx = this.currentHour * 12 + this.selectedWedgeIndex;
        const currentSlot = window.rmnState.schedule[this.currentDayId][slotIdx];
        if (currentSlot && currentSlot.programId) {
          window.rmnState.setSlotRange(this.currentDayId, this.currentHour * 12, 12, currentSlot.programId);
          window.rmnUI.showToast('تم ملء الساعة كاملة بالبرنامج المحدد بنجاح', 'success');
          this.render();
        } else {
          window.rmnUI.openSlotAssignmentModal(this.currentDayId, this.currentHour * 12, 12);
        }
      });
    }

    // Clear Wedge
    const clearWedgeBtn = document.getElementById('clearWedgeBtn');
    if (clearWedgeBtn && this.selectedWedgeIndex !== null) {
      clearWedgeBtn.addEventListener('click', () => {
        const slotIdx = this.currentHour * 12 + this.selectedWedgeIndex;
        window.rmnState.clearSlot(this.currentDayId, slotIdx);
        window.rmnUI.showToast('تم تفريغ الخانة بنجاح', 'info');
        this.render();
      });
    }

    // Copy Hour to All Days
    const copyHourBtn = document.getElementById('copyHourToAllDaysBtn');
    if (copyHourBtn) {
      copyHourBtn.addEventListener('click', () => {
        window.rmnAutofill.copyHourToAllDays(this.currentDayId, this.currentHour);
        this.render();
      });
    }

    // Clear Current Hour
    const clearHourBtn = document.getElementById('clearCurrentHourBtn');
    if (clearHourBtn) {
      clearHourBtn.addEventListener('click', () => {
        if (confirm(`هل أنت متأكد من رغبتك بتفريغ ساعة ${this.currentHour}:00 كاملة؟`)) {
          window.rmnState.setSlotRange(this.currentDayId, this.currentHour * 12, 12, null);
          window.rmnUI.showToast('تم تفريغ الساعة بنجاح', 'info');
          this.render();
        }
      });
    }
  }
}

window.RMNBroadcastClock = RMNBroadcastClock;
