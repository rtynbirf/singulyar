# ADR-0002: The bridge via delete + defineProperty

**Status:** ✅ Accepted (2026-10) · **Tacts:** v10.38+ · **Updated:** 2026-10-11

## Context

The boxes (ADR-0001) isolate the families, but the rooms must use the families' things as ordinary globals. An assignment `window.X = ...` breeds two troubles: the old copy remains (desync), and anyone can overwrite the thing along the way.

## Decision

The bridge exposes the family's thing in two moves:

```js
delete window.X;                       // erase the old copy
Object.defineProperty(window, 'X', {   // pin the new one
  value: Семья.X, writable: false,    // the thing is immutable
  configurable: false, enumerable: true
});
```

65 bridges = 65 things (8 boxes, С23–С29). Not a single line of the House logic was rewritten during the relocation — the bridges place the families into the window as they are. The bridge logic is proven by the test `ИНСТРУМЕНТЫ/test_bridge_logic.js`.

## Consequences

- ✅ The things are immutable: an accidental overwriting is impossible.
- ✅ Desync is excluded: the old copy is erased before the new one is pinned.
- ⚠️ The order of the bridges = the order of the relocation; breaking the order breaks the House.
- ⚠️ A new family = a new stack of bridges in the tact patcher (idempotent, guard markers).
- 🎓 Lessons of v10.52–v10.54: patches are anchors with guards and whole text; the CSP meta is edited only as a whole; «new» is re-read by eye after the insertion (a duplicated directive has already happened).

> Semantic translation of [0002-мост-delete-defineproperty.md](0002-мост-delete-defineproperty.md) — sense over letters (law of the 200-language track: «carry the meaning»). Native code identifiers stay native (`Семья.X` is the family's real name in the code).
