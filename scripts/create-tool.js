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
        this.name = '${toolName}';
    }

    async init(container) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = \`
            <div class="${toolName}-tool">
                <h2>${toolName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
                <p>Tool implementation goes here</p>
            </div>
        \`;
    }

    destroy() {
        this.container.innerHTML = '';
    }
}`;

const styleTemplate = `.${toolName}-tool {
    padding: 2rem;
}

.${toolName}-tool h2 {
    margin-bottom: 1rem;
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
    author: 'Your Name',
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