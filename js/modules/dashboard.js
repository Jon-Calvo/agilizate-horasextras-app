/* ============================================================
   AGILIZATE – Módulo Dashboard (fixed)
   ============================================================ */

const Dashboard = {
  _charts:    {},
  _areas:     [],
  _motivos:   [],
  _tipoCambio:[],

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    // Cargar catálogos para filtros
    try {
      const [ar, mr, tr] = await Promise.all([API.getAreas(), API.getMotivos(), API.getTipoCambio()]);
      this._areas      = ar?.data || [];
      this._motivos    = mr?.data || [];
      this._tipoCambio = tr?.data || [];
    } catch (e) {
      console.warn('Error cargando catálogos de dashboard:', e.message);
    }

    const areasUnicas = [...new Map(this._areas.map(a => [a.Area, a])).values()];

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Dashboard</h2>
          <p class="section-subtitle">Análisis de horas extras</p>
        </div>
        ${Permisos.puedeExportarDashboard() ? `<button class="btn btn-ghost btn-sm" onclick="Dashboard._exportar()">⬇ Exportar</button>` : ''}
      </div>

      <!-- Filtros -->
      <div class="filter-bar">
        <div class="form-group">
          <label>Desde</label>
          <input type="date" id="dDesde" value="${Helpers.firstDayOfMonth()}" />
        </div>
        <div class="form-group">
          <label>Hasta</label>
          <input type="date" id="dHasta" value="${Helpers.today()}" />
        </div>
        <div class="form-group">
          <label>Área</label>
          <select id="dArea" onchange="Dashboard._onAreaChange()">
            <option value="">Todas</option>
            ${areasUnicas.map(a => `<option value="${a.Area}">${a.Area}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Sector</label>
          <select id="dSector"><option value="">Todos</option></select>
        </div>
        <div class="form-group">
          <label>Tipo Extra</label>
          <select id="dTipo">
            <option value="">Todos</option>
            <option value="PRODUCTIVO">Productivo</option>
            <option value="IMPRODUCTIVO">Improductivo</option>
          </select>
        </div>
        <div class="form-group">
          <label>Agrupación</label>
          <select id="dAgrup">
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-primary btn-sm" style="margin-bottom:1.1rem" onclick="Dashboard._cargar()">Filtrar</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="stats-grid" id="dashKPIs">
        ${this._loadingCards(6)}
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="chart-card chart-full">
          <div class="chart-card-header"><h4>Evolución de Horas Extras</h4></div>
          <div class="chart-card-body"><canvas id="cEvolucion"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><h4>Distribución por Tipo</h4></div>
          <div class="chart-card-body"><canvas id="cTipo"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><h4>Horas por Área</h4></div>
          <div class="chart-card-body"><canvas id="cArea"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><h4>Valores ARS / USD</h4></div>
          <div class="chart-card-body"><canvas id="cValores"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><h4>Estados de Solicitudes</h4></div>
          <div class="chart-card-body"><canvas id="cEstados"></canvas></div>
        </div>
      </div>

      <!-- Top colaboradores -->
      <div class="card">
        <div class="card-header"><h3>Top 10 — Colaboradores por Horas</h3></div>
        <div id="dashTop">
          <div class="loading-screen" style="min-height:100px"><div class="loading-spinner"></div></div>
        </div>
      </div>
    `;

    await this._cargar();
  },

  _onAreaChange() {
    const area    = document.getElementById('dArea')?.value || '';
    const sel     = document.getElementById('dSector');
    if (!sel) return;
    const sects   = this._areas.filter(a => a.Area === area);
    sel.innerHTML = `<option value="">Todos</option>` +
      sects.map(s => `<option value="${s.IDSector}">${s.Sector}</option>`).join('');
  },

  async _cargar() {
    const filtros = {
      fechaDesde: document.getElementById('dDesde')?.value  || Helpers.firstDayOfMonth(),
      fechaHasta: document.getElementById('dHasta')?.value  || Helpers.today(),
      area:       document.getElementById('dArea')?.value   || '',
      sector:     document.getElementById('dSector')?.value || '',
      tipoExtra:  document.getElementById('dTipo')?.value   || '',
      agrupacion: document.getElementById('dAgrup')?.value  || 'mensual',
    };

    try {
      const res = await API.getDashboardData(filtros);
      if (!res?.ok) throw new Error(res?.error || 'Error al cargar dashboard.');

      const d = res.data;
      this._renderKPIs(d);
      this._renderCharts(d);
      this._renderTop(d.topColaboradores || []);

    } catch (err) {
      const kpis = document.getElementById('dashKPIs');
      if (kpis) kpis.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${err.message}</div>`;
    }
  },

  _loadingCards(n) {
    return Array(n).fill(0).map(() =>
      `<div class="stat-card" style="opacity:.35"><div class="stat-label">Cargando…</div><div class="stat-value">–</div></div>`
    ).join('');
  },

  _tcActual() {
    if (!this._tipoCambio.length) return 1;
    return parseFloat(
      this._tipoCambio.sort((a, b) => {
        const ka = String(a.Año) + String(a.Mes).padStart(2, '0');
        const kb = String(b.Año) + String(b.Mes).padStart(2, '0');
        return kb.localeCompare(ka);
      })[0]?.TCPromedio || 1
    );
  },

  _renderKPIs(d) {
    const el = document.getElementById('dashKPIs');
    if (!el) return;
    const tc      = this._tcActual();
    const totalARS = d.totalGeneral || 0;

    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-label">Solicitudes</div>
        <div class="stat-value">${d.totalSolicitudes || 0}</div>
        <div class="stat-sub">En el período</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱</div>
        <div class="stat-label">Total Horas</div>
        <div class="stat-value">${Helpers.formatHoras(d.totalHoras)}</div>
        <div class="stat-sub">50%: ${Helpers.formatHoras(d.horas50)} · 100%: ${Helpers.formatHoras(d.horas100)}</div>
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
        <div class="stat-value" style="font-size:1.3rem">${Helpers.formatUSD(tc > 0 ? totalARS / tc : 0)}</div>
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
      </div>`;
  },

  _renderCharts(d) {
    this._destroyCharts();

    const pal = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'];

    // Evolución (bar apilado)
    const evCtx = document.getElementById('cEvolucion');
    if (evCtx && d.evolucion?.length) {
      this._charts.evolucion = new Chart(evCtx, {
        type: 'bar',
        data: {
          labels: d.evolucion.map(e => e.periodo),
          datasets: [
            { label: 'Horas 50%',       data: d.evolucion.map(e => e.horas50 || 0),        backgroundColor: '#3b82f6', borderRadius: 3 },
            { label: '50% Nocturno',    data: d.evolucion.map(e => e.horas50Nocturno || 0), backgroundColor: '#60a5fa', borderRadius: 3 },
            { label: 'Horas 100%',      data: d.evolucion.map(e => e.horas100 || 0),        backgroundColor: '#10b981', borderRadius: 3 },
            { label: '100% Nocturno',   data: d.evolucion.map(e => e.horas100Nocturno || 0),backgroundColor: '#6ee7b7', borderRadius: 3 },
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

    // Por tipo (doughnut)
    const tipoCtx = document.getElementById('cTipo');
    if (tipoCtx && d.porTipo?.length) {
      this._charts.tipo = new Chart(tipoCtx, {
        type: 'doughnut',
        data: {
          labels: d.porTipo.map(t => t.tipo),
          datasets: [{ data: d.porTipo.map(t => t.horas), backgroundColor: pal, borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: ctx => `${ctx.label}: ${parseFloat(ctx.parsed).toFixed(2)} hs` } },
          },
        },
      });
    }

    // Por área (horizontal bar)
    const areaCtx = document.getElementById('cArea');
    if (areaCtx && d.porArea?.length) {
      const top10 = d.porArea.slice(0, 10);
      this._charts.area = new Chart(areaCtx, {
        type: 'bar',
        data: {
          labels: top10.map(a => a.area),
          datasets: [{ label: 'Horas', data: top10.map(a => a.horas), backgroundColor: pal, borderRadius: 5 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } },
        },
      });
    }

    // Valores ARS/USD (line)
    const valCtx = document.getElementById('cValores');
    if (valCtx && d.evolucion?.length) {
      const tc = this._tcActual();
      this._charts.valores = new Chart(valCtx, {
        type: 'line',
        data: {
          labels: d.evolucion.map(e => e.periodo),
          datasets: [
            {
              label: 'ARS', data: d.evolucion.map(e => e.totalValor || 0),
              borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.08)',
              fill: true, tension: 0.35, yAxisID: 'yARS',
            },
            {
              label: 'USD', data: d.evolucion.map(e => (e.totalValor || 0) / (tc || 1)),
              borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.08)',
              fill: true, tension: 0.35, yAxisID: 'yUSD',
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            yARS: { type: 'linear', position: 'left',  title: { display: true, text: 'ARS' } },
            yUSD: { type: 'linear', position: 'right', title: { display: true, text: 'USD' }, grid: { drawOnChartArea: false } },
          },
        },
      });
    }

    // Estados (pie)
    const estCtx = document.getElementById('cEstados');
    if (estCtx && d.porEstado?.length) {
      const colors = {
        'APROBADA':              '#10b981',
        'PENDIENTE APROBACION':  '#f59e0b',
        'RECHAZADA':             '#ef4444',
        'PARCIAL':               '#3b82f6',
        'CERRADA':               '#94a3b8',
      };
      this._charts.estados = new Chart(estCtx, {
        type: 'pie',
        data: {
          labels: d.porEstado.map(e => e.estado),
          datasets: [{
            data: d.porEstado.map(e => e.cantidad),
            backgroundColor: d.porEstado.map(e => colors[e.estado] || '#94a3b8'),
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

  _renderTop(colabs) {
    const el = document.getElementById('dashTop');
    if (!el) return;

    if (!colabs.length) {
      el.innerHTML = `<div class="empty-state" style="padding:2rem"><p>Sin datos en el período seleccionado.</p></div>`;
      return;
    }

    const rows = colabs.slice(0, 10).map((c, i) => `
      <tr>
        <td><span class="badge badge-dark">#${i + 1}</span></td>
        <td style="font-weight:600">${c.ApellidoNombre} ${Helpers.ibBadge(c.IB)}</td>
        <td>${c.Area || '–'}</td>
        <td>${c.Sector || '–'}</td>
        <td class="font-mono">${Helpers.formatHoras(c.totalHoras)}</td>
        <td class="font-mono">${Helpers.formatARS(c.totalValor)}</td>
      </tr>`).join('');

    el.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Colaborador</th><th>Área</th><th>Sector</th><th>Total Horas</th><th>Total ARS</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _destroyCharts() {
    for (const key of Object.keys(this._charts)) {
      try { this._charts[key].destroy(); } catch (_) {}
    }
    this._charts = {};
  },

  _exportar() {
    UI.info('Para exportar datos, usá el módulo Excel → Exportar hoja "Solicitudes".');
  },
};
