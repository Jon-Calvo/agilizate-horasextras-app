/* ============================================================
   AGILIZATE – API via JSONP
   ============================================================ */

const API = {
  /**
   * Realiza llamadas al backend de Google Apps Script vía JSONP.
   * @param {string} action  - Nombre de la acción/función en el backend
   * @param {object} params  - Parámetros adicionales
   * @returns {Promise<object>}
   */
  call(action, params = {}) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);

      const payload = {
        action,
        token,
        ...params,
      };

      const callbackName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

      // Función global de callback
      window[callbackName] = function (response) {
        delete window[callbackName];
        script.remove();

        // Manejo de sesión expirada
        if (response && !response.ok && response.error &&
          (response.error.includes('expirad') || response.error.includes('sesion') || response.error.includes('token'))) {
          Auth.logout();
          return;
        }

        resolve(response);
      };

      const url =
        CONFIG.API_URL +
        '?callback=' + callbackName +
        '&payload=' + encodeURIComponent(JSON.stringify(payload));

      const script = document.createElement('script');
      script.src = url;

      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error('Error de red o de conexión con el servidor'));
      };

      document.body.appendChild(script);
    });
  },

  // ── Shortcuts ──────────────────────────────────────────────

  /** Login */
  login(username, passwordHash) {
    return this.call('login', { username, passwordHash });
  },

  /** Logout */
  logout() {
    return this.call('logout');
  },

  // ── Solicitudes ────────────────────────────────────────────

  getSolicitudes(filtros = {}) {
    return this.call('getSolicitudes', filtros);
  },
  getSolicitudById(id) {
    return this.call('getSolicitudById', { id });
  },
  crearSolicitud(data) {
    return this.call('crearSolicitud', data);
  },
  modificarSolicitud(data) {
    return this.call('modificarSolicitud', data);
  },
  eliminarSolicitud(id) {
    return this.call('eliminarSolicitud', { id });
  },
  aprobarSolicitud(data) {
    return this.call('aprobarSolicitud', data);
  },
  rechazarSolicitud(data) {
    return this.call('rechazarSolicitud', data);
  },
  cerrarSolicitudParcial(id) {
    return this.call('cerrarSolicitudParcial', { id });
  },

  // ── Nómina ─────────────────────────────────────────────────

  getNomina(filtros = {}) {
    return this.call('getNomina', filtros);
  },
  getNominaActivos() {
    return this.call('getNomina', { soloActivos: true });
  },

  // ── Catálogos ──────────────────────────────────────────────

  getAreas() {
    return this.call('getAreas');
  },
  getMotivos() {
    return this.call('getMotivos');
  },
  getValorHora() {
    return this.call('getValorHora');
  },
  getTipoCambio() {
    return this.call('getTipoCambio');
  },
  getReglaIB() {
    return this.call('getReglaIB');
  },
  getConfiguracion() {
    return this.call('getConfiguracion');
  },

  // ── Usuarios ───────────────────────────────────────────────

  getUsuarios() {
    return this.call('getUsuarios');
  },
  crearUsuario(data) {
    return this.call('crearUsuario', data);
  },
  modificarUsuario(data) {
    return this.call('modificarUsuario', data);
  },
  eliminarUsuario(id) {
    return this.call('eliminarUsuario', { id });
  },
  cambiarPassword(data) {
    return this.call('cambiarPassword', data);
  },

  // ── Roles y Permisos ───────────────────────────────────────

  getRoles() {
    return this.call('getRoles');
  },
  actualizarPermisoRol(data) {
    return this.call('actualizarPermisoRol', data);
  },

  // ── Portería ───────────────────────────────────────────────

  getAprobadsHoy(filtros = {}) {
    return this.call('getAprobadsHoy', filtros);
  },
  registrarIngreso(data) {
    return this.call('registrarIngreso', data);
  },

  // ── Dashboard ──────────────────────────────────────────────

  getDashboardData(filtros = {}) {
    return this.call('getDashboardData', filtros);
  },

  // ── Configuración ──────────────────────────────────────────

  guardarValorHora(data) {
    return this.call('guardarValorHora', data);
  },
  guardarTipoCambio(data) {
    return this.call('guardarTipoCambio', data);
  },
  guardarReglaIB(data) {
    return this.call('guardarReglaIB', data);
  },
  guardarMotivo(data) {
    return this.call('guardarMotivo', data);
  },
  guardarArea(data) {
    return this.call('guardarArea', data);
  },
  guardarConfiguracion(data) {
    return this.call('guardarConfiguracion', data);
  },

  // ── Logs ───────────────────────────────────────────────────

  getLogs(filtros = {}) {
    return this.call('getLogs', filtros);
  },

  // ── Excel ──────────────────────────────────────────────────

  importarExcel(hoja, datos) {
    return this.call('importarExcel', { hoja, datos });
  },
};
