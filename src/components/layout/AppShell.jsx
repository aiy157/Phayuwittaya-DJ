import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * @component AppShell
 * Handles the page-level background: dark-mode = deep-space with animated orbs,
 * light-mode = clean blue/white soft gradient with subtle orbs.
 */
const AppShell = ({ children }) => {
  const { isLight } = useTheme();

  // Initialize fireflies in a passive effect to keep render pure
  const [fireflies, setFireflies] = React.useState([]);
  const spotlightRef = React.useRef(null);
  
  // High-performance tracking refs
  const mouseX = React.useRef(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = React.useRef(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  const fireballX = React.useRef(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const fireballY = React.useRef(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  const requestRef = React.useRef(null);

  React.useEffect(() => {
    // Fireflies generation (Reduced quantity to 15 for better mobile performance)
    const generated = [...Array(15)].map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 2}px`,
      height: `${Math.random() * 3 + 2}px`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${Math.random() * 4 + 4}s`
    }));
    setFireflies(generated);

    // Performant Mouse Spotlight using lerp and requestAnimationFrame
    const handleMouseMove = (e) => {
        mouseX.current = e.clientX - 22;
        mouseY.current = e.clientY - 22;
    };
    
    // Smooth trailing animation loop (15% interpolation per frame)
    const updateFireball = () => {
        if (spotlightRef.current) {
            fireballX.current += (mouseX.current - fireballX.current) * 0.15;
            fireballY.current += (mouseY.current - fireballY.current) * 0.15;
            spotlightRef.current.style.transform = `translate3d(${fireballX.current}px, ${fireballY.current}px, 0)`;
        }
        requestRef.current = requestAnimationFrame(updateFireball);
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    requestRef.current = requestAnimationFrame(updateFireball);
    
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);


  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative transition-colors duration-500">
      
      {/* ── Interactive Mouse Follower Orb ── */}
      <div 
        ref={spotlightRef}
        className="pointer-events-none fixed top-0 left-0 w-[30px] h-[30px] z-[1]"
        style={{
            willChange: 'transform',
            transition: 'opacity 0.3s' // Removed transform transition to allow JS lerping to handle smoothness without CSS conflicts
        }}
        aria-hidden
      >
        <div className="relative w-full h-full animate-infinity-spin" style={{ mixBlendMode: isLight ? 'normal' : 'screen' }}>
            {/* Core Center Orb */}
            <div 
                className="absolute inset-0 rounded-full animate-infinity-core"
                style={{
                    background: isLight 
                        ? 'radial-gradient(circle, #ffffff 10%, rgba(59,130,246,0.6) 40%, transparent 75%)' 
                        : 'radial-gradient(circle, #ffffff 10%, rgba(168,85,247,0.6) 40%, transparent 75%)',
                    boxShadow: isLight ? '0 0 15px 5px rgba(59,130,246,0.2)' : '0 0 20px 8px rgba(168,85,247,0.3)'
                }}
            />
            {/* Left Wing (Forms Infinity) */}
            <div 
                className="absolute inset-0 rounded-full animate-infinity-split-1"
                style={{
                    background: isLight 
                        ? 'radial-gradient(circle, #ffffff 5%, rgba(59,130,246,0.9) 30%, transparent 75%)' 
                        : 'radial-gradient(circle, #ffffff 5%, rgba(168,85,247,0.9) 30%, transparent 75%)',
                    boxShadow: isLight ? '0 0 10px 4px rgba(59,130,246,0.5)' : '0 0 15px 6px rgba(168,85,247,0.6)'
                }}
            />
            {/* Right Wing (Forms Infinity) */}
            <div 
                className="absolute inset-0 rounded-full animate-infinity-split-2"
                style={{
                    background: isLight 
                        ? 'radial-gradient(circle, #ffffff 5%, rgba(59,130,246,0.9) 30%, transparent 75%)' 
                        : 'radial-gradient(circle, #ffffff 5%, rgba(168,85,247,0.9) 30%, transparent 75%)',
                    boxShadow: isLight ? '0 0 10px 4px rgba(59,130,246,0.5)' : '0 0 15px 6px rgba(168,85,247,0.6)'
                }}
            />
        </div>
      </div>

      <style>{`
        @keyframes infinity-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes infinity-core {
            0%, 20%, 100% { transform: scale(1); opacity: 1; }
            45%, 75% { transform: scale(0.6); opacity: 0.6; }
        }
        @keyframes infinity-split-1 {
            0%, 20%, 100% { transform: translateX(0) scale(1); }
            45%, 75% { transform: translateX(-16px) scale(0.75); }
        }
        @keyframes infinity-split-2 {
            0%, 20%, 100% { transform: translateX(0) scale(1); }
            45%, 75% { transform: translateX(16px) scale(0.75); }
        }

        .animate-infinity-spin {
            animation: infinity-spin 5s infinite linear;
        }
        .animate-infinity-core {
            animation: infinity-core 3.5s infinite ease-in-out;
        }
        .animate-infinity-split-1 {
            animation: infinity-split-1 3.5s infinite ease-in-out;
        }
        .animate-infinity-split-2 {
            animation: infinity-split-2 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* ── Dynamic Gradient Mesh Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {/* ── Infinite Noise Layer ── */}
        <div className="absolute inset-0 z-20 bg-noise opacity-[0.03] mix-blend-overlay" />
        {isLight ? (
            // LIGHT THEME BACKGROUNDS (Vivid Pastel Dream)
            <div className="absolute inset-0 bg-[#f8fafc] transition-colors duration-700">
                <div className="absolute top-[-10%] left-[-10%] w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] max-w-[1000px] max-h-[1000px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.4) 0%, transparent 65%)' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[130vw] h-[130vw] md:w-[70vw] md:h-[70vw] max-w-[1100px] max-h-[1100px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 65%)', animationDelay: '-5s' }} />
                <div className="absolute top-[20%] right-[0%] w-[110vw] h-[110vw] md:w-[55vw] md:h-[55vw] max-w-[900px] max-h-[900px] rounded-full animate-float-rev" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.3) 0%, transparent 70%)', animationDelay: '-10s' }} />
                <div className="absolute bottom-[20%] left-[0%] w-[110vw] h-[110vw] md:w-[55vw] md:h-[55vw] max-w-[900px] max-h-[900px] rounded-full animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.2) 0%, transparent 60%)', animationDelay: '-7s' }} />
                
                {/* Core Illuminator - Reduced white washout significantly */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vw] h-[80vh] md:w-[120vw] md:h-[60vh] max-w-[1500px] max-h-[1000px] rounded-[100%] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 40%, transparent 75%)' }} />

                {/* Fireflies / Pollen */}
                {fireflies.map((fl, i) => (
                    <div key={`light-fl-${i}`} className="absolute rounded-full bg-blue-500 opacity-0 animate-firefly pointer-events-none"
                         style={{
                             top: fl.top,
                             left: fl.left,
                             width: fl.width,
                             height: fl.height,
                             animationDelay: fl.animationDelay,
                             animationDuration: fl.animationDuration,
                         }} />
                ))}
            </div>
        ) : (
            // DARK THEME BACKGROUNDS (Deep Soft Neon Pastel)
            <div className="absolute inset-0 bg-[#060b18] transition-colors duration-700">
                <div className="absolute top-[-10%] left-[-10%] w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] max-w-[900px] max-h-[900px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 65%)' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[130vw] h-[130vw] md:w-[70vw] md:h-[70vw] max-w-[1000px] max-h-[1000px] rounded-full animate-float" style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.15) 0%, transparent 65%)', animationDelay: '-5s' }} />
                <div className="absolute top-[20%] right-[0%] w-[110vw] h-[110vw] md:w-[50vw] md:h-[50vw] max-w-[800px] max-h-[800px] rounded-full animate-float-rev" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)', animationDelay: '-10s' }} />
                <div className="absolute bottom-[20%] left-[0%] w-[110vw] h-[110vw] md:w-[50vw] md:h-[50vw] max-w-[800px] max-h-[800px] rounded-full animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(94,234,212,0.05) 0%, transparent 60%)', animationDelay: '-7s' }} />
                {/* Core Dark Absorber */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vw] h-[80vh] md:w-[120vw] md:h-[60vh] max-w-[1500px] max-h-[1000px] rounded-[100%] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(15,23,42,0.45) 0%, transparent 70%)' }} />
                
                {/* Soft backdrop */}
                <div className="absolute inset-0 bg-slate-950/40" />

                {/* Fireflies / Stardust */}
                {fireflies.map((fl, i) => (
                    <div key={`dark-fl-${i}`} className="absolute rounded-full bg-purple-200 opacity-0 animate-firefly pointer-events-none"
                         style={{
                             top: fl.top,
                             left: fl.left,
                             width: fl.width,
                             height: fl.height,
                             animationDelay: fl.animationDelay,
                             animationDuration: fl.animationDuration,
                         }} />
                ))}
            </div>
        )}
      </div>

      {/* Scrollable content container */}
      <div
        id="app-scroll-container"
        className="flex-1 overflow-y-auto overflow-x-hidden relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-[120px] z-10"
      >
        {children}
      </div>
    </div>
  );
};

export default AppShell;
