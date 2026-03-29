/* ============================================================
   AGILIZATE – Módulo Dashboard
   ============================================================ */

const Dashboard = {
  _charts: {},
  _filtros: {},
  _areas: [],
  _motivos: [],
  _tipoCambio: [],

  async init() {
    UI.registerSection('dashboard', () => Dashboard.render());
  },

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    // Cargar catálogos
    const [areasRes, motivosRes, tcRes] = await Promise.all([
      API.getAreas(), API.getMotivos(), API.getTipoCambio()
    ]);
    this._areas     = areasRes?.data  || [];
    this._motivos   = motivosRes?.data || [];
    this._tipoCambio = tcRes?.data    || [];

    content.innerHTML = this._buildHTML();
    this._initFiltros();
    await this._loadData();
  },

  _buildHTML() {
    const areasUnicas = [...new Map(this._areas.map(a => [a.Area, a])).values()];
    const canExport   = Permisos.puedeExportarDashboard();

    return `
      <div class="section-header">
        <div>
          <h2 class="section-title">Dashboard</h2>
          <p class="section-subtitle">Análisis integral de horas extras</p>
        </div>
        ${canExport ? `<button class="btn btn-ghost btn-sm" onclick="Dashboard.exportar()">⬇ Exportar</button>` : ''}
      </div>

      <!-- Filtros -->
      <div class="filter-bar">
        <div class="form-group">
          <label>Desde</label>
          <input type="date" id="dFechaDesde" value="${Helpers.firstDayOfMonth()}" />
        </div>
        <div class="form-group">
          <label>Hasta</label>
          <input type="date" id="dFechaHasta" value="${Helpers.today()}" />
        </div>
        <div class="form-group">
          <label>Área</label>
          <select id="dArea">
            ${Helpers.buildOptions(areasUnicas, 'Area', 'Area', '', 'Todas las áreas')}
          </select>
        </div>
        <div class="form-group">
          <label>Sector</label>
          <select id="dSector">
            <option value="">Todos</option>
          </select>
        </div>
        <div class="form-group">
          <label>Motivo</label>
          <select id="dMotivo">
            ${Helpers.buildOptions(this._motivos.filter(m => m.Activo), 'IDMotivo', 'MotivoExtra', '', 'Todos')}
          </select>
        </div>
        <div class="form-group">
          <label>Tipo Extra</label>
          <select id="dTipoExtra">
            <option value="">Todos</option>
            <option value="PRODUCTIVO">Productivo</option>
            <option value="IMPRODUCTIVO">Improductivo</option>
          </select>
        </div>
        <div class="form-group">
          <label>Agrupación</label>
          <select id="dAgrupacion">
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" style="margin-top:1.35rem" onclick="Dashboard.aplicarFiltros()">Filtrar</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="stats-grid" id="dashStats">
        ${this._loadingCard(4)}
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="chart-card chart-full">
          <div class="chart-card-header"><h4>Evolución de Horas Extras</h4></div>
          <div class="chart-card-body"><canvas id="chartEvolucion"></canvas></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header"><h4>Distribución por Tipo</h4></div>
          <div class="chart-card-body"><canvas id="chartTipo"></canvas></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header"><h4>Horas por Área</h4></div>
          <div class="chart-card-body"><canvas id="chartArea"></canvas></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header"><h4>Valores ARS / USD</h4></div>
          <div class="chart-card-body"><canvas id="chartValores"></canvas></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header"><h4>Estados de Solicitudes</h4></div>
          <div class="chart-card-body"><canvas id="chartEstados"></canvas></div>
        </div>
      </div>

      <!-- Tabla Top Colaboradores -->
      <div class="card">
        <div class="card-header"><h3>Top Colaboradores por Horas</h3></div>
        <div class="card-body" id="dashTopColabs">
          <div class="loading-screen" style="min-height:100px"><div class="loading-spinner"></div></div>
        </div>
      </div>
    `;
  },

  _loadingCard(n) {
    return Array(n).fill('<div class="stat-card" style="opacity:.4"><div class="stat-label">Cargando…</div><div class="stat-value">–</div></div>').join('');
  },

  _initFiltros() {
    const areaSelect = document.getElementById('dArea');
    if (areaSelect) {
      areaSelect.addEventListener('change', () => {
        const area    = areaSelect.value;
        const sSelect = document.getElementById('dSector');
        if (!sSelect) return;
        const sectores = this._areas.filter(a => a.Area === area);
        sSelect.innerHTML = `<option value="">Todos</option>` +
          sectores.map(s => `<option value="${s.IDSector}">${s.Sector}</option>`).join('');
      });
    }
  },

  aplicarFiltros() {
    this._filtros = {
      fechaDesde: document.getElementById('dFechaDesde')?.value,
      fechaHasta: document.getElementById('dFechaHasta')?.value,
      area:       document.getElementById('dArea')?.value,
      sector:     document.getElementById('dSector')?.value,
      motivo:     document.getElementById('dMotivo')?.value,
      tipoExtra:  document.getElementById('dTipoExtra')?.value,
      agrupacion: document.getElementById('dAgrupacion')?.value || 'mensual',
    };
    this._loadData();
  },

  async _loadData() {
    const filtros = {
      fechaDesde: document.getElementById('dFechaDesde')?.value,
      fechaHasta: document.getElementById('dFechaHasta')?.value,
      area:       document.getElementById('dArea')?.value,
      sector:     document.getElementById('dSector')?.value,
      motivo:     document.getElementById('dMotivo')?.value,
      tipoExtra:  document.getElementById('dTipoExtra')?.value,
      agrupacion: document.getElementById('dAgrupacion')?.value || 'mensual',
      ...this._filtros,
    };

    const res = await API.getDashboardData(filtros);
    const d   = res?.data || {};

    this._renderStats(d);
    this._renderCharts(d);
    this._renderTopColabs(d.topColaboradores || []);
  },

  _renderStats(d) {
    const statsEl = document.getElementById('dashStats');
    if (!statsEl) return;

    const tcActual = this._tipoCambio.length
      ? this._tipoCambio.sort((a, b) => new Date(`${b.Año}-${b.Mes}`) - new Date(`${a.Año}-${a.Mes}`))[0]
      : null;
    const tc = tcActual?.TCPromedio || 1;

    const totalARS = d.totalGeneral || 0;
    const totalUSD = totalARS / tc;

    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-label">Solicitudes</div>
        <div class="stat-value">${d.totalSolicitudes || 0}</div>
        <div class="stat-sub">En el período seleccionado</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱</div>
        <div class="stat-label">Total Horas</div>
        <div class="stat-value">${Helpers.formatHoras(d.totalHoras)}</div>
        <div class="stat-sub">50%: ${Helpers.formatHoras(d.horas50)} | 100%: ${Helpers.formatHoras(d.horas100)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Total ARS</div>
        <div class="stat-value" style="font-size:1.3rem">${Helpers.formatARS(totalARS)}</div>
        <div class="stat-sub">TC: ${Helpers.formatARS(tc)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💵</div>
        <div class="stat-label">Total USD</div>
        <div class="stat-value" style="font-size:1.3rem">${Helpers.formatUSD(totalUSD)}</div>
        <div class="stat-sub">Calculado en tiempo real</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Aprobadas</div>
        <div class="stat-value" style="color:var(--c-success)">${d.aprobadas || 0}</div>
        <div class="stat-sub">Pendientes: ${d.pendientes || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Colaboradores</div>
        <div class="stat-value">${d.totalColaboradores || 0}</div>
        <div class="stat-sub">Con horas en el período</div>
      </div>
    `;
  },

  _renderCharts(d) {
    this._destroyCharts();

    const palette = [
      '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
      '#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1',
    ];

    // ── Evolución ─────────────────────────────────────────
    const evCtx = document.getElementById('chartEvolucion');
    if (evCtx && d.evolucion) {
      this._charts.evolucion = new Chart(evCtx, {
        type: 'bar',
        data: {
          labels: d.evolucion.map(e => e.periodo),
          datasets: [
            { label: 'Horas 50%', data: d.evolucion.map(e => e.horas50), backgroundColor: '#3b82f6', borderRadius: 4 },
            { label: 'Horas 100%', data: d.evolucion.map(e => e.horas100), backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Horas Nocturnas', data: d.evolucion.map(e => (e.horas50Nocturno || 0) + (e.horas100Nocturno || 0)), backgroundColor: '#8b5cf6', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Horas' } },
          },
        },
      });
    }

    // ── Tipo ──────────────────────────────────────────────
    const tipoCtx = document.getElementById('chartTipo');
    if (tipoCtx && d.porTipo) {
      this._charts.tipo = new Chart(tipoCtx, {
        type: 'doughnut',
        data: {
          labels: d.porTipo.map(t => t.tipo),
          datasets: [{ data: d.porTipo.map(t => t.horas), backgroundColor: palette, borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(2)} hs` } },
          },
          cutout: '65%',
        },
      });
    }

    // ── Por Área ──────────────────────────────────────────
    const areaCtx = document.getElementById('chartArea');
    if (areaCtx && d.porArea) {
      this._charts.area = new Chart(areaCtx, {
        type: 'bar',
        data: {
          labels: d.porArea.map(a => a.area),
          datasets: [{ label: 'Horas', data: d.porArea.map(a => a.horas), backgroundColor: palette, borderRadius: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } },
        },
      });
    }

    // ── Valores ───────────────────────────────────────────
    const valCtx = document.getElementById('chartValores');
    if (valCtx && d.evolucion) {
      const tcActual = this._tipoCambio.length
        ? this._tipoCambio.sort((a, b) => new Date(`${b.Año}-${b.Mes}`) - new Date(`${a.Año}-${a.Mes}`))[0]
        : null;
      const tc = tcActual?.TCPromedio || 1;

      this._charts.valores = new Chart(valCtx, {
        type: 'line',
        data: {
          labels: d.evolucion.map(e => e.periodo),
          datasets: [
            {
              label: 'Total ARS',
              data: d.evolucion.map(e => e.totalValor || 0),
              borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)',
              fill: true, tension: 0.4, yAxisID: 'yARS',
            },
            {
              label: 'Total USD',
              data: d.evolucion.map(e => (e.totalValor || 0) / tc),
              borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)',
              fill: true, tension: 0.4, yAxisID: 'yUSD',
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            yARS: { type: 'linear', position: 'left', title: { display: true, text: 'ARS' } },
            yUSD: { type: 'linear', position: 'right', title: { display: true, text: 'USD' }, grid: { drawOnChartArea: false } },
          },
        },
      });
    }

    // ── Estados ───────────────────────────────────────────
    const estadCtx = document.getElementById('chartEstados');
    if (estadCtx && d.porEstado) {
      const coloresEstado = {
        'APROBADA': '#10b981',
        'PENDIENTE APROBACION': '#f59e0b',
        'RECHAZADA': '#ef4444',
        'PARCIAL': '#3b82f6',
        'CERRADA': '#94a3b8',
      };
      this._charts.estados = new Chart(estadCtx, {
        type: 'pie',
        data: {
          labels: d.porEstado.map(e => e.estado),
          datasets: [{
            data: d.porEstado.map(e => e.cantidad),
            backgroundColor: d.porEstado.map(e => coloresEstado[e.estado] || '#94a3b8'),
            borderWidth: 2, borderColor: '#fff',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
        },
      });
    }
  },

  _renderTopColabs(colabs) {
    const el = document.getElementById('dashTopColabs');
    if (!el) return;

    if (!colabs.length) {
      el.innerHTML = '<p style="color:var(--c-gray-400);text-align:center;padding:1rem">Sin datos</p>';
      return;
    }

    const rows = colabs.slice(0, 10).map((c, i) => `
      <tr>
        <td><span class="badge badge-dark">#${i + 1}</span></td>
        <td>${c.ApellidoNombre} ${Helpers.ibBadge(c.IB)}</td>
        <td>${c.Area || '–'}</td>
        <td>${c.Sector || '–'}</td>
        <td class="font-mono">${Helpers.formatHoras(c.totalHoras)}</td>
        <td>${Helpers.formatARS(c.totalValor)}</td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Colaborador</th><th>Área</th><th>Sector</th><th>Total Horas</th><th>Total ARS</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  _destroyCharts() {
    for (const key of Object.keys(this._charts)) {
      if (this._charts[key]) {
        this._charts[key].destroy();
        delete this._charts[key];
      }
    }
  },

  exportar() {
    UI.info('Generando reporte… (use el módulo Excel para exportar datos completos)');
  },
};
