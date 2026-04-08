const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3300;

// ==========================================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================================
const supabaseUrl = process.env.SUPABASE_PUBLIC_URL || 'https://ncdviiijzbbqugyiusyq.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLIC_KEY || 'sb_publishable_Lwh8-C2Ah3PLP-riPKtq8w_R4oxJgxC';

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Credenciais do Supabase não encontradas!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middlewares
app.use(cors());
app.use(express.json());

// ==========================================================
// ARQUIVOS ESTÁTICOS
// ==========================================================
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/image', express.static(path.join(__dirname, 'image')));

app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================================
// ROTAS DE USUÁRIOS & LOGIN
// ==========================================================

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('nome_completo, funcao')
            .eq('email', email)
            .eq('senha', senha)
            .maybeSingle();

        if (error || !usuario) {
            return res.status(401).json({ success: false, message: "Email ou senha incorretos" });
        }
        res.json({ success: true, user: { nome: usuario.nome_completo, funcao: usuario.funcao } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase.from('usuarios').select('*').order('id', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { nome_completo, email, funcao, senha } = req.body;
    try {
        const { data, error } = await supabase.from('usuarios').insert([{ nome_completo, email, funcao, senha }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================================
// MONITORAMENTO (DASHBOARD)
// ==========================================================

app.get('/api/monitoramento', async (req, res) => {
    try {
        const { data: eq } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
        const { data: metricas } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
        const { data: logs } = await supabase.from('logs_operacao').select('*').order('data_inicio', { descending: true }).limit(5);

        const operando = logs?.filter(l => l.status === 'em_andamento').length || 0;
        const paradas = eq?.paradas_emergencia_count || 0;

        res.json({
            graficoLinha: { 
                ini: metricas?.map(m => m.inicializacoes_count) || [0,0,0,0,0,0,0], 
                pe: metricas?.map(m => m.paradas_emergencia_count) || [0,0,0,0,0,0,0] 
            },
            graficoBarraHoriz: {
                ini: metricas?.map(m => m.inicializacoes_count) || [0,0,0,0,0,0,0],
                pe: metricas?.map(m => m.paradas_emergencia_count) || [0,0,0,0,0,0,0]
            },
            graficoRosca: [operando, 5, paradas], 
            status: {
                isOnline: eq?.status_atual === 'online',
                emergencyStops: paradas,
                uptime: `${eq?.uptime_minutos || 0} min`,
                lastBoot: eq?.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString() : '--'
            },
            logsTabela: logs?.map(l => ({
                data: new Date(l.data_inicio).toLocaleDateString(),
                inicio: new Date(l.data_inicio).toLocaleTimeString(),
                fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString() : 'Rodando...',
                tempo: l.duracao_minutos ? `${l.duracao_minutos}m` : '--',
                isNormal: l.tipo_evento !== 'parada_emergencia'
            })) || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// CONTROLE DA ESTEIRA (PLAY / STOP / STATUS)
// ==========================================================

app.get('/api/esteira/status', async (req, res) => {
    try {
        const { data: logAtivo, error } = await supabase.from('logs_operacao').select('*').eq('status', 'em_andamento').eq('equipamento_id', 1).maybeSingle();
        if (error) throw error;
        res.json({ ligado: !!logAtivo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/esteira/play', async (req, res) => {
    try {
        await supabase.from('equipamentos').update({ status_atual: 'online', ultima_inicializacao: new Date() }).eq('id', 1);
        const { error } = await supabase.from('logs_operacao').insert([{ 
            equipamento_id: 1, 
            status: 'em_andamento', 
            tipo_evento: 'operacao_normal',
            data_inicio: new Date().toISOString(),
            descricao: 'Iniciado via Painel de Controle'
        }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/esteira/stop', async (req, res) => {
    try {
        await supabase.from('equipamentos').update({ status_atual: 'offline' }).eq('id', 1);
        const { data: logAberto } = await supabase.from('logs_operacao').select('*').eq('status', 'em_andamento').eq('equipamento_id', 1).maybeSingle();

        if (logAberto) {
            const dataFim = new Date();
            const duracaoMs = dataFim - new Date(logAberto.data_inicio);
            const duracaoMinutos = Math.max(1, Math.round(duracaoMs / 60000));

            await supabase.from('logs_operacao').update({ 
                data_fim: dataFim.toISOString(),
                duracao_minutos: duracaoMinutos,
                status: 'finalizado'
            }).eq('id', logAberto.id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
}
