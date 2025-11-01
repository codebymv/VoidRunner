export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  name: string;
  displayName: string;
  description: string;
  // Spawn rate multipliers
  starSpawnMultiplier: number;
  scrapSpawnMultiplier: number;
  obstacleSpawnMultiplier: number;
  // Obstacle type distribution adjustments
  obstacleDistribution: {
    debris: number;    // 0-1 probability
    meteor: number;    // 0-1 probability  
    planet2: number;   // 0-1 probability
    blackhole: number; // 0-1 probability (remaining probability)
  };
  // Score threshold to auto-advance to next difficulty
  autoAdvanceThreshold?: number;
  nextDifficulty?: DifficultyLevel;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    name: 'easy',
    displayName: 'Easy',
    description: 'Fewer obstacles, more forgiving',
    starSpawnMultiplier: 0.8,      // 20% fewer stars
    scrapSpawnMultiplier: 0.8,     // 20% fewer scraps
    obstacleSpawnMultiplier: 0.7,  // 30% fewer obstacles
    obstacleDistribution: {
      debris: 0.35,    // 35% debris (more scraps)
      meteor: 0.25,    // 25% meteors
      planet2: 0.25,   // 25% planets
      blackhole: 0.15  // 15% blackholes
    },
    autoAdvanceThreshold: 100000,
    nextDifficulty: 'medium'
  },
  
  medium: {
    name: 'medium',
    displayName: 'Medium',
    description: 'Balanced gameplay, can get crazy',
    starSpawnMultiplier: 1.0,      // Normal star spawn rate
    scrapSpawnMultiplier: 1.0,     // Normal scrap spawn rate
    obstacleSpawnMultiplier: 1.0,  // Normal obstacle spawn rate
    obstacleDistribution: {
      debris: 0.25,    // 25% debris (current baseline)
      meteor: 0.30,    // 30% meteors
      planet2: 0.30,   // 30% planets
      blackhole: 0.15  // 15% blackholes
    },
    autoAdvanceThreshold: 100000,
    nextDifficulty: 'hard'
  },
  
  hard: {
    name: 'hard',
    displayName: 'Hard',
    description: 'More obstacles and faster, RIP',
    starSpawnMultiplier: 1.3,      // 30% more stars (more points available)
    scrapSpawnMultiplier: 1.3,     // 30% more scraps
    obstacleSpawnMultiplier: 1.5,  // 50% more obstacles
    obstacleDistribution: {
      debris: 0.20,    // 20% debris (fewer scraps relative to obstacles)
      meteor: 0.25,    // 25% meteors
      planet2: 0.35,   // 35% planets (more dangerous)
      blackhole: 0.20  // 20% blackholes (much more dangerous)
    }
    // No auto-advance from hard difficulty
  }
};

export class DifficultyManager {
  private currentDifficulty: DifficultyLevel = 'medium';
  private manualOverride: boolean = false;
  
  constructor(initialDifficulty: DifficultyLevel = 'medium') {
    this.currentDifficulty = initialDifficulty;
  }
  
  getCurrentDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }
  
  isManuallySet(): boolean {
    return this.manualOverride;
  }
  
  getCurrentConfig(): DifficultyConfig {
    return DIFFICULTY_CONFIGS[this.currentDifficulty];
  }
  
  // Manual difficulty change (player choice)
  setDifficulty(difficulty: DifficultyLevel, isManual: boolean = true): void {
    this.currentDifficulty = difficulty;
    this.manualOverride = isManual;
  }
  
  // Check if score threshold triggers auto-advance
  checkAutoAdvance(score: number): { shouldAdvance: boolean; newDifficulty?: DifficultyLevel } {
    if (this.manualOverride) {
      return { shouldAdvance: false }; // Don't auto-advance if manually set
    }
    
    const config = this.getCurrentConfig();
    if (config.autoAdvanceThreshold && config.nextDifficulty && score >= config.autoAdvanceThreshold) {
      return {
        shouldAdvance: true,
        newDifficulty: config.nextDifficulty
      };
    }
    
    return { shouldAdvance: false };
  }
  
  // Apply auto-advance
  autoAdvance(newDifficulty: DifficultyLevel): void {
    this.currentDifficulty = newDifficulty;
    // Don't set manual override for auto-advances
  }
  
  // Reset manual override (useful for new games)
  resetManualOverride(): void {
    this.manualOverride = false;
  }
  
  // Get spawn intervals based on current difficulty
  getSpawnIntervals(basePlanetInterval: number, baseStarInterval: number) {
    const config = this.getCurrentConfig();
    return {
      planetInterval: basePlanetInterval / config.obstacleSpawnMultiplier,
      starInterval: baseStarInterval / config.starSpawnMultiplier
    };
  }
  
  // Get obstacle type based on current difficulty distribution
  getObstacleType(): "debris" | "meteor" | "planet2" | "blackhole" {
    const config = this.getCurrentConfig();
    const dist = config.obstacleDistribution;
    const random = Math.random();
    
    if (random < dist.debris) {
      return "debris";
    } else if (random < dist.debris + dist.meteor) {
      return "meteor";
    } else if (random < dist.debris + dist.meteor + dist.planet2) {
      return "planet2";
    } else {
      return "blackhole";
    }
  }
}