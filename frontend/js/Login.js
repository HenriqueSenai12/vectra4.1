Document.addEventListener('DOMContentLoaded', () => {
  // 1. SELEÇÃO DE ELEMENTOS
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const togglePassword = document.getElementById('togglePassword');

  // ==========================================
  // 2. FUNCIONALIDADE DO ÍCONE DE OLHO
  // ==========================================
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  }

  // ==========================================
  // 3. FUNÇÃO PRINCIPAL DE LOGIN (Extraída para ser reutilizada)
  // ==========================================
  async function executarLogin() {
    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if (!email || !senha) {
      alert('Preencha email e senha');
      return;
    }

    const textoOriginal = loginBtn.innerHTML;
    loginBtn.innerHTML = 'Aguarde...';
    loginBtn.style.pointerEvents = 'none';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const result = await response.json();

      if (result.success) {
        const user = result.user;
        localStorage.setItem('vectraUser', JSON.stringify({ 
          nome: user.nome, 
          funcao: user.funcao,
          email: email 
        }));

        if (user.funcao === 'admin') {
            window.location.href = '/frontend/tela_admin/painel_principal.html';
        } else {
            window.location.href = '/frontend/tela_operador/painel_principal.html';
        }

      } else {
        alert(result.message || 'Credenciais inválidas');
        loginBtn.innerHTML = textoOriginal;
        loginBtn.style.pointerEvents = 'auto';
      }
    } catch (err) {
      alert('Erro de conexão com o servidor');
      console.error(err);
      loginBtn.innerHTML = textoOriginal;
      loginBtn.style.pointerEvents = 'auto';
    }
  }

  // ==========================================
  // 4. EVENTOS (CLIQUE E ENTER)
  // ==========================================
  if (loginBtn && emailInput && passwordInput) {
    
    // Evento de Clique no Botão
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executarLogin();
    });

    // Evento de Tecla Enter no campo de E-mail
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        passwordInput.focus(); // Se der enter no email, pula para a senha
      }
    });

    // Evento de Tecla Enter no campo de Senha
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executarLogin(); // Se der enter na senha, tenta logar
      }
    });
  }
});
