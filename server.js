const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3300;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));





app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vectra_db',
  port: 3306
};

app.get('/api/users', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, nome_completo as name, email, funcao as role, senha FROM usuarios');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  } finally {
    if (connection) connection.end();
  }
});

// Rota para buscar os dados de um ÚNICO usuário logado
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, nome_completo, email, funcao, senha FROM usuarios WHERE id = ?', [id]);
    
    if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Retorna apenas o objeto do usuário (o primeiro item do array)
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  } finally {
    if (connection) connection.end();
  }
});



app.post('/api/users', async (req, res) => {
  const {nome_completo, email, funcao, senha} = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'INSERT INTO usuarios (nome_completo, email, funcao, senha) VALUES (?, ?, ?, ?)',
      [nome_completo, email, funcao, senha]
    );
    res.json({success: true, id: result.insertId});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'DB error'});
  } finally {
    if (connection) connection.end();
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  // Retiramos a 'funcao' daqui, pois ela não deve ser alterada pelo próprio usuário
  const { nome_completo, senha } = req.body; 
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Monta a query dinamicamente
    let query = 'UPDATE usuarios SET nome_completo = ?';
    let params = [nome_completo];

    // Se a senha foi enviada pelo front-end, adiciona ela na atualização
    if (senha) {
      query += ', senha = ?';
      params.push(senha);
    }

    // Finaliza a query com o ID
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await connection.execute(query, params);
    
    if (result.affectedRows === 0) {
        return res.status(404).json({error: 'Usuário não encontrado'});
    }
    
    res.json({success: true});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'DB error'});
  } finally {
    if (connection) connection.end();
  }
});


app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({error: 'Usuário não encontrado'});
    res.json({success: true});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'DB error'});
  } finally {
    if (connection) connection.end();
  }
});

const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

// Configurações de conexão com o EV3 (padrão do ev3dev)
const ev3Config = {
  host: '10.0.1.1', // IP padrão via cabo USB. Se usar Wi-Fi, mude aqui.
  username: 'robot',
  password: 'maker'
};

// Rota para INICIAR o script Python
app.post('/api/esteira/play', async (req, res) => {
  try {
    await ssh.connect(ev3Config);
    // Comando para rodar o arquivo que você já tem no EV3
    // O caminho deve ser o mesmo que está no seu launch.json
    await ssh.execCommand('python3 Vectra/backend/Vectra_action/main.py &'); 
    res.json({ success: true, message: 'Robô iniciado' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao conectar no EV3' });
  }
});

// Rota para PARAR o script
app.post('/api/esteira/stop', async (req, res) => {
  try {
    await ssh.connect(ev3Config);
    // Mata o processo do python no EV3
    await ssh.execCommand('pkill -f main.py');
    res.json({ success: true, message: 'Robô parado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao parar robô' });
  }
});

const multer = require('multer');

// Configuração do Multer para salvar os arquivos na pasta 'uploads'
const upload = multer({ dest: 'uploads/' }); 

// Criando a rota que o front-end está chamando
app.post('/api/publicacoes', upload.single('arquivo'), async (req, res) => {
  // Dados de texto (titulo, categoria, descricao, usuario_id) vêm no req.body
  const { titulo, categoria, descricao, usuario_id } = req.body;
  
  // O arquivo (imagem/pdf) vem no req.file
  const arquivo = req.file; 

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Pegando o caminho do arquivo (se ele foi enviado)
    const caminhoArquivo = arquivo ? arquivo.path : null;

    const [result] = await connection.execute(
      'INSERT INTO publicacoes (titulo, categoria, descricao, usuario_id, caminho_arquivo) VALUES (?, ?, ?, ?, ?)',
      [titulo, categoria, descricao, usuario_id, caminhoArquivo]
    );

    res.json({ success: true, message: 'Publicação salva com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar publicação' });
  } finally {
    if (connection) connection.end();
  }
});

// =================================================================
// ROTA DE MONITORAMENTO (Conexão com o painel front-end)
// =================================================================
// =================================================================
// ROTA DE MONITORAMENTO (Buscando dados REAIS do banco)
// =================================================================
app.get('/api/monitoramento', async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);

    // 1. Busca as métricas dos últimos 7 dias (Para os gráficos de Linha e Barra)
    const [metricas] = await connection.execute(
      'SELECT inicializacoes_count, paradas_emergencia_count, tempo_operando_minutos, tempo_manutencao_minutos FROM metricas_diarias ORDER BY data_registro ASC LIMIT 7'
    );

    // Separa os dados em arrays para o ApexCharts
    const arrayIni = metricas.map(m => m.inicializacoes_count);
    const arrayPe = metricas.map(m => m.paradas_emergencia_count);

    // 2. Calcula os totais para o Gráfico de Rosca (Donut)
    const totalOperando = metricas.reduce((acc, curr) => acc + Number(curr.tempo_operando_minutos), 0);
    const totalManutencao = metricas.reduce((acc, curr) => acc + Number(curr.tempo_manutencao_minutos), 0);
    const totalParadas = metricas.reduce((acc, curr) => acc + Number(curr.paradas_emergencia_count), 0);

    // 3. Busca o status atual do Equipamento (Cards Superiores)
    const [equipamento] = await connection.execute(
      'SELECT status_atual, ultima_inicializacao, uptime_minutos, paradas_emergencia_count FROM equipamentos WHERE id = 1'
    );
    const eq = equipamento[0] || {};
    
    // Formata o uptime de minutos para "Xh Ym"
    const horasUptime = Math.floor((eq.uptime_minutos || 0) / 60);
    const minutosUptime = (eq.uptime_minutos || 0) % 60;

    // 4. Busca os Logs Recentes (Tabela Inferior)
    const [logs] = await connection.execute(
      'SELECT tipo_evento, DATE_FORMAT(data_inicio, "%d/%m/%Y") as data_formatada, DATE_FORMAT(data_inicio, "%H:%i") as hora_inicio, DATE_FORMAT(data_fim, "%H:%i") as hora_fim, duracao_minutos FROM logs_operacao ORDER BY data_inicio DESC LIMIT 5'
    );

    const logsFormatados = logs.map(log => ({
      data: log.data_formatada,
      inicio: log.hora_inicio,
      fim: log.hora_fim || '--:--',
      tempo: log.duracao_minutos ? `${Math.floor(log.duracao_minutos / 60)}h ${log.duracao_minutos % 60}m` : '--',
      // Consideramos "normal" se não for parada de emergência
      isNormal: log.tipo_evento !== 'parada_emergencia' 
    }));

    // 5. Monta o pacote JSON final e envia para o Front-end
    res.json({
        graficoLinha: { ini: arrayIni, pe: arrayPe },
        graficoBarra: { ini: arrayIni, pe: arrayPe },
        graficoBarraHoriz: { ini: arrayIni, pe: arrayPe },
        graficoRosca: [totalOperando, totalManutencao, totalParadas],
        status: {
            isOnline: eq.status_atual === 'online',
            emergencyStops: eq.paradas_emergencia_count || 0,
            uptime: `${horasUptime}h ${minutosUptime}m`,
            lastBoot: eq.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--'
        },
        logsTabela: logsFormatados
    });

  } catch (err) {
    console.error("Erro na rota de monitoramento:", err);
    res.status(500).json({ error: 'Erro ao buscar dados do monitoramento no banco de dados' });
  } finally {
    if (connection) connection.end();
  }
});


app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});

