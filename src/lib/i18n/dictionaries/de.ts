import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/** Deutsch. Terminologie der BDR-/UCI-Kommissäre. */
export const de: Dictionary = {
  meta: {
    appName: "Flamme Rouge",
    tagline: "Rennleitung in Echtzeit",
  },

  common: {
    save: "Speichern",
    cancel: "Abbrechen",
    confirm: "Bestätigen",
    back: "Zurück",
    next: "Weiter",
    close: "Schließen",
    edit: "Bearbeiten",
    remove: "Entfernen",
    add: "Hinzufügen",
    retry: "Erneut versuchen",
    loading: "Lädt…",
    saving: "Wird gespeichert…",
    search: "Suchen",
    none: "Keine",
    unknown: "Unbekannt",
    optional: "optional",
    required: "erforderlich",
    yes: "Ja",
    no: "Nein",
    error: "Etwas ist schiefgelaufen",
    errorRetry: "Das hat nicht geklappt. Bitte erneut versuchen.",
    offline: "Keine Verbindung",
    online: "Verbunden",
    language: "Sprache",
  },

  roles: {
    lead_car: { label: "Führungsfahrzeug", short: "Führung" },
    sweep_car: { label: "Besenwagen", short: "Besen" },
    moto: { label: "Begleitmotorrad", short: "Motorrad" },
    ambulance: { label: "Rettungswagen", short: "Rettung" },
    mechanic: { label: "Technischer Service", short: "Service" },
    support_car: { label: "Begleitfahrzeug", short: "Begleitung" },
    marshal: { label: "Streckenposten", short: "Posten" },
    other: { label: "Sonstiges", short: "Sonstiges" },
  },

  signal: {
    live: "Live",
    delayed: "Verzögert",
    stale: "Nicht aktuell",
    lost: "Kein Signal",
    never: "Nicht verbunden",
    lastSeen: "Letzte Position {age}",
  },

  race: {
    status: {
      draft: "Entwurf",
      armed: "Bereit",
      live: "Läuft",
      finished: "Beendet",
      archived: "Archiviert",
    },
    distance: "Distanz",
    elevation: "Höhenmeter",
    start: "Start",
    positions: "Begleitfahrzeuge",
    route: "Strecke",
  },

  gap: {
    title: "Fenster Führung ↔ Besenwagen",
    short: "Fenster",
    target: "Ziel: {duration}",
    measured:
      "Gemessen aus der Zeitdifferenz, mit der beide Fahrzeuge denselben Punkt passiert haben.",
    projected:
      "Hochgerechnet: {distance} auf der Strecke, bei der aktuellen Durchschnittsgeschwindigkeit des Besenwagens ({speed}).",
    noLead: "Führungsfahrzeug ohne Position. Gerät verbinden.",
    noSweep: "Besenwagen ohne Position. Gerät verbinden.",
    noBoth: "Warten auf die Position beider Referenzfahrzeuge.",
    sweepAhead:
      "Der Besenwagen ist vor dem Führungsfahrzeug. Prüfen, ob die Rollen vertauscht wurden.",
    sweepStopped:
      "Distanz auf der Strecke: {distance}. Besenwagen steht — Zeit unbestimmt.",
    noHistory:
      "Distanz auf der Strecke: {distance}. Zu wenig Verlauf, um daraus eine Zeit zu berechnen.",
    stale: "Daten von {age} — geben die aktuelle Position womöglich nicht wieder.",
    overTarget: "Über dem Zielfenster",
    underTarget: "Unter dem Zielfenster",
  },

  alerts: {
    title: "Meldungen",
    none: "Keine aktiven Meldungen",
    raise: "Meldung auslösen",
    categories: {
      medical: { label: "Sturz / Rettungswagen", short: "Sturz" },
      mechanical: { label: "Technisches Problem", short: "Technik" },
      other: { label: "Sonstiges", short: "Sonstiges" },
    },
    status: {
      open: "Offen",
      acknowledged: "Zur Kenntnis genommen",
      dispatched: "Hilfe entsandt",
      en_route: "Auf dem Weg",
      on_scene: "Vor Ort",
      resolved: "Erledigt",
      cancelled: "Abgebrochen",
    },
    priority: {
      critical: "Kritisch",
      high: "Hoch",
      normal: "Normal",
    },
    confirmMedical: "Notruf bestätigen",
    confirmMedicalBody:
      "Der nächstgelegene Rettungswagen wird sofort entsandt und der Ort auf der Karte des gesamten Teams markiert.",
    sending: "Wird gesendet…",
    queued: "In der Warteschlange — kein Signal. Es wird weiter versucht.",
    delivered: "Von der Rennleitung empfangen",
    failed: "Senden fehlgeschlagen — neuer Versuch",
    at: "bei km {km}",
    raisedBy: "Ausgelöst von {position}",
    noteLabel: "Beschreibung (optional)",
    notePlaceholder: "Was ist passiert?",

    dispatch: {
      youWereCalled: "Sie wurden angefordert",
      calling: "{position} wird entsandt",
      called: "{position} entsandt",
      reason: "{position}, {distance} {direction} auf der Strecke, ~{eta}",
      ahead: "voraus",
      behind: "zurück",
      onMyWay: "Bin unterwegs",
      cantGo: "Kann nicht",
      arrived: "Bin vor Ort",
      enRoute: "{position} ist unterwegs",
      onScene: "{position} ist vor Ort",
      declined: "{position} konnte nicht übernehmen",
      reassigning: "Nächstes verfügbares Fahrzeug wird entsandt…",
      noneAvailable:
        "Kein Fahrzeug für diese Kategorie verfügbar. Die Rennleitung muss manuell eingreifen.",
      declineReason: "Grund (optional)",
      reassign: "Fahrzeug wechseln",
    },

    proximity: {
      ahead: "{category} {distance} voraus",
      passing: "Sie passieren gerade die Meldestelle",
      dismiss: "Verstanden",
    },

    confirm: {
      prompt: "Sie sind vorbeigefahren. Besteht das Problem noch?",
      still_there: "Besteht noch",
      cleared: "Ist bereits frei",
      not_found: "Nichts gesehen",
      thanks: "Danke — die Rennleitung wurde informiert.",
      countStillThere: "{count} bestätigen",
      countCleared: "{count} melden freie Fahrt",
    },

    actions: {
      acknowledge: "Zur Kenntnis nehmen",
      resolve: "Erledigen",
      cancel: "Meldung abbrechen",
      resolutionNote: "Was unternommen wurde",
    },
  },

  driver: {
    bindTitle: "Fahrzeugcode eingeben",
    bindSubtitle:
      "Die Rennleitung hat Ihnen einen 6-stelligen Code gegeben. Er verbindet dieses Telefon mit Ihrer Aufgabe im Rennen.",
    bindPlaceholder: "ABC-123",
    bindAction: "Verbinden",
    bindInvalid: "Ungültiger Code. Prüfen Sie die 6 Zeichen und versuchen Sie es erneut.",
    bindNotFound: "Code nicht gefunden oder abgelaufen. Wenden Sie sich an die Rennleitung.",
    bindTooManyAttempts:
      "Zu viele Versuche. Bitte kurz warten, bevor Sie es erneut versuchen.",
    boundAs: "Sie sind {position} bei {race}",
    unbind: "Dieses Gerät trennen",
    unbindConfirm:
      "Beim Trennen überträgt dieses Telefon die Fahrzeugposition nicht mehr. Bestätigen?",
    revoked:
      "Dieses Gerät wurde von der Rennleitung getrennt. Fordern Sie einen neuen Code an.",

    gpsPermissionTitle: "Wir brauchen Ihren Standort",
    gpsPermissionBody:
      "Die App nutzt GPS, um Ihr Fahrzeug auf der Karte der Rennleitung anzuzeigen. Ohne GPS sieht niemand, wo Sie sind.",
    gpsDenied:
      "Standortberechtigung verweigert. Aktivieren Sie sie in den Browsereinstellungen und laden Sie neu.",
    gpsUnavailable: "GPS auf diesem Gerät nicht verfügbar.",
    gpsSearching: "GPS-Signal wird gesucht…",

    transmitting: "Überträgt",
    paused: "Pausiert",
    queuedPings: "{count} Punkte in der Warteschlange",
    batteryWarning: "Akku schwach — bitte anschließen.",
    keepAwake: "Bildschirm bleibt an",
  },

  director: {
    dashboard: "Leitstand",
    myRaces: "Meine Rennen",
    newRace: "Neues Rennen",
    noRaces: "Sie haben noch kein Rennen angelegt.",
    noRacesAction: "Erstes Rennen anlegen",
    setupChecklist: "Bevor das Rennen live gehen kann",
    needsRoute: "Strecke laden",
    needsLead: "Führungsfahrzeug festlegen",
    needsSweep: "Besenwagen festlegen",
    needsBinding: "{count} Fahrzeug(e) ohne verbundenes Gerät",
    ready: "Alles bereit",
    goLive: "Rennen starten",
    finish: "Rennen beenden",
  },

  route: {
    uploadTitle: "Strecke laden",
    uploadSubtitle: "GPX-Datei des Rennens hochladen.",
    uploadAction: "GPX-Datei wählen",
    uploadDrop: "Datei hierher ziehen",
    drawInstead: "Oder Strecke auf der Karte zeichnen",
    drawTitle: "Strecke zeichnen",
    drawHint: "Auf die Karte klicken, um Punkte zu setzen. Ziehen zum Anpassen.",
    undo: "Rückgängig",
    clear: "Löschen",
    chooseSegment:
      "Die Datei enthält mehrere Strecken. Wählen Sie die des Rennens:",
    replaceWarning:
      "Das Ersetzen der Strecke berechnet alle Positionen im Rennen neu. Vor dem Start durchführen.",
    parseError: "Datei konnte nicht gelesen werden",
    pointCount: "{count} Punkte",
    current: "Aktuelle Strecke",
    replace: "Strecke ersetzen",
  },

  positions: {
    title: "Begleitfahrzeuge",
    add: "Fahrzeug hinzufügen",
    addBulk: "Mehrere hinzufügen",
    quantity: "Anzahl",
    label: "Bezeichnung",
    driverName: "Fahrer/in",
    driverPhone: "Telefon",
    plate: "Kennzeichen",
    referenceLead: "Ist das offizielle Führungsfahrzeug",
    referenceSweep: "Ist der offizielle Besenwagen",
    dispatchable: "Kann zu Meldungen entsandt werden",
    code: "Verbindungscode",
    regenerateCode: "Neuen Code erzeugen",
    regenerateWarning:
      "Der aktuelle Code wird ungültig. Ein bereits verbundener Fahrer überträgt weiter, bis die Verbindung getrennt wird.",
    print: "Codes drucken",
    printTitle: "Verbindungscodes — {race}",
    printHint:
      "Geben Sie jeden Code vor dem Start an die Fahrerin oder den Fahrer des jeweiligen Fahrzeugs.",
    bound: "Verbunden",
    notBound: "Wartet auf Verbindung",
    revokeSession: "Gerät trennen",
  },

  map: {
    fitRoute: "Strecke einpassen",
    followMe: "Meinem Fahrzeug folgen",
    vehicles: "Fahrzeuge",
    showAll: "Alle anzeigen",
    noWebGL:
      "Dieser Browser unterstützt kein WebGL. Die Positionsdaten in den Listen bleiben korrekt.",
  },
};
