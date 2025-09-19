#!/usr/bin/env node

/**
 * Cliente de prueba para el simulador OpenBlock Link
 * Prueba la conectividad y inyección de código directamente desde terminal
 */

const WebSocket = require('ws');

// Configuración
const WS_URL = 'ws://localhost:20111';
const DEVICE_ID = 'raspberry-pico';

// Colores para terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

class TestClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.deviceConnected = false;
    }

    connect() {
        log('🔌 Conectando al simulador...', 'cyan');
        
        try {
            this.ws = new WebSocket(WS_URL);
            
            this.ws.on('open', () => {
                this.connected = true;
                log('✅ Conectado al simulador', 'green');
                this.getDeviceList();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    log(`❌ Error parsing mensaje: ${error.message}`, 'red');
                }
            });

            this.ws.on('close', () => {
                this.connected = false;
                this.deviceConnected = false;
                log('🔌 Conexión cerrada', 'yellow');
            });

            this.ws.on('error', (error) => {
                log(`❌ Error de conexión: ${error.message}`, 'red');
            });

        } catch (error) {
            log(`❌ Error al conectar: ${error.message}`, 'red');
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'welcome':
                log(`🎉 ${message.message} (v${message.serverVersion})`, 'green');
                break;
                
            case 'deviceList':
                log(`📋 ${message.devices.length} dispositivos disponibles:`, 'blue');
                message.devices.forEach(device => {
                    log(`   • ${device.name} (${device.id}) - ${device.status}`, 'cyan');
                });
                this.connectToDevice();
                break;
                
            case 'deviceConnected':
                this.deviceConnected = true;
                log(`✅ ${message.deviceId} conectado en ${message.peripheralId}`, 'green');
                log(`🔧 Capacidades: ${message.capabilities.join(', ')}`, 'blue');
                log(`📌 Pines: ${JSON.stringify(message.pins)}`, 'blue');
                break;
                
            case 'codeInjected':
                log(`💉 Código inyectado en ${message.deviceId}`, 'magenta');
                log(`📝 Código (${message.code.length} caracteres):`, 'cyan');
                console.log('─'.repeat(50));
                console.log(colors.cyan + message.code + colors.reset);
                console.log('─'.repeat(50));
                break;
                
            case 'codeOutput':
                log(`📤 Salida del código:`, 'yellow');
                const lines = message.output.split('\n');
                lines.forEach(line => {
                    log(`   ${line}`, 'green');
                });
                break;
                
            case 'deviceData':
                log(`📊 Datos del dispositivo:`, 'blue');
                console.log(JSON.stringify(message.data, null, 2));
                break;
                
            case 'deviceAction':
                log(`🎬 Acción: ${message.message}`, 'yellow');
                if (message.pin) {
                    log(`   Pin: ${message.pin} | Valor: ${message.value || 'N/A'}`, 'cyan');
                }
                break;
                
            case 'error':
                log(`❌ Error: ${message.message}`, 'red');
                break;
                
            default:
                log(`⚠️ Mensaje desconocido: ${message.type}`, 'yellow');
        }
    }

    getDeviceList() {
        if (!this.connected) return;
        
        log('📋 Solicitando lista de dispositivos...', 'cyan');
        this.sendMessage({ type: 'getDeviceList' });
    }

    connectToDevice() {
        if (!this.connected) return;
        
        log(`🔌 Conectando a ${DEVICE_ID}...`, 'cyan');
        this.sendMessage({
            type: 'connectDevice',
            deviceId: DEVICE_ID,
            peripheralId: 'COM5',
            baudrate: 9600
        });
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            log(`📤 Enviado: ${message.type}`, 'magenta');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Ejecutar prueba
const client = new TestClient();

// Manejar cierre graceful
process.on('SIGINT', () => {
    log('\n🛑 Cerrando cliente...', 'yellow');
    client.disconnect();
    process.exit(0);
});

// Conectar
client.connect();

// Mantener el proceso vivo
setInterval(() => {
    if (!client.connected) {
        log('🔄 Reintentando conexión...', 'yellow');
        client.connect();
    }
}, 5000);
