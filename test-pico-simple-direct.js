#!/usr/bin/env node

/**
 * Test simple directo al Pico
 * Ejecuta directamente el código Python con el script que quieres
 */

const { spawn } = require('child_process');

class PicoSimpleTest {
    async cleanup() {
        return new Promise((resolve) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🧹 Limpiando procesos...`);
            
            require('child_process').exec('pkill -f "pico"', () => {
                console.log(`[${new Date().toLocaleTimeString()}] ✅ Procesos limpiados`);
                setTimeout(resolve, 1000);
            });
        });
    }

    async runPicoScript() {
        return new Promise((resolve, reject) => {
            console.log(`[${new Date().toLocaleTimeString()}] 🚀 Ejecutando script Python directo...`);
            
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
                    console.log(`[${new Date().toLocaleTimeString()}] ✅ Script completado`);
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
            // 1. Limpiar procesos
            await this.cleanup();

            // 2. Ejecutar script Python directo
            await this.runPicoScript();

            console.log(`[${new Date().toLocaleTimeString()}] 🎉 Prueba completada`);
            console.log(`[${new Date().toLocaleTimeString()}] 🔥 El LED del Pico debería estar encendido y parpadeando`);

        } catch (error) {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const test = new PicoSimpleTest();
    
    process.on('SIGINT', () => {
        console.log(`\n[${new Date().toLocaleTimeString()}] 🛑 Cerrando...`);
        process.exit(0);
    });
    
    test.runTest().then(() => {
        console.log(`[${new Date().toLocaleTimeString()}] 🏁 Finalizado`);
    }).catch(error => {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = PicoSimpleTest;
