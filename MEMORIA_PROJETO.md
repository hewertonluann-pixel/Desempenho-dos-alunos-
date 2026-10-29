# Memória Técnica do Projeto — Desempenho dos Alunos

> **Propósito:** documentar a arquitetura, os fluxos de negócio, os dados persistidos e as regras que não podem ser quebradas durante futuras alterações.
>
> **Repositório:** [hewertonluann-pixel/Desempenho-dos-alunos-](https://github.com/hewertonluann-pixel/Desempenho-dos-alunos-)
>
> **Última revisão:** 29/10/2026
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
| PWA | `manifest.json` + `service-worker.js` | O cache usa versionamento; HTML e JavaScript são atualizados preferencialmente pela rede e possuem fallback para cache. |
| PDFs | PDF.js | Extração de texto e renderização de miniaturas/páginas. |
| Sub-PDFs e PDFs consolidados | PDF-LIB | Geração de downloads por grupo de páginas e junção de várias partituras em um único PDF. |
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
| `biblioteca.html` | Coleções e documentos da Biblioteca | Usa `script_biblioteca.js`; inclui o atalho “Por instrumento”. |
| `instrumento.html` | Filtro e download de partituras por instrumento | Usa `script_instrumento.js`; consulta `Músicas`, `Hinos da Harpa` e `biblioteca_rotulos`. |
| `cobertura_musicas.html` | Auditoria de cobertura por música | Lista cada PDF e os instrumentos faltantes; permite ativar/desativar instrumentos, salvar a configuração compartilhada e exportar a lista em PDF/PNG. |
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

**Observação da Etapa 8:** os fluxos de abertura, miniatura e processamento usam `url` diretamente e não reconstroem um URL a partir de `storagePath` quando o campo está ausente ou inválido. Uploads e exclusões Storage/Firestore são operações sequenciais, não transacionais; falhas intermediárias podem deixar objetos órfãos ou documentos com referências inconsistentes.

### 8.2 Reconhecimento atual

A implementação está em [`script_partes.js`](./script_partes.js). Ela usa PDF.js para abrir o PDF e PDF-LIB para montar sub-PDFs por grupo. **OCR não é utilizado**; o algoritmo depende de uma camada de texto selecionável no PDF.

O catálogo possui nomes canônicos e aliases normalizados. Entre os nomes especiais estão:

| Nome canônico | Exemplos de aliases |
|---|---|
| Saxofone Alto | `saxofone alto`, `alto saxofone`, `alto saxophone`, `sax alto` |
| Saxofone Tenor | `saxofone tenor`, `tenor saxophone`, `saxophone tenor`, `sax tenor` |
| Clarinete em Sib | `clarinet in bb`, `clarinet in b flat`, `clarinete em sib` |
| Trombone em Sib | `trombone em sib`, `trombone sib`, `trombone bb`, `trombone in bb`, `trombone in b flat` |
| Trombone em Dó | `trombone em dó`, `trombone em do`, `trombone c`, `trombone em c`, `trombone in c` |
| Souzafone | `souzafone`, `sousafone`, `sousaphone` e variantes com `sib`, `bb`, `b flat` e `in b` |
| Trombone 01/02 | `trombone 01`, `trombone 1`, `trombone 02`, `trombone 2` |
| Trombone Base | `trombone base`, `bass trombone`, `trombone baixo` |

A normalização remove acentos, uniformiza caixa, converte hífens e espaços e compara aliases como palavras inteiras. Aliases específicos devem aparecer antes dos genéricos; por isso `Tenor Saxophone` não pode virar apenas `Tenor` ou `Saxofone`.

**Divergência confirmada na Etapa 8:** `script_instrumento.js` e `cobertura_musicas.js` associam `Trombone 1` ao instrumento genérico `Trombone`, enquanto este catálogo documenta `trombone 1` como alias de `Trombone 01`. Alinhar os dois catálogos antes de reprocessar rótulos.

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

A constante `ALGORITMO_RECONHECIMENTO_VERSAO` está em `6` em `script_partes.js` e `script_instrumento.js`. Sempre que o catálogo, a regra de cabeçalho, GRADE ou agrupamento mudar, incremente essa versão. A página `partes.html` reprocessa versões antigas para a edição do professor; a página `instrumento.html`, ao carregar pendências, grava os grupos atualizados em `biblioteca_rotulos`. O botão **Atualizar rótulos** da página de instrumentos força o reprocessamento de todos os PDFs carregados, mesmo quando já possuem grupos, e grava novamente seus rótulos.

No modo professor, `partes.html` apresenta os comandos de editar grupos, criar instrumento, remover páginas, **Reprocessar** e **Salvar Tudo**. O reprocessamento não deve apagar automaticamente uma correção manual já confirmada sem uma ação explícita do professor. O reprocessamento em lote de `instrumento.html` é uma ação explícita do usuário pelo botão **Atualizar rótulos** e deve ser usado quando o catálogo de aliases for alterado.

**Risco confirmado na Etapa 8:** ao carregar rótulos de versão antiga, `partes.html` pode reprocessá-los automaticamente em memória e marcar o documento como alterado. Se o professor salvar depois, os grupos antigos podem ser substituídos sem confirmação específica sobre a perda de ajustes manuais. Rever esse comportamento para preservar a regra descrita acima.

### 8.6 Página por instrumento

`instrumento.html` carrega os documentos de `Músicas` e `Hinos da Harpa`, aplica os grupos salvos em `biblioteca_rotulos` e mostra somente os instrumentos efetivamente identificados e ativos. Os nomes exibidos são agrupados pelos aliases canônicos e a quantidade no seletor representa PDFs únicos, não a quantidade de grupos ou páginas.

A página possui cache local dos documentos e das configurações de instrumentos. O cache acelera as aberturas seguintes; a atualização de rótulos consulta o Firestore e, no modo forçado, reprocessa todos os PDFs sequencialmente, mostrando o progresso ao usuário. O download em lote gera um único PDF consolidado com PDF-LIB, em vez de um arquivo ZIP.

### 8.7 Auditoria de cobertura por música

`cobertura_musicas.html`, acessível pelo painel do professor, lista os PDFs por música e informa os instrumentos faltantes em cada arquivo. A regra de completude considera todos os instrumentos ativos no catálogo compartilhado, e uma música só aparece como **Completa** quando possui todos eles.

Os toggles da página permitem incluir ou excluir instrumentos da análise. A configuração é salva em `biblioteca_instrumentos`, com campos `key`, `nomeExibicao`, `aliases`, `ordem`, `ativo`, `atualizadoEm` e `origem`. A página `instrumento.html` deve respeitar os mesmos instrumentos ativos e aliases; não criar um catálogo paralelo sem atualizar os dois fluxos.

A página de cobertura usa uma lista estruturada de músicas, não uma tabela-matriz, exibe duas colunas em desktop e uma em telas menores e permite exportar a lista filtrada em PDF ou PNG. O conteúdo exportado deve refletir os filtros e os instrumentos ativos salvos.

### 8.8 Biblioteca: navegação por partes

Quando `modoPartes` está ativo, a Biblioteca mantém o botão **Ver Partes** como ação principal. O texto auxiliar redundante `→ ver partes` não deve ser reintroduzido ao lado do nome do PDF; o nome pode continuar clicável e apontar para `partes.html`, mas a interface deve evitar duplicar a mesma indicação.

### 8.9 Limitações confirmadas na auditoria

`biblioteca-with-nav.html` é um placeholder sem o DOM operacional esperado por `script_biblioteca.js`; se for servido como rota da Biblioteca, a inicialização falha por ausência dos elementos. `materiais.html`/`materiais.js` implementam registro e histórico de entregas, não uma biblioteca de arquivos; além disso, o HTML carrega como script clássico um arquivo JavaScript com imports de módulo, impedindo sua inicialização conforme está marcado. `partes.html` referencia `partes-desktop.css`, ausente no checkout. A Biblioteca aceita áudio em formatos diversos, mas declara `audio/mpeg` nos players; as gravações de lições podem usar MIME diferente sob extensão `.webm` e não persistem `storagePath` no documento da lição.

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
| `biblioteca_instrumentos/{key}` | Catálogo canônico e configuração compartilhada dos instrumentos | `key`, `nomeExibicao`, `aliases`, `ordem`, `ativo`, `atualizadoEm`, `origem`. Consumida por `cobertura_musicas.html` e `instrumento.html`. |
| `downloads/{id}` | Registro de downloads | Usuário, arquivo e data. |
| `materiais/{id}` | Materiais de apoio | Usado por `materiais.html`/`materiais.js`. |
| `atividades/{id}` | Atividades e notas | Usada pelas páginas de atividades. |
| `alunos/{id}/progressoAtividades/{atividadeId}` | Conclusão de atividades da jornada | Atividade, ordem, status, timestamp e detalhes; escrita depende do `docId` do aluno em `localStorage.usuarioAtual`. |
| `config/grupo` | Identidade da orquestra | Nome e `logoUrl` do cabeçalho. |
| `solicitacoesLicao`, `apresentacoes`, `convites_recital`, `ensaios` | Fluxos complementares | Confirmar o consumidor antes de alterar ou excluir. |

O frontend acessa diretamente o Firestore e o Storage. Portanto, mudanças de nome de coleção, subcoleção ou campo precisam de uma estratégia de migração ou compatibilidade, não apenas de uma troca em um arquivo HTML.

**Regra de domínio confirmada pelo usuário — Coral/KADOSH:** o Coral é uma atividade extra, distinta dos ensaios da orquestra. Alguns alunos da orquestra também participam, e várias outras pessoas não pertencem à orquestra e podem não ter ID/documento de aluno. A presença do Coral deve permanecer isolada e nunca alterar ou compor a frequência dos ensaios. Não presumir que todo participante do Coral precisa de `alunos/{id}`; preservar separadamente o vínculo à turma principal e a participação Coral.

**Jornada de atividades:** `jornada-atividades.js` grava a conclusão em `alunos/{docId}/progressoAtividades/{atividadeId}` e as medalhas ficam ativas por 30 dias. O vencimento é apenas de exibição; registros não são apagados. Registros legados sem timestamp de conclusão permanecem ativos. O módulo exige `localStorage.usuarioAtual.docId`; as atividades são independentes e o validador de página não bloqueia acesso fora da ordem.

## 10. PWA, cache e deploy

[`manifest.json`](./manifest.json) define o nome Orquestra, ícones 192/512, orientação retrato, modo `standalone`, cores e idioma `pt-BR`. [`index.html`](./index.html) registra [`service-worker.js`](./service-worker.js).

O service worker usa atualmente o cache `painel-orquestra-cache-v61`. Ele pré-carrega um conjunto pequeno de arquivos, invalida caches antigos no evento `activate` e usa rede com fallback para HTML e JavaScript, atualizando o cache quando a resposta é bem-sucedida. Ao publicar uma alteração em arquivo pré-cacheado ou em lógica de página, incremente `CACHE_NAME` e, quando necessário, altere o parâmetro de versão do `<script>` para evitar que o navegador reutilize um módulo antigo.

O `firebase.json` publica a raiz `.` e ignora arquivos ocultos e `node_modules`. O projeto Firebase definido em [`.firebaserc`](./.firebaserc) é `asafenotas-5cf3f`. `CONFIGURAR_CORS.md` e [`cors.json`](./cors.json) documentam a configuração de CORS do Storage.

**Achados da Etapa 10:** `coral.html` usa `manifest-coral.json` e registra o service worker, mas o worker não pré-carrega `coral.html` nem `manifest-coral.json`; `aluno-coral.html` usa o manifesto principal. A limpeza de `activate` apaga todos os caches do mesmo origin exceto o nome atual, e o `cache.put` de documentos/scripts não é aguardado. O loader pode ocultar antes de dados assíncronos terminarem e não tem fallback se o próprio script falhar. A navegação injeta um `navProfessor` e o bottom nav repete o mesmo ID; o destino Home do Coral de aluno é reescrito para `aluno.html`. Ver o registro da Etapa 10 ao final desta memória para evidências e pendências.

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

O layout desktop descrito para [`partes-desktop.html`](./partes-desktop.html) e [`partes-desktop.css`](./partes-desktop.css) deve ser tratado como intenção de design, não como implementação disponível: ambos os arquivos não existem nem estão rastreados no checkout auditado. Além disso, `partes.html:752` ainda referencia `partes-desktop.css`, que está ausente. Não assumir essa variação até os arquivos serem criados e publicados; decidir se a referência deve ser removida ou se os assets planejados devem ser recuperados.

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

## 17. Processo de verificação gradual

A lista completa de arquivos está em [`INVENTARIO_PROJETO.md`](./INVENTARIO_PROJETO.md). O trabalho de revisão deve seguir [`PLANO_VERIFICACAO_GRADUAL.md`](./PLANO_VERIFICACAO_GRADUAL.md), com uma etapa por dia e baixo consumo de contexto. Cada etapa só pode ser considerada concluída quando este arquivo de memória receber um registro datado com os arquivos verificados, evidências, achados, correções, pendências e próximo passo. O plano e esta memória devem ser atualizados juntos no mesmo commit.

### Estado do ciclo
- Estado: ciclo de verificação documental das 12 etapas concluído em 2026-10-29; o backlog de correções permanece aberto
- Etapas concluídas: 1–12 — registradas em 2026-10-29
- Próxima ação: iniciar pelo SEC-01 (confirmar regras Firebase ativas); depois executar o backlog com evidência/teste antes de fechar cada item

### 2026-10-29 — Etapa 1: baseline e arquitetura
- Status: concluída
- Arquivos verificados: `INVENTARIO_PROJETO.md`, `PLANO_VERIFICACAO_GRADUAL.md`, `firebase.json`, `firebase-config.js`, `.firebaserc`, `manifest.json`, `manifest-coral.json`, `service-worker.js`, `cors.json` e as referências locais das páginas HTML.
- Testes/evidências: checkout limpo no commit `96d53c0`; 137 arquivos no checkout atual, sendo 60 HTML, 45 JavaScript, 16 CSS, 4 JSON, 4 Markdown, 3 PNG, 1 JPEG, 1 SVG e 3 arquivos sem extensão; `node --check` passou em todos os 45 arquivos JavaScript; os quatro JSONs foram analisados com sucesso; 486 referências locais foram verificadas.
- Confirmado: o projeto é estático, sem etapa de build; o Firebase Hosting publica a raiz (`firebase.json`); o Firestore usa o projeto `asafenotas-5cf3f`; o service worker está na versão de cache `painel-orquestra-cache-v61`; o manifest principal e o manifest do Coral Kadosh estão presentes; a configuração documentada do CORS permite a origem Render `https://filhosdeasafe.onrender.com`.
- Suspeitas: o CORS não documenta a origem do Firebase Hosting; `manifest-coral.json` deve ser validado junto ao fluxo de instalação; a estratégia de cache e as referências absolutas devem ser revisadas na etapa 10.
- Correções realizadas: nenhuma alteração funcional; somente o registro desta etapa e a atualização do plano.
- Pendências: seis referências locais não resolvidas no checkout: `partes.html` → `partes-desktop.css`; `convites/convite.html` → `/mnt/data/eu.png`; `modules/chamada.html` → `modules/chamada.css`; `modules/gerenciar-alunos.html` → `modules/gerenciar-alunos.css`; `modules/relatorio.html` → `modules/relatorio.css`; `modules/relatorio.html` → `relatorio-turma.html`. Validar se são erros reais, referências legadas ou recursos gerados antes de corrigir.
- Próxima etapa: Etapa 2 — login e sessão (`index.html`, `login.js`, `auth.js`, `cadastro.html` e `RESET.HTML`).

### 2026-10-29 — Etapa 2: login e sessão
- Status: concluída
- Arquivos verificados: `index.html`, `login.js`, `auth.js`, `cadastro.html`, `RESET.HTML`, `firebase-config.js` e `participacoes.js` como dependências diretas do fluxo de cadastro.
- Testes/evidências: scripts externos `login.js` e `auth.js` aprovados com `node --check`; os três scripts inline de `index.html`, `cadastro.html` e `RESET.HTML` também foram aprovados; todos os IDs consumidos pelos scripts foram encontrados nos respectivos HTMLs; checkout limpo no commit `12abbed`.
- Confirmado: o login de professor consulta `usuarios` antes de `alunos`; o login de aluno aceita `login`, nome completo ou primeiro nome após normalização sem acentos, espaços duplicados e diferenças de caixa; a senha é comparada no cliente com o campo `senha`; professor redireciona para `professor.html` e aluno para `aluno.html?nome=...`; a sessão usa `localStorage.usuarioAtual` com `nome`, `tipo`, `classificado` e `docId`; `garantirFormato()` remove somente valores legados que não começam com `{`; o cadastro exige `turma` na URL, lê `turmas/{turmaId}`, cria o documento em `alunos`, adiciona o ID à turma e redireciona para o painel do aluno; os campos necessários para os scripts estão presentes.
- Suspeitas: a comparação por primeiro nome pode ser ambígua quando existem homônimos; `garantirFormato()` não valida JSON corrompido que comece com `{`; o cadastro salva foto Base64 no documento do Firestore, embora aceite arquivo de até 3 MB, o que pode exceder o limite do documento; a sessão criada pelo cadastro não contém `docId`; `RESET.HTML` usa `storageBucket: asafenotas-5cf3f.appspot.com`, enquanto `firebase-config.js` usa `asafenotas-5cf3f.firebasestorage.app`.
- Correções realizadas: nenhuma alteração funcional nesta etapa; os contratos atuais foram documentados para evitar mudanças incompatíveis.
- Pendências: avaliar migração do login para Firebase Authentication ou, no mínimo, retirar a comparação de senhas no cliente; proteger ou remover `RESET.HTML` da publicação pública, pois ele executa operações destrutivas em todos os alunos; definir política para senha inicial `asafe`; corrigir a inconsistência do bucket; decidir se o cadastro deve usar Firebase Storage para fotos e incluir `docId` na sessão; testar homônimos e documentos legados com dados controlados.
- Próxima etapa: Etapa 3 — painel do aluno (`aluno.html`, `aluno3.js`, CSS, notificações e lições).

### 2026-10-29 — Etapa 3: painel do aluno
- Status: concluída
- Arquivos verificados: `aluno.html`, `aluno3.js`, `aluno.css`, `notificacoes.js`, `licoes.js`, `header-template.js`, `bottom-nav.js`, `bottom-nav.css`, `frequencia.js`, `conquistas.js`, `participacoes.js` e `snapshots-mensais.js` como dependências do painel.
- Testes/evidências: checkout limpo no commit `6f4bb4b`; `node --check` passou nos módulos JavaScript examinados; os IDs estáticos principais do painel estão presentes; os IDs ausentes na checagem de `licoes.js` são criados dinamicamente por `inserirModalLicao()`; o painel carrega scripts com módulos deferidos e usa o contrato `usuarioAtual`/`docId`.
- Confirmado: `aluno3.js` localiza o aluno por `id`, pela sessão `docId` ou por nome; monta perfil, frequência, comprometimento, snapshots, conquistas, evolução e lições; preferências podem ocultar e reordenar painéis; alterações de nome/login/senha e conquistas gravam em `alunos`; fotos são gravadas como Data URL; `licoes.js` grava áudio no Storage e metadados em `licoes`; compatibilidade com lições legadas por `alunoNome` existe; notificações carregam lições, downloads e notificações e mantêm listeners em tempo real.
- Suspeitas: `?id=` carrega outro documento antes da validação da sessão e pode expor dados de qualquer aluno que conheça um ID; a propriedade de edição é inferida comparando nomes, não exclusivamente `docId`; a foto do painel não possui limite de tamanho/tipo e pode exceder o limite de documento Firestore; o upload de áudio usa caminho terminado em `.webm` mesmo quando o navegador seleciona MP4/OGG; notificações globais expõem nomes e atividades de outros alunos; consultas de coleções inteiras em `calcularEnergiaDoAluno`, conquistas e configurações podem ser caras; `Timestamp.toMillis()` nos listeners de notificações não aceita registros legados em string; conteúdos de Firestore entram em `innerHTML` sem escape em notificações, popup de conquistas e detalhes de lições.
- Correções realizadas: nenhuma alteração funcional; a etapa documentou fluxo, contratos e riscos.
- Pendências: restringir visualização por ID e proprietário, centralizar autorização por `docId`, limitar/transferir fotos para Storage, preservar extensão/MIME real do áudio, filtrar notificações por destinatário, substituir consultas globais por consultas indexadas e escapar ou construir com `textContent` todo conteúdo externo antes de usar HTML.
- Próxima etapa: Etapa 4 — painel do professor (`professor*`, `dashboard-*`, `ficha-aluno*` e `modules/`).

### 2026-10-29 — Etapa 4: painel do professor
- Status: concluída
- Arquivos verificados: `professor.html`, `professor.js`, `professor.css`, `professor1.html`, `professor2.html`, `dashboard-turma.html`, `dashboard-professor.js`, `ficha-aluno.html`, `ficha-aluno.js`, `navegacao.js`, `modules/chamada.*`, `modules/gerenciar-alunos.*`, `modules/relatorio.*` e `js/professor-alunos.js`.
- Testes/evidências: checkout limpo no commit `c812ef6`; `node --check` passou nos JavaScript externos; os scripts inline de `professor.html`, `ficha-aluno.html` e `dashboard-turma.html` também passaram; o carregamento dinâmico dos módulos foi mapeado.
- Confirmado: a turma ativa é persistida em `localStorage.turmaAtiva`; `professor.js` filtra turmas principais por `turmaId` e trata Coral/KADOSH como participação extra via `turmas.alunos`; o painel permite criar aluno, editar níveis e nomes de métodos, classificar, ativar/desativar, trocar foto, remover aluno, abrir ficha, criar chamada e recalcular comprometimento; níveis registram histórico e snapshot; `ficha-aluno.js` edita acesso, dados pessoais, dados gerais e endereço; o módulo de chamada grava presença e histórico mensal; o dashboard e o relatório fazem agregações globais; todos os scripts verificados são sintaticamente válidos.
- Suspeitas: não há guarda de autenticação/autorização nas páginas `professor.html` e `ficha-aluno.html`; esconder o link Professor na navbar não impede acesso direto por URL; `ficha-aluno.html?id=` permite ler e editar qualquer aluno cujo ID seja conhecido; a ficha exibe e grava senha em texto puro; mover aluno de turma na ficha não sincroniza arrays `turmas.alunos`/`alunosInativos` nem participações; remover aluno não limpa seus vínculos em turmas, eventos, lições, snapshots ou histórico; o fluxo Coral pode ler toda a coleção `alunos` para filtrar localmente; várias renderizações usam `innerHTML` com nomes, instrumentos e fotos vindos do Firestore sem escape; as fotos continuam em Base64 e `js/professor-alunos.js` não valida tamanho/tipo.
- Suspeitas de integridade: `modules/chamada.js` encontra um registro em `eventos`, marca `veioDeEventos`, mas não usa essa variável ao salvar; em seguida tenta atualizar/gravar em `ensaios` ou `apresentacoes`, divergindo do fluxo de `professor.js`, que usa `eventos`; o módulo de chamada carrega todos os alunos, sem `turmaId`, e salva presenças por nome sem `alunoId`; cada salvamento incrementa novamente `alunos.presencas`, mesmo ao editar a mesma chamada; o mês do histórico usa UTC (`toISOString`) enquanto a data do evento usa horário de Brasília; cancelar tenta excluir o mesmo ID nas três coleções; o dashboard lê `frequenciaMensal.porcentagem`, enquanto o painel moderno usa contratos com `percentual`, podendo exibir média zero; o módulo alternativo de gerenciamento cria alunos sem turma e senha inicial com contrato reduzido.
- Correções realizadas: nenhuma alteração funcional; a etapa foi dedicada ao mapeamento, aos testes estáticos e ao registro de riscos.
- Pendências prioritárias: implementar autorização real baseada em Firebase Authentication e claims/regras Firestore; proteger a ficha e separar leitura de senha; unificar a coleção/contrato de chamadas e usar `alunoId`; tornar o recálculo de presença idempotente; sincronizar matrícula Coral e troca de turma em transação; definir exclusão/arquivamento de aluno com limpeza de referências; limitar e migrar fotos para Storage; escapar conteúdo externo; corrigir o contrato do dashboard e consolidar os fluxos duplicados de gerenciamento de alunos.
- Próxima etapa: Etapa 5 — chamadas e frequência (`ensaio*`, `gerenciar-eventos`, `corrigir-chamadas`, `frequencia` e `comprometimento`).

### 2026-10-29 — Etapa 5: chamadas e frequência
- Status: concluída
- Arquivos verificados: `ensaio.html`, `ensaio2.html`, `gerenciar-eventos.html`, `corrigir-chamadas.html`, `frequencia.js`, `comprometimento.js`, `participacoes.js`, `exportar-chamada.js` e `modules/chamada.js`.
- Testes/evidências: checkout limpo no commit `1ac3c66`; `node --check` passou nos módulos JavaScript centrais; os scripts inline de `ensaio.html`, `ensaio2.html`, `gerenciar-eventos.html` e `corrigir-chamadas.html` passaram na validação de sintaxe; os contratos de coleções, estados e recálculos foram comparados entre os fluxos.
- Confirmado: o fluxo principal grava chamadas na coleção `eventos` com `turmaId`, `turmaNome`, `data` ISO, `tipo` e lista de `presencas`; `ensaio.html` e `ensaio2.html` mostram `instrumentoCoral`/voz para Coral; estados visuais incluem presente, ausente e justificado; `frequencia.js` filtra por turma e aluno e aceita `alunoId` com fallback por nome; `participacoes.js` limita chamadas ao intervalo de participação do aluno; `comprometimento.js` recalcula registros mensais e anuais; a exclusão em `gerenciar-eventos.html` chama o recálculo do mês da chamada; `corrigir-chamadas.html` permite atribuir turma a chamadas sem `turmaId`.
- Falha confirmada: os fluxos de chamada serializam falta justificada como `FJ`, mas `participacoes.js` só reconhece `justificado` e `J` como justificativa. Consequentemente, uma chamada `FJ` cai no ramo de ausência, não entra em `justificadas` e pode reduzir indevidamente a frequência.
- Suspeitas de integridade: ao reabrir uma chamada, `ensaio.html`/`ensaio2.html` filtram registros salvos de alunos inativos e podem sobrescrevê-los fora do documento; a chamada alternativa em `modules/chamada.js` usa coleções `ensaios`/`apresentacoes`, enquanto o fluxo principal usa `eventos`; o módulo alternativo registra por nome, não por `alunoId`, carrega todos os alunos e pode incrementar o histórico várias vezes ao salvar; `gerenciar-eventos.html` lista e exclui somente `eventos`; `corrigir-chamadas.html` altera chamadas em massa sem backup e não recalcula comprometimento após atribuir turma; chamadas corrigidas podem continuar com presenças sem `alunoId`.
- Suspeitas de cálculo: `frequencia.js` possui um cálculo legado que conta todas as chamadas no denominador, enquanto `participacoes.js` exclui justificadas do total avaliado; isso pode produzir percentuais diferentes entre grade, energia e comprometimento; `normalizarDataISO()` converte objetos `Date` por UTC e pode deslocar o dia em fusos negativos; `chaveMesAtual()` em `comprometimento.js` usa o fuso local do navegador, enquanto chamadas usam explicitamente America/Sao_Paulo; a proteção contra Coral depende de `turmaAtiva.tipo` estar atualizado no `localStorage`; consultas de recálculo carregam coleções inteiras e atualizam alunos sequencialmente.
- Riscos adicionais: o carregamento de uma chamada sem turma pode incluir todos os alunos ativos; o filtro por nome é vulnerável a homônimos; a exclusão de uma chamada recalcula apenas o mês informado e depende de todas as presenças terem o contrato esperado; a interface de correção permite associar chamadas sem turma a uma turma errada se o usuário selecionar destino inadequado; renderizações administrativas usam `innerHTML` com observações e nomes externos sem escape.
- Correções realizadas: nenhuma alteração funcional nesta etapa; a falha `FJ` e os demais riscos foram documentados para correção controlada.
- Pendências prioritárias: unificar o enum de estados (`P`, `F`, `FJ`) em todos os cálculos; preservar registros históricos ao editar chamadas; consolidar chamadas em `eventos` e usar `alunoId`; tornar recálculos idempotentes e transacionais; usar fuso de Brasília em todas as chaves de data; recalcular após correções em massa; validar turma e autorização antes de mutações; filtrar por turma e evitar consultas globais; escapar conteúdo externo.
- Próxima etapa: Etapa 6 — Coral e comunidade (`aluno-coral*`, `coral.html`, `painel-social*` e `conquistas*`).


### 2026-10-29 — Etapa 6: Coral e comunidade
- Status: concluída como revisão estática, sem correções funcionais. A Etapa 6 foi iniciada no mesmo dia da Etapa 5 após autorização explícita do usuário, como exceção à cadência padrão de uma etapa por dia.
- Contexto confirmado pelo usuário: o inventário havia sido feito no dia anterior (2026-10-28); Coral/KADOSH é atividade extra; alguns alunos da orquestra participam e várias outras pessoas não são da orquestra e podem não ter ID/documento de aluno; presenças do Coral são distintas e não devem afetar as presenças dos ensaios. Esta regra também foi registrada na seção 9.
- Arquivos verificados: `aluno-coral.html`, `aluno-coral.js`, `aluno-coral.css`, `coral.html`, `painel-social.html`, `painel-social1.html`, `conquistas.js`, `conquistas-editor.html`; dependências/caminhos de integração `ensaio.html`, `ensaio2.html`, `frequencia.js`, `participacoes.js` e `aluno3.js`.
- Testes/evidências: checkout inicial limpo no commit `ca026f5`; `node --check` aprovado para `aluno-coral.js`, `conquistas.js`, `participacoes.js` e `frequencia.js`; scripts inline de `coral.html`, `ensaio.html`, `ensaio2.html`, `painel-social.html`, `painel-social1.html` e `conquistas-editor.html` passaram em `node --check`. Testes com dados sintéticos confirmaram que uma chamada com `turmaId` Coral não é elegível para frequência da turma principal e que o rótulo `tipo: "aula"` não passa pelo filtro de eventos usado para a conquista Coral. Nenhum acesso ao Firebase e nenhuma alteração de dados reais.
- Confirmado: os fluxos de chamada interrompem o recálculo dos documentos de `alunos` quando a turma ativa é Coral, e o cálculo por turma exclui uma chamada cujo `turmaId` Coral difere do `turmaId` principal do aluno. A chamada é armazenada na coleção compartilhada `eventos`, com o ID da turma Coral.
- Falha confirmada: a criação nos dois caminhos (`ensaio.html` e `ensaio2.html`) grava `tipo: "aula"` mesmo para uma turma Coral. Consultas genéricas excluem eventos Coral apenas quando `tipo === "coral"`; o cálculo de `participacao_coral` em `aluno3.js` também seleciona por `tipo === "coral"` ou `turmaTipo === "coral"`. Assim, chamadas novas podem escapar da separação por tipo e não acionar a conquista Coral. Para perfis sem `turmaId`, a rotina social usa correspondência de ID/nome e exclui somente eventos marcados `coral`, criando risco de contabilizar chamadas Coral como métricas gerais; não foi consultado banco nem medido efeito em produção.
- Confirmado: o fluxo “Novo aluno” de `coral.html` cria um documento em `alunos` (com `turmaId` vazio) e vincula seu ID à turma Coral. A tela de nova chamada carrega documentos de `alunos`; não há fluxo visível para incluir um participante avulso apenas por nome. A edição preserva presenças antigas com `alunoId` vazio, mas isso não resolve a inclusão em novas chamadas. Os painéis sociais e o fluxo de conquistas também dependem de documentos `alunos`, então participantes sem documento não são representados por esses fluxos.
- Suspeitas/limites: `painel-social.html` remove do conjunto principal perfis cujo `aluno.turmaId` seja o ID de uma turma Coral; se esse campo estiver preenchido com Coral apesar de a pessoa pertencer à orquestra, o card principal pode desaparecer. A validação de acesso observada em Coral, perfil individual e editor depende de estado/checagens no cliente; regras Firestore/Storage efetivas não foram localizadas nem verificadas. Algumas renderizações interpolam dados do Firestore ou URLs de imagem em HTML/atributos, a revisar com dados controlados.
- Correções realizadas: nenhuma alteração funcional ou de dados; divergências e riscos registrados para decisão e correção controlada.
- Pendências: definir um cadastro/identificador próprio para participantes Coral sem documento de aluno e como eles aparecem em chamadas, comunidade e conquistas; marcar/enriquecer eventos Coral de forma consistente e testar isolamento em todos os consumidores de frequência; manter `alunos.turmaId` representando a turma principal, independente da participação extra; revisar regras Firestore/Storage; escapar/validar conteúdo inserido no DOM. Permanece pendente a falha `FJ` registrada na Etapa 5; esta etapa não a corrigiu.
- Próxima etapa: Etapa 7 — atividades e jogos (`atividades*`, `jornada*`, jogos e teoria).


### 2026-10-29 — Etapa 7: atividades e jogos
- Status: concluída como revisão estática, sem correções funcionais. Executada no mesmo dia da Etapa 6 por solicitação explícita do usuário, como exceção à cadência padrão de uma etapa por dia.
- Arquivos verificados: `atividades.html`, `atividades-notas.html`, `atividades-armadura.html`, `jornada-atividades.js`, `compassos-game.html`, `escalas-game.html`, `escada-notas.html`, `figuras-musicais.html`, `jogo-figuras.html`, `jogo-tom-semitom.html`, `como-funciona-pauta.html`, `tetracordes.html` e `tetroquestgame.html`; integrações pontuais com `conquistas.js`, `conquistas-editor.html` e `aluno3.js`.
- Testes/evidências: checkout inicial limpo no commit `c61d82e`; `node --check` passou em `jornada-atividades.js` e nos scripts inline das 12 páginas HTML examinadas. Teste sintético confirmou expiração após 30 dias e o comportamento de registros legados sem data; verificações estáticas confirmaram o retorno sem `docId`, a ausência de bloqueio de ordem e os critérios de conclusão descritos abaixo. Nenhuma página foi executada em navegador; nenhum acesso ou alteração de dados Firebase/Firestore.
- Confirmado: a jornada tem nove IDs; `atividades.html` exibe as atividades e o fluxo salva conclusões em `alunos/{docId}/progressoAtividades/{atividadeId}`. A ordem fornece uma sugestão, não restringe o acesso: `protegerPaginaAtual()` é no-op e as páginas podem ser abertas diretamente. O módulo registra conclusão e detalhes no final do fluxo; os jogos não salvam checkpoints suficientes para retomar uma partida após recarregar. `jogo-figuras.html` guarda apenas desbloqueios de modos em `localStorage`.
- Confirmado: a validade de medalha é calculada por 30 dias e a lista apresenta o estado expirado sem apagar o registro; quando falta `concluidaEm` válida, o código mantém o registro ativo por compatibilidade. A sessão precisa conter `usuarioAtual.docId`. Sem usuário/docId, `concluirAtividade()` retorna `salvo:false`, mas o botão não verifica esse resultado e pode mostrar “Jornada concluída!” mesmo sem gravar. A Etapa 2 já havia registrado que a sessão criada no cadastro não inclui `docId`; compatibilidade desse caminho continua pendente.
- Falhas/riscos de lógica confirmados por inspeção estática: em `jogo-tom-semitom.html`, o contador usado para terminar a jornada corresponde a modos desbloqueados, não necessariamente concluídos; sair após desbloquear o último modo pode acionar a conclusão. Em `jogo-figuras.html`, qualquer modo aprovado aciona a jornada, embora a página anuncie três modos. `figuras-musicais.html` e `como-funciona-pauta.html` permitem chegar ao final por navegação de slides/passos sem validar todas as interações pedagógicas. O tutorial de pauta conclui ID de ordem 3, mas depois redireciona para `atividades-notas.html` (ordem 6), não para a ordem seguinte.
- Confirmado: `concluirAtividade()` está exposta em `window.JornadaAtividades` e aceita qualquer ID cadastrado sem prova de conclusão no cliente; a proteção efetiva depende de regras de escrita do Firestore, não revisadas. A função que escolhe a próxima atividade usa a posição fixa, não o conjunto de atividades ainda pendentes. `atividades-armadura.html` não está no catálogo de nove IDs e a busca estática não encontrou link para essa página no checkout; decidir se deve fazer parte da jornada.
- Suspeitas/limites: erros ao carregar o progresso são convertidos em mapa vazio sem aviso visível; URL de imagem da medalha é interpolada sem escape no `src`; o acesso/autorização real depende de sessão e regras remotas não inspecionadas. Não foram provados comportamento em navegador, gravação permitida, exploração de chamadas do cliente nem conteúdo/estado de dados existentes.
- Correções realizadas: nenhuma alteração funcional ou de dados. Os achados foram registrados para decisão e correção controlada.
- Pendências: impedir confirmação falsa quando não há `docId`; conferir a sessão criada por cadastro conforme pendência da Etapa 2; revisar as condições de conclusão em Tom/Semitom e Jogo das Figuras; decidir o contrato de progressão, checkpoints e retomada; alinhar ordem exibida e próximo destino; decidir a inclusão de Armadura; decidir como tratar conclusões legadas sem timestamp; revisar regras Firestore e validar URLs/HTML de medalhas. Continuam abertas a divergência `FJ` da Etapa 5 e as pendências de Coral da Etapa 6.
- Próxima etapa: Etapa 8 — Biblioteca e arquivos (Biblioteca, partituras, PDFs, gravação e Storage).


### 2026-10-29 — Etapa 8: Biblioteca e arquivos
- Status: concluída como revisão estática, sem alterações funcionais. Executada na mesma data das Etapas 5–7 a pedido explícito do usuário, como exceção à cadência padrão de uma etapa por dia.
- Arquivos verificados: `biblioteca.html`, `biblioteca-with-nav.html`, `script_biblioteca.js`, `instrumento.html`, `script_instrumento.js`, `cobertura_musicas.html`, `cobertura_musicas.js`, `cobertura_musicas.css`, `partes.html`, `partes-ORIGINAL.html`, `script_partes.js`, `partes.css`, `js/recorder.js`, `js/recorderWorker.js`, `licoes.js`, `professor-licoes.js`, `materiais.html` e `materiais.js`; contratos da seção 8 deste arquivo e o inventário.
- Testes/evidências: checkout inicial limpo em `main`, commit `6bb7c8d`. `node --check` passou para nove módulos/scripts JS e três scripts inline; verificação estática das referências HTML encontrou `partes.html` → `partes-desktop.css`, inexistente no checkout (referência já listada na Etapa 1). Não houve execução em navegador, rede, login, Firebase/Firestore/Storage, nem leitura ou alteração de dados reais.
- Confirmado: Biblioteca grava documentos com URLs/caminhos Storage, mas os fluxos de abertura, miniatura e processamento usam `url` diretamente, sem resolver por `storagePath`. Uploads/substituições/exclusões são operações sequenciais; há caminhos que ignoram erros ou não limpam objetos após falhas posteriores, o que pode produzir referências inconsistentes ou objetos órfãos — possibilidade estática, não observada em dados reais.
- Confirmado: `biblioteca-with-nav.html` é um placeholder sem os elementos que `script_biblioteca.js` procura e pode falhar ao inicializar. `materiais.html`/`materiais.js` registram entregas e históricos, não arquivos/Storage; `materiais.js` contém imports de módulo, mas o HTML o carrega como script clássico, incompatibilidade estática que impede a inicialização como marcada.
- Confirmado: a classificação por instrumentos usa rótulos versionados, mas há divergência em `Trombone 1` versus o alias canônico `Trombone 01`. `partes.html` pode reprocessar rótulos de versão antiga automaticamente em memória; salvar depois pode substituir grupos manuais sem confirmação específica. `instrumento.html` não invalida automaticamente todo cache quando muda a versão do algoritmo, e falhas de reprocessamento em lote podem não ficar visíveis na mensagem final.
- Confirmado: o processamento de PDF depende de URLs remotas e CDNs, usa a camada de texto (sem OCR) e gera sub-PDFs no cliente; a rotina de download não verifica `response.ok` antes do processamento. Não foram testados URL, CORS, CDNs, download, PDF/PNG exportado nem renderização em navegador.
- Confirmado: os players da Biblioteca declaram `audio/mpeg` embora o seletor aceite outros formatos. O fluxo de lições usa `MediaRecorder`, acumula dados em memória e aplica o limite de 8 MiB após a captura; o arquivo usa extensão `.webm` mesmo quando o MIME pode ser MP4/Ogg, persiste `audioURL` sem `storagePath`, e a exclusão da lição remove o documento Firestore sem apagar o objeto Storage. O helper `recorder.js`/`recorderWorker.js` exporta WAV e não foi encontrado integrado ao fluxo de lições examinado.
- Suspeitas/limites: interpolação de dados em `innerHTML`, controles de perfil no cliente e URLs de arquivo exigem revisão adicional, mas a explorabilidade e o acesso efetivo dependem de origem dos dados e regras Firestore/Storage não examinadas. Não se concluiu se os arquivos remotos são públicos, se URLs expiraram, nem se falhas/objetos órfãos existem em produção.
- Correções realizadas: nenhuma correção funcional; os contratos e achados foram registrados para validação e correção controladas.
- Pendências: definir fallback central `url`/`storagePath`; corrigir ou remover rotas placeholder e a inclusão de módulo em `materiais.html`; resolver a referência `partes-desktop.css`; alinhar aliases e a migração de rótulos sem perder ajustes manuais; tratar falhas parciais de upload/substituição/exclusão e guardar caminho de objetos quando necessário; alinhar MIME/extensão, validar tipo/tamanho e testar reprodução/exportação com arquivos reais; revisar regras e autorização na Etapa 9. Permanecem abertas `FJ` (Etapa 5), Coral (Etapa 6) e as pendências da jornada (Etapa 7).
- Próxima etapa: Etapa 9 — Firebase e segurança (`firebase-config.js`, `firebase.json`, `cors.json` e regras).


### 2026-10-29 — Etapa 9: auditoria inicial (bloqueio depois resolvido)
- Status da auditoria inicial: ficou bloqueada até o usuário fornecer os textos das regras; a conclusão está registrada na atualização ao final desta memória.
- Arquivos verificados: `firebase-config.js`, `firebase.json`, `.firebaserc`, `cors.json`, `CONFIGURAR_CORS.md`, `.gitignore`, `login.js`, `auth.js` e `RESET.HTML`; pesquisa em arquivos versionados por regras e credenciais.
- Testes/evidências: checkout limpo em `main`, commit-base `bc2cf55`; JSONs de configuração válidos; `node --check` passou em `firebase-config.js`, `login.js`, `auth.js` e no módulo inline de `RESET.HTML`. Nenhum arquivo de regras Firestore/Storage está rastreado ou presente no checkout. Varredura dos arquivos rastreados não encontrou marcadores de chave privada/service account. Repositório GitHub confirmado como público.
- Confirmado: `.firebaserc` aponta para `asafenotas-5cf3f`. `firebase.json` configura somente Hosting, com `public: "."`, e não define publicação de regras Firestore/Storage; a configuração ignora `firebase.json`, dotfiles e `node_modules`, mas não `RESET.HTML` nem os documentos Markdown do projeto. Se esse Hosting for implantado com a configuração atual, esses arquivos da raiz são candidatos a serem servidos publicamente.
- Confirmado: `RESET.HTML` não contém guarda de autenticação no cliente; percorre a coleção inteira `alunos` e oferece mutações em lote de presenças, frequência, conquistas, notas/classificação e fotos. A capacidade real de ler ou gravar depende das regras ativas, que não foram inspecionadas nem testadas.
- Confirmado: `firebase-config.js` expõe a configuração web e inicializa Firestore, mas não inicializa Firebase Authentication. A chave `apiKey` do cliente é um identificador usado na configuração web, não uma chave privada; não foi possível verificar restrições de API no Console. `login.js` lê todas as coleções `usuarios` e `alunos` e compara `senha` no cliente; `auth.js` só grava uma sessão modificável em `localStorage`. As únicas referências a `getAuth`/`onAuthStateChanged` encontradas são imports em `materiais.js`, sem chamadas identificadas.
- Confirmado: `cors.json` lista somente a origem Render e métodos GET/POST/PUT/DELETE/HEAD; CORS controla a origem de requisições do navegador, não concede nem substitui autorização. `CONFIGURAR_CORS.md` manda aplicar/verificar CORS no bucket `asafenotas-5cf3f.appspot.com`, enquanto a configuração principal usa `asafenotas-5cf3f.firebasestorage.app`; não foi possível determinar qual bucket existe ou qual política está ativa. `RESET.HTML` também mantém a configuração legada `appspot.com`.
- Limites/bloqueio: sem arquivos de regras e sem inspeção autorizada do Console Firebase, não é possível afirmar se o projeto nega, restringe ou permite operações anônimas. Não houve deploy, autenticação, chamada a Firestore/Storage, teste de permissão, leitura ou alteração de dados. A presença de `firebase.json` local não comprova a configuração atualmente implantada.
- Correções realizadas: nenhuma alteração funcional; nenhum segredo privado foi encontrado na varredura estática do repositório.
- Próxima ação necessária para concluir a Etapa 9: fornecer/revisar os arquivos efetivos `firestore.rules` e `storage.rules` (ou uma exportação textual equivalente das regras ativas), além de confirmar o bucket e as origens Hosting pretendidas. Até isso ocorrer, manter a Etapa 9 bloqueada e não avançar à Etapa 10.


### Atualização 2026-10-29 — conclusão da Etapa 9 com regras fornecidas
- Status: Etapa 9 concluída como auditoria estática das configurações locais e dos textos das regras fornecidos pelo usuário. Os trechos foram tratados como as regras atuais informadas pelo usuário; não houve confirmação independente no Console Firebase.
- Regra Firestore analisada: `allow read, write: if true` dentro de `match /{document=**}` autoriza qualquer cliente, autenticado ou anônimo, a ler, listar, criar, alterar e excluir documentos em qualquer coleção e subcoleção do banco.
- Regras Storage analisadas: `allow read, write: if true` em `licoes/{allPaths=**}` e `biblioteca/{allPaths=**}` deixa qualquer cliente ler, enviar, substituir e excluir objetos nesses prefixos. No texto fornecido, outros caminhos não recebem permissão explícita e ficam negados por padrão, salvo existência de regras adicionais não fornecidas.
- Severidade: crítica para confidencialidade e integridade. Se os trechos correspondem às regras implantadas, os dados de alunos, frequência, notas, conquistas e demais documentos do Firestore ficam expostos a leitura e alteração anônimas; arquivos de lições e Biblioteca também ficam publicamente legíveis e graváveis.
- Risco combinado: `RESET.HTML` está na raiz incluída pelo Hosting, não apresenta autenticação no cliente e possui ações globais para atualizar alunos. Se a página estiver hospedada e a regra Firestore informada estiver ativa, as ações podem ser executadas por visitantes sem login. Isso não foi testado em produção.
- Mitigação recomendada, ainda não aplicada: substituir permissões abertas por negação por padrão e regras específicas de propriedade/role para cada coleção e prefixo de Storage; implementar Firebase Authentication e autorização real antes de exigir `request.auth`, pois o login atual consulta senhas no Firestore e grava somente uma sessão em `localStorage`. Restringir ou remover `RESET.HTML` do diretório público. Validar as regras com Firebase Emulator Suite e dados de teste antes de qualquer deploy.
- Limites: nenhum arquivo de regra foi criado ou alterado; não houve deploy, acesso ao Console, teste anônimo, acesso a documentos ou arquivos, nem tentativa de escrita. A configuração ativa pode divergir do texto enviado.
- Próxima etapa: Etapa 10 — PWA e navegação (`manifest*`, `service-worker.js`, loader, navegação e header).


### 2026-10-29 — Etapa 10: PWA e navegação
- Status: concluída como revisão estática, sem alterações funcionais. Executada na mesma data da Etapa 9 por solicitação explícita do usuário, como exceção à regra de uma etapa por dia.
- Arquivos verificados: `manifest.json`, `manifest-coral.json`, `index.html`, `coral.html`, `aluno-coral.html`, `service-worker.js`, `loader.js`, `loader.css`, `navegacao.js`, `bottom-nav.js`, `bottom-nav.css`, `header-template.js`, `aluno.html`, `professor.html`, `biblioteca.html`, `atividades.html` e `firebase.json`.
- Testes/evidências: os dois manifests são JSON válidos; `node --check` passou em `service-worker.js`, `loader.js`, `navegacao.js`, `bottom-nav.js` e `header-template.js`. Os 17 caminhos locais declarados no precache existem; `icon-192.png` é 192×192 e `icon-512.png` é 512×512. Não houve execução em navegador/dispositivo, teste offline, rede ou Firebase.
- Confirmado — manifests: o manifesto principal é ligado por `index.html` e tem `start_url`/`scope` relativos coerentes; seus ícones locais existem com as dimensões declaradas. `coral.html` liga `manifest-coral.json` e, em `coral.html:83`, registra `/service-worker.js`. `aluno-coral.html` liga o manifesto principal e não registra diretamente o worker; decidir se isso é intencional para a identidade PWA do painel Coral. Os caminhos absolutos funcionam sob a publicação atual na raiz; a hipótese de subdiretório é somente condicional.
- Confirmado — service worker: `CACHE_NAME` está em `painel-orquestra-cache-v61`; a lista pré-cacheada não inclui `coral.html`, `manifest-coral.json` nem `aluno-coral.html`. `cache.addAll()` torna a instalação dependente do sucesso de todos os itens. O evento `activate` exclui todos os caches do mesmo origin cujo nome difere do cache atual, sem prefixo do aplicativo. Nas respostas network-first, `cache.put()` é iniciado sem ser aguardado por `event.waitUntil`; os demais GET same-origin não pré-cacheados usam cache-first e uma resposta de rede fria não é adicionada ao cache.
- Confirmado — loader: `loader.js` combina `window.load`, uma verificação de prontidão e um timeout máximo; `checkPageReady()` considera `document.readyState === "complete"` suficiente e não aguarda carregamentos de dados assíncronos da aplicação. Se `loader.js` não carregar, as páginas com overlay não têm fallback independente para removê-lo. O overlay não declara estado acessível e as animações não respeitam `prefers-reduced-motion` nos arquivos examinados. `index.html` não usa o loader; não foi tratado como falha por si só.
- Confirmado — navegação/header: `navegacao.js` injeta um `navProfessor` no início do body; `aluno.html` e `aluno-coral.html` também declaram `id="navProfessor"` no bottom nav. `bottom-nav.js` usa `getElementById`, portanto, com a navbar injetada antes do bottom nav, a busca seleciona o primeiro ID e pode deixar o link Professor inferior oculto. Em `aluno-coral.html`, o link Home é reescrito para `aluno.html?nome=...` e a função de item ativo não reconhece `aluno-coral`. O template `header-template.js` é importado por `bottom-nav.js` nas páginas que carregam esse módulo; `professor.html` carrega apenas `navegacao.js` e usa navegação separada.
- Risco prioritário combinado com a Etapa 9: `navegacao.js` interpola `aluno.foto` do Firestore em `navAvatar.innerHTML` (`navegacao.js:171`). Como as regras Firestore fornecidas pelo usuário permitem escrita anônima global, existe um caminho potencial para injeção HTML persistente via dado de perfil; não foi criada nem executada carga de teste. Tratar como prioridade, substituir interpolação por criação de elementos e atribuição segura de `img.src`, e restringir as regras antes de usar o perfil.
- Acessibilidade/usabilidade: o botão de menu em `navegacao.js` é uma `div` com listener de clique, sem semântica/teclado identificados; avatar sem `alt` e item ativo sem `aria-current`. A intenção do link Professor também não deve ser considerada autorização: sua visibilidade deriva de `classificado` no cliente.
- Correções realizadas: nenhuma alteração funcional ou de dados. Achados e caminhos foram registrados para correção controlada.
- Pendências: decidir manifesto do painel Coral; rever precache/instalação offline, limpeza de caches e espera do `cache.put`; adicionar fallback fail-open e sincronização do loader com tarefas críticas; eliminar o ID duplicado e corrigir Home/estado ativo do Coral; tornar menu/estado/avatar acessíveis; remover o sink `innerHTML` para a foto e restringir regras Firestore; testar instalação, offline, atualizações e navegação em browser/dispositivo após as correções.
- Próxima etapa: Etapa 11 — CSS, mobile e acessibilidade.


### 2026-10-29 — Etapa 11: CSS, mobile e acessibilidade
- Status: concluída como auditoria estática, sem alterações funcionais. Executada na mesma data da Etapa 10 por solicitação explícita do usuário, como exceção à cadência padrão.
- Arquivos verificados: as 16 folhas CSS do checkout: `aluno-coral.css`, `aluno-teste.css`, `aluno.css`, `bottom-nav.css`, `cobertura_musicas.css`, `configuracoes.css`, `convites/convite.css`, `index.css`, `instrumento.css`, `loader.css`, `modules/chamada.css`, `modules/gerenciar-alunos.css`, `modules/relatorio.css`, `partes.css`, `professor.css` e `styles.css`; páginas críticas e associadas incluem login (`index.html`), aluno/Coral e painéis sociais, chamadas (`ensaio.html`, `ensaio2.html`, `corrigir-chamadas.html`, `gerenciar-eventos.html`), materiais/Biblioteca, partes/instrumento, professor/turmas, configurações, convites e relatórios.
- Testes/evidências: 16 auditorias estáticas independentes e uma síntese foram concluídas sem falhas; houve mapeamento determinístico de folhas para páginas e revisão das referências, seletores, breakpoints, alvos de toque, foco, rótulos, contraste declarado, movimento reduzido e semântica. Não houve execução do aplicativo, navegador, leitor de tela, dispositivo real, teste de impressão ou alteração de código.
- Confirmado:
  - Há ações em elementos não nativos (`div`/`span` com `onclick`) sem semântica/teclado declarados, além de uploads ou switches ocultos sem caminho por teclado suficientemente acessível. Exemplos: cartões dos painéis sociais, cartões de chamada, cabeçalho de turma, chips de materiais e controles de fechamento/upload. Também foram encontrados rótulos não associados a campos e casos de `outline:none` sem foco substituto perceptível.
  - Há pares de texto normal com contraste estático inferior a 4,5:1. Exemplos calculados: rótulos de `bottom-nav.css` em torno de 1,66–1,73:1; texto herdado quase branco em cards brancos de `apresentacao.html` em torno de 1,23:1; botões primários azuis em `configuracoes.css`/`instrumento.css` em torno de 2,8:1; outros botões em gradiente e texto secundário pequeno também falham nos pares sólidos declarados. Gradientes e superfícies transparentes requerem recálculo com as cores efetivamente compostas.
  - `styles.css` aplica `overflow:hidden` ao `body` e é carregado por `materiais.html`, cujo conteúdo se estende além da primeira tela; não há `.screen` no HTML fornecido que limite a regra, impedindo a rolagem normal do documento.
  - Há riscos responsivos concretos no CSS/markup estático: cartões de convite com largura fixa de 600px/480px sem `max-width`; linhas sem quebra em `corrigir-chamadas.html`; ficha de 300px persistente no breakpoint móvel de `professor.html`; e `ensaio2.html` oculta overflow e desativa zoom do usuário (`maximum-scale=1.0,user-scalable=no`).
  - A integração de estilos requer correção/decisão: `partes.html` aponta para `partes-desktop.css`, ausente no checkout, enquanto `partes.css` não está ligado pelo nome esperado; `index.css` e `convites/convite.css` não são referenciados pelas páginas críticas examinadas. Em `modules/*.html`, caminhos como `href="modules/chamada.css"` resolvem duplicados se o documento for servido diretamente em `/modules/`; se forem fragments, a URL/base hospedeira precisa ser confirmada. `materiais.html` declara contêiner vazio da navegação inferior e carrega `bottom-nav.js` como script clássico embora a fonte use `import`. `convites/convite.html` contém sintaxe inválida no script inline, que precisa ser corrigida antes de validar o fluxo.
  - Várias folhas/estilos inline não declaram `prefers-reduced-motion` apesar de animações contínuas; gráficos em canvas nos relatórios e a partitura em canvas não apresentam alternativa textual equivalente identificada no markup examinado.
- Suspeitas: a renderização final de overflow, safe-area, camadas de modal, teclado virtual, foco nativo e cores com transparência depende do navegador, dos estilos externos e dos dados/runtime. A integração dos fragments `modules/*.html` depende da URL/base real. A existência de folhas não referenciadas não comprova regressão ou remoção intencional.
- Correções realizadas: nenhuma. Foram registrados somente os achados; não houve alteração de aplicação, dados, Firebase ou CSS.
- Pendências: priorizar (1) controles nativos/teclado, nomes acessíveis, labels e foco; (2) corrigir contrastes insuficientes; (3) liberar rolagem em Materiais, reflow de convites/chamadas/professor e zoom em `ensaio2.html`; (4) alinhar referências e carregamento de CSS/JS após confirmar URLs; (5) adicionar movimento reduzido e alternativas textuais para canvas; (6) validar navegação fixa, safe-area e modais em navegador/dispositivo, incluindo 320 CSS px, ampliação de 200%, teclado virtual, teclado e leitor de tela.
- Próxima etapa: Etapa 12 — integração e consolidação do backlog, conforme o plano.


### 2026-10-29 — Etapa 12: integração e consolidação
- Status: concluída como consolidação documental dos fluxos e pendências das Etapas 1–11. Executada na mesma data da Etapa 11 por solicitação explícita do usuário, como exceção à cadência padrão de uma etapa por dia.
- Arquivos verificados: `MEMORIA_PROJETO.md` e `PLANO_VERIFICACAO_GRADUAL.md`; registros canônicos das 11 etapas anteriores e suas extrações estruturadas.
- Testes/evidências: 11/11 extrações foram validadas por número/ID de etapa e sintetizadas em um backlog único, deduplicado, com prioridade, origem, dependências, ações e critérios de saída. Não houve reauditoria do código, execução do aplicativo, acesso ao Console Firebase, teste em produção nem alteração funcional.
- Confirmado: o ciclo de verificação tem 12/12 etapas documentadas; o backlog abaixo reúne itens abertos e validações pendentes. Não há P0 confirmado: SEC-01 permanece P1 urgente até se confirmar no Console se as regras fornecidas pelo usuário correspondem às regras implantadas; somente a confirmação de permissões abertas justificaria reavaliar o impacto como crítico/P0.
- Decisões de produto preservadas: Coral/KADOSH é atividade extra; sua presença não altera a frequência dos ensaios da orquestra; participantes externos podem não ter ID/documento de aluno; `alunos.turmaId` continua representando a turma principal. A política de representação dos externos nos fluxos de chamada/comunidade/conquistas segue como decisão separada, sem reabrir o isolamento Coral/orquestra.
- Itens superados: o bloqueio da Etapa 9 por falta do texto das regras foi resolvido quando o usuário forneceu os trechos, mas a implantação ativa ainda não foi verificada; a existência de `partes-desktop.css` foi esclarecida como ausente, permanecendo aberta a decisão sobre a referência; o registro do service worker por `coral.html` foi confirmado; a ausência de loader em `index.html` foi explicitamente tratada como não defeito.
- Correções realizadas: nenhuma funcional. Foram atualizados somente o estado, o registro da Etapa 12 e o backlog documental; nenhuma pendência de implementação é considerada encerrada por esta consolidação.
- Pendências: iniciar pelo SEC-01 (verificação independente das regras/bucket ativos); tratar em seguida segurança e integridade P1; executar depois decisões e itens P2/P3 conforme dependências. Fechar cada item somente com evidência de saída/teste indicada no backlog.
- Próxima etapa: ciclo de verificação gradual encerrado; próxima ação é executar o backlog priorizado em tarefas controladas, começando por SEC-01. A conclusão documental não significa que o aplicativo esteja corrigido ou pronto para produção.

## Backlog consolidado após a Etapa 12

A prioridade P1 indica ação prioritária; riscos condicionais permanecem condicionais até a verificação descrita. P0 não foi atribuído a nenhum item com a evidência atual. As referências de origem remetem aos registros detalhados das etapas acima, que preservam arquivos e evidências originais.

### P1 — segurança, acesso e integridade de dados

| ID | Estado, pendência e origem | Dependência e critério de saída |
|---|---|---|
| SEC-01 | **Aberto; validação urgente; impacto condicional** — Confirmar no Console Firebase as regras Firestore/Storage e o bucket ativos. A Etapa 9 analisou texto fornecido pelo usuário com `read, write: if true`, não uma exportação verificada da implantação. Origem: Etapa 9, com riscos relacionados nas Etapas 6–11. | Se as permissões abertas estiverem ativas, desenhar regras específicas com negação por padrão e validar leituras/escritas permitidas e negadas no Emulator antes de deploy autorizado. Se não estiverem, documentar a divergência. Só classificar como P0 após evidência da implantação aberta. |
| SEC-02 | **Aberto; decisão de arquitetura** — Definir autenticação, papéis, sessão e autorização real; retirar comparação de senha no cliente e leitura/gravação de senha em texto puro na ficha. Origem: Etapas 2, 4, 5, 6, 7, 9 e 10 (`login.js`, `auth.js`, páginas administrativas). | Depende de SEC-01 e da identidade canônica DATA-01. Critério: testes com aluno, professor autorizado, anônimo e usuário sem papel confirmam acesso permitido/negado; ficha não expõe senha e mutações dependem de autorização remota. |
| SEC-03 | **Condicional** — Verificar se `RESET.HTML` está publicado; remover da publicação ou proteger a ação destrutiva global. O impacto por visitante depende da publicação e das regras efetivas. Origem: Etapas 2 e 9 (`RESET.HTML`, `firebase.json`). | Depende de SEC-01/SEC-02. Critério: comprovar que a página não é publicada ou que usuário não autorizado não consegue executar mutações; testar somente com dados controlados, nunca apagando dados reais. |
| SEC-04 | **Aberto** — Autorizar leituras por proprietário/papel antes de carregar dados por `?id=` e proteger ficha, progresso e dados correlatos. Origem: Etapas 3, 4, 7 e 9 (`aluno.html`, `aluno3.js`, `ficha-aluno.html`). | Depende de SEC-01/SEC-02 e DATA-01. Critério: ID de outro aluno não expõe documento; testes cobrem proprietário, professor autorizado, outro aluno e anônimo. |
| SEC-05 | **Aberto; validação pendente** — Eliminar inserção insegura de Firestore/nomes/observações/fotos/URLs em `innerHTML`; usar construção segura/`textContent` e validar URLs. Origem: Etapas 3–7, 9 e 10 (`aluno3.js`, `notificacoes.js`, `navegacao.js`, renderizadores sociais/chamadas/conquistas). | Autorização não substitui codificação segura. Critério: conteúdo de teste com HTML é exibido como texto ou sanitizado sem execução; URLs inválidas são rejeitadas. A exposição associada às regras abertas permanece condicional a SEC-01. |
| DATA-01 | **Aberto; decisão pendente** — Definir identidade canônica `docId` e garantir que cadastro/login a persistam na sessão. Em atividade/jornada, não mostrar sucesso quando `salvo:false` ou a gravação falhar. Origem: Etapas 2 e 7 (`cadastro.html`, `usuarioAtual`, `jornada-atividades.js`). | Depende de SEC-02. Critério: sessões novas/legadas têm identidade tratada; sem `docId` ou com gravação negada não há falso sucesso, e progresso gravado continua disponível após recarga. |
| DATA-02 | **Aberto** — Unificar contrato e coleção das chamadas e usar `alunoId` para alunos identificados, em vez de depender do nome. Origem: Etapas 4–6 (`eventos`, `ensaios`, `apresentacoes`, `modules/chamada.js`). | Depende de DATA-01, SEC-02 e DEC-01. Critério: fluxos suportados usam contrato aprovado; testes cobrem homônimos, legados, inativos e externos sem criar IDs de aluno fictícios. |
| DATA-03 | **Aberto** — Normalizar estados de presença, especialmente `FJ`, que os fluxos gravam mas um consumidor trata como ausência comum. Origem: Etapas 5–7 (`participacoes.js`, cálculos de frequência/comprometimento). | Depende de DATA-02. Critério: testes de gravação, edição e recálculo comprovam tratamento aprovado de `P`, `F`, `FJ` e aliases, preservando separação Coral/orquestra. |
| DATA-04 | **Aberto** — Tornar contagem/recálculo de presenças idempotente e transacional ao salvar novamente ou editar chamada. Origem: Etapas 4–5. | Depende de DATA-02/03. Critério: salvar duas vezes não duplica total; editar estado atualiza uma vez; falha/repetição não deixa contagem parcial. |
| DATA-05 | **Aberto** — Preservar registros históricos de alunos inativos ao reabrir e salvar chamadas. Origem: Etapa 5 (`ensaio.html`, `ensaio2.html`). | Depende de DATA-02/04. Critério: teste com histórico de aluno inativo demonstra que entradas fora do escopo editado não são filtradas nem sobrescritas. |
| DATA-06 | **Aberto; decisão pendente** — Sincronizar troca de turma/participações e definir exclusão versus arquivamento, incluindo referências a eventos, lições, snapshots e histórico. Origem: Etapa 4. | Depende de SEC-02, DATA-01/02 e da decisão de retenção. Critério: transação/testes controlados confirmam vínculos consistentes e histórico preservado conforme política aprovada. |

### P2 — funcionalidade, decisões, arquivos e acessibilidade

| ID | Estado, pendência e origem | Dependência e critério de saída |
|---|---|---|
| DEC-01 | **Decisão pendente** — Definir como participantes externos sem ID de aluno são representados em chamadas, comunidade e conquistas, caso esses fluxos devam suportá-los. Origem: Etapas 6–7. | Preservar que nem todos são alunos da orquestra; critério: decisão de produto documentada e testada sem exigir ID inexistente nem misturar frequência de Coral e ensaios. |
| DATA-07 | **Validação pendente** — Normalizar marcador de evento Coral para que conquistas/métricas previstas o reconheçam e testar consumidores; uma chamada pode ser gravada como `tipo: "aula"` enquanto filtros procuram `coral`. Origem: Etapas 5–7. | Depende de DEC-01/DATA-02/03. Critério: eventos Coral são reconhecidos pelos consumidores previstos e nunca alteram presença de ensaios da orquestra. |
| FUNC-01 | **Aberto** — Alinhar `frequenciaMensal.porcentagem` e `percentual` entre produtor/consumidor do dashboard do professor. Origem: Etapa 4. | Critério: valores de referência não nulos, ausência de dados e casos Coral/orquestra são exibidos corretamente; zero não é causado apenas por incompatibilidade de campo. |
| FUNC-02 | **Aberto; validação pendente** — Padronizar chaves de data no fuso `America/Sao_Paulo` e recalcular comprometimento após correções em massa. Origem: Etapa 5. | Depende de DATA-02/03/04. Critério: testes perto da meia-noite/virada do mês são consistentes e correções em massa atualizam métricas uma única vez. |
| FUNC-03 | **Aberto; decisões pendentes** — Alinhar critérios de conclusão, ordem/destinos e checkpoints/retomada dos jogos e tutoriais; evitar declarar conclusão prematura. Origem: Etapa 7 (`jogo-tom-semitom.html`, `jogo-figuras.html`, tutoriais, `jornada-atividades.js`). | Depende de DATA-01 e SEC-01/02 para persistência. Critério: saída antecipada, modo parcial, reload, erro de gravação e próximo destino seguem critérios pedagógicos aprovados. |
| DEC-02 | **Decisão pendente** — Decidir se `atividades-armadura.html` entra no catálogo e definir compatibilidade de conclusões legadas sem timestamp. Origem: Etapa 7. | Critério: catálogo, navegação e regra de migração/testes refletem decisão documentada; ordem sugestiva permanece não bloqueadora conforme registro. |
| FILE-01 | **Aberto; decisão pendente** — Definir armazenamento e limites de fotos em cadastro, painel e ficha; avaliar migração de Base64 para Storage. Origem: Etapas 2–4 e 9–10. | Depende de SEC-01/02. Critério: limites em bytes/MIME são aplicados antes de persistir; upload válido/inválido e acesso autorizado/negado passam em ambiente controlado. |
| FILE-02 | **Aberto; validação pendente** — Alinhar MIME/extensão ao arquivo real, confirmar bucket e CORS, aplicar limites antes de capturar/gravar áudio. Origem: Etapas 1–3, 8–9 (`RESET.HTML`, `firebase-config.js`, `CONFIGURAR_CORS.md`, áudio/Biblioteca). | Depende de SEC-01/FILE-01. Critério: MP3/MP4/Ogg suportados têm MIME/extensão coerentes e passam por upload, reprodução e download controlados; CORS não é tratado como autorização. |
| FUNC-04 | **Aberto; decisão pendente** — Normalizar alias de instrumento sem sobrescrever agrupamentos corrigidos manualmente na Biblioteca. Origem: Etapa 8. | Critério: teste de alias legado e ajuste manual confirma preservação após reprocessar/salvar. |
| OPS-01 | **Aberto; decisão e validação pendentes** — Resolver referências ausentes/relativas: `partes-desktop.css`, destino `/mnt/data/eu.png`, links de `modules/*.html` e rota de relatório; corrigir sintaxe inválida em `convites/convite.html`. Origem: Etapas 1, 8 e 11. | Confirmar intenção e URL/base antes de mudar referências. Critério: recursos necessários existem/carregam na rota real ou referências obsoletas são removidas; script passa validação sintática e fluxo controlado. |
| OPS-02 | **Aberto** — Corrigir/retirar placeholders incompatíveis e alinhar `type="module"`/imports em Biblioteca e Materiais, inclusive `bottom-nav.js`. Origem: Etapas 8 e 11 (`biblioteca-with-nav.html`, `materiais.html`, scripts associados). | Depende de OPS-01. Critério: rotas suportadas inicializam sem erro de DOM/import; rotas removidas não permanecem ligadas. |
| OPS-03 | **Aberto; decisão e validação pendentes** — Decidir identidade PWA do Coral e rever precache, cache cleanup, `cache.put` e recursos offline. Origem: Etapas 1 e 10. | Critério: teste em navegador cobre instalação, primeira carga, offline/rede fria e atualização, sem remover caches alheios; destino do manifesto Coral documentado. |
| OPS-04 | **Aberto** — Adicionar fallback para falha do `loader.js` e alinhar estado pronto a dados/tarefas críticas, sem overlay infinito. Origem: Etapa 10. | Depende de OPS-03 nas páginas instaladas. Critério: falha/atraso simulado libera a página ou mostra erro recuperável; index.html permanece sem loader se essa decisão for mantida. |
| OPS-05 | **Aberto** — Remover ID duplicado `navProfessor`, corrigir Home/estado ativo do painel Coral e expor item atual programaticamente. Origem: Etapas 10–11. | Depende de OPS-01/02. Critério: DOM sem IDs duplicados; destinos e `aria-current` correspondem às rotas, sem usar visibilidade como autorização. |
| A11Y-01 | **Aberto** — Substituir ações não nativas sem teclado; tornar uploads/switches acessíveis; associar labels e nomes; restaurar foco visível e semântica de menu/modal/loader. Origem: Etapas 10–11. | Critério: controles são localizáveis, nomeados e operáveis por teclado; teste com leitor de tela confirma função/estado e foco. |
| A11Y-02 | **Aberto; validação visual pendente** — Corrigir pares abaixo de 4,5:1 e problemas de rolagem/reflow/zoom, incluindo Materiais, convites, chamadas, professor e `ensaio2.html`. Origem: Etapa 11. | Depende de OPS-01/02. Critério: cores finais/estados calculados; conteúdo continua disponível a 320 CSS px e zoom 200%, sem bloqueio de zoom ou sobreposição crítica de teclado/safe-area. |
| A11Y-03 | **Aberto** — Respeitar `prefers-reduced-motion` e fornecer alternativa textual/dados para gráficos e partitura em canvas. Origem: Etapa 11. | Critério: modo de movimento reduzido suprime animação contínua não essencial e conteúdo equivalente é acessível sem depender do canvas. |
| VAL-01 | **Validação pendente** — Criar e executar matriz integrada para login/sessão, autorização por ID, chamada/frequência, uploads, Biblioteca, jornada, PWA/navegação e acessibilidade, após as correções correspondentes. Origem: Etapas 1–11. | Registrar ambiente, entrada, esperado, observado e evidência por teste; teste sintático isolado não fecha fluxos funcionais nem substitui Console/Emulator. |

### P3 — robustez e eficiência

| ID | Estado, pendência e origem | Dependência e critério de saída |
|---|---|---|
| FILE-03 | **Aberto; validação pendente** — Criar fallback central `url`/`storagePath` e tratar falhas parciais em upload/substituição/exclusão na Biblioteca, evitando referências inconsistentes/objetos órfãos. Origem: Etapa 8. | Depende de SEC-01 e FILE-02. Critério: URL ausente/inválida falha de modo explícito ou resolve pelo caminho previsto; testes de falha simulada não deixam objetos/referências fora da política. |
| P3-01 | **Aberto; custo não medido** — Reduzir consultas de coleções inteiras e filtrar por turma nos painéis/recálculos identificados. Origem: Etapas 3 e 5. | Segurança não pode depender de filtros cliente. Critério: equivalência funcional coberta e medição controlada registra leituras/custo/latência antes e depois. |

### Dependências para execução

1. **Segurança primeiro:** SEC-01 confirma a configuração efetiva; SEC-02 define autenticação/papéis; SEC-03/04 protegem operações e dados; SEC-05 remove sinks inseguros independentemente de a regra aberta ser confirmada.
2. **Integridade de frequência:** DATA-01 estabiliza identidade; DATA-02 normaliza contrato/IDs; DATA-03/04/05/06 protegem estado, recálculo e histórico; DATA-07 mantém o marcador Coral sem alterar a separação confirmada; FUNC-01/02 dependem desses contratos.
3. **Arquivos:** SEC-01/02, FILE-01 e FILE-02 devem alinhar Storage, bucket, permissões, limites e MIME antes de consolidar FILE-03.
4. **Experiência integrada:** OPS-01/02 resolvem rotas e carregamento; OPS-03/04/05 cobrem PWA, loader e navegação; A11Y-01/02/03 e VAL-01 só são fechados com evidência em navegador/dispositivo compatível.

**Status do backlog:** nenhum item foi marcado como corrigido nesta etapa. A conclusão do ciclo documental não certifica segurança, funcionamento ou prontidão para produção.
