#!/usr/bin/env node

/**
 * Simulador de OpenBlock Link Server
 * Este servidor simula las respuestas de OpenBlock Link para testing y demostración
 * Compatible con Node.js v16+ y v22+
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Configuración del servidor
const PORT = 20111;
const HOST = '0.0.0.0';

// Dispositivos simulados disponibles
const SIMULATED_DEVICES = {
    'arduino-uno': {
        id: 'arduino-uno',
        name: 'Arduino UNO',
        type: 'arduino',
        port: 'COM3',
        status: 'available',
        capabilities: ['digital', 'analog', 'pwm', 'serial'],
        pins: {
            digital: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
            pwm: [3, 5, 6, 9, 10, 11]
        }
    },
    'microbit-v2': {
        id: 'microbit-v2',
        name: 'micro:bit V2',
        type: 'microbit',
        port: 'COM4',
        status: 'available',
        capabilities: ['led', 'button', 'accelerometer', 'compass', 'temperature'],
        pins: {
            digital: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20],
            analog: [0, 1, 2, 3, 4, 10]
        }
    },
    'raspberry-pico': {
        id: 'raspberry-pico',
        name: 'Raspberry Pi Pico',
        type: 'pico',
        port: 'COM5',
        status: 'available',
        capabilities: ['digital', 'analog', 'pwm', 'i2c', 'spi'],
        pins: {
            digital: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28],
            analog: [26, 27, 28, 29]
        }
    }
};

// Estado de conexiones activas
const activeConnections = new Map();
let connectionId = 0;

// Crear servidor HTTP
const server = http.createServer();

// Crear servidor WebSocket
const wss = new WebSocket.Server({ 
    server,
    path: '/',
    perMessageDeflate: false
});

// Colores para logs
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
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
    const clientId = ++connectionId;
    const clientIP = req.socket.remoteAddress;
    
    log(`🔌 Nueva conexión WebSocket #${clientId} desde ${clientIP}`, 'green');
    
    // Almacenar conexión
    activeConnections.set(clientId, {
        ws,
        ip: clientIP,
        connected: true,
        devices: new Map()
    });

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Conectado a OpenBlock Link Simulator',
        serverVersion: '1.0.0',
        clientId: clientId
    }));

    // Manejar mensajes del cliente
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            log(`📨 Mensaje recibido de #${clientId}: ${message.type}`, 'cyan');
            handleMessage(clientId, message);
        } catch (error) {
            log(`❌ Error parsing mensaje de #${clientId}: ${error.message}`, 'red');
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Formato de mensaje inválido',
                error: error.message
            }));
        }
    });

    // Manejar desconexión
    ws.on('close', (code, reason) => {
        log(`🔌 Conexión #${clientId} cerrada (${code}): ${reason}`, 'yellow');
        activeConnections.delete(clientId);
    });

    // Manejar errores
    ws.on('error', (error) => {
        log(`❌ Error en conexión #${clientId}: ${error.message}`, 'red');
        activeConnections.delete(clientId);
    });
});

// Manejar mensajes del cliente
function handleMessage(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    switch (message.type) {
        case 'getDeviceList':
            handleGetDeviceList(clientId);
            break;
            
        case 'connectDevice':
            handleConnectDevice(clientId, message);
            break;
            
        case 'disconnectDevice':
            handleDisconnectDevice(clientId, message);
            break;
            
        case 'sendData':
            handleSendData(clientId, message);
            break;
            
        case 'getDeviceStatus':
            handleGetDeviceStatus(clientId, message);
            break;
            
        case 'ping':
            handlePing(clientId);
            break;
            
        case 'uploadCode':
            handleUploadCode(clientId, message);
            break;
            
        case 'executeCode':
            handleExecuteCode(clientId, message);
            break;
            
        default:
            log(`⚠️  Tipo de mensaje desconocido: ${message.type}`, 'yellow');
            connection.ws.send(JSON.stringify({
                type: 'error',
                message: `Tipo de mensaje no soportado: ${message.type}`
            }));
    }
}

// Obtener lista de dispositivos
function handleGetDeviceList(clientId) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const devices = Object.values(SIMULATED_DEVICES).map(device => ({
        ...device,
        connected: connection.devices.has(device.id)
    }));

    connection.ws.send(JSON.stringify({
        type: 'deviceList',
        devices: devices,
        count: devices.length
    }));

    log(`📋 Lista de dispositivos enviada a #${clientId} (${devices.length} dispositivos)`, 'blue');
}

// Conectar a dispositivo
function handleConnectDevice(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const { deviceId, peripheralId, baudrate = 9600 } = message;
    
    if (!SIMULATED_DEVICES[deviceId]) {
        connection.ws.send(JSON.stringify({
            type: 'error',
            message: `Dispositivo no encontrado: ${deviceId}`
        }));
        return;
    }

    const device = SIMULATED_DEVICES[deviceId];
    
    // Simular tiempo de conexión
    setTimeout(() => {
        if (connection.devices.has(deviceId)) {
            connection.ws.send(JSON.stringify({
                type: 'error',
                message: `Dispositivo ${deviceId} ya está conectado`
            }));
            return;
        }

        // Marcar dispositivo como conectado
        connection.devices.set(deviceId, {
            ...device,
            peripheralId: peripheralId || device.port,
            baudrate: baudrate,
            connectedAt: new Date().toISOString(),
            status: 'connected'
        });

        connection.ws.send(JSON.stringify({
            type: 'deviceConnected',
            deviceId: deviceId,
            peripheralId: peripheralId || device.port,
            baudrate: baudrate,
            capabilities: device.capabilities,
            pins: device.pins
        }));

        log(`✅ Dispositivo ${deviceId} conectado a #${clientId}`, 'green');
        
        // Simular datos del dispositivo
        startDeviceDataSimulation(clientId, deviceId);
        
        // Simular acciones específicas del dispositivo al conectar
        handleDeviceSpecificActions(clientId, deviceId);
        
    }, Math.random() * 1000 + 500); // 500-1500ms de delay
}

// Desconectar dispositivo
function handleDisconnectDevice(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const { deviceId } = message;
    
    if (!connection.devices.has(deviceId)) {
        connection.ws.send(JSON.stringify({
            type: 'error',
            message: `Dispositivo ${deviceId} no está conectado`
        }));
        return;
    }

    connection.devices.delete(deviceId);
    
    connection.ws.send(JSON.stringify({
        type: 'deviceDisconnected',
        deviceId: deviceId
    }));

    log(`❌ Dispositivo ${deviceId} desconectado de #${clientId}`, 'yellow');
}

// Enviar datos al dispositivo
function handleSendData(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const { deviceId, data } = message;
    
    if (!connection.devices.has(deviceId)) {
        connection.ws.send(JSON.stringify({
            type: 'error',
            message: `Dispositivo ${deviceId} no está conectado`
        }));
        return;
    }

    // Simular procesamiento de datos
    log(`📤 Datos enviados a ${deviceId}: ${JSON.stringify(data)}`, 'magenta');
    
    // Simular respuesta del dispositivo
    setTimeout(() => {
        connection.ws.send(JSON.stringify({
            type: 'deviceData',
            deviceId: deviceId,
            data: {
                ...data,
                timestamp: new Date().toISOString(),
                status: 'processed'
            }
        }));
    }, Math.random() * 200 + 100); // 100-300ms de delay
}

// Obtener estado del dispositivo
function handleGetDeviceStatus(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const { deviceId } = message;
    
    if (!connection.devices.has(deviceId)) {
        connection.ws.send(JSON.stringify({
            type: 'error',
            message: `Dispositivo ${deviceId} no está conectado`
        }));
        return;
    }

    const device = connection.devices.get(deviceId);
    
    connection.ws.send(JSON.stringify({
        type: 'deviceStatus',
        deviceId: deviceId,
        status: device.status,
        connectedAt: device.connectedAt,
        uptime: Date.now() - new Date(device.connectedAt).getTime()
    }));
}

// Manejar ping
function handlePing(clientId) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    connection.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
    }));
}

// Manejar subida de código
function handleUploadCode(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const { deviceId, code } = message;
    
    if (!connection.devices.has(deviceId)) {
        connection.ws.send(JSON.stringify({
            type: 'error',
            message: `Dispositivo ${deviceId} no está conectado`
        }));
        return;
    }

    log(`📤 Código recibido para ${deviceId} (${code.length} caracteres)`, 'cyan');
    
    // Simular compilación y subida
    setTimeout(() => {
        connection.ws.send(JSON.stringify({
            type: 'codeUploaded',
            deviceId: deviceId,
            codeLength: code.length,
            timestamp: new Date().toISOString()
        }));
        
        log(`✅ Código compilado y subido a ${deviceId}`, 'green');
        
        // Simular ejecución automática
        setTimeout(() => {
            handleExecuteCode(clientId, { deviceId, code });
        }, 1000);
        
    }, Math.random() * 2000 + 1000); // 1-3 segundos
}

// Manejar ejecución de código
function handleExecuteCode(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const { deviceId, code } = message;
    
    if (!connection.devices.has(deviceId)) {
        connection.ws.send(JSON.stringify({
            type: 'error',
            message: `Dispositivo ${deviceId} no está conectado`
        }));
        return;
    }

    log(`🚀 Ejecutando código en ${deviceId}`, 'yellow');
    
    // Simular ejecución del código
    const lines = code.split('\n');
    let output = [];
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
            // Simular salida de print statements
            const printMatch = trimmedLine.match(/print\(['"](.*?)['"]\)/);
            if (printMatch) {
                output.push(printMatch[1]);
            }
            
            // Simular salida de f-strings
            const fStringMatch = trimmedLine.match(/print\(f['"](.*?)['"]\)/);
            if (fStringMatch) {
                // Simular valores de variables
                let outputLine = fStringMatch[1];
                outputLine = outputLine.replace(/\{value\}/g, Math.floor(Math.random() * 1024));
                outputLine = outputLine.replace(/\{angle\}/g, Math.floor(Math.random() * 180));
                output.push(outputLine);
            }
        }
    });
    
    // Agregar salidas simuladas específicas
    if (code.includes('led.on()') || code.includes('led.value(1)')) {
        output.push('💡 LED encendido');
    }
    if (code.includes('led.off()') || code.includes('led.value(0)')) {
        output.push('💡 LED apagado');
    }
    if (code.includes('time.sleep')) {
        output.push('⏱️ Esperando...');
    }
    if (code.includes('while True')) {
        output.push('🔄 Bucle infinito iniciado');
    }
    
    setTimeout(() => {
        connection.ws.send(JSON.stringify({
            type: 'codeExecuted',
            deviceId: deviceId,
            output: output.join('\n'),
            timestamp: new Date().toISOString()
        }));
        
        log(`✅ Código ejecutado en ${deviceId}`, 'green');
    }, Math.random() * 1000 + 500);
}

// Manejar acciones específicas del dispositivo al conectar
function handleDeviceSpecificActions(clientId, deviceId) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    switch (deviceId) {
        case 'raspberry-pico':
            // Inyectar código automáticamente al conectar
            setTimeout(() => {
                const code = `# Código inyectado automáticamente
from machine import Pin
from time import sleep

# Configurar LED integrado
myLed = Pin("LED", Pin.OUT)

print("🚀 Pico iniciado - Código inyectado")
print("💡 Encendiendo LED...")

# Encender LED
myLed.value(1)
print("✅ LED encendido")

# Parpadear 3 veces
for i in range(3):
    myLed.value(0)
    sleep(0.2)
    myLed.value(1)
    sleep(0.2)
    print(f"✨ Parpadeo {i+1}/3")

print("🔄 LED permanecerá encendido")
print("📱 Pico listo para recibir comandos")

# Bucle principal
while True:
    myLed.value(1)   # Turn LED ON
    sleep(10)
    myLed.value(0)
    sleep(1)`;

                // Enviar código inyectado
                connection.ws.send(JSON.stringify({
                    type: 'codeInjected',
                    deviceId: deviceId,
                    code: code,
                    message: 'Código inyectado automáticamente'
                }));
                
                log(`💉 Código inyectado en Pico para #${clientId}`, 'cyan');
                
                // Simular ejecución del código
                setTimeout(() => {
                    connection.ws.send(JSON.stringify({
                        type: 'codeOutput',
                        deviceId: deviceId,
                        output: '🚀 Pico iniciado - Código inyectado\n💡 Encendiendo LED...\n✅ LED encendido\n✨ Parpadeo 1/3\n✨ Parpadeo 2/3\n✨ Parpadeo 3/3\n🔄 LED permanecerá encendido\n📱 Pico listo para recibir comandos\n🔄 Bucle infinito iniciado'
                    }));
                }, 500);
                
            }, 1000);
            break;

        case 'arduino-uno':
            // Simular parpadeo del LED integrado del Arduino
            setTimeout(() => {
                connection.ws.send(JSON.stringify({
                    type: 'deviceAction',
                    deviceId: deviceId,
                    action: 'led_blink',
                    message: 'LED integrado parpadeando',
                    pin: 'D13',
                    pattern: 'blink_5_times'
                }));
                log(`💡 LED del Arduino parpadeando para #${clientId}`, 'yellow');
            }, 1000);
            break;

        case 'microbit-v2':
            // Simular patrón de LED del micro:bit
            setTimeout(() => {
                connection.ws.send(JSON.stringify({
                    type: 'deviceAction',
                    deviceId: deviceId,
                    action: 'led_pattern',
                    message: 'Patrón de bienvenida en LED matrix',
                    pattern: 'smile_face'
                }));
                log(`😊 Patrón de bienvenida en micro:bit para #${clientId}`, 'yellow');
            }, 1000);
            break;
    }
}

// Simular datos del dispositivo
function startDeviceDataSimulation(clientId, deviceId) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    const device = connection.devices.get(deviceId);
    if (!device) return;

    // Simular diferentes tipos de datos según el dispositivo
    const interval = setInterval(() => {
        if (!connection.devices.has(deviceId)) {
            clearInterval(interval);
            return;
        }

        let sensorData = {};
        
        switch (deviceId) {
            case 'arduino-uno':
                sensorData = {
                    analog: {
                        A0: Math.floor(Math.random() * 1024),
                        A1: Math.floor(Math.random() * 1024),
                        A2: Math.floor(Math.random() * 1024)
                    },
                    digital: {
                        D2: Math.random() > 0.5 ? 1 : 0,
                        D3: Math.random() > 0.5 ? 1 : 0,
                        D13: Math.random() > 0.5 ? 1 : 0
                    }
                };
                break;
                
            case 'microbit-v2':
                sensorData = {
                    accelerometer: {
                        x: (Math.random() - 0.5) * 2000,
                        y: (Math.random() - 0.5) * 2000,
                        z: (Math.random() - 0.5) * 2000
                    },
                    temperature: Math.floor(Math.random() * 30 + 15),
                    buttonA: Math.random() > 0.8 ? 1 : 0,
                    buttonB: Math.random() > 0.8 ? 1 : 0
                };
                break;
                
            case 'raspberry-pico':
                sensorData = {
                    analog: {
                        GP26: Math.floor(Math.random() * 4096),
                        GP27: Math.floor(Math.random() * 4096),
                        GP28: Math.floor(Math.random() * 4096)
                    },
                    digital: {
                        GP0: Math.random() > 0.5 ? 1 : 0,
                        GP1: Math.random() > 0.5 ? 1 : 0,
                        GP2: Math.random() > 0.5 ? 1 : 0,
                        GP25: 1 // LED siempre encendido cuando conectado
                    }
                };
                break;
        }

        connection.ws.send(JSON.stringify({
            type: 'deviceData',
            deviceId: deviceId,
            data: {
                ...sensorData,
                timestamp: new Date().toISOString()
            }
        }));
        
    }, 1000 + Math.random() * 2000); // 1-3 segundos
}

// Iniciar servidor
server.listen(PORT, HOST, () => {
    log(`🚀 OpenBlock Link Simulator iniciado en ws://${HOST}:${PORT}`, 'bright');
    log(`📱 Simulando ${Object.keys(SIMULATED_DEVICES).length} dispositivos:`, 'blue');
    Object.values(SIMULATED_DEVICES).forEach(device => {
        log(`   • ${device.name} (${device.id})`, 'cyan');
    });
    log(`🔌 Esperando conexiones...`, 'green');
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    log(`\n🛑 Cerrando servidor...`, 'yellow');
    
    // Cerrar todas las conexiones
    activeConnections.forEach((connection, clientId) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.close(1000, 'Servidor cerrando');
        }
    });
    
    server.close(() => {
        log(`✅ Servidor cerrado correctamente`, 'green');
        process.exit(0);
    });
});

// Estadísticas del servidor
setInterval(() => {
    const stats = {
        activeConnections: activeConnections.size,
        totalDevices: Object.keys(SIMULATED_DEVICES).length,
        connectedDevices: Array.from(activeConnections.values())
            .reduce((total, conn) => total + conn.devices.size, 0)
    };
    
    if (stats.activeConnections > 0) {
        log(`📊 Estadísticas: ${stats.activeConnections} conexiones, ${stats.connectedDevices} dispositivos conectados`, 'blue');
    }
}, 30000); // Cada 30 segundos
