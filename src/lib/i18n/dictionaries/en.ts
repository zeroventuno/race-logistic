import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * English. UCI / British Cycling commissaire terminology.
 *
 * `sweep_car` = CLOSING CAR (ends the rolling road closure).
 * `broom_wagon` = BROOM WAGON (last vehicle, picks up abandons).
 * The window the panel computes is lead ↔ closing car.
 */
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
    logout: "Sign out",
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
    noStart: "No start time set",
    details: "Race details",
    lapsTotal: "{laps} laps = {distance} of racing.",
    lap: "lap {lap}/{laps}",
    lapsCircuit: "{laps}-lap circuit",
    lapUnknown: "lap ?",

    form: {
      nameLabel: "Race name",
      namePlaceholder: "Giro delle Langhe — stage 2",
      nameRequired: "Give the race a name — it is how you will find it in the list.",
      nameTooLong: "Name too long (200 characters maximum).",
      locationLabel: "Location",
      locationHint: "Town or area of the start. Shown in the race list.",
      locationPlaceholder: "Alba, Piedmont",
      locationTooLong: "Location too long (200 characters maximum).",
      dateLabel: "Start date",
      dateRequired: "Enter the start date as well.",
      timeLabel: "Start time",
      timeHint: "Local time at the race venue.",
      timeRequired: "Enter the start time as well.",
      dateTimeInvalid: "Invalid date or time. Check both fields.",
      timezoneLabel: "Race time zone",
      timezoneHint:
        "Everything race control sees is converted to this zone, including on the driver's phone.",
      timezoneRequired: "Choose the time zone of the race venue.",
      timezoneUnknown: "Unknown time zone.",
      basemapInvalid: "Choose one of the available maps.",
      lapsLabel: "Laps of the course",
      lapsHint:
        "1 for a point-to-point race. On a circuit, race distance is the course multiplied by the laps.",
      lapsRequired: "Enter the number of laps.",
      lapsInteger: "The number of laps must be a whole number.",
      lapsMin: "A race has at least 1 lap.",
      lapsMax: "50 laps maximum.",
      gapHint:
        "How many minutes race control wants between the lead car and the closing car. This is what the panel uses to decide whether the field has stretched or bunched up too much.",
      targetLabel: "Target window (minutes)",
      targetRequired: "Enter the target window in minutes.",
      targetInteger: "The target window must be a whole number of minutes.",
      targetMin: "The target window must be at least 1 minute.",
      targetMax: "The target window cannot exceed 600 minutes (10 hours).",
      minLabel: "Warn below (minutes)",
      minHint: "Field bunched up too much.",
      minInteger: "The lower limit must be a whole number of minutes.",
      minNegative: "The lower limit cannot be negative.",
      minMax: "The lower limit cannot exceed 600 minutes.",
      minAboveTarget:
        "The minimum cannot be greater than the target window ({target} min).",
      maxLabel: "Warn above (minutes)",
      maxHint: "Field stretched too far.",
      maxInteger: "The upper limit must be a whole number of minutes.",
      maxMin: "The upper limit must be at least 1 minute.",
      maxMax: "The upper limit cannot exceed 600 minutes.",
      maxBelowMin: "The upper limit must be greater than the minimum ({min} min).",
      maxBelowTarget:
        "The maximum cannot be lower than the target window ({target} min).",
      showLimits: "Set warning limits",
      saved: "Race details updated",
      afterSave: "After saving you go straight to the course.",
    },
  },

  gap: {
    title: "Lead ↔ closing car window",
    short: "Window",
    targetLabel: "Target window",
    target: "Target: {duration}",
    measured:
      "Measured from the time difference between the two vehicles passing the same point.",
    projected:
      "Projected: {distance} along the course, at the closing car's current average speed ({speed}).",
    noLead: "Lead car has no position. Link its device.",
    noSweep: "Closing car has no position. Link its device.",
    noBoth: "Waiting for both reference vehicles to report.",
    sweepAhead:
      "The closing car is ahead of the lead car. Check whether the roles are swapped in the setup.",
    sweepStopped:
      "Distance along the course: {distance}. Closing car stopped — time undefined.",
    noHistory:
      "Distance along the course: {distance}. Not enough history to convert this into time.",
    stale: "Data from {age} — may not reflect the current position.",
    overTarget: "Over the target window",
    underTarget: "Under the target window",

    timeSeparation: "separation in time",
    alongRoad: "along the road",
    methodMeasured: "Measured",
    methodProjected: "Projected",
    methodNone: "No data",
    withinTarget: "Within the window",
    overTargetDetail: "stretched too far",
    underTargetDetail: "bunched up too much",
    comparisonSuspended:
      "Comparison with the target window suspended while the data is unreliable",
    noLimits: "No limits set for this race",
    clockSuspect:
      "One of the reference devices has a clock out of step with the server. Until that clears, the data age and the measured figure are unreliable — confirm the position by radio.",
    lapsUncertain:
      "Circuit race of {laps} laps: the loaded history does not reach the start, so the lap count may be underestimated and the window wider than it looks.",
    onTarget: "Window {gap}, agreed {target}. Nothing to correct.",
    verdictAhead: "Window {gap}, agreed {target} — {drift} ahead of schedule.",
    verdictBehind: "Window {gap}, agreed {target} — {drift} behind schedule.",
    remedyAhead: "Slow the closing car down.",
    remedyBehind: "Speed the closing car up.",
    costAhead:
      "The road is reopening earlier than planned and riders left behind lose their protection too soon.",
    costBehind:
      "The closure is running past the time authorised by the traffic authority.",
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

    storageFailedTitle: "ALERT NOT SAVED ON THIS DEVICE — USE THE RADIO NOW.",
    storageFailedBody:
      "Local storage refused the write ({reason}). Nothing will be resent on its own.",
    retryCount: "{count} attempt(s) failed. Report it by radio.",
    unknownFailure: "unknown failure",
    nobodyDispatched: "Nobody has been dispatched to this alert.",

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
      dispatch: "Dispatch a vehicle",
      auto: "automatic",
      fallbackNoPosition:
        "No calculated suggestion and no position on the course — arbitrary order. Confirm by radio.",
      fallbackReason:
        "No calculated suggestion. {distance} apart along the course, with no turnaround or ETA calculation.",
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
      confirmCancel: "confirm? (false alarm)",
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
    bindPasteHint:
      "You can paste. The letters O and I are read as 0 and 1 — the code does not use those letters.",
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
    gpsNoApi:
      "This browser does not provide location. Use Chrome or Safari on your phone.",
    gpsNoFix:
      "No GPS signal. In a tunnel or a car park this is expected; tracking resumes on its own.",
    gpsTimeout: "GPS is slow to respond. Still trying.",
    gpsFailed: "Could not get a position. Tracking keeps trying.",
    gpsDeniedIOS:
      "Location blocked. On iPhone: Settings → Safari → Location → Ask, then reload this page. If you use the Chrome app: Settings → Chrome → Location.",
    gpsDeniedAndroid:
      "Location blocked. On Android: tap the padlock next to the address → Permissions → Location → Allow, then reload the page.",
    gpsDeniedBrowser:
      "Location blocked by the browser. Allow location access in the site permissions and reload the page.",

    gapWarning: "You went {age} without transmitting.",
    gapWarningBody:
      "Race control could not see your position during that time. Keep this screen in front and the phone on power.",
    tapToDismiss: "tap to dismiss",
    alertNotSaved: "ALERT NOT SAVED ON THIS PHONE — USE THE RADIO NOW.",
    alertNotSavedDetail:
      "Local storage refused the write ({reason}). Nothing will be resent on its own.",
    alertAttempts: "{count} attempt(s) failed. Report it on the radio.",
    api: {
      badJson: "The request body is not valid JSON.",
      pingsNotArray: "The pings field must be an array.",
      bodyTooLarge: "A body of {bytes} bytes is above the {limit} limit.",
      bodyOverLimit: "Body above the {limit} byte limit.",
      noBody: "Request with no body.",
      bodyReadFailed: "Could not read the request body.",
      bodyNotObject: "The request body must be a JSON object.",
      batchTooLarge: "A batch of {count} pings exceeds the maximum of {max}. Split the upload.",
      alertSaveFailed: "The alert could not be recorded. Keep it queued and call it in on the radio.",
      confirmKindInvalid: "Invalid confirmation type: {kind}.",
      alertNotFound: "Alert not found in this race.",
      confirmFailed: "Could not record the confirmation. Try again.",
      actionInvalid: "Invalid action: {action}.",
      bindRateLimited: "Too many attempts in a row. Wait {minutes} min and check the code with race control.",
      bindLookupFailed: "Could not look the code up. Try again.",
      bindRaceFailed: "Could not load the race for this code.",
      bindFailed: "Could not complete the binding. Try again in a few seconds.",
      bindUnknownCode: "Code not recognised. Check the 6 characters with race control.",
      takenOver: "another device took over this position",
      positionsFailed: "Could not load the race positions.",
      notBound: "This device is not bound to any position.",
      sessionCheckFailed: "Could not validate the session. The device stays bound; retrying.",
      sessionUnknown: "The server does not recognise this binding. Ask race control for a new code.",
      sessionRevokedWhy: "Binding ended by race control: {reason}",
      sessionRevoked: "This binding was ended by race control. Ask for a new code.",
      positionGone: "The position bound to this device no longer exists.",
      pingBadId: "clientPingId is not a valid UUID.",
      pingNoCoord: "Coordinate missing or not a number.",
      pingOutOfRange: "Coordinate outside the valid geographic range.",
      pingNullIsland: "Coordinate (0, 0) — invalid GPS reading.",
      pingInaccurate: "Accuracy of {accuracy} m is above the {limit} m limit.",
      pingBadDate: "recordedAt is not a valid ISO 8601 date.",
      pingFuture: "recordedAt is {minutes} min in the future — the device clock is off.",
    },
    transmitting: "Transmitting",
    paused: "Paused",
    queuedPings: "{count} points queued",
    queuedAlerts: "{count} alert(s) still undelivered. Report them by radio.",
    pingRejected: "POSITION REJECTED",
    pingRejectedDetail:
      "The server rejected {count} position(s): your position is NOT showing on race control's map.",
    queueNotDurable:
      "Local storage unavailable: the queue is lost if the app closes.",
    batteryWarning: "Battery low — consider plugging in.",
    keepAwake: "Keeping the screen on",
    keepScreenOpen:
      "Keep this screen open during the race. Your position is sent automatically, even on a weak signal.",
  },

  director: {
    dashboard: "Control panel",
    myRaces: "My races",
    myRacesSubtitle:
      "Each race has its own course, its own support vehicles and its own codes.",
    newRace: "New race",
    newRaceSubtitle:
      "Just the essentials for now. Course and vehicles come in the next steps and stay editable right up to the start.",
    createAndContinue: "Create race and go to the course",
    noRaces: "You haven't created any races yet.",
    noRacesAction: "Create the first race",
    setupChecklist: "Before the race can go live",
    needsRoute: "Load the course",
    needsPositions: "Set up support vehicles",
    needsLead: "Set the lead car",
    needsSweep: "Set the closing car",
    needsBinding: "{count} vehicle(s) with no device linked",
    ready: "All set",
    goLive: "Start race",
    finish: "Finish race",

    areaOverline: "Race control area",
    filterAll: "All",
    filterReady: "Ready",
    filterPreparing: "In preparation",
    filterFinished: "Finished",
    noneInFilter: "No race in this state.",
    openRace: "Open",
    openRecord: "Record",
    supportShort: "Support",
    listErrorBody:
      "Reload the page. If it persists, sign out and back in — your session may have expired.",
    steps: "Race setup steps",
    overview: "Overview",
    live: "Live",
    resolveItem: "Fix",
    pendingCount: "{count} item(s) outstanding",
    readOnly: "Read only",
    readOnlyRoute:
      "You are on this race as an observer and cannot change the course.",
    markReady: "Mark race as ready",
    marking: "Marking…",
    backToDraft: "Back to draft",
    reverting: "Reverting…",
    resolveBlockingFirst: "Clear the required items first.",

    checklist: {
      routeLabel: "Course loaded",
      routeHint:
        "Upload the race GPX or draw the course on the map. Without a course there is no distance and no window calculation.",
      positionsLabel: "Support vehicles set up",
      positionsHint:
        "Set up the support vehicles. Each one gets a code for its driver to type into their phone.",
      leadLabel: "Lead reference set",
      leadHint:
        "Mark which vehicle is the lead car. It is the start of the window race control watches.",
      sweepLabel: "Closing reference set",
      sweepHint:
        "Mark which vehicle is the closing car. Its passage is what reopens the road and closes the window.",
      startLabel: "Start time",
      startHint:
        "Optional, but it is what makes the panel show a countdown instead of just a clock.",
    },

    empty: {
      intro:
        "A race is ready to go live once it has a course, support vehicles and the lead and closing references set. Three steps:",
      step1Title: "Set up the race",
      step1Body:
        "Name, location, start and the target window between the lead car and the closing car. One minute.",
      step2Title: "Load the course",
      step2Body:
        "Upload the GPX you already have, or draw the course on the map. It is what turns a GPS position into a race kilometre.",
      step3Title: "Set up the vehicles and print the codes",
      step3Body:
        "Every moto, ambulance and support car gets a 6-character code. The driver types it into their own phone and that's it — nothing to install, no account to create.",
    },
  },

  route: {
    uploadTitle: "Load the course",
    uploadSubtitle: "Upload the race GPX file.",
    uploadAction: "Choose GPX file",
    uploadDrop: "Drop the file here",
    uploadHint:
      "Or click to choose one. Anything from Strava, Garmin Connect, RideWithGPS, Komoot or the race's own course software works.",
    uploadReading: "Large files take a few seconds.",
    drawInstead: "Or draw the course on the map",
    drawTitle: "Draw the course",
    drawHint: "Click the map to add points. Drag to adjust.",
    drawShortcuts:
      "Delete removes the selected vertex (or right-click it). Ctrl+Z undoes.",
    undo: "Undo",
    clear: "Clear",
    chooseSegment: "The file contains more than one course. Pick the race one:",
    chooseSegmentHint:
      "The file contains {count} tracks. Joining them all would create a jump in the middle of the race, so pick one.",
    segmentName: "Track {number}",
    kindTrack: "recorded track",
    kindRoute: "planned route",
    kindWaypoints: "loose waypoints",
    replaceWarning:
      "Replacing the course recalculates every position in the race. Do it before the start.",
    parseError: "Could not read the file",
    noGpx: "No GPX",
    pointCount: "{count} points",
    current: "Current course",
    replace: "Replace course",

    purpose:
      "This is the line that turns each vehicle's GPS coordinate into “kilometre 42 of the race”. Without it there is no window calculation between lead and closing car, and no suggestion of the nearest vehicle along the road.",
    missingExplain:
      "No course. Without one the system cannot say which kilometre each vehicle is at, nor calculate the window.",
    sourceGpx: "Imported from {filename}",
    sourceDrawn: "Drawn on the map",
    geometryPoints: "Geometry points",
    reviewTitle: "Checking before saving",
    warningsTitle: "{count} thing(s) to look at in this file",
    confirmUse: "Confirm and use this course",
    chooseAnotherFile: "Choose another file",
    noFileYet: "Don't have the course file yet?",
    vertices: "Vertices",
    saveDrawn: "Save course",
    deleteVertex: "Delete vertex",
    closeLoop: "Close the circuit",
    tooManyVertices:
      "{count} vertices is more than a hand-drawn course should have (limit {limit}). If the course really is that long, import a GPX.",
    oneVertex:
      "A single vertex is not a course. Click the map to mark where the race goes.",
    savedTitle: "Course saved",
    savedReplaced: "the previous course was deactivated.",
    saveErrorTitle: "Could not save",
    saveFailed: "Could not save the course. Check the connection and try again.",
    saveConnectionLost:
      "The connection dropped mid-upload. The previous course still applies — try again.",
    fileUnreadable:
      "Could not read the file from disk. Copy it to another folder and try again.",
    fileNotGpx:
      "Could not interpret this file. Confirm it is a .gpx and that it opens in another program.",

    segmentMissing: "The chosen track is not in the file.",
    segmentTooManyPoints: "This track has {count} points, above the {limit} limit. Trim the file down to the race section.",
    pointsMissing: "The list of route points did not arrive.",
    pointsTooMany: "The route has {count} points, above the {limit} limit. Trim the file to the race section before uploading.",
    pointMalformed: "Point {index} is malformed.",
    pointBadLat: "Point {index} has an invalid latitude ({value}).",
    pointBadLng: "Point {index} has an invalid longitude ({value}).",
    etaUnknown: "estimated time unavailable",
    uploadTooLarge:
      "The course you sent is too large. Trim the file down to the race section.",
    uploadBadBody: "Request body unreadable.",
    uploadBadSource: "Unknown course source.",
    uploadBadPoints: "Invalid course points.",
    uploadTooManyVertices:
      "A hand-drawn course should not have more than {limit} vertices.",
    uploadBuildFailed: "Could not build a course from these points.",
    uploadReleaseFailed:
      "Could not release the previous course. Reload the page and try again.",
    uploadInsertFailed:
      "Could not save the course. The previous course still applies.",
  },

  positions: {
    title: "Support vehicles",
    intro:
      "Every support vehicle in the race becomes a position with its own code. The driver types the code into their own phone — nothing to install, no account to create — and from then on the device transmits that vehicle's position.",
    add: "Add vehicle",
    addBulk: "Add several",
    addHint:
      "Every position starts with a unique link code and a name you can change later. The first lead car and the first closing car are marked as references automatically.",
    quantity: "Quantity",
    label: "Identifier",
    role: "Role",
    driverName: "Driver",
    driverPhone: "Phone",
    driverPhoneHint: "With the country code if it is a foreign number.",
    noDriver: "No driver recorded",
    plate: "Plate",
    referenceLead: "This is the official lead car",
    referenceSweep: "This is the official closing car",
    markLead: "Set as lead",
    markSweep: "Set as closing",
    dispatchable: "Can be dispatched to alerts",
    code: "Link code",
    codeRevoked: "revoked — generate another",
    codeExpired: "expired — generate another",
    codeHidden: "Only people who can edit the race see the codes.",
    copyCode: "Copy code",
    copied: "copied",
    regenerateCode: "Generate new code",
    regenerateWarning:
      "The current code stops working. If the driver is already linked, they keep transmitting until unlinked.",
    moveUp: "Move {position} up",
    moveDown: "Move {position} down",
    confirmRemove: "Remove it?",
    orderHint: "the list order is the order they appear in on the live panel.",
    emptyTitle: "No vehicles set up",
    emptyBody:
      "A position is a role in the race (“Moto 3”, “Ambulance 1”), not a device. The phone is linked afterwards with the code — and it can be swapped mid-race if a battery dies, without losing the history.",
    emptyStart:
      "Start with the lead car and the closing car: they are what define the window race control watches.",
    missingRefsTitle: "Window references missing",
    missingRefsBody:
      "Without both, the panel cannot calculate the time between the front and the back of the field.",
    bound: "Linked",
    notBound: "Awaiting link",
    revokeSession: "Unlink device",

    print: "Print codes",
    printTitle: "Link codes — {race}",
    printHint:
      "Hand each code to the driver of the matching vehicle before the start.",
    printLost:
      "If a sheet goes missing, generate another one on the vehicles screen and the old code stops working at once.",
    printInstruction:
      "Each driver opens {url} on their phone and types the code from their block.",
    printUrlMissing: "(app address)",
    printNoUrlTitle: "App address not configured",
    printNoUrlBody:
      "The variable {variable} is empty, so the sheet prints without the address the driver has to open. Write the address in by hand before handing it out.",
    printMissing:
      "{count} position(s) with no valid code were left off this sheet. Generate a new code for them on the vehicles screen.",
    printExpired:
      "{count} code(s) on this sheet have passed their expiry and no longer link any phone. Generate new codes before printing.",
    printNothingTitle: "Nothing to print",
    printNothingBody: "Set up the support vehicles first.",
    printFooter:
      "the code is valid for this race only and for this vehicle only. Linking a new phone drops the previous one.",

    form: {
      invalidData: "Invalid data.",
      roleInvalid: "Choose a valid role.",
      quantityInteger: "The quantity must be a whole number.",
      quantityMin: "Add at least 1 vehicle.",
      quantityMax: "Add 40 vehicles at most in one go.",
      labelRequired:
        "The vehicle needs a name — it is what race control will call on the radio.",
      labelTooLong: "Name too long (60 characters maximum).",
      driverNameTooLong: "Driver name too long (120 characters maximum).",
      phoneTooLong: "Phone number too long.",
      phoneInvalid:
        "Invalid phone number. Use digits only, with the country code if it is a foreign number.",
      plateTooLong: "Plate too long.",
      notFound: "Vehicle not found. Reload the page.",
      referenceCleared:
        "Note: the race now has no {reference} reference — set one before the start.",
      codeGenerationFailed:
        "Could not generate unique codes right now. Try again in a few seconds.",
      codeIssueUnavailable: "Could not issue a new code on this server.",
      codeNoneFree:
        "Could not draw a free code. Try again in a few seconds.",
      codeRevokedMeanwhile:
        "The previous code has already been revoked — this vehicle has no code until you try again.",
    },
  },

  map: {
    fitRoute: "Fit course",
    followMe: "Follow my vehicle",
    vehicles: "Vehicles",
    showAll: "Show all",
    noWebGL:
      "This browser does not support WebGL. Position data is still correct in the lists.",
    basemapLabel: "Base map",
    basemapHint:
      "Applies to this race only. The route line changes colour with it, so it never disappears against the background you pick.",
    basemapAsphalt: "Asphalt",
    basemapAsphaltHint:
      "Clean lines, no terrain. It competes least with the vehicles — the right choice for a city race and for a screen projected in race control.",
    basemapTopo: "Topographic",
    basemapTopoHint:
      "Contour lines, gradient and back roads. It is the only background that shows the climb before it happens — on a mountain race, that changes what gets said on the radio.",
    basemapSatellite: "Satellite",
    basemapSatelliteHint:
      "Aerial imagery. Useful to check that the road in the GPX really is the race road, and to recognise a support point by what is actually on the ground.",
    slowTitle: "The map did not finish loading.",
    slowBody:
      "It may be a background tab, WebGL unavailable, or the map tiles blocked on the network. The distances, the window and the vehicle list beside it are still correct.",
  },

  live: {
    warnStates: "Could not read the live vehicle positions.",
    warnSessions: "Could not read the device bindings.",
    warnAlerts: "Could not read the alerts: {detail}",
    warnPositions: "Could not read the positions: {detail}",
    warnGeometry: "Route geometry unavailable: {detail} The occupied stretch will not be drawn.",
    snapshotErrorTitle: "Could not build the live panel",
    snapshotErrorBody:
      "The race exists, but the live state could not be read. Reload the page; if it persists, check your connection to the database.",
    noRoute:
      "This race has no active course. Without one there is no map, no distance and no lead ↔ closing car window.",
    clockNote:
      "Ages measured against the server clock, not this computer's. Times in the race time zone ({timezone}).",
    unacknowledged: "{count} alert(s) not acknowledged.",
    moreUnacknowledged: "+{count} not acknowledged",
    viewOnMap: "show on map",

    sortByRace: "Position in race",
    sortByOrdinal: "Setup order",
    noSignalGroup: "No signal ({count}) — the map position is a memory",
    noPositions: "No vehicles set up for this race.",
    offRoute: "off course",
    clockOff: "clock out of step",
    fromTrack: "{distance} off the line",

    panelOk: "Panel live",
    panelDegraded: "Panel degraded",
    panelDown: "PANEL DISCONNECTED",
    reconciled: "reconciled {age}",
    realtime: "real time: {state}",
    realtimeOn: "on",
    realtimeConnecting: "connecting…",
    realtimeOff: "down",
    notPresent: "What is on screen is not the present. Confirm everything by radio.",
    pollingOnly: "no instant updates; reconciling every {interval}",
    refreshNow: "refresh now",
    refreshing: "refreshing…",
    soundOff: "sound off — enable",
    soundOn: "Audible warning active",

    showClosed: "{count} closed",
    hideClosed: "hide closed",
    showAllVehicles: "show all vehicles",
    showFewer: "show fewer",
    history: "history",
    hideHistory: "hide history",
    loadingHistory: "Loading history…",
    noEvents: "No events recorded.",

    startedAt: "started at {time}",
    finishedAt: "finished at {time}",
    confirmStart: "confirm start",
    confirmFinish: "confirm finish",
  },

  auth: {
    gateTitle: "Set the race up first.",
    gateTitleStrong: "On the day, just watch.",
    gateCodes: "Binding codes",
    loginTitle: "Race control panel",
    loginSubtitle: "Sign in to set the race up: course, support positions and binding codes.",
    signupSubtitle: "The account is yours, and the races you create are visible only to you. Drivers need no account — they get in with the 6-character code.",
    metaLogin: "Sign in — Flamme Rouge",
    metaSignup: "Create account — Flamme Rouge",
    errorTitle: "Could not continue",
    noticeTitle: "Almost there",
    name: "Your name",
    nameHint: "Shown to the race crew.",
    namePlaceholder: "Marina Ferrero",
    nameRequired: "Enter your name — it is what the race crew sees.",
    nameTooLong: "Name too long (80 characters maximum).",
    email: "Email",
    emailPlaceholder: "control@yourrace.it",
    emailRequired: "Enter your email.",
    emailInvalid: "That email doesn't look valid. Check for a missing @ or domain.",
    password: "Password",
    passwordHint: "8 characters minimum.",
    passwordRequired: "Enter your password.",
    passwordTooShort: "The password needs at least 8 characters.",
    passwordTooLong: "The password can have 72 characters at most.",
    passwordRepeat: "Repeat the password",
    passwordMismatch: "The two passwords don't match. Type them again.",
    submitting: "Please wait…",
    signIn: "Sign in to the panel",
    signUp: "Create account",
    haveAccount: "Already have an account?",
    signInLink: "Sign in",
    firstTime: "First time?",
    signUpLink: "Create a race control account",

    confirmSent:
      "Account created. We sent a confirmation email to {email}. Confirm it and come back here to sign in (check your spam folder too).",
    invalidCredentials:
      "Wrong email or password. If you have just signed up, confirm your email before signing in.",
    emailNotConfirmed:
      "This email has not been confirmed yet. Open the message we sent and click the link (check your spam folder).",
    userExists:
      "An account with this email already exists. Go to the sign-in screen; if you have forgotten the password, request a reset through Supabase.",
    emailRejected:
      "The server rejected this email address. Use a real address you can open right now — the confirmation goes there.",
    weakPassword:
      "Password too weak for the server. Use at least 8 characters, mixing letters and digits.",
    rateLimited:
      "Too many attempts in a short time. Wait a few minutes before trying again.",
    signupDisabled:
      "Sign-up is disabled on this server. Ask someone on the team to create your account.",
    genericFailure: "Could not finish just now. Check your connection and try again.",
  },

  landing: {
    skip: "Skip to content",

    nav: {
      problem: "The problem",
      measures: "What the road measures",
      screens: "The two screens",
      aria: "Page sections",
      home: "Flamme Rouge, home",
      markerStart: "KM 000 — START",
    },

    hero: {
      title: "Live race control,",
      titleStrong: "measured along the road.",
      lead: "Every support vehicle on the course in real time. The gap between the lead car and the closing car measured like a timing split, not estimated. And help chosen by the distance the car will actually drive.",
      ctaPanel: "Open race control",
      ctaDriver: "I am a driver, I have a code",
      note: "The flamme rouge marks the final kilometre. Here it marks the number race control needs: how much is left, measured, not guessed.",
      scroll: "Scroll",
    },

    numbers: {
      aria: "Numbers measured in testing",
      unitKm: "km",
      unitPoints: "points",
      unitChars: "characters",
      roadLabel: "Along the road",
      roadBody: "Separated the motorbike from the crash it appeared to be looking at. In a straight line it was 50 metres. The system sent the ambulance that was 1.5 km behind.",
      offlineLabel: "No signal",
      offlineBody: "Collected over two minutes with no coverage, they all arrived complete, in order and without duplicates once the signal came back.",
      codeLabel: "To get in",
      codeBody: "That is everything the driver types. No account, no app, no hardware to buy and collect afterwards.",
    },

    problem: {
      marker: "What happens today",
      title: "The race happens on the radio.",
      titleStrong: "And the radio does not reach the valley.",
      lead: "None of this is the organiser's fault. It is what is left when the only source of position is someone saying, from memory, where they think they are.",
      photo: "Photo · stretched peloton",
      q1: "“Where is the closing car?”",
      a1: "The answer is an estimate, and the road is reopened on the strength of it — along with the closure window agreed with the traffic authority, met or missed. Ten minutes too long breaks the agreement; ten minutes too short reopens the street before it is safe.",
      q2: "“Someone is down at km 60.”",
      a2: "Who heard it? Who went? While nobody answers on the radio, there is no way to tell “the call never arrived” from “the call arrived and they are on their way”.",
      q3: "“Send the nearest support.”",
      a3: "Nearest measured how? On the paper map the distance is whatever the eye says — and the eye does not know that stretch is the return leg, and that the road only meets itself again 30 km further on.",
      q4: "“The driver did not understand.”",
      a4: "At an international race the support crew speaks four languages. The radio speaks one, and the half-hour briefing before the start is over.",
      q5: "“The race is finished.”",
      a5: "And no record remains of who was where, at what time, when the alert was raised and how long help took. The federation asks later; the crew's memory answers.",
    },

    measures: {
      marker: "What the road measures",
      title: "Six engineering decisions",
      titleStrong: "that change what appears on screen.",
      leadTitle: "Distance along the road, not as the crow flies.",
      leadBody1: "In a real test, a motorbike was **0.05 km** from a crash in a straight line and **37.3 km** away along the road — on the return leg of the course, with the only link between the two thirty-seven kilometres further on. The system dispatched the ambulance that was **1.5 km behind**, travelling the same way as the race.",
      leadBody2: "A system comparing coordinates would have sent the motorbike, and the motorbike would have taken the whole race to arrive. A vehicle that has already passed the point also pays the price of finding somewhere to turn and driving against the flow — and that asymmetry counts.",
      c2Title: "The lead↔closing gap is measured, not estimated.",
      c2Tag: "measured",
      c2Body: "The system records what time the lead car passed each point of the course. When the closing car reaches km 42, the gap is the difference between two observed times — the same arithmetic as a timing split. That is the number the organisation agreed with the traffic authority: it is the closing car's passage that gives the road back to traffic. When there is not enough history yet, the screen says “projected” and gives the reason. The director never has to guess which of the two they are reading.",
      c3Title: "It works with no signal.",
      c3Tag: "40 points",
      c3Body: "Nothing is sent before it is written to the device, and nothing leaves the queue before the server confirms receipt. In a two-minute test with no coverage, all 40 stored points arrived complete, in order and without duplicates as soon as the signal returned.",
      c4Title: "An alert never fails in silence.",
      c4Tag: "local queue",
      c4Body: "An alert jumps the queue ahead of any GPS ping and is retried until the server confirms it — a call for help is never dropped, even if that means a queue that will not empty. And the right help is dispatched by category, with nobody having to choose in the middle of the emergency: a crash calls the ambulance, a mechanical calls the mechanic.",
      c5Title: "Any phone becomes the vehicle's GPS.",
      c5Tag: "6 characters",
      c5Body: "The driver opens the link, types the 6-character code printed on the briefing sheet, and their phone becomes that vehicle's tracker. No app to install, no hardware to buy, charge, hand out and collect at the end of the day.",
      c6Title: "Six languages, a single link.",
      c6Tag: "6 languages",
      c6Body: "The language is not in the URL — the device negotiates it. The same link and the same printed QR give Portuguese to the Brazilian driver, Italian to the Italian and German to the Austrian, with race control managing nothing. A phone set to pt-PT gets Portuguese, not English.",
      summaryLabel: "Summary",
      summary: "Six decisions, one effect: race control stops asking where each car is.",
    },

    how: {
      marker: "How it works",
      title: "Three steps before the start.",
      titleStrong: "None during.",
      step: "Step {n}",
      s1Title: "Load the course.",
      s1Body: "The race GPX, or the line drawn on screen. The course is indexed once, and every distance measured afterwards comes from it — each vehicle's position, the gap and the choice of who to send.",
      s2Title: "Print the code sheet.",
      s2Body: "One 6-character code per vehicle, with each one's role: lead, closing, broom wagon, ambulance, mechanic, motorbike, marshal. The sheet comes out ready to print and hand over at the briefing.",
      s3Title: "Open the panel on the day.",
      s3Body: "Each driver opens the link, types the code and appears on the map in their own phone's language. During the race there is nothing left to configure.",
    },

    screens: {
      marker: "The two screens",
      title: "One race control room.",
      titleStrong: "One phone per vehicle.",
      panelEyebrow: "Race control panel",
      panelTitle: "What race control sees",
      panelCapture: "Screenshot · race control panel",
      p1: "Live map with every vehicle, each role in its own colour and with the age of its data.",
      p2: "The gap between lead and closing car, marked as measured or projected.",
      p3: "Alert queue with the nearest support already suggested — and the reason for the suggestion in writing.",
      p4: "Connection health vehicle by vehicle: who is live, who is late, who has gone quiet.",
      appEyebrow: "Driver app",
      appTitle: "What the driver sees",
      appCapture: "Screenshot · driver app",
      a1: "Enters with the 6-character code. No account, no app store.",
      a2: "Large alert buttons, for a gloved hand in a moving car.",
      a3: "Keeps sending with the screen off and stores everything when the signal drops.",
      a4: "In the phone's own language, from the same link everyone received.",
    },

    close: {
      marker: "Flamme rouge",
      title: "Two doors.",
      titleStrong: "No decision in between.",
      lead: "Race control signs in with an account and builds the race. The driver enters with a code and has nothing else to decide.",
      trakr: "Same house as TRAKR, different audience. Athletes and coaches have their product; this one is for the people who organise — which is why it has its own name, sales cycle and rules.",
      aria: "Enter the system",
      directorTitle: "I am race control",
      directorBody: "Set up the race, load the course, generate the codes and follow the operation live.",
      directorCta: "Open the panel →",
      driverTitle: "I am a driver",
      driverBody: "Type the 6-character code race control gave you and your phone becomes the GPS for your position.",
      driverCta: "Enter with a code →",
    },

    footer: {
      tagline: "Live race control for road cycling.",
      languages: "The driver app speaks",
      enter: "Sign in",
      director: "Race control",
      signup: "Create account",
      driver: "Driver with a code",
      credits: "a tool by",
    },

    meta: {
      title: "Flamme Rouge — live race control for road cycling",
      description: "Every support vehicle's position measured along the road, the lead-to-closing gap measured like a timing split, and alerts that dispatch the right help by category. The GPS is the driver's phone.",
      ogTitle: "Flamme Rouge — live race control",
      ogDescription: "In a real test, a motorbike was 0.05 km from a crash in a straight line and 37.3 km away along the road. The system dispatched the ambulance 1.5 km behind.",
    },
  },
  errors: {
    forbidden: "You do not have permission to change this race.",
    raceNotFound: "Race not found.",
    invalidRace: "Invalid race.",
    sessionExpired: "Your session expired. Sign in again.",
    notStartable: "Only a race in draft or ready can be started.",
    listRaces:
      "Reload the page. If it persists, sign out and back in — your session may have expired.",
    noChange:
      "Nothing changed: the alert may already have been closed by someone else, or you no longer have permission on this race. Reload the page.",

    db: {
      saveFailed: "Could not save. Try again; if it persists, reload the page.",
      routeRaceConflict:
        "Another course was activated on this race while you were working. Reload the page and send again — the most recent course wins.",
      bindCodeTaken:
        "The drawn code collided with one already in use on another race. Click save again: a new code will be drawn.",
      oneLead:
        "This race already has a lead reference. Clear the current one before setting another.",
      oneSweep:
        "This race already has a closing reference. Clear the current one before setting another.",
      ordinalConflict:
        "Two vehicles ended up in the same order. Reload the page and redo the reordering.",
      sessionTaken:
        "A phone is already linked to this vehicle. Revoke the current link before creating another.",
      leadSweepSame:
        "The same vehicle cannot be both the lead and the closing reference — the window calculation would compare the vehicle with itself.",
      gapWindowIncoherent: "The window's lower limit must be below the upper limit.",
      targetGapRange: "The target window must be between 1 and 600 minutes.",
      raceNameLength: "The race name must be between 1 and 200 characters.",
      positionLabelLength: "The vehicle name must be between 1 and 60 characters.",
      bindCodeFormat: "The generated code came out in the wrong format. Try again.",
      trackDistance: "The course must be longer than zero.",
      trackPoints: "The course needs at least 2 points.",
      duplicate: "That record already exists. Reload the page to see the current state.",
      checkViolation:
        "Some value is outside what is allowed. Review the fields and try again.",
      missingRace: "The race referenced no longer exists. Go back to the race list.",
      notFound:
        "Record not found — it may have been removed by someone else. Reload the page.",
    },
  },
};
