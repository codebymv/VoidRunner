import { StarField } from "@/utils/StarField";

/**
 * Renderer class - Handles all canvas drawing operations
 * Separated from game logic for clean architecture
 */
export class Renderer {
  // Image references
  private shipIdleImg: HTMLImageElement;
  private shipThrustImg: HTMLImageElement;
  private ship2IdleImg: HTMLImageElement;
  private ship2ThrustImg: HTMLImageElement;
  private ship3IdleImg: HTMLImageElement;
  private ship3ThrustImg: HTMLImageElement;
  private meteorImg: HTMLImageElement;
  private planet2Img: HTMLImageElement;
  private blackholeImg: HTMLImageElement;
  private debrisImg: HTMLImageElement;
  private scrapImg: HTMLImageElement;
  private starImg: HTMLImageElement;
  private starUpgradeImg: HTMLImageElement;
  private starUpgrade2Img: HTMLImageElement;
  private healthWrenchImg: HTMLImageElement;
  private unlimitedAmmoImg: HTMLImageElement;
  private voidWipeImg: HTMLImageElement;
  private shieldImg: HTMLImageElement;
  
  // StarField reference
  private starField: StarField | null = null;
  
  // Canvas dimensions
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor() {
    // Initialize all images (they'll be loaded via the component's img refs)
    this.shipIdleImg = new Image();
    this.shipThrustImg = new Image();
    this.ship2IdleImg = new Image();
    this.ship2ThrustImg = new Image();
    this.ship3IdleImg = new Image();
    this.ship3ThrustImg = new Image();
    this.meteorImg = new Image();
    this.planet2Img = new Image();
    this.blackholeImg = new Image();
    this.debrisImg = new Image();
    this.scrapImg = new Image();
    this.starImg = new Image();
    this.starUpgradeImg = new Image();
    this.starUpgrade2Img = new Image();
    this.healthWrenchImg = new Image();
    this.unlimitedAmmoImg = new Image();
    this.shieldImg = new Image();
  }

  /**
   * Set image references from the component's loaded images
   */
  public setImages(images: {
    shipIdle: HTMLImageElement;
    shipThrust: HTMLImageElement;
    ship2Idle: HTMLImageElement;
    ship2Thrust: HTMLImageElement;
    ship3Idle: HTMLImageElement;
    ship3Thrust: HTMLImageElement;
    meteor: HTMLImageElement;
    planet2: HTMLImageElement;
    blackhole: HTMLImageElement;
    debris: HTMLImageElement;
    scrap: HTMLImageElement;
    star: HTMLImageElement;
    starUpgrade: HTMLImageElement;
    starUpgrade2: HTMLImageElement;
    healthWrench: HTMLImageElement;
    unlimitedAmmo: HTMLImageElement;
    voidWipe: HTMLImageElement;
    shield: HTMLImageElement;
  }): void {
    this.shipIdleImg = images.shipIdle;
    this.shipThrustImg = images.shipThrust;
    this.ship2IdleImg = images.ship2Idle;
    this.ship2ThrustImg = images.ship2Thrust;
    this.ship3IdleImg = images.ship3Idle;
    this.ship3ThrustImg = images.ship3Thrust;
    this.meteorImg = images.meteor;
    this.planet2Img = images.planet2;
    this.blackholeImg = images.blackhole;
    this.debrisImg = images.debris;
    this.scrapImg = images.scrap;
    this.starImg = images.star;
    this.starUpgradeImg = images.starUpgrade;
    this.starUpgrade2Img = images.starUpgrade2;
    this.healthWrenchImg = images.healthWrench;
    this.unlimitedAmmoImg = images.unlimitedAmmo;
    this.voidWipeImg = images.voidWipe;
    this.shieldImg = images.shield;
  }

  /**
   * Set StarField reference
   */
  public setStarField(starField: StarField): void {
    this.starField = starField;
  }

  /**
   * Update canvas dimensions
   */
  public setDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Main render method - draws the entire game state to the canvas
   * @param ctx - Canvas 2D context
   * @param state - Current game state from GameEngine
   * @param renderOptions - Additional rendering options (score, health, UI state, etc.)
   */
  public render(
    ctx: CanvasRenderingContext2D,
    state: any, // We'll type this properly as we migrate
    renderOptions: any // Additional UI state needed for rendering
  ): void {
    // Phase 2: Background and StarField
    this.renderBackground(ctx, state, renderOptions);
    
    // Phase 3: Particles
    this.renderParticles(ctx, state);
    
    // Phase 4: Bullets
    this.renderBullets(ctx, state, renderOptions);
    
    // Phase 5: Planets/Obstacles
    this.renderPlanets(ctx, state);
    
    // Phase 6: Stars
    this.renderStars(ctx, state, renderOptions);
    
    // Phase 7: Scrap/Health/Ammo pickups
    this.renderPickups(ctx, state, renderOptions);
    
    // Phase 8: Ship (trails + sprite + shield)
    this.renderShip(ctx, state, renderOptions);
    
    // Phase 9 will add UI overlays
  }

  /**
   * Phase 2: Render background and starfield
   */
  private renderBackground(ctx: CanvasRenderingContext2D, state: any, options: any): void {
    // Clear canvas with solid background
    ctx.fillStyle = "rgb(10, 10, 20)"; // Solid background to prevent trails
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Render StarField background with ship level theming
    if (this.starField && state.ship) {
      // Determine ship level based on score
      const score = options.score || 0;
      const shipLevel = score >= 12500 ? 3 : score >= 1500 ? 2 : 1;
      
      this.starField.setCameraPosition(state.ship.x, state.ship.y);
      this.starField.update(options.delta || 1, shipLevel);
      this.starField.render();
    }
  }

  /**
   * Phase 3: Render particles
   */
  private renderParticles(ctx: CanvasRenderingContext2D, state: any): void {
    if (!state.particles || state.particles.length === 0) return;
    
    state.particles.forEach((p: any) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /**
   * Phase 4: Render bullets
   */
  private renderBullets(ctx: CanvasRenderingContext2D, state: any, options: any): void {
    if (!state.bullets || state.bullets.length === 0) return;
    
    const isUnlimitedAmmo = options.isUnlimitedAmmo || false;
    
    state.bullets.forEach((bullet: any) => {
      // Calculate fade based on lifetime
      const lifetimePercent = bullet.lifetime / bullet.maxLifetime;
      const opacity = 1 - lifetimePercent * 0.5; // Fade out as it ages

      ctx.save();
      
      // Choose color based on bullet type and unlimited ammo state
      const isPurple = bullet.isPurple || false;
      const glowColor = isUnlimitedAmmo
        ? `rgba(192, 192, 192, ${opacity})` // Silver glow (unlimited ammo)
        : isPurple 
        ? `rgba(168, 85, 247, ${opacity})` // Purple glow
        : `rgba(96, 165, 250, ${opacity})`; // Blue glow
      const coreColor = isUnlimitedAmmo
        ? `rgba(211, 211, 211, ${opacity})` // Light silver
        : isPurple
        ? `rgba(192, 132, 252, ${opacity})` // Light purple
        : `rgba(147, 197, 253, ${opacity})`; // Light blue
      const centerColor = isUnlimitedAmmo
        ? `rgba(245, 245, 245, ${opacity})` // Very light silver/white
        : isPurple
        ? `rgba(233, 213, 255, ${opacity})` // Very light purple/white
        : `rgba(224, 242, 254, ${opacity})`; // Very light blue/white
      
      // Glow effect
      ctx.shadowBlur = isUnlimitedAmmo ? 25 : isPurple ? 20 : 15;
      ctx.shadowColor = glowColor;
      
      // Draw bullet core
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw brighter center
      ctx.fillStyle = centerColor;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw motion trail
      const trailLength = 8;
      const angle = Math.atan2(bullet.vy, bullet.vx);
      const trailX = bullet.x - Math.cos(angle) * trailLength;
      const trailY = bullet.y - Math.sin(angle) * trailLength;
      
      const trailColor = isUnlimitedAmmo
        ? '192, 192, 192' // Silver trail
        : isPurple ? '168, 85, 247' : '96, 165, 250';
      const gradient = ctx.createLinearGradient(bullet.x, bullet.y, trailX, trailY);
      gradient.addColorStop(0, `rgba(${trailColor}, ${opacity * 0.8})`);
      gradient.addColorStop(1, `rgba(${trailColor}, 0)`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = bullet.radius * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y);
      ctx.lineTo(trailX, trailY);
      ctx.stroke();
      
      ctx.restore();
    });
  }

  /**
   * Phase 5: Render planets and obstacles
   */
  private renderPlanets(ctx: CanvasRenderingContext2D, state: any): void {
    if (!state.planets || state.planets.length === 0) return;
    
    state.planets.forEach((planet: any) => {
      if (planet.type === "meteor" && this.meteorImg && this.meteorImg.complete) {
        // Render meteor sprite with rotation
        ctx.save();
        ctx.translate(planet.x, planet.y);
        if (planet.rotation !== undefined) {
          ctx.rotate(planet.rotation);
        }
        
        const spriteSize = planet.radius * 2;
        ctx.drawImage(
          this.meteorImg,
          -spriteSize / 2,
          -spriteSize / 2,
          spriteSize,
          spriteSize
        );
        ctx.restore();
      } else if (planet.type === "planet2" && this.planet2Img && this.planet2Img.complete) {
        // Render planet2 sprite with rotation
        ctx.save();
        ctx.translate(planet.x, planet.y);
        if (planet.rotation !== undefined) {
          ctx.rotate(planet.rotation);
        }
        
        const spriteSize = planet.radius * 2;
        ctx.drawImage(
          this.planet2Img,
          -spriteSize / 2,
          -spriteSize / 2,
          spriteSize,
          spriteSize
        );
        ctx.restore();
      } else if (planet.type === "debris" && this.debrisImg && this.debrisImg.complete) {
        // Render debris sprite with slow rotation
        ctx.save();
        ctx.translate(planet.x, planet.y);
        if (planet.rotation !== undefined) {
          ctx.rotate(planet.rotation);
        }
        
        const spriteSize = planet.radius * 2;
        ctx.drawImage(
          this.debrisImg,
          -spriteSize / 2,
          -spriteSize / 2,
          spriteSize,
          spriteSize
        );
        ctx.restore();
      } else if (planet.type === "blackhole" && this.blackholeImg && this.blackholeImg.complete) {
        // Render blackhole sprite with rotation and special effects
        ctx.save();
        
        // Add a dark gravitational field effect around the blackhole
        const gradient = ctx.createRadialGradient(planet.x, planet.y, 0, planet.x, planet.y, planet.radius * 2);
        gradient.addColorStop(0, "rgba(75, 0, 130, 0.8)"); // Dark purple center
        gradient.addColorStop(0.5, "rgba(75, 0, 130, 0.4)"); // Fading purple
        gradient.addColorStop(1, "rgba(75, 0, 130, 0)"); // Transparent edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Render the blackhole sprite with rotation
        ctx.translate(planet.x, planet.y);
        if (planet.rotation !== undefined) {
          ctx.rotate(planet.rotation);
        }
        
        const spriteSize = planet.radius * 2;
        ctx.drawImage(
          this.blackholeImg,
          -spriteSize / 2,
          -spriteSize / 2,
          spriteSize,
          spriteSize
        );
        ctx.restore();
      } else {
        // Render regular planet (fallback)
        ctx.shadowBlur = 20;
        ctx.shadowColor = planet.color;
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Apply white flash effect to damaged obstacles
    state.planets.forEach((planet: any) => {
      if (planet.flashUntil && Date.now() < planet.flashUntil) {
        ctx.save();
        
        // Draw a bright white radial flash at the center
        const flashRadius = planet.radius * 0.4; // 40% of obstacle size for central flash
        const gradient = ctx.createRadialGradient(
          planet.x, planet.y, 0,
          planet.x, planet.y, flashRadius
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)"); // Very bright white center
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.6)"); // Fade mid-way
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Transparent edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, flashRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  /**
   * Phase 6: Render stars
   */
  private renderStars(ctx: CanvasRenderingContext2D, state: any, options: any): void {
    if (!state.stars || state.stars.length === 0) return;
    
    const score = options.score || 0;
    
    state.stars.forEach((star: any) => {
      ctx.save();
      ctx.shadowBlur = 15;
      
      // Update pulse phase for animation
      star.pulsePhase = (star.pulsePhase || 0) + 0.1;
      const pulseScale = 1 + Math.sin(star.pulsePhase) * 0.2;
      
      // Determine glow color and star sprite based on current score (ship level)
      let starImage: HTMLImageElement;
      let glowColor: string;
      if (score >= 12500) {
        // Ship level 3 - stars worth 1000 points - Purple glow
        starImage = this.starUpgrade2Img;
        glowColor = "hsl(280, 100%, 50%)";
      } else if (score >= 1500) {
        // Ship level 2 - stars worth 100 points - Red glow
        starImage = this.starUpgradeImg;
        glowColor = "hsl(0, 100%, 50%)";
      } else {
        // Ship level 1 - stars worth 10 points - Yellow glow
        starImage = this.starImg;
        glowColor = "hsl(60, 100%, 50%)";
      }
      
      ctx.shadowColor = glowColor;
      
      const spriteSize = star.radius * 4 * pulseScale; // Apply pulse scale
      ctx.drawImage(
        starImage,
        star.x - spriteSize / 2,
        star.y - spriteSize / 2,
        spriteSize,
        spriteSize
      );
      
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /**
   * Phase 7: Render pickups (scrap, health wrenches, ammo power-ups)
   */
  private renderPickups(ctx: CanvasRenderingContext2D, state: any, options: any): void {
    // Render scraps
    if (state.scraps && state.scraps.length > 0) {
      state.scraps.forEach((scrap: any) => {
        if (this.scrapImg && this.scrapImg.complete) {
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = "hsl(0, 0%, 90%)";
          ctx.translate(scrap.x, scrap.y);
          ctx.rotate(scrap.rotation);
          
          const fadeAlpha = Math.min(1, scrap.lifespan / (scrap.maxLifespan * 0.3));
          ctx.globalAlpha = fadeAlpha;
          
          const spriteSize = scrap.radius * 2;
          ctx.drawImage(this.scrapImg, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
          
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      });
    }
    
    // Render health wrenches
    if (state.healthWrenches && state.healthWrenches.length > 0) {
      state.healthWrenches.forEach((wrench: any) => {
        ctx.save();
        
        wrench.pulsePhase = (wrench.pulsePhase || 0) + 0.1;
        const pulseScale = 1 + Math.sin(wrench.pulsePhase) * 0.2;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = "hsl(120, 100%, 50%)";
        
        const spriteSize = wrench.radius * 2 * pulseScale;
        ctx.drawImage(this.healthWrenchImg, wrench.x - spriteSize / 2, wrench.y - spriteSize / 2, spriteSize, spriteSize);
        
        ctx.shadowBlur = 0;
        ctx.restore();
      });
    }
    
    // Render ammo power-ups
    if (state.ammoPowerUps && state.ammoPowerUps.length > 0) {
      state.ammoPowerUps.forEach((powerUp: any) => {
        if (powerUp.collected) return;
        
        ctx.save();
        
        powerUp.pulsePhase = (powerUp.pulsePhase || 0) + 1;
        const pulseScale = 1 + Math.sin(powerUp.pulsePhase * 0.1) * 0.2;
        const glowIntensity = 0.5 + Math.sin(powerUp.pulsePhase * 0.15) * 0.5;
        
        ctx.shadowBlur = 20 * pulseScale;
        ctx.shadowColor = `rgba(192, 192, 192, ${glowIntensity})`;
        
        if (this.unlimitedAmmoImg && this.unlimitedAmmoImg.complete) {
          const size = powerUp.radius * 2.5 * pulseScale;
          ctx.drawImage(this.unlimitedAmmoImg, powerUp.x - size / 2, powerUp.y - size / 2, size, size);
        }
        
        ctx.restore();
      });
    }
    
    // Render void wipes
    if (state.voidWipes && state.voidWipes.length > 0) {
      state.voidWipes.forEach((voidWipe: any) => {
        if (voidWipe.collected) return;
        
        ctx.save();
        
        voidWipe.pulsePhase = (voidWipe.pulsePhase || 0) + 1;
        const pulseScale = 1 + Math.sin(voidWipe.pulsePhase * 0.1) * 0.2; // Consistent with ammo power-up
        const glowIntensity = 0.5 + Math.sin(voidWipe.pulsePhase * 0.15) * 0.5; // Consistent with ammo power-up
        
        // Purple glow effect (same intensity as ammo, different color)
        ctx.shadowBlur = 20 * pulseScale;
        ctx.shadowColor = `rgba(147, 51, 234, ${glowIntensity})`; // Purple color
        
        if (this.voidWipeImg && this.voidWipeImg.complete) {
          const size = voidWipe.radius * 2.5 * pulseScale; // Same size multiplier as ammo power-up
          ctx.drawImage(this.voidWipeImg, voidWipe.x - size / 2, voidWipe.y - size / 2, size, size);
        }
        
        ctx.restore();
      });
    }
  }

  /**
   * Phase 8: Render ship (trails + sprite + shield)
   */
  private renderShip(ctx: CanvasRenderingContext2D, state: any, options: any): void {
    const { ship, shipTrails, invulnerable } = state;
    const { health, shield, isAccelerating, score, healthGlowEndTimeRef } = options;
    
    // Render ship trails
    shipTrails.forEach((trail: any) => {
      const alpha = trail.life * 0.5;
      const size = trail.life * 3;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#4f46e5'; // Purple trail color
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Ship shield (matches health meter color, or blue if overshield is active)
    if (invulnerable > 0 && invulnerable % 10 < 5) {
      ctx.save();
      
      // Use blue color if overshield is active, otherwise match health meter colors
      const shieldColor = shield > 0 ? '#3b82f6' :      // Blue for overshield
                         health >= 2.5 ? '#22c55e' :    // Green (full health)
                         health >= 1.5 ? '#eab308' :    // Yellow (medium health)
                         health > 0 ? '#ef4444' :       // Red (low health)
                         '#666666';                     // Gray for no health
      
      // Add extra glow for shield (blue)
      if (shield > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = shieldColor;
      }
      
      // Draw main shield circle
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw cracks based on health status
      const shieldRadius = ship.radius + 5;
      
      // Yellow (medium health) - a few cracks
      if (health >= 1.5 && health < 2.5 && shield === 0) {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = shieldColor;
        ctx.lineWidth = 2;
        
        // Draw 3-4 cracks
        const crackAngles = [0.3, 1.8, 3.5, 5.0];
        crackAngles.forEach(angle => {
          const startAngle = angle;
          const endAngle = angle + 0.4;
          ctx.beginPath();
          ctx.moveTo(
            ship.x + Math.cos(startAngle) * (shieldRadius - 3),
            ship.y + Math.sin(startAngle) * (shieldRadius - 3)
          );
          ctx.lineTo(
            ship.x + Math.cos(endAngle) * (shieldRadius + 3),
            ship.y + Math.sin(endAngle) * (shieldRadius + 3)
          );
          ctx.stroke();
        });
      }
      
      // Red (low health) - many cracks
      if (health > 0 && health < 1.5 && shield === 0) {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = shieldColor;
        ctx.lineWidth = 2;
        
        // Draw 8-10 cracks (more damaged)
        const crackAngles = [0.2, 0.9, 1.6, 2.3, 3.0, 3.7, 4.4, 5.1, 5.8];
        crackAngles.forEach(angle => {
          const startAngle = angle;
          const endAngle = angle + 0.5;
          ctx.beginPath();
          ctx.moveTo(
            ship.x + Math.cos(startAngle) * (shieldRadius - 4),
            ship.y + Math.sin(startAngle) * (shieldRadius - 4)
          );
          ctx.lineTo(
            ship.x + Math.cos(endAngle) * (shieldRadius + 4),
            ship.y + Math.sin(endAngle) * (shieldRadius + 4)
          );
          ctx.stroke();
          
          // Add small perpendicular cracks for extra damage look
          const midAngle = (startAngle + endAngle) / 2;
          const midX = ship.x + Math.cos(midAngle) * shieldRadius;
          const midY = ship.y + Math.sin(midAngle) * shieldRadius;
          const perpAngle = midAngle + Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(midX - Math.cos(perpAngle) * 3, midY - Math.sin(perpAngle) * 3);
          ctx.lineTo(midX + Math.cos(perpAngle) * 3, midY + Math.sin(perpAngle) * 3);
          ctx.stroke();
        });
      }
      
      ctx.restore();
    }

    // Select appropriate ship sprites based on score
    let shipIdleSprite, shipThrustSprite;
    const isUpgradedToShip3 = score >= 12500;
    const isUpgradedToShip2 = score >= 1500;
    
    if (isUpgradedToShip3) {
      shipIdleSprite = this.ship3IdleImg;
      shipThrustSprite = this.ship3ThrustImg;
    } else if (isUpgradedToShip2) {
      shipIdleSprite = this.ship2IdleImg;
      shipThrustSprite = this.ship2ThrustImg;
    } else {
      shipIdleSprite = this.shipIdleImg;
      shipThrustSprite = this.shipThrustImg;
    }
    
    const shipSprite = isAccelerating ? shipThrustSprite : shipIdleSprite;
    if (shipSprite && shipSprite.complete) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle + Math.PI / 2);
      
      // Apply green health glow effect if active (check ref for immediate timing)
      const now = Date.now();
      if (now < healthGlowEndTimeRef) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = "hsl(120, 100%, 50%)"; // Bright green glow
      } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }
      
      const spriteSize = ship.radius * 2;
      ctx.drawImage(
        shipSprite,
        -spriteSize / 2,
        -spriteSize / 2,
        spriteSize,
        spriteSize
      );
      
      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

