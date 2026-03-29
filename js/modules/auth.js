/* ============================================================
   AGILIZATE – Auth Module
   ============================================================ */

const Auth = {
  currentUser: null,

  // ── LOGIN ──────────────────────────────────────────────────
  async login() {
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    const errorEl    = document.getElementById('loginError');

    const username = usernameEl ? usernameEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    // Limpiar error previo
    if (errorEl) errorEl.classList.add('hidden');

    if (!username || !password) {
      this._showLoginError('Ingresá usuario y contraseña.');
      return;
    }

    // Mostrar spinner
    const btn = document.getElementById('btnLogin');
    if (btn) {
      btn.disabled = true;
      const text   = btn.querySelector('.btn-text');
      const loader = btn.querySelector('.btn-loader');
      if (text)   text.classList.add('hidden');
      if (loader) loader.classList.remove('hidden');
    }

    try {
      const passwordHash = await this._sha256(password);
      const res = await API.login(username, passwordHash);

      if (!res) {
        throw new Error('Sin respuesta del servidor. Verificá la URL de la API en config.js.');
      }

      if (!res.ok) {
        throw new Error(res.error || 'Credenciales incorrectas.');
      }

      // Guardar sesión
      localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, res.token);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER,  JSON.stringify(res.user));
      Permisos.set(res.user.PermisosBitMask);

      // Redirigir al panel
      window.location.href = 'app.html';

    } catch (err) {
      this._showLoginError(err.message || 'Error de conexión con el servidor.');
      // Restaurar botón
      if (btn) {
        btn.disabled = false;
        const text   = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        if (text)   text.classList.remove('hidden');
        if (loader) loader.classList.add('hidden');
      }
    }
  },

  _showLoginError(msg) {
    const el = document.getElementById('loginError');
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
    }
  },

  // ── LOGOUT ────────────────────────────────────────────────
  logout() {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    if (token) {
      // Fire and forget — no esperamos respuesta
      API.logout().catch(() => {});
    }
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    Permisos.clear();
    this.currentUser = null;
    window.location.href = 'index.html';
  },

  // ── CHECK SESSION ─────────────────────────────────────────
  // Retorna true si hay una sesión guardada válida en localStorage
  checkSession() {
    const token    = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const userJSON = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);

    if (!token || !userJSON) return false;

    try {
      const user = JSON.parse(userJSON);
      if (!user || !user.ID) return false;

      this.currentUser = user;
      Permisos.load();
      return true;
    } catch (e) {
      return false;
    }
  },

  // ── REQUIRE PERMISO ────────────────────────────────────────
  requirePermiso(permiso) {
    if (!Permisos.tiene(permiso)) {
      if (typeof UI !== 'undefined') UI.error('No tenés permiso para esta acción.');
      return false;
    }
    return true;
  },

  // ── SHA-256 ────────────────────────────────────────────────
  async _sha256(text) {
    // Usar Web Crypto API nativa
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data    = encoder.encode(text);
      const buffer  = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback: si no hay crypto (muy raro en browsers modernos)
    throw new Error('Tu navegador no soporta encriptación. Actualizalo e intentá de nuevo.');
  },
};
