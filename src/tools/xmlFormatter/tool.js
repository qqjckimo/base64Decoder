import { MonacoLoader } from "../../utils/monacoLoader.js";
import { createIcon, initializeLucideIcons } from "../../components/shared/Icon.js";
import "./styles.css";

export default class XMLFormatterTool {
  constructor() {
    this.monacoEditor = null;
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.translations = {
      "zh-TW": {
        title: "XML 格式化工具",
        format: "格式化",
        compact: "壓縮",
        copy: "複製",
        clear: "清除",
        ready: "就緒",
        formatted: "格式化成功",
        compacted: "壓縮成功",
        copied: "已複製到剪貼簿",
        cleared: "已清除",
        invalidXML: "無效的 XML",
        error: "錯誤",
        failedToCopy: "複製失敗",
        characters: "字元",
        exampleXML: '<?xml version="1.0" encoding="UTF-8"?>\n<example>請在此處貼上您的 XML</example>',
        formatTooltip: "格式化 XML (Ctrl+S)",
        compactTooltip: "壓縮 XML (Ctrl+Shift+S)",
        copyTooltip: "複製到剪貼簿",
        clearTooltip: "清除編輯器內容"
      },
      "en": {
        title: "XML Formatter Tool",
        format: "Format",
        compact: "Compact",
        copy: "Copy",
        clear: "Clear",
        ready: "Ready",
        formatted: "Formatted successfully",
        compacted: "Compacted successfully",
        copied: "Copied to clipboard",
        cleared: "Cleared",
        invalidXML: "Invalid XML",
        error: "Error",
        failedToCopy: "Failed to copy",
        characters: "characters",
        exampleXML: '<?xml version="1.0" encoding="UTF-8"?>\n<example>paste your XML here</example>',
        formatTooltip: "Format XML (Ctrl+S)",
        compactTooltip: "Compact XML (Ctrl+Shift+S)",
        copyTooltip: "Copy to clipboard",
        clearTooltip: "Clear editor content"
      }
    };
  }

  async init(container) {
    this.container = container;
    this.renderInitial();
    this.attachEvents();

    // Load Monaco Editor
    await this.loadMonacoEditor();

    // Setup language listener
    window.addEventListener("languageChanged", (e) => {
      this.currentLanguage = e.detail.language;
      this.updateLanguage();
    });
  }

  renderInitial() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
      <div class="xml-formatter-tool">
        <div class="tool-toolbar">
          <span class="tool-title" data-i18n="title">${t.title}</span>
          <button class="btn btn-primary" id="formatBtn" data-i18n-title="formatTooltip" title="${t.formatTooltip}">
            ${createIcon('align-left', 18, 'btn-icon')}
            <span data-i18n="format">${t.format}</span>
          </button>
          <button class="btn" id="compactBtn" data-i18n-title="compactTooltip" title="${t.compactTooltip}">
            ${createIcon('minimize-2', 18, 'btn-icon')}
            <span data-i18n="compact">${t.compact}</span>
          </button>
          <button class="btn" id="copyBtn" data-i18n-title="copyTooltip" title="${t.copyTooltip}">
            ${createIcon('copy', 18, 'btn-icon')}
            <span data-i18n="copy">${t.copy}</span>
          </button>
          <button class="btn" id="clearBtn" data-i18n-title="clearTooltip" title="${t.clearTooltip}">
            ${createIcon('trash-2', 18, 'btn-icon')}
            <span data-i18n="clear">${t.clear}</span>
          </button>
        </div>

        <div class="editor-container">
          <div id="xmlEditor"></div>
        </div>

        <div class="status-bar">
          <span id="status" data-i18n="ready">${t.ready}</span>
          <span id="charCount">0 <span data-i18n="characters">${t.characters}</span></span>
        </div>
      </div>
    `;

    // Initialize Lucide icons
    initializeLucideIcons();

    this.updateLanguage();
  }

  render() {
    this.renderInitial();
  }

  updateLanguage() {
    const t = this.translations[this.currentLanguage];

    // Update all elements with data-i18n attributes
    this.container.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (t[key]) {
        element.textContent = t[key];
      }
    });

    // Update title attributes
    this.container.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (t[key]) {
        element.title = t[key];
      }
    });

    // Update character count text
    const charCountElement = document.getElementById('charCount');
    if (charCountElement && this.monacoEditor) {
      const count = this.monacoEditor.getValue().length;
      charCountElement.innerHTML = `${count} <span data-i18n="characters">${t.characters}</span>`;
    }

    // Update Monaco Editor placeholder value if it's still the default
    if (this.monacoEditor) {
      const currentValue = this.monacoEditor.getValue();
      const oldExampleEN = '<?xml version="1.0" encoding="UTF-8"?>\n<example>paste your XML here</example>';
      const oldExampleZH = '<?xml version="1.0" encoding="UTF-8"?>\n<example>請在此處貼上您的 XML</example>';

      if (currentValue === oldExampleEN || currentValue === oldExampleZH) {
        this.monacoEditor.setValue(t.exampleXML);
      }
    }
  }

  attachEvents() {
    const formatBtn = document.getElementById('formatBtn');
    const compactBtn = document.getElementById('compactBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    formatBtn?.addEventListener('click', () => this.formatXML());
    compactBtn?.addEventListener('click', () => this.compactXML());
    copyBtn?.addEventListener('click', () => this.copyToClipboard());
    clearBtn?.addEventListener('click', () => this.clearEditor());
  }

  async loadMonacoEditor() {
    try {
      await MonacoLoader.load();

      const container = document.getElementById('xmlEditor');
      if (!container) {
        console.error('Monaco editor container not found');
        return;
      }

      const t = this.translations[this.currentLanguage];

      this.monacoEditor = MonacoLoader.createEditor(container, {
        value: t.exampleXML,
        language: 'xml',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        folding: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        formatOnPaste: false,
        formatOnType: false,
      });

      // Listen to editor changes for character count
      this.monacoEditor.onDidChangeModelContent(() => {
        this.updateCharCount();
      });

      // Add keyboard shortcuts
      this.monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.formatXML();
      });

      this.monacoEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        () => {
          this.compactXML();
        }
      );

      // Initial character count
      this.updateCharCount();

      console.log('Monaco Editor initialized successfully for XML Formatter');
    } catch (error) {
      console.error('Failed to load Monaco Editor:', error);
      this.createFallbackEditor();
    }
  }

  createFallbackEditor() {
    const container = document.getElementById('xmlEditor');
    if (container) {
      const t = this.translations[this.currentLanguage];
      this.monacoEditor = MonacoLoader.createFallbackEditor(container, {
        value: t.exampleXML,
        readOnly: false,
      });

      if (this.monacoEditor) {
        this.monacoEditor.isFallback = true;
        // Add change listener for fallback editor
        const textarea = container.querySelector('textarea');
        if (textarea) {
          textarea.addEventListener('input', () => this.updateCharCount());
        }
      }

      this.updateCharCount();
    }
  }

  formatXML() {
    if (!this.monacoEditor) return;

    try {
      const value = this.monacoEditor.getValue();
      const validation = this.validateXML(value);

      if (!validation.valid) {
        this.setStatus(`${this.translations[this.currentLanguage].invalidXML}: ${validation.error}`, 'error');
        return;
      }

      const formatted = this.doFormatXML(value);
      this.monacoEditor.setValue(formatted);
      this.setStatus(this.translations[this.currentLanguage].formatted, 'success');
    } catch (e) {
      this.setStatus(`${this.translations[this.currentLanguage].error}: ${e.message}`, 'error');
    }
  }

  compactXML() {
    if (!this.monacoEditor) return;

    try {
      const value = this.monacoEditor.getValue();
      const validation = this.validateXML(value);

      if (!validation.valid) {
        this.setStatus(`${this.translations[this.currentLanguage].invalidXML}: ${validation.error}`, 'error');
        return;
      }

      const compacted = this.doCompactXML(value);
      this.monacoEditor.setValue(compacted);
      this.setStatus(this.translations[this.currentLanguage].compacted, 'success');
    } catch (e) {
      this.setStatus(`${this.translations[this.currentLanguage].error}: ${e.message}`, 'error');
    }
  }

  async copyToClipboard() {
    if (!this.monacoEditor) return;

    try {
      const value = this.monacoEditor.getValue();
      await navigator.clipboard.writeText(value);
      this.setStatus(this.translations[this.currentLanguage].copied, 'success');
    } catch (e) {
      this.setStatus(this.translations[this.currentLanguage].failedToCopy, 'error');
    }
  }

  clearEditor() {
    if (!this.monacoEditor) return;

    this.monacoEditor.setValue('');
    this.setStatus(this.translations[this.currentLanguage].cleared, 'success');
  }

  doFormatXML(xml) {
    const PADDING = '  ';
    let formatted = '';
    let indent = '';

    // Remove existing formatting
    xml = xml.replace(/>\s*</g, '><').trim();

    // Split into tokens
    const tokens = xml.split(/(?=<)|(?<=>)/g).filter((t) => t);

    tokens.forEach((token) => {
      if (token.startsWith('<?') || token.startsWith('<!')) {
        // Declaration or DOCTYPE
        formatted += token + '\n';
      } else if (token.startsWith('</')) {
        // Closing tag
        indent = indent.substring(PADDING.length);
        formatted += indent + token + '\n';
      } else if (token.startsWith('<') && !token.includes('/>')) {
        // Opening tag
        formatted += indent + token;
        if (!token.includes('</')) {
          indent += PADDING;
          formatted += '\n';
        }
      } else if (token.startsWith('<') && token.includes('/>')) {
        // Self-closing tag
        formatted += indent + token + '\n';
      } else if (token.trim()) {
        // Text content
        formatted += token;
      }
    });

    return formatted.trim();
  }

  doCompactXML(xml) {
    return xml
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .replace(/\s*(?=\/>)/g, '')
      .trim();
  }

  validateXML(xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        return { valid: false, error: parserError.textContent };
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  updateCharCount() {
    if (!this.monacoEditor) return;

    const text = this.monacoEditor.getValue();
    const t = this.translations[this.currentLanguage];
    const charCountElement = document.getElementById('charCount');

    if (charCountElement) {
      charCountElement.innerHTML = `${text.length} <span data-i18n="characters">${t.characters}</span>`;
    }
  }

  setStatus(message, type = '') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = type ? `status-${type}` : '';

    if (type) {
      setTimeout(() => {
        const t = this.translations[this.currentLanguage];
        statusElement.textContent = t.ready;
        statusElement.className = '';
      }, 2000);
    }
  }

  destroy() {
    // Clean up Monaco Editor
    if (this.monacoEditor) {
      MonacoLoader.disposeEditor(this.monacoEditor);
      this.monacoEditor = null;
    }

    // Remove event listeners
    window.removeEventListener("languageChanged", this.updateLanguage);
  }
}