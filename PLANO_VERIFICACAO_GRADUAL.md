# Plano de verificação gradual — Desempenho dos Alunos

## Regra central de memória

Este plano está subordinado ao arquivo `MEMORIA_PROJETO.md`. **A cada etapa concluída, o plano e a memória devem ser atualizados no mesmo commit**, com data, etapa, arquivos verificados, evidências, achados, correções, pendências e próximo passo. Uma etapa não pode ser marcada como concluída apenas por ter sido iniciada.

## Regras de baixo consumo

- Executar uma única etapa por dia, sem revisar novamente etapas concluídas.
- Ler primeiro a seção correspondente de `MEMORIA_PROJETO.md` e o inventário.
- Priorizar inspeção estática e testes não destrutivos; não alterar dados reais sem autorização.
- Separar `confirmado`, `suspeita`, `corrigido` e `pendente`.
- Registrar arquivos e linhas/URLs relevantes para que outra sessão consiga reproduzir.
- Se uma etapa exigir credenciais, login ou alteração de banco, registrar o bloqueio e parar nela.

## Etapas diárias

| Dia | Escopo | Arquivos/núcleo | Resultado mínimo |
|---|---|---|---|
| 1 | Baseline e arquitetura | inventário, `MEMORIA_PROJETO.md`, configs e manifests | baseline e riscos atuais |
| 2 | Login e sessão | `index.html`, `login.js`, `auth.js`, `cadastro.html`, `RESET.HTML` | fluxo e contratos de sessão |
| 3 | Painel do aluno | `aluno.html`, `aluno3.js`, CSS, notificações e lições | mapa de carregamento e regressões |
| 4 | Painel do professor | `professor*`, `dashboard-*`, `ficha-aluno*`, módulos | permissões, turma e edição |
| 5 | Chamadas e frequência | `ensaio*`, `gerenciar-eventos`, `corrigir-chamadas`, `frequencia`, `comprometimento` | integridade de presença/falta |
| 6 | Coral e comunidade | `aluno-coral*`, `coral.html`, `painel-social*`, `conquistas*` | regras de KADOSH, cards e conquistas |
| 7 | Atividades e jogos | `atividades*`, `jornada*`, jogos e teoria | acesso, progresso e expiração |
| 8 | Biblioteca e arquivos | biblioteca, partituras, PDFs, gravação e Storage | URLs, downloads e fallback |
| 9 | Firebase e segurança | `firebase-config.js`, `firebase.json`, `cors.json`, regras | coleções, permissões e riscos |
| 10 | PWA e navegação | manifests, `service-worker.js`, loader, nav e header | cache, instalação e links |
| 11 | CSS, mobile e acessibilidade | todos os CSS e páginas críticas | problemas visuais priorizados |
| 12 | Integração e consolidação | fluxos completos e `MEMORIA_PROJETO.md` | memória atualizada e backlog |

## Registro obrigatório por etapa

Adicionar ao final de `MEMORIA_PROJETO.md`:

```markdown
### AAAA-MM-DD — Etapa N: título
- Status: concluída | bloqueada | parcialmente concluída
- Arquivos verificados:
- Testes/evidências:
- Confirmado:
- Suspeitas:
- Correções realizadas:
- Pendências:
- Próxima etapa:
```

## Critério de encerramento

O ciclo só termina quando as 12 etapas tiverem registro na memória, as pendências estiverem consolidadas por prioridade e cada correção funcional tiver teste ou evidência associado.

## Estado atualizado do ciclo

### Etapa 1 — Baseline e arquitetura

- **Status:** concluída em 2026-10-29.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 1: baseline e arquitetura”.
- **Resultado:** baseline estático confirmado; sintaxe JavaScript e JSON válidos; seis referências locais pendentes foram catalogadas para validação posterior.
- **Próxima etapa:** Etapa 2 — login e sessão.

Nas próximas etapas, esta seção deve ser ampliada imediatamente após cada conclusão, mantendo o registro correspondente na memória e no mesmo commit.

### Etapa 2 — Login e sessão

- **Status:** concluída em 2026-10-29.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 2: login e sessão”.
- **Resultado:** contratos de login, cadastro, sessão e redefinição de dados foram documentados; sintaxe dos scripts externos e inline passou; riscos de segurança e compatibilidade foram catalogados sem alteração funcional.
- **Pendências principais:** revisar autenticação baseada em senha no Firestore, proteger `RESET.HTML`, tratar fotos do cadastro via Storage, incluir `docId` na sessão criada no cadastro e alinhar o bucket Firebase.
- **Próxima etapa:** Etapa 3 — painel do aluno.

### Etapa 3 — Painel do aluno

- **Status:** concluída em 2026-10-29.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 3: painel do aluno”.
- **Resultado:** fluxo de carregamento, preferências, frequência, conquistas, notificações, foto e envio de lições foram mapeados; sintaxe dos módulos passou; riscos de autorização, privacidade, custo de consultas, tamanho de arquivos, MIME de áudio e inserção HTML foram catalogados.
- **Pendências principais:** proteger visualização por ID e proprietário, filtrar notificações globais, migrar fotos para Storage com limite, preservar MIME/extensão de áudio, reduzir consultas globais e escapar conteúdo externo inserido no DOM.
- **Próxima etapa:** Etapa 4 — painel do professor.

### Etapa 4 — Painel do professor

- **Status:** concluída em 2026-10-29.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 4: painel do professor”.
- **Resultado:** fluxos de turma ativa, gestão de alunos, ficha, níveis, snapshots, chamadas e dashboards foram mapeados; JavaScript externo e scripts inline passaram na validação estática; riscos de autorização, senha, referências órfãs, HTML não escapado, fotos Base64 e divergências entre coleções de chamadas foram documentados.
- **Pendências principais:** implementar autorização real, unificar chamadas por `alunoId` e coleção, tornar o recálculo idempotente, sincronizar Coral/turmas, tratar exclusão de aluno, migrar fotos para Storage e consolidar os fluxos administrativos duplicados.
- **Próxima etapa:** Etapa 5 — chamadas e frequência.

### Etapa 5 — Chamadas e frequência

- **Status:** concluída em 2026-10-29.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 5: chamadas e frequência”.
- **Resultado:** fluxos de chamada, edição, exclusão, correção de turma, frequência elegível e comprometimento foram comparados; os scripts passaram na validação estática; foi confirmada uma divergência que trata `FJ` como falta comum.
- **Pendências principais:** unificar estados e coleções, preservar históricos ao editar, tornar recálculos idempotentes, corrigir `FJ`, usar `alunoId`, padronizar fuso de Brasília e recalcular após correções em massa.
- **Próxima etapa:** Etapa 6 — Coral e comunidade.
