document.addEventListener('DOMContentLoaded', () => {
    // Selecionando os elementos do DOM
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#password');

    // Funcionalidade de Mostrar/Ocultar Senha
    if (togglePassword && password) {
        togglePassword.addEventListener('click', function () {
            // Alterna o tipo do input entre 'password' e 'text'
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);

            // Alterna o ícone (olho aberto / olho fechado)
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});


