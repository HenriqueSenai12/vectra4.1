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
            grid: { 
                borderColor: themeColors.grid, 
                strokeDashArray: 3, 
                xaxis: { lines: { show: false } }, 
                yaxis: { lines: { show: true } },
                padding: { top: 20, right: 15, left: 10, bottom: 15 } 
            },
            dataLabels: { enabled: false },
            tooltip: { theme: 'dark' }
        };

        // Gráfico 1: Linha Única (Eventos ao Longo do Tempo) - SOMENTE AZUL
        if (document.querySelector("#line-chart")) {
            chartLine = new ApexCharts(document.querySelector("#line-chart"), {
                ...baseOptions,
                series: [{ name: 'Inicializado', data: [0,0,0,0,0,0,0] }], 
                chart: { type: 'area', height: '100%', width: '100%', animations: { enabled: true } },
                colors: [themeColors.cyan],
                stroke: { curve: 'smooth', width: 3 },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } } },
                yaxis: { 
                    labels: { style: { colors: themeColors.text } },
                    min: 0, 
                    max: (max) => { return Math.ceil(max * 1.2); } 
                },
                legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#fff' } }
            });
            chartLine.render();
        }

        // Gráfico 2: Donut
        if (document.querySelector("#donut-chart")) {
            chartDonut = new ApexCharts(document.querySelector("#donut-chart"), {
                ...baseOptions,
                series: [1, 1, 1], 
                labels: ['Inicializado', 'Manutenção', 'Parada de Emergência'],
                colors: [themeColors.cyan, themeColors.yellow, themeColors.red],
                chart: { type: 'donut', height: '100%', width: '100%' },
                stroke: { colors: ['#0f172a'], width: 3 }, 
                legend: { position: 'bottom', labels: { colors: themeColors.text } },
                plotOptions: { pie: { donut: { size: '75%' } } }
            });
            chartDonut.render();
        }

        // Gráfico 3: Barras - VOLTOU A SER DUPLO (AZUL E VERMELHO)
                // Gráfico 3: Barras - VOLTOU A SER DUPLO (AZUL E VERMELHO)
        if (document.querySelector("#bar-chart-horizontal")) {
            chartBarHorizontal = new ApexCharts(document.querySelector("#bar-chart-horizontal"), {
                ...baseOptions,
                series: [{ name: 'Inicializado', data: [0,0,0,0,0,0,0] }, { name: 'Paradas', data: [0,0,0,0,0,0,0] }],
                chart: { type: 'bar', height: '100%', width: '100%', stacked: true },
                colors: [themeColors.cyan, themeColors.red],
                plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '40%' } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } } },
                
                // 👇 AQUI: Forçamos o eixo a começar no 0 para não cortar a base das barras
                yaxis: { 
                    labels: { style: { colors: themeColors.text } },
                    min: 0 
                },
                
                // 👇 AQUI: Damos uma margem inferior extra (bottom: 25) para os textos não ficarem cortados
                grid: { 
                    ...baseOptions.grid,
                    padding: { top: 20, right: 15, left: 10, bottom: 25 } 
                },
                
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

            // BUSCA DADOS REAIS DO BANCO
            const response = await fetch('/api/monitoramento');
            if (!response.ok) throw new Error("Falha na API");
            const data = await response.json();

            // ---------------------------------------------------
            // 3.1. DADOS REAIS: CARDS SUPERIORES
            // ---------------------------------------------------
            const uptimeEl = document.getElementById('info-uptime');
            const lastBootEl = document.getElementById('info-lastboot');
            const emergencyEl = document.getElementById('info-emergency');

            if (uptimeEl && data.status) uptimeEl.innerText = data.status.uptime;
            if (lastBootEl && data.status) lastBootEl.innerText = data.status.lastBoot;
            if (emergencyEl && data.status) emergencyEl.innerText = data.status.emergencyStops;

            // ---------------------------------------------------
            // 3.2. DADOS SIMULADOS: GRÁFICOS (Gerados aleatoriamente)
            // ---------------------------------------------------
            const diasSimulados = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            const iniSimulado = Array.from({length: 7}, () => Math.floor(Math.random() * 50) + 10); // Números entre 10 e 60
            const peSimulado = Array.from({length: 7}, () => Math.floor(Math.random() * 10));      // Números entre 0 e 10 (Voltou a linha vermelha simulada)

            if (chartLine) {
                // Gráfico 1 continua recebendo apenas a linha AZUL
                chartLine.updateSeries([{ data: iniSimulado }]);
                chartLine.updateOptions({ xaxis: { categories: diasSimulados } });
            }
            
            if (chartDonut) {
                chartDonut.updateSeries([
                    Math.floor(Math.random() * 80) + 20, // Falso Operando
                    Math.floor(Math.random() * 15),      // Falsa Manutenção
                    Math.floor(Math.random() * 10)       // Falsa Emergência
                ]);
            }
            
            if (chartBarHorizontal) {
                // Gráfico 3 volta a receber as duas linhas: AZUL e VERMELHA
                chartBarHorizontal.updateSeries([{ data: iniSimulado }, { data: peSimulado }]);
                chartBarHorizontal.updateOptions({ xaxis: { categories: diasSimulados } });
            }

            // ---------------------------------------------------
            // 3.3. DADOS REAIS: TABELA DE HISTÓRICO DE REGISTROS
            // ---------------------------------------------------
            if (data.logsTabela) {
                preencherTabelaLogs(data.logsTabela);
            }

            if (isManualClick && typeof showToast === 'function') {
                showToast('Painel atualizado!', 'success');
            }

        } catch (error) {
            console.log("🟡 API Offline. Usando simulador na tabela também...");
            
            // Se o servidor cair, simula a tabela também
            preencherTabelaLogs([
                { data: 'Hoje', inicio: '08:00', fim: '12:00', tempo: '4h', operador: 'João Silva', isNormal: true },
                { data: 'Hoje', inicio: '13:00', fim: '13:15', tempo: '15m', operador: 'Sistema', isNormal: false },
                { data: 'Ontem', inicio: '09:00', fim: '18:00', tempo: '9h', operador: 'Maria Souza', isNormal: true }
            ]);

            if (isManualClick && typeof showToast === 'function') {
                showToast('Erro ao conectar na API (Modo offline ativado).', 'error');
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
            newRowsHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">Nenhum registro.</td></tr>`;
        } else {
            logsTabela.forEach(log => {
                let statusHtml = log.isNormal ? `
                        <div class="flex items-center gap-2 text-emerald-400">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Normal
                        </div>` : `
                        <div class="flex items-center gap-2 text-rose-400">
                            <span class="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span> Parada
                        </div>`;

                let nomeOperador = log.operador ? log.operador : 'N/A';

                newRowsHTML += `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="py-4 px-6">${log.data}</td>
                        <td class="py-4 px-6">${log.inicio}</td>
                        <td class="py-4 px-6">${log.fim}</td>
                        <td class="py-4 px-6">${log.tempo}</td>
                        <td class="py-4 px-6 text-vectra-light">${nomeOperador}</td>
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

});
