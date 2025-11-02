import { Bullet } from '@/game/types';

/**
 * Render bullets on the canvas
 */
export const renderBullets = (
  ctx: CanvasRenderingContext2D,
  bullets: Bullet[],
  isUnlimitedAmmo: boolean = false
): void => {
  bullets.forEach(bullet => {
    // Calculate fade based on lifetime
    const lifetimePercent = bullet.lifetime / bullet.maxLifetime;
    const opacity = 1 - lifetimePercent * 0.5; // Fade out as it ages

    ctx.save();
    
    // Choose color based on bullet type and unlimited ammo state
    // Platinum/silver overrides all colors when unlimited ammo is active
    const isPurple = bullet.isPurple || false;
    const glowColor = isUnlimitedAmmo
      ? `rgba(192, 192, 192, ${opacity})` // Silver glow (unlimited ammo)
      : isPurple 
      ? `rgba(168, 85, 247, ${opacity})` // Purple glow
      : `rgba(96, 165, 250, ${opacity})`; // Blue glow
    const coreColor = isUnlimitedAmmo
      ? `rgba(211, 211, 211, ${opacity})` // Light silver (unlimited ammo)
      : isPurple
      ? `rgba(192, 132, 252, ${opacity})` // Light purple
      : `rgba(147, 197, 253, ${opacity})`; // Light blue
    const centerColor = isUnlimitedAmmo
      ? `rgba(245, 245, 245, ${opacity})` // Very light silver/white (unlimited ammo)
      : isPurple
      ? `rgba(233, 213, 255, ${opacity})` // Very light purple/white
      : `rgba(224, 242, 254, ${opacity})`; // Very light blue/white
    
    // Glow effect - silver glows the most, then purple, then blue
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
      ? '192, 192, 192' // Silver trail (unlimited ammo)
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
};

