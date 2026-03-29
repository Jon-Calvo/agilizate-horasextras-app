/* ============================================================
   AGILIZATE – Configuración Global del Frontend
   ============================================================ */

const CONFIG = {
  // ⚠️ REEMPLAZÁ ESTA URL con la URL de tu Google Apps Script desplegado
  API_URL: 'https://script.google.com/macros/s/AKfycbxUJRwtZeu5V2X1mq5x17dtfu3t2JzwpZ63lmmiDkzi4SrhFXSjC6AU8djZORih6ied/exec',

  STORAGE_KEYS: {
    TOKEN:    'agi_token',
    USER:     'agi_user',
    PERMISOS: 'agi_perms',
  },

  SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 horas

  ROWS_PER_PAGE: 20,

  // Horario nocturno (22:00 - 06:00)
  HORA_NOCTURNA_INICIO: 22,
  HORA_NOCTURNA_FIN: 6,

  // Estados de solicitud
  ESTADOS_SOLICITUD: {
    PENDIENTE: 'PENDIENTE APROBACION',
    APROBADA:  'APROBADA',
    RECHAZADA: 'RECHAZADA',
    PARCIAL:   'PARCIAL',
    CERRADA:   'CERRADA',
  },

  // Niveles IB
  IB_NIVELES: ['BUENO', 'REGULAR', 'MALO', 'CRITICO'],

  IB_COLORS: {
    BUENO:   '#10b981',
    REGULAR: '#f59e0b',
    MALO:    '#ef4444',
    CRITICO: '#991b1b',
  },

  // Permisos (bitfield positions)
  PERMISOS: {
    SOLICITUDES_CREAR:    1 << 0,   // 1
    SOLICITUDES_LEER:     1 << 1,   // 2
    SOLICITUDES_MODIFICAR:1 << 2,   // 4
    SOLICITUDES_ELIMINAR: 1 << 3,   // 8
    SOLICITUDES_APROBAR:  1 << 4,   // 16
    SOLICITUDES_RECHAZAR: 1 << 5,   // 32

    USUARIOS_CREAR:       1 << 6,   // 64
    USUARIOS_LEER:        1 << 7,   // 128
    USUARIOS_MODIFICAR:   1 << 8,   // 256
    USUARIOS_ELIMINAR:    1 << 9,   // 512
    USUARIOS_ASIGNAR_ROL: 1 << 10,  // 1024

    CONFIG_VALORHORA:     1 << 11,  // 2048
    CONFIG_TIPOCAMBIO:    1 << 12,  // 4096
    CONFIG_REGLAIB:       1 << 13,  // 8192
    CONFIG_MOTIVOS:       1 << 14,  // 16384
    CONFIG_AREAS:         1 << 15,  // 32768

    DASHBOARD_VER:        1 << 16,  // 65536
    DASHBOARD_EXPORTAR:   1 << 17,  // 131072
    REPORTE_GLOBAL:       1 << 18,  // 262144

    EXCEL_EXPORTAR:       1 << 19,  // 524288
    EXCEL_IMPORTAR:       1 << 20,  // 1048576

    PORTERIA_REGISTRAR:   1 << 21,  // 2097152
    PORTERIA_VER:         1 << 22,  // 4194304

    AUDITORIA_VER:        1 << 23,  // 8388608
    AUDITORIA_EXPORTAR:   1 << 24,  // 16777216

    GESTIONAR_PERMISOS:   1 << 25,  // 33554432
    CONFIGURAR_SISTEMA:   1 << 26,  // 67108864
  },

  // Roles predefinidos
  ROLES: {
    DESARROLLADOR:  'desarrollador',
    ADMINISTRADOR:  'administrador',
    APROBADOR:      'aprobador',
    USUARIO:        'usuario',
    PORTERIA:       'porteria',
  },

  // Íconos SVG para la navegación (inline)
  NAV_ICONS: {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    solicitudes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    aprobaciones: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    porteria: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    nomina: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    usuarios: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    configuracion: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/></svg>`,
    reportes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    logs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
    excel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  },
};
