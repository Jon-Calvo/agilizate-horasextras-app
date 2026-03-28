class Auth {
  static isLoggedIn() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  }
  
  static getUser() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  }
  
  static async login(usuario, password) {
    const result = await API.login(usuario, password);
    if (result.ok) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, result.token);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(result.usuario));
      return true;
    }
    return false;
  }
  
  static logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    window.location.href = '/';
  }
  
  static tienePermiso(permiso) {
    const user = this.getUser();
    if (!user) return false;
    return (user.permisos & permiso) === permiso;
  }
}
