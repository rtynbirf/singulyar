/**
 * СИНГУЛЯР · Standalone Diagnostic Test Suite v2.0
 */
(async function runSingulyarTestSuite() {
    console.log("%c[СИНГУЛЯР] %cЗапуск суверенной диагностики...", "color:#00f0ff; font-weight:bold;", "color:#fff;");

    const results = {
        timestamp: new Date().toISOString(),
        audioWorklet: { status: "FAIL" },
        opfs: { status: "FAIL" },
        webCrypto: { status: "FAIL" },
        webRTC: { status: "FAIL" },
        serviceWorker: { status: "FAIL" }
    };

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && new AudioCtx().audioWorklet) results.audioWorklet.status = "PASS";
    } catch (e) {}

    try {
        if (navigator.storage && navigator.storage.getDirectory) results.opfs.status = "PASS";
    } catch (e) {}

    try {
        if (window.crypto && window.crypto.subtle) results.webCrypto.status = "PASS";
    } catch (e) {}

    try {
        if (window.RTCPeerConnection) results.webRTC.status = "PASS";
    } catch (e) {}

    try {
        if ('serviceWorker' in navigator) results.serviceWorker.status = "PASS";
    } catch (e) {}

    console.table(results);
    return results;
})();
