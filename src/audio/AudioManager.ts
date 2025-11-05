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
  type AudioEffectsChain 
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
        shoot1: shoot1Sound, // Blue bullets (level 2)
        shoot2: shoot2Sound, // Purple bullets (level 3)
        chargeEmpty: chargeEmptySound, // Ammo depleted
        chargeReady: chargeReadySound, // Ammo recharged
        unlimitedAmmo: unlimitedAmmoSound, // Unlimited ammo pickup
        voidWipe: voidWipeSound, // Void wipe power-up (clears all obstacles)
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
    this.shipIdleGain!.gain.value = AMBIENT_LEVELS.SHIP_ENGINE;
    this.shipThrustGain!.gain.value = 0;
    
    // Set initial sound effects volume to match music level
    this.setSoundEffectsVolume(MUSIC_LEVELS.MENU);
    
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
        audio.volume = getSoundEffectVolume('starAcquire');
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
      // Get appropriate volume level for this sound effect
      audio.volume = getSoundEffectVolume(soundName);
      
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
      this.isThemePlaying = true;
      console.log(`🎵 Playlist started with track ${this.currentTrackIndex}`);
    } catch (error) {
      console.error('Failed to start playlist:', error);
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
