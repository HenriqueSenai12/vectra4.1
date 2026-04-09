const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3300;

// ==========================================================
// CONFIGURAÇÃO ÚNICA DO SUPABASE
// ==========================================================
const supabaseUrl = process.env.SUPABASE_PUBLIC_URL || 'https://ncdviiijzbbqugyiusyq.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLIC_KEY || 'sb_publishable_Lwh8-C2Ah3PLP-riPKtq8w_R4oxJgxC';

if (!supabaseUrl || !supabaseKey) console.error("❌ ERRO: Credenciais não encontradas!");
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// ==========================================================
// ARQUIVOS ESTÁTICOS
// ==========================================================
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/image', express.static(path.join(__dirname, 'image')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================
const formatarTempoComplexo = (totalSegundos) => {
    if (totalSegundos === null || totalSegundos === undefined) return "--";
    const hrs = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;
    const hDisplay = hrs > 0 ? `${hrs.toString().padStart(2, '0')}h ` : "";
    const mDisplay = `${min.toString().padStart(2, '0')}m `;
    const sDisplay = `${seg.toString().padStart(2, '0')}s`;
    return (hDisplay + mDisplay + sDisplay).trim();
};

/**
 * 🚀 MOTOR DE MÉTRICAS DIÁRIAS (Alimenta os Gráficos)
 * Verifica o dia atual e incrementa as estatísticas
 */
async function registrarMetricaDiaria(equipamento_id, tipo_evento, valor_incremento) {
    const hoje = new Date().toISOString().split('T')[0]; // Retorna YYYY-MM-DD (ex: 2026-04-09)
    
    // 1. Verifica se já existe um registro para o dia de hoje
    const { data: metricaHoje } = await supabase
        .from('metricas_diarias')
        .select('*')
        .eq('equipamento_id', equipamento_id)
        .eq('data_registro', hoje)
        .maybeSingle();

    if (metricaHoje) {
        // 2. Se o dia já existe, apenas soma os valores
        let updateData = {};
        if (tipo_evento === 'play') updateData.inicializacoes_count = metricaHoje.inicializacoes_count + valor_incremento;
        if (tipo_evento === 'manutencao') updateData.paradas_emergencia_count = metricaHoje.paradas_emergencia_count + valor_incremento;
        if (tipo_evento === 'tempo') updateData.tempo_operacao_minutos = (metricaHoje.tempo_operacao_minutos || 0) + valor_incremento;

        await supabase.from('metricas_diarias').update(updateData).eq('id', metricaHoje.id);
    } else {
        // 3. Se é o primeiro evento do dia, cria a linha no banco
        let insertData = {
            equipamento_id: equipamento_id,
            data_registro: hoje,
            inicializacoes_count: tipo_evento === 'play' ? valor_incremento : 0,
            paradas_emergencia_count: tipo_evento === 'manutencao' ? valor_incremento : 0,
            tempo_operacao_minutos: tipo_evento === 'tempo' ? valor_incremento : 0,
            energia_consumida_kwh: 0 // Inicia zerado
        };
        await supabase.from('metricas_diarias').insert([insertData]);
    }
}

// ==========================================================
// ROTAS DE USUÁRIOS
// ==========================================================
// (Suas rotas de login, get, post, put, delete de usuários continuam intactas aqui)
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    const { data: usuario, error } = await supabase.from('usuarios').select('nome_completo, funcao').eq('email', email).eq('senha', senha).maybeSingle();
    if (error || !usuario) return res.status(401).json({ success: false, message: "Email ou senha incorretos" });
    res.json({ success: true, user: { nome: usuario.nome_completo, funcao: usuario.funcao } });
});
app.get('/api/users', async (req, res) => {
    const { data } = await supabase.from('usuarios').select('*').order('id', { ascending: true });
    res.json(data);
});

// ==========================================================
// CONTROLE DA ESTEIRA E ALIMENTAÇÃO DOS GRÁFICOS
// ==========================================================
app.get('/api/esteira/status', async (req, res) => {
    const { data: logAtivo } = await supabase.from('logs_operacao').select('*').eq('status', 'em_andamento').eq('equipamento_id', 1).limit(1).maybeSingle();
    res.json({ ligado: !!logAtivo });
});

app.post('/api/esteira/play', async (req, res) => {
    const { email } = req.body;
    try {
        await supabase.from('equipamentos').update({ status_atual: 'online', ultima_inicializacao: new Date() }).eq('id', 1);
        
        let id_do_usuario = null;
        if (email) {
            const { data: userDb } = await supabase.from('usuarios').select('id').eq('email', email).maybeSingle();
            if (userDb) id_do_usuario = userDb.id;
        }

        await supabase.from('logs_operacao').insert([{ 
            equipamento_id: 1, status: 'em_andamento', tipo_evento: 'operacao_normal', usuario_id: id_do_usuario 
        }]);

        // 📊 ALIMENTA O GRÁFICO: Registra +1 inicialização no dia de hoje
        await registrarMetricaDiaria(1, 'play', 1);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/esteira/stop', async (req, res) => {
    try {
        await supabase.from('equipamentos').update({ status_atual: 'offline' }).eq('id', 1);

        const { data: logAberto } = await supabase
            .from('logs_operacao').select('*').eq('status', 'em_andamento').eq('equipamento_id', 1)
            .order('data_inicio', { ascending: false }).limit(1).maybeSingle();

        if (logAberto) {
            const dataInicio = new Date(logAberto.data_inicio);
            const dataFim = new Date();
            const duracaoSegundos = Math.floor((dataFim - dataInicio) / 1000);

            // Sem menção ao usuario_id para não apagar o vínculo
            await supabase.from('logs_operacao')
                .update({ data_fim: dataFim.toISOString(), duracao_minutos: duracaoSegundos, status: 'finalizado' })
                .eq('id', logAberto.id);

            // 📊 ALIMENTA A TABELA DE MÉTRICAS: Acumula o tempo rodado no dia (em minutos)
            const tempoEmMinutos = Math.floor(duracaoSegundos / 60);
            if (tempoEmMinutos > 0) {
                await registrarMetricaDiaria(1, 'tempo', tempoEmMinutos);
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================================
// ROTA DE MANUTENÇÃO (Para o Painel de Suporte)
// ==========================================================
app.post('/api/manutencao', async (req, res) => {
    try {
        // Quando alguém cadastra um chamado de manutenção no painel de suporte
        // 📊 ALIMENTA O GRÁFICO: Registra +1 parada/manutenção no dia
        await registrarMetricaDiaria(1, 'manutencao', 1);

        res.json({ success: true, message: "Manutenção registrada e gráfico atualizado!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// MONITORAMENTO (ENVIANDO DADOS PARA O FRONTEND)
// ==========================================================
app.get('/api/monitoramento', async (req, res) => {
    try {
        const { data: eq } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
        
        // Pega os últimos 7 dias da tabela que o Motor de Métricas agora está alimentando!
        const { data: metricas } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
        
        const { data: logs } = await supabase.from('logs_operacao').select('*, usuarios(nome_completo, email)').order('data_inicio', { ascending: false }).limit(10);

        const opcoesHora = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const opcoesData = { timeZone: 'America/Sao_Paulo' };

        res.json({
            // Agora as linhas do gráfico vão crescer sozinhas
            graficoLinha: { 
                datas: metricas?.map(m => new Date(m.data_registro).toLocaleDateString('pt-BR')) || [], // Envia a data para o gráfico
                ini: metricas?.map(m => m.inicializacoes_count) || [], 
                pe: metricas?.map(m => m.paradas_emergencia_count) || [] 
            },
            status: {
                isOnline: eq?.status_atual === 'online',
                emergencyStops: eq?.paradas_emergencia_count || 0,
                uptime: formatarTempoComplexo(eq?.uptime_minutos), 
                lastBoot: eq?.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString('pt-BR', opcoesHora) : '--'
            },
            logsTabela: logs?.map(l => ({
                data: new Date(l.data_inicio).toLocaleDateString('pt-BR', opcoesData),
                inicio: new Date(l.data_inicio).toLocaleTimeString('pt-BR', opcoesHora),
                fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString('pt-BR', opcoesHora) : 'Rodando...',
                tempo: l.duracao_minutos ? formatarTempoComplexo(l.duracao_minutos) : '--',
                operador: l.usuarios?.nome_completo || 'Sistema', 
                isNormal: l.tipo_evento !== 'parada_emergencia'
            })) || []
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}
