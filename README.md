# 夜市釘孤枝 · 手機簡化版

一次一根釘子、一顆主要按鈕，保留原版六段粗獷台語配音。

📱 **手機版線上試玩**：[https://nutcelvischen-jpg.github.io/night-market-hammer-mobile/](https://nutcelvischen-jpg.github.io/night-market-hammer-mobile/)  
🔨 **3D 完整版**：[https://nutcelvischen-jpg.github.io/night-market-hammer/](https://nutcelvischen-jpg.github.io/night-market-hammer/)

## 專案完整路徑

```text
/Users/chenchunchih/Desktop/voice to text/night_market_hammer_mobile
```

原版保留在相鄰的 `night_market_hammer`，此專案獨立運作。

## 本機啟動

需要 Python 3，遊戲不需 npm install 或建置：

```bash
python3 -m http.server 8093 --directory "/Users/chenchunchih/Desktop/voice to text/night_market_hammer_mobile"
```

電腦開啟 http://localhost:8093/ 。手機與電腦連同一個 Wi-Fi，使用 `http://電腦區域網路IP:8093/`；手機的 localhost 不會指向電腦。

## 玩法

1. 點「開始挑戰」啟動 35 秒。
2. 準星進綠區，點「鎖定瞄準」。
3. 按住同一顆按鈕蓄力，力量到綠區時放開。
4. 釘平一根得到 100 分，自動換下一根；打歪也會換下一根。部分釘入可以補敲。
5. 瞄偏會落空，力道過大或偏打重槌會歪。力道綠區會隨剩餘釘長改變。

桌面可聚焦主要按鈕，使用空白鍵或 Enter 操作。重瞄保留為次要按鈕。切到背景或失去焦點會暫停並取消蓄力，回來按「繼續挑戰」。靜音涵蓋音效與配音，字幕仍保留。

## 簡化了什麼

- 單根釘子、自動換下一根，不需要切換五個目標。
- 單一鎚頭，移除鎚頭切換、鏡頭操作與倍率選單。
- 頂部只留倒數和五根進度，毫米數只在下沉特寫出現。
- 原生 Canvas 2D，不需要 Three.js、WebGL、GLB、Blender 或外部 CDN。
- 保留命中慢鏡頭、釘子下沉、鎚子立即反彈、彎釘與老闆配音。
- 已有 reduced-motion 替代呈現；仍需實機確認不同手機的聲音策略與操作手感。

## 程式檔

| 檔案 | 用途 |
|---|---|
| `index.html` | 入口、操作介面、字幕 |
| `styles.css` | 手機直向、小螢幕、橫向與桌面排版 |
| `app.js` | 觸控／鍵盤事件、畫面與音效串接 |
| `game.js` | 瞄準、蓄力、35 秒、判定與計分 |
| `scene.js` | 鐵鎚、釘子、木頭、慢動作與反彈的 Canvas 繪製 |
| `audio.js` | 原版音效與配音播放、靜音、避免重疊 |
| `icon.svg` | 網站圖示 |
| `voice/` | 六段使用者選定的粗獷版 MP3，直接複製原檔 |
| `voice_lines.json` | 配音台詞、台羅拼音及生成提示 |
| `scripts/generate_voice.py` | 可選：重新生成音檔 |
| `tests/voice-audio.cjs` | 配音靜音、輪替、中斷、字幕與音檔一致性測試 |
| `tests/game.test.js` | 遊戲狀態、計分、截止時間、暫停與反彈測試 |
| `tests/preview.html` | 390×844、320×568、844×390 的 iframe 預覽 |
| `PRODUCT.md`、`DESIGN.md` | 本版需求與視覺規格 |
| `PATHS.txt` | 交付時的完整絕對路徑清單 |
| `.nojekyll` | GitHub Pages 靜態檔案設定 |

## 配音

- `intro.mp3`：叮叮當！敲壞不用賠！
- `miss_air.mp3`：你咧拍空氣喔？
- `miss_love.mp3`：哎喲，你咧疼伊喔？
- `bent_dance.mp3`：釘仔咧跳舞喔？
- `bent_heart.mp3`：免賠啦！我心疼爾爾。
- `success.mp3`：保利達 B！！

落空兩句交替，敲歪兩句交替。每局開場一次，成功喊保利達 B。配音需使用者第一次點擊才啟動；本版沒有重新合成使用者已喜歡的音檔。

## 自己推 Git / GitHub Pages

1. 在這個資料夾建立或加入你的 Git repository，提交檔案後自行推送。
2. GitHub repository 的 Pages 設定使用你推送的分支，以及 `/(root)` 作為來源。
3. 所有遊戲資源都是相對路徑，可直接放在 `https://帳號.github.io/專案名稱/`。

不需要伺服器後端、API 金鑰或 npm 套件；未代為建立 Git repository、推送或部署。

配音重製腳本才需要你在本機設定 `OPENROUTER_API_KEY`。專案與 ZIP 不包含金鑰。若只玩遊戲，無需設定。

## 測試

需要 Node.js 18 或以上：

```bash
npm test
```

或 `node --test tests/game.test.js`。瀏覽器尺寸檢查： http://localhost:8093/tests/preview.html 。尺寸預覽不等於實體 iOS / Android 裝置測試。

## 地獄難度 1.2

- 35 秒完成五根。落空扣 3 秒，敲歪扣 5 秒；六段配音維持原音檔。
- 瞄準綠區從上一版的 20% 縮至 14%；準星更快、持續變速，後面的釘子再加速。
- 瞄準偏差超過 0.52 會落空；偏差超過 0.30 且力量超過 40% 會彎釘。
- 剩餘 2mm 內算釘平，超過釘長 3mm 的力量會敲歪。綠色力量範圍依實際成功判定計算，瞄偏時不顯示假綠區。
- 第 1 至第 5 根蓄滿時間從 0.76 秒縮至 0.64 秒。可分次輕敲，但每一槌都花時間。
- 調整入口：game.js 的 HARD、ROUND_SECONDS、chargePeakSeconds 與瞄準速度。
- 前一版程式備份在 backups/before-hell，前一版完整 ZIP 為相鄰的 night_market_hammer_mobile_v1.1.zip。
- 目前本機與 ZIP 為 1.2；上方 GitHub Pages 需自行推送後才會更新。
