import "./styles.css";

export default class PngToIcoTool {
  constructor() {
    this.currentFiles = [];
    this.converter = null;
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.translations = {
      "zh-TW": {
        title: "PNG 轉 ICO 轉換器",
        uploadText: "點擊或拖放 PNG 檔案到此處",
        uploadHint: "支援單個或多個 PNG 檔案（生成多尺寸 ICO）",
        selectAgain: "重新選擇",
        convertToIco: "轉換為 ICO",
        converting: "轉換中...",
        originalSize: "保持原始尺寸（標準模式）",
        originalSizeHint: "保持 PNG 原始尺寸，須在 256x256 像素限制內",
        ignoreLimit: "保持原始尺寸（忽略限制）",
        ignoreLimitHint: "ICO 標準限制為 256x256，但大部分程式仍可開啟超過此限制的檔案",
        multiSize: "生成多尺寸圖標",
        multiSizeHint: "自動生成常用尺寸如 16x16, 32x32, 48x48, 192x192",
        filesSelected: "個檔案已選擇",
        totalSize: "總大小",
        conversionSuccess: "轉換成功！檔案下載已開始。",
        conversionFailed: "轉換失敗，請檢查檔案格式是否正確。",
        selectPngFiles: "請選擇 PNG 格式的圖片檔案！",
        invalidPngSignature: "無效的 PNG 簽名",
        imageSizeExceeds: "圖片尺寸 {width}x{height} 超過 256x256。勾選「忽略限制」以繼續。",
      },
      en: {
        title: "PNG to ICO Converter",
        uploadText: "Click or drag and drop PNG files here",
        uploadHint: "Support single or multiple PNG files (generate multi-size ICO)",
        selectAgain: "Select Again",
        convertToIco: "Convert to ICO",
        converting: "Converting...",
        originalSize: "Keep original size (Standard mode)",
        originalSizeHint: "Keep PNG original size, must be less than 256x256 pixel limit",
        ignoreLimit: "Keep original size (Ignore limit)",
        ignoreLimitHint: "ICO standard limit is 256x256, but most programs can still open files exceeding this limit",
        multiSize: "Generate multi-size icon",
        multiSizeHint: "Automatically generate common sizes like 16x16, 32x32, 48x48, 192x192",
        filesSelected: " files selected",
        totalSize: "Total size",
        conversionSuccess: "Conversion successful! File download has started.",
        conversionFailed: "Conversion failed, please check if the file format is correct.",
        selectPngFiles: "Please select PNG format image files!",
        invalidPngSignature: "Invalid PNG signature",
        imageSizeExceeds: "Image size {width}x{height} exceeds 256x256. Check 'Ignore Size' to proceed.",
      },
    };
  }

  async init(container) {
    this.container = container;
    this.initConverter();
    this.render();
    this.attachEvents();

    // 監聽語言變更
    window.addEventListener("languageChanged", (e) => {
      this.currentLanguage = e.detail.language;
      this.render();
      this.attachEvents();
    });
  }

  initConverter() {
    // PNG2ICO Converter class
    this.converter = new PngIcoConverter();
  }

  render() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
      <div class="png-to-ico-tool">
        <div class="tool-header">
          <h2>🎨 ${t.title}</h2>
        </div>
        
        <!-- 上傳區域 -->
        <div class="upload-area" id="uploadArea">
          <div class="upload-icon">📁</div>
          <div class="upload-text">${t.uploadText}</div>
          <div class="upload-hint">${t.uploadHint}</div>
          <input type="file" id="fileInput" accept="image/png" multiple style="display: none;">
        </div>

        <!-- 預覽區域 -->
        <div class="preview-section" id="previewSection" style="display: none;">
          <div class="preview-container">
            <img id="previewImage" class="preview-image" alt="Preview">
            <div class="file-info">
              <div class="file-name" id="fileName"></div>
              <div class="file-size" id="fileSize"></div>
            </div>
          </div>

          <!-- 選項組 -->
          <div class="options-group">
            <label class="option-label">
              <input type="radio" name="sizeOption" id="optOriginalSize" checked>
              <div>
                <div class="option-text">${t.originalSize}</div>
                <div class="option-hint">${t.originalSizeHint}</div>
              </div>
            </label>
            <label class="option-label">
              <input type="radio" name="sizeOption" id="optIgnoreLimit">
              <div>
                <div class="option-text">${t.ignoreLimit}</div>
                <div class="option-hint">${t.ignoreLimitHint}</div>
              </div>
            </label>
            <label class="option-label">
              <input type="radio" name="sizeOption" id="optMultiSize">
              <div>
                <div class="option-text">${t.multiSize}</div>
                <div class="option-hint">${t.multiSizeHint}</div>
              </div>
            </label>
          </div>

          <!-- 按鈕組 -->
          <div class="button-group">
            <button class="btn btn-secondary" id="resetBtn">${t.selectAgain}</button>
            <button class="btn btn-primary" id="convertBtn">
              <span id="btnText">${t.convertToIco}</span>
            </button>
          </div>
        </div>

        <!-- 訊息顯示區域 -->
        <div class="error-message" id="errorMessage" style="display: none;"></div>
        <div class="success-message" id="successMessage" style="display: none;"></div>
      </div>
    `;
  }

  attachEvents() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const convertBtn = document.getElementById("convertBtn");
    const resetBtn = document.getElementById("resetBtn");

    // 點擊上傳區域
    uploadArea?.addEventListener("click", () => {
      fileInput?.click();
    });

    // 檔案選擇
    fileInput?.addEventListener("change", (e) => this.handleFileChange(e));

    // 拖放功能
    uploadArea?.addEventListener("dragover", (e) => this.handleDragOver(e));
    uploadArea?.addEventListener("dragleave", (e) => this.handleDragLeave(e));
    uploadArea?.addEventListener("drop", (e) => this.handleDrop(e));

    // 轉換按鈕
    convertBtn?.addEventListener("click", () => this.handleConvert());

    // 重置按鈕
    resetBtn?.addEventListener("click", () => this.handleReset());
  }

  handleFileChange(event) {
    const files = Array.from(event.target.files).filter(
      (file) => file.type === "image/png"
    );
    if (files.length > 0) {
      this.handleFiles(files);
    } else if (event.target.files.length > 0) {
      this.showError(this.translations[this.currentLanguage].selectPngFiles);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add("dragover");
  }

  handleDragLeave(event) {
    event.currentTarget.classList.remove("dragover");
  }

  handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("dragover");

    const files = Array.from(event.dataTransfer.files).filter(
      (file) => file.type === "image/png"
    );
    if (files.length > 0) {
      this.handleFiles(files);
    } else if (event.dataTransfer.files.length > 0) {
      this.showError(this.translations[this.currentLanguage].selectPngFiles);
    }
  }

  handleFiles(files) {
    this.currentFiles = files;
    const t = this.translations[this.currentLanguage];

    // 顯示第一個檔案的預覽
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImage = document.getElementById("previewImage");
      const fileName = document.getElementById("fileName");
      const fileSize = document.getElementById("fileSize");
      const previewSection = document.getElementById("previewSection");

      if (previewImage) previewImage.src = e.target.result;
      
      if (files.length === 1) {
        if (fileName) fileName.textContent = files[0].name;
        if (fileSize) fileSize.textContent = this.formatFileSize(files[0].size);
      } else {
        if (fileName) fileName.textContent = `${files.length} ${t.filesSelected}`;
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (fileSize) fileSize.textContent = `${t.totalSize}: ${this.formatFileSize(totalSize)}`;
      }
      
      if (previewSection) previewSection.style.display = "block";
      this.hideMessages();

      // 最小化上傳區域
      const uploadArea = document.getElementById("uploadArea");
      if (uploadArea) uploadArea.classList.add("minimized");
    };
    reader.readAsDataURL(files[0]);
  }

  async handleConvert() {
    if (this.currentFiles.length === 0) return;

    const t = this.translations[this.currentLanguage];
    const convertBtn = document.getElementById("convertBtn");
    const btnText = document.getElementById("btnText");

    try {
      // 顯示載入狀態
      if (convertBtn) convertBtn.disabled = true;
      if (btnText) btnText.innerHTML = `<span class="loading"></span>${t.converting}`;
      this.hideMessages();

      let inputs = [];

      // 根據選擇的選項處理
      const optMultiSize = document.getElementById("optMultiSize");
      const optOriginalSize = document.getElementById("optOriginalSize");
      const optIgnoreLimit = document.getElementById("optIgnoreLimit");

      if (optMultiSize?.checked && this.currentFiles.length === 1) {
        // 生成多尺寸版本
        const pngBlobs = await this.generateMultipleSizes(this.currentFiles[0]);
        inputs = pngBlobs.map((blob) => ({
          png: blob,
          ignoreSize: false,
        }));
      } else if (optOriginalSize?.checked) {
        // 保持原始尺寸（標準模式）
        inputs = this.currentFiles.map((file) => ({
          png: file,
          ignoreSize: false,
        }));
      } else if (optIgnoreLimit?.checked) {
        // 保持原始尺寸並忽略限制
        inputs = this.currentFiles.map((file) => ({
          png: file,
          ignoreSize: true,
        }));
      }

      // 轉換為 ICO
      const icoBlob = await this.converter.convertToBlobAsync(inputs);

      // 建立下載連結
      const url = URL.createObjectURL(icoBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this.currentFiles[0].name.replace(".png", ".ico");
      a.click();

      // 清理 URL
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // 顯示成功訊息
      this.showSuccess(t.conversionSuccess);
    } catch (error) {
      console.error("Conversion error:", error);
      let errorMessage = error.message;
      
      // 處理尺寸超過限制的錯誤訊息
      if (errorMessage.includes("exceeds 256x256")) {
        const match = errorMessage.match(/(\d+)x(\d+)/);
        if (match) {
          errorMessage = t.imageSizeExceeds
            .replace("{width}", match[1])
            .replace("{height}", match[2]);
        }
      }
      
      this.showError(errorMessage || t.conversionFailed);
    } finally {
      // 恢復按鈕狀態
      if (convertBtn) convertBtn.disabled = false;
      if (btnText) btnText.textContent = t.convertToIco;
    }
  }

  async generateMultipleSizes(imageFile) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;

        img.onload = async () => {
          const sizes = [16, 32, 48, 192];
          const pngBlobs = [];

          for (const size of sizes) {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            // 使用高品質縮放
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // 繪製並縮放圖片
            ctx.drawImage(img, 0, 0, size, size);

            // 轉換為 Blob
            const blob = await new Promise((resolve) => {
              canvas.toBlob(resolve, "image/png");
            });

            pngBlobs.push(blob);
          }

          resolve(pngBlobs);
        };
      };

      reader.readAsDataURL(imageFile);
    });
  }

  handleReset() {
    this.currentFiles = [];
    const fileInput = document.getElementById("fileInput");
    const previewSection = document.getElementById("previewSection");
    const uploadArea = document.getElementById("uploadArea");

    if (fileInput) fileInput.value = "";
    if (previewSection) previewSection.style.display = "none";
    if (uploadArea) uploadArea.classList.remove("minimized");
    this.hideMessages();
  }

  showError(message) {
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");
    
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
    }
    if (successMessage) {
      successMessage.style.display = "none";
    }
  }

  showSuccess(message) {
    const successMessage = document.getElementById("successMessage");
    const errorMessage = document.getElementById("errorMessage");
    
    if (successMessage) {
      successMessage.textContent = message;
      successMessage.style.display = "block";
    }
    if (errorMessage) {
      errorMessage.style.display = "none";
    }
  }

  hideMessages() {
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");
    
    if (errorMessage) errorMessage.style.display = "none";
    if (successMessage) successMessage.style.display = "none";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  destroy() {
    // 清理資源
    this.currentFiles = [];
    this.converter = null;
  }
}

// PNG2ICO Converter Library (embedded)
class PngIcoConverter {
  constructor() {
    this.headerSize = 6;
    this.directorySize = 16;
    this.icoTag = new Uint8Array([0, 0, 1, 0]);
    this.pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  }

  async convertToBlobAsync(inputs, mime = "image/x-icon") {
    const arr = await this.convertAsync(inputs);
    return new Blob([arr], { type: mime });
  }

  async convertAsync(inputs) {
    const pngs = await Promise.all(
      inputs.map((input) => this.parsePngAsync(input))
    );
    const totalSize =
      this.headerSize +
      this.directorySize * pngs.length +
      pngs.reduce((sum, png) => sum + png.data.length, 0);

    const result = new Uint8Array(totalSize);
    const view = new DataView(result.buffer);

    // Write header
    result.set(this.icoTag, 0);
    view.setUint16(4, pngs.length, true);

    let offset = this.headerSize + this.directorySize * pngs.length;
    let directoryOffset = this.headerSize;

    for (const png of pngs) {
      // Write directory entry
      view.setUint8(directoryOffset, png.width === 256 ? 0 : png.width);
      view.setUint8(
        directoryOffset + 1,
        png.height === 256 ? 0 : png.height
      );
      view.setUint8(directoryOffset + 2, 0); // Color palette
      view.setUint8(directoryOffset + 3, 0); // Reserved
      view.setUint16(directoryOffset + 4, 1, true); // Color planes
      view.setUint16(directoryOffset + 6, png.bpp || 32, true); // Bits per pixel
      view.setUint32(directoryOffset + 8, png.data.length, true); // Size
      view.setUint32(directoryOffset + 12, offset, true); // Offset

      // Write PNG data
      result.set(png.data, offset);

      directoryOffset += this.directorySize;
      offset += png.data.length;
    }

    return result;
  }

  async parsePngAsync(input) {
    const buffer = await this.getArrayBufferAsync(input.png);
    const view = new DataView(buffer);

    // Check PNG signature
    for (let i = 0; i < this.pngSignature.length; i++) {
      if (view.getUint8(i) !== this.pngSignature[i]) {
        throw new Error("Invalid PNG signature");
      }
    }

    // Read IHDR chunk
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);

    if ((width > 256 || height > 256) && !input.ignoreSize) {
      throw new Error(
        `Image size ${width}x${height} exceeds 256x256. Check "Ignore Size" to proceed.`
      );
    }

    return {
      width,
      height,
      bpp: input.bpp || 32,
      data: new Uint8Array(buffer),
    };
  }

  async getArrayBufferAsync(input) {
    if (input instanceof ArrayBuffer) {
      return input;
    } else if (input instanceof Blob) {
      return await input.arrayBuffer();
    }
    throw new Error("Invalid input type");
  }
}