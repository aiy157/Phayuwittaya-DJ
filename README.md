# 🎵 PhayuWittaya DJ (School Event Music System)

[ 🇹🇭 ภาษาไทย ](#th) | [ 🇬🇧 English ](#en)

---

<a name="th"></a>
## 🇹🇭 ภาษาไทย (Thai)

ระบบจัดการคิวเพลงและกระจายเสียงสำหรับงานเทศกาล กิจกรรม หรือการเปิดเพลงในช่วงพักของโรงเรียน พัฒนาด้วย React 19 และ Firebase Realtime Database เพื่อการอัปเดตข้อมูลสถานะแบบ Real-time ให้ผู้ใช้งานทุกคนเห็นคิวเพลงและการควบคุมพร้อมๆ กัน

### 🛠 เทคโนโลยีหลัก (Tech Stack)
- **Frontend Framework:** React 19 (สร้างด้วย Vite)
- **Styling:** Tailwind CSS (กำหนดค่าสี แอนิเมชัน และระยะห่างใน `tailwind.config.js`)
- **Database / Backend:** Firebase Realtime Database
- **Icons:** `lucide-react`
- **Video/Audio Player:** `react-player` ควบคู่กับการเรียกใช้ YouTube IFrame API ส่วนตัวเพื่อจัดการ Black screen
- **Hosting:** Firebase Hosting

### 📂 โครงสร้างโปรเจกต์ (Project Structure)
โปรเจกต์ถูกจัดวางแบบแยกตามหน้าที่ (Domain-driven) เพื่อให้ง่ายต่อการดูแล:

```text
src/
├── assets/             # เก็บไฟล์รูปภาพ หรือ Assets คงที่
├── components/         # ส่วนประกอบ UI ทั้งหมดของ React
│   ├── layout/         # ส่วนประกอบโครงสร้างหน้าเว็บ (Navbar, AppShell, GlobalPlayer)
│   ├── ui/             # ส่วนประกอบ UI ย่อยๆ เช่น Toast แจ้งเตือน
│   ├── views/          # หน้าจอหลัก (StudentView, ManagerDashboard, EventPlaylist)
│   └── widgets/        # วิดเจ็ตย่อย เช่น รายการคิว, ตัวเช็คความยาวเพลง
├── hooks/              # Custom Hooks จัดการ Logic ต่างๆ หลังบ้าน
│   ├── useAuth.js      # จัดการสถานะการเข้าสู่ระบบผู้ดูแล
│   ├── useData.js      # หัวใจหลักในการคุยกับ Firebase (อ่าน/เขียน คิวและตั้งค่า)
│   └── usePlayer.js    # ควบคุม API เครื่องเล่น YouTube (Play, Stop, Next)
├── services/           # บริการดึงข้อมูลจากภายนอก
│   └── youtubeService.js # สำหรับ Parse ลิงก์ และค้นหาคลิป YouTube ด้วย Scraper
├── App.jsx             # จุดรวม Components และ Hooks (Controller ตัวแม่)
├── firebase.js         # ตั้งค่าการเชื่อมต่อ Firebase API
├── index.css           # CSS หลัก รวมถึง Custom Classes ของ Tailwind
└── main.jsx            # จุดเริ่มต้นโปรแกรม (Mount Component สู่ DOM)
```

### 🧠 คำอธิบาย Core Logic (ส่วนการทำงานสำคัญ)

#### 1. Data Management (`useData.js`)
ทำหน้าที่เชื่อมต่อและติดตาม State จาก Firebase ด้วยฟังก์ชัน `onValue` ของ SDK ตัวแปรสำคัญที่ถูกผูกไว้กับ UI มีดังนี้:
- `requests`: คิวเพลงทั้งหมดที่ถูกส่งเข้ามาจากนักเรียน
- `currentSong`: เพลงที่กำลังเล่นอยู่ ณ ปัจจุบัน
- `schedule`: ตารางเวลาว่าเวลาไหนให้เปิดระบบ (Online) หรือปิดระบบการเล่นเพลง
- `volume`: ระดับเสียงที่สั่งการจาก Admin ข้ามไปยังเครื่องเปิดเพลง
- `eventPlaylists`: เก็บรายชื่อเพลงที่ Add ไว้สำหรับงานพิเศษ (Festival)
- `playbackMode`: สถานะบอกว่าตอนนี้แอปกำลังดึงเพลงแบบคิว (`queue`) หรือแบบสุ่มจากคลังเทศกาล (`event`)

**ระบบ Auto-DJ**: เมื่อเพลงจบ (`handleSongEnd`) หาก `playbackMode` เป็น `queue` แต่อีกไม่มีเพลงในคิวแล้ว ระบบจะสุ่มดึงเพลงจาก `fallbackPlaylist` (เพลง Lo-fi สำรองในโค้ด) มาเปิดคั่นเวลาเพื่อไม่ให้เกิด Dead air

#### 2. Player Controller (`usePlayer.js` & `GlobalPlayer.jsx`)
- `usePlayer.js` จัดการโหลด YouTube IFrame API ทำการซิงค์ `currentSong` ในฐานข้อมูลให้เข้าไปเล่นใน Player และคอยจับเวลาหรือตรวจสอบ `onStateChange` ถ้าวิดีโอจบ จะเรียกใช้ `handleSongEnd()` ของ `useData.js`
- `GlobalPlayer.jsx` คือตัว Player ที่จะคอยควบคุมหน้าตาของเครื่องเล่น มีสถานะแบบลอยตัว (Floating) ที่หน้าจอของนักเรียน หรือเสียบเป็น Widget ที่หน้า Dashboard ของผู้ดูแล โดยอาศัย `React Portal` หรือการซ่อน/โชว์ Element เพื่อให้เสียงไม่สะดุดระหว่างเปลี่ยนหน้า 

#### 3. Authentication (`useAuth.js`)
แอปนี้มีการรับรองตัวตนเฉพาะผู้จัดการ (Manager) **ปัจจุบันใช้รหัสผ่านฝังในโค้ด (Hardcoded) คือ `pw12pw` ร่วมกับ LocalStorage**
- การทำงาน: เมื่อผู้ใช้กรอกรหัสถูกต้อง ระบบจะเก็บคีย์ไว้ในเบราว์เซอร์ และปลดล็อก UI ให้เห็นแท็บ Dashboard

#### 4. Search and Metadata (`youtubeService.js` & `DurationChecker.jsx`)
- หากมีการพิมพ์ชื่อเพลง หน้าจอจะปิงไปที่ `youtubeService.js` ที่ทำหน้าที่ใช้ Proxy ไปขูดข้อมูลจากหน้าเว็บข้อความ YouTube (Scraping `ytInitialData`) นำมาแสดงผล โดยไม่ใช้ API Key
- ก่อนจะรับลิงก์เพลงเข้าคิว มีคอมโพเนนต์ลับชื่อ `DurationChecker.jsx` โหลด YouTube API ล่องหนเพื่อถาม "ความยาวคลิป" เพื่อกันไม่ให้นักเรียนส่งพอดแคสต์ยาว 2 ชั่วโมงเข้ามา

### 🚦 ภาพรวมของสเตจหน้าจอต่างๆ
1. **`App.jsx`**: เป็นเปลือกหุ้มที่เช็คสถานะการเข้าสู่ระบบและ `viewMode` เพื่อสลับเลเยอร์ระหว่าง หน้าจอขอเพลง กับ หน้าจอระบบจัดการ 
2. **`StudentView.jsx`**: ประกอบด้วยช่องกรอก URL หรือชื่อเพลง แสดงสถานะคิวรวม ให้กดข้ามเพลง (ถ้ามีสิทธิ์)
3. **`ManagerDashboard.jsx`**: หน้ากระดานควบคุมของ Admin รวมปุ่มปรับระดับเสียง สลับฟังก์ชันรับคำขอ และการกำหนดตารางเวลา (Schedule) แบบ Timeline
4. **`EventPlaylistManager.jsx`**: กระดานย่อยสำหรับงานเทศกาล สามารถกดปุ่มบวกรับลิงก์ของเพลย์ลิสต์บน YouTube และประมวลผลดูดรายชื่อเพลง (Bulk Import) ทั้งหมดลง Firebase ได้ภายในปุ่มเดียว

### 🛡 การดูแลรักษาและการส่งมอบ (Handoff Details)
สำหรับผู้ที่จะมารับช่วงต่อ โปรดให้ความสนใจกับจุดข้อมูลดังต่อไปนี้:
1. **Firebase Integration**: กุญแจ API ของ Firebase เก็บอยู่แบบตัวอักษรธรรมดาใน `src/firebase.js` ก่อนนำขึ้นโปรดักชันควรย้ายไปที่ `import.meta.env`
2. **การทำ Routing**: โค้ดชุดนี้**ไม่ได้**ใช้ระบบ Routing (เช่น `react-router-dom`) แต่ลอจิกเป็นแบบ Single-Page แท้ๆ โดยใช้ State (`viewMode`) วาดหน้าใหม่ เพื่อรักษา Instance ของเสียงดนตรีเอาไว้
3. **การแก้โค้ด DOM ทางลัด (DOM Nuke)**: ใน `usePlayer.js` บางฟังก์ชันใช้ `innerHTML` สั่งสร้าง `<div id="youtube-player-div">` เพื่อแก้โรคจอจอดำของ YouTube (Black screen cache problem) โดยตรง อาจจะต้องระวังถ้าอัปเดตเวอร์ชันของ React 

---

<br />

<a name="en"></a>
## 🇬🇧 English

A music queuing and broadcasting system for school festivals, events, or break periods. Developed with React 19 and Firebase Realtime Database for real-time status updates, allowing all users to view the music queue and controls simultaneously.

### 🛠 Core Technologies (Tech Stack)
- **Frontend Framework:** React 19 (Built with Vite)
- **Styling:** Tailwind CSS (Custom colors, animations, and spacing defined in `tailwind.config.js`)
- **Database / Backend:** Firebase Realtime Database
- **Icons:** `lucide-react`
- **Video/Audio Player:** `react-player` combined with a custom YouTube IFrame API wrapper to handle black screen issues.
- **Hosting:** Firebase Hosting

### 📂 Project Structure
The project is structured in a domain-driven manner for easy maintenance:

```text
src/
├── assets/             # Static assets and images
├── components/         # All React UI components
│   ├── layout/         # Structural components (Navbar, AppShell, GlobalPlayer)
│   ├── ui/             # Reusable UI elements like Toast notifications
│   ├── views/          # Main screens (StudentView, ManagerDashboard, EventPlaylist)
│   └── widgets/        # Micro-widgets like queue lists and duration checkers
├── hooks/              # Custom Hooks managing backend business logic
│   ├── useAuth.js      # Manages manager authentication state
│   ├── useData.js      # Core connector to Firebase (Reads/Writes queue and settings)
│   └── usePlayer.js    # Controls the YouTube API player (Play, Stop, Next)
├── services/           # External data fetching services
│   └── youtubeService.js # URL parsing and YouTube scraping for search results
├── App.jsx             # Main Controller bridging components and hooks
├── firebase.js         # Firebase API connection setup
├── index.css           # Global CSS and Custom Tailwind Classes
└── main.jsx            # Application entry point (Mounts App to DOM)
```

### 🧠 Core Logic Explanation

#### 1. Data Management (`useData.js`)
Acts as the bridge connecting and tracking Firebase states using the SDK's `onValue` function. Key state variables bound to the UI:
- `requests`: The overall music queue submitted by students.
- `currentSong`: The currently playing track.
- `schedule`: The timetable dictating when the system is online/offline.
- `volume`: Global volume control pushed from Admin to the playback device.
- `eventPlaylists`: Curated lists of songs saved for special events (Festivals).
- `playbackMode`: Flag indicating if the app is pulling from the `queue` or shuffling from the `event` library.

**Auto-DJ System**: When a song ends (`handleSongEnd`), if the `playbackMode` is set to `queue` but the queue is empty, the system automatically pulls a random track from a `fallbackPlaylist` (Lo-fi tracks) to prevent dead air.

#### 2. Player Controller (`usePlayer.js` & `GlobalPlayer.jsx`)
- `usePlayer.js` manages loading the YouTube IFrame API, synchronizing the database's `currentSong` with the player, tracking time, and handling `onStateChange`. When a video finishes, it triggers `useData.js`'s `handleSongEnd()`.
- `GlobalPlayer.jsx` visually houses the player. It can float independently on the student's screen or dock seamlessly into the Manager Dashboard. This persistence at the top App-level ensures music doesn't stop or stutter during page navigations.

#### 3. Authentication (`useAuth.js`)
This app features simple Manager authentication. **Currently, the password is hardcoded (`pw12pw`) and relies on LocalStorage.**
- Workflow: Submitting the correct password saves an auth token in the browser and unlocks the Manager Dashboard tab.

#### 4. Search and Metadata (`youtubeService.js` & `DurationChecker.jsx`)
- Searching for a track pings `youtubeService.js`, which utilizes a proxy to scrape HTML text from YouTube (`ytInitialData`) to deliver search results without requiring a paid API key.
- A hidden component, `DurationChecker.jsx`, is spun up invisibly to query the video's actual length before accepting it into the queue, preventing students from adding 2-hour podcasts.

### 🚦 Screen Overview
1. **`App.jsx`**: The foundational shell evaluating login states and `viewMode` to toggle between the Request Screen and the Management Dashboard.
2. **`StudentView.jsx`**: Features a URL input / text search bar, the unified active queue, and limited controls (like skipping, if authenticated).
3. **`ManagerDashboard.jsx`**: The Admin command center containing volume sliders, queue locks, and the scheduling timeline.
4. **`EventPlaylistManager.jsx`**: A specialized panel for festivals. Includes a plus button to paste a giant YouTube Playlist link and perform a Bulk Import of all contained tracks to Firebase instantly.

### 🛡 Maintenance and Handoff Details
For future developers, please note the following technical decisions:
1. **Firebase Integration**: The Firebase API keys are currently stored as plain text in `src/firebase.js`. Before production, these must be migrated to `import.meta.env`.
2. **Routing Approach**: This codebase does **not** employ a traditional router (like `react-router-dom`). It operates as a strict Single-Page Application utilizing state (`viewMode`) to swap layers. This is intentional to preserve the continuous audio instance.
3. **DOM Nuke Workaround**: Inside `usePlayer.js`, `innerHTML` is used to forcefully inject a `<div id="youtube-player-div">` container. This is a deliberate "DOM Nuke" to circumvent YouTube's aggressive black screen caching bug. Be cautious if upgrading React versions, as direct DOM mutations bypass React's virtual DOM.
