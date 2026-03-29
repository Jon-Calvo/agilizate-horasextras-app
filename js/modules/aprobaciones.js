/* ============================================================
   AGILIZATE – Módulo de Aprobaciones
   ============================================================ */

const Aprobaciones = {
  _data: [],
  _page: 1,

  async init() {
    UI.registerSection('aprobaciones', () => Aprobaciones.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const res = await API.getSolicitudes({
      estado: CONFIG.ESTADOS_SOLICITUD.PENDIENTE,
      page: this._page,
      perPage: CONFIG.ROWS_PER_PAGE,
    });

    this._data  = res?.data  || [];
    const total = res?.total || 0;
    const pages = Math.ceil(total / CONFIG.ROWS_PER_PAGE) || 1;

    // Agrupar por NumeroSolicitud para mostrar colaboradores agrupados
    const grouped = this._agrupar(this._data);

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Aprobaciones Pendientes</h2>
          <p class="section-subtitle">${Object.keys(grouped).length} solicitud(es) en espera de aprobación</p>
        </div>
      </div>

      ${Object.keys(grouped).length === 0 ? `
        <div class="empty-state card" style="padding:3rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <h4>Sin solicitudes pendientes</h4>
          <p>Todas las solicitudes han sido procesadas.</p>
        </div>
      ` : Object.values(grouped).map(g => this._buildSolicitudCard(g)).join('')}

      ${Helpers.paginationHTML(this._page, pages, 'Aprobaciones.goPage')}
    `;
  },

  _agrupar(data) {
    const groups = {};
    for (const s of data) {
      const key = s.NumeroSolicitud;
      if (!groups[key]) groups[key] = { ...s, colaboradores: [] };
      groups[key].colaboradores.push(s);
    }
    return groups;
  },

  _buildSolicitudCard(group) {
    const s    = group;
    const cols = group.colaboradores;

    const colRows = cols.map(c => `
      <tr>
        <td>${c.NombreColaborador} ${Helpers.ibBadge(c.IBSnapshot)}</td>
        <td>${c.Legajo}</td>
        <td>${c.CategoriaSnapshot || '–'}</td>
        <td>${Helpers.formatHoras(c.CantidadHoras)}</td>
        <td>${Helpers.formatARS(c.TotalGeneral)}</td>
        <td>${Helpers.statusBadge(c.StatusColaborador || c.StatusSolicitud)}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-success btn-sm" onclick="Aprobaciones.aprobarColaborador('${c.ID}', '${s.NumeroSolicitud}')">✓ Aprobar</button>
            <button class="btn btn-danger btn-sm" onclick="Aprobaciones.rechazarColaborador('${c.ID}', '${s.NumeroSolicitud}')">✕ Rechazar</button>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">
          <div>
            <span class="font-mono" style="font-size:1rem;font-weight:700">N° ${s.NumeroSolicitud}</span>
            <span style="margin-left:.75rem;font-size:.875rem;color:var(--c-gray-500)">${Helpers.formatDate(s.FechaSolicitud)}</span>
            <span class="badge badge-primary" style="margin-left:.5rem">${s.TipoExtra}</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-success btn-sm" onclick="Aprobaciones.aprobarTodo('${s.NumeroSolicitud}')">✓ Aprobar Todo</button>
            <button class="btn btn-danger btn-sm" onclick="Aprobaciones.rechazarTodo('${s.NumeroSolicitud}')">✕ Rechazar Todo</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-row" style="margin-bottom:1rem">
            <div><strong>Solicitante:</strong> ${s.NombreSolicitante} (${s.SectorSolicitanteID})</div>
            <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)} | ${s.HoraInicioExtra}–${s.HoraFinExtra}</div>
            <div><strong>Área:</strong> ${s.AreaExtraID} / ${s.SectorExtraID}</div>
            <div><strong>Motivo:</strong> ${s.MotivoID}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Colaborador</th><th>Legajo</th><th>Categoría</th><th>Horas</th><th>Total ARS</th><th>Estado</th><th>Acción</th></tr>
              </thead>
              <tbody>${colRows}</tbody>
            </table>
          </div>
          ${s.ObservacionSolicitud ? `<p style="margin-top:.75rem;font-size:.875rem;color:var(--c-gray-600)"><strong>Observación:</strong> ${s.ObservacionSolicitud}</p>` : ''}
        </div>
      </div>
    `;
  },

  async aprobarTodo(numeroSolicitud) {
    const obs = await this._pedirObservacion('Observación de aprobación (opcional):');
    if (obs === null) return; // cancelado

    const res = await API.aprobarSolicitud({ numeroSolicitud, tipo: 'total', observacion: obs });
    if (!res?.ok) return UI.error(res?.error || 'Error al aprobar.');
    UI.success('Solicitud aprobada correctamente.');
    this.render();
  },

  async rechazarTodo(numeroSolicitud) {
    const obs = await this._pedirObservacion('Motivo de rechazo (requerido):', true);
    if (obs === null || obs === '') return;

    const res = await API.rechazarSolicitud({ numeroSolicitud, tipo: 'total', observacion: obs });
    if (!res?.ok) return UI.error(res?.error || 'Error al rechazar.');
    UI.success('Solicitud rechazada.');
    this.render();
  },

  async aprobarColaborador(rowId, numeroSolicitud) {
    const obs = await this._pedirObservacion('Observación (opcional):');
    if (obs === null) return;

    const res = await API.aprobarSolicitud({ rowId, numeroSolicitud, tipo: 'parcial', observacion: obs });
    if (!res?.ok) return UI.error(res?.error || 'Error al aprobar.');
    UI.success('Colaborador aprobado.');
    this.render();
  },

  async rechazarColaborador(rowId, numeroSolicitud) {
    const obs = await this._pedirObservacion('Motivo de rechazo:', true);
    if (obs === null || obs === '') return;

    const res = await API.rechazarSolicitud({ rowId, numeroSolicitud, tipo: 'parcial', observacion: obs });
    if (!res?.ok) return UI.error(res?.error || 'Error al rechazar.');
    UI.success('Colaborador rechazado.');
    this.render();
  },

  abrirParaSolicitud(numeroSolicitud) {
    UI.showSection('aprobaciones');
  },

  goPage(page) {
    Aprobaciones._page = page;
    Aprobaciones.render();
  },

  _pedirObservacion(label, requerido = false) {
    return new Promise((resolve) => {
      const id = UI.modal({
        title: 'Observación',
        body: `
          <div class="form-group">
            <label>${label}</label>
            <textarea id="obsInput" rows="3" placeholder="Escribí aquí..." style="resize:vertical"></textarea>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost" id="obsCancel">Cancelar</button>
          <button class="btn btn-primary" id="obsConfirm">Confirmar</button>
        `,
      });
      setTimeout(() => {
        document.getElementById('obsConfirm').onclick = () => {
          const val = document.getElementById('obsInput')?.value?.trim();
          if (requerido && !val) { UI.warning('Este campo es requerido.'); return; }
          UI.closeModal(id);
          resolve(val || '');
        };
        document.getElementById('obsCancel').onclick = () => {
          UI.closeModal(id);
          resolve(null);
        };
      }, 50);
    });
  },
};
