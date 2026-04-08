document.addEventListener('DOMContentLoaded', () => {
    
    // Elementos do Formulário
    const btnSalvar = document.getElementById('btn-salvar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const inputTitulo = document.getElementById('input-titulo');
    const selectCategoria = document.getElementById('input-categoria');
    const textareaDescricao = document.getElementById('input-descricao');

    // Elementos de Imagem (Visual)
    const dropZone = document.getElementById('drop-zone');
    const btnUpload = document.getElementById('btn-upload');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');

    // =========================================
    // FUNÇÃO DE ALERTA BONITO (TOAST)
    // =========================================
    function showToast(message, type = 'success') {
        const existingToast = document.getElementById('vectra-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.id = 'vectra-toast';
        // Cores baseadas no tipo: Sucesso (Verde), Erro (Vermelho) ou Info/Cancelar (Azul)
        toast.className = 'fixed top-4 right-4 z-[10000] p-4 rounded-xl shadow-2xl border max-w-md font-medium flex items-center gap-2 transition-all duration-300 ' +
            (type === 'success' ? 'bg-green-500/20 backdrop-blur-md border-green-400/50 text-green-100' : 
             type === 'error' ? 'bg-red-500/20 backdrop-blur-md border-red-400/50 text-red-100' : 
             'bg-blue-500/20 backdrop-blur-md border-blue-400/50 text-blue-100'); 
        
        let icon = type === 'success' ? 'ph-check-circle' : type === 'error' ? 'ph-warning-circle' : 'ph-info';
        
        toast.innerHTML = `<i class="ph ${icon} text-xl flex-shrink-0"></i><span>${message}</span>`;
        document.body.appendChild(toast);
        
        // Remove automaticamente se a página não mudar
        setTimeout(() => {
            if(toast) toast.style.opacity = '0';
            setTimeout(() => { if(toast) toast.remove() }, 300);
        }, 3000);
    }

    // =========================================
    // 1. LÓGICA DE VISUALIZAÇÃO DA IMAGEM
    // =========================================
    if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // =========================================
    // 2. LÓGICA DE SALVAR NO BANCO (COM VALIDAÇÃO)
    // =========================================
    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const titulo = inputTitulo.value.trim();
            const categoria = selectCategoria.value; // Pega o valor do Select
            const descricao = textareaDescricao.value.trim();

            // VALIDAÇÃO: Verifica Título
            if (!titulo) {
                showToast('Por favor, preencha o título antes de salvar.', 'error');
                return;
            }

            // VALIDAÇÃO: Verifica Categoria (Não permite "Sem categoria")
            if (categoria === "Sem categoria" || !categoria) {
                showToast('Por favor, selecione uma categoria válida.', 'error');
                return;
            }

            const textoOriginal = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Salvando...';
            btnSalvar.disabled = true;

            try {
                // Envia os dados para o server.js
                const response = await fetch('/api/publicacoes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, categoria, descricao })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    
                    // LÓGICA DO SEU GRÁFICO 
                    if (categoria.toLowerCase() === 'manutenção' || categoria.toLowerCase() === 'manutencao') {
                        let qtdManutencao = parseInt(localStorage.getItem('count_manutencao') || '0');
                        localStorage.setItem('count_manutencao', qtdManutencao + 1);
                    }

                    showToast('Publicação salva com sucesso!', 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'painel_principal.html';
                    }, 1500);

                } else {
                    showToast('Erro ao salvar: ' + result.error, 'error');
                    btnSalvar.innerHTML = textoOriginal;
                    btnSalvar.disabled = false;
                }
            } catch (error) {
                console.error(error);
                showToast('Erro de conexão com o servidor.', 'error');
                btnSalvar.innerHTML = textoOriginal;
                btnSalvar.disabled = false;
            }
        });
    }


    // =========================================
    // 3. BOTÃO CANCELAR
    // =========================================
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            // 1. Mostra o alerta azul (info)
            showToast('Operação cancelada. Voltando...', 'info');
            
            // 2. Espera 1 segundo e volta para o painel principal
            setTimeout(() => {
                window.location.href = 'painel_principal.html';
            }, 1000);
        });
    }
});
