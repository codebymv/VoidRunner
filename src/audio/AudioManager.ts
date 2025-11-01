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
  
  // Volume levels
  private readonly MENU_VOLUME = 0.15; // 15% (increased from 6%)
  private readonly GAMEPLAY_VOLUME = 0.18; // 18% (increased from 8.3%)
  private readonly SOUND_EFFECT_VOLUME = 0.9; // 90% - Increased for much better speech audibility
  private readonly SPEECH_VOLUME = 0.23; // 23% - Reduced to fit better in the audio mix
  
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
      
      // Connect gain nodes - music, sound effects, and speech all go through master
      this.musicGain.connect(this.masterGain);
      this.soundEffectsGain.connect(this.masterGain);
      this.speechGain.connect(this.masterGain);
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
      vulnerableBlink: vulnerableBlinkSound
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
    
    // Set initial sound effects volume to match music level
    this.setSoundEffectsVolume(this.MENU_VOLUME);
    
    console.log('Sound effects initialized and routed through audio bus');
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
        audio.volume = 0.95;
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
        audio.volume = 1.0; // Maximum volume (unchanged)
      } else if (soundName === 'shipHit') {
        audio.volume = 1.0; // Increased from 0.9 to maximum volume
      } else if (soundName === 'speech1' || soundName === 'speech2') {
        audio.volume = 1.0; // Maximum volume for speech sounds
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
      // Sound effects at 120% the volume of music (increased from 80% for louder effects)
      this.soundEffectsGain.gain.value = Math.max(0, Math.min(1, volume * 1.2));
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