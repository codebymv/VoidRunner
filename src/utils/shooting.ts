import { Bullet, Ship, Planet, Scrap } from '@/game/types';

export const BULLET_SPEED = 15; // Bullet speed
export const BULLET_LIFETIME = 60; // Frames before bullet disappears
export const FIRE_RATE = 100; // Milliseconds between shots
export const AUTO_FIRE_RATE = 150; // Milliseconds between auto shots (faster for level 3)
export const AMMO_DRAIN_RATE = 4; // Ammo consumed per shot (increased for faster depletion)
export const RECHARGE_TIME = 4000; // 4 seconds recharge time
export const RECHARGE_AMOUNT = 100; // Full recharge

/**
 * Create a bullet projectile
 */
export const createBullet = (ship: Ship, isLevel3: boolean = false, targetAngle?: number): Bullet => {
  // Calculate bullet starting position (at ship's front)
  const bulletStartOffset = ship.radius + 5;
  const angle = targetAngle !== undefined ? targetAngle : ship.angle;
  const bulletX = ship.x + Math.cos(angle) * bulletStartOffset;
  const bulletY = ship.y + Math.sin(angle) * bulletStartOffset;

  return {
    x: bulletX,
    y: bulletY,
    vx: Math.cos(angle) * BULLET_SPEED + ship.vx * 0.5, // Inherit some ship velocity
    vy: Math.sin(angle) * BULLET_SPEED + ship.vy * 0.5,
    radius: 3,
    lifetime: 0,
    maxLifetime: BULLET_LIFETIME,
    isPurple: isLevel3, // Purple bullets for level 3
  };
};

/**
 * Update bullets - move and age them
 */
export const updateBullets = (bullets: Bullet[], delta: number): Bullet[] => {
  return bullets
    .map(bullet => ({
      ...bullet,
      x: bullet.x + bullet.vx * delta,
      y: bullet.y + bullet.vy * delta,
      lifetime: bullet.lifetime + 1,
    }))
    .filter(bullet => bullet.lifetime < bullet.maxLifetime);
};

/**
 * Check if bullet hits a planet/obstacle (optimized with squared distance)
 */
export const checkBulletPlanetCollision = (
  bullet: Bullet,
  planet: Planet
): boolean => {
  const dx = bullet.x - planet.x;
  const dy = bullet.y - planet.y;
  const distSq = dx * dx + dy * dy;
  const minDist = bullet.radius + planet.radius;
  return distSq < minDist * minDist;
};

/**
 * Check if bullet hits scrap (optimized with squared distance)
 */
export const checkBulletScrapCollision = (
  bullet: Bullet,
  scrap: Scrap
): boolean => {
  const dx = bullet.x - scrap.x;
  const dy = bullet.y - scrap.y;
  const distSq = dx * dx + dy * dy;
  const minDist = bullet.radius + scrap.radius;
  return distSq < minDist * minDist;
};

/**
 * Calculate damage to obstacle based on type and bullet level
 */
export const calculateDamage = (planetType: string, isPurple: boolean = false): number => {
  const multiplier = isPurple ? 1.5 : 1; // Purple bullets do 50% more damage
  
  switch (planetType) {
    case 'debris':
      return 20 * multiplier; // Debris dies fast
    case 'meteor':
      return 10 * multiplier; // Meteors take moderate damage
    case 'planet2':
      return 8 * multiplier; // Planets are tougher
    case 'blackhole':
      return 5 * multiplier; // Black holes are very tough
    default:
      return 10 * multiplier;
  }
};

/**
 * Get max health for obstacle type
 */
export const getMaxHealth = (planetType: string): number => {
  switch (planetType) {
    case 'debris':
      return 40;
    case 'meteor':
      return 80;
    case 'planet2':
      return 120;
    case 'blackhole':
      return 200;
    default:
      return 100;
  }
};

