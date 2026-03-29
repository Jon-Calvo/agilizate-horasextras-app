/* ============================================================
   AGILIZATE – Módulo de Solicitudes
   ============================================================ */

const Solicitudes = {
  _data: [],
  _page: 1,
  _filtros: {},
  _catalogs: {},

  async init() {
    await this._loadCatalogs();
    await this.render();
    UI.registerSection('solicitudes', () => Solicitudes.render());
  },

  async _loadCatalogs() {
    const [areas, motivos, nomina, valorHora] = await Promise.all([
      API.getAreas(),
      API.getMotivos(),
      API.getNominaActivos(),
      API.getValorHora(),
    ]);
    this._catalogs = {
      areas:    areas?.data   || [],
      motivos:  motivos?.data || [],
      nomina:   (nomina?.data || []).filter(n => n.Estado === 'ACTIVO'),
      valorHora: valorHora?.data || [],
    };
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const user = Auth.currentUser;
    const filtros = this._filtros;

    // Construir filtros de área si es rol usuario
    const filtroArea = (user.RolID === CONFIG.ROLES.USUARIO) ? user.AreaID : filtros.area;

    const res = await API.getSolicitudes({
      ...filtros,
      area: filtroArea,
      page: this._page,
      perPage: CONFIG.ROWS_PER_PAGE,
    });

    this._data  = res?.data  || [];
    const total = res?.total || 0;
    const pages = Math.ceil(total / CONFIG.ROWS_PER_PAGE) || 1;

    content.innerHTML = this._buildHTML(pages, total);
    this._attachEvents();
  },

  _buildHTML(pages, total) {
    const canCreate   = Permisos.puedeCrearSolicitud();
    const canExport   = Permisos.puedeExportarExcel();
    const isAprobador = Permisos.puedeAprobar();

    return `
      <div class="section-header">
        <div>
          <h2 class="section-title">Solicitudes de Horas Extras</h2>
          <p class="section-subtitle">${total} registro(s) encontrado(s)</p>
        </div>
        <div class="flex gap-2">
          ${canExport ? `<button class="btn btn-ghost btn-sm" onclick="Solicitudes.exportar()">⬇ Exportar Excel</button>` : ''}
          ${canCreate ? `<button class="btn btn-primary" onclick="Solicitudes.abrirFormulario()">+ Nueva Solicitud</button>` : ''}
        </div>
      </div>

      ${this._buildFilterBar()}

      <div class="card">
        <div class="table-wrap">
          ${this._buildTable()}
        </div>
        ${Helpers.paginationHTML(this._page, pages, 'Solicitudes.goPage')}
      </div>
    `;
  },

  _buildFilterBar() {
    const areas  = this._catalogs.areas  || [];
    const motivos = this._catalogs.motivos || [];
    const user   = Auth.currentUser;
    const isUser = user?.RolID === CONFIG.ROLES.USUARIO;

    return `
      <div class="filter-bar">
        <div class="form-group">
          <label>Desde</label>
          <input type="date" id="fFechaDesde" value="${this._filtros.fechaDesde || Helpers.firstDayOfMonth()}" />
        </div>
        <div class="form-group">
          <label>Hasta</label>
          <input type="date" id="fFechaHasta" value="${this._filtros.fechaHasta || Helpers.today()}" />
        </div>
        ${!isUser ? `
        <div class="form-group">
          <label>Área</label>
          <select id="fArea">
            ${Helpers.buildOptions([...new Set(areas.map(a => a.Area))].map(a => ({ v: a, l: a })), 'v', 'l', this._filtros.area, 'Todas las áreas')}
          </select>
        </div>` : ''}
        <div class="form-group">
          <label>Estado</label>
          <select id="fEstado">
            <option value="">Todos</option>
            <option value="PENDIENTE APROBACION" ${this._filtros.estado === 'PENDIENTE APROBACION' ? 'selected' : ''}>Pendiente</option>
            <option value="APROBADA" ${this._filtros.estado === 'APROBADA' ? 'selected' : ''}>Aprobada</option>
            <option value="RECHAZADA" ${this._filtros.estado === 'RECHAZADA' ? 'selected' : ''}>Rechazada</option>
            <option value="PARCIAL" ${this._filtros.estado === 'PARCIAL' ? 'selected' : ''}>Parcial</option>
          </select>
        </div>
        <div class="form-group">
          <label>N° Solicitud</label>
          <input type="text" id="fNumero" placeholder="Buscar..." value="${this._filtros.numero || ''}" />
        </div>
        <div>
          <button class="btn btn-primary btn-sm" style="margin-top:1.35rem" onclick="Solicitudes.aplicarFiltros()">Filtrar</button>
          <button class="btn btn-ghost btn-sm" style="margin-top:1.35rem;margin-left:.4rem" onclick="Solicitudes.limpiarFiltros()">Limpiar</button>
        </div>
      </div>
    `;
  },

  _buildTable() {
    if (!this._data.length) {
      return `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        <h4>Sin solicitudes</h4>
        <p>No se encontraron registros con los filtros aplicados.</p>
      </div>`;
    }

    const canAprobar  = Permisos.puedeAprobar();
    const canModificar = Permisos.puedeModificarSolicitud();
    const canEliminar  = Permisos.puedeEliminarSolicitud();

    let rows = '';
    for (const s of this._data) {
      const isPendiente = s.StatusSolicitud === CONFIG.ESTADOS_SOLICITUD.PENDIENTE;
      const acciones = `
        <div class="flex gap-2" style="flex-wrap:nowrap">
          <button class="btn-icon" onclick="Solicitudes.verDetalle('${s.ID}')" data-tooltip="Ver detalle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          ${canModificar && isPendiente ? `<button class="btn-icon" onclick="Solicitudes.abrirFormulario('${s.ID}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>` : ''}
          ${canEliminar && isPendiente ? `<button class="btn-icon" style="color:var(--c-danger)" onclick="Solicitudes.eliminar('${s.ID}')" data-tooltip="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>` : ''}
          ${canAprobar && isPendiente ? `<button class="btn btn-success btn-sm" onclick="Solicitudes.abrirAprobacion('${s.NumeroSolicitud}')">Aprobar</button>` : ''}
        </div>
      `;

      rows += `<tr>
        <td><span class="font-mono text-sm">${s.NumeroSolicitud || '–'}</span></td>
        <td>${Helpers.formatDate(s.FechaSolicitud)}</td>
        <td>${s.NombreSolicitante || '–'}</td>
        <td>${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}</td>
        <td>${s.NombreColaborador || '–'} ${Helpers.ibBadge(s.IBSnapshot)}</td>
        <td>${s.AreaExtraID || '–'}</td>
        <td>${s.TipoExtra ? `<span class="badge ${s.TipoExtra === 'PRODUCTIVO' ? 'badge-success' : 'badge-warning'}">${s.TipoExtra}</span>` : '–'}</td>
        <td>${Helpers.formatHoras(s.CantidadHoras)}</td>
        <td>${Helpers.formatARS(s.TotalGeneral)}</td>
        <td>${Helpers.statusBadge(s.StatusSolicitud)}</td>
        <td>${acciones}</td>
      </tr>`;
    }

    return `<table>
      <thead>
        <tr>
          <th>N° Solicitud</th>
          <th>Fecha</th>
          <th>Solicitante</th>
          <th>Período Extra</th>
          <th>Colaborador</th>
          <th>Área</th>
          <th>Tipo</th>
          <th>Horas</th>
          <th>Total ARS</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  },

  _attachEvents() {
    // Search on enter
    const numero = document.getElementById('fNumero');
    if (numero) numero.addEventListener('keydown', e => { if (e.key === 'Enter') this.aplicarFiltros(); });
  },

  aplicarFiltros() {
    this._filtros = {
      fechaDesde: document.getElementById('fFechaDesde')?.value,
      fechaHasta: document.getElementById('fFechaHasta')?.value,
      area:       document.getElementById('fArea')?.value,
      estado:     document.getElementById('fEstado')?.value,
      numero:     document.getElementById('fNumero')?.value,
    };
    this._page = 1;
    this.render();
  },

  limpiarFiltros() {
    this._filtros = {};
    this._page    = 1;
    this.render();
  },

  goPage(page) {
    Solicitudes._page = page;
    Solicitudes.render();
  },

  // ── Ver Detalle ───────────────────────────────────────────
  async verDetalle(id) {
    const res = await API.getSolicitudById(id);
    const s   = res?.data;
    if (!s) return UI.error('No se pudo cargar la solicitud.');

    UI.modal({
      id: 'modalDetalle',
      title: `Solicitud N° ${s.NumeroSolicitud}`,
      size: 'modal-lg',
      body: `
        <div class="form-row">
          <div><strong>Estado:</strong> ${Helpers.statusBadge(s.StatusSolicitud)}</div>
          <div><strong>Tipo Extra:</strong> <span class="badge badge-primary">${s.TipoExtra}</span></div>
        </div>
        <div class="divider"></div>
        <div class="form-row">
          <div><strong>Solicitante:</strong> ${s.NombreSolicitante}</div>
          <div><strong>Área/Sector:</strong> ${s.AreaSolicitanteID} / ${s.SectorSolicitanteID}</div>
        </div>
        <div class="form-row">
          <div><strong>Colaborador:</strong> ${s.NombreColaborador} ${Helpers.ibBadge(s.IBSnapshot)}</div>
          <div><strong>Legajo:</strong> ${s.Legajo}</div>
        </div>
        <div class="form-row">
          <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}</div>
          <div><strong>Horario:</strong> ${s.HoraInicioExtra} – ${s.HoraFinExtra}</div>
        </div>
        <div class="divider"></div>
        <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem;color:var(--c-gray-700)">Horas y Valores</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th>Horas</th><th>Valor/h</th><th>Total ARS</th></tr></thead>
            <tbody>
              <tr><td>50% Diurno</td><td>${Helpers.formatHoras(s.Horas50)}</td><td>${Helpers.formatARS(s.ValorHora50)}</td><td>${Helpers.formatARS(s.TotalValor50)}</td></tr>
              <tr><td>50% Nocturno</td><td>${Helpers.formatHoras(s.Horas50Nocturno)}</td><td>${Helpers.formatARS(s.ValorHora50Nocturno)}</td><td>${Helpers.formatARS(s.TotalValor50Nocturno)}</td></tr>
              <tr><td>100% Diurno</td><td>${Helpers.formatHoras(s.Horas100)}</td><td>${Helpers.formatARS(s.ValorHora100)}</td><td>${Helpers.formatARS(s.TotalValor100)}</td></tr>
              <tr><td>100% Nocturno</td><td>${Helpers.formatHoras(s.Horas100Nocturno)}</td><td>${Helpers.formatARS(s.ValorHora100Nocturno)}</td><td>${Helpers.formatARS(s.TotalValor100Nocturno)}</td></tr>
              <tr style="font-weight:700;background:var(--c-gray-50)"><td colspan="3">TOTAL GENERAL</td><td>${Helpers.formatARS(s.TotalGeneral)}</td></tr>
            </tbody>
          </table>
        </div>
        ${s.ObservacionSolicitud ? `<div class="alert alert-info" style="margin-top:1rem"><strong>Obs. Solicitud:</strong> ${s.ObservacionSolicitud}</div>` : ''}
        ${s.ObservacionAprobacion ? `<div class="alert alert-warning" style="margin-top:.5rem"><strong>Obs. Aprobación:</strong> ${s.ObservacionAprobacion}</div>` : ''}
      `,
      footer: `<button class="btn btn-ghost" onclick="UI.closeModal('modalDetalle')">Cerrar</button>`,
    });
  },

  // ── Formulario Alta/Edición ───────────────────────────────
  async abrirFormulario(id = null) {
    if (!Auth.requirePermiso(CONFIG.PERMISOS.SOLICITUDES_CREAR)) return;

    let solicitud = null;
    if (id) {
      const res = await API.getSolicitudById(id);
      solicitud = res?.data;
    }

    const { areas, motivos } = this._catalogs;
    const user = Auth.currentUser;

    const areasUnicas = [...new Map(areas.map(a => [a.Area, a])).values()];

    const modalId = UI.modal({
      id: 'modalSolicitud',
      title: id ? 'Editar Solicitud' : 'Nueva Solicitud de Horas Extras',
      size: 'modal-xl',
      body: `
        <div class="step-indicator">
          <div class="step active" id="step1"><div class="step-circle">1</div><div class="step-label">General</div></div>
          <div class="step-line" id="line1"></div>
          <div class="step" id="step2"><div class="step-circle">2</div><div class="step-label">Colaboradores</div></div>
          <div class="step-line" id="line2"></div>
          <div class="step" id="step3"><div class="step-circle">3</div><div class="step-label">Confirmación</div></div>
        </div>

        <!-- Paso 1: Datos Generales -->
        <div id="pasoGeneral">
          <div class="form-row">
            <div class="form-group">
              <label>Fecha Inicio Extra *</label>
              <input type="date" id="fFechaInicio" value="${solicitud?.FechaInicioExtra || Helpers.today()}" required />
            </div>
            <div class="form-group">
              <label>Fecha Fin Extra *</label>
              <input type="date" id="fFechaFin" value="${solicitud?.FechaFinExtra || Helpers.today()}" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Hora Inicio *</label>
              <input type="time" id="fHoraInicio" value="${solicitud?.HoraInicioExtra || '08:00'}" required />
            </div>
            <div class="form-group">
              <label>Hora Fin *</label>
              <input type="time" id="fHoraFin" value="${solicitud?.HoraFinExtra || '12:00'}" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Motivo *</label>
              <select id="fMotivo" required onchange="Solicitudes._onMotivoChange()">
                ${Helpers.buildOptions(motivos.filter(m => m.Activo), 'IDMotivo', 'MotivoExtra', solicitud?.MotivoID)}
              </select>
            </div>
            <div class="form-group">
              <label>Área *</label>
              <select id="fAreaExtra" required onchange="Solicitudes._onAreaChange()">
                ${Helpers.buildOptions(areasUnicas, 'Area', 'Area', solicitud?.AreaExtraID, 'Seleccionar área...')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Sector *</label>
              <select id="fSectorExtra" required>
                <option value="">Primero seleccioná un área</option>
              </select>
            </div>
            <div class="form-group">
              <label>Observación</label>
              <input type="text" id="fObservacion" placeholder="Opcional..." value="${solicitud?.ObservacionSolicitud || ''}" />
            </div>
          </div>
          <div id="tipoExtraDisplay" class="alert alert-info hidden"></div>
          <div id="calcHorasDisplay" class="alert alert-success hidden"></div>
        </div>

        <!-- Paso 2: Colaboradores -->
        <div id="pasoColaboradores" class="hidden">
          <div id="colaboradoresContainer"></div>
          <button class="btn btn-ghost btn-sm" onclick="Solicitudes._agregarColaborador()">+ Agregar Colaborador</button>
        </div>

        <!-- Paso 3: Confirmación -->
        <div id="pasoConfirmacion" class="hidden">
          <div id="resumenSolicitud"></div>
        </div>

        <div id="formError" class="alert alert-error hidden" style="margin-top:1rem"></div>
      `,
      footer: `
        <button class="btn btn-ghost" id="btnAnterior" onclick="Solicitudes._stepAnterior()" style="display:none">← Anterior</button>
        <button class="btn btn-ghost" onclick="UI.closeModal('modalSolicitud')">Cancelar</button>
        <button class="btn btn-primary" id="btnSiguiente" onclick="Solicitudes._stepSiguiente()">Siguiente →</button>
        <button class="btn btn-success hidden" id="btnGuardar" onclick="Solicitudes.guardar('${id || ''}')">
          <span class="btn-text">Guardar Solicitud</span>
          <span class="btn-loader hidden"><svg viewBox="0 0 24 24" class="spin" style="width:16px"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>
        </button>
      `,
    });

    this._currentStep = 1;
    this._colaboradores = solicitud ? [] : [];
    this._solicitudEditId = id;

    // Cargar sectores si hay área
    if (solicitud?.AreaExtraID) this._onAreaChange(solicitud.AreaExtraID, solicitud.SectorExtraID);
  },

  _onMotivoChange() {
    const motivoId = document.getElementById('fMotivo')?.value;
    const motivo   = this._catalogs.motivos.find(m => m.IDMotivo === motivoId);
    const display  = document.getElementById('tipoExtraDisplay');
    if (!display || !motivo) return;
    display.textContent = `Tipo de Extra: ${motivo.TipoExtra} — Máx. horas/día: ${motivo.MaximoHorasDia}`;
    display.classList.remove('hidden');
    this._recalcularHoras();
  },

  _recalcularHoras() {
    const fi    = document.getElementById('fFechaInicio')?.value;
    const ff    = document.getElementById('fFechaFin')?.value;
    const hi    = document.getElementById('fHoraInicio')?.value;
    const hf    = document.getElementById('fHoraFin')?.value;
    const mId   = document.getElementById('fMotivo')?.value;
    const motivo = this._catalogs.motivos.find(m => m.IDMotivo === mId);
    const display = document.getElementById('calcHorasDisplay');
    if (!fi || !ff || !hi || !hf || !motivo || !display) return;

    const result = Helpers.calcularHoras(fi, ff, hi, hf, motivo.TipoExtra);
    if (!result) { display.classList.add('hidden'); return; }

    display.innerHTML = `
      <strong>Cálculo de horas:</strong> Total: <strong>${result.totalHoras} hs</strong> |
      50% Diurno: ${result.horas50} hs | 50% Nocturno: ${result.horas50Nocturno} hs |
      100% Diurno: ${result.horas100} hs | 100% Nocturno: ${result.horas100Nocturno} hs
    `;
    display.classList.remove('hidden');
    this._horasResult = result;
  },

  _onAreaChange(areaForzada, sectorForzado) {
    const area    = areaForzada || document.getElementById('fAreaExtra')?.value;
    const select  = document.getElementById('fSectorExtra');
    if (!select) return;
    const sectores = this._catalogs.areas.filter(a => a.Area === area);
    select.innerHTML = Helpers.buildOptions(sectores, 'IDSector', 'Sector', sectorForzado, 'Seleccionar sector...');
  },

  _agregarColaborador() {
    const container = document.getElementById('colaboradoresContainer');
    if (!container) return;
    const idx = this._colaboradores.length;
    this._colaboradores.push({});

    const nominaActiva = this._catalogs.nomina;

    const row = document.createElement('div');
    row.className = 'colaborador-row';
    row.id = `colab_${idx}`;
    row.innerHTML = `
      <button class="btn-icon remove-row" onclick="Solicitudes._quitarColaborador(${idx})" style="color:var(--c-danger)" data-tooltip="Quitar">✕</button>
      <div class="form-row">
        <div class="form-group">
          <label>Colaborador *</label>
          <select id="colabLegajo_${idx}" onchange="Solicitudes._onColabChange(${idx})" required>
            ${Helpers.buildOptions(nominaActiva, 'Legajo', 'ApellidoNombre', '', 'Buscar colaborador...')}
          </select>
        </div>
        <div class="form-group">
          <label>IB</label>
          <div id="colabIB_${idx}" style="padding:.65rem .9rem;font-weight:700">–</div>
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <div id="colabCat_${idx}" style="padding:.65rem .9rem">–</div>
        </div>
        <div class="form-group">
          <label>Ranking Hs Período</label>
          <div id="colabRanking_${idx}" style="padding:.65rem .9rem;font-family:var(--font-mono)">–</div>
        </div>
      </div>
    `;
    container.appendChild(row);
  },

  _quitarColaborador(idx) {
    const row = document.getElementById(`colab_${idx}`);
    if (row) row.remove();
    this._colaboradores[idx] = null;
  },

  _onColabChange(idx) {
    const legajo  = document.getElementById(`colabLegajo_${idx}`)?.value;
    const colab   = this._catalogs.nomina.find(n => String(n.Legajo) === String(legajo));
    if (!colab) return;

    this._colaboradores[idx] = colab;

    const ibEl      = document.getElementById(`colabIB_${idx}`);
    const catEl     = document.getElementById(`colabCat_${idx}`);
    const rankingEl = document.getElementById(`colabRanking_${idx}`);

    if (ibEl)      ibEl.innerHTML = Helpers.ibBadge(colab.IB_Actual);
    if (catEl)     catEl.textContent = colab.CategoriaID || '–';
    if (rankingEl) rankingEl.textContent = Helpers.formatHoras(colab.RankingHorasPeriodo);
  },

  _currentStep: 1,

  _stepSiguiente() {
    if (this._currentStep === 1) {
      if (!this._validarPaso1()) return;
      this._recalcularHoras();
      // Mostrar paso 2
      document.getElementById('pasoGeneral').classList.add('hidden');
      document.getElementById('pasoColaboradores').classList.remove('hidden');
      document.getElementById('step2').classList.add('active');
      document.getElementById('line1').classList.add('done');
      document.getElementById('btnAnterior').style.display = '';
      // Agregar al menos un colaborador
      if (this._colaboradores.length === 0) this._agregarColaborador();
      this._currentStep = 2;

    } else if (this._currentStep === 2) {
      const colabs = this._colaboradores.filter(c => c && c.Legajo);
      if (colabs.length === 0) {
        Helpers.el('formError').textContent = 'Agregá al menos un colaborador.';
        Helpers.el('formError').classList.remove('hidden');
        return;
      }
      Helpers.el('formError').classList.add('hidden');
      this._buildResumen(colabs);
      document.getElementById('pasoColaboradores').classList.add('hidden');
      document.getElementById('pasoConfirmacion').classList.remove('hidden');
      document.getElementById('step3').classList.add('active');
      document.getElementById('line2').classList.add('done');
      document.getElementById('btnSiguiente').classList.add('hidden');
      document.getElementById('btnGuardar').classList.remove('hidden');
      this._currentStep = 3;
    }
  },

  _stepAnterior() {
    if (this._currentStep === 2) {
      document.getElementById('pasoColaboradores').classList.add('hidden');
      document.getElementById('pasoGeneral').classList.remove('hidden');
      document.getElementById('btnAnterior').style.display = 'none';
      this._currentStep = 1;
    } else if (this._currentStep === 3) {
      document.getElementById('pasoConfirmacion').classList.add('hidden');
      document.getElementById('pasoColaboradores').classList.remove('hidden');
      document.getElementById('btnSiguiente').classList.remove('hidden');
      document.getElementById('btnGuardar').classList.add('hidden');
      this._currentStep = 2;
    }
  },

  _validarPaso1() {
    const fi = document.getElementById('fFechaInicio')?.value;
    const ff = document.getElementById('fFechaFin')?.value;
    const hi = document.getElementById('fHoraInicio')?.value;
    const hf = document.getElementById('fHoraFin')?.value;
    const m  = document.getElementById('fMotivo')?.value;
    const a  = document.getElementById('fAreaExtra')?.value;
    const s  = document.getElementById('fSectorExtra')?.value;

    if (!fi || !ff || !hi || !hf || !m || !a || !s) {
      Helpers.el('formError').textContent = 'Completá todos los campos obligatorios.';
      Helpers.el('formError').classList.remove('hidden');
      return false;
    }
    if (new Date(`${ff}T${hf}`) <= new Date(`${fi}T${hi}`)) {
      Helpers.el('formError').textContent = 'La fecha/hora de fin debe ser posterior al inicio.';
      Helpers.el('formError').classList.remove('hidden');
      return false;
    }
    Helpers.el('formError').classList.add('hidden');
    return true;
  },

  _buildResumen(colabs) {
    const fi     = document.getElementById('fFechaInicio')?.value;
    const ff     = document.getElementById('fFechaFin')?.value;
    const hi     = document.getElementById('fHoraInicio')?.value;
    const hf     = document.getElementById('fHoraFin')?.value;
    const mId    = document.getElementById('fMotivo')?.value;
    const aId    = document.getElementById('fAreaExtra')?.value;
    const sId    = document.getElementById('fSectorExtra')?.value;
    const obs    = document.getElementById('fObservacion')?.value;
    const motivo = this._catalogs.motivos.find(m => m.IDMotivo === mId);

    let rows = '';
    let grandTotal = 0;

    for (const colab of colabs) {
      const vhRow  = this._catalogs.valorHora.find(v => v.IDCategoria === colab.CategoriaID && v.Activo);
      const hs     = Helpers.calcularHoras(fi, ff, hi, hf, motivo?.TipoExtra || 'PRODUCTIVO');
      const vals   = vhRow ? Helpers.calcularValores(hs, vhRow) : null;
      grandTotal  += vals?.totalGeneral || 0;

      rows += `<tr>
        <td>${colab.ApellidoNombre} ${Helpers.ibBadge(colab.IB_Actual)}</td>
        <td>${colab.CategoriaID || '–'}</td>
        <td>${Helpers.formatHoras(hs?.horas50)} / ${Helpers.formatHoras(hs?.horas50Nocturno)}</td>
        <td>${Helpers.formatHoras(hs?.horas100)} / ${Helpers.formatHoras(hs?.horas100Nocturno)}</td>
        <td>${Helpers.formatARS(vals?.totalGeneral)}</td>
      </tr>`;
    }

    document.getElementById('resumenSolicitud').innerHTML = `
      <div class="alert alert-info">
        <strong>Período:</strong> ${Helpers.formatDate(fi)} – ${Helpers.formatDate(ff)} | ${hi} – ${hf} |
        <strong>Motivo:</strong> ${motivo?.MotivoExtra} (${motivo?.TipoExtra}) |
        <strong>Área:</strong> ${aId} / ${sId}
      </div>
      <div class="table-wrap" style="margin-top:1rem">
        <table>
          <thead><tr><th>Colaborador</th><th>Categoría</th><th>50% (D/N)</th><th>100% (D/N)</th><th>Total ARS</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="font-weight:700;background:var(--c-gray-50)">
            <td colspan="4">TOTAL GENERAL</td>
            <td>${Helpers.formatARS(grandTotal)}</td>
          </tr></tfoot>
        </table>
      </div>
      ${obs ? `<p style="margin-top:.75rem;font-size:.875rem"><strong>Observación:</strong> ${obs}</p>` : ''}
    `;
  },

  async guardar(editId) {
    UI.setLoading('btnGuardar', true);
    try {
      const fi     = document.getElementById('fFechaInicio')?.value;
      const ff     = document.getElementById('fFechaFin')?.value;
      const hi     = document.getElementById('fHoraInicio')?.value;
      const hf     = document.getElementById('fHoraFin')?.value;
      const mId    = document.getElementById('fMotivo')?.value;
      const aId    = document.getElementById('fAreaExtra')?.value;
      const sId    = document.getElementById('fSectorExtra')?.value;
      const obs    = document.getElementById('fObservacion')?.value;
      const motivo = this._catalogs.motivos.find(m => m.IDMotivo === mId);
      const colabs = this._colaboradores.filter(c => c && c.Legajo);

      const colaboradoresDatos = colabs.map(colab => {
        const vhRow = this._catalogs.valorHora.find(v => v.IDCategoria === colab.CategoriaID && v.Activo);
        const hs    = Helpers.calcularHoras(fi, ff, hi, hf, motivo?.TipoExtra || 'PRODUCTIVO');
        const vals  = vhRow ? Helpers.calcularValores(hs, vhRow) : {};
        return { ...colab, ...hs, ...vals, categoriaSnapshot: colab.CategoriaID };
      });

      const data = {
        fechaInicioExtra: fi, fechaFinExtra: ff,
        horaInicioExtra: hi, horaFinExtra: hf,
        motivoID: mId, tipoExtra: motivo?.TipoExtra,
        areaExtraID: aId, sectorExtraID: sId,
        observacionSolicitud: obs,
        colaboradores: colaboradoresDatos,
      };

      const fn   = editId ? API.modificarSolicitud({ ...data, id: editId }) : API.crearSolicitud(data);
      const res  = await fn;

      if (!res?.ok) throw new Error(res?.error || 'Error al guardar.');

      UI.closeModal('modalSolicitud');
      UI.success(editId ? 'Solicitud actualizada.' : 'Solicitud creada exitosamente.');
      this.render();

    } catch (err) {
      UI.error(err.message);
    } finally {
      UI.setLoading('btnGuardar', false);
    }
  },

  async eliminar(id) {
    const confirm = await UI.confirm({
      title: 'Eliminar Solicitud',
      message: '¿Estás seguro que querés eliminar esta solicitud? Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar',
    });
    if (!confirm) return;

    const res = await API.eliminarSolicitud(id);
    if (!res?.ok) return UI.error(res?.error || 'Error al eliminar.');
    UI.success('Solicitud eliminada.');
    this.render();
  },

  abrirAprobacion(numeroSolicitud) {
    Aprobaciones.abrirParaSolicitud(numeroSolicitud);
  },

  exportar() {
    if (!this._data.length) return UI.warning('No hay datos para exportar.');
    Excel.exportarSolicitudes(this._data);
  },
};
