import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * Italiano. Terminologia della Federazione Ciclistica Italiana.
 *
 * `sweep_car` = AUTO FINE CORSA (chiude la corsa e riapre la strada).
 * `broom_wagon` = AUTO SCOPA (ultimo mezzo, raccoglie chi si ritira).
 * La finestra calcolata dal pannello è apripista ↔ fine corsa.
 */
export const it: Dictionary = {
  meta: {
    appName: "Flamme Rouge",
    tagline: "Direzione gara in tempo reale",
  },

  common: {
    save: "Salva",
    cancel: "Annulla",
    confirm: "Conferma",
    back: "Indietro",
    next: "Avanti",
    close: "Chiudi",
    edit: "Modifica",
    remove: "Rimuovi",
    add: "Aggiungi",
    retry: "Riprova",
    loading: "Caricamento…",
    saving: "Salvataggio…",
    search: "Cerca",
    none: "Nessuno",
    unknown: "Sconosciuto",
    optional: "facoltativo",
    required: "obbligatorio",
    yes: "Sì",
    no: "No",
    error: "Qualcosa è andato storto",
    errorRetry: "Operazione non riuscita. Riprova.",
    offline: "Nessuna connessione",
    online: "Connesso",
    language: "Lingua",
    logout: "Esci",
  },

  roles: {
    lead_car: { label: "Auto apripista", short: "Apripista" },
    sweep_car: { label: "Auto fine corsa", short: "Fine corsa" },
    broom_wagon: { label: "Auto scopa", short: "Scopa" },
    moto: { label: "Moto di supporto", short: "Moto" },
    ambulance: { label: "Ambulanza", short: "Ambulanza" },
    mechanic: { label: "Assistenza meccanica", short: "Meccanico" },
    support_car: { label: "Auto di supporto", short: "Supporto" },
    marshal: { label: "Commissario di percorso", short: "Commissario" },
    other: { label: "Altro", short: "Altro" },
  },

  signal: {
    live: "In diretta",
    delayed: "In ritardo",
    stale: "Non aggiornato",
    lost: "Nessun segnale",
    never: "Non collegato",
    lastSeen: "Ultima posizione {age}",
  },

  race: {
    status: {
      draft: "Bozza",
      armed: "Pronta",
      live: "In corso",
      finished: "Conclusa",
      archived: "Archiviata",
    },
    distance: "Distanza",
    elevation: "Dislivello",
    start: "Partenza",
    positions: "Mezzi di supporto",
    route: "Percorso",
    noStart: "Nessun orario di partenza",
    details: "Dati della gara",
    lapsTotal: "{laps} giri = {distance} di gara.",
    lap: "giro {lap}/{laps}",
    lapsCircuit: "circuito di {laps} giri",
    lapUnknown: "giro ?",

    form: {
      nameLabel: "Nome della gara",
      namePlaceholder: "Giro delle Langhe — 2ª tappa",
      nameRequired: "Dai un nome alla gara — è così che la riconosci nell'elenco.",
      nameTooLong: "Nome troppo lungo (massimo 200 caratteri).",
      locationLabel: "Località",
      locationHint: "Città o zona della partenza. Compare nell'elenco delle gare.",
      locationPlaceholder: "Alba, Piemonte",
      locationTooLong: "Località troppo lunga (massimo 200 caratteri).",
      dateLabel: "Data della partenza",
      dateRequired: "Indica anche la data della partenza.",
      timeLabel: "Orario della partenza",
      timeHint: "Ora locale del luogo di gara.",
      timeRequired: "Indica anche l'orario della partenza.",
      dateTimeInvalid: "Data o orario non validi. Controlla entrambi i campi.",
      timezoneLabel: "Fuso orario della gara",
      timezoneHint:
        "Tutto ciò che la direzione vede è convertito in questo fuso, anche sul telefono del conducente.",
      timezoneRequired: "Scegli il fuso orario del luogo di gara.",
      timezoneUnknown: "Fuso orario sconosciuto.",
      basemapInvalid: "Scegli una delle mappe disponibili.",
      lapsLabel: "Giri sul percorso",
      lapsHint:
        "1 per una gara in linea. Su circuito, la distanza di gara è il tracciato moltiplicato per i giri.",
      lapsRequired: "Indica il numero di giri.",
      lapsInteger: "Il numero di giri deve essere intero.",
      lapsMin: "La gara ha almeno 1 giro.",
      lapsMax: "Massimo 50 giri.",
      gapHint:
        "Quanti minuti la direzione vuole tra l'auto apripista e quella di fine corsa. Da qui il pannello decide se il gruppo si è allungato o compattato troppo.",
      targetLabel: "Finestra obiettivo (minuti)",
      targetRequired: "Indica la finestra obiettivo in minuti.",
      targetInteger: "La finestra obiettivo deve essere un numero intero di minuti.",
      targetMin: "La finestra obiettivo deve essere di almeno 1 minuto.",
      targetMax: "La finestra obiettivo non può superare i 600 minuti (10 ore).",
      minLabel: "Avvisa sotto (minuti)",
      minHint: "Gruppo troppo compatto.",
      minInteger: "Il limite minimo deve essere un numero intero di minuti.",
      minNegative: "Il limite minimo non può essere negativo.",
      minMax: "Il limite minimo non può superare i 600 minuti.",
      minAboveTarget:
        "Il minimo non può essere maggiore della finestra obiettivo ({target} min).",
      maxLabel: "Avvisa sopra (minuti)",
      maxHint: "Gruppo troppo allungato.",
      maxInteger: "Il limite massimo deve essere un numero intero di minuti.",
      maxMin: "Il limite massimo deve essere di almeno 1 minuto.",
      maxMax: "Il limite massimo non può superare i 600 minuti.",
      maxBelowMin: "Il limite massimo deve essere maggiore del minimo ({min} min).",
      maxBelowTarget:
        "Il massimo non può essere minore della finestra obiettivo ({target} min).",
      showLimits: "Imposta i limiti di allerta",
      saved: "Dati della gara aggiornati",
      afterSave: "Dopo il salvataggio si passa direttamente al percorso.",
    },
  },

  gap: {
    title: "Finestra apripista ↔ fine corsa",
    short: "Finestra",
    targetLabel: "Finestra obiettivo",
    target: "Obiettivo: {duration}",
    measured:
      "Misurata dalla differenza di orario di passaggio dei due mezzi nello stesso punto.",
    projected:
      "Stimata: {distance} su strada, alla velocità media attuale del fine corsa ({speed}).",
    noLead: "Auto apripista senza posizione. Collega il suo dispositivo.",
    noSweep: "Auto fine corsa senza posizione. Collega il suo dispositivo.",
    noBoth: "In attesa della posizione dei due mezzi di riferimento.",
    sweepAhead:
      "L'auto fine corsa è davanti all'apripista. Verifica che i ruoli non siano invertiti.",
    sweepStopped:
      "Distanza su strada: {distance}. Auto fine corsa ferma — tempo indefinito.",
    noHistory:
      "Distanza su strada: {distance}. Storico insufficiente per convertirla in tempo.",
    stale: "Dato di {age} — potrebbe non riflettere la posizione attuale.",
    overTarget: "Oltre la finestra obiettivo",
    underTarget: "Sotto la finestra obiettivo",

    timeSeparation: "separazione nel tempo",
    alongRoad: "su strada",
    methodMeasured: "Misurata",
    methodProjected: "Stimata",
    methodNone: "Nessun dato",
    withinTarget: "Nella finestra",
    overTargetDetail: "troppo allungata",
    underTargetDetail: "troppo compatta",
    comparisonSuspended:
      "Confronto con la finestra obiettivo sospeso finché il dato non è affidabile",
    noLimits: "Nessun limite definito per questa gara",
    clockSuspect:
      "L'orologio di uno dei dispositivi di riferimento non è allineato con il server. Finché dura, l'età del dato e la misura non sono affidabili — conferma la posizione via radio.",
    lapsUncertain:
      "Gara su circuito di {laps} giri: lo storico caricato non arriva alla partenza, quindi il conteggio dei giri può essere sottostimato e la finestra più ampia di quanto appare.",
    onTarget: "Finestra {gap}, concordata {target}. Nulla da correggere.",
    verdictAhead: "Finestra {gap}, concordata {target} — in anticipo di {drift}.",
    verdictBehind: "Finestra {gap}, concordata {target} — in ritardo di {drift}.",
    remedyAhead: "Rallenta l'auto fine corsa.",
    remedyBehind: "Accelera l'auto fine corsa.",
    costAhead:
      "La strada riapre prima del previsto e chi è rimasto indietro perde la protezione troppo presto.",
    costBehind:
      "La chiusura della strada sta superando il tempo autorizzato dall'autorità di traffico.",
  },

  alerts: {
    title: "Allerte",
    none: "Nessuna allerta attiva",
    raise: "Lancia allerta",
    categories: {
      medical: { label: "Incidente / ambulanza", short: "Incidente" },
      mechanical: { label: "Problema meccanico", short: "Meccanico" },
      other: { label: "Altro", short: "Altro" },
    },
    status: {
      open: "Aperta",
      acknowledged: "Presa in carico",
      dispatched: "Supporto inviato",
      en_route: "In arrivo",
      on_scene: "Sul posto",
      resolved: "Risolta",
      cancelled: "Annullata",
    },
    priority: {
      critical: "Critica",
      high: "Alta",
      normal: "Normale",
    },
    confirmMedical: "Conferma chiamata di emergenza",
    confirmMedicalBody:
      "Invia immediatamente l'ambulanza più vicina e segnala il punto sulla mappa di tutta la squadra.",
    sending: "Invio in corso…",
    queued: "In coda — nessun segnale. Continuerà a provare.",
    delivered: "Ricevuta dalla direzione",
    failed: "Invio non riuscito — nuovo tentativo",
    at: "al km {km}",
    raisedBy: "Lanciata da {position}",
    noteLabel: "Descrizione (facoltativa)",
    notePlaceholder: "Cosa è successo?",

    storageFailedTitle: "ALLERTA NON SALVATA SU QUESTO DISPOSITIVO — USA SUBITO LA RADIO.",
    storageFailedBody:
      "L'archivio locale ha rifiutato la scrittura ({reason}). Nulla verrà reinviato automaticamente.",
    retryCount: "{count} tentativo/i senza esito. Avvisa via radio.",
    unknownFailure: "errore sconosciuto",
    nobodyDispatched: "Nessuno è stato inviato per questa allerta.",

    why: {
      target: "{position}",
      eta: "~{minutes} min",
      uncertainAnchor: "POSIZIONE INCERTA: l'ancoraggio sul percorso è stato scelto per spareggio — conferma via radio prima di fidarti di questa distanza",
      ahead: "{distance} davanti all'allarme (deve tornare indietro)",
      behind: "{distance} dietro l'allarme, nel senso di gara",
      straightOnly: "{distance} in linea d'aria — nessuna posizione sul percorso, la distanza su strada è maggiore",
      speedMeasured: "velocità media misurata {speed} km/h",
      speedNominal: "tempo stimato su velocità nominale ({speed} km/h): nessuno spostamento recente misurato",
      lastSeen: "ultima posizione {seconds} s fa",
      offSpecialty: "{role} non è la specialità per {category} — suggerito per prossimità",
      noOrigin: "Nessuna posizione di origine dell'allarme: nessun suggerimento calcolabile.",
      noneSuggested: "Nessuna assistenza suggerita.",
      noneDispatchable: "Nessun veicolo attivabile registrato in questa gara.",
      count: "{count} suggerimento/i per {category}.",
      uncertainCount: "{count} candidato/i con ancoraggio ambiguo — distanza non affidabile.",
      ignoredBusy: "{count} già attivato/i per un altro allarme.",
      ignoredNoSignal: "{count} ignorato/i per segnale perso.",
      ignoredRole: "{count} non attivabile/i.",
      escalated: "ESCALATION: nessun veicolo della specialità disponibile; attivato {role}.",
      allStraight: "Tutti in linea d'aria: nessuna posizione sul percorso da confrontare.",
      takenMeanwhile: "Tutti i candidati sono stati presi da altri allarmi durante l'attivazione.",
      manual: "{position} — attivato a mano dalla direzione.",
    },
    dispatch: {
      youWereCalled: "Sei stato chiamato",
      calling: "Invio {position}",
      called: "{position} inviata",
      reason: "{position}, {distance} {direction} lungo il percorso, ~{eta}",
      ahead: "davanti",
      behind: "dietro",
      onMyWay: "Sto arrivando",
      cantGo: "Non posso",
      arrived: "Sono sul posto",
      enRoute: "{position} sta arrivando",
      onScene: "{position} è sul posto",
      declined: "{position} non ha potuto intervenire",
      reassigning: "Invio del prossimo mezzo disponibile…",
      noneAvailable:
        "Nessun mezzo disponibile per questa categoria. La direzione deve intervenire manualmente.",
      declineReason: "Motivo (facoltativo)",
      reassign: "Cambia mezzo",
      dispatch: "Invia un mezzo",
      auto: "automatico",
      fallbackNoPosition:
        "Nessun suggerimento calcolato e nessuna posizione sul percorso — ordine arbitrario. Conferma via radio.",
      fallbackReason:
        "Nessun suggerimento calcolato. {distance} di differenza sul percorso, senza calcolo di inversione né di tempo stimato.",
    },

    proximity: {
      ahead: "{category} {distance} davanti",
      passing: "Stai passando dal punto dell'allerta",
      dismiss: "Ho capito",
    },

    confirm: {
      prompt: "Sei passato dal punto. Il problema c'è ancora?",
      still_there: "C'è ancora",
      cleared: "È già libero",
      not_found: "Non ho visto nulla",
      thanks: "Grazie — la direzione è stata informata.",
      countStillThere: "{count} confermano",
      countCleared: "{count} dicono che è libero",
    },

    actions: {
      acknowledge: "Prendi in carico",
      resolve: "Risolvi",
      cancel: "Annulla allerta",
      confirmCancel: "confermi? (falso allarme)",
      resolutionNote: "Cosa è stato fatto",
    },
  },

  driver: {
    bindTitle: "Inserisci il codice del tuo mezzo",
    bindSubtitle:
      "La direzione gara ha fornito un codice di 6 caratteri. Collega questo telefono al tuo ruolo in gara.",
    bindPlaceholder: "ABC-123",
    bindAction: "Collega",
    bindInvalid: "Codice non valido. Controlla i 6 caratteri e riprova.",
    bindNotFound: "Codice inesistente o scaduto. Contatta la direzione.",
    bindTooManyAttempts: "Troppi tentativi. Attendi un momento prima di riprovare.",
    bindPasteHint:
      "Puoi incollare. Le lettere O e I vengono lette come 0 e 1 — il codice non usa queste lettere.",
    boundAs: "Sei {position} in {race}",
    unbind: "Scollega questo dispositivo",
    unbindConfirm:
      "Scollegando, questo telefono smette di trasmettere la posizione del mezzo. Confermi?",
    revoked:
      "Questo dispositivo è stato scollegato dalla direzione. Richiedi un nuovo codice.",

    gpsPermissionTitle: "Serve la tua posizione",
    gpsPermissionBody:
      "L'app usa il GPS per mostrare il tuo mezzo sulla mappa della direzione. Senza, la tua posizione non è visibile a nessuno.",
    gpsDenied:
      "Permesso di localizzazione negato. Abilitalo nelle impostazioni del browser e ricarica.",
    gpsUnavailable: "GPS non disponibile su questo dispositivo.",
    gpsSearching: "Ricerca del segnale GPS…",
    gpsNoApi:
      "Questo browser non fornisce la localizzazione. Usa Chrome o Safari da telefono.",
    gpsNoFix:
      "Nessun segnale GPS. In galleria o in garage è normale; la rilevazione riprende da sola.",
    gpsTimeout: "Il GPS tarda a rispondere. Si continua a provare.",
    gpsFailed: "Impossibile ottenere la posizione. La rilevazione continua a provare.",
    gpsDeniedIOS:
      "Localizzazione bloccata. Su iPhone: Impostazioni → Safari → Posizione → Chiedi, poi ricarica questa pagina. Se usi l'app Chrome: Impostazioni → Chrome → Posizione.",
    gpsDeniedAndroid:
      "Localizzazione bloccata. Su Android: tocca il lucchetto accanto all'indirizzo → Autorizzazioni → Posizione → Consenti, poi ricarica la pagina.",
    gpsDeniedBrowser:
      "Localizzazione bloccata dal browser. Consenti l'accesso alla posizione nelle autorizzazioni del sito e ricarica la pagina.",

    gapWarning: "Sei rimasto {age} senza trasmettere.",
    gapWarningBody:
      "La direzione non ha visto la tua posizione in quel periodo. Tieni questa schermata in primo piano e il telefono sotto carica.",
    tapToDismiss: "tocca per chiudere",
    alertNotSaved: "ALLARME NON SALVATO SU QUESTO TELEFONO — USA LA RADIO ORA.",
    alertNotSavedDetail:
      "L'archiviazione locale ha rifiutato la scrittura ({reason}). Niente verrà reinviato da solo.",
    alertAttempts: "{count} tentativo/i senza successo. Avvisa via radio.",
    api: {
      badJson: "Il corpo della richiesta non è JSON valido.",
      pingsNotArray: "Il campo pings deve essere un array.",
      bodyTooLarge: "Corpo di {bytes} byte oltre il limite di {limit}.",
      bodyOverLimit: "Corpo oltre il limite di {limit} byte.",
      noBody: "Richiesta senza corpo.",
      bodyReadFailed: "Impossibile leggere il corpo della richiesta.",
      bodyNotObject: "Il corpo della richiesta deve essere un oggetto JSON.",
      batchTooLarge: "Un lotto di {count} ping supera il massimo di {max}. Dividi l'invio.",
      alertSaveFailed: "Impossibile registrare l'allarme. Tienilo in coda e avvisa via radio.",
      confirmKindInvalid: "Tipo di conferma non valido: {kind}.",
      alertNotFound: "Allarme non trovato in questa gara.",
      confirmFailed: "Impossibile registrare la conferma. Riprova.",
      actionInvalid: "Azione non valida: {action}.",
      bindRateLimited: "Troppi tentativi di seguito. Aspetta {minutes} min e verifica il codice con la direzione.",
      bindLookupFailed: "Impossibile verificare il codice. Riprova.",
      bindRaceFailed: "Impossibile caricare la gara di questo codice.",
      bindFailed: "Impossibile completare il collegamento. Riprova tra qualche secondo.",
      bindUnknownCode: "Codice non riconosciuto. Verifica i 6 caratteri con la direzione gara.",
      takenOver: "un altro dispositivo ha preso questa posizione",
      positionsFailed: "Impossibile caricare le posizioni della gara.",
      notBound: "Questo dispositivo non è collegato a nessuna posizione.",
      sessionCheckFailed: "Impossibile validare la sessione. Il dispositivo resta collegato; nuovo tentativo in corso.",
      sessionUnknown: "Il server non riconosce questo collegamento. Chiedi un codice nuovo alla direzione.",
      sessionRevokedWhy: "Collegamento chiuso dalla direzione: {reason}",
      sessionRevoked: "Questo collegamento è stato chiuso dalla direzione. Chiedi un codice nuovo.",
      positionGone: "La posizione collegata a questo dispositivo non esiste più.",
      pingBadId: "clientPingId non è un UUID valido.",
      pingNoCoord: "Coordinata assente o non numerica.",
      pingOutOfRange: "Coordinata fuori dall'intervallo geografico valido.",
      pingNullIsland: "Coordinata (0, 0) — lettura GPS non valida.",
      pingInaccurate: "Precisione di {accuracy} m sopra il limite di {limit} m.",
      pingBadDate: "recordedAt non è una data ISO 8601 valida.",
      pingFuture: "recordedAt è {minutes} min nel futuro — orologio del dispositivo fuori orario.",
    },
    transmitting: "Trasmissione attiva",
    paused: "In pausa",
    queuedPings: "{count} punti in coda",
    queuedAlerts: "{count} allerta/e non ancora consegnate. Avvisa via radio.",
    pingRejected: "POSIZIONE RIFIUTATA",
    pingRejectedDetail:
      "Il server ha rifiutato {count} posizione/i: la tua posizione NON compare sulla mappa della direzione.",
    queueNotDurable:
      "Archivio locale non disponibile: la coda va persa se l'app viene chiusa.",
    batteryWarning: "Batteria scarica — collega il caricabatterie.",
    keepAwake: "Schermo mantenuto acceso",
    keepScreenOpen:
      "Tieni questa schermata aperta durante la gara. La posizione viene inviata da sola, anche con segnale debole.",
  },

  director: {
    dashboard: "Pannello",
    myRaces: "Le mie gare",
    myRacesSubtitle:
      "Ogni gara ha il suo percorso, i suoi mezzi di supporto e i suoi codici.",
    newRace: "Nuova gara",
    newRaceSubtitle:
      "Solo l'essenziale per ora. Percorso e mezzi arrivano nei passi successivi e restano modificabili fino alla partenza.",
    createAndContinue: "Crea la gara e vai al percorso",
    noRaces: "Non hai ancora creato nessuna gara.",
    noRacesAction: "Crea la prima gara",
    setupChecklist: "Per mandare la gara in diretta",
    needsRoute: "Caricare il percorso",
    needsPositions: "Registrare i mezzi di supporto",
    needsLead: "Definire l'auto apripista",
    needsSweep: "Definire l'auto fine corsa",
    needsBinding: "{count} mezzo/i senza dispositivo collegato",
    ready: "Tutto pronto",
    goLive: "Avvia gara",
    finish: "Concludi gara",

    areaOverline: "Area direzione gara",
    filterAll: "Tutte",
    filterReady: "Pronte",
    filterPreparing: "In preparazione",
    filterFinished: "Concluse",
    noneInFilter: "Nessuna gara in questo stato.",
    openRace: "Apri",
    openRecord: "Resoconto",
    supportShort: "Assistenza",
    listErrorBody:
      "Ricarica la pagina. Se continua, esci e rientra: la sessione potrebbe essere scaduta.",
    steps: "Fasi della gara",
    overview: "Riepilogo",
    live: "In diretta",
    resolveItem: "Risolvi",
    pendingCount: "{count} punto/i in sospeso",
    readOnly: "Sola lettura",
    readOnlyRoute:
      "Partecipi a questa gara come osservatore e non puoi modificare il percorso.",
    markReady: "Segna la gara come pronta",
    marking: "Salvataggio…",
    backToDraft: "Torna a bozza",
    reverting: "Ripristino…",
    resolveBlockingFirst: "Risolvi prima i punti obbligatori.",

    checklist: {
      routeLabel: "Percorso caricato",
      routeHint:
        "Carica il GPX della gara o disegna il tracciato sulla mappa. Senza percorso non c'è calcolo di chilometraggio né di finestra.",
      positionsLabel: "Mezzi di supporto registrati",
      positionsHint:
        "Registra i mezzi di supporto. Ognuno riceve un codice che il conducente digita sul telefono.",
      leadLabel: "Riferimento apripista definito",
      leadHint:
        "Indica quale mezzo è l'auto apripista. È l'inizio della finestra che la direzione controlla.",
      sweepLabel: "Riferimento fine corsa definito",
      sweepHint:
        "Indica quale mezzo è l'auto fine corsa. È il suo passaggio che riapre la strada e chiude la finestra.",
      startLabel: "Orario di partenza",
      startHint:
        "Facoltativo, ma è ciò che fa mostrare al pannello il conto alla rovescia invece del solo orologio.",
    },

    empty: {
      intro:
        "Una gara è pronta per andare in diretta quando ha percorso, mezzi di supporto e i riferimenti apripista e fine corsa impostati. Sono tre passi:",
      step1Title: "Registra la gara",
      step1Body:
        "Nome, località, partenza e la finestra obiettivo tra l'auto apripista e quella di fine corsa. Un minuto.",
      step2Title: "Carica il percorso",
      step2Body:
        "Carica il GPX che hai già, oppure disegna il tracciato sulla mappa. È ciò che trasforma una posizione GPS in un chilometro di gara.",
      step3Title: "Registra i mezzi e stampa i codici",
      step3Body:
        "Ogni moto, ambulanza e auto di supporto riceve un codice di 6 caratteri. Il conducente lo digita sul suo telefono e basta — senza installare nulla, senza creare un account.",
    },
  },

  route: {
    uploadTitle: "Carica il percorso",
    uploadSubtitle: "Invia il file GPX della gara.",
    uploadAction: "Scegli file GPX",
    uploadDrop: "Trascina qui il file",
    uploadHint:
      "Oppure clicca per scegliere. Va bene ciò che esce da Strava, Garmin Connect, RideWithGPS, Komoot o dal software di tracciamento della gara.",
    uploadReading: "I file grandi richiedono qualche secondo.",
    drawInstead: "Oppure disegna il percorso sulla mappa",
    drawTitle: "Disegna il percorso",
    drawHint: "Clicca sulla mappa per aggiungere punti. Trascina per correggere.",
    drawShortcuts:
      "Canc elimina il vertice selezionato (oppure clicca con il tasto destro). Ctrl+Z annulla.",
    undo: "Annulla",
    clear: "Cancella",
    chooseSegment: "Il file contiene più percorsi. Scegli quello della gara:",
    chooseSegmentHint:
      "Il file contiene {count} tracciati. Unirli tutti creerebbe un salto in mezzo alla gara, quindi scegline uno.",
    segmentName: "Tracciato {number}",
    kindTrack: "traccia registrata",
    kindRoute: "rotta pianificata",
    kindWaypoints: "waypoint sciolti",
    replaceWarning:
      "Sostituire il percorso ricalcola tutte le posizioni in gara. Fallo prima della partenza.",
    parseError: "Impossibile leggere il file",
    noGpx: "Nessun GPX",
    pointCount: "{count} punti",
    current: "Percorso attuale",
    replace: "Sostituisci percorso",

    purpose:
      "È il tracciato che trasforma la coordinata GPS di ogni mezzo in “chilometro 42 della gara”. Senza, non c'è calcolo della finestra tra apripista e fine corsa, né suggerimento del mezzo più vicino su strada.",
    missingExplain:
      "Nessun percorso. Senza, il sistema non può dire a che chilometro si trova ogni mezzo, né calcolare la finestra.",
    sourceGpx: "Importato da {filename}",
    sourceDrawn: "Disegnato sulla mappa",
    geometryPoints: "Punti di geometria",
    reviewTitle: "Controllo prima di salvare",
    warningsTitle: "{count} punto/i di attenzione in questo file",
    confirmUse: "Conferma e usa questo percorso",
    chooseAnotherFile: "Scegli un altro file",
    noFileYet: "Non hai ancora il file del percorso?",
    vertices: "Vertici",
    saveDrawn: "Salva percorso",
    deleteVertex: "Elimina vertice",
    closeLoop: "Chiudi il circuito",
    tooManyVertices:
      "{count} vertici sono più di quanti dovrebbe averne un tracciato disegnato a mano (limite {limit}). Se il percorso è davvero lungo, importa un GPX.",
    oneVertex:
      "Un solo vertice non è un percorso. Clicca sulla mappa per segnare dove passa la gara.",
    savedTitle: "Percorso salvato",
    savedReplaced: "il percorso precedente è stato disattivato.",
    saveErrorTitle: "Salvataggio non riuscito",
    saveFailed:
      "Impossibile salvare il percorso. Verifica la connessione e riprova.",
    saveConnectionLost:
      "La connessione è caduta durante l'invio. Il percorso precedente resta valido — riprova.",
    fileUnreadable:
      "Impossibile leggere il file dal disco. Copialo in un'altra cartella e riprova.",
    fileNotGpx:
      "Impossibile interpretare questo file. Verifica che sia un .gpx e che si apra in un altro programma.",

    segmentMissing: "Il tracciato scelto non esiste nel file.",
    segmentTooManyPoints: "Questo tracciato ha {count} punti, oltre il limite di {limit}. Ritaglia il file sul tratto di gara.",
    pointsMissing: "L'elenco dei punti del percorso non è arrivato.",
    pointsTooMany: "Il percorso ha {count} punti, oltre il limite di {limit}. Ritaglia il file sul tratto di gara prima di inviarlo.",
    pointMalformed: "Il punto {index} è malformato.",
    pointBadLat: "Il punto {index} ha una latitudine non valida ({value}).",
    pointBadLng: "Il punto {index} ha una longitudine non valida ({value}).",
    etaUnknown: "tempo stimato non disponibile",
    uploadTooLarge:
      "Il percorso inviato è troppo grande. Ritaglia il file al tratto di gara.",
    uploadBadBody: "Corpo della richiesta illeggibile.",
    uploadBadSource: "Origine del percorso sconosciuta.",
    uploadBadPoints: "Punti del percorso non validi.",
    uploadTooManyVertices:
      "Un percorso disegnato a mano non dovrebbe avere più di {limit} vertici.",
    uploadBuildFailed: "Impossibile costruire il percorso con questi punti.",
    uploadReleaseFailed:
      "Impossibile liberare il percorso precedente. Ricarica la pagina e riprova.",
    uploadInsertFailed:
      "Impossibile salvare il percorso. Il percorso precedente resta valido.",
  },

  positions: {
    title: "Mezzi di supporto",
    intro:
      "Ogni mezzo di supporto della gara diventa una posizione con un codice proprio. Il conducente digita il codice sul suo telefono — senza installare app, senza creare account — e da quel momento il dispositivo trasmette la posizione di quel mezzo.",
    add: "Aggiungi mezzo",
    addBulk: "Aggiungi più mezzi",
    addHint:
      "Ogni posizione nasce con un codice di collegamento unico e un nome che puoi cambiare dopo. La prima auto apripista e la prima auto fine corsa entrano già segnate come riferimento.",
    quantity: "Quantità",
    label: "Identificativo",
    role: "Ruolo",
    driverName: "Conducente",
    driverPhone: "Telefono",
    driverPhoneHint: "Con il prefisso internazionale se è straniero.",
    noDriver: "Conducente non indicato",
    plate: "Targa",
    referenceLead: "È l'auto apripista ufficiale",
    referenceSweep: "È l'auto fine corsa ufficiale",
    markLead: "Segna come apripista",
    markSweep: "Segna come fine corsa",
    dispatchable: "Può essere inviato in caso di allerta",
    code: "Codice di collegamento",
    codeRevoked: "revocato — generane un altro",
    codeExpired: "scaduto — generane un altro",
    codeHidden: "Solo chi modifica la gara vede i codici.",
    copyCode: "Copia codice",
    copied: "copiato",
    regenerateCode: "Genera nuovo codice",
    regenerateWarning:
      "Il codice attuale smette di funzionare. Se il conducente è già collegato, continua a trasmettere finché non viene scollegato.",
    moveUp: "Sposta su {position}",
    moveDown: "Sposta giù {position}",
    dragHandle: "Trascina {position} per riordinare",
    confirmRemove: "Rimuovere davvero?",
    orderHint: "l'ordine dell'elenco è l'ordine in cui compaiono nel pannello in diretta.",
    emptyTitle: "Nessun mezzo registrato",
    emptyBody:
      "Una posizione è un ruolo in gara (“Moto 3”, “Ambulanza 1”), non un dispositivo. Il telefono si collega dopo, con il codice — e può essere cambiato durante la gara se la batteria si scarica, senza perdere lo storico.",
    emptyStart:
      "Comincia dall'auto apripista e da quella di fine corsa: sono loro a definire la finestra che la direzione controlla.",
    missingRefsTitle: "Mancano i riferimenti della finestra",
    missingRefsBody:
      "Senza entrambi, il pannello non può calcolare il tempo tra la testa e la coda del gruppo.",
    bound: "Collegato",
    notBound: "In attesa di collegamento",
    revokeSession: "Scollega dispositivo",

    print: "Stampa codici",
    printTitle: "Codici di collegamento — {race}",
    printHint:
      "Consegna ogni codice al conducente del mezzo corrispondente prima della partenza.",
    printLost:
      "Se un foglio si perde, generane un altro nella schermata dei mezzi: il vecchio smette di valere all'istante.",
    printInstruction:
      "Ogni conducente apre {url} sul telefono e digita il codice del suo riquadro.",
    printUrlMissing: "(indirizzo dell'app)",
    printNoUrlTitle: "Indirizzo dell'app non configurato",
    printNoUrlBody:
      "La variabile {variable} è vuota, quindi il foglio esce senza l'indirizzo che il conducente deve aprire. Scrivi l'indirizzo a mano prima di distribuirlo.",
    printMissing:
      "{count} posizione/i senza codice valido sono rimaste fuori da questo foglio. Genera un nuovo codice nella schermata dei mezzi.",
    printExpired:
      "{count} codice/i di questo foglio sono scaduti e non collegano più alcun telefono. Genera codici nuovi prima di stampare.",
    printNothingTitle: "Niente da stampare",
    printNothingBody: "Registra prima i mezzi di supporto.",
    printFooter:
      "il codice vale solo per questa gara e solo per questo mezzo. Collegare un nuovo telefono scollega il precedente.",

    form: {
      invalidData: "Dati non validi.",
      roleInvalid: "Scegli un ruolo valido.",
      quantityInteger: "La quantità deve essere un numero intero.",
      quantityMin: "Aggiungi almeno 1 mezzo.",
      quantityMax: "Aggiungi al massimo 40 mezzi per volta.",
      labelRequired:
        "Il mezzo ha bisogno di un nome — è quello che la direzione chiama via radio.",
      labelTooLong: "Nome troppo lungo (massimo 60 caratteri).",
      driverNameTooLong: "Nome del conducente troppo lungo (massimo 120 caratteri).",
      phoneTooLong: "Telefono troppo lungo.",
      phoneInvalid:
        "Telefono non valido. Usa solo numeri, con il prefisso internazionale se è straniero.",
      plateTooLong: "Targa troppo lunga.",
      notFound: "Mezzo non trovato. Ricarica la pagina.",
      referenceCleared:
        "Attenzione: la gara è ora senza riferimento {reference} — impostane uno prima della partenza.",
      codeGenerationFailed:
        "Impossibile generare codici unici adesso. Riprova tra qualche secondo.",
      codeIssueUnavailable: "Impossibile emettere un nuovo codice su questo server.",
      codeNoneFree:
        "Impossibile estrarre un codice libero. Riprova tra qualche secondo.",
      codeRevokedMeanwhile:
        "Il codice precedente è già stato revocato — questo mezzo resta senza codice finché non riprovi.",
    },
  },

  map: {
    fitRoute: "Inquadra percorso",
    followMe: "Segui il mio mezzo",
    vehicles: "Mezzi",
    showAll: "Mostra tutti",
    noWebGL:
      "Questo browser non supporta WebGL. I dati di posizione restano corretti negli elenchi.",
    basemapLabel: "Mappa di base",
    basemapHint:
      "Vale solo per questa gara. Il tracciato cambia colore di conseguenza, per non sparire sullo sfondo scelto.",
    basemapAsphalt: "Asfalto",
    basemapAsphaltHint:
      "Tracciato pulito, senza rilievo. È quello che ruba meno attenzione ai veicoli: la scelta giusta per una gara cittadina e per lo schermo proiettato in direzione.",
    basemapTopo: "Topografica",
    basemapTopoHint:
      "Curve di livello, pendenza e strade secondarie. È l'unico sfondo che mostra la salita prima che arrivi: in una gara di montagna cambia il discorso alla radio.",
    basemapSatellite: "Satellite",
    basemapSatelliteHint:
      "Immagine aerea. Serve a verificare che la strada del GPX sia davvero quella di gara e a riconoscere un punto di appoggio da ciò che c'è sul terreno.",
    slowTitle: "La mappa non ha finito di caricare.",
    slowBody:
      "Può essere una scheda in secondo piano, WebGL non disponibile o le tessere della mappa bloccate dalla rete. I chilometri, la finestra e l'elenco dei mezzi qui accanto restano corretti.",
  },

  live: {
    warnStates: "Impossibile leggere le posizioni in tempo reale dei veicoli.",
    warnSessions: "Impossibile leggere i collegamenti dei dispositivi.",
    warnAlerts: "Impossibile leggere gli allarmi: {detail}",
    warnPositions: "Impossibile leggere le posizioni: {detail}",
    warnGeometry: "Geometria del percorso non disponibile: {detail} Il tratto occupato non sarà disegnato.",
    snapshotErrorTitle: "Impossibile costruire il pannello in diretta",
    snapshotErrorBody:
      "La gara esiste, ma lo stato in diretta non è stato letto. Ricarica la pagina; se persiste, controlla la connessione al database.",
    noRoute:
      "Questa gara non ha un percorso attivo. Senza, non c'è mappa, non c'è chilometraggio e non c'è finestra apripista ↔ fine corsa.",
    clockNote: "Tempi sull'orologio del server · fuso della gara ({timezone})",
    unacknowledged: "{count} allerta/e non prese in carico.",
    moreUnacknowledged: "+{count} non prese in carico",
    viewOnMap: "vedi sulla mappa",

    sortByRace: "Posizione in gara",
    sortByOrdinal: "Registrazione",
    noSignalGroup: "Nessun segnale ({count}) — la posizione sulla mappa è un ricordo",
    noPositions: "Nessun mezzo registrato in questa gara.",
    offRoute: "fuori percorso",
    clockOff: "orologio non allineato",
    fromTrack: "{distance} dal tracciato",

    panelOk: "Pannello in diretta",
    panelDegraded: "Pannello degradato",
    panelDown: "PANNELLO SENZA CONNESSIONE",
    reconciled: "riconciliato {age}",
    realtime: "tempo reale: {state}",
    realtimeOn: "attivo",
    realtimeConnecting: "connessione…",
    realtimeOff: "caduto",
    notPresent:
      "Quello che vedi non è il presente. Conferma tutto via radio.",
    pollingOnly: "nessun aggiornamento istantaneo; riconciliazione ogni {interval}",
    refreshNow: "aggiorna ora",
    refreshing: "aggiornamento…",
    soundOff: "audio disattivato — attiva",
    soundOn: "Avviso sonoro attivo",

    showClosed: "{count} chiuse",
    hideClosed: "nascondi chiuse",
    showAllVehicles: "vedi tutti i mezzi",
    showFewer: "vedi meno",
    history: "storico",
    hideHistory: "nascondi storico",
    loadingHistory: "Caricamento storico…",
    noEvents: "Nessun evento registrato.",

    startedAt: "partenza alle {time}",
    finishedAt: "conclusa alle {time}",
    confirmStart: "conferma partenza",
    confirmFinish: "conferma chiusura",
  },

  auth: {
    gateTitle: "Prepara la gara prima.",
    gateTitleStrong: "Il giorno della gara, segui e basta.",
    gateCodes: "Codici di collegamento",
    loginTitle: "Pannello della direzione",
    loginSubtitle: "Accedi per preparare la gara: percorso, posizioni di assistenza e codici di collegamento.",
    signupSubtitle: "L'account è tuo, e le gare che crei le vedi solo tu. Gli autisti non hanno bisogno di un account: entrano con il codice di 6 caratteri.",
    metaLogin: "Accedi — Flamme Rouge",
    metaSignup: "Crea account — Flamme Rouge",
    errorTitle: "Non è stato possibile continuare",
    noticeTitle: "Ci siamo quasi",
    name: "Il tuo nome",
    nameHint: "Compare per la squadra della gara.",
    namePlaceholder: "Marina Ferrero",
    nameRequired:
      "Indica il tuo nome — è quello che compare per la squadra della gara.",
    nameTooLong: "Nome troppo lungo (massimo 80 caratteri).",
    email: "E-mail",
    emailPlaceholder: "direzione@tuagara.it",
    emailRequired: "Indica l'e-mail.",
    emailInvalid: "Questa e-mail non sembra valida. Controlla la @ o il dominio.",
    password: "Password",
    passwordHint: "Minimo 8 caratteri.",
    passwordRequired: "Indica la password.",
    passwordTooShort: "La password deve avere almeno 8 caratteri.",
    passwordTooLong: "La password può avere al massimo 72 caratteri.",
    passwordRepeat: "Ripeti la password",
    passwordMismatch: "Le due password non coincidono. Digitale di nuovo.",
    submitting: "Attendi…",
    signIn: "Entra nel pannello",
    signUp: "Crea account",
    haveAccount: "Hai già un account?",
    signInLink: "Entra",
    firstTime: "Prima volta?",
    signUpLink: "Crea un account di direzione",

    confirmSent:
      "Account creato. Abbiamo inviato un'e-mail di conferma a {email}. Conferma e torna qui per entrare (controlla anche la posta indesiderata).",
    invalidCredentials:
      "E-mail o password errati. Se ti sei appena registrato, conferma l'e-mail prima di entrare.",
    emailNotConfirmed:
      "Questa e-mail non è ancora confermata. Apri il messaggio che ti abbiamo inviato e clicca sul link (controlla la posta indesiderata).",
    userExists:
      "Esiste già un account con questa e-mail. Vai alla schermata di accesso; se hai dimenticato la password, chiedi la reimpostazione tramite Supabase.",
    emailRejected:
      "Il server ha rifiutato questo indirizzo e-mail. Usa un'e-mail reale che puoi aprire adesso — la conferma arriva lì.",
    weakPassword:
      "Password troppo debole per il server. Usa almeno 8 caratteri, mescolando lettere e numeri.",
    rateLimited:
      "Troppi tentativi in poco tempo. Attendi qualche minuto prima di riprovare.",
    signupDisabled:
      "La registrazione è disattivata su questo server. Chiedi a qualcuno della squadra di creare il tuo account.",
    genericFailure:
      "Operazione non riuscita adesso. Controlla la connessione e riprova.",
  },

  landing: {
    skip: "Vai al contenuto",

    nav: {
      problem: "Il problema",
      measures: "Ciò che misura la strada",
      screens: "Le due schermate",
      aria: "Sezioni della pagina",
      home: "Flamme Rouge, home",
      markerStart: "KM 000 — PARTENZA",
    },

    hero: {
      title: "Direzione gara in tempo reale,",
      titleStrong: "misurata sulla strada.",
      lead: "Ogni veicolo di assistenza sul percorso in tempo reale. Il divario tra apripista e auto fine corsa misurato come un intermedio di cronometraggio, non stimato. E i soccorsi scelti in base alla distanza che l'auto percorrerà davvero.",
      ctaPanel: "Apri la direzione gara",
      ctaDriver: "Sono un autista, ho un codice",
      note: "La flamme rouge segna l'ultimo chilometro. Qui segna il numero che serve alla direzione: quanto manca, misurato, non stimato.",
      scroll: "Scorri",
    },

    numbers: {
      aria: "Numeri misurati nei test",
      unitKm: "km",
      unitPoints: "punti",
      unitChars: "caratteri",
      roadLabel: "Sulla strada",
      roadBody: "Separavano la moto dall'incidente che sembrava avere davanti. In linea d'aria erano 50 metri. Il sistema ha mandato l'ambulanza che era 1,5 km indietro.",
      offlineLabel: "Senza segnale",
      offlineBody: "Accumulati in due minuti senza copertura, sono arrivati tutti, in ordine e senza duplicati appena il segnale è tornato.",
      codeLabel: "Per entrare",
      codeBody: "È tutto ciò che l'autista digita. Nessun account, nessuna app, nessun dispositivo da comprare e ritirare.",
    },

    problem: {
      marker: "Cosa succede oggi",
      title: "La gara si fa via radio.",
      titleStrong: "E la radio non prende a fondovalle.",
      lead: "Nulla di tutto questo è colpa di chi organizza. È ciò che resta quando l'unica fonte di posizione è qualcuno che dice, a memoria, dove crede di essere.",
      photo: "Foto · gruppo allungato",
      q1: "“Dov'è la auto fine corsa?”",
      a1: "La risposta è una stima, ed è su quella che si riapre la strada — e che si rispetta, o no, il tempo di chiusura concordato con la polizia stradale. Sbagliare di dieci minuti in più significa rompere l'accordo; in meno, riaprire la strada prima del tempo.",
      q2: "“È caduto qualcuno al km 60.”",
      a2: "Chi ha sentito? Chi è andato? Finché nessuno risponde alla radio, non si distingue “la chiamata non è arrivata” da “la chiamata è arrivata e stanno andando”.",
      q3: "“Manda l'assistenza più vicina.”",
      a3: "Più vicina misurata come? Sulla mappa di carta la distanza è quella dell'occhio — e l'occhio non sa che quel tratto è il ritorno e che la strada si ricongiunge solo 30 km più avanti.",
      q4: "“L'autista non ha capito.”",
      a4: "In una gara internazionale la squadra di assistenza parla quattro lingue. La radio ne parla una, e il briefing di mezz'ora prima della partenza è già finito.",
      q5: "“Gara conclusa.”",
      a5: "E non resta traccia di chi era dove, a che ora, quando è stato aperto l'allarme e quanto ci ha messo il soccorso. La federazione chiede dopo; risponde la memoria della squadra.",
    },

    measures: {
      marker: "Ciò che misura la strada",
      title: "Sei scelte di ingegneria",
      titleStrong: "che cambiano quello che appare sullo schermo.",
      diagramAria: "Schema di un percorso di andata e ritorno. Il punto dell'incidente è sul tratto di andata; la moto è sul ritorno, a 50 metri in linea d'aria ma a 37,3 chilometri sulla strada. L'ambulanza è 1,5 chilometri dietro l'incidente, sullo stesso tratto e nello stesso senso.",
      diagramMoto: "**0,05 km** in linea d'aria tra la moto e l'incidente. È il numero che usa un sistema di prossimità geometrica: con quello sarebbe partita la moto.",
      diagramRoute: "**37,3 km** sulla strada, nello stesso istante: la moto è sul ritorno e dovrebbe rifare tutto il giro contromano rispetto alla gara.",
      diagramAmb: "**1,5 km** dietro, sullo stesso tratto e nello stesso senso: l'ambulanza, quella che il sistema ha attivato.",
      diagramNote: "Schema fuori scala. Numeri misurati su un percorso di test reale.",
      leadTitle: "Distanza sulla strada, non in linea d'aria.",
      leadBody1: "In un test reale una moto era a **0,05 km** in linea d'aria da un incidente e a **37,3 km** sulla strada — sul ritorno del percorso, con l'unico collegamento tra i due punti trentasette chilometri più avanti. Il sistema ha attivato l'ambulanza che era **1,5 km indietro**, nello stesso senso di marcia della gara.",
      leadBody2: "Un sistema che confronta coordinate avrebbe mandato la moto, e la moto ci avrebbe messo l'intera gara ad arrivare. Chi ha già superato il punto paga anche il prezzo di trovare dove invertire e tornare contromano — e questa asimmetria entra nel conto.",
      c2Title: "Il divario apripista↔chiusura è misurato, non stimato.",
      c2Tag: "misurato",
      c2Body: "Il sistema registra a che ora l'apripista è passato per ogni punto del percorso. Quando la auto fine corsa arriva al km 42, il divario è la differenza tra due orari osservati — lo stesso calcolo di un intermedio di cronometraggio. È il numero che l'organizzazione ha concordato con la polizia stradale: è il passaggio della chiusura che restituisce la strada al traffico. Quando lo storico non basta ancora, lo schermo scrive “proiettato” e ne spiega il motivo. Il direttore non deve mai indovinare quale dei due sta leggendo.",
      c3Title: "Funziona senza segnale.",
      c3Tag: "40 punti",
      c3Body: "Niente viene inviato prima di essere scritto sul dispositivo, e niente esce dalla coda prima che il server confermi la ricezione. In un test di due minuti senza copertura, i 40 punti accumulati sono arrivati tutti, in ordine e senza duplicati appena il segnale è tornato.",
      c4Title: "L'allarme non fallisce in silenzio.",
      c4Tag: "coda locale",
      c4Body: "L'allarme passa davanti a qualsiasi ping GPS e viene ritentato finché il server non conferma — una richiesta di soccorso non viene mai scartata, anche a costo di una coda che non si svuota. E il soccorso giusto parte per categoria, senza che nessuno debba scegliere nel mezzo dell'emergenza: un incidente chiama l'ambulanza, un guasto chiama il meccanico.",
      c5Title: "Qualsiasi telefono diventa il GPS del veicolo.",
      c5Tag: "6 caratteri",
      c5Body: "L'autista apre il link, digita il codice di 6 caratteri stampato sul foglio del briefing e il suo telefono diventa il tracker di quel veicolo. Nessuna app da installare, nessun dispositivo da comprare, caricare, distribuire e ritirare a fine giornata.",
      c6Title: "Sei lingue, un solo link.",
      c6Tag: "6 lingue",
      c6Body: "La lingua non sta nell'URL — la negozia il dispositivo. Lo stesso link e lo stesso QR stampato danno portoghese all'autista brasiliano, italiano all'italiano e tedesco all'austriaco, senza che la direzione gestisca nulla. Un telefono impostato su pt-PT riceve portoghese, non inglese.",
      summaryLabel: "In sintesi",
      summary: "Sei scelte, un effetto: la direzione smette di chiedere dov'è ogni auto.",
    },

    how: {
      marker: "Come funziona",
      title: "Tre passi prima della partenza.",
      titleStrong: "Nessuno durante.",
      step: "Passo {n}",
      s1Title: "Carica il percorso.",
      s1Body: "Il GPX della gara, o il tracciato disegnato a schermo. Il percorso viene indicizzato una volta, ed è da lì che nasce ogni distanza misurata dopo — la posizione di ogni veicolo, il divario e la scelta del soccorso.",
      s2Title: "Genera il foglio dei codici.",
      s2Body: "Un codice di 6 caratteri per veicolo, con il ruolo di ciascuno: apripista, chiusura, scopa, ambulanza, meccanico, moto, commissario. Il foglio esce pronto da stampare e consegnare al briefing.",
      s3Title: "Apri il pannello il giorno della gara.",
      s3Body: "Ogni autista apre il link, digita il codice e compare sulla mappa nella lingua del proprio telefono. Durante la gara non c'è più nulla da configurare.",
    },

    screens: {
      marker: "Le due schermate",
      title: "Una sala di direzione.",
      titleStrong: "Un telefono per veicolo.",
      panelEyebrow: "Pannello della direzione",
      panelTitle: "Cosa vede la direzione",
      altHero: "Vista dalla moto di gara su una strada in pavé bagnata, due ciclisti davanti controluce al sole basso, e l'arco rosso dell'ultimo chilometro che attraversa in alto con lo striscione appeso.",
      altPanel: "Pannello della direzione gara: mappa del percorso con i veicoli di assistenza, divario tra apripista e chiusura indicato come misurato, e la coda degli allarmi.",
      altApp: "App dell'autista sul telefono: ruolo del veicolo, chilometro attuale sul percorso, stato dell'invio e i pulsanti di allarme.",
      altPave: "Strada in pavé che serpeggia tra le colline al tramonto, con tre ciclisti distanti centinaia di metri e un'auto di assistenza in uno dei varchi: la gara ha smesso di essere un gruppo.",
      panelCapture: "Schermata · pannello della direzione",
      p1: "Mappa in tempo reale con tutti i veicoli, ogni ruolo con il suo colore e l'età del dato.",
      p2: "Divario tra apripista e chiusura, indicato come misurato o proiettato.",
      p3: "Coda degli allarmi con l'assistenza più vicina già suggerita — e il perché del suggerimento per iscritto.",
      p4: "Stato della connessione veicolo per veicolo: chi è in diretta, chi è in ritardo, chi è sparito.",
      appEyebrow: "App dell'autista",
      appTitle: "Cosa vede l'autista",
      appCapture: "Schermata · app dell'autista",
      a1: "Entra con il codice di 6 caratteri. Nessun account, nessuno store.",
      a2: "Pulsanti di allarme grandi, per mano con il guanto e auto in movimento.",
      a3: "Continua a inviare con lo schermo spento e accumula tutto quando cade il segnale.",
      a4: "Nella lingua del telefono, a partire dallo stesso link che hanno ricevuto tutti.",
    },

    close: {
      marker: "Flamme rouge",
      title: "Due porte.",
      titleStrong: "Nessuna decisione nel mezzo.",
      lead: "La direzione entra con un account e costruisce la gara. L'autista entra con il codice e non deve decidere altro.",
      aria: "Entra nel sistema",
      directorTitle: "Sono della direzione",
      directorBody: "Creare la gara, caricare il percorso, generare i codici e seguire l'operazione in tempo reale.",
      directorCta: "Apri il pannello →",
      driverTitle: "Sono un autista",
      driverBody: "Digita il codice di 6 caratteri che ti ha dato la direzione e il telefono diventa il GPS della tua posizione.",
      driverCta: "Entra con il codice →",
    },

    contact: {
      eyebrow: "Contatti",
      title: "Parla con chi lo ha fatto.",
      body: "Raccontaci che gara organizzi e cosa devi risolvere. Risponde la persona che ha scritto il sistema, nella tua lingua.",
      name: "Il tuo nome",
      email: "E-mail",
      organization: "Organizzazione",
      message: "Messaggio",
      messagePlaceholder: "Che gara organizzi, quanti veicoli di assistenza e quando si corre.",
      send: "Invia",
      sending: "Invio…",
      sentTitle: "Ricevuto.",
      sentBody: "Rispondo all'indirizzo che hai lasciato, nella lingua in cui hai scritto.",
      orWrite: "Oppure scrivi direttamente a",
      failed: "Non è stato possibile inviare adesso. Il messaggio è ancora qui — copialo e mandalo a",
      tooMany: "Troppi messaggi da qui in poco tempo. Aspetta un po', oppure scrivi a",
      nameRequired: "Dimmi il tuo nome: è così che inizierà la risposta.",
      emailRequired: "Mi serve un indirizzo e-mail per rispondere.",
      emailInvalid: "Questa e-mail non sembra valida. Controlla la @ o il dominio.",
      messageRequired: "Scrivi cosa ti serve, anche in una riga sola.",
      messageTooLong: "Messaggio troppo lungo (massimo 4000 caratteri).",
    },
    footer: {
      marker: "Strada riaperta",
      tagline: "Direzione gara in tempo reale per il ciclismo su strada.",
      languages: "Sei lingue, un solo link",
      languagesNote: "Lo stesso indirizzo e lo stesso QR danno a ogni dispositivo l'interfaccia nella sua lingua — senza che la direzione gestisca nulla.",
      enter: "Accedi",
      credits: "uno strumento",
    },

    meta: {
      title: "Flamme Rouge — direzione gara in tempo reale per il ciclismo su strada",
      description: "La posizione di ogni veicolo di assistenza misurata sulla strada, il divario tra apripista e chiusura misurato come un intermedio, e allarmi che attivano il soccorso giusto per categoria. Il GPS è il telefono dell'autista.",
      ogTitle: "Flamme Rouge — direzione gara in tempo reale",
      ogDescription: "In un test reale una moto era a 0,05 km in linea d'aria e a 37,3 km sulla strada da un incidente. Il sistema ha attivato l'ambulanza che era 1,5 km indietro.",
    },
  },
  errors: {
    forbidden: "Non hai il permesso di modificare questa gara.",
    raceNotFound: "Gara non trovata.",
    invalidRace: "Gara non valida.",
    sessionExpired: "La sessione è scaduta. Accedi di nuovo.",
    notStartable: "Solo una gara in bozza o pronta può essere avviata.",
    listRaces:
      "Ricarica la pagina. Se persiste, esci e rientra — la tua sessione può essere scaduta.",
    noChange:
      "Nulla è cambiato: l'allerta può essere già stata chiusa da un'altra persona, oppure non hai più i permessi su questa gara. Ricarica la pagina.",

    db: {
      saveFailed:
        "Salvataggio non riuscito. Riprova; se persiste, ricarica la pagina.",
      routeRaceConflict:
        "Un altro percorso è stato attivato in questa gara mentre lavoravi. Ricarica la pagina e invia di nuovo — vince il percorso più recente.",
      bindCodeTaken:
        "Il codice estratto ha coinciso con uno già in uso in un'altra gara. Clicca di nuovo su salva: verrà estratto un codice nuovo.",
      oneLead:
        "Questa gara ha già un riferimento apripista. Togli quello attuale prima di impostarne un altro.",
      oneSweep:
        "Questa gara ha già un riferimento fine corsa. Togli quello attuale prima di impostarne un altro.",
      ordinalConflict:
        "Due mezzi hanno lo stesso ordine. Ricarica la pagina e rifai il riordino.",
      sessionTaken:
        "C'è già un telefono collegato a questo mezzo. Revoca il collegamento attuale prima di crearne un altro.",
      leadSweepSame:
        "Lo stesso mezzo non può essere sia riferimento apripista sia fine corsa — il calcolo della finestra confronterebbe il mezzo con sé stesso.",
      gapWindowIncoherent:
        "Il limite minimo della finestra deve essere inferiore al massimo.",
      targetGapRange: "La finestra obiettivo deve essere tra 1 e 600 minuti.",
      raceNameLength: "Il nome della gara deve avere tra 1 e 200 caratteri.",
      positionLabelLength: "Il nome del mezzo deve avere tra 1 e 60 caratteri.",
      bindCodeFormat: "Il codice generato è fuori formato. Riprova.",
      trackDistance: "Il percorso deve avere una lunghezza maggiore di zero.",
      trackPoints: "Il percorso ha bisogno di almeno 2 punti.",
      duplicate:
        "Questo record esiste già. Ricarica la pagina per vedere lo stato attuale.",
      checkViolation:
        "Un valore è fuori dai limiti consentiti. Rivedi i campi e riprova.",
      missingRace: "La gara indicata non esiste più. Torna all'elenco delle gare.",
      notFound:
        "Record non trovato — può essere stato rimosso da un'altra persona. Ricarica la pagina.",
    },
  },
};
