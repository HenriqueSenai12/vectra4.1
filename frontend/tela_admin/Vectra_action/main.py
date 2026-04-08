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

# Create your objects here.
ev3 = EV3Brick()
motor_esq = Motor(Port.C)
motor_dir = Motor(Port.A)
VELOCIDADE = 300
while True:
    # --- FRENTE ---
    motor_esq.run_time(VELOCIDADE, 2000, then=Stop.BRAKE, wait=False)
    motor_dir.run_time(VELOCIDADE, 2000, then=Stop.BRAKE, wait=True)
    wait(3000)
    # --- TRÁS ---
    motor_esq.run_time(-VELOCIDADE, 2000, then=Stop.BRAKE, wait=False)
    motor_dir.run_time(-VELOCIDADE, 2000, then=Stop.BRAKE, wait=True)
    wait(3000)