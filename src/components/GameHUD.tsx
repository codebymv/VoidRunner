import { Button } from './ui/button';
import { HamburgerMenu } from './HamburgerMenu';
import { HealthBar } from './HealthBar';
import { ShieldBar } from './ShieldBar';
import { AmmoBar } from './AmmoBar';
import { ScoreDisplay } from './ScoreDisplay';
import { DifficultyLevel } from '@/utils/difficultyConfig';
import logoImage from '@/assets/logo.webp';

interface GameHUDProps {
  score: number;
  highScore: number;
  health: number;
  shield: number;
  ammo: number;
  maxAmmo: number;
  isRecharging: boolean;
  hasWeapon: boolean;
  isUnlimitedAmmo: boolean;
  currentDifficulty: DifficultyLevel;
  isMobile: boolean;
  showJoystick: boolean;
  isMuted: boolean;
  onToggleJoystick: () => void;
  onToggleMute: () => void;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onShowStats: () => void;
  onShowHelp: () => void;
  onPause: () => void;
}

export const GameHUD = ({
  score,
  highScore,
  health,
  shield,
  ammo,
  maxAmmo,
  isRecharging,
  hasWeapon,
  isUnlimitedAmmo,
  currentDifficulty,
  isMobile,
  showJoystick,
  isMuted,
  onToggleJoystick,
  onToggleMute,
  onDifficultyChange,
  onShowStats,
  onShowHelp,
  onPause,
}: GameHUDProps) => {
  if (isMobile) {
    return (
      <div className="w-full max-w-4xl mb-1 sm:mb-2 md:mb-4">
        <div className="space-y-2 sm:space-y-3">
          {/* Top Row - Logo, Help, and Score */}
          <div className="flex items-center justify-between px-1">
            <img 
              src={logoImage} 
              alt="Game Logo" 
              className="h-10 sm:h-12 w-auto object-contain" 
            />
            
            <ScoreDisplay 
              score={score}
              highScore={highScore}
              currentDifficulty={currentDifficulty}
              isMobile={true}
            />
            
            {/* Help Icon and Hamburger Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={onShowHelp}
                className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors flex items-center justify-center text-lg font-bold z-[70]"
              >
                ?
              </button>
              <HamburgerMenu 
                showJoystick={showJoystick}
                onToggleJoystick={onToggleJoystick}
                isMobile={isMobile}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                currentDifficulty={currentDifficulty}
                onDifficultyChange={onDifficultyChange}
                onShowStats={onShowStats}
                highScore={highScore}
              />
            </div>
          </div>
          
          {/* Bottom Row - Health, Shield, Ammo, and Pause */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <HealthBar health={health} size="mobile" />
              <ShieldBar shield={shield} size="mobile" />
              <AmmoBar 
                ammo={ammo} 
                maxAmmo={maxAmmo}
                isRecharging={isRecharging}
                hasWeapon={hasWeapon}
                isUnlimitedAmmo={isUnlimitedAmmo}
                size="mobile" 
              />
            </div>
            
            <Button
              onClick={onPause}
              variant="outline"
              size="sm"
              className="bg-black/50 border-primary/30 text-primary hover:bg-primary/20 touch-manipulation text-xs sm:text-sm"
              style={{ minHeight: '36px', minWidth: '36px' }}
            >
              ⏸️
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="w-full max-w-4xl mb-1 sm:mb-2 md:mb-4">
      <div className="flex items-center justify-between px-2">
        {/* Left side - Logo and Score */}
        <div className="flex items-center gap-8">
          <img 
            src={logoImage} 
            alt="Game Logo" 
            className="h-14 w-auto object-contain" 
          />
          <ScoreDisplay 
            score={score}
            highScore={highScore}
            currentDifficulty={currentDifficulty}
            isMobile={false}
          />
        </div>
        
        {/* Right side - Health, Shield, Ammo, and Menu */}
        <div className="flex items-center gap-4">
          <HealthBar health={health} size="desktop" />
          <ShieldBar shield={shield} size="desktop" />
          <AmmoBar 
            ammo={ammo} 
            maxAmmo={maxAmmo}
            isRecharging={isRecharging}
            hasWeapon={hasWeapon}
            isUnlimitedAmmo={isUnlimitedAmmo}
            size="desktop" 
          />
          
          <HamburgerMenu 
            showJoystick={showJoystick}
            onToggleJoystick={onToggleJoystick}
            isMobile={isMobile}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            currentDifficulty={currentDifficulty}
            onDifficultyChange={onDifficultyChange}
            onShowStats={onShowStats}
          />
        </div>
      </div>
    </div>
  );
};


