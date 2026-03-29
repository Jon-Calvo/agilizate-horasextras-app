/* ============================================================
   AGILIZATE – Módulo Portería
   ============================================================ */

const Porteria = {
  _data: [],

  async init() {
    UI.registerSection('porteria', () => Porteria.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Control de Portería</h2>
          <p class="section-subtitle">Horas extras aprobadas para hoy – ${Helpers.formatDate(Helpers.today())}</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Porteria.render()">↻ Actualizar</button>
      </div>

      <div class="filter-bar">
        <div class="form-group">
          <label>Buscar colaborador / legajo</label>
          <input type="text" id="pSearch" placeholder="Nombre o legajo..." oninput="Porteria.filtrar()" />
        </div>
        <div class="form-group">
          <label>Área</label>
          <select id="pArea" onchange="Porteria.filtrar()">
            <option value="">Todas las áreas</option>
          </select>
        </div>
        <div class="form-group">
          <label>Estado Ingreso</label>
          <select id="pIngreso" onchange="Porteria.filtrar()">
            <option value="">Todos</option>
            <option value="si">Registrado</option>
            <option value="no">Pendiente</option>
          </select>
        </div>
      </div>

      <div id="porteriaContent">
        <div class="loading-screen"><div class="loading-spinner"></div><p>Cargando aprobadas del día…</p></div>
      </div>
    `;

    const res = await API.getAprobadsHoy();
    this._data = res?.data || [];

    // Cargar áreas en el filtro
    const areas = [...new Set(this._data.map(d => d.AreaExtraID).filter(Boolean))];
    const areaSelect = document.getElementById('pArea');
    if (areaSelect && areas.length) {
      areaSelect.innerHTML = `<option value="">Todas las áreas</option>` +
        areas.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    this._renderCards(this._data);
  },

  filtrar() {
    const search  = document.getElementById('pSearch')?.value?.toLowerCase() || '';
    const area    = document.getElementById('pArea')?.value || '';
    const ingreso = document.getElementById('pIngreso')?.value || '';

    const filtered = this._data.filter(d => {
      const matchSearch = !search ||
        (d.ApellidoNombre || '').toLowerCase().includes(search) ||
        String(d.Legajo).includes(search);
      const matchArea   = !area   || d.AreaExtraID === area;
      const matchIng    = !ingreso || (ingreso === 'si' ? d.RegistroIngreso === 'SI' : d.RegistroIngreso !== 'SI');
      return matchSearch && matchArea && matchIng;
    });

    this._renderCards(filtered);
  },

  _renderCards(data) {
    const el = document.getElementById('porteriaContent');
    if (!el) return;

    if (!data.length) {
      el.innerHTML = `
        <div class="empty-state card" style="padding:3rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <h4>Sin aprobadas para hoy</h4>
          <p>No hay horas extras programadas para el día de hoy.</p>
        </div>`;
      return;
    }

    const canRegister = Permisos.puedePorteriaRegistrar();

    const cards = data.map(d => {
      const ingresado = d.RegistroIngreso === 'SI';
      return `
        <div class="porteria-card ${ingresado ? 'ingresado' : ''}">
          <div class="flex justify-between items-center" style="margin-bottom:.75rem">
            <div>
              <div style="font-weight:700;font-size:1rem">${d.ApellidoNombre}</div>
              <div style="font-size:.8rem;color:var(--c-gray-500)">Legajo: ${d.Legajo} | ${d.SectorExtra || '–'}</div>
            </div>
            <div style="text-align:right">
              ${ingresado
                ? `<span class="badge badge-success">✓ Ingresó</span>`
                : `<span class="badge badge-warning">Pendiente</span>`
              }
            </div>
          </div>

          <div style="font-size:.825rem;color:var(--c-gray-600);margin-bottom:.75rem">
            <strong>Horario:</strong> ${d.HoraInicioExtraProgramada || '–'} |
            <strong>N° Sol:</strong> ${d.NumeroSolicitud}
          </div>

          ${ingresado ? `
            <div style="font-size:.825rem;color:var(--c-success)">
              ✓ Hora de ingreso: <strong>${d.HoraIngresoReal || 'Sin registrar'}</strong>
              ${d.UsuarioRegistro ? `· Registrado por: ${d.UsuarioRegistro}` : ''}
            </div>
          ` : canRegister ? `
            <div class="flex gap-2 items-center">
              <input type="time" id="horaIng_${d.ID}" placeholder="HH:MM" style="
                flex:1;padding:.4rem .6rem;border:1.5px solid var(--c-gray-200);
                border-radius:var(--radius-sm);font-size:.85rem" />
              <button class="btn btn-success btn-sm" onclick="Porteria.registrar('${d.ID}', '${d.SolicitudID}')">
                ✓ Registrar Ingreso
              </button>
            </div>
          ` : ''}

          ${d.Observaciones ? `<p style="font-size:.75rem;color:var(--c-gray-400);margin-top:.5rem">${d.Observaciones}</p>` : ''}
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div style="margin-bottom:.75rem;font-size:.875rem;color:var(--c-gray-500)">
        Mostrando <strong>${data.length}</strong> colaborador(es)
        · Ingresados: <strong style="color:var(--c-success)">${data.filter(d => d.RegistroIngreso === 'SI').length}</strong>
        · Pendientes: <strong style="color:var(--c-warning)">${data.filter(d => d.RegistroIngreso !== 'SI').length}</strong>
      </div>
      <div class="porteria-grid">${cards}</div>
    `;
  },

  async registrar(controlId, solicitudId) {
    const horaEl  = document.getElementById(`horaIng_${controlId}`);
    const horaIng = horaEl?.value || '';

    const res = await API.registrarIngreso({
      controlId,
      solicitudId,
      horaIngreso: horaIng,
      registroIngreso: 'SI',
    });

    if (!res?.ok) return UI.error(res?.error || 'Error al registrar.');
    UI.success('Ingreso registrado correctamente.');
    this.render();
  },
};
