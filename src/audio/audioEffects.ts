/**
 * Audio Effects Configuration
 * Manages dynamics processing, compression, and limiting for the master audio bus
 */

export interface AudioEffectsChain {
  compressor: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
  makeupGain: GainNode;
}

/**
 * Sound Variation Settings
 * Prevents "sound spam" effect in late game by adding variation and limiting instances
 */
export interface SoundVariationConfig {
  /** Maximum simultaneous instances of this sound (prevents spam) */
  maxInstances?: number;
  /** Pitch variation range in cents (100 cents = 1 semitone) */
  pitchVariation?: number;
  /** Volume variation range (0-1, applied as multiplier) */
  volumeVariation?: number;
  /** Enable stereo panning based on screen position */
  enableSpatialPan?: boolean;
  /** Sound priority (higher = more important, less likely to be culled) */
  priority?: number;
}

/**
 * Sound Variation Profiles
 * Configure how frequently-playing sounds behave in late game
 */
export const SOUND_VARIATION_PROFILES: Record<string, SoundVariationConfig> = {
  // Collision sounds (play VERY frequently in late game)
  meteorCollision: {
    maxInstances: 4,           // Max 4 simultaneous meteor collision sounds
    pitchVariation: 15,         // ±15 cents pitch variation (subtle)
    volumeVariation: 0.15,      // ±15% volume variation
    enableSpatialPan: true,     // Pan based on screen position
    priority: 3,                // Medium priority
  },
  
  blackholeAbsorb: {
    maxInstances: 3,           // Max 3 simultaneous blackhole sounds
    pitchVariation: 20,         // ±20 cents (slightly more variation for dramatic effect)
    volumeVariation: 0.1,       // ±10% volume variation
    enableSpatialPan: true,
    priority: 5,                // Higher priority (blackholes are important)
  },
  
  debrisBounce: {
    maxInstances: 6,           // Allow more debris sounds (they're quieter)
    pitchVariation: 25,         // ±25 cents (more variation = less monotonous)
    volumeVariation: 0.2,       // ±20% volume variation
    enableSpatialPan: true,
    priority: 2,                // Lower priority (can be culled first)
  },
  
  explosion: {
    maxInstances: 3,           // Limit explosions to prevent cacophony
    pitchVariation: 10,         // ±10 cents (keep explosions consistent)
    volumeVariation: 0.1,       // ±10% volume variation
    enableSpatialPan: true,
    priority: 6,                // High priority (explosions are important feedback)
  },
  
  scrapCollect: {
    maxInstances: 5,
    pitchVariation: 30,         // High variation (makes rapid collection musical)
    volumeVariation: 0.15,
    enableSpatialPan: true,
    priority: 4,
  },
  
  bulletFire: {
    maxInstances: 4,           // Limit bullet sounds during rapid fire
    pitchVariation: 8,          // Subtle variation to avoid "machine gun" effect
    volumeVariation: 0.1,
    enableSpatialPan: false,    // Bullets always fire from player (center)
    priority: 5,
  },
  
  // Add more sound profiles as needed...
} as const;

/**
 * Default variation config for sounds not explicitly configured
 */
export const DEFAULT_SOUND_VARIATION: SoundVariationConfig = {
  maxInstances: 5,
  pitchVariation: 10,
  volumeVariation: 0.1,
  enableSpatialPan: false,
  priority: 3,
} as const;

/**
 * Compression Settings
 * Master bus compression for musical glue and cohesion
 */
export const COMPRESSION_SETTINGS = {
  /** Start compressing at -12dB (less sensitive, less ducking) */
  THRESHOLD: -10,
  
  /** Softer knee for gentler, more musical compression */
  KNEE: 10,
  
  /** 1.8:1 ratio for very subtle, transparent compression */
  RATIO: 1.8,
  
  /** 30ms attack for natural transient response (lets sound effects punch through) */
  ATTACK: 0.03,
  
  /** 150ms release for faster recovery (music bounces back quicker) */
  RELEASE: 0.15,
} as const;

/**
 * Limiter Settings
 * Brick-wall limiter to prevent clipping and distortion
 */
export const LIMITER_SETTINGS = {
  /** Give 2dB of headroom before limiting */
  THRESHOLD: -2.0, 
  
  /** Soften the "knee" just a bit */
  KNEE: 2, 
  
  /** This is still limiting, but less aggressive than 20:1 */
  RATIO: 10, 
  
  /** * CRITICAL: Let the *very* beginning of a sound (the transient)
   * poke through. 0.001s (1ms) is all you need to add "punch".
   */
  ATTACK: 0.001, 
  
  RELEASE: 0.1,
} as const;

/**
 * Makeup Gain Settings
 * Compensates for compression gain reduction
 */
export const MAKEUP_GAIN_SETTINGS = {
  // ...
  GAIN: 1.1, // ~ +0.8dB boost
} as const;

/**
 * Creates and configures the master audio effects chain
 * Order: Input → Compressor → Makeup Gain → Limiter → Output
 */
export function createAudioEffectsChain(audioContext: AudioContext): AudioEffectsChain {
  // Create nodes
  const compressor = audioContext.createDynamicsCompressor();
  const limiter = audioContext.createDynamicsCompressor();
  const makeupGain = audioContext.createGain();
  
  // Configure master bus compressor
  compressor.threshold.setValueAtTime(COMPRESSION_SETTINGS.THRESHOLD, audioContext.currentTime);
  compressor.knee.setValueAtTime(COMPRESSION_SETTINGS.KNEE, audioContext.currentTime);
  compressor.ratio.setValueAtTime(COMPRESSION_SETTINGS.RATIO, audioContext.currentTime);
  compressor.attack.setValueAtTime(COMPRESSION_SETTINGS.ATTACK, audioContext.currentTime);
  compressor.release.setValueAtTime(COMPRESSION_SETTINGS.RELEASE, audioContext.currentTime);
  
  // Configure makeup gain
  makeupGain.gain.setValueAtTime(MAKEUP_GAIN_SETTINGS.GAIN, audioContext.currentTime);
  
  // Configure brick-wall limiter
  limiter.threshold.setValueAtTime(LIMITER_SETTINGS.THRESHOLD, audioContext.currentTime);
  limiter.knee.setValueAtTime(LIMITER_SETTINGS.KNEE, audioContext.currentTime);
  limiter.ratio.setValueAtTime(LIMITER_SETTINGS.RATIO, audioContext.currentTime);
  limiter.attack.setValueAtTime(LIMITER_SETTINGS.ATTACK, audioContext.currentTime);
  limiter.release.setValueAtTime(LIMITER_SETTINGS.RELEASE, audioContext.currentTime);
  
  console.log('🎛️ Audio Effects Chain Created:');
  console.log(`   Compressor: ${COMPRESSION_SETTINGS.THRESHOLD}dB threshold, ${COMPRESSION_SETTINGS.RATIO}:1 ratio`);
  console.log(`   Makeup Gain: +${(20 * Math.log10(MAKEUP_GAIN_SETTINGS.GAIN)).toFixed(1)}dB`);
  console.log(`   Limiter: ${LIMITER_SETTINGS.THRESHOLD}dB ceiling, ${LIMITER_SETTINGS.RATIO}:1 ratio`);
  
  return { compressor, limiter, makeupGain };
}

/**
 * Connects the audio effects chain in the proper order
 * @param effects - The effects chain to connect
 * @param destination - Final destination (usually audioContext.destination)
 */
export function connectEffectsChain(
  effects: AudioEffectsChain,
  destination: AudioDestinationNode
): void {
  // Signal flow: Compressor → Makeup Gain → Limiter → Output
  effects.compressor.connect(effects.makeupGain);
  effects.makeupGain.connect(effects.limiter);
  effects.limiter.connect(destination);
}

/**
 * Applies random pitch variation to an audio element
 * @param cents - Range of pitch variation in cents (±cents)
 * @returns Playback rate multiplier (1.0 = normal pitch)
 */
export function getRandomPitchVariation(cents: number): number {
  // Convert cents to playback rate: 100 cents = 1 semitone = 2^(1/12) ratio
  const variation = (Math.random() * 2 - 1) * cents; // Random value between -cents and +cents
  return Math.pow(2, variation / 1200); // Convert cents to playback rate
}

/**
 * Applies random volume variation
 * @param range - Range of volume variation (0-1)
 * @returns Volume multiplier (e.g., 0.9 to 1.1 for range of 0.1)
 */
export function getRandomVolumeVariation(range: number): number {
  return 1.0 + (Math.random() * 2 - 1) * range; // Random value between (1-range) and (1+range)
}

/**
 * Calculates stereo pan based on screen position
 * @param x - X position on screen (0 to screenWidth)
 * @param screenWidth - Total screen width
 * @returns Pan value (-1 = full left, 0 = center, 1 = full right)
 */
export function calculateSpatialPan(x: number, screenWidth: number): number {
  // Normalize to 0-1, then convert to -1 to 1
  const normalized = x / screenWidth;
  return (normalized * 2) - 1; // -1 (left) to 1 (right)
}

/**
 * Gets the variation config for a sound, with fallback to defaults
 * @param soundName - Name of the sound effect
 * @returns Sound variation configuration
 */
export function getSoundVariationConfig(soundName: string): SoundVariationConfig {
  return SOUND_VARIATION_PROFILES[soundName] || DEFAULT_SOUND_VARIATION;
}

/**
 * Sound Instance Tracker
 * Tracks active instances of each sound to enforce maxInstances limits
 */
export class SoundInstanceTracker {
  private instances: Map<string, number> = new Map();

  /**
   * Check if a new instance of this sound can be played
   * @param soundName - Name of the sound
   * @param maxInstances - Maximum allowed instances
   * @returns true if sound can play, false if at limit
   */
  canPlay(soundName: string, maxInstances: number): boolean {
    const current = this.instances.get(soundName) || 0;
    return current < maxInstances;
  }

  /**
   * Register that a sound instance started playing
   */
  registerInstance(soundName: string): void {
    const current = this.instances.get(soundName) || 0;
    this.instances.set(soundName, current + 1);
  }

  /**
   * Register that a sound instance finished playing
   */
  unregisterInstance(soundName: string): void {
    const current = this.instances.get(soundName) || 0;
    if (current > 0) {
      this.instances.set(soundName, current - 1);
    }
  }

  /**
   * Get current instance count for a sound
   */
  getInstanceCount(soundName: string): number {
    return this.instances.get(soundName) || 0;
  }

  /**
   * Clear all tracked instances (useful for testing or reset)
   */
  clear(): void {
    this.instances.clear();
  }
}



