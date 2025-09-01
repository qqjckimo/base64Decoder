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