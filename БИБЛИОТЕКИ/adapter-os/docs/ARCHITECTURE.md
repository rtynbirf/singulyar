# Architecture decision record

## ADR-001: meaning first

A message/event is stored as semantic data. Rendering is an adapter concern. A transport is not allowed to mutate the meaning merely because one representation is unavailable.

## ADR-002: person preference outranks automatic selection

Automatic capability detection can propose. Explicit user preference wins. If the selected adapter is unavailable, the system explains why and offers available alternatives.

## ADR-003: status is evidence-backed

`READY` is not a marketing label. A module must have a runnable path and a test/probe. Experimental integrations remain visibly experimental.

## ADR-004: offline is scoped

`LOCAL` means data processing/storage can occur locally. `OFFLINE` is stronger: no network dependency for the complete path. Browser APIs such as SpeechRecognition may be browser/service dependent and must not be labelled offline without a specific verified implementation.

## ADR-005: storage has explicit durability boundaries

IndexedDB is a local store, not a magical backup. Export/import provides an independent user-controlled copy. Future large-object storage may use OPFS.
