/**
 * Единый источник состояния.
 * Никакого загрязнения window.
 */
export function createState() {
  return {
    version: '0.2.0',
    voices: 3,
    mode: 'together',       // together | relay | canon
    playing: false,
    started: false,
    currentTime: 0,
    clapCount: 0,
    activeLineIndex: -1,
    rafId: null,
    lastTs: 0
  };
}
