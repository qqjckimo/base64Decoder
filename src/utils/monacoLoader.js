// Monaco Editor Dynamic Loader with Resize Support
export class MonacoLoader {
  static instance = null;
  static loadingPromise = null;
  static editorInstances = new Set();
  static resizeHandles = new Map(); // Track resize handles for cleanup
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
        automaticLayout: true, // Always use automatic layout for resize support
        wordWrap: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        renderWhitespace: 'none',
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
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
        hover: { enabled: true },
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

  /**
   * Create a resizable Monaco Editor with drag handle
   * @param {HTMLElement} resizableContainer - Container that will be resized
   * @param {HTMLElement} editorContainer - Direct container for Monaco Editor
   * @param {Object} options - Monaco editor options
   * @returns {Object} { editor, resizeHandle }
   */
  static createResizableEditor(resizableContainer, editorContainer, options = {}) {
    if (!this.instance) {
      throw new Error('Monaco Editor not loaded. Call MonacoLoader.load() first.');
    }

    // Create Monaco Editor in the editor container
    const editor = this.createEditor(editorContainer, options);

    // Create resize handle that resizes the resizable container
    const resizeHandle = this._createResizeHandle(resizableContainer, resizableContainer, options.resizeOptions);

    // Store the association for cleanup
    this.resizeHandles.set(editor, resizeHandle);

    return { editor, resizeHandle };
  }

  /**
   * Create a resize handle for the editor container
   * @private
   */
  static _createResizeHandle(container, insertAfter, options = {}) {
    const resizeOptions = {
      minHeight: 200,
      maxHeight: 800,
      handleHeight: 8,
      ...options
    };

    // Create resize handle element
    const handle = document.createElement('div');
    handle.className = 'monaco-resize-handle';
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-label', 'Resize editor');
    handle.setAttribute('aria-orientation', 'horizontal');

    // Add grip indicator
    const grip = document.createElement('div');
    grip.className = 'monaco-resize-grip';
    grip.innerHTML = '⋯⋯⋯'; // Horizontal dots
    handle.appendChild(grip);

    // Insert handle after specified element or container
    const insertTarget = insertAfter || container;
    if (insertTarget.parentNode) {
      insertTarget.parentNode.insertBefore(handle, insertTarget.nextSibling);
    }

    // Add styles if not already present
    this._ensureResizeStyles();

    // Attach resize functionality
    const resizeController = this._attachResizeLogic(handle, container, resizeOptions);

    return {
      element: handle,
      controller: resizeController,
      destroy: () => {
        if (handle.parentNode) {
          handle.parentNode.removeChild(handle);
        }
        resizeController.destroy();
      }
    };
  }

  /**
   * Add resize handle styles to document
   * @private
   */
  static _ensureResizeStyles() {
    if (document.querySelector('#monaco-resize-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'monaco-resize-styles';
    styles.textContent = `
      .monaco-resize-handle {
        height: 8px;
        background: var(--bg-secondary, #f5f5f5);
        border-top: 1px solid var(--border-color, #e0e0e0);
        border-bottom: 1px solid var(--border-color, #e0e0e0);
        cursor: ns-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
        user-select: none;
        position: relative;
      }

      .monaco-resize-handle:hover,
      .monaco-resize-handle:focus {
        background: var(--bg-hover, #e8e8e8);
        outline: none;
      }

      .monaco-resize-handle:focus {
        box-shadow: inset 0 0 0 2px var(--primary, #333333);
      }

      .monaco-resize-handle.resizing {
        background: var(--primary, #333333);
      }

      .monaco-resize-grip {
        font-size: 12px;
        color: var(--text-secondary, #666666);
        font-weight: bold;
        pointer-events: none;
        line-height: 1;
        letter-spacing: 2px;
      }

      .monaco-resize-handle:hover .monaco-resize-grip,
      .monaco-resize-handle:focus .monaco-resize-grip {
        color: var(--text-primary, #333333);
      }

      .monaco-resize-handle.resizing .monaco-resize-grip {
        color: #ffffff;
      }

      /* Mobile support */
      @media (max-width: 768px) {
        .monaco-resize-handle {
          height: 12px;
          touch-action: none;
        }
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .monaco-resize-handle {
          transition: none;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Attach resize logic to handle
   * @private
   */
  static _attachResizeLogic(handle, container, options) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    const handleMouseDown = (e) => {
      e.preventDefault();
      startResize(e.clientY);
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        startResize(e.touches[0].clientY);
      }
    };

    const startResize = (clientY) => {
      isResizing = true;
      startY = clientY;
      startHeight = container.offsetHeight;

      handle.classList.add('resizing');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      // Dispatch resize start event
      container.dispatchEvent(new CustomEvent('resizeStart', {
        detail: { height: startHeight }
      }));
    };

    const handleMouseMove = (e) => {
      if (!isResizing) return;
      e.preventDefault();
      performResize(e.clientY);
    };

    const handleTouchMove = (e) => {
      if (!isResizing || e.touches.length !== 1) return;
      e.preventDefault();
      performResize(e.touches[0].clientY);
    };

    const performResize = (clientY) => {
      const deltaY = clientY - startY;
      const newHeight = Math.max(
        options.minHeight,
        Math.min(options.maxHeight, startHeight + deltaY)
      );

      container.style.height = newHeight + 'px';

      // Dispatch resize event
      container.dispatchEvent(new CustomEvent('resize', {
        detail: { height: newHeight, deltaY }
      }));
    };

    const handleMouseUp = () => {
      if (!isResizing) return;
      endResize();
    };

    const handleTouchEnd = () => {
      if (!isResizing) return;
      endResize();
    };

    const endResize = () => {
      isResizing = false;

      handle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      // Dispatch resize end event
      container.dispatchEvent(new CustomEvent('resizeEnd', {
        detail: { height: container.offsetHeight }
      }));
    };

    // Keyboard accessibility
    const handleKeyDown = (e) => {
      const currentHeight = container.offsetHeight;
      let newHeight = currentHeight;
      const step = 10;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newHeight = Math.max(options.minHeight, currentHeight - step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newHeight = Math.min(options.maxHeight, currentHeight + step);
          break;
        case 'Home':
          e.preventDefault();
          newHeight = options.minHeight;
          break;
        case 'End':
          e.preventDefault();
          newHeight = options.maxHeight;
          break;
        default:
          return;
      }

      if (newHeight !== currentHeight) {
        container.style.height = newHeight + 'px';
        container.dispatchEvent(new CustomEvent('resize', {
          detail: { height: newHeight, deltaY: newHeight - currentHeight }
        }));
      }
    };

    // Attach event listeners
    handle.addEventListener('mousedown', handleMouseDown);
    handle.addEventListener('touchstart', handleTouchStart, { passive: false });
    handle.addEventListener('keydown', handleKeyDown);

    return {
      destroy: () => {
        handle.removeEventListener('mousedown', handleMouseDown);
        handle.removeEventListener('touchstart', handleTouchStart);
        handle.removeEventListener('keydown', handleKeyDown);

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }

  static disposeEditor(editor) {
    if (editor && typeof editor.dispose === 'function') {
      try {
        // Clean up associated resize handle
        const resizeHandle = this.resizeHandles.get(editor);
        if (resizeHandle) {
          resizeHandle.destroy();
          this.resizeHandles.delete(editor);
        }

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
    this.resizeHandles.clear();
  }

  static getEditorCount() {
    return this.editorInstances.size;
  }
}