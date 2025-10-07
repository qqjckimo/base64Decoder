import { MonacoLoader } from '../../utils/monacoLoader.js';
import { EditorStorage } from '../../utils/editorStorage.js';
import './styles.css';

export default class JSONFormatterTool {
  constructor() {
    // Storage key for this tool
    this.storageKey = 'json-formatter';

    // Language system initialization
    this.currentLanguage = window.appLanguage?.get() || 'zh-TW';
    this.translations = {
      'zh-TW': {
        title: 'JSON 格式化工具',
        format: '格式化',
        compact: '壓縮',
        copy: '複製',
        clear: '清除',
        ready: '就緒',
        processing: '處理中...',
        formatSuccess: '格式化成功',
        compactSuccess: '壓縮成功',
        copySuccess: '已複製到剪貼簿',
        clearSuccess: '已清除內容',
        invalidJson: '無效的 JSON 格式',
        copyError: '複製失敗',
        empty: '請輸入 JSON 內容',
        characters: '個字元',
        lines: '行',
        syntaxError: '語法錯誤',
        placeholder: '請在此輸入或貼上 JSON 內容...',
        loadingEditor: '正在載入編輯器...',
      },
      en: {
        title: 'JSON Formatter',
        format: 'Format',
        compact: 'Compact',
        copy: 'Copy',
        clear: 'Clear',
        ready: 'Ready',
        processing: 'Processing...',
        formatSuccess: 'Formatted successfully',
        compactSuccess: 'Compacted successfully',
        copySuccess: 'Copied to clipboard',
        clearSuccess: 'Content cleared',
        invalidJson: 'Invalid JSON format',
        copyError: 'Copy failed',
        empty: 'Please enter JSON content',
        characters: 'characters',
        lines: 'lines',
        syntaxError: 'Syntax error',
        placeholder: 'Enter or paste JSON content here...',
        loadingEditor: 'Loading editor...',
      },
    };

    // State management
    this.state = {
      isProcessing: false,
      currentContent: '',
      isValid: true,
      characterCount: 0,
      lineCount: 1,
    };

    // DOM references
    this.elements = {};

    // Monaco Editor instance and resize handle
    this.editor = null;
    this.resizeHandle = null;

    // Event handler references for cleanup
    this.eventHandlers = new Map();

    // Update timer for character counting
    this.updateTimer = null;

    // Storage auto-save timer
    this.saveTimer = null;
  }

  async init(container) {
    this.container = container;

    // Setup DOM structure
    this.setupDOM();

    // Cache DOM elements
    this.cacheElements();

    // Bind events
    this.bindEvents();

    // Load Monaco Editor with resize capability
    await this.loadResizableMonacoEditor();

    // Setup language listener
    this.setupLanguageListener();

    // Load saved content from storage
    this.loadFromStorage();

    // Initial state setup - ensure DOM is ready
    if (this.elements?.statusText) {
      this.updateStatus(this.t('ready'));
    }

    // Update character count only after all elements are confirmed available
    this.updateCharacterCount();

    console.log('JSON Formatter Tool initialized');
  }

  setupDOM() {
    const t = this.t.bind(this);

    this.container.innerHTML = `
      <div class="json-formatter-tool">
        <div class="tool-toolbar">
          <span class="tool-title" data-i18n="title">${t(
            'title'
          )}</span>

          <div class="tool-actions">
            <button class="btn btn-primary" data-action="format">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="21" x2="3" y1="6" y2="6" />
                <line x1="15" x2="3" y1="12" y2="12" />
                <line x1="17" x2="3" y1="18" y2="18" />
              </svg>
              <span class="btn-text" data-i18n="format">${t(
                'format'
              )}</span>
            </button>

            <button class="btn" data-action="compact">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span class="btn-text" data-i18n="compact">${t(
                'compact'
              )}</span>
            </button>

            <button class="btn" data-action="copy">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span class="btn-text" data-i18n="copy">${t(
                'copy'
              )}</span>
            </button>

            <button class="btn" data-action="clear">
              <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span class="btn-text" data-i18n="clear">${t(
                'clear'
              )}</span>
            </button>
          </div>
        </div>

        <div class="editor-container">
          <div class="json-formatter-editor" id="json-editor"></div>
        </div>

        <div class="status-bar">
          <span class="json-formatter-status" id="status-text">${t(
            'ready'
          )}</span>
          <span class="json-formatter-char-count" id="char-count">0 ${t(
            'characters'
          )}</span>
        </div>
      </div>
    `;
  }

  cacheElements() {
    this.elements = {
      toolbar: this.container.querySelector('.tool-toolbar'),
      formatBtn: this.container.querySelector('[data-action="format"]'),
      compactBtn: this.container.querySelector('[data-action="compact"]'),
      copyBtn: this.container.querySelector('[data-action="copy"]'),
      clearBtn: this.container.querySelector('[data-action="clear"]'),
      editorContainer: this.container.querySelector(
        '.editor-container'
      ),
      editor: this.container.querySelector('.json-formatter-editor'),
      statusText: this.container.querySelector('#status-text'),
      charCount: this.container.querySelector('#char-count'),
      title: this.container.querySelector('.tool-title'),
    };
  }

  bindEvents() {
    // Use event delegation for toolbar clicks
    const toolbarClickHandler = (e) => this.handleToolbarClick(e);
    this.elements.toolbar.addEventListener('click', toolbarClickHandler);
    this.eventHandlers.set('toolbar-click', toolbarClickHandler);
  }

  async loadResizableMonacoEditor() {
    try {
      this.updateStatus(this.t('loadingEditor'));

      await MonacoLoader.load();

      // Create resizable Monaco Editor instance
      const result = MonacoLoader.createResizableEditor(
        this.elements.editorContainer,
        this.elements.editor,
        {
          value: '',
          language: 'json',
          theme: 'vs-light',
          minimap: { enabled: false },
          fontSize: 14,
          folding: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          formatOnType: true,
          resizeOptions: {
            minHeight: 300,
            maxHeight: 800
          }
        }
      );

      this.editor = result.editor;
      this.resizeHandle = result.resizeHandle;

      // Listen for content changes
      this.editor.onDidChangeModelContent(() => {
        this.onContentChange();
      });

      // Set initial height for the resizable container
      this.elements.editorContainer.style.height = '400px';

      this.updateStatus(this.t('ready'));
    } catch (error) {
      console.error('Monaco Editor loading failed:', error);
      this.updateStatus(this.t('loadingEditor') + ' - Error', 'error');
      throw error;
    }
  }


  handleToolbarClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'format':
        this.formatJSON();
        break;
      case 'compact':
        this.compactJSON();
        break;
      case 'copy':
        this.copyContent();
        break;
      case 'clear':
        this.clearContent();
        break;
    }
  }

  async formatJSON() {
    if (this.state.isProcessing) return;

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const content = this.getEditorContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      // Parse and format JSON
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);

      this.setEditorContent(formatted);
      this.saveToStorage(); // Save formatted content
      this.updateStatus(this.t('formatSuccess'), 'success');
    } catch (error) {
      console.error('JSON format error:', error);
      this.updateStatus(`${this.t('syntaxError')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async compactJSON() {
    if (this.state.isProcessing) return;

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const content = this.getEditorContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      // Parse and compact JSON
      const parsed = JSON.parse(content);
      const compacted = JSON.stringify(parsed);

      this.setEditorContent(compacted);
      this.saveToStorage(); // Save compacted content
      this.updateStatus(this.t('compactSuccess'), 'success');
    } catch (error) {
      console.error('JSON compact error:', error);
      this.updateStatus(`${this.t('syntaxError')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async copyContent() {
    try {
      const content = this.getEditorContent();
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
    this.setEditorContent('');
    EditorStorage.clear(this.storageKey); // Clear storage
    this.updateStatus(this.t('clearSuccess'), 'success');
    this.updateCharacterCount();
  }

  getEditorContent() {
    return this.editor ? this.editor.getValue() : '';
  }

  setEditorContent(content) {
    if (this.editor) {
      this.editor.setValue(content);
      this.onContentChange();
    }
  }

  onContentChange() {
    // Debounce the update to avoid too frequent calls
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      // Check if the tool is still alive before updating
      if (!this.container || !this.elements) {
        return;
      }

      this.updateCharacterCount();
      this.validateJSON();
    }, 150);

    // Debounced auto-save to storage
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveToStorage();
    }, 500); // Save after 500ms of inactivity
  }

  updateCharacterCount() {
    // Ensure DOM elements are available before updating
    if (!this.elements?.charCount) {
      console.warn('Character count element not available, skipping update');
      return;
    }

    const content = this.getEditorContent();
    const charCount = content.length;
    const lineCount = content.split('\n').length;

    this.state.characterCount = charCount;
    this.state.lineCount = lineCount;

    this.elements.charCount.textContent = `${charCount} ${this.t(
      'characters'
    )}`;
  }

  validateJSON() {
    const content = this.getEditorContent().trim();

    if (!content) {
      this.state.isValid = true;
      return;
    }

    try {
      JSON.parse(content);
      this.state.isValid = true;
    } catch (error) {
      this.state.isValid = false;
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
    this.container.classList.toggle('json-formatter-loading', processing);
  }

  updateStatus(message, type = 'normal') {
    if (!this.elements?.statusText) {
      console.warn('Status text element not available, skipping status update');
      return;
    }

    this.elements.statusText.textContent = message;

    // Reset status classes
    this.elements.statusText.classList.remove(
      'json-formatter-status-error',
      'json-formatter-status-success',
      'json-formatter-status-warning'
    );

    // Add appropriate class
    if (type === 'error') {
      this.elements.statusText.classList.add('json-formatter-status-error');
    } else if (type === 'success') {
      this.elements.statusText.classList.add('json-formatter-status-success');
    } else if (type === 'warning') {
      this.elements.statusText.classList.add('json-formatter-status-warning');
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
    // Standard language change listener for consistency
    window.addEventListener("languageChanged", (e) => {
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
    elementsToTranslate.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (this.translations[this.currentLanguage][key]) {
        element.textContent = this.t(key);
      }
    });

    // Monaco Editor placeholder is handled automatically

    // Update status if it's the default message
    if (!this.state.isProcessing) {
      this.updateStatus(this.t('ready'));
    }

    // Update character count
    this.updateCharacterCount();
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
      if (savedContent && this.editor) {
        this.editor.setValue(savedContent);
        console.log('Loaded saved content from storage');
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    }
  }

  saveToStorage() {
    try {
      const content = this.getEditorContent();
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

    // Dispose Monaco Editor and resize handle
    if (this.editor) {
      MonacoLoader.disposeEditor(this.editor);
      this.editor = null;
      this.resizeHandle = null;
    }

    // Reset state completely
    this.state = {
      isProcessing: false,
      currentContent: '',
      isValid: true,
      characterCount: 0,
      lineCount: 1,
    };

    // Clear element references safely
    this.elements = {};

    // Clear container reference
    this.container = null;

    console.log('JSON Formatter Tool destroyed');
  }
}
