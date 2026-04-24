const SESSAO_KEY = 'chive_past_sessao';

const App = {

  // ── Estado global ──────────────────────────────────────────────────────────

  estado: {
    tela: 'inicial',
    modoExecucao: null,
    sequenciaFerramentas: [],
    ferramentaIndex: 0,
    tarefaIndex: 0,

    cronometroInicio: null,
    timerInterval: null,
    timerSegundosRestantes: 0,
    timerEsgotado: false,

    participante: {
      id: '',
      timestampInicio: null,
      timestampFim: null
    },

    demografico: {
      nome: '',
      nivelEducacao: '',
      areaFormacao: '',
      ferramentasUsadas: []
    },

    tarefas: [],
    sus: {},
    perguntasAbertas: {},
    resultadoSalvo: false
  },

  // ── Helpers ────────────────────────────────────────────────────────────────

  ferramentaAtual() {
    return this.estado.sequenciaFerramentas[this.estado.ferramentaIndex];
  },

  // ── Navegação ──────────────────────────────────────────────────────────────

  mostrarTela(nome) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('tela-' + nome).classList.add('ativa');
    this.estado.tela = nome;
    this.renderizarTela(nome);
    this.salvarSessao();
    window.scrollTo(0, 0);
  },

  renderizarTela(nome) {
    const mapa = {
      video:                () => this.renderizarVideo(),
      tarefa:               () => this.renderizarTarefa(),
      sus:                  () => this.renderizarSUS(),
      'perguntas-abertas':  () => this.renderizarPerguntasAbertas(),
      transicao:            () => this.renderizarTransicao(),
      final:                () => this.renderizarFinal()
    };
    if (mapa[nome]) mapa[nome]();
  },

  // ── Tela Inicial ───────────────────────────────────────────────────────────

  iniciarModo(modo) {
    this.limparSessao();
    this.estado.modoExecucao = modo;
    const sequencias = {
      chive_past:   ['CHIVE', 'PAST'],
      past_chive:   ['PAST', 'CHIVE'],
      apenas_chive: ['CHIVE'],
      apenas_past:  ['PAST']
    };
    this.estado.sequenciaFerramentas = sequencias[modo];
    this.estado.participante.timestampInicio = new Date().toISOString();
    this.mostrarTela('demografica');
  },

  // ── Demográficos ───────────────────────────────────────────────────────────

  submeterDemograficos(event) {
    event.preventDefault();

    const id          = document.getElementById('participante-id').value.trim();
    const nome        = document.getElementById('participante-nome').value.trim();
    const educacao    = document.querySelector('input[name="educacao"]:checked');
    const area        = document.querySelector('input[name="area"]:checked');
    const ferramentas = [...document.querySelectorAll('input[name="ferramenta"]:checked')]
                          .map(el => el.value);

    let valido = true;

    const mostrarErro  = id => document.getElementById(id).classList.add('visivel');
    const ocultarErro  = id => document.getElementById(id).classList.remove('visivel');

    if (!educacao) { mostrarErro('erro-educacao');    valido = false; }
    else             ocultarErro('erro-educacao');

    if (!area)      { mostrarErro('erro-area');        valido = false; }
    else             ocultarErro('erro-area');

    if (ferramentas.length === 0) { mostrarErro('erro-ferramentas'); valido = false; }
    else                            ocultarErro('erro-ferramentas');

    if (!valido) return;

    this.estado.participante.id    = id || ('P' + String(Date.now()).slice(-6));
    this.estado.demografico        = {
      nome,
      nivelEducacao:    educacao.value,
      areaFormacao:     area.value,
      ferramentasUsadas: ferramentas
    };

    this.mostrarTela('video');
  },

  // ── Vídeo ──────────────────────────────────────────────────────────────────

  renderizarVideo() {
    const f = this.ferramentaAtual();
    document.getElementById('video-badge').textContent    = f;
    document.getElementById('video-titulo').textContent   = 'Introdução ao ' + f;
    document.getElementById('video-subtitulo').textContent =
      'Assista ao vídeo de apresentação do ' + f + ' antes de iniciar as tarefas.';

    const url         = CONFIG.videos[f];
    const player      = document.getElementById('video-player');
    const placeholder = document.getElementById('video-placeholder');
    const placeholderTxt = document.getElementById('video-placeholder-txt');

    if (url) {
      player.src            = url;
      player.style.display  = 'block';
      placeholder.style.display = 'none';
    } else {
      player.style.display      = 'none';
      placeholder.style.display = 'flex';
      placeholderTxt.textContent = 'Vídeo do ' + f + ' não configurado';
    }
  },

  iniciarTarefas() {
    this.estado.tarefaIndex    = 0;
    this.estado.timerEsgotado  = false;
    this.mostrarTela('tarefa');
  },

  // ── Tarefas ────────────────────────────────────────────────────────────────

  renderizarTarefa() {
    this.pararTimer();
    this.estado.timerEsgotado = false;

    const f      = this.ferramentaAtual();
    const tarefa = CONFIG.tarefas[this.estado.tarefaIndex];
    const total  = CONFIG.tarefas.length;
    const atual  = this.estado.tarefaIndex + 1;

    document.getElementById('tarefa-ferramenta-badge').textContent = f;
    document.getElementById('tarefa-progresso').textContent        = `Tarefa ${atual} de ${total}`;
    document.getElementById('tarefa-titulo').textContent           = tarefa.titulo;
    document.getElementById('tarefa-enunciado').textContent        = tarefa.enunciado;
    document.getElementById('erro-tarefa').classList.remove('visivel');
    document.getElementById('btn-responder').disabled = false;

    const inputArea = document.getElementById('tarefa-input-area');

    if (tarefa.tipo === 'resposta_curta') {
      inputArea.innerHTML = `
        <div class="campo-form">
          <input type="text" id="resposta-tarefa"
                 placeholder="${tarefa.placeholder || 'Sua resposta'}"
                 autocomplete="off">
        </div>`;

    } else if (tarefa.tipo === 'dois_campos') {
      inputArea.innerHTML = `
        <div class="dois-campos">
          <div class="campo-form">
            <label>${tarefa.campos[0]}</label>
            <input type="text" id="resposta-campo-0" autocomplete="off">
          </div>
          <div class="campo-form">
            <label>${tarefa.campos[1]}</label>
            <input type="text" id="resposta-campo-1" autocomplete="off">
          </div>
        </div>`;

    } else if (tarefa.tipo === 'texto_longo') {
      // Timer interno sem exibição — participante não vê o cronômetro
      inputArea.innerHTML = `
        <div class="campo-form">
          <textarea id="resposta-tarefa" rows="6"
                    placeholder="Digite suas observações aqui..."></textarea>
        </div>`;
      if (tarefa.tempoLimite) {
        this.iniciarTimer(tarefa.tempoLimite);
      }
    }

    this.estado.cronometroInicio = Date.now();
  },

  coletarResposta(tarefa) {
    if (tarefa.tipo === 'dois_campos') {
      const v0 = (document.getElementById('resposta-campo-0') || {}).value || '';
      const v1 = (document.getElementById('resposta-campo-1') || {}).value || '';
      if (!v0.trim() && !v1.trim()) return null;
      return `${tarefa.campos[0]}: ${v0.trim()} | ${tarefa.campos[1]}: ${v1.trim()}`;
    }
    const el = document.getElementById('resposta-tarefa');
    return el ? el.value.trim() : null;
  },

  responderTarefa() {
    if (this.estado.timerEsgotado) return;

    const tarefa  = CONFIG.tarefas[this.estado.tarefaIndex];
    const resposta = this.coletarResposta(tarefa);

    if (!resposta) {
      document.getElementById('erro-tarefa').classList.add('visivel');
      return;
    }

    this.pararTimer();
    this.registrarRespostaTarefa(tarefa, resposta);
  },

  responderTarefaAutomatico() {
    if (this.estado.timerEsgotado) return;
    this.estado.timerEsgotado = true;

    const tarefa        = CONFIG.tarefas[this.estado.tarefaIndex];
    const resposta      = this.coletarResposta(tarefa) || '(sem resposta — tempo esgotado)';
    const tempoSegundos = Math.round((Date.now() - this.estado.cronometroInicio) / 1000);

    // Registra sem navegar — a navegação acontece quando o participante fecha o modal
    this.estado.tarefas.push({
      ferramenta:     this.ferramentaAtual(),
      tarefa:         tarefa.titulo,
      resposta,
      tempo_segundos: tempoSegundos
    });
    this.estado.tarefaIndex++;

    document.getElementById('btn-responder').disabled = true;
    this.tocarSomAlerta();
    this.mostrarAlertaTempoEsgotado();
  },

  mostrarAlertaTempoEsgotado() {
    document.getElementById('modal-tempo-esgotado').classList.add('visivel');
  },

  fecharAlertaTempoEsgotado() {
    document.getElementById('modal-tempo-esgotado').classList.remove('visivel');
    if (this.estado.tarefaIndex < CONFIG.tarefas.length) {
      this.renderizarTarefa();
      window.scrollTo(0, 0);
    } else {
      this.mostrarTela('sus');
    }
  },

  tocarSomAlerta() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const tocar = (freq, inicio, duracao) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.28, ctx.currentTime + inicio);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
        osc.start(ctx.currentTime + inicio);
        osc.stop(ctx.currentTime + inicio + duracao + 0.05);
      };
      tocar(880,  0.0,  0.25);
      tocar(880,  0.3,  0.25);
      tocar(1100, 0.65, 0.45);
    } catch (_) {
      // AudioContext indisponível, ignora silenciosamente
    }
  },

  registrarRespostaTarefa(tarefa, resposta) {
    const tempoSegundos = Math.round((Date.now() - this.estado.cronometroInicio) / 1000);

    this.estado.tarefas.push({
      ferramenta:      this.ferramentaAtual(),
      tarefa:          tarefa.titulo,
      resposta,
      tempo_segundos:  tempoSegundos
    });

    this.estado.tarefaIndex++;

    if (this.estado.tarefaIndex < CONFIG.tarefas.length) {
      this.renderizarTarefa();
      window.scrollTo(0, 0);
    } else {
      this.mostrarTela('sus');
    }
  },

  // ── Cronômetro regressivo ──────────────────────────────────────────────────

  iniciarTimer(segundos) {
    this.estado.timerSegundosRestantes = segundos;

    this.estado.timerInterval = setInterval(() => {
      this.estado.timerSegundosRestantes--;

      if (this.estado.timerSegundosRestantes <= 0) {
        this.pararTimer();
        this.responderTarefaAutomatico();
      }
    }, 1000);
  },

  pararTimer() {
    if (this.estado.timerInterval) {
      clearInterval(this.estado.timerInterval);
      this.estado.timerInterval = null;
    }
  },

  // ── SUS ────────────────────────────────────────────────────────────────────

  renderizarSUS() {
    const f = this.ferramentaAtual();
    document.getElementById('sus-ferramenta-badge').textContent = f;
    document.getElementById('sus-ferramenta-nome').textContent  = f;
    document.getElementById('erro-sus').classList.remove('visivel');

    const container = document.getElementById('sus-perguntas');
    container.innerHTML = CONFIG.perguntasSUS.map((pergunta, i) => {
      const texto = pergunta.replace(/\{FERRAMENTA\}/g, f);
      const opcoes = [1, 2, 3, 4, 5].map(v => `
        <div class="sus-opcao">
          <input type="radio" name="sus-q${i}" value="${v}" id="sus-${i}-${v}">
          <span>${v}</span>
        </div>`).join('');

      return `
        <div class="pergunta-sus">
          <div class="pergunta-sus-texto"><strong>${i + 1}.</strong> ${texto}</div>
          <div class="sus-opcoes">${opcoes}</div>
        </div>`;
    }).join('');
  },

  submeterSUS(event) {
    event.preventDefault();

    const respostas = [];
    for (let i = 0; i < 10; i++) {
      const sel = document.querySelector(`input[name="sus-q${i}"]:checked`);
      if (!sel) {
        document.getElementById('erro-sus').classList.add('visivel');
        // Rolar até a pergunta sem resposta
        const perguntaEl = document.querySelector(`input[name="sus-q${i}"]`);
        if (perguntaEl) perguntaEl.closest('.pergunta-sus').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      respostas.push(parseInt(sel.value));
    }

    this.estado.sus[this.ferramentaAtual()] = respostas;
    this.mostrarTela('perguntas-abertas');
  },

  // ── Perguntas Abertas ──────────────────────────────────────────────────────

  renderizarPerguntasAbertas() {
    const f = this.ferramentaAtual();
    document.getElementById('abertas-ferramenta-badge').textContent = f;
    document.getElementById('abertas-ferramenta-nome').textContent  = f;
    document.getElementById('abertas-q1-label').innerHTML =
      `O que foi mais difícil de usar no ${f}? <span style="font-weight:400;color:#a0aec0">(opcional)</span>`;
    document.getElementById('abertas-q2-label').innerHTML =
      `Quais pontos positivos e negativos você encontrou no ${f}? <span style="font-weight:400;color:#a0aec0">(opcional)</span>`;

    document.getElementById('abertas-q1').value = '';
    document.getElementById('abertas-q2').value = '';
  },

  submeterPerguntasAbertas(event) {
    event.preventDefault();

    const f = this.ferramentaAtual();
    this.estado.perguntasAbertas[f] = {
      q1: document.getElementById('abertas-q1').value.trim(),
      q2: document.getElementById('abertas-q2').value.trim()
    };

    this.estado.ferramentaIndex++;

    if (this.estado.ferramentaIndex < this.estado.sequenciaFerramentas.length) {
      this.mostrarTela('transicao');
    } else {
      this.estado.participante.timestampFim = new Date().toISOString();
      this.mostrarTela('final');
    }
  },

  // ── Transição ──────────────────────────────────────────────────────────────

  renderizarTransicao() {
    const proxima = this.estado.sequenciaFerramentas[this.estado.ferramentaIndex];
    document.getElementById('transicao-proxima-nome').textContent = proxima;
  },

  continuarParaProximaFerramenta() {
    this.estado.tarefaIndex   = 0;
    this.estado.timerEsgotado = false;
    this.mostrarTela('video');
  },

  // ── Tela Final ─────────────────────────────────────────────────────────────

  renderizarFinal() {
    const e = this.estado;
    const modoLabel = {
      chive_past:   'Começar com CHIVE',
      past_chive:   'Começar com PAST',
      apenas_chive: 'Apenas CHIVE',
      apenas_past:  'Apenas PAST'
    };

    const scoresHtml = Object.entries(e.sus).map(([f, r]) => {
      const score = Storage.calcularScoreSUS(r);
      return `
        <div class="resumo-item">
          <span>Score SUS — ${f}</span>
          <span class="score-sus">${score !== null ? score.toFixed(1) : '—'}</span>
        </div>`;
    }).join('');

    // Popula o resumo dentro do painel da equipe
    document.getElementById('resumo-final').innerHTML = `
      <div class="resumo-item">
        <span>Participante</span>
        <span>${e.participante.id}</span>
      </div>
      <div class="resumo-item">
        <span>Modo</span>
        <span>${modoLabel[e.modoExecucao] || e.modoExecucao}</span>
      </div>
      <div class="resumo-item">
        <span>Tarefas</span>
        <span>${e.tarefas.length}</span>
      </div>
      ${scoresHtml}`;

    // Exibe o botão ⚙ discreto apenas nesta tela
    document.getElementById('btn-equipe').style.display = 'flex';
  },

  // ── Voltar ao menu ─────────────────────────────────────────────────────────

  voltarAoMenu() {
    this.pararTimer();
    if (!this.estado.resultadoSalvo) {
      const csv = Storage.gerarCSV();
      Storage.salvarResultado(csv);
      Storage.salvarResultadoRemoto(csv);
    }
    this.limparSessao();
    document.getElementById('btn-equipe').style.display    = 'none';
    document.getElementById('painel-equipe').style.display = 'none';
    this.estado.modoExecucao            = null;
    this.estado.sequenciaFerramentas    = [];
    this.estado.ferramentaIndex         = 0;
    this.estado.tarefaIndex             = 0;
    this.estado.cronometroInicio        = null;
    this.estado.timerInterval           = null;
    this.estado.timerSegundosRestantes  = 0;
    this.estado.timerEsgotado           = false;
    this.estado.resultadoSalvo          = false;
    this.estado.participante            = { id: '', timestampInicio: null, timestampFim: null };
    this.estado.demografico             = { nome: '', nivelEducacao: '', areaFormacao: '', ferramentasUsadas: [] };
    this.estado.tarefas                 = [];
    this.estado.sus                     = {};
    this.estado.perguntasAbertas        = {};
    this.atualizarContadorParticipantes();
    this.mostrarTela('inicial');
  },

  // ── Painel Equipe Técnica ──────────────────────────────────────────────────

  abrirPainelEquipe() {
    document.getElementById('painel-equipe').style.display = 'block';
  },

  fecharPainelEquipe() {
    document.getElementById('painel-equipe').style.display = 'none';
  },

  // ── Persistência (localStorage) ────────────────────────────────────────────

  salvarSessao() {
    if (this.estado.tela === 'inicial') return;
    try {
      const snapshot = {
        tela:                  this.estado.tela,
        modoExecucao:          this.estado.modoExecucao,
        sequenciaFerramentas:  this.estado.sequenciaFerramentas,
        ferramentaIndex:       this.estado.ferramentaIndex,
        tarefaIndex:           this.estado.tarefaIndex,
        participante:          this.estado.participante,
        demografico:           this.estado.demografico,
        tarefas:               this.estado.tarefas,
        sus:                   this.estado.sus,
        perguntasAbertas:      this.estado.perguntasAbertas
      };
      localStorage.setItem(SESSAO_KEY, JSON.stringify(snapshot));
    } catch (_) {}
  },

  carregarSessao() {
    try {
      const raw = localStorage.getItem(SESSAO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  limparSessao() {
    localStorage.removeItem(SESSAO_KEY);
  },

  restaurarSessao() {
    const dados = this.carregarSessao();
    if (!dados) return;

    Object.assign(this.estado, {
      modoExecucao:         dados.modoExecucao,
      sequenciaFerramentas: dados.sequenciaFerramentas,
      ferramentaIndex:      dados.ferramentaIndex,
      tarefaIndex:          dados.tarefaIndex,
      participante:         dados.participante,
      demografico:          dados.demografico,
      tarefas:              dados.tarefas,
      sus:                  dados.sus,
      perguntasAbertas:     dados.perguntasAbertas,
      // campos de runtime sempre resetados
      cronometroInicio:     null,
      timerInterval:        null,
      timerSegundosRestantes: 0,
      timerEsgotado:        false
    });

    document.getElementById('modal-recuperacao').classList.remove('visivel');
    this.mostrarTela(dados.tela);
  },

  descartarSessao() {
    this.limparSessao();
    document.getElementById('modal-recuperacao').classList.remove('visivel');
  },

  // ── Contador de participantes (tela inicial) ───────────────────────────────

  atualizarContadorParticipantes() {
    const el = document.getElementById('contador-participantes');
    if (!el) return;
    const n = Storage.contarParticipantes();
    el.textContent = n === 1 ? '1 participante salvo' : `${n} participantes salvos`;
  },

  confirmarLimparResultados() {
    const n = Storage.contarParticipantes();
    if (n === 0) { alert('Nenhum resultado salvo.'); return; }
    if (!confirm(`Apagar os resultados de ${n} participante(s)? Esta ação não pode ser desfeita.`)) return;
    Storage.limparTodosResultados();
    this.atualizarContadorParticipantes();
  }
};

// ── Inicialização ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Atualiza contador na tela inicial
  App.atualizarContadorParticipantes();

  // Verifica se há sessão interrompida
  const dados = App.carregarSessao();
  if (!dados || dados.tela === 'inicial') return;

  const modoLabel = {
    chive_past:   'Começar com CHIVE',
    past_chive:   'Começar com PAST',
    apenas_chive: 'Apenas CHIVE',
    apenas_past:  'Apenas PAST'
  };

  const id   = dados.participante?.id   || '—';
  const modo = modoLabel[dados.modoExecucao] || dados.modoExecucao || '—';

  document.getElementById('recuperacao-info').textContent =
    `Participante: ${id}  |  Modo: ${modo}  |  Tela: ${dados.tela}`;

  document.getElementById('modal-recuperacao').classList.add('visivel');
});
