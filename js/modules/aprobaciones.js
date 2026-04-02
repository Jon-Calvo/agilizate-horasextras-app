/* ============================================================
   AGILIZATE – Módulo Aprobaciones  [v1.2 – Mejoras completas]
   ============================================================ */

const Aprobaciones = {
  _data:       [],
  _catalogs:   null,
  _verRechazados: false, // toggle para ver rechazados

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    await this._loadCatalogs();

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Aprobaciones</h2>
          <p class="section-subtitle" id="aprSubtitle">Cargando…</p>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center">
          <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;cursor:pointer;
            background:var(--c-gray-100);padding:.35rem .75rem;border-radius:99px;user-select:none">
            <input type="checkbox" id="chkVerRechazados"
              ${this._verRechazados ? 'checked' : ''}
              onchange="Aprobaciones._toggleRechazados(this.checked)"
              style="accent-color:var(--c-danger)" />
            Ver rechazados (reactivables)
          </label>
          <button class="btn btn-ghost btn-sm" onclick="Aprobaciones.render()">↻ Actualizar</button>
        </div>
      </div>
      <div id="aprContent">
        <div class="loading-screen" style="min-height:300px"><div class="loading-spinner"></div></div>
      </div>`;

    await this._cargar();
  },

  async _loadCatalogs() {
    try {
      const [areasRes, motivosRes] = await Promise.all([API.getAreas(), API.getMotivos()]);
      this._catalogs = {
        areas:   areasRes?.data  || [],
        motivos: motivosRes?.data || [],
      };
    } catch { this._catalogs = { areas: [], motivos: [] }; }
  },

  _toggleRechazados(val) {
    this._verRechazados = val;
    this._renderContenido();
  },

  async _cargar() {
    try {
      // Traer PENDIENTE APROBACION y PARCIAL
      const [resPend, resParcial] = await Promise.all([
        API.getSolicitudes({ estado: 'PENDIENTE APROBACION', page: 1, perPage: 200 }),
        API.getSolicitudes({ estado: 'PARCIAL',              page: 1, perPage: 200 }),
      ]);
      this._data = [
        ...(resPend?.data   || []),
        ...(resParcial?.data || []),
      ];
      this._renderContenido();
    } catch (err) {
      const el = document.getElementById('aprContent');
      if (el) el.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  _renderContenido() {
    const sub     = document.getElementById('aprSubtitle');
    const el      = document.getElementById('aprContent');
    if (!el) return;

    const grouped = this._agrupar(this._data);
    const keys    = Object.keys(grouped);

    if (sub) sub.textContent = `${keys.length} solicitud(es) activa(s)`;

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
    const s   = group;
    const num = s.NumeroSolicitud;
    const esConcluida = s.StatusSolicitud === 'CONCLUIDA';

    // Resolver nombres
    const sectorObj = (this._catalogs?.areas   || []).find(a => a.IDSector === s.SectorExtraID);
    const motivoObj = (this._catalogs?.motivos  || []).find(m => m.IDMotivo === s.MotivoID);
    const sectorNom = sectorObj ? sectorObj.Sector     : (s.SectorExtraID || '–');
    const motivoNom = motivoObj ? motivoObj.MotivoExtra : (s.MotivoID     || '–');

    // Calcular antigüedad
    const diasAntigüedad = this._diasDesde(s.FechaSolicitud);
    const vencida = diasAntigüedad > 7;

    // Filtrar colaboradores según toggle
    let filasMostrar = group.filas;
    if (this._verRechazados) {
      filasMostrar = group.filas.filter(f => f.StatusColaborador === 'RECHAZADO' || f.StatusColaborador === 'RECHAZADA');
    }

    const colRows = filasMostrar.map(c => {
      const colabEsConcluido = c.StatusColaborador === 'APROBADO' || c.StatusColaborador === 'APROBADA' ||
                               c.StatusColaborador === 'RECHAZADO' || c.StatusColaborador === 'RECHAZADA';

      // Botones de acción: siempre visibles si la solicitud NO es CONCLUIDA
      let acciones = '';
      if (!esConcluida) {
        if (c.StatusColaborador === 'RECHAZADO' || c.StatusColaborador === 'RECHAZADA') {
          // Reactivar rechazado solo si la solicitud tiene menos de 7 días
          if (!vencida) {
            acciones = `
              <button class="btn btn-success btn-sm" title="Reactivar a APROBADO"
                onclick="Aprobaciones._cambiarEstadoColab('${c.ID}','${num}','APROBADO')">↩ Aprobar</button>`;
          } else {
            acciones = `<span style="font-size:.75rem;color:var(--c-gray-400)">+7 días, no reactivable</span>`;
          }
        } else if (c.StatusColaborador === 'PENDIENTE' || c.StatusColaborador === 'PENDIENTE APROBACION') {
          acciones = `
            <button class="btn btn-success btn-sm" onclick="Aprobaciones._aprobarColab('${c.ID}','${num}')">✓</button>
            <button class="btn btn-danger  btn-sm" onclick="Aprobaciones._rechazarColab('${c.ID}','${num}')">✕</button>`;
        } else if (c.StatusColaborador === 'APROBADO' || c.StatusColaborador === 'APROBADA') {
          acciones = `
            <button class="btn btn-danger btn-sm" onclick="Aprobaciones._cambiarEstadoColab('${c.ID}','${num}','RECHAZADO')">✕ Rechazar</button>`;
        }
      }

      return `
        <tr>
          <td style="font-weight:600">${c.NombreColaborador || '–'} ${Helpers.ibBadge(c.IBSnapshot)}</td>
          <td class="font-mono text-xs">${c.Legajo}</td>
          <td class="font-mono">${Helpers.formatHoras(c.CantidadHoras)}</td>
          <td>${Helpers.statusBadge(c.StatusColaborador || c.StatusSolicitud)}</td>
          <td>
            <div style="display:flex;gap:.3rem;flex-wrap:wrap">${acciones}</div>
          </td>
        </tr>`;
    }).join('');

    const hasPendientes = group.filas.some(f =>
      f.StatusColaborador === 'PENDIENTE' || f.StatusColaborador === 'PENDIENTE APROBACION');

    return `
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">
          <div>
            <span class="font-mono" style="font-size:1rem;font-weight:800">N° ${num}</span>
            <span style="margin-left:.75rem;font-size:.82rem;color:var(--c-gray-500)">${Helpers.formatDate(s.FechaSolicitud)}</span>
            <span class="badge badge-primary" style="margin-left:.5rem">${s.TipoExtra || '–'}</span>
            ${Helpers.statusBadge(s.StatusSolicitud)}
            ${vencida ? '<span class="badge badge-warning" style="margin-left:.3rem;font-size:.7rem">+7 días</span>' : ''}
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            ${!esConcluida && hasPendientes ? `
              <button class="btn btn-success btn-sm" onclick="Aprobaciones._aprobarTodo('${num}')">✓ Aprobar todo</button>
              <button class="btn btn-danger  btn-sm" onclick="Aprobaciones._rechazarTodo('${num}')">✕ Rechazar todo</button>` : ''}
            ${!esConcluida ? `
              <button class="btn btn-ghost btn-sm" onclick="Aprobaciones._resetear('${num}')"
                title="Resetear todos los colaboradores a PENDIENTE">↺ Resetear</button>` : ''}
          </div>
        </div>
        <div class="card-body">
          <div class="form-row" style="margin-bottom:.75rem;font-size:.85rem">
            <div><strong>Solicitante:</strong> ${s.NombreSolicitante || '–'}</div>
            <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}
              · ${Helpers.formatHHMM(s.HoraInicioExtra)} – ${Helpers.formatHHMM(s.HoraFinExtra)}</div>
            <div><strong>Sector:</strong> ${sectorNom}</div>
            <div><strong>Motivo:</strong> ${motivoNom}</div>
          </div>
          ${filasMostrar.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Colaborador</th><th>Legajo</th><th>Horas</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>${colRows}</tbody>
            </table>
          </div>` : `<p style="color:var(--c-gray-400);text-align:center;padding:.75rem">
            ${this._verRechazados ? 'Sin colaboradores rechazados en esta solicitud.' : 'Sin colaboradores para mostrar.'}</p>`}
          ${s.ObservacionSolicitud ? `<p style="margin-top:.6rem;font-size:.82rem;color:var(--c-gray-600)"><strong>Obs.:</strong> ${s.ObservacionSolicitud}</p>` : ''}
        </div>
      </div>`;
  },

  // ── Acciones ──────────────────────────────────────────────
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

  // Cambiar a cualquier estado (para rechazados → aprobado, o aprobado → rechazado)
  async _cambiarEstadoColab(rowId, num, nuevoEstado) {
    const label = nuevoEstado === 'APROBADO' ? 'aprobar' : 'rechazar';
    const obs   = await this._pedirObs(
      `Observación para ${label} (${nuevoEstado === 'RECHAZADO' ? 'requerido' : 'opcional'}):`,
      nuevoEstado === 'RECHAZADO'
    );
    if (obs === null) return;
    if (nuevoEstado === 'RECHAZADO' && !obs.trim()) { UI.warning('El motivo es requerido.'); return; }

    const fn  = nuevoEstado === 'APROBADO' ? API.aprobarSolicitud : API.rechazarSolicitud;
    const res = await fn({ rowId, numeroSolicitud: num, tipo: 'parcial', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error.'); return; }
    UI.success(`Colaborador ${nuevoEstado.toLowerCase()}.`);
    this._cargar();
  },

  // Resetear solicitud completa a PENDIENTE APROBACION
  async _resetear(num) {
    const ok = await UI.confirm({
      title:       'Resetear solicitud',
      message:     `¿Resetear N° ${num}? Todos los colaboradores quedarán en estado PENDIENTE y la solicitud en PENDIENTE APROBACION.`,
      type:        'warning',
      confirmText: 'Sí, resetear',
    });
    if (!ok) return;
    const res = await API.call('resetearSolicitud', { numeroSolicitud: num });
    if (!res?.ok) { UI.error(res?.error || 'Error al resetear.'); return; }
    UI.success('Solicitud reseteada a PENDIENTE APROBACION.');
    this._cargar();
  },

  // ── Helpers ───────────────────────────────────────────────
  _diasDesde(fechaStr) {
    if (!fechaStr) return 0;
    const ms = Date.now() - new Date(fechaStr + 'T00:00:00').getTime();
    return Math.floor(ms / 86400000);
  },

  _pedirObs(label, requerido = false) {
    return new Promise((resolve) => {
      const id = UI.modal({
        title: 'Observación',
        body:  `<div class="form-group"><label>${label}</label><textarea id="obsTA" rows="3" style="resize:vertical;width:100%"></textarea></div>`,
        footer: `
          <button class="btn btn-ghost"   id="obsCancel">Cancelar</button>
          <button class="btn btn-primary" id="obsOk">Confirmar</button>`,
      });
      setTimeout(() => {
        const ok = document.getElementById('obsOk');
        const no = document.getElementById('obsCancel');
        const ta = document.getElementById('obsTA');
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


