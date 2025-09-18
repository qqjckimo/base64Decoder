import './styles.css';

export default class IcoAnalyzerTool {
  constructor() {
    // Language system
    this.currentLanguage = window.appLanguage?.get() || 'zh-TW';
    this.isDestroyed = false;
    this.translations = {
      'zh-TW': {
        title: '🔍 ICO 檔案分析工具',
        uploadText: '點擊或拖放 ICO 檔案到此處',
        uploadHint: '分析 ICO 檔案內部格式 (PNG 或 BMP)',
        fileName: '檔案名稱：',
        fileSize: '檔案大小：',
        imageCount: '圖片數量：',
        formatSummary: '檔案格式：',
        imageDetails: '圖片詳細資訊',
        hexViewTitle: '檢視 HEX 資料 (前 256 位元組)',
        resetButton: '分析其他檔案',
        processing: '分析中...',
        formatPng: '純 PNG 格式 (現代 ICO)',
        formatBmp: '純 BMP 格式 (傳統 ICO)',
        formatMixed: '混合格式 ({pngCount} PNG, {bmpCount} BMP)',
        errorInvalidFile: '不是有效的 ICO 檔案',
        errorAnalysisFailed: '無法分析此檔案，請確認這是有效的 ICO 檔案',
        errorFileTooLarge: '檔案太大，最大允許 10MB',
        errorUnsupportedFormat: '不支援的檔案格式，請選擇 ICO 檔案',
        bytes: '位元組',
        size: '尺寸',
        bits: '位元',
        format: '格式',
      },
      en: {
        title: '🔍 ICO File Analyzer',
        uploadText: 'Click or drag and drop ICO file here',
        uploadHint: 'Analyze ICO file internal format (PNG or BMP)',
        fileName: 'File Name:',
        fileSize: 'File Size:',
        imageCount: 'Image Count:',
        formatSummary: 'File Format:',
        imageDetails: 'Image Details',
        hexViewTitle: 'View HEX Data (First 256 bytes)',
        resetButton: 'Analyze Another File',
        processing: 'Analyzing...',
        formatPng: 'Pure PNG format (Modern ICO)',
        formatBmp: 'Pure BMP format (Traditional ICO)',
        formatMixed: 'Mixed format ({pngCount} PNG, {bmpCount} BMP)',
        errorInvalidFile: 'Not a valid ICO file',
        errorAnalysisFailed:
          "Unable to analyze this file, please confirm it's a valid ICO file",
        errorFileTooLarge: 'File too large, maximum allowed 10MB',
        errorUnsupportedFormat:
          'Unsupported file format, please select an ICO file',
        bytes: 'Bytes',
        size: 'Size',
        bits: 'Bits',
        format: 'Format',
      },
    };

    // ICO analyzer core
    this.icoAnalyzer = new ICOAnalyzer();

    // State management - using individual properties like other stable tools
    this.isProcessing = false;
    this.currentFile = null;
    this.analysisResults = null;

    // DOM references
    this.elements = {};

    // Event handler references (for cleanup)
    this.eventHandlers = new Map();
  }

  async init(container) {
    console.log('ICO Analyzer: init() called, isDestroyed before:', this.isDestroyed);
    this.container = container;

    // Reset destruction flag - tool is being re-initialized
    this.isDestroyed = false;
    console.log('ICO Analyzer: isDestroyed reset to false');

    // Recreate ICO analyzer if it was destroyed
    if (!this.icoAnalyzer) {
      console.log('ICO Analyzer: Recreating ICO analyzer instance');
      this.icoAnalyzer = new ICOAnalyzer();
    }

    // Clean up any existing event handlers if this is a re-initialization
    if (this.eventHandlers.size > 0) {
      console.log('ICO Analyzer: Cleaning up existing event handlers');
      this.cleanupEventHandlers();
    }

    // Setup DOM
    this.renderInitial();

    // Cache DOM references
    this.cacheElements();

    // Bind events
    this.bindEvents();

    // Setup language listener
    this.setupLanguageListener();

    // Reset tool state for fresh initialization
    this.resetToolState();

    // Mark as ready
    this.onReady();
  }

  renderInitial() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
      <div class="ico-analyzer-tool">
        <div class="container">
          <h1 data-i18n="title">${t.title}</h1>

          <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📁</div>
            <div class="upload-text" data-i18n="uploadText">${t.uploadText}</div>
            <div class="upload-hint" data-i18n="uploadHint">${t.uploadHint}</div>
            <input type="file" id="fileInput" accept=".ico,image/x-icon" />
          </div>

          <div class="results-section" id="resultsSection">
            <div class="file-info">
              <div class="info-row">
                <span class="info-label" data-i18n="fileName">${t.fileName}</span>
                <span class="info-value" id="fileName"></span>
              </div>
              <div class="info-row">
                <span class="info-label" data-i18n="fileSize">${t.fileSize}</span>
                <span class="info-value" id="fileSize"></span>
              </div>
              <div class="info-row">
                <span class="info-label" data-i18n="imageCount">${t.imageCount}</span>
                <span class="info-value" id="imageCount"></span>
              </div>
              <div class="info-row">
                <span class="info-label" data-i18n="formatSummary">${t.formatSummary}</span>
                <span class="info-value" id="formatSummary"></span>
              </div>
            </div>

            <div class="images-container">
              <h2 class="section-title">
                <span data-i18n="imageDetails">${t.imageDetails}</span>
              </h2>
              <div class="image-grid" id="imageGrid"></div>
            </div>

            <details class="hex-details">
              <summary data-i18n="hexViewTitle">${t.hexViewTitle}</summary>
              <div class="hex-view" id="hexView"></div>
            </details>

            <button class="reset-btn" id="resetBtn" data-i18n="resetButton">
              ${t.resetButton}
            </button>
          </div>

          <div class="error-message" id="errorMessage"></div>
        </div>
      </div>
    `;

    this.updateLanguage();
  }

  cacheElements() {
    // Clear existing elements cache
    this.elements = {};

    // Cache DOM elements with validation
    const elementIds = [
      'uploadArea', 'fileInput', 'resultsSection', 'fileName',
      'fileSize', 'imageCount', 'formatSummary', 'imageGrid',
      'hexView', 'resetBtn', 'errorMessage'
    ];

    elementIds.forEach(id => {
      const element = this.container.querySelector(`#${id}`);
      if (element) {
        this.elements[id] = element;
      } else {
        console.warn(`ICO Analyzer: Element with ID '${id}' not found`);
      }
    });

    // Validate critical elements
    const criticalElements = ['uploadArea', 'fileInput'];
    const missingElements = criticalElements.filter(id => !this.elements[id]);

    if (missingElements.length > 0) {
      console.error(`ICO Analyzer: Missing critical elements: ${missingElements.join(', ')}`);
      throw new Error(`Missing critical DOM elements: ${missingElements.join(', ')}`);
    }
  }

  bindEvents() {
    // Validate elements before binding
    if (!this.elements.uploadArea || !this.elements.fileInput) {
      console.error('ICO Analyzer: Cannot bind events - missing critical elements');
      return;
    }

    // Upload area click
    const uploadClickHandler = () => {
      if (!this.isProcessing && this.elements.fileInput) {
        console.log('ICO Analyzer: Upload area clicked, triggering file input');
        this.elements.fileInput.click();
      }
    };
    this.elements.uploadArea.addEventListener('click', uploadClickHandler);
    this.eventHandlers.set('uploadClick', uploadClickHandler);

    // File input change
    const fileChangeHandler = (e) => {
      console.log('ICO Analyzer: File input change event triggered');
      const file = e.target.files[0];
      if (file) {
        console.log('ICO Analyzer: File selected:', file.name);
        this.handleFile(file);
      }
    };
    this.elements.fileInput.addEventListener('change', fileChangeHandler);
    this.eventHandlers.set('fileChange', fileChangeHandler);

    // Drag and drop events
    const dragOverHandler = (e) => {
      e.preventDefault();
      if (!this.isProcessing) {
        this.elements.uploadArea.classList.add('dragover');
      }
    };
    this.elements.uploadArea.addEventListener('dragover', dragOverHandler);
    this.eventHandlers.set('dragOver', dragOverHandler);

    const dragLeaveHandler = () => {
      this.elements.uploadArea.classList.remove('dragover');
    };
    this.elements.uploadArea.addEventListener('dragleave', dragLeaveHandler);
    this.eventHandlers.set('dragLeave', dragLeaveHandler);

    const dropHandler = (e) => {
      e.preventDefault();
      this.elements.uploadArea.classList.remove('dragover');

      if (!this.isProcessing) {
        const file = e.dataTransfer.files[0];
        if (file) {
          console.log('ICO Analyzer: File dropped:', file.name);
          this.handleFile(file);
        }
      }
    };
    this.elements.uploadArea.addEventListener('drop', dropHandler);
    this.eventHandlers.set('drop', dropHandler);

    // Reset button (if exists)
    if (this.elements.resetBtn) {
      const resetHandler = () => {
        this.resetTool();
      };
      this.elements.resetBtn.addEventListener('click', resetHandler);
      this.eventHandlers.set('reset', resetHandler);
    }

    console.log('ICO Analyzer: All events bound successfully');
  }

  setupLanguageListener() {
    if (window.appLanguage) {
      const languageHandler = (e) => {
        this.currentLanguage = e.detail.language;
        this.updateLanguage();
      };
      window.addEventListener('languageChanged', languageHandler);
      this.eventHandlers.set('languageChange', languageHandler);
    }
  }

  updateLanguage() {
    // Prevent operations if tool has been destroyed
    if (this.isDestroyed || !this.container) {
      return;
    }

    const t = this.translations[this.currentLanguage];

    // Update all elements with data-i18n attribute
    this.container.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (t[key]) {
        element.textContent = t[key];
      }
    });

    // Update format summary if analysis results exist
    if (this.analysisResults) {
      this.updateFormatSummary(this.analysisResults);
    }
  }

  async handleFile(file) {
    console.log('ICO Analyzer: handleFile called with file:', file.name);

    if (this.isDestroyed) {
      console.log('ICO Analyzer: Tool is destroyed, aborting');
      return;
    }

    if (this.isProcessing) {
      console.log('ICO Analyzer: Already processing, aborting');
      return;
    }

    try {
      console.log('ICO Analyzer: Starting file validation');
      // File validation
      this.validateFile(file);
      console.log('ICO Analyzer: File validation passed');

      this.isProcessing = true;
      this.currentFile = file;

      console.log('ICO Analyzer: Hiding error and showing processing');
      this.hideError();
      this.showProcessing();

      console.log('ICO Analyzer: Reading file as ArrayBuffer');
      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      console.log('ICO Analyzer: File read successfully, size:', arrayBuffer.byteLength);

      console.log('ICO Analyzer: Starting ICO analysis');
      // Analyze ICO file
      const results = await this.icoAnalyzer.analyzeICO(arrayBuffer);
      this.analysisResults = results;
      console.log('ICO Analyzer: Analysis completed, found', results.imageCount, 'images');

      console.log('ICO Analyzer: Displaying results');
      // Display results
      this.displayResults(file, results, arrayBuffer);

      console.log('ICO Analyzer: Hiding processing and showing results');
      this.hideProcessing();
      this.showResults();
      console.log('ICO Analyzer: File processing completed successfully');
    } catch (error) {
      console.error('ICO Analyzer: Analysis error:', error);
      this.showError(error.message);
      this.hideProcessing();
    } finally {
      this.isProcessing = false;
    }
  }

  validateFile(file) {
    const t = this.translations[this.currentLanguage];

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(t.errorFileTooLarge);
    }

    // Check file type
    if (
      !file.name.toLowerCase().endsWith('.ico') &&
      file.type !== 'image/x-icon'
    ) {
      throw new Error(t.errorUnsupportedFormat);
    }
  }

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  displayResults(file, results, arrayBuffer) {
    const t = this.translations[this.currentLanguage];

    // Display basic information
    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatFileSize(file.size);
    this.elements.imageCount.textContent = results.imageCount;

    // Update format summary
    this.updateFormatSummary(results);

    // Display each image
    this.displayImages(results.images);

    // Display HEX view
    this.elements.hexView.innerHTML =
      this.icoAnalyzer.formatHexView(arrayBuffer);
  }

  updateFormatSummary(results) {
    const t = this.translations[this.currentLanguage];

    // Count formats
    const pngCount = results.images.filter(
      (img) => img.format === 'PNG'
    ).length;
    const bmpCount = results.images.filter(
      (img) => img.format === 'BMP'
    ).length;

    let formatText = '';
    if (pngCount > 0 && bmpCount === 0) {
      formatText = t.formatPng;
    } else if (bmpCount > 0 && pngCount === 0) {
      formatText = t.formatBmp;
    } else {
      formatText = t.formatMixed
        .replace('{pngCount}', pngCount)
        .replace('{bmpCount}', bmpCount);
    }

    this.elements.formatSummary.textContent = formatText;
  }

  displayImages(images) {
    const t = this.translations[this.currentLanguage];
    this.elements.imageGrid.innerHTML = '';

    for (const image of images) {
      const card = document.createElement('div');
      card.className = 'image-card';

      const imgElement = document.createElement('img');
      imgElement.className = 'image-preview';

      if (image.blob) {
        imgElement.src = URL.createObjectURL(image.blob);
      }

      const actualSize =
        image.actualWidth && image.actualHeight
          ? `${image.actualWidth}×${image.actualHeight}`
          : `${image.width}×${image.height}`;

      card.innerHTML = `
        <div class="image-preview-container"></div>
        <div class="image-details">
          <div class="image-detail"><strong>#${image.index}</strong></div>
          <div class="image-detail">${t.size}: ${actualSize}</div>
          <div class="image-detail">${t.bytes}: ${this.formatFileSize(
        image.dataSize
      )}</div>
          <div class="image-detail">${t.bits}: ${image.bitCount || 'N/A'}</div>
          <span class="format-badge format-${image.format.toLowerCase()}">${
        image.format
      }</span>
        </div>
      `;

      card.querySelector('.image-preview-container').appendChild(imgElement);
      this.elements.imageGrid.appendChild(card);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  showProcessing() {
    console.log('ICO Analyzer: showProcessing called');
    if (!this.elements || !this.elements.uploadArea) {
      console.error('ICO Analyzer: uploadArea element not found in showProcessing');
      return;
    }
    const t = this.translations[this.currentLanguage];
    this.elements.uploadArea.style.opacity = '0.6';
    this.elements.uploadArea.style.pointerEvents = 'none';
    console.log('ICO Analyzer: Processing state shown');
    // Could add a loading indicator here
  }

  hideProcessing() {
    console.log('ICO Analyzer: hideProcessing called');
    if (!this.elements || !this.elements.uploadArea) {
      console.error('ICO Analyzer: uploadArea element not found in hideProcessing');
      return;
    }
    this.elements.uploadArea.style.opacity = '1';
    this.elements.uploadArea.style.pointerEvents = 'auto';
    console.log('ICO Analyzer: Processing state hidden');
  }

  showResults() {
    console.log('ICO Analyzer: showResults called');
    if (!this.elements || !this.elements.resultsSection) {
      console.error('ICO Analyzer: resultsSection element not found in showResults');
      return;
    }
    this.elements.resultsSection.classList.add('active');
    console.log('ICO Analyzer: Results shown');
  }

  hideResults() {
    console.log('ICO Analyzer: hideResults called');
    if (!this.elements || !this.elements.resultsSection) {
      console.error('ICO Analyzer: resultsSection element not found in hideResults');
      return;
    }
    this.elements.resultsSection.classList.remove('active');
    console.log('ICO Analyzer: Results hidden');
  }

  showError(message) {
    console.log('ICO Analyzer: showError called with message:', message);
    if (!this.elements || !this.elements.errorMessage) {
      console.error('ICO Analyzer: errorMessage element not found in showError');
      return;
    }
    const t = this.translations[this.currentLanguage];
    this.elements.errorMessage.textContent = message || t.errorAnalysisFailed;
    this.elements.errorMessage.classList.add('active');
    console.log('ICO Analyzer: Error shown');
  }

  hideError() {
    console.log('ICO Analyzer: hideError called');
    if (!this.elements || !this.elements.errorMessage) {
      console.error('ICO Analyzer: errorMessage element not found in hideError');
      return;
    }
    this.elements.errorMessage.classList.remove('active');
    console.log('ICO Analyzer: Error hidden');
  }

  cleanupEventHandlers() {
    // Remove existing event listeners before re-binding
    this.eventHandlers.forEach((handler, eventType) => {
      switch (eventType) {
        case 'languageChange':
          window.removeEventListener('languageChanged', handler);
          break;
        case 'uploadClick':
          this.elements?.uploadArea?.removeEventListener('click', handler);
          break;
        case 'fileChange':
          this.elements?.fileInput?.removeEventListener('change', handler);
          break;
        case 'dragOver':
          this.elements?.uploadArea?.removeEventListener('dragover', handler);
          break;
        case 'dragLeave':
          this.elements?.uploadArea?.removeEventListener('dragleave', handler);
          break;
        case 'drop':
          this.elements?.uploadArea?.removeEventListener('drop', handler);
          break;
        case 'reset':
          this.elements?.resetBtn?.removeEventListener('click', handler);
          break;
      }
    });
    this.eventHandlers.clear();
  }

  resetToolState() {
    // Reset processing state
    this.isProcessing = false;
    this.currentFile = null;
    this.analysisResults = null;

    // Hide any existing results or error messages
    if (this.elements) {
      this.hideResults();
      this.hideError();

      // Clear file input
      if (this.elements.fileInput) {
        this.elements.fileInput.value = '';
      }
    }
  }

  resetTool() {
    if (this.isDestroyed || !this.elements) return;

    this.elements.fileInput.value = '';
    this.hideResults();
    this.hideError();
    this.currentFile = null;
    this.analysisResults = null;
    this.isProcessing = false;
  }

  onReady() {
    console.log('ICO Analyzer Tool ready');
  }

  destroy() {
    // Mark as destroyed to prevent further operations
    this.isDestroyed = true;

    // Remove event listeners
    this.eventHandlers.forEach((handler, eventType) => {
      switch (eventType) {
        case 'languageChange':
          window.removeEventListener('languageChanged', handler);
          break;
        case 'uploadClick':
          this.elements?.uploadArea?.removeEventListener('click', handler);
          break;
        case 'fileChange':
          this.elements?.fileInput?.removeEventListener('change', handler);
          break;
        case 'dragOver':
          this.elements?.uploadArea?.removeEventListener('dragover', handler);
          break;
        case 'dragLeave':
          this.elements?.uploadArea?.removeEventListener('dragleave', handler);
          break;
        case 'drop':
          this.elements?.uploadArea?.removeEventListener('drop', handler);
          break;
        case 'reset':
          this.elements?.resetBtn?.removeEventListener('click', handler);
          break;
      }
    });
    this.eventHandlers.clear();

    // Cleanup blob URLs to prevent memory leaks
    if (this.analysisResults?.images) {
      this.analysisResults.images.forEach(image => {
        if (image.blob) {
          URL.revokeObjectURL(image.blob);
        }
      });
    }

    // Cleanup properties
    this.isProcessing = false;
    this.currentFile = null;
    this.analysisResults = null;
    this.elements = null;
    this.icoAnalyzer = null;
    this.container = null;
  }
}

// ICO Analyzer Core Class (extracted from original HTML)
class ICOAnalyzer {
  constructor() {
    this.pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  }

  async analyzeICO(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const results = {
      isValid: false,
      imageCount: 0,
      images: [],
      totalSize: arrayBuffer.byteLength,
    };

    // Check ICO header
    if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) {
      throw new Error('Not a valid ICO file');
    }

    results.isValid = true;
    results.imageCount = view.getUint16(4, true);

    // Read directory entries for each image
    let offset = 6; // After header
    for (let i = 0; i < results.imageCount; i++) {
      const image = {
        index: i + 1,
        width: view.getUint8(offset) || 256,
        height: view.getUint8(offset + 1) || 256,
        colorCount: view.getUint8(offset + 2),
        reserved: view.getUint8(offset + 3),
        planes: view.getUint16(offset + 4, true),
        bitCount: view.getUint16(offset + 6, true),
        dataSize: view.getUint32(offset + 8, true),
        dataOffset: view.getUint32(offset + 12, true),
        format: 'unknown',
      };

      // Check image data format
      if (image.dataOffset + 8 <= arrayBuffer.byteLength) {
        const isPNG = this.checkPNGSignature(view, image.dataOffset);
        image.format = isPNG ? 'PNG' : 'BMP';

        // If it's PNG, read actual dimensions
        if (isPNG && image.dataOffset + 24 <= arrayBuffer.byteLength) {
          const pngWidth = view.getUint32(image.dataOffset + 16, false);
          const pngHeight = view.getUint32(image.dataOffset + 20, false);
          image.actualWidth = pngWidth;
          image.actualHeight = pngHeight;
        }

        // Extract image data for preview
        const imageData = new Uint8Array(
          arrayBuffer,
          image.dataOffset,
          image.dataSize
        );
        if (isPNG) {
          image.blob = new Blob([imageData], { type: 'image/png' });
        } else {
          // BMP needs file header
          image.blob = this.createBMPBlob(imageData, image);
        }
      }

      results.images.push(image);
      offset += 16; // Each directory entry is 16 bytes
    }

    return results;
  }

  checkPNGSignature(view, offset) {
    for (let i = 0; i < this.pngSignature.length; i++) {
      if (view.getUint8(offset + i) !== this.pngSignature[i]) {
        return false;
      }
    }
    return true;
  }

  createBMPBlob(data, imageInfo) {
    // Simplified BMP creation (may not handle all cases)
    const bmpHeader = new Uint8Array(14);
    const dibHeader = new Uint8Array(40);

    // BMP file header
    bmpHeader[0] = 0x42; // 'B'
    bmpHeader[1] = 0x4d; // 'M'

    // File size
    const fileSize = 14 + 40 + data.length;
    bmpHeader[2] = fileSize & 0xff;
    bmpHeader[3] = (fileSize >> 8) & 0xff;
    bmpHeader[4] = (fileSize >> 16) & 0xff;
    bmpHeader[5] = (fileSize >> 24) & 0xff;

    // Data offset
    bmpHeader[10] = 54;

    // DIB header
    dibHeader[0] = 40; // Header size

    // Width and height
    dibHeader[4] = imageInfo.width & 0xff;
    dibHeader[5] = (imageInfo.width >> 8) & 0xff;
    dibHeader[8] = imageInfo.height & 0xff;
    dibHeader[9] = (imageInfo.height >> 8) & 0xff;

    // Color planes and bit depth
    dibHeader[12] = 1;
    dibHeader[14] = imageInfo.bitCount || 32;

    return new Blob([bmpHeader, dibHeader, data], { type: 'image/bmp' });
  }

  formatHexView(arrayBuffer, maxBytes = 256) {
    const bytes = new Uint8Array(arrayBuffer);
    const limit = Math.min(bytes.length, maxBytes);
    let hexView = '';

    for (let i = 0; i < limit; i += 16) {
      const offset = i.toString(16).padStart(8, '0').toUpperCase();
      let hexBytes = '';
      let ascii = '';

      for (let j = 0; j < 16 && i + j < limit; j++) {
        const byte = bytes[i + j];
        hexBytes += byte.toString(16).padStart(2, '0').toUpperCase() + ' ';
        ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
      }

      hexView += `<div class="hex-row">`;
      hexView += `<span class="hex-offset">${offset}:</span>`;
      hexView += `<span class="hex-bytes">${hexBytes.padEnd(48, ' ')}</span>`;
      hexView += `<span class="hex-ascii">${ascii}</span>`;
      hexView += `</div>`;
    }

    return hexView;
  }
}
