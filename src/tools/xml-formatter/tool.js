import { MonacoLoader } from '../../utils/monacoLoader.js';
import { EditorStorage } from '../../utils/editorStorage.js';
import './styles.css';

export default class XMLFormatterTool {
  constructor() {
    // Storage key for this tool
    this.storageKey = 'xml-formatter';

    // Language system initialization
    this.currentLanguage = window.appLanguage?.get() || 'zh-TW';
    this.translations = {
      'zh-TW': {
        title: 'XML 格式化工具',
        format: '格式化',
        minify: '壓縮',
        validate: '驗證',
        copy: '複製',
        clear: '清除',
        ready: '就緒',
        processing: '處理中...',
        formatSuccess: '格式化成功',
        minifySuccess: '壓縮成功',
        validationComplete: '驗證完成',
        copySuccess: '已複製到剪貼簿',
        clearSuccess: '已清除內容',
        copyError: '複製失敗',
        empty: '請輸入 XML 內容',
        characters: '個字元',
        lines: '行',
        warnings: '個警告',
        errors: '個錯誤',
        placeholder: '請在此輸入或貼上 XML 內容...',
        loadingEditor: '正在載入編輯器...',
        // Validation status
        structureValid: '✓ XML 結構正確',
        namespaceWarning: '✓ 結構正確（有 namespace 警告）',
        structureError: '✗ 結構錯誤',
        // Confluence specific
        confluenceDetected: '偵測到 Confluence Storage Format',
        namespaceAdded: '已自動添加 namespace 宣告',
        // Error types
        undefinedNamespace: '未定義的 namespace prefix',
        htmlEntity: 'HTML entity 參考',
        unclosedTag: '標籤未正確閉合',
        invalidStructure: 'XML 結構無效',
        syntaxError: '語法錯誤',
        // Validation panel
        validationResults: '驗證結果',
        showDetails: '顯示詳細',
        hideDetails: '隱藏詳細',
        noIssues: '沒有發現問題',
        issuesFound: '發現問題',
      },
      en: {
        title: 'XML Formatter',
        format: 'Format',
        minify: 'Minify',
        validate: 'Validate',
        copy: 'Copy',
        clear: 'Clear',
        ready: 'Ready',
        processing: 'Processing...',
        formatSuccess: 'Formatted successfully',
        minifySuccess: 'Minified successfully',
        validationComplete: 'Validation completed',
        copySuccess: 'Copied to clipboard',
        clearSuccess: 'Content cleared',
        copyError: 'Copy failed',
        empty: 'Please enter XML content',
        characters: 'characters',
        lines: 'lines',
        warnings: 'warnings',
        errors: 'errors',
        placeholder: 'Enter or paste XML content here...',
        loadingEditor: 'Loading editor...',
        // Validation status
        structureValid: '✓ XML structure is valid',
        namespaceWarning: '✓ Structure valid (namespace warnings)',
        structureError: '✗ Structure error',
        // Confluence specific
        confluenceDetected: 'Confluence Storage Format detected',
        namespaceAdded: 'Namespace declarations added automatically',
        // Error types
        undefinedNamespace: 'Undefined namespace prefix',
        htmlEntity: 'HTML entity reference',
        unclosedTag: 'Unclosed XML tag',
        invalidStructure: 'Invalid XML structure',
        syntaxError: 'Syntax error',
        // Validation panel
        validationResults: 'Validation Results',
        showDetails: 'Show Details',
        hideDetails: 'Hide Details',
        noIssues: 'No issues found',
        issuesFound: 'Issues found',
      },
    };

    // State management
    this.state = {
      isProcessing: false,
      currentContent: '',
      characterCount: 0,
      lineCount: 1,
      validationResult: null,
      isValidationPanelVisible: false,
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

    // XML libraries (loaded dynamically)
    this.XMLValidator = null;
    this.XMLParser = null;
    this.xmlFormatter = null;
  }

  async init(container) {
    this.container = container;

    // Setup DOM structure
    this.renderInitial();

    // Cache DOM elements
    this.cacheElements();

    // Bind events
    this.bindEvents();

    // Load dependencies
    await this.loadDependencies();

    // Load Monaco Editor with resize capability
    await this.loadResizableMonacoEditor();

    // Setup language listener
    this.setupLanguageListener();

    // Load saved content from storage
    this.loadFromStorage();

    // Initial state setup
    if (this.elements?.statusText) {
      this.updateStatus(this.t('ready'));
    }

    this.updateCharacterCount();

    console.log('XML Formatter Tool initialized');
  }

  renderInitial() {
    const t = this.t.bind(this);
    this.container.innerHTML = `
      <div class="xml-formatter-container">
        <div class="xml-formatter-toolbar">
          <span class="xml-formatter-title" data-i18n="title">${t(
            'title'
          )}</span>

          <div class="xml-formatter-actions">
            <button class="xml-formatter-btn xml-formatter-btn-primary" data-action="format">
              <svg class="xml-formatter-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="21" x2="3" y1="6" y2="6" />
                <line x1="15" x2="3" y1="12" y2="12" />
                <line x1="17" x2="3" y1="18" y2="18" />
              </svg>
              <span class="xml-formatter-btn-text" data-i18n="format">${t(
                'format'
              )}</span>
            </button>

            <button class="xml-formatter-btn" data-action="minify">
              <svg class="xml-formatter-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span class="xml-formatter-btn-text" data-i18n="minify">${t(
                'minify'
              )}</span>
            </button>

            <button class="xml-formatter-btn" data-action="validate">
              <svg class="xml-formatter-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9,11 12,14 22,4" />
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.41 0 2.73.33 3.9.9" />
              </svg>
              <span class="xml-formatter-btn-text" data-i18n="validate">${t(
                'validate'
              )}</span>
            </button>

            <button class="xml-formatter-btn" data-action="copy">
              <svg class="xml-formatter-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span class="xml-formatter-btn-text" data-i18n="copy">${t(
                'copy'
              )}</span>
            </button>

            <button class="xml-formatter-btn" data-action="clear">
              <svg class="xml-formatter-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span class="xml-formatter-btn-text" data-i18n="clear">${t(
                'clear'
              )}</span>
            </button>
          </div>
        </div>

        <div class="xml-formatter-editor-container">
          <div class="xml-formatter-editor" id="xml-editor"></div>
        </div>

        <div class="xml-formatter-status-bar">
          <span class="xml-formatter-status" id="status-text" data-i18n="ready">${t(
            'ready'
          )}</span>
          <div class="xml-formatter-stats">
            <span id="char-count">0 <span data-i18n="characters">${t(
              'characters'
            )}</span></span>
            <span id="warning-count" class="warning-indicator hidden">
              0 <span data-i18n="warnings">${t('warnings')}</span>
            </span>
            <span id="error-count" class="error-indicator hidden">
              0 <span data-i18n="errors">${t('errors')}</span>
            </span>
            <button id="toggle-details" class="toggle-details-btn hidden" data-i18n="showDetails">${t(
              'showDetails'
            )}</button>
          </div>
        </div>

        <div class="xml-formatter-validation-panel hidden" id="validation-panel">
          <div class="validation-header">
            <h3 class="validation-title" data-i18n="validationResults">${t(
              'validationResults'
            )}</h3>
          </div>
          <div class="validation-results" id="validation-results"></div>
        </div>
      </div>
    `;
  }

  cacheElements() {
    this.elements = {
      toolbar: this.container.querySelector('.xml-formatter-toolbar'),
      actions: this.container.querySelector('.xml-formatter-actions'),
      formatBtn: this.container.querySelector('[data-action="format"]'),
      minifyBtn: this.container.querySelector('[data-action="minify"]'),
      validateBtn: this.container.querySelector('[data-action="validate"]'),
      copyBtn: this.container.querySelector('[data-action="copy"]'),
      clearBtn: this.container.querySelector('[data-action="clear"]'),
      editorContainer: this.container.querySelector(
        '.xml-formatter-editor-container'
      ),
      editor: this.container.querySelector('.xml-formatter-editor'),
      statusText: this.container.querySelector('#status-text'),
      charCount: this.container.querySelector('#char-count'),
      warningCount: this.container.querySelector('#warning-count'),
      errorCount: this.container.querySelector('#error-count'),
      toggleDetails: this.container.querySelector('#toggle-details'),
      validationPanel: this.container.querySelector('#validation-panel'),
      validationResults: this.container.querySelector('#validation-results'),
      title: this.container.querySelector('.xml-formatter-title'),
    };
  }

  bindEvents() {
    // Use event delegation to avoid DOM element dependency issues
    const containerClickHandler = (e) => {
      // Handle toolbar button clicks
      const button = e.target.closest('[data-action]');
      if (button) {
        this.handleToolbarClick(e);
        return;
      }

      // Handle toggle details button
      if (
        e.target.matches('#toggle-details') ||
        e.target.closest('#toggle-details')
      ) {
        this.toggleValidationDetails(e);
        return;
      }
    };

    this.container.addEventListener('click', containerClickHandler);
    this.eventHandlers.set('container-click', containerClickHandler);
  }

  async loadDependencies() {
    try {
      // Load fast-xml-parser dynamically
      const fxp = await import('https://esm.sh/fast-xml-parser@4.3.2');
      this.XMLValidator = fxp.XMLValidator;
      this.XMLParser = fxp.XMLParser;

      // Load xml-formatter dynamically
      const xmlFormatterModule = await import(
        'https://esm.sh/xml-formatter@3.6.7'
      );
      this.xmlFormatter = xmlFormatterModule.default;

      console.log('XML dependencies loaded successfully');
    } catch (error) {
      console.error('Failed to load XML dependencies:', error);
      this.updateStatus('依賴載入失敗', 'error');

      // Fallback: Mock implementation for testing
      this.XMLValidator = {
        validate: (content) => {
          try {
            // Simple XML parsing test using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/xml');
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
              return {
                err: {
                  msg: parseError.textContent,
                  line: 1,
                  code: 'PARSE_ERROR',
                },
              };
            }
            return true;
          } catch (e) {
            return {
              err: {
                msg: e.message,
                line: 1,
                code: 'VALIDATION_ERROR',
              },
            };
          }
        },
      };

      this.xmlFormatter = (xml, options = {}) => {
        // Simple formatting fallback
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, 'text/xml');
          const serializer = new XMLSerializer();
          return serializer.serializeToString(doc);
        } catch (e) {
          return xml;
        }
      };

      console.log('Using fallback XML processing');
    }
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
          language: 'xml',
          theme: 'vs-light',
          minimap: { enabled: false },
          fontSize: 14,
          folding: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          formatOnPaste: false,
          formatOnType: false,
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

      // Register custom XML formatting provider
      if (this.xmlFormatter) {
        this.registerXMLFormattingProvider();
      }

      // Set initial height for the resizable container
      this.elements.editorContainer.style.height = '400px';

      this.updateStatus(this.t('ready'));
    } catch (error) {
      console.error('Monaco Editor loading failed:', error);
      this.updateStatus(this.t('loadingEditor') + ' - Error', 'error');
      throw error;
    }
  }

  registerXMLFormattingProvider() {
    const monaco = MonacoLoader.monaco;
    if (!monaco) return;

    monaco.languages.registerDocumentFormattingEditProvider('xml', {
      provideDocumentFormattingEdits: (model) => {
        try {
          const content = model.getValue();
          const formatted = this.formatXMLContent(content);

          return [
            {
              range: model.getFullModelRange(),
              text: formatted,
            },
          ];
        } catch (error) {
          console.error('Monaco XML formatting error:', error);
          return [];
        }
      },
    });
  }


  handleToolbarClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'format':
        this.formatXML();
        break;
      case 'minify':
        this.minifyXML();
        break;
      case 'validate':
        this.validateXML();
        break;
      case 'copy':
        this.copyContent();
        break;
      case 'clear':
        this.clearContent();
        break;
    }
  }

  toggleValidationDetails(e) {
    e.preventDefault();
    this.state.isValidationPanelVisible = !this.state.isValidationPanelVisible;

    this.elements.validationPanel.classList.toggle(
      'hidden',
      !this.state.isValidationPanelVisible
    );
    this.elements.toggleDetails.textContent = this.state
      .isValidationPanelVisible
      ? this.t('hideDetails')
      : this.t('showDetails');
  }

  async formatXML() {
    if (this.state.isProcessing) return;

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const content = this.getEditorContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      const formatted = this.formatXMLContent(content);
      this.setEditorContent(formatted);
      this.saveToStorage(); // Save formatted content
      this.updateStatus(this.t('formatSuccess'), 'success');
    } catch (error) {
      console.error('XML format error:', error);
      this.updateStatus(`${this.t('syntaxError')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  formatXMLContent(content) {
    if (!this.xmlFormatter) {
      throw new Error('XML formatter not loaded');
    }

    // Preprocess for Confluence Storage Format
    const preprocessed = this.preprocessXML(content);

    return this.xmlFormatter(preprocessed, {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\n',
      whiteSpaceAtEndOfSelfClosingTag: true,
    });
  }

  async minifyXML() {
    if (this.state.isProcessing) return;

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const content = this.getEditorContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      // Simple minification by removing unnecessary whitespace
      const minified = content
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();

      this.setEditorContent(minified);
      this.saveToStorage(); // Save minified content
      this.updateStatus(this.t('minifySuccess'), 'success');
    } catch (error) {
      console.error('XML minify error:', error);
      this.updateStatus(`${this.t('syntaxError')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async validateXML() {
    if (this.state.isProcessing) return;

    try {
      this.setProcessing(true);
      this.updateStatus(this.t('processing'));

      const content = this.getEditorContent();
      if (!content.trim()) {
        this.updateStatus(this.t('empty'), 'warning');
        return;
      }

      const result = this.performXMLValidation(content);
      this.state.validationResult = result;

      this.updateValidationDisplay();
      this.showValidationSummary();
      this.updateStatus(this.t('validationComplete'), 'success');
    } catch (error) {
      console.error('XML validation error:', error);
      this.updateStatus(`${this.t('syntaxError')}: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  performXMLValidation(content) {
    const result = {
      structureErrors: [],
      namespaceWarnings: [],
      entityWarnings: [],
    };

    if (!this.XMLValidator) {
      result.structureErrors.push({
        type: 'structure',
        message: 'XML validator not loaded',
        severity: 'error',
      });
      return result;
    }

    try {
      // First, try strict validation
      const validation = this.XMLValidator.validate(content, {
        allowBooleanAttributes: true,
        unpairedTags: ['br', 'img', 'hr', 'input', 'meta', 'link'],
      });

      if (validation !== true) {
        // Check if it's a namespace error
        if (
          validation.err.msg.includes('namespace') ||
          validation.err.msg.includes('Namespace')
        ) {
          result.namespaceWarnings.push({
            type: 'namespace',
            message: this.t('undefinedNamespace'),
            prefix: this.extractNamespacePrefix(validation.err.msg),
            line: validation.err.line,
            severity: 'warning',
          });
        } else {
          result.structureErrors.push({
            type: 'structure',
            message: validation.err.msg,
            line: validation.err.line,
            severity: 'error',
          });
        }
      }

      // Check for Confluence-specific content
      if (this.isConfluenceFormat(content)) {
        result.namespaceWarnings.push({
          type: 'confluence',
          message: this.t('confluenceDetected'),
          severity: 'info',
        });
      }

      // Check for HTML entities
      const entityMatches = content.match(/&[a-zA-Z]+;/g);
      if (entityMatches) {
        result.entityWarnings.push({
          type: 'entity',
          message: `${this.t('htmlEntity')}: ${entityMatches
            .slice(0, 3)
            .join(', ')}${entityMatches.length > 3 ? '...' : ''}`,
          severity: 'info',
        });
      }
    } catch (error) {
      result.structureErrors.push({
        type: 'structure',
        message: error.message,
        severity: 'error',
      });
    }

    return result;
  }

  preprocessXML(content) {
    // Check if it's Confluence Storage Format
    if (this.isConfluenceFormat(content)) {
      // Add XML declaration and namespace declarations if missing
      if (!content.includes('<?xml')) {
        const namespaces = [
          'xmlns:ac="http://www.atlassian.com/schema/confluence/4/ac/"',
          'xmlns:ri="http://www.atlassian.com/schema/confluence/4/ri/"',
          'xmlns="http://www.w3.org/1999/xhtml"',
        ];

        // Wrap content with proper namespaces
        content = `<?xml version="1.0" encoding="UTF-8"?>
<root ${namespaces.join(' ')}>
${content}
</root>`;
      }
    }

    return content;
  }

  isConfluenceFormat(content) {
    return (
      content.includes('ac:') ||
      content.includes('ri:') ||
      content.includes('ac-')
    );
  }

  extractNamespacePrefix(errorMessage) {
    const match = errorMessage.match(/namespace prefix '([^']+)'/);
    return match ? match[1] : 'unknown';
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
    this.state.validationResult = null;
    this.updateValidationDisplay();
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
      if (!this.container || !this.elements) {
        return;
      }

      this.updateCharacterCount();
      // Clear validation results when content changes
      this.state.validationResult = null;
      this.updateValidationDisplay();
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
    if (!this.elements?.charCount) {
      return;
    }

    const content = this.getEditorContent();
    const charCount = content.length;
    const lineCount = content.split('\n').length;

    this.state.characterCount = charCount;
    this.state.lineCount = lineCount;

    this.elements.charCount.innerHTML = `${charCount} <span data-i18n="characters">${this.t(
      'characters'
    )}</span>`;
  }

  updateValidationDisplay() {
    if (!this.state.validationResult) {
      // Hide validation indicators
      this.elements.warningCount.classList.add('hidden');
      this.elements.errorCount.classList.add('hidden');
      this.elements.toggleDetails.classList.add('hidden');
      this.elements.validationPanel.classList.add('hidden');
      this.state.isValidationPanelVisible = false;
      return;
    }

    const { structureErrors, namespaceWarnings, entityWarnings } =
      this.state.validationResult;

    // Update warning count
    const warningCount = namespaceWarnings.length + entityWarnings.length;
    if (warningCount > 0) {
      this.elements.warningCount.innerHTML = `${warningCount} <span data-i18n="warnings">${this.t(
        'warnings'
      )}</span>`;
      this.elements.warningCount.classList.remove('hidden');
    } else {
      this.elements.warningCount.classList.add('hidden');
    }

    // Update error count
    const errorCount = structureErrors.length;
    if (errorCount > 0) {
      this.elements.errorCount.innerHTML = `${errorCount} <span data-i18n="errors">${this.t(
        'errors'
      )}</span>`;
      this.elements.errorCount.classList.remove('hidden');
    } else {
      this.elements.errorCount.classList.add('hidden');
    }

    // Show/hide toggle button
    if (warningCount > 0 || errorCount > 0) {
      this.elements.toggleDetails.classList.remove('hidden');
      this.elements.toggleDetails.textContent = this.state
        .isValidationPanelVisible
        ? this.t('hideDetails')
        : this.t('showDetails');
    } else {
      this.elements.toggleDetails.classList.add('hidden');
    }

    // Update validation results panel
    this.renderValidationResults();
  }

  renderValidationResults() {
    if (!this.state.validationResult) return;

    const validationPanel = this.elements.validationResults;
    validationPanel.innerHTML = '';

    const { structureErrors, namespaceWarnings, entityWarnings } =
      this.state.validationResult;

    // Structure errors
    structureErrors.forEach((error) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-item error';
      errorDiv.innerHTML = `
        <span class="validation-icon">✗</span>
        <span class="validation-message">${this.t('structureError')}: ${
        error.message
      }</span>
        ${
          error.line
            ? `<span class="validation-line">Line ${error.line}</span>`
            : ''
        }
      `;
      validationPanel.appendChild(errorDiv);
    });

    // Namespace warnings
    namespaceWarnings.forEach((warning) => {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'validation-item warning';
      warningDiv.innerHTML = `
        <span class="validation-icon">⚠</span>
        <span class="validation-message">${warning.message}${
        warning.prefix ? ': ' + warning.prefix : ''
      }</span>
        ${
          warning.line
            ? `<span class="validation-line">Line ${warning.line}</span>`
            : ''
        }
      `;
      validationPanel.appendChild(warningDiv);
    });

    // Entity warnings
    entityWarnings.forEach((warning) => {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'validation-item info';
      warningDiv.innerHTML = `
        <span class="validation-icon">ℹ</span>
        <span class="validation-message">${warning.message}</span>
      `;
      validationPanel.appendChild(warningDiv);
    });

    // No issues message
    if (
      structureErrors.length === 0 &&
      namespaceWarnings.length === 0 &&
      entityWarnings.length === 0
    ) {
      const noIssuesDiv = document.createElement('div');
      noIssuesDiv.className = 'validation-item success';
      noIssuesDiv.innerHTML = `
        <span class="validation-icon">✓</span>
        <span class="validation-message">${this.t('noIssues')}</span>
      `;
      validationPanel.appendChild(noIssuesDiv);
    }
  }

  showValidationSummary() {
    if (!this.state.validationResult) return;

    const { structureErrors, namespaceWarnings } = this.state.validationResult;

    let statusMessage, statusType;

    if (structureErrors.length === 0) {
      if (namespaceWarnings.length > 0) {
        statusMessage = this.t('namespaceWarning');
        statusType = 'warning';
      } else {
        statusMessage = this.t('structureValid');
        statusType = 'success';
      }
    } else {
      statusMessage = `${this.t('structureError')}: ${
        structureErrors[0].message
      }`;
      statusType = 'error';
    }

    this.updateStatus(statusMessage, statusType);
  }

  setProcessing(processing) {
    this.state.isProcessing = processing;

    // Update button states
    const buttons = this.container.querySelectorAll('.xml-formatter-btn');
    buttons.forEach((btn) => {
      btn.disabled = processing;
    });

    // Update container state
    this.container.classList.toggle('xml-formatter-loading', processing);
  }

  updateStatus(message, type = 'normal') {
    if (!this.elements?.statusText) {
      return;
    }

    this.elements.statusText.textContent = message;

    // Reset status classes
    this.elements.statusText.classList.remove(
      'xml-formatter-status-error',
      'xml-formatter-status-success',
      'xml-formatter-status-warning'
    );

    // Add appropriate class
    if (type === 'error') {
      this.elements.statusText.classList.add('xml-formatter-status-error');
    } else if (type === 'success') {
      this.elements.statusText.classList.add('xml-formatter-status-success');
    } else if (type === 'warning') {
      this.elements.statusText.classList.add('xml-formatter-status-warning');
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

    // Monaco Editor placeholder is handled automatically

    // Update status if it's the default message
    if (!this.state.isProcessing) {
      this.updateStatus(this.t('ready'));
    }

    // Update character count
    this.updateCharacterCount();

    // Update validation display
    this.updateValidationDisplay();

    // Update toggle button text
    if (
      this.elements.toggleDetails &&
      !this.elements.toggleDetails.classList.contains('hidden')
    ) {
      this.elements.toggleDetails.textContent = this.state
        .isValidationPanelVisible
        ? this.t('hideDetails')
        : this.t('showDetails');
    }
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
      if (event === 'container-click' && this.container) {
        this.container.removeEventListener('click', handler);
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
      characterCount: 0,
      lineCount: 1,
      validationResult: null,
      isValidationPanelVisible: false,
    };

    // Clear element references
    this.elements = {};

    // Clear container reference
    this.container = null;

    console.log('XML Formatter Tool destroyed');
  }
}
