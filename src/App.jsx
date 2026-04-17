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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Components
import AppShell from './components/layout/AppShell';
import Navbar from './components/layout/Navbar';
import GlobalPlayer from './components/layout/GlobalPlayer';
import StudentView from './components/views/StudentView';
import ManagerDashboard from './components/views/ManagerDashboard';
import PlayerWidget from './components/widgets/PlayerWidget';
import QueueList from './components/widgets/QueueList';
import Toast from './components/ui/Toast';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

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
  const [loginShake, setLoginShake] = useState(false);
  // Prevents scheduler from calling handleSongEnd multiple times per no-song interval
  const songEndCalledRef = useRef(false);

  const { isLight } = useTheme();

  // Theme managed by context internally in components

  // --- Hooks ---
  const { isAuthenticated, login, logout } = useAuth();
  const {
    requests, currentSong, schedule, setSchedule, volume, isRequestsEnabled, eventPlaylists, playbackMode, activeEvent,
    maxSongDuration, setMaxDuration, addRequest, deleteRequest, moveInQueue, toggleRequestLock, playNextSong, stopSong,
    updateVolume, updateSchedule, handleSongEnd, toggleGlobalPlayPause, serverTimeOffset,
    addEventPlaylist, deleteEventPlaylist, addSongToEvent, deleteSongFromEvent, setPlaybackMode
  } = useData();

  const { duration, currentTime, reloadPlayer, togglePlayPause } = usePlayer(currentSong, volume, handleSongEnd, isSystemActive, serverTimeOffset);

  // --- UI Logic ---
  const showToast = (message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
  };

  const handleToastClose = useCallback(() => {
    setNotification(null);
  }, []);

  const handleTogglePlayPause = useCallback(() => {
    if (togglePlayPause && toggleGlobalPlayPause) {
      const state = togglePlayPause();
      if (state) {
        toggleGlobalPlayPause(state.willPlay, state.currentTime);
        return state.willPlay;
      }
    }
  }, [togglePlayPause, toggleGlobalPlayPause]);

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts(viewMode === 'manager' && isAuthenticated, {
    togglePlayPause: handleTogglePlayPause,
    updateVolume,
    playNextSong,
    volume,
    showToast
  });

  // --- Scheduler ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dayIdx = now.getDay();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const daySchedule = schedule[dayIdx] || {};

      let activeSessionData = null;
      ['morning', 'noon', 'afternoon'].forEach(key => {
        const session = daySchedule[key];
        if (session?.active && timeStr >= (session.start || '00:00') && timeStr < (session.end || '00:00')) {
          activeSessionData = session;
        }
      });

      if (!activeSessionData) {
        // System should be OFF
        if (isSystemActive) {
          setIsSystemActive(false);
          setStatusMessage(`ระบบปิดทำการ (${daysTh[dayIdx]})`);
          stopSong();
          handleSongEnd(true); // reset lock, do NOT play next
          reloadPlayer();
        } else if (currentSong) {
          setStatusMessage(`ระบบปิดทำการ (${daysTh[dayIdx]})`);
          stopSong();
        }
        songEndCalledRef.current = false; // reset for next active window
      } else {
        // System should be ON
        if (!isSystemActive) {
          setIsSystemActive(true);
          songEndCalledRef.current = false;
        }

        const scheduledMode = activeSessionData.mode || 'queue';
        const scheduledEvent = activeSessionData.targetEvent || null;
        if (playbackMode !== scheduledMode || activeEvent !== scheduledEvent) {
          setPlaybackMode(scheduledMode, scheduledEvent);
        }

        if (currentSong) {
          songEndCalledRef.current = false;
          setStatusMessage(currentSong.isAutoDj ? 'ระบบ Auto-DJ (กำลังเล่นเพลงสำรอง)' : 'กำลังออกอากาศ...');
        } else {
          setStatusMessage(requests.length > 0 ? 'กำลังเตรียมเพลงถัดไป...' : 'กำลังเริ่มระบบ Auto-DJ...');
          // Only call once per no-song window to avoid processingRef deadlock
          if (!songEndCalledRef.current) {
            songEndCalledRef.current = true;
            handleSongEnd();
          }
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
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 600);
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
        <div className="flex items-center justify-center min-h-[80vh] px-4 animate-fade-in">
          <div
            className={`relative w-full max-w-[400px] ${loginShake ? 'animate-shake' : ''}`}
            style={{ transition: 'transform 0.15s' }}
          >
            {/* Background glow orbs — theme-aware */}
            <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none"
              style={{ background: isLight ? 'rgba(99,102,241,0.18)' : 'rgba(139,92,246,0.25)' }} />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
              style={{ background: isLight ? 'rgba(236,72,153,0.14)' : 'rgba(244,63,94,0.20)' }} />

            {/* Card */}
            <div
              className="relative rounded-[32px] overflow-hidden"
              style={{
                background: isLight
                  ? 'rgba(255,255,255,0.72)'
                  : 'rgba(10,14,28,0.85)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                boxShadow: isLight
                  ? '0 8px 60px rgba(99,102,241,0.14), 0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'
                  : '0 8px 60px rgba(139,92,246,0.22), 0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                border: isLight
                  ? '1.5px solid rgba(99,102,241,0.18)'
                  : '1.5px solid rgba(139,92,246,0.25)',
              }}
            >
              {/* Rainbow shimmer line at top */}
              <div className="h-[2px] w-full"
                style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f43f5e,#8b5cf6,#6366f1)' }} />

              <div className="px-8 py-10 text-center">
                {/* Icon */}
                <div className="relative inline-flex mb-7">
                  {/* Outer pulse ring */}
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)', animationDuration: '2.5s' }} />
                  <div
                    className="relative w-[72px] h-[72px] rounded-[22px] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                      boxShadow: isLight
                        ? '0 12px 32px rgba(99,102,241,0.40), inset 0 2px 4px rgba(255,255,255,0.35)'
                        : '0 12px 40px rgba(139,92,246,0.60), inset 0 2px 4px rgba(255,255,255,0.25)',
                    }}
                  >
                    <Lock size={30} className="text-white drop-shadow-lg" strokeWidth={2.2} />
                    <div className="absolute inset-0 rounded-[22px]"
                      style={{ background: 'linear-gradient(145deg,rgba(255,255,255,0.30) 0%,transparent 60%)' }} />
                  </div>
                </div>

                {/* Title */}
                <h2
                  className="text-[22px] font-black mb-1.5 tracking-tight"
                  style={{ color: isLight ? '#0f172a' : 'rgba(255,255,255,0.95)' }}
                >
                  ระบบสำหรับผู้ดูแล
                </h2>
                <p
                  className="text-[13px] font-medium mb-8"
                  style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.38)' }}
                >
                  กรุณาระบุรหัสผ่านเพื่อเข้าใช้งาน
                </p>

                {/* Password input */}
                <div className="relative mb-4 group">
                  <div
                    className="absolute inset-0 rounded-[14px] opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)', padding: '2px' }}
                  />
                  <input
                    type="password"
                    placeholder="รหัสผ่าน"
                    className="relative w-full px-5 py-4 rounded-[14px] text-center text-[15px] font-bold transition-all duration-200 focus:outline-none"
                    style={{
                      background: isLight ? 'rgba(241,245,249,0.90)' : 'rgba(255,255,255,0.06)',
                      color: isLight ? '#0f172a' : 'rgba(255,255,255,0.90)',
                      border: isLight
                        ? '1.5px solid rgba(99,102,241,0.20)'
                        : '1.5px solid rgba(255,255,255,0.10)',
                      boxShadow: isLight ? 'inset 0 2px 4px rgba(0,0,0,0.04)' : 'inset 0 2px 6px rgba(0,0,0,0.30)',
                    }}
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                  />
                </div>

                {/* Login button */}
                <button
                  onClick={handleAdminLogin}
                  className="w-full py-4 rounded-[14px] text-[15px] font-black text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
                    boxShadow: isLight
                      ? '0 6px 24px rgba(99,102,241,0.38), 0 2px 8px rgba(236,72,153,0.20)'
                      : '0 6px 28px rgba(139,92,246,0.50), 0 2px 10px rgba(236,72,153,0.25)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck size={18} strokeWidth={2.5} />
                    เข้าสู่ระบบ
                  </span>
                </button>

                {/* Back link */}
                <button
                  onClick={() => setViewMode('student')}
                  className="mt-6 flex items-center justify-center gap-1.5 mx-auto text-[12px] font-semibold transition-all duration-200 hover:gap-2.5 active:scale-95"
                  style={{ color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.28)' }}
                  onMouseEnter={e => e.currentTarget.style.color = isLight ? '#6366f1' : 'rgba(167,139,250,0.90)'}
                  onMouseLeave={e => e.currentTarget.style.color = isLight ? '#94a3b8' : 'rgba(255,255,255,0.28)'}
                >
                  <ArrowLeft size={13} />
                  <span>กลับสู่หน้านักเรียน</span>
                </button>
              </div>
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