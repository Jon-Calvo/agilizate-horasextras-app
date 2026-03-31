/* ============================================================
   AGILIZATE – Módulo Portería  [CORREGIDO v1.2]
   ============================================================
   FIXES:
   5a) Horario en formato hh:mm (en lugar de solo la hora inicio)
   5b) Filtro por fecha — por defecto hoy, pero editable
   ============================================================ */

const Porteria = {
  _data:       [],
  _fechaActual: null,   // fecha seleccionada en el filtro

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    // Por defecto: hoy
    if (!this._fechaActual) this._fechaActual = Helpers.today();

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Control de Portería</h2>
          <p class="section-subtitle" id="porteriaSubtitle">Cargando…</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Porteria._cargar()">↻ Actualizar</button>
      </div>

      <div class="filter-bar">
        <!-- FIX 5b: filtro por fecha -->
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="pFecha" value="${this._fechaActual}"
            onchange="Porteria._onFechaChange()" />
        </div>
        <div class="form-group" style="flex:2">
          <label>Buscar colaborador / legajo</label>
          <input type="text" id="pSearch" placeholder="Nombre o legajo…" oninput="Porteria._filtrar()" />
        </div>
        <div class="form-group">
          <label>Área</label>
          <select id="pArea" onchange="Porteria._filtrar()">
            <option value="">Todas las áreas</option>
          </select>
        </div>
        <div class="form-group">
          <label>Estado Ingreso</label>
          <select id="pIngreso" onchange="Porteria._filtrar()">
            <option value="">Todos</option>
            <option value="si">Registrado</option>
            <option value="no">Pendiente</option>
          </select>
        </div>
      </div>

      <div id="porteriaStats" style="display:flex;gap:.75rem;margin-bottom:1rem;flex-wrap:wrap"></div>

      <div id="porteriaContent">
        <div class="loading-screen" style="min-height:200px"><div class="loading-spinner"></div></div>
      </div>`;

    await this._cargar();
  },

  _onFechaChange() {
    const val = document.getElementById('pFecha')?.value;
    if (val) {
      this._fechaActual = val;
      this._cargar();
    }
  },

  async _cargar() {
    try {
      // FIX 5b: pasamos la fecha seleccionada al backend
      const res  = await API.getAprobadsHoy({ fecha: this._fechaActual });
      this._data = res?.data || [];

      // Actualizar subtítulo con la fecha seleccionada
      const sub = document.getElementById('porteriaSubtitle');
      if (sub) {
        const eHoy = this._fechaActual === Helpers.today();
        sub.textContent = eHoy
          ? `Horas extras aprobadas para hoy — ${Helpers.formatDate(this._fechaActual)}`
          : `Horas extras aprobadas para el ${Helpers.formatDate(this._fechaActual)}`;
      }

      // Cargar áreas en el filtro
      const areas = [...new Set(this._data.map(d => d.AreaExtraID).filter(Boolean))];
      const sel   = document.getElementById('pArea');
      if (sel) {
        const prevArea = sel.value;
        sel.innerHTML  = `<option value="">Todas las áreas</option>` +
          areas.map(a => `<option value="${a}" ${a === prevArea ? 'selected' : ''}>${a}</option>`).join('');
      }

      this._renderStats(this._data);
      this._filtrar();

    } catch (err) {
      const el = document.getElementById('porteriaContent');
      if (el) el.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  _renderStats(data) {
    const el = document.getElementById('porteriaStats');
    if (!el) return;
    const total      = data.length;
    const ingresados = data.filter(d => d.RegistroIngreso === 'SI').length;
    const pendientes = total - ingresados;

    el.innerHTML = `
      <div class="stat-card" style="flex:1;min-width:150px">
        <div class="stat-label">Total del día</div>
        <div class="stat-value">${total}</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:150px">
        <div class="stat-label">Ingresaron</div>
        <div class="stat-value" style="color:var(--c-success)">${ingresados}</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:150px">
        <div class="stat-label">Pendientes</div>
        <div class="stat-value" style="color:var(--c-warning)">${pendientes}</div>
      </div>`;
  },

  _filtrar() {
    const search  = (document.getElementById('pSearch')?.value  || '').toLowerCase();
    const area    = document.getElementById('pArea')?.value     || '';
    const ingreso = document.getElementById('pIngreso')?.value  || '';

    const filtered = this._data.filter(d => {
      const matchS = !search  || (d.ApellidoNombre || '').toLowerCase().includes(search) || String(d.Legajo).includes(search);
      const matchA = !area    || d.AreaExtraID === area;
      const matchI = !ingreso || (ingreso === 'si' ? d.RegistroIngreso === 'SI' : d.RegistroIngreso !== 'SI');
      return matchS && matchA && matchI;
    });

    this._renderCards(filtered);
  },

  // FIX 5a: formatear horario como hh:mm – hh:mm
  _formatHorario(horaInicio, horaFin) {
    const fmt = (h) => {
      if (!h) return '–';
      // Si ya viene como "HH:mm" o "HH:mm:ss", tomar solo los primeros 5 chars
      const s = String(h).trim();
      return s.length >= 5 ? s.substring(0, 5) : s;
    };
    return `${fmt(horaInicio)} – ${fmt(horaFin)}`;
  },

  _renderCards(data) {
    const el = document.getElementById('porteriaContent');
    if (!el) return;

    if (!data.length) {
      el.innerHTML = `
        <div class="card" style="padding:3rem;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:.75rem">🏠</div>
          <h4>Sin colaboradores para mostrar</h4>
          <p style="color:var(--c-gray-500)">No hay horas extras aprobadas para esta fecha o no coinciden con los filtros.</p>
        </div>`;
      return;
    }

    const canReg = Permisos.puedePorteriaRegistrar();

    const cards = data.map(d => {
      const ingresado = d.RegistroIngreso === 'SI';

      // FIX 5a: horario completo en hh:mm – hh:mm
      const horario = this._formatHorario(
        d.HoraInicioExtraProgramada || d.HoraInicioExtra,
        d.HoraFinExtra
      );

      return `
        <div class="porteria-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.6rem">
            <div>
              <div style="font-weight:700;font-size:.95rem">${d.ApellidoNombre || '–'}</div>
              <div style="font-size:.78rem;color:var(--c-gray-500)">
                Legajo: ${d.Legajo} &nbsp;|&nbsp; Sector: ${d.SectorExtra || '–'}
              </div>
            </div>
            <span class="badge ${ingresado ? 'badge-success' : 'badge-warning'}">
              ${ingresado ? '✓ Ingresó' : 'Pendiente'}
            </span>
          </div>

          <div style="font-size:.8rem;color:var(--c-gray-600);margin-bottom:.6rem">
            <strong>N° Sol.:</strong> ${d.NumeroSolicitud || '–'} &nbsp;·&nbsp;
            <strong>Horario:</strong> <span style="font-family:var(--font-mono);font-weight:600">${horario}</span> &nbsp;·&nbsp;
            <strong>Área:</strong> ${d.AreaExtraID || '–'}
          </div>

          ${ingresado
            ? `<div style="font-size:.82rem;color:var(--c-success);font-weight:600">
                ✓ Hora real: <span style="font-family:var(--font-mono)">${this._formatHorario(d.HoraIngresoReal, null).replace(' – –', '')}</span>
                ${d.DiferenciaMinutos ? ` (${d.DiferenciaMinutos > 0 ? '+' : ''}${d.DiferenciaMinutos} min)` : ''}
                ${d.UsuarioRegistro ? `· Reg. por: ${d.UsuarioRegistro}` : ''}
              </div>`
            : canReg
              ? `<div style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem">
                  <input type="time" id="hIng_${d.ID}"
                    style="flex:1;padding:.4rem .6rem;border:1.5px solid var(--c-gray-200);border-radius:var(--radius-sm);font-size:.85rem;font-family:var(--font-mono)" />
                  <button class="btn btn-success btn-sm" onclick="Porteria._registrar('${d.ID}','${d.SolicitudID}')">
                    ✓ Registrar
                  </button>
                </div>`
              : '<div style="font-size:.8rem;color:var(--c-gray-400)">Sin permiso para registrar</div>'
          }
        </div>`;
    }).join('');

    el.innerHTML = `<div class="porteria-grid">${cards}</div>`;
  },

  async _registrar(controlId, solicitudId) {
    const horaEl  = document.getElementById(`hIng_${controlId}`);
    const horaIng = horaEl?.value || '';

    if (!horaIng) {
      UI.warning('Ingresá la hora de ingreso antes de registrar.');
      return;
    }

    const res = await API.registrarIngreso({
      controlId,
      solicitudId,
      horaIngreso:     horaIng,
      registroIngreso: 'SI',
    });

    if (!res?.ok) { UI.error(res?.error || 'Error al registrar.'); return; }
    UI.success('Ingreso registrado.');
    this._cargar();
  },
};
