/* ============================================================
   AGILIZATE – Módulo Aprobaciones  [CORREGIDO v1.2]
   ============================================================
   FIXES:
   4a) Muestra PENDIENTE APROBACION + PARCIALES juntas
   4b) Filtro de rechazadas con buscador + botón re-aprobar
       (solo si la solicitud es de menos de 7 días)
   ============================================================ */

const Aprobaciones = {
  _data:       [],
  _dataRech:   [],
  _tab:        'pendientes', // 'pendientes' | 'rechazadas'

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Aprobaciones</h2>
          <p class="section-subtitle" id="aprSubtitle">Cargando…</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Aprobaciones.render()">↻ Actualizar</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:.5rem;margin-bottom:1.25rem;border-bottom:2px solid var(--c-gray-100);padding-bottom:0">
        <button id="tabPend" class="tab-btn tab-active" onclick="Aprobaciones._switchTab('pendientes')">
          Pendientes / Parciales
          <span id="badgePend" class="badge badge-primary" style="margin-left:.4rem">…</span>
        </button>
        <button id="tabRech" class="tab-btn" onclick="Aprobaciones._switchTab('rechazadas')">
          Rechazadas
          <span id="badgeRech" class="badge badge-gray" style="margin-left:.4rem">…</span>
        </button>
      </div>

      <div id="aprContent">
        <div class="loading-screen" style="min-height:300px"><div class="loading-spinner"></div></div>
      </div>`;

    // Inyectar estilos de tabs si no existen
    if (!document.getElementById('aprTabStyle')) {
      const style = document.createElement('style');
      style.id = 'aprTabStyle';
      style.textContent = `
        .tab-btn { background:none;border:none;padding:.55rem 1rem;font-size:.88rem;font-weight:600;color:var(--c-gray-500);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px; }
        .tab-btn:hover { color:var(--c-blue-700); }
        .tab-active { color:var(--c-blue-700)!important;border-bottom-color:var(--c-blue-700)!important; }
      `;
      document.head.appendChild(style);
    }

    await this._cargarTodo();
  },

  async _cargarTodo() {
    // FIX 4a: cargar PENDIENTE APROBACION y PARCIAL juntas
    try {
      const [resPend, resParcial, resRech] = await Promise.all([
        API.getSolicitudes({ estado: 'PENDIENTE APROBACION', perPage: 200 }),
        API.getSolicitudes({ estado: 'PARCIAL',              perPage: 200 }),
        API.getSolicitudes({ estado: 'RECHAZADA',            perPage: 200 }),
      ]);

      this._data     = [...(resPend?.data || []), ...(resParcial?.data || [])];
      this._dataRech = resRech?.data || [];

      const grouped = this._agrupar(this._data);
      document.getElementById('badgePend').textContent = Object.keys(grouped).length;
      document.getElementById('badgeRech').textContent = this._dataRech.length;

      if (this._tab === 'pendientes') {
        this._renderPendientes();
      } else {
        this._renderRechazadas();
      }
    } catch (err) {
      const el = document.getElementById('aprContent');
      if (el) el.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  _switchTab(tab) {
    this._tab = tab;
    document.getElementById('tabPend').classList.toggle('tab-active', tab === 'pendientes');
    document.getElementById('tabRech').classList.toggle('tab-active', tab === 'rechazadas');
    if (tab === 'pendientes') {
      this._renderPendientes();
    } else {
      this._renderRechazadas();
    }
  },

  // ── PENDIENTES / PARCIALES ────────────────────────────────
  _renderPendientes() {
    const el = document.getElementById('aprContent');
    if (!el) return;

    const sub = document.getElementById('aprSubtitle');
    const grouped = this._agrupar(this._data);
    const keys    = Object.keys(grouped);

    if (sub) sub.textContent = `${keys.length} solicitud(es) esperando aprobación`;

    if (!keys.length) {
      el.innerHTML = `
        <div class="card" style="padding:3rem;text-align:center">
          <div style="font-size:3rem;margin-bottom:1rem">✓</div>
          <h4 style="color:var(--c-success);font-size:1.1rem;font-weight:700">Todo al día</h4>
          <p style="color:var(--c-gray-500)">No hay solicitudes pendientes ni parciales.</p>
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

    const colRows = group.filas.map(c => {
      const isPend = c.StatusColaborador === 'PENDIENTE APROBACION' || c.StatusSolicitud === 'PENDIENTE APROBACION';
      const isAprobado = c.StatusColaborador === 'APROBADA';
      return `<tr>
        <td style="font-weight:600">${c.NombreColaborador || '–'} ${Helpers.ibBadge(c.IBSnapshot)}</td>
        <td class="font-mono text-xs">${c.Legajo}</td>
        <td>${c.CategoriaSnapshot || '–'}</td>
        <td class="font-mono">${Helpers.formatHoras(c.CantidadHoras)}</td>
        <td>${Helpers.statusBadge(c.StatusColaborador || c.StatusSolicitud)}</td>
        <td>
          ${isPend ? `
          <div style="display:flex;gap:.3rem">
            <button class="btn btn-success btn-sm" onclick="Aprobaciones._aprobarColab('${c.ID}','${num}')">✓ Aprobar</button>
            <button class="btn btn-danger  btn-sm" onclick="Aprobaciones._rechazarColab('${c.ID}','${num}')">✕ Rechazar</button>
          </div>` : isAprobado ? `<span style="font-size:.78rem;color:var(--c-success)">✓ Aprobado</span>` :
          `<span style="font-size:.78rem;color:var(--c-gray-400)">${c.StatusColaborador || '–'}</span>`}
        </td>
      </tr>`;
    }).join('');

    const hayPendientes = group.filas.some(c =>
      c.StatusColaborador === 'PENDIENTE APROBACION' || c.StatusSolicitud === 'PENDIENTE APROBACION'
    );

    return `
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">
          <div>
            <span class="font-mono" style="font-size:1rem;font-weight:800">N° ${num}</span>
            <span style="margin-left:.75rem;font-size:.82rem;color:var(--c-gray-500)">${Helpers.formatDate(s.FechaSolicitud)}</span>
            <span class="badge badge-primary" style="margin-left:.5rem">${s.TipoExtra || '–'}</span>
            ${Helpers.statusBadge(s.StatusSolicitud)}
          </div>
          ${hayPendientes ? `
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-success btn-sm" onclick="Aprobaciones._aprobarTodo('${num}')">✓ Aprobar Todo</button>
            <button class="btn btn-danger  btn-sm" onclick="Aprobaciones._rechazarTodo('${num}')">✕ Rechazar Todo</button>
          </div>` : ''}
        </div>
        <div class="card-body">
          <div class="form-row" style="margin-bottom:.75rem;font-size:.85rem">
            <div><strong>Solicitante:</strong> ${s.NombreSolicitante || '–'}</div>
            <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)} · ${s.HoraInicioExtra || '–'} – ${s.HoraFinExtra || '–'}</div>
            <div><strong>Área:</strong> ${s.AreaExtraID || '–'} / ${s.SectorExtraID || '–'}</div>
            <div><strong>Motivo:</strong> ${s.MotivoID || '–'}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Colaborador</th><th>Legajo</th><th>Cat.</th><th>Horas</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>${colRows}</tbody>
            </table>
          </div>
          ${s.ObservacionSolicitud ? `<p style="margin-top:.6rem;font-size:.82rem;color:var(--c-gray-600)"><strong>Obs.:</strong> ${s.ObservacionSolicitud}</p>` : ''}
        </div>
      </div>`;
  },

  // ── RECHAZADAS (FIX 4b) ───────────────────────────────────
  _renderRechazadas() {
    const el = document.getElementById('aprContent');
    if (!el) return;

    const sub = document.getElementById('aprSubtitle');
    if (sub) sub.textContent = `${this._dataRech.length} colaborador(es) rechazado(s)`;

    el.innerHTML = `
      <!-- Buscador FIX 4b -->
      <div class="filter-bar" style="margin-bottom:1rem">
        <div class="form-group" style="flex:2">
          <label>Buscar colaborador / N° solicitud</label>
          <input type="text" id="rechBuscar" placeholder="Nombre, legajo o N° sol…"
            oninput="Aprobaciones._filtrarRechazadas()" />
        </div>
        <div class="form-group">
          <label>Área</label>
          <select id="rechArea" onchange="Aprobaciones._filtrarRechazadas()">
            <option value="">Todas</option>
            ${[...new Set(this._dataRech.map(d => d.AreaExtraID).filter(Boolean))]
                .map(a => `<option value="${a}">${a}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="rechContent"></div>`;

    this._filtrarRechazadas();
  },

  _filtrarRechazadas() {
    const q    = (document.getElementById('rechBuscar')?.value || '').toLowerCase();
    const area = document.getElementById('rechArea')?.value || '';
    const hoy  = new Date();
    const unaSemanaMsAtras = hoy.getTime() - 7 * 24 * 3600 * 1000;

    const filtrados = this._dataRech.filter(d => {
      const matchQ = !q ||
        (d.NombreColaborador || '').toLowerCase().includes(q) ||
        String(d.Legajo).includes(q) ||
        (d.NumeroSolicitud || '').toLowerCase().includes(q);
      const matchA = !area || d.AreaExtraID === area;
      return matchQ && matchA;
    });

    const el = document.getElementById('rechContent');
    if (!el) return;

    if (!filtrados.length) {
      el.innerHTML = `<div class="card" style="padding:2rem;text-align:center">
        <p style="color:var(--c-gray-500)">No se encontraron colaboradores rechazados.</p>
      </div>`;
      return;
    }

    // Agrupar rechazados por solicitud
    const grouped = {};
    for (const d of filtrados) {
      if (!grouped[d.NumeroSolicitud]) grouped[d.NumeroSolicitud] = { ...d, filas: [] };
      grouped[d.NumeroSolicitud].filas.push(d);
    }

    el.innerHTML = Object.values(grouped).map(group => {
      const s = group;
      const rows = group.filas.map(c => {
        const fechaSol  = new Date(c.FechaSolicitud || c.FechaInicioExtra);
        const esReciente = !isNaN(fechaSol) && fechaSol.getTime() >= unaSemanaMsAtras;
        return `<tr>
          <td style="font-weight:600">${c.NombreColaborador || '–'} ${Helpers.ibBadge(c.IBSnapshot)}</td>
          <td class="font-mono text-xs">${c.Legajo}</td>
          <td class="font-mono">${Helpers.formatHoras(c.CantidadHoras)}</td>
          <td style="font-size:.8rem;color:var(--c-danger)">${c.ObservacionAprobacion || '–'}</td>
          <td>
            ${esReciente
              ? `<button class="btn btn-success btn-sm" onclick="Aprobaciones._reaprobarColab('${c.ID}','${c.NumeroSolicitud}')">
                  ↺ Aprobar
                </button>`
              : `<span style="font-size:.75rem;color:var(--c-gray-400)" title="Solo se puede re-aprobar en los 7 días posteriores al rechazo">
                  Expirado
                </span>`}
          </td>
        </tr>`;
      }).join('');

      return `
        <div class="card" style="margin-bottom:1.25rem">
          <div class="card-header">
            <div>
              <span class="font-mono" style="font-size:1rem;font-weight:800">N° ${s.NumeroSolicitud}</span>
              <span style="margin-left:.75rem;font-size:.82rem;color:var(--c-gray-500)">${Helpers.formatDate(s.FechaSolicitud)}</span>
              <span class="badge badge-danger" style="margin-left:.5rem">RECHAZADA</span>
            </div>
          </div>
          <div class="card-body">
            <div style="font-size:.85rem;margin-bottom:.75rem">
              <strong>Solicitante:</strong> ${s.NombreSolicitante || '–'} &nbsp;·&nbsp;
              <strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)} &nbsp;·&nbsp;
              <strong>Área:</strong> ${s.AreaExtraID || '–'}
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Colaborador</th><th>Legajo</th><th>Horas</th><th>Motivo rechazo</th><th>Acción</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  // ── Acciones ──────────────────────────────────────────────
  async _aprobarTodo(num) {
    const obs = await this._pedirObs('Observación de aprobación (opcional):');
    if (obs === null) return;
    const res = await API.aprobarSolicitud({ numeroSolicitud: num, tipo: 'total', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error al aprobar.'); return; }
    UI.success('Solicitud aprobada.');
    this._cargarTodo();
  },

  async _rechazarTodo(num) {
    const obs = await this._pedirObs('Motivo de rechazo (requerido):', true);
    if (obs === null || obs.trim() === '') return;
    const res = await API.rechazarSolicitud({ numeroSolicitud: num, tipo: 'total', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error al rechazar.'); return; }
    UI.success('Solicitud rechazada.');
    this._cargarTodo();
  },

  async _aprobarColab(rowId, num) {
    const obs = await this._pedirObs('Observación (opcional):');
    if (obs === null) return;
    const res = await API.aprobarSolicitud({ rowId, numeroSolicitud: num, tipo: 'parcial', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error.'); return; }
    UI.success('Colaborador aprobado.');
    this._cargarTodo();
  },

  async _rechazarColab(rowId, num) {
    const obs = await this._pedirObs('Motivo de rechazo:', true);
    if (obs === null || obs.trim() === '') return;
    const res = await API.rechazarSolicitud({ rowId, numeroSolicitud: num, tipo: 'parcial', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error.'); return; }
    UI.success('Colaborador rechazado.');
    this._cargarTodo();
  },

  async _reaprobarColab(rowId, num) {
    const ok = await UI.confirm({
      title:       'Re-aprobar colaborador',
      message:     '¿Querés aprobar este colaborador rechazado? Solo es posible dentro de los 7 días del rechazo.',
      type:        'warning',
      confirmText: 'Sí, aprobar',
    });
    if (!ok) return;
    const obs = await this._pedirObs('Observación (opcional):');
    if (obs === null) return;
    const res = await API.aprobarSolicitud({ rowId, numeroSolicitud: num, tipo: 'parcial', observacion: obs });
    if (!res?.ok) { UI.error(res?.error || 'Error al re-aprobar.'); return; }
    UI.success('Colaborador re-aprobado.');
    this._cargarTodo();
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

