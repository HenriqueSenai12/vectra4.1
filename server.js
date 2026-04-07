const express = require('express'); // <-- Corrigido para 'const' minúsculo!
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const PORT = process.env.PORT || 3300;

// Configuração do Supabase
const supabaseUrl = 'https://ncdviiijzbbqugyiusyq.supabase.co';
const supabaseKey = 'sb_publishable_Lwh8-C2Ah3PLP-riPKtq8w_R4oxJgxC'; 
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// ==========================================================
// CONFIGURAÇÃO DOS ARQUIVOS ESTÁTICOS (CSS, IMAGENS, JS)
// A ordem aqui é muito importante! Tem que vir antes das rotas.
// ==========================================================

// 1. Libera a pasta 'frontend' (onde estão seus outros CSS e HTMLs)
// Assim, o HTML vai achar os arquivos em caminhos como "/frontend/tela_admin/dashboard.css"
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// 2. Libera a pasta 'image' (onde estão suas fotos/logos)
app.use('/image', express.static(path.join(__dirname, 'image')));

app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'styles.css'));
});



// ==========================================================
// ROTAS DO SEU SITE
// ==========================================================

// Rota Principal (Tela Inicial)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota de Monitoramento (Para o seu Dashboard mostrar os dados)
app.get('/api/monitoramento', async (req, res) => {
  try {
    const { data: eq, error: err1 } = await supabase
      .from('equipamentos').select('*').eq('id', 1).single();

    const { data: metricas, error: err2 } = await supabase
      .from('metricas_diarias').select('*').order('data_registro', { ascending: true }).limit(7);

    const { data: logs, error: err3 } = await supabase
      .from('logs_operacao').select('*').order('data_inicio', { ascending: false }).limit(5);

    if (err1 || err2 || err3) throw new Error("Erro ao buscar dados no Supabase");

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
