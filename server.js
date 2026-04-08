const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3300;

// ==========================================================
// CONFIGURAÇÃO ÚNICA DO SUPABASE
// Prioriza as variáveis da Vercel, se não existirem, usa as fixas
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

// ==========================================================
// ROTAS
// ==========================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ROTA DE TESTE DE BANCO (Para você ter certeza)
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase.from('usuarios').select('nome_completo').limit(1);
        if (error) throw error;
        res.json({ status: "✅ Conectado ao Supabase!", data });
    } catch (err) {
        res.status(500).json({ status: "❌ Erro na conexão", message: err.message });
    }
});

// ROTA DE LOGIN (Verifica se o usuário existe e a senha bate)
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
// ROTAS DE USUÁRIOS (CRUD - CONNECTADO AO SUPABASE)
// ==========================================================

// 1. Listar todos os usuários (GET)
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .order('id', { ascending: true }); // Ordena por ID

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Criar novo usuário (POST)
app.post('/api/users', async (req, res) => {
    const { nome_completo, email, funcao, senha } = req.body;

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ nome_completo, email, funcao, senha }])
            .select(); // Retorna o usuário criado

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        // Se o email já existir, o Supabase vai disparar um erro que pegamos aqui
        res.status(400).json({ error: err.message });
    }
});

// 3. Atualizar usuário (PUT)
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nome_completo, funcao, senha } = req.body;

    // Montamos um objeto só com o que vai ser atualizado
    const updateData = { nome_completo, funcao };
    
    // Se a senha foi preenchida, nós a atualizamos. Se veio vazia, ignoramos.
    if (senha) {
        updateData.senha = senha;
    }

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 4. Deletar usuário (DELETE)
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: "Usuário deletado com sucesso!" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});



// ROTA PARA LISTAR TODOS OS USUÁRIOS (Para o painel administrativo)
app.get('/api/usuarios', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome_completo, email, funcao, data_registro');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================================
// ROTA DE SUPORTE / PUBLICAÇÕES
// ==========================================================

app.post('/api/publicacoes', async (req, res) => {
    const { titulo, categoria, descricao } = req.body;

    try {
        const { data, error } = await supabase
            .from('publicacoes')
            .insert([{ 
                titulo: titulo, 
                categoria: categoria, 
                descricao: descricao 
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
    }
});


app.get('/api/monitoramento', async (req, res) => {
    try {
        const { data: eq } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
        const { data: metricas } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
        const { data: logs } = await supabase.from('logs_operacao').select('*').order('data_inicio', { descending: true }).limit(5);

        // Cálculos para o gráfico de Donut (Exemplo de lógica)
        const totalLogs = logs?.length || 0;
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
            [span_0](start_span)graficoRosca: [operando, 5, paradas], // Operando, Manutenção (fixo), Paradas[span_0](end_span)
            status: {
                [span_1](start_span)[span_2](start_span)isOnline: eq?.status_atual === 'online',[span_1](end_span)[span_2](end_span)
                emergencyStops: eq?.paradas_emergencia_count || [span_3](start_span)[span_4](start_span)0,[span_3](end_span)[span_4](end_span)
                uptime: `${eq?.uptime_minutos || [span_5](start_span)[span_6](start_span)0} min`,[span_5](end_span)[span_6](end_span)
                [span_7](start_span)[span_8](start_span)lastBoot: eq?.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString() : '--'[span_7](end_span)[span_8](end_span)
            },
            logsTabela: logs?.map(l => ({
                [span_9](start_span)[span_10](start_span)data: new Date(l.data_inicio).toLocaleDateString(),[span_9](end_span)[span_10](end_span)
                [span_11](start_span)[span_12](start_span)inicio: new Date(l.data_inicio).toLocaleTimeString(),[span_11](end_span)[span_12](end_span)
                [span_13](start_span)[span_14](start_span)fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString() : 'Rodando...',[span_13](end_span)[span_14](end_span)
                tempo: l.duracao_minutos ? [span_15](start_span)[span_16](start_span)`${l.duracao_minutos}m` : '--',[span_15](end_span)[span_16](end_span)
                [span_17](start_span)[span_18](start_span)isNormal: l.tipo_evento !== 'parada_emergencia'[span_17](end_span)[span_18](end_span)
            })) || []
        });
    } catch (err) {
        [span_19](start_span)[span_20](start_span)res.status(500).json({ error: err.message });[span_19](end_span)[span_20](end_span)
    }
});


// ==========================================================
// CONTROLE DA ESTEIRA (PLAY / STOP / STATUS)
// ==========================================================

// 1. ROTA DE STATUS: Verifica se a máquina está ligada ao carregar a página
app.get('/api/esteira/status', async (req, res) => {
    try {
        const { data: logAtivo, error } = await supabase
            .from('logs_operacao')
            .select('*')
            .eq('status', 'em_andamento')
            .eq('equipamento_id', 1)
            .maybeSingle();

        if (error) throw error;
        // Retorna true se houver um log "em_andamento"
        res.json({ ligado: !!logAtivo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. ROTA PLAY: Inicia a operação e atualiza o status do equipamento
app.post('/api/esteira/play', async (req, res) => {
    try {
        // Atualiza o status na tabela de equipamentos
        await supabase.from('equipamentos').update({ status_atual: 'online', ultima_inicializacao: new Date() }).eq('id', 1);

        // Cria o log de início
        const { error } = await supabase
            .from('logs_operacao')
            .insert([{ 
                equipamento_id: 1, 
                status: 'em_andamento', 
                tipo_evento: 'operacao_normal',
                descricao: 'Iniciado via Painel de Controle'
            }]);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. ROTA STOP: Finaliza, calcula a duração e atualiza o equipamento
app.post('/api/esteira/stop', async (req, res) => {
    try {
        // Atualiza status do equipamento
        await supabase.from('equipamentos').update({ status_atual: 'offline' }).eq('id', 1);

        // Busca o log que estava aberto
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
            // Calcula duração em minutos
            const duracaoMs = dataFim - dataInicio;
            const duracaoMinutos = Math.max(1, Math.round(duracaoMs / 60000));

            // Atualiza o log para finalizado
            const { error: errUpdate } = await supabase
                .from('logs_operacao')
                .update({ 
                    data_fim: dataFim.toISOString(),
                    duracao_minutos: duracaoMinutos,
                    status: 'finalizado'
                })
                .eq('id', logAberto.id);

            if (errUpdate) throw errUpdate;
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// MONITORAMENTO (ESTATÍSTICAS)
// ==========================================================
<script src="../js/painel.js"></script>


// Exporta para a Vercel
module.exports = app;


// Exporta para a Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}
