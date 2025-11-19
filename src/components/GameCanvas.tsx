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
    // Calculate achievements unlocked (for display purposes - backend will also check)
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
    // IMPORTANT: Send metadata so backend can check stat-based achievements
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'game:stats',
        highScore: score,
        achievementsUnlocked,
        achievementsTotal,
        metadata: {
          nearMisses: nearMisses,
          repairs: repairs,
          shotsFired: shotsFired
        }
      }, '*');
    }
  }, []);
  const [health, setHealth] = useState(3.0); // Changed from lives to health for fractional damage support
  const [shield, setShield] = useState(0.0); // Overshield that absorbs damage first (max 3.0)
  const healthGlowEndTimeRef = useRef(0); // Immediate ref for glow timing (no render delay)
  const [hasUpgraded, setHasUpgraded] = useState(false); // Track if ship has been upgraded to ship2
  const [hasUpgradedToShip3, setHasUpgradedToShip3] = useState(false); // Track if ship has been upgraded to ship3
  const hasUpgradedRef = useRef(false); // Ref to prevent duplicate upgrade triggers (race condition fix)
  const hasUpgradedToShip3Ref = useRef(false); // Ref to prevent duplicate upgrade triggers (race condition fix)
  const [showHelp, setShowHelp] = useState(false); // State for help popup
  const [helpFilter, setHelpFilter] = useState<string | null>(null); // Filter help to show only specific line
  
  // Shooting system state
  const [ammo, setAmmo] = useState(100);
  const ammoRef = useRef(100); // Ref for immediate ammo tracking (prevents stale state in engine)
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
    
    // If in iframe, send message to parent to reload the game
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'game:reset',
      }, '*');
    }
    
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
  
  // === REFACTORED: getStarValue and awardPoints now in GameEngine ===
  // All scoring logic including combo tracking is handled by the engine

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
    // When embedded in iframe, reduce size significantly to ensure bottom notifications are visible
    const isInIframe = window.self !== window.top;
    const UI_BOTTOM_SPACE = isMobile && !isInIframe ? 300 : 0; // Only reserve space when standalone mobile
    
    const availableWidth = isInIframe ? window.innerWidth * 0.96 : window.innerWidth;
    const availableHeight = isInIframe 
      ? window.innerHeight * 0.88  // Reduce by 12% to ensure bottom notification area is visible
      : (isMobile ? window.innerHeight * 0.98 : window.innerHeight) - UI_BOTTOM_SPACE;
    
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
            ammoRef.current = newAmmo; // Update ref immediately for next frame
            setAmmo(newAmmo); // Update state for UI
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
          onPlaySound: (soundName: string, volumeMultiplier?: number) => {
            // Play the sound requested by the game engine with optional volume multiplier
            playSound(soundName, volumeMultiplier).catch(console.error);
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
          onTakeDamage: (damageAmount: number) => {
            // Trigger the takeDamage function with the damage amount
            takeDamage(damageAmount);
          },
          onTrackNearMiss: () => {
            // Track near misses for achievement
            setTotalNearMisses(prev => {
              const newTotal = prev + 1;
              localStorage.setItem("totalNearMisses", newTotal.toString());
              return newTotal;
            });
          },
          onHealthWrenchCollected: (x: number, y: number) => {
            // Health wrench collection - handles complex health/shield restoration
            playSound('healthWrench');
            
            // Track repairs for achievement
            setTotalRepairs(prev => {
              const newTotal = prev + 1;
              localStorage.setItem("totalRepairs", newTotal.toString());
              return newTotal;
            });
            
            // Award points
            setScore(prev => prev + 150);
            
            // Show pickup notification
            showPickupNotification(
              "🔧 Repairs +150 pts",
              'bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-bold shadow-lg'
            );
            
            // Trigger health glow
            healthGlowEndTimeRef.current = Date.now() + 1000;
            
            // Health restoration with overflow to shield
            // Note: Particles are created by the engine, not here
            const healAmount = 0.75; // 25% health
            setHealth(prevHealth => {
              if (prevHealth >= 3.0) {
                // Health full, add to shield
                setShield(prev => Math.min(3.0, prev + healAmount));
                return prevHealth;
              } else {
                // Add to health first
                const healthToAdd = Math.min(healAmount, 3.0 - prevHealth);
                const overflow = healAmount - healthToAdd;
                
                if (overflow > 0) {
                  setShield(prev => Math.min(3.0, prev + overflow));
                }
                
                return prevHealth + healthToAdd;
              }
            });
          },
          onAmmoPowerUpCollected: () => {
            // Ammo power-up collection
            setIsUnlimitedAmmo(true);
            setUnlimitedAmmoEndTime(Date.now() + UNLIMITED_AMMO_DURATION);
            ammoRef.current = 100; // Update ref immediately
            setAmmo(100);
            setIsRecharging(false);
            playSound('unlimitedAmmo').catch(() => {});
            
            setScore(prev => prev + 500);
            showPickupNotification(
              "∞ Unlimited Ammo! +500 pts",
              'bg-gradient-to-r from-gray-300 to-slate-400 text-slate-900 font-bold shadow-lg'
            );
          },
          onVoidWipeCollected: (x: number, y: number) => {
            // Void Wipe power-up collection - clears all obstacles
            playSound('voidWipe').catch(() => {});
            setScore(prev => prev + 1000);
            showPickupNotification(
              "💜 VOID WIPE! +1000 pts",
              'bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold shadow-2xl'
            );
            
            // Particles handled by caller
          },
          onShotFired: () => {
            // Track shots fired for achievement
            setTotalShotsFired(prev => {
              const newTotal = prev + 1;
              localStorage.setItem("totalShotsFired", newTotal.toString());
              return newTotal;
            });
            
            // Update last shot time to prevent passive regen from triggering too soon
            lastShotTimeRef.current = Date.now();
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
      // When embedded in iframe, reduce size significantly to ensure bottom notifications are visible
      const isInIframe = window.self !== window.top;
      const UI_BOTTOM_SPACE = isMobile && !isInIframe ? 300 : 0; // Only add UI space when standalone mobile
      
      const availableWidth = isInIframe ? window.innerWidth * 0.96 : window.innerWidth;
      const availableHeight = isInIframe 
        ? window.innerHeight * 0.88  // Reduce by 12% to ensure bottom notification area is visible
        : (isMobile ? window.innerHeight * 0.98 : window.innerHeight) - UI_BOTTOM_SPACE;
      
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

    // === REFACTORED: Spawn functions now delegated to GameEngine ===
    // GameEngine will handle the actual spawning logic
    // These wrapper functions maintain compatibility with existing spawn timing code

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

      // === STEP 1: PROCESS INPUT ===
      // Sync keyboard input to engine
      if (engineRef.current) {
        engineRef.current.updateInput({ keys: game.keys });
      }
      
      // Process all input (keyboard + joystick) and apply ship thrust
      const isAccelerating = engineRef.current 
        ? engineRef.current.processInput(joystickInputRef.current, isMobile)
        : false;
      
      // Sync ship velocity from engine after input processing
      if (engineRef.current) {
        const engineState = engineRef.current.getState();
        game.ship.vx = engineState.ship.vx;
        game.ship.vy = engineState.ship.vy;
      }

      // Update ship engine audio based on acceleration
      AudioManager.getInstance().setShipEngineState(isAccelerating ? 'thrust' : 'idle');

      // Manual shooting mechanics (Space key)
      // === REFACTORED: Weapon firing now handled by GameEngine ===
      // Process all shooting logic (manual + auto-targeting) in engine
      if (engineRef.current) {
        engineRef.current.processWeaponFiring(
          hasWeapon,
          hasUpgradedToShip3,
          isRecharging,
          isUnlimitedAmmo,
          ammoRef.current, // Use ref for immediate value (prevents stale state)
          rechargeStartTimeRef
        );
        
        // Sync bullets from engine after shooting
        const engineState = engineRef.current.getState();
        game.bullets = engineState.bullets;
      }

      // Handle ammo recharge (full recharge after hitting 0)
      if (isRecharging) {
        const rechNow = Date.now();
        const rechargeProgress = (rechNow - rechargeStartTimeRef.current) / RECHARGE_TIME;
        if (rechargeProgress >= 1) {
          ammoRef.current = maxAmmo;
          setAmmo(maxAmmo); // Recharge to full (100 or 200)
          setIsRecharging(false);
          playSound('chargeReady').catch(() => {}); // Ammo ready sound
        } else {
          const newAmmo = rechargeProgress * maxAmmo;
          ammoRef.current = newAmmo;
          setAmmo(newAmmo);
        }
      }
      // Passive ammo regeneration (when not empty and not unlimited)
      // Only starts after 2 seconds of not shooting
      else if (!isUnlimitedAmmo && ammo < maxAmmo && ammo > 0) {
        const timeSinceLastShot = Date.now() - lastShotTimeRef.current;
        const PASSIVE_REGEN_COOLDOWN = 2000; // 2 second cooldown before passive regen starts
        
        if (timeSinceLastShot >= PASSIVE_REGEN_COOLDOWN) {
          // Regenerate 0.25 ammo per frame (~15 per second at 60 FPS)
          const newAmmo = Math.min(maxAmmo, ammoRef.current + 0.25);
          ammoRef.current = newAmmo;
          setAmmo(newAmmo);
        }
      }

      // Handle unlimited ammo expiration
      if (isUnlimitedAmmo) {
        const unlimNow = Date.now();
        if (unlimNow > unlimitedAmmoEndTime) {
          setIsUnlimitedAmmo(false);
        }
      }

      // === STEP 2: RUN GAME ENGINE (ALL LOGIC) ===
      if (engineRef.current) {
        // Update engine with current score/difficulty for spawning calculations
        const currentDifficulty = 1 + score * 0.001;
        engineRef.current.setScoreAndDifficulty(score, currentDifficulty);
        
        // Run ALL game logic in engine (physics, collisions, spawning, etc.)
        engineRef.current.update(delta);
        
        // Sync ALL game state from engine back to GameCanvas
        const engineState = engineRef.current.getState();
        game.ship = engineState.ship;
        game.planets = engineState.planets;
        game.stars = engineState.stars;
        game.scraps = engineState.scraps;
        game.bullets = engineState.bullets;
        game.healthWrenches = engineState.healthWrenches;
        game.ammoPowerUps = engineState.ammoPowerUps;
        game.shipTrails = engineState.shipTrails;
        game.particles = engineState.particles;
        game.invulnerable = engineState.invulnerable;
        game.shake = engineState.shake;
        game.nearMissTracker = engineState.nearMissTracker;
        game.comboCount = engineState.comboCount;
        game.lastComboTime = engineState.lastComboTime;
        game.lastPlanetSpawn = engineState.lastPlanetSpawn;
        game.lastStarSpawn = engineState.lastStarSpawn;
        game.difficulty = currentDifficulty;
      }

      // === STEP 3: RENDER (using updated state from engine) ===
      // Apply screen shake if active (engine handles decay)
      if (game.shake > 0) {
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * game.shake,
          (Math.random() - 0.5) * game.shake
        );
      }
      
      // Render all game objects
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
      
      // Restore context if shake was applied
      if (game.shake > 0) {
        ctx.restore();
      }

      // === STEP 4: UI-SPECIFIC UPDATES (React state, not game logic) ===
      // NOTE: Collectible detection (health wrench, ammo, void wipe) is now handled by GameEngine
      // via callbacks - no duplicate distance checking here!

      // Star-Obstacle interactions
      // Star-Planet collisions - NOW FULLY HANDLED BY GameEngine with rate limiting
      // (removed duplicate detection from GameCanvas to prevent double sounds)

      // Check for difficulty advancement (UI notifications only)
      const difficultyManager = difficultyManagerRef.current;
      
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
      
      // === NOTE: All spawning (planets, stars, health, ammo, void wipes) is now handled by GameEngine.updateSpawning() ===
      // The engine automatically spawns entities based on difficulty and timing

      // Ship upgrade checks (must run every frame for hasWeapon to update correctly)
      const isUpgradedToShip2 = score >= 1500;
      const isUpgradedToShip3 = score >= 12500;
      
      // Use refs to prevent duplicate triggers due to async state updates (fixes audio race condition)
      if (isUpgradedToShip2 && !hasUpgradedRef.current) {
        hasUpgradedRef.current = true; // Set ref IMMEDIATELY to prevent duplicate triggers
        setHasUpgraded(true);
        setHealth(3.0);
        ammoRef.current = 100; // Reset ref for weapon unlock
        setAmmo(100);
        setIsRecharging(false);
        playSound('shipUpgrades');
        triggerCaptainLevelUpDialog('level2');
        
        // Show help popup with only shooting instruction after captain dialog dismisses
        setTimeout(() => {
          setHelpFilter('shoot'); // Filter to show only shooting line
          setShowHelp(true);
          
          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setShowHelp(false);
            setHelpFilter(null); // Clear filter
          }, 5000);
        }, 3500); // Wait for captain dialog (3s) + small delay
      }
      
      if (isUpgradedToShip3 && !hasUpgradedToShip3Ref.current) {
        hasUpgradedToShip3Ref.current = true; // Set ref IMMEDIATELY to prevent duplicate triggers
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
    hasUpgradedRef.current = false; // Reset upgrade ref for new game
    hasUpgradedToShip3Ref.current = false; // Reset upgrade ref for new game
    
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
    ammoRef.current = maxAmmo; // Reset ref for immediate tracking
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
              helpFilter={helpFilter}
              showJoystick={showJoystick}
              isMobile={isMobile}
              isMuted={isMuted}
              onPause={() => {
                setGameState("paused");
                setAudioGameState(GameState.PAUSED); // Update audio volume for pause menu
              }}
              onToggleHelp={() => {
                setHelpFilter(null); // Clear filter when manually toggled
                setShowHelp(!showHelp);
              }}
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
          onClick={() => {
            setHelpFilter(null); // Clear any filter when manually opened
            setShowHelp(!showHelp);
          }}
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
