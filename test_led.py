from machine import Pin
import time

# Configurar LED
led = Pin("LED", Pin.OUT)

print("Iniciando parpadeo del LED...")

# Parpadear 10 veces
for i in range(10):
    led.on()
    print(f"LED ON - Iteración {i+1}")
    time.sleep(0.5)
    led.off()
    print(f"LED OFF - Iteración {i+1}")
    time.sleep(0.5)

print("Parpadeo completado!")
