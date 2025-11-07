import { Button } from "./button";
import { HamburgerMenu } from "../HamburgerMenu";
import { ControlsCard } from "./ControlsCard";
import logoImage from "../../assets/logo.png";
import redCrossSprite from "../../assets/red_cross.png";
import shieldSprite from "../../assets/shield.svg";
import unlimitedAmmoImage from '../../assets/unlimited_ammo.png';
import { AudioManager } from "../../audio/AudioManager";

interface GameHUDProps {
  score: number;
  highScore: number;
  health: number;
  shield: number;
  ammo: number;
  maxAmmo: number;
  hasWeapon: boolean;
  isUnlimitedAmmo: boolean;
  isRecharging: boolean;
  currentDifficulty: string;
  showHelp: boolean;
  helpFilter: string | null;
  showJoystick: boolean;
  isMobile: boolean;
  isMuted: boolean;
  onPause: () => void;
  onToggleHelp: () => void;
  onToggleJoystick: () => void;
  onToggleMute: () => void;
  onDifficultyChange: (difficulty: string) => void;
  playMenuOpen: () => Promise<void>;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  highScore,
  health,
  shield,
  ammo,
  maxAmmo,
  hasWeapon,
  isUnlimitedAmmo,
  isRecharging,
  currentDifficulty,
  showHelp,
  helpFilter,
  showJoystick,
  isMobile,
  isMuted,
  onPause,
  onToggleHelp,
  onToggleJoystick,
  onToggleMute,
  onDifficultyChange,
  playMenuOpen,
}) => {
  return (
    <>
      {/* UI Header - Responsive Layout */}
      <div className="w-full mb-0">
        {isMobile ? (
          /* Mobile Layout - Stacked */
          <div className="space-y-0.5">
            {/* Top Row - Logo, Help, and Score */}
            <div className="flex items-center justify-between px-0.5 sm:px-1">
              <img 
                src={logoImage} 
                alt="Game Logo" 
                className="h-5 sm:h-6 w-auto object-contain" 
              />
              
              {/* Center section with High Score and Current Score */}
              <div className="flex flex-col items-center gap-0">
                {highScore > 0 && (
                  <div className="text-xs sm:text-sm text-accent glow-blue">
                    High Score: {highScore}
                  </div>
                )}
                {/* Score and Difficulty on same row */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className={`text-xl sm:text-2xl md:text-3xl font-bold transition-colors duration-300 ${
                    score > highScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'
                  }`}>
                    {score}
                  </div>
                  
                  {/* Difficulty Indicator */}
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    (<span className={`font-semibold ${
                      currentDifficulty === 'easy' ? 'text-green-400' :
                      currentDifficulty === 'medium' ? 'text-blue-400' :
                      'text-red-400'
                    }`}>
                      {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
                    </span>)
                  </div>
                </div>
              </div>
              
              {/* Help Icon and Hamburger Menu */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    onClick={onToggleHelp}
                    className="help-button w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors flex items-center justify-center text-lg font-bold z-[70]"
                  >
                    ?
                  </button>
                  
                  {/* Help Popup - positioned below the help button (mobile) */}
                  {showHelp && isMobile && (
                    <div className="help-popup absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-xl border border-primary/30 rounded-lg shadow-2xl z-[80] max-w-[280px]">
                      <div className="absolute -top-2 right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-card/95"></div>
                      <div className="p-3">
                        <ControlsCard isMobile={isMobile} filter={helpFilter} />
                      </div>
                    </div>
                  )}
                </div>
                <HamburgerMenu 
                  showJoystick={showJoystick}
                  onToggleJoystick={onToggleJoystick}
                  isMobile={isMobile}
                  isMuted={isMuted}
                  onToggleMute={onToggleMute}
                  currentDifficulty={currentDifficulty}
                  onDifficultyChange={onDifficultyChange}
                  highScore={highScore}
                />
              </div>
            </div>
            
            {/* Bottom Row - Health, Shield, and Pause */}
            <div className="flex items-center justify-between px-0.5 sm:px-1">
              {/* Health and Shield */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Health Bar */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <img src={redCrossSprite} alt="Health" className="w-4 sm:w-5 h-4 sm:h-5 drop-shadow-lg" style={{filter: 'drop-shadow(0 0 4px #00ffff)'}} />
                  <div className="relative w-16 sm:w-20 h-2 sm:h-2.5 bg-black/50 rounded-full border border-primary/30">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                        health >= 2.5 ? 'bg-green-500' :
                        health >= 1.5 ? 'bg-yellow-500' :
                        health > 0 ? 'bg-red-500' :
                        'bg-transparent'
                      }`}
                      style={{
                        width: `${Math.max(0, (health / 3.0) * 100)}%`,
                        boxShadow: health > 0 ? `0 0 8px ${
                          health >= 2.5 ? '#22c55e' :
                          health >= 1.5 ? '#eab308' :
                          '#ef4444'
                        }` : 'none'
                      }}
                    />
                  </div>
                </div>
                
                {/* Shield Bar */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <img 
                    src={shieldSprite} 
                    alt="Shield" 
                    className={`w-4 sm:w-5 h-4 sm:h-5 drop-shadow-lg transition-opacity duration-300 ${shield > 0 ? 'opacity-100' : 'opacity-30'}`}
                    style={{filter: shield > 0 ? 'drop-shadow(0 0 4px #3b82f6)' : 'drop-shadow(0 0 2px #64748b)'}} 
                  />
                  <div className={`relative w-16 sm:w-20 h-2 sm:h-2.5 bg-black/50 rounded-full border transition-all duration-300 ${shield > 0 ? 'border-blue-500/50' : 'border-gray-500/30'}`}>
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, (shield / 3.0) * 100)}%`,
                        boxShadow: shield > 0 ? '0 0 8px #3b82f6' : 'none'
                      }}
                    />
                  </div>
                </div>
                
                {/* Ammo Bar */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <img 
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
                    alt="Weapon" 
                    className={`w-4 sm:w-5 h-4 sm:h-5 drop-shadow-lg transition-opacity duration-300 ${(hasWeapon && (ammo > 0 || isUnlimitedAmmo)) ? 'opacity-100' : 'opacity-30'}`}
                    style={{
                      filter: (hasWeapon && (ammo > 0 || isUnlimitedAmmo))
                        ? isUnlimitedAmmo
                          ? 'drop-shadow(0 0 8px #c0c0c0) brightness(1.3)'
                          : 'drop-shadow(0 0 4px #60a5fa)'
                        : 'drop-shadow(0 0 2px #64748b)',
                      content: `url(${unlimitedAmmoImage})`
                    }}
                  />
                  <div className={`relative w-16 sm:w-20 h-2 sm:h-2.5 bg-black/50 rounded-full border transition-all duration-300 ${hasWeapon ? (isUnlimitedAmmo ? 'border-gray-400/50' : 'border-cyan-500/50') : 'border-gray-500/30'}`}>
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                        isUnlimitedAmmo ? 'bg-gradient-to-r from-gray-300 to-slate-400' : 
                        isRecharging ? 'bg-cyan-400' : 
                        'bg-cyan-500'
                      }`}
                      style={{
                        width: !hasWeapon ? '0%' : (isUnlimitedAmmo ? '100%' : `${Math.max(0, (ammo / maxAmmo) * 100)}%`),
                        boxShadow: hasWeapon
                          ? isUnlimitedAmmo 
                            ? '0 0 10px #c0c0c0'
                            : '0 0 8px #60a5fa'
                          : 'none',
                        animation: isRecharging ? 'pulse 1s ease-in-out infinite' : 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Pause Button */}
              <Button
                onClick={() => {
                  console.log("🎮 PAUSE BUTTON CLICKED - About to call playMenuOpen()");
                  playMenuOpen().catch(console.error);
                  AudioManager.getInstance().stopShipEngineLoops(); // Stop ship engine loops when paused
                  onPause();
                }}
                variant="outline"
                size="sm"
                className="bg-black/50 border-primary/30 text-primary hover:bg-primary/20 touch-manipulation text-xs sm:text-sm"
                style={{ minHeight: '36px', minWidth: '36px' }}
              >
                ⏸️
              </Button>
            </div>
          </div>
        ) : (
          /* Desktop Layout - Single Row */
          <div className="flex items-center justify-between px-6">
            {/* Left side - Logo and Score */}
            <div className="flex items-center gap-10">
              <img 
                src={logoImage} 
                alt="Game Logo" 
                className="h-9 w-auto object-contain drop-shadow-lg" 
                style={{filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))'}}
              />
              
              {/* Vertical divider */}
              <div className="h-10 w-px bg-primary/30"></div>
              
              <div className="flex items-center gap-10">
                {highScore > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-accent glow-blue opacity-80">
                      High Score
                    </div>
                    <div className="text-xl font-bold text-accent glow-blue">
                      {highScore}
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-blue-400 glow-blue opacity-80">
                    Score
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`text-2xl font-bold transition-colors duration-300 ${
                      score > highScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'
                    } text-glow`}>
                      {score}
                    </div>
                    
                    {/* Difficulty Indicator */}
                    <div className="text-sm text-muted-foreground">
                      (<span className={`font-semibold ${
                        currentDifficulty === 'easy' ? 'text-green-400' :
                        currentDifficulty === 'medium' ? 'text-blue-400' :
                        'text-red-400'
                      }`}>
                        {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
                      </span>)
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Health, Shield, Ammo, and Menu */}
            <div className="flex items-center gap-4">
              <img src={redCrossSprite} alt="Health" className="w-6 h-6 drop-shadow-lg" style={{filter: 'drop-shadow(0 0 4px #00ffff)'}} />
              <div className="relative w-32 h-3 bg-black/50 rounded-full border border-primary/30">
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                    health >= 2.5 ? 'bg-green-500' :
                    health >= 1.5 ? 'bg-yellow-500' :
                    health > 0 ? 'bg-red-500' :
                    'bg-transparent'
                  }`}
                  style={{
                    width: `${Math.max(0, (health / 3.0) * 100)}%`,
                    boxShadow: health > 0 ? `0 0 10px ${
                      health >= 2.5 ? '#22c55e' :
                      health >= 1.5 ? '#eab308' :
                      '#ef4444'
                    }` : 'none'
                  }}
                />
              </div>
              
              {/* Shield Bar */}
              <img 
                src={shieldSprite} 
                alt="Shield" 
                className={`w-6 h-6 drop-shadow-lg transition-opacity duration-300 ${shield > 0 ? 'opacity-100' : 'opacity-30'}`}
                style={{filter: shield > 0 ? 'drop-shadow(0 0 4px #3b82f6)' : 'drop-shadow(0 0 2px #64748b)'}} 
              />
              <div className={`relative w-32 h-3 bg-black/50 rounded-full border transition-all duration-300 ${shield > 0 ? 'border-blue-500/50' : 'border-gray-500/30'}`}>
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(0, (shield / 3.0) * 100)}%`,
                    boxShadow: shield > 0 ? '0 0 10px #3b82f6' : 'none'
                  }}
                />
              </div>
              
              {/* Ammo Bar */}
              <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
                alt="Weapon" 
                className={`w-6 h-6 drop-shadow-lg transition-opacity duration-300 ${(hasWeapon && (ammo > 0 || isUnlimitedAmmo)) ? 'opacity-100' : 'opacity-30'}`}
                style={{
                  filter: (hasWeapon && (ammo > 0 || isUnlimitedAmmo))
                    ? isUnlimitedAmmo
                      ? 'drop-shadow(0 0 8px #c0c0c0) brightness(1.3)'
                      : 'drop-shadow(0 0 4px #60a5fa)'
                    : 'drop-shadow(0 0 2px #64748b)',
                  content: `url(${unlimitedAmmoImage})`
                }}
              />
              <div className={`relative w-32 h-3 bg-black/50 rounded-full border transition-all duration-300 ${hasWeapon ? (isUnlimitedAmmo ? 'border-gray-400/50' : 'border-cyan-500/50') : 'border-gray-500/30'}`}>
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                    isUnlimitedAmmo ? 'bg-gradient-to-r from-gray-300 to-slate-400' : 
                    isRecharging ? 'bg-cyan-400' : 
                    'bg-cyan-500'
                  }`}
                  style={{
                    width: !hasWeapon ? '0%' : (isUnlimitedAmmo ? '100%' : `${Math.max(0, (ammo / maxAmmo) * 100)}%`),
                    boxShadow: hasWeapon
                      ? isUnlimitedAmmo 
                        ? '0 0 12px #c0c0c0'
                        : '0 0 10px #60a5fa'
                      : 'none',
                    animation: isRecharging ? 'pulse 1s ease-in-out infinite' : 'none'
                  }}
                />
              </div>
              
              {/* Hamburger Menu */}
              <HamburgerMenu 
                showJoystick={showJoystick}
                onToggleJoystick={onToggleJoystick}
                isMobile={isMobile}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                currentDifficulty={currentDifficulty}
                onDifficultyChange={onDifficultyChange}
                highScore={highScore}
              />
            </div>
          </div>
        )}
      </div>

      {/* Desktop Help Popup - positioned from desktop floating button */}
      {showHelp && !isMobile && (
        <div className="help-popup fixed bottom-14 right-1 bg-card/95 backdrop-blur-xl border border-primary/30 rounded-lg shadow-2xl z-[80] max-w-sm">
          <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-card/95"></div>
          <div className="p-3">
            <ControlsCard isMobile={isMobile} filter={helpFilter} />
          </div>
        </div>
      )}
    </>
  );
};

