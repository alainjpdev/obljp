#!/usr/bin/env python3
import serial
import time

def test_your_code():
    try:
        print("🔌 Conectando al Pico W...")
        ser = serial.Serial('/dev/cu.usbmodem1401', 115200, timeout=2)
        time.sleep(2)
        
        print("📤 Enviando tu código...")
        
        # Tu código exacto
        commands = [
            'from machine import Pin',
            'from time import sleep',
            'myLed = Pin("LED", Pin.OUT)',
            'print("LED configurado, iniciando parpadeo...")',
            'myLed.value(1)',
            'print("LED ON")',
            'sleep(2)',
            'myLed.value(0)',
            'print("LED OFF")',
            'sleep(1)',
            'print("Prueba completada")'
        ]
        
        for cmd in commands:
            ser.write((cmd + '\r\n').encode())
            time.sleep(0.3)
            response = ser.read_all().decode()
            if response:
                print(f"Pico: {response.strip()}")
        
        ser.close()
        print("✅ Código enviado al Pico")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_your_code()
