import { DifficultyManager } from './difficultyConfig';
import { Planet, Star, HealthWrench } from '../game/types';

/**
 * Create a planet spawner function
 */
export const createPlanetSpawner = (
  canvas: HTMLCanvasElement,
  mobileScaleFactor: number,
  difficultyManager: DifficultyManager,
  planetIdCounter: number
) => {
  return (): Planet & { id: string } => {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: x = Math.random() * canvas.width; y = -50; break;
      case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
      case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
      default: x = -50; y = Math.random() * canvas.height;
    }

    const colors = ["hsl(180, 100%, 50%)", "hsl(320, 100%, 50%)", "hsl(280, 100%, 50%)"];
    const planetType = difficultyManager.getObstacleType();

    const planet: Planet & { id: string } = {
      id: `planet_${planetIdCounter}`,
      x, y,
      vx: (canvas.width / 2 - x) * 0.0005,
      vy: (canvas.height / 2 - y) * 0.0005,
      radius: (32 + Math.random() * 25) * mobileScaleFactor,
      mass: 1000 + Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: planetType
    };

    // Configure planet based on type
    if (planetType === "meteor") {
      planet.rotation = 0;
      planet.rotationSpeed = 0.005 + Math.random() * 0.015;
    } else if (planetType === "planet2") {
      planet.vx *= 1.5;
      planet.vy *= 1.5;
      planet.rotation = 0;
      planet.rotationSpeed = 0.02 + Math.random() * 0.03;
      planet.radius = (26 + Math.random() * 18) * mobileScaleFactor;
      planet.mass = 800 + Math.random() * 1500;
    } else if (planetType === "blackhole") {
      planet.vx *= 0.3;
      planet.vy *= 0.3;
      planet.rotation = 0;
      planet.rotationSpeed = 0.01 + Math.random() * 0.02;
      planet.radius = (42 + Math.random() * 30) * mobileScaleFactor;
      planet.mass = 2500 + Math.random() * 3000;
      planet.gravityMultiplier = 2.5 + Math.random() * 1.5;
      planet.color = "hsl(270, 50%, 20%)";
    } else if (planetType === "debris") {
      planet.vx *= 0.8;
      planet.vy *= 0.8;
      planet.rotation = 0;
      planet.rotationSpeed = 0.003 + Math.random() * 0.007;
      planet.radius = (24 + Math.random() * 16) * mobileScaleFactor;
      planet.mass = 600 + Math.random() * 1000;
      planet.canBounce = true;
      planet.bounceCount = 0;
      planet.color = "hsl(30, 70%, 60%)";
    }

    return planet;
  };
};

/**
 * Create a star spawner function
 */
export const createStarSpawner = (
  canvas: HTMLCanvasElement,
  mobileScaleFactor: number
) => {
  return (): Star => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
    radius: 6 * mobileScaleFactor,
    collected: false
  });
};

/**
 * Create a health wrench spawner function
 */
export const createHealthWrenchSpawner = (
  canvas: HTMLCanvasElement,
  mobileScaleFactor: number,
  shipX: number,
  shipY: number
) => {
  return (): HealthWrench => {
    // Spawn away from ship to avoid instant collection
    let x, y;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    } while (Math.sqrt((x - shipX) ** 2 + (y - shipY) ** 2) < 150);

    return {
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 20 * mobileScaleFactor,
      collected: false,
      pulsePhase: 0
    };
  };
};


/**
 * Create a planet spawner function
 */
export const createPlanetSpawner = (
  canvas: HTMLCanvasElement,
  mobileScaleFactor: number,
  difficultyManager: DifficultyManager,
  planetIdCounter: number
) => {
  return (): Planet & { id: string } => {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: x = Math.random() * canvas.width; y = -50; break;
      case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
      case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
      default: x = -50; y = Math.random() * canvas.height;
    }

    const colors = ["hsl(180, 100%, 50%)", "hsl(320, 100%, 50%)", "hsl(280, 100%, 50%)"];
    const planetType = difficultyManager.getObstacleType();

    const planet: Planet & { id: string } = {
      id: `planet_${planetIdCounter}`,
      x, y,
      vx: (canvas.width / 2 - x) * 0.0005,
      vy: (canvas.height / 2 - y) * 0.0005,
      radius: (32 + Math.random() * 25) * mobileScaleFactor,
      mass: 1000 + Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: planetType
    };

    // Configure planet based on type
    if (planetType === "meteor") {
      planet.rotation = 0;
      planet.rotationSpeed = 0.005 + Math.random() * 0.015;
    } else if (planetType === "planet2") {
      planet.vx *= 1.5;
      planet.vy *= 1.5;
      planet.rotation = 0;
      planet.rotationSpeed = 0.02 + Math.random() * 0.03;
      planet.radius = (26 + Math.random() * 18) * mobileScaleFactor;
      planet.mass = 800 + Math.random() * 1500;
    } else if (planetType === "blackhole") {
      planet.vx *= 0.3;
      planet.vy *= 0.3;
      planet.rotation = 0;
      planet.rotationSpeed = 0.01 + Math.random() * 0.02;
      planet.radius = (42 + Math.random() * 30) * mobileScaleFactor;
      planet.mass = 2500 + Math.random() * 3000;
      planet.gravityMultiplier = 2.5 + Math.random() * 1.5;
      planet.color = "hsl(270, 50%, 20%)";
    } else if (planetType === "debris") {
      planet.vx *= 0.8;
      planet.vy *= 0.8;
      planet.rotation = 0;
      planet.rotationSpeed = 0.003 + Math.random() * 0.007;
      planet.radius = (24 + Math.random() * 16) * mobileScaleFactor;
      planet.mass = 600 + Math.random() * 1000;
      planet.canBounce = true;
      planet.bounceCount = 0;
      planet.color = "hsl(30, 70%, 60%)";
    }

    return planet;
  };
};

/**
 * Create a star spawner function
 */
export const createStarSpawner = (
  canvas: HTMLCanvasElement,
  mobileScaleFactor: number
) => {
  return (): Star => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
    radius: 6 * mobileScaleFactor,
    collected: false
  });
};

/**
 * Create a health wrench spawner function
 */
export const createHealthWrenchSpawner = (
  canvas: HTMLCanvasElement,
  mobileScaleFactor: number,
  shipX: number,
  shipY: number
) => {
  return (): HealthWrench => {
    // Spawn away from ship to avoid instant collection
    let x, y;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    } while (Math.sqrt((x - shipX) ** 2 + (y - shipY) ** 2) < 150);

    return {
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 20 * mobileScaleFactor,
      collected: false,
      pulsePhase: 0
    };
  };
};
