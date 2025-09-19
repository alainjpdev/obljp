#!/usr/bin/env node

/**
 * Simulador de OpenBlock Link Server con Conexión Real a Pico
 * Integra pico_connection_lib.py para conexión real a Raspberry Pi Pico
 * Compatible con Node.js v16+ y v22+
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración del servidor
const PORT = 20111;
const HOST = '0.0.0.0';

// Configuración de Pico real
const PICO_CONNECTION_LIB = path.join(__dirname, 'pico_connection_lib.py');
const PICO_BRIDGE = path.join(__dirname, 'pico_bridge.py');
let picoConnection = null;
let picoProcess = null;

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
        port: 'auto-detect',
        status: 'available',
        capabilities: ['digital', 'analog', 'pwm', 'i2c', 'spi', 'real_connection'],
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

// Funciones para manejar conexión real al Pico
async function findPicoPorts() {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', [PICO_BRIDGE, '--find-ports'], {
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
                try {
                    // Parsear la salida para extraer puertos
                    const lines = output.split('\n');
                    const ports = [];
                    
                    for (const line of lines) {
                        if (line.includes('✅ Encontrados') && line.includes('puerto(s) Pico:')) {
                            const match = line.match(/(\d+)/);
                            if (match) {
                                const count = parseInt(match[1]);
                                log(`🔍 Encontrados ${count} puerto(s) Pico`, 'green');
                            }
                        } else if (line.includes('- ') && line.includes(':')) {
                            const parts = line.split(':');
                            if (parts.length >= 2) {
                                const device = parts[0].replace('- ', '').trim();
                                const description = parts[1].trim();
                                ports.push({ device, description });
                            }
                        }
                    }
                    resolve(ports);
                } catch (e) {
                    reject(new Error(`Error parseando puertos: ${e.message}`));
                }
            } else {
                reject(new Error(`Error ejecutando Python: ${error}`));
            }
        });

        python.on('error', (err) => {
            reject(err);
        });
    });
}

async function connectToPico(port) {
    return new Promise((resolve, reject) => {
        log(`🔌 Conectando a Pico en puerto ${port}...`, 'cyan');
        
        const python = spawn('python3', [PICO_BRIDGE, '--connect', port], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            if (text.includes('PICO_CONNECTED')) {
                log(`✅ Pico conectado exitosamente`, 'green');
                resolve(python);
            } else if (text.includes('PICO_ERROR:') || text.includes('PICO_CONNECTION_FAILED')) {
                reject(new Error(`Error conectando al Pico: ${text}`));
            } else if (text.trim()) {
                log(`📥 Pico: ${text.trim()}`, 'blue');
            }
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
            log(`❌ Pico Error: ${data.toString().trim()}`, 'red');
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Proceso Python terminó con código ${code}: ${error}`));
            }
        });

        python.on('error', (err) => {
            reject(err);
        });
    });
}

async function executePicoCode(code) {
    return new Promise((resolve, reject) => {
        if (!picoProcess) {
            reject(new Error('Pico no está conectado'));
            return;
        }

        log(`🚀 Ejecutando código en Pico real...`, 'yellow');
        
        // Enviar código al proceso Python
        picoProcess.stdin.write(`EXECUTE_CODE:${code}\n`);
        
        let output = '';
        let timeout = setTimeout(() => {
            reject(new Error('Timeout ejecutando código'));
        }, 10000);

        const onData = (data) => {
            const text = data.toString();
            output += text;
            
            if (text.includes('CODE_EXECUTED')) {
                clearTimeout(timeout);
                picoProcess.stdout.removeListener('data', onData);
                resolve(output);
            }
        };

        picoProcess.stdout.on('data', onData);
    });
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
        message: 'Conectado a OpenBlock Link Simulator (Real Pico)',
        serverVersion: '2.0.0',
        clientId: clientId,
        realPicoAvailable: picoConnection !== null
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
async function handleMessage(clientId, message) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    switch (message.type) {
        case 'getDeviceList':
            await handleGetDeviceList(clientId);
            break;
            
        case 'connectDevice':
            await handleConnectDevice(clientId, message);
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
            await handleUploadCode(clientId, message);
            break;
            
        case 'executeCode':
            await handleExecuteCode(clientId, message);
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
async function handleGetDeviceList(clientId) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    // Buscar puertos Pico reales si no están disponibles
    if (picoConnection === null) {
        try {
            const ports = await findPicoPorts();
            if (ports.length > 0) {
                SIMULATED_DEVICES['raspberry-pico'].port = ports[0].device;
                SIMULATED_DEVICES['raspberry-pico'].status = 'available';
                log(`🔍 Pico real detectado en ${ports[0].device}`, 'green');
            } else {
                SIMULATED_DEVICES['raspberry-pico'].status = 'unavailable';
                log(`⚠️  No se encontró Pico real`, 'yellow');
            }
        } catch (error) {
            log(`❌ Error buscando Pico: ${error.message}`, 'red');
            SIMULATED_DEVICES['raspberry-pico'].status = 'unavailable';
        }
    }

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
async function handleConnectDevice(clientId, message) {
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
    setTimeout(async () => {
        if (connection.devices.has(deviceId)) {
            connection.ws.send(JSON.stringify({
                type: 'error',
                message: `Dispositivo ${deviceId} ya está conectado`
            }));
            return;
        }

        // Manejar conexión real al Pico
        if (deviceId === 'raspberry-pico' && device.status === 'available') {
            try {
                picoProcess = await connectToPico(device.port);
                picoConnection = picoProcess;
                
                // Configurar manejo de salida del Pico
                picoProcess.stdout.on('data', (data) => {
                    const output = data.toString().trim();
                    if (output && !output.includes('Conectando') && !output.includes('Conectado')) {
                        // Enviar salida a todos los clientes conectados al Pico
                        activeConnections.forEach((conn, id) => {
                            if (conn.devices.has('raspberry-pico')) {
                                conn.ws.send(JSON.stringify({
                                    type: 'picoOutput',
                                    deviceId: 'raspberry-pico',
                                    output: output,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }
                });

                log(`✅ Pico real conectado en ${device.port}`, 'green');
            } catch (error) {
                log(`❌ Error conectando Pico real: ${error.message}`, 'red');
                connection.ws.send(JSON.stringify({
                    type: 'error',
                    message: `Error conectando al Pico: ${error.message}`
                }));
                return;
            }
        }

        // Marcar dispositivo como conectado
        connection.devices.set(deviceId, {
            ...device,
            peripheralId: peripheralId || device.port,
            baudrate: baudrate,
            connectedAt: new Date().toISOString(),
            status: 'connected',
            isReal: deviceId === 'raspberry-pico' && picoConnection !== null
        });

        connection.ws.send(JSON.stringify({
            type: 'deviceConnected',
            deviceId: deviceId,
            peripheralId: peripheralId || device.port,
            baudrate: baudrate,
            capabilities: device.capabilities,
            pins: device.pins,
            isReal: deviceId === 'raspberry-pico' && picoConnection !== null
        }));

        log(`✅ Dispositivo ${deviceId} conectado a #${clientId}`, 'green');
        
        // Simular datos del dispositivo
        startDeviceDataSimulation(clientId, deviceId);
        
        // Simular acciones específicas del dispositivo al conectar
        await handleDeviceSpecificActions(clientId, deviceId);
        
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

    // Desconectar Pico real si es necesario
    if (deviceId === 'raspberry-pico' && picoConnection) {
        picoProcess.kill();
        picoConnection = null;
        picoProcess = null;
        log(`🔌 Pico real desconectado`, 'yellow');
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
        uptime: Date.now() - new Date(device.connectedAt).getTime(),
        isReal: device.isReal || false
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
async function handleUploadCode(clientId, message) {
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
    setTimeout(async () => {
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
async function handleExecuteCode(clientId, message) {
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

    const device = connection.devices.get(deviceId);
    
    // Si es Pico real, ejecutar código real
    if (deviceId === 'raspberry-pico' && device.isReal && picoConnection) {
        try {
            log(`🚀 Ejecutando código real en Pico...`, 'yellow');
            const output = await executePicoCode(code);
            
            connection.ws.send(JSON.stringify({
                type: 'codeExecuted',
                deviceId: deviceId,
                output: output,
                timestamp: new Date().toISOString(),
                isReal: true
            }));
            
            log(`✅ Código ejecutado en Pico real`, 'green');
            return;
        } catch (error) {
            log(`❌ Error ejecutando código en Pico real: ${error.message}`, 'red');
            connection.ws.send(JSON.stringify({
                type: 'error',
                message: `Error ejecutando código: ${error.message}`
            }));
            return;
        }
    }

    // Simulación para otros dispositivos
    log(`🚀 Ejecutando código simulado en ${deviceId}`, 'yellow');
    
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
            timestamp: new Date().toISOString(),
            isReal: false
        }));
        
        log(`✅ Código ejecutado en ${deviceId} (simulado)`, 'green');
    }, Math.random() * 1000 + 500);
}

// Manejar acciones específicas del dispositivo al conectar
async function handleDeviceSpecificActions(clientId, deviceId) {
    const connection = activeConnections.get(clientId);
    if (!connection) return;

    switch (deviceId) {
        case 'raspberry-pico':
            // Inyectar código automáticamente al conectar
            setTimeout(async () => {
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

                // Si es Pico real, ejecutar código real
                const device = connection.devices.get(deviceId);
                if (device && device.isReal && picoConnection) {
                    try {
                        await executePicoCode(code);
                        log(`💉 Código inyectado en Pico real para #${clientId}`, 'cyan');
                    } catch (error) {
                        log(`❌ Error inyectando código en Pico real: ${error.message}`, 'red');
                    }
                } else {
                    // Simular inyección de código
                    connection.ws.send(JSON.stringify({
                        type: 'codeInjected',
                        deviceId: deviceId,
                        code: code,
                        message: 'Código inyectado automáticamente'
                    }));
                    
                    log(`💉 Código inyectado en Pico simulado para #${clientId}`, 'cyan');
                    
                    // Simular ejecución del código
                    setTimeout(() => {
                        connection.ws.send(JSON.stringify({
                            type: 'codeOutput',
                            deviceId: deviceId,
                            output: '🚀 Pico iniciado - Código inyectado\n💡 Encendiendo LED...\n✅ LED encendido\n✨ Parpadeo 1/3\n✨ Parpadeo 2/3\n✨ Parpadeo 3/3\n🔄 LED permanecerá encendido\n📱 Pico listo para recibir comandos\n🔄 Bucle infinito iniciado'
                        }));
                    }, 500);
                }
                
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
                timestamp: new Date().toISOString(),
                isReal: device.isReal || false
            }
        }));
        
    }, 1000 + Math.random() * 2000); // 1-3 segundos
}

// Iniciar servidor
server.listen(PORT, HOST, async () => {
    log(`🚀 OpenBlock Link Simulator (Real Pico) iniciado en ws://${HOST}:${PORT}`, 'bright');
    log(`📱 Simulando ${Object.keys(SIMULATED_DEVICES).length} dispositivos:`, 'blue');
    Object.values(SIMULATED_DEVICES).forEach(device => {
        log(`   • ${device.name} (${device.id})`, 'cyan');
    });
    
    // Buscar Pico real al iniciar
    try {
        const ports = await findPicoPorts();
        if (ports.length > 0) {
            log(`🔍 Pico real detectado en: ${ports.map(p => p.device).join(', ')}`, 'green');
            SIMULATED_DEVICES['raspberry-pico'].port = ports[0].device;
            SIMULATED_DEVICES['raspberry-pico'].status = 'available';
        } else {
            log(`⚠️  No se encontró Pico real - usando simulación`, 'yellow');
        }
    } catch (error) {
        log(`❌ Error buscando Pico: ${error.message}`, 'red');
    }
    
    log(`🔌 Esperando conexiones...`, 'green');
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    log(`\n🛑 Cerrando servidor...`, 'yellow');
    
    // Cerrar conexión Pico real
    if (picoConnection) {
        picoProcess.kill();
        picoConnection = null;
        picoProcess = null;
        log(`🔌 Pico real desconectado`, 'yellow');
    }
    
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
            .reduce((total, conn) => total + conn.devices.size, 0),
        realPicoConnected: picoConnection !== null
    };
    
    if (stats.activeConnections > 0) {
        log(`📊 Estadísticas: ${stats.activeConnections} conexiones, ${stats.connectedDevices} dispositivos conectados, Pico real: ${stats.realPicoConnected ? '✅' : '❌'}`, 'blue');
    }
}, 30000); // Cada 30 segundos
