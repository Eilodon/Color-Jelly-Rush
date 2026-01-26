/**
 * WebGLCheck.ts
 * Reliable detection for WebGL support to prevent PixiJS crashes on hardware without GPU acceleration.
 */

export const isWebGLSupported = (): boolean => {
    try {
        const canvas = document.createElement('canvas');
        const gl =
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl') as WebGLRenderingContext;

        if (!gl) return false;

        // Hard check: Try to lose context or simple operation?
        // Just checking for context existence is usually enough for "support",
        // but some browsers return a context that fails immediately.
        // Let's do a minimal sanity check.
        const attributes = gl.getContextAttributes();
        if (!attributes) return false;

        // Optional: check for extensions if we needed specific ones, but for basic Pixi,
        // just having the context is the gateway.

        return true;
    } catch (e) {
        console.warn('WebGL detection failed:', e);
        return false;
    }
};
