/**
 * ЛАДОМ v0.2.0 — точка входа.
 * Полностью переписано с нуля.
 * Нет eval, нет innerHTML для данных, нет глобального загрязнения.
 */
import { SONG, VERSION } from '../data/song.js';
import { createState } from './state.js';
import { findLineIndex, buildLyricsDOM, updateActiveLine } from './lyrics-engine.js';

const state = createState();

// ——— DOM-ссылки (один раз) ———
const $ = (sel) => document.querySelector(sel);

const els = {
  version:      $('#app-version'),
  songMeta:     $('#song-meta'),
  voiceCount:   $('#voice-count'),
  voicePills:   $('#voice-pills'),
  lyrics:       $('#lyrics'),
  progressBar:  $('#progress-bar'),
  progressTrack:$('#progress-track'),
  timeCurrent:  $('#time-current'),
  timeTotal:    $('#time-total'),
  btnPlay:      $('#btn-play'),
  btnRestart:   $('#btn-restart'),
  btnClap:      $('#btn-clap'),
  clapCount:    $('#clap-count'),
  btnStart:     $('#btn-start'),
  btnHelp:      $('#btn-help'),
  helpDialog:   $('#help-dialog'),
  helpClose:    $('#help-close'),
  modes:        document.querySelectorAll('.mode')
};

// ——— Утилиты ———
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function renderVoices() {
  els.voiceCount.textContent = String(state.voices);

  while (els.voicePills.firstChild) {
    els.voicePills.removeChild(els.voicePills.firstChild);
  }

  for (let i = 1; i <= state.voices; i++) {
    const pill = document.createElement('span');
    pill.className = 'pill' + (i === 1 ? ' active' : '');
    pill.setAttribute('role', 'listitem');
    pill.textContent = 'голос ' + i;
    els.voicePills.appendChild(pill);
  }
}

function updateProgress() {
  const pct = (state.currentTime / SONG.duration) * 100;
  els.progressBar.style.width = pct + '%';
  els.progressTrack.setAttribute('aria-valuenow', String(Math.round(pct)));
  els.timeCurrent.textContent = formatTime(state.currentTime);
}

function setPlayingUI(isPlaying) {
  document.body.classList.toggle('is-playing', isPlaying);
  els.btnPlay.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Пуск');
}

// ——— Playback (симуляция таймлайна) ———
function tick(ts) {
  if (!state.playing) return;

  if (state.lastTs) {
    const delta = (ts - state.lastTs) / 1000;
    state.currentTime = Math.min(state.currentTime + delta, SONG.duration);
  }
  state.lastTs = ts;

  const newIndex = findLineIndex(state.currentTime);
  if (newIndex !== state.activeLineIndex) {
    updateActiveLine(els.lyrics, state.activeLineIndex, newIndex);
    state.activeLineIndex = newIndex;
  }

  updateProgress();

  if (state.currentTime >= SONG.duration) {
    pause();
    return;
  }

  state.rafId = requestAnimationFrame(tick);
}

function play() {
  if (state.currentTime >= SONG.duration) {
    state.currentTime = 0;
    state.activeLineIndex = -1;
    buildLyricsDOM(els.lyrics, 0);
    state.activeLineIndex = 0;
  }
  state.playing = true;
  state.lastTs = 0;
  setPlayingUI(true);
  state.rafId = requestAnimationFrame(tick);
}

function pause() {
  state.playing = false;
  setPlayingUI(false);
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function stop() {
  pause();
  state.currentTime = 0;
  state.activeLineIndex = -1;
  updateProgress();
  if (state.started) {
    buildLyricsDOM(els.lyrics, 0);
    state.activeLineIndex = 0;
  }
}

function startEvening() {
  state.started = true;
  state.currentTime = 0;
  state.activeLineIndex = -1;
  buildLyricsDOM(els.lyrics, 0);
  state.activeLineIndex = 0;
  play();
}

function togglePlay() {
  if (!state.started) {
    startEvening();
    return;
  }
  state.playing ? pause() : play();
}

function clap() {
  state.clapCount += 1;
  els.clapCount.textContent = String(state.clapCount);
}

// ——— Events ———
function onModeClick(e) {
  const btn = e.currentTarget;
  const mode = btn.dataset.mode;
  if (!mode) return;

  els.modes.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  state.mode = mode;
}

function onKeydown(e) {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.started) clap();
    else startEvening();
  }
  if (e.code === 'KeyR') {
    stop();
    if (state.started) play();
  }
  if (e.code === 'Escape') {
    closeHelp();
  }
}

function openHelp() {
  els.helpDialog.hidden = false;
  els.helpClose.focus();
}

function closeHelp() {
  els.helpDialog.hidden = true;
  els.btnHelp.focus();
}

// ——— Init ———
function init() {
  els.version.textContent = 'v' + VERSION;
  els.songMeta.textContent = '«' + SONG.title + '» · ' + SONG.artist + ' · ' + formatTime(SONG.duration);
  els.timeTotal.textContent = formatTime(SONG.duration);

  renderVoices();
  buildLyricsDOM(els.lyrics, -1);
  updateProgress();

  // Voices
  $('#voice-minus').addEventListener('click', () => {
    if (state.voices > 1) {
      state.voices -= 1;
      renderVoices();
    }
  });
  $('#voice-plus').addEventListener('click', () => {
    if (state.voices < 12) {
      state.voices += 1;
      renderVoices();
    }
  });

  // Modes
  els.modes.forEach(btn => btn.addEventListener('click', onModeClick));

  // Transport
  els.btnPlay.addEventListener('click', togglePlay);
  els.btnRestart.addEventListener('click', () => {
    stop();
    if (state.started) play();
  });
  els.btnClap.addEventListener('click', clap);
  els.btnStart.addEventListener('click', startEvening);

  // Help
  els.btnHelp.addEventListener('click', openHelp);
  els.helpClose.addEventListener('click', closeHelp);
  els.helpDialog.addEventListener('click', (e) => {
    if (e.target === els.helpDialog) closeHelp();
  });

  document.addEventListener('keydown', onKeydown);

  console.info('ЛАДОМ v' + VERSION + ' — модульный прототип готов. eval=0, innerHTML для данных=0.');
}

init();
