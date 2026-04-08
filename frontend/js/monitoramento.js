document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 Monitoramento JS Carregado!");

    // ==========================================
    // 1. ANIMAÇÃO DO MENU LATERAL (SIDEBAR)
    // ==========================================
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    let isCollapsed = false;

    if (menuBtn && sidebar && typeof gsap !== 'undefined') {
        menuBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            
            const timeline = gsap.timeline({
                onComplete: () => {
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
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
        const themeColors = { cyan: '#06b6d4', green: '#22c55e', red: '#f87171', yellow: '#eab308', grid: '#1e293b', text: '#94a3b8' };
        
        const baseOptions = {
            chart: { fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent' },
            grid: { borderColor: themeColors.grid, strokeDashArray: 3, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            dataLabels: { enabled: false },
            tooltip: { theme: 'dark' }
        };

        // Gráfico 1: Linhas Duplas
        if (document.querySelector("#line-chart")) {
            chartLine = new ApexCharts(document.querySelector("#line-chart"), {
                ...baseOptions,
                series: [{ name: 'Inicializado', data: [0,0,0,0,0,0,0] }, { name: 'Parada de Emergência', data: [0,0,0,0,0,0,0] }], 
                chart: { type: 'area', height: '100%', width: '100%', animations: { enabled: true } },
                colors: [themeColors.cyan, themeColors.red],
                stroke: { curve: 'smooth', width: 3 },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } } },
                yaxis: { labels: { style: { colors: themeColors.text } } },
                legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#fff' } }
            });
            chartLine.render();
        }

        // Gráfico 2: Donut
        if (document.querySelector("#donut-chart")) {
            chartDonut = new ApexCharts(document.querySelector("#donut-chart"), {
                ...baseOptions,
                series: [1, 1, 1], 
                labels: ['Operando', 'Manutenção', 'Parada de Emergência'],
                colors: [themeColors.cyan, themeColors.yellow, themeColors.red],
                chart: { type: 'donut', height: '100%', width: '100%' },
                stroke: { colors: ['#0f172a'], width: 3 }, 
                legend: { position: 'bottom', labels: { colors: themeColors.text } },
                plotOptions: { pie: { donut: { size: '75%' } } }
            });
            chartDonut.render();
        }

        // Gráfico 3: Barras
        if (document.querySelector("#bar-chart-horizontal")) {
            chartBarHorizontal = new ApexCharts(document.querySelector("#bar-chart-horizontal"), {
                ...baseOptions,
                series: [{ name: 'Tempo Operando', data: [0,0,0,0,0,0,0] }, { name: 'Tempo Parado', data: [0,0,0,0,0,0,0] }],
                chart: { type: 'bar', height: '100%', width: '100%', stacked: true },
                colors: [themeColors.cyan, themeColors.red],
                plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '40%' } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } } },
                yaxis: { labels: { style: { colors: themeColors.text } } },
                legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#fff' } }
            });
            chartBarHorizontal.render();
        }
    }

    // ==========================================
    // 3. BUSCAR DADOS DO SUPABASE E ATUALIZAR
    // ==========================================
    const btnAtualizar = document.getElementById('btn-atualizar');
    const iconAtualizar = document.getElementById('icon-atualizar');

    const buscarDadosNoServidor = async (isManualClick = false) => {
        try {
            // Animação da engrenagem rodando no clique
            if(isManualClick && iconAtualizar && typeof gsap !== 'undefined') {
                gsap.to(iconAtualizar, { rotation: "+=360", duration: 0.8, ease: "power2.inOut" });
            }

            const response = await fetch('/api/monitoramento');
            if (!response.ok) throw new Error("Falha na API");

            const data = await response.json();

            // 3.1. ATUALIZAR CARDS SUPERIORES
            const uptimeEl = document.getElementById('info-uptime');
            const lastBootEl = document.getElementById('info-lastboot');
            const emergencyEl = document.getElementById('info-emergency');

            if (uptimeEl && data.status) uptimeEl.innerText = data.status.uptime;
            if (lastBootEl && data.status) lastBootEl.innerText = data.status.lastBoot;
            if (emergencyEl && data.status) emergencyEl.innerText = data.status.emergencyStops;

            // 3.2. ATUALIZAR GRÁFICOS
            if (chartLine && data.graficoLinha) {
                chartLine.updateSeries([
                    { data: data.graficoLinha.ini }, 
                    { data: data.graficoLinha.pe }
                ]);
            }
            
            // (Nota: Se o seu server.js mandar as props graficoRosca e graficoBarraHoriz, elas serão atualizadas)
            if (chartDonut && data.graficoRosca) chartDonut.updateSeries(data.graficoRosca);
            if (chartBarHorizontal && data.graficoBarraHoriz) {
                chartBarHorizontal.updateSeries([
                    { data: data.graficoBarraHoriz.ini }, 
                    { data: data.graficoBarraHoriz.pe }
                ]);
            }

            // 3.3. ATUALIZAR TABELA
            if (data.logsTabela) {
                preencherTabelaLogs(data.logsTabela);
            }

            // Feedback Toast (se a função existir)
            if (isManualClick && typeof showToast === 'function') {
                showToast('Dados de monitoramento atualizados!', 'success');
            }

        } catch (error) {
            console.log("🟡 API Offline. Iniciando Simulador Visual para os Gráficos...");
            
            // ========================================================
            // EFEITO VISUAL DE DEMONSTRAÇÃO (Se não achar o servidor)
            // ========================================================
            if (chartLine) {
                chartLine.updateSeries([
                    { data: Array.from({length: 7}, () => Math.floor(Math.random() * 50)) }, 
                    { data: Array.from({length: 7}, () => Math.floor(Math.random() * 20)) }
                ]);
            }
            if (chartDonut) {
                chartDonut.updateSeries([
                    Math.floor(Math.random() * 80) + 20, 
                    Math.floor(Math.random() * 15),      
                    Math.floor(Math.random() * 10)       
                ]);
            }
            if (chartBarHorizontal) {
                chartBarHorizontal.updateSeries([
                    { data: Array.from({length: 7}, () => Math.floor(Math.random() * 15)) }, 
                    { data: Array.from({length: 7}, () => Math.floor(Math.random() * 5)) }
                ]);
            }

            preencherTabelaLogs([
                { data: 'Hoje', inicio: '08:00', fim: '12:00', tempo: '4h', isNormal: true },
                { data: 'Hoje', inicio: '13:00', fim: '13:15', tempo: '15m', isNormal: false },
                { data: 'Ontem', inicio: '09:00', fim: '18:00', tempo: '9h', isNormal: true }
            ]);

            if (isManualClick && typeof showToast === 'function') {
                showToast('Erro ao conectar na API (Modo simulação ativado).', 'error');
            }
        }
    };

    // ==========================================
    // 4. FUNÇÃO PARA PREENCHER TABELA E SETUP
    // ==========================================
    function preencherTabelaLogs(logsTabela) {
        const tbody = document.getElementById('log-table-body');
        if (!tbody) return;

        let newRowsHTML = '';
        if (!logsTabela || logsTabela.length === 0) {
            newRowsHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Nenhum registro.</td></tr>`;
        } else {
            logsTabela.forEach(log => {
                let statusHtml = log.isNormal ? `
                        <div class="flex items-center gap-2 text-emerald-400">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Normal
                        </div>` : `
                        <div class="flex items-center gap-2 text-rose-400">
                            <span class="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span> Parada
                        </div>`;

                newRowsHTML += `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="py-4 px-6">${log.data}</td>
                        <td class="py-4 px-6">${log.inicio}</td>
                        <td class="py-4 px-6">${log.fim}</td>
                        <td class="py-4 px-6">${log.tempo}</td>
                        <td class="py-4 px-6 font-medium">${statusHtml}</td>
                    </tr>`;
            });
        }
        tbody.innerHTML = newRowsHTML;
    }

    // Configura Botão
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', () => buscarDadosNoServidor(true));
    }

    // Busca ao carregar a página
    buscarDadosNoServidor(false);

    // Configura o Auto-Refresh a cada 10 segundos
    setInterval(() => {
        buscarDadosNoServidor(false);
    }, 10000);

}); // <- O FECHAMENTO QUE ESTAVA FALTANDO É ESTE AQUI!
