/* ============================================================
   AGILIZATE – Módulo de Usuarios
   ============================================================ */

const Usuarios = {
  _data: [],
  _roles: [],
  _areas: [],
  _page: 1,

  async init() {
    UI.registerSection('usuarios', () => Usuarios.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const [res, rolesRes, areasRes] = await Promise.all([
      API.getUsuarios(),
      API.getRoles(),
      API.getAreas(),
    ]);

    this._data  = res?.data    || [];
    this._roles = rolesRes?.data || [];
    this._areas = areasRes?.data || [];

    content.innerHTML = this._buildHTML();
  },

  _buildHTML() {
    const canCreate = Permisos.tiene(CONFIG.PERMISOS.USUARIOS_CREAR);
    const canPerms  = Permisos.puedeGestionarPermisos();

    return `
      <div class="section-header">
        <div>
          <h2 class="section-title">Gestión de Usuarios</h2>
          <p class="section-subtitle">${this._data.length} usuario(s) en el sistema</p>
        </div>
        <div class="flex gap-2">
          ${canPerms ? `<button class="btn btn-ghost btn-sm" onclick="Usuarios.gestionarPermisos()">🔐 Permisos por Rol</button>` : ''}
          ${canCreate ? `<button class="btn btn-primary" onclick="Usuarios.abrirFormulario()">+ Nuevo Usuario</button>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Área</th>
                <th>Estado</th>
                <th>Último Login</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this._data.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin usuarios</td></tr>` : ''}
              ${this._data.map(u => this._buildRow(u)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _buildRow(u) {
    const canEdit   = Permisos.tiene(CONFIG.PERMISOS.USUARIOS_MODIFICAR);
    const canDelete = Permisos.tiene(CONFIG.PERMISOS.USUARIOS_ELIMINAR);
    const rolNombre = this._roles.find(r => r.ID === u.RolID)?.NombreRol || u.RolID;
    const activo    = u.Activo === 'TRUE' || u.Activo === true;

    return `
      <tr>
        <td class="font-mono text-sm">${u.NombreUsuario}</td>
        <td>${u.NombreCompleto || '–'}</td>
        <td>${u.Email || '–'}</td>
        <td><span class="badge badge-primary">${rolNombre}</span></td>
        <td>${u.AreaID || '–'}</td>
        <td><span class="badge ${activo ? 'badge-success' : 'badge-danger'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="text-sm">${Helpers.formatDateTime(u.UltimoLogin)}</td>
        <td>
          <div class="flex gap-2">
            ${canEdit ? `
              <button class="btn-icon" onclick="Usuarios.abrirFormulario('${u.ID}')" data-tooltip="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon" onclick="Usuarios.cambiarPassword('${u.ID}')" data-tooltip="Cambiar contraseña">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </button>
            ` : ''}
            ${canDelete ? `
              <button class="btn-icon" style="color:var(--c-danger)" onclick="Usuarios.eliminar('${u.ID}')" data-tooltip="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  abrirFormulario(id = null) {
    const user = id ? this._data.find(u => u.ID === id) : null;
    const areasUnicas = [...new Map(this._areas.map(a => [a.Area, a])).values()];

    const modalId = UI.modal({
      id: 'modalUsuario',
      title: id ? 'Editar Usuario' : 'Nuevo Usuario',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>Nombre de Usuario *</label>
            <input type="text" id="uUsername" value="${user?.NombreUsuario || ''}" placeholder="nombre.apellido" required />
          </div>
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input type="text" id="uNombre" value="${user?.NombreCompleto || ''}" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="uEmail" value="${user?.Email || ''}" required />
          </div>
          <div class="form-group">
            <label>Rol *</label>
            <select id="uRol" required>
              ${Helpers.buildOptions(this._roles, 'ID', 'NombreRol', user?.RolID)}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Área</label>
            <select id="uArea">
              ${Helpers.buildOptions(areasUnicas, 'Area', 'Area', user?.AreaID, 'Sin área')}
            </select>
          </div>
          <div class="form-group">
            <label>Sector</label>
            <select id="uSector">
              <option value="">Sin sector</option>
            </select>
          </div>
        </div>
        ${!id ? `
        <div class="form-row">
          <div class="form-group">
            <label>Contraseña *</label>
            <input type="password" id="uPassword" placeholder="Mínimo 8 caracteres" required />
          </div>
          <div class="form-group">
            <label>Confirmar Contraseña *</label>
            <input type="password" id="uPasswordConf" placeholder="Repetir contraseña" required />
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="checkbox-wrap">
            <input type="checkbox" id="uActivo" ${user?.Activo !== 'FALSE' ? 'checked' : ''} />
            Usuario activo
          </label>
        </div>
        <div id="usuarioError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalUsuario')">Cancelar</button>
        <button class="btn btn-primary" onclick="Usuarios.guardar('${id || ''}')">
          <span class="btn-text">Guardar</span>
          <span class="btn-loader hidden"><svg viewBox="0 0 24 24" class="spin" style="width:16px"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>
        </button>
      `,
    });
  },

  async guardar(id) {
    const username  = document.getElementById('uUsername')?.value?.trim();
    const nombre    = document.getElementById('uNombre')?.value?.trim();
    const email     = document.getElementById('uEmail')?.value?.trim();
    const rol       = document.getElementById('uRol')?.value;
    const area      = document.getElementById('uArea')?.value;
    const sector    = document.getElementById('uSector')?.value;
    const activo    = document.getElementById('uActivo')?.checked;
    const errorEl   = document.getElementById('usuarioError');

    if (!username || !nombre || !email || !rol) {
      if (errorEl) { errorEl.textContent = 'Completá todos los campos obligatorios.'; errorEl.classList.remove('hidden'); }
      return;
    }

    let passwordHash;
    if (!id) {
      const pw  = document.getElementById('uPassword')?.value;
      const pwc = document.getElementById('uPasswordConf')?.value;
      if (!pw || pw.length < 8) {
        if (errorEl) { errorEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'; errorEl.classList.remove('hidden'); }
        return;
      }
      if (pw !== pwc) {
        if (errorEl) { errorEl.textContent = 'Las contraseñas no coinciden.'; errorEl.classList.remove('hidden'); }
        return;
      }
      passwordHash = await Helpers.sha256(pw);
    }

    if (errorEl) errorEl.classList.add('hidden');

    const data = { username, nombre, email, rol, area, sector, activo, passwordHash };
    const res  = id ? await API.modificarUsuario({ ...data, id }) : await API.crearUsuario(data);

    if (!res?.ok) {
      if (errorEl) { errorEl.textContent = res?.error || 'Error al guardar.'; errorEl.classList.remove('hidden'); }
      return;
    }

    UI.closeModal('modalUsuario');
    UI.success(id ? 'Usuario actualizado.' : 'Usuario creado.');
    this.render();
  },

  async cambiarPassword(id) {
    const modalId = UI.modal({
      title: 'Cambiar Contraseña',
      body: `
        <div class="form-group">
          <label>Nueva Contraseña *</label>
          <input type="password" id="newPw" placeholder="Mínimo 8 caracteres" />
        </div>
        <div class="form-group">
          <label>Confirmar *</label>
          <input type="password" id="newPwConf" placeholder="Repetir contraseña" />
        </div>
        <div id="pwError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('${modalId}')">Cancelar</button>
        <button class="btn btn-primary" onclick="Usuarios._confirmarCambioPassword('${id}', '${modalId}')">Cambiar</button>
      `,
    });
  },

  async _confirmarCambioPassword(id, modalId) {
    const pw    = document.getElementById('newPw')?.value;
    const pwc   = document.getElementById('newPwConf')?.value;
    const errEl = document.getElementById('pwError');

    if (!pw || pw.length < 8) {
      errEl.textContent = 'Mínimo 8 caracteres.'; errEl.classList.remove('hidden'); return;
    }
    if (pw !== pwc) {
      errEl.textContent = 'Las contraseñas no coinciden.'; errEl.classList.remove('hidden'); return;
    }

    const hash = await Helpers.sha256(pw);
    const res  = await API.cambiarPassword({ id, passwordHash: hash });

    if (!res?.ok) {
      errEl.textContent = res?.error || 'Error.'; errEl.classList.remove('hidden'); return;
    }

    UI.closeModal(modalId);
    UI.success('Contraseña actualizada.');
  },

  async eliminar(id) {
    if (id === Auth.currentUser?.ID) return UI.error('No podés eliminar tu propio usuario.');
    const ok = await UI.confirm({ title: 'Eliminar Usuario', message: '¿Eliminar este usuario?', type: 'danger' });
    if (!ok) return;

    const res = await API.eliminarUsuario(id);
    if (!res?.ok) return UI.error(res?.error || 'Error al eliminar.');
    UI.success('Usuario eliminado.');
    this.render();
  },

  async gestionarPermisos() {
    const rolesRes = await API.getRoles();
    const roles    = rolesRes?.data || this._roles;

    const permisosList = [
      { key: 'SOLICITUDES_CREAR',     label: 'Solicitudes: Crear',      bit: CONFIG.PERMISOS.SOLICITUDES_CREAR },
      { key: 'SOLICITUDES_LEER',      label: 'Solicitudes: Leer',       bit: CONFIG.PERMISOS.SOLICITUDES_LEER },
      { key: 'SOLICITUDES_MODIFICAR', label: 'Solicitudes: Modificar',  bit: CONFIG.PERMISOS.SOLICITUDES_MODIFICAR },
      { key: 'SOLICITUDES_ELIMINAR',  label: 'Solicitudes: Eliminar',   bit: CONFIG.PERMISOS.SOLICITUDES_ELIMINAR },
      { key: 'SOLICITUDES_APROBAR',   label: 'Solicitudes: Aprobar',    bit: CONFIG.PERMISOS.SOLICITUDES_APROBAR },
      { key: 'SOLICITUDES_RECHAZAR',  label: 'Solicitudes: Rechazar',   bit: CONFIG.PERMISOS.SOLICITUDES_RECHAZAR },
      { key: 'USUARIOS_CREAR',        label: 'Usuarios: Crear',         bit: CONFIG.PERMISOS.USUARIOS_CREAR },
      { key: 'USUARIOS_LEER',         label: 'Usuarios: Leer',          bit: CONFIG.PERMISOS.USUARIOS_LEER },
      { key: 'USUARIOS_MODIFICAR',    label: 'Usuarios: Modificar',     bit: CONFIG.PERMISOS.USUARIOS_MODIFICAR },
      { key: 'USUARIOS_ELIMINAR',     label: 'Usuarios: Eliminar',      bit: CONFIG.PERMISOS.USUARIOS_ELIMINAR },
      { key: 'USUARIOS_ASIGNAR_ROL',  label: 'Usuarios: Asignar Rol',   bit: CONFIG.PERMISOS.USUARIOS_ASIGNAR_ROL },
      { key: 'CONFIG_VALORHORA',      label: 'Config: ValorHora',       bit: CONFIG.PERMISOS.CONFIG_VALORHORA },
      { key: 'CONFIG_TIPOCAMBIO',     label: 'Config: TipoCambio',      bit: CONFIG.PERMISOS.CONFIG_TIPOCAMBIO },
      { key: 'CONFIG_REGLAIB',        label: 'Config: ReglaIB',         bit: CONFIG.PERMISOS.CONFIG_REGLAIB },
      { key: 'CONFIG_MOTIVOS',        label: 'Config: Motivos',         bit: CONFIG.PERMISOS.CONFIG_MOTIVOS },
      { key: 'CONFIG_AREAS',          label: 'Config: Áreas',           bit: CONFIG.PERMISOS.CONFIG_AREAS },
      { key: 'DASHBOARD_VER',         label: 'Dashboard: Ver',          bit: CONFIG.PERMISOS.DASHBOARD_VER },
      { key: 'DASHBOARD_EXPORTAR',    label: 'Dashboard: Exportar',     bit: CONFIG.PERMISOS.DASHBOARD_EXPORTAR },
      { key: 'REPORTE_GLOBAL',        label: 'Reporte Global',          bit: CONFIG.PERMISOS.REPORTE_GLOBAL },
      { key: 'EXCEL_EXPORTAR',        label: 'Excel: Exportar',         bit: CONFIG.PERMISOS.EXCEL_EXPORTAR },
      { key: 'EXCEL_IMPORTAR',        label: 'Excel: Importar',         bit: CONFIG.PERMISOS.EXCEL_IMPORTAR },
      { key: 'PORTERIA_VER',          label: 'Portería: Ver',           bit: CONFIG.PERMISOS.PORTERIA_VER },
      { key: 'PORTERIA_REGISTRAR',    label: 'Portería: Registrar',     bit: CONFIG.PERMISOS.PORTERIA_REGISTRAR },
      { key: 'AUDITORIA_VER',         label: 'Auditoría: Ver',          bit: CONFIG.PERMISOS.AUDITORIA_VER },
      { key: 'AUDITORIA_EXPORTAR',    label: 'Auditoría: Exportar',     bit: CONFIG.PERMISOS.AUDITORIA_EXPORTAR },
      { key: 'GESTIONAR_PERMISOS',    label: 'Gestionar Permisos',      bit: CONFIG.PERMISOS.GESTIONAR_PERMISOS },
      { key: 'CONFIGURAR_SISTEMA',    label: 'Configurar Sistema',      bit: CONFIG.PERMISOS.CONFIGURAR_SISTEMA },
    ];

    const thCols = roles.map(r => `<th style="text-align:center;white-space:nowrap">${r.NombreRol}</th>`).join('');

    const rows = permisosList.map(p => {
      const checks = roles.map(r => {
        const mask  = parseInt(r.PermisosBitMask || 0);
        const tiene = (mask & p.bit) !== 0;
        return `<td style="text-align:center">
          <input type="checkbox" class="perm-check" data-rol="${r.ID}" data-bit="${p.bit}"
            ${tiene ? 'checked' : ''} ${r.ID === 'desarrollador' ? 'disabled' : ''}
            onchange="Usuarios._onPermChange(this)" />
        </td>`;
      }).join('');
      return `<tr><td style="white-space:nowrap;font-size:.8rem">${p.label}</td>${checks}</tr>`;
    }).join('');

    UI.modal({
      id: 'modalPermisos',
      title: '🔐 Matriz de Permisos por Rol',
      size: 'modal-xl',
      body: `
        <p style="color:var(--c-gray-500);font-size:.875rem;margin-bottom:1rem">
          Los cambios se aplican en tiempo real. El rol <strong>Desarrollador</strong> siempre tiene acceso total.
        </p>
        <div class="table-wrap">
          <table class="perms-table">
            <thead><tr><th>Permiso</th>${thCols}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `,
      footer: `<button class="btn btn-ghost" onclick="UI.closeModal('modalPermisos')">Cerrar</button>`,
    });
  },

  async _onPermChange(checkbox) {
    const rolId = checkbox.dataset.rol;
    const bit   = parseInt(checkbox.dataset.bit);
    const activo = checkbox.checked;

    const res = await API.actualizarPermisoRol({ rolId, bit, activo });
    if (!res?.ok) {
      checkbox.checked = !activo; // revertir
      UI.error(res?.error || 'Error al actualizar permiso.');
    }
  },
};
