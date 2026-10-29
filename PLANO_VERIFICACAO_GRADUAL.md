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


### Etapa 6 — Coral e comunidade

- **Status:** concluída em 2026-10-29 como revisão estática, sem alterações funcionais. Executada no mesmo dia da Etapa 5 após autorização explícita do usuário, como exceção à cadência padrão de uma etapa por dia.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 6: Coral e comunidade”.
- **Arquivos verificados:** `aluno-coral.html`, `aluno-coral.js`, `aluno-coral.css`, `coral.html`, `painel-social.html`, `painel-social1.html`, `conquistas.js`, `conquistas-editor.html`; dependências diretas `ensaio.html`, `ensaio2.html`, `frequencia.js`, `participacoes.js` e `aluno3.js`.
- **Evidências:** scripts externos e inline examinados passaram em `node --check`; teste sintético confirmou que `turmaId` distinto mantém a chamada Coral fora da frequência da turma principal; teste sintético confirmou que o evento salvo como `tipo: "aula"` não satisfaz o filtro da conquista Coral. Nenhum acesso ao Firebase e nenhum dado real alterado.
- **Confirmado:** o recálculo normal da chamada retorna para turma Coral; a elegibilidade principal exige a turma correspondente. Entretanto, ambos os formulários criam eventos com `tipo: "aula"`, enquanto filtros genéricos e a conquista `participacao_coral` dependem do marcador Coral. Para perfis sem `turmaId`, o painel social pode considerar chamada Coral pelo fallback por ID/nome. A tela Coral cria documento em `alunos` para novos membros e não oferece inclusão avulsa por nome em nova chamada; participantes sem documento também não aparecem nos fluxos sociais/de conquistas baseados em `alunos`.
- **Pendências principais:** corrigir/normalizar o tipo e o escopo dos eventos Coral em todos os cálculos; definir representação de participantes Coral sem ID de aluno; preservar separação entre turma principal e atividade extra; verificar regras Firestore/Storage e renderizações dinâmicas. A falha `FJ` da Etapa 5 continua aberta.
- **Correções realizadas:** nenhuma correção funcional; achados registrados na memória.
- **Próxima etapa:** Etapa 7 — atividades e jogos (executada em 2026-10-29 por solicitação explícita; ver registro abaixo).


### Etapa 7 — Atividades e jogos

- **Status:** concluída em 2026-10-29 como revisão estática, sem alterações funcionais. Executada no mesmo dia da Etapa 6 após solicitação explícita do usuário, como exceção à cadência padrão de uma etapa por dia.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 7: atividades e jogos”.
- **Arquivos verificados:** `atividades.html`, `atividades-notas.html`, `atividades-armadura.html`, `jornada-atividades.js`, `compassos-game.html`, `escalas-game.html`, `escada-notas.html`, `figuras-musicais.html`, `jogo-figuras.html`, `jogo-tom-semitom.html`, `como-funciona-pauta.html`, `tetracordes.html` e `tetroquestgame.html`; integrações pontuais com `conquistas.js`, `conquistas-editor.html` e `aluno3.js`.
- **Evidências:** sintaxe válida no módulo de jornada e scripts inline das 12 páginas; teste sintético da validade de 30 dias e do tratamento legado sem data. Nenhuma execução em navegador ou conexão/alteração de dados Firebase.
- **Confirmado:** jornada com nove IDs e gravação de conclusão por aluno em subcoleção; acesso não é bloqueado pela ordem. Sem `usuarioAtual.docId`, o progresso não é salvo, mas o botão pode exibir “Jornada concluída!”. O vencimento de medalha altera a exibição, não apaga o registro; documentos sem data válida permanecem ativos.
- **Achados prioritários:** Tom/Semitom pode contar modo desbloqueado como concluído e registrar cedo ao sair; Jogo das Figuras registra jornada após aprovação de qualquer modo; tutoriais podem ser concluídos sem confirmar todas as interações. O tutorial de pauta segue para ordem 6 após concluir a ordem 3. Armadura não consta no catálogo e não foi encontrado link para a página. Partidas não possuem checkpoint/retomada consistente.
- **Pendências:** corrigir feedback sem `docId`; alinhar condições de conclusão e ordem/destinos; definir inclusão da Armadura e política de checkpoints; decidir validade de registros legados sem timestamp; revisar as regras Firestore e a validação de URLs de medalhas. Pendências `FJ` (Etapa 5) e Coral (Etapa 6) permanecem abertas.
- **Correções realizadas:** nenhuma correção funcional; achados documentados na memória.
- **Próxima etapa:** Etapa 8 — Biblioteca e arquivos.


### Etapa 8 — Biblioteca e arquivos

- **Status:** concluída em 2026-10-29 como revisão estática, sem alterações funcionais. Executada na mesma data das Etapas 5–7 por solicitação explícita do usuário, como exceção à cadência padrão.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 8: Biblioteca e arquivos”.
- **Arquivos verificados:** Biblioteca, instrumento/cobertura, separação de PDFs, gravação de áudio e materiais, conforme lista completa na memória.
- **Evidências:** sintaxe aprovada em nove módulos/scripts JS e três blocos inline; checagem de referências locais identificou `partes.html` → `partes-desktop.css` ausente. Sem navegador, rede ou Firebase/Storage.
- **Achados principais:** ausência de fallback por `storagePath`; placeholder `biblioteca-with-nav.html` incompatível com o módulo operacional; `materiais.js` carregado como script clássico apesar de usar imports; divergência de alias `Trombone 1`; reprocessamento de rótulos antigos pode substituir ajustes manuais; MIME/extensão inconsistentes em áudio e caminhos de falha que podem deixar referências/objetos Storage inconsistentes.
- **Pendências:** alinhar URLs e aliases, preservar rótulos manuais, corrigir inicialização/rota e referência CSS, melhorar consistência de uploads/exclusões e validar MIME, playback, PDF e exportação com arquivos controlados; revisar permissões na Etapa 9. Não foram demonstrados objetos órfãos, acesso indevido ou falhas de rede reais.
- **Correções realizadas:** nenhuma correção funcional; somente memória e plano atualizados.
- **Próxima etapa:** Etapa 9 — Firebase e segurança.


### Etapa 9 — Firebase e segurança

- **Status:** revisão estática local realizada em 2026-10-29, mas etapa **incompleta/bloqueada** até a validação das regras efetivas do Firebase. Iniciada no mesmo dia da Etapa 8 por solicitação explícita do usuário.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 9: Firebase e segurança (bloqueada)”.
- **Arquivos verificados:** `firebase-config.js`, `firebase.json`, `.firebaserc`, `cors.json`, `CONFIGURAR_CORS.md`, `.gitignore`, `login.js`, `auth.js` e `RESET.HTML`.
- **Evidências:** JSONs válidos; sintaxe aprovada em três módulos JS e no script inline do `RESET.HTML`; nenhum arquivo de regras Firestore/Storage no checkout; nenhuma chave privada/service account detectada entre arquivos rastreados. Não houve login, deploy ou acesso a dados.
- **Achados locais:** Hosting publica `.` e não exclui `RESET.HTML` ou os documentos do projeto; o reset em lote não tem guarda de autenticação no cliente. O login compara senhas no cliente e não usa Firebase Authentication; CORS não substitui regras de autorização. O procedimento CORS aponta para bucket diferente do declarado pela configuração principal. O repositório GitHub é público.
- **Bloqueio:** `firebase.json` não define regras e o repositório não contém `firestore.rules`/`storage.rules`; as permissões atualmente implantadas podem estar no Console e são desconhecidas. Não concluir que dados estejam públicos ou protegidos sem examinar essas regras.
- **Correções realizadas:** nenhuma. A revisão estática fica registrada, mas a etapa permanece em aberto.
- **Próxima ação:** obter as regras ativas de Firestore e Storage e confirmar bucket/origens pretendidas; retomar a Etapa 9 após receber esses artefatos. **Não iniciar a Etapa 10 enquanto este bloqueio persistir.**
