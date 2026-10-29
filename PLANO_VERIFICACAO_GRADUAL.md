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

- **Status:** concluída em 2026-10-29 como auditoria estática das configurações locais e das regras fornecidas pelo usuário. A revisão das regras não foi confirmada diretamente no Console Firebase e não foram aplicadas alterações.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “Atualização 2026-10-29 — conclusão da Etapa 9 com regras fornecidas”.
- **Arquivos verificados:** `firebase-config.js`, `firebase.json`, `.firebaserc`, `cors.json`, `CONFIGURAR_CORS.md`, `.gitignore`, `login.js`, `auth.js` e `RESET.HTML`.
- **Evidências:** JSONs válidos; sintaxe aprovada em três módulos JS e no script inline do `RESET.HTML`; nenhum arquivo de regras Firestore/Storage no checkout; nenhuma chave privada/service account detectada entre arquivos rastreados. O usuário forneceu os textos das regras. Não houve login, deploy, chamada a banco ou teste em produção.
- **Achados críticos:** a regra Firestore fornecida permite leitura e escrita anônimas em qualquer documento e subcoleção. As regras Storage fornecidas permitem leitura e escrita anônimas em todos os objetos sob `licoes/` e `biblioteca/`; outros caminhos não têm permissão explícita no texto enviado. Se essas forem as regras ativas, qualquer visitante pode ler, criar, alterar e excluir dados/arquivos nesses escopos.
- **Riscos associados:** `RESET.HTML` não tem guarda de autenticação e faz mutações em lote na coleção `alunos`; com a regra Firestore fornecida ativa e a página hospedada, esses controles podem alterar dados de todos os alunos sem login. O Hosting usa a raiz (`public: "."`) e não exclui `RESET.HTML` nem os documentos Markdown. O login também consulta dados e compara senha no cliente, sem Firebase Authentication. O repositório GitHub é público.
- **Outros achados:** CORS não substitui autorização; o procedimento CORS aponta para `asafenotas-5cf3f.appspot.com`, enquanto a configuração principal declara `asafenotas-5cf3f.firebasestorage.app`. O bucket e a implantação das regras não foram verificados externamente.
- **Correções realizadas:** nenhuma regra ou código foi alterado. Recomenda-se tratar a abertura das regras como prioridade crítica; a migração deve ser planejada com autenticação real e regras por usuário/role, pois a aplicação atual não implementa Firebase Authentication.
- **Limites:** conclusão baseada nos textos fornecidos pelo usuário como correspondentes às regras atuais, sem validação independente no Console Firebase. Não afirmar que a configuração implantada coincide com os trechos sem essa conferência.
- **Próxima etapa:** Etapa 10 — PWA e navegação.


### Etapa 10 — PWA e navegação

- **Status:** concluída em 2026-10-29 como revisão estática, sem alterações funcionais. Executada na mesma data da Etapa 9 por solicitação explícita do usuário, como exceção à cadência padrão.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 10: PWA e navegação”.
- **Arquivos verificados:** manifests principal/Coral, service worker, loader, header e navegação; lista completa na memória.
- **Evidências:** dois JSONs válidos; sintaxe aprovada em cinco módulos JS; 17 caminhos locais do precache presentes; ícones PNG de 192×192 e 512×512 conforme declarados. Sem execução em navegador, instalação/offline real ou Firebase.
- **Achados principais:** worker v61 não pré-carrega páginas/manifesto do Coral, remove todos os caches do origin exceto o próprio e não aguarda `cache.put`; loader não acompanha dados assíncronos e pode não liberar overlay se seu JS falhar; ID `navProfessor` duplicado faz o bottom nav selecionar o elemento errado; Home do `aluno-coral` é redirecionado ao painel principal e não recebe estado ativo. `coral.html` registra o worker em `coral.html:83`; a hipótese de ausência de registro nessa página foi descartada na validação parental.
- **Risco prioritário:** `navegacao.js:171` insere `aluno.foto` do Firestore em `innerHTML`. Em conjunto com as regras Firestore abertas fornecidas na Etapa 9, isso pode permitir injeção HTML persistente; não foi executado teste de exploração.
- **Limitações:** compatibilidade do manifesto de `aluno-coral.html` pode ser intencional; confirmação requer decisão de produto. Não houve teste de instalação, offline, atualização de worker, acessibilidade ou comportamento visual em dispositivos.
- **Correções realizadas:** nenhuma. Os achados devem ser corrigidos e testados em ambiente controlado.
- **Próxima etapa:** Etapa 11 — CSS, mobile e acessibilidade.


### Etapa 11 — CSS, mobile e acessibilidade

- **Status:** concluída em 2026-10-29 como auditoria estática; executada na mesma data da Etapa 10 por solicitação explícita do usuário, como exceção à cadência padrão.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 11: CSS, mobile e acessibilidade”.
- **Arquivos verificados:** as 16 folhas CSS do checkout (`aluno-coral.css`, `aluno-teste.css`, `aluno.css`, `bottom-nav.css`, `cobertura_musicas.css`, `configuracoes.css`, `convites/convite.css`, `index.css`, `instrumento.css`, `loader.css`, `modules/chamada.css`, `modules/gerenciar-alunos.css`, `modules/relatorio.css`, `partes.css`, `professor.css`, `styles.css`) e páginas críticas de login, aluno/Coral/comunidade, chamadas, materiais/Biblioteca, partes/instrumento, professor/turmas, configurações, convites e relatórios.
- **Evidências:** 16 unidades de auditoria e a síntese foram concluídas; foram comparadas referências de folhas, breakpoints, overflow, tamanhos de toque, rótulos, foco, cores declaradas e movimento reduzido. Sem execução/renderização, teste em dispositivo ou alteração funcional.
- **Achados prioritários:** controles acionáveis não nativos/sem teclado, campos e uploads sem associação/foco suficiente, e diversos pares de texto normal abaixo de 4,5:1 (incluindo a navegação inferior, cards de apresentação e botões azuis); `styles.css` bloqueia a rolagem de `materiais.html`; há riscos fortes de layout móvel em convites, chamada e painel do professor; `ensaio2.html` restringe zoom do usuário; referências de CSS/JS precisam de alinhamento e contexto de URL; `convites/convite.html` tem script inline com sintaxe inválida.
- **Outros achados:** animações contínuas sem `prefers-reduced-motion` em várias folhas; ausência de alternativa textual identificada para gráficos/partitura em canvas; label/foco/semântica de modais e estado acessível do loader requerem tratamento.
- **Suspeitas e limites:** integração relativa de `modules/*.html` depende da URL/base hospedeira; contraste de gradientes/transparências e clipping, safe-area, teclado virtual e dimensões computadas exigem validação em runtime. `index.css` e `convites/convite.css` não foram encontrados ligados às páginas examinadas; não se presume regressão sem confirmar intenção.
- **Correções realizadas:** nenhuma alteração em CSS, HTML, JS ou dados; apenas documentação dos resultados.
- **Pendências:** corrigir primeiro os problemas de teclado/semântica e contraste, depois rolagem/reflow/zoom e referências; adicionar movimento reduzido e alternativas dos canvas; testar 320 CSS px, zoom 200%, teclado virtual, safe-area, teclado e leitor de tela antes de encerrar cada correção.
- **Próxima etapa:** Etapa 12 — integração e consolidação dos fluxos completos e do backlog por prioridade.


### Etapa 12 — Integração e consolidação

- **Status:** concluída em 2026-10-29 como síntese documental; executada na mesma data da Etapa 11 por solicitação explícita do usuário, como exceção à regra de uma etapa por dia.
- **Registro detalhado:** `MEMORIA_PROJETO.md`, seção “2026-10-29 — Etapa 12: integração e consolidação” e “Backlog consolidado após a Etapa 12”.
- **Arquivos e registros verificados:** `MEMORIA_PROJETO.md`, `PLANO_VERIFICACAO_GRADUAL.md` e os registros das Etapas 1–11; extrações independentes validadas para todas as 11 etapas e uma síntese cruzada.
- **Evidências:** pendências deduplicadas e agrupadas em P1 (segurança/acesso/integridade), P2 (decisões, funcionalidade, operações e acessibilidade) e P3 (robustez/eficiência), com origem, dependências e critério de saída no backlog da memória. Não houve revisão adicional de código, acesso ao Console Firebase, teste em produção ou alteração funcional.
- **Achado prioritário:** não há P0 confirmado. A verificação das regras Firestore/Storage efetivamente implantadas é urgente (SEC-01); o risco de permissões abertas permanece condicional aos textos fornecidos corresponderem ao Console. Se confirmadas, reavaliar como crítico e validar a mitigação no Emulator antes de deploy.
- **Dependências principais:** autenticação/autorização ↔ regras e dados pessoais/XSS; identidade `docId` ↔ sessão/progresso; contrato de chamadas/`alunoId`/enum ↔ frequência e comprometimento; uploads ↔ Storage/bucket/MIME; carregamento de rotas ↔ PWA/loader/nav/acessibilidade.
- **Decisões preservadas:** Coral é atividade extra; sua presença não altera ensaios da orquestra; participantes externos podem não ter ID de aluno. A Etapa 12 não reabre essa regra; ainda pode ser decidida a representação dos externos em chamadas/comunidade/conquistas.
- **Itens superados:** bloqueio inicial da Etapa 9 foi resolvido pelo envio dos textos, mas falta confirmar a implantação ativa; inexistência de `partes-desktop.css` foi confirmada, mas a referência continua sem decisão; registro do service worker em `coral.html` confirmado; falta de loader em `index.html` não classificada como defeito.
- **Correções realizadas:** nenhuma correção funcional. Somente documentação e consolidação do backlog.
- **Limitações:** a conclusão do ciclo de auditoria não significa que os itens estejam corrigidos, que regras ativas tenham sido verificadas ou que o sistema esteja pronto para produção. Não houve runtime, navegador, dispositivo, Firebase Console, Emulator ou alteração de dados.
- **Próxima ação:** iniciar o backlog por SEC-01, depois tratar dependências P1 e executar os critérios de saída/testes registrados por item. Encerrar cada pendência apenas com evidência correspondente.

## Estado final do ciclo

As 12 etapas de verificação estão registradas e o backlog foi consolidado em `MEMORIA_PROJETO.md`. O ciclo documental está concluído; a implementação e validação dos itens do backlog permanecem abertas, com SEC-01 como verificação urgente inicial. Nenhum item funcional foi marcado como corrigido sem evidência.
