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

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Credenciais do Supabase não encontradas!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// ==========================================================
// ARQUIVOS ESTÁTICOS E ROTAS GERAIS
// ==========================================================
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/image', express.static(path.join(__dirname, 'image')));

app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ==========================================================
// FUNÇÃO AUXILIAR DE FORMATAÇÃO DE TEMPO
// ==========================================================
/**
 * Converte segundos em formato string: 00h 00m 00s
 */
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

// ==========================================================
// ROTAS DE USUÁRIOS E SUPORTE
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

    if (error || !usuario) return res.status(401).json({ success: false, message: "Email ou senha incorretos" });
    res.json({ success: true, user: { nome: usuario.nome_completo, funcao: usuario.funcao } });
});

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
    const { id } = req.params;
    try {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Usuário deletado com sucesso!" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ==========================================================
// CONTROLE DA ESTEIRA (PLAY / STOP / STATUS)
// ==========================================================

app.get('/api/esteira/status', async (req, res) => {
    try {
        const { data: logAtivo, error } = await supabase
            .from('logs_operacao')
            .select('*')
            .eq('status', 'em_andamento')
            .eq('equipamento_id', 1)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        res.json({ ligado: !!logAtivo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

        const { error } = await supabase
            .from('logs_operacao')
            .insert([{ 
                equipamento_id: 1, 
                status: 'em_andamento', 
                tipo_evento: 'operacao_normal',
                descricao: 'Iniciado via Painel de Controle',
                usuario_id: id_do_usuario 
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

        const { data: logAberto, error: errBusca } = await supabase
            .from('logs_operacao')
            .select('*')
            .eq('status', 'em_andamento')
            .eq('equipamento_id', 1)
            .order('data_inicio', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (errBusca) throw errBusca;

        if (logAberto) {
            const dataInicio = new Date(logAberto.data_inicio);
            const dataFim = new Date();
            const duracaoMs = dataFim - dataInicio;
            
            // ATUALIZAÇÃO: Agora salvamos o total de SEGUNDOS para precisão total
            const duracaoSegundos = Math.floor(duracaoMs / 1000);

            const { error: errUpdate } = await supabase
                .from('logs_operacao')
                .update({ 
                    data_fim: dataFim.toISOString(),
                    duracao_minutos: duracaoSegundos, // Guardando segundos nesta coluna
                    status: 'finalizado'
                })
                .eq('id', logAberto.id);

            if (errUpdate) throw errUpdate;
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// MONITORAMENTO (ESTATÍSTICAS)
// ==========================================================
app.get('/api/monitoramento', async (req, res) => {
    try {
        const { data: eq, error: err1 } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
        const { data: metricas, error: err2 } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
        const { data: logs, error: err3 } = await supabase
            .from('logs_operacao')
            .select('*, usuarios(nome_completo, email)') 
            .order('data_inicio', { ascending: false })
            .limit(10);

        if (err1 || err2 || err3) throw new Error("Erro ao buscar dados no Supabase");

        const opcoesHora = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const opcoesData = { timeZone: 'America/Sao_Paulo' };

        res.json({
            graficoLinha: { 
                ini: metricas?.map(m => m.inicializacoes_count) || [], 
                pe: metricas?.map(m => m.paradas_emergencia_count) || [] 
            },
            status: {
                isOnline: eq?.status_atual === 'online',
                emergencyStops: eq?.paradas_emergencia_count || 0,
                // Formata o uptime total do equipamento também para o novo padrão
                uptime: formatarTempoComplexo(eq?.uptime_minutos), 
                lastBoot: eq?.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString('pt-BR', opcoesHora) : '--'
            },
            logsTabela: logs?.map(l => ({
                data: new Date(l.data_inicio).toLocaleDateString('pt-BR', opcoesData),
                inicio: new Date(l.data_inicio).toLocaleTimeString('pt-BR', opcoesHora),
                fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString('pt-BR', opcoesHora) : 'Rodando...',
                // ATUALIZAÇÃO: Usa a função complexa para exibir HHh MMm SSs
                tempo: l.duracao_minutos ? formatarTempoComplexo(l.duracao_minutos) : '--',
                operador: l.usuarios?.nome_completo || 'Sistema', 
                isNormal: l.tipo_evento !== 'parada_emergencia'
            })) || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}
