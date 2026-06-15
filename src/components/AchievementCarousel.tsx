import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import trophyImage from '../assets/trophy.webp';
import { GAME_BALANCE } from '@/game/gameBalance';

export interface Achievement {
  id: string;
  name: string;
  threshold: number;
  description: string;
}

interface AchievementCarouselProps {
  highScore: number;
  nearMissCount?: number;
  repairsCollected?: number;
  shotsFired?: number;
}

// Define all achievements
const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'rookie', name: 'Rookie', threshold: GAME_BALANCE.upgrades.level2Score, description: '1,500+ pts' },
  { id: 'ace', name: 'Ace Pilot', threshold: GAME_BALANCE.upgrades.level3Score, description: '12,500+ pts' },
  { id: 'legend', name: 'Legend', threshold: 25000, description: '25,000+ pts' },
  { id: 'psychonaut', name: 'Psychonaut', threshold: 75000, description: '75,000+ pts' },
  { id: 'voidwizard', name: 'Void Wizard', threshold: 300000, description: '300,000+ pts' },
  { id: 'untouchable', name: "Can't Touch This", threshold: 50, description: '50 near misses' },
  { id: 'builtdifferent', name: 'Built Different', threshold: 50, description: '50 repairs' },
  { id: 'lockedin', name: 'Locked In', threshold: 5000, description: '5,000 shots fired' },
];

export const AchievementCarousel: React.FC<AchievementCarouselProps> = ({ 
  highScore, 
  nearMissCount = 0, 
  repairsCollected = 0, 
  shotsFired = 0 
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Chunk achievements into groups of 4
  const achievementChunks: Achievement[][] = [];
  for (let i = 0; i < ALL_ACHIEVEMENTS.length; i += 4) {
    achievementChunks.push(ALL_ACHIEVEMENTS.slice(i, i + 4));
  }

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi]
  );

  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi]
  );

  // Helper function to check if an achievement is unlocked
  const isAchievementUnlocked = (achievement: Achievement): boolean => {
    switch (achievement.id) {
      case 'rookie':
      case 'ace':
      case 'legend':
      case 'psychonaut':
      case 'voidwizard':
        return highScore >= achievement.threshold;
      case 'untouchable':
        return nearMissCount >= achievement.threshold;
      case 'builtdifferent':
        return repairsCollected >= achievement.threshold;
      case 'lockedin':
        return shotsFired >= achievement.threshold;
      default:
        return false;
    }
  };

  // Helper function to calculate achievement progress (0-100%)
  const getAchievementProgress = (achievement: Achievement): number => {
    let current = 0;
    
    switch (achievement.id) {
      case 'rookie':
      case 'ace':
      case 'legend':
      case 'psychonaut':
      case 'voidwizard':
        current = highScore;
        break;
      case 'untouchable':
        current = nearMissCount;
        break;
      case 'builtdifferent':
        current = repairsCollected;
        break;
      case 'lockedin':
        current = shotsFired;
        break;
    }
    
    const progress = Math.min((current / achievement.threshold) * 100, 100);
    return progress;
  };

  if (highScore === 0) return null;

  return (
    <div className="space-y-1.5 pt-2.5 border-t border-blue-500/20">
      <div className="text-sm text-muted-foreground">Achievements</div>
      
      {/* Carousel Container with Navigation */}
      <div className="relative">
        {/* Previous Arrow */}
        {scrollSnaps.length > 1 && (
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-600/50 flex items-center justify-center transition-all duration-300 ${
              canScrollPrev
                ? 'opacity-100 hover:bg-slate-700 hover:border-blue-500/50 cursor-pointer'
                : 'opacity-30 cursor-not-allowed'
            }`}
            aria-label="Previous page"
          >
            <span className="text-blue-400 text-lg">‹</span>
          </button>
        )}

        {/* Carousel */}
        <div className="overflow-hidden mx-6" ref={emblaRef}>
          <div className="flex">
            {achievementChunks.map((chunk, chunkIndex) => (
              <div
                key={chunkIndex}
                className="flex-[0_0_100%] min-w-0"
              >
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {chunk.map((achievement) => {
                    const isUnlocked = isAchievementUnlocked(achievement);
                    const progress = getAchievementProgress(achievement);
                    return (
                      <div
                        key={achievement.id}
                        className={`relative p-1.5 rounded border flex items-center gap-1.5 transition-all duration-300 overflow-hidden ${
                          isUnlocked
                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-500'
                        }`}
                      >
                        {/* Progress Bar Background */}
                        {!isUnlocked && progress > 0 && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        )}
                        
                        {/* Content (relative to sit above progress bar) */}
                        <img
                          src={trophyImage}
                          alt="Trophy"
                          className={`relative z-10 w-5 h-5 object-contain flex-shrink-0 transition-all duration-300 ${
                            isUnlocked ? 'opacity-100' : 'opacity-20 grayscale'
                          }`}
                        />
                        <div className="relative z-10 flex-1">
                          <div className="font-semibold">{achievement.name}</div>
                          <div className="text-xs opacity-70">{achievement.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Arrow */}
        {scrollSnaps.length > 1 && (
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-600/50 flex items-center justify-center transition-all duration-300 ${
              canScrollNext
                ? 'opacity-100 hover:bg-slate-700 hover:border-blue-500/50 cursor-pointer'
                : 'opacity-30 cursor-not-allowed'
            }`}
            aria-label="Next page"
          >
            <span className="text-blue-400 text-lg">›</span>
          </button>
        )}
      </div>

      {/* Pagination Dots */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-1 pt-1.5">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? 'bg-blue-400 w-6'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

