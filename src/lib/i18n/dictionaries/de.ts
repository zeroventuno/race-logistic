import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * Deutsch. Terminologie der BDR-/UCI-Kommissäre. Durchgehend Siezen.
 *
 * `sweep_car` = SCHLUSSFAHRZEUG (hebt die Streckensperrung auf).
 * `broom_wagon` = BESENWAGEN (letztes Fahrzeug, nimmt die Aufgeber auf).
 * Das Fenster, das der Leitstand berechnet, ist Führung ↔ Schluss.
 */
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
    logout: "Abmelden",
  },

  roles: {
    lead_car: { label: "Führungsfahrzeug", short: "Führung" },
    sweep_car: { label: "Schlussfahrzeug", short: "Schluss" },
    broom_wagon: { label: "Besenwagen", short: "Besen" },
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
    noStart: "Keine Startzeit",
    details: "Renndaten",
    lapsTotal: "{laps} Runden = {distance} Renndistanz.",
    lap: "Runde {lap}/{laps}",
    lapsCircuit: "Rundkurs mit {laps} Runden",
    lapUnknown: "Runde ?",

    form: {
      nameLabel: "Name des Rennens",
      namePlaceholder: "Giro delle Langhe — 2. Etappe",
      nameRequired:
        "Geben Sie dem Rennen einen Namen — daran erkennen Sie es in der Liste.",
      nameTooLong: "Name zu lang (maximal 200 Zeichen).",
      locationLabel: "Ort",
      locationHint: "Stadt oder Region des Starts. Erscheint in der Rennliste.",
      locationPlaceholder: "Alba, Piemont",
      locationTooLong: "Ort zu lang (maximal 200 Zeichen).",
      dateLabel: "Startdatum",
      dateRequired: "Geben Sie auch das Startdatum an.",
      timeLabel: "Startzeit",
      timeHint: "Ortszeit am Rennort.",
      timeRequired: "Geben Sie auch die Startzeit an.",
      dateTimeInvalid: "Datum oder Uhrzeit ungültig. Prüfen Sie beide Felder.",
      timezoneLabel: "Zeitzone des Rennens",
      timezoneHint:
        "Alles, was die Rennleitung sieht, wird in diese Zeitzone umgerechnet, auch auf dem Telefon des Fahrers.",
      timezoneRequired: "Wählen Sie die Zeitzone des Rennorts.",
      timezoneUnknown: "Zeitzone unbekannt.",
      lapsLabel: "Runden auf der Strecke",
      lapsHint:
        "1 für ein Rennen von Ort zu Ort. Auf einem Rundkurs ist die Renndistanz die Strecke mal die Runden.",
      lapsRequired: "Geben Sie die Anzahl der Runden an.",
      lapsInteger: "Die Rundenzahl muss eine ganze Zahl sein.",
      lapsMin: "Ein Rennen hat mindestens 1 Runde.",
      lapsMax: "Höchstens 50 Runden.",
      gapHint:
        "Wie viele Minuten die Rennleitung zwischen Führungs- und Schlussfahrzeug halten will. Daran entscheidet der Leitstand, ob das Feld zu weit auseinandergezogen oder zu kompakt ist.",
      targetLabel: "Zielfenster (Minuten)",
      targetRequired: "Geben Sie das Zielfenster in Minuten an.",
      targetInteger: "Das Zielfenster muss eine ganze Zahl von Minuten sein.",
      targetMin: "Das Zielfenster muss mindestens 1 Minute betragen.",
      targetMax: "Das Zielfenster darf 600 Minuten (10 Stunden) nicht überschreiten.",
      minLabel: "Warnen unter (Minuten)",
      minHint: "Feld zu kompakt.",
      minInteger: "Der Mindestwert muss eine ganze Zahl von Minuten sein.",
      minNegative: "Der Mindestwert darf nicht negativ sein.",
      minMax: "Der Mindestwert darf 600 Minuten nicht überschreiten.",
      minAboveTarget:
        "Der Mindestwert darf nicht größer als das Zielfenster sein ({target} Min.).",
      maxLabel: "Warnen über (Minuten)",
      maxHint: "Feld zu weit auseinandergezogen.",
      maxInteger: "Der Höchstwert muss eine ganze Zahl von Minuten sein.",
      maxMin: "Der Höchstwert muss mindestens 1 Minute betragen.",
      maxMax: "Der Höchstwert darf 600 Minuten nicht überschreiten.",
      maxBelowMin: "Der Höchstwert muss größer als der Mindestwert sein ({min} Min.).",
      maxBelowTarget:
        "Der Höchstwert darf nicht kleiner als das Zielfenster sein ({target} Min.).",
      showLimits: "Warnschwellen festlegen",
      saved: "Renndaten aktualisiert",
      afterSave: "Nach dem Speichern geht es direkt zur Strecke.",
    },
  },

  gap: {
    title: "Fenster Führung ↔ Schluss",
    short: "Fenster",
    targetLabel: "Zielfenster",
    target: "Ziel: {duration}",
    measured:
      "Gemessen aus der Zeitdifferenz, mit der beide Fahrzeuge denselben Punkt passiert haben.",
    projected:
      "Hochgerechnet: {distance} auf der Strecke, bei der aktuellen Durchschnittsgeschwindigkeit des Schlussfahrzeugs ({speed}).",
    noLead: "Führungsfahrzeug ohne Position. Verbinden Sie sein Gerät.",
    noSweep: "Schlussfahrzeug ohne Position. Verbinden Sie sein Gerät.",
    noBoth: "Warten auf die Position beider Referenzfahrzeuge.",
    sweepAhead:
      "Das Schlussfahrzeug ist vor dem Führungsfahrzeug. Prüfen Sie, ob die Rollen in der Einrichtung vertauscht sind.",
    sweepStopped:
      "Distanz auf der Strecke: {distance}. Schlussfahrzeug steht — Zeit unbestimmt.",
    noHistory:
      "Distanz auf der Strecke: {distance}. Zu wenig Verlauf, um daraus eine Zeit zu berechnen.",
    stale: "Daten von {age} — geben die aktuelle Position womöglich nicht wieder.",
    overTarget: "Über dem Zielfenster",
    underTarget: "Unter dem Zielfenster",

    timeSeparation: "zeitlicher Abstand",
    alongRoad: "auf der Strecke",
    methodMeasured: "Gemessen",
    methodProjected: "Hochgerechnet",
    methodNone: "Keine Daten",
    withinTarget: "Im Fenster",
    overTargetDetail: "zu weit auseinandergezogen",
    underTargetDetail: "zu kompakt",
    comparisonSuspended:
      "Vergleich mit dem Zielfenster ausgesetzt, solange die Daten unzuverlässig sind",
    noLimits: "Für dieses Rennen sind keine Grenzwerte festgelegt",
    clockSuspect:
      "Die Uhr eines der Referenzgeräte weicht von der Serverzeit ab. Solange das anhält, sind das Datenalter und der gemessene Wert unzuverlässig — bestätigen Sie die Position über Funk.",
    lapsUncertain:
      "Rundkursrennen über {laps} Runden: der geladene Verlauf reicht nicht bis zum Start, daher kann die Rundenzahl zu niedrig und das Fenster größer sein als angezeigt.",
    onTarget: "Fenster {gap}, vereinbart {target}. Nichts zu korrigieren.",
    verdictAhead: "Fenster {gap}, vereinbart {target} — {drift} zu früh.",
    verdictBehind: "Fenster {gap}, vereinbart {target} — {drift} zu spät.",
    remedyAhead: "Verlangsamen Sie das Schlussfahrzeug.",
    remedyBehind: "Beschleunigen Sie das Schlussfahrzeug.",
    costAhead:
      "Die Straße wird früher als geplant wieder freigegeben, und wer zurückgefallen ist, verliert den Schutz zu früh.",
    costBehind:
      "Die Streckensperrung überschreitet die von der Verkehrsbehörde genehmigte Zeit.",
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

    storageFailedTitle:
      "MELDUNG AUF DIESEM GERÄT NICHT GESPEICHERT — JETZT ÜBER FUNK MELDEN.",
    storageFailedBody:
      "Der lokale Speicher hat das Schreiben abgelehnt ({reason}). Es wird nichts von allein erneut gesendet.",
    retryCount: "{count} Versuch(e) ohne Erfolg. Melden Sie es über Funk.",
    unknownFailure: "unbekannter Fehler",
    nobodyDispatched: "Zu dieser Meldung wurde niemand entsandt.",

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
      dispatch: "Fahrzeug entsenden",
      auto: "automatisch",
      fallbackNoPosition:
        "Kein berechneter Vorschlag und keine Position auf der Strecke — willkürliche Reihenfolge. Bestätigen Sie über Funk.",
      fallbackReason:
        "Kein berechneter Vorschlag. {distance} Unterschied auf der Strecke, ohne Wendeberechnung und ohne geschätzte Zeit.",
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
      confirmCancel: "bestätigen? (Fehlalarm)",
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
    bindPasteHint:
      "Sie können einfügen. Die Buchstaben O und I werden als 0 und 1 gelesen — der Code verwendet diese Buchstaben nicht.",
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
    gpsNoApi:
      "Dieser Browser liefert keine Standortdaten. Verwenden Sie Chrome oder Safari auf dem Telefon.",
    gpsNoFix:
      "Kein GPS-Signal. Im Tunnel oder in der Tiefgarage ist das normal; die Erfassung läuft von allein weiter.",
    gpsTimeout: "Das GPS antwortet verzögert. Es wird weiter versucht.",
    gpsFailed: "Position konnte nicht ermittelt werden. Die Erfassung versucht es weiter.",
    gpsDeniedIOS:
      "Standort blockiert. Auf dem iPhone: Einstellungen → Safari → Standort → Fragen, dann diese Seite neu laden. Bei der Chrome-App: Einstellungen → Chrome → Standort.",
    gpsDeniedAndroid:
      "Standort blockiert. Auf Android: Tippen Sie auf das Schloss neben der Adresse → Berechtigungen → Standort → Zulassen, dann laden Sie die Seite neu.",
    gpsDeniedBrowser:
      "Standort vom Browser blockiert. Erlauben Sie den Standortzugriff in den Website-Berechtigungen und laden Sie die Seite neu.",

    gapWarning: "Sie haben {age} lang nicht gesendet.",
    gapWarningBody:
      "Die Rennleitung hat Ihre Position in dieser Zeit nicht gesehen. Halten Sie diesen Bildschirm im Vordergrund und das Gerät am Strom.",
    tapToDismiss: "zum Ausblenden tippen",
    alertNotSaved: "ALARM AUF DIESEM GERÄT NICHT GESPEICHERT — JETZT FUNK BENUTZEN.",
    alertNotSavedDetail:
      "Der lokale Speicher hat das Schreiben abgelehnt ({reason}). Nichts wird von selbst erneut gesendet.",
    alertAttempts: "{count} Versuch(e) ohne Erfolg. Melden Sie es über Funk.",
    transmitting: "Überträgt",
    paused: "Pausiert",
    queuedPings: "{count} Punkte in der Warteschlange",
    queuedAlerts: "{count} Meldung(en) noch nicht zugestellt. Melden Sie es über Funk.",
    pingRejected: "POSITION ABGELEHNT",
    pingRejectedDetail:
      "Der Server hat {count} Position(en) abgelehnt: Ihre Position erscheint NICHT auf der Karte der Rennleitung.",
    queueNotDurable:
      "Lokaler Speicher nicht verfügbar: die Warteschlange geht verloren, wenn die App geschlossen wird.",
    batteryWarning: "Akku schwach — bitte anschließen.",
    keepAwake: "Bildschirm bleibt an",
    keepScreenOpen:
      "Lassen Sie diesen Bildschirm während des Rennens geöffnet. Die Position wird automatisch gesendet, auch bei schwachem Signal.",
  },

  director: {
    dashboard: "Leitstand",
    myRaces: "Meine Rennen",
    myRacesSubtitle:
      "Jedes Rennen hat seine eigene Strecke, seine Begleitfahrzeuge und seine Codes.",
    newRace: "Neues Rennen",
    newRaceSubtitle:
      "Vorerst nur das Nötigste. Strecke und Fahrzeuge folgen in den nächsten Schritten und bleiben bis zum Start änderbar.",
    createAndContinue: "Rennen anlegen und zur Strecke",
    noRaces: "Sie haben noch kein Rennen angelegt.",
    noRacesAction: "Erstes Rennen anlegen",
    setupChecklist: "Bevor das Rennen live gehen kann",
    needsRoute: "Strecke laden",
    needsPositions: "Begleitfahrzeuge anlegen",
    needsLead: "Führungsfahrzeug festlegen",
    needsSweep: "Schlussfahrzeug festlegen",
    needsBinding: "{count} Fahrzeug(e) ohne verbundenes Gerät",
    ready: "Alles bereit",
    goLive: "Rennen starten",
    finish: "Rennen beenden",

    areaOverline: "Bereich Rennleitung",
    filterAll: "Alle",
    filterReady: "Bereit",
    filterPreparing: "In Vorbereitung",
    filterFinished: "Beendet",
    noneInFilter: "Kein Rennen in diesem Zustand.",
    openRace: "Öffnen",
    openRecord: "Protokoll",
    supportShort: "Begleitung",
    listErrorBody:
      "Laden Sie die Seite neu. Wenn es bleibt, melden Sie sich ab und wieder an — Ihre Sitzung ist möglicherweise abgelaufen.",
    steps: "Schritte des Rennens",
    overview: "Übersicht",
    live: "Live",
    resolveItem: "Erledigen",
    pendingCount: "{count} offene(r) Punkt(e)",
    readOnly: "Nur Lesen",
    readOnlyRoute:
      "Sie nehmen an diesem Rennen als Beobachter teil und können die Strecke nicht ändern.",
    markReady: "Rennen als bereit markieren",
    marking: "Wird gespeichert…",
    backToDraft: "Zurück zum Entwurf",
    reverting: "Wird zurückgesetzt…",
    resolveBlockingFirst: "Erledigen Sie zuerst die Pflichtpunkte.",

    checklist: {
      routeLabel: "Strecke geladen",
      routeHint:
        "Laden Sie die GPX-Datei des Rennens hoch oder zeichnen Sie die Strecke auf der Karte. Ohne Strecke gibt es weder Kilometrierung noch Fensterberechnung.",
      positionsLabel: "Begleitfahrzeuge angelegt",
      positionsHint:
        "Legen Sie die Begleitfahrzeuge an. Jedes erhält einen Code, den der Fahrer auf seinem Telefon eingibt.",
      leadLabel: "Referenz Führungsfahrzeug festgelegt",
      leadHint:
        "Markieren Sie, welches Fahrzeug das Führungsfahrzeug ist. Damit beginnt das Fenster, das die Rennleitung überwacht.",
      sweepLabel: "Referenz Schlussfahrzeug festgelegt",
      sweepHint:
        "Markieren Sie, welches Fahrzeug das Schlussfahrzeug ist. Seine Durchfahrt gibt die Straße wieder frei und schließt das Fenster.",
      startLabel: "Startzeit",
      startHint:
        "Optional, aber erst damit zeigt der Leitstand einen Countdown statt nur der Uhrzeit.",
    },

    empty: {
      intro:
        "Ein Rennen ist bereit für den Livebetrieb, wenn es eine Strecke, Begleitfahrzeuge und die Referenzen für Führung und Schluss hat. Drei Schritte:",
      step1Title: "Rennen anlegen",
      step1Body:
        "Name, Ort, Start und das Zielfenster zwischen Führungs- und Schlussfahrzeug. Eine Minute.",
      step2Title: "Strecke laden",
      step2Body:
        "Laden Sie die vorhandene GPX-Datei hoch oder zeichnen Sie die Strecke auf der Karte. Erst dadurch wird aus einer GPS-Position ein Rennkilometer.",
      step3Title: "Fahrzeuge anlegen und Codes drucken",
      step3Body:
        "Jedes Motorrad, jeder Rettungswagen und jedes Begleitfahrzeug erhält einen 6-stelligen Code. Der Fahrer gibt ihn auf seinem eigenen Telefon ein — nichts zu installieren, kein Konto anzulegen.",
    },
  },

  route: {
    uploadTitle: "Strecke laden",
    uploadSubtitle: "GPX-Datei des Rennens hochladen.",
    uploadAction: "GPX-Datei wählen",
    uploadDrop: "Datei hierher ziehen",
    uploadHint:
      "Oder klicken Sie zum Auswählen. Was aus Strava, Garmin Connect, RideWithGPS, Komoot oder der Streckensoftware des Rennens kommt, passt.",
    uploadReading: "Große Dateien brauchen einige Sekunden.",
    drawInstead: "Oder Strecke auf der Karte zeichnen",
    drawTitle: "Strecke zeichnen",
    drawHint: "Auf die Karte klicken, um Punkte zu setzen. Ziehen zum Anpassen.",
    drawShortcuts:
      "Entf löscht den ausgewählten Stützpunkt (oder Rechtsklick darauf). Strg+Z macht rückgängig.",
    undo: "Rückgängig",
    clear: "Löschen",
    chooseSegment:
      "Die Datei enthält mehrere Strecken. Wählen Sie die des Rennens:",
    chooseSegmentHint:
      "Die Datei enthält {count} Spuren. Alle zusammenzufügen würde einen Sprung mitten im Rennen erzeugen — wählen Sie eine aus.",
    segmentName: "Spur {number}",
    kindTrack: "aufgezeichnete Spur",
    kindRoute: "geplante Route",
    kindWaypoints: "einzelne Wegpunkte",
    replaceWarning:
      "Das Ersetzen der Strecke berechnet alle Positionen im Rennen neu. Vor dem Start durchführen.",
    parseError: "Datei konnte nicht gelesen werden",
    noGpx: "Kein GPX",
    pointCount: "{count} Punkte",
    current: "Aktuelle Strecke",
    replace: "Strecke ersetzen",

    purpose:
      "Sie ist der Verlauf, der die GPS-Koordinate jedes Fahrzeugs in „Kilometer 42 des Rennens“ verwandelt. Ohne sie gibt es weder die Fensterberechnung zwischen Führung und Schluss noch den Vorschlag des auf der Straße nächstgelegenen Fahrzeugs.",
    missingExplain:
      "Keine Strecke. Ohne sie kann das System weder sagen, auf welchem Kilometer sich ein Fahrzeug befindet, noch das Fenster berechnen.",
    sourceGpx: "Importiert aus {filename}",
    sourceDrawn: "Auf der Karte gezeichnet",
    geometryPoints: "Geometriepunkte",
    reviewTitle: "Prüfung vor dem Speichern",
    warningsTitle: "{count} Auffälligkeit(en) in dieser Datei",
    confirmUse: "Bestätigen und diese Strecke verwenden",
    chooseAnotherFile: "Andere Datei wählen",
    noFileYet: "Noch keine Streckendatei zur Hand?",
    vertices: "Stützpunkte",
    saveDrawn: "Strecke speichern",
    deleteVertex: "Stützpunkt löschen",
    closeLoop: "Rundkurs schließen",
    tooManyVertices:
      "{count} Stützpunkte sind mehr, als eine von Hand gezeichnete Strecke haben sollte (Grenze {limit}). Ist die Strecke wirklich so lang, importieren Sie eine GPX-Datei.",
    oneVertex:
      "Ein einzelner Stützpunkt ist noch keine Strecke. Klicken Sie auf die Karte, um zu markieren, wo das Rennen entlangführt.",
    savedTitle: "Strecke gespeichert",
    savedReplaced: "die vorherige Strecke wurde deaktiviert.",
    saveErrorTitle: "Speichern nicht möglich",
    saveFailed:
      "Die Strecke konnte nicht gespeichert werden. Prüfen Sie die Verbindung und versuchen Sie es erneut.",
    saveConnectionLost:
      "Die Verbindung ist während der Übertragung abgebrochen. Die vorherige Strecke gilt weiter — versuchen Sie es erneut.",
    fileUnreadable:
      "Die Datei konnte nicht von der Festplatte gelesen werden. Kopieren Sie sie in einen anderen Ordner und versuchen Sie es erneut.",
    fileNotGpx:
      "Diese Datei konnte nicht interpretiert werden. Prüfen Sie, ob es eine .gpx ist und ob sie sich in einem anderen Programm öffnen lässt.",

    uploadTooLarge:
      "Die übertragene Strecke ist zu groß. Schneiden Sie die Datei auf den Rennabschnitt zu.",
    uploadBadBody: "Anfragekörper nicht lesbar.",
    uploadBadSource: "Herkunft der Strecke unbekannt.",
    uploadBadPoints: "Streckenpunkte ungültig.",
    uploadTooManyVertices:
      "Eine von Hand gezeichnete Strecke sollte nicht mehr als {limit} Stützpunkte haben.",
    uploadBuildFailed: "Aus diesen Punkten ließ sich keine Strecke erzeugen.",
    uploadReleaseFailed:
      "Die vorherige Strecke konnte nicht freigegeben werden. Laden Sie die Seite neu und versuchen Sie es erneut.",
    uploadInsertFailed:
      "Die Strecke konnte nicht gespeichert werden. Die vorherige Strecke gilt weiter.",
  },

  positions: {
    title: "Begleitfahrzeuge",
    intro:
      "Jedes Begleitfahrzeug des Rennens wird zu einer Position mit eigenem Code. Der Fahrer gibt den Code auf seinem Telefon ein — ohne App-Installation, ohne Konto — und ab dann überträgt das Gerät die Position dieses Fahrzeugs.",
    add: "Fahrzeug hinzufügen",
    addBulk: "Mehrere hinzufügen",
    addHint:
      "Jede Position entsteht mit einem eigenen Verbindungscode und einem Namen, den Sie später ändern können. Das erste Führungsfahrzeug und das erste Schlussfahrzeug werden gleich als Referenz markiert.",
    quantity: "Anzahl",
    label: "Bezeichnung",
    role: "Rolle",
    driverName: "Fahrer/in",
    driverPhone: "Telefon",
    driverPhoneHint: "Mit Ländervorwahl bei ausländischen Nummern.",
    noDriver: "Fahrer nicht angegeben",
    plate: "Kennzeichen",
    referenceLead: "Ist das offizielle Führungsfahrzeug",
    referenceSweep: "Ist das offizielle Schlussfahrzeug",
    markLead: "Als Führungsfahrzeug markieren",
    markSweep: "Als Schlussfahrzeug markieren",
    dispatchable: "Kann zu Meldungen entsandt werden",
    code: "Verbindungscode",
    codeRevoked: "widerrufen — erzeugen Sie einen neuen",
    codeExpired: "abgelaufen — erzeugen Sie einen neuen",
    codeHidden: "Nur wer das Rennen bearbeitet, sieht die Codes.",
    copyCode: "Code kopieren",
    copied: "kopiert",
    regenerateCode: "Neuen Code erzeugen",
    regenerateWarning:
      "Der aktuelle Code wird ungültig. Ein bereits verbundener Fahrer überträgt weiter, bis die Verbindung getrennt wird.",
    moveUp: "{position} nach oben",
    moveDown: "{position} nach unten",
    confirmRemove: "Wirklich entfernen?",
    orderHint:
      "die Reihenfolge der Liste ist die Reihenfolge im Live-Leitstand.",
    emptyTitle: "Keine Fahrzeuge angelegt",
    emptyBody:
      "Eine Position ist eine Rolle im Rennen („Motorrad 3“, „Rettungswagen 1“), kein Gerät. Das Telefon wird erst danach über den Code verbunden — und kann mitten im Rennen gewechselt werden, wenn ein Akku leer ist, ohne den Verlauf zu verlieren.",
    emptyStart:
      "Beginnen Sie mit dem Führungs- und dem Schlussfahrzeug: Sie definieren das Fenster, das die Rennleitung überwacht.",
    missingRefsTitle: "Referenzen des Fensters fehlen",
    missingRefsBody:
      "Ohne beide kann der Leitstand die Zeit zwischen Spitze und Ende des Feldes nicht berechnen.",
    bound: "Verbunden",
    notBound: "Wartet auf Verbindung",
    revokeSession: "Gerät trennen",

    print: "Codes drucken",
    printTitle: "Verbindungscodes — {race}",
    printHint:
      "Geben Sie jeden Code vor dem Start an die Fahrerin oder den Fahrer des jeweiligen Fahrzeugs.",
    printLost:
      "Geht ein Blatt verloren, erzeugen Sie im Fahrzeugbildschirm einen neuen Code: der alte verliert sofort seine Gültigkeit.",
    printInstruction:
      "Jeder Fahrer öffnet {url} auf dem Telefon und gibt den Code seines Blocks ein.",
    printUrlMissing: "(Adresse der App)",
    printNoUrlTitle: "Adresse der App nicht konfiguriert",
    printNoUrlBody:
      "Die Variable {variable} ist leer, daher wird das Blatt ohne die Adresse gedruckt, die der Fahrer öffnen muss. Schreiben Sie die Adresse vor dem Verteilen von Hand dazu.",
    printMissing:
      "{count} Position(en) ohne gültigen Code sind auf diesem Blatt nicht enthalten. Erzeugen Sie im Fahrzeugbildschirm neue Codes.",
    printExpired:
      "{count} Code(s) auf diesem Blatt sind abgelaufen und verbinden kein Telefon mehr. Erzeugen Sie vor dem Drucken neue Codes.",
    printNothingTitle: "Nichts zu drucken",
    printNothingBody: "Legen Sie zuerst die Begleitfahrzeuge an.",
    printFooter:
      "der Code gilt nur für dieses Rennen und nur für dieses Fahrzeug. Ein neues Telefon zu verbinden trennt das vorherige.",

    form: {
      invalidData: "Ungültige Daten.",
      roleInvalid: "Wählen Sie eine gültige Rolle.",
      quantityInteger: "Die Anzahl muss eine ganze Zahl sein.",
      quantityMin: "Fügen Sie mindestens 1 Fahrzeug hinzu.",
      quantityMax: "Fügen Sie höchstens 40 Fahrzeuge auf einmal hinzu.",
      labelRequired:
        "Das Fahrzeug braucht einen Namen — damit ruft die Rennleitung es über Funk.",
      labelTooLong: "Name zu lang (maximal 60 Zeichen).",
      driverNameTooLong: "Name des Fahrers zu lang (maximal 120 Zeichen).",
      phoneTooLong: "Telefonnummer zu lang.",
      phoneInvalid:
        "Ungültige Telefonnummer. Nur Ziffern, mit Ländervorwahl bei ausländischen Nummern.",
      plateTooLong: "Kennzeichen zu lang.",
      notFound: "Fahrzeug nicht gefunden. Laden Sie die Seite neu.",
      referenceCleared:
        "Achtung: Das Rennen hat jetzt keine Referenz für {reference} — legen Sie vor dem Start eine fest.",
      codeGenerationFailed:
        "Eindeutige Codes lassen sich gerade nicht erzeugen. Versuchen Sie es in einigen Sekunden erneut.",
      codeIssueUnavailable:
        "Auf diesem Server lässt sich kein neuer Code ausstellen.",
      codeNoneFree:
        "Es ließ sich kein freier Code ziehen. Versuchen Sie es in einigen Sekunden erneut.",
      codeRevokedMeanwhile:
        "Der vorherige Code wurde bereits widerrufen — dieses Fahrzeug bleibt ohne Code, bis Sie es erneut versuchen.",
    },
  },

  map: {
    fitRoute: "Strecke einpassen",
    followMe: "Meinem Fahrzeug folgen",
    vehicles: "Fahrzeuge",
    showAll: "Alle anzeigen",
    noWebGL:
      "Dieser Browser unterstützt kein WebGL. Die Positionsdaten in den Listen bleiben korrekt.",
    basemapLabel: "Hintergrundkarte",
    basemapHint:
      "Gilt nur für dieses Rennen. Die Streckenlinie wechselt die Farbe mit, damit sie auf dem gewählten Hintergrund nicht verschwindet.",
    basemapAsphalt: "Asphalt",
    basemapAsphaltHint:
      "Klare Linien, kein Relief. Er lenkt am wenigsten von den Fahrzeugen ab — die richtige Wahl für ein Stadtrennen und für die projizierte Leinwand in der Rennleitung.",
    basemapTopo: "Topografisch",
    basemapTopoHint:
      "Höhenlinien, Steigung und Nebenstraßen. Der einzige Hintergrund, der den Anstieg zeigt, bevor er kommt — bei einem Bergrennen ändert das, was über Funk gesagt wird.",
    basemapSatellite: "Satellit",
    basemapSatelliteHint:
      "Luftbild. Nützlich, um zu prüfen, ob die Straße im GPX wirklich die Rennstrecke ist, und um einen Versorgungspunkt an dem zu erkennen, was tatsächlich vor Ort steht.",
    slowTitle: "Die Karte ist nicht fertig geladen.",
    slowBody:
      "Das kann an einem Tab im Hintergrund liegen, an fehlendem WebGL oder an im Netz blockierten Kartenkacheln. Die Kilometer, das Fenster und die Fahrzeugliste daneben bleiben korrekt.",
  },

  live: {
    snapshotErrorTitle: "Der Live-Leitstand konnte nicht aufgebaut werden",
    snapshotErrorBody:
      "Das Rennen existiert, aber der Live-Zustand konnte nicht gelesen werden. Laden Sie die Seite neu; hält es an, prüfen Sie Ihre Verbindung zur Datenbank.",
    noRoute:
      "Dieses Rennen hat keine aktive Strecke. Ohne sie gibt es keine Karte, keine Kilometrierung und kein Fenster Führung ↔ Schluss.",
    clockNote:
      "Das Datenalter wird gegen die Serveruhr gemessen, nicht gegen die dieses Rechners. Uhrzeiten in der Zeitzone des Rennens ({timezone}).",
    // "nicht zur Kenntnis genommen" é correto e burocrático demais para um
    // rodapé denso lido de relance. "unbestätigt" é curto e preserva a
    // distinção entre ABERTO e NÃO RECONHECIDO, que o sistema trata como
    // estados diferentes.
    unacknowledged: "{count} unbestätigte Meldung(en).",
    moreUnacknowledged: "+{count} offen",
    viewOnMap: "auf der Karte zeigen",

    sortByRace: "Position im Rennen",
    sortByOrdinal: "Anlagereihenfolge",
    noSignalGroup: "Kein Signal ({count}) — die Position auf der Karte ist eine Erinnerung",
    noPositions: "In diesem Rennen ist kein Fahrzeug angelegt.",
    offRoute: "abseits der Strecke",
    clockOff: "Uhr nicht synchron",
    fromTrack: "{distance} von der Strecke",

    panelOk: "Live-Leitstand",
    panelDegraded: "Leitstand eingeschränkt",
    panelDown: "LEITSTAND OHNE VERBINDUNG",
    reconciled: "abgeglichen {age}",
    realtime: "Echtzeit: {state}",
    realtimeOn: "aktiv",
    realtimeConnecting: "verbindet…",
    realtimeOff: "abgebrochen",
    notPresent:
      "Was auf dem Bildschirm steht, ist nicht die Gegenwart. Bestätigen Sie alles über Funk.",
    pollingOnly: "keine sofortige Aktualisierung; Abgleich alle {interval}",
    refreshNow: "jetzt aktualisieren",
    refreshing: "wird aktualisiert…",
    soundOff: "Ton aus — einschalten",
    soundOn: "Signalton aktiv",

    showClosed: "{count} abgeschlossen",
    hideClosed: "abgeschlossene ausblenden",
    showAllVehicles: "alle Fahrzeuge anzeigen",
    showFewer: "weniger anzeigen",
    history: "Verlauf",
    hideHistory: "Verlauf ausblenden",
    loadingHistory: "Verlauf wird geladen…",
    noEvents: "Kein Ereignis erfasst.",

    startedAt: "Start um {time}",
    finishedAt: "beendet um {time}",
    confirmStart: "Start bestätigen",
    confirmFinish: "Abschluss bestätigen",
  },

  auth: {
    errorTitle: "Es konnte nicht fortgefahren werden",
    noticeTitle: "Fast geschafft",
    name: "Ihr Name",
    nameHint: "Für das Rennteam sichtbar.",
    namePlaceholder: "Marina Ferrero",
    nameRequired: "Geben Sie Ihren Namen an — er ist für das Rennteam sichtbar.",
    nameTooLong: "Name zu lang (maximal 80 Zeichen).",
    email: "E-Mail",
    emailPlaceholder: "rennleitung@ihrrennen.de",
    emailRequired: "Geben Sie die E-Mail-Adresse an.",
    emailInvalid:
      "Diese E-Mail-Adresse wirkt nicht gültig. Prüfen Sie, ob das @ oder die Domain fehlt.",
    password: "Passwort",
    passwordHint: "Mindestens 8 Zeichen.",
    passwordRequired: "Geben Sie das Passwort an.",
    passwordTooShort: "Das Passwort muss mindestens 8 Zeichen haben.",
    passwordTooLong: "Das Passwort darf höchstens 72 Zeichen haben.",
    passwordRepeat: "Passwort wiederholen",
    passwordMismatch:
      "Die beiden Passwörter stimmen nicht überein. Geben Sie sie erneut ein.",
    submitting: "Bitte warten…",
    signIn: "Zum Leitstand",
    signUp: "Konto anlegen",
    haveAccount: "Sie haben schon ein Konto?",
    signInLink: "Anmelden",
    firstTime: "Zum ersten Mal hier?",
    signUpLink: "Konto für die Rennleitung anlegen",

    confirmSent:
      "Konto angelegt. Wir haben eine Bestätigungs-E-Mail an {email} geschickt. Bestätigen Sie sie und kommen Sie zum Anmelden hierher zurück (prüfen Sie auch den Spam-Ordner).",
    invalidCredentials:
      "E-Mail oder Passwort falsch. Wenn Sie sich gerade registriert haben, bestätigen Sie die E-Mail vor dem Anmelden.",
    emailNotConfirmed:
      "Diese E-Mail-Adresse ist noch nicht bestätigt. Öffnen Sie unsere Nachricht und klicken Sie auf den Link (prüfen Sie den Spam-Ordner).",
    userExists:
      "Mit dieser E-Mail-Adresse besteht bereits ein Konto. Gehen Sie zur Anmeldung; haben Sie das Passwort vergessen, fordern Sie über Supabase ein neues an.",
    emailRejected:
      "Der Server hat diese E-Mail-Adresse abgelehnt. Verwenden Sie eine echte Adresse, die Sie jetzt öffnen können — die Bestätigung geht dorthin.",
    weakPassword:
      "Passwort für den Server zu schwach. Verwenden Sie mindestens 8 Zeichen aus Buchstaben und Ziffern.",
    rateLimited:
      "Zu viele Versuche in kurzer Zeit. Warten Sie einige Minuten, bevor Sie es erneut versuchen.",
    signupDisabled:
      "Die Registrierung ist auf diesem Server deaktiviert. Bitten Sie jemanden aus dem Team, Ihr Konto anzulegen.",
    genericFailure:
      "Das war jetzt nicht möglich. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
  },

  errors: {
    forbidden: "Sie haben keine Berechtigung, dieses Rennen zu ändern.",
    raceNotFound: "Rennen nicht gefunden.",
    invalidRace: "Ungültiges Rennen.",
    sessionExpired: "Ihre Sitzung ist abgelaufen. Melden Sie sich erneut an.",
    notStartable: "Nur ein Rennen im Entwurf oder im Status bereit lässt sich starten.",
    listRaces:
      "Laden Sie die Seite neu. Hält es an, melden Sie sich ab und wieder an — Ihre Sitzung kann abgelaufen sein.",
    noChange:
      "Nichts hat sich geändert: Die Meldung wurde womöglich schon von jemand anderem geschlossen, oder Sie haben in diesem Rennen keine Rechte mehr. Laden Sie die Seite neu.",

    db: {
      saveFailed:
        "Speichern nicht möglich. Versuchen Sie es erneut; hält es an, laden Sie die Seite neu.",
      routeRaceConflict:
        "Während Ihrer Arbeit wurde in diesem Rennen eine andere Strecke aktiviert. Laden Sie die Seite neu und senden Sie erneut — die neuere Strecke gewinnt.",
      bindCodeTaken:
        "Der gezogene Code kollidiert mit einem, der in einem anderen Rennen schon benutzt wird. Klicken Sie erneut auf Speichern: es wird ein neuer Code gezogen.",
      oneLead:
        "Dieses Rennen hat bereits eine Referenz für die Führung. Heben Sie die aktuelle auf, bevor Sie eine andere setzen.",
      oneSweep:
        "Dieses Rennen hat bereits eine Referenz für den Schluss. Heben Sie die aktuelle auf, bevor Sie eine andere setzen.",
      ordinalConflict:
        "Zwei Fahrzeuge haben dieselbe Reihenfolge. Laden Sie die Seite neu und sortieren Sie erneut.",
      sessionTaken:
        "Mit diesem Fahrzeug ist bereits ein Telefon verbunden. Widerrufen Sie die aktuelle Verbindung, bevor Sie eine neue anlegen.",
      leadSweepSame:
        "Dasselbe Fahrzeug kann nicht Referenz für Führung und Schluss zugleich sein — die Fensterberechnung würde das Fahrzeug mit sich selbst vergleichen.",
      gapWindowIncoherent:
        "Der Mindestwert des Fensters muss kleiner als der Höchstwert sein.",
      targetGapRange: "Das Zielfenster muss zwischen 1 und 600 Minuten liegen.",
      raceNameLength: "Der Name des Rennens muss zwischen 1 und 200 Zeichen haben.",
      positionLabelLength: "Der Name des Fahrzeugs muss zwischen 1 und 60 Zeichen haben.",
      bindCodeFormat: "Der erzeugte Code hat ein unerwartetes Format. Versuchen Sie es erneut.",
      trackDistance: "Die Strecke muss eine Länge größer als null haben.",
      trackPoints: "Die Strecke braucht mindestens 2 Punkte.",
      duplicate:
        "Dieser Datensatz existiert bereits. Laden Sie die Seite neu, um den aktuellen Stand zu sehen.",
      checkViolation:
        "Ein Wert liegt außerhalb des Zulässigen. Prüfen Sie die Felder und versuchen Sie es erneut.",
      missingRace:
        "Das referenzierte Rennen existiert nicht mehr. Kehren Sie zur Rennliste zurück.",
      notFound:
        "Datensatz nicht gefunden — er kann von jemand anderem entfernt worden sein. Laden Sie die Seite neu.",
    },
  },
};
