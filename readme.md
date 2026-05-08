# Running Tracker (跑步器) - V3 原生封裝版 (V3 Native Wrapper Edition)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![UI](https://github.com/inchinet/runrecord-app/blob/main/runrecord.png)
![UI](https://github.com/inchinet/runrecord-app/blob/main/runrecord2.png)

## 🚀 總覽 Overview
V3 是「跑步器」的原生封裝版本，旨在解決行動瀏覽器在背景模式下限制 GPS 更新所造成的「背景到前景路徑斷層」問題。 透過從標準 Web 應用程式遷移到 **Capacitor** 原生封裝，我們實現了一個 **前景服務 (Foreground Service)**，確保即使在應用程式最小化或螢幕關閉時，也能持續進行追蹤。
V3 is the native-wrapped version of the Running Tracker, designed to solve the "bg to fg path gaps" caused by mobile browsers throttling GPS in the background. By moving from a standard web app to a **Capacitor** native wrapper, we implement a **Foreground Service** that ensures continuous tracking even when the app is minimized or the screen is off.

## ✨ 功能特色 Features

✅ **GPS 追蹤 GPS Tracking** - 高精度 GPS 定位與訊號強度顯示 / High-accuracy GPS positioning with signal strength indicator  
✅ **Google Maps 整合 Google Maps Integration** - 即時路線視覺化 / Real-time route visualization  
✅ **活動類型 Activity Types** - 支援跑步與步行模式 / Support for running and walking modes  
✅ **完整控制 Full Controls** - 開始、暫停、繼續、停止功能 / Start, Pause, Resume, Stop functionality  
✅ **即時統計 Real-time Stats** - 速度、距離、時間即時顯示 / Live speed, distance, and time display  
✅ **自動暫停/繼續 Auto-Pause/Resume** - 針對地鐵等訊號盲區自動處理 GPS 遺失 / Intelligent handling of GPS signal loss in subways and tunnels  
✅ **資料儲存 Data Storage** - 本地儲存所有活動紀錄 / Local storage for all activity records  
✅ **歷史查詢 History View** - 可篩選一週、一月、一年的紀錄 / Filter records by week, month, or year  
✅ **Excel 匯出 Excel Export** - 將紀錄匯出為 CSV 格式 / Export records to CSV format  
✅ **Liquid Glass UI** - 現代化玻璃擬態設計 / Modern glassmorphism design  
✅ **背景 GPS 追蹤 Background GPS Tracking** - 透過 Capacitor 機制，即使應用程式在背景執行也能持續追蹤 GPS 位置 / Continues GPS tracking even when the app is in the background via Capacitor mechanism  

## ⚠️📋 使用前準備 / 關鍵設定 (API 金鑰) Prerequisites / Critical Configuration (API Key)
**在建置或發布之前**，您必須提供一個有效的 Google Maps API 金鑰。
**Before building or publishing**, you must provide a valid Google Maps API Key. 
1. 開啟 `app.js`。/ Open `app.js`.
2. 找到第 103 行：`const apiKey = 'Your_API_key';` / Locate line 103: `const apiKey = 'Your_API_key';`
3. 將預留位置的值替換為您自己的有效 Google Maps API 金鑰。/ Replace the placeholder value with your own valid Google Maps API key.
4. 如果要發布到 GitHub，**請勿**提交您的私密 API 金鑰。請使用預留位置或獨立的設定檔。/ If publishing to GitHub, **do not** commit your private API key. Use a placeholder or a separate configuration file.
	5. **API 金鑰限制 (安全性)**：建議在 Google AI Studio/Cloud Console 中對 API 金鑰設定「API 限制」，僅啟用 Geocoding API 與 Maps JavaScript API，並將「應用程式限制」設為「無」。/ **API Key Restrictions (Security)**: It is recommended to use "API restrictions" in Google AI Studio/Cloud Console to allow only the Geocoding API and Maps JavaScript API, and set "Application restrictions" to "None".

## 🛠️ 原生實現細節 Native Implementation Details

### 0. 安裝設定 Setup
需要 Android Studio 與對應的 SDK / Requires Android Studio and the corresponding SDK:

To check if the Android SDK is installed / 檢查是否已安裝 Android SDK
`adb --version`

Locate the SDK Installation Path / 找到 SDK 安裝路徑
`where adb`

Installing the Android SDK is most commonly done through Android Studio / 安裝 Android SDK 最常用的方法是使用 Android Studio
https://developer.android.com/studio?hl=zh-tw

Set Environment Variables in path / 設定環境變數
`Add C:\path-to-sdk\platform-tools`

Java Development Kit (JDK) is required / 需要 Java 開發工具包 (JDK)
https://www.oracle.com/apac/java/technologies/downloads/

To check if the JDK is installed / 檢查是否已安裝 JDK
`javac -version`


請在 `C:\\runrecord\V3` 資料夾中執行以下指令，並確保此儲存庫中的所有程式都已載入：
Try running these commands in your `C:\\runrecord\V3` folder with all the programs in this repository:

```bash
# 1. 初始化 npm / Initialize npm
npm init -y

# 2. 安裝 Capacitor / Install Capacitor
npm install @capacitor/core @capacitor/cli

# 3. 初始化專案 / Initialize the project
npx cap init "Running Tracker" "com.antigravity.runrecord" --web-dir www

# 4. 新增 Android 平台 / Add Android platform
npm install @capacitor/android
npx cap add android

# 5. 安裝背景地理位置外掛 / Install the BG Geolocation plugin
npm install @capgo/background-geolocation
npx cap sync android

# 6. 建立 web 資料夾並複製檔案 / Create the web folder and copy files
mkdir www
cp index.html style.css app.js www/
```

完成後，執行 `npx cap open android`，這將會啟動 Android Studio。接著，您可以透過 **Build → Generate APK(s)** 產生 APK。
After running these, run `npx cap open android`. This will launch Android Studio. From there, you can just go to **Build → Generate APK(s)**.

### 1. 背景持續運作 Background Persistence
- **框架 Framework:** Capacitor
- **外掛 Plugin:** `@capgo/background-geolocation` (或類似提供前景服務的外掛 / or similar Foreground Service provider)
- **機制 Mechanism:** 使用一個帶有持續性通知的 Android 前景服務，以防止作業系統終止 GPS 處理程序。/ Uses an Android Foreground Service with a persistent notification to prevent the OS from killing the GPS process.

### 2. Android 所需權限 Android Permissions Required
為確保功能正常，必須在 Android manifest 中授予以下權限：
To function correctly, the following permissions must be granted in the Android manifest:
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_BACKGROUND_LOCATION`
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_LOCATION`
- `android.permission.POST_NOTIFICATIONS` (Android 13+)

### 3. 設定 Configuration
原生行為透過 `capacitor.config.ts` 進行控制：
The native behavior is controlled via `capacitor.config.ts`:
- **間隔 Interval:** 5 秒 / 5 seconds
- **距離過濾器 Distance Filter:** 5 公尺 / 5 meters
- **通知 Notification:** "跑步器 正在追蹤"

## 📂 專案結構 Project Structure
- `C:\\runrecord\V3\app.js`: 主要邏輯 (混合原生/Web GPS) / Main logic (Hybrid Native/Web GPS)
- `C:\\runrecord\V3\index.html`: 使用者介面 / User Interface
- `C:\\runrecord\V3\capacitor.config.ts`: 原生封裝設定檔 / Native wrapper configuration
- `C:\\runrecord\V3\style.css`: 樣式表檔案 / Style CSS file
- `C:\\runrecord\V3\AndroidManifest_requirements.xml`: Android 需求權限參考 / Required Android permissions reference
- `C:\\runrecord\V3\package.json`: npm 套件設定檔 / npm package configuration file
- `C:\\runrecord\V3\package-lock.json`: npm 套件鎖定檔 / npm package lock file

## 🧪 測試封裝版本 Testing the Wrapper
1. 使用 Capacitor 建置專案：`npx cap add android` → `npx cap open android`。/ Build the project using Capacitor: `npx cap add android` → `npx cap open android`.
2. 授予所有位置權限，包含「永遠允許」。/ Grant all location permissions, including "Allow all the time".
3. GPS訊號強的情況下開始跑步(A 點)，將應用程式切換到背景 (B 點)，並移動到 C 點。/ Start a run under strong GPS signal at point A, put the app in the background (point B), and move to point C.
4. 返回應用程式，確認 B-C 路線已成功捕捉且沒有斷層。/ Return to the app to verify the path B-C is captured without gaps.

## 📦 如何產生 .APK How to Generate the .APK

### 步驟 1: 更新 Web 資源 Update Web Assets
原生 APK 會讀取 `www` 資料夾的內容。每當您修改 `app.js`、`style.css` 或 `index.html` 時，都必須同步檔案：
The native APK reads from the `www` folder. Whenever you modify `app.js`, `style.css`, or `index.html`, you must sync them:
```bash
# 在 C:\\runrecord\V3\ 中執行 / Run in C:\\runrecord\V3
mkdir -p www
cp index.html style.css app.js www/
npx cap sync android
```

### 步驟 2: 在 Android Studio 中建置 Build in Android Studio
1. 執行 `npx cap open android` 以啟動 Android Studio。/ Run `npx cap open android` to launch Android Studio.
2. 等待 **Gradle Sync** (底部進度條) 完成。/ Wait for the **Gradle Sync** (bottom progress bar) to complete.
3. 前往頂部選單：**Build** → **Generate App Bundles or APK(s)** → **Generate APK(s)**。
4. 完成後，右下角會出現一個彈出視窗。完成點擊 **"locate"** 連結以開啟包含 APK 的資料夾。/ Once completed, a popup will appear in the bottom-right. Click the **"locate"** link to open the folder containing the APK.
   - 預設路徑 / Default path: `C:\\runrecord\V3\android\app\build\outputs\apk\debug\app-debug.apk`

### 步驟 3: 裝置安裝與設定 Device Installation & Configuration
在您的 Android 裝置上安裝 APK 後，請套用以下設定以防止背景追蹤中斷：
After installing the APK on your Android device, apply these settings to prevent background gaps:
- **位置權限 Location Permission:** 設定 → 應用程式 → 跑步器 → 權限 → 位置 → **「永遠允許」**/**「僅在使用此應用程式時允許」** 。/ Settings → Apps → Running Tracker → Permissions → Location → **"Allow all the time"**/**"Allow only when using this application"**.
- **電池最佳化 Battery Optimization:** 設定 → 應用程式 → 跑步器 → 電池 → **「不受限制」**/**「允許在背景使用>無限制」**。/ Settings → Apps → Running Tracker → Battery → **"Unrestricted"**/**"Allowed for use in the background > Unrestricted"**.
- **通知 Notifications:** (Android 13+) 確保允許通知，以便前景服務正常運作。/ (Android 13+) Ensure notifications are allowed so the Foreground Service can run.

p.s. generate your own app icon using a .png photo / 使用 .png 圖片產生您自己的應用程式圖標
https://easyappicon.com/
unzip and copy all the files to `C:\\runrecord\V3\android\app\src\main\res` mipmap-* and values folder / 
解壓縮並將所有檔案複製到 `C:\\runrecord\V3\android\app\src\main\res` 目錄下的 mipmap-* 和 values 資料夾中

## 📱 使用方式 How to Use

### 1️⃣ 啟用 GPS Enable GPS
點擊「啟用 GPS」按鈕並允許位置存取權限  
Click "啟用 GPS" button and allow location access permission

### 2️⃣ 選擇活動類型 Select Activity Type
選擇「跑步 🏃」或「步行 🚶」  
Choose "跑步 Running" or "步行 Walking"

### 3️⃣ 開始活動 Start Activity
等待 GPS 定位完成後，點擊「開始」  
Wait for GPS to be ready, then click "開始 Start"

### 4️⃣ 追蹤路線 Track Route
- 地圖會即時顯示您的移動路線 Map shows your route in real-time
- 🟢 綠點 = 起點 Green dot = Start point
- 🔵 藍線 = 路線 Blue line = Route path
- 🔴 紅點 = 終點 Red dot = End point (after stopping)

### 5️⃣ 暫停/繼續 Pause/Resume
可隨時暫停或繼續活動  
Pause or resume your activity anytime

### 6️⃣ 停止活動 Stop Activity
完成後點擊「停止」，系統會自動儲存紀錄  
Click "停止 Stop" when finished, record will be saved automatically

### 7️⃣ 查看歷史 View History
- 在「活動紀錄」區域查看所有過往紀錄 View all past records in "活動紀錄 History" section
- 使用篩選器選擇時間範圍 Use filters to select time range
- 點擊「匯出 Excel」下載 CSV 格式的紀錄 Click "匯出 Excel" to download CSV

## 🎨 技術特點 Technical Highlights

### Liquid Glass 設計 Liquid Glass Design
- 半透明玻璃效果 Semi-transparent glass effects (`backdrop-filter: blur`)
- 動態漸層背景動畫 Animated gradient backgrounds
- 流暢的微互動效果 Smooth micro-interactions
- 響應式設計支援各種裝置 Responsive design for all devices

### GPS 追蹤 GPS Tracking
- **Service Worker 後台追蹤**：透過 Service Worker 與靜音心跳機制，即使應用程式在背景執行也能持續追蹤 GPS 位置。**然而，行動裝置作業系統（特別是 iOS）可能會為了節省電力而強制暫停背景處理程序，這可能導致追蹤中斷。** 當您返回應用程式時，路線將會從上次中斷的點連接到新位置，可能會形成一條直線。 / **Service Worker Background Tracking**: Continues GPS tracking even when the app is in the background via a Service Worker and a silent heartbeat mechanism. **However, mobile operating systems (especially iOS) may still suspend background processes to save battery, which can cause gaps in tracking.** When you return to the app, the route will connect from the last recorded point to your new location, potentially creating a straight line.
- **智慧路線分段**：當偵測到長時間的 GPS 訊號中斷（例如從背景恢復時），系統會自動將路線分段，避免繪製不自然的直線跳躍。 / **Smart Route Segmentation**: Automatically segments the route when a prolonged GPS signal interruption is detected (e.g., when resuming from background), preventing unnatural straight-line jumps on the map.
- 高精度模式 High accuracy mode (`enableHighAccuracy`)
- 即時位置更新 Real-time position updates
- 訊號強度視覺化指示器 Visual signal strength indicator
- **智慧自動暫停 Smart Auto-Pause**: 當 GPS 精度誤差超過 20m 時自動暫停，防止「殭屍跑步」狀態。當訊號恢復至 20m 以內時將自動恢復追蹤。 / Auto-pauses when accuracy > 20m to prevent "zombie" states, and automatically resumes when signal accuracy returns to < 20m.
- **遲滯自動恢復 Hysteresis Auto-Resume**: 需訊號精度恢復至優於 20m 才自動繼續，確保軌跡準確 / Requires signal accuracy < 20m to resume, ensuring clean tracks
- **動態防飄移濾波 Dynamic Anti-Drift Filter**: 根據活動類型動態濾除異常速度尖峰 (步行 >10km/h, 跑步 >20km/h)，有效防止軌跡亂跳 / Dynamically filters speed spikes based on activity type (Walking >10km/h, Running >20km/h) to prevent drift jumps
- 自動地圖居中 Automatic map centering during activity

### 資料儲存 Data Storage
- 使用 localStorage 本地儲存 Uses localStorage for local storage
- JSON 格式資料結構 JSON data format
- 包含路線座標、時間、距離、速度等資訊 Includes route coordinates, time, distance, speed
- 支援匯出為 CSV 格式 CSV export support

### 距離計算 Distance Calculation
- 使用 Haversine 公式 Uses Haversine formula
- 高精度座標追蹤 High-precision coordinate tracking
- 即時累積距離計算 Real-time cumulative distance calculation

## 📄 授權 License
此專案採用 MIT 授權。
This project is licensed under the MIT License.

## 👨‍💻 作者 Author
由 [inchinet](https://github.com/inchinet) 建立。
Created by [inchinet](https://github.com/inchinet).

## 🙏 致謝 Acknowledgments
感謝 Google Maps API 提供地圖功能。
Thanks to Google Maps API for mapping functionality.

---

**享受您的跑步！ Enjoy your running! 🏃‍♂️💨**
"# runrecord-app" 
Web version: (https://github.com/inchinet/runrecord)