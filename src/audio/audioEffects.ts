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
  /** Start compressing at -30dB (less aggressive, more headroom) */
  THRESHOLD: -20,
  
  /** Softer knee for gentler, more musical compression */
  KNEE: 8,
  
  /** 2.5:1 ratio for subtle, transparent compression */
  RATIO: 2.5,
  
  /** 5ms attack for natural transient response */
  ATTACK: 0.005,
  
  /** 300ms release for smooth, musical compression */
  RELEASE: 0.3,
} as const;

/**
 * Limiter Settings
 * Brick-wall limiter to prevent clipping and distortion
 */
export const LIMITER_SETTINGS = {
  /** Hard limit at -0.1dB to prevent clipping */
  THRESHOLD: -0.1,
  
  /** Hard knee for brick-wall limiting */
  KNEE: 0,
  
  /** 20:1 ratio for hard limiting */
  RATIO: 20,
  
  /** 0ms attack for instant limiting */
  ATTACK: 0,
  
  /** 0.1s release for fast recovery */
  RELEASE: 0.1,
} as const;

/**
 * Makeup Gain Settings
 * Compensates for compression gain reduction
 */
export const MAKEUP_GAIN_SETTINGS = {
  /** 
   * Linear gain multiplier: 1.5 ≈ +3.5dB boost
   * Compensates for compression without over-driving
   */
  GAIN: 1.3,
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

