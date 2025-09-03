// Lucide Icons Component - 使用官方 Lucide CDN
class LucideIcon {
    constructor(iconName, size = 16, className = '') {
        this.iconName = iconName;
        this.size = size;
        this.className = className;
    }

    // 獲取 HTML 字符串
    getHTML() {
        const style = `width: ${this.size}px; height: ${this.size}px;`;
        const className = `lucide-icon ${this.className}`.trim();
        return `<i data-lucide="${this.iconName}" class="${className}" style="${style}"></i>`;
    }

    // 創建 DOM 元素
    createElement() {
        const element = document.createElement('i');
        element.setAttribute('data-lucide', this.iconName);
        element.className = `lucide-icon ${this.className}`.trim();
        element.style.width = `${this.size}px`;
        element.style.height = `${this.size}px`;
        return element;
    }
}

// 便利函數
export function createIcon(iconName, size = 16, className = '') {
    const icon = new LucideIcon(iconName, size, className);
    return icon.getHTML();
}

export function getIconElement(iconName, size = 16, className = '') {
    const icon = new LucideIcon(iconName, size, className);
    return icon.createElement();
}

// 初始化 Lucide 圖標的函數
export function initializeLucideIcons(container = document) {
    // 等待 Lucide 載入完成
    if (typeof lucide !== 'undefined' && lucide.icons) {
        lucide.createIcons({
            icons: lucide.icons,
            nameAttr: 'data-lucide',
            attrs: {
                'stroke-width': 2,
                'stroke': 'currentColor',
                'fill': 'none',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round'
            }
        });
    } else {
        // 如果 Lucide 還沒載入，延遲執行
        setTimeout(() => initializeLucideIcons(container), 100);
    }
}

export default LucideIcon;