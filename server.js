const express = require('express'); // Corrigido: era 'Const'
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
// ARQUIVOS ESTÁTICOS (Prioridade para a Vercel)
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
// ROTAS DE API (Login, Users, Monitoramento, Esteira)
// ==========================================================

// ... (Mantenha todas as suas rotas app.post/api/... exatamente como você já escreveu)
// Elas estão corretas.

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

// ... (Mantenha as rotas da esteira: /api/esteira/status, play, stop)

// ==========================================================
// EXPORTAÇÃO (VITAL PARA VERCEL)
// ==========================================================
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
}
