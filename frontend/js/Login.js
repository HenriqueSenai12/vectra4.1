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
  // 3. SISTEMA DE LOGIN (MANTIDO)
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
        const usersResponse = await fetch('/api/users');
        const users = await usersResponse.json();
        const user = users.find(u => u.email === email && u.senha === senha);
        
        if (user) {
          // Descobre qual é a função do usuário (admin ou operador)
          const userRole = (user.role || user.funcao).toLowerCase();

          // Salva os dados no localStorage
          localStorage.setItem('vectraUser', JSON.stringify({ 
            id: user.id, 
            nome_completo: user.name || user.nome_completo, 
            funcao: userRole 
          }));

          // CONDIÇÃO DE REDIRECIONAMENTO
          if (userRole === 'admin') {
            window.location.href = './tela_admin/painel_principal.html';
          } else if (userRole === 'operador') {
            window.location.href = './tela_operador/painel_principal.html';
          } else {
            window.location.href = './tela_principal/painel_principal.html';
          }

        } else {
          alert('Credenciais inválidas');
          // Restaura o botão
          loginBtn.innerHTML = textoOriginal;
          loginBtn.style.pointerEvents = 'auto';
        }
      } catch (err) {
        alert('Erro de conexão com o servidor');
        console.error(err);
        // Restaura o botão
        loginBtn.innerHTML = textoOriginal;
        loginBtn.style.pointerEvents = 'auto';
      }
    });
  }
});
