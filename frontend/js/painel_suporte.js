// ==========================================================================
//   SCRIPT PRINCIPAL DO FORMULÁRIO E UPLOAD (CONECTADO COM BANCO)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. SELECIONANDO TODOS OS ELEMENTOS DO HTML
    // Elementos de Upload
    const dropZone = document.getElementById('drop-zone');
    const btnUpload = document.getElementById('btn-upload');
    const fileInput = document.getElementById('file-input');
    const uploadInfo = document.getElementById('upload-info'); 
    const imagePreview = document.getElementById('image-preview');

    // Elementos do Formulário
    const btnSalvar = document.getElementById('btn-salvar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const inputTitulo = document.getElementById('input-titulo');
    const selectCategoria = document.getElementById('input-categoria');
    const textareaDescricao = document.getElementById('input-descricao');

    // Tipos de arquivos permitidos
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];

    // TRAVA DE SEGURANÇA: Só executa os eventos de arquivo se os elementos existirem
    if (dropZone && btnUpload && fileInput && uploadInfo) {

        // ==========================================
        // FUNÇÃO PRINCIPAL: PROCESSAR E VALIDAR
        // ==========================================
        const processarArquivo = (file) => {
            if (!file) return;

            // PASSO A: Validação do tipo de arquivo
            if (!allowedTypes.includes(file.type)) {
                alert('Formato inválido! Por favor, envie apenas arquivos PNG, JPG ou PDF.');
                fileInput.value = ''; // Limpa o input
                uploadInfo.textContent = 'Apenas arquivos PNG, JPG e PDF são suportados';
                uploadInfo.style.color = ''; // Reseta a cor se tiver sido alterada
                if (imagePreview) imagePreview.classList.add('hidden'); // Esconde a imagem se houver
                return; // Para a execução aqui se der erro
            }

            // PASSO B: Atualiza o texto informando o sucesso
            uploadInfo.innerHTML = `<span class="text-vectra-light font-medium">Arquivo selecionado:</span> ${file.name}`;
            
            // PASSO C: Sistema de Preview (Imagem ou PDF)
            if (imagePreview) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    
                    // Quando terminar de ler a imagem, mostra na tela
                    reader.onload = (e) => {
                        imagePreview.src = e.target.result;
                        imagePreview.classList.remove('hidden'); 
                    };
                    
                    reader.readAsDataURL(file); // Inicia a leitura
                } 
                else if (file.type === 'application/pdf') {
                    imagePreview.classList.add('hidden'); // Esconde a foto
                    uploadInfo.innerHTML += ` <br><span class="text-yellow-500">(Prévia indisponível para PDF)</span>`;
                }
            }
        };

        // ==========================================
        // EVENTOS DE CLIQUE E SELEÇÃO
        // ==========================================
        btnUpload.addEventListener('click', (e) => {
            e.preventDefault(); 
            fileInput.click();  
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                processarArquivo(e.target.files[0]);
            }
        });

        // ==========================================
        // EVENTOS DE DRAG & DROP (ARRASTAR E SOLTAR)
        // ==========================================
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            dropZone.classList.add('drag-active', 'border-vectra-light', 'bg-[#152036]'); 
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-active', 'border-vectra-light', 'bg-[#152036]');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-active', 'border-vectra-light', 'bg-[#152036]');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files; // Atualiza o input escondido
                processarArquivo(files[0]);
            }
        });
    }

    // ==========================================
    // SISTEMA DE POP-UP (TOAST NOTIFICATION)
    // ==========================================
    const mostrarNotificacao = (mensagem, tipo) => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; bottom: 30px; right: 30px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(container);
        }

        const isSuccess = tipo === 'sucesso';
        const bgColor = isSuccess ? 'bg-[#10B981]' : 'bg-[#EF4444]'; 
        const icone = isSuccess ? 'ph-check-circle' : 'ph-warning-circle';

        const toast = document.createElement('div');
        toast.className = `${bgColor} text-white px-5 py-3.5 rounded-lg shadow-2xl flex items-center gap-3 font-medium text-sm border border-white/20 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `<i class="ph-fill ${icone} text-xl"></i> ${mensagem}`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('translate-x-0', 'opacity-100');
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300); 
        }, 3500);
    };

    // ==========================================
    // FUNÇÃO PARA LIMPAR TUDO (RESET)
    // ==========================================
    const resetarFormulario = () => {
        if(inputTitulo) inputTitulo.value = '';
        if(textareaDescricao) textareaDescricao.value = '';
        if(selectCategoria) selectCategoria.selectedIndex = 0; 
        
        if(fileInput) fileInput.value = '';
        
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
        if (uploadInfo) {
            uploadInfo.innerHTML = 'Apenas arquivos PNG, JPG e PDF são suportados';
        }
    };

    // ==========================================
    // AÇÕES DOS BOTÕES SALVAR E CANCELAR
    // ==========================================
    if (btnCancelar) {
        btnCancelar.addEventListener('click', (e) => {
            e.preventDefault();
            resetarFormulario();
            
            // Mostra o aviso na tela usando o seu sistema de notificações
            mostrarNotificacao('Ação cancelada! Retornando ao painel...', 'erro'); 
            
            // Aguarda 1.5 segundos para o usuário ler a mensagem, e então redireciona
            setTimeout(() => {
                window.location.href = 'tela_principal.html'; 
            }, 1500);
        });
    }

    if (btnSalvar) {
        // Transformamos a função em ASYNC para poder aguardar o envio ao backend
        btnSalvar.addEventListener('click', async (e) => {
            e.preventDefault();

            // Captura de valores atuais
            const tituloVal = inputTitulo ? inputTitulo.value.trim() : '';
            const descricaoVal = textareaDescricao ? textareaDescricao.value.trim() : '';
            const categoriaVal = selectCategoria ? selectCategoria.value : '';

            const tituloPreenchido = tituloVal !== '';
            const categoriaPreenchida = categoriaVal !== 'Sem categoria' && categoriaVal !== '';
            
            // Exigindo apenas Título e Categoria. A imagem é opcional.
            if (tituloPreenchido && categoriaPreenchida) {
                
                // 1. Feedback visual de carregamento no botão
                const textoOriginalBotao = btnSalvar.innerHTML;
                btnSalvar.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Salvando...`;
                btnSalvar.disabled = true;

                // 2. Criar pacote de dados (FormData)
                const formData = new FormData();
                formData.append('titulo', tituloVal);
                formData.append('categoria', categoriaVal);
                formData.append('descricao', descricaoVal);
                
                // Adicione o ID do usuário que está logado (Aqui usamos 1 como exemplo)
                formData.append('usuario_id', 1); 

                // Se houver um arquivo anexado, adiciona no pacote. Se não houver, o fetch continua normalmente.
                if (fileInput && fileInput.files.length > 0) {
                    formData.append('arquivo', fileInput.files[0]);
                }

                // 3. Enviar para a sua API Back-end
               // ... código anterior de preparar os dados ...
try {
    const response = await fetch('http://localhost:3300/api/publicacoes', {
        method: 'POST',
        body: formData
    });

    // 👇 VOCÊ VAI SUBSTITUIR ESTA PARTE 👇
    if (response.ok) {
        // --- INÍCIO DO REGISTRO PARA O GRÁFICO (PROTÓTIPO) ---
        // Verifica se a categoria escolhida foi manutenção
        if (categoriaVal === 'manutencao' || categoriaVal === 'Manutenção') {
            let qtdManutencao = parseInt(localStorage.getItem('count_manutencao') || '0');
            localStorage.setItem('count_manutencao', qtdManutencao + 1);
        }
        // --- FIM DO REGISTRO ---

        resetarFormulario(); 
        mostrarNotificacao('Salvo! Retornando ao painel...', 'sucesso'); 
        
        setTimeout(() => {
            window.location.href = 'painel_principal.html'; 
        }, 1500);
    } else {
        mostrarNotificacao('Erro ao salvar no servidor.', 'erro'); 
    }
    // 👆 ATÉ AQUI 👆

} catch (error) {
// ... resto do código ...                } catch (error) {
                    console.error('Erro na conexão:', error);
                    mostrarNotificacao('Erro de rede: Não foi possível conectar ao servidor.', 'erro');
                } finally {
                    // 4. Restaura o botão ao normal
                    btnSalvar.innerHTML = textoOriginalBotao;
                    btnSalvar.disabled = false;
                }

            } else {
                mostrarNotificacao('Por favor, preencha todos os campos obrigatórios (Título e Categoria).', 'erro'); 
            }
        });
    }
});