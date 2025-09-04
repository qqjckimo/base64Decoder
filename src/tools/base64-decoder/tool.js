import { MonacoLoader } from '../../utils/monacoLoader.js';

export default class Base64DecoderTool {
  constructor() {
    this.currentCanvas = null;
    this.currentContext = null;
    this.editor = null;
    this.editorContainer = null;
    this.currentLanguage = localStorage.getItem("preferredLanguage") || "zh-TW";
    this.translations = {
      "zh-TW": {
        title: "Base64 圖片解碼",
        inputPlaceholder: "在此貼上 Base64 編碼的圖片字串...",
        loadingEditor: "正在載入編輯器...",
        enhancedEditor: "✨ 增強編輯器",
        largeFileSupport: "支援大型檔案",
        editorFeatures: "支援大型 Base64 字串、語法高亮、搜尋替換",
        decode: "解碼圖片",
        clear: "清除",
        loadExample: "載入範例",
        imageInfo: "圖片資訊",
        dimensions: "尺寸",
        format: "格式",
        fileSize: "檔案大小",
        totalPixels: "總像素數",
        pixelAnalysis: "像素分析",
        uniqueColors: "不同顏色數",
        avgBrightness: "平均亮度",
        transparentPixels: "透明像素",
        dominantColors: "主要顏色",
        clickedPixel: "點擊像素資訊",
        coordinates: "座標",
        waitingText: "等待圖片解碼...",
        loadFailed: "圖片載入失敗",
        pleaseInputBase64: "請輸入 Base64 編碼",
        decodeSuccess: "圖片解碼成功",
        decodeError: "解碼失敗，請檢查 Base64 格式",
        aboutSize: "約",
      },
      en: {
        title: "Base64 Image Decoder",
        inputPlaceholder: "Paste Base64 encoded image string here...",
        loadingEditor: "Loading editor...",
        enhancedEditor: "✨ Enhanced Editor",
        largeFileSupport: "Large File Support",
        editorFeatures: "Supports large Base64 strings, syntax highlighting, find & replace",
        decode: "Decode Image",
        clear: "Clear",
        loadExample: "Load Example",
        imageInfo: "Image Info",
        dimensions: "Dimensions",
        format: "Format",
        fileSize: "File Size",
        totalPixels: "Total Pixels",
        pixelAnalysis: "Pixel Analysis",
        uniqueColors: "Unique Colors",
        avgBrightness: "Avg Brightness",
        transparentPixels: "Transparent Pixels",
        dominantColors: "Dominant Colors",
        clickedPixel: "Clicked Pixel Info",
        coordinates: "Coordinates",
        waitingText: "Waiting for image decode...",
        loadFailed: "Image load failed",
        pleaseInputBase64: "Please input Base64 code",
        decodeSuccess: "Image decoded successfully",
        decodeError: "Decode failed, please check Base64 format",
        aboutSize: "About",
      },
    };
  }

  async init(container) {
    this.container = container;
    this.render();
    await this.initMonacoEditor();
    this.attachEvents();

    // Listen for global language changes
    window.addEventListener("languageChanged", async (e) => {
      const editorValue = this.editor?.getValue() || '';
      this.currentLanguage = e.detail.language;
      this.render();
      await this.initMonacoEditor();
      if (editorValue) {
        this.editor.setValue(editorValue);
      }
      this.attachEvents();
    });
  }

  async initMonacoEditor() {
    const t = this.translations[this.currentLanguage];
    this.editorContainer = this.container.querySelector('#monacoEditorContainer');
    
    if (!this.editorContainer) return;

    // Show loading spinner
    this.editorContainer.innerHTML = `
      <div class="editor-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">${t.loadingEditor}</div>
      </div>
    `;

    try {
      // Load Monaco Editor from CDN
      await MonacoLoader.load();
      
      // Clear loading state
      this.editorContainer.innerHTML = '';
      
      // Create editor instance with error handling
      this.editor = MonacoLoader.createEditor(this.editorContainer, {
        value: '',
        language: 'plaintext',
        automaticLayout: true
      });

      // Set up drag and drop for editor
      this.setupEditorDragDrop();
      
      // Show enhanced editor badge
      this.showEditorBadge();
      
      console.log('Monaco Editor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
      this.fallbackToTextarea(t);
    }
  }

  showEditorBadge() {
    const badge = this.container.querySelector('#editorBadge');
    if (badge) {
      badge.style.display = 'flex';
      // Add a subtle animation
      badge.style.opacity = '0';
      setTimeout(() => {
        badge.style.opacity = '1';
      }, 100);
    }
  }

  hideEditorBadge() {
    const badge = this.container.querySelector('#editorBadge');
    if (badge) {
      badge.style.display = 'none';
    }
  }

  fallbackToTextarea(t) {
    // Fallback to textarea
    this.editor = null;
    this.hideEditorBadge();
    this.editorContainer.innerHTML = `
      <textarea 
        id="base64Input" 
        placeholder="${t.inputPlaceholder}"
        rows="3"
      ></textarea>
    `;
    
    // Set up drag and drop for textarea fallback
    const textarea = this.editorContainer.querySelector('#base64Input');
    if (textarea) {
      textarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        textarea.classList.add('dragover');
      });

      textarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        textarea.classList.remove('dragover');
      });

      textarea.addEventListener('drop', (e) => {
        e.preventDefault();
        textarea.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            textarea.value = e.target.result;
            this.decode();
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  setupEditorDragDrop() {
    if (!this.editor || !this.editorContainer) return;

    const editorDom = this.editorContainer.querySelector('.monaco-editor');
    if (!editorDom) return;

    editorDom.addEventListener('dragover', (e) => {
      e.preventDefault();
      editorDom.classList.add('dragover');
    });

    editorDom.addEventListener('dragleave', (e) => {
      e.preventDefault();
      editorDom.classList.remove('dragover');
    });

    editorDom.addEventListener('drop', (e) => {
      e.preventDefault();
      editorDom.classList.remove('dragover');

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.editor.setValue(e.target.result);
          this.decode();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  render() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
            <div class="base64-decoder-tool">
                <div class="tool-header">
                    <h2>${t.title}</h2>
                </div>
                
                <div class="tool-grid">
                    <div class="card input-section">
                        <div class="input-header">
                            <h3>${t.inputPlaceholder.split("\n")[0]}</h3>
                            <div id="editorBadge" class="editor-badge" style="display: none;" title="${t.editorFeatures}">
                                <span class="badge-text">${t.enhancedEditor}</span>
                                <span class="badge-subtitle">${t.largeFileSupport}</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <div id="monacoEditorContainer" class="monaco-editor-wrapper"></div>
                        </div>
                        
                        <div class="button-group">
                            <button class="btn btn-primary" data-action="decode">
                                ${t.decode}
                            </button>
                            <button class="btn btn-secondary" data-action="clear">
                                ${t.clear}
                            </button>
                            <button class="btn btn-secondary" data-action="loadExample">
                                ${t.loadExample}
                            </button>
                        </div>
                        
                        <div id="alertMessage" class="alert" style="display: none;"></div>
                    </div>
                    
                    <div class="card image-display">
                        <h3>${t.waitingText.replace("...", "")}</h3>
                        <div id="imageContainer" class="image-container">
                            <div class="placeholder">${t.waitingText}</div>
                        </div>
                        
                        <div id="imageInfo" class="image-info" style="display: none;">
                            <div class="info-row">
                                <span class="info-label">${t.dimensions}:</span>
                                <span class="info-value" id="imageDimensions"></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">${t.format}:</span>
                                <span class="info-value" id="imageFormat"></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">${t.fileSize}:</span>
                                <span class="info-value" id="fileSize"></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">${
                                  t.totalPixels
                                }:</span>
                                <span class="info-value" id="totalPixels"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card pixel-analysis-section">
                        <h3>${t.pixelAnalysis}</h3>
                        <div id="pixelAnalysis" style="display: none;">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value" id="uniqueColors">0</div>
                                    <div class="stat-label">${
                                      t.uniqueColors
                                    }</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="avgBrightness">0%</div>
                                    <div class="stat-label">${
                                      t.avgBrightness
                                    }</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="transparentPixels">0</div>
                                    <div class="stat-label">${
                                      t.transparentPixels
                                    }</div>
                                </div>
                            </div>
                            
                            <div class="collapsible-section" style="margin-top: 15px;">
                                <h4 class="collapsible-header" data-action="toggleDominantColors">
                                    <span class="collapse-icon">▼</span>
                                    ${t.dominantColors}
                                </h4>
                                <div id="dominantColors" class="collapsible-content"></div>
                            </div>
                            
                            <div style="margin-top: 15px;">
                                <h4 style="margin-bottom: 10px;">${
                                  t.clickedPixel
                                }</h4>
                                <div id="clickedPixelInfo" class="color-info" style="display: none;">
                                    <div class="color-preview" id="clickedColorPreview"></div>
                                    <div class="info-row">
                                        <span class="info-label">${
                                          t.coordinates
                                        }:</span>
                                        <span class="info-value" id="pixelCoords">-</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">RGB:</span>
                                        <span class="info-value" id="pixelRGB">-</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">HEX:</span>
                                        <span class="info-value" id="pixelHEX">-</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">HSL:</span>
                                        <span class="info-value" id="pixelHSL">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  attachEvents() {
    this.container.addEventListener("click", (e) => {
      const action =
        e.target.dataset.action ||
        e.target.closest("[data-action]")?.dataset.action;
      if (action) {
        this[action]?.();
      }
    });

    // Handle paste events
    document.addEventListener("paste", (e) => {
      if (!this.container.contains(document.activeElement)) return;
      
      // Check if Monaco editor is focused
      if (this.editor && this.editor.hasTextFocus()) {
        const items = e.clipboardData.items;
        for (let item of items) {
          if (item.type.indexOf("image") !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
              this.editor.setValue(e.target.result);
              this.decode();
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    });

    // Fallback for textarea if Monaco fails to load
    const textarea = this.container.querySelector("#base64Input");
    if (textarea) {
      textarea.addEventListener("dragover", (e) => {
        e.preventDefault();
        textarea.classList.add("dragover");
      });

      textarea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        textarea.classList.remove("dragover");
      });

      textarea.addEventListener("drop", (e) => {
        e.preventDefault();
        textarea.classList.remove("dragover");

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            textarea.value = e.target.result;
            this.decode();
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  showAlert(message, type = "error") {
    const alertDiv = this.container.querySelector("#alertMessage");
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = "block";

    setTimeout(() => {
      alertDiv.style.display = "none";
    }, 3000);
  }

  decode() {
    // Get value from Monaco editor or fallback textarea
    let input = '';
    if (this.editor) {
      input = this.editor.getValue().trim();
    } else {
      const textarea = this.container.querySelector("#base64Input");
      if (textarea) {
        input = textarea.value.trim();
      }
    }
    const t = this.translations[this.currentLanguage];

    if (!input) {
      this.showAlert(t.pleaseInputBase64);
      return;
    }

    let base64String = input;

    if (!input.startsWith("data:image")) {
      if (input.startsWith("iVBORw0")) {
        base64String = "data:image/png;base64," + input;
      } else if (input.startsWith("/9j/")) {
        base64String = "data:image/jpeg;base64," + input;
      } else if (input.startsWith("R0lGOD")) {
        base64String = "data:image/gif;base64," + input;
      } else {
        base64String = "data:image/png;base64," + input;
      }
    }

    const img = new Image();

    img.onload = () => {
      this.displayImage(img, base64String);
      this.analyzePixels(img);
      this.showAlert(t.decodeSuccess, "success");
    };

    img.onerror = () => {
      this.showAlert(t.decodeError);
      const container = this.container.querySelector("#imageContainer");
      container.innerHTML = `<div class="placeholder">${t.loadFailed}</div>`;
    };

    img.src = base64String;
  }

  displayImage(img, base64String) {
    const container = this.container.querySelector("#imageContainer");
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    this.currentCanvas = canvas;
    this.currentContext = ctx;

    container.innerHTML = "";
    container.appendChild(canvas);

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      this.showPixelInfo(x, y);
    });

    this.container.querySelector("#imageInfo").style.display = "block";
    this.container.querySelector(
      "#imageDimensions"
    ).textContent = `${img.width} × ${img.height} px`;

    let format = "Unknown";
    if (base64String.includes("image/png")) format = "PNG";
    else if (
      base64String.includes("image/jpeg") ||
      base64String.includes("image/jpg")
    )
      format = "JPEG";
    else if (base64String.includes("image/gif")) format = "GIF";
    else if (base64String.includes("image/webp")) format = "WebP";
    this.container.querySelector("#imageFormat").textContent = format;

    const base64Length =
      base64String.split(",")[1]?.length || base64String.length;
    const fileSize = Math.round((base64Length * 0.75) / 1024);
    const t = this.translations[this.currentLanguage];
    this.container.querySelector(
      "#fileSize"
    ).textContent = `${t.aboutSize} ${fileSize} KB`;

    this.container.querySelector("#totalPixels").textContent = (
      img.width * img.height
    ).toLocaleString();
  }

  analyzePixels(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const colorMap = new Map();
    let transparentCount = 0;
    let totalBrightness = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a < 255) transparentCount++;

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      totalBrightness += brightness;

      const colorKey = `${r},${g},${b},${a}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    const pixelCount = pixels.length / 4;
    const avgBrightness = Math.round(
      (totalBrightness / pixelCount / 255) * 100
    );

    this.container.querySelector("#pixelAnalysis").style.display = "block";
    this.container.querySelector("#uniqueColors").textContent =
      colorMap.size.toLocaleString();
    this.container.querySelector("#avgBrightness").textContent =
      avgBrightness + "%";
    this.container.querySelector("#transparentPixels").textContent =
      transparentCount.toLocaleString();

    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const dominantColorsDiv = this.container.querySelector("#dominantColors");
    dominantColorsDiv.innerHTML = "";

    sortedColors.forEach(([color, count]) => {
      const [r, g, b, a] = color.split(",").map(Number);
      const percentage = ((count / pixelCount) * 100).toFixed(2);

      const colorDiv = document.createElement("div");
      colorDiv.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            `;

      const colorBox = document.createElement("div");
      colorBox.style.cssText = `
                width: 40px;
                height: 40px;
                background: rgba(${r}, ${g}, ${b}, ${a / 255});
                border: 1px solid #ddd;
                border-radius: 5px;
                margin-right: 15px;
            `;

      const colorInfo = document.createElement("div");
      colorInfo.innerHTML = `
                <div style="font-weight: 600;">${this.rgbToHex(r, g, b)}</div>
                <div style="color: #666; font-size: 0.9em;">RGB(${r}, ${g}, ${b}) - ${percentage}%</div>
            `;

      colorDiv.appendChild(colorBox);
      colorDiv.appendChild(colorInfo);
      dominantColorsDiv.appendChild(colorDiv);
    });
  }

  showPixelInfo(x, y) {
    if (!this.currentContext) return;

    const pixel = this.currentContext.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const a = pixel[3];

    this.container.querySelector("#clickedPixelInfo").style.display = "block";
    this.container.querySelector(
      "#clickedColorPreview"
    ).style.background = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    this.container.querySelector("#pixelCoords").textContent = `(${x}, ${y})`;
    this.container.querySelector(
      "#pixelRGB"
    ).textContent = `rgb(${r}, ${g}, ${b})`;
    this.container.querySelector("#pixelHEX").textContent = this.rgbToHex(
      r,
      g,
      b
    );

    const hsl = this.rgbToHsl(r, g, b);
    this.container.querySelector(
      "#pixelHSL"
    ).textContent = `hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)`;
  }

  rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
        .toUpperCase()
    );
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  clear() {
    if (this.editor) {
      this.editor.setValue("");
      this.editor.focus();
    } else {
      const textarea = this.container.querySelector("#base64Input");
      if (textarea) {
        textarea.value = "";
      }
    }
    const t = this.translations[this.currentLanguage];
    this.container.querySelector(
      "#imageContainer"
    ).innerHTML = `<div class="placeholder">${t.waitingText}</div>`;
    this.container.querySelector("#imageInfo").style.display = "none";
    this.container.querySelector("#pixelAnalysis").style.display = "none";
    this.container.querySelector("#alertMessage").style.display = "none";
    this.container.querySelector("#clickedPixelInfo").style.display = "none";
    this.currentCanvas = null;
    this.currentContext = null;
  }

  loadExample() {
    const exampleBase64 = this._getExampleBase64();
    if (this.editor) {
      this.editor.setValue(exampleBase64);
    } else {
      const textarea = this.container.querySelector("#base64Input");
      if (textarea) {
        textarea.value = exampleBase64;
      }
    }
    this.decode();
  }

  toggleDominantColors() {
    const content = this.container.querySelector("#dominantColors");
    const icon = this.container.querySelector(
      ".collapsible-header[data-action='toggleDominantColors'] .collapse-icon"
    );

    if (content.style.display === "none") {
      content.style.display = "";
      icon.textContent = "▼";
    } else {
      content.style.display = "none";
      icon.textContent = "▶";
    }
  }

  destroy() {
    // Dispose Monaco editor if it exists
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    
    this.currentCanvas = null;
    this.currentContext = null;
    this.editorContainer = null;
    this.container.innerHTML = "";
  }

  _getExampleBase64() {
    return `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`;
  }
}
