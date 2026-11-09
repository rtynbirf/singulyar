# Integration ledger

| Adapter/tool | Prototype status | Evidence rule | Next step |
|---|---|---|---|
| Text | READY | browser DOM smoke test | connect ·21/·22 meaning bus |
| TTS | READY/BROWSER | SpeechSynthesis feature probe | persist voice preference; use device voices only |
| Vibration | READY/UNAVAILABLE | `navigator.vibrate` probe | connect ·19 preference |
| Browser speech | BROWSER_DEPENDENT | constructor probe only | prefer a verified local Whisper adapter when bundled |
| Camera | PERMISSION_REQUIRED | `getUserMedia` existence | add explicit user action and stop tracks |
| Microphone | PERMISSION_REQUIRED | `getUserMedia` existence | add explicit user action and stop tracks |
| OCR | EXPERIMENTAL | contract implemented (v10.95 «ЧТЕНИЕ»): ocr.mjs ledger + pin + magic-byte honesty (6 formats) + CER/line-accuracy bench on shared measures; no model in the house | owner drops traineddata via ЛЮК_ВЕСОВ_OCR.md (rus → srp → kaz → deu) → registerOcrModel pin → READY; benchmark corpus → track ledger |
| Whisper local | EXPERIMENTAL | contract implemented (v10.94 «ГОЛОС»): speech.mjs ledger + pin-glue (SHA-256, mismatch → data withheld) + WER/CER bench; no weights in the house | owner drops weights via ЛЮК_ВЕСОВ_WHISPER.md → registerWhisperModel pin → READY; benchmark corpus → track ledger |
| Gaze | EXPERIMENTAL | contract implemented (v10.98 «ВЗГЛЯД»): gaze.mjs ledger + pin (SHA-256, mismatch → data withheld) + affine calibration `gaze-calib-affine/0.1` (least squares, degeneracy — honest refusal, residuals named) + projection without clamping (honest `в_границах` flag) + dwell reducer on external clocks (hysteresis, re-fire lock, confidence threshold); no model in the house | owner drops weights via ЛЮК_ВЕСОВ_GAZE.md → registerGazeModel pin → READY; calibration session + benchmark corpus → track ledger |
| Braille | READY | contract implemented (v11.00 «БРАЙЛЬ»): braille.mjs deterministic Unicode translation (cells U+2800–U+28FF, no weights), built-in latin-g1 table (Louis Braille canon, pinned byte-exact against an independent test copy), capital/number signs, two named modes (strict — refusal with position and code; placeholders — blank cell with a named loss list), table hatch by the Law of Languages (rus → srp → kaz → deu); no physical display driver (hardware optional per contract, named) | language tables via ЛЮК_ТАБЛИЦ_БРАЙЛЬ.md → registerBrailleTable; WebHID/OS accessibility adapter where available → outside the contract |
| Demucs | EXPERIMENTAL | contract implemented (v10.99 «МИНУС»): demucs.mjs ledger + pin (SHA-256, mismatch → data withheld) + audio signature by magic bytes (5 formats) + strict 4-stem parse (canonical order, equal lengths, finite samples, no clamping) + honest stem numbers (RMS/peak/power share, silence named, no invented −∞) + mix residual named as numbers; no model in the house | owner drops weights via ЛЮК_ВЕСОВ_DEMUCS.md → registerDemucsModel pin → READY; benchmark corpus with reference stems (SDR) → track ledger |
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
