/**
 * @cjr/client - Capability Check
 * 
 * Verifies environment support for critical features like SharedArrayBuffer.
 * Logs detailed warnings if COOP/COEP headers are missing.
 */

export function checkEnvironmentCapabilities(): boolean {
    const isSABSupported = typeof SharedArrayBuffer !== 'undefined';
    const isCrossOriginIsolated = window.crossOriginIsolated;

    console.group('🔧 EIDOLON-V: Environment Capability Check');

    // 1. Check SharedArrayBuffer
    if (isSABSupported) {
        console.log('%c✅ SharedArrayBuffer is defined.', 'color: green');
    } else {
        console.error('%c❌ SharedArrayBuffer is UNDEFINED.', 'color: red');
    }

    // 2. Check Cross-Origin Isolation (Required for high-res timers & SAB)
    if (isCrossOriginIsolated) {
        console.log('%c✅ Cross-Origin Isolated: TRUE', 'color: green');
    } else {
        console.warn('%c⚠️ Cross-Origin Isolated: FALSE', 'color: orange');
        console.info('To enable Multithreading (PhysicsWorker), the server must serve these headers:');
        console.info('  Cross-Origin-Opener-Policy: same-origin');
        console.info('  Cross-Origin-Embedder-Policy: require-corp');
    }

    const supportsWorker = typeof Worker !== 'undefined';
    if (supportsWorker) {
        console.log('%c✅ Web Workers: SUPPORTED', 'color: green');
    } else {
        console.error('%c❌ Web Workers: NOT SUPPORTED', 'color: red');
    }

    const ready = isSABSupported && isCrossOriginIsolated && supportsWorker;

    if (ready) {
        console.log('%c🚀 MULTITHREADING READY', 'color: #00ff00; font-weight: bold');
    } else {
        console.warn('%c⚠️ MULTITHREADING DISABLED (Environment constraints)', 'color: orange; font-weight: bold');
    }

    console.groupEnd();
    return ready;
}
