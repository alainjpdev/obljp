#!/usr/bin/env node

/**
 * Cliente final para probar Pico real con timing correcto
 */

const WebSocket = require('ws');
const { exec, spawn } = require('child_process');

// Verificar versión de Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

console.log(`[${new Date().toLocaleTimeString()}] 📋 Node.js versión: ${nodeVersion}`);

if (majorVersion < 16) {
    console.log(`[${new Date().toLocaleTimeString()}] ⚠️  Advertencia: Node.js v16+ recomendado, usando v${majorVersion}`);
}

const SIMULATOR_URL = 'ws://127.0.0.1:20111';

class PicoFinalTest {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.picoConnected = false;
        this.codeInjected = false;
    }

    async cleanupPorts() {
        console.log(`[${new Date().toLocaleTimeString()}] 🧹 Limpiando puertos y procesos...`);
        
        const cleanupCommands = [
            'pkill -f "pico_bridge"',
            'pkill -f "pico_connection_lib"',
            'pkill -f "simulador-openblock-link"',
            'pkill -f "node.*simulador"',
            'lsof -ti:20111 | xargs kill -9 2>/dev/null || true',
            'lsof /dev/cu.usbmodem* 2>/dev/null | awk \'NR>1 {print $2}\' | xargs kill -9 2>/dev/null || true'
        ];

        for (const cmd of cleanupCommands) {
            try {
                await new Promise((resolve) => {
                    exec(cmd, (error) => {
                        if (error && !error.message.includes('No matching processes')) {
                            console.log(`[${new Date().toLocaleTimeString()}] ⚠️  ${cmd}: ${error.message}`);
                        }
                        resolve();
                    });
                });
            } catch (error) {
                // Ignorar errores de limpieza
            }
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Limpieza completada`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🔌 Conectando al simulador...`);
            
            this.ws = new WebSocket(SIMULATOR_URL);
            
            this.ws.on('open', () => {
                console.log(`[${new Date().toLocaleTimeString()}] ✅ Conectado al simulador`);
                this.connected = true;
                resolve();
            });
            
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    console.log(`[${new Date().toLocaleTimeString()}] ❌ Error parsing: ${error.message}`);
                }
            });
            
            this.ws.on('close', () => {
                console.log(`[${new Date().toLocaleTimeString()}] 🔌 Conexión cerrada`);
                this.connected = false;
            });
            
            this.ws.on('error', (error) => {
                console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`);
                reject(error);
            });
        });
    }

    handleMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        
        switch (message.type) {
            case 'welcome':
                console.log(`[${timestamp}] 🎉 ${message.message}`);
                if (message.realPicoAvailable) {
                    console.log(`[${timestamp}] 🔥 Pico real disponible!`);
                }
                break;
                
            case 'deviceList':
                console.log(`[${timestamp}] 📋 Dispositivos disponibles:`);
                message.devices.forEach(device => {
                    const status = device.connected ? '🟢' : '⚪';
                    const real = device.capabilities?.includes('real_connection') ? '🔥' : '💻';
                    console.log(`[${timestamp}]    ${status} ${real} ${device.name} - ${device.status}`);
                });
                break;
                
            case 'deviceConnected':
                console.log(`[${timestamp}] ✅ Dispositivo conectado: ${message.deviceId}`);
                if (message.isReal) {
                    console.log(`[${timestamp}] 🔥 ¡Pico real conectado!`);
                    this.picoConnected = true;
                }
                break;
                
            case 'codeInjected':
                console.log(`[${timestamp}] 💉 Código inyectado automáticamente`);
                console.log(`[${timestamp}] 📝 Código inyectado:`);
                message.code.split('\n').slice(0, 8).forEach((line, index) => {
                    if (line.trim()) {
                        console.log(`[${timestamp}]    ${index + 1}: ${line}`);
                    }
                });
                if (message.code.split('\n').length > 8) {
                    console.log(`[${timestamp}]    ... (${message.code.split('\n').length - 8} líneas más)`);
                }
                this.codeInjected = true;
                break;
                
            case 'codeOutput':
                console.log(`[${timestamp}] 📥 Salida del código inyectado:`);
                message.output.split('\n').forEach(line => {
                    if (line.trim()) {
                        console.log(`[${timestamp}]    ${line}`);
                    }
                });
                break;
                
            case 'picoOutput':
                console.log(`[${timestamp}] 🔥 Salida del Pico real:`);
                message.output.split('\n').forEach(line => {
                    if (line.trim()) {
                        console.log(`[${timestamp}]    ${line}`);
                    }
                });
                break;
                
            case 'codeExecuted':
                console.log(`[${timestamp}] 🚀 Código ejecutado en ${message.deviceId}`);
                if (message.isReal) {
                    console.log(`[${timestamp}] 🔥 ¡Ejecutado en Pico real!`);
                }
                if (message.output) {
                    console.log(`[${timestamp}] 📥 Salida:`);
                    message.output.split('\n').forEach(line => {
                        if (line.trim()) {
                            console.log(`[${timestamp}]    ${line}`);
                        }
                    });
                }
                break;
                
            case 'deviceAction':
                console.log(`[${timestamp}] ⚡ ${message.message}`);
                break;
                
            case 'error':
                console.log(`[${timestamp}] ❌ Error: ${message.message}`);
                break;
        }
    }

    async sendMessage(message) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForPicoConnection() {
        console.log(`[${new Date().toLocaleTimeString()}] ⏳ Esperando conexión al Pico...`);
        let attempts = 0;
        while (!this.picoConnected && attempts < 20) {
            await this.sleep(500);
            attempts++;
        }
        return this.picoConnected;
    }

    async waitForCodeInjection() {
        console.log(`[${new Date().toLocaleTimeString()}] ⏳ Esperando inyección de código...`);
        let attempts = 0;
        while (!this.codeInjected && attempts < 20) {
            await this.sleep(500);
            attempts++;
        }
        return this.codeInjected;
    }

    async runPicoDirect() {
        return new Promise((resolve, reject) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🚀 Ejecutando conexión directa al Pico...`);
            console.log(`[${new Date().toLocaleTimeString()}] 💡 La limpieza de puertos se maneja automáticamente en pico_connection_lib.py`);
            
            const python = spawn('python3', ['pico_connection_lib.py'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(`[${new Date().toLocaleTimeString()}] 📥 ${text.trim()}`);
            });

            python.stderr.on('data', (data) => {
                const text = data.toString();
                error += text;
                console.log(`[${new Date().toLocaleTimeString()}] ⚠️  ${text.trim()}`);
            });

            python.on('close', (code) => {
                if (code === 0) {
                    console.log(`[${new Date().toLocaleTimeString()}] ✅ Conexión directa completada`);
                    resolve(output);
                } else {
                    console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error}`);
                    reject(new Error(error));
                }
            });

            python.on('error', (err) => {
                reject(err);
            });
        });
    }

    async runTest() {
        try {
            // Limpiar puertos y procesos antes de empezar
            await this.cleanupPorts();
            
            // Ejecutar conexión directa al Pico (con limpieza automática integrada)
            await this.runPicoDirect();
            
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Prueba completada exitosamente`);
            console.log(`[${new Date().toLocaleTimeString()}] 🔥 El LED del Pico debería estar encendido y parpadeando`);
            
        } catch (error) {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`);
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const test = new PicoFinalTest();
    
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

module.exports = PicoFinalTest;
