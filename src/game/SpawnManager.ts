import { Planet, Star, HealthWrench, GameState } from './types';
import { DifficultyManager } from '../utils/difficultyConfig';

export class SpawnManager {
  constructor(
    private game: GameState,
    private difficultyManager: DifficultyManager,
    private mobileScaleFactor: number
  ) {}

  spawnPlanet(canvasWidth: number, canvasHeight: number): void {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: x = Math.random() * canvasWidth; y = -50; break;
      case 1: x = canvasWidth + 50; y = Math.random() * canvasHeight; break;
      case 2: x = Math.random() * canvasWidth; y = canvasHeight + 50; break;
      default: x = -50; y = Math.random() * canvasHeight;
    }

    const colors = ["hsl(180, 100%, 50%)", "hsl(320, 100%, 50%)", "hsl(280, 100%, 50%)"];
    
    const planetType = this.difficultyManager.getObstacleType();
    
    const planet: Planet = {
      id: `planet_${++this.game.planetIdCounter}`,
      x, y,
      vx: (canvasWidth / 2 - x) * 0.0005,
      vy: (canvasHeight / 2 - y) * 0.0005,
      radius: (32 + Math.random() * 25) * this.mobileScaleFactor,
      mass: 1000 + Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: planetType
    };

    // Configure planet based on type
    this.configurePlanetType(planet);

    this.game.planets.push(planet);
  }

  private configurePlanetType(planet: Planet): void {
    if (planet.type === "meteor") {
      planet.rotation = 0;
      planet.rotationSpeed = 0.005 + Math.random() * 0.015;
    } else if (planet.type === "planet2") {
      planet.vx *= 1.5;
      planet.vy *= 1.5;
      planet.rotation = 0;
      planet.rotationSpeed = 0.02 + Math.random() * 0.03;
      planet.radius = (26 + Math.random() * 18) * this.mobileScaleFactor;
      planet.mass = 800 + Math.random() * 1500;
    } else if (planet.type === "blackhole") {
      planet.vx *= 0.3;
      planet.vy *= 0.3;
      planet.rotation = 0;
      planet.rotationSpeed = 0.01 + Math.random() * 0.02;
      planet.radius = (42 + Math.random() * 30) * this.mobileScaleFactor;
      planet.mass = 2500 + Math.random() * 3000;
      planet.gravityMultiplier = 2.5 + Math.random() * 1.5;
      planet.color = "hsl(270, 50%, 20%)";
    } else if (planet.type === "debris") {
      planet.vx *= 0.8;
      planet.vy *= 0.8;
      planet.rotation = 0;
      planet.rotationSpeed = 0.003 + Math.random() * 0.007;
      planet.radius = (24 + Math.random() * 16) * this.mobileScaleFactor;
      planet.mass = 600 + Math.random() * 1000;
      planet.canBounce = true;
      planet.bounceCount = 0;
      planet.color = "hsl(30, 70%, 60%)";
    }
  }

  spawnStar(canvasWidth: number, canvasHeight: number): void {
    this.game.stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: 0, vy: 0,
      radius: 6 * this.mobileScaleFactor,
      collected: false
    });
  }

  spawnHealthWrench(canvasWidth: number, canvasHeight: number): void {
    let x, y;
    do {
      x = Math.random() * canvasWidth;
      y = Math.random() * canvasHeight;
    } while (Math.sqrt((x - this.game.ship.x) ** 2 + (y - this.game.ship.y) ** 2) < 150);

    this.game.healthWrenches.push({
      x, y,
      vx: 0, vy: 0,
      radius: 20 * this.mobileScaleFactor,
      collected: false,
      pulsePhase: 0
    });
  }

  shouldSpawnPlanet(now: number, difficulty: number): boolean {
    const basePlanetInterval = 2000 / difficulty;
    const intervals = this.difficultyManager.getSpawnIntervals(basePlanetInterval, 3000);
    return now - this.game.lastPlanetSpawn > intervals.planetInterval;
  }

  shouldSpawnStar(now: number): boolean {
    const baseStarInterval = 3000;
    const intervals = this.difficultyManager.getSpawnIntervals(2000, baseStarInterval);
    return now - this.game.lastStarSpawn > intervals.starInterval;
  }

  shouldSpawnHealthWrench(now: number): boolean {
    const gameRunTime = now - this.game.gameStartTime;
    return gameRunTime > 30000 && now - this.game.lastHealthWrenchSpawn > 35000 && Math.random() < 0.04;
  }

  updateSpawnTimers(now: number): void {
    // Update timers after spawning
    // This is called by the game loop after checking spawn conditions
  }
}

