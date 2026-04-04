#!/usr/bin/env pybricks-micropython

# Importamos o 'socket' para permitir a comunicação pela rede
import socket
from pybricks.hubs import EV3Brick
from pybricks.ev3devices import (Motor, TouchSensor, ColorSensor,
                                 InfraredSensor, UltrasonicSensor, GyroSensor)
from pybricks.parameters import Port, Stop, Direction, Button, Color
from pybricks.tools import wait, StopWatch, DataLog
from pybricks.robotics import DriveBase
from pybricks.media.ev3dev import SoundFile, ImageFile

# Inicializando o EV3
ev3 = EV3Brick()

# Definindo os motores (sua configuração original)
motor_esq = Motor(Port.C)
motor_dir = Motor(Port.A)
VELOCIDADE = 300

# ==========================================
# CONFIGURAÇÃO DO SERVIDOR WEB NO EV3
# ==========================================
HOST = '0.0.0.0' # Permite receber conexões de qualquer IP (do seu cabo USB)
PORT = 3300      # A porta que definimos no seu HTML

# Prepara o robô para escutar a rede
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind((HOST, PORT))
s.listen(1)

# Um bipe para avisar que o código iniciou e está pronto
ev3.speaker.beep()
print("Servidor do EV3 rodando! Escutando na porta 3300...")

# Loop principal: o robô não anda sozinho, ele fica esperando ordens
while True:
    try:
        # Fica travado aqui aguardando o clique no HTML
        conn, addr = s.accept()
        
        # Recebe a mensagem do navegador (HTML)
        request = conn.recv(1024).decode('utf-8')
        
        # === AÇÕES DOS BOTÕES ===
        
        if '/play' in request:
            print("Comando recebido: INICIAR (Play)")
            # Usamos o .run() simples para girar continuamente até mandarmos parar
            motor_esq.run(VELOCIDADE)
            motor_dir.run(VELOCIDADE)
            resposta = '{"status": "ok", "comando": "play"}'
            
        elif '/stop' in request:
            print("Comando recebido: DESLIGAR (Stop)")
            # Usamos .stop() para cortar a energia dos motores ou frear
            motor_esq.stop()
            motor_dir.stop()
            resposta = '{"status": "ok", "comando": "stop"}'
            
        else:
            resposta = '{"status": "ignorado"}'

        # ==========================================
        # RESPOSTA PARA O HTML (CORS Obrigatório)
        # ==========================================
        # Isso impede que o navegador bloqueie a comunicação por segurança
        http_response = """HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *

""" + resposta

        # Envia a resposta confirmando que o comando foi executado e fecha a conexão
        conn.sendall(http_response.encode('utf-8'))
        conn.close()
        
    except Exception as e:
        print("Erro na conexão ou na execução do motor:", e)