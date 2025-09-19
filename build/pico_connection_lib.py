#!/usr/bin/env python3
"""
Librería independiente para conectar y comunicarse con Raspberry Pi Pico
Basada en el protocolo de MicroPython, sin dependencia de Thonny
Incluye limpieza automática de puertos y manejo de conflictos
"""

import serial
import serial.tools.list_ports
import time
import threading
import logging
import subprocess
import os
import signal
from typing import Optional, List, Dict, Tuple, Callable
from dataclasses import dataclass

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PicoPort:
    """Información de un puerto Pico"""
    device: str
    description: str
    manufacturer: str

class PicoConnection:
    """
    Clase principal para conectar y comunicarse con Raspberry Pi Pico
    Implementa el protocolo completo de MicroPython sin dependencia de Thonny
    Incluye limpieza automática de puertos y manejo de conflictos
    """
    
    # Constantes del protocolo MicroPython
    NORMAL_MODE_CMD = b"\x02"      # Ctrl+B - Entrar en modo normal
    RAW_MODE_CMD = b"\x01"         # Ctrl+A - Entrar en modo raw
    INTERRUPT_CMD = b"\x03"        # Ctrl+C - Interrumpir ejecución
    SOFT_REBOOT_CMD = b"\x04"      # Ctrl+D - Soft reboot
    PASTE_MODE_CMD = b"\x05"       # Ctrl+E - Entrar en modo paste
    EOT = b"\x04"                  # End of Transmission
    
    @staticmethod
    def cleanup_ports():
        """
        Limpia todos los procesos que puedan estar usando puertos del Pico
        """
        logger.info("🧹 Limpiando procesos relacionados con Pico...")
        
        commands = [
            ['pkill', '-f', 'pico_bridge'],
            ['pkill', '-f', 'pico_connection_lib'],
            ['pkill', '-f', 'simulador-openblock-link'],
            ['pkill', '-f', 'node.*simulador'],
            ['lsof', '-ti:20111'],
            ['lsof', '/dev/cu.usbmodem*'],
            ['fuser', '-k', '/dev/cu.usbmodem*']
        ]
        
        for cmd in commands:
            try:
                if cmd[0] == 'lsof' and len(cmd) > 2:
                    # Para lsof, obtener PIDs y matarlos
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                    if result.stdout.strip():
                        pids = result.stdout.strip().split('\n')
                        for pid in pids:
                            if pid.isdigit():
                                try:
                                    os.kill(int(pid), signal.SIGKILL)
                                    logger.info(f"🔪 Proceso {pid} terminado")
                                except:
                                    pass
                else:
                    subprocess.run(cmd, capture_output=True, timeout=5)
            except:
                pass  # Ignorar errores de comandos
        
        logger.info("✅ Limpieza de puertos completada")
        time.sleep(2)  # Esperar para liberación completa
    
    @staticmethod
    def check_port_available(port):
        """
        Verifica si un puerto está disponible
        """
        try:
            result = subprocess.run(['lsof', port], capture_output=True, text=True, timeout=5)
            if result.stdout.strip():
                logger.warning(f"⚠️  Puerto {port} ocupado por: {result.stdout.strip()}")
                return False
            else:
                logger.info(f"✅ Puerto {port} libre")
                return True
        except:
            return True  # Asumir libre si no se puede verificar
    
    # Prompts de MicroPython
    NORMAL_PROMPT = b">>> "
    RAW_PROMPT = b"\r\n>"
    FIRST_RAW_PROMPT = b"raw REPL; CTRL-B to exit\r\n>"
    PASTE_MODE_PREFIX = b"=== "
    
    def __init__(self, port: str, baudrate: int = 115200, timeout: float = 5.0):
        """
        Inicializar conexión con Pico
        
        Args:
            port: Puerto serial (ej: '/dev/cu.usbmodem1301')
            baudrate: Velocidad de comunicación (default: 115200)
            timeout: Timeout para operaciones (default: 2.0)
        """
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial: Optional[serial.Serial] = None
        self.connected = False
        self.current_mode = "unknown"
        self._output_callback: Optional[Callable[[str], None]] = None
        self._reading_thread: Optional[threading.Thread] = None
        self._stop_reading = False
        
    @staticmethod
    def find_pico_ports() -> List[PicoPort]:
        """
        Encontrar todos los puertos Pico disponibles
        
        Returns:
            Lista de puertos Pico encontrados
        """
        ports = []
        
        for port in serial.tools.list_ports.comports():
            description = (port.description or '').lower()
            manufacturer = (getattr(port, 'manufacturer', '') or '').lower()
            
            # Buscar por descripción
            if any(keyword in description for keyword in ['micropython', 'pico', 'rp2040', 'usb serial']):
                ports.append(PicoPort(
                    device=port.device,
                    description=port.description,
                    manufacturer=getattr(port, 'manufacturer', 'Unknown')
                ))
            # Buscar por manufacturer
            elif any(keyword in manufacturer for keyword in ['raspberry', 'pico']):
                ports.append(PicoPort(
                    device=port.device,
                    description=port.description,
                    manufacturer=getattr(port, 'manufacturer', 'Unknown')
                ))
            # Buscar por nombre de dispositivo (macOS/Linux)
            elif 'usbmodem' in port.device.lower() or 'usbserial' in port.device.lower():
                ports.append(PicoPort(
                    device=port.device,
                    description=port.description,
                    manufacturer=getattr(port, 'manufacturer', 'Unknown')
                ))
        
        return ports
    
    def connect(self, auto_cleanup=True) -> bool:
        """
        Conectar al Pico
        
        Args:
            auto_cleanup: Si True, limpia puertos automáticamente antes de conectar
        
        Returns:
            True si la conexión fue exitosa, False en caso contrario
        """
        try:
            # Limpieza automática de puertos si está habilitada
            if auto_cleanup:
                self.cleanup_ports()
            
            # Verificar si el puerto está disponible
            if not self.check_port_available(self.port):
                logger.warning(f"Puerto {self.port} ocupado, intentando liberar...")
                self.cleanup_ports()
            
            logger.info(f"Conectando a {self.port}...")
            
            # Crear conexión serial
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout,
                write_timeout=10,  # Aumentado para scripts largos
                exclusive=True
            )
            
            # Esperar a que se estabilice
            time.sleep(1)
            
            # Leer datos iniciales
            if self.serial.in_waiting > 0:
                initial_data = self.serial.read_all()
                logger.info(f"Datos iniciales: {initial_data.decode('utf-8', errors='ignore')[:100]}...")
            
            # Iniciar hilo de lectura
            self._stop_reading = False
            self._reading_thread = threading.Thread(target=self._read_loop, daemon=True)
            self._reading_thread.start()
            
            # Asegurar modo normal
            self._ensure_normal_mode()
            
            self.connected = True
            logger.info("✅ Conectado exitosamente al Pico")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error conectando: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Desconectar del Pico"""
        if self.serial and self.serial.is_open:
            self._stop_reading = True
            if self._reading_thread:
                self._reading_thread.join(timeout=1)
            self.serial.close()
            self.connected = False
            logger.info("🔌 Desconectado del Pico")
    
    def _read_loop(self):
        """Hilo de lectura continua de datos del Pico"""
        while not self._stop_reading and self.serial and self.serial.is_open:
            try:
                if self.serial.in_waiting > 0:
                    data = self.serial.read_all()
                    decoded_data = data.decode('utf-8', errors='ignore')
                    
                    # Llamar callback si está definido
                    if self._output_callback:
                        self._output_callback(decoded_data)
                    
                    logger.debug(f"Datos recibidos: {decoded_data}")
                
                time.sleep(0.01)
            except Exception as e:
                logger.error(f"Error en hilo de lectura: {e}")
                break
    
    def set_output_callback(self, callback: Callable[[str], None]):
        """
        Establecer callback para recibir salida del Pico
        
        Args:
            callback: Función que recibe la salida como string
        """
        self._output_callback = callback
    
    def _ensure_normal_mode(self):
        """Asegurar que estamos en modo normal"""
        if self.current_mode == "normal":
            return
        
        logger.info("Asegurando modo normal...")
        self.serial.write(self.NORMAL_MODE_CMD)
        time.sleep(0.5)
        
        # Leer respuesta
        if self.serial.in_waiting > 0:
            response = self.serial.read_all()
            logger.debug(f"Respuesta modo normal: {response.decode('utf-8', errors='ignore')}")
        
        self.current_mode = "normal"
    
    def _ensure_raw_mode(self):
        """Asegurar que estamos en modo raw"""
        if self.current_mode == "raw":
            return
        
        logger.info("Asegurando modo raw...")
        self.serial.write(self.RAW_MODE_CMD)
        time.sleep(0.5)
        
        # Leer respuesta
        if self.serial.in_waiting > 0:
            response = self.serial.read_all()
            logger.debug(f"Respuesta modo raw: {response.decode('utf-8', errors='ignore')}")
        
        self.current_mode = "raw"
    
    def execute_command(self, command: str) -> str:
        """
        Ejecutar comando en modo normal
        
        Args:
            command: Comando a ejecutar
            
        Returns:
            Respuesta del Pico
        """
        if not self.connected:
            raise RuntimeError("No conectado al Pico")
        
        self._ensure_normal_mode()
        
        logger.info(f"Ejecutando comando: {command}")
        self.serial.write(f"{command}\r\n".encode('utf-8'))
        time.sleep(0.5)
        
        # Leer respuesta
        if self.serial.in_waiting > 0:
            response = self.serial.read_all()
            return response.decode('utf-8', errors='ignore')
        
        return ""
    
    def execute_script_paste_mode(self, script: str) -> str:
        """
        Ejecutar script usando modo paste (como Thonny)
        
        Args:
            script: Script Python a ejecutar
            
        Returns:
            Salida del script
        """
        if not self.connected:
            raise RuntimeError("No conectado al Pico")
        
        logger.info(f"Ejecutando script en modo paste ({len(script)} caracteres)")
        
        # Asegurar modo normal
        self._ensure_normal_mode()
        
        # Entrar en modo paste
        self.serial.write(self.PASTE_MODE_CMD)
        time.sleep(0.5)
        
        # Leer confirmación
        if self.serial.in_waiting > 0:
            response = self.serial.read_all()
            logger.debug(f"Respuesta modo paste: {response.decode('utf-8', errors='ignore')}")
        
        # Enviar script en chunks para evitar timeout
        script_bytes = script.encode('utf-8')
        chunk_size = 64  # Enviar en chunks pequeños
        
        for i in range(0, len(script_bytes), chunk_size):
            chunk = script_bytes[i:i + chunk_size]
            self.serial.write(chunk)
            time.sleep(0.05)  # Pequeña pausa entre chunks
        
        # Enviar EOT para ejecutar
        self.serial.write(self.EOT)
        time.sleep(2)  # Más tiempo para que se ejecute
        
        # Leer respuesta con timeout más largo
        response = b""
        start_time = time.time()
        timeout = 5.0
        
        while time.time() - start_time < timeout:
            if self.serial.in_waiting > 0:
                response += self.serial.read_all()
            time.sleep(0.1)
        
        if response:
            return response.decode('utf-8', errors='ignore')
        
        return ""
    
    def execute_script_raw_mode(self, script: str) -> str:
        """
        Ejecutar script usando modo raw
        
        Args:
            script: Script Python a ejecutar
            
        Returns:
            Salida del script
        """
        if not self.connected:
            raise RuntimeError("No conectado al Pico")
        
        logger.info(f"Ejecutando script en modo raw ({len(script)} caracteres)")
        
        # Asegurar modo raw
        self._ensure_raw_mode()
        
        # Enviar script con EOT
        script_bytes = script.encode('utf-8') + self.EOT
        self.serial.write(script_bytes)
        time.sleep(1)
        
        # Leer respuesta
        if self.serial.in_waiting > 0:
            response = self.serial.read_all()
            return response.decode('utf-8', errors='ignore')
        
        return ""
    
    def interrupt_execution(self):
        """Interrumpir ejecución actual - MÉTODO MEJORADO"""
        if not self.connected:
            raise RuntimeError("No conectado al Pico")
        
        logger.info("Interrumpiendo ejecución...")
        
        # Enviar múltiples Ctrl+C para asegurar interrupción
        for i in range(5):
            self.serial.write(self.INTERRUPT_CMD)
            time.sleep(0.05)
        
        # Limpiar buffer de entrada
        if self.serial.in_waiting > 0:
            self.serial.read_all()
        
        # Enviar Ctrl+D para salir del bucle si está en modo paste
        self.serial.write(self.SOFT_REBOOT_CMD)
        time.sleep(0.3)
        
        # Enviar más Ctrl+C
        for i in range(3):
            self.serial.write(self.INTERRUPT_CMD)
            time.sleep(0.1)
        
        # Limpiar buffer nuevamente
        if self.serial.in_waiting > 0:
            self.serial.read_all()
        
        # Intentar apagar LED directamente
        try:
            self.serial.write(b"led.value(0)\r\n")
            time.sleep(0.1)
        except:
            pass
        
        logger.info("Ejecución interrumpida exitosamente")
    
    def force_interrupt_execution(self):
        """Forzar interrupción de ejecución - MÉTODO MUY AGRESIVO"""
        if not self.connected:
            raise RuntimeError("No conectado al Pico")
        
        logger.info("Forzando interrupción de ejecución...")
        
        # Método 1: Múltiples Ctrl+C muy rápidos
        for i in range(10):
            self.serial.write(self.INTERRUPT_CMD)
            time.sleep(0.01)
        
        # Método 2: Ctrl+D para soft reboot
        self.serial.write(self.SOFT_REBOOT_CMD)
        time.sleep(0.3)
        
        # Método 3: Más Ctrl+C
        for i in range(5):
            self.serial.write(self.INTERRUPT_CMD)
            time.sleep(0.05)
        
        # Método 4: Limpiar buffer
        if self.serial.in_waiting > 0:
            self.serial.read_all()
        
        # Método 5: Salir del modo paste
        self.serial.write(self.NORMAL_MODE_CMD)
        time.sleep(0.2)
        
        # Método 6: Enviar Ctrl+C final
        for i in range(3):
            self.serial.write(self.INTERRUPT_CMD)
            time.sleep(0.1)
        
        # Método 7: Limpiar buffer final
        if self.serial.in_waiting > 0:
            self.serial.read_all()
        
        # Método 8: Enviar comando para apagar LED
        try:
            self.serial.write(b"led.value(0)\r\n")
            time.sleep(0.1)
        except:
            pass
        
        logger.info("Interrupción forzada completada")
    
    def soft_reboot(self):
        """Realizar soft reboot del Pico"""
        if not self.connected:
            raise RuntimeError("No conectado al Pico")
        
        logger.info("Realizando soft reboot...")
        self.serial.write(self.SOFT_REBOOT_CMD)
        time.sleep(1)
        
        # Leer respuesta
        if self.serial.in_waiting > 0:
            response = self.serial.read_all()
            logger.debug(f"Respuesta soft reboot: {response.decode('utf-8', errors='ignore')}")
    
    def upload_file(self, filename: str, content: str) -> bool:
        """
        Subir archivo al Pico
        
        Args:
            filename: Nombre del archivo
            content: Contenido del archivo
            
        Returns:
            True si fue exitoso, False en caso contrario
        """
        try:
            # Crear archivo usando comandos de MicroPython
            lines = content.split('\n')
            
            # Abrir archivo para escritura
            self.execute_command(f"f = open('{filename}', 'w')")
            
            # Escribir cada línea
            for line in lines:
                if line.strip():  # Solo líneas no vacías
                    escaped_line = line.replace('"', '\\"')
                    self.execute_command(f'f.write("{escaped_line}\\n")')
            
            # Cerrar archivo
            self.execute_command("f.close()")
            
            logger.info(f"Archivo {filename} subido exitosamente")
            return True
            
        except Exception as e:
            logger.error(f"Error subiendo archivo {filename}: {e}")
            return False
    
    def download_file(self, filename: str) -> Optional[str]:
        """
        Descargar archivo del Pico
        
        Args:
            filename: Nombre del archivo
            
        Returns:
            Contenido del archivo o None si hay error
        """
        try:
            # Leer archivo línea por línea
            self.execute_command(f"f = open('{filename}', 'r')")
            content = ""
            
            while True:
                line = self.execute_command("f.readline()")
                if not line or line.strip() == "''":
                    break
                content += line.strip("'\"") + "\n"
            
            self.execute_command("f.close()")
            
            logger.info(f"Archivo {filename} descargado exitosamente")
            return content
            
        except Exception as e:
            logger.error(f"Error descargando archivo {filename}: {e}")
            return None
    
    def list_files(self) -> List[str]:
        """
        Listar archivos en el Pico
        
        Returns:
            Lista de nombres de archivos
        """
        try:
            # Usar os.listdir() de MicroPython
            result = self.execute_command("import os; print(os.listdir())")
            
            # Parsear resultado
            if result:
                # Extraer lista del output
                lines = result.split('\n')
                for line in lines:
                    if '[' in line and ']' in line:
                        # Parsear lista de Python
                        import ast
                        try:
                            files = ast.literal_eval(line.strip())
                            return files
                        except:
                            pass
            
            return []
            
        except Exception as e:
            logger.error(f"Error listando archivos: {e}")
            return []
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()

# Funciones de conveniencia
def find_pico_ports() -> List[PicoPort]:
    """Encontrar puertos Pico disponibles"""
    return PicoConnection.find_pico_ports()

def connect_to_pico(port: str) -> PicoConnection:
    """Conectar a un puerto Pico específico"""
    connection = PicoConnection(port)
    if connection.connect():
        return connection
    else:
        raise RuntimeError(f"No se pudo conectar al puerto {port}")

# Ejemplo de uso
if __name__ == "__main__":
    # Buscar puertos Pico
    ports = find_pico_ports()
    
    if not ports:
        print("❌ No se encontraron puertos Pico")
        exit(1)
    
    print(f"✅ Encontrados {len(ports)} puerto(s) Pico:")
    for port in ports:
        print(f"   - {port.device}: {port.description}")
    
    # Conectar al primer puerto
    port = ports[0].device
    print(f"\n🔌 Conectando a {port}...")
    
    try:
        with PicoConnection(port) as pico:
            # Ejecutar comando simple
            result = pico.execute_command("print('Hello from Pico!')")
            print(f"📥 Respuesta: {result}")
            
            # Ejecutar script
            script = """
from machine import Pin
from time import sleep

led = Pin("LED", Pin.OUT)
for i in range(3):
    led.value(1)
    print(f"LED ON - {i+1}")
    sleep(0.5)
    led.value(0)
    print(f"LED OFF - {i+1}")
    sleep(0.5)

print("Script completado!")
"""
            
            print("\n🚀 Ejecutando script...")
            result = pico.execute_script_paste_mode(script)
            print(f"📥 Salida del script:\n{result}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
