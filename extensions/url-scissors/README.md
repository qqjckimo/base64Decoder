# URL Scissors

在 popup 裡編輯、新增、刪除目前分頁網址的 query 參數，按下套用後**視窗保持開啟**，可以連續調整。

> ⚠️ **名稱衝突**：Chrome Web Store 上已有一個同名的「URL Scissors」（ID `kgnbnbifdjcokgodkgjliaegpollgafa`，功能相近）。這裡的名稱只是工作代號，**上架前必須改名**。

## 安裝（開發中）

1. `chrome://extensions` → 開啟**開發人員模式** → **載入未封裝項目** → 選 **`src/`** 資料夾
2. 把圖示**釘選到工具列**（拼圖圖示 → 圖釘）。實測未釘選時每次開啟要多等約 260ms，見 [PERF.md](PERF.md)
3. 在任何網頁按 `Alt+Shift+U` 或點圖示

## 使用

- **主區域永遠是目前網址列的內容**（所見即所得）。改值後按 `Enter` 或「套用」
- 套用後 popup 不會關閉，焦點留在原本的欄位，可以馬上再改
- 可以安全解碼的值以解碼後的文字顯示（`hello%20world` → `hello world`）；無法一字不差還原的值（例如 `%2F`、小寫十六進位）以**原始編碼**顯示並用虛線框標記，避免改動你沒碰到的部分
- **次要區域**（預設收合，清楚標示）：
  - **已被轉址**：套用的網址被伺服器轉到別處時，保留原本套用的網址。可以在這裡編輯後按「套用這個網址」，從它重新出發
  - **未套用的編輯**：popup 在你套用前被關掉（例如切換分頁）時，下次開啟會在這裡找回
- 跨網域轉址後 `activeTab` 權限會失效，主區域會明確顯示「無法讀取」而不是留著舊網址；重新開啟 popup 即可

## 權限

只有 `activeTab` 與 `storage`。**沒有 `tabs` 權限**，因此安裝時沒有「讀取你的瀏覽紀錄」警告。沒有 service worker。

## 結構

```
src/          外掛本體（載入/打包這個資料夾）
  manifest.json
  popup.html  inline critical CSS
  popup.js    單一 classic script：上半是純函式 URL 模型，下半是 UI
  icons/      16/32/48/128 PNG + icon.svg 原始檔
test/         URL 模型單元測試（Node 內建 test runner）
bench/        效能與 e2e 量測（真實 X 輸入、headful Chrome）
PERF.md       效能框架、量測結果、待決策事項
SPIKE-RESULTS.md  Step 0 spike 的原始紀錄（部分結論已被 PERF.md 修正）
```

## 指令

```bash
npm test                 # URL 模型單元測試（不需瀏覽器）
npm run bench:func       # e2e 行為檢查：轉址、次要區域、草稿、焦點、跨網域
npm run bench:open       # 開啟效能 P75，相對地板差值，A/A 雜訊
npm run bench:runtime    # 輸入延遲 P75
npm run bench:video      # 錄畫面逐幀分析：可見時間、是否有跳動
npm run zip              # 打包 src/ 成 url-scissors.zip
```

bench 需要 X display + window manager + xdotool，見 [bench/README.md](bench/README.md)。
