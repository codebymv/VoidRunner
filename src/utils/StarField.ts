interface AmbientStar {
  x: number;
  y: number;
  brightness: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  depth: number; // For parallax effect (0-1, where 1 is closest)
}

interface ConstellationLine {
  star1: AmbientStar;
  star2: AmbientStar;
  opacity: number;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  driftSpeed: number;
  driftAngle: number;
  spots: NebulaSpot[]; // Bright spots within nebula for star-like effect
}

interface NebulaSpot {
  offsetX: number;
  offsetY: number;
  size: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export class StarField {
  private stars: AmbientStar[] = [];
  private constellationLines: ConstellationLine[] = [];
  private nebulaClouds: NebulaCloud[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private time: number = 0;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private currentLevel: number = 1; // Track ship level for theming

  constructor(canvas: HTMLCanvasElement, starCount: number = 150) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.generateStars(starCount);
    this.generateConstellations();
    this.generateNebulaClouds();
  }

  private generateStars(count: number): void {
    this.stars = [];
    
    for (let i = 0; i < count; i++) {
      const star: AmbientStar = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        brightness: 0.3 + Math.random() * 0.7, // 0.3 to 1.0
        size: 0.5 + Math.random() * 2, // 0.5 to 2.5 pixels
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.03, // Slow twinkling
        color: this.getStarColor(),
        depth: Math.random() // For parallax scrolling
      };
      this.stars.push(star);
    }
  }

  private getStarColor(): string {
    const colors = [
      'rgba(255, 255, 255, 1)', // White
      'rgba(255, 248, 220, 1)', // Warm white
      'rgba(173, 216, 230, 1)', // Light blue
      'rgba(255, 228, 181, 1)', // Moccasin
      'rgba(255, 192, 203, 1)', // Light pink
      'rgba(230, 230, 250, 1)'  // Lavender
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateConstellations(): void {
    this.constellationLines = [];
    
    // Level-based constellation density
    const skipProbability = this.currentLevel === 1 ? 0.85 : this.currentLevel === 2 ? 0.80 : 0.75;
    const maxDistance = this.currentLevel === 1 ? 120 : this.currentLevel === 2 ? 140 : 160;
    const baseProbability = this.currentLevel === 1 ? 0.3 : this.currentLevel === 2 ? 0.35 : 0.4;
    
    // Create constellation connections between nearby stars
    for (let i = 0; i < this.stars.length; i++) {
      const star1 = this.stars[i];
      
      // Skip some stars based on level
      if (Math.random() > skipProbability) continue;
      
      // Find nearby stars to connect
      for (let j = i + 1; j < this.stars.length; j++) {
        const star2 = this.stars[j];
        const distance = Math.sqrt(
          Math.pow(star1.x - star2.x, 2) + Math.pow(star1.y - star2.y, 2)
        );
        
        // Connect stars within range
        if (distance < maxDistance && distance > 40) {
          // Probability decreases with distance
          const connectionProbability = Math.max(0, (maxDistance - distance) / maxDistance) * baseProbability;
          
          if (Math.random() < connectionProbability) {
            this.constellationLines.push({
              star1,
              star2,
              opacity: 0.1 + Math.random() * 0.15 // Subtle lines
            });
          }
        }
      }
    }
  }

  private generateNebulaClouds(): void {
    this.nebulaClouds = [];
    
    // Generate 4-6 larger, more diffuse nebula clouds
    const cloudCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < cloudCount; i++) {
      const spots: NebulaSpot[] = [];
      const radius = 200 + Math.random() * 300; // 200-500 radius (larger, more diffuse)
      
      // Generate 8-15 bright spots within each nebula for starry texture
      const spotCount = 8 + Math.floor(Math.random() * 8);
      for (let j = 0; j < spotCount; j++) {
        // Cluster spots more toward center with gaussian-like distribution
        const angle = Math.random() * Math.PI * 2;
        const distance = (Math.random() + Math.random()) / 2; // Biased toward center
        const offsetX = Math.cos(angle) * distance * radius * 0.7;
        const offsetY = Math.sin(angle) * distance * radius * 0.7;
        
        spots.push({
          offsetX,
          offsetY,
          size: 1 + Math.random() * 2, // Small bright spots
          brightness: 0.3 + Math.random() * 0.7,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.01 + Math.random() * 0.02
        });
      }
      
      this.nebulaClouds.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius,
        color: 'rgba(100, 50, 150, 0.15)', // Will be overridden by level
        intensity: 0.05 + Math.random() * 0.08, // Lower intensity for background effect
        driftSpeed: 0.005 + Math.random() * 0.01, // Slower drift
        driftAngle: Math.random() * Math.PI * 2,
        spots
      });
    }
  }

  public update(deltaTime: number, shipLevel: number = 1): void {
    this.time += deltaTime;
    this.currentLevel = shipLevel;
    
    // Update star twinkling
    this.stars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed * deltaTime;
    });
    
    // Drift nebula clouds slowly and update spot twinkling
    this.nebulaClouds.forEach(cloud => {
      cloud.x += Math.cos(cloud.driftAngle) * cloud.driftSpeed * deltaTime;
      cloud.y += Math.sin(cloud.driftAngle) * cloud.driftSpeed * deltaTime;
      
      // Update nebula spot twinkling
      cloud.spots.forEach(spot => {
        spot.twinklePhase += spot.twinkleSpeed * deltaTime;
      });
      
      // Wrap around edges
      if (cloud.x < -cloud.radius) cloud.x = this.canvas.width + cloud.radius;
      if (cloud.x > this.canvas.width + cloud.radius) cloud.x = -cloud.radius;
      if (cloud.y < -cloud.radius) cloud.y = this.canvas.height + cloud.radius;
      if (cloud.y > this.canvas.height + cloud.radius) cloud.y = -cloud.radius;
    });
  }

  public setCameraPosition(x: number, y: number): void {
    this.cameraX = x;
    this.cameraY = y;
  }

  public render(): void {
    // Render nebula clouds first (furthest back)
    if (this.currentLevel >= 2) {
      this.renderNebulaClouds();
    }
    
    // Render constellation lines (behind stars)
    this.renderConstellations();
    
    // Render stars
    this.renderStars();
  }

  private renderNebulaClouds(): void {
    this.nebulaClouds.forEach(cloud => {
      // Determine color palette based on level
      let baseColor: { r: number; g: number; b: number };
      let accentColor: { r: number; g: number; b: number };
      
      if (this.currentLevel === 2) {
        // Red/crimson theme - darker, more subtle
        baseColor = { r: 80, g: 20, b: 30 }; // Deep crimson
        accentColor = { r: 140, g: 40, b: 50 }; // Brighter red for spots
      } else if (this.currentLevel === 3) {
        // Purple/violet theme - deeper, more mystical
        baseColor = { r: 60, g: 30, b: 90 }; // Deep violet
        accentColor = { r: 120, g: 60, b: 180 }; // Brighter purple for spots
      } else {
        return; // Don't render for level 1
      }
      
      this.ctx.save();
      
      // Layer 1: Outer diffuse glow (very subtle, background layer)
      const outerGradient = this.ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, cloud.radius
      );
      outerGradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${cloud.intensity * 0.3})`);
      outerGradient.addColorStop(0.4, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${cloud.intensity * 0.15})`);
      outerGradient.addColorStop(0.7, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${cloud.intensity * 0.05})`);
      outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.globalAlpha = 0.4; // Very translucent for background effect
      this.ctx.fillStyle = outerGradient;
      this.ctx.fillRect(
        cloud.x - cloud.radius,
        cloud.y - cloud.radius,
        cloud.radius * 2,
        cloud.radius * 2
      );
      
      // Layer 2: Multiple small radial gradients for texture variation
      this.ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const offsetDist = cloud.radius * 0.3;
        const texX = cloud.x + Math.cos(angle + this.time * 0.0001) * offsetDist;
        const texY = cloud.y + Math.sin(angle + this.time * 0.0001) * offsetDist;
        const texRadius = cloud.radius * 0.4;
        
        const texGradient = this.ctx.createRadialGradient(
          texX, texY, 0,
          texX, texY, texRadius
        );
        texGradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${cloud.intensity * 0.2})`);
        texGradient.addColorStop(0.6, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${cloud.intensity * 0.05})`);
        texGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = texGradient;
        this.ctx.fillRect(
          texX - texRadius,
          texY - texRadius,
          texRadius * 2,
          texRadius * 2
        );
      }
      
      // Layer 3: Render twinkling bright spots within nebula (star-forming regions)
      cloud.spots.forEach(spot => {
        const spotX = cloud.x + spot.offsetX;
        const spotY = cloud.y + spot.offsetY;
        const twinkle = 0.5 + 0.5 * Math.sin(spot.twinklePhase);
        const currentBrightness = spot.brightness * twinkle;
        
        // Small bright spot with glow
        const spotGradient = this.ctx.createRadialGradient(
          spotX, spotY, 0,
          spotX, spotY, spot.size * 4
        );
        spotGradient.addColorStop(0, `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${currentBrightness * 0.8})`);
        spotGradient.addColorStop(0.3, `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${currentBrightness * 0.4})`);
        spotGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = spotGradient;
        this.ctx.fillRect(
          spotX - spot.size * 4,
          spotY - spot.size * 4,
          spot.size * 8,
          spot.size * 8
        );
        
        // Tiny bright core
        this.ctx.fillStyle = `rgba(${accentColor.r + 40}, ${accentColor.g + 40}, ${accentColor.b + 40}, ${currentBrightness})`;
        this.ctx.fillRect(spotX - spot.size * 0.5, spotY - spot.size * 0.5, spot.size, spot.size);
      });
      
      this.ctx.globalCompositeOperation = 'source-over'; // Reset blend mode
      this.ctx.globalAlpha = 1; // Reset alpha
      this.ctx.restore();
    });
  }

  private renderConstellations(): void {
    this.constellationLines.forEach(line => {
      const { star1, star2, opacity } = line;
      
      // Level-based constellation colors
      let baseColor: string;
      let lineOpacity: number;
      
      if (this.currentLevel === 1) {
        baseColor = '135, 206, 235'; // Light blue (default)
        lineOpacity = 0.4;
      } else if (this.currentLevel === 2) {
        baseColor = '255, 120, 100'; // Red-orange glow
        lineOpacity = 0.5;
      } else {
        baseColor = '200, 120, 255'; // Purple-blue glow
        lineOpacity = 0.6;
      }
      
      // Create gradient line that fades towards the edges
      const gradient = this.ctx.createLinearGradient(star1.x, star1.y, star2.x, star2.y);
      gradient.addColorStop(0, `rgba(${baseColor}, ${opacity * star1.brightness})`);
      gradient.addColorStop(0.5, `rgba(${baseColor}, ${opacity * 0.8})`);
      gradient.addColorStop(1, `rgba(${baseColor}, ${opacity * star2.brightness})`);
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = this.currentLevel === 1 ? 0.5 : this.currentLevel === 2 ? 0.7 : 0.9;
      this.ctx.globalAlpha = lineOpacity;
      
      this.ctx.beginPath();
      this.ctx.moveTo(star1.x, star1.y);
      this.ctx.lineTo(star2.x, star2.y);
      this.ctx.stroke();
      
      this.ctx.globalAlpha = 1;
    });
  }

  private renderStars(): void {
    this.stars.forEach(star => {
      // Calculate parallax offset based on camera position and star depth
      const parallaxX = (this.cameraX - this.canvas.width / 2) * star.depth * 0.1;
      const parallaxY = (this.cameraY - this.canvas.height / 2) * star.depth * 0.1;
      
      const renderX = star.x - parallaxX;
      const renderY = star.y - parallaxY;
      
      // Calculate twinkling effect
      const twinkle = 0.7 + 0.3 * Math.sin(star.twinklePhase);
      const currentBrightness = star.brightness * twinkle;
      
      // Parse color and apply brightness
      const alpha = currentBrightness * 0.8;
      const color = star.color.replace('1)', `${alpha})`);
      
      // Render star with glow effect
      this.ctx.save();
      
      // Outer glow
      this.ctx.shadowBlur = star.size * 3;
      this.ctx.shadowColor = color;
      this.ctx.fillStyle = color;
      
      this.ctx.beginPath();
      this.ctx.arc(renderX, renderY, star.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Inner bright core
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = star.color;
      this.ctx.beginPath();
      this.ctx.arc(renderX, renderY, star.size * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  public resize(width: number, height: number): void {
    // Redistribute stars when canvas resizes
    this.stars.forEach(star => {
      star.x = (star.x / this.canvas.width) * width;
      star.y = (star.y / this.canvas.height) * height;
    });
    
    // Redistribute nebula clouds
    this.nebulaClouds.forEach(cloud => {
      cloud.x = (cloud.x / this.canvas.width) * width;
      cloud.y = (cloud.y / this.canvas.height) * height;
    });
    
    // Regenerate constellations for new positions
    this.generateConstellations();
  }
  
  public setShipLevel(level: number): void {
    if (this.currentLevel !== level) {
      this.currentLevel = level;
      // Regenerate constellations with new density for level change
      this.generateConstellations();
    }
  }

  public addParallaxEffect(cameraX: number, cameraY: number): void {
    // Subtle parallax scrolling based on depth
    this.stars.forEach(star => {
      const parallaxStrength = star.depth * 0.1; // Very subtle effect
      star.x += cameraX * parallaxStrength;
      star.y += cameraY * parallaxStrength;
      
      // Wrap around screen edges
      if (star.x < -10) star.x = this.canvas.width + 10;
      if (star.x > this.canvas.width + 10) star.x = -10;
      if (star.y < -10) star.y = this.canvas.height + 10;
      if (star.y > this.canvas.height + 10) star.y = -10;
    });
  }
}