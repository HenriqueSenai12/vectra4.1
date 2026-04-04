document.addEventListener('DOMContentLoaded', () => {
    // 1. SELEÇÃO DE ELEMENTOS (Ajustado para IDs comuns de Cadastro)
    const formCadastro = document.getElementById('cadastroForm');
    const senhaInput = document.getElementById('password');
    const confirmaSenhaInput = document.getElementById('confirmPassword');
    
    // Seleciona todos os ícones de "olho" (ajuste o HTML para usar essa classe)
    const toggles = document.querySelectorAll('.toggle-password');

    // ==========================================
    // 2. FUNCIONALIDADE DO ÍCONE DE OLHO (PARA 1 OU MAIS CAMPOS)
    // ==========================================
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // Encontra o input que está no mesmo wrapper que o ícone clicado
            const input = this.parentElement.querySelector('input');
            
            // Alterna o tipo
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Alterna o ícone
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // ==========================================
    // 3. VALIDAÇÃO BÁSICA DE CADASTRO
    // ==========================================
    const registerBtn = document.getElementById('registerBtn');

    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            if (senhaInput.value !== confirmaSenhaInput.value) {
                e.preventDefault();
                alert('As senhas não coincidem!');
            }
        });
    }
});
