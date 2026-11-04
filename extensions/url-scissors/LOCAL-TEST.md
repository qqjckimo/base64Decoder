# 實機確認（選用）

0-1「popup 是否在套用後存活」**已經在容器內用 headful Chrome + Xvfb + openbox 確認為 SURVIVES**，
並且通過驗證閘門（同一個 popup 實例被「切換分頁」殺掉，證明關閉偵測有效；而導航不會觸發它）。
細節見 `SPIKE-RESULTS.md`。

所以這份文件不再是必要步驟，只剩兩個用途：

1. 拿到**你自己機器**的效能數字（容器的絕對值不具代表性）
2. 確認真實 Chrome（非 Chrome for Testing）行為一致

## 步驟

1. `chrome://extensions` → 開啟**開發人員模式** → **載入未封裝項目** → 選 `extensions/url-scissors/`
2. 開一個帶 query 參數的網頁，例如
   `https://www.google.com/search?q=test&hl=zh-TW&num=20`
3. 點工具列圖示（或 `Alt+Shift+U`）→ 改任一參數的值 → 按**套用**

## 看什麼

popup 底部的效能浮層：

```
path=query  params=4  box=480x353
script->rows 12.60ms   fcp -1.00ms
ipc 1.30ms (tabs 1.3 win 1.3)  maxh 320
```

容器量到的參考值：IPC `~2ms`、doc→rows `~31ms`、popup box 隨視窗夾取。
你機器上的絕對值會更低，但**比例**應該一樣：IPC 和我們的程式碼都淹沒在
文件建立成本裡。如果你看到 `ipc` 持續超過 10ms，那才是新資訊，告訴我。

同時可以驗證尺寸行為：把瀏覽器視窗拉矮（< 450px 高）再開 popup，
它應該夾到 `480x320` 並出現內部捲軸，而不是超出視窗。

## 這是 spike 版本，不是 MVP

目前刻意保留、MVP 要處理的：

- `tabs` 權限（只為量測 0-3 而加，**MVP 移除**，改為只用 `activeTab`）
- `trigger.html` / `results.html` / `blank.html` / `spike/`（測試鷹架，MVP 刪除）
- 底部效能浮層（改為 dev-only，由旗標開啟）
- key/value 顯示**原始百分比編碼**（證明保真解析；MVP 要加「可安全還原時顯示解碼值」的邏輯）
- 尚未實作：套用後的狀態連續性（dirty 判定、伺服器轉址採用、外部導航處理）
