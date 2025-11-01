import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { type DifficultyLevel } from '../utils/difficultyConfig';

interface HamburgerMenuProps {
  showJoystick: boolean;
  onToggleJoystick: () => void;
  isMobile: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onShowStats?: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ 
  showJoystick, 
  onToggleJoystick, 
  isMobile,
  isMuted,
  onToggleMute,
  currentDifficulty,
  onDifficultyChange,
  onShowStats
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleJoystickToggle = () => {
    onToggleJoystick();
    setIsOpen(false); // Close menu after selection
  };

  const handleMuteToggle = () => {
    onToggleMute();
    setIsOpen(false); // Close menu after selection
  };

  const handleDifficultyChange = (difficulty: DifficultyLevel) => {
    onDifficultyChange(difficulty);
    setIsOpen(false); // Close menu after selection
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="bg-black/50 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors p-2"
        style={{ minHeight: '36px', minWidth: '36px' }}
      >
        <div className="flex flex-col gap-1">
          <div className="w-4 h-0.5 bg-current transition-all duration-200"></div>
          <div className="w-4 h-0.5 bg-current transition-all duration-200"></div>
          <div className="w-4 h-0.5 bg-current transition-all duration-200"></div>
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-xl border border-blue-500/30 rounded-lg shadow-lg z-[100] min-w-48">
          <div className="p-2">
            {/* Joystick Toggle Option - Only show on desktop */}
            {!isMobile && (
              <button
                onClick={handleJoystickToggle}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  showJoystick 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                }`}
              >
                <span>Joystick (J)</span>
              </button>
            )}
            
            {/* Mute Toggle Option */}
            <button
              onClick={handleMuteToggle}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                isMuted 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
              }`}
            >
              <span>Mute (M)</span>
            </button>

            {/* Stats Button */}
            {onShowStats && (
              <button
                onClick={() => {
                  onShowStats();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded transition-colors text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400"
              >
                <span>📊 Stats</span>
              </button>
            )}

            {/* Difficulty Selector */}
            <div className="border-t border-blue-500/20 mt-2 pt-2">
              <div className="px-3 py-1 text-xs text-blue-400 font-medium">Difficulty</div>
              {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => handleDifficultyChange(difficulty)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    currentDifficulty === difficulty
                      ? difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : difficulty === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                  }`}
                >
                  <span>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
