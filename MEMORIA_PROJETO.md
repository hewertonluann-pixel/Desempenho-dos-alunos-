# Memória Técnica do Projeto — Desempenho dos Alunos

> **Propósito:** documentar a arquitetura, os fluxos de negócio, os dados persistidos e as regras que não podem ser quebradas durante futuras alterações.
>
> **Repositório:** [hewertonluann-pixel/Desempenho-dos-alunos-](https://github.com/hewertonluann-pixel/Desempenho-dos-alunos-)
>
> **Última revisão:** 18/08/2026
>
> **Aplicação:** Orquestra Filhos de Asafe — Assembleia de Deus Ministério Diamantina

## 1. Como usar este documento

Este arquivo é a **memória técnica central** do projeto. Antes de alterar uma página ou script, leia a seção correspondente e confirme se a mudança preserva os IDs HTML, os nomes das coleções Firestore, o formato de `localStorage`, os parâmetros de URL e as permissões de aluno/professor.

A aplicação é um site estático com JavaScript modular. Não existe um processo de compilação obrigatório nem um gerenciador de dependências no repositório. As páginas são servidas diretamente como HTML, CSS e JavaScript, e os módulos importam o Firebase e bibliotecas auxiliares por CDN. Consequentemente, uma alteração em um arquivo publicado pode ser suficiente para mudar o comportamento do site inteiro.

Quando uma mudança for concluída, faça pelo menos estas verificações: carregamento da página sem erros no console, login como aluno, login como professor, leitura e gravação dos dados afetados, versão mobile e compatibilidade com documentos antigos.

## 2. Visão geral da arquitetura

| Camada | Implementação atual | Observações |
|---|---|---|
| Interface | HTML5, CSS3 e JavaScript Vanilla | Cada fluxo costuma ter uma página HTML e um ou mais scripts específicos. |
| Módulos | ES Modules (`type="module"`) | Imports relativos devem permanecer válidos no Hosting. |
| Banco | Firebase Firestore | Coleções e subcoleções são acessadas diretamente no navegador. |
| Arquivos | Firebase Storage | Usado para fotos, PDFs e áudios da Biblioteca. |
| Sessão | `localStorage.usuarioAtual` | O login atual não usa `getAuth()`; a sessão é controlada pela aplicação. |
| Hospedagem configurada | Firebase Hosting, projeto `asafenotas-5cf3f` | `firebase.json` publica a raiz do repositório. |
| Hospedagem observada | O mesmo código também foi servido por URL Render durante testes | O deploy real deve ser confirmado no ambiente utilizado. |
| PWA | `manifest.json` + `service-worker.js` | O cache atual é limitado e usa estratégia cache-first. |
| PDFs | PDF.js | Extração de texto e renderização de miniaturas/páginas. |
| Sub-PDFs | PDF-LIB | Geração de downloads por grupo de páginas. |
| Gráficos | Chart.js via CDN | Evolução técnica e dashboards. |
| Áudio | `js/recorder.js` e Firebase Storage | Gravação/upload de lições e áudio associado à Biblioteca. |
| Exportação | HTML2PDF, HTML2Canvas e QRCode via CDN ou arquivos locais | Relatórios, convites e exportações visuais. |

A configuração do Firebase fica em [`firebase-config.js`](./firebase-config.js). A chave pública do Firebase pode aparecer no frontend; isso não substitui regras de segurança do Firestore e do Storage. Não inserir chaves privadas, tokens administrativos ou credenciais de servidor em arquivos publicados.

## 3. Entrada, login e sessão

### 3.1 Fluxo de login

A entrada principal é [`index.html`](./index.html), com lógica em [`login.js`](./login.js). O usuário alterna entre os modos **Aluno** e **Professor**.

No modo aluno, `login.js` procura na coleção `alunos`, nesta ordem:

1. campo `login` igual ao texto digitado;
2. campo `nome` exatamente igual ao texto digitado;
3. primeiro nome igual ao texto digitado, carregando os documentos e conferindo a senha.

No modo professor, procura na coleção `usuarios` pelo campo `nome` e confere a senha no documento encontrado.

Após o login, [`auth.js`](./auth.js) grava em `localStorage` o objeto `usuarioAtual`:

```json
{
  "nome": "Nome do usuário",
  "tipo": "aluno ou professor",
  "classificado": false,
  "docId": "id-do-documento"
}
```

O aluno é enviado para `aluno.html?nome=Nome`; o professor é enviado para `professor.html`. O parâmetro `nome` é parte do contrato atual entre login e painel do aluno.

### 3.2 Limitação importante de segurança

Apesar de o projeto mencionar autenticação em alguns textos antigos, o fluxo atual de [`login.js`](./login.js) consulta nome e senha diretamente no Firestore e mantém a sessão em `localStorage`. [`auth.js`](./auth.js) é um auxiliar de sessão; ele não inicializa Firebase Authentication.

Não reimplementar esse mecanismo em novas páginas sem avaliar a migração para Firebase Authentication. Em particular, não duplicar consultas de senha nem criar novas exceções de acesso no frontend. Uma futura migração deve preservar os perfis, os documentos existentes e os redirecionamentos.

## 4. Cabeçalho, navegação e componentes compartilhados

### 4.1 Cabeçalho

[`header-template.js`](./header-template.js) insere automaticamente `.top-header` no início do `body`. Ele começa com um fallback e tenta carregar `config/grupo` no Firestore:

| Dado | Origem | Fallback |
|---|---|---|
| Nome da orquestra | `config/grupo.nome` | `🎵 Orquestra Filhos de Asafe` |
| Logo | `config/grupo.logoUrl` | `logo-fa.jpeg` |
| Foto do usuário | preenchida por `bottom-nav.js` a partir de `alunos.foto` | placeholder |

Não inserir um segundo `.top-header` nas páginas que já carregam o template. Se o nome da orquestra ou a logo mudarem, mantenha o fallback para que a tela continue utilizável quando o Firestore estiver indisponível.

### 4.2 Barra inferior mobile

[`bottom-nav.js`](./bottom-nav.js) e [`bottom-nav.css`](./bottom-nav.css) administram a navegação mobile. O script:

- consulta o aluno logado para atualizar a foto;
- transforma o link Home em `aluno.html?nome=...`;
- mostra o item Professor quando `aluno.classificado === true`;
- configura logout, removendo `usuarioAtual` e enviando para `index.html`;
- marca o item ativo conforme o nome do arquivo atual.

A navegação padrão é:

| Item | Destino | `data-page` |
|---|---|---|
| Home | `aluno.html` | `home` |
| Comunidade | `painel-social.html` | `comunidade` |
| Biblioteca | `biblioteca.html` | `biblioteca` |
| Atividades | `atividades.html` | `atividades` |
| Professor | `professor.html` | `professor` |

O item Professor permanece condicionado ao perfil classificado. Ao criar uma nova página principal, atualize o mapeamento de item ativo somente se necessário e mantenha as áreas de toque mobile.

## 5. Mapa das páginas e responsabilidades

| Página ou módulo | Responsabilidade principal | Dependências ou observações |
|---|---|---|
| `index.html` / `login.js` | Login aluno/professor | Usa `alunos`, `usuarios` e `localStorage`. |
| `cadastro.html` | Cadastro de aluno | Deve preservar os campos esperados por `professor.js` e `aluno3.js`. |
| `aluno.html` | Painel principal do aluno | Usa `aluno3.js`, `aluno.css`, `licoes.js`, `notificacoes.js`, `bottom-nav.js`. |
| `aluno-teste.html` | Protótipo visual independente do painel do aluno | Reutiliza dados/scripts, mas não substituir `aluno.html` sem validação. |
| `aluno3.js` | Carregamento e montagem dos dados do aluno | É o módulo central do painel do aluno. |
| `professor.html` | Painel de gestão de alunos | Usa `professor.js` e `professor.css`. |
| `professor.js` | Cards, níveis, turma ativa, chamada e notificações | Mantém regras de leitura/método e comprometimento. |
| `professor1.html` / `professor2.html` | Variações e telas legadas/experimentais do professor | Confirmar a rota ativa antes de editar. |
| `dashboard-turma.html` / `dashboard-professor.js` | Indicadores coletivos e gráficos | Depende dos dados da turma e dos eventos. |
| `ficha-aluno.html` / `ficha-aluno.js` | Ficha individual na visão do professor | Não confundir com o painel completo de `aluno.html`. |
| `ensaio.html` / `ensaio2.html` | Registro de ensaios e chamadas | Alimenta a coleção `eventos`. |
| `corrigir-chamadas.html` | Correções retroativas de presença | Deve preservar a mesma estrutura dos eventos. |
| `frequencia.js` | Cálculo de presença e comprometimento | Usado pelo aluno e pelo professor. |
| `exportar-chamada.js` | Exportação de chamadas | Pode usar PDF/planilha, dependendo da tela. |
| `atividades.html` | Lista e execução de atividades | Complementada por `atividades-notas.html` e `atividades-armadura.html`. |
| `painel-social.html` | Comunidade/feed social | Usa dados de notificações, conquistas e ações. |
| `biblioteca.html` | Coleções e documentos da Biblioteca | Usa `script_biblioteca.js`. |
| `partes.html` | Visualização e separação de páginas de PDF | Usa `script_partes.js`. |
| `script_biblioteca.js` | Upload, busca, coleções, miniaturas e downloads | Usa Firestore e Firebase Storage. |
| `script_partes.js` | PDF.js, reconhecimento de instrumentos e sub-PDFs | Possui regras de versão e reprocessamento. |
| `configuracoes.html` | Configurações do usuário/grupo | Usa `configuracoes.js` e `configuracoes.css`. |
| `configuracoes-grupo.html` | Configurações da orquestra/turma | Pode alterar dados usados pelo header. |
| `gerenciar-eventos.html` | Eventos e apresentações | Relacionado a convites e ensaios. |
| `convite-orquestra.html` / `convite-orquestra-compacto.html` | Convites para eventos | Possuem templates próprios em `convites/`. |
| `manual.html`, `manualdoaluno.html` | Orientações ao usuário | Conteúdo explicativo; evitar remover links de ajuda. |
| `como-funciona-pauta.html`, `escada-notas.html` | Explicação de notas e progressão | Páginas educacionais. |
| `compassos-game.html`, `escalas-game.html`, `figuras-musicais.html` e outros jogos | Atividades interativas musicais | Funcionam como páginas independentes. |
| `download.html` | Orientação de instalação da PWA | Depende de manifest e service worker. |
| `RESET.HTML` | Fluxo de redefinição de senha | Verificar compatibilidade com o mecanismo de sessão atual. |
| `404.html` | Página de erro | Deve continuar publicada pela hospedagem. |

## 6. Painel do aluno

O painel principal está em [`aluno.html`](./aluno.html) e é carregado por [`aluno3.js`](./aluno3.js). O fluxo central `iniciarPainelAluno` localiza o aluno pelo parâmetro `?nome=`, monta perfil e níveis, calcula comprometimento, garante snapshots, carrega evolução, notificações, conquistas e lições e aplica as preferências salvas.

As áreas principais são:

| Área | Funcionamento |
|---|---|
| Perfil | Nome, foto, instrumento e níveis gerais. A edição deve ser limitada ao dono da página. |
| Comprometimento | Indicadores mensal/anual baseados nos eventos de presença. |
| Frequência anual | Grade por mês/ano, com estados de presença, falta e aula futura e detalhes por data. |
| Notificações | Mudanças recentes, notas, avaliações, conquistas e ações relevantes. |
| Conquistas | Badges, níveis, condições e progresso. |
| Lições | Histórico de lições e modal de envio. Pode conter gravação de áudio. |
| Evolução | Gráfico de leitura e método ao longo do tempo. |
| Preferências | Visibilidade e ordem de painéis podem ser persistidas no documento do aluno. |

A página de teste [`aluno-teste.html`](./aluno-teste.html) é um protótipo independente criado para avaliar a nova apresentação mobile. Ela não deve ser confundida com a rota principal.

### Regras de progresso

Para **Presença no Mês**, a meta é 100% quando a presença atual é maior que 80%; quando está abaixo de 80%, a meta é 80%; se já é 100%, permanece 100%.

Para **Leitura (Bona)** e **Método**, quando não existe registro anterior, o valor do mês atual é repetido como referência do mês anterior. A meta é o valor atual mais 2. Não alterar essas regras sem atualizar também os cards, gráficos, snapshots e relatórios que usam os mesmos campos.

## 7. Painel do professor

[`professor.html`](./professor.html) usa [`professor.js`](./professor.js). O professor trabalha com a turma ativa salva em `localStorage`, e o script carrega os alunos relacionados para renderizar cards compactos.

Cada card pode apresentar foto, nome, instrumento, status, leitura e método. Os controles de lição usam botão `−`, display numérico e botão `+`; o CSS deve manter o `−` na extremidade esquerda e o `+` na extremidade direita do campo.

As operações relevantes são:

- cadastrar aluno com valores padrão e vínculo de turma;
- editar níveis de leitura e método;
- renomear métodos e atualizar snapshots mensais;
- alternar classificação e status ativo;
- abrir a ficha individual;
- criar chamadas do dia com presenças padrão;
- recalcular comprometimento mensal agrupando os eventos por turma;
- gerar notificações quando há alteração relevante.

Ao alterar um card, preserve os nomes dos campos usados por `aluno3.js`, `ficha-aluno.js`, gráficos e snapshots. Não substituir a turma ativa por uma consulta global sem avaliar custo e permissões.

## 8. Biblioteca e reconhecimento de instrumentos

### 8.1 Coleções e documentos

[`script_biblioteca.js`](./script_biblioteca.js) cria, carrega e renderiza as coleções em `biblioteca_colecoes`. As coleções iniciais esperadas são:

- `Métodos`, normalmente com `modoPartes: false`;
- `Hinos da Harpa`, normalmente com `modoPartes: true`;
- `Músicas`, normalmente com `modoPartes: true`.

Cada coleção possui a subcoleção `documentos`. Um documento pode conter, entre outros, `nome`, `url`, `storagePath`, `criadoEm`, `audioUrl` e `audioStoragePath`. Os PDFs são armazenados no caminho `biblioteca/{colecao}/{timestamp}_...`; áudios associados usam um caminho semelhante com o sufixo `_audio_`.

Quando `modoPartes` está ativo, abrir um documento leva para `partes.html?col={idDaColecao}&doc={idDoDocumento}`. Quando está desativado, o PDF é tratado como download direto. A Biblioteca também registra downloads na coleção `downloads` com o nome do aluno, nome do arquivo e data.

### 8.2 Reconhecimento atual

A implementação está em [`script_partes.js`](./script_partes.js). Ela usa PDF.js para abrir o PDF e PDF-LIB para montar sub-PDFs por grupo. **OCR não é utilizado**; o algoritmo depende de uma camada de texto selecionável no PDF.

O catálogo possui nomes canônicos e aliases normalizados. Entre os nomes especiais estão:

| Nome canônico | Exemplos de aliases |
|---|---|
| Saxofone Alto | `saxofone alto`, `alto saxofone`, `alto saxophone`, `sax alto` |
| Saxofone Tenor | `saxofone tenor`, `tenor saxophone`, `saxophone tenor`, `sax tenor` |
| Clarinete em Sib | `clarinet in bb`, `clarinet in b b`, `clarinet in b flat`, `clarinete em sib` |
| Trombone 01/02 | `trombone 01`, `trombone 1`, `trombone 02`, `trombone 2` |
| Trombone Base | `trombone base`, `bass trombone`, `trombone baixo` |

A normalização remove acentos, uniformiza caixa, converte hífens e espaços e compara aliases como palavras inteiras. Aliases específicos devem aparecer antes dos genéricos; por isso `Tenor Saxophone` não pode virar apenas `Tenor` ou `Saxofone`.

### 8.3 Cabeçalho, fallback e GRADE

Para cada página, o algoritmo ordena os itens do PDF pela posição e analisa primeiro uma faixa de aproximadamente 180 unidades a partir do topo visual. Se encontrar um instrumento no cabeçalho, essa é a identificação principal.

Se não encontrar nada no cabeçalho, faz uma segunda busca em toda a camada textual da página, com confiança menor. Essa busca ampla é um fallback e não deve, por si só, interromper o grupo atual de um instrumento.

Uma página é classificada como `GRADE` quando:

1. contém no cabeçalho termos explícitos como `GRADE`, `PARTITURA GERAL`, `FULL SCORE`, `ORCHESTRAL SCORE` ou `CONDUCTOR SCORE`; ou
2. contém dois ou mais instrumentos distintos no cabeçalho.

Na interface, `GRADE` significa **partitura geral**. Não confundir com o botão de visualização em grade da Biblioteca; se a interface for alterada, prefira o rótulo `GRADE — Partitura geral` para evitar ambiguidade.

### 8.4 Continuação de páginas

Uma página de instrumento pode ocupar várias folhas. A regra atual é:

> Depois que um instrumento é identificado, todas as páginas seguintes continuam pertencendo a esse grupo até que apareça um novo cabeçalho de instrumento.

Assim, se a sequência for `Flauta` na página 1, páginas sem cabeçalho nas páginas 2 e 3 e `Clarinete` na página 4, o resultado deve ser `Flauta: 1, 2, 3` e `Clarinete: 4`. Uma ocorrência de outro nome apenas no corpo, rodapé ou fallback não inicia novo grupo.

Se o PDF começar sem identificação, a página é criada como `Página N — revisar`, sem inventar um instrumento. O professor pode corrigir o grupo manualmente.

### 8.5 Rótulos salvos e reprocessamento

As classificações ficam em `biblioteca_rotulos`, usando como documento `${colId}_${docId}`. O formato atual salva:

```json
{
  "grupos": [
    {
      "nome": "Flauta",
      "tipo": "instrumento",
      "paginas": [1, 2, 3],
      "instrumentosDetectados": ["Flauta"],
      "confianca": 0.9,
      "origem": "automatico",
      "fonte": "cabecalho"
    }
  ],
  "algoritmoVersao": 3,
  "atualizadoEm": "Timestamp do Firestore"
}
```

A constante `ALGORITMO_RECONHECIMENTO_VERSAO` está em `3`. Sempre que o catálogo, a regra de cabeçalho, GRADE ou agrupamento mudar, incremente essa versão. Ao abrir um documento com versão antiga, o site reprocessa o PDF em memória; os rótulos antigos permanecem no Firestore até o professor confirmar em **Salvar Tudo**.

No modo professor, `partes.html` apresenta os comandos de editar grupos, criar instrumento, remover páginas, **Reprocessar** e **Salvar Tudo**. O reprocessamento não deve apagar automaticamente uma correção manual já confirmada sem uma ação explícita do professor.

## 9. Modelo de dados Firestore

A tabela abaixo registra as coleções encontradas no código. Campos podem possuir variações legadas; antes de remover um campo, procure todos os consumidores.

| Caminho | Uso principal | Campos/relações importantes |
|---|---|---|
| `alunos/{id}` | Perfil e desempenho do aluno | `nome`, `login`, `senha` legada, `instrumento`, `turma`, `classificado`, `ativo`, `foto`, níveis, métodos, frequência, conquistas, lições, evolução e preferências. |
| `usuarios/{id}` | Login do professor | `nome` e `senha` no fluxo atual. |
| `turmas/{id}` | Turmas e organização dos alunos | Usada por painéis, chamadas e configurações. |
| `eventos/{id}` | Ensaios, aulas e chamadas | Datas, turma e mapa/lista de presenças. Alimenta frequência. |
| `licoes/{id}` | Lições enviadas e avaliadas | Aluno, arquivo/áudio, avaliação e datas; consulte `licoes.js` e `professor-licoes.js`. |
| `notificacoes/{id}` | Feed e avisos | Alterações de nível, avaliação, conquistas e ações recentes. |
| `conquistas/{id}` | Definições ou registros de conquistas | Usada por `conquistas.js` e painel social. |
| `snapshotsMensais/{id}` | Histórico mensal de níveis e métricas | Base dos gráficos, metas e comparação mensal. |
| `historicoProgresso/{id}` | Histórico técnico | Usado na evolução e nos gráficos. |
| `biblioteca_colecoes/{id}` | Coleções da Biblioteca | `nome`, `modoPartes`, `criadoEm`; possui subcoleção `documentos`. |
| `biblioteca_colecoes/{col}/documentos/{id}` | PDFs e áudios | `nome`, `url`, caminhos do Storage, `audioUrl`, `audioStoragePath`, data. |
| `biblioteca_rotulos/{col_doc}` | Grupos de páginas de partes | `grupos`, `algoritmoVersao`, `atualizadoEm`. |
| `downloads/{id}` | Registro de downloads | Usuário, arquivo e data. |
| `materiais/{id}` | Materiais de apoio | Usado por `materiais.html`/`materiais.js`. |
| `atividades/{id}` | Atividades e notas | Usada pelas páginas de atividades. |
| `config/grupo` | Identidade da orquestra | Nome e `logoUrl` do cabeçalho. |
| `solicitacoesLicao`, `apresentacoes`, `convites_recital`, `ensaios` | Fluxos complementares | Confirmar o consumidor antes de alterar ou excluir. |

O frontend acessa diretamente o Firestore e o Storage. Portanto, mudanças de nome de coleção, subcoleção ou campo precisam de uma estratégia de migração ou compatibilidade, não apenas de uma troca em um arquivo HTML.

## 10. PWA, cache e deploy

[`manifest.json`](./manifest.json) define o nome Orquestra, ícones 192/512, orientação retrato, modo `standalone`, cores e idioma `pt-BR`. [`index.html`](./index.html) registra [`service-worker.js`](./service-worker.js).

O service worker usa o cache `painel-orquestra-cache-v36`, pré-carrega somente um conjunto pequeno de arquivos e aplica cache-first: primeiro procura no cache, depois faz `fetch`. Ao publicar uma alteração em um arquivo que pode estar pré-cacheado, incremente `CACHE_NAME`; caso contrário, usuários podem continuar vendo uma versão anterior.

O `firebase.json` publica a raiz `.` e ignora arquivos ocultos e `node_modules`. O projeto Firebase definido em [`.firebaserc`](./.firebaserc) é `asafenotas-5cf3f`. `CONFIGURAR_CORS.md` e [`cors.json`](./cors.json) documentam a configuração de CORS do Storage.

A aplicação pode ser testada localmente com um servidor estático, por exemplo `python3 -m http.server 8080`, a partir da raiz do repositório. Não abrir os HTML diretamente via `file://`, porque imports ES Modules, Firebase e PDF.js dependem de HTTP.

## 11. Regras para futuras alterações

### Preservar contratos

Mantenha os IDs e classes que os scripts procuram com `getElementById`, `querySelector` e listeners globais. Antes de renomear um botão ou container, procure o nome em todos os arquivos. Preserve parâmetros de URL como `?nome=`, `?col=` e `?doc=`.

### Preservar perfis

Toda ação que grava dados deve verificar o papel atual. O modo professor não deve ficar acessível somente porque um usuário alterou um seletor no DOM; o código atual usa `classificado` e `usuarioAtual`, mas regras de segurança reais devem existir no Firestore/Storage.

### Preservar dados legados

Não eliminar campos antigos sem migração. Ao introduzir novo formato, aceite o formato anterior, marque a versão e migre somente após confirmação. Isso vale especialmente para `biblioteca_rotulos`, snapshots e perfis de alunos.

### Preservar mobile

A barra inferior é parte da navegação principal em telas pequenas. Verifique áreas de toque de pelo menos aproximadamente 44–48 px, fonte de 16 px em inputs para evitar zoom automático no iOS, espaçamento para o header fixo e ausência de navegação duplicada desnecessária.

### Preservar regras musicais

Em cards de professor, mantenha leitura como **Bona** quando essa for a nomenclatura do campo. Exiba o método instrumental pelo nome salvo do método. Em desktop, mantenha cards compactos lado a lado, com número e status na mesma linha e sem redundância textual.

A variação [`partes-desktop.html`](./partes-desktop.html) reutiliza [`script_partes.js`](./script_partes.js) e recebe ajustes visuais em [`partes-desktop.css`](./partes-desktop.css), sem alterar [`partes.html`](./partes.html). Na versão desktop, os cards de aluno usam um cabeçalho superior com o nome do instrumento em destaque; quando o grupo tem `tipo: "grade"` ou nome iniciado por `GRADE`, a mesma linha apresenta `GRADE · Partitura geral`. A lista usa duas ou mais colunas responsivas e a grade posiciona o cabeçalho antes da miniatura. Os cards de professor permanecem em largura total para preservar miniaturas e comandos de edição.

### Testar alterações na Biblioteca

Para qualquer mudança em `script_biblioteca.js` ou `script_partes.js`, teste: PDF com instrumento de uma página, instrumento de várias páginas, nomes compostos em português e inglês, GRADE explícita, GRADE com múltiplos instrumentos, página sem texto, rótulo antigo e correção manual do professor. Sem camada de texto selecionável, o algoritmo não reconhece o instrumento porque OCR não faz parte do projeto.

### Separar protótipos de produção

Arquivos com sufixo `-teste`, `preview`, `professor1`, `professor2` ou `evolucao-teste` devem ser tratados como protótipos/variações até que a rota principal seja confirmada. Não copiar uma correção para uma variação e presumir que a produção foi alterada.

## 12. Checklist de alteração e publicação

| Etapa | Verificação |
|---|---|
| Leitura | Identifique o HTML, script, CSS, coleção e parâmetros afetados. |
| Compatibilidade | Procure IDs, classes, imports, campos e links usados por outras páginas. |
| Implementação | Preserve o fluxo atual e crie fallback para dados legados. |
| Teste | Rode `node --check` nos scripts alterados e teste a página em HTTP local. |
| Interface | Verifique desktop, mobile, aluno e professor. |
| Dados | Teste leitura e gravação com documento real ou fixture controlada. |
| Cache | Se alterar arquivo pré-cacheado, incremente o cache do service worker. |
| Git | Revise `git diff --check`, faça commit descritivo e publique na branch correta. |
| Pós-deploy | Limpe/cacheie o navegador e confirme a versão publicada, especialmente no Render/Firebase Hosting. |

## 13. Referências internas

As referências abaixo são arquivos do próprio repositório e devem ser consultadas quando esta memória precisar ser atualizada:

[1]: ./login.js "Fluxo de login e criação da sessão"
[2]: ./auth.js "Formato de usuarioAtual"
[3]: ./header-template.js "Cabeçalho dinâmico"
[4]: ./bottom-nav.js "Navegação inferior e controle de perfil"
[5]: ./aluno3.js "Fluxo central do painel do aluno"
[6]: ./professor.js "Fluxo central do painel do professor"
[7]: ./script_biblioteca.js "Coleções, documentos, uploads e downloads"
[8]: ./script_partes.js "PDF.js, reconhecimento de instrumentos e grupos"
[9]: ./firebase-config.js "Inicialização do Firestore"
[10]: ./firebase.json "Configuração de Hosting"
[11]: ./.firebaserc "Projeto Firebase padrão"
[12]: ./manifest.json "Manifest da PWA"
[13]: ./service-worker.js "Cache e atualização da PWA"
[14]: ./CONFIGURAR_CORS.md "Configuração de CORS do Storage"

---

**Manutenção:** atualize a data e a seção correspondente sempre que uma coleção, rota, parâmetro de URL, regra de permissão, versão do algoritmo de PDF ou estratégia de cache for alterada.
