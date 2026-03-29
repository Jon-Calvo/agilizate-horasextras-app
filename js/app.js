/* ============================================================
   AGILIZATE – App Initialization (fixed)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async function () {

  // 1. Verificar sesión — si no hay, redirigir al login
  if (!Auth.checkSession()) {
    window.location.href = 'index.html';
    return;
  }

  // 2. Registrar todas las secciones en UI
  // Cada módulo tiene un método render() que es llamado al navegar
  _registrarSecciones();

  // 3. Registrar sección perfil (inline, no necesita módulo propio)
  UI.registerSection('profile', function () { _renderPerfil(); });

  // 4. Inicializar catálogos compartidos en los módulos que los necesiten
  // (lo hace cada módulo en su render, no necesitamos pre-cargar aquí)

  // 5. Construir navegación y sidebar
  UI.buildNav();
  UI.initOutsideClicks();

  // 6. Ocultar pantalla de loading inicial
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) loadingScreen.style.display = 'none';

  // 7. Navegar a la sección inicial según el rol del usuario
  const user = Auth.currentUser;
  let seccionInicial = 'dashboard';

  const rolID = (user.RolID || '').toLowerCase();

  if (rolID === CONFIG.ROLES.PORTERIA) {
    seccionInicial = 'porteria';
  } else if (rolID === CONFIG.ROLES.USUARIO) {
    seccionInicial = Permisos.puedeLeerSolicitud() ? 'solicitudes' : 'dashboard';
  } else if (rolID === CONFIG.ROLES.APROBADOR) {
    seccionInicial = Permisos.puedeVerDashboard() ? 'dashboard' : 'aprobaciones';
  } else {
    // desarrollador / administrador → dashboard
    seccionInicial = Permisos.puedeVerDashboard() ? 'dashboard' : 'solicitudes';
  }

  UI.showSection(seccionInicial);
});

// ── Registro centralizado de secciones ──────────────────────
function _registrarSecciones() {
  // Cada módulo expone un método render() que dibuja el contenido
  // El init() ya no existe — registrar directamente

  UI.registerSection('dashboard',    function (p) { return Dashboard.render(p); });
  UI.registerSection('solicitudes',  function (p) { return Solicitudes.render(p); });
  UI.registerSection('aprobaciones', function (p) { return Aprobaciones.render(p); });
  UI.registerSection('porteria',     function (p) { return Porteria.render(p); });
  UI.registerSection('nomina',       function (p) { return Nomina.render(p); });
  UI.registerSection('usuarios',     function (p) { return Usuarios.render(p); });
  UI.registerSection('configuracion',function (p) { return Configuracion.render(p); });
  UI.registerSection('reportes',     function (p) { return Reportes.render(p); });
  UI.registerSection('logs',         function (p) { return Logs.render(p); });
  UI.registerSection('excel',        function (p) { return Excel.render(p); });
}

// ── Perfil ────────────────────────────────────────────────
function _renderPerfil() {
  const content = document.getElementById('appContent');
  const user    = Auth.currentUser;
  if (!content || !user) return;

  const permisosList = Permisos.listar();

  content.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Mi Perfil</h2>
    </div>
    <div class="card" style="max-width:640px">
      <div class="card-body">
        <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem">
          <div style="width:64px;height:64px;border-radius:50%;
            background:linear-gradient(135deg,var(--c-blue-700),var(--c-cyan-400));
            display:flex;align-items:center;justify-content:center;
            font-size:1.4rem;font-weight:700;color:#fff;flex-shrink:0">
            ${Helpers.initials(user.NombreCompleto)}
          </div>
          <div>
            <div style="font-size:1.15rem;font-weight:800;color:var(--c-gray-900)">${user.NombreCompleto || user.NombreUsuario}</div>
            <div style="color:var(--c-gray-500);font-size:.875rem;margin-bottom:.35rem">@${user.NombreUsuario}</div>
            <span class="badge badge-primary">${user.RolNombre || user.RolID}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="form-row">
          <div><span style="font-size:.75rem;font-weight:700;color:var(--c-gray-500);text-transform:uppercase">Email</span>
            <p style="margin-top:.2rem">${user.Email || '–'}</p>
          </div>
          <div><span style="font-size:.75rem;font-weight:700;color:var(--c-gray-500);text-transform:uppercase">Área</span>
            <p style="margin-top:.2rem">${user.AreaID || '–'}</p>
          </div>
        </div>
        <div class="form-row" style="margin-top:.75rem">
          <div><span style="font-size:.75rem;font-weight:700;color:var(--c-gray-500);text-transform:uppercase">Sector</span>
            <p style="margin-top:.2rem">${user.SectorID || '–'}</p>
          </div>
          <div><span style="font-size:.75rem;font-weight:700;color:var(--c-gray-500);text-transform:uppercase">Último Login</span>
            <p style="margin-top:.2rem">${Helpers.formatDateTime(user.UltimoLogin)}</p>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <span style="font-size:.75rem;font-weight:700;color:var(--c-gray-500);text-transform:uppercase">
            Permisos activos (${permisosList.length})
          </span>
          <div style="margin-top:.6rem;display:flex;flex-wrap:wrap;gap:.3rem">
            ${permisosList.length
              ? permisosList.map(p => `<span class="badge badge-gray" style="font-size:.68rem">${p.replace(/_/g, ' ')}</span>`).join('')
              : '<span style="color:var(--c-gray-400);font-size:.85rem">Sin permisos asignados</span>'
            }
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-secondary btn-sm" onclick="Usuarios.cambiarPassword('${user.ID}')">
          🔐 Cambiar Contraseña
        </button>
      </div>
    </div>
  `;
}
