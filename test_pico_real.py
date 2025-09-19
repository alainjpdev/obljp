#!/usr/bin/env python3
import serial
import time

def test_pico_direct():
    try:
        print("🔌 Conectando al Pico W...")
        ser = serial.Serial('/dev/cu.usbmodem1401', 115200, timeout=2)
        time.sleep(2)
        
        print("📤 Enviando código de prueba...")
        
        # Código simple para probar LED en pin 25
        commands = [
            'print("=== PRUEBA LED PIN 25 ===")',
            'from machine import Pin',
            'import time',
            'led = Pin(25, Pin.OUT)',
            'print("LED configurado en pin 25")',
            'for i in range(5):',
            '    print(f"Parpadeo {i+1}")',
            '    led.value(1)',
            '    time.sleep(0.5)',
            '    led.value(0)',
            '    time.sleep(0.5)',
            'print("Prueba completada")'
        ]
        
        for cmd in commands:
            ser.write((cmd + '\r\n').encode())
            time.sleep(0.2)
            response = ser.read_all().decode()
            if response:
                print(f"Pico: {response.strip()}")
        
        ser.close()
        print("✅ Código enviado al Pico")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_pico_direct()
