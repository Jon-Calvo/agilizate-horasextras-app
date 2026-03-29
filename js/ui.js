/* ============================================================
   AGILIZATE – UI Module (fixed)
   ============================================================ */

const UI = {

  // ── Toast ─────────────────────────────────────────────────
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { console.warn('toastContainer not found'); return; }

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="font-weight:700;margin-right:.35rem">${icons[type] || 'ℹ'}</span>${message}`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
  },

  success(msg) { this.toast(msg, 'success'); },
  error(msg)   { this.toast(msg, 'error'); },
  warning(msg) { this.toast(msg, 'warning'); },
  info(msg)    { this.toast(msg, 'info'); },

  // ── Modal ─────────────────────────────────────────────────
  modal({ id, title, body, footer, size = '', onClose } = {}) {
    const modalId   = id || ('modal_' + Date.now());
    const container = document.getElementById('modalsContainer');
    if (!container) return modalId;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'backdrop_' + modalId;
    backdrop.innerHTML = `
      <div class="modal ${size}" id="${modalId}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>${title || ''}</h2>
          <button class="modal-close" onclick="UI.closeModal('${modalId}')" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body" id="body_${modalId}">${body || ''}</div>
        ${footer ? `<div class="modal-footer" id="footer_${modalId}">${footer}</div>` : ''}
      </div>
    `;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeModal(modalId);
    });
    container.appendChild(backdrop);

    if (!this._onCloseHandlers) this._onCloseHandlers = {};
    if (onClose) this._onCloseHandlers[modalId] = onClose;

    return modalId;
  },

  closeModal(id) {
    const backdrop = document.getElementById('backdrop_' + id);
    if (backdrop) backdrop.remove();
    if (this._onCloseHandlers && this._onCloseHandlers[id]) {
      this._onCloseHandlers[id]();
      delete this._onCloseHandlers[id];
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  },

  updateModalBody(id, html) {
    const el = document.getElementById('body_' + id);
    if (el) el.innerHTML = html;
  },

  // ── Confirm Dialog ────────────────────────────────────────
  confirm({ title = '¿Confirmar?', message = '', type = 'danger', confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
      const id = this.modal({
        title,
        size: 'confirm-dialog',
        body: `
          <div style="text-align:center;padding:.5rem 0">
            <div class="confirm-icon confirm-icon-${type}">${type === 'danger' ? '⚠' : 'ℹ'}</div>
            <p style="color:var(--c-gray-600);font-size:.95rem;margin-top:.5rem">${message}</p>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost" id="btn_cancel_${id}">${cancelText}</button>
          <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" id="btn_confirm_${id}">${confirmText}</button>
        `,
      });
      // Asignar handlers tras render
      setTimeout(() => {
        const btnOk  = document.getElementById('btn_confirm_' + id);
        const btnNo  = document.getElementById('btn_cancel_'  + id);
        if (btnOk) btnOk.onclick = () => { this.closeModal(id); resolve(true); };
        if (btnNo) btnNo.onclick = () => { this.closeModal(id); resolve(false); };
      }, 30);
    });
  },

  // ── Sidebar ───────────────────────────────────────────────
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  },

  // ── User Menu ─────────────────────────────────────────────
  toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('hidden');
  },

  toggleNotifications() {
    this.info('Sistema de notificaciones próximamente.');
  },

  togglePassword() {
    const input = document.getElementById('password');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  // ── showSection — CORREGIDO ───────────────────────────────
  // Muestra el spinner, luego llama al renderer (que puede ser async).
  // Maneja errores y muestra mensaje si algo falla.
  showSection(section, params = {}) {
    const titleEl = document.getElementById('headerTitle');
    if (titleEl) titleEl.textContent = this._sectionTitles[section] || section;

    this.closeSidebar();

    // Actualizar nav activo
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    const content = document.getElementById('appContent');
    if (!content) return;

    // Mostrar spinner inmediatamente
    content.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p style="color:var(--c-gray-500);font-size:.875rem">Cargando ${this._sectionTitles[section] || section}…</p>
      </div>`;

    const renderer = this._sectionRenderers[section];

    if (!renderer) {
      content.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;margin:0 auto 1rem;opacity:.3">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h4>Módulo no disponible</h4>
          <p>La sección "<strong>${section}</strong>" no está registrada.</p>
        </div>`;
      return;
    }

    // Llamar renderer (sync o async)
    Promise.resolve()
      .then(() => renderer(params))
      .catch(err => {
        console.error(`Error en sección "${section}":`, err);
        content.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;margin:0 auto 1rem;color:var(--c-danger);opacity:.6">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h4>Error al cargar el módulo</h4>
            <p style="color:var(--c-danger)">${err.message || 'Error desconocido'}</p>
            <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="UI.showSection('${section}')">
              Reintentar
            </button>
          </div>`;
      });
  },

  _sectionTitles: {
    dashboard:     'Dashboard',
    solicitudes:   'Solicitudes de Horas Extras',
    aprobaciones:  'Aprobaciones Pendientes',
    porteria:      'Control de Portería',
    nomina:        'Nómina de Personal',
    usuarios:      'Gestión de Usuarios',
    configuracion: 'Configuración del Sistema',
    reportes:      'Reportes',
    logs:          'Auditoría / Logs',
    excel:         'Importar / Exportar Excel',
    profile:       'Mi Perfil',
  },

  _sectionRenderers: {},

  registerSection(name, fn) {
    this._sectionRenderers[name] = fn;
  },

  // ── Nav Builder ───────────────────────────────────────────
  buildNav() {
    const nav     = document.getElementById('sidebarNav');
    const userBox = document.getElementById('sidebarUser');
    const user    = Auth.currentUser;

    if (!nav || !user) return;

    const sections = [
      {
        title: 'Principal',
        items: [
          { s: 'dashboard',    label: 'Dashboard',    icon: CONFIG.NAV_ICONS.dashboard,    show: Permisos.puedeVerDashboard() },
          { s: 'solicitudes',  label: 'Solicitudes',  icon: CONFIG.NAV_ICONS.solicitudes,  show: Permisos.puedeLeerSolicitud() },
          { s: 'aprobaciones', label: 'Aprobaciones', icon: CONFIG.NAV_ICONS.aprobaciones, show: Permisos.puedeAprobar() || Permisos.puedeRechazar() },
          { s: 'porteria',     label: 'Portería',     icon: CONFIG.NAV_ICONS.porteria,     show: Permisos.puedePorteriaVer() },
        ],
      },
      {
        title: 'Gestión',
        items: [
          { s: 'nomina',    label: 'Nómina',    icon: CONFIG.NAV_ICONS.nomina,    show: Permisos.puedeLeerSolicitud() },
          { s: 'usuarios',  label: 'Usuarios',  icon: CONFIG.NAV_ICONS.usuarios,  show: Permisos.puedeGestionarUsuarios() },
        ],
      },
      {
        title: 'Herramientas',
        items: [
          { s: 'reportes',      label: 'Reportes',      icon: CONFIG.NAV_ICONS.reportes,      show: Permisos.puedeReporteGlobal() },
          { s: 'excel',         label: 'Excel I/E',     icon: CONFIG.NAV_ICONS.excel,          show: Permisos.puedeExportarExcel() || Permisos.puedeImportarExcel() },
          { s: 'logs',          label: 'Auditoría',     icon: CONFIG.NAV_ICONS.logs,           show: Permisos.puedeVerLogs() },
          { s: 'configuracion', label: 'Configuración', icon: CONFIG.NAV_ICONS.configuracion,  show: Permisos.puedeConfigurarSistema() || Permisos.puedeGestionarPermisos() || Permisos.puedeConfigValorHora() },
        ],
      },
    ];

    let html = '';
    for (const group of sections) {
      const visible = group.items.filter(i => i.show);
      if (!visible.length) continue;
      html += `<div class="nav-section"><div class="nav-section-title">${group.title}</div>`;
      for (const item of visible) {
        html += `<button class="nav-item" data-section="${item.s}" onclick="UI.showSection('${item.s}')">
          ${item.icon}<span>${item.label}</span>
        </button>`;
      }
      html += '</div>';
    }
    nav.innerHTML = html;

    // Info de usuario en sidebar
    if (userBox) {
      userBox.innerHTML = `
        <div class="s-user-avatar">${Helpers.initials(user.NombreCompleto)}</div>
        <div class="s-user-info">
          <span class="s-user-name">${user.NombreCompleto || user.NombreUsuario}</span>
          <span class="s-user-role">${user.RolNombre || user.RolID}</span>
        </div>
        <button class="s-logout-btn" onclick="Auth.logout()" title="Cerrar sesión">${CONFIG.NAV_ICONS.logout}</button>
      `;
    }

    // Avatar en header
    const avatar = document.getElementById('userAvatarInitials');
    if (avatar) avatar.textContent = Helpers.initials(user.NombreCompleto);
  },

  // ── Botón de carga ────────────────────────────────────────
  setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    const text   = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    if (text)   text.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
  },

  // ── Clicks fuera del menú ─────────────────────────────────
  initOutsideClicks() {
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('userMenu');
      const wrap = document.getElementById('userAvatarWrap');
      if (menu && wrap && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });
  },
};
