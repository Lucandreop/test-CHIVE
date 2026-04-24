# Estudo de Usabilidade — CHIVE vs PAST

## Visão Geral
Aplicação web single-page para conduzir estudo de usabilidade comparando as ferramentas CHIVE e PAST. O pesquisador escolhe o modo de execução na tela inicial; o participante realiza tarefas, responde o SUS e perguntas abertas; ao final, o CSV é baixado.

## Estrutura de Arquivos
```
index.html          — HTML principal, todas as telas definidas aqui
css/style.css       — Estilos
js/config.js        — Configurações: datasetUrl, vídeos, tarefas, perguntas SUS
js/app.js           — Máquina de estados, renderização e fluxo de navegação
js/storage.js       — Coleta de dados e exportação CSV
data/comunidade_long_new.csv — Dataset (carregado nas ferramentas CHIVE/PAST)
```

## Modos de Execução
| Modo | sequenciaFerramentas |
|------|----------------------|
| `chive_past` | ['CHIVE', 'PAST'] |
| `past_chive` | ['PAST', 'CHIVE'] |
| `apenas_chive` | ['CHIVE'] |
| `apenas_past` | ['PAST'] |

## Fluxo por Modo

**Fluxo completo (chive_past / past_chive):**
Tela Inicial → Demográficos → [Ferramenta 1: Vídeo → T1→T2→T3→T4 → SUS → Perguntas Abertas] → Transição → [Ferramenta 2: Vídeo → T1→T2→T3→T4 → SUS → Perguntas Abertas] → Feedback Comparativo → Tela Final (download CSV)

**Fluxo único (apenas_chive / apenas_past):**
Tela Inicial → Demográficos → [Ferramenta: Vídeo → T1→T2→T3→T4 → SUS → Perguntas Abertas] → Tela Final (download CSV)

## Tipos de Tarefa
| tipo | Componente renderizado |
|------|------------------------|
| `resposta_curta` | `<input type="text">` |
| `dois_campos` | Dois `<input>` com labels de `tarefa.campos[]` |
| `texto_longo` | `<textarea>` + cronômetro regressivo (`tarefa.tempoLimite` em segundos) |

Não há validação de acerto/erro. A resposta é registrada exatamente como digitada.

## Estado Global (App.estado)
```javascript
{
  tela: string,                    // nome da tela ativa
  modoExecucao: string,            // chave do modo
  sequenciaFerramentas: string[],  // ['CHIVE','PAST'] ou ['CHIVE'] etc.
  ferramentaIndex: number,         // índice na sequência (0 ou 1)
  tarefaIndex: number,             // índice da tarefa atual (0–3)
  cronometroInicio: number,        // Date.now() no início da tarefa
  timerInterval: id|null,          // setInterval do cronômetro regressivo
  timerSegundosRestantes: number,
  participante: { id, timestampInicio, timestampFim },
  demografico: { nome, nivelEducacao, areaFormacao, ferramentasUsadas[] },
  tarefas: [{ ferramenta, tarefa, resposta, tempo_segundos }],
  sus: { CHIVE: [1..5 x10], PAST: [1..5 x10] },
  perguntasAbertas: { CHIVE: {q1,q2,q3}, PAST: {q1,q2,q3} },
  feedbackComparativo: {q1,q2,q3} | null
}
```

## Estrutura do CSV de Saída
```
# DADOS DO PARTICIPANTE
ID, Modo de execução, Timestamp início, Timestamp fim

# DADOS DEMOGRÁFICOS
Nome, Nível de educação, Área de formação, Ferramentas já usadas

# TAREFAS
Ferramenta, Tarefa, Resposta, Tempo (segundos)

# QUESTIONÁRIO SUS
Ferramenta, Q1, Q2, ..., Q10, Score

# PERGUNTAS ABERTAS POR FERRAMENTA
Ferramenta, O que foi mais difícil, O que mudaria/melhoraria, Comentários adicionais

# FEEDBACK FINAL COMPARATIVO   ← apenas no fluxo completo
Preferência, Facilidade de uso, Comentários gerais
```

## Cálculo do Score SUS
- Questões ímpares (1,3,5,7,9): contribuição = resposta − 1
- Questões pares (2,4,6,8,10): contribuição = 5 − resposta
- Score = Σ contribuições × 2,5 (intervalo 0–100)
- Respostas: 1 = Discordo totalmente … 5 = Concordo totalmente

## Como Configurar Vídeos
Em `js/config.js`, preencha o campo `videos`:
```javascript
videos: {
  CHIVE: 'caminho/ou/url/video-chive.mp4',
  PAST:  'caminho/ou/url/video-past.mp4'
}
```
Se o campo estiver vazio, a tela de vídeo exibe um placeholder e o botão "Iniciar Tarefas" permanece disponível.

## Como Abrir Localmente
Servir com qualquer servidor HTTP estático. Exemplo rápido:
```bash
cd Teste-CHIVE
python -m http.server 8080
# abrir http://localhost:8080
```
Não funciona via `file://` por restrições de CORS ao carregar o CSV.
