/* ============================================================
   AGILIZATE – Módulo Nómina
   ============================================================ */

const Nomina = {
  _data:  [],
  _page:  1,
  _total: 0,
  _busqueda: '',

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Nómina de Personal</h2>
          <p class="section-subtitle" id="nominaSubtitle">Cargando…</p>
        </div>
      </div>

      <div class="filter-bar">
        <div class="form-group" style="flex:2;min-width:200px">
          <label>Buscar</label>
          <input type="text" id="nominaBuscar" placeholder="Apellido, nombre o legajo…"
            oninput="Nomina._onBuscar(this.value)" value="${this._busqueda}" />
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="nominaEstado" onchange="Nomina._onFiltroChange()">
            <option value="">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="BAJA">Baja</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
        <div class="form-group">
          <label>IB</label>
          <select id="nominaIB" onchange="Nomina._onFiltroChange()">
            <option value="">Todos</option>
            <option value="BUENO">Bueno</option>
            <option value="REGULAR">Regular</option>
            <option value="MALO">Malo</option>
            <option value="CRITICO">Crítico</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap" id="nominaTableWrap">
          <div class="loading-screen" style="min-height:200px">
            <div class="loading-spinner"></div>
          </div>
        </div>
        <div id="nominaPaginacion"></div>
      </div>
    `;

    await this._cargar();
  },

  async _cargar() {
    try {
      const res  = await API.getNomina({ page: this._page, perPage: CONFIG.ROWS_PER_PAGE });
      this._data  = res?.data  || [];
      this._total = res?.total || this._data.length;

      const subtitle = document.getElementById('nominaSubtitle');
      if (subtitle) subtitle.textContent = `${this._total} colaborador(es) en el sistema`;

      this._renderTabla(this._data);
      this._renderPaginacion();
    } catch (err) {
      const wrap = document.getElementById('nominaTableWrap');
      if (wrap) wrap.innerHTML = `<div class="empty-state"><h4>Error al cargar</h4><p>${err.message}</p></div>`;
    }
  },

  _renderTabla(data) {
    const wrap = document.getElementById('nominaTableWrap');
    if (!wrap) return;

    if (!data.length) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:3rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;margin:0 auto 1rem;opacity:.3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <h4>Sin resultados</h4>
          <p>No se encontraron colaboradores con los filtros aplicados.</p>
        </div>`;
      return;
    }

    const rows = data.map(n => {
      const estadoClass = n.Estado === 'ACTIVO' ? 'badge-success' : 'badge-danger';
      return `
        <tr>
          <td class="font-mono" style="font-size:.85rem">${n.Legajo}</td>
          <td style="font-weight:600">${n.ApellidoNombre}</td>
          <td>${n.Condicion || '–'}</td>
          <td>${n.CategoriaID || '–'}</td>
          <td>${Helpers.ibBadge(n.IB_Actual)}</td>
          <td class="font-mono">${Helpers.formatHoras(n.RankingHorasPeriodo)}</td>
          <td class="font-mono">${Helpers.formatHoras(n.RankingHorasAcumuladas)}</td>
          <td style="font-size:.8rem">${Helpers.formatDate(n.UltimoReseteoIB)}</td>
          <td>${n.AreaID || '–'}</td>
          <td>${n.SectorID || '–'}</td>
          <td><span class="badge ${estadoClass}">${n.Estado || '–'}</span></td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Legajo</th>
            <th>Apellido y Nombre</th>
            <th>Condición</th>
            <th>Categoría</th>
            <th>IB</th>
            <th>Hs Período</th>
            <th>Hs Acum.</th>
            <th>Último Reset</th>
            <th>Área</th>
            <th>Sector</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  _renderPaginacion() {
    const el    = document.getElementById('nominaPaginacion');
    if (!el) return;
    const pages = Math.ceil(this._total / CONFIG.ROWS_PER_PAGE) || 1;
    el.innerHTML = Helpers.paginationHTML(this._page, pages, 'Nomina._irPagina');
  },

  _irPagina(p) {
    Nomina._page = p;
    Nomina._cargar();
  },

  _onBuscar: Helpers.debounce
    ? Helpers.debounce(function(val) { Nomina._busqueda = val; Nomina._filtrarLocal(); }, 300)
    : function(val) { Nomina._busqueda = val; Nomina._filtrarLocal(); },

  _onFiltroChange() {
    this._filtrarLocal();
  },

  _filtrarLocal() {
    const busq   = (document.getElementById('nominaBuscar')?.value || '').toLowerCase();
    const estado = document.getElementById('nominaEstado')?.value || '';
    const ib     = document.getElementById('nominaIB')?.value     || '';

    const filtrado = this._data.filter(n => {
      const matchBusq   = !busq   || (n.ApellidoNombre || '').toLowerCase().includes(busq) || String(n.Legajo).includes(busq);
      const matchEstado = !estado || n.Estado    === estado;
      const matchIB     = !ib     || n.IB_Actual === ib;
      return matchBusq && matchEstado && matchIB;
    });

    this._renderTabla(filtrado);
  },
};
