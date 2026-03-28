class App {
  static async init() {
    if (!Auth.isLoggedIn() && !window.location.pathname.includes('login')) {
      window.location.href = '/';
      return;
    }
    
    this.setupNavigation();
    this.loadUserInfo();
  }
  
  static setupNavigation() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => Auth.logout());
    }
  }
  
  static loadUserInfo() {
    const user = Auth.getUser();
    if (!user) return;
    
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      userNameEl.textContent = user.nombreCompleto;
    }
  }
  
  static showLoading(show = true) {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }
  
  static showAlert(message, type = 'info') {
    alert(message);
  }
}

document.addEventListener('DOMContentLoaded', () => App.init());
