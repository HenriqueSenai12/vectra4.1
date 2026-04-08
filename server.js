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
// ROTAS GERAIS
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
// ROTAS DE USUÁRIOS (CRUD)
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

// 2. ROTA PLAY: Inicia a operação, atualiza status e REGISTRA O OPERADOR
app.post('/api/esteira/play', async (req, res) => {
    // Recebendo os dados do operador enviados pelo frontend
    const { nome, email } = req.body;

    try {
        // Atualiza o status na tabela de equipamentos
        await supabase.from('equipamentos').update({ status_atual: 'online', ultima_inicializacao: new Date() }).eq('id', 1);

        // Cria o log de início incluindo quem apertou o play
        const { error } = await supabase
            .from('logs_operacao')
            .insert([{ 
                equipamento_id: 1, 
                status: 'em_andamento', 
                tipo_evento: 'operacao_normal',
                descricao: 'Iniciado via Painel de Controle',
                usuario_nome: nome || 'Sistema',
                usuario_email: email || null
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
// MONITORAMENTO (ESTATÍSTICAS) - FUSO HORÁRIO E DATA BRASIL
// ==========================================================
app.get('/api/monitoramento', async (req, res) => {
    try {
        const { data: eq, error: err1 } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
        const { data: metricas, error: err2 } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
        const { data: logs, error: err3 } = await supabase.from('logs_operacao').select('*').order('data_inicio', { ascending: false }).limit(10); // Limite de 10 na tabela

        if (err1 || err2 || err3) throw new Error("Erro ao buscar dados no Supabase");

        // Regras para forçar fuso horário de Brasília, modelo 24h e segundos
        const opcoesHora = { 
            timeZone: 'America/Sao_Paulo', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false // Remove AM/PM
        };
        
        const opcoesData = {
            timeZone: 'America/Sao_Paulo'
        };

        res.json({
            graficoLinha: { 
                ini: metricas?.map(m => m.inicializacoes_count) || [], 
                pe: metricas?.map(m => m.paradas_emergencia_count) || [] 
            },
            status: {
                isOnline: eq?.status_atual === 'online',
                emergencyStops: eq?.paradas_emergencia_count || 0,
                uptime: `${eq?.uptime_minutos || 0} min`,
                lastBoot: eq?.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString('pt-BR', opcoesHora) : '--'
            },
            logsTabela: logs?.map(l => ({
                data: new Date(l.data_inicio).toLocaleDateString('pt-BR', opcoesData),
                inicio: new Date(l.data_inicio).toLocaleTimeString('pt-BR', opcoesHora),
                fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString('pt-BR', opcoesHora) : 'Rodando...',
                tempo: l.duracao_minutos ? `${l.duracao_minutos}m` : '--',
                operador: l.usuario_nome || l.usuario_email || 'Sistema',
                isNormal: l.tipo_evento !== 'parada_emergencia'
            })) || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================================

// Exporta para a Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}
