import { Planet, Particle } from '../game/types';

export interface GameStateSnapshot {
  planets: Planet[];
  particles: Particle[];
}

/**
 * Calculate star value based on current score
 */
export const getStarValue = (currentScore: number): number => {
  if (currentScore >= 5000) {
    return 1000; // Ship level 3
  } else if (currentScore >= 1500) {
    return 100; // Ship level 2
  } else {
    return 10; // Ship level 1
  }
};

/**
 * Create particle effects at a location
 */
export const createParticles = (
  x: number,
  y: number,
  color: string,
  count: number,
  particles: Particle[]
): void => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color
    });
  }
};

/**
 * Create explosion effect with blast force
 */
export const createExplosion = (
  x: number,
  y: number,
  blastRadius: number,
  force: number,
  gameState: GameStateSnapshot,
  excludeIndices: number[] = []
): void => {
  // Create explosion particles
  createParticles(x, y, "hsl(0, 100%, 70%)", 25, gameState.particles);
  createParticles(x, y, "hsl(30, 100%, 80%)", 20, gameState.particles);
  createParticles(x, y, "hsl(60, 100%, 90%)", 15, gameState.particles);
  
  // Apply blast force to nearby obstacles
  gameState.planets.forEach((planet, index) => {
    if (excludeIndices.includes(index)) return;
    
    const dx = planet.x - x;
    const dy = planet.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < blastRadius && dist > 0) {
      const normalX = dx / dist;
      const normalY = dy / dist;
      const blastForce = force * (1 - dist / blastRadius); // Force decreases with distance
      
      planet.vx += normalX * blastForce;
      planet.vy += normalY * blastForce;
      
      // Create impact particles on affected obstacles
      createParticles(planet.x, planet.y, "hsl(45, 100%, 60%)", 5, gameState.particles);
    }
  });
};


export interface GameStateSnapshot {
  planets: Planet[];
  particles: Particle[];
}

/**
 * Calculate star value based on current score
 */
export const getStarValue = (currentScore: number): number => {
  if (currentScore >= 5000) {
    return 1000; // Ship level 3
  } else if (currentScore >= 1500) {
    return 100; // Ship level 2
  } else {
    return 10; // Ship level 1
  }
};

/**
 * Create particle effects at a location
 */
export const createParticles = (
  x: number,
  y: number,
  color: string,
  count: number,
  particles: Particle[]
): void => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color
    });
  }
};

/**
 * Create explosion effect with blast force
 */
export const createExplosion = (
  x: number,
  y: number,
  blastRadius: number,
  force: number,
  gameState: GameStateSnapshot,
  excludeIndices: number[] = []
): void => {
  // Create explosion particles
  createParticles(x, y, "hsl(0, 100%, 70%)", 25, gameState.particles);
  createParticles(x, y, "hsl(30, 100%, 80%)", 20, gameState.particles);
  createParticles(x, y, "hsl(60, 100%, 90%)", 15, gameState.particles);
  
  // Apply blast force to nearby obstacles
  gameState.planets.forEach((planet, index) => {
    if (excludeIndices.includes(index)) return;
    
    const dx = planet.x - x;
    const dy = planet.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < blastRadius && dist > 0) {
      const normalX = dx / dist;
      const normalY = dy / dist;
      const blastForce = force * (1 - dist / blastRadius); // Force decreases with distance
      
      planet.vx += normalX * blastForce;
      planet.vy += normalY * blastForce;
      
      // Create impact particles on affected obstacles
      createParticles(planet.x, planet.y, "hsl(45, 100%, 60%)", 5, gameState.particles);
    }
  });
};




