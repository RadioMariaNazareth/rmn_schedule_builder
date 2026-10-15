/**
 * Radio Maria Nazareth - Schedule Builder State Management
 * إدارة الحالة والبيانات لجدول راديو مريم الناصرة
 */

class RMNStateManager {
  constructor() {
    this.totalSlotsPerDay = 288; // 24 hours * 12 (5-min intervals)
    this.slotMinutes = 5;

    // Load or initialize programs (with duplicate color prevention)
    this.programs = this.loadPrograms();
    this.categories = this.loadCategories();
    this.customCategories = this.categories;
    this.presenters = this.loadPresenters();

    // Load or initialize schedule
    this.schedule = this.loadSchedule();

    // UI state
    this.currentView = 'schedule'; // 'schedule' | 'library' | 'analytics'
    this.selectedDay = 'mon';
    this.selectedHour = 8;
    this.weeklyDensity = 'detailed';
    this.timeZoomMinutes = 15;
    this.activeScheduleName = localStorage.getItem('rmn_active_schedule_name') || 'الجدول الحالي';
    this.searchQuery = '';
    this.filterCategory = 'all';

    // Undo / Redo history
    this.historyStack = [];
    this.redoStack = [];
    this.maxHistory = 30;
  }

  // Convert slot index (0 - 287) to "HH:MM"
  slotToTime(slotIndex) {
    const totalMinutes = slotIndex * this.slotMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  loadPresenters() {
    try {
      const saved = JSON.parse(localStorage.getItem('rmn_presenters') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        return saved.filter(name => name && name !== 'Radio Maria Rome');
      }
      return [];
    } catch {
      return [];
    }
  }

  getPresenters() {
    return this.presenters;
  }

  async addPresenter(name) {
    const cleanedName = String(name || '').trim();
    if (!cleanedName) return null;
    if (!this.presenters.includes(cleanedName)) {
      this.presenters.push(cleanedName);
      localStorage.setItem('rmn_presenters', JSON.stringify(this.presenters));
    }
    if (window.rmnSupabase) {
      await window.rmnSupabase.addPresenter(cleanedName);
    }
    return cleanedName;
  }

  // Convert "HH:MM" to slot index (supports minutes 00-60 and snaps to 5-minute slots)
  timeToSlot(timeStr) {
    const match = /^(\d{1,2}):(\d{1,2})$/.exec(String(timeStr || '').trim());
    if (!match) return null;
    let h = Number(match[1]);
    let m = Number(match[2]);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 60) {
      return null;
    }
    if (m === 60) {
      h += 1;
      m = 0;
    } else {
      m = Math.round(m / this.slotMinutes) * this.slotMinutes;
      if (m === 60) {
        h += 1;
        m = 0;
      }
    }
    if (h >= 24) {
      h = 23;
      m = 55;
    }
    return (h * 60 + m) / this.slotMinutes;
  }

  // Format time range from slot index and duration in slots
  formatTimeRange(startSlot, slotCount = 1) {
    const startStr = this.slotToTime(startSlot);
    const endMinutes = (startSlot + slotCount) * this.slotMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endStr = endHours >= 24 ? '24:00' : `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    const durationMin = slotCount * this.slotMinutes;
    return {
      startStr,
      endStr,
      label: `${startStr} - ${endStr}`,
      durationMin,
      durationLabel: durationMin >= 60 ? (durationMin % 60 === 0 ? `${durationMin / 60} س` : `${Math.floor(durationMin / 60)}س و ${durationMin % 60}د`) : `${durationMin} د`
    };
  }

  // Initialize empty weekly schedule (288 slots per day)
  createEmptyWeeklySchedule() {
    const schedule = {};
    RMN_DAYS.forEach(day => {
      schedule[day.id] = new Array(this.totalSlotsPerDay).fill(null).map((_, idx) => ({
        slotIndex: idx,
        programId: null,
        note: ''
      }));
    });
    return schedule;
  }

  // Accept only complete, well-formed schedules from browser storage or backups.
  normalizeSchedule(scheduleObj) {
    if (!scheduleObj || typeof scheduleObj !== 'object') return null;
    const normalized = {};
    for (const day of RMN_DAYS) {
      const slots = scheduleObj[day.id];
      if (!Array.isArray(slots) || slots.length !== this.totalSlotsPerDay) return null;
      normalized[day.id] = slots.map((slot, slotIndex) => ({
        slotIndex,
        programId: typeof slot?.programId === 'string' ? slot.programId : null,
        note: typeof slot?.note === 'string' ? slot.note : '',
        isLive: Boolean(slot?.isLive),
        isRepeat: Boolean(slot?.isRepeat)
      }));
    }
    return normalized;
  }

  // Apply default blueprint template to schedule
  applyDefaultBlueprint(scheduleObj) {
    DEFAULT_WEEKLY_BLUEPRINT.forEach(rule => {
      const startSlot = this.timeToSlot(rule.start);
      const endSlot = rule.end === '24:00' ? 288 : this.timeToSlot(rule.end);

      if (startSlot === null || endSlot === null || endSlot <= startSlot) return;

      rule.days.forEach(dayId => {
        if (!scheduleObj[dayId]) return;
        for (let i = startSlot; i < endSlot && i < 288; i++) {
          scheduleObj[dayId][i] = {
            slotIndex: i,
            programId: rule.programId,
            note: '',
            isLive: false,
            isRepeat: false
          };
        }
      });
    });
    return scheduleObj;
  }

  // Ensure every program has a distinct color from the 50 palette colors
  ensureUniqueColors(programsList) {
    const usedColors = new Set();
    const colorsPool = typeof RMN_50_COLORS !== 'undefined' ? [...RMN_50_COLORS] : [];

    return programsList.map(prog => {
      let color = (prog.color || '').toLowerCase();
      if (!color || usedColors.has(color) || !colorsPool.includes(color)) {
        // Find next unused color from pool
        const nextAvail = colorsPool.find(c => !usedColors.has(c.toLowerCase()));
        color = nextAvail ? nextAvail.toLowerCase() : color;
      }
      usedColors.add(color);
      return {
        ...prog,
        color
      };
    });
  }

  loadPrograms() {
    const versionKey = 'rmn_program_library_version';
    if (localStorage.getItem(versionKey) !== String(RMN_PROGRAM_LIBRARY_VERSION)) {
      const programs = this.ensureUniqueColors(JSON.parse(JSON.stringify(DEFAULT_PROGRAMS)));
      localStorage.setItem(versionKey, String(RMN_PROGRAM_LIBRARY_VERSION));
      localStorage.setItem('rmn_programs_v1', JSON.stringify(programs));
      return programs;
    }
    const saved = localStorage.getItem('rmn_programs_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.ensureUniqueColors(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved programs:', e);
      }
    }
    return this.ensureUniqueColors(JSON.parse(JSON.stringify(DEFAULT_PROGRAMS)));
  }

  savePrograms() {
    localStorage.setItem('rmn_programs_v1', JSON.stringify(this.programs));
    if (window.rmnSupabase) {
      window.rmnSupabase.triggerSync();
    }
  }

  loadCategories() {
    try {
      const saved = JSON.parse(localStorage.getItem('rmn_categories_v2') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        return saved;
      }
      return JSON.parse(JSON.stringify(RMN_CATEGORIES));
    } catch {
      return JSON.parse(JSON.stringify(RMN_CATEGORIES));
    }
  }

  loadCustomCategories() {
    return this.loadCategories();
  }

  getAllCategories() {
    return this.categories || RMN_CATEGORIES;
  }

  getCategory(id) {
    if (!id) return this.getAllCategories()[0] || null;
    return this.getAllCategories().find(c => c.id === id || c.alias === id || c.name === id) || {
      id: id,
      name: id,
      color: '#1d4ed8',
      bgLight: '#eff6ff',
      border: '#93c5fd'
    };
  }

  async addCategory(name, color = '#1d4ed8') {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const existing = this.getAllCategories().find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const id = `cat-${Date.now().toString().slice(-6)}`;
    const newCat = {
      id,
      name: trimmed,
      color: color || '#1d4ed8',
      bgLight: '#eff6ff',
      border: '#93c5fd'
    };
    this.categories.push(newCat);
    this.customCategories = this.categories;
    localStorage.setItem('rmn_categories_v2', JSON.stringify(this.categories));
    if (window.rmnSupabase) {
      await window.rmnSupabase.addCategory(newCat);
    }
    return newCat;
  }

  addCustomCategory(name) {
    return this.addCategory(name);
  }

  async updateCategory(id, updatedData) {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.categories[idx] = {
      ...this.categories[idx],
      name: updatedData.name ? updatedData.name.trim() : this.categories[idx].name,
      color: updatedData.color || this.categories[idx].color
    };
    this.customCategories = this.categories;
    localStorage.setItem('rmn_categories_v2', JSON.stringify(this.categories));
    if (window.rmnSupabase) {
      await window.rmnSupabase.updateCategory(id, this.categories[idx]);
    }
    return true;
  }

  async deleteCategory(id) {
    if (this.categories.length <= 1) return false;
    this.categories = this.categories.filter(c => c.id !== id);
    this.customCategories = this.categories;
    localStorage.setItem('rmn_categories_v2', JSON.stringify(this.categories));
    const fallbackCatId = this.categories[0].id;
    this.programs.forEach(p => {
      if (p.categoryId === id) {
        p.categoryId = fallbackCatId;
      }
    });
    this.savePrograms();
    if (window.rmnSupabase) {
      await window.rmnSupabase.deleteCategory(id);
    }
    return true;
  }

  async updatePresenter(oldName, newName) {
    const cleanOld = String(oldName || '').trim();
    const cleanNew = String(newName || '').trim();
    if (!cleanOld || !cleanNew || cleanOld === cleanNew) return false;

    const idx = this.presenters.findIndex(name => name.toLowerCase() === cleanOld.toLowerCase());
    if (idx !== -1) {
      this.presenters[idx] = cleanNew;
    } else {
      this.presenters.push(cleanNew);
    }
    localStorage.setItem('rmn_presenters', JSON.stringify(this.presenters));

    let programsUpdated = false;
    this.programs.forEach(prog => {
      if (prog.presenter && prog.presenter.toLowerCase() === cleanOld.toLowerCase()) {
        prog.presenter = cleanNew;
        programsUpdated = true;
      }
    });
    if (programsUpdated) {
      this.savePrograms();
    }

    if (window.rmnSupabase) {
      await window.rmnSupabase.updatePresenter(cleanOld, cleanNew);
    }
    return true;
  }

  async deletePresenter(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return false;
    this.presenters = this.presenters.filter(p => p.toLowerCase() !== cleanName.toLowerCase());
    localStorage.setItem('rmn_presenters', JSON.stringify(this.presenters));

    if (window.rmnSupabase) {
      await window.rmnSupabase.deletePresenter(cleanName);
    }
    return true;
  }

  // Color helper methods
  isColorUsed(color, excludeProgramId = null) {
    const target = (color || '').toLowerCase();
    return this.programs.some(p => p.id !== excludeProgramId && (p.color || '').toLowerCase() === target);
  }

  getAvailableColor(excludeProgramId = null) {
    const pool = typeof RMN_50_COLORS !== 'undefined' ? RMN_50_COLORS : [];
    for (const c of pool) {
      if (!this.isColorUsed(c, excludeProgramId)) {
        return c;
      }
    }
    return pool[0] || '#1d4ed8';
  }

  getUsedColorsMap() {
    const map = {};
    this.programs.forEach(p => {
      if (p.color) {
        map[p.color.toLowerCase()] = p;
      }
    });
    return map;
  }

  loadSchedule() {
    const saved = localStorage.getItem('rmn_schedule_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = this.normalizeSchedule(parsed);
        if (normalized) {
          const validProgramIds = new Set(this.programs.map(program => program.id));
          RMN_DAYS.forEach(day => normalized[day.id].forEach(slot => {
            if (slot.programId && !validProgramIds.has(slot.programId)) {
              slot.programId = null;
              slot.note = '';
              slot.isLive = false;
              slot.isRepeat = false;
            }
          }));
          return normalized;
        }
      } catch (e) {
        console.error('Failed to parse saved schedule:', e);
      }
    }

    const emptySched = this.createEmptyWeeklySchedule();
    return this.applyDefaultBlueprint(emptySched);
  }

  saveSchedule() {
    localStorage.setItem('rmn_schedule_v1', JSON.stringify(this.schedule));
    if (window.rmnSupabase) {
      window.rmnSupabase.triggerSync();
    }
  }

  setActiveScheduleName(name) {
    this.activeScheduleName = (name || 'الجدول الحالي').slice(0, 100);
    localStorage.setItem('rmn_active_schedule_name', this.activeScheduleName);
    const badge = document.getElementById('activeScheduleName');
    if (badge) {
      badge.textContent = this.activeScheduleName;
      badge.title = `اسم الجدول النشط: ${this.activeScheduleName}`;
    }
    const printBadge = document.getElementById('printScheduleName');
    if (printBadge) {
      printBadge.textContent = this.activeScheduleName;
    }
  }

  // Apply state received from Supabase cloud
  applyRemoteState(remoteData) {
    if (!remoteData || typeof remoteData !== 'object') return false;

    let changed = false;

    // 1. Programs
    if (Array.isArray(remoteData.programs) && remoteData.programs.length > 0) {
      this.programs = this.ensureUniqueColors(remoteData.programs);
      localStorage.setItem('rmn_programs_v1', JSON.stringify(this.programs));
      changed = true;
    }

    // 2. Presenters
    if (Array.isArray(remoteData.presenters) && remoteData.presenters.length > 0) {
      this.presenters = [...new Set([...this.presenters, ...remoteData.presenters])];
      localStorage.setItem('rmn_presenters', JSON.stringify(this.presenters));
    }

    // 3. Custom Categories
    if (Array.isArray(remoteData.categories)) {
      this.customCategories = remoteData.categories;
      localStorage.setItem('rmn_custom_categories_v1', JSON.stringify(this.customCategories));
    }

    // 4. Templates (read strictly from database - zero default templates)
    if (Array.isArray(remoteData.templates) && window.rmnAutofill) {
      const cleanTemplates = remoteData.templates.filter(t => t.id !== 'template-standard');
      window.rmnAutofill.customTemplates = cleanTemplates;
      localStorage.setItem('rmn_saved_templates_v1', JSON.stringify(cleanTemplates));
    }

    // 5. Active Schedule Name
    if (remoteData.active_schedule_name) {
      this.setActiveScheduleName(remoteData.active_schedule_name);
    }

    // 6. Weekly Schedule Slots
    if (remoteData.schedule) {
      const normalized = this.normalizeSchedule(remoteData.schedule);
      if (normalized) {
        this.schedule = normalized;
        localStorage.setItem('rmn_schedule_v1', JSON.stringify(this.schedule));
        changed = true;
      }
    }

    if (changed && window.rmnUI) {
      window.rmnUI.refreshAll();
    }
    return true;
  }

  // Snapshot for Undo / Redo
  pushHistory() {
    this.historyStack.push(JSON.stringify(this.schedule));
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    }
    this.redoStack = []; // Reset redo on new action
  }

  undo() {
    if (this.historyStack.length === 0) return false;
    this.redoStack.push(JSON.stringify(this.schedule));
    const previous = this.historyStack.pop();
    this.schedule = JSON.parse(previous);
    this.saveSchedule();
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this.historyStack.push(JSON.stringify(this.schedule));
    const next = this.redoStack.pop();
    this.schedule = JSON.parse(next);
    this.saveSchedule();
    return true;
  }

  // Program Helper Methods
  getProgram(id) {
    if (!id) return null;
    return this.programs.find(p => p.id === id) || null;
  }

  getCategory(id) {
    return this.getAllCategories().find(c => c.id === id) || {
      id: 'other',
      name: 'أخرى',
      color: '#64748b',
      bgLight: '#f1f5f9',
      border: '#cbd5e1'
    };
  }

  addProgram(programData) {
    if (this.programs.length >= RMN_50_COLORS.length) return null;
    // Determine distinct color
    let progColor = programData.color;
    if (!progColor || this.isColorUsed(progColor)) {
      progColor = this.getAvailableColor();
    }

    const newProg = {
      id: 'prog-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: programData.title.trim(),
      categoryId: programData.categoryId || 'spiritual',
      defaultDuration: this.normalizeDuration(programData.defaultDuration),
      presenter: programData.presenter?.trim() || 'فريق الإذاعة',
      color: progColor,
      description: programData.description?.trim() || '',
      fixed: !!programData.fixed
    };
    this.programs.push(newProg);
    this.savePrograms();
    if (window.rmnSupabase) {
      window.rmnSupabase.upsertProgram(newProg);
    }
    return newProg;
  }

  updateProgram(id, programData) {
    const idx = this.programs.findIndex(p => p.id === id);
    if (idx === -1) return false;

    let progColor = programData.color || this.programs[idx].color;
    // Check if color is used by another program
    if (this.isColorUsed(progColor, id)) {
      progColor = this.getAvailableColor(id);
    }

    this.programs[idx] = {
      ...this.programs[idx],
      ...programData,
      defaultDuration: this.normalizeDuration(programData.defaultDuration ?? this.programs[idx].defaultDuration),
      color: progColor,
      id
    };
    this.savePrograms();
    if (window.rmnSupabase) {
      window.rmnSupabase.upsertProgram(this.programs[idx]);
    }
    return true;
  }

  normalizeDuration(value) {
    const duration = Number.parseInt(value, 10);
    const safeDuration = Number.isFinite(duration) ? duration : 30;
    return Math.min(360, Math.max(this.slotMinutes, Math.round(safeDuration / this.slotMinutes) * this.slotMinutes));
  }

  deleteProgram(id) {
    this.pushHistory();
    this.programs = this.programs.filter(p => p.id !== id);
    this.savePrograms();
    if (window.rmnSupabase) {
      window.rmnSupabase.deleteProgram(id);
    }

    // Clear removed program from schedule
    RMN_DAYS.forEach(day => {
      this.schedule[day.id].forEach(slot => {
        if (slot.programId === id) {
          slot.programId = null;
        }
      });
    });
    this.saveSchedule();
    return true;
  }

  // Schedule Modification Operations
  setSlot(dayId, slotIndex, programId, note = '') {
    if (!this.schedule[dayId] || slotIndex < 0 || slotIndex >= this.totalSlotsPerDay) return;
    this.pushHistory();
    this.schedule[dayId][slotIndex] = {
      slotIndex,
      programId,
      note
    };
    this.saveSchedule();
  }

  // Assign program to a range of slots (starting at startSlot, for slotCount)
  setSlotRange(dayId, startSlot, slotCount, programId, note = '', isLive = false, isRepeat = false) {
    if (!this.schedule[dayId] || !Number.isInteger(startSlot) || startSlot < 0 || startSlot >= this.totalSlotsPerDay) return false;
    const safeCount = Math.max(1, Math.floor(Number(slotCount) || 1));
    this.pushHistory();
    const end = Math.min(startSlot + safeCount, this.totalSlotsPerDay);
    for (let i = startSlot; i < end; i++) {
      this.schedule[dayId][i] = {
        slotIndex: i,
        programId,
          note,
          isLive: Boolean(isLive),
          isRepeat: Boolean(isRepeat)
      };
    }
    this.saveSchedule();
    return true;
  }

  // Assign the same range to several days as one undoable operation.
  setSlotRangeForDays(dayIds, startSlot, slotCount, programId, note = '', isLive = false, isRepeat = false) {
    const validDays = [...new Set(dayIds || [])].filter(dayId => this.schedule[dayId]);
    if (validDays.length === 0 || !Number.isInteger(startSlot) || startSlot < 0 || startSlot >= this.totalSlotsPerDay) return false;

    const safeCount = Math.max(1, Math.floor(Number(slotCount) || 1));
    const end = Math.min(startSlot + safeCount, this.totalSlotsPerDay);
    this.pushHistory();
    validDays.forEach(dayId => {
      for (let i = startSlot; i < end; i++) {
        this.schedule[dayId][i] = { slotIndex: i, programId, note, isLive: Boolean(isLive), isRepeat: Boolean(isRepeat) };
      }
    });
    this.saveSchedule();
    return true;
  }

  // Insert program at arbitrary time (e.g., "13:05") with duration in minutes
  insertProgramAtTime(dayId, timeStr, programId, durationMin = 30) {
    const startSlot = this.timeToSlot(timeStr);
    if (startSlot === null) return false;
    const slotCount = Math.max(1, Math.round(durationMin / this.slotMinutes));
    return this.setSlotRange(dayId, startSlot, slotCount, programId);
  }

  // Clear single slot
  clearSlot(dayId, slotIndex) {
    this.setSlot(dayId, slotIndex, null, '');
  }

  clearBlock(dayId, startSlot) {
    const block = this.getDayBlocks(dayId).find(item => item.startSlot === startSlot);
    if (!block) return false;
    return this.setSlotRange(dayId, startSlot, block.count, null);
  }

  // Clear whole day
  clearDay(dayId) {
    if (!this.schedule[dayId]) return;
    this.pushHistory();
    for (let i = 0; i < this.totalSlotsPerDay; i++) {
      this.schedule[dayId][i] = {
        slotIndex: i,
        programId: null,
        note: ''
      };
    }
    this.saveSchedule();
  }

  // Clear whole week
  clearWeek() {
    this.pushHistory();
    this.schedule = this.createEmptyWeeklySchedule();
    this.saveSchedule();
  }

  // Group continuous slots into Program Blocks (for fast, intuitive display)
  getDayBlocks(dayId) {
    const slots = this.schedule[dayId] || [];
    const blocks = [];
    let currentBlock = null;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!currentBlock) {
        currentBlock = {
          startSlot: i,
          count: 1,
          programId: slot.programId,
          note: slot.note,
          isLive: Boolean(slot.isLive),
          isRepeat: Boolean(slot.isRepeat)
        };
      } else if (currentBlock.programId === slot.programId && currentBlock.note === slot.note && currentBlock.isLive === Boolean(slot.isLive) && currentBlock.isRepeat === Boolean(slot.isRepeat)) {
        currentBlock.count++;
      } else {
        blocks.push(currentBlock);
        currentBlock = {
          startSlot: i,
          count: 1,
          programId: slot.programId,
          note: slot.note,
          isLive: Boolean(slot.isLive),
          isRepeat: Boolean(slot.isRepeat)
        };
      }
    }
    if (currentBlock) {
      blocks.push(currentBlock);
    }
    return blocks;
  }

  // Get current On-Air program based on current time
  getCurrentOnAir() {
    const now = new Date();
    const jsDayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayId = jsDayMap[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSlot = Math.floor(currentMinutes / this.slotMinutes);

    const daySlots = this.schedule[currentDayId] || [];
    const activeSlot = daySlots[currentSlot] || null;
    const nextSlot = daySlots[currentSlot + 1] || null;

    const currentProgram = activeSlot && activeSlot.programId ? this.getProgram(activeSlot.programId) : null;
    const nextProgram = nextSlot && nextSlot.programId ? this.getProgram(nextSlot.programId) : null;

    const secondsInSlot = (now.getMinutes() % 5) * 60 + now.getSeconds();
    const remainingSeconds = 300 - secondsInSlot;

    return {
      currentDayId,
      currentSlot,
      currentTimeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      program: currentProgram,
      nextProgram,
      remainingSeconds,
      percentComplete: Math.round((secondsInSlot / 300) * 100)
    };
  }

  // Calculate weekly statistics
  getStatistics() {
    let totalSlots = 7 * this.totalSlotsPerDay;
    let filledSlots = 0;
    let emptySlots = 0;
    const categoryCounts = {};
    const programOccurrences = {};

    RMN_CATEGORIES.forEach(c => {
      categoryCounts[c.id] = 0;
    });

    RMN_DAYS.forEach(day => {
      (this.schedule[day.id] || []).forEach(slot => {
        if (slot.programId) {
          filledSlots++;
          const prog = this.getProgram(slot.programId);
          if (prog) {
            categoryCounts[prog.categoryId] = (categoryCounts[prog.categoryId] || 0) + 1;
            programOccurrences[prog.id] = (programOccurrences[prog.id] || 0) + 1;
          }
        } else {
          emptySlots++;
        }
      });
    });

    const categoryStats = RMN_CATEGORIES.map(cat => {
      const slots = categoryCounts[cat.id] || 0;
      const hours = (slots * 5) / 60;
      const percentage = totalSlots > 0 ? Math.round((slots / totalSlots) * 100) : 0;
      return {
        ...cat,
        slots,
        hours: hours.toFixed(1),
        percentage
      };
    });

    return {
      totalSlots,
      filledSlots,
      emptySlots,
      fillPercentage: Math.round((filledSlots / totalSlots) * 100),
      categoryStats,
      programOccurrences
    };
  }
}

// Export singleton instance for app use
window.rmnState = new RMNStateManager();
