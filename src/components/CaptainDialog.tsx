import React, { useState, useEffect } from 'react';
import talk1 from '../assets/talk1.png';
import talk2 from '../assets/talk2.png';

interface CaptainDialogProps {
  isVisible: boolean;
  onComplete: () => void;
  message?: string; // Optional custom message
}

export const CaptainDialog: React.FC<CaptainDialogProps> = ({ isVisible, onComplete, message }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const images = [talk1, talk2];
  const dialogMessage = message || "Heh, don't say I didn't warn ya..."; // Use custom message or default
  const displayDuration = 5000; // 5 seconds (reduced from 10 seconds)
  const imageSwapInterval = 800; // Switch images every 800ms

  // Parse message to separate gestures (in parentheses) from actual dialogue
  const parseMessage = (msg: string): { gestures: string[], words: string } => {
    // Match everything in parentheses as gestures
    const gestureMatches = msg.match(/\([^)]+\)/g) || [];
    // Remove gestures and ellipses/dots to get just the words
    const words = msg.replace(/\([^)]+\)/g, '').replace(/\.\.\./g, '').trim();
    
    return {
      gestures: gestureMatches,
      words: words
    };
  };

  const { gestures, words } = parseMessage(dialogMessage);

  useEffect(() => {
    if (isVisible) {
      // Start rendering and animation in
      setShouldRender(true);
      setIsAnimatingIn(true);
      setIsAnimatingOut(false);
      
      // Start image alternation
      const imageInterval = setInterval(() => {
        setCurrentImage(prev => (prev + 1) % images.length);
      }, imageSwapInterval);

      // Start exit animation after display duration
      const exitTimer = setTimeout(() => {
        setIsAnimatingOut(true);
        setIsAnimatingIn(false);
        
        // Complete after exit animation
        setTimeout(() => {
          setShouldRender(false);
          onComplete();
        }, 500); // Exit animation duration
      }, displayDuration);

      return () => {
        clearInterval(imageInterval);
        clearTimeout(exitTimer);
      };
    }
  }, [isVisible, onComplete, imageSwapInterval]);

  // Handle exit animation when visibility becomes false while dialog is showing
  useEffect(() => {
    if (!isVisible && shouldRender) {
      // If visibility becomes false while dialog is showing, trigger exit animation
      setIsAnimatingOut(true);
      setIsAnimatingIn(false);
      
      // Stop rendering after exit animation completes
      const exitTimer = setTimeout(() => {
        setShouldRender(false);
      }, 500); // Exit animation duration
      
      return () => clearTimeout(exitTimer);
    }
  }, [isVisible, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Dialog Card */}
      <div 
        className={`
          absolute top-1/2 -translate-y-1/2 
          bg-gradient-to-br from-slate-800/70 to-slate-900/70 
          backdrop-blur-sm border border-slate-600/50 
          rounded-xl shadow-2xl p-4 flex items-center gap-4
          transition-all duration-500 ease-out
          ${isAnimatingIn && !isAnimatingOut ? 'right-8 opacity-100' : ''}
          ${isAnimatingOut ? '-right-96 opacity-0' : ''}
          ${!isAnimatingIn && !isAnimatingOut ? '-right-96 opacity-0' : ''}
        `}
        style={{
          minWidth: '400px',
          maxWidth: '500px'
        }}
      >
        {/* Captain Headshot */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <img 
            src={images[currentImage]} 
            alt="Captain" 
            className="w-full h-full object-cover rounded-lg border-2 border-slate-500/50 transition-opacity duration-200"
          />
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400/20 to-purple-400/20 pointer-events-none" />
        </div>

        {/* Dialog Content */}
        <div className="flex-1">
          {/* Captain Name */}
          <div className="text-sm font-bold text-blue-300 mb-1">
            Captain
          </div>
          
          {/* Message - Separated Gestures and Words */}
          <div className="space-y-1">
            {/* Gestures (actions) - italicized and muted */}
            {gestures.length > 0 && (
              <div className="text-xs italic text-slate-400 flex flex-wrap gap-1">
                {gestures.map((gesture, index) => (
                  <span key={index} className="inline-block">
                    {gesture}
                  </span>
                ))}
              </div>
            )}
            
            {/* Actual spoken words - bold and underlined for emphasis */}
            {words && (
              <div className="text-white text-sm leading-relaxed break-words">
                <span className="font-semibold underline decoration-blue-400/50 decoration-2 underline-offset-2">
                  {words}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-2 border-blue-400/30 rounded-full animate-ping" />
      </div>

      {/* Optional: Subtle overlay to darken background slightly */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
    </div>
  );
};
