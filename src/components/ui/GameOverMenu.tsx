import { Button } from "./button";
import { DifficultyLevel } from "@/utils/difficultyConfig";
import { AchievementCarousel } from "../AchievementCarousel";
import { DifficultySelector } from "./DifficultySelector";

interface GameOverMenuProps {
  score: number;
  highScore: number;
  previousHighScore: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  showJoystick: boolean;
  onToggleJoystick: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  isMobile: boolean;
  nearMissCount?: number;
  repairsCollected?: number;
  shotsFired?: number;
}

export const GameOverMenu = ({
  score,
  highScore,
  previousHighScore,
  onPlayAgain,
  onMainMenu,
  showJoystick,
  onToggleJoystick,
  isMuted,
  onToggleMute,
  currentDifficulty,
  onDifficultyChange,
  isMobile,
  nearMissCount = 0,
  repairsCollected = 0,
  shotsFired = 0,
}: GameOverMenuProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 sm:p-10 text-center space-y-4 sm:space-y-6 w-full max-w-lg">
        <h2 className="text-3xl sm:text-4xl font-bold text-blue-400 glow-blue">GAME OVER</h2>
        <div className="space-y-1 sm:space-y-2">
          <div className="text-xl sm:text-2xl">
            Score: <span className={`font-bold transition-colors duration-300 ${
              score >= highScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'
            }`}>{score}</span>
            {score >= highScore && score > 0 && (
              <div className="text-sm text-blue-400 glow-blue animate-pulse">NEW HIGH SCORE!</div>
            )}
          </div>
          <div className="text-lg sm:text-xl text-muted-foreground">
            Previous High Score: <span className={`font-bold transition-colors duration-300 ${
              score >= highScore ? 'text-blue-400 glow-blue' : 'text-yellow-400 glow-yellow'
            }`}>{previousHighScore > 0 ? previousHighScore : 'None'}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button onClick={onPlayAgain} size="lg" className="w-full bg-blue-500 text-white hover:bg-blue-600 glow-blue">
            PLAY AGAIN
          </Button>
          
          <Button 
            onClick={onMainMenu}
            variant="outline" 
            size="lg" 
            className="w-full bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400"
          >
            MAIN MENU
          </Button>
        </div>
        
        {/* Hamburger Menu Options */}
        <div className="space-y-2 pt-4 border-t border-blue-500/20">
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

