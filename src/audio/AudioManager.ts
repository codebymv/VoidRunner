import themeMusic from '../assets/theme.mp3';
import theme2Music from '../assets/theme2.mp3';
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
import explosionSound from '../assets/explosion.mp3';
import shipIdleLoopSound from '../assets/ship_idle_loop.mp3';
import shipThrustLoopSound from '../assets/ship_thrust_loop.mp3';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLowpassFilter: BiquadFilterNode | null = null; // Low-pass filter for master output
  private masterCompressor: DynamicsCompressorNode | null = null; // Master bus compressor
  private masterLimiter: DynamicsCompressorNode | null = null; // Brick-wall limiter for peak control
  private makeupGain: GainNode | null = null; // Makeup gain after compression
  private musicGain: GainNode | null = null;
  private soundEffectsGain: GainNode | null = null; // New sound effects bus
  private speechGain: GainNode | null = null; // Dedicated speech channel for maximum volume
  private isAudioInitialized: boolean = false; // Track if audio has been initialized
  
  // Theme music
  private themeAudio: HTMLAudioElement | null = null;
  private theme2Audio: HTMLAudioElement | null = null;
  private currentTheme: 1 | 2 = 1; // Track which theme is currently playing
  private isThemePlaying: boolean = false;
  private currentGameState: GameState = GameState.MENU;
  
  // Sound effects
  private soundEffects: Map<string, HTMLAudioElement> = new Map();
  private soundEffectSources: Map<string, MediaElementAudioSourceNode> = new Map(); // Web Audio API sources
  private speechSources: Map<string, MediaElementAudioSourceNode> = new Map(); // Dedicated speech sources
  private shieldSoundPool: HTMLAudioElement[] = []; // Pool of shield sounds for overlapping playback
  private shieldPoolIndex: number = 0; // Current index in the shield sound pool
  private starAcquireCounter: number = 0; // Counter for alternating star acquire sounds
  
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
  
  // Volume levels
  private readonly MENU_VOLUME = 0.24; // 24% - Very subtle background music
  private readonly GAMEPLAY_VOLUME = 0.27; // 27% - Lowered further for better gameplay audio balance
  private readonly SOUND_EFFECT_VOLUME = 1.0; // 100% - Maximum volume for shooting sounds
  private readonly SPEECH_VOLUME = 0.20; // 20% - Reduced to fit better in the audio mix
  private readonly SHIP_ENGINE_VOLUME = 0.15; // 15% - Background engine ambience
  
  // Mute state
  private isMuted: boolean = false;
  private volumeBeforeMute: number = 1; // Store volume level before muting
  private themeVolumeBeforeMute: number = 0; // Store theme volume before muting
  
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
      this.makeupGain = this.audioContext.createGain(); // Makeup gain after compression
      
      // Create low-pass filter for master output (cuts high frequencies above 12kHz)
      this.masterLowpassFilter = this.audioContext.createBiquadFilter();
      this.masterLowpassFilter.type = 'lowpass';
      this.masterLowpassFilter.frequency.value = 12000; // 12kHz cutoff
      this.masterLowpassFilter.Q.value = 0.7071; // Butterworth response (flat passband)
      
      // Create master bus compressor for glue and punch
      this.masterCompressor = this.audioContext.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-24, this.audioContext.currentTime); // Start compressing at -24dB
      this.masterCompressor.knee.setValueAtTime(6, this.audioContext.currentTime); // Soft knee for smooth compression
      this.masterCompressor.ratio.setValueAtTime(4, this.audioContext.currentTime); // 4:1 ratio for noticeable but musical compression
      this.masterCompressor.attack.setValueAtTime(0.003, this.audioContext.currentTime); // 3ms attack (fast enough for transients)
      this.masterCompressor.release.setValueAtTime(0.25, this.audioContext.currentTime); // 250ms release (musical timing)
      
      // Create brick-wall limiter for safety and loudness
      this.masterLimiter = this.audioContext.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-3, this.audioContext.currentTime); // Limit at -3dB (safety headroom)
      this.masterLimiter.knee.setValueAtTime(0, this.audioContext.currentTime); // Hard knee for true limiting
      this.masterLimiter.ratio.setValueAtTime(20, this.audioContext.currentTime); // 20:1 ratio (essentially brick-wall)
      this.masterLimiter.attack.setValueAtTime(0.001, this.audioContext.currentTime); // 1ms attack (instant limiting)
      this.masterLimiter.release.setValueAtTime(0.1, this.audioContext.currentTime); // 100ms release (fast recovery)
      
      // Set makeup gain to compensate for compression (bring up to modern standards)
      // This adds ~9dB to bring the -20dB output up to around -11dB to -12dB (streaming standard)
      this.makeupGain.gain.setValueAtTime(2.8, this.audioContext.currentTime); // ~9dB boost (linear gain)
      
      // Master signal chain:
      // Buses → Master Gain → Low-pass Filter → Compressor → Makeup Gain → Limiter → Output
      // This order ensures: mixing → tonal shaping → dynamics → level matching → safety limiting
      this.musicGain.connect(this.masterGain);
      this.soundEffectsGain.connect(this.masterGain);
      this.speechGain.connect(this.masterGain);
      this.shipIdleGain.connect(this.masterGain);
      this.shipThrustGain.connect(this.masterGain);
      this.masterGain.connect(this.masterLowpassFilter);
      this.masterLowpassFilter.connect(this.masterCompressor);
      this.masterCompressor.connect(this.makeupGain);
      this.makeupGain.connect(this.masterLimiter);
      this.masterLimiter.connect(this.audioContext.destination);
      
      // Initialize theme music
      this.themeAudio = new Audio(themeMusic);
      this.themeAudio.preload = 'auto';
      
      this.theme2Audio = new Audio(theme2Music);
      this.theme2Audio.preload = 'auto';
      
      // Set up alternating theme system - when one ends, play the other
      this.themeAudio.addEventListener('ended', () => {
        this.switchToTheme(2);
      });
      
      this.theme2Audio.addEventListener('ended', () => {
        this.switchToTheme(1);
      });
      
      // Initialize sound effects
      this.initializeSoundEffects();
      
      // Set initial volume for menu state
      this.setThemeVolume(this.MENU_VOLUME);
      
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
        shoot1: shoot1Sound, // Blue bullets (level 2)
        shoot2: shoot2Sound, // Purple bullets (level 3)
        chargeEmpty: chargeEmptySound, // Ammo depleted
        chargeReady: chargeReadySound, // Ammo recharged
        unlimitedAmmo: unlimitedAmmoSound, // Unlimited ammo pickup
        explosion: explosionSound // Obstacle destruction
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
    for (let i = 0; i < SHIELD_POOL_SIZE; i++) {
      const shieldAudio = new Audio(shieldActivateSound);
      shieldAudio.preload = 'auto';
      shieldAudio.volume = 1.0;
      
      // Connect to sound effects bus
      const shieldSource = this.audioContext!.createMediaElementSource(shieldAudio);
      shieldSource.connect(this.soundEffectsGain!);
      
      this.shieldSoundPool.push(shieldAudio);
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
    this.shipIdleGain!.gain.value = this.SHIP_ENGINE_VOLUME;
    this.shipThrustGain!.gain.value = 0;
    
    // Set initial sound effects volume to match music level
    this.setSoundEffectsVolume(this.MENU_VOLUME);
    
    console.log('Sound effects initialized and routed through audio bus');
    console.log('Ship engine loops initialized (idle/thrust crossfading system ready)');
  }
  
  public async playSound(soundName: string): Promise<void> {
    console.log(`🔊 Attempting to play sound: ${soundName}`);
    
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
    
    // Special handling for shield sound to use the pool for overlapping playback
    if (soundName === 'shieldActivate') {
      if (this.shieldSoundPool.length === 0) {
        console.warn('Shield sound pool not initialized');
        return;
      }
      
      try {
        const shieldAudio = this.shieldSoundPool[this.shieldPoolIndex];
        this.shieldPoolIndex = (this.shieldPoolIndex + 1) % this.shieldSoundPool.length;
        
        // Reset audio to beginning and play
        shieldAudio.currentTime = 0;
        shieldAudio.play().catch(error => {
          console.error(`Failed to play shield sound:`, error);
        });
      } catch (error) {
        console.error(`Error playing shield sound:`, error);
      }
      return;
    }

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
        audio.volume = 0.73;
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

    // Regular sound effect handling
    const audio = this.soundEffects.get(soundName);
    if (!audio) {
      console.warn(`❌ Sound effect '${soundName}' not found in soundEffects map`);
      console.log('Available sounds:', Array.from(this.soundEffects.keys()));
      return;
    }
    
    console.log(`✅ Found sound '${soundName}', attempting to play...`);
    
  try {
        // Special handling for game over sound - make it louder
        if (soundName === 'gameOver') {
          audio.volume = 0.65; // Lowered from 1.0
        } else if (soundName === 'shipHit') {
          audio.volume = 0.6; // Lowered from 1.0
        } else if (soundName === 'unlimitedAmmo') { // Added specific case
          audio.volume = 0.6; // Lowered from the default 0.95
        } else if (soundName === 'healthWrench') {
          audio.volume = 1.0; // Maximum volume for health restoration
        } else if (soundName === 'speech1' || soundName === 'speech2') {
          audio.volume = 0.80; // Slightly lower volume for captain speech
        } else {
          audio.volume = 0.95; // Increased from 0.8 to 0.95 for other sounds
        }
      
      // Reset audio to beginning and play
      audio.currentTime = 0;
      console.log(`🎵 Playing sound '${soundName}' at volume ${audio.volume}`);
      audio.play().catch(error => {
        console.error(`❌ Failed to play sound '${soundName}':`, error);
      });
    } catch (error) {
      console.error(`❌ Error playing sound '${soundName}':`, error);
    }
  }
  
  private switchToTheme(themeNumber: 1 | 2): void {
    if (!this.isThemePlaying) return; // Don't switch if music is not playing
    
    const currentAudio = this.currentTheme === 1 ? this.themeAudio : this.theme2Audio;
    const nextAudio = themeNumber === 1 ? this.themeAudio : this.theme2Audio;
    
    if (!nextAudio) return;
    
    // Stop current theme
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // Start next theme
    this.currentTheme = themeNumber;
    nextAudio.currentTime = 0;
    nextAudio.play().catch(error => {
      console.error(`Failed to switch to theme ${themeNumber}:`, error);
    });
    
    console.log(`Switched to theme ${themeNumber}`);
  }
  
  public async startThemeMusic(): Promise<void> {
    // Initialize audio on first call (after user gesture)
    if (!this.isAudioInitialized) {
      await this.initializeAudio();
    }
    
    if (this.isThemePlaying) return;
    
    const currentAudio = this.currentTheme === 1 ? this.themeAudio : this.theme2Audio;
    if (!currentAudio) return;
    
    try {
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      await currentAudio.play();
      this.isThemePlaying = true;
      console.log(`Theme ${this.currentTheme} music started`);
    } catch (error) {
      console.error('Failed to start theme music:', error);
    }
  }
  
  public stopThemeMusic(): void {
    if (!this.isThemePlaying) return;
    
    // Stop both themes
    if (this.themeAudio) {
      this.themeAudio.pause();
      this.themeAudio.currentTime = 0;
    }
    if (this.theme2Audio) {
      this.theme2Audio.pause();
      this.theme2Audio.currentTime = 0;
    }
    
    this.isThemePlaying = false;
    this.currentTheme = 1; // Reset to theme 1
    console.log('Theme music stopped');
  }
  
  public pauseThemeMusic(): void {
    if (!this.isThemePlaying) return;
    
    const currentAudio = this.currentTheme === 1 ? this.themeAudio : this.theme2Audio;
    if (currentAudio) {
      currentAudio.pause();
    }
    
    this.isThemePlaying = false;
    console.log(`Theme ${this.currentTheme} music paused`);
  }
  
  public resumeThemeMusic(): void {
    if (this.isThemePlaying) return;
    
    const currentAudio = this.currentTheme === 1 ? this.themeAudio : this.theme2Audio;
    if (!currentAudio) return;
    
    currentAudio.play().catch(error => {
      console.error('Failed to resume theme music:', error);
    });
    this.isThemePlaying = true;
    console.log(`Theme ${this.currentTheme} music resumed`);
  }
  
  private setThemeVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (this.isMuted) {
      // If muted, store the volume but don't apply it
      this.themeVolumeBeforeMute = clampedVolume;
    } else {
      // If not muted, apply the volume directly
      if (this.themeAudio) {
        this.themeAudio.volume = clampedVolume;
      }
      if (this.theme2Audio) {
        this.theme2Audio.volume = clampedVolume;
      }
    }
    
    // Sync sound effects volume with music volume
    this.setSoundEffectsVolume(volume);
    
    // Set speech volume to maximum (always loudest)
    this.setSpeechVolume(volume);
  }
  
  private setSoundEffectsVolume(volume: number): void {
    if (this.soundEffectsGain) {
      // Sound effects at 80%
      this.soundEffectsGain.gain.value = Math.max(0, Math.min(1, volume * 0.8));
    }
  }

  private setSpeechVolume(volume: number): void {
    if (this.speechGain) {
      // Speech at maximum volume - always loudest element in the mix
      this.speechGain.gain.value = this.SPEECH_VOLUME;
    }
  }
  
  public setGameState(newState: GameState): void {
    const previousState = this.currentGameState;
    this.currentGameState = newState;
    
    // Adjust theme music volume based on game state
    switch (newState) {
      case GameState.MENU:
      case GameState.PAUSED:
      case GameState.GAME_OVER:
        this.setThemeVolume(this.MENU_VOLUME);
        if (!this.isThemePlaying) {
          this.startThemeMusic();
        }
        break;
        
      case GameState.PLAYING:
        this.setThemeVolume(this.GAMEPLAY_VOLUME);
        if (!this.isThemePlaying) {
          this.startThemeMusic();
        }
        break;
    }
    
    console.log(`Game state changed from ${previousState} to ${newState}`);
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
      
      // Store and mute theme music volumes
      if (this.themeAudio) {
        this.themeVolumeBeforeMute = this.themeAudio.volume;
        this.themeAudio.volume = 0;
      }
      if (this.theme2Audio) {
        this.theme2Audio.volume = 0;
      }
    } else {
      // Restore previous volumes when unmuting
      if (this.masterGain) {
        this.masterGain.gain.value = this.volumeBeforeMute;
      }
      
      // Restore theme music volumes
      if (this.themeAudio) {
        this.themeAudio.volume = this.themeVolumeBeforeMute;
      }
      if (this.theme2Audio) {
        this.theme2Audio.volume = this.themeVolumeBeforeMute;
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
      this.shipIdleGain.gain.value = this.SHIP_ENGINE_VOLUME;
      this.shipThrustGain.gain.value = 0;
      
      // Start both loops at the same time (they'll crossfade based on state)
      this.shipIdleLoop.currentTime = 0;
      this.shipThrustLoop.currentTime = 0;
      
      this.shipIdleLoop.play().catch(err => console.error('Failed to play idle loop:', err));
      this.shipThrustLoop.play().catch(err => console.error('Failed to play thrust loop:', err));
      
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
      this.shipIdleGain.gain.exponentialRampToValueAtTime(this.SHIP_ENGINE_VOLUME, now + fadeTime);
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
        this.shipIdleGain.gain.exponentialRampToValueAtTime(this.SHIP_ENGINE_VOLUME * 0.3, now + fadeTime * 0.3);
        this.shipIdleGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);
      } else {
        // Normal idle fadeout
        this.shipIdleGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);
      }
      
      this.shipThrustGain.gain.exponentialRampToValueAtTime(this.SHIP_ENGINE_VOLUME, now + fadeTime);
      
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
    this.shieldSoundPool.forEach(audio => {
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
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.themeAudio = null;
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.soundEffectsGain = null;
    this.masterLowpassFilter = null;
    this.masterCompressor = null;
    this.masterLimiter = null;
    this.makeupGain = null;
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();
