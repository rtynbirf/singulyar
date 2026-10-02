import { STATUS } from '../src/core.mjs';

export const textOutput = {
  id: 'output.text', kind: 'output', priority: 100,
  status: () => ({ state: STATUS.READY, privacy: 'local' }),
  render(message, target) { target.textContent = message.text ?? ''; }
};

export const ttsOutput = {
  id: 'output.tts', kind: 'output', priority: 80,
  status() {
    return { state: 'speechSynthesis' in globalThis ? STATUS.READY : STATUS.UNAVAILABLE, privacy: 'device' };
  },
  speak(text, preferences = {}) {
    if (!('speechSynthesis' in globalThis)) throw new Error('Speech Synthesis unavailable');
    const u = new SpeechSynthesisUtterance(text);
    if (preferences.lang) u.lang = preferences.lang;
    if (Number.isFinite(preferences.rate)) u.rate = preferences.rate;
    if (Number.isFinite(preferences.pitch)) u.pitch = preferences.pitch;
    if (Number.isFinite(preferences.volume)) u.volume = preferences.volume;
    const voiceName = preferences.voiceName;
    const voice = speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (voice) u.voice = voice;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
};

export const vibrationOutput = {
  id: 'output.vibration', kind: 'output', priority: 40,
  status: () => ({ state: 'vibrate' in navigator ? STATUS.READY : STATUS.UNAVAILABLE, privacy: 'local' }),
  pulse(pattern = [80]) { if (!navigator.vibrate) throw new Error('Vibration unavailable'); navigator.vibrate(pattern); }
};

export const speechInput = {
  id: 'input.browser-speech', kind: 'input', priority: 20,
  status() {
    const Ctor = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    return { state: Ctor ? STATUS.BROWSER_DEPENDENT : STATUS.UNAVAILABLE, privacy: 'browser-dependent' };
  },
  create(lang = 'ru-RU') {
    const Ctor = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!Ctor) throw new Error('SpeechRecognition unavailable');
    const r = new Ctor(); r.lang = lang; r.interimResults = false; r.continuous = false; return r;
  }
};

export const cameraProbe = {
  id: 'input.camera', kind: 'input', priority: 10,
  status: () => ({ state: navigator.mediaDevices?.getUserMedia ? STATUS.PERMISSION_REQUIRED : STATUS.UNAVAILABLE, privacy: 'local-if-used' }),
  async request() { return navigator.mediaDevices.getUserMedia({ video: true }); }
};

export const microphoneProbe = {
  id: 'input.microphone', kind: 'input', priority: 10,
  status: () => ({ state: navigator.mediaDevices?.getUserMedia ? STATUS.PERMISSION_REQUIRED : STATUS.UNAVAILABLE, privacy: 'local-if-used' }),
  async request() { return navigator.mediaDevices.getUserMedia({ audio: true }); }
};

export const browserAdapters = [textOutput, ttsOutput, vibrationOutput, speechInput, cameraProbe, microphoneProbe];
