// Core game object interface
export interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

// Planet/Obstacle types
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

// Collectible star
export interface Star extends GameObject {
  collected: boolean;
  pulsePhase?: number; // For visual pulsing effect
}

// Ship trail effect
export interface ShipTrail {
  x: number;
  y: number;
  life: number;
}

// Visual particle effect
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// Scrap debris collectible
export interface Scrap extends GameObject {
  lifespan: number; // Time until scrap disappears (in frames)
  maxLifespan: number; // Original lifespan for fade effect
  rotation: number;
  rotationSpeed: number;
}

// Health pickup
export interface HealthWrench extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

// Player bullet
export interface Bullet extends GameObject {
  lifetime: number; // How long the bullet has been alive (for fade/despawn)
  maxLifetime: number; // Maximum bullet lifetime
  isPurple?: boolean; // Purple bullets for level 3 ship (more damage)
}

// Ammo power-up
export interface AmmoPowerUp extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

// Void Wipe power-up (clears all obstacles)
export interface VoidWipe extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

// Ship object
export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

// Complete game state
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
  voidWipes: VoidWipe[];
  keys: Record<string, boolean>;
  mouse: { x: number; y: number };
  lastPlanetSpawn: number;
  lastStarSpawn: number;
  lastAmmoPowerUpSpawn: number;
  lastHealthWrenchSpawn: number;
  lastVoidWipeSpawn: number;
  gameStartTime: number;
  difficulty: number;
  invulnerable: number;
  shake: number;
  nearMissTracker: Map<string, number>; // Track near-miss cooldowns for each planet
  planetIdCounter: number; // Counter for generating unique planet IDs
  comboCount: number; // Track consecutive scoring actions
  lastComboTime: number; // Track when last combo action happened
  score: number; // Current player score
  shipLevel: 1 | 2 | 3; // Ship upgrade level
}

// Input state for the game engine
export interface GameInput {
  keys: Record<string, boolean>;
  joystick: { x: number; y: number };
  mouse: { x: number; y: number };
}

// Callbacks for the game engine to communicate with React
export interface GameEngineCallbacks {
  onScoreChange: (newScore: number) => void;
  onHealthChange: (newHealth: number) => void;
  onShieldChange: (newShield: number) => void;
  onGameOver: () => void;
  onShipUpgrade: (level: 2 | 3) => void;
  onAmmoChange: (newAmmo: number) => void;
  onRechargeStateChange: (isRecharging: boolean) => void;
  onUnlimitedAmmoChange: (isUnlimited: boolean, endTime: number) => void;
  onShowToast: (message: string, points: number, options?: any) => void;
  onShowPickupNotification: (message: string, className: string) => void;
  onPlaySound: (soundName: string) => void;
  onHealthGlow: (duration: number) => void;
  onCreateParticles: (x: number, y: number, color: string, count: number) => void;
  onCreateExplosion: (x: number, y: number, blastRadius: number, force: number, excludeIndices: number[]) => void;
}
