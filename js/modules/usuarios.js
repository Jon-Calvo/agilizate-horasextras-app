/* ============================================================
   AGILIZATE – Módulo Usuarios (fixed)
   ============================================================ */

const Usuarios = {
  _data:  [],
  _roles: [],
  _areas: [],

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div><h2 class="section-title">Gestión de Usuarios</h2>
          <p class="section-subtitle" id="usrSubtitle">Cargando…</p></div>
        <div style="display:flex;gap:.5rem">
          ${Permisos.puedeGestionarPermisos() ? `<button class="btn btn-ghost btn-sm" onclick="Usuarios._matrizPermisos()">🔐 Permisos por Rol</button>` : ''}
          ${Permisos.tiene(CONFIG.PERMISOS.USUARIOS_CREAR) ? `<button class="btn btn-primary" onclick="Usuarios._abrirForm()">+ Nuevo Usuario</button>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="table-wrap" id="usrTableWrap">
          <div class="loading-screen" style="min-height:200px"><div class="loading-spinner"></div></div>
        </div>
      </div>`;

    await this._cargar();
  },

  async _cargar() {
    try {
      const [usrRes, rolRes, arRes] = await Promise.all([
        API.getUsuarios(), API.getRoles(), API.getAreas(),
      ]);
      this._data  = usrRes?.data || [];
      this._roles = rolRes?.data || [];
      this._areas = arRes?.data  || [];

      const sub = document.getElementById('usrSubtitle');
      if (sub) sub.textContent = `${this._data.length} usuario(s) en el sistema`;

      this._renderTabla();
    } catch (err) {
      const wrap = document.getElementById('usrTableWrap');
      if (wrap) wrap.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  _renderTabla() {
    const wrap = document.getElementById('usrTableWrap');
    if (!wrap) return;

    if (!this._data.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:2rem"><h4>Sin usuarios</h4></div>`;
      return;
    }

    const canEdit = Permisos.tiene(CONFIG.PERMISOS.USUARIOS_MODIFICAR);
    const canDel  = Permisos.tiene(CONFIG.PERMISOS.USUARIOS_ELIMINAR);

    const rows = this._data.map(u => {
      const rol    = this._roles.find(r => r.ID === u.RolID);
      const activo = u.Activo === 'TRUE' || u.Activo === true;
      return `<tr>
        <td class="font-mono text-xs">${u.NombreUsuario}</td>
        <td style="font-weight:600">${u.NombreCompleto || '–'}</td>
        <td class="text-xs">${u.Email || '–'}</td>
        <td><span class="badge badge-primary">${rol?.NombreRol || u.RolID}</span></td>
        <td class="text-xs">${u.AreaID || '–'}</td>
        <td><span class="badge ${activo ? 'badge-success' : 'badge-danger'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="text-xs">${Helpers.formatDateTime(u.UltimoLogin)}</td>
        <td>
          <div style="display:flex;gap:.3rem">
            ${canEdit ? `
            <button class="btn-icon" onclick="Usuarios._abrirForm('${u.ID}')" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" onclick="Usuarios.cambiarPassword('${u.ID}')" title="Cambiar contraseña">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>` : ''}
            ${canDel ? `
            <button class="btn-icon" style="color:var(--c-danger)" onclick="Usuarios._eliminar('${u.ID}')" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table>
        <thead>
          <tr><th>Usuario</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Área</th><th>Estado</th><th>Último Login</th><th>Acciones</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  _abrirForm(id = null) {
    const user = id ? this._data.find(u => u.ID === id) : null;
    const areasUnicas = [...new Map(this._areas.map(a => [a.Area, a])).values()];
    const sectores    = user?.AreaID ? this._areas.filter(a => a.Area === user.AreaID) : [];

    UI.modal({
      id:    'modalUsuario',
      title: id ? 'Editar Usuario' : 'Nuevo Usuario',
      body:  `
        <div class="form-row">
          <div class="form-group">
            <label>Nombre de Usuario *</label>
            <input type="text" id="uUsername" value="${user?.NombreUsuario || ''}" placeholder="nombre.apellido" />
          </div>
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input type="text" id="uNombre" value="${user?.NombreCompleto || ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="uEmail" value="${user?.Email || ''}" />
          </div>
          <div class="form-group">
            <label>Rol *</label>
            <select id="uRol">
              ${Helpers.buildOptions(this._roles, 'ID', 'NombreRol', user?.RolID)}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Área</label>
            <select id="uArea" onchange="Usuarios._onAreaChange()">
              ${Helpers.buildOptions(areasUnicas, 'Area', 'Area', user?.AreaID, 'Sin área')}
            </select>
          </div>
          <div class="form-group">
            <label>Sector</label>
            <select id="uSector">
              ${Helpers.buildOptions(sectores, 'IDSector', 'Sector', user?.SectorID, 'Sin sector')}
            </select>
          </div>
        </div>
        ${!id ? `
        <div class="form-row">
          <div class="form-group">
            <label>Contraseña * (mín. 8 caracteres)</label>
            <input type="password" id="uPw" placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label>Confirmar *</label>
            <input type="password" id="uPwc" placeholder="••••••••" />
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="checkbox-wrap">
            <input type="checkbox" id="uActivo" ${user?.Activo !== 'FALSE' && user?.Activo !== false ? 'checked' : ''} />
            Usuario activo
          </label>
        </div>
        <div id="uError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalUsuario')">Cancelar</button>
        <button class="btn btn-primary" onclick="Usuarios._guardar('${id || ''}')">Guardar</button>
      `,
    });
  },

  _onAreaChange() {
    const area = document.getElementById('uArea')?.value || '';
    const sel  = document.getElementById('uSector');
    if (!sel) return;
    const sects = this._areas.filter(a => a.Area === area);
    sel.innerHTML = Helpers.buildOptions(sects, 'IDSector', 'Sector', '', 'Sin sector');
  },

  async _guardar(id) {
    const username = document.getElementById('uUsername')?.value?.trim();
    const nombre   = document.getElementById('uNombre')?.value?.trim();
    const email    = document.getElementById('uEmail')?.value?.trim();
    const rol      = document.getElementById('uRol')?.value;
    const area     = document.getElementById('uArea')?.value;
    const sector   = document.getElementById('uSector')?.value;
    const activo   = document.getElementById('uActivo')?.checked;
    const errEl    = document.getElementById('uError');

    if (!username || !nombre || !email || !rol) {
      if (errEl) { errEl.textContent = 'Completá todos los campos obligatorios (*).'; errEl.classList.remove('hidden'); }
      return;
    }

    let passwordHash;
    if (!id) {
      const pw  = document.getElementById('uPw')?.value  || '';
      const pwc = document.getElementById('uPwc')?.value || '';
      if (pw.length < 8) {
        if (errEl) { errEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'; errEl.classList.remove('hidden'); }
        return;
      }
      if (pw !== pwc) {
        if (errEl) { errEl.textContent = 'Las contraseñas no coinciden.'; errEl.classList.remove('hidden'); }
        return;
      }
      passwordHash = await Auth._sha256(pw);
    }

    if (errEl) errEl.classList.add('hidden');

    const payload = { username, nombre, email, rol, area, sector, activo, passwordHash };
    const res = id
      ? await API.modificarUsuario({ ...payload, id })
      : await API.crearUsuario(payload);

    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }

    UI.closeModal('modalUsuario');
    UI.success(id ? 'Usuario actualizado.' : 'Usuario creado correctamente.');
    this._cargar();
  },

  async cambiarPassword(id) {
    const modalId = UI.modal({
      title: 'Cambiar Contraseña',
      body:  `
        <div class="form-group"><label>Nueva Contraseña * (mín. 8 caracteres)</label><input type="password" id="npw" /></div>
        <div class="form-group"><label>Confirmar *</label><input type="password" id="npwc" /></div>
        <div id="pwErr" class="alert alert-error hidden"></div>`,
      footer: `
        <button class="btn btn-ghost" id="pwCancel">Cancelar</button>
        <button class="btn btn-primary" id="pwOk">Cambiar</button>`,
    });

    setTimeout(() => {
      const ok  = document.getElementById('pwOk');
      const no  = document.getElementById('pwCancel');
      if (no) no.onclick = () => UI.closeModal(modalId);
      if (ok) ok.onclick = async () => {
        const pw   = document.getElementById('npw')?.value  || '';
        const pwc  = document.getElementById('npwc')?.value || '';
        const errEl = document.getElementById('pwErr');
        if (pw.length < 8)  { errEl.textContent = 'Mínimo 8 caracteres.'; errEl.classList.remove('hidden'); return; }
        if (pw !== pwc)      { errEl.textContent = 'No coinciden.';         errEl.classList.remove('hidden'); return; }

        const hash = await Auth._sha256(pw);
        const res  = await API.cambiarPassword({ id, passwordHash: hash });

        if (!res?.ok) { errEl.textContent = res?.error || 'Error.'; errEl.classList.remove('hidden'); return; }
        UI.closeModal(modalId);
        UI.success('Contraseña actualizada correctamente.');
      };
    }, 30);
  },

  async _eliminar(id) {
    if (id === Auth.currentUser?.ID) { UI.error('No podés eliminar tu propio usuario.'); return; }
    const ok = await UI.confirm({ title: 'Eliminar Usuario', message: '¿Eliminar este usuario?', type: 'danger' });
    if (!ok) return;

    const res = await API.eliminarUsuario(id);
    if (!res?.ok) { UI.error(res?.error || 'Error.'); return; }
    UI.success('Usuario eliminado.');
    this._cargar();
  },

  async _matrizPermisos() {
    // Delegar a Configuracion si está disponible
    if (typeof Configuracion !== 'undefined') {
      UI.showSection('configuracion');
      setTimeout(() => {
        const btn = document.querySelector('[data-tab="permisos"]');
        if (btn) btn.click();
      }, 300);
    }
  },
};
