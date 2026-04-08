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
    // 2. LÓGICA DE SALVAR NO BANCO
    // =========================================
    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const titulo = inputTitulo.value.trim();
            const categoria = selectCategoria.value;
            const descricao = textareaDescricao.value.trim();

            if (!titulo) {
                alert('Por favor, preencha o título.');
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
                    
                    // LÓGICA DO SEU GRÁFICO (MANTIDA INTACTA)
                    if (categoria.toLowerCase() === 'manutenção' || categoria.toLowerCase() === 'manutencao') {
                        let qtdManutencao = parseInt(localStorage.getItem('count_manutencao') || '0');
                        localStorage.setItem('count_manutencao', qtdManutencao + 1);
                    }

                    alert('Publicação salva com sucesso!');
                    window.location.href = 'painel_principal.html';
                } else {
                    alert('Erro ao salvar: ' + result.error);
                }
            } catch (error) {
                console.error(error);
                alert('Erro de conexão com o servidor.');
            } finally {
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
            window.location.href = 'painel_principal.html';
        });
    }
});
