# 2 分鐘手動驗證（只為了關掉 0-1 的 headless 疑慮）

容器裡的 `--headless=new` **沒有真實的視窗焦點語意** —— 我們實測發現「聚焦別的視窗」
並不會關掉 popup，而在真實桌面上它會。焦點轉移到導航中的網頁，正是最可能關掉 popup 的機制。

所以自動化測出的 **SURVIVES** 需要你在真實 Chrome 上確認一次。

## 步驟

1. Chrome 開 `chrome://extensions`，右上角打開 **開發人員模式**
2. 點 **載入未封裝項目**，選 `extensions/url-scissors/` 這個資料夾
3. 開一個帶 query 參數的網頁，例如
   `https://www.google.com/search?q=test&hl=zh-TW&num=20`
4. 點工具列的 URL Scissors 圖示（或按 `Alt+Shift+U`）
5. 改掉任何一個參數的值 → 按 **套用**

## 判讀

| 現象 | 代表 | 後續 |
|---|---|---|
| **popup 還開著**，頁面已重新載入 | SURVIVES —— 自動化結果成立 | 走原計畫，狀態保存只當 click-away／Esc 的保險 |
| **popup 消失了** | 焦點機制在真實桌面會殺掉它 | 啟用 Phase E：`chrome.storage.session` 存狀態 + `chrome.action.openPopup()` 自動重開 + paint 前還原 |

順便看一下 popup 底部的 **效能浮層**，它會顯示你這台機器的真實數字：

```
path=query  params=7
script->rows 1.20ms   fcp 18.00ms
tabs.query 2.10ms
```

容器量到的是 `script->rows ≈ 1ms` / 文件建立地板 `≈ 46ms`。
你本機的絕對值會低很多，但**比例**（我們的程式碼 vs 文件建立）應該一樣懸殊。
如果你機器上 `script->rows` 也是 1~2ms，就確認了「渲染路徑已經沒有東西可以再榨」這個結論。

## 這是 spike 版本，不是 MVP

目前刻意保留的東西：
- `tabs` 權限（只為了量測 0-3，**MVP 要移除**，改成只用 `activeTab`）
- `trigger.html` / `results.html` / `blank.html` / `spike/`（測試鷹架，MVP 要刪）
- key/value 顯示的是**原始百分比編碼**（證明保真解析，MVP 要加上「安全時顯示解碼值」的邏輯）
- 拖曳排序**尚未實作**（只有 grip 圖示）
