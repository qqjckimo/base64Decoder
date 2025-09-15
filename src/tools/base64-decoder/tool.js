import { MonacoLoader } from "../../utils/monacoLoader.js";
import "./styles.css";

export default class Base64DecoderTool {
  constructor() {
    this.currentCanvas = null;
    this.currentContext = null;
    this.editor = null;
    this.editorContainer = null;
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
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
        editorFeatures:
          "Supports large Base64 strings, syntax highlighting, find & replace",
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
      const editorValue = this.editor?.getValue() || "";
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
    this.editorContainer = this.container.querySelector(
      "#monacoEditorContainer"
    );

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
      this.editorContainer.innerHTML = "";

      // Create editor instance with error handling
      this.editor = MonacoLoader.createEditor(this.editorContainer, {
        value: "",
        language: "plaintext",
        automaticLayout: true,
      });

      // Set up drag and drop for editor
      this.setupEditorDragDrop();

      // Show enhanced editor badge
      this.showEditorBadge();

      console.log("Monaco Editor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Monaco Editor:", error);
      this.fallbackToTextarea(t);
    }
  }

  showEditorBadge() {
    const badge = this.container.querySelector("#editorBadge");
    if (badge) {
      badge.style.display = "flex";
      // Add a subtle animation
      badge.style.opacity = "0";
      setTimeout(() => {
        badge.style.opacity = "1";
      }, 100);
    }
  }

  hideEditorBadge() {
    const badge = this.container.querySelector("#editorBadge");
    if (badge) {
      badge.style.display = "none";
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
    const textarea = this.editorContainer.querySelector("#base64Input");
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

  setupEditorDragDrop() {
    if (!this.editor || !this.editorContainer) return;

    const editorDom = this.editorContainer.querySelector(".monaco-editor");
    if (!editorDom) return;

    editorDom.addEventListener("dragover", (e) => {
      e.preventDefault();
      editorDom.classList.add("dragover");
    });

    editorDom.addEventListener("dragleave", (e) => {
      e.preventDefault();
      editorDom.classList.remove("dragover");
    });

    editorDom.addEventListener("drop", (e) => {
      e.preventDefault();
      editorDom.classList.remove("dragover");

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
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
                            <div id="editorBadge" class="editor-badge" style="display: none;" title="${
                              t.editorFeatures
                            }">
                                <span class="badge-text">${
                                  t.enhancedEditor
                                }</span>
                                <span class="badge-subtitle">${
                                  t.largeFileSupport
                                }</span>
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
    let input = "";
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

  async loadExample() {
    const exampleBase64 = await this._getExampleBase64();
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

  async _getExampleBase64() {
    try {
      // // 動態載入範例檔案
      // const response = await fetch(
      //   /* webpackChunkName: "decoder-example" */
      //   new URL("./example.txt", import.meta.url)
      // );

      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }

      // const content = await response.text();
      // return content.trim();
      const res = await fetch(new URL("./example.txt", import.meta.url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.text()).trim();
    } catch (error) {
      console.error("Failed to load example Base64:", error);
      // 回退到原本的硬編碼內容
      return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAMAAADVRocKAAACBFBMVEUAAABk30xW0jlOyixHxB9g3UZt21tk4E1Pyy1X0zhi3kli2UVIyCZUzi9eyjVZ1Dxk30xd2EJk30w1swdRzTBj30ph3EZf20Vl4ExIxSQ2swhb1z9k4ExZ1Ttb1j5k4Exj30lk3Elj3kJb1T4+uxU0sQdY0zpRzTBk30th3Ehk4ExCvxpb1j9k4ExGwyBSzTA0sQRGxCA2tQlU0DZPzC5d2EJi3UhPyy1W0jZj3ktRzTBi3EhAvRdHxCBZ1j1T0DVNzCxk4Etj3ktj3kxQzi40sgVa0zo8uxFf1z9h3kVBvh1f2URFwB5PzC1Nyio7uA9DwBtOyytKxydAvBdd10FX0zlPzC1Bvxla1T1KxiVW0Tdd2UJf2UNRzjJV0DU4tQo/vBdl4Exb1j9TzzRUzzNFwh82swha1T5k4E0/uxZh20dh20c5tgw+uhRe2EJl4E1l30xZ1T1d2EJKxiRPzC1Pyis0sQczsAVk4E07uRFj3Ull4E1LxiZk4Exl30xj3UxNyClb1Ts+uxQ6tw8+vBZm4Ew5tQs/uxlBvRpIwyRQyy9BvRtY0jdl4E1OyytU0DVJxiRa1j5GxCBd2UJh3EdMyClW0jdSzjJX0zlRzTBQzC4+vBVLxydZ1Ds7uRBc10BFwR5f2kRDwBxg20VCvxpAvRhj3kpi3Uk5tg04tQs3tAk1sgcRSjr8AAAAjXRSTlMA/g0gBjEE+G4+IBYWCgT9/Pb08ufk1cinoZSOi3tdWlQpB/39/fj18u3q5+HZ2dXUvru6uLe0q6KRgYB2VVFRTUk9NzErKSMgGxH+/vz7+ff29vbw8PDw7unm5dvb2trY0dDMysrIx8bBvaelpKCenJqZlJGRkYuHgHl2dmtqZGNiYmBRQ0I8Ojg2Ly6y+c9oAAACaElEQVRo3u3V51dTMRgG8IfbW1pKW/beIHsjQ5EtQ3Dvvffee+8ZFKniQkTc/pMeQKHtfXtz2+Z+kfw+Jm/eJCfnPIEkSZIkSf+f3Mwb+TBPZCpjrNIB05xik8qsMMklNi2+E6a4zv6x5cAEObFsRsQiCHffxrwthGCL45mv1EiIlFfG/GVCoP4kplEi8ArKbqZlE7eB6xAjpIoLiEZGqIyGKCcZIckBUTIZocQKUa4ygq1LXEBEMK3YXIjSGRtBuCkwIL4RroDDmmc0IEq/E3g550j2eFKWwABHkodwFPqU5Mmq0i5wRSd7CEd4n37jxJS4XHC4UiYIKQr0ZYz/tZTzKbkbxgnbeAGRPTzrjBs6TgwTtvLezhrnXd6g6NyU6r/Oynu2ijEfe/oRQNYYIS4K+vIPDvmp6AUpu2BIq6ANHKe1izaRh2qLIfrH3AZHb8yoVlE2NKKKRglZ4Gl/Q9IsfLaeKssAl+U1bYHbt2wLWQQDmp/T5iuY5dxBlqgwwj5C71BtmY2qvVTBPgXGtBePkBK7MU2tp6a3O2HUk8S3pOIOTGmiJhMtMM5S/Y603A4A56ipDd0IhlI/SDsPNFPjq6MQHHfaIK3JTo2u6EDQ7K+CcAshaF3zwahrCMnjzS+MOYsQWaoM9U9DyAZqX/LVqgidmsbtv19BWFqWfdJV5USYWld91lFuQdgelX8JaONTCNC362sAax9CiIHD70nz7kEQ9TjZ/w7EufxRqwUi3V3p3z8dYj1I+OHjGETr2/nTS50K4ZwHfs2oc8EErvTC31MKL6gwR096TUJCzcUeSJIkSdIc9QdcTXdM922MhwAAAABJRU5ErkJggg==`;
    }
  }
}
