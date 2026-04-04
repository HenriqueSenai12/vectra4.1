// 1. Inicializa os ícones da biblioteca Lucide
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // MENU MOBILE E TROCA DE ÍCONES (Hambúrguer / X)
    // ==========================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        // Ação ao clicar no botão de menu
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.toggle('active');
            
            // Recria a tag <i> com o ícone correto para o Lucide converter
            mobileMenuBtn.innerHTML = isOpen 
                ? '<i data-lucide="x" id="menu-icon"></i>' 
                : '<i data-lucide="menu" id="menu-icon"></i>';
            
            lucide.createIcons(); // Atualiza a biblioteca para desenhar o SVG
            
            // Pega o novo SVG gerado e faz a animação de giro do GSAP
            const newMenuIcon = document.getElementById('menu-icon');
            if (newMenuIcon) {
                gsap.fromTo(newMenuIcon, { rotate: -90 }, { rotate: 0, duration: 0.3 });
            }
        });

        // Ação para fechar o menu mobile ao clicar em algum link
        const mobileLinks = document.querySelectorAll('.mobile-link');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                
                // Volta para o ícone de hambúrguer
                mobileMenuBtn.innerHTML = '<i data-lucide="menu" id="menu-icon"></i>';
                lucide.createIcons();
            });
        });
    }

    // ==========================================
    // ANIMAÇÕES DE ROLAGEM (ScrollTrigger)
    // ==========================================
    gsap.registerPlugin(ScrollTrigger);

    // Anima todos os cabeçalhos das seções e blocos de texto
    const sectionHeaders = document.querySelectorAll('.section-header, .about-content');
    sectionHeaders.forEach(header => {
        gsap.from(header, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
                trigger: header,
                start: "top 85%", 
            }
        });
    });

    // Anima todos os "cards" (cartões) subindo um por vez
    const gridSections = ['.about-features', '.objectives-grid', '.features-grid', '.contact-grid'];
    gridSections.forEach(selector => {
        const container = document.querySelector(selector);
        if (container && container.children.length > 0) {
            gsap.from(container.children, {
                y: 50,
                opacity: 0,
                duration: 0.6,
                stagger: 0.2, 
                ease: "power2.out",
                scrollTrigger: {
                    trigger: container,
                    start: "top 85%",
                }
            });
        }
    });

    // ==========================================
    // ANIMAÇÕES DE MOUSE (Hover)
    // ==========================================
    // Aumenta os botões quando o mouse passa por cima
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            gsap.to(btn, { scale: 1.05, duration: 0.3, ease: "power1.out" });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { scale: 1, duration: 0.3, ease: "power1.out" });
        });
    });

    // Efeito de levantar os links do menu (CORRIGIDO PARA '.nav-links a')
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            gsap.to(link, { color: "#ffffff", y: -2, duration: 0.2 }); // Corrigido para branco total no hover
        });
        link.addEventListener('mouseleave', () => {
            if (!link.classList.contains('active-link')) {
                gsap.to(link, { color: "#8a8f98", y: 0, duration: 0.2 }); // Volta para o cinza do seu CSS
            }
        });
    });

    // ==========================================
    // DESTAQUE NO MENU ENQUANTO ROLA A PÁGINA
    // ==========================================
    const sections = document.querySelectorAll('section');
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // Pega a id da seção se o scroll passar dela (com margem de 200px)
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active-link');
            // Devolve a cor padrão para quem não está ativo
            gsap.to(link, { color: "#8a8f98", duration: 0.2 }); 
            
            // Se houver uma seção atual e o link bater com ela, fica branco/destacado
            if (current && link.getAttribute('href').includes(current)) {
                link.classList.add('active-link');
                gsap.to(link, { color: "#ffffff", duration: 0.2 }); 
            }
        });
    });
});