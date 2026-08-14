import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/** Italiano. Terminologia della Federazione Ciclistica Italiana. */
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
  },

  roles: {
    lead_car: { label: "Auto apripista", short: "Apripista" },
    sweep_car: { label: "Auto scopa", short: "Scopa" },
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
  },

  gap: {
    title: "Finestra apripista ↔ scopa",
    short: "Finestra",
    target: "Obiettivo: {duration}",
    measured:
      "Misurata dalla differenza di orario di passaggio dei due mezzi nello stesso punto.",
    projected:
      "Stimata: {distance} su strada, alla velocità media attuale della scopa ({speed}).",
    noLead: "Auto apripista senza posizione. Collega il suo dispositivo.",
    noSweep: "Auto scopa senza posizione. Collega il suo dispositivo.",
    noBoth: "In attesa della posizione dei due mezzi di riferimento.",
    sweepAhead:
      "L'auto scopa è davanti all'apripista. Verifica che i ruoli non siano invertiti.",
    sweepStopped:
      "Distanza su strada: {distance}. Auto scopa ferma — tempo indefinito.",
    noHistory:
      "Distanza su strada: {distance}. Storico insufficiente per convertirla in tempo.",
    stale: "Dato di {age} — potrebbe non riflettere la posizione attuale.",
    overTarget: "Oltre la finestra obiettivo",
    underTarget: "Sotto la finestra obiettivo",
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

    transmitting: "Trasmissione attiva",
    paused: "In pausa",
    queuedPings: "{count} punti in coda",
    batteryWarning: "Batteria scarica — collega il caricabatterie.",
    keepAwake: "Schermo mantenuto acceso",
  },

  director: {
    dashboard: "Pannello",
    myRaces: "Le mie gare",
    newRace: "Nuova gara",
    noRaces: "Non hai ancora creato nessuna gara.",
    noRacesAction: "Crea la prima gara",
    setupChecklist: "Per mandare la gara in diretta",
    needsRoute: "Caricare il percorso",
    needsLead: "Definire l'auto apripista",
    needsSweep: "Definire l'auto scopa",
    needsBinding: "{count} mezzo/i senza dispositivo collegato",
    ready: "Tutto pronto",
    goLive: "Avvia gara",
    finish: "Concludi gara",
  },

  route: {
    uploadTitle: "Carica il percorso",
    uploadSubtitle: "Invia il file GPX della gara.",
    uploadAction: "Scegli file GPX",
    uploadDrop: "Trascina qui il file",
    drawInstead: "Oppure disegna il percorso sulla mappa",
    drawTitle: "Disegna il percorso",
    drawHint: "Clicca sulla mappa per aggiungere punti. Trascina per correggere.",
    undo: "Annulla",
    clear: "Cancella",
    chooseSegment: "Il file contiene più percorsi. Scegli quello della gara:",
    replaceWarning:
      "Sostituire il percorso ricalcola tutte le posizioni in gara. Fallo prima della partenza.",
    parseError: "Impossibile leggere il file",
    pointCount: "{count} punti",
    current: "Percorso attuale",
    replace: "Sostituisci percorso",
  },

  positions: {
    title: "Mezzi di supporto",
    add: "Aggiungi mezzo",
    addBulk: "Aggiungi più mezzi",
    quantity: "Quantità",
    label: "Identificativo",
    driverName: "Conducente",
    driverPhone: "Telefono",
    plate: "Targa",
    referenceLead: "È l'auto apripista ufficiale",
    referenceSweep: "È l'auto scopa ufficiale",
    dispatchable: "Può essere inviato in caso di allerta",
    code: "Codice di collegamento",
    regenerateCode: "Genera nuovo codice",
    regenerateWarning:
      "Il codice attuale smette di funzionare. Se il conducente è già collegato, continua a trasmettere finché non viene scollegato.",
    print: "Stampa codici",
    printTitle: "Codici di collegamento — {race}",
    printHint:
      "Consegna ogni codice al conducente del mezzo corrispondente prima della partenza.",
    bound: "Collegato",
    notBound: "In attesa di collegamento",
    revokeSession: "Scollega dispositivo",
  },

  map: {
    fitRoute: "Inquadra percorso",
    followMe: "Segui il mio mezzo",
    vehicles: "Mezzi",
    showAll: "Mostra tutti",
    noWebGL:
      "Questo browser non supporta WebGL. I dati di posizione restano corretti negli elenchi.",
  },
};
