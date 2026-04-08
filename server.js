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
// API: LOGIN E TESTE
// ==========================================================
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase.from('usuarios').select('nome_completo').limit(1);
        if (error) throw error;
        res.json({ status: "✅ Conectado ao Supabase!", data });
    } catch (err) {
        res.status(500).json({ status: "❌ Erro na conexão", message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
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
});

// ==========================================================
// API: USUÁRIOS (CRUD) E PUBLICAÇÕES
// ==========================================================
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase.from('usuarios').select('*').order('id', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const { nome_completo, email, funcao, senha } = req.body;
    try {
        const { data, error } = await supabase.from('usuarios').insert([{ nome_completo, email, funcao, senha }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nome_completo, funcao, senha } = req.body;
    const updateData = { nome_completo, funcao };
    if (senha) updateData.senha = senha;
    try {
        const { data, error } = await supabase.from('usuarios').update(updateData).eq('id', id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: "Usuário deletado" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/publicacoes', async (req, res) => {
    const { titulo, categoria, descricao } = req.body;
    try {
        const { data, error } = await supabase.from('publicacoes').insert([{ titulo, categoria, descricao }]).select();
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// ==========================================================
// API: CONTROLE DA ESTEIRA (O CORAÇÃO DO SISTEMA)
// ==========================================================

// STATUS: Usado pelo frontend para saber se a esteira já estava ligada
app.get('/api/esteira/status', async (req, res) => {
    try {
        const { data: logAtivo, error } = await supabase
            .from('logs_operacao')
            .select('*')
            .eq('status', 'em_andamento')
            .eq('equipamento_id', 1)
            .maybeSingle();

        if (error) throw error;
        res.json({ ligado: !!logAtivo });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PLAY: Liga o equipamento e abre um log de tempo
app.post('/api/esteira/play', async (req, res) => {
    try {
        // 1. Marca o equipamento como Online
        await supabase.from('equipamentos').update({ 
            status_atual: 'online', 
            ultima_inicializacao: new Date() 
        }).eq('id', 1);

        // 2. Abre o log de operação
        const { error } = await supabase
            .from('logs_operacao')
            .insert([{ 
                equipamento_id: 1, 
                status: 'em_andamento', 
                tipo_evento: 'operacao_normal',
                data_inicio: new Date().toISOString()
            }]);

        if (error) throw error;
        res.json({ success: true, message: "Esteira ligada" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// STOP: Desliga o equipamento, fecha o log e calcula duração
app.post('/api/esteira/stop', async (req, res) => {
    try {
        // 1. Marca o equipamento como Offline
        await supabase.from('equipamentos').update({ status_atual: 'offline' }).eq('id', 1);

        // 2. Localiza o log que está "em_andamento"
        const { data: logAberto, error: errBusca } = await supabase
            .from('logs_operacao')
            .select('*')
            .eq('status', 'em_andamento')
            .eq('equipamento_id', 1)
            .maybeSingle();

        if (errBusca) throw errBusca;

        if (logAberto) {
            const dataInicio = new Date(logAberto.data_inicio);
            const dataFim = new Date();
            // Diferença em minutos
            const duracaoMs = dataFim - dataInicio;
            const duracaoMinutos = Math.max(1, Math.round(duracaoMs / 60000));

            // 3. Fecha o log com os dados finais
            await supabase.from('logs_operacao').update({ 
                data_fim: dataFim.toISOString(),
                duracao_minutos: duracaoMinutos,
                status: 'finalizado'
            }).eq('id', logAberto.id);
        }

        res.json({ success: true, message: "Esteira desligada e tempo registrado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================================
// API: MONITORAMENTO (DASHBOARD)
// ==========================================================
app.get('/api/monitoramento', async (req, res) => {
    try {
        const { data: eq, error: err1 } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
        const { data: metricas, error: err2 } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
        const { data: logs, error: err3 } = await supabase.from('logs_operacao').select('*').order('data_inicio', { ascending: false }).limit(5);

        if (err1 || err2 || err3) throw new Error("Erro ao buscar dados");

        res.json({
            graficoLinha: { 
                ini: metricas?.map(m => m.inicializacoes_count) || [], 
                pe: metricas?.map(m => m.paradas_emergencia_count) || [] 
            },
            status: {
                isOnline: eq?.status_atual === 'online',
                emergencyStops: eq?.paradas_emergencia_count || 0,
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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================================
// EXPORTAÇÃO E INICIALIZAÇÃO
// ==========================================================
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Servidor VECTRA rodando em http://localhost:${PORT}`));
}
