import { Button } from "./button";
import { DifficultyLevel } from "@/utils/difficultyConfig";
import trophyImage from "@/assets/trophy.png";

interface PauseMenuProps {
  onResume: () => void;
  showJoystick: boolean;
  onToggleJoystick: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  highScore: number;
  isMobile: boolean;
}

export const PauseMenu = ({
  onResume,
  showJoystick,
  onToggleJoystick,
  isMuted,
  onToggleMute,
  currentDifficulty,
  onDifficultyChange,
  highScore,
  isMobile,
}: PauseMenuProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-3 sm:space-y-4 w-full max-w-sm">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 glow-blue">PAUSED</h2>
        
        <Button onClick={onResume} className="bg-blue-500 text-white hover:bg-blue-600 w-full">
          RESUME
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
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                  : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
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
                ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
            }`}
          >
            Mute (M) {isMuted ? '✓' : ''}
          </Button>
          
          {/* Difficulty Selection */}
          <div className="space-y-2 pt-4">
            <div className="text-sm text-muted-foreground">Difficulty</div>
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                const isHardLocked = difficulty === 'hard' && highScore < 12500;
                return (
                <button
                  key={difficulty}
                  onClick={() => {
                    if (isHardLocked) return;
                    onDifficultyChange(difficulty);
                  }}
                  disabled={isHardLocked}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex-1 ${
                    isHardLocked 
                      ? 'bg-muted/10 text-muted-foreground/30 border border-muted/20 cursor-not-allowed opacity-50'
                      : currentDifficulty === difficulty
                      ? difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : difficulty === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-muted/30 text-muted-foreground border border-muted/50 hover:bg-blue-500/10 hover:text-blue-400'
                  }`}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{isHardLocked && ' 🔒'}
                </button>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {currentDifficulty === 'easy' && 'Fewer obstacles, more forgiving'}
              {currentDifficulty === 'medium' && 'Balanced gameplay, can get crazy'}
              {currentDifficulty === 'hard' && 'More obstacles and faster, RIP'}
            </div>
          </div>
          
          {/* Achievements - Show when any previous score exists */}
          {highScore > 0 && (
            <div className="space-y-2 pt-4 border-t border-blue-500/20">
              <div className="text-sm text-muted-foreground">Achievements</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Rookie */}
                <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 1500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                  <img 
                    src={trophyImage} 
                    alt="Trophy" 
                    className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 1500 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Rookie</div>
                    <div className="text-xs opacity-70">1,500+ pts</div>
                  </div>
                </div>
                {/* Ace Pilot */}
                <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 12500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                  <img 
                    src={trophyImage} 
                    alt="Trophy" 
                    className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 12500 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Ace Pilot</div>
                    <div className="text-xs opacity-70">12,500+ pts</div>
                  </div>
                </div>
                {/* Legend */}
                <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 25000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                  <img 
                    src={trophyImage} 
                    alt="Trophy" 
                    className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 25000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Legend</div>
                    <div className="text-xs opacity-70">25,000+ pts</div>
                  </div>
                </div>
                {/* Psychonaut */}
                <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 75000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                  <img 
                    src={trophyImage} 
                    alt="Trophy" 
                    className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 75000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Psychonaut</div>
                    <div className="text-xs opacity-70">75,000+ pts</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

