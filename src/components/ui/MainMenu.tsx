import { Button } from "./button";
import { DifficultyLevel } from "@/utils/difficultyConfig";
import logoImage from "@/assets/logo.png";
import { AchievementCarousel } from "../AchievementCarousel";
import { DifficultySelector } from "./DifficultySelector";
import { ControlsCard } from "./ControlsCard";

interface MainMenuProps {
  onStartGame: () => void;
  highScore: number; // Effective high score (may include portal DB value)
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  isMobile: boolean;
  nearMissCount?: number;
  repairsCollected?: number;
  shotsFired?: number;
}

export const MainMenu = ({
  onStartGame,
  highScore,
  currentDifficulty,
  onDifficultyChange,
  isMobile,
  nearMissCount = 0,
  repairsCollected = 0,
  shotsFired = 0,
}: MainMenuProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 sm:p-6 text-center max-w-lg w-full space-y-2 sm:space-y-3">
        <img src={logoImage} alt="Void Runner" className="w-48 sm:w-56 h-auto mx-auto glow-blue" />
        <p className="text-muted-foreground text-sm sm:text-base">Survive gravitational chaos</p>
        
        {/* Controls Card */}
        <ControlsCard isMobile={isMobile} />
        
        {/* Difficulty Selector */}
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
        
        <Button onClick={onStartGame} size="lg" className="w-full bg-blue-500 text-white hover:bg-blue-600 glow-blue text-base sm:text-lg mt-2">
          START GAME
        </Button>
        {highScore > 0 && (
          <div className="text-accent glow-blue text-sm sm:text-base">High Score: {highScore}</div>
        )}
      </div>
    </div>
  );
};

