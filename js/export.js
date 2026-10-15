/**
 * Radio Maria Nazareth - Export, Print, and Backup Manager
 * تصدير جدول البث، الطباعة للاستوديو، وحفظ النسخ الاحتياطية
 */

class RMNExportManager {
  // 1. Export as formatted Excel (.xls) file with RTL Arabic support
  exportToExcel() {
    let rowsHtml = '';
    RMN_DAYS.forEach(day => {
      const blocks = window.rmnState.getDayBlocks(day.id);
      blocks.forEach(block => {
        const time = window.rmnState.formatTimeRange(block.startSlot, block.count);
        const prog = block.programId ? window.rmnState.getProgram(block.programId) : null;
        const cat = prog ? window.rmnState.getCategory(prog.categoryId) : null;
        rowsHtml += `
          <tr>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">${day.nameAr}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;">${time.startStr}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;">${time.endStr}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;">${time.durationMin}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;color:#1e3a8a;">${prog ? prog.title : 'فترة شاغرة'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;">${cat ? cat.name : '-'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;">${prog ? (prog.presenter || '-') : '-'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;color:#64748b;">${block.note || ''}</td>
          </tr>
        `;
      });
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>جدول البث الإذاعي</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { direction: rtl; font-family: Segoe UI, Tahoma, Arial, sans-serif; border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: #ffffff; border: 1px solid #94a3b8; padding: 10px; font-size: 11pt; text-align: center; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; color: #1e3a8a; padding: 12px; }
          .sub { text-align: center; color: #64748b; font-size: 10pt; padding-bottom: 10px; }
        </style>
      </head>
      <body dir="rtl">
        <table>
          <tr><td colspan="8" class="title">جدول البث الأسبوعي - راديو مريم الناصرة</td></tr>
          <tr><td colspan="8" class="sub">تاريخ التصدير: ${new Date().toLocaleDateString('ar-IL')} | المحطة: راديو مريم</td></tr>
          <thead>
            <tr>
              <th>اليوم</th>
              <th>وقت البدء</th>
              <th>وقت الانتهاء</th>
              <th>المدة (دقيقة)</th>
              <th>اسم البرنامج</th>
              <th>التصنيف</th>
              <th>المقدّم</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `جدول_بث_راديو_مريم_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.rmnUI.showToast('تم تصدير ملف الإكسل المنسّق (Excel) بنجاح!', 'success');
  }

  // 2. Export as PDF (Run-sheet optimized for print & save as PDF)
  exportToPDF() {
    window.rmnUI.showToast('جارٍ تجهيز جدول البث للطباعة أو الحفظ كملف PDF...', 'info');
    this.printSchedule();
  }

  // 3. Export as Excel CSV with UTF-8 BOM for proper Arabic support
  exportToCSV() {
    const rows = [];
    // Header
    rows.push(['اليوم', 'وقت البدء', 'وقت الانتهاء', 'المدة (دقيقة)', 'اسم البرنامج', 'التصنيف', 'المقدّم', 'ملاحظات'].join(','));

    RMN_DAYS.forEach(day => {
      const blocks = window.rmnState.getDayBlocks(day.id);
      blocks.forEach(block => {
        const time = window.rmnState.formatTimeRange(block.startSlot, block.count);
        const prog = block.programId ? window.rmnState.getProgram(block.programId) : null;
        const cat = prog ? window.rmnState.getCategory(prog.categoryId) : null;

        const row = [
          `"${day.nameAr}"`,
          `"${time.startStr}"`,
          `"${time.endStr}"`,
          `"${time.durationMin}"`,
          `"${prog ? prog.title.replace(/"/g, '""') : 'فترة فارغة'}"`,
          `"${cat ? cat.name : '-'}"`,
          `"${prog ? (prog.presenter || '').replace(/"/g, '""') : '-'}"`,
          `"${(block.note || '').replace(/"/g, '""')}"`
        ];
        rows.push(row.join(','));
      });
    });

    const csvContent = '\uFEFF' + rows.join('\r\n'); // \uFEFF is UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `جدول_بث_راديو_مريم_الناصرة_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.rmnUI.showToast('تم تصدير ملف الإكسل (CSV) بنجاح!', 'success');
  }

  // 2. Export full JSON backup
  exportBackupJSON() {
    const backupData = {
      app: 'Radio Maria Nazareth Scheduler',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schedule: window.rmnState.schedule,
      programs: window.rmnState.programs,
      templates: window.rmnAutofill.customTemplates
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rmn_scheduler_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.rmnUI.showToast('تم حفظ ملف النسخة الاحتياطية بنجاح!', 'success');
  }

  // 3. Import JSON backup
  importBackupJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.schedule || !Array.isArray(data.programs)) {
          throw new Error('صيغة الملف غير متوافقة');
        }

        const schedule = window.rmnState.normalizeSchedule(data.schedule);
        if (!schedule) throw new Error('جدول النسخة الاحتياطية غير صالح');

        window.rmnState.pushHistory();
        window.rmnState.programs = window.rmnState.ensureUniqueColors(data.programs.filter(program => (
          program && typeof program.id === 'string' && typeof program.title === 'string'
        )).slice(0, RMN_50_COLORS.length));
        window.rmnState.schedule = schedule;
        window.rmnState.savePrograms();
        window.rmnState.saveSchedule();

        if (data.templates) {
          window.rmnAutofill.customTemplates = data.templates;
          window.rmnAutofill.saveTemplates();
        }

        window.rmnUI.showToast('تم استعادة البيانات والجدول بنجاح!', 'success');
        window.rmnUI.refreshAll();
      } catch (err) {
        console.error('Import error:', err);
        window.rmnUI.showToast('فشل استيراد الملف: تأكد من صحة ملف النسخة الاحتياطية', 'error');
      }
    };
    reader.readAsText(file);
  }

  // 4. Trigger print run-sheet
  printSchedule() {
    // Close modal if open
    if (window.rmnUI && typeof window.rmnUI.closeModal === 'function') {
      window.rmnUI.closeModal();
    }

    // Switch to schedule view to ensure the calendar table is mounted in DOM
    if (window.rmnUI && window.rmnState.currentView !== 'schedule') {
      window.rmnUI.switchView('schedule');
    }

    // Ensure print metadata is up to date
    const activeName = (window.rmnState && window.rmnState.activeScheduleName) || 'الجدول الحالي';
    const printScheduleNameEl = document.getElementById('printScheduleName');
    if (printScheduleNameEl) {
      printScheduleNameEl.textContent = activeName;
    }
    const printDateEl = document.getElementById('printDate');
    if (printDateEl) {
      printDateEl.textContent = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    // Wait a brief tick for any DOM rendering updates then trigger browser print
    setTimeout(() => {
      window.print();
    }, 250);
  }
}

window.rmnExport = new RMNExportManager();
