import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

interface HamburgerMenuProps {
  showJoystick: boolean;
  onToggleJoystick: () => void;
  isMobile: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ 
  showJoystick, 
  onToggleJoystick, 
  isMobile,
  isMuted,
  onToggleMute
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

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="bg-black/50 border-primary/30 text-primary hover:bg-primary/20 transition-colors p-2"
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
        <div className="absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-xl border border-primary/30 rounded-lg shadow-lg z-[100] min-w-48">
          <div className="p-2">
            {/* Joystick Toggle Option - Only show on desktop */}
            {!isMobile && (
              <button
                onClick={handleJoystickToggle}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  showJoystick 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
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
                  ? 'bg-primary/20 text-primary' 
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span>Mute (M)</span>
            </button>
            
            {/* Future menu items can be added here */}
            {/* Example:
            <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary rounded transition-colors">
              Sound Effects
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary rounded transition-colors">
              Music
            </button>
            */}
          </div>
        </div>
      )}
    </div>
  );
};