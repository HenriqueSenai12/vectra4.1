document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 JS Externo Carregado com sucesso!");

    // ==========================================
    // 1. ANIMAÇÃO DO MENU LATERAL (SIDEBAR)
    // ==========================================
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    let isCollapsed = false;

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            
            const timeline = gsap.timeline({
                onComplete: () => {
                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'));
                    }, 50);
                }
            });

            if (isCollapsed) {
                sidebar.classList.add('is-collapsed');
                timeline.to(sidebar, { width: "80px", duration: 0.4, ease: "power2.inOut" })
                        .to(sidebarTexts, { opacity: 0, duration: 0.2, onComplete: () => sidebarTexts.forEach(t => t.style.display = 'none') }, 0);
            } else {
                sidebar.classList.remove('is-collapsed');
                sidebarTexts.forEach(t => t.style.display = 'block');
                timeline.to(sidebar, { width: "16rem", duration: 0.4, ease: "power2.inOut" })
                        .to(sidebarTexts, { opacity: 1, duration: 0.3 }, 0.2);
            }
        });
    }

    // ==========================================
    // 2. RENDERIZAÇÃO INICIAL DOS GRÁFICOS (APEXCHARTS)
    // ==========================================
    let chartLine, chartDonut, chartBarHorizontal;

    if (typeof ApexCharts !== 'undefined') {
        console.log("🟡 Iniciando gráficos...");

        const themeColors = { cyan: '#06b6d4', green: '#22c55e', red: '#f87171', yellow: '#eab308', grid: '#1e293b', text: '#94a3b8' };
        
        const baseOptions = {
            chart: { fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent' },
            grid: { borderColor: themeColors.grid, strokeDashArray: 3, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            dataLabels: { enabled: false }
        };

        // Gráfico 1: Linhas Duplas (Semanal)
        if (document.querySelector("#line-chart")) {
            chartLine = new ApexCharts(document.querySelector("#line-chart"), {
                ...baseOptions,
                series: [{ name: 'Inicializado', data: [] }, { name: 'Parada de Emergência', data: [] }], 
                chart: { type: 'line', height: '100%', width: '100%', parentHeightOffset: 0, dropShadow: { enabled: true, color: '#000', top: 10, left: 0, blur: 5, opacity: 0.2 } },
                colors: [themeColors.cyan, themeColors.red],
                stroke: { curve: 'straight', width: 3 },
                markers: { size: 5, colors: ['#0f172a'], strokeColors: [themeColors.cyan, themeColors.red], strokeWidth: 2, hover: { size: 7 } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: themeColors.text } } },
                legend: { show: true, position: 'bottom', labels: { colors: themeColors.text }, markers: { radius: 12 } },
                tooltip: { theme: 'dark', shared: true, intersect: false }
            });
            chartLine.render();
        }

        // Gráfico 2: Donut (Status Geral)
        if (document.querySelector("#donut-chart")) {
            chartDonut = new ApexCharts(document.querySelector("#donut-chart"), {
                ...baseOptions,
                series: [], 
                labels: ['Operando', 'Manutenção', 'Parada de Emergência'],
                colors: [themeColors.cyan, themeColors.yellow, themeColors.red],
                chart: { type: 'donut', height: '100%', width: '100%' },
                stroke: { show: true, colors: ['#0f172a'], width: 3 }, 
                legend: { position: 'bottom', labels: { colors: themeColors.text } },
                tooltip: { theme: 'dark' }
            });
            chartDonut.render();
        }

        // Gráfico 3: Barras Horizontais (Semanal)
        if (document.querySelector("#bar-chart-horizontal")) {
            chartBarHorizontal = new ApexCharts(document.querySelector("#bar-chart-horizontal"), {
                ...baseOptions,
                series: [{ name: 'Inicializado (INI)', data: [] }, { name: 'Parada de Emergência (PE)', data: [] }],
                chart: { type: 'bar', height: '100%', width: '100%', stacked: true, toolbar: { show: false } },
                colors: [themeColors.cyan, themeColors.red],
                plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '50%', borderRadiusApplication: 'end' } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: themeColors.text } } },
                legend: { show: true, position: 'bottom', labels: { colors: themeColors.text }, markers: { radius: 12 } },
                tooltip: { theme: 'dark' }
            });
            chartBarHorizontal.render();
        }
    } else {
        console.error("🔴 ERRO: A biblioteca ApexCharts não foi encontrada.");
    }

    // ==========================================
    // 3. BUSCAR DADOS NO BANCO DE DADOS (VIA SERVER.JS)
    // ==========================================
    const btnAtualizar = document.getElementById('btn-atualizar');
    const iconAtualizar = document.getElementById('icon-atualizar');

    const buscarDadosNoServidor = async () => {
        try {
            // Animando ícone de atualização
            if(iconAtualizar) gsap.to(iconAtualizar, { rotation: "+=360", duration: 0.8, ease: "power2.inOut" });

            // 1. Conectando na rota do backend
            const response = await fetch('http://localhost:3300/api/monitoramento');
            
            if (!response.ok) throw new Error("Falha na comunicação com o Servidor");

            const data = await response.json();

            // 2. Atualizando Gráficos
            if (chartLine) chartLine.updateSeries([{ data: data.graficoLinha.ini }, { data: data.graficoLinha.pe }]);
            if (chartDonut) chartDonut.updateSeries(data.graficoRosca);
            if (chartBarHorizontal) chartBarHorizontal.updateSeries([{ data: data.graficoBarraHoriz.ini }, { data: data.graficoBarraHoriz.pe }]);

            // 3. Atualizando Status (Cards Superiores)
            const statusText = document.getElementById('status-text');
            if (statusText) {
                statusText.innerText = data.status.isOnline ? "Ligada" : "Desligada";
                
                // Muda a cor das duas bolinhas (a do fundo que pisca e a fixa)
                const statusDots = statusText.parentElement.querySelectorAll('span.rounded-full');
                statusDots.forEach(dot => {
                    dot.className = `absolute inline-flex h-full w-full rounded-full opacity-50 ${data.status.isOnline ? 'bg-emerald-500' : 'bg-red-500'}`;
                    // A segunda bolinha não tem animate-ping e opacity
                    if(!dot.classList.contains('absolute')) {
                        dot.className = `relative inline-flex rounded-full h-full w-full ${data.status.isOnline ? 'bg-emerald-500' : 'bg-red-500'}`;
                    }
                });
            }

            const emergencyStopsElement = document.getElementById('emergency-stops-text');
            if (emergencyStopsElement) emergencyStopsElement.innerText = data.status.emergencyStops;
            
            const uptimeElement = document.getElementById('uptime-text');
            if (uptimeElement) uptimeElement.innerText = data.status.uptime;

            const lastBootElement = document.getElementById('last-boot-text');
            if (lastBootElement) lastBootElement.innerText = data.status.lastBoot;

            // 4. Atualizando Tabela de Histórico
            const tbody = document.getElementById('log-table-body');
            if (tbody) {
                let newRowsHTML = '';
                
                if (data.logsTabela.length === 0) {
                    newRowsHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Nenhum registro encontrado.</td></tr>`;
                } else {
                    data.logsTabela.forEach(log => {
                        let statusHtml = log.isNormal ? `
                                <div class="flex items-center gap-2 text-emerald-400">
                                    <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                                    Normal
                                </div>` : `
                                <div class="flex items-center gap-2 text-red-400">
                                    <span class="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"></span>
                                    Parada de Emergência
                                </div>`;

                        newRowsHTML += `
                            <tr class="hover:bg-white/5 transition-colors animate-[fadeIn_0.5s_ease-in-out]">
                                <td class="py-4 px-6">${log.data}</td>
                                <td class="py-4 px-6">${log.inicio}</td>
                                <td class="py-4 px-6">${log.fim}</td>
                                <td class="py-4 px-6">${log.tempo}</td>
                                <td class="py-4 px-6 font-medium">${statusHtml}</td>
                            </tr>
                        `;
                    });
                }
                
                tbody.innerHTML = newRowsHTML;
            }

        } catch (error) {
            console.error("🔴 Erro de Conexão:", error);
        }
    };

    // Executa a busca de dados ao clicar no botão de atualizar
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', buscarDadosNoServidor);
    }

    // Dispara a primeira busca de dados assim que a tela abre
    buscarDadosNoServidor(); 
});