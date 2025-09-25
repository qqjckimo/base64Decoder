import { MonacoLoader } from '../../utils/monacoLoader.js';
import {
  createIcon,
  initializeLucideIcons,
} from '../../components/shared/Icon.js';
import './styles.css';
import { WorkerCreator } from './worker-creator.js';

export default class Base64EncoderTool {
  constructor() {
    this.currentFile = null;
    this.encodedData = null;
    this.compressionResults = {};
    this.monacoEditor = null;
    this.encoderWorker = null;
    this.compressorWorker = null;
    this.chart = null;

    // Worker 就緒狀態追蹤
    this.workersReady = false;
    this.encoderWorkerReady = false;
    this.compressorWorkerReady = false;
    this.workersInitPromise = null;
    this.pendingFileQueue = [];

    this.currentLanguage = window.appLanguage?.get() || 'zh-TW';
    this.translations = {
      'zh-TW': {
        title: '圖片轉 Base64 工具',
        uploadText: '拖放圖片到此處，或點擊選擇檔案',
        supportedFormats: '支援格式：PNG, JPEG, GIF, WebP, AVIF, SVG',
        selectFile: '選擇檔案',
        qualityLabel: '壓縮品質',
        originalFile: '原始檔案',
        base64Size: 'Base64 大小',
        gzipSize: 'Base64 (gzip)',
        compressionResults: '壓縮結果',
        copyBase64: '複製',
        downloadBase64: '下載',
        processing: '處理中...',
        compressing: '壓縮中...',
        fileInfo: '檔案資訊',
        fileName: '檔案名稱',
        fileSize: '檔案大小',
        imageSize: '圖片尺寸',
        mimeType: '檔案類型',
        sizeComparison: '檔案大小比較',
        compressionTime: '壓縮時間',
        copySuccess: '已複製到剪貼簿',
        downloadSuccess: '檔案下載完成',
        result: '結果',
        error: '錯誤',
        unsupportedFile: '不支援的檔案格式',
        fileTooLarge: '檔案過大',
        processingFailed: '處理失敗',
        initializing: '工具初始化中，請稍候...',
      },
      en: {
        title: 'Image to Base64 Tool',
        uploadText: 'Drop images here, or click to select files',
        supportedFormats: 'Supported: PNG, JPEG, GIF, WebP, AVIF, SVG',
        selectFile: 'Select File',
        qualityLabel: 'Compression Quality',
        originalFile: 'Original File',
        base64Size: 'Base64 Size',
        gzipSize: 'Base64 (gzip)',
        compressionResults: 'Compression Results',
        copyBase64: 'Copy',
        downloadBase64: 'Download',
        processing: 'Processing...',
        compressing: 'Compressing...',
        fileInfo: 'File Info',
        fileName: 'File Name',
        fileSize: 'File Size',
        imageSize: 'Image Size',
        mimeType: 'MIME Type',
        sizeComparison: 'File Size Comparison',
        compressionTime: 'Compression Time',
        copySuccess: 'Copied to clipboard',
        downloadSuccess: 'File downloaded successfully',
        result: 'Result',
        error: 'Error',
        unsupportedFile: 'Unsupported file format',
        fileTooLarge: 'File too large',
        processingFailed: 'Processing failed',
        initializing: 'Tool initializing, please wait...',
      },
    };
  }

  async init(container) {
    this.container = container;

    // 先渲染 UI 但標記為載入中
    this.render();
    this.setUILoadingState(true);

    // 初始化 Workers 並等待就緒
    try {
      await this.initWorkersAsync();
      console.log('✅ Workers initialized successfully');
      this.setUILoadingState(false);
    } catch (error) {
      console.error('❌ Failed to initialize workers:', error);
      this.showMessage('error', '工具初始化失敗，部分功能可能無法使用');
      this.setUILoadingState(false);
    }

    // Workers 就緒後才附加事件
    this.attachEvents();

    // 檢查關鍵DOM元素
    const keyElements = {
      uploadArea: document.getElementById('uploadArea'),
      fileInfoContainer: document.getElementById('fileInfoContainer'),
      controlPanel: document.getElementById('controlPanel'),
      editorSection: document.getElementById('editorSection'),
      monacoContainer: document.getElementById('monacoContainer'),
      sizeComparison: document.getElementById('sizeComparison'),
      chartCanvas: document.getElementById('chartCanvas'),
      progressContainer: document.getElementById('progressContainer'),
    };

    const missingElements = Object.entries(keyElements)
      .filter(([name, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      console.error('❌ Missing DOM elements:', missingElements);
    }

    // 監聽語言變更
    window.addEventListener('languageChanged', (e) => {
      this.currentLanguage = e.detail.language;
      this.updateLanguage();
    });
  }

  updateLanguage() {
    const t = this.translations[this.currentLanguage];

    // Update all elements with data-i18n attributes
    this.container.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (t[key]) {
        element.textContent = t[key];
      }
    });

    // Update specific elements that need manual updating
    const elements = {
      title: this.container.querySelector('.tool-header h2'),
      uploadText: this.container.querySelector('.upload-text'),
      supportedFormats: this.container.querySelector(
        '.upload-section > div:nth-child(3)'
      ),
      selectBtn: document.getElementById('selectBtn'),
      qualityLabel: this.container.querySelector('.quality-control label'),
      editorTitle: this.container.querySelector('.editor-title'),
      copyBtn: document.getElementById('copyBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      sizeComparisonTitle: this.container.querySelector('#sizeComparison h3'),
      compressionResultsTitle: this.container.querySelector(
        '#compressionResults h4'
      ),
    };

    if (elements.title) elements.title.textContent = t.title;
    if (elements.uploadText) elements.uploadText.textContent = t.uploadText;
    if (elements.supportedFormats)
      elements.supportedFormats.textContent = t.supportedFormats;
    if (elements.selectBtn && !elements.selectBtn.disabled)
      elements.selectBtn.textContent = t.selectFile;
    if (elements.qualityLabel) {
      const qualityValue =
        document.getElementById('qualityValue')?.textContent || '75';
      elements.qualityLabel.innerHTML = `${t.qualityLabel}: <span class="quality-value" id="qualityValue">${qualityValue}</span>`;
    }
    if (elements.editorTitle)
      elements.editorTitle.textContent = `Base64 ${t.result || '結果'}`;
    if (elements.copyBtn) {
      elements.copyBtn.innerHTML = `${createIcon('copy', 16, 'btn-icon')} ${
        t.copyBase64
      }`;
    }
    if (elements.downloadBtn) {
      elements.downloadBtn.innerHTML = `${createIcon(
        'download',
        16,
        'btn-icon'
      )} ${t.downloadBase64}`;
    }
    if (elements.sizeComparisonTitle)
      elements.sizeComparisonTitle.textContent = t.sizeComparison;
    if (elements.compressionResultsTitle)
      elements.compressionResultsTitle.textContent = t.compressionResults;

    // Update file info labels if container exists
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    if (fileInfoContainer) {
      const infoItems = fileInfoContainer.querySelectorAll('.info-item');
      const labelMap = [
        { selector: '#fileName', label: t.fileName },
        { selector: '#fileSize', label: t.fileSize },
        { selector: '#imageSize', label: t.imageSize },
        { selector: '#mimeType', label: t.mimeType },
        { selector: '#base64Size', label: t.base64Size },
        { selector: '#gzipSize', label: t.gzipSize },
      ];

      labelMap.forEach(({ selector, label }) => {
        const element = fileInfoContainer.querySelector(selector);
        if (element) {
          const labelElement = element.querySelector('.info-label');
          if (labelElement) labelElement.textContent = label;
        }
      });
    }
  }

  async initWorkersAsync() {
    // 如果已經在初始化中，返回現有的 Promise
    if (this.workersInitPromise) {
      return this.workersInitPromise;
    }

    this.workersInitPromise = this._initWorkersInternal();
    return this.workersInitPromise;
  }

  async _initWorkersInternal() {
    try {
      // 檢查Worker支援
      if (typeof Worker === 'undefined') {
        console.error('❌ Web Workers not supported');
        this.encoderWorkerFailed = true;
        this.compressorWorkerFailed = true;
        throw new Error('Web Workers not supported');
      }

      const workerPromises = [];

      // 建立並初始化 Encoder Worker
      const encoderPromise = new Promise((resolve, reject) => {
        try {
          this.encoderWorker = WorkerCreator.createEncoderWorker();

          // 設定訊息處理
          const initTimeout = setTimeout(() => {
            reject(new Error('Encoder worker initialization timeout'));
          }, 5000); // 5秒超時

          const messageHandler = (e) => {
            if (e.data.type === 'ready') {
              clearTimeout(initTimeout);
              this.encoderWorkerReady = true;
              console.log('✅ Encoder worker ready');
              resolve();
            } else {
              this.handleEncoderMessage(e);
            }
          };

          this.encoderWorker.onmessage = messageHandler;

          this.encoderWorker.onerror = (error) => {
            clearTimeout(initTimeout);
            console.error('❌ Encoder worker error:', error);
            this.encoderWorkerFailed = true;
            reject(error);
          };

          // 發送初始化訊息
          this.encoderWorker.postMessage({ type: 'init' });
        } catch (error) {
          console.error('❌ Failed to create encoder worker:', error);
          this.encoderWorkerFailed = true;
          reject(error);
        }
      });

      // 建立並初始化 Compressor Worker
      const compressorPromise = new Promise((resolve, reject) => {
        try {
          this.compressorWorker = WorkerCreator.createCompressorWorker();

          // 設定訊息處理
          const initTimeout = setTimeout(() => {
            reject(new Error('Compressor worker initialization timeout'));
          }, 5000); // 5秒超時

          const messageHandler = (e) => {
            if (e.data.type === 'ready') {
              clearTimeout(initTimeout);
              this.compressorWorkerReady = true;
              console.log('✅ Compressor worker ready');
              resolve();
            } else {
              this.handleCompressorMessage(e);
            }
          };

          this.compressorWorker.onmessage = messageHandler;

          this.compressorWorker.onerror = (error) => {
            clearTimeout(initTimeout);
            console.error('❌ Compressor worker error:', error);
            this.compressorWorkerFailed = true;
            reject(error);
          };

          // 發送初始化訊息
          this.compressorWorker.postMessage({ type: 'init' });
        } catch (error) {
          console.error('❌ Failed to create compressor worker:', error);
          this.compressorWorkerFailed = true;
          reject(error);
        }
      });

      workerPromises.push(encoderPromise, compressorPromise);

      // 等待所有 Workers 就緒
      await Promise.allSettled(workerPromises);

      // 檢查結果
      if (this.encoderWorkerReady || this.compressorWorkerReady) {
        this.workersReady = true;
        console.log('✅ At least one worker is ready');

        // 處理排隊的檔案
        this.processPendingFiles();
      } else {
        throw new Error('All workers failed to initialize');
      }
    } catch (error) {
      console.error('❌ Failed to initialize workers:', error);
      this.workersReady = false;
      throw error;
    }
  }

  setUILoadingState(loading) {
    const uploadArea = document.getElementById('uploadArea');
    const selectBtn = document.getElementById('selectBtn');
    const fileInput = document.getElementById('fileInput');

    if (loading) {
      if (uploadArea) {
        uploadArea.classList.add('loading');
        uploadArea.style.pointerEvents = 'none';
      }
      if (selectBtn) {
        selectBtn.disabled = true;
        selectBtn.innerHTML = `
          <div class="btn-loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">載入中...</div>
          </div>
        `;
      }
      if (fileInput) {
        fileInput.disabled = true;
      }
    } else {
      if (uploadArea) {
        uploadArea.classList.remove('loading');
        uploadArea.style.pointerEvents = 'auto';
      }
      if (selectBtn) {
        selectBtn.disabled = false;
        const t = this.translations[this.currentLanguage];
        selectBtn.textContent = t.selectFile;
      }
      if (fileInput) {
        fileInput.disabled = false;
      }
    }
  }

  processPendingFiles() {
    if (this.pendingFileQueue.length > 0) {
      console.log(
        `📦 Processing ${this.pendingFileQueue.length} pending files`
      );
      while (this.pendingFileQueue.length > 0) {
        const file = this.pendingFileQueue.shift();
        this.processFile(file);
      }
    }
  }

  render() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
      <div class="base64-encoder-tool">
        <div class="tool-header">
          <h2>${t.title}</h2>
        </div>
        
        <!-- 上傳區域 -->
        <div class="upload-section" id="uploadArea">
          <div class="upload-icon">📷</div>
          <div class="upload-text">${t.uploadText}</div>
          <div style="color: #999; font-size: 0.9em; margin-bottom: 15px;">${
            t.supportedFormats
          }</div>
          <button class="btn" id="selectBtn">${t.selectFile}</button>
          <input type="file" class="file-input" id="fileInput" accept="image/*">
        </div>

        <!-- 控制面板 -->
        <div class="control-panel" id="controlPanel" style="display: none;">
          <div class="quality-control">
            <label>${
              t.qualityLabel
            }: <span class="quality-value" id="qualityValue">75</span></label>
            <input type="range" class="quality-slider" id="qualitySlider" 
                   min="1" max="100" value="75" step="1">
          </div>
          
          <!-- 進度條 -->
          <div class="compression-progress" id="progressContainer" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText"></div>
          </div>
          
          <!-- 檔案資訊 -->
          <div class="file-info" id="fileInfoContainer" style="display: none;">
            <div class="info-item">
              <div class="info-label">${t.fileName}</div>
              <div class="info-value" id="fileName">-</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t.fileSize}</div>
              <div class="info-value" id="fileSize">-</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t.imageSize}</div>
              <div class="info-value" id="imageSize">-</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t.mimeType}</div>
              <div class="info-value" id="mimeType">-</div>
            </div>
          </div>
        </div>

        <!-- Monaco Editor 區域 -->
        <div class="editor-section" id="editorSection" style="display: none;">
          <div class="editor-header">
            <h3 class="editor-title">Base64 ${t.result || '結果'}</h3>
            <div class="editor-actions">
              <button class="btn btn-small btn-secondary" id="copyBtn">
                ${createIcon('copy', 16, 'btn-icon')} ${t.copyBase64}
              </button>
              <button class="btn btn-small btn-secondary" id="downloadBtn">
                ${createIcon('download', 16, 'btn-icon')} ${t.downloadBase64}
              </button>
            </div>
          </div>
          <div class="monaco-container" id="monacoContainer"></div>
        </div>

        <!-- 檔案大小比較 -->
        <div class="size-comparison" id="sizeComparison" style="display: none;">
          <h3>${t.sizeComparison}</h3>
          <div class="chart-container">
            <canvas class="chart-canvas" id="chartCanvas"></canvas>
          </div>
          
          <!-- 壓縮結果 -->
          <div class="compression-results" id="compressionResults">
            <h4>${t.compressionResults}</h4>
            <div id="formatResults"></div>
          </div>
        </div>

        <!-- 訊息顯示區域 -->
        <div id="messageContainer"></div>
      </div>
    `;

    // Initialize Lucide icons after rendering
    initializeLucideIcons();
  }

  attachEvents() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectBtn = document.getElementById('selectBtn');
    const qualitySlider = document.getElementById('qualitySlider');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    // 檔案選擇事件
    selectBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // 拖放事件
    uploadArea?.addEventListener('dragover', (e) => this.handleDragOver(e));
    uploadArea?.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    uploadArea?.addEventListener('drop', (e) => this.handleDrop(e));

    // 品質滑桿事件
    qualitySlider?.addEventListener('input', (e) =>
      this.handleQualityChange(e)
    );

    // 按鈕事件
    copyBtn?.addEventListener('click', () => this.copyBase64());
    downloadBtn?.addEventListener('click', () => this.downloadBase64());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
  }

  handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
  }

  handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  async processFile(file) {
    if (!this.isValidImageFile(file)) {
      console.error('❌ Invalid file type:', file.type);
      this.showMessage(
        'error',
        this.translations[this.currentLanguage].unsupportedFile
      );
      return;
    }

    // 檢查 Workers 是否就緒
    if (!this.workersReady) {
      console.log('⏳ Workers not ready, queuing file for later processing');
      this.pendingFileQueue.push(file);
      this.showMessage('info', '工具正在載入，請稍候...');

      // 嘗試初始化 Workers（如果尚未初始化）
      if (!this.workersInitPromise) {
        await this.initWorkersAsync();
      }
      return;
    }

    // 檢查 Encoder Worker 是否可用
    if (!this.encoderWorkerReady && !this.encoderWorkerFailed) {
      console.log('⏳ Encoder worker not ready, waiting...');
      this.pendingFileQueue.push(file);
      return;
    }

    this.currentFile = file;
    this.showFileInfo(file);
    this.showProgress(true);
    await this.encodeFile(file);
  }

  isValidImageFile(file) {
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml',
    ];
    return validTypes.includes(file.type);
  }

  showFileInfo(file) {
    const elements = {
      fileName: document.getElementById('fileName'),
      fileSize: document.getElementById('fileSize'),
      mimeType: document.getElementById('mimeType'),
      imageSize: document.getElementById('imageSize'),
      fileInfoContainer: document.getElementById('fileInfoContainer'),
      controlPanel: document.getElementById('controlPanel'),
    };

    if (elements.fileName) {
      elements.fileName.textContent = file.name;
    } else {
      console.error('❌ fileName element not found');
    }

    if (elements.fileSize) {
      elements.fileSize.textContent = this.formatFileSize(file.size);
    } else {
      console.error('❌ fileSize element not found');
    }

    if (elements.mimeType) {
      elements.mimeType.textContent = file.type;
    } else {
      console.error('❌ mimeType element not found');
    }

    // 如果是圖片，獲取尺寸
    if (file.type.startsWith('image/')) {
      this.getImageDimensions(file)
        .then((dimensions) => {
          const dimensionText = dimensions
            ? `${dimensions.width} x ${dimensions.height}`
            : '-';
          if (elements.imageSize) {
            elements.imageSize.textContent = dimensionText;
          } else {
            console.error('❌ imageSize element not found');
          }
        })
        .catch((error) => {
          console.error('❌ Error getting image dimensions:', error);
        });
    }

    // 顯示檔案資訊容器
    if (elements.fileInfoContainer) {
      elements.fileInfoContainer.style.display = 'grid';
    } else {
      console.error('❌ fileInfoContainer not found');
    }

    // 顯示控制面板
    if (elements.controlPanel) {
      elements.controlPanel.style.display = 'block';
    } else {
      console.error('❌ controlPanel not found');
    }

    this.minimizeUploadArea();
  }

  minimizeUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.classList.add('minimized');
    }
  }

  showSizeInfo(result) {
    console.log('📋 [Tool DEBUG] showSizeInfo called with:', {
      hasResult: !!result,
      base64Size: result?.base64Size,
      gzipSize: result?.gzipSize,
    });

    // 更新檔案資訊區域以顯示 base64 和 gzip 大小
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    if (!fileInfoContainer) {
      console.error('❌ [Tool DEBUG] fileInfoContainer not found');
      return;
    }

    console.log(
      '🔍 [Tool DEBUG] fileInfoContainer found, current children count:',
      fileInfoContainer.children.length
    );

    try {
      // 添加 Base64 大小資訊
      let base64SizeElement = document.getElementById('base64Size');
      if (!base64SizeElement) {
        console.log('📦 [Tool DEBUG] Creating base64Size info element');
        base64SizeElement = this.createInfoElement('base64Size', 'Base64 大小');
      }

      if (base64SizeElement) {
        const valueElement = base64SizeElement.querySelector('.info-value');
        if (valueElement) {
          valueElement.textContent = this.formatFileSize(result.base64Size);
          console.log(
            '✅ [Tool DEBUG] Base64 size info updated:',
            this.formatFileSize(result.base64Size)
          );
        } else {
          console.error(
            '❌ [Tool DEBUG] .info-value not found in base64SizeElement'
          );
        }
      }

      // 添加 Gzip 大小資訊
      let gzipSizeElement = document.getElementById('gzipSize');
      if (!gzipSizeElement) {
        console.log('📦 [Tool DEBUG] Creating gzipSize info element');
        gzipSizeElement = this.createInfoElement('gzipSize', 'Base64 (gzip)');
      }

      if (gzipSizeElement) {
        const valueElement = gzipSizeElement.querySelector('.info-value');
        if (valueElement) {
          valueElement.textContent = this.formatFileSize(result.gzipSize);
          console.log(
            '✅ [Tool DEBUG] Gzip size info updated:',
            this.formatFileSize(result.gzipSize)
          );
        } else {
          console.error(
            '❌ [Tool DEBUG] .info-value not found in gzipSizeElement'
          );
        }
      }

      console.log('🏁 [Tool DEBUG] showSizeInfo completed successfully');
    } catch (error) {
      console.error('❌ [Tool DEBUG] Error in showSizeInfo:', error);
      console.error('showSizeInfo error stack:', error.stack);
    }
  }

  showBasicSizeComparison() {
    console.log('📊 [Tool DEBUG] showBasicSizeComparison called');

    // 檢查必要數據
    console.log('🔍 [Tool DEBUG] Encoded data check:', {
      hasEncodedData: !!this.encodedData,
      originalSize: this.encodedData?.originalSize,
      base64Size: this.encodedData?.base64Size,
      gzipSize: this.encodedData?.gzipSize,
    });

    // 立即顯示size comparison區域，不等待壓縮完成
    const sizeComparison = document.getElementById('sizeComparison');
    const chartCanvas = document.getElementById('chartCanvas');
    const compressionResults = document.getElementById('compressionResults');

    console.log('🔍 [Tool DEBUG] Size comparison elements check:', {
      sizeComparison: !!sizeComparison,
      chartCanvas: !!chartCanvas,
      compressionResults: !!compressionResults,
    });

    if (sizeComparison) {
      const wasVisible = sizeComparison.style.display !== 'none';
      sizeComparison.style.display = 'block';
      console.log(
        '✅ [Tool DEBUG] Size comparison section made visible (was visible:',
        wasVisible,
        ')'
      );

      // 立即更新基礎圖表（不包含壓縮格式）
      console.log('📈 [Tool DEBUG] Starting chart update...');
      try {
        this.updateChart();
        console.log('✅ [Tool DEBUG] Chart updated successfully');
      } catch (error) {
        console.error('❌ [Tool DEBUG] Error updating chart:', error);
        console.error('Chart error stack:', error.stack);
      }

      // 檢查圖表渲染狀態
      if (chartCanvas) {
        const canvasContext = chartCanvas.getContext('2d');
        const imageData = canvasContext.getImageData(0, 0, 50, 50);
        const hasData = Array.from(imageData.data).some((pixel) => pixel !== 0);
        console.log('🔍 [Tool DEBUG] Chart render status:', {
          canvasWidth: chartCanvas.width,
          canvasHeight: chartCanvas.height,
          hasRenderedContent: hasData,
        });
      }
    } else {
      console.error('❌ [Tool DEBUG] Size comparison section not found in DOM');
    }

    console.log('🏁 [Tool DEBUG] showBasicSizeComparison completed');
  }

  createInfoElement(id, label) {
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    const infoItem = document.createElement('div');
    infoItem.className = 'info-item';
    infoItem.id = id;
    infoItem.innerHTML = `
      <div class="info-label">${label}</div>
      <div class="info-value">-</div>
    `;
    fileInfoContainer.appendChild(infoItem);
    return infoItem;
  }

  async getImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  showProgress(show, text = '', progress = 0) {
    const container = document.getElementById('progressContainer');
    const fill = document.getElementById('progressFill');
    const textEl = document.getElementById('progressText');

    if (show) {
      if (container) {
        container.style.display = 'block';
      }
      if (fill) {
        fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      }
      if (textEl) {
        // 確保文字正確顯示，避免特殊字符或錯誤顯示
        const safeText = text || '處理中...';
        textEl.textContent = safeText;
        textEl.style.whiteSpace = 'normal';
        textEl.style.wordBreak = 'keep-all';
        console.log(`📊 [Progress] ${safeText} - ${progress}%`);
      }
    } else {
      if (container) {
        container.style.display = 'none';
      }
      if (fill) {
        fill.style.width = '0%';
      }
      if (textEl) {
        textEl.textContent = '';
      }
    }
  }

  async encodeFile(file) {
    const startTime = performance.now();
    console.log('⚙️ [Encoder] Starting file encoding:', {
      fileName: file.name,
      size: file.size,
      type: file.type,
      timestamp: new Date().toISOString(),
    });

    // 詳細的 Worker 狀態檢查
    console.log('🔍 [Encoder] Worker status check:', {
      hasEncoderWorker: !!this.encoderWorker,
      encoderWorkerReady: this.encoderWorkerReady,
      encoderWorkerFailed: this.encoderWorkerFailed,
      workersReady: this.workersReady,
    });

    // 檢查是否需要使用降級方案
    if (!this.encoderWorker || this.encoderWorkerFailed) {
      console.error('❌ [Encoder] Worker not available, cannot proceed');
      this.showMessage('error', '編碼器無法使用，請重新載入頁面');
      this.showProgress(false);
      return;
    }

    if (!this.encoderWorkerReady) {
      console.warn('⚠️ [Encoder] Worker not ready yet, queuing file');
      this.pendingFileQueue.push(file);
      this.showMessage('info', '編碼器正在初始化，請稍候...');
      return;
    }

    const workerId = Date.now();
    console.log('🚀 [Tool DEBUG] Starting file encoding with worker:', {
      fileName: file.name,
      size: file.size,
      workerId,
      workerReady:
        this.encoderWorker.readyState === undefined
          ? 'ready'
          : this.encoderWorker.readyState,
    });

    // 發送編碼請求到Worker
    try {
      console.log('📦 [Tool DEBUG] Preparing file for worker transfer:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // File對象無法直接傳遞到Worker，需要使用Transferable Objects
      // 先轉換為ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log(
        '🔄 [Tool DEBUG] File converted to ArrayBuffer:',
        arrayBuffer.byteLength,
        'bytes'
      );

      // 詳細記錄要發送的數據結構
      const messageData = {
        type: 'encode',
        data: {
          arrayBuffer: arrayBuffer,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          includePrefix: true,
        },
        id: workerId,
      };

      console.log('📤 [Tool DEBUG] Preparing to send message to Worker:', {
        type: messageData.type,
        id: messageData.id,
        dataStructure: {
          hasArrayBuffer: !!messageData.data.arrayBuffer,
          arrayBufferSize: messageData.data.arrayBuffer?.byteLength,
          fileName: messageData.data.fileName,
          fileType: messageData.data.fileType,
          fileSize: messageData.data.fileSize,
          includePrefix: messageData.data.includePrefix,
        },
        workerState:
          this.encoderWorker.readyState === undefined
            ? 'ready'
            : this.encoderWorker.readyState,
        transferObjects: ['ArrayBuffer (' + arrayBuffer.byteLength + ' bytes)'],
      });

      // 檢查 Worker 狀態
      if (
        this.encoderWorker.readyState !== undefined &&
        this.encoderWorker.readyState !== 'running'
      ) {
        console.warn(
          '⚠️ [Tool DEBUG] Worker might not be in running state:',
          this.encoderWorker.readyState
        );
      }

      // 發送訊息
      console.log('🚀 [Tool DEBUG] Calling postMessage() now...');
      this.encoderWorker.postMessage(messageData, [arrayBuffer]); // Transfer ArrayBuffer
      console.log(
        '✅ [Tool DEBUG] postMessage() call completed - message sent to worker'
      );

      // 檢查 ArrayBuffer 是否被成功轉移（應該變為不可用）
      try {
        console.log(
          '🔍 [Tool DEBUG] Checking ArrayBuffer transfer - byteLength after transfer:',
          arrayBuffer.byteLength
        );
      } catch (error) {
        console.log(
          '✅ [Tool DEBUG] ArrayBuffer successfully transferred (now detached):',
          error.message
        );
      }
    } catch (error) {
      console.error('❌ [Tool DEBUG] Error sending message to worker:', error);
      this.showMessage('error', 'Encoding failed');
    }
  }

  handleEncoderMessage(event) {
    const { type, id, result, error } = event.data;
    console.log('📨 [Encoder] Message received:', {
      type,
      id,
      hasResult: !!result,
      error,
      timestamp: new Date().toISOString(),
    });

    switch (type) {
      case 'ready':
        // Worker 已就緒，不需要額外處理（已在 initWorkersAsync 中處理）
        console.log('✅ [Encoder] Ready message received');
        break;
      case 'progress':
        const { step, progress } = event.data;
        console.log('📈 [Tool DEBUG] Progress update:', { step, progress });
        this.showProgress(true, this.getProgressText(step), progress);
        break;

      case 'encoded':
        const encodingEndTime = performance.now();
        console.log('🎉 [Tool DEBUG] Encoded result received:', {
          base64Length: result?.base64?.length,
          originalSize: result?.originalSize,
          base64Size: result?.base64Size,
          gzipSize: result?.gzipSize,
          hasBase64Data: !!result?.base64,
        });

        this.encodedData = result;
        console.log('📊 [Tool DEBUG] Hiding progress indicator...');
        this.showProgress(false);

        if (result?.base64) {
          console.log('✨ [Tool DEBUG] Starting UI display sequence...');

          // 立即顯示所有區塊，而非等待各別函數完成
          console.log('🖥️ [Tool DEBUG] Step 1: Showing all sections...');
          this.showAllSections();

          console.log('📝 [Tool DEBUG] Step 2: Displaying Base64...');
          this.displayBase64(result.base64);

          console.log('📋 [Tool DEBUG] Step 3: Showing size info...');
          this.showSizeInfo(result);

          console.log('📊 [Tool DEBUG] Step 4: Showing size comparison...');
          this.showBasicSizeComparison();

          console.log('✅ [Tool DEBUG] UI display sequence completed');
        } else {
          console.error('❌ [Tool DEBUG] No base64 data in result');
          this.showMessage('error', 'Base64 編碼失敗');
        }

        console.log('🗜️ [Tool DEBUG] Starting compression...');
        this.startCompression();
        break;

      case 'error':
        console.error(
          '❌ [Tool DEBUG] Encoder worker error message received:',
          error
        );
        console.error('❌ [Tool DEBUG] Error details from worker:', {
          error: error,
          stack: result?.stack,
          id: id,
          timestamp: new Date().toISOString(),
        });
        this.showProgress(false);
        this.showMessage('error', error);
        break;
      case 'pong':
        console.log('🏓 [Tool DEBUG] Pong received from worker:', event.data);
        break;
      default:
        console.warn('⚠️ [Tool DEBUG] Unknown message type from worker:', type);
        break;
    }
  }

  showAllSections() {
    console.log('🖥️ [Tool DEBUG] showAllSections called');

    // 立即顯示所有主要區域
    const elements = {
      editorSection: document.getElementById('editorSection'),
      sizeComparison: document.getElementById('sizeComparison'),
      monacoContainer: document.getElementById('monacoContainer'),
    };

    console.log('🔍 [Tool DEBUG] Main sections DOM check:', {
      editorSection: !!elements.editorSection,
      sizeComparison: !!elements.sizeComparison,
      monacoContainer: !!elements.monacoContainer,
    });

    if (elements.editorSection) {
      const wasVisible = elements.editorSection.style.display !== 'none';
      elements.editorSection.style.display = 'block';
      console.log(
        '✅ [Tool DEBUG] editorSection made visible (was visible:',
        wasVisible,
        ')'
      );

      // 檢查Monaco容器
      if (elements.monacoContainer) {
        const containerRect = elements.monacoContainer.getBoundingClientRect();
        console.log('🔍 [Tool DEBUG] monacoContainer dimensions:', {
          width: containerRect.width,
          height: containerRect.height,
          visible: containerRect.width > 0 && containerRect.height > 0,
        });
      }
    } else {
      console.error('❌ [Tool DEBUG] editorSection element not found in DOM');
    }

    if (elements.sizeComparison) {
      const wasVisible = elements.sizeComparison.style.display !== 'none';
      elements.sizeComparison.style.display = 'block';
      console.log(
        '✅ [Tool DEBUG] sizeComparison made visible (was visible:',
        wasVisible,
        ')'
      );

      // 檢查圖表容器
      const chartCanvas = document.getElementById('chartCanvas');
      if (chartCanvas) {
        const canvasRect = chartCanvas.getBoundingClientRect();
        console.log('🔍 [Tool DEBUG] chartCanvas dimensions:', {
          width: canvasRect.width,
          height: canvasRect.height,
          visible: canvasRect.width > 0 && canvasRect.height > 0,
        });
      } else {
        console.error('❌ [Tool DEBUG] chartCanvas not found');
      }
    } else {
      console.error('❌ [Tool DEBUG] sizeComparison element not found in DOM');
    }

    console.log('🏁 [Tool DEBUG] showAllSections completed');
  }

  async startCompression() {
    if (
      !this.compressorWorker ||
      this.compressorWorkerFailed ||
      !this.currentFile
    ) {
      console.log('Compression not available:', {
        hasWorker: !!this.compressorWorker,
        workerFailed: this.compressorWorkerFailed,
        hasFile: !!this.currentFile,
      });
      this.showMessage('info', '壓縮功能暫時無法使用，跳過壓縮步驟');
      return;
    }

    const quality = parseInt(document.getElementById('qualitySlider').value);
    const workerId = Date.now();

    console.log('Starting compression:', { quality, workerId });

    this.compressorWorker.postMessage({
      type: 'compress',
      data: {
        file: this.currentFile,
        quality,
        formats: ['png', 'webp', 'avif'],
      },
      id: workerId,
    });
  }

  handleCompressorMessage(event) {
    const { type, id, result, format, results, error } = event.data;
    console.log('📨 [Compressor] Message received:', {
      type,
      id,
      format,
      result: result ? 'data available' : 'no data',
      error,
    });

    switch (type) {
      case 'ready':
        // Worker 已就緒，不需要額外處理（已在 initWorkersAsync 中處理）
        console.log('✅ [Compressor] Ready message received');
        break;
      case 'progress':
        const { step, progress } = event.data;
        this.showProgress(true, this.getProgressText(step), progress);
        break;

      case 'formatComplete':
        console.log(`${format} compression complete:`, result);
        this.compressionResults[format] = result;
        this.updateFormatResult(format, result);
        this.updateChart();
        break;

      case 'compressed':
        console.log('All compression formats complete:', results);
        this.showProgress(false);
        this.showMessage('success', '壓縮完成');
        // size comparison區域已在編碼完成時顯示，這裡只需要更新最終圖表
        this.updateChart();
        break;

      case 'error':
        console.error('Compressor error:', error);
        this.showProgress(false);
        this.showMessage('error', `壓縮失敗: ${error}`);
        break;
    }
  }

  getProgressText(step) {
    const texts = {
      encoding: '編碼圖片中...',
      compressing: '計算 Gzip 大小...',
      loading: '載入壓縮工具...',
      preparing: '準備壓縮...',
      compressing_png: '壓縮 PNG...',
      compressing_webp: '壓縮 WebP...',
      compressing_avif: '壓縮 AVIF...',
    };
    return texts[step] || '處理中...';
  }

  async displayBase64(base64) {
    console.log('📝 [Tool DEBUG] displayBase64 called:', {
      base64Length: base64?.length,
      hasExistingEditor: !!this.monacoEditor,
    });

    const container = document.getElementById('monacoContainer');
    if (!container) {
      console.error('❌ [Tool DEBUG] monacoContainer not found in DOM');
      return;
    }

    console.log('🔍 [Tool DEBUG] Monaco container found:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: getComputedStyle(container).display,
      visibility: getComputedStyle(container).visibility,
    });

    try {
      // 先創建fallback編輯器確保立即顯示
      if (!this.monacoEditor) {
        console.log('🛠️ [Tool DEBUG] Creating fallback editor first');
      }

      // 設置base64值到現有編輯器
      if (this.monacoEditor && this.monacoEditor.setValue) {
        try {
          this.monacoEditor.setValue(base64);
          console.log('✅ [Tool DEBUG] Base64 value set in editor');
        } catch (setError) {
          console.error(
            '❌ [Tool DEBUG] Error setting editor value:',
            setError
          );
        }
      }

      // 然後嘗試升級到Monaco編輯器（異步，不阻塞顯示）
      console.log('🚀 [Tool DEBUG] Attempting to upgrade to Monaco editor...');
      this.loadMonacoEditor()
        .then(() => {
          if (this.monacoEditor && this.monacoEditor.setValue) {
            console.log(
              '✅ [Tool DEBUG] Monaco Editor loaded successfully, updating value'
            );
            try {
              this.monacoEditor.setValue(base64);
              console.log(
                '✅ [Tool DEBUG] Base64 value updated in Monaco editor'
              );
            } catch (setError) {
              console.error(
                '❌ [Tool DEBUG] Error updating Monaco editor value:',
                setError
              );
            }
          } else {
            console.warn(
              '⚠️ [Tool DEBUG] Monaco Editor object is null after load'
            );
          }
        })
        .catch((error) => {
          console.warn(
            '⚠️ [Tool DEBUG] Monaco Editor failed to load, keeping fallback:',
            error
          );
        });
    } catch (error) {
      console.error('❌ [Tool DEBUG] Error in displayBase64:', error);
      console.log(
        '🛠️ [Tool DEBUG] Creating immediate fallback editor due to error'
      );
      if (this.monacoEditor && this.monacoEditor.setValue) {
        try {
          this.monacoEditor.setValue(base64);
          console.log(
            '✅ [Tool DEBUG] Base64 value set in immediate fallback editor'
          );
        } catch (setError) {
          console.error(
            '❌ [Tool DEBUG] Error setting immediate fallback editor value:',
            setError
          );
        }
      }
    }

    console.log('🏁 [Tool DEBUG] displayBase64 completed');
  }

  async loadMonacoEditor() {
    // Only load if we don't have Monaco editor yet (but allow fallback editors to be upgraded)
    if (this.monacoEditor && !this.monacoEditor.isFallback) return;

    try {
      // 使用共享的 MonacoLoader
      await MonacoLoader.load();

      const container = document.getElementById('monacoContainer');
      if (!container) {
        console.error('Monaco container not found');
        return;
      }

      // Clear container if there's a fallback editor
      if (this.monacoEditor && this.monacoEditor.isFallback) {
        const currentValue = this.monacoEditor.getValue
          ? this.monacoEditor.getValue()
          : '';
        container.innerHTML = '';

        this.monacoEditor = MonacoLoader.createEditor(container, {
          value: currentValue,
          language: 'plaintext',
          readOnly: true,
          theme: 'base64-theme',
          automaticLayout: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
        });
      } else {
        this.monacoEditor = MonacoLoader.createEditor(container, {
          value: '',
          language: 'plaintext',
          readOnly: true,
          theme: 'base64-theme',
          automaticLayout: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
        });
      }

      console.log('Monaco Editor initialized successfully for Encoder');
    } catch (error) {
      console.error('Failed to load Monaco Editor:', error);
    }
  }

  updateFormatResult(format, result) {
    const container = document.getElementById('formatResults');
    const existing = document.getElementById(`result-${format}`);

    if (existing) {
      existing.remove();
    }

    if (result.success) {
      const div = document.createElement('div');
      div.id = `result-${format}`;
      div.className = `format-result ${format}`;
      div.innerHTML = `
        <div class="format-info">
          <div class="format-name">${format.toUpperCase()}</div>
          <div class="format-time">${this.formatTime(
            result.compressionTime
          )}</div>
        </div>
        <div class="format-size">${this.formatFileSize(result.size)}</div>
      `;
      container.appendChild(div);
    }

    document.getElementById('sizeComparison').style.display = 'block';
  }

  updateChart() {
    // 簡化的長條圖實作
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.encodedData) return;

    const data = [
      {
        label: '原始檔案',
        size: this.encodedData.originalSize,
        color: '#007bff',
      },
      { label: 'Base64', size: this.encodedData.base64Size, color: '#28a745' },
      {
        label: 'Base64 (gzip)',
        size: this.encodedData.gzipSize,
        color: '#ffc107',
      },
    ];

    // 加入壓縮結果
    Object.values(this.compressionResults).forEach((result) => {
      if (result.success) {
        data.push({
          label: result.format.toUpperCase(),
          size: result.size,
          color: this.getFormatColor(result.format),
        });
      }
    });

    this.drawChart(ctx, canvas, data);
  }

  drawChart(ctx, canvas, data) {
    const maxSize = Math.max(...data.map((d) => d.size));
    const leftMargin = 120;
    const rightMargin = 100;
    const topMargin = 20;
    const bottomMargin = 20;
    const chartWidth = canvas.width - leftMargin - rightMargin;

    // 動態計算條狀圖參數
    const availableHeight = canvas.height - topMargin - bottomMargin;
    const dataCount = data.length;

    // 根據數據項目數量動態調整條狀圖高度和間距
    const maxBarHeight = 40;
    const minBarHeight = 20;
    const idealSpacing = 1.5; // 間距與條狀圖高度的比例

    // 計算適合的條狀圖高度
    const totalSpaceNeeded = dataCount * maxBarHeight * idealSpacing;
    let dynamicBarHeight, dynamicBarSpacing;

    if (totalSpaceNeeded <= availableHeight) {
      // 空間充足，使用較大的條狀圖
      dynamicBarHeight = maxBarHeight;
      dynamicBarSpacing = maxBarHeight * idealSpacing;
    } else {
      // 空間不足，動態調整大小
      const spacePerBar = availableHeight / dataCount;
      dynamicBarHeight = Math.max(minBarHeight, spacePerBar / idealSpacing);
      dynamicBarSpacing = spacePerBar;
    }

    // 根據條狀圖高度調整字體大小
    const fontSize = Math.max(12, Math.min(14, dynamicBarHeight * 0.6));
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    data.forEach((item, index) => {
      const y = topMargin + index * dynamicBarSpacing;
      const barWidth = (item.size / maxSize) * chartWidth;
      const textY = y + dynamicBarHeight * 0.7; // 文字垂直居中

      // 畫長條
      ctx.fillStyle = item.color;
      ctx.fillRect(leftMargin, y, barWidth, dynamicBarHeight);

      // 畫標籤
      ctx.fillStyle = '#333';
      ctx.textAlign = 'right';
      ctx.fillText(item.label, leftMargin - 10, textY);

      // 畫數值
      ctx.textAlign = 'left';
      ctx.fillText(
        this.formatFileSize(item.size),
        leftMargin + barWidth + 10,
        textY
      );
    });
  }

  getFormatColor(format) {
    const colors = {
      png: '#ff6b6b',
      webp: '#4ecdc4',
      avif: '#45b7d1',
    };
    return colors[format] || '#6c757d';
  }

  handleQualityChange(event) {
    const quality = event.target.value;
    document.getElementById('qualityValue').textContent = quality;

    // 重新壓縮
    if (this.currentFile) {
      this.startCompression();
    }
  }

  async copyBase64() {
    if (!this.encodedData?.base64) return;

    try {
      await navigator.clipboard.writeText(this.encodedData.base64);
      this.showMessage(
        'success',
        this.translations[this.currentLanguage].copySuccess
      );
    } catch (error) {
      console.error('Copy failed:', error);
      this.showMessage('error', '複製失敗');
    }
  }

  downloadBase64() {
    if (!this.encodedData?.base64) return;

    const blob = new Blob([this.encodedData.base64], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentFile?.name || 'image'}_base64.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.showMessage(
      'success',
      this.translations[this.currentLanguage].downloadSuccess
    );
  }

  showMessage(type, message) {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');

    // 設置消息樣式
    switch (type) {
      case 'error':
        div.className = 'error-message';
        break;
      case 'success':
        div.className = 'success-message';
        break;
      case 'info':
        div.className = 'info-message';
        break;
      default:
        div.className = 'success-message';
    }

    div.textContent = message;
    container.appendChild(div);

    setTimeout(() => {
      div.remove();
    }, 4000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  destroy() {
    // 清理資源
    if (this.encoderWorker) {
      this.encoderWorker.terminate();
    }
    if (this.compressorWorker) {
      this.compressorWorker.terminate();
    }
    if (this.monacoEditor) {
      MonacoLoader.disposeEditor(this.monacoEditor);
      this.monacoEditor = null;
    }
    this.workersReady = false;
    this.encoderWorkerReady = false;
    this.compressorWorkerReady = false;
    this.workersInitPromise = null;
  }
}
