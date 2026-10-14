# 03-PROTOCOL.md · Протокол Объектной Передачи v1.0

## Схема объекта (`singulyar.v1.0/object.json`)
```json
{
  "schema": "singulyar.v1.0/object.json",
  "id": "uuid-v4",
  "kind": "text | file | voice | call_invite | value_intent | contact_invite",
  "createdAt": "2026-10-14T02:44:00Z",
  "sender": "Alice / Fingerprint",
  "recipient": "Bob / Fingerprint",
  "payload": { ... },
  "manifest": {
    "size": 1024,
    "mime_type": "application/json",
    "sha256": "64-hex-chars",
    "retention_policy": "local_only"
  },
  "consent": {
    "granted": true,
    "scope": "p2p_transmission",
    "purpose": "human_communication"
  },
  "delivery": {
    "state": "draft | locally_saved | queued | transport_attempted | accepted_by_transport | recipient_acknowledged | read",
    "observed_at": "ISO-8601",
    "evidence": "Description"
  },
  "idempotency_key": "sha256-hash"
}
```
