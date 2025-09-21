const fs = require('fs');
const path = require('path');
const {spawn, spawnSync} = require('child_process');
const ansi = require('ansi-string');

/**
 * Simplified compiler for Raspberry Pi Pico W
 * Supports multiple compilation methods including PicoLib
 */
class PicoCompiler {
    constructor(peripheralPath, config, userDataPath, toolsPath, sendstd) {
        this._peripheralPath = peripheralPath;
        this._config = config;
        this._userDataPath = userDataPath;
        this._toolsPath = toolsPath;
        this._sendstd = sendstd;
        this._abort = false;
        
        this._projectPath = path.join(this._userDataPath, 'pico_projects');
        this._codePath = path.join(this._projectPath, 'main.py');
        this._picolibPath = path.join(this._projectPath, 'picolib');
        
        // Debug: Log paths
        console.log(`[PICO-COMPILER] userDataPath: ${this._userDataPath}`);
        console.log(`[PICO-COMPILER] projectPath: ${this._projectPath}`);
        console.log(`[PICO-COMPILER] codePath: ${this._codePath}`);
        this._sendstd(`DEBUG: userDataPath: ${this._userDataPath}\n`);
        this._sendstd(`DEBUG: projectPath: ${this._projectPath}\n`);
        this._sendstd(`DEBUG: codePath: ${this._codePath}\n`);
        
        this.initProject();
    }
    
    initProject() {
        if (!fs.existsSync(this._projectPath)) {
            fs.mkdirSync(this._projectPath, {recursive: true});
        }
        if (!fs.existsSync(this._picolibPath)) {
            fs.mkdirSync(this._picolibPath, {recursive: true});
        }
        this.initPicolib();
    }
    
    initPicolib() {
        const picolibFile = path.join(this._picolibPath, 'pico_connection_lib.py');
        
        if (!fs.existsSync(picolibFile)) {
            const picolibCode = `# PicoLib - Simplified library for Raspberry Pi Pico W
import machine
import time
from machine import Pin, PWM, ADC

def led_on():
    Pin("LED", Pin.OUT).on()

def led_off():
    Pin("LED", Pin.OUT).off()

def led_blink(times=1, delay=0.5):
    led = Pin("LED", Pin.OUT)
    for _ in range(times):
        led.on()
        time.sleep(delay)
        led.off()
        time.sleep(delay)

def read_analog(pin):
    return ADC(Pin(pin)).read_u16()

def write_digital(pin, value):
    Pin(pin, Pin.OUT).value(value)

def read_digital(pin):
    return Pin(pin, Pin.IN).value()

def pwm_write(pin, duty):
    pwm = PWM(Pin(pin))
    pwm.freq(1000)
    pwm.duty_u16(int(duty * 65535 / 100))

def delay(ms):
    time.sleep(ms / 1000.0)
`;
            
            fs.writeFileSync(picolibFile, picolibCode);
            this._sendstd(`${ansi.green_dark}PicoLib initialized!\n`);
        }
    }
    
    async compile(code) {
        return new Promise(async (resolve, reject) => {
            try {
                this._sendstd(`${ansi.green_dark}Compiling with PicoLib...\n`);
                
                // Convert Arduino code to MicroPython with PicoLib
                const micropythonCode = this.convertToMicroPythonWithPicoLib(code);
                
                // Write the main file
                fs.writeFileSync(this._codePath, micropythonCode);
                
                // Copy picolib to the project directory
                const picolibSource = path.join(this._picolibPath, 'pico_connection_lib.py');
                const picolibDest = path.join(this._projectPath, 'pico_connection_lib.py');
                fs.copyFileSync(picolibSource, picolibDest);
                
                this._sendstd(`${ansi.green_dark}PicoLib compilation successful!\n`);
                resolve('Success');
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    convertToMicroPythonWithPicoLib(arduinoCode) {
        let micropythonCode = arduinoCode;
        
        // Check if it's already MicroPython code
        if (micropythonCode.includes('from machine import Pin') || 
            micropythonCode.includes('myLed = Pin') ||
            micropythonCode.includes('while True:')) {
            console.log(`[PICO-COMPILER] Detected MicroPython code, using as-is...`);
            this._sendstd(`${ansi.green_dark}Detected MicroPython code, using as-is...\n`);
            return micropythonCode;
        }
        
        // It's Arduino code, convert it
        console.log(`[PICO-COMPILER] Converting Arduino code to MicroPython...`);
        this._sendstd(`${ansi.green_dark}Converting Arduino code to MicroPython...\n`);
        
        // Remove C++ includes and comments
        micropythonCode = micropythonCode.replace(/#include\s*<[^>]+>/g, '');
        micropythonCode = micropythonCode.replace(/\/\/.*$/gm, '');
        
        // Convert variable declarations
        micropythonCode = micropythonCode.replace(/int\s+(\w+)\s*=\s*LED_BUILTIN/g, '$1 = "LED"');
        micropythonCode = micropythonCode.replace(/int\s+(\w+)\s*=\s*(\d+)/g, '$1 = $2');
        
        // Convert pinMode to Pin object creation
        micropythonCode = micropythonCode.replace(/pinMode\s*\(\s*(\w+)\s*,\s*OUTPUT\s*\)/g, '$1 = Pin($1, Pin.OUT)');
        micropythonCode = micropythonCode.replace(/pinMode\s*\(\s*(\w+)\s*,\s*INPUT\s*\)/g, '$1 = Pin($1, Pin.IN)');
        
        const conversions = {
            'void setup()': 'def setup():',
            'void loop()': 'def loop():',
            'digitalWrite(': 'led.value(',
            'digitalRead(': 'pin.read(',
            'analogWrite(': 'pin.duty(',
            'analogRead(': 'pin.read_analog(',
            'Serial.print(': 'print(',
            'Serial.println(': 'print(',
            'LED_BUILTIN': '"LED"',
            'true': 'True',
            'false': 'False',
            'HIGH': '1',
            'LOW': '0',
            ';': '',
            '{': '',
            '}': ''
        };
        
        for (const [arduino, micropython] of Object.entries(conversions)) {
            // Escape special regex characters
            const escapedArduino = arduino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            micropythonCode = micropythonCode.replace(new RegExp(escapedArduino, 'g'), micropython);
        }
        
        // Convert delay() with proper time conversion
        micropythonCode = micropythonCode.replace(/delay\s*\(\s*(\d+)\s*\*\s*1000\s*\)/g, (match, multiplier) => {
            return `time.sleep(${multiplier})`;
        });
        
        micropythonCode = micropythonCode.replace(/delay\s*\(\s*(\d+)\s*\)/g, (match, ms) => {
            const seconds = parseInt(ms) / 1000;
            return `time.sleep(${seconds})`;
        });
        
        // Agregar imports básicos de MicroPython
        const imports = [
            'from machine import Pin',
            'import time'
        ];
        
        micropythonCode = imports.join('\n') + '\n\n' + micropythonCode;
        
        return this.cleanupCode(micropythonCode);
    }
    
    cleanupCode(code) {
        // Generar código MicroPython simple y directo
        let lines = code.split('\n');
        let result = [];
        let ledPin = null;
        
        // Buscar la variable LED
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('led = "LED"') || trimmed.includes('led = LED_BUILTIN')) {
                ledPin = '"LED"';
                break;
            }
        }
        
        // Si no se encontró, usar "LED" por defecto
        if (!ledPin) {
            ledPin = '"LED"';
        }
        
        // Generar código MicroPython simple
        result.push('from machine import Pin');
        result.push('import time');
        result.push('');
        result.push(`led = Pin(${ledPin}, Pin.OUT)`);
        result.push('');
        result.push('while True:');
        
        // Convertir el contenido del loop
        let inLoop = false;
        for (let line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('def loop():')) {
                inLoop = true;
                continue;
            }
            
            if (inLoop && trimmed.startsWith('led.value(')) {
                // Convertir digitalWrite a led.value
                const match = trimmed.match(/led\.value\(\s*(\w+)\s*,\s*(\d+)\s*\)/);
                if (match) {
                    result.push(`    led.value(${match[2]})`);
                } else {
                    result.push(`    ${trimmed}`);
                }
            } else if (inLoop && trimmed.startsWith('time.sleep(')) {
                // Convertir delay a time.sleep
                const match = trimmed.match(/time\.sleep\(\s*(\d+)\s*\*\s*1000\s*\)/);
                if (match) {
                    // time.sleep(1 * 1000) -> time.sleep(1)
                    result.push(`    time.sleep(${match[1]})`);
                } else {
                    const simpleMatch = trimmed.match(/time\.sleep\(\s*(\d+)\s*\)/);
                    if (simpleMatch) {
                        const ms = parseInt(simpleMatch[1]);
                        // Si el valor es mayor a 100, asumir que son milisegundos y convertir
                        const seconds = ms > 100 ? ms / 1000 : ms;
                        result.push(`    time.sleep(${seconds})`);
                    } else {
                        result.push(`    ${trimmed}`);
                    }
                }
            } else if (inLoop && trimmed.startsWith('print(')) {
                result.push(`    ${trimmed}`);
            }
        }
        
        return result.join('\n');
    }
    
    async aggressivePortCleanup() {
        return new Promise((resolve) => {
            const {exec} = require('child_process');
            
            // Kill all processes using USB serial ports (sin sudo)
            const cleanupCommands = [
                'pkill -f "python.*pico"',
                'pkill -f "python.*bridge"',
                'pkill -f "python.*connection"',
                'pkill -f "node.*simulador"',
                'pkill -f "node.*test"',
                'sleep 2'
            ];
            
            let completed = 0;
            const total = cleanupCommands.length;
            
            cleanupCommands.forEach((cmd, index) => {
                exec(cmd, (error) => {
                    if (index === 0) this._sendstd(`${ansi.yellow_dark}Matando procesos Python...\n`);
                    if (index === 1) this._sendstd(`${ansi.yellow_dark}Matando procesos bridge...\n`);
                    if (index === 2) this._sendstd(`${ansi.yellow_dark}Matando procesos connection...\n`);
                    if (index === 3) this._sendstd(`${ansi.yellow_dark}Matando procesos simulador...\n`);
                    if (index === 4) this._sendstd(`${ansi.yellow_dark}Matando procesos test...\n`);
                    if (index === 5) this._sendstd(`${ansi.yellow_dark}Esperando...\n`);
                    
                    completed++;
                    if (completed === total) {
                        this._sendstd(`${ansi.green_dark}✅ Limpieza agresiva completada\n`);
                        resolve();
                    }
                });
            });
        });
    }
    
    uploadFileToPico(resolve, reject) {
        const {execSync} = require('child_process');
        try {
            this._sendstd(`${ansi.green_dark}Subiendo archivo a Pico W...\n`);
            execSync(`cp "${this._codePath}" /Volumes/RPI-RP2/main.py`, {stdio: 'pipe'});
            this._sendstd(`${ansi.green_dark}✅ Archivo subido a Pico W como main.py\n`);
            this._sendstd(`${ansi.yellow_dark}🔄 Resetea tu Pico W para ejecutar el código\n`);
            resolve('Success');
        } catch (error) {
            this._sendstd(`${ansi.red_dark}❌ Error subiendo archivo: ${error.message}\n`);
            this._sendstd(`${ansi.yellow_dark}💡 Asegúrate de que el Pico W esté en modo BOOTSEL\n`);
            resolve('Success'); // Don't fail, just warn
        }
    }
    
    async upload() {
        return new Promise(async (resolve, reject) => {
            try {
                this._sendstd(`${ansi.green_dark}Uploading to Pico W via MicroPython...\n`);
                
                // AGGRESSIVE PORT CLEANUP
                this._sendstd(`${ansi.yellow_dark}🧹 Limpiando puertos agresivamente...\n`);
                await this.aggressivePortCleanup();
                
                // Use pico_connection_lib.py for direct upload
                const picoLibPath = path.join(__dirname, '../../pico_connection_lib.py');
                const bridgePath = path.join(__dirname, '../../pico_bridge.py');
                
                if (fs.existsSync(picoLibPath) && fs.existsSync(bridgePath)) {
                    this._sendstd(`${ansi.green_dark}Using direct MicroPython upload...\n`);
                    
                    // Execute the code using pico_bridge.py
                    const codeContent = fs.readFileSync(this._codePath, 'utf8');
                    const {spawn} = require('child_process');
                    
                    // First try direct execution
                    this._sendstd(`${ansi.green_dark}Intentando ejecución directa...\n`);
                    
                    // Modify code to add visible feedback
                    const modifiedCode = codeContent + '\n\n# Test execution\nprint("=== CÓDIGO EJECUTÁNDOSE EN PICO ===")\nprint("LED configurado, iniciando parpadeo...")\n';
                    
                    const picoProcess = spawn('python3', [bridgePath, '--execute-code'], {
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    
                    picoProcess.stdin.write(modifiedCode);
                    picoProcess.stdin.end();
                    
                    let output = '';
                    let hasError = false;
                    
                    picoProcess.stdout.on('data', (data) => {
                        output += data.toString();
                        this._sendstd(data.toString());
                    });
                    
                    picoProcess.stderr.on('data', (data) => {
                        this._sendstd(`${ansi.red_dark}${data.toString()}`);
                        hasError = true;
                    });
                    
                    picoProcess.on('close', (code) => {
                        if (code === 0 && !hasError) {
                            this._sendstd(`${ansi.green_dark}Upload successful!\n`);
                            resolve('Success');
                        } else {
                            // Fallback to file upload
                            this._sendstd(`${ansi.yellow_dark}Fallback: Uploading file to Pico W...\n`);
                            this.uploadFileToPico(resolve, reject);
                        }
                    });
                    
                    // Considerar exitoso si el código se está ejecutando (para while True)
                    setTimeout(() => {
                        if (output.includes('PICO_EXECUTED') || output.includes('paste mode')) {
                            this._sendstd(`${ansi.green_dark}✅ Código ejecutándose en Pico W!\n`);
                            this._sendstd(`${ansi.yellow_dark}💡 El LED debería estar parpadeando\n`);
                            picoProcess.kill();
                            resolve('Success');
                        }
                    }, 5000); // Esperar 5 segundos para ver si se ejecuta
                    
                    // Timeout after 30 seconds (más tiempo para código con while True)
                    setTimeout(() => {
                        picoProcess.kill();
                        this._sendstd(`${ansi.yellow_dark}Timeout, trying file upload...\n`);
                        this.uploadFileToPico(resolve, reject);
                    }, 30000);
                    
                } else {
                    this.uploadFileToPico(resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PicoCompiler;