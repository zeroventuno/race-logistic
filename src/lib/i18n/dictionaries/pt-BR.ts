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
  },

  roles: {
    lead_car: { label: "Carro de abertura", short: "Abertura" },
    sweep_car: { label: "Carro de fechamento", short: "Vassoura" },
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
  },

  gap: {
    title: "Janela abertura ↔ fechamento",
    short: "Janela",
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

    transmitting: "Transmitindo",
    paused: "Pausado",
    queuedPings: "{count} pontos na fila",
    batteryWarning: "Bateria baixa — considere ligar o carregador.",
    keepAwake: "Mantendo a tela ligada",
  },

  director: {
    dashboard: "Painel",
    myRaces: "Minhas provas",
    newRace: "Nova prova",
    noRaces: "Você ainda não criou nenhuma prova.",
    noRacesAction: "Criar a primeira prova",
    setupChecklist: "Para a prova ir ao ar",
    needsRoute: "Carregar o percurso",
    needsLead: "Definir o carro de abertura",
    needsSweep: "Definir o carro de fechamento",
    needsBinding: "{count} posição(ões) sem aparelho vinculado",
    ready: "Tudo pronto",
    goLive: "Iniciar prova",
    finish: "Encerrar prova",
  },

  route: {
    uploadTitle: "Carregar o percurso",
    uploadSubtitle: "Envie o arquivo GPX da prova.",
    uploadAction: "Escolher arquivo GPX",
    uploadDrop: "Arraste o arquivo aqui",
    drawInstead: "Ou desenhe o percurso no mapa",
    drawTitle: "Desenhar o percurso",
    drawHint: "Clique no mapa para adicionar pontos. Arraste para ajustar.",
    undo: "Desfazer",
    clear: "Limpar",
    chooseSegment: "O arquivo tem mais de um percurso. Escolha o da prova:",
    replaceWarning:
      "Substituir o percurso recalcula todas as posições em prova. Faça isso antes da largada.",
    parseError: "Não foi possível ler o arquivo",
    pointCount: "{count} pontos",
    current: "Percurso atual",
    replace: "Substituir percurso",
  },

  positions: {
    title: "Posições de apoio",
    add: "Adicionar posição",
    addBulk: "Adicionar várias",
    quantity: "Quantidade",
    label: "Identificação",
    driverName: "Motorista",
    driverPhone: "Telefone",
    plate: "Placa",
    referenceLead: "É o carro de abertura oficial",
    referenceSweep: "É o carro de fechamento oficial",
    dispatchable: "Pode ser acionado para atender alertas",
    code: "Código de vínculo",
    regenerateCode: "Gerar código novo",
    regenerateWarning:
      "O código atual deixa de funcionar. Se o motorista já estiver vinculado, ele continua transmitindo até ser desvinculado.",
    print: "Imprimir códigos",
    printTitle: "Códigos de vínculo — {race}",
    printHint:
      "Entregue cada código ao motorista da posição correspondente antes da largada.",
    bound: "Vinculado",
    notBound: "Aguardando vínculo",
    revokeSession: "Desvincular aparelho",
  },

  map: {
    fitRoute: "Enquadrar percurso",
    followMe: "Seguir meu veículo",
    vehicles: "Veículos",
    showAll: "Mostrar todos",
    noWebGL:
      "Este navegador não suporta WebGL. Os dados de posição continuam corretos nas listas.",
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
