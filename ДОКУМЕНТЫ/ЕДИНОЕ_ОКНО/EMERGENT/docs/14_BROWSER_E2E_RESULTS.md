# Browser-flow verification — 2026-10-14

## Result

**7/7 Chromium browser-flow checks passed** using the installed Chromium 144.0.7559.96 and Node.js 22.16.0. No uncaught runtime exceptions or console errors were observed in the exercised flows.

Run from the package root:

```sh
node tests/e2e.chromium.cjs
# or, with a non-default Chromium path:
CHROMIUM_BIN=/path/to/chromium node tests/e2e.chromium.cjs
```

## Cases exercised

1. Prototype DOM and both core/adapter registries initialize.
2. Recommendation UI renders multiple alternatives and trace reflects selected urgency and input modality.
3. Save serializes current form values into the canonical event shape.
4. Editing recipient/text after recommendation and invoking export uses current values, not the old recommendation snapshot.
5. Reinitializing the UI with an existing draft and pressing Restore populates recipient, content, urgency, and modality.
6. Clear removes the draft and resets all relevant form controls.
7. No uncaught runtime exceptions or console errors during these cases.

## Environment boundary (important)

This runtime has a managed Chromium policy `URLBlocklist: ["*"]`, so it blocks both `file:` and local HTTP URLs. To exercise the real UI code despite that restriction, the test inlines the package HTML/CSS/JS into an `about:blank` page and uses an in-memory `localStorage`-compatible shim. Therefore this is a **Chromium browser-flow test with mocked storage**, not proof of persistence across a real browser restart, a test of the deployed GitHub Pages URL, or a full live-site E2E run.

The test does not send messages or invoke external services. Network adapters remain disconnected.
