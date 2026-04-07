const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Na Vercel, a porta é dinâmica
const PORT = process.env.PORT || 3300;

// CONFIGURAÇÃO - Use a SECRET KEY (aquela que começa com sb_secret)
const supabaseUrl = 'https://ncdviiijzbbqugyiusyq.supabase.co';
const supabaseKey = 'sb_secret_LLg5qptkujdxgtS4OEjxBg_JBi6luHc'; 

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Serve os arquivos da pasta frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota Principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

// ==========================================================
// ROTA DE MONITORAMENTO (Para o seu Dashboard mostrar os dados)
// ==========================================================
app.get('/api/monitoramento', async (req, res) => {
  try {
    // Busca dados do Equipamento (id 1)
    const { data: eq, error: err1 } = await supabase
      .from('equipamentos')
      .select('*')
      .eq('id', 1)
      .single();

    // Busca as Métricas Diárias
    const { data: metricas, error: err2 } = await supabase
      .from('metricas_diarias')
      .select('*')
      .order('data_registro', { ascending: true })
      .limit(7);

    // Busca os logs recentes
    const { data: logs, error: err3 } = await supabase
      .from('logs_operacao')
      .select('*')
      .order('data_inicio', { ascending: false })
      .limit(5);

    if (err1 || err2 || err3) throw new Error("Erro ao buscar dados no Supabase");

    // Formata a resposta para o seu Dashboard (Gráficos e Tabela)
    res.json({
      graficoLinha: { 
        ini: metricas.map(m => m.inicializacoes_count), 
        pe: metricas.map(m => m.paradas_emergencia_count) 
      },
      status: {
        isOnline: eq.status_atual === 'online',
        emergencyStops: eq.paradas_emergencia_count,
        uptime: `${eq.uptime_minutos || 0} min`,
        lastBoot: eq.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString() : '--'
      },
      logsTabela: logs.map(l => ({
        data: new Date(l.data_inicio).toLocaleDateString(),
        inicio: new Date(l.data_inicio).toLocaleTimeString(),
        fim: l.data_fim ? new Date(l.data_fim).toLocaleTimeString() : '--',
        tempo: l.duracao_minutos ? `${l.duracao_minutos}m` : '--',
        isNormal: l.tipo_evento !== 'parada_emergencia'
      }))
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