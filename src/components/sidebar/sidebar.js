import { createIcon, initializeLucideIcons } from '../shared/Icon.js';

export class Sidebar {
    constructor() {
        this.tools = [];
        this.isExpanded = true;
        this.currentLanguage = localStorage.getItem('preferredLanguage') || 'zh-TW';
        this.translations = {
            'zh-TW': {
                sidebarTitle: '開發工具',
                categoryImageProcessing: '圖片處理',
                base64DecoderName: 'Base64 圖片解碼器',
                base64EncoderName: 'Base64 圖片編碼器',
                pngToIcoName: 'PNG 轉 ICO 轉換器',
                featureFastLoad: '快速載入',
                featurePrivacyFirst: '隱私優先',
                featureModernTech: '最新技術',
                languageToggle: '🌐 EN',
                featureFastLoadTooltip: '動態載入模組，減少初始載入時間',
                featurePrivacyFirstTooltip: '所有處理都在瀏覽器端進行，不上傳任何資料',
                featureModernTechTooltip: '使用 ES6+、Web Workers、動態載入等現代 Web 技術'
            },
            'en': {
                sidebarTitle: 'Developer Tools',
                categoryImageProcessing: 'Image Processing',
                base64DecoderName: 'Base64 Image Decoder',
                base64EncoderName: 'Base64 Image Encoder',
                pngToIcoName: 'PNG to ICO Converter',
                featureFastLoad: 'Fast Loading',
                featurePrivacyFirst: 'Privacy First',
                featureModernTech: 'Modern Tech',
                languageToggle: '🌐 中文',
                featureFastLoadTooltip: 'Dynamic module loading reduces initial load time',
                featurePrivacyFirstTooltip: 'All processing happens in your browser, no data uploaded',
                featureModernTechTooltip: 'Built with ES6+, Web Workers, dynamic imports and modern web technologies'
            }
        };
        this.init();
    }

    async init() {
        await this.loadToolsConfig();
        this.render();
        this.attachEvents();
    }

    async loadToolsConfig() {
        const t = this.translations[this.currentLanguage];
        this.tools = [
            {
                id: 'base64-decoder',
                name: t.base64DecoderName,
                icon: createIcon('image', 20, 'tool-icon'),
                category: t.categoryImageProcessing
            },
            {
                id: 'base64-encoder',
                name: t.base64EncoderName,
                icon: createIcon('camera', 20, 'tool-icon'),
                category: t.categoryImageProcessing
            },
            {
                id: 'png-to-ico',
                name: t.pngToIcoName,
                icon: createIcon('palette', 20, 'tool-icon'),
                category: t.categoryImageProcessing
            }
        ];
    }

    render() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const t = this.translations[this.currentLanguage];
        const toolsGrouped = this.groupByCategory();
        
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2 class="sidebar-title">${t.sidebarTitle}</h2>
                <div class="header-controls">
                    <button class="language-toggle" data-action="toggleLanguage" title="Switch Language">
                        ${createIcon('globe', 12, 'language-icon')} ${this.currentLanguage === 'zh-TW' ? 'EN' : '中文'}
                    </button>
                    <button class="sidebar-toggle" aria-label="切換側邊欄">
                        ${createIcon('menu', 16, 'menu-icon')}
                    </button>
                </div>
            </div>
            <nav class="sidebar-nav">
                ${Object.entries(toolsGrouped).map(([category, tools]) => `
                    <div class="nav-category">
                        <div class="category-header">${category}</div>
                        ${tools.map(tool => `
                            <a href="#tool/${tool.id}" data-route="tool" data-tool="${tool.id}" class="nav-item">
                                <span class="nav-icon">${tool.icon}</span>
                                <span class="nav-text">${tool.name}</span>
                            </a>
                        `).join('')}
                    </div>
                `).join('')}
            </nav>
            <div class="sidebar-footer">
                <div class="feature-info">
                    <div class="feature-item">
                        <div class="feature-left">
                            ${createIcon('zap', 12, 'feature-icon')}
                            <span class="feature-text">${t.featureFastLoad}</span>
                        </div>
                        ${createIcon('info', 10, 'info-icon')}
                        <div class="tooltip">${t.featureFastLoadTooltip}</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-left">
                            ${createIcon('lock', 12, 'feature-icon')}
                            <span class="feature-text">${t.featurePrivacyFirst}</span>
                        </div>
                        ${createIcon('info', 10, 'info-icon')}
                        <div class="tooltip">${t.featurePrivacyFirstTooltip}</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-left">
                            ${createIcon('cpu', 12, 'feature-icon')}
                            <span class="feature-text">${t.featureModernTech}</span>
                        </div>
                        ${createIcon('info', 10, 'info-icon')}
                        <div class="tooltip">${t.featureModernTechTooltip}</div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
        
        // 初始化 Lucide 圖標
        setTimeout(() => {
            initializeLucideIcons();
        }, 0);
    }

    groupByCategory() {
        return this.tools.reduce((acc, tool) => {
            if (!acc[tool.category]) {
                acc[tool.category] = [];
            }
            acc[tool.category].push(tool);
            return acc;
        }, {});
    }

    attachEvents() {
        const toggle = document.querySelector('.sidebar-toggle');
        const languageToggle = document.querySelector('.language-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                this.isExpanded = !this.isExpanded;
                sidebar.classList.toggle('expanded', this.isExpanded);
                sidebar.classList.toggle('collapsed', !this.isExpanded);
            });
        }

        if (languageToggle) {
            languageToggle.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }

        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            this.isExpanded = false;
        }

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 480) {
                    sidebar.classList.remove('expanded');
                    this.isExpanded = false;
                }
            });
        });
    }

    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh-TW' ? 'en' : 'zh-TW';
        localStorage.setItem('preferredLanguage', this.currentLanguage);
        
        // Trigger global language change event
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
        
        // Re-render sidebar with new language
        this.loadToolsConfig().then(() => {
            this.render();
            this.attachEvents();
            // 重新初始化圖標
            setTimeout(() => {
                initializeLucideIcons();
            }, 0);
        });
    }

    addStyles() {
        const styleId = 'sidebar-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .sidebar-header {
                padding: 1rem 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-height: 60px;
            }

            .header-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex-shrink: 0;
            }

            .language-toggle {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 5px;
                padding: 0.35rem 0.5rem;
                color: var(--text-primary);
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 0.2rem;
                white-space: nowrap;
                min-width: 45px;
            }

            .language-toggle:hover {
                background: var(--primary-color);
                color: white;
                transform: translateY(-1px);
            }

            .sidebar-title {
                font-size: 1rem;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
                margin-right: 0.5rem;
                min-width: 0;
            }

            .sidebar-toggle {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .sidebar-toggle:hover {
                background: var(--bg-secondary);
            }

            .lucide-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .lucide-icon svg {
                width: 100%;
                height: 100%;
            }

            .sidebar-nav {
                flex: 1;
                overflow-y: auto;
                padding: 1rem 0;
            }

            .nav-category {
                margin-bottom: 1rem;
            }

            .category-header {
                padding: 0.5rem 1.5rem;
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                line-height: 1.2;
            }

            .nav-item {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.75rem 1.5rem;
                color: var(--text-primary);
                text-decoration: none;
                transition: background-color 0.2s;
                position: relative;
                min-height: 44px;
                gap: 0.75rem;
            }

            .nav-item:hover {
                background: var(--bg-secondary);
            }

            .nav-item.active {
                background: var(--bg-secondary);
                color: var(--primary-color);
            }

            .nav-item.active::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--primary-color);
            }

            .nav-icon,
            .tool-icon {
                min-width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .nav-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 0.875rem;
                line-height: 1.3;
                flex-shrink: 0;
            }

            .sidebar-footer {
                padding: 0.75rem 1rem;
                border-top: 1px solid var(--border-color);
            }

            .feature-info {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .feature-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.25rem 0.5rem;
                color: var(--text-secondary);
                font-size: 0.7rem;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s ease;
                position: relative;
            }

            .feature-item:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .feature-item:hover .info-icon {
                color: var(--primary-color);
            }

            .feature-left {
                display: flex;
                align-items: center;
                flex: 1;
                min-width: 0;
            }

            .feature-icon {
                margin-right: 0.5rem;
                min-width: 12px;
                flex-shrink: 0;
            }

            .feature-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 0.7rem;
                line-height: 1.2;
                flex: 1;
            }

            .info-icon {
                color: var(--text-secondary);
                transition: color 0.2s ease;
                margin-left: 0.5rem;
                flex-shrink: 0;
                min-width: 10px;
            }

            .tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                font-size: 0.7rem;
                white-space: nowrap;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                pointer-events: none;
                margin-bottom: 0.5rem;
            }

            .tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 4px solid transparent;
                border-top-color: rgba(0, 0, 0, 0.9);
            }

            .feature-item:hover .tooltip {
                opacity: 1;
                visibility: visible;
            }

            @media (max-width: 768px) {
                .sidebar-toggle {
                    display: block;
                }

                .sidebar.collapsed .sidebar-title,
                .sidebar.collapsed .nav-text,
                .sidebar.collapsed .category-header,
                .sidebar.collapsed .feature-text {
                    display: none;
                }

                .sidebar.collapsed .language-toggle {
                    padding: 0.3rem 0.4rem;
                    font-size: 0.7rem;
                    min-width: 40px;
                }

                .sidebar.collapsed .feature-item {
                    justify-content: center;
                    padding: 0.25rem;
                }

                .sidebar.collapsed .feature-icon {
                    margin: 0;
                }

                .sidebar.collapsed .info-icon {
                    display: none;
                }

                .sidebar.collapsed .tooltip {
                    display: none;
                }

                .sidebar.collapsed .nav-item {
                    justify-content: center;
                    padding: 0.75rem;
                }

                .sidebar.collapsed .nav-icon,
                .sidebar.collapsed .tool-icon {
                    margin: 0;
                }

                .sidebar.collapsed .sidebar-header {
                    justify-content: center;
                }

                .sidebar.collapsed .header-controls {
                    flex-direction: column;
                    gap: 0.25rem;
                }
            }

            @media (max-width: 480px) {
                .sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    z-index: 1000;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                }

                .sidebar.expanded {
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            }
        `;
        document.head.appendChild(style);
    }
}

export default Sidebar;