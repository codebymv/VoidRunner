import { Particle } from "../game/types";

/**
 * Object pool for particle management to reduce garbage collection
 * and improve performance in late-game scenarios with many particles.
 */
export class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private readonly maxParticles: number;

  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;
    
    // Pre-allocate some particles to avoid initial allocations
    for (let i = 0; i < 100; i++) {
      this.pool.push(this.createParticle());
    }
  }

  /**
   * Create a new particle object
   */
  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      color: ''
    };
  }

  /**
   * Acquire a particle from the pool
   */
  acquire(x: number, y: number, vx: number, vy: number, color: string): Particle | null {
    // Check particle limit
    if (this.active.length >= this.maxParticles) {
      return null;
    }

    // Get from pool or create new
    const particle = this.pool.pop() || this.createParticle();
    
    // Initialize particle
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = 1;
    particle.color = color;
    
    this.active.push(particle);
    return particle;
  }

  /**
   * Create multiple particles at once
   */
  createBurst(x: number, y: number, color: string, count: number, angleLUT: Array<{cos: number, sin: number}>): void {
    const availableSlots = this.maxParticles - this.active.length;
    const particlesToCreate = Math.min(count, availableSlots);
    
    for (let i = 0; i < particlesToCreate; i++) {
      const angleIdx = Math.floor(Math.random() * angleLUT.length);
      const { cos, sin } = angleLUT[angleIdx];
      const speed = 2 + Math.random() * 3;
      
      this.acquire(x, y, cos * speed, sin * speed, color);
    }
  }

  /**
   * Update all active particles
   */
  update(delta: number = 1): void {
    // Iterate backwards to safely remove particles
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      
      // Update particle
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      
      // Recycle dead particles
      if (p.life <= 0) {
        const particle = this.active.splice(i, 1)[0];
        this.pool.push(particle);
      }
    }
  }

  /**
   * Get all active particles for rendering
   */
  getActive(): Particle[] {
    return this.active;
  }

  /**
   * Get particle count for debugging
   */
  getStats(): { active: number; pooled: number; total: number; limit: number } {
    return {
      active: this.active.length,
      pooled: this.pool.length,
      total: this.active.length + this.pool.length,
      limit: this.maxParticles
    };
  }

  /**
   * Clear all particles (for game reset)
   */
  reset(): void {
    // Move all active particles back to pool
    while (this.active.length > 0) {
      this.pool.push(this.active.pop()!);
    }
  }
}

/**
 * Pre-calculated angle lookup table for faster particle creation
 * Avoids repeated Math.cos() and Math.sin() calls
 */
export const ANGLE_LUT = Array.from({ length: 360 }, (_, i) => {
  const angle = (i * Math.PI) / 180;
  return {
    cos: Math.cos(angle),
    sin: Math.sin(angle)
  };
});





