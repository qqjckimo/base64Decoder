import router from './router.js';
import loader from './loader.js';
import { Sidebar } from '../components/sidebar/sidebar.js';
import './styles.css';

class App {
    constructor() {
        this.currentTool = null;
        this.sidebar = null;
        this.init();
    }

    async init() {
        await this.setupDOM();
        this.sidebar = new Sidebar();
        await this.registerRoutes();
        await loader.preloadCommonTools();
    }

    async setupDOM() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            document.body.innerHTML = `
                <div id="app-container">
                    <aside id="sidebar" class="sidebar"></aside>
                    <main id="main-content" class="main-content">
                        <div id="tool-container"></div>
                    </main>
                </div>
            `;
        } else {
            // App container exists, but we need to set up the full structure
            appContainer.innerHTML = `
                <aside id="sidebar" class="sidebar"></aside>
                <main id="main-content" class="main-content">
                    <div id="tool-container"></div>
                </main>
            `;
        }
    }

    async registerRoutes() {
        router
            .register('home', () => this.showHome())
            .register('tool', async (params) => {
                const toolName = params[0];
                if (toolName) {
                    await this.loadTool(toolName);
                }
            })
            .setDefault('tool/base64-decoder');
    }

    async loadTool(toolName) {
        const container = document.getElementById('tool-container');
        
        if (this.currentTool) {
            if (this.currentTool.instance && typeof this.currentTool.instance.destroy === 'function') {
                this.currentTool.instance.destroy();
            }
            this.currentTool = null;
        }

        container.innerHTML = '<div class="loading">載入中...</div>';

        try {
            const tool = await loader.loadTool(toolName);
            this.currentTool = tool;
            
            container.innerHTML = '';
            if (tool.instance && typeof tool.instance.init === 'function') {
                await tool.instance.init(container);
            }
        } catch (error) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>載入失敗</h2>
                    <p>${error.message}</p>
                    <button onclick="window.location.hash='home'">返回首頁</button>
                </div>
            `;
        }
    }

    showHome() {
        const container = document.getElementById('tool-container');
        container.innerHTML = `
            <div class="home-content">
                <h1>開發者工具集</h1>
                <p>請從左側選單選擇工具</p>
                <div class="features">
                    <div class="feature-card">
                        <h3>🚀 快速載入</h3>
                        <p>動態載入模組，最佳化初始載入時間</p>
                    </div>
                    <div class="feature-card">
                        <h3>🔒 隱私優先</h3>
                        <p>所有處理都在本地進行，無需上傳資料</p>
                    </div>
                    <div class="feature-card">
                        <h3>📱 響應式設計</h3>
                        <p>支援桌面、平板和手機裝置</p>
                    </div>
                </div>
            </div>
        `;
    }
}

export default App;

// Auto-initialize when loaded by webpack
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new App();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.getElementById('app-container').innerHTML = `
            <div class="error-message">
                <h2>應用程式載入失敗</h2>
                <p>${error.message}</p>
                <button onclick="window.location.reload()">重新載入</button>
            </div>
        `;
    }
});