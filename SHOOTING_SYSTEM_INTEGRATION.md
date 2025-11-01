# Shooting System Integration Guide

## ✅ Completed Components

1. **AmmoBar Component** (`src/components/AmmoBar.tsx`)
   - Light blue ammo bar with gun icon
   - Gold glow for unlimited ammo state
   - Pulse animation during recharge

2. **Game Types** (`src/game/types.ts`)
   - Added `Bullet` interface
   - Added `AmmoPowerUp` interface
   - Added `health` and `maxHealth` to Planet interface
   - Added `bullets` and `ammoPowerUps` to GameState
   - Added `lastAmmoPowerUpSpawn` to GameState

3. **GameHUD Component** (`src/components/GameHUD.tsx`)
   - Updated to include AmmoBar
   - Added ammo-related props

4. **Shooting Utilities** (`src/utils/shooting.ts`)
   - Bullet creation and physics
   - Collision detection for bullets
   - Health/damage system
   - Fire rate control

5. **Bullet Renderer** (`src/utils/bulletRenderer.ts`)
   - Bright blue bullet rendering
   - Glow effects and motion trails

6. **Ammo Power-Up System** (`src/utils/ammoPowerUpSpawning.ts`)
   - Power-up spawning logic
   - Unlimited ammo duration (8s)
   - Rendering with gold glow

## 🔧 Required Integration Steps for GameCanvas.tsx

### Step 1: Add Imports (around line 28-31)
```typescript
import { Bullet, AmmoPowerUp } from "@/game/types";
import unlimitedAmmoImage from '@/assets/unlimited_ammo.png';
import { createBullet, updateBullets, checkBulletPlanetCollision, checkBulletScrapCollision, calculateDamage, getMaxHealth, FIRE_RATE, AMMO_DRAIN_RATE, RECHARGE_TIME } from "@/utils/shooting";
import { renderBullets } from "@/utils/bulletRenderer";
import { createAmmoPowerUp, shouldSpawnAmmoPowerUp, renderAmmoPowerUp, UNLIMITED_AMMO_DURATION } from "@/utils/ammoPowerUpSpawning";
```

### Step 2: Add Ammo State (after line 111, after `newlyUnlockedAchievements`)
```typescript
// Shooting system state
const [ammo, setAmmo] = useState(100);
const maxAmmo = 100;
const [isRecharging, setIsRecharging] = useState(false);
const hasWeapon = hasUpgraded; // Weapon unlocks at ship level 2+
const [isUnlimitedAmmo, setIsUnlimitedAmmo] = useState(false);
const [unlimitedAmmoEndTime, setUnlimitedAmmoEndTime] = useState(0);
const lastShotTimeRef = useRef(0);
const rechargeStartTimeRef = useRef(0);
```

### Step 3: Update gameRef initialization (around line 160)
Add to the gameRef object:
```typescript
bullets: [] as Bullet[],
ammoPowerUps: [] as AmmoPowerUp[],
lastAmmoPowerUpSpawn: 0,
```

### Step 4: Initialize Obstacle Health
In the planet spawning logic (find `createPlanetSpawner`), add health initialization:
```typescript
// After creating a planet, add:
planet.health = getMaxHealth(planet.type);
planet.maxHealth = planet.health;
```

### Step 5: Update GameHUD Usage (around line 1222)
```typescript
<GameHUD
  score={score}
  highScore={highScore}
  health={health}
  shield={shield}
  ammo={ammo}
  maxAmmo={maxAmmo}
  isRecharging={isRecharging}
  hasWeapon={hasWeapon}
  isUnlimitedAmmo={isUnlimitedAmmo}
  currentDifficulty={currentDifficulty}
  isMobile={isMobile}
  showJoystick={showJoystick}
  isMuted={isMuted}
  onToggleJoystick={handleToggleJoystick}
  onToggleMute={toggleMute}
  onDifficultyChange={handleDifficultyChange}
  onShowStats={() => setShowStats(true)}
  onShowHelp={() => setShowHelp(!showHelp)}
  onPause={() => {
    console.log("🎮 PAUSE BUTTON CLICKED");
    playMenuOpen().catch(console.error);
    setGameState("paused");
  }}
/>
```

### Step 6: Add Shooting Logic to Game Loop
Add this in the `gameLoop` function, after ship controls update:

```typescript
// Shooting mechanics (Space key) - after updateShipControls
if (hasWeapon && game.keys[' '] && !isRecharging) {
  const now = Date.now();
  if (now - lastShotTimeRef.current > FIRE_RATE) {
    if (isUnlimitedAmmo || ammo > 0) {
      // Create bullet
      const bullet = createBullet(game.ship);
      game.bullets.push(bullet);
      
      // Drain ammo (unless unlimited)
      if (!isUnlimitedAmmo) {
        setAmmo(prev => {
          const newAmmo = prev - AMMO_DRAIN_RATE;
          if (newAmmo <= 0) {
            setIsRecharging(true);
            rechargeStartTimeRef.current = now;
          }
          return Math.max(0, newAmmo);
        });
      }
      
      lastShotTimeRef.current = now;
      playSound('shoot').catch(console.error); // Add shoot sound if available
    }
  }
}

// Handle ammo recharge
if (isRecharging) {
  const now = Date.now();
  const rechargeProgress = (now - rechargeStartTimeRef.current) / RECHARGE_TIME;
  if (rechargeProgress >= 1) {
    setAmmo(100);
    setIsRecharging(false);
  } else {
    setAmmo(Math.floor(rechargeProgress * 100));
  }
}

// Handle unlimited ammo expiration
if (isUnlimitedAmmo) {
  const now = Date.now();
  if (now > unlimitedAmmoEndTime) {
    setIsUnlimitedAmmo(false);
  }
}

// Update bullets
game.bullets = updateBullets(game.bullets, delta);
```

### Step 7: Add Bullet Collision Detection
Add this after the existing collision checks in the game loop:

```typescript
// Bullet collisions
game.bullets = game.bullets.filter(bullet => {
  let bulletHit = false;
  
  // Check bullet-planet collisions
  game.planets.forEach(planet => {
    if (bulletHit) return;
    
    if (checkBulletPlanetCollision(bullet, planet)) {
      bulletHit = true;
      
      // Deal damage
      const damage = calculateDamage(planet.type);
      planet.health = (planet.health || planet.maxHealth || 100) - damage;
      
      createParticles(bullet.x, bullet.y, "hsl(200, 100%, 70%)", 5);
      
      // Check if destroyed
      if (planet.health <= 0) {
        const planetIndex = game.planets.indexOf(planet);
        if (planetIndex > -1) {
          // Award points based on type
          const points = planet.type === 'blackhole' ? 500 :
                        planet.type === 'planet2' ? 200 :
                        planet.type === 'meteor' ? 150 : 100;
          setScore(prev => {
            const newScore = prev + points;
            priorityToast(`Destroyed ${planet.type}! +${points}`, points, {
              duration: 1500,
              className: newScore > highScore ? 'text-yellow-400 glow-blue font-bold' : 'text-blue-400 glow-blue font-bold'
            });
            return newScore;
          });
          
          createExplosion(planet.x, planet.y, planet.radius * 2, 8);
          recordObstacleDestroyed();
          game.planets.splice(planetIndex, 1);
        }
      }
    }
  });
  
  // Check bullet-scrap collisions (destroy scrap)
  game.scraps.forEach(scrap => {
    if (bulletHit) return;
    
    if (checkBulletScrapCollision(bullet, scrap)) {
      bulletHit = true;
      const scrapIndex = game.scraps.indexOf(scrap);
      if (scrapIndex > -1) {
        createParticles(bullet.x, bullet.y, "hsl(30, 100%, 60%)", 5);
        game.scraps.splice(scrapIndex, 1);
      }
    }
  });
  
  return !bulletHit; // Keep bullet if it didn't hit anything
});
```

### Step 8: Add Ammo Power-Up Spawning
Add this where other power-ups are spawned:

```typescript
// Spawn ammo power-ups (ship level 2+ only)
if (shouldSpawnAmmoPowerUp(now, game.lastAmmoPowerUpSpawn, hasWeapon)) {
  const ammoPowerUp = createAmmoPowerUp(canvas.width, canvas.height, mobileScaleFactor, game.ship.x, game.ship.y);
  game.ammoPowerUps.push(ammoPowerUp);
  game.lastAmmoPowerUpSpawn = now;
}

// Check ammo power-up collection
game.ammoPowerUps.forEach(powerUp => {
  if (powerUp.collected) return;
  
  const dx = game.ship.x - powerUp.x;
  const dy = game.ship.y - powerUp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist < game.ship.radius + powerUp.radius) {
    powerUp.collected = true;
    setIsUnlimitedAmmo(true);
    setUnlimitedAmmoEndTime(Date.now() + UNLIMITED_AMMO_DURATION);
    setAmmo(100);
    setIsRecharging(false);
    playSound('powerUp').catch(console.error);
    createParticles(powerUp.x, powerUp.y, "hsl(45, 100%, 50%)", 30);
    priorityToast("Unlimited Ammo!", 1000, {
      duration: 2000,
      className: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold'
    });
  }
});

game.ammoPowerUps = game.ammoPowerUps.filter(p => !p.collected);
```

### Step 9: Add Rendering
Add this in the rendering section (after rendering other objects):

```typescript
// Render bullets
renderBullets(ctx, game.bullets);

// Render ammo power-ups
game.ammoPowerUps.forEach(powerUp => {
  renderAmmoPowerUp(ctx, powerUp, images.unlimitedAmmo || null);
});
```

### Step 10: Update Image Loader
Add to useImageLoader hook:
```typescript
unlimitedAmmo: unlimitedAmmoImage,
```

## 🎮 Controls
- **Space**: Hold to shoot (available at ship level 2+)
- Ammo bar recharges automatically after 4 seconds when depleted
- Unlimited ammo power-ups last 8 seconds

## 🎨 Visual Effects
- Bright blue bullets with glow and motion trails
- Gold glow for unlimited ammo state
- Damage particles on hit
- Explosion effects when obstacles are destroyed

## 📊 Damage System
- **Debris**: 40 HP (20 damage per shot - dies fast)
- **Meteor**: 80 HP (10 damage per shot)
- **Planet**: 120 HP (8 damage per shot)
- **Black Hole**: 200 HP (5 damage per shot - tough!)

## 🔊 Sounds Needed
Add these sound effects to your audio system:
- `shoot`: Bullet firing sound
- `powerUp`: Power-up collection sound


