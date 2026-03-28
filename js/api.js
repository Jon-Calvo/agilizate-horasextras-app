//console.log("API cargada correctamente");

class API {
  static call(action, params = {}) {
    return new Promise((resolve, reject) => {
  
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
      const payload = { action, token, ...params };
  
      const cbName = 'cb_' + Date.now();
  
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout'));
      }, 15000);
  
      function cleanup() {
        clearTimeout(timeout);
        delete window[cbName];
        const script = document.getElementById(cbName);
        if (script) script.remove();
      }
  
      window[cbName] = function (data) {
        cleanup();
        resolve(data);
      };
  
      const url = CONFIG.API_URL
        + '?callback=' + cbName
        + '&payload=' + encodeURIComponent(JSON.stringify(payload));
  
      const script = document.createElement('script');
      script.id = cbName;
      script.src = url;
  
      script.onerror = () => {
        cleanup();
        reject(new Error('Error de red'));
      };
  
      document.head.appendChild(script);
    });
  }
  
  static async login(usuario, password) {
    return this.call('login', { usuario, password });
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

//Esto garantiza que API exista en todo el sistema (const API = { ... },  Pero en algunos casos (GitHub + navegador), eso NO queda en el scope global)
window.API = API;
