import type { Planet } from './types';

type ObstacleType = Planet['type'];

export const GAME_BALANCE = {
  upgrades: {
    level2Score: 1500,
    level3Score: 12500,
    hardUnlockScore: 12500,
  },

  spawning: {
    baseObstacleIntervalMs: 2000,
    baseStarIntervalMs: 3000,
    earlyGameScore: 1000,
    midGameScore: 5000,
    earlyDebrisMinChance: 0.15,
    midMeteorBonusChance: 0.1,
  },

  pickups: {
    healthWrench: {
      unlockMs: 30000,
      intervalMs: 35000,
      chancePerFrame: 0.04,
      healAmount: 0.75,
      score: 150,
      glowMs: 1000,
    },
    ammoPowerUp: {
      unlockMs: 20000,
      intervalMs: 25000,
      chancePerFrame: 0.05,
      score: 500,
    },
    voidWipe: {
      minScore: 2500,
      unlockMs: 45000,
      minObstacleCount: 6,
      intervalMs: 60000,
      chancePerFrame: 0.02,
      respiteMs: 3000,
      score: 1000,
      radius: 22,
    },
    debrisScrap: {
      baseIntervalMs: 5000,
      randomIntervalMs: 5000,
    },
  },

  scoring: {
    starByShipLevel: {
      level1: 10,
      level2: 100,
      level3: 1000,
    },
    destroyedObstacle: {
      debris: 100,
      meteor: 150,
      planet2: 200,
      blackhole: 500,
    } satisfies Record<ObstacleType, number>,
    scrapCollected: 25,
    blackHoleCollapsed: 500,
  },

  combat: {
    bulletDamage: {
      debris: 30,
      meteor: 25,
      planet2: 20,
      blackhole: 15,
    } satisfies Record<ObstacleType, number>,
    purpleBulletDamageMultiplier: 1.5,
    obstacleHealth: {
      debris: 75,
      meteor: 100,
      planet2: 150,
      blackhole: 300,
    } satisfies Record<ObstacleType, number>,
  },
} as const;
