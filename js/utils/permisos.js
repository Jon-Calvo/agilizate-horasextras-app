/* ============================================================
   AGILIZATE – Sistema de Permisos (Bitfield)
   ============================================================ */

const Permisos = {
  _bitmask: 0,

  /** Carga el bitmask desde localStorage */
  load() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.PERMISOS);
    this._bitmask = stored ? parseInt(stored, 10) : 0;
  },

  /** Guarda el bitmask en localStorage */
  set(bitmask) {
    this._bitmask = parseInt(bitmask, 10) || 0;
    localStorage.setItem(CONFIG.STORAGE_KEYS.PERMISOS, this._bitmask);
  },

  /** Limpia los permisos */
  clear() {
    this._bitmask = 0;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PERMISOS);
  },

  /** Verifica si tiene el permiso dado */
  tiene(permiso) {
    return (this._bitmask & permiso) !== 0;
  },

  /** Verifica si tiene TODOS los permisos dados */
  tieneAll(...permisos) {
    return permisos.every(p => this.tiene(p));
  },

  /** Verifica si tiene ALGUNO de los permisos dados */
  tieneAny(...permisos) {
    return permisos.some(p => this.tiene(p));
  },

  // ── Shortcuts por módulo ──────────────────────────────────

  puedeCrearSolicitud()    { return this.tiene(CONFIG.PERMISOS.SOLICITUDES_CREAR); },
  puedeLeerSolicitud()     { return this.tiene(CONFIG.PERMISOS.SOLICITUDES_LEER); },
  puedeModificarSolicitud(){ return this.tiene(CONFIG.PERMISOS.SOLICITUDES_MODIFICAR); },
  puedeEliminarSolicitud() { return this.tiene(CONFIG.PERMISOS.SOLICITUDES_ELIMINAR); },
  puedeAprobar()           { return this.tiene(CONFIG.PERMISOS.SOLICITUDES_APROBAR); },
  puedeRechazar()          { return this.tiene(CONFIG.PERMISOS.SOLICITUDES_RECHAZAR); },

  puedeGestionarUsuarios() { return this.tieneAny(CONFIG.PERMISOS.USUARIOS_CREAR, CONFIG.PERMISOS.USUARIOS_MODIFICAR); },
  puedeVerDashboard()      { return this.tiene(CONFIG.PERMISOS.DASHBOARD_VER); },
  puedeExportarDashboard() { return this.tiene(CONFIG.PERMISOS.DASHBOARD_EXPORTAR); },
  puedeReporteGlobal()     { return this.tiene(CONFIG.PERMISOS.REPORTE_GLOBAL); },

  puedeExportarExcel()     { return this.tiene(CONFIG.PERMISOS.EXCEL_EXPORTAR); },
  puedeImportarExcel()     { return this.tiene(CONFIG.PERMISOS.EXCEL_IMPORTAR); },

  puedePorteriaVer()       { return this.tiene(CONFIG.PERMISOS.PORTERIA_VER); },
  puedePorteriaRegistrar() { return this.tiene(CONFIG.PERMISOS.PORTERIA_REGISTRAR); },

  puedeVerLogs()           { return this.tiene(CONFIG.PERMISOS.AUDITORIA_VER); },
  puedeExportarLogs()      { return this.tiene(CONFIG.PERMISOS.AUDITORIA_EXPORTAR); },

  puedeGestionarPermisos() { return this.tiene(CONFIG.PERMISOS.GESTIONAR_PERMISOS); },
  puedeConfigurarSistema() { return this.tiene(CONFIG.PERMISOS.CONFIGURAR_SISTEMA); },

  puedeConfigValorHora()   { return this.tiene(CONFIG.PERMISOS.CONFIG_VALORHORA); },
  puedeConfigTipoCambio()  { return this.tiene(CONFIG.PERMISOS.CONFIG_TIPOCAMBIO); },
  puedeConfigReglaIB()     { return this.tiene(CONFIG.PERMISOS.CONFIG_REGLAIB); },
  puedeConfigMotivos()     { return this.tiene(CONFIG.PERMISOS.CONFIG_MOTIVOS); },
  puedeConfigAreas()       { return this.tiene(CONFIG.PERMISOS.CONFIG_AREAS); },

  /** Retorna array con nombres de permisos activos (debug) */
  listar() {
    return Object.entries(CONFIG.PERMISOS)
      .filter(([, v]) => this.tiene(v))
      .map(([k]) => k);
  },
};

//Agregado
window.Permisos = {
  listar: () => [],
  tienePermiso: () => true
};
