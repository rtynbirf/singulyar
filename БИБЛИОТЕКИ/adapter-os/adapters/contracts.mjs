import { STATUS } from '../src/core.mjs';

export const ocrContract = {
  id: 'input.ocr', kind: 'input', priority: 30,
  status: () => ({ state: STATUS.EXPERIMENTAL, privacy: 'local', reason: 'model not bundled in prototype' }),
  contract: { input: 'image', output: 'text', requires: ['ocr-model'] }
};

export const whisperContract = {
  id: 'input.whisper-local', kind: 'input', priority: 30,
  status: () => ({ state: STATUS.EXPERIMENTAL, privacy: 'local', reason: 'WASM engine/model must be supplied' }),
  contract: { input: 'audio', output: 'text', requires: ['whisper-wasm', 'model'] }
};

export const gazeContract = {
  id: 'input.gaze', kind: 'input', priority: 5,
  status: () => ({ state: STATUS.EXPERIMENTAL, privacy: 'local', reason: 'landmarks are not calibrated screen gaze' }),
  contract: { input: 'camera', output: 'pointer', requires: ['landmarks', 'calibration', 'mapping', 'dwell-selection'] }
};

export const brailleContract = {
  id: 'output.braille', kind: 'output', priority: 50,
  status: () => ({ state: STATUS.EXPERIMENTAL, privacy: 'local', reason: 'Unicode Braille only; no physical display driver' }),
  contract: { input: 'text', output: 'unicode-braille', hardware: 'optional' }
};

export const demucsContract = {
  id: 'tool.demucs', kind: 'tool', priority: 0,
  status: () => ({ state: STATUS.EXPERIMENTAL, privacy: 'local', reason: 'WASM/model packaging not bundled' }),
  contract: { input: 'audio', output: ['vocals','drums','bass','other'] }
};

export const allOptionalContracts = [ocrContract, whisperContract, gazeContract, brailleContract, demucsContract];
