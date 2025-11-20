import { MonacoLoader } from '../../utils/monacoLoader.js';
import { EditorStorage } from '../../utils/editorStorage.js';
import './styles.css';

export default class JSONToTOONConverter {
  constructor() {
    // Storage key for this tool
    this.storageKey = 'json-toon-converter';

    // Language system initialization
    this.currentLanguage = window.appLanguage?.get() || 'zh-TW';
    this.translations = {
      'zh-TW': {
        title: 'JSON to TOON 轉換器',
        convert: '轉換',
        format: '格式化 JSON',
        copy: '複製 TOON',
        clear: '清除',
        ready: '就緒',
        processing: '處理中...',
        loadingLibrary: '載入 TOON 函式庫...',
        convertSuccess: '轉換成功',
        formatSuccess: '格式化成功',
        copySuccess: '已複製到剪貼簿',
        clearSuccess: '已清除內容',
        invalidJson: '無效的 JSON 格式',
        copyError: '複製失敗',
        empty: '請輸入 JSON 內容',
        characters: '個字元',
        estimatedTokens: '約 {count} tokens',
        tokenSavings: '節省 {percent}%',
        jsonInput: 'JSON 輸入',
        toonOutput: 'TOON 輸出',
        placeholder: '請在此輸入或貼上 JSON 內容...',
        loadingEditor: '正在載入編輯器...',
        libraryLoadError: 'TOON 函式庫載入失敗',
      },
      en: {
        title: 'JSON to TOON Converter',
        convert: 'Convert',
        format: 'Format JSON',
        copy: 'Copy TOON',
        clear: 'Clear',
        ready: 'Ready',
        processing: 'Processing...',
        loadingLibrary: 'Loading TOON library...',
        convertSuccess: 'Converted successfully',
        formatSuccess: 'Formatted successfully',
        copySuccess: 'Copied to clipboard',
        clearSuccess: 'Content cleared',
        invalidJson: 'Invalid JSON format',
        copyError: 'Copy failed',
        empty: 'Please enter JSON content',
        characters: 'characters',
        estimatedTokens: '~{count} tokens',
        tokenSavings: 'Saved {percent}%',
        jsonInput: 'JSON Input',
        toonOutput: 'TOON Output',
        placeholder: 'Enter or paste JSON content here...',
        loadingEditor: 'Loading editor...',
        libraryLoadError: 'TOON library loading failed',
      },
    };

    // State management
    this.state = {
      isProcessing: false,
      isLibraryLoaded: false,
      jsonContent: '',
      toonContent: '',
      jsonTokens: 0,
      toonTokens: 0,
      tokenSavings: 0,
    };

    // DOM references
    this.elements = {};

    // Monaco Editor instances
    this.jsonEditor = null;
    this.toonEditor = null;

    // Event handler references for cleanup
    this.eventHandlers = new Map();

    // Update timers
    this.updateTimer = null;
    this.saveTimer = null;

    // TOON library
    this.toonLib = null;
  }

  async init(container) {
    this.container = container;

    // Setup DOM structure
    this.renderInitial();

    // Cache DOM elements
    this.cacheElements();

    // Bind events
    this.bindEvents();

    // Load Monaco Editor
    await this.loadMonacoEditors();

    // Load TOON library
    await this.loadTOONLibrary();

    // Setup language listener
    this.setupLanguageListener();

    // Load saved content from storage
    this.loadFromStorage();

    // Initial state setup
    if (this.elements?.statusText) {
      this.updateStatus(this.t('ready'));
    }

    this.updateStatistics();

    console.log('JSON to TOON Converter initialized');
  }

  renderInitial() {
    const t = this.t.bind(this);

    this.container.innerHTML = `
      <div class="json-toon-tool">
        <div class="tool-toolbar">
          <span class="tool-title" data-i18n="title">${t('title')}</span>

          <div class="tool-actions">
            <button class="btn btn-primary" data-action="convert">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" x2="21" y1="21" y2="4" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" x2="10" y1="15" y2="20" />
                <line x1="4" x2="9" y1="4" y2="9" />
              </svg>
              <span class="btn-text" data-i18n="convert">${t('convert')}</span>
            </button>

            <button class="btn" data-action="format">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="21" x2="3" y1="6" y2="6" />
                <line x1="15" x2="3" y1="12" y2="12" />
                <line x1="17" x2="3" y1="18" y2="18" />
              </svg>
              <span class="btn-text" data-i18n="format">${t('format')}</span>
            </button>

            <button class="btn" data-action="copy">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span class="btn-text" data-i18n="copy">${t('copy')}</span>
            </button>

            <button class="btn" data-action="clear">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span class="btn-text" data-i18n="clear">${t('clear')}</span>
            </button>
          </div>
        </div>

        <div class="editors-container">
          <div class="editor-panel">
            <div class="editor-header">
              <span class="editor-label" data-i18n="jsonInput">${t('jsonInput')}</span>
              <span class="editor-stats" id="json-stats">0 <span data-i18n="characters">${t('characters')}</span></span>
            </div>
            <div class="editor-wrapper" id="json-editor"></div>
          </div>

          <div class="editor-panel">
            <div class="editor-header">
              <span class="editor-label" data-i18n="toonOutput">${t('toonOutput')}</span>
              <span class="editor-stats" id="toon-stats">0 <span data-i18n="characters">${t('characters')}</span></span>
            </div>
            <div class="editor-wrapper" id="toon-editor"></div>
          </div>
        </div>

        <div class="status-bar">
          <span class="status-text" id="status-text">${t('ready')}</span>
          <div class="token-stats" id="token-stats">
            <span id="json-tokens" class="token-stat">JSON: <span data-i18n="estimatedTokens">${t('estimatedTokens', { count: 0 })}</span></span>
            <span id="toon-tokens" class="token-stat">TOON: <span data-i18n="estimatedTokens">${t('estimatedTokens', { count: 0 })}</span></span>
            <span id="token-savings" class="token-stat savings hidden"><span data-i18n="tokenSavings">${t('tokenSavings', { percent: 0 })}</span></span>
          </div>
        </div>
      </div>
    `;
  }

  cacheElements() {
    this.elements = {
      toolbar: this.container.querySelector('.tool-toolbar'),
      convertBtn: this.container.querySelector('[data-action="convert"]'),
      formatBtn: this.container.querySelector('[data-action="format"]'),
      copyBtn: this.container.querySelector('[data-action="copy"]'),
      clearBtn: this.container.querySelector('[data-action="clear"]'),
      jsonEditorContainer: this.container.querySelector('#json-editor'),
      toonEditorContainer: this.container.querySelector('#toon-editor'),
      jsonStats: this.container.querySelector('#json-stats'),
      toonStats: this.container.querySelector('#toon-stats'),
      statusText: this.container.querySelector('#status-text'),
      tokenStats: this.container.querySelector('#token-stats'),
      jsonTokens: this.container.querySelector('#json-tokens'),
      toonTokens: this.container.querySelector('#toon-tokens'),
      tokenSavings: this.container.querySelector('#token-savings'),
      title: this.container.querySelector('.tool-title'),
    };
  }

  bindEvents() {
    // Use event delegation for toolbar clicks
    const toolbarClickHandler = (e) => this.handleToolbarClick(e);
    this.elements.toolbar.addEventListener('click', toolbarClickHandler);
    this.eventHandlers.set('toolbar-click', toolbarClickHandler);
  }

  async loadMonacoEditors() {
    try {
      this.updateStatus(this.t('loadingEditor'));

      await MonacoLoader.load();

      // Create JSON input editor (left)
      this.jsonEditor = MonacoLoader.createEditor(
        this.elements.jsonEditorContainer,
        {
          value: '',
          language: 'json',
          theme: 'base64-theme',
          minimap: { enabled: false },
          fontSize: 14,
          folding: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          formatOnType: true,
        }
      );

      // Create TOON output editor (right, read-only)
      this.toonEditor = MonacoLoader.createEditor(
        this.elements.toonEditorContainer,
        {
          value: '',
          language: 'plaintext',
          theme: 'base64-theme',
          minimap: { enabled: false },
          fontSize: 14,
          folding: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          readOnly: true,
        }
      );

      // Listen for content changes in JSON editor
      this.jsonEditor.onDidChangeModelContent(() => {
        this.onJSONContentChange();
      });

      this.updateStatus(this.t('ready'));
    } catch (error) {
      console.error('Monaco Editor loading failed:', error);
      this.updateStatus(this.t('loadingEditor') + ' - Error', 'error');
      throw error;
    }
  }

  async loadTOONLibrary() {
    try {
      this.updateStatus(this.t('loadingLibrary'));

      // Dynamically import TOON library from ESM CDN
      const toonModule = await import('https://esm.sh/@toon-format/toon@1.0.0');
      this.toonLib = toonModule;

      this.state.isLibraryLoaded = true;
      console.log('TOON library loaded successfully');
      this.updateStatus(this.t('ready'));
    } catch (error) {
      console.error('TOON library loading failed:', error);
      this.updateStatus(this.t('libraryLoadError'), 'error');
      this.state.isLibraryLoaded = false;
    }
  }

  handleToolbarClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'convert':
        this.convertToTOON();
        break;
      case 'format':
        this.formatJSON();
        break;
      case 'copy':
        this.copyTOON();
        break;
      case 'clear':
        this.clearContent();
        break;
    }
  }

  async convertToTOON() {
    if (this.state.isProcessing) return;

    if (!this.state.isLibraryLoaded) {
      this.updateStatus(this.t('libraryLoadError'), 'error');
      return;
    }

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const jsonContent = this.getJSONContent();
      if (!jsonContent.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      // Parse and validate JSON
      const jsonObject = JSON.parse(jsonContent);

      // Convert to TOON using the library
      const toonString = this.toonLib.encode(jsonObject);

      // Update TOON editor
      this.setTOONContent(toonString);

      // Update statistics
      this.updateStatistics();

      this.updateStatus(this.t('convertSuccess'), 'success');
    } catch (error) {
      console.error('Conversion error:', error);
      this.updateStatus(`${this.t('invalidJson')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async formatJSON() {
    if (this.state.isProcessing) return;

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const content = this.getJSONContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      // Parse and format JSON
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);

      this.setJSONContent(formatted);
      this.saveToStorage();
      this.updateStatus(this.t('formatSuccess'), 'success');
    } catch (error) {
      console.error('JSON format error:', error);
      this.updateStatus(`${this.t('invalidJson')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async copyTOON() {
    try {
      const content = this.getTOONContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      await navigator.clipboard.writeText(content);
      this.updateStatus(this.t('copySuccess'), 'success');
    } catch (error) {
      console.error('Copy error:', error);
      this.updateStatus(this.t('copyError'), 'error');
    }
  }

  clearContent() {
    this.setJSONContent('');
    this.setTOONContent('');
    EditorStorage.clear(this.storageKey);
    this.updateStatus(this.t('clearSuccess'), 'success');
    this.updateStatistics();
  }

  getJSONContent() {
    return this.jsonEditor ? this.jsonEditor.getValue() : '';
  }

  setJSONContent(content) {
    if (this.jsonEditor) {
      this.jsonEditor.setValue(content);
    }
  }

  getTOONContent() {
    return this.toonEditor ? this.toonEditor.getValue() : '';
  }

  setTOONContent(content) {
    if (this.toonEditor) {
      this.toonEditor.setValue(content);
    }
  }

  onJSONContentChange() {
    // Debounce the update to avoid too frequent calls
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      if (!this.container || !this.elements) {
        return;
      }

      this.updateStatistics();
    }, 150);

    // Debounced auto-save to storage
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveToStorage();
    }, 500);
  }

  updateStatistics() {
    if (!this.elements?.jsonStats || !this.elements?.toonStats) {
      return;
    }

    const jsonContent = this.getJSONContent();
    const toonContent = this.getTOONContent();

    const jsonCharCount = jsonContent.length;
    const toonCharCount = toonContent.length;

    // Estimate tokens (simple method: char count / 4)
    const jsonTokens = Math.ceil(jsonCharCount / 4);
    const toonTokens = Math.ceil(toonCharCount / 4);

    // Calculate savings
    const tokenSavings =
      jsonTokens > 0 ? Math.round(((jsonTokens - toonTokens) / jsonTokens) * 100) : 0;

    // Update state
    this.state.jsonTokens = jsonTokens;
    this.state.toonTokens = toonTokens;
    this.state.tokenSavings = tokenSavings;

    // Update character counts
    this.elements.jsonStats.innerHTML = `${jsonCharCount} <span data-i18n="characters">${this.t('characters')}</span>`;
    this.elements.toonStats.innerHTML = `${toonCharCount} <span data-i18n="characters">${this.t('characters')}</span>`;

    // Update token estimates
    this.elements.jsonTokens.innerHTML = `JSON: ${this.t('estimatedTokens', { count: jsonTokens })}`;
    this.elements.toonTokens.innerHTML = `TOON: ${this.t('estimatedTokens', { count: toonTokens })}`;

    // Update token savings
    if (toonCharCount > 0 && tokenSavings > 0) {
      this.elements.tokenSavings.innerHTML = this.t('tokenSavings', {
        percent: tokenSavings,
      });
      this.elements.tokenSavings.classList.remove('hidden');
    } else {
      this.elements.tokenSavings.classList.add('hidden');
    }
  }

  setProcessing(processing) {
    this.state.isProcessing = processing;

    // Update button states
    const buttons = this.container.querySelectorAll('.btn');
    buttons.forEach((btn) => {
      btn.disabled = processing;
    });

    // Update container state
    this.container.classList.toggle('json-toon-loading', processing);
  }

  updateStatus(message, type = 'normal') {
    if (!this.elements?.statusText) {
      return;
    }

    this.elements.statusText.textContent = message;

    // Reset status classes
    this.elements.statusText.classList.remove(
      'status-error',
      'status-success',
      'status-warning'
    );

    // Add appropriate class
    if (type === 'error') {
      this.elements.statusText.classList.add('status-error');
    } else if (type === 'success') {
      this.elements.statusText.classList.add('status-success');
    } else if (type === 'warning') {
      this.elements.statusText.classList.add('status-warning');
    }

    // Auto-clear success/warning messages after 3 seconds
    if (type === 'success' || type === 'warning') {
      setTimeout(() => {
        if (!this.state.isProcessing) {
          this.updateStatus(this.t('ready'));
        }
      }, 3000);
    }
  }

  setupLanguageListener() {
    // Standard language change listener
    window.addEventListener('languageChanged', (e) => {
      this.currentLanguage = e.detail.language;
      this.updateLanguage();
    });

    // Fallback for legacy subscription system
    if (window.appLanguage?.subscribe) {
      window.appLanguage.subscribe(() => {
        this.currentLanguage = window.appLanguage.get();
        this.updateLanguage();
      });
    }
  }

  updateLanguage() {
    // Update all elements with data-i18n attributes
    const elementsToTranslate = this.container.querySelectorAll('[data-i18n]');
    elementsToTranslate.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (this.translations[this.currentLanguage][key]) {
        element.textContent = this.t(key);
      }
    });

    // Update status if it's the default message
    if (!this.state.isProcessing) {
      this.updateStatus(this.t('ready'));
    }

    // Update statistics
    this.updateStatistics();
  }

  t(key, params = {}) {
    const translation = this.translations[this.currentLanguage]?.[key] || key;

    // Simple parameter interpolation
    return translation.replace(/{(\w+)}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  // Storage helper methods
  loadFromStorage() {
    try {
      const savedContent = EditorStorage.load(this.storageKey);
      if (savedContent && this.jsonEditor) {
        this.jsonEditor.setValue(savedContent);
        console.log('Loaded saved content from storage');
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    }
  }

  saveToStorage() {
    try {
      const content = this.getJSONContent();
      if (content) {
        EditorStorage.save(this.storageKey, content);
      } else {
        EditorStorage.clear(this.storageKey);
      }
    } catch (error) {
      console.warn('Failed to save to storage:', error);
    }
  }

  destroy() {
    // Clear timers
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    // Remove event listeners
    this.eventHandlers.forEach((handler, event) => {
      if (event === 'toolbar-click' && this.elements?.toolbar) {
        this.elements.toolbar.removeEventListener('click', handler);
      }
    });
    this.eventHandlers.clear();

    // Dispose Monaco Editors
    if (this.jsonEditor) {
      MonacoLoader.disposeEditor(this.jsonEditor);
      this.jsonEditor = null;
    }

    if (this.toonEditor) {
      MonacoLoader.disposeEditor(this.toonEditor);
      this.toonEditor = null;
    }

    // Reset state
    this.state = {
      isProcessing: false,
      isLibraryLoaded: false,
      jsonContent: '',
      toonContent: '',
      jsonTokens: 0,
      toonTokens: 0,
      tokenSavings: 0,
    };

    // Clear element references
    this.elements = {};
    this.container = null;

    console.log('JSON to TOON Converter destroyed');
  }
}
