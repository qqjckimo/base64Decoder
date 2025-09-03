export class ToolLoader {
    constructor() {
        this.loadedTools = new Map();
        this.loadingTools = new Map();
        this.commonTools = ['base64-decoder'];
    }

    async loadTool(toolName) {
        if (this.loadedTools.has(toolName)) {
            return this.loadedTools.get(toolName);
        }

        if (this.loadingTools.has(toolName)) {
            return await this.loadingTools.get(toolName);
        }

        const loadPromise = this.performLoad(toolName);
        this.loadingTools.set(toolName, loadPromise);

        try {
            const tool = await loadPromise;
            this.loadedTools.set(toolName, tool);
            this.loadingTools.delete(toolName);
            return tool;
        } catch (error) {
            this.loadingTools.delete(toolName);
            throw error;
        }
    }

    async performLoad(toolName) {
        try {
            const [module, styles] = await Promise.all([
                import(`../tools/${toolName}/tool.js`),
                this.loadStyles(toolName)
            ]);

            const ToolClass = module.default;
            const instance = new ToolClass();
            
            return {
                instance,
                styles,
                name: toolName
            };
        } catch (error) {
            console.error(`Failed to load tool: ${toolName}`, error);
            throw new Error(`工具載入失敗: ${toolName}`);
        }
    }

    async loadStyles(toolName) {
        try {
            // Import CSS using webpack's import system
            await import(`../tools/${toolName}/styles.css`);
            return `tool-styles-${toolName}`;
        } catch (error) {
            console.warn(`No styles found for tool: ${toolName}`, error);
            return '';
        }
    }

    unloadTool(toolName) {
        const tool = this.loadedTools.get(toolName);
        if (tool) {
            if (tool.instance && typeof tool.instance.destroy === 'function') {
                tool.instance.destroy();
            }
            
            const styleElement = document.getElementById(tool.styles);
            if (styleElement) {
                styleElement.remove();
            }
            
            this.loadedTools.delete(toolName);
        }
    }

    preloadCommonTools() {
        return Promise.all(
            this.commonTools.map(tool => 
                this.loadTool(tool).catch(err => 
                    console.warn(`Failed to preload ${tool}:`, err)
                )
            )
        );
    }
}

export default new ToolLoader();