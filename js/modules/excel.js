/* ============================================================
   AGILIZATE – Módulo Excel (Exportar / Importar)
   ============================================================ */

const Excel = {

  async render() {
    const content = document.getElementById('appContent');
    if (!content) return;

    const canExport = Permisos.puedeExportarExcel();
    const canImport = Permisos.puedeImportarExcel();

    const hojas = [
      'Solicitudes', 'Nomina', 'Usuarios', 'ValorHora',
      'TipoCambio', 'ReglaIB', 'Motivos', 'Area',
      'Logs', 'ControlIngreso'
    ];

    content.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Importar / Exportar Excel</h2>
          <p class="section-subtitle">Gestión de datos en formato Excel (.xlsx)</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.25rem">

        ${canExport ? `
        <div class="card">
          <div class="card-header">
            <h3>⬇ Exportar a Excel</h3>
          </div>
          <div class="card-body">
            <p style="font-size:.875rem;color:var(--c-gray-500);margin-bottom:1rem">
              Descargá el contenido de cualquier hoja de Google Sheets como archivo Excel.
            </p>
            <div class="form-group">
              <label>Hoja a exportar</label>
              <select id="exHoja">
                ${hojas.map(h => `<option value="${h}">${h}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primary btn-full" id="btnExportar" onclick="Excel._exportar()">
              <span class="btn-text">⬇ Exportar</span>
              <span class="btn-loader hidden">
                <svg viewBox="0 0 24 24" class="spin" style="width:16px;height:16px">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
        ` : ''}

        ${canImport ? `
        <div class="card">
          <div class="card-header">
            <h3>⬆ Importar desde Excel</h3>
          </div>
          <div class="card-body">
            <div class="alert alert-warning" style="margin-bottom:1rem">
              ⚠ La importación <strong>agrega filas</strong> a la hoja seleccionada.
              Verificá el formato antes de importar.
            </div>
            <div class="form-group">
              <label>Hoja destino</label>
              <select id="imHoja">
                ${hojas.map(h => `<option value="${h}">${h}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Archivo Excel (.xlsx / .xls)</label>
              <input type="file" id="imFile" accept=".xlsx,.xls"
                style="padding:.5rem;border:1.5px solid var(--c-gray-200);border-radius:var(--radius-sm);background:var(--c-white)" />
            </div>
            <button class="btn btn-primary btn-full" id="btnImportar" onclick="Excel._importar()">
              <span class="btn-text">⬆ Importar</span>
              <span class="btn-loader hidden">
                <svg viewBox="0 0 24 24" class="spin" style="width:16px;height:16px">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
        ` : ''}

        ${!canExport && !canImport ? `
        <div class="card">
          <div class="card-body">
            <div class="empty-state" style="padding:2rem">
              <h4>Sin permisos</h4>
              <p>No tenés permisos para exportar ni importar datos.</p>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  async _exportar() {
    const hoja = document.getElementById('exHoja')?.value;
    if (!hoja) return UI.warning('Seleccioná una hoja.');

    UI.setLoading('btnExportar', true);
    try {
      const res = await API.call('exportarHoja', { hoja });
      if (!res?.ok || !res.data) throw new Error(res?.error || 'Error al obtener datos.');

      this._escribirExcel(res.data, `${hoja}_${Helpers.today()}.xlsx`);
      UI.success(`"${hoja}" exportada correctamente (${res.data.length} filas).`);
    } catch (err) {
      UI.error(err.message);
    } finally {
      UI.setLoading('btnExportar', false);
    }
  },

  async _importar() {
    const hoja = document.getElementById('imHoja')?.value;
    const file = document.getElementById('imFile')?.files?.[0];

    if (!hoja) return UI.warning('Seleccioná la hoja destino.');
    if (!file) return UI.warning('Seleccioná un archivo Excel.');

    const ok = await UI.confirm({
      title:       'Confirmar Importación',
      message:     `¿Importar datos a la hoja "${hoja}"?<br>Esta acción agrega filas nuevas a la hoja.`,
      type:        'warning',
      confirmText: 'Sí, importar',
    });
    if (!ok) return;

    UI.setLoading('btnImportar', true);
    try {
      const datos = await this._leerExcel(file);
      if (!datos.length) throw new Error('El archivo está vacío o no tiene datos válidos.');

      const res = await API.importarExcel(hoja, datos);
      if (!res?.ok) throw new Error(res?.error || 'Error al importar.');

      UI.success(`${res.importadas || datos.length} fila(s) importadas a "${hoja}".`);
      document.getElementById('imFile').value = '';
    } catch (err) {
      UI.error(err.message);
    } finally {
      UI.setLoading('btnImportar', false);
    }
  },

  _leerExcel(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Librería XLSX no disponible.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(data);
        } catch (err) {
          reject(new Error('No se pudo procesar el archivo: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  },

  _escribirExcel(data, filename) {
    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');
      XLSX.writeFile(wb, filename);
    } else {
      // Fallback CSV
      Helpers.downloadCSV(data, filename.replace('.xlsx', '.csv'));
    }
  },

  // Helper público para exportar desde otros módulos
  exportarData(data, filename) {
    if (!data || !data.length) { UI.warning('Sin datos para exportar.'); return; }
    this._escribirExcel(data, filename);
  },
};
