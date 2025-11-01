import { Planet, Scrap, ShipTrail, Ship } from '../game/types';
import { applyGravity, applyFriction, updateShip, wrapShipPosition, updatePlanets, updateShipTrails } from './physics';
import { createParticles, createExplosion } from './gameHelpers';
import { priorityToast } from './toastPriority';

interface UpdateGameStateParams {
  ship: Ship;
  planets: Planet[];
  scraps: Scrap[];
  shipTrails: ShipTrail[];
  nearMissTracker: Map<string, number>;
  canvasWidth: number;
  canvasHeight: number;
  delta: number;
  mobileScaleFactor: number;
  difficultyManager: any;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  highScore: number;
  planetIdCounter: number;
  createParticles: (x: number, y: number, color: string, count?: number) => void;
  createExplosion: (x: number, y: number, radius: number, force: number, excludeIndices: number[]) => void;
}

/**
 * Update ship physics, planets, scraps, and handle cleanup
 */
export const updateGameState = (params: UpdateGameStateParams): {
  planets: Planet[];
  scraps: Scrap[];
  shipTrails: ShipTrail[];
  planetIdCounter: number;
} => {
  const {
    ship,
    planets,
    scraps,
    shipTrails,
    nearMissTracker,
    canvasWidth,
    canvasHeight,
    delta,
    mobileScaleFactor,
    difficultyManager,
    setScore,
    highScore,
    planetIdCounter,
    createParticles,
    createExplosion,
  } = params;

  // Apply gravity and friction
  applyGravity(ship, planets);
  applyFriction(ship);

  // Update ship position, angle, and wrap around screen
  updateShip(ship, delta);
  wrapShipPosition(ship, canvasWidth, canvasHeight);

  // Update ship trails
  const velocityMagnitude = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  const updatedTrails = updateShipTrails(shipTrails, ship, velocityMagnitude);

  // Update planets (with near-miss tracker cleanup)
  let updatedPlanets = updatePlanets(planets, delta, canvasWidth, canvasHeight).filter(planet => {
    const isInBounds = planet.x > -100 && planet.x < canvasWidth + 100 &&
                      planet.y > -100 && planet.y < canvasHeight + 100;
    if (!isInBounds) {
      nearMissTracker.delete(planet.id);
    }
    return isInBounds;
  });

  // Check for oversized black holes that should disappear
  updatedPlanets = updatedPlanets.filter(planet => {
    if (planet.type === "blackhole") {
      const maxRadius = 150;
      const maxMass = 15000;
      
      if (planet.radius > maxRadius || planet.mass > maxMass) {
        // Black hole becomes unstable and disappears
        const megaBlastRadius = 200 + Math.random() * 100;
        const megaBlastForce = 8 + Math.random() * 4;
        
        // Create massive explosion effect
        createParticles(planet.x, planet.y, "hsl(280, 100%, 90%)", 60);
        createParticles(planet.x, planet.y, "hsl(300, 100%, 95%)", 50);
        createParticles(planet.x, planet.y, "hsl(320, 100%, 80%)", 40);
        createParticles(planet.x, planet.y, "hsl(60, 100%, 80%)", 30);
        createExplosion(planet.x, planet.y, megaBlastRadius, megaBlastForce, []);
        
        // Add score bonus for witnessing black hole collapse
        setScore(prev => {
          const newScore = prev + 500;
          const isNewHighScore = newScore > highScore;
          
          priorityToast("Black hole collapsed! +500 points", 500, { 
            duration: 3000,
            className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
          });
          
          return newScore;
        });
        
        nearMissTracker.delete(planet.id);
        return false;
      }
    }
    return true;
  });

  // Update scraps
  const updatedScraps = scraps.filter(scrap => {
    scrap.x += scrap.vx * delta;
    scrap.y += scrap.vy * delta;
    scrap.rotation += scrap.rotationSpeed * delta;
    scrap.lifespan -= delta;
    scrap.vx *= 0.995;
    scrap.vy *= 0.995;
    
    if (scrap.lifespan <= 0) {
      return false;
    }
    
    return scrap.x > -50 && scrap.x < canvasWidth + 50 &&
           scrap.y > -50 && scrap.y < canvasHeight + 50;
  });

  // Handle debris scrap spawning
  updatedPlanets.forEach((planet) => {
    if (planet.type === "debris") {
      if (!planet.lastScrapSpawn) {
        planet.lastScrapSpawn = Date.now();
      }
      
      const difficultyConfig = difficultyManager.getCurrentConfig();
      const baseScrapInterval = 5000 + Math.random() * 5000;
      const scrapSpawnInterval = baseScrapInterval / difficultyConfig.scrapSpawnMultiplier;
      
      if (Date.now() - planet.lastScrapSpawn > scrapSpawnInterval) {
        const scrapLifespan = 180 + Math.random() * 120;
        const scrap: Scrap = {
          x: planet.x + (Math.random() - 0.5) * 20,
          y: planet.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: (8 + Math.random() * 6) * mobileScaleFactor,
          lifespan: scrapLifespan,
          maxLifespan: scrapLifespan,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: 0.02 + Math.random() * 0.04
        };
        
        updatedScraps.push(scrap);
        planet.lastScrapSpawn = Date.now();
      }
    }
  });

  return {
    planets: updatedPlanets,
    scraps: updatedScraps,
    shipTrails: updatedTrails,
    planetIdCounter: planetIdCounter,
  };
};


import { createParticles, createExplosion } from './gameHelpers';
import { priorityToast } from './toastPriority';

interface UpdateGameStateParams {
  ship: Ship;
  planets: Planet[];
  scraps: Scrap[];
  shipTrails: ShipTrail[];
  nearMissTracker: Map<string, number>;
  canvasWidth: number;
  canvasHeight: number;
  delta: number;
  mobileScaleFactor: number;
  difficultyManager: any;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  highScore: number;
  planetIdCounter: number;
  createParticles: (x: number, y: number, color: string, count?: number) => void;
  createExplosion: (x: number, y: number, radius: number, force: number, excludeIndices: number[]) => void;
}

/**
 * Update ship physics, planets, scraps, and handle cleanup
 */
export const updateGameState = (params: UpdateGameStateParams): {
  planets: Planet[];
  scraps: Scrap[];
  shipTrails: ShipTrail[];
  planetIdCounter: number;
} => {
  const {
    ship,
    planets,
    scraps,
    shipTrails,
    nearMissTracker,
    canvasWidth,
    canvasHeight,
    delta,
    mobileScaleFactor,
    difficultyManager,
    setScore,
    highScore,
    planetIdCounter,
    createParticles,
    createExplosion,
  } = params;

  // Apply gravity and friction
  applyGravity(ship, planets);
  applyFriction(ship);

  // Update ship position, angle, and wrap around screen
  updateShip(ship, delta);
  wrapShipPosition(ship, canvasWidth, canvasHeight);

  // Update ship trails
  const velocityMagnitude = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  const updatedTrails = updateShipTrails(shipTrails, ship, velocityMagnitude);

  // Update planets (with near-miss tracker cleanup)
  let updatedPlanets = updatePlanets(planets, delta, canvasWidth, canvasHeight).filter(planet => {
    const isInBounds = planet.x > -100 && planet.x < canvasWidth + 100 &&
                      planet.y > -100 && planet.y < canvasHeight + 100;
    if (!isInBounds) {
      nearMissTracker.delete(planet.id);
    }
    return isInBounds;
  });

  // Check for oversized black holes that should disappear
  updatedPlanets = updatedPlanets.filter(planet => {
    if (planet.type === "blackhole") {
      const maxRadius = 150;
      const maxMass = 15000;
      
      if (planet.radius > maxRadius || planet.mass > maxMass) {
        // Black hole becomes unstable and disappears
        const megaBlastRadius = 200 + Math.random() * 100;
        const megaBlastForce = 8 + Math.random() * 4;
        
        // Create massive explosion effect
        createParticles(planet.x, planet.y, "hsl(280, 100%, 90%)", 60);
        createParticles(planet.x, planet.y, "hsl(300, 100%, 95%)", 50);
        createParticles(planet.x, planet.y, "hsl(320, 100%, 80%)", 40);
        createParticles(planet.x, planet.y, "hsl(60, 100%, 80%)", 30);
        createExplosion(planet.x, planet.y, megaBlastRadius, megaBlastForce, []);
        
        // Add score bonus for witnessing black hole collapse
        setScore(prev => {
          const newScore = prev + 500;
          const isNewHighScore = newScore > highScore;
          
          priorityToast("Black hole collapsed! +500 points", 500, { 
            duration: 3000,
            className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
          });
          
          return newScore;
        });
        
        nearMissTracker.delete(planet.id);
        return false;
      }
    }
    return true;
  });

  // Update scraps
  const updatedScraps = scraps.filter(scrap => {
    scrap.x += scrap.vx * delta;
    scrap.y += scrap.vy * delta;
    scrap.rotation += scrap.rotationSpeed * delta;
    scrap.lifespan -= delta;
    scrap.vx *= 0.995;
    scrap.vy *= 0.995;
    
    if (scrap.lifespan <= 0) {
      return false;
    }
    
    return scrap.x > -50 && scrap.x < canvasWidth + 50 &&
           scrap.y > -50 && scrap.y < canvasHeight + 50;
  });

  // Handle debris scrap spawning
  updatedPlanets.forEach((planet) => {
    if (planet.type === "debris") {
      if (!planet.lastScrapSpawn) {
        planet.lastScrapSpawn = Date.now();
      }
      
      const difficultyConfig = difficultyManager.getCurrentConfig();
      const baseScrapInterval = 5000 + Math.random() * 5000;
      const scrapSpawnInterval = baseScrapInterval / difficultyConfig.scrapSpawnMultiplier;
      
      if (Date.now() - planet.lastScrapSpawn > scrapSpawnInterval) {
        const scrapLifespan = 180 + Math.random() * 120;
        const scrap: Scrap = {
          x: planet.x + (Math.random() - 0.5) * 20,
          y: planet.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: (8 + Math.random() * 6) * mobileScaleFactor,
          lifespan: scrapLifespan,
          maxLifespan: scrapLifespan,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: 0.02 + Math.random() * 0.04
        };
        
        updatedScraps.push(scrap);
        planet.lastScrapSpawn = Date.now();
      }
    }
  });

  return {
    planets: updatedPlanets,
    scraps: updatedScraps,
    shipTrails: updatedTrails,
    planetIdCounter: planetIdCounter,
  };
};




