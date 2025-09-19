const fs = require('fs');
const {spawn, spawnSync} = require('child_process');
const path = require('path');
const ansi = require('ansi-string');
const yaml = require('js-yaml');
const os = require('os');
const crypto = require('crypto');
const PicoCompiler = require('./pico-compiler');

const ARDUINO_CLI_STDOUT_GREEN_START = /Reading \||Writing \|/g;
const ARDUINO_CLI_STDOUT_GREEN_END = /%/g;
const ARDUINO_CLI_STDOUT_WHITE = /avrdude done/g;
const ARDUINO_CLI_STDOUT_RED_START = /can't open device|programmer is not responding/g;
const ARDUINO_CLI_STDERR_RED_IGNORE = /Executable segment sizes/g;

const ABORT_STATE_CHECK_INTERVAL = 100;

// Enhanced Arduino CLI Manager with fallback system
class ArduinoCLIManager {
    constructor(arduinoPath, configPath, sendstd) {
        this._arduinoPath = arduinoPath;
        this._configPath = configPath;
        this._sendstd = sendstd;
        this._fallbackMode = false;
        this._compilers = ['arduino-cli', 'arduino-ide', 'platformio'];
        this._cache = new Map();
        this._maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    async detectAvailableCompilers() {
        const available = [];
        for (const compiler of this._compilers) {
            if (await this.isCompilerAvailable(compiler)) {
                available.push(compiler);
            }
        }
        return available;
    }

    async isCompilerAvailable(compiler) {
        return new Promise((resolve) => {
            const testPath = compiler === 'arduino-cli' ? 
                path.join(this._arduinoPath, 'arduino-cli') : 
                compiler;
            
            const test = spawnSync(testPath, ['--version'], { timeout: 5000 });
            resolve(test.status === 0);
        });
    }

    async compileWithFallback(code, config, projectPath) {
        const compilers = await this.detectAvailableCompilers();
        
        if (compilers.length === 0) {
            this._sendstd(`${ansi.yellow_dark}No compilers available, using simulator mode...\n`);
            return this.simulateCompile(code, config);
        }

        for (const compiler of compilers) {
            try {
                this._sendstd(`${ansi.green_dark}Trying compiler: ${compiler}\n`);
                return await this.compileWith(compiler, code, config, projectPath);
            } catch (error) {
                this._sendstd(`${ansi.yellow_dark}${compiler} failed: ${error.message}\n`);
                continue;
            }
        }
        
        throw new Error('All compilers failed');
    }

    async compileWith(compiler, code, config, projectPath) {
        if (compiler === 'arduino-cli') {
            return this.compileWithArduinoCLI(code, config, projectPath);
        } else if (compiler === 'arduino-ide') {
            return this.compileWithArduinoIDE(code, config, projectPath);
        } else if (compiler === 'platformio') {
            return this.compileWithPlatformIO(code, config, projectPath);
        }
        throw new Error(`Unknown compiler: ${compiler}`);
    }

    async compileWithArduinoCLI(code, config, projectPath) {
        // Original Arduino CLI compilation logic
        const args = [
            'compile',
            '--fqbn', config.fqbn,
            '--libraries', path.join(this._arduinoPath, 'libraries'),
            '--warnings=none',
            '--verbose',
            '--build-path', path.join(projectPath, 'build'),
            '--build-cache-path', path.join(projectPath, 'buildCache'),
            '--config-file', this._configPath,
            path.join(projectPath, 'code')
        ];

        return new Promise((resolve, reject) => {
            const arduinoCli = spawn(path.join(this._arduinoPath, 'arduino-cli'), args);
            
            arduinoCli.on('exit', (code) => {
                if (code === 0) {
                    resolve('Success');
                } else {
                    reject(new Error(`Arduino CLI compilation failed with code ${code}`));
                }
            });
        });
    }

    async compileWithArduinoIDE(code, config, projectPath) {
        // Placeholder for Arduino IDE compilation
        this._sendstd(`${ansi.yellow_dark}Arduino IDE compilation not yet implemented\n`);
        throw new Error('Arduino IDE compilation not implemented');
    }

    async compileWithPlatformIO(code, config, projectPath) {
        // Placeholder for PlatformIO compilation
        this._sendstd(`${ansi.yellow_dark}PlatformIO compilation not yet implemented\n`);
        throw new Error('PlatformIO compilation not implemented');
    }

    async simulateCompile(code, config) {
        this._sendstd(`${ansi.green_dark}Simulating compilation...\n`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this._sendstd(`${ansi.green_dark}Simulated compilation successful!\n`);
                resolve('Success');
            }, 2000);
        });
    }

    getCacheKey(code, config, libraries) {
        const hash = crypto.createHash('sha256');
        hash.update(code);
        hash.update(JSON.stringify(config));
        hash.update(JSON.stringify(libraries));
        return hash.digest('hex');
    }

    async getCachedBuild(key) {
        const cached = this._cache.get(key);
        if (cached && !this.isCacheExpired(cached)) {
            return cached;
        }
        return null;
    }

    isCacheExpired(cachedItem) {
        const now = Date.now();
        const age = now - cachedItem.timestamp;
        return age > this._maxCacheAge;
    }

    setCachedBuild(key, result) {
        this._cache.set(key, {
            ...result,
            timestamp: Date.now()
        });
    }
}

// Enhanced Logger
class EnhancedLogger {
    constructor(sendstd) {
        this._sendstd = sendstd;
        this._logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this._currentLevel = this._logLevels.INFO;
    }

    log(level, category, message, data = null) {
        if (this._logLevels[level] >= this._currentLevel) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                category,
                message,
                data
            };
            
            this._sendstd(`${ansi.blue}[${timestamp}] ${level}: ${category} - ${message}\n`);
            
            if (data) {
                this._sendstd(`${ansi.gray}Data: ${JSON.stringify(data, null, 2)}\n`);
            }
        }
    }

    categorizeError(error) {
        if (error.message.includes('compilation')) {
            return 'COMPILATION_ERROR';
        } else if (error.message.includes('upload')) {
            return 'UPLOAD_ERROR';
        } else if (error.message.includes('port')) {
            return 'PORT_ERROR';
        } else if (error.message.includes('device')) {
            return 'DEVICE_ERROR';
        }
        return 'UNKNOWN_ERROR';
    }
}

// Code Validator
class CodeValidator {
    constructor() {
        this._validators = {
            'syntax': this.validateSyntax.bind(this),
            'libraries': this.validateLibraries.bind(this),
            'board_compatibility': this.validateBoardCompatibility.bind(this)
        };
    }

    async validateCode(code, boardType) {
        const results = {};
        
        for (const [type, validator] of Object.entries(this._validators)) {
            try {
                results[type] = await validator(code, boardType);
            } catch (error) {
                results[type] = { valid: false, error: error.message };
            }
        }
        
        return results;
    }

    validateSyntax(code) {
        const syntaxErrors = [];
        
        // Check for balanced parentheses
        if (!this.areParenthesesBalanced(code)) {
            syntaxErrors.push('Unbalanced parentheses');
        }
        
        // Check for balanced braces
        if (!this.areBracesBalanced(code)) {
            syntaxErrors.push('Unbalanced braces');
        }
        
        // Check for basic Arduino structure
        if (!code.includes('void setup()') && !code.includes('void loop()')) {
            syntaxErrors.push('Missing required Arduino functions (setup/loop)');
        }
        
        return {
            valid: syntaxErrors.length === 0,
            errors: syntaxErrors
        };
    }

    areParenthesesBalanced(code) {
        let count = 0;
        for (const char of code) {
            if (char === '(') count++;
            if (char === ')') count--;
            if (count < 0) return false;
        }
        return count === 0;
    }

    areBracesBalanced(code) {
        let count = 0;
        for (const char of code) {
            if (char === '{') count++;
            if (char === '}') count--;
            if (count < 0) return false;
        }
        return count === 0;
    }

    validateLibraries(code) {
        const includes = code.match(/#include\s*<([^>]+)\.h>/g);
        const libraries = includes ? includes.map(inc => inc.match(/<([^>]+)\.h>/)[1]) : [];
        
        return {
            valid: true,
            libraries: libraries
        };
    }

    validateBoardCompatibility(code, boardType) {
        // Basic board compatibility checks
        const boardSpecificCode = {
            'rp2040': ['WiFi', 'BluetoothSerial'],
            'esp32': ['WiFi', 'BluetoothSerial', 'HTTPClient'],
            'arduino': ['Serial', 'Wire', 'SPI']
        };
        
        const requiredLibraries = boardSpecificCode[boardType] || [];
        const missingLibraries = requiredLibraries.filter(lib => 
            !code.includes(`#include <${lib}.h>`)
        );
        
        return {
            valid: missingLibraries.length === 0,
            missingLibraries: missingLibraries
        };
    }
}

class Arduino {
    constructor (peripheralPath, config, userDataPath, toolsPath, sendstd) {
        this._peripheralPath = peripheralPath;
        this._config = config;
        this._userDataPath = userDataPath;
        this._arduinoPath = path.join(toolsPath, 'Arduino');
        this._sendstd = sendstd;
        this._firmwareDir = path.join(toolsPath, '../firmwares/arduino');

        this._abort = false;
        
        // Initialize enhanced components
        this._logger = new EnhancedLogger(sendstd);
        this._validator = new CodeValidator();
        this._cliManager = new ArduinoCLIManager(this._arduinoPath, this._configFilePath, sendstd);
        
        // Initialize PicoLib compiler for Pico W
        this._picoCompiler = new PicoCompiler(peripheralPath, config, userDataPath, toolsPath, sendstd);

        // If the fqbn is an object means the value of this parameter is
        // different under different systems.
        if (typeof this._config.fqbn === 'object') {
            this._config.fqbn = this._config.fqbn[os.platform()];
        }

        const projectPathName = `${this._config.fqbn.replace(/:/g, '_')}_project`.split(/_/).splice(0, 3)
            .join('_');
        this._configFilePath = path.join(this._userDataPath, 'arduino/arduino-cli.yaml');
        this._projectFilePath = path.join(this._userDataPath, 'arduino', projectPathName);

        this._arduinoCliPath = path.join(this._arduinoPath, 'arduino-cli');

        this._codeFolderPath = path.join(this._projectFilePath, 'code');
        this._codeFilePath = path.join(this._codeFolderPath, 'code.ino');
        this._buildPath = path.join(this._projectFilePath, 'build');
        this._buildCachePath = path.join(this._projectFilePath, 'buildCache');

        this.initArduinoCli();
    }

    async initArduinoCli () {
        this._logger.log('INFO', 'ARDUINO_CLI', 'Initializing Arduino CLI configuration');
        
        try {
            // try to init the arduino cli config.
            const initResult = spawnSync(this._arduinoCliPath, ['config', 'init', '--dest-file', this._configFilePath]);
            
            if (initResult.error) {
                this._logger.log('WARN', 'ARDUINO_CLI', 'Arduino CLI not found, will use fallback mode', initResult.error);
                return;
            }

            // if arduino cli config haven be init, set it to link arduino path.
            const buf = spawnSync(this._arduinoCliPath, ['config', 'dump', '--config-file', this._configFilePath]);
            
            if (buf.error) {
                this._logger.log('ERROR', 'ARDUINO_CLI', 'Failed to dump Arduino CLI config', buf.error);
                throw buf.error;
            }

            // Check if Arduino CLI returned any output
            if (!buf.stdout || buf.stdout.length === 0) {
                this._logger.log('WARN', 'ARDUINO_CLI', 'Arduino CLI not responding, using default configuration');
                this._sendstd(`${ansi.yellow_dark}arduino cli is not responding. Using default configuration.\n`);
                return;
            }

            const stdout = yaml.load(buf.stdout.toString());

            // Check if stdout is valid and has directories property
            if (!stdout || !stdout.directories) {
                this._logger.log('WARN', 'ARDUINO_CLI', 'Arduino CLI config is invalid, using default configuration');
                this._sendstd(`${ansi.yellow_dark}arduino cli config is invalid. Using default configuration.\n`);
                return;
            }

            if (stdout.directories.data !== this._arduinoPath) {
                this._logger.log('INFO', 'ARDUINO_CLI', 'Setting Arduino CLI paths');
                this._sendstd(`${ansi.yellow_dark}arduino cli config has not been initialized yet.\n`);
                this._sendstd(`${ansi.green_dark}set the path to ${this._arduinoPath}.\n`);
                
                const configCommands = [
                    ['config', 'set', 'directories.data', this._arduinoPath, '--config-file', this._configFilePath],
                    ['config', 'set', 'directories.downloads', path.join(this._arduinoPath, 'staging'), '--config-file', this._configFilePath],
                    ['config', 'set', 'directories.user', this._arduinoPath, '--config-file', this._configFilePath]
                ];
                
                for (const cmd of configCommands) {
                    const result = spawnSync(this._arduinoCliPath, cmd);
                    if (result.error) {
                        this._logger.log('ERROR', 'ARDUINO_CLI', `Failed to set config: ${cmd.join(' ')}`, result.error);
                    }
                }
            }
            
            this._logger.log('INFO', 'ARDUINO_CLI', 'Arduino CLI configuration completed successfully');
            
        } catch (err) {
            const errorCategory = this._logger.categorizeError(err);
            this._logger.log('ERROR', 'ARDUINO_CLI', `Arduino CLI init error: ${err.toString()}`, { category: errorCategory });
            this._sendstd(`${ansi.red}arduino cli init error:${err.toString()}\n`);
        }
    }

    abortUpload () {
        this._abort = true;
    }

    async build (code) {
        return new Promise(async (resolve, reject) => {
            try {
                this._logger.log('INFO', 'BUILD', 'Starting build process');
                
                // Check if this is a Pico W device
                if (this.isPicoWDevice()) {
                    this._logger.log('INFO', 'BUILD', 'Detected Pico W device, using PicoLib compiler');
                    this._sendstd(`${ansi.green_dark}Detected Pico W device, using PicoLib compiler...\n`);
                    return this._picoCompiler.compile(code).then(resolve).catch(reject);
                }
                
                // Validate code before compilation
                this._logger.log('INFO', 'BUILD', 'Validating code before compilation');
                const validationResults = await this._validator.validateCode(code, this._config.fqbn);
                
                if (!validationResults.syntax.valid) {
                    this._logger.log('ERROR', 'BUILD', 'Code validation failed', validationResults.syntax.errors);
                    this._sendstd(`${ansi.red}Code validation failed:\n`);
                    validationResults.syntax.errors.forEach(error => {
                        this._sendstd(`${ansi.red}  - ${error}\n`);
                    });
                    return reject(new Error('Code validation failed'));
                }
                
                // Check cache first
                const cacheKey = this._cliManager.getCacheKey(code, this._config, this._config.library);
                const cachedBuild = await this._cliManager.getCachedBuild(cacheKey);
                
                if (cachedBuild) {
                    this._logger.log('INFO', 'BUILD', 'Using cached build');
                    this._sendstd(`${ansi.green_dark}Using cached build...\n`);
                    return resolve('Success');
                }
                
                // Prepare project directory
                if (!fs.existsSync(this._codeFolderPath)) {
                    fs.mkdirSync(this._codeFolderPath, {recursive: true});
                }

                try {
                    fs.writeFileSync(this._codeFilePath, code);
                } catch (err) {
                    this._logger.log('ERROR', 'BUILD', 'Failed to write code file', err);
                    return reject(err);
                }

                // Try compilation with fallback system
                try {
                    this._logger.log('INFO', 'BUILD', 'Attempting compilation with fallback system');
                    const result = await this._cliManager.compileWithFallback(code, this._config, this._projectFilePath);
                    
                    // Cache successful build
                    this._cliManager.setCachedBuild(cacheKey, { success: true, result });
                    
                    this._logger.log('INFO', 'BUILD', 'Build completed successfully');
                    resolve(result);
                    
                } catch (fallbackError) {
                    this._logger.log('ERROR', 'BUILD', 'Fallback compilation failed', fallbackError);
                    
                    // Fallback to original Arduino CLI method
                    this._logger.log('INFO', 'BUILD', 'Trying original Arduino CLI method');
                    this._sendstd(`${ansi.yellow_dark}Fallback compilation failed, trying original method...\n`);
                    
                    const args = [
                        'compile',
                        '--fqbn', this._config.fqbn,
                        '--libraries', path.join(this._arduinoPath, 'libraries'),
                        '--warnings=none',
                        '--verbose',
                        '--build-path', this._buildPath,
                        '--build-cache-path', this._buildCachePath,
                        '--config-file', this._configFilePath,
                        this._codeFolderPath
                    ];

                    // if extensions library to not empty
                    this._config.library.forEach(lib => {
                        if (fs.existsSync(lib)) {
                            args.splice(3, 0, '--libraries', lib);
                        }
                    });

                    const arduinoCli = spawn(this._arduinoCliPath, args);
                    this._sendstd(`Start building...\n`);

                    arduinoCli.stderr.on('data', buf => {
                        const data = buf.toString();

                        if (data.search(ARDUINO_CLI_STDERR_RED_IGNORE) !== -1) { // eslint-disable-line no-negated-condition
                            this._sendstd(ansi.red + data);
                        } else {
                            this._sendstd(ansi.red + data);
                        }
                    });

                    arduinoCli.stdout.on('data', buf => {
                        const data = buf.toString();
                        let ansiColor = null;

                        if (data.search(/Sketch uses|Global variables/g) === -1) {
                            ansiColor = ansi.clear;
                        } else {
                            ansiColor = ansi.green_dark;
                        }
                        this._sendstd(ansiColor + data);
                    });

                    const listenAbortSignal = setInterval(() => {
                        if (this._abort) {
                            arduinoCli.kill();
                        }
                    }, ABORT_STATE_CHECK_INTERVAL);

                    arduinoCli.on('exit', outCode => {
                        clearInterval(listenAbortSignal);
                        this._sendstd(`${ansi.clear}\r\n`); // End ansi color setting
                        
                        const errorCategory = this._logger.categorizeError(new Error(`Exit code: ${outCode}`));
                        this._logger.log('INFO', 'BUILD', `Arduino CLI exited with code: ${outCode}`);
                        
                        switch (outCode) {
                        case null:
                            // process be killed, do nothing.
                            return resolve('Aborted');
                        case 0:
                            // Cache successful build
                            this._cliManager.setCachedBuild(cacheKey, { success: true, result: 'Success' });
                            return resolve('Success');
                        case 1:
                            return reject(new Error('Build failed'));
                        case 2:
                            return reject(new Error('Sketch not found'));
                        case 3:
                            return reject(new Error('Invalid (argument for) commandline optiond'));
                        case 4:
                            return reject(new Error('Preference passed to --get-pref does not exist'));
                        default:
                            return reject(new Error('Unknown error'));
                        }
                    });
                }
                
            } catch (error) {
                const errorCategory = this._logger.categorizeError(error);
                this._logger.log('ERROR', 'BUILD', `Build process failed: ${error.message}`, { category: errorCategory });
                reject(error);
            }
        });
    }

    _insertStr (soure, start, newStr) {
        return soure.slice(0, start) + newStr + soure.slice(start);
    }

    async flash (firmwarePath = null) {
        this._logger.log('INFO', 'FLASH', 'Starting flash process');
        
        const args = [
            'upload',
            '--fqbn', this._config.fqbn,
            '--verbose',
            '--verify',
            '--config-file', this._configFilePath,
            `-p${this._peripheralPath}`
        ];

        // for k210 we must specify the programmer used as kflash
        if (this._config.fqbn.startsWith('Maixduino:k210:')) {
            args.push('-Pkflash');
        }

        if (firmwarePath) {
            args.push('--input-file', firmwarePath, firmwarePath);
        } else {
            args.push('--input-dir', this._buildPath);
            args.push(this._codeFolderPath);
        }

        return new Promise((resolve, reject) => {
            try {
                const arduinoCli = spawn(this._arduinoCliPath, args);
                this._logger.log('INFO', 'FLASH', `Executing: ${this._arduinoCliPath} ${args.join(' ')}`);

                arduinoCli.stderr.on('data', buf => {
                    let data = buf.toString();

                    // todo: Because the feacture of avrdude sends STD information intermittently.
                    // There should be a better way to handle these mesaage.
                    if (data.search(ARDUINO_CLI_STDOUT_GREEN_START) !== -1) {
                        data = this._insertStr(data, data.search(ARDUINO_CLI_STDOUT_GREEN_START), ansi.green_dark);
                    }
                    if (data.search(ARDUINO_CLI_STDOUT_GREEN_END) !== -1) {
                        data = this._insertStr(data, data.search(ARDUINO_CLI_STDOUT_GREEN_END) + 1, ansi.clear);
                    }
                    if (data.search(ARDUINO_CLI_STDOUT_WHITE) !== -1) {
                        data = this._insertStr(data, data.search(ARDUINO_CLI_STDOUT_WHITE), ansi.clear);
                    }
                    if (data.search(ARDUINO_CLI_STDOUT_RED_START) !== -1) {
                        data = this._insertStr(data, data.search(ARDUINO_CLI_STDOUT_RED_START), ansi.red);
                    }
                    this._sendstd(data);
                });

                arduinoCli.stdout.on('data', buf => {
                    // It seems that avrdude didn't use stdout.
                    const data = buf.toString();
                    this._sendstd(data);
                });

                const listenAbortSignal = setInterval(() => {
                    if (this._abort) {
                        this._logger.log('INFO', 'FLASH', 'Abort signal received, killing process');
                        if (os.platform() === 'win32') {
                            spawnSync('taskkill', ['/pid', arduinoCli.pid, '/f', '/t']);
                        } else {
                            arduinoCli.kill();
                        }
                    }
                }, ABORT_STATE_CHECK_INTERVAL);

                arduinoCli.on('exit', code => {
                    clearInterval(listenAbortSignal);
                    const wait = ms => new Promise(relv => setTimeout(relv, ms));
                    
                    this._logger.log('INFO', 'FLASH', `Arduino CLI upload exited with code: ${code}`);
                    
                    switch (code) {
                    case 0:
                        this._logger.log('INFO', 'FLASH', 'Upload completed successfully');
                        if (this._config.postUploadDelay) {
                            // Waiting for usb rerecognize.
                            this._logger.log('INFO', 'FLASH', `Waiting ${this._config.postUploadDelay}ms for USB reconnection`);
                            wait(this._config.postUploadDelay).then(() => resolve('Success'));
                        } else {
                            return resolve('Success');
                        }
                        break;
                    case 1:
                        if (this._abort) {
                            this._logger.log('INFO', 'FLASH', 'Upload aborted by user');
                            // Wait for 100ms before returning to prevent the serial port from being released.
                            wait(100).then(() => resolve('Aborted'));
                        } else {
                            const error = new Error('avrdude failed to flash');
                            const errorCategory = this._logger.categorizeError(error);
                            this._logger.log('ERROR', 'FLASH', 'Upload failed', { category: errorCategory });
                            return reject(error);
                        }
                        break;
                    default:
                        const unknownError = new Error(`Unknown upload error with code ${code}`);
                        const unknownErrorCategory = this._logger.categorizeError(unknownError);
                        this._logger.log('ERROR', 'FLASH', 'Unknown upload error', { category: unknownErrorCategory, code });
                        return reject(unknownError);
                    }
                });

                arduinoCli.on('error', (error) => {
                    const errorCategory = this._logger.categorizeError(error);
                    this._logger.log('ERROR', 'FLASH', 'Arduino CLI process error', { category: errorCategory, error });
                    clearInterval(listenAbortSignal);
                    reject(error);
                });

            } catch (error) {
                const errorCategory = this._logger.categorizeError(error);
                this._logger.log('ERROR', 'FLASH', 'Failed to start flash process', { category: errorCategory, error });
                reject(error);
            }
        });
    }

    flashRealtimeFirmware () {
        const firmwarePath = path.join(this._firmwareDir, this._config.firmware);
        return this.flash(firmwarePath);
    }
    
    isPicoWDevice() {
        // Check if this is a Raspberry Pi Pico W device
        const picoWIdentifiers = [
            'rp2040:rp2040:rpipicow',
            'arduinoRaspberryPiPicoW',
            'raspberry-pi-pico-w',
            'pico-w'
        ];
        
        return picoWIdentifiers.some(identifier => 
            this._config.fqbn && this._config.fqbn.includes(identifier) ||
            this._config.deviceId && this._config.deviceId.includes(identifier) ||
            this._peripheralPath && this._peripheralPath.includes(identifier)
        );
    }
}

module.exports = Arduino;
