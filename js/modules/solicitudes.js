/* ============================================================
   AGILIZATE – Módulo Solicitudes  [v1.2 – Mejoras completas]
   ============================================================ */

const Solicitudes = {
  _data:            [],
  _page:            1,
  _total:           0,
  _filtros:         {},
  _catalogs:        null,
  _colaboradores:   [],
  _solicitudEditId: null,
  _currentStep:     1,
  _hsResult:        null,

  // ── render ────────────────────────────────────────────────
  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;
    await this._loadCatalogs();
    content.innerHTML = this._buildShell();
    await this._cargarTabla();
    const numInput = document.getElementById('fNumero');
    if (numInput) numInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.aplicarFiltros(); });
  },

  // ── Catálogos ─────────────────────────────────────────────
  async _loadCatalogs() {
    try {
      const [areasRes, motivosRes, nominaRes, vhRes] = await Promise.all([
        API.getAreas(),
        API.getMotivos(),
        API.call('getNomina', { soloActivos: true, sinPaginacion: true }),
        API.getValorHora(),
      ]);
      const isActivo = v => v === true || String(v).toUpperCase() === 'TRUE';
      this._catalogs = {
        areas:     areasRes?.data    || [],
        motivos:   (motivosRes?.data || []).filter(m => isActivo(m.Activo)),
        nomina:    (nominaRes?.data  || []).filter(n => n.Estado !== 'INACTIVO' && n.Estado !== 'BAJA'),
        valorHora: (vhRes?.data      || []).filter(v => isActivo(v.Activo)),
      };
    } catch (err) {
      console.warn('Error cargando catálogos:', err.message);
      this._catalogs = { areas: [], motivos: [], nomina: [], valorHora: [] };
    }
  },

  // ── Shell HTML ────────────────────────────────────────────
  _buildShell() {
    const user        = Auth.currentUser;
    const isUsuario   = user?.RolID === CONFIG.ROLES.USUARIO;
    const areasUnicas = [...new Map((this._catalogs?.areas || []).map(a => [a.Area, a])).values()];
    const canCreate   = Permisos.puedeCrearSolicitud();
    const canExport   = Permisos.puedeExportarExcel();

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
        <div class="form-group"><label>Desde</label>
          <input type="date" id="fFechaDesde" value="${this._filtros.fechaDesde || Helpers.firstDayOfMonth()}" /></div>
        <div class="form-group"><label>Hasta</label>
          <input type="date" id="fFechaHasta" value="${this._filtros.fechaHasta || Helpers.today()}" /></div>
        ${!isUsuario ? `<div class="form-group"><label>Área</label>
          <select id="fArea"><option value="">Todas</option>
            ${areasUnicas.map(a => `<option value="${a.Area}" ${this._filtros.area===a.Area?'selected':''}>${a.Area}</option>`).join('')}
          </select></div>` : ''}
        <div class="form-group"><label>Estado</label>
          <select id="fEstado">
            <option value="">Todos</option>
            <option value="PENDIENTE APROBACION" ${this._filtros.estado==='PENDIENTE APROBACION'?'selected':''}>Pendiente</option>
            <option value="APROBADA"   ${this._filtros.estado==='APROBADA'?'selected':''}>Aprobada</option>
            <option value="RECHAZADA"  ${this._filtros.estado==='RECHAZADA'?'selected':''}>Rechazada</option>
            <option value="PARCIAL"    ${this._filtros.estado==='PARCIAL'?'selected':''}>Parcial</option>
            <option value="ELIMINADA"  ${this._filtros.estado==='ELIMINADA'?'selected':''}>Eliminada</option>
          </select></div>
        <div class="form-group"><label>N° Solicitud</label>
          <input type="text" id="fNumero" placeholder="Buscar…" value="${this._filtros.numero || ''}" /></div>
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
      </div>`;
  },

  // ── Tabla ─────────────────────────────────────────────────
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
      wrap.innerHTML = `<div class="empty-state" style="padding:2rem"><h4>Error al cargar</h4>
        <p style="color:var(--c-danger)">${err.message}</p>
        <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="Solicitudes._cargarTabla()">Reintentar</button></div>`;
    }
  },

  _buildTabla() {
    if (!this._data.length) {
      return `<div class="empty-state" style="padding:3rem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;margin:0 auto 1rem;opacity:.3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h4>Sin solicitudes</h4><p>No se encontraron registros con los filtros aplicados.</p></div>`;
    }

    const canMod = Permisos.puedeModificarSolicitud();
    const canDel = Permisos.puedeEliminarSolicitud();

    // Agrupar por NumeroSolicitud (una fila por solicitud)
    const agrupadas = {};
    for (const s of this._data) {
      if (!agrupadas[s.NumeroSolicitud]) agrupadas[s.NumeroSolicitud] = { ...s, _count: 0 };
      agrupadas[s.NumeroSolicitud]._count++;
    }

    const rows = Object.values(agrupadas).map(s => {
      const editable   = s.StatusSolicitud === 'PENDIENTE APROBACION';
      const eliminable = s.StatusSolicitud !== 'ELIMINADA';

      const sectorObj  = (this._catalogs?.areas   || []).find(a => a.IDSector === s.SectorExtraID);
      const sectorNom  = sectorObj ? sectorObj.Sector : (s.SectorExtraID || '–');
      const motivoObj  = (this._catalogs?.motivos  || []).find(m => m.IDMotivo === s.MotivoID);
      const motivoNom  = motivoObj ? motivoObj.MotivoExtra : (s.MotivoID || '–');

      const rowStyle = s.StatusSolicitud === 'ELIMINADA' ? 'style="opacity:.5;text-decoration:line-through"' : '';

      return `<tr ${rowStyle}>
        <td class="font-mono" style="font-size:.82rem;font-weight:700">${s.NumeroSolicitud || '–'}</td>
        <td style="font-size:.82rem">${Helpers.formatDate(s.FechaSolicitud)}</td>
        <td style="font-size:.82rem">${s.NombreSolicitante || '–'}</td>
        <td style="font-size:.82rem;white-space:nowrap">${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}</td>
        <td style="font-size:.82rem;white-space:nowrap">${Helpers.formatHHMM(s.HoraInicioExtra)} – ${Helpers.formatHHMM(s.HoraFinExtra)}</td>
        <td style="font-size:.82rem">${sectorNom}</td>
        <td style="font-size:.82rem">${motivoNom}</td>
        <td><span class="badge ${s.TipoExtra==='PRODUCTIVO'?'badge-success':'badge-warning'}">${s.TipoExtra||'–'}</span></td>
        <td style="text-align:center;font-size:.82rem">${s._count}</td>
        <td>${Helpers.statusBadge(s.StatusSolicitud)}</td>
        <td>
          <div style="display:flex;gap:.3rem;align-items:center">
            <button class="btn-icon" onclick="Solicitudes.verDetalle('${s.ID}')" title="Ver detalle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            ${canMod && editable ? `
            <button class="btn-icon" onclick="Solicitudes.abrirFormulario('${s.NumeroSolicitud}')" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>` : ''}
            ${canDel && eliminable ? `
            <button class="btn-icon" style="color:var(--c-danger)" onclick="Solicitudes.eliminar('${s.NumeroSolicitud}')" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    return `<table>
      <thead><tr>
        <th>N° Sol.</th><th>Fecha</th><th>Solicitante</th><th>Período</th>
        <th>Horario</th><th>Sector</th><th>Motivo</th><th>Tipo</th>
        <th>Colab.</th><th>Estado</th><th>Acciones</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  },

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
  limpiarFiltros() { this._filtros = {}; this._page = 1; this.render(); },
  _goPage(p) { Solicitudes._page = p; Solicitudes._cargarTabla(); },

  // ── Ver Detalle ───────────────────────────────────────────
  async verDetalle(id) {
    const res = await API.getSolicitudById(id);
    const s   = res?.data;
    if (!s) { UI.error('No se pudo cargar la solicitud.'); return; }

    const sectorObj = (this._catalogs?.areas  || []).find(a => a.IDSector === s.SectorExtraID);
    const motivoObj = (this._catalogs?.motivos || []).find(m => m.IDMotivo === s.MotivoID);
    const sectorNom = sectorObj ? sectorObj.Sector     : (s.SectorExtraID || '–');
    const motivoNom = motivoObj ? motivoObj.MotivoExtra : (s.MotivoID     || '–');

    UI.modal({
      id: 'modalDetalleSol', title: `Solicitud N° ${s.NumeroSolicitud}`, size: 'modal-lg',
      body: `
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem">
          <div>${Helpers.statusBadge(s.StatusSolicitud)}</div>
          <div><span class="badge badge-primary">${s.TipoExtra || '–'}</span></div>
        </div>
        <div class="form-row">
          <div><strong>Solicitante:</strong> ${s.NombreSolicitante || '–'}</div>
          <div><strong>Área / Sector:</strong> ${s.AreaExtraID || '–'} / ${sectorNom}</div>
        </div>
        <div class="form-row" style="margin-top:.6rem">
          <div><strong>Colaborador:</strong> ${s.NombreColaborador || '–'} ${Helpers.ibBadge(s.IBSnapshot)}</div>
          <div><strong>Legajo:</strong> ${s.Legajo || '–'}</div>
        </div>
        <div class="form-row" style="margin-top:.6rem">
          <div><strong>Período:</strong> ${Helpers.formatDate(s.FechaInicioExtra)} – ${Helpers.formatDate(s.FechaFinExtra)}</div>
          <div><strong>Horario:</strong> ${Helpers.formatHHMM(s.HoraInicioExtra)} – ${Helpers.formatHHMM(s.HoraFinExtra)}</div>
        </div>
        <div class="form-row" style="margin-top:.6rem">
          <div><strong>Motivo:</strong> ${motivoNom}</div>
          <div><strong>Status Colaborador:</strong> ${Helpers.statusBadge(s.StatusColaborador)}</div>
        </div>
        ${s.ObservacionSolicitud  ? `<div class="alert alert-info"    style="margin-top:1rem"><strong>Obs.:</strong> ${s.ObservacionSolicitud}</div>`  : ''}
        ${s.ObservacionAprobacion ? `<div class="alert alert-warning" style="margin-top:.5rem"><strong>Obs. Aprob.:</strong> ${s.ObservacionAprobacion}</div>` : ''}
        ${s.NombreAprobador       ? `<div style="margin-top:.5rem;font-size:.82rem;color:var(--c-gray-500)">Aprobado por: <strong>${s.NombreAprobador}</strong> el ${Helpers.formatDate(s.FechaAprobacion)}</div>` : ''}`,
      footer: `<button class="btn btn-ghost" onclick="UI.closeModal('modalDetalleSol')">Cerrar</button>`,
    });
  },

  // ── Abrir Formulario ──────────────────────────────────────
  async abrirFormulario(numeroSolicitud = null) {
    if (!Permisos.puedeCrearSolicitud() && !numeroSolicitud) return;
    if (numeroSolicitud && !Permisos.puedeModificarSolicitud()) return;
    if (!this._catalogs) await this._loadCatalogs();

    let filasExistentes = [];
    let solicitudBase   = null;

    if (numeroSolicitud) {
      const res = await API.getSolicitudes({ numero: numeroSolicitud, perPage: 200, page: 1 });
      filasExistentes = (res?.data || []).filter(s => s.NumeroSolicitud === numeroSolicitud);
      if (!filasExistentes.length) { UI.error('No se pudo cargar la solicitud.'); return; }
      solicitudBase = filasExistentes[0];
    }

    const { areas, motivos } = this._catalogs;
    const areasUnicas = [...new Map(areas.map(a => [a.Area, a])).values()];

    this._colaboradores   = [];
    this._solicitudEditId = numeroSolicitud;
    this._currentStep     = 1;
    this._hsResult        = null;

    UI.modal({
      id: 'modalSolicitud',
      title: numeroSolicitud ? `Editar Solicitud N° ${numeroSolicitud}` : 'Nueva Solicitud de Horas Extras',
      size: 'modal-xl',
      body: `
        <!-- Steps indicator -->
        <div style="display:flex;align-items:center;margin-bottom:1.5rem;overflow-x:auto;padding-bottom:.25rem">
          <div style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:70px">
            <div id="stepCircle1" style="width:30px;height:30px;border-radius:50%;background:var(--c-blue-700);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">1</div>
            <span style="font-size:.7rem;font-weight:600;color:var(--c-blue-700)">General</span>
          </div>
          <div style="flex:1;height:2px;background:var(--c-gray-200);margin-bottom:1.1rem"></div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:90px">
            <div id="stepCircle2" style="width:30px;height:30px;border-radius:50%;background:var(--c-gray-200);color:var(--c-gray-500);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">2</div>
            <span style="font-size:.7rem;font-weight:600;color:var(--c-gray-500)">Colaboradores</span>
          </div>
          <div style="flex:1;height:2px;background:var(--c-gray-200);margin-bottom:1.1rem"></div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:.25rem;flex:1;min-width:80px">
            <div id="stepCircle3" style="width:30px;height:30px;border-radius:50%;background:var(--c-gray-200);color:var(--c-gray-500);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">3</div>
            <span style="font-size:.7rem;font-weight:600;color:var(--c-gray-500)">Confirmación</span>
          </div>
        </div>

        <!-- Paso 1 -->
        <div id="paso1">
          <div class="form-row">
            <div class="form-group"><label>Fecha Inicio Extra *</label>
              <input type="date" id="sFI" value="${solicitudBase?.FechaInicioExtra || Helpers.today()}" onchange="Solicitudes._recalcHoras()" /></div>
            <div class="form-group"><label>Fecha Fin Extra *</label>
              <input type="date" id="sFF" value="${solicitudBase?.FechaFinExtra || Helpers.today()}" onchange="Solicitudes._recalcHoras()" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Hora Inicio *</label>
              <input type="time" id="sHI" value="${solicitudBase?.HoraInicioExtra || '08:00'}" onchange="Solicitudes._recalcHoras()" /></div>
            <div class="form-group"><label>Hora Fin *</label>
              <input type="time" id="sHF" value="${solicitudBase?.HoraFinExtra || '12:00'}" onchange="Solicitudes._recalcHoras()" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Motivo *</label>
              <select id="sMotivo" onchange="Solicitudes._recalcHoras()">
                ${Helpers.buildOptions(motivos, 'IDMotivo', 'MotivoExtra', solicitudBase?.MotivoID)}
              </select></div>
            <div class="form-group"><label>Área *</label>
              <select id="sArea" onchange="Solicitudes._onAreaChange()">
                ${Helpers.buildOptions(areasUnicas, 'Area', 'Area', solicitudBase?.AreaExtraID, 'Seleccionar área…')}
              </select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Sector *</label>
              <select id="sSector"><option value="">— primero seleccioná un área —</option></select></div>
            <div class="form-group"><label>Observación</label>
              <input type="text" id="sObs" placeholder="Opcional…" value="${solicitudBase?.ObservacionSolicitud || ''}" /></div>
          </div>
          <div id="sTipoInfo"  class="alert alert-info    hidden" style="margin-top:.5rem"></div>
          <div id="sHsCalculo" class="alert alert-success hidden" style="margin-top:.5rem"></div>
        </div>

        <!-- Paso 2 -->
        <div id="paso2" class="hidden">
          <div style="position:relative;margin-bottom:1rem">
            <div class="form-group" style="margin-bottom:0">
              <label>Buscar colaborador (nombre o legajo)</label>
              <input type="text" id="colabSearch" placeholder="Escribí al menos 2 caracteres para buscar…"
                autocomplete="off" oninput="Solicitudes._onColabSearch()"
                style="width:100%;box-sizing:border-box" />
            </div>
            <div id="colabDropdown" style="display:none;position:absolute;z-index:9999;
              background:#fff;border:1.5px solid var(--c-gray-200);border-radius:8px;
              max-height:220px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.12);
              width:100%;margin-top:2px;left:0"></div>
          </div>
          <div id="colabsContainer"></div>
          <p id="colabsEmpty" style="color:var(--c-gray-400);font-size:.85rem;text-align:center;padding:1.5rem 0">
            Ningún colaborador agregado. Usá el buscador de arriba.
          </p>
        </div>

        <!-- Paso 3 -->
        <div id="paso3" class="hidden">
          <div id="resumenContent"></div>
        </div>

        <div id="solFormError" class="alert alert-error hidden" style="margin-top:1rem"></div>`,
      footer: `
        <button class="btn btn-ghost"   id="btnAnt"     style="display:none" onclick="Solicitudes._stepBack()">← Anterior</button>
        <button class="btn btn-ghost"                   onclick="UI.closeModal('modalSolicitud')">Cancelar</button>
        <button class="btn btn-primary" id="btnSig"     onclick="Solicitudes._stepNext()">Siguiente →</button>
        <button class="btn btn-success hidden" id="btnGuardar" onclick="Solicitudes._guardar()">
          <span class="btn-text">✓ Guardar Solicitud</span>
          <span class="btn-loader hidden"><svg viewBox="0 0 24 24" class="spin" style="width:16px;height:16px"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>
        </button>`,
    });

    if (solicitudBase?.AreaExtraID) {
      setTimeout(() => this._onAreaChange(solicitudBase.AreaExtraID, solicitudBase.SectorExtraID), 60);
    }
    if (filasExistentes.length) {
      setTimeout(() => {
        for (const fila of filasExistentes) this._agregarColabExistente(fila);
        this._actualizarEmptyColab();
      }, 80);
    }

    // Cerrar dropdown al hacer clic fuera
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        const dd = document.getElementById('colabDropdown');
        if (dd && !dd.contains(e.target) && e.target.id !== 'colabSearch') {
          dd.style.display = 'none';
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 200);
  },

  // ── Autocompletado colaboradores ──────────────────────────
  _onColabSearch() {
    const q        = (document.getElementById('colabSearch')?.value || '').toLowerCase().trim();
    const dropdown = document.getElementById('colabDropdown');
    if (!dropdown) return;
    if (q.length < 2) { dropdown.style.display = 'none'; return; }

    const nomina = this._catalogs?.nomina || [];
    const found  = nomina.filter(n =>
      n.ApellidoNombre?.toLowerCase().includes(q) ||
      String(n.Legajo).includes(q)
    ).slice(0, 30);

    if (!found.length) { dropdown.style.display = 'none'; return; }

    dropdown.style.display = 'block';
    dropdown.innerHTML = found.map(n => `
      <div onclick="Solicitudes._seleccionarColab('${n.Legajo}')"
        style="padding:.55rem .9rem;cursor:pointer;border-bottom:1px solid var(--c-gray-100);
          display:flex;justify-content:space-between;align-items:center;font-size:.88rem"
        onmouseover="this.style.background='var(--c-gray-50)'"
        onmouseout="this.style.background=''">
        <span><strong>${n.ApellidoNombre}</strong>
          <span style="color:var(--c-gray-400);font-size:.78rem;margin-left:.4rem">Leg: ${n.Legajo}</span></span>
        ${Helpers.ibBadge(n.IB_Actual)}
      </div>`).join('');
  },

  _seleccionarColab(legajo) {
    const dropdown = document.getElementById('colabDropdown');
    const input    = document.getElementById('colabSearch');
    if (dropdown) dropdown.style.display = 'none';
    if (input)   input.value = '';

    const colab = this._catalogs?.nomina.find(n => String(n.Legajo) === String(legajo));
    if (!colab) return;

    if (this._colaboradores.some(c => c && String(c.Legajo) === String(legajo))) {
      UI.warning(`${colab.ApellidoNombre} ya está en la lista.`); return;
    }

    this._colaboradores.push({ ...colab, _isNew: true, _rowId: null });
    this._renderColabRow(this._colaboradores.length - 1);
    this._actualizarEmptyColab();
  },

  _agregarColabExistente(fila) {
    const colab = this._catalogs?.nomina.find(n => String(n.Legajo) === String(fila.Legajo));
    this._colaboradores.push({
      Legajo:             fila.Legajo,
      ApellidoNombre:     fila.NombreColaborador,
      IB_Actual:          colab?.IB_Actual || fila.IBSnapshot,
      CategoriaID:        colab?.CategoriaID || fila.CategoriaSnapshot,
      RankingHorasPeriodo: colab?.RankingHorasPeriodo || fila.RankingHorasSnapshot,
      _isNew:             false,
      _rowId:             fila.ID,
      StatusColaborador:  fila.StatusColaborador,
    });
    this._renderColabRow(this._colaboradores.length - 1);
  },

  _renderColabRow(idx) {
    const container = document.getElementById('colabsContainer');
    if (!container) return;
    const colab = this._colaboradores[idx];
    const div   = document.createElement('div');
    div.id = `colabRow_${idx}`;
    div.style.cssText = 'position:relative;background:var(--c-gray-50);border:1.5px solid var(--c-gray-200);border-radius:8px;padding:.75rem 2.5rem .75rem .9rem;margin-bottom:.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap';
    div.innerHTML = `
      <button style="position:absolute;top:.5rem;right:.6rem;background:none;border:none;cursor:pointer;color:var(--c-danger);font-size:1.1rem;line-height:1"
        onclick="Solicitudes._quitarColab(${idx})" title="Quitar">✕</button>
      <div style="flex:2;min-width:160px">
        <div style="font-weight:700;font-size:.9rem">${colab.ApellidoNombre}</div>
        <div style="font-size:.75rem;color:var(--c-gray-500)">Leg: ${colab.Legajo}
          ${!colab._isNew ? '<span style="color:var(--c-blue-600);font-size:.7rem;margin-left:.3rem">● existente</span>' : ''}</div>
      </div>
      <div style="min-width:80px">${Helpers.ibBadge(colab.IB_Actual)}</div>
      <div style="min-width:80px;font-size:.82rem"><span style="color:var(--c-gray-400)">Cat:</span> ${colab.CategoriaID||'–'}</div>
      <div style="min-width:100px;font-size:.82rem;font-family:var(--font-mono)"><span style="color:var(--c-gray-400)">Hs período:</span> ${Helpers.formatHoras(colab.RankingHorasPeriodo)}</div>`;
    container.appendChild(div);
  },

  _quitarColab(idx) {
    const row = document.getElementById(`colabRow_${idx}`);
    if (row) row.remove();
    this._colaboradores[idx] = null;
    this._actualizarEmptyColab();
  },

  _actualizarEmptyColab() {
    const el = document.getElementById('colabsEmpty');
    if (el) el.style.display = this._colaboradores.filter(c => c).length ? 'none' : 'block';
  },

  // ── Área / Sector ─────────────────────────────────────────
  _onAreaChange(areaForzada, sectorForzado) {
    const area     = areaForzada || document.getElementById('sArea')?.value || '';
    const select   = document.getElementById('sSector');
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
    const tipoEl = document.getElementById('sTipoInfo');
    const calcEl = document.getElementById('sHsCalculo');

    if (mot && tipoEl) {
      tipoEl.textContent = `Tipo: ${mot.TipoExtra} (${mot.TipoExtra === 'PRODUCTIVO' ? '50%' : '100%'}) · Máx. ${mot.MaximoHorasDia} hs/día`;
      tipoEl.classList.remove('hidden');
    }
    if (fi && ff && hi && hf && mot) {
      const r = Helpers.calcularHoras(fi, ff, hi, hf, mot.TipoExtra);
      if (r && calcEl) {
        calcEl.innerHTML = `<strong>Cálculo:</strong> ${r.totalHoras} hs · 50% D: ${r.horas50} · 50% N: ${r.horas50Nocturno} · 100% D: ${r.horas100} · 100% N: ${r.horas100Nocturno}`;
        calcEl.classList.remove('hidden');
        this._hsResult = r;
      }
    }
  },

  // ── Steps ─────────────────────────────────────────────────
  _stepNext() {
    if (this._currentStep === 1) {
      if (!this._validarPaso1()) return;
      document.getElementById('paso1').classList.add('hidden');
      document.getElementById('paso2').classList.remove('hidden');
      document.getElementById('btnAnt').style.display = '';
      this._updateStepUI(2);
      this._currentStep = 2;
      this._actualizarEmptyColab();
    } else if (this._currentStep === 2) {
      const colabs = this._colaboradores.filter(c => c);
      if (!colabs.length) { this._setFormError('Agregá al menos un colaborador.'); return; }
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

  _updateStepUI(active) {
    for (let i = 1; i <= 3; i++) {
      const c = document.getElementById(`stepCircle${i}`);
      if (!c) continue;
      if (i < active)       { c.style.background = 'var(--c-success)';   c.style.color = '#fff'; }
      else if (i === active){ c.style.background = 'var(--c-blue-700)';  c.style.color = '#fff'; }
      else                  { c.style.background = 'var(--c-gray-200)';  c.style.color = 'var(--c-gray-500)'; }
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
      this._setFormError('Completá todos los campos obligatorios (*).'); return false;
    }
    if (new Date(`${ff}T${hf}`) <= new Date(`${fi}T${hi}`)) {
      this._setFormError('La fecha/hora de fin debe ser posterior al inicio.'); return false;
    }
    this._clearFormError();
    return true;
  },

  // ── Resumen Paso 3 – SIN Importe ni Categoría ─────────────
  _buildResumen(colabs) {
    const fi  = document.getElementById('sFI')?.value;
    const ff  = document.getElementById('sFF')?.value;
    const hi  = document.getElementById('sHI')?.value;
    const hf  = document.getElementById('sHF')?.value;
    const mId = document.getElementById('sMotivo')?.value;
    const sId = document.getElementById('sSector')?.value;
    const obs = document.getElementById('sObs')?.value;
    const mot = this._catalogs?.motivos.find(m => m.IDMotivo === mId);

    // Nombre del sector para mostrar en lugar del ID
    const sectorObj = (this._catalogs?.areas || []).find(a => a.IDSector === sId);
    const sectorNom = sectorObj ? sectorObj.Sector : sId;

    const hs = Helpers.calcularHoras(fi, ff, hi, hf, mot?.TipoExtra || 'PRODUCTIVO');

    const rows = colabs.map(colab => `
      <tr>
        <td>${colab.ApellidoNombre} ${Helpers.ibBadge(colab.IB_Actual)}</td>
        <td>Leg. ${colab.Legajo}</td>
        <td class="font-mono">${hs ? Helpers.formatHoras(hs.horas50) : '–'} / ${hs ? Helpers.formatHoras(hs.horas50Nocturno) : '–'}</td>
        <td class="font-mono">${hs ? Helpers.formatHoras(hs.horas100) : '–'} / ${hs ? Helpers.formatHoras(hs.horas100Nocturno) : '–'}</td>
      </tr>`).join('');

    const el = document.getElementById('resumenContent');
    if (!el) return;
    el.innerHTML = `
      <div class="alert alert-info">
        <strong>Período:</strong> ${Helpers.formatDate(fi)} – ${Helpers.formatDate(ff)} &nbsp;|&nbsp;
        <strong>Horario:</strong> ${Helpers.formatHHMM(hi)} – ${Helpers.formatHHMM(hf)} &nbsp;|&nbsp;
        <strong>Motivo:</strong> ${mot?.MotivoExtra || mId} (${mot?.TipoExtra || '–'}) &nbsp;|&nbsp;
        <strong>Sector:</strong> ${sectorNom}
        ${obs ? ` &nbsp;|&nbsp; <strong>Obs.:</strong> ${obs}` : ''}
      </div>
      <div class="table-wrap" style="margin-top:1rem">
        <table>
          <thead><tr><th>Colaborador</th><th>Legajo</th><th>50% D/N</th><th>100% D/N</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  // ── Guardar ───────────────────────────────────────────────
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
      const colabs = this._colaboradores.filter(c => c);

      const colaboradoresDatos = colabs.map(colab => {
        const vhRow = this._catalogs?.valorHora.find(v => v.IDCategoria === colab.CategoriaID);
        const hs    = Helpers.calcularHoras(fi, ff, hi, hf, mot?.TipoExtra || 'PRODUCTIVO');
        const vals  = (vhRow && hs) ? Helpers.calcularValores(hs, vhRow) : {};
        return { ...colab, ...(hs || {}), ...(vals || {}) };
      });

      const payload = {
        fechaInicioExtra:    fi, fechaFinExtra:     ff,
        horaInicioExtra:     hi, horaFinExtra:      hf,
        motivoID:            mId,
        tipoExtra:           mot?.TipoExtra || 'PRODUCTIVO',
        areaExtraID:         aId,
        sectorExtraID:       sId,
        observacionSolicitud: obs || '',
        colaboradores:        colaboradoresDatos,
      };

      let res;
      if (this._solicitudEditId) {
        res = await API.modificarSolicitud({ ...payload, numeroSolicitud: this._solicitudEditId });
      } else {
        res = await API.crearSolicitud(payload);
      }

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

  // ── Eliminar (soft delete) ────────────────────────────────
  async eliminar(numeroSolicitud) {
    const ok = await UI.confirm({
      title:       'Eliminar Solicitud',
      message:     `¿Eliminar N° ${numeroSolicitud}? El registro permanece en el sistema con estado ELIMINADA.`,
      type:        'danger',
      confirmText: 'Sí, eliminar',
    });
    if (!ok) return;
    const res = await API.eliminarSolicitud({ numeroSolicitud });
    if (!res?.ok) { UI.error(res?.error || 'Error al eliminar.'); return; }
    UI.success('Solicitud marcada como ELIMINADA.');
    this._cargarTabla();
  },

  exportar() {
    if (!this._data.length) { UI.warning('No hay datos para exportar.'); return; }
    if (typeof Excel !== 'undefined') Excel.exportarData(this._data, `solicitudes_${Helpers.today()}.xlsx`);
    else Helpers.downloadCSV(this._data, `solicitudes_${Helpers.today()}.csv`);
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

