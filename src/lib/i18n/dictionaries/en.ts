import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/** English. UCI / British Cycling commissaire terminology. */
export const en: Dictionary = {
  meta: {
    appName: "Flamme Rouge",
    tagline: "Live race control",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    close: "Close",
    edit: "Edit",
    remove: "Remove",
    add: "Add",
    retry: "Try again",
    loading: "Loading…",
    saving: "Saving…",
    search: "Search",
    none: "None",
    unknown: "Unknown",
    optional: "optional",
    required: "required",
    yes: "Yes",
    no: "No",
    error: "Something went wrong",
    errorRetry: "That didn't go through. Try again.",
    offline: "No connection",
    online: "Connected",
    language: "Language",
  },

  roles: {
    lead_car: { label: "Lead car", short: "Lead" },
    sweep_car: { label: "Closing car", short: "Closing" },
    broom_wagon: { label: "Broom wagon", short: "Broom" },
    moto: { label: "Support motorcycle", short: "Moto" },
    ambulance: { label: "Ambulance", short: "Ambulance" },
    mechanic: { label: "Neutral service", short: "Service" },
    support_car: { label: "Support car", short: "Support" },
    marshal: { label: "Course marshal", short: "Marshal" },
    other: { label: "Other", short: "Other" },
  },

  signal: {
    live: "Live",
    delayed: "Delayed",
    stale: "Not updating",
    lost: "Signal lost",
    never: "Not linked",
    lastSeen: "Last position {age}",
  },

  race: {
    status: {
      draft: "Draft",
      armed: "Ready",
      live: "Running",
      finished: "Finished",
      archived: "Archived",
    },
    distance: "Distance",
    elevation: "Elevation gain",
    start: "Start",
    positions: "Support vehicles",
    route: "Course",
  },

  gap: {
    title: "Lead ↔ broom wagon window",
    short: "Window",
    target: "Target: {duration}",
    measured:
      "Measured from the time difference between the two vehicles passing the same point.",
    projected:
      "Projected: {distance} along the course, at the broom wagon's current average speed ({speed}).",
    noLead: "Lead car has no position. Link its device.",
    noSweep: "Broom wagon has no position. Link its device.",
    noBoth: "Waiting for both reference vehicles to report.",
    sweepAhead:
      "The broom wagon is ahead of the lead car. Check whether the roles are swapped in the setup.",
    sweepStopped:
      "Distance along the course: {distance}. Broom wagon stopped — time undefined.",
    noHistory:
      "Distance along the course: {distance}. Not enough history to convert this into time.",
    stale: "Data from {age} — may not reflect the current position.",
    overTarget: "Over the target window",
    underTarget: "Under the target window",
  },

  alerts: {
    title: "Alerts",
    none: "No active alerts",
    raise: "Raise alert",
    categories: {
      medical: { label: "Crash / ambulance", short: "Crash" },
      mechanical: { label: "Mechanical problem", short: "Mechanical" },
      other: { label: "Other", short: "Other" },
    },
    status: {
      open: "Open",
      acknowledged: "Acknowledged",
      dispatched: "Support dispatched",
      en_route: "On the way",
      on_scene: "On scene",
      resolved: "Resolved",
      cancelled: "Cancelled",
    },
    priority: {
      critical: "Critical",
      high: "High",
      normal: "Normal",
    },
    confirmMedical: "Confirm emergency call",
    confirmMedicalBody:
      "This dispatches the nearest ambulance immediately and marks the location on every crew map.",
    sending: "Sending…",
    queued: "Queued — no signal. It will keep trying.",
    delivered: "Received by race control",
    failed: "Send failed — retrying",
    at: "at km {km}",
    raisedBy: "Raised by {position}",
    noteLabel: "Description (optional)",
    notePlaceholder: "What happened?",

    dispatch: {
      youWereCalled: "You have been dispatched",
      calling: "Dispatching {position}",
      called: "{position} dispatched",
      reason: "{position}, {distance} {direction} along the course, ~{eta}",
      ahead: "ahead",
      behind: "behind",
      onMyWay: "On my way",
      cantGo: "Can't go",
      arrived: "I'm on scene",
      enRoute: "{position} is on the way",
      onScene: "{position} is on scene",
      declined: "{position} could not respond",
      reassigning: "Dispatching the next available vehicle…",
      noneAvailable:
        "No vehicle available for this category. Race control must act manually.",
      declineReason: "Reason (optional)",
      reassign: "Change vehicle",
    },

    proximity: {
      ahead: "{category} {distance} ahead",
      passing: "You are passing the alert location",
      dismiss: "Got it",
    },

    confirm: {
      prompt: "You passed the location. Is the problem still there?",
      still_there: "Still there",
      cleared: "Already cleared",
      not_found: "Saw nothing",
      thanks: "Thanks — race control has been told.",
      countStillThere: "{count} confirmed",
      countCleared: "{count} say it's cleared",
    },

    actions: {
      acknowledge: "Acknowledge",
      resolve: "Resolve",
      cancel: "Cancel alert",
      resolutionNote: "What was done",
    },
  },

  driver: {
    bindTitle: "Enter your vehicle code",
    bindSubtitle:
      "Race control gave you a 6-character code. It links this phone to your role in the race.",
    bindPlaceholder: "ABC-123",
    bindAction: "Link",
    bindInvalid: "Invalid code. Check the 6 characters and try again.",
    bindNotFound: "Code not found or expired. Contact race control.",
    bindTooManyAttempts: "Too many attempts. Wait a moment before trying again.",
    boundAs: "You are {position} in {race}",
    unbind: "Unlink this device",
    unbindConfirm:
      "Unlinking stops this phone from transmitting the vehicle's position. Confirm?",
    revoked: "This device was unlinked by race control. Ask for a new code.",

    gpsPermissionTitle: "We need your location",
    gpsPermissionBody:
      "The app uses GPS to show your vehicle on race control's map. Without it, nobody can see where you are.",
    gpsDenied:
      "Location permission denied. Enable it in your browser settings and reload.",
    gpsUnavailable: "GPS is not available on this device.",
    gpsSearching: "Looking for GPS signal…",

    transmitting: "Transmitting",
    paused: "Paused",
    queuedPings: "{count} points queued",
    batteryWarning: "Battery low — consider plugging in.",
    keepAwake: "Keeping the screen on",
  },

  director: {
    dashboard: "Control panel",
    myRaces: "My races",
    newRace: "New race",
    noRaces: "You haven't created any races yet.",
    noRacesAction: "Create the first race",
    setupChecklist: "Before the race can go live",
    needsRoute: "Load the course",
    needsLead: "Set the lead car",
    needsSweep: "Set the broom wagon",
    needsBinding: "{count} vehicle(s) with no device linked",
    ready: "All set",
    goLive: "Start race",
    finish: "Finish race",
  },

  route: {
    uploadTitle: "Load the course",
    uploadSubtitle: "Upload the race GPX file.",
    uploadAction: "Choose GPX file",
    uploadDrop: "Drop the file here",
    drawInstead: "Or draw the course on the map",
    drawTitle: "Draw the course",
    drawHint: "Click the map to add points. Drag to adjust.",
    undo: "Undo",
    clear: "Clear",
    chooseSegment: "The file contains more than one course. Pick the race one:",
    replaceWarning:
      "Replacing the course recalculates every position in the race. Do it before the start.",
    parseError: "Could not read the file",
    pointCount: "{count} points",
    current: "Current course",
    replace: "Replace course",
  },

  positions: {
    title: "Support vehicles",
    add: "Add vehicle",
    addBulk: "Add several",
    quantity: "Quantity",
    label: "Identifier",
    driverName: "Driver",
    driverPhone: "Phone",
    plate: "Plate",
    referenceLead: "This is the official lead car",
    referenceSweep: "This is the official broom wagon",
    dispatchable: "Can be dispatched to alerts",
    code: "Link code",
    regenerateCode: "Generate new code",
    regenerateWarning:
      "The current code stops working. If the driver is already linked, they keep transmitting until unlinked.",
    print: "Print codes",
    printTitle: "Link codes — {race}",
    printHint:
      "Hand each code to the driver of the matching vehicle before the start.",
    bound: "Linked",
    notBound: "Awaiting link",
    revokeSession: "Unlink device",
  },

  map: {
    fitRoute: "Fit course",
    followMe: "Follow my vehicle",
    vehicles: "Vehicles",
    showAll: "Show all",
    noWebGL:
      "This browser does not support WebGL. Position data is still correct in the lists.",
  },
};
