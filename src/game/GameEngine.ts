import type { 
  GameState, 
  GameInput, 
  GameEngineCallbacks,
  Ship,
  Planet,
  Star,
  Scrap,
  HealthWrench,
  Particle,
  ShipTrail,
  Bullet,
  AmmoPowerUp,
  VoidWipe
} from './types';
import { ParticlePool, ANGLE_LUT } from '../utils/ParticlePool';
import { createBullet, FIRE_RATE, AUTO_FIRE_RATE, AMMO_DRAIN_RATE, BULLET_SPEED } from '@/utils/shooting';
import { findNearestEnemy, calculateLeadShot } from '@/utils/autoTargeting';
import { SpatialGrid } from '../utils/SpatialGrid';
import { DIFFICULTY_CONFIGS, type DifficultyConfig } from '../utils/difficultyConfig';
import { GAME_BALANCE } from './gameBalance';

/**
 * GameEngine - Headless game logic engine
 * 
 * This class manages all game state and logic without any dependency on React or rendering.
 * It follows the Single Responsibility Principle by focusing solely on game mechanics.
 * 
 * ## Responsibilities:
 * - Physics simulation (gravity, friction, movement)
 * - Collision detection (ship, bullets, obstacles, collectibles)
 * - Entity management (planets, stars, bullets, particles, etc.)
 * - Scoring system with combo multipliers
 * - Ship upgrade progression (Level 1 → 2 → 3)
 * - Spawning systems (obstacles, collectibles, power-ups)
 * - Input processing (keyboard, joystick)
 * 
 * ## Public API:
 * - `constructor(width, height, scaleFactor, callbacks)` - Initialize the engine
 * - `getState()` - Get read-only game state for rendering
 * - `update(delta)` - Main game loop update
 * - `reset()` - Reset game to initial state
 * - `updateInput(input)` - Update keyboard/mouse input state
 * - `processInput(joystick, isMobile)` - Process input and apply ship thrust
 * 
 * ## Communication:
 * The engine communicates with the UI layer via callbacks for:
 * - Score changes, health/shield updates, game over events
 * - Ship upgrades, ammo changes, power-up activations
 * - Toast notifications, sound effects, visual effects
 * 
 * This separation allows the game logic to be:
 * - Testable without React
 * - Portable to other platforms/frameworks
 * - Easier to maintain and debug
 */
export class GameEngine {
  // Game state
  private state: GameState;
  
  // Callbacks to communicate with React
  public callbacks: GameEngineCallbacks;
  
  // Particle pool for optimized particle management
  private particlePool: ParticlePool;
  
  // Spatial grid for optimized collision detection
  private spatialGrid: SpatialGrid;
  
  // Sound rate limiting (prevents audio overload in late game)
  private lastBlackholeAbsorbSound: number = 0;
  private BLACKHOLE_SOUND_COOLDOWN: number = 400; // 400ms between sounds
  
  private lastDebrisBounceSound: number = 0;
  private DEBRIS_BOUNCE_COOLDOWN: number = 300; // 300ms between sounds
  
  private lastMeteorCollisionSound: number = 0;
  private METEOR_COLLISION_COOLDOWN: number = 300; // 300ms between sounds
  
  // Weapon firing timers
  private lastShotTime: number = 0;
  private lastAutoShotTime: number = 0;
  
  private lastExplosionSound: number = 0;
  private EXPLOSION_COOLDOWN: number = 200; // 200ms between sounds
  
  private lastStarAcquireSound: number = 0;
  private STAR_ACQUIRE_COOLDOWN: number = 100; // 100ms between sounds (frequent pickup)
  
  // Configuration
  private canvasWidth: number;
  private canvasHeight: number;
  private mobileScaleFactor: number;
  private difficultyConfig: DifficultyConfig = DIFFICULTY_CONFIGS.medium;
  private lastVoidWipeCollected: number = 0;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    mobileScaleFactor: number,
    callbacks: GameEngineCallbacks
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.mobileScaleFactor = mobileScaleFactor;
    this.callbacks = callbacks;

    // Initialize particle pool (max 500 particles for performance)
    this.particlePool = new ParticlePool(500);

    // Initialize spatial grid (cell size = 200px, roughly 2x largest object radius)
    // This optimizes collision detection from O(n²) to O(n)
    this.spatialGrid = new SpatialGrid(200);

    // Initialize game state
    this.state = {
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
      particles: this.particlePool.getActive(), // Use pooled particles
      shipTrails: [],
      bullets: [],
      ammoPowerUps: [],
      voidWipes: [],
      keys: {},
      mouse: { x: 0, y: 0 },
      lastPlanetSpawn: 0,
      lastStarSpawn: 0,
      lastAmmoPowerUpSpawn: 0,
      lastHealthWrenchSpawn: 0,
      lastVoidWipeSpawn: 0,
      gameStartTime: 0,
      difficulty: 1,
      invulnerable: 0,
      shake: 0,
      nearMissTracker: new Map<string, number>(),
      planetIdCounter: 0,
      comboCount: 0,
      lastComboTime: 0,
      score: 0,
      shipLevel: 1,
    };
  }

  /**
   * Get the current game state for rendering
   */
  public getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Update the game state by one frame
   * @param delta - Time delta multiplier (1.0 = 60fps)
   */
  public update(delta: number): void {
    // NOTE: Weapon firing is handled separately BEFORE update() is called
    // This ensures bullets are created first, then updated with other entities
    
    // Update physics (gravity, movement, friction)
    this.updatePhysics(delta);
    
    // Decay screen shake effect
    if (this.state.shake > 0) {
      this.state.shake *= 0.9;
      if (this.state.shake < 0.1) {
        this.state.shake = 0; // Stop shake when very small
      }
    }
    
    // Update entities (planets, scraps, bullets, particles)
    this.updateEntities(delta);
    
    // Spawning system
    this.updateSpawning();
    
    // Check collectible collisions (stars, health, ammo, scraps)
    this.checkCollectibleCollisions();
    
    // Check ship-planet collisions and near-misses
    this.checkShipCollisions();
    
    // Check bullet collisions
    this.checkBulletCollisions();
    
    // Check obstacle-obstacle collisions
    this.checkObstacleCollisions();
    
    // Debris scrap spawning system
    this.updateDebrisScrapSpawning();
    
    // Star-Obstacle interactions
    this.checkStarObstacleCollisions();
    
    // Ship upgrades now handled in GameCanvas game loop to match original behavior
    // this.checkShipUpgrades();
  }

  /**
   * Set particles from external source (for testing integration)
   * Note: With particle pooling, external particles are not used.
   * This method is kept for backwards compatibility but is a no-op.
   */
  public setParticles(particles: Particle[]): void {
    // No-op: particle pool manages particles internally
    console.warn('setParticles() is deprecated with particle pooling');
  }

  /**
   * Set ship trails from external source (for testing integration)
   */
  public setShipTrails(trails: ShipTrail[]): void {
    this.state.shipTrails = trails;
  }

  /**
   * Set ship state from external source (for syncing position/velocity)
   */
  public setShip(ship: { x: number; y: number; vx: number; vy: number; angle: number; radius: number }): void {
    this.state.ship.x = ship.x;
    this.state.ship.y = ship.y;
    this.state.ship.vx = ship.vx;
    this.state.ship.vy = ship.vy;
    this.state.ship.angle = ship.angle;
    this.state.ship.radius = ship.radius;
  }

  /**
   * Set planets from external source (for testing integration)
   */
  public setPlanets(planets: Planet[]): void {
    this.state.planets = planets;
  }

  /**
   * Minimal update for testing - ONLY updates particles
   * This is a test method to verify GameEngine integration works
   */
  public updateParticlesOnly(): void {
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  /**
   * Minimal update for testing - ONLY updates ship trails
   * This is a test method to verify GameEngine integration works
   */
  public updateShipTrailsOnly(): void {
    // Get velocity magnitude for trail spawning check
    const velocityMagnitude = Math.sqrt(
      this.state.ship.vx * this.state.ship.vx + 
      this.state.ship.vy * this.state.ship.vy
    );

    // Add ship trail when moving
    if (velocityMagnitude > 0.5) {
      this.state.shipTrails.push({
        x: this.state.ship.x,
        y: this.state.ship.y,
        life: 1.0
      });
    }

    // Update and filter ship trails
    this.state.shipTrails = this.state.shipTrails.filter(trail => {
      trail.life -= 0.05;
      return trail.life > 0;
    });

    // Limit trail length
    if (this.state.shipTrails.length > 20) {
      this.state.shipTrails.shift();
    }
  }

  /**
   * Minimal update for testing - ONLY updates boundary wrapping
   * This is a test method to verify GameEngine integration works
   */
  public updateBoundaryWrapOnly(): void {
    // Boundary wrap
    if (this.state.ship.x < 0) this.state.ship.x = this.canvasWidth;
    if (this.state.ship.x > this.canvasWidth) this.state.ship.x = 0;
    if (this.state.ship.y < 0) this.state.ship.y = this.canvasHeight;
    if (this.state.ship.y > this.canvasHeight) this.state.ship.y = 0;
  }

  /**
   * Minimal update for testing - ONLY applies ship friction
   * This is a test method to verify GameEngine integration works
   */
  public updateShipFrictionOnly(): void {
    // Apply friction
    this.state.ship.vx *= 0.98;
    this.state.ship.vy *= 0.98;
  }

  /**
   * Minimal update for testing - ONLY updates ship rotation
   * This is a test method to verify GameEngine integration works
   */
  public updateShipRotationOnly(): void {
    // Update ship angle based on velocity direction
    const velocityMagnitude = Math.sqrt(
      this.state.ship.vx * this.state.ship.vx + 
      this.state.ship.vy * this.state.ship.vy
    );
    if (velocityMagnitude > 0.5) {
      this.state.ship.angle = Math.atan2(this.state.ship.vy, this.state.ship.vx);
    }
  }

  /**
   * Minimal update for testing - ONLY applies gravity from planets
   * This is a test method to verify GameEngine integration works
   */
  public updateShipGravityOnly(): void {
    // Gravity from planets
    this.state.planets.forEach(planet => {
      const dx = planet.x - this.state.ship.x;
      const dy = planet.y - this.state.ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const baseForce = planet.mass / (dist * dist);
        // Apply enhanced gravity for blackholes
        const gravityMultiplier = planet.gravityMultiplier || 1;
        const force = baseForce * gravityMultiplier;
        this.state.ship.vx += (dx / dist) * force * 0.01;
        this.state.ship.vy += (dy / dist) * force * 0.01;
      }
    });
  }

  /**
   * Minimal update for testing - ONLY updates ship position
   * This is a test method to verify GameEngine integration works
   */
  public updateShipPositionOnly(delta: number): void {
    // Update ship position
    this.state.ship.x += this.state.ship.vx * delta;
    this.state.ship.y += this.state.ship.vy * delta;
  }

  /**
   * Minimal update for testing - ONLY updates planet positions and rotations
   * This is a test method to verify GameEngine integration works
   */
  public updatePlanetsOnly(delta: number): void {
    this.state.planets = this.state.planets.filter(planet => {
      // Update position
      planet.x += planet.vx * delta;
      planet.y += planet.vy * delta;
      
      // Update rotation for meteors, planet2, blackholes, and debris
      if ((planet.type === "meteor" || planet.type === "planet2" || planet.type === "blackhole" || planet.type === "debris") && planet.rotation !== undefined && planet.rotationSpeed !== undefined) {
        planet.rotation += planet.rotationSpeed * delta;
      }
      
      // Check bounds
      const isInBounds = planet.x > -100 && planet.x < this.canvasWidth + 100 &&
                        planet.y > -100 && planet.y < this.canvasHeight + 100;
      
      // Clean up nearMissTracker for planets going out of bounds
      if (!isInBounds) {
        this.state.nearMissTracker.delete(planet.id);
      }
      
      return isInBounds;
    });
  }

  /**
   * Minimal update for testing - ONLY handles debris collision physics
   * This is a test method to verify GameEngine integration works
   * Phases 1-2 of collision migration: Debris bouncing + Planet2-Debris deflection
   */
  public updateDebrisCollisionsOnly(): void {
    // Phase 1: Debris collision detection and bouncing
    this.state.planets.forEach((debris, debrisIndex) => {
      if (debris.type === "debris" && debris.canBounce && debris.bounceCount < 3) {
        this.state.planets.forEach((otherPlanet, otherIndex) => {
          if (debrisIndex !== otherIndex) {
            const dx = debris.x - otherPlanet.x;
            const dy = debris.y - otherPlanet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = debris.radius + otherPlanet.radius;
            
            if (dist < minDist && dist > 0) {
              // Calculate bounce direction
              const normalX = dx / dist;
              const normalY = dy / dist;
              
              // Separate the objects
              const overlap = minDist - dist;
              debris.x += normalX * overlap * 0.5;
              debris.y += normalY * overlap * 0.5;
              otherPlanet.x -= normalX * overlap * 0.5;
              otherPlanet.y -= normalY * overlap * 0.5;
              
              // Calculate relative velocity
              const relativeVx = debris.vx - otherPlanet.vx;
              const relativeVy = debris.vy - otherPlanet.vy;
              const relativeSpeed = relativeVx * normalX + relativeVy * normalY;
              
              if (relativeSpeed < 0) return; // Objects separating
              
              // Apply bounce with energy loss
              const bounceStrength = 0.8; // Energy loss factor
              const impulse = 2 * relativeSpeed / (debris.mass + otherPlanet.mass);
              
              debris.vx -= impulse * otherPlanet.mass * normalX * bounceStrength;
              debris.vy -= impulse * otherPlanet.mass * normalY * bounceStrength;
              otherPlanet.vx += impulse * debris.mass * normalX * bounceStrength;
              otherPlanet.vy += impulse * debris.mass * normalY * bounceStrength;
              
              debris.bounceCount++;
              
              // Trigger callbacks for UI updates
              this.callbacks.onShowToast("Debris collision! +20 points", 20, { 
                duration: 1000,
                className: 'text-blue-400 glow-blue font-bold font-sans transition-colors duration-300'
              });
              this.callbacks.onCreateParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 8);
              
              // Award points (engine tracks score internally)
              this.state.score += 20;
              this.callbacks.onScoreChange(this.state.score);
            }
          }
        });
      }
    });

    // Phase 2-3: Advanced planet-debris interactions
    this.state.planets.forEach((planet1, index1) => {
      this.state.planets.forEach((planet2, index2) => {
        if (index1 >= index2) return; // Avoid duplicate checks
        
        const dx = planet1.x - planet2.x;
        const dy = planet1.y - planet2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = planet1.radius + planet2.radius;
        
        if (dist < minDist && dist > 0) {
          // Phase 2: Planet2-Debris interactions - debris bounces, planet2 continues
          if ((planet1.type === "planet2" && planet2.type === "debris") || 
              (planet1.type === "debris" && planet2.type === "planet2")) {
            const debris = planet1.type === "debris" ? planet1 : planet2;
            
            if (debris.canBounce && debris.bounceCount < 3) {
              const normalX = dx / dist;
              const normalY = dy / dist;
              
              // Only debris bounces, planet2 is too massive to be affected much
              debris.vx = -debris.vx * 0.9 + normalX * 2;
              debris.vy = -debris.vy * 0.9 + normalY * 2;
              debris.bounceCount++;
              
              // Trigger callbacks for UI updates
              this.callbacks.onShowToast("Debris bounce! +15 points", 15, { 
                duration: 1000,
                className: 'text-blue-400 glow-blue font-bold font-sans transition-colors duration-300'
              });
              this.callbacks.onCreateParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 6);
              
              // Award points
              this.state.score += 15;
              this.callbacks.onScoreChange(this.state.score);
            }
          }

          // Phase 3-4: Blackhole-Debris interactions (bounce OR absorption)
          if ((planet1.type === "blackhole" && planet2.type === "debris") || 
              (planet1.type === "debris" && planet2.type === "blackhole")) {
            const debris = planet1.type === "debris" ? planet1 : planet2;
            const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
            const debrisIndex = planet1.type === "debris" ? index1 : index2;
            
            // Phase 4: Absorption after threshold
            if (debris.bounceCount >= 2) {
              // Debris gets absorbed after multiple bounces, black hole grows
              blackhole.radius += debris.radius * 0.1;
              blackhole.mass += debris.mass * 0.6;
              blackhole.gravityMultiplier = (blackhole.gravityMultiplier || 1) * 1.01;
              
              // Update color based on new size
              if (blackhole.radius > 100) {
                blackhole.color = "hsl(300, 100%, 15%)";
              } else if (blackhole.radius > 80) {
                blackhole.color = "hsl(290, 100%, 18%)";
              }
              
              // Play blackhole absorption sound (with rate limiting and random volume)
              const now = Date.now();
              if (now - this.lastBlackholeAbsorbSound > this.BLACKHOLE_SOUND_COOLDOWN) {
                const randomVolume = 0.5 + Math.random() * 0.7; // 0.5 to 1.2
                this.callbacks.onPlaySound('blackholeAbsorb', randomVolume);
                this.lastBlackholeAbsorbSound = now;
              }
              
              // Trigger callbacks
              this.callbacks.onShowToast("Debris destroyed! +75 points", 75, { 
                duration: 1500,
                className: 'text-blue-400 glow-blue font-bold font-sans transition-colors duration-300'
              });
              this.callbacks.onCreateParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 12);
              this.callbacks.onCreateParticles(blackhole.x, blackhole.y, "hsl(270, 100%, 50%)", 8);
              this.callbacks.onCreateParticles(blackhole.x, blackhole.y, "hsl(280, 100%, 60%)", 5);
              
              // Award points
              this.state.score += 75;
              this.callbacks.onScoreChange(this.state.score);
              
              // Mark for removal
              this.state.planets.splice(debrisIndex, 1);
              return; // Exit after removal to avoid index issues
            }
            // Phase 3: Bounce if under absorption threshold
            else if (debris.canBounce && debris.bounceCount < 2) {
              const normalX = dx / dist;
              const normalY = dy / dist;
              
              // Debris bounces away from blackhole
              debris.vx += normalX * 3;
              debris.vy += normalY * 3;
              debris.bounceCount++;
              
              // Trigger callbacks for UI updates
              this.callbacks.onShowToast("Debris bounce! +15 points", 15, { 
                duration: 1000,
                className: 'text-blue-400 glow-blue font-bold font-sans transition-colors duration-300'
              });
              this.callbacks.onCreateParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 4);
              
              // Award points
              this.state.score += 15;
              this.callbacks.onScoreChange(this.state.score);
            }
          }

          // Phase 4: Meteor-Blackhole absorption
          if ((planet1.type === "meteor" && planet2.type === "blackhole") || 
              (planet1.type === "blackhole" && planet2.type === "meteor")) {
            const meteor = planet1.type === "meteor" ? planet1 : planet2;
            const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
            const meteorIndex = planet1.type === "meteor" ? index1 : index2;
            
            // Black hole absorbs meteor and grows
            blackhole.radius += meteor.radius * 0.15;
            blackhole.mass += meteor.mass * 0.8;
            blackhole.gravityMultiplier = (blackhole.gravityMultiplier || 1) * 1.02;
            
            // Update color based on new size
            if (blackhole.radius > 100) {
              blackhole.color = "hsl(300, 100%, 15%)";
            } else if (blackhole.radius > 80) {
              blackhole.color = "hsl(290, 100%, 18%)";
            }
            
            // Play blackhole absorption sound (with rate limiting and random volume)
            const now = Date.now();
            if (now - this.lastBlackholeAbsorbSound > this.BLACKHOLE_SOUND_COOLDOWN) {
              const randomVolume = 0.5 + Math.random() * 0.7; // 0.5 to 1.2
              this.callbacks.onPlaySound('blackholeAbsorb', randomVolume);
              this.lastBlackholeAbsorbSound = now;
            }
            
            // Create dramatic absorption effect
            this.callbacks.onCreateParticles(meteor.x, meteor.y, "hsl(0, 100%, 70%)", 15);
            this.callbacks.onCreateParticles(blackhole.x, blackhole.y, "hsl(270, 100%, 50%)", 10);
            this.callbacks.onCreateParticles(blackhole.x, blackhole.y, "hsl(280, 100%, 60%)", 8);
            
            // Remove the meteor
            this.state.planets.splice(meteorIndex, 1);
            return; // Exit after removal to avoid index issues
          }

          // Phase 5: Explosion Mechanics - Meteor-Meteor collisions
          if (planet1.type === "meteor" && planet2.type === "meteor") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            const blastRadius = 80 + Math.random() * 40;
            const blastForce = 3 + Math.random() * 2;
            
            // Play meteor collision sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastMeteorCollisionSound > this.METEOR_COLLISION_COOLDOWN) {
              this.callbacks.onPlaySound('meteorCollision');
              this.lastMeteorCollisionSound = now;
            }
            
            // Create massive explosion
            this.callbacks.onCreateExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
            
            // Remove both meteors
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }

          // Phase 5: Planet2-Planet2 collisions
          if (planet1.type === "planet2" && planet2.type === "planet2") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            const blastRadius = 60 + Math.random() * 30;
            const blastForce = 2 + Math.random() * 1.5;
            
            // Play explosion sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastExplosionSound > this.EXPLOSION_COOLDOWN) {
              this.callbacks.onPlaySound('explosion');
              this.lastExplosionSound = now;
            }
            
            // Create explosion with blue-white colors
            this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(200, 100%, 80%)", 20);
            this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(220, 100%, 90%)", 15);
            this.callbacks.onCreateExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
            
            // Remove both planets
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }

          // Phase 5: Debris-Debris collisions
          if (planet1.type === "debris" && planet2.type === "debris") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            const blastRadius = 40 + Math.random() * 20;
            const blastForce = 1.5 + Math.random() * 1;
            
            // Create fragmentation particles
            this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(30, 80%, 60%)", 15);
            this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(45, 70%, 70%)", 10);
            this.callbacks.onCreateExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
            
            // Remove both debris
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }

          // Phase 5: Meteor-Planet2 collisions (planet explodes, meteor deflected)
          if ((planet1.type === "meteor" && planet2.type === "planet2") || 
              (planet1.type === "planet2" && planet2.type === "meteor")) {
            const meteor = planet1.type === "meteor" ? planet1 : planet2;
            const planet = planet1.type === "planet2" ? planet1 : planet2;
            const meteorIndex = planet1.type === "meteor" ? index1 : index2;
            const planetIndex = planet1.type === "planet2" ? index1 : index2;
            
            // Play meteor collision sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastMeteorCollisionSound > this.METEOR_COLLISION_COOLDOWN) {
              this.callbacks.onPlaySound('meteorCollision');
              this.lastMeteorCollisionSound = now;
            }
            
            // Planet explodes
            const blastRadius = 80 + Math.random() * 40;
            const blastForce = 3 + Math.random() * 2;
            
            // Create planet explosion with blue-white colors
            this.callbacks.onCreateParticles(planet.x, planet.y, "hsl(200, 100%, 80%)", 20);
            this.callbacks.onCreateParticles(planet.x, planet.y, "hsl(220, 100%, 90%)", 15);
            this.callbacks.onCreateParticles(planet.x, planet.y, "hsl(240, 100%, 85%)", 12);
            
            // Create explosion (exclude meteor from blast)
            this.callbacks.onCreateExplosion(planet.x, planet.y, blastRadius, blastForce, [meteorIndex]);
            
            // Deflect meteor
            const normalX = dx / dist;
            const normalY = dy / dist;
            const deflectionStrength = 4 + Math.random() * 3;
            
            const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5;
            const deflectX = Math.cos(Math.atan2(normalY, normalX) + randomAngle);
            const deflectY = Math.sin(Math.atan2(normalY, normalX) + randomAngle);
            
            meteor.vx = deflectX * deflectionStrength;
            meteor.vy = deflectY * deflectionStrength;
            
            // Create meteor deflection particles
            this.callbacks.onCreateParticles(meteor.x, meteor.y, "hsl(0, 100%, 70%)", 8);
            
            // Award bonus points
            this.callbacks.onShowToast("Meteor collision! +100 points", 100, { 
              duration: 2000,
              className: 'text-blue-400 glow-blue font-bold font-sans transition-colors duration-300'
            });
            this.state.score += 100;
            this.callbacks.onScoreChange(this.state.score);
            
            // Remove only the planet
            this.state.planets.splice(planetIndex, 1);
            return;
          }
        }
      });
    });
    
    // Phase 6: Blackhole-Blackhole collisions (merging or collapse)
    for (let i = 0; i < this.state.planets.length; i++) {
      for (let j = i + 1; j < this.state.planets.length; j++) {
        const planet1 = this.state.planets[i];
        const planet2 = this.state.planets[j];
        
        if (planet1.type === "blackhole" && planet2.type === "blackhole") {
          const dx = planet1.x - planet2.x;
          const dy = planet1.y - planet2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = planet1.radius + planet2.radius;
          
          if (dist < minDist && dist > 0) {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            
            // Calculate combined properties
            const combinedRadius = Math.max(planet1.radius, planet2.radius) * 1.2 + Math.min(planet1.radius, planet2.radius) * 0.3;
            const combinedMass = planet1.mass + planet2.mass;
            const combinedGravity = Math.max(planet1.gravityMultiplier || 1, planet2.gravityMultiplier || 1) * 1.15;
            
            // Check if the resulting black hole would be too large (disappearance threshold)
            const maxRadius = 150; // Maximum radius before disappearance
            const maxMass = 15000; // Maximum mass before disappearance
            
            if (combinedRadius > maxRadius || combinedMass > maxMass) {
              // Black hole becomes unstable and disappears in a spectacular explosion
              const megaBlastRadius = 200 + Math.random() * 100;
              const megaBlastForce = 8 + Math.random() * 4;
              
              // Play blackhole absorption sound (with rate limiting and random volume)
              const now = Date.now();
              if (now - this.lastBlackholeAbsorbSound > this.BLACKHOLE_SOUND_COOLDOWN) {
                const randomVolume = 0.5 + Math.random() * 0.7; // 0.5 to 1.2
                this.callbacks.onPlaySound('blackholeAbsorb', randomVolume);
                this.lastBlackholeAbsorbSound = now;
              }
              
              // Create massive explosion effect
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(280, 100%, 90%)", 60);
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(300, 100%, 95%)", 50);
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(320, 100%, 80%)", 40);
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(60, 100%, 80%)", 30); // Golden energy
              this.callbacks.onCreateExplosion(explosionX, explosionY, megaBlastRadius, megaBlastForce, [i, j]);
              
              // Award collapse bonus
              this.awardPoints("Black hole collapsed!", GAME_BALANCE.scoring.blackHoleCollapsed, 3000);
            } else {
              // Create enhanced black hole with progressive growth
              const blastRadius = 120 + Math.random() * 40;
              const blastForce = 4 + Math.random() * 2;
              
              // Play blackhole absorption sound (with rate limiting and random volume)
              const now = Date.now();
              if (now - this.lastBlackholeAbsorbSound > this.BLACKHOLE_SOUND_COOLDOWN) {
                const randomVolume = 0.5 + Math.random() * 0.7; // 0.5 to 1.2
                this.callbacks.onPlaySound('blackholeAbsorb', randomVolume);
                this.lastBlackholeAbsorbSound = now;
              }
              
              // Create gravitational wave effect
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(280, 100%, 80%)", 35);
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(300, 100%, 90%)", 25);
              this.callbacks.onCreateParticles(explosionX, explosionY, "hsl(320, 100%, 70%)", 20);
              this.callbacks.onCreateExplosion(explosionX, explosionY, blastRadius, blastForce, [i, j]);
              
              // Determine color based on size (larger = more dangerous looking)
              let blackholeColor = "hsl(280, 100%, 20%)";
              if (combinedRadius > 100) {
                blackholeColor = "hsl(300, 100%, 15%)"; // Darker purple for large black holes
              } else if (combinedRadius > 80) {
                blackholeColor = "hsl(290, 100%, 18%)"; // Medium purple
              }
              
              // Create the enhanced black hole
              this.state.planets.push({
                id: `planet_${Date.now()}_${Math.random()}`, // Unique ID
                x: explosionX,
                y: explosionY,
                vx: (planet1.vx + planet2.vx) / 2 * 0.9, // Slightly slower due to increased mass
                vy: (planet1.vy + planet2.vy) / 2 * 0.9,
                radius: combinedRadius,
                mass: combinedMass,
                type: "blackhole",
                color: blackholeColor,
                rotation: 0,
                rotationSpeed: Math.max(0.02, 0.08 - (combinedRadius / 1000)), // Slower rotation for larger black holes
                gravityMultiplier: combinedGravity
              });
              
              // Award merger bonus
              this.awardPoints("Black hole merger!", 100, 2000);
            }
            
            // Remove both original blackholes (remove higher index first to avoid index shifting)
            this.state.planets.splice(j, 1);
            this.state.planets.splice(i, 1);
            
            // Since we removed elements, we need to restart the loops
            return;
          }
        }
      }
    }
  }

  /**
   * Reset the game to initial state
   */
  public reset(): void {
    this.state.ship.x = this.canvasWidth / 2;
    this.state.ship.y = this.canvasHeight / 2;
    this.state.ship.vx = 0;
    this.state.ship.vy = 0;
    this.state.planets = [];
    this.state.stars = [];
    this.state.scraps = [];
    this.state.healthWrenches = [];
    this.state.bullets = [];
    this.particlePool.reset(); // Reset particle pool (OPTIMIZED)
    this.state.particles = this.particlePool.getActive(); // Keep reference
    this.state.shipTrails = [];
    this.state.ammoPowerUps = [];
    this.state.voidWipes = [];
    this.state.difficulty = 1;
    this.state.invulnerable = 180;
    this.state.nearMissTracker.clear();
    this.state.planetIdCounter = 0;
    this.state.gameStartTime = Date.now();
    this.state.lastPlanetSpawn = 0;
    this.state.lastStarSpawn = 0;
    this.state.lastAmmoPowerUpSpawn = 0;
    this.state.lastHealthWrenchSpawn = 0;
    this.state.lastVoidWipeSpawn = 0;
    this.state.comboCount = 0;
    this.state.lastComboTime = 0;
    this.state.score = 0;
    this.state.shipLevel = 1;
    this.lastVoidWipeCollected = 0;
  }

  /**
   * Update input state (keys, mouse)
   */
  public updateInput(input: Partial<GameInput>): void {
    if (input.keys) {
      // Merge keys instead of replacing to support multiple simultaneous key presses
      this.state.keys = { ...this.state.keys, ...input.keys };
    }
    if (input.mouse) {
      this.state.mouse = input.mouse;
    }
  }

  /**
   * Process input and apply ship thrust
   * Returns true if ship is accelerating (for audio cues)
   */
  public processInput(joystick: { x: number; y: number }, isMobile: boolean): boolean {
    const speed = 0.3;
    // Mobile-optimized speeds - much slower for small screen control
    const joystickSpeed = isMobile ? 0.15 : 0.3;
    const joystickThreshold = isMobile ? 0.02 : 0.05;
    let isAccelerating = false;
    
    // Keyboard controls
    if (this.state.keys["w"] || this.state.keys["arrowup"]) { 
      this.state.ship.vy -= speed; 
      isAccelerating = true; 
    }
    if (this.state.keys["s"] || this.state.keys["arrowdown"]) { 
      this.state.ship.vy += speed; 
      isAccelerating = true; 
    }
    if (this.state.keys["a"] || this.state.keys["arrowleft"]) { 
      this.state.ship.vx -= speed; 
      isAccelerating = true; 
    }
    if (this.state.keys["d"] || this.state.keys["arrowright"]) { 
      this.state.ship.vx += speed; 
      isAccelerating = true; 
    }
    
    // Joystick controls - mobile-optimized sensitivity
    if (Math.abs(joystick.x) > joystickThreshold || Math.abs(joystick.y) > joystickThreshold) {
      this.state.ship.vx += joystick.x * joystickSpeed;
      this.state.ship.vy += joystick.y * joystickSpeed;
      isAccelerating = true;
    }
    
    return isAccelerating;
  }

  /**
   * Process weapon firing (manual + auto-targeting)
   * Returns true if a shot was fired (for recharge timer tracking)
   */
  public processWeaponFiring(
    hasWeapon: boolean,
    hasUpgradedToShip3: boolean,
    isRecharging: boolean,
    isUnlimitedAmmo: boolean,
    currentAmmo: number,
    rechargeStartTimeRef: { current: number }
  ): boolean {
    if (!hasWeapon) return false;
    
    const now = Date.now();
    let shotFired = false;
    
    // === MANUAL SHOOTING (Spacebar) ===
    if (this.state.keys[" "] && !isRecharging) {
      if (now - this.lastShotTime > FIRE_RATE) {
        if (isUnlimitedAmmo || currentAmmo > 0) {
          // Create bullet
          const bullet = createBullet(this.state.ship, hasUpgradedToShip3);
          this.state.bullets.push(bullet);
          
          // Track shot for achievement
          this.callbacks.onShotFired();
          
          // Drain ammo (unless unlimited)
          if (!isUnlimitedAmmo) {
            const newAmmo = currentAmmo - AMMO_DRAIN_RATE;
            if (newAmmo <= 0) {
              this.callbacks.onRechargeStateChange(true);
              rechargeStartTimeRef.current = now;
              this.callbacks.onPlaySound('chargeEmpty');
            }
            this.callbacks.onAmmoChange(Math.max(0, newAmmo));
          }
          
          this.lastShotTime = now;
          shotFired = true;
          
          // Play appropriate shoot sound
          const shootSound = hasUpgradedToShip3 ? 'shoot2' : 'shoot1';
          this.callbacks.onPlaySound(shootSound);
        }
      }
    }
    
    // === AUTO-TARGETING (Level 3 only) ===
    if (hasUpgradedToShip3 && !isRecharging) {
      if (now - this.lastAutoShotTime > AUTO_FIRE_RATE) {
        if (isUnlimitedAmmo || currentAmmo > 0) {
          // Find nearest enemy within range
          const target = findNearestEnemy(this.state.ship, this.state.planets, 400);
          
          if (target) {
            // Calculate lead shot for moving targets
            const targetAngle = calculateLeadShot(this.state.ship, target.planet, BULLET_SPEED);
            
            // Create auto-targeting bullet
            const bullet = createBullet(this.state.ship, true, targetAngle);
            this.state.bullets.push(bullet);
            
            // Track shot for achievement
            this.callbacks.onShotFired();
            
            // Drain ammo (unless unlimited)
            if (!isUnlimitedAmmo) {
              const newAmmo = currentAmmo - AMMO_DRAIN_RATE;
              if (newAmmo <= 0) {
                this.callbacks.onRechargeStateChange(true);
                rechargeStartTimeRef.current = now;
                this.callbacks.onPlaySound('chargeEmpty');
              }
              this.callbacks.onAmmoChange(Math.max(0, newAmmo));
            }
            
            this.lastAutoShotTime = now;
            shotFired = true;
            
            // Play auto-targeting shoot sound
            this.callbacks.onPlaySound('shoot2');
          }
        }
      }
    }
    
    return shotFired;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Set current score and difficulty for spawn calculations
   */
  public setScoreAndDifficulty(
    score: number,
    difficulty: number,
    difficultyConfig: DifficultyConfig = this.difficultyConfig
  ): void {
    this.currentScore = score;
    this.currentDifficulty = difficulty;
    this.difficultyConfig = difficultyConfig;
  }
  
  private currentScore: number = 0;
  private currentDifficulty: number = 1;
  
  /**
   * Handle spawning of stars and other collectibles
   */
  private updateSpawning(): void {
    const now = Date.now();
    const config = this.difficultyConfig;
    
    // Check if in respite period after void wipe
    const inRespitePeriod =
      this.lastVoidWipeCollected > 0 &&
      (now - this.lastVoidWipeCollected < GAME_BALANCE.pickups.voidWipe.respiteMs);
    
    // Planet spawning - difficulty-based rate
    if (!inRespitePeriod) {
      const basePlanetInterval = GAME_BALANCE.spawning.baseObstacleIntervalMs / Math.max(1, this.currentDifficulty);
      const planetInterval = basePlanetInterval / config.obstacleSpawnMultiplier;
      
      if (now - this.state.lastPlanetSpawn > planetInterval) {
        const planetType = this.determinePlanetType();
        this.spawnPlanet(planetType);
        this.state.lastPlanetSpawn = now;
      }
    }
    
    // Star spawning - difficulty can increase reward density alongside risk
    const starInterval = GAME_BALANCE.spawning.baseStarIntervalMs / config.starSpawnMultiplier;
    if (now - this.state.lastStarSpawn > starInterval) {
      this.spawnStar();
      this.state.lastStarSpawn = now;
    }
    
    // Health wrench spawning - rare, after 30 seconds
    const gameRunTime = now - this.state.gameStartTime;
    if (
      gameRunTime > GAME_BALANCE.pickups.healthWrench.unlockMs &&
      now - this.state.lastHealthWrenchSpawn > GAME_BALANCE.pickups.healthWrench.intervalMs
    ) {
      if (Math.random() < GAME_BALANCE.pickups.healthWrench.chancePerFrame) {
        this.spawnHealthWrench();
        this.state.lastHealthWrenchSpawn = now;
      }
    }
    
    // Ammo power-up spawning - rare, after 20 seconds, level 2+ only (when player has weapons)
    const hasWeapon = this.currentScore >= GAME_BALANCE.upgrades.level2Score;
    if (
      hasWeapon &&
      gameRunTime > GAME_BALANCE.pickups.ammoPowerUp.unlockMs &&
      now - this.state.lastAmmoPowerUpSpawn > GAME_BALANCE.pickups.ammoPowerUp.intervalMs
    ) {
      if (Math.random() < GAME_BALANCE.pickups.ammoPowerUp.chancePerFrame) {
        this.spawnAmmoPowerUp();
        this.state.lastAmmoPowerUpSpawn = now;
      }
    }

    // Void Wipe is a rare panic power-up for late, crowded runs.
    if (
      this.currentScore >= GAME_BALANCE.pickups.voidWipe.minScore &&
      gameRunTime > GAME_BALANCE.pickups.voidWipe.unlockMs &&
      this.state.planets.length >= GAME_BALANCE.pickups.voidWipe.minObstacleCount &&
      this.state.voidWipes.length === 0 &&
      now - this.state.lastVoidWipeSpawn > GAME_BALANCE.pickups.voidWipe.intervalMs
    ) {
      if (Math.random() < GAME_BALANCE.pickups.voidWipe.chancePerFrame) {
        this.spawnVoidWipe();
        this.state.lastVoidWipeSpawn = now;
      }
    }
  }
  
  /**
   * Determine planet type based on current score/difficulty
   */
  private determinePlanetType(): "debris" | "meteor" | "planet2" | "blackhole" {
    const score = this.currentScore;
    const dist = this.difficultyConfig.obstacleDistribution;
    
    // Early game (0-1000): mostly meteors
    if (score < GAME_BALANCE.spawning.earlyGameScore) {
      const debrisChance = Math.max(GAME_BALANCE.spawning.earlyDebrisMinChance, dist.debris);
      return Math.random() < debrisChance ? "debris" : "meteor";
    }
    
    // Mid game (1000-5000): introduce planets
    if (score < GAME_BALANCE.spawning.midGameScore) {
      const rand = Math.random();
      const debrisChance = dist.debris;
      const meteorChance = dist.meteor + GAME_BALANCE.spawning.midMeteorBonusChance;
      if (rand < meteorChance) return "meteor";
      if (rand < meteorChance + debrisChance) return "debris";
      return "planet2";
    }
    
    // Late game (5000+): all types using the selected difficulty mix
    const rand = Math.random();
    if (rand < dist.debris) return "debris";
    if (rand < dist.debris + dist.meteor) return "meteor";
    if (rand < dist.debris + dist.meteor + dist.planet2) return "planet2";
    return "blackhole";
  }

  /**
   * Update physics: gravity, friction, movement, trails
   */
  private updatePhysics(delta: number): void {
    // Gravity from planets (optimized with distance culling and lazy sqrt)
    const maxGravityDistSq = 800 * 800; // Skip gravity beyond 800px (negligible effect)
    
    this.state.planets.forEach(planet => {
      const dx = planet.x - this.state.ship.x;
      const dy = planet.y - this.state.ship.y;
      const distSq = dx * dx + dy * dy;
      
      // Skip if planet is too far (gravity negligible)
      if (distSq > maxGravityDistSq || distSq === 0) return;
      
      const dist = Math.sqrt(distSq); // Only calculate sqrt when needed
      const baseForce = planet.mass / distSq; // Use distSq directly
      // Apply enhanced gravity for blackholes
      const gravityMultiplier = planet.gravityMultiplier || 1;
      const force = baseForce * gravityMultiplier;
      this.state.ship.vx += (dx / dist) * force * 0.01;
      this.state.ship.vy += (dy / dist) * force * 0.01;
    });

    // Apply friction
    this.state.ship.vx *= 0.98;
    this.state.ship.vy *= 0.98;

    // Update ship angle based on velocity direction
    const velocityMagnitude = Math.sqrt(
      this.state.ship.vx * this.state.ship.vx + 
      this.state.ship.vy * this.state.ship.vy
    );
    if (velocityMagnitude > 0.5) {
      this.state.ship.angle = Math.atan2(this.state.ship.vy, this.state.ship.vx);
    }

    // Update ship position
    this.state.ship.x += this.state.ship.vx * delta;
    this.state.ship.y += this.state.ship.vy * delta;

    // Add ship trail when moving
    if (velocityMagnitude > 0.5) {
      this.state.shipTrails.push({
        x: this.state.ship.x,
        y: this.state.ship.y,
        life: 1.0
      });
    }

    // Update and filter ship trails
    this.state.shipTrails = this.state.shipTrails.filter(trail => {
      trail.life -= 0.05;
      return trail.life > 0;
    });

    // Limit trail length
    if (this.state.shipTrails.length > 20) {
      this.state.shipTrails.shift();
    }

    // Boundary wrap
    if (this.state.ship.x < 0) this.state.ship.x = this.canvasWidth;
    if (this.state.ship.x > this.canvasWidth) this.state.ship.x = 0;
    if (this.state.ship.y < 0) this.state.ship.y = this.canvasHeight;
    if (this.state.ship.y > this.canvasHeight) this.state.ship.y = 0;
  }

  /**
   * Update all entities: planets, scraps, particles
   */
  private updateEntities(delta: number): void {
    // Update planets
    this.state.planets = this.state.planets.filter(planet => {
      // Update position
      planet.x += planet.vx * delta;
      planet.y += planet.vy * delta;
      
      // Update rotation for rotating obstacles
      if ((planet.type === "meteor" || planet.type === "planet2" || planet.type === "blackhole" || planet.type === "debris") && 
          planet.rotation !== undefined && planet.rotationSpeed !== undefined) {
        planet.rotation += planet.rotationSpeed * delta;
      }
      
      // Check bounds (with buffer zone)
      const isInBounds = planet.x > -100 && planet.x < this.canvasWidth + 100 &&
                        planet.y > -100 && planet.y < this.canvasHeight + 100;
      
      // Clean up nearMissTracker for planets going out of bounds
      if (!isInBounds) {
        this.state.nearMissTracker.delete(planet.id);
      }
      
      return isInBounds;
    });

    // Check for oversized black holes that should disappear
    this.state.planets = this.state.planets.filter(planet => {
      if (planet.type === "blackhole") {
        const maxRadius = 150;
        const maxMass = 15000;
        
        if (planet.radius > maxRadius || planet.mass > maxMass) {
          // Black hole becomes unstable and disappears
          const megaBlastRadius = 200 + Math.random() * 100;
          const megaBlastForce = 8 + Math.random() * 4;
          
          // Create massive explosion effect
          this.createParticles(planet.x, planet.y, "hsl(280, 100%, 90%)", 60);
          this.createParticles(planet.x, planet.y, "hsl(300, 100%, 95%)", 50);
          this.createParticles(planet.x, planet.y, "hsl(320, 100%, 80%)", 40);
          this.createParticles(planet.x, planet.y, "hsl(60, 100%, 80%)", 30); // Golden energy
          this.createExplosion(planet.x, planet.y, megaBlastRadius, megaBlastForce, []);
          
          // Show toast (score will be handled in Phase 12)
          // Award points for black hole collapse
          this.awardPoints("Black hole collapsed!", GAME_BALANCE.scoring.blackHoleCollapsed, 3000);
          
          // Clean up nearMissTracker for removed planet
          this.state.nearMissTracker.delete(planet.id);
          
          return false; // Remove the black hole
        }
      }
      return true; // Keep all other planets
    });

    // Update and manage scrap objects
    this.state.scraps = this.state.scraps.filter(scrap => {
      // Update position
      scrap.x += scrap.vx * delta;
      scrap.y += scrap.vy * delta;
      
      // Update rotation
      scrap.rotation += scrap.rotationSpeed * delta;
      
      // Decrease lifespan
      scrap.lifespan -= delta;
      
      // Apply slight friction to slow down scrap over time
      scrap.vx *= 0.995;
      scrap.vy *= 0.995;
      
      // Remove scrap when lifespan expires
      if (scrap.lifespan <= 0) {
        return false;
      }
      
      // Keep scrap if still alive and on screen (with some buffer)
      return scrap.x > -50 && scrap.x < this.canvasWidth + 50 &&
             scrap.y > -50 && scrap.y < this.canvasHeight + 50;
    });

      // Update particles using object pool (OPTIMIZED)
      this.particlePool.update(delta);

      // Update bullets
      this.state.bullets = this.state.bullets.filter(bullet => {
        // Update position
        bullet.x += bullet.vx * delta;
        bullet.y += bullet.vy * delta;
        
        // Update lifetime (count UP from 0 to maxLifetime)
        bullet.lifetime += delta;
        
        // Remove bullets that expired or went off screen
        if (bullet.lifetime >= bullet.maxLifetime) {
          return false;
        }
        
        // Check bounds (with buffer zone)
        return bullet.x > -50 && bullet.x < this.canvasWidth + 50 &&
               bullet.y > -50 && bullet.y < this.canvasHeight + 50;
      });
    }

  /**
   * Check star-obstacle collisions
   */
  public checkStarObstacleCollisions(): void {
    this.state.stars.forEach((star) => {
      if (star.collected) return;
      
      this.state.planets.forEach((planet) => {
        const dx = star.x - planet.x;
        const dy = star.y - planet.y;
        const distSq = dx * dx + dy * dy;
        const collisionDist = star.radius + planet.radius;
        
        if (distSq < collisionDist * collisionDist) {
          // Get current time once for rate limiting
          const now = Date.now();
          
          // Different interactions based on obstacle type
          switch (planet.type) {
            case "meteor":
              // Meteors destroy stars in a small explosion
              this.createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 8);
              this.createParticles(planet.x, planet.y, "hsl(0, 100%, 70%)", 5);
              star.collected = true;
              
              this.awardPoints("Star destroyed by meteor!", 40, 1500);
              
              // Play star acquire sound (with rate limiting)
              if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
                this.callbacks.onPlaySound('starAcquire');
                this.lastStarAcquireSound = now;
              }
              break;
              
            case "planet2":
              // Planet2 absorbs stars and grows slightly
              this.createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 6);
              this.createParticles(planet.x, planet.y, "hsl(180, 100%, 50%)", 4);
              planet.radius += 0.5; // Slight growth
              star.collected = true;
              
              this.awardPoints("Star absorbed by planet!", 30, 1500);
              
              // Play star acquire sound (with rate limiting)
              if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
                this.callbacks.onPlaySound('starAcquire');
                this.lastStarAcquireSound = now;
              }
              break;
              
            case "blackhole":
              // Blackholes absorb stars dramatically
              this.createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 12);
              this.createParticles(planet.x, planet.y, "hsl(270, 100%, 50%)", 8);
              star.collected = true;
              
              this.awardPoints("Star consumed by black hole!", 60, 1500);
              
              // Play star acquire sound (with rate limiting)
              if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
                this.callbacks.onPlaySound('starAcquire');
                this.lastStarAcquireSound = now;
              }
              break;
              
            case "debris":
              // Debris and stars create a small sparkle effect
              this.createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 4);
              this.createParticles(planet.x, planet.y, "hsl(30, 100%, 60%)", 3);
              star.collected = true;
              
              this.awardPoints("Star sparkle with debris!", 20, 1500);
              
              // Play star acquire sound (with rate limiting)
              if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
                this.callbacks.onPlaySound('starAcquire');
                this.lastStarAcquireSound = now;
              }
              break;
          }
        }
      });
    });
  }

  /**
   * Check obstacle-obstacle collisions (OPTIMIZED with spatial grid!)
   * Reduces collision checks from O(n²) to O(n) using broad-phase detection
   */
  public checkObstacleCollisions(): void {
    // Build spatial grid (broad-phase)
    this.spatialGrid.clear();
    this.state.planets.forEach(planet => this.spatialGrid.insert(planet));
    
    // First pass: General debris bouncing system (OPTIMIZED)
    this.state.planets.forEach((debris, debrisIndex) => {
      if (debris.type === "debris" && debris.canBounce && debris.bounceCount < 3) {
        // OPTIMIZATION: Only check nearby planets instead of all planets
        const nearbyPlanets = this.spatialGrid.getNearby(debris);
        
        nearbyPlanets.forEach((otherPlanet) => {
          const otherIndex = this.state.planets.indexOf(otherPlanet);
          if (debrisIndex !== otherIndex) {
            const dx = debris.x - otherPlanet.x;
            const dy = debris.y - otherPlanet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = debris.radius + otherPlanet.radius;
            
            if (dist < minDist && dist > 0) {
              // Calculate bounce direction
              const normalX = dx / dist;
              const normalY = dy / dist;
              
              // Separate the objects
              const overlap = minDist - dist;
              debris.x += normalX * overlap * 0.5;
              debris.y += normalY * overlap * 0.5;
              otherPlanet.x -= normalX * overlap * 0.5;
              otherPlanet.y -= normalY * overlap * 0.5;
              
              // Calculate relative velocity
              const relativeVx = debris.vx - otherPlanet.vx;
              const relativeVy = debris.vy - otherPlanet.vy;
              const relativeSpeed = relativeVx * normalX + relativeVy * normalY;
              
              if (relativeSpeed < 0) return; // Objects separating
              
              // Apply bounce with energy loss
              const bounceStrength = 0.8;
              const impulse = 2 * relativeSpeed / (debris.mass + otherPlanet.mass);
              
              debris.vx -= impulse * otherPlanet.mass * normalX * bounceStrength;
              debris.vy -= impulse * otherPlanet.mass * normalY * bounceStrength;
              otherPlanet.vx += impulse * debris.mass * normalX * bounceStrength;
              otherPlanet.vy += impulse * debris.mass * normalY * bounceStrength;
              
              debris.bounceCount++;
              
            // Play debris bounce sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastDebrisBounceSound > this.DEBRIS_BOUNCE_COOLDOWN) {
              this.callbacks.onPlaySound('debrisBounce');
              this.lastDebrisBounceSound = now;
            }
            this.awardPoints("Debris collision!", 20, 1000);
            this.createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 8);
            }
          }
        });
      }
    });

    // Second pass: Specific collision type interactions (OPTIMIZED)
    this.state.planets.forEach((planet1, index1) => {
      // OPTIMIZATION: Only check nearby planets instead of all planets
      const nearbyPlanets = this.spatialGrid.getNearby(planet1);
      
      nearbyPlanets.forEach((planet2) => {
        const index2 = this.state.planets.indexOf(planet2);
        if (index1 >= index2) return; // Avoid duplicate checks and self-collision
        
        const dx = planet1.x - planet2.x;
        const dy = planet1.y - planet2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = planet1.radius + planet2.radius;
        
        if (dist < minDist && dist > 0) {
          // Meteor-Blackhole interactions
          if ((planet1.type === "meteor" && planet2.type === "blackhole") || 
              (planet1.type === "blackhole" && planet2.type === "meteor")) {
            const meteor = planet1.type === "meteor" ? planet1 : planet2;
            const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
            const meteorIndex = planet1.type === "meteor" ? index1 : index2;
            
            // Black hole absorbs meteor and grows
            blackhole.radius += meteor.radius * 0.15;
            blackhole.mass += meteor.mass * 0.8;
            blackhole.gravityMultiplier = (blackhole.gravityMultiplier || 1) * 1.02;
            
            // Update color based on size
            if (blackhole.radius > 100) {
              blackhole.color = "hsl(300, 100%, 15%)";
            } else if (blackhole.radius > 80) {
              blackhole.color = "hsl(290, 100%, 18%)";
            }
            
            // Create absorption effect
            this.createParticles(meteor.x, meteor.y, "hsl(0, 100%, 70%)", 15);
            this.createParticles(blackhole.x, blackhole.y, "hsl(270, 100%, 50%)", 10);
            this.createParticles(blackhole.x, blackhole.y, "hsl(280, 100%, 60%)", 8);
            
            // Play blackhole absorption sound (with rate limiting and random volume)
            const now = Date.now();
            if (now - this.lastBlackholeAbsorbSound > this.BLACKHOLE_SOUND_COOLDOWN) {
              const randomVolume = 0.5 + Math.random() * 0.7; // 0.5 to 1.2
              this.callbacks.onPlaySound('blackholeAbsorb', randomVolume);
              this.lastBlackholeAbsorbSound = now;
            }
            
            this.state.planets.splice(meteorIndex, 1);
            return;
          }
          
          // Planet2-Debris interactions
          if ((planet1.type === "planet2" && planet2.type === "debris") || 
              (planet1.type === "debris" && planet2.type === "planet2")) {
            const debris = planet1.type === "debris" ? planet1 : planet2;
            const planet2Obj = planet1.type === "planet2" ? planet1 : planet2;
            
            if (debris.canBounce && debris.bounceCount < 3) {
              const normalX = dx / dist;
              const normalY = dy / dist;
              
              // Only debris bounces
              debris.vx = -debris.vx * 0.9 + normalX * 2;
              debris.vy = -debris.vy * 0.9 + normalY * 2;
              debris.bounceCount++;
              
            // Play debris bounce sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastDebrisBounceSound > this.DEBRIS_BOUNCE_COOLDOWN) {
              this.callbacks.onPlaySound('debrisBounce');
              this.lastDebrisBounceSound = now;
            }
            this.awardPoints("Debris bounce!", 15, 1000);
            this.createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 6);
            }
            return;
          }
          
          // Blackhole-Debris interactions
          if ((planet1.type === "blackhole" && planet2.type === "debris") || 
              (planet1.type === "debris" && planet2.type === "blackhole")) {
            const debris = planet1.type === "debris" ? planet1 : planet2;
            const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
            const debrisIndex = planet1.type === "debris" ? index1 : index2;
            
            if (debris.bounceCount >= 2) {
              // Debris gets absorbed
              blackhole.radius += debris.radius * 0.1;
              blackhole.mass += debris.mass * 0.6;
              blackhole.gravityMultiplier = (blackhole.gravityMultiplier || 1) * 1.01;
              
              this.awardPoints("Debris destroyed!", 75, 1500);
              
              // Update color
              if (blackhole.radius > 100) {
                blackhole.color = "hsl(300, 100%, 15%)";
              } else if (blackhole.radius > 80) {
                blackhole.color = "hsl(290, 100%, 18%)";
              }
              
              this.createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 12);
              this.createParticles(blackhole.x, blackhole.y, "hsl(270, 100%, 50%)", 8);
              this.createParticles(blackhole.x, blackhole.y, "hsl(280, 100%, 60%)", 5);
              
              // Play blackhole absorption sound (with rate limiting and random volume)
              const now = Date.now();
              if (now - this.lastBlackholeAbsorbSound > this.BLACKHOLE_SOUND_COOLDOWN) {
                const randomVolume = 0.5 + Math.random() * 0.7; // 0.5 to 1.2
                this.callbacks.onPlaySound('blackholeAbsorb', randomVolume);
                this.lastBlackholeAbsorbSound = now;
              }
              
              this.state.planets.splice(debrisIndex, 1);
            } else if (debris.canBounce) {
              // Debris bounces
              const normalX = dx / dist;
              const normalY = dy / dist;
              debris.vx += normalX * 3;
              debris.vy += normalY * 3;
              debris.bounceCount++;
              
              // Play debris bounce sound (with rate limiting)
              const now = Date.now();
              if (now - this.lastDebrisBounceSound > this.DEBRIS_BOUNCE_COOLDOWN) {
                this.callbacks.onPlaySound('debrisBounce');
                this.lastDebrisBounceSound = now;
              }
              this.awardPoints("Debris bounce!", 15, 1000);
              this.createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 4);
            }
            return;
          }
          
          // Meteor-Meteor collisions
          if (planet1.type === "meteor" && planet2.type === "meteor") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            const blastRadius = 80 + Math.random() * 40;
            const blastForce = 3 + Math.random() * 2;
            
            this.createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
            
            // Play meteor collision sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastMeteorCollisionSound > this.METEOR_COLLISION_COOLDOWN) {
              this.callbacks.onPlaySound('meteorCollision');
              this.lastMeteorCollisionSound = now;
            }
            
            // Remove both meteors
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }
          
          // Planet2-Planet2 collisions
          if (planet1.type === "planet2" && planet2.type === "planet2") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            const blastRadius = 60 + Math.random() * 30;
            const blastForce = 2 + Math.random() * 1.5;
            
            this.createParticles(explosionX, explosionY, "hsl(200, 100%, 80%)", 20);
            this.createParticles(explosionX, explosionY, "hsl(220, 100%, 90%)", 15);
            this.createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
            
            // Remove both planets
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }
          
          // Debris-Debris collisions
          if (planet1.type === "debris" && planet2.type === "debris") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            const blastRadius = 40 + Math.random() * 20;
            const blastForce = 1.5 + Math.random() * 1;
            
            this.createParticles(explosionX, explosionY, "hsl(30, 80%, 60%)", 15);
            this.createParticles(explosionX, explosionY, "hsl(45, 70%, 70%)", 10);
            this.createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
            
            // Remove both debris
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }
          
          // Meteor-Planet2 collisions
          if ((planet1.type === "meteor" && planet2.type === "planet2") || 
              (planet1.type === "planet2" && planet2.type === "meteor")) {
            const meteor = planet1.type === "meteor" ? planet1 : planet2;
            const planet = planet1.type === "planet2" ? planet1 : planet2;
            const meteorIndex = planet1.type === "meteor" ? index1 : index2;
            const planetIndex = planet1.type === "planet2" ? index1 : index2;
            
            const blastRadius = 80 + Math.random() * 40;
            const blastForce = 3 + Math.random() * 2;
            
            // Planet explosion
            this.createParticles(planet.x, planet.y, "hsl(200, 100%, 80%)", 20);
            this.createParticles(planet.x, planet.y, "hsl(220, 100%, 90%)", 15);
            this.createParticles(planet.x, planet.y, "hsl(240, 100%, 85%)", 12);
            this.createExplosion(planet.x, planet.y, blastRadius, blastForce, [meteorIndex]);
            
            // Deflect meteor
            const normalX = dx / dist;
            const normalY = dy / dist;
            const deflectionStrength = 4 + Math.random() * 3;
            const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5;
            const deflectX = Math.cos(Math.atan2(normalY, normalX) + randomAngle);
            const deflectY = Math.sin(Math.atan2(normalY, normalX) + randomAngle);
            
            meteor.vx = deflectX * deflectionStrength;
            meteor.vy = deflectY * deflectionStrength;
            
            this.createParticles(meteor.x, meteor.y, "hsl(0, 100%, 70%)", 8);
            
            // Play meteor collision sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastMeteorCollisionSound > this.METEOR_COLLISION_COOLDOWN) {
              this.callbacks.onPlaySound('meteorCollision');
              this.lastMeteorCollisionSound = now;
            }
            
            this.awardPoints("Meteor collision!", 100, 2000);
            this.state.planets.splice(planetIndex, 1);
            return;
          }
          
          // Blackhole-Blackhole collisions
          if (planet1.type === "blackhole" && planet2.type === "blackhole") {
            const explosionX = (planet1.x + planet2.x) / 2;
            const explosionY = (planet1.y + planet2.y) / 2;
            
            // Calculate combined properties
            const combinedRadius = Math.max(planet1.radius, planet2.radius) * 1.2 + Math.min(planet1.radius, planet2.radius) * 0.3;
            const combinedMass = planet1.mass + planet2.mass;
            const combinedGravity = Math.max(planet1.gravityMultiplier || 1, planet2.gravityMultiplier || 1) * 1.15;
            
            const maxRadius = 150;
            const maxMass = 15000;
            
            if (combinedRadius > maxRadius || combinedMass > maxMass) {
              // Black hole becomes unstable and disappears
              const megaBlastRadius = 200 + Math.random() * 100;
              const megaBlastForce = 8 + Math.random() * 4;
              
              this.createParticles(explosionX, explosionY, "hsl(280, 100%, 90%)", 60);
              this.createParticles(explosionX, explosionY, "hsl(300, 100%, 95%)", 50);
              this.createParticles(explosionX, explosionY, "hsl(320, 100%, 80%)", 40);
              this.createParticles(explosionX, explosionY, "hsl(60, 100%, 80%)", 30);
              this.createExplosion(explosionX, explosionY, megaBlastRadius, megaBlastForce, [index1, index2]);
              
              this.awardPoints("Black hole collapsed!", GAME_BALANCE.scoring.blackHoleCollapsed, 3000);
            } else {
              // Create enhanced black hole
              const blastRadius = 120 + Math.random() * 40;
              const blastForce = 4 + Math.random() * 2;
              
              this.createParticles(explosionX, explosionY, "hsl(280, 100%, 80%)", 35);
              this.createParticles(explosionX, explosionY, "hsl(300, 100%, 90%)", 25);
              this.createParticles(explosionX, explosionY, "hsl(320, 100%, 70%)", 20);
              this.createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
              
              // Determine color
              let blackholeColor = "hsl(280, 100%, 20%)";
              if (combinedRadius > 100) {
                blackholeColor = "hsl(300, 100%, 15%)";
              } else if (combinedRadius > 80) {
                blackholeColor = "hsl(290, 100%, 18%)";
              }
              
              // Create the enhanced black hole
              this.state.planets.push({
                id: `planet_${++this.state.planetIdCounter}`,
                x: explosionX,
                y: explosionY,
                vx: (planet1.vx + planet2.vx) / 2 * 0.9,
                vy: (planet1.vy + planet2.vy) / 2 * 0.9,
                radius: combinedRadius,
                mass: combinedMass,
                type: "blackhole",
                color: blackholeColor,
                rotation: 0,
                rotationSpeed: Math.max(0.02, 0.08 - (combinedRadius / 1000)),
                gravityMultiplier: combinedGravity,
                health: 300,
                maxHealth: 300
              });
              
              this.awardPoints("Black hole merger!", 100, 2000);
            }
            
            // Remove both original blackholes
            const indicesToRemove = [index1, index2].sort((a, b) => b - a);
            indicesToRemove.forEach(idx => this.state.planets.splice(idx, 1));
            return;
          }
          
          // Planet2-Blackhole interactions
          if ((planet1.type === "planet2" && planet2.type === "blackhole") || 
              (planet1.type === "blackhole" && planet2.type === "planet2")) {
            const planet2Obj = planet1.type === "planet2" ? planet1 : planet2;
            const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
            
            // Create orbital effect
            const normalX = dx / dist;
            const normalY = dy / dist;
            const orbitStrength = 0.5;
            
            planet2Obj.vx += -normalY * orbitStrength;
            planet2Obj.vy += normalX * orbitStrength;
            
            this.createParticles(planet2Obj.x, planet2Obj.y, "hsl(180, 100%, 50%)", 3);
            return;
          }
        }
      });
    });
  }

  /**
   * Debris scrap spawning system - debris periodically drops small scrap
   */
  private updateDebrisScrapSpawning(): void {
    const now = Date.now();
    
    this.state.planets.forEach((planet) => {
      if (planet.type === "debris") {
        // Initialize lastScrapSpawn if not exists
        if (!planet.lastScrapSpawn) {
          planet.lastScrapSpawn = now;
        }
        
        // Spawn scrap every 5-10 seconds, adjusted by difficulty
        const baseScrapInterval =
          GAME_BALANCE.pickups.debrisScrap.baseIntervalMs +
          Math.random() * GAME_BALANCE.pickups.debrisScrap.randomIntervalMs;
        const scrapSpawnInterval = baseScrapInterval / this.difficultyConfig.scrapSpawnMultiplier / (1 + this.state.difficulty * 0.2);
        
        if (now - planet.lastScrapSpawn > scrapSpawnInterval) {
          // Create a small scrap object
          const scrapLifespan = 180 + Math.random() * 120; // 3-5 seconds at 60fps
          const scrap: Scrap = {
            x: planet.x + (Math.random() - 0.5) * 20,
            y: planet.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: (8 + Math.random() * 6) * this.mobileScaleFactor,
            lifespan: scrapLifespan,
            maxLifespan: scrapLifespan,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0.02 + Math.random() * 0.04
          };
          
          this.state.scraps.push(scrap);
          planet.lastScrapSpawn = now;
        }
      }
    });
  }

  /**
   * Check bullet collisions with obstacles
   */
  public checkBulletCollisions(): void {
    this.state.bullets = this.state.bullets.filter(bullet => {
      let bulletHit = false;
      
      // Check bullet-planet collisions
      this.state.planets.forEach(planet => {
        if (bulletHit) return;
        
        // Simple circle collision detection (optimized with squared distance)
        const dx = bullet.x - planet.x;
        const dy = bullet.y - planet.y;
        const distSq = dx * dx + dy * dy;
        const minDist = bullet.radius + planet.radius;
        
        if (distSq < minDist * minDist) {
          bulletHit = true;
          
          // Calculate damage (purple bullets do 50% more)
          const damage = bullet.isPurple
            ? GAME_BALANCE.combat.bulletDamage[planet.type] * GAME_BALANCE.combat.purpleBulletDamageMultiplier
            : GAME_BALANCE.combat.bulletDamage[planet.type];
          
          planet.health = (planet.health || planet.maxHealth || 100) - damage;
          
          // Apply knockback force (INCREASED for more satisfying shooting)
          const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
          if (bulletSpeed > 0) {
            const bulletDirX = bullet.vx / bulletSpeed;
            const bulletDirY = bullet.vy / bulletSpeed;
            const knockbackStrength = (damage * 0.75) / Math.sqrt(planet.mass);
            planet.vx += bulletDirX * knockbackStrength;
            planet.vy += bulletDirY * knockbackStrength;
          }
          
          // Flash white briefly to indicate damage
          planet.flashUntil = Date.now() + 80;
          
          this.createParticles(bullet.x, bullet.y, "hsl(200, 100%, 70%)", 5);
          
          // Check if destroyed
          if (planet.health <= 0) {
            const planetIndex = this.state.planets.indexOf(planet);
            if (planetIndex > -1) {
              // Award points based on type
              const points = GAME_BALANCE.scoring.destroyedObstacle[planet.type];
              
              this.awardPoints(`Destroyed ${planet.type}!`, points, 1500);
              this.createParticles(planet.x, planet.y, planet.color, 30);
              
              // Play explosion sound (with rate limiting)
              const now = Date.now();
              if (now - this.lastExplosionSound > this.EXPLOSION_COOLDOWN) {
                this.callbacks.onPlaySound('explosion');
                this.lastExplosionSound = now;
              }
              
              this.state.planets.splice(planetIndex, 1);
            }
          }
        }
      });
      
      // Check bullet-scrap collisions
      this.state.scraps.forEach(scrap => {
        if (bulletHit) return;
        
        const dx = bullet.x - scrap.x;
        const dy = bullet.y - scrap.y;
        const distSq = dx * dx + dy * dy;
        const minDist = bullet.radius + scrap.radius;
        
        if (distSq < minDist * minDist) {
          bulletHit = true;
          const scrapIndex = this.state.scraps.indexOf(scrap);
          if (scrapIndex > -1) {
            this.createParticles(bullet.x, bullet.y, "hsl(30, 100%, 60%)", 5);
            this.state.scraps.splice(scrapIndex, 1);
          }
        }
      });
      
      return !bulletHit; // Keep bullet if it didn't hit anything
    });
  }

  /**
   * Check ship collisions with planets and near-misses
   */
  public checkShipCollisions(): void {
    // Update invulnerability frames
    if (this.state.invulnerable > 0) {
      // Play vulnerable blink sound at intervals
      if (this.state.invulnerable % 10 === 0) {
        this.callbacks.onPlaySound('vulnerableBlink');
      }
      this.state.invulnerable--;
    } else {
      // Check planet collisions (only when not invulnerable)
      this.state.planets.forEach(planet => {
        const dx = planet.x - this.state.ship.x;
        const dy = planet.y - this.state.ship.y;
        const distSq = dx * dx + dy * dy;
        const minDist = planet.radius + this.state.ship.radius;
        
        if (distSq < minDist * minDist) {
          // Collision! Apply damage
          this.createParticles(this.state.ship.x, this.state.ship.y, "hsl(0, 100%, 50%)", 20);
          this.state.invulnerable = 120;
          this.callbacks.onPlaySound('shieldActivate');
          this.state.shake = 20;
          
          // Trigger damage callback (GameCanvas handles health/shield/game over logic)
          this.callbacks.onTakeDamage(1.0); // 33% damage (1 full health point)
        }
      });

      // Near-miss detection for high-speed planets
      this.state.planets.forEach(planet => {
        const dx = planet.x - this.state.ship.x;
        const dy = planet.y - this.state.ship.y;
        const distSq = dx * dx + dy * dy;
        
        // Calculate planet speed
        const planetSpeed = Math.sqrt(planet.vx * planet.vx + planet.vy * planet.vy);
        const highSpeedThreshold = 8;
        
        // Near-miss range: just outside collision range (optimized with squared distance)
        const collisionRange = planet.radius + this.state.ship.radius;
        const nearMissRange = collisionRange * 1.6;
        const collisionRangeSq = collisionRange * collisionRange;
        const nearMissRangeSq = nearMissRange * nearMissRange;
        
        // Award near-miss for high-speed objects (once per planet)
        if (distSq > collisionRangeSq && distSq < nearMissRangeSq && planetSpeed > highSpeedThreshold) {
          if (!this.state.nearMissTracker.has(planet.id)) {
            this.state.nearMissTracker.set(planet.id, Date.now());
            
            // Track near-miss for achievements
            this.callbacks.onTrackNearMiss();
            
            // Calculate points based on planet type and speed
            let nearMissPoints = Math.round(100 + (planetSpeed * 10));
            let planetTypeName = "high-speed obstacle";
            
            switch (planet.type) {
              case "blackhole":
                nearMissPoints = Math.round(200 + (planetSpeed * 15));
                planetTypeName = "hurled black hole";
                break;
              case "meteor":
                nearMissPoints = Math.round(150 + (planetSpeed * 12));
                planetTypeName = "hurled meteor";
                break;
              case "planet2":
                nearMissPoints = Math.round(120 + (planetSpeed * 10));
                planetTypeName = "hurled planet";
                break;
              case "debris":
                nearMissPoints = Math.round(80 + (planetSpeed * 8));
                planetTypeName = "hurled debris";
                break;
            }
            
            // Create dramatic particles and award points
            this.createParticles(this.state.ship.x, this.state.ship.y, "hsl(45, 100%, 60%)", 15);
            this.createParticles(planet.x, planet.y, "hsl(200, 100%, 70%)", 8);
            
            // Play star acquire sound (with rate limiting)
            const now = Date.now();
            if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
              this.callbacks.onPlaySound('starAcquire');
              this.lastStarAcquireSound = now;
            }
            
            this.awardPoints(`High-speed near miss!`, nearMissPoints, 2000);
          }
        }
      });
    }
  }

  /**
   * Check collisions between ship and collectibles
   */
  public checkCollectibleCollisions(): void {
    // Star collection
    this.state.stars.forEach(star => {
      if (!star.collected) {
        const dx = star.x - this.state.ship.x;
        const dy = star.y - this.state.ship.y;
        const distSq = dx * dx + dy * dy;
        const acquisitionRadius = 35 * this.mobileScaleFactor;
        
        if (distSq < acquisitionRadius * acquisitionRadius) {
          star.collected = true;
          this.createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 15);
          
          // Get star value based on current ship level
          const starValue = this.getStarValue(this.state.score);
          const starLevel = this.state.shipLevel;

          // Award points and play sound
          this.awardPoints(`Lvl ${starLevel} Star Collected!`, starValue, 1500);
          
          // Play star acquire sound (with rate limiting)
          const now = Date.now();
          if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
            this.callbacks.onPlaySound('starAcquire');
            this.lastStarAcquireSound = now;
          }
        }
      }
    });

    // Remove collected stars
    this.state.stars = this.state.stars.filter(star => !star.collected);
    
    // Health wrench collection
    this.state.healthWrenches.forEach(wrench => {
      if (!wrench.collected) {
        const dx = wrench.x - this.state.ship.x;
        const dy = wrench.y - this.state.ship.y;
        const distSq = dx * dx + dy * dy;
        const acquisitionRadius = 40 * this.mobileScaleFactor;
        
        if (distSq < acquisitionRadius * acquisitionRadius) {
          wrench.collected = true;
          
          // Create green healing particles (engine handles visual effects)
          this.createParticles(wrench.x, wrench.y, "hsl(120, 100%, 50%)", 20);
          this.createParticles(wrench.x, wrench.y, "hsl(140, 100%, 70%)", 15);
          
          // Trigger health restoration callback (handles React state: health, shield)
          this.callbacks.onHealthWrenchCollected(wrench.x, wrench.y);
          }
        }
      });
    
    // Remove collected wrenches
    this.state.healthWrenches = this.state.healthWrenches.filter(w => !w.collected);
    
    // Ammo power-up collection
    this.state.ammoPowerUps.forEach(powerUp => {
      if (!powerUp.collected) {
        const dx = powerUp.x - this.state.ship.x;
        const dy = powerUp.y - this.state.ship.y;
        const distSq = dx * dx + dy * dy;
        const minDist = this.state.ship.radius + powerUp.radius;
        
        if (distSq < minDist * minDist) {
          powerUp.collected = true;
          
          // Trigger ammo power-up callback (handles React state: ammo, recharge, unlimited)
          this.callbacks.onAmmoPowerUpCollected();
          }
        }
      });
    
    // Remove collected power-ups
    this.state.ammoPowerUps = this.state.ammoPowerUps.filter(p => !p.collected);
    
    // Void Wipe collection
    this.state.voidWipes.forEach(voidWipe => {
      if (!voidWipe.collected) {
        const dx = voidWipe.x - this.state.ship.x;
        const dy = voidWipe.y - this.state.ship.y;
        const distSq = dx * dx + dy * dy;
        const minDist = this.state.ship.radius + voidWipe.radius;
        
        if (distSq < minDist * minDist) {
          voidWipe.collected = true;
          
          // Create massive purple particle explosion
          this.createParticles(voidWipe.x, voidWipe.y, "hsl(270, 100%, 70%)", 100);
          this.createParticles(this.state.ship.x, this.state.ship.y, "hsl(270, 100%, 50%)", 50);
          
          // Destroy ALL obstacles with explosions
          this.state.planets.forEach(planet => {
            this.createParticles(planet.x, planet.y, planet.color, 30);
            this.createParticles(planet.x, planet.y, "hsl(270, 100%, 60%)", 20);
          });
          
          // Clear all obstacles
          this.state.planets = [];
          
          // Screen shake effect for dramatic impact
          this.state.shake = 15;
          
          // Set respite period - prevent new obstacles from spawning for 3 seconds
          this.lastVoidWipeCollected = Date.now();
          
          // Trigger void wipe callback (handles React state: score, notifications, sounds)
          this.callbacks.onVoidWipeCollected(voidWipe.x, voidWipe.y);
        }
      }
    });
    
    // Remove collected void wipes
    this.state.voidWipes = this.state.voidWipes.filter(v => !v.collected);
    
    // Scrap collection/damage
    // Note: Scrap damage handling will be done in Phase 8 (Ship-Planet Collisions)
    // For now, just handle safe collection
    this.state.scraps = this.state.scraps.filter(scrap => {
      const dx = scrap.x - this.state.ship.x;
      const dy = scrap.y - this.state.ship.y;
      const distSq = dx * dx + dy * dy;
      
      const collectionRadius = (scrap.radius + this.state.ship.radius) * 1.5;
      const damageRadius = scrap.radius + this.state.ship.radius;
      const collectionRadiusSq = collectionRadius * collectionRadius;
      const damageRadiusSq = damageRadius * damageRadius;
      
      if (distSq < collectionRadiusSq && distSq >= damageRadiusSq) {
        // Safe collection for points
        this.createParticles(scrap.x, scrap.y, "hsl(0, 0%, 100%)", 12);
        
        // Play star acquire sound (with rate limiting)
        const now = Date.now();
        if (now - this.lastStarAcquireSound > this.STAR_ACQUIRE_COOLDOWN) {
          this.callbacks.onPlaySound('starAcquire');
          this.lastStarAcquireSound = now;
        }
        
        this.awardPoints("Scrap collected!", GAME_BALANCE.scoring.scrapCollected, 1500);
        return false; // Remove scrap
      } else if (distSq < damageRadiusSq && this.state.invulnerable === 0) {
        // Collision damage (only if not invulnerable)
        this.createParticles(this.state.ship.x, this.state.ship.y, "hsl(30, 80%, 60%)", 8);
        this.state.invulnerable = 60;
        this.state.shake = 8;
        this.callbacks.onPlaySound('shieldActivate');
        // Trigger damage callback (15% damage)
        this.callbacks.onTakeDamage(0.45);
        return false; // Remove scrap
      }
      
      return true; // Keep scrap
    });
  }

  /**
   * Calculate star value based on current score (ship level)
   */
  private getStarValue(currentScore: number): number {
    if (currentScore >= GAME_BALANCE.upgrades.level3Score) {
      return GAME_BALANCE.scoring.starByShipLevel.level3;
    } else if (currentScore >= GAME_BALANCE.upgrades.level2Score) {
      return GAME_BALANCE.scoring.starByShipLevel.level2;
    } else {
      return GAME_BALANCE.scoring.starByShipLevel.level1;
    }
  }

  /**
   * Award points with combo system
   */
  private awardPoints(message: string, basePoints: number, duration: number = 1500): void {
    const now = Date.now();
    const COMBO_WINDOW = 3000; // 3 seconds to keep combo going
    
    // Reset combo if too much time has passed
    if (now - this.state.lastComboTime > COMBO_WINDOW) {
      this.state.comboCount = 0;
    }
    
    // Increment combo
    this.state.comboCount++;
    this.state.lastComboTime = now;
    
    // Calculate multiplier (1.0 to 3.0 based on combo)
    const multiplier = Math.min(1.0 + (this.state.comboCount - 1) * 0.2, 3.0);
    const finalPoints = Math.floor(basePoints * multiplier);
    
    // Update score
    this.state.score += finalPoints;
    
    // Format message with combo info if combo > 1
    let formattedMessage = message;
    if (this.state.comboCount > 1) {
      formattedMessage = `${message} (x${multiplier.toFixed(1)} Combo!)`;
    }
    
    // Show toast
    this.callbacks.onShowToast(formattedMessage, finalPoints, {
      duration,
      className: 'text-blue-400 glow-blue font-bold font-sans transition-colors duration-300'
    });
    
    // Notify score change
    this.callbacks.onScoreChange(this.state.score);
    
    // Ship upgrades now checked in main update loop every frame
  }

  /**
   * Check if ship should upgrade based on score
   */
  private checkShipUpgrades(): void {
    if (this.state.score >= GAME_BALANCE.upgrades.level3Score && this.state.shipLevel < 3) {
      this.state.shipLevel = 3;
      this.callbacks.onShipUpgrade(3);
    } else if (this.state.score >= GAME_BALANCE.upgrades.level2Score && this.state.shipLevel < 2) {
      this.state.shipLevel = 2;
      this.callbacks.onShipUpgrade(2);
    }
  }

  /**
   * Spawn a planet/obstacle from a random edge
   */
  public spawnPlanet(planetType: "debris" | "meteor" | "planet2" | "blackhole"): void {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: x = Math.random() * this.canvasWidth; y = -50; break;
      case 1: x = this.canvasWidth + 50; y = Math.random() * this.canvasHeight; break;
      case 2: x = Math.random() * this.canvasWidth; y = this.canvasHeight + 50; break;
      default: x = -50; y = Math.random() * this.canvasHeight;
    }

    const colors = ["hsl(180, 100%, 50%)", "hsl(320, 100%, 50%)", "hsl(280, 100%, 50%)"];
    
    const planet: Planet = {
      id: `planet_${++this.state.planetIdCounter}`,
      x, y,
      vx: (this.canvasWidth / 2 - x) * 0.0005,
      vy: (this.canvasHeight / 2 - y) * 0.0005,
      radius: (32 + Math.random() * 25) * this.mobileScaleFactor,
      mass: 1000 + Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: planetType
    };

    if (planetType === "meteor") {
      planet.rotation = 0;
      planet.rotationSpeed = 0.005 + Math.random() * 0.015;
    } else if (planetType === "planet2") {
      planet.vx *= 1.5;
      planet.vy *= 1.5;
      planet.rotation = 0;
      planet.rotationSpeed = 0.02 + Math.random() * 0.03;
      planet.radius = (26 + Math.random() * 18) * this.mobileScaleFactor;
      planet.mass = 800 + Math.random() * 1500;
    } else if (planetType === "blackhole") {
      planet.vx *= 0.3;
      planet.vy *= 0.3;
      planet.rotation = 0;
      planet.rotationSpeed = 0.01 + Math.random() * 0.02;
      planet.radius = (42 + Math.random() * 30) * this.mobileScaleFactor;
      planet.mass = 2500 + Math.random() * 3000;
      planet.gravityMultiplier = 2.5 + Math.random() * 1.5;
      planet.color = "hsl(270, 50%, 20%)";
    } else if (planetType === "debris") {
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

      // Initialize health based on type
      // Health values are based on obstacle type difficulty
      planet.health = GAME_BALANCE.combat.obstacleHealth[planet.type];
      planet.maxHealth = planet.health;

    this.state.planets.push(planet);
  }

  /**
   * Spawn a collectible star
   */
  public spawnStar(): void {
    this.state.stars.push({
      x: Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight,
      vx: 0,
      vy: 0,
      radius: 6 * this.mobileScaleFactor,
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }

  /**
   * Spawn a health wrench pickup
   */
  public spawnHealthWrench(): void {
    // Spawn away from ship to avoid instant collection (optimized with squared distance)
    let x, y;
    const minDistSq = 150 * 150;
    do {
      x = Math.random() * this.canvasWidth;
      y = Math.random() * this.canvasHeight;
    } while ((x - this.state.ship.x) ** 2 + (y - this.state.ship.y) ** 2 < minDistSq);

    this.state.healthWrenches.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 20 * this.mobileScaleFactor,
      collected: false,
      pulsePhase: 0
    });
  }

  /**
   * Spawn an ammo power-up
   */
  public spawnAmmoPowerUp(): void {
    // Spawn away from ship to avoid instant collection (optimized with squared distance)
    let x, y;
    const minDistSq = 200 * 200;
    do {
      x = Math.random() * this.canvasWidth;
      y = Math.random() * this.canvasHeight;
    } while ((x - this.state.ship.x) ** 2 + (y - this.state.ship.y) ** 2 < minDistSq);

    this.state.ammoPowerUps.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 18 * this.mobileScaleFactor,
      collected: false,
      pulsePhase: 0
    });
  }

  /**
   * Spawn a void wipe power-up (clears all obstacles)
   */
  public spawnVoidWipe(): void {
    // Spawn away from ship to avoid instant collection (optimized with squared distance)
    let x, y;
    const minDistSq = 200 * 200;
    do {
      x = Math.random() * this.canvasWidth;
      y = Math.random() * this.canvasHeight;
    } while ((x - this.state.ship.x) ** 2 + (y - this.state.ship.y) ** 2 < minDistSq);

    const voidWipe: VoidWipe = {
      x,
      y,
      vx: 0,
      vy: 0,
      radius: GAME_BALANCE.pickups.voidWipe.radius * this.mobileScaleFactor,
      collected: false,
      pulsePhase: 0
    };

    this.state.voidWipes.push(voidWipe);
  }

  /**
   * Create particle effects at a specific location (OPTIMIZED with pooling)
   */
  private createParticles(x: number, y: number, color: string, count = 10): void {
    this.particlePool.createBurst(x, y, color, count, ANGLE_LUT);
  }

  /**
   * Create an explosion effect with blast radius damage
   */
  private createExplosion(
    x: number, 
    y: number, 
    blastRadius: number, 
    force: number, 
    excludeIndices: number[] = []
  ): void {
    // Create explosion particles
    this.createParticles(x, y, "hsl(0, 100%, 70%)", 25);
    this.createParticles(x, y, "hsl(30, 100%, 80%)", 20);
    this.createParticles(x, y, "hsl(60, 100%, 90%)", 15);
    
    // Apply blast force to nearby obstacles (optimized with early rejection)
    const blastRadiusSq = blastRadius * blastRadius;
    
    this.state.planets.forEach((planet, index) => {
      if (excludeIndices.includes(index)) return;
      
      const dx = planet.x - x;
      const dy = planet.y - y;
      const distSq = dx * dx + dy * dy;
      
      // Early rejection with squared distance
      if (distSq >= blastRadiusSq || distSq === 0) return;
      
      const dist = Math.sqrt(distSq); // Only calculate sqrt for planets within radius
      
      if (true) { // Kept for structure, condition already checked above
        const normalX = dx / dist;
        const normalY = dy / dist;
        const blastForce = force * (1 - dist / blastRadius); // Force decreases with distance
        
        planet.vx += normalX * blastForce;
        planet.vy += normalY * blastForce;
        
        // Create impact particles on affected obstacles
        this.createParticles(planet.x, planet.y, "hsl(45, 100%, 60%)", 5);
        
        // Chain reaction: if it's a meteor or debris, it might explode too
        if ((planet.type === "meteor" || planet.type === "debris") && blastForce > 1.5) {
          setTimeout(() => {
            const planetStillExists = this.state.planets.includes(planet);
            if (planetStillExists && Math.random() < 0.3) { // 30% chance of chain explosion
              const planetIndex = this.state.planets.indexOf(planet);
              if (planetIndex !== -1) {
                this.createExplosion(planet.x, planet.y, blastRadius * 0.7, force * 0.6, [planetIndex]);
                // Clean up nearMissTracker for removed planet
                this.state.nearMissTracker.delete(planet.id);
                this.state.planets.splice(planetIndex, 1);
              }
            }
          }, 100 + Math.random() * 200); // Random delay for chain reaction
        }
      }
    });
  }
}
