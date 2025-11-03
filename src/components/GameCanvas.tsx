import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { priorityToast, toastManager, formatToastWithCombo } from "@/utils/toastPriority";
import { showPickupNotification } from "./PickupNotification";
import { StarField } from "@/utils/StarField";
import { useAudio } from "@/hooks/useAudio";
import { useMobile } from "@/hooks/useMobile";
import { VirtualJoystick } from "./VirtualJoystick";
import { HamburgerMenu } from "./HamburgerMenu";
import { CaptainDialog } from "./CaptainDialog";
import { DifficultyManager, type DifficultyLevel } from "../utils/difficultyConfig";
import { AudioManager } from "@/audio/AudioManager";
import shipIdleSprite from "@/assets/ship-idle.png";
import shipThrustSprite from "@/assets/ship-thrust.png";
import ship2IdleSprite from "@/assets/ship2-idle.png";
import ship2ThrustSprite from "@/assets/ship2-thrust.png";
import ship3IdleSprite from "@/assets/ship3-idle.png";
import ship3ThrustSprite from "@/assets/ship3-thrust.png";
import meteorSprite from "@/assets/meteor1.png";
import planet2Sprite from "@/assets/planet2.png";
import blackholeSprite from "@/assets/blackhole3.png";
import debrisSprite from "@/assets/debris4.png";
import starSprite from "@/assets/star.png";
import starUpgradeSprite from "@/assets/star_upgrade.png";
import starUpgrade2Sprite from "@/assets/star_upgrade2.png";
import healthWrenchSprite from "@/assets/health_wrench.png";
import scrapSprite from "@/assets/debris_scrap.png";
import redCrossSprite from "@/assets/red_cross.png";
import shieldSprite from "@/assets/shield.svg";
import logoImage from "@/assets/logo.png";
import gameOverImage from "@/assets/game_over.png";
import speech1Audio from "@/assets/speech1.mp3";
import speech2Audio from "@/assets/speech2.mp3";
import unlimitedAmmoImage from '@/assets/unlimited_ammo.png';
import trophyImage from '@/assets/trophy.png';
import { createBullet, updateBullets, checkBulletPlanetCollision, checkBulletScrapCollision, calculateDamage, getMaxHealth, FIRE_RATE, AUTO_FIRE_RATE, AMMO_DRAIN_RATE, RECHARGE_TIME, BULLET_SPEED } from "@/utils/shooting";
import { renderBullets } from "@/utils/bulletRenderer";
import { createAmmoPowerUp, shouldSpawnAmmoPowerUp, renderAmmoPowerUp, UNLIMITED_AMMO_DURATION } from "@/utils/ammoPowerUpSpawning";
import { findNearestEnemy, calculateLeadShot } from "@/utils/autoTargeting";

interface GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Planet extends GameObject {
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

interface Star extends GameObject {
  collected: boolean;
}

interface ShipTrail {
  x: number;
  y: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Scrap extends GameObject {
  lifespan: number; // Time until scrap disappears (in frames)
  maxLifespan: number; // Original lifespan for fade effect
  rotation: number;
  rotationSpeed: number;
}

interface HealthWrench extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

interface Bullet extends GameObject {
  lifetime: number; // How long the bullet has been alive (for fade/despawn)
  maxLifetime: number; // Maximum bullet lifetime
  isPurple?: boolean; // Purple bullets for level 3 ship (more damage)
}

interface AmmoPowerUp extends GameObject {
  collected: boolean;
  pulsePhase: number; // For visual pulsing effect
}

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setGameState: setAudioGameState, startThemeMusic, pauseThemeMusic, resumeThemeMusic, playSound, playMenuOpen, playMenuClose, GameState, isMuted, toggleMute } = useAudio();
  const { isMobile, isLandscape } = useMobile();
  const shipIdleImg = useRef<HTMLImageElement>(null!);
  const shipThrustImg = useRef<HTMLImageElement>(null!);
  const ship2IdleImg = useRef<HTMLImageElement>(null!);
  const ship2ThrustImg = useRef<HTMLImageElement>(null!);
  const ship3IdleImg = useRef<HTMLImageElement>(null!);
  const ship3ThrustImg = useRef<HTMLImageElement>(null!);
  const meteorImg = useRef<HTMLImageElement>(null!);
  const planet2Img = useRef<HTMLImageElement>(null!);
  const blackholeImg = useRef<HTMLImageElement>(null!);
  const debrisImg = useRef<HTMLImageElement>(null!);
  const scrapImg = useRef<HTMLImageElement>(null!);
  const starImg = useRef<HTMLImageElement>(null!);
  const starUpgradeImg = useRef<HTMLImageElement>(null!);
  const starUpgrade2Img = useRef<HTMLImageElement>(null!);
  const healthWrenchImg = useRef<HTMLImageElement>(null!);
  const unlimitedAmmoImg = useRef<HTMLImageElement>(null!);
  const starFieldRef = useRef<StarField | null>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("orbitalHighScore") || "0"));
  const [previousHighScore, setPreviousHighScore] = useState(() => parseInt(localStorage.getItem("orbitalHighScore") || "0")); // Track previous high score for display
  const [health, setHealth] = useState(3.0); // Changed from lives to health for fractional damage support
  const [shield, setShield] = useState(0.0); // Overshield that absorbs damage first (max 3.0)
  const healthGlowEndTimeRef = useRef(0); // Immediate ref for glow timing (no render delay)
  const [hasUpgraded, setHasUpgraded] = useState(false); // Track if ship has been upgraded to ship2
  const [hasUpgradedToShip3, setHasUpgradedToShip3] = useState(false); // Track if ship has been upgraded to ship3
  const [showHelp, setShowHelp] = useState(false); // State for help popup
  
  // Shooting system state
  const [ammo, setAmmo] = useState(100);
  const maxAmmo = hasUpgradedToShip3 ? 200 : 100; // Double ammo for level 3
  const [isRecharging, setIsRecharging] = useState(false);
  const hasWeapon = hasUpgraded; // Weapon unlocks at ship level 2+
  const [isUnlimitedAmmo, setIsUnlimitedAmmo] = useState(false);
  const [unlimitedAmmoEndTime, setUnlimitedAmmoEndTime] = useState(0);
  const lastShotTimeRef = useRef(0);
  const lastAutoShotTimeRef = useRef(0); // Separate timer for auto-fire
  const rechargeStartTimeRef = useRef(0);
  const [showCaptainDialog, setShowCaptainDialog] = useState(false); // State for captain dialog
  const [showLevelUpDialog, setShowLevelUpDialog] = useState(false); // State for level-up captain dialog
  const [showGameOverDialog, setShowGameOverDialog] = useState(false); // State for game over captain dialog
  const [levelUpMessage, setLevelUpMessage] = useState(""); // Current level-up message
  const [gameOverMessage, setGameOverMessage] = useState(""); // Current game over message
  
  // Difficulty management
  const difficultyManagerRef = useRef<DifficultyManager>(new DifficultyManager('medium'));
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('medium');
  
  // Auto-switch from hard difficulty if not unlocked
  useEffect(() => {
    if (currentDifficulty === 'hard' && highScore < 12500) {
      const difficultyManager = difficultyManagerRef.current;
      difficultyManager.setDifficulty('medium', true);
      setCurrentDifficulty('medium');
    }
  }, [currentDifficulty, highScore]);
  
  // Captain's commentary quotes for game over
  const captainGameOverQuotes = [
    "... (hits cigar) That guy was epic.",
    "... (coughs) That guy played by his own rules.",
    "... (shaking head) Truly built different..",
    "... (single tear) A legend cooked too soon",
  ];
  
  // Captain's level-up quotes for dialog system
  const captainLevelUpQuotes = {
    level2: "They're gonna tell stories about ya, kid, hold [SPACE] to fire away",
    level3: "Here's some more firepower, cap'n"
  };
  
  // Function to play random captain speech
  const playCaptainSpeech = useCallback(async () => {
    const speechSounds = ['speech1', 'speech2'];
    const randomSpeech = speechSounds[Math.floor(Math.random() * speechSounds.length)];
    try {
      await playSound(randomSpeech);
    } catch (error) {
      console.error('Failed to play captain speech:', error);
    }
  }, [playSound]);
  
  // Function to trigger captain level-up toast
  const triggerCaptainLevelUpDialog = useCallback((level: 'level2' | 'level3') => {
    const message = captainLevelUpQuotes[level];
    setLevelUpMessage(message);
    setShowLevelUpDialog(true);
    playCaptainSpeech(); // Play random captain speech
  }, [captainLevelUpQuotes, playCaptainSpeech]);
  
  // Clear shield if health drops below 100%
  useEffect(() => {
    if (health < 3.0 && shield > 0) {
      setShield(0);
    }
  }, [health, shield]);
  
  // Mobile touch event prevention - only on canvas during gameplay
  useEffect(() => {
    if (!isMobile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const preventTouch = (e: TouchEvent) => {
      // Only prevent touch events during gameplay to avoid interfering with UI
      if (gameState === "playing") {
        e.preventDefault();
      }
    };

    // Add non-passive event listeners to prevent scrolling/zooming on canvas only
    canvas.addEventListener('touchstart', preventTouch, { passive: false });
    canvas.addEventListener('touchmove', preventTouch, { passive: false });
    canvas.addEventListener('touchend', preventTouch, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouch);
      canvas.removeEventListener('touchmove', preventTouch);
      canvas.removeEventListener('touchend', preventTouch);
    };
  }, [isMobile, gameState]);
   
   // Mobile controls state
   const [joystickInput, setJoystickInput] = useState({ x: 0, y: 0 });
   const joystickInputRef = useRef({ x: 0, y: 0 }); // Ref to hold current joystick input
   const [showJoystick, setShowJoystick] = useState(isMobile); // Show by default on mobile, hidden on desktop

   // Handle joystick toggle from hamburger menu
  const handleToggleJoystick = useCallback(() => {
    setShowJoystick(prev => !prev);
  }, []);

  const handleDifficultyChange = useCallback((difficulty: DifficultyLevel) => {
    const difficultyManager = difficultyManagerRef.current;
    difficultyManager.setDifficulty(difficulty, true);
    setCurrentDifficulty(difficulty);
  }, []);

   // Handle joystick input with useCallback for stable reference
   const handleJoystickInput = useCallback((input: { x: number; y: number }) => {
    // Update both ref and state
    joystickInputRef.current = input;
    setJoystickInput(input);
  }, []);

  const handleCaptainDialogComplete = useCallback(() => {
    setShowCaptainDialog(false);
  }, []);

  const handleLevelUpDialogComplete = useCallback(() => {
    setShowLevelUpDialog(false);
  }, []);

  const handleGameOverDialogComplete = useCallback(() => {
    setShowGameOverDialog(false);
  }, []);

  // Log when joystickInput state actually changes
   useEffect(() => {
     console.log('🔄 joystickInput state CHANGED to:', JSON.stringify(joystickInput));
   }, [joystickInput]);
  
  // Helper function to get star acquisition amount based on ship level
  const getStarValue = (currentScore: number) => {
    if (currentScore >= 12500) {
      return 1000; // Ship level 3
    } else if (currentScore >= 1500) {
      return 100; // Ship level 2
    } else {
      return 10; // Ship level 1
    }
  };

  // Helper function to award points with combo tracking
  const awardPoints = (message: string, basePoints: number, duration: number = 1500) => {
    const now = Date.now();
    const COMBO_WINDOW = 3000; // 3 seconds to keep combo going
    const game = gameRef.current;
    
    // Reset combo if too much time has passed
    if (now - game.lastComboTime > COMBO_WINDOW) {
      game.comboCount = 0;
    }
    
    // Increment combo
    game.comboCount++;
    game.lastComboTime = now;
    
    // Calculate multiplier (1.0 to 3.0 based on combo)
    const multiplier = Math.min(1.0 + (game.comboCount - 1) * 0.2, 3.0);
    const finalPoints = Math.floor(basePoints * multiplier);
    
    setScore(prev => {
      const newScore = prev + finalPoints;
      const isNewHighScore = newScore > highScore;
      
      // Format message with combo info
      const formattedMessage = formatToastWithCombo(message, basePoints, game.comboCount, multiplier, isNewHighScore);
      
      priorityToast(formattedMessage, finalPoints, {
        duration,
        className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`,
        comboInfo: game.comboCount > 1 ? {
          combo: game.comboCount,
          multiplier,
          basePoints
        } : undefined
      });
      
      return newScore;
    });
  };

  // Helper function to handle damage that prioritizes shield over health
  const takeDamage = (damageAmount: number) => {
    // Play ship hit sound whenever damage is taken
    playSound('shipHit').catch(console.error);
    
    // Shield only works when health is at 100% (3.0)
    if (shield > 0 && health >= 3.0) {
      // Shield taking damage - no sound here, sound plays when becoming vulnerable
      // Damage shield first
      setShield(prev => {
        const remainingShield = prev - damageAmount;
        if (remainingShield < 0) {
          // Shield depleted, apply remaining damage to health
          setHealth(prevHealth => {
            const newHealth = prevHealth + remainingShield; // remainingShield is negative
            if (newHealth <= 0) {
              // Delay captain's commentary by 1700ms when player dies
              setTimeout(() => {
                const randomQuote = captainGameOverQuotes[Math.floor(Math.random() * captainGameOverQuotes.length)];
                setGameOverMessage(randomQuote);
                setShowGameOverDialog(true);
                playCaptainSpeech(); // Play random captain speech
              }, 1700);
              
              setGameState("gameover");
              toastManager.clearQueue(); // Clear all pending toasts when game over
              AudioManager.getInstance().stopShipEngineLoops(); // Stop ship engine loops on game over
              playMenuOpen().catch(console.error); // Play menu open sound when game over screen appears
              playSound('gameOver').catch(console.error);
              
              if (score > highScore) {
                setPreviousHighScore(highScore); // Capture previous high score before updating
                setHighScore(score);
                localStorage.setItem("orbitalHighScore", score.toString());
                priorityToast("New High Score!", 0, {
                  duration: 4000,
                  className: "bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold font-sans"
                });
              }
            }
            return Math.max(0, newHealth);
          });
          return 0;
        }
        return remainingShield;
      });
    } else {
      // No shield or health below 100%, damage health directly
      // If health drops below 100%, clear any remaining shield
      setHealth(prev => {
        const newHealth = prev - damageAmount;
        
        // Clear shield if health drops below max
        if (newHealth < 3.0 && shield > 0) {
          setShield(0);
        }
        
        if (newHealth <= 0) {
              // Delay captain's commentary by 1700ms when player dies
              setTimeout(() => {
                const randomQuote = captainGameOverQuotes[Math.floor(Math.random() * captainGameOverQuotes.length)];
                setGameOverMessage(randomQuote);
                setShowGameOverDialog(true);
                playCaptainSpeech(); // Play random captain speech
              }, 1700);
              
              setGameState("gameover");
              toastManager.clearQueue(); // Clear all pending toasts when game over
              AudioManager.getInstance().stopShipEngineLoops(); // Stop ship engine loops on game over
              playMenuOpen().catch(console.error); // Play menu open sound when game over screen appears
              playSound('gameOver').catch(console.error);
              
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem("orbitalHighScore", score.toString());
                priorityToast("New High Score!", 0, {
                  duration: 4000,
                  className: "bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold font-sans"
                });
              }
            }
        return Math.max(0, newHealth);
      });
    }
  };
  
  // Mobile scaling factor for fairer gameplay
  const mobileScaleFactor = isMobile ? 0.75 : 1.0;
  
  const gameRef = useRef({
    ship: { x: 0, y: 0, vx: 0, vy: 0, radius: 28 * mobileScaleFactor, angle: 0 },
    planets: [] as Planet[],
    stars: [] as Star[],
    scraps: [] as Scrap[],
    healthWrenches: [] as HealthWrench[],
    particles: [] as Particle[],
    shipTrails: [] as ShipTrail[],
    bullets: [] as Bullet[],
    ammoPowerUps: [] as AmmoPowerUp[],
    keys: {} as Record<string, boolean>,
    mouse: { x: 0, y: 0 },
    lastPlanetSpawn: 0,
    lastStarSpawn: 0,
    lastAmmoPowerUpSpawn: 0,
    lastHealthWrenchSpawn: 0,
    gameStartTime: 0,
    difficulty: 1,
    invulnerable: 0,
    shake: 0,
    nearMissTracker: new Map<string, number>(), // Track near-miss cooldowns for each planet
    planetIdCounter: 0, // Counter for generating unique planet IDs
    comboCount: 0, // Track consecutive scoring actions
    lastComboTime: 0, // Track when last combo action happened
  });

  useEffect(() => {
    const idleImg = new Image();
    idleImg.src = shipIdleSprite;
    shipIdleImg.current = idleImg;

    const thrustImg = new Image();
    thrustImg.src = shipThrustSprite;
    shipThrustImg.current = thrustImg;

    const idle2Img = new Image();
    idle2Img.src = ship2IdleSprite;
    ship2IdleImg.current = idle2Img;

    const thrust2Img = new Image();
    thrust2Img.src = ship2ThrustSprite;
    ship2ThrustImg.current = thrust2Img;

    const idle3Img = new Image();
    idle3Img.src = ship3IdleSprite;
    ship3IdleImg.current = idle3Img;

    const thrust3Img = new Image();
    thrust3Img.src = ship3ThrustSprite;
    ship3ThrustImg.current = thrust3Img;

    const meteorImage = new Image();
    meteorImage.src = meteorSprite;
    meteorImg.current = meteorImage;

    const planet2Image = new Image();
    planet2Image.src = planet2Sprite;
    planet2Img.current = planet2Image;

    const blackholeImage = new Image();
    blackholeImage.src = blackholeSprite;
    blackholeImg.current = blackholeImage;

    const debrisImage = new Image();
    debrisImage.src = debrisSprite;
    debrisImg.current = debrisImage;

    const scrapImage = new Image();
    scrapImage.src = scrapSprite;
    scrapImg.current = scrapImage;

    const starImage = new Image();
    starImage.src = starSprite;
    starImg.current = starImage;

    const starUpgradeImage = new Image();
    starUpgradeImage.src = starUpgradeSprite;
    starUpgradeImg.current = starUpgradeImage;

    const starUpgrade2Image = new Image();
    starUpgrade2Image.src = starUpgrade2Sprite;
    starUpgrade2Img.current = starUpgrade2Image;

    const healthWrenchImage = new Image();
    healthWrenchImage.src = healthWrenchSprite;
    healthWrenchImg.current = healthWrenchImage;

    const unlimitedAmmo = new Image();
    unlimitedAmmo.src = unlimitedAmmoImage;
    unlimitedAmmoImg.current = unlimitedAmmo;
  }, []);

  // Sync game state with audio system
  useEffect(() => {
    const audioGameStateMap = {
      menu: GameState.MENU,
      playing: GameState.PLAYING,
      paused: GameState.PAUSED,
      gameover: GameState.GAME_OVER
    };
    
    setAudioGameState(audioGameStateMap[gameState]);
  }, [gameState, setAudioGameState, GameState]);

  // Handle page visibility changes to pause/resume music when Safari is minimized
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (Safari minimized, tab switched, etc.)
        pauseThemeMusic();
      } else {
        // Page is visible again - only resume if game is playing
        if (gameState === "playing") {
          resumeThemeMusic();
        }
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus - pause music
      pauseThemeMusic();
    };

    const handleWindowFocus = () => {
      // Window gained focus - only resume if game is playing
      if (gameState === "playing") {
        resumeThemeMusic();
      }
    };

    // Add event listeners for page visibility API and window focus/blur
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [gameState, pauseThemeMusic, resumeThemeMusic]);

  // Audio will be initialized when the user starts the game (user gesture required)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    // Make canvas responsive - smaller on mobile to leave room for UI and joystick
    canvas.width = window.innerWidth * 0.9;
    if (isMobile) {
      // On mobile, use slightly smaller canvas to create space between game area and joystick
      canvas.height = window.innerHeight * 0.70;
    } else {
      canvas.height = window.innerHeight * 0.9;
    }

    // Initialize StarField
    if (!starFieldRef.current) {
      starFieldRef.current = new StarField(canvas);
    }

    const game = gameRef.current;
    game.ship.x = canvas.width / 2;
    game.ship.y = canvas.height / 2;

    const handleResize = () => {
      canvas.width = window.innerWidth * 0.9;
      if (isMobile) {
        // On mobile, use slightly smaller canvas to create space between game area and joystick
        canvas.height = window.innerHeight * 0.70;
      } else {
        canvas.height = window.innerHeight * 0.9;
      }
      
      // Update StarField on resize
      if (starFieldRef.current) {
        starFieldRef.current.resize(canvas.width, canvas.height);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'j' || e.key === 'J') {
        handleToggleJoystick();
        return; // Don't process this key further
      }
      
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
        return; // Don't process this key further
      }
      
      game.keys[e.key.toLowerCase()] = true;
      if (e.key === "Escape" && gameState === "playing") {
        e.preventDefault();
        playMenuOpen().catch(console.error);
        AudioManager.getInstance().stopShipEngineLoops(); // Stop ship engine loops when paused
        setGameState("paused");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      game.mouse.x = e.clientX;
      game.mouse.y = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const game = gameRef.current;

    let animationId: number;
    let lastTime = Date.now();

    const spawnPlanet = () => {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      
      switch (side) {
        case 0: x = Math.random() * canvas.width; y = -50; break;
        case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
        default: x = -50; y = Math.random() * canvas.height;
      }

      const colors = ["hsl(180, 100%, 50%)", "hsl(320, 100%, 50%)", "hsl(280, 100%, 50%)"];
      
      // Use difficulty-based obstacle type distribution
      const difficultyManager = difficultyManagerRef.current;
      const planetType = difficultyManager.getObstacleType();
      
      const planet: Planet = {
        id: `planet_${++game.planetIdCounter}`, // Assign unique ID
        x, y,
        vx: (canvas.width / 2 - x) * 0.0005,
        vy: (canvas.height / 2 - y) * 0.0005,
        radius: (32 + Math.random() * 25) * mobileScaleFactor, // Increased from 25 + 20
        mass: 1000 + Math.random() * 2000,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: planetType
      };

      if (planetType === "meteor") {
        planet.rotation = 0;
        planet.rotationSpeed = 0.005 + Math.random() * 0.015; // Slower, more subtle rotation speed
      } else if (planetType === "planet2") {
        // Planet2 has faster movement and different rotation
        planet.vx *= 1.5; // 50% faster movement
        planet.vy *= 1.5;
        planet.rotation = 0;
        planet.rotationSpeed = 0.02 + Math.random() * 0.03; // Faster rotation than meteors
        planet.radius = (26 + Math.random() * 18) * mobileScaleFactor; // Increased from 20 + 15
        planet.mass = 800 + Math.random() * 1500; // Less massive than regular planets
      } else if (planetType === "blackhole") {
        // Blackholes are larger, slower, with stronger gravity
        planet.vx *= 0.3; // Much slower movement (70% reduction)
        planet.vy *= 0.3;
        planet.rotation = 0;
        planet.rotationSpeed = 0.01 + Math.random() * 0.02; // Slow, ominous rotation
        planet.radius = (42 + Math.random() * 30) * mobileScaleFactor; // Increased from 35 + 25
        planet.mass = 2500 + Math.random() * 3000; // Much more massive
        planet.gravityMultiplier = 2.5 + Math.random() * 1.5; // 2.5x to 4x stronger gravity
        planet.color = "hsl(270, 50%, 20%)"; // Dark purple color
      } else if (planetType === "debris") {
        // Debris has bouncing mechanics and slow rotation
        planet.vx *= 0.8; // Slightly slower movement
        planet.vy *= 0.8;
        planet.rotation = 0;
        planet.rotationSpeed = 0.003 + Math.random() * 0.007; // Very slow rotation
        planet.radius = (24 + Math.random() * 16) * mobileScaleFactor; // Increased from 18 + 12
        planet.mass = 600 + Math.random() * 1000; // Lighter than regular planets
        planet.canBounce = true;
        planet.bounceCount = 0;
        planet.color = "hsl(30, 70%, 60%)"; // Metallic orange/brown color
      }

      // Initialize health for shooting mechanics
      planet.health = getMaxHealth(planet.type);
      planet.maxHealth = planet.health;

      game.planets.push(planet);
    };

    const spawnStar = () => {
      game.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0, vy: 0,
        radius: 6 * mobileScaleFactor,
        collected: false
      });
    };

    const spawnHealthWrench = () => {
      // Spawn away from ship to avoid instant collection
      let x, y;
      do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
      } while (Math.sqrt((x - game.ship.x) ** 2 + (y - game.ship.y) ** 2) < 150);

      game.healthWrenches.push({
        x, y,
        vx: 0, vy: 0,
        radius: 20 * mobileScaleFactor, // Slightly larger than stars for visibility
        collected: false,
        pulsePhase: 0
      });
    };

    const createParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color
        });
      }
    };

    const createExplosion = (x: number, y: number, blastRadius: number, force: number, excludeIndices: number[] = []) => {
      // Create explosion particles
      createParticles(x, y, "hsl(0, 100%, 70%)", 25);
      createParticles(x, y, "hsl(30, 100%, 80%)", 20);
      createParticles(x, y, "hsl(60, 100%, 90%)", 15);
      
      // Apply blast force to nearby obstacles
      game.planets.forEach((planet, index) => {
        if (excludeIndices.includes(index)) return;
        
        const dx = planet.x - x;
        const dy = planet.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < blastRadius && dist > 0) {
          const normalX = dx / dist;
          const normalY = dy / dist;
          const blastForce = force * (1 - dist / blastRadius); // Force decreases with distance
          
          planet.vx += normalX * blastForce;
          planet.vy += normalY * blastForce;
          
          // Create impact particles on affected obstacles
          createParticles(planet.x, planet.y, "hsl(45, 100%, 60%)", 5);
          
          // Chain reaction: if it's a meteor or debris, it might explode too
          if ((planet.type === "meteor" || planet.type === "debris") && blastForce > 1.5) {
            setTimeout(() => {
              const planetStillExists = game.planets.includes(planet);
              if (planetStillExists && Math.random() < 0.3) { // 30% chance of chain explosion
                const planetIndex = game.planets.indexOf(planet);
                if (planetIndex !== -1) {
                  createExplosion(planet.x, planet.y, blastRadius * 0.7, force * 0.6, [planetIndex]);
                  // Clean up nearMissTracker for removed planet
                  game.nearMissTracker.delete(planet.id);
                  game.planets.splice(planetIndex, 1);
                }
              }
            }, 100 + Math.random() * 200); // Random delay for chain reaction
          }
        }
      });
    };

    const gameLoop = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 16.67;
      lastTime = now;
      
      // Update toast threshold based on current score to reduce notification spam in late game
      toastManager.updateThreshold(score);

      ctx.fillStyle = "rgb(10, 10, 20)"; // Solid background to prevent trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render StarField background
      if (starFieldRef.current) {
        starFieldRef.current.setCameraPosition(game.ship.x, game.ship.y);
        starFieldRef.current.update(delta);
        starFieldRef.current.render();
      }

      if (game.shake > 0) {
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * game.shake,
          (Math.random() - 0.5) * game.shake
        );
        game.shake *= 0.9;
      }

      // Ship controls
      const speed = 0.3;
      // Mobile-optimized speeds - much slower for small screen control
      // Mobile: Much slower multiplier (0.15) - slower than keyboard for precise control
      // Desktop: Matching WASD speed (0.3) for consistent control experience
      const joystickSpeed = isMobile ? 0.15 : 0.3;
      const joystickThreshold = isMobile ? 0.02 : 0.05; // Lower threshold for mobile (2% vs 5%)
      let isAccelerating = false;
      
      // Keyboard controls
      if (game.keys["w"] || game.keys["arrowup"]) { game.ship.vy -= speed; isAccelerating = true; }
      if (game.keys["s"] || game.keys["arrowdown"]) { game.ship.vy += speed; isAccelerating = true; }
      if (game.keys["a"] || game.keys["arrowleft"]) { game.ship.vx -= speed; isAccelerating = true; }
      if (game.keys["d"] || game.keys["arrowright"]) { game.ship.vx += speed; isAccelerating = true; }
      
      // Joystick controls - mobile-optimized sensitivity
      const currentJoystick = joystickInputRef.current;
      if (Math.abs(currentJoystick.x) > joystickThreshold || Math.abs(currentJoystick.y) > joystickThreshold) {
        // Apply joystick input with device-specific speed multiplier
        game.ship.vx += currentJoystick.x * joystickSpeed;
        game.ship.vy += currentJoystick.y * joystickSpeed;
        isAccelerating = true;
      }

      // Update ship engine state based on acceleration (crossfade idle/thrust loops)
      AudioManager.getInstance().setShipEngineState(isAccelerating ? 'thrust' : 'idle');

      // Manual shooting mechanics (Space key)
      // Level 2: Blue bullets, Level 3: Purple bullets
      if (hasWeapon && game.keys[" "] && !isRecharging) {
        const shootNow = Date.now();
        if (shootNow - lastShotTimeRef.current > FIRE_RATE) {
          if (isUnlimitedAmmo || ammo > 0) {
            // Create bullet - ONLY purple at level 3 (score >= 12500)
            // Level 2 (score 1500-6999) = blue bullets (hasUpgradedToShip3 = false)
            // Level 3 (score 12500+) = purple bullets (hasUpgradedToShip3 = true)
            const bullet = createBullet(game.ship, hasUpgradedToShip3);
            game.bullets.push(bullet);
            
            // Drain ammo (unless unlimited)
            if (!isUnlimitedAmmo) {
              setAmmo(prev => {
                const newAmmo = prev - AMMO_DRAIN_RATE;
                if (newAmmo <= 0) {
                  setIsRecharging(true);
                  rechargeStartTimeRef.current = shootNow;
                  playSound('chargeEmpty').catch(() => {}); // Ammo depleted sound
                }
                return Math.max(0, newAmmo);
              });
            }
            
            lastShotTimeRef.current = shootNow;
            // Play appropriate shoot sound: shoot1 (blue/level 2), shoot2 (purple/level 3)
            const shootSound = hasUpgradedToShip3 ? 'shoot2' : 'shoot1';
            playSound(shootSound).catch(() => {});
          }
        }
      }

      // AI Auto-targeting (Level 3 only)
      if (hasUpgradedToShip3 && hasWeapon && !isRecharging) {
        const autoShootNow = Date.now();
        if (autoShootNow - lastAutoShotTimeRef.current > AUTO_FIRE_RATE) {
          if (isUnlimitedAmmo || ammo > 0) {
            // Find nearest enemy
            const target = findNearestEnemy(game.ship, game.planets, 400 * mobileScaleFactor);
            
            if (target) {
              // Calculate lead shot for moving targets
              const targetAngle = calculateLeadShot(game.ship, target.planet, BULLET_SPEED);
              
              // Create auto-targeting bullet
              const bullet = createBullet(game.ship, true, targetAngle);
              game.bullets.push(bullet);
              
              // Drain ammo (unless unlimited)
              if (!isUnlimitedAmmo) {
                setAmmo(prev => {
                  const newAmmo = prev - AMMO_DRAIN_RATE;
                  if (newAmmo <= 0) {
                    setIsRecharging(true);
                    rechargeStartTimeRef.current = autoShootNow;
                    playSound('chargeEmpty').catch(() => {}); // Ammo depleted sound
                  }
                  return Math.max(0, newAmmo);
                });
              }
              
              lastAutoShotTimeRef.current = autoShootNow;
              // Auto-fire always uses purple bullets (level 3 only)
              playSound('shoot2').catch(() => {});
            }
          }
        }
      }

      // Handle ammo recharge (full recharge after hitting 0)
      if (isRecharging) {
        const rechNow = Date.now();
        const rechargeProgress = (rechNow - rechargeStartTimeRef.current) / RECHARGE_TIME;
        if (rechargeProgress >= 1) {
          setAmmo(maxAmmo); // Recharge to full (100 or 200)
          setIsRecharging(false);
          playSound('chargeReady').catch(() => {}); // Ammo ready sound
        } else {
          setAmmo(Math.floor(rechargeProgress * maxAmmo));
        }
      }
      // Passive ammo regeneration (when not empty and not unlimited)
      // Only starts after 2 seconds of not shooting
      else if (!isUnlimitedAmmo && ammo < maxAmmo && ammo > 0) {
        const timeSinceLastShot = Date.now() - lastShotTimeRef.current;
        const PASSIVE_REGEN_COOLDOWN = 2000; // 2 second cooldown before passive regen starts
        
        if (timeSinceLastShot >= PASSIVE_REGEN_COOLDOWN) {
          // Regenerate 0.5 ammo per frame (~30 per second at 60 FPS)
          setAmmo(prev => Math.min(maxAmmo, prev + 0.5));
        }
      }

      // Handle unlimited ammo expiration
      if (isUnlimitedAmmo) {
        const unlimNow = Date.now();
        if (unlimNow > unlimitedAmmoEndTime) {
          setIsUnlimitedAmmo(false);
        }
      }

      // Update bullets
      game.bullets = updateBullets(game.bullets, delta);

      // Gravity from planets
      game.planets.forEach(planet => {
        const dx = planet.x - game.ship.x;
        const dy = planet.y - game.ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const baseForce = planet.mass / (dist * dist);
          // Apply enhanced gravity for blackholes
          const gravityMultiplier = planet.gravityMultiplier || 1;
          const force = baseForce * gravityMultiplier;
          game.ship.vx += (dx / dist) * force * 0.01;
          game.ship.vy += (dy / dist) * force * 0.01;
        }
      });

      // Apply friction
      game.ship.vx *= 0.98;
      game.ship.vy *= 0.98;

      // Update ship angle based on velocity direction
      const velocityMagnitude = Math.sqrt(game.ship.vx * game.ship.vx + game.ship.vy * game.ship.vy);
      if (velocityMagnitude > 0.5) {
        game.ship.angle = Math.atan2(game.ship.vy, game.ship.vx);
      }

      // Update ship
      game.ship.x += game.ship.vx * delta;
      game.ship.y += game.ship.vy * delta;

      // Add ship trail when moving
      if (velocityMagnitude > 0.5) {
        game.shipTrails.push({
          x: game.ship.x,
          y: game.ship.y,
          life: 1.0
        });
      }

      // Update and filter ship trails
      game.shipTrails = game.shipTrails.filter(trail => {
        trail.life -= 0.05;
        return trail.life > 0;
      });

      // Limit trail length
      if (game.shipTrails.length > 20) {
        game.shipTrails.shift();
      }

      // Boundary wrap
      if (game.ship.x < 0) game.ship.x = canvas.width;
      if (game.ship.x > canvas.width) game.ship.x = 0;
      if (game.ship.y < 0) game.ship.y = canvas.height;
      if (game.ship.y > canvas.height) game.ship.y = 0;

      // Update planets
      game.planets = game.planets.filter(planet => {
        planet.x += planet.vx * delta;
        planet.y += planet.vy * delta;
        
        // Update rotation for meteors, planet2, blackholes, and debris
        if ((planet.type === "meteor" || planet.type === "planet2" || planet.type === "blackhole" || planet.type === "debris") && planet.rotation !== undefined && planet.rotationSpeed !== undefined) {
          planet.rotation += planet.rotationSpeed * delta;
        }
        
        const isInBounds = planet.x > -100 && planet.x < canvas.width + 100 &&
                          planet.y > -100 && planet.y < canvas.height + 100;
        
        // Clean up nearMissTracker for planets going out of bounds
        if (!isInBounds) {
          game.nearMissTracker.delete(planet.id);
        }
        
        return isInBounds;
      });

      // Check for oversized black holes that should disappear
      game.planets = game.planets.filter(planet => {
        if (planet.type === "blackhole") {
          const maxRadius = 150;
          const maxMass = 15000;
          
          if (planet.radius > maxRadius || planet.mass > maxMass) {
            // Black hole becomes unstable and disappears
            const megaBlastRadius = 200 + Math.random() * 100;
            const megaBlastForce = 8 + Math.random() * 4;
            
            // Create massive explosion effect
            createParticles(planet.x, planet.y, "hsl(280, 100%, 90%)", 60);
            createParticles(planet.x, planet.y, "hsl(300, 100%, 95%)", 50);
            createParticles(planet.x, planet.y, "hsl(320, 100%, 80%)", 40);
            createParticles(planet.x, planet.y, "hsl(60, 100%, 80%)", 30); // Golden energy
            createExplosion(planet.x, planet.y, megaBlastRadius, megaBlastForce, []);
            
            // Add score bonus for witnessing black hole collapse
            setScore(prev => {
              const newScore = prev + 500;
              const isNewHighScore = newScore > highScore;
              
              // Show toast with dynamic color based on high score status
              priorityToast("Black hole collapsed! +500 points", 500, { 
                duration: 3000,
                className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
              });
              
              return newScore;
            });
            
            // Clean up nearMissTracker for removed planet
            game.nearMissTracker.delete(planet.id);
            
            return false; // Remove the black hole
          }
        }
        return true; // Keep all other planets
      });

      // Debris scrap spawning system - debris periodically drops small scrap
      game.planets.forEach((planet) => {
        if (planet.type === "debris") {
          // Add a lastScrapSpawn property to track timing (initialize if not exists)
          if (!planet.lastScrapSpawn) {
            planet.lastScrapSpawn = Date.now();
          }
          
          // Spawn scrap every 5-10 seconds, adjusted by difficulty
          const difficultyManager = difficultyManagerRef.current;
          const difficultyConfig = difficultyManager.getCurrentConfig();
          const baseScrapInterval = 5000 + Math.random() * 5000;
          const scrapSpawnInterval = baseScrapInterval / difficultyConfig.scrapSpawnMultiplier;
          if (Date.now() - planet.lastScrapSpawn > scrapSpawnInterval) {
            // Create a small scrap object
            const scrapLifespan = 180 + Math.random() * 120; // 3-5 seconds at 60fps
            const scrap: Scrap = {
              x: planet.x + (Math.random() - 0.5) * 20, // Spawn near debris
              y: planet.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 1.5, // Small random velocity
              vy: (Math.random() - 0.5) * 1.5,
              radius: (8 + Math.random() * 6) * mobileScaleFactor, // Small size (8-14 pixels)
              lifespan: scrapLifespan,
              maxLifespan: scrapLifespan,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: 0.02 + Math.random() * 0.04 // Moderate rotation
            };
            
            game.scraps.push(scrap);
            planet.lastScrapSpawn = Date.now();
          }
        }
      });

      // Update and manage scrap objects
      game.scraps = game.scraps.filter(scrap => {
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
        return scrap.x > -50 && scrap.x < canvas.width + 50 &&
               scrap.y > -50 && scrap.y < canvas.height + 50;
      });

      // Debris collision detection and bouncing
      game.planets.forEach((debris, debrisIndex) => {
        if (debris.type === "debris" && debris.canBounce && debris.bounceCount < 3) {
          game.planets.forEach((otherPlanet, otherIndex) => {
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
                
                // Award points for debris-debris collision
                setScore(prev => {
                  const newScore = prev + 20;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Debris collision! +20 points", 20, { 
                    duration: 1000,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                
                // Create particles for visual effect
                createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 8);
              }
            }
          });
        }
      });

      // Advanced obstacle collision interactions
      game.planets.forEach((planet1, index1) => {
        game.planets.forEach((planet2, index2) => {
          if (index1 >= index2) return; // Avoid duplicate checks and self-collision
          
          const dx = planet1.x - planet2.x;
          const dy = planet1.y - planet2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = planet1.radius + planet2.radius;
          
          if (dist < minDist && dist > 0) {
            // Meteor-Blackhole interactions: meteors get absorbed, black hole grows
            if ((planet1.type === "meteor" && planet2.type === "blackhole") || 
                (planet1.type === "blackhole" && planet2.type === "meteor")) {
              const meteor = planet1.type === "meteor" ? planet1 : planet2;
              const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
              const meteorIndex = planet1.type === "meteor" ? index1 : index2;
              
              // Black hole absorbs meteor and grows slightly
              blackhole.radius += meteor.radius * 0.15; // Small growth from meteor absorption
              blackhole.mass += meteor.mass * 0.8; // Absorb most of the meteor's mass
              blackhole.gravityMultiplier = (blackhole.gravityMultiplier || 1) * 1.02; // Slight gravity increase
              
              // Update color based on new size
              if (blackhole.radius > 100) {
                blackhole.color = "hsl(300, 100%, 15%)"; // Darker purple for large black holes
              } else if (blackhole.radius > 80) {
                blackhole.color = "hsl(290, 100%, 18%)"; // Medium purple
              }
              
              // Create dramatic absorption effect
              createParticles(meteor.x, meteor.y, "hsl(0, 100%, 70%)", 15);
              createParticles(blackhole.x, blackhole.y, "hsl(270, 100%, 50%)", 10);
              createParticles(blackhole.x, blackhole.y, "hsl(280, 100%, 60%)", 8); // Growth effect
              
              // Remove the meteor (it gets absorbed)
              game.planets.splice(meteorIndex, 1);
              return;
            }
            
            // Planet2-Debris interactions: debris bounces, planet2 continues
            if ((planet1.type === "planet2" && planet2.type === "debris") || 
                (planet1.type === "debris" && planet2.type === "planet2")) {
              const debris = planet1.type === "debris" ? planet1 : planet2;
              const planet2Obj = planet1.type === "planet2" ? planet1 : planet2;
              
              if (debris.canBounce && debris.bounceCount < 3) {
                const normalX = dx / dist;
                const normalY = dy / dist;
                
                // Only debris bounces, planet2 is too massive to be affected much
                debris.vx = -debris.vx * 0.9 + normalX * 2;
                debris.vy = -debris.vy * 0.9 + normalY * 2;
                debris.bounceCount++;
                
                // Award points for debris bounce off planet
                setScore(prev => {
                  const newScore = prev + 15;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Debris bounce! +15 points", 15, { 
                    duration: 1000,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                
                createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 6);
              }
              return;
            }
            
            // Blackhole-Debris interactions: debris gets absorbed after bounces, black hole grows
            if ((planet1.type === "blackhole" && planet2.type === "debris") || 
                (planet1.type === "debris" && planet2.type === "blackhole")) {
              const debris = planet1.type === "debris" ? planet1 : planet2;
              const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
              const debrisIndex = planet1.type === "debris" ? index1 : index2;
              
              if (debris.bounceCount >= 2) {
                // Debris gets absorbed after multiple bounces, black hole grows
                blackhole.radius += debris.radius * 0.1; // Small growth from debris absorption
                blackhole.mass += debris.mass * 0.6; // Absorb some of the debris mass
                blackhole.gravityMultiplier = (blackhole.gravityMultiplier || 1) * 1.01; // Tiny gravity increase
                
                // Award points for debris destruction
                setScore(prev => {
                  const newScore = prev + 75;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Debris destroyed! +75 points", 75, { 
                    duration: 1500,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                
                // Update color based on new size
                if (blackhole.radius > 100) {
                  blackhole.color = "hsl(300, 100%, 15%)"; // Darker purple for large black holes
                } else if (blackhole.radius > 80) {
                  blackhole.color = "hsl(290, 100%, 18%)"; // Medium purple
                }
                
                createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 12);
                createParticles(blackhole.x, blackhole.y, "hsl(270, 100%, 50%)", 8);
                createParticles(blackhole.x, blackhole.y, "hsl(280, 100%, 60%)", 5); // Growth effect
                game.planets.splice(debrisIndex, 1);
              } else if (debris.canBounce) {
                // Debris bounces away from blackhole
                const normalX = dx / dist;
                const normalY = dy / dist;
                debris.vx += normalX * 3;
                debris.vy += normalY * 3;
                debris.bounceCount++;
                
                // Award points for debris bounce
                setScore(prev => {
                  const newScore = prev + 15;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Debris bounce! +15 points", 15, { 
                    duration: 1000,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                
                createParticles(debris.x, debris.y, "hsl(30, 70%, 60%)", 4);
              }
              return;
            }
            
            // Meteor-Meteor collisions: both explode spectacularly with blast radius
            if (planet1.type === "meteor" && planet2.type === "meteor") {
              const explosionX = (planet1.x + planet2.x) / 2;
              const explosionY = (planet1.y + planet2.y) / 2;
              const blastRadius = 80 + Math.random() * 40; // Variable blast radius
              const blastForce = 3 + Math.random() * 2;
              
              // Create massive explosion
              createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
              
              // Remove both meteors
              const indicesToRemove = [index1, index2].sort((a, b) => b - a);
              indicesToRemove.forEach(idx => game.planets.splice(idx, 1));
              return;
            }
            
            // Planet2-Planet2 collisions: create a smaller but still significant explosion
            if (planet1.type === "planet2" && planet2.type === "planet2") {
              const explosionX = (planet1.x + planet2.x) / 2;
              const explosionY = (planet1.y + planet2.y) / 2;
              const blastRadius = 60 + Math.random() * 30;
              const blastForce = 2 + Math.random() * 1.5;
              
              // Create explosion with blue-white colors for planet2
              createParticles(explosionX, explosionY, "hsl(200, 100%, 80%)", 20);
              createParticles(explosionX, explosionY, "hsl(220, 100%, 90%)", 15);
              createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
              
              // Remove both planets
              const indicesToRemove = [index1, index2].sort((a, b) => b - a);
              indicesToRemove.forEach(idx => game.planets.splice(idx, 1));
              return;
            }
            
            // Debris-Debris collisions: fragmentation with small explosions
            if (planet1.type === "debris" && planet2.type === "debris") {
              const explosionX = (planet1.x + planet2.x) / 2;
              const explosionY = (planet1.y + planet2.y) / 2;
              const blastRadius = 40 + Math.random() * 20;
              const blastForce = 1.5 + Math.random() * 1;
              
              // Create fragmentation particles with metallic colors
              createParticles(explosionX, explosionY, "hsl(30, 80%, 60%)", 15);
              createParticles(explosionX, explosionY, "hsl(45, 70%, 70%)", 10);
              createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
              
              // Remove both debris
              const indicesToRemove = [index1, index2].sort((a, b) => b - a);
              indicesToRemove.forEach(idx => game.planets.splice(idx, 1));
              return;
            }
            
            // Meteor-Planet2 collisions: planet explodes, meteor gets deflected
            if ((planet1.type === "meteor" && planet2.type === "planet2") || 
                (planet1.type === "planet2" && planet2.type === "meteor")) {
              const meteor = planet1.type === "meteor" ? planet1 : planet2;
              const planet = planet1.type === "planet2" ? planet1 : planet2;
              const meteorIndex = planet1.type === "meteor" ? index1 : index2;
              const planetIndex = planet1.type === "planet2" ? index1 : index2;
              
              // Planet explodes at its location
              const blastRadius = 80 + Math.random() * 40; // Moderate blast radius
              const blastForce = 3 + Math.random() * 2; // Strong explosion
              
              // Create planet explosion with blue-white colors
              createParticles(planet.x, planet.y, "hsl(200, 100%, 80%)", 20); // Blue planet fragments
              createParticles(planet.x, planet.y, "hsl(220, 100%, 90%)", 15); // Light blue energy
              createParticles(planet.x, planet.y, "hsl(240, 100%, 85%)", 12); // White-blue core
              
              // Create the explosion with blast radius damage (exclude meteor from blast)
              createExplosion(planet.x, planet.y, blastRadius, blastForce, [meteorIndex]);
              
              // Deflect meteor in a new direction based on collision angle
              const normalX = dx / dist;
              const normalY = dy / dist;
              const deflectionStrength = 4 + Math.random() * 3; // Strong deflection
              
              // Deflect meteor away from planet with some randomness
              const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees variation
              const deflectX = Math.cos(Math.atan2(normalY, normalX) + randomAngle);
              const deflectY = Math.sin(Math.atan2(normalY, normalX) + randomAngle);
              
              meteor.vx = deflectX * deflectionStrength;
              meteor.vy = deflectY * deflectionStrength;
              
              // Create meteor deflection particles
              createParticles(meteor.x, meteor.y, "hsl(0, 100%, 70%)", 8); // Red-orange meteor trail
              
              // Award bonus points for the collision
              setScore(prev => {
                const newScore = prev + 100;
                const isNewHighScore = newScore > highScore;
                
                // Show toast with dynamic color based on high score status
                priorityToast("Meteor collision! +100 points", 100, { 
                  duration: 2000,
                  className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                });
                
                return newScore;
              });
              
              // Remove only the planet
              game.planets.splice(planetIndex, 1);
              return;
            }
            
            // Blackhole-Blackhole collisions: absorption and growth mechanics
            if (planet1.type === "blackhole" && planet2.type === "blackhole") {
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
                
                // Create massive explosion effect
                createParticles(explosionX, explosionY, "hsl(280, 100%, 90%)", 60);
                createParticles(explosionX, explosionY, "hsl(300, 100%, 95%)", 50);
                createParticles(explosionX, explosionY, "hsl(320, 100%, 80%)", 40);
                createParticles(explosionX, explosionY, "hsl(60, 100%, 80%)", 30); // Golden energy
                createExplosion(explosionX, explosionY, megaBlastRadius, megaBlastForce, [index1, index2]);
                
                // Add score bonus for witnessing black hole collapse
                setScore(prev => {
                  const newScore = prev + 500;
                  const isNewHighScore = newScore > highScore;
                  
                  // Show toast with dynamic color based on high score status
                  priorityToast("Black hole collapsed! +500 points", 500, { 
                    duration: 3000,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
              } else {
                // Create enhanced black hole with progressive growth
                const blastRadius = 120 + Math.random() * 40;
                const blastForce = 4 + Math.random() * 2;
                
                // Create gravitational wave effect
                createParticles(explosionX, explosionY, "hsl(280, 100%, 80%)", 35);
                createParticles(explosionX, explosionY, "hsl(300, 100%, 90%)", 25);
                createParticles(explosionX, explosionY, "hsl(320, 100%, 70%)", 20);
                createExplosion(explosionX, explosionY, blastRadius, blastForce, [index1, index2]);
                
                // Determine color based on size (larger = more dangerous looking)
                let blackholeColor = "hsl(280, 100%, 20%)";
                if (combinedRadius > 100) {
                  blackholeColor = "hsl(300, 100%, 15%)"; // Darker purple for large black holes
                } else if (combinedRadius > 80) {
                  blackholeColor = "hsl(290, 100%, 18%)"; // Medium purple
                }
                
                // Create the enhanced black hole
                game.planets.push({
                  id: `planet_${++game.planetIdCounter}`, // Assign unique ID
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
                
                // Add score for black hole merger
                setScore(prev => {
                  const newScore = prev + 100;
                  const isNewHighScore = newScore > highScore;
                  
                  // Show toast with dynamic color based on high score status
                  priorityToast("Black hole merger! +100 points", 100, { 
                    duration: 2000,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
              }
              
              // Remove both original blackholes
              const indicesToRemove = [index1, index2].sort((a, b) => b - a);
              indicesToRemove.forEach(idx => game.planets.splice(idx, 1));
              return;
            }
            
            // Planet2-Blackhole interactions: planet2 gets orbital effect
            if ((planet1.type === "planet2" && planet2.type === "blackhole") || 
                (planet1.type === "blackhole" && planet2.type === "planet2")) {
              const planet2Obj = planet1.type === "planet2" ? planet1 : planet2;
              const blackhole = planet1.type === "blackhole" ? planet1 : planet2;
              
              // Create orbital effect - planet2 curves around blackhole
              const normalX = dx / dist;
              const normalY = dy / dist;
              const orbitStrength = 0.5;
              
              planet2Obj.vx += -normalY * orbitStrength; // Perpendicular force for orbit
              planet2Obj.vy += normalX * orbitStrength;
              
              createParticles(planet2Obj.x, planet2Obj.y, "hsl(180, 100%, 50%)", 3);
              return;
            }
          }
        });
      });

      // Bullet collisions with obstacles
      game.bullets = game.bullets.filter(bullet => {
        let bulletHit = false;
        
        // Check bullet-planet collisions
        game.planets.forEach(planet => {
          if (bulletHit) return;
          
          if (checkBulletPlanetCollision(bullet, planet)) {
            bulletHit = true;
            
            // Deal damage (purple bullets do 50% more)
            const damage = calculateDamage(planet.type, bullet.isPurple);
            planet.health = (planet.health || planet.maxHealth || 100) - damage;
            
            // Apply knockback force in bullet direction
            // Knockback is proportional to damage and inversely proportional to mass
            const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            if (bulletSpeed > 0) {
              const bulletDirX = bullet.vx / bulletSpeed;
              const bulletDirY = bullet.vy / bulletSpeed;
              const knockbackStrength = (damage * 0.35) / Math.sqrt(planet.mass); // Stronger knockback for more noticeable effect
              planet.vx += bulletDirX * knockbackStrength;
              planet.vy += bulletDirY * knockbackStrength;
            }
            
            // Flash white briefly to indicate damage
            planet.flashUntil = Date.now() + 80; // 80ms flash duration
            
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
                
                createParticles(planet.x, planet.y, planet.color, 30);
                playSound('explosion').catch(() => {}); // Play explosion sound for obstacle destruction
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

      // Collision detection
      if (game.invulnerable > 0) {
        // Play vulnerable blink sound at the start of each visible phase
        if (game.invulnerable % 10 === 0) {
          playSound('vulnerableBlink').catch(console.error);
        }
        game.invulnerable--;
      } else {
        // Planet collisions (33% damage)
        game.planets.forEach(planet => {
          const dx = planet.x - game.ship.x;
          const dy = planet.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < planet.radius + game.ship.radius) {
            createParticles(game.ship.x, game.ship.y, "hsl(0, 100%, 50%)", 20);
            game.invulnerable = 120;
            playSound('shieldActivate'); // Immediate shield sound feedback
            game.shake = 20;
            takeDamage(1.0); // 33% damage (1 full health point)
          }
        });

        // Near-miss detection for high-speed planets (award points for close calls with fast-moving objects)
        game.planets.forEach((planet) => {
          const dx = planet.x - game.ship.x;
          const dy = planet.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate planet speed
          const planetSpeed = Math.sqrt(planet.vx * planet.vx + planet.vy * planet.vy);
          const highSpeedThreshold = 8; // Objects moving faster than this are considered "hurled"
          
          // Near-miss range: just outside collision range but still close
          const collisionRange = planet.radius + game.ship.radius;
          const nearMissRange = collisionRange * 1.6; // 60% larger than collision range
          
          // Only award near-miss for high-speed objects and only once per entity
          if (dist > collisionRange && dist < nearMissRange && planetSpeed > highSpeedThreshold) {
            // Check if we haven't already awarded points for this specific planet using its unique ID
            if (!game.nearMissTracker.has(planet.id)) {
              game.nearMissTracker.set(planet.id, Date.now());
              
              // Award large points based on planet type and speed
              let nearMissPoints = Math.round(100 + (planetSpeed * 10)); // Base 100 + speed bonus
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
              
              setScore(prev => {
                const newScore = prev + nearMissPoints;
                const isNewHighScore = newScore > highScore;
                
                priorityToast(`High-speed near miss! +${nearMissPoints} points`, nearMissPoints, { 
                  duration: 2000,
                  className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                });
                
                return newScore;
              });
              
              // Create dramatic particles for high-speed near-miss
              createParticles(game.ship.x, game.ship.y, "hsl(45, 100%, 60%)", 15); // Golden particles for high reward
              createParticles(planet.x, planet.y, "hsl(200, 100%, 70%)", 8); // Blue trail particles
              playSound('starAcquire'); // Sound feedback
            }
          }
        });

        // Scrap collisions - can be collected for points or cause damage
        game.scraps.forEach(scrap => {
          const dx = scrap.x - game.ship.x;
          const dy = scrap.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Larger collection radius for scrap collection
          const collectionRadius = (scrap.radius + game.ship.radius) * 1.5;
          const damageRadius = scrap.radius + game.ship.radius;
          
          if (dist < collectionRadius && dist >= damageRadius) {
            // Scrap collection for points (safe distance)
            awardPoints("Scrap collected!", 25, 1500);
            
            createParticles(scrap.x, scrap.y, "hsl(0, 0%, 100%)", 12); // White collection particles
            playSound('starAcquire');
            
            // Remove the scrap after collection
            const scrapIndex = game.scraps.indexOf(scrap);
            if (scrapIndex > -1) {
              game.scraps.splice(scrapIndex, 1);
            }
          } else if (dist < damageRadius) {
            // Scrap collision damage (too close)
            createParticles(game.ship.x, game.ship.y, "hsl(30, 80%, 60%)", 8); // Orange particles for scrap damage
            game.invulnerable = 60; // Shorter invulnerability for minor damage
            playSound('shieldActivate'); // Immediate shield sound feedback
            game.shake = 8; // Less screen shake
            takeDamage(0.45); // 15% damage (0.45 health points)
            
            // Remove the scrap after collision
            const scrapIndex = game.scraps.indexOf(scrap);
            if (scrapIndex > -1) {
              game.scraps.splice(scrapIndex, 1);
            }
          }
        });
      }

      // Star collection (boosted radius for easier acquisition)
      game.stars.forEach(star => {
        if (!star.collected) {
          const dx = star.x - game.ship.x;
          const dy = star.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const acquisitionRadius = 35 * mobileScaleFactor; // Much larger acquisition radius
          if (dist < acquisitionRadius) {
            star.collected = true;
            createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 15);
            const starValue = getStarValue(score);
            
            // Determine star level based on star value
            let starLevel: number;
            if (starValue === 1000) {
              starLevel = 3;
            } else if (starValue === 100) {
              starLevel = 2;
            } else {
              starLevel = 1;
            }
            
            // Award star points with combo
            awardPoints(`Lvl ${starLevel} Star Collected!`, starValue, 1500);
            
            playSound('starAcquire');
          }
        }
      });

      game.stars = game.stars.filter(star => !star.collected);

      // Health wrench collection
      game.healthWrenches.forEach(wrench => {
        if (!wrench.collected) {
          const dx = wrench.x - game.ship.x;
          const dy = wrench.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const acquisitionRadius = 40 * mobileScaleFactor; // Slightly larger than stars
          if (dist < acquisitionRadius) {
            wrench.collected = true;
            playSound('healthWrench');
            
            // Award points for repairs (+150)
            const pointsAwarded = 150;
            setScore(prev => prev + pointsAwarded);
            
            // Show pickup notification (custom component below score toasts)
            showPickupNotification(
              "🔧 Repairs +150 pts",
              'bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-bold shadow-lg'
            );
            
            // Trigger green health glow effect for 1 second (use ref for immediate feedback)
            healthGlowEndTimeRef.current = Date.now() + 1000;
            
            // Restore 25% health (0.75 health points), overflow goes to shield
            const healAmount = 0.75;
            const currentHealth = health;
            
            if (currentHealth >= 3.0) {
              // Health already full, add all to shield
              setShield(prev => Math.min(3.0, prev + healAmount));
              // Create blue shield particles
              createParticles(wrench.x, wrench.y, "hsl(220, 100%, 60%)", 20);
              createParticles(wrench.x, wrench.y, "hsl(200, 100%, 70%)", 15);
            } else {
              // Calculate overflow
              const healthToAdd = Math.min(healAmount, 3.0 - currentHealth);
              const overflow = healAmount - healthToAdd;
              
              // Add to health first
              setHealth(prev => prev + healthToAdd);
              
              // If there's overflow, add to shield
              if (overflow > 0) {
                setShield(prev => Math.min(3.0, prev + overflow));
                // Create both green (health) and blue (shield) particles
                createParticles(wrench.x, wrench.y, "hsl(120, 100%, 50%)", 15);
                createParticles(wrench.x, wrench.y, "hsl(220, 100%, 60%)", 15);
              } else {
                // Create green healing particles only
                createParticles(wrench.x, wrench.y, "hsl(120, 100%, 50%)", 20);
                createParticles(wrench.x, wrench.y, "hsl(140, 100%, 70%)", 15);
              }
            }
          }
        }
      });

      game.healthWrenches = game.healthWrenches.filter(wrench => !wrench.collected);

      // Ammo power-up collection
      game.ammoPowerUps.forEach(powerUp => {
        if (!powerUp.collected) {
          const dx = powerUp.x - game.ship.x;
          const dy = powerUp.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < game.ship.radius + powerUp.radius) {
            powerUp.collected = true;
            setIsUnlimitedAmmo(true);
            setUnlimitedAmmoEndTime(Date.now() + UNLIMITED_AMMO_DURATION);
            setAmmo(100);
            setIsRecharging(false);
            playSound('unlimitedAmmo').catch(() => {}); // Play unlimited ammo pickup sound
            createParticles(powerUp.x, powerUp.y, "hsl(45, 100%, 50%)", 30);
            
            // Award points for unlimited ammo (+500)
            const pointsAwarded = 500;
            setScore(prev => prev + pointsAwarded);
            
            // Show pickup notification (custom component below score toasts)
            showPickupNotification(
              "Unlimited Ammo! +500 pts",
              'bg-gradient-to-r from-gray-300 to-slate-400 text-slate-900 font-bold shadow-lg'
            );
          }
        }
      });

      game.ammoPowerUps = game.ammoPowerUps.filter(p => !p.collected);

      // Star-Obstacle interactions
      game.stars.forEach((star, starIndex) => {
        if (star.collected) return;
        
        game.planets.forEach((planet, planetIndex) => {
          const dx = star.x - planet.x;
          const dy = star.y - planet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const collisionDist = star.radius + planet.radius;
          
          if (dist < collisionDist) {
            // Different interactions based on obstacle type
            switch (planet.type) {
              case "meteor":
                // Meteors destroy stars in a small explosion
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 8);
                createParticles(planet.x, planet.y, "hsl(0, 100%, 70%)", 5);
                star.collected = true;
                
                // Award points for meteor destroying star
                setScore(prev => {
                  const newScore = prev + 40;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Star destroyed by meteor! +40 points", 40, { 
                    duration: 1500,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                playSound('starAcquire');
                break;
                
              case "planet2":
                // Planet2 absorbs stars and grows slightly
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 6);
                createParticles(planet.x, planet.y, "hsl(180, 100%, 50%)", 4);
                planet.radius += 0.5; // Slight growth
                star.collected = true;
                
                // Award points for planet absorbing star
                setScore(prev => {
                  const newScore = prev + 30;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Star absorbed by planet! +30 points", 30, { 
                    duration: 1500,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                playSound('starAcquire');
                break;
                
              case "blackhole":
                // Blackholes absorb stars dramatically
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 12);
                createParticles(planet.x, planet.y, "hsl(270, 100%, 50%)", 8);
                star.collected = true;
                
                // Award points for blackhole absorbing star
                setScore(prev => {
                  const newScore = prev + 60;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Star consumed by black hole! +60 points", 60, { 
                    duration: 1500,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                playSound('starAcquire');
                break;
                
              case "debris":
                // Debris and stars create a small sparkle effect
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 4);
                createParticles(planet.x, planet.y, "hsl(30, 100%, 60%)", 3);
                star.collected = true;
                
                // Award points for debris interacting with star
                setScore(prev => {
                  const newScore = prev + 20;
                  const isNewHighScore = newScore > highScore;
                  
                  priorityToast("Star sparkle with debris! +20 points", 20, { 
                    duration: 1500,
                    className: `${isNewHighScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'} font-bold font-sans transition-colors duration-300`
                  });
                  
                  return newScore;
                });
                playSound('starAcquire');
                break;
            }
          }
        });
      });

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
      });

      // Spawning with difficulty-based rates
      game.difficulty = 1 + score * 0.001;
      const difficultyManager = difficultyManagerRef.current;
      const difficultyConfig = difficultyManager.getCurrentConfig();
      
      // Check for auto-difficulty advancement
      const autoAdvance = difficultyManager.checkAutoAdvance(score);
      if (autoAdvance.shouldAdvance && autoAdvance.newDifficulty) {
        difficultyManager.autoAdvance(autoAdvance.newDifficulty);
        setCurrentDifficulty(autoAdvance.newDifficulty);
        const newConfig = difficultyManager.getCurrentConfig();
        priorityToast(`Difficulty increased to ${newConfig.displayName}!`, 50, { 
          duration: 3000, 
          className: 'bg-blue-500/90 text-white' 
        });
      }
      
      // Apply difficulty multipliers to spawn rates
      const basePlanetInterval = 2000 / game.difficulty;
      const baseStarInterval = 3000;
      const intervals = difficultyManager.getSpawnIntervals(basePlanetInterval, baseStarInterval);
      
      if (now - game.lastPlanetSpawn > intervals.planetInterval) {
        spawnPlanet();
        game.lastPlanetSpawn = now;
      }
      if (now - game.lastStarSpawn > intervals.starInterval) {
        spawnStar();
        game.lastStarSpawn = now;
      }

      // Health wrench spawning (rare, starts after 30 seconds)
      const gameRunTime = now - game.gameStartTime;
      if (gameRunTime > 30000 && now - game.lastHealthWrenchSpawn > 35000) { // 35 second minimum interval
        // Low spawn chance for rarity
        if (Math.random() < 0.04) { // 4% chance per check
          spawnHealthWrench();
          game.lastHealthWrenchSpawn = now;
        }
      }

      // Spawn ammo power-ups (ship level 2+ only)
      if (shouldSpawnAmmoPowerUp(now, game.lastAmmoPowerUpSpawn, hasWeapon)) {
        const ammoPowerUp = createAmmoPowerUp(canvas.width, canvas.height, mobileScaleFactor, game.ship.x, game.ship.y);
        game.ammoPowerUps.push(ammoPowerUp);
        game.lastAmmoPowerUpSpawn = now;
      }

      // Render
      game.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Render bullets (silver when unlimited ammo is active)
      renderBullets(ctx, game.bullets, isUnlimitedAmmo);

      game.planets.forEach(planet => {
        if (planet.type === "meteor" && meteorImg.current && meteorImg.current.complete) {
          // Render meteor sprite with rotation
          ctx.save();
          ctx.translate(planet.x, planet.y);
          if (planet.rotation !== undefined) {
            ctx.rotate(planet.rotation);
          }
          
          const spriteSize = planet.radius * 2;
          ctx.drawImage(
            meteorImg.current,
            -spriteSize / 2,
            -spriteSize / 2,
            spriteSize,
            spriteSize
          );
          ctx.restore();
        } else if (planet.type === "planet2" && planet2Img.current && planet2Img.current.complete) {
          // Render planet2 sprite with rotation
          ctx.save();
          ctx.translate(planet.x, planet.y);
          if (planet.rotation !== undefined) {
            ctx.rotate(planet.rotation);
          }
          
          const spriteSize = planet.radius * 2;
          ctx.drawImage(
            planet2Img.current,
            -spriteSize / 2,
            -spriteSize / 2,
            spriteSize,
            spriteSize
          );
          ctx.restore();
        } else if (planet.type === "debris" && debrisImg.current && debrisImg.current.complete) {
          // Render debris sprite with slow rotation
          ctx.save();
          ctx.translate(planet.x, planet.y);
          if (planet.rotation !== undefined) {
            ctx.rotate(planet.rotation);
          }
          
          const spriteSize = planet.radius * 2;
          ctx.drawImage(
            debrisImg.current,
            -spriteSize / 2,
            -spriteSize / 2,
            spriteSize,
            spriteSize
          );
          ctx.restore();
        } else if (planet.type === "blackhole" && blackholeImg.current && blackholeImg.current.complete) {
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
            blackholeImg.current,
            -spriteSize / 2,
            -spriteSize / 2,
            spriteSize,
            spriteSize
          );
          ctx.restore();
        } else {
          // Render regular planet
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
      game.planets.forEach(planet => {
        if (planet.flashUntil && Date.now() < planet.flashUntil) {
          ctx.save();
          
          // Draw a bright white radial flash at the center (doesn't affect transparent parts)
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

      // Render scrap objects
      game.scraps.forEach(scrap => {
        if (scrapImg.current && scrapImg.current.complete) {
          ctx.save();
          
          // Add glow effect to indicate scraps are collectible (matching star levels)
          ctx.shadowBlur = 15;
          
          // Neutral white glow for scraps to distinguish from stars
           ctx.shadowColor = "hsl(0, 0%, 90%)";
          
          ctx.translate(scrap.x, scrap.y);
          ctx.rotate(scrap.rotation);
          
          // Calculate fade effect based on remaining lifespan
          const fadeAlpha = Math.min(1, scrap.lifespan / (scrap.maxLifespan * 0.3)); // Start fading at 30% lifespan
          ctx.globalAlpha = fadeAlpha;
          
          const spriteSize = scrap.radius * 2;
          ctx.drawImage(
            scrapImg.current,
            -spriteSize / 2,
            -spriteSize / 2,
            spriteSize,
            spriteSize
          );
          
          ctx.shadowBlur = 0; // Reset shadow
          ctx.restore();
        } else {
          // Fallback rendering if image not loaded
          ctx.save();
          ctx.globalAlpha = Math.min(1, scrap.lifespan / (scrap.maxLifespan * 0.3));
          ctx.fillStyle = "hsl(25, 60%, 45%)";
          ctx.beginPath();
          ctx.arc(scrap.x, scrap.y, scrap.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      game.stars.forEach(star => {
        ctx.save();
        ctx.shadowBlur = 15;
        
        // Determine glow color and star sprite based on current score (ship level)
         let starImage: HTMLImageElement;
         let glowColor: string;
         if (score >= 12500) {
           // Ship level 3 - stars worth 1000 points - Purple glow
           starImage = starUpgrade2Img.current;
           glowColor = "hsl(280, 100%, 50%)";
         } else if (score >= 1500) {
           // Ship level 2 - stars worth 100 points - Red glow
           starImage = starUpgradeImg.current;
           glowColor = "hsl(0, 100%, 50%)";
         } else {
           // Ship level 1 - stars worth 10 points - Yellow glow
           starImage = starImg.current;
           glowColor = "hsl(60, 100%, 50%)";
         }
        
        ctx.shadowColor = glowColor;
        
        const spriteSize = star.radius * 4; // Make the star image larger than the original circle
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

      // Health wrenches
      game.healthWrenches.forEach(wrench => {
        ctx.save();
        
        // Update pulse phase for visual effect
        wrench.pulsePhase += 0.1;
        const pulseScale = 1 + Math.sin(wrench.pulsePhase) * 0.2;
        
        // Green glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = "hsl(120, 100%, 50%)";
        
        const spriteSize = wrench.radius * 2 * pulseScale;
        ctx.drawImage(
          healthWrenchImg.current,
          wrench.x - spriteSize / 2,
          wrench.y - spriteSize / 2,
          spriteSize,
          spriteSize
        );
        
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Ammo power-ups
      game.ammoPowerUps.forEach(powerUp => {
        renderAmmoPowerUp(ctx, powerUp, unlimitedAmmoImg.current);
      });

      // Render ship trails
      game.shipTrails.forEach((trail, index) => {
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
      if (game.invulnerable > 0 && game.invulnerable % 10 < 5) {
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
        ctx.arc(game.ship.x, game.ship.y, game.ship.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw cracks based on health status
        const shieldRadius = game.ship.radius + 5;
        
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
              game.ship.x + Math.cos(startAngle) * (shieldRadius - 3),
              game.ship.y + Math.sin(startAngle) * (shieldRadius - 3)
            );
            ctx.lineTo(
              game.ship.x + Math.cos(endAngle) * (shieldRadius + 3),
              game.ship.y + Math.sin(endAngle) * (shieldRadius + 3)
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
              game.ship.x + Math.cos(startAngle) * (shieldRadius - 4),
              game.ship.y + Math.sin(startAngle) * (shieldRadius - 4)
            );
            ctx.lineTo(
              game.ship.x + Math.cos(endAngle) * (shieldRadius + 4),
              game.ship.y + Math.sin(endAngle) * (shieldRadius + 4)
            );
            ctx.stroke();
            
            // Add small perpendicular cracks for extra damage look
            const midAngle = (startAngle + endAngle) / 2;
            const midX = game.ship.x + Math.cos(midAngle) * shieldRadius;
            const midY = game.ship.y + Math.sin(midAngle) * shieldRadius;
            const perpAngle = midAngle + Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(midX - Math.cos(perpAngle) * 3, midY - Math.sin(perpAngle) * 3);
            ctx.lineTo(midX + Math.cos(perpAngle) * 3, midY + Math.sin(perpAngle) * 3);
            ctx.stroke();
          });
        }
        
        ctx.restore();
      }

      // Ship sprite upgrades: ship1 (0-1499), ship2 (1500-12499), ship3 (12500+)
      const isUpgradedToShip2 = score >= 1500;
      const isUpgradedToShip3 = score >= 12500;
      
      // Check if ship just upgraded to ship2 and restore health + ammo
      if (isUpgradedToShip2 && !hasUpgraded) {
        setHasUpgraded(true);
        setHealth(3.0); // Restore to full health on upgrade
        setAmmo(100); // Fill ammo to 100 for level 2
        setIsRecharging(false); // Ensure weapon is ready
        playSound('shipUpgrades');
        triggerCaptainLevelUpDialog('level2'); // Trigger captain dialog for level 2
      }
      
      // Check if ship just upgraded to ship3 and restore health + ammo
      if (isUpgradedToShip3 && !hasUpgradedToShip3) {
        setHasUpgradedToShip3(true);
        setHealth(3.0); // Restore to full health on upgrade
        setAmmo(200); // Fill ammo to 200 for level 3 (double capacity)
        setIsRecharging(false); // Ensure weapon is ready
        playSound('shipUpgrades');
        triggerCaptainLevelUpDialog('level3'); // Trigger captain dialog for level 3
      }
      
      // Select appropriate ship sprites based on score
      let shipIdleSprite, shipThrustSprite;
      if (isUpgradedToShip3) {
        shipIdleSprite = ship3IdleImg.current;
        shipThrustSprite = ship3ThrustImg.current;
      } else if (isUpgradedToShip2) {
        shipIdleSprite = ship2IdleImg.current;
        shipThrustSprite = ship2ThrustImg.current;
      } else {
        shipIdleSprite = shipIdleImg.current;
        shipThrustSprite = shipThrustImg.current;
      }
      const shipSprite = isAccelerating ? shipThrustSprite : shipIdleSprite;
      if (shipSprite && shipSprite.complete) {
        ctx.save();
        ctx.translate(game.ship.x, game.ship.y);
        ctx.rotate(game.ship.angle + Math.PI / 2);
        
        // Apply green health glow effect if active (check ref for immediate timing)
        const now = Date.now();
        if (now < healthGlowEndTimeRef.current) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = "hsl(120, 100%, 50%)"; // Bright green glow
        } else {
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        }
        
        const spriteSize = game.ship.radius * 2;
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

      if (game.shake > 0) {
        ctx.restore();
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, [gameState, score, highScore, health]);

  const startGame = async () => {
    playMenuClose().catch(console.error); // Play menu close sound when starting/resuming game
    setGameState("playing");
    setScore(0);
    setHealth(3.0); // Reset to full health
    setShield(0.0); // Reset shield
    setHasUpgraded(false); // Reset ship level 2 state
    setHasUpgradedToShip3(false); // Reset ship level 3 state
    
    // Only reset difficulty to medium if no manual difficulty has been set
    const difficultyManager = difficultyManagerRef.current;
    const currentDiff = difficultyManager.getCurrentDifficulty();
    
    // Check if this is a fresh start (no manual override) - only then reset to medium
    if (!difficultyManager.isManuallySet()) {
      difficultyManager.setDifficulty('medium', false);
      setCurrentDifficulty('medium');
    } else {
      // Keep the manually set difficulty
      setCurrentDifficulty(currentDiff);
    }
    
    // Show captain dialog at game start
    setShowCaptainDialog(true);
    toastManager.clearQueue(); // Clear any pending toast notifications immediately when captain dialog appears
    toastManager.updateThreshold(0); // Reset toast threshold for new game
    playCaptainSpeech(); // Play captain speech when dialog appears
    
    // Ensure audio starts when user interacts with the game
    try {
      await startThemeMusic();
      // Start ship engine loops when game starts
      AudioManager.getInstance().startShipEngineLoops();
    } catch (error) {
      console.log('Audio initialization failed:', error);
    }
    
    const game = gameRef.current;
    game.gameStartTime = Date.now(); // Initialize game start time
    game.ship.x = canvasRef.current!.width / 2;
    game.ship.y = canvasRef.current!.height / 2;
    game.ship.vx = 0;
    game.ship.vy = 0;
    game.planets = [];
    game.stars = [];
    game.scraps = [];
    game.healthWrenches = [];
    game.ammoPowerUps = [];
    game.bullets = [];
    game.particles = [];
    game.difficulty = 1;
    game.invulnerable = 180;
    game.nearMissTracker.clear(); // Clear near-miss tracking for new game
    game.planetIdCounter = 0; // Reset planet ID counter
    
    // Reset shooting state
    setAmmo(maxAmmo); // Start with full ammo (100 or 200 based on level)
    setIsRecharging(false);
    setIsUnlimitedAmmo(false);
    
    // Reset visual effects
    healthGlowEndTimeRef.current = 0;
    
    // Reset combo tracking
    game.comboCount = 0;
    game.lastComboTime = 0;
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-slate-900"
      style={{ 
        touchAction: isMobile ? 'none' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {/* Game Area Container */}
      <div className={`flex flex-col items-center w-full h-full p-1 sm:p-2 md:p-4 ${isMobile ? 'justify-start pb-[15vh]' : 'justify-center'}`}>
        {/* UI Header - Responsive Layout */}
        {gameState === "playing" && (
          <div className="w-full max-w-6xl mb-1 sm:mb-2 md:mb-4">
            {isMobile ? (
              /* Mobile Layout - Stacked */
              <div className="space-y-2 sm:space-y-3">
                {/* Top Row - Logo, Help, and Score */}
                <div className="flex items-center justify-between px-1 sm:px-2">
                  <img 
                    src={logoImage} 
                    alt="Game Logo" 
                    className="h-6 sm:h-8 w-auto object-contain" 
                  />
                  
                  {/* Center section with High Score and Current Score */}
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    {highScore > 0 && (
                      <div className="text-xs sm:text-sm text-accent glow-blue">
                        High Score: {highScore}
                      </div>
                    )}
                    {/* Score and Difficulty on same row */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`text-xl sm:text-2xl md:text-3xl font-bold transition-colors duration-300 ${
                        score > highScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'
                      }`}>
                        {score}
                      </div>
                      
                      {/* Difficulty Indicator */}
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        (<span className={`font-semibold ${
                          currentDifficulty === 'easy' ? 'text-green-400' :
                          currentDifficulty === 'medium' ? 'text-blue-400' :
                          'text-red-400'
                        }`}>
                          {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
                        </span>)
                      </div>
                    </div>
                  </div>
                  
                  {/* Help Icon and Hamburger Menu */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors flex items-center justify-center text-lg font-bold z-[70]"
                    >
                      ?
                    </button>
                    <HamburgerMenu 
                      showJoystick={showJoystick}
                      onToggleJoystick={handleToggleJoystick}
                      isMobile={isMobile}
                      isMuted={isMuted}
                      onToggleMute={toggleMute}
                      currentDifficulty={currentDifficulty}
                      onDifficultyChange={handleDifficultyChange}
                      highScore={highScore}
                    />
                  </div>
                </div>
                
                {/* Bottom Row - Health, Shield, and Pause */}
                <div className="flex items-center justify-between px-1 sm:px-2">
                  {/* Health and Shield */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Health Bar */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <img src={redCrossSprite} alt="Health" className="w-4 sm:w-5 h-4 sm:h-5 drop-shadow-lg" style={{filter: 'drop-shadow(0 0 4px #00ffff)'}} />
                      <div className="relative w-16 sm:w-20 h-2 sm:h-2.5 bg-black/50 rounded-full border border-primary/30">
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                            health >= 2.5 ? 'bg-green-500' :
                            health >= 1.5 ? 'bg-yellow-500' :
                            health > 0 ? 'bg-red-500' :
                            'bg-transparent'
                          }`}
                          style={{
                            width: `${Math.max(0, (health / 3.0) * 100)}%`,
                            boxShadow: health > 0 ? `0 0 8px ${
                              health >= 2.5 ? '#22c55e' :
                              health >= 1.5 ? '#eab308' :
                              '#ef4444'
                            }` : 'none'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Shield Bar */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <img 
                        src={shieldSprite} 
                        alt="Shield" 
                        className={`w-4 sm:w-5 h-4 sm:h-5 drop-shadow-lg transition-opacity duration-300 ${shield > 0 ? 'opacity-100' : 'opacity-30'}`}
                        style={{filter: shield > 0 ? 'drop-shadow(0 0 4px #3b82f6)' : 'drop-shadow(0 0 2px #64748b)'}} 
                      />
                      <div className={`relative w-16 sm:w-20 h-2 sm:h-2.5 bg-black/50 rounded-full border transition-all duration-300 ${shield > 0 ? 'border-blue-500/50' : 'border-gray-500/30'}`}>
                        <div 
                          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(0, (shield / 3.0) * 100)}%`,
                            boxShadow: shield > 0 ? '0 0 8px #3b82f6' : 'none'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Ammo Bar */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <img 
                        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
                        alt="Weapon" 
                        className={`w-4 sm:w-5 h-4 sm:h-5 drop-shadow-lg transition-opacity duration-300 ${(hasWeapon && (ammo > 0 || isUnlimitedAmmo)) ? 'opacity-100' : 'opacity-30'}`}
                        style={{
                          filter: (hasWeapon && (ammo > 0 || isUnlimitedAmmo))
                            ? isUnlimitedAmmo
                              ? 'drop-shadow(0 0 8px #c0c0c0) brightness(1.3)'
                              : 'drop-shadow(0 0 4px #60a5fa)'
                            : 'drop-shadow(0 0 2px #64748b)',
                          content: `url(${unlimitedAmmoImage})`
                        }}
                      />
                      <div className={`relative w-16 sm:w-20 h-2 sm:h-2.5 bg-black/50 rounded-full border transition-all duration-300 ${hasWeapon ? (isUnlimitedAmmo ? 'border-gray-400/50' : 'border-cyan-500/50') : 'border-gray-500/30'}`}>
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                            isUnlimitedAmmo ? 'bg-gradient-to-r from-gray-300 to-slate-400' : 
                            isRecharging ? 'bg-cyan-400' : 
                            'bg-cyan-500'
                          }`}
                          style={{
                            width: !hasWeapon ? '0%' : (isUnlimitedAmmo ? '100%' : `${Math.max(0, (ammo / maxAmmo) * 100)}%`),
                            boxShadow: hasWeapon
                              ? isUnlimitedAmmo 
                                ? '0 0 10px #c0c0c0'
                                : '0 0 8px #60a5fa'
                              : 'none',
                            animation: isRecharging ? 'pulse 1s ease-in-out infinite' : 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Pause Button */}
                  <Button
                    onClick={() => {
                      console.log("🎮 PAUSE BUTTON CLICKED - About to call playMenuOpen()");
                      playMenuOpen().catch(console.error);
                      AudioManager.getInstance().stopShipEngineLoops(); // Stop ship engine loops when paused
                      setGameState("paused");
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-black/50 border-primary/30 text-primary hover:bg-primary/20 touch-manipulation text-xs sm:text-sm"
                    style={{ minHeight: '36px', minWidth: '36px' }}
                  >
                    ⏸️
                  </Button>
                </div>
              </div>
            ) : (
              /* Desktop Layout - Single Row */
              <div className="flex items-center justify-between px-2">
                {/* Left side - Logo and Score */}
                <div className="flex items-center gap-6">
                  <img 
                    src={logoImage} 
                    alt="Game Logo" 
                    className="h-10 w-auto object-contain" 
                  />
                  <div className="flex items-center gap-4">
                    {highScore > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="text-xs text-accent glow-blue opacity-80">
                          High Score
                        </div>
                        <div className="text-xl font-bold text-accent glow-blue">
                          {highScore}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-blue-400 glow-blue opacity-80">
                        Score
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-3xl font-bold transition-colors duration-300 ${
                          score > highScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'
                        } text-glow`}>
                          {score}
                        </div>
                        
                        {/* Difficulty Indicator */}
                        <div className="text-sm text-muted-foreground">
                          (<span className={`font-semibold ${
                            currentDifficulty === 'easy' ? 'text-green-400' :
                            currentDifficulty === 'medium' ? 'text-blue-400' :
                            'text-red-400'
                          }`}>
                            {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
                          </span>)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Health, Shield, Ammo, and Menu */}
                <div className="flex items-center gap-4">
                  <img src={redCrossSprite} alt="Health" className="w-6 h-6 drop-shadow-lg" style={{filter: 'drop-shadow(0 0 4px #00ffff)'}} />
                  <div className="relative w-32 h-3 bg-black/50 rounded-full border border-primary/30">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                        health >= 2.5 ? 'bg-green-500' :
                        health >= 1.5 ? 'bg-yellow-500' :
                        health > 0 ? 'bg-red-500' :
                        'bg-transparent'
                      }`}
                      style={{
                        width: `${Math.max(0, (health / 3.0) * 100)}%`,
                        boxShadow: health > 0 ? `0 0 10px ${
                          health >= 2.5 ? '#22c55e' :
                          health >= 1.5 ? '#eab308' :
                          '#ef4444'
                        }` : 'none'
                      }}
                    />
                  </div>
                  
                  {/* Shield Bar */}
                  <img 
                    src={shieldSprite} 
                    alt="Shield" 
                    className={`w-6 h-6 drop-shadow-lg transition-opacity duration-300 ${shield > 0 ? 'opacity-100' : 'opacity-30'}`}
                    style={{filter: shield > 0 ? 'drop-shadow(0 0 4px #3b82f6)' : 'drop-shadow(0 0 2px #64748b)'}} 
                  />
                  <div className={`relative w-32 h-3 bg-black/50 rounded-full border transition-all duration-300 ${shield > 0 ? 'border-blue-500/50' : 'border-gray-500/30'}`}>
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, (shield / 3.0) * 100)}%`,
                        boxShadow: shield > 0 ? '0 0 10px #3b82f6' : 'none'
                      }}
                    />
                  </div>
                  
                  {/* Ammo Bar */}
                  <img 
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
                    alt="Weapon" 
                    className={`w-6 h-6 drop-shadow-lg transition-opacity duration-300 ${(hasWeapon && (ammo > 0 || isUnlimitedAmmo)) ? 'opacity-100' : 'opacity-30'}`}
                    style={{
                      filter: (hasWeapon && (ammo > 0 || isUnlimitedAmmo))
                        ? isUnlimitedAmmo
                          ? 'drop-shadow(0 0 8px #c0c0c0) brightness(1.3)'
                          : 'drop-shadow(0 0 4px #60a5fa)'
                        : 'drop-shadow(0 0 2px #64748b)',
                      content: `url(${unlimitedAmmoImage})`
                    }}
                  />
                  <div className={`relative w-32 h-3 bg-black/50 rounded-full border transition-all duration-300 ${hasWeapon ? (isUnlimitedAmmo ? 'border-gray-400/50' : 'border-cyan-500/50') : 'border-gray-500/30'}`}>
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                        isUnlimitedAmmo ? 'bg-gradient-to-r from-gray-300 to-slate-400' : 
                        isRecharging ? 'bg-cyan-400' : 
                        'bg-cyan-500'
                      }`}
                      style={{
                        width: !hasWeapon ? '0%' : (isUnlimitedAmmo ? '100%' : `${Math.max(0, (ammo / maxAmmo) * 100)}%`),
                        boxShadow: hasWeapon
                          ? isUnlimitedAmmo 
                            ? '0 0 12px #c0c0c0'
                            : '0 0 10px #60a5fa'
                          : 'none',
                        animation: isRecharging ? 'pulse 1s ease-in-out infinite' : 'none'
                      }}
                    />
                  </div>
                  
                  {/* Hamburger Menu */}
                  <HamburgerMenu 
                    showJoystick={showJoystick}
                    onToggleJoystick={handleToggleJoystick}
                    isMobile={isMobile}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                    currentDifficulty={currentDifficulty}
                    onDifficultyChange={handleDifficultyChange}
                    highScore={highScore}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Game Canvas */}
        <div className="relative border-2 border-primary/30 rounded-lg overflow-hidden shadow-2xl">
          <canvas ref={canvasRef} className="block" />
        </div>
        
        {/* Help Popup Bubble - positioned relative to help icon */}
        {gameState === "playing" && showHelp && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-xl border border-primary/30 rounded-lg p-3 text-xs text-muted-foreground whitespace-nowrap shadow-lg z-[80]">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-card/95"></div>
            {isMobile ? (
              <p>Use joystick to move • Tap pause button to pause</p>
            ) : (
              <p>WASD/Arrow Keys: Move • Mouse: Aim • Escape: Pause</p>
            )}
          </div>
        )}
      </div>

      {gameState === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 sm:p-12 text-center max-w-md w-full space-y-4 sm:space-y-6">
            <img src={logoImage} alt="Void Runner" className="w-64 sm:w-80 h-auto mx-auto glow-blue" />
            <p className="text-muted-foreground text-base sm:text-lg">Run through gravitational chaos</p>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground text-left bg-muted/30 p-3 sm:p-4 rounded-lg">
              {isMobile ? (
                <>
                  <p>🕹️ <strong>Virtual joystick</strong> to move</p>
                  <p>⭐ Collect stars for points</p>
                  <p>💚 Collect wrenches for health</p>
                  <p>🪐 Avoid obstacles</p>
                </>
              ) : (
                <>
                  <p>🚀 <strong>WASD</strong> or <strong>Arrow Keys</strong> to thrust</p>
                  <p>⭐ Collect stars for points</p>
                  <p>💚 Collect wrenches for health</p>
                  <p>🪐 Avoid obstacles</p>
                </>
              )}
            </div>
            
            {/* Difficulty Selector */}
            <div className="space-y-2 pt-4">
              <div className="text-sm text-muted-foreground">Difficulty</div>
              <div className="flex gap-2 justify-center">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((difficulty) => {
                  const isHardLocked = difficulty === 'hard' && highScore < 12500;
                  return (
                  <button
                    key={difficulty}
                    onClick={() => {
                      if (isHardLocked) return; // Prevent click if locked
                      const difficultyManager = difficultyManagerRef.current;
                      difficultyManager.setDifficulty(difficulty, true);
                      setCurrentDifficulty(difficulty);
                    }}
                    disabled={isHardLocked}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isHardLocked 
                        ? 'bg-muted/10 text-muted-foreground/30 border border-muted/20 cursor-not-allowed opacity-50'
                        : currentDifficulty === difficulty
                        ? difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : difficulty === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        : 'bg-muted/30 text-muted-foreground border border-muted/50 hover:bg-blue-500/10 hover:text-blue-400'
                    }`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{isHardLocked && ' 🔒'}
                  </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentDifficulty === 'easy' && 'Fewer obstacles, more forgiving'}
                {currentDifficulty === 'medium' && 'Balanced gameplay, can get crazy'}
                {currentDifficulty === 'hard' && 'More obstacles and faster, RIP'}
              </div>
            </div>
            
            {/* Achievements - Show when any previous score exists */}
            {highScore > 0 && (
              <div className="space-y-2 pt-4 border-t border-blue-500/20">
                <div className="text-sm text-muted-foreground">Achievements</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 1500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                    <img 
                      src={trophyImage} 
                      alt="Trophy" 
                      className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 1500 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">Rookie</div>
                      <div className="text-xs opacity-70">1,500+ pts</div>
                    </div>
                  </div>
                  <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 12500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                    <img 
                      src={trophyImage} 
                      alt="Trophy" 
                      className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 12500 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">Ace Pilot</div>
                      <div className="text-xs opacity-70">12,500+ pts</div>
                    </div>
                  </div>
                  <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 25000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                    <img 
                      src={trophyImage} 
                      alt="Trophy" 
                      className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 25000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">Legend</div>
                      <div className="text-xs opacity-70">25,000+ pts</div>
                    </div>
                  </div>
                  <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 75000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                    <img 
                      src={trophyImage} 
                      alt="Trophy" 
                      className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 75000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">Psychonaut</div>
                      <div className="text-xs opacity-70">75,000+ pts</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Button onClick={startGame} size="lg" className="w-full bg-blue-500 text-white hover:bg-blue-600 glow-blue text-base sm:text-lg">
              START GAME
            </Button>
            {highScore > 0 && (
              <div className="text-accent glow-blue text-sm sm:text-base">High Score: {highScore}</div>
            )}
          </div>
        </div>
      )}

      {gameState === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-3 sm:space-y-4 w-full max-w-sm">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 glow-blue">PAUSED</h2>
            
            <Button onClick={() => {
              playMenuClose().catch(console.error);
              AudioManager.getInstance().startShipEngineLoops(); // Restart ship engine loops when resuming
              setGameState("playing");
            }} className="bg-blue-500 text-white hover:bg-blue-600 w-full">
              RESUME
            </Button>
            
            {/* Hamburger Menu Options */}
            <div className="space-y-2 pt-2 border-t border-blue-500/20">
              {/* Joystick Toggle - Only show on desktop */}
              {!isMobile && (
                <Button
                  onClick={() => {
                    setShowJoystick(!showJoystick);
                  }}
                  variant="outline"
                  className={`w-full ${
                    showJoystick 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                      : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                  }`}
                >
                  Joystick (J) {showJoystick ? '✓' : ''}
                </Button>
              )}
              
              {/* Mute Toggle */}
              <Button
                onClick={() => {
                  toggleMute();
                }}
                variant="outline"
                className={`w-full ${
                  isMuted 
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                    : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                }`}
              >
                Mute (M) {isMuted ? '✓' : ''}
              </Button>
              
              {/* Difficulty Selection */}
              <div className="space-y-2 pt-4">
                <div className="text-sm text-muted-foreground">Difficulty</div>
                <div className="flex gap-1">
                  {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                    const isHardLocked = difficulty === 'hard' && highScore < 12500;
                    return (
                    <button
                      key={difficulty}
                      onClick={() => {
                        if (isHardLocked) return;
                        const difficultyManager = difficultyManagerRef.current;
                        difficultyManager.setDifficulty(difficulty, true);
                        setCurrentDifficulty(difficulty);
                      }}
                      disabled={isHardLocked}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex-1 ${
                        isHardLocked 
                          ? 'bg-muted/10 text-muted-foreground/30 border border-muted/20 cursor-not-allowed opacity-50'
                          : currentDifficulty === difficulty
                          ? difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : difficulty === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : 'bg-muted/30 text-muted-foreground border border-muted/50 hover:bg-blue-500/10 hover:text-blue-400'
                      }`}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{isHardLocked && ' 🔒'}
                    </button>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {currentDifficulty === 'easy' && 'Fewer obstacles, more forgiving'}
                  {currentDifficulty === 'medium' && 'Balanced gameplay, can get crazy'}
                  {currentDifficulty === 'hard' && 'More obstacles and faster, RIP'}
                </div>
              </div>
              
              {/* Achievements - Show when any previous score exists */}
              {highScore > 0 && (
                <div className="space-y-2 pt-4 border-t border-blue-500/20">
                  <div className="text-sm text-muted-foreground">Achievements</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 1500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 1500 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Ship Lvl 2</div>
                        <div className="text-xs opacity-70">1,500+ pts</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 12500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 5000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Ace Pilot</div>
                        <div className="text-xs opacity-70">12,500+ pts</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 25000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 25000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Ace Pilot</div>
                        <div className="text-xs opacity-70">25,000+ pts</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 75000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 75000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Legend</div>
                        <div className="text-xs opacity-70">75,000+ pts</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 sm:p-12 text-center space-y-4 sm:space-y-6 w-full max-w-md">
            <img src={gameOverImage} alt="Game Over" className="w-48 sm:w-64 h-auto mx-auto" />
            <div className="space-y-1 sm:space-y-2">
              <div className="text-xl sm:text-2xl">
                Score: <span className={`font-bold transition-colors duration-300 ${
                  score >= highScore ? 'text-yellow-400 glow-blue' : 'text-blue-400 glow-blue'
                }`}>{score}</span>
                {score >= highScore && score > 0 && (
                  <div className="text-sm text-blue-400 glow-blue animate-pulse">NEW HIGH SCORE!</div>
                )}
              </div>
              <div className="text-lg sm:text-xl text-muted-foreground">
                Previous High Score: <span className={`font-bold ${
                  previousHighScore >= highScore && previousHighScore > 0
                    ? 'text-yellow-400 glow-yellow'
                    : 'text-blue-400 glow-blue'
                }`}>{previousHighScore > 0 ? previousHighScore : 'None'}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button onClick={startGame} size="lg" className="w-full bg-blue-500 text-white hover:bg-blue-600 glow-blue">
                PLAY AGAIN
              </Button>
              
              <Button 
                onClick={() => {
                  playMenuClose().catch(console.error);
                  setGameState("menu");
                }} 
                variant="outline" 
                size="lg" 
                className="w-full bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400"
              >
                MAIN MENU
              </Button>
            </div>
            
            {/* Hamburger Menu Options */}
            <div className="space-y-2 pt-4 border-t border-blue-500/20">
              {/* Joystick Toggle - Only show on desktop */}
              {!isMobile && (
                <Button
                  onClick={() => {
                    setShowJoystick(!showJoystick);
                  }}
                  variant="outline"
                  className={`w-full ${
                    showJoystick 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                      : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                  }`}
                >
                  Joystick (J) {showJoystick ? '✓' : ''}
                </Button>
              )}
              
              {/* Mute Toggle */}
              <Button
                onClick={() => {
                  toggleMute();
                }}
                variant="outline"
                className={`w-full ${
                  isMuted 
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                    : 'bg-card/50 border-blue-500/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                }`}
              >
                Mute (M) {isMuted ? '✓' : ''}
              </Button>
              
              {/* Difficulty Selection */}
              <div className="space-y-2 pt-4">
                <div className="text-sm text-muted-foreground">Difficulty</div>
                <div className="flex gap-1">
                  {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                    const isHardLocked = difficulty === 'hard' && highScore < 12500;
                    return (
                    <button
                      key={difficulty}
                      onClick={() => {
                        if (isHardLocked) return;
                        const difficultyManager = difficultyManagerRef.current;
                        difficultyManager.setDifficulty(difficulty, true);
                        setCurrentDifficulty(difficulty);
                      }}
                      disabled={isHardLocked}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex-1 ${
                        isHardLocked 
                          ? 'bg-muted/10 text-muted-foreground/30 border border-muted/20 cursor-not-allowed opacity-50'
                          : currentDifficulty === difficulty
                          ? difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : difficulty === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : 'bg-muted/30 text-muted-foreground border border-muted/50 hover:bg-blue-500/10 hover:text-blue-400'
                      }`}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{isHardLocked && ' 🔒'}
                    </button>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {currentDifficulty === 'easy' && 'Fewer obstacles, more forgiving'}
                  {currentDifficulty === 'medium' && 'Balanced gameplay, can get crazy'}
                  {currentDifficulty === 'hard' && 'More obstacles and faster, RIP'}
                </div>
              </div>
              
              {/* Achievements - Show when any previous score exists */}
              {highScore > 0 && (
                <div className="space-y-2 pt-4 border-t border-blue-500/20">
                  <div className="text-sm text-muted-foreground">Achievements</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 1500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 1500 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Ship Lvl 2</div>
                        <div className="text-xs opacity-70">1,500+ pts</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 12500 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 5000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Ace Pilot</div>
                        <div className="text-xs opacity-70">12,500+ pts</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 25000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 25000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Ace Pilot</div>
                        <div className="text-xs opacity-70">25,000+ pts</div>
                      </div>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-2 ${highScore >= 75000 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}>
                      <img 
                        src={trophyImage} 
                        alt="Trophy" 
                        className={`w-5 h-5 object-contain flex-shrink-0 ${highScore >= 75000 ? 'opacity-100' : 'opacity-20 grayscale'}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Legend</div>
                        <div className="text-xs opacity-70">75,000+ pts</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Virtual Joystick - Visible on mobile or when toggled on desktop */}
      <VirtualJoystick
        onMove={handleJoystickInput}
        isVisible={gameState === "playing" && (isMobile || showJoystick)}
      />
      
      {/* Captain Dialog */}
      <CaptainDialog
        isVisible={showCaptainDialog}
        onComplete={handleCaptainDialogComplete}
      />
      
      {/* Level Up Captain Dialog */}
      <CaptainDialog
        isVisible={showLevelUpDialog}
        onComplete={handleLevelUpDialogComplete}
        message={levelUpMessage}
      />

      {/* Game Over Captain Dialog */}
      <CaptainDialog
        isVisible={showGameOverDialog}
        onComplete={handleGameOverDialogComplete}
        message={gameOverMessage}
      />
    </div>
  );
};
