const RESULTADOS_KEY = 'chive_past_resultados';

const Storage = {

  // ── Utilitários ─────────────────────────────────────────────────────────────

  esc(valor) {
    if (valor === null || valor === undefined) return '';
    const s = String(valor);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  },

  fmtTimestamp(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-BR');
  },

  calcularScoreSUS(respostas) {
    if (!respostas || respostas.length !== 10) return null;
    let soma = 0;
    respostas.forEach((r, i) => {
      soma += (i % 2 === 0) ? (r - 1) : (5 - r);
    });
    return soma * 2.5;
  },

  // ── Geração do CSV ──────────────────────────────────────────────────────────

  gerarCSV() {
    const e = App.estado;
    const rows = [];
    const r = (...vals) => rows.push(vals.map(v => this.esc(v)).join(','));
    const blank = () => rows.push('');

    const modoLabel = {
      chive_past:   'Começar com CHIVE',
      past_chive:   'Começar com PAST',
      apenas_chive: 'Apenas CHIVE',
      apenas_past:  'Apenas PAST'
    };

    // ── DADOS DO PARTICIPANTE ────────────────────────────────────────────────
    rows.push('# DADOS DO PARTICIPANTE');
    r('ID', 'Modo de execução', 'Timestamp início', 'Timestamp fim');
    r(
      e.participante.id,
      modoLabel[e.modoExecucao] || e.modoExecucao,
      this.fmtTimestamp(e.participante.timestampInicio),
      this.fmtTimestamp(e.participante.timestampFim)
    );
    blank();

    // ── DADOS DEMOGRÁFICOS ───────────────────────────────────────────────────
    rows.push('# DADOS DEMOGRÁFICOS');
    r('Nome', 'Nível de educação', 'Área de formação', 'Ferramentas já usadas');
    r(
      e.demografico.nome,
      e.demografico.nivelEducacao,
      e.demografico.areaFormacao,
      (e.demografico.ferramentasUsadas || []).join('; ')
    );
    blank();

    // ── TAREFAS ──────────────────────────────────────────────────────────────
    rows.push('# TAREFAS');
    r('Ferramenta', 'Tarefa', 'Resposta', 'Tempo (segundos)');
    (e.tarefas || []).forEach(t => r(t.ferramenta, t.tarefa, t.resposta, t.tempo_segundos));
    blank();

    // ── QUESTIONÁRIO SUS ─────────────────────────────────────────────────────
    rows.push('# QUESTIONÁRIO SUS');
    r('Ferramenta', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Score');
    Object.entries(e.sus || {}).forEach(([ferramenta, respostas]) => {
      const score = this.calcularScoreSUS(respostas);
      r(ferramenta, ...respostas, score !== null ? score.toFixed(1) : '');
    });
    blank();

    // ── PERGUNTAS ABERTAS ────────────────────────────────────────────────────
    rows.push('# PERGUNTAS ABERTAS POR FERRAMENTA');
    r('Ferramenta', 'O que foi mais difícil', 'Pontos positivos e negativos');
    Object.entries(e.perguntasAbertas || {}).forEach(([ferramenta, pa]) => {
      r(ferramenta, pa.q1, pa.q2);
    });

    return rows.join('\n');
  },

  // ── Envio remoto (Supabase) ───────────────────────────────────────────────

  async salvarResultadoRemoto(csv) {
    const cfg = (typeof CONFIG !== 'undefined') && CONFIG.supabase;
    if (!cfg || !cfg.url || !cfg.anonKey) return;
    try {
      await fetch(`${cfg.url}/rest/v1/resultados`, {
        method: 'POST',
        headers: {
          'apikey':        cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify({
          participante_id: App.estado.participante.id || 'sem-id',
          csv
        })
      });
    } catch (_) {}
  },

  // ── Download individual ───────────────────────────────────────────────────

  downloadCSV() {
    const csv = this.gerarCSV();
    this._dispararDownload(
      csv,
      `resultado_${(App.estado.participante.id || 'participante').replace(/\s+/g, '_')}_${this._tsArquivo()}.csv`
    );
    this.salvarResultado(csv);
    this.salvarResultadoRemoto(csv);
    App.estado.resultadoSalvo = true;
    App.limparSessao();
    App.atualizarContadorParticipantes();
  },

  // ── Acumulação de resultados ──────────────────────────────────────────────

  salvarResultado(csv) {
    try {
      const lista = this.carregarResultados();
      lista.push({
        id:        App.estado.participante.id || 'sem-id',
        timestamp: new Date().toISOString(),
        csv
      });
      localStorage.setItem(RESULTADOS_KEY, JSON.stringify(lista));
    } catch (_) {}
  },

  carregarResultados() {
    try {
      const raw = localStorage.getItem(RESULTADOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  },

  contarParticipantes() {
    return this.carregarResultados().length;
  },

  // ── Download de todos os participantes ───────────────────────────────────

  downloadTodosCSV() {
    const lista = this.carregarResultados();
    if (lista.length === 0) {
      alert('Nenhum resultado salvo ainda.');
      return;
    }

    const sep   = '='.repeat(60);
    const blocos = lista.map((r, i) => {
      const data = new Date(r.timestamp).toLocaleString('pt-BR');
      return `${sep}\nPARTICIPANTE ${i + 1}: ${r.id} — ${data}\n${sep}\n${r.csv}`;
    });

    this._dispararDownload(
      blocos.join('\n\n'),
      `resultados_todos_${this._tsArquivo()}.csv`
    );
  },

  limparTodosResultados() {
    localStorage.removeItem(RESULTADOS_KEY);
  },

  // ── Utilitários internos ──────────────────────────────────────────────────

  _tsArquivo() {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  },

  _dispararDownload(conteudo, nomeArquivo) {
    const bom  = '﻿';
    const blob = new Blob([bom + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
