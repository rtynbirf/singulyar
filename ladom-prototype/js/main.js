import { SONG } from '../data/lyrics.js';

// ——— State ———
const state = {
  voices: 3,
  mode: 'together',
  playing: false,
  currentTime: 0,
  clapCount: 0,
  started: false,
  rafId: null,
  lastTs: 0
};

// ——— DOM ———
const $ = (sel) => document.querySelector(sel);
const voiceCountEl = $('#voice-count');
const voicePillsEl = $('#voice-pills');
const lyricsEl = $('#lyrics');
const progressBar = $('#progress-bar');
const timeCurrent = $('#time-current');
const timeTotal = $('#time-total');
const btnPlay = $('#btn-play');
const btnRestart = $('#btn-restart');
const btnClap = $('#btn-clap');
const btnStart = $('#btn-start');
const clapCountEl = $('#clap-count');

// ——— Helpers ———
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderVoices() {
  voiceCountEl.textContent = state.voices;
  voicePillsEl.innerHTML = '';
  for (let i = 1; i <= state.voices; i++) {
    const pill = document.createElement('span');
    pill.className = 'pill' + (i === 1 ? ' active' : '');
    pill.textContent = `голос ${i}`;
    voicePillsEl.appendChild(pill);
  }
}

function renderLyrics(highlightIndex = -1) {
  if (!state.started) {
    lyricsEl.innerHTML = '<div class="line placeholder">Нажми «Начать вечер»</div>';
    return;
  }

  lyricsEl.innerHTML = SONG.lines.map((line, i) => {
    let cls = 'line';
    if (i === highlightIndex) cls += ' active';
    else if (i < highlightIndex) cls += ' past';
    return `<div class="${cls}" data-i="${i}">${line.text}</div>`;
  }).join('');

  // Scroll active into view
  const active = lyricsEl.querySelector('.line.active');
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function findCurrentLineIndex(time) {
  let idx = -1;
  for (let i = 0; i < SONG.lines.length; i++) {
    if (SONG.lines[i].t <= time) idx = i;
    else break;
  }
  return idx;
}

function updateUI() {
  progressBar.style.width = `${(state.currentTime / SONG.duration) * 100}%`;
  timeCurrent.textContent = formatTime(state.currentTime);
  timeTotal.textContent = formatTime(SONG.duration);

  if (state.started) {
    const idx = findCurrentLineIndex(state.currentTime);
    renderLyrics(idx);
  }
}

// ——— Playback (simulated, no real audio in prototype) ———
function tick(ts) {
  if (!state.playing) return;

  if (state.lastTs) {
    const delta = (ts - state.lastTs) / 1000;
    state.currentTime = Math.min(state.currentTime + delta, SONG.duration);
  }
  state.lastTs = ts;

  updateUI();

  if (state.currentTime >= SONG.duration) {
    stop();
    return;
  }

  state.rafId = requestAnimationFrame(tick);
}

function play() {
  if (state.currentTime >= SONG.duration) {
    state.currentTime = 0;
  }
  state.playing = true;
  state.lastTs = 0;
  document.body.classList.add('is-playing');
  btnPlay.setAttribute('aria-label', 'Пауза');
  state.rafId = requestAnimationFrame(tick);
}

function pause() {
  state.playing = false;
  document.body.classList.remove('is-playing');
  btnPlay.setAttribute('aria-label', 'Пуск');
  if (state.rafId) cancelAnimationFrame(state.rafId);
}

function stop() {
  pause();
  state.currentTime = 0;
  updateUI();
}

function togglePlay() {
  if (!state.started) {
    startEvening();
    return;
  }
  state.playing ? pause() : play();
}

function startEvening() {
  state.started = true;
  state.currentTime = 0;
  renderLyrics(0);
  play();
}

// ——— Events ———
$('#voice-minus').addEventListener('click', () => {
  if (state.voices > 1) {
    state.voices--;
    renderVoices();
  }
});

$('#voice-plus').addEventListener('click', () => {
  if (state.voices < 12) {
    state.voices++;
    renderVoices();
  }
});

document.querySelectorAll('.mode').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });
});

btnPlay.addEventListener('click', togglePlay);
btnRestart.addEventListener('click', () => {
  stop();
  if (state.started) play();
});
btnClap.addEventListener('click', () => {
  state.clapCount++;
  clapCountEl.textContent = state.clapCount;
});
btnStart.addEventListener('click', startEvening);

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.started) {
      state.clapCount++;
      clapCountEl.textContent = state.clapCount;
    } else {
      startEvening();
    }
  }
  if (e.code === 'KeyR') {
    stop();
    if (state.started) play();
  }
});

// ——— Init ———
timeTotal.textContent = formatTime(SONG.duration);
renderVoices();
renderLyrics();
updateUI();

console.log('ЛАДОМ прототип v0.1 готов. Модульный, чистый, без монолита.');
