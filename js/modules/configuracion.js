/* ============================================================
   AGILIZATE – Módulos: Configuración, Nómina, Logs, Reportes, Excel
   ============================================================ */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const Configuracion = {
  async init() {
    UI.registerSection('configuracion', () => Configuracion.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Configuración del Sistema</h2>
      </div>

      <div class="tabs" id="configTabs">
        ${Permisos.puedeConfigValorHora() ? `<button class="tab-btn active" onclick="Configuracion.showTab('valorHora', this)">Valor Hora</button>` : ''}
        ${Permisos.puedeConfigTipoCambio() ? `<button class="tab-btn" onclick="Configuracion.showTab('tipoCambio', this)">Tipo de Cambio</button>` : ''}
        ${Permisos.puedeConfigReglaIB() ? `<button class="tab-btn" onclick="Configuracion.showTab('reglaIB', this)">Reglas IB</button>` : ''}
        ${Permisos.puedeConfigMotivos() ? `<button class="tab-btn" onclick="Configuracion.showTab('motivos', this)">Motivos</button>` : ''}
        ${Permisos.puedeConfigAreas() ? `<button class="tab-btn" onclick="Configuracion.showTab('areas', this)">Áreas/Sectores</button>` : ''}
        ${Permisos.puedeConfigurarSistema() ? `<button class="tab-btn" onclick="Configuracion.showTab('general', this)">General</button>` : ''}
      </div>

      <div id="configContent">
        <div class="loading-screen"><div class="loading-spinner"></div></div>
      </div>
    `;

    // Mostrar primer tab disponible
    if (Permisos.puedeConfigValorHora()) await this.showTab('valorHora');
    else if (Permisos.puedeConfigTipoCambio()) await this.showTab('tipoCambio');
    else if (Permisos.puedeConfigReglaIB()) await this.showTab('reglaIB');
  },

  showTab(tab, btnEl) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    else {
      const btn = document.querySelector(`[onclick*="${tab}"]`);
      if (btn) btn.classList.add('active');
    }
    this._loadTab(tab);
  },

  async _loadTab(tab) {
    const el = document.getElementById('configContent');
    if (!el) return;

    switch (tab) {
      case 'valorHora':  return this._renderValorHora(el);
      case 'tipoCambio': return this._renderTipoCambio(el);
      case 'reglaIB':    return this._renderReglaIB(el);
      case 'motivos':    return this._renderMotivos(el);
      case 'areas':      return this._renderAreas(el);
      case 'general':    return this._renderGeneral(el);
    }
  },

  async _renderValorHora(el) {
    const res  = await API.getValorHora();
    const data = res?.data || [];

    let rows = data.map(v => `
      <tr>
        <td>${v.IDCategoria}</td>
        <td>${v.NombreCategoria}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorHoraBase)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorExtra50)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorNocturna50)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorExtra100)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorNocturna100)}</td>
        <td>${Helpers.formatDate(v.VigenciaDesde)} – ${Helpers.formatDate(v.VigenciaHasta)}</td>
        <td><span class="badge ${v.Activo === 'TRUE' || v.Activo === true ? 'badge-success' : 'badge-danger'}">${v.Activo ? 'Activo' : 'Inactivo'}</span></td>
        <td><button class="btn-icon" onclick="Configuracion.editarValorHora('${v.IDCategoria}')">✏</button></td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="section-header">
        <p class="section-subtitle">Valores de hora por categoría de colaborador</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion.editarValorHora()">+ Nueva Categoría</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Categoría</th><th>Base</th><th>Extra 50%</th><th>Noct. 50%</th><th>Extra 100%</th><th>Noct. 100%</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  async _renderTipoCambio(el) {
    const res  = await API.getTipoCambio();
    const data = res?.data || [];

    const rows = data.map(t => `
      <tr>
        <td>${t.Año}</td>
        <td>${t.Mes}</td>
        <td class="font-mono">${Helpers.formatARS(t.TCPromedio)}</td>
        <td class="font-mono">${Helpers.formatARS(t.TCMin)}</td>
        <td class="font-mono">${Helpers.formatARS(t.TCMax)}</td>
        <td>${Helpers.formatDate(t.FechaActualizacion)}</td>
        <td>${t.Fuente || '–'}</td>
        <td><button class="btn-icon" onclick="Configuracion.editarTC('${t.ID}')">✏</button></td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="section-header">
        <p class="section-subtitle">Tipo de cambio ARS/USD por mes</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion.editarTC()">+ Nuevo TC</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>Año</th><th>Mes</th><th>TC Promedio</th><th>Mín</th><th>Máx</th><th>Actualización</th><th>Fuente</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:2rem">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  async _renderReglaIB(el) {
    const res  = await API.getReglaIB();
    const data = res?.data || [];

    const rows = data.map(r => `
      <tr>
        <td><span class="ib-badge ib-${r.TarjetaIB}">${r.TarjetaIB}</span></td>
        <td class="font-mono">${r.LimiteMinimo} – ${r.LimiteMaximo} hs</td>
        <td>${r.PeriodoEvaluacion}</td>
        <td>${r.DiasEvaluacion} días</td>
        <td><span style="background:${r.ColorHex};padding:.2rem .7rem;border-radius:20px;color:#fff;font-size:.8rem">${r.ColorHex}</span></td>
        <td><span class="badge ${r.BloqueoAutomatico ? 'badge-danger' : 'badge-gray'}">${r.BloqueoAutomatico ? 'Sí' : 'No'}</span></td>
        <td><button class="btn-icon" onclick="Configuracion.editarReglaIB('${r.ID}')">✏</button></td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="section-header">
        <p class="section-subtitle">Índice de comportamiento (IB) – se resetea mensualmente</p>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>Nivel</th><th>Rango Horas</th><th>Período</th><th>Días</th><th>Color</th><th>Bloqueo Auto</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>
      <div class="alert alert-info" style="margin-top:1rem">
        <strong>Nota:</strong> Las horas acumuladas en el período se resetean automáticamente al inicio de cada mes según la configuración de PeriodoEvaluacion.
      </div>`;
  },

  async _renderMotivos(el) {
    const res  = await API.getMotivos();
    const data = res?.data || [];

    const rows = data.map(m => `
      <tr>
        <td class="font-mono text-xs">${m.IDMotivo}</td>
        <td>${m.MotivoExtra}</td>
        <td><span class="badge ${m.TipoExtra === 'PRODUCTIVO' ? 'badge-success' : 'badge-warning'}">${m.TipoExtra}</span></td>
        <td>${m.MaximoHorasDia} hs</td>
        <td><span class="badge ${m.Activo ? 'badge-success' : 'badge-danger'}">${m.Activo ? 'Activo' : 'Inactivo'}</span></td>
        <td><button class="btn-icon" onclick="Configuracion.editarMotivo('${m.IDMotivo}')">✏</button></td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="section-header">
        <p class="section-subtitle">Motivos de horas extras</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion.editarMotivo()">+ Nuevo Motivo</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Motivo</th><th>Tipo</th><th>Máx Hs/día</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:2rem">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  async _renderAreas(el) {
    const res  = await API.getAreas();
    const data = res?.data || [];

    const rows = data.map(a => `
      <tr>
        <td class="font-mono text-xs">${a.IDSector}</td>
        <td>${a.Sector}</td>
        <td>${a.Area}</td>
        <td>${a.EmailNotificacion || '–'}</td>
        <td><span class="badge ${a.Activo ? 'badge-success' : 'badge-danger'}">${a.Activo ? 'Activo' : 'Inactivo'}</span></td>
        <td><button class="btn-icon" onclick="Configuracion.editarArea('${a.IDSector}')">✏</button></td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="section-header">
        <p class="section-subtitle">Áreas y sectores de la organización</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion.editarArea()">+ Nuevo Sector</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>ID Sector</th><th>Sector</th><th>Área</th><th>Email Notif.</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>`;
  },

  async _renderGeneral(el) {
    const res  = await API.getConfiguracion();
    const data = res?.data || [];

    const rows = data.map(c => `
      <tr>
        <td class="font-mono text-xs">${c.Clave}</td>
        <td>${c.Descripcion || '–'}</td>
        <td><code>${c.Valor}</code></td>
        <td><span class="badge badge-gray">${c.Tipo}</span></td>
        <td><button class="btn-icon" onclick="Configuracion.editarConfig('${c.Clave}', \`${c.Valor}\`)">✏</button></td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>Clave</th><th>Descripción</th><th>Valor Actual</th><th>Tipo</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>`;
  },

  editarValorHora(id) { UI.info('Editor de categoría próximamente. Por ahora editar directamente en Google Sheets.'); },
  editarTC(id)        { UI.info('Editor de TC próximamente.'); },
  editarReglaIB(id)   { UI.info('Editor de Regla IB próximamente.'); },
  editarMotivo(id)    { UI.info('Editor de motivo próximamente.'); },
  editarArea(id)      { UI.info('Editor de área próximamente.'); },

  async editarConfig(clave, valorActual) {
    const modalId = UI.modal({
      title: `Editar: ${clave}`,
      body: `
        <div class="form-group">
          <label>Nuevo Valor</label>
          <input type="text" id="cfgValor" value="${valorActual}" />
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('${modalId}')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarConfig('${clave}', '${modalId}')">Guardar</button>
      `,
    });
  },

  async _guardarConfig(clave, modalId) {
    const valor = document.getElementById('cfgValor')?.value;
    const res   = await API.guardarConfiguracion({ clave, valor });
    if (!res?.ok) return UI.error(res?.error || 'Error.');
    UI.closeModal(modalId);
    UI.success('Configuración guardada.');
    this._renderGeneral(document.getElementById('configContent'));
  },
};

// ============================================================
// NÓMINA
// ============================================================
const Nomina = {
  _data: [],
  _page: 1,

  async init() {
    UI.registerSection('nomina', () => Nomina.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const res   = await API.getNomina({ page: this._page, perPage: CONFIG.ROWS_PER_PAGE });
    this._data  = res?.data  || [];
    const total = res?.total || 0;
    const pages = Math.ceil(total / CONFIG.ROWS_PER_PAGE) || 1;

    const rows = this._data.map(n => `
      <tr>
        <td class="font-mono">${n.Legajo}</td>
        <td>${n.ApellidoNombre}</td>
        <td>${n.Condicion || '–'}</td>
        <td>${n.CategoriaID || '–'}</td>
        <td>${Helpers.ibBadge(n.IB_Actual)}</td>
        <td class="font-mono">${Helpers.formatHoras(n.RankingHorasPeriodo)}</td>
        <td class="font-mono">${Helpers.formatHoras(n.RankingHorasAcumuladas)}</td>
        <td>${Helpers.formatDate(n.UltimoReseteoIB)}</td>
        <td><span class="badge ${n.Estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}">${n.Estado}</span></td>
      </tr>
    `).join('');

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Nómina de Personal</h2>
          <p class="section-subtitle">${total} colaborador(es)</p>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Legajo</th><th>Apellido y Nombre</th><th>Condición</th><th>Categoría</th><th>IB</th><th>Hs Período</th><th>Hs Acumuladas</th><th>Último Reseteo</th><th>Estado</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:2rem">Sin datos</td></tr>'}</tbody>
          </table>
        </div>
        ${Helpers.paginationHTML(this._page, pages, 'Nomina.goPage')}
      </div>
    `;
  },

  goPage(page) { Nomina._page = page; Nomina.render(); },
};

// ============================================================
// LOGS
// ============================================================
const Logs = {
  _data: [],
  _page: 1,

  async init() {
    UI.registerSection('logs', () => Logs.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const res   = await API.getLogs({ page: this._page, perPage: CONFIG.ROWS_PER_PAGE });
    this._data  = res?.data  || [];
    const total = res?.total || 0;
    const pages = Math.ceil(total / CONFIG.ROWS_PER_PAGE) || 1;

    const rows = this._data.map(l => `
      <tr>
        <td class="font-mono text-xs">${Helpers.formatDateTime(l.Timestamp)}</td>
        <td>${l.NombreUsuario || '–'}</td>
        <td>${l.AreaUsuario || '–'}</td>
        <td><span class="log-action-badge">${l.Accion || '–'}</span></td>
        <td>${l.Modulo || '–'}</td>
        <td class="text-xs">${l.EntidadAfectada || '–'} ${l.EntidadID ? `(${l.EntidadID})` : ''}</td>
        <td><span class="badge ${l.Exito ? 'badge-success' : 'badge-danger'}">${l.Exito ? 'OK' : 'Error'}</span></td>
      </tr>
    `).join('');

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Auditoría / Logs del Sistema</h2>
          <p class="section-subtitle">${total} evento(s) registrado(s)</p>
        </div>
        ${Permisos.puedeExportarLogs() ? `<button class="btn btn-ghost btn-sm" onclick="Logs.exportar()">⬇ Exportar</button>` : ''}
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Timestamp</th><th>Usuario</th><th>Área</th><th>Acción</th><th>Módulo</th><th>Entidad</th><th>Resultado</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:2rem">Sin logs</td></tr>'}</tbody>
          </table>
        </div>
        ${Helpers.paginationHTML(this._page, pages, 'Logs.goPage')}
      </div>
    `;
  },

  goPage(page) { Logs._page = page; Logs.render(); },
  exportar() { Excel.exportarLogs(this._data); },
};

// ============================================================
// REPORTES
// ============================================================
const Reportes = {
  async init() {
    UI.registerSection('reportes', () => Reportes.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Reportes</h2>
        <p class="section-subtitle">Generación de reportes globales</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card" style="cursor:pointer" onclick="Reportes.generarReporte('solicitudes_mes')">
          <div class="stat-icon">📋</div>
          <div class="stat-label">Solicitudes del Mes</div>
          <p class="stat-sub" style="margin-top:.5rem">Reporte completo de solicitudes del mes actual con detalle de horas y valores.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:.75rem">Generar</button>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Reportes.generarReporte('colaboradores_ib')">
          <div class="stat-icon">👥</div>
          <div class="stat-label">Colaboradores por IB</div>
          <p class="stat-sub" style="margin-top:.5rem">Ranking de colaboradores por índice de comportamiento y horas acumuladas.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:.75rem">Generar</button>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Reportes.generarReporte('costos_area')">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Costos por Área</div>
          <p class="stat-sub" style="margin-top:.5rem">Distribución de costos de horas extras por área y sector.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:.75rem">Generar</button>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Reportes.generarReporte('porteria_mes')">
          <div class="stat-icon">🏠</div>
          <div class="stat-label">Control Portería</div>
          <p class="stat-sub" style="margin-top:.5rem">Registro de ingresos y ausencias del mes.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:.75rem">Generar</button>
        </div>
      </div>
      <div id="reporteResultado"></div>
    `;
  },

  async generarReporte(tipo) {
    UI.info(`Generando reporte "${tipo}"…`);
    // La implementación detallada se realiza en el backend y se exporta vía Excel
    const res = await API.getDashboardData({ tipo });
    if (res?.data) {
      Excel.exportarGenerico(res.data, `reporte_${tipo}_${Helpers.today()}.xlsx`);
    }
  },
};

// ============================================================
// EXCEL
// ============================================================
const Excel = {
  async init() {
    UI.registerSection('excel', () => Excel.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const canExport = Permisos.puedeExportarExcel();
    const canImport = Permisos.puedeImportarExcel();

    const hojas = ['Solicitudes', 'Nomina', 'Usuarios', 'ValorHora', 'TipoCambio', 'ReglaIB', 'Motivos', 'Area', 'Logs', 'ControlIngreso'];

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Importar / Exportar Excel</h2>
      </div>

      <div class="form-row">
        ${canExport ? `
        <div class="card">
          <div class="card-header"><h3>⬇ Exportar a Excel</h3></div>
          <div class="card-body">
            <div class="form-group">
              <label>Seleccionar hoja a exportar</label>
              <select id="exHoja">
                ${hojas.map(h => `<option value="${h}">${h}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primary btn-full" onclick="Excel.exportar()">Exportar</button>
          </div>
        </div>
        ` : ''}

        ${canImport ? `
        <div class="card">
          <div class="card-header"><h3>⬆ Importar desde Excel</h3></div>
          <div class="card-body">
            <div class="form-group">
              <label>Hoja destino</label>
              <select id="imHoja">
                ${hojas.map(h => `<option value="${h}">${h}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Archivo Excel (.xlsx)</label>
              <input type="file" id="imFile" accept=".xlsx,.xls" />
            </div>
            <div class="alert alert-warning">
              ⚠ La importación reemplaza los datos existentes. Verificar el formato antes de importar.
            </div>
            <button class="btn btn-primary btn-full" onclick="Excel.importar()">Importar</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  async exportar() {
    const hoja = document.getElementById('exHoja')?.value;
    if (!hoja) return;

    UI.info(`Exportando ${hoja}…`);

    const res = await API.call('exportarHoja', { hoja });
    if (!res?.ok || !res.data) return UI.error('Error al exportar.');

    this.exportarGenerico(res.data, `${hoja}_${Helpers.today()}.xlsx`);
    UI.success(`${hoja} exportada correctamente.`);
  },

  exportarSolicitudes(data) {
    this.exportarGenerico(data, `solicitudes_${Helpers.today()}.xlsx`);
  },

  exportarLogs(data) {
    this.exportarGenerico(data, `logs_${Helpers.today()}.xlsx`);
  },

  exportarGenerico(data, filename) {
    if (!data || data.length === 0) { UI.warning('Sin datos para exportar.'); return; }
    if (typeof XLSX === 'undefined') { Helpers.downloadCSV(data, filename.replace('.xlsx', '.csv')); return; }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, filename);
  },

  async importar() {
    const hoja = document.getElementById('imHoja')?.value;
    const file = document.getElementById('imFile')?.files?.[0];

    if (!hoja || !file) return UI.warning('Seleccioná la hoja y el archivo.');

    const ok = await UI.confirm({
      title: 'Confirmar Importación',
      message: `¿Importar datos a la hoja "${hoja}"? Esta acción puede sobrescribir datos existentes.`,
      type: 'danger',
      confirmText: 'Importar',
    });
    if (!ok) return;

    UI.info('Procesando archivo…');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const res = await API.importarExcel(hoja, data);
        if (!res?.ok) return UI.error(res?.error || 'Error al importar.');
        UI.success(`${data.length} filas importadas correctamente.`);
      } catch (err) {
        UI.error('Error al procesar el archivo: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },
};
