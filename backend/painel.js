document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Puxa a quantidade de manutenções salvas no formulário
    let totalManutencao = parseInt(localStorage.getItem('count_manutencao') || '0');
    
    // (Opcional) Puxar outras categorias se você quiser colocar no gráfico depois
    // let totalInstalacao = parseInt(localStorage.getItem('count_instalacao') || '0');

    console.log("Total de manutenções para o gráfico: ", totalManutencao);

    // 2. Aqui você configura o seu gráfico usando a variável totalManutencao
    // Exemplo fictício se você usar Chart.js:
    /*
    const ctx = document.getElementById('meuGraficoDeRosca').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Manutenção', 'Outros'],
            datasets: [{
                data: [totalManutencao, 5], // <--- A variável entra aqui!
                backgroundColor: ['#4FA3FF', '#152036']
            }]
        }
    });
    */
});


document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR DADOS E VERIFICAR LOGIN
    const storedUser = JSON.parse(localStorage.getItem('vectraUser'));

    if (!storedUser || !storedUser.nome_completo) {
        window.location.href = '../login.html'; 
        return; 
    }

    // 2. ATUALIZAR SAUDAÇÃO E NOME (Só vai executar se a tela tiver esse título)
    const greetingElement = document.querySelector('header h1.text-2xl');
    if (greetingElement && greetingElement.textContent.includes('Operador')) {
        const horaAtual = new Date().getHours();
        let saudacao = 'Bom dia';
        if (horaAtual >= 12 && horaAtual < 18) saudacao = 'Boa tarde';
        else if (horaAtual >= 18) saudacao = 'Boa noite';

        const primeiroNome = storedUser.nome_completo.split(' ')[0];
        greetingElement.textContent = `${saudacao}, ${primeiroNome}!`;
    }

    // 3. ATUALIZAR AVATAR EM QUALQUER TELA
    const userAvatarHeader = document.getElementById('userAvatarHeader') || document.getElementById('user-avatar');
    if (userAvatarHeader) {
        userAvatarHeader.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedUser.nome_completo)}&background=4FA3FF&color=fff&bold=true`;
        const cargoTexto = storedUser.funcao === 'admin' ? 'Administrador' : 'Operador';
        userAvatarHeader.title = cargoTexto;
    }

    // 4. LÓGICA DE LOGOUT
    // Procura qualquer link que vá para a tela de login para funcionar como botão de sair
    const botoesSair = document.querySelectorAll('a[href*="login.html"]'); 
    botoesSair.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.removeItem('vectraUser');
        });
    });

    // 5. ANIMAÇÃO DO MENU LATERAL
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
