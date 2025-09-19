#!/usr/bin/env python3
import serial
import time

def test_led_blink():
    try:
        print("🔌 Conectando al Pico W...")
        ser = serial.Serial('/dev/cu.usbmodem1401', 115200, timeout=2)
        time.sleep(2)
        
        print("📤 Iniciando parpadeo rápido...")
        
        # Configurar LED
        ser.write(b'from machine import Pin\r\n')
        time.sleep(0.5)
        ser.write(b'led = Pin("LED", Pin.OUT)\r\n')
        time.sleep(0.5)
        
        print("💡 Parpadeando 10 veces muy rápido...")
        
        # Parpadeo rápido
        for i in range(10):
            ser.write(b'led.value(1)\r\n')
            time.sleep(0.1)
            ser.write(b'led.value(0)\r\n')
            time.sleep(0.1)
            print(f"Parpadeo {i+1}/10")
        
        print("✅ Parpadeo completado")
        
        ser.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_led_blink()
