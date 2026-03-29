/* ============================================================
   AGILIZATE – Auth Module
   ============================================================ */

const Auth = {
  currentUser: null,

  async login() {
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const errorEl  = document.getElementById('loginError');

    if (!username || !password) {
      if (errorEl) { errorEl.textContent = 'Ingresá usuario y contraseña.'; errorEl.classList.remove('hidden'); }
      return;
    }

    if (errorEl) errorEl.classList.add('hidden');
    UI.setLoading('btnLogin', true);

    try {
      const passwordHash = await Helpers.sha256(password);
      const res = await API.login(username, passwordHash);

      if (!res || !res.ok) {
        throw new Error(res?.error || 'Credenciales incorrectas.');
      }

      // Guardar sesión
      localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, res.token);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(res.user));
      Permisos.set(res.user.PermisosBitMask);

      // Redirigir al app
      window.location.href = 'app.html';

    } catch (err) {
      UI.setLoading('btnLogin', false);
      if (errorEl) {
        errorEl.textContent = err.message || 'Error de conexión.';
        errorEl.classList.remove('hidden');
      }
    }
  },

  logout() {
    // Llamar al backend para invalidar token
    API.logout().catch(() => {});

    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    Permisos.clear();
    this.currentUser = null;

    window.location.href = 'index.html';
  },

  /** Verifica sesión activa. Retorna true si válida. */
  checkSession() {
    const token    = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const userJSON = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);

    if (!token || !userJSON) return false;

    try {
      this.currentUser = JSON.parse(userJSON);
      Permisos.load();
      return true;
    } catch {
      return false;
    }
  },

  /** Verifica un permiso específico y redirige si no lo tiene */
  requirePermiso(permiso) {
    if (!Permisos.tiene(permiso)) {
      UI.error('No tenés permiso para esta acción.');
      return false;
    }
    return true;
  },

  /** Inicialización en la página de login */
  initLogin() {
    // Si ya está autenticado, redirigir al app
    if (this.checkSession()) {
      window.location.href = 'app.html';
      return;
    }

    // Manejar Enter en el formulario
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.login();
    });
  },
};
