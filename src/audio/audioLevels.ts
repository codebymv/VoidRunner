/**
 * Audio Levels Configuration
 * Centralized volume management for all audio in the game
 */

/**
 * Music Volume Levels
 * Music is kept subtle to let gameplay sounds dominate
 */
export const MUSIC_LEVELS = {
  /** Menu music volume - 9% for subtle background atmosphere */
  MENU: 0.08,
  
  /** Gameplay music volume - 11% to stay under gameplay sounds */
  GAMEPLAY: 0.10,
  
  /** Crossfade duration between tracks in seconds */
  CROSSFADE_DURATION: 3.0,
} as const;

/**
 * Sound Effect Volume Levels
 * Effects are louder to provide immediate feedback
 */
export const SOUND_EFFECT_LEVELS = {
  /** Maximum volume for shooting sounds - 100% */
  SHOOTING: 1.3,
  
  /** Shield activation sound - 30% (subtle) */
  SHIELD_ACTIVATE: 0.40,
  
  /** Star collection sounds - 40% (moderate) */
  STAR_ACQUIRE: 0.70,
  
  /** Game over sound - 35% (moderate) */
  GAME_OVER: 0.5,
  
  /** Default sound effect volume - 100% */
  DEFAULT: 1.2,
} as const;

/**
 * Voice/Dialog Volume Levels
 * Dialog is elevated for clarity
 */
export const VOICE_LEVELS = {
  /** Base speech volume - 35% of master */
  SPEECH_BASE: 0.35,
  
  /** Individual speech file volume - 95% */
  SPEECH_FILE: 0.95,
} as const;

/**
 * Ambient Sound Levels
 * Background ambience for atmosphere
 */
export const AMBIENT_LEVELS = {
  /** Ship engine background ambience - 15% */
  SHIP_ENGINE: 0.17,
} as const;

/**
 * Get the appropriate volume level for a given sound effect
 */
export function getSoundEffectVolume(soundName: string): number {
  // Specific overrides for certain sounds
  if (soundName === 'shieldActivate') return SOUND_EFFECT_LEVELS.SHIELD_ACTIVATE;
  if (soundName === 'starAcquire' || soundName === 'starAcquire2') return SOUND_EFFECT_LEVELS.STAR_ACQUIRE;
  if (soundName === 'gameOver') return SOUND_EFFECT_LEVELS.GAME_OVER;
  if (soundName === 'shipHit') return 0.45;
  if (soundName === 'unlimitedAmmo') return 0.6;
  if (soundName === 'healthWrench') return 0.8;
  if (soundName === 'speech1' || soundName === 'speech2') return VOICE_LEVELS.SPEECH_FILE;
  
  // Default to full volume for most effects
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

