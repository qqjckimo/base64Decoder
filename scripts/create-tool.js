#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const toolName = process.argv[2];

if (!toolName) {
    console.error('Usage: npm run create-tool <tool-name>');
    process.exit(1);
}

const toolDir = path.join(__dirname, '..', 'src', 'tools', toolName);

if (fs.existsSync(toolDir)) {
    console.error(`Tool ${toolName} already exists`);
    process.exit(1);
}

fs.mkdirSync(toolDir, { recursive: true });

const toolTemplate = `export default class ${toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Tool {
    constructor() {
        this.currentLanguage = localStorage.getItem('preferredLanguage') || 'zh-TW';
        this.translations = {
            'zh-TW': {
                title: '${toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}',
                // Add more translations here
            },
            'en': {
                title: '${toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}',
                // Add more translations here
            }
        };
    }

    async init(container) {
        this.container = container;
        this.render();
        this.attachEvents();
        
        // Listen for global language changes
        window.addEventListener('languageChanged', (e) => {
            this.currentLanguage = e.detail.language;
            this.render();
            this.attachEvents();
        });
    }

    render() {
        const t = this.translations[this.currentLanguage];
        
        this.container.innerHTML = \`
            <div class="${toolName}-tool">
                <div class="tool-header">
                    <h2>\${t.title}</h2>
                </div>
                
                <div class="tool-content">
                    <p>Tool implementation goes here</p>
                </div>
            </div>
        \`;
    }
    
    attachEvents() {
        // Add event listeners here
    }

    destroy() {
        // Clean up event listeners if needed
        this.container.innerHTML = '';
    }
}`;

const styleTemplate = `.${toolName}-tool {
    overflow-y: auto;
    overflow-x: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
    box-sizing: border-box;
    padding: 20px;
}

.tool-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.tool-header h2 {
    color: #333;
    margin: 0;
    font-size: 1.3em;
    font-weight: 600;
}

.tool-content {
    padding: 20px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
}`;

const configTemplate = {
    id: toolName,
    name: toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    nameEn: toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `${toolName} tool description`,
    descriptionEn: `${toolName} tool description`,
    category: '其他',
    categoryEn: 'Other',
    icon: '🔧',
    version: '1.0.0',
    author: 'Jason Chen',
    estimatedSize: '10KB',
    keywords: [toolName],
    preload: false
};

fs.writeFileSync(path.join(toolDir, 'tool.js'), toolTemplate);
fs.writeFileSync(path.join(toolDir, 'styles.css'), styleTemplate);
fs.writeFileSync(path.join(toolDir, 'config.json'), JSON.stringify(configTemplate, null, 2));

console.log(`✅ Tool ${toolName} created successfully at src/tools/${toolName}`);
console.log(`
Next steps:
1. Update the tool implementation in src/tools/${toolName}/tool.js
2. Add styles in src/tools/${toolName}/styles.css
3. Update metadata in src/tools/${toolName}/config.json
4. Add the tool to sidebar in src/components/sidebar/sidebar.js
`);