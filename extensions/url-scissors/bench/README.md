# bench

效能與 e2e 量測。全部使用 **headful Chrome + 真實 X 輸入**，不用 headless、不用 `chrome.action.openPopup()`：

- headless 沒有真實的視窗焦點語意，popup 的關閉行為不可信
- 程式碼開啟的 popup 不會授予 `activeTab`，而產品只靠 `activeTab`

## 環境

```bash
# Debian/Ubuntu
apt-get install -y xvfb openbox xdotool imagemagick ffmpeg
Xvfb :99 -screen 0 1280x900x24 -nolisten tcp &
DISPLAY=:99 openbox &
npm i -D playwright   # 或使用系統已安裝的 Chromium：BENCH_CHROME=/path/to/chrome
```

環境變數：`BENCH_DISPLAY`（預設 `:99`）、`BENCH_CHROME`、`BENCH_OUT`（JSON 輸出路徑）、`BENCH_VARIANTS`。

## 情境

| 指令 | 量什麼 |
|---|---|
| `node bench/run.js open [N]` | 按鍵 → 參數列畫出，P75，產品 vs 兩個地板（A/A），各段拆解 |
| `BENCH_VARIANTS=pinned node bench/run.js open` | 加上已釘選的產品與地板 |
| `BENCH_VARIANTS=keepalive,keepalivePinned ...` | 加上 keepalive SW 實驗變體（**不在產品中**） |
| `node bench/run.js runtime [rounds]` | 打字、點擊的輸入 → 下一次 paint，P75 |
| `node bench/run.js func` | e2e 行為檢查，失敗時 exit code 1 |
| `node bench/video.js [opens] [fps]` | ffmpeg 錄畫面逐幀分析可見時間與高度變化 |
| `node bench/shots.js <dir>` | 淺色/深色各狀態的真實 popup 截圖 |

## 運作方式

- `lib.js` 把 `src/` 複製到暫存資料夾，在 `popup.js` **之前**注入 `fixtures/hook.js`，並改掉 manifest 的名稱與快捷鍵。**產品程式碼裡只有 User Timing marks**（`us:boot`、`us:api*`、`us:ipc*`、`us:render`，在 DevTools Performance 面板也看得到）
- 地板（`fixtures/floor.html`）是同尺寸、什麼都不做的 popup，同步就緒、零 IPC
- 多個 build 載入同一個瀏覽器、各有不同快捷鍵、**亂序交錯**量測，讓時間漂移平均落在所有變體上
- hook 用 `sendBeacon` 把結果送到本機 server，**不開任何擴充頁面** —— 開著會讓 extension process 一直活著，就量不到冷開啟
- runtime 樣本在輸入閒置 250ms 時送出，**不能等 `pagehide`**：popup 關閉後 process 約 10ms 就被回收，beacon 來不及送
- 釘選狀態寫在啟動前的 profile `Preferences`（`extensions.pinned_extensions`）
- 按鍵時間 = spawn xdotool 前的時間 + 校正過的 spawn 開銷，並用 `--delay 0`。`xdotool key` 預設在按鍵事件之間延遲 12ms，而快捷鍵在 key-down 就觸發，用「xdotool 結束」當按鍵時間會晚約 20ms

## 踩過的坑

- `Alt+Shift+P` 被 Chrome 保留，extension 註冊了也不會觸發
- `xdotool mousemove --sync` 在游標已經在目標位置時會永遠等下去
- popup 首次 paint 時 `screenX/screenY` 還不是最終位置（Chrome paint 完才定位、顯示），點擊座標要等顯示後再取
- ffmpeg：wallclock 時間戳塞進 mkv/nut 會損壞；`showinfo` 的 `pts_time` 以科學記號印出（`1.79385e+09`）精度全失，要用 `pts`（微秒整數）
- 整段影片解碼進記憶體會 OOM（~2400 幀 × 1.2MB），要串流逐幀分析
