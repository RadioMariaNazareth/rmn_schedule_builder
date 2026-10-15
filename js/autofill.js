/**
 * Radio Maria Nazareth - Smart Autofill & Scheduling Engine
 * محرك البناء الذكي والتعبئة التلقائية لتسهيل جدولة أسبوع كامل
 */

class RMNAutofillEngine {
  constructor() {
    this.templatesStorageKey = 'rmn_saved_templates_v1';
    this.customTemplates = this.loadTemplates();
  }

  // Load saved templates strictly from cloud/storage (no hardcoded defaults)
  loadTemplates() {
    const saved = localStorage.getItem(this.templatesStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(t => t.id !== 'template-standard');
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
    return [];
  }

  saveTemplates() {
    localStorage.setItem(this.templatesStorageKey, JSON.stringify(this.customTemplates));
  }

  // 1. Autofill Radio Maria Standard Blueprint
  applyStandardBlueprint() {
    window.rmnState.pushHistory();
    const cleanSched = window.rmnState.createEmptyWeeklySchedule();
    window.rmnState.schedule = window.rmnState.applyDefaultBlueprint(cleanSched);
    window.rmnState.saveSchedule();
    window.rmnUI.showToast('تم تطبيق الجدول الإذاعي القياسي لراديو مريم بنجاح!', 'success');
  }

  // 2. Clone a full day to target days
  cloneDay(sourceDayId, targetDayIds) {
    if (!window.rmnState.schedule[sourceDayId] || !targetDayIds || targetDayIds.length === 0) return;
    window.rmnState.pushHistory();

    const sourceSlots = window.rmnState.schedule[sourceDayId];
    targetDayIds.forEach(targetDayId => {
      if (targetDayId === sourceDayId) return;
      window.rmnState.schedule[targetDayId] = sourceSlots.map((s, idx) => ({
        slotIndex: idx,
        programId: s.programId,
        note: s.note,
        isLive: Boolean(s.isLive),
        isRepeat: Boolean(s.isRepeat)
      }));
    });

    window.rmnState.saveSchedule();
    const sourceDay = RMN_DAYS.find(d => d.id === sourceDayId)?.nameAr || sourceDayId;
    window.rmnUI.showToast(`تم نسخ جدول يوم (${sourceDay}) إلى ${targetDayIds.length} أيام بنجاح`, 'success');
  }

  // 3. Repeat a program block to multiple days
  repeatBlockToDays(sourceDayId, startSlot, slotCount, programId, targetDayIds) {
    if (!targetDayIds || targetDayIds.length === 0) return;
    window.rmnState.pushHistory();

    targetDayIds.forEach(dayId => {
      if (!window.rmnState.schedule[dayId]) return;
      const end = Math.min(startSlot + slotCount, 288);
      for (let i = startSlot; i < end; i++) {
        window.rmnState.schedule[dayId][i] = {
          slotIndex: i,
          programId: programId,
          note: ''
        };
      }
    });

    window.rmnState.saveSchedule();
    window.rmnUI.showToast('تم تكرار البرنامج بنجاح في الأيام المحددة', 'success');
  }

  // 4. Copy a specific hour (12 slots) to all days
  copyHourToAllDays(sourceDayId, hour) {
    window.rmnState.pushHistory();
    const startSlot = hour * 12;
    const sourceHourSlots = window.rmnState.schedule[sourceDayId].slice(startSlot, startSlot + 12);

    RMN_DAYS.forEach(day => {
      if (day.id === sourceDayId) return;
      for (let i = 0; i < 12; i++) {
        window.rmnState.schedule[day.id][startSlot + i] = {
          slotIndex: startSlot + i,
          programId: sourceHourSlots[i].programId,
          note: sourceHourSlots[i].note
        };
      }
    });

    window.rmnState.saveSchedule();
    window.rmnUI.showToast(`تم نسخ ساعة ${hour}:00 إلى كافة أيام الأسبوع بنجاح`, 'success');
  }

  // 5. Fill empty gaps with a chosen filler program
  fillEmptyGaps(targetScope, fillerProgramId) {
    // targetScope: 'all' or dayId like 'mon'
    window.rmnState.pushHistory();
    let filledCount = 0;

    const daysToCheck = targetScope === 'all' ? RMN_DAYS.map(d => d.id) : [targetScope];

    daysToCheck.forEach(dayId => {
      const daySlots = window.rmnState.schedule[dayId] || [];
      daySlots.forEach(slot => {
        if (!slot.programId) {
          slot.programId = fillerProgramId;
          filledCount++;
        }
      });
    });

    window.rmnState.saveSchedule();
    const prog = window.rmnState.getProgram(fillerProgramId);
    window.rmnUI.showToast(`تم ملء ${filledCount} خانة فارغة ببرنامج "${prog ? prog.title : ''}" بنجاح`, 'success');
  }

  // 6. Save current week as a new named template
  saveWeekAsTemplate(templateName, description) {
    const newTemplate = {
      id: 'template-' + Date.now(),
      name: templateName.trim(),
      description: description?.trim() || 'جدول إذاعي محفوظ',
      created: new Date().toISOString().split('T')[0],
      scheduleData: JSON.parse(JSON.stringify(window.rmnState.schedule))
    };

    this.customTemplates.push(newTemplate);
    this.saveTemplates();
    window.rmnState.setActiveScheduleName(newTemplate.name);
    if (window.rmnSupabase) {
      window.rmnSupabase.pushScheduleState(true);
    }
    window.rmnUI.showToast(`تم حفظ الجدول "${templateName}" بنجاح في قاعدة البيانات`, 'success');
    return newTemplate;
  }

  duplicateTemplate(templateId, templateName) {
    const source = this.customTemplates.find(template => template.id === templateId);
    if (!source?.scheduleData) return false;
    this.customTemplates.push({
      ...JSON.parse(JSON.stringify(source)),
      id: 'template-' + Date.now(),
      name: templateName.trim(),
      created: new Date().toISOString().split('T')[0]
    });
    this.saveTemplates();
    if (window.rmnSupabase) {
      window.rmnSupabase.pushScheduleState(true);
    }
    return true;
  }

  // 7. Load a template into current schedule
  loadTemplate(templateId) {
    const tpl = this.customTemplates.find(t => t.id === templateId);
    if (!tpl || !tpl.scheduleData) {
      window.rmnUI.showToast('لم يتم العثور على بيانات هذا الجدول في قاعدة البيانات', 'error');
      return false;
    }

    window.rmnState.pushHistory();
    window.rmnState.schedule = JSON.parse(JSON.stringify(tpl.scheduleData));
    window.rmnState.setActiveScheduleName(tpl.name);
    window.rmnState.saveSchedule();
    window.rmnUI.showToast(`تم تحميل الجدول "${tpl.name}" وتطبيقه بنجاح`, 'success');
    return true;
  }

  // 8. Delete a template
  deleteTemplate(templateId) {
    this.customTemplates = this.customTemplates.filter(t => t.id !== templateId);
    this.saveTemplates();
    if (window.rmnSupabase) {
      window.rmnSupabase.pushScheduleState(true);
    }
    window.rmnUI.showToast('تم حذف الجدول من قاعدة البيانات', 'info');
  }
}

window.rmnAutofill = new RMNAutofillEngine();
