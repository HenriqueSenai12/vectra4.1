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

    try {
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('senha', senha) // No futuro, use criptografia!
            .single();

        if (error || !usuario) {
            return res.status(401).json({ success: false, message: "E-mail ou senha incorretos" });
        }

        res.json({ 
            success: true, 
            user: { nome: usuario.nome_completo, funcao: usuario.funcao } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Erro no servidor" });
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


app.get('/api/monitoramento', async (req, res) => {
  try {
    const { data: eq, error: err1 } = await supabase.from('equipamentos').select('*').eq('id', 1).maybeSingle();
    const { data: metricas, error: err2 } = await supabase.from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);
    const { data: logs, error: err3 } = await supabase.from('logs_operacao').select('*').order('data_inicio', { ascending: false }).limit(5);

    if (err1 || err2 || err3) throw new Error("Erro ao buscar dados no Supabase");

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
        fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString() : '--',
        tempo: l.duracao_minutos ? `${l.duracao_minutos}m` : '--',
        isNormal: l.tipo_evento !== 'parada_emergencia'
      })) || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exporta para a Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}
