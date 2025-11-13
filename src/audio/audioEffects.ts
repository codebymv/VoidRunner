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



