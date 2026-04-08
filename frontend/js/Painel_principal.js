// 1. Configuração do Tailwind (Tem que vir primeiro)
tailwind.config = {
    theme: {
        extend: {
            colors: {
                vectra: {
                    dark: '#1E3A5F',   
                    light: '#4FA3FF',  
                    bg: '#F5F7FA'      
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], 
            }
        }
    }
}

// 2. Animações e Lógica de Interface
document.addEventListener("DOMContentLoaded", () => {
    
    // --- LÓGICA DA SIDEBAR RECOLHÍVEL (APENAS DESKTOP) ---
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');

    // Função super simples: Alterna entre a barra larga e a barra fina
    function toggleMenu() {
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('w-64'); // Remove ou adiciona a classe padrão do Tailwind
    }

    // Escuta o clique no botão hambúrguer
    if(menuBtn) menuBtn.addEventListener('click', toggleMenu);


    
    const cards = document.querySelectorAll('.vectra-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => gsap.to(card, { scale: 1.05, duration: 0.3 }));
        card.addEventListener('mouseleave', () => gsap.to(card, { scale: 1, duration: 0.3 }));
    });

    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        const icon = item.querySelector('i');
        item.addEventListener('mouseenter', () => { if(icon) gsap.to(icon, { scale: 1.2, duration: 0.2, ease: "back.out(1.7)" }); });
        item.addEventListener('mouseleave', () => { if(icon) gsap.to(icon, { scale: 1, duration: 0.2 }); });
    });
});

// Função de clique nos cards
function handleCardClick(moduleName) {
    console.log(`Navegando para: ${moduleName}`);
}
