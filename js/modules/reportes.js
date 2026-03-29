/* ============================================================
   AGILIZATE – Módulo Reportes
   ============================================================ */

const Reportes = {

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Reportes</h2>
          <p class="section-subtitle">Generación y descarga de reportes del sistema</p>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">

        <div class="stat-card" style="cursor:default">
          <div class="stat-icon">📋</div>
          <div class="stat-label">Solicitudes del Mes</div>
          <p style="font-size:.8rem;color:var(--c-gray-500);margin:.4rem 0 .75rem">
            Reporte completo del mes actual con horas y valores por colaborador.
          </p>
          <button class="btn btn-primary btn-sm btn-full" onclick="Reportes._generar('solicitudes_mes')">
            Generar y Descargar
          </button>
        </div>

        <div class="stat-card" style="cursor:default">
          <div class="stat-icon">👥</div>
          <div class="stat-label">Ranking por IB</div>
          <p style="font-size:.8rem;color:var(--c-gray-500);margin:.4rem 0 .75rem">
            Listado de colaboradores ordenados por índice de comportamiento y horas acumuladas.
          </p>
          <button class="btn btn-primary btn-sm btn-full" onclick="Reportes._generar('colaboradores_ib')">
            Generar y Descargar
          </button>
        </div>

        <div class="stat-card" style="cursor:default">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Costos por Área</div>
          <p style="font-size:.8rem;color:var(--c-gray-500);margin:.4rem 0 .75rem">
            Distribución del costo de horas extras por área y sector (ARS y USD).
          </p>
          <button class="btn btn-primary btn-sm btn-full" onclick="Reportes._generar('costos_area')">
            Generar y Descargar
          </button>
        </div>

        <div class="stat-card" style="cursor:default">
          <div class="stat-icon">🏠</div>
          <div class="stat-label">Control de Portería</div>
          <p style="font-size:.8rem;color:var(--c-gray-500);margin:.4rem 0 .75rem">
            Registro de ingresos y ausencias del mes con diferencia horaria.
          </p>
          <button class="btn btn-primary btn-sm btn-full" onclick="Reportes._generar('porteria_mes')">
            Generar y Descargar
          </button>
        </div>

        <div class="stat-card" style="cursor:default">
          <div class="stat-icon">📊</div>
          <div class="stat-label">Resumen Ejecutivo</div>
          <p style="font-size:.8rem;color:var(--c-gray-500);margin:.4rem 0 .75rem">
            KPIs consolidados: totales de horas, valores ARS/USD y estados de solicitudes.
          </p>
          <button class="btn btn-primary btn-sm btn-full" onclick="Reportes._generar('resumen_ejecutivo')">
            Generar y Descargar
          </button>
        </div>

      </div>

      <div id="reporteStatus" class="hidden" style="margin-top:1rem"></div>
    `;
  },

  async _generar(tipo) {
    const statusEl = document.getElementById('reporteStatus');
    if (statusEl) {
      statusEl.className = 'alert alert-info';
      statusEl.textContent = `Generando reporte "${tipo}"…`;
    }

    try {
      // Obtener datos del dashboard para el reporte
      const filtros = {
        fechaDesde: Helpers.firstDayOfMonth(),
        fechaHasta: Helpers.today(),
        agrupacion: 'mensual',
      };

      const res = await API.getDashboardData(filtros);
      if (!res?.ok) throw new Error(res?.error || 'Error al obtener datos.');

      const d = res.data;

      let data = [];
      let filename = '';

      switch (tipo) {
        case 'solicitudes_mes': {
          // Descargar solicitudes del mes
          const solRes = await API.getSolicitudes({
            fechaDesde: Helpers.firstDayOfMonth(),
            fechaHasta: Helpers.today(),
            page:    1,
            perPage: 9999,
          });
          data     = solRes?.data || [];
          filename = `solicitudes_${Helpers.today()}.xlsx`;
          break;
        }
        case 'colaboradores_ib': {
          data = (d.topColaboradores || []).map((c, i) => ({
            '#':             i + 1,
            'Legajo':        c.Legajo,
            'Colaborador':   c.ApellidoNombre,
            'Área':          c.Area,
            'Sector':        c.Sector,
            'IB':            c.IB,
            'Total Horas':   c.totalHoras,
            'Total ARS':     c.totalValor,
          }));
          filename = `ranking_ib_${Helpers.today()}.xlsx`;
          break;
        }
        case 'costos_area': {
          data = (d.porArea || []).map(a => ({
            'Área':        a.area,
            'Total Horas': Helpers.round2(a.horas),
            'Total ARS':   Helpers.round2(a.valor),
          }));
          filename = `costos_area_${Helpers.today()}.xlsx`;
          break;
        }
        case 'porteria_mes': {
          const ciRes = await API.call('exportarHoja', { hoja: 'ControlIngreso' });
          data     = ciRes?.data || [];
          filename = `porteria_${Helpers.today()}.xlsx`;
          break;
        }
        case 'resumen_ejecutivo': {
          data = [{
            'Total Solicitudes':  d.totalSolicitudes,
            'Total Horas':        d.totalHoras,
            'Horas 50%':          d.horas50,
            'Horas 100%':         d.horas100,
            'Total ARS':          d.totalGeneral,
            'Aprobadas':          d.aprobadas,
            'Pendientes':         d.pendientes,
            'Colaboradores':      d.totalColaboradores,
            'Fecha Reporte':      Helpers.today(),
          }];
          filename = `resumen_ejecutivo_${Helpers.today()}.xlsx`;
          break;
        }
      }

      if (!data.length) throw new Error('No hay datos para este reporte en el período seleccionado.');

      Excel.exportarData(data, filename);

      if (statusEl) {
        statusEl.className = 'alert alert-success';
        statusEl.textContent = `✓ Reporte generado: ${filename} (${data.length} filas)`;
      }

    } catch (err) {
      UI.error(err.message);
      if (statusEl) {
        statusEl.className = 'alert alert-error';
        statusEl.textContent = '✕ ' + err.message;
      }
    }
  },
};
