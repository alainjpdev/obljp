#!/usr/bin/env node

/**
 * Test directo al Pico sin simulador
 * Usa directamente pico_connection_lib.py
 */

const { spawn } = require('child_process');
const fs = require('fs');

class PicoDirectTest {
    constructor() {
        this.picoProcess = null;
    }

    async cleanup() {
        return new Promise((resolve) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🧹 Limpiando procesos Python...`);
            
            const commands = [
                'pkill -f "pico_bridge"',
                'pkill -f "pico_connection_lib"'
            ];
            
            let completed = 0;
            const total = commands.length;
            
            commands.forEach(cmd => {
                require('child_process').exec(cmd, () => {
                    completed++;
                    if (completed === total) {
                        console.log(`[${new Date().toLocaleTimeString()}] ✅ Procesos limpiados`);
                        setTimeout(resolve, 1000);
                    }
                });
            });
        });
    }

    async findPicoPorts() {
        return new Promise((resolve, reject) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🔍 Buscando puertos Pico...`);
            
            const python = spawn('python3', ['pico_bridge.py', '--find-ports'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    const lines = output.split('\n');
                    const ports = [];
                    
                    for (const line of lines) {
                        if (line.includes('- ') && line.includes(':')) {
                            const parts = line.split(':');
                            if (parts.length >= 2) {
                                const device = parts[0].replace('- ', '').trim();
                                const description = parts[1].trim();
                                ports.push({ device, description });
                            }
                        }
                    }
                    resolve(ports);
                } else {
                    reject(new Error(`Error buscando puertos: ${error}`));
                }
            });
        });
    }

    async connectToPico(port) {
        return new Promise((resolve, reject) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🔌 Conectando a Pico en ${port}...`);
            
            this.picoProcess = spawn('python3', ['pico_connection_lib.py'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            this.picoProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(`[${new Date().toLocaleTimeString()}] 📥 Pico: ${text.trim()}`);
            });

            this.picoProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            this.picoProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`[${new Date().toLocaleTimeString()}] ✅ Pico conectado`);
                    resolve();
                } else {
                    reject(new Error(`Error conectando: ${error}`));
                }
            });

            this.picoProcess.on('error', (err) => {
                reject(err);
            });

            // Simular conexión (el script Python se conecta automáticamente)
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }

    async executeCode(code) {
        return new Promise((resolve, reject) => {
            if (!this.picoProcess) {
                reject(new Error('Pico no conectado'));
                return;
            }

            console.log(`[${new Date().toLocaleTimeString()}] 🚀 Ejecutando código en Pico...`);
            
            // Crear archivo temporal con el código
            const tempFile = 'temp_pico_code.py';
            fs.writeFileSync(tempFile, code);

            // Ejecutar el código usando el script Python
            const python = spawn('python3', ['pico_connection_lib.py'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(`[${new Date().toLocaleTimeString()}] 📥 Output: ${text.trim()}`);
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                // Limpiar archivo temporal
                try {
                    fs.unlinkSync(tempFile);
                } catch (e) {}

                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Error ejecutando código: ${error}`));
                }
            });

            // Enviar código al proceso
            python.stdin.write(code);
            python.stdin.end();
        });
    }

    async runTest() {
        try {
            // 1. Limpiar procesos
            await this.cleanup();

            // 2. Buscar puertos Pico
            const ports = await this.findPicoPorts();
            if (ports.length === 0) {
                console.log(`[${new Date().toLocaleTimeString()}] ❌ No se encontraron puertos Pico`);
                return;
            }

            console.log(`[${new Date().toLocaleTimeString()}] ✅ Encontrados ${ports.length} puerto(s) Pico:`);
            ports.forEach(port => {
                console.log(`[${new Date().toLocaleTimeString()}]    - ${port.device}: ${port.description}`);
            });

            // 3. Conectar al primer puerto
            const port = ports[0].device;
            await this.connectToPico(port);

            // 4. Ejecutar código de prueba
            const testCode = `# Código de prueba directo
from machine import Pin
from time import sleep

print("🎯 Código de prueba ejecutándose...")

# Configurar LED
led = Pin("LED", Pin.OUT)

print("💡 Encendiendo LED...")
led.value(1)
print("✅ LED encendido")

# Parpadear 3 veces
print("🔄 Parpadeando...")
for i in range(3):
    led.value(0)
    print(f"💡 OFF - {i+1}")
    sleep(0.5)
    led.value(1)
    print(f"💡 ON - {i+1}")
    sleep(0.5)

print("✅ Prueba completada")
print("🔄 LED permanecerá encendido")`;

            await this.executeCode(testCode);

            console.log(`[${new Date().toLocaleTimeString()}] 🎉 Prueba completada exitosamente`);
            console.log(`[${new Date().toLocaleTimeString()}] 🔥 El LED del Pico debería estar encendido y parpadeando`);

        } catch (error) {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`);
        }
    }

    close() {
        if (this.picoProcess) {
            this.picoProcess.kill();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const test = new PicoDirectTest();
    
    process.on('SIGINT', () => {
        console.log(`\n[${new Date().toLocaleTimeString()}] 🛑 Cerrando...`);
        test.close();
        process.exit(0);
    });
    
    test.runTest().then(() => {
        console.log(`[${new Date().toLocaleTimeString()}] 🏁 Finalizado`);
        test.close();
    }).catch(error => {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`);
        test.close();
        process.exit(1);
    });
}

module.exports = PicoDirectTest;
