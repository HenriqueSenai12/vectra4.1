document.addEventListener('DOMContentLoaded', () => {
  // 1. SELEÇÃO DE ELEMENTOS
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const togglePassword = document.getElementById('togglePassword');

  // ==========================================
  // 2. FUNCIONALIDADE DO ÍCONE DE OLHO (CORRIGIDA)
  // ==========================================
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      // Alterna o tipo do input entre 'password' e 'text'
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Alterna os ícones do FontAwesome (Olho aberto / Olho cortado)
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  }

  // ==========================================
  // 3. SISTEMA DE LOGIN
  // ==========================================
  if (loginBtn && emailInput && passwordInput) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault(); // Impede que o link <a href="#"> recarregue a página
      
      const email = emailInput.value.trim();
      const senha = passwordInput.value.trim();

      if (!email || !senha) {
        alert('Preencha email e senha');
        return;
      }

      // Muda o texto do botão pra mostrar que está carregando
      const textoOriginal = loginBtn.innerHTML;
      loginBtn.innerHTML = 'Aguarde...';
      loginBtn.style.pointerEvents = 'none';

      try {
        // 1. Envia os dados para a rota de login
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });

        const result = await response.json();

        if (result.success) {
          const user = result.user; // O servidor devolve nome e funcao

          // 2. SALVA OS DADOS NO LOCALSTORAGE (Agora incluindo o email!)
          localStorage.setItem('vectraUser', JSON.stringify({ 
            nome: user.nome, 
            funcao: user.funcao,
            email: email // Pega o email que o usuário acabou de digitar
          }));

          // 3. REDIRECIONA BASEADO NA FUNÇÃO
          if (user.funcao === 'admin') {
              window.location.href = '/frontend/tela_admin/painel_principal.html';
          } else {
              window.location.href = '/frontend/tela_operador/painel_principal.html';
          }

        } else {
          // Se o servidor responder que os dados estão errados (O Famoso erro 401)
          alert(result.message || 'Credenciais inválidas');
          loginBtn.innerHTML = textoOriginal;
          loginBtn.style.pointerEvents = 'auto';
        }
      } catch (err) {
        // Erro de conexão
        alert('Erro de conexão com o servidor');
        console.error(err);
        loginBtn.innerHTML = textoOriginal;
        loginBtn.style.pointerEvents = 'auto';
      }

    });
  }
});