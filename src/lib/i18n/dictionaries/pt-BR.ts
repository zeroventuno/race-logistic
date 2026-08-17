/**
 * Português (Brasil) — dicionário de referência.
 *
 * Este arquivo é a FONTE DA VERDADE da estrutura. O tipo `Dictionary` é
 * derivado dele, e os outros cinco idiomas são tipados contra esse tipo — então
 * uma chave que exista aqui e falte no alemão quebra o build, em vez de virar
 * um `undefined` que só aparece na tela de um motorista em Munique no dia da
 * prova.
 *
 * O vocabulário usa os termos reais de comissariado de ciclismo de cada país,
 * não tradução literal. "Carro vassoura" é `voiture balai` em francês e
 * `Besenwagen` em alemão porque é assim que a função se chama nessas
 * federações — quem trabalha em prova reconhece o termo certo na hora.
 *
 * DOIS VEÍCULOS DIFERENTES, e confundi-los é o erro mais caro deste arquivo:
 * o CARRO DE FECHAMENTO (`sweep_car`) encerra a interdição da via, e a VASSOURA
 * (`broom_wagon`) é o último veículo, que recolhe quem abandona com a via já
 * reaberta. A janela que o painel calcula é abertura ↔ FECHAMENTO — ela é o
 * compromisso administrativo com a autoridade de trânsito. Ver o comentário de
 * `PositionRole` em `src/lib/types.ts`.
 */

export const ptBR = {
  meta: {
    appName: "Flamme Rouge",
    tagline: "Direção de prova ao vivo",
  },

  common: {
    save: "Salvar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    back: "Voltar",
    next: "Avançar",
    close: "Fechar",
    edit: "Editar",
    remove: "Remover",
    add: "Adicionar",
    retry: "Tentar de novo",
    loading: "Carregando…",
    saving: "Salvando…",
    search: "Buscar",
    none: "Nenhum",
    unknown: "Desconhecido",
    optional: "opcional",
    required: "obrigatório",
    yes: "Sim",
    no: "Não",
    error: "Algo deu errado",
    errorRetry: "Não foi possível completar. Tente de novo.",
    offline: "Sem conexão",
    online: "Conectado",
    language: "Idioma",
    logout: "Sair",
  },

  roles: {
    lead_car: { label: "Carro de abertura", short: "Abertura" },
    // Último veículo do comboio: a passagem dele libera a via.
    sweep_car: { label: "Carro de fechamento", short: "Fechamento" },
    // Vem atrás do último atleta e recolhe quem abandona.
    broom_wagon: { label: "Vassoura", short: "Vassoura" },
    moto: { label: "Moto de apoio", short: "Moto" },
    ambulance: { label: "Ambulância", short: "Ambulância" },
    mechanic: { label: "Apoio mecânico", short: "Mecânico" },
    support_car: { label: "Carro de apoio", short: "Apoio" },
    marshal: { label: "Fiscal de percurso", short: "Fiscal" },
    other: { label: "Outro", short: "Outro" },
  },

  signal: {
    live: "Ao vivo",
    delayed: "Atrasado",
    stale: "Sem atualizar",
    lost: "Sem sinal",
    never: "Não vinculado",
    lastSeen: "Última posição {age}",
  },

  race: {
    status: {
      draft: "Rascunho",
      armed: "Pronta",
      live: "Em andamento",
      finished: "Encerrada",
      archived: "Arquivada",
    },
    distance: "Distância",
    elevation: "Altimetria",
    start: "Largada",
    positions: "Posições de apoio",
    route: "Percurso",
    noStart: "Sem horário de largada",
    details: "Dados da prova",
    lapsTotal: "{laps} voltas = {distance} de prova.",
    lap: "volta {lap}/{laps}",
    lapsCircuit: "circuito de {laps} voltas",
    lapUnknown: "volta ?",

    form: {
      nameLabel: "Nome da prova",
      namePlaceholder: "Giro delle Langhe — 2ª etapa",
      nameRequired: "Dê um nome à prova — é como você vai reconhecê-la na lista.",
      nameTooLong: "Nome muito longo (máximo 200 caracteres).",
      locationLabel: "Local",
      locationHint: "Cidade ou região da largada. Aparece na lista de provas.",
      locationPlaceholder: "Alba, Piemonte",
      locationTooLong: "Local muito longo (máximo 200 caracteres).",
      dateLabel: "Data da largada",
      dateRequired: "Informe também a data da largada.",
      timeLabel: "Horário da largada",
      timeHint: "No relógio do local da prova.",
      timeRequired: "Informe também o horário da largada.",
      dateTimeInvalid: "Data ou horário inválidos. Confira os dois campos.",
      timezoneLabel: "Fuso horário da prova",
      timezoneHint:
        "Tudo que a direção vê é convertido para este fuso, inclusive no celular do motorista.",
      timezoneRequired: "Escolha o fuso horário do local da prova.",
      timezoneUnknown: "Fuso horário desconhecido.",
      basemapInvalid: "Escolha um dos mapas disponíveis.",
      lapsLabel: "Voltas sobre o percurso",
      lapsHint:
        "1 para prova ponto-a-ponto. Num circuito, a distância da prova é o traçado multiplicado pelas voltas.",
      lapsRequired: "Informe o número de voltas.",
      lapsInteger: "O número de voltas precisa ser inteiro.",
      lapsMin: "A prova tem pelo menos 1 volta.",
      lapsMax: "No máximo 50 voltas.",
      gapHint:
        "Quantos minutos a direção quer entre o carro de abertura e o de fechamento. É a partir daqui que o painel decide se o pelotão esticou ou comprimiu demais.",
      targetLabel: "Janela alvo (minutos)",
      targetRequired: "Informe a janela alvo em minutos.",
      targetInteger: "A janela alvo precisa ser um número inteiro de minutos.",
      targetMin: "A janela alvo precisa ser de pelo menos 1 minuto.",
      targetMax: "A janela alvo não pode passar de 600 minutos (10 horas).",
      minLabel: "Alerta abaixo de (minutos)",
      minHint: "Pelotão comprimido demais.",
      minInteger: "O limite mínimo precisa ser um número inteiro de minutos.",
      minNegative: "O limite mínimo não pode ser negativo.",
      minMax: "O limite mínimo não pode passar de 600 minutos.",
      minAboveTarget: "O mínimo não pode ser maior que a janela alvo ({target} min).",
      maxLabel: "Alerta acima de (minutos)",
      maxHint: "Pelotão esticado demais.",
      maxInteger: "O limite máximo precisa ser um número inteiro de minutos.",
      maxMin: "O limite máximo precisa ser de pelo menos 1 minuto.",
      maxMax: "O limite máximo não pode passar de 600 minutos.",
      maxBelowMin: "O limite máximo precisa ser maior que o mínimo ({min} min).",
      maxBelowTarget: "O máximo não pode ser menor que a janela alvo ({target} min).",
      showLimits: "Definir limites de alerta",
      saved: "Dados da prova atualizados",
      afterSave: "Depois de salvar você vai direto para o percurso.",
    },
  },

  gap: {
    title: "Janela abertura ↔ fechamento",
    short: "Janela",
    targetLabel: "Janela alvo",
    target: "Alvo: {duration}",
    measured:
      "Medido pela diferença de horário na passagem dos dois veículos pelo mesmo ponto.",
    projected:
      "Projetado: {distance} pela estrada, na velocidade média atual do fechamento ({speed}).",
    noLead: "Carro de abertura sem posição. Vincule o aparelho dele.",
    noSweep: "Carro de fechamento sem posição. Vincule o aparelho dele.",
    noBoth: "Aguardando a posição dos dois veículos de referência.",
    sweepAhead:
      "O carro de fechamento está à frente do de abertura. Confira se os papéis estão trocados no cadastro.",
    sweepStopped:
      "Distância pela estrada: {distance}. Carro de fechamento parado — tempo indefinido.",
    noHistory:
      "Distância pela estrada: {distance}. Sem histórico suficiente para converter em tempo.",
    stale: "Dado de {age} — pode não refletir a posição atual.",
    overTarget: "Acima da janela alvo",
    underTarget: "Abaixo da janela alvo",

    timeSeparation: "separação no tempo",
    alongRoad: "pela estrada",
    methodMeasured: "Medido",
    methodProjected: "Projetado",
    methodNone: "Sem dado",
    withinTarget: "Dentro da janela",
    overTargetDetail: "esticou demais",
    underTargetDetail: "comprimiu demais",
    comparisonSuspended:
      "Comparação com a janela alvo suspensa enquanto o dado não for confiável",
    noLimits: "Sem limites definidos para esta prova",
    clockSuspect:
      "Relógio de um dos aparelhos de referência está fora de hora em relação ao servidor. Enquanto isso durar, a idade do dado e o cálculo medido não são confiáveis — confirme a posição pelo rádio.",
    lapsUncertain:
      "Prova em circuito de {laps} voltas: o histórico carregado não alcança a largada, então a contagem de voltas pode estar subestimada e a janela, maior do que aparece.",
    onTarget: "Janela {gap}, combinado {target}. Nada a corrigir.",
    verdictAhead: "Janela {gap}, combinado {target} — adiantado {drift}.",
    verdictBehind: "Janela {gap}, combinado {target} — atrasado {drift}.",
    remedyAhead: "Retarde o carro de fechamento.",
    remedyBehind: "Acelere o carro de fechamento.",
    costAhead:
      "A via está reabrindo antes do previsto e quem ficou para trás perde a proteção cedo demais.",
    costBehind:
      "A interdição está passando do tempo autorizado pela autoridade de trânsito.",
  },

  alerts: {
    title: "Alertas",
    none: "Nenhum alerta ativo",
    raise: "Disparar alerta",
    categories: {
      medical: { label: "Acidente / ambulância", short: "Acidente" },
      mechanical: { label: "Problema mecânico", short: "Mecânico" },
      other: { label: "Outro", short: "Outro" },
    },
    status: {
      open: "Aberto",
      acknowledged: "Reconhecido",
      dispatched: "Apoio acionado",
      en_route: "A caminho",
      on_scene: "No local",
      resolved: "Resolvido",
      cancelled: "Cancelado",
    },
    priority: {
      critical: "Crítico",
      high: "Alto",
      normal: "Normal",
    },
    confirmMedical: "Confirmar chamado de emergência",
    confirmMedicalBody:
      "Isso aciona a ambulância mais próxima imediatamente e marca o local no mapa de toda a equipe.",
    sending: "Enviando…",
    queued: "Na fila — sem sinal. Continuará tentando.",
    delivered: "Recebido pela direção",
    failed: "Falha no envio — tentando de novo",
    at: "no km {km}",
    raisedBy: "Disparado por {position}",
    noteLabel: "Descrição (opcional)",
    notePlaceholder: "O que aconteceu?",

    storageFailedTitle: "ALERTA NÃO SALVO NESTE APARELHO — USE O RÁDIO AGORA.",
    storageFailedBody:
      "O armazenamento local recusou a gravação ({reason}). Nada será reenviado sozinho.",
    retryCount: "{count} tentativa(s) sem sucesso. Avise pelo rádio.",
    unknownFailure: "falha desconhecida",
    nobodyDispatched: "Ninguém foi acionado para este alerta.",

    dispatch: {
      youWereCalled: "Você foi acionado",
      calling: "Acionando {position}",
      called: "{position} acionada",
      reason: "{position}, {distance} {direction} pelo percurso, ~{eta}",
      ahead: "à frente",
      behind: "atrás",
      onMyWay: "Estou indo",
      cantGo: "Não posso",
      arrived: "Cheguei ao local",
      enRoute: "{position} está a caminho",
      onScene: "{position} chegou ao local",
      declined: "{position} não pôde atender",
      reassigning: "Acionando o próximo apoio disponível…",
      noneAvailable:
        "Nenhum apoio disponível para esta categoria. A direção precisa agir manualmente.",
      declineReason: "Motivo (opcional)",
      reassign: "Trocar apoio",
      dispatch: "Acionar apoio",
      auto: "automático",
      fallbackNoPosition:
        "Sem sugestão calculada e sem posição no percurso — ordem arbitrária. Confirme pelo rádio.",
      fallbackReason:
        "Sem sugestão calculada. {distance} de diferença no percurso, sem cálculo de retorno nem de tempo estimado.",
    },

    proximity: {
      ahead: "{category} {distance} à frente",
      passing: "Você está passando pelo local do alerta",
      dismiss: "Entendi",
    },

    confirm: {
      prompt: "Você passou pelo local. O problema continua lá?",
      still_there: "Continua lá",
      cleared: "Já foi liberado",
      not_found: "Não vi nada",
      thanks: "Obrigado — a direção foi informada.",
      countStillThere: "{count} confirmaram",
      countCleared: "{count} disseram que foi liberado",
    },

    actions: {
      acknowledge: "Reconhecer",
      resolve: "Resolver",
      cancel: "Cancelar alerta",
      confirmCancel: "confirmar? (alarme falso)",
      resolutionNote: "O que foi feito",
    },
  },

  driver: {
    bindTitle: "Digite o código da sua posição",
    bindSubtitle:
      "A direção da prova passou um código de 6 caracteres. Ele vincula este celular à sua função na prova.",
    bindPlaceholder: "ABC-123",
    bindAction: "Vincular",
    bindInvalid: "Código inválido. Confira os 6 caracteres e tente de novo.",
    bindNotFound: "Código não encontrado ou já expirado. Fale com a direção.",
    bindTooManyAttempts:
      "Muitas tentativas. Aguarde um momento antes de tentar de novo.",
    bindPasteHint:
      "Pode colar. As letras O e I são lidas como 0 e 1 — o código não usa essas letras.",
    boundAs: "Você é {position} em {race}",
    unbind: "Desvincular este aparelho",
    unbindConfirm:
      "Desvincular faz este celular parar de transmitir a posição do veículo. Confirma?",
    revoked:
      "Este aparelho foi desvinculado pela direção. Peça um código novo.",

    gpsPermissionTitle: "Precisamos da sua localização",
    gpsPermissionBody:
      "O app usa o GPS para mostrar seu veículo no mapa da direção. Sem isso, sua posição não aparece para ninguém.",
    gpsDenied:
      "Permissão de localização negada. Habilite nos ajustes do navegador e recarregue.",
    gpsUnavailable: "GPS indisponível neste aparelho.",
    gpsSearching: "Procurando sinal de GPS…",
    gpsNoApi:
      "Este navegador não fornece localização. Use o Chrome ou o Safari do celular.",
    gpsNoFix:
      "Sem sinal de GPS. Em túnel ou garagem isso é esperado; a captura volta sozinha.",
    gpsTimeout: "GPS demorando para responder. Continuando a tentar.",
    gpsFailed: "Falha ao obter posição. A captura continua tentando.",
    gpsDeniedIOS:
      "Localização bloqueada. No iPhone: Ajustes → Safari → Localização → Perguntar, depois recarregue esta página. Se usa o app do Chrome, é Ajustes → Chrome → Localização.",
    gpsDeniedAndroid:
      "Localização bloqueada. No Android: toque no cadeado ao lado do endereço → Permissões → Localização → Permitir, e recarregue a página.",
    gpsDeniedBrowser:
      "Localização bloqueada pelo navegador. Libere o acesso à localização nas permissões do site e recarregue a página.",

    gapWarning: "Você ficou {age} sem transmitir.",
    gapWarningBody:
      "A direção não viu sua posição nesse período. Mantenha esta tela à frente e o aparelho ligado na energia.",
    tapToDismiss: "tocar para dispensar",
    alertNotSaved: "ALERTA NÃO SALVO NESTE APARELHO — USE O RÁDIO AGORA.",
    alertNotSavedDetail:
      "O armazenamento local recusou a gravação ({reason}). Nada será reenviado sozinho.",
    alertAttempts: "{count} tentativa(s) sem sucesso. Avise pelo rádio.",
    transmitting: "Transmitindo",
    paused: "Pausado",
    queuedPings: "{count} pontos na fila",
    queuedAlerts: "{count} alerta(s) ainda não entregue(s). Avise pelo rádio.",
    pingRejected: "POSIÇÃO RECUSADA",
    pingRejectedDetail:
      "O servidor recusou {count} posição(ões): sua posição NÃO está aparecendo no mapa da direção.",
    queueNotDurable:
      "Armazenamento local indisponível: a fila se perde se o app fechar.",
    batteryWarning: "Bateria baixa — considere ligar o carregador.",
    keepAwake: "Mantendo a tela ligada",
    keepScreenOpen:
      "Mantenha esta tela aberta durante a prova. A posição é enviada automaticamente, mesmo com sinal ruim.",
  },

  director: {
    dashboard: "Painel",
    myRaces: "Minhas provas",
    myRacesSubtitle:
      "Cada prova tem seu percurso, suas posições de apoio e seus códigos.",
    newRace: "Nova prova",
    newRaceSubtitle:
      "Só o essencial agora. Percurso e posições vêm nos próximos passos e podem ser mexidos até a hora da largada.",
    createAndContinue: "Criar prova e ir para o percurso",
    noRaces: "Você ainda não criou nenhuma prova.",
    noRacesAction: "Criar a primeira prova",
    setupChecklist: "Para a prova ir ao ar",
    needsRoute: "Carregar o percurso",
    needsPositions: "Cadastrar posições de apoio",
    needsLead: "Definir o carro de abertura",
    needsSweep: "Definir o carro de fechamento",
    needsBinding: "{count} posição(ões) sem aparelho vinculado",
    ready: "Tudo pronto",
    goLive: "Iniciar prova",
    finish: "Encerrar prova",

    areaOverline: "Área da direção de prova",
    filterAll: "Todas",
    filterReady: "Prontas",
    filterPreparing: "Em preparação",
    filterFinished: "Encerradas",
    noneInFilter: "Nenhuma prova neste estado.",
    openRace: "Abrir",
    openRecord: "Registro",
    supportShort: "Apoio",
    listErrorBody:
      "Recarregue a página. Se persistir, saia e entre de novo — sua sessão pode ter expirado.",
    steps: "Etapas da prova",
    overview: "Resumo",
    live: "Ao vivo",
    resolveItem: "Resolver",
    pendingCount: "{count} pendência(s)",
    readOnly: "Somente leitura",
    readOnlyRoute:
      "Você participa desta prova como observador e não pode alterar o percurso.",
    markReady: "Marcar prova como pronta",
    marking: "Marcando…",
    backToDraft: "Voltar para rascunho",
    reverting: "Voltando…",
    resolveBlockingFirst: "Resolva as pendências obrigatórias primeiro.",

    checklist: {
      routeLabel: "Percurso carregado",
      routeHint:
        "Suba o GPX da prova ou desenhe o traçado no mapa. Sem percurso não há cálculo de quilometragem nem de janela.",
      positionsLabel: "Posições de apoio cadastradas",
      positionsHint:
        "Cadastre os veículos de apoio. Cada um recebe um código para o motorista digitar no celular.",
      leadLabel: "Referência de abertura definida",
      leadHint:
        "Marque qual posição é o carro de abertura. É o começo da janela que a direção acompanha.",
      sweepLabel: "Referência de fechamento definida",
      sweepHint:
        "Marque qual posição é o carro de fechamento. É a passagem dele que reabre a via e fecha a janela.",
      startLabel: "Horário de largada",
      startHint:
        "Opcional, mas é o que faz o painel mostrar contagem regressiva em vez de só o relógio.",
    },

    empty: {
      intro:
        "Uma prova fica pronta para ir ao ar quando tem percurso, posições de apoio e as referências de abertura e fechamento marcadas. São três passos:",
      step1Title: "Cadastre a prova",
      step1Body:
        "Nome, local, largada e a janela alvo entre o carro de abertura e o de fechamento. Um minuto.",
      step2Title: "Carregue o percurso",
      step2Body:
        "Suba o GPX que você já tem, ou desenhe o traçado no mapa. É o que transforma posição de GPS em quilômetro de prova.",
      step3Title: "Cadastre as posições e imprima os códigos",
      step3Body:
        "Cada moto, ambulância e carro de apoio ganha um código de 6 caracteres. O motorista digita no celular dele e pronto — sem instalar nada, sem criar conta.",
    },
  },

  route: {
    uploadTitle: "Carregar o percurso",
    uploadSubtitle: "Envie o arquivo GPX da prova.",
    uploadAction: "Escolher arquivo GPX",
    uploadDrop: "Arraste o arquivo aqui",
    uploadHint:
      "Ou clique para escolher. Serve o que sai do Strava, Garmin Connect, RideWithGPS, Komoot ou do software de traçado da prova.",
    uploadReading: "Arquivos grandes levam alguns segundos.",
    drawInstead: "Ou desenhe o percurso no mapa",
    drawTitle: "Desenhar o percurso",
    drawHint: "Clique no mapa para adicionar pontos. Arraste para ajustar.",
    drawShortcuts:
      "Delete apaga o vértice selecionado (ou clique com o botão direito). Ctrl+Z desfaz.",
    undo: "Desfazer",
    clear: "Limpar",
    chooseSegment: "O arquivo tem mais de um percurso. Escolha o da prova:",
    chooseSegmentHint:
      "O arquivo tem {count} traçados. Juntar todos criaria um salto no meio da prova, então escolha um.",
    segmentName: "Traçado {number}",
    kindTrack: "trilha gravada",
    kindRoute: "rota planejada",
    kindWaypoints: "waypoints soltos",
    replaceWarning:
      "Substituir o percurso recalcula todas as posições em prova. Faça isso antes da largada.",
    parseError: "Não foi possível ler o arquivo",
    noGpx: "Sem GPX",
    pointCount: "{count} pontos",
    current: "Percurso atual",
    replace: "Substituir percurso",

    purpose:
      "É o traçado que transforma a coordenada de GPS de cada veículo em “quilômetro 42 da prova”. Sem ele não há cálculo de janela entre abertura e fechamento, nem sugestão de apoio mais próximo pela estrada.",
    missingExplain:
      "Sem percurso. Sem ele o sistema não consegue dizer em que quilômetro cada veículo está, nem calcular a janela.",
    sourceGpx: "Importado de {filename}",
    sourceDrawn: "Desenhado no mapa",
    geometryPoints: "Pontos de geometria",
    reviewTitle: "Conferindo antes de gravar",
    warningsTitle: "{count} ponto(s) de atenção neste arquivo",
    confirmUse: "Confirmar e usar este percurso",
    chooseAnotherFile: "Escolher outro arquivo",
    noFileYet: "Ainda não tem o arquivo do percurso?",
    vertices: "Vértices",
    saveDrawn: "Salvar percurso",
    deleteVertex: "Apagar vértice",
    closeLoop: "Fechar circuito",
    tooManyVertices:
      "{count} vértices é mais do que um traçado desenhado à mão deveria ter (limite {limit}). Se o percurso é mesmo longo, importe um GPX.",
    oneVertex:
      "Um vértice só não é percurso. Clique no mapa para marcar por onde a prova passa.",
    savedTitle: "Percurso gravado",
    savedReplaced: "o percurso anterior foi desativado.",
    saveErrorTitle: "Não deu para gravar",
    saveFailed:
      "Não foi possível gravar o percurso. Verifique a conexão e tente de novo.",
    saveConnectionLost:
      "A conexão caiu no meio do envio. O percurso anterior continua valendo — tente de novo.",
    fileUnreadable:
      "Não foi possível ler o arquivo do disco. Copie-o para outra pasta e tente de novo.",
    fileNotGpx:
      "Não foi possível interpretar este arquivo. Confirme que é um .gpx e que ele abre em outro programa.",

    segmentMissing: "Traçado escolhido não existe no arquivo.",
    segmentTooManyPoints: "Este traçado tem {count} pontos, acima do limite de {limit}. Recorte o arquivo para o trecho da prova.",
    uploadTooLarge:
      "O percurso enviado é grande demais. Recorte o arquivo para o trecho da prova.",
    uploadBadBody: "Corpo da requisição ilegível.",
    uploadBadSource: "Origem do percurso desconhecida.",
    uploadBadPoints: "Pontos do percurso inválidos.",
    uploadTooManyVertices:
      "Um percurso desenhado à mão não deveria ter mais de {limit} vértices.",
    uploadBuildFailed: "Não foi possível montar o percurso com esses pontos.",
    uploadReleaseFailed:
      "Não foi possível liberar o percurso anterior. Recarregue a página e tente de novo.",
    uploadInsertFailed:
      "Não foi possível gravar o percurso. O percurso anterior continua valendo.",
  },

  positions: {
    title: "Posições de apoio",
    intro:
      "Cada veículo de apoio da prova vira uma posição com código próprio. O motorista digita o código no celular dele — sem instalar aplicativo, sem criar conta — e a partir daí o aparelho transmite a posição daquele veículo.",
    add: "Adicionar posição",
    addBulk: "Adicionar várias",
    addHint:
      "Cada posição nasce com um código de vínculo único e um nome que você pode trocar depois. O primeiro carro de abertura e o primeiro carro de fechamento já entram marcados como referência.",
    quantity: "Quantidade",
    label: "Identificação",
    role: "Papel",
    driverName: "Motorista",
    driverPhone: "Telefone",
    driverPhoneHint: "Com código do país se for de fora.",
    noDriver: "Motorista não informado",
    plate: "Placa",
    referenceLead: "É o carro de abertura oficial",
    referenceSweep: "É o carro de fechamento oficial",
    markLead: "Marcar como abertura",
    markSweep: "Marcar como fechamento",
    dispatchable: "Pode ser acionado para atender alertas",
    code: "Código de vínculo",
    codeRevoked: "revogado — gere outro",
    codeExpired: "expirado — gere outro",
    codeHidden: "Só quem edita a prova enxerga os códigos.",
    copyCode: "Copiar código",
    copied: "copiado",
    regenerateCode: "Gerar código novo",
    regenerateWarning:
      "O código atual deixa de funcionar. Se o motorista já estiver vinculado, ele continua transmitindo até ser desvinculado.",
    moveUp: "Subir {position}",
    moveDown: "Descer {position}",
    confirmRemove: "Remover mesmo?",
    orderHint: "a ordem da lista é a ordem em que elas aparecem no painel ao vivo.",
    emptyTitle: "Nenhuma posição cadastrada",
    emptyBody:
      "Uma posição é um papel na prova (“Moto 3”, “Ambulância 1”), não um aparelho. O celular é vinculado depois, pelo código — e pode ser trocado no meio da prova se a bateria morrer, sem perder o histórico.",
    emptyStart:
      "Comece pelo carro de abertura e pelo de fechamento: são eles que definem a janela que a direção acompanha.",
    missingRefsTitle: "Faltam referências da janela",
    missingRefsBody:
      "Sem as duas, o painel não consegue calcular o tempo entre a frente e o fim do pelotão.",
    bound: "Vinculado",
    notBound: "Aguardando vínculo",
    revokeSession: "Desvincular aparelho",

    print: "Imprimir códigos",
    printTitle: "Códigos de vínculo — {race}",
    printHint:
      "Entregue cada código ao motorista da posição correspondente antes da largada.",
    printLost:
      "Se um papel se perder, gere outro na tela de posições e o antigo para de valer na hora.",
    printInstruction:
      "Cada motorista abre {url} no celular e digita o código do bloco dele.",
    printUrlMissing: "(endereço do app)",
    printNoUrlTitle: "Endereço do app não configurado",
    printNoUrlBody:
      "A variável {variable} está vazia, então a folha sai sem o endereço que o motorista precisa abrir. Escreva o endereço à mão antes de distribuir.",
    printMissing:
      "{count} posição(ões) sem código válido ficaram de fora desta folha. Gere um código novo para elas na tela de posições.",
    printExpired:
      "{count} código(s) desta folha já passaram da validade e não vinculam mais nenhum celular. Gere códigos novos antes de imprimir.",
    printNothingTitle: "Nada para imprimir",
    printNothingBody: "Cadastre as posições de apoio primeiro.",
    printFooter:
      "o código vale só para esta prova e só para este veículo. Vincular um celular novo derruba o anterior.",

    form: {
      invalidData: "Dados inválidos.",
      roleInvalid: "Escolha um papel válido.",
      quantityInteger: "A quantidade precisa ser um número inteiro.",
      quantityMin: "Adicione pelo menos 1 posição.",
      quantityMax: "Adicione no máximo 40 posições de uma vez.",
      labelRequired:
        "A posição precisa de um nome — é o que a direção vai chamar no rádio.",
      labelTooLong: "Nome muito longo (máximo 60 caracteres).",
      driverNameTooLong: "Nome do motorista muito longo (máximo 120 caracteres).",
      phoneTooLong: "Telefone muito longo.",
      phoneInvalid:
        "Telefone inválido. Use só números, com o código do país se for de fora.",
      plateTooLong: "Placa muito longa.",
      notFound: "Posição não encontrada. Recarregue a página.",
      referenceCleared:
        "Atenção: a prova está sem referência de {reference} agora — marque uma antes da largada.",
      codeGenerationFailed:
        "Não foi possível gerar códigos únicos agora. Tente de novo em alguns segundos.",
      codeIssueUnavailable:
        "Não foi possível emitir um código novo neste servidor.",
      codeNoneFree:
        "Não foi possível sortear um código livre. Tente de novo em alguns segundos.",
      codeRevokedMeanwhile:
        "O código anterior já foi revogado — esta posição está sem código até você tentar de novo.",
    },
  },

  map: {
    fitRoute: "Enquadrar percurso",
    followMe: "Seguir meu veículo",
    vehicles: "Veículos",
    showAll: "Mostrar todos",
    noWebGL:
      "Este navegador não suporta WebGL. Os dados de posição continuam corretos nas listas.",
    basemapLabel: "Mapa de fundo",
    basemapHint:
      "Vale só para esta prova. O traçado troca de cor junto, para não sumir sobre o fundo escolhido.",
    basemapAsphalt: "Asfalto",
    basemapAsphaltHint:
      "Traçado limpo, sem relevo. É o que menos disputa atenção com os veículos — a escolha certa para prova urbana e para tela projetada na sala de direção.",
    basemapTopo: "Topográfico",
    basemapTopoHint:
      "Curva de nível, inclinação e estrada vicinal. É o único fundo que mostra a subida antes de ela acontecer — para prova de montanha, é o que muda a conversa no rádio.",
    basemapSatellite: "Satélite",
    basemapSatelliteHint:
      "Imagem aérea. Serve para conferir se a estrada do GPX é mesmo a estrada da prova, e para reconhecer um ponto de apoio pelo que existe no chão.",
    slowTitle: "O mapa não terminou de carregar.",
    slowBody:
      "Pode ser aba em segundo plano, WebGL indisponível ou os blocos do mapa bloqueados na rede. Os quilômetros, a janela e a lista de veículos ao lado continuam corretos.",
  },

  live: {
    snapshotErrorTitle: "Não foi possível montar o painel ao vivo",
    snapshotErrorBody:
      "A prova existe, mas o estado ao vivo não pôde ser lido. Recarregue a página; se continuar, confira sua conexão com o banco.",
    noRoute:
      "Esta prova não tem percurso ativo. Sem ele não há mapa, não há quilometragem e não há janela abertura ↔ fechamento.",
    clockNote:
      "Idades medidas contra o relógio do servidor, não contra o deste computador. Horários no fuso da prova ({timezone}).",
    unacknowledged: "{count} alerta(s) sem reconhecer.",
    moreUnacknowledged: "+{count} sem reconhecer",
    viewOnMap: "ver no mapa",

    sortByRace: "Posição na prova",
    sortByOrdinal: "Cadastro",
    noSignalGroup: "Sem sinal ({count}) — a posição no mapa é uma lembrança",
    noPositions: "Nenhuma posição cadastrada nesta prova.",
    offRoute: "fora do percurso",
    clockOff: "relógio fora de hora",
    fromTrack: "{distance} do traçado",

    panelOk: "Painel ao vivo",
    panelDegraded: "Painel degradado",
    panelDown: "PAINEL SEM CONEXÃO",
    reconciled: "reconciliado {age}",
    realtime: "tempo real: {state}",
    realtimeOn: "ligado",
    realtimeConnecting: "conectando…",
    realtimeOff: "caído",
    notPresent: "O que está na tela não é o presente. Confirme tudo pelo rádio.",
    pollingOnly: "sem atualização instantânea; reconciliando a cada {interval}",
    refreshNow: "atualizar agora",
    refreshing: "atualizando…",
    soundOff: "som desligado — ativar",
    soundOn: "Aviso sonoro ativo",

    showClosed: "{count} encerrados",
    hideClosed: "ocultar encerrados",
    showAllVehicles: "ver todos os veículos",
    showFewer: "ver menos",
    history: "histórico",
    hideHistory: "ocultar histórico",
    loadingHistory: "Carregando histórico…",
    noEvents: "Nenhum evento registrado.",

    startedAt: "largada às {time}",
    finishedAt: "encerrada às {time}",
    confirmStart: "confirmar largada",
    confirmFinish: "confirmar encerramento",
  },

  auth: {
    gateTitle: "Prepare a prova antes.",
    gateTitleStrong: "No dia, só acompanhe.",
    gateCodes: "Códigos de vínculo",
    loginTitle: "Painel da direção",
    loginSubtitle: "Entre para preparar a prova: percurso, posições de apoio e códigos de vínculo.",
    signupSubtitle: "A conta é sua, e as provas que você criar só aparecem para você. Os motoristas não precisam de conta — eles entram pelo código de 6 caracteres.",
    metaLogin: "Entrar — Flamme Rouge",
    metaSignup: "Criar conta — Flamme Rouge",
    errorTitle: "Não deu para continuar",
    noticeTitle: "Quase lá",
    name: "Seu nome",
    nameHint: "Aparece para a equipe da prova.",
    namePlaceholder: "Marina Ferrero",
    nameRequired: "Informe seu nome — é ele que aparece para a equipe da prova.",
    nameTooLong: "Nome muito longo (máximo 80 caracteres).",
    email: "E-mail",
    emailPlaceholder: "direcao@suaprova.it",
    emailRequired: "Informe o e-mail.",
    emailInvalid: "Esse e-mail não parece válido. Confira se falta o @ ou o domínio.",
    password: "Senha",
    passwordHint: "Mínimo de 8 caracteres.",
    passwordRequired: "Informe a senha.",
    passwordTooShort: "A senha precisa ter pelo menos 8 caracteres.",
    passwordTooLong: "A senha pode ter no máximo 72 caracteres.",
    passwordRepeat: "Repita a senha",
    passwordMismatch: "As duas senhas não são iguais. Digite de novo.",
    submitting: "Aguarde…",
    signIn: "Entrar no painel",
    signUp: "Criar conta",
    haveAccount: "Já tem conta?",
    signInLink: "Entrar",
    firstTime: "Primeira vez?",
    signUpLink: "Criar conta de direção",

    confirmSent:
      "Conta criada. Enviamos um e-mail de confirmação para {email}. Confirme e volte aqui para entrar (confira também a caixa de spam).",
    invalidCredentials:
      "E-mail ou senha incorretos. Se você acabou de se cadastrar, confirme o e-mail antes de entrar.",
    emailNotConfirmed:
      "Este e-mail ainda não foi confirmado. Abra a mensagem que enviamos e clique no link (confira o spam).",
    userExists:
      "Já existe uma conta com este e-mail. Vá para a tela de entrar; se esqueceu a senha, peça a redefinição pelo Supabase.",
    emailRejected:
      "O servidor recusou este endereço de e-mail. Use um e-mail real que você consiga abrir agora — a confirmação chega nele.",
    weakPassword:
      "Senha fraca demais para o servidor. Use pelo menos 8 caracteres, misturando letras e números.",
    rateLimited:
      "Muitas tentativas em pouco tempo. Espere alguns minutos antes de tentar de novo.",
    signupDisabled:
      "O cadastro está desativado neste servidor. Peça a alguém da equipe para criar sua conta.",
    genericFailure:
      "Não foi possível concluir agora. Confira sua conexão e tente de novo.",
  },

  landing: {
    skip: "Pular para o conteúdo",

    nav: {
      problem: "O problema",
      measures: "O que a estrada mede",
      screens: "As duas telas",
      aria: "Seções da página",
      home: "Flamme Rouge, início",
      markerStart: "KM 000 — LARGADA",
    },

    hero: {
      title: "Direção de prova ao vivo,",
      titleStrong: "medida pela estrada.",
      lead: "Cada veículo de apoio no percurso em tempo real. A janela entre abertura e fechamento medida como um tempo intermediário de cronometragem, não estimada. E o socorro escolhido pela distância que o carro vai realmente percorrer.",
      ctaPanel: "Abrir o painel da direção",
      ctaDriver: "Sou motorista, tenho um código",
      note: "A flamme rouge marca o último quilômetro. Aqui ela marca o número que a direção precisa: quanto falta, medido, não estimado.",
      scroll: "Percorra",
    },

    numbers: {
      aria: "Números medidos em teste",
      unitKm: "km",
      unitPoints: "pontos",
      unitChars: "caracteres",
      roadLabel: "Pela estrada",
      roadBody: "Separavam a moto do acidente que ela parecia estar vendo. Em linha reta eram 50 metros. O sistema mandou a ambulância que estava 1,5 km atrás.",
      offlineLabel: "Sem sinal",
      offlineBody: "Acumulados em dois minutos sem cobertura chegaram completos, em ordem e sem duplicar quando o sinal voltou.",
      codeLabel: "Para entrar",
      codeBody: "É tudo que o motorista digita. Sem conta, sem aplicativo, sem equipamento para comprar e recolher.",
    },

    problem: {
      marker: "O que acontece hoje",
      title: "A prova acontece no rádio.",
      titleStrong: "E o rádio não pega no vale.",
      lead: "Nada disto é falha de quem organiza. É o que sobra quando a única fonte de posição é alguém dizendo, de memória, onde acha que está.",
      photo: "Foto · pelotão esticado",
      q1: "“Onde está o fechamento?”",
      a1: "A resposta vem por estimativa, e é em cima dela que se libera a via — e que se cumpre, ou não, o tempo de interdição combinado com a autoridade de trânsito. Errar dez minutos para mais é quebrar o acordo; para menos, é reabrir a rua antes da hora.",
      q2: "“Caiu alguém no km 60.”",
      a2: "Quem ouviu? Quem foi? Enquanto ninguém responde no rádio, não há como distinguir “o chamado não chegou” de “o chamado chegou e estão a caminho”.",
      q3: "“Manda o apoio mais próximo.”",
      a3: "Mais próximo medido como? No mapa do papel a distância é a do olho — e o olho não sabe que aquele trecho é a perna de volta e que a estrada só se reencontra 30 km adiante.",
      q4: "“O motorista não entendeu.”",
      a4: "Numa prova internacional a equipe de apoio fala quatro idiomas. O rádio fala um, e o briefing de meia hora antes da largada já acabou.",
      q5: "“Encerrou a prova.”",
      a5: "E não sobra registro de quem estava onde, a que horas, quando o alerta foi aberto e quanto tempo o socorro levou. A federação pergunta depois; a memória da equipe responde.",
    },

    measures: {
      marker: "O que a estrada mede",
      title: "Seis decisões de engenharia",
      titleStrong: "que mudam o que aparece na tela.",
      leadTitle: "Distância pela estrada, não em linha reta.",
      leadBody1: "Num teste real, uma moto estava a **0,05 km** em linha reta do ponto de um acidente e a **37,3 km** pela estrada — na perna de volta do percurso, com a única ligação entre as duas trinta e sete quilômetros adiante. O sistema acionou a ambulância que estava **1,5 km atrás**, no mesmo sentido do fluxo da prova.",
      leadBody2: "Um sistema que compara coordenadas teria mandado a moto, e a moto teria levado o tempo da prova inteira para chegar. Quem já passou do ponto também paga o preço de achar onde retornar e voltar contra o fluxo — e essa assimetria entra na conta.",
      c2Title: "A janela abertura↔fechamento é medida, não estimada.",
      c2Tag: "medido",
      c2Body: "O sistema guarda a que horas o carro de abertura passou por cada ponto do percurso. Quando o carro de fechamento chega ao km 42, a janela é a diferença entre dois horários observados — a mesma conta de um tempo intermediário de cronometragem. É esse número que a organização combinou com a autoridade de trânsito: é a passagem do fechamento que devolve a via ao tráfego. Quando ainda não há histórico suficiente, a tela escreve “projetado” e diz o motivo. O diretor nunca precisa adivinhar qual dos dois está lendo.",
      c3Title: "Funciona sem sinal.",
      c3Tag: "40 pontos",
      c3Body: "Nada é enviado antes de ser gravado no aparelho, e nada sai da fila antes do servidor confirmar o recebimento. Num teste de dois minutos sem cobertura, os 40 pontos acumulados chegaram completos, em ordem e sem duplicar assim que o sinal voltou.",
      c4Title: "O alerta não falha em silêncio.",
      c4Tag: "fila local",
      c4Body: "O alerta fura a fila na frente de qualquer ping de GPS e é retentado até haver confirmação do servidor — um pedido de socorro nunca é descartado, mesmo que isso signifique uma fila que não esvazia. E o socorro certo é acionado pela categoria, sem ninguém ter que escolher no meio da urgência: acidente aciona ambulância, problema mecânico aciona o mecânico.",
      c5Title: "Qualquer celular vira o GPS do veículo.",
      c5Tag: "6 caracteres",
      c5Body: "O motorista abre o link, digita o código de 6 caracteres impresso na folha do briefing e o aparelho dele passa a ser o rastreador daquele veículo. Nenhum aplicativo para instalar, nenhum equipamento para comprar, carregar, distribuir e recolher no fim do dia.",
      c6Title: "Seis idiomas, um único link.",
      c6Tag: "6 idiomas",
      c6Body: "O idioma não vai na URL — o aparelho negocia. O mesmo link e o mesmo QR impresso entregam português ao motorista brasileiro, italiano ao italiano e alemão ao austríaco, sem a direção gerenciar nada. Um celular configurado em pt-PT recebe português, não inglês.",
      summaryLabel: "Resumo",
      summary: "Seis decisões, um efeito: a direção deixa de perguntar onde está cada carro.",
    },

    how: {
      marker: "Como funciona",
      title: "Três passos antes da largada.",
      titleStrong: "Nenhum durante.",
      step: "Passo {n}",
      s1Title: "Carregue o percurso.",
      s1Body: "O GPX da prova, ou o traçado desenhado na tela. O percurso é indexado uma vez, e é dele que sai toda distância medida depois — a posição de cada veículo, a janela e a escolha do socorro.",
      s2Title: "Gere a folha de códigos.",
      s2Body: "Um código de 6 caracteres por veículo, com o papel de cada um: abertura, fechamento, vassoura, ambulância, mecânico, moto, fiscal. A folha sai pronta para imprimir e entregar no briefing.",
      s3Title: "Abra o painel no dia.",
      s3Body: "Cada motorista abre o link, digita o código e aparece no mapa no idioma do próprio aparelho. Durante a prova não há mais nada para configurar.",
    },

    screens: {
      marker: "As duas telas",
      title: "Uma sala de direção.",
      titleStrong: "Um celular por veículo.",
      panelEyebrow: "Painel da direção",
      panelTitle: "O que a direção vê",
      panelCapture: "Captura · painel da direção",
      p1: "Mapa ao vivo com todos os veículos, cada papel com sua cor e sua idade de dado.",
      p2: "Janela entre abertura e fechamento, marcada como medida ou projetada.",
      p3: "Fila de alertas com o apoio mais próximo já sugerido — e o porquê da sugestão por escrito.",
      p4: "Saúde de conexão veículo a veículo: quem está ao vivo, quem atrasou, quem sumiu.",
      appEyebrow: "App do motorista",
      appTitle: "O que o motorista vê",
      appCapture: "Captura · app do motorista",
      a1: "Entra com o código de 6 caracteres. Sem conta, sem loja de aplicativos.",
      a2: "Botões de alerta grandes, para mão com luva e carro em movimento.",
      a3: "Continua enviando com a tela apagada e acumula tudo quando o sinal cai.",
      a4: "No idioma do aparelho, a partir do mesmo link que todo mundo recebeu.",
    },

    close: {
      marker: "Flamme rouge",
      title: "Duas portas.",
      titleStrong: "Nenhuma decisão no meio.",
      lead: "A direção entra pela conta e monta a prova. O motorista entra pelo código e não precisa decidir mais nada.",
      trakr: "Mesma casa do TRAKR, público diferente. O atleta e o treinador têm o produto deles; este é o de quem organiza — e por isso tem nome, ciclo de venda e regras próprias.",
      aria: "Entrar no sistema",
      directorTitle: "Sou da direção",
      directorBody: "Cadastrar a prova, carregar o percurso, gerar os códigos e acompanhar a operação ao vivo.",
      directorCta: "Abrir o painel →",
      driverTitle: "Sou motorista",
      driverBody: "Digite o código de 6 caracteres que a direção passou e o celular vira o GPS da sua posição.",
      driverCta: "Entrar com código →",
    },

    footer: {
      tagline: "Direção de prova ao vivo para ciclismo de estrada.",
      languages: "O app do motorista fala",
      enter: "Entrar",
      director: "Direção de prova",
      signup: "Criar conta",
      driver: "Motorista com código",
      credits: "uma ferramenta",
    },

    meta: {
      title: "Flamme Rouge — direção de prova ao vivo para ciclismo de estrada",
      description: "Posição de cada veículo de apoio medida pela estrada, janela entre carro de abertura e carro de fechamento medida como tempo intermediário, e alerta que aciona o socorro certo por categoria. O GPS é o celular do motorista.",
      ogTitle: "Flamme Rouge — direção de prova ao vivo",
      ogDescription: "Num teste real, uma moto estava a 0,05 km em linha reta e 37,3 km pela estrada de um acidente. O sistema acionou a ambulância que estava 1,5 km atrás.",
    },
  },
  errors: {
    forbidden: "Você não tem permissão para alterar esta prova.",
    raceNotFound: "Prova não encontrada.",
    invalidRace: "Prova inválida.",
    sessionExpired: "Sua sessão expirou. Entre novamente.",
    notStartable: "Só uma prova em rascunho ou pronta pode ser iniciada.",
    listRaces:
      "Recarregue a página. Se persistir, saia e entre de novo — sua sessão pode ter expirado.",
    noChange:
      "Nada mudou: o alerta pode já ter sido encerrado por outra pessoa, ou você não tem mais permissão nesta prova. Recarregue a página.",

    db: {
      saveFailed:
        "Não foi possível salvar. Tente de novo; se continuar, recarregue a página.",
      routeRaceConflict:
        "Outro percurso foi ativado nesta prova enquanto você trabalhava. Recarregue a página e envie de novo — o percurso mais recente vence.",
      bindCodeTaken:
        "O código sorteado colidiu com um já em uso em outra prova. Clique em salvar de novo: um código novo será sorteado.",
      oneLead:
        "Esta prova já tem uma referência de abertura. Desmarque a atual antes de marcar outra.",
      oneSweep:
        "Esta prova já tem uma referência de fechamento. Desmarque a atual antes de marcar outra.",
      ordinalConflict:
        "Duas posições ficaram com a mesma ordem. Recarregue a página e refaça a reordenação.",
      sessionTaken:
        "Já existe um celular vinculado a esta posição. Revogue o vínculo atual antes de criar outro.",
      leadSweepSame:
        "A mesma posição não pode ser a referência de abertura e a de fechamento — o cálculo da janela compararia o veículo com ele mesmo.",
      gapWindowIncoherent:
        "O limite mínimo da janela precisa ser menor que o máximo.",
      targetGapRange: "A janela alvo precisa estar entre 1 e 600 minutos.",
      raceNameLength: "O nome da prova precisa ter entre 1 e 200 caracteres.",
      positionLabelLength: "O nome da posição precisa ter entre 1 e 60 caracteres.",
      bindCodeFormat: "O código gerado saiu fora do formato esperado. Tente novamente.",
      trackDistance: "O percurso precisa ter comprimento maior que zero.",
      trackPoints: "O percurso precisa de pelo menos 2 pontos.",
      duplicate: "Esse registro já existe. Recarregue a página para ver o estado atual.",
      checkViolation:
        "Algum valor está fora do permitido. Revise os campos e tente de novo.",
      missingRace: "A prova referenciada não existe mais. Volte para a lista de provas.",
      notFound:
        "Registro não encontrado — ele pode ter sido removido por outra pessoa. Recarregue a página.",
    },
  },
} as const;

/**
 * Alarga tipos literais para `string`, preservando a FORMA do objeto.
 *
 * O `as const` acima existe para que os caminhos de chave (`alerts.dispatch.
 * onMyWay`) sejam tipos literais e o `t()` possa validá-los. O efeito colateral
 * é que cada valor também vira literal: o tipo de `common.save` passa a ser
 * exatamente `"Salvar"`, e aí `const it: Dictionary` exige que o italiano
 * também diga "Salvar". Foram 991 erros de compilação — o build inteiro parado,
 * enquanto os testes passavam, porque teste de runtime não checa tipo.
 *
 * `Widen` mantém exatamente a garantia que interessa (mesma árvore de chaves em
 * todos os idiomas, chave faltando quebra o build) e devolve a liberdade que
 * precisa existir: o valor.
 */
type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof ptBR>;
