/**
 * Audio Levels Configuration
 * Centralized volume management for all audio in the game
 */

/**
 * Music Volume Levels
 * Music is kept subtle to let gameplay sounds dominate
 */
export const MUSIC_LEVELS = {
  /** Menu music volume - 21% for subtle background atmosphere */
  MENU: 0.21,
  
  /** Gameplay music volume - 23% to stay under gameplay sounds */
  GAMEPLAY: 0.23,
  
  /** Crossfade duration between tracks in seconds */
  CROSSFADE_DURATION: 3.0,
} as const;

/**
 * Sound Effect Volume Levels
 * Effects are louder to provide immediate feedback
 */
export const SOUND_EFFECT_LEVELS = {
  // Combat & Shooting
  /** Shooting sounds (shoot1/shoot2) - 80% */
  SHOOTING: 0.8,
  
  /** Charge empty sound - 60% (warning feedback) */
  CHARGE_EMPTY: 0.13,
  
  /** Charge ready sound - 70% (positive feedback) */
  CHARGE_READY: 0.15,
  
  /** Explosion sound - 85% (impactful) */
  EXPLOSION: 0.85,
  
  // Ship & Damage
  /** Ship hit sound - 80% (impactful feedback) */
  SHIP_HIT: 0.8,
  
  /** Shield activation sound - 40% (subtle) */
  SHIELD_ACTIVATE: 0.40,
  
  /** Vulnerable blink sound - 40% (subtle warning) */
  VULNERABLE_BLINK: 0.27,
  
  // Pickups & Collectibles
  /** Star collection sounds - 50% (moderate) */
  STAR_ACQUIRE: 0.40,
  
  /** Health wrench pickup - 80% */
  HEALTH_WRENCH: 0.75,
  
  /** Unlimited ammo pickup - 60% */
  UNLIMITED_AMMO: 0.75,
  
  /** Void wipe pickup - 80% */
  VOID_WIPE: 0.8,
  
  // Upgrades & Special
  /** Ship upgrades sound - 40% (celebratory) */
  SHIP_UPGRADES: 0.12,
  
  // UI & Menu
  /** Menu open sound - 50% */
  MENU_OPEN: 0.45,
  
  /** Menu close sound - 50% */
  MENU_CLOSE: 0.45,
  
  /** Game over sound - 50% (moderate) */
  GAME_OVER: 0.65,
  
  /** Default sound effect volume - 110% */
  DEFAULT: 1.1,
} as const;

/**
 * Voice/Dialog Volume Levels
 * Dialog is elevated for clarity
 */
export const VOICE_LEVELS = {
  /** Base speech volume - 100% of master */
  SPEECH_BASE: 1.0,
  
  /** Individual speech file volume - 95% */
  SPEECH_FILE: 1.0,
} as const;

/**
 * Ambient Sound Levels
 * Background ambience for atmosphere
 */
export const AMBIENT_LEVELS = {
  /** Ship engine background ambience - 22% */
  SHIP_ENGINE: 0.62,
} as const;

/**
 * Get the appropriate volume level for a given sound effect
 */
export function getSoundEffectVolume(soundName: string): number {
  // Combat & Shooting
  if (soundName === 'shoot1' || soundName === 'shoot2') return SOUND_EFFECT_LEVELS.SHOOTING;
  if (soundName === 'chargeEmpty') return SOUND_EFFECT_LEVELS.CHARGE_EMPTY;
  if (soundName === 'chargeReady') return SOUND_EFFECT_LEVELS.CHARGE_READY;
  if (soundName === 'explosion') return SOUND_EFFECT_LEVELS.EXPLOSION;
  
  // Ship & Damage
  if (soundName === 'shipHit') return SOUND_EFFECT_LEVELS.SHIP_HIT;
  if (soundName === 'shieldActivate') return SOUND_EFFECT_LEVELS.SHIELD_ACTIVATE;
  if (soundName === 'vulnerableBlink') return SOUND_EFFECT_LEVELS.VULNERABLE_BLINK;
  
  // Pickups & Collectibles
  if (soundName === 'starAcquire' || soundName === 'starAcquire2') return SOUND_EFFECT_LEVELS.STAR_ACQUIRE;
  if (soundName === 'healthWrench') return SOUND_EFFECT_LEVELS.HEALTH_WRENCH;
  if (soundName === 'unlimitedAmmo') return SOUND_EFFECT_LEVELS.UNLIMITED_AMMO;
  if (soundName === 'voidWipe') return SOUND_EFFECT_LEVELS.VOID_WIPE;
  
  // Upgrades & Special
  if (soundName === 'shipUpgrades') return SOUND_EFFECT_LEVELS.SHIP_UPGRADES;
  
  // UI & Menu
  if (soundName === 'menuOpen') return SOUND_EFFECT_LEVELS.MENU_OPEN;
  if (soundName === 'menuClose') return SOUND_EFFECT_LEVELS.MENU_CLOSE;
  if (soundName === 'gameOver') return SOUND_EFFECT_LEVELS.GAME_OVER;
  
  // Voice/Speech
  if (soundName === 'speech1' || soundName === 'speech2') return VOICE_LEVELS.SPEECH_FILE;
  
  // Default to standard volume for unlisted effects
  return SOUND_EFFECT_LEVELS.DEFAULT;
}

/**
 * Audio state determines which volume level to use for music
 */
export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'gameover',
}

/**
 * Get the appropriate music volume for a given game state
 */
export function getMusicVolumeForState(state: GameState): number {
  switch (state) {
    case GameState.MENU:
    case GameState.PAUSED:
    case GameState.GAME_OVER:
      return MUSIC_LEVELS.MENU;
    case GameState.PLAYING:
      return MUSIC_LEVELS.GAMEPLAY;
    default:
      return MUSIC_LEVELS.MENU;
  }
}

