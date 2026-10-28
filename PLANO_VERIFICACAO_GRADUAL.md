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

