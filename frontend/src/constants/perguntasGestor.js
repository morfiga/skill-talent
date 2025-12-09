/**
 * Constantes das Perguntas de Avaliação de Gestor
 * Espelhadas do backend para exibição no frontend
 */

export const PERGUNTAS_FECHADAS = {
  // Liderança e Direcionamento
  lideranca_expectativas_claras: {
    categoria: 'lideranca_direcionamento',
    texto: 'Sinto que o meu gestor define expectativas claras sobre prioridades, metas e padrões de qualidade em relação às minhas entregas.'
  },
  lideranca_consistencia_decisoes: {
    categoria: 'lideranca_direcionamento',
    texto: 'Sinto que meu gestor demonstra consistência nas decisões e transparência ao compartilhar os motivos por trás delas.'
  },
  // Comunicação
  comunicacao_escuta: {
    categoria: 'comunicacao',
    texto: 'Sinto que minhas opiniões são consideradas na hora de tomar uma decisão estratégica do time.'
  },
  comunicacao_clareza: {
    categoria: 'comunicacao',
    texto: 'Sinto que meu gestor se comunica com clareza e no momento certo.'
  },
  // Desenvolvimento e Suporte
  desenvolvimento_apoio: {
    categoria: 'desenvolvimento_suporte',
    texto: 'Sinto que meu gestor apoia meu desenvolvimento profissional e me dá oportunidades de crescer.'
  },
  desenvolvimento_feedback: {
    categoria: 'desenvolvimento_suporte',
    texto: 'Sinto que meu gestor fornece feedbacks consistentes, relevantes e que me ajudam a melhorar meu desempenho.'
  },
  // Cultura e Comportamento
  cultura_valores: {
    categoria: 'cultura_comportamento',
    texto: 'Sinto que meu gestor age de acordo com os valores da empresa no dia a dia.'
  },
  cultura_responsabilidade: {
    categoria: 'cultura_comportamento',
    texto: 'Sinto que meu gestor assume responsabilidades pelos resultados da equipe.'
  },
  // Execução e Organização
  execucao_rituais_consistencia: {
    categoria: 'execucao_organizacao',
    texto: 'Sinto que as reuniões e os rituais de alinhamento ocorrem de forma consistente.'
  },
  execucao_distribuicao_justa: {
    categoria: 'execucao_organizacao',
    texto: 'Sinto que meu gestor distribui tarefas e responsabilidades de forma justa.'
  }
}

export const PERGUNTAS_ABERTAS = {
  aberta_continuar_fazendo: {
    categoria: 'perguntas_abertas',
    texto: 'O que o seu gestor faz bem e que contribui positivamente para seu desenvolvimento ou para o desempenho do time?'
  },
  aberta_melhorar: {
    categoria: 'perguntas_abertas',
    texto: 'O que seu gestor poderia fazer de forma diferente para melhorar sua experiência e apoiar melhor seu trabalho no dia a dia?'
  }
}

export const TODAS_PERGUNTAS = {
  ...PERGUNTAS_FECHADAS,
  ...PERGUNTAS_ABERTAS
}

/**
 * Retorna o texto de uma pergunta pelo seu código
 * @param {string} codigo - Código da pergunta
 * @returns {string} Texto da pergunta ou código formatado como fallback
 */
export const getTextoPergunta = (codigo) => {
  const pergunta = TODAS_PERGUNTAS[codigo]
  if (pergunta) {
    return pergunta.texto
  }
  // Fallback: formatar o código
  return codigo?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pergunta'
}

