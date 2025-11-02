import { AmmoPowerUp } from '@/game/types';

export const AMMO_POWERUP_SPAWN_INTERVAL = 30000; // 30 seconds between spawns
export const UNLIMITED_AMMO_DURATION = 8000; // 8 seconds of unlimited ammo

/**
 * Create an ammo power-up at a random location
 */
export const createAmmoPowerUp = (
  canvasWidth: number,
  canvasHeight: number,
  mobileScaleFactor: number,
  shipX: number,
  shipY: number
): AmmoPowerUp => {
  // Spawn at a safe distance from ship
  const minDistance = 200 * mobileScaleFactor;
  const maxDistance = 400 * mobileScaleFactor;
  
  const angle = Math.random() * Math.PI * 2;
  const distance = minDistance + Math.random() * (maxDistance - minDistance);
  
  return {
    x: shipX + Math.cos(angle) * distance,
    y: shipY + Math.sin(angle) * distance,
    vx: 0,
    vy: 0,
    radius: 15 * mobileScaleFactor,
    collected: false,
    pulsePhase: 0,
  };
};

/**
 * Check if enough time has passed to spawn an ammo power-up
 */
export const shouldSpawnAmmoPowerUp = (
  now: number,
  lastSpawn: number,
  hasWeapon: boolean
): boolean => {
  if (!hasWeapon) return false; // Only spawn if player has weapon
  return now - lastSpawn > AMMO_POWERUP_SPAWN_INTERVAL;
};

/**
 * Render ammo power-up
 */
export const renderAmmoPowerUp = (
  ctx: CanvasRenderingContext2D,
  powerUp: AmmoPowerUp,
  image: HTMLImageElement | null
): void => {
  if (powerUp.collected) return;

  ctx.save();
  
  // Pulsing glow effect
  const pulseScale = 1 + Math.sin(powerUp.pulsePhase * 0.1) * 0.2;
  const glowIntensity = 0.5 + Math.sin(powerUp.pulsePhase * 0.15) * 0.5;
  
  ctx.shadowBlur = 20 * pulseScale;
  ctx.shadowColor = `rgba(192, 192, 192, ${glowIntensity})`; // Silver glow
  
  // Draw the image or fallback circle
  if (image && image.complete) {
    const size = powerUp.radius * 2.5 * pulseScale;
    ctx.drawImage(
      image,
      powerUp.x - size / 2,
      powerUp.y - size / 2,
      size,
      size
    );
  } else {
    // Fallback: draw a silver circle with ammo symbol
    ctx.fillStyle = `rgba(192, 192, 192, ${0.8 + glowIntensity * 0.2})`;
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.radius * pulseScale, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw "∞" symbol for unlimited ammo
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${powerUp.radius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('∞', powerUp.x, powerUp.y);
  }
  
  ctx.restore();
  
  // Update pulse phase
  powerUp.pulsePhase += 1;
};


