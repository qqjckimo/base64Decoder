# Single-Page HTML Tool to Modular Toolkit - Universal Integration Guide

## Overview

This guide provides a standardized process for systematically integrating independent single-page HTML tools (such as image processors, JSON formatters, etc.) into the existing modular toolkit architecture. This process has been battle-tested and successfully converted PNG to ICO Converter from a single HTML file (655 lines) into a modular tool (15.43KB bundle size).

## Core Principles

- **Bundle Size Priority**: Every decision must consider the impact on bundle size
- **Progressive Loading**: Core functionality first, advanced features lazy-loaded
- **Standardized Interface**: All tools follow unified API contracts
- **Zero Breaking Changes**: Maintain complete original functionality
- **Language Update Separation**: MANDATORY separation of initialization from language updates

---

## Phase 1: Original File Analysis & Assessment (Analysis Phase)

### 1.1 File Structure Parsing

Conduct comprehensive technical debt assessment to understand the original tool's tech stack and complexity.

#### HTML Structure Analysis

- Identify all DOM elements and their functions
- Mark reusable UI components
- Evaluate HTML template complexity
- Document special HTML5 API usage (Canvas, File API, etc.)

#### CSS Scope Assessment

```
Total line count: _____ lines
Style type classification:
- Global reset styles: _____ lines (removable)
- Layout styles: _____ lines (need integration)
- Component-specific styles: _____ lines (keep)
- Animation effects: _____ lines (selective retention)
- Responsive rules: _____ lines (need standardization)
```

#### JavaScript Function Analysis

```javascript
// Function module list
- Core business logic: [list main functions]
- UI interaction handling: [list UI-related functions]
- Third-party libraries: [list external dependencies]
- Web API usage: [Canvas, File, Blob, Worker, etc.]
```

#### Bundle Size Estimation

```
Original HTML file: _____ KB
Estimated after decomposition:
- JavaScript: ~_____ KB
- CSS: ~_____ KB
- External dependencies: ~_____ KB
Target Bundle Size: < 30KB
```

### 1.2 Tool Type Classification & Processing Strategy

#### Image Processing Tools

**Characteristics**: Use Canvas API, File API, image format conversion
**Standard Processing Pattern**:

```javascript
// Standard architecture
- Canvas operations → Independent methods
- File handling → Unified interface
- Download functionality → Shared utilities
- Web Worker → Heavy computation tasks
```

**Examples**: Base64 Encoder/Decoder, PNG to ICO, Image compressor

#### Text Processing Tools

**Characteristics**: String operations, format validation, syntax highlighting needs
**Standard Processing Pattern**:

```javascript
// Monaco Editor integration pattern
- Input handling → Monaco Editor
- Formatting logic → Core methods
- Validation functionality → Independent modules
- Output display → Monaco readonly mode
```

**Examples**: JSON Formatter, XML Beautifier, SQL Formatter

#### Data Conversion Tools

**Characteristics**: Format conversion, encoding/decoding, data mapping
**Standard Processing Pattern**:

```javascript
// Converter pattern
- Input validation → Unified validator
- Conversion logic → Pure function implementation
- Error handling → Standardized error classes
- Batch processing → Web Worker
```

**Examples**: CSV to JSON, Base64 encoder/decoder, Time converter

#### Hybrid Tools

**Characteristics**: Combine multiple processing types
**Processing Strategy**: Modular separation of different functions, use strategy pattern

### 1.3 Technical Debt Assessment Checklist

- [ ] **Deprecated API Check**

  - Using any deprecated APIs?
  - Browser compatibility issues?
  - Polyfill requirements assessment

- [ ] **Security Review**

  - XSS vulnerability risks
  - Input validation completeness
  - CSP compatibility

- [ ] **Performance Bottleneck Identification**

  - Synchronous blocking operations
  - Memory leak risks
  - Heavy DOM manipulations

- [ ] **Code Quality**
  - Global variable pollution
  - Tightly coupled code
  - Duplicate code blocks

---

## Phase 2: Architecture Planning & Design (Planning Phase)

### 2.1 Module Division Strategy

#### Core Class Design

```javascript
// Standard tool class structure
export default class [ToolName]Tool {
  constructor() {
    // 1. Language system initialization
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.translations = { /* ... */ };

    // 2. State management initialization
    this.state = {
      processing: false,
      currentFile: null,
      results: null
    };

    // 3. Configuration initialization
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: [],
      // Other configurations...
    };
  }

  async init(container) {
    // 1. DOM structure setup
    this.setupDOM(container);

    // 2. Event binding
    this.bindEvents();

    // 3. Third-party library loading (if needed)
    await this.loadDependencies();

    // 4. Initial state setup
    this.reset();
  }

  destroy() {
    // 1. Event unbinding
    this.unbindEvents();

    // 2. Timer cleanup
    this.clearTimers();

    // 3. Web Worker termination
    this.terminateWorkers();

    // 4. Memory cleanup
    this.cleanup();
  }
}
```

#### Function Module Separation Principles

```javascript
// Decompose complex functionality into independent modules
class ToolCore {
  // Core business logic
}

class ToolUI {
  // UI rendering and updates
}

class ToolValidator {
  // Input validation logic
}

class ToolProcessor {
  // Data processing logic
}
```

### 2.2 Bundle Size Optimization Planning

#### Bundle Strategy Decision Tree

```
Usage frequency assessment:
├─ High frequency (>80% users will use)
│  └─ preload: true → Pack into common bundle
├─ Medium frequency (20-80% users will use)
│  └─ preload: false → Independent chunk, load on-demand
└─ Low frequency (<20% users will use)
   └─ Consider further splitting or external loading
```

#### Dynamic Loading Architecture Design

```javascript
// Similar to Base64 Encoder's codec system
class DynamicFeatureLoader {
  async loadFeature(featureName) {
    // Dynamic import specific feature module
    const module = await import(
      /* webpackChunkName: "feature-[request]" */
      `./features/${featureName}.js`
    );
    return module.default;
  }
}
```

#### External Dependency Processing Decisions

```
Dependency size judgment:
- < 5KB: Direct bundling
- 5-20KB: Evaluate usage frequency
- > 20KB: CDN loading or dynamic import
```

---

## Phase 3: CSS Refactoring & Theme Integration (Styling Phase)

### 3.1 Style Extraction Standard Process

#### Step 1: Identification and Classification

```css
/* Original inline CSS classification */

/* 1. Removable - Duplicate with main architecture */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: system-ui;
}

/* 2. Need integration - Convert to CSS variables */
.container {
  background: #ffffff; /* → var(--bg-primary) */
  color: #333333; /* → var(--text-primary) */
}

/* 3. Keep - Tool-specific styles */
.tool-specific-feature {
  /* Unique visual effects */
}
```

#### Step 2: Theme Variable Mapping

```css
/* styles.css - Standard theme integration */
.tool-container {
  /* Color system */
  --primary: var(--app-primary, #667eea);
  --secondary: var(--app-secondary, #764ba2);
  --bg-primary: var(--app-bg-primary, #ffffff);
  --bg-secondary: var(--app-bg-secondary, #f8f9ff);
  --text-primary: var(--app-text-primary, #333333);
  --text-secondary: var(--app-text-secondary, #666666);

  /* Spacing system */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border radius system */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadow system */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);
}
```

#### Step 3: Responsive Design Standardization

```css
/* Unified breakpoint system */
/* Desktop First Approach */
.tool-container {
  /* Desktop styles (default) */
}

/* Tablet */
@media (max-width: 768px) {
  .tool-container {
    /* Tablet adjustments */
  }
}

/* Mobile */
@media (max-width: 480px) {
  .tool-container {
    /* Mobile optimizations */
  }
}
```

### 3.2 Animation Effect Processing Principles

```css
/* Keep necessary animations, optimize performance */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Use CSS variables to control animations */
.animated-element {
  animation: fadeIn var(--animation-duration, 0.3s) ease;
}

/* Provide reduced motion option */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Phase 4: JavaScript Modularization (Modularization Phase)

### 4.1 Complete Standard Tool Class Implementation Example

```javascript
import { MonacoLoader } from "../../utils/monacoLoader.js";
import "./styles.css";

export default class ExampleTool {
  constructor() {
    // Language system
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.translations = {
      "zh-TW": {
        title: "範例工具",
        process: "處理",
        clear: "清除",
        error: "發生錯誤",
        success: "處理成功",
      },
      en: {
        title: "Example Tool",
        process: "Process",
        clear: "Clear",
        error: "An error occurred",
        success: "Processing successful",
      },
    };

    // State management
    this.state = {
      isProcessing: false,
      currentData: null,
    };

    // DOM references
    this.elements = {};

    // Event handler references (for cleanup)
    this.eventHandlers = new Map();
  }

  async init(container) {
    this.container = container;

    // Setup DOM
    this.setupDOM();

    // Bind events
    this.bindEvents();

    // Load dependencies (if needed)
    await this.loadDependencies();

    // Setup language listener
    this.setupLanguageListener();

    // Initialization complete
    this.onReady();
  }

  setupDOM() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
      <div class="tool-container">
        <h2 class="tool-title">${t.title}</h2>

        <div class="tool-content">
          <!-- Tool-specific content -->
        </div>

        <div class="tool-actions">
          <button class="btn btn-primary" data-action="process">
            ${t.process}
          </button>
          <button class="btn btn-secondary" data-action="clear">
            ${t.clear}
          </button>
        </div>

        <div class="tool-messages">
          <div class="message-error" style="display: none;"></div>
          <div class="message-success" style="display: none;"></div>
        </div>
      </div>
    `;

    // Cache DOM references
    this.cacheElements();
  }

  cacheElements() {
    this.elements = {
      processBtn: this.container.querySelector('[data-action="process"]'),
      clearBtn: this.container.querySelector('[data-action="clear"]'),
      errorMsg: this.container.querySelector(".message-error"),
      successMsg: this.container.querySelector(".message-success"),
    };
  }

  bindEvents() {
    // Use event delegation for clicks
    const clickHandler = (e) => this.handleClick(e);
    this.container.addEventListener("click", clickHandler);
    this.eventHandlers.set("click", clickHandler);

    // Other event bindings...
  }

  handleClick(e) {
    const action = e.target.dataset.action;
    if (!action) return;

    switch (action) {
      case "process":
        this.process();
        break;
      case "clear":
        this.clear();
        break;
    }
  }

  async process() {
    if (this.state.isProcessing) return;

    try {
      this.state.isProcessing = true;
      this.showLoading();

      // Core processing logic
      const result = await this.doProcess();

      // Show result
      this.showSuccess(result);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.state.isProcessing = false;
      this.hideLoading();
    }
  }

  async doProcess() {
    // Actual processing logic
    return "Processing result";
  }

  clear() {
    this.state.currentData = null;
    this.resetUI();
  }

  setupLanguageListener() {
    if (window.appLanguage) {
      window.appLanguage.subscribe(() => {
        this.currentLanguage = window.appLanguage.get();
        this.updateLanguage();
      });
    }
  }

  updateLanguage() {
    const t = this.translations[this.currentLanguage];

    // Update all text content
    if (this.elements.processBtn) {
      this.elements.processBtn.textContent = t.process;
    }
    if (this.elements.clearBtn) {
      this.elements.clearBtn.textContent = t.clear;
    }

    // Update other content that needs translation...
  }

  showError(message) {
    const t = this.translations[this.currentLanguage];
    this.elements.errorMsg.textContent = message || t.error;
    this.elements.errorMsg.style.display = "block";
    this.elements.successMsg.style.display = "none";
  }

  showSuccess(message) {
    const t = this.translations[this.currentLanguage];
    this.elements.successMsg.textContent = message || t.success;
    this.elements.successMsg.style.display = "block";
    this.elements.errorMsg.style.display = "none";
  }

  showLoading() {
    // Show loading state
    this.elements.processBtn.disabled = true;
    this.elements.processBtn.classList.add("loading");
  }

  hideLoading() {
    // Hide loading state
    this.elements.processBtn.disabled = false;
    this.elements.processBtn.classList.remove("loading");
  }

  resetUI() {
    // Reset UI to initial state
    this.elements.errorMsg.style.display = "none";
    this.elements.successMsg.style.display = "none";
  }

  async loadDependencies() {
    // Load any required external dependencies
    // Example: Monaco Editor
    if (this.needsMonaco) {
      const monacoLoader = new MonacoLoader();
      this.monaco = await monacoLoader.load();
    }
  }

  onReady() {
    // Processing after initialization complete
    console.log("Tool ready");
  }

  destroy() {
    // 1. Remove event listeners
    this.eventHandlers.forEach((handler, event) => {
      this.container.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // 2. Clear timers
    if (this.timers) {
      this.timers.forEach((timer) => clearTimeout(timer));
    }

    // 3. Terminate Web Workers
    if (this.worker) {
      this.worker.terminate();
    }

    // 4. Release large objects
    this.state = null;
    this.elements = null;

    // 5. Cleanup Monaco Editor
    if (this.editor) {
      this.editor.dispose();
    }

    // 6. Other cleanup
    this.cleanup();
  }

  cleanup() {
    // Tool-specific cleanup logic
  }
}
```

### 4.2 Web Worker Integration Pattern

#### Main Thread Code

```javascript
class ToolWithWorker {
  async init(container) {
    // Initialize Worker
    this.initWorker();
  }

  initWorker() {
    this.worker = new Worker(
      new URL("./processor.worker.js", import.meta.url),
      { type: "module" }
    );

    this.worker.onmessage = (e) => {
      this.handleWorkerMessage(e.data);
    };

    this.worker.onerror = (error) => {
      this.handleWorkerError(error);
    };
  }

  handleWorkerMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case "progress":
        this.updateProgress(payload);
        break;
      case "result":
        this.handleResult(payload);
        break;
      case "error":
        this.handleError(payload);
        break;
    }
  }

  processInWorker(data) {
    this.worker.postMessage({
      type: "process",
      payload: data,
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
```

#### Worker Code Template

```javascript
// processor.worker.js
self.addEventListener("message", async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case "process":
      await processData(payload);
      break;
  }
});

async function processData(data) {
  try {
    // Report progress
    self.postMessage({
      type: "progress",
      payload: { percent: 0, status: "Starting processing..." },
    });

    // Execute processing
    const result = await doHeavyWork(data);

    // Report result
    self.postMessage({
      type: "result",
      payload: result,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      payload: error.message,
    });
  }
}

async function doHeavyWork(data) {
  // Actual heavy computation logic
  return processedData;
}
```

### 4.3 Monaco Editor Integration Pattern

```javascript
import { MonacoLoader } from "../../utils/monacoLoader.js";

class TextProcessingTool {
  async initMonacoEditor() {
    try {
      const monacoLoader = new MonacoLoader();
      await monacoLoader.load();

      // Input editor
      this.inputEditor = monaco.editor.create(this.inputContainer, {
        value: "",
        language: "json", // or other language
        theme: "vs-light",
        minimap: { enabled: false },
        automaticLayout: true,
        fontSize: 14,
        wordWrap: "on",
      });

      // Output editor (readonly)
      this.outputEditor = monaco.editor.create(this.outputContainer, {
        value: "",
        language: "json",
        theme: "vs-light",
        readOnly: true,
        minimap: { enabled: false },
        automaticLayout: true,
      });
    } catch (error) {
      console.error("Monaco loading failed, fallback to textarea");
      this.fallbackToTextarea();
    }
  }

  fallbackToTextarea() {
    // Provide textarea fallback
    this.inputContainer.innerHTML = `
      <textarea class="fallback-editor" placeholder="Enter content..."></textarea>
    `;
    this.outputContainer.innerHTML = `
      <textarea class="fallback-editor" readonly placeholder="Output result..."></textarea>
    `;
  }

  getValue() {
    if (this.inputEditor) {
      return this.inputEditor.getValue();
    } else {
      return this.inputContainer.querySelector("textarea").value;
    }
  }

  setValue(value, target = "output") {
    if (target === "output" && this.outputEditor) {
      this.outputEditor.setValue(value);
    } else if (target === "output") {
      this.outputContainer.querySelector("textarea").value = value;
    }
  }

  destroy() {
    if (this.inputEditor) {
      this.inputEditor.dispose();
    }
    if (this.outputEditor) {
      this.outputEditor.dispose();
    }
  }
}
```

---

## Phase 5: Internationalization Implementation (Internationalization Phase)

### 5.1 Complete Translation System Implementation

```javascript
class I18nTool {
  constructor() {
    // Get current language
    this.currentLanguage = this.getSystemLanguage();

    // Define translations
    this.translations = {
      "zh-TW": {
        // Basic UI
        title: "工具名稱",
        description: "工具描述",

        // Buttons
        buttons: {
          process: "處理",
          clear: "清除",
          download: "下載",
          copy: "複製",
          upload: "上傳檔案",
        },

        // Messages
        messages: {
          processing: "處理中...",
          success: "處理成功",
          error: "處理失敗",
          copied: "已複製到剪貼簿",
          invalidInput: "無效的輸入格式",
        },

        // Hints
        hints: {
          dragDrop: "拖放檔案到此處或點擊選擇",
          supportedFormats: "支援格式：{formats}",
          maxSize: "最大檔案大小：{size}",
        },

        // Error messages
        errors: {
          fileTooLarge: "檔案太大，最大允許 {maxSize}",
          unsupportedFormat: "不支援的檔案格式",
          networkError: "網路錯誤，請稍後再試",
          processingError: "處理過程中發生錯誤：{error}",
        },
      },

      en: {
        // Basic UI
        title: "Tool Name",
        description: "Tool description",

        // Buttons
        buttons: {
          process: "Process",
          clear: "Clear",
          download: "Download",
          copy: "Copy",
          upload: "Upload File",
        },

        // Messages
        messages: {
          processing: "Processing...",
          success: "Process successful",
          error: "Process failed",
          copied: "Copied to clipboard",
          invalidInput: "Invalid input format",
        },

        // Hints
        hints: {
          dragDrop: "Drag and drop files here or click to select",
          supportedFormats: "Supported formats: {formats}",
          maxSize: "Maximum file size: {size}",
        },

        // Error messages
        errors: {
          fileTooLarge: "File too large, maximum allowed {maxSize}",
          unsupportedFormat: "Unsupported file format",
          networkError: "Network error, please try again later",
          processingError: "Error during processing: {error}",
        },
      },
    };
  }

  getSystemLanguage() {
    // Priority: use global language setting
    if (window.appLanguage) {
      return window.appLanguage.get();
    }

    // Second: use localStorage
    const saved = localStorage.getItem("app-language");
    if (saved) return saved;

    // Last: use browser language
    const browserLang = navigator.language;
    if (browserLang.startsWith("zh")) return "zh-TW";
    return "en";
  }

  t(key, params = {}) {
    // Get translation text
    const keys = key.split(".");
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      value = value?.[k];
    }

    if (!value) {
      console.warn(`Translation missing: ${key}`);
      return key;
    }

    // Replace parameters
    return this.interpolate(value, params);
  }

  interpolate(text, params) {
    return text.replace(/{(\w+)}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  setupLanguageListener() {
    // Listen for language changes
    if (window.appLanguage) {
      window.appLanguage.subscribe(() => {
        this.currentLanguage = window.appLanguage.get();
        this.updateAllTranslations();
      });
    }
  }

  updateAllTranslations() {
    // Update all elements with data-i18n attribute
    this.container.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      const params = element.dataset.i18nParams
        ? JSON.parse(element.dataset.i18nParams)
        : {};

      element.textContent = this.t(key, params);
    });

    // Update input elements with data-i18n-placeholder
    this.container
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach((element) => {
        const key = element.dataset.i18nPlaceholder;
        element.placeholder = this.t(key);
      });

    // Update elements with data-i18n-title
    this.container.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.dataset.i18nTitle;
      element.title = this.t(key);
    });
  }
}
```

### 5.2 Internationalization Markup in HTML

```html
<!-- Use data-i18n attribute to mark elements that need translation -->
<div class="tool-container">
  <h2 data-i18n="title"></h2>
  <p data-i18n="description"></p>

  <button data-i18n="buttons.process"></button>
  <button data-i18n="buttons.clear"></button>

  <!-- Translation with parameters -->
  <p data-i18n="hints.maxSize" data-i18n-params='{"size": "10MB"}'></p>

  <!-- Placeholder translation -->
  <input type="text" data-i18n-placeholder="messages.inputPlaceholder" />

  <!-- Title attribute translation -->
  <button data-i18n="buttons.help" data-i18n-title="hints.helpTooltip"></button>
</div>
```

---

## Phase 6: Webpack Integration & Optimization (Build Integration Phase)

### 6.1 Complete Config.json Specification

```json
{
  "id": "tool-unique-id",
  "name": "工具中文名稱",
  "nameEn": "Tool English Name",
  "description": "詳細的工具描述說明",
  "descriptionEn": "Detailed tool description",
  "category": "圖片處理",
  "categoryEn": "Image Processing",
  "icon": "🔧",
  "version": "1.0.0",
  "author": "Jason Chen",
  "technical": {
    "estimatedSize": "25KB",
    "actualSize": null,
    "preload": false,
    "requiresWorker": false,
    "requiresMonaco": false,
    "supportedFormats": ["png", "jpg", "gif"],
    "maxFileSize": "10MB",
    "browserRequirements": {
      "chrome": "90",
      "firefox": "88",
      "safari": "14",
      "edge": "90"
    }
  },

  "keywords": ["keyword1", "keyword2", "keyword3"],

  "features": ["feature1", "feature2", "feature3"],
  "featuresEn": ["feature1", "feature2", "feature3"],

  "dependencies": {
    "internal": ["monacoLoader"],
    "external": {
      "cdnLibraries": [],
      "npmPackages": []
    }
  },

  "performance": {
    "loadTime": "<500ms",
    "memoryUsage": "<50MB",
    "cpuIntensive": false
  },

  "analytics": {
    "trackingEnabled": true,
    "events": ["tool-loaded", "process-started", "process-completed"]
  }
}
```

### 6.2 Webpack Configuration Integration

#### Webpack Configuration for New Tools

```javascript
// webpack.config.js modifications

// 1. Add entry point
entry: {
  // Existing entries...
  'tool-new-tool': './src/tools/new-tool/tool.js'
},

// 2. Update optimization configuration
optimization: {
  splitChunks: {
    cacheGroups: {
      // Bundle common tools into common
      common: {
        test: /[\\/]src[\\/]tools[\\/](base64-decoder|new-tool)[\\/]/,
        name: 'common',
        chunks: 'all',
        priority: 10
      },
      // Keep independent tools separate
      'tool-new-tool': {
        test: /[\\/]src[\\/]tools[\\/]new-tool[\\/]/,
        name: 'tool-new-tool',
        chunks: 'async',
        priority: 5
      }
    }
  }
}

// 3. Add size limit check
plugins: [
  new BundleSizePlugin({
    limits: {
      'tool-new-tool': 30 * 1024 // 30KB limit
    }
  })
]
```

#### Dynamic Import Configuration

```javascript
// src/core/loader.js update
const toolPaths = {
  // Existing tools...
  "new-tool": () =>
    import(
      /* webpackChunkName: "tool-new-tool" */
      /* webpackPreload: false */
      "../tools/new-tool/tool.js"
    ),
};
```

### 6.3 Bundle Size Optimization Techniques

#### Tree Shaking Optimization

```javascript
// Use named exports to promote tree shaking
export { specificFunction } from "./utils";
// Avoid
export * from "./utils";

// Use production mode flags
if (process.env.NODE_ENV === "production") {
  // Production environment code
}

// Mark pure functions
/*#__PURE__*/
const pureFunction = () => {};
```

#### Code Splitting Strategy

```javascript
// Conditional loading of large dependencies
class Tool {
  async loadHeavyLibrary() {
    if (!this.heavyLib) {
      const { HeavyLibrary } = await import(
        /* webpackChunkName: "heavy-lib" */
        "./heavyLibrary"
      );
      this.heavyLib = new HeavyLibrary();
    }
    return this.heavyLib;
  }
}
```

#### Compression Optimization

```javascript
// Terser configuration
optimization: {
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log"],
        },
        mangle: {
          safari10: true,
        },
        output: {
          comments: false,
        },
      },
    }),
  ];
}
```

---

## Phase 6.5: Sidebar Navigation Integration (Critical for Visibility)

### 6.5.1 **REQUIRED**: Tool Registration in Sidebar

**❌ COMMON ISSUE**: Tools build successfully but don't appear in sidebar navigation.

The sidebar component maintains a hardcoded list of tools. **Every new tool MUST be manually added** to the sidebar configuration.

#### Step 1: Add Translation Keys

**File**: `src/components/sidebar/sidebar.js`

**Location**: Lines ~11-46 in translations object

```javascript
// Traditional Chinese translations (zh-TW section)
'zh-TW': {
  // ... existing translations ...
  base64EncoderName: '圖片轉 Base64 工具',
  pngToIcoName: 'PNG 製作 ICO 圖示',
  // ➕ ADD YOUR TOOL HERE
  yourToolName: '你的工具中文名稱',
  jsonFormatterName: 'JSON 格式化工具',
  // ... rest of translations ...
},

// English translations (en section)
en: {
  // ... existing translations ...
  base64EncoderName: 'Image to Base64 Tool',
  pngToIcoName: 'PNG to ICO Creator',
  // ➕ ADD YOUR TOOL HERE
  yourToolName: 'Your Tool English Name',
  jsonFormatterName: 'JSON Formatter',
  // ... rest of translations ...
}
```

#### Step 2: Register Tool in loadToolsConfig()

**File**: `src/components/sidebar/sidebar.js`

**Location**: Lines ~84-113 in `loadToolsConfig()` method

```javascript
async loadToolsConfig() {
  const t = this.translations[this.currentLanguage];
  this.tools = [
    // ... existing tools ...
    {
      id: 'png-to-ico',
      name: t.pngToIcoName,
      translationKey: 'pngToIcoName',
      icon: createIcon('palette', 20, 'tool-icon'),
      category: t.categoryImageProcessing,
    },
    // ➕ ADD YOUR TOOL HERE
    {
      id: 'your-tool-id',                    // Must match tool directory name
      name: t.yourToolName,                  // Reference to translation key
      translationKey: 'yourToolName',        // Translation key for language switching
      icon: createIcon('iconName', 20, 'tool-icon'),  // Choose appropriate icon
      category: t.categoryImageProcessing,   // Choose appropriate category
    },
    {
      id: 'json-formatter',
      // ... rest of tools ...
    }
  ];
}
```

#### Step 3: Icon Selection Guidelines

Choose an appropriate Lucide icon for your tool:

| Tool Type            | Recommended Icons                           | Examples                     |
| -------------------- | ------------------------------------------- | ---------------------------- |
| **Image Processing** | `image`, `camera`, `palette`, `layers`      | Base64 tools, PNG to ICO     |
| **File Analysis**    | `search`, `file-search`, `scan-line`, `zap` | ICO Analyzer, File Inspector |
| **Text Processing**  | `file-text`, `type`, `edit`, `code`         | JSON Formatter, XML Editor   |
| **Conversion Tools** | `shuffle`, `repeat`, `arrow-right-left`     | Format converters            |
| **Utilities**        | `tool`, `settings`, `wrench`, `cog`         | General utilities            |

**Icon Usage Pattern**:

```javascript
icon: createIcon("iconName", 20, "tool-icon");
```

#### Step 4: Category Assignment

Assign your tool to the appropriate category:

| Category (Chinese) | Category (English) | Variable Reference          |
| ------------------ | ------------------ | --------------------------- |
| `圖片處理`         | `Image Processing` | `t.categoryImageProcessing` |
| `Formatter`        | `Text Processing`  | `t.categoryTextProcessing`  |

**Adding New Categories** (if needed):

1. Add category to both language sections in translations
2. Add category translation key mapping in `getCategoryTranslationKey()` method

#### Step 5: Router Configuration (CRITICAL for Navigation)

**❌ COMMON ISSUE**: Tool appears in sidebar but clicking redirects to default tool.
The core router maintains a whitelist of valid tools. **Every new tool MUST be added** to the router's validTools array.

**File**: `src/core/router.js`
**Location**: Line ~6 in constructor

```javascript
constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.defaultRoute = 'home';
    this.validTools = [
        'base64-decoder',
        'base64-encoder',
        'png-to-ico',
        'json-formatter',
        // ➕ ADD YOUR TOOL HERE
        'your-tool-id'              // Must match tool directory name exactly
    ];
    this.init();
}
```

**CRITICAL**: The tool ID must match:

- Sidebar registration: `id: 'your-tool-id'`
- Router validation: `'your-tool-id'`
- Directory name: `src/tools/your-tool-id/`
- URL route: `#tool/your-tool-id`

**Security Purpose**: This whitelist prevents loading of non-existent or malicious tools by validating tool names before routing.

### 6.5.2 Integration Verification Checklist

After adding your tool to the sidebar:

- [ ] **Build Success**: Tool compiles without errors
- [ ] **Sidebar Appearance**: Tool appears in appropriate category
- [ ] **Translation Keys**: Both Chinese and English names display correctly
- [ ] **Language Switching**: Tool name updates when toggling language
- [ ] **Navigation**: Clicking tool loads correctly
- [ ] **Icon Display**: Tool icon renders properly
- [ ] **Category Grouping**: Tool appears in correct category section

### 6.5.3 Common Issues and Solutions

#### Issue: Tool not appearing in sidebar

```javascript
// ❌ Problem: Forgot to add translation keys
// ✅ Solution: Add keys to BOTH language sections
```

#### Issue: Tool shows undefined name

```javascript
// ❌ Problem: Translation key mismatch
{
  name: t.myToolName,           // Translation key doesn't exist
  translationKey: 'myToolName', // Key not defined in translations
}

// ✅ Solution: Ensure key exists in translations
'zh-TW': {
  myToolName: '我的工具',
},
en: {
  myToolName: 'My Tool',
}
```

#### Issue: Tool navigation fails

**Most Common Cause**: Tool not added to router's validTools array

```javascript
// ❌ Problem: Missing from router configuration
// User clicks tool → redirects to default tool (base64-decoder)
// ✅ Solution: Add tool to router.js validTools array
this.validTools = [
  "base64-decoder",
  "base64-encoder",
  "png-to-ico",
  "json-formatter",
  "your-tool-id", // ➕ ADD YOUR TOOL HERE
];
```

**Secondary Cause**: ID mismatch with directory

```javascript
// ❌ Problem: ID mismatch with directory
{
  id: 'my-tool',               // Sidebar registration
}
// But directory is: src/tools/myTool/

// ✅ Solution: Ensure ID matches directory name exactly
{
  id: 'myTool',                // Must match src/tools/myTool/
}
```

#### Issue: Icon not displaying

```javascript
// ❌ Problem: Invalid icon name
icon: createIcon('invalid-icon', 20, 'tool-icon'),

// ✅ Solution: Use valid Lucide icon names
icon: createIcon('search', 20, 'tool-icon'),
```

### 6.5.4 Testing Sidebar Integration

```bash
# 1. Start development server
npm run dev

# 2. Check browser console for errors
# 3. Verify tool appears in sidebar
# 4. Test navigation by clicking tool
# 5. Test language switching (🌐 button)
# 6. Verify tool loads correctly
```

### 6.5.5 **Why This Step is Critical**

**The sidebar integration is MANDATORY for tool visibility**:

1. **No automatic discovery**: Tools are not automatically detected
2. **Hardcoded configuration**: Sidebar uses a static tool list
3. **User navigation**: Users find tools through sidebar navigation
4. **Professional appearance**: Missing tools appear as incomplete integration
5. **Language support**: Translation keys enable bilingual interface

**Remember**: A perfectly built tool that's missing from the sidebar is effectively invisible to users!

---

## Phase 7: Testing & Performance Validation (Testing & Performance Phase)

### 7.1 Function Testing Checklist

#### Basic Function Testing

- [ ] **Tool Loading Test**

  - [ ] Initial loading works correctly
  - [ ] Repeated loading doesn't re-initialize
  - [ ] Correct unloading when switching tools

- [ ] **Core Function Testing**

  - [ ] Main functionality works correctly
  - [ ] Boundary conditions handled properly
  - [ ] Error conditions handled gracefully

- [ ] **UI Interaction Testing**

  - [ ] All buttons respond correctly
  - [ ] Form validation works properly
  - [ ] Drag and drop functionality works (if applicable)

- [ ] **Internationalization Testing**

  - [ ] Initial language displays correctly
  - [ ] Language switching updates immediately
  - [ ] All text has translations

- [ ] **Responsive Testing**
  - [ ] Desktop (>768px) displays correctly
  - [ ] Tablet (768px) displays correctly
  - [ ] Mobile (<480px) displays correctly

#### Advanced Function Testing

- [ ] **File Processing Testing** (if applicable)

  - [ ] All supported formats can be processed
  - [ ] File size limits are effective
  - [ ] Wrong formats are gracefully rejected

- [ ] **Web Worker Testing** (if applicable)

  - [ ] Worker starts correctly
  - [ ] Message passing works correctly
  - [ ] Worker terminates correctly

- [ ] **Monaco Editor Testing** (if applicable)
  - [ ] Editor loads correctly
  - [ ] Fallback mechanism works
  - [ ] Large text processing works correctly

### 7.2 Performance Testing Metrics

#### Load Performance Testing

```javascript
// Test tool loading time
async function measureLoadTime() {
  const start = performance.now();

  const tool = await loader.loadTool("new-tool");
  await tool.init(container);

  const loadTime = performance.now() - start;
  console.log(`Tool load time: ${loadTime}ms`);

  // Verify: should be < 500ms
  assert(loadTime < 500, "Load time exceeds 500ms");
}
```

#### Memory Usage Testing

```javascript
// Monitor memory usage
function measureMemory() {
  if (performance.memory) {
    const before = performance.memory.usedJSHeapSize;

    // Execute operation
    processLargeData();

    const after = performance.memory.usedJSHeapSize;
    const used = (after - before) / 1024 / 1024;

    console.log(`Memory used: ${used.toFixed(2)} MB`);

    // Verify: should be < 50MB
    assert(used < 50, "Memory usage exceeds 50MB");
  }
}
```

#### Bundle Size Verification

```bash
# Run bundle analysis
npm run build
npm run analyze

# Check output
echo "Check if tool-new-tool.js size is < 30KB"
```

### 7.3 Browser Compatibility Testing

#### Testing Matrix

| Browser | Minimum Version | Test Status |
| ------- | --------------- | ----------- |
| Chrome  | 90+             | ⏳ Pending  |
| Firefox | 88+             | ⏳ Pending  |
| Safari  | 14+             | ⏳ Pending  |
| Edge    | 90+             | ⏳ Pending  |

#### Feature Compatibility Check

```javascript
// Feature detection
function checkCompatibility() {
  const features = {
    "Web Workers": typeof Worker !== "undefined",
    Canvas: !!document.createElement("canvas").getContext,
    "File API": !!(window.File && window.FileReader),
    "ES6 Modules": "noModule" in HTMLScriptElement.prototype,
    "Async/Await": (async () => {})() instanceof Promise,
    "CSS Grid": CSS.supports("display", "grid"),
    "Custom Properties": CSS.supports("--test", "0"),
  };

  const missing = Object.entries(features)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);

  if (missing.length > 0) {
    console.warn("Missing features:", missing);
  }

  return missing.length === 0;
}
```

---

## Phase 8: Documentation & Deployment (Documentation & Deployment Phase)

### 8.1 Claude.md Documentation Template

```markdown
# [Tool Name] Tool

## Overview

[Brief description and main purpose of the tool]

## Tool Purpose and Functionality

- **Primary Function**: [Main function]
- **Core Features**:
  - [Feature 1]
  - [Feature 2]
  - [Feature 3]

## Key Files and Responsibilities

### `tool.js` (Main Tool Implementation)

- **Bundle Size**: [Actual size]KB (production build, [date])
- **Primary Class**: `[ClassName]`
- **Key Methods**:
  - `init(container)`: [Description]
  - `[method2]()`: [Description]
  - `destroy()`: [Description]

### `config.json` (Tool Metadata)

- **Tool ID**: `[tool-id]`
- **Category**: [Category]
- **Preload**: [true/false]
- **Version**: [Version number]

### `styles.css` (Visual Styling)

- **Size**: ~[Line count] lines of CSS
- **Features**: [Style features]

## Technical Implementation Details

### [Core Technical Point 1]

[Detailed description]

### [Core Technical Point 2]

[Detailed description]

## Bundle Size Considerations

- **Actual Bundle Size**: [Size]KB
- **Optimization Strategies**: [Optimization strategies]

## Dependencies and Requirements

- **Browser APIs**: [Used APIs]
- **External Libraries**: [External dependencies]
- **Modern Browser Support**: [Browser requirements]

## Performance Considerations

[Performance-related considerations]

## Error Handling

[Error handling strategies]

## Security Considerations

[Security considerations]

## Current Status ([Date])

- **Bundle Size**: [Size]KB
- **Integration**: ✅ COMPLETED / ⏳ IN PROGRESS
- **Production Ready**: Yes/No

## Recent Updates

### [Date]: [Update Title]

- [Update content 1]
- [Update content 2]

## Future Enhancements

- [Future improvement 1]
- [Future improvement 2]
```

### 8.2 Deployment Checklist

#### Development Environment Testing

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Test tool loading
# Visit: http://localhost:8080/#/new-tool

# 4. Test all functions
# - Core functionality
# - Error handling
# - Language switching
```

#### Production Environment Build

```bash
# 1. Build production version
npm run build

# 2. Check bundle size
npm run analyze

# 3. Test production version
npm run serve:prod

# 4. Verify compression effect
# Check file sizes in docs/ directory
```

#### Git Commit and Deployment

```bash
# 1. Add new files
git add src/tools/new-tool/

# 2. Commit changes
git commit -m "feat: Add new tool - [Tool Name]

- Implement core functionality
- Add multi-language support
- Optimize bundle size to [X]KB
- Add comprehensive documentation"

# 3. Push to GitHub
git push origin main

# 4. Verify GitHub Pages deployment
# Visit: https://[username].github.io/[repo]/#/new-tool
```

### 8.3 Monitoring & Maintenance

#### Performance Monitoring Setup

```javascript
// Add to tool initialization
class Tool {
  async init(container) {
    // Record load time
    this.logPerformance("tool-init-start");

    // Initialization logic...

    this.logPerformance("tool-init-complete");
  }

  logPerformance(marker) {
    if (window.performance && window.performance.mark) {
      performance.mark(marker);

      if (marker.includes("complete")) {
        const startMarker = marker.replace("complete", "start");
        performance.measure(
          `${this.constructor.name}-init`,
          startMarker,
          marker
        );

        const measure = performance.getEntriesByName(
          `${this.constructor.name}-init`
        )[0];

        console.log(`Init time: ${measure.duration.toFixed(2)}ms`);

        // Send to analytics service (if configured)
        this.sendAnalytics("tool-init-time", measure.duration);
      }
    }
  }
}
```

#### Error Tracking Setup

```javascript
// Global error handling
window.addEventListener("error", (event) => {
  if (event.filename && event.filename.includes("/tools/")) {
    // Tool-related error
    console.error("Tool error:", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error,
    });

    // Send error report
    sendErrorReport({
      tool: getCurrentTool(),
      error: event.error,
      context: getErrorContext(),
    });
  }
});
```

---

## Real-World Case Study

### Success Case: PNG to ICO Converter

#### Before Conversion

- **File**: Single index.html (655 lines)
- **Structure**: Inline CSS + JavaScript
- **Size**: ~28KB (uncompressed)

#### After Conversion

- **File Structure**:
  ```
  pngToIco/
  ├── tool.js (main program)
  ├── styles.css (styles)
  ├── config.json (configuration)
  └── claude.md (documentation)
  ```
- **Bundle Size**: 15.43KB (compressed)
- **Optimization Result**: 45% size reduction

#### Key Optimization Points

1. **CSS Extraction**: 560 lines → 200 lines (removed duplicate styles)
2. **JS Modularization**: Class-based design, clear method separation
3. **Lazy Loading**: Changed from preload to on-demand
4. **Code Reuse**: Shared file download, error handling, etc.

### Potential Case: JSON Formatter

#### Expected Architecture

```javascript
export default class JSONFormatterTool {
  // Monaco Editor for input/output
  // Pure function implementation for formatting logic
  // Independent validation module
  // Multiple output format support
}
```

#### Expected Optimization

- Use Monaco Editor instead of custom editor
- Shared validation logic and error handling
- Bundle size target: < 20KB

---

## Common Issues & Solutions

### Q1: Tool Loading Failure

**Possible Causes**:

- Webpack configuration not updated
- Incorrect file paths
- Malformed config.json

**Solutions**:

```bash
# Check configuration
npm run validate-config

# Rebuild
npm run clean && npm run build
```

### Q2: Bundle Size Exceeds Limit

**Optimization Strategies**:

1. Check for unused dependencies
2. Consider dynamic loading for large features
3. Use CDN for external libraries
4. Check for duplicate code

### Q3: Monaco Editor Loading Failure

**Solution**:

```javascript
// Ensure fallback mechanism
if (!window.monaco) {
  // Use textarea as backup
  this.useFallbackEditor();
}
```

### Q4: Web Worker Communication Failure

**Check Points**:

- Worker file path is correct
- Message format is consistent
- Error handling is complete

### Q5: Internationalization Display Issues

**Check Points**:

- Translation keys are complete
- Language change listener is registered
- DOM update logic is correct

---

## Conclusion

This guide provides a complete tool integration process, with detailed guidance for every phase from analysis, design, implementation to deployment. Following this process ensures:

1. **Consistency**: All tools follow the same architecture and standards
2. **Performance**: Bundle size and load times are within control
3. **Maintainability**: Clear code structure and complete documentation
4. **Scalability**: Easy to add new features and tools

Key Success Factors:

- ✅ Strict Bundle Size Control
- ✅ Standardized API Contracts
- ✅ Complete Error Handling
- ✅ Excellent User Experience
- ✅ Detailed Technical Documentation

Through this standardized process, any single-page HTML tool can be successfully integrated into the modular architecture while maintaining high performance and consistent user experience.

---

## MANDATORY: Language Update Implementation Pattern

### Critical Requirements

**EVERY tool must implement this pattern. Tools that call `render()` during language changes will be rejected.**

### 1. Required Method Structure

```javascript
export default class YourTool {
  constructor() {
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.translations = {
      "zh-TW": {
        /* Traditional Chinese translations */
      },
      en: {
        /* English translations */
      },
    };
  }

  async init(container) {
    this.container = container;
    this.renderInitial();
    this.attachEvents();

    // MANDATORY: Language change listener
    window.addEventListener("languageChanged", (e) => {
      this.currentLanguage = e.detail.language;
      this.updateLanguage(); // NEVER call render()
    });
  }

  renderInitial() {
    // Create DOM structure with data-i18n attributes
    this.container.innerHTML = `
      <div class="tool">
        <h1 data-i18n="title"></h1>
        <button data-i18n="button">Button</button>
        <input data-i18n-placeholder="inputPlaceholder">
      </div>
    `;
    this.updateLanguage();
  }

  render() {
    // Only calls renderInitial for first-time setup
    this.renderInitial();
  }

  updateLanguage() {
    const t = this.translations[this.currentLanguage];

    // Update text content
    this.container.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (t[key]) element.textContent = t[key];
    });

    // Update placeholder attributes
    this.container
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach((element) => {
        const key = element.getAttribute("data-i18n-placeholder");
        if (t[key]) element.placeholder = t[key];
      });

    // Update title attributes
    this.container.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.getAttribute("data-i18n-title");
      if (t[key]) element.title = t[key];
    });
  }
}
```

### 2. Data Attribute Conventions

| Attribute                     | Purpose             | Usage                                          |
| ----------------------------- | ------------------- | ---------------------------------------------- |
| `data-i18n="key"`             | Text content        | `<span data-i18n="title"></span>`              |
| `data-i18n-placeholder="key"` | Placeholder text    | `<input data-i18n-placeholder="inputHint">`    |
| `data-i18n-title="key"`       | Title attribute     | `<button data-i18n-title="buttonTooltip">`     |
| `data-i18n-aria-label="key"`  | ARIA label          | `<div data-i18n-aria-label="accessibleLabel">` |
| `data-transform="type"`       | Text transformation | `data-transform="firstLine"`                   |
| `data-suffix="text"`          | Add suffix          | `data-suffix=":"`                              |

### 3. State Preservation Requirements

**Tools with complex state MUST preserve:**

- **Monaco Editor instances**: Never recreate editors
- **Web Workers**: Maintain worker connections and state
- **Form data**: Preserve user input
- **File uploads**: Keep uploaded files in memory
- **Processing results**: Maintain computed data
- **UI state**: Expanded/collapsed sections, active tabs
- **Event listeners**: Avoid re-binding listeners

### 4. Testing Checklist

Before submitting, verify:

- [ ] Language toggle preserves all tool state
- [ ] No DOM recreation during language changes
- [ ] Monaco Editors maintain content and configuration
- [ ] Web Workers continue running without interruption
- [ ] Form inputs retain their values
- [ ] File upload state is preserved
- [ ] Processing results remain visible
- [ ] Event listeners don't duplicate
- [ ] Performance is smooth (no lag during switch)
- [ ] Memory usage doesn't increase over time

### 5. Common Anti-Patterns (FORBIDDEN)

```javascript
// ❌ WRONG - Destroys state
window.addEventListener("languageChanged", (e) => {
  this.currentLanguage = e.detail.language;
  this.render(); // DESTROYS ALL STATE
  this.attachEvents(); // DUPLICATES LISTENERS
});

// ❌ WRONG - Recreates DOM
updateLanguage() {
  this.container.innerHTML = `<h1>${t.title}</h1>`; // REBUILDS DOM
}

// ❌ WRONG - Loses editor content
languageChanged() {
  this.initMonacoEditor(); // RECREATES EDITOR
}
```

This pattern is now **MANDATORY** for all tools and will be enforced during code review.
