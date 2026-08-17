import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * Español. Terminología de comisarios RFEC / UCI. Tratamiento de usted.
 *
 * `sweep_car` = COCHE DE CIERRE (levanta el corte de carretera).
 * `broom_wagon` = COCHE ESCOBA (último vehículo, recoge los abandonos).
 * La ventana que calcula el panel es apertura ↔ cierre.
 */
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
    errorRetry: "No se pudo completar. Inténtelo de nuevo.",
    offline: "Sin conexión",
    online: "Conectado",
    language: "Idioma",
    logout: "Cerrar sesión",
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
    noStart: "Sin hora de salida",
    details: "Datos de la carrera",
    lapsTotal: "{laps} vueltas = {distance} de carrera.",
    lap: "vuelta {lap}/{laps}",
    lapsCircuit: "circuito de {laps} vueltas",
    lapUnknown: "vuelta ?",

    form: {
      nameLabel: "Nombre de la carrera",
      namePlaceholder: "Giro delle Langhe — 2ª etapa",
      nameRequired: "Dé un nombre a la carrera — es como la reconocerá en la lista.",
      nameTooLong: "Nombre demasiado largo (máximo 200 caracteres).",
      locationLabel: "Localidad",
      locationHint: "Ciudad o zona de la salida. Aparece en la lista de carreras.",
      locationPlaceholder: "Alba, Piamonte",
      locationTooLong: "Localidad demasiado larga (máximo 200 caracteres).",
      dateLabel: "Fecha de la salida",
      dateRequired: "Indique también la fecha de la salida.",
      timeLabel: "Hora de la salida",
      timeHint: "En hora local del lugar de carrera.",
      timeRequired: "Indique también la hora de la salida.",
      dateTimeInvalid: "Fecha u hora no válidas. Revise los dos campos.",
      timezoneLabel: "Zona horaria de la carrera",
      timezoneHint:
        "Todo lo que ve la dirección se convierte a esta zona, también en el móvil del conductor.",
      timezoneRequired: "Elija la zona horaria del lugar de carrera.",
      timezoneUnknown: "Zona horaria desconocida.",
      lapsLabel: "Vueltas al recorrido",
      lapsHint:
        "1 para una carrera en línea. En circuito, la distancia de carrera es el trazado multiplicado por las vueltas.",
      lapsRequired: "Indique el número de vueltas.",
      lapsInteger: "El número de vueltas debe ser entero.",
      lapsMin: "La carrera tiene al menos 1 vuelta.",
      lapsMax: "Máximo 50 vueltas.",
      gapHint:
        "Cuántos minutos quiere la dirección entre el coche de apertura y el de cierre. A partir de ahí el panel decide si el pelotón se ha estirado o compactado demasiado.",
      targetLabel: "Ventana objetivo (minutos)",
      targetRequired: "Indique la ventana objetivo en minutos.",
      targetInteger: "La ventana objetivo debe ser un número entero de minutos.",
      targetMin: "La ventana objetivo debe ser de al menos 1 minuto.",
      targetMax: "La ventana objetivo no puede superar los 600 minutos (10 horas).",
      minLabel: "Avisar por debajo de (minutos)",
      minHint: "Pelotón demasiado compacto.",
      minInteger: "El límite mínimo debe ser un número entero de minutos.",
      minNegative: "El límite mínimo no puede ser negativo.",
      minMax: "El límite mínimo no puede superar los 600 minutos.",
      minAboveTarget:
        "El mínimo no puede ser mayor que la ventana objetivo ({target} min).",
      maxLabel: "Avisar por encima de (minutos)",
      maxHint: "Pelotón demasiado estirado.",
      maxInteger: "El límite máximo debe ser un número entero de minutos.",
      maxMin: "El límite máximo debe ser de al menos 1 minuto.",
      maxMax: "El límite máximo no puede superar los 600 minutos.",
      maxBelowMin: "El límite máximo debe ser mayor que el mínimo ({min} min).",
      maxBelowTarget:
        "El máximo no puede ser menor que la ventana objetivo ({target} min).",
      showLimits: "Definir los umbrales de aviso",
      saved: "Datos de la carrera actualizados",
      afterSave: "Al guardar pasa directamente al recorrido.",
    },
  },

  gap: {
    title: "Ventana apertura ↔ cierre",
    short: "Ventana",
    targetLabel: "Ventana objetivo",
    target: "Objetivo: {duration}",
    measured:
      "Medida por la diferencia horaria de paso de los dos vehículos por el mismo punto.",
    projected:
      "Estimada: {distance} por el recorrido, a la velocidad media actual del coche de cierre ({speed}).",
    noLead: "Coche de apertura sin posición. Vincule su dispositivo.",
    noSweep: "Coche de cierre sin posición. Vincule su dispositivo.",
    noBoth: "Esperando la posición de los dos vehículos de referencia.",
    sweepAhead:
      "El coche de cierre va por delante del de apertura. Compruebe si los roles están invertidos en la configuración.",
    sweepStopped:
      "Distancia por el recorrido: {distance}. Coche de cierre parado — tiempo indefinido.",
    noHistory:
      "Distancia por el recorrido: {distance}. Historial insuficiente para convertirla en tiempo.",
    stale: "Dato de {age} — puede no reflejar la posición actual.",
    overTarget: "Por encima de la ventana objetivo",
    underTarget: "Por debajo de la ventana objetivo",

    timeSeparation: "separación en tiempo",
    alongRoad: "por el recorrido",
    methodMeasured: "Medida",
    methodProjected: "Estimada",
    methodNone: "Sin dato",
    withinTarget: "Dentro de la ventana",
    overTargetDetail: "demasiado estirado",
    underTargetDetail: "demasiado compacto",
    comparisonSuspended:
      "Comparación con la ventana objetivo suspendida mientras el dato no sea fiable",
    noLimits: "Sin límites definidos para esta carrera",
    clockSuspect:
      "El reloj de uno de los dispositivos de referencia está desfasado respecto al servidor. Mientras dure, la antigüedad del dato y la medida no son fiables — confirme la posición por radio.",
    lapsUncertain:
      "Carrera en circuito de {laps} vueltas: el historial cargado no llega a la salida, así que el recuento de vueltas puede quedarse corto y la ventana ser mayor de lo que aparece.",
    onTarget: "Ventana {gap}, acordada {target}. Nada que corregir.",
    verdictAhead: "Ventana {gap}, acordada {target} — {drift} de adelanto.",
    verdictBehind: "Ventana {gap}, acordada {target} — {drift} de retraso.",
    remedyAhead: "Ralentice el coche de cierre.",
    remedyBehind: "Acelere el coche de cierre.",
    costAhead:
      "La carretera reabre antes de lo previsto y quien se ha quedado atrás pierde la protección demasiado pronto.",
    costBehind:
      "El corte de carretera está superando el tiempo autorizado por la autoridad de tráfico.",
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

    storageFailedTitle: "ALERTA NO GUARDADA EN ESTE DISPOSITIVO — USE LA RADIO AHORA.",
    storageFailedBody:
      "El almacenamiento local rechazó la escritura ({reason}). No se reenviará nada por sí solo.",
    retryCount: "{count} intento(s) sin éxito. Avise por radio.",
    unknownFailure: "fallo desconocido",
    nobodyDispatched: "No se ha enviado a nadie a esta alerta.",

    dispatch: {
      youWereCalled: "Ha sido asignado",
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
      dispatch: "Enviar apoyo",
      auto: "automático",
      fallbackNoPosition:
        "Sin sugerencia calculada y sin posición en el recorrido — orden arbitrario. Confirme por radio.",
      fallbackReason:
        "Sin sugerencia calculada. {distance} de diferencia en el recorrido, sin cálculo de retorno ni de tiempo estimado.",
    },

    proximity: {
      ahead: "{category} a {distance} por delante",
      passing: "Está pasando por el lugar de la alerta",
      dismiss: "Entendido",
    },

    confirm: {
      prompt: "Ha pasado por el lugar. ¿Sigue el problema?",
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
      confirmCancel: "¿confirma? (falsa alarma)",
      resolutionNote: "Qué se hizo",
    },
  },

  driver: {
    bindTitle: "Introduzca el código de su vehículo",
    bindSubtitle:
      "La dirección de carrera le ha dado un código de 6 caracteres. Vincula este móvil a su función en la carrera.",
    bindPlaceholder: "ABC-123",
    bindAction: "Vincular",
    bindInvalid: "Código no válido. Revise los 6 caracteres e inténtelo de nuevo.",
    bindNotFound: "Código inexistente o caducado. Hable con dirección.",
    bindTooManyAttempts:
      "Demasiados intentos. Espere un momento antes de reintentar.",
    bindPasteHint:
      "Puede pegar. Las letras O e I se leen como 0 y 1 — el código no usa esas letras.",
    boundAs: "Usted es {position} en {race}",
    unbind: "Desvincular este dispositivo",
    unbindConfirm:
      "Al desvincular, este móvil deja de transmitir la posición del vehículo. ¿Confirma?",
    revoked:
      "Dirección ha desvinculado este dispositivo. Pida un código nuevo.",

    gpsPermissionTitle: "Necesitamos su ubicación",
    gpsPermissionBody:
      "La app usa el GPS para mostrar su vehículo en el mapa de dirección. Sin ello, nadie ve dónde está.",
    gpsDenied:
      "Permiso de ubicación denegado. Actívelo en los ajustes del navegador y recargue.",
    gpsUnavailable: "GPS no disponible en este dispositivo.",
    gpsSearching: "Buscando señal GPS…",
    gpsNoApi:
      "Este navegador no facilita la ubicación. Use Chrome o Safari desde el móvil.",
    gpsNoFix:
      "Sin señal GPS. En túnel o garaje es normal; la captura se reanuda sola.",
    gpsTimeout: "El GPS tarda en responder. Se sigue intentando.",
    gpsFailed: "No se pudo obtener la posición. La captura sigue intentándolo.",
    gpsDeniedIOS:
      "Ubicación bloqueada. En iPhone: Ajustes → Safari → Ubicación → Preguntar, y recargue esta página. Si usa la app de Chrome: Ajustes → Chrome → Ubicación.",
    gpsDeniedAndroid:
      "Ubicación bloqueada. En Android: toque el candado junto a la dirección → Permisos → Ubicación → Permitir, y recargue la página.",
    gpsDeniedBrowser:
      "Ubicación bloqueada por el navegador. Permita el acceso a la ubicación en los permisos del sitio y recargue la página.",

    gapWarning: "Estuviste {age} sin transmitir.",
    gapWarningBody:
      "La dirección no vio tu posición en ese tiempo. Mantén esta pantalla al frente y el teléfono conectado a la corriente.",
    tapToDismiss: "toca para descartar",
    alertNotSaved: "ALERTA NO GUARDADA EN ESTE TELÉFONO — USA LA RADIO AHORA.",
    alertNotSavedDetail:
      "El almacenamiento local rechazó la escritura ({reason}). Nada se reenviará solo.",
    alertAttempts: "{count} intento(s) sin éxito. Avisa por radio.",
    transmitting: "Transmitiendo",
    paused: "En pausa",
    queuedPings: "{count} puntos en cola",
    queuedAlerts: "{count} alerta(s) todavía sin entregar. Avise por radio.",
    pingRejected: "POSICIÓN RECHAZADA",
    pingRejectedDetail:
      "El servidor rechazó {count} posición(es): su posición NO aparece en el mapa de dirección.",
    queueNotDurable:
      "Almacenamiento local no disponible: la cola se pierde si se cierra la app.",
    batteryWarning: "Batería baja — conviene enchufar.",
    keepAwake: "Manteniendo la pantalla encendida",
    keepScreenOpen:
      "Mantenga esta pantalla abierta durante la carrera. La posición se envía sola, incluso con señal débil.",
  },

  director: {
    dashboard: "Panel",
    myRaces: "Mis carreras",
    myRacesSubtitle:
      "Cada carrera tiene su recorrido, sus vehículos de apoyo y sus códigos.",
    newRace: "Nueva carrera",
    newRaceSubtitle:
      "Solo lo esencial por ahora. El recorrido y los vehículos llegan en los siguientes pasos y se pueden cambiar hasta la salida.",
    createAndContinue: "Crear carrera e ir al recorrido",
    noRaces: "Todavía no ha creado ninguna carrera.",
    noRacesAction: "Crear la primera carrera",
    setupChecklist: "Antes de ponerla en directo",
    needsRoute: "Cargar el recorrido",
    needsPositions: "Registrar los vehículos de apoyo",
    needsLead: "Definir el coche de apertura",
    needsSweep: "Definir el coche de cierre",
    needsBinding: "{count} vehículo(s) sin dispositivo vinculado",
    ready: "Todo listo",
    goLive: "Iniciar carrera",
    finish: "Finalizar carrera",

    areaOverline: "Área de dirección de carrera",
    filterAll: "Todas",
    filterReady: "Listas",
    filterPreparing: "En preparación",
    filterFinished: "Finalizadas",
    noneInFilter: "Ninguna carrera en este estado.",
    openRace: "Abrir",
    openRecord: "Registro",
    supportShort: "Apoyo",
    listErrorBody:
      "Recarga la página. Si continúa, cierra sesión y vuelve a entrar: tu sesión puede haber caducado.",
    steps: "Fases de la carrera",
    overview: "Resumen",
    live: "En directo",
    resolveItem: "Resolver",
    pendingCount: "{count} punto(s) pendiente(s)",
    readOnly: "Solo lectura",
    readOnlyRoute:
      "Participa en esta carrera como observador y no puede modificar el recorrido.",
    markReady: "Marcar la carrera como lista",
    marking: "Guardando…",
    backToDraft: "Volver a borrador",
    reverting: "Volviendo…",
    resolveBlockingFirst: "Resuelva antes los puntos obligatorios.",

    checklist: {
      routeLabel: "Recorrido cargado",
      routeHint:
        "Suba el GPX de la carrera o dibuje el trazado en el mapa. Sin recorrido no hay cálculo de kilometraje ni de ventana.",
      positionsLabel: "Vehículos de apoyo registrados",
      positionsHint:
        "Registre los vehículos de apoyo. Cada uno recibe un código que el conductor introduce en su móvil.",
      leadLabel: "Referencia de apertura definida",
      leadHint:
        "Marque qué vehículo es el coche de apertura. Es el inicio de la ventana que vigila la dirección.",
      sweepLabel: "Referencia de cierre definida",
      sweepHint:
        "Marque qué vehículo es el coche de cierre. Su paso es el que reabre la carretera y cierra la ventana.",
      startLabel: "Hora de salida",
      startHint:
        "Opcional, pero es lo que hace que el panel muestre una cuenta atrás en vez de solo el reloj.",
    },

    empty: {
      intro:
        "Una carrera está lista para salir en directo cuando tiene recorrido, vehículos de apoyo y las referencias de apertura y cierre marcadas. Son tres pasos:",
      step1Title: "Registre la carrera",
      step1Body:
        "Nombre, lugar, salida y la ventana objetivo entre el coche de apertura y el de cierre. Un minuto.",
      step2Title: "Cargue el recorrido",
      step2Body:
        "Suba el GPX que ya tiene, o dibuje el trazado en el mapa. Es lo que convierte una posición GPS en un kilómetro de carrera.",
      step3Title: "Registre los vehículos e imprima los códigos",
      step3Body:
        "Cada moto, ambulancia y coche de apoyo recibe un código de 6 caracteres. El conductor lo introduce en su propio móvil y ya está — sin instalar nada, sin crear cuenta.",
    },
  },

  route: {
    uploadTitle: "Cargar el recorrido",
    uploadSubtitle: "Suba el archivo GPX de la carrera.",
    uploadAction: "Elegir archivo GPX",
    uploadDrop: "Arrastre el archivo aquí",
    uploadHint:
      "O pulse para elegirlo. Sirve lo que sale de Strava, Garmin Connect, RideWithGPS, Komoot o del software de trazado de la carrera.",
    uploadReading: "Los archivos grandes tardan unos segundos.",
    drawInstead: "O dibuje el recorrido en el mapa",
    drawTitle: "Dibujar el recorrido",
    drawHint: "Haga clic en el mapa para añadir puntos. Arrastre para ajustar.",
    drawShortcuts:
      "Supr borra el vértice seleccionado (o pulse con el botón derecho sobre él). Ctrl+Z deshace.",
    undo: "Deshacer",
    clear: "Borrar",
    chooseSegment:
      "El archivo contiene más de un recorrido. Elija el de la carrera:",
    chooseSegmentHint:
      "El archivo contiene {count} trazados. Unirlos todos crearía un salto en mitad de la carrera, así que elija uno.",
    segmentName: "Trazado {number}",
    kindTrack: "traza grabada",
    kindRoute: "ruta planificada",
    kindWaypoints: "waypoints sueltos",
    replaceWarning:
      "Sustituir el recorrido recalcula todas las posiciones en carrera. Hágalo antes de la salida.",
    parseError: "No se pudo leer el archivo",
    noGpx: "Sin GPX",
    pointCount: "{count} puntos",
    current: "Recorrido actual",
    replace: "Sustituir recorrido",

    purpose:
      "Es el trazado que convierte la coordenada GPS de cada vehículo en “kilómetro 42 de la carrera”. Sin él no hay cálculo de ventana entre apertura y cierre, ni sugerencia del vehículo más cercano por carretera.",
    missingExplain:
      "Sin recorrido. Sin él el sistema no puede decir en qué kilómetro está cada vehículo, ni calcular la ventana.",
    sourceGpx: "Importado de {filename}",
    sourceDrawn: "Dibujado en el mapa",
    geometryPoints: "Puntos de geometría",
    reviewTitle: "Comprobación antes de guardar",
    warningsTitle: "{count} punto(s) de atención en este archivo",
    confirmUse: "Confirmar y usar este recorrido",
    chooseAnotherFile: "Elegir otro archivo",
    noFileYet: "¿Todavía no tiene el archivo del recorrido?",
    vertices: "Vértices",
    saveDrawn: "Guardar recorrido",
    deleteVertex: "Borrar vértice",
    closeLoop: "Cerrar el circuito",
    tooManyVertices:
      "{count} vértices son más de los que debería tener un trazado dibujado a mano (límite {limit}). Si el recorrido es realmente largo, importe un GPX.",
    oneVertex:
      "Un solo vértice no es un recorrido. Pulse en el mapa para marcar por dónde pasa la carrera.",
    savedTitle: "Recorrido guardado",
    savedReplaced: "el recorrido anterior se ha desactivado.",
    saveErrorTitle: "No se pudo guardar",
    saveFailed:
      "No se pudo guardar el recorrido. Compruebe la conexión y reinténtelo.",
    saveConnectionLost:
      "La conexión se cortó durante el envío. El recorrido anterior sigue vigente — reinténtelo.",
    fileUnreadable:
      "No se pudo leer el archivo del disco. Cópielo a otra carpeta y reinténtelo.",
    fileNotGpx:
      "No se pudo interpretar este archivo. Confirme que es un .gpx y que se abre en otro programa.",

    uploadTooLarge:
      "El recorrido enviado es demasiado grande. Recorte el archivo al tramo de la carrera.",
    uploadBadBody: "Cuerpo de la petición ilegible.",
    uploadBadSource: "Origen del recorrido desconocido.",
    uploadBadPoints: "Puntos del recorrido no válidos.",
    uploadTooManyVertices:
      "Un recorrido dibujado a mano no debería tener más de {limit} vértices.",
    uploadBuildFailed: "No se pudo construir el recorrido con esos puntos.",
    uploadReleaseFailed:
      "No se pudo liberar el recorrido anterior. Recargue la página y reinténtelo.",
    uploadInsertFailed:
      "No se pudo guardar el recorrido. El recorrido anterior sigue vigente.",
  },

  positions: {
    title: "Vehículos de apoyo",
    intro:
      "Cada vehículo de apoyo de la carrera se convierte en una posición con código propio. El conductor introduce el código en su móvil — sin instalar aplicación, sin crear cuenta — y a partir de ahí el dispositivo transmite la posición de ese vehículo.",
    add: "Añadir vehículo",
    addBulk: "Añadir varios",
    addHint:
      "Cada posición nace con un código de vinculación único y un nombre que puede cambiar después. El primer coche de apertura y el primer coche de cierre entran ya marcados como referencia.",
    quantity: "Cantidad",
    label: "Identificación",
    role: "Rol",
    driverName: "Conductor",
    driverPhone: "Teléfono",
    driverPhoneHint: "Con prefijo de país si es extranjero.",
    noDriver: "Conductor no indicado",
    plate: "Matrícula",
    referenceLead: "Es el coche de apertura oficial",
    referenceSweep: "Es el coche de cierre oficial",
    markLead: "Marcar como apertura",
    markSweep: "Marcar como cierre",
    dispatchable: "Puede ser enviado ante alertas",
    code: "Código de vinculación",
    codeRevoked: "revocado — genere otro",
    codeExpired: "caducado — genere otro",
    codeHidden: "Solo quien edita la carrera ve los códigos.",
    copyCode: "Copiar código",
    copied: "copiado",
    regenerateCode: "Generar código nuevo",
    regenerateWarning:
      "El código actual deja de funcionar. Si el conductor ya está vinculado, sigue transmitiendo hasta que se desvincule.",
    moveUp: "Subir {position}",
    moveDown: "Bajar {position}",
    confirmRemove: "¿Quitar de verdad?",
    orderHint:
      "el orden de la lista es el orden en que aparecen en el panel en directo.",
    emptyTitle: "Ningún vehículo registrado",
    emptyBody:
      "Una posición es un rol en la carrera (“Moto 3”, “Ambulancia 1”), no un dispositivo. El móvil se vincula después, con el código — y puede cambiarse en plena carrera si se agota la batería, sin perder el historial.",
    emptyStart:
      "Empiece por el coche de apertura y el de cierre: son los que definen la ventana que vigila la dirección.",
    missingRefsTitle: "Faltan las referencias de la ventana",
    missingRefsBody:
      "Sin las dos, el panel no puede calcular el tiempo entre la cabeza y la cola del pelotón.",
    bound: "Vinculado",
    notBound: "Pendiente de vincular",
    revokeSession: "Desvincular dispositivo",

    print: "Imprimir códigos",
    printTitle: "Códigos de vinculación — {race}",
    printHint:
      "Entregue cada código al conductor del vehículo correspondiente antes de la salida.",
    printLost:
      "Si se pierde una hoja, genere otro código en la pantalla de vehículos: el antiguo deja de valer al instante.",
    printInstruction:
      "Cada conductor abre {url} en su móvil e introduce el código de su bloque.",
    printUrlMissing: "(dirección de la aplicación)",
    printNoUrlTitle: "Dirección de la aplicación sin configurar",
    printNoUrlBody:
      "La variable {variable} está vacía, así que la hoja sale sin la dirección que el conductor debe abrir. Escriba la dirección a mano antes de repartirla.",
    printMissing:
      "{count} posición(es) sin código válido han quedado fuera de esta hoja. Genere un código nuevo en la pantalla de vehículos.",
    printExpired:
      "{count} código(s) de esta hoja han caducado y ya no vinculan ningún móvil. Genere códigos nuevos antes de imprimir.",
    printNothingTitle: "Nada que imprimir",
    printNothingBody: "Registre primero los vehículos de apoyo.",
    printFooter:
      "el código vale solo para esta carrera y solo para este vehículo. Vincular un móvil nuevo desvincula el anterior.",

    form: {
      invalidData: "Datos no válidos.",
      roleInvalid: "Elija un rol válido.",
      quantityInteger: "La cantidad debe ser un número entero.",
      quantityMin: "Añada al menos 1 vehículo.",
      quantityMax: "Añada 40 vehículos como máximo de una vez.",
      labelRequired:
        "El vehículo necesita un nombre — es como lo llamará la dirección por radio.",
      labelTooLong: "Nombre demasiado largo (máximo 60 caracteres).",
      driverNameTooLong:
        "Nombre del conductor demasiado largo (máximo 120 caracteres).",
      phoneTooLong: "Teléfono demasiado largo.",
      phoneInvalid:
        "Teléfono no válido. Use solo números, con prefijo de país si es extranjero.",
      plateTooLong: "Matrícula demasiado larga.",
      notFound: "Vehículo no encontrado. Recargue la página.",
      referenceCleared:
        "Atención: la carrera se ha quedado sin referencia de {reference} — marque una antes de la salida.",
      codeGenerationFailed:
        "No se pueden generar códigos únicos ahora. Reinténtelo en unos segundos.",
      codeIssueUnavailable:
        "No se puede emitir un código nuevo en este servidor.",
      codeNoneFree:
        "No se pudo sortear un código libre. Reinténtelo en unos segundos.",
      codeRevokedMeanwhile:
        "El código anterior ya se ha revocado — este vehículo queda sin código hasta que lo reintente.",
    },
  },

  map: {
    fitRoute: "Encuadrar recorrido",
    followMe: "Seguir mi vehículo",
    vehicles: "Vehículos",
    showAll: "Mostrar todos",
    noWebGL:
      "Este navegador no admite WebGL. Los datos de posición siguen siendo correctos en las listas.",
    basemapLabel: "Mapa base",
    basemapHint:
      "Solo para esta carrera. El trazado cambia de color con él, para no desaparecer sobre el fondo elegido.",
    basemapAsphalt: "Asfalto",
    basemapAsphaltHint:
      "Trazado limpio, sin relieve. Es el que menos compite con los vehículos: la opción correcta para carrera urbana y para pantalla proyectada en dirección.",
    basemapTopo: "Topográfico",
    basemapTopoHint:
      "Curvas de nivel, pendiente y caminos vecinales. Es el único fondo que muestra la subida antes de que llegue: en una carrera de montaña cambia lo que se habla por radio.",
    basemapSatellite: "Satélite",
    basemapSatelliteHint:
      "Imagen aérea. Sirve para comprobar que la carretera del GPX es la de la carrera y para reconocer un punto de apoyo por lo que hay en el terreno.",
    slowTitle: "El mapa no ha terminado de cargar.",
    slowBody:
      "Puede ser una pestaña en segundo plano, WebGL no disponible o las teselas del mapa bloqueadas en la red. Los kilómetros, la ventana y la lista de vehículos de al lado siguen siendo correctos.",
  },

  live: {
    snapshotErrorTitle: "No se pudo montar el panel en directo",
    snapshotErrorBody:
      "La carrera existe, pero no se pudo leer el estado en directo. Recargue la página; si sigue, compruebe su conexión con la base de datos.",
    noRoute:
      "Esta carrera no tiene recorrido activo. Sin él no hay mapa, no hay kilometraje y no hay ventana apertura ↔ cierre.",
    clockNote:
      "Las antigüedades se miden con el reloj del servidor, no con el de este ordenador. Horas en la zona horaria de la carrera ({timezone}).",
    // "sin recibir" seria lido como "que não chegaram ao sistema" — sentido
    // oposto e alarmante num produto cujo requisito central é que alerta
    // nenhum se perca. "sin atender" só pode significar uma coisa.
    unacknowledged: "{count} alerta(s) sin atender.",
    moreUnacknowledged: "+{count} sin recibir",
    viewOnMap: "ver en el mapa",

    sortByRace: "Posición en carrera",
    sortByOrdinal: "Registro",
    noSignalGroup: "Sin señal ({count}) — la posición en el mapa es un recuerdo",
    noPositions: "No hay ningún vehículo registrado en esta carrera.",
    offRoute: "fuera del recorrido",
    clockOff: "reloj desfasado",
    fromTrack: "{distance} del trazado",

    panelOk: "Panel en directo",
    panelDegraded: "Panel degradado",
    panelDown: "PANEL SIN CONEXIÓN",
    reconciled: "reconciliado {age}",
    realtime: "tiempo real: {state}",
    realtimeOn: "activo",
    realtimeConnecting: "conectando…",
    realtimeOff: "caído",
    notPresent:
      "Lo que hay en pantalla no es el presente. Confirme todo por radio.",
    pollingOnly: "sin actualización instantánea; reconciliando cada {interval}",
    refreshNow: "actualizar ahora",
    refreshing: "actualizando…",
    soundOff: "sonido desactivado — activar",
    soundOn: "Aviso sonoro activo",

    showClosed: "{count} cerradas",
    hideClosed: "ocultar cerradas",
    showAllVehicles: "ver todos los vehículos",
    showFewer: "ver menos",
    history: "historial",
    hideHistory: "ocultar historial",
    loadingHistory: "Cargando historial…",
    noEvents: "Ningún evento registrado.",

    startedAt: "salida a las {time}",
    finishedAt: "finalizada a las {time}",
    confirmStart: "confirmar salida",
    confirmFinish: "confirmar cierre",
  },

  auth: {
    errorTitle: "No se pudo continuar",
    noticeTitle: "Casi está",
    name: "Su nombre",
    nameHint: "Lo ve el equipo de la carrera.",
    namePlaceholder: "Marina Ferrero",
    nameRequired: "Indique su nombre — es el que ve el equipo de la carrera.",
    nameTooLong: "Nombre demasiado largo (máximo 80 caracteres).",
    email: "Correo electrónico",
    emailPlaceholder: "direccion@sucarrera.es",
    emailRequired: "Indique el correo electrónico.",
    emailInvalid:
      "Este correo no parece válido. Compruebe si falta la @ o el dominio.",
    password: "Contraseña",
    passwordHint: "Mínimo 8 caracteres.",
    passwordRequired: "Indique la contraseña.",
    passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
    passwordTooLong: "La contraseña puede tener 72 caracteres como máximo.",
    passwordRepeat: "Repita la contraseña",
    passwordMismatch: "Las dos contraseñas no coinciden. Escríbalas de nuevo.",
    submitting: "Espere…",
    signIn: "Entrar en el panel",
    signUp: "Crear cuenta",
    haveAccount: "¿Ya tiene cuenta?",
    signInLink: "Entrar",
    firstTime: "¿Primera vez?",
    signUpLink: "Crear cuenta de dirección",

    confirmSent:
      "Cuenta creada. Hemos enviado un correo de confirmación a {email}. Confírmelo y vuelva aquí para entrar (revise también el correo no deseado).",
    invalidCredentials:
      "Correo o contraseña incorrectos. Si acaba de registrarse, confirme el correo antes de entrar.",
    emailNotConfirmed:
      "Este correo todavía no está confirmado. Abra el mensaje que le enviamos y pulse el enlace (revise el correo no deseado).",
    userExists:
      "Ya existe una cuenta con este correo. Vaya a la pantalla de entrada; si ha olvidado la contraseña, pida el restablecimiento desde Supabase.",
    emailRejected:
      "El servidor rechazó esta dirección de correo. Use un correo real que pueda abrir ahora — la confirmación llega ahí.",
    weakPassword:
      "Contraseña demasiado débil para el servidor. Use al menos 8 caracteres, mezclando letras y números.",
    rateLimited:
      "Demasiados intentos en poco tiempo. Espere unos minutos antes de reintentar.",
    signupDisabled:
      "El registro está desactivado en este servidor. Pida a alguien del equipo que cree su cuenta.",
    genericFailure:
      "No se pudo completar ahora. Compruebe su conexión y reinténtelo.",
  },

  errors: {
    forbidden: "No tiene permiso para modificar esta carrera.",
    raceNotFound: "Carrera no encontrada.",
    invalidRace: "Carrera no válida.",
    sessionExpired: "Su sesión ha caducado. Entre de nuevo.",
    notStartable: "Solo puede iniciarse una carrera en borrador o lista.",
    listRaces:
      "Recargue la página. Si persiste, salga y entre de nuevo — su sesión puede haber caducado.",
    noChange:
      "Nada ha cambiado: la alerta puede haberla cerrado otra persona, o ya no tiene permisos en esta carrera. Recargue la página.",

    db: {
      saveFailed:
        "No se pudo guardar. Reinténtelo; si sigue, recargue la página.",
      routeRaceConflict:
        "Se activó otro recorrido en esta carrera mientras trabajaba. Recargue la página y envíelo de nuevo — vence el recorrido más reciente.",
      bindCodeTaken:
        "El código sorteado coincidió con uno ya en uso en otra carrera. Pulse guardar de nuevo: se sorteará un código nuevo.",
      oneLead:
        "Esta carrera ya tiene una referencia de apertura. Desmarque la actual antes de marcar otra.",
      oneSweep:
        "Esta carrera ya tiene una referencia de cierre. Desmarque la actual antes de marcar otra.",
      ordinalConflict:
        "Dos vehículos han quedado con el mismo orden. Recargue la página y rehaga la reordenación.",
      sessionTaken:
        "Ya hay un móvil vinculado a este vehículo. Revoque el vínculo actual antes de crear otro.",
      leadSweepSame:
        "El mismo vehículo no puede ser la referencia de apertura y la de cierre — el cálculo de la ventana compararía el vehículo consigo mismo.",
      gapWindowIncoherent:
        "El límite mínimo de la ventana debe ser menor que el máximo.",
      targetGapRange: "La ventana objetivo debe estar entre 1 y 600 minutos.",
      raceNameLength: "El nombre de la carrera debe tener entre 1 y 200 caracteres.",
      positionLabelLength:
        "El nombre del vehículo debe tener entre 1 y 60 caracteres.",
      bindCodeFormat: "El código generado ha salido fuera de formato. Reinténtelo.",
      trackDistance: "El recorrido debe tener una longitud mayor que cero.",
      trackPoints: "El recorrido necesita al menos 2 puntos.",
      duplicate:
        "Este registro ya existe. Recargue la página para ver el estado actual.",
      checkViolation:
        "Algún valor está fuera de lo permitido. Revise los campos y reinténtelo.",
      missingRace:
        "La carrera referenciada ya no existe. Vuelva a la lista de carreras.",
      notFound:
        "Registro no encontrado — puede que otra persona lo haya eliminado. Recargue la página.",
    },
  },
};
