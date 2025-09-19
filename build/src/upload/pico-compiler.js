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
        
        const conversions = {
            'void setup()': 'def setup():',
            'void loop()': 'def loop():',
            'digitalWrite(': 'write_digital(',
            'digitalRead(': 'read_digital(',
            'analogWrite(': 'pwm_write(',
            'analogRead(': 'read_analog(',
            'delay(': 'delay(',
            'Serial.print(': 'print(',
            'Serial.println(': 'print(',
            'true': 'True',
            'false': 'False',
            'HIGH': '1',
            'LOW': '0',
            ';': '',
            '{': '',
            '}': '',
            '//': '#'
        };
        
        for (const [arduino, micropython] of Object.entries(conversions)) {
            // Escape special regex characters
            const escapedArduino = arduino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            micropythonCode = micropythonCode.replace(new RegExp(escapedArduino, 'g'), micropython);
        }
        
        const imports = [
            'import sys',
            'sys.path.append(".")',
            'from pico_connection_lib import *',
            'import time'
        ];
        
        micropythonCode = imports.join('\n') + '\n\n' + micropythonCode;
        
        return this.cleanupCode(micropythonCode);
    }
    
    cleanupCode(code) {
        let lines = code.split('\n').filter(line => line.trim() !== '');
        let result = [];
        let indentLevel = 0;
        
        for (let line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('def ')) {
                indentLevel = 0;
            } else if (trimmed.startsWith('if ') || trimmed.startsWith('for ') || trimmed.startsWith('while ')) {
                indentLevel = 1;
            }
            
            result.push('    '.repeat(indentLevel) + trimmed);
        }
        
        return result.join('\n');
    }
    
    async upload() {
        return new Promise(async (resolve, reject) => {
            try {
                this._sendstd(`${ansi.green_dark}Uploading to Pico W via MicroPython...\n`);
                
                // Use pico_connection_lib.py for direct upload
                const picoLibPath = path.join(__dirname, '../../pico_connection_lib.py');
                const bridgePath = path.join(__dirname, '../../pico_bridge.py');
                
                if (fs.existsSync(picoLibPath) && fs.existsSync(bridgePath)) {
                    this._sendstd(`${ansi.green_dark}Using direct MicroPython upload...\n`);
                    
                    // Execute the code using pico_bridge.py
                    const codeContent = fs.readFileSync(this._codePath, 'utf8');
                    const {spawn} = require('child_process');
                    
                    const picoProcess = spawn('python3', [bridgePath, '--execute-code'], {
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    
                    picoProcess.stdin.write(codeContent);
                    picoProcess.stdin.end();
                    
                    let output = '';
                    picoProcess.stdout.on('data', (data) => {
                        output += data.toString();
                        this._sendstd(data.toString());
                    });
                    
                    picoProcess.stderr.on('data', (data) => {
                        this._sendstd(`${ansi.red_dark}${data.toString()}`);
                    });
                    
                    picoProcess.on('close', (code) => {
                        if (code === 0) {
                            this._sendstd(`${ansi.green_dark}Upload successful!\n`);
                            resolve('Success');
                        } else {
                            reject(new Error(`Upload failed with code ${code}`));
                        }
                    });
                    
                } else {
                    // Fallback to manual instructions
                    this._sendstd(`${ansi.yellow_dark}Manual upload required:\n`);
                    this._sendstd(`${ansi.yellow_dark}1. Put your Pico W in BOOTSEL mode\n`);
                    this._sendstd(`${ansi.yellow_dark}2. Copy ${this._codePath} to Pico W as main.py\n`);
                    this._sendstd(`${ansi.yellow_dark}3. Copy pico_connection_lib.py to Pico W\n`);
                    this._sendstd(`${ansi.yellow_dark}4. Reset the Pico W\n`);
                    this._sendstd(`${ansi.green_dark}Ready to upload!\n`);
                    resolve('Success');
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PicoCompiler;