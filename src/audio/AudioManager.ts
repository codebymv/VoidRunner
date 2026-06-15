import themeMusic from '../assets/theme.mp3';
import theme2Music from '../assets/theme2.mp3';
import theme3Music from '../assets/theme3.mp3';
import theme4Music from '../assets/theme4.mp3';
import gameOverSound from '../assets/game_over.mp3';
import healthWrenchSound from '../assets/health_wrench.mp3';
import shieldActivateSound from '../assets/shield_activate.mp3';
import shipUpgradesSound from '../assets/ship_upgrades.mp3';
import starAcquireSound from '../assets/star_aquire.mp3';
import starAcquire2Sound from '../assets/star_aquire2.mp3';
import shipHitSound from '../assets/ship_hit.mp3';
import menuOpenSound from '../assets/menu_open.mp3';
import menuCloseSound from '../assets/menu_close.mp3';
import vulnerableBlinkSound from '../assets/vulnerable_blink.mp3';
import speech1Sound from '../assets/speech1.mp3';
import speech2Sound from '../assets/speech2.mp3';
import shoot1Sound from '../assets/shoot1.mp3';
import shoot2Sound from '../assets/shoot2.mp3';
import chargeEmptySound from '../assets/charge_empty.mp3';
import chargeReadySound from '../assets/charge_ready.mp3';
import unlimitedAmmoSound from '../assets/unlimited_ammo.mp3';
import voidWipeSound from '../assets/void_wipe.mp3';
import explosionSound from '../assets/explosion.mp3';
import blackholeAbsorbSound from '../assets/blackhole-absorb.mp3';
import meteorCollisionSound from '../assets/meteor_collision.mp3';
import debrisBounceSound from '../assets/debris_bounce.mp3';
import shipIdleLoopSound from '../assets/ship_idle_loop.mp3';
import shipThrustLoopSound from '../assets/ship_thrust_loop.mp3';

// Import audio configuration modules
import { 
  GameState,
  MUSIC_LEVELS, 
  SOUND_EFFECT_LEVELS,
  VOICE_LEVELS,
  AMBIENT_LEVELS,
  getSoundEffectVolume,
  getMusicVolumeForState
} from './audioLevels';
import { 
  createAudioEffectsChain, 
  connectEffectsChain,
  type AudioEffectsChain,
  getSoundVariationConfig,
  getRandomPitchVariation,
  getRandomVolumeVariation,
  calculateSpatialPan,
  SoundInstanceTracker
} from './audioEffects';

// Re-export GameState for backward compatibility
export { GameState };

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLowpassFilter: BiquadFilterNode | null = null; // Low-pass filter for master output
  private audioEffects: AudioEffectsChain | null = null; // Master effects chain (compressor, limiter, makeup gain)
  private musicGain: GainNode | null = null;
  private soundEffectsGain: GainNode | null = null; // New sound effects bus
  private speechGain: GainNode | null = null; // Dedicated speech channel for maximum volume
  private isAudioInitialized: boolean = false; // Track if audio has been initialized
  
  // Theme music playlist system
  private musicPlaylist: HTMLAudioElement[] = [];
  private playlistSources: MediaElementAudioSourceNode[] = [];
  private playlistGainNodes: GainNode[] = [];
  private currentTrackIndex: number = 0;
  private nextTrackIndex: number = 1;
  private isThemePlaying: boolean = false;
  private isCrossfading: boolean = false;
  private currentGameState: GameState = GameState.MENU;
  
  // Sound effects
  private soundEffects: Map<string, HTMLAudioElement> = new Map();
  private soundEffectSources: Map<string, MediaElementAudioSourceNode> = new Map(); // Web Audio API sources
  private speechSources: Map<string, MediaElementAudioSourceNode> = new Map(); // Dedicated speech sources
  private shieldSoundPool: { audio: HTMLAudioElement, source: MediaElementAudioSourceNode, gain: GainNode }[] = []; // Pool of shield sounds for overlapping playback
  private shieldPoolIndex: number = 0; // Current index in the shield sound pool
  private starAcquireCounter: number = 0; // Counter for alternating star acquire sounds
  private shoot1Pool: { audio: HTMLAudioElement, source: MediaElementAudioSourceNode, gain: GainNode }[] = [];
  private shoot1PoolIndex: number = 0;
  private shoot2Pool: { audio: HTMLAudioElement, source: MediaElementAudioSourceNode, gain: GainNode }[] = [];
  private shoot2PoolIndex: number = 0;
  
  // Ship engine loops (crossfading idle/thrust states)
  private shipIdleLoop: HTMLAudioElement | null = null;
  private shipThrustLoop: HTMLAudioElement | null = null;
  private shipIdleGain: GainNode | null = null;
  private shipThrustGain: GainNode | null = null;
  private currentShipState: 'idle' | 'thrust' = 'idle';
  private readonly SHIP_ENGINE_FADE_TIME = 1.5; // 1.5s crossfade transition (very gentle fade)
  private readonly IDLE_FADEOUT_DELAY = 2.5; // Idle hum fades out after 2.5 seconds
  private idleStartTime: number = 0; // Track when ship became idle
  private idleFadeoutScheduled: boolean = false; // Track if fadeout is scheduled
  
  // Mute state
  private isMuted: boolean = false;
  private volumeBeforeMute: number = 1; // Store volume level before muting
  private themeVolumeBeforeMute: number = 0; // Store theme volume before muting
  
  // Sound variation system (prevents late-game audio spam)
  private soundInstanceTracker: SoundInstanceTracker = new SoundInstanceTracker();
  private screenWidth: number = 1920; // Default screen width for spatial panning (updated by setScreenDimensions)
  private playbackBlockWarnings: Set<string> = new Set();
  private hasPlaybackUnlocked: boolean = false;
  private hasLoggedLockedPlaybackSkip: boolean = false;
  
  private constructor() {
    // Don't initialize audio immediately - wait for user gesture
  }
  
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
  
  private async initializeAudio(): Promise<void> {
    try {
      // Initialize Web Audio API context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.soundEffectsGain = this.audioContext.createGain(); // Create sound effects bus
      this.speechGain = this.audioContext.createGain(); // Create dedicated speech channel
      this.shipIdleGain = this.audioContext.createGain(); // Ship idle engine loop
      this.shipThrustGain = this.audioContext.createGain(); // Ship thrust engine loop
      
      // Create low-pass filter for master output (cuts high frequencies above 12kHz)
      this.masterLowpassFilter = this.audioContext.createBiquadFilter();
      this.masterLowpassFilter.type = 'lowpass';
      this.masterLowpassFilter.frequency.value = 12000; // 12kHz cutoff
      this.masterLowpassFilter.Q.value = 0.7071; // Butterworth response (flat passband)
      
      // Create audio effects chain (compressor, limiter, makeup gain)
      this.audioEffects = createAudioEffectsChain(this.audioContext);
      
      // Master signal chain:
      // Buses → Master Gain → Low-pass Filter → Compressor → Makeup Gain → Limiter → Output
      // This order ensures: mixing → tonal shaping → dynamics → level matching → safety limiting
      this.musicGain.connect(this.masterGain);
      this.soundEffectsGain.connect(this.masterGain);
      this.speechGain.connect(this.masterGain);
      this.shipIdleGain.connect(this.masterGain);
      this.shipThrustGain.connect(this.masterGain);
      this.masterGain.connect(this.masterLowpassFilter);
      this.masterLowpassFilter.connect(this.audioEffects.compressor);
      connectEffectsChain(this.audioEffects, this.audioContext.destination);
      
      // Initialize music playlist system with crossfading
      // To add more songs, import them at the top and add to this array:
      const playlist = [themeMusic, theme2Music, theme3Music, theme4Music];
      
      for (let i = 0; i < playlist.length; i++) {
        const audio = new Audio(playlist[i]);
        audio.preload = 'auto';
        audio.volume = 1.0; // Set to full, control via gain node
        
        // Create gain node for this track
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0; // Start silent
        
        // Create source and connect to gain
        const source = this.audioContext.createMediaElementSource(audio);
        source.connect(gainNode);
        gainNode.connect(this.musicGain);
        
        // Store references
        this.musicPlaylist.push(audio);
        this.playlistGainNodes.push(gainNode);
        this.playlistSources.push(source);
        
        // Set up track end handler for crossfading
        audio.addEventListener('ended', () => this.handleTrackEnd(i));
      }
      
      // Pick a random starting track
      this.currentTrackIndex = Math.floor(Math.random() * playlist.length);
      
      // Set initial track gain for the randomly selected starting track
      if (this.playlistGainNodes[this.currentTrackIndex]) {
        this.playlistGainNodes[this.currentTrackIndex].gain.value = MUSIC_LEVELS.MENU;
      }
      
      console.log(`🎲 Random starting track: ${this.currentTrackIndex}`);
      
      // Initialize sound effects
      this.initializeSoundEffects();
      
      this.isAudioInitialized = true;
      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
    }
  }
  
  private initializeSoundEffects(): void {
    if (!this.audioContext || !this.soundEffectsGain || !this.speechGain) {
      console.error('AudioContext, soundEffectsGain, or speechGain not initialized');
      return;
    }

    // Regular sound effects (not speech)
    const soundFiles = {
      gameOver: gameOverSound,
      healthWrench: healthWrenchSound,
      shieldActivate: shieldActivateSound,
      shipUpgrades: shipUpgradesSound,
      starAcquire: starAcquireSound,
      starAcquire2: starAcquire2Sound,
      shipHit: shipHitSound,
        menuOpen: menuOpenSound,
        menuClose: menuCloseSound,
        vulnerableBlink: vulnerableBlinkSound,
        chargeEmpty: chargeEmptySound, // Ammo depleted
        chargeReady: chargeReadySound, // Ammo recharged
        unlimitedAmmo: unlimitedAmmoSound, // Unlimited ammo pickup
        voidWipe: voidWipeSound, // Void wipe power-up (clears all obstacles)
        explosion: explosionSound, // Obstacle destruction
        blackholeAbsorb: blackholeAbsorbSound, // Blackhole absorbing objects
        meteorCollision: meteorCollisionSound, // Meteor collisions
        debrisBounce: debrisBounceSound // Debris bouncing off obstacles
      };

    // Speech sounds - routed through dedicated speech channel
    const speechFiles = {
      speech1: speech1Sound,
      speech2: speech2Sound
    };
    
    // Initialize regular sound effects
    Object.entries(soundFiles).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 1.0; // Set to full volume, we'll control via gain node
      this.soundEffects.set(key, audio);
      
      // Create Web Audio API source and connect to sound effects bus
      const source = this.audioContext!.createMediaElementSource(audio);
      source.connect(this.soundEffectsGain!);
      this.soundEffectSources.set(key, source);
    });

    // Initialize speech sounds with dedicated channel
    Object.entries(speechFiles).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 1.0; // Set to full volume, we'll control via gain node
      this.soundEffects.set(key, audio);
      
      // Create Web Audio API source and connect to SPEECH bus (loudest)
      const source = this.audioContext!.createMediaElementSource(audio);
      source.connect(this.speechGain!);
      this.speechSources.set(key, source);
    });

    // Create a pool of shield sound instances for overlapping playback
    const SHIELD_POOL_SIZE = 5;
    const shieldVolume = getSoundEffectVolume('shieldActivate');
    for (let i = 0; i < SHIELD_POOL_SIZE; i++) {
      const shieldAudio = new Audio(shieldActivateSound);
      shieldAudio.preload = 'auto';
      
      // Connect to sound effects bus with GainNode for proper volume control
      const shieldSource = this.audioContext!.createMediaElementSource(shieldAudio);
      const shieldGain = this.audioContext!.createGain();
      shieldGain.gain.value = shieldVolume;
      shieldSource.connect(shieldGain);
      shieldGain.connect(this.soundEffectsGain!);
      
      this.shieldSoundPool.push({ audio: shieldAudio, source: shieldSource, gain: shieldGain });
    }
    
    // Create pools for shooting sounds (for rapid, overlapping playback)
    const SHOOT_POOL_SIZE = 10; // A pool of 10 sounds for 10 shots/sec
    const shoot1Volume = getSoundEffectVolume('shoot1'); // Gets 1.5
    const shoot2Volume = getSoundEffectVolume('shoot2'); // Gets 1.5

    for (let i = 0; i < SHOOT_POOL_SIZE; i++) {
      // --- Shoot 1 Pool (Blue) ---
      const audio1 = new Audio(shoot1Sound);
      audio1.preload = 'auto';
      const source1 = this.audioContext!.createMediaElementSource(audio1);
      const gain1 = this.audioContext!.createGain();
      gain1.gain.value = shoot1Volume; // Set the 1.5 volume
      source1.connect(gain1);
      gain1.connect(this.soundEffectsGain!); // Connect to main SFX bus
      this.shoot1Pool.push({ audio: audio1, source: source1, gain: gain1 });

      // --- Shoot 2 Pool (Purple) ---
      const audio2 = new Audio(shoot2Sound);
      audio2.preload = 'auto';
      const source2 = this.audioContext!.createMediaElementSource(audio2);
      const gain2 = this.audioContext!.createGain();
      gain2.gain.value = shoot2Volume; // Set the 1.5 volume
      source2.connect(gain2);
      gain2.connect(this.soundEffectsGain!); // Connect to main SFX bus
      this.shoot2Pool.push({ audio: audio2, source: source2, gain: gain2 });
    }
    
    // Initialize ship engine loops (idle and thrust)
    this.shipIdleLoop = new Audio(shipIdleLoopSound);
    this.shipIdleLoop.preload = 'auto';
    this.shipIdleLoop.loop = true; // Continuously loop
    this.shipIdleLoop.volume = 1.0;
    
    this.shipThrustLoop = new Audio(shipThrustLoopSound);
    this.shipThrustLoop.preload = 'auto';
    this.shipThrustLoop.loop = true; // Continuously loop
    this.shipThrustLoop.volume = 1.0;
    
    // Connect ship engine loops to their respective gain nodes
    const idleSource = this.audioContext!.createMediaElementSource(this.shipIdleLoop);
    idleSource.connect(this.shipIdleGain!);
    
    const thrustSource = this.audioContext!.createMediaElementSource(this.shipThrustLoop);
    thrustSource.connect(this.shipThrustGain!);
    
    // Start with idle state (idle at full volume, thrust at zero)
    this.shipIdleGain!.gain.value = AMBIENT_LEVELS.SHIP_ENGINE;
    this.shipThrustGain!.gain.value = 0;
    
    // Set initial sound effects volume
    this.setSoundEffectsVolume();
    
    console.log('Sound effects initialized and routed through audio bus');
    console.log('Ship engine loops initialized (idle/thrust crossfading system ready)');
  }
  
  /**
   * Updates screen dimensions for spatial panning calculations
   * Should be called whenever canvas size changes
   */
  public setScreenDimensions(width: number): void {
    this.screenWidth = width;
  }

  private isAutoplayBlocked(error: unknown): boolean {
    return error instanceof DOMException
      ? error.name === 'NotAllowedError'
      : String(error).includes('NotAllowedError');
  }

  private handlePlaybackError(soundName: string, error: unknown, context: string = 'sound'): void {
    if (this.isAutoplayBlocked(error)) {
      const warningKey = `${context}:${soundName}`;
      if (!this.playbackBlockWarnings.has(warningKey)) {
        console.info(`[Audio] Browser blocked ${context} '${soundName}' until playback is unlocked by a user gesture.`);
        this.playbackBlockWarnings.add(warningKey);
      }
      return;
    }

    console.error(`[Audio] Failed to play ${context} '${soundName}':`, error);
  }
  
  /**
   * Plays a sound effect with optional position for spatial panning
   * @param soundName - Name of the sound to play
   * @param volumeMultiplier - Volume multiplier (1.0 = default)
   * @param position - Optional {x, y} position for spatial panning
   */
  public async playSound(
    soundName: string, 
    volumeMultiplier: number = 1.0, 
    position?: { x: number; y: number }
  ): Promise<void> {
    console.log(`🔊 Attempting to play sound: ${soundName} (volume multiplier: ${volumeMultiplier.toFixed(2)})`);
    
    // Initialize audio on first call (after user gesture)
    if (!this.isAudioInitialized) {
      console.log('🎵 Audio not initialized, initializing now...');
      await this.initializeAudio();
    }
    
    // Don't play sounds if audio initialization failed
    if (!this.isAudioInitialized) {
      console.log('❌ Audio initialization failed, sound will be skipped');
      return;
    }
    
    if (!this.hasPlaybackUnlocked) {
      if (!this.hasLoggedLockedPlaybackSkip) {
        console.info('[Audio] Sound effects will start after the first successful browser playback unlock.');
        this.hasLoggedLockedPlaybackSkip = true;
      }
      return;
    }

    // === SOUND VARIATION SYSTEM (Late-Game Audio Spam Prevention) ===
    const variationConfig = getSoundVariationConfig(soundName);
    
    // Check instance limit (prevent too many of the same sound playing at once)
    if (variationConfig.maxInstances !== undefined) {
      if (!this.soundInstanceTracker.canPlay(soundName, variationConfig.maxInstances)) {
        console.log(`🔇 Sound '${soundName}' at max instances (${variationConfig.maxInstances}), skipping`);
        return; // Sound is at limit, don't play
      }
    }
    
    // Special handling for shield sound to use the pool for overlapping playback
    if (soundName === 'shieldActivate') {
      if (this.shieldSoundPool.length === 0) {
        console.warn('Shield sound pool not initialized');
        return;
      }
      
      try {
        const { audio, gain } = this.shieldSoundPool[this.shieldPoolIndex];
        this.shieldPoolIndex = (this.shieldPoolIndex + 1) % this.shieldSoundPool.length;
        
        // Apply volume multiplier to the gain node
        const baseVolume = getSoundEffectVolume('shieldActivate');
        gain.gain.value = baseVolume * volumeMultiplier;
        
        // Reset audio to beginning and play
        audio.currentTime = 0;
        audio.play().catch(error => {
          this.handlePlaybackError('shieldActivate', error, 'shield sound');
        });
      } catch (error) {
        console.error(`Error playing shield sound:`, error);
      }
      return;
    }

    // Special handling for shooting sounds (pooled with gain)
    if (soundName === 'shoot1' || soundName === 'shoot2') {
      const isShoot1 = soundName === 'shoot1';
      const pool = isShoot1 ? this.shoot1Pool : this.shoot2Pool;
      let index = isShoot1 ? this.shoot1PoolIndex : this.shoot2PoolIndex;
      
      if (pool.length === 0) {
        console.warn(`Shooting sound pool for ${soundName} not initialized`);
        return;
      }
      
      try {
        // Get the next audio element and gain node from the pool
        const { audio, gain } = pool[index];
        
        // Apply volume multiplier to the gain node
        const baseVolume = getSoundEffectVolume(soundName);
        gain.gain.value = baseVolume * volumeMultiplier;
        
        // Update the index
        index = (index + 1) % pool.length;
        if (isShoot1) {
          this.shoot1PoolIndex = index;
        } else {
          this.shoot2PoolIndex = index;
        }
        
        // Play the sound
        audio.currentTime = 0;
        audio.play().catch(error => {
          this.handlePlaybackError(soundName, error, 'pooled shot sound');
        });
      } catch (error) {
        console.error(`Error playing ${soundName} sound:`, error);
      }
      return;
    }
    // --- END OF NEW BLOCK ---

    // Special handling for star acquire sound to alternate between two sounds
    if (soundName === 'starAcquire') {
      const actualSoundName = this.starAcquireCounter % 2 === 0 ? 'starAcquire' : 'starAcquire2';
      this.starAcquireCounter++;
      
      const audio = this.soundEffects.get(actualSoundName);
      if (!audio) {
        console.warn(`❌ Star acquire sound '${actualSoundName}' not found`);
        return;
      }
      
      try {
        audio.volume = getSoundEffectVolume('starAcquire') * volumeMultiplier;
        audio.currentTime = 0;
        console.log(`🎵 Playing alternating star acquire sound: ${actualSoundName}`);
        audio.play().catch(error => {
          console.error(`❌ Failed to play star acquire sound '${actualSoundName}':`, error);
        });
      } catch (error) {
        console.error(`❌ Error playing star acquire sound '${actualSoundName}':`, error);
      }
      return;
    }

    // Special handling for speech sounds (different audio bus)
    if (soundName === 'speech1' || soundName === 'speech2') {
      const audio = this.soundEffects.get(soundName);
      const sourceNode = this.speechSources.get(soundName); // Use speechSources

      if (!audio || !sourceNode || !this.audioContext || !this.speechGain) { // Check speechGain
        console.warn(`❌ Speech sound '${soundName}' or its source not found`);
        return;
      }

      console.log(`✅ Found speech '${soundName}', attempting to play...`);

      try {
        // Get the individual file volume (e.g., 0.95)
        const individualVolume = getSoundEffectVolume(soundName);
        
        // Speech sounds are simple: they don't need the complex GainNode.
        audio.volume = individualVolume * volumeMultiplier; 

        // Reset audio to beginning and play
        audio.currentTime = 0;
        console.log(`🎵 Playing speech '${soundName}' at volume ${audio.volume}`);
        audio.play().catch(error => {
          console.error(`❌ Failed to play speech '${soundName}':`, error);
        });
      } catch (error) {
        console.error(`❌ Error playing speech '${soundName}':`, error);
      }
      return; // IMPORTANT: Stop here so it doesn't fall through
    }

// Regular sound effect handling
const audio = this.soundEffects.get(soundName);
const sourceNode = this.soundEffectSources.get(soundName);

if (!audio || !sourceNode || !this.audioContext || !this.soundEffectsGain) {
  console.warn(`❌ Sound effect '${soundName}' or its source not found`);
  console.log('Available sounds:', Array.from(this.soundEffects.keys()));
  return;
}

console.log(`✅ Found sound '${soundName}', attempting to play...`);

try {
  // Get the desired volume (e.g., 1.5 for shooting)
  const individualVolume = getSoundEffectVolume(soundName);

  // === APPLY SOUND VARIATIONS ===
  
  // 1. Volume Variation (±10-20% randomization)
  const volumeVariation = variationConfig.volumeVariation 
    ? getRandomVolumeVariation(variationConfig.volumeVariation)
    : 1.0;
  
  // 2. Pitch Variation (subtle randomization to prevent monotony)
  const pitchVariation = variationConfig.pitchVariation
    ? getRandomPitchVariation(variationConfig.pitchVariation)
    : 1.0;
  audio.playbackRate = pitchVariation;
  
  // 3. Spatial Panning (pan left/right based on screen position)
  let panNode: StereoPannerNode | undefined;
  if (variationConfig.enableSpatialPan && position && this.audioContext) {
    panNode = this.audioContext.createStereoPanner();
    const panValue = calculateSpatialPan(position.x, this.screenWidth);
    panNode.pan.value = Math.max(-1, Math.min(1, panValue)); // Clamp to -1 to 1
  }

  // Create a new, temporary GainNode for this specific sound
  const soundGain = this.audioContext.createGain();
  soundGain.gain.value = individualVolume * volumeMultiplier * volumeVariation;

  // Connect audio graph: sourceNode -> soundGain -> [panNode] -> soundEffectsGain
  try {
    sourceNode.disconnect(this.soundEffectsGain); // Try to disconnect old path (may not be connected)
  } catch {
    // Ignore error if node wasn't connected (happens on first play or rapid replays)
  }
  sourceNode.connect(soundGain);
  
  if (panNode) {
    soundGain.connect(panNode);
    panNode.connect(this.soundEffectsGain);
  } else {
    soundGain.connect(this.soundEffectsGain);
  }

  // Register this sound instance
  this.soundInstanceTracker.registerInstance(soundName);

  // Reset audio to beginning and play
  audio.currentTime = 0;
  console.log(`🎵 Playing sound '${soundName}' at volume ${(individualVolume * volumeVariation).toFixed(2)}, pitch ${pitchVariation.toFixed(3)}x${panNode ? `, pan ${panNode.pan.value.toFixed(2)}` : ''}`);
  audio.play().catch(error => {
    console.error(`❌ Failed to play sound '${soundName}':`, error);
  });

  // IMPORTANT: Re-connect the source to the main bus after it finishes playing
  audio.onended = () => {
    try {
      // Unregister this sound instance
      this.soundInstanceTracker.unregisterInstance(soundName);
      
      // Cleanup nodes
      soundGain.disconnect();
      if (panNode) {
        panNode.disconnect();
      }
      sourceNode.disconnect(soundGain);
      sourceNode.connect(this.soundEffectsGain!);
    } catch {
      // Ignore errors if nodes were already disconnected (rapid replays can cause this)
      // Still try to unregister
      this.soundInstanceTracker.unregisterInstance(soundName);
    }
  };

} catch (error) {
  console.error(`❌ Error playing sound '${soundName}':`, error);
  // Ensure connection is restored even if play fails
  if (sourceNode && this.soundEffectsGain) {
    sourceNode.connect(this.soundEffectsGain);
  }
}
}
  
  private handleTrackEnd(trackIndex: number): void {
    if (!this.isThemePlaying || this.isCrossfading) return;
    
    // Pick a random track that's different from the current one
    this.nextTrackIndex = this.getRandomTrackIndex(trackIndex);
    
    // Start crossfade to next track
    this.crossfadeToTrack(this.nextTrackIndex);
  }
  
  private getRandomTrackIndex(currentIndex: number): number {
    // If only one track, return it
    if (this.musicPlaylist.length <= 1) {
      return 0;
    }
    
    // Pick a random track that's not the current one
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * this.musicPlaylist.length);
    } while (randomIndex === currentIndex);
    
    return randomIndex;
  }
  
  private crossfadeToTrack(toIndex: number): void {
    if (this.isCrossfading || !this.audioContext) return;
    
    this.isCrossfading = true;
    const fromIndex = this.currentTrackIndex;
    const currentTrack = this.musicPlaylist[fromIndex];
    const nextTrack = this.musicPlaylist[toIndex];
    const currentGain = this.playlistGainNodes[fromIndex];
    const nextGain = this.playlistGainNodes[toIndex];
    
    if (!currentTrack || !nextTrack || !currentGain || !nextGain) {
      this.isCrossfading = false;
      return;
    }
    
    // Get current volume level (based on game state)
    const targetVolume = getMusicVolumeForState(this.currentGameState);
    
    const now = this.audioContext.currentTime;
    const fadeTime = MUSIC_LEVELS.CROSSFADE_DURATION;
    
    console.log(`🎵 Crossfading from track ${fromIndex} to random track ${toIndex} over ${fadeTime}s`);
    
    // Start next track at beginning with zero volume
    nextTrack.currentTime = 0;
    nextGain.gain.value = 0;
    nextTrack.play().catch(error => {
      console.error(`Failed to play next track:`, error);
      this.isCrossfading = false;
    });
    
    // Crossfade: fade out current, fade in next
    currentGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime); // Fade out
    nextGain.gain.exponentialRampToValueAtTime(targetVolume, now + fadeTime); // Fade in
    
    // Update current track index after fade completes
    setTimeout(() => {
      currentTrack.pause();
      currentTrack.currentTime = 0;
      currentGain.gain.value = 0;
      this.currentTrackIndex = toIndex;
      this.isCrossfading = false;
      console.log(`✅ Crossfade complete, now playing track ${toIndex}`);
    }, fadeTime * 1000);
  }
  
  public async startThemeMusic(): Promise<void> {
    // Initialize audio on first call (after user gesture)
    if (!this.isAudioInitialized) {
      await this.initializeAudio();
    }
    
    if (this.isThemePlaying) return;
    
    const currentTrack = this.musicPlaylist[this.currentTrackIndex];
    if (!currentTrack) return;
    
    try {
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      await currentTrack.play();
      this.hasPlaybackUnlocked = true;
      this.isThemePlaying = true;
      console.log(`🎵 Playlist started with track ${this.currentTrackIndex}`);
    } catch (error) {
      this.handlePlaybackError('playlist', error, 'theme music');
    }
  }
  
  public stopThemeMusic(): void {
    if (!this.isThemePlaying) return;
    
    // Stop all tracks in playlist
    this.musicPlaylist.forEach((track, index) => {
      track.pause();
      track.currentTime = 0;
      if (this.playlistGainNodes[index]) {
        this.playlistGainNodes[index].gain.value = 0;
      }
    });
    
    this.isThemePlaying = false;
    this.isCrossfading = false;
    
    // Pick a random track for next play
    this.currentTrackIndex = Math.floor(Math.random() * this.musicPlaylist.length);
    if (this.playlistGainNodes[this.currentTrackIndex]) {
      this.playlistGainNodes[this.currentTrackIndex].gain.value = MUSIC_LEVELS.MENU;
    }
    
    console.log(`🎵 Playlist stopped (next start: track ${this.currentTrackIndex})`);
  }
  
  public pauseThemeMusic(): void {
    if (!this.isThemePlaying) return;
    
    const currentTrack = this.musicPlaylist[this.currentTrackIndex];
    if (currentTrack) {
      currentTrack.pause();
    }
    
    this.isThemePlaying = false;
    console.log(`🎵 Track ${this.currentTrackIndex} paused`);
  }
  
  public resumeThemeMusic(): void {
    if (this.isThemePlaying) return;
    
    const currentTrack = this.musicPlaylist[this.currentTrackIndex];
    if (!currentTrack) return;
    
    currentTrack.play().catch(error => {
      console.error('Failed to resume playlist:', error);
    });
    this.isThemePlaying = true;
    console.log(`🎵 Track ${this.currentTrackIndex} resumed`);
  }
  
private setThemeVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (this.isMuted) {
      // If muted, store the volume but don't apply it
      this.themeVolumeBeforeMute = clampedVolume;
      console.log(`🔇 Muted - storing volume ${clampedVolume * 100}% for later`);
    } else {
      // Apply volume to current playing track's gain node
      const currentGain = this.playlistGainNodes[this.currentTrackIndex];
      if (currentGain && this.audioContext) {
        const targetVolume = Math.max(0.001, clampedVolume);
        // Smooth volume transition
        currentGain.gain.exponentialRampToValueAtTime(
          targetVolume,
          this.audioContext.currentTime + 0.1
        );
        console.log(`🎚️ Track ${this.currentTrackIndex} gain ramping to ${targetVolume * 100}%`);
      } else {
        console.warn(`⚠️ Could not set volume - gain node missing for track ${this.currentTrackIndex}`);
      }
      
      // Sync sound effects volume 
      this.setSoundEffectsVolume(); // <-- Correct

      // Set speech volume to maximum
      this.setSpeechVolume(); // <-- Correct
    }
  }
  
    // In AudioManager.ts
    private setSoundEffectsVolume(): void { // Remove the 'volume' parameter
      if (this.soundEffectsGain) {
        // Set sound effects bus to a fixed 80% (or 1.0 for 100%)
        this.soundEffectsGain.gain.value = 0.8; 
      }
    }

private setSpeechVolume(): void { // <-- REMOVE (volume: number)
  if (this.speechGain) {
    // Speech at maximum volume - always loudest element in the mix
    this.speechGain.gain.value = VOICE_LEVELS.SPEECH_BASE;
  }
}
  
  public setGameState(newState: GameState): void {
    const previousState = this.currentGameState;
    this.currentGameState = newState;
    
    // Get appropriate music volume for the new game state
    const targetVolume = getMusicVolumeForState(newState);
    
    console.log(`🎚️ Setting music to ${newState.toUpperCase()} volume: ${targetVolume * 100}%`);
    this.setThemeVolume(targetVolume);
    
    // Start theme music if not already playing
    if (!this.isThemePlaying) {
      this.startThemeMusic();
    }
    
    console.log(`🎮 Game state changed: ${previousState} → ${newState}`);
  }
  
  public getCurrentGameState(): GameState {
    return this.currentGameState;
  }
  
  public isThemeMusicPlaying(): boolean {
    return this.isThemePlaying;
  }
  
  public setMasterVolume(volume: number): void {
    if (this.masterGain) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      if (this.isMuted) {
        // If muted, store the new volume but don't apply it
        this.volumeBeforeMute = clampedVolume;
      } else {
        // If not muted, apply the volume directly
        this.masterGain.gain.value = clampedVolume;
      }
    }
  }
  
  public async playMenuOpen(): Promise<void> {
    console.log('🔊 playMenuOpen() called');
    await this.playSound('menuOpen');
  }
  
  public async playMenuClose(): Promise<void> {
    console.log('🔊 playMenuClose() called');
    await this.playSound('menuClose');
  }
  
  public getMasterVolume(): number {
    if (this.isMuted) {
      // When muted, return the stored volume level, not the actual gain value (which is 0)
      return this.volumeBeforeMute;
    }
    return this.masterGain?.gain.value || 1;
  }
  
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateMuteState();
    return this.isMuted;
  }
  
  public setMute(muted: boolean): void {
    this.isMuted = muted;
    this.updateMuteState();
  }
  
  public isMutedState(): boolean {
    return this.isMuted;
  }
  
  private updateMuteState(): void {
    if (this.isMuted) {
      // Store current volumes before muting
      if (this.masterGain) {
        this.volumeBeforeMute = this.masterGain.gain.value;
        this.masterGain.gain.value = 0;
      }
      
      // Store current track volume before muting
      const currentGain = this.playlistGainNodes[this.currentTrackIndex];
      if (currentGain) {
        this.themeVolumeBeforeMute = currentGain.gain.value;
      }
    } else {
      // Restore previous volumes when unmuting
      if (this.masterGain) {
        this.masterGain.gain.value = this.volumeBeforeMute;
      }
      
      // Restore current track volume
      const currentGain = this.playlistGainNodes[this.currentTrackIndex];
      if (currentGain && this.audioContext) {
        currentGain.gain.exponentialRampToValueAtTime(
          Math.max(0.001, this.themeVolumeBeforeMute),
          this.audioContext.currentTime + 0.1
        );
      }
    }
  }
  
  // Ship engine loop control methods
  /**
   * Start playing the ship engine loops (called when game starts)
   */
  public startShipEngineLoops(): void {
    if (!this.isAudioInitialized) {
      console.log('⚠️ Audio not initialized, cannot start ship engine loops');
      return;
    }
    
    if (this.shipIdleLoop && this.shipThrustLoop && this.shipIdleGain && this.shipThrustGain) {
      // Reset state
      this.currentShipState = 'idle';
      this.idleStartTime = Date.now();
      this.idleFadeoutScheduled = false;
      
      // Reset gains to idle state (idle at full, thrust at zero)
      this.shipIdleGain.gain.value = AMBIENT_LEVELS.SHIP_ENGINE;
      this.shipThrustGain.gain.value = 0;
      
      // Start both loops at the same time (they'll crossfade based on state)
      this.shipIdleLoop.currentTime = 0;
      this.shipThrustLoop.currentTime = 0;
      
      this.shipIdleLoop.play().catch(err => this.handlePlaybackError('shipIdleLoop', err, 'engine loop'));
      this.shipThrustLoop.play().catch(err => this.handlePlaybackError('shipThrustLoop', err, 'engine loop'));
      
      console.log('🚀 Ship engine loops started');
    }
  }
  
  /**
   * Stop the ship engine loops (called when game ends or pauses)
   */
  public stopShipEngineLoops(): void {
    if (this.shipIdleLoop) {
      this.shipIdleLoop.pause();
      this.shipIdleLoop.currentTime = 0;
    }
    
    if (this.shipThrustLoop) {
      this.shipThrustLoop.pause();
      this.shipThrustLoop.currentTime = 0;
    }
    
    console.log('🛑 Ship engine loops stopped');
  }
  
  /**
   * Set the ship engine state (idle or thrust) with smooth crossfading
   * Idle loop fades out after staying idle for a few seconds
   */
  public setShipEngineState(state: 'idle' | 'thrust'): void {
    if (!this.isAudioInitialized || !this.audioContext || !this.shipIdleGain || !this.shipThrustGain) {
      return;
    }
    
    // Only crossfade if state has changed
    if (this.currentShipState === state) {
      return;
    }
    
    this.currentShipState = state;
    const now = this.audioContext.currentTime;
    const fadeTime = this.SHIP_ENGINE_FADE_TIME;
    
    if (state === 'idle') {
      // Fade to idle: idle up, thrust down
      this.shipIdleGain.gain.cancelScheduledValues(now);
      this.shipThrustGain.gain.cancelScheduledValues(now);
      
      this.shipIdleGain.gain.setValueAtTime(this.shipIdleGain.gain.value, now);
      this.shipThrustGain.gain.setValueAtTime(this.shipThrustGain.gain.value, now);
      
      // Fade idle in, thrust out
      this.shipIdleGain.gain.exponentialRampToValueAtTime(AMBIENT_LEVELS.SHIP_ENGINE, now + fadeTime);
      this.shipThrustGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);
      
      // Schedule idle fadeout after delay (for transition purposes only)
      this.idleStartTime = Date.now();
      this.idleFadeoutScheduled = false;
      
      // Schedule the fadeout to happen after the delay
      setTimeout(() => {
        // Only fade out if still idle and this fadeout hasn't been cancelled
        if (this.currentShipState === 'idle' && !this.idleFadeoutScheduled && this.audioContext && this.shipIdleGain) {
          const fadeoutNow = this.audioContext.currentTime;
          this.shipIdleGain.gain.cancelScheduledValues(fadeoutNow);
          this.shipIdleGain.gain.setValueAtTime(this.shipIdleGain.gain.value, fadeoutNow);
          this.shipIdleGain.gain.exponentialRampToValueAtTime(0.001, fadeoutNow + fadeTime * 1.5); // Slower fadeout
          this.idleFadeoutScheduled = true;
          console.log('🌙 Idle engine fading out (been idle for ' + this.IDLE_FADEOUT_DELAY + 's)');
        }
      }, this.IDLE_FADEOUT_DELAY * 1000);
      
      console.log('🛸 Crossfading to IDLE engine');
    } else {
      // Fade to thrust: thrust up, idle down
      // Cancel any pending idle fadeout
      this.idleFadeoutScheduled = true; // Mark as cancelled
      
      this.shipIdleGain.gain.cancelScheduledValues(now);
      this.shipThrustGain.gain.cancelScheduledValues(now);
      
      this.shipIdleGain.gain.setValueAtTime(this.shipIdleGain.gain.value, now);
      this.shipThrustGain.gain.setValueAtTime(this.shipThrustGain.gain.value, now);
      
      // If idle was faded out, bring it back up first so the transition is smooth
      if (this.shipIdleGain.gain.value < 0.01) {
        // Idle is silent, fade it up briefly for smooth transition
        this.shipIdleGain.gain.exponentialRampToValueAtTime(AMBIENT_LEVELS.SHIP_ENGINE * 0.3, now + fadeTime * 0.3);
        this.shipIdleGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);
      } else {
        // Normal idle fadeout
        this.shipIdleGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);
      }
      
      this.shipThrustGain.gain.exponentialRampToValueAtTime(AMBIENT_LEVELS.SHIP_ENGINE, now + fadeTime);
      
      console.log('🔥 Crossfading to THRUST engine');
    }
  }
  
  // Cleanup method
  public dispose(): void {
    this.stopThemeMusic();
    
    // Clean up sound effects
    this.soundEffects.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.soundEffects.clear();
    
    // Clean up shield sound pool
    this.shieldSoundPool.forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.shieldSoundPool = [];
    this.shieldPoolIndex = 0;
    
    // Clean up ship engine loops
    this.stopShipEngineLoops();
    this.shipIdleLoop = null;
    this.shipThrustLoop = null;
    this.shipIdleGain = null;
    this.shipThrustGain = null;
    
    // Clean up Web Audio API sources
    this.soundEffectSources.clear();
    this.playlistSources = [];
    this.playlistGainNodes = [];
    this.musicPlaylist = [];
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.soundEffectsGain = null;
    this.masterLowpassFilter = null;
    this.audioEffects = null;
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();
