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
      basemapInvalid: "Elige uno de los mapas disponibles.",
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

    why: {
      target: "{position}",
      eta: "~{minutes} min",
      uncertainAnchor: "POSICIÓN INCIERTA: el anclaje en el recorrido se eligió por desempate — confirma por radio antes de fiarte de esta distancia",
      ahead: "{distance} por delante de la alerta (tiene que dar la vuelta)",
      behind: "{distance} por detrás de la alerta, en el sentido de la carrera",
      straightOnly: "{distance} en línea recta — sin posición en el recorrido, la distancia por carretera es mayor",
      speedMeasured: "velocidad media medida {speed} km/h",
      speedNominal: "tiempo estimado por velocidad nominal ({speed} km/h): sin desplazamiento reciente medido",
      lastSeen: "última posición hace {seconds} s",
      offSpecialty: "{role} no es la especialidad para {category} — sugerido por proximidad",
      noOrigin: "Sin posición de origen de la alerta: ninguna sugerencia calculable.",
      noneSuggested: "Ningún apoyo sugerido.",
      noneDispatchable: "Ningún vehículo activable registrado en esta carrera.",
      count: "{count} sugerencia(s) para {category}.",
      uncertainCount: "{count} candidato(s) con anclaje ambiguo — distancia no fiable.",
      ignoredBusy: "{count} ya activado(s) para otra alerta.",
      ignoredNoSignal: "{count} ignorado(s) por señal perdida.",
      ignoredRole: "{count} no activable(s).",
      escalated: "ESCALADO: ningún vehículo de la especialidad disponible; activado {role}.",
      allStraight: "Todos en línea recta: sin posición en el recorrido para comparar.",
      takenMeanwhile: "Todos los candidatos fueron tomados por otras alertas durante la activación.",
      manual: "{position} — activado a mano por la dirección.",
    },
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
    api: {
      badJson: "El cuerpo de la petición no es JSON válido.",
      pingsNotArray: "El campo pings debe ser un array.",
      bodyTooLarge: "Cuerpo de {bytes} bytes por encima del límite de {limit}.",
      bodyOverLimit: "Cuerpo por encima del límite de {limit} bytes.",
      noBody: "Petición sin cuerpo.",
      bodyReadFailed: "No se pudo leer el cuerpo de la petición.",
      bodyNotObject: "El cuerpo de la petición debe ser un objeto JSON.",
      batchTooLarge: "Un lote de {count} pings supera el máximo de {max}. Divide el envío.",
      alertSaveFailed: "No se pudo registrar la alerta. Mantenla en cola y avisa por radio.",
      confirmKindInvalid: "Tipo de confirmación no válido: {kind}.",
      alertNotFound: "Alerta no encontrada en esta carrera.",
      confirmFailed: "No se pudo registrar la confirmación. Inténtalo de nuevo.",
      actionInvalid: "Acción no válida: {action}.",
      bindRateLimited: "Demasiados intentos seguidos. Espera {minutes} min y comprueba el código con la dirección.",
      bindLookupFailed: "No se pudo consultar el código. Inténtalo de nuevo.",
      bindRaceFailed: "No se pudo cargar la carrera de este código.",
      bindFailed: "No se pudo completar la vinculación. Inténtalo de nuevo en unos segundos.",
      bindUnknownCode: "Código no reconocido. Comprueba los 6 caracteres con la dirección de carrera.",
      takenOver: "otro dispositivo asumió esta posición",
      positionsFailed: "No se pudieron cargar las posiciones de la carrera.",
      notBound: "Este dispositivo no está vinculado a ninguna posición.",
      sessionCheckFailed: "No se pudo validar la sesión. El dispositivo sigue vinculado; reintentando.",
      sessionUnknown: "El servidor no reconoce esta vinculación. Pide un código nuevo a la dirección.",
      sessionRevokedWhy: "Vinculación terminada por la dirección: {reason}",
      sessionRevoked: "Esta vinculación fue terminada por la dirección. Pide un código nuevo.",
      positionGone: "La posición vinculada a este dispositivo ya no existe.",
      pingBadId: "clientPingId no es un UUID válido.",
      pingNoCoord: "Coordenada ausente o no numérica.",
      pingOutOfRange: "Coordenada fuera del intervalo geográfico válido.",
      pingNullIsland: "Coordenada (0, 0) — lectura de GPS no válida.",
      pingInaccurate: "Precisión de {accuracy} m por encima del límite de {limit} m.",
      pingBadDate: "recordedAt no es una fecha ISO 8601 válida.",
      pingFuture: "recordedAt está {minutes} min en el futuro — reloj del dispositivo desajustado.",
    },
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
    report: "Informe final",
    reportHint: "PDF con la ventana medida, los incidentes y el convoy.",

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

    segmentMissing: "El trazado elegido no existe en el archivo.",
    segmentTooManyPoints: "Este trazado tiene {count} puntos, por encima del límite de {limit}. Recorta el archivo al tramo de la carrera.",
    pointsMissing: "La lista de puntos del recorrido no llegó.",
    pointsTooMany: "El recorrido tiene {count} puntos, por encima del límite de {limit}. Recorta el archivo al tramo de la carrera antes de enviarlo.",
    pointMalformed: "El punto {index} está malformado.",
    pointBadLat: "El punto {index} tiene una latitud no válida ({value}).",
    pointBadLng: "El punto {index} tiene una longitud no válida ({value}).",
    etaUnknown: "tiempo estimado no disponible",
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
    dragHandle: "Arrastrar {position} para reordenar",
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
    warnStates: "No se pudieron leer las posiciones en directo de los vehículos.",
    warnSessions: "No se pudieron leer las vinculaciones de dispositivos.",
    warnAlerts: "No se pudieron leer las alertas: {detail}",
    warnPositions: "No se pudieron leer las posiciones: {detail}",
    warnGeometry: "Geometría del recorrido no disponible: {detail} El tramo ocupado no se dibujará.",
    snapshotErrorTitle: "No se pudo montar el panel en directo",
    snapshotErrorBody:
      "La carrera existe, pero no se pudo leer el estado en directo. Recargue la página; si sigue, compruebe su conexión con la base de datos.",
    noRoute:
      "Esta carrera no tiene recorrido activo. Sin él no hay mapa, no hay kilometraje y no hay ventana apertura ↔ cierre.",
    clockNote: "Tiempos según el reloj del servidor · huso de la carrera ({timezone})",
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
    confirmFinishBody: "Quita el mapa a todo el equipo que sigue en carretera, y el panel no lo deshace.",
  },

  auth: {
    gateTitle: "Prepara la carrera antes.",
    gateTitleStrong: "El día de la carrera, solo sigue.",
    gateCodes: "Códigos de vinculación",
    loginTitle: "Panel de la dirección",
    loginSubtitle: "Entra para preparar la carrera: recorrido, posiciones de apoyo y códigos de vinculación.",
    signupSubtitle: "La cuenta es tuya, y las carreras que crees solo las ves tú. Los conductores no necesitan cuenta: entran con el código de 6 caracteres.",
    forgotLink: "¿Olvidaste tu contraseña?",
    recoverTitle: "Recuperar acceso",
    recoverSubtitle: "Escribe el correo de la cuenta. Si existe, enviamos un enlace para definir una contraseña nueva.",
    recoverSubmit: "Enviar enlace",
    recoverSent: "Si existe una cuenta con {email}, el enlace va en camino. Sirve una vez y caduca.",
    metaRecover: "Recuperar acceso — Flamme Rouge",
    newPasswordTitle: "Nueva contraseña",
    newPasswordSubtitle: "Elige la contraseña que usarás para entrar al panel.",
    newPasswordSubmit: "Guardar contraseña",
    passwordChanged: "Contraseña actualizada.",
    recoverExpired: "Este enlace ya no vale. Pide otro en «¿Olvidaste tu contraseña?».",
    metaNewPassword: "Nueva contraseña — Flamme Rouge",
    metaLogin: "Entrar — Flamme Rouge",
    metaSignup: "Crear cuenta — Flamme Rouge",
    errorTitle: "No se pudo continuar",
    noticeTitle: "Casi está",
    confirmedTitle: "Cuenta confirmada",
    confirmed: "Listo. Tu cuenta está activa y ya estás dentro.",
    confirmFailed: "No se pudo confirmar la cuenta. El enlace del correo sirve una sola vez y caduca — crea la cuenta otra vez con el mismo correo para recibir uno nuevo.",
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

  landing: {
    skip: "Saltar al contenido",

    nav: {
      problem: "El problema",
      measures: "Lo que mide la carretera",
      screens: "Las dos pantallas",
      aria: "Secciones de la página",
      home: "Flamme Rouge, inicio",
      markerStart: "KM 000 — SALIDA",
    },

    hero: {
      title: "Dirección de carrera en directo,",
      titleStrong: "medida por carretera.",
      lead: "Cada vehículo de apoyo en el recorrido en tiempo real. La ventana entre el coche de apertura y el de cierre medida como un tiempo intermedio de cronometraje, no estimada. Y el auxilio elegido por la distancia que el coche va a recorrer de verdad.",
      ctaPanel: "Abrir la dirección de carrera",
      ctaDriver: "Soy conductor, tengo un código",
      note: "La flamme rouge marca el último kilómetro. Aquí marca el número que la dirección necesita: cuánto falta, medido, no estimado.",
      scroll: "Desplázate",
    },

    numbers: {
      aria: "Números medidos en pruebas",
      unitKm: "km",
      unitPoints: "puntos",
      unitChars: "caracteres",
      roadLabel: "Por carretera",
      roadBody: "Separaban a la moto del accidente que parecía estar viendo. En línea recta eran 50 metros. El sistema mandó la ambulancia que estaba 1,5 km por detrás.",
      offlineLabel: "Sin cobertura",
      offlineBody: "Acumulados en dos minutos sin cobertura, llegaron completos, en orden y sin duplicar en cuanto volvió la señal.",
      codeLabel: "Para entrar",
      codeBody: "Es todo lo que el conductor teclea. Sin cuenta, sin aplicación, sin equipos que comprar y recoger.",
    },

    problem: {
      marker: "Lo que pasa hoy",
      title: "La carrera ocurre por radio.",
      titleStrong: "Y la radio no llega al valle.",
      lead: "Nada de esto es culpa de quien organiza. Es lo que queda cuando la única fuente de posición es alguien diciendo, de memoria, dónde cree que está.",
      photo: "Foto · pelotón estirado",
      q1: "«¿Dónde está el coche de cierre?»",
      a1: "La respuesta es una estimación, y sobre ella se reabre la vía — y se cumple, o no, el tiempo de corte acordado con la autoridad de tráfico. Errar diez minutos de más es romper el acuerdo; de menos, reabrir la calle antes de hora.",
      q2: "«Se ha caído alguien en el km 60.»",
      a2: "¿Quién lo ha oído? ¿Quién ha ido? Mientras nadie contesta por radio, no hay forma de distinguir «el aviso no llegó» de «el aviso llegó y van de camino».",
      q3: "«Manda el apoyo más cercano.»",
      a3: "¿Más cercano medido cómo? En el mapa de papel la distancia es la del ojo — y el ojo no sabe que ese tramo es la vuelta y que la carretera solo se reencuentra 30 km más adelante.",
      q4: "«El conductor no lo ha entendido.»",
      a4: "En una carrera internacional el equipo de apoyo habla cuatro idiomas. La radio habla uno, y el briefing de media hora antes de la salida ya terminó.",
      q5: "«Carrera finalizada.»",
      a5: "Y no queda registro de quién estaba dónde, a qué hora, cuándo se abrió la alerta y cuánto tardó el auxilio. La federación pregunta después; responde la memoria del equipo.",
    },

    measures: {
      marker: "Lo que mide la carretera",
      title: "Seis decisiones de ingeniería",
      titleStrong: "que cambian lo que aparece en pantalla.",
      diagramAria: "Esquema de un recorrido de ida y vuelta. El punto del accidente está en el tramo de ida; la moto está en el de vuelta, a 50 metros en línea recta pero a 37,3 kilómetros por carretera. La ambulancia está 1,5 kilómetros por detrás del accidente, en el mismo tramo y en el mismo sentido.",
      diagramMoto: "**0,05 km** en línea recta entre la moto y el accidente. Es el número que usa un sistema de proximidad geométrica: con él habría salido la moto.",
      diagramRoute: "**37,3 km** por carretera, en el mismo instante: la moto está en el tramo de vuelta y tendría que rehacer todo el retorno contra el sentido de la carrera.",
      diagramAmb: "**1,5 km** por detrás, en el mismo tramo y en el mismo sentido: la ambulancia, que es la que el sistema activó.",
      diagramNote: "Esquema fuera de escala. Números medidos en un recorrido de prueba real.",
      leadTitle: "Distancia por carretera, no en línea recta.",
      leadBody1: "En una prueba real, una moto estaba a **0,05 km** en línea recta de un accidente y a **37,3 km** por carretera — en el tramo de vuelta del recorrido, con el único enlace entre ambos treinta y siete kilómetros más adelante. El sistema activó la ambulancia que estaba **1,5 km por detrás**, en el mismo sentido de la carrera.",
      leadBody2: "Un sistema que compara coordenadas habría mandado la moto, y la moto habría tardado toda la carrera en llegar. Quien ya pasó el punto paga además el precio de buscar dónde dar la vuelta y volver a contramano — y esa asimetría entra en la cuenta.",
      c2Title: "La ventana apertura↔cierre se mide, no se estima.",
      c2Tag: "medido",
      c2Body: "El sistema guarda a qué hora pasó el coche de apertura por cada punto del recorrido. Cuando el coche de cierre llega al km 42, la ventana es la diferencia entre dos horas observadas — la misma cuenta que un tiempo intermedio de cronometraje. Es el número que la organización acordó con la autoridad de tráfico: es el paso del cierre lo que devuelve la vía al tráfico. Cuando aún no hay historial suficiente, la pantalla escribe «proyectado» y dice el motivo. El director nunca tiene que adivinar cuál de los dos está leyendo.",
      c3Title: "Funciona sin cobertura.",
      c3Tag: "40 puntos",
      c3Body: "Nada se envía antes de grabarse en el dispositivo, y nada sale de la cola antes de que el servidor confirme la recepción. En una prueba de dos minutos sin cobertura, los 40 puntos acumulados llegaron completos, en orden y sin duplicar en cuanto volvió la señal.",
      c4Title: "La alerta no falla en silencio.",
      c4Tag: "cola local",
      c4Body: "La alerta se adelanta a cualquier ping de GPS y se reintenta hasta que el servidor confirma — una petición de auxilio nunca se descarta, aunque eso signifique una cola que no se vacía. Y el auxilio correcto se activa por categoría, sin que nadie tenga que elegir en plena urgencia: un accidente llama a la ambulancia, una avería llama al mecánico.",
      c5Title: "Cualquier móvil se convierte en el GPS del vehículo.",
      c5Tag: "6 caracteres",
      c5Body: "El conductor abre el enlace, teclea el código de 6 caracteres impreso en la hoja del briefing y su móvil pasa a ser el rastreador de ese vehículo. Ninguna aplicación que instalar, ningún equipo que comprar, cargar, repartir y recoger al final del día.",
      c6Title: "Seis idiomas, un único enlace.",
      c6Tag: "6 idiomas",
      c6Body: "El idioma no va en la URL — lo negocia el dispositivo. El mismo enlace y el mismo QR impreso entregan portugués al conductor brasileño, italiano al italiano y alemán al austriaco, sin que la dirección gestione nada. Un móvil configurado en pt-PT recibe portugués, no inglés.",
      summaryLabel: "En resumen",
      summary: "Seis decisiones, un efecto: la dirección deja de preguntar dónde está cada coche.",
    },

    how: {
      marker: "Cómo funciona",
      title: "Tres pasos antes de la salida.",
      titleStrong: "Ninguno durante.",
      step: "Paso {n}",
      s1Title: "Carga el recorrido.",
      s1Body: "El GPX de la carrera, o el trazado dibujado en pantalla. El recorrido se indexa una vez, y de él sale toda distancia medida después — la posición de cada vehículo, la ventana y la elección del auxilio.",
      s2Title: "Genera la hoja de códigos.",
      s2Body: "Un código de 6 caracteres por vehículo, con el papel de cada uno: apertura, cierre, escoba, ambulancia, mecánico, moto, comisario. La hoja sale lista para imprimir y entregar en el briefing.",
      s3Title: "Abre el panel el día de la carrera.",
      s3Body: "Cada conductor abre el enlace, teclea el código y aparece en el mapa en el idioma de su propio móvil. Durante la carrera no queda nada que configurar.",
    },

    screens: {
      marker: "Las dos pantallas",
      title: "Una sala de dirección.",
      titleStrong: "Un móvil por vehículo.",
      panelEyebrow: "Panel de la dirección",
      panelTitle: "Lo que ve la dirección",
      altHero: "Vista desde la moto de carrera en una carretera adoquinada mojada, dos ciclistas delante a contraluz con el sol bajo, y el arco rojo del último kilómetro cruzando por encima con la banderola colgada.",
      altPanel: "Panel de la dirección de carrera: mapa del recorrido con los vehículos de apoyo, ventana entre apertura y cierre marcada como medida, y la cola de alertas.",
      altApp: "App del conductor en el móvil: el rol del vehículo, la ventana medida entre apertura y cierre, el estado del envío y los botones de alerta.",
      zoom: "Ver más grande",
      altPave: "Carretera adoquinada serpenteando entre colinas al atardecer, con tres ciclistas separados por cientos de metros y un coche de apoyo en uno de los huecos: la carrera dejó de ser un pelotón.",
      panelCapture: "Captura · panel de la dirección",
      p1: "Mapa en directo con todos los vehículos, cada papel con su color y la antigüedad de su dato.",
      p2: "Ventana entre apertura y cierre, marcada como medida o proyectada.",
      p3: "Cola de alertas con el apoyo más cercano ya sugerido — y el porqué de la sugerencia por escrito.",
      p4: "Salud de conexión vehículo a vehículo: quién está en directo, quién se retrasó, quién desapareció.",
      appEyebrow: "App del conductor",
      appTitle: "Lo que ve el conductor",
      appCapture: "Captura · app del conductor",
      a1: "Entra con el código de 6 caracteres. Sin cuenta, sin tienda de aplicaciones.",
      a2: "Botones de alerta grandes, para mano con guante y coche en movimiento.",
      a3: "Sigue enviando con la pantalla apagada y acumula todo cuando cae la señal.",
      a4: "En el idioma del dispositivo, desde el mismo enlace que recibió todo el mundo.",
    },

    close: {
      marker: "Flamme rouge",
      title: "Dos puertas.",
      titleStrong: "Ninguna decisión en medio.",
      lead: "La dirección entra con una cuenta y monta la carrera. El conductor entra con el código y no tiene nada más que decidir.",
      aria: "Entrar en el sistema",
      directorTitle: "Soy de la dirección",
      directorBody: "Crear la carrera, cargar el recorrido, generar los códigos y seguir la operación en directo.",
      directorCta: "Abrir el panel →",
      driverTitle: "Soy conductor",
      driverBody: "Teclea el código de 6 caracteres que te dio la dirección y el móvil se convierte en el GPS de tu posición.",
      driverCta: "Entrar con código →",
    },

    contact: {
      eyebrow: "Contacto",
      title: "Habla con quien lo hizo.",
      body: "Cuéntanos qué carrera organizas y qué necesitas resolver. Responde la persona que escribió el sistema, en tu idioma.",
      name: "Tu nombre",
      email: "Correo",
      organization: "Organización",
      message: "Mensaje",
      messagePlaceholder: "Qué carrera organizas, cuántos vehículos de apoyo y cuándo es.",
      send: "Enviar",
      sending: "Enviando…",
      sentTitle: "Recibido.",
      sentBody: "Respondo a la dirección que dejaste, en el idioma en que escribiste.",
      orWrite: "O escribe directamente a",
      failed: "No se pudo enviar ahora. Tu mensaje sigue ahí: cópialo y mándalo a",
      tooMany: "Demasiados mensajes desde aquí en poco tiempo. Espera un poco, o escribe a",
      nameRequired: "Dime tu nombre: es como empezará la respuesta.",
      emailRequired: "Necesito un correo para responderte.",
      emailInvalid: "Ese correo no parece válido. Comprueba la @ o el dominio.",
      messageRequired: "Escribe lo que necesitas, aunque sea en una línea.",
      messageTooLong: "Mensaje demasiado largo (máximo 4000 caracteres).",
    },
    footer: {
      marker: "Vía reabierta",
      tagline: "Dirección de carrera en directo para ciclismo en carretera.",
      languages: "Seis idiomas, un único enlace",
      languagesNote: "La misma dirección y el mismo QR dan a cada dispositivo la interfaz en su idioma — sin que la dirección gestione nada.",
      enter: "Entrar",
      credits: "una herramienta",
    },

    meta: {
      title: "Flamme Rouge — dirección de carrera en directo para ciclismo en carretera",
      description: "La posición de cada vehículo de apoyo medida por carretera, la ventana entre apertura y cierre medida como un tiempo intermedio, y alertas que activan el auxilio correcto por categoría. El GPS es el móvil del conductor.",
      ogTitle: "Flamme Rouge — dirección de carrera en directo",
      ogDescription: "En una prueba real, una moto estaba a 0,05 km en línea recta y a 37,3 km por carretera de un accidente. El sistema activó la ambulancia que estaba 1,5 km por detrás.",
    },
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
