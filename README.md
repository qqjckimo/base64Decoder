# Base64 Image Decoder and Pixel Analysis Tool

🖼️ A powerful web-based tool for decoding Base64 encoded images and performing detailed pixel analysis.

## Features

### 🔍 Base64 Image Decoding
- Decode Base64 encoded images from data URLs or raw Base64 strings
- Support for multiple image formats: PNG, JPEG, GIF, WebP
- Real-time image display and analysis

### 📊 Comprehensive Pixel Analysis
- **Image Information**: Display dimensions, format, file size, and total pixel count
- **Color Statistics**: Count unique colors and analyze dominant colors
- **Brightness Analysis**: Calculate average brightness of the image
- **Interactive Pixel Inspection**: Click on any pixel to view detailed color information
- **Color Format Support**: RGB, HEX, and HSL color representations
- **Transparency Analysis**: Detect and count transparent pixels

### 🎨 Advanced Color Features
- Dominant color extraction with percentage breakdown
- Color preview swatches
- Hover effects for pixel-level color inspection
- Real-time pixel coordinate and color display

## How to Use

1. **Open the Tool**: Open `index.html` in any modern web browser
2. **Input Base64 Data**: 
   - Paste your Base64 encoded image string into the text area
   - Supports both data URLs (e.g., `data:image/png;base64,iVBORw0...`) and raw Base64 strings
3. **Decode**: Click the "🔍 解碼並分析" (Decode and Analyze) button
4. **Analyze**: View the decoded image and explore the detailed pixel analysis
5. **Interact**: Click on any pixel in the image to see its color information

### Example Usage
- Load the included example by clicking "📋 載入範例" (Load Example)
- Clear all data with "🗑️ 清空" (Clear)

## Installation

No installation required! This is a standalone HTML file with embedded CSS and JavaScript.

### Local Usage
1. Download or clone this repository
2. Open `index.html` in your web browser
3. Start using the tool immediately

### Online Hosting
Simply upload the `index.html` file to any web server or hosting service.

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

## Technical Details

### Architecture
- **Frontend**: Pure HTML5, CSS3, and Vanilla JavaScript
- **No Dependencies**: No external libraries or frameworks required
- **Responsive Design**: Works on desktop and mobile devices
- **Canvas-Based**: Uses HTML5 Canvas for pixel-level image analysis

### Features Implementation
- **Base64 Decoding**: Native browser support for data URLs
- **Color Analysis**: Canvas-based pixel data extraction
- **Color Space Conversion**: RGB to HEX and HSL conversion algorithms
- **Interactive UI**: Event-driven pixel inspection with hover effects

## File Structure

```
base64Decoder/
├── index.html          # Main application file (HTML + CSS + JS)
├── LICENSE            # MIT License
└── README.md          # This documentation file
```

## Language and Localization

- **User Interface**: Traditional Chinese (zh-TW)
- **Documentation**: English
- **Code Comments**: Chinese and English

The tool is designed primarily for Traditional Chinese users, but the functionality is universal and can be used by anyone.

## Use Cases

- **Web Development**: Debug Base64 encoded images in web applications
- **Image Analysis**: Analyze color composition and properties of images
- **Design Tools**: Extract color palettes from images
- **Educational**: Learn about image formats, color spaces, and pixel data
- **Debugging**: Troubleshoot image encoding/decoding issues

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Guidelines
- Maintain the single-file architecture for simplicity
- Ensure cross-browser compatibility
- Follow existing code style and conventions
- Test thoroughly across different image formats

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

訪問 GitHub Pages 部署的版本：
[https://qqjckimo.github.io/base64Decoder/](https://qqjckimo.github.io/base64Decoder/)

> **注意**：GitHub Pages 部署已設定完成！請參考 [GitHub Pages 部署指南](GITHUB_PAGES_SETUP.md) 來啟用 GitHub Pages 功能。

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

