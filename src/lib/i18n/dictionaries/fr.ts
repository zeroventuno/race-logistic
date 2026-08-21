import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * Français. Terminologie des commissaires FFC / UCI. Vouvoiement partout.
 *
 * `sweep_car` = VOITURE DE FIN DE COURSE (elle lève la fermeture de la route).
 * `broom_wagon` = VOITURE BALAI (dernier véhicule, ramasse les abandons).
 * La fenêtre calculée par le panneau est ouvreuse ↔ fin de course.
 */
export const fr: Dictionary = {
  meta: {
    appName: "Flamme Rouge",
    tagline: "Direction de course en direct",
  },

  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    close: "Fermer",
    edit: "Modifier",
    remove: "Retirer",
    add: "Ajouter",
    retry: "Réessayer",
    loading: "Chargement…",
    saving: "Enregistrement…",
    search: "Rechercher",
    none: "Aucun",
    unknown: "Inconnu",
    optional: "facultatif",
    required: "obligatoire",
    yes: "Oui",
    no: "Non",
    error: "Une erreur est survenue",
    errorRetry: "L'opération a échoué. Réessayez.",
    offline: "Hors connexion",
    online: "Connecté",
    language: "Langue",
    logout: "Se déconnecter",
  },

  roles: {
    lead_car: { label: "Voiture ouvreuse", short: "Ouvreuse" },
    sweep_car: { label: "Voiture de fin de course", short: "Fin de course" },
    broom_wagon: { label: "Voiture balai", short: "Balai" },
    moto: { label: "Moto d'assistance", short: "Moto" },
    ambulance: { label: "Ambulance", short: "Ambulance" },
    mechanic: { label: "Assistance mécanique", short: "Mécanique" },
    support_car: { label: "Voiture d'assistance", short: "Assistance" },
    marshal: { label: "Commissaire de parcours", short: "Commissaire" },
    other: { label: "Autre", short: "Autre" },
  },

  signal: {
    live: "En direct",
    delayed: "En retard",
    stale: "Non actualisé",
    lost: "Signal perdu",
    never: "Non associé",
    lastSeen: "Dernière position {age}",
  },

  race: {
    status: {
      draft: "Brouillon",
      armed: "Prête",
      live: "En cours",
      finished: "Terminée",
      archived: "Archivée",
    },
    distance: "Distance",
    elevation: "Dénivelé",
    start: "Départ",
    positions: "Véhicules d'assistance",
    route: "Parcours",
    noStart: "Aucune heure de départ",
    details: "Données de la course",
    lapsTotal: "{laps} tours = {distance} de course.",
    lap: "tour {lap}/{laps}",
    lapsCircuit: "circuit de {laps} tours",
    lapUnknown: "tour ?",

    form: {
      nameLabel: "Nom de la course",
      namePlaceholder: "Giro delle Langhe — 2ᵉ étape",
      nameRequired:
        "Donnez un nom à la course — c'est ainsi que vous la retrouverez dans la liste.",
      nameTooLong: "Nom trop long (200 caractères maximum).",
      locationLabel: "Lieu",
      locationHint: "Ville ou région du départ. Apparaît dans la liste des courses.",
      locationPlaceholder: "Alba, Piémont",
      locationTooLong: "Lieu trop long (200 caractères maximum).",
      dateLabel: "Date du départ",
      dateRequired: "Indiquez aussi la date du départ.",
      timeLabel: "Heure du départ",
      timeHint: "À l'heure locale du lieu de course.",
      timeRequired: "Indiquez aussi l'heure du départ.",
      dateTimeInvalid: "Date ou heure invalide. Vérifiez les deux champs.",
      timezoneLabel: "Fuseau horaire de la course",
      timezoneHint:
        "Tout ce que la direction voit est converti dans ce fuseau, y compris sur le téléphone du conducteur.",
      timezoneRequired: "Choisissez le fuseau horaire du lieu de course.",
      timezoneUnknown: "Fuseau horaire inconnu.",
      basemapInvalid: "Choisissez l'une des cartes disponibles.",
      lapsLabel: "Tours de parcours",
      lapsHint:
        "1 pour une course en ligne. Sur circuit, la distance de course est le tracé multiplié par les tours.",
      lapsRequired: "Indiquez le nombre de tours.",
      lapsInteger: "Le nombre de tours doit être un entier.",
      lapsMin: "Une course compte au moins 1 tour.",
      lapsMax: "50 tours au maximum.",
      gapHint:
        "Combien de minutes la direction veut entre la voiture ouvreuse et celle de fin de course. C'est à partir de là que le panneau décide si le peloton s'est étiré ou resserré.",
      targetLabel: "Fenêtre visée (minutes)",
      targetRequired: "Indiquez la fenêtre visée en minutes.",
      targetInteger: "La fenêtre visée doit être un nombre entier de minutes.",
      targetMin: "La fenêtre visée doit être d'au moins 1 minute.",
      targetMax: "La fenêtre visée ne peut pas dépasser 600 minutes (10 heures).",
      minLabel: "Alerter en dessous de (minutes)",
      minHint: "Peloton trop resserré.",
      minInteger: "La limite basse doit être un nombre entier de minutes.",
      minNegative: "La limite basse ne peut pas être négative.",
      minMax: "La limite basse ne peut pas dépasser 600 minutes.",
      minAboveTarget:
        "Le minimum ne peut pas dépasser la fenêtre visée ({target} min).",
      maxLabel: "Alerter au-dessus de (minutes)",
      maxHint: "Peloton trop étiré.",
      maxInteger: "La limite haute doit être un nombre entier de minutes.",
      maxMin: "La limite haute doit être d'au moins 1 minute.",
      maxMax: "La limite haute ne peut pas dépasser 600 minutes.",
      maxBelowMin: "La limite haute doit être supérieure au minimum ({min} min).",
      maxBelowTarget:
        "Le maximum ne peut pas être inférieur à la fenêtre visée ({target} min).",
      showLimits: "Définir les seuils d'alerte",
      saved: "Données de la course mises à jour",
      afterSave: "Après l'enregistrement, vous passez directement au parcours.",
    },
  },

  gap: {
    title: "Fenêtre ouvreuse ↔ fin de course",
    short: "Fenêtre",
    targetLabel: "Fenêtre visée",
    target: "Objectif : {duration}",
    measured:
      "Mesurée par l'écart d'horaire de passage des deux véhicules au même point.",
    projected:
      "Estimée : {distance} sur le parcours, à la vitesse moyenne actuelle de la voiture de fin de course ({speed}).",
    noLead: "Voiture ouvreuse sans position. Associez son appareil.",
    noSweep: "Voiture de fin de course sans position. Associez son appareil.",
    noBoth: "En attente de la position des deux véhicules de référence.",
    sweepAhead:
      "La voiture de fin de course est devant l'ouvreuse. Vérifiez que les rôles ne sont pas inversés.",
    sweepStopped:
      "Distance sur le parcours : {distance}. Voiture de fin de course à l'arrêt — temps indéterminé.",
    noHistory:
      "Distance sur le parcours : {distance}. Historique insuffisant pour la convertir en temps.",
    stale: "Donnée de {age} — peut ne pas refléter la position actuelle.",
    overTarget: "Au-dessus de la fenêtre visée",
    underTarget: "En dessous de la fenêtre visée",

    timeSeparation: "écart en temps",
    alongRoad: "sur la route",
    methodMeasured: "Mesurée",
    methodProjected: "Estimée",
    methodNone: "Aucune donnée",
    withinTarget: "Dans la fenêtre",
    overTargetDetail: "trop étiré",
    underTargetDetail: "trop resserré",
    comparisonSuspended:
      "Comparaison avec la fenêtre visée suspendue tant que la donnée n'est pas fiable",
    noLimits: "Aucun seuil défini pour cette course",
    clockSuspect:
      "L'horloge d'un des appareils de référence est décalée par rapport au serveur. Tant que cela dure, l'âge de la donnée et la mesure ne sont pas fiables — confirmez la position par radio.",
    lapsUncertain:
      "Course sur circuit de {laps} tours : l'historique chargé ne remonte pas au départ, le comptage des tours peut donc être sous-estimé et la fenêtre plus large qu'affichée.",
    onTarget: "Fenêtre {gap}, convenu {target}. Rien à corriger.",
    verdictAhead: "Fenêtre {gap}, convenu {target} — {drift} d'avance.",
    verdictBehind: "Fenêtre {gap}, convenu {target} — {drift} de retard.",
    remedyAhead: "Ralentissez la voiture de fin de course.",
    remedyBehind: "Accélérez la voiture de fin de course.",
    costAhead:
      "La route rouvre plus tôt que prévu et les coureurs restés derrière perdent leur protection trop tôt.",
    costBehind:
      "La fermeture dépasse la durée autorisée par l'autorité de circulation.",
  },

  alerts: {
    title: "Alertes",
    none: "Aucune alerte active",
    raise: "Déclencher une alerte",
    categories: {
      medical: { label: "Chute / ambulance", short: "Chute" },
      mechanical: { label: "Problème mécanique", short: "Mécanique" },
      other: { label: "Autre", short: "Autre" },
    },
    status: {
      open: "Ouverte",
      acknowledged: "Prise en compte",
      dispatched: "Assistance envoyée",
      en_route: "En route",
      on_scene: "Sur place",
      resolved: "Résolue",
      cancelled: "Annulée",
    },
    priority: {
      critical: "Critique",
      high: "Élevée",
      normal: "Normale",
    },
    confirmMedical: "Confirmer l'appel d'urgence",
    confirmMedicalBody:
      "L'ambulance la plus proche est envoyée immédiatement et le lieu est signalé sur la carte de toute l'équipe.",
    sending: "Envoi…",
    queued: "En file d'attente — pas de réseau. Les tentatives continuent.",
    delivered: "Reçue par la direction",
    failed: "Échec de l'envoi — nouvelle tentative",
    at: "au km {km}",
    raisedBy: "Déclenchée par {position}",
    noteLabel: "Description (facultative)",
    notePlaceholder: "Que s'est-il passé ?",

    storageFailedTitle: "ALERTE NON ENREGISTRÉE SUR CET APPAREIL — PASSEZ PAR LA RADIO.",
    storageFailedBody:
      "Le stockage local a refusé l'écriture ({reason}). Rien ne sera renvoyé automatiquement.",
    retryCount: "{count} tentative(s) sans succès. Prévenez par radio.",
    unknownFailure: "échec inconnu",
    nobodyDispatched: "Personne n'a été envoyé sur cette alerte.",

    why: {
      target: "{position}",
      eta: "~{minutes} min",
      uncertainAnchor: "POSITION INCERTAINE : le point d'ancrage sur le parcours a été choisi par départage — confirmez par radio avant de vous fier à cette distance",
      ahead: "{distance} devant l'alerte (doit faire demi-tour)",
      behind: "{distance} derrière l'alerte, dans le sens de la course",
      straightOnly: "{distance} à vol d'oiseau — pas de position sur le parcours, la distance par la route est plus grande",
      speedMeasured: "vitesse moyenne mesurée {speed} km/h",
      speedNominal: "temps estimé sur vitesse nominale ({speed} km/h) : aucun déplacement récent mesuré",
      lastSeen: "dernière position il y a {seconds} s",
      offSpecialty: "{role} n'est pas la spécialité pour {category} — suggéré par proximité",
      noOrigin: "Pas de position d'origine pour l'alerte : aucune suggestion calculable.",
      noneSuggested: "Aucune assistance suggérée.",
      noneDispatchable: "Aucun véhicule mobilisable enregistré pour cette course.",
      count: "{count} suggestion(s) pour {category}.",
      uncertainCount: "{count} candidat(s) avec un ancrage ambigu — distance peu fiable.",
      ignoredBusy: "{count} déjà envoyé(s) sur une autre alerte.",
      ignoredNoSignal: "{count} ignoré(s) pour signal perdu.",
      ignoredRole: "{count} non mobilisable(s).",
      escalated: "ESCALADE : aucun véhicule de la spécialité disponible ; envoyé {role}.",
      allStraight: "Tous à vol d'oiseau : aucune position sur le parcours à comparer.",
      takenMeanwhile: "Tous les candidats ont été pris par d'autres alertes pendant l'envoi.",
      manual: "{position} — envoyé à la main par la direction.",
    },
    dispatch: {
      youWereCalled: "Vous êtes appelé",
      calling: "Envoi de {position}",
      called: "{position} envoyée",
      reason: "{position}, {distance} {direction} sur le parcours, ~{eta}",
      ahead: "devant",
      behind: "derrière",
      onMyWay: "J'arrive",
      cantGo: "Je ne peux pas",
      arrived: "Je suis sur place",
      enRoute: "{position} est en route",
      onScene: "{position} est sur place",
      declined: "{position} n'a pas pu intervenir",
      reassigning: "Envoi du prochain véhicule disponible…",
      noneAvailable:
        "Aucun véhicule disponible pour cette catégorie. La direction doit intervenir manuellement.",
      declineReason: "Motif (facultatif)",
      reassign: "Changer de véhicule",
      dispatch: "Envoyer un véhicule",
      auto: "automatique",
      fallbackNoPosition:
        "Aucune suggestion calculée et aucune position sur le parcours — ordre arbitraire. Confirmez par radio.",
      fallbackReason:
        "Aucune suggestion calculée. {distance} d'écart sur le parcours, sans calcul de demi-tour ni de délai estimé.",
    },

    proximity: {
      ahead: "{category} à {distance} devant",
      passing: "Vous passez au niveau de l'alerte",
      dismiss: "Compris",
    },

    confirm: {
      prompt: "Vous êtes passé sur place. Le problème est-il toujours là ?",
      still_there: "Toujours là",
      cleared: "Déjà dégagé",
      not_found: "Rien vu",
      thanks: "Merci — la direction a été informée.",
      countStillThere: "{count} confirment",
      countCleared: "{count} disent que c'est dégagé",
    },

    actions: {
      acknowledge: "Prendre en compte",
      resolve: "Résoudre",
      cancel: "Annuler l'alerte",
      confirmCancel: "confirmer ? (fausse alerte)",
      resolutionNote: "Ce qui a été fait",
    },
  },

  driver: {
    bindTitle: "Saisissez le code de votre véhicule",
    bindSubtitle:
      "La direction de course vous a donné un code de 6 caractères. Il associe ce téléphone à votre rôle dans la course.",
    bindPlaceholder: "ABC-123",
    bindAction: "Associer",
    bindInvalid: "Code invalide. Vérifiez les 6 caractères et réessayez.",
    bindNotFound: "Code introuvable ou expiré. Contactez la direction.",
    bindTooManyAttempts:
      "Trop de tentatives. Patientez un instant avant de réessayer.",
    bindPasteHint:
      "Vous pouvez coller. Les lettres O et I sont lues comme 0 et 1 — le code n'utilise pas ces lettres.",
    boundAs: "Vous êtes {position} sur {race}",
    unbind: "Dissocier cet appareil",
    unbindConfirm:
      "La dissociation arrête la transmission de la position du véhicule. Confirmer ?",
    revoked:
      "Cet appareil a été dissocié par la direction. Demandez un nouveau code.",

    gpsPermissionTitle: "Nous avons besoin de votre position",
    gpsPermissionBody:
      "L'application utilise le GPS pour afficher votre véhicule sur la carte de la direction. Sans cela, personne ne voit où vous êtes.",
    gpsDenied:
      "Autorisation de localisation refusée. Activez-la dans les réglages du navigateur puis rechargez.",
    gpsUnavailable: "GPS indisponible sur cet appareil.",
    gpsSearching: "Recherche du signal GPS…",
    gpsNoApi:
      "Ce navigateur ne fournit pas la localisation. Utilisez Chrome ou Safari sur téléphone.",
    gpsNoFix:
      "Pas de signal GPS. En tunnel ou en parking c'est normal ; le suivi reprend tout seul.",
    gpsTimeout: "Le GPS tarde à répondre. Les tentatives continuent.",
    gpsFailed: "Position impossible à obtenir. Le suivi continue d'essayer.",
    gpsDeniedIOS:
      "Localisation bloquée. Sur iPhone : Réglages → Safari → Position → Demander, puis rechargez cette page. Si vous utilisez l'application Chrome : Réglages → Chrome → Position.",
    gpsDeniedAndroid:
      "Localisation bloquée. Sur Android : touchez le cadenas à côté de l'adresse → Autorisations → Position → Autoriser, puis rechargez la page.",
    gpsDeniedBrowser:
      "Localisation bloquée par le navigateur. Autorisez l'accès à la position dans les autorisations du site puis rechargez la page.",

    gapWarning: "Vous êtes resté {age} sans émettre.",
    gapWarningBody:
      "La direction de course n'a pas vu votre position pendant ce temps. Gardez cet écran au premier plan et le téléphone branché.",
    tapToDismiss: "toucher pour fermer",
    alertNotSaved:
      "ALERTE NON ENREGISTRÉE SUR CE TÉLÉPHONE — UTILISEZ LA RADIO MAINTENANT.",
    alertNotSavedDetail:
      "Le stockage local a refusé l'écriture ({reason}). Rien ne sera renvoyé tout seul.",
    alertAttempts: "{count} tentative(s) sans succès. Prévenez par radio.",
    api: {
      badJson: "Le corps de la requête n'est pas du JSON valide.",
      pingsNotArray: "Le champ pings doit être un tableau.",
      bodyTooLarge: "Un corps de {bytes} octets dépasse la limite de {limit}.",
      bodyOverLimit: "Corps au-dessus de la limite de {limit} octets.",
      noBody: "Requête sans corps.",
      bodyReadFailed: "Impossible de lire le corps de la requête.",
      bodyNotObject: "Le corps de la requête doit être un objet JSON.",
      batchTooLarge: "Un lot de {count} pings dépasse le maximum de {max}. Divisez l'envoi.",
      alertSaveFailed: "L'alerte n'a pas pu être enregistrée. Gardez-la en file et prévenez par radio.",
      confirmKindInvalid: "Type de confirmation invalide : {kind}.",
      alertNotFound: "Alerte introuvable dans cette course.",
      confirmFailed: "Impossible d'enregistrer la confirmation. Réessayez.",
      actionInvalid: "Action invalide : {action}.",
      bindRateLimited: "Trop de tentatives d'affilée. Attendez {minutes} min et vérifiez le code avec la direction.",
      bindLookupFailed: "Impossible de vérifier le code. Réessayez.",
      bindRaceFailed: "Impossible de charger la course de ce code.",
      bindFailed: "Impossible de terminer la liaison. Réessayez dans quelques secondes.",
      bindUnknownCode: "Code non reconnu. Vérifiez les 6 caractères avec la direction de course.",
      takenOver: "un autre appareil a repris cette position",
      positionsFailed: "Impossible de charger les positions de la course.",
      notBound: "Cet appareil n'est lié à aucune position.",
      sessionCheckFailed: "Impossible de valider la session. L'appareil reste lié ; nouvelle tentative en cours.",
      sessionUnknown: "Le serveur ne reconnaît pas cette liaison. Demandez un nouveau code à la direction.",
      sessionRevokedWhy: "Liaison terminée par la direction : {reason}",
      sessionRevoked: "Cette liaison a été terminée par la direction. Demandez un nouveau code.",
      positionGone: "La position liée à cet appareil n'existe plus.",
      pingBadId: "clientPingId n'est pas un UUID valide.",
      pingNoCoord: "Coordonnée absente ou non numérique.",
      pingOutOfRange: "Coordonnée hors de l'intervalle géographique valide.",
      pingNullIsland: "Coordonnée (0, 0) — relevé GPS invalide.",
      pingInaccurate: "Précision de {accuracy} m au-dessus de la limite de {limit} m.",
      pingBadDate: "recordedAt n'est pas une date ISO 8601 valide.",
      pingFuture: "recordedAt est {minutes} min dans le futur — horloge de l'appareil déréglée.",
    },
    transmitting: "Transmission active",
    paused: "En pause",
    queuedPings: "{count} points en attente",
    queuedAlerts: "{count} alerte(s) non transmise(s). Prévenez par radio.",
    pingRejected: "POSITION REFUSÉE",
    pingRejectedDetail:
      "Le serveur a refusé {count} position(s) : votre position N'APPARAÎT PAS sur la carte de la direction.",
    queueNotDurable:
      "Stockage local indisponible : la file est perdue si l'application se ferme.",
    batteryWarning: "Batterie faible — pensez à brancher.",
    keepAwake: "Écran maintenu allumé",
    keepScreenOpen:
      "Gardez cet écran ouvert pendant la course. La position part automatiquement, même avec un signal faible.",
  },

  director: {
    dashboard: "Tableau de bord",
    myRaces: "Mes courses",
    myRacesSubtitle:
      "Chaque course a son parcours, ses véhicules d'assistance et ses codes.",
    newRace: "Nouvelle course",
    newRaceSubtitle:
      "L'essentiel pour l'instant. Le parcours et les véhicules viennent aux étapes suivantes et restent modifiables jusqu'au départ.",
    createAndContinue: "Créer la course et passer au parcours",
    noRaces: "Vous n'avez encore créé aucune course.",
    noRacesAction: "Créer la première course",
    setupChecklist: "Avant le passage en direct",
    needsRoute: "Charger le parcours",
    needsPositions: "Enregistrer les véhicules d'assistance",
    needsLead: "Définir la voiture ouvreuse",
    needsSweep: "Définir la voiture de fin de course",
    needsBinding: "{count} véhicule(s) sans appareil associé",
    ready: "Tout est prêt",
    goLive: "Démarrer la course",
    finish: "Terminer la course",

    areaOverline: "Espace direction de course",
    filterAll: "Toutes",
    filterReady: "Prêtes",
    filterPreparing: "En préparation",
    filterFinished: "Terminées",
    noneInFilter: "Aucune course dans cet état.",
    openRace: "Ouvrir",
    openRecord: "Compte rendu",
    supportShort: "Assistance",
    listErrorBody:
      "Rechargez la page. Si cela persiste, déconnectez-vous et reconnectez-vous — votre session a peut-être expiré.",
    steps: "Étapes de la course",
    overview: "Résumé",
    live: "En direct",
    resolveItem: "Régler",
    pendingCount: "{count} point(s) en attente",
    readOnly: "Lecture seule",
    readOnlyRoute:
      "Vous participez à cette course en observateur et ne pouvez pas modifier le parcours.",
    markReady: "Marquer la course comme prête",
    marking: "Enregistrement…",
    backToDraft: "Revenir au brouillon",
    reverting: "Retour en cours…",
    resolveBlockingFirst: "Réglez d'abord les points obligatoires.",

    checklist: {
      routeLabel: "Parcours chargé",
      routeHint:
        "Chargez le GPX de la course ou dessinez le tracé sur la carte. Sans parcours, pas de kilométrage ni de calcul de fenêtre.",
      positionsLabel: "Véhicules d'assistance enregistrés",
      positionsHint:
        "Enregistrez les véhicules d'assistance. Chacun reçoit un code que son conducteur saisit sur son téléphone.",
      leadLabel: "Référence ouvreuse définie",
      leadHint:
        "Indiquez quel véhicule est la voiture ouvreuse. C'est le début de la fenêtre que la direction surveille.",
      sweepLabel: "Référence fin de course définie",
      sweepHint:
        "Indiquez quel véhicule est la voiture de fin de course. C'est son passage qui rouvre la route et ferme la fenêtre.",
      startLabel: "Heure de départ",
      startHint:
        "Facultatif, mais c'est ce qui fait afficher un compte à rebours au panneau au lieu d'une simple horloge.",
    },

    empty: {
      intro:
        "Une course est prête à passer en direct quand elle a un parcours, des véhicules d'assistance et les références ouvreuse et fin de course définies. Trois étapes :",
      step1Title: "Enregistrez la course",
      step1Body:
        "Nom, lieu, départ et la fenêtre visée entre la voiture ouvreuse et celle de fin de course. Une minute.",
      step2Title: "Chargez le parcours",
      step2Body:
        "Envoyez le GPX que vous avez déjà, ou dessinez le tracé sur la carte. C'est ce qui transforme une position GPS en kilomètre de course.",
      step3Title: "Enregistrez les véhicules et imprimez les codes",
      step3Body:
        "Chaque moto, ambulance et voiture d'assistance reçoit un code de 6 caractères. Le conducteur le saisit sur son propre téléphone et c'est tout — rien à installer, aucun compte à créer.",
    },
  },

  route: {
    uploadTitle: "Charger le parcours",
    uploadSubtitle: "Envoyez le fichier GPX de la course.",
    uploadAction: "Choisir un fichier GPX",
    uploadDrop: "Déposez le fichier ici",
    uploadHint:
      "Ou cliquez pour en choisir un. Ce qui sort de Strava, Garmin Connect, RideWithGPS, Komoot ou du logiciel de tracé de la course convient.",
    uploadReading: "Les gros fichiers prennent quelques secondes.",
    drawInstead: "Ou dessinez le parcours sur la carte",
    drawTitle: "Dessiner le parcours",
    drawHint: "Cliquez sur la carte pour ajouter des points. Glissez pour ajuster.",
    drawShortcuts:
      "Suppr efface le sommet sélectionné (ou clic droit dessus). Ctrl+Z annule.",
    undo: "Annuler",
    clear: "Effacer",
    chooseSegment:
      "Le fichier contient plusieurs parcours. Choisissez celui de la course :",
    chooseSegmentHint:
      "Le fichier contient {count} tracés. Les réunir créerait un saut au milieu de la course : choisissez-en un.",
    segmentName: "Tracé {number}",
    kindTrack: "trace enregistrée",
    kindRoute: "itinéraire planifié",
    kindWaypoints: "points isolés",
    replaceWarning:
      "Remplacer le parcours recalcule toutes les positions en course. Faites-le avant le départ.",
    parseError: "Impossible de lire le fichier",
    noGpx: "Pas de GPX",
    pointCount: "{count} points",
    current: "Parcours actuel",
    replace: "Remplacer le parcours",

    purpose:
      "C'est le tracé qui transforme la coordonnée GPS de chaque véhicule en « kilomètre 42 de la course ». Sans lui, pas de calcul de fenêtre entre l'ouvreuse et la fin de course, ni de suggestion du véhicule le plus proche par la route.",
    missingExplain:
      "Aucun parcours. Sans lui, le système ne peut pas dire à quel kilomètre se trouve chaque véhicule, ni calculer la fenêtre.",
    sourceGpx: "Importé de {filename}",
    sourceDrawn: "Dessiné sur la carte",
    geometryPoints: "Points de géométrie",
    reviewTitle: "Vérification avant enregistrement",
    warningsTitle: "{count} point(s) de vigilance dans ce fichier",
    confirmUse: "Confirmer et utiliser ce parcours",
    chooseAnotherFile: "Choisir un autre fichier",
    noFileYet: "Vous n'avez pas encore le fichier du parcours ?",
    vertices: "Sommets",
    saveDrawn: "Enregistrer le parcours",
    deleteVertex: "Supprimer le sommet",
    closeLoop: "Fermer le circuit",
    tooManyVertices:
      "{count} sommets, c'est plus qu'un tracé dessiné à la main ne devrait en avoir (limite {limit}). Si le parcours est vraiment long, importez un GPX.",
    oneVertex:
      "Un seul sommet n'est pas un parcours. Cliquez sur la carte pour marquer où passe la course.",
    savedTitle: "Parcours enregistré",
    savedReplaced: "le parcours précédent a été désactivé.",
    saveErrorTitle: "Enregistrement impossible",
    saveFailed:
      "Impossible d'enregistrer le parcours. Vérifiez la connexion et réessayez.",
    saveConnectionLost:
      "La connexion a été coupée en cours d'envoi. Le parcours précédent reste valable — réessayez.",
    fileUnreadable:
      "Impossible de lire le fichier depuis le disque. Copiez-le dans un autre dossier et réessayez.",
    fileNotGpx:
      "Impossible d'interpréter ce fichier. Vérifiez que c'est bien un .gpx et qu'il s'ouvre dans un autre programme.",

    segmentMissing: "Le tracé choisi n'existe pas dans le fichier.",
    segmentTooManyPoints: "Ce tracé a {count} points, au-dessus de la limite de {limit}. Recoupez le fichier sur la portion de course.",
    pointsMissing: "La liste des points du parcours n'est pas arrivée.",
    pointsTooMany: "Le parcours a {count} points, au-dessus de la limite de {limit}. Recoupez le fichier sur la portion de course avant l'envoi.",
    pointMalformed: "Le point {index} est malformé.",
    pointBadLat: "Le point {index} a une latitude invalide ({value}).",
    pointBadLng: "Le point {index} a une longitude invalide ({value}).",
    etaUnknown: "temps estimé indisponible",
    uploadTooLarge:
      "Le parcours envoyé est trop volumineux. Découpez le fichier sur la portion de course.",
    uploadBadBody: "Corps de la requête illisible.",
    uploadBadSource: "Origine du parcours inconnue.",
    uploadBadPoints: "Points de parcours invalides.",
    uploadTooManyVertices:
      "Un parcours dessiné à la main ne devrait pas dépasser {limit} sommets.",
    uploadBuildFailed: "Impossible de construire un parcours avec ces points.",
    uploadReleaseFailed:
      "Impossible de libérer le parcours précédent. Rechargez la page et réessayez.",
    uploadInsertFailed:
      "Impossible d'enregistrer le parcours. Le parcours précédent reste valable.",
  },

  positions: {
    title: "Véhicules d'assistance",
    intro:
      "Chaque véhicule d'assistance de la course devient une position avec son propre code. Le conducteur saisit le code sur son téléphone — rien à installer, aucun compte à créer — et à partir de là l'appareil transmet la position de ce véhicule.",
    add: "Ajouter un véhicule",
    addBulk: "Ajouter plusieurs",
    addHint:
      "Chaque position naît avec un code d'association unique et un nom que vous pouvez changer ensuite. La première voiture ouvreuse et la première voiture de fin de course sont marquées comme références automatiquement.",
    quantity: "Quantité",
    label: "Identification",
    role: "Rôle",
    driverName: "Conducteur",
    driverPhone: "Téléphone",
    driverPhoneHint: "Avec l'indicatif du pays s'il est étranger.",
    noDriver: "Conducteur non renseigné",
    plate: "Immatriculation",
    referenceLead: "C'est la voiture ouvreuse officielle",
    referenceSweep: "C'est la voiture de fin de course officielle",
    markLead: "Définir comme ouvreuse",
    markSweep: "Définir comme fin de course",
    dispatchable: "Peut être envoyé sur alerte",
    code: "Code d'association",
    codeRevoked: "révoqué — générez-en un autre",
    codeExpired: "expiré — générez-en un autre",
    codeHidden: "Seules les personnes qui éditent la course voient les codes.",
    copyCode: "Copier le code",
    copied: "copié",
    regenerateCode: "Générer un nouveau code",
    regenerateWarning:
      "Le code actuel cesse de fonctionner. Si le conducteur est déjà associé, il continue à transmettre jusqu'à dissociation.",
    moveUp: "Monter {position}",
    moveDown: "Descendre {position}",
    dragHandle: "Faire glisser {position} pour réordonner",
    confirmRemove: "Retirer vraiment ?",
    orderHint:
      "l'ordre de la liste est celui dans lequel elles apparaissent sur le panneau en direct.",
    emptyTitle: "Aucun véhicule enregistré",
    emptyBody:
      "Une position est un rôle dans la course (« Moto 3 », « Ambulance 1 »), pas un appareil. Le téléphone est associé ensuite, par le code — et il peut être changé en pleine course si une batterie lâche, sans perdre l'historique.",
    emptyStart:
      "Commencez par la voiture ouvreuse et celle de fin de course : ce sont elles qui définissent la fenêtre que la direction surveille.",
    missingRefsTitle: "Références de la fenêtre manquantes",
    missingRefsBody:
      "Sans les deux, le panneau ne peut pas calculer le temps entre la tête et la queue du peloton.",
    bound: "Associé",
    notBound: "En attente d'association",
    revokeSession: "Dissocier l'appareil",

    print: "Imprimer les codes",
    printTitle: "Codes d'association — {race}",
    printHint:
      "Remettez chaque code au conducteur du véhicule correspondant avant le départ.",
    printLost:
      "Si une feuille se perd, générez-en une autre sur l'écran des véhicules : l'ancien code cesse de valoir aussitôt.",
    printInstruction:
      "Chaque conducteur ouvre {url} sur son téléphone et saisit le code de son bloc.",
    printUrlMissing: "(adresse de l'application)",
    printNoUrlTitle: "Adresse de l'application non configurée",
    printNoUrlBody:
      "La variable {variable} est vide : la feuille sort donc sans l'adresse que le conducteur doit ouvrir. Écrivez l'adresse à la main avant de distribuer.",
    printMissing:
      "{count} position(s) sans code valable sont restées hors de cette feuille. Générez un nouveau code sur l'écran des véhicules.",
    printExpired:
      "{count} code(s) de cette feuille ont dépassé leur validité et n'associent plus aucun téléphone. Générez de nouveaux codes avant d'imprimer.",
    printNothingTitle: "Rien à imprimer",
    printNothingBody: "Enregistrez d'abord les véhicules d'assistance.",
    printFooter:
      "le code ne vaut que pour cette course et pour ce véhicule. Associer un nouveau téléphone dissocie le précédent.",

    form: {
      invalidData: "Données invalides.",
      roleInvalid: "Choisissez un rôle valide.",
      quantityInteger: "La quantité doit être un nombre entier.",
      quantityMin: "Ajoutez au moins 1 véhicule.",
      quantityMax: "Ajoutez 40 véhicules au maximum à la fois.",
      labelRequired:
        "Le véhicule a besoin d'un nom — c'est celui que la direction appellera à la radio.",
      labelTooLong: "Nom trop long (60 caractères maximum).",
      driverNameTooLong: "Nom du conducteur trop long (120 caractères maximum).",
      phoneTooLong: "Numéro de téléphone trop long.",
      phoneInvalid:
        "Numéro invalide. N'utilisez que des chiffres, avec l'indicatif du pays s'il est étranger.",
      plateTooLong: "Immatriculation trop longue.",
      notFound: "Véhicule introuvable. Rechargez la page.",
      referenceCleared:
        "Attention : la course est désormais sans référence {reference} — définissez-en une avant le départ.",
      codeGenerationFailed:
        "Impossible de générer des codes uniques pour l'instant. Réessayez dans quelques secondes.",
      codeIssueUnavailable:
        "Impossible d'émettre un nouveau code sur ce serveur.",
      codeNoneFree:
        "Impossible de tirer un code libre. Réessayez dans quelques secondes.",
      codeRevokedMeanwhile:
        "Le code précédent est déjà révoqué — ce véhicule reste sans code tant que vous n'avez pas réessayé.",
    },
  },

  map: {
    fitRoute: "Cadrer le parcours",
    followMe: "Suivre mon véhicule",
    vehicles: "Véhicules",
    showAll: "Tout afficher",
    noWebGL:
      "Ce navigateur ne prend pas en charge WebGL. Les données de position restent correctes dans les listes.",
    basemapLabel: "Fond de carte",
    basemapHint:
      "Ne vaut que pour cette course. Le tracé change de couleur en conséquence, pour ne pas disparaître sur le fond choisi.",
    basemapAsphalt: "Asphalte",
    basemapAsphaltHint:
      "Tracé net, sans relief. C'est celui qui rivalise le moins avec les véhicules — le bon choix pour une course urbaine et pour un écran projeté en direction de course.",
    basemapTopo: "Topographique",
    basemapTopoHint:
      "Courbes de niveau, pente et petites routes. C'est le seul fond qui montre la montée avant qu'elle arrive — sur une course de montagne, cela change ce qui se dit à la radio.",
    basemapSatellite: "Satellite",
    basemapSatelliteHint:
      "Image aérienne. Sert à vérifier que la route du GPX est bien celle de la course, et à reconnaître un point d'assistance à ce qui existe sur le terrain.",
    slowTitle: "La carte n'a pas fini de charger.",
    slowBody:
      "Cela peut venir d'un onglet en arrière-plan, de WebGL indisponible ou des tuiles bloquées sur le réseau. Les kilomètres, la fenêtre et la liste des véhicules à côté restent corrects.",
  },

  live: {
    warnStates: "Impossible de lire les positions en direct des véhicules.",
    warnSessions: "Impossible de lire les liaisons des appareils.",
    warnAlerts: "Impossible de lire les alertes : {detail}",
    warnPositions: "Impossible de lire les positions : {detail}",
    warnGeometry: "Géométrie du parcours indisponible : {detail} La portion occupée ne sera pas dessinée.",
    snapshotErrorTitle: "Impossible de construire le panneau en direct",
    snapshotErrorBody:
      "La course existe, mais l'état en direct n'a pas pu être lu. Rechargez la page ; si cela persiste, vérifiez votre connexion à la base.",
    noRoute:
      "Cette course n'a pas de parcours actif. Sans lui, pas de carte, pas de kilométrage et pas de fenêtre ouvreuse ↔ fin de course.",
    clockNote: "Temps à l'horloge du serveur · fuseau de la course ({timezone})",
    unacknowledged: "{count} alerte(s) non prise(s) en compte.",
    moreUnacknowledged: "+{count} non prises en compte",
    viewOnMap: "voir sur la carte",

    sortByRace: "Position en course",
    sortByOrdinal: "Ordre d'enregistrement",
    noSignalGroup: "Sans signal ({count}) — la position sur la carte est un souvenir",
    noPositions: "Aucun véhicule enregistré sur cette course.",
    offRoute: "hors parcours",
    clockOff: "horloge décalée",
    fromTrack: "{distance} du tracé",

    panelOk: "Panneau en direct",
    panelDegraded: "Panneau dégradé",
    panelDown: "PANNEAU SANS CONNEXION",
    reconciled: "réconcilié {age}",
    realtime: "temps réel : {state}",
    realtimeOn: "actif",
    realtimeConnecting: "connexion…",
    realtimeOff: "coupé",
    notPresent:
      "Ce qui est à l'écran n'est pas le présent. Confirmez tout par radio.",
    pollingOnly: "pas de mise à jour instantanée ; réconciliation toutes les {interval}",
    refreshNow: "actualiser",
    refreshing: "actualisation…",
    soundOff: "son coupé — activer",
    soundOn: "Alerte sonore active",

    showClosed: "{count} clôturées",
    hideClosed: "masquer les clôturées",
    showAllVehicles: "voir tous les véhicules",
    showFewer: "voir moins",
    history: "historique",
    hideHistory: "masquer l'historique",
    loadingHistory: "Chargement de l'historique…",
    noEvents: "Aucun événement enregistré.",

    startedAt: "départ à {time}",
    finishedAt: "terminée à {time}",
    confirmStart: "confirmer le départ",
    confirmFinish: "confirmer la fin",
  },

  auth: {
    gateTitle: "Préparez la course avant.",
    gateTitleStrong: "Le jour J, contentez-vous de suivre.",
    gateCodes: "Codes de liaison",
    loginTitle: "Panneau de la direction",
    loginSubtitle: "Connectez-vous pour préparer la course : parcours, positions d'assistance et codes de liaison.",
    signupSubtitle: "Le compte est le vôtre, et les courses que vous créez ne sont visibles que par vous. Les chauffeurs n'ont pas besoin de compte : ils entrent avec le code de 6 caractères.",
    metaLogin: "Connexion — Flamme Rouge",
    metaSignup: "Créer un compte — Flamme Rouge",
    errorTitle: "Impossible de continuer",
    noticeTitle: "Presque terminé",
    name: "Votre nom",
    nameHint: "Visible par l'équipe de la course.",
    namePlaceholder: "Marina Ferrero",
    nameRequired: "Indiquez votre nom — c'est lui que voit l'équipe de la course.",
    nameTooLong: "Nom trop long (80 caractères maximum).",
    email: "E-mail",
    emailPlaceholder: "direction@votrecourse.fr",
    emailRequired: "Indiquez votre e-mail.",
    emailInvalid:
      "Cet e-mail ne semble pas valide. Vérifiez qu'il ne manque pas le @ ou le domaine.",
    password: "Mot de passe",
    passwordHint: "8 caractères minimum.",
    passwordRequired: "Indiquez votre mot de passe.",
    passwordTooShort: "Le mot de passe doit compter au moins 8 caractères.",
    passwordTooLong: "Le mot de passe peut compter 72 caractères au maximum.",
    passwordRepeat: "Répétez le mot de passe",
    passwordMismatch:
      "Les deux mots de passe ne sont pas identiques. Saisissez-les à nouveau.",
    submitting: "Patientez…",
    signIn: "Entrer dans le panneau",
    signUp: "Créer un compte",
    haveAccount: "Vous avez déjà un compte ?",
    signInLink: "Se connecter",
    firstTime: "Première fois ?",
    signUpLink: "Créer un compte de direction",

    confirmSent:
      "Compte créé. Nous avons envoyé un e-mail de confirmation à {email}. Confirmez puis revenez ici pour vous connecter (vérifiez aussi les indésirables).",
    invalidCredentials:
      "E-mail ou mot de passe incorrect. Si vous venez de vous inscrire, confirmez votre e-mail avant de vous connecter.",
    emailNotConfirmed:
      "Cet e-mail n'est pas encore confirmé. Ouvrez le message que nous avons envoyé et cliquez sur le lien (vérifiez les indésirables).",
    userExists:
      "Un compte existe déjà avec cet e-mail. Passez à l'écran de connexion ; si vous avez oublié le mot de passe, demandez sa réinitialisation via Supabase.",
    emailRejected:
      "Le serveur a refusé cette adresse e-mail. Utilisez une adresse réelle que vous pouvez ouvrir maintenant — la confirmation y arrive.",
    weakPassword:
      "Mot de passe trop faible pour le serveur. Utilisez au moins 8 caractères, en mêlant lettres et chiffres.",
    rateLimited:
      "Trop de tentatives en peu de temps. Attendez quelques minutes avant de réessayer.",
    signupDisabled:
      "L'inscription est désactivée sur ce serveur. Demandez à quelqu'un de l'équipe de créer votre compte.",
    genericFailure:
      "Impossible d'aboutir pour l'instant. Vérifiez votre connexion et réessayez.",
  },

  landing: {
    skip: "Aller au contenu",

    nav: {
      problem: "Le problème",
      measures: "Ce que mesure la route",
      screens: "Les deux écrans",
      aria: "Sections de la page",
      home: "Flamme Rouge, accueil",
      markerStart: "KM 000 — DÉPART",
    },

    hero: {
      title: "Direction de course en direct,",
      titleStrong: "mesurée sur la route.",
      lead: "Chaque véhicule d'assistance sur le parcours en temps réel. L'écart entre la voiture ouvreuse et la voiture-balai mesuré comme un temps intermédiaire de chronométrage, pas estimé. Et les secours choisis selon la distance que la voiture va réellement parcourir.",
      ctaPanel: "Ouvrir la direction de course",
      ctaDriver: "Je suis chauffeur, j'ai un code",
      note: "La flamme rouge marque le dernier kilomètre. Ici elle marque le chiffre dont la direction a besoin : combien il reste, mesuré, pas estimé.",
      scroll: "Faites défiler",
    },

    numbers: {
      aria: "Chiffres mesurés en test",
      unitKm: "km",
      unitPoints: "points",
      unitChars: "caractères",
      roadLabel: "Sur la route",
      roadBody: "Séparaient la moto de la chute qu'elle semblait avoir sous les yeux. À vol d'oiseau, 50 mètres. Le système a envoyé l'ambulance qui se trouvait 1,5 km derrière.",
      offlineLabel: "Sans réseau",
      offlineBody: "Accumulés pendant deux minutes sans couverture, ils sont tous arrivés, dans l'ordre et sans doublon dès le retour du réseau.",
      codeLabel: "Pour entrer",
      codeBody: "C'est tout ce que le chauffeur saisit. Pas de compte, pas d'application, pas de matériel à acheter puis à récupérer.",
    },

    problem: {
      marker: "Ce qui se passe aujourd'hui",
      title: "La course se joue à la radio.",
      titleStrong: "Et la radio ne passe pas dans la vallée.",
      lead: "Rien de tout cela n'est la faute de l'organisation. C'est ce qui reste quand la seule source de position est quelqu'un qui dit, de mémoire, où il pense être.",
      photo: "Photo · peloton étiré",
      q1: "« Où est la voiture-balai ? »",
      a1: "La réponse est une estimation, et c'est sur elle qu'on rouvre la route — et qu'on respecte, ou non, le temps de fermeture convenu avec l'autorité de circulation. Dix minutes de trop, c'est rompre l'accord ; dix de moins, c'est rouvrir la rue avant l'heure.",
      q2: "« Quelqu'un est tombé au km 60. »",
      a2: "Qui a entendu ? Qui y est allé ? Tant que personne ne répond à la radio, impossible de distinguer « l'appel n'est pas passé » de « l'appel est passé et ils arrivent ».",
      q3: "« Envoie l'assistance la plus proche. »",
      a3: "La plus proche mesurée comment ? Sur la carte papier, la distance est celle de l'œil — et l'œil ignore que ce tronçon est le retour, et que la route ne se rejoint que 30 km plus loin.",
      q4: "« Le chauffeur n'a pas compris. »",
      a4: "Sur une course internationale, l'équipe d'assistance parle quatre langues. La radio en parle une, et le briefing d'une demi-heure avant le départ est déjà terminé.",
      q5: "« Course terminée. »",
      a5: "Et il ne reste aucune trace de qui était où, à quelle heure, quand l'alerte a été ouverte et combien de temps les secours ont mis. La fédération demande après ; c'est la mémoire de l'équipe qui répond.",
    },

    measures: {
      marker: "Ce que mesure la route",
      title: "Six choix d'ingénierie",
      titleStrong: "qui changent ce qui s'affiche à l'écran.",
      diagramAria: "Schéma d'un parcours aller-retour. Le point de la chute est sur la branche aller ; la moto est sur la branche retour, à 50 mètres à vol d'oiseau mais à 37,3 kilomètres par la route. L'ambulance est 1,5 kilomètre derrière la chute, sur la même branche et dans le même sens.",
      diagramMoto: "**0,05 km** à vol d'oiseau entre la moto et la chute. C'est le chiffre qu'utilise un système de proximité géométrique — et par lui c'est la moto qui serait envoyée.",
      diagramRoute: "**37,3 km** par la route, au même instant : la moto est sur la branche retour et devrait refaire toute la boucle à contresens de la course.",
      diagramAmb: "**1,5 km** derrière, sur la même branche et dans le même sens : l'ambulance, celle que le système a envoyée.",
      diagramNote: "Schéma hors échelle. Chiffres mesurés sur un parcours de test réel.",
      leadTitle: "Distance sur la route, pas à vol d'oiseau.",
      leadBody1: "Lors d'un test réel, une moto se trouvait à **0,05 km** à vol d'oiseau d'une chute et à **37,3 km** par la route — sur la boucle retour du parcours, la seule jonction entre les deux se trouvant trente-sept kilomètres plus loin. Le système a envoyé l'ambulance qui était **1,5 km derrière**, dans le sens de la course.",
      leadBody2: "Un système qui compare des coordonnées aurait envoyé la moto, et la moto aurait mis toute la course à arriver. Un véhicule déjà passé paie aussi le prix de trouver où faire demi-tour et de remonter à contresens — et cette asymétrie entre dans le calcul.",
      c2Title: "L'écart ouvreuse↔balai est mesuré, pas estimé.",
      c2Tag: "mesuré",
      c2Body: "Le système enregistre l'heure de passage de la voiture ouvreuse en chaque point du parcours. Quand la voiture-balai atteint le km 42, l'écart est la différence entre deux heures observées — le même calcul qu'un temps intermédiaire. C'est ce chiffre que l'organisation a convenu avec l'autorité de circulation : c'est le passage du balai qui rend la route à la circulation. Quand l'historique ne suffit pas encore, l'écran écrit « projeté » et en donne la raison. Le directeur n'a jamais à deviner lequel des deux il lit.",
      c3Title: "Ça marche sans réseau.",
      c3Tag: "40 points",
      c3Body: "Rien n'est envoyé avant d'être écrit sur l'appareil, et rien ne quitte la file avant confirmation du serveur. Lors d'un test de deux minutes sans couverture, les 40 points accumulés sont arrivés complets, dans l'ordre et sans doublon dès le retour du réseau.",
      c4Title: "L'alerte n'échoue jamais en silence.",
      c4Tag: "file locale",
      c4Body: "L'alerte passe devant n'importe quel ping GPS et est réessayée jusqu'à confirmation du serveur — un appel au secours n'est jamais abandonné, même si cela signifie une file qui ne se vide pas. Et les bons secours partent selon la catégorie, sans que personne ait à choisir en pleine urgence : une chute appelle l'ambulance, une casse mécanique appelle le mécanicien.",
      c5Title: "N'importe quel téléphone devient le GPS du véhicule.",
      c5Tag: "6 caractères",
      c5Body: "Le chauffeur ouvre le lien, saisit le code de 6 caractères imprimé sur la feuille de briefing, et son téléphone devient le traceur de ce véhicule. Aucune application à installer, aucun matériel à acheter, charger, distribuer et récupérer en fin de journée.",
      c6Title: "Six langues, un seul lien.",
      c6Tag: "6 langues",
      c6Body: "La langue n'est pas dans l'URL — l'appareil la négocie. Le même lien et le même QR imprimé donnent du portugais au chauffeur brésilien, de l'italien à l'Italien et de l'allemand à l'Autrichien, sans que la direction gère quoi que ce soit. Un téléphone réglé en pt-PT reçoit du portugais, pas de l'anglais.",
      summaryLabel: "En résumé",
      summary: "Six choix, un effet : la direction cesse de demander où est chaque voiture.",
    },

    how: {
      marker: "Comment ça marche",
      title: "Trois étapes avant le départ.",
      titleStrong: "Aucune pendant.",
      step: "Étape {n}",
      s1Title: "Chargez le parcours.",
      s1Body: "Le GPX de la course, ou le tracé dessiné à l'écran. Le parcours est indexé une fois, et c'est de lui que vient toute distance mesurée ensuite — la position de chaque véhicule, l'écart et le choix des secours.",
      s2Title: "Générez la feuille de codes.",
      s2Body: "Un code de 6 caractères par véhicule, avec le rôle de chacun : ouvreuse, balai, voiture-ramasseuse, ambulance, mécanicien, moto, commissaire. La feuille sort prête à imprimer et à distribuer au briefing.",
      s3Title: "Ouvrez le panneau le jour J.",
      s3Body: "Chaque chauffeur ouvre le lien, saisit le code et apparaît sur la carte dans la langue de son propre téléphone. Pendant la course, il n'y a plus rien à configurer.",
    },

    screens: {
      marker: "Les deux écrans",
      title: "Une salle de direction.",
      titleStrong: "Un téléphone par véhicule.",
      panelEyebrow: "Panneau de la direction",
      panelTitle: "Ce que voit la direction",
      altHero: "Vue depuis la moto de course sur une route pavée mouillée, deux coureurs devant à contre-jour au soleil bas, et l'arche rouge du dernier kilomètre qui traverse en haut avec sa banderole suspendue.",
      altPanel: "Panneau de la direction de course : carte du parcours avec les véhicules d'assistance, écart ouvreuse-balai indiqué comme mesuré, et la file d'alertes.",
      altApp: "Application du chauffeur sur téléphone : le rôle du véhicule, la fenêtre mesurée entre la voiture ouvreuse et la voiture de fin de course, l'état de l'envoi et les boutons d'alerte.",
      zoom: "Agrandir",
      altPave: "Route pavée serpentant entre les collines au coucher du soleil, avec trois coureurs séparés de centaines de mètres et une voiture d'assistance dans l'un des écarts — la course n'est plus un peloton.",
      panelCapture: "Capture · panneau de la direction",
      p1: "Carte en direct avec tous les véhicules, chaque rôle dans sa couleur et avec l'âge de sa donnée.",
      p2: "Écart entre ouvreuse et balai, indiqué comme mesuré ou projeté.",
      p3: "File d'alertes avec l'assistance la plus proche déjà suggérée — et la raison de la suggestion par écrit.",
      p4: "Santé de la connexion véhicule par véhicule : qui est en direct, qui est en retard, qui a disparu.",
      appEyebrow: "Application chauffeur",
      appTitle: "Ce que voit le chauffeur",
      appCapture: "Capture · application chauffeur",
      a1: "Entre avec le code de 6 caractères. Pas de compte, pas de magasin d'applications.",
      a2: "Boutons d'alerte larges, pour une main gantée et une voiture en mouvement.",
      a3: "Continue d'émettre écran éteint et accumule tout quand le réseau tombe.",
      a4: "Dans la langue de l'appareil, à partir du même lien que tout le monde a reçu.",
    },

    close: {
      marker: "Flamme rouge",
      title: "Deux portes.",
      titleStrong: "Aucune décision entre les deux.",
      lead: "La direction entre avec un compte et monte la course. Le chauffeur entre avec un code et n'a plus rien à décider.",
      aria: "Entrer dans le système",
      directorTitle: "Je suis de la direction",
      directorBody: "Créer la course, charger le parcours, générer les codes et suivre l'opération en direct.",
      directorCta: "Ouvrir le panneau →",
      driverTitle: "Je suis chauffeur",
      driverBody: "Saisissez le code de 6 caractères donné par la direction et le téléphone devient le GPS de votre position.",
      driverCta: "Entrer avec un code →",
    },

    contact: {
      eyebrow: "Contact",
      title: "Parlez à celui qui l'a fait.",
      body: "Dites-nous quelle course vous organisez et ce que vous devez résoudre. C'est la personne qui a écrit le système qui répond, dans votre langue.",
      name: "Votre nom",
      email: "E-mail",
      organization: "Organisation",
      message: "Message",
      messagePlaceholder: "Quelle course vous organisez, combien de véhicules d'assistance, et quand elle a lieu.",
      send: "Envoyer",
      sending: "Envoi…",
      sentTitle: "Bien reçu.",
      sentBody: "Je réponds à l'adresse que vous avez laissée, dans la langue de votre message.",
      orWrite: "Ou écrivez directement à",
      failed: "L'envoi n'a pas pu se faire. Votre message est toujours là — copiez-le et envoyez-le à",
      tooMany: "Trop de messages d'ici en peu de temps. Patientez un peu, ou écrivez à",
      nameRequired: "Donnez votre nom — c'est ainsi que la réponse commencera.",
      emailRequired: "Il me faut une adresse e-mail pour répondre.",
      emailInvalid: "Cet e-mail ne semble pas valide. Vérifiez le @ et le domaine.",
      messageRequired: "Écrivez ce dont vous avez besoin, même en une ligne.",
      messageTooLong: "Message trop long (4000 caractères maximum).",
    },
    footer: {
      marker: "Route rouverte",
      tagline: "Direction de course en direct pour le cyclisme sur route.",
      languages: "Six langues, un seul lien",
      languagesNote: "La même adresse et le même QR donnent à chaque appareil l'interface dans sa langue — sans que la direction gère quoi que ce soit.",
      enter: "Se connecter",
      credits: "un outil",
    },

    meta: {
      title: "Flamme Rouge — direction de course en direct pour le cyclisme sur route",
      description: "La position de chaque véhicule d'assistance mesurée sur la route, l'écart ouvreuse-balai mesuré comme un temps intermédiaire, et des alertes qui envoient les bons secours par catégorie. Le GPS, c'est le téléphone du chauffeur.",
      ogTitle: "Flamme Rouge — direction de course en direct",
      ogDescription: "Lors d'un test réel, une moto était à 0,05 km à vol d'oiseau et à 37,3 km par la route d'une chute. Le système a envoyé l'ambulance qui était 1,5 km derrière.",
    },
  },
  errors: {
    forbidden: "Vous n'avez pas l'autorisation de modifier cette course.",
    raceNotFound: "Course introuvable.",
    invalidRace: "Course invalide.",
    sessionExpired: "Votre session a expiré. Reconnectez-vous.",
    notStartable: "Seule une course en brouillon ou prête peut être démarrée.",
    listRaces:
      "Rechargez la page. Si cela persiste, déconnectez-vous et reconnectez-vous — votre session a pu expirer.",
    noChange:
      "Rien n'a changé : l'alerte a peut-être déjà été clôturée par quelqu'un d'autre, ou vous n'avez plus les droits sur cette course. Rechargez la page.",

    db: {
      saveFailed:
        "Enregistrement impossible. Réessayez ; si cela persiste, rechargez la page.",
      routeRaceConflict:
        "Un autre parcours a été activé sur cette course pendant que vous travailliez. Rechargez la page et renvoyez — le parcours le plus récent l'emporte.",
      bindCodeTaken:
        "Le code tiré est déjà utilisé sur une autre course. Cliquez de nouveau sur enregistrer : un nouveau code sera tiré.",
      oneLead:
        "Cette course a déjà une référence ouvreuse. Retirez l'actuelle avant d'en définir une autre.",
      oneSweep:
        "Cette course a déjà une référence fin de course. Retirez l'actuelle avant d'en définir une autre.",
      ordinalConflict:
        "Deux véhicules se retrouvent au même rang. Rechargez la page et refaites le classement.",
      sessionTaken:
        "Un téléphone est déjà associé à ce véhicule. Révoquez l'association actuelle avant d'en créer une autre.",
      leadSweepSame:
        "Le même véhicule ne peut pas être à la fois la référence ouvreuse et celle de fin de course — le calcul de la fenêtre comparerait le véhicule à lui-même.",
      gapWindowIncoherent:
        "La limite basse de la fenêtre doit être inférieure à la limite haute.",
      targetGapRange: "La fenêtre visée doit être comprise entre 1 et 600 minutes.",
      raceNameLength: "Le nom de la course doit compter entre 1 et 200 caractères.",
      positionLabelLength: "Le nom du véhicule doit compter entre 1 et 60 caractères.",
      bindCodeFormat: "Le code généré est hors format. Réessayez.",
      trackDistance: "Le parcours doit avoir une longueur supérieure à zéro.",
      trackPoints: "Le parcours a besoin d'au moins 2 points.",
      duplicate:
        "Cet enregistrement existe déjà. Rechargez la page pour voir l'état actuel.",
      checkViolation:
        "Une valeur est hors des limites autorisées. Revoyez les champs et réessayez.",
      missingRace:
        "La course référencée n'existe plus. Revenez à la liste des courses.",
      notFound:
        "Enregistrement introuvable — il a pu être supprimé par quelqu'un d'autre. Rechargez la page.",
    },
  },
};
