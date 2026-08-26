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
      basemapInvalid: "Wählen Sie eine der verfügbaren Karten.",
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

    why: {
      target: "{position}",
      eta: "~{minutes} Min.",
      uncertainAnchor: "POSITION UNSICHER: Der Ankerpunkt auf der Strecke wurde per Stichentscheid gewählt — bestätigen Sie über Funk, bevor Sie sich auf diese Entfernung verlassen",
      ahead: "{distance} vor dem Alarm (muss umkehren)",
      behind: "{distance} hinter dem Alarm, in Rennrichtung",
      straightOnly: "{distance} Luftlinie — keine Position auf der Strecke, die Straßenentfernung ist größer",
      speedMeasured: "gemessene Durchschnittsgeschwindigkeit {speed} km/h",
      speedNominal: "Zeit aus Nenngeschwindigkeit geschätzt ({speed} km/h): keine aktuelle Bewegung gemessen",
      lastSeen: "letzte Position vor {seconds} s",
      offSpecialty: "{role} ist nicht die Fachrichtung für {category} — nach Nähe vorgeschlagen",
      noOrigin: "Keine Ursprungsposition für den Alarm: kein Vorschlag berechenbar.",
      noneSuggested: "Keine Hilfe vorgeschlagen.",
      noneDispatchable: "Kein alarmierbares Fahrzeug für dieses Rennen erfasst.",
      count: "{count} Vorschlag/Vorschläge für {category}.",
      uncertainCount: "{count} Kandidat(en) mit mehrdeutigem Ankerpunkt — Entfernung nicht verlässlich.",
      ignoredBusy: "{count} bereits zu einem anderen Alarm geschickt.",
      ignoredNoSignal: "{count} wegen verlorenem Signal übergangen.",
      ignoredRole: "{count} nicht alarmierbar.",
      escalated: "ESKALIERT: kein Fahrzeug der passenden Fachrichtung verfügbar; {role} geschickt.",
      allStraight: "Alle Luftlinie: keine Position auf der Strecke zum Vergleichen.",
      takenMeanwhile: "Alle Kandidaten wurden während der Alarmierung von anderen Alarmen belegt.",
      manual: "{position} — von Hand durch die Rennleitung geschickt.",
    },
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
    api: {
      badJson: "Der Anfragetext ist kein gültiges JSON.",
      pingsNotArray: "Das Feld pings muss ein Array sein.",
      bodyTooLarge: "Ein Text von {bytes} Bytes liegt über dem Limit von {limit}.",
      bodyOverLimit: "Text über dem Limit von {limit} Bytes.",
      noBody: "Anfrage ohne Text.",
      bodyReadFailed: "Der Anfragetext konnte nicht gelesen werden.",
      bodyNotObject: "Der Anfragetext muss ein JSON-Objekt sein.",
      batchTooLarge: "Ein Paket mit {count} Pings überschreitet das Maximum von {max}. Teilen Sie den Versand auf.",
      alertSaveFailed: "Der Alarm konnte nicht gespeichert werden. Lassen Sie ihn in der Warteschlange und melden Sie ihn über Funk.",
      confirmKindInvalid: "Ungültige Bestätigungsart: {kind}.",
      alertNotFound: "Alarm in diesem Rennen nicht gefunden.",
      confirmFailed: "Die Bestätigung konnte nicht gespeichert werden. Versuchen Sie es erneut.",
      actionInvalid: "Ungültige Aktion: {action}.",
      bindRateLimited: "Zu viele Versuche hintereinander. Warten Sie {minutes} min und prüfen Sie den Code mit der Rennleitung.",
      bindLookupFailed: "Der Code konnte nicht geprüft werden. Versuchen Sie es erneut.",
      bindRaceFailed: "Das Rennen zu diesem Code konnte nicht geladen werden.",
      bindFailed: "Die Verknüpfung konnte nicht abgeschlossen werden. Versuchen Sie es in ein paar Sekunden erneut.",
      bindUnknownCode: "Code nicht erkannt. Prüfen Sie die 6 Zeichen mit der Rennleitung.",
      takenOver: "ein anderes Gerät hat diese Position übernommen",
      positionsFailed: "Die Positionen des Rennens konnten nicht geladen werden.",
      notBound: "Dieses Gerät ist mit keiner Position verknüpft.",
      sessionCheckFailed: "Die Sitzung konnte nicht geprüft werden. Das Gerät bleibt verknüpft; neuer Versuch läuft.",
      sessionUnknown: "Der Server kennt diese Verknüpfung nicht. Bitten Sie die Rennleitung um einen neuen Code.",
      sessionRevokedWhy: "Verknüpfung von der Rennleitung beendet: {reason}",
      sessionRevoked: "Diese Verknüpfung wurde von der Rennleitung beendet. Bitten Sie um einen neuen Code.",
      positionGone: "Die mit diesem Gerät verknüpfte Position existiert nicht mehr.",
      pingBadId: "clientPingId ist keine gültige UUID.",
      pingNoCoord: "Koordinate fehlt oder ist keine Zahl.",
      pingOutOfRange: "Koordinate außerhalb des gültigen geografischen Bereichs.",
      pingNullIsland: "Koordinate (0, 0) — ungültige GPS-Messung.",
      pingInaccurate: "Genauigkeit von {accuracy} m über dem Limit von {limit} m.",
      pingBadDate: "recordedAt ist kein gültiges ISO-8601-Datum.",
      pingFuture: "recordedAt liegt {minutes} min in der Zukunft — die Geräteuhr geht falsch.",
    },
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
    report: "Abschlussbericht",
    reportHint: "PDF mit gemessenem Fenster, Vorfällen und Konvoi.",

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

    segmentMissing: "Die gewählte Spur ist nicht in der Datei.",
    segmentTooManyPoints: "Diese Spur hat {count} Punkte, über dem Limit von {limit}. Schneiden Sie die Datei auf den Rennabschnitt zu.",
    pointsMissing: "Die Liste der Streckenpunkte ist nicht angekommen.",
    pointsTooMany: "Die Strecke hat {count} Punkte, über dem Limit von {limit}. Schneiden Sie die Datei vor dem Hochladen auf den Rennabschnitt zu.",
    pointMalformed: "Punkt {index} ist fehlerhaft.",
    pointBadLat: "Punkt {index} hat einen ungültigen Breitengrad ({value}).",
    pointBadLng: "Punkt {index} hat einen ungültigen Längengrad ({value}).",
    etaUnknown: "geschätzte Zeit nicht verfügbar",
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
    dragHandle: "{position} zum Umsortieren ziehen",
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
    warnStates: "Die Live-Positionen der Fahrzeuge konnten nicht gelesen werden.",
    warnSessions: "Die Geräteverknüpfungen konnten nicht gelesen werden.",
    warnAlerts: "Die Alarme konnten nicht gelesen werden: {detail}",
    warnPositions: "Die Positionen konnten nicht gelesen werden: {detail}",
    warnGeometry: "Streckengeometrie nicht verfügbar: {detail} Der belegte Abschnitt wird nicht gezeichnet.",
    snapshotErrorTitle: "Der Live-Leitstand konnte nicht aufgebaut werden",
    snapshotErrorBody:
      "Das Rennen existiert, aber der Live-Zustand konnte nicht gelesen werden. Laden Sie die Seite neu; hält es an, prüfen Sie Ihre Verbindung zur Datenbank.",
    noRoute:
      "Dieses Rennen hat keine aktive Strecke. Ohne sie gibt es keine Karte, keine Kilometrierung und kein Fenster Führung ↔ Schluss.",
    clockNote: "Zeiten nach der Serveruhr · Zeitzone des Rennens ({timezone})",
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
    confirmFinishBody: "Nimmt der gesamten Mannschaft, die noch unterwegs ist, die Karte weg — und das Panel macht das nicht rückgängig.",
  },

  auth: {
    gateTitle: "Bereiten Sie das Rennen vorher vor.",
    gateTitleStrong: "Am Renntag nur noch zuschauen.",
    gateCodes: "Verknüpfungscodes",
    loginTitle: "Panel der Rennleitung",
    loginSubtitle: "Melden Sie sich an, um das Rennen vorzubereiten: Strecke, Begleitpositionen und Verknüpfungscodes.",
    signupSubtitle: "Das Konto gehört Ihnen, und die Rennen, die Sie anlegen, sehen nur Sie. Fahrer brauchen kein Konto — sie steigen mit dem sechsstelligen Code ein.",
    forgotLink: "Passwort vergessen?",
    recoverTitle: "Zugang wiederherstellen",
    recoverSubtitle: "Geben Sie die E-Mail-Adresse des Kontos ein. Falls es existiert, senden wir einen Link für ein neues Passwort.",
    recoverSubmit: "Link senden",
    recoverSent: "Falls ein Konto mit {email} existiert, ist der Link unterwegs. Er funktioniert einmal und läuft ab.",
    metaRecover: "Zugang wiederherstellen — Flamme Rouge",
    newPasswordTitle: "Neues Passwort",
    newPasswordSubtitle: "Wählen Sie das Passwort, mit dem Sie sich am Panel anmelden.",
    newPasswordSubmit: "Passwort speichern",
    passwordChanged: "Passwort geändert.",
    recoverExpired: "Dieser Link gilt nicht mehr. Fordern Sie unter «Passwort vergessen?» einen neuen an.",
    metaNewPassword: "Neues Passwort — Flamme Rouge",
    metaLogin: "Anmelden — Flamme Rouge",
    metaSignup: "Konto erstellen — Flamme Rouge",
    errorTitle: "Es konnte nicht fortgefahren werden",
    noticeTitle: "Fast geschafft",
    confirmedTitle: "Konto bestätigt",
    confirmed: "Fertig. Ihr Konto ist aktiv und Sie sind bereits angemeldet.",
    confirmFailed: "Das Konto konnte nicht bestätigt werden. Der Link aus der E-Mail funktioniert nur einmal und läuft ab — legen Sie das Konto mit derselben Adresse erneut an, um einen neuen zu erhalten.",
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

  landing: {
    skip: "Zum Inhalt springen",

    nav: {
      problem: "Das Problem",
      measures: "Was die Straße misst",
      screens: "Die zwei Bildschirme",
      aria: "Abschnitte der Seite",
      home: "Flamme Rouge, Startseite",
      markerStart: "KM 000 — START",
    },

    hero: {
      title: "Rennleitung in Echtzeit,",
      titleStrong: "auf der Straße gemessen.",
      lead: "Jedes Begleitfahrzeug auf der Strecke in Echtzeit. Der Abstand zwischen Führungsfahrzeug und Schlussfahrzeug wie eine Zwischenzeit gemessen, nicht geschätzt. Und die Hilfe nach der Strecke ausgewählt, die das Fahrzeug tatsächlich fahren muss.",
      ctaPanel: "Rennleitung öffnen",
      ctaDriver: "Ich bin Fahrer und habe einen Code",
      note: "Die Flamme Rouge markiert den letzten Kilometer. Hier markiert sie die Zahl, die die Rennleitung braucht: wie viel noch fehlt, gemessen statt geschätzt.",
      scroll: "Weiterscrollen",
    },

    numbers: {
      aria: "Im Test gemessene Zahlen",
      unitKm: "km",
      unitPoints: "Punkte",
      unitChars: "Zeichen",
      roadLabel: "Auf der Straße",
      roadBody: "Trennten das Motorrad von dem Sturz, den es scheinbar vor Augen hatte. Luftlinie waren es 50 Meter. Das System schickte den Rettungswagen, der 1,5 km dahinter war.",
      offlineLabel: "Ohne Empfang",
      offlineBody: "In zwei Minuten ohne Netz gesammelt, kamen sie vollständig, in der richtigen Reihenfolge und ohne Dubletten an, sobald das Signal zurück war.",
      codeLabel: "Zum Einsteigen",
      codeBody: "Mehr tippt der Fahrer nicht. Kein Konto, keine App, keine Geräte zum Kaufen und wieder Einsammeln.",
    },

    problem: {
      marker: "Was heute passiert",
      title: "Das Rennen läuft über Funk.",
      titleStrong: "Und der Funk reicht nicht ins Tal.",
      lead: "Nichts davon ist die Schuld der Veranstalter. Es ist das, was übrig bleibt, wenn die einzige Positionsquelle jemand ist, der aus dem Gedächtnis sagt, wo er glaubt zu sein.",
      photo: "Foto · auseinandergezogenes Feld",
      q1: "„Wo ist das Schlussfahrzeug?“",
      a1: "Die Antwort ist eine Schätzung, und auf ihrer Grundlage wird die Straße freigegeben — und die mit der Verkehrsbehörde vereinbarte Sperrzeit eingehalten oder eben nicht. Zehn Minuten zu viel brechen die Vereinbarung; zehn zu wenig öffnen die Straße zu früh.",
      q2: "„Am km 60 ist jemand gestürzt.“",
      a2: "Wer hat es gehört? Wer ist hingefahren? Solange niemand über Funk antwortet, lässt sich „der Ruf kam nie an“ nicht von „der Ruf kam an und sie sind unterwegs“ unterscheiden.",
      q3: "„Schick die nächste Begleitung.“",
      a3: "Die nächste — wie gemessen? Auf der Papierkarte ist die Entfernung das, was das Auge sagt — und das Auge weiß nicht, dass dieser Abschnitt der Rückweg ist und die Straße erst 30 km weiter wieder zusammenläuft.",
      q4: "„Der Fahrer hat es nicht verstanden.“",
      a4: "Bei einem internationalen Rennen spricht die Begleitmannschaft vier Sprachen. Der Funk spricht eine, und das halbstündige Briefing vor dem Start ist längst vorbei.",
      q5: "„Rennen beendet.“",
      a5: "Und es bleibt kein Protokoll darüber, wer wann wo war, wann der Alarm ausgelöst wurde und wie lange die Hilfe brauchte. Der Verband fragt später; es antwortet das Gedächtnis der Mannschaft.",
    },

    measures: {
      marker: "Was die Straße misst",
      title: "Sechs technische Entscheidungen,",
      titleStrong: "die verändern, was auf dem Bildschirm steht.",
      diagramAria: "Schema einer Hin- und Rückstrecke. Die Sturzstelle liegt auf dem Hinweg; das Motorrad ist auf dem Rückweg, 50 Meter Luftlinie entfernt, aber 37,3 Kilometer auf der Straße. Der Rettungswagen ist 1,5 Kilometer hinter dem Sturz, auf demselben Abschnitt und in derselben Richtung.",
      diagramMoto: "**0,05 km** Luftlinie zwischen Motorrad und Sturz. Das ist die Zahl, die ein geometrisches Näherungssystem verwendet — danach wäre das Motorrad geschickt worden.",
      diagramRoute: "**37,3 km** auf der Straße, im selben Moment: Das Motorrad ist auf dem Rückweg und müsste die ganze Schleife gegen die Rennrichtung zurückfahren.",
      diagramAmb: "**1,5 km** dahinter, auf demselben Abschnitt und in derselben Richtung: der Rettungswagen, den das System geschickt hat.",
      diagramNote: "Schema nicht maßstabsgetreu. Zahlen auf einer echten Teststrecke gemessen.",
      leadTitle: "Entfernung auf der Straße, nicht Luftlinie.",
      leadBody1: "In einem echten Test war ein Motorrad **0,05 km** Luftlinie von einem Sturz entfernt und **37,3 km** auf der Straße — auf dem Rückweg der Strecke, mit der einzigen Verbindung zwischen beiden siebenunddreißig Kilometer weiter. Das System schickte den Rettungswagen, der **1,5 km dahinter** war, in derselben Fahrtrichtung wie das Rennen.",
      leadBody2: "Ein System, das Koordinaten vergleicht, hätte das Motorrad geschickt, und das Motorrad hätte das ganze Rennen gebraucht, um anzukommen. Wer die Stelle bereits passiert hat, zahlt zusätzlich den Preis, eine Wendemöglichkeit zu finden und gegen die Fahrtrichtung zurückzufahren — und diese Asymmetrie geht in die Rechnung ein.",
      c2Title: "Der Abstand Führung↔Schluss wird gemessen, nicht geschätzt.",
      c2Tag: "gemessen",
      c2Body: "Das System merkt sich, wann das Führungsfahrzeug jeden Punkt der Strecke passiert hat. Wenn das Schlussfahrzeug km 42 erreicht, ist der Abstand die Differenz zweier beobachteter Zeiten — dieselbe Rechnung wie bei einer Zwischenzeit. Das ist die Zahl, die die Organisation mit der Verkehrsbehörde vereinbart hat: Es ist die Durchfahrt des Schlussfahrzeugs, die die Straße dem Verkehr zurückgibt. Wenn die Historie noch nicht reicht, schreibt der Bildschirm „projiziert“ und nennt den Grund. Die Rennleitung muss nie raten, welches von beiden sie liest.",
      c3Title: "Funktioniert ohne Empfang.",
      c3Tag: "40 Punkte",
      c3Body: "Nichts wird gesendet, bevor es auf dem Gerät gespeichert ist, und nichts verlässt die Warteschlange, bevor der Server den Empfang bestätigt. In einem zweiminütigen Test ohne Netz kamen alle 40 gesammelten Punkte vollständig, in der richtigen Reihenfolge und ohne Dubletten an, sobald das Signal zurück war.",
      c4Title: "Ein Alarm scheitert nie stillschweigend.",
      c4Tag: "lokale Warteschlange",
      c4Body: "Ein Alarm drängt sich vor jeden GPS-Ping und wird wiederholt, bis der Server bestätigt — ein Hilferuf wird nie verworfen, selbst wenn das eine Warteschlange bedeutet, die nicht leer wird. Und die richtige Hilfe wird nach Kategorie alarmiert, ohne dass jemand mitten im Notfall wählen muss: Ein Sturz ruft den Rettungswagen, ein Defekt den Mechaniker.",
      c5Title: "Jedes Handy wird zum GPS des Fahrzeugs.",
      c5Tag: "6 Zeichen",
      c5Body: "Der Fahrer öffnet den Link, tippt den sechsstelligen Code vom Briefing-Blatt ein, und sein Handy wird zum Tracker dieses Fahrzeugs. Keine App zu installieren, keine Geräte zu kaufen, laden, verteilen und am Abend wieder einzusammeln.",
      c6Title: "Sechs Sprachen, ein einziger Link.",
      c6Tag: "6 Sprachen",
      c6Body: "Die Sprache steht nicht in der URL — das Gerät handelt sie aus. Derselbe Link und derselbe gedruckte QR-Code liefern dem brasilianischen Fahrer Portugiesisch, dem Italiener Italienisch und dem Österreicher Deutsch, ohne dass die Rennleitung irgendetwas verwaltet. Ein auf pt-PT eingestelltes Handy bekommt Portugiesisch, nicht Englisch.",
      summaryLabel: "Kurz gesagt",
      summary: "Sechs Entscheidungen, eine Wirkung: Die Rennleitung fragt nicht mehr, wo welches Auto ist.",
    },

    how: {
      marker: "So funktioniert es",
      title: "Drei Schritte vor dem Start.",
      titleStrong: "Keiner währenddessen.",
      step: "Schritt {n}",
      s1Title: "Strecke laden.",
      s1Body: "Das GPX des Rennens oder die auf dem Bildschirm gezeichnete Linie. Die Strecke wird einmal indexiert, und aus ihr stammt jede später gemessene Entfernung — die Position jedes Fahrzeugs, der Abstand und die Wahl der Hilfe.",
      s2Title: "Codeblatt erzeugen.",
      s2Body: "Ein sechsstelliger Code pro Fahrzeug, mit der jeweiligen Rolle: Führung, Schluss, Besenwagen, Rettungswagen, Mechaniker, Motorrad, Streckenposten. Das Blatt kommt fertig zum Ausdrucken und Verteilen beim Briefing.",
      s3Title: "Am Renntag das Panel öffnen.",
      s3Body: "Jeder Fahrer öffnet den Link, tippt den Code ein und erscheint auf der Karte in der Sprache seines eigenen Handys. Während des Rennens gibt es nichts mehr einzustellen.",
    },

    screens: {
      marker: "Die zwei Bildschirme",
      title: "Ein Rennleitungsraum.",
      titleStrong: "Ein Handy pro Fahrzeug.",
      panelEyebrow: "Panel der Rennleitung",
      panelTitle: "Was die Rennleitung sieht",
      altHero: "Blick vom Rennmotorrad auf eine nasse Kopfsteinpflasterstraße, zwei Fahrer voraus im Gegenlicht der tiefen Sonne, und der rote Bogen des letzten Kilometers, der mit hängendem Wimpel darüber verläuft.",
      altPanel: "Panel der Rennleitung: Streckenkarte mit den Begleitfahrzeugen, der Abstand zwischen Führung und Schluss als gemessen markiert, und die Alarmliste.",
      altApp: "Fahrer-App auf dem Telefon: die Fahrzeugrolle, das gemessene Fenster zwischen Führungs- und Schlussfahrzeug, der Sendestatus und die Alarmtasten.",
      zoom: "Vergrößern",
      altPave: "Kopfsteinpflasterstraße, die sich bei Sonnenuntergang durch Hügel windet, drei Fahrer Hunderte Meter voneinander entfernt und ein Begleitfahrzeug in einer der Lücken — das Rennen ist kein Feld mehr.",
      panelCapture: "Screenshot · Panel der Rennleitung",
      p1: "Live-Karte mit allen Fahrzeugen, jede Rolle in ihrer Farbe und mit dem Alter ihrer Daten.",
      p2: "Abstand zwischen Führung und Schluss, als gemessen oder projiziert gekennzeichnet.",
      p3: "Alarmliste mit der bereits vorgeschlagenen nächsten Hilfe — und dem Grund für den Vorschlag im Klartext.",
      p4: "Verbindungszustand Fahrzeug für Fahrzeug: wer live ist, wer verzögert, wer verschwunden ist.",
      appEyebrow: "Fahrer-App",
      appTitle: "Was der Fahrer sieht",
      appCapture: "Screenshot · Fahrer-App",
      a1: "Einstieg mit dem sechsstelligen Code. Kein Konto, kein App-Store.",
      a2: "Große Alarmknöpfe, für behandschuhte Hand und fahrendes Auto.",
      a3: "Sendet bei ausgeschaltetem Bildschirm weiter und sammelt alles, wenn das Signal abreißt.",
      a4: "In der Sprache des Geräts, über denselben Link, den alle bekommen haben.",
    },

    close: {
      marker: "Flamme Rouge",
      title: "Zwei Türen.",
      titleStrong: "Keine Entscheidung dazwischen.",
      lead: "Die Rennleitung meldet sich mit einem Konto an und baut das Rennen auf. Der Fahrer steigt mit dem Code ein und muss nichts weiter entscheiden.",
      aria: "Ins System einsteigen",
      directorTitle: "Ich bin von der Rennleitung",
      directorBody: "Rennen anlegen, Strecke laden, Codes erzeugen und den Betrieb live verfolgen.",
      directorCta: "Panel öffnen →",
      driverTitle: "Ich bin Fahrer",
      driverBody: "Geben Sie den sechsstelligen Code der Rennleitung ein, und das Handy wird zum GPS Ihrer Position.",
      driverCta: "Mit Code einsteigen →",
    },

    contact: {
      eyebrow: "Kontakt",
      title: "Sprechen Sie mit dem, der es gebaut hat.",
      body: "Erzählen Sie uns, welches Rennen Sie organisieren und was Sie lösen müssen. Es antwortet die Person, die das System geschrieben hat — in Ihrer Sprache.",
      name: "Ihr Name",
      email: "E-Mail",
      organization: "Organisation",
      message: "Nachricht",
      messagePlaceholder: "Welches Rennen Sie organisieren, wie viele Begleitfahrzeuge, und wann es stattfindet.",
      send: "Senden",
      sending: "Wird gesendet…",
      sentTitle: "Angekommen.",
      sentBody: "Ich antworte an die Adresse, die Sie hinterlassen haben — in der Sprache, in der Sie geschrieben haben.",
      orWrite: "Oder schreiben Sie direkt an",
      failed: "Das Senden hat gerade nicht geklappt. Ihre Nachricht steht noch da — kopieren Sie sie und schicken Sie sie an",
      tooMany: "Zu viele Nachrichten von hier in kurzer Zeit. Warten Sie einen Moment, oder schreiben Sie an",
      nameRequired: "Nennen Sie Ihren Namen — so beginnt die Antwort.",
      emailRequired: "Ich brauche eine E-Mail-Adresse für die Antwort.",
      emailInvalid: "Diese E-Mail sieht nicht gültig aus. Prüfen Sie das @ und die Domain.",
      messageRequired: "Schreiben Sie, was Sie brauchen — auch eine Zeile reicht.",
      messageTooLong: "Nachricht zu lang (höchstens 4000 Zeichen).",
    },
    footer: {
      marker: "Straße wieder offen",
      tagline: "Rennleitung in Echtzeit für den Straßenradsport.",
      languages: "Sechs Sprachen, ein einziger Link",
      languagesNote: "Dieselbe Adresse und derselbe QR-Code geben jedem Gerät die Oberfläche in seiner Sprache — ohne dass die Rennleitung etwas verwalten muss.",
      enter: "Anmelden",
      credits: "ein Werkzeug von",
    },

    meta: {
      title: "Flamme Rouge — Rennleitung in Echtzeit für den Straßenradsport",
      description: "Die Position jedes Begleitfahrzeugs auf der Straße gemessen, der Abstand zwischen Führung und Schluss wie eine Zwischenzeit gemessen, und Alarme, die nach Kategorie die richtige Hilfe schicken. Das GPS ist das Handy des Fahrers.",
      ogTitle: "Flamme Rouge — Rennleitung in Echtzeit",
      ogDescription: "In einem echten Test war ein Motorrad 0,05 km Luftlinie und 37,3 km auf der Straße von einem Sturz entfernt. Das System schickte den Rettungswagen 1,5 km dahinter.",
    },
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

  /*
   * O RELATÓRIO FINAL, EM PDF.
   *
   * Fica aqui e não num arquivo próprio porque a garantia que importa é a do
   * tipo `Dictionary`: chave que falte em um idioma quebra o build. Um
   * documento que sai à prefeitura com metade das frases em outra língua é
   * pior que um que não sai.
   */
  report: {
    kicker: "Abschlussbericht des Rennens",
    generated: "Dokument erstellt am {quando} aus der Positionsaufzeichnung des Konvois.",
    windowSection: "Das Rennfenster",
    maxObserved: "größtes gemessenes",
    noLimit: "In den Renndaten wurde keine Obergrenze angegeben.",
    over: "Über der mit der Verkehrsbehörde vereinbarten Grenze von {min} Min.",
    within: "Innerhalb der mit der Verkehrsbehörde vereinbarten Grenze von {min} Min.",
    measuredIn: "Auf {pct} des Rennens gemessen anhand der Durchfahrt beider Referenzfahrzeuge durch denselben Punkt der Straße. Der Rest ist geschätzt oder konnte nicht ermittelt werden und ist im Dokument entsprechend gekennzeichnet.",
    cannotMeasure: "Konnte nicht gemessen werden",
    noDataAtAll: "Es lagen nicht genug Daten vor, um das Fenster dieses Rennens zu ermitteln.",
    summaryTitle: "1 · Zusammenfassung",
    windowPair: "Das Fenster Führungs- ↔ Schlussfahrzeug",
    authorized: "genehmigt",
    notDeclared: "nicht angegeben",
    minLabel: "kleinstes",
    avgLabel: "Durchschnitt",
    maxLabel: "größtes",
    onlyMeasured: "Kleinstes, Durchschnitt und größtes berücksichtigen nur tatsächlich gemessene Zeitpunkte — {medidos} von {total} Punkten der Reihe. Geschätzte Werte gehen nicht in Statistiken ein, die das Dokument behauptet.",
    rescue: "Hilfeleistung",
    incidents: "Vorfälle",
    medianArrive: "mediane Zeit bis zum Eintreffen",
    unresolved: "nicht abgeschlossen",
    convoy: "Konvoi",
    vehicles: "Fahrzeuge",
    avgSignal: "durchschnittliche Signalabdeckung",
    route: "Strecke",
    period: "Zeitraum",
    periodLine: "Beginn {inicio} · Abschluss {fim}",
    timezone: " · Zeitzone {fuso}",
    tailWarning: "Hinweis: Der Konvoi hat {tempo} vor dem erfassten Abschluss aufgehört zu senden. Der Zeitraum oben ist der im System angegebene, nicht die Zeit, in der auf der Straße Rennen war.",
    chartTitle: "2 · Das Fenster, Minute für Minute",
    howToRead: "So ist es zu lesen",
    legMeasured: "Gemessen — {n} Punkte. Zeitunterschied zwischen der Durchfahrt beider Fahrzeuge durch denselben Punkt der Straße.",
    legDeduced: "Abgeleitet — {n} Punkte. Aus der Geschwindigkeit geschätzt oder auf einer bereits veralteten Position beruhend. Nicht beobachtet.",
    legNoLine: "Keine Linie — {n} Punkte. Es gab keine verlässliche Position beider Fahrzeuge. Die Lücke wird benannt, nicht verborgen.",
    legOvershoot: "Roter Bereich — Abschnitt, in dem das Fenster das Genehmigte überschritt.",
    axes: "Senkrechte Achse in Fensterminuten; waagerecht die Ortszeit des Rennens. Die Reihe wird aus der auf dem Server gespeicherten Positionsaufzeichnung rekonstruiert.",
    chartCannot: "Das Fenster konnte nicht ermittelt werden",
    blocksTitle: "3 · Sperrpunkte",
    blocksNone: "Für dieses Rennen wurden keine Sperrpunkte erfasst. Ohne sie kann der Bericht nicht angeben, wie lange jede Kreuzung gesperrt war.",
    colKm: "km",
    colPoint: "Punkt",
    colClosed: "gesperrt",
    colReopened: "freigegeben",
    colDuration: "Dauer",
    blocksLead: "„Gesperrt\" ist die Durchfahrt des Führungsfahrzeugs an diesem Kilometer, „freigegeben\" die des Schlussfahrzeugs. Die Dauer jedes Punktes ist das dort gemessene Fenster. Was hinter dem Schlussfahrzeug folgt — Begleitmotorräder, Mechaniker, Krankenwagen und der Besenwagen — fährt bereits bei für den Verkehr freigegebener Straße.",
    blocksMissing: "nicht ermittelt",
    blocksNoSweep: "Das Schlussfahrzeug hat keine Position gesendet, daher bleibt die Spalte zur Freigabe leer.",
    incidentsTitle: "4 · Vorfälle",
    incidentsNone: "In diesem Rennen wurde kein Hilferuf erfasst.",
    called: "Ruf {hora}",
    calledBy: "von {quem}",
    handledBy: "bearbeitet von {quem}",
    acknowledged: "bestätigt {hora}",
    dispatched: "entsandt {hora}",
    onScene: "vor Ort {hora}",
    closed: "abgeschlossen {hora}",
    noEvents: "keine Ereignisse nach dem Ruf erfasst",
    toArrive: "bis zum Eintreffen: {valor}",
    toClose: "bis zum Abschluss: {valor}",
    notRecorded: "nicht erfasst",
    notClosed: "nicht abgeschlossen",
    convoyTitle: "5 · Der Konvoi",
    colVehicle: "Fahrzeug",
    colDriver: "Fahrer",
    colPlate: "Kennzeichen",
    colSignal: "Signal",
    isLead: " · Führung",
    isSweep: " · Schluss",
    never: "nie",
    outages: "Signalausfälle über zwei Minuten",
  },

  /* A tela que a direção usa para podar e nomear os pontos de bloqueio. */
  blockpoints: {
    title: "Sperrpunkte",
    lead: "Wo jemand steht und den Verkehr anhält: Kreisverkehr, Kreuzung, Einmündung. Der Abschlussbericht nennt, wie lange jeder gesperrt war.",
    detect: "Aus der Karte erkennen",
    detecting: "Suche Kreuzungen…",
    detected: "{n} Kreuzungen gefunden. Schalten Sie aus, was keine Sperre ist.",
    detectedNone: "Für diese Strecke wurden auf OpenStreetMap keine neuen Kreuzungen gefunden.",
    detectAgain: "Erneut erkennen",
    empty: "Noch keine Punkte erfasst.",
    noRoute: "Erfassen Sie zuerst die Strecke: Punkte werden nach Kilometer entlang ihr gesetzt.",
    add: "Punkt hinzufügen",
    km: "km",
    name: "Name",
    namePlaceholder: "Kreisverkehr Via Roma × SP 422",
    unnamed: "ohne Namen",
    detectedTag: "erkannt",
    active: "Im Bericht zählen",
    remove: "Entfernen",
    saving: "speichern",
    outOfRoute: "Außerhalb der Strecke, die {km} km lang ist.",
    partial: "Bis km {ate} von {total} abgesucht. Erneut tippen, um fortzufahren.",
    swept: "Gesamte Strecke abgesucht.",
  },
};
