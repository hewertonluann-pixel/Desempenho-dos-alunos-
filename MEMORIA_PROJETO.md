# 📱 Memória do Projeto — Desempenho dos Alunos

> **Repositório:** https://github.com/hewertonluann-pixel/Desempenho-dos-alunos-
> **Última leitura do repositório:** Junho/2026
> **Stack:** HTML + CSS + JavaScript (Vanilla) · Firebase Firestore + Auth · Firebase Hosting

---

## 1. Visão Geral

Aplicação web progressiva (PWA) voltada para **escolas de música**, especificamente orquestras e grupos de alunos. O sistema registra e acompanha o desempenho individual e coletivo de estudantes de música, cobrindo frequência, notas, lições, conquistas, nível técnico e comunicação entre aluno e professor.

O projeto tem **dois perfis de acesso principais**:

| Perfil | Tela de entrada | Permissões |
|---|---|---|
| **Aluno** | `aluno.html` | Visualiza próprio painel, envia lições, acessa biblioteca e atividades |
| **Professor** | `professor.html` | Gerencia alunos, registra chamadas, lança notas, acessa dashboard da turma |

---

## 2. Tecnologias e Infraestrutura

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES Modules) |
| Banco de dados | Firebase Firestore (NoSQL, tempo real) |
| Autenticação | Firebase Authentication (email/senha) |
| Hospedagem | Firebase Hosting |
| Gráficos | Chart.js (via CDN `cdn.jsdelivr.net`) |
| Ícones | Font Awesome 6.5.1 |
| Fonte | Google Fonts — Inter |
| CORS | Configurado via `cors.json` + `CONFIGURAR_CORS.md` |

---

## 3. Estrutura de Arquivos

### 3.1 Arquivos Principais

| Arquivo | Função |
|---|---|
| `aluno.html` / `aluno.js` / `aluno.css` | Painel principal do aluno |
| `aluno3.js` | Módulo principal de carregamento de dados do aluno (Firebase) |
| `professor.html` | Painel principal do professor |
| `dashboard-turma.html` | Dashboard coletivo da turma com gráficos |
| `cadastro.html` | Cadastro de novos alunos |
| `firebase-config.js` | Configuração da conexão com Firebase |
| `auth.js` | Controle de autenticação e redirecionamento |

### 3.2 Funcionalidades por Arquivo

| Arquivo | Funcionalidade |
|---|---|
| `frequencia.js` | Lógica de frequência, chamada e grade anual |
| `exportar-chamada.js` | Exportação de chamada (PDF/planilha) |
| `corrigir-chamadas.html` | Correção de chamadas retroativas |
| `conquistas.js` | Sistema de conquistas/achievements |
| `licoes.js` | Envio e listagem de lições pelos alunos |
| `notificacoes.js` | Atividades recentes e notificações |
| `evolucao.js` / `evolucao-teste.js` | Rastreamento de evolução técnica |
| `grafico-evolucao.js` | Renderização dos gráficos de evolução via Chart.js |
| `configuracoes.html` / `.js` / `.css` | Configurações do perfil do aluno |
| `configuracoes-grupo.html` | Configurações por grupo/turma |
| `ficha-aluno.html` / `.js` | Ficha técnica individual do aluno (visão professor) |
| `ensaio.html` / `ensaio2.html` | Registro e controle de ensaios |
| `atividades.html` | Lista de atividades do aluno |
| `atividades-notas.html` | Notas por atividade |
| `atividades-armadura.html` | Atividades de armadura de clave |
| `biblioteca.html` / `biblioteca-with-nav.html` | Acervo de partituras e materiais |
| `painel-social.html` | Comunidade / feed social entre alunos |
| `manual.html` | Manual do sistema (conquistas, funcionamento) |
| `como-funciona-pauta.html` | Explicação do sistema de pautas/notas |
| `escada-notas.html` | Progressão de notas em formato de escada |
| `gerenciar-eventos.html` | Gerenciamento de eventos/concertos |
| `convite-orquestra.html` / `-compacto.html` | Geração de convites para eventos |
| `apresentacao.html` | Tela de apresentação/landing do app |
| `download.html` | Página para download/instalação do PWA |
| `dashboard-professor.js` | Dados e lógica do painel do professor |
| `bottom-nav.js` / `bottom-nav.css` | Barra de navegação inferior (mobile) |
| `RESET.HTML` | Tela de reset de senha |
| `404.html` | Página de erro personalizada |
| `cors.json` / `CONFIGURAR_CORS.md` | Configuração de CORS no Firebase Storage |

### 3.3 Diretórios

| Diretório | Conteúdo |
|---|---|
| `convites/` | Templates de convites para eventos da orquestra |
| `js/` | Scripts auxiliares (ex: `recorder.js` para gravação de áudio) |

### 3.4 Jogos Educativos

| Arquivo | Conteúdo |
|---|---|
| `compassos-game.html` | Jogo de compassos musicais |
| `escalas-game.html` | Jogo de escalas musicais |
| `figuras-musicais.html` | Conteúdo interativo sobre figuras musicais |

---

## 4. Funcionalidades Detalhadas

### 4.1 Painel do Aluno (`aluno.html`)

A tela central do aluno exibe, em formato de cards verticais:

**Comprometimento**
- Dois indicadores visuais estilo cápsula: **Geral (anual)** e **Mensal**
- Calculados com base nas presenças registradas pelo professor
- Exibem porcentagem com barra de progresso colorida (azul = geral, verde = mensal)

**Atividades Recentes (Notificações)**
- Feed de eventos recentes do aluno: novas notas lançadas, lições avaliadas, conquistas desbloqueadas
- Gerado dinamicamente pelo módulo `notificacoes.js`

**Frequência Anual**
- Grade visual com todos os meses do ano
- Navegação entre anos (`mudarAno(-1)` / `mudarAno(1)`)
- Cada célula representa uma aula: presença (verde), falta (vermelho), aula futura (cinza)
- Popup de detalhes ao clicar em uma data

**Conquistas**
- Grid de badges/achievements desbloqueados e bloqueados
- Popup com nome, descrição, condição de obtenção e barra de progresso
- Sistema multi-nível (ex: Nível 1, 2, 3...)

**Lições Enviadas**
- Lista de lições já submetidas
- Botão para enviar nova lição (abre modal)
- Cada lição pode incluir gravação de áudio (`js/recorder.js`)

**Evolução Técnica**
- Gráfico de linha (Chart.js) exibindo a progressão do nível técnico ao longo do tempo
- Separa leitura musical e método instrumental

**Sidebar (Desktop) / Bottom Nav (Mobile)**
- Foto do aluno (editável via upload)
- Nome, instrumento, nível geral, nível de leitura, nível de método
- Links rápidos: Comunidade, Biblioteca, Atividades
- Botão "Modo Professor" (visível apenas para usuários com permissão de professor)

---

### 4.2 Perfil do Aluno — Dados Armazenados no Firestore

Cada documento de aluno contém (inferido do código):

- `nome` — nome completo
- `instrumento` — instrumento tocado
- `nivelGeral`, `nivelLeitura`, `nivelMetodo` — níveis técnicos numéricos
- `nomeMetodoLeitura`, `nomeMetodoInstrumental` — nome do método em uso
- `foto` — URL da foto de perfil
- `frequencias` — mapa de datas com status (presente/ausente)
- `conquistas` — lista de achievements desbloqueados
- `licoes` — lista de lições enviadas e avaliações
- `evolucao` — histórico de níveis para gráfico

---

### 4.3 Painel do Professor

- Acesso via `professor.html` ou botão "Modo Professor" no painel do aluno
- Funcionalidades: registrar chamada, lançar notas, visualizar ficha do aluno, gerenciar eventos
- Dashboard coletivo (`dashboard-turma.html`) com gráficos da turma inteira

---

### 4.4 Sistema de Frequência

- Registro de chamada feito pelo professor em `ensaio.html` / `ensaio2.html`
- Correção de chamadas retroativas em `corrigir-chamadas.html`
- Exportação de chamada em `exportar-chamada.js` (PDF/planilha)
- Cálculo de comprometimento: `presenças / total de aulas × 100`

---

### 4.5 Sistema de Notas e Atividades

- Notas lançadas por atividade (`atividades-notas.html`)
- Progressão visual em `escada-notas.html` e `como-funciona-pauta.html`
- Atividades específicas de teoria musical: armadura de clave (`atividades-armadura.html`)

---

### 4.6 Biblioteca

- Acervo de materiais e partituras (`biblioteca.html`)
- Versão com navegação integrada (`biblioteca-with-nav.html`)

---

### 4.7 Comunidade / Painel Social

- Feed de atividades e conquistas da turma (`painel-social.html`)
- Interação entre alunos e professores

---

### 4.8 Jogos Educativos

- **Compassos** (`compassos-game.html`): exercício interativo sobre leitura de compassos
- **Escalas** (`escalas-game.html`): identificação de escalas musicais
- **Figuras musicais** (`figuras-musicais.html`): conteúdo sobre duração das notas

---

### 4.9 Eventos e Convites

- Gerenciamento de concertos e apresentações (`gerenciar-eventos.html`)
- Geração de convites visuais (`convite-orquestra.html`, `convite-orquestra-compacto.html`)
- Templates adicionais em `/convites`

---

### 4.10 Autenticação

- Login via Firebase Authentication (email + senha)
- `auth.js` controla redirecionamento baseado no perfil (aluno × professor)
- Reset de senha via `RESET.HTML`
- Configuração de nova senha dentro do painel (`configuracoes.html`)

---

## 5. Navegação Mobile

A barra inferior (`bottom-nav`) é exibida apenas em dispositivos móveis e contém:

- 🏠 Home → `aluno.html`
- 👥 Comunidade → `painel-social.html`
- 📚 Biblioteca → `biblioteca.html`
- 📋 Atividades → `atividades.html`
- 👨‍🏫 Professor → `professor.html` *(visível apenas para professores)*

---

## 6. Firebase — Estrutura e Configuração

| Serviço Firebase | Uso |
|---|---|
| **Firestore** | Banco de dados principal (alunos, chamadas, notas, conquistas) |
| **Authentication** | Login e controle de sessão |
| **Hosting** | Deploy do app (configurado via `firebase.json` e `.firebaserc`) |
| **Storage** | Upload de fotos de perfil e arquivos de lições |

**CORS** está configurado via `cors.json` para permitir acesso ao Storage a partir do domínio do Hosting. O arquivo `CONFIGURAR_CORS.md` documenta o passo a passo da configuração.

---

## 7. PWA / App

- O projeto tem características de PWA (Progressive Web App)
- Página `download.html` orienta o usuário a instalar o app na tela inicial
- `favicon.svg` usado como ícone do app
- Loader animado com emoji musical e versículo bíblico exibido durante carregamento

---

## 8. Pontos de Atenção para Desenvolvimento Futuro

- `aluno3.js` é o arquivo central de carregamento de dados — qualquer alteração nos dados do aluno passa por aqui
- `debug-aluno.js` existe para depuração — não deve ser incluído em produção
- `evolucao-teste.js` parece ser versão de teste de `evolucao.js` — avaliar se pode ser removido
- Arquivos CSS estão separados por módulo (`aluno.css`, `bottom-nav.css`, `configuracoes.css`) — manter padrão
- O projeto usa ES Modules (`type="module"`) nos scripts principais — importações devem seguir o padrão

---

## 9. Fluxo Geral de Uso

```
Acesso → Login (auth.js)
         ├── Aluno → aluno.html
         │     ├── Ver frequência, conquistas, lições, evolução
         │     ├── Enviar lição (modal + gravação de áudio)
         │     ├── Acessar biblioteca, atividades, comunidade
         │     └── [Se professor] → professor.html
         │
         └── Professor → professor.html
               ├── Registrar chamada (ensaio.html)
               ├── Corrigir chamadas (corrigir-chamadas.html)
               ├── Lançar notas (atividades-notas.html)
               ├── Ver ficha do aluno (ficha-aluno.html)
               ├── Dashboard da turma (dashboard-turma.html)
               └── Gerenciar eventos (gerenciar-eventos.html)
```

---

*Documento gerado em 10/06/2026 — baseado na leitura completa do repositório GitHub.*
