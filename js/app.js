/**
 * Radio Maria Nazareth - Main Application Bootstrap
 * تشغيل وربط مكونات تطبيق راديو مريم الناصرة
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI Controller
  window.rmnUI.init();

  // 1. Navigation View Tabs (Schedule, Library, Analytics)
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      window.rmnUI.switchView(view);
    });
  });

  // 2. Schedule Sub-view Switcher (Weekly vs Daily in the same tab)
  document.getElementById('subViewWeeklyBtn')?.addEventListener('click', () => {
    window.rmnUI.setScheduleSubView('weekly');
  });

  document.getElementById('subViewDailyBtn')?.addEventListener('click', () => {
    window.rmnUI.setScheduleSubView('daily');
  });

  // 3. Time-scale switcher
  document.getElementById('timeZoomSelect')?.addEventListener('change', (e) => {
    window.rmnState.timeZoomMinutes = Number(e.target.value);
    window.rmnUI.renderScheduleContent();
  });

  // 4. Quick Automation Action Buttons
  document.getElementById('applyBlueprintBtn')?.addEventListener('click', () => {
    if (confirm('هل تود استبدال الجدول الحالي بالجدول القياسي لراديو مريم الناصرة (القداس والصلوات الثابتة)؟')) {
      window.rmnAutofill.applyStandardBlueprint();
      window.rmnUI.refreshAll();
    }
  });

  document.getElementById('openTemplatesBtn')?.addEventListener('click', () => {
    window.rmnUI.openTemplatesModal();
  });

  document.getElementById('fillGapsBtn')?.addEventListener('click', () => {
    window.rmnUI.openFillGapsModal();
  });


  // 5. Undo / Redo
  document.getElementById('undoActionBtn')?.addEventListener('click', () => {
    window.rmnUI.handleUndo();
  });

  document.getElementById('redoActionBtn')?.addEventListener('click', () => {
    window.rmnUI.handleRedo();
  });

  // 6. Share / Export / Import / Print
  document.getElementById('shareScheduleBtn')?.addEventListener('click', () => {
    window.rmnUI.openShareModal();
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    window.rmnExport.exportToCSV();
  });

  document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
    window.rmnExport.exportBackupJSON();
  });

  document.getElementById('importBackupBtn')?.addEventListener('click', () => {
    document.getElementById('backupFileInput')?.click();
  });

  document.getElementById('backupFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      window.rmnExport.importBackupJSON(file);
      e.target.value = ''; // reset
    }
  });

  document.getElementById('printScheduleBtn')?.addEventListener('click', () => {
    window.rmnExport.printSchedule();
  });

  // 7. Library Search & Add Program (Search only and +, no category filters)
  document.getElementById('programSearchInput')?.addEventListener('input', (e) => {
    window.rmnState.searchQuery = e.target.value;
    document.getElementById('clearProgramSearchBtn')?.classList.toggle('hidden', !e.target.value);
    window.rmnUI.renderLibraryView();
  });

  document.getElementById('clearProgramSearchBtn')?.addEventListener('click', () => {
    const input = document.getElementById('programSearchInput');
    input.value = '';
    window.rmnState.searchQuery = '';
    document.getElementById('clearProgramSearchBtn')?.classList.add('hidden');
    window.rmnUI.renderLibraryView();
    input.focus();
  });

  document.getElementById('addNewProgramBtn')?.addEventListener('click', () => {
    window.rmnUI.openAddProgramModal();
  });

  // 8. Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Delete, Backspace, Esc) across all keyboard layouts (Arabic, English, etc.)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.rmnUI.closeModal();
      return;
    }

    const isModalOpen = Boolean(document.getElementById('modalContainer')?.children?.length);
    const isTextInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && !document.activeElement?.readOnly;
    if (isModalOpen && isTextInput) {
      return;
    }

    // Delete or Backspace shortcut for instant deletion of hovered or selected block without prompt
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isTextInput && !isModalOpen) {
        const target = window.rmnUI.selectedBlock || window.rmnUI.hoveredBlock;
        if (target) {
          e.preventDefault();
          window.rmnUI.clearSlotRangeConfirm(target.dayId, target.startSlot, target.count);
          window.rmnUI.selectedBlock = null;
          return;
        }
      }
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    // Match 'Z' / Arabic 'ئ' / physical KeyZ
    const isKeyZ = e.code === 'KeyZ' || e.key?.toLowerCase() === 'z' || e.key === 'ئ';
    // Match 'Y' / Arabic 'غ' or 'إ' / physical KeyY
    const isKeyY = e.code === 'KeyY' || e.key?.toLowerCase() === 'y' || e.key === 'غ' || e.key === 'إ';
    // Match 'C' / Arabic 'ؤ' / physical KeyC
    const isKeyC = e.code === 'KeyC' || e.key?.toLowerCase() === 'c' || e.key === 'ؤ';
    // Match 'V' / Arabic 'ر' / physical KeyV
    const isKeyV = e.code === 'KeyV' || e.key?.toLowerCase() === 'v' || e.key === 'ر';

    // Undo: Ctrl+Z (without Shift)
    if (isKeyZ && !e.shiftKey) {
      e.preventDefault();
      window.rmnUI.handleUndo();
      return;
    }

    // Redo: Ctrl+Y OR Ctrl+Shift+Z
    if (isKeyY || (e.shiftKey && isKeyZ)) {
      e.preventDefault();
      window.rmnUI.handleRedo();
      return;
    }

    // Copy: Ctrl+C
    if (isKeyC) {
      if (isTextInput) return;
      const target = window.rmnUI.selectedBlock || window.rmnUI.hoveredBlock;
      if (target) {
        e.preventDefault();
        window.rmnUI.copyBlockToClipboard(target.dayId, target.startSlot);
        return;
      }
    }

    // Paste: Ctrl+V
    if (isKeyV) {
      if (isTextInput) return;
      if (window.rmnUI.clipboardBlock) {
        e.preventDefault();
        window.rmnUI.pasteClipboardBlock();
        return;
      }
    }
  });

  // 9. Sticky Controls Bar dynamic offset positioning
  const updateControlsOffset = () => {
    const header = document.querySelector('header');
    const controls = document.getElementById('scheduleControlsBar');
    if (header && controls) {
      controls.style.top = `${header.offsetHeight}px`;
    }
  };
  window.addEventListener('resize', updateControlsOffset);
  updateControlsOffset();

  // 10. Close modals when clicking outside the dialog card (on backdrop overlay)
  document.getElementById('modalContainer')?.addEventListener('click', (e) => {
    // If click is not inside the dialog card, close modal
    const card = e.target.closest('[data-modal-card], .modal-content');
    if (!card) {
      window.rmnUI.closeModal();
    }
  });

  // 11. Initialize Supabase Realtime Cloud Sync
  if (window.rmnSupabase) {
    window.rmnSupabase.init();
  }
});
