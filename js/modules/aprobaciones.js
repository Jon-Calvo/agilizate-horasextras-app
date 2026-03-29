/* ============================================================
   AGILIZATE – Módulo Aprobaciones (fixed)
   ============================================================ */

const Aprobaciones = {
  _data: [],
  _page: 1,

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Aprobaciones Pendientes</h2>
          <p class="section-subtitle" id="aprSubtitle">Cargando…</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Aprobaciones.render()">↻ Actualizar</button>
      </div>
      <div id="aprContent">
        <div class="loading-screen" style="min-height:300px"><div class="loading-spinner"></div></div>
      </div>`;

    await this._cargar();
  },

  async _cargar() {
    try {
      const res   = await API.getSolicitudes({
        estado:  'PENDIENTE APROBACION',
        page:    this._page,
        perPage: 50,
      });
      this._data = res?.data || [];

      const sub = document.getElementById('aprSubtitle');

      const grouped = this._agrupar(this._data);
      const keys    = Object.keys(grouped);

      if (sub) sub.textContent = `${keys.length} solicitud(es) esperando aprobación`;

      const el = document.getElementById('aprContent');
      if (!el) return;

      if (!keys.length) {
        el.innerHTML = `
          <div class="card" style="padding:3rem;text-align:center">
            <div style="font-size:3rem;margin-bottom:1rem">✓</div>
            <h4 style="color:var(--c-success);font-size:1.1rem;font-weight:700">Todo al día</h4>
            <p style="color:var(--c-gray-500)">No hay solicitudes pendientes de aprobación.</p>
          </div>`;
        return;
      }

      el.innerHTML = keys.map(k => this._buildCard(grouped[k])).join('');

    } catch (err) {
      const el = document.getElementById('aprContent');
      if (el) el.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  _agrupar(data) {
    const g = {};
    for (const s of data) {
      if (!g[s.NumeroSolicitud]) g[s.NumeroSolicitud] = { ...s, filas: [] };
      g[s.NumeroSolicitud].filas.push(s);
    }
    return g;
  },

  _buildCard(group) {
    const s    = group;
    const num  = s.NumeroSolicitud;

    const colRows = group.filas.map(c => `
      <tr>
        <td style="font-weight:600">${c.NombreColaborador || '–'} ${Helpers.ibBadge(c.IBSnapshot)}</td>
        <td class="font-mono text-xs">${c.Legajo}</td>
        <td>${c.CategoriaSnapshot || '–'}</td>
        <td class="font-mono">${Helpers.formatHoras(c.CantidadHoras)}</td>
        <td class="font-mono">${Helpers.formatARS(c.TotalGeneral)}</td>
        <td>${Helpers.statusBadge(c.StatusColaborador || c.StatusSolicitud)}</td>
        <td>
          <div style="display:flex;gap:.3rem">
            <button class="btn btn-success btn-sm" onclick="Aprobaciones._aprobarColab('${c.ID}','${num}')">✓</button>
            <button class="btn btn-danger  btn-sm" onclick="Aprobaciones._rechazarColab('${c.ID}','${num}')">✕</button>
          </div>
        </td>
      </tr>`).join('');

    return `
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">
          <div>
            <span class="font-mono" style="font-size:1rem;font-weight:800">N° ${num}</span>
            <span style="margin-left:.75rem;font-size:.82rem;color:var(--c-gray-500)">${Helpers.formatDate(s.FechaSolicitud)}</span>
            <span class="badge badge-primary" style="margin-left:.5rem">${s.TipoExtra || '–'}</span>
          </div>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-success btn-sm" onclick="Aprobaciones._aprobarTodo('${num}')">✓ Aprobar Todo</button>
            <button class="btn btn-danger  btn-sm" onclick="Aprobaciones._rechazarTodo('${num}')">✕ Rechazar Todo</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-row" style="margin-bottom:.75rem;font-size:.85rem">
            <div><strong>Solicitante:</strong> ${s.NombreSolicitante || '–'}</div>
            <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)} · ${s.HoraInicioExtra} – ${s.HoraFinExtra}</div>
            <div><strong>Área:</strong> ${s.AreaExtraID || '–'} / ${s.SectorExtraID || '–'}</div>
            <div><strong>Motivo:</strong> ${s.MotivoID || '–'}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Colaborador</th><th>Legajo</th><th>Cat.</th><th>Horas</th><th>Total ARS</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>${colRows}</tbody>
            </table>
          </div>
          ${s.ObservacionSolicitud ? `<p style="margin-top:.6rem;font-size:.82rem;color:var(--c-gray-600)"><strong>Obs.:</strong> ${s.ObservacionSolicitud}</p>` : ''}
        </div>
      </div>`;
  },

  async _aprobarTodo(num) {
    const obs = await this._pedirObs('Observación de aprobación (opcional):');
    if (obs === null) return;
    const res = await API.aprobarSolicitud({ numeroSolicitud: num, tipo: 'total', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error al aprobar.'); return; }
    UI.success('Solicitud aprobada.');
    this._cargar();
  },

  async _rechazarTodo(num) {
    const obs = await this._pedirObs('Motivo de rechazo (requerido):', true);
    if (obs === null || obs.trim() === '') return;
    const res = await API.rechazarSolicitud({ numeroSolicitud: num, tipo: 'total', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error al rechazar.'); return; }
    UI.success('Solicitud rechazada.');
    this._cargar();
  },

  async _aprobarColab(rowId, num) {
    const obs = await this._pedirObs('Observación (opcional):');
    if (obs === null) return;
    const res = await API.aprobarSolicitud({ rowId, numeroSolicitud: num, tipo: 'parcial', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error.'); return; }
    UI.success('Colaborador aprobado.');
    this._cargar();
  },

  async _rechazarColab(rowId, num) {
    const obs = await this._pedirObs('Motivo de rechazo:', true);
    if (obs === null || obs.trim() === '') return;
    const res = await API.rechazarSolicitud({ rowId, numeroSolicitud: num, tipo: 'parcial', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error.'); return; }
    UI.success('Colaborador rechazado.');
    this._cargar();
  },

  _pedirObs(label, requerido = false) {
    return new Promise((resolve) => {
      const id = UI.modal({
        title: 'Observación',
        body:  `<div class="form-group"><label>${label}</label><textarea id="obsTA" rows="3" style="resize:vertical"></textarea></div>`,
        footer: `
          <button class="btn btn-ghost"   id="obsCancel">Cancelar</button>
          <button class="btn btn-primary" id="obsOk">Confirmar</button>`,
      });
      setTimeout(() => {
        const ok  = document.getElementById('obsOk');
        const no  = document.getElementById('obsCancel');
        const ta  = document.getElementById('obsTA');
        if (ok) ok.onclick = () => {
          const v = ta?.value?.trim() || '';
          if (requerido && !v) { UI.warning('Este campo es requerido.'); return; }
          UI.closeModal(id);
          resolve(v);
        };
        if (no) no.onclick = () => { UI.closeModal(id); resolve(null); };
      }, 30);
    });
  },
};
