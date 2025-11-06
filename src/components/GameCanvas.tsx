import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { MainMenu } from "./ui/MainMenu";
import { PauseMenu } from "./ui/PauseMenu";
import { GameOverMenu } from "./ui/GameOverMenu";
import { GameHUD } from "./ui/GameHUD";
import { priorityToast, toastManager, formatToastWithCombo } from "../utils/toastPriority";
import { showPickupNotification } from "./PickupNotification";
import { StarField } from "../utils/StarField";
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
import speech1Audio from "@/assets/speech1.mp3";
import speech2Audio from "@/assets/speech2.mp3";
import unlimitedAmmoImage from '@/assets/unlimited_ammo.png';
import voidWipeSprite from '@/assets/void_wipe.png';
import { createBullet, updateBullets, checkBulletPlanetCollision, checkBulletScrapCollision, calculateDamage, getMaxHealth, FIRE_RATE, AUTO_FIRE_RATE, AMMO_DRAIN_RATE, RECHARGE_TIME, BULLET_SPEED } from "@/utils/shooting";
import { renderBullets } from "@/utils/bulletRenderer";
import { createAmmoPowerUp, shouldSpawnAmmoPowerUp, renderAmmoPowerUp, UNLIMITED_AMMO_DURATION } from "@/utils/ammoPowerUpSpawning";
import { findNearestEnemy, calculateLeadShot } from "@/utils/autoTargeting";
import { GameEngine } from "@/game/GameEngine";
import { Renderer } from "@/game/Renderer";

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
  pulsePhase?: number;
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
  const voidWipeImg = useRef<HTMLImageElement>(null!);
  const starFieldRef = useRef<StarField | null>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("orbitalHighScore") || "0"));
  const [previousHighScore, setPreviousHighScore] = useState(() => parseInt(localStorage.getItem("orbitalHighScore") || "0")); // Track previous high score for display
  
  // Achievement stat tracking
  const [totalNearMisses, setTotalNearMisses] = useState(() => parseInt(localStorage.getItem("totalNearMisses") || "0"));
  const [totalRepairs, setTotalRepairs] = useState(() => parseInt(localStorage.getItem("totalRepairs") || "0"));
  const [totalShotsFired, setTotalShotsFired] = useState(() => parseInt(localStorage.getItem("totalShotsFired") || "0"));
  
  // Function to send stats to parent window (FlashCore portal)
  const sendStatsToParent = useCallback((score: number, nearMisses: number, repairs: number, shotsFired: number) => {
    // Calculate achievements unlocked
    const achievements = [
      { id: 'rookie', threshold: 1500, check: () => score >= 1500 },
      { id: 'ace', threshold: 12500, check: () => score >= 12500 },
      { id: 'legend', threshold: 25000, check: () => score >= 25000 },
      { id: 'psychonaut', threshold: 75000, check: () => score >= 75000 },
      { id: 'voidwizard', threshold: 300000, check: () => score >= 300000 },
      { id: 'untouchable', threshold: 50, check: () => nearMisses >= 50 },
      { id: 'builtdifferent', threshold: 50, check: () => repairs >= 50 },
      { id: 'lockedin', threshold: 5000, check: () => shotsFired >= 5000 },
    ];
    
    const achievementsUnlocked = achievements.filter(a => a.check()).length;
    const achievementsTotal = achievements.length;
    
    // Send to parent window if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'game:stats',
        highScore: score,
        achievementsUnlocked,
        achievementsTotal
      }, '*');
    }
  }, []);
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
  
  // Send stats to parent window (FlashCore portal) whenever they change
  useEffect(() => {
    sendStatsToParent(highScore, totalNearMisses, totalRepairs, totalShotsFired);
  }, [highScore, totalNearMisses, totalRepairs, totalShotsFired, sendStatsToParent]);
  
  // Close help popup when clicking outside
  useEffect(() => {
    if (!showHelp) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the help popup and help button
      if (!target.closest('.help-popup') && !target.closest('.help-button')) {
        setShowHelp(false);
      }
    };
    
    // Add small delay to prevent immediate closing when opening
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelp]);
  
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
    // Clear any existing dialogs first to prevent overlay
    setShowCaptainDialog(false);
    setShowGameOverDialog(false);
    
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

  const handleResume = useCallback(() => {
    playMenuClose().catch(console.error);
    AudioManager.getInstance().startShipEngineLoops();
    setGameState("playing");
    setAudioGameState(GameState.PLAYING); // Update audio volume for gameplay
  }, [playMenuClose, setAudioGameState, GameState]);

  const handleMainMenu = useCallback(() => {
    playMenuClose().catch(console.error);
    setGameState("menu");
    setAudioGameState(GameState.MENU); // Update audio volume for menu
  }, [playMenuClose, setAudioGameState, GameState]);

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
                // Clear any existing dialogs first to prevent overlay
                setShowCaptainDialog(false);
                setShowLevelUpDialog(false);
                
                const randomQuote = captainGameOverQuotes[Math.floor(Math.random() * captainGameOverQuotes.length)];
                setGameOverMessage(randomQuote);
                setShowGameOverDialog(true);
                playCaptainSpeech(); // Play random captain speech
              }, 1700);
              
              setGameState("gameover");
              setAudioGameState(GameState.GAME_OVER); // Update audio volume for game over
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
                // Clear any existing dialogs first to prevent overlay
                setShowCaptainDialog(false);
                setShowLevelUpDialog(false);
                
                const randomQuote = captainGameOverQuotes[Math.floor(Math.random() * captainGameOverQuotes.length)];
                setGameOverMessage(randomQuote);
                setShowGameOverDialog(true);
                playCaptainSpeech(); // Play random captain speech
              }, 1700);
              
              setGameState("gameover");
              setAudioGameState(GameState.GAME_OVER); // Update audio volume for game over
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
  
  // Scale factor ref for resolution-based scaling (1920x1080 as reference)
  const scaleFactorRef = useRef(1.0);
  
  const gameRef = useRef({
    ship: { x: 0, y: 0, vx: 0, vy: 0, radius: 31, angle: 0 }, // Base size, will be scaled by scaleFactor
    planets: [] as Planet[],
    stars: [] as Star[],
    scraps: [] as Scrap[],
    healthWrenches: [] as HealthWrench[],
    particles: [] as Particle[],
    shipTrails: [] as ShipTrail[],
    bullets: [] as Bullet[],
    ammoPowerUps: [] as AmmoPowerUp[],
    voidWipes: [] as any[], // VoidWipe type
    keys: {} as Record<string, boolean>,
    mouse: { x: 0, y: 0 },
    lastPlanetSpawn: 0,
    lastStarSpawn: 0,
    lastAmmoPowerUpSpawn: 0,
    lastHealthWrenchSpawn: 0,
    lastVoidWipeSpawn: 0,
    lastVoidWipeCollected: 0, // Track when void wipe was collected for respite period
    gameStartTime: 0,
    difficulty: 1,
    invulnerable: 0,
    shake: 0,
    nearMissTracker: new Map<string, number>(), // Track near-miss cooldowns for each planet
    planetIdCounter: 0, // Counter for generating unique planet IDs
    comboCount: 0, // Track consecutive scoring actions
    lastComboTime: 0, // Track when last combo action happened
  });

  // GameEngine instance for testing particle updates
  const engineRef = useRef<GameEngine | null>(null);
  
  // Renderer instance for handling all canvas drawing
  const rendererRef = useRef<Renderer | null>(null);

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

    const voidWipe = new Image();
    voidWipe.src = voidWipeSprite;
    voidWipeImg.current = voidWipe;
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
    
    // === FIXED INTERNAL RESOLUTION SYSTEM ===
    // Canvas ALWAYS runs at 1920x1080 internally for perfect 1:1 gameplay
    // CSS handles scaling to fit any screen size
    const INTERNAL_WIDTH = 1920;
    const INTERNAL_HEIGHT = 1080;
    
    // Lock canvas to fixed internal resolution
    canvas.width = INTERNAL_WIDTH;
    canvas.height = INTERNAL_HEIGHT;
    
    // Calculate display size (for CSS scaling later)
    // Reserve space at bottom for UI elements (joystick, notifications, help button, captain dialog)
    const UI_BOTTOM_SPACE = isMobile ? 300 : 180; // Space for joystick (120px) + notifications + dialogs + breathing room
    const availableWidth = window.innerWidth;
    const availableHeight = (isMobile ? window.innerHeight * 0.98 : window.innerHeight) - UI_BOTTOM_SPACE;
    const aspectRatio = INTERNAL_WIDTH / INTERNAL_HEIGHT; // 16:9
    
    let displayWidth: number;
    let displayHeight: number;
    
    if (availableWidth / availableHeight > aspectRatio) {
      // Screen wider than 16:9 - constrain by height
      displayHeight = availableHeight;
      displayWidth = displayHeight * aspectRatio;
    } else {
      // Screen taller/equal to 16:9 - constrain by width
      displayWidth = availableWidth;
      displayHeight = displayWidth / aspectRatio;
    }
    
    // Store display dimensions for CSS scaling
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.style.imageRendering = 'auto'; // Smooth scaling
    
    // Scale factor is always 1.0 (no asset scaling needed)
    scaleFactorRef.current = 1.0;

    // Initialize StarField
    if (!starFieldRef.current) {
      starFieldRef.current = new StarField(canvas);
    }

    // Initialize GameEngine with callbacks
    if (!engineRef.current) {
      engineRef.current = new GameEngine(
        INTERNAL_WIDTH,
        INTERNAL_HEIGHT,
        1.0, // No scaling - always 1920x1080
        {
          onScoreChange: (newScore: number) => {
            // DISABLED: GameEngine's absolute score updates cause race conditions
            // Score is managed by GameCanvas's awardPoints() function and direct setScore() calls
            // setScore(newScore);
          },
          onHealthChange: (newHealth: number) => {
            setHealth(newHealth);
          },
          onShieldChange: (newShield: number) => {
            setShield(newShield);
          },
          onGameOver: () => {
            setGameState("gameover");
            setAudioGameState(GameState.GAME_OVER); // Update audio volume for game over
          },
          onShipUpgrade: (level: 2 | 3) => {
            // Upgrades now handled in game loop to match original behavior
            // This callback kept for GameEngine compatibility but not used
          },
          onAmmoChange: (newAmmo: number) => {
            setAmmo(newAmmo);
          },
          onRechargeStateChange: (isRecharging: boolean) => {
            setIsRecharging(isRecharging);
          },
          onUnlimitedAmmoChange: (isUnlimited: boolean, endTime: number) => {
            setIsUnlimitedAmmo(isUnlimited);
            setUnlimitedAmmoEndTime(endTime);
          },
          onShowToast: (message: string, points: number, options?: any) => {
            // Award points AND show toast
            // Use functional update to avoid race conditions with other score updates
            setScore(prev => prev + points);
            priorityToast(message, points, options);
          },
          onShowPickupNotification: (message: string, className: string) => {
            showPickupNotification(message, className);
          },
          onPlaySound: (soundName: string) => {
            // Play the sound requested by the game engine
            playSound(soundName).catch(console.error);
          },
          onHealthGlow: (duration: number) => {
            healthGlowEndTimeRef.current = Date.now() + duration;
          },
          onCreateParticles: (x: number, y: number, color: string, count: number) => {
            // Particles will be created by startGame's createParticles function
            // We'll wire this up properly later in the refactor
            const game = gameRef.current;
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
          },
          onCreateExplosion: (x: number, y: number, blastRadius: number, force: number, excludeIndices: number[]) => {
            // This will be wired up to the createExplosion function in startGame
            // For now, just log it - we'll connect it properly below
            console.log("Explosion callback:", x, y, blastRadius, force, excludeIndices);
          },
        }
      );
    }
    
    // Initialize Renderer
    if (!rendererRef.current) {
      rendererRef.current = new Renderer();
      rendererRef.current.setDimensions(canvas.width, canvas.height);
      rendererRef.current.setStarField(starFieldRef.current!);
      // Pass image refs to renderer
      rendererRef.current.setImages({
        shipIdle: shipIdleImg.current,
        shipThrust: shipThrustImg.current,
        ship2Idle: ship2IdleImg.current,
        ship2Thrust: ship2ThrustImg.current,
        ship3Idle: ship3IdleImg.current,
        ship3Thrust: ship3ThrustImg.current,
        meteor: meteorImg.current,
        planet2: planet2Img.current,
        blackhole: blackholeImg.current,
        debris: debrisImg.current,
        scrap: scrapImg.current,
        star: starImg.current,
        starUpgrade: starUpgradeImg.current,
        starUpgrade2: starUpgrade2Img.current,
        healthWrench: healthWrenchImg.current,
        unlimitedAmmo: unlimitedAmmoImg.current,
        voidWipe: voidWipeImg.current,
        shield: new Image(), // TODO: Add shield image ref
      });
    }

    const game = gameRef.current;
    game.ship.x = INTERNAL_WIDTH / 2; // 960
    game.ship.y = INTERNAL_HEIGHT / 2; // 540
    game.ship.radius = 31; // Fixed size, no scaling

    const handleResize = () => {
      // Recalculate CSS display size only (internal resolution stays 1920x1080)
      // Reserve space at bottom for UI elements (joystick, notifications, help button, captain dialog)
      const UI_BOTTOM_SPACE = isMobile ? 300 : 180; // Space for joystick (120px) + notifications + dialogs + breathing room
      const availableWidth = window.innerWidth;
      const availableHeight = (isMobile ? window.innerHeight * 0.98 : window.innerHeight) - UI_BOTTOM_SPACE;
      const aspectRatio = INTERNAL_WIDTH / INTERNAL_HEIGHT;
      
      let displayWidth: number;
      let displayHeight: number;
      
      if (availableWidth / availableHeight > aspectRatio) {
        displayHeight = availableHeight;
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayWidth = availableWidth;
        displayHeight = displayWidth / aspectRatio;
      }
      
      // Update CSS display dimensions
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Internal canvas dimensions remain fixed at 1920x1080
      // No need to update ship radius, StarField, or Renderer
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
      
      // Close help popup with Escape if it's showing
      if (e.key === "Escape" && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }
      
      game.keys[e.key.toLowerCase()] = true;
      if (e.key === "Escape" && gameState === "playing") {
        e.preventDefault();
        playMenuOpen().catch(console.error);
        AudioManager.getInstance().stopShipEngineLoops(); // Stop ship engine loops when paused
        setGameState("paused");
        setAudioGameState(GameState.PAUSED); // Update audio volume for pause menu
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Transform screen coordinates to internal 1920x1080 coordinates
      const rect = canvas.getBoundingClientRect();
      const scaleX = INTERNAL_WIDTH / rect.width;
      const scaleY = INTERNAL_HEIGHT / rect.height;
      game.mouse.x = (e.clientX - rect.left) * scaleX;
      game.mouse.y = (e.clientY - rect.top) * scaleY;
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
        radius: 32 + Math.random() * 25, // Fixed size for 1920x1080
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
        planet.radius = 26 + Math.random() * 18; // Fixed size for 1920x1080
        planet.mass = 800 + Math.random() * 1500; // Less massive than regular planets
      } else if (planetType === "blackhole") {
        // Blackholes are larger, slower, with stronger gravity
        planet.vx *= 0.3; // Much slower movement (70% reduction)
        planet.vy *= 0.3;
        planet.rotation = 0;
        planet.rotationSpeed = 0.01 + Math.random() * 0.02; // Slow, ominous rotation
        planet.radius = 42 + Math.random() * 30; // Fixed size for 1920x1080
        planet.mass = 2500 + Math.random() * 3000; // Much more massive
        planet.gravityMultiplier = 2.5 + Math.random() * 1.5; // 2.5x to 4x stronger gravity
        planet.color = "hsl(270, 50%, 20%)"; // Dark purple color
      } else if (planetType === "debris") {
        // Debris has bouncing mechanics and slow rotation
        planet.vx *= 0.8; // Slightly slower movement
        planet.vy *= 0.8;
        planet.rotation = 0;
        planet.rotationSpeed = 0.003 + Math.random() * 0.007; // Very slow rotation
        planet.radius = 24 + Math.random() * 16; // Fixed size for 1920x1080
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
        radius: 9,
        collected: false,
        pulsePhase: Math.random() * Math.PI * 2 // Start at a random phase
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
        radius: 24, // Fixed size for 1920x1080
        collected: false,
        pulsePhase: 0
      });
    };

    const spawnVoidWipe = () => {
      // Spawn away from ship to avoid instant collection
      let x, y;
      do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
      } while (Math.sqrt((x - game.ship.x) ** 2 + (y - game.ship.y) ** 2) < 200);

      game.voidWipes.push({
        x, y,
        vx: 0, vy: 0,
        radius: 28, // Fixed size for 1920x1080
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

    // Wire up explosion callback to GameEngine now that createExplosion is defined
    if (engineRef.current) {
      engineRef.current.callbacks.onCreateExplosion = createExplosion;
    }

    const gameLoop = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 16.67;
      lastTime = now;
      
      // Update toast threshold based on current score to reduce notification spam in late game
      toastManager.updateThreshold(score);

      // Ship controls - calculate isAccelerating before rendering
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

      // === Phases 2-8: Background, particles, bullets, planets, stars, pickups, and ship now handled by Renderer ===
      if (rendererRef.current) {
        rendererRef.current.render(ctx, game, { 
          delta, 
          isUnlimitedAmmo, 
          score,
          health,
          shield,
          isAccelerating,
          healthGlowEndTimeRef: healthGlowEndTimeRef.current
        });
      }

      if (game.shake > 0) {
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * game.shake,
          (Math.random() - 0.5) * game.shake
        );
        game.shake *= 0.9;
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
            
            // Track shots fired for achievement
            setTotalShotsFired(prev => {
              const newTotal = prev + 1;
              localStorage.setItem("totalShotsFired", newTotal.toString());
              return newTotal;
            });
            
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
            const target = findNearestEnemy(game.ship, game.planets, 400);
            
            if (target) {
              // Calculate lead shot for moving targets
              const targetAngle = calculateLeadShot(game.ship, target.planet, BULLET_SPEED);
              
              // Create auto-targeting bullet
              const bullet = createBullet(game.ship, true, targetAngle);
              game.bullets.push(bullet);
              
              // Track shots fired for achievement
              setTotalShotsFired(prev => {
                const newTotal = prev + 1;
                localStorage.setItem("totalShotsFired", newTotal.toString());
                return newTotal;
              });
              
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
          setAmmo(rechargeProgress * maxAmmo);
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

      // === TESTING: Delegate ALL ship physics to GameEngine ===
      // Apply gravity, friction, rotation, then position update in engine
      if (engineRef.current) {
        engineRef.current.setShip(game.ship);
        engineRef.current.setPlanets(game.planets);
        engineRef.current.updateShipGravityOnly();
        engineRef.current.updateShipFrictionOnly();
        engineRef.current.updateShipRotationOnly();
        engineRef.current.updateShipPositionOnly(delta);
        // Sync entire ship state back after all physics
        const engineStateAfterPhysics = engineRef.current.getState();
        game.ship.x = engineStateAfterPhysics.ship.x;
        game.ship.y = engineStateAfterPhysics.ship.y;
        game.ship.vx = engineStateAfterPhysics.ship.vx;
        game.ship.vy = engineStateAfterPhysics.ship.vy;
        game.ship.angle = engineStateAfterPhysics.ship.angle;
      }

      // Sync ship state and trails TO engine for trails/wrapping
      if (engineRef.current) {
        engineRef.current.setShip(game.ship);
        engineRef.current.setShipTrails(game.shipTrails);
        // Update trails in engine
        engineRef.current.updateShipTrailsOnly();
        // Update boundary wrapping in engine
        engineRef.current.updateBoundaryWrapOnly();
        // Sync updated ship position and trails FROM engine back to game
        const engineState = engineRef.current.getState();
        game.ship.x = engineState.ship.x;
        game.ship.y = engineState.ship.y;
        game.shipTrails = engineState.shipTrails;
      }

      // === TESTING: Delegate planet updates to GameEngine ===
      if (engineRef.current) {
        engineRef.current.setPlanets(game.planets);
        engineRef.current.updatePlanetsOnly(delta);
        const engineState = engineRef.current.getState();
        game.planets = engineState.planets;
      }

      // === TESTING: Delegate debris collisions to GameEngine (Phase 1) ===
      if (engineRef.current) {
        engineRef.current.setPlanets(game.planets);
        engineRef.current.updateDebrisCollisionsOnly();
        const engineState = engineRef.current.getState();
        game.planets = engineState.planets;
      }

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
            
            // Score bonus handled by GameEngine
            
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
              radius: 8 + Math.random() * 6, // Fixed size for 1920x1080
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

      // Debris collision detection - NOW HANDLED BY GameEngine (Phase 1)

      // Advanced obstacle collision interactions
      game.planets.forEach((planet1, index1) => {
        game.planets.forEach((planet2, index2) => {
          if (index1 >= index2) return; // Avoid duplicate checks and self-collision
          
          const dx = planet1.x - planet2.x;
          const dy = planet1.y - planet2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = planet1.radius + planet2.radius;
          
          if (dist < minDist && dist > 0) {
            // Meteor-Blackhole absorption - NOW HANDLED BY GameEngine (Phase 4)
            
            // Planet2-Debris interactions - NOW HANDLED BY GameEngine (Phase 2)
            
            // Blackhole-Debris interactions - NOW HANDLED BY GameEngine (Phases 3-4)
            
            // Explosion Mechanics - NOW HANDLED BY GameEngine (Phase 5)
            // - Meteor-Meteor collisions
            // - Planet2-Planet2 collisions
            // - Debris-Debris collisions
            // - Meteor-Planet2 collisions
            
            // Blackhole-Blackhole collisions - NOW HANDLED BY GameEngine (Phase 6)
            
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
            
            // Apply knockback force in bullet direction (INCREASED for more satisfying shooting)
            // Knockback is proportional to damage and inversely proportional to mass
            const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            if (bulletSpeed > 0) {
              const bulletDirX = bullet.vx / bulletSpeed;
              const bulletDirY = bullet.vy / bulletSpeed;
              const knockbackStrength = (damage * 0.75) / Math.sqrt(planet.mass); // Increased from 0.5 to 0.75
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
                // Score handled by GameEngine
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
              
              // Track near misses for achievement
              setTotalNearMisses(prev => {
                const newTotal = prev + 1;
                localStorage.setItem("totalNearMisses", newTotal.toString());
                return newTotal;
              });
              
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
              
              // Score handled by GameEngine near miss detection
              
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
          const acquisitionRadius = 40; // Fixed size for 1920x1080
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
          const acquisitionRadius = 40; // Fixed size for 1920x1080
          if (dist < acquisitionRadius) {
            wrench.collected = true;
            playSound('healthWrench');
            
            // Track repairs collected for achievement
            setTotalRepairs(prev => {
              const newTotal = prev + 1;
              localStorage.setItem("totalRepairs", newTotal.toString());
              return newTotal;
            });
            
            // Award points silently (notification shows via pickup system)
            setScore(prev => prev + 150);
            
            // Show pickup notification
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
            
            // Award points silently (notification shows via pickup system)
            setScore(prev => prev + 500);
            
            // Show pickup notification
            showPickupNotification(
              "Unlimited Ammo! +500 pts",
              'bg-gradient-to-r from-gray-300 to-slate-400 text-slate-900 font-bold shadow-lg'
            );
          }
        }
      });

      game.ammoPowerUps = game.ammoPowerUps.filter(p => !p.collected);

      // Void Wipe collection
      game.voidWipes.forEach(voidWipe => {
        if (!voidWipe.collected) {
          const dx = voidWipe.x - game.ship.x;
          const dy = voidWipe.y - game.ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < game.ship.radius + voidWipe.radius) {
            voidWipe.collected = true;
            playSound('voidWipe').catch(() => {}); // Play void wipe sound
            
            // Create massive purple particle explosion
            createParticles(voidWipe.x, voidWipe.y, "hsl(270, 100%, 70%)", 100);
            createParticles(game.ship.x, game.ship.y, "hsl(270, 100%, 50%)", 50);
            
            // Award points silently (notification shows via pickup system)
            setScore(prev => prev + 1000);
            
            // Show pickup notification
            showPickupNotification(
              "💜 VOID WIPE! +1000 pts",
              'bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold shadow-2xl'
            );
            
            // Destroy ALL obstacles with explosions
            game.planets.forEach(planet => {
              createParticles(planet.x, planet.y, planet.color, 30);
              // Create explosion effect for each destroyed obstacle
              createParticles(planet.x, planet.y, "hsl(270, 100%, 60%)", 20);
            });
            
            // Clear all obstacles
            game.planets = [];
            
            // Screen shake effect for dramatic impact
            game.shake = 15;
            
            // Set respite period - prevent new obstacles from spawning for 3 seconds
            game.lastVoidWipeCollected = now;
          }
        }
      });

      game.voidWipes = game.voidWipes.filter(v => !v.collected);

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
                
                // Score handled by GameEngine
                playSound('starAcquire');
                break;
                
              case "planet2":
                // Planet2 absorbs stars and grows slightly
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 6);
                createParticles(planet.x, planet.y, "hsl(180, 100%, 50%)", 4);
                planet.radius += 0.5; // Slight growth
                star.collected = true;
                
                // Score handled by GameEngine
                playSound('starAcquire');
                break;
                
              case "blackhole":
                // Blackholes absorb stars dramatically
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 12);
                createParticles(planet.x, planet.y, "hsl(270, 100%, 50%)", 8);
                star.collected = true;
                
                // Score handled by GameEngine
                playSound('starAcquire');
                break;
                
              case "debris":
                // Debris and stars create a small sparkle effect
                createParticles(star.x, star.y, "hsl(60, 100%, 50%)", 4);
                createParticles(planet.x, planet.y, "hsl(30, 100%, 60%)", 3);
                star.collected = true;
                
                // Score handled by GameEngine
                playSound('starAcquire');
                break;
            }
          }
        });
      });

      // === TESTING: Delegate particle updates to GameEngine ===
      // Sync current particles TO engine (from createParticles calls in GameCanvas)
      if (engineRef.current) {
        engineRef.current.setParticles(game.particles);
        // Update particles in engine
        engineRef.current.updateParticlesOnly();
        // Sync updated particles FROM engine back to game
        game.particles = engineRef.current.getState().particles;
      }

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
      
      // Check if we're in the respite period after void wipe collection
      const RESPITE_DURATION = 3000; // 3 seconds of calm after void wipe
      const inRespitePeriod = game.lastVoidWipeCollected > 0 && (now - game.lastVoidWipeCollected < RESPITE_DURATION);
      
      // Only spawn obstacles if not in respite period
      if (!inRespitePeriod) {
        if (now - game.lastPlanetSpawn > intervals.planetInterval) {
          spawnPlanet();
          game.lastPlanetSpawn = now;
        }
      }
      
      // Stars continue to spawn even during respite (for player to collect)
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
        const ammoPowerUp = createAmmoPowerUp(canvas.width, canvas.height, 1.0, game.ship.x, game.ship.y);
        game.ammoPowerUps.push(ammoPowerUp);
        game.lastAmmoPowerUpSpawn = now;
      }

      // Void Wipe spawning (rare, starts shortly after reaching ship level 2)
      const canSpawnVoidWipe = score >= 2000; // Requires some progress into ship level 2
      if (canSpawnVoidWipe && gameRunTime > 30000 && now - game.lastVoidWipeSpawn > 60000) { // 60 second minimum interval
        // Low spawn chance for rarity (same as health wrenches)
        if (Math.random() < 0.04) { // 4% chance per check
          spawnVoidWipe();
          game.lastVoidWipeSpawn = now;
        }
      }

      // === Phases 3-8: Particles, bullets, planets, stars, pickups, and ship now handled by Renderer ===
      // (All rendering above this point is handled by renderer.render() call)

      // Ship upgrade checks (must run every frame for hasWeapon to update correctly)
      const isUpgradedToShip2 = score >= 1500;
      const isUpgradedToShip3 = score >= 12500;
      
      if (isUpgradedToShip2 && !hasUpgraded) {
        setHasUpgraded(true);
        setHealth(3.0);
        setAmmo(100);
        setIsRecharging(false);
        playSound('shipUpgrades');
        triggerCaptainLevelUpDialog('level2');
      }
      
      if (isUpgradedToShip3 && !hasUpgradedToShip3) {
        setHasUpgradedToShip3(true);
        setHealth(3.0);
        setAmmo(200);
        setIsRecharging(false);
        playSound('shipUpgrades');
        triggerCaptainLevelUpDialog('level3');
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
    setAudioGameState(GameState.PLAYING); // Update audio volume for gameplay
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
    
    // Clear any existing dialogs first to prevent overlay
    setShowGameOverDialog(false);
    setShowLevelUpDialog(false);
    
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
    game.voidWipes = [];
    game.bullets = [];
    game.particles = [];
    game.difficulty = 1;
    game.invulnerable = 180;
    game.nearMissTracker.clear(); // Clear near-miss tracking for new game
    game.planetIdCounter = 0; // Reset planet ID counter
    game.lastVoidWipeCollected = 0; // Reset respite period
    
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
      <div className="flex flex-col items-center w-full h-full p-0 justify-start">
        {/* Game Canvas with HUD */}
        <div className="relative">
          {/* Game HUD - Extracted Component */}
          {gameState === "playing" && (
            <GameHUD
              score={score}
              highScore={highScore}
              health={health}
              shield={shield}
              ammo={ammo}
              maxAmmo={maxAmmo}
              hasWeapon={hasWeapon}
              isUnlimitedAmmo={isUnlimitedAmmo}
              isRecharging={isRecharging}
              currentDifficulty={currentDifficulty}
              showHelp={showHelp}
              showJoystick={showJoystick}
              isMobile={isMobile}
              isMuted={isMuted}
              onPause={() => {
                setGameState("paused");
                setAudioGameState(GameState.PAUSED); // Update audio volume for pause menu
              }}
              onToggleHelp={() => setShowHelp(!showHelp)}
              onToggleJoystick={handleToggleJoystick}
              onToggleMute={toggleMute}
              onDifficultyChange={handleDifficultyChange}
              playMenuOpen={playMenuOpen}
            />
          )}
          
          {/* Canvas Container */}
          <div className="border-2 border-primary/30 rounded-lg overflow-hidden shadow-2xl">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>
      </div>

      {gameState === "menu" && (
        <MainMenu
          onStartGame={startGame}
          highScore={highScore}
          currentDifficulty={currentDifficulty}
          onDifficultyChange={handleDifficultyChange}
          isMobile={isMobile}
          nearMissCount={totalNearMisses}
          repairsCollected={totalRepairs}
          shotsFired={totalShotsFired}
        />
      )}

      {gameState === "paused" && (
        <PauseMenu
          onResume={handleResume}
          onMainMenu={handleMainMenu}
          showJoystick={showJoystick}
          onToggleJoystick={() => setShowJoystick(!showJoystick)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          currentDifficulty={currentDifficulty}
          onDifficultyChange={handleDifficultyChange}
          highScore={highScore}
          isMobile={isMobile}
          nearMissCount={totalNearMisses}
          repairsCollected={totalRepairs}
          shotsFired={totalShotsFired}
        />
      )}

      {gameState === "gameover" && (
        <GameOverMenu
          score={score}
          highScore={highScore}
          previousHighScore={previousHighScore}
          onPlayAgain={startGame}
          onMainMenu={handleMainMenu}
          showJoystick={showJoystick}
          onToggleJoystick={() => setShowJoystick(!showJoystick)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          currentDifficulty={currentDifficulty}
          onDifficultyChange={handleDifficultyChange}
          isMobile={isMobile}
          nearMissCount={totalNearMisses}
          repairsCollected={totalRepairs}
          shotsFired={totalShotsFired}
        />
      )}
      
      {/* Virtual Joystick - Visible on mobile or when toggled on desktop */}
      <VirtualJoystick
        onMove={handleJoystickInput}
        isVisible={gameState === "playing" && (isMobile || showJoystick)}
      />
      
      {/* Floating Help Button - Desktop only, bottom right */}
      {gameState === "playing" && !isMobile && (
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="help-button fixed bottom-1 right-1 w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/30 text-primary hover:bg-primary/30 transition-colors flex items-center justify-center text-2xl font-bold z-[70] shadow-lg"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          ?
        </button>
      )}
      
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
