# Web Developer Tools Collection

🛠️ A modular collection of web developer tools built for maximum portability and minimal bundle size. Features a progressive loading architecture with tools loaded on-demand.

## Available Tools

### 🔍 Base64 Image Decoder (~15KB, preloaded)

- **Advanced Pixel Analysis**: Click pixels for RGB, HEX, HSL color information
- **Color Statistics**: Unique colors, dominant colors, transparency analysis
- **Interactive Features**: Monaco Editor integration for code display
- **Canvas-based Processing**: Real-time image analysis and brightness calculation
- **Multi-format Support**: PNG, JPEG, GIF, WebP with automatic detection

### 🖼️ Base64 Image Encoder (~135KB, on-demand)

- **Multi-format Encoding**: PNG, WebP, AVIF with quality settings
- **Web Worker Processing**: Non-blocking compression analysis
- **Compression Comparison**: Real-time size comparison across formats
- **Advanced Analytics**: Detailed compression statistics and charts
- **Professional Features**: Batch processing with progress tracking

### 🔧 ICO File Analyzer (~25KB, pending integration)

- **Deep ICO Analysis**: Format detection (PNG vs BMP embedded)
- **Metadata Extraction**: Complete icon file structure analysis
- **HEX Viewer**: Binary file inspection capabilities
- **Multi-size Support**: Analyze all icon sizes within ICO files

### 🎨 PNG to ICO Converter (~28KB, pending integration)

- **Professional Icon Creation**: Multiple size generation (16x16 to 256x256)
- **High-quality Scaling**: Advanced scaling algorithms
- **Three Conversion Modes**: Standard, high-quality, and professional
- **ICO Format Compliance**: Full Windows icon format support

## Architecture Features

### 📦 Bundle Size Optimization

- **Core Bundle**: ~29KB (app shell + critical components)
- **Progressive Loading**: Tools loaded only when accessed
- **Code Splitting**: Each tool as independent module
- **CDN Integration**: External libraries loaded on-demand
- **Target Achievement**: Initial load + first tool < 150KB

### 🏗️ Modular Architecture

- **Dynamic Routing**: Hash-based navigation with tool validation
- **Component System**: Reusable UI components with scoped styles
- **Utility Sharing**: Common functions extracted to shared modules
- **Memory Management**: Automatic cleanup and resource optimization

## Quick Start

1. **Access the Application**: Open `index.html` in any modern web browser
2. **Navigate Tools**: Use the sidebar to select desired tools
3. **Dynamic Loading**: Tools load automatically when selected
4. **Multi-tool Workflow**: Switch between tools seamlessly

### Tool-Specific Usage

#### Base64 Image Decoder

1. Paste Base64 string or data URL into the input area
2. Click "🔍 解碼並分析" to decode and analyze
3. Click on any pixel for detailed color information
4. Use "📋 載入範例" to load demo image

#### Base64 Image Encoder

1. Upload or drag-drop an image file
2. Select output format (PNG, WebP, AVIF) and quality
3. Compare compression results across formats
4. Copy optimized Base64 output

#### ICO Analyzer (Standalone)

1. Open `src/tools/icoAnalyzer/index.html` directly
2. Load ICO file to analyze internal structure
3. View embedded images and metadata

#### PNG to ICO Converter (Standalone)

1. Open `src/tools/pngToIco/index.html` directly
2. Upload PNG image and select output sizes
3. Download generated ICO file

## Installation & Deployment

### Local Development

```bash
# Clone the repository
git clone https://github.com/qqjckimo/base64Decoder.git
cd base64Decoder

# For basic usage - just open index.html
# For development with hot reload
npm install
npm run dev

# Build for production
npm run build

# Analyze bundle sizes
npm run analyze
```

### Production Deployment

Production 只透過 **Cloudflare Workers Builds** 部署：push 或 merge 到 `main` 就會自動 build 並部署。

> ⚠️ **重要：不要手動執行 `wrangler deploy`。**
> chunk 檔名雜湊和 build 機器的絕對路徑有關（webpack 會把 @jsquash 裡的 `import.meta.url` 換成 `file:///<build 路徑>`）。手動 build 出來的檔名和 Cloudflare build 的不同，每換一次 build 來源，舊 chunk 就會被刪掉，已經開著的頁面會載入失敗，要重新整理才會恢復。

### No-build Usage

For quick testing, simply open `index.html` in a modern browser. The modular architecture works without a build step.

## Browser Compatibility

This tool works with all modern web browsers that support:

- HTML5 Canvas API
- ES6+ JavaScript features
- CSS Grid and Flexbox

**Tested Browsers:**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Technical Architecture

### Core Technologies

- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Module System**: Dynamic ES6 imports with lazy loading
- **Build System**: Webpack with aggressive bundle optimization
- **UI Framework**: None - custom responsive CSS Grid/Flexbox
- **External Dependencies**: CDN-loaded for minimal bundle impact

### Performance Optimizations

- **Code Splitting**: Each tool as separate dynamically-loaded module
- **Tree Shaking**: Aggressive removal of unused code
- **Minification**: Terser (JS), cssnano (CSS), html-minifier-terser
- **Compression**: gzip/brotli ready with optimal chunking
- **Lazy Loading**: Tools loaded only when accessed
- **Memory Management**: Automatic cleanup and resource deallocation

### Bundle Size Strategy

| Component         | Size (minified + gzipped) | Loading Strategy   |
| ----------------- | ------------------------- | ------------------ |
| Core Bundle       | ~29KB                     | Initial load       |
| Base64 Decoder    | ~15KB                     | Preloaded          |
| Base64 Encoder    | ~135KB                    | On-demand          |
| ICO Analyzer      | ~25KB                     | Standalone/pending |
| PNG to ICO        | ~28KB                     | Standalone/pending |
| **Total Initial** | **~44KB**                 | **< 50KB target**  |

## Project Structure

```
base64Decoder/
├── index.html                    # Main app shell
├── src/
│   ├── core/                    # Core functionality - See core/claude.md
│   │   ├── app.js              # Main application logic (~3KB)
│   │   ├── router.js           # Hash-based routing (~2KB)
│   │   ├── loader.js           # Dynamic module loader (~2KB)
│   │   └── styles.css          # Critical core styles (~8KB)
│   ├── components/             # UI components - See components/claude.md
│   │   ├── sidebar/            # Navigation (~8KB)
│   │   └── shared/Icon.js      # Icon system (~1KB)
│   ├── tools/                  # Individual tools
│   │   ├── base64-decoder/     # Image decoder (~15KB)
│   │   ├── base64-encoder/     # Image encoder (~135KB)
│   │   ├── icoAnalyzer/        # ICO analyzer (~25KB, standalone)
│   │   └── pngToIco/          # PNG to ICO (~28KB, standalone)
│   └── utils/                  # Shared utilities - See utils/claude.md
│       └── monacoLoader.js     # Monaco Editor loader (<5KB)
├── docs/                       # Production build output
├── build.js                    # Build script
├── package.json               # Dependencies
├── CLAUDE.md                  # Project configuration
└── LICENSE                    # MIT License
```

### Documentation Structure

Each module includes comprehensive documentation:

- **[Core Systems](./src/core/claude.md)**: Application architecture
- **[Components](./src/components/claude.md)**: UI component library
- **[Utilities](./src/utils/claude.md)**: Shared functionality
- **[Tool Documentation](./src/tools/)**: Individual tool guides

## Language and Localization

- **User Interface**: Traditional Chinese (zh-TW)
- **Documentation**: English
- **Code Comments**: Chinese and English

The tool is designed primarily for Traditional Chinese users, but the functionality is universal and can be used by anyone.

## Use Cases

### Development Workflows

- **Web Development**: Debug Base64 encoded images in applications
- **Performance Analysis**: Compare image compression across formats
- **Icon Creation**: Generate professional Windows icons from PNG
- **Format Conversion**: Convert between image formats with quality control

### Design & Analysis

- **Color Analysis**: Extract color palettes and analyze composition
- **Image Debugging**: Troubleshoot encoding/decoding issues
- **Format Inspection**: Deep analysis of ICO file structures
- **Educational**: Learn about image formats, compression, and pixel data

### Professional Tools

- **Asset Optimization**: Find optimal compression settings
- **Icon Production**: Create multi-size icon sets
- **Quality Assessment**: Compare visual quality vs file size

## Contributing

Contributions are welcome! Please follow the established patterns and bundle size requirements.

### Development Guidelines

- **Bundle Size Priority**: Every feature must justify its byte cost
- **Modular Architecture**: Each tool as independent, lazy-loaded module
- **Documentation**: Update relevant `claude.md` files for any changes
- **Testing**: Test across different browsers and image formats
- **Code Standards**: Follow existing patterns in each module

### Adding New Tools

```bash
# Create new tool structure
npm run create-tool [tool-name]

# Ensure bundle size < 30KB
npm run analyze

# Update documentation
# Edit src/tools/[tool-name]/claude.md
```

### Integration Process

1. **Development**: Create tool in `src/tools/[name]/`
2. **Documentation**: Add comprehensive `claude.md`
3. **Bundle Analysis**: Verify size requirements
4. **Testing**: Cross-browser compatibility
5. **Integration**: Add to router and sidebar navigation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Jason Chen** - Initial work and development

## Acknowledgments

- Built with modern web technologies
- Designed for simplicity and ease of use
- Inspired by the need for accessible image analysis tools

---

**Note**: This tool processes images entirely in your browser. No data is sent to external servers, ensuring privacy and security of your images.

---

# 🖼️ Base64 圖片解碼與像素分析工具

一個簡單易用的 Base64 圖片解碼工具，支援圖片顯示與詳細的像素分析功能。

## 🌟 功能特色

- **Base64 解碼**：支援完整的 data URL 格式或純 Base64 字串
- **智慧格式檢測**：自動識別 PNG、JPEG、GIF 等常見圖片格式
- **像素分析**：點擊圖片任意位置查看像素的 RGB、HEX、HSL 色彩資訊
- **拖放支援**：直接拖放圖片檔案自動轉換為 Base64
- **剪貼簿支援**：支援從剪貼簿貼上圖片
- **響應式設計**：適配桌面和行動裝置

## 🚀 線上使用

[https://tools.jzsobiz.cc/](https://tools.jzsobiz.cc/)（Cloudflare Workers，從 `main` 自動部署）

## 📱 使用方法

1. **輸入 Base64 字串**

   - 貼上完整的 data URL（如：`data:image/png;base64,iVBORw0KGgoAAAA...`）
   - 或僅貼上 Base64 編碼部分（工具會自動添加前綴）

2. **拖放圖片檔案**

   - 直接將圖片檔案拖放到輸入框
   - 系統會自動轉換為 Base64 並顯示

3. **剪貼簿貼上**

   - 複製圖片後，在頁面任意位置按 Ctrl+V（或 Cmd+V）
   - 自動轉換並顯示圖片

4. **像素分析**
   - 點擊顯示的圖片任意位置
   - 查看該像素的詳細色彩資訊

## 💻 本地開發

```bash
# 克隆倉庫
git clone https://github.com/qqjckimo/base64Decoder.git

# 進入目錄
cd base64Decoder

# 啟動本地伺服器（可使用任何 HTTP 伺服器）
python -m http.server 8000
# 或
npx serve .
# 或
php -S localhost:8000

# 在瀏覽器中訪問 http://localhost:8000
```

## 🔧 技術特點

- 純前端實現，無需後端伺服器
- 使用原生 JavaScript，無外部依賴
- 支援 Canvas API 進行像素級分析
- 響應式 CSS Grid 佈局
- 支援多種圖片格式自動檢測

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

Made with ❤️ by [Jason Chen](https://github.com/qqjckimo)

**Note**: This tool processes images entirely in your browser. No data is sent to external servers, ensuring privacy and security of your images.
