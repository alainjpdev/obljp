/*
  Ejemplo de código para Arduino UNO
  Simula el comportamiento del LED integrado cuando se conecta
*/

// Pin del LED integrado (D13)
const int LED_PIN = 13;

void setup() {
  // Configurar el pin del LED como salida
  pinMode(LED_PIN, OUTPUT);
  
  // Iniciar comunicación serial
  Serial.begin(9600);
  
  // Esperar a que se abra el puerto serial
  while (!Serial) {
    ; // Esperar
  }
  
  Serial.println("🔌 Arduino UNO conectado a OpenBlock Link");
  Serial.println("📱 Dispositivo: Arduino UNO");
  Serial.println("🔧 Pin LED: D13");
  
  // Ejecutar secuencia de bienvenida
  welcomeSequence();
}

void loop() {
  // Mantener el LED encendido mientras esté conectado
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
}

void ledOn() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("💡 LED encendido");
}

void ledOff() {
  digitalWrite(LED_PIN, LOW);
  Serial.println("💡 LED apagado");
}

void ledBlink(int times, int delayMs) {
  Serial.print("✨ LED parpadeando ");
  Serial.print(times);
  Serial.println(" veces");
  
  for (int i = 0; i < times; i++) {
    ledOn();
    delay(delayMs);
    ledOff();
    delay(delayMs);
  }
}

void welcomeSequence() {
  Serial.println("🚀 Iniciando secuencia de bienvenida...");
  
  // Encender LED
  ledOn();
  delay(1000);
  
  // Parpadear 5 veces
  ledBlink(5, 300);
  
  // Parpadear rápido 10 veces
  ledBlink(10, 100);
  
  // Mantener encendido
  ledOn();
  Serial.println("✅ Secuencia de bienvenida completada");
}
