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

export class StarField {
  private stars: AmbientStar[] = [];
  private constellationLines: ConstellationLine[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private time: number = 0;
  private cameraX: number = 0;
  private cameraY: number = 0;

  constructor(canvas: HTMLCanvasElement, starCount: number = 150) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.generateStars(starCount);
    this.generateConstellations();
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
    
    // Create subtle constellation connections between nearby stars
    for (let i = 0; i < this.stars.length; i++) {
      const star1 = this.stars[i];
      
      // Only connect some stars to avoid overcrowding
      if (Math.random() > 0.85) continue;
      
      // Find nearby stars to connect
      for (let j = i + 1; j < this.stars.length; j++) {
        const star2 = this.stars[j];
        const distance = Math.sqrt(
          Math.pow(star1.x - star2.x, 2) + Math.pow(star1.y - star2.y, 2)
        );
        
        // Only connect stars that are reasonably close
        if (distance < 120 && distance > 40) {
          // Probability decreases with distance
          const connectionProbability = Math.max(0, (120 - distance) / 120) * 0.3;
          
          if (Math.random() < connectionProbability) {
            this.constellationLines.push({
              star1,
              star2,
              opacity: 0.1 + Math.random() * 0.15 // Very subtle lines
            });
          }
        }
      }
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update star twinkling
    this.stars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed * deltaTime;
    });
  }

  public setCameraPosition(x: number, y: number): void {
    this.cameraX = x;
    this.cameraY = y;
  }

  public render(): void {
    // Render constellation lines first (behind stars)
    this.renderConstellations();
    
    // Render stars
    this.renderStars();
  }

  private renderConstellations(): void {
    this.constellationLines.forEach(line => {
      const { star1, star2, opacity } = line;
      
      // Create gradient line that fades towards the edges
      const gradient = this.ctx.createLinearGradient(star1.x, star1.y, star2.x, star2.y);
      gradient.addColorStop(0, `rgba(135, 206, 235, ${opacity * star1.brightness})`);
      gradient.addColorStop(0.5, `rgba(135, 206, 235, ${opacity * 0.8})`);
      gradient.addColorStop(1, `rgba(135, 206, 235, ${opacity * star2.brightness})`);
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 0.5;
      this.ctx.globalAlpha = 0.4;
      
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
    
    // Regenerate constellations for new positions
    this.generateConstellations();
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