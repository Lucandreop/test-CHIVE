const CONFIG = {

  // Preencha após criar o projeto no Supabase (supabase.com → Settings → API)
  supabase: {
    url:     '',   // ex: https://xyzxyz.supabase.co
    anonKey: ''    // chave "anon public"
  },

  // Preencha com a URL ou caminho local dos vídeos introdutórios.
  // Deixe vazio ('') para exibir placeholder na tela de vídeo.
  videos: {
    CHIVE: '',
    PAST:  ''
  },

  tarefas: [
    {
      titulo: 'Tarefa 1 — Identificação de padrão',
      enunciado: 'Qual família de peixes apresenta maior densidade?',
      tipo: 'resposta_curta',
      placeholder: 'Nome da família'
    },
    {
      titulo: 'Tarefa 2 — Correlação',
      enunciado: 'Qual a quantidade de oxigênio dissolvido quando a temperatura está entre 28 e 29 graus °C?',
      tipo: 'resposta_curta',
      placeholder: 'Ex: 4,61'
    },
    {
      titulo: 'Tarefa 3 — Anomalia',
      enunciado: 'Existe alguma amostra com a densidade muito maior que as outras para alguma família? Qual é o ID da amostra e qual é a família?',
      tipo: 'dois_campos',
      campos: ['ID da amostra', 'Família']
    },
    {
      titulo: 'Tarefa 4 — Exploração livre',
      enunciado: 'Explore livremente o dataset por até 5 minutos e informe percepções sobre os dados interessantes que você observou.',
      tipo: 'texto_longo',
      tempoLimite: 300
    }
  ],

  perguntasSUS: [
    'Eu acho que gostaria de usar o {FERRAMENTA} com frequência.',
    'Eu acho o {FERRAMENTA} desnecessariamente complexo.',
    'Eu achei o {FERRAMENTA} fácil de usar.',
    'Acho que precisaria de suporte técnico para conseguir usar o {FERRAMENTA}.',
    'Achei que as funções do {FERRAMENTA} estão bem integradas.',
    'Achei que havia muita inconsistência no {FERRAMENTA}.',
    'Imagino que a maioria das pessoas aprenderia a usar o {FERRAMENTA} rapidamente.',
    'Achei o {FERRAMENTA} muito difícil de usar.',
    'Me senti confiante ao usar o {FERRAMENTA}.',
    'Precisei aprender muitas coisas antes de conseguir usar o {FERRAMENTA}.'
  ]
};
