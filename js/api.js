// ============================================================
// AGILIZATE - Cliente API
// Comunicación con Google Apps Script Backend
// ============================================================

class API {
  
  /**
   * Método genérico para llamar al backend (Usar JSONP en el frontend)
   */
  static call(action, params = {}) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  
      const payload = {
        action,
        token,
        ...params
      };
  
      const callbackName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  
      // Crear función global
      window[callbackName] = function(response) {
        delete window[callbackName];
        script.remove();
  
        // Manejo de sesión expirada
        if (!response.ok && response.error && response.error.includes('expirad')) {
          Auth.logout();
        }
  
        resolve(response);
      };
  
      const url = CONFIG.API_URL
        + '?callback=' + callbackName
        + '&payload=' + encodeURIComponent(JSON.stringify(payload));
  
      const script = document.createElement('script');
      script.src = url;
  
      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error('Error de red'));
      };
  
      document.body.appendChild(script);
    });
  }
  
  // ——— AUTENTICACIÓN ————————————————————————————————————————
  
  static async login(usuario, password) {
    return await this.call('login', { usuario, password });
  }
  
  static async logout() {
    return await this.call('logout');
  }
  
  static async cambiarPassword(passwordActual, passwordNueva) {
    return await this.call('cambiarPassword', { passwordActual, passwordNueva });
  }
  
  // ——— SOLICITUDES ——————————————————————————————————————————
  
  static async getSolicitudes(filtros = {}) {
    return await this.call('getSolicitudes', { filtros });
  }
  
  static async getSolicitud(numeroSolicitud) {
    return await this.call('getSolicitud', { numeroSolicitud });
  }
  
  static async crearSolicitud(solicitud) {
    return await this.call('crearSolicitud', { solicitud });
  }
  
  static async modificarSolicitud(numeroSolicitud, cambios) {
    return await this.call('modificarSolicitud', { numeroSolicitud, cambios });
  }
  
  static async aprobarSolicitud(numeroSolicitud, opciones = {}) {
    return await this.call('aprobarSolicitud', { numeroSolicitud, opciones });
  }
  
  static async rechazarSolicitud(numeroSolicitud, motivo, opciones = {}) {
    return await this.call('rechazarSolicitud', { numeroSolicitud, motivo, opciones });
  }
  
  static async cancelarSolicitud(numeroSolicitud, motivo) {
    return await this.call('cancelarSolicitud', { numeroSolicitud, motivo });
  }
  
  // ——— COLABORADORES ————————————————————————————————————————
  
  static async getColaboradores(query = '') {
    return await this.call('getColaboradores', { query });
  }
  
  static async getColaborador(legajo) {
    return await this.call('getColaborador', { legajo });
  }
  
  // ——— REFERENCIAS ——————————————————————————————————————————
  
  static async getReferencias() {
    return await this.call('getReferencias');
  }
  
  static async getMotivos() {
    return await this.call('getMotivos');
  }
  
  static async getAreas() {
    return await this.call('getAreas');
  }
  
  // ——— TARIFAS ——————————————————————————————————————————————
  
  static async getTarifas() {
    return await this.call('getTarifas');
  }
  
  static async guardarTarifa(tarifa) {
    return await this.call('guardarTarifa', { tarifa });
  }
  
  // ——— DASHBOARD ————————————————————————————————————————————
  
  static async getDashboard(filtros = {}) {
    return await this.call('getDashboard', { filtros });
  }
  
  static async getMetricas() {
    return await this.call('getMetricas');
  }
  
  // ——— PORTERÍA —————————————————————————————————————————————
  
  static async getSolicitudesPorteria() {
    return await this.call('getSolicitudesPorteria');
  }
  
  static async registrarIngreso(numeroSolicitud, legajo, horaIngreso) {
    return await this.call('registrarIngreso', { 
      numeroSolicitud, 
      legajo, 
      horaIngreso 
    });
  }
  
  // ——— USUARIOS (ADMIN) —————————————————————————————————————
  
  static async getUsuarios() {
    return await this.call('getUsuarios');
  }
  
  static async crearUsuario(usuario) {
    return await this.call('crearUsuario', { usuario });
  }
  
  static async actualizarUsuario(usuarioID, cambios) {
    return await this.call('actualizarUsuario', { usuarioID, cambios });
  }
  
  static async eliminarUsuario(usuarioID) {
    return await this.call('eliminarUsuario', { usuarioID });
  }
  
  // ——— CONFIGURACIÓN ————————————————————————————————————————
  
  static async getConfiguracion() {
    return await this.call('getConfiguracion');
  }
  
  static async guardarConfiguracion(configuracion) {
    return await this.call('guardarConfiguracion', { configuracion });
  }
  
  // ——— TIPO DE CAMBIO ———————————————————————————————————————
  
  static async getTipoCambio(año, mes) {
    return await this.call('getTipoCambio', { año, mes });
  }
  
  static async guardarTipoCambio(tipoCambio) {
    return await this.call('guardarTipoCambio', { tipoCambio });
  }
  
  // ——— REGLAS IB ————————————————————————————————————————————
  
  static async getReglasIB() {
    return await this.call('getReglasIB');
  }
  
  static async guardarReglaIB(regla) {
    return await this.call('guardarReglaIB', { regla });
  }
  
  // ——— LOGS —————————————————————————————————————————————————
  
  static async getLogs(limite = 100) {
    return await this.call('getLogs', { limite });
  }
  
  // ——— EXPORTAR/IMPORTAR ————————————————————————————————————
  
  static async exportarExcel(tabla, filtros = {}) {
    return await this.call('exportarExcel', { tabla, filtros });
  }
  
  static async importarExcel(tabla, archivoID) {
    return await this.call('importarExcel', { tabla, archivoID });
  }
}

// Exportar para uso global
window.API = API;
