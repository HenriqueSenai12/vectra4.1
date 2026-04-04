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
    // 2. RENDERIZAÇÃO DOS GRÁFICOS (APEXCHARTS)
    // ==========================================
    let chartLine, chartDonut, chartBar, chartBarHorizontal;

    if (typeof ApexCharts !== 'undefined') {
        console.log("🟡 Iniciando gráficos...");

        const themeColors = { cyan: '#06b6d4', green: '#22c55e', red: '#f87171', yellow: '#eab308', grid: '#1e293b', text: '#94a3b8' };
        
        const baseOptions = {
            chart: { fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent' },
            grid: { borderColor: themeColors.grid, strokeDashArray: 3, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            dataLabels: { enabled: false }
        };

        // --- GRÁFICO 1: Linhas Duplas (Inicializações vs Paradas) ---
        if (document.querySelector("#line-chart")) {
            chartLine = new ApexCharts(document.querySelector("#line-chart"), {
                ...baseOptions,
                series: [
                    { name: 'Inicializado', data: [15, 22, 12, 28, 18, 25, 20] },
                    { name: 'Parada de Emergência', data: [2, 5, 1, 6, 3, 2, 4] }
                ],
                chart: { 
                    type: 'line', 
                    height: '100%', 
                    width: '100%', 
                    parentHeightOffset: 0,
                    dropShadow: { // Adiciona uma leve sombra nas linhas (estilo da imagem)
                        enabled: true,
                        color: '#000',
                        top: 10,
                        left: 0,
                        blur: 5,
                        opacity: 0.2
                    }
                },
                colors: [themeColors.cyan, themeColors.red],
                stroke: { 
                    curve: 'straight', // Deixa as linhas retas entre os pontos como no modelo
                    width: 3 
                },
                markers: {
                    size: 5, // Tamanho das bolinhas
                    colors: ['#0f172a'], // Fundo escuro para a bolinha
                    strokeColors: [themeColors.cyan, themeColors.red], // Borda colorida
                    strokeWidth: 2,
                    hover: { size: 7 }
                },
                xaxis: { 
                    categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], 
                    labels: { style: { colors: themeColors.text } }, 
                    axisBorder: { show: false }, 
                    axisTicks: { show: false } 
                },
                yaxis: { 
                    labels: { style: { colors: themeColors.text } } 
                },
                legend: { 
                    show: true, 
                    position: 'bottom', 
                    labels: { colors: themeColors.text },
                    markers: { radius: 12 } 
                },
                tooltip: {
                    theme: 'dark',
                    shared: true, // Mostra as duas informações no mesmo balão
                    intersect: false,
                    custom: function({series, seriesIndex, dataPointIndex, w}) {
                        const ini = series[0][dataPointIndex];
                        const pe = series[1][dataPointIndex];
                        const category = w.globals.labels[dataPointIndex];

                        return `
                            <div class="bg-vectra-panel border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] min-w-[140px]">
                                <div class="text-white text-sm font-semibold mb-3 pb-2 border-b border-slate-700/50">${category}</div>
                                <div class="flex items-center gap-2 text-sm mb-2">
                                    <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
                                    <span class="text-slate-300">Inicializado: <span class="text-white font-medium">${ini}</span></span>
                                </div>
                                <div class="flex items-center gap-2 text-sm">
                                    <span class="w-3 h-3 rounded-full bg-red-400"></span>
                                    <span class="text-slate-300">Emergência: <span class="text-white font-medium">${pe}</span></span>
                                </div>
                            </div>
                        `;
                    }
                }
            });
            chartLine.render();
        }

        // --- GRÁFICO 2: Proporção de Estados (Rosca) ---
        if (document.querySelector("#donut-chart")) {
            chartDonut = new ApexCharts(document.querySelector("#donut-chart"), {
                ...baseOptions,
                series: [75, 15, 10],
                labels: ['inicialização', 'Manutenção', 'Parada de Emergêcia'],
                colors: [themeColors.cyan, themeColors.yellow, themeColors.red],
                chart: { type: 'donut', height: '100%', width: '100%' },
                stroke: { show: true, colors: ['#0f172a'], width: 3 }, 
                legend: { position: 'bottom', labels: { colors: themeColors.text } },
                tooltip: { theme: 'dark' }
            });
            chartDonut.render();
        }

        // --- GRÁFICO 3: Inicializações e Paradas (Barras Empilhadas Mensal) ---
        if (document.querySelector("#bar-chart")) {
            chartBar = new ApexCharts(document.querySelector("#bar-chart"), {
                ...baseOptions,
                series: [
                    { name: 'Inicializado (INI)', data: [12, 7, 15, 5, 16, 10] },
                    { name: 'Parada de Emergência (PE)', data: [0, 0, 0, 0, 3, 0] }
                ],
                chart: { type: 'bar', height: '100%', width: '100%', stacked: true, toolbar: { show: false } },
                colors: [themeColors.cyan, themeColors.red],
                plotOptions: { bar: { borderRadius: 4, columnWidth: '45%', borderRadiusApplication: 'end' } },
                xaxis: { categories: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], labels: { style: { colors: themeColors.text } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: themeColors.text } } },
                legend: { show: true, position: 'bottom', labels: { colors: themeColors.text }, markers: { radius: 12 } },
                tooltip: {
                    theme: 'dark',
                    custom: function({series, seriesIndex, dataPointIndex, w}) {
                        const ini = series[0][dataPointIndex];
                        const pe = series[1][dataPointIndex];
                        const total = ini + pe;
                        const mesAbreviado = w.globals.labels[dataPointIndex];
                        const mesesEmIngles = {'Jul': 'July', 'Ago': 'August', 'Set': 'September', 'Out': 'October', 'Nov': 'November', 'Dez': 'December'};
                        const monthName = mesesEmIngles[mesAbreviado] || mesAbreviado;

                        return `
                            <div class="bg-vectra-panel border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] min-w-[140px]">
                                <div class="text-white text-sm font-semibold mb-3 pb-2 border-b border-slate-700/50">${monthName} - Details</div>
                                <div class="flex items-center gap-2 text-sm mb-2">
                                    <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
                                    <span class="text-slate-300">INI: <span class="text-white font-medium">${ini}</span></span>
                                </div>
                                <div class="flex items-center gap-2 text-sm mb-3">
                                    <span class="w-3 h-3 rounded-full bg-red-400"></span>
                                    <span class="text-slate-300">PE: <span class="text-white font-medium">${pe}</span></span>
                                </div>
                                <div class="text-slate-300 text-sm mt-1 pt-2 border-t border-slate-700/50">
                                    TOT: <span class="text-white font-medium">${total}</span>
                                </div>
                            </div>
                        `;
                    }
                }
            });
            chartBar.render();
        }

        // --- GRÁFICO 4: Inicializações e Paradas (Barras Horizontais Empilhadas Semanal) ---
        if (document.querySelector("#bar-chart-horizontal")) {
            chartBarHorizontal = new ApexCharts(document.querySelector("#bar-chart-horizontal"), {
                ...baseOptions,
                series: [
                    { name: 'Inicializado (INI)', data: [4, 6, 3, 7, 5, 2, 6] },
                    { name: 'Parada de Emergência (PE)', data: [0, 0, 0, 1, 0, 0, 1] }
                ],
                chart: { type: 'bar', height: '100%', width: '100%', stacked: true, toolbar: { show: false } },
                colors: [themeColors.cyan, themeColors.red],
                plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '50%', borderRadiusApplication: 'end' } },
                xaxis: { categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], labels: { style: { colors: themeColors.text } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: themeColors.text } } },
                legend: { show: true, position: 'bottom', labels: { colors: themeColors.text }, markers: { radius: 12 } },
                tooltip: {
                    theme: 'dark',
                    custom: function({series, seriesIndex, dataPointIndex, w}) {
                        const ini = series[0][dataPointIndex];
                        const pe = series[1][dataPointIndex];
                        const total = ini + pe;
                        const diaAbreviado = w.globals.labels[dataPointIndex];
                        const diasCompletos = {'Seg': 'Segunda', 'Ter': 'Terça', 'Qua': 'Quarta', 'Qui': 'Quinta', 'Sex': 'Sexta', 'Sáb': 'Sábado', 'Dom': 'Domingo'};
                        const dayName = diasCompletos[diaAbreviado] || diaAbreviado;

                        return `
                            <div class="bg-vectra-panel border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] min-w-[140px]">
                                <div class="text-white text-sm font-semibold mb-3 pb-2 border-b border-slate-700/50">${dayName} - Details</div>
                                <div class="flex items-center gap-2 text-sm mb-2">
                                    <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
                                    <span class="text-slate-300">INI: <span class="text-white font-medium">${ini}</span></span>
                                </div>
                                <div class="flex items-center gap-2 text-sm mb-3">
                                    <span class="w-3 h-3 rounded-full bg-red-400"></span>
                                    <span class="text-slate-300">PE: <span class="text-white font-medium">${pe}</span></span>
                                </div>
                                <div class="text-slate-300 text-sm mt-1 pt-2 border-t border-slate-700/50">
                                    TOT: <span class="text-white font-medium">${total}</span>
                                </div>
                            </div>
                        `;
                    }
                }
            });
            chartBarHorizontal.render();
        }

    } else {
        console.error("🔴 ERRO: A biblioteca ApexCharts não foi encontrada.");
    }

    // ==========================================
    // 3. SIMULAÇÃO DE ATUALIZAÇÃO DE DADOS
    // ==========================================
    const btnAtualizar = document.getElementById('btn-atualizar');
    const iconAtualizar = document.getElementById('icon-atualizar');

    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', () => {
            gsap.to(iconAtualizar, { rotation: "+=360", duration: 0.8, ease: "power2.inOut" });

            // Atualiza as duas linhas no gráfico 1
            if (chartLine) {
                const newIniLine = Array.from({length: 7}, () => Math.floor(Math.random() * 20) + 10);
                const newPeLine = Array.from({length: 7}, () => Math.floor(Math.random() * 8));
                chartLine.updateSeries([
                    { data: newIniLine },
                    { data: newPeLine }
                ]);
            }
            if (chartDonut) {
                const newOperando = Math.floor(Math.random() * 40) + 50; 
                const newStandby = Math.floor(Math.random() * 20) + 5;
                const newManutencao = 100 - newOperando - newStandby;
                chartDonut.updateSeries([newOperando, newStandby, newManutencao]);
            }
            if (chartBar) {
                const newIni = Array.from({length: 6}, () => Math.floor(Math.random() * 15) + 5);
                const newPe = Array.from({length: 6}, () => Math.floor(Math.random() * 4)); 
                chartBar.updateSeries([{ data: newIni }, { data: newPe }]);
            }
            if (chartBarHorizontal) {
                const newIniSemana = Array.from({length: 7}, () => Math.floor(Math.random() * 10) + 2);
                const newPeSemana = Array.from({length: 7}, () => Math.floor(Math.random() * 3));
                chartBarHorizontal.updateSeries([{ data: newIniSemana }, { data: newPeSemana }]);
            }

            // Atualização de Textos e Tabelas (Mantido igual)
            const statusText = document.getElementById('status-text');
            if (statusText) {
                const isOnline = Math.random() > 0.2;
                statusText.innerText = isOnline ? "Ligada" : "Desligada";
                const statusDots = statusText.parentElement.querySelectorAll('span.rounded-full');
                statusDots.forEach(dot => {
                    if (isOnline) {
                        dot.classList.remove('bg-red-500', 'bg-slate-900');
                        dot.classList.add('bg-emerald-500');
                    } else {
                        dot.classList.remove('bg-emerald-500', 'bg-slate-900');
                        dot.classList.add('bg-red-500');
                    }
                });
            }

            const emergencyStopsElement = document.getElementById('emergency-stops-text');
            if (emergencyStopsElement) { emergencyStopsElement.innerText = Math.floor(Math.random() * 5); }
            
            const uptimeElement = document.getElementById('uptime-text');
            if (uptimeElement) {
                const horas = Math.floor(Math.random() * 6) + 6;
                const mins = Math.floor(Math.random() * 59);
                uptimeElement.innerText = `${horas.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
            }

            const lastBootElement = document.getElementById('last-boot-text');
            if (lastBootElement) {
                const bootHour = Math.floor(Math.random() * 5) + 5; 
                const bootMin = Math.floor(Math.random() * 59);
                lastBootElement.innerText = `${bootHour.toString().padStart(2, '0')}:${bootMin.toString().padStart(2, '0')} AM`;
            }

            const tbody = document.getElementById('log-table-body');
            if (tbody) {
                let newRowsHTML = '';
                const pad = (num) => num.toString().padStart(2, '0');

                for (let i = 0; i < 4; i++) {
                    const dia = pad(Math.floor(Math.random() * 9) + 20); 
                    const dataStr = `${dia}/03/2026`;
                    const startHour = Math.floor(Math.random() * 9) + 6;
                    const startMin = Math.floor(Math.random() * 4) * 15; 
                    const durationHours = Math.floor(Math.random() * 5) + 1;
                    const durationMins = Math.floor(Math.random() * 4) * 15;
                    let endHour = startHour + durationHours;
                    let endMin = startMin + durationMins;
                    if (endMin >= 60) { endHour += 1; endMin -= 60; }
                    const inicioStr = `${pad(startHour)}:${pad(startMin)}`;
                    const fimStr = `${pad(endHour)}:${pad(endMin)}`;
                    const tempoStr = `${durationHours}h ${pad(durationMins)}m`;

                    const isNormal = Math.random() > 0.2;
                    let statusHtml = isNormal ? `
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
                            <td class="py-4 px-6">${dataStr}</td>
                            <td class="py-4 px-6">${inicioStr}</td>
                            <td class="py-4 px-6">${fimStr}</td>
                            <td class="py-4 px-6">${tempoStr}</td>
                            <td class="py-4 px-6 font-medium">${statusHtml}</td>
                        </tr>
                    `;
                }
                tbody.innerHTML = newRowsHTML;
            }
        });
    }
});
