# Configuración Completa del OpenBlock Link File

## 📋 Descripción General

El OpenBlock Link File es el archivo de configuración central que define cómo el frontend de OpenBlock GUI se conecta con el backend, servicios externos, hardware y todas las funcionalidades de la aplicación. Este archivo es **CRÍTICO** para el funcionamiento correcto de la aplicación.

## 📁 Ubicación del Archivo

El archivo de configuración debe estar ubicado en:
```
src/lib/openblock-link.js
```

## 🔧 Estructura Completa del Archivo

### 1. Configuración Base Completa

```javascript
const openblockLinkConfig = {
  // ===== CONFIGURACIÓN DE SERVIDOR =====
  // URL base del backend
  baseUrl: process.env.OPENBLOCK_BACKEND_URL || 'http://localhost:20111',
  
  // Puerto del backend
  port: process.env.OPENBLOCK_BACKEND_PORT || 20111,
  
  // URL del frontend (para CORS)
  frontendUrl: process.env.OPENBLOCK_FRONTEND_URL || 'http://localhost:20111',
  
  // ===== CONFIGURACIÓN DE API ENDPOINTS =====
  api: {
    // Endpoint base
    base: '/api/v1',
    
    // Proyectos
    projects: '/api/v1/projects',
    projectsById: (id) => `/api/v1/projects/${id}`,
    
    // Sprites
    sprites: '/api/v1/sprites',
    spritesById: (id) => `/api/v1/sprites/${id}`,
    
    // Assets (imágenes, sonidos, etc.)
    assets: '/api/v1/assets',
    assetsById: (id) => `/api/v1/assets/${id}`,
    assetsUpload: '/api/v1/assets/upload',
    
    // Extensiones
    extensions: '/api/v1/extensions',
    extensionsById: (id) => `/api/v1/extensions/${id}`,
    extensionsInstall: '/api/v1/extensions/install',
    extensionsUninstall: '/api/v1/extensions/uninstall',
    
    // Hardware
    hardware: '/api/v1/hardware',
    hardwareDevices: '/api/v1/hardware/devices',
    hardwareConnect: '/api/v1/hardware/connect',
    hardwareDisconnect: '/api/v1/hardware/disconnect',
    
    // Usuarios (si hay autenticación)
    users: '/api/v1/users',
    auth: {
      login: '/api/v1/auth/login',
      logout: '/api/v1/auth/logout',
      register: '/api/v1/auth/register',
      refresh: '/api/v1/auth/refresh',
      profile: '/api/v1/auth/profile'
    },
    
    // Configuraciones
    settings: '/api/v1/settings',
    languages: '/api/v1/languages',
    
    // Backpack (almacenamiento en la nube)
    backpack: '/api/v1/backpack',
    backpackItems: '/api/v1/backpack/items',
    
    // Compilación y ejecución
    compile: '/api/v1/compile',
    run: '/api/v1/run',
    stop: '/api/v1/stop'
  },
  
  // ===== CONFIGURACIÓN DE WEBSOCKET =====
  websocket: {
    url: process.env.OPENBLOCK_WS_URL || 'ws://localhost:20111/ws',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    protocols: ['openblock-protocol-v1']
  },
  
  // ===== CONFIGURACIÓN DE AUTENTICACIÓN =====
  auth: {
    enabled: process.env.OPENBLOCK_AUTH_ENABLED === 'true',
    tokenKey: 'openblock_token',
    refreshTokenKey: 'openblock_refresh_token',
    tokenExpiry: 3600000, // 1 hora
    refreshTokenExpiry: 604800000, // 7 días
    storageType: 'localStorage' // 'localStorage' o 'sessionStorage'
  },
  
  // ===== CONFIGURACIÓN DE HARDWARE =====
  hardware: {
    // Dispositivos soportados
    supportedDevices: [
      'microbit',
      'arduino',
      'wedo2',
      'ev3',
      'spike',
      'makecode'
    ],
    
    // Configuración de conexión
    connection: {
      timeout: 10000,
      retryAttempts: 3,
      autoReconnect: true
    },
    
    // Configuración de comunicación
    communication: {
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    }
  },
  
  // ===== CONFIGURACIÓN DE ARCHIVOS =====
  files: {
    // Tipos de archivos soportados
    supportedTypes: [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/svg+xml',
      'audio/wav',
      'audio/mp3',
      'audio/ogg',
      'application/json',
      'text/plain'
    ],
    
    // Límites de tamaño
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxAudioSize: 10 * 1024 * 1024, // 10MB
    
    // Configuración de compresión
    compression: {
      enabled: true,
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080
    }
  },
  
  // ===== CONFIGURACIÓN DE IDIOMAS =====
  i18n: {
    defaultLanguage: 'en',
    supportedLanguages: [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'
    ],
    fallbackLanguage: 'en'
  },
  
  // ===== CONFIGURACIÓN DE DESARROLLO =====
  development: {
    debug: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableHotReload: true,
    enableSourceMaps: true
  },
  
  // ===== CONFIGURACIÓN DE PRODUCCIÓN =====
  production: {
    enableCompression: true,
    enableCaching: true,
    cacheMaxAge: 31536000, // 1 año
    enableCDN: false,
    cdnUrl: process.env.CDN_URL || ''
  },
  
  // ===== CONFIGURACIÓN DE ERRORES =====
  errorHandling: {
    enableGlobalErrorHandler: true,
    logErrors: true,
    showUserFriendlyErrors: true,
    retryOnError: true,
    maxRetries: 3
  },
  
  // ===== CONFIGURACIÓN DE PERFORMANCE =====
  performance: {
    enableLazyLoading: true,
    enableCodeSplitting: true,
    enableServiceWorker: true,
    enableOfflineMode: false,
    maxConcurrentRequests: 5
  }
};
```

### 2. Endpoints Completos del Backend

#### 📁 Proyectos
```
GET    /api/v1/projects              - Listar todos los proyectos
POST   /api/v1/projects              - Crear nuevo proyecto
GET    /api/v1/projects/:id          - Obtener proyecto específico
PUT    /api/v1/projects/:id          - Actualizar proyecto
DELETE /api/v1/projects/:id          - Eliminar proyecto
POST   /api/v1/projects/:id/duplicate - Duplicar proyecto
POST   /api/v1/projects/:id/share    - Compartir proyecto
GET    /api/v1/projects/:id/export   - Exportar proyecto (.sb3)
POST   /api/v1/projects/import       - Importar proyecto
```

#### 🎭 Sprites
```
GET    /api/v1/sprites               - Listar sprites del proyecto
POST   /api/v1/sprites               - Crear nuevo sprite
GET    /api/v1/sprites/:id           - Obtener sprite específico
PUT    /api/v1/sprites/:id           - Actualizar sprite
DELETE /api/v1/sprites/:id           - Eliminar sprite
POST   /api/v1/sprites/:id/duplicate - Duplicar sprite
POST   /api/v1/sprites/:id/costumes  - Obtener disfraces del sprite
POST   /api/v1/sprites/:id/sounds    - Obtener sonidos del sprite
```

#### 🖼️ Assets (Recursos)
```
GET    /api/v1/assets                - Listar todos los assets
POST   /api/v1/assets/upload         - Subir nuevo asset
GET    /api/v1/assets/:id            - Obtener asset específico
DELETE /api/v1/assets/:id            - Eliminar asset
POST   /api/v1/assets/:id/optimize   - Optimizar asset
GET    /api/v1/assets/search         - Buscar assets
POST   /api/v1/assets/batch-upload   - Subida múltiple de assets
```

#### 🔌 Extensiones
```
GET    /api/v1/extensions            - Listar extensiones disponibles
GET    /api/v1/extensions/:id        - Obtener extensión específica
POST   /api/v1/extensions/install    - Instalar extensión
DELETE /api/v1/extensions/:id        - Desinstalar extensión
POST   /api/v1/extensions/:id/update - Actualizar extensión
GET    /api/v1/extensions/categories - Obtener categorías de extensiones
```

#### 🔧 Hardware
```
GET    /api/v1/hardware/devices      - Listar dispositivos disponibles
POST   /api/v1/hardware/connect      - Conectar dispositivo
DELETE /api/v1/hardware/disconnect   - Desconectar dispositivo
GET    /api/v1/hardware/status       - Estado de conexión
POST   /api/v1/hardware/send         - Enviar comando al dispositivo
GET    /api/v1/hardware/receive      - Recibir datos del dispositivo
POST   /api/v1/hardware/calibrate    - Calibrar dispositivo
```

#### 👤 Autenticación (Opcional)
```
POST   /api/v1/auth/login            - Iniciar sesión
POST   /api/v1/auth/logout           - Cerrar sesión
POST   /api/v1/auth/register         - Registrar usuario
POST   /api/v1/auth/refresh          - Renovar token
GET    /api/v1/auth/profile          - Obtener perfil de usuario
PUT    /api/v1/auth/profile          - Actualizar perfil
POST   /api/v1/auth/forgot-password  - Recuperar contraseña
POST   /api/v1/auth/reset-password   - Restablecer contraseña
```

#### 🎒 Backpack (Almacenamiento en la nube)
```
GET    /api/v1/backpack/items        - Listar elementos del backpack
POST   /api/v1/backpack/items        - Agregar elemento al backpack
DELETE /api/v1/backpack/items/:id    - Eliminar elemento del backpack
POST   /api/v1/backpack/sync         - Sincronizar backpack
```

#### ⚙️ Configuraciones
```
GET    /api/v1/settings              - Obtener configuraciones
PUT    /api/v1/settings              - Actualizar configuraciones
GET    /api/v1/languages             - Listar idiomas disponibles
GET    /api/v1/themes                - Listar temas disponibles
```

#### 🚀 Compilación y Ejecución
```
POST   /api/v1/compile               - Compilar proyecto
POST   /api/v1/run                   - Ejecutar proyecto
POST   /api/v1/stop                  - Detener ejecución
GET    /api/v1/status                - Estado de ejecución
POST   /api/v1/debug                 - Modo debug
```

### 3. Configuración Completa de Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# ===== CONFIGURACIÓN DE SERVIDOR =====
OPENBLOCK_BACKEND_URL=http://localhost:20111
OPENBLOCK_BACKEND_PORT=20111
OPENBLOCK_FRONTEND_URL=http://localhost:20111
OPENBLOCK_WS_URL=ws://localhost:20111/ws

# ===== CONFIGURACIÓN DE AUTENTICACIÓN =====
OPENBLOCK_AUTH_ENABLED=false
OPENBLOCK_JWT_SECRET=your-secret-key-here
OPENBLOCK_JWT_EXPIRES_IN=1h
OPENBLOCK_REFRESH_TOKEN_EXPIRES_IN=7d

# ===== CONFIGURACIÓN DE BASE DE DATOS =====
OPENBLOCK_DB_HOST=localhost
OPENBLOCK_DB_PORT=5432
OPENBLOCK_DB_NAME=openblock
OPENBLOCK_DB_USER=openblock_user
OPENBLOCK_DB_PASSWORD=your-db-password

# ===== CONFIGURACIÓN DE REDIS (CACHE) =====
OPENBLOCK_REDIS_HOST=localhost
OPENBLOCK_REDIS_PORT=6379
OPENBLOCK_REDIS_PASSWORD=

# ===== CONFIGURACIÓN DE ALMACENAMIENTO =====
OPENBLOCK_STORAGE_TYPE=local
OPENBLOCK_STORAGE_PATH=./uploads
OPENBLOCK_MAX_FILE_SIZE=10485760
OPENBLOCK_ALLOWED_FILE_TYPES=image/png,image/jpeg,image/gif,audio/wav,audio/mp3

# ===== CONFIGURACIÓN DE HARDWARE =====
OPENBLOCK_HARDWARE_ENABLED=true
OPENBLOCK_SERIAL_PORT=/dev/ttyUSB0
OPENBLOCK_BAUD_RATE=115200

# ===== CONFIGURACIÓN DE DESARROLLO =====
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_HOT_RELOAD=true
ENABLE_SOURCE_MAPS=true

# ===== CONFIGURACIÓN DE PRODUCCIÓN =====
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_MAX_AGE=31536000
CDN_URL=

# ===== CONFIGURACIÓN DE SEGURIDAD =====
CORS_ORIGIN=http://localhost:20111
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== CONFIGURACIÓN DE MONITOREO =====
ENABLE_ANALYTICS=false
ANALYTICS_ID=
SENTRY_DSN=
```

### 4. Implementación Completa del Cliente

```javascript
// src/lib/openblock-client.js
import openblockLinkConfig from './openblock-link';

class OpenBlockClient {
  constructor(config = openblockLinkConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.api = config.api;
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.eventListeners = new Map();
  }

  // ===== MÉTODOS DE AUTENTICACIÓN =====
  async login(email, password) {
    const response = await this.makeRequest('POST', this.api.auth.login, {
      email,
      password
    });
    
    if (response.success) {
      this.setAuthToken(response.token);
      this.setRefreshToken(response.refreshToken);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.makeRequest('POST', this.api.auth.logout);
    } finally {
      this.clearAuthTokens();
    }
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');
    
    const response = await this.makeRequest('POST', this.api.auth.refresh, {
      refreshToken
    });
    
    if (response.success) {
      this.setAuthToken(response.token);
    }
    
    return response;
  }

  // ===== MÉTODOS DE PROYECTOS =====
  async getProjects() {
    return this.makeRequest('GET', this.api.projects);
  }

  async getProject(id) {
    return this.makeRequest('GET', this.api.projectsById(id));
  }

  async createProject(projectData) {
    return this.makeRequest('POST', this.api.projects, projectData);
  }

  async updateProject(id, projectData) {
    return this.makeRequest('PUT', this.api.projectsById(id), projectData);
  }

  async deleteProject(id) {
    return this.makeRequest('DELETE', this.api.projectsById(id));
  }

  async duplicateProject(id) {
    return this.makeRequest('POST', `${this.api.projectsById(id)}/duplicate`);
  }

  async exportProject(id) {
    return this.makeRequest('GET', `${this.api.projectsById(id)}/export`);
  }

  async importProject(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.makeRequest('POST', this.api.projects + '/import', formData, false);
  }

  // ===== MÉTODOS DE SPRITES =====
  async getSprites(projectId) {
    return this.makeRequest('GET', this.api.sprites, { projectId });
  }

  async getSprite(id) {
    return this.makeRequest('GET', this.api.spritesById(id));
  }

  async createSprite(spriteData) {
    return this.makeRequest('POST', this.api.sprites, spriteData);
  }

  async updateSprite(id, spriteData) {
    return this.makeRequest('PUT', this.api.spritesById(id), spriteData);
  }

  async deleteSprite(id) {
    return this.makeRequest('DELETE', this.api.spritesById(id));
  }

  async duplicateSprite(id) {
    return this.makeRequest('POST', `${this.api.spritesById(id)}/duplicate`);
  }

  // ===== MÉTODOS DE ASSETS =====
  async getAssets() {
    return this.makeRequest('GET', this.api.assets);
  }

  async getAsset(id) {
    return this.makeRequest('GET', this.api.assetsById(id));
  }

  async uploadAsset(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });
    
    return this.makeRequest('POST', this.api.assetsUpload, formData, false);
  }

  async deleteAsset(id) {
    return this.makeRequest('DELETE', this.api.assetsById(id));
  }

  async searchAssets(query) {
    return this.makeRequest('GET', this.api.assets + '/search', { q: query });
  }

  // ===== MÉTODOS DE EXTENSIONES =====
  async getExtensions() {
    return this.makeRequest('GET', this.api.extensions);
  }

  async getExtension(id) {
    return this.makeRequest('GET', this.api.extensionsById(id));
  }

  async installExtension(extensionId) {
    return this.makeRequest('POST', this.api.extensionsInstall, { extensionId });
  }

  async uninstallExtension(id) {
    return this.makeRequest('DELETE', this.api.extensionsById(id));
  }

  async updateExtension(id) {
    return this.makeRequest('POST', `${this.api.extensionsById(id)}/update`);
  }

  // ===== MÉTODOS DE HARDWARE =====
  async getHardwareDevices() {
    return this.makeRequest('GET', this.api.hardwareDevices);
  }

  async connectHardware(deviceId, connectionData = {}) {
    return this.makeRequest('POST', this.api.hardwareConnect, {
      deviceId,
      ...connectionData
    });
  }

  async disconnectHardware() {
    return this.makeRequest('DELETE', this.api.hardwareDisconnect);
  }

  async getHardwareStatus() {
    return this.makeRequest('GET', this.api.hardware + '/status');
  }

  async sendHardwareCommand(command) {
    return this.makeRequest('POST', this.api.hardware + '/send', command);
  }

  // ===== MÉTODOS DE BACKPACK =====
  async getBackpackItems() {
    return this.makeRequest('GET', this.api.backpackItems);
  }

  async addToBackpack(item) {
    return this.makeRequest('POST', this.api.backpackItems, item);
  }

  async removeFromBackpack(id) {
    return this.makeRequest('DELETE', `${this.api.backpackItems}/${id}`);
  }

  async syncBackpack() {
    return this.makeRequest('POST', this.api.backpack + '/sync');
  }

  // ===== MÉTODOS DE COMPILACIÓN =====
  async compileProject(projectId) {
    return this.makeRequest('POST', this.api.compile, { projectId });
  }

  async runProject(projectId) {
    return this.makeRequest('POST', this.api.run, { projectId });
  }

  async stopProject() {
    return this.makeRequest('POST', this.api.stop);
  }

  async getExecutionStatus() {
    return this.makeRequest('GET', this.api.status);
  }

  // ===== CONFIGURACIÓN DE WEBSOCKET =====
  connectWebSocket() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }

    this.websocket = new WebSocket(this.config.websocket.url, this.config.websocket.protocols);
    
    this.websocket.onopen = () => {
      console.log('WebSocket conectado');
      this.reconnectAttempts = 0;
      this.emit('websocket:connected');
      this.startHeartbeat();
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onclose = (event) => {
      console.log('WebSocket desconectado:', event.code, event.reason);
      this.emit('websocket:disconnected', event);
      this.stopHeartbeat();
      this.reconnectWebSocket();
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('websocket:error', error);
    };
  }

  handleWebSocketMessage(data) {
    this.emit('websocket:message', data);
    
    switch (data.type) {
      case 'project_updated':
        this.emit('project:updated', data.payload);
        break;
      case 'sprite_updated':
        this.emit('sprite:updated', data.payload);
        break;
      case 'hardware_connected':
        this.emit('hardware:connected', data.payload);
        break;
      case 'hardware_disconnected':
        this.emit('hardware:disconnected', data.payload);
        break;
      case 'execution_started':
        this.emit('execution:started', data.payload);
        break;
      case 'execution_stopped':
        this.emit('execution:stopped', data.payload);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  reconnectWebSocket() {
    if (this.reconnectAttempts >= this.config.websocket.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('websocket:max_reconnect_attempts');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, this.config.websocket.reconnectInterval);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.websocket.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ===== SISTEMA DE EVENTOS =====
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // ===== MÉTODOS DE AUTENTICACIÓN PRIVADOS =====
  setAuthToken(token) {
    if (this.config.auth.storageType === 'sessionStorage') {
      sessionStorage.setItem(this.config.auth.tokenKey, token);
    } else {
      localStorage.setItem(this.config.auth.tokenKey, token);
    }
  }

  getAuthToken() {
    if (this.config.auth.storageType === 'sessionStorage') {
      return sessionStorage.getItem(this.config.auth.tokenKey);
    } else {
      return localStorage.getItem(this.config.auth.tokenKey);
    }
  }

  setRefreshToken(token) {
    if (this.config.auth.storageType === 'sessionStorage') {
      sessionStorage.setItem(this.config.auth.refreshTokenKey, token);
    } else {
      localStorage.setItem(this.config.auth.refreshTokenKey, token);
    }
  }

  getRefreshToken() {
    if (this.config.auth.storageType === 'sessionStorage') {
      return sessionStorage.getItem(this.config.auth.refreshTokenKey);
    } else {
      return localStorage.getItem(this.config.auth.refreshTokenKey);
    }
  }

  clearAuthTokens() {
    if (this.config.auth.storageType === 'sessionStorage') {
      sessionStorage.removeItem(this.config.auth.tokenKey);
      sessionStorage.removeItem(this.config.auth.refreshTokenKey);
    } else {
      localStorage.removeItem(this.config.auth.tokenKey);
      localStorage.removeItem(this.config.auth.refreshTokenKey);
    }
  }

  // ===== MÉTODO PRINCIPAL DE PETICIONES =====
  async makeRequest(method, url, data = null, isJson = true) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': isJson ? 'application/json' : undefined,
      }
    };

    // Agregar token de autenticación si está disponible
    const token = this.getAuthToken();
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Agregar datos si es necesario
    if (data) {
      if (isJson) {
        options.body = JSON.stringify(data);
      } else {
        options.body = data;
        delete options.headers['Content-Type']; // Dejar que el navegador lo establezca
      }
    }

    try {
      const response = await fetch(fullUrl, options);
      
      // Manejar respuestas no exitosas
      if (!response.ok) {
        if (response.status === 401 && this.config.auth.enabled) {
          // Token expirado, intentar renovar
          try {
            await this.refreshToken();
            // Reintentar la petición con el nuevo token
            options.headers['Authorization'] = `Bearer ${this.getAuthToken()}`;
            const retryResponse = await fetch(fullUrl, options);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            this.clearAuthTokens();
            throw new Error('Authentication failed');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.stopHeartbeat();
    this.eventListeners.clear();
  }

  isConnected() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }

  getConfig() {
    return { ...this.config };
  }
}

export default OpenBlockClient;
```

### 5. Uso Completo en el Frontend

```javascript
// src/containers/gui.jsx
import React, { useEffect, useState, useCallback } from 'react';
import OpenBlockClient from '../lib/openblock-client';
import openblockLinkConfig from '../lib/openblock-link';

const openblockClient = new OpenBlockClient(openblockLinkConfig);

const GuiContainer = () => {
  const [projects, setProjects] = useState([]);
  const [sprites, setSprites] = useState([]);
  const [hardwareStatus, setHardwareStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  // ===== CONFIGURACIÓN INICIAL =====
  useEffect(() => {
    // Conectar WebSocket
    openblockClient.connectWebSocket();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    loadInitialData();
    
    return () => {
      openblockClient.disconnect();
    };
  }, []);

  const setupEventListeners = () => {
    // WebSocket events
    openblockClient.on('websocket:connected', () => {
      setIsConnected(true);
      console.log('Conectado al servidor');
    });

    openblockClient.on('websocket:disconnected', () => {
      setIsConnected(false);
      console.log('Desconectado del servidor');
    });

    // Project events
    openblockClient.on('project:updated', (project) => {
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    });

    // Hardware events
    openblockClient.on('hardware:connected', (device) => {
      setHardwareStatus('connected');
      console.log('Hardware conectado:', device);
    });

    openblockClient.on('hardware:disconnected', () => {
      setHardwareStatus('disconnected');
      console.log('Hardware desconectado');
    });
  };

  const loadInitialData = async () => {
    try {
      // Cargar proyectos
      const projectsData = await openblockClient.getProjects();
      setProjects(projectsData);

      // Cargar sprites del primer proyecto
      if (projectsData.length > 0) {
        const spritesData = await openblockClient.getSprites(projectsData[0].id);
        setSprites(spritesData);
      }

      // Verificar estado del hardware
      const hwStatus = await openblockClient.getHardwareStatus();
      setHardwareStatus(hwStatus.status);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  // ===== MÉTODOS DE PROYECTOS =====
  const createProject = useCallback(async (projectData) => {
    try {
      const newProject = await openblockClient.createProject(projectData);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (error) {
      console.error('Error creando proyecto:', error);
      throw error;
    }
  }, []);

  const updateProject = useCallback(async (id, projectData) => {
    try {
      const updatedProject = await openblockClient.updateProject(id, projectData);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      return updatedProject;
    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (id) => {
    try {
      await openblockClient.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      throw error;
    }
  }, []);

  // ===== MÉTODOS DE HARDWARE =====
  const connectHardware = useCallback(async (deviceId) => {
    try {
      await openblockClient.connectHardware(deviceId);
      setHardwareStatus('connecting');
    } catch (error) {
      console.error('Error conectando hardware:', error);
      throw error;
    }
  }, []);

  const disconnectHardware = useCallback(async () => {
    try {
      await openblockClient.disconnectHardware();
      setHardwareStatus('disconnected');
    } catch (error) {
      console.error('Error desconectando hardware:', error);
      throw error;
    }
  }, []);

  // ===== MÉTODOS DE COMPILACIÓN =====
  const compileProject = useCallback(async (projectId) => {
    try {
      const result = await openblockClient.compileProject(projectId);
      console.log('Proyecto compilado:', result);
      return result;
    } catch (error) {
      console.error('Error compilando proyecto:', error);
      throw error;
    }
  }, []);

  const runProject = useCallback(async (projectId) => {
    try {
      await openblockClient.runProject(projectId);
      console.log('Proyecto ejecutándose');
    } catch (error) {
      console.error('Error ejecutando proyecto:', error);
      throw error;
    }
  }, []);

  return (
    <div className="gui-container">
      {/* Tu interfaz de usuario aquí */}
      <div className="status-bar">
        <span>Servidor: {isConnected ? 'Conectado' : 'Desconectado'}</span>
        <span>Hardware: {hardwareStatus}</span>
      </div>
      
      {/* Resto de tu componente */}
    </div>
  );
};

export default GuiContainer;
```

### 6. Configuración Completa de CORS

El backend debe estar configurado para permitir CORS desde el frontend:

```javascript
// Backend CORS configuration
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:20111',
      'http://localhost:20111',
      'https://yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));
```

### 7. Configuración Completa de Proxy (Desarrollo)

Para desarrollo, configurar proxy en `webpack.config.js`:

```javascript
module.exports = {
  devServer: {
    port: 20111,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:20111',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
          console.log('Proxying request:', req.method, req.url);
        }
      },
      '/ws': {
        target: 'ws://localhost:20111',
        ws: true,
        changeOrigin: true,
        logLevel: 'debug'
      }
    },
    historyApiFallback: true,
    hot: true,
    open: true
  }
};
```

### 8. Configuración de Base de Datos (Backend)

```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.OPENBLOCK_DB_HOST || 'localhost',
  port: process.env.OPENBLOCK_DB_PORT || 5432,
  database: process.env.OPENBLOCK_DB_NAME || 'openblock',
  user: process.env.OPENBLOCK_DB_USER || 'openblock_user',
  password: process.env.OPENBLOCK_DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

### 9. Configuración de Redis (Cache)

```javascript
// config/redis.js
const redis = require('redis');

const client = redis.createClient({
  host: process.env.OPENBLOCK_REDIS_HOST || 'localhost',
  port: process.env.OPENBLOCK_REDIS_PORT || 6379,
  password: process.env.OPENBLOCK_REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

module.exports = client;
```

### 10. Configuración de Almacenamiento de Archivos

```javascript
// config/storage.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.OPENBLOCK_STORAGE_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.OPENBLOCK_ALLOWED_FILE_TYPES || '').split(',');
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.OPENBLOCK_MAX_FILE_SIZE) || 10 * 1024 * 1024
  },
  fileFilter: fileFilter
});

module.exports = upload;
```

## 🔍 Verificación Completa

### 1. Verificación de Endpoints
```bash
# Probar cada endpoint
curl -X GET http://localhost:20111/api/v1/projects
curl -X GET http://localhost:20111/api/v1/hardware/devices
curl -X GET http://localhost:20111/api/v1/extensions
```

### 2. Verificación de WebSocket
```javascript
// En la consola del navegador
const ws = new WebSocket('ws://localhost:20111/ws');
ws.onopen = () => console.log('WebSocket conectado');
ws.onmessage = (event) => console.log('Mensaje recibido:', event.data);
```

### 3. Verificación de CORS
```bash
# Verificar headers CORS
curl -H "Origin: http://localhost:20111" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:20111/api/v1/projects
```

### 4. Verificación de Autenticación
```javascript
// Probar login
const client = new OpenBlockClient();
client.login('test@example.com', 'password')
  .then(response => console.log('Login exitoso:', response))
  .catch(error => console.error('Error de login:', error));
```

## 🚨 Troubleshooting Completo

### Error: CORS
**Síntomas**: `Access to fetch at 'http://localhost:20111/api/v1/projects' from origin 'http://localhost:20111' has been blocked by CORS policy`

**Soluciones**:
- Verificar configuración de CORS en el backend
- Asegurar que las URLs coinciden exactamente
- Verificar que el backend está enviando los headers correctos
- Comprobar que el método OPTIONS está permitido

### Error: WebSocket no conecta
**Síntomas**: `WebSocket connection to 'ws://localhost:20111/ws' failed`

**Soluciones**:
- Verificar que el backend tiene WebSocket habilitado
- Comprobar que el puerto 20111 está abierto
- Verificar que no hay firewall bloqueando la conexión
- Comprobar que el protocolo WebSocket es correcto

### Error: 404 en endpoints
**Síntomas**: `GET http://localhost:20111/api/v1/projects 404 (Not Found)`

**Soluciones**:
- Verificar que las rutas del backend coinciden con la configuración
- Comprobar que el backend está corriendo en el puerto correcto
- Verificar que la versión de la API es correcta (`/api/v1/`)
- Comprobar los logs del backend para errores

### Error: 401 Unauthorized
**Síntomas**: `GET http://localhost:20111/api/v1/projects 401 (Unauthorized)`

**Soluciones**:
- Verificar que el token de autenticación es válido
- Comprobar que el token no ha expirado
- Verificar que el header Authorization está presente
- Comprobar la configuración de JWT en el backend

### Error: 500 Internal Server Error
**Síntomas**: `POST http://localhost:20111/api/v1/projects 500 (Internal Server Error)`

**Soluciones**:
- Revisar los logs del backend
- Verificar que la base de datos está conectada
- Comprobar que los datos enviados son válidos
- Verificar que no hay errores en el código del backend

## 📋 Checklist de Implementación

### Frontend
- [ ] Archivo `openblock-link.js` creado y configurado
- [ ] Cliente `OpenBlockClient` implementado
- [ ] Variables de entorno configuradas
- [ ] WebSocket conectado y funcionando
- [ ] Event listeners configurados
- [ ] Manejo de errores implementado
- [ ] Autenticación configurada (si es necesaria)

### Backend
- [ ] Todos los endpoints implementados
- [ ] CORS configurado correctamente
- [ ] WebSocket habilitado
- [ ] Base de datos conectada
- [ ] Autenticación implementada (si es necesaria)
- [ ] Manejo de archivos configurado
- [ ] Logging configurado
- [ ] Rate limiting implementado

### Desarrollo
- [ ] Proxy de webpack configurado
- [ ] Hot reload funcionando
- [ ] Source maps habilitados
- [ ] Variables de entorno cargadas
- [ ] Debugging configurado

### Producción
- [ ] Compresión habilitada
- [ ] Caching configurado
- [ ] CDN configurado (si es necesario)
- [ ] Monitoreo configurado
- [ ] Logs centralizados
- [ ] Backup de base de datos configurado

## 🎯 Notas Importantes

1. **El archivo `openblock-link.js` es CRÍTICO** - debe estar correctamente configurado
2. **Las variables de entorno** deben coincidir entre frontend y backend
3. **El backend debe implementar TODOS los endpoints** especificados
4. **La configuración de WebSocket** es opcional pero recomendada para funcionalidad en tiempo real
5. **La autenticación** es opcional pero recomendada para aplicaciones en producción
6. **El manejo de errores** debe ser robusto en ambos lados
7. **Las pruebas** deben cubrir todos los endpoints y funcionalidades
8. **La documentación** debe mantenerse actualizada con cualquier cambio
