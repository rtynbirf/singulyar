# Next implementation slice

1. Extract a tiny `MeaningBus` from ·21/·22: `{id,type,payload,createdAt,author}`.
2. Make ·21 consume adapters from this registry instead of hard-coded presentation branches.
3. Make ·22 publish/receive only meaning envelopes; presentation stays on receiver.
4. Move ·19 preferences into the capability model without changing its UI semantics.
5. Add a real local OCR adapter with a pinned worker/model and cache verification.
6. Add a real local Whisper WASM adapter only after a device benchmark.
7. Add eye tracking as a separate experimental adapter with calibration and dwell selection; never map raw landmarks directly to clicks.
8. Add PDF export with Unicode font embedding; keep DOCX separate.
9. Add OPFS for large memories and explicit import/export.
10. Add integration tests against the actual ·21/·22 files before changing their production wiring.
