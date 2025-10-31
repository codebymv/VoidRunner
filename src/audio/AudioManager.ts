import themeMusic from '../assets/theme.mp3';
import theme2Music from '../assets/theme2.mp3';
import gameOverSound from '../assets/game_over.mp3';
import healthWrenchSound from '../assets/health_wrench.mp3';
import shieldActivateSound from '../assets/shield_activate.mp3';
import shipUpgradesSound from '../assets/ship_upgrades.mp3';
import starAcquireSound from '../assets/star_aquire.mp3';
import menuOpenSound from '../assets/menu_open.mp3';
import menuCloseSound from '../assets/menu_close.mp3';

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
  private musicGain: GainNode | null = null;
  private soundEffectsGain: GainNode | null = null; // New sound effects bus
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
  private shieldSoundPool: HTMLAudioElement[] = []; // Pool of shield sounds for overlapping playback
  private shieldPoolIndex: number = 0; // Current index in the shield sound pool
  
  // Volume levels
  private readonly MENU_VOLUME = 0.06; // 6% (1/3 of original 18%)
  private readonly GAMEPLAY_VOLUME = 0.083; // 8.3% (1/3 of original 25%)
  private readonly SOUND_EFFECT_VOLUME = 0.4; // 40%
  
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
      
      // Connect gain nodes - both music and sound effects go through master
      this.musicGain.connect(this.masterGain);
      this.soundEffectsGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      
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
    if (!this.audioContext || !this.soundEffectsGain) {
      console.error('AudioContext or soundEffectsGain not initialized');
      return;
    }

    const soundFiles = {
      gameOver: gameOverSound,
      healthWrench: healthWrenchSound,
      shieldActivate: shieldActivateSound,
      shipUpgrades: shipUpgradesSound,
      starAcquire: starAcquireSound,
      menuOpen: menuOpenSound,
      menuClose: menuCloseSound
    };
    
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
    
    // Set initial sound effects volume to match music level
    this.setSoundEffectsVolume(this.MENU_VOLUME);
    
    console.log('Sound effects initialized and routed through audio bus');
  }
  
  public playSound(soundName: string): void {
    // Don't play sounds if audio hasn't been initialized yet
    if (!this.isAudioInitialized) {
      console.log('Audio not initialized yet, sound will be skipped');
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

    // Regular sound effect handling
    const audio = this.soundEffects.get(soundName);
    if (!audio) {
      console.warn(`Sound effect '${soundName}' not found`);
      return;
    }
    
    try {
      // Special handling for game over sound - make it louder
      if (soundName === 'gameOver') {
        audio.volume = 1.0; // Maximum volume (was 1.5 which is invalid)
      } else {
        audio.volume = 0.8; // Normal volume for other sounds
      }
      
      // Reset audio to beginning and play
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error(`Failed to play sound '${soundName}':`, error);
      });
    } catch (error) {
      console.error(`Error playing sound '${soundName}':`, error);
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
    if (this.themeAudio) {
      this.themeAudio.volume = Math.max(0, Math.min(1, volume));
    }
    if (this.theme2Audio) {
      this.theme2Audio.volume = Math.max(0, Math.min(1, volume));
    }
    // Sync sound effects volume with music volume
    this.setSoundEffectsVolume(volume);
  }
  
  private setSoundEffectsVolume(volume: number): void {
    if (this.soundEffectsGain) {
      // Sound effects at half the volume of music
      this.soundEffectsGain.gain.value = Math.max(0, Math.min(1, volume * 0.5));
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
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  public playMenuOpen(): void {
    this.playSound('menuOpen');
  }
  
  public playMenuClose(): void {
    this.playSound('menuClose');
  }
  
  public getMasterVolume(): number {
    return this.masterGain?.gain.value || 1;
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
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();