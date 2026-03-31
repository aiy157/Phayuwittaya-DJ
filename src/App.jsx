/**
 * @file App.jsx
 * @description 
 * [TH] คอมโพเนนต์หลักที่ควบคุมการทำงานของแอป จัดการสถานะและเป็นสะพานเชื่อมระหว่าง hooks กับ UI
 * [EN] The main shell component and controller of the application.
 * Manages the global state (viewMode) and acts as the bridge connecting custom hooks
 * (useData, useAuth, usePlayer) with the UI views (StudentView, ManagerDashboard).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { usePlayer } from './hooks/usePlayer';
import { getYouTubeID } from './services/youtubeService';

// Components
import AppShell from './components/layout/AppShell';
import Navbar from './components/layout/Navbar';
import GlobalPlayer from './components/layout/GlobalPlayer';
import StudentView from './components/views/StudentView';
import ManagerDashboard from './components/views/ManagerDashboard';
import PlayerWidget from './components/widgets/PlayerWidget';
import QueueList from './components/widgets/QueueList';
import Toast from './components/ui/Toast';
import { Lock } from 'lucide-react';

/**
 * Main Application Component
 */
function App() {
  // --- UI/System State ---
  const [viewMode, setViewMode] = useState('student'); // [TH] สลับหน้าจอ 'student' หรือ 'manager' | [EN] 'student' or 'manager' routing
  const [activeTab, setActiveTab] = useState('queue'); // [TH] แท็บปัจจุบันในหน้าผู้จัดการ | [EN] Tab state inside the manager dashboard
  const [passwordInput, setPasswordInput] = useState(''); // [TH] เก็บค่ารหัสผ่าน | [EN] Stores the logic input for manager
  const [isSubmitting, setIsSubmitting] = useState(false); // [TH] ป้องกันกดปุ่มรัว | [EN] Prevents rapid duplicate requests
  const pendingRequestsRef = useRef(new Set()); // [TH] ล็อกวิดิโอที่กำลังโหลด ป้องกันเบิ้ล | [EN] Blocks duplicate submissions
  const [notification, setNotification] = useState(null); // [TH] แจ้งเตือน Toast | [EN] Global Toast notification payload

  const [isSystemActive, setIsSystemActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Loading...");
  const daysTh = React.useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  // Theme managed by context internally in components

  // --- Hooks ---
  const { isAuthenticated, login, logout } = useAuth();
  const {
    requests, currentSong, schedule, setSchedule, volume, isRequestsEnabled, eventPlaylists, playbackMode, activeEvent,
    maxSongDuration, setMaxDuration, addRequest, deleteRequest, moveInQueue, toggleRequestLock, playNextSong, stopSong,
    updateVolume, updateSchedule, handleSongEnd,
    addEventPlaylist, deleteEventPlaylist, addSongToEvent, deleteSongFromEvent, setPlaybackMode
  } = useData();

  const { duration, currentTime, reloadPlayer } = usePlayer(currentSong, volume, handleSongEnd, isSystemActive);

  // --- UI Logic ---
  const showToast = (message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
  };

  const handleToastClose = useCallback(() => {
    setNotification(null);
  }, []);

  // --- Scheduler ---

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dayIdx = now.getDay();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const daySchedule = schedule[dayIdx] || {};

      // Check which session is currently active
      let activeSessionKey = null;
      let activeSessionData = null;

      ['morning', 'noon', 'afternoon'].forEach(key => {
        const session = daySchedule[key];
        if (session?.active && timeStr >= (session.start || "00:00") && timeStr < (session.end || "00:00")) {
          activeSessionKey = key;
          activeSessionData = session;
        }
      });

      if (!activeSessionKey) {
        if (isSystemActive) {
          setIsSystemActive(false);
          setStatusMessage(`ระบบปิดทำการ (${daysTh[dayIdx]})`);
          stopSong(); // Halt currently playing song in Firebase
          handleSongEnd(true); // Force HALT, do not allow next song
          reloadPlayer(); // DOM Nuke: Guarantee 100% player shutdown
        } else if (currentSong) {
          // If system started out of hours but Firebase had a ghost song, clear it once.
          setStatusMessage(`ระบบปิดทำการ (${daysTh[dayIdx]})`);
          stopSong();
        }
      } else {
        if (!isSystemActive) {
          setIsSystemActive(true);
        }

        // Auto-switch playback mode based on schedule
        const scheduledMode = activeSessionData.mode || 'queue';
        const scheduledEvent = activeSessionData.targetEvent || null;

        if (playbackMode !== scheduledMode || activeEvent !== scheduledEvent) {
          setPlaybackMode(scheduledMode, scheduledEvent);
        }

        if (currentSong) {
          setStatusMessage(currentSong.isAutoDj ? "ระบบ Auto-DJ (กำลังเล่นเพลงสำรอง)" : "กำลังออกอากาศ...");
        } else {
          setStatusMessage(requests.length > 0 ? "กำลังเตรียมเพลงถัดไป..." : "กำลังเริ่มระบบ Auto-DJ...");
          // Only trigger next song if system is active (double check)
          handleSongEnd();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule, currentSong, requests, handleSongEnd, playbackMode, activeEvent, setPlaybackMode, isSystemActive, reloadPlayer, daysTh, stopSong]);


  // --- Helper Functions ---

  /**
   * [TH] ดึงชื่อคลิป YouTube ผ่าน noembed api เพื่อเลี่ยงการใช้ Google API Key โดยตรง
   * [EN] Fetches the video title utilizing noembed to avoid needing a Google API Key
   * @param {string} url - The YouTube URL
   * @returns {Promise<string>} - The title of the video or the original URL on failure
   */
  // Removed fetchVideoTitle as it was unused here (available in services)

  const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // --- Handlers ---

  /**
   * [TH] ประมวลผลคำขอเพลงจากหน้านักเรียน ป้องกันเพลงซ้ำ และตรวจสอบ URL
   * [EN] Processes a song request from the student UI. Prevents duplicates and verifies the URL format.
   * @param {string} url - The URL or search query string
   */
  const handleUserRequest = async (url, knownTitle) => {
    if (!url) return showToast('กรุณาระบุลิงก์เพลง', 'error');
    const videoId = getYouTubeID(url);
    if (!videoId) return showToast('ลิงก์ YouTube ไม่ถูกต้อง', 'error');

    if (pendingRequestsRef.current.has(videoId)) return showToast('กำลังดำเนินการเพิ่มเพลงนี้...', 'info');

    // Prevent queuing duplicates or currently playing song
    if (requests.some(r => getYouTubeID(r.url) === videoId)) return showToast('เพลงนี้อยู่ในคิวแล้ว', 'error');
    if (currentSong && !currentSong.isAutoDj && getYouTubeID(currentSong.url) === videoId) {
      return showToast('เพลงนี้คิวว่างเลยถูกดึงไปเล่นทันที 🎧 (ดูที่กรอบกำลังเล่น)', 'info');
    }

    pendingRequestsRef.current.add(videoId);
    setIsSubmitting(true);
    try {
      await addRequest(url, knownTitle || null);
      showToast('เพิ่มเพลงเข้าคิวเรียบร้อย 🚀', 'success');
    } catch (e) {
      if (e?.message === 'REQUESTS_DISABLED') {
        showToast('ระบบปิดรับคำขอเพลงชั่วคราว', 'error');
      } else {
        showToast('ไม่สามารถส่งคำขอเพลงได้ กรุณาลองใหม่', 'error');
        console.error('[handleUserRequest] Firebase write failed:', e);
      }
    } finally {
      pendingRequestsRef.current.delete(videoId);
      setIsSubmitting(false);
    }
  };

  /**
   * [TH] ตรวจสอบรหัสผ่านสำหรับเข้าสู่ระบบผู้จัดการ
   * [EN] Validates manager login using `useAuth`
   */
  const handleAdminLogin = () => {
    if (login(passwordInput)) {
      showToast('ยินดีต้อนรับ ผู้จัดการระบบ 👋', 'success');
      setPasswordInput('');
    } else {
      showToast('รหัสผ่านไม่ถูกต้อง 🔒', 'error');
    }
  };

  // --- Render ---
  return (
    <AppShell>
      <GlobalPlayer viewMode={viewMode} isSystemActive={isSystemActive} activeTab={activeTab} /> {/* Persistent Player */}

      {notification && <Toast message={notification.message} type={notification.type} onClose={handleToastClose} />}

      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); setViewMode('student'); showToast('ออกจากระบบแล้ว'); }}
      />

      {viewMode === 'student' && (
        <StudentView
          handleRequest={handleUserRequest}
          isSubmitting={isSubmitting}
          currentSong={currentSong}
          isSystemActive={isSystemActive}
          isRequestsEnabled={isRequestsEnabled}
          requests={requests}
          maxSongDuration={maxSongDuration}
          showToast={showToast}
        />
      )}

      {viewMode === 'manager' && !isAuthenticated && (
        <div className="flex items-center justify-center py-16 sm:py-24 animate-fade-in">
          {/* Gradient border wrapper */}
          <div className="p-[1.5px] rounded-[34px] w-full max-w-sm"
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.70),rgba(139,92,246,0.60),rgba(244,63,94,0.50))' }}>
            <div className="text-center rounded-[33px] px-8 py-10"
              style={{
                background: 'rgba(6,11,24,0.95)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
              }}>
              {/* Top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/5"
                style={{ background: 'linear-gradient(90deg,transparent,rgba(167,139,250,0.80),transparent)' }} />

              {/* Animated gradient icon */}
              <div className="inline-flex p-4 rounded-[22px] mb-6 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg,#3b82f6,#8b5cf6,#f43f5e)',
                  boxShadow: '0 0 48px rgba(139,92,246,0.70), 0 8px 24px rgba(59,130,246,0.40)',
                }}>
                <Lock size={28} className="text-white relative z-10" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg,rgba(255,255,255,0.28) 0%,transparent 55%)' }} />
              </div>

              <h2 className="text-[23px] font-black mb-1 text-white">ระบบสำหรับผู้ดูแล</h2>
              <p className="text-[13px] mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>กรุณาระบุรหัสผ่านเพื่อเข้าใช้งาน</p>

              <input
                type="password" placeholder="รหัสผ่าน"
                className="input-premium w-full px-5 py-4 rounded-[16px] mb-4 text-center text-[15px] font-semibold"
                value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              />
              <button onClick={handleAdminLogin}
                className="btn-primary w-full py-4 rounded-[16px] text-[15px] font-black">
                เข้าสู่ระบบ 🚀
              </button>
              <button
                onClick={() => setViewMode('student')}
                className="
                  mt-5 text-[12px] font-semibold
                  text-white/28 hover:text-violet-400
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:rounded
                  active:scale-95 transition-all duration-200
                "
              >
                ← กลับสู่หน้านักเรียน
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'manager' && isAuthenticated && (
        <ManagerDashboard
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSystemActive={isSystemActive}
          statusMessage={statusMessage}
          volume={volume}
          handleVolumeChange={updateVolume}
          reloadPlayer={reloadPlayer}
          requests={requests}
          isRequestsEnabled={isRequestsEnabled}
          toggleRequestLock={toggleRequestLock}
          handleSaveSchedule={(newSched) => { updateSchedule(newSched || schedule).then(() => showToast('บันทึกตารางเวลาแล้ว', 'success')); }}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          schedule={schedule}
          setSchedule={setSchedule}
          daysTh={daysTh}
          moveInQueue={moveInQueue}
          playbackMode={playbackMode}
          activeEvent={activeEvent}
          setPlaybackMode={setPlaybackMode}
          eventPlaylists={eventPlaylists}
          addEventPlaylist={addEventPlaylist}
          deleteEventPlaylist={deleteEventPlaylist}
          addSongToEvent={addSongToEvent}
          deleteSongFromEvent={deleteSongFromEvent}
          addRequest={addRequest}
          maxSongDuration={maxSongDuration}
          setMaxDuration={setMaxDuration}
          showToast={showToast}
          playerComponent={
            <PlayerWidget
              currentSong={currentSong}
              currentTime={currentTime}
              duration={duration}
              handleSkipSong={() => { showToast('กำลังข้ามเพลง... ⏩'); handleSongEnd(); }}
              formatTime={formatTime}
              reloadPlayer={reloadPlayer}
              isSystemActive={isSystemActive}
            />
          }
          queueComponent={
            <QueueList
              requests={requests}
              playNextSong={playNextSong}
              moveInQueue={moveInQueue}
              handleDeleteRequest={(id) => { if (window.confirm('ลบเพลงนี้?')) deleteRequest(id).then(() => showToast('ลบเรียบร้อย')); }}
              isAdmin={true}
            />
          }
        />
      )}
    </AppShell>
  );
}

export default App;