export class Sidebar {
    constructor() {
        this.tools = [];
        this.isExpanded = true;
        this.init();
    }

    async init() {
        await this.loadToolsConfig();
        this.render();
        this.attachEvents();
    }

    async loadToolsConfig() {
        this.tools = [
            {
                id: 'base64-decoder',
                name: 'Base64 圖片解碼器',
                icon: '🖼️',
                category: '圖片處理'
            }
        ];
    }

    render() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const toolsGrouped = this.groupByCategory();
        
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2 class="sidebar-title">開發工具</h2>
                <button class="sidebar-toggle" aria-label="切換側邊欄">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
            <nav class="sidebar-nav">
                <a href="#home" data-route="home" class="nav-item">
                    <span class="nav-icon">🏠</span>
                    <span class="nav-text">首頁</span>
                </a>
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
                <a href="https://github.com/qqjckimo/base64Decoder" target="_blank" class="nav-item">
                    <span class="nav-icon">📦</span>
                    <span class="nav-text">GitHub</span>
                </a>
            </div>
        `;

        this.addStyles();
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
        const sidebar = document.getElementById('sidebar');
        
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                this.isExpanded = !this.isExpanded;
                sidebar.classList.toggle('expanded', this.isExpanded);
                sidebar.classList.toggle('collapsed', !this.isExpanded);
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

    addStyles() {
        const styleId = 'sidebar-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .sidebar-header {
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .sidebar-title {
                font-size: 1.25rem;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .sidebar-toggle {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
            }

            .sidebar-toggle span {
                display: block;
                width: 20px;
                height: 2px;
                background: var(--text-primary);
                margin: 4px 0;
                transition: 0.3s;
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
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
            }

            .nav-item {
                display: flex;
                align-items: center;
                padding: 0.75rem 1.5rem;
                color: var(--text-primary);
                text-decoration: none;
                transition: background-color 0.2s;
                position: relative;
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

            .nav-icon {
                font-size: 1.25rem;
                margin-right: 0.75rem;
                min-width: 1.25rem;
            }

            .nav-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .sidebar-footer {
                padding: 1rem;
                border-top: 1px solid var(--border-color);
            }

            @media (max-width: 768px) {
                .sidebar-toggle {
                    display: block;
                }

                .sidebar.collapsed .sidebar-title,
                .sidebar.collapsed .nav-text,
                .sidebar.collapsed .category-header {
                    display: none;
                }

                .sidebar.collapsed .nav-item {
                    justify-content: center;
                    padding: 0.75rem;
                }

                .sidebar.collapsed .nav-icon {
                    margin: 0;
                }

                .sidebar.collapsed .sidebar-header {
                    justify-content: center;
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