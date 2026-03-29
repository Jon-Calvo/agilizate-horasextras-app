/* ============================================================
   AGILIZATE – Módulo Logs / Auditoría
   ============================================================ */

const Logs = {
  _data:  [],
  _page:  1,
  _total: 0,

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Auditoría / Logs del Sistema</h2>
          <p class="section-subtitle" id="logsSubtitle">Cargando…</p>
        </div>
        ${Permisos.puedeExportarLogs()
          ? `<button class="btn btn-ghost btn-sm" onclick="Logs._exportar()">⬇ Exportar CSV</button>`
          : ''}
      </div>

      <div class="filter-bar">
        <div class="form-group">
          <label>Buscar usuario / acción</label>
          <input type="text" id="logsBuscar" placeholder="Escribí para filtrar…"
            oninput="Logs._filtrarLocal()" />
        </div>
        <div class="form-group">
          <label>Módulo</label>
          <select id="logsModulo" onchange="Logs._filtrarLocal()">
            <option value="">Todos</option>
            <option value="Auth">Auth</option>
            <option value="Solicitudes">Solicitudes</option>
            <option value="Usuarios">Usuarios</option>
            <option value="Porteria">Portería</option>
            <option value="Configuracion">Configuración</option>
            <option value="Excel">Excel</option>
            <option value="Permisos">Permisos</option>
          </select>
        </div>
        <div class="form-group">
          <label>Resultado</label>
          <select id="logsExito" onchange="Logs._filtrarLocal()">
            <option value="">Todos</option>
            <option value="TRUE">Exitoso</option>
            <option value="FALSE">Error</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap" id="logsTableWrap">
          <div class="loading-screen" style="min-height:200px">
            <div class="loading-spinner"></div>
          </div>
        </div>
        <div id="logsPaginacion"></div>
      </div>
    `;

    await this._cargar();
  },

  async _cargar() {
    try {
      const res  = await API.getLogs({ page: this._page, perPage: 50 });
      this._data  = res?.data  || [];
      this._total = res?.total || this._data.length;

      const sub = document.getElementById('logsSubtitle');
      if (sub) sub.textContent = `${this._total} evento(s) registrado(s)`;

      this._renderTabla(this._data);
      this._renderPaginacion();
    } catch (err) {
      const wrap = document.getElementById('logsTableWrap');
      if (wrap) wrap.innerHTML = `<div class="empty-state"><h4>Error al cargar logs</h4><p>${err.message}</p></div>`;
    }
  },

  _renderTabla(data) {
    const wrap = document.getElementById('logsTableWrap');
    if (!wrap) return;

    if (!data.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:2rem"><h4>Sin registros</h4><p>No hay logs con los filtros aplicados.</p></div>`;
      return;
    }

    const rows = data.map(l => `
      <tr>
        <td class="font-mono" style="font-size:.75rem;white-space:nowrap">${Helpers.formatDateTime(l.Timestamp)}</td>
        <td style="font-size:.85rem;font-weight:600">${l.NombreUsuario || '–'}</td>
        <td style="font-size:.8rem">${l.AreaUsuario || '–'}</td>
        <td><span class="log-action-badge">${l.Accion || '–'}</span></td>
        <td style="font-size:.8rem">${l.Modulo || '–'}</td>
        <td style="font-size:.8rem">${l.EntidadAfectada || '–'} ${l.EntidadID ? `<span class="font-mono" style="font-size:.72rem;color:var(--c-gray-400)">(${l.EntidadID})</span>` : ''}</td>
        <td>
          <span class="badge ${(l.Exito === 'TRUE' || l.Exito === true) ? 'badge-success' : 'badge-danger'}">
            ${(l.Exito === 'TRUE' || l.Exito === true) ? '✓ OK' : '✕ Error'}
          </span>
        </td>
        <td style="font-size:.75rem;color:var(--c-danger);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${l.MensajeError || ''}
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Usuario</th>
            <th>Área</th>
            <th>Acción</th>
            <th>Módulo</th>
            <th>Entidad</th>
            <th>Resultado</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  _renderPaginacion() {
    const el    = document.getElementById('logsPaginacion');
    if (!el) return;
    const pages = Math.ceil(this._total / 50) || 1;
    el.innerHTML = Helpers.paginationHTML(this._page, pages, 'Logs._irPagina');
  },

  _irPagina(p) {
    Logs._page = p;
    Logs._cargar();
  },

  _filtrarLocal() {
    const busq   = (document.getElementById('logsBuscar')?.value  || '').toLowerCase();
    const modulo = document.getElementById('logsModulo')?.value   || '';
    const exito  = document.getElementById('logsExito')?.value    || '';

    const filtrado = this._data.filter(l => {
      const matchBusq   = !busq   || (l.NombreUsuario || '').toLowerCase().includes(busq) || (l.Accion || '').toLowerCase().includes(busq);
      const matchMod    = !modulo || l.Modulo === modulo;
      const matchExito  = !exito  || String(l.Exito) === exito;
      return matchBusq && matchMod && matchExito;
    });

    this._renderTabla(filtrado);
  },

  _exportar() {
    if (!this._data.length) { UI.warning('No hay datos para exportar.'); return; }
    Helpers.downloadCSV(this._data, `logs_${Helpers.today()}.csv`);
    UI.success('CSV de logs descargado.');
  },
};
