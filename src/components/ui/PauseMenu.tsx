import { Button } from "./button";
import { DifficultyLevel } from "@/utils/difficultyConfig";
import { AchievementCarousel } from "../AchievementCarousel";
import { DifficultySelector } from "./DifficultySelector";

interface PauseMenuProps {
  onResume: () => void;
  onMainMenu: () => void;
  showJoystick: boolean;
  onToggleJoystick: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  highScore: number;
  isMobile: boolean;
  nearMissCount?: number;
  repairsCollected?: number;
  shotsFired?: number;
}

export const PauseMenu = ({
  onResume,
  onMainMenu,
  showJoystick,
  onToggleJoystick,
  isMuted,
  onToggleMute,
  currentDifficulty,
  onDifficultyChange,
  highScore,
  isMobile,
  nearMissCount = 0,
  repairsCollected = 0,
  shotsFired = 0,
}: PauseMenuProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 sm:p-8 text-center space-y-3 sm:space-y-4 w-full max-w-md">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 glow-blue">PAUSED</h2>
        
        <Button onClick={onResume} className="bg-blue-500 text-white hover:bg-blue-600 w-full">
          RESUME
        </Button>
        
        <Button 
          onClick={onMainMenu}
          variant="outline" 
          className="w-full bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-card/50 hover:border-blue-500/30 hover:text-muted-foreground"
        >
          MAIN MENU
        </Button>
        
        {/* Hamburger Menu Options */}
        <div className="space-y-2 pt-2 border-t border-blue-500/20">
          {/* Joystick Toggle - Only show on desktop */}
          {!isMobile && (
            <Button
              onClick={onToggleJoystick}
              variant="outline"
              className={`w-full ${
                showJoystick 
                  ? 'bg-card/60 border-blue-500/40 text-muted-foreground hover:bg-card/60 hover:border-blue-500/40 hover:text-muted-foreground' 
                  : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-card/50 hover:border-blue-500/30 hover:text-muted-foreground'
              }`}
            >
              Joystick (J) {showJoystick ? '✓' : ''}
            </Button>
          )}
          
          {/* Mute Toggle */}
          <Button
            onClick={onToggleMute}
            variant="outline"
            className={`w-full ${
              isMuted 
                ? 'bg-card/60 border-blue-500/40 text-muted-foreground hover:bg-card/60 hover:border-blue-500/40 hover:text-muted-foreground' 
                : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-card/50 hover:border-blue-500/30 hover:text-muted-foreground'
            }`}
          >
            Mute (M) {isMuted ? '✓' : ''}
          </Button>
          
          {/* Difficulty Selection */}
          <DifficultySelector
            currentDifficulty={currentDifficulty}
            onDifficultyChange={onDifficultyChange}
            highScore={highScore}
          />
          
          {/* Achievements Carousel */}
          <AchievementCarousel 
            highScore={highScore}
            nearMissCount={nearMissCount}
            repairsCollected={repairsCollected}
            shotsFired={shotsFired}
          />
        </div>
      </div>
    </div>
  );
};

