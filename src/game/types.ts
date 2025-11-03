// Game object type definitions

export interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Planet extends GameObject {
  id: string; // Unique identifier for tracking
  mass: number;
  color: string;
  type: "debris" | "meteor" | "planet2" | "blackhole";
  rotation?: number;
  rotationSpeed?: number;
  gravityMultiplier?: number; // Enhanced gravity for blackholes
  canBounce?: boolean; // Debris can bounce off other obstacles
  bounceCount?: number; // Track number of bounces for debris
  lastScrapSpawn?: number; // Track last scrap spawn time for debris
  health?: number; // Health for shooting mechanics
  maxHealth?: number; // Maximum health
  flashUntil?: number; // Timestamp for white flash effect when damaged
}

export interface Star extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

export interface ShipTrail {
  x: number;
  y: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface Scrap extends GameObject {
  lifespan: number; // Time until scrap disappears (in frames)
  maxLifespan: number; // Original lifespan for fade effect
  rotation: number;
  rotationSpeed: number;
}

export interface HealthWrench extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

export interface Ship extends GameObject {
  angle: number;
}

export interface Bullet extends GameObject {
  lifetime: number; // How long the bullet has been alive (for fade/despawn)
  maxLifetime: number; // Maximum bullet lifetime
  isPurple?: boolean; // Purple bullets for level 3 ship (more damage)
}

export interface AmmoPowerUp extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

export interface GameState {
  ship: Ship;
  planets: Planet[];
  stars: Star[];
  scraps: Scrap[];
  healthWrenches: HealthWrench[];
  particles: Particle[];
  shipTrails: ShipTrail[];
  bullets: Bullet[];
  ammoPowerUps: AmmoPowerUp[];
  keys: Record<string, boolean>;
  mouse: { x: number; y: number };
  lastPlanetSpawn: number;
  lastStarSpawn: number;
  lastHealthWrenchSpawn: number;
  lastAmmoPowerUpSpawn: number;
  gameStartTime: number;
  difficulty: number;
  invulnerable: number;
  shake: number;
  nearMissTracker: Map<string, number>; // Track near-miss cooldowns for each planet
  planetIdCounter: number; // Counter for generating unique planet IDs
}

export type GameStateType = "menu" | "playing" | "paused" | "gameover";
