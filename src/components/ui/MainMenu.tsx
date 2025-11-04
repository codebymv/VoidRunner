import { Button } from "./button";
import { DifficultyLevel } from "@/utils/difficultyConfig";
import logoImage from "@/assets/logo.png";
import trophyImage from "@/assets/trophy.png";

interface MainMenuProps {
  onStartGame: () => void;
  highScore: number;
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  isMobile: boolean;
}

export const MainMenu = ({
  onStartGame,
  highScore,
  currentDifficulty,
  onDifficultyChange,
  isMobile,
}: MainMenuProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 sm:p-12 text-center max-w-md w-full space-y-4 sm:space-y-6">
        <img src={logoImage} alt="Void Runner" className="w-64 sm:w-80 h-auto mx-auto glow-blue" />
        <p className="text-muted-foreground text-base sm:text-lg">Survive gravitational chaos</p>
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground text-left bg-muted/30 p-3 sm:p-4 rounded-lg">
          {isMobile ? (
            <>
              <p>🕹️ <strong>Virtual joystick</strong> to move</p>
              <p>⭐ Collect stars & scrap for points</p>
              <p>💚 Collect wrenches for health</p>
              <p>🪐 Avoid obstacles</p>
            </>
          ) : (
            <>
              <p>🚀 <strong>WASD</strong> or <strong>Arrow Keys</strong> to thrust</p>
              <p>⭐ Collect stars & scrap for points</p>
              <p>💚 Collect wrenches for health</p>
              <p>🪐 Avoid obstacles</p>
            </>
          )}
        </div>
        
        {/* Difficulty Selector */}
        <div className="space-y-2 pt-4">
          <div className="text-sm text-muted-foreground">Difficulty</div>
          <div className="flex gap-2 justify-center">
            {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((difficulty) => {
              const isHardLocked = difficulty === 'hard' && highScore < 12500;
              return (
              <button
                key={difficulty}
                onClick={() => {
                  if (isHardLocked) return; // Prevent click if locked
                  onDifficultyChange(difficulty);
                }}
                disabled={isHardLocked}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
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
          <div className="text-xs text-muted-foreground">
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
        
        <Button onClick={onStartGame} size="lg" className="w-full bg-blue-500 text-white hover:bg-blue-600 glow-blue text-base sm:text-lg">
          START GAME
        </Button>
        {highScore > 0 && (
          <div className="text-accent glow-blue text-sm sm:text-base">High Score: {highScore}</div>
        )}
      </div>
    </div>
  );
};

