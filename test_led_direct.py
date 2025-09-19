#!/usr/bin/env python3
import serial
import time

def test_led():
    try:
        # Conectar al Pico
        ser = serial.Serial('/dev/cu.usbmodem1401', 115200, timeout=1)
        time.sleep(2)  # Esperar a que se establezca la conexión
        
        print("Conectado al Pico W...")
        
        # Enviar comando para limpiar
        ser.write(b'\r\n')
        time.sleep(0.1)
        
        # Enviar código Python línea por línea
        code_lines = [
            'from machine import Pin',
            'import time',
            'led = Pin("LED", Pin.OUT)',
            'print("Iniciando parpadeo...")',
            'for i in range(5):',
            '    led.on()',
            '    print("LED ON")',
            '    time.sleep(0.5)',
            '    led.off()',
            '    print("LED OFF")',
            '    time.sleep(0.5)',
            'print("Completado!")'
        ]
        
        for line in code_lines:
            ser.write((line + '\r\n').encode())
            time.sleep(0.1)
            response = ser.read_all().decode()
            if response:
                print(f'Pico: {response.strip()}')
        
        ser.close()
        print('Código enviado al Pico')
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_led()
