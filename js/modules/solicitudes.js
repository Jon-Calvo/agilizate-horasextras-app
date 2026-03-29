/* ============================================================
   AGILIZATE – Módulo Solicitudes (fixed)
   ============================================================ */

const Solicitudes = {
  _data:     [],
  _page:     1,
  _total:    0,
  _filtros:  {},
  _catalogs: null, // null = no cargados aún

  // ── render ────────────────────────────────────────────────
  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    // Cargar catálogos la primera vez (o siempre para tener datos frescos)
    await this._loadCatalogs();

    // Construir shell de la sección
    content.innerHTML = this._buildShell();

    // Cargar datos de la tabla
    await this._cargarTabla();

    // Adjuntar eventos de filtro (Enter en texto)
    const numInput = document.getElementById('fNumero');
    if (numInput) numInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.aplicarFiltros(); });
  },

  // ── Catálogos ─────────────────────────────────────────────
  async _loadCatalogs() {
    try {
      const [areasRes, motivosRes, nominaRes, vhRes] = await Promise.all([
        API.getAreas(),
        API.getMotivos(),
        API.getNomina({ soloActivos: true }),
        API.getValorHora(),
      ]);
      this._catalogs = {
        areas:     areasRes?.data    || [],
        motivos:   (motivosRes?.data || []).filter(m => m.Activo === 'TRUE' || m.Activo === true),
        nomina:    (nominaRes?.data  || []).filter(n => n.Estado === 'ACTIVO'),
        valorHora: (vhRes?.data      || []).filter(v => v.Activo === 'TRUE' || v.Activo === true),
      };
    } catch (err) {
      console.warn('Error cargando catálogos de solicitudes:', err.message);
      this._catalogs = { areas: [], motivos: [], nomina: [], valorHora: [] };
    }
  },

  // ── Shell HTML ────────────────────────────────────────────
  _buildShell() {
    const user      = Auth.currentUser;
    const isUsuario = user?.RolID === CONFIG.ROLES.USUARIO;
    const cats      = this._catalogs || { areas: [] };
    const areasUnicas = [...new Map((cats.areas || []).map(a => [a.Area, a])).values()];

    const canCreate = Permisos.puedeCrearSolicitud();
    const canExport = Permisos.puedeExportarExcel();

    return `
      <div class="section-header">
        <div>
          <h2 class="section-title">Solicitudes de Horas Extras</h2>
          <p class="section-subtitle" id="solSubtitle">Cargando…</p>
        </div>
        <div class="flex gap-2">
          ${canExport ? `<button class="btn btn-ghost btn-sm" onclick="Solicitudes.exportar()">⬇ Excel</button>` : ''}
          ${canCreate ? `<button class="btn btn-primary" onclick="Solicitudes.abrirFormulario()">+ Nueva Solicitud</button>` : ''}
        </div>
      </div>

      <div class="filter-bar">
        <div class="form-group">
          <label>Desde</label>
          <input type="date" id="fFechaDesde" value="${this._filtros.fechaDesde || Helpers.firstDayOfMonth()}" />
        </div>
        <div class="form-group">
          <label>Hasta</label>
          <input type="date" id="fFechaHasta" value="${this._filtros.fechaHasta || Helpers.today()}" />
        </div>
        ${!isUsuario ? `
        <div class="form-group">
          <label>Área</label>
          <select id="fArea">
            <option value="">Todas</option>
            ${areasUnicas.map(a => `<option value="${a.Area}" ${this._filtros.area === a.Area ? 'selected' : ''}>${a.Area}</option>`).join('')}
          </select>
        </div>` : ''}
        <div class="form-group">
          <label>Estado</label>
          <select id="fEstado">
            <option value="">Todos</option>
            <option value="PENDIENTE APROBACION" ${this._filtros.estado === 'PENDIENTE APROBACION' ? 'selected' : ''}>Pendiente</option>
            <option value="APROBADA"             ${this._filtros.estado === 'APROBADA'             ? 'selected' : ''}>Aprobada</option>
            <option value="RECHAZADA"            ${this._filtros.estado === 'RECHAZADA'            ? 'selected' : ''}>Rechazada</option>
            <option value="PARCIAL"              ${this._filtros.estado === 'PARCIAL'              ? 'selected' : ''}>Parcial</option>
          </select>
        </div>
        <div class="form-group">
          <label>N° Solicitud</label>
          <input type="text" id="fNumero" placeholder="Buscar…" value="${this._filtros.numero || ''}" />
        </div>
        <div style="display:flex;gap:.4rem;align-items:flex-end">
          <button class="btn btn-primary btn-sm" style="margin-bottom:1.1rem" onclick="Solicitudes.aplicarFiltros()">Filtrar</button>
          <button class="btn btn-ghost  btn-sm" style="margin-bottom:1.1rem" onclick="Solicitudes.limpiarFiltros()">Limpiar</button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap" id="solTableWrap">
          <div class="loading-screen" style="min-height:200px"><div class="loading-spinner"></div></div>
        </div>
        <div id="solPaginacion"></div>
      </div>
    `;
  },

  // ── Cargar tabla ──────────────────────────────────────────
  async _cargarTabla() {
    const wrap = document.getElementById('solTableWrap');
    if (!wrap) return;

    try {
      const user      = Auth.currentUser;
      const isUsuario = user?.RolID === CONFIG.ROLES.USUARIO;

      const params = {
        ...this._filtros,
        area:    isUsuario ? user.AreaID : (this._filtros.area || ''),
        page:    this._page,
        perPage: CONFIG.ROWS_PER_PAGE,
      };

      const res   = await API.getSolicitudes(params);
      this._data  = res?.data  || [];
      this._total = res?.total || 0;

      const sub = document.getElementById('solSubtitle');
      if (sub) sub.textContent = `${this._total} registro(s) encontrado(s)`;

      wrap.innerHTML = this._buildTabla();

      const pagDiv = document.getElementById('solPaginacion');
      const pages  = Math.ceil(this._total / CONFIG.ROWS_PER_PAGE) || 1;
      if (pagDiv) pagDiv.innerHTML = Helpers.paginationHTML(this._page, pages, 'Solicitudes._goPage');

    } catch (err) {
      wrap.innerHTML = `<div class="empty-state" style="padding:2rem">
        <h4>Error al cargar</h4>
        <p style="color:var(--c-danger)">${err.message}</p>
        <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="Solicitudes._cargarTabla()">Reintentar</button>
      </div>`;
    }
  },

  // ── Tabla HTML ────────────────────────────────────────────
  _buildTabla() {
    if (!this._data.length) {
      return `<div class="empty-state" style="padding:3rem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;margin:0 auto 1rem;opacity:.3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <h4>Sin solicitudes</h4>
        <p>No se encontraron registros con los filtros aplicados.</p>
      </div>`;
    }

    const canMod   = Permisos.puedeModificarSolicitud();
    const canDel   = Permisos.puedeEliminarSolicitud();
    const canApr   = Permisos.puedeAprobar();

    const rows = this._data.map(s => {
      const isPend = s.StatusSolicitud === 'PENDIENTE APROBACION';
      return `<tr>
        <td class="font-mono" style="font-size:.82rem;font-weight:700">${s.NumeroSolicitud || '–'}</td>
        <td style="font-size:.82rem">${Helpers.formatDate(s.FechaSolicitud)}</td>
        <td style="font-size:.82rem">${s.NombreSolicitante || '–'}</td>
        <td style="font-size:.82rem;white-space:nowrap">${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}</td>
        <td>${s.NombreColaborador || '–'} ${Helpers.ibBadge(s.IBSnapshot)}</td>
        <td style="font-size:.82rem">${s.AreaExtraID || '–'}</td>
        <td>${s.TipoExtra ? `<span class="badge ${s.TipoExtra === 'PRODUCTIVO' ? 'badge-success' : 'badge-warning'}">${s.TipoExtra}</span>` : '–'}</td>
        <td class="font-mono" style="font-size:.82rem">${Helpers.formatHoras(s.CantidadHoras)}</td>
        <td class="font-mono" style="font-size:.82rem">${Helpers.formatARS(s.TotalGeneral)}</td>
        <td>${Helpers.statusBadge(s.StatusSolicitud)}</td>
        <td>
          <div style="display:flex;gap:.3rem;align-items:center">
            <button class="btn-icon" onclick="Solicitudes.verDetalle('${s.ID}')" title="Ver detalle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            ${canMod && isPend ? `
            <button class="btn-icon" onclick="Solicitudes.abrirFormulario('${s.ID}')" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>` : ''}
            ${canDel && isPend ? `
            <button class="btn-icon" style="color:var(--c-danger)" onclick="Solicitudes.eliminar('${s.ID}')" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>` : ''}
            ${canApr && isPend ? `
            <button class="btn btn-success btn-sm" onclick="UI.showSection('aprobaciones')">Aprobar</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    return `<table>
      <thead>
        <tr>
          <th>N° Sol.</th><th>Fecha</th><th>Solicitante</th><th>Período</th>
          <th>Colaborador</th><th>Área</th><th>Tipo</th><th>Horas</th>
          <th>Total ARS</th><th>Estado</th><th>Acciones</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  },

  // ── Filtros ───────────────────────────────────────────────
  aplicarFiltros() {
    this._filtros = {
      fechaDesde: document.getElementById('fFechaDesde')?.value || '',
      fechaHasta: document.getElementById('fFechaHasta')?.value || '',
      area:       document.getElementById('fArea')?.value       || '',
      estado:     document.getElementById('fEstado')?.value     || '',
      numero:     document.getElementById('fNumero')?.value     || '',
    };
    this._page = 1;
    this._cargarTabla();
  },

  limpiarFiltros() {
    this._filtros = {};
    this._page    = 1;
    this.render();
  },

  _goPage(p) {
    Solicitudes._page = p;
    Solicitudes._cargarTabla();
  },

  // ── Ver Detalle ───────────────────────────────────────────
  async verDetalle(id) {
    const res = await API.getSolicitudById(id);
    const s   = res?.data;
    if (!s) { UI.error('No se pudo cargar la solicitud.'); return; }

    UI.modal({
      id:    'modalDetalleSol',
      title: `Solicitud N° ${s.NumeroSolicitud}`,
      size:  'modal-lg',
      body: `
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
          <div>${Helpers.statusBadge(s.StatusSolicitud)}</div>
          <div><span class="badge badge-primary">${s.TipoExtra || '–'}</span></div>
        </div>
        <div class="form-row">
          <div><strong>Solicitante:</strong> ${s.NombreSolicitante || '–'}</div>
          <div><strong>Área/Sector:</strong> ${s.AreaSolicitanteID || '–'} / ${s.SectorSolicitanteID || '–'}</div>
        </div>
        <div class="form-row" style="margin-top:.6rem">
          <div><strong>Colaborador:</strong> ${s.NombreColaborador || '–'} ${Helpers.ibBadge(s.IBSnapshot)}</div>
          <div><strong>Legajo:</strong> ${s.Legajo || '–'} · <strong>Categoría:</strong> ${s.CategoriaSnapshot || '–'}</div>
        </div>
        <div class="form-row" style="margin-top:.6rem">
          <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}</div>
          <div><strong>Horario:</strong> ${s.HoraInicioExtra || '–'} – ${s.HoraFinExtra || '–'}</div>
        </div>
        <div class="form-row" style="margin-top:.6rem">
          <div><strong>Área Extra:</strong> ${s.AreaExtraID || '–'} / ${s.SectorExtraID || '–'}</div>
          <div><strong>Motivo:</strong> ${s.MotivoID || '–'}</div>
        </div>
        <div class="divider"></div>
        <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem">Detalle de Horas y Valores</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th>Horas</th><th>Valor/h</th><th>Total ARS</th></tr></thead>
            <tbody>
              <tr><td>Extra 50% Diurno</td>   <td class="font-mono">${Helpers.formatHoras(s.Horas50)}</td>          <td class="font-mono">${Helpers.formatARS(s.ValorHora50)}</td>          <td class="font-mono">${Helpers.formatARS(s.TotalValor50)}</td></tr>
              <tr><td>Extra 50% Nocturno</td> <td class="font-mono">${Helpers.formatHoras(s.Horas50Nocturno)}</td>  <td class="font-mono">${Helpers.formatARS(s.ValorHora50Nocturno)}</td>  <td class="font-mono">${Helpers.formatARS(s.TotalValor50Nocturno)}</td></tr>
              <tr><td>Extra 100% Diurno</td>  <td class="font-mono">${Helpers.formatHoras(s.Horas100)}</td>         <td class="font-mono">${Helpers.formatARS(s.ValorHora100)}</td>         <td class="font-mono">${Helpers.formatARS(s.TotalValor100)}</td></tr>
              <tr><td>Extra 100% Nocturno</td><td class="font-mono">${Helpers.formatHoras(s.Horas100Nocturno)}</td> <td class="font-mono">${Helpers.formatARS(s.ValorHora100Nocturno)}</td> <td class="font-mono">${Helpers.formatARS(s.TotalValor100Nocturno)}</td></tr>
              <tr style="font-weight:700;background:var(--c-gray-50)">
                <td colspan="3">TOTAL GENERAL</td>
                <td class="font-mono">${Helpers.formatARS(s.TotalGeneral)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ${s.ObservacionSolicitud  ? `<div class="alert alert-info"    style="margin-top:1rem"><strong>Obs. Solicitud:</strong> ${s.ObservacionSolicitud}</div>`  : ''}
        ${s.ObservacionAprobacion ? `<div class="alert alert-warning" style="margin-top:.5rem"><strong>Obs. Aprobación:</strong> ${s.ObservacionAprobacion}</div>` : ''}
        ${s.NombreAprobador       ? `<div style="margin-top:.5rem;font-size:.82rem;color:var(--c-gray-500)">Aprobado por: <strong>${s.NombreAprobador}</strong> el ${Helpers.formatDate(s.FechaAprobacion)}</div>` : ''}
      `,
      footer: `<button class="btn btn-ghost" onclick="UI.closeModal('modalDetalleSol')">Cerrar</button>`,
    });
  },

  // ── Abrir Formulario (Alta/Edición) ───────────────────────
  async abrirFormulario(id = null) {
    if (!Permisos.puedeCrearSolicitud() && !id) return;
    if (id && !Permisos.puedeModificarSolicitud()) return;

    // Asegurar catálogos
    if (!this._catalogs) await this._loadCatalogs();

    let solicitud = null;
    if (id) {
      const res = await API.getSolicitudById(id);
      solicitud = res?.data;
      if (!solicitud) { UI.error('No se pudo cargar la solicitud.'); return; }
    }

    const { areas, motivos } = this._catalogs;
    const areasUnicas = [...new Map(areas.map(a => [a.Area, a])).values()];

    this._colaboradores  = [];
    this._solicitudEditId = id;
    this._currentStep    = 1;

    UI.modal({
      id:   'modalSolicitud',
      title: id ? 'Editar Solicitud' : 'Nueva Solicitud de Horas Extras',
      size: 'modal-xl',
      body: `
        <!-- Step indicator -->
        <div style="display:flex;align-items:center;margin-bottom:1.5rem;overflow-x:auto;padding-bottom:.25rem">
          <div id="stepWrap1" style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:70px">
            <div id="stepCircle1" style="width:30px;height:30px;border-radius:50%;background:var(--c-blue-700);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">1</div>
            <span style="font-size:.7rem;font-weight:600;color:var(--c-blue-700)">General</span>
          </div>
          <div id="stepLine1" style="flex:1;height:2px;background:var(--c-gray-200);margin-bottom:1.1rem"></div>
          <div id="stepWrap2" style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:90px">
            <div id="stepCircle2" style="width:30px;height:30px;border-radius:50%;background:var(--c-gray-200);color:var(--c-gray-500);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">2</div>
            <span style="font-size:.7rem;font-weight:600;color:var(--c-gray-500)">Colaboradores</span>
          </div>
          <div id="stepLine2" style="flex:1;height:2px;background:var(--c-gray-200);margin-bottom:1.1rem"></div>
          <div id="stepWrap3" style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:80px">
            <div id="stepCircle3" style="width:30px;height:30px;border-radius:50%;background:var(--c-gray-200);color:var(--c-gray-500);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">3</div>
            <span style="font-size:.7rem;font-weight:600;color:var(--c-gray-500)">Confirmación</span>
          </div>
        </div>

        <!-- Paso 1 -->
        <div id="paso1">
          <div class="form-row">
            <div class="form-group"><label>Fecha Inicio Extra *</label><input type="date" id="sFI" value="${solicitud?.FechaInicioExtra || Helpers.today()}" onchange="Solicitudes._recalcHoras()" /></div>
            <div class="form-group"><label>Fecha Fin Extra *</label><input type="date" id="sFF" value="${solicitud?.FechaFinExtra || Helpers.today()}" onchange="Solicitudes._recalcHoras()" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Hora Inicio *</label><input type="time" id="sHI" value="${solicitud?.HoraInicioExtra || '08:00'}" onchange="Solicitudes._recalcHoras()" /></div>
            <div class="form-group"><label>Hora Fin *</label><input type="time" id="sHF" value="${solicitud?.HoraFinExtra || '12:00'}" onchange="Solicitudes._recalcHoras()" /></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Motivo *</label>
              <select id="sMotivo" onchange="Solicitudes._recalcHoras()">
                ${Helpers.buildOptions(motivos, 'IDMotivo', 'MotivoExtra', solicitud?.MotivoID)}
              </select>
            </div>
            <div class="form-group">
              <label>Área *</label>
              <select id="sArea" onchange="Solicitudes._onAreaChange()">
                ${Helpers.buildOptions(areasUnicas, 'Area', 'Area', solicitud?.AreaExtraID, 'Seleccionar área…')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Sector *</label>
              <select id="sSector"><option value="">— primero seleccioná un área —</option></select>
            </div>
            <div class="form-group">
              <label>Observación</label>
              <input type="text" id="sObs" placeholder="Opcional…" value="${solicitud?.ObservacionSolicitud || ''}" />
            </div>
          </div>
          <div id="sTipoInfo"  class="alert alert-info   hidden" style="margin-top:.5rem"></div>
          <div id="sHsCalculo" class="alert alert-success hidden" style="margin-top:.5rem"></div>
        </div>

        <!-- Paso 2 -->
        <div id="paso2" class="hidden">
          <div id="colabsContainer"></div>
          <button class="btn btn-ghost btn-sm" style="margin-top:.5rem" onclick="Solicitudes._agregarColabRow()">
            + Agregar Colaborador
          </button>
        </div>

        <!-- Paso 3 -->
        <div id="paso3" class="hidden">
          <div id="resumenContent"></div>
        </div>

        <div id="solFormError" class="alert alert-error hidden" style="margin-top:1rem"></div>
      `,
      footer: `
        <button class="btn btn-ghost"    id="btnAnt"    style="display:none" onclick="Solicitudes._stepBack()">← Anterior</button>
        <button class="btn btn-ghost"                                        onclick="UI.closeModal('modalSolicitud')">Cancelar</button>
        <button class="btn btn-primary"  id="btnSig"                        onclick="Solicitudes._stepNext()">Siguiente →</button>
        <button class="btn btn-success hidden" id="btnGuardar"              onclick="Solicitudes._guardar()">
          <span class="btn-text">✓ Guardar Solicitud</span>
          <span class="btn-loader hidden"><svg viewBox="0 0 24 24" class="spin" style="width:16px;height:16px"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>
        </button>
      `,
    });

    // Si hay área pre-seleccionada, cargar sectores
    if (solicitud?.AreaExtraID) {
      setTimeout(() => this._onAreaChange(solicitud.AreaExtraID, solicitud.SectorExtraID), 60);
    }
  },

  _onAreaChange(areaForzada, sectorForzado) {
    const area   = areaForzada || document.getElementById('sArea')?.value || '';
    const select = document.getElementById('sSector');
    if (!select) return;
    const sectores = (this._catalogs?.areas || []).filter(a => a.Area === area);
    select.innerHTML = Helpers.buildOptions(sectores, 'IDSector', 'Sector', sectorForzado, 'Seleccionar sector…');
  },

  _recalcHoras() {
    const fi  = document.getElementById('sFI')?.value;
    const ff  = document.getElementById('sFF')?.value;
    const hi  = document.getElementById('sHI')?.value;
    const hf  = document.getElementById('sHF')?.value;
    const mid = document.getElementById('sMotivo')?.value;
    const mot = this._catalogs?.motivos.find(m => m.IDMotivo === mid);

    const tipoEl  = document.getElementById('sTipoInfo');
    const calcEl  = document.getElementById('sHsCalculo');

    if (mot && tipoEl) {
      tipoEl.textContent = `Tipo Extra: ${mot.TipoExtra} (${mot.TipoExtra === 'PRODUCTIVO' ? '50%' : '100%'}) · Máx. ${mot.MaximoHorasDia} hs/día`;
      tipoEl.classList.remove('hidden');
    }

    if (fi && ff && hi && hf && mot) {
      const r = Helpers.calcularHoras(fi, ff, hi, hf, mot.TipoExtra);
      if (r && calcEl) {
        calcEl.innerHTML = `<strong>Cálculo:</strong> ${r.totalHoras} hs totales · 
          50% diurno: ${r.horas50} hs · 50% nocturno: ${r.horas50Nocturno} hs · 
          100% diurno: ${r.horas100} hs · 100% nocturno: ${r.horas100Nocturno} hs`;
        calcEl.classList.remove('hidden');
        this._hsResult = r;
      }
    }
  },

  _agregarColabRow() {
    const container = document.getElementById('colabsContainer');
    if (!container) return;

    const idx    = this._colaboradores.length;
    this._colaboradores.push({});

    const nomina = this._catalogs?.nomina || [];

    const div = document.createElement('div');
    div.className = 'colaborador-row';
    div.id = `colabRow_${idx}`;
    div.innerHTML = `
      <button class="btn-icon remove-row" style="position:absolute;top:.75rem;right:.75rem;color:var(--c-danger)"
        onclick="Solicitudes._quitarColab(${idx})" title="Quitar">✕</button>
      <div class="form-row">
        <div class="form-group">
          <label>Colaborador *</label>
          <select id="colabSel_${idx}" onchange="Solicitudes._onColabSel(${idx})">
            ${Helpers.buildOptions(nomina, 'Legajo', 'ApellidoNombre', '', 'Seleccionar colaborador…')}
          </select>
        </div>
        <div class="form-group">
          <label>IB Actual</label>
          <div id="colabIB_${idx}" style="padding:.65rem .9rem">–</div>
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <div id="colabCat_${idx}" style="padding:.65rem .9rem">–</div>
        </div>
        <div class="form-group">
          <label>Hs Período</label>
          <div id="colabHs_${idx}" style="padding:.65rem .9rem;font-family:var(--font-mono)">–</div>
        </div>
      </div>`;
    container.appendChild(div);
  },

  _quitarColab(idx) {
    const row = document.getElementById(`colabRow_${idx}`);
    if (row) row.remove();
    this._colaboradores[idx] = null;
  },

  _onColabSel(idx) {
    const legajo = document.getElementById(`colabSel_${idx}`)?.value;
    const colab  = this._catalogs?.nomina.find(n => String(n.Legajo) === String(legajo));
    if (!colab) return;

    this._colaboradores[idx] = colab;

    const ibEl  = document.getElementById(`colabIB_${idx}`);
    const catEl = document.getElementById(`colabCat_${idx}`);
    const hsEl  = document.getElementById(`colabHs_${idx}`);

    if (ibEl)  ibEl.innerHTML  = Helpers.ibBadge(colab.IB_Actual);
    if (catEl) catEl.textContent = colab.CategoriaID || '–';
    if (hsEl)  hsEl.textContent  = Helpers.formatHoras(colab.RankingHorasPeriodo);
  },

  _stepNext() {
    if (this._currentStep === 1) {
      if (!this._validarPaso1()) return;
      document.getElementById('paso1').classList.add('hidden');
      document.getElementById('paso2').classList.remove('hidden');
      document.getElementById('btnAnt').style.display = '';
      this._updateStepUI(2);
      this._currentStep = 2;

      // Agregar primera fila de colaborador si está vacío
      if (this._colaboradores.length === 0) this._agregarColabRow();

    } else if (this._currentStep === 2) {
      const colabs = this._colaboradores.filter(c => c && c.Legajo);
      if (!colabs.length) {
        this._setFormError('Agregá al menos un colaborador.');
        return;
      }
      this._clearFormError();

      document.getElementById('paso2').classList.add('hidden');
      document.getElementById('paso3').classList.remove('hidden');
      document.getElementById('btnSig').classList.add('hidden');
      document.getElementById('btnGuardar').classList.remove('hidden');
      this._updateStepUI(3);
      this._currentStep = 3;

      this._buildResumen(colabs);
    }
  },

  _stepBack() {
    if (this._currentStep === 2) {
      document.getElementById('paso2').classList.add('hidden');
      document.getElementById('paso1').classList.remove('hidden');
      document.getElementById('btnAnt').style.display = 'none';
      this._updateStepUI(1);
      this._currentStep = 1;

    } else if (this._currentStep === 3) {
      document.getElementById('paso3').classList.add('hidden');
      document.getElementById('paso2').classList.remove('hidden');
      document.getElementById('btnSig').classList.remove('hidden');
      document.getElementById('btnGuardar').classList.add('hidden');
      this._updateStepUI(2);
      this._currentStep = 2;
    }
  },

  _updateStepUI(activeStep) {
    for (let i = 1; i <= 3; i++) {
      const circle = document.getElementById(`stepCircle${i}`);
      if (!circle) continue;
      if (i < activeStep) {
        circle.style.background = 'var(--c-success)';
        circle.style.color      = '#fff';
      } else if (i === activeStep) {
        circle.style.background = 'var(--c-blue-700)';
        circle.style.color      = '#fff';
      } else {
        circle.style.background = 'var(--c-gray-200)';
        circle.style.color      = 'var(--c-gray-500)';
      }
    }
  },

  _validarPaso1() {
    const fi = document.getElementById('sFI')?.value;
    const ff = document.getElementById('sFF')?.value;
    const hi = document.getElementById('sHI')?.value;
    const hf = document.getElementById('sHF')?.value;
    const m  = document.getElementById('sMotivo')?.value;
    const a  = document.getElementById('sArea')?.value;
    const s  = document.getElementById('sSector')?.value;

    if (!fi || !ff || !hi || !hf || !m || !a || !s) {
      this._setFormError('Completá todos los campos obligatorios (*).');
      return false;
    }
    if (new Date(`${ff}T${hf}`) <= new Date(`${fi}T${hi}`)) {
      this._setFormError('La fecha/hora de fin debe ser posterior al inicio.');
      return false;
    }
    this._clearFormError();
    return true;
  },

  _buildResumen(colabs) {
    const fi   = document.getElementById('sFI')?.value;
    const ff   = document.getElementById('sFF')?.value;
    const hi   = document.getElementById('sHI')?.value;
    const hf   = document.getElementById('sHF')?.value;
    const mId  = document.getElementById('sMotivo')?.value;
    const aId  = document.getElementById('sArea')?.value;
    const sId  = document.getElementById('sSector')?.value;
    const obs  = document.getElementById('sObs')?.value;
    const mot  = this._catalogs?.motivos.find(m => m.IDMotivo === mId);

    let grandTotal = 0;
    const rows = colabs.map(colab => {
      const vhRow = this._catalogs?.valorHora.find(v => v.IDCategoria === colab.CategoriaID);
      const hs    = Helpers.calcularHoras(fi, ff, hi, hf, mot?.TipoExtra || 'PRODUCTIVO');
      const vals  = (vhRow && hs) ? Helpers.calcularValores(hs, vhRow) : null;
      grandTotal += vals?.totalGeneral || 0;

      return `<tr>
        <td>${colab.ApellidoNombre} ${Helpers.ibBadge(colab.IB_Actual)}</td>
        <td>${colab.CategoriaID || '–'}</td>
        <td class="font-mono">${Helpers.formatHoras(hs?.horas50)} / ${Helpers.formatHoras(hs?.horas50Nocturno)}</td>
        <td class="font-mono">${Helpers.formatHoras(hs?.horas100)} / ${Helpers.formatHoras(hs?.horas100Nocturno)}</td>
        <td class="font-mono" style="font-weight:700">${Helpers.formatARS(vals?.totalGeneral)}</td>
      </tr>`;
    }).join('');

    const el = document.getElementById('resumenContent');
    if (!el) return;
    el.innerHTML = `
      <div class="alert alert-info">
        <strong>Período:</strong> ${Helpers.formatDate(fi)} – ${Helpers.formatDate(ff)} | ${hi} – ${hf} &nbsp;|&nbsp;
        <strong>Motivo:</strong> ${mot?.MotivoExtra || mId} (${mot?.TipoExtra || '–'}) &nbsp;|&nbsp;
        <strong>Área:</strong> ${aId} / ${sId}
        ${obs ? ` &nbsp;|&nbsp; <strong>Obs.:</strong> ${obs}` : ''}
      </div>
      <div class="table-wrap" style="margin-top:1rem">
        <table>
          <thead><tr><th>Colaborador</th><th>Categoría</th><th>50% (D/N)</th><th>100% (D/N)</th><th>Total ARS</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="font-weight:700;background:var(--c-gray-50)">
              <td colspan="4">TOTAL GENERAL</td>
              <td class="font-mono">${Helpers.formatARS(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  },

  async _guardar() {
    UI.setLoading('btnGuardar', true);
    try {
      const fi   = document.getElementById('sFI')?.value;
      const ff   = document.getElementById('sFF')?.value;
      const hi   = document.getElementById('sHI')?.value;
      const hf   = document.getElementById('sHF')?.value;
      const mId  = document.getElementById('sMotivo')?.value;
      const aId  = document.getElementById('sArea')?.value;
      const sId  = document.getElementById('sSector')?.value;
      const obs  = document.getElementById('sObs')?.value;
      const mot  = this._catalogs?.motivos.find(m => m.IDMotivo === mId);
      const colabs = this._colaboradores.filter(c => c && c.Legajo);

      const colaboradoresDatos = colabs.map(colab => {
        const vhRow = this._catalogs?.valorHora.find(v => v.IDCategoria === colab.CategoriaID);
        const hs    = Helpers.calcularHoras(fi, ff, hi, hf, mot?.TipoExtra || 'PRODUCTIVO');
        const vals  = (vhRow && hs) ? Helpers.calcularValores(hs, vhRow) : {};
        return { ...colab, ...(hs || {}), ...(vals || {}) };
      });

      const payload = {
        fechaInicioExtra: fi, fechaFinExtra: ff,
        horaInicioExtra:  hi, horaFinExtra:  hf,
        motivoID:         mId,
        tipoExtra:        mot?.TipoExtra || 'PRODUCTIVO',
        areaExtraID:      aId,
        sectorExtraID:    sId,
        observacionSolicitud: obs || '',
        colaboradores:    colaboradoresDatos,
      };

      const fn  = this._solicitudEditId
        ? API.modificarSolicitud({ ...payload, id: this._solicitudEditId })
        : API.crearSolicitud(payload);

      const res = await fn;
      if (!res?.ok) throw new Error(res?.error || 'Error al guardar la solicitud.');

      UI.closeModal('modalSolicitud');
      UI.success(this._solicitudEditId ? 'Solicitud actualizada.' : 'Solicitud creada exitosamente.');
      await this._cargarTabla();

    } catch (err) {
      this._setFormError(err.message);
    } finally {
      UI.setLoading('btnGuardar', false);
    }
  },

  async eliminar(id) {
    const ok = await UI.confirm({
      title:       'Eliminar Solicitud',
      message:     '¿Estás seguro que querés eliminar esta solicitud? Esta acción no se puede deshacer.',
      type:        'danger',
      confirmText: 'Sí, eliminar',
    });
    if (!ok) return;

    const res = await API.eliminarSolicitud(id);
    if (!res?.ok) { UI.error(res?.error || 'Error al eliminar.'); return; }
    UI.success('Solicitud eliminada.');
    this._cargarTabla();
  },

  exportar() {
    if (!this._data.length) { UI.warning('No hay datos para exportar.'); return; }
    if (typeof Excel !== 'undefined') {
      Excel.exportarData(this._data, `solicitudes_${Helpers.today()}.xlsx`);
    } else {
      Helpers.downloadCSV(this._data, `solicitudes_${Helpers.today()}.csv`);
    }
  },

  _setFormError(msg) {
    const el = document.getElementById('solFormError');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  },
  _clearFormError() {
    const el = document.getElementById('solFormError');
    if (el) el.classList.add('hidden');
  },
};
