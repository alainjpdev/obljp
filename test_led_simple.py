#!/usr/bin/env python3
import serial
import time

def test_led_simple():
    try:
        print("🔌 Conectando al Pico W...")
        ser = serial.Serial('/dev/cu.usbmodem1401', 115200, timeout=2)
        time.sleep(2)
        
        print("📤 Enviando comando simple...")
        
        # Comando muy simple para encender LED
        ser.write(b'from machine import Pin\r\n')
        time.sleep(0.5)
        response = ser.read_all().decode()
        print(f"Respuesta: {response}")
        
        ser.write(b'led = Pin(25, Pin.OUT)\r\n')
        time.sleep(0.5)
        response = ser.read_all().decode()
        print(f"Respuesta: {response}")
        
        ser.write(b'led.value(1)\r\n')
        time.sleep(0.5)
        response = ser.read_all().decode()
        print(f"Respuesta: {response}")
        
        print("⏳ Esperando 3 segundos...")
        time.sleep(3)
        
        ser.write(b'led.value(0)\r\n')
        time.sleep(0.5)
        response = ser.read_all().decode()
        print(f"Respuesta: {response}")
        
        ser.close()
        print("✅ Prueba completada")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_led_simple()