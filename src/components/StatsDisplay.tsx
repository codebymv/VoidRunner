import { StatsManager, SessionStats } from '../game/StatsManager';
import { AchievementSystem } from '../game/AchievementSystem';
import { Button } from './ui/button';
import trophyImage from '@/assets/trophy.webp';

interface StatsDisplayProps {
  sessionStats: SessionStats;
  statsManager: StatsManager;
  achievementSystem: AchievementSystem;
  onClose: () => void;
}

export const StatsDisplay = ({ 
  sessionStats, 
  statsManager, 
  achievementSystem,
  onClose 
}: StatsDisplayProps) => {
  const formattedStats = statsManager.getFormattedStats();
  const unlockedAchievements = achievementSystem.getUnlockedAchievements();
  const allAchievements = achievementSystem.getAchievements();

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-400 glow-blue">Statistics</h2>
          <Button onClick={onClose} variant="outline" size="sm">Close</Button>
        </div>

        {/* Session Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">This Session</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Time Survived</div>
              <div className="font-bold">{formatTime(sessionStats.survivalTime)}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Stars Collected</div>
              <div className="font-bold">{sessionStats.starsCollected}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Near Misses</div>
              <div className="font-bold">{sessionStats.nearMisses}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Max Combo</div>
              <div className="font-bold">{sessionStats.maxCombo}x</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Score</div>
              <div className="font-bold">{sessionStats.score.toLocaleString()}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Distance</div>
              <div className="font-bold">{Math.round(sessionStats.distanceTraveled).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Lifetime Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Lifetime</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Games Played</div>
              <div className="font-bold">{formattedStats.gamesPlayed}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Total Stars</div>
              <div className="font-bold">{formattedStats.totalStars}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Longest Survival</div>
              <div className="font-bold">{formattedStats.longestTime}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Highest Combo</div>
              <div className="font-bold">{formattedStats.highestCombo}x</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Total Score</div>
              <div className="font-bold">{formattedStats.totalScore}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Achievements</div>
              <div className="font-bold">{unlockedAchievements.length} / {allAchievements.length}</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Achievements</h3>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {allAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-3 rounded border transition-all ${
                  achievement.unlocked
                    ? 'bg-yellow-500/20 border-yellow-500/50'
                    : 'bg-muted/20 border-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <img 
                    src={trophyImage} 
                    alt="Trophy" 
                    className={`w-6 h-6 object-contain flex-shrink-0 ${achievement.unlocked ? 'opacity-100' : 'opacity-40'}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-xs text-muted-foreground">{achievement.description}</div>
                    {!achievement.unlocked && (
                      <div className="text-xs mt-1">
                        Progress: {Math.round((achievement.progress / achievement.target) * 100)}%
                      </div>
                    )}
                  </div>
                  {achievement.unlocked && (
                    <div className="text-yellow-400 font-bold">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


import { Button } from './ui/button';
import trophyImage from '@/assets/trophy.webp';

interface StatsDisplayProps {
  sessionStats: SessionStats;
  statsManager: StatsManager;
  achievementSystem: AchievementSystem;
  onClose: () => void;
}

export const StatsDisplay = ({ 
  sessionStats, 
  statsManager, 
  achievementSystem,
  onClose 
}: StatsDisplayProps) => {
  const formattedStats = statsManager.getFormattedStats();
  const unlockedAchievements = achievementSystem.getUnlockedAchievements();
  const allAchievements = achievementSystem.getAchievements();

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-400 glow-blue">Statistics</h2>
          <Button onClick={onClose} variant="outline" size="sm">Close</Button>
        </div>

        {/* Session Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">This Session</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Time Survived</div>
              <div className="font-bold">{formatTime(sessionStats.survivalTime)}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Stars Collected</div>
              <div className="font-bold">{sessionStats.starsCollected}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Near Misses</div>
              <div className="font-bold">{sessionStats.nearMisses}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Max Combo</div>
              <div className="font-bold">{sessionStats.maxCombo}x</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Score</div>
              <div className="font-bold">{sessionStats.score.toLocaleString()}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Distance</div>
              <div className="font-bold">{Math.round(sessionStats.distanceTraveled).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Lifetime Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Lifetime</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Games Played</div>
              <div className="font-bold">{formattedStats.gamesPlayed}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Total Stars</div>
              <div className="font-bold">{formattedStats.totalStars}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Longest Survival</div>
              <div className="font-bold">{formattedStats.longestTime}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Highest Combo</div>
              <div className="font-bold">{formattedStats.highestCombo}x</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Total Score</div>
              <div className="font-bold">{formattedStats.totalScore}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground">Achievements</div>
              <div className="font-bold">{unlockedAchievements.length} / {allAchievements.length}</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Achievements</h3>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {allAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-3 rounded border transition-all ${
                  achievement.unlocked
                    ? 'bg-yellow-500/20 border-yellow-500/50'
                    : 'bg-muted/20 border-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <img 
                    src={trophyImage} 
                    alt="Trophy" 
                    className={`w-6 h-6 object-contain flex-shrink-0 ${achievement.unlocked ? 'opacity-100' : 'opacity-40'}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-xs text-muted-foreground">{achievement.description}</div>
                    {!achievement.unlocked && (
                      <div className="text-xs mt-1">
                        Progress: {Math.round((achievement.progress / achievement.target) * 100)}%
                      </div>
                    )}
                  </div>
                  {achievement.unlocked && (
                    <div className="text-yellow-400 font-bold">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};




