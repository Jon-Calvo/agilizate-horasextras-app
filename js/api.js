class API {
  static async call(action, params = {}) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const payload = { action, token, ...params };
  
    try {
      const url = CONFIG.API_URL + '?payload=' + encodeURIComponent(JSON.stringify(payload));
      
      const response = await fetch(url, {
        method: 'GET'
      });
  
      return await response.json();
      
    } catch (error) {
      console.error('API Error:', error);
      return { ok: false, error: 'Error de conexión con el servidor' };
    }
  }
  
  static async login(usuario, password) {
    return await this.call('login', { usuario, password });
  }
  
  static async getSolicitudes(filtros = {}) {
    return await this.call('getSolicitudes', { filtros });
  }
  
  static async crearSolicitud(solicitud) {
    return await this.call('crearSolicitud', { solicitud });
  }
  
  static async aprobarSolicitud(numeroSolicitud, opciones = {}) {
    return await this.call('aprobarSolicitud', { numeroSolicitud, opciones });
  }
  
  static async getColaboradores(query = '') {
    return await this.call('getColaboradores', { query });
  }
  
  static async getReferencias() {
    return await this.call('getReferencias');
  }
  
  static async getDashboard(filtros = {}) {
    return await this.call('getDashboard', { filtros });
  }
}
