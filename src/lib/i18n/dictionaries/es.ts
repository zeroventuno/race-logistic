import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/** Español. Terminología de comisarios RFEC / UCI. */
export const es: Dictionary = {
  meta: {
    appName: "Flamme Rouge",
    tagline: "Dirección de carrera en directo",
  },

  common: {
    save: "Guardar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    back: "Volver",
    next: "Siguiente",
    close: "Cerrar",
    edit: "Editar",
    remove: "Quitar",
    add: "Añadir",
    retry: "Reintentar",
    loading: "Cargando…",
    saving: "Guardando…",
    search: "Buscar",
    none: "Ninguno",
    unknown: "Desconocido",
    optional: "opcional",
    required: "obligatorio",
    yes: "Sí",
    no: "No",
    error: "Algo ha fallado",
    errorRetry: "No se pudo completar. Inténtalo de nuevo.",
    offline: "Sin conexión",
    online: "Conectado",
    language: "Idioma",
  },

  roles: {
    lead_car: { label: "Coche de apertura", short: "Apertura" },
    sweep_car: { label: "Coche de cierre", short: "Cierre" },
    broom_wagon: { label: "Coche escoba", short: "Escoba" },
    moto: { label: "Moto de apoyo", short: "Moto" },
    ambulance: { label: "Ambulancia", short: "Ambulancia" },
    mechanic: { label: "Asistencia mecánica", short: "Mecánica" },
    support_car: { label: "Coche de apoyo", short: "Apoyo" },
    marshal: { label: "Comisario de ruta", short: "Comisario" },
    other: { label: "Otro", short: "Otro" },
  },

  signal: {
    live: "En directo",
    delayed: "Con retraso",
    stale: "Sin actualizar",
    lost: "Sin señal",
    never: "Sin vincular",
    lastSeen: "Última posición {age}",
  },

  race: {
    status: {
      draft: "Borrador",
      armed: "Lista",
      live: "En marcha",
      finished: "Finalizada",
      archived: "Archivada",
    },
    distance: "Distancia",
    elevation: "Desnivel",
    start: "Salida",
    positions: "Vehículos de apoyo",
    route: "Recorrido",
  },

  gap: {
    title: "Ventana apertura ↔ escoba",
    short: "Ventana",
    target: "Objetivo: {duration}",
    measured:
      "Medida por la diferencia horaria de paso de los dos vehículos por el mismo punto.",
    projected:
      "Estimada: {distance} por el recorrido, a la velocidad media actual del coche escoba ({speed}).",
    noLead: "Coche de apertura sin posición. Vincula su dispositivo.",
    noSweep: "Coche escoba sin posición. Vincula su dispositivo.",
    noBoth: "Esperando la posición de los dos vehículos de referencia.",
    sweepAhead:
      "El coche escoba va por delante del de apertura. Comprueba si los roles están invertidos.",
    sweepStopped:
      "Distancia por el recorrido: {distance}. Coche escoba parado — tiempo indefinido.",
    noHistory:
      "Distancia por el recorrido: {distance}. Historial insuficiente para convertirla en tiempo.",
    stale: "Dato de {age} — puede no reflejar la posición actual.",
    overTarget: "Por encima de la ventana objetivo",
    underTarget: "Por debajo de la ventana objetivo",
  },

  alerts: {
    title: "Alertas",
    none: "Sin alertas activas",
    raise: "Lanzar alerta",
    categories: {
      medical: { label: "Caída / ambulancia", short: "Caída" },
      mechanical: { label: "Problema mecánico", short: "Mecánico" },
      other: { label: "Otro", short: "Otro" },
    },
    status: {
      open: "Abierta",
      acknowledged: "Recibida",
      dispatched: "Apoyo enviado",
      en_route: "En camino",
      on_scene: "En el lugar",
      resolved: "Resuelta",
      cancelled: "Cancelada",
    },
    priority: {
      critical: "Crítica",
      high: "Alta",
      normal: "Normal",
    },
    confirmMedical: "Confirmar aviso de emergencia",
    confirmMedicalBody:
      "Envía de inmediato la ambulancia más cercana y marca el lugar en el mapa de todo el equipo.",
    sending: "Enviando…",
    queued: "En cola — sin señal. Seguirá intentándolo.",
    delivered: "Recibida por dirección",
    failed: "Fallo al enviar — reintentando",
    at: "en el km {km}",
    raisedBy: "Lanzada por {position}",
    noteLabel: "Descripción (opcional)",
    notePlaceholder: "¿Qué ha pasado?",

    dispatch: {
      youWereCalled: "Te han asignado",
      calling: "Enviando {position}",
      called: "{position} enviada",
      reason: "{position}, {distance} {direction} por el recorrido, ~{eta}",
      ahead: "por delante",
      behind: "por detrás",
      onMyWay: "Voy para allá",
      cantGo: "No puedo",
      arrived: "He llegado",
      enRoute: "{position} va en camino",
      onScene: "{position} ha llegado",
      declined: "{position} no ha podido atender",
      reassigning: "Enviando el siguiente vehículo disponible…",
      noneAvailable:
        "No hay vehículos disponibles para esta categoría. Dirección debe actuar manualmente.",
      declineReason: "Motivo (opcional)",
      reassign: "Cambiar vehículo",
    },

    proximity: {
      ahead: "{category} a {distance} por delante",
      passing: "Estás pasando por el lugar de la alerta",
      dismiss: "Entendido",
    },

    confirm: {
      prompt: "Has pasado por el lugar. ¿Sigue el problema?",
      still_there: "Sigue ahí",
      cleared: "Ya está despejado",
      not_found: "No he visto nada",
      thanks: "Gracias — dirección ha sido informada.",
      countStillThere: "{count} lo confirman",
      countCleared: "{count} dicen que está despejado",
    },

    actions: {
      acknowledge: "Recibir",
      resolve: "Resolver",
      cancel: "Cancelar alerta",
      resolutionNote: "Qué se hizo",
    },
  },

  driver: {
    bindTitle: "Introduce el código de tu vehículo",
    bindSubtitle:
      "La dirección de carrera te ha dado un código de 6 caracteres. Vincula este móvil a tu función en la carrera.",
    bindPlaceholder: "ABC-123",
    bindAction: "Vincular",
    bindInvalid: "Código no válido. Revisa los 6 caracteres e inténtalo de nuevo.",
    bindNotFound: "Código inexistente o caducado. Habla con dirección.",
    bindTooManyAttempts:
      "Demasiados intentos. Espera un momento antes de reintentar.",
    boundAs: "Eres {position} en {race}",
    unbind: "Desvincular este dispositivo",
    unbindConfirm:
      "Al desvincular, este móvil deja de transmitir la posición del vehículo. ¿Confirmas?",
    revoked:
      "Dirección ha desvinculado este dispositivo. Pide un código nuevo.",

    gpsPermissionTitle: "Necesitamos tu ubicación",
    gpsPermissionBody:
      "La app usa el GPS para mostrar tu vehículo en el mapa de dirección. Sin ello, nadie ve dónde estás.",
    gpsDenied:
      "Permiso de ubicación denegado. Actívalo en los ajustes del navegador y recarga.",
    gpsUnavailable: "GPS no disponible en este dispositivo.",
    gpsSearching: "Buscando señal GPS…",

    transmitting: "Transmitiendo",
    paused: "En pausa",
    queuedPings: "{count} puntos en cola",
    batteryWarning: "Batería baja — conviene enchufar.",
    keepAwake: "Manteniendo la pantalla encendida",
  },

  director: {
    dashboard: "Panel",
    myRaces: "Mis carreras",
    newRace: "Nueva carrera",
    noRaces: "Todavía no has creado ninguna carrera.",
    noRacesAction: "Crear la primera carrera",
    setupChecklist: "Antes de ponerla en directo",
    needsRoute: "Cargar el recorrido",
    needsLead: "Definir el coche de apertura",
    needsSweep: "Definir el coche escoba",
    needsBinding: "{count} vehículo(s) sin dispositivo vinculado",
    ready: "Todo listo",
    goLive: "Iniciar carrera",
    finish: "Finalizar carrera",
  },

  route: {
    uploadTitle: "Cargar el recorrido",
    uploadSubtitle: "Sube el archivo GPX de la carrera.",
    uploadAction: "Elegir archivo GPX",
    uploadDrop: "Arrastra el archivo aquí",
    drawInstead: "O dibuja el recorrido en el mapa",
    drawTitle: "Dibujar el recorrido",
    drawHint: "Haz clic en el mapa para añadir puntos. Arrastra para ajustar.",
    undo: "Deshacer",
    clear: "Borrar",
    chooseSegment:
      "El archivo contiene más de un recorrido. Elige el de la carrera:",
    replaceWarning:
      "Sustituir el recorrido recalcula todas las posiciones en carrera. Hazlo antes de la salida.",
    parseError: "No se pudo leer el archivo",
    pointCount: "{count} puntos",
    current: "Recorrido actual",
    replace: "Sustituir recorrido",
  },

  positions: {
    title: "Vehículos de apoyo",
    add: "Añadir vehículo",
    addBulk: "Añadir varios",
    quantity: "Cantidad",
    label: "Identificación",
    driverName: "Conductor",
    driverPhone: "Teléfono",
    plate: "Matrícula",
    referenceLead: "Es el coche de apertura oficial",
    referenceSweep: "Es el coche escoba oficial",
    dispatchable: "Puede ser enviado ante alertas",
    code: "Código de vinculación",
    regenerateCode: "Generar código nuevo",
    regenerateWarning:
      "El código actual deja de funcionar. Si el conductor ya está vinculado, sigue transmitiendo hasta que se desvincule.",
    print: "Imprimir códigos",
    printTitle: "Códigos de vinculación — {race}",
    printHint:
      "Entrega cada código al conductor del vehículo correspondiente antes de la salida.",
    bound: "Vinculado",
    notBound: "Pendiente de vincular",
    revokeSession: "Desvincular dispositivo",
  },

  map: {
    fitRoute: "Encuadrar recorrido",
    followMe: "Seguir mi vehículo",
    vehicles: "Vehículos",
    showAll: "Mostrar todos",
    noWebGL:
      "Este navegador no admite WebGL. Los datos de posición siguen siendo correctos en las listas.",
  },
};
