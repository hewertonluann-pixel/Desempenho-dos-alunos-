// convite.js

document.addEventListener('DOMContentLoaded', () => {
    const introScreen = document.getElementById('introScreen');
    const conviteScreen = document.getElementById('conviteScreen');
    const btnAbrirConvite = document.getElementById('btnAbrirConvite');
    const nomeConvidadoSpan = document.getElementById('nomeConvidado');
    const btnSim = document.getElementById('btnSim');
    const btnNao = document.getElementById('btnNao');
    const botoesConfirmacao = document.getElementById('botoesConfirmacao');
    const mensagemResposta = document.getElementById('mensagemResposta');
    const notesContainer = document.querySelector('.notes-container');

    // 1. Lógica de Personalização por URL
    function getNomeConvidado() {
        const urlParams = new URLSearchParams(window.location.search);
        let nome = urlParams.get('nome');
        
        // Decodifica o nome (se vier com espaços codificados, etc.)
        if (nome) {
            nome = decodeURIComponent(nome);
        }
        
        // Retorna o nome ou um valor padrão
        return nome || "Prezado Convidado";
    }

    // 2. Transição de Telas
    function abrirConvite() {
        // Esconde a tela de introdução
        introScreen.classList.remove('active');
        
        // Exibe a tela do convite
        conviteScreen.classList.add('active');

        // Personaliza o nome
        nomeConvidadoSpan.textContent = getNomeConvidado();

        // Inicia o efeito das notas musicais
        iniciarNotasMusicais();
    }

    btnAbrirConvite.addEventListener('click', abrirConvite);

    // 3. Lógica dos Botões de Confirmação
    function exibirResposta(mensagem, tipo) {
        botoesConfirmacao.style.display = 'none';
        mensagemResposta.textContent = mensagem;
        mensagemResposta.className = `mensagem-resposta ${tipo}`;
        mensagemResposta.style.display = 'block';
    }

    btnSim.addEventListener('click', () => {
        exibirResposta('✨ Será uma honra receber você!', 'success');
        // Futuramente: enviar confirmação para o banco de dados
    });

    btnNao.addEventListener('click', () => {
        exibirResposta('⚠️ Esta opção foi desabilitada pelo administrador!', 'warning');
    });

    // 4. Efeito Visual das Notas Musicais
    const notas = ['♪', '♫', '♩', '♬', '𝄞', '𝄢'];

    function iniciarNotasMusicais() {
        for (let i = 0; i < 20; i++) {
            criarNota();
        }
    }

    function criarNota() {
        const nota = document.createElement('div');
        nota.classList.add('note');
        nota.textContent = notas[Math.floor(Math.random() * notas.length)];
        
        // Posição inicial aleatória
        nota.style.left = `${Math.random() * 100}vw`;
        
        // Atraso de animação para que não comecem todas juntas
        nota.style.animationDelay = `${Math.random() * 10}s`;
        
        // Duração da animação
        nota.style.animationDuration = `${10 + Math.random() * 5}s`;

        notesContainer.appendChild(nota);
    }

    // Inicializa a tela de introdução como ativa
    introScreen.classList.add('active');
});
