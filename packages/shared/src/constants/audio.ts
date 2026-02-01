/**
 * AUDIO CONFIGURATION CONSTANTS
 * Centralized audio timing and parameter management
 */

export const AUDIO_CONSTANTS = {
  // Tempo adjustment ranges
  TEMPO: {
    MIN_MULTIPLIER: 0.8,
    MAX_MULTIPLIER: 1.2,
    BASE_RANGE: 0.4,
    TRANSITION_DURATION: 0.5, // seconds
  },

  // Intensity-based gain adjustment
  INTENSITY: {
    MIN_GAIN: 0.5,
    MAX_GAIN: 1.0,
    BASE_INTENSITY: 0.5,
    TRANSITION_DURATION: 0.5, // seconds
  },

  // Game event sound parameters
  GAME_SOUNDS: {
    skill: { frequency: 800, duration: 0.2, type: 'square' as const },
    hit: { frequency: 200, duration: 0.1, type: 'sawtooth' as const },
    levelUp: { frequency: 400, duration: 0.5, type: 'sine' as const },
    achievement: { frequency: 600, duration: 0.8, type: 'triangle' as const },
    death: { frequency: 100, duration: 1.0, type: 'sawtooth' as const },
    ringCommit: { frequency: 1000, duration: 0.3, type: 'sine' as const },
  },

  // Spatial audio parameters
  SPATIAL: {
    DEFAULT_REF_DISTANCE: 1,
    DEFAULT_MAX_DISTANCE: 10000,
    DEFAULT_ROLLOFF_FACTOR: 1,
    DEFAULT_CONE_INNER_ANGLE: 360,
    DEFAULT_CONE_OUTER_ANGLE: 0,
    DEFAULT_CONE_OUTER_GAIN: 0,
  },

  // Quality settings based on device performance
  QUALITY: {
    LOW: { maxLayers: 3, sampleRate: 22050, bufferSize: 512 },
    MEDIUM: { maxLayers: 5, sampleRate: 44100, bufferSize: 1024 },
    HIGH: { maxLayers: 8, sampleRate: 48000, bufferSize: 2048 },
    ULTRA: { maxLayers: 12, sampleRate: 48000, bufferSize: 4096 },
  },

  // Adaptive audio thresholds
  ADAPTIVE: {
    INTENSITY_THRESHOLD_LOW: 0.3,
    INTENSITY_THRESHOLD_MEDIUM: 0.6,
    INTENSITY_THRESHOLD_HIGH: 0.8,
    MATCH_PERCENT_LOW: 0.3,
    MATCH_PERCENT_MEDIUM: 0.6,
    MATCH_PERCENT_HIGH: 0.8,
  },

  // Fade timing
  FADE: {
    LAYER_FADE_OUT: 1.0, // seconds
    THEME_FADE_OUT: 2.0, // seconds
    SFX_FADE_OUT: 0.3, // seconds
  },

  // Procedural sound generation
  PROCEDURAL: {
    BASE_VOLUME: 0.3,
    HARMONICS: [1, 2, 3, 4, 5], // Frequency multipliers
    NOISE_THRESHOLD: 0.1,
    ENVELOPE_ATTACK: 0.01,
    ENVELOPE_DECAY: 0.1,
    ENVELOPE_SUSTAIN: 0.3,
    ENVELOPE_RELEASE: 0.5,
  },
} as const;

export type AudioConstants = typeof AUDIO_CONSTANTS;
