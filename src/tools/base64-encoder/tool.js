import { MonacoLoader } from '../../utils/monacoLoader.js';

export default class Base64EncoderTool {
  constructor() {
    this.currentFile = null;
    this.encodedData = null;
    this.compressionResults = {};
    this.monacoEditor = null;
    this.encoderWorker = null;
    this.compressorWorker = null;
    this.chart = null;
    
    this.currentLanguage = localStorage.getItem("preferredLanguage") || "zh-TW";
    this.translations = {
      "zh-TW": {
        title: "Base64 圖片編碼器",
        uploadText: "拖放圖片到此處，或點擊選擇檔案",
        supportedFormats: "支援格式：PNG, JPEG, GIF, WebP, AVIF, SVG",
        selectFile: "選擇檔案",
        qualityLabel: "壓縮品質",
        originalFile: "原始檔案",
        base64Size: "Base64 大小",
        gzipSize: "Base64 (gzip)",
        compressionResults: "壓縮結果",
        copyBase64: "複製 Base64",
        downloadBase64: "下載 Base64",
        processing: "處理中...",
        compressing: "壓縮中...",
        fileInfo: "檔案資訊",
        fileName: "檔案名稱",
        fileSize: "檔案大小",
        imageSize: "圖片尺寸",
        mimeType: "檔案類型",
        sizeComparison: "檔案大小比較",
        compressionTime: "壓縮時間",
        copySuccess: "已複製到剪貼簿",
        downloadSuccess: "檔案下載完成",
        error: "錯誤",
        unsupportedFile: "不支援的檔案格式",
        fileTooLarge: "檔案過大",
        processingFailed: "處理失敗"
      },
      en: {
        title: "Base64 Image Encoder",
        uploadText: "Drop images here, or click to select files",
        supportedFormats: "Supported: PNG, JPEG, GIF, WebP, AVIF, SVG",
        selectFile: "Select File",
        qualityLabel: "Compression Quality",
        originalFile: "Original File",
        base64Size: "Base64 Size",
        gzipSize: "Base64 (gzip)",
        compressionResults: "Compression Results",
        copyBase64: "Copy Base64",
        downloadBase64: "Download Base64",
        processing: "Processing...",
        compressing: "Compressing...",
        fileInfo: "File Info",
        fileName: "File Name",
        fileSize: "File Size", 
        imageSize: "Image Size",
        mimeType: "MIME Type",
        sizeComparison: "File Size Comparison",
        compressionTime: "Compression Time",
        copySuccess: "Copied to clipboard",
        downloadSuccess: "File downloaded successfully",
        error: "Error",
        unsupportedFile: "Unsupported file format",
        fileTooLarge: "File too large",
        processingFailed: "Processing failed"
      }
    };
  }

  async init(container) {
    const initStartTime = performance.now();
    console.log('🚀 [ENCODER DEBUG] === Base64 Encoder Tool Initialization Started ===');
    console.log('🔗 [ENCODER DEBUG] Container provided:', !!container);
    
    this.container = container;
    
    console.log('🛠️ [ENCODER DEBUG] Step 1: Initializing workers...');
    const workerStartTime = performance.now();
    this.initWorkers();
    console.log('⏱️ [ENCODER DEBUG] Workers init completed in:', (performance.now() - workerStartTime).toFixed(2), 'ms');
    
    console.log('🎨 [ENCODER DEBUG] Step 2: Rendering HTML...');
    const renderStartTime = performance.now();
    this.render();
    console.log('⏱️ [ENCODER DEBUG] Render completed in:', (performance.now() - renderStartTime).toFixed(2), 'ms');
    
    console.log('🎯 [ENCODER DEBUG] Step 3: Attaching events...');
    const eventsStartTime = performance.now();
    this.attachEvents();
    console.log('⏱️ [ENCODER DEBUG] Events attached in:', (performance.now() - eventsStartTime).toFixed(2), 'ms');
    
    // 檢查關鍵DOM元素是否已正確創建
    console.log('🔍 [ENCODER DEBUG] Step 4: Verifying DOM elements...');
    const keyElements = {
      uploadArea: document.getElementById('uploadArea'),
      fileInfoContainer: document.getElementById('fileInfoContainer'),
      controlPanel: document.getElementById('controlPanel'),
      editorSection: document.getElementById('editorSection'),
      monacoContainer: document.getElementById('monacoContainer'),
      sizeComparison: document.getElementById('sizeComparison'),
      chartCanvas: document.getElementById('chartCanvas'),
      progressContainer: document.getElementById('progressContainer')
    };
    
    const missingElements = Object.entries(keyElements)
      .filter(([name, element]) => !element)
      .map(([name]) => name);
    
    if (missingElements.length > 0) {
      console.error('❌ [ENCODER DEBUG] Missing DOM elements:', missingElements);
    } else {
      console.log('✅ [ENCODER DEBUG] All key DOM elements found');
    }
    
    console.log('🔍 [ENCODER DEBUG] DOM elements status:', Object.fromEntries(
      Object.entries(keyElements).map(([name, element]) => [name, !!element])
    ));
    
    // 監聽語言變更
    window.addEventListener("languageChanged", (e) => {
      console.log('🌐 [ENCODER DEBUG] Language changed to:', e.detail.language);
      this.currentLanguage = e.detail.language;
      this.render();
      this.attachEvents();
    });
    
    const totalTime = performance.now() - initStartTime;
    console.log('🎉 [ENCODER DEBUG] === Initialization Completed Successfully ===');
    console.log('⏱️ [ENCODER DEBUG] Total initialization time:', totalTime.toFixed(2), 'ms');
    console.log('📊 [ENCODER DEBUG] Final state:', {
      hasContainer: !!this.container,
      workersReady: !!this.encoderWorker && !!this.compressorWorker,
      workersFailed: this.encoderWorkerFailed || this.compressorWorkerFailed
    });
  }

  initWorkers() {
    console.log('🛠️ [ENCODER DEBUG] Initializing workers...');
    
    try {
      // 檢查Worker支援
      if (typeof Worker === 'undefined') {
        console.error('❌ [ENCODER DEBUG] Web Workers not supported');
        this.encoderWorkerFailed = true;
        this.compressorWorkerFailed = true;
        return;
      }
      
      console.log('✅ [ENCODER DEBUG] Web Workers supported');
      
      // 建立 Web Workers using webpack URL imports
      console.log('🔧 [ENCODER DEBUG] Creating encoder worker...');
      try {
        this.encoderWorker = new Worker(new URL('./encoder.worker.js', import.meta.url), { type: 'module' });
        console.log('✅ [ENCODER DEBUG] Encoder worker created successfully');
      } catch (encoderError) {
        console.error('❌ [ENCODER DEBUG] Failed to create encoder worker:', encoderError);
        this.encoderWorkerFailed = true;
      }
      
      console.log('🔧 [ENCODER DEBUG] Creating compressor worker...');
      try {
        this.compressorWorker = new Worker(new URL('./compressor.worker.js', import.meta.url), { type: 'module' });
        console.log('✅ [ENCODER DEBUG] Compressor worker created successfully');
      } catch (compressorError) {
        console.error('❌ [ENCODER DEBUG] Failed to create compressor worker:', compressorError);
        this.compressorWorkerFailed = true;
      }
      
      // 設定 Worker 訊息處理
      if (this.encoderWorker) {
        this.encoderWorker.onmessage = (e) => {
          console.log('📨 [ENCODER DEBUG] Encoder worker message received');
          this.handleEncoderMessage(e);
        };
        console.log('✅ [ENCODER DEBUG] Encoder worker message handler set');
      }
      
      if (this.compressorWorker) {
        this.compressorWorker.onmessage = (e) => {
          console.log('📨 [ENCODER DEBUG] Compressor worker message received');
          this.handleCompressorMessage(e);
        };
        console.log('✅ [ENCODER DEBUG] Compressor worker message handler set');
      }
      
      // 設定錯誤處理
      if (this.encoderWorker) {
        this.encoderWorker.onerror = (error) => {
          console.error('❌ [ENCODER DEBUG] Encoder worker error:', error);
          this.encoderWorkerFailed = true;
          this.showMessage('error', '編碼器載入失敗，將使用降級方案');
        };
        console.log('✅ [ENCODER DEBUG] Encoder worker error handler set');
      }
      
      if (this.compressorWorker) {
        this.compressorWorker.onerror = (error) => {
          console.error('❌ [ENCODER DEBUG] Compressor worker error:', error);
          this.compressorWorkerFailed = true;
          this.showMessage('error', '壓縮器載入失敗，將跳過壓縮功能');
        };
        console.log('✅ [ENCODER DEBUG] Compressor worker error handler set');
      }
      
      console.log('🎉 [ENCODER DEBUG] Workers initialized successfully:', {
        encoderWorker: !!this.encoderWorker,
        compressorWorker: !!this.compressorWorker,
        encoderFailed: this.encoderWorkerFailed,
        compressorFailed: this.compressorWorkerFailed
      });
    } catch (error) {
      console.error('❌ [ENCODER DEBUG] Failed to initialize workers:', error);
      console.error('Worker init error stack:', error.stack);
      this.encoderWorkerFailed = true;
      this.compressorWorkerFailed = true;
      this.showMessage('error', '工具初始化失敗，將使用降級方案');
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
          <div style="color: #999; font-size: 0.9em; margin-bottom: 15px;">${t.supportedFormats}</div>
          <button class="btn" id="selectBtn">${t.selectFile}</button>
          <input type="file" class="file-input" id="fileInput" accept="image/*">
        </div>

        <!-- 控制面板 -->
        <div class="control-panel" id="controlPanel" style="display: none;">
          <div class="quality-control">
            <label>${t.qualityLabel}: <span class="quality-value" id="qualityValue">75</span></label>
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
            <h3 class="editor-title">Base64 ${t.result || "結果"}</h3>
            <div class="editor-actions">
              <button class="btn btn-small btn-secondary" id="copyBtn">${t.copyBase64}</button>
              <button class="btn btn-small btn-secondary" id="downloadBtn">${t.downloadBase64}</button>
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
    qualitySlider?.addEventListener('input', (e) => this.handleQualityChange(e));

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
    const startTime = performance.now();
    console.log('🔥 [ENCODER DEBUG] Processing file started:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    if (!this.isValidImageFile(file)) {
      console.error('❌ [ENCODER DEBUG] Invalid file type:', file.type);
      this.showMessage('error', this.translations[this.currentLanguage].unsupportedFile);
      return;
    }

    console.log('✅ [ENCODER DEBUG] File validation passed');

    this.currentFile = file;
    
    console.log('📝 [ENCODER DEBUG] Starting showFileInfo...');
    this.showFileInfo(file);
    
    console.log('📊 [ENCODER DEBUG] Starting progress indicator...');
    this.showProgress(true);
    
    console.log('⚙️ [ENCODER DEBUG] Starting file encoding...');
    // 開始編碼
    await this.encodeFile(file);
    
    const endTime = performance.now();
    console.log('🏁 [ENCODER DEBUG] ProcessFile completed in:', (endTime - startTime).toFixed(2), 'ms');
  }

  isValidImageFile(file) {
    const validTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 
      'image/webp', 'image/avif', 'image/svg+xml'
    ];
    return validTypes.includes(file.type);
  }

  showFileInfo(file) {
    console.log('📝 [ENCODER DEBUG] showFileInfo called with:', file.name);
    
    // 檢查所有DOM元素
    const elements = {
      fileName: document.getElementById('fileName'),
      fileSize: document.getElementById('fileSize'),
      mimeType: document.getElementById('mimeType'),
      imageSize: document.getElementById('imageSize'),
      fileInfoContainer: document.getElementById('fileInfoContainer'),
      controlPanel: document.getElementById('controlPanel')
    };
    
    console.log('🔍 [ENCODER DEBUG] DOM elements check:', {
      fileName: !!elements.fileName,
      fileSize: !!elements.fileSize,
      mimeType: !!elements.mimeType,
      imageSize: !!elements.imageSize,
      fileInfoContainer: !!elements.fileInfoContainer,
      controlPanel: !!elements.controlPanel
    });
    
    if (elements.fileName) {
      elements.fileName.textContent = file.name;
      console.log('✅ [ENCODER DEBUG] File name set:', file.name);
    } else {
      console.error('❌ [ENCODER DEBUG] fileName element not found');
    }
    
    if (elements.fileSize) {
      elements.fileSize.textContent = this.formatFileSize(file.size);
      console.log('✅ [ENCODER DEBUG] File size set:', this.formatFileSize(file.size));
    } else {
      console.error('❌ [ENCODER DEBUG] fileSize element not found');
    }
    
    if (elements.mimeType) {
      elements.mimeType.textContent = file.type;
      console.log('✅ [ENCODER DEBUG] MIME type set:', file.type);
    } else {
      console.error('❌ [ENCODER DEBUG] mimeType element not found');
    }
    
    // 如果是圖片，獲取尺寸
    if (file.type.startsWith('image/')) {
      console.log('🖼️ [ENCODER DEBUG] Getting image dimensions...');
      this.getImageDimensions(file).then(dimensions => {
        const dimensionText = dimensions ? `${dimensions.width} x ${dimensions.height}` : '-';
        if (elements.imageSize) {
          elements.imageSize.textContent = dimensionText;
          console.log('✅ [ENCODER DEBUG] Image dimensions set:', dimensionText);
        } else {
          console.error('❌ [ENCODER DEBUG] imageSize element not found');
        }
      }).catch(error => {
        console.error('❌ [ENCODER DEBUG] Error getting image dimensions:', error);
      });
    }
    
    // 顯示檔案資訊容器
    if (elements.fileInfoContainer) {
      elements.fileInfoContainer.style.display = 'grid';
      console.log('✅ [ENCODER DEBUG] fileInfoContainer made visible');
    } else {
      console.error('❌ [ENCODER DEBUG] fileInfoContainer not found');
    }
    
    // 顯示控制面板
    if (elements.controlPanel) {
      elements.controlPanel.style.display = 'block';
      console.log('✅ [ENCODER DEBUG] controlPanel made visible');
    } else {
      console.error('❌ [ENCODER DEBUG] controlPanel not found');
    }
    
    // 縮小上傳區域
    console.log('📦 [ENCODER DEBUG] Minimizing upload area...');
    this.minimizeUploadArea();
    
    console.log('🏁 [ENCODER DEBUG] showFileInfo completed');
  }

  minimizeUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.classList.add('minimized');
    }
  }

  showSizeInfo(result) {
    console.log('📋 [ENCODER DEBUG] showSizeInfo called with:', {
      hasResult: !!result,
      base64Size: result?.base64Size,
      gzipSize: result?.gzipSize
    });
    
    // 更新檔案資訊區域以顯示 base64 和 gzip 大小
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    if (!fileInfoContainer) {
      console.error('❌ [ENCODER DEBUG] fileInfoContainer not found');
      return;
    }
    
    console.log('🔍 [ENCODER DEBUG] fileInfoContainer found, current children count:', fileInfoContainer.children.length);
    
    try {
      // 添加 Base64 大小資訊
      let base64SizeElement = document.getElementById('base64Size');
      if (!base64SizeElement) {
        console.log('📦 [ENCODER DEBUG] Creating base64Size info element');
        base64SizeElement = this.createInfoElement('base64Size', 'Base64 大小');
      }
      
      if (base64SizeElement) {
        const valueElement = base64SizeElement.querySelector('.info-value');
        if (valueElement) {
          valueElement.textContent = this.formatFileSize(result.base64Size);
          console.log('✅ [ENCODER DEBUG] Base64 size info updated:', this.formatFileSize(result.base64Size));
        } else {
          console.error('❌ [ENCODER DEBUG] .info-value not found in base64SizeElement');
        }
      }
      
      // 添加 Gzip 大小資訊
      let gzipSizeElement = document.getElementById('gzipSize');
      if (!gzipSizeElement) {
        console.log('📦 [ENCODER DEBUG] Creating gzipSize info element');
        gzipSizeElement = this.createInfoElement('gzipSize', 'Base64 (gzip)');
      }
      
      if (gzipSizeElement) {
        const valueElement = gzipSizeElement.querySelector('.info-value');
        if (valueElement) {
          valueElement.textContent = this.formatFileSize(result.gzipSize);
          console.log('✅ [ENCODER DEBUG] Gzip size info updated:', this.formatFileSize(result.gzipSize));
        } else {
          console.error('❌ [ENCODER DEBUG] .info-value not found in gzipSizeElement');
        }
      }
      
      console.log('🏁 [ENCODER DEBUG] showSizeInfo completed successfully');
    } catch (error) {
      console.error('❌ [ENCODER DEBUG] Error in showSizeInfo:', error);
      console.error('showSizeInfo error stack:', error.stack);
    }
  }

  showBasicSizeComparison() {
    console.log('📊 [ENCODER DEBUG] showBasicSizeComparison called');
    
    // 檢查必要數據
    console.log('🔍 [ENCODER DEBUG] Encoded data check:', {
      hasEncodedData: !!this.encodedData,
      originalSize: this.encodedData?.originalSize,
      base64Size: this.encodedData?.base64Size,
      gzipSize: this.encodedData?.gzipSize
    });
    
    // 立即顯示size comparison區域，不等待壓縮完成
    const sizeComparison = document.getElementById('sizeComparison');
    const chartCanvas = document.getElementById('chartCanvas');
    const compressionResults = document.getElementById('compressionResults');
    
    console.log('🔍 [ENCODER DEBUG] Size comparison elements check:', {
      sizeComparison: !!sizeComparison,
      chartCanvas: !!chartCanvas,
      compressionResults: !!compressionResults
    });
    
    if (sizeComparison) {
      const wasVisible = sizeComparison.style.display !== 'none';
      sizeComparison.style.display = 'block';
      console.log('✅ [ENCODER DEBUG] Size comparison section made visible (was visible:', wasVisible, ')');
      
      // 立即更新基礎圖表（不包含壓縮格式）
      console.log('📈 [ENCODER DEBUG] Starting chart update...');
      try {
        this.updateChart();
        console.log('✅ [ENCODER DEBUG] Chart updated successfully');
      } catch (error) {
        console.error('❌ [ENCODER DEBUG] Error updating chart:', error);
        console.error('Chart error stack:', error.stack);
      }
      
      // 檢查圖表渲染狀態
      if (chartCanvas) {
        const canvasContext = chartCanvas.getContext('2d');
        const imageData = canvasContext.getImageData(0, 0, 50, 50);
        const hasData = Array.from(imageData.data).some(pixel => pixel !== 0);
        console.log('🔍 [ENCODER DEBUG] Chart render status:', {
          canvasWidth: chartCanvas.width,
          canvasHeight: chartCanvas.height,
          hasRenderedContent: hasData
        });
      }
    } else {
      console.error('❌ [ENCODER DEBUG] Size comparison section not found in DOM');
    }
    
    console.log('🏁 [ENCODER DEBUG] showBasicSizeComparison completed');
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
      container.style.display = 'block';
      fill.style.width = `${progress}%`;
      textEl.textContent = text;
    } else {
      container.style.display = 'none';
    }
  }

  async encodeFile(file) {
    const startTime = performance.now();
    console.log('⚙️ [ENCODER DEBUG] encodeFile started:', {
      fileName: file.name,
      size: file.size,
      timestamp: new Date().toISOString()
    });
    
    // 檢查Worker狀態
    console.log('🔍 [ENCODER DEBUG] Worker status:', {
      hasEncoderWorker: !!this.encoderWorker,
      encoderWorkerFailed: this.encoderWorkerFailed
    });
    
    // 檢查是否需要使用降級方案
    if (!this.encoderWorker || this.encoderWorkerFailed) {
      console.log('⬇️ [ENCODER DEBUG] Using fallback encoding method');
      await this.fallbackEncodeFile(file);
      return;
    }
    
    const workerId = Date.now();
    console.log('🚀 [ENCODER DEBUG] Starting file encoding with worker:', { 
      fileName: file.name, 
      size: file.size, 
      workerId,
      workerReady: this.encoderWorker.readyState === undefined ? 'ready' : this.encoderWorker.readyState
    });
    
    // 發送編碼請求到Worker
    try {
      console.log('📦 [ENCODER DEBUG] Preparing file for worker transfer:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // File對象無法直接傳遞到Worker，需要使用Transferable Objects
      // 先轉換為ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log('🔄 [ENCODER DEBUG] File converted to ArrayBuffer:', arrayBuffer.byteLength, 'bytes');
      
      this.encoderWorker.postMessage({
        type: 'encode',
        data: { 
          arrayBuffer: arrayBuffer,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          includePrefix: true 
        },
        id: workerId
      }, [arrayBuffer]); // Transfer ArrayBuffer
      
      console.log('✅ [ENCODER DEBUG] Message sent to worker successfully with ArrayBuffer transfer');
    } catch (error) {
      console.error('❌ [ENCODER DEBUG] Error sending message to worker:', error);
      console.log('⬇️ [ENCODER DEBUG] Falling back to fallback encoding');
      await this.fallbackEncodeFile(file);
    }
  }

  async fallbackEncodeFile(file) {
    console.log('Starting fallback file encoding:', { fileName: file.name, size: file.size });
    
    this.showProgress(true, '編碼圖片中...', 30);
    
    try {
      // 使用FileReader直接編碼
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      this.showProgress(true, '編碼圖片中...', 80);
      
      // 計算大小資訊
      const originalSize = file.size;
      const base64Size = dataUrl.length;
      const gzipSize = base64Size; // 降級方案中無法計算真實gzip大小
      
      const result = {
        base64: dataUrl,
        originalSize,
        base64Size,
        gzipSize,
        mimeType: file.type,
        fileName: file.name
      };
      
      this.encodedData = result;
      this.showProgress(false);
      
      // 立即顯示所有區塊
      this.showAllSections();
      
      this.displayBase64(result.base64);
      this.showSizeInfo(result);
      this.showBasicSizeComparison();
      
      // 嘗試壓縮（如果壓縮器可用）
      if (!this.compressorWorkerFailed) {
        this.startCompression();
      }
      
      console.log('Fallback encoding completed successfully');
    } catch (error) {
      console.error('Fallback encoding failed:', error);
      this.showProgress(false);
      this.showMessage('error', '圖片編碼失敗');
    }
  }

  handleEncoderMessage(event) {
    const { type, id, result, error } = event.data;
    console.log('📨 [ENCODER DEBUG] Worker message received:', { 
      type, 
      id, 
      hasResult: !!result, 
      error,
      timestamp: new Date().toISOString()
    });
    
    switch (type) {
      case 'progress':
        const { step, progress } = event.data;
        console.log('📈 [ENCODER DEBUG] Progress update:', { step, progress });
        this.showProgress(true, this.getProgressText(step), progress);
        break;
        
      case 'encoded':
        const encodingEndTime = performance.now();
        console.log('🎉 [ENCODER DEBUG] Encoded result received:', {
          base64Length: result?.base64?.length,
          originalSize: result?.originalSize,
          base64Size: result?.base64Size,
          gzipSize: result?.gzipSize,
          hasBase64Data: !!result?.base64
        });
        
        this.encodedData = result;
        console.log('📊 [ENCODER DEBUG] Hiding progress indicator...');
        this.showProgress(false);
        
        if (result?.base64) {
          console.log('✨ [ENCODER DEBUG] Starting UI display sequence...');
          
          // 立即顯示所有區塊，而非等待各別函數完成
          console.log('🖥️ [ENCODER DEBUG] Step 1: Showing all sections...');
          this.showAllSections();
          
          console.log('📝 [ENCODER DEBUG] Step 2: Displaying Base64...');
          this.displayBase64(result.base64);
          
          console.log('📋 [ENCODER DEBUG] Step 3: Showing size info...');
          this.showSizeInfo(result);
          
          console.log('📊 [ENCODER DEBUG] Step 4: Showing size comparison...');
          this.showBasicSizeComparison();
          
          console.log('✅ [ENCODER DEBUG] UI display sequence completed');
        } else {
          console.error('❌ [ENCODER DEBUG] No base64 data in result');
          this.showMessage('error', 'Base64 編碼失敗');
        }
        
        console.log('🗜️ [ENCODER DEBUG] Starting compression...');
        this.startCompression();
        break;
        
      case 'error':
        console.error('❌ [ENCODER DEBUG] Encoder worker error:', error);
        this.showProgress(false);
        this.showMessage('error', error);
        break;
        
      default:
        console.warn('⚠️ [ENCODER DEBUG] Unknown message type from worker:', type);
        break;
    }
  }

  showAllSections() {
    console.log('🖥️ [ENCODER DEBUG] showAllSections called');
    
    // 立即顯示所有主要區域
    const elements = {
      editorSection: document.getElementById('editorSection'),
      sizeComparison: document.getElementById('sizeComparison'),
      monacoContainer: document.getElementById('monacoContainer')
    };
    
    console.log('🔍 [ENCODER DEBUG] Main sections DOM check:', {
      editorSection: !!elements.editorSection,
      sizeComparison: !!elements.sizeComparison,
      monacoContainer: !!elements.monacoContainer
    });
    
    if (elements.editorSection) {
      const wasVisible = elements.editorSection.style.display !== 'none';
      elements.editorSection.style.display = 'block';
      console.log('✅ [ENCODER DEBUG] editorSection made visible (was visible:', wasVisible, ')');
      
      // 檢查Monaco容器
      if (elements.monacoContainer) {
        const containerRect = elements.monacoContainer.getBoundingClientRect();
        console.log('🔍 [ENCODER DEBUG] monacoContainer dimensions:', {
          width: containerRect.width,
          height: containerRect.height,
          visible: containerRect.width > 0 && containerRect.height > 0
        });
      }
    } else {
      console.error('❌ [ENCODER DEBUG] editorSection element not found in DOM');
    }
    
    if (elements.sizeComparison) {
      const wasVisible = elements.sizeComparison.style.display !== 'none';
      elements.sizeComparison.style.display = 'block';
      console.log('✅ [ENCODER DEBUG] sizeComparison made visible (was visible:', wasVisible, ')');
      
      // 檢查圖表容器
      const chartCanvas = document.getElementById('chartCanvas');
      if (chartCanvas) {
        const canvasRect = chartCanvas.getBoundingClientRect();
        console.log('🔍 [ENCODER DEBUG] chartCanvas dimensions:', {
          width: canvasRect.width,
          height: canvasRect.height,
          visible: canvasRect.width > 0 && canvasRect.height > 0
        });
      } else {
        console.error('❌ [ENCODER DEBUG] chartCanvas not found');
      }
    } else {
      console.error('❌ [ENCODER DEBUG] sizeComparison element not found in DOM');
    }
    
    console.log('🏁 [ENCODER DEBUG] showAllSections completed');
  }

  async startCompression() {
    if (!this.compressorWorker || this.compressorWorkerFailed || !this.currentFile) {
      console.log('Compression not available:', { 
        hasWorker: !!this.compressorWorker, 
        workerFailed: this.compressorWorkerFailed,
        hasFile: !!this.currentFile 
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
        formats: ['png', 'webp', 'avif']
      },
      id: workerId
    });
  }

  handleCompressorMessage(event) {
    const { type, id, result, format, results, error } = event.data;
    console.log('Compressor message received:', { type, id, format, result: result ? 'data available' : 'no data', error });
    
    switch (type) {
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
      compressing_avif: '壓縮 AVIF...'
    };
    return texts[step] || '處理中...';
  }

  async displayBase64(base64) {
    console.log('📝 [ENCODER DEBUG] displayBase64 called:', { 
      base64Length: base64?.length,
      hasExistingEditor: !!this.monacoEditor
    });
    
    const container = document.getElementById('monacoContainer');
    if (!container) {
      console.error('❌ [ENCODER DEBUG] monacoContainer not found in DOM');
      return;
    }
    
    console.log('🔍 [ENCODER DEBUG] Monaco container found:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: getComputedStyle(container).display,
      visibility: getComputedStyle(container).visibility
    });
    
    try {
      // 嘗試載入Monaco編輯器（異步，但不阻塞其他顯示）
      console.log('🚀 [ENCODER DEBUG] Starting Monaco editor loading...');
      this.loadMonacoEditor().then(() => {
        if (this.monacoEditor) {
          console.log('✅ [ENCODER DEBUG] Monaco Editor loaded successfully, setting value');
          try {
            this.monacoEditor.setValue(base64);
            console.log('✅ [ENCODER DEBUG] Base64 value set in Monaco editor');
          } catch (setError) {
            console.error('❌ [ENCODER DEBUG] Error setting Monaco editor value:', setError);
          }
        } else {
          console.warn('⚠️ [ENCODER DEBUG] Monaco Editor object is null after load');
        }
      }).catch(error => {
        console.warn('⚠️ [ENCODER DEBUG] Monaco Editor failed to load, using fallback:', error);
        this.createFallbackEditor();
        if (this.monacoEditor) {
          try {
            this.monacoEditor.setValue(base64);
            console.log('✅ [ENCODER DEBUG] Base64 value set in fallback editor');
          } catch (setError) {
            console.error('❌ [ENCODER DEBUG] Error setting fallback editor value:', setError);
          }
        }
      });
      
      // 立即創建fallback以防Monaco載入失敗
      setTimeout(() => {
        if (!this.monacoEditor) {
          console.log('⏰ [ENCODER DEBUG] Monaco Editor not loaded after timeout, creating fallback');
          this.createFallbackEditor();
          if (this.monacoEditor) {
            try {
              this.monacoEditor.setValue(base64);
              console.log('✅ [ENCODER DEBUG] Base64 value set in timeout fallback editor');
            } catch (setError) {
              console.error('❌ [ENCODER DEBUG] Error setting timeout fallback editor value:', setError);
            }
          }
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ [ENCODER DEBUG] Error in displayBase64:', error);
      // 立即創建fallback編輯器
      console.log('🛠️ [ENCODER DEBUG] Creating immediate fallback editor');
      this.createFallbackEditor();
      if (this.monacoEditor) {
        try {
          this.monacoEditor.setValue(base64);
          console.log('✅ [ENCODER DEBUG] Base64 value set in immediate fallback editor');
        } catch (setError) {
          console.error('❌ [ENCODER DEBUG] Error setting immediate fallback editor value:', setError);
        }
      }
    }
    
    console.log('🏁 [ENCODER DEBUG] displayBase64 completed');
  }

  async loadMonacoEditor() {
    if (this.monacoEditor) return;
    
    try {
      // 使用共享的 MonacoLoader
      await MonacoLoader.load();
      
      const container = document.getElementById('monacoContainer');
      if (!container) {
        console.error('Monaco container not found');
        return;
      }

      this.monacoEditor = MonacoLoader.createEditor(container, {
        value: '',
        language: 'plaintext',
        readOnly: true,
        theme: 'base64-theme',
        automaticLayout: true,
        wordWrap: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false
      });
      
      console.log('Monaco Editor initialized successfully for Encoder');
    } catch (error) {
      console.error('Failed to load Monaco Editor:', error);
      // 使用共享的 fallback editor
      this.createFallbackEditor();
    }
  }

  createFallbackEditor() {
    const container = document.getElementById('monacoContainer');
    if (container) {
      this.monacoEditor = MonacoLoader.createFallbackEditor(container, {
        value: '',
        readOnly: true
      });
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
          <div class="format-time">${this.formatTime(result.compressionTime)}</div>
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
      { label: '原始檔案', size: this.encodedData.originalSize, color: '#007bff' },
      { label: 'Base64', size: this.encodedData.base64Size, color: '#28a745' },
      { label: 'Base64 (gzip)', size: this.encodedData.gzipSize, color: '#ffc107' }
    ];
    
    // 加入壓縮結果
    Object.values(this.compressionResults).forEach(result => {
      if (result.success) {
        data.push({
          label: result.format.toUpperCase(),
          size: result.size,
          color: this.getFormatColor(result.format)
        });
      }
    });
    
    this.drawChart(ctx, canvas, data);
  }

  drawChart(ctx, canvas, data) {
    const maxSize = Math.max(...data.map(d => d.size));
    const barHeight = 40;
    const barSpacing = 60;
    const leftMargin = 120;
    const rightMargin = 100;
    const chartWidth = canvas.width - leftMargin - rightMargin;
    
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    data.forEach((item, index) => {
      const y = 20 + index * barSpacing;
      const barWidth = (item.size / maxSize) * chartWidth;
      
      // 畫長條
      ctx.fillStyle = item.color;
      ctx.fillRect(leftMargin, y, barWidth, barHeight);
      
      // 畫標籤
      ctx.fillStyle = '#333';
      ctx.textAlign = 'right';
      ctx.fillText(item.label, leftMargin - 10, y + 25);
      
      // 畫數值
      ctx.textAlign = 'left';
      ctx.fillText(
        this.formatFileSize(item.size), 
        leftMargin + barWidth + 10, 
        y + 25
      );
    });
  }

  getFormatColor(format) {
    const colors = {
      png: '#ff6b6b',
      webp: '#4ecdc4', 
      avif: '#45b7d1'
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
      this.showMessage('success', this.translations[this.currentLanguage].copySuccess);
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
    
    this.showMessage('success', this.translations[this.currentLanguage].downloadSuccess);
  }

  showMessage(type, message) {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');
    
    // 設置消息樣式
    switch(type) {
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
  }
}