# Integration ledger

| Adapter/tool | Prototype status | Evidence rule | Next step |
|---|---|---|---|
| Text | READY | browser DOM smoke test | connect ·21/·22 meaning bus |
| TTS | READY/BROWSER | SpeechSynthesis feature probe | persist voice preference; use device voices only |
| Vibration | READY/UNAVAILABLE | `navigator.vibrate` probe | connect ·19 preference |
| Browser speech | BROWSER_DEPENDENT | constructor probe only | prefer a verified local Whisper adapter when bundled |
| Camera | PERMISSION_REQUIRED | `getUserMedia` existence | add explicit user action and stop tracks |
| Microphone | PERMISSION_REQUIRED | `getUserMedia` existence | add explicit user action and stop tracks |
| OCR | EXPERIMENTAL | no model bundled | add pinned Tesseract.js worker/model and offline cache test |
| Whisper local | EXPERIMENTAL | no WASM/model bundled | pin whisper.cpp build + model, benchmark target devices |
| Gaze | EXPERIMENTAL | no calibrated gaze implementation | Face Landmarker + calibration + mapping + dwell tests |
| Braille | EXPERIMENTAL | Unicode only | WebHID/OS accessibility adapter where available |
| Demucs | EXPERIMENTAL | no WASM/model bundled | benchmark memory/latency before inclusion |
| PDF | NOT INCLUDED | avoid fake DOCX/PDF claims | add pdf-lib + Unicode font embedding as a separate tool |
| DOCX | NOT INCLUDED | HTML is not DOCX | use a real OOXML generator or export path |
| xterm | NOT INCLUDED | terminal UI ≠ shell | only add with an explicit virtual FS contract |

## Status vocabulary

- READY: local prototype path exists and capability can be tested.
- BROWSER_DEPENDENT: browser exposes the API, but semantics/transport may depend on browser.
- PERMISSION_REQUIRED: capability exists only after explicit permission.
- EXPERIMENTAL: contract is present, implementation/evidence is incomplete.
- UNAVAILABLE: required API absent.
- UNKNOWN: no evidence yet; never silently converted to false.
