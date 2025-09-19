#!/usr/bin/env python3
"""
Puente entre Node.js y pico_connection_lib.py
Permite comunicación bidireccional entre el simulador Node.js y el Pico real
"""

import sys
import json
import time
import threading
import logging
from pico_connection_lib import PicoConnection, find_pico_ports

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PicoBridge:
    def __init__(self):
        self.pico_connection = None
        self.running = True
        self.output_callbacks = []
        
    def add_output_callback(self, callback):
        """Agregar callback para salida del Pico"""
        self.output_callbacks.append(callback)
        
    def notify_output(self, output):
        """Notificar salida a todos los callbacks"""
        for callback in self.output_callbacks:
            callback(output)
    
    def find_ports(self):
        """Encontrar puertos Pico disponibles"""
        try:
            ports = find_pico_ports()
            if ports:
                print(f"✅ Encontrados {len(ports)} puerto(s) Pico:")
                for port in ports:
                    print(f"   - {port.device}: {port.description}")
                return ports
            else:
                print("❌ No se encontraron puertos Pico")
                return []
        except Exception as e:
            print(f"❌ Error buscando puertos: {e}")
            return []
    
    def connect(self, port):
        """Conectar al Pico"""
        try:
            logger.info(f"Conectando a Pico en puerto {port}...")
            self.pico_connection = PicoConnection(port)
            
            # Configurar callback para salida
            self.pico_connection.set_output_callback(self.handle_pico_output)
            
            if self.pico_connection.connect():
                logger.info("✅ Pico conectado exitosamente")
                print("PICO_CONNECTED")
                return True
            else:
                logger.error("❌ Error conectando al Pico")
                print("PICO_CONNECTION_FAILED")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error conectando: {e}")
            print(f"PICO_ERROR: {e}")
            return False
    
    def handle_pico_output(self, output):
        """Manejar salida del Pico"""
        if output.strip():
            logger.info(f"Pico output: {output.strip()}")
            print(f"PICO_OUTPUT: {output.strip()}")
            self.notify_output(output)
    
    def execute_code(self, code):
        """Ejecutar código en el Pico"""
        if not self.pico_connection or not self.pico_connection.connected:
            print("PICO_ERROR: No conectado al Pico")
            return False
            
        try:
            logger.info(f"Ejecutando código ({len(code)} caracteres)")
            
            # Ejecutar código usando modo paste
            result = self.pico_connection.execute_script_paste_mode(code)
            
            if result:
                logger.info(f"Resultado: {result}")
                print(f"PICO_RESULT: {result}")
            else:
                print("PICO_EXECUTED")
                
            return True
            
        except Exception as e:
            logger.error(f"❌ Error ejecutando código: {e}")
            print(f"PICO_ERROR: {e}")
            return False
    
    def interrupt_execution(self):
        """Interrumpir ejecución"""
        if not self.pico_connection or not self.pico_connection.connected:
            return False
            
        try:
            self.pico_connection.interrupt_execution()
            print("PICO_INTERRUPTED")
            return True
        except Exception as e:
            logger.error(f"❌ Error interrumpiendo: {e}")
            return False
    
    def disconnect(self):
        """Desconectar del Pico"""
        if self.pico_connection:
            self.pico_connection.disconnect()
            self.pico_connection = None
            print("PICO_DISCONNECTED")
    
    def run_interactive_mode(self):
        """Modo interactivo para comunicación con Node.js"""
        print("PICO_BRIDGE_READY")
        
        try:
            while self.running:
                line = input().strip()
                
                if not line:
                    continue
                    
                # Parsear comandos
                if line.startswith("CONNECT:"):
                    port = line.split(":", 1)[1]
                    self.connect(port)
                    
                elif line.startswith("EXECUTE_CODE:"):
                    code = line.split(":", 1)[1]
                    self.execute_code(code)
                    
                elif line == "INTERRUPT":
                    self.interrupt_execution()
                    
                elif line == "DISCONNECT":
                    self.disconnect()
                    
                elif line == "FIND_PORTS":
                    self.find_ports()
                    
                elif line == "STATUS":
                    if self.pico_connection and self.pico_connection.connected:
                        print("PICO_STATUS: connected")
                    else:
                        print("PICO_STATUS: disconnected")
                        
                elif line == "QUIT":
                    self.running = False
                    break
                    
                else:
                    print(f"UNKNOWN_COMMAND: {line}")
                    
        except KeyboardInterrupt:
            logger.info("Interrumpido por usuario")
        except EOFError:
            logger.info("Entrada cerrada")
        finally:
            self.disconnect()
            print("PICO_BRIDGE_CLOSED")

def main():
    """Función principal"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "--find-ports":
            bridge = PicoBridge()
            bridge.find_ports()
            
        elif command == "--connect" and len(sys.argv) > 2:
            port = sys.argv[2]
            bridge = PicoBridge()
            bridge.connect(port)
            
        elif command == "--interactive":
            bridge = PicoBridge()
            bridge.run_interactive_mode()
            
        else:
            print("Comandos disponibles:")
            print("  --find-ports     : Buscar puertos Pico")
            print("  --connect PORT   : Conectar a puerto específico")
            print("  --interactive    : Modo interactivo")
    else:
        # Modo por defecto: buscar puertos y mostrar ayuda
        bridge = PicoBridge()
        ports = bridge.find_ports()
        
        if ports:
            print(f"\nPara conectar al primer puerto:")
            print(f"python3 {sys.argv[0]} --connect {ports[0].device}")
        
        print(f"\nPara modo interactivo:")
        print(f"python3 {sys.argv[0]} --interactive")

if __name__ == "__main__":
    main()
