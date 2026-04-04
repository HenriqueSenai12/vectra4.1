// ==========================================================================
//   SCRIPT PRINCIPAL DO FORMULÁRIO E UPLOAD (UNIFICADO)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. SELECIONANDO TODOS OS ELEMENTOS DO HTML
    // Elementos de Upload
    const dropZone = document.getElementById('drop-zone');
    const btnUpload = document.getElementById('btn-upload');
    const fileInput = document.getElementById('file-input');
    const uploadInfo = document.getElementById('upload-info'); // Unifiquei textInfo e uploadInfo
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
            // Adiciona destaque visual combinando suas duas ideias originais
            dropZone.classList.add('drag-active', 'border-vectra-light', 'bg-[#152036]'); 
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // Remove destaque visual
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
            mostrarNotificacao('Ação cancelada. Formulário limpo.', 'erro'); 
        });
    }

    if (btnSalvar) {
        btnSalvar.addEventListener('click', (e) => {
            e.preventDefault();

            const tituloPreenchido = inputTitulo && inputTitulo.value.trim() !== '';
            const descricaoPreenchida = textareaDescricao && textareaDescricao.value.trim() !== '';
            const categoriaPreenchida = selectCategoria && selectCategoria.value !== 'Sem categoria' && selectCategoria.value !== '';
            
            if (tituloPreenchido && descricaoPreenchida && categoriaPreenchida) {
                resetarFormulario(); 
                mostrarNotificacao('Publicação salva com sucesso!', 'sucesso'); 
            } else {
                mostrarNotificacao('Por favor, preencha todos os campos obrigatórios.', 'erro'); 
            }
        });
    }
});