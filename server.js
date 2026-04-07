const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer'); // Movido aqui para cima por organização

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

// ==========================================================
// ROTAS DE USUÁRIOS
// ==========================================================

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
  const { nome_completo, senha } = req.body; 
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    let query = 'UPDATE usuarios SET nome_completo = ?';
    let params = [nome_completo];

    if (senha) {
      query += ', senha = ?';
      params.push(senha);
    }

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


// ==========================================================
// ROTA: LIGAR A MÁQUINA (Registra no Dashboard)
// ==========================================================
app.post('/api/esteira/play', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // 1. Muda status para 'online' e salva a hora de inicialização
        await connection.execute(`UPDATE equipamentos SET status_atual = 'online', ultima_inicializacao = NOW() WHERE id = 1`);
        
        // 2. Cria o log de atividade na tabela
        await connection.execute(`INSERT INTO logs_operacao (equipamento_id, tipo_evento, data_inicio, descricao) VALUES (1, 'inicializacao', NOW(), 'Máquina ligada pelo Painel de Controle')`);
        
        // 3. Atualiza o Gráfico de Barras
        await connection.execute(`
            INSERT INTO metricas_diarias (equipamento_id, data_registro, inicializacoes_count) 
            VALUES (1, CURDATE(), 1) 
            ON DUPLICATE KEY UPDATE inicializacoes_count = inicializacoes_count + 1
        `);

        res.json({ success: true, message: 'Máquina iniciada no sistema.' });
    } catch (err) {
        console.error("Erro no BD (Play):", err);
        res.status(500).json({ error: 'Erro ao registrar no banco' });
    } finally {
        if (connection) connection.end();
    }
});

// ==========================================================
// ROTA: PARAR A MÁQUINA (Calcula Uptime e Registra Parada)
// ==========================================================
app.post('/api/esteira/stop', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // 1. Calcula quantos minutos a máquina ficou ligada (Uptime)
        const [rows] = await connection.execute(`SELECT ultima_inicializacao FROM equipamentos WHERE id = 1 AND status_atual = 'online'`);
        let minutosAtivos = 0;
        
        if (rows.length > 0 && rows[0].ultima_inicializacao) {
            const horaInicio = new Date(rows[0].ultima_inicializacao);
            const horaAtual = new Date();
            minutosAtivos = Math.floor((horaAtual - horaInicio) / 1000 / 60); 
        }

        // 2. Muda status para 'offline', soma os minutos de uptime e registra a parada
        await connection.execute(`
            UPDATE equipamentos 
            SET status_atual = 'offline', 
                uptime_minutos = uptime_minutos + ?, 
                paradas_emergencia_count = paradas_emergencia_count + 1 
            WHERE id = 1
        `, [minutosAtivos]);

        // 3. Cria o log de parada
        await connection.execute(`INSERT INTO logs_operacao (equipamento_id, tipo_evento, data_inicio, descricao) VALUES (1, 'parada_emergencia', NOW(), 'Máquina desligada pelo Painel de Controle')`);
        
        // 4. Atualiza os gráficos de Barras e Uptime diário
        await connection.execute(`
            INSERT INTO metricas_diarias (equipamento_id, data_registro, paradas_emergencia_count, tempo_operando_minutos) 
            VALUES (1, CURDATE(), 1, ?) 
            ON DUPLICATE KEY UPDATE 
                paradas_emergencia_count = paradas_emergencia_count + 1,
                tempo_operando_minutos = tempo_operando_minutos + ?
        `, [minutosAtivos, minutosAtivos]);

        res.json({ success: true, message: 'Máquina parada no sistema.' });
    } catch (err) {
        console.error("Erro no BD (Stop):", err);
        res.status(500).json({ error: 'Erro ao registrar no banco' });
    } finally {
        if (connection) connection.end();
    }
});

// ==========================================================
// ROTA: SUPORTE (Registra tickets e manutenções)
// ==========================================================
const upload = multer({ dest: 'uploads/' }); 

app.post('/api/publicacoes', upload.single('arquivo'), async (req, res) => {
    const { titulo, categoria, descricao, usuario_id } = req.body;
    const arquivo = req.file; 
    let connection;
  
    try {
        connection = await mysql.createConnection(dbConfig);
        const caminhoArquivo = arquivo ? arquivo.path : null;
  
        // 1. Salva o ticket
        await connection.execute(
            'INSERT INTO publicacoes (titulo, categoria, descricao, usuario_id, caminho_arquivo) VALUES (?, ?, ?, ?, ?)',
            [titulo, categoria, descricao, usuario_id || null, caminhoArquivo]
        );
  
        // 2. Se a categoria for manutenção, atualiza os gráficos do Dashboard!
        if (categoria === 'manutencao' || categoria === 'Manutenção') { 
            
            await connection.execute(
                `INSERT INTO logs_operacao (equipamento_id, usuario_id, tipo_evento, data_inicio, descricao) VALUES (1, ?, 'manutencao', NOW(), ?)`, 
                [usuario_id || null, `Ticket Suporte: ${titulo}`]
            );
            
            await connection.execute(`
                INSERT INTO metricas_diarias (equipamento_id, data_registro, tempo_manutencao_minutos) 
                VALUES (1, CURDATE(), 60) 
                ON DUPLICATE KEY UPDATE tempo_manutencao_minutos = tempo_manutencao_minutos + 60
            `);
        }
  
        res.json({ success: true, message: 'Publicação registrada!' });
    } catch (err) {
        console.error("Erro BD (Suporte):", err);
        res.status(500).json({ error: 'Erro ao salvar publicação' });
    } finally {
        if (connection) connection.end();
    }
});

// ==========================================================
// ROTA: MONITORAMENTO (Busca dados para o Dashboard)
// ==========================================================
app.get('/api/monitoramento', async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);

    const [metricas] = await connection.execute(
      'SELECT inicializacoes_count, paradas_emergencia_count, tempo_operando_minutos, tempo_manutencao_minutos FROM metricas_diarias ORDER BY data_registro ASC LIMIT 7'
    );

    const arrayIni = metricas.map(m => m.inicializacoes_count);
    const arrayPe = metricas.map(m => m.paradas_emergencia_count);

    const totalOperando = metricas.reduce((acc, curr) => acc + Number(curr.tempo_operando_minutos), 0);
    const totalManutencao = metricas.reduce((acc, curr) => acc + Number(curr.tempo_manutencao_minutos), 0);
    const totalParadas = metricas.reduce((acc, curr) => acc + Number(curr.paradas_emergencia_count), 0);

    const [equipamento] = await connection.execute(
      'SELECT status_atual, ultima_inicializacao, uptime_minutos, paradas_emergencia_count FROM equipamentos WHERE id = 1'
    );
    const eq = equipamento[0] || {};
    
    const horasUptime = Math.floor((eq.uptime_minutos || 0) / 60);
    const minutosUptime = (eq.uptime_minutos || 0) % 60;

    const [logs] = await connection.execute(
      'SELECT tipo_evento, DATE_FORMAT(data_inicio, "%d/%m/%Y") as data_formatada, DATE_FORMAT(data_inicio, "%H:%i") as hora_inicio, DATE_FORMAT(data_fim, "%H:%i") as hora_fim, duracao_minutos FROM logs_operacao ORDER BY data_inicio DESC LIMIT 5'
    );

    const logsFormatados = logs.map(log => ({
      data: log.data_formatada,
      inicio: log.hora_inicio,
      fim: log.hora_fim || '--:--',
      tempo: log.duracao_minutos ? `${Math.floor(log.duracao_minutos / 60)}h ${log.duracao_minutos % 60}m` : '--',
      isNormal: log.tipo_evento !== 'parada_emergencia' 
    }));

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
