document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR DADOS E VERIFICAR LOGIN
    const userString = localStorage.getItem('vectraUser');
    const storedUser = userString ? JSON.parse(userString) : null;

    // CORRIGIDO: Agora ele verifica storedUser.nome
    if (!storedUser || !storedUser.nome) {
        // Se a sua tela de login se chama index.html e está na pasta raiz, o caminho absoluto é mais seguro:
        window.location.href = '/'; 
        return; 
    }

    // 2. ATUALIZAR SAUDAÇÃO E NOME
    const greetingElement = document.querySelector('header h1');
    if (greetingElement) {
        const horaAtual = new Date().getHours();
        let saudacao = 'Bom dia';
        if (horaAtual >= 12 && horaAtual < 18) saudacao = 'Boa tarde';
        else if (horaAtual >= 18) saudacao = 'Boa noite';

        // CORRIGIDO: Usa storedUser.nome
        const primeiroNome = storedUser.nome.split(' ')[0];
        // Atualiza o texto inteiro para todos (Administrador ou Operador)
        greetingElement.textContent = `${saudacao}, ${primeiroNome}!`;
    }

    // 3. ATUALIZAR AVATAR EM QUALQUER TELA
    const userAvatarHeader = document.getElementById('userAvatarHeader') || document.getElementById('user-avatar');
    if (userAvatarHeader) {
        // CORRIGIDO: Usa storedUser.nome
        userAvatarHeader.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedUser.nome)}&background=4FA3FF&color=fff&bold=true`;
        const cargoTexto = storedUser.funcao === 'admin' ? 'Administrador' : 'Operador';
        userAvatarHeader.title = cargoTexto;
    }

    // 4. LÓGICA DE LOGOUT
    // Procura qualquer link que vá para a tela de login (ou index)
    const botoesSair = document.querySelectorAll('.sidebar-item[href*="login"], .sidebar-item[href*="index"]'); 
    botoesSair.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.removeItem('vectraUser');
        });
    });

    // 5. ANIMAÇÃO DO MENU LATERAL (MANTIDO)
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');

    let isCollapsed = false;
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                sidebar.classList.add('is-collapsed');
                if(typeof gsap !== 'undefined') {
                    gsap.to(sidebarTexts, { 
                        opacity: 0, x: -10, duration: 0.2, stagger: 0.02, ease: "power1.inOut", 
                        onComplete: () => sidebarTexts.forEach(t => t.style.display = 'none') 
                    });
                    gsap.to(sidebar, { width: "80px", duration: 0.4, ease: "power2.inOut", delay: 0.1 });
                }
            } else {
                sidebar.classList.remove('is-collapsed');
                sidebarTexts.forEach(t => t.style.display = '');
                if(typeof gsap !== 'undefined') {
                    gsap.to(sidebar, { width: "16rem", duration: 0.4, ease: "power2.inOut" });
                    gsap.to(sidebarTexts, { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: "power2.out", delay: 0.2 });
                }
            }
        });
    }
});
