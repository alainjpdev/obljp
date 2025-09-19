# 💡 Simulación de LED con OpenBlock Link

## 🎯 Nuevas Funcionalidades Agregadas

### ✅ **Simulación de LED Integrado**

#### **Raspberry Pi Pico**
- **LED Pin**: GP25 (LED integrado)
- **Acciones**:
  - 💡 **Encendido automático** al conectar
  - ✨ **Parpadeo de bienvenida** (3 veces)
  - 🔄 **LED siempre encendido** mientras esté conectado

#### **Arduino UNO**
- **LED Pin**: D13 (LED integrado)
- **Acciones**:
  - 💡 **Parpadeo de bienvenida** (5 veces)
  - 🔄 **LED encendido** mientras esté conectado

#### **micro:bit V2**
- **LED Matrix**: 5x5 LEDs
- **Acciones**:
  - 😊 **Patrón de bienvenida** (cara sonriente)
  - 🎨 **Animaciones** en la matriz LED

## 🚀 **Cómo Probar**

### 1. **Ejecutar el Simulador**
```bash
node simulador-openblock-link.js
```

### 2. **Abrir la Interfaz Web**
```bash
open demo-conexion.html
```

### 3. **Conectar un Dispositivo**
1. Haz clic en "Conectar al Simulador"
2. Selecciona un dispositivo (Pico, Arduino, micro:bit)
3. Haz clic en "Conectar"
4. **¡Observa las acciones del LED!**

## 📊 **Lo que Verás**

### **En los Logs:**
```
💡 LED del Pico encendido para #1
✨ LED del Pico parpadeando para #1
😊 Patrón de bienvenida en micro:bit para #1
```

### **En la Interfaz Web:**
- **Notificaciones visuales** de las acciones del LED
- **Datos en tiempo real** mostrando el estado del LED
- **Logs detallados** de cada acción

## 🔧 **Código de Ejemplo**

### **Raspberry Pi Pico (Python)**
```python
# Archivo: ejemplo-pico-led.py
import machine
import time

led = machine.Pin(25, machine.Pin.OUT)

def led_on():
    led.value(1)
    print("💡 LED encendido")

def led_blink(times=3, delay=0.5):
    for i in range(times):
        led_on()
        time.sleep(delay)
        led.off()
        time.sleep(delay)

def welcome_sequence():
    led_on()
    time.sleep(1)
    led_blink(3, 0.3)
    led_blink(5, 0.1)
    led_on()
```

### **Arduino UNO (C++)**
```cpp
// Archivo: ejemplo-arduino-led.ino
const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  welcomeSequence();
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
}

void ledBlink(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void welcomeSequence() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  ledBlink(5, 300);
  ledBlink(10, 100);
  digitalWrite(LED_PIN, HIGH);
}
```

## 🎬 **Acciones Simuladas**

### **Mensajes WebSocket Enviados:**
```json
{
  "type": "deviceAction",
  "deviceId": "raspberry-pico",
  "action": "led_on",
  "message": "LED integrado encendido",
  "pin": "GP25",
  "value": 1
}
```

```json
{
  "type": "deviceAction",
  "deviceId": "arduino-uno",
  "action": "led_blink",
  "message": "LED integrado parpadeando",
  "pin": "D13",
  "pattern": "blink_5_times"
}
```

## 🔄 **Flujo de Conexión con LED**

1. **Usuario conecta dispositivo** → WebSocket envía `connectDevice`
2. **Simulador responde** → `deviceConnected`
3. **LED se enciende** → `deviceAction` con `led_on`
4. **Secuencia de bienvenida** → `deviceAction` con `led_blink`
5. **Datos en tiempo real** → `deviceData` con estado del LED
6. **LED permanece encendido** → Mientras esté conectado

## 🎯 **Beneficios de la Simulación**

### **Para Desarrolladores:**
- **Testing sin hardware** real
- **Validación de flujos** de conexión
- **Debug de comunicación** WebSocket
- **Prototipado rápido** de funcionalidades

### **Para Usuarios:**
- **Demostración visual** de conectividad
- **Entendimiento del comportamiento** del hardware
- **Feedback inmediato** de conexión
- **Experiencia realista** sin hardware físico

## 🚀 **Próximas Mejoras**

- [ ] **Más patrones de LED** (corazón, estrella, etc.)
- [ ] **Control manual** del LED desde la interfaz
- [ ] **Simulación de sensores** adicionales
- [ ] **Efectos de sonido** para las acciones
- [ ] **Grabación de secuencias** personalizadas

---

## 🎉 **¡Disfruta Simulando LEDs!**

Ahora puedes ver exactamente cómo se comportaría el hardware real cuando se conecta a OpenBlock Link, incluyendo el encendido automático del LED y las secuencias de bienvenida.
