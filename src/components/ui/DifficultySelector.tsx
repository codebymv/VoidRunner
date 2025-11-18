import { DifficultyLevel } from "@/utils/difficultyConfig";

interface DifficultySelectorProps {
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  highScore: number;
}

export const DifficultySelector = ({
  currentDifficulty,
  onDifficultyChange,
  highScore,
}: DifficultySelectorProps) => {
  return (
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
  );
};





