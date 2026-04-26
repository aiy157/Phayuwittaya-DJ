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
import DisplayView from './components/views/DisplayView';
import PlayerWidget from './components/widgets/PlayerWidget';
import QueueList from './components/widgets/QueueList';
import Toast from './components/ui/Toast';
import ChangePasswordModal from './components/ui/ChangePasswordModal';
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import { SkeletonManagerDashboard, SkeletonStudentQueue } from './components/ui/Skeleton';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

/**
 * Main Application Component
 */
function App() {
  // --- UI/System State ---
  const [viewMode, setViewMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('mode') === 'display' ? 'display' : 'student';
  }); 
  const [activeTab, setActiveTab] = useState('queue'); // [TH] แท็บปัจจุบันในหน้าผู้จัดการ | [EN] Tab state inside the manager dashboard
  const [passwordInput, setPasswordInput] = useState(''); // [TH] เก็บค่ารหัสผ่าน | [EN] Stores the logic input for manager
  const [isSubmitting, setIsSubmitting] = useState(false); // [TH] ป้องกันกดปุ่มรัว | [EN] Prevents rapid duplicate requests
  const pendingRequestsRef = useRef(new Set()); // [TH] ล็อกวิดิโอที่กำลังโหลด ป้องกันเบิ้ล | [EN] Blocks duplicate submissions
  const [notification, setNotification] = useState(null); // [TH] แจ้งเตือน Toast | [EN] Global Toast notification payload
  const [showChangePassword, setShowChangePassword] = useState(false); // [TH] แสดง/ซ่อน modal เปลี่ยนรหัส

  const [isSystemActive, setIsSystemActive] = useState(false);
  const [isPrimaryBroadcaster, setIsPrimaryBroadcaster] = useState(() => {
    return localStorage.getItem('phayu_primary_broadcaster') === 'true';
  });

  const [statusMessage, setStatusMessage] = useState("Loading...");
  const daysTh = React.useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [loginShake, setLoginShake] = useState(false);
  // Prevents scheduler from calling handleSongEnd multiple times per no-song interval
  const songEndCalledRef = useRef(false);

  const { isLight } = useTheme();

  // --- Hooks ---
  const { isAuthenticated, login, logout, changePassword, isPasswordLoading } = useAuth();
  const {
    requests, currentSong, schedule, setSchedule, volume, isRequestsEnabled, eventPlaylists, playbackMode, activeEvent,
    maxSongDuration, setMaxDuration, addRequest, deleteRequest, moveInQueue, toggleRequestLock, playNextSong, stopSong,
    updateVolume, updateSchedule, handleSongEnd, toggleGlobalPlayPause, serverTimeOffset,
    addEventPlaylist, deleteEventPlaylist, addSongToEvent, deleteSongFromEvent, setPlaybackMode,
    loading, history
  } = useData();

  /**
   * [TH] ตรวจสอบว่า client นี้คือ Manager ที่ login แล้วหรือไม่
   *      มีเพียง Manager เท่านั้นที่มีสิทธิ์ write Firebase (เปลี่ยนเพลง, skip, ฯลฯ)
   * [EN] Only the authenticated manager device may mutate Firebase state (advance songs, skip, etc.)
   *      All other clients (student view, second device) are READ-ONLY observers.
   */
  const isManagerDevice = isAuthenticated && viewMode === 'manager';

  /**
   * [TH] ฟังก์ชัน onSongEnd ที่ปลอดภัย:
   *      - Manager: เรียก handleSongEnd() จริง (write Firebase)
   *      - ทุก client อื่น: no-op — ป้องกันเครื่องนักเรียน/เครื่องที่ 2 เปลี่ยนเพลงเอง
   * [EN] Safe onSongEnd: only the manager device triggers the next song in Firebase.
   *      Student/second-device clients get a no-op to prevent accidental song changes.
   */
  const safeOnSongEnd = useCallback(() => {
    if (isManagerDevice) {
      handleSongEnd();
    }
    // else: do nothing — observer clients must NOT mutate queue
  }, [isManagerDevice, handleSongEnd]);

  // If in display mode, we disable the player entirely to avoid duplicate audio.
  const isDisplayMode = viewMode === 'display';

  const { duration, currentTime, reloadPlayer, togglePlayPause, seekRelative } = usePlayer(
    isDisplayMode ? null : currentSong, 
    volume, 
    safeOnSongEnd, 
    isDisplayMode ? false : isSystemActive, 
    serverTimeOffset, 
    isPrimaryBroadcaster
  );


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
        return state;
      }
    }
  }, [togglePlayPause, toggleGlobalPlayPause]);

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts(viewMode === 'manager' && isAuthenticated, {
    togglePlayPause: handleTogglePlayPause,
    updateVolume,
    playNextSong: handleSongEnd, // [TH] ข้ามเพลงผ่าน handleSongEnd เพื่อ trigger ระบบคิวถูกต้อง
    reloadPlayer,
    seekRelative,
    volume,
    showToast,
  });

  // --- Scheduler ---
  // [TH] Scheduler จะทำงานกับทุก client — แต่การ write Firebase (เปลี่ยนเพลง) จำกัดเฉพาะ Manager
  // [EN] Scheduler runs on all clients for local UI updates, but Firebase writes only happen on manager device
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
          
          if (isManagerDevice) {
            // For cutting off a song stably, avoid reloading iframe. usePlayer will stopVideo() automatically.
            if (isPrimaryBroadcaster) {
               stopSong();
               handleSongEnd(true);
            }
          }
        } else if (currentSong && isManagerDevice && isPrimaryBroadcaster) {
          setStatusMessage(`ระบบปิดทำการ (${daysTh[dayIdx]})`);
          stopSong();
        }
        songEndCalledRef.current = false;
      } else {
        // System should be ON
        if (!isSystemActive) {
          setIsSystemActive(true);
          songEndCalledRef.current = false;
        }

        // [TH] เฉพาะ Manager ที่ sync playback mode ลง Firebase
        if (isManagerDevice) {
          const scheduledMode = activeSessionData.mode || 'queue';
          const scheduledEvent = activeSessionData.targetEvent || null;
          if (playbackMode !== scheduledMode || activeEvent !== scheduledEvent) {
            setPlaybackMode(scheduledMode, scheduledEvent);
          }
        }

        if (currentSong) {
          songEndCalledRef.current = false;
          setStatusMessage(currentSong.isAutoDj ? 'ระบบ Auto-DJ (กำลังเล่นเพลงสำรอง)' : 'กำลังออกอากาศ...');
        } else if (isManagerDevice) {
          // [TH] เฉพาะ Manager เท่านั้นที่เรียกเพลงถัดไปเมื่อไม่มีเพลง
          setStatusMessage(requests.length > 0 ? 'กำลังเตรียมเพลงถัดไป...' : 'กำลังเริ่มระบบ Auto-DJ...');
          if (!songEndCalledRef.current) {
            songEndCalledRef.current = true;
            handleSongEnd();
          }
        } else {
          // Observer client: just show status
          setStatusMessage(requests.length > 0 ? 'มีเพลงในรายการรอ...' : 'กำลังรอสัญญาณ...');
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule, currentSong, requests, handleSongEnd, playbackMode, activeEvent, setPlaybackMode, isSystemActive, reloadPlayer, daysTh, stopSong, isManagerDevice]);


  // --- Helper Functions ---
  const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // --- Handlers ---

  /**
   * [TH] ประมวลผลคำขอเพลงจากหน้านักเรียน ป้องกันเพลงซ้ำ และตรวจสอบ URL
   * [EN] Processes a song request from the student UI. Prevents duplicates and verifies the URL format.
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
    if (isPasswordLoading) return showToast('กำลังโหลดระบบ กรุณารอสักครู่...', 'info');
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
  if (viewMode === 'display') {
    return (
      <>
        <GlobalPlayer viewMode={viewMode} isSystemActive={isSystemActive} activeTab={activeTab} />
        {notification && <Toast message={notification.message} type={notification.type} onClose={handleToastClose} />}
        <DisplayView currentSong={currentSong} requests={requests} isSystemActive={isSystemActive} playbackMode={playbackMode} />
      </>
    );
  }

  return (
    <AppShell>
      <GlobalPlayer viewMode={viewMode} isSystemActive={isSystemActive} activeTab={activeTab} /> {/* Persistent Player */}

      {notification && <Toast message={notification.message} type={notification.type} onClose={handleToastClose} />}

      {/* PWA Install Prompt — shows at bottom when installable */}
      <PWAInstallPrompt />

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          changePassword={changePassword}
          showToast={showToast}
        />
      )}

      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); setViewMode('student'); showToast('ออกจากระบบแล้ว'); }}
      />

      {viewMode === 'student' && (
        <>
          <StudentView
            handleRequest={handleUserRequest}
            isSubmitting={isSubmitting}
            currentSong={currentSong}
            isSystemActive={isSystemActive}
            isRequestsEnabled={isRequestsEnabled}
            requests={requests}
            maxSongDuration={maxSongDuration}
            showToast={showToast}
            loading={loading}
          />
          {/* Skeleton overlay while Firebase loads */}
          {loading && <SkeletonStudentQueue />}
        </>
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
                  {isPasswordLoading ? 'กำลังโหลดระบบ...' : 'กรุณาระบุรหัสผ่านเพื่อเข้าใช้งาน'}
                </p>

                {/* Password input */}
                <div className="relative mb-4 group">
                  <div
                    className="absolute inset-0 rounded-[14px] opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)', padding: '2px' }}
                  />
                  <input
                    type="password"
                    placeholder={isPasswordLoading ? 'กำลังโหลด...' : 'รหัสผ่าน'}
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
                    disabled={isPasswordLoading}
                  />
                </div>

                {/* Login button */}
                <button
                  onClick={handleAdminLogin}
                  disabled={isPasswordLoading}
                  className="w-full py-4 rounded-[14px] text-[15px] font-black text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: isPasswordLoading
                      ? (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)')
                      : 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
                    boxShadow: isPasswordLoading ? 'none' : (isLight
                      ? '0 6px 24px rgba(99,102,241,0.38), 0 2px 8px rgba(236,72,153,0.20)'
                      : '0 6px 28px rgba(139,92,246,0.50), 0 2px 10px rgba(236,72,153,0.25)'),
                    color: isPasswordLoading ? (isLight ? '#94a3b8' : 'rgba(255,255,255,0.30)') : '#fff',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isPasswordLoading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin" />กำลังโหลด...</>
                      : <><ShieldCheck size={18} strokeWidth={2.5} />เข้าสู่ระบบ</>
                    }
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
        loading ? (
          <SkeletonManagerDashboard />
        ) : (
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
            maxSongDuration={maxSongDuration}
            setMaxDuration={setMaxDuration}
            showToast={showToast}
            onChangePassword={() => setShowChangePassword(true)}
            isPrimaryBroadcaster={isPrimaryBroadcaster}
            setIsPrimaryBroadcaster={(val) => {
              setIsPrimaryBroadcaster(val);
              localStorage.setItem('phayu_primary_broadcaster', val.toString());
            }}
            history={history}
            addRequest={addRequest}
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
        )
      )}
    </AppShell>
  );
}

export default App;