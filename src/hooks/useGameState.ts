import { useRef, useMemo } from 'react';
import { Ship, Planet, Star, Scrap, HealthWrench, Particle, ShipTrail } from '../game/types';
import { useMobile } from './useMobile';

interface GameStateData {
  ship: Ship;
  planets: Planet[];
  stars: Star[];
  scraps: Scrap[];
  healthWrenches: HealthWrench[];
  particles: Particle[];
  shipTrails: ShipTrail[];
  keys: Record<string, boolean>;
  mouse: { x: number; y: number };
  lastPlanetSpawn: number;
  lastStarSpawn: number;
  lastHealthWrenchSpawn: number;
  gameStartTime: number;
  difficulty: number;
  invulnerable: number;
  shake: number;
  nearMissTracker: Map<string, number>;
  planetIdCounter: number;
}

export const useGameState = (canvasWidth: number, canvasHeight: number) => {
  const { isMobile } = useMobile();
  const mobileScaleFactor = isMobile ? 0.75 : 1.0;

  const gameStateRef = useRef<GameStateData>({
    ship: { 
      x: canvasWidth / 2, 
      y: canvasHeight / 2, 
      vx: 0, 
      vy: 0, 
      radius: 28 * mobileScaleFactor, 
      angle: 0 
    },
    planets: [],
    stars: [],
    scraps: [],
    healthWrenches: [],
    particles: [],
    shipTrails: [],
    keys: {},
    mouse: { x: 0, y: 0 },
    lastPlanetSpawn: 0,
    lastStarSpawn: 0,
    lastHealthWrenchSpawn: 0,
    gameStartTime: 0,
    difficulty: 1,
    invulnerable: 0,
    shake: 0,
    nearMissTracker: new Map<string, number>(),
    planetIdCounter: 0,
  });

  const resetGameState = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const game = gameStateRef.current;
      game.ship.x = canvas.width / 2;
      game.ship.y = canvas.height / 2;
      game.ship.vx = 0;
      game.ship.vy = 0;
      game.planets = [];
      game.stars = [];
      game.scraps = [];
      game.healthWrenches = [];
      game.particles = [];
      game.shipTrails = [];
      game.difficulty = 1;
      game.invulnerable = 180;
      game.nearMissTracker.clear();
      game.planetIdCounter = 0;
      game.gameStartTime = Date.now();
    };
  }, []);

  return {
    gameStateRef,
    resetGameState,
    mobileScaleFactor,
  };
};

import { useMobile } from './useMobile';

interface GameStateData {
  ship: Ship;
  planets: Planet[];
  stars: Star[];
  scraps: Scrap[];
  healthWrenches: HealthWrench[];
  particles: Particle[];
  shipTrails: ShipTrail[];
  keys: Record<string, boolean>;
  mouse: { x: number; y: number };
  lastPlanetSpawn: number;
  lastStarSpawn: number;
  lastHealthWrenchSpawn: number;
  gameStartTime: number;
  difficulty: number;
  invulnerable: number;
  shake: number;
  nearMissTracker: Map<string, number>;
  planetIdCounter: number;
}

export const useGameState = (canvasWidth: number, canvasHeight: number) => {
  const { isMobile } = useMobile();
  const mobileScaleFactor = isMobile ? 0.75 : 1.0;

  const gameStateRef = useRef<GameStateData>({
    ship: { 
      x: canvasWidth / 2, 
      y: canvasHeight / 2, 
      vx: 0, 
      vy: 0, 
      radius: 28 * mobileScaleFactor, 
      angle: 0 
    },
    planets: [],
    stars: [],
    scraps: [],
    healthWrenches: [],
    particles: [],
    shipTrails: [],
    keys: {},
    mouse: { x: 0, y: 0 },
    lastPlanetSpawn: 0,
    lastStarSpawn: 0,
    lastHealthWrenchSpawn: 0,
    gameStartTime: 0,
    difficulty: 1,
    invulnerable: 0,
    shake: 0,
    nearMissTracker: new Map<string, number>(),
    planetIdCounter: 0,
  });

  const resetGameState = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const game = gameStateRef.current;
      game.ship.x = canvas.width / 2;
      game.ship.y = canvas.height / 2;
      game.ship.vx = 0;
      game.ship.vy = 0;
      game.planets = [];
      game.stars = [];
      game.scraps = [];
      game.healthWrenches = [];
      game.particles = [];
      game.shipTrails = [];
      game.difficulty = 1;
      game.invulnerable = 180;
      game.nearMissTracker.clear();
      game.planetIdCounter = 0;
      game.gameStartTime = Date.now();
    };
  }, []);

  return {
    gameStateRef,
    resetGameState,
    mobileScaleFactor,
  };
};



