const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer'); 

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
// ==========================================================
// ROTA: PARAR A MÁQUINA (Calcula Uptime e Registra Parada)
// ==========================================================
app.post('/api/esteira/stop', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // 1. Calcula os SEGUNDOS que a máquina ficou ligada (Uptime)
        const [rows] = await connection.execute(`SELECT ultima_inicializacao FROM equipamentos WHERE id = 1 AND status_atual = 'online'`);
        let segundosAtivos = 0;
        
        if (rows.length > 0 && rows[0].ultima_inicializacao) {
            const horaInicio = new Date(rows[0].ultima_inicializacao);
            const horaAtual = new Date();
            segundosAtivos = Math.floor((horaAtual - horaInicio) / 1000); 
            
            // Trava de segurança para evitar cálculos negativos em caso de fuso horário errado do PC
            if (segundosAtivos < 0) segundosAtivos = 0; 
        }

        // 2. Muda status para 'offline', soma os segundos de uptime
        await connection.execute(`
            UPDATE equipamentos 
            SET status_atual = 'offline', 
                uptime_segundos = uptime_segundos + ?, 
                paradas_emergencia_count = paradas_emergencia_count + 1 
            WHERE id = 1
        `, [segundosAtivos]);

        // 3. ATUALIZA O LOG (Dividido em duas etapas para evitar erro de sintaxe do MySQL)
        // Primeiro busca qual é o ID do log da sessão atual
        const [openLogs] = await connection.execute(`
            SELECT id FROM logs_operacao 
            WHERE equipamento_id = 1 AND data_fim IS NULL 
            ORDER BY id DESC LIMIT 1
        `);
        
        // Se encontrou um log aberto, atualiza ele
        if (openLogs.length > 0) {
            await connection.execute(`
                UPDATE logs_operacao 
                SET data_fim = NOW(), 
                    duracao_segundos = ?
                WHERE id = ?
            `, [segundosAtivos, openLogs[0].id]);
        }
        
        // 4. Atualiza os gráficos de Barras e Uptime diário
        await connection.execute(`
            INSERT INTO metricas_diarias (equipamento_id, data_registro, paradas_emergencia_count, tempo_operando_segundos) 
            VALUES (1, CURDATE(), 1, ?) 
            ON DUPLICATE KEY UPDATE 
                paradas_emergencia_count = paradas_emergencia_count + 1,
                tempo_operando_segundos = tempo_operando_segundos + ?
        `, [segundosAtivos, segundosAtivos]);

        res.json({ success: true, message: 'Máquina parada e log atualizado.' });
    } catch (err) {
        // Log melhorado para mostrar exatamente o que deu erro no terminal
        console.error("🔴 Erro detalhado no BD (Stop):", err.message); 
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
            
            // 👇 Adiciona 3600 segundos (1 hora) ao gráfico de manutenção
            await connection.execute(`
                INSERT INTO metricas_diarias (equipamento_id, data_registro, tempo_manutencao_segundos) 
                VALUES (1, CURDATE(), 3600) 
                ON DUPLICATE KEY UPDATE tempo_manutencao_segundos = tempo_manutencao_segundos + 3600
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
      'SELECT inicializacoes_count, paradas_emergencia_count, tempo_operando_segundos, tempo_manutencao_segundos FROM metricas_diarias ORDER BY data_registro ASC LIMIT 7'
    );

    const arrayIni = metricas.map(m => m.inicializacoes_count);
    const arrayPe = metricas.map(m => m.paradas_emergencia_count);

    // Soma total em Segundos
    const totalOperandoSeg = metricas.reduce((acc, curr) => acc + Number(curr.tempo_operando_segundos), 0);
    const totalManutencaoSeg = metricas.reduce((acc, curr) => acc + Number(curr.tempo_manutencao_segundos), 0);
    const totalParadas = metricas.reduce((acc, curr) => acc + Number(curr.paradas_emergencia_count), 0);

    const [equipamento] = await connection.execute(
      'SELECT status_atual, ultima_inicializacao, uptime_segundos, paradas_emergencia_count FROM equipamentos WHERE id = 1'
    );
    const eq = equipamento[0] || {};
    
    // 👇 Calcula o tempo real se a máquina estiver ligada neste momento
    let totalSegundosUptime = eq.uptime_segundos || 0;
    if (eq.status_atual === 'online' && eq.ultima_inicializacao) {
        const agora = new Date();
        const inicio = new Date(eq.ultima_inicializacao);
        const segundosRodandoAgora = Math.floor((agora - inicio) / 1000);
        totalSegundosUptime += segundosRodandoAgora;
    }

    // Formata o uptime total de segundos para Horas, Minutos e Segundos
    const horasUptime = Math.floor(totalSegundosUptime / 3600);
    const minutosUptime = Math.floor((totalSegundosUptime % 3600) / 60);
    const segundosUptime = totalSegundosUptime % 60;

    // 👇 Adicionado %s para buscar os segundos no MySQL
    const [logs] = await connection.execute(
      'SELECT tipo_evento, DATE_FORMAT(data_inicio, "%d/%m/%Y") as data_formatada, DATE_FORMAT(data_inicio, "%H:%i:%s") as hora_inicio, DATE_FORMAT(data_fim, "%H:%i:%s") as hora_fim, duracao_segundos FROM logs_operacao ORDER BY data_inicio DESC LIMIT 5'
    );

    const logsFormatados = logs.map(log => {
      let tempoFormatado = '--';
      
      // Converte duração em segundos para HH:MM:SS
      if (log.duracao_segundos !== null) {
          const h = Math.floor(log.duracao_segundos / 3600);
          const m = Math.floor((log.duracao_segundos % 3600) / 60);
          const s = log.duracao_segundos % 60;
          
          if (h > 0) {
              tempoFormatado = `${h}h ${m}m ${s}s`;
          } else if (m > 0) {
              tempoFormatado = `${m}m ${s}s`;
          } else {
              tempoFormatado = `${s}s`;
          }
      }

      return {
        data: log.data_formatada,
        inicio: log.hora_inicio,
        fim: log.hora_fim || '--:--:--',
        tempo: tempoFormatado,
        isNormal: log.tipo_evento !== 'parada_emergencia' 
      };
    });

    res.json({
        graficoLinha: { ini: arrayIni, pe: arrayPe },
        graficoBarra: { ini: arrayIni, pe: arrayPe },
        graficoBarraHoriz: { ini: arrayIni, pe: arrayPe },
        // Divide por 60 para o gráfico de rosca continuar equilibrado e não ser engolido pelos segundos
        graficoRosca: [Math.floor(totalOperandoSeg / 60), Math.floor(totalManutencaoSeg / 60), totalParadas],
        status: {
            isOnline: eq.status_atual === 'online',
            emergencyStops: eq.paradas_emergencia_count || 0,
            uptime: `${horasUptime}h ${minutosUptime}m ${segundosUptime}s`, // 👈 Mostra os Segundos
            lastBoot: eq.ultima_inicializacao ? new Date(eq.ultima_inicializacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : '--'
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