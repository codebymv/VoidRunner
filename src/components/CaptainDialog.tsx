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

  const images = [talk1, talk2];
  const dialogMessage = message || "Heh, don't say I didn't warn ya..."; // Use custom message or default
  const displayDuration = 5000; // 5 seconds (reduced from 10 seconds)
  const imageSwapInterval = 800; // Switch images every 800ms

  useEffect(() => {
    if (isVisible) {
      // Start animation in
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
          onComplete();
        }, 500); // Exit animation duration
      }, displayDuration);

      return () => {
        clearInterval(imageInterval);
        clearTimeout(exitTimer);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Dialog Card */}
      <div 
        className={`
          absolute top-1/2 -translate-y-1/2 
          bg-gradient-to-br from-slate-800/95 to-slate-900/95 
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
          
          {/* Message */}
          <div className="text-white text-sm leading-relaxed break-words">
            {dialogMessage}
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