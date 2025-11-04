import { Button } from "./button";
import { DifficultyLevel } from "@/utils/difficultyConfig";
import logoImage from "@/assets/logo.png";
import { AchievementCarousel } from "../AchievementCarousel";
import { DifficultySelector } from "./DifficultySelector";
import { ControlsCard } from "./ControlsCard";

interface MainMenuProps {
  onStartGame: () => void;
  highScore: number;
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
      <div className="bg-card/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 sm:p-10 text-center max-w-lg w-full space-y-4 sm:space-y-6">
        <img src={logoImage} alt="Void Runner" className="w-64 sm:w-80 h-auto mx-auto glow-blue" />
        <p className="text-muted-foreground text-base sm:text-lg">Survive gravitational chaos</p>
        
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
        
        <Button onClick={onStartGame} size="lg" className="w-full bg-blue-500 text-white hover:bg-blue-600 glow-blue text-base sm:text-lg mt-4">
          START GAME
        </Button>
        {highScore > 0 && (
          <div className="text-accent glow-blue text-sm sm:text-base">High Score: {highScore}</div>
        )}
      </div>
    </div>
  );
};

