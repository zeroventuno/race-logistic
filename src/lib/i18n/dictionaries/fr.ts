import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/** Français. Terminologie des commissaires FFC / UCI. */
export const fr: Dictionary = {
  meta: {
    appName: "Race Logistic",
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
  },

  roles: {
    lead_car: { label: "Voiture ouvreuse", short: "Ouvreuse" },
    sweep_car: { label: "Voiture balai", short: "Balai" },
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
  },

  gap: {
    title: "Fenêtre ouvreuse ↔ balai",
    short: "Fenêtre",
    target: "Objectif : {duration}",
    measured:
      "Mesurée par l'écart d'horaire de passage des deux véhicules au même point.",
    projected:
      "Estimée : {distance} sur le parcours, à la vitesse moyenne actuelle de la voiture balai ({speed}).",
    noLead: "Voiture ouvreuse sans position. Associez son appareil.",
    noSweep: "Voiture balai sans position. Associez son appareil.",
    noBoth: "En attente de la position des deux véhicules de référence.",
    sweepAhead:
      "La voiture balai est devant l'ouvreuse. Vérifiez que les rôles ne sont pas inversés.",
    sweepStopped:
      "Distance sur le parcours : {distance}. Voiture balai à l'arrêt — temps indéterminé.",
    noHistory:
      "Distance sur le parcours : {distance}. Historique insuffisant pour la convertir en temps.",
    stale: "Donnée de {age} — peut ne pas refléter la position actuelle.",
    overTarget: "Au-dessus de la fenêtre visée",
    underTarget: "En dessous de la fenêtre visée",
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

    transmitting: "Transmission active",
    paused: "En pause",
    queuedPings: "{count} points en attente",
    batteryWarning: "Batterie faible — pensez à brancher.",
    keepAwake: "Écran maintenu allumé",
  },

  director: {
    dashboard: "Tableau de bord",
    myRaces: "Mes courses",
    newRace: "Nouvelle course",
    noRaces: "Vous n'avez encore créé aucune course.",
    noRacesAction: "Créer la première course",
    setupChecklist: "Avant le passage en direct",
    needsRoute: "Charger le parcours",
    needsLead: "Définir la voiture ouvreuse",
    needsSweep: "Définir la voiture balai",
    needsBinding: "{count} véhicule(s) sans appareil associé",
    ready: "Tout est prêt",
    goLive: "Démarrer la course",
    finish: "Terminer la course",
  },

  route: {
    uploadTitle: "Charger le parcours",
    uploadSubtitle: "Envoyez le fichier GPX de la course.",
    uploadAction: "Choisir un fichier GPX",
    uploadDrop: "Déposez le fichier ici",
    drawInstead: "Ou dessinez le parcours sur la carte",
    drawTitle: "Dessiner le parcours",
    drawHint: "Cliquez sur la carte pour ajouter des points. Glissez pour ajuster.",
    undo: "Annuler",
    clear: "Effacer",
    chooseSegment:
      "Le fichier contient plusieurs parcours. Choisissez celui de la course :",
    replaceWarning:
      "Remplacer le parcours recalcule toutes les positions en course. Faites-le avant le départ.",
    parseError: "Impossible de lire le fichier",
    pointCount: "{count} points",
    current: "Parcours actuel",
    replace: "Remplacer le parcours",
  },

  positions: {
    title: "Véhicules d'assistance",
    add: "Ajouter un véhicule",
    addBulk: "Ajouter plusieurs",
    quantity: "Quantité",
    label: "Identification",
    driverName: "Conducteur",
    driverPhone: "Téléphone",
    plate: "Immatriculation",
    referenceLead: "C'est la voiture ouvreuse officielle",
    referenceSweep: "C'est la voiture balai officielle",
    dispatchable: "Peut être envoyé sur alerte",
    code: "Code d'association",
    regenerateCode: "Générer un nouveau code",
    regenerateWarning:
      "Le code actuel cesse de fonctionner. Si le conducteur est déjà associé, il continue à transmettre jusqu'à dissociation.",
    print: "Imprimer les codes",
    printTitle: "Codes d'association — {race}",
    printHint:
      "Remettez chaque code au conducteur du véhicule correspondant avant le départ.",
    bound: "Associé",
    notBound: "En attente d'association",
    revokeSession: "Dissocier l'appareil",
  },

  map: {
    fitRoute: "Cadrer le parcours",
    followMe: "Suivre mon véhicule",
    vehicles: "Véhicules",
    showAll: "Tout afficher",
    noWebGL:
      "Ce navigateur ne prend pas en charge WebGL. Les données de position restent correctes dans les listes.",
  },
};
