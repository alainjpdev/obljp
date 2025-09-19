#!/usr/bin/env python3
"""
Ejemplo de código para Raspberry Pi Pico
Simula el comportamiento del LED integrado cuando se conecta
"""

import machine
import time

# Configurar el LED integrado en el pin GP25
led = machine.Pin(25, machine.Pin.OUT)

def led_on():
    """Encender el LED"""
    led.value(1)
    print("💡 LED encendido")

def led_off():
    """Apagar el LED"""
    led.value(0)
    print("💡 LED apagado")

def led_blink(times=3, delay=0.5):
    """Parpadear el LED"""
    print(f"✨ LED parpadeando {times} veces")
    for i in range(times):
        led_on()
        time.sleep(delay)
        led_off()
        time.sleep(delay)

def welcome_sequence():
    """Secuencia de bienvenida al conectar"""
    print("🚀 Iniciando secuencia de bienvenida...")
    
    # Encender LED
    led_on()
    time.sleep(1)
    
    # Parpadear 3 veces
    led_blink(3, 0.3)
    
    # Parpadear rápido 5 veces
    led_blink(5, 0.1)
    
    # Mantener encendido
    led_on()
    print("✅ Secuencia de bienvenida completada")

def main():
    """Función principal"""
    print("🔌 Raspberry Pi Pico conectado a OpenBlock Link")
    print("📱 Dispositivo: Raspberry Pi Pico")
    print("🔧 Pin LED: GP25")
    
    # Ejecutar secuencia de bienvenida
    welcome_sequence()
    
    # Mantener el LED encendido mientras esté conectado
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        led_off()
        print("🔌 Desconectado")

if __name__ == "__main__":
    main()
