/* ============================================================
   AGILIZATE – Módulo Configuración
   (Solo contiene el objeto Configuracion)
   ============================================================ */

const Configuracion = {

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Configuración del Sistema</h2>
      </div>
      <div class="tabs" id="configTabs">
        ${Permisos.puedeConfigValorHora()   ? `<button class="tab-btn active" data-tab="valorHora"   onclick="Configuracion._switchTab(this,'valorHora')">Valor Hora</button>`       : ''}
        ${Permisos.puedeConfigTipoCambio()  ? `<button class="tab-btn"        data-tab="tipoCambio"  onclick="Configuracion._switchTab(this,'tipoCambio')">Tipo de Cambio</button>` : ''}
        ${Permisos.puedeConfigReglaIB()     ? `<button class="tab-btn"        data-tab="reglaIB"     onclick="Configuracion._switchTab(this,'reglaIB')">Reglas IB</button>`         : ''}
        ${Permisos.puedeConfigMotivos()     ? `<button class="tab-btn"        data-tab="motivos"     onclick="Configuracion._switchTab(this,'motivos')">Motivos</button>`           : ''}
        ${Permisos.puedeConfigAreas()       ? `<button class="tab-btn"        data-tab="areas"       onclick="Configuracion._switchTab(this,'areas')">Áreas/Sectores</button>`     : ''}
        ${Permisos.puedeConfigurarSistema() ? `<button class="tab-btn"        data-tab="general"     onclick="Configuracion._switchTab(this,'general')">General</button>`          : ''}
        ${Permisos.puedeGestionarPermisos() ? `<button class="tab-btn"        data-tab="permisos"    onclick="Configuracion._switchTab(this,'permisos')">Permisos</button>`        : ''}
      </div>
      <div id="configContent">
        <div class="loading-screen"><div class="loading-spinner"></div></div>
      </div>
    `;

    // Mostrar el primer tab disponible
    const firstTab = content.querySelector('.tab-btn');
    if (firstTab) {
      const tabName = firstTab.dataset.tab;
      await this._loadTab(tabName);
    } else {
      document.getElementById('configContent').innerHTML = `
        <div class="empty-state"><h4>Sin permisos de configuración</h4>
        <p>No tenés permisos para ver ninguna sección de configuración.</p></div>`;
    }
  },

  _switchTab(btnEl, tab) {
    document.querySelectorAll('#configTabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    this._loadTab(tab);
  },

  async _loadTab(tab) {
    const el = document.getElementById('configContent');
    if (!el) return;
    el.innerHTML = `<div class="loading-screen" style="min-height:150px"><div class="loading-spinner"></div></div>`;

    try {
      switch (tab) {
        case 'valorHora':  await this._renderValorHora(el);  break;
        case 'tipoCambio': await this._renderTipoCambio(el); break;
        case 'reglaIB':    await this._renderReglaIB(el);    break;
        case 'motivos':    await this._renderMotivos(el);    break;
        case 'areas':      await this._renderAreas(el);      break;
        case 'general':    await this._renderGeneral(el);    break;
        case 'permisos':   await this._renderPermisos(el);   break;
        default: el.innerHTML = `<div class="empty-state"><h4>Tab no encontrada</h4></div>`;
      }
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  // ── Valor Hora ────────────────────────────────────────────
  async _renderValorHora(el) {
    const res  = await API.getValorHora();
    const data = res?.data || [];

    const rows = data.map(v => `
      <tr>
        <td class="font-mono text-xs">${v.IDCategoria}</td>
        <td style="font-weight:600">${v.NombreCategoria}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorHoraBase)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorExtra50)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorNocturna50)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorExtra100)}</td>
        <td class="font-mono">${Helpers.formatARS(v.ValorNocturna100)}</td>
        <td class="text-xs">${Helpers.formatDate(v.VigenciaDesde)} – ${Helpers.formatDate(v.VigenciaHasta)}</td>
        <td><span class="badge ${(v.Activo === 'TRUE' || v.Activo === true) ? 'badge-success' : 'badge-danger'}">${(v.Activo === 'TRUE' || v.Activo === true) ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn-icon" onclick="Configuracion._editarValorHora('${v.IDCategoria}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <p class="section-subtitle">Valores de hora por categoría de colaborador</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion._editarValorHora()">+ Nueva Categoría</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr>
            <th>ID</th><th>Categoría</th><th>Base</th><th>Extra 50%</th>
            <th>Noct. 50%</th><th>Extra 100%</th><th>Noct. 100%</th>
            <th>Vigencia</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  _editarValorHora(id) {
    // Obtener datos actuales si es edición
    const esEdicion = !!id;
    const modalId = UI.modal({
      id: 'modalVH',
      title: esEdicion ? 'Editar Valor Hora' : 'Nueva Categoría',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>ID Categoría *</label>
            <input type="text" id="vhId" placeholder="ej: operario" value="${esEdicion ? id : ''}" ${esEdicion ? 'readonly' : ''} />
          </div>
          <div class="form-group">
            <label>Nombre *</label>
            <input type="text" id="vhNombre" placeholder="ej: Operario" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Valor Hora Base *</label><input type="number" id="vhBase" min="0" /></div>
          <div class="form-group"><label>Extra 50%</label><input type="number" id="vhExtra50" min="0" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Nocturna 50%</label><input type="number" id="vhNoct50" min="0" /></div>
          <div class="form-group"><label>Extra 100%</label><input type="number" id="vhExtra100" min="0" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Nocturna 100%</label><input type="number" id="vhNoct100" min="0" /></div>
          <div class="form-group">
            <label>Activo</label>
            <select id="vhActivo"><option value="TRUE">Sí</option><option value="FALSE">No</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Vigencia Desde</label><input type="date" id="vhDesde" value="${Helpers.today()}" /></div>
          <div class="form-group"><label>Vigencia Hasta</label><input type="date" id="vhHasta" /></div>
        </div>
        <div id="vhError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalVH')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarValorHora('modalVH')">Guardar</button>
      `,
    });

    // Pre-cargar datos si es edición
    if (esEdicion) {
      API.getValorHora().then(res => {
        const item = (res?.data || []).find(v => v.IDCategoria === id);
        if (!item) return;
        document.getElementById('vhNombre')   && (document.getElementById('vhNombre').value   = item.NombreCategoria  || '');
        document.getElementById('vhBase')     && (document.getElementById('vhBase').value     = item.ValorHoraBase    || '');
        document.getElementById('vhExtra50')  && (document.getElementById('vhExtra50').value  = item.ValorExtra50     || '');
        document.getElementById('vhNoct50')   && (document.getElementById('vhNoct50').value   = item.ValorNocturna50  || '');
        document.getElementById('vhExtra100') && (document.getElementById('vhExtra100').value = item.ValorExtra100    || '');
        document.getElementById('vhNoct100')  && (document.getElementById('vhNoct100').value  = item.ValorNocturna100 || '');
        document.getElementById('vhDesde')    && (document.getElementById('vhDesde').value    = item.VigenciaDesde    || '');
        document.getElementById('vhHasta')    && (document.getElementById('vhHasta').value    = item.VigenciaHasta    || '');
        const sel = document.getElementById('vhActivo');
        if (sel) sel.value = (item.Activo === 'TRUE' || item.Activo === true) ? 'TRUE' : 'FALSE';
      });
    }
  },

  async _guardarValorHora(modalId) {
    const id      = document.getElementById('vhId')?.value?.trim();
    const nombre  = document.getElementById('vhNombre')?.value?.trim();
    const errEl   = document.getElementById('vhError');

    if (!id || !nombre) {
      if (errEl) { errEl.textContent = 'ID y Nombre son obligatorios.'; errEl.classList.remove('hidden'); }
      return;
    }

    const data = {
      IDCategoria:     id,
      NombreCategoria: nombre,
      ValorHoraBase:   parseFloat(document.getElementById('vhBase')?.value     || 0),
      ValorExtra50:    parseFloat(document.getElementById('vhExtra50')?.value  || 0),
      ValorNocturna50: parseFloat(document.getElementById('vhNoct50')?.value   || 0),
      ValorExtra100:   parseFloat(document.getElementById('vhExtra100')?.value || 0),
      ValorNocturna100:parseFloat(document.getElementById('vhNoct100')?.value  || 0),
      VigenciaDesde:   document.getElementById('vhDesde')?.value  || '',
      VigenciaHasta:   document.getElementById('vhHasta')?.value  || '',
      Activo:          document.getElementById('vhActivo')?.value || 'TRUE',
    };

    const res = await API.guardarValorHora(data);
    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }
    UI.closeModal(modalId);
    UI.success('Valor hora guardado correctamente.');
    this._loadTab('valorHora');
  },

  // ── Tipo de Cambio ────────────────────────────────────────
  async _renderTipoCambio(el) {
    const res  = await API.getTipoCambio();
    const data = (res?.data || []).sort((a, b) => {
      const ka = String(a.Año) + String(a.Mes).padStart(2, '0');
      const kb = String(b.Año) + String(b.Mes).padStart(2, '0');
      return kb.localeCompare(ka);
    });

    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const rows = data.map(t => `
      <tr>
        <td>${t.Año}</td>
        <td>${meses[parseInt(t.Mes)] || t.Mes}</td>
        <td class="font-mono">${Helpers.formatARS(t.TCPromedio)}</td>
        <td class="font-mono">${Helpers.formatARS(t.TCMin)}</td>
        <td class="font-mono">${Helpers.formatARS(t.TCMax)}</td>
        <td class="text-xs">${Helpers.formatDate(t.FechaActualizacion)}</td>
        <td>${t.Fuente || '–'}</td>
        <td>
          <button class="btn-icon" onclick="Configuracion._editarTC('${t.ID}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <p class="section-subtitle">Tipo de cambio ARS/USD por mes (utilizado en dashboards)</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion._editarTC()">+ Nuevo TC</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>Año</th><th>Mes</th><th>TC Promedio</th><th>Mín</th><th>Máx</th><th>Actualización</th><th>Fuente</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  _editarTC(id) {
    const esEdicion = !!id;
    const now = new Date();
    const modalId = UI.modal({
      id: 'modalTC',
      title: esEdicion ? 'Editar Tipo de Cambio' : 'Nuevo Tipo de Cambio',
      body: `
        <div class="form-row">
          <div class="form-group"><label>Año *</label><input type="number" id="tcAnio" value="${now.getFullYear()}" min="2020" max="2099" /></div>
          <div class="form-group"><label>Mes *</label>
            <select id="tcMes">
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${m === now.getMonth()+1 ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>TC Promedio *</label><input type="number" id="tcProm" step="0.01" min="0" /></div>
          <div class="form-group"><label>TC Mínimo</label><input type="number" id="tcMin" step="0.01" min="0" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>TC Máximo</label><input type="number" id="tcMax" step="0.01" min="0" /></div>
          <div class="form-group"><label>Fuente</label><input type="text" id="tcFuente" value="BCRA" /></div>
        </div>
        <div id="tcError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalTC')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarTC('modalTC')">Guardar</button>
      `,
    });

    if (esEdicion) {
      API.getTipoCambio().then(res => {
        const item = (res?.data || []).find(t => t.ID === id);
        if (!item) return;
        document.getElementById('tcAnio') && (document.getElementById('tcAnio').value  = item.Año       || '');
        document.getElementById('tcMes')  && (document.getElementById('tcMes').value   = item.Mes       || '');
        document.getElementById('tcProm') && (document.getElementById('tcProm').value  = item.TCPromedio || '');
        document.getElementById('tcMin')  && (document.getElementById('tcMin').value   = item.TCMin      || '');
        document.getElementById('tcMax')  && (document.getElementById('tcMax').value   = item.TCMax      || '');
        document.getElementById('tcFuente') && (document.getElementById('tcFuente').value = item.Fuente || 'BCRA');
      });
    }
  },

  async _guardarTC(modalId) {
    const anio  = document.getElementById('tcAnio')?.value;
    const mes   = document.getElementById('tcMes')?.value;
    const prom  = document.getElementById('tcProm')?.value;
    const errEl = document.getElementById('tcError');

    if (!anio || !mes || !prom) {
      if (errEl) { errEl.textContent = 'Año, Mes y TC Promedio son obligatorios.'; errEl.classList.remove('hidden'); }
      return;
    }

    const res = await API.guardarTipoCambio({
      Año: parseInt(anio), Mes: parseInt(mes),
      TCPromedio: parseFloat(prom),
      TCMin: parseFloat(document.getElementById('tcMin')?.value  || 0),
      TCMax: parseFloat(document.getElementById('tcMax')?.value  || 0),
      Fuente: document.getElementById('tcFuente')?.value || 'BCRA',
      FechaActualizacion: Helpers.today(),
    });

    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }
    UI.closeModal(modalId);
    UI.success('Tipo de cambio guardado.');
    this._loadTab('tipoCambio');
  },

  // ── Reglas IB ─────────────────────────────────────────────
  async _renderReglaIB(el) {
    const res  = await API.getReglaIB();
    const data = (res?.data || []).sort((a, b) => parseInt(a.OrdenPrioridad) - parseInt(b.OrdenPrioridad));

    const rows = data.map(r => `
      <tr>
        <td><span class="ib-badge ib-${r.TarjetaIB}">${r.TarjetaIB}</span></td>
        <td class="font-mono">${r.LimiteMinimo} – ${r.LimiteMaximo} hs</td>
        <td>${r.PeriodoEvaluacion}</td>
        <td>${r.DiasEvaluacion} días</td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:.4rem">
            <span style="width:14px;height:14px;border-radius:50%;background:${r.ColorHex};display:inline-block"></span>
            <span class="font-mono text-xs">${r.ColorHex}</span>
          </span>
        </td>
        <td><span class="badge ${r.AlertaEmail === 'TRUE' ? 'badge-warning' : 'badge-gray'}">${r.AlertaEmail === 'TRUE' ? 'Sí' : 'No'}</span></td>
        <td><span class="badge ${r.BloqueoAutomatico === 'TRUE' ? 'badge-danger' : 'badge-gray'}">${r.BloqueoAutomatico === 'TRUE' ? 'Sí' : 'No'}</span></td>
        <td>
          <button class="btn-icon" onclick="Configuracion._editarReglaIB('${r.ID}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <p class="section-subtitle">Niveles del Índice de Comportamiento (IB) — reseteo mensual automático</p>
      </div>
      <div class="alert alert-info" style="margin-bottom:1rem">
        <strong>Cómo funciona:</strong> Cada mes se resetean las horas del período para todos los colaboradores.
        El IB se calcula en tiempo real según las horas acumuladas en el período actual y los límites aquí definidos.
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>Nivel</th><th>Rango Horas</th><th>Período</th><th>Días</th><th>Color</th><th>Alerta Email</th><th>Bloqueo Auto</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>`;
  },

  _editarReglaIB(id) {
    const modalId = UI.modal({
      id: 'modalIB',
      title: 'Editar Regla IB',
      body: `
        <div class="form-row">
          <div class="form-group"><label>Límite Mínimo (hs)</label><input type="number" id="ibMin" min="0" step="0.5" /></div>
          <div class="form-group"><label>Límite Máximo (hs)</label><input type="number" id="ibMax" min="0" step="0.5" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Período</label>
            <select id="ibPeriodo"><option value="MENSUAL">Mensual</option><option value="TRIMESTRAL">Trimestral</option></select>
          </div>
          <div class="form-group"><label>Color Hex</label><input type="color" id="ibColor" style="height:38px;padding:.2rem" /></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-wrap" style="margin-top:1.5rem">
              <input type="checkbox" id="ibAlerta" /> Alerta por email
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-wrap" style="margin-top:1.5rem">
              <input type="checkbox" id="ibBloqueo" /> Bloqueo automático
            </label>
          </div>
        </div>
        <div id="ibError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalIB')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarReglaIB('${id}','modalIB')">Guardar</button>
      `,
    });

    // Pre-cargar datos
    API.getReglaIB().then(res => {
      const item = (res?.data || []).find(r => r.ID === id);
      if (!item) return;
      document.getElementById('ibMin')     && (document.getElementById('ibMin').value     = item.LimiteMinimo  || '');
      document.getElementById('ibMax')     && (document.getElementById('ibMax').value     = item.LimiteMaximo  || '');
      document.getElementById('ibPeriodo') && (document.getElementById('ibPeriodo').value = item.PeriodoEvaluacion || 'MENSUAL');
      document.getElementById('ibColor')   && (document.getElementById('ibColor').value   = item.ColorHex      || '#10b981');
      if (document.getElementById('ibAlerta'))  document.getElementById('ibAlerta').checked  = item.AlertaEmail === 'TRUE';
      if (document.getElementById('ibBloqueo')) document.getElementById('ibBloqueo').checked = item.BloqueoAutomatico === 'TRUE';
    });
  },

  async _guardarReglaIB(id, modalId) {
    const errEl = document.getElementById('ibError');
    const data  = {
      ID:                id,
      LimiteMinimo:      parseFloat(document.getElementById('ibMin')?.value     || 0),
      LimiteMaximo:      parseFloat(document.getElementById('ibMax')?.value     || 0),
      PeriodoEvaluacion: document.getElementById('ibPeriodo')?.value            || 'MENSUAL',
      ColorHex:          document.getElementById('ibColor')?.value              || '#10b981',
      AlertaEmail:       document.getElementById('ibAlerta')?.checked  ? 'TRUE' : 'FALSE',
      BloqueoAutomatico: document.getElementById('ibBloqueo')?.checked ? 'TRUE' : 'FALSE',
    };

    const res = await API.guardarReglaIB(data);
    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }
    UI.closeModal(modalId);
    UI.success('Regla IB actualizada.');
    this._loadTab('reglaIB');
  },

  // ── Motivos ───────────────────────────────────────────────
  async _renderMotivos(el) {
    const res  = await API.getMotivos();
    const data = res?.data || [];

    const rows = data.map(m => `
      <tr>
        <td class="font-mono text-xs">${m.IDMotivo}</td>
        <td style="font-weight:600">${m.MotivoExtra}</td>
        <td><span class="badge ${m.TipoExtra === 'PRODUCTIVO' ? 'badge-success' : 'badge-warning'}">${m.TipoExtra}</span></td>
        <td class="text-xs">${m.MaximoHorasDia || '–'} hs</td>
        <td><span class="badge ${m.RequiereJustificacion === 'TRUE' ? 'badge-warning' : 'badge-gray'}">${m.RequiereJustificacion === 'TRUE' ? 'Sí' : 'No'}</span></td>
        <td><span class="badge ${(m.Activo === 'TRUE' || m.Activo === true) ? 'badge-success' : 'badge-danger'}">${(m.Activo === 'TRUE' || m.Activo === true) ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn-icon" onclick="Configuracion._editarMotivo('${m.IDMotivo}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <p class="section-subtitle">Motivos de horas extras — definen si aplica 50% (Productivo) o 100% (Improductivo)</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion._editarMotivo()">+ Nuevo Motivo</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Motivo</th><th>Tipo</th><th>Máx Hs/día</th><th>Req. Justif.</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  _editarMotivo(id) {
    const esEdicion = !!id;
    UI.modal({
      id: 'modalMotivo',
      title: esEdicion ? 'Editar Motivo' : 'Nuevo Motivo',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>ID Motivo *</label>
            <input type="text" id="motId" placeholder="ej: entrega_urgente" value="${id || ''}" ${esEdicion ? 'readonly' : ''} />
          </div>
          <div class="form-group">
            <label>Descripción *</label>
            <input type="text" id="motDesc" placeholder="ej: Entrega urgente de pedido" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo Extra *</label>
            <select id="motTipo">
              <option value="PRODUCTIVO">PRODUCTIVO (50%)</option>
              <option value="IMPRODUCTIVO">IMPRODUCTIVO (100%)</option>
            </select>
          </div>
          <div class="form-group"><label>Máx. Horas / Día</label><input type="number" id="motMaxHs" value="12" min="1" max="24" /></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-wrap" style="margin-top:1.5rem">
              <input type="checkbox" id="motJustif" /> Requiere justificación
            </label>
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="motActivo"><option value="TRUE">Activo</option><option value="FALSE">Inactivo</option></select>
          </div>
        </div>
        <div id="motError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalMotivo')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarMotivo('modalMotivo')">Guardar</button>
      `,
    });

    if (esEdicion) {
      API.getMotivos().then(res => {
        const item = (res?.data || []).find(m => m.IDMotivo === id);
        if (!item) return;
        document.getElementById('motDesc')   && (document.getElementById('motDesc').value   = item.MotivoExtra || '');
        document.getElementById('motTipo')   && (document.getElementById('motTipo').value   = item.TipoExtra   || 'PRODUCTIVO');
        document.getElementById('motMaxHs')  && (document.getElementById('motMaxHs').value  = item.MaximoHorasDia || 12);
        document.getElementById('motActivo') && (document.getElementById('motActivo').value = (item.Activo === 'TRUE' || item.Activo === true) ? 'TRUE' : 'FALSE');
        if (document.getElementById('motJustif')) document.getElementById('motJustif').checked = item.RequiereJustificacion === 'TRUE';
      });
    }
  },

  async _guardarMotivo(modalId) {
    const id    = document.getElementById('motId')?.value?.trim();
    const desc  = document.getElementById('motDesc')?.value?.trim();
    const errEl = document.getElementById('motError');

    if (!id || !desc) {
      if (errEl) { errEl.textContent = 'ID y Descripción son obligatorios.'; errEl.classList.remove('hidden'); }
      return;
    }

    const res = await API.guardarMotivo({
      IDMotivo:             id,
      MotivoExtra:          desc,
      TipoExtra:            document.getElementById('motTipo')?.value    || 'PRODUCTIVO',
      MaximoHorasDia:       parseInt(document.getElementById('motMaxHs')?.value || 12),
      RequiereJustificacion:document.getElementById('motJustif')?.checked ? 'TRUE' : 'FALSE',
      Activo:               document.getElementById('motActivo')?.value  || 'TRUE',
    });

    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }
    UI.closeModal(modalId);
    UI.success('Motivo guardado.');
    this._loadTab('motivos');
  },

  // ── Áreas/Sectores ────────────────────────────────────────
  async _renderAreas(el) {
    const res  = await API.getAreas();
    const data = res?.data || [];

    const rows = data.map(a => `
      <tr>
        <td class="font-mono text-xs">${a.IDSector}</td>
        <td style="font-weight:600">${a.Sector}</td>
        <td>${a.Area}</td>
        <td class="text-xs">${a.EmailNotificacion || '–'}</td>
        <td><span class="badge ${a.RequiereAprobacionDoble === 'TRUE' ? 'badge-warning' : 'badge-gray'}">${a.RequiereAprobacionDoble === 'TRUE' ? 'Sí' : 'No'}</span></td>
        <td><span class="badge ${(a.Activo === 'TRUE' || a.Activo === true) ? 'badge-success' : 'badge-danger'}">${(a.Activo === 'TRUE' || a.Activo === true) ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn-icon" onclick="Configuracion._editarArea('${a.IDSector}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <p class="section-subtitle">Áreas y sectores de la organización</p>
        <button class="btn btn-primary btn-sm" onclick="Configuracion._editarArea()">+ Nuevo Sector</button>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>ID Sector</th><th>Sector</th><th>Área</th><th>Email Notif.</th><th>Apro. Doble</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin áreas</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  _editarArea(id) {
    const esEdicion = !!id;
    UI.modal({
      id: 'modalArea',
      title: esEdicion ? 'Editar Sector' : 'Nuevo Sector',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>ID Sector *</label>
            <input type="text" id="areaId" placeholder="ej: corte" value="${id || ''}" ${esEdicion ? 'readonly' : ''} />
          </div>
          <div class="form-group">
            <label>Nombre Sector *</label>
            <input type="text" id="areaSector" placeholder="ej: Corte" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Área (agrupador) *</label>
            <input type="text" id="areaArea" placeholder="ej: Producción" />
          </div>
          <div class="form-group">
            <label>Email Notificación</label>
            <input type="email" id="areaEmail" placeholder="area@empresa.com" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-wrap" style="margin-top:1.5rem">
              <input type="checkbox" id="areaDoble" /> Requiere aprobación doble
            </label>
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="areaActivo"><option value="TRUE">Activo</option><option value="FALSE">Inactivo</option></select>
          </div>
        </div>
        <div id="areaError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalArea')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarArea('modalArea')">Guardar</button>
      `,
    });

    if (esEdicion) {
      API.getAreas().then(res => {
        const item = (res?.data || []).find(a => a.IDSector === id);
        if (!item) return;
        document.getElementById('areaSector') && (document.getElementById('areaSector').value = item.Sector || '');
        document.getElementById('areaArea')   && (document.getElementById('areaArea').value   = item.Area   || '');
        document.getElementById('areaEmail')  && (document.getElementById('areaEmail').value  = item.EmailNotificacion || '');
        document.getElementById('areaActivo') && (document.getElementById('areaActivo').value = (item.Activo === 'TRUE' || item.Activo === true) ? 'TRUE' : 'FALSE');
        if (document.getElementById('areaDoble')) document.getElementById('areaDoble').checked = item.RequiereAprobacionDoble === 'TRUE';
      });
    }
  },

  async _guardarArea(modalId) {
    const id     = document.getElementById('areaId')?.value?.trim();
    const sector = document.getElementById('areaSector')?.value?.trim();
    const area   = document.getElementById('areaArea')?.value?.trim();
    const errEl  = document.getElementById('areaError');

    if (!id || !sector || !area) {
      if (errEl) { errEl.textContent = 'ID, Sector y Área son obligatorios.'; errEl.classList.remove('hidden'); }
      return;
    }

    const res = await API.guardarArea({
      IDSector:               id,
      Sector:                 sector,
      Area:                   area,
      EmailNotificacion:      document.getElementById('areaEmail')?.value  || '',
      RequiereAprobacionDoble:document.getElementById('areaDoble')?.checked ? 'TRUE' : 'FALSE',
      Activo:                 document.getElementById('areaActivo')?.value || 'TRUE',
    });

    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }
    UI.closeModal(modalId);
    UI.success('Área/Sector guardado.');
    this._loadTab('areas');
  },

  // ── General ───────────────────────────────────────────────
  async _renderGeneral(el) {
    const res  = await API.getConfiguracion();
    const data = res?.data || [];

    const rows = data.map(c => `
      <tr>
        <td class="font-mono text-xs" style="font-weight:700">${c.Clave}</td>
        <td style="font-size:.85rem;color:var(--c-gray-600)">${c.Descripcion || '–'}</td>
        <td><code style="background:var(--c-gray-100);padding:.15rem .4rem;border-radius:4px;font-size:.82rem">${c.Valor}</code></td>
        <td><span class="badge badge-gray text-xs">${c.Tipo}</span></td>
        <td class="text-xs">${c.Categoria || '–'}</td>
        <td>
          <button class="btn-icon" onclick="Configuracion._editarConfigClave('${c.Clave}','${c.Valor}')" data-tooltip="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <p class="section-subtitle">Parámetros globales del sistema</p>
      </div>
      <div class="card"><div class="table-wrap">
        <table>
          <thead><tr><th>Clave</th><th>Descripción</th><th>Valor Actual</th><th>Tipo</th><th>Categoría</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--c-gray-400)">Sin datos</td></tr>'}</tbody>
        </table>
      </div></div>`;
  },

  _editarConfigClave(clave, valorActual) {
    const modalId = UI.modal({
      id: 'modalCfg',
      title: `Editar: ${clave}`,
      body: `
        <div class="form-group">
          <label>Clave</label>
          <input type="text" value="${clave}" readonly style="background:var(--c-gray-50);color:var(--c-gray-500)" />
        </div>
        <div class="form-group">
          <label>Nuevo Valor *</label>
          <input type="text" id="cfgValor" value="${valorActual}" />
        </div>
        <div id="cfgError" class="alert alert-error hidden"></div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal('modalCfg')">Cancelar</button>
        <button class="btn btn-primary" onclick="Configuracion._guardarCfgClave('${clave}','modalCfg')">Guardar</button>
      `,
    });
  },

  async _guardarCfgClave(clave, modalId) {
    const valor = document.getElementById('cfgValor')?.value;
    const errEl = document.getElementById('cfgError');

    if (valor === undefined || valor === '') {
      if (errEl) { errEl.textContent = 'El valor no puede estar vacío.'; errEl.classList.remove('hidden'); }
      return;
    }

    const res = await API.guardarConfiguracion({ clave, valor });
    if (!res?.ok) {
      if (errEl) { errEl.textContent = res?.error || 'Error al guardar.'; errEl.classList.remove('hidden'); }
      return;
    }
    UI.closeModal(modalId);
    UI.success('Configuración actualizada.');
    this._loadTab('general');
  },

  // ── Permisos (Matriz de Roles) ────────────────────────────
  async _renderPermisos(el) {
    const rolesRes = await API.getRoles();
    const roles    = (rolesRes?.data || []).sort((a, b) => parseInt(a.Prioridad) - parseInt(b.Prioridad));

    const permisosList = [
      { key: 'SOLICITUDES_CREAR',      label: 'Solicitudes: Crear',      bit: CONFIG.PERMISOS.SOLICITUDES_CREAR },
      { key: 'SOLICITUDES_LEER',       label: 'Solicitudes: Leer',       bit: CONFIG.PERMISOS.SOLICITUDES_LEER },
      { key: 'SOLICITUDES_MODIFICAR',  label: 'Solicitudes: Modificar',  bit: CONFIG.PERMISOS.SOLICITUDES_MODIFICAR },
      { key: 'SOLICITUDES_ELIMINAR',   label: 'Solicitudes: Eliminar',   bit: CONFIG.PERMISOS.SOLICITUDES_ELIMINAR },
      { key: 'SOLICITUDES_APROBAR',    label: 'Solicitudes: Aprobar',    bit: CONFIG.PERMISOS.SOLICITUDES_APROBAR },
      { key: 'SOLICITUDES_RECHAZAR',   label: 'Solicitudes: Rechazar',   bit: CONFIG.PERMISOS.SOLICITUDES_RECHAZAR },
      { key: 'USUARIOS_CREAR',         label: 'Usuarios: Crear',         bit: CONFIG.PERMISOS.USUARIOS_CREAR },
      { key: 'USUARIOS_LEER',          label: 'Usuarios: Leer',          bit: CONFIG.PERMISOS.USUARIOS_LEER },
      { key: 'USUARIOS_MODIFICAR',     label: 'Usuarios: Modificar',     bit: CONFIG.PERMISOS.USUARIOS_MODIFICAR },
      { key: 'USUARIOS_ELIMINAR',      label: 'Usuarios: Eliminar',      bit: CONFIG.PERMISOS.USUARIOS_ELIMINAR },
      { key: 'USUARIOS_ASIGNAR_ROL',   label: 'Usuarios: Asignar Rol',   bit: CONFIG.PERMISOS.USUARIOS_ASIGNAR_ROL },
      { key: 'CONFIG_VALORHORA',       label: 'Config: Valor Hora',      bit: CONFIG.PERMISOS.CONFIG_VALORHORA },
      { key: 'CONFIG_TIPOCAMBIO',      label: 'Config: Tipo Cambio',     bit: CONFIG.PERMISOS.CONFIG_TIPOCAMBIO },
      { key: 'CONFIG_REGLAIB',         label: 'Config: Regla IB',        bit: CONFIG.PERMISOS.CONFIG_REGLAIB },
      { key: 'CONFIG_MOTIVOS',         label: 'Config: Motivos',         bit: CONFIG.PERMISOS.CONFIG_MOTIVOS },
      { key: 'CONFIG_AREAS',           label: 'Config: Áreas',           bit: CONFIG.PERMISOS.CONFIG_AREAS },
      { key: 'DASHBOARD_VER',          label: 'Dashboard: Ver',          bit: CONFIG.PERMISOS.DASHBOARD_VER },
      { key: 'DASHBOARD_EXPORTAR',     label: 'Dashboard: Exportar',     bit: CONFIG.PERMISOS.DASHBOARD_EXPORTAR },
      { key: 'REPORTE_GLOBAL',         label: 'Reporte Global',          bit: CONFIG.PERMISOS.REPORTE_GLOBAL },
      { key: 'EXCEL_EXPORTAR',         label: 'Excel: Exportar',         bit: CONFIG.PERMISOS.EXCEL_EXPORTAR },
      { key: 'EXCEL_IMPORTAR',         label: 'Excel: Importar',         bit: CONFIG.PERMISOS.EXCEL_IMPORTAR },
      { key: 'PORTERIA_VER',           label: 'Portería: Ver',           bit: CONFIG.PERMISOS.PORTERIA_VER },
      { key: 'PORTERIA_REGISTRAR',     label: 'Portería: Registrar',     bit: CONFIG.PERMISOS.PORTERIA_REGISTRAR },
      { key: 'AUDITORIA_VER',          label: 'Auditoría: Ver',          bit: CONFIG.PERMISOS.AUDITORIA_VER },
      { key: 'AUDITORIA_EXPORTAR',     label: 'Auditoría: Exportar',     bit: CONFIG.PERMISOS.AUDITORIA_EXPORTAR },
      { key: 'GESTIONAR_PERMISOS',     label: 'Gestionar Permisos',      bit: CONFIG.PERMISOS.GESTIONAR_PERMISOS },
      { key: 'CONFIGURAR_SISTEMA',     label: 'Configurar Sistema',      bit: CONFIG.PERMISOS.CONFIGURAR_SISTEMA },
    ];

    const thCols = roles.map(r =>
      `<th style="text-align:center;min-width:90px;font-size:.72rem">${r.NombreRol}</th>`
    ).join('');

    const rows = permisosList.map(p => {
      const checks = roles.map(r => {
        const mask  = parseInt(r.PermisosBitMask || 0);
        const tiene = (mask & p.bit) !== 0;
        const isDev = r.ID === 'desarrollador';
        return `<td style="text-align:center">
          <input type="checkbox" class="perm-check"
            data-rol="${r.ID}" data-bit="${p.bit}"
            ${tiene ? 'checked' : ''}
            ${isDev ? 'disabled title="El rol Desarrollador siempre tiene acceso total"' : ''}
            onchange="Configuracion._onPermChange(this)" />
        </td>`;
      }).join('');
      return `<tr><td style="font-size:.8rem;white-space:nowrap;padding:.5rem 1rem">${p.label}</td>${checks}</tr>`;
    }).join('');

    el.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:1rem">
        <strong>Matriz de Permisos:</strong> Los cambios se aplican inmediatamente al rol.
        El rol <strong>Desarrollador</strong> siempre tiene acceso total y no puede modificarse.
      </div>
      <div class="card"><div class="table-wrap" style="overflow-x:auto">
        <table class="perms-table">
          <thead>
            <tr>
              <th style="min-width:220px">Permiso</th>
              ${thCols}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>`;
  },

  async _onPermChange(checkbox) {
    const rolId  = checkbox.dataset.rol;
    const bit    = parseInt(checkbox.dataset.bit);
    const activo = checkbox.checked;

    const res = await API.actualizarPermisoRol({ rolId, bit, activo });
    if (!res?.ok) {
      checkbox.checked = !activo; // Revertir cambio visual
      UI.error(res?.error || 'Error al actualizar permiso.');
      return;
    }
    UI.success(`Permiso ${activo ? 'otorgado' : 'removido'} correctamente.`);
  },
};
