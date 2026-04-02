/* ============================================================
   AGILIZATE – Helper Functions
   ============================================================ */

const Helpers = {

  // ── Hash ──────────────────────────────────────────────────
  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // ── Dates ─────────────────────────────────────────────────
  formatDate(dateStr, opts = {}) {
    if (!dateStr) return '–';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', ...opts
      });
    } catch { return dateStr; }
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '–';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  },

  // Formatea una hora 'HH:MM:SS' o 'HH:MM' → 'HH:MM'
  formatHHMM(timeStr) {
    if (!timeStr) return '–';
    const s = String(timeStr).trim();
    // Si ya viene en formato HH:MM o HH:MM:SS
    const match = s.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return match[1].padStart(2, '0') + ':' + match[2];
    }
    return s;
  },

  today() {
    return new Date().toISOString().split('T')[0];
  },

  firstDayOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  },

  // ── Numbers ───────────────────────────────────────────────
  formatARS(value) {
    if (value === null || value === undefined || isNaN(value)) return '–';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  },

  formatUSD(value) {
    if (value === null || value === undefined || isNaN(value)) return '–';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
  },

  formatHoras(value) {
    if (value === null || value === undefined || isNaN(value)) return '–';
    return Number(value).toFixed(2) + ' hs';
  },

  round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  },

  // ── Time Calculation ──────────────────────────────────────
  /**
   * Calcula la distribución de horas extras (diurnas/nocturnas 50%/100%)
   * dado un rango de fecha+hora y el tipo de extra.
   * TipoExtra: PRODUCTIVO → 50% | IMPRODUCTIVO → 100%
   */
  calcularHoras(fechaInicio, fechaFin, horaInicio, horaFin, tipoExtra) {
    const inicio = new Date(`${fechaInicio}T${horaInicio}`);
    const fin    = new Date(`${fechaFin}T${horaFin}`);

    if (fin <= inicio) return null;

    const totalMs   = fin - inicio;
    const totalHs   = totalMs / 3600000;

    const NOCTURNO_START = CONFIG.HORA_NOCTURNA_INICIO; // 22
    const NOCTURNO_END   = CONFIG.HORA_NOCTURNA_FIN;    // 6

    let hsNocturnas = 0;
    let current = new Date(inicio);

    while (current < fin) {
      const nextHour = new Date(current);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const segmentEnd = nextHour < fin ? nextHour : fin;
      const segmentHs  = (segmentEnd - current) / 3600000;
      const hour = current.getHours();

      if (hour >= NOCTURNO_START || hour < NOCTURNO_END) {
        hsNocturnas += segmentHs;
      }
      current = segmentEnd;
    }

    const hsDiurnas = totalHs - hsNocturnas;

    const result = {
      totalHoras: this.round2(totalHs),
      hsDiurnas:  this.round2(hsDiurnas),
      hsNocturnas: this.round2(hsNocturnas),
      horas50: 0, horas50Nocturno: 0,
      horas100: 0, horas100Nocturno: 0,
    };

    if (tipoExtra === 'PRODUCTIVO') {
      result.horas50        = result.hsDiurnas;
      result.horas50Nocturno = result.hsNocturnas;
    } else {
      result.horas100        = result.hsDiurnas;
      result.horas100Nocturno = result.hsNocturnas;
    }

    return result;
  },

  /**
   * Calcula los valores monetarios de las horas.
   */
  calcularValores(hsResult, valorHoraRow) {
    if (!hsResult || !valorHoraRow) return null;
    return {
      totalValor50:        this.round2(hsResult.horas50 * valorHoraRow.ValorExtra50),
      totalValor50Nocturno: this.round2(hsResult.horas50Nocturno * valorHoraRow.ValorNocturna50),
      totalValor100:       this.round2(hsResult.horas100 * valorHoraRow.ValorExtra100),
      totalValor100Nocturno: this.round2(hsResult.horas100Nocturno * valorHoraRow.ValorNocturna100),
      totalGeneral: this.round2(
        (hsResult.horas50 * valorHoraRow.ValorExtra50) +
        (hsResult.horas50Nocturno * valorHoraRow.ValorNocturna50) +
        (hsResult.horas100 * valorHoraRow.ValorExtra100) +
        (hsResult.horas100Nocturno * valorHoraRow.ValorNocturna100)
      ),
    };
  },

  /**
   * Calcula el nivel IB de un colaborador dado sus horas del período y las reglas IB.
   */
  calcularIB(horasPeriodo, reglasIB) {
    if (!reglasIB || reglasIB.length === 0) return 'BUENO';
    const sorted = [...reglasIB].sort((a, b) => a.OrdenPrioridad - b.OrdenPrioridad);
    for (const r of sorted) {
      if (horasPeriodo >= r.LimiteMinimo && horasPeriodo < r.LimiteMaximo) {
        return r.TarjetaIB;
      }
    }
    return sorted[sorted.length - 1].TarjetaIB;
  },

  // ── DOM Helpers ───────────────────────────────────────────
  el(id) { return document.getElementById(id); },

  qs(selector, parent = document) { return parent.querySelector(selector); },
  qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; },

  show(el) {
    if (typeof el === 'string') el = this.el(el);
    if (el) el.classList.remove('hidden');
  },
  hide(el) {
    if (typeof el === 'string') el = this.el(el);
    if (el) el.classList.add('hidden');
  },
  toggle(el) {
    if (typeof el === 'string') el = this.el(el);
    if (el) el.classList.toggle('hidden');
  },

  setHTML(id, html) {
    const el = this.el(id);
    if (el) el.innerHTML = html;
  },

  setText(id, text) {
    const el = this.el(id);
    if (el) el.textContent = text;
  },

  // ── Status Badge ──────────────────────────────────────────
  statusBadge(status) {
    const cls = 'status-' + (status || '').replace(/\s/g, '_');
    return `<span class="badge ${cls}">${status || '–'}</span>`;
  },

  ibBadge(ib) {
    if (!ib) return '–';
    return `<span class="ib-badge ib-${ib}">${ib}</span>`;
  },

  // ── Initials ──────────────────────────────────────────────
  initials(name) {
    if (!name) return '?';
    return name.split(/[\s,]+/).filter(Boolean).slice(0, 2)
      .map(p => p[0]).join('').toUpperCase();
  },

  // ── Debounce ──────────────────────────────────────────────
  debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // ── Build Select Options ──────────────────────────────────
  buildOptions(items, valueKey, labelKey, selected = '', emptyLabel = 'Seleccionar...') {
    let html = `<option value="">${emptyLabel}</option>`;
    for (const item of items) {
      const val = item[valueKey];
      const lbl = item[labelKey];
      html += `<option value="${val}" ${val == selected ? 'selected' : ''}>${lbl}</option>`;
    }
    return html;
  },

  // ── Export helpers ────────────────────────────────────────
  downloadCSV(data, filename) {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => {
      let v = r[h] ?? '';
      if (typeof v === 'string' && v.includes(',')) v = `"${v}"`;
      return v;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  // ── Pagination ────────────────────────────────────────────
  paginate(data, page, perPage) {
    const total = data.length;
    const pages = Math.ceil(total / perPage) || 1;
    const start = (page - 1) * perPage;
    const items = data.slice(start, start + perPage);
    return { items, total, pages, page };
  },

  paginationHTML(current, total, onPageFn) {
    if (total <= 1) return '';
    let html = '<div class="pagination">';
    html += `<button class="page-btn" onclick="${onPageFn}(${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>`;
    const range = this.pageRange(current, total);
    for (const p of range) {
      if (p === '...') {
        html += `<span style="padding:0 .4rem;color:var(--c-gray-400)">…</span>`;
      } else {
        html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="${onPageFn}(${p})">${p}</button>`;
      }
    }
    html += `<button class="page-btn" onclick="${onPageFn}(${current + 1})" ${current === total ? 'disabled' : ''}>›</button>`;
    html += `<span style="margin-left:auto;font-size:.75rem;color:var(--c-gray-400)">Pág ${current}/${total}</span>`;
    html += '</div>';
    return html;
  },

  pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  },
};
