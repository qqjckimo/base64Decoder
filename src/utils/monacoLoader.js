// Monaco Editor Dynamic Loader
export class MonacoLoader {
  static instance = null;
  static loadingPromise = null;
  static editorInstances = new Set();
  static retryCount = 0;
  static maxRetries = 3;

  static async load() {
    // Return existing instance if already loaded
    if (this.instance) {
      return this.instance;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading process
    this.loadingPromise = this._loadMonaco();
    return this.loadingPromise;
  }

  static async _loadMonaco() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.monaco) {
        this.instance = window.monaco;
        this.retryCount = 0;
        resolve(window.monaco);
        return;
      }

      // Configure AMD loader for Monaco
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
      
      script.onload = () => {
        try {
          // Configure Monaco loader
          window.require.config({ 
            paths: { 
              'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
            }
          });

          // Load Monaco editor with timeout
          const loadTimeout = setTimeout(() => {
            reject(new Error('Monaco Editor loading timeout'));
          }, 30000);

          window.require(['vs/editor/editor.main'], () => {
            try {
              clearTimeout(loadTimeout);
              // Configure Monaco defaults
              this._configureMonacoDefaults();
              
              this.instance = window.monaco;
              this.retryCount = 0;
              resolve(window.monaco);
            } catch (error) {
              clearTimeout(loadTimeout);
              console.error('Error configuring Monaco Editor:', error);
              this._handleLoadError(error, resolve, reject);
            }
          }, (error) => {
            clearTimeout(loadTimeout);
            console.error('Error loading Monaco Editor modules:', error);
            this._handleLoadError(error, resolve, reject);
          });
        } catch (error) {
          console.error('Error setting up Monaco loader:', error);
          this._handleLoadError(error, resolve, reject);
        }
      };

      script.onerror = () => {
        const error = new Error('Failed to load Monaco Editor script');
        this._handleLoadError(error, resolve, reject);
      };

      document.head.appendChild(script);
    });
  }

  static _handleLoadError(error, resolve, reject) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.warn(`Monaco Editor load failed, retrying (${this.retryCount}/${this.maxRetries})...`);
      
      // Clear loading promise to allow retry
      this.loadingPromise = null;
      
      // Retry after delay
      setTimeout(() => {
        this._loadMonaco().then(resolve).catch(reject);
      }, 1000 * this.retryCount);
    } else {
      this.retryCount = 0;
      reject(error);
    }
  }

  static _configureMonacoDefaults() {
    // Define custom theme matching the app's design
    window.monaco.editor.defineTheme('base64-theme', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editorLineNumber.foreground': '#999999',
        'editor.selectionBackground': '#93c5fd40',
        'editor.inactiveSelectionBackground': '#93c5fd20'
      }
    });

    // Note: We don't modify EditorOptions defaults as they might not exist
    // Instead, we'll apply these options when creating each editor instance
  }

  static createEditor(container, options = {}) {
    if (!this.instance) {
      throw new Error('Monaco Editor not loaded. Call MonacoLoader.load() first.');
    }

    if (!container) {
      throw new Error('Container element is required for Monaco Editor.');
    }

    try {
      const defaultOptions = {
        value: '',
        language: 'plaintext',
        theme: 'base64-theme',
        automaticLayout: true,
        wordWrap: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        renderWhitespace: 'none',
        scrollbar: {
          vertical: 'auto',
          horizontal: 'hidden',
          useShadows: false,
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
          alwaysConsumeMouseWheel: false
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        renderLineHighlight: 'line',
        roundedSelection: true,
        contextmenu: true,
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: 'off',
        tabCompletion: 'off',
        wordBasedSuggestions: false,
        parameterHints: { enabled: false },
        hover: { enabled: false },
        links: false,
        padding: { top: 8, bottom: 8 }
      };

      const editor = this.instance.editor.create(container, {
        ...defaultOptions,
        ...options
      });

      // Track editor instance for management
      this.editorInstances.add(editor);

      return editor;
    } catch (error) {
      console.error('Error creating Monaco Editor instance:', error);
      throw error;
    }
  }

  static createFallbackEditor(container, options = {}) {
    const { value = '', readOnly = false } = options;
    
    container.innerHTML = `
      <textarea 
        id="fallbackEditor" 
        ${readOnly ? 'readonly' : ''}
        style="width: 100%; height: 100%; border: none; 
               font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
               font-size: 13px; padding: 10px; resize: none; outline: none;
               background: #ffffff; color: #333333; line-height: 1.5;"
        placeholder="Editor content will appear here...">${value}</textarea>
    `;

    const textarea = container.querySelector('#fallbackEditor');
    return {
      setValue: (val) => { textarea.value = val; },
      getValue: () => textarea.value,
      dispose: () => { container.innerHTML = ''; },
      focus: () => textarea.focus(),
      layout: () => {}, // No-op for textarea
      onDidChangeModelContent: (callback) => {
        textarea.addEventListener('input', callback);
        return { dispose: () => textarea.removeEventListener('input', callback) };
      }
    };
  }

  static disposeEditor(editor) {
    if (editor && typeof editor.dispose === 'function') {
      try {
        editor.dispose();
        this.editorInstances.delete(editor);
      } catch (error) {
        console.warn('Error disposing Monaco Editor:', error);
      }
    }
  }

  static disposeAllEditors() {
    for (const editor of this.editorInstances) {
      this.disposeEditor(editor);
    }
    this.editorInstances.clear();
  }

  static getEditorCount() {
    return this.editorInstances.size;
  }
}