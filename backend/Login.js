document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const togglePassword = document.getElementById('togglePassword');

  // Funcionalidade de Mostrar/Ocultar Senha (agora unificada)
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  }

  // Sistema de Login
  if (loginBtn && emailInput && passwordInput) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const senha = passwordInput.value.trim();

      if (!email || !senha) {
        alert('Preencha email e senha');
        return;
      }

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
            // Coloque aqui o caminho exato da página do operador
            window.location.href = './tela_operador/painel_operador.html';
            
          } else {
            // Se por acaso tiver outra função ou não tiver nenhuma, manda pro principal
            window.location.href = './tela_principal/painel_principal.html';
          }

        } else {
          alert('Credenciais inválidas');
        }
      } catch (err) {
        alert('Erro de conexão');
        console.error(err);
      }
    });
  }
});