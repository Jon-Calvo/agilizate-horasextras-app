/* ============================================================
   AGILIZATE – UI Module
   ============================================================ */

const UI = {

  // ── Toast ─────────────────────────────────────────────────
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="font-weight:700">${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  },

  success(msg) { this.toast(msg, 'success'); },
  error(msg)   { this.toast(msg, 'error'); },
  warning(msg) { this.toast(msg, 'warning'); },
  info(msg)    { this.toast(msg, 'info'); },

  // ── Modal ─────────────────────────────────────────────────
  modal({ id = 'modal_' + Date.now(), title, body, footer, size = '', onClose } = {}) {
    const container = document.getElementById('modalsContainer');
    if (!container) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'backdrop_' + id;

    backdrop.innerHTML = `
      <div class="modal ${size}" id="${id}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>${title || ''}</h2>
          <button class="modal-close" onclick="UI.closeModal('${id}')" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body" id="body_${id}">${body || ''}</div>
        ${footer ? `<div class="modal-footer" id="footer_${id}">${footer}</div>` : ''}
      </div>
    `;

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeModal(id);
    });

    container.appendChild(backdrop);
    this._onCloseHandlers = this._onCloseHandlers || {};
    if (onClose) this._onCloseHandlers[id] = onClose;

    return id;
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
  confirm({ title = '¿Confirmar acción?', message = '', type = 'danger', onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
      const id = this.modal({
        title,
        size: 'confirm-dialog',
        body: `
          <div style="text-align:center;padding:.5rem 0">
            <div class="confirm-icon confirm-icon-${type}">
              ${type === 'danger' ? '⚠' : 'ℹ'}
            </div>
            <p style="color:var(--c-gray-600);font-size:.95rem">${message}</p>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost" onclick="UI.closeModal('${id}');resolve(false)">
            ${cancelText}
          </button>
          <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" id="btn_confirm_${id}">
            ${confirmText}
          </button>
        `,
      });

      // resolve is captured but needs to be accessible
      setTimeout(() => {
        const btn = document.getElementById('btn_confirm_' + id);
        if (btn) {
          btn.onclick = () => {
            this.closeModal(id);
            resolve(true);
            if (onConfirm) onConfirm();
          };
        }
        const cancelBtn = document.querySelector(`#backdrop_${id} .btn-ghost`);
        if (cancelBtn) {
          cancelBtn.onclick = () => { this.closeModal(id); resolve(false); };
        }
      }, 50);
    });
  },

  // ── Sidebar ───────────────────────────────────────────────
  toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  },

  closeSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  },

  // ── User Menu ─────────────────────────────────────────────
  toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('hidden');
  },

  // ── Notifications ─────────────────────────────────────────
  toggleNotifications() {
    UI.info('Sistema de notificaciones próximamente.');
  },

  // ── Password toggle ───────────────────────────────────────
  togglePassword() {
    const input = document.getElementById('password');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  // ── Navigation ────────────────────────────────────────────
  showSection(section, params = {}) {
    Helpers.el('headerTitle').textContent = this._sectionTitles[section] || section;
    this.closeSidebar();

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Render section
    const content = Helpers.el('appContent');
    if (!content) return;

    content.innerHTML = '<div class="loading-screen"><div class="loading-spinner"></div><p>Cargando…</p></div>';

    setTimeout(() => {
      const renderer = this._sectionRenderers[section];
      if (renderer) {
        renderer(params);
      } else {
        content.innerHTML = `<div class="empty-state"><h4>Sección no encontrada</h4><p>${section}</p></div>`;
      }
    }, 100);
  },

  _sectionTitles: {
    dashboard:      'Dashboard',
    solicitudes:    'Mis Solicitudes',
    aprobaciones:   'Aprobaciones',
    porteria:       'Control de Portería',
    nomina:         'Nómina',
    usuarios:       'Usuarios',
    configuracion:  'Configuración',
    reportes:       'Reportes',
    logs:           'Auditoría / Logs',
    excel:          'Importar / Exportar Excel',
    profile:        'Mi Perfil',
  },

  _sectionRenderers: {},

  registerSection(name, fn) {
    this._sectionRenderers[name] = fn;
  },

  // ── Sidebar Navigation Builder ────────────────────────────
  buildNav() {
    const nav     = document.getElementById('sidebarNav');
    const user    = Auth.currentUser;
    const sidebar = document.getElementById('sidebarUser');

    if (!nav || !user) return;

    const sections = [
      {
        title: 'Principal',
        items: [
          { section: 'dashboard',    label: 'Dashboard',      icon: CONFIG.NAV_ICONS.dashboard,   show: Permisos.puedeVerDashboard() },
          { section: 'solicitudes',  label: 'Solicitudes',    icon: CONFIG.NAV_ICONS.solicitudes, show: Permisos.puedeLeerSolicitud() },
          { section: 'aprobaciones', label: 'Aprobaciones',   icon: CONFIG.NAV_ICONS.aprobaciones,show: Permisos.puedeAprobar() || Permisos.puedeRechazar() },
          { section: 'porteria',     label: 'Portería',       icon: CONFIG.NAV_ICONS.porteria,    show: Permisos.puedePorteriaVer() },
        ],
      },
      {
        title: 'Gestión',
        items: [
          { section: 'nomina',       label: 'Nómina',         icon: CONFIG.NAV_ICONS.nomina,      show: Permisos.puedeLeerSolicitud() },
          { section: 'usuarios',     label: 'Usuarios',       icon: CONFIG.NAV_ICONS.usuarios,    show: Permisos.puedeGestionarUsuarios() },
        ],
      },
      {
        title: 'Herramientas',
        items: [
          { section: 'reportes',     label: 'Reportes',       icon: CONFIG.NAV_ICONS.reportes,    show: Permisos.puedeReporteGlobal() },
          { section: 'excel',        label: 'Excel I/E',      icon: CONFIG.NAV_ICONS.excel,       show: Permisos.puedeExportarExcel() || Permisos.puedeImportarExcel() },
          { section: 'logs',         label: 'Auditoría',      icon: CONFIG.NAV_ICONS.logs,        show: Permisos.puedeVerLogs() },
          { section: 'configuracion',label: 'Configuración',  icon: CONFIG.NAV_ICONS.configuracion,show: Permisos.puedeConfigurarSistema() || Permisos.puedeGestionarPermisos() },
        ],
      },
    ];

    let html = '';
    for (const section of sections) {
      const visibleItems = section.items.filter(i => i.show);
      if (visibleItems.length === 0) continue;

      html += `<div class="nav-section"><div class="nav-section-title">${section.title}</div>`;
      for (const item of visibleItems) {
        html += `<button class="nav-item" data-section="${item.section}" onclick="UI.showSection('${item.section}')">
          ${item.icon} <span>${item.label}</span>
        </button>`;
      }
      html += '</div>';
    }
    nav.innerHTML = html;

    // User info in sidebar
    if (sidebar) {
      const initials = Helpers.initials(user.NombreCompleto);
      sidebar.innerHTML = `
        <div class="s-user-avatar">${initials}</div>
        <div class="s-user-info">
          <span class="s-user-name">${user.NombreCompleto || user.NombreUsuario}</span>
          <span class="s-user-role">${user.RolNombre || user.RolID}</span>
        </div>
        <button class="s-logout-btn" onclick="Auth.logout()" data-tooltip="Cerrar sesión">
          ${CONFIG.NAV_ICONS.logout}
        </button>
      `;
    }

    // User avatar header
    const avatar = document.getElementById('userAvatarInitials');
    if (avatar) avatar.textContent = Helpers.initials(user.NombreCompleto);
  },

  // ── Loading Button ────────────────────────────────────────
  setLoading(btnId, loading) {
    const btn = Helpers.el(btnId);
    if (!btn) return;
    const text   = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text)   text.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
  },

  // ── Close menus on outside click ──────────────────────────
  initOutsideClicks() {
    document.addEventListener('click', (e) => {
      const userMenu = document.getElementById('userMenu');
      const wrap     = document.getElementById('userAvatarWrap');
      if (userMenu && !wrap?.contains(e.target)) {
        userMenu.classList.add('hidden');
      }
    });
  },
};
