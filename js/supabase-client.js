/**
 * Radio Maria Nazareth - Supabase Cloud Synchronization Manager
 * إدارة المزامنة السحابية لقاعدة بيانات راديو مريم الناصرة (Supabase)
 * مزامنة حية للجداول: البرامج (programs)، المذيعين (presenters)، وجدول البث (rmn_schedule_state)
 */

class RMNSupabaseManager {
  constructor() {
    this.projectId = 'wvfgmsvqiqwqxecuvend';
    this.url = `https://${this.projectId}.supabase.co`;
    // Public anon key provided for direct connection
    this.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Zmdtc3ZxaXF3cXhlY3V2ZW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTY4NjcsImV4cCI6MjEwNzAzMjg2N30.WeatU5pNQxScpO3XYZkyOGqynkqf6Hi-bhu9RJUZ5YM';

    this.scheduleTableName = 'rmn_schedule_state';
    this.programsTableName = 'programs';
    this.presentersTableName = 'presenters';
    this.categoriesTableName = 'categories';
    this.rowId = 'active_schedule';

    this.client = null;
    this.realtimeChannel = null;
    this.status = 'disconnected'; // 'connected' | 'syncing' | 'error' | 'disconnected'
    this.syncDebounceTimer = null;
    this.isApplyingRemoteChange = false;
    this.clientSessionId = 'client_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    this.isPushing = false;
    this.hasPendingPush = false;
  }

  init() {
    if (!window.supabase) {
      console.warn('Supabase SDK not loaded yet.');
      this.status = 'error';
      this.updateBadgeUI();
      return;
    }

    try {
      this.client = window.supabase.createClient(this.url, this.anonKey, {
        auth: { persistSession: false }
      });

      this.status = 'syncing';
      this.updateBadgeUI();

      // Fetch all tables from cloud: Presenters -> Categories -> Programs -> Schedule
      this.syncAll(true).then(success => {
        if (success) {
          this.status = 'connected';
          this.subscribeToRealtime();
        } else {
          this.status = 'error';
        }
        this.updateBadgeUI();
      });
    } catch (err) {
      console.error('Supabase init error:', err);
      this.status = 'error';
      this.updateBadgeUI();
    }
  }

  // Master sync: pulls presenters, categories, programs, and schedule
  async syncAll(isInitial = false) {
    if (!this.client) return false;
    try {
      // 1. Fetch or seed Presenters
      await this.syncPresenters();

      // 2. Fetch or seed Categories
      await this.syncCategories();

      // 3. Fetch or seed Programs
      await this.syncPrograms();

      // 4. Fetch or seed Schedule State
      await this.syncScheduleState(isInitial);

      return true;
    } catch (err) {
      console.error('Error during Supabase syncAll:', err);
      return false;
    }
  }

  // =========================================================================
  // PRESENTERS TABLE SYNC
  // =========================================================================
  async syncPresenters() {
    if (!this.client) return;
    try {
      const { data, error } = await this.client
        .from(this.presentersTableName)
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.warn('Could not query presenters table:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Load strictly from Supabase database
        const cloudObjects = data
          .filter(item => item && item.name && item.name !== 'Radio Maria Rome')
          .map(item => ({
            id: String(item.id || '').trim(),
            name: String(item.name || '').trim()
          }));

        window.rmnState.presenterObjects = cloudObjects;
        localStorage.setItem('rmn_presenter_objects', JSON.stringify(cloudObjects));

        const cloudNames = cloudObjects.map(item => item.name);
        window.rmnState.presenters = cloudNames;
        localStorage.setItem('rmn_presenters', JSON.stringify(cloudNames));
      }
    } catch (e) {
      console.warn('syncPresenters error:', e);
    }
  }

  // Calculate next sequential presenter ID matching database structure (pres-00, pres-01, ..., pres-16)
  async getNextPresenterId() {
    let maxNum = -1;

    // 1. Query Supabase directly if client available
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from(this.presentersTableName)
          .select('id');
        if (!error && Array.isArray(data)) {
          data.forEach(row => {
            if (!row || !row.id) return;
            const match = String(row.id).match(/^pres-(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              // Ignore timestamps or huge numbers > 100000
              if (Number.isFinite(num) && num < 100000 && num > maxNum) {
                maxNum = num;
              }
            }
          });
        }
      } catch (err) {
        console.warn('Could not query max presenter id from Supabase:', err);
      }
    }

    // 2. Also check local presenterObjects in state if available
    if (window.rmnState?.presenterObjects && Array.isArray(window.rmnState.presenterObjects)) {
      window.rmnState.presenterObjects.forEach(item => {
        if (!item || !item.id) return;
        const match = String(item.id).match(/^pres-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (Number.isFinite(num) && num < 100000 && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    const nextNum = maxNum >= 0 ? maxNum + 1 : 0;
    const formatted = nextNum < 10 ? `0${nextNum}` : String(nextNum);
    return `pres-${formatted}`;
  }

  async addPresenter(name) {
    if (!this.client || !name) return null;
    const cleanName = name.trim();
    if (!cleanName || cleanName === 'Radio Maria Rome') return null;

    try {
      // 1. Check if already exists in Supabase
      const { data: existing } = await this.client
        .from(this.presentersTableName)
        .select('id, name')
        .eq('name', cleanName)
        .maybeSingle();

      if (existing) {
        if (!window.rmnState.presenters.includes(cleanName)) {
          window.rmnState.presenters.push(cleanName);
          localStorage.setItem('rmn_presenters', JSON.stringify(window.rmnState.presenters));
        }
        return existing;
      }

      // 2. Insert into presenters table following sequential structure (e.g. pres-16 after pres-15)
      const id = await this.getNextPresenterId();
      const { data, error } = await this.client
        .from(this.presentersTableName)
        .insert({
          id: id,
          name: cleanName
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting presenter to Supabase:', error);
        if (window.rmnUI) window.rmnUI.showToast('تعذر حفظ المذيع في السحابة: ' + error.message, 'error');
        return null;
      }

      console.log('Presenter successfully saved to Supabase with ID:', id, data);
      if (!window.rmnState.presenters.includes(cleanName)) {
        window.rmnState.presenters.push(cleanName);
        localStorage.setItem('rmn_presenters', JSON.stringify(window.rmnState.presenters));
      }
      if (!window.rmnState.presenterObjects) {
        window.rmnState.presenterObjects = [];
      }
      window.rmnState.presenterObjects.push({ id, name: cleanName });
      localStorage.setItem('rmn_presenter_objects', JSON.stringify(window.rmnState.presenterObjects));

      if (window.rmnUI) window.rmnUI.showToast(`تم حفظ المذيع "${cleanName}" بالمعرّف ${id} في السحابة ✅`, 'success');
      return data;
    } catch (e) {
      console.error('addPresenter error:', e);
      return null;
    }
  }

  async updatePresenter(oldName, newName) {
    if (!this.client || !oldName || !newName) return;
    try {
      await this.client
        .from(this.presentersTableName)
        .update({ name: newName.trim() })
        .eq('name', oldName.trim());

      await this.client
        .from(this.programsTableName)
        .update({ presenter: newName.trim(), updated_at: new Date().toISOString() })
        .eq('presenter', oldName.trim());

      if (window.rmnState?.presenterObjects) {
        const found = window.rmnState.presenterObjects.find(
          p => p && p.name && p.name.toLowerCase() === oldName.trim().toLowerCase()
        );
        if (found) {
          found.name = newName.trim();
          localStorage.setItem('rmn_presenter_objects', JSON.stringify(window.rmnState.presenterObjects));
        }
      }

      console.log(`Presenter updated in Supabase: "${oldName}" -> "${newName}"`);
    } catch (e) {
      console.error('updatePresenter error:', e);
    }
  }

  async deletePresenter(name) {
    if (!this.client || !name) return;
    try {
      await this.client
        .from(this.presentersTableName)
        .delete()
        .eq('name', name.trim());

      if (window.rmnState?.presenterObjects) {
        window.rmnState.presenterObjects = window.rmnState.presenterObjects.filter(
          p => p && p.name && p.name.toLowerCase() !== name.trim().toLowerCase()
        );
        localStorage.setItem('rmn_presenter_objects', JSON.stringify(window.rmnState.presenterObjects));
      }

      console.log(`Presenter deleted from Supabase: "${name}"`);
    } catch (e) {
      console.error('deletePresenter error:', e);
    }
  }

  // =========================================================================
  // CATEGORIES TABLE SYNC
  // =========================================================================
  async syncCategories() {
    if (!this.client) return;
    try {
      const { data, error } = await this.client
        .from(this.categoriesTableName)
        .select('id, name')
        .order('id', { ascending: true });

      if (error) {
        console.warn('Could not query categories table:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const defaultColorMap = {};
        RMN_CATEGORIES.forEach(c => {
          defaultColorMap[c.id] = c.color;
          defaultColorMap[c.name] = c.color;
        });

        const merged = data.map(item => ({
          id: item.id,
          name: item.name,
          color: defaultColorMap[item.id] || defaultColorMap[item.name] || '#1d4ed8'
        }));

        window.rmnState.categories = merged;
        window.rmnState.customCategories = merged;
        localStorage.setItem('rmn_categories_v2', JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('syncCategories error:', e);
    }
  }

  async addCategory(cat) {
    if (!this.client || !cat) return null;
    try {
      const { data, error } = await this.client
        .from(this.categoriesTableName)
        .upsert({
          id: cat.id,
          name: cat.name.trim()
        })
        .select('id, name')
        .single();

      if (error) {
        console.error('addCategory error:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('addCategory error:', e);
      return null;
    }
  }

  async updateCategory(id, updated) {
    if (!this.client || !id) return;
    try {
      await this.client
        .from(this.categoriesTableName)
        .update({
          name: updated.name.trim()
        })
        .eq('id', id);
    } catch (e) {
      console.error('updateCategory error:', e);
    }
  }

  async deleteCategory(id) {
    if (!this.client || !id) return;
    try {
      await this.client
        .from(this.categoriesTableName)
        .delete()
        .eq('id', id);
    } catch (e) {
      console.error('deleteCategory error:', e);
    }
  }

  // =========================================================================
  // PROGRAMS TABLE SYNC
  // =========================================================================
  async syncPrograms() {
    if (!this.client) return;
    try {
      const { data, error } = await this.client
        .from(this.programsTableName)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Could not query programs table:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Map database columns to app model
        const mappedPrograms = data.map(row => ({
          id: row.id,
          title: row.title,
          categoryId: row.category_id || row.categoryId || 'spiritual',
          defaultDuration: Number(row.default_duration || row.defaultDuration || 30),
          presenter: row.presenter || 'فريق الإذاعة',
          color: row.color || '#1d4ed8',
          description: row.description || '',
          fixed: Boolean(row.fixed)
        }));

        this.isApplyingRemoteChange = true;
        window.rmnState.programs = window.rmnState.ensureUniqueColors(mappedPrograms);
        localStorage.setItem('rmn_programs_v1', JSON.stringify(window.rmnState.programs));
        this.isApplyingRemoteChange = false;

        if (window.rmnUI) {
          window.rmnUI.renderLibraryView();
        }
      } else {
        // Seed programs table in Supabase
        await this.seedPrograms();
      }
    } catch (e) {
      console.warn('syncPrograms error:', e);
    }
  }

  async seedPrograms() {
    if (!this.client || !window.rmnState.programs?.length) return;
    try {
      const rows = window.rmnState.programs.map(p => ({
        id: p.id,
        title: p.title,
        category_id: p.categoryId,
        default_duration: p.defaultDuration,
        presenter: p.presenter,
        color: p.color,
        description: p.description,
        fixed: Boolean(p.fixed)
      }));
      await this.client.from(this.programsTableName).upsert(rows);
    } catch (e) {
      console.warn('seedPrograms error:', e);
    }
  }

  async upsertProgram(program) {
    if (!this.client || !program || this.isApplyingRemoteChange) return;
    try {
      const catObj = window.rmnState.getCategory(program.categoryId);
      const targetCatId = catObj ? catObj.id : (program.categoryId || 'cate-09');
      const targetPresenter = (program.presenter || '').trim() || 'راديو مريم الناصرة';

      // Ensure presenter exists in presenters table to satisfy fk_programs_presenter
      if (!window.rmnState.presenters.includes(targetPresenter)) {
        await this.addPresenter(targetPresenter);
      }

      await this.client.from(this.programsTableName).upsert({
        id: program.id,
        title: program.title,
        category_id: targetCatId,
        default_duration: program.defaultDuration,
        presenter: targetPresenter,
        color: program.color,
        description: program.description || '',
        fixed: Boolean(program.fixed),
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('upsertProgram to Supabase failed:', e);
    }
  }

  async deleteProgram(programId) {
    if (!this.client || !programId || this.isApplyingRemoteChange) return;
    try {
      await this.client.from(this.programsTableName).delete().eq('id', programId);
    } catch (e) {
      console.warn('deleteProgram from Supabase failed:', e);
    }
  }

  // =========================================================================
  // SCHEDULE STATE TABLE SYNC (Weekly grid & metadata)
  // =========================================================================
  async syncScheduleState(isInitial = false) {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client
        .from(this.scheduleTableName)
        .select('*')
        .eq('id', this.rowId)
        .maybeSingle();

      if (error) {
        console.warn('Could not query schedule state table:', error.message);
        return false;
      }

      if (!data) {
        // Push initial local state
        await this.pushScheduleState(false);
        return true;
      }

      if (data.schedule && typeof data.schedule === 'object') {
        this.isApplyingRemoteChange = true;
        window.rmnState.applyRemoteState(data);
        this.isApplyingRemoteChange = false;

        if (!isInitial && window.rmnUI) {
          window.rmnUI.showToast('تم تحديث جدول البث سحابياً ✨', 'success');
        }
      }
      return true;
    } catch (err) {
      console.error('syncScheduleState error:', err);
      return false;
    }
  }

  async pushScheduleState(showToast = false) {
    if (!this.client || this.isApplyingRemoteChange) return false;
    if (this.isPushing) {
      this.hasPendingPush = true;
      return true;
    }
    this.isPushing = true;
    this.status = 'syncing';
    this.updateBadgeUI();

    try {
      const payload = {
        id: this.rowId,
        schedule: window.rmnState.schedule,
        templates: window.rmnAutofill?.customTemplates || [],
        categories: window.rmnState.customCategories || [],
        active_schedule_name: window.rmnState.activeScheduleName || 'الجدول الحالي',
        updated_at: new Date().toISOString(),
        updated_by: this.clientSessionId
      };

      const { error } = await this.client
        .from(this.scheduleTableName)
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('Schedule push error:', error);
        this.status = 'error';
        this.updateBadgeUI();
        if (showToast && window.rmnUI) window.rmnUI.showToast('فشل في حفظ الجدول سحابياً', 'error');
        return false;
      }

      this.status = 'connected';
      this.updateBadgeUI();
      if (showToast && window.rmnUI) window.rmnUI.showToast('تم حفظ الجدول في السحابة بنجاح! ☁️', 'success');
      return true;
    } catch (err) {
      console.error('pushScheduleState error:', err);
      this.status = 'error';
      this.updateBadgeUI();
      return false;
    } finally {
      this.isPushing = false;
      if (this.hasPendingPush) {
        this.hasPendingPush = false;
        this.triggerSync();
      }
    }
  }

  // Debounced trigger called whenever schedule changes locally
  triggerSync() {
    if (!this.client || this.isApplyingRemoteChange) return;
    clearTimeout(this.syncDebounceTimer);
    this.status = 'syncing';
    this.updateBadgeUI();
    this.syncDebounceTimer = setTimeout(() => {
      this.pushScheduleState(false);
    }, 1500);
  }

  // =========================================================================
  // REALTIME SUBSCRIPTION FOR MULTI-DEVICE INSTANT SYNC
  // =========================================================================
  subscribeToRealtime() {
    if (!this.client) return;
    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.client
      .channel('rmn_live_channel')
      // 1. Listen to programs table changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: this.programsTableName
      }, (payload) => {
        this.handleRealtimeProgramChange(payload);
      })
      // 2. Listen to presenters table changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: this.presentersTableName
      }, (payload) => {
        this.handleRealtimePresenterChange(payload);
      })
      // 3. Listen to categories table changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: this.categoriesTableName
      }, (payload) => {
        this.handleRealtimeCategoryChange(payload);
      })
      // 4. Listen to schedule state changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: this.scheduleTableName,
        filter: `id=eq.${this.rowId}`
      }, (payload) => {
        if (!payload.new) return;
        // CRUCIAL: Ignore our own update echo so the UI NEVER freezes or gets stuck on copy/paste/delete!
        if (payload.new.updated_by === this.clientSessionId) {
          return;
        }
        if (!this.isApplyingRemoteChange) {
          this.isApplyingRemoteChange = true;
          window.rmnState.applyRemoteState(payload.new);
          this.isApplyingRemoteChange = false;
          if (window.rmnUI) window.rmnUI.showToast('تم استلام جدول البث المحدث مباشرة من الاستوديو! 🔄', 'info');
        }
      })
      .subscribe((status) => {
        console.log('Supabase Realtime subscription status:', status);
      });
  }

  handleRealtimeProgramChange(payload) {
    if (this.isApplyingRemoteChange) return;
    this.isApplyingRemoteChange = true;

    try {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const item = payload.new;
        const mapped = {
          id: item.id,
          title: item.title,
          categoryId: item.category_id || item.categoryId || 'spiritual',
          defaultDuration: Number(item.default_duration || item.defaultDuration || 30),
          presenter: item.presenter || 'فريق الإذاعة',
          color: item.color || '#1d4ed8',
          description: item.description || '',
          fixed: Boolean(item.fixed)
        };

        const idx = window.rmnState.programs.findIndex(p => p.id === mapped.id);
        if (idx !== -1) {
          window.rmnState.programs[idx] = mapped;
        } else {
          window.rmnState.programs.push(mapped);
        }
        localStorage.setItem('rmn_programs_v1', JSON.stringify(window.rmnState.programs));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          window.rmnState.programs = window.rmnState.programs.filter(p => p.id !== deletedId);
          localStorage.setItem('rmn_programs_v1', JSON.stringify(window.rmnState.programs));
        }
      }

      if (window.rmnUI) {
        window.rmnUI.renderLibraryView();
        window.rmnUI.renderScheduleContent();
      }
    } finally {
      this.isApplyingRemoteChange = false;
    }
  }

  handleRealtimePresenterChange(payload) {
    if (payload.new?.name) {
      const name = String(payload.new.name).trim();
      if (name && !window.rmnState.presenters.includes(name)) {
        window.rmnState.presenters.push(name);
        localStorage.setItem('rmn_presenters', JSON.stringify(window.rmnState.presenters));
      }
    }
  }

  handleRealtimeCategoryChange(payload) {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const cat = payload.new;
      if (cat?.id && cat?.name) {
        const idx = window.rmnState.categories.findIndex(c => c.id === cat.id);
        if (idx !== -1) {
          window.rmnState.categories[idx] = cat;
        } else {
          window.rmnState.categories.push(cat);
        }
        localStorage.setItem('rmn_categories_v2', JSON.stringify(window.rmnState.categories));
        if (window.rmnUI) window.rmnUI.refreshAll();
      }
    } else if (payload.eventType === 'DELETE') {
      const deletedId = payload.old?.id;
      if (deletedId) {
        window.rmnState.categories = window.rmnState.categories.filter(c => c.id !== deletedId);
        localStorage.setItem('rmn_categories_v2', JSON.stringify(window.rmnState.categories));
        if (window.rmnUI) window.rmnUI.refreshAll();
      }
    }
  }

  // =========================================================================
  // HEADER BADGE UI (ONLY CLOUD EMOJI + GREEN/RED/AMBER DOT)
  // =========================================================================
  updateBadgeUI() {
    const dot = document.getElementById('supabaseStatusDot');
    const badge = document.getElementById('supabaseSyncBadge');
    if (!dot || !badge) return;

    switch (this.status) {
      case 'connected':
        dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs';
        badge.title = 'السحابة متصلة (Supabase) 🟢 - يتم الحفظ والمزامنة لحظياً';
        break;
      case 'syncing':
        dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
        badge.title = 'جاري المزامنة مع السحابة 🟡...';
        break;
      case 'error':
        dot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs';
        badge.title = 'تعذر الاتصال بالسحابة 🔴 - انقر للمحاولة مجدداً';
        break;
      default:
        dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
        badge.title = 'السحابة غير مفعلة - انقر للمحاولة مجدداً';
    }
  }

  // On clicking the cloud button in the header
  showStatus() {
    if (this.status === 'connected') {
      if (window.rmnUI) window.rmnUI.showToast('السحابة متصلة بنجاح 🟢 - المزامنة الحية تعمل تلقائياً', 'success');
      // Trigger an instant refresh from cloud
      this.syncAll(false);
    } else if (this.status === 'syncing') {
      if (window.rmnUI) window.rmnUI.showToast('جاري مزامنة البيانات مع السحابة 🟡...', 'info');
    } else {
      if (window.rmnUI) window.rmnUI.showToast('جاري الاتصال بقاعدة بيانات Supabase 🔄...', 'info');
      this.init();
    }
  }
}

// Global instance
window.rmnSupabase = new RMNSupabaseManager();
