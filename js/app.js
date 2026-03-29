/* ============================================================
   AGILIZATE – App Initialization
   ============================================================ */

window.addEventListener('DOMContentLoaded', async () => {

  // Verificar sesión
  if (!Auth.checkSession()) {
    window.location.href = 'index.html';
    return;
  }

  // Inicializar módulos
//  await Promise.all([
//    Solicitudes.init(),
//    Aprobaciones.init(),
//    Porteria.init(),
//    Dashboard.init(),
//    Usuarios.init(),
//    Configuracion.init(),
//    Nomina.init(),
//    Reportes.init(),
//    Logs.init(),
//    Excel.init(),
//  ]);
   const modulos = [
     window.Solicitudes,
     window.Aprobaciones,
     window.Porteria,
     window.Dashboard,
     window.Usuarios,
     window.Configuracion,
     window.Nomina,
     window.Reportes,
     window.Logs,
     window.Excel,
   ];
   
   await Promise.all(
     modulos
       .filter(m => m && typeof m.init === 'function')
       .map(m => m.init())
   );
   
  // Registrar sección de perfil
  UI.registerSection('profile', () => renderPerfil());

   // Registrar secciones básicas (fallback)
   UI.registerSection('dashboard', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Dashboard 🚀</h2>';
   });
   
   UI.registerSection('solicitudes', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Solicitudes</h2>';
   });
   
   UI.registerSection('aprobaciones', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Aprobaciones</h2>';
   });
   
   UI.registerSection('porteria', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Portería</h2>';
   });
   
   UI.registerSection('usuarios', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Usuarios</h2>';
   });
   
   UI.registerSection('configuracion', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Configuración</h2>';
   });
   
   UI.registerSection('nomina', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Nómina</h2>';
   });
   
   UI.registerSection('reportes', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Reportes</h2>';
   });
   
   UI.registerSection('logs', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Auditoría / Logs</h2>';
   });
   
   UI.registerSection('excel', () => {
     const content = document.getElementById('appContent');
     content.innerHTML = '<h2>Excel</h2>';
   });
   
  // Construir navegación
  UI.buildNav();
  UI.initOutsideClicks();

  // Ocultar loading
  const loading = document.getElementById('loadingScreen');
  if (loading) loading.remove();

  // Determinar sección inicial según rol
  const user = Auth.currentUser;
  let seccionInicial = 'dashboard';

  if (user.RolID === CONFIG.ROLES.PORTERIA) {
    seccionInicial = 'porteria';
  } else if (user.RolID === CONFIG.ROLES.USUARIO) {
    seccionInicial = 'solicitudes';
  } else if (user.RolID === CONFIG.ROLES.APROBADOR) {
    seccionInicial = user.PermisosBitMask & CONFIG.PERMISOS.DASHBOARD_VER ? 'dashboard' : 'aprobaciones';
  }

  UI.showSection(seccionInicial);
});

// ── Perfil ────────────────────────────────────────────────
function renderPerfil() {
  const content = document.getElementById('appContent');
  const user    = Auth.currentUser;
  if (!content || !user) return;

  content.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Mi Perfil</h2>
    </div>
    <div class="card" style="max-width:600px">
      <div class="card-body">
        <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--c-blue-700),var(--c-cyan-400));
            display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:#fff">
            ${Helpers.initials(user.NombreCompleto)}
          </div>
          <div>
            <div style="font-size:1.15rem;font-weight:700">${user.NombreCompleto}</div>
            <div style="color:var(--c-gray-500);font-size:.875rem">${user.NombreUsuario}</div>
            <span class="badge badge-primary">${user.RolNombre || user.RolID}</span>
          </div>
        </div>
        <div class="divider"></div>
        <div class="form-row">
          <div><strong>Email:</strong> ${user.Email || '–'}</div>
          <div><strong>Área:</strong> ${user.AreaID || '–'}</div>
        </div>
        <div class="form-row" style="margin-top:.75rem">
          <div><strong>Sector:</strong> ${user.SectorID || '–'}</div>
          <div><strong>Último Login:</strong> ${Helpers.formatDateTime(user.UltimoLogin)}</div>
        </div>
        <div class="divider"></div>
        <div>
          <strong style="font-size:.8rem;color:var(--c-gray-500)">PERMISOS ACTIVOS</strong>
          <div style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.3rem">
            ${Permisos.listar().map(p =>
              `<span class="badge badge-gray text-xs">${p.replace(/_/g, ' ')}</span>`
            ).join('')}
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
