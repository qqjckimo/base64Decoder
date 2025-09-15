import { createIcon, initializeLucideIcons } from "../shared/Icon.js";

export class Sidebar {
  constructor() {
    this.tools = [];
    this.isExpanded = true;
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.floatingUI = null;
    this.appVersion = process.env.APP_VERSION;
    this.translations = {
      "zh-TW": {
        sidebarTitle: "開發工具",
        categoryImageProcessing: "圖片處理",
        base64DecoderName: "Base64 圖片解碼器",
        base64EncoderName: "Base64 圖片編碼器",
        pngToIcoName: "PNG 轉 ICO 轉換器",
        featureFastLoad: "快速載入",
        featurePrivacyFirst: "隱私優先",
        featureModernTech: "最新技術",
        languageToggle: "🌐 EN",
        featureFastLoadTooltip: "動態載入模組，減少初始載入時間",
        featurePrivacyFirstTooltip: "所有處理都在瀏覽器端進行，不上傳任何資料",
        featureModernTechTooltip:
          "使用 ES6+、Web Workers、動態載入等現代 Web 技術",
      },
      en: {
        sidebarTitle: "Developer Tools",
        categoryImageProcessing: "Image Processing",
        base64DecoderName: "Base64 Image Decoder",
        base64EncoderName: "Base64 Image Encoder",
        pngToIcoName: "PNG to ICO Converter",
        featureFastLoad: "Fast Loading",
        featurePrivacyFirst: "Privacy First",
        featureModernTech: "Modern Tech",
        languageToggle: "🌐 中文",
        featureFastLoadTooltip:
          "Dynamic module loading reduces initial load time",
        featurePrivacyFirstTooltip:
          "All processing happens in your browser, no data uploaded",
        featureModernTechTooltip:
          "Built with ES6+, Web Workers, dynamic imports and modern web technologies",
      },
    };
    this.init();
  }

  async init() {
    await this.loadFloatingUI();
    await this.loadToolsConfig();
    this.render();
    this.attachEvents();
    this.initTooltips();
  }

  async loadFloatingUI() {
    try {
      if (!this.floatingUI) {
        const { computePosition, flip, shift, offset, size } = await import(
          "https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.3/+esm"
        );
        this.floatingUI = {
          computePosition,
          flip,
          shift,
          offset,
          size,
        };
      }
    } catch (error) {
      console.warn(
        "Failed to load Floating UI, falling back to custom positioning:",
        error
      );
      this.floatingUI = null;
    }
  }

  async loadToolsConfig() {
    const t = this.translations[this.currentLanguage];
    this.tools = [
      {
        id: "base64-decoder",
        name: t.base64DecoderName,
        icon: createIcon("image", 20, "tool-icon"),
        category: t.categoryImageProcessing,
      },
      {
        id: "base64-encoder",
        name: t.base64EncoderName,
        icon: createIcon("camera", 20, "tool-icon"),
        category: t.categoryImageProcessing,
      },
      {
        id: "png-to-ico",
        name: t.pngToIcoName,
        icon: createIcon("palette", 20, "tool-icon"),
        category: t.categoryImageProcessing,
      },
    ];
  }

  render() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    const t = this.translations[this.currentLanguage];
    const toolsGrouped = this.groupByCategory();

    sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="header-main">
                    <h2 class="sidebar-title">${t.sidebarTitle}</h2>
                    <div class="header-controls">
                        <button class="language-toggle" data-action="toggleLanguage" title="Switch Language">
                            ${createIcon("globe", 12, "language-icon")} ${
      this.currentLanguage === "zh-TW" ? "EN" : "中文"
    }
                        </button>
                        <button class="sidebar-toggle" aria-label="切換側邊欄">
                            ${createIcon("menu", 16, "menu-icon")}
                        </button>
                    </div>
                </div>
                ${
                  this.appVersion
                    ? `<div class="version-line">
                        <span class="version-badge">v${this.appVersion}</span>
                    </div>`
                    : ""
                }
            </div>
            <nav class="sidebar-nav">
                ${Object.entries(toolsGrouped)
                  .map(
                    ([category, tools]) => `
                    <div class="nav-category">
                        <div class="category-header">${category}</div>
                        ${tools
                          .map(
                            (tool) => `
                            <a href="#tool/${tool.id}" data-route="tool" data-tool="${tool.id}" class="nav-item" data-tooltip="${tool.name}">
                                <span class="nav-icon">${tool.icon}</span>
                                <span class="nav-text">${tool.name}</span>
                            </a>
                        `
                          )
                          .join("")}
                    </div>
                `
                  )
                  .join("")}
            </nav>
            <div class="sidebar-footer">
                <div class="feature-info">
                    <div class="feature-item">
                        <div class="feature-left">
                            ${createIcon("zap", 12, "feature-icon")}
                            <span class="feature-text">${
                              t.featureFastLoad
                            }</span>
                        </div>
                        ${createIcon("info", 10, "info-icon")}
                        <div class="tooltip">${t.featureFastLoadTooltip}</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-left">
                            ${createIcon("lock", 12, "feature-icon")}
                            <span class="feature-text">${
                              t.featurePrivacyFirst
                            }</span>
                        </div>
                        ${createIcon("info", 10, "info-icon")}
                        <div class="tooltip">${
                          t.featurePrivacyFirstTooltip
                        }</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-left">
                            ${createIcon("cpu", 12, "feature-icon")}
                            <span class="feature-text">${
                              t.featureModernTech
                            }</span>
                        </div>
                        ${createIcon("info", 10, "info-icon")}
                        <div class="tooltip">${t.featureModernTechTooltip}</div>
                    </div>
                </div>
            </div>
        `;

    // 添加懸浮 toggle 按鈕（在 768px 斷點顯示）
    let floatingToggle = document.getElementById("floating-sidebar-toggle");
    if (!floatingToggle) {
      floatingToggle = document.createElement("button");
      floatingToggle.id = "floating-sidebar-toggle";
      floatingToggle.className = "floating-sidebar-toggle";
      floatingToggle.setAttribute("aria-label", "開關側邊欄");
      floatingToggle.innerHTML = createIcon("menu", 20, "menu-icon");
      document.body.appendChild(floatingToggle);
    }

    // 添加遮罩元素（僅在 480px 斷點使用）
    let overlay = document.getElementById("sidebar-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "sidebar-overlay";
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
    }

    this.addStyles();

    // 初始化 Lucide 圖標
    setTimeout(() => {
      initializeLucideIcons();
      // 重新初始化 tooltips（在語言切換後）
      this.initTooltips();
    }, 0);
  }

  groupByCategory() {
    return this.tools.reduce((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {});
  }

  attachEvents() {
    const toggle = document.querySelector(".sidebar-toggle");
    const floatingToggle = document.getElementById("floating-sidebar-toggle");
    const overlay = document.getElementById("sidebar-overlay");
    const languageToggle = document.querySelector(".language-toggle");
    const sidebar = document.getElementById("sidebar");

    // 處理內部 toggle 按鈕（桌面版）
    if (toggle && sidebar) {
      toggle.addEventListener("click", () => {
        this.isExpanded = !this.isExpanded;
        sidebar.classList.toggle("expanded", this.isExpanded);
        sidebar.classList.toggle("collapsed", !this.isExpanded);
      });
    }

    // 處理懸浮 toggle 按鈕（平板/手機版）
    if (floatingToggle && sidebar) {
      floatingToggle.addEventListener("click", () => {
        this.isExpanded = !this.isExpanded;
        sidebar.classList.toggle("expanded", this.isExpanded);
        this.updateFloatingToggleState(floatingToggle);
        this.updateOverlayState();
      });
    }

    // 處理遮罩點擊（僅在 480px 斷點）
    if (overlay && sidebar) {
      overlay.addEventListener("click", () => {
        if (window.innerWidth <= 480 && this.isExpanded) {
          this.isExpanded = false;
          sidebar.classList.remove("expanded");
          this.updateFloatingToggleState(floatingToggle);
          this.updateOverlayState();
        }
      });
    }

    if (languageToggle) {
      languageToggle.addEventListener("click", () => {
        this.toggleLanguage();
      });
    }

    // 響應式處理
    this.handleResponsiveBehavior(sidebar);

    // 監聽窗口大小變化
    window.addEventListener("resize", () => {
      this.handleResponsiveBehavior(sidebar);
    });

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove("expanded");
          this.isExpanded = false;
          if (floatingToggle) {
            this.updateFloatingToggleState(floatingToggle);
          }
          this.updateOverlayState();
        }
      });
    });
  }

  handleResponsiveBehavior(sidebar) {
    const floatingToggle = document.getElementById("floating-sidebar-toggle");

    if (window.innerWidth <= 768) {
      // 768px 以下：隱藏 sidebar，顯示懸浮 toggle
      sidebar.classList.remove("expanded");
      this.isExpanded = false;
      if (floatingToggle) {
        this.updateFloatingToggleState(floatingToggle);
      }
      this.updateOverlayState();
    } else {
      // 768px 以上：恢復正常桌面行為
      sidebar.classList.remove("collapsed");
      this.isExpanded = true;
      if (floatingToggle) {
        floatingToggle.classList.remove("attached");
      }
      this.updateOverlayState();
    }
  }

  updateFloatingToggleState(floatingToggle) {
    if (window.innerWidth <= 768) {
      if (this.isExpanded) {
        // Sidebar 展開時：切換到頁籤模式
        floatingToggle.classList.add("attached");
      } else {
        // Sidebar 收縮時：回到圓形按鈕模式
        floatingToggle.classList.remove("attached");
      }
    }
  }

  updateOverlayState() {
    const overlay = document.getElementById("sidebar-overlay");
    if (overlay && window.innerWidth <= 480) {
      if (this.isExpanded) {
        // Sidebar 展開時：顯示遮罩
        overlay.classList.add("show");
      } else {
        // Sidebar 收縮時：隱藏遮罩
        overlay.classList.remove("show");
      }
    } else if (overlay) {
      // 非 480px 斷點：確保遮罩隱藏
      overlay.classList.remove("show");
    }
  }

  toggleLanguage() {
    // Use global language system
    if (window.appLanguage) {
      this.currentLanguage = window.appLanguage.toggle();
    } else {
      // Fallback for cases where global system isn't available
      this.currentLanguage = this.currentLanguage === "zh-TW" ? "en" : "zh-TW";
      localStorage.setItem("preferredLanguage", this.currentLanguage);
      
      // Trigger global language change event
      window.dispatchEvent(
        new CustomEvent("languageChanged", {
          detail: { language: this.currentLanguage },
        })
      );
    }

    // Re-render sidebar with new language
    this.loadToolsConfig().then(() => {
      this.render();
      this.attachEvents();
      // 重新初始化圖標和 tooltips
      setTimeout(() => {
        initializeLucideIcons();
        this.initTooltips();
      }, 0);
    });
  }

  initTooltips() {
    // 清除之前的 tooltips
    this.clearTooltips();

    // 初始化 feature tooltips
    this.initFeatureTooltips();

    // 初始化 navigation tooltips (只在收縮狀態顯示)
    this.initNavTooltips();
  }

  clearTooltips() {
    // 移除舊的事件監聽器標記，防止重複綁定
    const boundElements = document.querySelectorAll("[data-tooltip-bound]");
    boundElements.forEach((el) => el.removeAttribute("data-tooltip-bound"));

    // 移除所有動態創建的 tooltips
    const existingTooltips = document.querySelectorAll(".dynamic-tooltip");
    existingTooltips.forEach((tooltip) => tooltip.remove());

    // 清除當前 tooltip 引用
    if (this.currentTooltip) {
      this.currentTooltip = null;
    }
  }

  initFeatureTooltips() {
    const featureItems = document.querySelectorAll(".feature-item");

    featureItems.forEach((item) => {
      // 防止重複綁定事件監聽器
      if (item.hasAttribute("data-tooltip-bound")) return;

      const tooltip = item.querySelector(".tooltip");
      if (!tooltip) return;

      // 標記已綁定，防止重複
      item.setAttribute("data-tooltip-bound", "feature");

      // 移除原有的 CSS hover 效果，使用 JavaScript 控制
      const handleMouseEnter = async (e) => {
        try {
          await this.showTooltip(
            e.currentTarget,
            tooltip.textContent,
            "feature"
          );
        } catch (error) {
          console.warn("Tooltip show error:", error);
        }
      };

      const handleMouseLeave = () => {
        try {
          this.hideTooltip();
        } catch (error) {
          console.warn("Tooltip hide error:", error);
        }
      };

      item.addEventListener("mouseenter", handleMouseEnter);
      item.addEventListener("mouseleave", handleMouseLeave);
    });
  }

  initNavTooltips() {
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach((item) => {
      // 防止重複綁定事件監聽器
      if (item.hasAttribute("data-tooltip-bound")) return;

      const tooltipText = item.getAttribute("data-tooltip");
      if (!tooltipText) return;

      // 標記已綁定，防止重複
      item.setAttribute("data-tooltip-bound", "nav");

      const handleMouseEnter = async (e) => {
        try {
          // 只在收縮狀態顯示導航 tooltips
          const sidebar = document.getElementById("sidebar");
          if (sidebar && sidebar.classList.contains("collapsed")) {
            await this.showTooltip(e.currentTarget, tooltipText, "nav");
          }
        } catch (error) {
          console.warn("Nav tooltip show error:", error);
        }
      };

      const handleMouseLeave = () => {
        try {
          this.hideTooltip();
        } catch (error) {
          console.warn("Nav tooltip hide error:", error);
        }
      };

      item.addEventListener("mouseenter", handleMouseEnter);
      item.addEventListener("mouseleave", handleMouseLeave);
    });
  }

  async showTooltip(triggerElement, text, type) {
    // 隱藏之前的 tooltip
    this.hideTooltip();

    // 創建新的 tooltip
    const tooltip = document.createElement("div");
    tooltip.className = `dynamic-tooltip tooltip-${type}`;
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    // 計算位置
    const position = await this.calculateTooltipPosition(
      triggerElement,
      tooltip,
      type
    );

    // 設置位置和樣式
    Object.assign(tooltip.style, {
      position: "fixed",
      left: `${position.left}px`,
      top: `${position.top}px`,
      zIndex: "10000",
      background: "rgba(0, 0, 0, 0.9)",
      color: "white",
      padding: "0.5rem 0.75rem",
      borderRadius: "6px",
      fontSize: "0.7rem",
      whiteSpace: "nowrap",
      maxWidth: "300px",
      wordWrap: "break-word",
      opacity: "0",
      visibility: "hidden",
      transition: "all 0.3s ease",
      pointerEvents: "none",
    });

    // 處理長文字換行
    if (text.length > 50) {
      tooltip.style.whiteSpace = "normal";
      tooltip.style.maxWidth = "250px";
    }

    // 顯示動畫
    requestAnimationFrame(() => {
      tooltip.style.opacity = "1";
      tooltip.style.visibility = "visible";
    });

    this.currentTooltip = tooltip;
  }

  async calculateTooltipPosition(trigger, tooltip, type) {
    // 如果 Floating UI 可用，使用專業定位
    if (this.floatingUI) {
      return await this.calculatePositionWithFloatingUI(trigger, tooltip, type);
    }

    // 降級到自定義定位邏輯
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const sidebar = document.getElementById("sidebar");
    const sidebarRect = sidebar.getBoundingClientRect();

    let left, top;

    if (type === "nav") {
      // 導航項目 tooltips 顯示在右側
      left = sidebarRect.right + 10;
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    } else {
      // Feature tooltips
      const isCollapsed = sidebar.classList.contains("collapsed");

      if (isCollapsed) {
        // 收縮狀態：右側顯示
        left = sidebarRect.right + 10;
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      } else {
        // 展開狀態：智能定位，使用 sidebarRect.right 作為參考位置
        const spaceRight = window.innerWidth - sidebarRect.right;
        const spaceLeft = sidebarRect.left;

        if (spaceRight >= tooltipRect.width + 20) {
          // 右側有足夠空間，顯示在 sidebar 右側
          left = sidebarRect.right + 10;
        } else if (spaceLeft >= tooltipRect.width + 35) {
          // 左側有足夠空間，顯示在 sidebar 左側
          // 使用 sidebarRect.right 作為參考，向左偏移
          left = sidebarRect.right - sidebarRect.width - tooltipRect.width - 10;

          // 確保不會小於最小邊距
          if (left < 25) {
            left = 25;
          }
        } else {
          // 兩側都沒有理想空間
          // 優先嘗試在 sidebar 右側顯示，即使會部分超出螢幕
          left = sidebarRect.right + 10;

          // 檢查是否會完全超出右邊界
          if (left + tooltipRect.width > window.innerWidth - 15) {
            // 會超出，調整到螢幕內
            left = window.innerWidth - tooltipRect.width - 15;

            // 如果調整後會覆蓋 sidebar，則改為顯示在上方或下方
            if (left < sidebarRect.right) {
              // 改為上下顯示
              left =
                triggerRect.left +
                triggerRect.width / 2 -
                tooltipRect.width / 2;
              top = triggerRect.top - tooltipRect.height - 10;

              // 確保不超出螢幕邊界
              if (left < 25) left = 25;
              if (left + tooltipRect.width > window.innerWidth - 15) {
                left = window.innerWidth - tooltipRect.width - 15;
              }
              if (top < 10) {
                // 上方也沒空間，顯示在下方
                top = triggerRect.bottom + 10;
              }

              // 如果 tooltip 太寬，啟用換行
              if (tooltipRect.width > window.innerWidth - 50) {
                tooltip.style.whiteSpace = "normal";
                tooltip.style.maxWidth = `${window.innerWidth - 50}px`;
              }

              return { left, top };
            }
          }
        }

        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      }
    }

    // 確保不超出螢幕邊界
    if (top < 15) top = 15;
    if (top + tooltipRect.height > window.innerHeight - 15) {
      top = window.innerHeight - tooltipRect.height - 15;
    }

    // 對於右側或左側正常顯示的情況，確保不超出邊界
    if (left < 25) {
      // 如果計算出的位置太靠左，說明可能需要調整顯示策略
      // 但不強制設為25px，而是保持原計算結果或調整到安全位置
      left = Math.max(25, left);
    }

    return { left, top };
  }

  async calculatePositionWithFloatingUI(trigger, tooltip, type) {
    const { computePosition, flip, shift, offset, size } = this.floatingUI;

    // 根據類型決定預設定位和中介軟體
    let placement = "right";
    let middlewareOptions = [
      offset(25), // 25px 間距
      flip({
        fallbackPlacements: ["left", "top", "bottom"],
        padding: 25, // 與螢幕邊界的最小距離
      }),
      shift({
        padding: 25, // 保持最小邊距
      }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          // 如果空間不足，啟用換行
          if (availableWidth < elements.floating.offsetWidth) {
            elements.floating.style.whiteSpace = "normal";
            elements.floating.style.maxWidth = `${Math.max(
              200,
              availableWidth - 10
            )}px`;
          }
        },
      }),
    ];

    // Nav tooltips 總是顯示在右側，不翻轉到左側
    if (type === "nav") {
      middlewareOptions[1] = flip({
        fallbackPlacements: ["top", "bottom"], // 只允許上下翻轉
        padding: 25,
      });
    }

    try {
      const position = await computePosition(trigger, tooltip, {
        placement,
        middleware: middlewareOptions,
      });

      return {
        left: position.x,
        top: position.y,
      };
    } catch (error) {
      console.warn("Floating UI positioning failed:", error);
      // 降級到原有邏輯
      return this.calculateCustomPosition(trigger, tooltip, type);
    }
  }

  calculateCustomPosition(trigger, tooltip, type) {
    // 保留原有的自定義定位邏輯作為降級方案
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const sidebar = document.getElementById("sidebar");
    const sidebarRect = sidebar.getBoundingClientRect();

    let left, top;

    if (type === "nav") {
      left = sidebarRect.right + 25;
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    } else {
      const isCollapsed = sidebar.classList.contains("collapsed");

      if (isCollapsed) {
        left = sidebarRect.right + 25;
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      } else {
        const spaceRight = window.innerWidth - sidebarRect.right;

        if (spaceRight >= tooltipRect.width + 45) {
          left = sidebarRect.right + 25;
        } else {
          left = 25;
          if (left + tooltipRect.width > window.innerWidth - 25) {
            tooltip.style.whiteSpace = "normal";
            tooltip.style.maxWidth = `${window.innerWidth - 50}px`;
          }
        }

        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      }
    }

    // 邊界檢查
    if (top < 25) top = 25;
    if (top + tooltipRect.height > window.innerHeight - 25) {
      top = window.innerHeight - tooltipRect.height - 25;
    }

    return { left, top };
  }

  hideTooltip() {
    if (!this.currentTooltip) return;

    try {
      // 立即開始隱藏動畫
      const tooltip = this.currentTooltip;
      tooltip.style.opacity = "0";
      tooltip.style.visibility = "hidden";

      // 清除引用，防止重複處理
      this.currentTooltip = null;

      // 延遲移除 DOM 元素
      setTimeout(() => {
        try {
          if (tooltip && tooltip.parentNode) {
            tooltip.remove();
          }
        } catch (error) {
          console.warn("Error removing tooltip:", error);
        }
      }, 300);
    } catch (error) {
      console.warn("Error hiding tooltip:", error);
      // 強制清除引用
      this.currentTooltip = null;
    }
  }

  addStyles() {
    const styleId = "sidebar-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
            .sidebar-header {
                padding: 1rem 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .header-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-height: 40px;
            }

            .header-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex-shrink: 0;
            }

            .language-toggle {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 5px;
                padding: 0.35rem 0.5rem;
                color: var(--text-primary);
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 0.2rem;
                white-space: nowrap;
                min-width: 45px;
            }

            .language-toggle:hover {
                background: var(--primary-color);
                color: white;
                transform: translateY(-1px);
            }

            .sidebar-title {
                font-size: 0.8rem;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
                margin: 0;
                min-width: 0;
            }

            .version-line {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                margin-top: -0.25rem;
            }

            .version-badge {
                font-size: 0.6rem;
                font-weight: 400;
                color: var(--text-secondary);
                background: var(--bg-secondary);
                padding: 0.1rem 0.3rem;
                border-radius: 0.25rem;
                border: 1px solid var(--border-color);
                line-height: 1;
                white-space: nowrap;
            }

            .sidebar-toggle {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .sidebar-toggle:hover {
                background: var(--bg-secondary);
            }

            .lucide-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .lucide-icon svg {
                width: 100%;
                height: 100%;
            }

            .sidebar-nav {
                flex: 1;
                overflow-y: auto;
                padding: 1rem 0;
            }

            .nav-category {
                margin-bottom: 1rem;
            }

            .category-header {
                padding: 0.5rem 1.5rem;
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                line-height: 1.2;
            }

            .nav-item {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.75rem 1.5rem;
                color: var(--text-primary);
                text-decoration: none;
                transition: background-color 0.2s;
                position: relative;
                min-height: 44px;
                gap: 0.75rem;
            }

            .nav-item:hover {
                background: var(--bg-secondary);
            }

            .nav-item.active {
                background: var(--bg-secondary);
                color: var(--primary-color);
            }

            .nav-item.active::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--primary-color);
            }

            .nav-icon,
            .tool-icon {
                min-width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .nav-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 0.875rem;
                line-height: 1.3;
                flex-shrink: 0;
            }

            .sidebar-footer {
                padding: 0.75rem 1rem;
                border-top: 1px solid var(--border-color);
            }

            .feature-info {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .feature-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.25rem 0.5rem;
                color: var(--text-secondary);
                font-size: 0.7rem;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s ease;
                position: relative;
            }

            .feature-item:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .feature-item:hover .info-icon {
                color: var(--primary-color);
            }

            .feature-left {
                display: flex;
                align-items: center;
                flex: 1;
                min-width: 0;
            }

            .feature-icon {
                margin-right: 0.5rem;
                min-width: 12px;
                flex-shrink: 0;
            }

            .feature-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 0.7rem;
                line-height: 1.2;
                flex: 1;
            }

            .info-icon {
                color: var(--text-secondary);
                transition: color 0.2s ease;
                margin-left: 0.5rem;
                flex-shrink: 0;
                min-width: 10px;
            }

            .tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                font-size: 0.7rem;
                white-space: nowrap;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                pointer-events: none;
                margin-bottom: 0.5rem;
            }

            .tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 4px solid transparent;
                border-top-color: rgba(0, 0, 0, 0.9);
            }

            /* 禁用原有 CSS hover 效果，改用 JavaScript 控制 */
            .feature-item:hover .tooltip {
                opacity: 0 !important;
                visibility: hidden !important;
            }

            /* 懸浮 toggle 按鈕 */
            .floating-sidebar-toggle {
                position: fixed;
                top: 1rem;
                left: 1rem;
                width: 44px;
                height: 44px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 1001;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            /* 頁籤式附著狀態 */
            .floating-sidebar-toggle.attached {
                border-radius: 0 22px 22px 0;
                border-left: none;
                box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
                background: var(--bg-primary);
            }

            .floating-sidebar-toggle:hover {
                background: var(--primary-color);
                color: white;
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            /* 頁籤模式的 hover 效果 */
            .floating-sidebar-toggle.attached:hover {
                transform: translateX(2px) scale(1.02);
                box-shadow: 4px 0 12px rgba(0, 0, 0, 0.2);
            }

            .floating-sidebar-toggle .lucide-icon {
                width: 20px;
                height: 20px;
            }

            /* 遮罩樣式 */
            .sidebar-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 50;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                pointer-events: none;
            }

            @media (max-width: 768px) {
                .floating-sidebar-toggle {
                    display: flex;
                }

                .sidebar-toggle {
                    display: none;
                }

                /* 原有 tooltip 結構保留但禁用，動態 tooltips 將正常運作 */
                .tooltip {
                    display: none !important;
                }

                /* 動態 tooltips 的基礎樣式 */
                .dynamic-tooltip {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    line-height: 1.4;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
            }

            /* 768px斷點響應式定位 */
            @media (max-width: 768px) and (min-width: 481px) {
                .floating-sidebar-toggle.attached {
                    left: calc(100% - 51px);
                }
            }

            /* 480px斷點響應式定位 */
            @media (max-width: 480px) {
                .floating-sidebar-toggle.attached {
                    left: calc(100% - 51px);
                }

                .sidebar-overlay.show {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }
            }

            @media (max-width: 480px) {
                .sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    z-index: 1000;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                }

                .sidebar.expanded {
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            }
        `;
    document.head.appendChild(style);
  }
}

export default Sidebar;
