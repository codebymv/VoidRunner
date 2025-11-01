import { Ship, Planet } from '@/game/types';

/**
 * Find the nearest enemy to the ship for auto-targeting
 */
export const findNearestEnemy = (
  ship: Ship,
  planets: Planet[],
  maxRange: number = 400
): { planet: Planet; angle: number } | null => {
  let nearestPlanet: Planet | null = null;
  let nearestDistance = maxRange;
  let targetAngle = 0;

  planets.forEach(planet => {
    const dx = planet.x - ship.x;
    const dy = planet.y - ship.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPlanet = planet;
      targetAngle = Math.atan2(dy, dx);
    }
  });

  if (nearestPlanet) {
    return { planet: nearestPlanet, angle: targetAngle };
  }

  return null;
};

/**
 * Predict where to shoot based on target's movement
 */
export const calculateLeadShot = (
  ship: Ship,
  target: Planet,
  bulletSpeed: number
): number => {
  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Time for bullet to reach current target position
  const timeToTarget = distance / bulletSpeed;
  
  // Predict where target will be
  const predictedX = target.x + target.vx * timeToTarget * 16.67; // Assuming 60fps
  const predictedY = target.y + target.vy * timeToTarget * 16.67;
  
  // Calculate angle to predicted position
  const leadDx = predictedX - ship.x;
  const leadDy = predictedY - ship.y;
  
  return Math.atan2(leadDy, leadDx);
};

